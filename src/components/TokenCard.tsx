"use client";

import Link from "next/link";
import type { TokenRecord } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { TokenImage } from "./TokenImage";
import { PROTOCOL } from "@/lib/config";

export function TokenCard({ token }: { token: TokenRecord }) {
  const pct = Math.min(100, Math.round(token.progress * 100));
  return (
    <Link
      href={`/token/${token.address}`}
      className="group flex flex-col gap-3 rounded-sm border border-line bg-elev p-3 hover:border-[#333]"
    >
      <div className="flex items-start gap-3">
        <TokenImage src={token.image} address={token.address} symbol={token.symbol} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium">{token.name}</div>
            {token.graduated && (
              <span className="shrink-0 rounded-sm border border-[#2a3324] bg-[#12180f] px-1.5 py-0.5 font-mono text-[10px] text-accent-2">
                graduated
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] uppercase text-muted">{token.symbol}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div>
          <div className="text-faint">mcap</div>
          <div>{formatUsd(token.marketCapUsd, { compact: true })}</div>
        </div>
        <div className="text-right">
          <div className="text-faint">24h vol</div>
          <div>{formatUsd(token.volume24hUsd, { compact: true })}</div>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between font-mono text-[10px] text-muted">
          <span>bonding curve</span>
          <span>
            {token.graduated ? "100%" : `${pct}%`} / {formatUsd(PROTOCOL.graduationMarketCapUsd, { compact: true })}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-sm bg-[#1a1a1a]">
          <div
            className="h-full bg-accent"
            style={{ width: `${token.graduated ? 100 : pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
