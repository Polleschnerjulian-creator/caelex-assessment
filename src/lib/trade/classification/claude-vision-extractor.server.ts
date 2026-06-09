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
import {
  visionCacheKey,
  getCachedVision,
  setCachedVision,
} from "./vision-cache";

/** Per-extraction confidence. Same scale as the BAFA parser for UI
 *  consistency. */
export type AttributeConfidence = "high" | "medium" | "low";

/**
 * Per-value sanity-guard provenance (G7 / T-M17).
 *
 * The LLM here is ONLY an OCR front-end — it reads numbers/booleans off a
 * datasheet image. It must NEVER be able to STEER the downstream
 * classification by emitting an absurd value (a garbled or adversarial
 * datasheet injecting `apertureMeters: 999999999` to flip a controlled
 * item to "below threshold"). Each extracted value is therefore run
 * through a conservative physical-plausibility bound BEFORE it is allowed
 * to flow into classification.
 *
 * `passedSanity` records the verdict; `whyRejected` carries the reason
 * when a value was dropped, so the operator sees WHY the datasheet's claim
 * was not trusted. A value with `passedSanity: false` is FAIL-CLOSED: it
 * is never emitted as a populated attribute, so the three-valued matcher
 * sees it as UNKNOWN → PossibleMatch, never as a confident
 * below/above-threshold result.
 */
export interface AttributeGuardResult {
  /** True when the value passed its plausibility bound and is safe to use. */
  passedSanity: boolean;
  /** Present ONLY when `passedSanity` is false — the documented reason the
   *  value was rejected (out-of-range bound, non-finite, etc.). */
  whyRejected?: string;
}

