import { formatUnits, parseUnits } from "viem";

export function shortAddress(addr?: string, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function formatAmount(
  value: bigint | string | number | undefined,
  decimals = 18,
  maxFrac = 4,
): string {
  if (value === undefined || value === null) return "0";
  const n =
    typeof value === "bigint"
      ? Number(formatUnits(value, decimals))
      : typeof value === "string"
        ? Number(value)
        : value;
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  if (abs >= 1) return trimZeros(n.toFixed(Math.min(maxFrac, 4)));
  if (abs >= 0.0001) return trimZeros(n.toFixed(6));
  return n.toExponential(2);
}

export function formatUsd(
  value: number | undefined,
  opts?: { subCent?: boolean; compact?: boolean },
) {
  if (value === undefined || !Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (opts?.compact) {
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}k`;
  }
  if (opts?.subCent || abs < 0.01) {
    if (abs === 0) return "$0.00";
    if (abs < 0.0001) return `$${value.toExponential(2)}`;
    return `$${trimZeros(value.toFixed(6))}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsdPrecise(value: number | undefined) {
  return formatUsd(value, { subCent: true });
}

export function parseAmount(input: string, decimals = 18): bigint {
  const cleaned = input.trim();
  if (!cleaned || cleaned === ".") return 0n;
  try {
    return parseUnits(cleaned, decimals);
  } catch {
    return 0n;
  }
}

export function fromWei(value: bigint | undefined, decimals = 18): number {
  if (value === undefined) return 0;
  return Number(formatUnits(value, decimals));
}

function trimZeros(s: string) {
  return s.replace(/\.?0+$/, "");
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
