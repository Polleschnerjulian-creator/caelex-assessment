import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

const MAX_TOOL_ITERATIONS = 5;
const MAX_OUTPUT_TOKENS = 2048;

const PHAROS_SYSTEM_PROMPT = `Du bist Pharos-Astra, der KI-Assistent für regulatorische Aufsicht im Weltraum-Sektor. Du sprichst mit Compliance-Officers von Behörden (BAFA, BNetzA, BSI, BMVG, ESA-Liaison u.a.).

Deine Rolle:
- Klare, präzise Antworten auf regulatorische Fragen.
- Bei Anfragen über konkrete Operatoren NUTZE die verfügbaren Tools, nie aus Erinnerung.
- Transparenz über Datenquellen: gib an, ob eine Antwort auf einem Tool-Call oder Allgemeinwissen basiert.
- Bei Compliance-Score-Bewertungen: erkläre die Tiers (≥90 gut, 70-89 drift, <70 alarm) und welche Faktoren reinspielen.
- Bei Audit-Log-Auswertungen: weise auf Anomalien hin (häufige Fremdzugriffe, Lücken, etc.).

Was du NICHT machst:
- Keine Spekulation über Operator-interne Daten ohne Tool-Backing.
- Keine Empfehlung zu Verfahrenseröffnung oder konkreten Sanktionen — das ist ausschließlich Behörden-Hoheit.
- Keine Datenweitergabe über Aufsichts-Grenzen hinweg (die Tools enforcen das technisch — du verstärkst diese Trennung sprachlich).

Sprache: Deutsch, präzise und juristisch genau, aber lesbar. Keine Marketing-Sprache.`;

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
  toolCalls?: Array<{ tool: string; input: unknown; ok: boolean }>;
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

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    let result: Anthropic.Message;
    try {
      result = await setup.client.messages.create({
        model: setup.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: PHAROS_SYSTEM_PROMPT,
        tools: PHAROS_ASTRA_TOOLS,
        messages,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Pharos-Astra Anthropic call failed: ${msg}`);
      return {
        ok: false,
        error: `KI-Anruf fehlgeschlagen: ${msg}`,
        toolCalls: toolCallTrace,
      };
    }

    // If model didn't use a tool, we have the final answer.
    if (result.stop_reason !== "tool_use") {
      const text = result.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return {
        ok: true,
        reply: text || "(Keine Antwort)",
        toolCalls: toolCallTrace,
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
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        is_error: !exec.ok,
        content: JSON.stringify(exec.ok ? exec.data : { error: exec.error }),
      });
    }

    // Feed tool results back to the model
    messages.push({ role: "user", content: toolResults });
  }

  return {
    ok: false,
    error: `Tool-Loop ohne Ergebnis nach ${MAX_TOOL_ITERATIONS} Iterationen.`,
    toolCalls: toolCallTrace,
  };
}
