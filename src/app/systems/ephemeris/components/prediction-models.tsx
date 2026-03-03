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

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

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

const MODELS = [
  {
    number: "/01",
    icon: "◎",
    title: "Orbital Decay",
    description:
      "Semi-analytical atmospheric drag model. Propagates altitude day-by-day using NOAA solar flux data. Predicts when orbital lifetime crosses the 25-year limit.",
    tag: "SGP4 + NRLMSISE-00 + F10.7",
  },
  {
    number: "/02",
    icon: "◉",
    title: "Fuel Depletion",
    description:
      "Linear regression on historical Sentinel data. Separates nominal stationkeeping, collision avoidance burns, and anomaly corrections into three projection scenarios.",
    tag: "Art. 70 · Art. 72 · Art. 64 · IADC",
  },
  {
    number: "/03",
    icon: "◈",
    title: "Subsystem Degradation",
    description:
      "Thruster failure probability from DEGRADED event frequency. Battery capacity loss and solar array degradation from long-term trend analysis.",
    tag: "Weibull + Trend Analysis",
  },
  {
    number: "/04",
    icon: "◇",
    title: "Deadline Events",
    description:
      "Tracks every calendar-based compliance obligation — certificate expiry, penetration tests, insurance renewals, frequency licenses — with lead time warnings.",
    tag: "NIS2 Art. 21 · Art. 23 · ITU RR",
  },
  {
    number: "/05",
    icon: "◆",
    title: "Regulatory Change",
    description:
      "Monitors EUR-Lex and national legislators for updates. Calculates the impact on every satellite the day a new regulation is published.",
    tag: "EUR-Lex SPARQL + Module Mapping",
  },
];

export default function PredictionModels() {
  return (
    <section className="py-24 md:py-36 bg-[#030712] border-t border-[#1F2937]">
      <div className="max-w-[960px] mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#4B5563] mb-4"
          >
            Five Prediction Models
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#F9FAFB] mb-4"
          >
            Physics. Statistics. Regulation.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-[15px] text-[#6B7280] leading-relaxed max-w-2xl mb-14"
          >
            No machine learning. No black boxes. Deterministic models grounded
            in orbital mechanics, classical statistics, and codified regulatory
            knowledge.
          </motion.p>
        </Section>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODELS.map((model) => (
            <Section key={model.number}>
              <motion.div
                variants={fadeUp}
                className="group rounded-xl p-6 h-full transition-all duration-300"
                style={{
                  background: "#0A0F1A",
                  border: "1px solid #1F2937",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "#111827";
                  el.style.borderColor = "rgba(16,185,129,0.4)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "#0A0F1A";
                  el.style.borderColor = "#1F2937";
                }}
              >
                {/* Number + Icon */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-[12px] text-[#065F46] tracking-wider">
                    {model.number}
                  </span>
                  <span className="text-[18px] text-[#10B981] opacity-60">
                    {model.icon}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-bold text-[#F9FAFB] mb-3">
                  {model.title}
                </h3>

                {/* Description */}
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-4">
                  {model.description}
                </p>

                {/* Tag */}
                <span
                  className="inline-block font-mono text-[10px] font-semibold tracking-[0.05em] px-2.5 py-1 rounded-full"
                  style={{
                    color: "#10B981",
                    background: "rgba(16,185,129,0.08)",
                  }}
                >
                  {model.tag}
                </span>
              </motion.div>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
}
