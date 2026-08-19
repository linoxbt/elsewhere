"use client";

import { useEffect, useState } from "react";

/**
 * Official Reown AppKit button. Clicking connect opens the Reown modal.
 * Clicking a connected address opens the account view (does not disconnect).
 */
export function WalletButton() {
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const label = compact ? "connect" : "connect wallet";

  if (!ready) {
    return (
      <span className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-sm border border-line bg-elev px-2.5 font-mono text-[12px] text-muted sm:h-9 sm:px-3">
        {label}
      </span>
    );
  }

  return (
    <div className="reown-btn shrink-0">
      <appkit-button balance="hide" size="sm" label={label} />
    </div>
  );
}
