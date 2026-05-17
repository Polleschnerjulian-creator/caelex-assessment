"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Mode UI.
 *
 * The "Mitarbeiter-Sprung". User types a high-level goal, Atlas
 * plans 3-8 steps, runs them autonomously, shows live progress as
 * step-cards, ends with an artifact (markdown report + download
 * buttons).
 *
 * Differs from /atlas/chat:
 *   - No back-and-forth — single goal in, structured run out
 *   - Step-cards stack as Atlas works (not chat bubbles)
 *   - Final artifact has prominent export-to-Word / save-to-mandate
 *     buttons (the chat-view's tiny "Notiz" affordance is for chat;
 *     here we treat the output as the actual deliverable)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  Cpu,
  Briefcase,
  FolderInput,
  CalendarPlus,
  Check,
  Paperclip,
  X,
  Brain,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  PauseCircle,
} from "lucide-react";
import { MarkdownContent } from "@/components/atlas/v2/MarkdownContent";
import { AtlasMark } from "@/components/atlas/v2/AtlasLogo";
import { labelFor } from "@/lib/atlas/tool-labels";
import { exportDraftAsWord } from "@/lib/atlas/draft-export";
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type AgentTemplate,
} from "@/lib/atlas/agent-templates";
import type { MandateListItem } from "@/components/atlas/v2/types";

interface StepRecord {
  iteration: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  isError?: boolean;
  summary?: string;
}

/* Per-iteration thinking text is stored in a Map<iter, string> in
   component state; no separate type needed since the Map signature
   already documents the shape. */

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Sprint A1 — live cost-progress event payload streamed from the
 *  server after every iteration. Drives the live cost-counter below
 *  the goal-pin while the run is in flight. */
interface CostProgress {
  currentCost: number;
  budget: number | null;
  iteration: number;
  inputTokens: number;
  outputTokens: number;
}

/** Sprint A1 — budget_pause event payload. Surfaces a confirmation
 *  modal where the lawyer can approve continuation, optionally bump
 *  the budget, or stop the run. */
interface BudgetPauseInfo {
  runId: string | null;
  currentCost: number;
  budget: number;
  etaCost: number;
  remainingSteps: number;
  iterationsCompleted: number;
}

/** Sprint B1 — approval_required event payload. Surfaces an inline
 *  card asking the lawyer to approve / edit / reject a single
 *  dangerous tool-use (create_*, send_*, schedule_*, finalize_*)
 *  before it runs. The lawyer's choice is POSTed to
 *  /api/atlas/agent/runs/[id]/approve; resume is then triggered by
 *  re-POSTing /api/atlas/agent with `resumeFromRunId`. */
interface ApprovalPauseInfo {
  runId: string;
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  rationale: string;
  iteration: number;
}

/** Per-citation verification record from the server-side
 *  citation-extractor. Same shape as ExtractedCitation but with
 *  optional `index` + `occurrences` for inline rendering. */
interface VerificationCitation {
  sourceId: string;
  citation: string;
  badge:
    | "in_force"
    | "needs_review"
    | "pending"
    | "amended"
    | "repealed"
    | "unknown";
  title: string | null;
  status: string | null;
  lastVerified: string | null;
  staleDays: number | null;
  amendedBy: string[] | null;
  supersededBy: string | null;
  sourceUrl: string | null;
  index: number;
  occurrences: number;
}

interface VerificationResult {
  total: number;
  verified: number;
  warnings: number;
  hallucinated: number;
  citations: VerificationCitation[];
}

/** Sprint A2 — Per-artifact verification finding emitted by the
 *  server-side verifyArtifacts() pass. Three kinds: citation (bad/
 *  repealed [ATLAS:...] reference), bora (BORA/BRAO rule fire), and
 *  hallucination (substantive legal claim missing a citation).
 *  Rendered as inline-warnings under each artefact-card. */
interface VerificationFinding {
  artifactIndex: number;
  kind: "citation" | "bora" | "hallucination";
  severity: "warn" | "error";
  message: string;
  citation?: string;
  offset?: number;
}

/* SUGGESTED_GOALS replaced with the full AGENT_TEMPLATES library
   in src/lib/atlas/agent-templates.ts (12 curated workflows across
   6 categories). Templates are rendered as a category-grouped
   accordion below the goal-input. */

/* Heuristic deadline-detection regex. Matches:
   - "(bis|spätestens|fällig am|Frist) DD.MM.YYYY"
   - "(deadline|by) DD.MM.YYYY"
   - "DD.MM.YYYY" near "Frist|Deadline" keywords
   German date format only — international formats would need a
   bigger parser. Each match has a leading keyword + a parseable
   DD.MM.YYYY date. Captures the keyword in [1] for label + date
   in [2-4]. */
const DEADLINE_REGEX =
  /(bis spätestens|spätestens|bis zum|bis|fällig am|Frist:?|Deadline:?|Stichtag:?)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/gi;

interface DetectedDeadline {
  raw: string;
  isoDate: string;
  context: string;
}

/* Multi-Artifact parser. Atlas in agent-mode now produces structured
   artifacts using fence markers like:
     [[ARTIFACT type=memo title="..."]] ... [[/ARTIFACT]]
   We parse the final-text into an array of typed artifacts the UI
   can render as separate cards. Anything outside the fences is
   ignored (system-prompt instructs the model not to emit prose
   outside artifacts). */

type ArtifactKind = "memo" | "schriftsatz" | "email" | "checklist" | "summary";

interface Artifact {
  kind: ArtifactKind;
  title: string;
  body: string;
}

const ARTIFACT_OPEN_RE = /\[\[ARTIFACT\s+type=(\w+)\s+title="([^"]+)"\]\]/g;
const ARTIFACT_CLOSE = "[[/ARTIFACT]]";

function parseArtifacts(text: string): Artifact[] {
  const out: Artifact[] = [];
  let m: RegExpExecArray | null;
  ARTIFACT_OPEN_RE.lastIndex = 0;
  while ((m = ARTIFACT_OPEN_RE.exec(text)) !== null) {
    const kindRaw = m[1].toLowerCase();
    const title = m[2];
    const bodyStart = m.index + m[0].length;
    const closeIdx = text.indexOf(ARTIFACT_CLOSE, bodyStart);
    if (closeIdx === -1) {
      /* Streaming may not have emitted the closing fence yet —
         take everything from bodyStart to EOF and render as the
         in-flight artifact. */
      out.push({
        kind: normaliseKind(kindRaw),
        title,
        body: text.slice(bodyStart).trim(),
      });
      break;
    }
    out.push({
      kind: normaliseKind(kindRaw),
      title,
      body: text.slice(bodyStart, closeIdx).trim(),
    });
    ARTIFACT_OPEN_RE.lastIndex = closeIdx + ARTIFACT_CLOSE.length;
  }
  return out;
}

function normaliseKind(s: string): ArtifactKind {
  if (
    s === "schriftsatz" ||
    s === "email" ||
    s === "checklist" ||
    s === "summary"
  )
    return s;
  return "memo";
}

function detectDeadlines(text: string): DetectedDeadline[] {
  const found: DetectedDeadline[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(DEADLINE_REGEX)) {
    const day = m[2].padStart(2, "0");
    const month = m[3].padStart(2, "0");
    const year = m[4];
    const isoDate = `${year}-${month}-${day}`;
    /* Dedupe by ISO date — multiple references to the same date
       in the report shouldn't produce duplicate calendar entries. */
    if (seen.has(isoDate)) continue;
    seen.add(isoDate);
    /* Grab ~80 chars of context around the match for the calendar
       entry title. */
    const start = Math.max(0, (m.index ?? 0) - 40);
    const end = Math.min(text.length, (m.index ?? 0) + 80);
    const context = text.slice(start, end).replace(/\s+/g, " ").trim();
    found.push({ raw: m[0], isoDate, context });
  }
  return found;
}

/** Sprint C2 — suggested_next event payload, one card per suggestion.
 *  Mirrors WorkflowSuggestion from workflow-suggester.server.ts but
 *  re-declared here to avoid pulling a server-only import into the
 *  client bundle. */
interface SuggestedWorkflow {
  templateId: string;
  title: string;
  description: string;
  category:
    | "compliance"
    | "drafting"
    | "research"
    | "filing"
    | "transaction"
    | "internal";
  rationale: string;
  costBand: "low" | "medium" | "high";
  estimatedSeconds: number;
  needsMandate: boolean;
  needsFile: boolean;
}

