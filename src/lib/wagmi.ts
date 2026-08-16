import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { qieMainnet, qieTestnet } from "./networks";

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const connectors = [
  injected({ shimDisconnect: true }),
  ...(WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: "elsewhere",
            description: "launchpad + amm on QIE",
            url: "https://elsewhere-qie.netlify.app",
            icons: ["https://elsewhere-qie.netlify.app/brand/mark.jpg"],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [qieTestnet, qieMainnet],
  connectors,
  transports: {
    [qieTestnet.id]: http(qieTestnet.rpcUrls.default.http[0]),
    [qieMainnet.id]: http(qieMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});
