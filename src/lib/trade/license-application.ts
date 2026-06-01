/**
 * Caelex Trade — "BLOCKED → what now" licence-application path.
 *
 * PURE module: no React, no DB, no I/O, no Anthropic. It is a POST-PROCESSOR
 * over the verdict engine's existing per-line `LicenseDetermination` output.
 * It answers, for a non-GO verdict: which single licence application is the
 * actionable next step, which fine-grained TradeLicenseType it maps to, which
 * documents it needs, and a pre-filled DRAFT create-payload the human confirms
 * + files themselves. It NEVER submits and is NOT legal advice.
 *
 * Mirrors the Phase-3B renewal discipline (license-renewal.ts):
 * clone/prefill, blank the authority number + dates, stamp lineage in
 * conditions, return status "DRAFT" + verbatim disclaimer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  LicenseDetermination,
  LicenseRequirement,
  LicenseAuthority,
  LicenseType as EngineLicenseType,
} from "@/lib/comply-v2/trade/license-determination";
import type { TradeLicenseType } from "@prisma/client";

export type EngineDetermination = LicenseDetermination;

// ─── Severity + authority ordering (deterministic selection) ──────────

// Higher = more severe / higher priority to surface.
const STATUS_SEVERITY: Record<LicenseRequirement["status"], number> = {
  PROHIBITED: 60,
  DENIED: 50,
  REQUIRED: 40,
  LIKELY_REQUIRED: 30,
  UNKNOWN: 20,
  EXCEPTION_MAY_APPLY: 10,
  NLR: 0,
};

// When statuses tie, this authority order breaks the tie (most
// "no-derogation / item-intrinsic" first). DDTC (ITAR) cannot be
// derogated intra-EU; BIS next; then BAFA/EU.
const AUTHORITY_ORDER: Record<LicenseAuthority, number> = {
  DDTC: 4,
  BIS: 3,
  BAFA: 2,
  EU_COMPETENT_AUTHORITY: 1,
  MTCR_REVIEW: 0,
};

/** A requirement is "actionable enough to surface" if it isn't a pure NLR. */
function isSurfaceable(r: LicenseRequirement): boolean {
  return r.status !== "NLR";
}

/** A surfaced target is "blocked" (no application path) for these statuses. */
function isBlockedStatus(status: LicenseRequirement["status"]): boolean {
  return status === "DENIED" || status === "PROHIBITED";
}

export interface ApplicationTarget {
  /** The single strongest requirement across all lines. */
  requirement: LicenseRequirement;
  /** True when no application is possible (DENIED/PROHIBITED/MTCR) → stop state. */
  blocked: boolean;
}

/**
 * Pick the single strongest actionable LicenseRequirement across every
 * classified line's determination. Most-severe status wins; ties broken
 * by authority order; null when nothing is surfaceable (e.g. all NLR / GO).
 */
export function selectApplicationTarget(
  determinations: EngineDetermination[],
): ApplicationTarget | null {
  let best: LicenseRequirement | null = null;
  for (const det of determinations) {
    for (const r of det.requirements) {
      if (!isSurfaceable(r)) continue;
      if (best === null) {
        best = r;
        continue;
      }
      const sevDelta = STATUS_SEVERITY[r.status] - STATUS_SEVERITY[best.status];
      if (sevDelta > 0) best = r;
      else if (
        sevDelta === 0 &&
        AUTHORITY_ORDER[r.authority] > AUTHORITY_ORDER[best.authority]
      ) {
        best = r;
      }
    }
  }
  if (best === null) return null;
  // MTCR_REVIEW is inherently a stop even if mislabelled — treat as blocked.
  const blocked =
    isBlockedStatus(best.status) || best.authority === "MTCR_REVIEW";
  return { requirement: best, blocked };
}

// ─── Engine type → fine-grained TradeLicenseType (conservative) ───────

export interface MappedLicenseType {
  tradeLicenseType: TradeLicenseType;
  /**
   * True when the mapping is a best-guess (the engine type is coarser than
   * the enum). The UI MUST hedge ("wahrscheinliche Einstufung — bestätigen")
   * when this is set.
   */
  approximate: boolean;
}

