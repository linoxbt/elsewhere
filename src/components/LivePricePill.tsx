"use client";

import { useDisplayOracle } from "@/hooks/useOracle";

/** Small "the protocol is alive" signal for the hero — the same official
 *  mainnet QIE/USD read used everywhere else in the app, not a mock number. */
export function LivePricePill() {
  const { data, isError } = useDisplayOracle();
  if (!data || isError) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elev px-2.5 py-1 font-mono text-[11px] text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse" />
      QIE ${data.usd < 1 ? data.usd.toFixed(4) : data.usd.toFixed(2)}
      <span className="text-faint">live</span>
    </span>
  );
}
