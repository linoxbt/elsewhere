"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type Variant = "up" | "scale" | "left" | "right";

const EASE = [0.22, 1, 0.36, 1] as const;

function variantsFor(variant: Variant): Variants {
  switch (variant) {
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.92 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: EASE } },
      };
    case "left":
      return {
        hidden: { opacity: 0, x: -32 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: EASE } },
      };
    case "right":
      return {
        hidden: { opacity: 0, x: 32 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: EASE } },
      };
    case "up":
    default:
      return {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
      };
  }
}

/** Plays a variant transition the first time a section scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  variant = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: Variant;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const variants = variantsFor(variant);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -60px 0px" }}
      variants={variants}
      transition={{ delay: delay / 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
