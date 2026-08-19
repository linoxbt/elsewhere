"use client";

import { NETWORKS, type NetworkKey } from "@/lib/networks";
import { cn } from "@/lib/format";
import { useNetwork } from "./NetworkProvider";

export function NetworkSwitcher() {
  const { key, setNetwork } = useNetwork();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {(Object.keys(NETWORKS) as NetworkKey[]).map((k) => {
        const net = NETWORKS[k];
        const active = key === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => void setNetwork(k)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5 font-mono text-[12px]",
              active ? "border-line-strong bg-elev-2 text-ink" : "border-line text-muted hover:bg-elev-2 hover:text-ink",
            )}
            aria-pressed={active}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={net.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
            <span className="truncate">{net.short}</span>
          </button>
        );
      })}
    </div>
  );
}
