"use client";

import { toast } from "sonner";
import type { Address, PublicClient } from "viem";
import { erc20Abi } from "@/lib/abi/launchpad";

export function toastPending(hash?: string, explorerBase?: string) {
  const url = hash && explorerBase ? `${explorerBase}/tx/${hash}` : hash;
  toast.message("pending", {
    description: url || "confirm in wallet",
    action:
      url && explorerBase
        ? { label: "explorer", onClick: () => window.open(url, "_blank") }
        : undefined,
  });
}

export function toastSuccess(hash?: string, label = "confirmed", explorerBase?: string) {
  const url = hash && explorerBase ? `${explorerBase}/tx/${hash}` : undefined;
  toast.success(label, {
    description: url,
    action: url ? { label: "explorer", onClick: () => window.open(url, "_blank") } : undefined,
  });
}

export function toastFail(err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "shortMessage" in err
        ? String((err as { shortMessage: string }).shortMessage)
        : "transaction failed";
  toast.error(msg.slice(0, 180));
}

/**
 * Approve `spender` for `amt` of `token` if the current allowance is
 * insufficient, and — critically — wait for that approval to actually be
 * mined before returning. Callers that fire the next tx (e.g. repay/borrow)
 * immediately after an unconfirmed approve will frequently revert on chains
 * with any real block latency, since the allowance isn't live yet.
 */
export async function maybeApprove(
  token: Address,
  spender: Address,
  amt: bigint,
  owner: Address,
  client: PublicClient,
  write: (args: {
    address: Address;
    abi: typeof erc20Abi;
    functionName: "approve";
    args: readonly [Address, bigint];
  }) => Promise<`0x${string}`>,
) {
  const allowance = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowance >= amt) return;
  const hash = await write({
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amt],
  });
  toastPending(hash);
  await client.waitForTransactionReceipt({ hash });
}
