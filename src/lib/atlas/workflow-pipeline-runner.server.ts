import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 T1.E — Multi-Step Workflow Pipeline Runner.
 *
 * Orchestrates sequential `runChat()` invocations over a workflow's
 * `pipeline: WorkflowStep[]`. Each step's prompt becomes a user-turn
 * in the SAME AtlasChat (chatId carried forward), so the assistant
 * sees the full conversation history of the pipeline.
 *
 * Server-side stream consumption: `runChat()` returns a streaming SSE
 * `ReadableStream<Uint8Array>`. The runner consumes it locally —
 * accumulating `text` deltas + `tool_call_*` events — and only proceeds
 * to step N+1 once step N's stream has closed. No UI; the persisted
 * chat history is the user-visible output via the standard
 * `/atlas/chat/[id]` view.
 *
 * Design notes:
 * - First failure aborts the pipeline (no auto-retry in v1).
 * - No Prisma persistence for pipeline metadata in v1 — the AtlasChat
 *   already records `workflowId`, which is the link key. Future:
 *   `AtlasWorkflowRun` table for step-level analytics.
 * - No external cost beyond what `runChat()` itself bills for —
 *   pipeline is just a sequencer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { runChat } from "./chat-engine.server";
import { getWorkflowById, type WorkflowStep } from "./workflow-library";
import { logger } from "@/lib/logger";

export interface PipelineRunInput {
  workflowId: string;
  userId: string;
  organizationId: string;
  /** Optional mandate-scope. Applied to every step. */
  mandateId?: string | null;
  /** UI locale forwarded to chat-engine for system-prompt hints. */
  language?: "de" | "en" | "fr" | "es";
  /** Override the workflow's default expectedTools-derived toggles. */
  toolToggles?: Record<string, boolean>;
  /** When true, halt the pipeline if a step produces zero text + zero
   *  tool-calls (empty assistant turn). Defaults to true. */
  abortOnEmptyTurn?: boolean;
}

export interface PipelineStepResult {
  stepIndex: number;
  /** First 200 chars of the step prompt (full prompt lives in DB). */
  promptPreview: string;
  /** Full assistant text accumulated from `text` deltas. */
  assistantText: string;
  /** Tool names invoked during this step (in order). */
  toolsUsed: string[];
  /** Wall-clock duration of this step's runChat() + stream consumption. */
  durationMs: number;
  isError: boolean;
  /** Error message when isError = true; otherwise undefined. */
  errorMessage?: string;
}

export interface PipelineRunResult {
  workflowId: string;
  /** AtlasChat ID — same across all steps (carried forward). */
  chatId: string;
  steps: PipelineStepResult[];
  totalDurationMs: number;
  /** True when every step completed without error. */
  isCompleted: boolean;
  /** Set when the runner aborted on a hard error (no workflow / no
   *  pipeline). Distinguishes from step-level failures. */
  aborted?: { code: string; message: string };
}

/* ── Public API ─────────────────────────────────────────────────────── */

export async function runWorkflowPipeline(
  input: PipelineRunInput,
): Promise<PipelineRunResult> {
  const startedAt = Date.now();
  const workflow = getWorkflowById(input.workflowId);

  if (!workflow) {
    return {
      workflowId: input.workflowId,
      chatId: "",
      steps: [],
      totalDurationMs: Date.now() - startedAt,
      isCompleted: false,
      aborted: {
        code: "WORKFLOW_NOT_FOUND",
        message: `Workflow not found: ${input.workflowId}`,
      },
    };
  }

  if (!workflow.pipeline || workflow.pipeline.length === 0) {
    return {
      workflowId: input.workflowId,
      chatId: "",
      steps: [],
      totalDurationMs: Date.now() - startedAt,
      isCompleted: false,
      aborted: {
        code: "NO_PIPELINE",
        message: `Workflow has no pipeline: ${input.workflowId}`,
      },
    };
  }

  const abortOnEmpty = input.abortOnEmptyTurn ?? true;
  let chatId: string | null = null;
  const steps: PipelineStepResult[] = [];

  for (let i = 0; i < workflow.pipeline.length; i++) {
    const step = workflow.pipeline[i];
    const stepStart = Date.now();

    try {
      const result = await runChat({
        chatId,
        userId: input.userId,
        organizationId: input.organizationId,
        mandateId: input.mandateId ?? null,
        userMessage: step.prompt,
        language: input.language ?? "de",
        titleHint: i === 0 ? workflow.name : undefined,
        workflowId: workflow.id,
        toolToggles:
          input.toolToggles ??
          deriveToggles(step.expectedTools, workflow.toolToggles),
      });

      chatId = result.chatId;

      const consumed = await consumeChatStream(result.stream);

      const stepResult: PipelineStepResult = {
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: consumed.assistantText,
        toolsUsed: consumed.toolsUsed,
        durationMs: Date.now() - stepStart,
        isError: consumed.errorMessage !== undefined,
        errorMessage: consumed.errorMessage,
      };
      steps.push(stepResult);

      if (stepResult.isError) {
        logger.warn("[atlas/pipeline] step aborted on stream error", {
          workflowId: workflow.id,
          stepIndex: i,
          error: consumed.errorMessage,
        });
        break;
      }

      if (
        abortOnEmpty &&
        consumed.assistantText.trim().length === 0 &&
        consumed.toolsUsed.length === 0
      ) {
        stepResult.isError = true;
        stepResult.errorMessage = "Empty assistant turn (no text, no tools)";
        logger.warn("[atlas/pipeline] step aborted on empty turn", {
          workflowId: workflow.id,
          stepIndex: i,
        });
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: "",
        toolsUsed: [],
        durationMs: Date.now() - stepStart,
        isError: true,
        errorMessage: msg,
      });
      logger.error("[atlas/pipeline] step threw", {
        workflowId: workflow.id,
        stepIndex: i,
        error: msg,
      });
      break;
    }
  }

  const isCompleted =
    steps.length === workflow.pipeline.length && steps.every((s) => !s.isError);

  return {
    workflowId: workflow.id,
    chatId: chatId ?? "",
    steps,
    totalDurationMs: Date.now() - startedAt,
    isCompleted,
  };
}

