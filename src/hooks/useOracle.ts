"use client";

import { useReadContract } from "wagmi";
import { oracleAbi } from "@/lib/abi/launchpad";
import { displayOracle, oracleFor, ZERO_ADDRESS } from "@/lib/config";
import { NETWORKS } from "@/lib/networks";
import { decodeOracleRound, type OracleSnapshot } from "@/lib/oracle";
import { useNetwork } from "@/components/NetworkProvider";

function useReadOracle(address: `0x${string}`, chainId: number, enabled: boolean) {
  const query = useReadContract({
    address,
    abi: oracleAbi,
    functionName: "latestRoundData",
    chainId,
    query: {
      enabled,
      refetchInterval: 15_000,
    },
  });
  const round = query.data;
  const data =
    round && round[1] > 0n ? decodeOracleRound(round[1], round[3]) : undefined;
  return {
    data,
    isError: enabled && (query.isError || (!!data && data.stale)),
    isLoading: enabled && query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Official mainnet QIE/USD. always used for the displayed price. */
export function useDisplayOracle() {
  const address = displayOracle();
  return useReadOracle(address, NETWORKS.mainnet.id, address !== ZERO_ADDRESS);
}

/** Per-network protocol feed (testnet fee math). */
export function useOracle(): {
  data: OracleSnapshot | undefined;
  isError: boolean;
  isLoading: boolean;
  refetch: () => void;
} {
  const { network } = useNetwork();
  const address = oracleFor(network);
  return useReadOracle(address, network.id, address !== ZERO_ADDRESS);
}
