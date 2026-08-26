export type TokenRecord = {
  address: `0x${string}`;
  curve: `0x${string}`;
  creator: `0x${string}`;
  pair: `0x${string}` | null;
  name: string;
  symbol: string;
  description: string;
  image: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  metadataURI: string;
  createdAt: number;
  graduated: boolean;
  marketCapUsd: number;
  volume24hUsd: number;
  priceUsd: number;
  priceQie: number;
  holders: number;
  progress: number;
  quoteReserve: string;
  tokenReserve: string;
};

export const TOKEN_SORTS = ["new", "market cap", "volume", "graduated"] as const;
export type TokenSort = (typeof TOKEN_SORTS)[number];

export type TradeRecord = {
  id: string;
  token: `0x${string}`;
  trader: `0x${string}`;
  isBuy: boolean;
  quoteAmount: string;
  tokenAmount: string;
  priceUsd: number;
  /** Live QIE/USD rate at trade time — used to convert quote-asset volume to USD directly. */
  qieUsd: number;
  marketCapUsd: number;
  txHash: `0x${string}`;
  timestamp: number;
  source: "curve" | "amm";
};

export type HolderRecord = {
  address: `0x${string}`;
  balance: string;
  pct: number;
};

export type PoolRecord = {
  address: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  symbol0: string;
  symbol1: string;
  name0: string;
  name1: string;
  image0?: string;
  image1?: string;
  reserve0: string;
  reserve1: string;
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  apr: number;
  createdAt: number;
};

export type PositionRecord = {
  pair: `0x${string}`;
  liquidity: string;
  share: number;
  amount0: string;
  amount1: string;
  token0: `0x${string}`;
  token1: `0x${string}`;
  symbol0: string;
  symbol1: string;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TokenMeta = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
  isNative?: boolean;
};
