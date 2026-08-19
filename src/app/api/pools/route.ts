import { NextRequest, NextResponse } from "next/server";
import { listPools } from "@/server/store";
import { livePools } from "@/server/liveListings";
import { networkById, type NetworkKey } from "@/lib/networks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("chainId") ?? "1983";
  const net = networkById(Number(raw));
  const key: NetworkKey = net?.key ?? "testnet";
  let pools = [...listPools()];
  if (pools.length === 0 || key === "mainnet") {
    pools = await livePools(key);
  }
  pools.sort((a, b) => b.tvlUsd - a.tvlUsd);
  return NextResponse.json({ pools, chainId: net?.id ?? 1983, network: key });
}
