"use client";

import { usePathname } from "next/navigation";
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
  const path = usePathname();
  const landing = path === "/";
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrong = isConnected && chainId !== network.id;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        <Logo />
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          {!landing && <FaucetButton />}
          {wrong && !landing && <AddChainButton compact />}
          {!landing && (
            <>
              <SuiteMenu />
              <NetworkSwitcher />
              <ThemeSwitcher />
            </>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
