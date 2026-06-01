# Caelex Trade — Export-Control Applicability Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Betrifft mich das überhaupt?" front door — a ~7-question applicability triage that tells a clueless first-time owner **which export-control regimes apply** (honestly framed as triage, NOT legal advice), then **seeds the rest of the app** (jurisdiction, regimes, ITAR/EAR/foreign-national flags). The determination logic lives in a **pure, node-tested** module; the UI is gated by tsc/eslint/review (jsdom hangs on this machine).

**Architecture:** pure `assess-applicability.ts` (the rule engine + answer/result types) → `applicability-copy.ts` (German obligation blurbs) → `applicability-service.server.ts` (persist snapshot on `TradeOrgProfile` + seed `TradeComplianceProgram` via the existing `program-service.ts`) → `/trade/applicability` route (server page + `ApplicabilityWizard` + `ApplicabilityResult`) → home gate banner. One **additive, nullable** Prisma migration on `TradeOrgProfile` (3 columns). No new runtime deps.

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node env for the pure module; components gated by `tsc --noEmit` + `npm run lint` + source review). German UI strings. Reuses `EmptyStateRich`'s `?prefill=` Astra deep-link and the `HomeOnboarding` first-run pattern.

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end per the batched-deploy policy. Commitlint subjects are **lowercase**.

**Companion spec:** `docs/superpowers/specs/2026-05-31-trade-applicability-onboarding-design.md`.

**Verified facts (trust these — already read from the codebase):**

- `TradeOrgProfile` (schema line 14361, `@@unique organizationId`) already has `primaryExportJurisdiction String?` and `preferredRegimesJson String?`. We ADD 3 nullable columns: `applicabilityResultJson String? @db.Text`, `applicabilityCompletedAt DateTime?`, `applicabilityRuleVersion Int?`. Purely additive → no backfill.
- `TradeComplianceProgram` (schema line 12020) already has `companyTypesJson String?`, `hasITARItems`/`hasEARItems`/`hasForeignNationals Boolean @default(false)`, `exportsToCountries String?`, `jurisdictionDetermination String?`. Seed via `program-service.ts`.
- `program-service.ts` exports `upsertProgramProfile(orgId, patch: ProgramProfilePatch)` (encryption boundary single-sourced; merge-upsert; safe to call repeatedly).
- Pure-logic tests use **Vitest**, node env, co-located `*.test.ts` — pattern in `src/lib/trade/operation-assistant-verdict.test.ts`, `src/lib/trade/table-state.test.ts`.
- `EmptyStateRich` Astra deep-link: `/trade/astra?prefill=${encodeURIComponent(prefill)}` (component line 111).
- Home (`src/app/(trade)/trade/page.tsx`): `showOnboarding = heroState.variant === "onboarding"`; renders `<HomeOnboarding/>` in that branch. `resolveOrgId(userId, email)` helper lives at the bottom of that file.
- `HomeOnboarding.tsx` uses indigo gradient header + `--trade-*` token cards + lucide icons — the visual sibling to match.
- Trade tokens available: `--trade-accent`, `--trade-accent-strong`, `--trade-accent-soft`, `--trade-accent-danger`, `--trade-accent-warn`, `--trade-bg-panel`, `--trade-bg-elevated`, `--trade-border`, `--trade-border-subtle`, `--trade-hover`, `--trade-text-primary`, `--trade-text-secondary`, `--trade-text-muted` (as used across `_components`).
- Established result-shape idiom: `Verdict = "GO"|"REVIEW"|"BLOCKED"` + per-step `status`/`summary`/`why` (`operation-assistant-verdict.ts`); license engine carries a `DISCLAIMER` constant + "what this does NOT do" header — mirror both.

**Verification commands (run after the relevant tasks):**

```bash
npx vitest run src/lib/trade/applicability/        # pure rules — the correctness gate (node env)
npx tsc --noEmit                                   # whole-repo type check
npm run lint                                       # eslint (components gate)
```

---

## Task 1 — Pure rule engine: types + `assessApplicability` (TDD, RED first)

**Files:** `src/lib/trade/applicability/assess-applicability.ts`, `src/lib/trade/applicability/assess-applicability.test.ts`

**Step 1.1 — Write the failing test first (RED).** Create the truth-table test below, then create a stub `assess-applicability.ts` that exports the types + a throwing `assessApplicability`. Run `npx vitest run src/lib/trade/applicability/` and confirm RED.

**Step 1.2 — Implement (GREEN).** Write the module below; re-run until green.

