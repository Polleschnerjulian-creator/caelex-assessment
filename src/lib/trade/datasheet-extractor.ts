/**
 * Caelex Trade — Datasheet PDF Extractor (Sprint Z4a).
 *
 * Pure function that takes PDF bytes and returns the raw text plus a
 * structured `DatasheetExtraction` shape: typed attributes mapped to
 * the parametric-matcher vocabulary (`AttributeName` /
 * `ItemAttributeBag`) and per-attribute evidence spans so the
 * downstream classifier (Z4b) can cite *where in the datasheet* a
 * given value came from.
 *
 * Architecture:
 *   - Pure-function boundary. No DB, no network, no Anthropic call.
 *     A test can drop in a PDF buffer and assert the resulting
 *     extraction.
 *   - `unpdf` (already in package.json) is the PDF→text engine. It
 *     ships a serverless-friendly PDF.js build and works under both
 *     Node + Vercel Functions without canvas natives.
 *   - The attribute regexes are deliberately conservative — high
 *     precision over recall. False positives in a classification
 *     copilot are *worse* than missing values (operators trust the
 *     "we extracted X" claim and may skip review).
 *   - Each successful match produces an `EvidenceSpan`: the matched
 *     literal + ±60 chars of surrounding context. The Z4b tool / Z4d
 *     UI surfaces this verbatim so the operator can verify the
 *     extraction is correct without re-reading the datasheet.
 *   - When the PDF cannot be parsed (corrupt bytes, encrypted, etc.)
 *     the extractor returns `parseError` set on the result rather
 *     than throwing — the caller renders an empty-state instead of a
 *     crash.
 *
 * This file is the foundation for Sprint Z4b (Astra tool wrapper) and
 * Sprint Z4d (UI draft acceptance flow).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ItemAttributeBag } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Public output shape ────────────────────────────────────────────

/**
 * Set of "top-level" attributes that live as typed fields directly on
 * `ItemAttributeBag`. Anything in the Z3e extended vocabulary
 * (`spectralBandCount`, `peakWavelengthNm`, etc.) routes through the
 * `parametricAttributes` JSON bag instead — the matcher's
 * `readAttribute` already handles that fall-through.
 */
const TOP_LEVEL_BAG_ATTRIBUTES: ReadonlySet<string> = new Set([
  "apertureMeters",
  "payloadKg",
  "rangeKm",
  "IspSeconds",
  "deltaVMetersPerSecond",
  "gsdMeters",
  "transmitPowerW",
  "frequencyGhz",
  "radHardTidKrad",
  "seuRateErrorsPerBitDay",
  "isRadHardened",
  "isMilSpec",
  "isAntiJam",
  "isSpeciallyDesigned",
  "itemClass",
]);

/**
 * A single piece of evidence backing an extracted attribute. The
 * `quote` is the literal text from the datasheet that satisfied the
 * regex; `contextBefore` / `contextAfter` give ±60 chars of
 * surrounding text so the operator can see the quote in context
 * without re-opening the PDF.
 */
export interface EvidenceSpan {
  /**
   * The attribute this evidence supports. Drawn from the matcher's
   * full `AttributeName` union so Z3e extended-vocabulary
   * attributes are first-class even though they land in the
   * `parametricAttributes` JSON bag rather than a top-level field.
   */
  attribute: AttributeName;
  /** Raw literal text from the datasheet that matched. */
  quote: string;
  /** Up to 60 chars of text before the quote in the source. */
  contextBefore: string;
  /** Up to 60 chars of text after the quote in the source. */
  contextAfter: string;
  /** 1-based offset of the quote in the merged document text. */
  offset: number;
  /** Parsed numeric/boolean value derived from the quote. */
  parsedValue: number | boolean | string;
}

/**
 * The full output of `extractDatasheet`. Includes the raw text (for
 * downstream LLM analysis), the structured attribute bag (ready to
 * pass to `matchAgainstCrossWalk`), per-attribute evidence, and
 * extraction telemetry.
 */
export interface DatasheetExtraction {
  /** Merged page text from the PDF — full document body. */
  rawText: string;
  /** Number of pages in the source PDF (0 when parsing failed). */
  pageCount: number;
  /**
   * Structured attribute bag matching `ItemAttributeBag`. Only
   * attributes the extractor was *confident* about are populated —
   * other attributes stay undefined so the parametric matcher's
   * three-valued logic surfaces them as "operator to supply".
   */
  attributes: ItemAttributeBag;
  /**
   * Per-attribute evidence spans. The Z4d UI renders these next to
   * each draft field so the reviewer can verify the extraction
   * without leaving the page. Order: declaration order in the source.
   */
  evidence: EvidenceSpan[];
  /**
   * When set, the PDF could not be parsed. `rawText` will be empty
   * and `attributes` will be `{}`. The caller renders an upload-error
   * panel rather than a draft.
   */
  parseError?: string;
}

