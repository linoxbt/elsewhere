"use client";

import { toast } from "sonner";

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
