"use client";

import { explorerAddress } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useState } from "react";
import { useNetwork } from "./NetworkProvider";

export function CopyAddress({ address, label }: { address: string; label?: string }) {
  const [ok, setOk] = useState(false);
  const { network } = useNetwork();
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
      {label && <span className="text-faint">{label}</span>}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(address);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        }}
        className="hover:text-ink"
        title={address}
      >
        {ok ? "copied" : shortAddress(address)}
      </button>
      <a href={explorerAddress(network, address)} target="_blank" rel="noreferrer" className="hover:text-accent">
        ↗
      </a>
    </span>
  );
}
