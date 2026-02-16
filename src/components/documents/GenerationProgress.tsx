"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Zap } from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";
import type { StreamProgress } from "./DocumentStudio";

// ─── Radial Layout Constants ───

const CX = 200;
const CY = 200;
const RING_R = 130;
const HUB_R = 48;
const INNER_TICK_R = 88;
const INNER_ACCENT_R = 68;
const OUTER_R1 = RING_R + 12;
const OUTER_R2 = RING_R + 22;

// Regulation data fragments for ambient text
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

  // Calculate progress percentage from real stream data
  const getProgress = (): number => {
    if (!streamProgress) return 0;

    if (streamProgress.phase === "preparing") return 5;
    if (streamProgress.phase === "finalizing") return 95;

    // During streaming: 10% base + up to 85% from sections
    const completed = streamProgress.sections.filter((s) => s.completed).length;
    const total = streamProgress.sections.length;
    if (total === 0) return 10;

    const estimatedTotal = getEstimatedSections(documentType);
    const progressBase = 10;
    const progressRange = 85;
    const sectionProgress = Math.min(completed / estimatedTotal, 1);

    return Math.round(progressBase + progressRange * sectionProgress);
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
    return {
      x,
      y,
      angle,
      completed: section?.completed ?? false,
      active: i === activeIndex,
      title: section?.title ?? "",
    };
  });

  // Stable random ambient particles
  const ambientParticles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: 20 + ((i * 137.5) % 360),
        y: 20 + ((i * 97.3 + 50) % 360),
        r: 0.6 + (((i * 31) % 10) / 10) * 1.4,
        duration: 5 + ((i * 7) % 12),
        dx: (((i * 53) % 100) / 100 - 0.5) * 60,
        dy: (((i * 71) % 100) / 100 - 0.5) * 60,
        delay: ((i * 43) % 100) / 20,
      })),
    [],
  );

  // Inner tick marks (24 ticks around INNER_TICK_R)
  const ticks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const a = ((2 * Math.PI) / 24) * i;
        return {
          x1: CX + (INNER_TICK_R - 3) * Math.cos(a),
          y1: CY + (INNER_TICK_R - 3) * Math.sin(a),
          x2: CX + (INNER_TICK_R + 3) * Math.cos(a),
          y2: CY + (INNER_TICK_R + 3) * Math.sin(a),
        };
      }),
    [],
  );

  // Data text fragment positions (orbit around inner ring)
  const dataTextNodes = useMemo(
    () =>
      DATA_FRAGMENTS.map((text, i) => {
        const a = ((2 * Math.PI) / DATA_FRAGMENTS.length) * i;
        const r = INNER_TICK_R + 2 + ((i * 17) % 20);
        return {
          text,
          x: CX + r * Math.cos(a),
          y: CY + r * Math.sin(a),
          opacity: 0.08 + ((i * 13) % 10) / 100,
        };
      }),
    [],
  );

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-2xl">
        {status === "generating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-5"
          >
            {/* ── Radial Visualization ── */}
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              {/* Background glow — stronger */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-3/4 rounded-full bg-emerald-500/[0.07] blur-[80px]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-1/2 h-1/2 rounded-full bg-emerald-400/[0.05] blur-[40px]" />
              </div>

              {/* SVG layer */}
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
                fill="none"
                overflow="visible"
              >
                <defs>
                  <radialGradient id="gen-hub-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="60%" stopColor="#10b981" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="scanBeam" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="softGlow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* ═══ Layer 1: Ambient floating particles ═══ */}
                {ambientParticles.map((p, i) => (
                  <motion.circle
                    key={`amb-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill="#10b981"
                    animate={{
                      cx: [p.x, p.x + p.dx, p.x],
                      cy: [p.y, p.y + p.dy, p.y],
                      opacity: [0.06, 0.2, 0.06],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}

                {/* ═══ Layer 2: Ripple waves from center ═══ */}
                {[0, 1, 2].map((i) => (
                  <motion.circle
                    key={`ripple-${i}`}
                    cx={CX}
                    cy={CY}
                    r={HUB_R}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={0.8}
                    animate={{
                      scale: [1, (RING_R * 1.15) / HUB_R],
                      opacity: [0.2, 0],
                    }}
                    transition={{
                      duration: 3.5,
                      delay: i * 1.15,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  />
                ))}

                {/* ═══ Layer 3: Outer ring 2 (r=OUTER_R2) — very slow CW ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R2}
                  stroke="rgba(16,185,129,0.04)"
                  strokeWidth={0.5}
                  strokeDasharray="2 12"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Layer 4: Outer ring 1 (r=OUTER_R1) — slow CCW ═══ */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R1}
                  stroke="rgba(16,185,129,0.06)"
                  strokeWidth={0.5}
                  strokeDasharray="4 8"
                  fill="none"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Layer 5: Main ring baseline ═══ */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={RING_R}
                  stroke="rgba(16,185,129,0.05)"
                  strokeWidth={0.5}
                  fill="none"
                />

                {/* ═══ Layer 6: Scanning ring + beam — preparing phase ═══ */}
                {phase === "preparing" && (
                  <>
                    <motion.circle
                      cx={CX}
                      cy={CY}
                      r={RING_R}
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="14 10"
                      strokeOpacity={0.3}
                      fill="none"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                    {/* Radar scan beam */}
                    <motion.line
                      x1={CX}
                      y1={CY}
                      x2={CX}
                      y2={CY - RING_R - 8}
                      stroke="url(#scanBeam)"
                      strokeWidth={2}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                    {/* Scan sweep cone */}
                    <motion.path
                      d={`M${CX},${CY} L${CX - 20},${CY - RING_R - 5} A${RING_R + 5},${RING_R + 5} 0 0,1 ${CX + 20},${CY - RING_R - 5} Z`}
                      fill="#10b981"
                      fillOpacity={0.04}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: `${CX}px ${CY}px` }}
                    />
                  </>
                )}

                {/* ═══ Layer 7: Inner tick ring (rotating CCW) ═══ */}
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
                      stroke="rgba(16,185,129,0.1)"
                      strokeWidth={i % 6 === 0 ? 1 : 0.5}
                    />
                  ))}
                </motion.g>

                {/* ═══ Layer 8: Inner accent ring (rotating CW) ═══ */}
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
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Layer 9: Data text fragments (slowly rotating) ═══ */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 45,
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
                      fill="#10b981"
                      fontSize={6}
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      animate={{
                        opacity: [d.opacity, d.opacity * 2.5, d.opacity],
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

                {/* ═══ Layer 10: Cross-connections between adjacent completed nodes ═══ */}
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
                        stroke="rgba(16,185,129,0.12)"
                        strokeWidth={0.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      />
                    );
                  }
                  return null;
                })}

                {/* ═══ Layer 11: Arcs hub → nodes ═══ */}
                {nodes.map((node, i) => (
                  <g key={`arc-${i}`}>
                    <motion.path
                      d={`M${CX},${CY} L${node.x.toFixed(1)},${node.y.toFixed(1)}`}
                      stroke={
                        node.completed
                          ? "rgba(16,185,129,0.3)"
                          : node.active
                            ? "rgba(16,185,129,0.5)"
                            : "rgba(255,255,255,0.03)"
                      }
                      strokeWidth={
                        node.active ? 1.5 : node.completed ? 0.8 : 0.3
                      }
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    />
                    {/* Animated dash on active arc */}
                    {node.active && (
                      <motion.path
                        d={`M${CX},${CY} L${node.x.toFixed(1)},${node.y.toFixed(1)}`}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        filter="url(#softGlow)"
                        animate={{ strokeDashoffset: [0, -20] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </g>
                ))}

                {/* ═══ Layer 12: Data stream particles on arcs ═══ */}
                {nodes.map((node, i) => {
                  if (!node.completed && !node.active) return null;
                  const count = node.active ? 5 : 2;
                  const speed = node.active ? 1.2 : 2.2;
                  return Array.from({ length: count }, (_, p) => (
                    <motion.circle
                      key={`stream-${i}-${p}`}
                      r={node.active ? 2.5 : 1.2}
                      fill="#10b981"
                      filter={node.active ? "url(#softGlow)" : undefined}
                      animate={{
                        cx: [node.x, CX],
                        cy: [node.y, CY],
                        opacity: [0, node.active ? 0.9 : 0.35, 0],
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

                {/* Reverse particles: hub → active node (data out) */}
                {nodes.map(
                  (node, i) =>
                    node.active &&
                    [0, 1].map((p) => (
                      <motion.circle
                        key={`rev-${i}-${p}`}
                        r={1.5}
                        fill="#06b6d4"
                        animate={{
                          cx: [CX, node.x],
                          cy: [CY, node.y],
                          opacity: [0, 0.6, 0],
                        }}
                        transition={{
                          duration: 2,
                          delay: p * 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )),
                )}

                {/* ═══ Layer 13: Hub glow ═══ */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 30}
                  fill="url(#gen-hub-glow)"
                />

                {/* ═══ Layer 14: Hub circle ═══ */}
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
                  r={HUB_R + 5}
                  stroke="rgba(16,185,129,0.15)"
                  strokeWidth={1}
                  strokeDasharray="6 3"
                  fill="none"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* Hub rotating ring 2 */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 9}
                  stroke="rgba(16,185,129,0.08)"
                  strokeWidth={0.5}
                  strokeDasharray="3 5"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
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
                  strokeWidth={1}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.15, 0.35, 0.15],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ═══ Layer 15: Section nodes ═══ */}
                {nodes.map((node, i) => {
                  if (node.completed) {
                    return (
                      <g key={`n-${i}`}>
                        {/* Completed glow halo */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={14}
                          fill="rgba(16,185,129,0.06)"
                          animate={{
                            opacity: [0.06, 0.12, 0.06],
                          }}
                          transition={{
                            duration: 2,
                            delay: i * 0.2,
                            repeat: Infinity,
                          }}
                        />
                        {/* Completed: solid emerald with spring pop */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={9}
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
                          d={`M${node.x - 3.5},${node.y + 0.5} L${node.x - 0.5},${node.y + 3.5} L${node.x + 4},${node.y - 2.5}`}
                          stroke="white"
                          strokeWidth={1.8}
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
                    const lx = node.x + 24 * cos;
                    const ly = node.y + 24 * sin;
                    const anchor =
                      cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
                    const baseline =
                      sin > 0.3 ? "hanging" : sin < -0.3 ? "auto" : "central";
                    const label =
                      node.title.length > 24
                        ? node.title.slice(0, 24) + "\u2026"
                        : node.title;
                    return (
                      <g key={`n-${i}`}>
                        {/* Outer pulse glow */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={22}
                          fill="rgba(16,185,129,0.05)"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.15, 0.03, 0.15],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Inner pulse glow */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={16}
                          fill="rgba(16,185,129,0.1)"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.25, 0.08, 0.25],
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
                          r={10}
                          fill="rgba(16,185,129,0.2)"
                          stroke="#10b981"
                          strokeWidth={2}
                          filter="url(#glow)"
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Active dot inner */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={4}
                          fill="#10b981"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        {/* Section title label */}
                        {label && (
                          <text
                            x={lx}
                            y={ly}
                            fill="#10b981"
                            fontSize={9.5}
                            fontWeight={600}
                            textAnchor={anchor}
                            dominantBaseline={baseline}
                            filter="url(#softGlow)"
                          >
                            {label}
                          </text>
                        )}
                      </g>
                    );
                  }

                  // Pending: dim dot with subtle pulse
                  return (
                    <motion.circle
                      key={`n-${i}`}
                      cx={node.x}
                      cy={node.y}
                      r={4}
                      fill="rgba(255,255,255,0.06)"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={1}
                      animate={{
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  );
                })}

                {/* ═══ Layer 16: Finalizing burst ═══ */}
                {phase === "finalizing" && (
                  <>
                    {[0, 1].map((i) => (
                      <motion.circle
                        key={`final-${i}`}
                        cx={CX}
                        cy={CY}
                        r={RING_R}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        animate={{
                          scale: [HUB_R / RING_R, 1.15],
                          opacity: [0.4, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.75,
                          repeat: Infinity,
                        }}
                        style={{ transformOrigin: `${CX}px ${CY}px` }}
                      />
                    ))}
                    {/* All nodes pulse in finalizing */}
                    {nodes.map((node, i) => (
                      <motion.circle
                        key={`fp-${i}`}
                        cx={node.x}
                        cy={node.y}
                        r={12}
                        fill="rgba(16,185,129,0.08)"
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.15, 0.03, 0.15],
                        }}
                        transition={{
                          duration: 1.2,
                          delay: i * 0.1,
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

              {/* Center hub text overlay (HTML for crisp rendering) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <Zap size={18} className="text-emerald-400 mb-1.5" />
                  <span className="text-3xl font-bold text-white tabular-nums leading-none">
                    {progress}%
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-semibold tracking-widest uppercase mt-2">
                    {phaseLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Document type label */}
            <p className="text-sm font-medium text-white/50">{meta?.title}</p>

            {/* Overall progress bar */}
            <div className="w-full max-w-xs">
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
