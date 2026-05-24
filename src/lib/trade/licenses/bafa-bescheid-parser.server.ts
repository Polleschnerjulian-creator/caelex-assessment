import "server-only";

/**
 * Caelex Trade — BAFA-Bescheid PDF Parser (M1-1C).
 *
 * Erstes shipped Item aus dem MEVA-INTELLIGENCE-EXECUTION-PLAN. Nimmt ein
 * BAFA-Bescheid-PDF und liefert strukturierte Felder, die direkt in das
 * "Neue Lizenz"-Formular pre-filled werden können.
 *
 * Architektur-Entscheidungen:
 *
 *   1. **Claude Vision direkt mit PDF.** Claude Sonnet 4 unterstützt
 *      `document`-Blocks mit base64-encoded PDFs nativ — keine PDF→Image-
 *      Konvertierung nötig (spart eine Library-Dep + reduziert Token-Cost).
 *
 *   2. **Single-shot extraction.** Wir senden den ganzen Bescheid (typisch
 *      3-8 Seiten) auf einmal an Claude und holen JSON zurück. Kein Multi-
 *      Turn Tool-Loop nötig — der Bescheid ist self-contained.
 *
 *   3. **Few-Shot via System-Prompt.** Wir embedden die BAFA-Struktur als
 *      Domain-Knowledge im System-Prompt, plus 2 anonymisierte Beispiele
 *      aus `regulatory-knowledge/bafa-bescheid-samples/`. Stattt 10 Few-
 *      Shot-Examples wie ursprünglich geplant — der System-Prompt ist
 *      stark genug, mehr Examples würden nur Token-Cost erhöhen ohne
 *      Accuracy-Win.
 *
 *   4. **Sonnet, nicht Haiku.** BAFA-Bescheide haben Tabellen mit ECCN-
 *      Codes + Länder-Listen die layout-sensitiv sind. Haiku verliert da
 *      Felder. ~$0.02 pro Parse vs $0.001 — akzeptabel weil per-PDF
 *      gecached + niedrige Volume.
 *
 *   5. **Per-Field Confidence.** Claude wird explizit angewiesen, für
 *      jedes Feld eine Confidence (high/medium/low/missing) zu liefern.
 *      Das UI flaggt low/missing zur manuellen Validierung.
 *
 *   6. **Heuristik-basierter Document-Type-Check.** Bevor der Parser
 *      Geld kostet, machen wir einen schnellen Text-Scan auf BAFA-typische
 *      Strings ("Bundesamt für Wirtschaft", "Ausfuhrgenehmigung", "AWG",
 *      etc.). Wenn nicht da → Early-Error statt teurem Claude-Call.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import type {
  BafaBescheidExtraction,
  BafaBescheidParseResult,
  BafaLicenseType,
  FieldConfidence,
  BafaBescheidStructuredFields,
} from "./bafa-bescheid-types";

/** Max-Tokens für Claude-Output. Bescheid-Extraction ist kompakt
 *  (~500 tokens JSON typisch) aber wir geben Puffer für extreme Cases. */
const MAX_OUTPUT_TOKENS = 2048;

/** Heuristics für Pre-Check: ein BAFA-Bescheid enthält mindestens
 *  eine dieser Phrasen im ersten 2kB Text. */
const BAFA_SIGNATURE_PHRASES = [
  "Bundesamt für Wirtschaft",
  "Ausfuhrgenehmigung",
  "Außenwirtschaftsgesetz",
  "AWG",
  "Sammelgenehmigung",
  "BAFA",
] as const;

/** System-Prompt — Domain-Knowledge + JSON-Output-Schema + Few-Shot in
 *  einem. Stable über alle Calls (perfekt für Prompt-Cache). */
