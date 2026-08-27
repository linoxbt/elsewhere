/** Minimal browser-chrome frame around a real product screenshot — three
 *  dots + a path label, nothing skeuomorphic. The screenshots themselves are
 *  captured straight from the running app (see public/shots/), not stock art. */
export function BrowserFrame({
  src,
  path,
  className = "",
  priority = false,
}: {
  src: string;
  path: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-sm border border-line bg-elev shadow-[0_20px_60px_rgba(0,0,0,0.4)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line bg-elev-2 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="ml-2 truncate font-mono text-[10px] text-faint">elsewhere.qie{path}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Elsewhere — ${path.replace("/", "")}`}
        width={1440}
        height={640}
        loading={priority ? "eager" : "lazy"}
        className="block h-auto w-full"
      />
    </div>
  );
}
