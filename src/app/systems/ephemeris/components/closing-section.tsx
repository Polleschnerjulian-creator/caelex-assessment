"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

export default function ClosingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative py-32 md:py-48 bg-[#030712] border-t border-[#1F2937] overflow-hidden">
      {/* Radial emerald glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[720px] mx-auto px-6 md:px-12 text-center">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            className="font-bold leading-[1.1] tracking-[-0.03em]"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
          >
            <span className="text-[#F9FAFB]">Compliance was a mirror.</span>
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="font-bold leading-[1.1] tracking-[-0.03em] mt-2"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
          >
            <span className="text-[#10B981]">
              Ephemeris makes it a telescope.
            </span>
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="font-mono text-[12px] text-[#4B5563] tracking-[0.05em] mt-10"
          >
            Predict compliance risk, from today to end-of-life.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
