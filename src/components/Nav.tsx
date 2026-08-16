"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletButton } from "./WalletButton";
import { FaucetButton } from "./FaucetButton";
import { OracleBadge } from "./OracleBadge";
import { AddChainButton } from "./AddChainButton";
import { useAccount, useChainId } from "wagmi";
import { useNetwork } from "./NetworkProvider";

const links = [
  { href: "/", label: "discover" },
  { href: "/create", label: "create" },
  { href: "/swap", label: "swap" },
  { href: "/pools", label: "pools" },
  { href: "/docs", label: "docs" },
];

export function Nav() {
  const path = usePathname();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrong = isConnected && chainId !== network.id;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#050505]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-sm px-2.5 py-1 font-mono text-xs lowercase",
                  active ? "bg-elev-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden flex-1 md:block">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <OracleBadge />
          <NetworkSwitcher />
          <FaucetButton />
          {wrong && <AddChainButton compact />}
          <WalletButton />
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {links.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "whitespace-nowrap rounded-sm px-2 py-1 font-mono text-xs",
                active ? "bg-elev-2 text-ink" : "text-muted",
              )}
            >
              {l.label}
            </Link>
          );
        })}
        <div className="min-w-[120px] flex-1">
          <GlobalSearch compact />
        </div>
      </div>
    </header>
  );
}
