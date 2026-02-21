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
  { icon: Scale, label: "Legal Counsel" },
  { icon: ShieldCheck, label: "Insurers" },
  { icon: UserCheck, label: "Auditors" },
  { icon: Truck, label: "Suppliers" },
  { icon: Landmark, label: "Regulators" },
  { icon: Rocket, label: "Launch Providers" },
];

// 6 nodes on an ellipse (rx=270, ry=200) inside a 680x500 viewBox
// Angles: -90, -30, 30, 90, 150, 210 degrees (top-first, clockwise)
const SVG_W = 680;
const SVG_H = 500;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const nodeCoords = [
  { x: 340, y: 50 },
  { x: 574, y: 150 },
  { x: 574, y: 350 },
  { x: 340, y: 450 },
  { x: 106, y: 350 },
  { x: 106, y: 150 },
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
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 45%, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
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

        {/* ── Network Visualization ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mb-20 md:mb-28"
        >
          {/* Desktop — radial hub-and-spoke layout */}
          <div
            className="hidden md:block relative mx-auto"
            style={{ maxWidth: SVG_W, aspectRatio: `${SVG_W}/${SVG_H}` }}
          >
            {/* SVG: orbit ring + spoke lines */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              aria-hidden="true"
            >
              {/* Faint elliptical orbit */}
              <ellipse
                cx={CX}
                cy={CY}
                rx="270"
                ry="200"
                stroke="rgba(16, 185, 129, 0.07)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />

              {/* Spoke lines from center to each node */}
              {nodeCoords.map((n, i) => (
                <line
                  key={i}
                  x1={CX}
                  y1={CY}
                  x2={n.x}
                  y2={n.y}
                  stroke="rgba(16, 185, 129, 0.1)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
              ))}

              {/* Center glow dot */}
              <circle cx={CX} cy={CY} r="3" fill="rgba(16, 185, 129, 0.25)" />
            </svg>

            {/* Center hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div
                  className="absolute -inset-6 rounded-full bg-emerald-500/[0.08] blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative px-6 py-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-body-lg font-medium text-emerald-400 whitespace-nowrap">
                      Your Organization
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stakeholder nodes */}
            {stakeholders.map((s, i) => {
              const Icon = s.icon;
              const n = nodeCoords[i];
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: `${(n.y / SVG_H) * 100}%`,
                    left: `${(n.x / SVG_W) * 100}%`,
                  }}
                >
                  <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] backdrop-blur-sm hover:bg-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 cursor-default group">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors duration-300">
                      <Icon size={20} className="text-emerald-400" />
                    </div>
                    <span className="text-small font-medium text-white/60 group-hover:text-emerald-300/80 transition-colors duration-300 whitespace-nowrap">
                      {s.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile — clean grid */}
          <div className="md:hidden">
            <div className="flex justify-center mb-6">
              <div className="px-5 py-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-body font-medium text-emerald-400">
                    Your Organization
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stakeholders.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Icon size={20} className="text-emerald-400" />
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

        {/* ── Three Pillars ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                className="relative p-6 md:p-8 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.05] hover:border-emerald-500/[0.15] group overflow-hidden"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                {/* Top accent line on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />

                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors duration-300">
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

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.9 }}
          className="text-center"
        >
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-500 text-white text-subtitle font-medium hover:bg-emerald-400 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
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
