"use client";

import { motion } from "framer-motion";
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
    icon: <Satellite className="w-8 h-8" />,
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
    icon: <Shield className="w-8 h-8" />,
    href: "/assessment/nis2",
    status: "live",
    statusLabel: "In force since Oct 2024",
    stats: [
      { label: "Requirements", value: "51" },
      { label: "Penalty", value: "€10M / 2%" },
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
      "Compare licensing requirements, insurance obligations, debris rules, and regulatory timelines across 10 European jurisdictions — with EU Space Act transition preview.",
    icon: <Globe className="w-8 h-8" />,
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
      bg: "bg-green-500/10 border-green-500/30",
      text: "text-green-400",
      icon: <AlertTriangle className="w-3 h-3" />,
      dot: "bg-green-500",
    },
    upcoming: {
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-400",
      icon: <Clock className="w-3 h-3" />,
      dot: "bg-amber-500",
    },
    coming_soon: {
      bg: "bg-slate-500/10 border-slate-500/30",
      text: "text-slate-400",
      icon: <Clock className="w-3 h-3" />,
      dot: "bg-slate-500",
    },
  }[status] || {
    bg: "bg-slate-500/10 border-slate-500/30",
    text: "text-slate-400",
    icon: <Clock className="w-3 h-3" />,
    dot: "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "live" ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}

export default function RegulationPicker() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-navy-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            ← Back to home
          </Link>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Compliance Assessment
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-6xl w-full">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-light tracking-[-0.02em] text-white mb-4">
              Choose your regulation
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Select a regulatory framework to assess your compliance
              obligations. Each assessment takes 3-5 minutes.
            </p>
          </motion.div>

          {/* Regulation cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGULATIONS.map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              >
                <Link href={reg.href} className="block group">
                  <div className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-blue-400">
                          {reg.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {reg.title}
                          </h3>
                          <p className="text-xs font-mono text-white/40">
                            {reg.subtitle}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={reg.status}
                        label={reg.statusLabel}
                      />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                      {reg.description}
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {reg.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="bg-white/[0.03] rounded-lg p-2.5 text-center"
                        >
                          <div className="text-sm font-semibold text-white font-mono">
                            {stat.value}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-5">
                      {reg.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2 text-sm text-slate-400"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
                      Start assessment
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-white/30 text-xs mt-8"
          >
            No account required. No data stored. 100% client-side assessment.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