/**
 * Map the engine's coarse (authority, licenseType) onto the fileable
 * TradeLicenseType enum. TOTAL (never throws, never null) and CONSERVATIVE:
 * when ambiguous, pick the safest *individual/specific* licence of that
 * authority and flag `approximate` so the UI hedges.
 *
 * CONSERVATIVE BIAS (deliberate, novice-safe): we NEVER auto-select a
 * general authorisation / licence exception (BAFA AGG/EUGEA, BIS STA/CSA/ENC)
 * even when the engine hints one — the operator is a novice who must confirm
 * eligibility for any general authorisation themselves.
 */
export function mapToTradeLicenseType(
  authority: LicenseAuthority,
  engineLicenseType: EngineLicenseType | null,
): MappedLicenseType {
  switch (authority) {
    case "DDTC":
      if (engineLicenseType === "TAA")
        return { tradeLicenseType: "DDTC_TAA", approximate: false };
      // DSP5 / SPECIFIC_LICENSE / null → individual DSP-5 export licence.
      return {
        tradeLicenseType: "DDTC_DSP5",
        approximate: engineLicenseType !== "DSP5",
      };
    case "BIS":
      // EAR specific licence is the safe default; STA/ENC etc. are exceptions
      // the operator confirms, so we do NOT auto-pick an exception type here.
      return { tradeLicenseType: "BIS_EAR", approximate: true };
    case "BAFA":
      // Einzelausfuhrgenehmigung is the safe default; AGG/EUGEA are
      // general authorisations the operator confirms eligibility for.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "EU_COMPETENT_AUTHORITY":
      // EU national competent authority for a DE operator → route via BAFA.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "MTCR_REVIEW":
      // No fileable individual licence — caller treats as blocked; OTHER as
      // a non-misleading placeholder (a draft is never built for this).
      return { tradeLicenseType: "OTHER", approximate: true };
    default:
      return { tradeLicenseType: "OTHER", approximate: true };
  }
}

// ─── Required-documents derivation ────────────────────────────────────

export interface RequiredDoc {
  key: string;
  label: string;
  why: string;
  mandatory: boolean;
  actionHref?: string;
}

export interface RequiredDocsResult {
  documents: RequiredDoc[];
  /** Set ONLY for blocked targets — replaces the docs/apply UI with a stop. */
  stopGuidance?: string;
}

const EUC_DOC: RequiredDoc = {
  key: "EUC",
  label: "Endverbleibserklärung (EUC)",
  why: "Die Behörde verlangt eine unterschriebene Endverbleibs-/Endverwendungserklärung des Endempfängers.",
  mandatory: true,
  actionHref: "/trade/euc",
};
const TECH_SPEC_DOC: RequiredDoc = {
  key: "TECH_SPEC",
  label: "Technische Spezifikation des Guts",
  why: "Beleg der Gütereigenschaften für die Einstufung im Antrag.",
  mandatory: true,
};
const BOM_DOC: RequiredDoc = {
  key: "BOM",
  label: "Stückliste / Bill of Materials",
  why: "Stützt De-minimis / Ursprungsangaben.",
  mandatory: false,
};

/**
 * Per-authority required-docs lookup. Static (no external call). For a
 * blocked target, returns NO documents and a stopGuidance string — a novice
 * must never be invited to "prepare an application" for a hard-blocked export.
 */
