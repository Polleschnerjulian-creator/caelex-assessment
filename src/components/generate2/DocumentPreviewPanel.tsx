"use client";

import { FileText, Download, AlertTriangle, BookOpen } from "lucide-react";
import { GenerationProgress } from "./GenerationProgress";
import { ReadinessRing } from "./ReadinessRing";
import type {
  NCADocumentType,
  DocumentTypeMeta,
  ReadinessResult,
  SectionDefinition,
} from "@/lib/generate/types";
import type { ParsedSection } from "@/lib/generate/parse-sections";

type PanelState = "empty" | "pre-generation" | "generating" | "completed";
type GenerationPhase = "init" | "sections" | "finalizing";

interface DocumentPreviewPanelProps {
  selectedType: NCADocumentType | null;
  meta: DocumentTypeMeta | null;
  readiness: ReadinessResult | null;
  panelState: PanelState;
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  isGenerating: boolean;
  generationPhase: GenerationPhase;
  documentContent: ParsedSection[] | null;
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
  documentId: string | null;
  error: string | null;
  canResume?: boolean;
  onGenerate: () => void;
  onExportPdf: () => void;
}

export function DocumentPreviewPanel({
  selectedType,
  meta,
  readiness,
  panelState,
  sections,
  completedSections,
  currentSection,
  isGenerating,
  generationPhase,
  documentContent,
  actionRequiredCount,
  evidencePlaceholderCount,
  documentId,
  error,
  canResume,
  onGenerate,
  onExportPdf,
}: DocumentPreviewPanelProps) {
  if (panelState === "empty" || !selectedType || !meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-2xl glass-elevated flex items-center justify-center mb-5">
          <FileText size={28} className="text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-300">
          Select a document type
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Choose an NCA document from the left panel to preview its readiness
          and generate submission-ready content.
        </p>
      </div>
    );
  }

  if (panelState === "generating") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-sm text-slate-400 mt-1">{meta.articleRef}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <GenerationProgress
            sections={sections}
            completedSections={completedSections}
            currentSection={currentSection}
            isGenerating={isGenerating}
            phase={generationPhase}
          />
        </div>
      </div>
    );
  }

  if (panelState === "completed" && documentContent) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--glass-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              {meta.title}
            </h3>
            <p className="text-sm text-slate-400">{meta.articleRef}</p>
          </div>
          <div className="flex items-center gap-2">
            {actionRequiredCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={12} />
                {actionRequiredCount} Action Required
              </span>
            )}
            {evidencePlaceholderCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BookOpen size={12} />
                {evidencePlaceholderCount} Evidence
              </span>
            )}
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Download size={14} />
              PDF
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {documentContent.map((section, idx) => (
            <div key={idx} className="mb-8">
              <h4 className="text-base font-semibold text-slate-100 mb-3 pb-2 border-b border-[var(--glass-border-subtle)]">
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.content.map((block, blockIdx) => {
                  if (block.type === "text") {
                    // Highlight [ACTION REQUIRED] and [EVIDENCE:] markers
                    const text = block.value;
                    if (text.includes("[ACTION REQUIRED")) {
                      return (
                        <p
                          key={blockIdx}
                          className="text-sm text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20"
                        >
                          {text}
                        </p>
                      );
                    }
                    if (text.includes("[EVIDENCE:")) {
                      return (
                        <p
                          key={blockIdx}
                          className="text-sm text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
                        >
                          {text}
                        </p>
                      );
                    }
                    return (
                      <p
                        key={blockIdx}
                        className="text-sm text-slate-300 leading-relaxed"
                      >
                        {text}
                      </p>
                    );
                  }
                  if (block.type === "heading") {
                    return (
                      <h5
                        key={blockIdx}
                        className={`font-semibold text-slate-200 ${
                          block.level === 2 ? "text-sm mt-4" : "text-xs mt-3"
                        }`}
                      >
                        {block.value}
                      </h5>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul
                        key={blockIdx}
                        className={`text-sm text-slate-300 space-y-1 pl-4 ${
                          block.ordered ? "list-decimal" : "list-disc"
                        }`}
                      >
                        {block.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === "table") {
                    return (
                      <div
                        key={blockIdx}
                        className="overflow-x-auto rounded-lg border border-[var(--glass-border-subtle)] my-2 glass-surface"
                      >
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="glass-elevated">
                              {block.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="px-3 py-2 text-left text-slate-400 font-medium border-b border-[var(--glass-border-subtle)]"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rowIdx) => (
                              <tr
                                key={rowIdx}
                                className="border-b border-[var(--glass-border-subtle)]"
                              >
                                {row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className="px-3 py-2 text-slate-300"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (block.type === "keyValue") {
                    return (
                      <div key={blockIdx} className="space-y-1">
                        {block.items.map((kv, i) => (
                          <div key={i} className="text-sm">
                            <span className="text-slate-400 font-medium">
                              {kv.key}:
                            </span>{" "}
                            <span className="text-slate-300">{kv.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (block.type === "alert") {
                    const alertColors = {
                      info: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                      warning:
                        "bg-amber-500/10 text-amber-300 border-amber-500/20",
                      error: "bg-red-500/10 text-red-300 border-red-500/20",
                    };
                    return (
                      <div
                        key={blockIdx}
                        className={`text-sm px-3 py-2 rounded-lg border ${alertColors[block.severity]}`}
                      >
                        {block.message}
                      </div>
                    );
                  }
                  if (block.type === "divider") {
                    return (
                      <hr
                        key={blockIdx}
                        className="border-[var(--glass-border-subtle)] my-3"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Pre-generation state
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100">{meta.title}</h3>
        <p className="text-sm text-slate-400 mt-1">{meta.description}</p>
        <p className="text-xs text-slate-500 mt-1">
          {meta.articleRef} | {meta.estimatedSections} sections
        </p>
      </div>

      {/* Readiness card */}
      {readiness && (
        <div className="glass-elevated border border-[var(--glass-border-medium)] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <ReadinessRing score={readiness.score} size={56} strokeWidth={4} />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Data Readiness:{" "}
                <span
                  className={
                    readiness.level === "ready"
                      ? "text-green-400"
                      : readiness.level === "partial"
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {readiness.score}%
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {readiness.presentFields}/{readiness.totalFields} required
                fields present
              </p>
              {readiness.missingCritical.length > 0 && (
                <p className="text-xs text-red-400 mt-1">
                  Missing critical: {readiness.missingCritical.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section outline */}
      <div className="mb-6 glass-surface border border-[var(--glass-border-subtle)] rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">
          Document Outline
        </h4>
        <div className="space-y-0.5">
          {sections.map((section) => (
            <div
              key={section.number}
              className="flex items-center gap-2 text-sm text-slate-400 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs font-mono text-slate-600 w-5">
                {section.number}
              </span>
              {section.title}
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm font-medium text-red-400">Generation failed</p>
          <p className="text-xs text-red-400/80 mt-1">{error}</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        <FileText size={16} />
        {canResume
          ? `Resume ${meta.shortTitle}`
          : `Generate ${meta.shortTitle}`}
      </button>
      <p className="text-xs text-slate-600 text-center mt-2">
        Estimated time: ~{Math.ceil(sections.length * 0.3)} min
      </p>
    </div>
  );
}
