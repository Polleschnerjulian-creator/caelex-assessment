"use client";

import { motion, useInView } from "framer-motion";
import { Database, ShieldCheck, BarChart3, FileCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Data ───

const stages = [
  {
    icon: Database,
    label: "Ingest",
    description: "APIs, logs, configs, and documents flow in automatically",
    metric: "12 sources",
    hash: "0xa3f1...c8d2",
  },
  {
    icon: ShieldCheck,
    label: "Process",
    description: "Validate, hash, and timestamp every piece of evidence",
    metric: "2,847 items",
    hash: "sha256:e7b4...91af",
  },
  {
    icon: FileCheck,
    label: "Map",
    description: "Match evidence to regulatory requirements across frameworks",
    metric: "119 articles",
    hash: "ref:EU-SA-Art.42",
  },
  {
    icon: BarChart3,
    label: "Present",
    description: "Audit-ready dashboards, reports, and compliance scores",
    metric: "94.2%",
    hash: "report:2026-Q1",
  },
];

const features = [
  {
    title: "Zero-Touch Evidence",
    description:
      "Evidence is collected automatically from your infrastructure, APIs, and workflows. No manual uploads, no spreadsheets.",
  },
  {
    title: "Hash-Chain Audit Trail",
    description:
      "Every piece of evidence is cryptographically hashed and chained. Tamper-proof by design, verifiable by any auditor.",
  },
  {
    title: "Live Compliance Score",
    description:
      "Your compliance posture updates in real-time as evidence flows in. See gaps close as your operation matures.",
  },
];

// ─── Animated Counter Hook ───

function useCounter(end: number, duration: number, inView: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [end, duration, inView]);

  return value;
}

// ─── Pipeline Visualization ───

const PIPELINE_VB = { w: 900, h: 200 };

