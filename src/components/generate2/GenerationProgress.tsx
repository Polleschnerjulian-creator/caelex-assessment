"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Database,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SectionDefinition } from "@/lib/generate/types";

type GenerationPhase = "init" | "sections" | "finalizing";

interface GenerationProgressProps {
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  isGenerating: boolean;
  phase: GenerationPhase;
}

export function GenerationProgress({
  sections,
  completedSections,
  currentSection,
  isGenerating,
  phase,
}: GenerationProgressProps) {
  const getProgress = (): number => {
    if (phase === "init") return 5;
    if (phase === "finalizing") return 95;
    if (sections.length === 0) return 10;

    const progressBase = 10;
    const progressRange = 85;
    const sectionProgress = Math.min(completedSections / sections.length, 1);
    return Math.round(progressBase + progressRange * sectionProgress);
  };

  const progress = getProgress();

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-lg">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6"
        >
          {/* ASTRA avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap size={24} className="text-emerald-400" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-white">
              ASTRA is generating your document
            </h3>
            <p className="text-sm text-white/45 mt-1">
              {phase === "init"
                ? "Preparing assessment data..."
                : phase === "finalizing"
                  ? "Finalizing and saving document..."
                  : `Section ${completedSections + 1} of ${sections.length}`}
            </p>
          </div>

          {/* Phase list */}
          <div className="w-full space-y-1">
            {/* Phase 1: Collecting Data */}
            <PhaseRow
              icon={Database}
              title="Collecting Assessment Data"
              subtitle="Scanning compliance modules for relevant data points..."
              isActive={phase === "init"}
              isCompleted={phase === "sections" || phase === "finalizing"}
            />

            {/* Phase 2: Section rows */}
            {phase !== "init" &&
              sections.map((section, idx) => {
                const isComplete = idx < completedSections;
                const isCurrent =
                  idx === currentSection &&
                  isGenerating &&
                  phase === "sections";

                return (
                  <PhaseRow
                    key={section.number}
                    icon={FileText}
                    title={`${section.number}. ${section.title}`}
                    isActive={isCurrent}
                    isCompleted={isComplete}
                    isPending={!isComplete && !isCurrent}
                  />
                );
              })}

            {/* Placeholder when still initializing */}
            {phase === "init" && (
              <PhaseRow
                icon={FileText}
                title="Generating document sections..."
                isPending
              />
            )}

            {/* Phase 3: Finalizing */}
            {phase === "finalizing" && (
              <PhaseRow
                icon={Sparkles}
                title="Finalizing Document"
                subtitle="Assembling sections, counting markers, saving..."
                isActive
              />
            )}
          </div>

          {/* Overall progress bar */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-caption text-white/30">
                Overall Progress
              </span>
              <span className="text-caption font-medium text-emerald-400">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// --- Phase Row ---

function PhaseRow({
  icon: Icon,
  title,
  subtitle,
  isActive,
  isCompleted,
  isPending,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isPending?: boolean;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
      transition={{ duration: 0.25 }}
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
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <CheckCircle2 size={18} className="text-green-500" />
          </motion.div>
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={18} className="text-emerald-400" />
          </motion.div>
        ) : (
          <Icon size={18} className="text-white/25" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isActive
              ? "text-emerald-400"
              : isCompleted
                ? "text-white/45"
                : "text-white/25"
          }`}
        >
          {title}
        </p>
        <AnimatePresence>
          {isActive && subtitle && (
            <motion.p
              initial={false}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-white/45 mt-0.5"
            >
              {subtitle}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
