"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { dcaAbi } from "@/lib/abi/dca";
import { erc20Abi } from "@/lib/abi/launchpad";
import { NATIVE_QIE, ZERO_ADDRESS, contractsFor } from "@/lib/config";
import { formatAmount, parseAmount } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "./AddChainButton";
import { TokenImage } from "./TokenImage";
import { useNetwork } from "./NetworkProvider";
import { useNetClient, useNetWrite } from "@/hooks/useNetChain";
import type { TokenMeta } from "@/lib/types";

const INTERVALS = [
  { label: "5m", sec: 5 * 60 },
  { label: "15m", sec: 15 * 60 },
  { label: "1h", sec: 60 * 60 },
  { label: "4h", sec: 4 * 60 * 60 },
  { label: "1d", sec: 24 * 60 * 60 },
] as const;

const MAX_DURATION = 7 * 24 * 60 * 60;

function tokenKey(t: TokenMeta) {
  return t.isNative ? ZERO_ADDRESS : t.address;
}

export function DcaPanel({
  catalog,
  tokenIn,
  tokenOut,
  onPickIn,
  onPickOut,
}: {
  catalog: TokenMeta[];
  tokenIn: TokenMeta;
  tokenOut: TokenMeta;
  onPickIn: () => void;
  onPickOut: () => void;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = useNetClient();
  const { writeContractAsync, isPending } = useNetWrite();
  const { network } = useNetwork();
  const dca = contractsFor(network.key).dca;
  const deployed = dca !== ZERO_ADDRESS;

  const [total, setTotal] = useState("");
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>(INTERVALS[0]);
  const [slices, setSlices] = useState("4");
  const [slippage, setSlippage] = useState("1");

  const sliceN = Math.max(2, Math.floor(Number(slices) || 0));
  const duration = sliceN * interval.sec;
  const durationOk = duration <= MAX_DURATION;
  const amt = useMemo(() => parseAmount(total, tokenIn.decimals), [total, tokenIn.decimals]);
  const perSlice = sliceN > 0 ? amt / BigInt(sliceN) : 0n;
  const remainderOk = amt > 0n && amt % BigInt(sliceN) === 0n;
  const feeEach = (perSlice * 100n) / 10_000n;

  const ids = useReadContract({
    address: dca,
    abi: dcaAbi,
    functionName: "ownerOrders",
    args: address ? [address] : undefined,
    chainId: network.id,
    query: { enabled: deployed && !!address, refetchInterval: 12_000 },
  });

  async function create() {
    if (!address || !client || !deployed || amt === 0n || !durationOk) return;
    const inAddr = tokenIn.isNative ? ZERO_ADDRESS : tokenIn.address;
    const outAddr = tokenOut.isNative ? ZERO_ADDRESS : tokenOut.address;
    const slipBps = Math.min(2000, Math.round(Number(slippage || 0) * 100));
    try {
      if (!tokenIn.isNative) {
        const allowance = await client.readContract({
          address: tokenIn.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, dca],
        });
        if (allowance < amt) {
          const ah = await writeContractAsync({
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: "approve",
            args: [dca, amt],
          });
          toastPending(ah, network.explorer);
          await client.waitForTransactionReceipt({ hash: ah });
        }
      }
      const hash = await writeContractAsync({
        address: dca,
        abi: dcaAbi,
        functionName: "create",
        args: [inAddr, outAddr, amt, sliceN, interval.sec, slipBps],
        value: tokenIn.isNative ? amt : 0n,
      });
      toastPending(hash, network.explorer);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "DCA created", network.explorer);
      setTotal("");
      void ids.refetch();
    } catch (e) {
      toastFail(e);
    }
  }

  if (!deployed) {
    return (
      <div className="rounded-sm border border-line bg-elev p-4 font-mono text-[13px] text-muted">
        DCA is not deployed on {network.name} yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-sm border border-line bg-elev p-4">
        <Field label="you pay (total)" token={tokenIn} amount={total} onAmount={setTotal} onPick={onPickIn} />
        <div className="flex justify-center">
          <span className="font-mono text-[12px] text-faint">into</span>
        </div>
        <Field label="you buy" token={tokenOut} amount="" readOnly onPick={onPickOut} />

        <div>
          <p className="mb-1 font-mono text-[11px] text-muted">interval</p>
          <div className="flex flex-wrap gap-1">
            {INTERVALS.map((i) => (
              <button
                key={i.label}
                type="button"
                onClick={() => setInterval(i)}
                className={`rounded-sm border px-2 py-1 font-mono text-[12px] ${
                  interval.label === i.label ? "border-line-strong bg-elev-2 text-ink" : "border-line text-muted"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block font-mono text-[11px] text-muted">
          number of swaps
          <input
            value={slices}
            onChange={(e) => setSlices(e.target.value)}
            className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
          />
        </label>

        <div className="flex items-center justify-between font-mono text-[12px] text-muted">
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

        <div className="space-y-1 border-t border-line pt-2 font-mono text-[12px] text-muted">
          <Row k="each swap" v={`${formatAmount(perSlice, tokenIn.decimals)} ${tokenIn.symbol}`} />
          <Row k="executor fee" v={`1% · ${formatAmount(feeEach, tokenIn.decimals)} ${tokenIn.symbol}`} />
          <Row
            k="duration"
            v={
              durationOk
                ? `${formatDuration(duration)} (max 7d)`
                : "over 7 days. lower interval or slices"
            }
          />
          {!remainderOk && amt > 0n && <p className="text-down">total must divide evenly into {sliceN} swaps</p>}
        </div>

        <p className="font-mono text-[11px] text-faint">
          1% fee per swap (covers execution) · 5 minute min interval · 7 day max · cancel anytime
        </p>

        {!isConnected ? (
          <p className="font-mono text-xs text-muted">connect wallet</p>
        ) : chainId !== network.id ? (
          <AddChainButton />
        ) : (
          <button
            type="button"
            disabled={
              isPending ||
              amt === 0n ||
              tokenOut.address === ZERO_ADDRESS && !tokenOut.isNative ||
              tokenKey(tokenIn) === tokenKey(tokenOut) ||
              !durationOk ||
              !remainderOk ||
              sliceN < 2
            }
            onClick={() => void create()}
            className="w-full rounded-sm bg-accent py-2.5 font-mono text-sm text-black disabled:opacity-40"
          >
            {isPending ? "pending…" : "create DCA"}
          </button>
        )}
      </div>

      {address && <OrderList ids={ids.data ?? []} dca={dca} catalog={catalog} onChange={() => void ids.refetch()} />}

      {/*
       * execute() is permissionless on-chain (anyone can run a due slice and
       * earn the 1% fee) but there was previously no way to discover orders
       * that belong to someone else — "your orders" above only lists the
       * connected wallet's own. Without this, DCA only ever executes when
       * the owner themselves clicks a button, defeating the "recurring"
       * point of the feature. This board surfaces every due order so a
       * third-party keeper (or anyone) can find and run them.
       */}
      <DueOrdersBoard dca={dca} catalog={catalog} deployed={deployed} />
    </div>
  );
}

function DueOrdersBoard({
  dca,
  catalog,
  deployed,
}: {
  dca: `0x${string}`;
  catalog: TokenMeta[];
  deployed: boolean;
}) {
  const client = useNetClient();
  const { network } = useNetwork();

  const nextIdQ = useReadContract({
    address: dca,
    abi: dcaAbi,
    functionName: "nextId",
    chainId: network.id,
    query: { enabled: deployed, refetchInterval: 20_000 },
  });
  const nextId = nextIdQ.data ?? 1n;

  const dueQ = useQuery({
    queryKey: ["dca-due", dca, network.id, nextId.toString()],
    queryFn: async () => {
      if (!client || nextId <= 1n) return [] as bigint[];
      // Scan the most recent ~200 order ids rather than the full history —
      // enough to surface anything currently executable without an
      // unbounded RPC fan-out as order volume grows.
      const scanFrom = nextId > 201n ? nextId - 200n : 1n;
      const ids: bigint[] = [];
      for (let i = scanFrom; i < nextId; i++) ids.push(i);
      const orders = await Promise.all(
        ids.map((id) =>
          client
            .readContract({ address: dca, abi: dcaAbi, functionName: "orders", args: [id] })
            .catch(() => null),
        ),
      );
      const now = Math.floor(Date.now() / 1000);
      return ids.filter((id, idx) => {
        const o = orders[idx];
        if (!o) return false;
        const [, , , , slices, executed, , nextExec, , cancelled] = o;
        return !cancelled && executed < slices && now >= Number(nextExec);
      });
    },
    enabled: !!client && deployed && nextId > 1n,
    refetchInterval: 20_000,
  });

  const dueIds = dueQ.data ?? [];
  if (!deployed || dueIds.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[12px] text-muted">
        due for execution · anyone can run these and earn the 1% fee
      </p>
      {dueIds.map((id) => (
        <OrderRow
          key={id.toString()}
          id={id}
          dca={dca}
          catalog={catalog}
          onChange={() => void dueQ.refetch()}
          showCancel={false}
        />
      ))}
    </div>
  );
}

function OrderList({
  ids,
  dca,
  catalog,
  onChange,
}: {
  ids: readonly bigint[];
  dca: `0x${string}`;
  catalog: TokenMeta[];
  onChange: () => void;
}) {
  if (ids.length === 0) {
    return <p className="font-mono text-[12px] text-faint">no DCA orders yet</p>;
  }
  return (
    <div className="space-y-2">
      <p className="font-mono text-[12px] text-muted">your orders</p>
      {[...ids].reverse().map((id) => (
        <OrderRow key={id.toString()} id={id} dca={dca} catalog={catalog} onChange={onChange} />
      ))}
    </div>
  );
}

function OrderRow({
  id,
  dca,
  catalog,
  onChange,
  showCancel = true,
}: {
  id: bigint;
  dca: `0x${string}`;
  catalog: TokenMeta[];
  onChange: () => void;
  /** Cancel only ever succeeds for the order's owner — hide it in contexts
   *  (like the due-orders board) that also render other people's orders,
   *  where clicking it would just revert with "OWNER". */
  showCancel?: boolean;
}) {
  const { writeContractAsync, isPending } = useNetWrite();
  const { network } = useNetwork();
  const client = useNetClient();
  const q = useReadContract({
    address: dca,
    abi: dcaAbi,
    functionName: "orders",
    args: [id],
    chainId: network.id,
    query: { refetchInterval: 10_000 },
  });
  const o = q.data;
  if (!o) return null;
  const [, tokenIn, tokenOut, per, slices, executed, interval, nextExec, , cancelled, nativeIn, nativeOut] = o;
  const inMeta = findMeta(catalog, tokenIn, nativeIn);
  const outMeta = findMeta(catalog, tokenOut, nativeOut);
  const done = cancelled || executed >= slices;
  const due = !done && Math.floor(Date.now() / 1000) >= Number(nextExec);

  async function act(fn: "execute" | "cancel") {
    if (!client) return;
    try {
      const hash = await writeContractAsync({
        address: dca,
        abi: dcaAbi,
        functionName: fn,
        args: [id],
      });
      toastPending(hash, network.explorer);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, fn === "execute" ? "slice swapped" : "DCA cancelled", network.explorer);
      onChange();
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div className="rounded-sm border border-line bg-elev p-3 font-mono text-[12px]">
      <div className="flex items-center justify-between">
        <span className="text-ink">
          #{id.toString()} · {inMeta.symbol} → {outMeta.symbol}
        </span>
        <span className={cancelled ? "text-down" : done ? "text-accent-2" : "text-accent"}>
          {cancelled ? "cancelled" : `${executed}/${slices}`}
        </span>
      </div>
      <p className="mt-1 text-muted">
        {formatAmount(per, inMeta.decimals)} {inMeta.symbol} every {formatDuration(Number(interval))}
      </p>
      {!done && (
        <p className="mt-1 text-faint">{due ? "ready to execute" : `next ${formatEta(Number(nextExec))}`}</p>
      )}
      {!done && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={isPending || !due}
            onClick={() => void act("execute")}
            className="rounded-sm border border-line px-2 py-1 hover:bg-elev-2 disabled:opacity-40"
          >
            execute
          </button>
          {showCancel && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => void act("cancel")}
              className="rounded-sm border border-line px-2 py-1 text-muted hover:bg-elev-2"
            >
              cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function findMeta(catalog: TokenMeta[], addr: string, native: boolean): TokenMeta {
  if (native) return { ...NATIVE_QIE };
  return (
    catalog.find((t) => t.address.toLowerCase() === addr.toLowerCase()) ?? {
      address: addr as `0x${string}`,
      name: "token",
      symbol: addr.slice(0, 6),
      decimals: 18,
    }
  );
}

function Field({
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
      <div className="mb-1 font-mono text-[11px] text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <input
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onAmount?.(e.target.value)}
          placeholder={readOnly ? token.symbol : "0.0"}
          className="w-0 flex-1 bg-transparent font-mono text-lg outline-none"
        />
        <button type="button" onClick={onPick} className="flex items-center gap-2 rounded-sm border border-line px-2 py-1">
          <TokenImage src={token.image} address={token.address || zeroAddress} symbol={token.symbol} size={18} />
          <span className="font-mono text-xs">{token.symbol}</span>
        </button>
      </div>
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

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  return `${(sec / 86400).toFixed(1)}d`;
}

function formatEta(unix: number) {
  const s = unix - Math.floor(Date.now() / 1000);
  if (s <= 0) return "now";
  return `in ${formatDuration(s)}`;
}
