import "server-only";
import type {
  TradeVoluntaryDisclosure,
  TradeVSDAuthority,
  TradeVSDViolationType,
} from "@prisma/client";

/**
 * Caelex Trade — Z6b-d: Voluntary Self-Disclosure (VSD) PDF templates.
 *
 * Shared data-model + helper utilities used by the OFAC, BIS, and DDTC
 * filing PDFs. Each jurisdiction wraps these primitives behind its own
 * builder (vsd-ofac-template.ts, vsd-bis-template.ts, vsd-ddtc-template.ts).
 *
 * The structure mirrors the EUC Annex IIIa template (sections × fields ×
 * optional bullets) so the rendering layer can stay generic.
 *
 * Legal anchors:
 *  - 31 CFR § 501.806 — OFAC reconsideration / VSD format
 *  - OFAC Enforcement Guidelines (Appendix A to 31 CFR Part 501)
 *  - 15 CFR § 764.5 — BIS Voluntary Self-Disclosure
 *  - 22 CFR § 127.12 — DDTC Voluntary Disclosure
 */

// ─── Public types ───────────────────────────────────────────────────

/** Counterparty fields needed by the filing (subset of TradeParty). */
export interface VsdCounterparty {
  legalName: string;
  tradeName?: string | null;
  countryCode: string;
  addressLines?: string[];
}

/** Operation-context fields used by the filing narrative. */
export interface VsdOperationCtx {
  reference: string;
  description: string;
  shipToCountry: string;
}

/** Item-context fields used by the filing narrative. */
export interface VsdItemCtx {
  name: string;
  internalSku?: string | null;
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
}

/** Lifecycle / outcome data lifted from TradeVoluntaryDisclosure. */
export type VsdCore = Pick<
  TradeVoluntaryDisclosure,
  | "id"
  | "authority"
  | "violationType"
  | "title"
  | "description"
  | "discoveredAt"
  | "occurredAt"
  | "status"
  | "filingReference"
  | "submittedAt"
  | "notes"
>;

export interface VsdBuilderInput {
  vsd: VsdCore;
  counterparty: VsdCounterparty | null;
  operation: VsdOperationCtx | null;
  item: VsdItemCtx | null;
  /** Org legal name (the filer / "Discloser"). */
  filerOrgName: string;
}

// ─── Document model (rendered uniformly) ────────────────────────────

export type VsdFieldValue = string | null;

export interface VsdField {
  label: string;
  value: VsdFieldValue;
  required: boolean;
}

export interface VsdSection {
  id: string;
  /** Roman-numeral or number prefix per the regulator's format. */
  ordinal: string;
  title: string;
  /** Optional narrative paragraph rendered before the fields. */
  paragraph?: string;
  fields: VsdField[];
  /** Optional bullet list used for enumerated facts / undertakings. */
  bullets?: string[];
}

export type VsdJurisdiction = "ofac" | "bis" | "ddtc";

export interface VsdDocument {
  title: string;
  /** Regulator + CFR anchor, e.g. "OFAC — 31 CFR § 501.806". */
  documentCode: string;
  jurisdiction: VsdJurisdiction;
  /** Original authority enum at the time of filing. */
  authority: TradeVSDAuthority;
  /** Date the certificate was prepared / printed (ISO yyyy-mm-dd). */
  preparedOn: string;
  /** Discloser org name (printed in the header). */
  filerOrgName: string;
  sections: VsdSection[];
}

// ─── Shared label helpers ───────────────────────────────────────────

export function humanViolationType(v: TradeVSDViolationType): string {
  switch (v) {
    case "UNLICENSED_EXPORT":
      return "Unlicensed export of controlled items";
    case "MISCLASSIFICATION":
      return "Mis-classification of controlled items";
    case "PROHIBITED_PARTY":
      return "Transaction with prohibited / sanctioned party";
    case "INVALID_LICENSE_EXCEPTION":
      return "Improper reliance on a license exception";
    case "DEEMED_EXPORT":
      return "Deemed export / foreign-national access";
    case "CATCH_ALL_OMISSION":
      return "Failure to file a catch-all determination";
    case "UNAUTHORIZED_REEXPORT":
      return "Unauthorized re-export";
    case "END_USE_VIOLATION":
      return "Breach of end-use commitments";
    case "OTHER":
    default:
      return "Other violation pattern";
  }
}

