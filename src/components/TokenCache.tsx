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
import { NATIVE_QIE, WQIE_TOKEN, contracts } from "@/lib/config";

type Cache = {
  byAddress: Record<string, TokenMeta>;
  launchpad: TokenRecord[];
  put: (m: TokenMeta) => void;
  putMany: (list: TokenRecord[]) => void;
  get: (addr: string) => TokenMeta | undefined;
};

const Ctx = createContext<Cache | null>(null);

const seed: Record<string, TokenMeta> = {
  [NATIVE_QIE.address.toLowerCase()]: { ...NATIVE_QIE },
  [WQIE_TOKEN.address.toLowerCase()]: { ...WQIE_TOKEN },
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
      if (contracts.wqie) {
        next[contracts.wqie.toLowerCase()] = { ...WQIE_TOKEN };
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
