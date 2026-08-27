// Fixed, hand-placed particle set — not Math.random(): this can render on
// the server, and a random layout would mismatch on hydration.
const PARTICLES = [
  { x: 8, y: 18, size: 3, dur: 14, delay: 0, kind: "dot" },
  { x: 22, y: 62, size: 2, dur: 18, delay: 2, kind: "dot" },
  { x: 38, y: 12, size: 14, rot: 24, dur: 16, delay: 1, kind: "line" },
  { x: 52, y: 74, size: 2, dur: 20, delay: 3, kind: "dot" },
  { x: 68, y: 30, size: 18, rot: -18, dur: 15, delay: 0.5, kind: "line" },
  { x: 78, y: 66, size: 3, dur: 17, delay: 4, kind: "dot" },
  { x: 88, y: 20, size: 2, dur: 19, delay: 1.5, kind: "dot" },
  { x: 14, y: 84, size: 12, rot: 40, dur: 21, delay: 2.5, kind: "line" },
  { x: 92, y: 78, size: 2, dur: 13, delay: 3.5, kind: "dot" },
  { x: 46, y: 40, size: 3, dur: 22, delay: 0.8, kind: "dot" },
] as const;

/** Slow-drifting dust of dots and line shards — atmosphere behind the hero,
 *  not meant to draw the eye on its own. */
export function ParticleDrift({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden text-accent ${className}`} aria-hidden="true">
      {PARTICLES.map((p, i) =>
        p.kind === "dot" ? (
          <span
            key={i}
            className="particle-drift absolute rounded-full bg-current opacity-40"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ) : (
          <span
            key={i}
            className="particle-drift absolute bg-current opacity-25"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: 1,
                height: p.size,
                // The drift keyframes animate `transform` too, which would
                // otherwise clobber a plain inline rotate() on every frame —
                // route the static rotation through a custom property the
                // keyframes read instead.
                "--rot": `${p.rot}deg`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ),
      )}
    </div>
  );
}
