import { NextRequest, NextResponse } from "next/server";
import { runOnce } from "@/server/indexer";

export const dynamic = "force-dynamic";

// Forces a full on-chain resync — expensive (multi-address getLogs scan) and
// previously callable by anyone with no auth or rate limit, and by nothing
// in this app (the frontend never calls it). Now gated behind a shared
// secret so only the scheduled reindex function (netlify/functions/
// scheduled-reindex.ts) or an operator can trigger it. Disabled entirely
// (fails closed) if the secret isn't configured.
export async function POST(req: NextRequest) {
  const secret = process.env.INDEX_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "reindex endpoint not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await runOnce();
  return NextResponse.json({ ok: true });
}
