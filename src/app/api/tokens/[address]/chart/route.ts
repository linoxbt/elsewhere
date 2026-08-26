import { NextRequest, NextResponse } from "next/server";
import { catchUpIfStale } from "@/server/indexer";
import { candlesOf } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  await catchUpIfStale();
  return NextResponse.json({ candles: candlesOf(address) });
}
