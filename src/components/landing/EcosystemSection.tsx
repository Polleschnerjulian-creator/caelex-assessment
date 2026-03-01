"use client";

import { motion } from "framer-motion";
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

// ─── Data ───

const stakeholders = [
  { icon: Scale, label: "Legal Counsel" },
  { icon: ShieldCheck, label: "Insurers" },
  { icon: UserCheck, label: "Auditors" },
  { icon: Truck, label: "Suppliers" },
  { icon: Landmark, label: "Regulators" },
  { icon: Rocket, label: "Launch Providers" },
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

// ─── Network Geometry ───
// Compact viewBox: 600×420, ellipse rx=220 ry=155

const VB = { w: 600, h: 420 };
const C = { x: 300, y: 210 };
const RX = 220;
const RY = 155;

function nodeXY(i: number) {
  const a = ((i * 60 - 90) * Math.PI) / 180;
  return {
    x: Math.round(C.x + RX * Math.cos(a)),
    y: Math.round(C.y + RY * Math.sin(a)),
  };
}

const nodes = Array.from({ length: 6 }, (_, i) => nodeXY(i));

// ─── Component ───

export default function EcosystemSection() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-white"
      aria-label="Compliance Network Ecosystem"
    >
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* ── Header ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-caption font-medium text-emerald-600 uppercase tracking-[0.2em] mb-4">
            Compliance Network
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
            One platform. Every stakeholder.
          </h2>
          <p className="text-subtitle md:text-title text-[#4B5563] max-w-[800px] mx-auto leading-relaxed">
            Space compliance isn&apos;t a solo activity. Caelex connects
            operators with their entire regulatory ecosystem — lawyers,
            insurers, auditors, suppliers, and regulators — in a secure,
            auditable network.
          </p>
        </motion.div>

        {/* ── Network Visualization ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-20 md:mb-24"
        >
          {/* Desktop: Animated radial network */}
          <div
            className="hidden md:block relative mx-auto"
            style={{
              maxWidth: VB.w,
              aspectRatio: `${VB.w} / ${VB.h}`,
            }}
          >
            {/* SVG: orbits, spokes, particles, ripples */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${VB.w} ${VB.h}`}
              fill="none"
              overflow="hidden"
              aria-hidden="true"
            >
              {/* Outer orbit — flowing dashes */}
              <ellipse
                cx={C.x}
                cy={C.y}
                rx={RX}
                ry={RY}
                stroke="rgba(16,185,129,0.15)"
                strokeWidth="1"
                strokeDasharray="6 10"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-80"
                  dur="40s"
                  repeatCount="indefinite"
                />
              </ellipse>

              {/* Inner orbit — counter-rotation */}
              <ellipse
                cx={C.x}
                cy={C.y}
                rx={RX * 0.45}
                ry={RY * 0.45}
                stroke="rgba(16,185,129,0.10)"
                strokeWidth="1"
                strokeDasharray="3 9"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="48"
                  dur="25s"
                  repeatCount="indefinite"
                />
              </ellipse>

              {/* Inter-node mesh (faint connections between adjacent nodes) */}
              {nodes.map((n, i) => {
                const next = nodes[(i + 1) % 6];
                return (
                  <line
                    key={`mesh-${i}`}
                    x1={n.x}
                    y1={n.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="rgba(16,185,129,0.08)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Spoke lines — animated flowing dashes */}
              {nodes.map((n, i) => (
                <line
                  key={`spoke-${i}`}
                  x1={C.x}
                  y1={C.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="rgba(16,185,129,0.18)"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-12"
                    dur={`${2.5 + i * 0.4}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Traveling particles — 2 per spoke, staggered */}
              {nodes.map((n, i) => (
                <g key={`p-${i}`}>
                  {/* Fast particle */}
                  <circle r="1.5" fill="rgba(16,185,129,0.7)">
                    <animate
                      attributeName="cx"
                      values={`${n.x};${C.x}`}
                      dur={`${3 + i * 0.3}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      values={`${n.y};${C.y}`}
                      dur={`${3 + i * 0.3}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.8;0.8;0"
                      dur={`${3 + i * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Slower offset particle */}
                  <circle r="1" fill="rgba(16,185,129,0.5)">
                    <animate
                      attributeName="cx"
                      values={`${n.x};${C.x}`}
                      dur={`${3.5 + i * 0.3}s`}
                      begin={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      values={`${n.y};${C.y}`}
                      dur={`${3.5 + i * 0.3}s`}
                      begin={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.6;0.6;0"
                      dur={`${3.5 + i * 0.3}s`}
                      begin={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* Radar ripples from center */}
              <circle
                cx={C.x}
                cy={C.y}
                r="15"
                fill="none"
                stroke="rgba(16,185,129,0.12)"
                strokeWidth="1"
              >
                <animate
                  attributeName="r"
                  from="15"
                  to="200"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.12"
                  to="0"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={C.x}
                cy={C.y}
                r="15"
                fill="none"
                stroke="rgba(16,185,129,0.12)"
                strokeWidth="1"
              >
                <animate
                  attributeName="r"
                  from="15"
                  to="200"
                  dur="6s"
                  begin="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.12"
                  to="0"
                  dur="6s"
                  begin="3s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Center breathing glow */}
              <circle cx={C.x} cy={C.y} r="20" fill="rgba(16,185,129,0.08)">
                <animate
                  attributeName="r"
                  values="20;35;20"
                  dur="4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.08;0.18;0.08"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Center dot */}
              <circle cx={C.x} cy={C.y} r="3" fill="rgba(16,185,129,0.5)" />

              {/* Node anchor dots */}
              {nodes.map((n, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={n.x}
                  cy={n.y}
                  r="2"
                  fill="rgba(16,185,129,0.35)"
                />
              ))}
            </svg>

            {/* Center Hub Label */}
            <div
              className="absolute left-1/2 top-1/2 z-10"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(16,185,129,0.08)",
                    "0 0 40px rgba(16,185,129,0.18)",
                    "0 0 20px rgba(16,185,129,0.08)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="px-6 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-body-lg font-medium text-emerald-600 whitespace-nowrap">
                    Your Organization
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Stakeholder Nodes */}
            {stakeholders.map((s, i) => {
              const Icon = s.icon;
              const n = nodes[i];
              return (
                <div
                  key={s.label}
                  className="absolute z-10"
                  style={{
                    top: `${(n.y / VB.h) * 100}%`,
                    left: `${(n.x / VB.w) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <motion.div
                    initial={false}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                  >
                    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 cursor-default group shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-300">
                        <Icon size={18} className="text-emerald-600" />
                      </div>
                      <span className="text-small font-medium text-[#4B5563] group-hover:text-emerald-700 transition-colors duration-300 whitespace-nowrap">
                        {s.label}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Mobile: Grid */}
          <div className="md:hidden">
            <div className="flex justify-center mb-6">
              <div className="px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-body font-medium text-emerald-600">
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
                    initial={false}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-emerald-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Icon size={20} className="text-emerald-600" />
                    </div>
                    <span className="text-small text-[#4B5563] text-center leading-tight">
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
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                className="relative p-6 md:p-8 rounded-2xl bg-white border border-[#E5E7EB] transition-all duration-300 hover:border-emerald-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] group overflow-hidden"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Top accent line on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />

                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors duration-300">
                  <Icon size={20} className="text-emerald-600" />
                </div>
                <h3 className="text-heading font-medium text-[#111827] mb-3">
                  {pillar.title}
                </h3>
                <p className="text-body-lg text-[#4B5563] leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, delay: 0.9 }}
          className="text-center"
        >
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-500 text-white text-subtitle font-medium hover:bg-emerald-600 transition-all duration-200 hover:scale-[1.02] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
          >
            Explore the Platform
            <ArrowRight size={16} />
          </Link>
          <p className="text-body text-[#9CA3AF] mt-4">
            Secure data rooms, cryptographic attestations, and real-time
            visibility across your compliance network.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