**Independently committable.** Commit: `feat(trade): pure export-control applicability rule engine + truth table`.

### `src/lib/trade/applicability/assess-applicability.ts` (COMPLETE)

```ts
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
  if (productOnlyService(a) || productUnknown(a)) {
    return {
      ...base,
      applicability: "LIKELY_APPLIES",
      reason:
        "Produktart noch unklar/Dienstleistung — Wassenaar-Bezug kann entstehen, sobald ein konkretes Gut feststeht; im Zweifel relevant.",
      basis: ["productKinds"],
      fromUncertainty: productUnknown(a),
    };
  }
  return {
    ...base,
    applicability: "OUT_OF_SCOPE_ON_THESE_FACTS",
    reason: `Kein handelbares Gut angegeben — auf dieser Basis kein Wassenaar-Bezug; ${CONFIRM_MARKER}.`,
    basis: ["productKinds"],
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
```

### `src/lib/trade/applicability/assess-applicability.test.ts` (COMPLETE — the truth table)

```ts
import { describe, it, expect } from "vitest";
import {
  assessApplicability,
  CONFIRM_MARKER,
  APPLICABILITY_DISCLAIMER,
  type ApplicabilityAnswers,
  type Regime,
  type Applicability,
  type RegimeVerdict,
} from "./assess-applicability";

const ALL_REGIMES: Regime[] = [
  "EU_DUAL_USE",
  "DE_NATIONAL",
  "US_EAR",
  "US_ITAR",
  "MTCR",
  "WASSENAAR",
];

/** A neutral DE hardware company with NO US/military nexus. */
function baseDE(): ApplicabilityAnswers {
  return {
    establishmentCountry: "DE",
    productKinds: ["hardware"],
    domainSignals: ["satellite"],
    hasUsOriginContent: "no",
    hasUsPersonOrTechNexus: "no",
    hasMilitaryOrDefenseNexus: "no",
    transfersAbroad: "outside_eu",
  };
}
function find(v: RegimeVerdict[], r: Regime): RegimeVerdict {
  const hit = v.find((x) => x.regime === r);
  if (!hit) throw new Error(`missing verdict for ${r}`);
  return hit;
}

describe("assessApplicability — structure & invariants", () => {
  it("always emits exactly the six regimes (no silent omission)", () => {
    const { verdicts } = assessApplicability(baseDE());
    expect(verdicts).toHaveLength(6);
    expect(new Set(verdicts.map((v) => v.regime))).toEqual(
      new Set(ALL_REGIMES),
    );
  });

  it("is deterministic (same answers → deep-equal result)", () => {
    const a = baseDE();
    expect(assessApplicability(a)).toEqual(assessApplicability(a));
  });

  it("carries the mandatory disclaimer", () => {
    expect(assessApplicability(baseDE()).disclaimer).toBe(
      APPLICABILITY_DISCLAIMER,
    );
  });

  it("R1 — no verdict is a confident DOES_NOT_APPLY; every out-of-scope carries the confirm marker", () => {
    // Sweep several fixtures.
    const fixtures: ApplicabilityAnswers[] = [
      baseDE(),
      { ...baseDE(), establishmentCountry: "FR" },
      {
        ...baseDE(),
        establishmentCountry: "NON_EU",
        productKinds: [],
        domainSignals: ["none"],
        transfersAbroad: "none",
      },
      {
        ...baseDE(),
        hasUsOriginContent: "yes",
        hasMilitaryOrDefenseNexus: "yes",
        hasUsPersonOrTechNexus: "yes",
      },
    ];
    for (const f of fixtures) {
      for (const v of assessApplicability(f).verdicts) {
        expect([
          "CLEARLY_APPLIES",
          "LIKELY_APPLIES",
          "OUT_OF_SCOPE_ON_THESE_FACTS",
        ]).toContain(v.applicability);
        if (v.applicability === "OUT_OF_SCOPE_ON_THESE_FACTS") {
          expect(v.reason).toContain(CONFIRM_MARKER);
        }
      }
    }
  });
});

describe("EU_DUAL_USE", () => {
  it("DE/EU + product → clearly applies", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("EU + service-only → likely", () => {
    const a = { ...baseDE(), productKinds: ["service_only" as const] };
    expect(
      find(assessApplicability(a).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
  it("non-EU + no product + no transfer → out of scope", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      establishmentCountry: "NON_EU",
      productKinds: [],
      domainSignals: ["none"],
      transfersAbroad: "none",
    };
    expect(
      find(assessApplicability(a).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
});

describe("DE_NATIONAL", () => {
  it("DE establishment → clearly applies (BAFA)", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "DE_NATIONAL").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("EU (state unknown) → likely", () => {
    const a = { ...baseDE(), establishmentCountry: "EU" as const };
    const v = find(assessApplicability(a).verdicts, "DE_NATIONAL");
    expect(v.applicability).toBe<Applicability>("LIKELY_APPLIES");
    expect(v.fromUncertainty).toBe(true);
  });
  it("specific non-DE EU state → honest out-of-scope (other national law not modelled)", () => {
    const a = { ...baseDE(), establishmentCountry: "FR" };
    expect(
      find(assessApplicability(a).verdicts, "DE_NATIONAL").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
});

describe("US_EAR — sticky (R3)", () => {
  it("US-origin yes → clearly", () => {
    const a = { ...baseDE(), hasUsOriginContent: "yes" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_EAR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("both no → out of scope, naming the facts", () => {
    const v = find(assessApplicability(baseDE()).verdicts, "US_EAR");
    expect(v.applicability).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    expect(v.reason).toContain("US-Ursprungsanteil");
  });
  it("flipping US-origin to unsure re-introduces EAR (never clears on doubt)", () => {
    const a = { ...baseDE(), hasUsOriginContent: "unsure" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_EAR").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
});

describe("US_ITAR — most conservative", () => {
  it("military + US nexus → clearly", () => {
    const a = {
      ...baseDE(),
      hasMilitaryOrDefenseNexus: "yes" as const,
      hasUsPersonOrTechNexus: "yes" as const,
    };
    expect(
      find(assessApplicability(a).verdicts, "US_ITAR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("military alone → likely", () => {
    const a = { ...baseDE(), hasMilitaryOrDefenseNexus: "yes" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_ITAR").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
  it("all relevant no → out of scope with the strong confirmation wording", () => {
    const v = find(assessApplicability(baseDE()).verdicts, "US_ITAR");
    expect(v.applicability).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    expect(v.reason).toContain("extraterritoriales");
    expect(v.reason).toContain(CONFIRM_MARKER);
  });
});

describe("MTCR & WASSENAAR overlays", () => {
  it("propulsion → MTCR clearly", () => {
    const a = { ...baseDE(), domainSignals: ["launch_propulsion" as const] };
    expect(
      find(assessApplicability(a).verdicts, "MTCR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("Wassenaar never confident-no while a product exists", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "WASSENAAR").applicability,
    ).not.toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
  it("Wassenaar out-of-scope only with no product at all", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      productKinds: [],
      domainSignals: ["none"],
    };
    expect(
      find(assessApplicability(a).verdicts, "WASSENAAR").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
});

describe("R2 — doubt always rounds up (parametric)", () => {
  const usGated: Array<[keyof ApplicabilityAnswers, Regime]> = [
    ["hasUsOriginContent", "US_EAR"],
    ["hasUsPersonOrTechNexus", "US_EAR"],
    ["hasMilitaryOrDefenseNexus", "US_ITAR"],
  ];
  for (const [field, regime] of usGated) {
    it(`${String(field)}="unsure" never makes ${regime} out-of-scope`, () => {
      const a = { ...baseDE(), [field]: "unsure" } as ApplicabilityAnswers;
      expect(
        find(assessApplicability(a).verdicts, regime).applicability,
      ).not.toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    });
  }
});

describe("seed mapping — conservative by direction", () => {
  it("ITAR out-of-scope → seed.hasItarItems false; EAR live → seed.hasEarItems true", () => {
    const a = { ...baseDE(), hasUsOriginContent: "yes" as const };
    const { seed } = assessApplicability(a);
    expect(seed.hasEarItems).toBe(true);
    expect(seed.hasItarItems).toBe(false); // no military/us-person → ITAR out of scope
    expect(seed.preferredRegimes).toContain("BIS");
    expect(seed.screeningListHints).toEqual(
      expect.arrayContaining(["EU", "UN", "OFAC", "BIS_ENTITY"]),
    );
  });
  it("military + US → seed.hasItarItems true + DDTC", () => {
    const a = {
      ...baseDE(),
      hasMilitaryOrDefenseNexus: "yes" as const,
      hasUsPersonOrTechNexus: "yes" as const,
    };
    const { seed } = assessApplicability(a);
    expect(seed.hasItarItems).toBe(true);
    expect(seed.preferredRegimes).toContain("DDTC");
    expect(seed.hasForeignNationals).toBe(true);
  });
  it("DE seed carries BAFA + primary jurisdiction DE", () => {
    const { seed } = assessApplicability(baseDE());
    expect(seed.preferredRegimes).toContain("BAFA");
    expect(seed.primaryExportJurisdiction).toBe("DE");
  });
  it("screeningListHints ALWAYS include EU+UN baseline (never narrowed away)", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      productKinds: [],
      domainSignals: ["none"],
    };
    expect(assessApplicability(a).seed.screeningListHints).toEqual(
      expect.arrayContaining(["EU", "UN"]),
    );
  });
});
```

