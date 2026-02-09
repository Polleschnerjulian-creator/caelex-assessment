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
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">02 / 12</span>
      </motion.div>

      <div className="max-w-[1000px] mx-auto">
        {/* Large statement */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[clamp(1.5rem,4vw,3rem)] font-light tracking-[-0.02em] leading-[1.35] text-white/90"
        >
          The EU Space Act introduces the most comprehensive regulatory
          framework for commercial space operations in history.{" "}
          <span className="text-white/40">
            From authorization requirements to debris mitigation, cybersecurity
            mandates to environmental footprint declarations — understanding
            what applies to your mission is no longer optional.
          </span>
        </motion.p>

        {/* Subtle divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-16 h-[1px] bg-white/20 mt-16 origin-left"
        />

        {/* Small supporting text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-[13px] text-white/40 mt-8 max-w-[400px]"
        >
          Effective January 1, 2030. Applicable to all operators launching from,
          or providing services within, the European Union.
        </motion.p>
      </div>
    </section>
  );
}