// ─── Attribute regex registry ───────────────────────────────────────

/**
 * Datasheet attributes the extractor can recognise. Each entry has:
 *   - a target attribute on `ItemAttributeBag`
 *   - one or more regexes (ordered by specificity — most specific
 *     pattern first)
 *   - a unit converter so the captured raw number becomes the
 *     canonical unit on the bag (e.g. mm → m, MHz → GHz)
 *   - a `parse` hook for non-numeric attributes (booleans, item
 *     classes).
 *
 * The regexes are case-insensitive and anchored on common datasheet
 * conventions: "aperture: 0.5 m", "TID 100 krad(Si)", "specifically
 * designed for spaceflight". They are intentionally narrow — a
 * datasheet writer who wants to defeat this can, but we trade recall
 * for precision (false positives are worse than missing values).
 */
interface AttributeExtractor {
  attribute: AttributeName;
  /** Regexes to try in order. First non-null match wins. */
  patterns: RegExp[];
  /**
   * Convert the FIRST capture group of a successful match into the
   * canonical unit on `ItemAttributeBag`. For pure-number attributes
   * this is `(s) => Number(s) * scaleFactor`; for booleans / strings
   * it's a typed parser.
   */
  parse: (
    matchedGroup: string,
    fullMatch: string,
  ) => number | boolean | string | null;
}

/**
 * Helper: build a numeric extractor with a unit-conversion factor.
 * The capture group must be the FIRST group in the regex.
 */
function numericExtractor(
  attribute: AttributeName,
  patterns: RegExp[],
  scale: number,
): AttributeExtractor {
  return {
    attribute,
    patterns,
    parse: (group) => {
      const n = Number(group);
      if (!isFinite(n)) return null;
      return n * scale;
    },
  };
}

/**
 * Helper: build a boolean extractor that fires when ANY of its
 * patterns match — typically used for "specially designed", "rad
 * hard", "mil-spec" type qualitative flags.
 */
function booleanExtractor(
  attribute: AttributeName,
  patterns: RegExp[],
): AttributeExtractor {
  return {
    attribute,
    patterns,
    parse: () => true,
  };
}

