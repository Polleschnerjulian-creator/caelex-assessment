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
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

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

interface ResolvedMandateContext {
  id: string;
  name: string;
  customInstructions: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  clientName: string | null;
}

async function loadMandateContext(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<ResolvedMandateContext | null> {
  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      customInstructions: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      clientName: true,
    },
  });
  return mandate;
}

function buildSystemPrompt(mandate: ResolvedMandateContext | null): string {
  if (!mandate) return AGENT_SYSTEM_PROMPT;
  const lines: string[] = [AGENT_SYSTEM_PROMPT, "", "## Active mandate"];
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
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  const systemPrompt = buildSystemPrompt(mandate);
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
      try {
        const runRow = await prisma.atlasAgentRun.create({
          data: {
            userId: atlas.userId,
            organizationId: atlas.organizationId,
            mandateId: parsed.data.mandateId ?? null,
            goal: goalForLog.slice(0, 2000),
            status: "running",
          },
          select: { id: true },
        });
        runId = runRow.id;
        send({ type: "run_started", goal: goalForLog, runId });
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

      const conversation: Anthropic.MessageParam[] = [
        { role: "user", content: parsed.data.goal },
      ];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const toolsUsed: string[] = [];
      /* Server-side text buffer accumulates every text-delta the
         model emits across all iterations. Used at run-end for
         citation extraction + hallucination detection (Sprint E).
         The client's textBuffer is reset between iterations in
         some flows, so we keep the canonical version here. */
      let textBuffer = "";
      /* Sprint #3 — server-side capture of steps + reasoning so we
         can persist the full run-record to AtlasAgentRun at the
         end. Mirrors the SSE event shape but kept in JS-native
         types so the prisma write is straightforward. */
      const persistedSteps: Array<{
        iteration: number;
        toolId: string;
        toolName: string;
        input: Record<string, unknown>;
        durationMs?: number;
        isError?: boolean;
        summary?: string;
      }> = [];
      const persistedReasoning: Record<number, string> = {};

      try {
        let iter = 0;
        while (iter < MAX_TOOL_ITERATIONS) {
          iter++;

          /* Prompt-caching same strategy as chat-engine — sys + tools
             cached so multi-turn agent runs don't pay full input
             cost on every iteration. */
          const cachedTools: Anthropic.Tool[] = ATLAS_TOOLS.map((t, i, arr) =>
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

          const finalMessage = await turnStream.finalMessage();
          totalInputTokens += finalMessage.usage.input_tokens;
          totalOutputTokens += finalMessage.usage.output_tokens;

          conversation.push({
            role: "assistant",
            content: finalMessage.content,
          });

          if (finalMessage.stop_reason !== "tool_use") {
            /* Final turn — agent is done. */
            break;
          }

          /* Run each tool_use block + feed results back. */
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") continue;
            /* Sprint #3 — push the step into the persistence buffer
               on start; we'll patch in durationMs/isError/summary
               when step_complete fires. */
            persistedSteps.push({
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              input: block.input as Record<string, unknown>,
            });
            send({
              type: "step_start",
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              input: block.input,
            });
            const t0 = Date.now();
            let resultContent = "";
            let isError = false;
            try {
              if (!isAtlasToolName(block.name)) {
                throw new Error(`Unknown tool: ${block.name}`);
              }
              const out = await executeAtlasTool({
                name: block.name,
                input: block.input as Record<string, unknown>,
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
            const durationMs = Date.now() - t0;
            const summary = isError
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

        const costUsd =
          (totalInputTokens / 1_000_000) * 3 +
          (totalOutputTokens / 1_000_000) * 15;

        /* Sprint #3 — final-write of the run-record. Captures
           steps, reasoning, artifacts (parsed from textBuffer with
           the same fence-regex used client-side), citation-result,
           token + cost totals, completion-time. status="complete". */
        if (runId) {
          /* Parse artifacts server-side too, so the history page
             can render them without re-parsing. Same regex as the
             client (parseArtifacts in agent/page.tsx). */
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
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                costUsd,
                completedAt: new Date(),
              },
            });
          } catch (err) {
            logger.warn("[atlas/agent] failed to persist run-completion", {
              runId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
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
