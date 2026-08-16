import { NextResponse } from "next/server";
import { listTokens, listPools } from "@/server/store";
import { getOracle } from "@/server/price";
import { NETWORKS } from "@/lib/networks";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = listTokens();
  const pools = listPools();
  let qieUsd = 0;
  let oracleUpdatedAt = 0;
  let oracleError: string | null = null;
  try {
    const snap = await getOracle();
    qieUsd = snap.usd;
    oracleUpdatedAt = snap.updatedAt;
  } catch (err) {
    oracleError = err instanceof Error ? err.message : "oracle unavailable";
  }
  return NextResponse.json({
    tokens: tokens.length,
    graduated: tokens.filter((t) => t.graduated).length,
    volume24hUsd: tokens.reduce((s, t) => s + t.volume24hUsd, 0),
    tvlUsd: pools.reduce((s, p) => s + p.tvlUsd, 0),
    qieUsd,
    oracle: NETWORKS.mainnet.qieUsdOracle,
    oracleUpdatedAt,
    oracleError,
  });
}
