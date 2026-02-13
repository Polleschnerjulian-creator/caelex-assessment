"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

const chatExamples = [
  {
    prompt: "Which debris mitigation rules apply to my LEO constellation?",
    response:
      "Based on your orbital parameters, IADC Guidelines Section 5.2 and ISO 24113 apply. Your French authorization also requires compliance with CNES Act debris provisions...",
  },
  {
    prompt: "Compare insurance requirements: Germany vs. UK vs. France",
    response:
      "Analyzing 3 jurisdictions... Germany requires €60M TPL under LuftVG §33, UK mandates third-party liability per Space Industry Act 2018 s.12...",
  },
  {
    prompt: "Generate our NCA authorization application",
    response:
      "Generating authorization package based on your mission profile... Document includes: operator classification, risk assessment, insurance certificates, debris mitigation plan...",
  },
];

const capabilities = [
  {
    icon: "🔍",
    name: "Compliance",
    description:
      "Gap analysis, cross-regulation overlap, jurisdiction comparison, deadline tracking",
    tools: 6,
  },
  {
    icon: "📊",
    name: "Assessment",
    description: "Operator classification, NIS2 scoping, assessment results",
    tools: 3,
  },
  {
    icon: "📄",
    name: "Documents",
    description:
      "PDF reports, authorization applications, debris mitigation plans",
    tools: 5,
  },
  {
    icon: "📚",
    name: "Knowledge",
    description:
      "Semantic search across all regulations, article interpretation, cross-references",
    tools: 4,
  },
  {
    icon: "💡",
    name: "Advisory",
    description:
      "What-if scenarios, optimal compliance path, cost & time estimates",
    tools: 3,
    isNew: true,
  },
];

const knowledgeDomains = [
  "EU Space Act (119 Articles)",
  "NIS2 (51 Requirements)",
  "10 National Space Laws",
  "ITAR/EAR",
  "IADC & ISO 24113",
  "NIST & ISO 27001",
];

export default function AstraSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
            AI Agent
          </span>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
            Meet ASTRA.
          </h2>
          <p className="text-[18px] md:text-[20px] text-white/70 mb-4 font-medium">
            22 tools. 5 categories. The most comprehensive AI compliance engine
            ever built for space.
          </p>
          <p className="text-[15px] md:text-[16px] text-white/40 max-w-[900px] mx-auto leading-relaxed">
            ASTRA doesn&apos;t just answer questions — it runs gap analyses,
            generates audit-ready documents, compares jurisdictions, estimates
            compliance costs, and builds your optimal regulatory path. Trained
            on the EU Space Act, NIS2, 10 national space laws, ITAR, IADC, ITU,
            and every major cybersecurity framework.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-12">
          {/* Left: Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#141414",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[13px] font-medium text-emerald-400">
                    ASTRA
                  </span>
                </div>
                <span className="text-[12px] text-white/30">
                  AI Compliance Agent
                </span>
              </div>

              {/* Chat Messages */}
              <div className="p-5 space-y-5 min-h-[380px]">
                {chatExamples.map((example, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                    className="space-y-3"
                  >
                    {/* User Prompt */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-white/[0.08] text-[13px] text-white/80">
                        {example.prompt}
                      </div>
                    </div>

                    {/* ASTRA Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-medium text-emerald-400/70 uppercase tracking-wider">
                            ASTRA
                          </span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-emerald-500/[0.08] border border-emerald-500/[0.12] text-[13px] text-white/60 leading-relaxed">
                          {example.response}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="px-5 pb-5">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                  style={{
                    boxShadow: "0 0 20px rgba(16, 185, 129, 0.05)",
                  }}
                >
                  <span className="text-[13px] text-white/30 flex-1">
                    Ask ASTRA anything about space compliance...
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Capability Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-5 flex flex-col gap-3"
          >
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                className="group relative p-4 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{cap.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[14px] font-medium text-white">
                        {cap.name}
                      </h4>
                      {cap.isNew && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 bg-emerald-500/15 rounded uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white/40 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-[11px] font-medium text-white/50 bg-white/[0.06] rounded-md">
                    {cap.tools} tools
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Knowledge Domain Tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex flex-wrap gap-2 mt-2"
            >
              {knowledgeDomains.map((domain) => (
                <span
                  key={domain}
                  className="px-2.5 py-1 text-[10px] text-emerald-400/70 bg-emerald-500/[0.06] border border-emerald-500/[0.15] rounded-full"
                >
                  {domain}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-center"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-emerald-500 text-white text-[15px] font-medium rounded-full transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            Ask ASTRA
          </Link>
          <p className="text-[13px] text-white/30 mt-4">
            Available in every module. Context-aware to your mission profile.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
