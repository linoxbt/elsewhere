import { createPublicClient, fallback, http, type Address, type PublicClient } from "viem";
import { ammFactoryAbi, ammPairAbi } from "@/lib/abi/amm";
import { bondingCurveAbi, erc20Abi, launchpadFactoryAbi } from "@/lib/abi/launchpad";
import {
  PROTOCOL,
  ZERO_ADDRESS,
  contractsFor,
  isZero,
} from "@/lib/config";
import { fetchMetadata, type TokenMetadataJson } from "@/lib/metadata";
import { NETWORKS, qieMainnet, qieTestnet, type NetworkKey } from "@/lib/networks";
import type { PoolRecord, TokenMeta, TokenRecord } from "@/lib/types";
import { getQieUsd } from "./price";

function clientFor(key: NetworkKey): PublicClient {
  const net = NETWORKS[key];
  const chain = key === "mainnet" ? qieMainnet : qieTestnet;
  return createPublicClient({
    chain,
    transport: fallback(net.rpcUrls.map((url) => http(url, { timeout: 20_000 }))),
  });
}

async function tokenMeta(client: PublicClient, addr: Address): Promise<{ name: string; symbol: string; decimals: number }> {
  try {
    const [name, symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: "name" }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
    ]);
    return { name, symbol, decimals };
  } catch {
    return { name: "token", symbol: "TKN", decimals: 18 };
  }
}

