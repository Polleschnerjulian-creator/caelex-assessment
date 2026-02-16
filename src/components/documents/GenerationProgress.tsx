"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Zap } from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";
import type { StreamProgress } from "./DocumentStudio";

// ─── Radial Layout Constants ───

const CX = 200;
const CY = 200;
const RING_R = 130;
const HUB_R = 44;

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

    // Estimate total sections based on document type (from prompt structure)
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

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-lg">
        {status === "generating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-5"
          >
            {/* ── Radial Visualization ── */}
            <div className="relative w-full aspect-square max-w-[380px]">
              {/* Background radial glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 h-2/3 rounded-full bg-emerald-500/[0.04] blur-[60px]" />
              </div>

              {/* SVG layer */}
              <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
                <defs>
                  <radialGradient id="gen-hub-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Hub ambient glow */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 24}
                  fill="url(#gen-hub-glow)"
                />

                {/* Outer decorative ring — slow rotation */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={RING_R + 10}
                  stroke="rgba(16,185,129,0.05)"
                  strokeWidth={0.5}
                  strokeDasharray="3 9"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 50,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* Scanning ring — preparing phase */}
                {phase === "preparing" && (
                  <motion.circle
                    cx={CX}
                    cy={CY}
                    r={RING_R}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="14 10"
                    strokeOpacity={0.25}
                    fill="none"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  />
                )}

                {/* Arcs: hub → each node */}
                {nodes.map((node, i) => (
                  <g key={`arc-${i}`}>
                    <motion.path
                      d={`M${CX},${CY} L${node.x.toFixed(1)},${node.y.toFixed(1)}`}
                      stroke={
                        node.completed
                          ? "rgba(16,185,129,0.25)"
                          : node.active
                            ? "rgba(16,185,129,0.35)"
                            : "rgba(255,255,255,0.03)"
                      }
                      strokeWidth={node.active ? 1.5 : 0.5}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.04 }}
                    />
                    {/* Animated dash on active arc */}
                    {node.active && (
                      <motion.path
                        d={`M${CX},${CY} L${node.x.toFixed(1)},${node.y.toFixed(1)}`}
                        stroke="#10b981"
                        strokeWidth={1}
                        strokeDasharray="4 6"
                        animate={{ strokeDashoffset: [0, -20] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </g>
                ))}

                {/* Particle trail: active node → hub */}
                {nodes.map(
                  (node, i) =>
                    node.active &&
                    [0, 1, 2].map((p) => (
                      <motion.circle
                        key={`p-${i}-${p}`}
                        r={2}
                        fill="#10b981"
                        animate={{
                          cx: [node.x, CX],
                          cy: [node.y, CY],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 1.6,
                          delay: p * 0.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )),
                )}

                {/* Hub circle */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R}
                  fill="rgba(10,15,30,0.9)"
                  stroke="rgba(16,185,129,0.25)"
                  strokeWidth={2}
                />

                {/* Hub rotating ring */}
                <motion.circle
                  cx={CX}
                  cy={CY}
                  r={HUB_R + 5}
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth={1}
                  strokeDasharray="6 4"
                  fill="none"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ── Section nodes ── */}
                {nodes.map((node, i) => {
                  if (node.completed) {
                    return (
                      <g key={`n-${i}`}>
                        {/* Completed: solid emerald with spring pop */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={7}
                          fill="#10b981"
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
                        {/* Checkmark path */}
                        <motion.path
                          d={`M${node.x - 3},${node.y + 0.5} L${node.x - 0.5},${node.y + 3} L${node.x + 3.5},${node.y - 2}`}
                          stroke="white"
                          strokeWidth={1.5}
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
                    const lx = node.x + 20 * cos;
                    const ly = node.y + 20 * sin;
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
                        {/* Pulse glow */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={16}
                          fill="rgba(16,185,129,0.08)"
                          animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.3, 0.08, 0.3],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Active dot */}
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={8}
                          fill="rgba(16,185,129,0.15)"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                        {/* Section title label */}
                        {label && (
                          <text
                            x={lx}
                            y={ly}
                            fill="rgba(16,185,129,0.8)"
                            fontSize={9}
                            fontWeight={500}
                            textAnchor={anchor}
                            dominantBaseline={baseline}
                          >
                            {label}
                          </text>
                        )}
                      </g>
                    );
                  }

                  // Pending: small dim dot
                  return (
                    <circle
                      key={`n-${i}`}
                      cx={node.x}
                      cy={node.y}
                      r={3.5}
                      fill="rgba(255,255,255,0.08)"
                    />
                  );
                })}

                {/* Finalizing: expanding pulse ring */}
                {phase === "finalizing" && (
                  <motion.circle
                    cx={CX}
                    cy={CY}
                    r={RING_R}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1}
                    animate={{
                      scale: [HUB_R / RING_R, 1.08],
                      opacity: [0.35, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  />
                )}
              </svg>

              {/* Center hub text overlay (HTML for crisp text) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <Zap size={16} className="text-emerald-500 mb-1" />
                  <span className="text-2xl font-bold text-white tabular-nums leading-none">
                    {progress}%
                  </span>
                  <span className="text-[9px] text-emerald-400/60 font-medium tracking-widest uppercase mt-1.5">
                    {phaseLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Document type label */}
            <p className="text-sm text-white/50">{meta?.title}</p>

            {/* Overall progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
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
