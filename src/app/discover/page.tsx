"use client";

import { useState } from "react";
import { TokenCard } from "@/components/TokenCard";
import { useStats, useTokens } from "@/hooks/useTokens";
import { useOracle } from "@/hooks/useOracle";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/format";
import { explorerAddress, isLaunchpadDeployed, oracleFor, ZERO_ADDRESS } from "@/lib/config";
import { formatOracleAge } from "@/lib/oracle";
import { TOKEN_SORTS, type TokenSort } from "@/lib/types";
import { useNetwork } from "@/components/NetworkProvider";

const tabs = TOKEN_SORTS;

export default function DiscoverPage() {
  const [sort, setSort] = useState<TokenSort>("new");
  const [q, setQ] = useState("");
  const { data: tokens, isLoading } = useTokens(sort, q);
  const { data: stats } = useStats();
  const { data: oracle } = useOracle();
  const { network } = useNetwork();
  const oracleAddr = oracleFor(network);
  const oracleReady = oracleAddr !== ZERO_ADDRESS;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-mono text-2xl tracking-tight">discover</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            launch tokens on a bonding curve. at $25,000 market cap they graduate to the amm. swap is powered by official qie pools.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 font-mono text-[12px] text-muted sm:grid-cols-4">
          <Stat k="tokens" v={String(stats?.tokens ?? 0)} />
          <Stat k="graduated" v={String(stats?.graduated ?? 0)} />
          <Stat k="24h vol" v={formatUsd(stats?.volume24hUsd, { compact: true })} />
          <Stat
            k="qie / usd"
            v={
              oracle
                ? formatUsd(oracle.usd, { subCent: true })
                : stats?.qieUsd
                  ? formatUsd(stats.qieUsd, { subCent: true })
                  : "n/a"
            }
          />
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSort(t)}
              className={cn(
                "rounded-sm px-3 py-1.5 font-mono text-xs",
                sort === t ? "bg-elev-2 text-ink" : "text-muted hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name / ticker / address"
          className="w-full rounded-sm border border-line bg-elev px-3 py-1.5 font-mono text-xs outline-none sm:w-72"
        />
      </div>

      <p className="mb-5 font-mono text-[12px] text-muted">
        {oracleReady ? (
          <>
            usd figures use the on-chain QIE/USD oracle{" "}
            <a href={explorerAddress(network, oracleAddr)} target="_blank" rel="noreferrer" className="text-accent">
              {oracleAddr.slice(0, 8)}…{oracleAddr.slice(-4)}
            </a>
            {oracle ? ` · updated ${formatOracleAge(oracle.ageSec)}` : ""}
          </>
        ) : (
          <>on {network.short}, usd oracle is not live yet. swap still lists official qie pool tokens on mainnet.</>
        )}
        {stats?.oracleError ? ` · ${stats.oracleError}` : ""}
      </p>

      {!isLaunchpadDeployed(network.key) && (
        <div className="mb-5 rounded-sm border border-line bg-elev px-3 py-2 font-mono text-[12px] text-muted">
          launchpad not deployed on {network.short}. swap uses official qie pools on mainnet.
        </div>
      )}

      {isLoading && <div className="font-mono text-xs text-muted">loading…</div>}
      {!isLoading && (!tokens || tokens.length === 0) && (
        <div className="rounded-sm border border-dashed border-line px-6 py-16 text-center font-mono text-sm text-muted">
          no tokens yet. be the first to{" "}
          <a href="/create" className="text-accent underline">
            create
          </a>
          .
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tokens?.map((t) => (
          <TokenCard key={t.address} token={t} />
        ))}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-line bg-elev px-3 py-2">
      <div className="text-faint">{k}</div>
      <div className="text-ink">{v}</div>
    </div>
  );
}