export async function liveSwapTokens(key: NetworkKey): Promise<TokenMeta[]> {
  const net = NETWORKS[key];
  const ours = contractsFor(key);
  const out: TokenMeta[] = [
    { address: ZERO_ADDRESS, name: "QIE", symbol: "QIE", decimals: 18, isNative: true },
  ];
  const seen = new Set<string>([ZERO_ADDRESS]);

  function push(t: TokenMeta) {
    const k = t.address.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  }

  if (net.officialDex) {
    push({ address: net.officialDex.wqie, name: "Wrapped QIE", symbol: "WQIE", decimals: 18 });
    const client = clientFor(key);
    const factories = [net.officialDex.factory, ...net.officialDex.extraFactories];
    for (const factory of factories) {
      try {
        const n = Number(
          await client.readContract({ address: factory, abi: ammFactoryAbi, functionName: "allPairsLength" }),
        );
        for (let i = 0; i < n; i++) {
          const pair = await client.readContract({
            address: factory,
            abi: ammFactoryAbi,
            functionName: "allPairs",
            args: [BigInt(i)],
          });
          const [token0, token1] = await Promise.all([
            client.readContract({ address: pair, abi: ammPairAbi, functionName: "token0" }),
            client.readContract({ address: pair, abi: ammPairAbi, functionName: "token1" }),
          ]);
          for (const addr of [token0, token1] as Address[]) {
            if (seen.has(addr.toLowerCase()) || addr.toLowerCase() === net.officialDex.wqie.toLowerCase()) continue;
            const meta = await tokenMeta(client, addr);
            push({ address: addr, ...meta });
          }
        }
      } catch {
        /* factory may not expose allPairs */
      }
    }
    return out;
  }

  const client = clientFor(key);
  if (!isZero(ours.wqie)) {
    push({ address: ours.wqie, name: "Wrapped QIE", symbol: "WQIE", decimals: 18 });
  }
  if (!isZero(ours.elseToken)) {
    const meta = await tokenMeta(client, ours.elseToken);
    push({ address: ours.elseToken, name: meta.name || "Elsewhere", symbol: meta.symbol || "ELSE", decimals: meta.decimals });
  }
  if (!isZero(ours.launchpadFactory)) {
    try {
      const n = Number(
        await client.readContract({
          address: ours.launchpadFactory,
          abi: launchpadFactoryAbi,
          functionName: "allTokensLength",
        }),
      );
      for (let i = 0; i < n; i++) {
        const addr = await client.readContract({
          address: ours.launchpadFactory,
          abi: launchpadFactoryAbi,
          functionName: "allTokens",
          args: [BigInt(i)],
        });
        const meta = await tokenMeta(client, addr);
        push({ address: addr, ...meta });
      }
    } catch {
      /* factory empty / unreachable */
    }
  }
  if (!isZero(ours.ammFactory)) {
    try {
      const n = Number(
        await client.readContract({ address: ours.ammFactory, abi: ammFactoryAbi, functionName: "allPairsLength" }),
      );
      for (let i = 0; i < n; i++) {
        const pair = await client.readContract({
          address: ours.ammFactory,
          abi: ammFactoryAbi,
          functionName: "allPairs",
          args: [BigInt(i)],
        });
        const [token0, token1] = await Promise.all([
          client.readContract({ address: pair, abi: ammPairAbi, functionName: "token0" }),
          client.readContract({ address: pair, abi: ammPairAbi, functionName: "token1" }),
        ]);
        for (const addr of [token0, token1] as Address[]) {
          if (seen.has(addr.toLowerCase()) || addr.toLowerCase() === ours.wqie.toLowerCase()) continue;
          const meta = await tokenMeta(client, addr);
          push({ address: addr, ...meta });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

export async function liveLaunchpadTokens(): Promise<TokenRecord[]> {
  const ours = contractsFor("testnet");
  if (isZero(ours.launchpadFactory)) return [];
  const client = clientFor("testnet");
  let n = 0;
  try {
    n = Number(
      await client.readContract({
        address: ours.launchpadFactory,
        abi: launchpadFactoryAbi,
        functionName: "allTokensLength",
      }),
    );
  } catch {
    return [];
  }
  const qieUsd = await getQieUsd().catch(() => 0);
  const out: TokenRecord[] = [];
  for (let i = 0; i < n; i++) {
    try {
      const addr = await client.readContract({
        address: ours.launchpadFactory,
        abi: launchpadFactoryAbi,
        functionName: "allTokens",
        args: [BigInt(i)],
      });
      const rec = await liveTokenRecord(client, ours.launchpadFactory, addr, qieUsd);
      if (rec) out.push(rec);
    } catch {
      /* skip one */
    }
  }
  return out;
}

export async function liveTokenRecord(
  client: PublicClient,
  factory: Address,
  addr: Address,
  qieUsd: number,
): Promise<TokenRecord | null> {
  const [meta, curve, pair, uri, creator] = await Promise.all([
    tokenMeta(client, addr),
    client.readContract({ address: factory, abi: launchpadFactoryAbi, functionName: "curveOf", args: [addr] }),
    client.readContract({ address: factory, abi: launchpadFactoryAbi, functionName: "pairOf", args: [addr] }),
    client.readContract({ address: factory, abi: launchpadFactoryAbi, functionName: "metadataURIOf", args: [addr] }),
    client.readContract({ address: factory, abi: launchpadFactoryAbi, functionName: "creatorOf", args: [addr] }),
  ]);
  const extra: TokenMetadataJson = uri ? await fetchMetadata(uri).catch(() => ({})) : {};
  let quoteReserve = 0n;
  let tokenReserve = 0n;
  let priceQie = 0;
  let marketCapUsd = 0;
  let graduated = !isZero(pair);
  if (!isZero(curve)) {
    try {
      const [q, t] = await client.readContract({
        address: curve,
        abi: bondingCurveAbi,
        functionName: "getReserves",
      });
      quoteReserve = q;
      tokenReserve = t;
      const px = await client.readContract({ address: curve, abi: bondingCurveAbi, functionName: "price" });
      priceQie = Number(px) / 1e18;
      const mcap = await client.readContract({
        address: curve,
        abi: bondingCurveAbi,
        functionName: "marketCapUsd",
      });
      marketCapUsd = Number(mcap) / 1e18;
      graduated = await client.readContract({
        address: curve,
        abi: bondingCurveAbi,
        functionName: "graduated",
      });
    } catch {
      /* curve may be empty */
    }
  }
  if (!marketCapUsd && priceQie && qieUsd) {
    marketCapUsd = priceQie * qieUsd * PROTOCOL.totalSupply;
  }
  const progress = Math.min(1, marketCapUsd / PROTOCOL.graduationMarketCapUsd);
  return {
    address: addr,
    curve,
    creator,
    pair: isZero(pair) ? null : pair,
    name: extra.name || meta.name,
    symbol: extra.symbol || meta.symbol,
    description: extra.description || "",
    image: extra.image || "",
    twitter: extra.twitter,
    telegram: extra.telegram,
    website: extra.website,
    metadataURI: uri,
    createdAt: 0,
    graduated,
    marketCapUsd,
    volume24hUsd: 0,
    priceUsd: priceQie * qieUsd,
    priceQie,
    holders: 0,
    progress,
    quoteReserve: quoteReserve.toString(),
    tokenReserve: tokenReserve.toString(),
  };
}

export async function livePools(key: NetworkKey): Promise<PoolRecord[]> {
  const net = NETWORKS[key];
  const ours = contractsFor(key);
  const client = clientFor(key);
  const qieUsd = await getQieUsd().catch(() => 0);
  const factories: Address[] = [];
  const wqie = net.officialDex?.wqie ?? ours.wqie;
  if (net.officialDex) {
    factories.push(net.officialDex.factory, ...net.officialDex.extraFactories);
  } else if (!isZero(ours.ammFactory)) {
    factories.push(ours.ammFactory);
  }
  const pools: PoolRecord[] = [];
  for (const factory of factories) {
    let n = 0;
    try {
      n = Number(
        await client.readContract({ address: factory, abi: ammFactoryAbi, functionName: "allPairsLength" }),
      );
    } catch {
      continue;
    }
    for (let i = 0; i < n; i++) {
      try {
        const pair = await client.readContract({
          address: factory,
          abi: ammFactoryAbi,
          functionName: "allPairs",
          args: [BigInt(i)],
        });
        const [token0, token1, reserves] = await Promise.all([
          client.readContract({ address: pair, abi: ammPairAbi, functionName: "token0" }),
          client.readContract({ address: pair, abi: ammPairAbi, functionName: "token1" }),
          client.readContract({ address: pair, abi: ammPairAbi, functionName: "getReserves" }),
        ]);
        const [m0, m1] = await Promise.all([tokenMeta(client, token0), tokenMeta(client, token1)]);
        const [r0, r1] = reserves as unknown as [bigint, bigint, number];
        const qieRes =
          token0.toLowerCase() === wqie.toLowerCase()
            ? r0
            : token1.toLowerCase() === wqie.toLowerCase()
              ? r1
              : 0n;
        const tvlUsd = qieRes > 0n && qieUsd ? (Number(qieRes) / 1e18) * 2 * qieUsd : 0;
        pools.push({
          address: pair,
          token0,
          token1,
          symbol0: m0.symbol,
          symbol1: m1.symbol,
          name0: m0.name,
          name1: m1.name,
          reserve0: r0.toString(),
          reserve1: r1.toString(),
          tvlUsd,
          volume24hUsd: 0,
          fees24hUsd: 0,
          apr: 0,
          createdAt: 0,
        });
      } catch {
        /* skip pair */
      }
    }
  }
  return pools;
}

export async function liveTokenByAddress(address: string): Promise<TokenRecord | null> {
  const ours = contractsFor("testnet");
  if (isZero(ours.launchpadFactory)) return null;
  const client = clientFor("testnet");
  try {
    const isOurs = await client.readContract({
      address: ours.launchpadFactory,
      abi: launchpadFactoryAbi,
      functionName: "isLaunchpadToken",
      args: [address as Address],
    });
    if (!isOurs) return null;
    const qieUsd = await getQieUsd().catch(() => 0);
    return liveTokenRecord(client, ours.launchpadFactory, address as Address, qieUsd);
  } catch {
    return null;
  }
}
