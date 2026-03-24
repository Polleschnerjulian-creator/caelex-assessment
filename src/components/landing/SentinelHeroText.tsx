"use client";

import { motion } from "framer-motion";

export default function SentinelHeroText() {
  const letters = "SENTINEL".split("");

  return (
    <div>
      <h1
        className="font-display font-bold uppercase leading-[0.85]"
        style={{
          fontSize: "clamp(5rem, 16vw, 14rem)",
          letterSpacing: "-0.03em",
          color: "#ffffff",
        }}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.03,
              delay: 0.3 + i * 0.05,
              ease: "easeOut",
            }}
            className="inline-block"
          >
            {letter}
          </motion.span>
        ))}
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="font-body uppercase mt-3"
        style={{
          fontSize: "clamp(12px, 1.2vw, 16px)",
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Autonomous Compliance Data Collection
      </motion.p>
    </div>
  );
}