export function humanAuthority(a: TradeVSDAuthority): string {
  switch (a) {
    case "OFAC":
      return "U.S. Office of Foreign Assets Control";
    case "BIS":
      return "U.S. Bureau of Industry and Security";
    case "DDTC":
      return "U.S. Directorate of Defense Trade Controls";
    case "BAFA":
      return "Bundesamt für Wirtschaft und Ausfuhrkontrolle";
    case "EU_COMPETENT_AUTHORITY":
      return "EU Competent Authority";
    case "OTHER":
    default:
      return "Other authority";
  }
}

export function formatVsdAddress(lines: string[] | undefined): string {
  if (!lines || lines.length === 0) {
    return "[Address to be completed by the filer]";
  }
  return lines.filter((l) => l && l.trim().length > 0).join(", ");
}

export function formatVsdDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatItemLine(item: VsdItemCtx | null): string {
  if (!item) return "[Item to be specified]";
  const sku = item.internalSku ? ` (SKU ${item.internalSku})` : "";
  const eccnUS = item.eccnUS ? ` · US ECCN ${item.eccnUS}` : "";
  const usml = item.usmlCategory ? ` · USML ${item.usmlCategory}` : "";
  const eccnEU = item.eccnEU ? ` · EU Annex I ${item.eccnEU}` : "";
  return `${item.name}${sku}${eccnUS}${usml}${eccnEU}`;
}

export function formatCounterpartyLine(c: VsdCounterparty | null): string {
  if (!c) return "[Counterparty to be specified]";
  const trade = c.tradeName ? ` (trading as ${c.tradeName})` : "";
  return `${c.legalName}${trade} — ${c.countryCode}`;
}

/**
 * Tiny adapter so the route handler can pass the eagerly-loaded VSD +
 * counterparty + operation + item straight in without doing the
 * field-mapping inline. Mirrors `adaptEUCForAnnex`.
 */
export function adaptVsdForBuilder(args: {
  vsd: TradeVoluntaryDisclosure;
  party: {
    legalName: string;
    tradeName: string | null;
    countryCode: string;
    addressLines: string[];
  } | null;
  operation: {
    reference: string;
    description: string;
    shipToCountry: string;
  } | null;
  item: {
    name: string;
    internalSku: string | null;
    eccnEU: string | null;
    eccnUS: string | null;
    usmlCategory: string | null;
  } | null;
  filerOrgName: string;
}): VsdBuilderInput {
  const { vsd, party, operation, item, filerOrgName } = args;

  return {
    vsd: {
      id: vsd.id,
      authority: vsd.authority,
      violationType: vsd.violationType,
      title: vsd.title,
      description: vsd.description,
      discoveredAt: vsd.discoveredAt,
      occurredAt: vsd.occurredAt,
      status: vsd.status,
      filingReference: vsd.filingReference,
      submittedAt: vsd.submittedAt,
      notes: vsd.notes,
    },
    counterparty: party
      ? {
          legalName: party.legalName,
          tradeName: party.tradeName,
          countryCode: party.countryCode,
          addressLines: party.addressLines,
        }
      : null,
    operation: operation
      ? {
          reference: operation.reference,
          description: operation.description,
          shipToCountry: operation.shipToCountry,
        }
      : null,
    item: item
      ? {
          name: item.name,
          internalSku: item.internalSku,
          eccnEU: item.eccnEU,
          eccnUS: item.eccnUS,
          usmlCategory: item.usmlCategory,
        }
      : null,
    filerOrgName,
  };
}
