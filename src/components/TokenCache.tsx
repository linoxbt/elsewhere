"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TokenMeta, TokenRecord } from "@/lib/types";
import { NATIVE_QIE, launchpadContracts } from "@/lib/config";
import { NETWORKS } from "@/lib/networks";

type Cache = {
  byAddress: Record<string, TokenMeta>;
  launchpad: TokenRecord[];
  put: (m: TokenMeta) => void;
  putMany: (list: TokenRecord[]) => void;
  get: (addr: string) => TokenMeta | undefined;
};

const Ctx = createContext<Cache | null>(null);

function wqieMeta(address: `0x${string}`): TokenMeta {
  return { address, symbol: "WQIE", name: "Wrapped QIE", decimals: 18, isNative: false };
}

// Testnet and mainnet each have their own real WQIE contract — seeding only
// one (previously always the testnet address, regardless of the active
// network) meant the real mainnet WQIE address never resolved to "WQIE" in
// the UI while on mainnet.
const seed: Record<string, TokenMeta> = {
  [NATIVE_QIE.address.toLowerCase()]: { ...NATIVE_QIE },
  [launchpadContracts.testnet.wqie.toLowerCase()]: wqieMeta(launchpadContracts.testnet.wqie),
  ...(NETWORKS.mainnet.officialDex
    ? { [NETWORKS.mainnet.officialDex.wqie.toLowerCase()]: wqieMeta(NETWORKS.mainnet.officialDex.wqie) }
    : {}),
};

export function TokenCacheProvider({ children }: { children: ReactNode }) {
  const [byAddress, setByAddress] = useState<Record<string, TokenMeta>>(seed);
  const [launchpad, setLaunchpad] = useState<TokenRecord[]>([]);

  const put = useCallback((m: TokenMeta) => {
    setByAddress((prev) => ({ ...prev, [m.address.toLowerCase()]: m }));
  }, []);

  const putMany = useCallback((list: TokenRecord[]) => {
    setLaunchpad(list);
    setByAddress((prev) => {
      const next = { ...prev };
      for (const t of list) {
        next[t.address.toLowerCase()] = {
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          decimals: 18,
          image: t.image,
        };
      }
      return next;
    });
  }, []);

  const get = useCallback(
    (addr: string) => byAddress[addr.toLowerCase()],
    [byAddress],
  );

  const value = useMemo(
    () => ({ byAddress, launchpad, put, putMany, get }),
    [byAddress, launchpad, put, putMany, get],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTokenCache() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TokenCache");
  return ctx;
}
