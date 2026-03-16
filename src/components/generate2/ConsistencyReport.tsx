"use client";

import { Shield, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ConsistencyFindingCard } from "./ConsistencyFindingCard";
import { innerGlass } from "./styles";

interface ConsistencyFinding {
  id: string;
  category: string;
  severity: "error" | "warning" | "info";
  documentType: string;
  sectionIndex: number | null;
  title: string;
  description: string;
  autoFixable: boolean;
  autoFixDescription: string | null;
}

interface ConsistencyReportProps {
  findings: ConsistencyFinding[];
  isLoading?: boolean;
  onAutoFix?: (findingId: string) => void;
  onGoToSection?: (sectionIndex: number) => void;
  onRunCheck?: () => void;
}

export function ConsistencyReport({
  findings,
  isLoading,
  onAutoFix,
  onGoToSection,
  onRunCheck,
}: ConsistencyReportProps) {
  const [expanded, setExpanded] = useState(false);

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-3 mb-4 border border-black/[0.06]"
        style={innerGlass}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">
            Running consistency check...
          </span>
        </div>
      </div>
    );
  }

  if (findings.length === 0 && !onRunCheck) return null;

  if (findings.length === 0 && onRunCheck) {
    return (
      <div
        className="rounded-xl p-3 mb-4 border border-black/[0.06]"
        style={innerGlass}
      >
        <button
          onClick={onRunCheck}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <Shield size={14} />
          Run Consistency Check
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl mb-4 border border-black/[0.06] overflow-hidden"
      style={innerGlass}
    >
      {/* Summary header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/30 transition-colors text-left"
      >
        <Shield size={14} className="text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-slate-700 flex-1">
          Consistency Check — {findings.length} finding
          {findings.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">
              {errorCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {warningCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
              {infoCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Findings list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-black/[0.04]">
          {findings
            .sort((a, b) => {
              const order = { error: 0, warning: 1, info: 2 };
              return order[a.severity] - order[b.severity];
            })
            .map((finding) => (
              <ConsistencyFindingCard
                key={finding.id}
                finding={finding}
                onAutoFix={onAutoFix}
                onGoToSection={onGoToSection}
              />
            ))}
        </div>
      )}
    </div>
  );
}
