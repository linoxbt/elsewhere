import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { qieMainnet, qieTestnet } from "./networks";

export const wagmiConfig = createConfig({
  chains: [qieTestnet, qieMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [qieTestnet.id]: http(qieTestnet.rpcUrls.default.http[0]),
    [qieMainnet.id]: http(qieMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});
