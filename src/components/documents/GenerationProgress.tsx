"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Zap } from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";

interface GenerationProgressProps {
  status: "idle" | "generating" | "completed" | "error";
  errorMessage: string | null;
  documentType: DocumentGenerationType | null;
  onRetry: () => void;
}

export function GenerationProgress({
  status,
  errorMessage,
  documentType,
  onRetry,
}: GenerationProgressProps) {
  const meta = documentType ? DOCUMENT_TYPE_META[documentType] : null;

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        {status === "generating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Zap size={28} className="text-emerald-500" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Loader2 size={18} className="animate-spin text-emerald-500" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                Generating Document
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                {meta ? `Creating your ${meta.title}...` : "Processing..."}
              </p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-2">
                This typically takes 30-60 seconds
              </p>
            </div>

            {/* Progress animation */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 45, ease: "easeOut" }}
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
            <div>
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
            <div>
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
