import { decodeEventLog, type Address, type Hex, type Log } from "viem";
import { ammFactoryAbi, ammPairAbi } from "@/lib/abi/amm";
import { bondingCurveAbi, erc20Abi, launchpadFactoryAbi } from "@/lib/abi/launchpad";
import { contracts, isProtocolDeployed, PROTOCOL, ZERO_ADDRESS } from "@/lib/config";
import { fetchMetadata } from "@/lib/metadata";
import type { PoolRecord, TokenRecord, TradeRecord } from "@/lib/types";
import { publicClient } from "./chain";
import { getQieUsd } from "./price";
import {
  applyTransfer,
  getLastBlock,
  getLastIndexedAt,
  getToken,
  listPools,
  listTokens,
  loadDb,
  pushTrade,
  saveDb,
  setLastBlock,
  setLastIndexedAt,
  setMeta,
  upsertPool,
  upsertToken,
} from "./store";

const CHUNK = 2_000n;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startIndexer() {
  if (timer) return;
  void tick();
  timer = setInterval(() => void tick(), 8_000);
}

async function tick() {
  if (running) return;
  if (!isProtocolDeployed) return;
  running = true;
  try {
    await sync();
    await refreshLive();
    setLastIndexedAt(Math.floor(Date.now() / 1000));
    await saveDb();
  } catch (err) {
    console.error("[indexer]", err);
  } finally {
    running = false;
  }
}

async function sync() {
  const head = await publicClient.getBlockNumber();
  let from = BigInt(getLastBlock() || 0);
  if (from === 0n) {
    from = head > 8_000n ? head - 8_000n : 1n;
  } else {
    from = from + 1n;
  }
  if (from > head) return;

  const addresses: Address[] = [
    contracts.launchpadFactory,
    contracts.ammFactory,
  ].filter((a) => a !== ZERO_ADDRESS);

  for (const t of listTokens()) {
    if (t.curve) addresses.push(t.curve);
    if (t.pair) addresses.push(t.pair);
    addresses.push(t.address);
  }
  for (const p of listPools()) addresses.push(p.address);

  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))] as Address[];

  for (let start = from; start <= head; start += CHUNK) {
    const end = start + CHUNK - 1n > head ? head : start + CHUNK - 1n;
    const logs = await publicClient.getLogs({
      address: unique,
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) {
      await handleLog(log);
    }
    setLastBlock(Number(end));
  }
}

async function handleLog(log: Log) {
  const addr = (log.address || "").toLowerCase();
  try {
    if (addr === contracts.launchpadFactory.toLowerCase()) {
      await onFactory(log);
      return;
    }
    if (addr === contracts.ammFactory.toLowerCase()) {
      onAmmFactory(log);
      return;
    }
    const tok = getToken(addr);
    if (tok) {
      onTokenTransfer(log, tok.address);
      return;
    }
    const byCurve = listTokens().find((t) => t.curve.toLowerCase() === addr);
    if (byCurve) {
      await onCurve(log, byCurve);
      return;
    }
    const pool = listPools().find((p) => p.address.toLowerCase() === addr);
    if (pool) {
      await onPair(log, pool);
    }
  } catch (e) {
    console.warn("[indexer] log", e);
  }
}

async function onFactory(log: Log) {
  try {
    const parsed = decodeEventLog({
      abi: launchpadFactoryAbi,
      data: log.data,
      topics: log.topics,
    });
    if (parsed.eventName === "TokenCreated") {
      const args = parsed.args as {
        token: Address;
        curve: Address;
        creator: Address;
        name: string;
        symbol: string;
        metadataURI: string;
      };
      const meta = await fetchMetadata(args.metadataURI);
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
      const rec: TokenRecord = {
        address: args.token,
        curve: args.curve,
        creator: args.creator,
        pair: null,
        name: meta.name || args.name,
        symbol: meta.symbol || args.symbol,
        description: meta.description || "",
        image: meta.image || "",
        twitter: meta.twitter,
        telegram: meta.telegram,
        website: meta.website,
        metadataURI: args.metadataURI,
        createdAt: Number(block.timestamp),
        graduated: false,
        marketCapUsd: 0,
        volume24hUsd: 0,
        priceUsd: 0,
        priceQie: 0,
        holders: 0,
        progress: 0,
        quoteReserve: "0",
        tokenReserve: "0",
      };
      upsertToken(rec);
      setMeta(args.token, {
        name: rec.name,
        symbol: rec.symbol,
        decimals: 18,
        image: rec.image,
      });
    }
    if (parsed.eventName === "TokenGraduated") {
      const args = parsed.args as { token: Address; pair: Address };
      const t = getToken(args.token);
      if (t) {
        t.graduated = true;
        t.pair = args.pair;
        t.progress = 1;
        upsertToken(t);
      }
    }
  } catch {
    /* not our event */
  }
}

