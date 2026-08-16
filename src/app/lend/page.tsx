"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress, maxUint256 } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi } from "@/lib/abi/launchpad";
import { lendingPoolAbi } from "@/lib/abi/lending";
import { ZERO_ADDRESS, contractsFor } from "@/lib/config";
import { formatAmount, formatUsd, parseAmount, shortAddress } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { TokenImage } from "@/components/TokenImage";
import { useNetwork } from "@/components/NetworkProvider";
import { useTokenCache } from "@/components/TokenCache";
import { useDisplayOracle } from "@/hooks/useOracle";
import type { TokenMeta } from "@/lib/types";

function aprPct(wad?: bigint) {
  if (!wad) return "0%";
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
  const { get, put } = useTokenCache();
  const { data: qiePrice } = useDisplayOracle();
  const contracts = contractsFor(network.key);
  const pool = contracts.lendingPool;
  const deployed = pool !== ZERO_ADDRESS;
  const wrong = isConnected && chainId !== network.id;

  const [tab, setTab] = useState<"supply" | "borrow" | "collateral">("supply");
  const [amount, setAmount] = useState("");
  const [collatToken, setCollatToken] = useState("");
  const [catalog, setCatalog] = useState<TokenMeta[]>([]);

  const market = useReadContract({
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/official-tokens?chainId=${network.id}`);
      const json = await res.json();
      if (cancelled) return;
      const tokens = ((json.tokens ?? []) as TokenMeta[]).filter((t) => !t.isNative);
      setCatalog(tokens);
      tokens.forEach((t) => put(t));
    })();
    return () => {
      cancelled = true;
    };
  }, [network.id, put]);

  const snap = market.data;
  const acc = account.data;
  const supplied = acc?.[0] ?? 0n;
  const borrowed = acc?.[1] ?? 0n;
  const collatUsd8 = acc?.[2] ?? 0n;
  const health = acc?.[4] ?? 0n;
  const collatTokens = acc?.[5] ?? [];
  const cash = snap?.[0] ?? 0n;
  const totalBorrow = snap?.[1] ?? 0n;
  const totalSupply = snap?.[2] ?? 0n;
  const utilBps = snap?.[3] ?? 0n;
  const supplyApr = snap?.[4];
  const borrowApr = snap?.[5];
  const qieUsd = qiePrice?.usd ?? 0;

  const parsed = useMemo(() => parseAmount(amount, 18), [amount]);

  async function run(label: string, fn: () => Promise<`0x${string}`>) {
    try {
      const hash = await fn();
      toastPending(hash, network.explorer);
      toastSuccess(hash, label, network.explorer);
      setAmount("");
      void market.refetch();
      void account.refetch();
    } catch (e) {
      toastFail(e);
    }
  }

  async function onSupply() {
    if (parsed <= 0n) return;
    await run("supplied", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "supply",
        value: parsed,
      }),
    );
  }

  async function onWithdraw() {
    if (parsed <= 0n) return;
    await run("withdrawn", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "withdraw",
        args: [parsed],
      }),
    );
  }

  async function onBorrow() {
    if (parsed <= 0n) return;
    await run("borrowed", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "borrow",
        args: [parsed],
      }),
    );
  }

  async function onRepay() {
    if (parsed <= 0n) return;
    await run("repaid", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "repay",
        value: parsed,
      }),
    );
  }

  async function onDepositCollateral() {
    if (!address || !client || !isAddress(collatToken) || parsed <= 0n) return;
    const token = collatToken as `0x${string}`;
    const allowance = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, pool],
    });
    if (allowance < parsed) {
      const hash = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [pool, maxUint256],
      });
      toastPending(hash, network.explorer);
    }
    await run("collateral posted", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "depositCollateral",
        args: [token, parsed],
      }),
    );
  }

  async function onWithdrawCollateral() {
    if (!isAddress(collatToken) || parsed <= 0n) return;
    await run("collateral pulled", () =>
      writeContractAsync({
        address: pool,
        abi: lendingPoolAbi,
        functionName: "withdrawCollateral",
        args: [collatToken as `0x${string}`, parsed],
      }),
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-mono text-2xl tracking-tight">lend</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          supply QIE to earn interest. post an ERC-20 that has a WQIE pool as collateral, then borrow
          QIE at 70% LTV. prices use the official QIE/USD oracle.
        </p>
      </div>

      {!deployed && (
        <div className="rounded-sm border border-line bg-elev p-4 font-mono text-[12px] text-muted">
          lending pool is not deployed on {network.name} yet.
        </div>
      )}

      {deployed && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="supplied" value={`${formatAmount(totalSupply)} QIE`} sub={formatUsd(Number(formatUnits(totalSupply, 18)) * qieUsd, { compact: true })} />
            <Stat label="borrowed" value={`${formatAmount(totalBorrow)} QIE`} sub={`${Number(utilBps) / 100}% util`} />
            <Stat label="cash" value={`${formatAmount(cash)} QIE`} sub="available" />
            <Stat label="apr" value={`${aprPct(supplyApr)} / ${aprPct(borrowApr)}`} sub="supply / borrow" />
          </div>

          {isConnected && (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="your supply" value={`${formatAmount(supplied)} QIE`} />
              <Stat label="your debt" value={`${formatAmount(borrowed)} QIE`} />
              <Stat label="collateral" value={formatUsd(Number(collatUsd8) / 1e8)} />
              <Stat
                label="health"
                value={healthLabel(health)}
                sub={borrowed === 0n ? "no debt" : Number(health) < 8000 ? "near liquidation" : "ok"}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="rounded-sm border border-line bg-elev p-4">
              <div className="mb-4 flex gap-1">
                {(["supply", "borrow", "collateral"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-sm px-3 py-1.5 font-mono text-xs ${
                      tab === t ? "bg-elev-2 text-ink" : "text-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tab === "collateral" && (
                <div className="mb-3 space-y-2">
                  <input
                    value={collatToken}
                    onChange={(e) => setCollatToken(e.target.value)}
                    placeholder="collateral token address"
                    className="w-full rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[12px]"
                  />
                  {catalog.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {catalog.slice(0, 8).map((t) => (
                        <button
                          key={t.address}
                          type="button"
                          onClick={() => setCollatToken(t.address)}
                          className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] ${
                            collatToken.toLowerCase() === t.address.toLowerCase()
                              ? "border-line-strong bg-elev-2"
                              : "border-line text-muted"
                          }`}
                        >
                          <TokenImage address={t.address} symbol={t.symbol} src={t.image} size={12} />
                          {t.symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tab === "collateral" ? "token amount" : "QIE amount"}
                className="mb-3 w-full rounded-sm border border-line bg-bg px-2 py-2 font-mono text-[13px]"
              />

              {!isConnected ? (
                <p className="font-mono text-[12px] text-muted">connect a wallet first</p>
              ) : wrong ? (
                <AddChainButton />
              ) : tab === "supply" ? (
                <div className="flex gap-2">
                  <button type="button" disabled={isPending || parsed <= 0n} onClick={() => void onSupply()} className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[12px] disabled:opacity-40">
                    supply QIE
                  </button>
                  <button type="button" disabled={isPending || parsed <= 0n} onClick={() => void onWithdraw()} className="flex-1 rounded-sm border border-line py-2 font-mono text-[12px] disabled:opacity-40">
                    withdraw
                  </button>
                </div>
              ) : tab === "borrow" ? (
                <div className="flex gap-2">
                  <button type="button" disabled={isPending || parsed <= 0n} onClick={() => void onBorrow()} className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[12px] disabled:opacity-40">
                    borrow QIE
                  </button>
                  <button type="button" disabled={isPending || parsed <= 0n} onClick={() => void onRepay()} className="flex-1 rounded-sm border border-line py-2 font-mono text-[12px] disabled:opacity-40">
                    repay
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" disabled={isPending || parsed <= 0n || !isAddress(collatToken)} onClick={() => void onDepositCollateral()} className="flex-1 rounded-sm border border-line bg-elev-2 py-2 font-mono text-[12px] disabled:opacity-40">
                    deposit
                  </button>
                  <button type="button" disabled={isPending || parsed <= 0n || !isAddress(collatToken)} onClick={() => void onWithdrawCollateral()} className="flex-1 rounded-sm border border-line py-2 font-mono text-[12px] disabled:opacity-40">
                    withdraw
                  </button>
                </div>
              )}
            </div>

            <aside className="space-y-3 font-mono text-[11px] text-muted">
              <div className="rounded-sm border border-line p-3">
                <p className="mb-2 text-faint">your collateral</p>
                {collatTokens.length === 0 && <p>none posted</p>}
                {collatTokens.map((t) => {
                  const meta = get(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setCollatToken(t);
                        setTab("collateral");
                      }}
                      className="flex w-full items-center justify-between py-1 text-left hover:text-ink"
                    >
                      <span>{meta?.symbol ?? shortAddress(t)}</span>
                      <span className="text-faint">{shortAddress(t, 3)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-sm border border-line p-3 leading-relaxed">
                collateral factor 70%. liquidation at 80% with an 8% bonus. a token needs a WQIE pair
                on this network to be priced.
              </div>
            </aside>
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