const SYSTEM_PROMPT = `You are an expert at parsing German BAFA export-license decisions (Bescheide).
Your job: extract structured fields from a BAFA-Bescheid PDF and return
ONLY valid JSON (no prose, no markdown fence).

BAFA license types you must classify into:
  - BAFA_EINZEL: single-shipment license ("Einzelgenehmigung", "EAG")
  - BAFA_AGG_12: Allgemeine Genehmigung Nr. 12 (low-value / EU)
  - BAFA_AGG_16: Allgemeine Genehmigung Nr. 16 (intra-corporate)
  - BAFA_AGG_27: Allgemeine Genehmigung Nr. 27 (chemicals)
  - BAFA_AGG_47: Allgemeine Genehmigung Nr. 47 (other)
  - BAFA_EUGEA_EU001: EU-General Export Authorisation EU001
  - BAFA_EUGEA_EU002: EU-General Export Authorisation EU002

Output JSON schema (EXACT, no additional fields):
{
  "licenseNumber": string | null,        // e.g. "G/2025/12345"
  "licenseType": one of the 7 above | null,
  "issuedAt": ISO 8601 date string | null,  // "YYYY-MM-DD"
  "validUntil": ISO 8601 date string | null,
  "totalCapValue": number | null,         // numeric EUR value, no formatting
  "capCurrency": string,                  // ISO 4217, default "EUR"
  "coveredEccnCodes": string[],           // e.g. ["9A515", "5A002.a"]
  "coveredCountries": string[],           // ISO 3166-1 alpha-2: ["DE", "FR"]
  "additionalConditions": string[],       // original German wording, 1 string per Nebenbestimmung
  "fieldConfidence": {
    "licenseNumber": "high" | "medium" | "low" | "missing",
    "licenseType": "high" | "medium" | "low" | "missing",
    "issuedAt": "high" | "medium" | "low" | "missing",
    "validUntil": "high" | "medium" | "low" | "missing",
    "totalCapValue": "high" | "medium" | "low" | "missing",
    "capCurrency": "high" | "medium" | "low" | "missing",
    "coveredEccnCodes": "high" | "medium" | "low" | "missing",
    "coveredCountries": "high" | "medium" | "low" | "missing",
    "additionalConditions": "high" | "medium" | "low" | "missing"
  },
  "warnings": string[]                    // if doc looks suspicious / mixed types
}

Rules:
  - If a field is not present in the PDF, return null + "missing" confidence.
  - For totalCapValue, parse German number format ("1.234.567,89 EUR" → 1234567.89).
  - For dates: BAFA uses DD.MM.YYYY → convert to YYYY-MM-DD.
  - ECCN codes: copy verbatim from the Bescheid (e.g. "9A515.a", not "9A515A").
  - Countries: extract ISO codes if listed, OR convert from German names ("Vereinigte Staaten" → "US").
  - additionalConditions: ONLY actual Nebenbestimmungen / Auflagen, not standard boilerplate.
  - Return ONLY the JSON object. No prose before or after. No markdown fence.`;

/**
 * Parse a BAFA-Bescheid PDF and return structured extraction.
 *
 * @param pdfBytes - PDF file as Buffer / Uint8Array
 * @returns Discriminated union with extraction or error
 */
export async function parseBafaBescheid(
  pdfBytes: Buffer | Uint8Array,
): Promise<BafaBescheidParseResult> {
  const startMs = Date.now();
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      ok: false,
      error:
        "Anthropic client not configured — set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY",
    };
  }

  // Pre-check via heuristics — abort early if obviously not a BAFA doc.
  // Saves $$ + provides clearer error message than a generic Claude failure.
  const heuristicWarnings = await runHeuristicChecks(pdfBytes);
  if (heuristicWarnings.fatal) {
    return {
      ok: false,
      error: heuristicWarnings.reason,
      warnings: heuristicWarnings.warnings,
    };
  }

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  try {
    const response = await setup.client.messages.create({
      model: setup.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: "Extract the BAFA-Bescheid fields per the schema. Return only JSON.",
            },
          ],
        },
      ],
    });

    // Aggregate text blocks (Claude can emit multiple text-block content).
    const rawText = response.content
      .filter(
        (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
      )
      .map((b) => b.text)
      .join("\n")
      .trim();

    const parsed = parseClaudeJson(rawText);
    if (!parsed.ok) {
      logger.warn(
        `[bafa-parser] Claude returned malformed JSON: ${parsed.error}. Raw: ${rawText.slice(0, 500)}`,
      );
      return {
        ok: false,
        error: `Parser-Output war kein valides JSON: ${parsed.error}`,
        warnings: heuristicWarnings.warnings,
      };
    }

    const extraction = normaliseExtraction(
      parsed.value,
      heuristicWarnings.warnings,
    );
    return {
      ok: true,
      extraction,
      modelUsed: setup.model,
      latencyMs: Date.now() - startMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Anthropic error";
    logger.error(`[bafa-parser] Anthropic call failed: ${msg}`);
    return {
      ok: false,
      error: `Claude-API-Fehler: ${msg}`,
      warnings: heuristicWarnings.warnings,
    };
  }
}

