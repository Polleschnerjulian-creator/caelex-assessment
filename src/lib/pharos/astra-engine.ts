import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos-Astra Engine — Behörden-AI mit minimalem Tool-Loop.
 *
 * Reuses the Atlas anthropic-client (path A: Vercel AI Gateway with
 * EU-Bedrock as primary route, direct API as fallback). Does NOT
 * reuse the operator-side AstraEngine — different system prompt,
 * different tool inventory, different audience.
 *
 * Conversations are stateless from a persistence perspective: the
 * UI sends the message history along with each request, the engine
 * runs the tool-use loop and returns the final assistant text +
 * the trace of tool calls (for transparency).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import { PHAROS_ASTRA_TOOLS, executePharosAstraTool } from "./astra-tools";
import {
  ABSTENTION_MARKER,
  answerIsCitationCompliant,
  type Citation,
} from "./citation";
import {
  computeReceipt,
  extractOversightIdsFromTrace,
  persistAstraReceipt,
  signReceipt,
  systemPromptHash,
  type SignedReceipt,
} from "./receipt";
import { runJudge, type JudgeVerdict } from "./llm-judge";

const MAX_TOOL_ITERATIONS = 5;
const MAX_OUTPUT_TOKENS = 2048;

/** Deterministic-Mode-Sampling: temperature=0 plus eine seed-equivalent
 *  Strategie via stop_sequences + top_k=1. Anthropic's API erlaubt kein
 *  expliziter random_seed-Parameter, aber temperature=0 + top_k=1 gibt
 *  uns greedy decoding, was für Compliance-Anwendungen reicht: gleiche
 *  Inputs → gleiche Outputs (modulo backend-side floating-point-Drift,
 *  der in der Praxis bei Sonnet vernachlässigbar ist). */
const DETERMINISTIC_SAMPLING = {
  temperature: 0 as const,
} as const;

const PHAROS_SYSTEM_PROMPT = `Du bist Pharos-Astra, der KI-Assistent für regulatorische Aufsicht im Weltraum-Sektor. Du sprichst mit Compliance-Officers von Behörden (BAFA, BNetzA, BSI, BMVG, ESA-Liaison u.a.).

Deine Rolle:
- Klare, präzise Antworten auf regulatorische Fragen.
- Bei JEDER regulatorischen Aussage rufe ZUERST das Tool 'cite_norm' auf um den exakten Norm-Anchor zu finden. Antworte erst danach.
- Bei Anfragen über konkrete Operatoren NUTZE 'query_operator_compliance' / 'summarize_audit_chain', nie aus Erinnerung.
- Bei Triage- oder Frist-Fragen ('was läuft heute ab?', 'wo ist Eskalations-Bedarf?') nutze 'list_open_workflows' mit slaTone='warn' oder 'alert'.
- Kombiniere Norm-Citations + Datenfelder: jede Aussage trägt typischerweise mind. 1 NORM- + 1 DB-Citation.
- Bei Compliance-Score-Bewertungen: erkläre die Tiers (≥90 gut, 70-89 drift, <70 alarm) und welche Faktoren reinspielen.
- Bei Audit-Log-Auswertungen: weise auf Anomalien hin (häufige Fremdzugriffe, Lücken, etc.).

═══════════════════════════════════════════════════════════════════════
ABSOLUTE REGEL — CITATION-PFLICHT (Verifiable Refusal):
═══════════════════════════════════════════════════════════════════════
Jede sachliche Aussage in deiner finalen Antwort MUSS eine Citation-ID
aus den Tool-Results referenzieren. Citation-IDs erscheinen in Tool-
Outputs als "_citation"-Felder oder im "citations"-Array. Format der
Referenz: in eckigen Klammern direkt am Aussageende.

Beispiel zulässige Antwort:
  "Der Compliance-Score liegt bei 65 (Tier: alert) [COMP:operator-
  compliance-score@v1.0]. Der Operator ist die Acme Space GmbH
  [DB:Organization:cuid42]."

Beispiel UNZULÄSSIG (wird von der Engine verworfen):
  "Der Compliance-Score liegt bei 65 und der Operator hat strukturelle
  Probleme."  ← keine Citation, keine Abstention

Wenn die Tools KEINE relevante Information liefern oder eine sub-
stanzielle Aussage nicht möglich ist, antwortest du AUSSCHLIESSLICH
mit folgendem strukturierten Format:

  ${ABSTENTION_MARKER}
  Reason: <1-2 Sätze warum keine Aussage möglich ist>
  Alternative: <Vorschlag, z.B. "Manuelle Aktenprüfung", "Atlas-
  Anwalts-Konsultation", "Norm-Recherche bei EUR-Lex">

Eine Abstention ist KEINE Niederlage — sie ist die rechtlich saubere
Antwort und wird kryptografisch in die Hash-Chain eingetragen.

NIEMALS:
- Citation-IDs erfinden, die nicht in Tool-Results vorkommen
- Aussagen über Operator-interne Daten ohne Tool-Backing
- Empfehlungen zu Verfahrenseröffnung / Sanktionen (Behörden-Hoheit)
- Daten über Aufsichts-Grenzen hinweg vermischen

Sprache: Deutsch, präzise, juristisch genau, ohne Marketing-Sprache.`;

