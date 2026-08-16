"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { useNetwork } from "./NetworkProvider";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { network } = useNetwork();
  const [open, setOpen] = useState(false);

  const injected = connectors.filter((c) => c.id === "injected" || c.type === "injected");

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
        title={`${address} · click to disconnect`}
      >
        <span className="hidden h-1.5 w-1.5 rounded-full bg-up sm:inline-block" />
        <span>{shortAddress(address)}</span>
        <span className="hidden text-faint sm:inline">{network.short}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={async () => {
          const c = injected[0] ?? connectors[0];
          if (!c) {
            setOpen(true);
            return;
          }
          try {
            await connectAsync({ connector: c });
          } catch {
            setOpen(true);
          }
        }}
        className="rounded-sm border border-line bg-elev px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
      >
        {isPending ? "connecting…" : "connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-sm border border-line bg-elev p-3 font-mono text-[11px] shadow-xl">
          <p className="mb-2 text-muted">
            elsewhere uses your browser wallet only — no WalletConnect / Reown.
          </p>
          {error && <p className="mb-2 text-down">{error.message}</p>}
          <p className="text-faint">install metamask, rabby, or qie wallet, then retry.</p>
          <button type="button" className="mt-2 text-accent" onClick={() => setOpen(false)}>
            close
          </button>
        </div>
      )}
    </div>
  );
}
