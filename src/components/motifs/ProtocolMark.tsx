/** An expanded, abstract companion to Elsewhere's own circle+line mark —
 *  orbit rings around a stem, not a literal trace of the logo file. Built to
 *  be the one large object that stays present across the top of the page,
 *  the way a persistent brand object anchors a lot of premium studio sites. */
export function ProtocolMarkMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" fill="none" className={className} aria-hidden="true">
      <circle cx="400" cy="400" r="260" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <circle cx="400" cy="400" r="200" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="400" cy="400" r="340" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M 520 260 A 220 220 0 1 0 520 540" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="400" y1="140" x2="400" y2="660" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="400" cy="140" r="6" fill="currentColor" />
      <circle cx="400" cy="660" r="6" fill="currentColor" />
      <circle cx="520" cy="260" r="4" fill="currentColor" />
      <circle cx="520" cy="540" r="4" fill="currentColor" />
    </svg>
  );
}
