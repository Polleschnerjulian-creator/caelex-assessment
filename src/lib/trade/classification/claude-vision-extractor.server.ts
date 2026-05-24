import "server-only";

/**
 * Caelex Trade — Claude Vision Datasheet Extractor (M1-1A).
 *
 * Complement to `datasheet-extractor.ts` (the Z4a regex-based extractor).
 *
 * Why Vision in addition to regex?
 *
 *   - Regex catches well-formatted datasheet phrases ("aperture: 0.5 m")
 *     with high precision but misses values stored in TABLES, SCANNED
 *     PDFs (no extractable text), or unusual phrasings ("primary mirror
 *     diameter — 500 mm").
 *
 *   - Claude Vision reads the PDF as Claude sees it — including layout,
 *     so a table cell saying "Aperture | 0.5 m" works the same as inline
 *     text. Scanned PDFs become tractable because Claude OCRs internally.
 *
 *   - Per-attribute REASONING in the output (instead of just a regex
 *     match) so an operator can see WHY Claude concluded a value and
 *     spot-check the source location.
 *
 * Output is a strict subset of `DatasheetExtraction` attribute slots
 * (typed as `AttributeName`), with per-attribute confidence. A separate
 * merger (in the api route) combines Vision + regex results, preferring
 * regex matches when both agree (cheap to verify) and Vision matches
 * when regex found nothing.
 *
 * Architecture mirrors `bafa-bescheid-parser.server.ts`:
 *   1. `buildAnthropicClient()` for Gateway-or-direct routing
 *   2. Document block with base64-encoded PDF
 *   3. Strict JSON output with defensive cleanup
 *   4. Per-field confidence + warnings
 *   5. No PDF preprocessing — Claude Sonnet handles native PDFs
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

/** Per-extraction confidence. Same scale as the BAFA parser for UI
 *  consistency. */
export type AttributeConfidence = "high" | "medium" | "low";

/** A single Claude-extracted attribute. */
export interface VisionAttribute {
  attribute: AttributeName;
  /** Parsed value in the matcher's canonical unit (e.g. metres, GHz). */
  value: number | boolean | string;
  confidence: AttributeConfidence;
  /** One-sentence reason citing the PDF region/wording Claude relied on.
   *  Used by the UI to render an inline "why" tooltip. */
  reasoning: string;
}

/** Discriminated-union result. */
export type VisionExtractionResult =
  | {
      ok: true;
      attributes: VisionAttribute[];
      warnings: string[];
      modelUsed: string;
      latencyMs: number;
    }
  | { ok: false; error: string };

/** Vocabulary Claude is asked to extract. Subset of the full
 *  `AttributeName` union — the highest-signal attributes for
 *  classification decisions. Extended-vocabulary attributes (Z25, Z34c)
 *  are deliberately omitted from the prompt to keep token usage low;
 *  the regex extractor still covers them. */
const PROMPT_VOCABULARY: ReadonlyArray<{
  name: AttributeName;
  /** Short English label for the prompt — Claude reads natural-language
   *  field names better than the camelCase identifier. */
  description: string;
  /** Expected JSON type for the value. */
  type: "number" | "boolean" | "string";
  /** Unit hint passed to Claude so it returns canonical values. */
  unitHint?: string;
}> = [
  // ─── Tier 1 / core ─────────────────────────────────────────────────
  {
    name: "apertureMeters",
    description: "optical aperture diameter",
    type: "number",
    unitHint: "metres",
  },
  {
    name: "payloadKg",
    description: "payload mass capacity",
    type: "number",
    unitHint: "kg",
  },
  {
    name: "rangeKm",
    description: "maximum operational range",
    type: "number",
    unitHint: "km",
  },
  {
    name: "IspSeconds",
    description: "specific impulse Isp",
    type: "number",
    unitHint: "seconds",
  },
  {
    name: "deltaVMetersPerSecond",
    description: "delta-v capability",
    type: "number",
    unitHint: "m/s",
  },
  {
    name: "gsdMeters",
    description: "ground sample distance (EO sensors)",
    type: "number",
    unitHint: "metres",
  },
  {
    name: "transmitPowerW",
    description: "RF transmit power",
    type: "number",
    unitHint: "watts",
  },
  {
    name: "frequencyGhz",
    description: "carrier frequency",
    type: "number",
    unitHint: "GHz",
  },
  {
    name: "radHardTidKrad",
    description: "total ionising dose tolerance",
    type: "number",
    unitHint: "krad(Si)",
  },
  {
    name: "seuRateErrorsPerBitDay",
    description: "SEU rate",
    type: "number",
    unitHint: "errors/bit-day",
  },
  {
    name: "isRadHardened",
    description: "radiation-hardened design",
    type: "boolean",
  },
  {
    name: "isMilSpec",
    description: "MIL-STD / military specifications",
    type: "boolean",
  },
  {
    name: "isAntiJam",
    description: "anti-jam or anti-spoof features",
    type: "boolean",
  },
  {
    name: "isSpeciallyDesigned",
    description: 'phrase "specially/specifically designed for"',
    type: "boolean",
  },
  {
    name: "itemClass",
    description:
      'item-class taxonomy (e.g. "propulsion.electric.hall", "spacecraft.remote_sensing.sar")',
    type: "string",
  },
  // ─── Z3e tier-2 ─────────────────────────────────────────────────────
  {
    name: "spectralBandCount",
    description: "number of spectral bands",
    type: "number",
  },
  {
    name: "peakWavelengthNm",
    description: "peak operating wavelength",
    type: "number",
    unitHint: "nm",
  },
  {
    name: "radarCenterFreqGhz",
    description: "radar centre frequency",
    type: "number",
    unitHint: "GHz",
  },
  {
    name: "radarBandwidthMhz",
    description: "radar bandwidth",
    type: "number",
    unitHint: "MHz",
  },
  {
    name: "antennaDiameterM",
    description: "antenna diameter",
    type: "number",
    unitHint: "metres",
  },
  {
    name: "antennaActiveScanning",
    description: "active electronic scanning array / AESA",
    type: "boolean",
  },
  {
    name: "antennaAdaptiveBeamforming",
    description: "adaptive / digital beam-forming",
    type: "boolean",
  },
];

