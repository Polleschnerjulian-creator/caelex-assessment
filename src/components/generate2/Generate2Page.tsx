"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { DocumentSelectorPanel } from "./DocumentSelectorPanel";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { ContextPanel } from "./ContextPanel";
import { SECTION_DEFINITIONS } from "@/lib/generate/section-definitions";
import { NCA_DOC_TYPE_MAP } from "@/lib/generate/types";
import { parseSectionsFromMarkdown } from "@/lib/generate/parse-sections";
import type { ParsedSection } from "@/lib/generate/parse-sections";
import { csrfHeaders } from "@/lib/csrf-client";
import type {
  NCADocumentType,
  ReadinessResult,
  SectionDefinition,
} from "@/lib/generate/types";
import type {
  ReasoningPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";
import {
  updateGenerationProgress,
  resetGenerationProgress,
  computeSingleDocProgress,
  computePackageProgress,
} from "@/lib/generation-store";
import type { NCAProfile } from "@/data/nca-profiles";
import { getFranceJurisdiction } from "@/data/regulatory/jurisdictions/france";
import { getGermanyJurisdiction } from "@/data/regulatory/jurisdictions/germany";
import { getUKJurisdiction } from "@/data/regulatory/jurisdictions/uk";
import { getBelgiumJurisdiction } from "@/data/regulatory/jurisdictions/belgium";
import { getNetherlandsJurisdiction } from "@/data/regulatory/jurisdictions/netherlands";
import type { ConsistencyFinding } from "@/lib/generate/consistency-check";
import { ImpactNotification } from "./ImpactNotification";
import type { ImpactResult } from "@/lib/generate/impact-analysis";
import { computeOptimalOrder } from "@/lib/generate/document-order";
import {
  extractKeyFindings,
  formatPackageContext,
} from "@/lib/generate/key-findings";
import type { DocumentFindings } from "@/lib/generate/key-findings";

// ─── NCA profiles derived from the enacted regulatory data layer ─────────────

function buildNCAProfiles(): NCAProfile[] {
  const jurisdictions = [
    { id: "cnes", getter: getFranceJurisdiction },
    { id: "bnetza", getter: getGermanyJurisdiction },
    { id: "uksa", getter: getUKJurisdiction },
    { id: "belspo", getter: getBelgiumJurisdiction },
    { id: "nso", getter: getNetherlandsJurisdiction },
  ] as const;

  return jurisdictions.map(({ id, getter }) => {
    const j = getter();
    return {
      id,
      name: j.nca.name,
      country: j.code,
      language: j.nca.language,
      executiveSummaryLanguage: j.nca.executiveSummaryLanguage,
      rigor: j.rigor,
      focusAreas: [],
      preferredStandards: [],
      preferredEvidence: [],
      documentGuidance: j.documentGuidance as NCAProfile["documentGuidance"],
    };
  });
}

const NCA_PROFILES: NCAProfile[] = buildNCAProfiles();

// ─────────────────────────────────────────────────────────────────────────────

/** Structured error logger — forwards to Sentry if available, falls back to console. */
function logError(message: string, error: unknown) {
  if (typeof window !== "undefined") {
    const win = window as unknown as Record<string, unknown>;
    if (win.Sentry) {
      const sentry = win.Sentry as {
        captureException: (e: unknown) => void;
      };
      sentry.captureException(
        error instanceof Error ? error : new Error(message),
      );
    }
  }
  // Always log to console for dev visibility
  console.error(message, error);
}

type PanelState =
  | "empty"
  | "pre-generation"
  | "planning"
  | "generating"
  | "completed";

const SECTION_FETCH_TIMEOUT_MS = 150_000; // 2.5 min — Anthropic SDK timeout is 120s + overhead
const COMPLETE_FETCH_TIMEOUT_MS = 30_000; // 30s for finalization (lightweight DB write)
const GENERATION_WATCHDOG_MS = 900_000; // 15 minutes max total generation time

/** Fetch + JSON parse with a single timeout covering the ENTIRE lifecycle.
 *  Previous version only timed out the fetch() — if the server sent headers
 *  (200 OK) but the body stream never completed, .json() would hang forever.
 *  This version wraps fetch + json in a single AbortController timeout. */
async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<{ response: Response; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // If a parent signal aborts, propagate to this fetch
  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", onParentAbort);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    // Read body WITHIN the same timeout — this is the fix.
    // If Vercel kills the function after sending headers but before flushing
    // the body, .json() would hang forever without this timeout.
    const data = (await response.json()) as T;
    return { response, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (parentSignal?.aborted) {
        throw new Error("Generation was cancelled.");
      }
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/** Simple fetch with timeout (for non-JSON responses like the complete endpoint). */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", onParentAbort);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (parentSignal?.aborted) {
        throw new Error("Generation was cancelled.");
      }
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/** Yield to the browser so the UI can repaint between heavy operations.
 *  Uses setTimeout only — requestAnimationFrame hangs in background tabs. */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Run parseSectionsFromMarkdown + regex matching without blocking the main thread.
 *  Wrapped in a race with a 30s timeout so it can never hang indefinitely. */
async function parseContentNonBlocking(
  fullContent: string,
  parseFn: typeof parseSectionsFromMarkdown,
) {
  const parse = async () => {
    await yieldToMain();
    const parsedSections = parseFn(fullContent);
    await yieldToMain();
    const actionRequired = (
      fullContent.match(/\[ACTION REQUIRED[^\]]*\]/g) || []
    ).length;
    const evidencePlaceholders = (
      fullContent.match(/\[EVIDENCE[^\]]*\]/g) || []
    ).length;
    await yieldToMain();
    return { parsedSections, actionRequired, evidencePlaceholders };
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Content parsing timed out")), 30_000),
  );

  return Promise.race([parse(), timeout]);
}