function onAmmFactory(log: Log) {
  try {
    const parsed = decodeEventLog({
      abi: ammFactoryAbi,
      data: log.data,
      topics: log.topics,
    });
    if (parsed.eventName !== "PairCreated") return;
    const args = parsed.args as {
      token0: Address;
      token1: Address;
      pair: Address;
    };
    const existing = listPools().find((p) => p.address.toLowerCase() === args.pair.toLowerCase());
    if (existing) return;
    upsertPool({
      address: args.pair,
      token0: args.token0,
      token1: args.token1,
      symbol0: "?",
      symbol1: "?",
      name0: "",
      name1: "",
      reserve0: "0",
      reserve1: "0",
      tvlUsd: 0,
      volume24hUsd: 0,
      fees24hUsd: 0,
      apr: 0,
      createdAt: Math.floor(Date.now() / 1000),
    });
  } catch {
    /* ignore */
  }
}

async function onCurve(log: Log, token: TokenRecord) {
  try {
    const parsed = decodeEventLog({
      abi: bondingCurveAbi,
      data: log.data,
      topics: log.topics,
    });
    if (parsed.eventName === "Trade") {
      const args = parsed.args as {
        trader: Address;
        isBuy: boolean;
        quoteAmount: bigint;
        tokenAmount: bigint;
        price: bigint;
        marketCapUsd: bigint;
        creatorFee: bigint;
        protocolFee: bigint;
      };
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
      const priceQie = Number(args.price) / 1e18;
      const marketCapUsd = Number(args.marketCapUsd) / 1e18;
      const priceUsd = PROTOCOL.totalSupply > 0 ? marketCapUsd / PROTOCOL.totalSupply : 0;
      const qieUsd = priceQie > 0 ? priceUsd / priceQie : await getQieUsd().catch(() => 0);
      const rec: TradeRecord = {
        id: `${log.transactionHash}-${log.logIndex}`,
        token: token.address,
        trader: args.trader,
        isBuy: args.isBuy,
        quoteAmount: args.quoteAmount.toString(),
        tokenAmount: args.tokenAmount.toString(),
        priceUsd,
        qieUsd,
        marketCapUsd,
        txHash: log.transactionHash as Hex,
        timestamp: Number(block.timestamp),
        source: "curve",
      };
      pushTrade(rec);
      token.marketCapUsd = rec.marketCapUsd;
      token.priceQie = priceQie;
      token.priceUsd = rec.priceUsd;
      token.progress = Math.min(1, rec.marketCapUsd / PROTOCOL.graduationMarketCapUsd);
      upsertToken(token);
    }
    if (parsed.eventName === "Graduated") {
      const args = parsed.args as { pair: Address };
      token.graduated = true;
      token.pair = args.pair;
      token.progress = 1;
      upsertToken(token);
    }
  } catch {
    /* ignore */
  }
}

function onTokenTransfer(log: Log, token: Address) {
  try {
    const parsed = decodeEventLog({
      abi: erc20Abi,
      data: log.data,
      topics: log.topics,
    });
    if (parsed.eventName !== "Transfer") return;
    const args = parsed.args as { from: Address; to: Address; value: bigint };
    applyTransfer(token, args.from, args.to, args.value);
  } catch {
    /* ignore */
  }
}

