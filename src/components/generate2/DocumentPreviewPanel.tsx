"use client";

import {
  FileText,
  Download,
  AlertTriangle,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { GenerationProgress } from "./GenerationProgress";
import { ReadinessRing } from "./ReadinessRing";
import { ReasoningPreview } from "./ReasoningPreview";
import { ConsistencyReport } from "./ConsistencyReport";
import { innerGlass, innerGlassDarkClass } from "./styles";
import type {
  NCADocumentType,
  DocumentTypeMeta,
  ReadinessResult,
  SectionDefinition,
} from "@/lib/generate/types";
import type { ParsedSection } from "@/lib/generate/parse-sections";
import type {
  ReasoningPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";
import type { NCAProfile } from "@/data/nca-profiles";
import type { ConsistencyFinding } from "@/lib/generate/consistency-check";

type PanelState =
  | "empty"
  | "pre-generation"
  | "planning"
  | "generating"
  | "completed";
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
  reasoningPlan?: ReasoningPlan | null;
  onConfirmPlan?: () => void;
  onBackFromPlan?: () => void;
  onVerdictOverride?: (
    sectionIndex: number,
    verdict: ComplianceVerdict,
  ) => void;
  isConfirming?: boolean;
  selectedNCA?: string | null;
  onNCAChange?: (nca: string | null) => void;
  ncaProfiles?: NCAProfile[];
  consistencyFindings?: ConsistencyFinding[];
  isCheckingConsistency?: boolean;
  onRunConsistencyCheck?: () => void;
  onAutoFix?: (findingId: string) => void;
  onRegenerate?: () => void;
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
  reasoningPlan,
  onConfirmPlan,
  onBackFromPlan,
  onVerdictOverride,
  isConfirming,
  selectedNCA,
  onNCAChange,
  ncaProfiles,
  consistencyFindings,
  isCheckingConsistency,
  onRunConsistencyCheck,
  onAutoFix,
  onRegenerate,
}: DocumentPreviewPanelProps) {
  if (panelState === "empty" || !selectedType || !meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${innerGlassDarkClass}`}
          style={innerGlass}
        >
          <FileText
            size={28}
            className="text-slate-400 dark:text-white/[0.4]"
          />
        </div>
        <h3 className="text-lg font-medium text-slate-600 dark:text-white/[0.7]">
          Select a document type
        </h3>
        <p className="text-sm text-slate-400 dark:text-white/[0.4] mt-2 max-w-md">
          Choose an NCA document from the left panel to preview its readiness
          and generate submission-ready content.
        </p>
      </div>
    );
  }

  if (panelState === "planning" && reasoningPlan && meta) {
    return (
      <ReasoningPreview
        plan={reasoningPlan}
        meta={meta}
        onConfirm={onConfirmPlan || (() => {})}
        onBack={onBackFromPlan || (() => {})}
        onVerdictOverride={onVerdictOverride || (() => {})}
        isConfirming={isConfirming || false}
      />
    );
  }

  if (panelState === "generating") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white/[0.92]">
            {meta.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/[0.45] mt-1">
            {meta.articleRef}
          </p>
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
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white/[0.92]">
              {meta.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/[0.45]">
              {meta.articleRef}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actionRequiredCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <AlertTriangle size={12} />
                {actionRequiredCount} Action Required
              </span>
            )}
            {evidencePlaceholderCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <BookOpen size={12} />
                {evidencePlaceholderCount} Evidence
              </span>
            )}
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-sm text-slate-600 dark:text-white/[0.55] hover:bg-white/40 dark:hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              aria-label="Regenerate document"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Regenerate
            </button>
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              aria-label="Export document as PDF"
            >
              <Download size={14} aria-hidden="true" />
              PDF
            </button>
          </div>
        </div>

        {/* Consistency Check */}
        <div className="px-6 pt-2">
          <ConsistencyReport
            findings={consistencyFindings || []}
            isLoading={isCheckingConsistency}
            onAutoFix={onAutoFix}
            onRunCheck={onRunConsistencyCheck}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {documentContent.map((section, idx) => (
            <div key={idx} className="mb-8">
              <h4 className="text-base font-semibold text-slate-800 dark:text-white/[0.92] mb-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.content.map((block, blockIdx) => {
                  if (block.type === "text") {
                    const text = block.value;
                    if (text.includes("[ACTION REQUIRED")) {
                      return (
                        <p
                          key={blockIdx}
                          className="text-sm text-amber-700 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20"
                        >
                          {text}
                        </p>
                      );
                    }
                    if (text.includes("[EVIDENCE:")) {
                      return (
                        <p
                          key={blockIdx}
                          className="text-sm text-emerald-700 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
                        >
                          {text}
                        </p>
                      );
                    }
                    return (
                      <p
                        key={blockIdx}
                        className="text-sm text-slate-600 dark:text-white/[0.55] leading-relaxed"
                      >
                        {text}
                      </p>
                    );
                  }
                  if (block.type === "heading") {
                    return (
                      <h5
                        key={blockIdx}
                        className={`font-semibold text-slate-700 dark:text-white/[0.8] ${
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
                        className={`text-sm text-slate-600 dark:text-white/[0.55] space-y-1 pl-4 ${
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
                        className={`overflow-x-auto rounded-xl my-2 ${innerGlassDarkClass}`}
                        style={innerGlass}
                      >
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-white/30 dark:bg-white/[0.04]">
                              {block.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="px-3 py-2 text-left text-slate-500 dark:text-white/[0.45] font-medium border-b border-black/[0.06] dark:border-white/[0.06]"
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
                                className="border-b border-black/[0.04] dark:border-white/[0.04]"
                              >
                                {row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className="px-3 py-2 text-slate-600 dark:text-white/[0.55]"
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
                            <span className="text-slate-500 dark:text-white/[0.45] font-medium">
                              {kv.key}:
                            </span>{" "}
                            <span className="text-slate-700 dark:text-white/[0.7]">
                              {kv.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (block.type === "alert") {
                    const alertColors = {
                      info: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
                      warning:
                        "bg-amber-500/10 text-amber-700 border-amber-500/20",
                      error: "bg-red-500/10 text-red-700 border-red-500/20",
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
                        className="border-black/[0.06] dark:border-white/[0.06] my-3"
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white/[0.92]">
          {meta.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-white/[0.45] mt-1">
          {meta.description}
        </p>
        <p className="text-xs text-slate-400 dark:text-white/[0.35] mt-1">
          {meta.articleRef} | {meta.estimatedSections} sections
        </p>
      </div>

      {/* Readiness card */}
      {readiness && (
        <div
          className={`rounded-xl p-4 mb-6 ${innerGlassDarkClass}`}
          style={innerGlass}
        >
          <div className="flex items-center gap-4">
            <ReadinessRing score={readiness.score} size={56} strokeWidth={4} />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-white/[0.7]">
                Data Readiness:{" "}
                <span
                  className={
                    readiness.level === "ready"
                      ? "text-green-600"
                      : readiness.level === "partial"
                        ? "text-amber-600"
                        : "text-red-600"
                  }
                >
                  {readiness.score}%
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-white/[0.45] mt-0.5">
                {readiness.presentFields}/{readiness.totalFields} required
                fields present
              </p>
              {readiness.missingCritical.length > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Missing critical: {readiness.missingCritical.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NCA Targeting */}
      {ncaProfiles && ncaProfiles.length > 0 && onNCAChange && (
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-600 dark:text-white/[0.55] block mb-2">
            Target NCA
          </label>
          <select
            value={selectedNCA || ""}
            onChange={(e) => onNCAChange(e.target.value || null)}
            className="w-full text-sm bg-white/50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-700 dark:text-white/[0.7] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">No specific NCA (generic output)</option>
            {ncaProfiles.map((nca) => (
              <option key={nca.id} value={nca.id}>
                {nca.name}
              </option>
            ))}
          </select>
          {selectedNCA && ncaProfiles && (
            <p className="text-xs text-slate-400 dark:text-white/[0.35] mt-1.5">
              {(() => {
                const nca = ncaProfiles.find((n) => n.id === selectedNCA);
                if (!nca) return null;
                const maxRigor = Math.max(...Object.values(nca.rigor));
                return `${nca.name}: Focus on ${nca.focusAreas[0]?.description || "general compliance"}. Max rigor: ${maxRigor}/5.`;
              })()}
            </p>
          )}
        </div>
      )}

      {/* Section outline */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-600 dark:text-white/[0.55] mb-3">
          Document Outline
        </h4>
        <div
          className={`rounded-xl overflow-hidden ${innerGlassDarkClass}`}
          style={innerGlass}
        >
          {sections.map((section, idx) => (
            <div
              key={section.number}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/40 dark:hover:bg-white/[0.04] ${
                idx !== sections.length - 1
                  ? "border-b border-black/[0.04] dark:border-white/[0.04]"
                  : ""
              }`}
            >
              <span className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-xs font-semibold text-slate-400 dark:text-white/[0.4] shrink-0">
                {section.number}
              </span>
              <span className="text-sm text-slate-600 dark:text-white/[0.55]">
                {section.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
          role="alert"
        >
          <p className="text-sm font-medium text-red-600">Generation failed</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 dark:bg-white/[0.1] hover:bg-slate-700 dark:hover:bg-white/[0.15] text-white font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        aria-label={
          canResume
            ? `Resume generating ${meta.shortTitle}`
            : `Generate ${meta.shortTitle}`
        }
      >
        <FileText size={16} aria-hidden="true" />
        {canResume
          ? `Resume ${meta.shortTitle}`
          : `Generate ${meta.shortTitle}`}
      </button>
      <p className="text-xs text-slate-400 dark:text-white/[0.35] text-center mt-2">
        Estimated time: ~{Math.ceil(sections.length * 0.3)} min
      </p>
    </div>
  );
}
