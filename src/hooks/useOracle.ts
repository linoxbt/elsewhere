"use client";

import { useReadContract } from "wagmi";
import { oracleAbi } from "@/lib/abi/launchpad";
import { oracleFor, ZERO_ADDRESS } from "@/lib/config";
import { decodeOracleRound, type OracleSnapshot } from "@/lib/oracle";
import { useNetwork } from "@/components/NetworkProvider";

export function useOracle(): {
  data: OracleSnapshot | undefined;
  isError: boolean;
  isLoading: boolean;
  refetch: () => void;
} {
  const { network } = useNetwork();
  const address = oracleFor(network);
  const enabled = address !== ZERO_ADDRESS;
  const query = useReadContract({
    address,
    abi: oracleAbi,
    functionName: "latestRoundData",
    chainId: network.id,
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
