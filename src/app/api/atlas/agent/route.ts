/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Mode API.
 *
 *   POST /api/atlas/agent — stream a multi-step agent run (SSE).
 *
 * Differs from /api/atlas/chat in three ways:
 *   1. System-prompt is "PLAN + EXECUTE autonomously" instead of
 *      "respond to the user's question"
 *   2. MAX_TOOL_ITERATIONS is higher (15 vs 10) — complex workflows
 *      can chain corpus-search → compliance-classify → draft → set-
 *      deadline → save-as-mandate-file across many turns
 *   3. The streamed events are the same SSE shape — the agent UI
 *      simply renders them as step-cards instead of chat-bubbles
 *
 * Reuses chat-engine.server.ts as much as possible — the actual
 * tool-use loop is identical. We DON'T persist the agent run as
 * an AtlasChat (yet — that's a Tier-2 follow-up); the SSE stream
 * is the canonical output.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { extractCitations } from "@/lib/atlas/citation-extractor.server";
import { checkBudget } from "@/lib/atlas/agent/cost-budget";
import {
  loadMandateMemoryForPrompt,
  updateMandateMemory,
} from "@/lib/atlas/agent/memory-summarizer.server";
import {
  requiresApproval,
  approvalRationale,
  type ApprovalGate,
} from "@/lib/atlas/agent/approval-policy";
import { suggestNextWorkflows } from "@/lib/atlas/agent/workflow-suggester.server";
import { delegateSubtasks } from "@/lib/atlas/agent/sub-agent-orchestrator.server";
/* AUDIT-FIX Q05 (2026-05-17): shared mandate-context loader (was
   duplicated verbatim in chat-engine.server.ts). */
import {
  loadMandateContext,
  type ResolvedMandateContext,
} from "@/lib/atlas/mandate-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

/* AUDIT-FIX Q07 (2026-05-17): pricing constants + estimateCostUsd
   moved to shared @/lib/atlas/cost-estimator to dedup with chat-engine. */
import { estimateCostUsd } from "@/lib/atlas/cost-estimator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_TOOL_ITERATIONS = 15;
const MAX_TOKENS = 6000;
/* Extended Thinking REQUIRES temperature=1 per Anthropic spec.
   Agent-mode benefits from thinking transparency (lawyer wants
   to see WHY each step was chosen) so we always enable it. */
const TEMPERATURE = 1;
const THINKING_BUDGET = 4000;

const PostBody = z.object({
  goal: z.string().min(10).max(2_000),
  mandateId: z.string().cuid().nullable().optional(),
  /* Sprint A1 — lawyer-set max cost for the run (USD). Capped at
     $100/run to prevent a runaway / malicious client from declaring
     a $10k budget. Null/undefined = no budget (legacy behaviour). */
  budgetUsd: z.number().positive().max(100).nullable().optional(),
  /* Sprint B1 — when present, the request is a CONTINUATION of an
     existing AtlasAgentRun that paused for approval. The route loads
     conversationState + the recorded approvalGates decision and
     resumes the agent-loop from where it left off. Auth-gated to the
     run's userId + organizationId. */
  resumeFromRunId: z.string().cuid().nullable().optional(),
  /* Sprint C2 — when the run was launched from a curated template,
     pass its id here. Persisted on AtlasAgentRun.templateId and used
     at run-end to compute the `suggested_next` SSE event. Free-form
     string capped at 100 chars (template-ids are short kebab-case);
     missing/null = run not from a template. */
  templateId: z.string().min(1).max(100).nullable().optional(),
  /* Sprint C1 — Run-Replay with Branching. When `forkFromRunId` is
     set, the route loads the parent run's persisted conversationState,
     truncates the conversation to iteration N's assistant message
     (inclusive), applies `modifiedToolInputs` to that message's
     tool_use blocks, then continues the loop from iter N's tool
     execution. Creates a NEW AtlasAgentRun row with
     parentRunId + forkedFromStep set. Mutually exclusive with
     `resumeFromRunId` — passing both rejects. */
  forkFromRunId: z.string().cuid().nullable().optional(),
  forkFromIteration: z.number().int().min(1).max(15).nullable().optional(),
  /* Map of tool_use_id → new input object. Only the listed tool_uses
     have their inputs swapped; unlisted ones run with their original
     parent-run input. Limited to plain objects per Zod v4 record
     signature (keySchema, valueSchema).

     AUDIT-FIX M07 (2026-05-17): bound the body via JSON-string-size
     check in the POST handler (Zod can't enforce deep size limits on
     z.unknown). 256 KB total cap prevents the AtlasAgentRun.conversation
     State JSON-column from being inflated via a deeply-nested
     modifiedToolInputs payload. */
  modifiedToolInputs: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .refine((v) => v === undefined || JSON.stringify(v).length <= 256 * 1024, {
      message: "modifiedToolInputs payload exceeds 256 KB cap",
    }),
});

/* AUDIT-FIX L18 (2026-05-15): strip control chars + ANSI escape
   sequences from any user-supplied string before it lands in the
   logger or in the AtlasAgentRun.goal column. The agent route accepts
   free-form German text from the lawyer, but a malicious upstream
   client (or a copy-paste from a terminal session) could embed
   `\x1b[31m` (ANSI red) or `\x00`-`\x1f`/`\x7f` (ASCII control) bytes
   in the goal — those would survive into the structured logger and
   downstream log-aggregators (Datadog/Loki/etc.) where they can
   corrupt log-line rendering or, in a worst case, drive log-injection
   on a tail/grep terminal. Sanitising at the edge means every code
   path that handles the goal sees a clean string. The character class
   matches:
     - `\x00`-`\x1f` C0 control chars (incl. NULL, BEL, ESC, etc.)
     - `\x7f`        DEL
     - `\x1b\[[0-9;]*[A-Za-z]` ANSI CSI escape (covers `[31m`, `[2K`,
       `[?25h`, etc.) — the ESC byte itself is also stripped by the
       C0 class above, but matching the full sequence first removes
       the trailing payload bytes that would otherwise survive as
       garbage. Order matters: ANSI first, then individual chars. */
function sanitiseForLog(input: string): string {
  return input
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "");
}