/** A single Claude-extracted attribute. */
export interface VisionAttribute {
  attribute: AttributeName;
  /** Parsed value in the matcher's canonical unit (e.g. metres, GHz). */
  value: number | boolean | string;
  confidence: AttributeConfidence;
  /** One-sentence reason citing the PDF region/wording Claude relied on.
   *  Used by the UI to render an inline "why" tooltip. */
  reasoning: string;
  /** Per-value sanity-guard provenance (G7 / T-M17). Always present on an
   *  EMITTED attribute, and always `{ passedSanity: true }` — values that
   *  fail the guard are dropped before emission (fail-closed) and recorded
   *  in `warnings` instead, so they never flow into classification as if
   *  valid. The field is surfaced so the UI can show the guarded-OK badge
   *  alongside the existing reasoning + source. */
  guardResult: AttributeGuardResult;
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

// The extraction JSON is a bounded object: ~22 known attributes each a short
// scalar + confidence + reasoning string + a small warnings array. Worst-case
// ~300–400 tokens (verified in vision-cache.test.ts "output size guard").
// 1024 provides ~3× headroom while cutting billed output tokens by 2/3.
const MAX_OUTPUT_TOKENS = 1024;

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

// ─── Value-level sanity guard (G7 / T-M17) ─────────────────────────────
//
// The PROMPT_VOCABULARY whitelists attribute NAMES + their TYPE, but a
// whitelisted name with an absurd VALUE can still steer the verdict — a
// garbled or adversarial datasheet that gets Claude to OCR
// `apertureMeters: 999999999` would, unguarded, drive the parametric
// matcher to a confident (wrong) below/above-threshold result. The OCR
// LLM must NEVER be able to pick the verdict; this table is the hard
// physical bound that the EXTRACTED value must respect before it is
// allowed to flow into classification.
//
// Bounds are CONSERVATIVE and documented per attribute: the goal is to
// reject the physically-impossible / injection-grade outliers, NOT to
// second-guess a plausible-but-unusual spec. A value inside the bound is
// passed through untouched (no clamping — clamping would silently alter a
// human-reviewable number); a value outside the bound is DROPPED
// (fail-closed) and the reason recorded, so the three-valued matcher sees
// the attribute as UNKNOWN → PossibleMatch rather than a confident result
// driven by the datasheet's injected number.
//
// `min` is an EXCLUSIVE lower bound (values must be strictly > min) so a
// physically-meaningless 0 or negative magnitude is rejected; `max` is an
// INCLUSIVE upper bound. Every numeric attribute in PROMPT_VOCABULARY has
// an entry — a numeric attribute with no bound entry is treated as a guard
// failure (fail-closed: an un-bounded numeric value is not trusted).

interface NumericBound {
  /** Exclusive lower bound — value must be strictly greater than this. */
  min: number;
  /** Inclusive upper bound — value must be ≤ this. */
  max: number;
  /** Short human note documenting the physical basis of the bound, used in
   *  the rejection reason so the operator sees WHY the value was dropped. */
  note: string;
}

const NUMERIC_BOUNDS: ReadonlyMap<AttributeName, NumericBound> = new Map([
  // Optical / imaging geometry.
  [
    "apertureMeters",
    { min: 0, max: 100, note: "optical aperture in metres (>0, ≤100 m)" },
  ],
  [
    "gsdMeters",
    {
      min: 0,
      max: 100_000,
      note: "ground sample distance in metres (>0, ≤100 km)",
    },
  ],
  [
    "antennaDiameterM",
    { min: 0, max: 1000, note: "antenna diameter in metres (>0, ≤1000 m)" },
  ],
  [
    "peakWavelengthNm",
    {
      min: 0,
      max: 1_000_000,
      note: "peak wavelength in nm (>0, ≤1 mm = 1e6 nm)",
    },
  ],
  // Mass / mechanical.
  [
    "payloadKg",
    { min: 0, max: 1_000_000, note: "payload mass in kg (>0, ≤1e6 kg)" },
  ],
  // Distance / range / kinematics.
  [
    "rangeKm",
    {
      min: 0,
      max: 4_000_000,
      note: "operational range in km (>0, ≤ ~Earth–Moon, 4e6 km)",
    },
  ],
  [
    "deltaVMetersPerSecond",
    {
      min: 0,
      max: 100_000,
      note: "delta-v in m/s (>0, ≤100 km/s)",
    },
  ],
  // Propulsion.
  [
    "IspSeconds",
    {
      min: 0,
      max: 100_000,
      note: "specific impulse in seconds (>0, ≤1e5 s — well above any real thruster)",
    },
  ],
  // RF / signals.
  [
    "transmitPowerW",
    {
      min: 0,
      max: 10_000_000,
      note: "RF transmit power in watts (>0, ≤10 MW)",
    },
  ],
  [
    "frequencyGhz",
    { min: 0, max: 1000, note: "carrier frequency in GHz (>0, ≤1000 GHz)" },
  ],
  [
    "radarCenterFreqGhz",
    {
      min: 0,
      max: 1000,
      note: "radar centre frequency in GHz (>0, ≤1000 GHz)",
    },
  ],
  [
    "radarBandwidthMhz",
    {
      min: 0,
      max: 1_000_000,
      note: "radar bandwidth in MHz (>0, ≤1e6 MHz = 1 THz)",
    },
  ],
  // Radiation tolerance.
  [
    "radHardTidKrad",
    {
      min: 0,
      max: 100_000,
      note: "total ionising dose tolerance in krad(Si) (>0, ≤1e5 krad)",
    },
  ],
  [
    "seuRateErrorsPerBitDay",
    {
      // A rate per bit-day: physically a small positive fraction. Allow up
      // to 1 (one upset per bit per day is already pathological) with a
      // tiny floor so a 0 is treated as "not measured", not a real rate.
      min: 0,
      max: 1,
      note: "SEU rate in errors/bit-day (>0, ≤1 — a rate, must be a small fraction)",
    },
  ],
  // Spectral.
  [
    "spectralBandCount",
    {
      min: 0,
      max: 100_000,
      note: "spectral band count (>0, ≤1e5 — bounds hyperspectral sensors)",
    },
  ],
]);

/**
 * Run a coerced value through its per-attribute sanity guard.
 *
 * - number: must be finite AND inside the documented `NUMERIC_BOUNDS`
 *   entry for the attribute. A numeric attribute with NO bound entry
 *   fails closed (an un-bounded numeric value is not trusted). NaN /
 *   ±Infinity fail closed.
 * - boolean: always sane (a true/false carries no magnitude to injure).
 * - string: must be non-empty after trimming and within a generous length
 *   cap (so a megabyte of injected prose can't masquerade as `itemClass`).
 *
 * Returns `{ passedSanity: true }` for an accepted value, or
 * `{ passedSanity: false, whyRejected }` documenting the rejection. NEVER
 * clamps — a guard failure DROPS the value (fail-closed) so it cannot
 * steer the verdict; the caller records the reason.
 */
export function guardValue(
  attribute: AttributeName,
  value: number | boolean | string,
): AttributeGuardResult {
  if (typeof value === "boolean") {
    // A boolean has no magnitude to inject — it is always within sanity.
    return { passedSanity: true };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return {
        passedSanity: false,
        whyRejected: `"${attribute}": leerer String nach Trim — verworfen.`,
      };
    }
    // Cap string length so an injected wall of text can't ride in as a
    // taxonomy value. 256 chars is ample for any itemClass / taxonomy.
    if (trimmed.length > 256) {
      return {
        passedSanity: false,
        whyRejected: `"${attribute}": String zu lang (${trimmed.length} Zeichen, max 256) — als mögliche Injection verworfen.`,
      };
    }
    return { passedSanity: true };
  }