---

## Task 2 — Obligation copy (`applicability-copy.ts`) + its coverage test

**Files:** `src/lib/trade/applicability/applicability-copy.ts`, `…/applicability-copy.test.ts`

**Step 2.1.** Create a pure data map keyed by the six `copyKey`s, each: a novice-readable German `title`, a `whatItMeans` paragraph, a `firstSteps` string[], and the in-app `surfaceHref` (`/trade/classify`, `/trade/parties`, `/trade/deemed-exports`, …). Plus a constant per-verdict disclaimer reminder line.

**Step 2.2 (RED→GREEN).** Test: every `copyKey` produced by `assessApplicability` across the truth-table fixtures has an entry (no missing copy); each entry's `firstSteps` is non-empty.

**Sketch:**

```ts
export interface ObligationCopy {
  title: string; // "EU-Dual-Use-Verordnung (EU) 2021/821"
  whatItMeans: string; // novice paragraph
  firstSteps: string[]; // actionable, points at in-app surfaces
  surfaceHref: string; // "/trade/classify"
  astraPrefill: string; // for the ?prefill= deep-link
}
export const APPLICABILITY_COPY: Record<string, ObligationCopy> = {
  eu_dual_use: {
    title: "EU-Dual-Use-Verordnung (EU) 2021/821",
    whatItMeans:
      "Eure Güter müssen gegen Anhang I geprüft (klassifiziert) werden. Steht etwas auf der Liste, braucht ihr für Ausfuhren aus der EU eine Genehmigung.",
    firstSteps: ["Artikel anlegen", "Artikel klassifizieren (gegen Anhang I)"],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "Die EU-Dual-Use-VO betrifft uns — was muss ich als kleines Raumfahrt-Unternehmen zuerst tun?",
  },
  // … de_national, us_ear, us_itar, mtcr, wassenaar (same shape)
};
export const PER_VERDICT_DISCLAIMER =
  "Vorläufige Orientierung — keine Rechtsberatung. Im Zweifel fachlich bestätigen.";
```

