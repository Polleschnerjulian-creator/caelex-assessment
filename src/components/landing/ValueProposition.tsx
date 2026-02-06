"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Clock,
  ShieldAlert,
  FileWarning,
  Zap,
  LayoutDashboard,
  Bot,
} from "lucide-react";

const painPoints = [
  {
    icon: FileWarning,
    title: "119 articles, 10 annexes",
    description:
      "The EU Space Act is the most complex space regulation ever written. Understanding which provisions apply to your mission requires deep regulatory expertise.",
  },
  {
    icon: Clock,
    title: "Months of legal analysis",
    description:
      "Operators currently spend 3\u20136 months and tens of thousands of euros on legal consultants just to understand their compliance obligations.",
  },
  {
    icon: ShieldAlert,
    title: "Up to 2% global turnover in penalties",
    description:
      "Without a systematic approach, operators risk authorization delays, fines, or being locked out of the EU market entirely.",
  },
];

const solutions = [
  {
    icon: Zap,
    title: "Automated compliance mapping",
    description:
      "Our engine automatically maps all 119 articles against your operator profile. What used to take months of legal review happens in minutes.",
  },
  {
    icon: Bot,
    title: "Guided workflows, not manuals",
    description:
      "Step-by-step authorization workflows, auto-generated checklists, and pre-filled templates. The platform tells you exactly what to do next.",
  },
  {
    icon: LayoutDashboard,
    title: "Full lifecycle in one place",
    description:
      "Pre-authorization, ongoing operations, end-of-life \u2014 every deadline, every deliverable, every report. Tracked automatically, always audit-ready.",
  },
];

export default function ValueProposition() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-black">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            Why Caelex
          </span>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-light tracking-[-0.02em] text-white leading-[1.2] max-w-[700px] mx-auto">
            Space compliance is broken.
            <br />
            <span className="text-white/50">We automate it.</span>
          </h2>
        </motion.div>

        {/* Pain points \u2192 Solution layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left: The Problem */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-400/60 block mb-8">
                Without Caelex
              </span>
            </motion.div>

            <div className="space-y-10">
              {painPoints.map((point, i) => {
                const Icon = point.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                    className="flex gap-5"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/[0.08] border border-red-500/[0.12] flex items-center justify-center">
                      <Icon size={18} className="text-red-400/60" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-white/90 mb-2">
                        {point.title}
                      </h3>
                      <p className="text-[13px] text-white/45 leading-[1.7]">
                        {point.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: The Solution */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-blue-400/60 block mb-8">
                With Caelex
              </span>
            </motion.div>

            <div className="space-y-10">
              {solutions.map((solution, i) => {
                const Icon = solution.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.25 + i * 0.1 }}
                    className="flex gap-5"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center">
                      <Icon size={18} className="text-blue-400/60" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-white/90 mb-2">
                        {solution.title}
                      </h3>
                      <p className="text-[13px] text-white/45 leading-[1.7]">
                        {solution.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Key differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-24 pt-16 border-t border-white/[0.06]"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <p className="font-mono text-[28px] font-light text-white mb-2">
                90%
              </p>
              <p className="text-[13px] text-white/40 leading-[1.6]">
                less time spent on regulatory analysis compared to manual legal
                review
              </p>
            </div>
            <div>
              <p className="font-mono text-[28px] font-light text-white mb-2">
                Real-time
              </p>
              <p className="text-[13px] text-white/40 leading-[1.6]">
                compliance tracking with automated deadline alerts and status
                updates
              </p>
            </div>
            <div>
              <p className="font-mono text-[28px] font-light text-white mb-2">
                1-click
              </p>
              <p className="text-[13px] text-white/40 leading-[1.6]">
                report generation for NCA submissions, audit trails, and
                compliance certificates
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