const ATTRIBUTE_EXTRACTORS: AttributeExtractor[] = [
  // ─── Aperture (USML XV(a)(7)(i) boundary, 0.50 m) ─────────────────
  numericExtractor(
    "apertureMeters",
    [
      // "aperture: 0.5 m" / "aperture 500 mm" / "primary aperture 0.5 metres"
      /\baperture[:\s]+(\d+(?:\.\d+)?)\s*m\b/i,
      /\baperture[:\s]+(\d+(?:\.\d+)?)\s*metres?\b/i,
    ],
    1, // already metres
  ),
  // Aperture given in mm — needs scaling. Separate extractor so the
  // unit conversion is explicit and testable.
  numericExtractor(
    "apertureMeters",
    [/\baperture[:\s]+(\d+(?:\.\d+)?)\s*mm\b/i],
    0.001,
  ),
  // ─── Payload mass (MTCR Cat. I — 500 kg cutoff) ───────────────────
  numericExtractor(
    "payloadKg",
    [
      /\bpayload\s+(?:mass|capacity)[:\s]+(\d+(?:\.\d+)?)\s*kg\b/i,
      /\bmax(?:imum)?\s+payload[:\s]+(\d+(?:\.\d+)?)\s*kg\b/i,
    ],
    1,
  ),
  // ─── Range (MTCR Cat. I — 300 km cutoff) ──────────────────────────
  numericExtractor(
    "rangeKm",
    [/\b(?:maximum|max|operational)?\s*range[:\s]+(\d+(?:\.\d+)?)\s*km\b/i],
    1,
  ),
  // ─── Isp (electric propulsion identification) ─────────────────────
  numericExtractor(
    "IspSeconds",
    [
      /\b(?:specific\s+impulse|I\s*sp|Isp)[:\s]+(\d+(?:\.\d+)?)\s*s(?:econds?)?\b/i,
    ],
    1,
  ),
  // ─── Delta-V (propulsion capability) ──────────────────────────────
  numericExtractor(
    "deltaVMetersPerSecond",
    [/\b(?:delta[-\s]?v|Δv|ΔV)[:\s]+(\d+(?:\.\d+)?)\s*m\/s\b/i],
    1,
  ),
  // ─── GSD (ground sample distance — EO classification driver) ──────
  numericExtractor(
    "gsdMeters",
    [
      /\bGSD[:\s]+(\d+(?:\.\d+)?)\s*m\b/i,
      /\bground\s+sample\s+distance[:\s]+(\d+(?:\.\d+)?)\s*m\b/i,
    ],
    1,
  ),
  // GSD in cm (common for sub-metre sensors)
  numericExtractor(
    "gsdMeters",
    [
      /\bGSD[:\s]+(\d+(?:\.\d+)?)\s*cm\b/i,
      /\bground\s+sample\s+distance[:\s]+(\d+(?:\.\d+)?)\s*cm\b/i,
    ],
    0.01,
  ),
  // ─── Transmit power (RF / MTCR) ───────────────────────────────────
  numericExtractor(
    "transmitPowerW",
    [
      /\b(?:transmit|tx)\s+power[:\s]+(\d+(?:\.\d+)?)\s*W\b/i,
      /\boutput\s+power[:\s]+(\d+(?:\.\d+)?)\s*W\b/i,
    ],
    1,
  ),
  // ─── Frequency (CCL 5A001 telecom thresholds) ─────────────────────
  numericExtractor(
    "frequencyGhz",
    [
      /\b(?:carrier|operating|center|centre)\s+frequency[:\s]+(\d+(?:\.\d+)?)\s*GHz\b/i,
      /\bfrequency[:\s]+(\d+(?:\.\d+)?)\s*GHz\b/i,
    ],
    1,
  ),
  // Frequency in MHz — convert to GHz
  numericExtractor(
    "frequencyGhz",
    [
      /\b(?:carrier|operating|center|centre)\s+frequency[:\s]+(\d+(?:\.\d+)?)\s*MHz\b/i,
    ],
    0.001,
  ),
  // ─── Radiation hardening — TID ────────────────────────────────────
  numericExtractor(
    "radHardTidKrad",
    [
      /\bTID[:\s]+(\d+(?:\.\d+)?)\s*krad(?:\(Si\))?\b/i,
      /\btotal\s+(?:ionising|ionizing)\s+dose[:\s]+(\d+(?:\.\d+)?)\s*krad(?:\(Si\))?\b/i,
    ],
    1,
  ),
  // ─── SEU rate (USML XV(d) criterion) ──────────────────────────────
  // Datasheets typically write "SEU rate < 1×10⁻¹⁰ errors/bit-day" or
  // "1e-10 errors per bit-day". Match the scientific notation.
  {
    attribute: "seuRateErrorsPerBitDay",
    patterns: [
      /\bSEU\s+(?:rate|cross-section)[<:\s]+(\d+(?:\.\d+)?(?:e[-+]?\d+)?)\s*(?:errors?|err)\/?(?:bit[-\s]?day|bit\s*-?\s*day)\b/i,
    ],
    parse: (group) => {
      const n = Number(group);
      return isFinite(n) ? n : null;
    },
  },
  // ─── Spectral band count (USML XV(a)(7) hyperspectral split) ──────
  numericExtractor(
    "spectralBandCount",
    [/\b(\d+)\s+spectral\s+bands?\b/i, /\bspectral\s+bands?[:\s]+(\d+)\b/i],
    1,
  ),
  // ─── Peak wavelength (USML XV(e)(3) FPA) ──────────────────────────
  numericExtractor(
    "peakWavelengthNm",
    [
      /\bpeak\s+wavelength[:\s]+(\d+(?:\.\d+)?)\s*nm\b/i,
      /\bwavelength[:\s]+(\d+(?:\.\d+)?)\s*nm\b/i,
    ],
    1,
  ),
  // Peak wavelength in µm — convert to nm
  numericExtractor(
    "peakWavelengthNm",
    [/\bpeak\s+wavelength[:\s]+(\d+(?:\.\d+)?)\s*(?:µm|um|micrometres?)\b/i],
    1000,
  ),
  // ─── Antenna diameter (USML XV(e)(1)) ─────────────────────────────
  numericExtractor(
    "antennaDiameterM",
    [/\bantenna\s+diameter[:\s]+(\d+(?:\.\d+)?)\s*m\b/i],
    1,
  ),
  // ─── Radar centre frequency (9A515.a.3) ──────────────────────────
  numericExtractor(
    "radarCenterFreqGhz",
    [/\bradar\s+(?:center|centre)\s+frequency[:\s]+(\d+(?:\.\d+)?)\s*GHz\b/i],
    1,
  ),
  // ─── Radar bandwidth (9A515.a.3 vs USML XV(a)(8)) ────────────────
  numericExtractor(
    "radarBandwidthMhz",
    [/\bradar\s+bandwidth[:\s]+(\d+(?:\.\d+)?)\s*MHz\b/i],
    1,
  ),
  // ─── Boolean qualifiers ───────────────────────────────────────────
  booleanExtractor("isRadHardened", [
    /\bradiation[-\s]?hardened\b/i,
    /\brad[-\s]?hard\b/i,
  ]),
  booleanExtractor("isMilSpec", [
    /\bMIL[-\s]?STD\b/i,
    /\bmilitary[-\s]?spec/i,
    /\bdesigned\s+to\s+military\s+specifications?\b/i,
  ]),
  booleanExtractor("isAntiJam", [
    /\banti[-\s]?jam(?:ming)?\b/i,
    /\banti[-\s]?spoof(?:ing)?\b/i,
  ]),
  booleanExtractor("isSpeciallyDesigned", [
    /\bspecially\s+designed\s+(?:for|to)\b/i,
    /\bspecifically\s+designed\s+(?:for|to)\b/i,
    /\bbesonders\s+konstruiert\b/i,
  ]),
  booleanExtractor("antennaActiveScanning", [
    /\bactive(?:ly)?\s+scanned?\s+(?:array|antenna)\b/i,
    /\bAESA\b/,
    /\belectronically[-\s]?steered\s+(?:array|antenna)\b/i,
  ]),
  booleanExtractor("antennaAdaptiveBeamforming", [
    /\badaptive\s+beam[-\s]?forming\b/i,
    /\bdigital\s+beam[-\s]?forming\b/i,
  ]),
];

