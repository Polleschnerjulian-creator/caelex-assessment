"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ProblemStatement() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative min-h-[70vh] flex items-center justify-center px-6 md:px-12 py-32 bg-black"
      aria-label="Problem statement"
    >
      {/* Section number */}
      <motion.div
        initial={false}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
        aria-hidden="true"
      >
        <span className="text-caption text-white/25">02 / 12</span>
      </motion.div>

      <div className="max-w-[1000px] mx-auto">
        {/* Large statement */}
        <motion.h2
          initial={false}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[clamp(1.5rem,4vw,3rem)] font-light tracking-[-0.02em] leading-[1.35] text-white/90"
        >
          The EU Space Act introduces the most comprehensive regulatory
          framework for commercial space operations in history.{" "}
          <span className="text-white/45">
            From authorization requirements to debris mitigation, cybersecurity
            mandates to environmental footprint declarations — understanding
            what applies to your mission is no longer optional.
          </span>
        </motion.h2>

        {/* Subtle divider */}
        <motion.div
          initial={false}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-16 h-[1px] bg-white/20 mt-16 origin-left"
        />

        {/* Small supporting text */}
        <motion.p
          initial={false}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-body text-white/45 mt-8 max-w-[400px]"
        >
          Effective January 1, 2030. Applicable to all operators launching from,
          or providing services within, the European Union.
        </motion.p>
      </div>
    </section>
  );
}
