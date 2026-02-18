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
import type { ReportSection } from "@/lib/pdf/types";

type PanelState = "empty" | "pre-generation" | "generating" | "completed";

interface DocumentPreviewPanelProps {
  selectedType: NCADocumentType | null;
  meta: DocumentTypeMeta | null;
  readiness: ReadinessResult | null;
  panelState: PanelState;
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  isGenerating: boolean;
  documentContent: ReportSection[] | null;
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
  documentId: string | null;
  error: string | null;
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
  documentContent,
  actionRequiredCount,
  evidencePlaceholderCount,
  documentId,
  error,
  onGenerate,
  onExportPdf,
}: DocumentPreviewPanelProps) {
  if (panelState === "empty" || !selectedType || !meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <FileText size={48} className="text-slate-700 mb-4" />
        <h3 className="text-lg font-medium text-slate-400">
          Select a document type
        </h3>
        <p className="text-sm text-slate-600 mt-2 max-w-md">
          Choose an NCA document from the left panel to preview its readiness
          and generate submission-ready content.
        </p>
      </div>
    );
  }

  if (panelState === "generating") {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">{meta.title}</h3>
          <p className="text-sm text-slate-400 mt-1">{meta.articleRef}</p>
        </div>
        <GenerationProgress
          sections={sections}
          completedSections={completedSections}
          currentSection={currentSection}
          isGenerating={isGenerating}
        />
      </div>
    );
  }

  if (panelState === "completed" && documentContent) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-navy-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{meta.title}</h3>
            <p className="text-sm text-slate-400">{meta.articleRef}</p>
          </div>
          <div className="flex items-center gap-2">
            {actionRequiredCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={12} />
                {actionRequiredCount} Action Required
              </span>
            )}
            {evidencePlaceholderCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BookOpen size={12} />
                {evidencePlaceholderCount} Evidence
              </span>
            )}
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
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
              <h4 className="text-base font-semibold text-white mb-3 pb-2 border-b border-navy-700">
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
                          className="text-sm text-amber-300 bg-amber-500/10 px-3 py-2 rounded border border-amber-500/20"
                        >
                          {text}
                        </p>
                      );
                    }
                    if (text.includes("[EVIDENCE:")) {
                      return (
                        <p
                          key={blockIdx}
                          className="text-sm text-blue-300 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20"
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
                        className="overflow-x-auto rounded-lg border border-navy-700 my-2"
                      >
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-navy-800">
                              {block.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="px-3 py-2 text-left text-slate-400 font-medium border-b border-navy-700"
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
                                className="border-b border-navy-700/50"
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
                      info: "bg-blue-500/10 text-blue-300 border-blue-500/20",
                      warning:
                        "bg-amber-500/10 text-amber-300 border-amber-500/20",
                      error: "bg-red-500/10 text-red-300 border-red-500/20",
                    };
                    return (
                      <div
                        key={blockIdx}
                        className={`text-sm px-3 py-2 rounded border ${alertColors[block.severity]}`}
                      >
                        {block.message}
                      </div>
                    );
                  }
                  if (block.type === "divider") {
                    return (
                      <hr key={blockIdx} className="border-navy-700 my-3" />
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
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">{meta.title}</h3>
        <p className="text-sm text-slate-400 mt-1">{meta.description}</p>
        <p className="text-xs text-slate-500 mt-1">
          {meta.articleRef} | {meta.estimatedSections} sections
        </p>
      </div>

      {/* Readiness card */}
      {readiness && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <ReadinessRing score={readiness.score} size={56} strokeWidth={4} />
            <div>
              <p className="text-sm font-medium text-white">
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
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-2">
          Document Outline
        </h4>
        <div className="space-y-1">
          {sections.map((section) => (
            <div
              key={section.number}
              className="flex items-center gap-2 text-sm text-slate-500 px-3 py-1"
            >
              <span className="text-xs font-mono text-slate-600 w-4">
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
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
      >
        <FileText size={16} />
        Generate {meta.shortTitle}
      </button>
      <p className="text-xs text-slate-600 text-center mt-2">
        Estimated time: ~{Math.ceil(sections.length * 0.3)} min
      </p>
    </div>
  );
}