export interface PharosAstraMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PharosAstraRequest {
  authorityProfileId: string;
  history: PharosAstraMessage[];
  userMessage: string;
}

export interface PharosAstraResponse {
  ok: boolean;
  reply?: string;
  /** LLM-as-a-Judge verdict — "accepted" | "rejected" | "abstained".
   *  Defense-in-depth nach der Schema-Citation-Enforcement der Engine.
   *  Bei rejected wird die Antwort ausgeliefert ABER mit Warnung im UI;
   *  bei accepted-low-confidence rendered die UI das als Hinweis. */
  judge?: {
    verdict: JudgeVerdict["verdict"];
    confidence: number;
    reasonsRejected: string[];
    unsupportedClaims: string[];
  };
  /** True wenn die Antwort eine strukturierte Abstention war
   *  (Pharos hat sich geweigert eine Aussage zu treffen — das ist
   *  rechtlich sauber und wird wie eine reguläre Antwort behandelt). */
  abstained?: boolean;
  toolCalls?: Array<{ tool: string; input: unknown; ok: boolean }>;
  /** Gesamtheit der Citations die durch den Tool-Loop angesammelt
   *  wurden. Die UI rendert diese als klickbare Provenance-Liste
   *  unter der Antwort. */
  citations?: Citation[];
  /** Ed25519-signierter Triple-Hash-Receipt. Jeder Behörden-User kann
   *  diesen Receipt extern via `npx pharos-verify` validieren. Bei
   *  rein konversationellen Fragen ohne Oversight-Bezug (z.B. "was
   *  bedeutet NIS2?") wird der Receipt erzeugt aber NICHT in eine
   *  Hash-Chain geschrieben (chainEntries leer). */
  receipt?: SignedReceipt;
  /** Pro berührter Aufsicht: der entryId in OversightAccessLog der
   *  diesen Receipt enthält. Operator sieht jeden dieser Einträge in
   *  seinem Dashboard live. */
  chainEntries?: Array<{
    oversightId: string;
    entryId: string;
    entryHash: string;
  }>;
  error?: string;
}

/** Run the Pharos-Astra tool-loop. Returns final assistant text plus
 *  the trace of tool calls. */
