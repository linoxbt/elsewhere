"use client";

import { useEffect, useState } from "react";

/**
 * Official Reown AppKit button. Clicking connect opens the Reown modal.
 * Clicking a connected address opens the account view (does not disconnect).
 */
export function WalletButton() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <span className="inline-flex h-9 min-w-[8.5rem] items-center justify-center rounded-sm border border-line bg-elev px-3 font-mono text-[11px] text-muted">
        connect wallet
      </span>
    );
  }

  return (
    <div className="reown-btn">
      <appkit-button balance="hide" size="sm" label="connect wallet" />
    </div>
  );
}
