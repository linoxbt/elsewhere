"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useNetwork } from "./NetworkProvider";

export function FaucetButton() {
  const { network } = useNetwork();
  const { address } = useAccount();
  const [busy, setBusy] = useState(false);
  if (!network.faucet) return null;

  async function request() {
    if (!address) {
      toast.message("connect a wallet first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("testnet QIE sent. wait ~1 minute");
      } else {
        toast.message(json.error || "faucet", {
          action: json.faucet
            ? { label: "official faucet", onClick: () => window.open(json.faucet, "_blank") }
            : undefined,
        });
        if (json.needsOfficial && json.faucet) window.open(json.faucet, "_blank");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "faucet failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void request()}
      disabled={busy}
      className="hidden rounded-sm border border-line px-2 py-0.5 font-mono text-[12px] text-accent hover:bg-elev-2 md:inline"
    >
      {busy ? "requesting…" : "faucet"}
    </button>
  );
}
