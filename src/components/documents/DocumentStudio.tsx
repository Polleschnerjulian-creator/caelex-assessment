"use client";

import { useReducer, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { DataReviewPanel } from "./DataReviewPanel";
import { GenerationProgress } from "./GenerationProgress";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentExportPanel } from "./DocumentExportPanel";
import type { ReportSection } from "@/lib/pdf/types";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── State ───

export interface StreamSection {
  title: string;
  completed: boolean;
}

export interface StreamProgress {
  phase: "preparing" | "streaming" | "finalizing";
  sections: StreamSection[];
}

interface StudioState {
  step: number;
  documentType: DocumentGenerationType | null;
  assessmentId: string | null;
  language: string;
  sections: ReportSection[];
  rawContent: string;
  documentId: string | null;
  generationStatus: "idle" | "generating" | "completed" | "error";
  errorMessage: string | null;
  streamProgress: StreamProgress | null;
}

type StudioAction =
  | { type: "SELECT_TYPE"; documentType: DocumentGenerationType }
  | { type: "SET_ASSESSMENT"; assessmentId: string | null }
  | { type: "SET_LANGUAGE"; language: string }
  | { type: "START_GENERATION" }
  | {
      type: "GENERATION_COMPLETE";
      sections: ReportSection[];
      rawContent: string;
      documentId: string;
    }
  | { type: "GENERATION_ERROR"; message: string }
  | { type: "UPDATE_SECTIONS"; sections: ReportSection[] }
  | { type: "STREAM_SECTION_START"; title: string }
  | { type: "STREAM_SECTION_COMPLETE" }
  | { type: "STREAM_FINALIZING" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: number }
  | { type: "RESET" };

const initialState: StudioState = {
  step: 1,
  documentType: null,
  assessmentId: null,
  language: "en",
  sections: [],
  rawContent: "",
  documentId: null,
  generationStatus: "idle",
  errorMessage: null,
  streamProgress: null,
};

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "SELECT_TYPE":
      return { ...state, documentType: action.documentType, step: 2 };
    case "SET_ASSESSMENT":
      return { ...state, assessmentId: action.assessmentId };
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "START_GENERATION":
      return {
        ...state,
        step: 3,
        generationStatus: "generating",
        errorMessage: null,
        streamProgress: { phase: "preparing", sections: [] },
      };
    case "GENERATION_COMPLETE":
      return {
        ...state,
        sections: action.sections,
        rawContent: action.rawContent,
        documentId: action.documentId,
        generationStatus: "completed",
        streamProgress: null,
        step: 4,
      };
    case "GENERATION_ERROR":
      return {
        ...state,
        generationStatus: "error",
        errorMessage: action.message,
        streamProgress: null,
      };
    case "STREAM_SECTION_START":
      return {
        ...state,
        streamProgress: {
          phase: "streaming",
          sections: [
            ...(state.streamProgress?.sections.map((s) => ({
              ...s,
              completed: true,
            })) ?? []),
            { title: action.title, completed: false },
          ],
        },
      };
    case "STREAM_SECTION_COMPLETE":
      return {
        ...state,
        streamProgress: state.streamProgress
          ? {
              ...state.streamProgress,
              sections: state.streamProgress.sections.map((s, i) =>
                i === state.streamProgress!.sections.length - 1
                  ? { ...s, completed: true }
                  : s,
              ),
            }
          : null,
      };
    case "STREAM_FINALIZING":
      return {
        ...state,
        streamProgress: state.streamProgress
          ? {
              ...state.streamProgress,
              phase: "finalizing",
              sections: state.streamProgress.sections.map((s) => ({
                ...s,
                completed: true,
              })),
            }
          : null,
      };
    case "UPDATE_SECTIONS":
      return { ...state, sections: action.sections };
    case "NEXT_STEP":
      return { ...state, step: Math.min(state.step + 1, 5) };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 1) };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Step Labels ───

const STEPS = [
  { label: "Select Type", key: "type" },
  { label: "Review Data", key: "review" },
  { label: "Generate", key: "generate" },
  { label: "Review & Edit", key: "edit" },
  { label: "Export", key: "export" },
];

// ─── Component ───

const VALID_TYPES: DocumentGenerationType[] = [
  "DEBRIS_MITIGATION_PLAN",
  "CYBERSECURITY_FRAMEWORK",
  "ENVIRONMENTAL_FOOTPRINT",
  "INSURANCE_COMPLIANCE",
  "NIS2_ASSESSMENT",
  "AUTHORIZATION_APPLICATION",
];

