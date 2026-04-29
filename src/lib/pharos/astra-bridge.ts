import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos ↔ Atlas Astra-Cross-Pillar-Bridge.
 *
 * Behörden-Astra kann zu rein juristischen Auslegungsfragen Atlas
 * (Anwalts-Plattform) konsultieren — ABER nur über eine streng
 * scope-gegated, signierte Bridge:
 *
 *   1. Behörden-Astra ruft `query_legal_interpretation` als Tool.
 *   2. Atlas-Anwalts-Astra wird mit dem REGULATORY-Frage-Snippet
 *      angesprochen — KEINE personenbezogenen Operator-Daten,
 *      KEINE Aufsichts-Aktenzeichen, KEINE Identifier.
 *   3. Antwort kommt zurück mit eigener Citation-Chain (Atlas-Library)
 *      und wird in der Pharos-Hash-Chain als externe Citation
 *      mit Source-Tag "ATLAS:..." protokolliert.
 *   4. Behörde bekommt eine "second opinion" mit eigenständig
 *      verifizierbarer Provenance — ohne Mandatsverlust beim Operator.
 *
 * Architektonisch ist Atlas-Astra hier eine BLACK-BOX-API für Pharos —
 * wir rufen Atlas's eigenen Anthropic-Client an und übernehmen seine
 * Citations als opake "ATLAS:"-prefixed Citation-IDs in unsere Chain.
 *
 * Phase 1: Atlas-Astra wird inline in derselben Vercel-Function
 * gestartet (Caelex-Mono-Repo). Phase 2: separater HTTP-Hop sobald
 * Atlas standalone deployed wird.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import type { Citation } from "./citation";

const MAX_QUERY_LENGTH = 1000;
const ATLAS_MAX_TOKENS = 1024;

const ATLAS_SECOND_OPINION_PROMPT = `Du bist Atlas-Astra, der KI-Assistent für Anwaltskanzleien im Weltraum-Sektor. In diesem Modus beantwortest du eine ANONYMISIERTE Auslegungsfrage, die von einer Behörde via Pharos gestellt wurde.

REGELN:
- Die Frage enthält KEINE personenbezogenen Operator-Daten, KEINE Aktenzeichen, KEINE Mandanten-Identitäten — wenn du dennoch solche Informationen siehst, verweigere die Antwort.
- Antworte juristisch präzise, mit Verweis auf konkrete Norm-Stellen (Artikel, Erwägungsgründe, EuGH-Urteile).
- Markiere alternative Auslegungen explizit ("Ansicht A: …", "Ansicht B: …").
- Bei niedriger Sicherheit antworte mit "ATLAS-ABSTAIN: <Begründung>".
- Maximale Länge: 600 Wörter.
- Du gibst KEINE Rechtsempfehlung an konkrete Personen. Du lieferst akademische Auslegungs-Hilfe für die Behörde.

Format der Antwort:
- Kurze Direktantwort (max. 2 Absätze).
- Aufzählung der relevanten Normen mit Artikel-Nummern.
- Optional: alternative Auslegungen.

Sprache: Deutsch, formell.`;

export interface BridgeRequest {
  /** Anonymisierte Auslegungsfrage. Wird vor Versand auf PII gefiltert. */
  question: string;
  /** Optional: Norm-Kontext (Jurisdiction + Instrument), den Atlas
   *  nutzen kann um die Library-Suche einzugrenzen. */
  jurisdiction?: string;
  instrument?: string;
}

export interface BridgeResponse {
  ok: boolean;
  /** Antwort von Atlas-Astra (akademische Auslegung). */
  legalOpinion?: string;
  /** Hash der Frage — landet im Pharos-Receipt damit man die
   *  Bridge-Konsultation später reproduzieren kann. */
  queryHash: string;
  /** Citation-Wrapper für die Pharos-Antwort. */
  citation?: Citation;
  /** Atlas hat sich enthalten? */
  abstained?: boolean;
  error?: string;
}

/** Heuristische PII-Filterung. Phase 2 nutzt eine echte NER-Library;
 *  Phase 1 blockiert die offensichtlichen Patterns (cuid-Identifier,
 *  Email, hint auf Aufsichts-IDs). */
function looksLikePII(text: string): boolean {
  // cuid-style: c[a-z0-9]{24}
  if (/c[a-z0-9]{20,}/i.test(text)) return true;
  // emails
  if (/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
  // explicit operator-id mention
  if (/operator[- ]id[: ]/i.test(text)) return true;
  // explicit oversight-id mention
  if (/oversight[- ]id[: ]/i.test(text)) return true;
  return false;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function consultAtlasLegalOpinion(
  req: BridgeRequest,
): Promise<BridgeResponse> {
  const queryHash = sha256Hex(
    JSON.stringify({
      question: req.question,
      jurisdiction: req.jurisdiction ?? null,
      instrument: req.instrument ?? null,
    }),
  );

  if (req.question.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      queryHash,
      error: `Query zu lang (${req.question.length} > ${MAX_QUERY_LENGTH}).`,
    };
  }
  if (looksLikePII(req.question)) {
    return {
      ok: false,
      queryHash,
      error:
        "Query enthält personenbezogene Daten oder Identifier — Bridge verweigert. Bitte anonymisieren.",
    };
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      ok: false,
      queryHash,
      error: "Atlas-Bridge nicht konfiguriert (Anthropic-Client fehlt).",
    };
  }

  // Build the user message with optional jurisdiction/instrument context.
  const userMessage = [
    `Behörden-Anfrage zur juristischen Auslegung:`,
    ``,
    req.question,
    ``,
    req.jurisdiction
      ? `Bitte Auslegung nach Recht von: ${req.jurisdiction}.`
      : "",
    req.instrument ? `Konkretes Instrument: ${req.instrument}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let rawText = "";
  try {
    const result = await setup.client.messages.create({
      model: setup.model,
      max_tokens: ATLAS_MAX_TOKENS,
      temperature: 0,
      system: ATLAS_SECOND_OPINION_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    rawText = result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-atlas-bridge] anthropic call failed: ${msg}`);
    return {
      ok: false,
      queryHash,
      error: `Atlas-Astra nicht erreichbar: ${msg}`,
    };
  }

  const abstained = rawText.trim().startsWith("ATLAS-ABSTAIN");
  const citation: Citation = {
    id: `ATLAS:${queryHash.slice(0, 16)}`,
    kind: "computation",
    source: `Atlas-Astra Legal-Opinion (anonymisiert)${
      req.jurisdiction ? " · " + req.jurisdiction : ""
    }${req.instrument ? " · " + req.instrument : ""}`,
    span: rawText.slice(0, 80),
    contentHash: `sha256:${sha256Hex(rawText).slice(0, 32)}`,
    retrievedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    legalOpinion: rawText,
    queryHash,
    citation,
    abstained,
  };
}