  // number
  if (!Number.isFinite(value)) {
    return {
      passedSanity: false,
      whyRejected: `"${attribute}": nicht-endlicher Wert (${String(value)}) — verworfen.`,
    };
  }
  const bound = NUMERIC_BOUNDS.get(attribute);
  if (!bound) {
    // Fail-closed: a numeric attribute we have no documented bound for is
    // not trusted to flow into classification unchecked.
    return {
      passedSanity: false,
      whyRejected: `"${attribute}": kein dokumentierter Plausibilitätsbereich hinterlegt — fail-closed verworfen.`,
    };
  }
  if (value <= bound.min || value > bound.max) {
    return {
      passedSanity: false,
      whyRejected: `"${attribute}": Wert ${value} außerhalb des plausiblen Bereichs (${bound.note}). Möglicher fehlerhafter/manipulierter Datensatz — verworfen, damit er die Einstufung nicht steuert.`,
    };
  }
  return { passedSanity: true };
}

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

  // Content-hash cache: byte-identical PDF → return cached extraction with
  // no Claude call. Only ok:true results are cached; failures fall through
  // so they remain retryable (see vision-cache.ts file header).
  const cacheKey = visionCacheKey(Buffer.from(pdfBytes));
  const cached = getCachedVision(cacheKey);
  if (cached) return cached;

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  try {
    const response = await setup.client.messages.create({
      model: setup.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text" as const,
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" as const },
        },
      ],
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
    const result: VisionExtractionResult = {
      ok: true,
      attributes,
      warnings,
      modelUsed: setup.model,
      latencyMs: Date.now() - startMs,
    };
    // Cache only successful extractions — failures remain retryable.
    setCachedVision(cacheKey, result);
    return result;
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

    // ── Value-level sanity guard (G7 / T-M17) ──
    // The OCR LLM may have read (or been steered to emit) an absurd value.
    // A value that fails its physical-plausibility bound is FAIL-CLOSED:
    // it is dropped here, never pushed into `attributes`, so it cannot
    // flow into classification as a confident below/above-threshold
    // result. The reason is recorded in `warnings` for the operator. The
    // attribute then reads as UNKNOWN to the three-valued matcher →
    // PossibleMatch, the conservative state. We also mark this attribute
    // as `seen` so a later (lower-priority) duplicate of an injected value
    // can't sneak back in.
    const guardResult = guardValue(typedName, coercedValue);
    if (!guardResult.passedSanity) {
      warnings.push(
        guardResult.whyRejected ??
          `Attribut "${name}": Wert hat die Plausibilitätsprüfung nicht bestanden — verworfen.`,
      );
      seenNames.add(typedName);
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
      // Always { passedSanity: true } on an EMITTED attribute — failures
      // never reach this point (they were dropped above). Surfaced so the
      // UI can render the guarded-OK badge next to reasoning + source.
      guardResult,
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
