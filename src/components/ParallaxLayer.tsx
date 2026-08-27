"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Moves its children vertically (and optionally scales/fades them) as the
 * viewport scrolls past — the depth cue that separates background watermark
 * motifs from foreground content. `speed` > 0 drifts down slower than the
 * page (background feel); `speed` < 0 drifts up faster (foreground feel).
 */
export function ParallaxLayer({
  children,
  speed = 60,
  fade = false,
  scaleFrom,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  fade?: boolean;
  scaleFrom?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-speed, speed]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], fade && !reduced ? [0, 1, 1, 0] : [1, 1, 1, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], scaleFrom && !reduced ? [scaleFrom, 1, scaleFrom] : [1, 1, 1]);

  return (
    <motion.div ref={ref} style={{ y, opacity, scale }} className={className}>
      {children}
    </motion.div>
  );
}
