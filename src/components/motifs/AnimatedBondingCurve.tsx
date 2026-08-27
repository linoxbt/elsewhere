"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Hero-only: the bonding curve draws itself in on load, then holds as a
 *  watermark. Same path as BondingCurveMotif so the two read as the same
 *  object reappearing later in the page. */
export function AnimatedBondingCurveMotif({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const d = "M -40 560 C 220 560, 420 540, 560 460 C 700 380, 760 250, 860 150 C 940 68, 1040 20, 1240 -20";
  return (
    <svg viewBox="0 0 1200 640" fill="none" className={className} aria-hidden="true">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
      <motion.path
        d={`${d} L 1240 680 L -40 680 Z`}
        fill="currentColor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.06 }}
        transition={{ duration: 1.2, delay: 1.1 }}
      />
    </svg>
  );
}
