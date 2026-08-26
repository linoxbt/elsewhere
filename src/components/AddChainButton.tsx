"use client";

import { addChainParams } from "@/lib/config";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useNetwork } from "./NetworkProvider";

export function AddChainButton({ compact = false }: { compact?: boolean }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const { network } = useNetwork();
  if (isConnected && chainId === network.id) return null;

  async function add() {
    try {
      if (isConnected) {
        await switchChainAsync({ chainId: network.id });
        return;
      }
    } catch {
      /* wallet doesn't recognize this chain yet — fall through to add it */
    }
    const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } })
      .ethereum;
    if (!eth) {
      alert("no wallet found");
      return;
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [addChainParams(network)],
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={isPending}
      className="mono rounded-sm border border-line px-2.5 py-1 text-[12px] uppercase tracking-wide text-accent hover:bg-elev-2"
    >
      {compact ? `+ ${network.short}` : isConnected ? `switch to ${network.short}` : `+ add ${network.short}`}
    </button>
  );
}
