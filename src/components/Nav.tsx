"use client";

import { useAccount, useChainId } from "wagmi";
import { Logo } from "./Logo";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletButton } from "./WalletButton";
import { FaucetButton } from "./FaucetButton";
import { AddChainButton } from "./AddChainButton";
import { SuiteMenu } from "./SuiteMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useNetwork } from "./NetworkProvider";

export function Nav() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrong = isConnected && chainId !== network.id;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <FaucetButton />
          {wrong && <AddChainButton compact />}
          <SuiteMenu />
          <NetworkSwitcher />
          <ThemeSwitcher />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
