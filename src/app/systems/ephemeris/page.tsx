"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import EphemerisHero from "./components/ephemeris-hero";
import ProblemSection from "./components/problem-section";
import ParadigmShift from "./components/paradigm-shift";
import ForecastCurve from "./components/forecast-curve";
import PredictionModels from "./components/prediction-models";
import JurisdictionSection from "./components/jurisdiction-section";
import MoatSection from "./components/moat-section";
import ClosingSection from "./components/closing-section";

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

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

// ============================================================================
// PAGE
// ============================================================================

export default function EphemerisPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* SECTION 1: Hero */}
      <EphemerisHero />

      {/* SECTION 2: The Problem */}
      <ProblemSection />

      {/* SECTION 3: Paradigm Shift */}
      <ParadigmShift />

      {/* SECTION 4: Forecast Curve */}
      <section className="py-24 md:py-36 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[720px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#9CA3AF] mb-2"
            >
              Compliance Forecast Curve
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-[12px] text-[#6B7280] mb-8"
            >
              Fuel Reserve vs. Art. 70 Passivation Threshold — 5-Year Projection
            </motion.p>
          </Section>

          <ForecastCurve />

          <Section className="mt-6">
            <motion.p
              variants={fadeUp}
              className="text-[13px] text-[#6B7280] italic leading-relaxed"
            >
              Where the curve crosses the threshold: Predicted Non-Compliance
              Date. Updated with every new Sentinel data point.
            </motion.p>
          </Section>
        </div>
      </section>

      {/* SECTION 5: Five Prediction Models */}
      <PredictionModels />

      {/* SECTION 6: Jurisdiction Simulation */}
      <JurisdictionSection />

      {/* SECTION 7: The Moat + Closing */}
      <MoatSection />
      <ClosingSection />
    </div>
  );
}
