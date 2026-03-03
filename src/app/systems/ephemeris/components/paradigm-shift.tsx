"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ParadigmShift() {
  return (
    <section className="py-24 md:py-36 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-[720px] mx-auto px-6 md:px-12">
        <Section className="text-center">
          {/* Before → After */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-14"
          >
            {/* Before */}
            <div className="text-center sm:text-right flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF] mb-2">
                Before
              </p>
              <p
                className="font-bold tracking-[-0.02em] text-[#9CA3AF]"
                style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
              >
                &ldquo;82% compliant&rdquo;
              </p>
              <p className="text-[13px] text-[#9CA3AF] mt-2">
                A number. Today. Static.
              </p>
            </div>

            {/* Arrow */}
            <div
              className="font-mono text-[#111827] flex-shrink-0"
              style={{ fontSize: "clamp(24px, 4vw, 36px)" }}
            >
              →
            </div>

            {/* After */}
            <div className="text-center sm:text-left flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#111827] mb-2">
                After
              </p>
              <p
                className="font-bold tracking-[-0.02em] text-[#111827]"
                style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
              >
                &ldquo;847 days to first breach&rdquo;
              </p>
              <p className="text-[13px] text-[#4B5563] mt-2">
                A trajectory. Forward. Actionable.
              </p>
            </div>
          </motion.div>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            className="text-[15px] text-[#4B5563] leading-[1.75] max-w-[640px] mx-auto"
          >
            Ephemeris replaces the mirror with a telescope. It doesn&apos;t look
            at the current state — it computes the future state. For every
            regulation, every satellite, every day of the next five years.
          </motion.p>
        </Section>
      </div>
    </section>
  );
}
