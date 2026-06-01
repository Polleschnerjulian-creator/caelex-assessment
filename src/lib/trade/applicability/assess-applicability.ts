/**
 * Caelex Trade — Export-Control Applicability Triage (pure rule engine).
 *
 * Answers the first-time owner's real first question: "Does export control
 * even apply to us, and WHICH regimes?" — as a conservative, transparent
 * TRIAGE. This is NOT legal advice and NOT item classification.
 *
 * ─── What this module does ────────────────────────────────────────────
 * Maps a short answer set → a verdict per regime (EU Dual-Use, DE national/
 * BAFA, US EAR, US ITAR, MTCR, Wassenaar), each tagged clearly-applies /
 * likely-applies / out-of-scope-on-these-facts, with a plain-German reason
 * and a seed payload that the app uses to narrow classification, screening,
 * and the home shortlist.
 *
 * ─── What this module does NOT do ────────────────────────────────────
 * - Classify a specific item (no ECCN / USML / Anlage-AL).
 * - Decide whether a specific shipment is allowed (that's the operation
 *   assistant + license-determination.ts).
 * - Screen any party (that's screen-party.server.ts).
 * - Produce a Güterlistenauskunft or a legal opinion.
 * - Ever output a confident "this regime does NOT apply" — the most
 *   negative verdict is OUT_OF_SCOPE_ON_THESE_FACTS, always pairing a
 *   mandatory "bitte fachlich bestätigen" reminder.
 *
 * Honesty rules (enforced + tested): doubt always rounds UP to
 * LIKELY_APPLIES (R2); US controls are sticky and can only be ADDED by
 * US-signal answers, never silently cleared (R3); out-of-scope is only
 * reachable via explicit "no" answers and is always grey-with-a-warning.
 *
 * PURE — no DB, no HTTP, no async, no Date.now, no randomness.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Rule-set version (bump when the boundaries change) ───────────────
export const APPLICABILITY_RULE_VERSION = 1;

// ─── Mandatory disclaimer (single source; reused by UI + copy) ────────
export const APPLICABILITY_DISCLAIMER =
  "Diese Einordnung ist eine vorläufige Orientierung auf Screening-Niveau — " +
  "keine Rechtsberatung und kein Ersatz für eine qualifizierte " +
  "exportkontrollrechtliche Beratung. Insbesondere die Aussage, ob ein Regime " +
  "zutrifft oder nicht zutrifft, muss fachlich bestätigt werden (BAFA, BIS, " +
  "oder die zuständige nationale Behörde). Im Zweifel gilt: ein Regime kann zutreffen.";

/**
 * Marker substring guaranteed to appear in every OUT_OF_SCOPE reason
 * (R1). Tests assert on it so the "no confident no" rule can't regress.
 */
export const CONFIRM_MARKER = "bitte fachlich bestätigen";

// ─── Input model (the answers) ────────────────────────────────────────
export type CountryCode = string; // ISO-3166-1 alpha-2
export type YesNoUnsure = "yes" | "no" | "unsure";

export type ProductKind =
  | "hardware"
  | "software"
  | "technology"
  | "service_only"
  | "unsure";

export type DomainSignal =
  | "satellite"
  | "launch_propulsion"
  | "ground_station"
  | "rf_payload"
  | "imaging_eo_sar"
  | "none"
  | "unsure";

export type TransferScope =
  | "none"
  | "intra_eu_only"
  | "outside_eu"
  | "global"
  | "unsure";

export interface ApplicabilityAnswers {
  establishmentCountry: CountryCode | "EU" | "NON_EU";
  productKinds: ProductKind[];
  domainSignals: DomainSignal[];
  hasUsOriginContent: YesNoUnsure;
  hasUsPersonOrTechNexus: YesNoUnsure;
  hasMilitaryOrDefenseNexus: YesNoUnsure;
  transfersAbroad: TransferScope;
  destinationCountries?: CountryCode[];
}

// ─── Output model (the result) ────────────────────────────────────────
export type Regime =
  | "EU_DUAL_USE"
  | "DE_NATIONAL"
  | "US_EAR"
  | "US_ITAR"
  | "MTCR"
  | "WASSENAAR";

