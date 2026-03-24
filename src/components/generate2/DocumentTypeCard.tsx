"use client";

import { ReadinessRing } from "./ReadinessRing";
import type { DocumentTypeMeta, ReadinessResult } from "@/lib/generate/types";

interface DocumentTypeCardProps {
  meta: DocumentTypeMeta;
  readiness?: ReadinessResult;
  isSelected: boolean;
  hasDocument: boolean;
  onClick: () => void;
}

const priorityStyles = {
  P0: "bg-red-500/10 text-red-500 border-red-500/20",
  P1: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  P2: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function DocumentTypeCard({
  meta,
  readiness,
  isSelected,
  hasDocument,
  onClick,
}: DocumentTypeCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`${meta.code} ${meta.shortTitle}${hasDocument ? " — completed" : ""}`}
      aria-pressed={isSelected}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
        isSelected
          ? "bg-white/60 dark:bg-white/[0.08] border-emerald-400/40 shadow-sm dark:shadow-none"
          : "bg-white/0 border-transparent hover:bg-white/40 dark:hover:bg-white/[0.04] hover:border-white/40 dark:hover:border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Readiness ring */}
        <ReadinessRing
          score={readiness?.score ?? 0}
          size={32}
          strokeWidth={2.5}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-slate-500 dark:text-white/[0.45]">
              {meta.code}
            </span>
            <span
              className={`text-micro px-1.5 py-0.5 rounded border font-medium ${priorityStyles[meta.priority]}`}
            >
              {meta.priority}
            </span>
            {hasDocument && (
              <span className="text-micro px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">
                Done
              </span>
            )}
          </div>
          <p
            className={`text-sm truncate mt-0.5 ${
              isSelected
                ? "text-slate-900 dark:text-white/[0.92] font-medium"
                : "text-slate-700 dark:text-white/[0.7]"
            }`}
          >
            {meta.shortTitle}
          </p>
        </div>
      </div>
    </button>
  );
}
