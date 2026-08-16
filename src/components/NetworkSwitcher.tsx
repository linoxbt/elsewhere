"use client";

import { NETWORKS, type NetworkKey } from "@/lib/networks";
import { cn } from "@/lib/format";
import { useNetwork } from "./NetworkProvider";

export function NetworkSwitcher() {
  const { key, setNetwork } = useNetwork();
  return (
    <div className="flex rounded-sm border border-line p-0.5">
      {(Object.keys(NETWORKS) as NetworkKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => void setNetwork(k)}
          className={cn(
            "rounded-sm px-2 py-0.5 font-mono text-[11px]",
            key === k ? "bg-elev-2 text-ink" : "text-muted hover:text-ink",
          )}
        >
          {NETWORKS[k].short}
        </button>
      ))}
    </div>
  );
}
