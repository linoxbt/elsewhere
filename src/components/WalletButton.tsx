"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { shortAddress } from "@/lib/format";
import { WALLETCONNECT_PROJECT_ID, hasWalletConnect } from "@/lib/wagmi";
import { useNetwork } from "./NetworkProvider";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { network } = useNetwork();

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => void open({ view: "Account" })}
        className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
        title={`${address} · reown ${WALLETCONNECT_PROJECT_ID.slice(0, 6)}… · click for account`}
      >
        <span className="hidden h-1.5 w-1.5 rounded-full bg-up sm:inline-block" />
        <span>{shortAddress(address)}</span>
        <span className="hidden text-faint sm:inline">{network.short}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void open({ view: "Connect" })}
      className="rounded-sm border border-line bg-elev px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2"
      title={
        hasWalletConnect
          ? `reown project ${WALLETCONNECT_PROJECT_ID.slice(0, 6)}…`
          : "reown project id missing"
      }
    >
      connect wallet
    </button>
  );
}
