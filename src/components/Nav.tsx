"use client";

import { usePathname } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { AddChainButton } from "./AddChainButton";
import { SuiteMenu } from "./SuiteMenu";
import { useNetwork } from "./NetworkProvider";

export function Nav() {
  const path = usePathname();
  const landing = path === "/";
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { network } = useNetwork();
  const wrong = isConnected && chainId !== network.id;

  // Barely-there depth cue: the header picks up a shadow only once the page
  // has actually scrolled, instead of showing a hard border at all times.
  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 80], [0, 0.28]);
  const boxShadow = useTransform(shadowOpacity, (v) => `0 8px 24px rgba(0,0,0,${v})`);

  return (
    <motion.header
      style={{ boxShadow }}
      className="sticky top-0 z-40 overflow-visible border-b border-line bg-bg/90 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-visible px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <Logo />
        <div className="ml-auto flex items-center gap-1.5 overflow-visible sm:gap-2">
          {wrong && !landing && <AddChainButton compact />}
          {!landing && <SuiteMenu />}
          <WalletButton />
        </div>
      </div>
    </motion.header>
  );
}
