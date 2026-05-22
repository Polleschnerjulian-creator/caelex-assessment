/**
 * Caelex Trade — § 734.4(a) Hard Carve-Out Table.
 *
 * Sprint Z19. Tier 1 per the Living Execution Plan.
 *
 * 15 CFR § 734.4(a) enumerates 9 numbered scenarios where the
 * de-minimis percentage thresholds (25% / 10%) DO NOT APPLY at all —
 * any non-zero value of the listed US-origin content makes the
 * foreign-made item subject to the EAR regardless of percentage.
 *
 * These checks run BEFORE percentage math in the Three-Gate Cascade
 * (Z18). If any carve-out hits, the cascade returns
 * subject_to_ear=true and de-minimis math is skipped entirely.
 *
 * The catastrophic case for European space exporters is § 734.4(a)(6)(i):
 *
 *   "0% de minimis for foreign-made items that incorporate U.S.-origin
 *    9x515 or 600-series items enumerated in paragraphs .a through .x
 *    of a 9x515 or 600-series ECCN, when destined for Country Group D:5."
 *
 * A 350 kg Earth-observation satellite built in Germany with a single
 * US-origin 9A515.d FPGA worth €180k, destined for China, becomes
 * subject to the EAR under this carve-out — even if the FPGA is only
 * 1.5% of the satellite's total value. The 25% de-minimis percentage
 * threshold never gets a chance to apply.
 *
 * Source: Blueprint 2 § 4. 15 CFR § 734.4(a)(1)-(9).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Minimal BOM component shape the carve-out checker needs. Mirrors the
 * structure in Blueprint 2 § 9.2 but with only the fields the carve-
 * outs actually consult.
 *
 * The full BOMComponent (consumed by the Z18 cascade) extends this
 * with FDP-relevant fields, valuation, and incorporation booleans.
 */
export interface BOMComponentForCarveOut {
  /** Stable id of the line in the parent BOM. */
  nodeId: string;
  /** Display name (used in rationale strings). */
  description?: string;
  /** Whether this line is US-origin. Non-US lines never trigger a carve-out. */
  usOrigin: boolean;
  /**
   * ECCN of the US-origin item, in the form received. Used for prefix
   * matching against the carve-out criteria. Non-classified content
   * passes "EAR99".
   */
  eccn: string;
  /**
   * Fair-market value of this line, in EUR. Used to verify the line
   * is non-zero (carve-outs trigger on "any non-zero value"). Caller
   * supplies EUR; calculator stays currency-agnostic.
   */
  fairMarketValueEur: number;
}

/**
 * Input to the carve-out checker. The country-group set is pre-resolved
 * (typically by the Z22 country-group resolver) so this module stays
 * pure: no I/O against eCFR or State Department lists.
 */
export interface NoDeMinimisCheckInput {
  /** ISO-3166 alpha-2 destination country code. */
  destinationCountry: string;
  /**
   * Country groups the destination belongs to. Must be pre-resolved by
   * the caller. Examples: ["D:5", "D:1", "D:3", "D:4"] for China;
   * ["E:1", "D:5"] for Iran; ["B"] for Brazil.
   *
   * Z22 (queued) will dynamically resolve this against
   *   - 15 CFR Supp. 1 to Part 740 (BIS country groups)
   *   - 22 CFR § 126.1 (State Dept arms embargo; controlling on conflict)
   */
  countryGroups: ReadonlySet<string>;
  /**
   * Whether the destination is Macau (treated separately from China-
   * proper for the 3B carve-outs).
   */
  isMacau?: boolean;
  /** BOM lines that may contain US-origin content. */
  bom: BOMComponentForCarveOut[];
  /**
   * Optional: known facts about the destination's end-use. Only used
   * by the (a)(3) and (a)(8)/(a)(9) advanced-node-IC carve-outs.
   */
  endUseHints?: {
    /** True if the destination is producing advanced-node logic or DRAM ICs. */
    advancedNodeIcFabrication?: boolean;
  };
}

