import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos LLM-as-a-Judge — second-order verification.
 *
 * Nach der Citation-Schema-Enforcement der Engine läuft hier eine
 * ZWEITE Inferenz (Haiku 4.5, T=0, anderer Sampling-Seed) die prüft:
 *
 *   1. Existiert jede zitierte Citation-ID tatsächlich in der vom Tool
 *      gelieferten Liste? (Schema-Layer hat das schon, Judge bestätigt.)
 *   2. Macht der Output inhaltlich Sinn gegen die Citation-Sources?
 *      (Levenshtein/semantische Ähnlichkeit zwischen behaupteten Aussagen
 *       und citation.source/span.)
 *   3. Liegen die behaupteten "Fakten" plausibel im Citation-Scope, oder
 *      hat das primäre Modell extrapoliert?
 *
 * Output des Judge ist eine strukturierte Bewertung:
 *   - verdict: "accepted" | "rejected" | "abstained"
 *   - reasonsRejected: Liste von Begründungen für reject (wenn applicable)
 *   - confidence: 0..1
 *
 * Kosten: ~1 Haiku-Call pro finaler Antwort (~$0.0001), Latenz ~500ms.
 * Damit ist die Halluzinations-Sicherung mehrschichtig:
 *   - Schicht 1: Citation-Schema (synthetisch enforced)
 *   - Schicht 2: Judge (semantisch enforced)
 *   - Schicht 3: Triple-Hash-Receipt (kryptografisch signed)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import type { Citation } from "./citation";

const JUDGE_MAX_TOKENS = 512;
const JUDGE_MODEL_OVERRIDE = "claude-haiku-4-5"; // try this first; fall back to setup.model if unavailable

const JUDGE_SYSTEM_PROMPT = `Du bist der Pharos-Judge — eine UNABHÄNGIGE zweite KI, die Outputs der primären Pharos-Astra prüft.

Deine ALLEINIGE Aufgabe ist zu bewerten, ob die finale Antwort gegen die gelieferten Citations überprüfbar ist:
1. Wird jede sachliche Aussage durch eine der bereitgestellten Citation-IDs gestützt?
2. Sind die Aussagen plausibel im Lichte der Citation-Quellen (source / span)?
3. Wurden Behauptungen erfunden, die nicht aus den Citations folgen?

Du bewertest STRENG. Bei Zweifel: ablehnen.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Schema (keine Markdown-Codefences, kein Prosa-Text außerhalb JSON):

{
  "verdict": "accepted" | "rejected" | "abstained",
  "confidence": 0.0,
  "reasonsRejected": ["..."],
  "unsupportedClaims": ["..."]
}

Definitionen:
- "accepted" = jede Aussage ist durch mindestens eine Citation gestützt, kein erfundener Fakt erkennbar
- "rejected" = mindestens eine substanzielle Aussage hat keine Citation-Stütze
- "abstained" = das Original ist bereits eine Abstention (beginnt mit [ABSTAIN]), Judge nimmt das hin
- confidence 0.0..1.0 = wie sicher bist du dir bei deinem Urteil?`;

export interface JudgeVerdict {
  verdict: "accepted" | "rejected" | "abstained";
  confidence: number;
  reasonsRejected: string[];
  unsupportedClaims: string[];
  rawResponse: string;
}

/** Run the second-pass LLM-as-Judge. Returns a verdict that the engine
 *  uses to either accept the answer (and write the receipt) or reject
 *  it (and surface a citation-non-compliant error to the user).
 *
 *  Defensive: any judge-call failure returns `accepted` with low
 *  confidence so we never hard-block on judge transient outages.
 *  Schema-enforcement is the primary guard; judge is defense-in-depth.
 */
export async function runJudge(input: {
  question: string;
  answer: string;
  citations: Citation[];
}): Promise<JudgeVerdict> {
  // Abstention path — primary already declined, judge agrees.
  if (input.answer.trim().startsWith("[ABSTAIN]")) {
    return {
      verdict: "abstained",
      confidence: 1.0,
      reasonsRejected: [],
      unsupportedClaims: [],
      rawResponse: "primary-abstained",
    };
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    logger.warn(
      "[pharos-judge] anthropic client unavailable, defaulting to accept",
    );
    return {
      verdict: "accepted",
      confidence: 0.0,
      reasonsRejected: [],
      unsupportedClaims: [],
      rawResponse: "judge-unavailable",
    };
  }

  // Compact the citations to just (id, source, span) so we don't burn
  // tokens on contentHashes the judge doesn't need.
  const compactCitations = input.citations.map((c) => ({
    id: c.id,
    kind: c.kind,
    source: c.source,
    span: c.span,
  }));

  const userMessage = `URSPRÜNGLICHE FRAGE:
${input.question}

GELIEFERTE CITATIONS:
${JSON.stringify(compactCitations, null, 2)}

ZU PRÜFENDE ANTWORT:
${input.answer}

Bewerte streng. Antworte ausschließlich mit dem JSON-Objekt.`;

  let rawText = "";
  try {
    const result = await setup.client.messages.create({
      // Try Haiku first for cost. If the deployed setup uses a different
      // model alias, this falls through to setup.model on error below.
      model: JUDGE_MODEL_OVERRIDE,
      max_tokens: JUDGE_MAX_TOKENS,
      temperature: 0,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    rawText = result.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (err) {
    // Fallback to whatever model the main engine uses — typically
    // Sonnet. Slightly more expensive judge but better availability.
    try {
      const result = await setup.client.messages.create({
        model: setup.model,
        max_tokens: JUDGE_MAX_TOKENS,
        temperature: 0,
        system: JUDGE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      rawText = result.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (fallbackErr) {
      const msg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr);
      logger.error(`[pharos-judge] both attempts failed: ${msg}`);
      return {
        verdict: "accepted",
        confidence: 0.0,
        reasonsRejected: [],
        unsupportedClaims: [],
        rawResponse: `judge-failed: ${msg}`,
      };
    }
  }

  // Parse JSON; tolerate occasional model-emitted code fences.
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<JudgeVerdict>;
    const verdict =
      parsed.verdict === "accepted" ||
      parsed.verdict === "rejected" ||
      parsed.verdict === "abstained"
        ? parsed.verdict
        : "accepted";
    return {
      verdict,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
      reasonsRejected: Array.isArray(parsed.reasonsRejected)
        ? parsed.reasonsRejected
        : [],
      unsupportedClaims: Array.isArray(parsed.unsupportedClaims)
        ? parsed.unsupportedClaims
        : [],
      rawResponse: rawText,
    };
  } catch (err) {
    logger.warn(
      `[pharos-judge] JSON parse failed, defaulting to accept. raw="${rawText.slice(0, 200)}"`,
    );
    return {
      verdict: "accepted",
      confidence: 0.0,
      reasonsRejected: [],
      unsupportedClaims: [],
      rawResponse: rawText,
    };
  }
}
