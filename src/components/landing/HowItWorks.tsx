"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Define your mission profile",
    description:
      "Describe your satellite mission — orbit type, payload, launch jurisdiction, operational parameters. Caelex automatically identifies every regulation that applies to you across all relevant jurisdictions.",
    replaces: "Replaces weeks of legal research",
  },
  {
    number: "02",
    title: "Complete guided assessments",
    description:
      "Work through each applicable module at your own pace. Answer targeted questions about your operations, security posture, environmental impact, and licensing status. See compliance gaps and coverage in real-time as you go.",
    replaces: "Replaces expensive compliance audits",
  },
  {
    number: "03",
    title: "Generate compliance documents",
    description:
      "Caelex compiles your inputs into structured, audit-ready compliance documents — security frameworks, gap analyses, regulatory filings, and board-level reports. Tailored to your exact mission profile and jurisdiction requirements.",
    replaces: "Replaces months of manual documentation",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 overflow-hidden bg-black"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
            Audit-ready in three steps.
          </h2>
          <p className="text-[15px] md:text-[16px] text-white/40 max-w-[700px] mx-auto leading-relaxed">
            No consultants. No spreadsheets. No guesswork. Just a structured
            path from regulatory complexity to full compliance.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Connector Line - Desktop only */}
          <div className="hidden lg:block absolute top-[80px] left-[16.67%] right-[16.67%] h-px">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {/* Chevrons */}
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2">
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
            <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="relative"
              >
                {/* Large Ghost Number */}
                <div className="absolute -top-4 left-4 text-[120px] md:text-[140px] font-bold text-white/[0.04] leading-none select-none pointer-events-none z-0">
                  {step.number}
                </div>

                {/* Card */}
                <div
                  className="relative z-10 p-6 md:p-8 rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12] h-full"
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Step Number Badge */}
                  <div className="inline-flex items-center gap-2 mb-5">
                    <span className="text-[13px] font-medium text-white/60">
                      Step {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[18px] md:text-[20px] font-medium text-white mb-4 leading-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[14px] text-white/40 leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Replaces Label */}
                  <p className="text-[13px] font-medium text-emerald-400/80">
                    {step.replaces}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16 md:mt-20"
        >
          <Link
            href="/assessment"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-black text-[15px] font-medium rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02]"
          >
            Start Your Assessment
          </Link>
          <p className="text-[13px] text-white/30 mt-4">
            Free to start. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
