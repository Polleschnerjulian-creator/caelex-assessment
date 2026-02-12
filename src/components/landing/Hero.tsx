"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Rocket,
} from "lucide-react";

/* ─── compliance mockup data ─── */
const checklistItems = [
  {
    id: "art-4",
    label: "Art. 4 – Authorization Requirement",
    status: "done" as const,
  },
  {
    id: "art-5",
    label: "Art. 5 – Registration Obligation",
    status: "done" as const,
  },
  {
    id: "art-8",
    label: "Art. 8 – Cybersecurity Measures",
    status: "done" as const,
  },
  {
    id: "art-10",
    label: "Art. 10 – Light Regime (SME)",
    status: "warn" as const,
  },
  {
    id: "art-12",
    label: "Art. 12 – Debris Mitigation",
    status: "pending" as const,
  },
  {
    id: "art-15",
    label: "Art. 15 – Insurance Coverage",
    status: "pending" as const,
  },
];

const statusIcon = {
  done: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  warn: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
  pending: <Circle size={16} className="text-slate-300 shrink-0" />,
};

const statusLabel = {
  done: "Compliant",
  warn: "In Review",
  pending: "Pending",
};

const statusBadgeClass = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function Hero() {
  const completedCount = checklistItems.filter(
    (i) => i.status === "done",
  ).length;
  const progressPct = Math.round(
    (completedCount / checklistItems.length) * 100,
  );

  return (
    <section className="hero-section relative min-h-screen flex items-center overflow-hidden pt-28 pb-16 md:pt-32 md:pb-20">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-[#f8f9fb]" />

      {/* Dark gradient at top so existing dark navbar stays readable */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0f172a] via-[#0f172a]/60 to-transparent pointer-events-none z-0" />

      {/* ── Orbital decoration (SVG paths) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1400px] opacity-[0.07]"
          viewBox="0 0 1400 1400"
          fill="none"
        >
          {/* Orbital ellipses */}
          <ellipse
            cx="700"
            cy="700"
            rx="500"
            ry="220"
            stroke="#94a3b8"
            strokeWidth="1"
            transform="rotate(-25 700 700)"
          />
          <ellipse
            cx="700"
            cy="700"
            rx="600"
            ry="280"
            stroke="#94a3b8"
            strokeWidth="0.8"
            transform="rotate(15 700 700)"
          />
          <ellipse
            cx="700"
            cy="700"
            rx="420"
            ry="180"
            stroke="#94a3b8"
            strokeWidth="0.6"
            transform="rotate(-50 700 700)"
          />
          {/* Small dots along orbits */}
          <circle cx="280" cy="580" r="3" fill="#cbd5e1" />
          <circle cx="1050" cy="430" r="2.5" fill="#cbd5e1" />
          <circle cx="900" cy="950" r="2" fill="#cbd5e1" />
          <circle cx="350" cy="850" r="3" fill="#cbd5e1" />
          <circle cx="1120" cy="700" r="2" fill="#cbd5e1" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* ──────── Left: Content Block (~55%) ──────── */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium tracking-wide bg-blue-50 text-blue-700 border border-blue-200/60">
                <FileText size={13} className="text-blue-500" />
                EU Space Act · 119 Articles
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 text-[clamp(2.2rem,4.5vw,3.75rem)] font-bold tracking-[-0.025em] leading-[1.1] text-[#0f172a]"
            >
              The compliance platform for the{" "}
              <span className="text-[#2563eb]">EU Space Act.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-5 text-[17px] leading-[1.7] text-[#64748b] max-w-[520px]"
            >
              Map every regulation to your satellite operations. From
              authorization to debris mitigation — launch compliant, not late.
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[15px] font-semibold rounded-lg transition-all duration-200 shadow-[0_1px_3px_rgba(37,99,235,0.3),0_4px_12px_rgba(37,99,235,0.15)] hover:shadow-[0_1px_3px_rgba(37,99,235,0.4),0_6px_20px_rgba(37,99,235,0.2)] hover:-translate-y-[1px]"
              >
                <Rocket size={16} />
                Start Assessment
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-[#0f172a] text-[15px] font-semibold rounded-lg border border-[#e2e8f0] hover:border-[#cbd5e1] bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm hover:-translate-y-[1px]"
              >
                Request Demo
              </Link>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-10 flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e2e8f0]">
                <ShieldCheck size={18} className="text-[#2563eb]" />
                <span className="text-[12px] font-medium text-[#475569]">
                  Backed by ESA Business Incubation Centre
                </span>
              </div>
            </motion.div>
          </div>

          {/* ──────── Right: Dashboard Mockup (~45%) ──────── */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              {/* Subtle glow behind card */}
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-100/40 via-transparent to-slate-100/40 rounded-3xl blur-2xl" />

              {/* Main card */}
              <div className="relative bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                {/* Card header */}
                <div className="px-5 py-4 border-b border-[#f1f5f9] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                      <ShieldCheck size={16} className="text-[#2563eb]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[#0f172a]">
                        Compliance Overview
                      </h3>
                      <p className="text-[11px] text-[#94a3b8]">
                        EU Space Act Assessment
                      </p>
                    </div>
                  </div>
                  <span className="text-[20px] font-bold text-[#0f172a]">
                    {progressPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="px-5 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-[#64748b]">
                      Overall Progress
                    </span>
                    <span className="text-[11px] text-[#94a3b8]">
                      {completedCount}/{checklistItems.length} articles
                    </span>
                  </div>
                  <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{
                        duration: 1.2,
                        delay: 1.0,
                        ease: "easeOut",
                      }}
                      className="h-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] rounded-full"
                    />
                  </div>
                </div>

                {/* Checklist */}
                <div className="px-5 py-3">
                  <div className="space-y-1">
                    {checklistItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 1.0 + i * 0.1,
                        }}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#f8fafc] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {statusIcon[item.status]}
                          <span
                            className={`text-[13px] ${
                              item.status === "done"
                                ? "text-[#0f172a]"
                                : item.status === "warn"
                                  ? "text-[#0f172a]"
                                  : "text-[#94a3b8]"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeClass[item.status]}`}
                        >
                          {statusLabel[item.status]}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Card footer — mini stats */}
                <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#f1f5f9] grid grid-cols-3 gap-3">
                  {[
                    { value: "119", label: "Articles" },
                    { value: "9", label: "Modules" },
                    { value: "27", label: "NCAs" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-[15px] font-bold text-[#0f172a]">
                        {stat.value}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Bottom gradient to next section ── */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-[#f8f9fb] pointer-events-none" />
    </section>
  );
}