/** Stable carve-out identifier. */
export type CarveOutId =
  | "734.4(a)(1)"
  | "734.4(a)(2)"
  | "734.4(a)(3)"
  | "734.4(a)(4)"
  | "734.4(a)(5)"
  | "734.4(a)(6)(i)"
  | "734.4(a)(6)(ii)"
  | "734.4(a)(7)"
  | "734.4(a)(8)"
  | "734.4(a)(9)";

export interface CarveOutHit {
  /** Which sub-paragraph of § 734.4(a) fired. */
  carveOutId: CarveOutId;
  /** Plain-language title for operator UI. */
  title: string;
  /** Detailed regulatory citation. */
  citation: string;
  /** BOM lines that triggered this carve-out. */
  matchingComponentNodeIds: string[];
  /** Plain-language rationale combining the matching components + destination. */
  rationale: string;
}

export interface NoDeMinimisCheckResult {
  /** True if ANY carve-out matched. */
  hit: boolean;
  /**
   * All matching carve-outs, in (a)(1)–(a)(9) order. Reporting all
   * hits (not just first) gives the operator the full audit trail —
   * useful when multiple sub-paragraphs apply (e.g. a 9A515.d FPGA to
   * China hits BOTH (a)(6)(i) for the 9x515 and potentially (a)(2)
   * for embedded encryption tech).
   */
  hits: CarveOutHit[];
  /** Always emitted — operator review is required. */
  disclaimer: string;
}

// ─── Country group constants ────────────────────────────────────────

/**
 * Country Group E:1 — comprehensive embargo (US). Per the controlling
 * 22 CFR § 126.1 list as of 2026-05-22.
 */
export const COUNTRY_GROUP_E1 = new Set<string>([
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
]);

/**
 * Country Group E:2 — supplementary embargo. Cuba historically; the
 * current Supp. 1 to Part 740 lists Cuba alone in E:2 (it's also
 * listed in E:1 by some readings; the BIS table treats them
 * distinctly).
 */
export const COUNTRY_GROUP_E2 = new Set<string>(["CU"]);

/**
 * Country Group D:5 — arms-embargo list. Per Blueprint 2 § 4 with the
 * 2026-02-03 Cambodia removal (91 FR 5091). 22 countries. The
 * controlling list is the State Department list under 22 CFR § 126.1;
 * Supp. 1 to Part 740 lags. Z22 dynamic resolver will replace this
 * constant.
 */
export const COUNTRY_GROUP_D5 = new Set<string>([
  "AF", // Afghanistan
  "BY", // Belarus
  "MM", // Burma (Myanmar)
  "CF", // Central African Republic
  "CN", // China (PRC)
  "CD", // Democratic Republic of the Congo
  "CU", // Cuba
  "ER", // Eritrea
  "HT", // Haiti
  "IR", // Iran
  "IQ", // Iraq
  "KP", // North Korea
  "LB", // Lebanon
  "LY", // Libya
  "NI", // Nicaragua
  "RU", // Russia
  "SO", // Somalia
  "SS", // South Sudan
  "SD", // Sudan
  "SY", // Syria
  "VE", // Venezuela
  "ZW", // Zimbabwe
]);

// ─── ECCN matchers ──────────────────────────────────────────────────

/**
 * Match "9x515 .a-.x" or "600-series .a-.x" (§ 734.4(a)(6)(i)).
 *
 * 9x515 means ECCNs starting "9A515", "9B515", "9C515", "9D515", or
 * "9E515". 600-series ECCNs end with "6XX" — pattern [0-9][A-E]6\d\d.
 * The .a-.x sub-paragraphs are the controlled enumeration; .y is the
 * de-controlled sub-paragraph (handled by (a)(6)(ii) instead).
 *
 * Examples that match:
 *   9A515.a.1, 9A515.b, 9A515.d, 9A515.x, 9A515.x-rw (our internal
 *   sub-id convention), 9E515.f, 9A610, 9B610.a, etc.
 *
 * Examples that do NOT match:
 *   9A515.y, 9A515.y.42 (route to (a)(6)(ii)); 9A001 (not 9x515 or
 *   600-series); USML:XV(a)(7)(i) (ITAR, not EAR).
 */
