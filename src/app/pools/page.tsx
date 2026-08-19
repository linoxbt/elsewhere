"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { ammFactoryAbi, ammPairAbi, ammRouterAbi } from "@/lib/abi/amm";
import { erc20Abi } from "@/lib/abi/launchpad";
import { contractsFor, ZERO_ADDRESS } from "@/lib/config";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount, formatUsd, parseAmount, shortAddress } from "@/lib/format";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { TokenImage } from "@/components/TokenImage";
import { usePools, useTokens } from "@/hooks/useTokens";
import { useTokenCache } from "@/components/TokenCache";
import type { PoolRecord } from "@/lib/types";

export default function PoolsPage() {
  const { data } = usePools();
  const pools: PoolRecord[] = data?.pools ?? [];
  const [tab, setTab] = useState<"all" | "mine" | "add" | "remove" | "create">("all");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl tracking-tight">pools</h1>
          <p className="mt-1 text-sm text-muted">provide liquidity. mainnet lists official qie pools.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "mine", "add", "remove", "create"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-sm px-3 py-1.5 font-mono text-xs ${
                tab === t ? "bg-elev-2 text-ink" : "text-muted"
              }`}
            >
              {t === "all" ? "all pools" : t === "mine" ? "your positions" : t}
            </button>
          ))}
        </div>
      </div>

      {tab === "all" && <PoolTable pools={pools} />}
      {tab === "mine" && <Positions pools={pools} />}
      {tab === "add" && <AddLiquidity pools={pools} />}
      {tab === "remove" && <RemoveLiquidity pools={pools} />}
      {tab === "create" && <CreatePool />}
    </div>
  );
}

function PoolTable({ pools }: { pools: PoolRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-left font-mono text-[13px]">
        <thead className="text-[12px] text-faint">
          <tr>
            <th className="px-3 py-2 font-normal">pair</th>
            <th className="px-3 py-2 font-normal">tvl</th>
            <th className="px-3 py-2 font-normal">24h vol</th>
            <th className="px-3 py-2 font-normal">fees</th>
            <th className="px-3 py-2 font-normal">apr</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((p) => (
            <tr key={p.address} className="border-t border-line">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <TokenImage address={p.token0} symbol={p.symbol0} src={p.image0} size={18} />
                  <TokenImage address={p.token1} symbol={p.symbol1} src={p.image1} size={18} />
                  <span>
                    {p.symbol0}/{p.symbol1}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">{formatUsd(p.tvlUsd, { compact: true })}</td>
              <td className="px-3 py-2">{formatUsd(p.volume24hUsd, { compact: true })}</td>
              <td className="px-3 py-2">{formatUsd(p.fees24hUsd, { subCent: true })}</td>
              <td className="px-3 py-2">{(p.apr * 100).toFixed(1)}%</td>
            </tr>
          ))}
          {pools.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-10 text-center text-muted">
                no pools yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Positions({ pools }: { pools: PoolRecord[] }) {
  const { address } = useAccount();
  const client = usePublicClient();
  const [rows, setRows] = useState<
    { pool: PoolRecord; liq: bigint; share: number; a0: bigint; a1: bigint }[]
  >([]);

  useEffect(() => {
    if (!address || !client) return;
    void (async () => {
      const out = [];
      for (const p of pools) {
        try {
          const [bal, supply, reserves] = await Promise.all([
            client.readContract({
              address: p.address,
              abi: ammPairAbi,
              functionName: "balanceOf",
              args: [address],
            }),
            client.readContract({ address: p.address, abi: ammPairAbi, functionName: "totalSupply" }),
            client.readContract({ address: p.address, abi: ammPairAbi, functionName: "getReserves" }),
          ]);
          if (bal === 0n) continue;
          const [r0, r1] = reserves as unknown as [bigint, bigint, number];
          out.push({
            pool: p,
            liq: bal,
            share: supply > 0n ? Number((bal * 10000n) / supply) / 100 : 0,
            a0: supply > 0n ? (bal * r0) / supply : 0n,
            a1: supply > 0n ? (bal * r1) / supply : 0n,
          });
        } catch {
          /* skip */
        }
      }
      setRows(out);
    })();
  }, [address, client, pools]);

  if (!address) return <p className="font-mono text-xs text-muted">connect wallet</p>;
  if (rows.length === 0) return <p className="font-mono text-xs text-muted">no lp positions</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.pool.address} className="rounded-sm border border-line bg-elev p-3 font-mono text-xs">
          <div className="mb-1">
            {r.pool.symbol0}/{r.pool.symbol1}
          </div>
          <div className="text-muted">
            share {r.share.toFixed(3)}% · {formatAmount(r.a0)} {r.pool.symbol0} + {formatAmount(r.a1)}{" "}
            {r.pool.symbol1}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddLiquidity({ pools }: { pools: PoolRecord[] }) {
  const { network } = useNetwork();
  const contracts = contractsFor(network.key);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  useTokens("new", "");
  const { launchpad } = useTokenCache();
  const [token, setToken] = useState("");
  const [amtTok, setAmtTok] = useState("");
  const [amtQie, setAmtQie] = useState("");

  const pair = useReadContract({
    address: contracts.ammFactory,
    abi: ammFactoryAbi,
    functionName: "getPair",
    args: token && isAddress(token) ? [token as `0x${string}`, contracts.wqie] : undefined,
    query: { enabled: contracts.ammFactory !== ZERO_ADDRESS && isAddress(token) },
  });

  async function onTok(v: string) {
    setAmtTok(v);
    if (!client || !isAddress(token) || pair.data === ZERO_ADDRESS) return;
    try {
      const [rA, rB] = await client.readContract({
        address: contracts.ammRouter,
        abi: ammRouterAbi,
        functionName: "getReserves",
        args: [token as `0x${string}`, contracts.wqie],
      });
      const a = parseAmount(v);
      if (rA > 0n) setAmtQie(formatAmount((a * rB) / rA, 18, 6));
    } catch {
      /* empty pool */
    }
  }

  async function submit() {
    if (!address || !client || !isAddress(token)) return;
    const tok = parseAmount(amtTok);
    const qieAmt = parseAmount(amtQie);
    try {
      const allowance = await client.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, contracts.ammRouter],
      });
      if (allowance < tok) {
        const ah = await writeContractAsync({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.ammRouter, tok],
        });
        toastPending(ah);
        await client.waitForTransactionReceipt({ hash: ah });
      }
      const hash = await writeContractAsync({
        address: contracts.ammRouter,
        abi: ammRouterAbi,
        functionName: "addLiquidityQIE",
        args: [token as `0x${string}`, tok, 0n, 0n, address, BigInt(Math.floor(Date.now() / 1000) + 1200)],
        value: qieAmt,
      });
      toastPending(hash);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "liquidity added");
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-sm border border-line bg-elev p-4">
      <label className="block font-mono text-[12px] text-muted">
        token
        <select
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        >
          <option value="">select</option>
          {launchpad.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol} / {t.name}
            </option>
          ))}
          {pools
            .filter((p) => !launchpad.some((t) => t.address.toLowerCase() === p.token0.toLowerCase() || t.address.toLowerCase() === p.token1.toLowerCase()))
            .map((p) => (
              <option key={p.address} value={p.token0 === contracts.wqie ? p.token1 : p.token0}>
                {p.symbol0}/{p.symbol1}
              </option>
            ))}
        </select>
      </label>
      <label className="block font-mono text-[12px] text-muted">
        token amount
        <input
          value={amtTok}
          onChange={(e) => onTok(e.target.value)}
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        />
      </label>
      <label className="block font-mono text-[12px] text-muted">
        qie amount
        <input
          value={amtQie}
          onChange={(e) => setAmtQie(e.target.value)}
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        />
      </label>
      {!isConnected ? (
        <p className="font-mono text-xs text-muted">connect wallet</p>
      ) : chainId !== network.id ? (
        <AddChainButton />
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="w-full rounded-sm bg-accent py-2 font-mono text-sm text-black"
        >
          {isPending ? "pending…" : "add liquidity"}
        </button>
      )}
    </div>
  );
}

function RemoveLiquidity({ pools }: { pools: PoolRecord[] }) {
  const { network } = useNetwork();
  const contracts = contractsFor(network.key);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [pair, setPair] = useState("");
  const [pct, setPct] = useState(50);

  async function submit() {
    if (!address || !client || !isAddress(pair)) return;
    const pool = pools.find((p) => p.address.toLowerCase() === pair.toLowerCase());
    if (!pool) return;
    try {
      const bal = await client.readContract({
        address: pair as `0x${string}`,
        abi: ammPairAbi,
        functionName: "balanceOf",
        args: [address],
      });
      const liq = (bal * BigInt(pct)) / 100n;
      const allowance = await client.readContract({
        address: pair as `0x${string}`,
        abi: ammPairAbi,
        functionName: "allowance",
        args: [address, contracts.ammRouter],
      });
      if (allowance < liq) {
        const ah = await writeContractAsync({
          address: pair as `0x${string}`,
          abi: ammPairAbi,
          functionName: "approve",
          args: [contracts.ammRouter, liq],
        });
        toastPending(ah);
        await client.waitForTransactionReceipt({ hash: ah });
      }
      const token = pool.token0.toLowerCase() === contracts.wqie.toLowerCase() ? pool.token1 : pool.token0;
      const hash = await writeContractAsync({
        address: contracts.ammRouter,
        abi: ammRouterAbi,
        functionName: "removeLiquidityQIE",
        args: [token, liq, 0n, 0n, address, BigInt(Math.floor(Date.now() / 1000) + 1200)],
      });
      toastPending(hash);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "liquidity removed");
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-sm border border-line bg-elev p-4">
      <label className="block font-mono text-[12px] text-muted">
        position
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        >
          <option value="">select pool</option>
          {pools.map((p) => (
            <option key={p.address} value={p.address}>
              {p.symbol0}/{p.symbol1} · {shortAddress(p.address)}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-mono text-[12px] text-muted">
        withdraw {pct}%
        <input
          type="range"
          min={1}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </label>
      {!isConnected ? (
        <p className="font-mono text-xs text-muted">connect wallet</p>
      ) : chainId !== network.id ? (
        <AddChainButton />
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="w-full rounded-sm bg-elev-2 py-2 font-mono text-sm"
        >
          {isPending ? "pending…" : "remove liquidity"}
        </button>
      )}
    </div>
  );
}

function CreatePool() {
  const { network } = useNetwork();
  const contracts = contractsFor(network.key);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState<string>(contracts.wqie);

  async function submit() {
    if (!address || !client || !isAddress(tokenA) || !isAddress(tokenB)) return;
    try {
      const existing = await client.readContract({
        address: contracts.ammFactory,
        abi: ammFactoryAbi,
        functionName: "getPair",
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
      });
      if (existing !== ZERO_ADDRESS) {
        toastFail(new Error("pool already exists"));
        return;
      }
      const hash = await writeContractAsync({
        address: contracts.ammFactory,
        abi: ammFactoryAbi,
        functionName: "createPair",
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
      });
      toastPending(hash);
      await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "pool created");
    } catch (e) {
      toastFail(e);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-sm border border-line bg-elev p-4">
      <p className="font-mono text-[12px] text-muted">
        create a pair via the amm factory. seed it afterwards from add liquidity.
      </p>
      <label className="block font-mono text-[12px] text-muted">
        token a
        <input
          value={tokenA}
          onChange={(e) => setTokenA(e.target.value)}
          placeholder="0x…"
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        />
      </label>
      <label className="block font-mono text-[12px] text-muted">
        token b
        <input
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          className="mt-1 w-full rounded-sm border border-line bg-bg px-2 py-2 text-ink"
        />
      </label>
      {!isConnected ? (
        <p className="font-mono text-xs text-muted">connect wallet</p>
      ) : chainId !== network.id ? (
        <AddChainButton />
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="w-full rounded-sm bg-accent py-2 font-mono text-sm text-black"
        >
          {isPending ? "pending…" : "create pool"}
        </button>
      )}
    </div>
  );
}
