"use client";

import { useState, useEffect, useCallback } from "react";
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
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";

type PanelState = "empty" | "pre-generation" | "generating" | "completed";

const SECTION_FETCH_TIMEOUT_MS = 120_000; // 2 minutes per section (server maxDuration=300s)
const COMPLETE_FETCH_TIMEOUT_MS = 30_000; // 30s for finalization (lightweight DB write)
const GENERATION_WATCHDOG_MS = 900_000; // 15 minutes max total generation time

/** Fetch with AbortController timeout so requests can't hang indefinitely */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
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
        console.error("Failed to load document generator data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelect = useCallback(
    (type: NCADocumentType) => {
      setSelectedType(type);
      const defs = SECTION_DEFINITIONS[type];
      setSections(defs);

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
    [completedDocs],
  );

  async function loadDocument(type: NCADocumentType) {
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
        }
      }
    } catch (err) {
      console.error("Failed to load document:", err);
    }
  }

  async function handleGenerate(resume = false) {
    if (!selectedType) return;

    setError(null);
    setIsGenerating(true);
    setPanelState("generating");

    const sectionDefs = SECTION_DEFINITIONS[selectedType];
    let documentId: string;
    let sectionContents: string[];
    let totalInputTokens: number;
    let totalOutputTokens: number;
    let startTime: number;
    let startFromSection: number;

    // Global watchdog — auto-fail after 15 minutes to prevent infinite hangs
    const watchdogTimer = setTimeout(() => {
      console.error(
        "[Generate2] Watchdog triggered: generation exceeded 15 minutes",
      );
      setError(
        "Generation timed out after 15 minutes. Your progress has been saved — click Resume to continue.",
      );
      setIsGenerating(false);
      setPanelState("pre-generation");
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
        const initRes = await fetchWithTimeout(
          "/api/generate2/documents",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...csrfHeaders() },
            body: JSON.stringify({ documentType: selectedType }),
          },
          30_000, // 30s for init — it's a DB write, not AI
        );

        if (!initRes.ok) {
          const err = await initRes
            .json()
            .catch(() => ({ error: "Failed to initialize document" }));
          throw new Error(err.error || "Failed to initialize");
        }

        const initData = await initRes.json();
        documentId = initData.documentId;
        setGenerationPhase("sections");
      }

      // ── Phase 2: Generate each section ──
      for (let i = startFromSection; i < sectionDefs.length; i++) {
        setCurrentSection(i);

        const sectionRes = await fetchWithTimeout(
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
        );

        if (!sectionRes.ok) {
          const errData = await sectionRes.json().catch(() => ({
            error: `Section ${i + 1} "${sectionDefs[i].title}" failed`,
          }));
          throw new Error(
            errData.error || `Failed to generate section ${i + 1}`,
          );
        }

        const sectionData = await sectionRes.json();
        sectionContents.push(sectionData.content);
        totalInputTokens += sectionData.inputTokens || 0;
        totalOutputTokens += sectionData.outputTokens || 0;
        setCompletedSections(i + 1);
      }

      // ── Phase 3: Finalize ──
      // CRITICAL: After all sections are generated, the client has ALL content.
      // Parse locally first, display immediately, then try to save to server.
      // Server save failure must NEVER block the user from seeing their document.
      setGenerationPhase("finalizing");

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
        console.error("[Generate2] Client-side parse failed:", parseErr);
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

      // Save to server — try lightweight first (server reconstructs from saved
      // sections), fall back to sending full content if that fails.
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
          console.warn(
            "[Generate2] Lightweight save failed, trying full mode:",
            lightRes.status,
          );
        }
      } catch (lightErr) {
        console.warn(
          "[Generate2] Lightweight save error, trying full mode:",
          lightErr,
        );
      }

      // Fallback: send full content if lightweight mode failed
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
            console.error("[Generate2] Full save also failed:", fullRes.status);
          }
        } catch (fullErr) {
          console.error("[Generate2] Full save error:", fullErr);
        }
      }

      if (!saved) {
        console.error(
          "[Generate2] Both save modes failed — document visible but not persisted",
        );
      }
    } catch (err) {
      console.error("[Generate2] Generation failed:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
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
      const blob = generateDocumentPDF(meta.title, documentState.content);

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
      console.error("Export failed:", err);
    }
  }

  async function handleGeneratePackage() {
    setIsPackageGenerating(true);
    setError(null);

    try {
      // 1. Create the package
      const pkgRes = await fetch("/api/generate2/package", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ language: "en" }),
      });

      if (!pkgRes.ok) {
        const err = await pkgRes
          .json()
          .catch(() => ({ error: "Failed to create package" }));
        throw new Error(err.error || "Failed to create package");
      }

      const { packageId, documentTypes } = (await pkgRes.json()) as {
        packageId: string;
        documentTypes: NCADocumentType[];
      };

      // 2. Generate each document type sequentially
      const typesToGenerate = (documentTypes || ALL_NCA_DOC_TYPES).filter(
        (t) => !completedDocs.has(t),
      );

      for (const docType of typesToGenerate) {
        const sectionDefs = SECTION_DEFINITIONS[docType];
        setSelectedType(docType);
        setSections(sectionDefs);
        setPanelState("generating");
        setGenerationPhase("init");
        setCompletedSections(0);
        setCurrentSection(0);

        // Init
        const initRes = await fetch("/api/generate2/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ documentType: docType, packageId }),
        });

        if (!initRes.ok) {
          console.error(`Failed to init ${docType}, skipping`);
          continue;
        }

        const { documentId } = await initRes.json();
        setGenerationPhase("sections");

        // Generate sections
        const sectionContents: string[] = [];
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const startTime = Date.now();
        let failed = false;

        for (let i = 0; i < sectionDefs.length; i++) {
          setCurrentSection(i);
          try {
            const sectionRes = await fetchWithTimeout(
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
            );

            if (!sectionRes.ok) {
              console.error(
                `Section ${i + 1} of ${docType} failed, skipping document`,
              );
              failed = true;
              break;
            }

            const sectionData = await sectionRes.json();
            sectionContents.push(sectionData.content);
            totalInputTokens += sectionData.inputTokens || 0;
            totalOutputTokens += sectionData.outputTokens || 0;
            setCompletedSections(i + 1);
          } catch {
            console.error(
              `Section ${i + 1} of ${docType} errored, skipping document`,
            );
            failed = true;
            break;
          }
        }

        if (failed) continue;

        // Finalize — non-blocking parse, then background save
        setGenerationPhase("finalizing");
        const fullContent = sectionContents.filter(Boolean).join("\n\n");

        let parsedSections: ParsedSection[];
        let pkgActionRequired: number;
        let pkgEvidencePlaceholders: number;

        try {
          const parsed = await parseContentNonBlocking(
            fullContent,
            parseSectionsFromMarkdown,
          );
          parsedSections = parsed.parsedSections;
          pkgActionRequired = parsed.actionRequired;
          pkgEvidencePlaceholders = parsed.evidencePlaceholders;
        } catch {
          parsedSections = [
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
          pkgActionRequired = (
            fullContent.match(/\[ACTION REQUIRED[^\]]*\]/g) || []
          ).length;
          pkgEvidencePlaceholders = (
            fullContent.match(/\[EVIDENCE[^\]]*\]/g) || []
          ).length;
        }

        // Save to server — lightweight mode (server reconstructs from saved sections)
        fetchWithTimeout(
          `/api/generate2/documents/${documentId}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...csrfHeaders() },
            body: JSON.stringify({
              mode: "reconstruct",
              totalInputTokens,
              totalOutputTokens,
              generationTimeMs: Date.now() - startTime,
            }),
          },
          COMPLETE_FETCH_TIMEOUT_MS,
        ).catch((err) =>
          console.error(`[Generate2] Package save failed for ${docType}:`, err),
        );

        setCompletedDocs((prev) => new Set([...prev, docType]));
      }

      setPanelState("empty");
    } catch (err) {
      console.error("Package generation failed:", err);
      setError(
        err instanceof Error ? err.message : "Package generation failed",
      );
    } finally {
      setIsPackageGenerating(false);
    }
  }

  const selectedMeta = selectedType ? NCA_DOC_TYPE_MAP[selectedType] : null;
  const selectedReadiness = readiness.find(
    (r) => r.documentType === selectedType,
  );

  const glassPanel: React.CSSProperties = {
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">
            Loading Document Generator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-3 gap-3">
      {/* Left Panel — Document Selector */}
      <div className="w-[280px] shrink-0" style={glassPanel}>
        <DocumentSelectorPanel
          selectedType={selectedType}
          onSelect={handleSelect}
          readiness={readiness}
          completedDocs={completedDocs}
          onGeneratePackage={handleGeneratePackage}
          isPackageGenerating={isPackageGenerating}
        />
      </div>

      {/* Center Panel — Preview/Generation */}
      <div className="flex-1 min-w-0" style={glassPanel}>
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
          onGenerate={() => handleGenerate(!!resumeData)}
          onExportPdf={handleExportPdf}
        />
      </div>

      {/* Right Panel — Context */}
      <div className="w-[320px] shrink-0 hidden xl:block" style={glassPanel}>
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
        />
      </div>
    </div>
  );
}
