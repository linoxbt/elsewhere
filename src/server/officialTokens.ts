import { createPublicClient, http, fallback, type Address } from "viem";
import { ammFactoryAbi, ammPairAbi } from "@/lib/abi/amm";
import { erc20Abi } from "@/lib/abi/launchpad";
import { ZERO_ADDRESS } from "@/lib/config";
import { NETWORKS, qieMainnet, qieTestnet, type NetworkKey } from "@/lib/networks";
import type { TokenMeta } from "@/lib/types";

function clientFor(key: NetworkKey) {
  const net = NETWORKS[key];
  const chain = key === "mainnet" ? qieMainnet : qieTestnet;
  return createPublicClient({
    chain,
    transport: fallback(net.rpcUrls.map((url) => http(url, { timeout: 20_000 }))),
  });
}

export async function officialTokens(key: NetworkKey): Promise<TokenMeta[]> {
  const net = NETWORKS[key];
  const out: TokenMeta[] = [
    {
      address: ZERO_ADDRESS,
      name: "QIE",
      symbol: "QIE",
      decimals: 18,
      isNative: true,
    },
  ];
  if (!net.officialDex) return out;

  const client = clientFor(key);
  const factories = [net.officialDex.factory, ...net.officialDex.extraFactories];
  const seen = new Set<string>([ZERO_ADDRESS, net.officialDex.wqie.toLowerCase()]);

  out.push({
    address: net.officialDex.wqie,
    name: "Wrapped QIE",
    symbol: "WQIE",
    decimals: 18,
  });

  for (const factory of factories) {
    try {
      const n = await client.readContract({
        address: factory,
        abi: ammFactoryAbi,
        functionName: "allPairsLength",
      });
      const len = Number(n);
      for (let i = 0; i < len; i++) {
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
          const k = addr.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          try {
            const [name, symbol, decimals] = await Promise.all([
              client.readContract({ address: addr, abi: erc20Abi, functionName: "name" }),
              client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
              client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
            ]);
            out.push({ address: addr, name, symbol, decimals });
          } catch {
            out.push({ address: addr, name: "token", symbol: "TKN", decimals: 18 });
          }
        }
      }
    } catch {
      /* factory may not expose allPairs */
    }
  }
  return out;
}
