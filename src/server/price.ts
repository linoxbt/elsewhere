import { createPublicClient, fallback, http } from "viem";
import { oracleAbi } from "@/lib/abi/launchpad";
import { NETWORKS, qieMainnet } from "@/lib/networks";
import { decodeOracleRound, type OracleSnapshot } from "@/lib/oracle";

const QIE_USD_ORACLE = NETWORKS.mainnet.qieUsdOracle;

const mainnetClient = createPublicClient({
  chain: qieMainnet,
  transport: fallback(NETWORKS.mainnet.rpcUrls.map((url) => http(url, { timeout: 20_000 }))),
});

let cache: { snap: OracleSnapshot; at: number } | null = null;

export async function getOracle(): Promise<OracleSnapshot> {
  if (cache && Date.now() - cache.at < 15_000) return cache.snap;

  const [, answer, , updatedAt] = await mainnetClient.readContract({
    address: QIE_USD_ORACLE,
    abi: oracleAbi,
    functionName: "latestRoundData",
  });
  if (answer <= 0n) throw new Error("qie oracle returned a non-positive price");
  const snap = decodeOracleRound(answer, updatedAt);
  if (snap.stale) throw new Error("qie oracle feed is stale (>48h)");
  cache = { snap, at: Date.now() };
  return snap;
}

export async function getQieUsd(): Promise<number> {
  const snap = await getOracle();
  return snap.usd;
}
