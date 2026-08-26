"use client";

import { useMemo, useState } from "react";
import { formatUnits, isAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { lendingPoolAbi } from "@/lib/abi/lending";
import { ZERO_ADDRESS, contractsFor } from "@/lib/config";
import { formatAmount, formatUsd, parseAmount } from "@/lib/format";
import { maybeApprove, toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { useNetwork } from "@/components/NetworkProvider";
import { useNetClient, useNetWrite } from "@/hooks/useNetChain";
import { useDisplayOracle } from "@/hooks/useOracle";

function aprPct(wad?: bigint) {
  if (wad === undefined) return "n/a";
  return `${(Number(wad) / 1e16).toFixed(2)}%`;
}

function healthLabel(bps?: bigint) {
  if (bps === undefined) return "n/a";
  if (bps > 1_000_000_000n) return "∞";
  return `${(Number(bps) / 100).toFixed(0)}%`;
}

// Both are read on-chain below (LIQ_THRESHOLD_BPS, COLLATERAL_FACTOR_BPS);
// these are only display fallbacks before those reads resolve.
const FALLBACK_LIQ_THRESHOLD_BPS = 8_000n;
const FALLBACK_COLLATERAL_FACTOR_BPS = 7_000n;

export default function LendPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = useNetClient();
  const { writeContractAsync, isPending } = useNetWrite();
  const { network } = useNetwork();
  const { data: qiePrice } = useDisplayOracle();
  const contracts = contractsFor(network.key);
  const pool = contracts.lendingPool;
  const deployed = pool !== ZERO_ADDRESS;
  const wrong = isConnected && chainId !== network.id;
  const qieUsd = qiePrice?.usd ?? 0;

  const [tab, setTab] = useState<"supply" | "collateral">("supply");
  const [supplyAmount, setSupplyAmount] = useState("");
  const [collateralAddr, setCollateralAddr] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [liqBorrower, setLiqBorrower] = useState("");
  const [liqToken, setLiqToken] = useState("");
  const [liqPay, setLiqPay] = useState("");

  const supplyParsed = useMemo(() => parseAmount(supplyAmount, 18), [supplyAmount]);
  const collateralParsed = useMemo(() => parseAmount(collateralAmount, 18), [collateralAmount]);
  const borrowParsed = useMemo(() => parseAmount(borrowAmount, 18), [borrowAmount]);
  const liqPayParsed = useMemo(() => parseAmount(liqPay, 18), [liqPay]);

  const collateralToken = isAddress(collateralAddr) ? (collateralAddr as `0x${string}`) : undefined;
  const liqBorrowerAddr = isAddress(liqBorrower) ? (liqBorrower as `0x${string}`) : undefined;
  const liqTokenAddr = isAddress(liqToken) ? (liqToken as `0x${string}`) : undefined;

  const snap = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "marketSnapshot",
    chainId: network.id,
    query: { enabled: deployed, refetchInterval: 8_000 },
  });

  const account = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "accountSnapshot",
    args: address ? [address] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!address, refetchInterval: 8_000 },
  });

  const liqThreshold = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "LIQ_THRESHOLD_BPS",
    chainId: network.id,
    query: { enabled: deployed },
  });

  const collateralFactor = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "COLLATERAL_FACTOR_BPS",
    chainId: network.id,
    query: { enabled: deployed },
  });

  const myCollateral = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "collateral",
    args: address && collateralToken ? [address, collateralToken] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!address && !!collateralToken, refetchInterval: 8_000 },
  });

  const collateralTwapReady = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "twapReady",
    args: collateralToken ? [collateralToken] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!collateralToken, refetchInterval: 8_000 },
  });

  const collateralUsd8 = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "tokenUsd8",
    args: collateralToken ? [collateralToken] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!collateralToken && collateralTwapReady.data === true, refetchInterval: 8_000 },
  });

  const liqAccount = useReadContract({
    address: pool,
    abi: lendingPoolAbi,
    functionName: "accountSnapshot",
    args: liqBorrowerAddr ? [liqBorrowerAddr] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!liqBorrowerAddr, refetchInterval: 8_000 },
  });

  const cash = snap.data?.[0] ?? 0n;
  const borrows = snap.data?.[1] ?? 0n;
  const totalSupplied = snap.data?.[2] ?? 0n;
  const utilBps = snap.data?.[3] ?? 0n;
  const supplyApr = snap.data?.[4];
  const borrowApr = snap.data?.[5];

  const supplied = account.data?.[0] ?? 0n;
  const debtQie = account.data?.[1] ?? 0n;
  const collatUsd8 = account.data?.[2] ?? 0n;
  const debtUsd8 = account.data?.[3] ?? 0n;
  const health = account.data?.[4];
  const liqThresholdBps = liqThreshold.data ?? FALLBACK_LIQ_THRESHOLD_BPS;
  const collateralFactorBps = collateralFactor.data ?? FALLBACK_COLLATERAL_FACTOR_BPS;

  const myCollateralAmt = myCollateral.data ?? 0n;
  const collateralReady = collateralTwapReady.data === true;
  const collateralPriceUsd8 = collateralUsd8.data;

  async function refetchAll() {
    void snap.refetch();
    void account.refetch();
    void myCollateral.refetch();
    void collateralTwapReady.refetch();
  }

  async function run(label: string, fn: () => Promise<`0x${string}`>, onDone?: () => void) {
    if (!client) return;
    try {
      const hash = await fn();
      toastPending(hash, network.explorer);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, label, network.explorer);
      onDone?.();
      void refetchAll();
    } catch (e) {
      toastFail(e);
    }
  }

  async function depositCollateral() {
    if (!client || !address || !collateralToken || collateralParsed <= 0n) return;
    try {
      await maybeApprove(collateralToken, pool, collateralParsed, address, client, writeContractAsync);
      await run("collateral posted", () =>
        writeContractAsync({
          address: pool,
          abi: lendingPoolAbi,
          functionName: "depositCollateral",
          args: [collateralToken, collateralParsed],
        }),
      );
      setCollateralAmount("");
    } catch (e) {
      toastFail(e);
    }
  }

  async function liquidate() {
    if (!liqBorrowerAddr || !liqTokenAddr || liqPayParsed <= 0n) return;
    void run(
      "liquidated",
      () =>
        writeContractAsync({
          address: pool,
          abi: lendingPoolAbi,
          functionName: "liquidate",
          args: [liqBorrowerAddr, liqTokenAddr],
          value: liqPayParsed,
        }),
      () => setLiqPay(""),
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-mono text-2xl tracking-tight">lend</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          supply QIE to earn yield. separately, post any launched token as collateral (paired with
          WQIE) and borrow QIE against it. collateral pricing uses a 30-minute time-weighted
          average from that token&apos;s pool, so a brand-new pair needs to season before it can be
          borrowed against.
        </p>
      </div>

      {!deployed && (
        <div className="rounded-sm border border-line bg-elev p-4 font-mono text-[13px] text-muted">
          lending pool is not deployed on {network.name} yet.
        </div>
      )}

      {deployed && (
        <>
          <div className="mb-6 overflow-x-auto rounded-sm border border-line">
            <table className="w-full text-left font-mono text-[13px]">
              <thead className="text-[12px] text-faint">
                <tr>
                  <th className="px-3 py-2 font-normal">market</th>
                  <th className="px-3 py-2 font-normal">cash</th>
                  <th className="px-3 py-2 font-normal">borrowed</th>
                  <th className="px-3 py-2 font-normal">util</th>
                  <th className="px-3 py-2 font-normal">supply apr</th>
                  <th className="px-3 py-2 font-normal">borrow apr</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-3 py-2 text-ink">QIE</td>
                  <td className="px-3 py-2">{formatAmount(cash)}</td>
                  <td className="px-3 py-2">{formatAmount(borrows)}</td>
                  <td className="px-3 py-2">{(Number(utilBps) / 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-up">{aprPct(supplyApr)}</td>
                  <td className="px-3 py-2 text-accent">{aprPct(borrowApr)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-3 h-1.5 overflow-hidden rounded-sm bg-elev-2">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, Number(utilBps) / 100)}%` }} />
          </div>
          <p className="mb-6 font-mono text-[12px] text-faint">
            total supplied {formatAmount(totalSupplied)} QIE
          </p>

          {isConnected && (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="your supply"
                value={`${formatAmount(supplied)} QIE`}
                sub={formatUsd(Number(formatUnits(supplied, 18)) * qieUsd)}
              />
              <Stat label="your debt" value={`${formatAmount(debtQie)} QIE`} sub={formatUsd(Number(debtUsd8) / 1e8)} />
              <Stat
                label="health"
                value={healthLabel(health)}
                sub={
                  debtQie === 0n
                    ? "no debt"
                    : Number(health ?? 0n) < Number(liqThresholdBps)
                      ? "liquidatable"
                      : "ok"
                }
              />
              <Stat label="collateral value" value={formatUsd(Number(collatUsd8) / 1e8)} sub="all posted tokens" />
            </div>
          )}

          <div className="mb-6 flex gap-1">
            {(["supply", "collateral"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-sm px-3 py-1.5 font-mono text-xs ${
                  tab === t ? "bg-elev-2 text-ink" : "text-muted"
                }`}
              >
                {t === "supply" ? "supply QIE" : "collateral & borrow"}
              </button>
            ))}
          </div>

          {tab === "supply" ? (
            <div className="max-w-lg rounded-sm border border-line bg-elev p-4">
              <input
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
                placeholder="QIE amount"
                className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[14px]"
              />
              {!isConnected ? (
                <p className="font-mono text-[13px] text-muted">connect a wallet first</p>
              ) : wrong ? (
                <AddChainButton />
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending || supplyParsed <= 0n}
                    onClick={() =>
                      void run(
                        "supplied",
                        () =>
                          writeContractAsync({
                            address: pool,
                            abi: lendingPoolAbi,
                            functionName: "supply",
                            value: supplyParsed,
                          }),
                        () => setSupplyAmount(""),
                      )
                    }
                    className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[13px] disabled:opacity-40"
                  >
                    supply
                  </button>
                  <button
                    type="button"
                    disabled={isPending || supplyParsed <= 0n}
                    onClick={() =>
                      void run(
                        "withdrawn",
                        () =>
                          writeContractAsync({
                            address: pool,
                            abi: lendingPoolAbi,
                            functionName: "withdraw",
                            args: [supplyParsed],
                          }),
                        () => setSupplyAmount(""),
                      )
                    }
                    className="flex-1 rounded-sm border border-line py-2 font-mono text-[13px] disabled:opacity-40"
                  >
                    withdraw
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-lg space-y-4">
              <div className="rounded-sm border border-line bg-elev p-4">
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-faint">
                  collateral token address
                </label>
                <input
                  value={collateralAddr}
                  onChange={(e) => setCollateralAddr(e.target.value)}
                  placeholder="0x… (any launched token paired with WQIE)"
                  className="mb-2 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
                />
                {collateralAddr && !collateralToken && (
                  <p className="mb-2 font-mono text-[12px] text-down">not a valid address</p>
                )}
                {collateralToken && (
                  <p className="mb-3 font-mono text-[12px] text-faint">
                    posted {formatAmount(myCollateralAmt)} ·{" "}
                    {collateralReady
                      ? collateralPriceUsd8 !== undefined
                        ? `≈ ${formatUsd((Number(myCollateralAmt) / 1e18) * (Number(collateralPriceUsd8) / 1e8))}`
                        : "reading price…"
                      : "price still seasoning (needs ~30min of TWAP history since first deposit)"}
                  </p>
                )}

                <input
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  placeholder="collateral amount"
                  className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[14px]"
                />

                {!isConnected ? (
                  <p className="font-mono text-[13px] text-muted">connect a wallet first</p>
                ) : wrong ? (
                  <AddChainButton />
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending || !collateralToken || collateralParsed <= 0n}
                      onClick={() => void depositCollateral()}
                      className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[13px] disabled:opacity-40"
                    >
                      post collateral
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !collateralToken || collateralParsed <= 0n}
                      onClick={() =>
                        void run(
                          "collateral withdrawn",
                          () =>
                            writeContractAsync({
                              address: pool,
                              abi: lendingPoolAbi,
                              functionName: "withdrawCollateral",
                              args: [collateralToken, collateralParsed],
                            }),
                          () => setCollateralAmount(""),
                        )
                      }
                      className="flex-1 rounded-sm border border-line py-2 font-mono text-[13px] disabled:opacity-40"
                    >
                      withdraw
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-sm border border-line bg-elev p-4">
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-faint">
                  borrow / repay QIE
                </label>
                <input
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  placeholder="QIE amount"
                  className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[14px]"
                />
                {!isConnected ? (
                  <p className="font-mono text-[13px] text-muted">connect a wallet first</p>
                ) : wrong ? (
                  <AddChainButton />
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending || borrowParsed <= 0n}
                      onClick={() =>
                        void run(
                          "borrowed",
                          () =>
                            writeContractAsync({
                              address: pool,
                              abi: lendingPoolAbi,
                              functionName: "borrow",
                              args: [borrowParsed],
                            }),
                          () => setBorrowAmount(""),
                        )
                      }
                      className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[13px] disabled:opacity-40"
                    >
                      borrow
                    </button>
                    <button
                      type="button"
                      disabled={isPending || borrowParsed <= 0n}
                      onClick={() =>
                        void run(
                          "repaid",
                          () =>
                            writeContractAsync({
                              address: pool,
                              abi: lendingPoolAbi,
                              functionName: "repay",
                              value: borrowParsed,
                            }),
                          () => setBorrowAmount(""),
                        )
                      }
                      className="flex-1 rounded-sm border border-line py-2 font-mono text-[13px] disabled:opacity-40"
                    >
                      repay
                    </button>
                  </div>
                )}
                <p className="mt-3 font-mono text-[12px] text-muted">
                  borrows are limited to {(Number(collateralFactorBps) / 100).toFixed(0)}% collateral factor and
                  become liquidatable at {(Number(liqThresholdBps) / 100).toFixed(0)}% health.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 max-w-lg rounded-sm border border-line bg-elev p-4">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-widest text-faint">liquidate</p>
            <p className="mb-3 font-mono text-[12px] text-muted">
              anyone can liquidate an unhealthy position for an 8% collateral bonus. paste a
              borrower and the collateral token to seize, then repay part of their QIE debt.
            </p>
            <input
              value={liqBorrower}
              onChange={(e) => setLiqBorrower(e.target.value)}
              placeholder="borrower address"
              className="mb-2 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
            />
            <input
              value={liqToken}
              onChange={(e) => setLiqToken(e.target.value)}
              placeholder="collateral token address to seize"
              className="mb-2 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
            />
            {liqBorrowerAddr && liqAccount.data && (
              <p className="mb-2 font-mono text-[12px] text-faint">
                borrower health: {healthLabel(liqAccount.data[4])}{" "}
                {Number(liqAccount.data[4] ?? 0n) < Number(liqThresholdBps) ? "(liquidatable)" : "(healthy)"}
              </p>
            )}
            <input
              value={liqPay}
              onChange={(e) => setLiqPay(e.target.value)}
              placeholder="QIE to repay on their behalf"
              className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
            />
            {!isConnected ? (
              <p className="font-mono text-[13px] text-muted">connect a wallet first</p>
            ) : wrong ? (
              <AddChainButton />
            ) : (
              <button
                type="button"
                disabled={isPending || !liqBorrowerAddr || !liqTokenAddr || liqPayParsed <= 0n}
                onClick={() => void liquidate()}
                className="w-full rounded-sm border border-line py-2 font-mono text-[13px] disabled:opacity-40"
              >
                liquidate
              </button>
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
      <p className="font-mono text-[11px] uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-1 font-mono text-[14px] text-ink">{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[11px] text-faint">{sub}</p>}
    </div>
  );
}
