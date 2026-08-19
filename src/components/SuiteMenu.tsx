"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BookOpen,
  Coins,
  Droplets,
  House,
  LayoutGrid,
  Rocket,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/format";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

export const SUITE = [
  { href: "/", label: "home", hint: "landing", icon: House },
  { href: "/discover", label: "discover", hint: "new tokens", icon: Sparkles },
  { href: "/create", label: "create", hint: "launch a token", icon: Rocket },
  { href: "/swap", label: "swap", hint: "trade qie pools", icon: ArrowLeftRight },
  { href: "/pools", label: "pools", hint: "add liquidity", icon: Droplets },
  { href: "/lend", label: "lend", hint: "supply & borrow ELSE", icon: Coins },
  { href: "/send", label: "send", hint: "single / batch", icon: Send },
  { href: "/docs", label: "docs", hint: "protocol guide", icon: BookOpen },
] as const;

export function SuiteMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  const trigger = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || panel.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlay =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
            <button
              type="button"
              aria-label="close suite"
              className="absolute inset-0 bg-black/60"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="elsewhere suite"
              className="relative z-10 w-full max-w-[22rem] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-sm border border-line bg-elev p-3 shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
                  elsewhere suite
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-elev-2 hover:text-ink"
                  aria-label="close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {SUITE.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/"
                      ? path === "/"
                      : path === item.href || path.startsWith(`${item.href}/`);
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
                        <span className="block font-mono text-[13px] text-ink">{item.label}</span>
                        <span className="block text-[11px] text-faint">{item.hint}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                <NetworkSwitcher />
                <ThemeSwitcher />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={trigger} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-sm border border-line hover:bg-elev-2",
          open ? "bg-elev-2 text-ink" : "bg-elev text-ink",
        )}
        aria-expanded={open}
        aria-label="suite"
        title="suite"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      {overlay}
    </div>
  );
}
