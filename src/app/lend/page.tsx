"use client";

import { useMemo, useState } from "react";
import { formatUnits, maxUint256 } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi } from "@/lib/abi/launchpad";
import { moneyMarketAbi } from "@/lib/abi/lending";
import { ZERO_ADDRESS, contractsFor } from "@/lib/config";
import { formatAmount, formatUsd, parseAmount } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { useNetwork } from "@/components/NetworkProvider";
import { useDisplayOracle } from "@/hooks/useOracle";

function aprPct(wad?: bigint) {
  if (wad === undefined) return "—";
  return `${(Number(wad) / 1e16).toFixed(2)}%`;
}

function healthLabel(bps?: bigint) {
  if (bps === undefined) return "—";
  if (bps > 1_000_000_000n) return "∞";
  return `${(Number(bps) / 100).toFixed(0)}%`;
}

export default function LendPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { network } = useNetwork();
  const { data: qiePrice } = useDisplayOracle();
  const contracts = contractsFor(network.key);
  const market = contracts.moneyMarket;
  const elseToken = contracts.elseToken;
  const deployed = market !== ZERO_ADDRESS && elseToken !== ZERO_ADDRESS;
  const wrong = isConnected && chainId !== network.id;

  const [tab, setTab] = useState<"supply" | "borrow">("supply");
  const [amount, setAmount] = useState("");
  const parsed = useMemo(() => parseAmount(amount, 18), [amount]);
  const qieUsd = qiePrice?.usd ?? 0;

  const snap = useReadContract({
    address: market,
    abi: moneyMarketAbi,
    functionName: "marketSnapshot",
    args: [elseToken],
    chainId: network.id,
    query: { enabled: deployed, refetchInterval: 8_000 },
  });

  const qieApr = useReadContract({
    address: market,
    abi: moneyMarketAbi,
    functionName: "qieSupplyRateWad",
    chainId: network.id,
    query: { enabled: deployed, refetchInterval: 8_000 },
  });

  const account = useReadContract({
    address: market,
    abi: moneyMarketAbi,
    functionName: "accountSnapshot",
    args: address ? [address] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!address, refetchInterval: 8_000 },
  });

  const elseDebt = useReadContract({
    address: market,
    abi: moneyMarketAbi,
    functionName: "borrowBalance",
    args: address ? [address, elseToken] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!address, refetchInterval: 8_000 },
  });

  const listed = snap.data?.[0];
  const cash = snap.data?.[1] ?? 0n;
  const borrows = snap.data?.[2] ?? 0n;
  const utilBps = snap.data?.[3] ?? 0n;
  const borrowApr = snap.data?.[4];
  const elseSupplyApr = snap.data?.[5];
  const priceQie = snap.data?.[6] ?? 0n;
  const supplied = account.data?.[0] ?? 0n;
  const debtQie = account.data?.[1] ?? 0n;
  const health = account.data?.[2];
  const borrowedElse = elseDebt.data ?? 0n;

  const maxBorrowElse =
    priceQie > 0n ? ((supplied * 7000n) / 10_000n * 10n ** 18n) / priceQie : 0n;

  async function run(label: string, fn: () => Promise<`0x${string}`>) {
    try {
      const hash = await fn();
      toastPending(hash, network.explorer);
      toastSuccess(hash, label, network.explorer);
      setAmount("");
      void snap.refetch();
      void account.refetch();
      void elseDebt.refetch();
      void qieApr.refetch();
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-mono text-2xl tracking-tight">lend</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          supply QIE. that deposit is your collateral. then borrow ELSE. APR is live on-chain
          and rises with utilization (5% base, steeper after 80% used).
        </p>
      </div>

      {!deployed && (
        <div className="rounded-sm border border-line bg-elev p-4 font-mono text-[12px] text-muted">
          money market is not deployed on {network.name} yet.
        </div>
      )}

      {deployed && (
        <>
          <div className="mb-6 overflow-x-auto rounded-sm border border-line">
            <table className="w-full text-left font-mono text-[12px]">
              <thead className="text-[11px] text-faint">
                <tr>
                  <th className="px-3 py-2 font-normal">market</th>
                  <th className="px-3 py-2 font-normal">available</th>
                  <th className="px-3 py-2 font-normal">borrowed</th>
                  <th className="px-3 py-2 font-normal">util</th>
                  <th className="px-3 py-2 font-normal">supply apr</th>
                  <th className="px-3 py-2 font-normal">borrow apr</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-3 py-2 text-ink">QIE</td>
                  <td className="px-3 py-2">{formatAmount(supplied)} yours</td>
                  <td className="px-3 py-2">{formatAmount(debtQie)} debt</td>
                  <td className="px-3 py-2">collateral</td>
                  <td className="px-3 py-2 text-up">{aprPct(qieApr.data)}</td>
                  <td className="px-3 py-2 text-faint">—</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="px-3 py-2 text-ink">ELSE</td>
                  <td className="px-3 py-2">{formatAmount(cash)}</td>
                  <td className="px-3 py-2">{formatAmount(borrows)}</td>
                  <td className="px-3 py-2">{(Number(utilBps) / 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{aprPct(elseSupplyApr)}</td>
                  <td className="px-3 py-2 text-accent">{aprPct(borrowApr)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-3 h-1.5 overflow-hidden rounded-sm bg-elev-2">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, Number(utilBps) / 100)}%` }} />
          </div>
          <p className="mb-6 font-mono text-[11px] text-faint">
            ELSE utilization { (Number(utilBps) / 100).toFixed(1) }% · price {formatAmount(priceQie)} QIE
            each · listed {listed ? "yes" : "no"}
          </p>

          {isConnected && (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="your QIE" value={`${formatAmount(supplied)} QIE`} sub={formatUsd(Number(formatUnits(supplied, 18)) * qieUsd)} />
              <Stat label="ELSE debt" value={`${formatAmount(borrowedElse)} ELSE`} />
              <Stat label="health" value={healthLabel(health)} sub={borrowedElse === 0n ? "no debt" : Number(health ?? 0n) < 8000 ? "near liq" : "ok"} />
              <Stat label="max ELSE" value={formatAmount(maxBorrowElse)} sub="70% LTV" />
            </div>
          )}

          <div className="max-w-lg rounded-sm border border-line bg-elev p-4">
            <div className="mb-4 flex gap-1">
              {(["supply", "borrow"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-sm px-3 py-1.5 font-mono text-xs ${
                    tab === t ? "bg-elev-2 text-ink" : "text-muted"
                  }`}
                >
                  {t === "supply" ? "supply QIE" : "borrow ELSE"}
                </button>
              ))}
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={tab === "supply" ? "QIE amount" : "ELSE amount"}
              className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
            />

            {!isConnected ? (
              <p className="font-mono text-[12px] text-muted">connect a wallet first</p>
            ) : wrong ? (
              <AddChainButton />
            ) : tab === "supply" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending || parsed <= 0n}
                  onClick={() =>
                    void run("supplied", () =>
                      writeContractAsync({
                        address: market,
                        abi: moneyMarketAbi,
                        functionName: "supply",
                        value: parsed,
                      }),
                    )
                  }
                  className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[12px] disabled:opacity-40"
                >
                  supply QIE
                </button>
                <button
                  type="button"
                  disabled={isPending || parsed <= 0n}
                  onClick={() =>
                    void run("withdrawn", () =>
                      writeContractAsync({
                        address: market,
                        abi: moneyMarketAbi,
                        functionName: "withdraw",
                        args: [parsed],
                      }),
                    )
                  }
                  className="flex-1 rounded-sm border border-line py-2 font-mono text-[12px] disabled:opacity-40"
                >
                  withdraw
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending || parsed <= 0n || supplied === 0n}
                  onClick={() =>
                    void run("borrowed ELSE", () =>
                      writeContractAsync({
                        address: market,
                        abi: moneyMarketAbi,
                        functionName: "borrow",
                        args: [elseToken, parsed],
                      }),
                    )
                  }
                  className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[12px] disabled:opacity-40"
                >
                  borrow ELSE
                </button>
                <button
                  type="button"
                  disabled={isPending || parsed <= 0n || !client || !address}
                  onClick={() =>
                    void (async () => {
                      if (!client || !address) return;
                      const allowance = await client.readContract({
                        address: elseToken,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, market],
                      });
                      if (allowance < parsed) {
                        const hash = await writeContractAsync({
                          address: elseToken,
                          abi: erc20Abi,
                          functionName: "approve",
                          args: [market, maxUint256],
                        });
                        toastPending(hash, network.explorer);
                      }
                      await run("repaid ELSE", () =>
                        writeContractAsync({
                          address: market,
                          abi: moneyMarketAbi,
                          functionName: "repay",
                          args: [elseToken, parsed],
                        }),
                      );
                    })()
                  }
                  className="flex-1 rounded-sm border border-line py-2 font-mono text-[12px] disabled:opacity-40"
                >
                  repay ELSE
                </button>
              </div>
            )}
            {tab === "borrow" && supplied === 0n && (
              <p className="mt-3 font-mono text-[11px] text-muted">supply QIE first — that is the collateral for ELSE.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border border-line bg-elev p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-1 font-mono text-[13px] text-ink">{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-faint">{sub}</p>}
    </div>
  );
}