export type Applicability =
  | "CLEARLY_APPLIES"
  | "LIKELY_APPLIES"
  | "OUT_OF_SCOPE_ON_THESE_FACTS";

export interface RegimeVerdict {
  regime: Regime;
  applicability: Applicability;
  reason: string;
  copyKey: string;
  basis: Array<keyof ApplicabilityAnswers>;
  fromUncertainty: boolean;
}

export type Headline = "VIELE_REGIME" | "EINIGE_REGIME" | "ORIENTIERUNG_NÖTIG";

export interface ApplicabilitySeed {
  primaryExportJurisdiction: string | null;
  preferredRegimes: string[];
  hasItarItems: boolean;
  hasEarItems: boolean;
  hasForeignNationals: boolean;
  companyTypes: string[];
  screeningListHints: string[];
}

export interface ApplicabilityResult {
  verdicts: RegimeVerdict[]; // exactly six, deterministic order
  headline: Headline;
  seed: ApplicabilitySeed;
  disclaimer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const EU_OR_DE = (c: ApplicabilityAnswers["establishmentCountry"]): boolean =>
  c === "EU" || (c !== "NON_EU" && c.toUpperCase() !== "GB" && isEuIso(c));

// Minimal EU-27 ISO set for the establishment check. Kept local + tiny on
// purpose (we don't need the full screening list here, only "is the seat
// in the EU"). NON_EU / "EU" pseudo-codes are handled by the callers.
const EU27 = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);
function isEuIso(c: string): boolean {
  return EU27.has(c.toUpperCase());
}

function hasControllableProduct(a: ApplicabilityAnswers): boolean {
  return a.productKinds.some(
    (p) => p === "hardware" || p === "software" || p === "technology",
  );
}
function productOnlyService(a: ApplicabilityAnswers): boolean {
  return (
    a.productKinds.length > 0 &&
    a.productKinds.every((p) => p === "service_only")
  );
}
function productUnknown(a: ApplicabilityAnswers): boolean {
  return a.productKinds.length === 0 || a.productKinds.includes("unsure");
}
function reachesTransfer(a: ApplicabilityAnswers): boolean {
  return a.transfersAbroad !== "none";
}

// ─── Engine ───────────────────────────────────────────────────────────
export function assessApplicability(
  a: ApplicabilityAnswers,
): ApplicabilityResult {
  const verdicts: RegimeVerdict[] = [
    euDualUse(a),
    deNational(a),
    usEar(a),
    usItar(a),
    mtcr(a),
    wassenaar(a),
  ];

  // Deterministic display order: clearly → likely → out-of-scope, then a
  // stable regime tiebreak so output is reproducible (determinism test).
  const RANK: Record<Applicability, number> = {
    CLEARLY_APPLIES: 0,
    LIKELY_APPLIES: 1,
    OUT_OF_SCOPE_ON_THESE_FACTS: 2,
  };
  const ORDER: Regime[] = [
    "EU_DUAL_USE",
    "DE_NATIONAL",
    "US_EAR",
    "US_ITAR",
    "MTCR",
    "WASSENAAR",
  ];
  verdicts.sort(
    (x, y) =>
      RANK[x.applicability] - RANK[y.applicability] ||
      ORDER.indexOf(x.regime) - ORDER.indexOf(y.regime),
  );

  const clearlyCount = verdicts.filter(
    (v) => v.applicability === "CLEARLY_APPLIES",
  ).length;
  const headline: Headline =
    clearlyCount >= 3
      ? "VIELE_REGIME"
      : clearlyCount >= 1
        ? "EINIGE_REGIME"
        : "ORIENTIERUNG_NÖTIG";

  return {
    verdicts,
    headline,
    seed: buildSeed(a, verdicts),
    disclaimer: APPLICABILITY_DISCLAIMER,
  };
}

// ─── Per-regime rules ─────────────────────────────────────────────────

