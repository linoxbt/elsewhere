"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { WALLETCONNECT_PROJECT_ID } from "@/lib/wagmi";
import { useNetwork } from "./NetworkProvider";

export function WalletButton() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connectAsync, isPending, error, variables } = useConnect();
  const { disconnect } = useDisconnect();
  const { network } = useNetwork();
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const seen = new Set<string>();
    return connectors.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [connectors]);

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
        title={`${address} · ${connector?.name ?? ""} · click to disconnect`}
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
        onClick={() => setOpen((v) => !v)}
        className="rounded-sm border border-line bg-elev px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
      >
        {isPending ? "connecting…" : "connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-sm border border-line bg-elev p-3 font-mono text-[11px] shadow-xl">
          <p className="mb-2 text-muted">connect</p>
          <div className="space-y-1">
            {options.map((c) => {
              const activeId =
                variables?.connector && typeof variables.connector === "object" && "id" in variables.connector
                  ? String((variables.connector as { id: string }).id)
                  : "";
              const pending = isPending && activeId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isPending}
                  onClick={async () => {
                    try {
                      await connectAsync({ connector: c });
                      setOpen(false);
                    } catch {
                      /* error shown below */
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-sm border border-line px-2 py-1.5 text-left hover:bg-elev-2 disabled:opacity-50"
                >
                  <span>{c.name}</span>
                  <span className="text-faint">
                    {pending ? "…" : c.type === "walletConnect" ? "qr / reown" : "browser"}
                  </span>
                </button>
              );
            })}
          </div>
          {!WALLETCONNECT_PROJECT_ID && (
            <p className="mt-2 text-down">walletconnect project id missing</p>
          )}
          {WALLETCONNECT_PROJECT_ID && (
            <p className="mt-2 text-faint">reown id {WALLETCONNECT_PROJECT_ID.slice(0, 6)}…</p>
          )}
          {error && <p className="mt-2 text-down">{error.message}</p>}
          <button type="button" className="mt-2 text-accent" onClick={() => setOpen(false)}>
            close
          </button>
        </div>
      )}
    </div>
  );
}
