import { defineChain } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export type NetworkKey = "testnet" | "mainnet";

export type OfficialDex = {
  factory: `0x${string}`;
  extraFactories: `0x${string}`[];
  router: `0x${string}`;
  wqie: `0x${string}`;
};

export type NetworkDef = {
  key: NetworkKey;
  id: number;
  hexId: `0x${string}`;
  name: string;
  short: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  explorer: string;
  explorerName: string;
  faucet?: string;
  officialDex: OfficialDex | null;
  /** Official mainnet QIE/USD feed. Testnet uses a deployed feed when set. */
  qieUsdOracle: `0x${string}`;
};

export const NETWORKS: Record<NetworkKey, NetworkDef> = {
  testnet: {
    key: "testnet",
    id: 1983,
    hexId: "0x7bf",
    name: "QIE Testnet",
    short: "testnet",
    nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
    rpcUrls: [
      "https://rpc1testnet.qie.digital",
      "https://rpc2testnet.qie.digital",
      "https://rpc3testnet.qie.digital",
    ],
    explorer: "https://testnet.qie.digital",
    explorerName: "QIE Testnet Explorer",
    faucet: "https://www.qie.digital/faucet",
    officialDex: null,
    qieUsdOracle: ZERO,
  },
  mainnet: {
    key: "mainnet",
    id: 1990,
    hexId: "0x7c6",
    name: "QIE Mainnet",
    short: "mainnet",
    nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
    rpcUrls: [
      "https://rpc1mainnet.qie.digital",
      "https://rpc5mainnet.qie.digital",
      "https://rpc2mainnet.qie.digital",
    ],
    explorer: "https://mainnet.qie.digital",
    explorerName: "QIE Explorer",
    officialDex: {
      // Official QIEdex (dex.qie.digital) — UniswapV2-style
      factory: "0xf297CC2e3A711fEeadf54a59a8162b71189E03d7",
      extraFactories: ["0xba33504bD33eF3731Cf8f59F755b289abb88F177"],
      router: "0x2601a070A12749BC2ee095F17D9fbe904505C2dF",
      wqie: "0x0087904D95BEe9E5F24dc8852804b547981A9139",
    },
    qieUsdOracle: "0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17",
  },
};

export function networkById(id: number): NetworkDef | undefined {
  return Object.values(NETWORKS).find((n) => n.id === id);
}

export function networkByKey(key: string): NetworkDef {
  return NETWORKS[key as NetworkKey] ?? NETWORKS.testnet;
}

export const qieTestnet = defineChain({
  id: NETWORKS.testnet.id,
  name: NETWORKS.testnet.name,
  nativeCurrency: NETWORKS.testnet.nativeCurrency,
  rpcUrls: { default: { http: [...NETWORKS.testnet.rpcUrls] } },
  blockExplorers: {
    default: { name: NETWORKS.testnet.explorerName, url: NETWORKS.testnet.explorer },
  },
  testnet: true,
});

export const qieMainnet = defineChain({
  id: NETWORKS.mainnet.id,
  name: NETWORKS.mainnet.name,
  nativeCurrency: NETWORKS.mainnet.nativeCurrency,
  rpcUrls: { default: { http: [...NETWORKS.mainnet.rpcUrls] } },
  blockExplorers: {
    default: { name: NETWORKS.mainnet.explorerName, url: NETWORKS.mainnet.explorer },
  },
});

export const ALL_CHAINS = [qieTestnet, qieMainnet] as const;
