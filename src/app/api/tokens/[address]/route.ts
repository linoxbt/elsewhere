import { NextRequest, NextResponse } from "next/server";
import { getToken, holdersOf } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const token = getToken(address);
  if (!token) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ token, holders: holdersOf(address).slice(0, 50) });
}