export default function AgentPage() {
  const [goal, setGoal] = useState("");
  /* Sprint C2 — when a template is selected (either via the catalog
     or via a suggested-next card), its id is captured here and sent
     to the server on POST. Server persists it on AtlasAgentRun and
     uses it at run-end to compute the next suggestions. */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [mandateId, setMandateId] = useState<string>("");
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  /* Sprint A1 — Cost-Budget. budgetInput is the raw textfield string
     so the user can clear it; we coerce to a number on POST. Empty/
     invalid → no budget. */
  const [budgetInput, setBudgetInput] = useState<string>("");
  /* Sprint A1 — live cost-counter, updated per iteration via the new
     cost_progress SSE event. Shown in the running-view footer. */
  const [costProgress, setCostProgress] = useState<CostProgress | null>(null);
  /* Sprint A1 — pause-state when the server emitted budget_pause. The
     UI renders a modal-like confirmation card; the lawyer's choice
     drives a POST to /resume + an optional re-POST to /api/atlas/agent. */
  const [budgetPause, setBudgetPause] = useState<BudgetPauseInfo | null>(null);
  /* Sprint B1 — parallel pause-state for tool-use approvals. When set,
     the ApprovalCard renders inline above the live run-view. Cleared
     when the lawyer's decision is recorded + resume kicks off. */
  const [approvalPause, setApprovalPause] = useState<ApprovalPauseInfo | null>(
    null,
  );
  /* Sprint B1 — submitting flag for the approve-endpoint POST.
     Prevents double-clicks on the approval-card buttons while the
     decision is being recorded + resume is firing. */
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  /* runId captured from run_started — needed for the resume-POST when
     the budget-pause modal triggers. */
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepRecord[]>([]);
  /* Reasoning text per iteration — accumulated via thinking_delta
     stream events. Keyed by iteration number; rendered next to the
     step-cards as a "Warum?"-expandable. */
  const [reasoning, setReasoning] = useState<Map<number, string>>(new Map());
  const [finalText, setFinalText] = useState("");
  /* Citation-Verification result — emitted by the server after the
     run completes. Null until the verification event lands; if the
     run had no citations at all, stays null and the UI doesn't
     render a verification card. */
  const [verification, setVerification] = useState<VerificationResult | null>(
    null,
  );
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Post-run action states — track which post-run actions have been
     triggered already so we can disable the buttons + show a Check. */
  const [savedToVault, setSavedToVault] = useState(false);
  const [savedDeadlines, setSavedDeadlines] = useState<Set<string>>(new Set());
  /* Pre-run file attachments — Bescheide / Verträge / etc. that
     Atlas should read first, then run the agent on them. Each gets
     extracted via /api/atlas/extract and the text is prepended to
     the goal as a fenced [Anhang] block. */
  const [attachments, setAttachments] = useState<
    { fileName: string; text: string }[]
  >([]);
  const [extractingFiles, setExtractingFiles] = useState<string[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  /* Running flag — true while an SSE stream is in flight. Set on
     handleRun, cleared in finally / stop-handlers. Drives the UI
     gating between "input the goal" and "watch the run". */
  const [running, setRunning] = useState(false);
  /* Sprint A2 — Verification-warnings emitted per artefact. The
     verification-pass-server runs three checks (citation / BORA /
     hallucination) and streams the findings via the
     `verification_warnings` SSE event. We render them as inline
     warnings under each artefact-card, filtered by artifactIndex. */
  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  /* Sprint C2 — Smart Sequencing. Suggested-next templates emitted by
     the server at run-end when this run was launched from a template.
     Rendered as 1-click cards under the artifacts; click pre-fills
     the next template + auto-starts a fresh run. */
  const [suggestedNext, setSuggestedNext] = useState<SuggestedWorkflow[]>([]);
  /* Sprint C1 — Fork-modal state. Open when the lawyer clicks "Fork
     from here" on an iteration. Holds the iteration-index they want
     to fork from; the modal pulls the steps for that iteration from
     the `steps` array. */
  const [forkModalIter, setForkModalIter] = useState<number | null>(null);
  /* Sprint C1 — submitting flag for the fork POST so the modal can
     disable its Submit button + show a spinner while the new run is
     being created. */
  const [forkSubmitting, setForkSubmitting] = useState(false);
  /* Sprint C1 — Lineage badge state. Captured from the `run_forked`
     SSE event on the resumed stream OR from the initial run row
     fetched at mount-time (history-deep-link case). */
  const [lineage, setLineage] = useState<{
    parentRunId: string;
    forkedFromStep: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  /* Fetch mandate list on mount so the Mandate-Picker is populated.
     Re-fetches when the page mounts; mandate-creation is a separate
     flow that requires page-reload anyway. */
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/atlas/mandate", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { mandates: MandateListItem[] };
        setMandates(data.mandates ?? []);
      } catch {
        /* Mandates are optional — page works without them. */
      }
    })();
  }, []);

  /* Auto-scroll on new content. */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [steps.length, finalText, usage]);

  /* File-extraction for the agent. Posts each PDF/DOCX/TXT to
     /api/atlas/extract (already built for the chat composer) and
     keeps the extracted text in local state. Runs sequentially so
     the spinner-rows show one-at-a-time. */
  const handleAddFile = async (file: File) => {
    setAttachError(null);
    if (file.size > 10 * 1024 * 1024) {
      setAttachError(
        `Datei zu groß (${Math.round(file.size / 1024)} KB; max 10 MB).`,
      );
      return;
    }
    setExtractingFiles((prev) => [...prev, file.name]);
    try {
      /* Plain-text files we can read client-side — saves a server
         round-trip and keeps the spinner short. */
      const lower = file.name.toLowerCase();
      const isTextFile =
        lower.endsWith(".txt") ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown") ||
        file.type === "text/plain" ||
        file.type === "text/markdown";
      let text = "";
      if (isTextFile) {
        text = (await file.text()).trim();
      } else {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/atlas/extract", {
          method: "POST",
          body: form,
        });
        const body = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };
        if (!res.ok) {
          setAttachError(
            body.error || `Extraktion fehlgeschlagen (${res.status})`,
          );
          return;
        }
        text = (body.text ?? "").trim();
      }
      if (!text) {
        setAttachError("Datei enthielt keinen extrahierbaren Text.");
        return;
      }
      setAttachments((prev) => [...prev, { fileName: file.name, text }]);
    } catch (e) {
      setAttachError(
        e instanceof Error ? e.message : "Datei konnte nicht gelesen werden",
      );
    } finally {
      setExtractingFiles((prev) => prev.filter((n) => n !== file.name));
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  /* Sprint A1 — parse the user's budget-text into a number (or null).
     Centralised so handleRun + the resume-flow agree on the rules. */
  const parsedBudget = (() => {
    const trimmed = budgetInput.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
    return n;
  })();

  const handleRun = async (opts?: {
    resumeFromRunId?: string;
    fork?: {
      forkFromRunId: string;
      forkFromIteration: number;
      modifiedToolInputs: Record<string, Record<string, unknown>>;
    };
  }) => {
    if (running) return;
    const isResume = !!opts?.resumeFromRunId;
    /* Sprint B1 — on resume, the goal is empty if the user already
       cleared it, but we still need ≥10 chars to pass server-side
       zod validation. Re-send the original goal verbatim (the server
       ignores it for resumes — it's restored from conversationState
       — but the zod schema requires it). For fresh runs + forks,
       validate goal locally before hitting the network. */
    if (!isResume && !goal.trim()) return;
    setRunning(true);
    const resumeFromRunId = opts?.resumeFromRunId;
    /* On resume, KEEP prior steps/reasoning/etc visible so the lawyer
       sees the full timeline. Only reset on fresh runs. */
    if (!resumeFromRunId) {
      setSteps([]);
      setReasoning(new Map());
      setFinalText("");
      setVerification(null);
      setUsage(null);
      setSavedToVault(false);
      setSavedDeadlines(new Set());
      setBudgetPause(null);
      setCostProgress(null);
      setActiveRunId(null);
      /* Sprint A2 — clear the per-run verification-findings so a stale
         set from the previous run doesn't render under the new one. */
      setFindings([]);
      /* Sprint C2 — clear any leftover suggested-next cards from the
         previous run. */
      setSuggestedNext([]);
      /* Sprint C1 — clear any prior lineage; the fork-path will set
         a fresh lineage via the run_forked SSE event. */
      setLineage(null);
    }
    /* Always clear error + the approval-pause (we're either resuming
       past it or starting fresh). */
    setError(null);
    setApprovalPause(null);
    try {
      /* Build the effective goal: attached files prepended as fenced
         [Anhang]-Blocks (same convention the chat-composer uses), so
         Atlas knows it should read them as evidence-context for the
         actual goal that follows. */
      const effectiveGoal =
        attachments.length === 0
          ? goal.trim()
          : attachments
              .map(
                (a) =>
                  `--- Anhang: ${a.fileName} ---\n${a.text}\n--- /Anhang ---`,
              )
              .join("\n\n") + `\n\n${goal.trim()}`;
      const res = await fetch("/api/atlas/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          /* Goal stays in the payload even on resume — zod requires
             min:10. Server ignores it when resumeFromRunId is set
             (state is restored from conversationState). */
          goal: effectiveGoal || "RESUME_PLACEHOLDER_GOAL",
          mandateId: mandateId || undefined,
          /* Sprint A1 — pass the parsed budget through. Server caps
             at $100 again so a tampered client can't bypass. */
          budgetUsd: parsedBudget,
          /* Sprint B1 — when set, server takes the resume-path:
             reloads conversationState + applies the recorded approval
             decision + continues the loop. */
          resumeFromRunId: resumeFromRunId ?? undefined,
          /* Sprint C2 — pass the template-id when starting from a
             template (catalog click OR suggested-next card). Server
             persists it on AtlasAgentRun and uses it at run-end to
             compute the next suggestions. Null on free-form goals. */
          templateId: selectedTemplateId ?? undefined,
          /* Sprint C1 — when set, server takes the fork-path: loads
             parent's conversationState, truncates to iter N, applies
             modifiedToolInputs, creates a NEW AtlasAgentRun, and
             continues the loop from there. Mutually exclusive with
             resumeFromRunId (server rejects if both set). */
          forkFromRunId: opts?.fork?.forkFromRunId,
          forkFromIteration: opts?.fork?.forkFromIteration,
          modifiedToolInputs: opts?.fork?.modifiedToolInputs,
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let textBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            switch (evt.type) {
              case "run_started":
                /* Sprint A1 — capture runId so we can POST to /resume
                   if the budget pauses the run mid-flight. */
                if (evt.runId) setActiveRunId(evt.runId as string);
                break;
              case "cost_progress":
                /* Sprint A1 — live cost-counter feed. */
                setCostProgress({
                  currentCost: evt.currentCost as number,
                  budget: (evt.budget as number | null) ?? null,
                  iteration: evt.iteration as number,
                  inputTokens: evt.inputTokens as number,
                  outputTokens: evt.outputTokens as number,
                });
                break;
              case "budget_pause":
                /* Sprint A1 — server hit the budget threshold. Surface
                   the modal; the lawyer's choice will fire the
                   resume-POST + optional re-POST below. */
                setBudgetPause({
                  runId: (evt.runId as string | null) ?? activeRunId,
                  currentCost: evt.currentCost as number,
                  budget: evt.budget as number,
                  etaCost: evt.etaCost as number,
                  remainingSteps: evt.remainingSteps as number,
                  iterationsCompleted: evt.iterationsCompleted as number,
                });
                break;
              case "approval_required":
                /* Sprint B1 — server paused before a dangerous tool.
                   Render the ApprovalCard inline. The lawyer's
                   decision fires handleApprovalDecision → POST
                   /approve → re-POST main route with resumeFromRunId. */
                setApprovalPause({
                  runId: (evt.runId as string | null) ?? activeRunId ?? "",
                  toolUseId: evt.toolUseId as string,
                  toolName: evt.toolName as string,
                  input: (evt.input as Record<string, unknown>) ?? {},
                  rationale: evt.rationale as string,
                  iteration: evt.iteration as number,
                });
                break;
              case "run_resumed":
                /* Sprint B1 — server confirmed resume kicked off.
                   Clear the approval-pause UI state so the timeline
                   re-renders without the card. The continuation
                   stream continues to emit step_start / step_complete
                   for the resumed iteration's tools. */
                setApprovalPause(null);
                break;
              case "run_forked":
                /* Sprint C1 — server confirmed the fork created a new
                   AtlasAgentRun. Capture lineage so the UI can render
                   a "↪ Forked from Run #XXX at iteration N" badge
                   above the goal-pin. The new runId replaces the
                   current activeRunId so subsequent SSE events
                   (cost_progress, step_complete, etc.) bind to it. */
                if (evt.runId) setActiveRunId(evt.runId as string);
                setLineage({
                  parentRunId: evt.parentRunId as string,
                  forkedFromStep: evt.forkedFromStep as number,
                });
                break;
              case "text":
                textBuffer += evt.delta as string;
                setFinalText(textBuffer);
                break;
              case "thinking_delta": {
                /* Accumulate thinking text per iteration. Multiple
                   deltas per iteration land in the same bucket;
                   tool_use blocks for that iteration share the
                   same reasoning. */
                const it = evt.iteration as number;
                const delta = evt.delta as string;
                setReasoning((prev) => {
                  const next = new Map(prev);
                  next.set(it, (next.get(it) ?? "") + delta);
                  return next;
                });
                break;
              }
              case "step_start":
                setSteps((prev) => [
                  ...prev,
                  {
                    iteration: evt.iteration as number,
                    toolId: evt.toolId as string,
                    toolName: evt.toolName as string,
                    input: (evt.input as Record<string, unknown>) ?? {},
                    startedAt: Date.now(),
                  },
                ]);
                break;
              case "step_complete":
                setSteps((prev) =>
                  prev.map((s) =>
                    s.toolId === evt.toolId
                      ? {
                          ...s,
                          completedAt: Date.now(),
                          durationMs: evt.durationMs as number,
                          isError: evt.isError as boolean,
                          summary: evt.summary as string,
                        }
                      : s,
                  ),
                );
                break;
              case "verification":
                setVerification({
                  total: evt.total as number,
                  verified: evt.verified as number,
                  warnings: evt.warnings as number,
                  hallucinated: evt.hallucinated as number,
                  citations: (evt.citations as VerificationCitation[]) ?? [],
                });
                break;
              case "verification_warnings":
                /* Sprint A2 — per-artefact verification findings. The
                   server emits a single batch event with the full
                   findings-array so we replace local state in one go;
                   no merge / append semantics needed. */
                setFindings(
                  (evt.findings as VerificationFinding[] | undefined) ?? [],
                );
                break;
              case "suggested_next":
                /* Sprint C2 — server emitted follow-up template
                   suggestions because this run was launched from a
                   template with a curated `suggestedNext` list. The
                   UI renders these as 1-click cards under the
                   artifacts. */
                setSuggestedNext(
                  (evt.suggestions as SuggestedWorkflow[] | undefined) ?? [],
                );
                break;
              case "run_done":
                setUsage(evt.usage as UsageStats);
                break;
              case "error":
                setError(evt.message as string);
                break;
            }
          } catch {
            /* incomplete chunk */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setSteps([]);
    setReasoning(new Map());
    setFinalText("");
    setVerification(null);
    setUsage(null);
    setError(null);
    setGoal("");
    setSavedToVault(false);
    setSavedDeadlines(new Set());
    setAttachments([]);
    setAttachError(null);
    /* Sprint A1 — also clear cost/pause-state. Budget-input itself
       stays (sticky preference between runs) so a lawyer who set
       $5/run doesn't have to retype every time. */
    setBudgetPause(null);
    setCostProgress(null);
    setActiveRunId(null);
    /* Sprint A2 — also drop the per-run verification-findings on
       reset; a fresh goal starts with a clean slate. */
    setFindings([]);
    /* Sprint C2 — clear template-id selection + any suggested-next
       cards from the prior run. */
    setSelectedTemplateId(null);
    setSuggestedNext([]);
    /* Sprint C1 — clear lineage + any open fork-modal state. */
    setLineage(null);
    setForkModalIter(null);
    setForkSubmitting(false);
    /* Keep mandateId selection — user often runs multiple agents
       on the same mandate, no reason to make them re-pick. */
  };

  /* Sprint A1 — Resume handler. Called from the budget-pause modal.
     Posts the lawyer's decision to /resume; if approved, also re-
     POSTs the original /api/atlas/agent request to actually continue.
     The v1 trade-off is documented in the resume-route docblock:
     re-POST is a fresh agent-run that re-uses the goal + new budget,
     not a literal in-flight conversation-restoration. */
  const handleResumeDecision = async (
    approve: boolean,
    increaseBudgetTo?: number,
  ) => {
    if (!budgetPause?.runId) {
      setError("Resume nicht möglich — kein aktiver Run.");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch(
        `/api/atlas/agent/runs/${budgetPause.runId}/resume`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            approve,
            increaseBudgetTo: increaseBudgetTo ?? undefined,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Resume fehlgeschlagen (${res.status})`);
        setRunning(false);
        return;
      }
      setBudgetPause(null);
      if (!approve) {
        /* Lawyer chose stop — leave the partial output on screen but
           clear the running flag so the reset-button is reachable. */
        setRunning(false);
        return;
      }
      /* Approved — bump the local budget if a new one was chosen and
         re-POST to /api/atlas/agent. v1 trade-off: this starts a new
         in-process agent-run with the same goal, NOT a server-side
         continuation. The original run is marked "running" again on
         the server side so the history page shows it as completed
         after this re-POST finishes. */
      if (increaseBudgetTo !== undefined) {
        setBudgetInput(String(increaseBudgetTo));
      }
      /* Use a microtask delay so the budgetInput state-update applies
         before parsedBudget is re-read inside handleRun. */
      setTimeout(() => {
        void handleRun();
      }, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  };

  /* Sprint B1 — Approval-decision handler. Called from the inline
     ApprovalCard. POSTs the lawyer's decision to /approve; on success
     immediately re-POSTs /api/atlas/agent with `resumeFromRunId` set
     so the agent loop picks up where it paused.
     Decision shapes:
       approved  → no extra payload; tool runs with original input
       rejected  → no extra payload; tool is skipped (USER_CANCELLED)
       modified  → modifiedInput required; tool runs with lawyer-edited input
     The Re-POST uses the same handleRun() call as fresh starts but
     with the resume param, so all existing SSE handlers (cost, steps,
     verification) continue to fire normally. */
  const handleApprovalDecision = async (
    decision: "approved" | "rejected" | "modified",
    modifiedInput?: Record<string, unknown>,
  ) => {
    if (!approvalPause) return;
    if (approvalSubmitting) return;
    setApprovalSubmitting(true);
    try {
      const res = await fetch(
        `/api/atlas/agent/runs/${approvalPause.runId}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            toolUseId: approvalPause.toolUseId,
            decision,
            modifiedInput: decision === "modified" ? modifiedInput : undefined,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Freigabe fehlgeschlagen (${res.status})`);
        setApprovalSubmitting(false);
        return;
      }
      /* Decision recorded — kick off the resume. Note: handleRun
         clears approvalPause + running + activates the new stream;
         we don't need to do that here. */
      const runIdToResume = approvalPause.runId;
      setApprovalSubmitting(false);
      /* Microtask delay matches the pattern in handleResumeDecision. */
      setTimeout(() => {
        void handleRun({ resumeFromRunId: runIdToResume });
      }, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setApprovalSubmitting(false);
    }
  };

  /* Sprint C1 — Fork handler. Called from the ForkModal when the
     lawyer confirms the per-tool-input edits. Fires handleRun() with
     fork-params; the SSE stream replaces the current run-view with
     the forked run (lineage badge captures the parentRunId). The
     modal is closed BEFORE handleRun fires so the spinner is on the
     run-view, not the modal. */
  const handleFork = (
    forkFromIteration: number,
    modifiedToolInputs: Record<string, Record<string, unknown>>,
  ) => {
    if (!activeRunId) return;
    if (running) return;
    const parentRunId = activeRunId;
    setForkSubmitting(true);
    setForkModalIter(null);
    setTimeout(() => {
      void handleRun({
        fork: {
          forkFromRunId: parentRunId,
          forkFromIteration,
          modifiedToolInputs,
        },
      }).finally(() => {
        setForkSubmitting(false);
      });
    }, 0);
  };

  /* Save the agent's final artifact as a Markdown file in the
     selected mandate's vault. Uses the existing multipart-upload
     flow at /api/atlas/mandate/[id]/files. */
  const saveToVault = async () => {
    if (!mandateId || !finalText.trim() || savedToVault) return;
    const title =
      goal
        .split(/[.!?\n]/)[0]
        ?.trim()
        .slice(0, 80) || "Atlas Agent-Ergebnis";
    const filename = `${title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim()}.md`;
    const blob = new Blob([finalText], { type: "text/markdown" });
    const file = new File([blob], filename, { type: "text/markdown" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Speichern fehlgeschlagen (${res.status})`);
        return;
      }
      setSavedToVault(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /* Create a mandate-deadline from a detected date. The agent often
     mentions deadlines in its output (e.g. "Registrierungsfrist bis
     17.04.2025"); we surface them with a one-click "trag in Mandat-
     Kalender ein" action so the lawyer doesn't have to re-type. */
  const saveDeadline = async (d: DetectedDeadline) => {
    if (!mandateId || savedDeadlines.has(d.isoDate)) return;
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/deadlines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: d.context.slice(0, 200),
          dueAt: new Date(d.isoDate + "T23:59:59").toISOString(),
          kind: "agent_detected",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Frist konnte nicht angelegt werden`);
        return;
      }
      setSavedDeadlines((prev) => new Set(prev).add(d.isoDate));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const downloadDoc = () => {
    if (!finalText.trim()) return;
    /* Use the first sentence of the goal as a title, capped. */
    const title =
      goal
        .split(/[.!?\n]/)[0]
        ?.trim()
        .slice(0, 80) || "Atlas Agent-Ergebnis";
    exportDraftAsWord({
      title,
      markdown: finalText,
      locale: "de",
      privileged: true,
    });
  };

  const hasResults = steps.length > 0 || finalText || error;

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Cpu size={11} />
          Agent-Mode
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Atlas erledigt die Aufgabe.
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Beschreibe ein konkretes Ziel — Atlas plant 3–8 Schritte und führt sie
          autonom aus. Recherche, Klassifizierung, Drafting, Friststellung in
          einem Lauf.
        </p>
      </header>

      {/* Goal input (hidden once we're running / done) */}
      {!hasResults && !running && (
        <div className="space-y-4">
          {/* Mandate-Picker — optional. When selected, Atlas runs the
              agent WITH the mandate's full context (jurisdiction,
              operator-type, custom-instructions, etc.) injected into
              its system prompt. Empty = "general" agent run. */}
          {mandates.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <Briefcase size={14} className="shrink-0 text-slate-500" />
              <label className="text-[12px] text-slate-500">
                Mandat-Kontext:
              </label>
              <select
                value={mandateId}
                onChange={(e) => setMandateId(e.target.value)}
                className="flex-1 bg-transparent text-[12.5px] text-slate-900 outline-none dark:text-slate-100"
              >
                <option value="">Kein Mandat — generischer Agent-Run</option>
                {mandates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.clientName ? ` — ${m.clientName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sprint A1 — Cost-Budget input. Optional (empty = unlimited).
              Server caps at $100/run regardless. The lawyer types a
              max once and forgets it; the run pauses if it would
              exceed the cap. */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <DollarSign size={14} className="shrink-0 text-slate-500" />
            <label
              htmlFor="atlas-agent-budget"
              className="text-[12px] text-slate-500"
            >
              Max-Budget:
            </label>
            <input
              id="atlas-agent-budget"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="optional, z.B. 5"
              className="w-24 bg-transparent text-[12.5px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <span className="text-[11px] text-slate-400">USD pro Run</span>
            <span className="ml-auto text-[10.5px] text-slate-400">
              {budgetInput && parsedBudget === null
                ? "ungültig (1–100)"
                : "Server-Cap: $100"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            {/* Attached files (PDF / DOCX / TXT / MD) — prepended to the
                goal as fenced [Anhang]-Blocks so Atlas reads them as
                evidence-context. Use cases: drop Bescheid + write
                "drafte den Widerspruch", drop Vertrag + write
                "fasse die Haftungsklauseln zusammen", etc. */}
            {(attachments.length > 0 || extractingFiles.length > 0) && (
              <div className="flex flex-col gap-1 px-2 pt-2">
                {attachments.map((a, i) => (
                  <div
                    key={`${a.fileName}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11.5px] text-slate-700 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    <Paperclip size={12} className="shrink-0 text-slate-500" />
                    <span className="flex-1 truncate" title={a.fileName}>
                      {a.fileName}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {Math.round(a.text.length / 1024)} KB Text
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Anhang entfernen"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {extractingFiles.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-500 dark:bg-white/[0.02]"
                  >
                    <Loader2 size={12} className="shrink-0 animate-spin" />
                    <span className="flex-1 truncate">{name}</span>
                    <span className="shrink-0 text-[10px]">extrahiert…</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="z.B. „Erstelle eine NIS2-Klassifizierung für meinen LEO-Satelliten-Operator und drafte den Compliance-Brief."
              rows={3}
              className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              autoFocus
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) await handleAddFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />

            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                  title="Datei hochladen (PDF, DOCX, TXT, MD)"
                >
                  <Paperclip size={11} />
                  Datei
                </button>
                <span className="text-[11px] text-slate-500">
                  {goal.length}/2000 Zeichen
                  {attachments.length > 0 &&
                    ` · ${attachments.length} Anhang${attachments.length === 1 ? "" : "e"}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleRun()}
                disabled={goal.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Play size={11} />
                Agent starten
              </button>
            </div>
          </div>

          {attachError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {attachError}
            </div>
          )}

          {/* Template-Bibliothek — kategorie-gruppiert. Click auf
              eine Template-Card pre-fillt das Goal-Feld + setzt das
              Mandate-Picker-Hint wenn das Template needsMandate hat.
              Optional: Templates die needsFile haben, zeigen einen
              "Datei hochladen"-Hint. */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">
                Workflow-Bibliothek ({AGENT_TEMPLATES.length})
              </div>
              <div className="text-[10.5px] text-slate-400">
                Click → Goal pre-fillen, dann „Agent starten"
              </div>
            </div>
            <div className="space-y-3">
              {TEMPLATE_CATEGORIES.map((cat) => {
                const templates = AGENT_TEMPLATES.filter(
                  (t) => t.category === cat.id,
                );
                if (templates.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <div className="mb-1.5 flex items-baseline gap-2 px-1">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {cat.description}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
                      {templates.map((t) => (
                        <TemplateCard
                          key={t.id}
                          template={t}
                          onClick={() => {
                            setGoal(t.goal);
                            /* Sprint C2 — capture the template-id so
                               the POST sends it + the server can
                               compute suggested-next at run-end. */
                            setSelectedTemplateId(t.id);
                            /* Auto-pick first available mandate if
                               template needs one and none is selected
                               yet. The lawyer can change it before
                               clicking "Agent starten". */
                            if (
                              t.needsMandate &&
                              !mandateId &&
                              mandates.length > 0
                            ) {
                              setMandateId(mandates[0].id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Running / completed view */}
      {hasResults && (
        <div ref={transcriptRef} className="space-y-4">
          {/* Sprint C1 — Lineage badge for forked runs. Captured from
              the run_forked SSE event. Tells the lawyer at-a-glance
              that this isn't an original run + which iteration it
              diverged from. The first 8 chars of the parentRunId are
              enough to identify it visually. */}
          {lineage && (
            <div className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11.5px] text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
              <FolderInput size={11} />
              <span>
                Forked from Run{" "}
                <span className="font-mono">
                  {lineage.parentRunId.slice(0, 8)}…
                </span>{" "}
                at iteration {lineage.forkedFromStep}
              </span>
            </div>
          )}
          {/* Goal pinned at top */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-slate-500">
              Ziel
            </div>
            <div className="text-[13px] text-slate-900 dark:text-slate-100">
              {goal}
            </div>
          </div>

          {/* Sprint A1 — Live cost-counter. Shown while running (or
              after the run if no usage-summary fired yet). Reads
              cost_progress events from the server. When the lawyer
              set a budget, render as `$X / $Y (Z%)` so they see
              headroom at-a-glance. */}
          {(costProgress || (running && parsedBudget)) && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11.5px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400">
              <DollarSign
                size={11}
                className="shrink-0 text-slate-500 dark:text-slate-400"
              />
              <span className="tabular-nums">
                ${(costProgress?.currentCost ?? 0).toFixed(4)}
                {parsedBudget !== null && (
                  <>
                    {" "}
                    / ${parsedBudget.toFixed(2)}
                    <span className="ml-2 text-slate-400">
                      (
                      {Math.min(
                        100,
                        Math.round(
                          ((costProgress?.currentCost ?? 0) / parsedBudget) *
                            100,
                        ),
                      )}
                      %)
                    </span>
                  </>
                )}
              </span>
              {costProgress && (
                <span className="ml-auto text-[10.5px] text-slate-400">
                  Iter {costProgress.iteration} ·{" "}
                  {costProgress.inputTokens.toLocaleString("de-DE")}↑ ·{" "}
                  {costProgress.outputTokens.toLocaleString("de-DE")}↓
                </span>
              )}
            </div>
          )}

          {/* Sprint A1 — Budget-Pause banner. Replaces the inline run
              progress with a confirmation card when the server paused
              the run. The lawyer either approves continuation
              (optionally with a higher budget) or stops. */}
          {budgetPause && (
            <BudgetPauseBanner
              info={budgetPause}
              onDecision={handleResumeDecision}
            />
          )}

          {/* Sprint B1 — Approval-pause card. Renders inline above the
              step-list when the server emitted approval_required. The
              lawyer's decision fires handleApprovalDecision which
              records the choice + re-POSTs to resume the agent loop. */}
          {approvalPause && (
            <ApprovalCard
              info={approvalPause}
              submitting={approvalSubmitting}
              onDecision={handleApprovalDecision}
            />
          )}

          {/* Active run indicator */}
          {running && steps.length === 0 && !finalText && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-[12.5px] text-slate-600 dark:border-white/[0.08] dark:text-slate-400">
              <span className="inline-flex animate-pulse text-slate-700 dark:text-slate-200">
                <AtlasMark size={10} />
              </span>
              Atlas plant die Schritte…
            </div>
          )}

          {/* Step-cards */}
          {(() => {
            /* Group steps by iteration so each iteration's
               reasoning-panel renders ONCE above its step-cards
               (instead of duplicating the same reasoning above
               every tool-call in that iteration). */
            const byIter = new Map<number, StepRecord[]>();
            const iterations: number[] = [];
            for (const s of steps) {
              if (!byIter.has(s.iteration)) {
                iterations.push(s.iteration);
                byIter.set(s.iteration, []);
              }
              byIter.get(s.iteration)!.push(s);
            }
            return iterations.flatMap((iter) => {
              const iterSteps = byIter.get(iter) ?? [];
              const reasoningText = reasoning.get(iter);
              /* Sprint C1 — Fork button only renders for COMPLETED runs
                 where the iteration has at least one tool_use. The
                 button opens the ForkModal pre-loaded with this iter's
                 tool inputs. Hidden during in-flight runs to avoid
                 confusion. */
              const showForkButton =
                !running &&
                activeRunId !== null &&
                iterSteps.length > 0 &&
                iterSteps.every((s) => s.completedAt !== undefined);
              return [
                reasoningText ? (
                  <ReasoningPanel
                    key={`reasoning-${iter}`}
                    iteration={iter}
                    text={reasoningText}
                  />
                ) : null,
                ...iterSteps.map((step) => (
                  <StepCard key={step.toolId} step={step} />
                )),
                showForkButton ? (
                  <div
                    key={`fork-${iter}`}
                    className="ml-1 -mt-1 flex justify-end"
                  >
                    <button
                      type="button"
                      onClick={() => setForkModalIter(iter)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
                      title={`Iteration ${iter} mit geänderten Inputs neu starten`}
                    >
                      <FolderInput size={10} />
                      Fork ab Iteration {iter}
                    </button>
                  </div>
                ) : null,
              ];
            });
          })()}

          {/* Citation-Verification banner — rendered prominently
              above the artifacts. Atlas may have hallucinated source-
              ids; this is the trust-layer that surfaces them. */}
          {verification && verification.total > 0 && (
            <VerificationBanner verification={verification} />
          )}

          {/* Final artifacts — Atlas in agent-mode now produces
              MULTIPLE structured artifacts per run (memo, schriftsatz,
              email, checklist, summary). We parse the fenced markers
              and render each as its own card. If no artifacts were
              parsed (= older runs or system-prompt-disregarded), we
              fall back to a single-card render of finalText. */}
          {finalText &&
            (() => {
              const artifacts = parseArtifacts(finalText);
              if (artifacts.length === 0) {
                /* Legacy/fallback render — same as before, one card. */
                return (
                  <LegacyArtifact
                    finalText={finalText}
                    running={running}
                    mandateId={mandateId}
                    savedToVault={savedToVault}
                    onDownloadDoc={downloadDoc}
                    onSaveToVault={saveToVault}
                  />
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} />
                    {running
                      ? `Atlas erstellt Artefakte… (${artifacts.length})`
                      : `Ergebnis — ${artifacts.length} Artefakt${artifacts.length === 1 ? "" : "e"}`}
                  </div>
                  {artifacts.map((a, i) => {
                    /* Sprint A2 — surface per-artefact verification
                       warnings inline. We render them between the
                       step-cards / verification-banner and the
                       artefact-card body so the lawyer sees the flag
                       BEFORE reading the body. */
                    const artifactFindings = findings.filter(
                      (f) => f.artifactIndex === i,
                    );
                    return (
                      <div
                        key={`${a.kind}-${i}-${a.title}`}
                        className="space-y-2"
                      >
                        {artifactFindings.length > 0 && (
                          <ArtifactFindings findings={artifactFindings} />
                        )}
                        <ArtifactCard
                          artifact={a}
                          running={running}
                          mandateId={mandateId}
                          goalTitle={goal.split(/[.!?\n]/)[0]?.trim() ?? ""}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          {/* Sprint C2 — Smart Workflow-Sequencing. Render suggested
              follow-up templates as 1-click cards. Each click pre-fills
              the next template + auto-starts a fresh run (carrying the
              same mandate-context). Only renders when the prior run
              came from a template AND that template had curated
              suggestedNext entries. */}
          {!running && suggestedNext.length > 0 && (
            <SuggestedNextCards
              suggestions={suggestedNext}
              hasMandate={!!mandateId}
              onPick={(s) => {
                /* Mirror the catalog click-behaviour: set goal, set
                   template-id, auto-attach mandate if needed. Then
                   reset transient state and auto-start. Microtask
                   delay so setGoal commits before handleRun reads
                   it (matches handleResumeDecision pattern). */
                setGoal(
                  AGENT_TEMPLATES.find((t) => t.id === s.templateId)?.goal ??
                    "",
                );
                setSelectedTemplateId(s.templateId);
                if (s.needsMandate && !mandateId && mandates.length > 0) {
                  setMandateId(mandates[0].id);
                }
                /* Clear the prior run's results so the new run renders
                   fresh — handleRun does this too, but doing it
                   here makes the transition feel instant. */
                setSuggestedNext([]);
                setTimeout(() => {
                  void handleRun();
                }, 0);
              }}
            />
          )}

          {/* Auto-detected deadlines — run-level, NOT per-artifact, so
              we render at the bottom (after all artifacts). Detects
              across the entire finalText, not just one artifact. */}
          {!running &&
            mandateId &&
            finalText &&
            (() => {
              const deadlines = detectDeadlines(finalText);
              if (deadlines.length === 0) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="mb-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-500">
                    <CalendarPlus size={10} />
                    Erkannte Fristen ({deadlines.length})
                  </div>
                  <div className="space-y-1.5">
                    {deadlines.map((d) => {
                      const saved = savedDeadlines.has(d.isoDate);
                      return (
                        <div
                          key={d.isoDate}
                          className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11.5px] dark:bg-white/[0.02]"
                        >
                          <span className="shrink-0 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {d.isoDate}
                          </span>
                          <span className="line-clamp-1 flex-1 text-slate-500">
                            …{d.context}…
                          </span>
                          <button
                            type="button"
                            onClick={() => saveDeadline(d)}
                            disabled={saved}
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] transition-colors ${
                              saved
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-slate-200 text-slate-600 hover:bg-white dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                            }`}
                          >
                            {saved ? (
                              <span className="inline-flex items-center gap-1">
                                <Check size={9} />
                                in Kalender
                              </span>
                            ) : (
                              "→ Kalender"
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* Usage footer + reset */}
          {usage && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <span>
                {steps.length} Tool-Calls ·{" "}
                {usage.inputTokens.toLocaleString("de-DE")}↑ ·{" "}
                {usage.outputTokens.toLocaleString("de-DE")}↓ tokens · $
                {usage.costUsd.toFixed(4)}
              </span>
              <div className="flex items-center gap-3">
                {/* Sprint D1 — Evidence-Pack download. Only renders
                    when activeRunId is set + run is complete (usage
                    fires at run_done). The link is plain GET so the
                    browser triggers the native download dialog with
                    the server-set filename. */}
                {activeRunId && (
                  <a
                    href={`/api/atlas/agent/runs/${activeRunId}/evidence-pack`}
                    className="inline-flex items-center gap-1 text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
                    title="Berufshaftpflicht-tauglicher ZIP-Export: Agent-Output (PDF) + Quellen (PDF) + Audit-Log (JSON)"
                  >
                    <FolderInput size={11} />
                    Evidence-Pack (ZIP)
                  </a>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:hover:text-slate-200"
                >
                  Neuer Agent-Run
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Sprint C1 — ForkModal renders as a fixed overlay when the
          lawyer clicks "Fork ab Iteration N" on any iteration. Inputs
          for that iteration's tool_uses are shown as JSON-editable
          textareas; submit fires handleFork(). */}
      {forkModalIter !== null && (
        <ForkModal
          iter={forkModalIter}
          steps={steps.filter((s) => s.iteration === forkModalIter)}
          submitting={forkSubmitting}
          onClose={() => setForkModalIter(null)}
          onSubmit={handleFork}
        />
      )}
    </div>
  );
}

/* ── Step-card ─────────────────────────────────────────────────────────
 *
 * Renders one tool-call as a horizontal card:
 *   ✓ Korpus durchsucht                              128ms
 *   „NIS2 Art. 21/23 essential entities"
 *   → OK · 4 Treffer
 *
 * The friendly label comes from labelFor() (the same util the chat
 * view uses for tool-trace lines).
 */
function StepCard({ step }: { step: StepRecord }) {
  const lbl = labelFor(step.toolName);
  const detail = lbl.describe?.(step.input);
  const completed = !!step.completedAt;
  const errored = !!step.isError;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {!completed ? (
            <Loader2
              size={14}
              className="animate-spin text-slate-500 dark:text-slate-400"
            />
          ) : errored ? (
            <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle2
              size={14}
              className="text-emerald-600 dark:text-emerald-400"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {completed ? lbl.done : lbl.running}
            </div>
            {completed && step.durationMs !== undefined && (
              <div className="shrink-0 tabular-nums text-[10.5px] text-slate-500">
                {step.durationMs >= 1000
                  ? `${(step.durationMs / 1000).toFixed(1)}s`
                  : `${step.durationMs}ms`}
              </div>
            )}
          </div>
          {detail && (
            <div className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">
              {detail}
            </div>
          )}
          {step.summary && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-slate-400">→</span>
              <span className={errored ? "text-red-600 dark:text-red-400" : ""}>
                {step.summary}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* exportDraftAsWord handles its own blob + anchor click — no local
   download helper needed here. */

/* ── TemplateCard ─────────────────────────────────────────────────────
 *
 * One curated workflow tile. Click pre-fills the goal-input. Shows
 * the title, 1-line description, and metadata badges (cost-band,
 * needs-mandate hint, needs-file hint). Compact enough to grid into
 * 2-columns on lg+ screens.
 */
function TemplateCard({
  template,
  onClick,
}: {
  template: AgentTemplate;
  onClick: () => void;
}) {
  const costColor =
    template.costBand === "low"
      ? "text-emerald-600 dark:text-emerald-400"
      : template.costBand === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.02]"
    >
      <div className="flex w-full items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-slate-900 dark:text-slate-100">
          {template.title}
        </span>
        <ChevronRight size={11} className="shrink-0 text-slate-400" />
      </div>
      <span className="text-[11px] leading-snug text-slate-500">
        {template.description}
      </span>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className={costColor}>
          ~{template.estimatedSeconds}s ·{" "}
          {template.costBand === "low"
            ? "günstig"
            : template.costBand === "medium"
              ? "mittel"
              : "umfangreich"}
        </span>
        {template.needsMandate && (
          <span className="inline-flex items-center gap-0.5">
            <Briefcase size={9} />
            Mandat
          </span>
        )}
        {template.needsFile && (
          <span className="inline-flex items-center gap-0.5">
            <Paperclip size={9} />
            Datei
          </span>
        )}
      </div>
    </button>
  );
}

/* ── VerificationBanner ───────────────────────────────────────────────
 *
 * Trust-layer card that surfaces citation-verification results after
 * each agent run. Three buckets:
 *   - verified:     badge === "in_force" — corpus has this source AND
 *                   it's current (no amendments / no staleness)
 *   - warnings:     badge in {needs_review, pending, amended, repealed}
 *                   — source EXISTS but the lawyer should double-check
 *   - hallucinated: badge === "unknown" — model invented a source-id
 *                   that doesn't exist in our corpus. RED FLAG.
 *
 * Banner top-line: emerald when 100% verified, amber when warnings
 * but no hallucinations, RED when ANY hallucinations.
 *
 * Expandable detail-list shows every citation with its individual
 * badge so the lawyer can immediately spot which claim to verify
 * manually.
 */
function VerificationBanner({
  verification,
}: {
  verification: VerificationResult;
}) {
  const [open, setOpen] = useState(verification.hallucinated > 0);
  const hasHallucinations = verification.hallucinated > 0;
  const hasWarnings = verification.warnings > 0;
  const allGood = !hasHallucinations && !hasWarnings;

  const tone = hasHallucinations
    ? {
        border: "border-red-300 dark:border-red-500/30",
        bg: "bg-red-50 dark:bg-red-500/10",
        text: "text-red-700 dark:text-red-300",
        icon: <ShieldAlert size={13} />,
        label: "Hallucination erkannt",
      }
    : hasWarnings
      ? {
          border: "border-amber-300 dark:border-amber-500/30",
          bg: "bg-amber-50 dark:bg-amber-500/10",
          text: "text-amber-700 dark:text-amber-300",
          icon: <ShieldAlert size={13} />,
          label: "Citations mit Vorbehalt",
        }
      : {
          border: "border-emerald-300 dark:border-emerald-500/30",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          text: "text-emerald-700 dark:text-emerald-300",
          icon: <ShieldCheck size={13} />,
          label: "Alle Citations verifiziert",
        };

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        <span className={`shrink-0 ${tone.text}`}>{tone.icon}</span>
        <span className={`text-[12px] font-medium ${tone.text}`}>
          {tone.label}
        </span>
        <span className="ml-auto text-[11px] text-slate-500">
          {verification.verified}/{verification.total} verified
          {hasWarnings && ` · ${verification.warnings} warnings`}
          {hasHallucinations && ` · ${verification.hallucinated} hallucinated`}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-slate-500 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && (
        <div className="space-y-1 border-t border-current/10 px-3 py-2">
          {verification.citations.map((c) => {
            const badgeTone =
              c.badge === "in_force"
                ? "text-emerald-700 dark:text-emerald-300"
                : c.badge === "unknown"
                  ? "text-red-700 dark:text-red-300"
                  : "text-amber-700 dark:text-amber-300";
            const badgeLabel =
              c.badge === "in_force"
                ? "✓ verified"
                : c.badge === "unknown"
                  ? "✗ NICHT im Korpus"
                  : c.badge === "needs_review"
                    ? "veraltet"
                    : c.badge === "pending"
                      ? "draft"
                      : c.badge === "amended"
                        ? "geändert"
                        : c.badge === "repealed"
                          ? "aufgehoben"
                          : "?";
            return (
              <div
                key={`${c.sourceId}-${c.index}`}
                className="flex items-baseline gap-2 text-[11.5px]"
              >
                <span className="shrink-0 tabular-nums text-slate-400">
                  {c.index}.
                </span>
                <span className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300">
                  {c.citation}
                </span>
                {c.title && (
                  <span className="line-clamp-1 flex-1 text-slate-500">
                    · {c.title}
                  </span>
                )}
                <span className={`shrink-0 tabular-nums ${badgeTone}`}>
                  {badgeLabel}
                </span>
                {c.occurrences > 1 && (
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {c.occurrences}×
                  </span>
                )}
              </div>
            );
          })}
          {allGood && (
            <div className="mt-1 text-[10.5px] text-slate-500">
              Alle {verification.total} Citation-Token wurden gegen den
              Atlas-Korpus geprüft und sind in geltender Fassung.
            </div>
          )}
          {hasHallucinations && (
            <div className="mt-1 text-[10.5px] text-red-700 dark:text-red-300">
              ACHTUNG: {verification.hallucinated} Citation-Token verweisen auf
              Source-IDs, die NICHT im Atlas-Korpus existieren — Atlas hat hier
              möglicherweise halluziniert. Bitte vor Versand manuell prüfen.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ArtifactFindings ──────────────────────────────────────────────────
 *
 * Sprint A2 — Inline-warnings for one artefact. Renders a compact
 * stack of warning rows above the artefact-card body, grouped by
 * kind (citation / bora / hallucination) so a memo with three citation-
 * issues + one BORA-flag reads as two visual blocks instead of four
 * scattered rows. Severity drives the icon-colour: error = red, warn
 * = amber.
 */
function ArtifactFindings({ findings }: { findings: VerificationFinding[] }) {
  /* Group by kind for cleaner display. Within each group, error
     findings sort first (the lawyer needs to see the red flags
     before the yellow ones). */
  const groups = (["citation", "bora", "hallucination"] as const).map(
    (kind) => ({
      kind,
      items: findings
        .filter((f) => f.kind === kind)
        .sort((a, b) => {
          if (a.severity === b.severity) return 0;
          return a.severity === "error" ? -1 : 1;
        }),
    }),
  );

  const groupLabel: Record<VerificationFinding["kind"], string> = {
    citation: "Citation-Prüfung",
    bora: "BORA / BRAO",
    hallucination: "Halluzinations-Verdacht",
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/[0.04]">
      <div className="text-[10.5px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
        Verification — {findings.length} Hinweis
        {findings.length === 1 ? "" : "e"}
      </div>
      {groups.map((g) => {
        if (g.items.length === 0) return null;
        return (
          <div key={g.kind} className="space-y-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {groupLabel[g.kind]} ({g.items.length})
            </div>
            {g.items.map((f, i) => {
              const isError = f.severity === "error";
              const tone = isError
                ? "text-red-700 dark:text-red-300"
                : "text-amber-700 dark:text-amber-300";
              const Icon = isError ? AlertCircle : ShieldAlert;
              return (
                <div
                  key={`${g.kind}-${i}-${f.offset ?? f.citation ?? "x"}`}
                  className={`flex items-start gap-1.5 text-[11.5px] ${tone}`}
                >
                  <Icon size={11} className="mt-0.5 shrink-0" />
                  <span className="flex-1 leading-snug">{f.message}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── ArtifactCard ─────────────────────────────────────────────────────
 *
 * Renders one structured artifact from the agent's multi-output. Each
 * artifact has its own type-specific icon, title, body, and action
 * buttons. The .doc export uses the artifact's title as filename + the
 * appropriate privileged-stamp (schriftsatz always gets privilege
 * marker; memo/email get it conditionally per locale-defaults). The
 * Save-to-Vault button is shown only when a mandate is selected.
 */
function ArtifactCard({
  artifact,
  running,
  mandateId,
  goalTitle,
}: {
  artifact: Artifact;
  running: boolean;
  mandateId: string;
  goalTitle: string;
}) {
  const [savedToVault, setSavedToVault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta: Record<
    ArtifactKind,
    { label: string; tint: string; icon: React.ReactNode }
  > = {
    memo: {
      label: "Memo",
      tint: "text-blue-600 dark:text-blue-400",
      icon: <FileText size={11} />,
    },
    schriftsatz: {
      label: "Schriftsatz",
      tint: "text-emerald-600 dark:text-emerald-400",
      icon: <FileText size={11} />,
    },
    email: {
      label: "Email-Draft",
      tint: "text-amber-600 dark:text-amber-400",
      icon: <FileText size={11} />,
    },
    checklist: {
      label: "Checkliste",
      tint: "text-slate-600 dark:text-slate-400",
      icon: <Check size={11} />,
    },
    summary: {
      label: "Zusammenfassung",
      tint: "text-slate-500",
      icon: <Sparkles size={11} />,
    },
  };
  const m = meta[artifact.kind];

  const downloadDoc = () => {
    exportDraftAsWord({
      title: artifact.title || goalTitle || "Atlas Agent-Ergebnis",
      markdown: artifact.body,
      locale: "de",
      privileged: artifact.kind === "schriftsatz" || artifact.kind === "memo",
    });
  };

  const saveToVault = async () => {
    if (savedToVault || saving) return;
    setSaving(true);
    setError(null);
    const safeTitle =
      artifact.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim() ||
      "Atlas Agent Artefakt";
    const filename = `${safeTitle}.md`;
    const blob = new Blob([artifact.body], { type: "text/markdown" });
    const file = new File([blob], filename, { type: "text/markdown" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Speichern fehlgeschlagen (${res.status})`);
        return;
      }
      setSavedToVault(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.05]">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${m.tint}`}>{m.icon}</span>
          <span
            className={`shrink-0 text-[10.5px] uppercase tracking-wider ${m.tint}`}
          >
            {m.label}
          </span>
          <span className="line-clamp-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">
            {artifact.title}
          </span>
        </div>
        {!running && artifact.kind !== "summary" && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={downloadDoc}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <FileText size={11} />
              .doc
            </button>
            {mandateId && (
              <button
                type="button"
                onClick={saveToVault}
                disabled={savedToVault || saving}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-100 ${
                  savedToVault
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                }`}
              >
                {saving ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : savedToVault ? (
                  <>
                    <Check size={11} />
                    Im Vault
                  </>
                ) : (
                  <>
                    <FolderInput size={11} />
                    In Vault
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownContent text={artifact.body} />
        {running && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
        )}
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

/* ── LegacyArtifact ───────────────────────────────────────────────────
 *
 * Fallback render when no fenced artifacts were emitted (older runs
 * or the model ignored the structured-output instruction). Same look
 * as pre-Sprint-D: one card with the whole finalText.
 */
function LegacyArtifact({
  finalText,
  running,
  mandateId,
  savedToVault,
  onDownloadDoc,
  onSaveToVault,
}: {
  finalText: string;
  running: boolean;
  mandateId: string;
  savedToVault: boolean;
  onDownloadDoc: () => void;
  onSaveToVault: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.05]">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={11} />
          {running ? "Atlas schreibt Ergebnis…" : "Ergebnis"}
        </div>
        {!running && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onDownloadDoc}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <FileText size={11} />
              .doc Export
            </button>
            {mandateId && (
              <button
                type="button"
                onClick={onSaveToVault}
                disabled={savedToVault}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-100 ${
                  savedToVault
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                }`}
              >
                {savedToVault ? (
                  <>
                    <Check size={11} />
                    Im Mandat-Vault
                  </>
                ) : (
                  <>
                    <FolderInput size={11} />
                    In Mandat-Vault
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownContent text={finalText} />
        {running && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
        )}
      </div>
    </div>
  );
}

/* ── BudgetPauseBanner ────────────────────────────────────────────────
 *
 * Sprint A1 — Cost-Budget pause confirmation. Renders a modal-like
 * card when the server paused mid-run because the projected next-
 * iteration cost would exceed the lawyer-set budget. Three actions:
 *   • "Weiter (+$X)" → POST /resume with approve=true, then re-POST
 *                      /api/atlas/agent (handled by the parent's
 *                      handleResumeDecision)
 *   • "Mehr Budget" → user input + approve=true with increaseBudgetTo
 *   • "Stop"        → POST /resume with approve=false; partial output
 *                     remains on screen for review
 *
 * v1 trade-off: the "Weiter"-flow re-POSTs the original goal as a
 * NEW agent-run (the server-side conversation cannot be restored
 * across HTTP requests yet). The lawyer sees this as Atlas
 * "continuing", which is true semantically; v2 will move the
 * continuation server-side.
 */
function BudgetPauseBanner({
  info,
  onDecision,
}: {
  info: BudgetPauseInfo;
  onDecision: (approve: boolean, increaseBudgetTo?: number) => void;
}) {
  const [showBudgetBump, setShowBudgetBump] = useState(false);
  const [bumpInput, setBumpInput] = useState("");
  const usedRatio = info.budget > 0 ? info.currentCost / info.budget : 0;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-amber-800 dark:text-amber-200">
        <PauseCircle size={14} />
        Atlas pausiert — Budget fast erschöpft
      </div>
      <div className="mb-3 space-y-1 text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100">
        <div>
          Verbraucht:{" "}
          <span className="font-mono tabular-nums">
            ${info.currentCost.toFixed(4)}
          </span>{" "}
          von{" "}
          <span className="font-mono tabular-nums">
            ${info.budget.toFixed(2)}
          </span>{" "}
          ({Math.round(usedRatio * 100)}%).
        </div>
        <div className="text-amber-700 dark:text-amber-200/80">
          Geschätzte Kosten für den nächsten Schritt:{" "}
          <span className="font-mono tabular-nums">
            +${info.etaCost.toFixed(4)}
          </span>
          . {info.remainingSteps} weitere Schritte möglich (Iteration{" "}
          {info.iterationsCompleted}/15 durchlaufen).
        </div>
      </div>

      {!showBudgetBump ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDecision(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-amber-700"
          >
            <Play size={11} />
            Weiter (+${info.etaCost.toFixed(4)})
          </button>
          <button
            type="button"
            onClick={() => setShowBudgetBump(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-500/20"
          >
            <DollarSign size={11} />
            Mehr Budget …
          </button>
          <button
            type="button"
            onClick={() => onDecision(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/[0.10] dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            <X size={11} />
            Stop
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11.5px] text-amber-800 dark:text-amber-200">
            Neues Budget:
          </label>
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.5"
            value={bumpInput}
            onChange={(e) => setBumpInput(e.target.value)}
            placeholder={String(Math.min(100, info.budget * 2).toFixed(2))}
            className="w-24 rounded-md border border-amber-300 bg-white px-2 py-1 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 dark:border-amber-500/30 dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-500"
            autoFocus
          />
          <span className="text-[11px] text-amber-700 dark:text-amber-200/80">
            USD
          </span>
          <button
            type="button"
            onClick={() => {
              const n = Number(bumpInput);
              if (!Number.isFinite(n) || n <= 0 || n > 100) return;
              onDecision(true, n);
            }}
            disabled={(() => {
              const n = Number(bumpInput);
              return !Number.isFinite(n) || n <= 0 || n > 100;
            })()}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
          >
            <Play size={11} />
            Bestätigen
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBudgetBump(false);
              setBumpInput("");
            }}
            className="text-[11px] text-amber-700 underline-offset-4 hover:underline dark:text-amber-200"
          >
            zurück
          </button>
        </div>
      )}
    </div>
  );
}

/* ── ApprovalCard ─────────────────────────────────────────────────────
 *
 * Sprint B1 — Interactive pause for dangerous tool execution. Renders
 * inline above the running step-list when the server emits
 * `approval_required`. Lawyer chooses one of three actions:
 *   • "Genehmigen" → POST /approve with decision="approved"; tool runs
 *                    with original input
 *   • "Bearbeiten" → expand inline JSON-textarea; lawyer edits the input;
 *                    "Bestätigen" sends decision="modified" + modifiedInput
 *   • "Ablehnen"   → POST /approve with decision="rejected"; tool is
 *                    skipped, model is told "USER_CANCELLED" + asked to
 *                    continue with the next step in the plan
 *
 * All three paths chain into handleApprovalDecision → re-POST main
 * route with resumeFromRunId so the agent loop continues without
 * losing accumulated conversation state.
 */
function ApprovalCard({
  info,
  submitting,
  onDecision,
}: {
  info: ApprovalPauseInfo;
  submitting: boolean;
  onDecision: (
    decision: "approved" | "rejected" | "modified",
    modifiedInput?: Record<string, unknown>,
  ) => void;
}) {
  const [mode, setMode] = useState<"buttons" | "edit">("buttons");
  /* Pretty-print the original input as JSON so the lawyer sees what
     Atlas wants to do. Falls back to "{}" for null / non-object. */
  const initialJson = (() => {
    try {
      return JSON.stringify(info.input ?? {}, null, 2);
    } catch {
      return "{}";
    }
  })();
  const [editJson, setEditJson] = useState<string>(initialJson);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleConfirmEdit = () => {
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(editJson);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("JSON muss ein Objekt sein");
      }
      parsed = raw as Record<string, unknown>;
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Ungültiges JSON");
      return;
    }
    onDecision("modified", parsed);
  };

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-red-800 dark:text-red-200">
        <ShieldAlert size={14} />
        Atlas pausiert — Freigabe erforderlich
      </div>
      <div className="mb-3 space-y-1 text-[12.5px] leading-relaxed text-red-900 dark:text-red-100">
        <div>
          Tool:{" "}
          <span className="font-mono text-[12px] text-red-700 dark:text-red-200/90">
            {info.toolName}
          </span>{" "}
          <span className="text-red-700/80 dark:text-red-200/70">
            (Iteration {info.iteration})
          </span>
        </div>
        <div className="text-red-700 dark:text-red-200/80">
          {info.rationale}
        </div>
      </div>

      {mode === "buttons" ? (
        <>
          {/* Input-preview, scrollable when long. */}
          <pre className="mb-3 max-h-40 overflow-auto rounded-md border border-red-200 bg-white/70 p-2 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-red-500/20 dark:bg-black/20 dark:text-slate-200">
            {initialJson}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onDecision("approved")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
              <Check size={11} />
              Genehmigen
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-40 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-500/20"
            >
              Bearbeiten …
            </button>
            <button
              type="button"
              onClick={() => onDecision("rejected")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-[12px] text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/20"
            >
              <X size={11} />
              Ablehnen
            </button>
            {submitting && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-700 dark:text-red-200/80">
                <Loader2 size={11} className="animate-spin" />
                Sende …
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label className="text-[11.5px] text-red-800 dark:text-red-200">
            Tool-Input (JSON):
          </label>
          <textarea
            value={editJson}
            onChange={(e) => {
              setEditJson(e.target.value);
              if (parseError) setParseError(null);
            }}
            rows={Math.min(12, Math.max(4, editJson.split("\n").length))}
            className="w-full rounded-md border border-red-200 bg-white p-2 font-mono text-[11.5px] leading-relaxed text-slate-900 outline-none dark:border-red-500/20 dark:bg-black/30 dark:text-slate-100"
            autoFocus
            spellCheck={false}
          />
          {parseError && (
            <div className="text-[11px] text-red-700 dark:text-red-300">
              {parseError}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmEdit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
              <Check size={11} />
              Bestätigen
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("buttons");
                setEditJson(initialJson);
                setParseError(null);
              }}
              disabled={submitting}
              className="text-[11px] text-red-700 underline-offset-4 hover:underline disabled:opacity-40 dark:text-red-200"
            >
              zurück
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SuggestedNextCards ───────────────────────────────────────────────
 *
 * Sprint C2 — Smart Workflow-Sequencing. Renders 1-click cards under
 * the run artifacts suggesting the next template to run. Each card
 * shows: template title, the rationale (why this is suggested), and
 * cost-band + estimated duration. Click fires `onPick` which:
 *   1. Sets goal-input to the template's goal-text
 *   2. Sets selectedTemplateId so the next run also gets suggestions
 *   3. Auto-attaches the same mandate (if template needs one)
 *   4. Auto-starts the run (no separate "click to start" needed)
 *
 * Mandate-warning rendered inline when a suggested template needs a
 * mandate but none is currently selected.
 */
function SuggestedNextCards({
  suggestions,
  hasMandate,
  onPick,
}: {
  suggestions: SuggestedWorkflow[];
  hasMandate: boolean;
  onPick: (s: SuggestedWorkflow) => void;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <div className="mb-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        <Sparkles size={10} />
        Nächste logische Schritte ({suggestions.length})
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {suggestions.map((s) => {
          const needsMandateWarn = s.needsMandate && !hasMandate;
          return (
            <button
              key={s.templateId}
              type="button"
              onClick={() => onPick(s)}
              className="group flex flex-col gap-1.5 rounded-md border border-emerald-200 bg-white p-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[12.5px] font-medium text-slate-900 dark:text-slate-100">
                  {s.title}
                </div>
                <ChevronRight
                  size={12}
                  className="mt-0.5 shrink-0 text-emerald-500 transition-transform group-hover:translate-x-0.5"
                />
              </div>
              <div className="text-[11.5px] leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                {s.rationale}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                <span className="capitalize">{s.category}</span>
                <span>·</span>
                <span>~{Math.round(s.estimatedSeconds / 60)} min</span>
                <span>·</span>
                <span>Cost: {s.costBand}</span>
                {s.needsFile && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Paperclip size={9} />
                      Datei nötig
                    </span>
                  </>
                )}
                {needsMandateWarn && (
                  <>
                    <span>·</span>
                    <span className="text-amber-700 dark:text-amber-300">
                      braucht Mandat
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── ForkModal ────────────────────────────────────────────────────────
 *
 * Sprint C1 — Run-Replay with Branching. Modal-overlay shown when the
 * lawyer clicks "Fork ab Iteration N" on a completed run's iteration.
 *
 * For each tool_use in that iteration, renders the original input as
 * a JSON-editable textarea. Submit:
 *   - Diffs each textarea against the original — only changed inputs
 *     are sent in `modifiedToolInputs`
 *   - Validates each as JSON-object (rejects arrays / primitives)
 *   - Calls onSubmit(iter, modifiedToolInputs) which fires handleFork
 *
 * If the lawyer changed nothing and just clicks Submit, an empty map
 * is sent — the server forks at iter N with the parent's original
 * inputs (still useful: same prefix-context but the next iterations
 * may diverge as the model gets fresh attention).
 */
function ForkModal({
  iter,
  steps,
  submitting,
  onClose,
  onSubmit,
}: {
  iter: number;
  steps: StepRecord[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    iter: number,
    modifiedToolInputs: Record<string, Record<string, unknown>>,
  ) => void;
}) {
  /* originalJson is the stable per-tool reference for diffing; editJson
     tracks the live textarea value. Keyed by toolId. */
  const originalJson: Record<string, string> = {};
  for (const s of steps) {
    try {
      originalJson[s.toolId] = JSON.stringify(s.input, null, 2);
    } catch {
      originalJson[s.toolId] = "{}";
    }
  }
  const [editJson, setEditJson] = useState<Record<string, string>>(() => ({
    ...originalJson,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const modified: Record<string, Record<string, unknown>> = {};
    const newErrors: Record<string, string> = {};
    for (const s of steps) {
      const current = editJson[s.toolId] ?? originalJson[s.toolId];
      if (current === originalJson[s.toolId]) continue;
      try {
        const parsed = JSON.parse(current);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          newErrors[s.toolId] = "JSON muss ein Objekt sein";
          continue;
        }
        modified[s.toolId] = parsed as Record<string, unknown>;
      } catch (e) {
        newErrors[s.toolId] =
          e instanceof Error ? e.message : "Ungültiges JSON";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit(iter, modified);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Fork ab Iteration ${iter}`}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border border-violet-200 bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:border-violet-500/30 dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            <FolderInput
              size={14}
              className="text-violet-600 dark:text-violet-300"
            />
            Fork ab Iteration {iter}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
          Atlas startet einen neuen Run mit der Conversation des Parent-Runs bis
          Iteration {iter}. Tools in dieser Iteration werden mit den unten
          editierten Inputs neu ausgeführt; Iterationen {">"}
          {iter} werden frisch geplant.
        </p>
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="text-[12.5px] text-slate-500">
              Keine Tool-Aufrufe in dieser Iteration zum Editieren.
            </div>
          ) : (
            steps.map((s) => (
              <div key={s.toolId} className="space-y-1.5">
                <label className="flex items-center gap-2 text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                  <Cpu size={11} />
                  <span className="font-mono">{s.toolName}</span>
                  {editJson[s.toolId] !== originalJson[s.toolId] && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                      geändert
                    </span>
                  )}
                </label>
                <textarea
                  value={editJson[s.toolId] ?? ""}
                  onChange={(e) => {
                    setEditJson((prev) => ({
                      ...prev,
                      [s.toolId]: e.target.value,
                    }));
                    if (errors[s.toolId]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next[s.toolId];
                        return next;
                      });
                    }
                  }}
                  rows={Math.min(
                    10,
                    Math.max(3, (editJson[s.toolId] ?? "").split("\n").length),
                  )}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11.5px] leading-relaxed text-slate-900 outline-none dark:border-white/[0.08] dark:bg-black/30 dark:text-slate-100"
                  spellCheck={false}
                />
                {errors[s.toolId] && (
                  <div className="text-[11px] text-red-600 dark:text-red-400">
                    {errors[s.toolId]}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          {submitting && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Loader2 size={11} className="animate-spin" />
              Fork startet …
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.10] dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || steps.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
          >
            <FolderInput size={11} />
            Fork starten
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ReasoningPanel ───────────────────────────────────────────────────
 *
 * Renders Atlas's Extended-Thinking output for one iteration. Sits
 * ABOVE the step-cards of that iteration as a collapsible "Warum?"
 * panel. The lawyer sees the model's actual reasoning ("ich suche
 * im Korpus nach NIS2 Art. 21 weil der Mandant essential entity
 * sein könnte und Art. 21 die Pflichten enthält") for full
 * transparency.
 *
 * Streaming behaviour: text streams in via thinking_delta events,
 * we accumulate it per-iteration. The panel auto-expands while
 * the iteration is still running (= text grows), collapses to a
 * 1-line preview once the iteration's steps complete.
 */
function ReasoningPanel({
  iteration,
  text,
}: {
  iteration: number;
  text: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
      >
        <Brain
          size={11}
          className="shrink-0 text-slate-500 dark:text-slate-400"
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Reasoning · Iteration {iteration}
        </span>
        <span className="ml-auto text-[10.5px] text-slate-400 dark:text-slate-500">
          {text.length} Zeichen · {open ? "einklappen" : "anzeigen"}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && (
        <div className="whitespace-pre-wrap border-t border-slate-200 px-3 py-2 text-[12px] leading-relaxed text-slate-700 dark:border-white/[0.05] dark:text-slate-300">
          {text}
        </div>
      )}
    </div>
  );
}
