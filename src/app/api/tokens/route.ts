import { NextRequest, NextResponse } from "next/server";
import { listTokens } from "@/server/store";
import { runOnce } from "@/server/indexer";
import { liveLaunchpadTokens } from "@/server/liveListings";
import { TOKEN_SORTS, type TokenSort } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseSort(raw: string): TokenSort {
  return (TOKEN_SORTS as readonly string[]).includes(raw) ? (raw as TokenSort) : "new";
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("refresh") === "1") {
    await runOnce();
  }
  const sort = parseSort(req.nextUrl.searchParams.get("sort") ?? "new");
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  let tokens = listTokens();
  if (tokens.length === 0) {
    tokens = await liveLaunchpadTokens();
  }
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
    switch (sort) {
      case "market cap":
        return b.marketCapUsd - a.marketCapUsd;
      case "volume":
        return b.volume24hUsd - a.volume24hUsd;
      case "new":
      case "graduated":
        return b.createdAt - a.createdAt;
    }
  });
  return NextResponse.json({ tokens });
}
