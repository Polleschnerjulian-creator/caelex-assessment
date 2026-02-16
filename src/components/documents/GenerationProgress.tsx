"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Scale,
  GitCompareArrows,
  PenTool,
  SearchCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";

interface GenerationProgressProps {
  status: "idle" | "generating" | "completed" | "error";
  errorMessage: string | null;
  documentType: DocumentGenerationType | null;
  onRetry: () => void;
}

// ASTRA work phases — shown sequentially during generation
const GENERATION_PHASES = [
  {
    icon: Database,
    title: "Collecting Assessment Data",
    subtitle: "Scanning compliance modules for relevant data points...",
    duration: 4000,
  },
  {
    icon: Scale,
    title: "Analyzing Regulatory Framework",
    subtitle:
      "Cross-referencing EU Space Act articles and NIS2 requirements...",
    duration: 6000,
  },
  {
    icon: GitCompareArrows,
    title: "Evaluating Compliance Status",
    subtitle: "Mapping assessment results against regulatory thresholds...",
    duration: 5000,
  },
  {
    icon: PenTool,
    title: "Drafting Document Sections",
    subtitle: "Generating structured content for each section...",
    duration: 15000,
  },
  {
    icon: SearchCheck,
    title: "Reviewing & Validating Content",
    subtitle: "Checking regulatory accuracy and cross-references...",
    duration: 8000,
  },
  {
    icon: Sparkles,
    title: "Finalizing Document",
    subtitle: "Formatting structure and preparing for review...",
    duration: 6000,
  },
];

export function GenerationProgress({
  status,
  errorMessage,
  documentType,
  onRetry,
}: GenerationProgressProps) {
  const meta = documentType ? DOCUMENT_TYPE_META[documentType] : null;
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);

  // Advance through phases during generation
  useEffect(() => {
    if (status !== "generating") {
      setCurrentPhase(0);
      setPhaseProgress(0);
      return;
    }

    let phaseIndex = 0;
    let animFrame: number;
    let startTime = Date.now();

    const tick = () => {
      if (phaseIndex >= GENERATION_PHASES.length) return;

      const elapsed = Date.now() - startTime;
      const phaseDuration = GENERATION_PHASES[phaseIndex].duration;
      const progress = Math.min(elapsed / phaseDuration, 1);

      setPhaseProgress(progress);

      if (progress >= 1 && phaseIndex < GENERATION_PHASES.length - 1) {
        phaseIndex++;
        setCurrentPhase(phaseIndex);
        startTime = Date.now();
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [status]);

  // Calculate overall progress
  const totalDuration = GENERATION_PHASES.reduce(
    (sum, p) => sum + p.duration,
    0,
  );
  const completedDuration = GENERATION_PHASES.slice(0, currentPhase).reduce(
    (sum, p) => sum + p.duration,
    0,
  );
  const currentPhaseDuration = GENERATION_PHASES[currentPhase]?.duration ?? 0;
  const overallProgress =
    (completedDuration + currentPhaseDuration * phaseProgress) / totalDuration;

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-lg">
        {status === "generating" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            {/* ASTRA avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap size={24} className="text-emerald-500" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>

            {/* Title */}
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                ASTRA is generating your document
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                {meta?.title}
              </p>
            </div>

            {/* Phase list */}
            <div className="w-full space-y-1">
              {GENERATION_PHASES.map((phase, index) => {
                const isActive = currentPhase === index;
                const isCompleted = currentPhase > index;
                const isPending = currentPhase < index;
                const Icon = phase.icon;

                return (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      opacity: isPending ? 0.35 : 1,
                      height: isActive ? "auto" : "auto",
                    }}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors duration-300 ${
                      isActive
                        ? "bg-emerald-500/[0.06] border border-emerald-500/20"
                        : isCompleted
                          ? "bg-emerald-500/[0.03]"
                          : ""
                    }`}
                  >
                    {/* Icon / status */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                        >
                          <CheckCircle2
                            size={18}
                            className="text-emerald-500"
                          />
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Icon size={18} className="text-emerald-400" />
                        </motion.div>
                      ) : (
                        <Icon
                          size={18}
                          className="text-slate-400 dark:text-white/25"
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isActive
                            ? "text-emerald-700 dark:text-emerald-400"
                            : isCompleted
                              ? "text-slate-600 dark:text-white/60"
                              : "text-slate-400 dark:text-white/25"
                        }`}
                      >
                        {phase.title}
                      </p>
                      <AnimatePresence>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-slate-500 dark:text-white/40 mt-0.5"
                          >
                            {phase.subtitle}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Phase progress indicator */}
                    {isActive && (
                      <motion.div
                        className="mt-1.5 shrink-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="w-8 h-1.5 rounded-full bg-emerald-500/20 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${phaseProgress * 100}%` }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Overall progress bar */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 dark:text-white/30">
                  Overall Progress
                </span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {Math.round(overallProgress * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  style={{ width: `${overallProgress * 100}%` }}
                  transition={{ duration: 0.3 }}
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
