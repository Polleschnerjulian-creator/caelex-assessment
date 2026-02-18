"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentSelectorPanel } from "./DocumentSelectorPanel";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { ContextPanel } from "./ContextPanel";
import { SECTION_DEFINITIONS } from "@/lib/generate/section-definitions";
import { NCA_DOC_TYPE_MAP } from "@/lib/generate/types";
import { csrfHeaders } from "@/lib/csrf-client";
import type {
  NCADocumentType,
  ReadinessResult,
  SectionDefinition,
} from "@/lib/generate/types";
import type { ReportSection } from "@/lib/pdf/types";

type PanelState = "empty" | "pre-generation" | "generating" | "completed";

interface DocumentState {
  id: string | null;
  content: ReportSection[] | null;
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
        console.error("Failed to load Generate 2.0 data:", err);
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
            content: content as ReportSection[],
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

  async function handleGenerate() {
    if (!selectedType) return;

    setError(null);
    setIsGenerating(true);
    setPanelState("generating");
    setGenerationPhase("init");
    setCompletedSections(0);
    setCurrentSection(0);

    const sectionDefs = SECTION_DEFINITIONS[selectedType];
    const sectionContents: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const startTime = Date.now();

    try {
      // 1. Initialize
      const initRes = await fetch("/api/generate2/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ documentType: selectedType }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Failed to initialize");
      }

      const initData = await initRes.json();
      const documentId = initData.documentId;
      setGenerationPhase("sections");

      // 2. Generate each section
      for (let i = 0; i < sectionDefs.length; i++) {
        setCurrentSection(i);

        const sectionRes = await fetch(
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
        );

        if (!sectionRes.ok) {
          throw new Error(`Failed to generate section ${i + 1}`);
        }

        const sectionData = await sectionRes.json();
        sectionContents.push(sectionData.content);
        totalInputTokens += sectionData.inputTokens || 0;
        totalOutputTokens += sectionData.outputTokens || 0;
        setCompletedSections(i + 1);
      }

      // 3. Finalize
      setGenerationPhase("finalizing");
      const completeRes = await fetch(
        `/api/generate2/documents/${documentId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            sectionContents,
            totalInputTokens,
            totalOutputTokens,
            generationTimeMs: Date.now() - startTime,
          }),
        },
      );

      if (!completeRes.ok) {
        throw new Error("Failed to finalize document");
      }

      const completeData = await completeRes.json();

      setDocumentState({
        id: documentId,
        content: completeData.content,
        actionRequiredCount: completeData.actionRequiredCount,
        evidencePlaceholderCount: completeData.evidencePlaceholderCount,
      });
      setCompletedDocs((prev) => new Set([...prev, selectedType]));
      setPanelState("completed");
    } catch (err) {
      console.error("Generation failed:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      setPanelState("pre-generation");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!documentState.id || !documentState.content || !selectedType) return;

    try {
      // 1. Mark as exported via API
      await fetch(`/api/generate2/documents/${documentState.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ format: "pdf" }),
      });

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

  function handleGeneratePackage() {
    setIsPackageGenerating(true);
    // TODO: Implement sequential package generation
    setTimeout(() => setIsPackageGenerating(false), 1000);
  }

  const selectedMeta = selectedType ? NCA_DOC_TYPE_MAP[selectedType] : null;
  const selectedReadiness = readiness.find(
    (r) => r.documentType === selectedType,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading Generate 2.0...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-navy-950">
      {/* Left Panel — Document Selector (280px) */}
      <div className="w-[280px] shrink-0 border-r border-navy-700 bg-navy-900/50">
        <DocumentSelectorPanel
          selectedType={selectedType}
          onSelect={handleSelect}
          readiness={readiness}
          completedDocs={completedDocs}
          onGeneratePackage={handleGeneratePackage}
          isPackageGenerating={isPackageGenerating}
        />
      </div>

      {/* Center Panel — Preview/Generation (flex-1) */}
      <div className="flex-1 min-w-0 overflow-hidden">
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
          onGenerate={handleGenerate}
          onExportPdf={handleExportPdf}
        />
      </div>

      {/* Right Panel — Context (320px) */}
      <div className="w-[320px] shrink-0 border-l border-navy-700 bg-navy-900/50 hidden xl:block">
        <ContextPanel
          meta={selectedMeta}
          readiness={selectedReadiness || null}
        />
      </div>
    </div>
  );
}