// ─── itemClass heuristic (string attribute) ─────────────────────────

/**
 * Try to identify the item-class prefix from common keywords. Returns
 * null when nothing matches — the matcher will rely on parametric
 * predicates instead.
 *
 * The set of prefixes deliberately mirrors entries already populated
 * in `CONTROL_LIST_CROSS_WALK`'s `itemClass` predicates, so the
 * heuristic feeds into actual matches.
 */
function classifyItemClass(
  text: string,
): { value: string; quote: string; offset: number } | null {
  const heuristics: Array<{ regex: RegExp; itemClass: string }> = [
    {
      regex: /\bhall\s+(?:effect\s+)?thruster\b/i,
      itemClass: "propulsion.electric.hall",
    },
    {
      regex: /\bion\s+(?:engine|thruster)\b/i,
      itemClass: "propulsion.electric.ion",
    },
    {
      regex:
        /\b(?:remote\s+sensing|earth[-\s]?observation|EO)\s+(?:satellite|spacecraft)\b/i,
      itemClass: "spacecraft.remote_sensing.eo",
    },
    {
      regex: /\bsynthetic\s+aperture\s+radar\b/i,
      itemClass: "spacecraft.remote_sensing.sar",
    },
    {
      regex: /\bSAR\s+(?:satellite|spacecraft|payload)\b/,
      itemClass: "spacecraft.remote_sensing.sar",
    },
    {
      regex: /\brad[-\s]?hard\s+(?:FPGA|processor|microprocessor)\b/i,
      itemClass: "ic.radhard.processor",
    },
    {
      regex: /\bstar\s+tracker\b/i,
      itemClass: "spacecraft.adcs.star_tracker",
    },
    {
      regex: /\breaction\s+wheel\b/i,
      itemClass: "spacecraft.adcs.reaction_wheel",
    },
  ];

  for (const h of heuristics) {
    const m = h.regex.exec(text);
    if (m) {
      return {
        value: h.itemClass,
        quote: m[0],
        offset: m.index,
      };
    }
  }
  return null;
}

// ─── Evidence span builder ──────────────────────────────────────────

const CONTEXT_WIDTH = 60;

function buildEvidenceSpan(
  attribute: AttributeName,
  fullText: string,
  match: RegExpExecArray,
  parsedValue: number | boolean | string,
): EvidenceSpan {
  const quote = match[0];
  const offset = match.index;
  const start = Math.max(0, offset - CONTEXT_WIDTH);
  const end = Math.min(fullText.length, offset + quote.length + CONTEXT_WIDTH);
  return {
    attribute,
    quote,
    contextBefore: fullText.slice(start, offset),
    contextAfter: fullText.slice(offset + quote.length, end),
    offset,
    parsedValue,
  };
}

// ─── Core entry point ───────────────────────────────────────────────

