import { NextResponse } from "next/server";
import { listPools } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const pools = [...listPools()].sort((a, b) => b.tvlUsd - a.tvlUsd);
  return NextResponse.json({ pools });
}