function isEccn9x515OrSixHundredSeriesAtoX(eccn: string): boolean {
  if (!eccn) return false;

  // Normalise: strip our internal "ECCN:" prefix if present.
  const normalised = eccn.replace(/^ECCN:/, "");

  // 9x515 family: 9A515, 9B515, 9C515, 9D515, 9E515 followed by a
  // sub-paragraph in .a through .x (NOT .y).
  const re9x515 = /^9[A-E]515(?:\.([a-x])(?:[._].*)?)?$/i;
  const m9x515 = re9x515.exec(normalised);
  if (m9x515) {
    // If no sub-paragraph captured (matched just "9A515" etc.), treat
    // as the full series — conservative: assume .a-.x scope (the
    // catch-all .y interpretation requires an explicit ".y" suffix).
    const sub = m9x515[1];
    if (!sub) return true;
    return sub.toLowerCase() !== "y";
  }

  // 600-series family: [0-9][A-E]6\d\d (e.g., 9A610, 0A604, 9B610.a).
  const re600 = /^[0-9][A-E]6\d\d(?:\.([a-x])(?:[._].*)?)?$/i;
  const m600 = re600.exec(normalised);
  if (m600) {
    const sub = m600[1];
    if (!sub) return true;
    return sub.toLowerCase() !== "y";
  }

  return false;
}

/**
 * Match "9x515 or 600-series .y" specifically (§ 734.4(a)(6)(ii)).
 * .y paragraphs are de-controlled sub-items that the IFR specifically
 * carved out into a different no-de-minimis trap.
 */
function isEccn9x515OrSixHundredSeriesY(eccn: string): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  return (
    /^9[A-E]515\.y(\.|$|[._])/i.test(normalised) ||
    /^[0-9][A-E]6\d\d\.y(\.|$|[._])/i.test(normalised)
  );
}

/**
 * Match the 9E003 turbine/rocket-engine technology subset:
 * 9E003.a.1 through .a.6, .a.8, .h, .i, .l (§ 734.4(a)(4)).
 */
function isEccn9E003TurbineTech(eccn: string): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  // .a.1, .a.2, .a.3, .a.4, .a.5, .a.6, .a.8 — note .a.7 is excluded
  if (/^9E003\.a\.[12345689](?:\b|$)/i.test(normalised)) {
    return true;
  }
  // .h, .i, .l
  return /^9E003\.[hil](?:\b|$)/i.test(normalised);
}

/** Match the 3B carve-out parameters (§ 734.4(a)(8)). */
function isEccn3B_a8Subset(eccn: string): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  // 3B001.a.4, .c, .d, .f.1, .f.5, .f.6, .k, .l, .m, .n, .p.2, .p.4, .r
  const patterns: RegExp[] = [
    /^3B001\.a\.4\b/i,
    /^3B001\.[cdklmnr]\b/i, // .c .d .k .l .m .n .r
    /^3B001\.f\.[156]\b/i, // .f.1 .f.5 .f.6
    /^3B001\.p\.[24]\b/i, // .p.2 .p.4
    /^3B002\.c\b/i,
  ];
  return patterns.some((p) => p.test(normalised));
}

/**
 * Match the "other 3B" Footnote-5 trap (§ 734.4(a)(9)) — 3B parameters
 * NOT covered by (a)(8). Catches the residual 3B001.* and 3B002.*
 * paragraphs that still trip the 0% trap for Macau / D:5.
 */
function isEccn3B_a9Residual(eccn: string): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  // Match 3B001.* or 3B002.* generally, then EXCLUDE the (a)(8) subset.
  const isOther3B = /^3B00[12]\b/i.test(normalised);
  return isOther3B && !isEccn3B_a8Subset(normalised);
}

