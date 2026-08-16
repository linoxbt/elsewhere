import { NextRequest, NextResponse } from "next/server";
import { listTrades } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  return NextResponse.json({ trades: listTrades(address, 100) });
}
