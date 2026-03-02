"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Words that should appear in muted gray (like Palantir's "AI-driven" highlight)
const HIGHLIGHT_WORDS = new Set(["AI-driven"]);

const STATEMENT =
  "Our software operationalizes global space regulation at machine speed – powering real-time, AI-driven compliance for every entity in the orbital economy.";

const CHAR_DELAY = 0.006;

export default function MissionStatement() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const words = STATEMENT.split(" ");

  let globalIndex = 0;

  return (
    <section className="bg-white py-32 md:py-44">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div ref={ref}>
          <p className="text-[clamp(2.25rem,5.5vw,4.75rem)] font-medium leading-[1.15] tracking-[-0.035em]">
            {words.map((word, wordIdx) => {
              const chars = word.split("");
              const isHighlight = HIGHLIGHT_WORDS.has(word);
              const colorClass = isHighlight
                ? "text-[#C0C5CF]"
                : "text-[#111827]";

              const wordElement = (
                <span key={wordIdx} className="inline-block whitespace-nowrap">
                  {chars.map((char) => {
                    const charIdx = globalIndex++;
                    return (
                      <motion.span
                        key={charIdx}
                        className={`inline-block ${colorClass}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={
                          isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
                        }
                        transition={{
                          duration: 0.03,
                          delay: charIdx * CHAR_DELAY,
                          ease: "easeOut",
                        }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </span>
              );

              if (wordIdx < words.length - 1) {
                const spaceIdx = globalIndex++;
                return (
                  <span key={`w-${wordIdx}`}>
                    {wordElement}
                    <motion.span
                      key={`s-${spaceIdx}`}
                      className="inline-block"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{
                        duration: 0.01,
                        delay: spaceIdx * CHAR_DELAY,
                      }}
                    >
                      &nbsp;
                    </motion.span>
                  </span>
                );
              }

              return wordElement;
            })}
            <motion.span
              className="inline-block w-[3px] h-[0.85em] bg-[#111827] ml-1 align-baseline relative top-[0.05em]"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: [0, 0, 1, 1] } : { opacity: 0 }}
              transition={
                isInView
                  ? {
                      delay: globalIndex * CHAR_DELAY,
                      duration: 0.8,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "steps(1)",
                    }
                  : {}
              }
            />
          </p>
        </div>
      </div>
    </section>
  );
}
