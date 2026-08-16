"use client";

import { useNetwork } from "./NetworkProvider";

export function Footer() {
  const { network } = useNetwork();
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 font-mono text-[11px] text-muted">
        <span>elsewhere · {network.short}</span>
        <span>powered by official qie pools</span>
      </div>
    </footer>
  );
}