export default function DocumentStudio() {
  const [state, dispatch] = useReducer(studioReducer, initialState);
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // Deep-link: auto-select document type from ?type= query param
  useEffect(() => {
    const typeParam = searchParams.get("type") as DocumentGenerationType | null;
    if (typeParam && VALID_TYPES.includes(typeParam) && state.step === 1) {
      dispatch({ type: "SELECT_TYPE", documentType: typeParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!state.documentType) return;

    dispatch({ type: "START_GENERATION" });
    const startTime = Date.now();

    try {
      // Phase 1: Initialize — collect data, store prompt, get section list
      const initRes = await fetch("/api/documents/generate/init", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          documentType: state.documentType,
          assessmentId: state.assessmentId,
          language: state.language,
        }),
      });

      if (!initRes.ok) {
        const data = await initRes.json().catch(() => null);
        throw new Error(
          data?.error || `Initialization failed (${initRes.status})`,
        );
      }

      const { documentId, sections } = (await initRes.json()) as {
        documentId: string;
        sections: Array<{ title: string; number: number }>;
      };

      // Phase 2: Generate each section as a separate API call (~15-20s each)
      const sectionContents: string[] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        dispatch({
          type: "STREAM_SECTION_START",
          title: section.title,
        });

        // Retry once on failure (handles transient timeouts / rate limits)
        let lastError: string | null = null;
        let result: {
          content: string;
          inputTokens: number;
          outputTokens: number;
        } | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) {
            // Wait before retry
            await new Promise((r) => setTimeout(r, 3000));
          }

          const sectionRes = await fetch("/api/documents/generate/section", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...csrfHeaders() },
            body: JSON.stringify({
              documentId,
              sectionIndex: i,
              sectionTitle: section.title,
              sectionNumber: section.number,
            }),
          });

          if (sectionRes.ok) {
            result = await sectionRes.json();
            lastError = null;
            break;
          }

          const data = await sectionRes.json().catch(() => null);
          lastError =
            data?.error ||
            `Section "${section.title}" failed (HTTP ${sectionRes.status})`;
        }

        if (!result) {
          throw new Error(lastError || "Section generation failed");
        }

        sectionContents.push(result.content);
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;

        dispatch({ type: "STREAM_SECTION_COMPLETE" });
      }

      // Phase 3: Finalize — assemble, parse, mark COMPLETED
      dispatch({ type: "STREAM_FINALIZING" });

      const completeRes = await fetch("/api/documents/generate/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          documentId,
          sectionContents,
          totalInputTokens,
          totalOutputTokens,
          generationTimeMs: Date.now() - startTime,
        }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to finalize document");
      }

      const doc = await completeRes.json();

      dispatch({
        type: "GENERATION_COMPLETE",
        sections: doc.content || [],
        rawContent: "",
        documentId: doc.id,
      });
    } catch (error) {
      dispatch({
        type: "GENERATION_ERROR",
        message: error instanceof Error ? error.message : "Generation failed",
      });
    }
  }, [state.documentType, state.assessmentId, state.language]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/documents"
            className="p-2 text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t("documentStudio.title")}
              </h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Zap size={10} />
                AI
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/45 mt-0.5">
              {t("documentStudio.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isActive = state.step === stepNum;
          const isCompleted = state.step > stepNum;
          const isClickable =
            isCompleted ||
            (stepNum === 4 && state.generationStatus === "completed");

          return (
            <button
              key={step.key}
              onClick={() =>
                isClickable && dispatch({ type: "GO_TO_STEP", step: stepNum })
              }
              disabled={!isClickable}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                  : isCompleted
                    ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-500/70 cursor-pointer hover:bg-emerald-500/10"
                    : "text-slate-400 dark:text-white/30"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-micro font-bold ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : isCompleted
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30"
                }`}
              >
                {isCompleted ? "\u2713" : stepNum}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {state.step === 1 && (
            <DocumentTypeSelector
              onSelect={(type) =>
                dispatch({ type: "SELECT_TYPE", documentType: type })
              }
            />
          )}

          {state.step === 2 && state.documentType && (
            <DataReviewPanel
              documentType={state.documentType}
              language={state.language}
              onLanguageChange={(lang) =>
                dispatch({ type: "SET_LANGUAGE", language: lang })
              }
              onGenerate={handleGenerate}
              onBack={() => dispatch({ type: "PREV_STEP" })}
            />
          )}

          {state.step === 3 && (
            <GenerationProgress
              status={state.generationStatus}
              errorMessage={state.errorMessage}
              documentType={state.documentType}
              streamProgress={state.streamProgress}
              onRetry={handleGenerate}
            />
          )}

          {state.step === 4 && (
            <DocumentEditor
              sections={state.sections}
              onSectionsChange={(sections) =>
                dispatch({ type: "UPDATE_SECTIONS", sections })
              }
              documentId={state.documentId}
              onNext={() => dispatch({ type: "NEXT_STEP" })}
              onBack={() => dispatch({ type: "GO_TO_STEP", step: 1 })}
            />
          )}

          {state.step === 5 && state.documentId && (
            <DocumentExportPanel
              documentId={state.documentId}
              title={
                typeof state.sections[0]?.title === "string"
                  ? state.sections[0].title
                  : "Document"
              }
              sections={state.sections}
              onBack={() => dispatch({ type: "PREV_STEP" })}
              onNewDocument={() => dispatch({ type: "RESET" })}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
