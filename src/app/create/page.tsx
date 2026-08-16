"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { decodeEventLog, formatEther, parseEther } from "viem";
import { launchpadFactoryAbi } from "@/lib/abi/launchpad";
import { contractsFor, explorerAddress, isLaunchpadDeployed, oracleFor, PROTOCOL } from "@/lib/config";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount, formatUsd } from "@/lib/format";
import { creationFeeQieFromOracle, formatOracleAge } from "@/lib/oracle";
import { toastFail, toastPending, toastSuccess } from "@/lib/tx";
import { AddChainButton } from "@/components/AddChainButton";
import { useOracle } from "@/hooks/useOracle";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { data: oracle, isError: oracleError } = useOracle();
  const { network } = useNetwork();
  const contracts = contractsFor(network.key);
  const oracleAddr = oracleFor(network);

  const { data: feeOnChain } = useReadContract({
    address: contracts.launchpadFactory,
    abi: launchpadFactoryAbi,
    functionName: "creationFeeQie",
    query: { enabled: isLaunchpadDeployed(network.key) },
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [telegram, setTelegram] = useState("");
  const [initialBuy, setInitialBuy] = useState("");
  const [busy, setBusy] = useState(false);

  const feeFromOracle = oracle && !oracle.stale ? creationFeeQieFromOracle(oracle.usd8) : 0n;
  const feeQie = feeOnChain ?? feeFromOracle;
  const qieUsd = oracle && !oracle.stale ? oracle.usd : 0;
  const feeUsd = feeQie > 0n && qieUsd > 0 ? Number(formatEther(feeQie)) * qieUsd : 0;

  async function onFile(f?: File) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toastFail(new Error("max 5MB"));
      return;
    }
    const compact = await compressImage(f);
    setImageFile(compact);
    setPreview(URL.createObjectURL(compact));
  }

  async function compressImage(file: File): Promise<File> {
    try {
      const bmp = await createImageBitmap(file);
      const max = 512;
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    } catch {
      return file;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !client) return;
    if (!twitter.trim() && !website.trim()) {
      toastFail(new Error("need twitter/x or a website"));
      return;
    }
    if (!imageFile) {
      toastFail(new Error("image required"));
      return;
    }
    setBusy(true);
    try {
      let imageUri = "";
      try {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const json = (await up.json()) as { uri?: string };
          imageUri = json.uri ?? "";
        }
      } catch {
        /* fall through to local data uri */
      }
      if (!imageUri) {
        imageUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("could not read image"));
          reader.readAsDataURL(imageFile);
        });
      }

      const metaRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          symbol: symbol.toUpperCase(),
          description,
          image: imageUri,
          twitter,
          website,
          telegram,
        }),
      });
      if (!metaRes.ok) throw new Error("metadata upload failed");
      const { uri } = await metaRes.json();

      const buy = initialBuy ? parseEther(initialBuy) : 0n;
      const value = (feeQie || 0n) + buy;
      toastPending();
      const hash = await writeContractAsync({
        address: contracts.launchpadFactory,
        abi: launchpadFactoryAbi,
        functionName: "createToken",
        args: [name, symbol.toUpperCase(), uri, buy],
        value,
      });
      toastPending(hash);
      const receipt = await client.waitForTransactionReceipt({ hash });
      toastSuccess(hash, "token launched");

      let tokenAddr: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: launchpadFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (parsed.eventName === "TokenCreated") {
            tokenAddr = (parsed.args as { token: string }).token;
          }
        } catch {
          /* skip */
        }
      }
      if (tokenAddr) router.push(`/token/${tokenAddr}`);
      else router.push("/");
    } catch (err) {
      toastFail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-mono text-2xl tracking-tight">create</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        deploy a token + bonding curve on qie. creation fee is paid in native QIE.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <label
          className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-line bg-elev text-xs text-muted hover:border-line-strong"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain p-2" />
          ) : (
            <span className="font-mono">drop png / jpg / gif · max 5mb</span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        <Field label="name" value={name} onChange={setName} required max={32} />
        <Field label="ticker" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} required max={16} />
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] text-muted">description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-sm border border-line bg-elev px-3 py-2 text-sm outline-none"
          />
        </label>
        <Field label="twitter / x" value={twitter} onChange={setTwitter} placeholder="https://x.com/…" />
        <Field label="website" value={website} onChange={setWebsite} placeholder="https://…" />
        <Field label="telegram (optional)" value={telegram} onChange={setTelegram} />
        <Field
          label="initial buy (qie, optional)"
          value={initialBuy}
          onChange={setInitialBuy}
          placeholder="0"
        />

        <div className="space-y-2 rounded-sm border border-line bg-elev p-4 font-mono text-[11px] leading-relaxed text-muted">
          <div className="text-ink">before you launch</div>
          <p>
            creation fee: {feeQie ? formatAmount(feeQie) : oracleError ? "oracle unavailable" : "reading oracle…"}{" "}
            QIE
            {feeUsd > 0 ? ` (${formatUsd(feeUsd, { subCent: true })})` : ""}, paid in{" "}
            <span className="text-ink">native QIE</span>. priced on-chain from the official QIE/USD feed so it
            stays ${PROTOCOL.creationFeeUsd.toFixed(2)}.
          </p>
          <p>
            live oracle:{" "}
            {oracle ? (
              <>
                {formatUsd(oracle.usd, { subCent: true })} / QIE · {formatOracleAge(oracle.ageSec)} ·{" "}
                <a href={explorerAddress(network, oracleAddr)} target="_blank" rel="noreferrer" className="text-accent">
                  {oracleAddr.slice(0, 6)}…{oracleAddr.slice(-4)}
                </a>
              </>
            ) : (
              "connecting to QIE/USD aggregator…"
            )}
          </p>
          <p>tokens launch on a bonding curve quoted in QIE / WQIE.</p>
          <p>
            at ${PROTOCOL.graduationMarketCapUsd.toLocaleString()} market cap (same live oracle, enforced in the
            bonding-curve contract), liquidity automatically migrates (“graduates”) to the amm.
          </p>
          <p>
            creators earn 0.425% on bonding-curve trades pre-graduation, and 0.4% on amm swap volume
            post-graduation.
          </p>
        </div>

        {!isConnected ? (
          <p className="font-mono text-xs text-muted">connect wallet to deploy</p>
        ) : chainId !== network.id ? (
          <AddChainButton />
        ) : !isLaunchpadDeployed(network.key) ? (
          <p className="font-mono text-xs text-muted">factory address not configured</p>
        ) : (
          <button
            type="submit"
            disabled={busy || isPending || (network.key === "mainnet" && (!oracle || oracle.stale))}
            className="w-full rounded-sm bg-accent py-2.5 font-mono text-sm text-black disabled:opacity-50"
          >
            {busy || isPending ? "deploying…" : "launch token"}
          </button>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={max}
        placeholder={placeholder}
        className="w-full rounded-sm border border-line bg-elev px-3 py-2 font-mono text-sm outline-none"
      />
    </label>
  );
}
