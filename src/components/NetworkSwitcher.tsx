"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NETWORKS, type NetworkKey } from "@/lib/networks";
import { cn } from "@/lib/format";
import { useNetwork } from "./NetworkProvider";

export function NetworkSwitcher() {
  const { key, setNetwork, network } = useNetwork();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-sm border border-line bg-elev px-2 py-1 font-mono text-[11px] hover:bg-elev-2"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={network.logo} alt="" className="h-4 w-4 object-contain" />
        <span className="hidden sm:inline">{network.name}</span>
        <span className="sm:hidden">{network.short}</span>
        <ChevronDown className="h-3 w-3 text-faint" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-[min(13rem,calc(100vw-1.5rem))] rounded-sm border border-line bg-elev p-1 shadow-xl"
        >
          {(Object.keys(NETWORKS) as NetworkKey[]).map((k) => {
            const net = NETWORKS[k];
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={key === k}
                onClick={() => {
                  void setNetwork(k);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-[11px]",
                  key === k ? "bg-elev-2 text-ink" : "text-muted hover:bg-elev-2 hover:text-ink",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={net.logo} alt="" className="h-5 w-5 object-contain" />
                <span className="flex-1">{net.name}</span>
                <span className="text-faint">{net.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
