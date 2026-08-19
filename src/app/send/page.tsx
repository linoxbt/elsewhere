"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, zeroAddress } from "viem";
import { useAccount, useChainId, useSendTransaction } from "wagmi";
import { erc20Abi } from "@/lib/abi/launchpad";
import { batchSenderAbi } from "@/lib/abi/lending";
import { NATIVE_QIE, ZERO_ADDRESS, contractsFor } from "@/lib/config";
import { formatAmount, parseAmount } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { TokenImage } from "@/components/TokenImage";
import { useNetwork } from "@/components/NetworkProvider";
import { useNetClient, useNetWrite } from "@/hooks/useNetChain";
import { useTokenCache } from "@/components/TokenCache";
import type { TokenMeta } from "@/lib/types";

type Row = { to: string; amount: string };

function emptyRow(): Row {
  return { to: "", amount: "" };
}

export default function SendPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = useNetClient();
  const { writeContractAsync, isPending: writing } = useNetWrite();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const isPending = writing || sending;
  const { network } = useNetwork();
  const { put } = useTokenCache();
  const contracts = contractsFor(network.key);
  const batch = contracts.batchSender;

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [catalog, setCatalog] = useState<TokenMeta[]>([{ ...NATIVE_QIE }]);
  const [token, setToken] = useState<TokenMeta>({ ...NATIVE_QIE });
  const [custom, setCustom] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [balance, setBalance] = useState<bigint>(0n);

  const wrong = isConnected && chainId !== network.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/official-tokens?chainId=${network.id}`);
      const json = await res.json();
      if (cancelled) return;
      const tokens = (json.tokens ?? []) as TokenMeta[];
      const next = [{ ...NATIVE_QIE }, ...tokens.filter((t) => !t.isNative)];
      setCatalog(next);
      tokens.forEach((t) => put(t));
      setToken({ ...NATIVE_QIE });
      setRows([emptyRow()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [network.id, put]);

  useEffect(() => {
    if (!address || !client) {
      setBalance(0n);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bal = token.isNative
          ? await client.getBalance({ address })
          : await client.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
        if (!cancelled) setBalance(bal);
      } catch {
        if (!cancelled) setBalance(0n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, client, token, isPending]);

  const parsed = useMemo(() => {
    return rows.map((r) => ({
      to: r.to.trim(),
      amount: parseAmount(r.amount, token.decimals),
      ok: isAddress(r.to.trim()) && parseAmount(r.amount, token.decimals) > 0n,
    }));
  }, [rows, token.decimals]);

  const total = parsed.reduce((s, r) => s + r.amount, 0n);
  const valid = parsed.filter((r) => r.ok);
  const canSend = isConnected && !wrong && valid.length > 0 && total <= balance && !isPending;

  async function loadCustom() {
    if (!client || !isAddress(custom)) return;
    const addr = custom as `0x${string}`;
    const [name, symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: "name" }).catch(() => "token"),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }).catch(() => "TKN"),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    ]);
    const meta: TokenMeta = { address: addr, name: String(name), symbol: String(symbol), decimals: Number(decimals) };
    put(meta);
    setToken(meta);
    setCatalog((prev) => (prev.some((t) => t.address.toLowerCase() === addr.toLowerCase()) ? prev : [...prev, meta]));
  }

  function applyCsv(text: string) {
    const next: Row[] = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [to, amount] = trimmed.split(/[,;\s]+/);
      if (to && amount) next.push({ to, amount });
    }
    if (next.length) setRows(next);
  }

  async function send() {
    if (!address || !canSend) return;
    try {
      if (mode === "single" || valid.length === 1) {
        const row = valid[0];
        const to = row.to as `0x${string}`;
        if (token.isNative) {
          const hash = await sendTransactionAsync({ to, value: row.amount, chainId: network.id });
          toastPending(hash, network.explorer);
          toastSuccess(hash, "sent", network.explorer);
          return;
        }
        const hash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, row.amount],
        });
        toastPending(hash, network.explorer);
        toastSuccess(hash, "sent", network.explorer);
        return;
      }

      const tos = valid.map((r) => r.to as `0x${string}`);
      const amts = valid.map((r) => r.amount);

      if (token.isNative) {
        if (batch !== ZERO_ADDRESS) {
          const hash = await writeContractAsync({
            address: batch,
            abi: batchSenderAbi,
            functionName: "sendNative",
            args: [tos, amts],
            value: total,
          });
          toastPending(hash, network.explorer);
          toastSuccess(hash, "batch sent", network.explorer);
          return;
        }
        for (const row of valid) {
          const hash = await sendTransactionAsync({ to: row.to as `0x${string}`, value: row.amount, chainId: network.id });
          toastPending(hash, network.explorer);
        }
        toastSuccess(undefined, `${valid.length} transfers sent`);
        return;
      }

      if (batch !== ZERO_ADDRESS && valid.length > 1) {
        const allowance = await client!.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, batch],
        });
        if (allowance < total) {
          const approveHash = await writeContractAsync({
            address: token.address,
            abi: erc20Abi,
            functionName: "approve",
            args: [batch, total],
          });
          toastPending(approveHash, network.explorer);
        }
        const hash = await writeContractAsync({
          address: batch,
          abi: batchSenderAbi,
          functionName: "sendToken",
          args: [token.address, tos, amts],
        });
        toastPending(hash, network.explorer);
        toastSuccess(hash, "batch sent", network.explorer);
        return;
      }

      for (const row of valid) {
        const hash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [row.to as `0x${string}`, row.amount],
        });
        toastPending(hash, network.explorer);
      }
      toastSuccess(undefined, `${valid.length} transfers sent`);
    } catch (err) {
      toastFail(err);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="font-mono text-2xl tracking-tight">send</h1>
      <p className="mt-1 text-sm text-muted">
        send native QIE or any ERC-20. batch mode fans out to many recipients in one flow.
      </p>

      <div className="mt-5 flex gap-1">
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setRows(m === "single" ? [rows[0] ?? emptyRow()] : rows.length ? rows : [emptyRow(), emptyRow()]);
            }}
            className={`rounded-sm px-3 py-1.5 font-mono text-xs ${
              mode === m ? "bg-elev-2 text-ink" : "text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4 rounded-sm border border-line bg-elev p-4">
        <label className="block font-mono text-[12px] text-faint">token</label>
        <div className="flex flex-wrap gap-1">
          {catalog.slice(0, 8).map((t) => (
            <button
              key={t.address + t.symbol}
              type="button"
              onClick={() => setToken(t)}
              className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[12px] ${
                token.address === t.address && token.symbol === t.symbol
                  ? "border-line-strong bg-elev-2 text-ink"
                  : "border-line text-muted"
              }`}
            >
              <TokenImage address={t.address || zeroAddress} symbol={t.symbol} src={t.image} size={14} />
              {t.symbol}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="paste token address"
            className="min-w-0 flex-1 rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => void loadCustom()}
            className="rounded-sm border border-line px-2 py-1 font-mono text-[12px] hover:bg-elev-2"
          >
            load
          </button>
        </div>
        <p className="font-mono text-[12px] text-faint">
          balance {formatAmount(balance, token.decimals)} {token.symbol}
        </p>

        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]">
            <input
              value={row.to}
              onChange={(e) =>
                setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, to: e.target.value } : r)))
              }
              placeholder="0x recipient"
              className="rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
            />
            <input
              value={row.amount}
              onChange={(e) =>
                setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))
              }
              placeholder="amount"
              className="rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
            />
            {mode === "batch" && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="font-mono text-[12px] text-faint hover:text-down"
              >
                remove
              </button>
            )}
          </div>
        ))}

        {mode === "batch" && (
          <>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="font-mono text-[12px] text-accent"
            >
              + recipient
            </button>
            <textarea
              placeholder="paste csv: address,amount"
              className="h-20 w-full rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[12px]"
              onChange={(e) => applyCsv(e.target.value)}
            />
          </>
        )}

        <div className="flex items-center justify-between font-mono text-[12px] text-muted">
          <span>
            {valid.length} recipient{valid.length === 1 ? "" : "s"} · {formatAmount(total, token.decimals)}{" "}
            {token.symbol}
          </span>
          {batch !== ZERO_ADDRESS && valid.length > 1 && <span className="text-faint">atomic batch</span>}
        </div>

        {!isConnected ? (
          <p className="font-mono text-[13px] text-muted">connect a wallet to send</p>
        ) : wrong ? (
          <AddChainButton />
        ) : (
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void send()}
            className="w-full rounded-sm border border-line bg-elev-2 py-2 font-mono text-[13px] hover:border-line-strong disabled:opacity-40"
          >
            {isPending ? "confirm in wallet…" : mode === "batch" ? "send batch" : "send"}
          </button>
        )}
      </div>
    </div>
  );
}
