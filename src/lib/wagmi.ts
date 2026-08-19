"use client";

import { createAppKit } from "@reown/appkit/react";
import { defineChain, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { NETWORKS, type NetworkDef } from "./networks";

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "f0d6f8162be1beccf221b4e2f8bd7026";

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
  metadata: {
    name: "elsewhere",
    description: "launchpad + amm on QIE",
    url: "https://elsewhere-qie.netlify.app",
    icons: ["https://elsewhere-qie.netlify.app/brand/mark.jpg"],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#c4b5a0",
    "--w3m-border-radius-master": "2px",
    "--w3m-font-size-master": "11px",
    "--w3m-font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  chainImages: {
    [NETWORKS.testnet.id]: `https://elsewhere-qie.netlify.app${NETWORKS.testnet.logo}`,
    [NETWORKS.mainnet.id]: `https://elsewhere-qie.netlify.app${NETWORKS.mainnet.logo}`,
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
