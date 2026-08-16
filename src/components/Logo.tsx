import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.jpg"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-sm object-cover"
      />
      {!compact && (
        <span className="font-mono text-[15px] tracking-tight">elsewhere</span>
      )}
    </Link>
  );
}
