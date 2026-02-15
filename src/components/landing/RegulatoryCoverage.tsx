"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Scale,
  Shield,
  MapPin,
  FileText,
  AlertTriangle,
  Globe,
} from "lucide-react";

const regulations = [
  {
    icon: Scale,
    title: "EU Space Act",
    subtitle: "COM(2025) 335",
    color: "emerald",
    stats: [
      { label: "Articles", value: "119" },
      { label: "Annexes", value: "10" },
      { label: "Deadline", value: "2030" },
    ],
    features: [
      "Authorization & Licensing",
      "Debris Mitigation",
      "Insurance Requirements",
      "Registration Obligations",
    ],
  },
  {
    icon: Shield,
    title: "NIS2 Directive",
    subtitle: "EU 2022/2555",
    color: "cyan",
    stats: [
      { label: "Requirements", value: "51" },
      { label: "Categories", value: "10" },
      { label: "Effective", value: "2024" },
    ],
    features: [
      "Cybersecurity Measures",
      "Incident Reporting",
      "Supply Chain Security",
      "Risk Management",
    ],
  },
  {
    icon: MapPin,
    title: "National Space Laws",
    subtitle: "10 Jurisdictions",
    color: "purple",
    stats: [
      { label: "Countries", value: "10" },
      { label: "Compared", value: "47" },
      { label: "Factors", value: "12" },
    ],
    features: [
      "France (LOS)",
      "UK (Space Industry Act)",
      "Germany (SatDSiG)",
      "Luxembourg, NL, BE, AT, DK, IT, NO",
    ],
  },
];

const colorClasses = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    glow: "group-hover:shadow-emerald-500/10",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    text: "text-cyan-400",
    glow: "group-hover:shadow-cyan-500/10",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    glow: "group-hover:shadow-purple-500/10",
  },
};

export default function RegulatoryCoverage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      className="relative bg-black py-24 md:py-32"
      aria-label="Regulatory coverage"
    >
      {/* Section Label */}
      <div className="absolute top-8 right-6 md:right-12" aria-hidden="true">
        <span className="font-mono text-[11px] text-white/30">02 / 14</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block font-mono text-[11px] text-white/40 tracking-widest uppercase mb-4">
            Regulatory Coverage
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-light text-white tracking-[-0.02em] mb-4">
            Three Frameworks.{" "}
            <span className="text-white/50">One Platform.</span>
          </h2>
          <p className="text-[15px] text-white/40 max-w-[600px] mx-auto">
            Comprehensive compliance management across EU regulations and 10
            national jurisdictions.
          </p>
        </motion.div>

        {/* Regulations Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {regulations.map((reg, i) => {
            const Icon = reg.icon;
            const colors = colorClasses[reg.color as keyof typeof colorClasses];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className={`group relative p-6 rounded-2xl border ${colors.border} bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:shadow-xl ${colors.glow}`}
              >
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon
                      size={24}
                      className={colors.text}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-medium text-white mb-1">
                      {reg.title}
                    </h3>
                    <span className={`font-mono text-[11px] ${colors.text}`}>
                      {reg.subtitle}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-6 pb-6 border-b border-white/10">
                  {reg.stats.map((stat, j) => (
                    <div key={j} className="flex-1 text-center">
                      <div className="text-[20px] font-light text-white mb-0.5">
                        {stat.value}
                      </div>
                      <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {reg.features.map((feature, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-[13px] text-white/50"
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${colors.bg} ${colors.text}`}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-center"
        >
          <div>
            <div className="text-[28px] font-light text-white">170+</div>
            <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider">
              Total Requirements
            </div>
          </div>
          <div
            className="w-px h-8 bg-white/10 hidden sm:block"
            aria-hidden="true"
          />
          <div>
            <div className="text-[28px] font-light text-white">8</div>
            <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider">
              Compliance Modules
            </div>
          </div>
          <div
            className="w-px h-8 bg-white/10 hidden sm:block"
            aria-hidden="true"
          />
          <div>
            <div className="text-[28px] font-light text-white">2030</div>
            <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider">
              Key Deadline
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
