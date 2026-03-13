"use client";

import { Section, motion, fadeUp } from "./animation-utils";
import { Building2, ShieldCheck, Users } from "lucide-react";

const scenarios = [
  {
    icon: Building2,
    from: "Operator",
    to: "Regulator",
    title: "Authorization & Ongoing Compliance",
    description:
      "Demonstrate debris mitigation compliance during authorization review without disclosing proprietary spacecraft parameters.",
    regulation: "EU Space Act Art. 5 · Art. 70 Passivation",
  },
  {
    icon: ShieldCheck,
    from: "Operator",
    to: "Insurer",
    title: "Insurance & Risk Assessment",
    description:
      "Provide cryptographic proof of operational health and compliance posture to underwriters without exposing telemetry.",
    regulation: "EU Space Act Art. 39 · Insurance Requirements",
  },
  {
    icon: Users,
    from: "Operator",
    to: "Customer",
    title: "Supply Chain Assurance",
    description:
      "Share verified compliance status with downstream service customers — proof of debris compliance, orbital safety, and passivation readiness.",
    regulation: "EU Space Act Art. 21 · Supply Chain Obligations",
  },
];

export default function UseCases() {
  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4"
          >
            Use Cases
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-16 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            Who uses Verity.
          </motion.h2>
        </Section>

        <div className="grid md:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <Section key={scenario.title}>
              <motion.div
                variants={fadeUp}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] hover:border-white/[0.10] transition-colors h-full flex flex-col"
              >
                <scenario.icon className="w-5 h-5 text-emerald-500 mb-4" />

                <div className="flex items-center gap-2 mb-4">
                  <span className="font-mono text-[11px] text-white/50">
                    {scenario.from}
                  </span>
                  <span className="text-white/40">→</span>
                  <span className="font-mono text-[11px] text-white/50">
                    {scenario.to}
                  </span>
                </div>

                <h3 className="text-title font-medium text-white mb-3">
                  {scenario.title}
                </h3>
                <p className="text-body text-white/50 leading-relaxed mb-4 flex-1">
                  {scenario.description}
                </p>

                <p className="font-mono text-[11px] text-white/50 border-t border-white/[0.06] pt-4">
                  {scenario.regulation}
                </p>
              </motion.div>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
}
