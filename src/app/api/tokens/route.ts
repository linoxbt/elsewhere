import { NextRequest, NextResponse } from "next/server";
import { listTokens } from "@/server/store";
import { runOnce } from "@/server/indexer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("refresh") === "1") {
    await runOnce();
  }
  const sort = req.nextUrl.searchParams.get("sort") ?? "new";
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  let tokens = listTokens();
  if (q) {
    tokens = tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q),
    );
  }
  if (sort === "graduated") tokens = tokens.filter((t) => t.graduated);
  tokens = [...tokens].sort((a, b) => {
    if (sort === "market cap") return b.marketCapUsd - a.marketCapUsd;
    if (sort === "volume") return b.volume24hUsd - a.volume24hUsd;
    if (sort === "graduated") return b.createdAt - a.createdAt;
    return b.createdAt - a.createdAt;
  });
  return NextResponse.json({ tokens });
}
