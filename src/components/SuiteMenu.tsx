"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BookOpen,
  Coins,
  Droplets,
  LayoutGrid,
  Rocket,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/format";

export const SUITE = [
  { href: "/", label: "discover", hint: "new tokens", icon: Sparkles },
  { href: "/create", label: "create", hint: "launch a token", icon: Rocket },
  { href: "/swap", label: "swap", hint: "trade qie pools", icon: ArrowLeftRight },
  { href: "/pools", label: "pools", hint: "add liquidity", icon: Droplets },
  { href: "/lend", label: "lend", hint: "supply & borrow", icon: Coins },
  { href: "/send", label: "send", hint: "single / batch", icon: Send },
  { href: "/docs", label: "docs", hint: "protocol guide", icon: BookOpen },
] as const;

export function SuiteMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] hover:bg-elev-2",
          open ? "bg-elev-2 text-ink" : "bg-elev text-ink",
        )}
        aria-expanded={open}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>suite</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[20.5rem] rounded-sm border border-line bg-elev p-2 shadow-xl sm:w-[22rem]">
          <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-faint">
            elsewhere suite
          </p>
          <div className="grid grid-cols-2 gap-1">
            {SUITE.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-2 rounded-sm border border-transparent px-2 py-2 hover:border-line hover:bg-elev-2",
                    active && "border-line bg-elev-2",
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[12px] text-ink">{item.label}</span>
                    <span className="block text-[10px] text-faint">{item.hint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