/** Match 0A919.a.1 (§ 734.4(a)(5) military commodity carve-out). */
function isEccn0A919a1(eccn: string): boolean {
  if (!eccn) return false;
  return /^0A919\.a\.1\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/** Match 5E002 (§ 734.4(a)(2) encryption tech). */
function isEccn5E002(eccn: string): boolean {
  if (!eccn) return false;
  return /^5E002\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/** Match 3A001 (§ 734.4(a)(1) — U.S. semis into foreign computers). */
function isEccn3A001(eccn: string): boolean {
  if (!eccn) return false;
  return /^3A001\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/** Match 3B993.f.1 (§ 734.4(a)(3)). */
function isEccn3B993f1(eccn: string): boolean {
  if (!eccn) return false;
  return /^3B993\.f\.1\b/i.test(eccn.replace(/^ECCN:/, ""));
}

// ─── Constants ──────────────────────────────────────────────────────

const DISCLAIMER =
  "§ 734.4(a) carve-out output is SCREENING-LEVEL guidance only. A carve-out hit means the de-minimis percentage thresholds (25%/10%) do not apply — the foreign-made item is subject to the EAR regardless of US-content percentage, and a BIS license is generally required. Final determination requires qualified export-control counsel.";

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Run all 9 § 734.4(a) carve-outs against the input BOM + destination.
 * Returns every matching carve-out (not just the first) so the
 * operator audit trail captures the full set of triggers.
 *
 * Pure function — no I/O, no Prisma.
 */
export function checkNoDeMinimisCarveOuts(
  input: NoDeMinimisCheckInput,
): NoDeMinimisCheckResult {
  const hits: CarveOutHit[] = [];

  const inD5 = input.countryGroups.has("D:5");
  const inE1 = input.countryGroups.has("E:1");
  const inE2 = input.countryGroups.has("E:2");
  const isCN = input.destinationCountry === "CN";
  const isRU = input.destinationCountry === "RU";
  const isBY = input.destinationCountry === "BY";
  const isMacauOrD5 = (input.isMacau ?? false) || inD5;

  // Helper: select US-origin lines with non-zero value matching a predicate.
  const matchLines = (
    pred: (eccn: string) => boolean,
  ): BOMComponentForCarveOut[] =>
    input.bom.filter(
      (line) => line.usOrigin && line.fairMarketValueEur > 0 && pred(line.eccn),
    );

  // (a)(1) — Foreign computers > 4A003.b APP containing U.S. 3A001
  // semis to Computer Tier 3 destinations.
  //
  // We don't yet model APP thresholds or Computer Tier 3 explicitly;
  // conservative implementation: fire when a 3A001 line is present
  // AND destination is in D:5 (Tier-3 is a strict subset of D:5 for
  // our purposes; the older Computer-Tier system was sunset and now
  // these destinations all sit in D:5 / D:1).
  {
    const matching = matchLines(isEccn3A001);
    if (matching.length > 0 && inD5) {
      hits.push({
        carveOutId: "734.4(a)(1)",
        title:
          "0% de minimis: U.S. 3A001 semis in foreign computers above 4A003.b APP to Computer Tier 3 destinations",
        citation:
          "15 CFR § 734.4(a)(1) — Foreign-made computers above 4A003.b APP containing controlled U.S.-origin 3A001 semiconductors, destined for Computer Tier 3",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `US-origin 3A001 content (${matching.length} line(s)) destined for ${input.destinationCountry}; if the foreign computer exceeds the 4A003.b APP threshold, the de-minimis exclusion is unavailable.`,
      });
    }
  }

  // (a)(2) — Foreign-made encryption technology incorporating U.S.-
  // origin 5E002 → subject to the EAR REGARDLESS OF AMOUNT, anywhere.
  {
    const matching = matchLines(isEccn5E002);
    if (matching.length > 0) {
      hits.push({
        carveOutId: "734.4(a)(2)",
        title:
          "0% de minimis: foreign encryption tech incorporating U.S. 5E002 — applies regardless of destination or amount",
        citation:
          "15 CFR § 734.4(a)(2) — Foreign-produced encryption technology incorporating U.S.-origin 5E002 is subject to the EAR regardless of amount",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `US-origin 5E002 content present (${matching.length} line(s)); foreign encryption tech is subject to EAR globally with no de-minimis carve-out.`,
      });
    }
  }

  // (a)(3) — Equipment in 3B993.f.1 destined for advanced-node IC
  // fabrication, containing a U.S. Cat 3/4/5 IC, to Macau or D:5.
  {
    const matching = matchLines(isEccn3B993f1);
    if (
      matching.length > 0 &&
      isMacauOrD5 &&
      (input.endUseHints?.advancedNodeIcFabrication ?? false)
    ) {
      hits.push({
        carveOutId: "734.4(a)(3)",
        title:
          "0% de minimis: 3B993.f.1 advanced-node IC fab equipment + U.S. Cat 3/4/5 IC content to Macau/D:5",
        citation:
          "15 CFR § 734.4(a)(3) — Equipment in 3B993.f.1 destined for advanced-node IC fabrication, containing Cat 3/4/5 US IC, to Macau or D:5",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `3B993.f.1 equipment with US-origin Cat 3/4/5 content, destined for ${input.destinationCountry} (Macau/D:5), at an advanced-node IC fabrication facility.`,
      });
    }
  }

  // (a)(4) — U.S.-origin technology controlled by 9E003.a.1-.a.6, .a.8,
  // .h, .i, .l → NO de minimis ANYWHERE when redrawn, used, consulted
  // or otherwise commingled abroad. Turbine / rocket-engine hot-section
  // and FADEC tech.
  {
    const matching = matchLines(isEccn9E003TurbineTech);
    if (matching.length > 0) {
      hits.push({
        carveOutId: "734.4(a)(4)",
        title:
          "0% de minimis: U.S. 9E003.a.1-.6/.a.8/.h/.i/.l (turbine/rocket tech) — applies everywhere",
        citation:
          "15 CFR § 734.4(a)(4) — U.S.-origin technology controlled by 9E003.a.1 through .a.6, .a.8, .h, .i, .l has no de-minimis level when commingled abroad",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `US-origin 9E003 turbine/rocket-engine technology present (${matching.length} line(s)); no de-minimis carve-out applies regardless of destination.`,
      });
    }
  }

  // (a)(5) — Foreign-made "military commodities" incorporating 0A919.a.1
  // destined for D:5.
  {
    const matching = matchLines(isEccn0A919a1);
    if (matching.length > 0 && inD5) {
      hits.push({
        carveOutId: "734.4(a)(5)",
        title:
          "0% de minimis: foreign military commodity with U.S. 0A919.a.1 to D:5",
        citation:
          "15 CFR § 734.4(a)(5) — Foreign-made military commodities incorporating 0A919.a.1 items destined for Country Group D:5",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `US-origin 0A919.a.1 content in a foreign military commodity destined for ${input.destinationCountry} (Country Group D:5).`,
      });
    }
  }

  // (a)(6)(i) — THE CATASTROPHIC SPACE TRAP.
  // Foreign-made items incorporating U.S.-origin 9x515 or 600-series
  // items in paragraphs .a through .x, destined for D:5.
  {
    const matching = matchLines(isEccn9x515OrSixHundredSeriesAtoX);
    if (matching.length > 0 && inD5) {
      hits.push({
        carveOutId: "734.4(a)(6)(i)",
        title:
          "0% de minimis: 9x515 or 600-series .a-.x content to Country Group D:5 — THE CATASTROPHIC SPACE TRAP",
        citation:
          "15 CFR § 734.4(a)(6)(i) — Foreign-made items that incorporate U.S.-origin 9x515 or 600-series items enumerated in paragraphs .a through .x of a 9x515 or 600-series ECCN, when destined for Country Group D:5",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `Any non-zero value of US-origin 9x515 or 600-series .a-.x content (${matching.length} line(s)) destined for ${input.destinationCountry} (Country Group D:5) → de-minimis threshold collapses to 0%. The 25% percentage threshold does not apply. A BIS license is required, typically with policy of denial.`,
      });
    }
  }

  // (a)(6)(ii) — 9x515/600-series .y items to E:1, E:2, Belarus, PRC,
  // or Russia.
  {
    const matching = matchLines(isEccn9x515OrSixHundredSeriesY);
    if (matching.length > 0 && (inE1 || inE2 || isBY || isCN || isRU)) {
      hits.push({
        carveOutId: "734.4(a)(6)(ii)",
        title:
          "0% de minimis: 9x515 or 600-series .y content to E:1/E:2/Belarus/PRC/Russia",
        citation:
          "15 CFR § 734.4(a)(6)(ii) — Foreign-made items incorporating U.S.-origin 9x515 or 600-series .y items destined for Country Group E:1, E:2, Belarus, PRC, or Russia",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `US-origin 9x515 or 600-series .y content (${matching.length} line(s)) destined for ${input.destinationCountry} (E:1/E:2/BY/CN/RU).`,
      });
    }
  }

  // (a)(7) — OFAC overrides. Cuba (CU), Iran (IR) OFAC programs can
  // prohibit transactions notwithstanding de minimis percentage.
  // Conservative: fire when destination is CU or IR with ANY US-origin
  // controlled content (the actual OFAC determination depends on the
  // sanctions program; this surfaces the risk).
  if (input.destinationCountry === "CU" || input.destinationCountry === "IR") {
    const matching = input.bom.filter(
      (line) =>
        line.usOrigin && line.fairMarketValueEur > 0 && line.eccn !== "EAR99",
    );
    if (matching.length > 0) {
      hits.push({
        carveOutId: "734.4(a)(7)",
        title:
          "OFAC-administered controls (Cuba/Iran) may prohibit transaction notwithstanding de minimis",
        citation:
          "15 CFR § 734.4(a)(7) — OFAC programs (Cuba: 31 CFR Part 515; Iran: 31 CFR Parts 535, 560, 561) can prohibit transactions notwithstanding the EAR de-minimis exclusion",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `Destination is ${input.destinationCountry} with US-origin controlled content (${matching.length} line(s)). OFAC sanctions program governs in addition to the EAR; de-minimis percentage may not provide relief.`,
      });
    }
  }

  // (a)(8) — Specific 3B parameters (3B001.a.4/.c/.d/.f.1/.f.5/.f.6/.k-.n/.p.2/.p.4/.r
  // or 3B002.c) + Cat 3/4/5 US IC content, to Macau or D:5.
  {
    const matching = matchLines(isEccn3B_a8Subset);
    if (matching.length > 0 && isMacauOrD5) {
      hits.push({
        carveOutId: "734.4(a)(8)",
        title:
          "0% de minimis: specific 3B params (3B001.a.4/.c/.d/.f.1/.f.5/.f.6/.k-.n/.p.2/.p.4/.r OR 3B002.c) to Macau/D:5",
        citation:
          "15 CFR § 734.4(a)(8) — 3B001 specific subparas or 3B002.c with US-origin Cat 3/4/5 IC, to Macau or D:5",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `3B equipment matching the (a)(8) parameter set, destined for ${input.destinationCountry} (Macau/D:5).`,
      });
    }
  }

  // (a)(9) — Other 3B Footnote-5 FDP zero-threshold trap. 3B params NOT
  // in (a)(8), to Macau/D:5.
  {
    const matching = matchLines(isEccn3B_a9Residual);
    if (matching.length > 0 && isMacauOrD5) {
      hits.push({
        carveOutId: "734.4(a)(9)",
        title:
          "0% de minimis: other 3B Footnote-5 parameters (residual of (a)(8)) to Macau/D:5",
        citation:
          "15 CFR § 734.4(a)(9) — 3B equipment with parameters not in (a)(8) but still Footnote-5 scope, to Macau or D:5",
        matchingComponentNodeIds: matching.map((l) => l.nodeId),
        rationale: `Residual 3B equipment (outside the (a)(8) enumeration) destined for ${input.destinationCountry} (Macau/D:5).`,
      });
    }
  }

  return {
    hit: hits.length > 0,
    hits,
    disclaimer: DISCLAIMER,
  };
}
