"use client";

import { motion } from "framer-motion";
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
    color: "gray",
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

export default function WhatWeCover() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-[#F7F8FA]"
      aria-label="What we cover"
    >
      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
            Everything that governs space. Covered.
          </h2>
          <p className="text-subtitle md:text-title text-[#4B5563] max-w-[700px] mx-auto leading-relaxed">
            Each module includes guided assessments, gap analysis, and
            auto-generated compliance documents — tailored to your mission
            profile.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {categories.map((category, categoryIndex) => {
            return (
              <motion.div
                key={category.title}
                initial={false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: categoryIndex * 0.06 }}
                className="flex flex-col"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div
                    className="w-2 h-2 rounded-full bg-[#6B7280]"
                    aria-hidden="true"
                  />
                  <h3 className="text-body font-medium uppercase tracking-wider text-[#4B5563]">
                    {category.title}
                  </h3>
                </div>

                {/* Module Cards */}
                <div className="flex flex-col gap-3">
                  {category.modules.map((module, moduleIndex) => (
                    <motion.div
                      key={module.name}
                      initial={false}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        duration: 0.3,
                        delay: categoryIndex * 0.06 + moduleIndex * 0.03,
                      }}
                      className="group relative p-4 rounded-2xl bg-white border border-[#E5E7EB] transition-all duration-300 hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-default"
                      style={{
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="relative">
                        <h4 className="text-subtitle font-medium text-[#111827] mb-1">
                          {module.name}
                        </h4>
                        <p className="text-body text-[#4B5563]">
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
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-body-lg text-[#9CA3AF] mt-16 md:mt-20"
        >
          From assessment to audit-ready documentation — in minutes, not months.
        </motion.p>
      </div>
    </section>
  );
}
