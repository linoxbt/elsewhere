import fs from "node:fs";
import path from "node:path";
import type {
  Candle,
  HolderRecord,
  PoolRecord,
  TokenRecord,
  TradeRecord,
} from "@/lib/types";

const DATA = path.join(process.cwd(), "data");

type Db = {
  lastBlock: number;
  lastIndexedAt: number;
  tokens: Record<string, TokenRecord>;
  trades: TradeRecord[];
  pools: Record<string, PoolRecord>;
  holders: Record<string, Record<string, string>>;
  candles: Record<string, Candle[]>;
  metaCache: Record<string, { name: string; symbol: string; decimals: number; image?: string }>;
};

const empty = (): Db => ({
  lastBlock: 0,
  lastIndexedAt: 0,
  tokens: {},
  trades: [],
  pools: {},
  holders: {},
  candles: {},
  metaCache: {},
});

let mem: Db | null = null;
let writing = Promise.resolve();

function file() {
  return path.join(DATA, "index.json");
}

export function loadDb(): Db {
  if (mem) return mem;
  try {
    const raw = fs.readFileSync(file(), "utf8");
    mem = JSON.parse(raw) as Db;
  } catch {
    mem = empty();
  }
  return mem;
}

export function saveDb(next?: Db) {
  const db = next ?? loadDb();
  mem = db;
  // Reset the chain on a prior rejection first: chaining straight off an
  // already-rejected promise makes every future `.then()` a silent no-op —
  // one transient write failure (e.g. a read-only serverless filesystem)
  // would otherwise permanently disable persistence for the rest of the
  // process without raising any new error.
  writing = writing.catch(() => undefined).then(() => {
    fs.mkdirSync(DATA, { recursive: true });
    const tmp = file() + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file());
  });
  writing.catch((err) => console.error("[store] saveDb failed", err));
  return writing;
}

export function listTokens(): TokenRecord[] {
  return Object.values(loadDb().tokens);
}

export function getToken(addr: string): TokenRecord | undefined {
  return loadDb().tokens[addr.toLowerCase()];
}

export function upsertToken(t: TokenRecord) {
  const db = loadDb();
  db.tokens[t.address.toLowerCase()] = t;
}

export function listTrades(token?: string, limit = 100): TradeRecord[] {
  const all = loadDb().trades;
  const filtered = token
    ? all.filter((t) => t.token.toLowerCase() === token.toLowerCase())
    : all;
  return filtered.slice(-limit).reverse();
}

export function pushTrade(t: TradeRecord) {
  const db = loadDb();
  db.trades.push(t);
  if (db.trades.length > 50_000) db.trades = db.trades.slice(-40_000);
  applyCandle(t);
  applyVolume(t);
}

export function listPools(): PoolRecord[] {
  return Object.values(loadDb().pools);
}

export function getPool(addr: string): PoolRecord | undefined {
  return loadDb().pools[addr.toLowerCase()];
}

export function upsertPool(p: PoolRecord) {
  loadDb().pools[p.address.toLowerCase()] = p;
}

export function holdersOf(token: string): HolderRecord[] {
  const map = loadDb().holders[token.toLowerCase()] ?? {};
  const rows = Object.entries(map)
    .map(([address, balance]) => ({ address: address as `0x${string}`, balance, raw: BigInt(balance) }))
    .filter((r) => r.raw > 0n)
    .sort((a, b) => (a.raw === b.raw ? 0 : a.raw > b.raw ? -1 : 1));
  const total = rows.reduce((s, r) => s + r.raw, 0n);
  return rows.map((r) => ({
    address: r.address,
    balance: r.balance,
    pct: total === 0n ? 0 : Number((r.raw * 10000n) / total) / 100,
  }));
}

export function applyTransfer(token: string, from: string, to: string, value: bigint) {
  const db = loadDb();
  const key = token.toLowerCase();
  if (!db.holders[key]) db.holders[key] = {};
  const h = db.holders[key];
  const zero = "0x0000000000000000000000000000000000000000";
  const dead = "0x000000000000000000000000000000000000dead";
  if (from.toLowerCase() !== zero) {
    const next = BigInt(h[from.toLowerCase()] ?? "0") - value;
    h[from.toLowerCase()] = (next < 0n ? 0n : next).toString();
  }
  if (to.toLowerCase() !== zero && to.toLowerCase() !== dead) {
    h[to.toLowerCase()] = (BigInt(h[to.toLowerCase()] ?? "0") + value).toString();
  }
  const tok = db.tokens[key];
  if (tok) tok.holders = Object.values(h).filter((b) => BigInt(b) > 0n).length;
}

export function candlesOf(token: string): Candle[] {
  return loadDb().candles[token.toLowerCase()] ?? [];
}

function applyCandle(t: TradeRecord) {
  const db = loadDb();
  const key = t.token.toLowerCase();
  const bucket = Math.floor(t.timestamp / 300) * 300;
  if (!db.candles[key]) db.candles[key] = [];
  const arr = db.candles[key];
  const last = arr[arr.length - 1];
  if (!last || last.time !== bucket) {
    arr.push({
      time: bucket,
      open: t.priceUsd,
      high: t.priceUsd,
      low: t.priceUsd,
      close: t.priceUsd,
      volume: Number(t.quoteAmount) / 1e18,
    });
  } else {
    last.high = Math.max(last.high, t.priceUsd);
    last.low = Math.min(last.low, t.priceUsd);
    last.close = t.priceUsd;
    last.volume += Number(t.quoteAmount) / 1e18;
  }
  if (arr.length > 2000) db.candles[key] = arr.slice(-1500);
}

function applyVolume(t: TradeRecord) {
  const tok = loadDb().tokens[t.token.toLowerCase()];
  if (!tok) return;
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const vol = loadDb()
    .trades.filter((x) => x.token.toLowerCase() === t.token.toLowerCase() && x.timestamp >= cutoff)
    .reduce((s, x) => s + quoteUsd(x), 0);
  tok.volume24hUsd = vol;
}

function quoteUsd(t: TradeRecord): number {
  const qie = Number(t.quoteAmount) / 1e18;
  return qie * t.qieUsd;
}

export function setLastBlock(n: number) {
  loadDb().lastBlock = n;
}

export function getLastBlock() {
  return loadDb().lastBlock;
}

export function setLastIndexedAt(unixSeconds: number) {
  loadDb().lastIndexedAt = unixSeconds;
}

export function getLastIndexedAt() {
  return loadDb().lastIndexedAt ?? 0;
}

export function getMeta(addr: string) {
  return loadDb().metaCache[addr.toLowerCase()];
}

export function setMeta(
  addr: string,
  meta: { name: string; symbol: string; decimals: number; image?: string },
) {
  loadDb().metaCache[addr.toLowerCase()] = meta;
}

export function searchIndex(q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return { tokens: [] as TokenRecord[], addresses: [] as string[] };
  const tokens = listTokens().filter(
    (t) =>
      t.name.toLowerCase().includes(query) ||
      t.symbol.toLowerCase().includes(query) ||
      t.address.toLowerCase().includes(query),
  );
  return { tokens };
}
