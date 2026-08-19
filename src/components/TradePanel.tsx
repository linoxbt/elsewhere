"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import Link from "next/link";
import { bondingCurveAbi, erc20Abi } from "@/lib/abi/launchpad";
import { ammRouterAbi } from "@/lib/abi/amm";
import { contractsFor, PROTOCOL, ZERO_ADDRESS } from "@/lib/config";
import { useNetwork } from "./NetworkProvider";
import { useNetClient, useNetWrite } from "@/hooks/useNetChain";
import { formatAmount, parseAmount } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import type { TokenRecord } from "@/lib/types";
import { AddChainButton } from "./AddChainButton";

export function TradePanel({ token }: { token: TokenRecord }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = useNetClient();
  const { writeContractAsync, isPending } = useNetWrite();
  const { network } = useNetwork();
  const contracts = contractsFor(network.key);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [quote, setQuote] = useState<{
    out: bigint;
    creatorFee: bigint;
    protocolFee: bigint;
    lpFee?: bigint;
  } | null>(null);

  const graduated = token.graduated;
  const amt = useMemo(() => parseAmount(amount), [amount]);
  const slipBps = Math.max(0, Number(slippage) || 0) * 100;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!client || amt === 0n) {
        setQuote(null);
        return;
      }
      try {
        if (!graduated && token.curve && token.curve !== ZERO_ADDRESS) {
          if (side === "buy") {
            const [out, creatorFee, protocolFee] = await client.readContract({
              address: token.curve,
              abi: bondingCurveAbi,
              functionName: "quoteBuy",
              args: [amt],
            });
            if (!cancelled) setQuote({ out, creatorFee, protocolFee });
          } else {
            const [out, creatorFee, protocolFee] = await client.readContract({
              address: token.curve,
              abi: bondingCurveAbi,
              functionName: "quoteSell",
              args: [amt],
            });
            if (!cancelled) setQuote({ out, creatorFee, protocolFee });
          }
        } else if (contracts.ammRouter !== ZERO_ADDRESS) {
          const path =
            side === "buy"
              ? [contracts.wqie, token.address]
              : [token.address, contracts.wqie];
          const [out, creatorFee, protocolFee, lpFee] = await client.readContract({
            address: contracts.ammRouter,
            abi: ammRouterAbi,
            functionName: "quoteSwap",
            args: [amt, path],
          });
          if (!cancelled) setQuote({ out, creatorFee, protocolFee, lpFee });
        }
      } catch {
        if (!cancelled) setQuote(null);
      }
    }
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [amt, side, graduated, token, client]);

  async function submit() {
    if (!address || !client) return;
    if (chainId !== network.id) return;
    const minOut = quote ? (quote.out * BigInt(Math.floor(10000 - slipBps))) / 10000n : 0n;
    try {
      let hash: `0x${string}`;
      if (!graduated) {
        if (side === "buy") {
          hash = await writeContractAsync({
            address: token.curve,
            abi: bondingCurveAbi,
            functionName: "buy",
            args: [minOut, address],
            value: amt,
          });
        } else {
          const allowance = await client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, token.curve],
          });
          if (allowance < amt) {
            toastPending();
            const ah = await writeContractAsync({
              address: token.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [token.curve, amt],
            });
            await client.waitForTransactionReceipt({ hash: ah });
          }
          hash = await writeContractAsync({
            address: token.curve,
            abi: bondingCurveAbi,
            functionName: "sell",
            args: [amt, minOut, address],
          });
        }
      } else {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
        if (side === "buy") {
          hash = await writeContractAsync({
            address: contracts.ammRouter,
            abi: ammRouterAbi,
            functionName: "swapExactQIEForTokens",
            args: [minOut, [contracts.wqie, token.address], address, deadline],
            value: amt,
          });
        } else {
          const allowance = await client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, contracts.ammRouter],
          });
          if (allowance < amt) {
            toastPending();
            const ah = await writeContractAsync({
              address: token.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [contracts.ammRouter, amt],
            });
            await client.waitForTransactionReceipt({ hash: ah });
          }
          hash = await writeContractAsync({
            address: contracts.ammRouter,
            abi: ammRouterAbi,
            functionName: "swapExactTokensForQIE",
            args: [amt, minOut, [token.address, contracts.wqie], address, deadline],
          });
        }
      }
      toastPending(hash);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash);
      setAmount("");
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div className="rounded-sm border border-line bg-elev p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex rounded-sm border border-line">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`px-4 py-1.5 font-mono text-xs ${
                side === s
                  ? s === "buy"
                    ? "bg-[#132016] text-up"
                    : "bg-[#201212] text-down"
                  : "text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="font-mono text-[11px] text-muted">
          {graduated ? "amm" : "bonding curve"}
        </div>
      </div>

      {graduated && (
        <Link
          href={`/swap?out=${token.address}`}
          className="mb-3 block font-mono text-[12px] text-accent hover:underline"
        >
          graduated ✓ trading on the amm →
        </Link>
      )}

      <label className="mb-1 block font-mono text-[12px] text-muted">
        {side === "buy" ? "qie in" : `${token.symbol} in`}
      </label>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="mb-3 w-full rounded-sm border border-line bg-bg px-3 py-2 font-mono text-sm outline-none"
      />

      <div className="mb-3 flex items-center justify-between font-mono text-[12px] text-muted">
        <span>slippage</span>
        <span className="flex items-center gap-1">
          <input
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-12 border-b border-line bg-transparent text-right outline-none"
          />
          %
        </span>
      </div>

      {quote && (
        <div className="mb-3 space-y-1 rounded-sm border border-line bg-bg p-3 font-mono text-[12px] text-muted">
          <Row
            k="you receive"
            v={`${formatAmount(quote.out)} ${side === "buy" ? token.symbol : "QIE"}`}
          />
          <Row
            k="min received"
            v={formatAmount((quote.out * BigInt(Math.floor(10000 - slipBps))) / 10000n)}
          />
          <Row
            k="creator fee (0.425% / 0.4%)"
            v={`${formatAmount(quote.creatorFee)} QIE`}
          />
          <Row k="protocol fee" v={`${formatAmount(quote.protocolFee)} QIE`} />
          {quote.lpFee !== undefined && (
            <Row k="lp fee (0.30%)" v={`${formatAmount(quote.lpFee)}`} />
          )}
        </div>
      )}

      {!isConnected ? (
        <div className="font-mono text-xs text-muted">connect wallet to trade</div>
      ) : chainId !== network.id ? (
        <AddChainButton />
      ) : (
        <button
          type="button"
          disabled={isPending || amt === 0n}
          onClick={submit}
          className={`w-full rounded-sm py-2.5 font-mono text-sm ${
            side === "buy" ? "bg-[#1a3a24] text-up" : "bg-[#3a1a1a] text-down"
          } disabled:opacity-50`}
        >
          {isPending ? "pending…" : side}
        </button>
      )}

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">
        {graduated
          ? `post-graduation: ${PROTOCOL.ammCreatorFeeBps / 1000}% creator + ${PROTOCOL.ammProtocolFeeBps / 1000}% protocol + 0.30% lp, via the amm router.`
          : `pre-graduation: 1% total (${PROTOCOL.bondingCreatorFeeBps / 1000}% creator / ${PROTOCOL.bondingProtocolFeeBps / 1000}% protocol) against the bonding curve, quoted in qie.`}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}