function PipelineVisualization() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const evidenceCount = useCounter(2847, 2000, isInView);
  const complianceScore = useCounter(94, 2500, isInView);

  // Node positions (4 stages, evenly spaced)
  const nodeSpacing = PIPELINE_VB.w / 5;
  const nodeY = PIPELINE_VB.h / 2;
  const nodePositions = stages.map((_, i) => ({
    x: nodeSpacing * (i + 1),
    y: nodeY,
  }));

  return (
    <div ref={ref} className="relative mb-16 md:mb-20">
      {/* Scan-line overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 rounded-2xl overflow-hidden"
        aria-hidden="true"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.015) 2px, rgba(0,255,255,0.015) 4px)",
        }}
      />

      {/* Pipeline container */}
      <div
        className="relative rounded-2xl p-6 md:p-10 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(0,0,0,0.3) 50%, rgba(6,182,212,0.02) 100%)",
          boxShadow:
            "0 0 0 1px rgba(6,182,212,0.1), 0 0 60px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Live metrics bar */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <span className="text-caption font-medium text-cyan-400/70 uppercase tracking-[0.15em] font-mono">
              Evidence Pipeline — Live
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-caption text-white/30 font-mono">
                Evidence:
              </span>
              <span className="text-body font-mono font-medium text-cyan-400">
                {evidenceCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption text-white/30 font-mono">
                Score:
              </span>
              <span className="text-body font-mono font-medium text-cyan-400">
                {complianceScore}.2%
              </span>
            </div>
          </div>
        </div>

        {/* Desktop: SVG Pipeline */}
        <div className="hidden md:block">
          <div
            className="relative mx-auto"
            style={{
              maxWidth: PIPELINE_VB.w,
              aspectRatio: `${PIPELINE_VB.w} / ${PIPELINE_VB.h}`,
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${PIPELINE_VB.w} ${PIPELINE_VB.h}`}
              fill="none"
              aria-hidden="true"
            >
              {/* Connection lines between nodes */}
              {nodePositions.slice(0, -1).map((node, i) => {
                const next = nodePositions[i + 1];
                return (
                  <g key={`conn-${i}`}>
                    {/* Background line */}
                    <line
                      x1={node.x + 30}
                      y1={node.y}
                      x2={next.x - 30}
                      y2={node.y}
                      stroke="rgba(6,182,212,0.1)"
                      strokeWidth="1"
                    />
                    {/* Animated dashed line */}
                    <line
                      x1={node.x + 30}
                      y1={node.y}
                      x2={next.x - 30}
                      y2={node.y}
                      stroke="rgba(6,182,212,0.35)"
                      strokeWidth="1.5"
                      strokeDasharray="6 8"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="-14"
                        dur={`${1.5 + i * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </line>
                    {/* Traveling data particle */}
                    <circle r="2.5" fill="rgba(34,211,238,0.7)">
                      <animate
                        attributeName="cx"
                        values={`${node.x + 30};${next.x - 30}`}
                        dur={`${2 + i * 0.4}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={`${node.y};${node.y}`}
                        dur={`${2 + i * 0.4}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;0.8;0.8;0"
                        dur={`${2 + i * 0.4}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Second particle, offset */}
                    <circle r="1.5" fill="rgba(34,211,238,0.4)">
                      <animate
                        attributeName="cx"
                        values={`${node.x + 30};${next.x - 30}`}
                        dur={`${2.5 + i * 0.3}s`}
                        begin={`${1 + i * 0.2}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={`${node.y};${node.y}`}
                        dur={`${2.5 + i * 0.3}s`}
                        begin={`${1 + i * 0.2}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;0.5;0.5;0"
                        dur={`${2.5 + i * 0.3}s`}
                        begin={`${1 + i * 0.2}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Node glow rings */}
              {nodePositions.map((node, i) => (
                <circle
                  key={`glow-${i}`}
                  cx={node.x}
                  cy={node.y}
                  r="24"
                  fill="none"
                  stroke="rgba(6,182,212,0.08)"
                  strokeWidth="1"
                >
                  <animate
                    attributeName="r"
                    values="24;32;24"
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.08;0.2;0.08"
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            {/* Stage nodes (HTML overlays) */}
            {stages.map((stage, i) => {
              const Icon = stage.icon;
              const pos = nodePositions[i];
              return (
                <motion.div
                  key={stage.label}
                  initial={false}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                  className="absolute z-10"
                  style={{
                    left: `${(pos.x / PIPELINE_VB.w) * 100}%`,
                    top: `${(pos.y / PIPELINE_VB.h) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="flex flex-col items-center gap-2.5">
                    {/* Icon node */}
                    <div
                      className="w-14 h-14 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/20 flex items-center justify-center backdrop-blur-sm"
                      style={{
                        boxShadow:
                          "0 0 20px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}
                    >
                      <Icon size={22} className="text-cyan-400" />
                    </div>
                    {/* Label */}
                    <span className="text-body-lg font-medium text-white whitespace-nowrap">
                      {stage.label}
                    </span>
                    {/* Hash snippet */}
                    <span className="text-micro font-mono text-cyan-400/40 whitespace-nowrap">
                      {stage.hash}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Stage descriptions row */}
          <div className="grid grid-cols-4 gap-4 mt-8 max-w-[900px] mx-auto">
            {stages.map((stage, i) => (
              <motion.div
                key={`desc-${stage.label}`}
                initial={false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-caption text-cyan-400/60 font-mono mb-1">
                  {stage.metric}
                </div>
                <p className="text-small text-white/35 leading-relaxed">
                  {stage.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical pipeline */}
        <div className="md:hidden space-y-4">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.label}
                initial={false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
              >
                <div className="flex items-start gap-4">
                  {/* Vertical connector + icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-11 h-11 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20 flex items-center justify-center flex-shrink-0"
                      style={{
                        boxShadow: "0 0 15px rgba(6,182,212,0.08)",
                      }}
                    >
                      <Icon size={18} className="text-cyan-400" />
                    </div>
                    {i < stages.length - 1 && (
                      <div className="w-px h-4 bg-gradient-to-b from-cyan-500/20 to-transparent mt-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pt-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-body-lg font-medium text-white">
                        {stage.label}
                      </span>
                      <span className="text-micro font-mono text-cyan-400/40">
                        {stage.hash}
                      </span>
                    </div>
                    <p className="text-small text-white/40 leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Component ───

export default function AceSection() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden"
      aria-label="ACE — Autonomous Compliance Evidence Engine"
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(6,182,212,0.07) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Cyan radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(6,182,212,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 bg-black/30 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        {/* ── Header ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-caption font-medium text-cyan-400/70 uppercase tracking-[0.2em] mb-4">
            Coming Soon
          </span>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
            ACE.
          </h2>
          <p className="text-heading md:text-heading text-white/70 mb-4 font-medium">
            Autonomous Compliance Evidence Engine
          </p>
          <p className="text-subtitle md:text-title text-white/45 max-w-[900px] mx-auto leading-relaxed">
            Evidence-based compliance, fully automated. ACE continuously
            collects, validates, and maps compliance evidence across your entire
            operation — replacing manual audits with cryptographically
            verifiable, real-time proof.
          </p>
        </motion.div>

        {/* ── Pipeline Visualization ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <PipelineVisualization />
        </motion.div>

        {/* ── Feature Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              className="relative p-6 md:p-8 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.05] hover:border-cyan-500/[0.15] group overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Top accent line on hover */}
              <div
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              />

              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-pulse" />
                <h3 className="text-heading font-medium text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-body-lg text-white/45 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom Tagline ── */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, delay: 0.9 }}
          className="text-center"
        >
          <p className="text-body text-white/25">
            Autonomous evidence collection for the next era of space compliance.
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
            <span className="text-caption font-mono text-cyan-400/30 uppercase tracking-[0.15em]">
              In Development
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
