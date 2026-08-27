/** A strip of price ticks — market activity across the suite. Heights are a
 *  fixed hand-picked sequence, not Math.random(): this renders on the server
 *  and a random sequence would mismatch on hydration. */
const TICKS = [22, 38, 18, 54, 30, 64, 26, 46, 70, 34, 20, 58, 42, 16, 50, 62, 28, 44, 36, 20, 56, 32, 24, 48];

export function CandleTicksMotif({ className }: { className?: string }) {
  const w = 24;
  const gap = 14;
  const baseline = 100;
  return (
    <svg viewBox={`0 0 ${TICKS.length * (w + gap)} 220`} fill="none" className={className} aria-hidden="true">
      {TICKS.map((h, i) => {
        const x = i * (w + gap);
        const up = i % 3 !== 0;
        return (
          <g key={i} opacity={0.35 + (h / 70) * 0.4}>
            <line x1={x + w / 2} y1={baseline - h - 14} x2={x + w / 2} y2={baseline + h * 0.4} stroke="currentColor" strokeWidth="1.5" />
            <rect
              x={x}
              y={up ? baseline - h : baseline}
              width={w}
              height={h}
              fill="currentColor"
              opacity={up ? 0.5 : 0.25}
            />
          </g>
        );
      })}
    </svg>
  );
}
