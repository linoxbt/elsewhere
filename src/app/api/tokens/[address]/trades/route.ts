import { NextRequest, NextResponse } from "next/server";
import { catchUpIfStale } from "@/server/indexer";
import { listTrades } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  // On a serverless deploy the background poller (instrumentation.ts's
  // setInterval) doesn't reliably survive between invocations, so this store
  // can otherwise sit permanently empty. Trigger an inline catch-up when the
  // index looks stale — bounded/no-op when it's already fresh.
  await catchUpIfStale();
  return NextResponse.json({ trades: listTrades(address, 100) });
}
