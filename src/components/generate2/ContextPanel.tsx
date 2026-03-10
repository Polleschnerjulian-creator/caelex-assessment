"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  Zap,
  Target,
  Clock,
  FileText,
  XCircle,
  Sparkles,
} from "lucide-react";
import type {
  NCADocumentType,
  DocumentTypeMeta,
  ReadinessResult,
  SectionDefinition,
} from "@/lib/generate/types";
import { NCA_DOCUMENT_TYPES } from "@/lib/generate/types";
import {
  getFieldStatuses,
  predictGaps,
  getRelatedDocuments,
  getRecommendedNext,
  estimateActionMarkers,
} from "@/lib/generate/context-panel-utils";

type PanelState = "empty" | "pre-generation" | "generating" | "completed";
type GenerationPhase = "init" | "sections" | "finalizing";

interface ContextPanelProps {
  meta: DocumentTypeMeta | null;
  readiness: ReadinessResult | null;
  allReadiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
  panelState: PanelState;
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  generationPhase: GenerationPhase;
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
  onSelectDocument: (type: NCADocumentType) => void;
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

export function ContextPanel({
  meta,
  readiness,
  allReadiness,
  completedDocs,
  panelState,
  sections,
  completedSections,
  currentSection,
  generationPhase,
  actionRequiredCount,
  evidencePlaceholderCount,
  onSelectDocument,
}: ContextPanelProps) {
  // ─── Empty State ───
  if (panelState === "empty" || !meta) {
    return (
      <EmptyView
        allReadiness={allReadiness}
        completedDocs={completedDocs}
        onSelect={onSelectDocument}
      />
    );
  }

  // ─── Generating State ───
  if (panelState === "generating") {
    return (
      <GeneratingView
        meta={meta}
        sections={sections}
        completedSections={completedSections}
        currentSection={currentSection}
        generationPhase={generationPhase}
        allReadiness={allReadiness}
        completedDocs={completedDocs}
      />
    );
  }

  // ─── Completed State ───
  if (panelState === "completed") {
    return (
      <CompletedView
        meta={meta}
        readiness={readiness}
        allReadiness={allReadiness}
        completedDocs={completedDocs}
        sections={sections}
        actionRequiredCount={actionRequiredCount}
        evidencePlaceholderCount={evidencePlaceholderCount}
        onSelect={onSelectDocument}
      />
    );
  }

  // ─── Pre-Generation State ───
  return (
    <PreGenerationView
      meta={meta}
      readiness={readiness}
      allReadiness={allReadiness}
      completedDocs={completedDocs}
      onSelect={onSelectDocument}
    />
  );
}

// ═══════════════════════════════════════════════
// Empty State — Package overview + recommendation
// ═══════════════════════════════════════════════

function EmptyView({
  allReadiness,
  completedDocs,
  onSelect,
}: {
  allReadiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
  onSelect: (type: NCADocumentType) => void;
}) {
  const totalDocs = NCA_DOCUMENT_TYPES.length;
  const completedCount = completedDocs.size;
  const progressPct =
    totalDocs > 0 ? Math.round((completedCount / totalDocs) * 100) : 0;

  const avgReadiness =
    allReadiness.length > 0
      ? Math.round(
          allReadiness.reduce((sum, r) => sum + r.score, 0) /
            allReadiness.length,
        )
      : 0;

  const recommended = getRecommendedNext(allReadiness, completedDocs);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Intelligence"
        icon={<Zap size={16} className="text-emerald-500" />}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Package Progress */}
        <Section title="Package Progress">
          <div className="p-3" style={innerGlass}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                {completedCount}/{totalDocs} Documents
              </span>
              <span className="text-xs font-medium text-emerald-600">
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              <span>Avg. Readiness: {avgReadiness}%</span>
            </div>
          </div>
        </Section>

        {/* Recommended Next */}
        {recommended && (
          <Section title="Recommended Next">
            <button
              onClick={() => onSelect(recommended.type)}
              className="w-full text-left p-3 rounded-[14px] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={innerGlass}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ArrowRight size={12} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {recommended.code} — {recommended.shortTitle}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {recommended.score}% ready — highest readiness
                  </p>
                </div>
              </div>
            </button>
          </Section>
        )}

