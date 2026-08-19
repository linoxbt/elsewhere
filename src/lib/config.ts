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

/** Verified QIE testnet 1983 deployments. env overrides when set. */
export const TESTNET_DEFAULTS = {
  wqie: "0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491",
  launchpadFactory: "0xE02F1719Ce46EEbFFE450dB1f367012FaD4b43C2",
  ammFactory: "0xc0E497c064163d455e8AEaD40795401d09Ac4B43",
  ammRouter: "0xC348694650Fd0E2b51197425e4Ad88aEe11b5d48",
  feeRouter: "0x998d51F77199A6a64837a648Ea9dB80F8F44607c",
  qieUsdOracle: "0x7F3635B76790cF57A955E6576504ef17564FE924",
  lendingPool: "0x9fC086D60443362D49E2124D2dAF8c5814113918",
  batchSender: "0x98530560C180f1a0701292eFfA46d08Cc0E2fBE4",
  moneyMarket: "0xbE8B9Ae75BfA7FfDd79C4ae684f9DF18b7e8CBf9",
  elseToken: "0x870505B6e86eA2e5910409751aB1F13186825E93",
  dca: "0xbE743B8c1B2dC68161F49b1a6Cc0Cd53C36BC23a",
} as const satisfies Record<string, `0x${string}`>;

function pub(env: string | undefined, fallback: `0x${string}`): `0x${string}` {
  const v = (env ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return v as `0x${string}`;
  return fallback;
}

export function isZero(addr?: string | null) {
  return !addr || addr.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

/** Launchpad contracts we deploy (testnet first). */
export const launchpadContracts = {
  testnet: {
    wqie: pub(process.env.NEXT_PUBLIC_WQIE, TESTNET_DEFAULTS.wqie),
    launchpadFactory: pub(process.env.NEXT_PUBLIC_LAUNCHPAD_FACTORY, TESTNET_DEFAULTS.launchpadFactory),
    ammFactory: pub(process.env.NEXT_PUBLIC_AMM_FACTORY, TESTNET_DEFAULTS.ammFactory),
    ammRouter: pub(process.env.NEXT_PUBLIC_AMM_ROUTER, TESTNET_DEFAULTS.ammRouter),
    feeRouter: pub(process.env.NEXT_PUBLIC_FEE_ROUTER, TESTNET_DEFAULTS.feeRouter),
    qieUsdOracle: pub(process.env.NEXT_PUBLIC_QIE_USD_ORACLE, TESTNET_DEFAULTS.qieUsdOracle),
    lendingPool: pub(process.env.NEXT_PUBLIC_LENDING_POOL, TESTNET_DEFAULTS.lendingPool),
    batchSender: pub(process.env.NEXT_PUBLIC_BATCH_SENDER, TESTNET_DEFAULTS.batchSender),
    moneyMarket: pub(process.env.NEXT_PUBLIC_MONEY_MARKET, TESTNET_DEFAULTS.moneyMarket),
    elseToken: pub(process.env.NEXT_PUBLIC_ELSE_TOKEN, TESTNET_DEFAULTS.elseToken),
    dca: pub(process.env.NEXT_PUBLIC_DCA, TESTNET_DEFAULTS.dca),
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

/** Always the official mainnet QIE/USD feed. used for the header price. */
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