export function deriveRequiredDocuments(
  target: ApplicationTarget,
): RequiredDocsResult {
  if (target.blocked) {
    return {
      documents: [],
      stopGuidance:
        `Kein Genehmigungsantrag möglich: ${target.requirement.reason} ` +
        `Vorgang abbrechen und Abbruch dokumentieren, Parteiidentität gegen die ` +
        `aktuelle Liste re-verifizieren und qualifizierte Exportkontroll-Rechtsberatung ` +
        `hinzuziehen, bevor irgendetwas unternommen wird.`,
    };
  }
  switch (target.requirement.authority) {
    case "DDTC":
      return {
        documents: [
          {
            ...EUC_DOC,
            label: "End-Use Certificate / DSP-83",
            key: "DDTC_DS83",
          },
          TECH_SPEC_DOC,
          {
            key: "LOE",
            label: "Letter of Explanation + Endempfänger-Angaben",
            why: "DDTC verlangt eine Begründung und vollständige Consignee/End-User-Angaben.",
            mandatory: true,
          },
        ],
      };
    case "BIS":
      return {
        documents: [
          {
            key: "BIS_711",
            label: "BIS-711 (Statement by Ultimate Consignee & Purchaser)",
            why: "Pflichtformular für eine BIS-Einzelgenehmigung (15 CFR §748).",
            mandatory: true,
          },
          TECH_SPEC_DOC,
          {
            key: "END_USE_STMT",
            label: "End-Use / End-User-Erklärung",
            why: "BIS verlangt Angaben zu Endverwendung und Endempfänger.",
            mandatory: true,
          },
        ],
      };
    case "BAFA":
    case "EU_COMPETENT_AUTHORITY":
    default:
      return { documents: [EUC_DOC, TECH_SPEC_DOC, BOM_DOC] };
  }
}

// ─── Authority portal deep-links ──────────────────────────────────────

export function authorityPortal(authority: LicenseAuthority): {
  label: string;
  url: string;
} {
  switch (authority) {
    case "DDTC":
      return { label: "DDTC DECCS", url: "https://www.pmddtc.state.gov/" };
    case "BIS":
      return { label: "BIS SNAP-R", url: "https://www.bis.doc.gov/" };
    case "BAFA":
    case "EU_COMPETENT_AUTHORITY":
    default:
      return { label: "BAFA ELAN-K2", url: "https://elan.bafa.bund.de/" };
  }
}

// ─── Liability / over-trust copy — SINGLE SOURCE OF TRUTH ─────────────

export const APPLICATION_DISCLAIMER =
  "Caelex bereitet hier nur einen internen ENTWURF (DRAFT) vor und reicht " +
  "bei keiner Behörde NICHTS ein — weder bei BAFA noch bei BIS oder DDTC. " +
  "Den Antrag musst du selbst über den Behördenkanal (BAFA ELAN-K2, BIS " +
  "SNAP-R, DDTC DECCS) einreichen und vor jeder Lieferung alle Bedingungen " +
  "gegen den erteilten Bescheid re-verifizieren. Dies ist keine Rechtsberatung " +
  "und ersetzt keinen qualifizierten Ausfuhrverantwortlichen. Die vorbefüllten " +
  "Angaben sind ein Ausgangspunkt, keine Garantie — die Behörde kann andere " +
  "Bedingungen festlegen.";

export const LIABILITY_COPY = {
  /** LOUDEST: under the verdict headline on REVIEW & BLOCKED. */
  verdictBanner:
    "Entscheidungsunterstützung — keine Freigabe und keine Rechtsberatung. " +
    "Caelex klassifiziert und screent automatisch, um dir Arbeit abzunehmen — " +
    "die Verantwortung bleibt bei dir. Bei „Prüfung nötig“ / „Verboten“ und in " +
    "jedem Zweifelsfall vor der Lieferung fachkundige Freigabe einholen " +
    "(qualifizierter Ausfuhrverantwortlicher / Rechtsberatung).",
  /** HONEST GREEN: under the verdict headline on GO. */
  goNote:
    "Darf liefern — aber nicht „nichts tun“. Auch ohne Genehmigung gelten " +
    "Pflichten: Ausfuhrnachweise 5 Jahre aufbewahren, EUC/Endverwendung " +
    "dokumentieren und vor jeder Lieferung re-verifizieren (Einstufung, " +
    "Empfänger, Ziel können sich ändern). Bei neuen Erkenntnissen erneut prüfen.",
  /** PERSISTENT-LIGHT: inline near auto-classify / auto-screen claims. */
  autoSuggestCue:
    "Automatisch — als Vorschlag, nicht als Freigabe. Endgültige Einstufung " +
    "bestätigt der Ausfuhrverantwortliche.",
} as const;

