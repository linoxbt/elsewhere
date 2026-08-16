"use client";

import { useAccount, useChainId } from "wagmi";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletButton } from "./WalletButton";
import { FaucetButton } from "./FaucetButton";
import { OracleBadge } from "./OracleBadge";
import { AddChainButton } from "./AddChainButton";
import { SuiteMenu } from "./SuiteMenu";
import { useNetwork } from "./NetworkProvider";

export function Nav() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrong = isConnected && chainId !== network.id;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#050505]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <OracleBadge />
          <FaucetButton />
          {wrong && <AddChainButton compact />}
          <SuiteMenu />
          <NetworkSwitcher />
          <WalletButton />
        </div>
      </div>
      <div className="border-t border-line px-4 py-2 md:hidden">
        <GlobalSearch compact />
      </div>
    </header>
  );
}
