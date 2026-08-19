"use client";

import { use, useEffect } from "react";
import { useWatchContractEvent } from "wagmi";
import { TokenImage } from "@/components/TokenImage";
import { CopyAddress } from "@/components/CopyAddress";
import { PriceChart } from "@/components/PriceChart";
import { TradePanel } from "@/components/TradePanel";
import { useChart, useToken, useTrades } from "@/hooks/useTokens";
import { formatAmount, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { explorerAddress, explorerTx, PROTOCOL } from "@/lib/config";
import { useNetwork } from "@/components/NetworkProvider";
import { bondingCurveAbi } from "@/lib/abi/launchpad";
import { useQueryClient } from "@tanstack/react-query";
import type { Candle, HolderRecord, TradeRecord } from "@/lib/types";
import Link from "next/link";

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { network } = useNetwork();
  const { data, isLoading, error } = useToken(address);
  const { data: trades } = useTrades(address);
  const { data: chart } = useChart(address);
  const qc = useQueryClient();

  const token = data?.token;
  const holders: HolderRecord[] = data?.holders ?? [];
  const tradeList: TradeRecord[] = trades?.trades ?? [];
  const candles: Candle[] = chart?.candles ?? [];

  const liveCurve = token && !token.graduated ? token.curve : undefined;

  useWatchContractEvent({
    address: liveCurve,
    abi: bondingCurveAbi,
    eventName: "Graduated",
    onLogs: () => {
      qc.invalidateQueries({ queryKey: ["token", address] });
    },
  });

  useWatchContractEvent({
    address: liveCurve,
    abi: bondingCurveAbi,
    eventName: "Trade",
    onLogs: () => {
      qc.invalidateQueries({ queryKey: ["token", address] });
      qc.invalidateQueries({ queryKey: ["trades", address] });
      qc.invalidateQueries({ queryKey: ["chart", address] });
    },
  });

  useEffect(() => {
    document.title = token ? `${token.symbol} · elsewhere` : "elsewhere";
  }, [token]);

  if (isLoading) return <div className="font-mono text-xs text-muted">loading…</div>;
  if (error || !token) {
    return (
      <div className="font-mono text-sm text-muted">
        token not in indexer yet. if you just launched, wait a few seconds or check the address.
      </div>
    );
  }

  const pct = Math.min(100, Math.round(token.progress * 100));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <TokenImage src={token.image} address={token.address} symbol={token.symbol} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-mono text-xl tracking-tight sm:text-2xl">{token.name}</h1>
              <span className="font-mono text-xs uppercase text-muted">${token.symbol}</span>
              {token.graduated ? (
                <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-accent-2">
                  graduated
                </span>
              ) : (
                <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  bonding
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CopyAddress address={token.address} label="ca" />
              <CopyAddress address={token.creator} label="dev" />
              <a
                href={explorerAddress(network, token.address)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-accent"
              >
                explorer
              </a>
              {token.curve && token.curve !== "0x0000000000000000000000000000000000000000" && (
                <a
                  href={explorerAddress(network, token.curve)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-muted"
                >
                  curve
                </a>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-accent">
              {token.twitter && (
                <a href={token.twitter} target="_blank" rel="noreferrer">
                  twitter
                </a>
              )}
              {token.website && (
                <a href={token.website} target="_blank" rel="noreferrer">
                  website
                </a>
              )}
              {token.telegram && (
                <a href={token.telegram} target="_blank" rel="noreferrer">
                  telegram
                </a>
              )}
              <Link href={`/swap?out=${token.address}`} className="text-muted hover:text-ink">
                swap
              </Link>
            </div>
          </div>
        </div>

        {token.description && <p className="max-w-2xl text-sm leading-relaxed text-muted">{token.description}</p>}

        <div>
          {token.graduated ? (
            <div className="rounded-sm border border-line bg-elev px-3 py-2 font-mono text-xs text-accent-2">
              graduated · trading on the AMM ·{" "}
              <Link href={`/swap?out=${token.address}`} className="underline">
                open swap
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-1 flex justify-between font-mono text-[11px] text-muted">
                <span>bonding curve → ${PROTOCOL.graduationMarketCapUsd.toLocaleString()} mcap</span>
                <span>
                  {formatUsd(token.marketCapUsd, { compact: true })} · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-sm bg-elev-2">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
          <Kpi k="price" v={formatUsd(token.priceUsd, { subCent: true })} />
          <Kpi k="market cap" v={formatUsd(token.marketCapUsd, { compact: true })} />
          <Kpi k="24h volume" v={formatUsd(token.volume24hUsd, { compact: true })} />
          <Kpi k="holders" v={String(token.holders ?? holders.length)} />
        </div>

        <PriceChart candles={candles} />

        <section>
          <h2 className="mb-2 font-mono text-xs text-muted">trades</h2>
          <div className="overflow-x-auto rounded-sm border border-line">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="text-faint">
                <tr>
                  <th className="px-3 py-2 font-normal">time</th>
                  <th className="px-3 py-2 font-normal">type</th>
                  <th className="px-3 py-2 font-normal">amount</th>
                  <th className="px-3 py-2 font-normal">trader</th>
                  <th className="px-3 py-2 font-normal">tx</th>
                </tr>
              </thead>
              <tbody>
                {tradeList.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-3 py-2 text-muted">{timeAgo(t.timestamp)}</td>
                    <td className={`px-3 py-2 ${t.isBuy ? "text-up" : "text-down"}`}>
                      {t.isBuy ? "buy" : "sell"}
                    </td>
                    <td className="px-3 py-2">
                      {formatAmount(BigInt(t.tokenAmount))} {token.symbol}
                    </td>
                    <td className="px-3 py-2 text-muted">{shortAddress(t.trader)}</td>
                    <td className="px-3 py-2">
                      <a href={explorerTx(network, t.txHash)} target="_blank" rel="noreferrer" className="text-accent">
                        {shortAddress(t.txHash, 3)}
                      </a>
                    </td>
                  </tr>
                ))}
                {tradeList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted">
                      no trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-mono text-xs text-muted">holders</h2>
          <div className="rounded-sm border border-line">
            {holders.map((h) => (
              <div
                key={h.address}
                className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[11px] last:border-0"
              >
                <CopyAddress address={h.address} />
                <span>
                  {formatAmount(BigInt(h.balance))} · {h.pct.toFixed(2)}%
                </span>
              </div>
            ))}
            {holders.length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-muted">no holders indexed</div>
            )}
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <TradePanel token={token} />
      </div>
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-line bg-elev px-3 py-2">
      <div className="text-faint">{k}</div>
      <div>{v}</div>
    </div>
  );
}