**Commit:** `feat(trade): novice obligation copy for applicability regimes`.

---

## Task 3 — Additive Prisma migration on `TradeOrgProfile`

**File:** `prisma/schema.prisma` (+ generated migration)

**Step 3.1.** Add the three nullable columns to `model TradeOrgProfile` (after `preferredRegimesJson`):

```prisma
  // ── Applicability onboarding (front-door triage) ──
  /// JSON snapshot of the last ApplicabilityResult (verdicts + answers + version).
  /// NULL = the org has never completed the triage → home shows the gate banner.
  applicabilityResultJson  String?   @db.Text
  /// When the triage was completed/acknowledged. NULL = not done.
  applicabilityCompletedAt DateTime?
  /// Rule-set version that produced the snapshot (APPLICABILITY_RULE_VERSION).
  applicabilityRuleVersion Int?
```

**Step 3.2.** `npx prisma migrate dev --name trade_applicability_onboarding` (or `db push` in the no-DATABASE_URL dev path per project notes). Purely additive + nullable → no backfill, no risk to existing rows.

**Step 3.3.** `npx prisma generate` + `npx tsc --noEmit` to pick up the new client types.

**Commit:** `feat(trade): persist applicability snapshot on TradeOrgProfile (additive migration)`.

---

## Task 4 — Server service (`applicability-service.server.ts`)

**File:** `src/lib/trade/applicability/applicability-service.server.ts`

**Step 4.1.** Implement the three functions (spec §4.3). `getApplicability` reads + parses; `saveApplicability` runs the pure engine, writes the snapshot + `completedAt` + `ruleVersion` + seeds `primaryExportJurisdiction`/`preferredRegimesJson` on `TradeOrgProfile` (upsert by `organizationId`); `seedProgramFromApplicability` maps `seed` → `upsertProgramProfile`. Guard: never write `hasITARItems=false`/`hasEARItems=false` over an existing `true` (read current program first; only set true→… upward).