interface DocumentState {
  id: string | null;
  content: ParsedSection[] | null;
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
}

export function Generate2Page() {
  const [selectedType, setSelectedType] = useState<NCADocumentType | null>(
    null,
  );
  const [readiness, setReadiness] = useState<ReadinessResult[]>([]);
  const [completedDocs, setCompletedDocs] = useState<Set<NCADocumentType>>(
    new Set(),
  );
  const [panelState, setPanelState] = useState<PanelState>("empty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPackageGenerating, setIsPackageGenerating] = useState(false);
  const [sections, setSections] = useState<SectionDefinition[]>([]);
  const [completedSections, setCompletedSections] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [documentState, setDocumentState] = useState<DocumentState>({
    id: null,
    content: null,
    actionRequiredCount: 0,
    evidencePlaceholderCount: 0,
  });
  const [generationPhase, setGenerationPhase] = useState<
    "init" | "sections" | "finalizing"
  >("init");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<{
    documentId: string;
    sectionContents: string[];
    totalInputTokens: number;
    totalOutputTokens: number;
    startTime: number;
  } | null>(null);

  const [reasoningPlan, setReasoningPlan] = useState<ReasoningPlan | null>(
    null,
  );
  const [reasoningPlanId, setReasoningPlanId] = useState<string | null>(null);

  const [selectedNCA, setSelectedNCA] = useState<string | null>(null);

  const [consistencyFindings, setConsistencyFindings] = useState<
    ConsistencyFinding[]
  >([]);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);

  // H-4: Save failure UI warning
  const [saveError, setSaveError] = useState(false);

  const [impactAlerts, setImpactAlerts] = useState<ImpactResult[]>([]);
  const [documentHistory, setDocumentHistory] = useState<
    Array<{
      id: string;
      version: number;
      createdAt: string;
      modelUsed: string | null;
      readinessScore: number | null;
      inputTokens: number | null;
      outputTokens: number | null;
    }>
  >([]);
  const saveRetryDataRef = useRef<{
    documentId: string;
    finalSections: ParsedSection[];
    fullContent: string;
    actionRequired: number;
    evidencePlaceholders: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    startTime: number;
  } | null>(null);

  // Global abort controller for cancelling the entire generation flow
  const generationAbortRef = useRef<AbortController | null>(null);

  // Load readiness scores and existing documents
  useEffect(() => {
    async function loadData() {
      try {
        const [readinessRes, docsRes] = await Promise.all([
          fetch("/api/generate2/readiness"),
          fetch("/api/generate2/documents"),
        ]);

        if (readinessRes.ok) {
          const data = await readinessRes.json();
          setReadiness(data.readiness || []);
        }

        if (docsRes.ok) {
          const data = await docsRes.json();
          const completed = new Set<NCADocumentType>(
            (data.documents || [])
              .filter(
                (d: { status: string }) =>
                  d.status === "COMPLETED" || d.status === "EXPORTED",
              )
              .map((d: { documentType: NCADocumentType }) => d.documentType),
          );
          setCompletedDocs(completed);
        }
      } catch (err) {
        logError("[Generate2] Failed to load document generator data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // M-9: Wrap loadDocument in useCallback to prevent stale closures
  // M-5: TODO — The GET /api/generate2/documents endpoint does not yet support
  // query params (type, status, limit). Once the API agent adds support, change
  // this to: fetch(`/api/generate2/documents?type=${type}&status=COMPLETED&limit=1`)
  // to avoid fetching ALL documents just to find one by type.
  const loadDocument = useCallback(async (type: NCADocumentType) => {
    try {
      const res = await fetch("/api/generate2/documents");
      if (!res.ok) return;
      const data = await res.json();
      const doc = (data.documents || []).find(
        (d: { documentType: string; status: string }) =>
          d.documentType === type &&
          (d.status === "COMPLETED" || d.status === "EXPORTED"),
      );
      if (doc) {
        const detailRes = await fetch(`/api/generate2/documents/${doc.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const content =
            detail.document.isEdited && detail.document.editedContent
              ? detail.document.editedContent
              : detail.document.content;
          setDocumentState({
            id: detail.document.id,
            content: content as ParsedSection[],
            actionRequiredCount: detail.document.actionRequiredCount || 0,
            evidencePlaceholderCount:
              detail.document.evidencePlaceholderCount || 0,
          });

          // Load version history for this document type
          try {
            const historyRes = await fetch("/api/generate2/documents");
            if (historyRes.ok) {
              const histData = await historyRes.json();
              const versions = (histData.documents || [])
                .filter(
                  (d: { documentType: string; status: string }) =>
                    d.documentType === type &&
                    (d.status === "COMPLETED" || d.status === "EXPORTED"),
                )
                .sort(
                  (a: { createdAt: string }, b: { createdAt: string }) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map(
                  (d: {
                    id: string;
                    version: number;
                    createdAt: string;
                    modelUsed: string | null;
                    readinessScore: number | null;
                    inputTokens: number | null;
                    outputTokens: number | null;
                  }) => ({
                    id: d.id,
                    version: d.version,
                    createdAt: d.createdAt,
                    modelUsed: d.modelUsed,
                    readinessScore: d.readinessScore,
                    inputTokens: d.inputTokens,
                    outputTokens: d.outputTokens,
                  }),
                );
              setDocumentHistory(versions);
            }
          } catch {
            // Non-critical
          }
        }
      }
    } catch (err) {
      logError("Failed to load document:", err);
    }
  }, []);

  // M-9: Add loadDocument to handleSelect dependency array
  const handleSelect = useCallback(
    (type: NCADocumentType) => {
      setSelectedType(type);
      const defs = SECTION_DEFINITIONS[type];
      setSections(defs);
      setConsistencyFindings([]);
      setDocumentHistory([]);

      if (completedDocs.has(type)) {
        // Load the existing document
        setPanelState("completed");
        loadDocument(type);
      } else {
        setPanelState("pre-generation");
        setDocumentState({
          id: null,
          content: null,
          actionRequiredCount: 0,
          evidencePlaceholderCount: 0,
        });
      }
    },
    [completedDocs, loadDocument],
  );

  async function handleComputePlan() {
    if (!selectedType) return;
    setError(null);

    try {
      const res = await fetch("/api/generate2/reasoning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          documentType: selectedType,
          targetNCA: selectedNCA,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to compute plan");
      }

      const data = await res.json();
      setReasoningPlan(data.plan);
      setReasoningPlanId(data.plan.id);
      setPanelState("planning");
    } catch (err) {
      logError("[Generate2] Plan computation failed", err);
      // Fall back to direct generation (no plan)
      handleGenerate(false);
    }
  }

  function handleVerdictOverride(
    sectionIndex: number,
    verdict: ComplianceVerdict,
  ) {
    if (!reasoningPlan) return;
    setReasoningPlan({
      ...reasoningPlan,
      userModified: true,
      sections: reasoningPlan.sections.map((s) =>
        s.sectionIndex === sectionIndex
          ? { ...s, complianceVerdict: verdict }
          : s,
      ),
    });
  }

  async function handleGenerate(resume = false) {
    if (!selectedType) return;

    setError(null);
    setIsGenerating(true);
    setPanelState("generating");

    const totalSectionCount = SECTION_DEFINITIONS[selectedType].length;
    updateGenerationProgress({
      active: true,
      progress: 0,
      phase: "init",
      documentType: selectedType,
      currentSection: 0,
      totalSections: totalSectionCount,
      isPackage: false,
      error: null,
    });

    // Create a global abort controller for this generation run —
    // the watchdog uses it to actually cancel pending fetches.
    const abortController = new AbortController();
    generationAbortRef.current = abortController;

    const sectionDefs = SECTION_DEFINITIONS[selectedType];
    let documentId: string;
    let sectionContents: string[];
    let totalInputTokens: number;
    let totalOutputTokens: number;
    let startTime: number;
    let startFromSection: number;

    // Global watchdog — auto-fail after 15 minutes to prevent infinite hangs.
    // IMPORTANT: This aborts the controller so pending fetches actually cancel.
    const watchdogTimer = setTimeout(() => {
      logError(
        "[Generate2] Watchdog triggered: generation exceeded 15 minutes",
        new Error("Generation watchdog timeout"),
      );
      abortController.abort();
    }, GENERATION_WATCHDOG_MS);

    if (resume && resumeData) {
      documentId = resumeData.documentId;
      sectionContents = [...resumeData.sectionContents];
      totalInputTokens = resumeData.totalInputTokens;
      totalOutputTokens = resumeData.totalOutputTokens;
      startTime = resumeData.startTime;
      startFromSection = sectionContents.length;
      setGenerationPhase("sections");
    } else {
      sectionContents = [];
      totalInputTokens = 0;
      totalOutputTokens = 0;
      startTime = Date.now();
      startFromSection = 0;
      setGenerationPhase("init");
      setCompletedSections(0);
      setCurrentSection(0);
      setResumeData(null);
      documentId = "";
    }

    try {
      // ── Phase 1: Initialize ──
      if (!resume || !resumeData) {
        const { response: initRes, data: initData } =
          await fetchJsonWithTimeout<{ documentId: string; error?: string }>(
            "/api/generate2/documents",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...csrfHeaders(),
              },
              body: JSON.stringify({ documentType: selectedType }),
            },
            30_000, // 30s for init — it's a DB write, not AI
            abortController.signal,
          );

        if (!initRes.ok) {
          throw new Error(initData?.error || "Failed to initialize");
        }

        documentId = initData.documentId;
        setGenerationPhase("sections");
        updateGenerationProgress({ phase: "sections" });
      }

      // ── Phase 2: Generate each section (with retry for transient errors) ──
      const MAX_RETRIES = 3;
      for (let i = startFromSection; i < sectionDefs.length; i++) {
        setCurrentSection(i);

        // Check if generation was aborted (e.g. by watchdog)
        if (abortController.signal.aborted) {
          throw new Error("Generation was cancelled.");
        }

        let sectionData: {
          content: string;
          inputTokens?: number;
          outputTokens?: number;
        } | null = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          // fetchJsonWithTimeout covers fetch + .json() in ONE timeout.
          // This prevents hangs when the server sends headers but the body
          // stream never completes (e.g. Vercel kills the function mid-response).
          const { response, data } = await fetchJsonWithTimeout<{
            content: string;
            inputTokens?: number;
            outputTokens?: number;
            error?: string;
          }>(
            `/api/generate2/documents/${documentId}/section`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({
                sectionIndex: i,
                sectionTitle: sectionDefs[i].title,
                sectionNumber: sectionDefs[i].number,
              }),
            },
            SECTION_FETCH_TIMEOUT_MS,
            abortController.signal,
          );

          // M-2: Only retry on 429 (rate limited) and 5xx (server error)
          if (response.ok) {
            sectionData = data;
            break;
          }
          if (response.status >= 500 || response.status === 429) {
            if (attempt < MAX_RETRIES - 1) {
              const delay =
                response.status === 429
                  ? 10_000 * (attempt + 1)
                  : 3_000 * (attempt + 1);
              await new Promise((r) => setTimeout(r, delay));
            }
            continue;
          }
          // Non-retryable error (4xx except 429)
          throw new Error(
            data?.error || `Section ${i + 1} "${sectionDefs[i].title}" failed`,
          );
        }

        if (!sectionData) {
          throw new Error(
            `Failed to generate section ${i + 1} after ${MAX_RETRIES} attempts`,
          );
        }

        sectionContents.push(sectionData.content);
        totalInputTokens += sectionData.inputTokens || 0;
        totalOutputTokens += sectionData.outputTokens || 0;
        setCompletedSections(i + 1);
        updateGenerationProgress({
          currentSection: i + 1,
          progress: computeSingleDocProgress(
            "sections",
            i + 1,
            totalSectionCount,
          ),
        });
      }

      // ── Phase 3: Finalize ──
      // CRITICAL: After all sections are generated, the client has ALL content.
      // Parse locally first, display immediately, then try to save to server.
      // Server save failure must NEVER block the user from seeing their document.
      setGenerationPhase("finalizing");
      updateGenerationProgress({ phase: "finalizing", progress: 95 });

      const fullContent = sectionContents
        .filter((s) => typeof s === "string" && s.length > 0)
        .join("\n\n");

      // Client-side parse (non-blocking with 30s timeout)
      let parsedSections: ParsedSection[];
      let actionRequired: number;
      let evidencePlaceholders: number;

      try {
        const result = await parseContentNonBlocking(
          fullContent,
          parseSectionsFromMarkdown,
        );
        parsedSections = result.parsedSections;
        actionRequired = result.actionRequired;
        evidencePlaceholders = result.evidencePlaceholders;
      } catch (parseErr) {
        // Parsing failed — fall back to raw text display
        logError("[Generate2] Client-side parse failed", parseErr);
        parsedSections = [
          {
            title: "Generated Content",
            content: [
              { type: "text" as const, value: fullContent.substring(0, 50000) },
            ],
          },
        ];
        actionRequired = (fullContent.match(/\[ACTION REQUIRED[^\]]*\]/g) || [])
          .length;
        evidencePlaceholders = (fullContent.match(/\[EVIDENCE[^\]]*\]/g) || [])
          .length;
      }

      const finalSections =
        parsedSections.length > 0
          ? parsedSections
          : [
              {
                title: "Generated Content",
                content: [
                  {
                    type: "text" as const,
                    value: fullContent.substring(0, 50000),
                  },
                ],
              },
            ];

      // IMMEDIATELY show the document to the user — don't wait for server save
      setDocumentState({
        id: documentId,
        content: finalSections,
        actionRequiredCount: actionRequired,
        evidencePlaceholderCount: evidencePlaceholders,
      });
      setCompletedDocs((prev) => new Set([...prev, selectedType]));
      setPanelState("completed");
      setResumeData(null);
      updateGenerationProgress({ phase: "completed", progress: 100 });
      // Auto-clear the ring after 3s so the user sees 100% briefly
      setTimeout(() => resetGenerationProgress(), 3000);

      // Auto-trigger consistency check in background
      if (documentId) {
        handleConsistencyCheck(documentId);
      }

      // H-4: Store retry data for the save operation
      setSaveError(false);
      saveRetryDataRef.current = {
        documentId,
        finalSections,
        fullContent,
        actionRequired,
        evidencePlaceholders,
        totalInputTokens,
        totalOutputTokens,
        startTime,
      };

      // Save to server in the background — don't block the user from seeing
      // their document. Fire-and-forget with best-effort retry.
      (async () => {
        let saved = false;
        try {
          const lightRes = await fetchWithTimeout(
            `/api/generate2/documents/${documentId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...csrfHeaders(),
              },
              body: JSON.stringify({
                mode: "reconstruct",
                totalInputTokens,
                totalOutputTokens,
                generationTimeMs: Date.now() - startTime,
              }),
            },
            COMPLETE_FETCH_TIMEOUT_MS,
          );
          saved = lightRes.ok;
          if (!lightRes.ok) {
            logError(
              "[Generate2] Lightweight save failed, trying full mode",
              new Error(`Status ${lightRes.status}`),
            );
          }
        } catch (lightErr) {
          logError(
            "[Generate2] Lightweight save error, trying full mode",
            lightErr,
          );
        }

        if (!saved) {
          try {
            const fullRes = await fetchWithTimeout(
              `/api/generate2/documents/${documentId}/complete`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...csrfHeaders(),
                },
                body: JSON.stringify({
                  parsedSections: finalSections,
                  rawContent: fullContent,
                  actionRequiredCount: actionRequired,
                  evidencePlaceholderCount: evidencePlaceholders,
                  totalInputTokens,
                  totalOutputTokens,
                  generationTimeMs: Date.now() - startTime,
                }),
              },
              COMPLETE_FETCH_TIMEOUT_MS,
            );
            saved = fullRes.ok;
            if (!fullRes.ok) {
              logError(
                "[Generate2] Full save also failed",
                new Error(`Status ${fullRes.status}`),
              );
            }
          } catch (fullErr) {
            logError("[Generate2] Full save error", fullErr);
          }
        }

        // H-4: If both save modes failed, show warning banner
        if (!saved) {
          logError(
            "[Generate2] Both save modes failed — document visible but not persisted",
            new Error("Save failed after 2 attempts"),
          );
          setSaveError(true);
        } else {
          setSaveError(false);
          saveRetryDataRef.current = null;
        }
      })();
    } catch (err) {
      logError("[Generate2] Generation failed", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      updateGenerationProgress({
        phase: "failed",
        error: message,
        active: false,
      });

      // If the watchdog aborted, show a specific message with resume hint
      if (abortController.signal.aborted) {
        setError(
          "Generation timed out after 15 minutes. Your progress has been saved — click Resume to continue.",
        );
      } else {
        setError(message);
      }
      setPanelState("pre-generation");
      // Save state for resume
      if (documentId && sectionContents.length > 0) {
        setResumeData({
          documentId,
          sectionContents,
          totalInputTokens,
          totalOutputTokens,
          startTime,
        });
      }
    } finally {
      clearTimeout(watchdogTimer);
      generationAbortRef.current = null;
      setIsGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!documentState.content || !selectedType) return;

    try {
      // 1. Mark as exported via API (best-effort, non-blocking)
      if (documentState.id) {
        fetch(`/api/generate2/documents/${documentState.id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ format: "pdf" }),
        }).catch(() => {
          /* non-critical */
        });
      }

      // 2. Dynamic import jsPDF generator (client-side only)
      const { generateDocumentPDF } = await import("@/lib/pdf/jspdf-generator");
      const meta = NCA_DOC_TYPE_MAP[selectedType];
      const ncaProfile = selectedNCA
        ? NCA_PROFILES.find((p) => p.id === selectedNCA)
        : null;
      const blob = generateDocumentPDF(meta.title, documentState.content, {
        documentCode: meta.code,
        preparedFor: ncaProfile?.name || undefined,
        classification: "NCA Confidential — Authorization Submission",
      });

      // 3. Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meta.code}_${meta.shortTitle.replace(/[^a-zA-Z0-9\-_ ]/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logError("[Generate2] Export failed", err);
    }
  }

  // H-4: Retry save handler
  async function handleRetrySave() {
    const data = saveRetryDataRef.current;
    if (!data) return;

    setSaveError(false);
    try {
      const res = await fetchWithTimeout(
        `/api/generate2/documents/${data.documentId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            parsedSections: data.finalSections,
            rawContent: data.fullContent,
            actionRequiredCount: data.actionRequired,
            evidencePlaceholderCount: data.evidencePlaceholders,
            totalInputTokens: data.totalInputTokens,
            totalOutputTokens: data.totalOutputTokens,
            generationTimeMs: Date.now() - data.startTime,
          }),
        },
        COMPLETE_FETCH_TIMEOUT_MS,
      );
      if (res.ok) {
        setSaveError(false);
        saveRetryDataRef.current = null;
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    }
  }

  async function handleConsistencyCheck(docId: string) {
    setIsCheckingConsistency(true);
    try {
      const res = await fetch(
        `/api/generate2/documents/${docId}/consistency-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setConsistencyFindings(data.findings || []);
      }
    } catch (err) {
      logError("[Generate2] Consistency check failed", err);
    } finally {
      setIsCheckingConsistency(false);
    }
  }

  async function handleAutoFix(findingId: string) {
    if (!documentState.id) return;
    try {
      const res = await fetch(
        `/api/generate2/documents/${documentState.id}/auto-fix`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            findingIds: [findingId],
            findings: consistencyFindings,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.appliedFixes?.length > 0) {
          setDocumentState((prev) => ({
            ...prev,
            content: data.updatedSections,
          }));
          // Re-run check after fix
          handleConsistencyCheck(documentState.id!);
        }
      }
    } catch (err) {
      logError("[Generate2] Auto-fix failed", err);
    }
  }

  function handleRegenerate() {
    if (!selectedType) return;
    // Reset to pre-generation state — user goes through NCA selection + Reasoning Plan
    setPanelState("pre-generation");
    setDocumentState({
      id: null,
      content: null,
      actionRequiredCount: 0,
      evidencePlaceholderCount: 0,
    });
    setReasoningPlan(null);
    setReasoningPlanId(null);
    setConsistencyFindings([]);
    setError(null);
  }

  async function handleLoadVersion(documentId: string) {
    try {
      const res = await fetch(`/api/generate2/documents/${documentId}`);
      if (!res.ok) return;
      const detail = await res.json();
      const content =
        detail.document.isEdited && detail.document.editedContent
          ? detail.document.editedContent
          : detail.document.content;
      setDocumentState({
        id: detail.document.id,
        content: content as ParsedSection[],
        actionRequiredCount: detail.document.actionRequiredCount || 0,
        evidencePlaceholderCount: detail.document.evidencePlaceholderCount || 0,
      });
      setConsistencyFindings([]);
    } catch (err) {
      logError("Failed to load version:", err);
    }
  }

  async function handleGeneratePackage() {
    setIsPackageGenerating(true);
    setError(null);

    // Global abort controller for the entire package generation
    const abortController = new AbortController();
    generationAbortRef.current = abortController;

    // Package-level watchdog: 2 hours max for all 20 documents
    const PACKAGE_WATCHDOG_MS = 7_200_000;
    // Per-document watchdog: 15 minutes max per single document
    const DOC_WATCHDOG_MS = 900_000;

    const packageWatchdog = setTimeout(() => {
      logError(
        "[Generate2] Package watchdog: exceeded 2 hours",
        new Error("Package watchdog timeout"),
      );
      abortController.abort();
    }, PACKAGE_WATCHDOG_MS);

    try {
      // 1. Create the package
      const { response: pkgRes, data: pkgData } = await fetchJsonWithTimeout<{
        packageId: string;
        documentTypes: NCADocumentType[];
        error?: string;
      }>(
        "/api/generate2/package",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ language: "en" }),
        },
        30_000,
        abortController.signal,
      );

      if (!pkgRes.ok) {
        throw new Error(pkgData?.error || "Failed to create package");
      }

      const { packageId, documentTypes } = pkgData;

      // 2. Generate each document type sequentially
      const typesToGenerate = computeOptimalOrder(
        (documentTypes || ALL_NCA_DOC_TYPES).filter(
          (t) => !completedDocs.has(t),
        ),
      );
      const pkgTotalDocs = typesToGenerate.length;

      // M-3: Track package-level counters for status updates
      let pkgDocsCompleted = 0;
      let pkgDocsFailed = 0;

      updateGenerationProgress({
        active: true,
        progress: 0,
        phase: "sections",
        isPackage: true,
        totalDocs: pkgTotalDocs,
        completedDocs: 0,
        error: null,
      });

      const packageFindings: DocumentFindings[] = [];

      for (const docType of typesToGenerate) {
        // Check if aborted before starting each document
        if (abortController.signal.aborted) {
          throw new Error("Package generation was cancelled.");
        }

        const sectionDefs = SECTION_DEFINITIONS[docType];
        setSelectedType(docType);
        setSections(sectionDefs);
        setPanelState("generating");
        setGenerationPhase("init");
        setCompletedSections(0);
        setCurrentSection(0);
        updateGenerationProgress({
          documentType: docType,
          currentSection: 0,
          totalSections: sectionDefs.length,
          progress: computePackageProgress(
            pkgDocsCompleted,
            pkgTotalDocs,
            0,
            sectionDefs.length,
          ),
        });

        // Per-document watchdog — skip this document if it takes too long
        let docTimedOut = false;
        const docWatchdog = setTimeout(() => {
          logError(
            `[Generate2] Document watchdog: ${docType} exceeded 15 minutes, skipping`,
            new Error("Per-document watchdog timeout"),
          );
          docTimedOut = true;
        }, DOC_WATCHDOG_MS);

        try {
          // Init
          const { response: initRes, data: initData } =
            await fetchJsonWithTimeout<{ documentId: string; error?: string }>(
              "/api/generate2/documents",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...csrfHeaders(),
                },
                body: JSON.stringify({ documentType: docType, packageId }),
              },
              30_000,
              abortController.signal,
            );

          if (!initRes.ok) {
            logError(
              `[Generate2] Failed to init ${docType}, skipping`,
              new Error(`Init failed: ${initRes.status}`),
            );
            // M-3: Update package status on failure
            pkgDocsFailed++;
            updatePackageStatus(packageId, pkgDocsCompleted, pkgDocsFailed);
            continue;
          }

          const { documentId } = initData;
          setGenerationPhase("sections");

          // Generate sections
          let sectionContents: string[] = [];
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          const startTime = Date.now();
          let failed = false;

          for (let i = 0; i < sectionDefs.length; i++) {
            // Check abort + per-doc timeout before each section
            if (abortController.signal.aborted || docTimedOut) {
              failed = true;
              break;
            }

            setCurrentSection(i);
            try {
              let sectionData: {
                content: string;
                inputTokens?: number;
                outputTokens?: number;
              } | null = null;
              const PKG_MAX_RETRIES = 3;
              for (let attempt = 0; attempt < PKG_MAX_RETRIES; attempt++) {
                const { response: sectionRes, data } =
                  await fetchJsonWithTimeout<{
                    content: string;
                    inputTokens?: number;
                    outputTokens?: number;
                    error?: string;
                  }>(
                    `/api/generate2/documents/${documentId}/section`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...csrfHeaders(),
                      },
                      body: JSON.stringify({
                        sectionIndex: i,
                        sectionTitle: sectionDefs[i].title,
                        sectionNumber: sectionDefs[i].number,
                      }),
                    },
                    SECTION_FETCH_TIMEOUT_MS,
                    abortController.signal,
                  );
                // M-2: Only retry on 429 and 5xx
                if (sectionRes.ok) {
                  sectionData = data;
                  break;
                }
                if (sectionRes.status >= 500 || sectionRes.status === 429) {
                  if (attempt < PKG_MAX_RETRIES - 1) {
                    const delay =
                      sectionRes.status === 429
                        ? 10_000 * (attempt + 1)
                        : 3_000 * (attempt + 1);
                    await new Promise((r) => setTimeout(r, delay));
                  }
                  continue;
                }
                break; // Non-retryable error (4xx except 429)
              }

              if (!sectionData) {
                logError(
                  `[Generate2] Section ${i + 1} of ${docType} failed, skipping document`,
                  new Error("Section failed after retries"),
                );
                failed = true;
                break;
              }

              sectionContents.push(sectionData.content);
              totalInputTokens += sectionData.inputTokens || 0;
              totalOutputTokens += sectionData.outputTokens || 0;
              setCompletedSections(i + 1);
              updateGenerationProgress({
                currentSection: i + 1,
                progress: computePackageProgress(
                  pkgDocsCompleted,
                  pkgTotalDocs,
                  i + 1,
                  sectionDefs.length,
                ),
              });
            } catch (sectionErr) {
              // If the global abort fired, re-throw to exit the outer loop
              if (abortController.signal.aborted) {
                throw sectionErr;
              }
              logError(
                `[Generate2] Section ${i + 1} of ${docType} errored, skipping document`,
                sectionErr,
              );
              failed = true;
              break;
            }
          }

          if (failed) {
            // M-3: Update package status on failure
            pkgDocsFailed++;
            updatePackageStatus(packageId, pkgDocsCompleted, pkgDocsFailed);
            // M-7: Clear accumulated section contents to free memory
            sectionContents = [];
            continue;
          }

          // Finalize — background save (server reconstructs from saved sections)
          setGenerationPhase("finalizing");

          // Save to server — fire-and-forget
          fetchWithTimeout(
            `/api/generate2/documents/${documentId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...csrfHeaders(),
              },
              body: JSON.stringify({
                mode: "reconstruct",
                totalInputTokens,
                totalOutputTokens,
                generationTimeMs: Date.now() - startTime,
              }),
            },
            COMPLETE_FETCH_TIMEOUT_MS,
          ).catch((err) =>
            logError(`[Generate2] Package save failed for ${docType}`, err),
          );

          setCompletedDocs((prev) => new Set([...prev, docType]));

          // M-3: Update package status on success
          pkgDocsCompleted++;
          updatePackageStatus(packageId, pkgDocsCompleted, pkgDocsFailed);
          updateGenerationProgress({
            completedDocs: pkgDocsCompleted,
            progress: computePackageProgress(
              pkgDocsCompleted,
              pkgTotalDocs,
              0,
              0,
            ),
          });

          // Extract key findings for cross-reference in subsequent documents
          try {
            const fullContent = sectionContents
              .filter((s) => typeof s === "string" && s.length > 0)
              .join("\n\n");
            const parsedForFindings = parseSectionsFromMarkdown(fullContent);
            const findings = extractKeyFindings(docType, parsedForFindings);
            if (findings.length > 0) {
              packageFindings.push({
                documentType: docType,
                keyFindings: findings,
              });
            }
          } catch {
            // Non-critical — cross-references are best-effort
          }

          // M-7: Clear accumulated section contents to free memory for next document
          sectionContents = [];
        } finally {
          clearTimeout(docWatchdog);
        }
      }

      setPanelState("empty");
      updateGenerationProgress({ phase: "completed", progress: 100 });
      setTimeout(() => resetGenerationProgress(), 3000);
    } catch (err) {
      logError("[Generate2] Package generation failed", err);
      resetGenerationProgress();
      if (abortController.signal.aborted) {
        setError(
          "Package generation timed out. Already generated documents have been saved.",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Package generation failed",
        );
      }
      setPanelState("pre-generation");
    } finally {
      clearTimeout(packageWatchdog);
      generationAbortRef.current = null;
      setIsPackageGenerating(false);
    }
  }

  // M-3: Fire-and-forget PATCH to update package progress counters
  function updatePackageStatus(
    packageId: string,
    documentsCompleted: number,
    documentsFailed: number,
  ) {
    fetch(`/api/generate2/package/${packageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ documentsCompleted, documentsFailed }),
    }).catch((err) =>
      logError("[Generate2] Package status update failed", err),
    );
  }

  const selectedMeta = selectedType ? NCA_DOC_TYPE_MAP[selectedType] : null;
  const selectedReadiness = readiness.find(
    (r) => r.documentType === selectedType,
  );

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const glassPanel: React.CSSProperties = isDark
    ? {
        background: "var(--glass-bg-2)",
        backdropFilter: "blur(var(--glass-blur-2))",
        WebkitBackdropFilter: "blur(var(--glass-blur-2))",
        border: "1px solid var(--glass-border-2)",
        borderRadius: "var(--glass-radius-xl)",
        boxShadow: "var(--glass-shadow-2)",
        overflow: "hidden",
      }
    : {
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        borderRadius: 20,
        boxShadow:
          "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        overflow: "hidden",
      };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
            role="progressbar"
            aria-label="Loading document generator"
          />
          <p className="text-sm text-slate-500" aria-live="polite">
            Loading Document Generator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
      {/* H-4: Save failure warning banner */}
      {saveError && (
        <div
          className="mx-3 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              Document generated but failed to save to server. Your content is
              visible but not yet persisted.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={handleRetrySave}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
              aria-label="Retry saving document to server"
            >
              Retry Save
            </button>
            <button
              onClick={() => setSaveError(false)}
              className="p-1 rounded-md hover:bg-amber-500/10 transition-colors"
              aria-label="Dismiss save warning"
            >
              <X size={14} className="text-amber-500" />
            </button>
          </div>
        </div>
      )}

      {/* L-13: Cancel button for active generation */}
      {(isGenerating || isPackageGenerating) && (
        <div className="mx-3 mt-3 flex justify-end" aria-live="polite">
          <button
            onClick={() => generationAbortRef.current?.abort()}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-medium border border-red-500/20 transition-colors"
            aria-label="Cancel document generation"
          >
            Cancel Generation
          </button>
        </div>
      )}

      {impactAlerts.length > 0 && (
        <div className="px-4 pt-4">
          <ImpactNotification
            impacts={impactAlerts}
            onDismiss={() => setImpactAlerts([])}
          />
        </div>
      )}

      <div className="flex flex-1 min-h-0 p-3 gap-3">
        {/* Left Panel — Document Selector */}
        <nav
          className="w-[280px] shrink-0"
          style={glassPanel}
          aria-label="Document type selector"
        >
          <DocumentSelectorPanel
            selectedType={selectedType}
            onSelect={handleSelect}
            readiness={readiness}
            completedDocs={completedDocs}
            onGeneratePackage={handleGeneratePackage}
            isPackageGenerating={isPackageGenerating}
          />
        </nav>

        {/* Center Panel — Preview/Generation */}
        <main
          className="flex-1 min-w-0"
          style={glassPanel}
          aria-label="Document preview"
        >
          <DocumentPreviewPanel
            selectedType={selectedType}
            meta={selectedMeta}
            readiness={selectedReadiness || null}
            panelState={panelState}
            sections={sections}
            completedSections={completedSections}
            currentSection={currentSection}
            isGenerating={isGenerating}
            generationPhase={generationPhase}
            documentContent={documentState.content}
            actionRequiredCount={documentState.actionRequiredCount}
            evidencePlaceholderCount={documentState.evidencePlaceholderCount}
            documentId={documentState.id}
            error={error}
            canResume={!!resumeData}
            onGenerate={
              resumeData ? () => handleGenerate(true) : handleComputePlan
            }
            onExportPdf={handleExportPdf}
            reasoningPlan={reasoningPlan}
            onConfirmPlan={() => handleGenerate(false)}
            onBackFromPlan={() => {
              setPanelState("pre-generation");
              setReasoningPlan(null);
            }}
            onVerdictOverride={handleVerdictOverride}
            isConfirming={isGenerating}
            selectedNCA={selectedNCA}
            onNCAChange={setSelectedNCA}
            ncaProfiles={NCA_PROFILES}
            consistencyFindings={consistencyFindings}
            isCheckingConsistency={isCheckingConsistency}
            onRunConsistencyCheck={() =>
              documentState.id && handleConsistencyCheck(documentState.id)
            }
            onAutoFix={handleAutoFix}
            onRegenerate={handleRegenerate}
          />
        </main>

        {/* Right Panel — Context */}
        <aside
          className="w-[320px] shrink-0 hidden xl:block"
          style={glassPanel}
          aria-label="Generation intelligence"
        >
          <ContextPanel
            meta={selectedMeta}
            readiness={selectedReadiness || null}
            allReadiness={readiness}
            completedDocs={completedDocs}
            panelState={panelState}
            sections={sections}
            completedSections={completedSections}
            currentSection={currentSection}
            generationPhase={generationPhase}
            actionRequiredCount={documentState.actionRequiredCount}
            evidencePlaceholderCount={documentState.evidencePlaceholderCount}
            onSelectDocument={handleSelect}
            documentHistory={documentHistory}
            onLoadVersion={handleLoadVersion}
          />
        </aside>
      </div>
    </div>
  );
}