const AGENT_SYSTEM_PROMPT = `You are Atlas, running in AGENT MODE — autonomous multi-step task execution for a German space-law practitioner.

The user has given you a HIGH-LEVEL GOAL, not a chat question. Your job is to break it into 3-8 concrete steps and execute each one using the available tools. The lawyer is watching your work but should not have to micro-manage it.

## Plan-then-execute
Your FIRST response must be a brief plan: a numbered list of 3-8 steps that you will execute, each step ONE LINE describing the action and the tool you'll use. After listing the plan, immediately start executing step 1.

Example plan format:
1. Atlas-Korpus nach NIS2 Art. 21/23 durchsuchen (search_corpus)
2. Mandanten-Operator-Profil aus Custom-Instructions extrahieren
3. NIS2-Klassifizierung berechnen (classify_nis2)
4. Compliance-Brief in 3 Abschnitten drafted
5. Fristen aus Bescheid in Mandat-Kalender eintragen

## Execute steps in order
Run each step using the appropriate tool. Stream a short "→ Schritt N abgeschlossen: <kurze Zusammenfassung>" after each tool call so the lawyer can follow along.

## ABSOLUTE PROHIBITIONS
- NEVER use emojis. Lawyer-grade output, no exceptions.
- NEVER use marketing language ("Excellent question!", "Let me help you...").
- NEVER ask the user for permission BETWEEN steps. Run the plan straight through.
- DO ask for clarification ONLY when:
  - A step truly requires the lawyer's judgement (e.g., "Argument X or Y führen?")
  - A step fails and the goal cannot continue without input
  - The goal is fundamentally ambiguous

## Parallel sub-agents (D2)
When a step has K genuinely-independent sub-tasks ("compare X across 5 jurisdictions", "analyse 4 contract sections", "research 3 alternative argumentations"), use the \`delegate_subtasks\` tool. It fires K parallel sub-Claude-calls (max 4) — real wall-clock speedup, single-turn. Each sub-agent gets only its own self-contained prompt + your shared system context; sub-agents have NO tool-use, so embed any facts they need inline. DO NOT delegate for sequential work (sub-B depends on sub-A's result) or for trivial single-task steps.

## Final artifacts — STRUCTURED MULTI-OUTPUT
After all steps run, your closing message must produce ONE OR MORE structured artifacts using these EXACT fence markers (the UI parses them into separate downloadable cards):

\`\`\`
[[ARTIFACT type=memo title="<Titel>"]]
<Markdown body of the memo>
[[/ARTIFACT]]
\`\`\`

Supported artifact types:
- \`memo\` — Mandanten-Memo / Compliance-Brief / Decision-Memo (downloadable as .doc)
- \`schriftsatz\` — Schriftsatz / Klage / Widerspruch (downloadable as .doc, gets PRIVILEGED stamp)
- \`email\` — Email-Draft for outbound communication (with subject + body)
- \`checklist\` — Action-item list (renders as checkboxes)
- \`summary\` — Short summary of what was done (always include ONE summary artifact at the end)

A typical run produces 1-4 artifacts. Example sequence for "NIS2 + Compliance-Brief":

\`\`\`
[[ARTIFACT type=memo title="NIS2-Klassifizierung Astralink GmbH"]]
## Klassifizierung
Der Mandant qualifiziert als essential entity nach Annex II...
[ATLAS:EU-NIS2-2022-art21]

## Pflichten
- ...
[[/ARTIFACT]]

[[ARTIFACT type=checklist title="Roadmap NIS2-Compliance"]]
- [ ] Registrierung beim BSI bis 17.04.2025
- [ ] Risikomanagement-Plan etablieren
- [ ] ...
[[/ARTIFACT]]

[[ARTIFACT type=summary title="Was Atlas gemacht hat"]]
3 Schritte ausgeführt: Korpus-Recherche, Klassifizierung, Brief-Drafting. Mandant ist essential entity, Compliance-Roadmap mit 3 Fristen erstellt.
[[/ARTIFACT]]
\`\`\`

Rules for artifacts:
- Each artifact has type + title in the opening fence
- Use ONE artifact per logical deliverable (don't stuff everything into one memo)
- Inline-citations [ATLAS:<source-id>] inside artifact bodies are preserved
- DO NOT add text OUTSIDE the artifact fences after all steps complete — the artifacts ARE the response

## Tone
- Concise, precise, lawyer-grade
- Skip pleasantries; answer the question
- Bullet structures for enumerations
- German output by default

## Mandate context
When a mandate is in scope, the system-prompt suffix will inject jurisdiction / operator-type / primary-authority / custom-instructions. Use those to make your steps mandate-specific (e.g. use the correct BNetzA contact if jurisdiction is DE).`;

/* AUDIT-FIX Q05 (2026-05-17): ResolvedMandateContext + loadMandateContext
   moved to shared @/lib/atlas/mandate-context to dedup with chat-engine.
   Imports added at top of file. */