**Sketch:**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { upsertProgramProfile, getProgram } from "@/lib/trade/program-service";
import {
  assessApplicability,
  APPLICABILITY_RULE_VERSION,
  type ApplicabilityAnswers,
  type ApplicabilityResult,
  type ApplicabilitySeed,
} from "./assess-applicability";

export async function getApplicability(orgId: string): Promise<{
  result: ApplicabilityResult;
  completedAt: Date;
} | null> {
  const row = await prisma.tradeOrgProfile.findUnique({
    where: { organizationId: orgId },
    select: { applicabilityResultJson: true, applicabilityCompletedAt: true },
  });
  if (!row?.applicabilityResultJson || !row.applicabilityCompletedAt)
    return null;
  return {
    result: JSON.parse(row.applicabilityResultJson) as ApplicabilityResult,
    completedAt: row.applicabilityCompletedAt,
  };
}

export async function saveApplicability(
  orgId: string,
  answers: ApplicabilityAnswers,
  ackAt: Date,
): Promise<ApplicabilityResult> {
  const result = assessApplicability(answers);
  const snapshot = JSON.stringify({
    answers,
    result,
    v: APPLICABILITY_RULE_VERSION,
  });
  await prisma.tradeOrgProfile.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      primaryExportJurisdiction: result.seed.primaryExportJurisdiction,
      preferredRegimesJson: JSON.stringify(result.seed.preferredRegimes),
      applicabilityResultJson: snapshot,
      applicabilityCompletedAt: ackAt,
      applicabilityRuleVersion: APPLICABILITY_RULE_VERSION,
    },
    update: {
      primaryExportJurisdiction: result.seed.primaryExportJurisdiction,
      preferredRegimesJson: JSON.stringify(result.seed.preferredRegimes),
      applicabilityResultJson: snapshot,
      applicabilityCompletedAt: ackAt,
      applicabilityRuleVersion: APPLICABILITY_RULE_VERSION,
    },
  });
  await seedProgramFromApplicability(orgId, result.seed);
  return result;
}

