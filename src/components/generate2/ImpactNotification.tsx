"use client";

import { Zap, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { innerGlass } from "./styles";

interface AffectedSection {
  sectionIndex: number;
  sectionTitle: string;
  impactLevel: "invalidates" | "requires_review" | "minor_update";
  reason: string;
}

interface AffectedDocument {
  documentType: string;
  documentTitle: string;
  hasExistingDocument: boolean;
  sections: AffectedSection[];
}

interface ImpactResult {
  changedField: string;
  oldValue: unknown;
  newValue: unknown;
  affectedDocuments: AffectedDocument[];
  totalSectionsAffected: number;
  estimatedRegenerationTime: string;
}

interface ImpactNotificationProps {
  impacts: ImpactResult[];
  onDismiss: () => void;
  onRegenerateAffected?: () => void;
}

const IMPACT_COLORS = {
  invalidates: "text-red-600",
  requires_review: "text-amber-600",
  minor_update: "text-slate-500",
};

export function ImpactNotification({
  impacts,
  onDismiss,
  onRegenerateAffected,
}: ImpactNotificationProps) {
  const [expanded, setExpanded] = useState(false);

  if (impacts.length === 0) return null;

  const totalSections = impacts.reduce(
    (sum, i) => sum + i.totalSectionsAffected,
    0,
  );
  const totalDocs = new Set(
    impacts.flatMap((i) => i.affectedDocuments.map((d) => d.documentType)),
  ).size;
  const invalidatedCount = impacts.reduce(
    (sum, i) =>
      sum +
      i.affectedDocuments.reduce(
        (s, d) =>
          s +
          d.sections.filter((sec) => sec.impactLevel === "invalidates").length,
        0,
      ),
    0,
  );

  return (
    <div
      className="rounded-xl mb-4 border border-amber-500/20 overflow-hidden"
      style={innerGlass}
    >
      {/* Summary header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Zap size={16} className="text-amber-500 shrink-0" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left"
        >
          <p className="text-xs font-medium text-amber-700">
            {impacts.length} data change{impacts.length !== 1 ? "s" : ""} affect{" "}
            {totalSections} sections in {totalDocs} documents
          </p>
          {invalidatedCount > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">
              {invalidatedCount} sections need regeneration
            </p>
          )}
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRegenerateAffected && invalidatedCount > 0 && (
            <button
              onClick={onRegenerateAffected}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-white/30 transition-colors"
            title="Dismiss"
          >
            <X size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Detail list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-black/[0.06]">
          {impacts.map((impact, idx) => (
            <div key={idx} className="pt-2">
              <p className="text-xs font-medium text-slate-600">
                <span className="text-slate-400">{impact.changedField}:</span>{" "}
                {String(impact.oldValue)} → {String(impact.newValue)}
              </p>
              <div className="mt-1 space-y-0.5">
                {impact.affectedDocuments.map((doc, dIdx) => (
                  <div key={dIdx} className="text-xs pl-3">
                    <span className="text-slate-500 font-medium">
                      {doc.documentType}
                    </span>
                    {doc.hasExistingDocument && (
                      <span className="text-amber-500 ml-1">(generated)</span>
                    )}
                    <span className="text-slate-400 ml-1">
                      — {doc.sections.length} section
                      {doc.sections.length !== 1 ? "s" : ""}
                    </span>
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      {doc.sections.map((sec, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-1.5">
                          <span
                            className={`text-xs ${IMPACT_COLORS[sec.impactLevel]}`}
                          >
                            {sec.impactLevel === "invalidates"
                              ? "🔴"
                              : sec.impactLevel === "requires_review"
                                ? "🟡"
                                : "🔵"}
                          </span>
                          <span className="text-xs text-slate-500">
                            S{sec.sectionIndex + 1}: {sec.sectionTitle}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