function buildSystemPrompt(
  mandate: ResolvedMandateContext | null,
  /* Sprint B2 — Cross-Run-Memory for the mandate. Pre-pended to the
     system prompt so the agent knows what happened in prior runs of
     this same mandate. Null when there is no mandate, no memory, and
     no prior runs at all. */
  memory: string | null,
): string {
  if (!mandate && !memory) return AGENT_SYSTEM_PROMPT;
  const lines: string[] = [AGENT_SYSTEM_PROMPT];
  if (mandate) {
    lines.push("", "## Active mandate");
    lines.push(`- ID: ${mandate.id}`);
    lines.push(`- Name: ${mandate.name}`);
    if (mandate.clientName) lines.push(`- Client: ${mandate.clientName}`);
    if (mandate.jurisdiction)
      lines.push(`- Jurisdiction: ${mandate.jurisdiction}`);
    if (mandate.operatorType) lines.push(`- Operator: ${mandate.operatorType}`);
    if (mandate.primaryAuthority)
      lines.push(`- Behörde: ${mandate.primaryAuthority}`);
    if (mandate.customInstructions) {
      lines.push("");
      lines.push("### Custom instructions");
      lines.push(mandate.customInstructions);
    }
  }
  /* Sprint B2 — Cross-Run-Memory block. Sits AFTER the mandate-context
     so the agent first internalises who/what the mandate is, then sees
     what's been done so far. Cap relies on the loader (4000 chars). */
  if (memory) {
    lines.push("");
    lines.push("## Vorherige Agent-Aktivität in diesem Mandat");
    lines.push(memory);
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* astra_chat tier — agents are heavier than chat but the user
     starts them deliberately, not bulk. */
  const rl = await checkRateLimit(
    "astra_chat",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }
  const anthropic = setup.client;
  const model = setup.model;

  const mandate = parsed.data.mandateId
    ? await loadMandateContext(
        parsed.data.mandateId,
        atlas.userId,
        atlas.organizationId,
      )
    : null;
  if (parsed.data.mandateId && !mandate) {
    return NextResponse.json(
      { error: "Mandate not found or access denied" },
      { status: 404 },
    );
  }

  /* Sprint B2 — Cross-Run-Memory. Load the rolling summary (or cold-
     start fallback) BEFORE building the system-prompt so it can be
     pre-pended. Returns null for mandates with zero prior runs OR
     when no mandateId is set at all. The helper is org-scoped and
     fails soft (logs + returns null on error). */
  const mandateMemory = parsed.data.mandateId
    ? await loadMandateMemoryForPrompt(
        parsed.data.mandateId,
        atlas.organizationId,
      )
    : null;

  const systemPrompt = buildSystemPrompt(mandate, mandateMemory);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      /* Sprint #3 — persist the agent-run to AtlasAgentRun. We
         create the row IMMEDIATELY at start so it shows up in the
         history page even if the run aborts mid-flight. Updates
         flow at run-end with the captured steps / artifacts / etc. */
      let runId: string | null = null;
      /* AUDIT-FIX L18 (2026-05-15): canonicalise the goal once for
         every "log / persist / SSE-replay" path. The model itself
         continues to see the raw `parsed.data.goal` (Anthropic's
         tokenizer handles control chars fine and we want the model
         to read what the lawyer actually typed); only the surfaces
         that hit storage / observability / DOM use the sanitised
         copy. */
      const goalForLog = sanitiseForLog(parsed.data.goal);

      /* Sprint B1 — runtime state vars (declared BEFORE the
         resume-branch so it can populate them from persisted state). */
      let conversation: Anthropic.MessageParam[] = [
        { role: "user", content: parsed.data.goal },
      ];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCacheCreationTokens = 0;
      let totalCacheReadTokens = 0;
      let toolsUsed: string[] = [];
      /* Sprint E3 — Sub-Agent token sub-tracking. Accumulates IN
         PARALLEL to totalInputTokens/totalOutputTokens (which stay
         cumulative across main + sub). Powers Live-Counter
         "$main · $sub-agents" split. 0 for runs without delegate_subtasks. */
      let subAgentInputTokens = 0;
      let subAgentOutputTokens = 0;
      let textBuffer = "";
      let persistedSteps: Array<{
        iteration: number;
        toolId: string;
        toolName: string;
        input: Record<string, unknown>;
        durationMs?: number;
        isError?: boolean;
        summary?: string;
      }> = [];
      let persistedReasoning: Record<number, string> = {};
      /* Sprint A1 — flag set when we paused for budget. Skips the
         post-loop "complete" / "done" persist + emits a budget_pause
         SSE event instead. */
      let pausedForBudget = false;
      /* Sprint B1 — parallel flag for approval-pauses. */
      let pausedForApproval = false;
      /* Sprint B1 — when true, the while-loop's first iteration uses
         the LAST assistant message from the restored `conversation`
         instead of calling Anthropic. Used by the resume-path to
         continue execution from where the run was paused without
         re-fetching the model's response (which would duplicate
         token-cost + produce a different response). */
      let skipNextAnthropicCall = false;
      /* Sprint B1 — local snapshot of the run's approvalGates audit
         trail. Fresh runs start empty; resumed runs load from DB. The
         pre-execution check + execute-with-decision logic both read
         this. Any new pauses APPEND to this array, persisted back. */
      let currentApprovalGates: ApprovalGate[] = [];
      /* Sprint B1 — starting iteration counter. Fresh runs at 0;
         resumed runs continue from where they paused. */
      let initialIter = 0;

      /* ╔═══════════════════════════════════════════════════════════╗
         ║ Sprint C1 — Fork-path branch                              ║
         ║ When `forkFromRunId` + `forkFromIteration` are set, load  ║
         ║ the parent run's persisted conversationState, truncate    ║
         ║ to keep messages up to AND INCLUDING iter N's assistant   ║
         ║ message, apply `modifiedToolInputs` to that message's     ║
         ║ tool_use blocks, then CREATE A NEW AtlasAgentRun row      ║
         ║ (with parentRunId + forkedFromStep set) and skip the      ║
         ║ first Anthropic call (the model's planning response is    ║
         ║ already in conv from the parent). Same fork-cannot-also-  ║
         ║ -resume guard ensures the two flows don't conflict.       ║
         ╚═══════════════════════════════════════════════════════════╝ */
      if (parsed.data.forkFromRunId && parsed.data.resumeFromRunId) {
        send({
          type: "error",
          message: "Cannot fork and resume in the same request",
        });
        controller.close();
        return;
      }
      if (parsed.data.forkFromRunId) {
        if (
          !parsed.data.forkFromIteration ||
          parsed.data.forkFromIteration < 1
        ) {
          send({
            type: "error",
            message: "forkFromIteration is required when forking",
          });
          controller.close();
          return;
        }
        try {
          const parentRun = await prisma.atlasAgentRun.findFirst({
            where: {
              id: parsed.data.forkFromRunId,
              userId: atlas.userId,
              organizationId: atlas.organizationId,
            },
            select: {
              id: true,
              status: true,
              conversationState: true,
              templateId: true,
              budgetUsd: true,
              goal: true,
              iterations: true,
            },
          });
          if (!parentRun) {
            send({ type: "error", message: "Parent run not found" });
            controller.close();
            return;
          }
          if (parentRun.status !== "complete") {
            send({
              type: "error",
              message: "Can only fork from completed runs",
            });
            controller.close();
            return;
          }
          const parentState = parentRun.conversationState as {
            conversation: Anthropic.MessageParam[];
            totalInputTokens: number;
            totalOutputTokens: number;
            totalCacheCreationTokens: number;
            totalCacheReadTokens: number;
            toolsUsed: string[];
            textBuffer: string;
            persistedSteps: typeof persistedSteps;
            persistedReasoning: Record<number, string>;
            iter: number;
          } | null;
          if (!parentState) {
            send({
              type: "error",
              message:
                "Parent run has no conversationState — cannot fork (pre-C1 run)",
            });
            controller.close();
            return;
          }
          const forkIter = parsed.data.forkFromIteration;
          if (forkIter > parentState.iter) {
            send({
              type: "error",
              message: `forkFromIteration ${forkIter} exceeds parent's ${parentState.iter} iterations`,
            });
            controller.close();
            return;
          }
          /* Slice the conversation to keep [0..2*forkIter-1] — i.e.
             everything UP TO AND INCLUDING iter N's assistant message,
             but NOT its tool_results (which we'll re-generate with
             modified inputs). */
          const cutoffIndex = 2 * forkIter - 1;
          const slicedConversation = parentState.conversation.slice(
            0,
            cutoffIndex + 1,
          );
          if (slicedConversation.length < cutoffIndex + 1) {
            send({
              type: "error",
              message: `Parent conversation truncated below fork-point (got ${slicedConversation.length} msgs, need ${cutoffIndex + 1})`,
            });
            controller.close();
            return;
          }
          /* Find iter N's assistant message and apply modifiedToolInputs
             to its tool_use blocks. We DEEP-CLONE first so we don't
             mutate the parent's persisted state via shared object
             references. */
          const lastMsg = JSON.parse(
            JSON.stringify(slicedConversation[slicedConversation.length - 1]),
          ) as Anthropic.MessageParam;
          if (lastMsg.role !== "assistant" || !Array.isArray(lastMsg.content)) {
            send({
              type: "error",
              message:
                "Fork-point conversation message is not an assistant tool_use",
            });
            controller.close();
            return;
          }
          const modifiedInputs = parsed.data.modifiedToolInputs ?? {};
          let modifiedCount = 0;
          for (const block of lastMsg.content) {
            if (
              typeof block === "object" &&
              block !== null &&
              "type" in block &&
              (block as { type: string }).type === "tool_use" &&
              "id" in block
            ) {
              const blockId = (block as { id: string }).id;
              if (modifiedInputs[blockId]) {
                (block as { input: Record<string, unknown> }).input =
                  modifiedInputs[blockId];
                modifiedCount++;
              }
            }
          }
          slicedConversation[slicedConversation.length - 1] = lastMsg;
          /* Truncate persistedSteps to remove anything from iter N
             onwards (we're about to re-execute those tools with
             potentially-modified inputs). */
          const slicedSteps = parentState.persistedSteps.filter(
            (s) => s.iteration < forkIter,
          );
          const slicedReasoning: Record<number, string> = {};
          for (const [k, v] of Object.entries(parentState.persistedReasoning)) {
            if (Number(k) < forkIter) slicedReasoning[Number(k)] = v;
          }
          /* Create the NEW AtlasAgentRun row, linked to parent. */
          const newRunRow = await prisma.atlasAgentRun.create({
            data: {
              userId: atlas.userId,
              organizationId: atlas.organizationId,
              mandateId: parsed.data.mandateId ?? null,
              goal: sanitiseForLog(parsed.data.goal).slice(0, 2000),
              status: "running",
              budgetUsd: parsed.data.budgetUsd ?? null,
              pausedForBudget: false,
              templateId: parsed.data.templateId ?? parentRun.templateId,
              /* Sprint C1 lineage. */
              parentRunId: parentRun.id,
              forkedFromStep: forkIter,
            },
            select: { id: true },
          });
          /* Restore runtime state from the sliced parent state. We
             intentionally KEEP the parent's accumulated token counters
             — the lawyer sees the fork as a continuation of cost, not
             a fresh $0 start. (Could be argued either way; this
             matches the "saves tokens by skipping replay" framing.) */
          runId = newRunRow.id;
          conversation = slicedConversation;
          totalInputTokens = parentState.totalInputTokens;
          totalOutputTokens = parentState.totalOutputTokens;
          totalCacheCreationTokens = parentState.totalCacheCreationTokens;
          totalCacheReadTokens = parentState.totalCacheReadTokens;
          toolsUsed = parentState.toolsUsed;
          textBuffer = parentState.textBuffer;
          persistedSteps = slicedSteps;
          persistedReasoning = slicedReasoning;
          initialIter = forkIter - 1;
          /* Same skip-next-Anthropic-call trick as the resume-path —
             the assistant message for iter N is already in conv;
             the while-loop should jump straight to tool execution. */
          skipNextAnthropicCall = true;
          send({
            type: "run_forked",
            runId: newRunRow.id,
            parentRunId: parentRun.id,
            forkedFromStep: forkIter,
            modifiedToolCount: modifiedCount,
          });
          logger.info("[atlas/agent] forked run", {
            userId: atlas.userId,
            runId: newRunRow.id,
            parentRunId: parentRun.id,
            forkedFromStep: forkIter,
            modifiedToolCount: modifiedCount,
          });
        } catch (err) {
          logger.error("[atlas/agent] fork failed", {
            userId: atlas.userId,
            parentRunId: parsed.data.forkFromRunId,
            error: err instanceof Error ? err.message : String(err),
          });
          send({
            type: "error",
            message: getSafeErrorMessage(err, "Fork failed"),
          });
          controller.close();
          return;
        }
      } else if (parsed.data.resumeFromRunId) {
        try {
          const priorRun = await prisma.atlasAgentRun.findFirst({
            where: {
              id: parsed.data.resumeFromRunId,
              userId: atlas.userId,
              organizationId: atlas.organizationId,
            },
            select: {
              id: true,
              status: true,
              pausedForApproval: true,
              conversationState: true,
              approvalGates: true,
              iterations: true,
              budgetUsd: true,
            },
          });
          if (!priorRun) {
            send({ type: "error", message: "Run not found" });
            controller.close();
            return;
          }
          if (
            !priorRun.pausedForApproval ||
            priorRun.status !== "awaiting_approval"
          ) {
            send({
              type: "error",
              message: "Run is not paused for approval",
            });
            controller.close();
            return;
          }
          const state = priorRun.conversationState as {
            conversation: Anthropic.MessageParam[];
            totalInputTokens: number;
            totalOutputTokens: number;
            totalCacheCreationTokens: number;
            totalCacheReadTokens: number;
            toolsUsed: string[];
            textBuffer: string;
            persistedSteps: typeof persistedSteps;
            persistedReasoning: Record<number, string>;
            iter: number;
            pendingToolUseId?: string; // backwards-compat with pre-E2 snapshots
            pendingToolUseIds?: string[];
          } | null;
          if (!state) {
            send({
              type: "error",
              message: "Conversation state missing — cannot resume",
            });
            controller.close();
            return;
          }
          /* Validate that ALL pending tools now have recorded decisions
             in approvalGates. Without it, the run can't make progress.
             Sprint E2: support both old scalar (pre-E2) and new array. */
          const gates = Array.isArray(priorRun.approvalGates)
            ? (priorRun.approvalGates as unknown as ApprovalGate[])
            : [];
          const pendingIds =
            (state as { pendingToolUseIds?: string[] }).pendingToolUseIds ??
            (state.pendingToolUseId ? [state.pendingToolUseId] : []);
          const allDecided =
            pendingIds.length > 0 &&
            pendingIds.every((id: string) =>
              gates.some((g) => g.toolUseId === id && g.decision !== null),
            );
          if (!allDecided) {
            send({
              type: "error",
              message: "No approval decision recorded — POST /approve first",
            });
            controller.close();
            return;
          }
          /* Restore everything. */
          runId = priorRun.id;
          conversation = state.conversation;
          totalInputTokens = state.totalInputTokens;
          totalOutputTokens = state.totalOutputTokens;
          totalCacheCreationTokens = state.totalCacheCreationTokens;
          totalCacheReadTokens = state.totalCacheReadTokens;
          toolsUsed = state.toolsUsed;
          textBuffer = state.textBuffer;
          persistedSteps = state.persistedSteps;
          persistedReasoning = state.persistedReasoning;
          initialIter = state.iter;
          currentApprovalGates = gates;
          skipNextAnthropicCall = true;
          /* Flip status back to running + clear pause flags. The
             conversationState is wiped because the resumed loop
             will re-emit a new pause (or completion) and we don't
             want a stale snapshot to look like the live state. */
          await prisma.atlasAgentRun.update({
            where: { id: runId },
            data: {
              status: "running",
              pausedForApproval: false,
              conversationState: undefined,
            },
          });
          send({
            type: "run_resumed",
            runId,
            fromIteration: initialIter,
            decisionsApplied: pendingIds.length,
          });
          logger.info("[atlas/agent] resumed from approval", {
            userId: atlas.userId,
            runId,
            fromIteration: initialIter,
            decisionsApplied: pendingIds.length,
          });
        } catch (err) {
          logger.error("[atlas/agent] resume failed", {
            userId: atlas.userId,
            runId: parsed.data.resumeFromRunId,
            error: err instanceof Error ? err.message : String(err),
          });
          send({
            type: "error",
            message: getSafeErrorMessage(err, "Resume failed"),
          });
          controller.close();
          return;
        }
      } else {
        /* ─── Fresh-start path (existing behaviour) ─── */
        try {
          const runRow = await prisma.atlasAgentRun.create({
            data: {
              userId: atlas.userId,
              organizationId: atlas.organizationId,
              mandateId: parsed.data.mandateId ?? null,
              goal: goalForLog.slice(0, 2000),
              status: "running",
              /* Sprint A1 — persist the lawyer-set budget alongside
                 the run so the resume-endpoint can read it without
                 re-trusting any client-supplied number. Null when no
                 budget chosen. */
              budgetUsd: parsed.data.budgetUsd ?? null,
              pausedForBudget: false,
              /* Sprint C2 — persist the template-id when launched from
                 a curated workflow so the run-end suggester can compute
                 the `suggested_next` follow-ups + history view can
                 group runs by template. */
              templateId: parsed.data.templateId ?? null,
            },
            select: { id: true },
          });
          runId = runRow.id;
          send({
            type: "run_started",
            goal: goalForLog,
            runId,
            budgetUsd: parsed.data.budgetUsd ?? null,
          });
        } catch (err) {
          /* Persistence is best-effort — if the DB write fails,
             continue with the run anyway (lawyer still gets the
             result, just no history entry). */
          logger.warn("[atlas/agent] failed to persist run-row", {
            userId: atlas.userId,
            error: err instanceof Error ? err.message : String(err),
          });
          send({ type: "run_started", goal: goalForLog });
        }
      }

      try {
        let iter = initialIter;
        while (iter < MAX_TOOL_ITERATIONS) {
          /* Sprint B1 — Resume-path branch. On the very FIRST loop
             iteration after a resume, we already have the model's
             assistant message in `conversation` (it was persisted
             before the pause). Skip the Anthropic call + cost check
             this round and jump straight to "execute tools using
             the recorded decisions". The flag is unset after one
             use so subsequent iterations are normal. */
          let resumedFinalMessage: Anthropic.Message | null = null;
          if (skipNextAnthropicCall) {
            skipNextAnthropicCall = false;
            const lastMsg = conversation[conversation.length - 1];
            if (
              !lastMsg ||
              lastMsg.role !== "assistant" ||
              !Array.isArray(lastMsg.content)
            ) {
              throw new Error(
                "Resume failed: last conversation message is not an assistant tool_use",
              );
            }
            /* Synthesise a minimal Anthropic.Message-shape for the
               downstream code that expects a `finalMessage`. We only
               need .content + .stop_reason — usage was already
               counted at the pre-pause iteration. */
            resumedFinalMessage = {
              id: "resumed",
              type: "message",
              role: "assistant",
              model: model,
              content: lastMsg.content as Anthropic.ContentBlock[],
              stop_reason: "tool_use",
              stop_sequence: null,
              usage: {
                input_tokens: 0,
                output_tokens: 0,
                cache_creation_input_tokens: null,
                cache_read_input_tokens: null,
                service_tier: null,
                cache_creation: null,
                server_tool_use: null,
              },
            } as unknown as Anthropic.Message;
          }
          /* Sprint A1 — Cost-Budget pre-iteration check.
             ─────────────────────────────────────────────────────────
             Compute the running cost from accumulated tokens (cache-
             aware), then ask the helper whether we'd exceed budget on
             the NEXT iteration. If yes, persist the pause-state and
             close the stream — the lawyer must POST to /resume to
             continue. Skipped on the resume-path's first iteration
             since we're not making a new Anthropic call this round. */
          if (
            !resumedFinalMessage &&
            parsed.data.budgetUsd &&
            parsed.data.budgetUsd > 0
          ) {
            const currentCostUsd = estimateCostUsd(
              totalInputTokens,
              totalOutputTokens,
              totalCacheCreationTokens,
              totalCacheReadTokens,
            );
            const check = checkBudget({
              currentCostUsd,
              budgetUsd: parsed.data.budgetUsd,
              iterationsCompleted: iter,
              beforeNextIteration: true,
            });
            if (check.shouldPause) {
              pausedForBudget = true;
              if (runId) {
                try {
                  await prisma.atlasAgentRun.update({
                    where: { id: runId },
                    data: {
                      status: "paused",
                      pausedForBudget: true,
                      iterations: iter,
                      steps: persistedSteps as unknown as object,
                      reasoning: persistedReasoning as unknown as object,
                      inputTokens: totalInputTokens,
                      outputTokens: totalOutputTokens,
                      subAgentInputTokens,
                      subAgentOutputTokens,
                      costUsd: currentCostUsd,
                    },
                  });
                } catch (err) {
                  logger.warn("[atlas/agent] failed to persist paused-state", {
                    runId,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }
              send({
                type: "budget_pause",
                runId,
                currentCost: check.currentCost,
                budget: check.budget,
                etaCost: check.etaCost,
                remainingSteps: MAX_TOOL_ITERATIONS - iter,
                iterationsCompleted: iter,
              });
              logger.info("[atlas/agent] paused for budget", {
                userId: atlas.userId,
                runId,
                currentCost: check.currentCost,
                budget: check.budget,
                etaCost: check.etaCost,
              });
              break;
            }
          }
          /* Sprint B1 — On resume, finalMessage comes from the
             persisted assistant message (synthesised above). Skip
             iter++ + the Anthropic call + the cost-progress emit,
             since those already happened in the pre-pause iteration. */
          let finalMessage: Anthropic.Message;
          if (resumedFinalMessage) {
            finalMessage = resumedFinalMessage;
          } else {
            iter++;

            /* Prompt-caching same strategy as chat-engine — sys + tools
               cached so multi-turn agent runs don't pay full input
               cost on every iteration. */
            const cachedTools: Anthropic.Tool[] = ATLAS_TOOLS.map(
              (t, i, arr) =>
                i === arr.length - 1
                  ? { ...t, cache_control: { type: "ephemeral" } }
                  : t,
            );
            const cachedSystem: Anthropic.TextBlockParam[] = [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" },
              },
            ];

            const turnStream = anthropic.messages.stream({
              model,
              /* Extended Thinking budget is ADDITIONAL output capacity
                 on top of MAX_TOKENS — Anthropic counts thinking +
                 response separately. Agent-mode explicitly enables
                 it so the lawyer sees WHY each tool was chosen, not
                 just THAT it was. */
              max_tokens: MAX_TOKENS + THINKING_BUDGET,
              temperature: TEMPERATURE,
              system: cachedSystem,
              messages: conversation,
              tools: cachedTools,
              thinking: {
                type: "enabled",
                budget_tokens: THINKING_BUDGET,
              },
            });

            turnStream.on("text", (delta) => {
              textBuffer += delta;
              send({ type: "text", delta, iteration: iter });
            });

            /* Listen for thinking deltas — the SDK's high-level `text`
               event only fires for visible-text content. Thinking
               deltas come through the raw streamEvent. We tag them
               with the iteration so the UI can group thinking with
               the step it explains. */
            turnStream.on("streamEvent", (evt) => {
              if (
                evt.type === "content_block_delta" &&
                evt.delta &&
                typeof evt.delta === "object" &&
                "type" in evt.delta &&
                evt.delta.type === "thinking_delta"
              ) {
                const tDelta = (evt.delta as { thinking?: string }).thinking;
                if (tDelta) {
                  /* Append to the persisted reasoning bucket per
                     iteration (Sprint #3 history-replay). */
                  persistedReasoning[iter] =
                    (persistedReasoning[iter] ?? "") + tDelta;
                  send({
                    type: "thinking_delta",
                    delta: tDelta,
                    iteration: iter,
                  });
                }
              }
            });

            finalMessage = await turnStream.finalMessage();
            totalInputTokens += finalMessage.usage.input_tokens;
            totalOutputTokens += finalMessage.usage.output_tokens;
            /* Sprint A1 — capture cache-tier tokens for accurate
               cost-projection. Older Anthropic responses may not
               include these fields (will be undefined → 0). */
            totalCacheCreationTokens +=
              finalMessage.usage.cache_creation_input_tokens ?? 0;
            totalCacheReadTokens +=
              finalMessage.usage.cache_read_input_tokens ?? 0;

            /* Sprint A1 — emit a per-iteration cost-progress event so
               the UI can render the live counter (`$0.42 / $5.00`)
               without waiting for run-completion. */
            const liveCostUsd = estimateCostUsd(
              totalInputTokens,
              totalOutputTokens,
              totalCacheCreationTokens,
              totalCacheReadTokens,
            );
            send({
              type: "cost_progress",
              iteration: iter,
              currentCost: liveCostUsd,
              budget: parsed.data.budgetUsd ?? null,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              /* Sprint E3 — sub-agent cost-split (live computed). */
              subAgentCost:
                subAgentInputTokens > 0 || subAgentOutputTokens > 0
                  ? estimateCostUsd(
                      subAgentInputTokens,
                      subAgentOutputTokens,
                      0,
                      0,
                    )
                  : 0,
              subAgentInputTokens,
              subAgentOutputTokens,
            });

            conversation.push({
              role: "assistant",
              content: finalMessage.content,
            });
          }

          if (finalMessage.stop_reason !== "tool_use") {
            /* Final turn — agent is done. */
            break;
          }

          /* ╔═══════════════════════════════════════════════════════════╗
             ║ Sprint B1/E2 — Approval-pause check                       ║
             ║ Scan the model's tool_use blocks for any that require     ║
             ║ approval AND don't have a recorded decision yet.          ║
             ║ Sprint E2: pause on ALL undecided (was: first). Persist  ║
             ║ snapshot + emit approval_required SSE + break. The       ║
             ║ /approve endpoint records each decision; the client then  ║
             ║ re-POSTs with `resumeFromRunId` to continue.             ║
             ╚═══════════════════════════════════════════════════════════╝ */
          const toolUseBlocks = finalMessage.content.filter(
            (b): b is Extract<Anthropic.ContentBlock, { type: "tool_use" }> =>
              b.type === "tool_use",
          );
          const allUndecided = toolUseBlocks.filter(
            (b) =>
              requiresApproval(b.name) &&
              !currentApprovalGates.some(
                (g) => g.toolUseId === b.id && g.decision !== null,
              ),
          );
          if (allUndecided.length > 0) {
            const newGates: ApprovalGate[] = allUndecided.map((b) => ({
              toolUseId: b.id,
              toolName: b.name,
              originalInput: b.input as Record<string, unknown>,
              decision: null,
              rationale: approvalRationale(b.name),
              requestedAt: new Date().toISOString(),
              decidedAt: null,
            }));
            currentApprovalGates = [...currentApprovalGates, ...newGates];
            pausedForApproval = true;
            if (runId) {
              try {
                const liveCostUsd = estimateCostUsd(
                  totalInputTokens,
                  totalOutputTokens,
                  totalCacheCreationTokens,
                  totalCacheReadTokens,
                );
                await prisma.atlasAgentRun.update({
                  where: { id: runId },
                  data: {
                    status: "awaiting_approval",
                    pausedForApproval: true,
                    approvalGates: currentApprovalGates as unknown as object,
                    /* Snapshot everything needed for the resume-path
                       to pick the loop back up. */
                    conversationState: {
                      conversation,
                      totalInputTokens,
                      totalOutputTokens,
                      totalCacheCreationTokens,
                      totalCacheReadTokens,
                      toolsUsed,
                      textBuffer,
                      persistedSteps,
                      persistedReasoning,
                      iter,
                      /* Sprint E2 — plural ids (replaces pre-E2 scalar). */
                      pendingToolUseIds: allUndecided.map((b) => b.id),
                    } as unknown as object,
                    iterations: iter,
                    steps: persistedSteps as unknown as object,
                    reasoning: persistedReasoning as unknown as object,
                    inputTokens: totalInputTokens,
                    outputTokens: totalOutputTokens,
                    subAgentInputTokens,
                    subAgentOutputTokens,
                    costUsd: liveCostUsd,
                  },
                });
              } catch (err) {
                logger.warn("[atlas/agent] failed to persist approval-pause", {
                  runId,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
            send({
              type: "approval_required",
              runId,
              tools: allUndecided.map((b) => ({
                toolUseId: b.id,
                toolName: b.name,
                input: b.input,
                rationale: approvalRationale(b.name),
              })),
              iteration: iter,
            });
            logger.info("[atlas/agent] paused for approval (batched)", {
              userId: atlas.userId,
              runId,
              pendingCount: allUndecided.length,
              toolNames: allUndecided.map((b) => b.name),
            });
            break;
          }

          /* Run each tool_use block + feed results back. */
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") continue;

            /* Sprint B1 — Apply recorded approval-decision if any.
               At this point we know firstUndecided was null, so any
               dangerous tool in this batch either:
               (a) has a decision in currentApprovalGates, OR
               (b) is non-dangerous (no gate, runs normally).
               Decision === "rejected"  → skip execution, emit
                  USER_CANCELLED tool_result so the model knows.
               Decision === "modified" → swap to modifiedInput.
               Decision === "approved" or no gate → use block.input. */
            const gate = currentApprovalGates.find(
              (g) => g.toolUseId === block.id,
            );
            const isRejected = gate?.decision === "rejected";
            const effectiveInput =
              gate?.decision === "modified" && gate.modifiedInput
                ? gate.modifiedInput
                : (block.input as Record<string, unknown>);

            /* Sprint #3 — push the step into the persistence buffer
               on start; we'll patch in durationMs/isError/summary
               when step_complete fires. Effective input is captured
               so the history view shows what actually ran. */
            persistedSteps.push({
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              input: effectiveInput,
            });
            send({
              type: "step_start",
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              input: effectiveInput,
              /* Surface the approval-status so the UI can tag the
                 step-card (approved / modified / rejected badge). */
              approvalDecision: gate?.decision ?? null,
            });
            const t0 = Date.now();
            let resultContent = "";
            let isError = false;
            if (isRejected) {
              /* Sprint B1 — tell the model the lawyer cancelled this
                 step. Marked is_error: true so Claude treats it as a
                 hard fail and re-plans (rather than silently using
                 the rejection-text as a positive result). */
              resultContent =
                "USER_CANCELLED: Der Anwalt hat diesen Schritt nicht freigegeben. Lass diesen Schritt aus und mache mit dem nächsten Schritt im Plan weiter — passe deinen Plan ggf. an.";
              isError = true;
            } else if (block.name === "delegate_subtasks") {
              /* Sprint D2 — agent-mode-only orchestration tool.
                 Handled HERE in the route (not via executeAtlasTool)
                 because the parallel sub-agent dispatch needs direct
                 access to the anthropic client + model + system
                 prompt. Token-counts from sub-agents accumulate
                 into the main run's totals so the cost-counter +
                 budget-check stay accurate. */
              try {
                const inp = effectiveInput as { subtasks?: unknown };
                const outcome = await delegateSubtasks(inp.subtasks, {
                  anthropic,
                  model,
                  sharedSystemPrompt: systemPrompt,
                });
                resultContent = outcome.content;
                isError = outcome.hasErrors;
                /* Cumulative token-accounting across sub-agents. */
                totalInputTokens += outcome.totalInputTokens;
                totalOutputTokens += outcome.totalOutputTokens;
                totalCacheCreationTokens += outcome.totalCacheCreationTokens;
                totalCacheReadTokens += outcome.totalCacheReadTokens;
                if (!isError) toolsUsed.push(block.name);
                /* Sprint E3 — also track sub-agent token totals
                   separately for the Live-Counter split. */
                subAgentInputTokens += outcome.totalInputTokens;
                subAgentOutputTokens += outcome.totalOutputTokens;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                resultContent = JSON.stringify({ error: msg });
                isError = true;
              }
            } else {
              try {
                if (!isAtlasToolName(block.name)) {
                  throw new Error(`Unknown tool: ${block.name}`);
                }
                const out = await executeAtlasTool({
                  name: block.name,
                  input: effectiveInput,
                  callerUserId: atlas.userId,
                  callerOrgId: atlas.organizationId,
                  /* AUDIT-FIX H17: agent-mode konnte search_mandate_vault
                     nie nutzen weil mandateId nie an den executor gereicht
                     wurde. Jetzt parallel zum chat-engine call-pattern. */
                  mandateId: parsed.data.mandateId ?? null,
                });
                resultContent = out.content;
                isError = out.isError;
                if (!isError) toolsUsed.push(block.name);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                resultContent = JSON.stringify({ error: msg });
                isError = true;
              }
            }
            const durationMs = Date.now() - t0;
            const summary = isRejected
              ? "Vom Anwalt abgelehnt"
              : isError
                ? `Fehler: ${resultContent.slice(0, 200)}`
                : `${resultContent.length} chars`;
            /* Patch the in-flight persistedSteps record with the
               completion metadata. */
            const stepRecord = persistedSteps.find(
              (s) => s.toolId === block.id,
            );
            if (stepRecord) {
              stepRecord.durationMs = durationMs;
              stepRecord.isError = isError;
              stepRecord.summary = summary;
            }
            send({
              type: "step_complete",
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              durationMs,
              isError,
              summary,
              approvalDecision: gate?.decision ?? null,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultContent,
              is_error: isError || undefined,
            });
          }
          conversation.push({
            role: "user",
            content: toolResults,
          });
        }

        /* Sprint A1 / B1 — when we paused for either budget or
           approval, skip the rest of the post-loop pipeline.
           Citations / artifacts / completion-write are reserved
           for terminal runs. The pause-state was already persisted +
           streamed above; just close the stream below in the
           finally-block. */
        if (pausedForBudget || pausedForApproval) {
          return;
        }

        /* Sprint E — Citation-Verification / Hallucination-Guard.
           Run extractCitations() over the full accumulated text-
           buffer. Every [ATLAS:source-id] is resolved against the
           corpus + decorated with a validity badge. Citations that
           don't resolve (= the model hallucinated a source-id that
           doesn't exist in our corpus) come back with
           badge === "unknown" — those are the red flags the lawyer
           needs to see. The UI renders this as a top-banner
           "Citations geprüft (X verified · Y warnings · Z
           hallucinations)" card. */
        const citations = extractCitations(textBuffer);
        if (citations.length > 0) {
          const verified = citations.filter(
            (c) => c.badge === "in_force",
          ).length;
          const hallucinated = citations.filter(
            (c) => c.badge === "unknown",
          ).length;
          const warnings = citations.length - verified - hallucinated;
          send({
            type: "verification",
            total: citations.length,
            verified,
            warnings,
            hallucinated,
            citations: citations.map((c) => ({
              sourceId: c.sourceId,
              citation: c.citation,
              badge: c.badge,
              title: c.title,
              status: c.status,
              lastVerified: c.lastVerified,
              staleDays: c.staleDays,
              amendedBy: c.amendedBy,
              supersededBy: c.supersededBy,
              sourceUrl: c.sourceUrl,
              index: c.index,
              occurrences: c.occurrences,
            })),
          });
        }

        /* Sprint A1 — replace the old uncached-only calc with the
           cache-aware estimateCostUsd helper for parity with chat-
           engine + the budget-projection check above. */
        const costUsd = estimateCostUsd(
          totalInputTokens,
          totalOutputTokens,
          totalCacheCreationTokens,
          totalCacheReadTokens,
        );

        /* Sprint A2 — Parse artifacts ONCE up here so both the
           verification-pass below and the persistence-block further
           down can reuse the same array. Same fence-regex as the
           client-side parseArtifacts() in agent/page.tsx. */
        const artifacts: Array<{
          kind: string;
          title: string;
          body: string;
        }> = [];
        const ARTIFACT_RE =
          /\[\[ARTIFACT\s+type=(\w+)\s+title="([^"]+)"\]\]([\s\S]*?)\[\[\/ARTIFACT\]\]/g;
        let am: RegExpExecArray | null;
        while ((am = ARTIFACT_RE.exec(textBuffer)) !== null) {
          artifacts.push({
            kind: am[1].toLowerCase(),
            title: am[2],
            body: am[3].trim(),
          });
        }

        /* Sprint A2 — Verification-Pass over the freshly-parsed
           artefacts. Runs three checks per artefact: citation-
           verification (every [ATLAS:...] resolves), BORA / BRAO
           lexicon-scan, and hallucination heuristic (substantive
           claims without citations). Findings are streamed to the
           UI as `verification_warnings` and persisted on the
           AtlasAgentRun row below. */
        let verificationFindings: Array<{
          artifactIndex: number;
          kind: "citation" | "bora" | "hallucination";
          severity: "warn" | "error";
          message: string;
          citation?: string;
          offset?: number;
        }> = [];
        if (artifacts.length > 0) {
          try {
            const { verifyArtifacts } =
              await import("@/lib/atlas/agent/verification-pass.server");
            /* Map raw kind strings to the union expected by the
               verifier. Anything unknown collapses to "memo" — that
               matches the client-side normaliseKind() behaviour. */
            const normaliseKind = (
              s: string,
            ): "memo" | "schriftsatz" | "email" | "checklist" | "summary" =>
              s === "schriftsatz" ||
              s === "email" ||
              s === "checklist" ||
              s === "summary"
                ? s
                : "memo";
            verificationFindings = await verifyArtifacts(
              artifacts.map((a, i) => ({
                index: i,
                kind: normaliseKind(a.kind),
                title: a.title,
                body: a.body,
              })),
            );
            if (verificationFindings.length > 0) {
              send({
                type: "verification_warnings",
                findings: verificationFindings,
              });
            }
          } catch (err) {
            /* Verification is best-effort — never block the run on a
               failure here. Log + continue so the lawyer still gets
               the artefacts. */
            logger.warn("[atlas/agent] verification-pass failed", {
              runId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        /* Sprint #3 — final-write of the run-record. Captures
           steps, reasoning, artifacts (parsed from textBuffer with
           the same fence-regex used client-side), citation-result,
           token + cost totals, completion-time. status="complete". */
        if (runId) {
          const verificationPayload =
            citations.length > 0
              ? {
                  total: citations.length,
                  verified: citations.filter((c) => c.badge === "in_force")
                    .length,
                  warnings:
                    citations.length -
                    citations.filter((c) => c.badge === "in_force").length -
                    citations.filter((c) => c.badge === "unknown").length,
                  hallucinated: citations.filter((c) => c.badge === "unknown")
                    .length,
                  citations,
                }
              : null;

          try {
            await prisma.atlasAgentRun.update({
              where: { id: runId },
              data: {
                status: "complete",
                iterations: iter,
                steps: persistedSteps as unknown as object,
                reasoning: persistedReasoning as unknown as object,
                artifacts: artifacts as unknown as object,
                citations:
                  (verificationPayload as unknown as object) ?? undefined,
                /* Sprint A2 — persist the verification-findings so
                   the history page can render them without re-running
                   the checks. Cast to JsonArray-compatible shape. */
                verificationResults:
                  verificationFindings.length > 0
                    ? (verificationFindings as unknown as object)
                    : undefined,
                /* Sprint C1 — persist conversationState on COMPLETE
                   too (not just on pause). Enables run-replay /
                   branching via /api/atlas/agent with `forkFromRunId`.
                   AUDIT-FIX M32 (2026-05-17): cap at 5 MB. Runs with
                   thinking enabled + many tool-iterations could grow
                   the JSON blob to several MB. Capping at persistence
                   time prevents the row from blowing up Postgres
                   payload limits OR ballooning the AtlasAgentRun
                   storage footprint. When over-cap, store a sentinel
                   so the fork-path knows to refuse with a clean error
                   instead of crashing. */
                conversationState: (() => {
                  const state = {
                    conversation,
                    totalInputTokens,
                    totalOutputTokens,
                    totalCacheCreationTokens,
                    totalCacheReadTokens,
                    toolsUsed,
                    textBuffer,
                    persistedSteps,
                    persistedReasoning,
                    iter,
                  };
                  const serialized = JSON.stringify(state);
                  if (serialized.length > 5 * 1024 * 1024) {
                    return {
                      truncated: true,
                      reason: "Exceeded 5 MB cap",
                      iter,
                      toolsUsed,
                    } as unknown as object;
                  }
                  return state as unknown as object;
                })(),
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                subAgentInputTokens,
                subAgentOutputTokens,
                costUsd,
                completedAt: new Date(),
              },
            });
            /* Sprint B2 — Cross-Run-Memory fire-and-forget. Kicked
               off RIGHT AFTER the run is persisted as `complete` so
               the summariser's findMany({status:"complete"}) sees
               this fresh run. Voided + caught — must not block the
               SSE-close. Vercel keeps the function alive until
               maxDuration so the background promise runs to
               completion under normal conditions. */
            if (parsed.data.mandateId) {
              void updateMandateMemory(
                parsed.data.mandateId,
                atlas.organizationId,
              ).catch((err) => {
                logger.warn("[atlas/agent] memory update failed", {
                  mandateId: parsed.data.mandateId,
                  runId,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
          } catch (err) {
            logger.warn("[atlas/agent] failed to persist run-completion", {
              runId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        /* Sprint C2 — Smart Workflow-Sequencing. If the run was
           launched from a curated template, emit the logically-next
           templates as 1-click follow-ups. Pure look-up over the
           hand-curated `suggestedNext` graph — no LLM call, no DB
           read. The UI renders these as cards under the artifacts. */
        const suggestions = suggestNextWorkflows(
          parsed.data.templateId ?? null,
        );
        if (suggestions.length > 0) {
          send({
            type: "suggested_next",
            runId,
            sourceTemplateId: parsed.data.templateId,
            suggestions,
          });
        }

        send({
          type: "run_done",
          runId,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
          },
          toolsUsed: Array.from(new Set(toolsUsed)),
          iterations: iter,
        });

        logger.info("[atlas/agent] run complete", {
          userId: atlas.userId,
          mandateId: parsed.data.mandateId ?? null,
          runId,
          iterations: iter,
          totalInputTokens,
          totalOutputTokens,
          toolsUsed: Array.from(new Set(toolsUsed)),
        });
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        /* AUDIT-FIX M25: log the RAW message internally for ops/debug,
           but never persist or stream it untouched. Raw errors can
           include stack frames, file paths, env-var names, or third-
           party library messages with API-key fragments. */
        logger.error("[atlas/agent] run failed", {
          userId: atlas.userId,
          runId,
          error: rawMsg,
        });
        /* AUDIT-FIX M25: sanitize before persisting + before streaming
           to client. In production this collapses to the generic
           message; in dev it preserves the real text for debugging. */
        const safeMsg = getSafeErrorMessage(err, "Agent run failed");
        /* Persist the failure-state so it shows up in history with
           the error-message visible. */
        if (runId) {
          try {
            await prisma.atlasAgentRun.update({
              where: { id: runId },
              data: {
                status: "error",
                /* AUDIT-FIX M25: sanitized message, then truncated. */
                errorMessage: safeMsg.slice(0, 1000),
                steps: persistedSteps as unknown as object,
                reasoning: persistedReasoning as unknown as object,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                subAgentInputTokens,
                subAgentOutputTokens,
                completedAt: new Date(),
              },
            });
          } catch {
            /* swallow — already in error path */
          }
        }
        /* AUDIT-FIX M25: SSE stream also sees only the sanitized text. */
        send({ type: "error", message: safeMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
