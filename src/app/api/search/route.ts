import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { searchIndex, getMeta, setMeta } from "@/server/store";
import { publicClient } from "@/server/chain";
import { erc20Abi } from "@/lib/abi/launchpad";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const { tokens } = searchIndex(q);
  let extra: { address: string; name: string; symbol: string; decimals: number } | null =
    null;
  if (isAddress(q)) {
    const cached = getMeta(q);
    if (cached) {
      extra = { address: q, ...cached };
    } else {
      try {
        const [name, symbol, decimals] = await Promise.all([
          publicClient.readContract({ address: q, abi: erc20Abi, functionName: "name" }),
          publicClient.readContract({ address: q, abi: erc20Abi, functionName: "symbol" }),
          publicClient.readContract({ address: q, abi: erc20Abi, functionName: "decimals" }),
        ]);
        extra = { address: q, name, symbol, decimals };
        setMeta(q, extra);
      } catch {
        extra = null;
      }
    }
  }
  return NextResponse.json({ tokens, extra });
}
