"use client";

import { explorerAddress, displayOracle } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { formatOracleAge } from "@/lib/oracle";
import { useDisplayOracle } from "@/hooks/useOracle";
import { NETWORKS } from "@/lib/networks";

export function OracleBadge() {
  const oracleAddr = displayOracle();
  const { data, isLoading, isError } = useDisplayOracle();
  const mainnet = NETWORKS.mainnet;

  if (isLoading && !data) {
    return <span className="hidden font-mono text-[12px] text-muted lg:inline">qie …</span>;
  }
  if (!data || isError) {
    return (
      <a
        href={explorerAddress(mainnet, oracleAddr)}
        target="_blank"
        rel="noreferrer"
        className="hidden font-mono text-[12px] text-down lg:inline"
      >
        oracle stale
      </a>
    );
  }
  return (
    <a
      href={explorerAddress(mainnet, oracleAddr)}
      target="_blank"
      rel="noreferrer"
      className="hidden items-center gap-1.5 font-mono text-[12px] text-muted hover:text-ink lg:flex"
      title={`official QIE/USD · ${oracleAddr}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-up" />
      <span>qie {formatUsd(data.usd, { subCent: true })}</span>
      <span className="text-faint">{formatOracleAge(data.ageSec)}</span>
    </a>
  );
}
