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

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-36 bg-[#F7F8FA]">
      <div className="max-w-[720px] mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#9CA3AF] mb-4"
          >
            The Problem
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] mb-10"
          >
            <span className="text-[#111827]">Compliance is a mirror.</span>
            <br />
            <span className="text-[#9CA3AF]">You only see today.</span>
          </motion.h2>

          <motion.div
            variants={fadeUp}
            className="space-y-6 text-[15px] text-[#4B5563] leading-[1.75]"
          >
            <p>
              Your satellite is 94% compliant. Three gaps, two warnings. A
              snapshot — frozen in time. What it doesn&apos;t show: fuel
              consumption running 12% above planned rate. Orbit altitude
              decaying faster than predicted. Thruster B reporting intermittent
              degradation. Cybersecurity certification expiring in 47 days with
              an 8-week renewal lead time.
            </p>

            <p>
              Every one of these is a surprise today. The operator learns when
              it happens — not before.
            </p>

            <p
              className="text-[#111827] font-semibold"
              style={{ fontSize: "clamp(17px, 2vw, 20px)" }}
            >
              Ephemeris eliminates surprises.
            </p>
          </motion.div>
        </Section>
      </div>
    </section>
  );
}
