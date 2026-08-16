"use client";

import { addressGradient } from "@/lib/metadata";
import { cn } from "@/lib/format";

export function TokenImage({
  src,
  address,
  symbol,
  size = 40,
  className,
}: {
  src?: string;
  address: string;
  symbol?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-sm border border-line", className)}
      style={{ width: size, height: size, background: addressGradient(address) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={symbol || ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase text-white/80">
          {(symbol || "?").slice(0, 3)}
        </span>
      )}
    </div>
  );
}
