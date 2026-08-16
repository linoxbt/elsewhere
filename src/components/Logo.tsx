import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.jpg"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 rounded-sm object-cover"
      />
      {!compact && (
        <span className="font-mono text-[18px] tracking-tight">elsewhere</span>
      )}
    </Link>
  );
}