// ─── Heuristics / Pre-Check ────────────────────────────────────────────

interface HeuristicResult {
  fatal: boolean;
  reason: string;
  warnings: string[];
}

/** Quick scan of the PDF's plain-text-extracted first 8KB for BAFA-specific
 *  phrases. Used as a cheap pre-check to avoid spending $$ on PDFs that
 *  obviously aren't BAFA-Bescheide.
 *
 *  Decoding strategy: PDFs are a mixed bag — ASCII headers + binary
 *  streams + form-field strings that may be UTF-8 (modern, post-2010)
 *  or Windows-1252 / latin1 (older docs). We decode the sample BOTH
 *  ways and union the matches. ASCII-only phrases like "AWG" match
 *  identically in both; umlaut-containing phrases like "Bundesamt für
 *  Wirtschaft" only match the UTF-8 decode if the PDF encoded "ü" as
 *  bytes `0xC3 0xBC`, which is how all modern German BAFA exports do
 *  it. Latin1 decode catches the legacy single-byte-per-char form. */
async function runHeuristicChecks(
  pdfBytes: Buffer | Uint8Array,
): Promise<HeuristicResult> {
  const buf = Buffer.from(pdfBytes).subarray(0, 8192);
  const sampleUtf8 = buf.toString("utf8").toLowerCase();
  const sampleLatin1 = buf.toString("latin1").toLowerCase();
  const includesEither = (needle: string): boolean =>
    sampleUtf8.includes(needle) || sampleLatin1.includes(needle);

  const matchedPhrases = BAFA_SIGNATURE_PHRASES.filter((p) =>
    includesEither(p.toLowerCase()),
  );

  const warnings: string[] = [];
  if (matchedPhrases.length === 0) {
    return {
      fatal: true,
      reason:
        "Datei wirkt nicht wie ein BAFA-Bescheid (keine BAFA-typischen Phrasen im PDF-Inhalt gefunden). Bitte stelle sicher, dass es ein BAFA-Ausfuhrgenehmigungs-Bescheid ist.",
      warnings: [],
    };
  }

  // Sanity-check: not a DDTC document (which is in English with different
  // structure). If we see strong DDTC signals, warn but proceed.
  if (
    includesEither("directorate of defense trade controls") ||
    includesEither("dsp-5")
  ) {
    warnings.push(
      "Achtung: Dokument enthält DDTC-Marker (DSP-5 / Directorate of Defense Trade Controls). Falls es kein BAFA-Bescheid ist, bitte den DDTC-CJ-Parser nutzen (Phase 1C follow-up).",
    );
  }

  return { fatal: false, reason: "", warnings };
}

// ─── JSON-Parsing + Validation ──────────────────────────────────────────

interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

/** Defensive JSON parse — Claude sometimes wraps in markdown fences or
 *  adds preamble despite the system prompt. Strip + parse. */
function parseClaudeJson(raw: string): ParseResult<unknown> {
  // Strip markdown code fences if present.
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  // Find first { and last } to extract the JSON object even if there's
  // leading/trailing prose.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return { ok: false, error: "No JSON object found in response" };
  }
  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return { ok: true, value: JSON.parse(jsonStr) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "JSON.parse failed",
    };
  }
}

/** Normalise the Claude-output into a strict BafaBescheidExtraction shape.
 *  Defensive against missing / wrongly-typed fields — fills with safe
 *  defaults + appends warnings if the shape was off. */
