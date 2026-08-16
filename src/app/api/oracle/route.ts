import { NextRequest, NextResponse } from "next/server";
import { getOracle } from "@/server/price";
import { explorerAddress, PROTOCOL } from "@/lib/config";
import { NETWORKS, networkById } from "@/lib/networks";
import { creationFeeQieFromOracle } from "@/lib/oracle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("chainId") ?? "1990");
  const net = networkById(id) ?? NETWORKS.mainnet;
  const oracle = net.qieUsdOracle;
  if (net.key === "testnet") {
    return NextResponse.json({
      oracle,
      pair: "QIE / USD",
      decimals: 8,
      error: "no official testnet feed — mainnet oracle is live",
    });
  }
  try {
    const snap = await getOracle();
    const feeQie = creationFeeQieFromOracle(snap.usd8);
    return NextResponse.json({
      oracle,
      explorer: explorerAddress(net, oracle),
      pair: "QIE / USD",
      decimals: 8,
      usd: snap.usd,
      usd8: snap.usd8.toString(),
      updatedAt: snap.updatedAt,
      ageSec: snap.ageSec,
      stale: snap.stale,
      creationFeeUsd: PROTOCOL.creationFeeUsd,
      creationFeeQie: feeQie.toString(),
      graduationMarketCapUsd: PROTOCOL.graduationMarketCapUsd,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "oracle read failed";
    return NextResponse.json({ error: message, oracle }, { status: 502 });
  }
}
