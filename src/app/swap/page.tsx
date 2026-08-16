"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { isAddress, zeroAddress } from "viem";
import { ammRouterAbi } from "@/lib/abi/amm";
import { qieDexRouterAbi } from "@/lib/abi/qiedex";
import { erc20Abi } from "@/lib/abi/launchpad";
import { NATIVE_QIE, ZERO_ADDRESS, contractsFor, isLaunchpadDeployed } from "@/lib/config";
import { formatAmount, formatUsdPrecise, parseAmount } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { TokenImage } from "@/components/TokenImage";
import { useTokenCache } from "@/components/TokenCache";
import { DcaPanel } from "@/components/DcaPanel";
import { useOracle } from "@/hooks/useOracle";
import { useNetwork } from "@/components/NetworkProvider";
import type { TokenMeta } from "@/lib/types";
import { cn } from "@/lib/format";

function SwapInner() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { put } = useTokenCache();
  const { data: oracle } = useOracle();
  const { network } = useNetwork();
  const official = network.officialDex;
  const ours = contractsFor(network.key);

  const [catalog, setCatalog] = useState<TokenMeta[]>([{ ...NATIVE_QIE }]);
  const [tokenIn, setTokenIn] = useState<TokenMeta>({ ...NATIVE_QIE });
  const [tokenOut, setTokenOut] = useState<TokenMeta>({
    address: ZERO_ADDRESS,
    name: "select token",
    symbol: "…",
    decimals: 18,
  });
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [open, setOpen] = useState<"in" | "out" | null>(null);
  const [tab, setTab] = useState<"swap" | "dca">("swap");
  const [quote, setQuote] = useState<{ out: bigint; via: "qiedex" | "elsewhere" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/official-tokens?chainId=${network.id}`);
      const json = await res.json();
      if (cancelled) return;
      const tokens = (json.tokens ?? []) as TokenMeta[];
      setCatalog(tokens);
      tokens.forEach((t) => put(t));
      const qiedex = tokens.find((t) => t.symbol.toUpperCase() === "QIEDEX");
      const wqie = tokens.find((t) => t.symbol.toUpperCase() === "WQIE");
      setTokenIn({ ...NATIVE_QIE });
      setTokenOut(qiedex ?? wqie ?? tokens[1] ?? { address: ZERO_ADDRESS, name: "select token", symbol: "…", decimals: 18 });
      setQuote(null);
      setAmount("");
    })();
    return () => {
      cancelled = true;
    };
  }, [network.id, put]);

  useEffect(() => {
    const out = params.get("out");
    if (out && isAddress(out)) {
      const hit = catalog.find((t) => t.address.toLowerCase() === out.toLowerCase());
      if (hit) setTokenOut(hit);
    }
  }, [params, catalog]);

  const wrap = official?.wqie ?? ours.wqie;
  const amt = useMemo(() => parseAmount(amount, tokenIn.decimals), [amount, tokenIn.decimals]);
  const inAddr = tokenIn.isNative ? wrap : tokenIn.address;
  const outAddr = tokenOut.isNative ? wrap : tokenOut.address;
  const useOfficial = !!official;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!client || amt === 0n || outAddr === ZERO_ADDRESS || inAddr === ZERO_ADDRESS) {
        setQuote(null);
        return;
      }
      if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
        setQuote(null);
        return;
      }
      const path = [inAddr, outAddr] as `0x${string}`[];
      try {
        if (useOfficial && official) {
          const amounts = await client.readContract({
            address: official.router,
            abi: qieDexRouterAbi,
            functionName: "getAmountsOut",
            args: [amt, path],
          });
          if (!cancelled) setQuote({ out: amounts[amounts.length - 1], via: "qiedex" });
          return;
        }
        if (!isLaunchpadDeployed(network.key)) {
          if (!cancelled) setQuote(null);
          return;
        }
        const [out] = await client.readContract({
          address: ours.ammRouter,
          abi: ammRouterAbi,
          functionName: "quoteSwap",
          args: [amt, path],
        });
        if (!cancelled) setQuote({ out, via: "elsewhere" });
      } catch {
        if (!cancelled) setQuote(null);
      }
    }
    const t = setTimeout(run, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [amt, inAddr, outAddr, client, useOfficial, official, network.key, ours.ammRouter]);

  async function submit() {
    if (!address || !client || !quote) return;
    const slipBps = Math.max(0, Number(slippage) || 0) * 100;
    const minOut = (quote.out * BigInt(Math.floor(10000 - slipBps))) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
    const path = [inAddr, outAddr] as `0x${string}`[];
    try {
      let hash: `0x${string}`;
      if (useOfficial && official) {
        if (tokenIn.isNative) {
          hash = await writeContractAsync({
            address: official.router,
            abi: qieDexRouterAbi,
            functionName: "swapExactETHForTokens",
            args: [minOut, path, address, deadline],
            value: amt,
          });
        } else if (tokenOut.isNative) {
          await maybeApprove(tokenIn.address, official.router, amt, address, client, writeContractAsync);
          hash = await writeContractAsync({
            address: official.router,
            abi: qieDexRouterAbi,
            functionName: "swapExactTokensForETH",
            args: [amt, minOut, path, address, deadline],
          });
        } else {
          await maybeApprove(tokenIn.address, official.router, amt, address, client, writeContractAsync);
          hash = await writeContractAsync({
            address: official.router,
            abi: qieDexRouterAbi,
            functionName: "swapExactTokensForTokens",
            args: [amt, minOut, path, address, deadline],
          });
        }
      } else {
        if (tokenIn.isNative) {
          hash = await writeContractAsync({
            address: ours.ammRouter,
            abi: ammRouterAbi,
            functionName: "swapExactQIEForTokens",
            args: [minOut, path, address, deadline],
            value: amt,
          });
        } else if (tokenOut.isNative) {
          await maybeApprove(tokenIn.address, ours.ammRouter, amt, address, client, writeContractAsync);
          hash = await writeContractAsync({
            address: ours.ammRouter,
            abi: ammRouterAbi,
            functionName: "swapExactTokensForQIE",
            args: [amt, minOut, path, address, deadline],
          });
        } else {
          await maybeApprove(tokenIn.address, ours.ammRouter, amt, address, client, writeContractAsync);
          hash = await writeContractAsync({
            address: ours.ammRouter,
            abi: ammRouterAbi,
            functionName: "swapExactTokensForTokens",
            args: [amt, minOut, path, address, deadline],
          });
        }
      }
      toastPending(hash, network.explorer);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "swapped", network.explorer);
      setAmount("");
    } catch (e) {
      toastFail(e);
    }
  }

  const qieUsd = oracle && !oracle.stale ? oracle.usd : 0;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-mono text-2xl tracking-tight">swap</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        {useOfficial
          ? "tokens from official qie pools on this network."
          : "qie testnet — official dex is mainnet-only. native QIE is listed; launchpad tokens appear after deploy."}
      </p>

      <div className="mb-4 flex rounded-sm border border-line p-0.5">
        {(["swap", "dca"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-sm py-1.5 font-mono text-[12px]",
              tab === t ? "bg-elev-2 text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t === "dca" ? "DCA" : "swap"}
          </button>
        ))}
      </div>

      {tab === "dca" ? (
        <DcaPanel
          catalog={catalog}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          onPickIn={() => setOpen("in")}
          onPickOut={() => setOpen("out")}
        />
      ) : (
      <div className="space-y-2 rounded-sm border border-line bg-elev p-4">
        <TokenField label="from" token={tokenIn} amount={amount} onAmount={setAmount} onPick={() => setOpen("in")} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setTokenIn(tokenOut.isNative || tokenOut.address === ZERO_ADDRESS ? { ...NATIVE_QIE } : tokenOut);
              setTokenOut(tokenIn);
              setAmount("");
            }}
            className="rounded-sm border border-line px-2 py-0.5 font-mono text-xs text-muted"
          >
            ↕
          </button>
        </div>
        <TokenField
          label="to"
          token={tokenOut}
          amount={quote ? formatAmount(quote.out, tokenOut.decimals, 6) : ""}
          readOnly
          onPick={() => setOpen("out")}
        />

        <div className="flex items-center justify-between pt-2 font-mono text-[11px] text-muted">
          <span>route</span>
          <span className="text-ink">{quote?.via === "qiedex" ? "official qie pool" : useOfficial ? "official qie pool" : "elsewhere"}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-muted">
          <span>network</span>
          <span className="text-ink">{network.name}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-muted">
          <span>slippage</span>
          <span>
            <input
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-10 border-b border-line bg-transparent text-right outline-none"
            />
            %
          </span>
        </div>
        {quote && (
          <div className="space-y-1 border-t border-line pt-2 font-mono text-[11px] text-muted">
            <div className="flex justify-between">
              <span>min received</span>
              <span className="text-ink">
                {formatAmount((quote.out * BigInt(Math.floor(10000 - Number(slippage || 0) * 100))) / 10000n)}{" "}
                {tokenOut.symbol}
              </span>
            </div>
            {qieUsd > 0 && tokenIn.isNative && (
              <div className="flex justify-between">
                <span>notional</span>
                <span>{formatUsdPrecise((Number(amt) / 1e18) * qieUsd)}</span>
              </div>
            )}
          </div>
        )}

        {!isConnected ? (
          <p className="pt-2 font-mono text-xs text-muted">connect wallet</p>
        ) : chainId !== network.id ? (
          <AddChainButton />
        ) : (
          <button
            type="button"
            disabled={isPending || amt === 0n || !quote}
            onClick={submit}
            className="mt-2 w-full rounded-sm bg-accent py-2.5 font-mono text-sm text-black disabled:opacity-40"
          >
            {isPending ? "pending…" : "swap"}
          </button>
        )}
      </div>
      )}

      {open && (
        <Picker
          list={catalog}
          onClose={() => setOpen(null)}
          onPick={(t) => {
            if (open === "in") setTokenIn(t);
            else setTokenOut(t);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

async function maybeApprove(
  token: `0x${string}`,
  spender: `0x${string}`,
  amt: bigint,
  owner: `0x${string}`,
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  write: ReturnType<typeof useWriteContract>["writeContractAsync"],
) {
  const allowance = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowance >= amt) return;
  const ah = await write({
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amt],
  });
  toastPending(ah);
  await client.waitForTransactionReceipt({ hash: ah });
}

function TokenField({
  label,
  token,
  amount,
  onAmount,
  onPick,
  readOnly,
}: {
  label: string;
  token: TokenMeta;
  amount: string;
  onAmount?: (v: string) => void;
  onPick: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-sm border border-line bg-bg p-3">
      <div className="mb-1 font-mono text-[10px] text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <input
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onAmount?.(e.target.value)}
          placeholder="0.0"
          className="w-0 flex-1 bg-transparent font-mono text-lg outline-none"
        />
        <button
          type="button"
          onClick={onPick}
          className="flex items-center gap-2 rounded-sm border border-line px-2 py-1"
        >
          <TokenImage src={token.image} address={token.address || zeroAddress} symbol={token.symbol} size={18} />
          <span className="font-mono text-xs">{token.symbol}</span>
        </button>
      </div>
    </div>
  );
}

function Picker({
  list,
  onPick,
  onClose,
}: {
  list: TokenMeta[];
  onPick: (t: TokenMeta) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = list.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.address.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-sm border border-line bg-elev p-3">
        <div className="mb-2 flex items-center justify-between font-mono text-xs">
          <span>select token</span>
          <button type="button" onClick={onClose} className="text-muted">
            close
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search official pool token"
          className="mb-2 w-full rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-xs outline-none"
        />
        <div className="max-h-72 overflow-auto">
          {filtered.map((t) => (
            <button
              key={t.address + t.symbol}
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-elev-2"
            >
              <TokenImage src={t.image} address={t.address || zeroAddress} symbol={t.symbol} size={22} />
              <div>
                <div className="text-sm">{t.symbol}</div>
                <div className="font-mono text-[10px] text-muted">{t.name}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-6 text-center font-mono text-[11px] text-muted">no tokens on this network</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SwapPage() {
  return (
    <Suspense fallback={<div className="font-mono text-xs text-muted">loading…</div>}>
      <SwapInner />
    </Suspense>
  );
}