function euDualUse(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "EU_DUAL_USE" as const, copyKey: "eu_dual_use" };
  const inEu = EU_OR_DE(a.establishmentCountry);

  if (inEu && hasControllableProduct(a)) {
    return {
      ...base,
      applicability: "CLEARLY_APPLIES",
      reason:
        "EU-Ansässigkeit + handelbares Gut → die EU-Dual-Use-Verordnung (EU) 2021/821 ist euer Grundregime.",
      basis: ["establishmentCountry", "productKinds"],
      fromUncertainty: false,
    };
  }
  if (inEu && (productOnlyService(a) || productUnknown(a))) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "In der EU ansässig — auch technische Unterstützung/Software kann von der EU-Dual-Use-VO erfasst sein; sobald ein konkretes Gut feststeht, klären.",
      basis: ["establishmentCountry", "productKinds"],
      fromUncertainty: productUnknown(a),
    };
  }
  // Non-EU establishment: never a clean "no" — re-export of EU/US-origin
  // items can still pull in EU/extraterritorial rules.
  if (!hasControllableProduct(a) && !reachesTransfer(a)) {
    return {
      ...base,
      applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
      reason: `Außerhalb der EU ansässig, kein handelbares Gut und keine Übermittlung angegeben — auf dieser Basis nicht im Anwendungsbereich der EU-Dual-Use-VO; ${CONFIRM_MARKER}.`,
      basis: ["establishmentCountry", "productKinds", "transfersAbroad"],
      fromUncertainty: false,
    };
  }
  return {
    ...base,
    applicability: "LIKELY_APPLIES",
    reason:
      "Außerhalb der EU ansässig — bei Re-Export von Gütern mit EU-/US-Ursprung können dennoch EU-Regeln greifen; fachlich klären.",
    basis: ["establishmentCountry", "productKinds", "transfersAbroad"],
    fromUncertainty: productUnknown(a),
  };
}

function deNational(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "DE_NATIONAL" as const, copyKey: "de_national" };
  const c = a.establishmentCountry;

  if (c !== "EU" && c !== "NON_EU" && c.toUpperCase() === "DE") {
    if (
      hasControllableProduct(a) ||
      productOnlyService(a) ||
      productUnknown(a)
    ) {
      return {
        ...base,
        applicability: "CLEARLY_APPLIES",
        reason:
          "In Deutschland ansässig → zusätzlich nationales Recht (AWG/AWV, Ausfuhrliste Teil I A). Eure Behörde ist die BAFA.",
        basis: ["establishmentCountry"],
        fromUncertainty: false,
      };
    }
  }
  if (c === "EU") {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "EU-Sitz, Mitgliedsstaat noch offen — falls Deutschland, gilt zusätzlich AWG/AWV und die BAFA ist zuständig.",
      basis: ["establishmentCountry"],
      fromUncertainty: true,
    };
  }
  // Specific non-DE EU state, or non-EU: German national law is not yours;
  // we honestly say we don't model other national laws in v1.
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Nicht in Deutschland ansässig — das deutsche AWG/AWV gilt nicht; euer nationales Exportrecht ist das eures Sitzlandes (in dieser Version nicht abgebildet). ${CONFIRM_MARKER}.`,
    basis: ["establishmentCountry"],
    fromUncertainty: false,
  };
}

function usEar(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "US_EAR" as const, copyKey: "us_ear" };

  if (a.hasUsOriginContent === "yes") {
    return {
      ...base,
      applicability: "CLEARLY_APPLIES",
      reason:
        "US-Ursprungsanteil angegeben → die US-EAR (15 CFR 730–774, BIS) kann gelten; eine De-minimis-/FDPR-Prüfung ist nötig.",
      basis: ["hasUsOriginContent"],
      fromUncertainty: false,
    };
  }
  if (
    a.hasUsOriginContent === "unsure" ||
    a.hasUsPersonOrTechNexus === "yes" ||
    a.hasUsPersonOrTechNexus === "unsure"
  ) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Möglicher US-Bezug (US-Ursprung unklar oder US-Personen/-Technologie im Spiel) → US-EAR könnte greifen; fachlich klären.",
      basis: ["hasUsOriginContent", "hasUsPersonOrTechNexus"],
      fromUncertainty: true,
    };
  }
  // Both explicit "no" → the only out-of-scope path. Name the facts (R1/R3).
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Du hast keinen US-Ursprungsanteil und keinen US-Personen-/Technologie-Bezug angegeben — auf dieser Basis nicht im Anwendungsbereich der US-EAR. Sobald sich Lieferkette oder Team ändert, neu prüfen; ${CONFIRM_MARKER}.`,
    basis: ["hasUsOriginContent", "hasUsPersonOrTechNexus"],
    fromUncertainty: false,
  };
}

