"use client";

import { CheckCircle2, Loader2, Circle } from "lucide-react";
import type { SectionDefinition } from "@/lib/generate/types";

interface GenerationProgressProps {
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  isGenerating: boolean;
}

export function GenerationProgress({
  sections,
  completedSections,
  currentSection,
  isGenerating,
}: GenerationProgressProps) {
  const progress =
    sections.length > 0
      ? Math.round((completedSections / sections.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Generating document...</span>
          <span className="text-purple-400 font-medium">
            {completedSections}/{sections.length} sections
          </span>
        </div>
        <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1">
        {sections.map((section, idx) => {
          const isComplete = idx < completedSections;
          const isCurrent = idx === currentSection && isGenerating;
          const isPending = idx > completedSections;

          return (
            <div
              key={section.number}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isCurrent
                  ? "bg-purple-500/10 text-purple-300"
                  : isComplete
                    ? "text-slate-400"
                    : "text-slate-600"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              ) : isCurrent ? (
                <Loader2
                  size={14}
                  className="text-purple-400 animate-spin shrink-0"
                />
              ) : (
                <Circle size={14} className="text-slate-700 shrink-0" />
              )}
              <span className={isPending ? "opacity-50" : ""}>
                {section.number}. {section.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
