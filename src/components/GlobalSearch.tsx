"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { TokenImage } from "./TokenImage";
import type { TokenRecord } from "@/lib/types";
import { shortAddress } from "@/lib/format";

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [extra, setExtra] = useState<{
    address: string;
    name: string;
    symbol: string;
  } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!q.trim()) {
      setTokens([]);
      setExtra(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setTokens(json.tokens ?? []);
      setExtra(json.extra ?? null);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function goToken(addr: string) {
    setOpen(false);
    setQ("");
    router.push(`/token/${addr}`);
  }

  function goSwap(addr: string) {
    setOpen(false);
    setQ("");
    router.push(`/swap?out=${addr}`);
  }

  return (
    <div ref={box} className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={compact ? "search" : "search name, ticker, or address"}
        className="w-full rounded-sm border border-line bg-elev px-3 py-1.5 font-mono text-xs text-ink outline-none placeholder:text-faint focus:border-line-strong"
      />
      {open && (tokens.length > 0 || extra || isAddress(q)) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-sm border border-line bg-elev shadow-xl">
          {tokens.map((t) => (
            <button
              key={t.address}
              type="button"
              onClick={() => goToken(t.address)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-elev-2"
            >
              <TokenImage src={t.image} address={t.address} symbol={t.symbol} size={22} />
              <span className="text-sm">{t.name}</span>
              <span className="font-mono text-[11px] text-muted">{t.symbol}</span>
              {t.graduated && (
                <span className="ml-auto font-mono text-[10px] text-accent-2">graduated</span>
              )}
            </button>
          ))}
          {extra && !tokens.some((t) => t.address.toLowerCase() === extra.address.toLowerCase()) && (
            <button
              type="button"
              onClick={() => goSwap(extra.address)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-elev-2"
            >
              <TokenImage address={extra.address} symbol={extra.symbol} size={22} />
              <span className="text-sm">{extra.name}</span>
              <span className="font-mono text-[11px] text-muted">{extra.symbol}</span>
              <span className="ml-auto font-mono text-[10px] text-muted">swap</span>
            </button>
          )}
          {isAddress(q) && !extra && tokens.length === 0 && (
            <button
              type="button"
              onClick={() => goSwap(q)}
              className="flex w-full items-center justify-between px-3 py-2 font-mono text-xs hover:bg-elev-2"
            >
              <span>swap {shortAddress(q)}</span>
              <span className="text-muted">tip-20</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
