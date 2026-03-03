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

const MOAT_ITEMS = [
  {
    number: "01",
    title: "Regulatory Knowledge Base",
    description:
      "Which thresholds apply to which regulations in which jurisdictions — codified in 12 compliance modules, 119 EU Space Act articles, 51 NIS2 requirements, 10+ national space laws.",
    source: "Caelex Platform",
  },
  {
    number: "02",
    title: "Continuous Operational Data",
    description:
      "Real-time fuel levels, thruster status, orbital parameters. Without live telemetry, no physical model can be parameterized.",
    source: "Caelex Sentinel",
  },
  {
    number: "03",
    title: "Verified Evidence History",
    description:
      "Months of cryptographically sealed data history to calculate consumption rates and degradation trends. The hash-chain guarantees authenticity.",
    source: "Sentinel Hash-Chain",
  },
  {
    number: "04",
    title: "Regulatory Genome",
    description:
      "The knowledge graph mapping regulations across jurisdictions. Art. 68 EU Space Act = UK SIA §7(2)(b) = Norwegian Space Act §4.",
    source: "Caelex Genome",
  },
];

const STAKEHOLDERS = [
  {
    role: "Operator",
    quote:
      "I see 847 days into the future. I never lose a license because I missed a deadline.",
  },
  {
    role: "Regulator",
    quote: "I see which operators will have problems in 2 years — today.",
  },
  {
    role: "Insurer",
    quote:
      "An operator with 847 days of compliance horizon is a different risk than one with 90.",
  },
];

export default function MoatSection() {
  return (
    <section className="py-24 md:py-36 bg-[#F7F8FA] border-t border-[#E5E7EB]">
      <div className="max-w-[720px] mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#9CA3AF] mb-4"
          >
            The Moat
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#111827] mb-2"
          >
            Four things. Simultaneously.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold leading-[1.2] tracking-[-0.02em] text-[#4B5563] mb-14"
          >
            No one else has all four.
          </motion.p>
        </Section>

        {/* 4 Moat items */}
        <div className="space-y-10">
          {MOAT_ITEMS.map((item) => (
            <Section key={item.number}>
              <motion.div variants={fadeUp} className="flex gap-6">
                {/* Number */}
                <span className="font-mono text-[14px] font-semibold text-[#9CA3AF] flex-shrink-0 pt-0.5">
                  {item.number}
                </span>

                <div>
                  {/* Title */}
                  <h3 className="text-[16px] font-bold text-[#111827] mb-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[14px] text-[#4B5563] leading-relaxed mb-3">
                    {item.description}
                  </p>

                  {/* Source tag */}
                  <span
                    className="inline-block font-mono text-[10px] font-semibold tracking-[0.05em] px-2.5 py-1 rounded-full"
                    style={{
                      color: "#4B5563",
                      background: "#F1F3F5",
                    }}
                  >
                    {item.source}
                  </span>
                </div>
              </motion.div>
            </Section>
          ))}
        </div>

        {/* Stakeholder quotes */}
        <Section className="mt-20">
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {STAKEHOLDERS.map((s) => (
              <div
                key={s.role}
                className="rounded-lg p-5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                }}
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mb-3">
                  {s.role}
                </p>
                <p className="text-[13px] text-[#4B5563] italic leading-relaxed">
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>
            ))}
          </motion.div>
        </Section>
      </div>
    </section>
  );
}