        {/* Quick Stats */}
        <Section title="Readiness Overview">
          <div className="grid grid-cols-3 gap-1.5">
            {(["ready", "partial", "insufficient"] as const).map((level) => {
              const count = allReadiness.filter(
                (r) => r.level === level,
              ).length;
              const colors = {
                ready: "text-green-600 bg-green-500/10",
                partial: "text-amber-600 bg-amber-500/10",
                insufficient: "text-red-500 bg-red-500/10",
              };
              const labels = {
                ready: "Ready",
                partial: "Partial",
                insufficient: "Low",
              };
              return (
                <div
                  key={level}
                  className="rounded-xl p-2 text-center"
                  style={innerGlass}
                >
                  <p
                    className={`text-lg font-semibold ${colors[level].split(" ")[0]}`}
                  >
                    {count}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {labels[level]}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Hint */}
        <p className="text-xs text-slate-400 text-center px-2">
          Select a document from the left panel to see detailed generation
          intelligence.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Pre-Generation — Data fields, gap prediction, related docs
// ═══════════════════════════════════════════════

function PreGenerationView({
  meta,
  readiness,
  allReadiness,
  completedDocs,
  onSelect,
}: {
  meta: DocumentTypeMeta;
  readiness: ReadinessResult | null;
  allReadiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
  onSelect: (type: NCADocumentType) => void;
}) {
  const missingCritical = readiness?.missingCritical || [];

  const fieldStatuses = useMemo(
    () => getFieldStatuses(meta.id, missingCritical),
    [meta.id, missingCritical],
  );

  const gapPredictions = useMemo(
    () => predictGaps(meta.id, missingCritical),
    [meta.id, missingCritical],
  );

  const relatedDocs = useMemo(
    () => getRelatedDocuments(meta.id, allReadiness, completedDocs),
    [meta.id, allReadiness, completedDocs],
  );

  const estimatedMarkers = estimateActionMarkers(missingCritical);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Generation Intel"
        icon={<Target size={16} className="text-emerald-500" />}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Data Input Fields */}
        <Section title="Data Input">
          <div className="p-3 space-y-1.5" style={innerGlass}>
            {fieldStatuses.map((field) => (
              <div key={field.name} className="flex items-center gap-2">
                {field.isMissing ? (
                  <XCircle size={13} className="text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                )}
                <span
                  className={`text-xs flex-1 ${
                    field.isMissing
                      ? "text-red-500 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {field.label}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    field.weight === 3
                      ? "bg-red-500/10 text-red-500"
                      : field.weight === 2
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {field.weight === 3
                    ? "critical"
                    : field.weight === 2
                      ? "important"
                      : "optional"}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Gap Prediction */}
        {missingCritical.length > 0 && (
          <Section title="Gap Prediction">
            <div className="p-3" style={innerGlass}>
              {/* Summary */}
              <div className="flex items-start gap-2 mb-3 pb-2.5 border-b border-black/[0.06]">
                <AlertTriangle
                  size={14}
                  className="text-amber-500 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-xs font-medium text-amber-600">
                    ~{estimatedMarkers} Action Required marker
                    {estimatedMarkers !== 1 ? "s" : ""} expected
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Fill missing data to reduce markers before generating.
                  </p>
                </div>
              </div>

              {/* Affected sections */}
              <div className="space-y-2">
                {gapPredictions.map((gap) => (
                  <div
                    key={gap.sectionNumber}
                    className="flex items-start gap-2"
                  >
                    <span className="text-[10px] font-mono text-slate-400 w-4 mt-0.5 shrink-0">
                      {gap.sectionNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 font-medium truncate">
                        {gap.sectionTitle}
                      </p>
                      <p className="text-[10px] text-amber-500 mt-0.5">
                        Missing: {gap.missingFields.join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* No Gaps — All Good */}
        {missingCritical.length === 0 && (
          <div className="p-3 rounded-[14px] bg-green-500/[0.08] border border-green-400/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <p className="text-xs font-medium text-green-600">
                All critical data present — minimal gaps expected.
              </p>
            </div>
          </div>
        )}

        {/* Related Documents */}
        {relatedDocs.length > 0 && (
          <Section title="Related Documents">
            <div className="space-y-1">
              {relatedDocs.map((doc) => (
                <button
                  key={doc.type}
                  onClick={() => onSelect(doc.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/40"
                >
                  {doc.isCompleted ? (
                    <CheckCircle2
                      size={13}
                      className="text-green-500 shrink-0"
                    />
                  ) : (
                    <Circle size={13} className="text-slate-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 font-medium truncate">
                      {doc.code} — {doc.shortTitle}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {doc.sharedFields} shared fields · {doc.score}% ready
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Generating — Live progress context
// ═══════════════════════════════════════════════

function GeneratingView({
  meta,
  sections,
  completedSections,
  currentSection,
  generationPhase,
  allReadiness,
  completedDocs,
}: {
  meta: DocumentTypeMeta;
  sections: SectionDefinition[];
  completedSections: number;
  currentSection: number;
  generationPhase: GenerationPhase;
  allReadiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
}) {
  const totalDocs = NCA_DOCUMENT_TYPES.length;
  const completedCount = completedDocs.size;
  const remainingSections = Math.max(0, sections.length - completedSections);
  const estimatedMinutes = Math.ceil(remainingSections * 0.3);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Generating"
        icon={
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={16} className="text-emerald-500" />
          </motion.div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Current Section */}
        <Section title="Current Section">
          <div className="p-3" style={innerGlass}>
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  generationPhase === "sections"
                    ? currentSection
                    : generationPhase
                }
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {generationPhase === "init" && (
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      Initializing
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Preparing assessment data and prompts...
                    </p>
                  </div>
                )}
                {generationPhase === "sections" && sections[currentSection] && (
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      Section {sections[currentSection].number}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {sections[currentSection].title}
                    </p>
                  </div>
                )}
                {generationPhase === "finalizing" && (
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      Finalizing
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Assembling sections and saving document...
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* Time Estimate */}
        <Section title="Estimate">
          <div className="p-3" style={innerGlass}>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-600">
                  {remainingSections} section
                  {remainingSections !== 1 ? "s" : ""} remaining
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ~{estimatedMinutes} min estimated
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Section Progress List */}
        <Section title="Sections">
          <div className="space-y-0.5">
            {sections.map((section, idx) => {
              const isComplete = idx < completedSections;
              const isCurrent =
                idx === currentSection && generationPhase === "sections";
              return (
                <div
                  key={section.number}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isCurrent ? "bg-emerald-500/[0.08]" : ""
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2
                      size={12}
                      className="text-green-500 shrink-0"
                    />
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles
                        size={12}
                        className="text-emerald-500 shrink-0"
                      />
                    </motion.div>
                  ) : (
                    <Circle size={12} className="text-slate-300 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      isCurrent
                        ? "text-emerald-600 font-medium"
                        : isComplete
                          ? "text-slate-500"
                          : "text-slate-300"
                    }`}
                  >
                    {section.title}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Package Progress (mini) */}
        <Section title="Package">
          <div className="p-3" style={innerGlass}>
            <p className="text-xs text-slate-500">
              {completedCount}/{totalDocs} documents completed
            </p>
            <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-emerald-500/60"
                style={{ width: `${(completedCount / totalDocs) * 100}%` }}
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Completed — Stats, next document, cross-doc intelligence
// ═══════════════════════════════════════════════

function CompletedView({
  meta,
  readiness,
  allReadiness,
  completedDocs,
  sections,
  actionRequiredCount,
  evidencePlaceholderCount,
  onSelect,
}: {
  meta: DocumentTypeMeta;
  readiness: ReadinessResult | null;
  allReadiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
  sections: SectionDefinition[];
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
  onSelect: (type: NCADocumentType) => void;
}) {
  const totalDocs = NCA_DOCUMENT_TYPES.length;
  const completedCount = completedDocs.size;
  const progressPct = Math.round((completedCount / totalDocs) * 100);

  const relatedDocs = useMemo(
    () => getRelatedDocuments(meta.id, allReadiness, completedDocs),
    [meta.id, allReadiness, completedDocs],
  );

  const recommended = getRecommendedNext(allReadiness, completedDocs);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Document Info"
        icon={<FileText size={16} className="text-emerald-500" />}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Document Stats */}
        <Section title="Document Stats">
          <div className="grid grid-cols-3 gap-1.5">
            <StatBox
              label="Sections"
              value={String(sections.length)}
              color="text-slate-700"
            />
            <StatBox
              label="Action Req."
              value={String(actionRequiredCount)}
              color={
                actionRequiredCount > 0 ? "text-amber-600" : "text-green-600"
              }
            />
            <StatBox
              label="Evidence"
              value={String(evidencePlaceholderCount)}
              color={
                evidencePlaceholderCount > 0
                  ? "text-emerald-600"
                  : "text-slate-500"
              }
            />
          </div>
        </Section>

        {/* Article Reference (compact) */}
        <div className="px-3 py-2 rounded-xl bg-slate-500/[0.06]">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
            Reference
          </p>
          <p className="text-xs text-slate-600">{meta.articleRef}</p>
        </div>

        {/* Package Progress */}
        <Section title="Package Progress">
          <div className="p-3" style={innerGlass}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                {completedCount}/{totalDocs}
              </span>
              <span className="text-xs font-medium text-emerald-600">
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </Section>

        {/* Generate Next */}
        {recommended && (
          <Section title="Generate Next">
            <button
              onClick={() => onSelect(recommended.type)}
              className="w-full text-left p-3 rounded-[14px] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={innerGlass}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ArrowRight size={12} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {recommended.code} — {recommended.shortTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {recommended.score}% ready
                  </p>
                </div>
              </div>
            </button>
          </Section>
        )}

        {/* Related Documents */}
        {relatedDocs.length > 0 && (
          <Section title="Related Documents">
            <div className="space-y-1">
              {relatedDocs.slice(0, 4).map((doc) => (
                <button
                  key={doc.type}
                  onClick={() => onSelect(doc.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/40"
                >
                  {doc.isCompleted ? (
                    <CheckCircle2
                      size={13}
                      className="text-green-500 shrink-0"
                    />
                  ) : (
                    <Circle size={13} className="text-slate-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 font-medium truncate">
                      {doc.code} — {doc.shortTitle}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {doc.sharedFields} shared fields
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════

function PanelHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-black/[0.06]">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl p-2 text-center" style={innerGlass}>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
