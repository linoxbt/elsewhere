/** Six nodes around a hub — one per product surface (launch, discover, swap,
 *  pools, lend, send), all routed through the same protocol core. */
export function NetworkNodesMotif({ className }: { className?: string }) {
  const hub = [450, 450];
  const nodes = [
    [450, 140],
    [710, 290],
    [710, 610],
    [450, 760],
    [190, 610],
    [190, 290],
  ];
  return (
    <svg viewBox="0 0 900 900" fill="none" className={className} aria-hidden="true">
      {nodes.map(([x, y]) => (
        <line key={`l${x}${y}`} x1={hub[0]} y1={hub[1]} x2={x} y2={y} stroke="currentColor" strokeWidth="1.25" opacity="0.35" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={`n${x}${y}`} cx={x} cy={y} r={i % 2 === 0 ? 8 : 6} fill="currentColor" opacity="0.7" />
      ))}
      <circle cx={hub[0]} cy={hub[1]} r="12" fill="currentColor" />
      <circle cx={hub[0]} cy={hub[1]} r="34" stroke="currentColor" strokeWidth="1.25" opacity="0.3" />
    </svg>
  );
}
