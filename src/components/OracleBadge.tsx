"use client";

import { explorerAddress, oracleFor } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { formatOracleAge } from "@/lib/oracle";
import { useOracle } from "@/hooks/useOracle";
import { useNetwork } from "./NetworkProvider";
import { ZERO_ADDRESS } from "@/lib/config";

export function OracleBadge() {
  const { network } = useNetwork();
  const oracleAddr = oracleFor(network);
  const { data, isLoading, isError } = useOracle();
  if (oracleAddr === ZERO_ADDRESS) {
    return (
      <span className="hidden font-mono text-[11px] text-muted lg:inline">
        {network.key === "testnet" ? "testnet" : "oracle pending"}
      </span>
    );
  }
  if (isLoading && !data) {
    return <span className="hidden font-mono text-[11px] text-muted lg:inline">oracle…</span>;
  }
  if (!data || isError) {
    return (
      <a
        href={explorerAddress(network, oracleAddr)}
        target="_blank"
        rel="noreferrer"
        className="hidden font-mono text-[11px] text-down lg:inline"
      >
        oracle stale
      </a>
    );
  }
  return (
    <a
      href={explorerAddress(network, oracleAddr)}
      target="_blank"
      rel="noreferrer"
      className="hidden items-center gap-1.5 font-mono text-[11px] text-muted hover:text-ink lg:flex"
      title={`QIE/USD ${oracleAddr}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-up" />
      <span>qie {formatUsd(data.usd, { subCent: true })}</span>
      <span className="text-faint">{formatOracleAge(data.ageSec)}</span>
    </a>
  );
}
