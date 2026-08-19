"use client";

import { useCallback } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { useNetwork } from "@/components/NetworkProvider";

/** Public client pinned to the UI-selected QIE network, not the wallet chain. */
export function useNetClient() {
  const { network } = useNetwork();
  return usePublicClient({ chainId: network.id });
}

export function useNetWrite() {
  const { network } = useNetwork();
  const w = useWriteContract();
  const writeContractAsync = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => w.writeContractAsync({ ...args, chainId: network.id }),
    [w, network.id],
  );
  return { writeContractAsync, isPending: w.isPending };
}
