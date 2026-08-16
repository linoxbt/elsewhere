import { createPublicClient, http, fallback } from "viem";
import { qieTestnet } from "@/lib/chains";
import { NETWORKS } from "@/lib/networks";

export const publicClient = createPublicClient({
  chain: qieTestnet,
  transport: fallback(NETWORKS.testnet.rpcUrls.map((url) => http(url, { timeout: 20_000 }))),
});
