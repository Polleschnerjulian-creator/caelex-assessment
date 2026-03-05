"use client";

import { Section, motion, fadeUp } from "./animation-utils";

const regulatorNeeds = [
  "Proof of debris mitigation compliance",
  "Evidence of passivation thresholds met",
  "Fuel reserve attestations for de-orbit",
  "Collision avoidance manoeuver records",
];

const operatorCantShare = [
  "Exact fuel levels (competitive intelligence)",
  "Orbital manoeuver parameters (ITAR/EAR)",
  "Telemetry streams (proprietary sensor data)",
  "Operational status of subsystems",
];

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4"
          >
            The Problem
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-16 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            The compliance paradox.
          </motion.h2>
        </Section>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {/* What regulators need */}
          <Section>
            <motion.h3
              variants={fadeUp}
              className="text-heading font-medium text-emerald-500 mb-6"
            >
              What regulators need
            </motion.h3>
            <div className="space-y-4">
              {regulatorNeeds.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-start gap-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <p className="text-body-lg text-white/60">{item}</p>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* What operators can't share */}
          <Section>
            <motion.h3
              variants={fadeUp}
              className="text-heading font-medium text-red-400 mb-6"
            >
              What operators can&apos;t share
            </motion.h3>
            <div className="space-y-4">
              {operatorCantShare.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-start gap-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                  <p className="text-body-lg text-white/60">{item}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>

        <Section className="mt-16 text-center">
          <motion.p
            variants={fadeUp}
            className="text-body-lg text-white/40 italic"
          >
            Verity resolves this: prove the fact without revealing the data.
          </motion.p>
        </Section>
      </div>
    </section>
  );
}
