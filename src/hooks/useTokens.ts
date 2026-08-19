"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { TokenRecord } from "@/lib/types";
import { useTokenCache } from "@/components/TokenCache";

export function useTokens(sort: string, q: string) {
  const { putMany } = useTokenCache();
  const query = useQuery({
    queryKey: ["tokens", sort, q],
    queryFn: async () => {
      const p = new URLSearchParams({ sort });
      if (q) p.set("q", q);
      const res = await fetch(`/api/tokens?${p}`);
      const json = (await res.json()) as { tokens: TokenRecord[] };
      return json.tokens;
    },
    refetchInterval: 5000,
  });
  useEffect(() => {
    if (query.data) putMany(query.data);
  }, [query.data, putMany]);
  return query;
}

export function useToken(address: string) {
  return useQuery({
    queryKey: ["token", address],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${address}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    refetchInterval: 4000,
    enabled: !!address,
  });
}

export function useTrades(address: string) {
  return useQuery({
    queryKey: ["trades", address],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${address}/trades`);
      return res.json();
    },
    refetchInterval: 4000,
    enabled: !!address,
  });
}

export function useChart(address: string) {
  return useQuery({
    queryKey: ["chart", address],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${address}/chart`);
      return res.json();
    },
    refetchInterval: 8000,
    enabled: !!address,
  });
}

export function usePools(chainId?: number) {
  return useQuery({
    queryKey: ["pools", chainId],
    queryFn: async () => {
      const q = chainId ? `?chainId=${chainId}` : "";
      const res = await fetch(`/api/pools${q}`);
      return res.json();
    },
    refetchInterval: 8000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      return res.json() as Promise<{
        tokens: number;
        graduated: number;
        volume24hUsd: number;
        tvlUsd: number;
        qieUsd: number;
        oracle: string;
        oracleUpdatedAt: number;
        oracleError: string | null;
      }>;
    },
    refetchInterval: 15_000,
  });
}
