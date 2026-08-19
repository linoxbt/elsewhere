"use client";

import { useNetwork } from "./NetworkProvider";

export function Footer() {
  const { network } = useNetwork();
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-5 font-mono text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-6">
        <span>elsewhere · {network.short}</span>
        <span>powered by official qie pools</span>
      </div>
    </footer>
  );
}