function usItar(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "US_ITAR" as const, copyKey: "us_itar" };
  const mil = a.hasMilitaryOrDefenseNexus;
  const usNexus =
    a.hasUsPersonOrTechNexus === "yes" || a.hasUsOriginContent === "yes";
  const anyUnsure =
    mil === "unsure" ||
    a.hasUsPersonOrTechNexus === "unsure" ||
    a.hasUsOriginContent === "unsure";
  const propulsion = a.domainSignals.includes("launch_propulsion");

  if (mil === "yes" && usNexus) {
    return {
      ...base,
      applicability: "CLEARLY_APPLIES",
      reason:
        "Militärischer Bezug + US-Nexus → ein ITAR/USML-Bezug ist möglich. Das ist ein Fall für qualifizierte Fachberatung, nicht für dieses Tool allein.",
      basis: [
        "hasMilitaryOrDefenseNexus",
        "hasUsPersonOrTechNexus",
        "hasUsOriginContent",
      ],
      fromUncertainty: false,
    };
  }
  if (mil === "yes" || anyUnsure || (propulsion && mil !== "no")) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Möglicher ITAR-Bezug (militärisches/Verteidigungs- oder Antriebsthema bzw. unklarer US-Bezug) → unbedingt fachlich klären.",
      basis: [
        "hasMilitaryOrDefenseNexus",
        "hasUsPersonOrTechNexus",
        "hasUsOriginContent",
        "domainSignals",
      ],
      fromUncertainty: anyUnsure,
    };
  }
  // The most dangerous "no" — strongest confirmation wording (R1).
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Kein militärischer Bezug und kein US-Personen-/-Ursprungs-Bezug angegeben — auf dieser Basis nicht im ITAR-Anwendungsbereich. ITAR ist ein extraterritoriales US-Recht mit hohen Strafen; die Aussage „trifft nicht zu" MUSS fachlich bestätigt werden — ${CONFIRM_MARKER}.`,
    basis: [
      "hasMilitaryOrDefenseNexus",
      "hasUsPersonOrTechNexus",
      "hasUsOriginContent",
    ],
    fromUncertainty: false,
  };
}

function mtcr(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "MTCR" as const, copyKey: "mtcr" };
  if (a.domainSignals.includes("launch_propulsion")) {
    return {
      ...base,
      applicability: "CLEARLY_APPLIES",
      reason:
        "Antrieb/Trägertechnik berührt das MTCR. Kategorie-I-Güter tragen eine starke Ablehnungsvermutung — früh fachlich klären.",
      basis: ["domainSignals"],
      fromUncertainty: false,
    };
  }
  if (
    a.domainSignals.includes("satellite") ||
    a.domainSignals.includes("imaging_eo_sar") ||
    a.domainSignals.includes("unsure")
  ) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Komplette Satelliten oder bestimmte Nutzlasten können MTCR-relevant sein → die konkrete Einstufung klärt die Klassifizierung.",
      basis: ["domainSignals"],
      fromUncertainty: a.domainSignals.includes("unsure"),
    };
  }
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Auf Basis der genannten Produktarten kein typischer MTCR-Bezug (kein Antrieb/Träger, kein kompletter Satellit) — ${CONFIRM_MARKER}.`,
    basis: ["domainSignals"],
    fromUncertainty: false,
  };
}

function wassenaar(a: ApplicabilityAnswers): RegimeVerdict {
  const base = { regime: "WASSENAAR" as const, copyKey: "wassenaar" };
  // Wassenaar is baked into the EU/national lists — while a product exists,
  // it is essentially never a confident "no".
  if (hasControllableProduct(a)) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Die EU-/nationalen Kontrolllisten setzen das Wassenaar-Arrangement bereits um — relevant, sobald euer Gut gelistet ist; die genaue Einstufung klärt die Klassifizierung.",
      basis: ["productKinds"],
      fromUncertainty: false,
    };
  }
  // Service-only / unknown product BUT there is still some transfer/movement
  // signal → round UP (R2): a Wassenaar-controlled good may yet appear.
  if ((productOnlyService(a) || productUnknown(a)) && reachesTransfer(a)) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Produktart noch unklar/Dienstleistung — Wassenaar-Bezug kann entstehen, sobald ein konkretes Gut feststeht; im Zweifel relevant.",
      basis: ["productKinds", "transfersAbroad"],
      fromUncertainty: productUnknown(a),
    };
  }
  // Genuinely nothing controllable AND nothing leaves the org (no product,
  // no transfer) → the only out-of-scope path (spec §6: "truly no product +
  // no transfer"). Still grey-with-a-warning, never a confident "no".
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Kein handelbares Gut und keine Übermittlung angegeben — auf dieser Basis kein Wassenaar-Bezug; ${CONFIRM_MARKER}.`,
    basis: ["productKinds", "transfersAbroad"],
    fromUncertainty: false,
  };
}

