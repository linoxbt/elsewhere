import { NextResponse } from "next/server";
import { runOnce } from "@/server/indexer";

export const dynamic = "force-dynamic";

export async function POST() {
  await runOnce();
  return NextResponse.json({ ok: true });
}
