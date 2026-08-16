/**
 * Protocol parameters + per-network contract addresses.
 * UI network is selected in NetworkProvider; these env vars are testnet
 * launchpad deployments (mainnet launchpad stays unset until promoted).
 */

import { NETWORKS, type NetworkDef, type NetworkKey } from "./networks";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const BRAND = {
  name: "elsewhere",
  legal: "Elsewhere",
} as const;

export const PROTOCOL = {
  graduationMarketCapUsd: 25_000,
  creationFeeUsd: 2.5,
  bondingCreatorFeeBps: 425,
  bondingProtocolFeeBps: 575,
  bondingFeeDenom: 100_000,
  ammCreatorFeeBps: 400,
  ammProtocolFeeBps: 50,
  ammLpFeeBps: 30,
  ammFeeDenom: 100_000,
  totalSupply: 1_000_000_000,
  virtualQuoteQie: 2584,
} as const;

export const MAINNET_QIE_USD_ORACLE = NETWORKS.mainnet.qieUsdOracle;

/** Launchpad contracts we deploy (testnet first). */
export const launchpadContracts = {
  testnet: {
    wqie: (process.env.NEXT_PUBLIC_WQIE ?? ZERO_ADDRESS) as `0x${string}`,
    launchpadFactory: (process.env.NEXT_PUBLIC_LAUNCHPAD_FACTORY ??
      ZERO_ADDRESS) as `0x${string}`,
    ammFactory: (process.env.NEXT_PUBLIC_AMM_FACTORY ?? ZERO_ADDRESS) as `0x${string}`,
    ammRouter: (process.env.NEXT_PUBLIC_AMM_ROUTER ?? ZERO_ADDRESS) as `0x${string}`,
    feeRouter: (process.env.NEXT_PUBLIC_FEE_ROUTER ?? ZERO_ADDRESS) as `0x${string}`,
    qieUsdOracle: (process.env.NEXT_PUBLIC_QIE_USD_ORACLE ?? ZERO_ADDRESS) as `0x${string}`,
    lendingPool: (process.env.NEXT_PUBLIC_LENDING_POOL ?? ZERO_ADDRESS) as `0x${string}`,
    batchSender: (process.env.NEXT_PUBLIC_BATCH_SENDER ?? ZERO_ADDRESS) as `0x${string}`,
    moneyMarket: (process.env.NEXT_PUBLIC_MONEY_MARKET ?? ZERO_ADDRESS) as `0x${string}`,
    elseToken: (process.env.NEXT_PUBLIC_ELSE_TOKEN ?? ZERO_ADDRESS) as `0x${string}`,
    dca: (process.env.NEXT_PUBLIC_DCA ?? ZERO_ADDRESS) as `0x${string}`,
  },
  mainnet: {
    wqie: (process.env.NEXT_PUBLIC_MAINNET_WQIE ?? ZERO_ADDRESS) as `0x${string}`,
    launchpadFactory: (process.env.NEXT_PUBLIC_MAINNET_LAUNCHPAD_FACTORY ??
      ZERO_ADDRESS) as `0x${string}`,
    ammFactory: (process.env.NEXT_PUBLIC_MAINNET_AMM_FACTORY ?? ZERO_ADDRESS) as `0x${string}`,
    ammRouter: (process.env.NEXT_PUBLIC_MAINNET_AMM_ROUTER ?? ZERO_ADDRESS) as `0x${string}`,
    feeRouter: (process.env.NEXT_PUBLIC_MAINNET_FEE_ROUTER ?? ZERO_ADDRESS) as `0x${string}`,
    qieUsdOracle: NETWORKS.mainnet.qieUsdOracle,
    lendingPool: (process.env.NEXT_PUBLIC_MAINNET_LENDING_POOL ?? ZERO_ADDRESS) as `0x${string}`,
    batchSender: (process.env.NEXT_PUBLIC_MAINNET_BATCH_SENDER ?? ZERO_ADDRESS) as `0x${string}`,
    moneyMarket: (process.env.NEXT_PUBLIC_MAINNET_MONEY_MARKET ?? ZERO_ADDRESS) as `0x${string}`,
    elseToken: (process.env.NEXT_PUBLIC_MAINNET_ELSE_TOKEN ?? ZERO_ADDRESS) as `0x${string}`,
    dca: (process.env.NEXT_PUBLIC_MAINNET_DCA ?? ZERO_ADDRESS) as `0x${string}`,
  },
} as const;

export function contractsFor(key: NetworkKey) {
  return launchpadContracts[key];
}

export function isLaunchpadDeployed(key: NetworkKey) {
  return launchpadContracts[key].launchpadFactory !== ZERO_ADDRESS;
}

/** On-chain protocol feed (testnet is a local AggregatorV3 used for fees). */
export function oracleFor(net: NetworkDef): `0x${string}` {
  if (net.key === "mainnet") return net.qieUsdOracle;
  return launchpadContracts.testnet.qieUsdOracle;
}

/** Always the official mainnet QIE/USD feed — used for the header price. */
export function displayOracle(): `0x${string}` {
  return NETWORKS.mainnet.qieUsdOracle;
}

export function explorerTx(net: NetworkDef, hash: string) {
  return `${net.explorer}/tx/${hash}`;
}

export function explorerAddress(net: NetworkDef, addr: string) {
  return `${net.explorer}/address/${addr}`;
}

export function addChainParams(net: NetworkDef) {
  return {
    chainId: net.hexId,
    chainName: net.name,
    nativeCurrency: net.nativeCurrency,
    rpcUrls: [...net.rpcUrls],
    blockExplorerUrls: [net.explorer],
  };
}

export const NATIVE_QIE = {
  address: ZERO_ADDRESS,
  symbol: "QIE",
  name: "QIE",
  decimals: 18,
  isNative: true,
} as const;

/** Back-compat aliases used by leftover server code until fully migrated. */
export const qie = NETWORKS.testnet;
export const QIE_USD_ORACLE = launchpadContracts.testnet.qieUsdOracle;
export const contracts = launchpadContracts.testnet;
export const isProtocolDeployed = isLaunchpadDeployed("testnet");
export const isOracleDeployed = QIE_USD_ORACLE !== ZERO_ADDRESS;
export const isTestnet = true;
export const WQIE_TOKEN = {
  address: contracts.wqie,
  symbol: "WQIE",
  name: "Wrapped QIE",
  decimals: 18,
  isNative: false,
} as const;
