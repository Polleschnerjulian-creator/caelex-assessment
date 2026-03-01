"use client";

import { forwardRef } from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";

// Exportable Framer Motion variants for glass card entrance
export const glassItemVariants: Variants = {
  hidden: {},
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Reduced motion: no animation, instant render
const noMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

interface GlassMotionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

/**
 * GlassMotion — Reusable entrance animation wrapper for glass cards.
 * Animates: opacity 0→1, y 12→0, scale 0.98→1, 500ms ease.
 * Respects prefers-reduced-motion.
 */
const GlassMotion = forwardRef<HTMLDivElement, GlassMotionProps>(
  ({ children, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        variants={shouldReduceMotion ? noMotionVariants : glassItemVariants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

GlassMotion.displayName = "GlassMotion";

interface GlassStaggerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  /** Delay between each child animation in seconds (default: 0.05) */
  staggerDelay?: number;
}

/**
 * GlassStagger — Staggered children wrapper.
 * Wrap multiple GlassMotion or motion.div children to stagger their entrance.
 */
const GlassStagger = forwardRef<HTMLDivElement, GlassStaggerProps>(
  ({ children, staggerDelay = 0.05, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const variants: Variants = shouldReduceMotion
      ? noMotionVariants
      : {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        };

    return (
      <motion.div
        ref={ref}
        variants={variants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

GlassStagger.displayName = "GlassStagger";

export { GlassMotion, GlassStagger };
export default GlassMotion;