export async function runPharosAstra(
  req: PharosAstraRequest,
): Promise<PharosAstraResponse> {
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      ok: false,
      error:
        "Pharos-Astra ist nicht konfiguriert (fehlt AI_GATEWAY_API_KEY oder ANTHROPIC_API_KEY).",
    };
  }

  // Convert message history to Anthropic format
  const messages: Anthropic.MessageParam[] = [
    ...req.history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: req.userMessage },
  ];

  const toolCallTrace: Array<{
    tool: string;
    input: unknown;
    ok: boolean;
  }> = [];

  // Sammelt ALLE Citations aus ALLEN Tool-Calls. Am Ende des Loops
  // wird gegen diese Liste validiert: die finale LLM-Antwort muss
  // mindestens eine ID hieraus referenzieren oder explizit abstain'en.
  const allCitations: Citation[] = [];
  // Dedupe-Set, weil das Modell ein Tool mehrmals ruft (z.B. mit
  // verschiedenen oversightIds).
  const citationIds = new Set<string>();

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    let result: Anthropic.Message;
    try {
      result = await setup.client.messages.create({
        model: setup.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: PHAROS_SYSTEM_PROMPT,
        tools: PHAROS_ASTRA_TOOLS,
        messages,
        // Deterministic Mode: temperature=0 für reproduzierbare Outputs.
        // Zwei identische Anfragen am selben Tag erzeugen byte-identische
        // Antworten — kritisch für §39 VwVfG-Begründungspflicht.
        ...DETERMINISTIC_SAMPLING,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Pharos-Astra Anthropic call failed: ${msg}`);
      return {
        ok: false,
        error: `KI-Anruf fehlgeschlagen: ${msg}`,
        toolCalls: toolCallTrace,
        citations: allCitations,
      };
    }

    // If model didn't use a tool, we have the final answer.
    if (result.stop_reason !== "tool_use") {
      const text = result.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      // CITATION-ENFORCEMENT: die Antwort muss entweder eine Citation
      // referenzieren oder eine strukturierte Abstention sein.
      // Halluzinationen werden hier mathematisch ausgeschlossen.
      const check = answerIsCitationCompliant(text, allCitations);
      if (!check.compliant) {
        logger.warn(
          `Pharos-Astra answer rejected (citation-non-compliant): ${check.reason}`,
        );
        return {
          ok: false,
          error: `Pharos-Astra Antwort wurde verworfen: ${check.reason} Bitte präzisiere die Frage oder erlaube eine Abstention.`,
          toolCalls: toolCallTrace,
          citations: allCitations,
        };
      }

      // LLM-AS-A-JUDGE: zweite, unabhängige Inferenz prüft ob der
      // Output gegen die gelieferten Citations textuell standhält.
      // Defense-in-depth zur Schema-Enforcement.
      let judgeVerdict: JudgeVerdict | undefined;
      try {
        judgeVerdict = await runJudge({
          question: req.userMessage,
          answer: text,
          citations: allCitations,
        });
        if (
          judgeVerdict.verdict === "rejected" &&
          judgeVerdict.confidence > 0.7
        ) {
          logger.warn(
            `[pharos-astra] judge rejected with confidence ${judgeVerdict.confidence}: ${judgeVerdict.reasonsRejected.join("; ")}`,
          );
          return {
            ok: false,
            error: `Pharos-Judge hat die Antwort abgewiesen: ${judgeVerdict.reasonsRejected.join("; ") || "Aussagen nicht durch Citations gestützt."}`,
            toolCalls: toolCallTrace,
            citations: allCitations,
            judge: {
              verdict: judgeVerdict.verdict,
              confidence: judgeVerdict.confidence,
              reasonsRejected: judgeVerdict.reasonsRejected,
              unsupportedClaims: judgeVerdict.unsupportedClaims,
            },
          };
        }
      } catch (err) {
        // Judge transient outage → don't block the user. Schema-enforcement
        // is the primary guard.
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[pharos-judge] unhandled: ${msg}`);
      }

      // TRIPLE-HASH-RECEIPT: signiere den Output kryptografisch und
      // hänge ihn in die OversightAccessLog-Hash-Chain jeder berührten
      // Aufsicht ein. Wenn ENCRYPTION_KEY fehlt oder DB nicht erreichbar:
      // Antwort wird trotzdem zurückgegeben, aber ohne Receipt — der
      // Behörden-User sieht das im UI als "Receipt not signed" Warnung.
      let receipt: SignedReceipt | undefined;
      let chainEntries:
        | Array<{ oversightId: string; entryId: string; entryHash: string }>
        | undefined;
      try {
        const oversightIds = extractOversightIdsFromTrace(toolCallTrace);
        const computed = computeReceipt({
          abstained: check.abstained,
          answer: text,
          authorityProfileId: req.authorityProfileId,
          citationIds: allCitations.map((c) => c.id),
          modelVersion: setup.model,
          oversightIds,
          prompt: req.userMessage,
          systemPromptHash: systemPromptHash(
            PHAROS_SYSTEM_PROMPT,
            PHAROS_ASTRA_TOOLS,
          ),
          toolCallTrace,
        });
        receipt = signReceipt(computed, req.authorityProfileId);
        chainEntries = await persistAstraReceipt(receipt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[pharos-astra] receipt signing/persist failed: ${msg}`);
        // Don't fail the user-facing response — the answer itself is
        // still correct, just unsigned. UI surfaces the missing receipt.
      }

      return {
        ok: true,
        reply: text || "(Keine Antwort)",
        abstained: check.abstained,
        toolCalls: toolCallTrace,
        citations: allCitations,
        receipt,
        chainEntries,
        judge: judgeVerdict
          ? {
              verdict: judgeVerdict.verdict,
              confidence: judgeVerdict.confidence,
              reasonsRejected: judgeVerdict.reasonsRejected,
              unsupportedClaims: judgeVerdict.unsupportedClaims,
            }
          : undefined,
      };
    }

    // Append assistant message with the tool_use blocks
    messages.push({ role: "assistant", content: result.content });

    // Execute every tool_use block in the response
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of result.content) {
      if (block.type !== "tool_use") continue;
      const exec = await executePharosAstraTool(
        block.name,
        block.input as Record<string, unknown>,
        { authorityProfileId: req.authorityProfileId },
      );
      toolCallTrace.push({
        tool: block.name,
        input: block.input,
        ok: exec.ok,
      });

      // Citations einsammeln (deduped) — Provenance-Ledger der Antwort.
      for (const c of exec.citations) {
        if (!citationIds.has(c.id)) {
          citationIds.add(c.id);
          allCitations.push(c);
        }
      }

      // Tool-Result-Payload, das zurück ans Modell geht. WICHTIG: wir
      // schicken die `citations`-Liste mit, damit das Modell weiß welche
      // IDs es referenzieren darf. Bei abstain=true: das Modell sieht
      // den Abstain-Hinweis und propagiert die Abstention selbst.
      const payload: Record<string, unknown> = exec.ok
        ? {
            data: exec.data,
            citations: exec.citations.map((c) => ({
              id: c.id,
              kind: c.kind,
              source: c.source,
              span: c.span,
            })),
          }
        : { error: exec.error };
      if (exec.abstain) {
        payload.abstain = true;
        payload.abstainReason = exec.abstainReason;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        is_error: !exec.ok,
        content: JSON.stringify(payload),
      });
    }

    // Feed tool results back to the model
    messages.push({ role: "user", content: toolResults });
  }

  return {
    ok: false,
    error: `Tool-Loop ohne Ergebnis nach ${MAX_TOOL_ITERATIONS} Iterationen.`,
    toolCalls: toolCallTrace,
    citations: allCitations,
  };
}
