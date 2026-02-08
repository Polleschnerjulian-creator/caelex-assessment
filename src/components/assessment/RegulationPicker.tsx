"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Satellite,
  Globe,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface RegulationOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status: "live" | "upcoming" | "coming_soon";
  statusLabel: string;
  stats: { label: string; value: string }[];
  features: string[];
}

const REGULATIONS: RegulationOption[] = [
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
  const config = {
    live: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      dot: "bg-emerald-500",
    },
    upcoming: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      dot: "bg-amber-500",
    },
    coming_soon: {
      bg: "bg-white/[0.04]",
      text: "text-white/40",
      dot: "bg-white/40",
    },
  }[status] || {
    bg: "bg-white/[0.04]",
    text: "text-white/40",
    dot: "bg-white/40",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] ${config.bg} ${config.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "live" ? "animate-pulse" : ""}`}
      />
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
            className="text-white/50 hover:text-white transition-colors duration-300 text-[13px] flex items-center gap-2"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to home
          </Link>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">
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
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
              Select Framework
            </span>
            <h1 className="text-[clamp(1.75rem,4vw,3rem)] font-light tracking-[-0.02em] text-white leading-[1.2] mb-5">
              Choose your regulation.
              <br />
              <span className="text-white/50">
                Assess your compliance in minutes.
              </span>
            </h1>
            <p className="text-[14px] md:text-[16px] text-white/45 max-w-2xl mx-auto leading-[1.6]">
              Select a regulatory framework to assess your compliance
              obligations. Each assessment takes 3\u20135 minutes.
            </p>
          </motion.div>

          {/* Regulation cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGULATIONS.map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              >
                <Link href={reg.href} className="block group">
                  <div className="relative p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 group-hover:bg-white/[0.06] transition-colors">
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
                          className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 text-center"
                        >
                          <div className="font-mono text-[13px] font-light text-white">
                            {stat.value}
                          </div>
                          <div className="font-mono text-[9px] text-white/30 uppercase tracking-[0.15em] mt-0.5">
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
                          className="flex items-center gap-2.5 text-[13px] text-white/45"
                        >
                          <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/[0.06] pt-4">
                      {/* CTA */}
                      <div className="flex items-center gap-2 text-[13px] font-medium text-white/60 group-hover:text-white transition-colors duration-300">
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
            className="text-center text-white/25 font-mono text-[11px] tracking-[0.05em] mt-12"
          >
            No account required &middot; No data stored &middot; 100%
            client-side assessment
          </motion.p>
        </div>
      </div>
    </div>
  );
}
