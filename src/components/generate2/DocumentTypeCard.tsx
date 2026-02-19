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
  P0: "bg-red-500/10 text-red-400 border-red-500/20",
  P1: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  P2: "bg-slate-500/10 text-slate-400 border-slate-500/20",
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
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 group ${
        isSelected
          ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20"
          : "bg-dark-card/50 border-dark-border/50 hover:bg-dark-card hover:border-dark-border"
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
            <span className="text-[11px] text-slate-500">{meta.code}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityStyles[meta.priority]}`}
            >
              {meta.priority}
            </span>
            {hasDocument && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                Done
              </span>
            )}
          </div>
          <p
            className={`text-sm truncate mt-0.5 ${
              isSelected ? "text-white font-medium" : "text-slate-300"
            }`}
          >
            {meta.shortTitle}
          </p>
        </div>
      </div>
    </button>
  );
}