const MAX_OUTPUT_TOKENS = 3072;

const SYSTEM_PROMPT = buildSystemPrompt();

function buildSystemPrompt(): string {
  const attributeLines = PROMPT_VOCABULARY.map(
    (a) =>
      `  "${a.name}": ${a.description}${a.unitHint ? ` — return as ${a.unitHint}` : ""} → ${a.type === "boolean" ? "true|false|null" : a.type === "number" ? "number|null" : "string|null"}`,
  ).join("\n");

  return `You extract structured technical attributes from satellite / space-hardware datasheet PDFs.

Your job: read the PDF and identify values for the attribute vocabulary below. For each attribute you can confidently extract, emit ONE entry in the output array. SKIP attributes that aren't present in the PDF — do not guess.

Attributes to look for (with units):
${attributeLines}

Output schema (EXACT — return ONLY this JSON, no prose, no markdown fence):
{
  "attributes": [
    {
      "name": "<one of the attribute names above>",
      "value": <number, boolean, or string — canonical unit per spec above>,
      "confidence": "high" | "medium" | "low",
      "reasoning": "<one short sentence citing the PDF location or wording>"
    }
  ],
  "warnings": [
    "<optional — only if the PDF looks odd: scanned-only, multiple products mixed, foreign-language, etc.>"
  ]
}

Rules:
  - Convert ALL units to the canonical form listed above. Datasheet says "0.5 m aperture" → value: 0.5. Datasheet says "500 mm aperture" → ALSO value: 0.5. Datasheet says "1.2 GHz" → value: 1.2. Datasheet says "1200 MHz" → frequencyGhz: 1.2.
  - For "itemClass", use the taxonomy notation (lowercase, dot-separated). Examples: "propulsion.electric.hall", "propulsion.electric.ion", "spacecraft.remote_sensing.eo", "spacecraft.remote_sensing.sar", "ic.radhard.processor", "avionics.attitude.star_tracker", "avionics.attitude.reaction_wheel". Skip if the datasheet doesn't clearly indicate one of these.
  - confidence: "high" when the value is in a labelled spec table or unambiguous prose; "medium" when phrasing is informal but clear; "low" when you're inferring or the value could plausibly be misread.
  - reasoning: brief — "Aperture row in spec table on page 2", not full sentences with the actual numbers.
  - DO NOT include attributes you couldn't find. Empty arrays are fine.
  - DO NOT invent attribute names. Only the ones in the vocabulary above.
  - Return ONLY valid JSON. No prose before or after. No markdown fence.`;
}

const VALID_ATTR_NAMES: ReadonlySet<string> = new Set(
  PROMPT_VOCABULARY.map((v) => v.name),
);
const ATTR_TYPE_MAP: ReadonlyMap<string, "number" | "boolean" | "string"> =
  new Map(PROMPT_VOCABULARY.map((v) => [v.name, v.type]));

/**
 * Extract attributes from a datasheet PDF using Claude Vision.
 *
 * Returns a discriminated union. Never throws on API failure — the
 * caller renders the error inline.
 */