async function onPair(log: Log, pool: PoolRecord) {
  try {
    const parsed = decodeEventLog({
      abi: ammPairAbi,
      data: log.data,
      topics: log.topics,
    });
    if (parsed.eventName === "Swap") {
      const args = parsed.args as {
        sender: Address;
        amount0In: bigint;
        amount1In: bigint;
        amount0Out: bigint;
        amount1Out: bigint;
        to: Address;
      };
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
      const qieUsd = await getQieUsd().catch(() => 0);
      const isQie0 = pool.token0.toLowerCase() === contracts.wqie.toLowerCase();
      const isQie1 = pool.token1.toLowerCase() === contracts.wqie.toLowerCase();
      const quoteIn = isQie0 ? args.amount0In : isQie1 ? args.amount1In : 0n;
      const quoteOut = isQie0 ? args.amount0Out : isQie1 ? args.amount1Out : 0n;
      const quote = quoteIn > 0n ? quoteIn : quoteOut;
      const tokenAddr = (isQie0 ? pool.token1 : pool.token0) as Address;
      const tokenAmt = isQie0
        ? args.amount1In > 0n
          ? args.amount1In
          : args.amount1Out
        : args.amount0In > 0n
          ? args.amount0In
          : args.amount0Out;
      const isBuy = isQie0 ? args.amount0In > 0n : args.amount1In > 0n;
      const priceQie =
        tokenAmt > 0n ? Number(quote) / Number(tokenAmt) : 0;
      const rec: TradeRecord = {
        id: `${log.transactionHash}-${log.logIndex}`,
        token: tokenAddr,
        trader: args.to,
        isBuy,
        quoteAmount: quote.toString(),
        tokenAmount: tokenAmt.toString(),
        priceUsd: priceQie * qieUsd,
        qieUsd,
        marketCapUsd: 0,
        txHash: log.transactionHash as Hex,
        timestamp: Number(block.timestamp),
        source: "amm",
      };
      pushTrade(rec);
      const tok = getToken(tokenAddr);
      if (tok) {
        tok.priceQie = priceQie;
        tok.priceUsd = rec.priceUsd;
        tok.marketCapUsd = priceQie * PROTOCOL.totalSupply * qieUsd;
        upsertToken(tok);
      }
    }
  } catch {
    /* ignore */
  }
}