// ─── Seed builder (answers + verdicts → app-seed) ─────────────────────
function isLive(v: Applicability): boolean {
  return v === "CLEARLY_APPLIES" || v === "LIKELY_APPLIES";
}

function buildSeed(
  a: ApplicabilityAnswers,
  verdicts: RegimeVerdict[],
): ApplicabilitySeed {
  const byRegime = new Map<Regime, Applicability>();
  for (const v of verdicts) byRegime.set(v.regime, v.applicability);

  const earLive = isLive(byRegime.get("US_EAR")!);
  const itarLive = isLive(byRegime.get("US_ITAR")!);
  const deLive = isLive(byRegime.get("DE_NATIONAL")!);

  // primaryExportJurisdiction: a concrete ISO-2 establishment wins; "EU"
  // pseudo-code or NON_EU → null (we don't invent one).
  const c = a.establishmentCountry;
  const primaryExportJurisdiction =
    c !== "EU" && c !== "NON_EU" ? c.toUpperCase() : null;

  // preferredRegimes uses the vocabulary the schema documents:
  // BIS | BAFA | DDTC | ECJU. (EU dual-use national authorities ≈ BAFA in DE.)
  const preferredRegimes: string[] = [];
  if (earLive) preferredRegimes.push("BIS");
  if (itarLive) preferredRegimes.push("DDTC");
  if (deLive) preferredRegimes.push("BAFA");

  // screeningListHints: ALWAYS include the EU/UN baseline (never narrow);
  // add US families only when a US regime is live. Informational, never a
  // filter that could under-screen.
  const screeningListHints = ["EU", "UN"];
  if (earLive) screeningListHints.push("BIS_ENTITY");
  if (itarLive) screeningListHints.push("DDTC_DEBARRED");
  if (earLive || itarLive) screeningListHints.push("OFAC");

  // companyTypes from coarse domain signals → maps onto companyTypesJson.
  const companyTypes: string[] = [];
  const sig = new Set(a.domainSignals);
  if (sig.has("satellite")) companyTypes.push("satellite_operator");
  if (sig.has("launch_propulsion")) companyTypes.push("launch_provider");
  if (sig.has("ground_station")) companyTypes.push("ground_station");
  if (sig.has("rf_payload") || sig.has("imaging_eo_sar"))
    companyTypes.push("payload_developer");
  if (companyTypes.length === 0) companyTypes.push("space_hardware");

  return {
    primaryExportJurisdiction,
    preferredRegimes,
    // CONSERVATIVE BY DIRECTION: only ever true on a live verdict; an
    // out-of-scope verdict yields false (and the server service refuses to
    // flip an existing true back to false).
    hasItarItems: itarLive,
    hasEarItems: earLive,
    hasForeignNationals:
      a.hasUsPersonOrTechNexus === "yes" ||
      a.hasUsPersonOrTechNexus === "unsure",
    companyTypes,
    screeningListHints,
  };
}
