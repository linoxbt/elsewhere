"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNetwork } from "./NetworkProvider";

const productLinks = [
  { href: "/create", label: "launch" },
  { href: "/discover", label: "discover" },
  { href: "/swap", label: "swap" },
  { href: "/pools", label: "pools" },
  { href: "/lend", label: "lend" },
  { href: "/send", label: "send" },
];

export function Footer() {
  const path = usePathname();
  const { network } = useNetwork();

  if (path !== "/") {
    return (
      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-5 font-mono text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-6">
          <span>elsewhere · {network.short}</span>
          <span>powered by official qie pools</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-6xl px-3 py-10 sm:px-4 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="font-mono text-[14px] text-ink">elsewhere</p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
              Unified token launchpad and AMM for QIE. Powered by official QIE pools.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-faint">product</p>
            <ul className="mt-3 space-y-2">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-mono text-[13px] text-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-faint">resources</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/docs" className="font-mono text-[13px] text-muted hover:text-ink">
                  docs
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/linoxbt/elsewhere"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[13px] text-muted hover:text-ink"
                >
                  github
                </a>
              </li>
              <li>
                <a
                  href={network.explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[13px] text-muted hover:text-ink"
                >
                  {network.explorerName.toLowerCase()}
                </a>
              </li>
              {network.faucet && (
                <li>
                  <a
                    href={network.faucet}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[13px] text-muted hover:text-ink"
                  >
                    testnet faucet
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-1 border-t border-line pt-5 font-mono text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>elsewhere · {network.short}</span>
          <span>powered by official qie pools</span>
        </div>
      </div>
    </footer>
  );
}
