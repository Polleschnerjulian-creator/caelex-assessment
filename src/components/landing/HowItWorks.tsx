"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

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
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-white"
      aria-label="How it works"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
            Audit-ready in three steps.
          </h2>
          <p className="text-subtitle md:text-title text-[#4B5563] max-w-[700px] mx-auto leading-relaxed">
            No consultants. No spreadsheets. No guesswork. Just a structured
            path from regulatory complexity to full compliance.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Connector Line - Desktop only */}
          <div
            className="hidden lg:block absolute top-[80px] left-[16.67%] right-[16.67%] h-px"
            aria-hidden="true"
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-[#D1D5DB] to-transparent" />
            {/* Chevrons */}
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2">
              <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
            </div>
            <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
              <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="relative"
              >
                {/* Large Ghost Number */}
                <div
                  className="absolute -top-4 left-4 text-[60px] sm:text-[80px] md:text-[100px] lg:text-[140px] font-bold text-[#E5E7EB] leading-none select-none pointer-events-none z-0"
                  aria-hidden="true"
                >
                  {step.number}
                </div>

                {/* Card */}
                <div
                  className="relative z-10 p-6 md:p-8 rounded-2xl bg-white border border-[#E5E7EB] transition-all duration-300 hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] h-full"
                  style={{
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Step Number Badge */}
                  <div className="inline-flex items-center gap-2 mb-5">
                    <span className="text-body font-medium text-[#4B5563]">
                      Step {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-heading md:text-heading font-medium text-[#111827] mb-4 leading-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-body-lg text-[#4B5563] leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Replaces Label */}
                  <p className="text-body font-medium text-emerald-600">
                    {step.replaces}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center mt-16 md:mt-20"
        >
          <Button href="/assessment" variant="landing-primary" size="lg">
            Start Your Assessment
          </Button>
          <p className="text-body text-[#9CA3AF] mt-4">
            Free to start. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
