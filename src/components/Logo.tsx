import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 text-ink sm:gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.jpg"
        alt=""
        width={40}
        height={40}
        className="h-8 w-8 rounded-sm object-cover sm:h-10 sm:w-10"
      />
      {!compact && (
        <span className="truncate font-mono text-[16px] tracking-tight sm:text-[19px]">elsewhere</span>
      )}
    </Link>
  );
}
