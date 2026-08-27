/** Seamless looping strip — duplicates its items once so the CSS animation
 *  (translateX -50%) can loop without a visible seam. Pauses on hover. */
export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="marquee-viewport overflow-hidden">
      <div className="marquee-track flex w-max items-center gap-10">
        {loop.map((item, i) => (
          <span
            key={i}
            className="font-mono text-[12px] uppercase tracking-[0.22em] text-faint whitespace-nowrap sm:text-[13px]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
