/** The core launch mechanic, drawn: constant-product price curve rising from
 *  a wide virtual-liquidity base to a steep graduation point, with tick marks
 *  where trades land. Not decorative — this is the actual shape of the curve
 *  in contracts/src/BondingCurve.sol. */
export function BondingCurveMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 640" fill="none" className={className} aria-hidden="true">
      <path
        d="M -40 560 C 220 560, 420 540, 560 460 C 700 380, 760 250, 860 150 C 940 68, 1040 20, 1240 -20"
        stroke="currentColor"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M -40 560 C 220 560, 420 540, 560 460 C 700 380, 760 250, 860 150 C 940 68, 1040 20, 1240 -20 L 1240 680 L -40 680 Z"
        fill="currentColor"
        opacity="0.06"
      />
      {[
        [40, 556],
        [300, 552],
        [560, 460],
        [760, 260],
        [940, 60],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="5" fill="currentColor" />
      ))}
    </svg>
  );
}