/* ── Stream consumer ────────────────────────────────────────────────── */

interface ConsumedStream {
  assistantText: string;
  toolsUsed: string[];
  /** Set when the stream emitted an SSE `error` event. */
  errorMessage?: string;
}

export async function consumeChatStream(
  stream: ReadableStream<Uint8Array>,
): Promise<ConsumedStream> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";
  const toolsUsed: string[] = [];
  let errorMessage: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = drainEvents(buffer, (evt) => {
        if (evt.type === "text" && typeof evt.delta === "string") {
          assistantText += evt.delta;
        } else if (
          (evt.type === "tool_call_start" || evt.type === "tool_use") &&
          typeof evt.name === "string"
        ) {
          toolsUsed.push(evt.name);
        } else if (evt.type === "error" && typeof evt.message === "string") {
          errorMessage = evt.message;
        }
      });
    }
    // Flush trailing buffer (any final event without \n\n boundary).
    if (buffer.length > 0) {
      drainEvents(buffer + "\n\n", (evt) => {
        if (evt.type === "text" && typeof evt.delta === "string") {
          assistantText += evt.delta;
        } else if (
          (evt.type === "tool_call_start" || evt.type === "tool_use") &&
          typeof evt.name === "string"
        ) {
          toolsUsed.push(evt.name);
        } else if (evt.type === "error" && typeof evt.message === "string") {
          errorMessage = evt.message;
        }
      });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  return { assistantText, toolsUsed, errorMessage };
}

/**
 * Splits buffered SSE bytes into discrete events (\n\n delimited),
 * parses each `data: ...` payload as JSON, and dispatches to `onEvent`.
 * Returns the remaining (partial) buffer to feed back in on the next
 * iteration.
 */
function drainEvents(
  buffer: string,
  onEvent: (evt: Record<string, unknown>) => void,
): string {
  const parts = buffer.split("\n\n");
  const tail = parts.pop() ?? "";
  for (const part of parts) {
    // Each part may contain comment lines (`: keepalive`) and one
    // `data: <json>` line. Find the data line and parse it.
    for (const line of part.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload.length === 0) continue;
      try {
        const json = JSON.parse(payload);
        if (json && typeof json === "object") {
          onEvent(json as Record<string, unknown>);
        }
      } catch {
        // Malformed event — ignore. The chat-engine never emits this
        // in practice but we don't want a single bad line to break
        // the whole pipeline.
      }
    }
  }
  return tail;
}

/* ── Toggle derivation ──────────────────────────────────────────────── */

/**
 * Maps a step's expected-tool names into the bundle-level toggle map
 * `runChat()` expects. Conservative: when in doubt, enable. The chat-
 * engine's defaults are all-on except `documents` and `web` (paid /
 * external surface area), so we mirror that and only flip `web` on
 * when an expected tool requires it.
 */
function deriveToggles(
  expectedTools: string[] | undefined,
  workflowOverride: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const base: Record<string, boolean> = {
    korpus: true,
    compliance: true,
    comparison: true,
    drafting: true,
    validity: true,
    documents: false,
    web: false,
    workflow: true,
    mandate: true,
  };

  if (workflowOverride) {
    return { ...base, ...workflowOverride };
  }

  const tools = expectedTools ?? [];
  for (const t of tools) {
    if (
      t === "search_eurlex" ||
      t === "search_courtlistener" ||
      t === "web_search" ||
      t === "fetch_url"
    ) {
      base.web = true;
    }
    if (
      t === "get_mandate_files" ||
      t === "read_mandate_file" ||
      t === "summarize_mandate_file" ||
      t === "ocr_mandate_file" ||
      t === "extract_mandate_file_clauses"
    ) {
      base.documents = true;
    }
  }
  return base;
}