export async function extractDatasheetViaVision(
  pdfBytes: Buffer | Uint8Array,
): Promise<VisionExtractionResult> {
  const startMs = Date.now();
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      ok: false,
      error:
        "Anthropic client not configured — set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY",
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
              text: "Extract the datasheet attributes per the schema. Return only JSON.",
            },
          ],
        },
      ],
    });

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
        `[vision-extractor] Claude returned malformed JSON: ${parsed.error}. Raw: ${rawText.slice(0, 500)}`,
      );
      return {
        ok: false,
        error: `Parser-Output war kein valides JSON: ${parsed.error}`,
      };
    }

    const { attributes, warnings } = normaliseExtraction(parsed.value);
    return {
      ok: true,
      attributes,
      warnings,
      modelUsed: setup.model,
      latencyMs: Date.now() - startMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Anthropic error";
    logger.error(`[vision-extractor] Anthropic call failed: ${msg}`);
    return { ok: false, error: `Claude-API-Fehler: ${msg}` };
  }
}

// ─── JSON parse + normalise ────────────────────────────────────────────

interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

function parseClaudeJson(raw: string): ParseResult<unknown> {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
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

interface NormalisedExtraction {
  attributes: VisionAttribute[];
  warnings: string[];
}

function normaliseExtraction(raw: unknown): NormalisedExtraction {
  const obj = isRecord(raw) ? raw : {};
  const warnings: string[] = [];

  if (Array.isArray(obj.warnings)) {
    for (const w of obj.warnings) {
      if (typeof w === "string" && w.length > 0) warnings.push(w);
    }
  }

  const rawAttrs = Array.isArray(obj.attributes) ? obj.attributes : [];
  const attributes: VisionAttribute[] = [];
  const seenNames = new Set<AttributeName>();

  for (const entry of rawAttrs) {
    if (!isRecord(entry)) continue;
    const name = entry.name;
    if (typeof name !== "string" || !VALID_ATTR_NAMES.has(name)) {
      if (typeof name === "string") {
        warnings.push(`Unbekannter Attribut-Name verworfen: "${name}"`);
      }
      continue;
    }
    // Dedupe — if Claude returned the same attribute twice, take the
    // first (higher position = higher Claude-internal priority).
    const typedName = name as AttributeName;
    if (seenNames.has(typedName)) continue;

    const expectedType = ATTR_TYPE_MAP.get(name);
    const coercedValue = coerceValue(entry.value, expectedType);
    if (coercedValue === null) {
      warnings.push(
        `Attribut "${name}" mit nicht-konvertierbarem Wert verworfen: ${JSON.stringify(entry.value)}`,
      );
      continue;
    }

    const confidence = normaliseConfidence(entry.confidence);
    const reasoning =
      typeof entry.reasoning === "string" && entry.reasoning.length > 0
        ? entry.reasoning
        : "Quelle: PDF (Claude Vision)";

    attributes.push({
      attribute: typedName,
      value: coercedValue,
      confidence,
      reasoning,
    });
    seenNames.add(typedName);
  }

  return { attributes, warnings };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceValue(
  v: unknown,
  expected: "number" | "boolean" | "string" | undefined,
): number | boolean | string | null {
  if (expected === "boolean") {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const lower = v.toLowerCase().trim();
      if (lower === "true" || lower === "yes" || lower === "ja") return true;
      if (lower === "false" || lower === "no" || lower === "nein") return false;
    }
    return null;
  }
  if (expected === "number") {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      // Two formats to handle:
      //   US:     "1234.56" or "1,234.56"  → decimal=dot,  thousands=comma
      //   German: "1234,56" or "1.234,56"  → decimal=comma, thousands=dot
      // Heuristic: a comma in the string means German format (because in
      // US format the comma is only a thousands separator and Claude
      // typically returns canonical strings; if BOTH dots and commas
      // are present, the rightmost is the decimal separator).
      let cleaned = v.trim();
      const hasComma = cleaned.includes(",");
      const hasDot = cleaned.includes(".");
      if (hasComma && hasDot) {
        // Mixed → rightmost separator is the decimal. Other separator
        // is the thousands separator and gets stripped.
        const lastComma = cleaned.lastIndexOf(",");
        const lastDot = cleaned.lastIndexOf(".");
        if (lastComma > lastDot) {
          // German: dot=thousands, comma=decimal
          cleaned = cleaned.replace(/\./g, "").replace(",", ".");
        } else {
          // US: comma=thousands, dot=decimal
          cleaned = cleaned.replace(/,/g, "");
        }
      } else if (hasComma) {
        // Only comma — assume German decimal.
        cleaned = cleaned.replace(",", ".");
      }
      // else only dot or no separator → leave as-is.
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  if (expected === "string") {
    return typeof v === "string" && v.length > 0 ? v : null;
  }
  return null;
}

function normaliseConfidence(v: unknown): AttributeConfidence {
  if (v === "high" || v === "medium" || v === "low") return v;
  return "low";
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