/**
 * Extract a `DatasheetExtraction` from PDF bytes.
 *
 * Accepts `Uint8Array | ArrayBuffer | Buffer`. Returns an extraction
 * with `parseError` set when PDF parsing fails — never throws on
 * bad input. The caller renders the error inline.
 *
 * The `unpdf` PDF.js engine is dynamically imported so this module
 * stays cheap to load when only the types are needed (e.g. on the
 * client side of the Z4d UI).
 */
export async function extractDatasheet(
  bytes: Uint8Array | ArrayBuffer | Buffer,
): Promise<DatasheetExtraction> {
  const buffer = toUint8Array(bytes);

  let rawText = "";
  let pageCount = 0;
  let parseError: string | undefined;

  try {
    const { extractText } = await import("unpdf");
    const result = await extractText(buffer, { mergePages: true });
    rawText = typeof result.text === "string" ? result.text : "";
    pageCount = result.totalPages ?? 0;
  } catch (err) {
    parseError = err instanceof Error ? err.message : "Unknown PDF parse error";
    return {
      rawText: "",
      pageCount: 0,
      attributes: {},
      evidence: [],
      parseError,
    };
  }

  return extractFromText(rawText, pageCount);
}

/**
 * Run the attribute regexes against an already-extracted text buffer.
 * Split out from `extractDatasheet` for ergonomic testing (so tests
 * don't have to construct PDF bytes) and so the Z4b Astra tool can
 * re-use this when it already holds the text (e.g. from the file
 * upload's pre-parsed transcript).
 */
export function extractFromText(
  rawText: string,
  pageCount = 1,
): DatasheetExtraction {
  const attributes: ItemAttributeBag = {};
  const extendedBag: Record<string, unknown> = {};
  const evidence: EvidenceSpan[] = [];

  // Track which attributes have been populated to enforce
  // "first match wins" — works uniformly for both top-level fields
  // and extended-vocabulary fields routed into `parametricAttributes`.
  const seen = new Set<string>();

  for (const extractor of ATTRIBUTE_EXTRACTORS) {
    if (seen.has(extractor.attribute)) continue;

    for (const pattern of extractor.patterns) {
      // Reset lastIndex when the pattern carries the global flag.
      const regex = pattern.global
        ? new RegExp(pattern.source, pattern.flags)
        : pattern;
      const match = regex.exec(rawText);
      if (!match) continue;
      const captured = match[1] ?? match[0];
      const parsed = extractor.parse(captured, match[0]);
      if (parsed === null || parsed === undefined) continue;

      assignAttribute(attributes, extendedBag, extractor.attribute, parsed);
      evidence.push(
        buildEvidenceSpan(extractor.attribute, rawText, match, parsed),
      );
      seen.add(extractor.attribute);
      break;
    }
  }

  // itemClass heuristic
  const cls = classifyItemClass(rawText);
  if (cls && attributes.itemClass === undefined) {
    attributes.itemClass = cls.value;
    evidence.push({
      attribute: "itemClass",
      quote: cls.quote,
      contextBefore: rawText.slice(
        Math.max(0, cls.offset - CONTEXT_WIDTH),
        cls.offset,
      ),
      contextAfter: rawText.slice(
        cls.offset + cls.quote.length,
        Math.min(rawText.length, cls.offset + cls.quote.length + CONTEXT_WIDTH),
      ),
      offset: cls.offset,
      parsedValue: cls.value,
    });
  }

  // Attach extended-vocabulary attributes only when at least one
  // landed there — keeps the attribute bag clean for the common case.
  if (Object.keys(extendedBag).length > 0) {
    attributes.parametricAttributes = extendedBag;
  }

  return {
    rawText,
    pageCount,
    attributes,
    evidence,
  };
}

/**
 * Route a parsed value to the correct slot on the attribute bag.
 * Top-level attributes go on `ItemAttributeBag` directly; Z3e
 * extended-vocabulary attributes land in `parametricAttributes` so
 * the matcher's `readAttribute` JSON fall-through can find them.
 */
function assignAttribute(
  attributes: ItemAttributeBag,
  extendedBag: Record<string, unknown>,
  attribute: AttributeName,
  value: number | boolean | string,
): void {
  if (TOP_LEVEL_BAG_ATTRIBUTES.has(attribute)) {
    (attributes as Record<string, unknown>)[attribute] = value;
  } else {
    extendedBag[attribute] = value;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function toUint8Array(input: Uint8Array | ArrayBuffer | Buffer): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  // Buffer extends Uint8Array under Node — this branch covers
  // call-sites that pass a plain Buffer.
  return new Uint8Array(input as ArrayBufferLike);
}
