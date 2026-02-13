"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const categories = [
  {
    title: "Operations & Licensing",
    color: "blue",
    modules: [
      {
        name: "Authorization",
        description: "National licensing & permits",
      },
      {
        name: "Supervision",
        description: "Ongoing regulatory oversight",
      },
      {
        name: "Insurance",
        description: "Liability & coverage requirements",
      },
    ],
  },
  {
    title: "Security & Resilience",
    color: "emerald",
    modules: [
      {
        name: "Cybersecurity / NIS2",
        description: "Network & information security",
      },
      {
        name: "Export Control",
        description: "ITAR, EAR & EU dual-use",
      },
      {
        name: "Spectrum & ITU",
        description: "Frequency coordination & allocation",
      },
    ],
  },
  {
    title: "Sustainability & International",
    color: "purple",
    modules: [
      {
        name: "Debris Mitigation",
        description: "End-of-life & collision avoidance",
      },
      {
        name: "Environmental",
        description: "Launch & orbital impact assessment",
      },
      {
        name: "COPUOS/IADC",
        description: "International guidelines & best practices",
      },
      {
        name: "UK Space Act",
        description: "UK regulatory framework",
      },
      {
        name: "US Regulatory",
        description: "FAA, FCC, NOAA requirements",
      },
    ],
  },
];

const colorClasses = {
  blue: {
    dot: "bg-blue-400/60",
    title: "text-blue-400/80",
  },
  emerald: {
    dot: "bg-emerald-400/60",
    title: "text-emerald-400/80",
  },
  purple: {
    dot: "bg-purple-400/60",
    title: "text-purple-400/80",
  },
};

export default function WhatWeCover() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative bg-black py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
            Everything that governs space. Covered.
          </h2>
          <p className="text-[15px] md:text-[16px] text-white/40 max-w-[700px] mx-auto leading-relaxed">
            Each module includes guided assessments, gap analysis, and
            auto-generated compliance documents — tailored to your mission
            profile.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {categories.map((category, categoryIndex) => {
            const colors =
              colorClasses[category.color as keyof typeof colorClasses];

            return (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + categoryIndex * 0.1 }}
                className="flex flex-col"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <h3
                    className={`text-[13px] font-medium uppercase tracking-wider ${colors.title}`}
                  >
                    {category.title}
                  </h3>
                </div>

                {/* Module Cards */}
                <div className="flex flex-col gap-3">
                  {category.modules.map((module, moduleIndex) => (
                    <motion.div
                      key={module.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{
                        duration: 0.4,
                        delay: 0.2 + categoryIndex * 0.1 + moduleIndex * 0.05,
                      }}
                      className="group relative p-4 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15] cursor-default"
                      style={{
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      {/* Inner glow effect */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)",
                        }}
                      />

                      <div className="relative">
                        <h4 className="text-[15px] font-medium text-white mb-1">
                          {module.name}
                        </h4>
                        <p className="text-[13px] text-white/40">
                          {module.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-[14px] text-white/30 mt-16 md:mt-20"
        >
          From assessment to audit-ready documentation — in minutes, not months.
        </motion.p>
      </div>
    </section>
  );
}