// ─── Application-draft builder (clone/prefill — mirrors renewal) ──────

/** End-use classes the operation can declare (TradeEndUseClass enum). */
export type DeclaredEndUse =
  | "CIVIL"
  | "DUAL_USE"
  | "MILITARY"
  | "WMD_RELATED"
  | "UNKNOWN";

export interface OperationContext {
  operationId: string;
  reference: string;
  counterpartyName: string;
  shipToCountry: string;
  endUseCountry: string | null;
  declaredEndUse: DeclaredEndUse;
  /** ECCN/USML codes that triggered the requirement (for conditions.coveredCodes). */
  triggerCodes: string[];
  /** Σ line value as a STARTING cap (euros — API serialises cents→euros). */
  totalValueEur: number | null;
  currency: string;
}

export interface LicenseApplicationDraft {
  licenseType: TradeLicenseType;
  /** UI hedges "wahrscheinliche Einstufung — bestätigen" when true. */
  approximate: boolean;
  licenseNumber: undefined; // authority no. unknown until issued — NEVER fabricated
  issuedAt: undefined;
  validUntil: undefined;
  totalCapValue: number | null; // starting cap
  capCurrency: string;
  conditions: Record<string, unknown>; // coveredCodes/Countries + endUse + applicationFor + notes
  status: "DRAFT";
  carriedSummary: string;
  disclaimer: string;
}

const END_USE_RESTRICTION: Record<DeclaredEndUse, string[]> = {
  CIVIL: ["civilian end-use only"],
  DUAL_USE: ["dual-use — end-use to be confirmed"],
  MILITARY: ["military end-use declared"],
  WMD_RELATED: ["WMD-related end-use flagged — seek counsel"],
  UNKNOWN: ["end-use undeclared — clarify before proceeding"],
};

/**
 * Clone the operation/item/party context into a new-licence DRAFT payload.
 * Deterministic field-copy — no LLM, no network — mirroring
 * buildLicenseRenewalDraft. The authority number + dates are intentionally
 * blank (a fresh application has none until issued). THROWS for a blocked
 * target: there is no licence application for a hard-blocked export.
 */
export function buildLicenseApplicationDraft(
  target: ApplicationTarget,
  ctx: OperationContext,
): LicenseApplicationDraft {
  if (target.blocked) {
    throw new Error(
      "buildLicenseApplicationDraft called for a blocked target — no application path exists.",
    );
  }
  const { tradeLicenseType, approximate } = mapToTradeLicenseType(
    target.requirement.authority,
    target.requirement.licenseType,
  );

  const coveredCountries = [ctx.shipToCountry];
  if (ctx.endUseCountry && ctx.endUseCountry !== ctx.shipToCountry) {
    coveredCountries.push(ctx.endUseCountry);
  }

  const conditions: Record<string, unknown> = {
    coveredCodes: [...ctx.triggerCodes],
    coveredCountries,
    endUseRestrictions: END_USE_RESTRICTION[ctx.declaredEndUse],
    applicationFor: ctx.operationId, // lineage (mirrors renewalOf) — no migration
    notes:
      `Antragsentwurf aus Vorgang ${ctx.reference}; Gegenpartei ${ctx.counterpartyName}; ` +
      `Grund: ${target.requirement.reason}`,
  };

  const carriedSummary =
    `Vorbefüllt aus Vorgang ${ctx.reference} — Lizenztyp, betroffene Codes, ` +
    `Zielland und Endverwendung. Nummer, Ausstellungsdatum und Gültigkeit ` +
    `trägst du ein, sobald die Behörde die Genehmigung erteilt.`;

  return {
    licenseType: tradeLicenseType,
    approximate,
    licenseNumber: undefined,
    issuedAt: undefined,
    validUntil: undefined,
    totalCapValue: ctx.totalValueEur,
    capCurrency: ctx.currency,
    conditions,
    status: "DRAFT",
    carriedSummary,
    disclaimer: APPLICATION_DISCLAIMER,
  };
}