export async function seedProgramFromApplicability(
  orgId: string,
  seed: ApplicabilitySeed,
): Promise<void> {
  const existing = await getProgram(orgId);
  await upsertProgramProfile(orgId, {
    // upward-only: keep a known true, otherwise take the seed value.
    hasITARItems: existing?.hasITARItems || seed.hasItarItems,
    hasEARItems: existing?.hasEARItems || seed.hasEarItems,
    hasForeignNationals:
      existing?.hasForeignNationals || seed.hasForeignNationals,
    companyTypesJson: JSON.stringify(seed.companyTypes),
  });
}
```

**Step 4.2.** `npx tsc --noEmit`. (No jsdom/DB integration test — composes already-tested primitives; the seed mapping is exercised in Task 1's seed tests.)

**Commit:** `feat(trade): applicability persistence + program-seed service`.

---

## Task 5 — Server action for the wizard submit

**File:** `src/app/(trade)/trade/applicability/actions.ts` (`"use server"`)

**Step 5.1.** `submitApplicability(answers)`: `auth()` → resolve orgId (extract the home's `resolveOrgId` into a shared helper or inline the same logic) → `saveApplicability(orgId, answers, new Date())` → `revalidatePath("/trade")` → return the `ApplicabilityResult` for immediate render. Validate `answers` shape defensively (it's the only untrusted boundary).

**Commit:** `feat(trade): applicability wizard submit server action`.

---

## Task 6 — Wizard + Result + Gate-banner components (UI; tsc/eslint/review-gated)

**Files:** `…/applicability/_components/ApplicabilityWizard.tsx`, `…/ApplicabilityResult.tsx`, `…/_components/ApplicabilityGateBanner.tsx`

**Step 6.1 — `ApplicabilityWizard` (`"use client"`).** Stepper Q1→Q7 (+optional Q8) per spec §5; answers in `useState`; back/weiter; progress dots; each question shows its "warum wir das fragen" helper + a "weiß nicht" option. On final step, an acknowledgement checkbox (R6) gates the submit button → calls the Task-5 action → on success swaps to `<ApplicabilityResult result={…}/>`. Indigo gradient header like `HomeOnboarding`; `--trade-*` tokens; lucide icons.

**Step 6.2 — `ApplicabilityResult` (`"use client"`).** Top: non-dismissible disclaimer banner (R4, `--trade-accent` indigo border) rendering `result.disclaimer`. Headline from `result.headline`. Then six verdict cards in `result.verdicts` order, each: regime title (from `APPLICABILITY_COPY`), an `Applicability` dot — `--trade-accent-danger` (clearly) / `--trade-accent-warn` (likely) / **`--trade-text-muted` neutral grey** (out-of-scope; **NO success-green anywhere**) — the one-line `reason`, an expandable `whatItMeans` + `firstSteps` (linking `surfaceHref`), the per-verdict disclaimer reminder, and a quiet "Astra fragen" link → `/trade/astra?prefill=${encodeURIComponent(copy.astraPrefill)}` (the `EmptyStateRich` pattern). Below: the "Was diese Einordnung NICHT ist" block (R5). Then the **"Übernehmen & meine Schritte anzeigen"** primary button (already past the ack in the wizard; on the standalone re-view page it just routes home) + a "neu einschätzen" secondary.

**Step 6.3 — `ApplicabilityGateBanner` (`"use client"`).** Compact indigo card: "Neu hier? Klär in ~2 Minuten, welche Regeln für dich gelten." + "Einschätzung starten" → `/trade/applicability`. Lives above `HomeOnboarding`.

**Step 6.4 — Gate.** `npm run lint` + `npx tsc --noEmit` + source review (NO jsdom — it hangs; matches Trade UI phases 1–3D).

**Commit:** `feat(trade): applicability wizard, result, and home gate-banner ui`.

---

## Task 7 — Route page + home integration

**Files:** `src/app/(trade)/trade/applicability/page.tsx`, edit `src/app/(trade)/trade/page.tsx`

**Step 7.1 — `/trade/applicability/page.tsx` (server).** `auth()` → `resolveOrgId` → `getApplicability(orgId)`. If a result exists → render `<ApplicabilityResult result={…}/>` (re-view mode). Else → render `<ApplicabilityWizard/>`. Metadata title "Caelex Trade — Geltungsbereich".

**Step 7.2 — Home edit.** In `page.tsx`, additionally read the applicability state for the org (one cheap `tradeOrgProfile.findUnique` selecting `applicabilityCompletedAt`). In the `showOnboarding` branch, render `<ApplicabilityGateBanner/>` ABOVE `<HomeOnboarding/>` when `applicabilityCompletedAt == null`. When it IS set (and still onboarding), show a small "dein Geltungsbereich: EU Dual-Use · BAFA" chip linking to `/trade/applicability`. Keep `HomeOnboarding` unchanged otherwise.

**Step 7.3 — Gate.** `npx tsc --noEmit` + `npm run lint` + source review.

**Commit:** `feat(trade): applicability route + home front-door gate`.

---

## Task 8 — Final verification + batched deploy

**Step 8.1 — Verify (evidence before claims):**

```bash
npx vitest run src/lib/trade/applicability/   # ALL green — the correctness gate
npx tsc --noEmit                              # no NEW errors on touched files
npm run lint                                  # clean
```

**Step 8.2.** Confirm working tree clean; `git log` shows the lowercase-subject commits for this feature.

**Step 8.3 — Deploy decision.** This feature is ~7 commits = a full batch on its own (Tasks 1–7). Per the batched-deploy policy, when the batch threshold is reached OR the user says "deploy now": `git checkout main` → `git pull --ff-only origin main` → `git merge fix/trade-to-92 --no-edit` → `git push origin main` (production only; skip the feature-branch push / preview build). The migration ships via `build:deploy` (`prisma migrate deploy`) — it is additive + nullable, safe on the live DB.

---

## Dependency notes for the agent

- **Order matters:** Task 1 (pure engine) is the foundation everything imports; do it first and keep it green. Task 3 (migration) must precede Task 4 (service reads the new columns). Tasks 6–7 (UI) depend on 1+2+5. Tasks 1, 2 are independently committable and independently testable without a DB.
- **No new deps.** Everything uses existing React/Next/Tailwind/lucide/Prisma/Vitest.
- **German strings throughout.** The engine's `reason` strings surface verbatim in the UI — keep them novice-readable.
- **The honesty rules (R1–R6) are load-bearing.** The truth-table tests in Task 1 encode R1/R2/R3 + the seed-direction guard; do not weaken them to make a UI change easier. If a rule must change, change the rule + its test together and bump `APPLICABILITY_RULE_VERSION`.
