"use client";

import { useAccount, useChainId } from "wagmi";
import { AddChainButton } from "./AddChainButton";
import { useNetwork } from "./NetworkProvider";

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  if (!isConnected) return null;
  if (chainId === network.id) return null;
  return (
    <div className="border-b border-line bg-[#1a1408] px-3 py-2 text-center text-[12px] text-accent sm:px-4 sm:text-xs">
      wallet is on chain {chainId}. elsewhere is set to {network.name} ({network.id}).{" "}
      <span className="ml-2 inline-block">
        <AddChainButton />
      </span>
    </div>
  );
}
