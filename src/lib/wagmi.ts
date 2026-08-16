"use client";

import { createAppKit } from "@reown/appkit/react";
import { defineChain, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { NETWORKS, type NetworkDef } from "./networks";

/** Public Reown Cloud project id. Env wins; fallback is the same id used on Netlify. */
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "f0d6f8162be1beccf221b4e2f8bd7026";

export const hasWalletConnect = Boolean(WALLETCONNECT_PROJECT_ID);

function toAppKitNetwork(net: NetworkDef, testnet: boolean): AppKitNetwork {
  return defineChain({
    id: net.id,
    caipNetworkId: `eip155:${net.id}`,
    chainNamespace: "eip155",
    name: net.name,
    nativeCurrency: net.nativeCurrency,
    rpcUrls: { default: { http: [...net.rpcUrls] } },
    blockExplorers: {
      default: { name: net.explorerName, url: net.explorer },
    },
    testnet,
  });
}

const qieTestnetApp = toAppKitNetwork(NETWORKS.testnet, true);
const qieMainnetApp = toAppKitNetwork(NETWORKS.mainnet, false);
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [qieTestnetApp, qieMainnetApp];

const metadata = {
  name: "elsewhere",
  description: "launchpad + amm on QIE",
  url: "https://elsewhere-qie.netlify.app",
  icons: ["https://elsewhere-qie.netlify.app/brand/mark.jpg"],
};

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: WALLETCONNECT_PROJECT_ID,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: qieTestnetApp,
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata,
  themeMode: "dark",
  features: { analytics: false, email: false, socials: false },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
