"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  UserCheck,
  Truck,
  Landmark,
  Rocket,
  FolderLock,
  Hash,
  Eye,
  ArrowRight,
} from "lucide-react";

const stakeholders = [
  {
    icon: Scale,
    label: "Legal Counsel",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: ShieldCheck,
    label: "Insurers",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: UserCheck,
    label: "Auditors",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Truck,
    label: "Suppliers",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Landmark,
    label: "Regulators",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Rocket,
    label: "Launch Providers",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

const pillars = [
  {
    icon: FolderLock,
    title: "Secure Data Rooms",
    description:
      "Encrypted, time-limited document spaces with watermarking, download controls, and granular access levels for every stakeholder.",
  },
  {
    icon: Hash,
    title: "Cryptographic Attestations",
    description:
      "Hash-chained, tamper-evident confirmations — legal reviews, audit clearances, NCA approvals — forming a verifiable compliance trail.",
  },
  {
    icon: Eye,
    title: "Complete Audit Trail",
    description:
      "Every access, every download, every signature logged with IP, timestamp, and context. Exportable for compliance reporting.",
  },
];

export default function EcosystemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 overflow-hidden bg-black"
      aria-label="Compliance Network Ecosystem"
    >
      {/* Subtle gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(16, 185, 129, 0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-caption font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
            Compliance Network
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
            One platform. Every stakeholder.
          </h2>
          <p className="text-subtitle md:text-title text-white/45 max-w-[800px] mx-auto leading-relaxed">
            Space compliance isn&apos;t a solo activity. Caelex connects
            operators with their entire regulatory ecosystem — lawyers,
            insurers, auditors, suppliers, and regulators — in a secure,
            auditable network.
          </p>
        </motion.div>

        {/* Stakeholder Orbit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16 md:mb-20"
        >
          {/* Center node + surrounding stakeholders */}
          <div className="relative max-w-3xl mx-auto">
            {/* Connection lines (desktop only) */}
            <div
              className="hidden md:block absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 600 200"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Lines from center to each stakeholder position */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const x = 50 + (i * 500) / 5;
                  return (
                    <line
                      key={i}
                      x1="300"
                      y1="100"
                      x2={x}
                      y2={i < 3 ? 20 : 180}
                      stroke="rgba(16, 185, 129, 0.12)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Center: Your Organization */}
            <div className="flex justify-center mb-8 md:mb-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10">
              <div className="px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                <span className="text-body font-medium text-emerald-400">
                  Your Organization
                </span>
              </div>
            </div>

            {/* Stakeholder Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {stakeholders.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}
                    >
                      <Icon size={20} className={s.color} />
                    </div>
                    <span className="text-small text-white/60 text-center leading-tight">
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Three Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="p-6 md:p-8 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-emerald-400" />
                </div>
                <h3 className="text-heading font-medium text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-body-lg text-white/45 leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-center"
        >
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/[0.06] border border-white/[0.12] text-subtitle font-medium text-white hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-200"
          >
            Explore the Platform
            <ArrowRight size={16} />
          </Link>
          <p className="text-body text-white/25 mt-4">
            Secure data rooms, cryptographic attestations, and real-time
            visibility across your compliance network.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
