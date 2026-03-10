"use client";

import { BookOpen, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { DocumentTypeMeta, ReadinessResult } from "@/lib/generate/types";

interface ContextPanelProps {
  meta: DocumentTypeMeta | null;
  readiness: ReadinessResult | null;
}

const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

export function ContextPanel({ meta, readiness }: ContextPanelProps) {
  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={innerGlass}
        >
          <BookOpen size={20} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400">
          Select a document to view context
        </p>
      </div>
    );
  }

  const moduleLink =
    meta.category === "debris"
      ? "/dashboard/modules/debris"
      : "/dashboard/modules/cybersecurity";

  const questionnaireLink =
    meta.category === "debris"
      ? "/dashboard/modules/debris"
      : "/dashboard/modules/cybersecurity";

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-800">Context</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Article References */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            EU Space Act References
          </h3>
          <div className="p-3" style={innerGlass}>
            <p className="text-sm text-slate-700">{meta.articleRef}</p>
            <p className="text-xs text-slate-400 mt-1">
              {meta.category === "debris"
                ? "Debris Mitigation — Art. 58-73"
                : "Cybersecurity — Art. 74-95"}
            </p>
          </div>
        </div>

        {/* Gap Analysis */}
        {readiness && readiness.missingCritical.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Gap Analysis
            </h3>
            <div className="bg-amber-500/8 border border-amber-400/20 rounded-[14px] p-3">
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={14}
                  className="text-amber-500 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-xs text-amber-600 font-medium">
                    Missing Critical Data
                  </p>
                  <ul className="text-xs text-amber-600/80 mt-1 space-y-0.5">
                    {readiness.missingCritical.map((field) => (
                      <li key={field}>- {field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Quick Links
          </h3>
          <div className="p-3 space-y-2" style={innerGlass}>
            <Link
              href={moduleLink}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <ExternalLink size={12} />
              {meta.category === "debris"
                ? "Debris Module"
                : "Cybersecurity Module"}
            </Link>
            <Link
              href={questionnaireLink}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <ExternalLink size={12} />
              Assessment Questionnaire
            </Link>
            <Link
              href="/dashboard/tracker"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <ExternalLink size={12} />
              Compliance Tracker
            </Link>
          </div>
        </div>

        {/* Document Description */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            About This Document
          </h3>
          <div className="p-3" style={innerGlass}>
            <p className="text-xs text-slate-500 leading-relaxed">
              {meta.description}
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              <span>Priority: {meta.priority}</span>
              <span>{meta.estimatedSections} sections</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
