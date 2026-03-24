"use client";

import { motion } from "framer-motion";

export default function SentinelHeroText() {
  const letters = "SENTINEL".split("");

  return (
    <h1 className="font-display text-[clamp(4rem,12vw,10rem)] font-bold tracking-[-0.03em] text-white leading-[0.9] uppercase">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.04,
            delay: 0.3 + i * 0.06,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {letter}
        </motion.span>
      ))}
    </h1>
  );
}