async function refreshLive() {
  const qieUsd = await getQieUsd().catch((err) => {
    console.error("[indexer] official qie oracle unavailable", err);
    return 0;
  });
  if (qieUsd <= 0) return;
  for (const t of listTokens()) {
    try {
      if (!t.graduated && t.curve) {
        const [mcap, reserves, graduated] = await Promise.all([
          publicClient.readContract({
            address: t.curve,
            abi: bondingCurveAbi,
            functionName: "marketCapUsd",
          }),
          publicClient.readContract({
            address: t.curve,
            abi: bondingCurveAbi,
            functionName: "getReserves",
          }),
          publicClient.readContract({
            address: t.curve,
            abi: bondingCurveAbi,
            functionName: "graduated",
          }),
        ]);
        t.marketCapUsd = Number(mcap) / 1e18;
        t.quoteReserve = (reserves as [bigint, bigint])[0].toString();
        t.tokenReserve = (reserves as [bigint, bigint])[1].toString();
        const q = Number((reserves as [bigint, bigint])[0]);
        const r = Number((reserves as [bigint, bigint])[1]);
        t.priceQie = r > 0 ? q / r : 0;
        t.priceUsd = t.priceQie * qieUsd;
        t.progress = Math.min(1, t.marketCapUsd / PROTOCOL.graduationMarketCapUsd);
        if (graduated) {
          t.graduated = true;
          const pair = await publicClient.readContract({
            address: t.curve,
            abi: bondingCurveAbi,
            functionName: "pair",
          });
          t.pair = pair as Address;
        }
        upsertToken(t);
      } else if (t.pair) {
        const [r0, r1] = (await publicClient.readContract({
          address: t.pair,
          abi: ammPairAbi,
          functionName: "getReserves",
        })) as unknown as [bigint, bigint, number];
        const token0 = await publicClient.readContract({
          address: t.pair,
          abi: ammPairAbi,
          functionName: "token0",
        });
        const tokenIs0 = (token0 as string).toLowerCase() === t.address.toLowerCase();
        const tokRes = tokenIs0 ? r0 : r1;
        const qieRes = tokenIs0 ? r1 : r0;
        t.quoteReserve = qieRes.toString();
        t.tokenReserve = tokRes.toString();
        t.priceQie = tokRes > 0n ? Number(qieRes) / Number(tokRes) : 0;
        t.priceUsd = t.priceQie * qieUsd;
        t.marketCapUsd = t.priceQie * PROTOCOL.totalSupply * qieUsd;
        t.progress = 1;
        upsertToken(t);
      }
    } catch {
      /* token may not be readable */
    }
  }

  for (const p of listPools()) {
    try {
      const [token0, token1, reserves] = await Promise.all([
        publicClient.readContract({ address: p.address, abi: ammPairAbi, functionName: "token0" }),
        publicClient.readContract({ address: p.address, abi: ammPairAbi, functionName: "token1" }),
        publicClient.readContract({ address: p.address, abi: ammPairAbi, functionName: "getReserves" }),
      ]);
      p.token0 = token0 as Address;
      p.token1 = token1 as Address;
      const [a, b] = reserves as unknown as [bigint, bigint, number];
      p.reserve0 = a.toString();
      p.reserve1 = b.toString();
      const t0 = getToken(p.token0);
      const t1 = getToken(p.token1);
      p.symbol0 = t0?.symbol || (p.token0.toLowerCase() === contracts.wqie.toLowerCase() ? "WQIE" : p.symbol0);
      p.symbol1 = t1?.symbol || (p.token1.toLowerCase() === contracts.wqie.toLowerCase() ? "WQIE" : p.symbol1);
      p.name0 = t0?.name || p.name0;
      p.name1 = t1?.name || p.name1;
      p.image0 = t0?.image;
      p.image1 = t1?.image;
      const r0 = Number(a) / 1e18;
      const r1 = Number(b) / 1e18;
      const qie0 = p.token0.toLowerCase() === contracts.wqie.toLowerCase();
      const qie1 = p.token1.toLowerCase() === contracts.wqie.toLowerCase();
      if (qie0) p.tvlUsd = r0 * qieUsd * 2;
      else if (qie1) p.tvlUsd = r1 * qieUsd * 2;
      else p.tvlUsd = r0 * (t0?.priceUsd || 0) + r1 * (t1?.priceUsd || 0);

      const cutoff = Math.floor(Date.now() / 1000) - 86400;
      const volQie = loadDb()
        .trades.filter(
          (tr) =>
            tr.timestamp >= cutoff &&
            (tr.token.toLowerCase() === p.token0.toLowerCase() ||
              tr.token.toLowerCase() === p.token1.toLowerCase()) &&
            tr.source === "amm",
        )
        .reduce((s, tr) => s + Number(tr.quoteAmount) / 1e18, 0);
      p.volume24hUsd = volQie * qieUsd;
      p.fees24hUsd = p.volume24hUsd * 0.003;
      p.apr = p.tvlUsd > 0 ? (p.fees24hUsd * 365) / p.tvlUsd : 0;
      upsertPool(p);
    } catch {
      /* ignore */
    }
  }
}

export async function runOnce() {
  await tick();
}

const STALE_AFTER_SECONDS = 20;

/**
 * Best-effort inline catch-up for request paths (trades/chart) that have no
 * live-on-chain-read fallback and depend entirely on the store having been
 * indexed. `tick()`'s own `running` guard makes this cheap/no-op when a
 * background poll already ran recently.
 */
export async function catchUpIfStale() {
  if (!isProtocolDeployed) return;
  const ageSeconds = Math.floor(Date.now() / 1000) - getLastIndexedAt();
  if (ageSeconds < STALE_AFTER_SECONDS) return;
  await tick();
}
