"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Database,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";
import type { StreamProgress } from "./DocumentStudio";

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
              {/* Phase 1: Collecting Data */}
              <PhaseRow
                icon={Database}
                title="Collecting Assessment Data"
                subtitle="Scanning compliance modules for relevant data points..."
                isActive={streamProgress?.phase === "preparing"}
                isCompleted={
                  streamProgress?.phase === "streaming" ||
                  streamProgress?.phase === "finalizing"
                }
              />

              {/* Phase 2: Streaming sections */}
              {streamProgress &&
                streamProgress.phase !== "preparing" &&
                streamProgress.sections.map((section, index) => (
                  <PhaseRow
                    key={index}
                    icon={FileText}
                    title={section.title}
                    isActive={
                      !section.completed && streamProgress.phase === "streaming"
                    }
                    isCompleted={section.completed}
                  />
                ))}

              {/* Placeholder when still preparing */}
              {streamProgress?.phase === "preparing" && (
                <PhaseRow
                  icon={FileText}
                  title="Generating document sections..."
                  isPending
                />
              )}

              {/* Phase 3: Finalizing */}
              {streamProgress?.phase === "finalizing" && (
                <PhaseRow
                  icon={Sparkles}
                  title="Finalizing Document"
                  subtitle="Saving and preparing for review..."
                  isActive
                />
              )}
            </div>

            {/* Overall progress bar */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 dark:text-white/30">
                  Overall Progress
                </span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
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

// ─── Phase Row ───

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
      initial={{ opacity: 0, x: -8 }}
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
            <CheckCircle2 size={18} className="text-emerald-500" />
          </motion.div>
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={18} className="text-emerald-400" />
          </motion.div>
        ) : (
          <Icon size={18} className="text-slate-400 dark:text-white/25" />
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
          {title}
        </p>
        <AnimatePresence>
          {isActive && subtitle && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-slate-500 dark:text-white/40 mt-0.5"
            >
              {subtitle}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
