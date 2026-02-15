"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ClipboardCheck,
  UserPlus,
  FileText,
  CheckSquare,
  Bell,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Assess",
    description: "Free compliance assessment in 3 minutes",
    detail: "Determine your operator type, regime, and applicable articles",
    icon: ClipboardCheck,
    tag: "Free",
  },
  {
    number: "02",
    title: "Onboard",
    description: "Import results into your dashboard",
    detail: "Set up your operator profile, invite team members",
    icon: UserPlus,
    tag: "Day 1",
  },
  {
    number: "03",
    title: "Plan",
    description: "Generate documents and set deadlines",
    detail: "Authorization checklists, NCA routing, timeline setup",
    icon: FileText,
    tag: "Week 1",
  },
  {
    number: "04",
    title: "Comply",
    description: "Work through 8 modules systematically",
    detail: "Track progress across all 119 articles in one place",
    icon: CheckSquare,
    tag: "Ongoing",
  },
  {
    number: "05",
    title: "Monitor",
    description: "Automated alerts and regulatory tracking",
    detail: "Deadline reminders, document expiry, regulatory changes",
    icon: Bell,
    tag: "Always-on",
  },
];

export default function Lifecycle() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative py-20 md:py-28 bg-black"
      aria-label="Compliance lifecycle"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
        aria-hidden="true"
      >
        <span className="font-mono text-[11px] text-white/30">06 / 12</span>
      </motion.div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            The Journey
          </span>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-light tracking-[-0.02em] text-white leading-[1.2] max-w-[600px] mx-auto">
            From first assessment
            <br />
            <span className="text-white/50">to full compliance.</span>
          </h2>
        </motion.div>

        {/* Desktop: Horizontal steps */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-5 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                >
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 h-full">
                    {/* Icon + tag row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-white/[0.04]">
                        <Icon
                          size={16}
                          className="text-white/50"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/30 bg-white/[0.04] px-2 py-1 rounded-full">
                        {step.tag}
                      </span>
                    </div>

                    {/* Step number + title */}
                    <div className="mb-3">
                      <span
                        className="font-mono text-[10px] text-white/20 block mb-1"
                        aria-hidden="true"
                      >
                        {step.number}
                      </span>
                      <h3 className="text-[16px] font-medium text-white tracking-[-0.01em]">
                        {step.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-[13px] text-white/50 leading-[1.5] mb-2">
                      {step.description}
                    </p>
                    <p className="text-[11px] text-white/30 leading-[1.5]">
                      {step.detail}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="lg:hidden space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className="relative"
              >
                <div className="flex gap-4">
                  {/* Timeline dot + line */}
                  <div
                    className="flex flex-col items-center pt-1"
                    aria-hidden="true"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-white/50" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px flex-1 bg-white/[0.06] mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[15px] font-medium text-white">
                        {step.title}
                      </h3>
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/50 leading-[1.5]">
                      {step.description}
                    </p>
                    <p className="text-[11px] text-white/30 leading-[1.5] mt-1">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
