import { NextRequest, NextResponse } from "next/server";
import { officialTokens } from "@/server/officialTokens";
import { networkById, type NetworkKey } from "@/lib/networks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("chainId") ?? "1983";
  const id = Number(raw);
  const net = networkById(id);
  const key: NetworkKey = net?.key ?? "testnet";
  const tokens = await officialTokens(key);
  return NextResponse.json({
    chainId: net?.id ?? 1983,
    network: key,
    source: key === "mainnet" ? "qiedex" : "native",
    tokens,
  });
}
