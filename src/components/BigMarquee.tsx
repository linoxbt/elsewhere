import { Crosshair } from "./Crosshair";

/** Oversized looping word strip — the product's own verbs at a scale big
 *  enough to read as graphic content, not just a label list. */
export function BigMarquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="marquee-viewport overflow-hidden">
      <div className="marquee-track flex w-max items-center gap-10 sm:gap-14">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-10 sm:gap-14">
            <span className="font-mono text-[15vw] leading-none tracking-tight text-ink/90 sm:text-[9vw] lg:text-[110px]">
              {item}
            </span>
            <Crosshair className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          </span>
        ))}
      </div>
    </div>
  );
}
