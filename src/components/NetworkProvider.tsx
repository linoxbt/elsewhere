"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { NETWORKS, networkById, type NetworkDef, type NetworkKey } from "@/lib/networks";
import { addChainParams } from "@/lib/config";

const STORAGE = "elsewhere.network";

type Ctx = {
  network: NetworkDef;
  key: NetworkKey;
  setNetwork: (key: NetworkKey) => Promise<void>;
};

const NetworkCtx = createContext<Ctx | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<NetworkKey>("testnet");
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE) as NetworkKey | null;
    if (saved === "mainnet" || saved === "testnet") setKey(saved);
  }, []);

  useEffect(() => {
    const fromWallet = networkById(chainId);
    if (isConnected && fromWallet && fromWallet.key !== key) {
      // wallet moved, follow it
      setKey(fromWallet.key);
      localStorage.setItem(STORAGE, fromWallet.key);
    }
  }, [chainId, isConnected, key]);

  const setNetwork = useCallback(
    async (next: NetworkKey) => {
      setKey(next);
      localStorage.setItem(STORAGE, next);
      const net = NETWORKS[next];
      if (!isConnected) return;
      try {
        await switchChainAsync({ chainId: net.id });
      } catch {
        const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } })
          .ethereum;
        if (!eth) return;
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: net.hexId }],
          });
        } catch {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [addChainParams(net)],
          });
        }
      }
    },
    [isConnected, switchChainAsync],
  );

  const value = useMemo(
    () => ({ network: NETWORKS[key], key, setNetwork }),
    [key, setNetwork],
  );

  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkCtx);
  if (!ctx) throw new Error("NetworkProvider");
  return ctx;
}
