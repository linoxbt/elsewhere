/** AMM pool depth as concentric rings — two overlapping centers, like the
 *  reserves of a two-sided pool settling toward each other. */
export function LiquidityRingsMotif({ className }: { className?: string }) {
  const ringsA = [60, 140, 220, 300];
  const ringsB = [50, 110, 170];
  return (
    <svg viewBox="0 0 900 900" fill="none" className={className} aria-hidden="true">
      {ringsA.map((r) => (
        <circle key={`a${r}`} cx="320" cy="420" r={r} stroke="currentColor" strokeWidth="1.5" opacity={0.5 - r / 700} />
      ))}
      {ringsB.map((r) => (
        <circle key={`b${r}`} cx="620" cy="260" r={r} stroke="currentColor" strokeWidth="1.5" opacity={0.4 - r / 500} />
      ))}
      <circle cx="320" cy="420" r="6" fill="currentColor" />
      <circle cx="620" cy="260" r="6" fill="currentColor" />
    </svg>
  );
}
