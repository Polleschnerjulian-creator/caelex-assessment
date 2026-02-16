"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Zap } from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";
import type { StreamProgress } from "./DocumentStudio";

// ─── Radial Layout Constants (viewBox 500x500) ───

const CX = 250;
const CY = 250;
const RING_R = 155;
const HUB_R = 52;
const INNER_TICK_R = 108;
const INNER_ACCENT_R = 82;

// Regulation data fragments
const DATA_FRAGMENTS = [
  "§12.3",
  "Art.7(2)",
  "NIS2-A21",
  "Art.23",
  "DORA-15",
  "ISO27001",
  "§8.1(b)",
  "Art.10",
  "EU-2022",
  "SATCOM",
  "Art.29(1)",
  "§15.4",
  "Art.21(2)",
  "COM-335",
  "Art.6",
  "NIS2-27",
];

// ─── Component ───

interface GenerationProgressProps {
  status: "idle" | "generating" | "completed" | "error";
  errorMessage: string | null;
  documentType: DocumentGenerationType | null;
  streamProgress: StreamProgress | null;
  onRetry: () => void;
}

export function GenerationProgress({
  status,
  errorMessage,
  documentType,
  streamProgress,
  onRetry,
}: GenerationProgressProps) {
  const meta = documentType ? DOCUMENT_TYPE_META[documentType] : null;

  const getProgress = (): number => {
    if (!streamProgress) return 0;
    if (streamProgress.phase === "preparing") return 5;
    if (streamProgress.phase === "finalizing") return 95;
    const completed = streamProgress.sections.filter((s) => s.completed).length;
    const total = streamProgress.sections.length;
    if (total === 0) return 10;
    const estimatedTotal = getEstimatedSections(documentType);
    return Math.round(10 + 85 * Math.min(completed / estimatedTotal, 1));
  };

  const progress = getProgress();

  // ─── Radial visualization data ───
  const estimatedTotal = getEstimatedSections(documentType);
  const phase = streamProgress?.phase ?? "preparing";
  const sections = streamProgress?.sections ?? [];
  const nodeCount = Math.max(estimatedTotal, sections.length);
  const activeIndex =
    phase === "streaming" ? sections.findIndex((s) => !s.completed) : -1;
  const completedCount = sections.filter((s) => s.completed).length;

  const phaseLabel =
    phase === "preparing"
      ? "Collecting Data"
      : phase === "streaming"
        ? `Writing ${Math.min(completedCount + 1, nodeCount)}/${nodeCount}`
        : "Finalizing";

  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = ((2 * Math.PI) / nodeCount) * i - Math.PI / 2;
    const x = CX + RING_R * Math.cos(angle);
    const y = CY + RING_R * Math.sin(angle);
    const section = sections[i];
    // Curved arc control point — alternating curve direction
    const curveDir = i % 2 === 0 ? 1 : -1;
    const perpAngle = angle + Math.PI / 2;
    const cpx = (CX + x) / 2 + 28 * curveDir * Math.cos(perpAngle);
    const cpy = (CY + y) / 2 + 28 * curveDir * Math.sin(perpAngle);
    return {
      x,
      y,
      angle,
      cpx,
      cpy,
      arcPath: `M${CX},${CY} Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`,
      completed: section?.completed ?? false,
      active: i === activeIndex,
      title: section?.title ?? "",
    };
  });

  // Progress arc (circular indicator around hub)
  const progressCircumference = 2 * Math.PI * (HUB_R + 7);
  const progressDashOffset = progressCircumference * (1 - progress / 100);

  // Stable random ambient particles
  const ambientParticles = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        x: 15 + ((i * 137.5) % 470),
        y: 15 + ((i * 97.3 + 50) % 470),
        r: 0.5 + (((i * 31) % 10) / 10) * 1.5,
        duration: 5 + ((i * 7) % 12),
        dx: (((i * 53) % 100) / 100 - 0.5) * 70,
        dy: (((i * 71) % 100) / 100 - 0.5) * 70,
        delay: ((i * 43) % 100) / 20,
      })),
    [],
  );

  // Starfield — tiny static dots
  const starfield = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        x: 5 + ((i * 173.7 + 23) % 490),
        y: 5 + ((i * 121.3 + 67) % 490),
        r: 0.3 + (((i * 19) % 8) / 8) * 0.5,
        opacity: 0.04 + (((i * 37) % 10) / 10) * 0.08,
      })),
    [],
  );

  // Inner tick marks
  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const a = ((2 * Math.PI) / 36) * i;
        const len = i % 3 === 0 ? 5 : 2.5;
        return {
          x1: CX + (INNER_TICK_R - len) * Math.cos(a),
          y1: CY + (INNER_TICK_R - len) * Math.sin(a),
          x2: CX + (INNER_TICK_R + len) * Math.cos(a),
          y2: CY + (INNER_TICK_R + len) * Math.sin(a),
          major: i % 3 === 0,
        };
      }),
    [],
  );

  // Data text positions
  const dataTextNodes = useMemo(
    () =>
      DATA_FRAGMENTS.map((text, i) => {
        const a = ((2 * Math.PI) / DATA_FRAGMENTS.length) * i;
        const r = INNER_TICK_R + 5 + ((i * 17) % 22);
        return {
          text,
          x: CX + r * Math.cos(a),
          y: CY + r * Math.sin(a),
          opacity: 0.06 + ((i * 13) % 10) / 80,
        };
      }),
    [],
  );

  // Orbital particles (small dots on orbital paths)
  const orbitalDots = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = ((2 * Math.PI) / 10) * i;
        const r = i < 5 ? RING_R + 18 : INNER_ACCENT_R - 8;
        return {
          x: CX + r * Math.cos(a),
          y: CY + r * Math.sin(a),
          r: i < 5 ? 1.2 : 0.8,
          ring: i < 5 ? "outer" : "inner",
        };
      }),
    [],
  );

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-3xl">
        {status === "generating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-4"
          >
            {/* ── Radial Visualization ── */}
            <div
              className="relative w-full aspect-square max-w-[600px] mx-auto"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(16,185,129,0.025) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              {/* Background glows */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-4/5 rounded-full bg-emerald-500/[0.06] blur-[100px]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-1/2 h-1/2 rounded-full bg-cyan-500/[0.04] blur-[60px]" />
              </div>

              {/* SVG layer */}
              <svg
                viewBox="0 0 500 500"
                className="w-full h-full"
                fill="none"
                overflow="visible"
              >
                <defs>
                  <radialGradient id="gen-hub-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="scanBeam" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id="progressStroke"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="softGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="bigGlow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* ═══ Corner brackets (HUD frame) ═══ */}
                <path
                  d="M40,18 L18,18 L18,40"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth={1}
                />
                <path
                  d="M460,18 L482,18 L482,40"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth={1}
                />
                <path
                  d="M18,460 L18,482 L40,482"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth={1}
                />
                <path
                  d="M482,460 L482,482 L460,482"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth={1}
                />
                {/* Corner accent dots */}
                <circle cx={18} cy={18} r={1.5} fill="rgba(16,185,129,0.15)" />
                <circle cx={482} cy={18} r={1.5} fill="rgba(16,185,129,0.15)" />
                <circle cx={18} cy={482} r={1.5} fill="rgba(16,185,129,0.15)" />
                <circle
                  cx={482}
                  cy={482}
                  r={1.5}
                  fill="rgba(16,185,129,0.15)"
                />

                {/* ═══ Starfield (static tiny dots) ═══ */}
                {starfield.map((s, i) => (
                  <circle
                    key={`star-${i}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={`rgba(255,255,255,${s.opacity})`}
                  />
                ))}

                {/* ═══ Ambient floating particles ═══ */}
                {ambientParticles.map((p, i) => (
                  <motion.circle
                    key={`amb-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={i % 4 === 0 ? "#06b6d4" : "#10b981"}
                    animate={{
                      cx: [p.x, p.x + p.dx, p.x],
                      cy: [p.y, p.y + p.dy, p.y],
                      opacity: [0.05, 0.25, 0.05],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}

                {/* ═══ Ripple waves ═══ */}
                {[0, 1, 2].map((i) => (
                  <motion.circle
                    key={`ripple-${i}`}
                    cx={CX}
                    cy={CY}
                    r={HUB_R}
                    fill="none"
                    stroke={i === 1 ? "#06b6d4" : "#10b981"}
                    strokeWidth={0.6}
                    animate={{
                      scale: [1, (RING_R * 1.2) / HUB_R],
                      opacity: [0.2, 0],
                    }}
                    transition={{
                      duration: 4,
                      delay: i * 1.3,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  />
                ))}

                {/* ═══ Outer orbital ring 2 (r+26) ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={RING_R + 26}
                  stroke="rgba(16,185,129,0.04)"
                  strokeWidth={0.5}
                  strokeDasharray="2 14"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 55,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Outer orbital ring 1 (r+14) ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={RING_R + 14}
                  stroke="rgba(16,185,129,0.06)"
                  strokeWidth={0.5}
                  strokeDasharray="5 8"
                  fill="none"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Main ring baseline ═══ */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={RING_R}
                  stroke="rgba(16,185,129,0.06)"
                  strokeWidth={0.5}
                  fill="none"
                />

                {/* ═══ Scanning ring + radar beam — preparing ═══ */}
                {phase === "preparing" && (
                  <>
                    <motion.circle
                      cx={CX}
                      cy={CY}
                      r={RING_R}
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="16 10"
                      strokeOpacity={0.35}
                      fill="none"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                    {/* Radar beam */}
                    <motion.line
                      x1={CX}
                      y1={CY}
                      x2={CX}
                      y2={CY - RING_R - 10}
                      stroke="url(#scanBeam)"
                      strokeWidth={2.5}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                    {/* Sweep cone */}
                    <motion.path
                      d={`M${CX},${CY} L${CX - 25},${CY - RING_R - 8} A${RING_R + 8},${RING_R + 8} 0 0,1 ${CX + 25},${CY - RING_R - 8} Z`}
                      fill="#10b981"
                      fillOpacity={0.05}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                    {/* Second beam (offset) */}
                    <motion.line
                      x1={CX}
                      y1={CY}
                      x2={CX}
                      y2={CY - RING_R - 10}
                      stroke="url(#scanBeam)"
                      strokeWidth={1.5}
                      strokeOpacity={0.4}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                  </>
                )}

                {/* ═══ Inner tick ring ═══ */}
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  <circle
                    cx={CX}
                    cy={CY}
                    r={INNER_TICK_R}
                    stroke="rgba(16,185,129,0.06)"
                    strokeWidth={0.5}
                    fill="none"
                  />
                  {ticks.map((t, i) => (
                    <line
                      key={`tick-${i}`}
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      stroke={
                        t.major
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(16,185,129,0.07)"
                      }
                      strokeWidth={t.major ? 1 : 0.5}
                    />
                  ))}
                </motion.g>

                {/* ═══ Inner accent ring ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={INNER_ACCENT_R}
                  stroke="rgba(16,185,129,0.05)"
                  strokeWidth={0.5}
                  strokeDasharray="2 6"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Data text fragments ═══ */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 50,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  {dataTextNodes.map((d, i) => (
                    <motion.text
                      key={`dt-${i}`}
                      x={d.x}
                      y={d.y}
                      fill={i % 3 === 0 ? "#06b6d4" : "#10b981"}
                      fontSize={6.5}
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      animate={{
                        opacity: [d.opacity, d.opacity * 3, d.opacity],
                      }}
                      transition={{
                        duration: 3 + (i % 4),
                        delay: (i * 0.4) % 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {d.text}
                    </motion.text>
                  ))}
                </motion.g>

                {/* ═══ Orbital dot particles ═══ */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  {orbitalDots
                    .filter((d) => d.ring === "outer")
                    .map((d, i) => (
                      <motion.circle
                        key={`od-o-${i}`}
                        cx={d.x}
                        cy={d.y}
                        r={d.r}
                        fill="#10b981"
                        animate={{
                          opacity: [0.15, 0.5, 0.15],
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.4,
                          repeat: Infinity,
                        }}
                      />
                    ))}
                </motion.g>
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  {orbitalDots
                    .filter((d) => d.ring === "inner")
                    .map((d, i) => (
                      <motion.circle
                        key={`od-i-${i}`}
                        cx={d.x}
                        cy={d.y}
                        r={d.r}
                        fill="#06b6d4"
                        animate={{
                          opacity: [0.1, 0.4, 0.1],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.3,
                          repeat: Infinity,
                        }}
                      />
                    ))}
                </motion.g>

                {/* ═══ Cross-connections between completed ═══ */}
                {nodes.map((node, i) => {
                  const next = nodes[(i + 1) % nodes.length];
                  if (node.completed && next.completed) {
                    return (
                      <motion.line
                        key={`cross-${i}`}
                        x1={node.x}
                        y1={node.y}
                        x2={next.x}
                        y2={next.y}
                        stroke="rgba(16,185,129,0.15)"
                        strokeWidth={0.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    );
                  }
                  return null;
                })}

                {/* ═══ Curved arcs: hub → nodes ═══ */}
                {nodes.map((node, i) => (
                  <g key={`arc-${i}`}>
                    <motion.path
                      d={node.arcPath}
                      stroke={
                        node.completed
                          ? "rgba(16,185,129,0.3)"
                          : node.active
                            ? "rgba(16,185,129,0.5)"
                            : "rgba(255,255,255,0.025)"
                      }
                      strokeWidth={
                        node.active ? 1.8 : node.completed ? 0.8 : 0.3
                      }
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                    {/* Glowing animated dash on active */}
                    {node.active && (
                      <motion.path
                        d={node.arcPath}
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="6 5"
                        filter="url(#softGlow)"
                        animate={{ strokeDashoffset: [0, -22] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                    {/* Completed arc glow */}
                    {node.completed && (
                      <path
                        d={node.arcPath}
                        stroke="rgba(16,185,129,0.08)"
                        strokeWidth={4}
                      />
                    )}
                  </g>
                ))}

                {/* ═══ Stream particles on arcs ═══ */}
                {nodes.map((node, i) => {
                  if (!node.completed && !node.active) return null;
                  const count = node.active ? 6 : 2;
                  const speed = node.active ? 1.0 : 2.5;
                  return Array.from({ length: count }, (_, p) => (
                    <motion.circle
                      key={`s-${i}-${p}`}
                      r={node.active ? 2.5 : 1}
                      fill={p % 3 === 0 ? "#06b6d4" : "#10b981"}
                      filter={node.active ? "url(#softGlow)" : undefined}
                      animate={{
                        cx: [node.x, node.cpx, CX],
                        cy: [node.y, node.cpy, CY],
                        opacity: [0, node.active ? 0.9 : 0.3, 0],
                      }}
                      transition={{
                        duration: speed,
                        delay: p * (speed / count),
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  ));
                })}

                {/* Reverse particles: hub → active (cyan) */}
                {nodes.map(
                  (node, i) =>
                    node.active &&
                    [0, 1, 2].map((p) => (
                      <motion.circle
                        key={`rev-${i}-${p}`}
                        r={1.5}
                        fill="#06b6d4"
                        animate={{
                          cx: [CX, node.cpx, node.x],
                          cy: [CY, node.cpy, node.y],
                          opacity: [0, 0.7, 0],
                        }}
                        transition={{
                          duration: 1.8,
                          delay: p * 0.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )),
                )}

                {/* ═══ Hub glow ═══ */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 35}
                  fill="url(#gen-hub-glow)"
                />

                {/* ═══ Hub progress arc ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 7}
                  stroke="url(#progressStroke)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#softGlow)"
                  strokeDasharray={progressCircumference}
                  animate={{ strokeDashoffset: progressDashOffset }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  transform={`rotate(-90 ${CX} ${CY})`}
                />
                {/* Progress arc track */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 7}
                  stroke="rgba(16,185,129,0.06)"
                  strokeWidth={3}
                  fill="none"
                />

                {/* ═══ Hub circle ═══ */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R}
                  fill="rgba(10,15,30,0.95)"
                  stroke="rgba(16,185,129,0.3)"
                  strokeWidth={2}
                />

                {/* Hub rotating ring 1 */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 13}
                  stroke="rgba(16,185,129,0.1)"
                  strokeWidth={0.8}
                  strokeDasharray="6 3"
                  fill="none"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* Hub rotating ring 2 */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 17}
                  stroke="rgba(6,182,212,0.06)"
                  strokeWidth={0.5}
                  strokeDasharray="3 5"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* Hub pulse */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  animate={{
                    scale: [1, 1.18, 1],
                    opacity: [0.1, 0.35, 0.1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Section nodes ═══ */}
                {nodes.map((node, i) => {
                  if (node.completed) {
                    return (
                      <g key={`n-${i}`}>
                        {/* Glow halo */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={18}
                          fill="rgba(16,185,129,0.06)"
                          animate={{ opacity: [0.04, 0.12, 0.04] }}
                          transition={{
                            duration: 2,
                            delay: i * 0.2,
                            repeat: Infinity,
                          }}
                        />
                        {/* Solid dot */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={10}
                          fill="#10b981"
                          filter="url(#softGlow)"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 12,
                          }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Checkmark */}
                        <motion.path
                          d={`M${node.x - 4},${node.y + 0.5} L${node.x - 1},${node.y + 4} L${node.x + 4.5},${node.y - 3}`}
                          stroke="white"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: 0.15 }}
                        />
                      </g>
                    );
                  }

                  if (node.active) {
                    const cos = Math.cos(node.angle);
                    const sin = Math.sin(node.angle);
                    // Foreign object label position
                    const foW = 150;
                    const foH = 28;
                    const labelDist = 24;
                    const foX =
                      cos > 0.3
                        ? node.x + labelDist
                        : cos < -0.3
                          ? node.x - labelDist - foW
                          : node.x - foW / 2;
                    const foY =
                      sin > 0.3
                        ? node.y + labelDist
                        : sin < -0.3
                          ? node.y - labelDist - foH
                          : node.y - foH / 2;

                    return (
                      <g key={`n-${i}`}>
                        {/* Outer pulse glow */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={28}
                          fill="rgba(16,185,129,0.04)"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.12, 0.02, 0.12],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Mid pulse */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={18}
                          fill="rgba(16,185,129,0.08)"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.2, 0.05, 0.2],
                          }}
                          transition={{
                            duration: 1.5,
                            delay: 0.2,
                            repeat: Infinity,
                          }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Active dot */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={12}
                          fill="rgba(16,185,129,0.2)"
                          stroke="#10b981"
                          strokeWidth={2}
                          filter="url(#glow)"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Inner bright dot */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={5}
                          fill="#10b981"
                          filter="url(#softGlow)"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        {/* Label card via foreignObject */}
                        {node.title && (
                          <foreignObject
                            x={foX}
                            y={foY}
                            width={foW}
                            height={foH}
                          >
                            <div
                              style={{
                                background: "rgba(16,185,129,0.08)",
                                border: "1px solid rgba(16,185,129,0.2)",
                                borderRadius: "6px",
                                padding: "3px 10px",
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#10b981",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                backdropFilter: "blur(4px)",
                                fontFamily: "inherit",
                              }}
                            >
                              {node.title}
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  }

                  // Pending node
                  return (
                    <motion.circle
                      key={`n-${i}`}
                      cx={node.x}
                      cy={node.y}
                      r={4.5}
                      fill="rgba(255,255,255,0.05)"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={1}
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{
                        duration: 2,
                        delay: i * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  );
                })}

                {/* ═══ Finalizing effects ═══ */}
                {phase === "finalizing" && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.circle
                        key={`fburst-${i}`}
                        cx={CX}
                        cy={CY}
                        r={RING_R}
                        fill="none"
                        stroke={i === 1 ? "#06b6d4" : "#10b981"}
                        strokeWidth={1.5}
                        animate={{
                          scale: [HUB_R / RING_R, 1.2],
                          opacity: [0.4, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.5,
                          repeat: Infinity,
                        }}
                        style={{ transformOrigin: `${CX}px ${CY}px` }}
                      />
                    ))}
                    {nodes.map((node, i) => (
                      <motion.circle
                        key={`fp-${i}`}
                        cx={node.x}
                        cy={node.y}
                        r={14}
                        fill="rgba(16,185,129,0.06)"
                        animate={{
                          scale: [1, 1.8, 1],
                          opacity: [0.12, 0.02, 0.12],
                        }}
                        transition={{
                          duration: 1,
                          delay: i * 0.08,
                          repeat: Infinity,
                        }}
                        style={{
                          transformOrigin: `${node.x}px ${node.y}px`,
                        }}
                      />
                    ))}
                  </>
                )}
              </svg>

              {/* Center hub text (HTML overlay) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <Zap size={20} className="text-emerald-400 mb-1.5" />
                  <span className="text-4xl font-bold text-white tabular-nums leading-none">
                    {progress}%
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-semibold tracking-[0.2em] uppercase mt-2">
                    {phaseLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Document type */}
            <p className="text-sm font-medium text-white/50">{meta?.title}</p>

            {/* Progress bar */}
            <div className="w-full max-w-sm">
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                Document Generated
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                Your document is ready for review
              </p>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <XCircle size={28} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                Generation Failed
              </h3>
              <p className="text-sm text-red-500/80 mt-1">
                {errorMessage || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Section Count Estimates ───

function getEstimatedSections(
  documentType: DocumentGenerationType | null,
): number {
  switch (documentType) {
    case "DEBRIS_MITIGATION_PLAN":
      return 12;
    case "CYBERSECURITY_FRAMEWORK":
      return 8;
    case "NIS2_ASSESSMENT":
      return 9;
    case "ENVIRONMENTAL_FOOTPRINT":
      return 8;
    case "INSURANCE_COMPLIANCE":
      return 8;
    case "AUTHORIZATION_APPLICATION":
      return 10;
    default:
      return 8;
  }
}