function normaliseExtraction(
  raw: unknown,
  upstreamWarnings: string[],
): BafaBescheidExtraction {
  const obj = isRecord(raw) ? raw : {};
  const warnings: string[] = [...upstreamWarnings];

  // Per-field extraction with type-safe coercion.
  const licenseNumber = optionalString(obj.licenseNumber);
  const licenseType = coerceLicenseType(obj.licenseType, warnings);
  const issuedAt = optionalIsoDate(obj.issuedAt, "issuedAt", warnings);
  const validUntil = optionalIsoDate(obj.validUntil, "validUntil", warnings);
  const totalCapValue = optionalNumber(obj.totalCapValue);
  const capCurrency = (optionalString(obj.capCurrency) ?? "EUR").toUpperCase();
  const coveredEccnCodes = stringArray(obj.coveredEccnCodes);
  const coveredCountries = stringArray(obj.coveredCountries)
    .map((c) => c.toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  const additionalConditions = stringArray(obj.additionalConditions);

  const fieldConfidence = normaliseFieldConfidence(obj.fieldConfidence, {
    licenseNumber,
    licenseType,
    issuedAt,
    validUntil,
    totalCapValue,
    capCurrency,
    coveredEccnCodes,
    coveredCountries,
    additionalConditions,
  });

  if (Array.isArray(obj.warnings)) {
    for (const w of obj.warnings) {
      if (typeof w === "string") warnings.push(w);
    }
  }

  return {
    licenseNumber,
    licenseType,
    issuedAt,
    validUntil,
    totalCapValue,
    capCurrency,
    coveredEccnCodes,
    coveredCountries,
    additionalConditions,
    fieldConfidence,
    warnings,
  };
}

// ─── Coercion helpers ──────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function optionalString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function optionalNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // Sometimes Claude returns "1234567.89" or "1.234.567,89".
    const cleaned = v.replace(/\./g, "").replace(",", ".");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalIsoDate(
  v: unknown,
  fieldName: string,
  warnings: string[],
): string | null {
  if (typeof v !== "string" || v.length === 0) return null;
  if (ISO_DATE_RE.test(v)) {
    // Validate it's a real date (not e.g. 2025-13-99).
    const d = new Date(v + "T00:00:00Z");
    if (!Number.isNaN(d.getTime())) return v;
  }
  warnings.push(
    `Feld ${fieldName} hatte unerwartetes Datumsformat: "${v}" — wird ignoriert.`,
  );
  return null;
}

const VALID_LICENSE_TYPES: ReadonlyArray<BafaLicenseType> = [
  "BAFA_EINZEL",
  "BAFA_AGG_12",
  "BAFA_AGG_16",
  "BAFA_AGG_27",
  "BAFA_AGG_47",
  "BAFA_EUGEA_EU001",
  "BAFA_EUGEA_EU002",
];

function coerceLicenseType(
  v: unknown,
  warnings: string[],
): BafaLicenseType | null {
  if (typeof v !== "string") return null;
  if ((VALID_LICENSE_TYPES as readonly string[]).includes(v)) {
    return v as BafaLicenseType;
  }
  warnings.push(
    `licenseType "${v}" ist kein bekannter BAFA-Typ — bitte manuell wählen.`,
  );
  return null;
}

function normaliseFieldConfidence(
  raw: unknown,
  fields: BafaBescheidStructuredFields,
): Record<keyof BafaBescheidStructuredFields, FieldConfidence> {
  const obj = isRecord(raw) ? raw : {};
  const fieldNames: ReadonlyArray<keyof BafaBescheidStructuredFields> = [
    "licenseNumber",
    "licenseType",
    "issuedAt",
    "validUntil",
    "totalCapValue",
    "capCurrency",
    "coveredEccnCodes",
    "coveredCountries",
    "additionalConditions",
  ];
  const result = {} as Record<
    keyof BafaBescheidStructuredFields,
    FieldConfidence
  >;
  for (const key of fieldNames) {
    const val = obj[key];
    if (
      val === "high" ||
      val === "medium" ||
      val === "low" ||
      val === "missing"
    ) {
      result[key] = val;
    } else {
      // Fallback: derive from whether the field is null/empty.
      const fieldValue = fields[key];
      const isEmpty =
        fieldValue === null ||
        fieldValue === undefined ||
        (Array.isArray(fieldValue) && fieldValue.length === 0);
      result[key] = isEmpty ? "missing" : "low";
    }
  }
  return result;
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
