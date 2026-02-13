"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Satellite,
  Globe,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";

interface RegulationOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status: "live" | "upcoming" | "coming_soon" | "featured";
  statusLabel: string;
  stats: { label: string; value: string }[];
  features: string[];
  featured?: boolean;
}

const REGULATIONS: RegulationOption[] = [
  {
    id: "unified",
    title: "Unified Compliance Profile",
    subtitle: "All-in-One Assessment",
    description:
      "Complete regulatory profile covering EU Space Act, NIS2 Directive, and National Space Laws in a single comprehensive assessment. Get personalized recommendations across all frameworks.",
    icon: <Layers className="w-7 h-7" />,
    href: "/assessment/unified",
    status: "featured",
    statusLabel: "Recommended",
    featured: true,
    stats: [
      { label: "Frameworks", value: "3" },
      { label: "Questions", value: "~35" },
      { label: "Time", value: "8-10 min" },
    ],
    features: [
      "Complete company profile",
      "Cross-framework analysis",
      "Jurisdiction comparison",
      "Priority action roadmap",
    ],
  },
  {
    id: "eu-space-act",
    title: "EU Space Act",
    subtitle: "COM(2025) 335",
    description:
      "Comprehensive regulation for space operators covering authorization, debris mitigation, cybersecurity, environmental footprint, and insurance.",
    icon: <Satellite className="w-7 h-7" />,
    href: "/assessment/eu-space-act",
    status: "upcoming",
    statusLabel: "Applies from 2030",
    stats: [
      { label: "Articles", value: "119" },
      { label: "Penalty", value: "2% turnover" },
      { label: "Deadline", value: "1 Jan 2030" },
    ],
    features: [
      "Operator type classification",
      "Light regime eligibility",
      "Module-by-module obligations",
      "Authorization pathway",
    ],
  },
  {
    id: "nis2",
    title: "NIS2 Directive",
    subtitle: "(EU) 2022/2555",
    description:
      "Cybersecurity regulation listing Space as Annex I high-criticality sector. Requires risk management, incident reporting, and supply chain security.",
    icon: <Shield className="w-7 h-7" />,
    href: "/assessment/nis2",
    status: "live",
    statusLabel: "In force since Oct 2024",
    stats: [
      { label: "Requirements", value: "51" },
      { label: "Penalty", value: "\u20AC10M / 2%" },
      { label: "Reporting", value: "24h / 72h" },
    ],
    features: [
      "Entity classification (essential/important)",
      "Art. 21 cybersecurity measures",
      "Cross-reference with EU Space Act",
      "Incident reporting timeline",
    ],
  },
  {
    id: "space-law",
    title: "National Space Laws",
    subtitle: "10 Jurisdictions",
    description:
      "Compare licensing requirements, insurance obligations, debris rules, and regulatory timelines across 10 European jurisdictions \u2014 with EU Space Act transition preview.",
    icon: <Globe className="w-7 h-7" />,
    href: "/assessment/space-law",
    status: "live",
    statusLabel: "Database live",
    stats: [
      { label: "Countries", value: "10" },
      { label: "Compare", value: "Up to 3" },
      { label: "Criteria", value: "10" },
    ],
    features: [
      "Multi-jurisdiction comparison",
      "Licensing & insurance requirements",
      "EU Space Act cross-reference",
      "Favorability scoring",
    ],
  },
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  const configs: Record<string, { bg: string; text: string; dot: string }> = {
    live: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      dot: "bg-emerald-500",
    },
    upcoming: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      dot: "bg-amber-500",
    },
    coming_soon: {
      bg: "bg-white/[0.06]",
      text: "text-white/40",
      dot: "bg-white/40",
    },
    featured: {
      bg: "bg-gradient-to-r from-emerald-500/20 to-blue-500/20",
      text: "text-white",
      dot: "bg-gradient-to-r from-emerald-400 to-blue-400",
    },
  };

  const config = configs[status] || configs.coming_soon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      {status === "featured" ? (
        <Sparkles className="w-3 h-3" />
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "live" ? "animate-pulse" : ""}`}
        />
      )}
      {label}
    </span>
  );
}

export default function RegulationPicker() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-white/50 hover:text-emerald-400 transition-colors duration-300 text-[13px] flex items-center gap-2"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to home
          </Link>
          <div className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            Compliance Assessment
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        ref={ref}
        className="flex-1 flex items-center justify-center px-6 md:px-12 py-24 md:py-32"
      >
        <div className="max-w-[1200px] w-full">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-6">
              Select Framework
            </span>
            <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-medium tracking-[-0.02em] text-white leading-[1.2] mb-5">
              Choose your regulation.
              <br />
              <span className="text-white/50">
                Assess your compliance in minutes.
              </span>
            </h1>
            <p className="text-[14px] md:text-[16px] text-white/40 max-w-2xl mx-auto leading-[1.6]">
              Select a regulatory framework to assess your compliance
              obligations. Each assessment takes 3–5 minutes.
            </p>
          </motion.div>

          {/* Legal disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <DisclaimerBanner assessmentType="general" variant="inline" />
          </motion.div>

          {/* Featured Unified Assessment */}
          {REGULATIONS.filter((r) => r.featured).map((reg) => (
            <motion.div
              key={reg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-8"
            >
              <Link href={reg.href} className="block group">
                <div
                  className="relative p-8 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-blue-500/[0.08] backdrop-blur-[10px] border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 overflow-hidden"
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(16,185,129,0.1), 0 4px 40px rgba(16,185,129,0.1)",
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative flex flex-col md:flex-row gap-8">
                    {/* Left side */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          {reg.icon}
                        </div>
                        <div>
                          <h3 className="text-[20px] font-medium text-white tracking-[-0.01em]">
                            {reg.title}
                          </h3>
                          <p className="text-[12px] text-emerald-400/70 tracking-[0.05em]">
                            {reg.subtitle}
                          </p>
                        </div>
                      </div>

                      <StatusBadge
                        status={reg.status}
                        label={reg.statusLabel}
                      />

                      <p className="text-[14px] text-white/60 mt-4 leading-[1.7] max-w-xl">
                        {reg.description}
                      </p>

                      {/* Features */}
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        {reg.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center gap-2.5 text-[13px] text-white/50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right side - Stats */}
                    <div className="flex flex-row md:flex-col gap-4 justify-center">
                      {reg.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-4 text-center min-w-[100px]"
                        >
                          <div className="font-mono text-[24px] font-medium text-white">
                            {stat.value}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase tracking-[0.1em] mt-1">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-8 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-white text-[14px] font-medium group-hover:bg-emerald-400 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300">
                      Start Complete Assessment
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    <span className="text-[12px] text-white/40">
                      ~10 minutes
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Section divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] text-white/30 uppercase tracking-[0.15em]">
              Or choose a specific framework
            </span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Individual Regulation cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGULATIONS.filter((r) => !r.featured).map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
              >
                <Link href={reg.href} className="block group">
                  <div
                    className="relative p-6 rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 h-full"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300">
                          {reg.icon}
                        </div>
                        <div>
                          <h3 className="text-[15px] font-medium text-white tracking-[-0.01em]">
                            {reg.title}
                          </h3>
                          <p className="font-mono text-[10px] text-white/30 tracking-[0.05em]">
                            {reg.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                      <StatusBadge
                        status={reg.status}
                        label={reg.statusLabel}
                      />
                    </div>

                    {/* Description */}
                    <p className="text-[13px] text-white/45 mb-5 leading-[1.7]">
                      {reg.description}
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {reg.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center"
                        >
                          <div className="font-mono text-[13px] font-medium text-white">
                            {stat.value}
                          </div>
                          <div className="text-[9px] text-white/30 uppercase tracking-[0.1em] mt-0.5">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-2.5 mb-6">
                      {reg.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2.5 text-[13px] text-white/40"
                        >
                          <span className="w-1 h-1 rounded-full bg-emerald-500/50 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/[0.06] pt-4">
                      {/* CTA */}
                      <div className="flex items-center gap-2 text-[13px] font-medium text-white/50 group-hover:text-emerald-400 transition-colors duration-300">
                        Start assessment
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
            className="text-center text-white/25 text-[11px] tracking-[0.05em] mt-12"
          >
            No account required · No data stored · 100% client-side assessment
          </motion.p>
        </div>
      </div>
    </div>
  );
}
