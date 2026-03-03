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
    <section className="relative py-32 md:py-48 bg-white border-t border-[#E5E7EB] overflow-hidden">
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
            <span className="text-[#111827]">Compliance was a mirror.</span>
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="font-bold leading-[1.1] tracking-[-0.03em] mt-2"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
          >
            <span className="text-[#9CA3AF]">
              Ephemeris makes it a telescope.
            </span>
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="font-mono text-[12px] text-[#9CA3AF] tracking-[0.05em] mt-10"
          >
            Predict compliance risk, from today to end-of-life.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
