/** Small "+" tick mark — a recurring detail at section seams and divider
 *  midpoints, standing in for a frame/target-mark motif. */
export function Crosshair({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 text-faint ${className}`} aria-hidden="true">
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
