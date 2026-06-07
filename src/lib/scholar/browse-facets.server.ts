/**
 * browse-facets.server.ts — faceted-browse model for the Scholar Library.
 *
 * Server-only. Reads the full legal-source corpus (ALL_SOURCES) and produces:
 *   1. Facet groups with COUNTS computed across the corpus — Quellentyp (type),
 *      Jurisdiktion, Thema (compliance_areas), and Chronologie (decade buckets
 *      from date_enacted / date_in_force).
 *   2. A filtered + (optionally) sorted result list, where multiple facet groups
 *      combine with AND, and multiple selections WITHIN one group combine with OR.
 *
 * Pure data logic — no React, no JSX, no hooks. The corpus never reaches the
 * client bundle because this module is server-only and the page that consumes it
 * is a Server Component.
 *
 * Counts contract: each facet OPTION count is computed against the result set
 * that would remain if all OTHER groups' filters were applied but THIS group's
 * own selection were ignored. This is the standard faceted-search behaviour —
 * selecting one type does not zero-out the sibling types in the same group, so
 * the user can broaden within a group, while cross-group facets stay honest
 * about how many results each additional narrowing would yield.
 */
import "server-only";
import {
  ALL_SOURCES,
  type NormalizedLegalSource,
  type LegalSourceType,
  type ComplianceArea,
} from "@/data/legal-sources";
import { t, type ScholarLocale } from "@/app/(scholar)/scholar/_i18n/core";
import { BROWSE } from "@/app/(scholar)/scholar/_i18n/browse";

// ─── Public types ──────────────────────────────────────────────────────────

/** One selectable value inside a facet group, with its live result count. */
export interface FacetOption {
  /** Stable machine value used in the URL (?type=eu_regulation). */
  value: string;
  /** Human-readable German label for display. */
  label: string;
  /** How many results this option would contribute, given other active facets. */
  count: number;
}

export type FacetGroupKey = "type" | "jurisdiction" | "area" | "decade";

export interface FacetGroup {
  key: FacetGroupKey;
  /** German heading for the group ("Quellentyp", "Thema", …). */
  heading: string;
  options: FacetOption[];
}

export type SortKey = "relevance" | "date_desc" | "date_asc";

/** The active, normalised filter selection parsed from searchParams. */
export interface BrowseSelection {
  types: string[];
  jurisdictions: string[];
  areas: string[];
  decades: string[];
  sort: SortKey;
}

export interface BrowseResult {
  /** The facet groups with counts, ready to render as filter columns. */
  groups: FacetGroup[];
  /** Filtered + sorted sources (uncapped — caller applies the display cap). */
  sources: NormalizedLegalSource[];
  /** Total filtered count (pre-cap), for the "N Quellen" readout. */
  totalCount: number;
}

// ─── Facet-vocabulary label maps (machine value → BROWSE namespace key) ───────
// Surface-isolated: the Library never imports from the frozen Atlas surface.
// Display strings live in _i18n/browse.ts (EN source of truth + de/it/fr/es);
// these maps only point each controlled machine value at its translation key.
// Resolve a label with labelForType / labelForArea (locale-aware).

const TYPE_LABEL_KEYS: Record<string, keyof (typeof BROWSE)["en"]> = {
  international_treaty: "typeInternationalTreaty",
  federal_law: "typeFederalLaw",
  federal_regulation: "typeFederalRegulation",
  technical_standard: "typeTechnicalStandard",
  eu_regulation: "typeEuRegulation",
  eu_directive: "typeEuDirective",
  policy_document: "typePolicyDocument",
  draft_legislation: "typeDraftLegislation",
  certification_standard: "typeCertificationStandard",
  industry_guideline: "typeIndustryGuideline",
  insurance_clause: "typeInsuranceClause",
  scientific_protocol: "typeScientificProtocol",
  soft_law_resolution: "typeSoftLawResolution",
  national_security_doctrine: "typeNationalSecurityDoctrine",
  bilateral_agreement: "typeBilateralAgreement",
  multilateral_agreement: "typeMultilateralAgreement",
  case_law: "typeCaseLaw",
  procurement_framework: "typeProcurementFramework",
  safety_regulation: "typeSafetyRegulation",
  tax_treaty: "typeTaxTreaty",
};

const AREA_LABEL_KEYS: Record<string, keyof (typeof BROWSE)["en"]> = {
  licensing: "areaLicensing",
  registration: "areaRegistration",
  liability: "areaLiability",
  insurance: "areaInsurance",
  cybersecurity: "areaCybersecurity",
  export_control: "areaExportControl",
  data_security: "areaDataSecurity",
  frequency_spectrum: "areaFrequencySpectrum",
  environmental: "areaEnvironmental",
  debris_mitigation: "areaDebrisMitigation",
  space_traffic_management: "areaSpaceTrafficManagement",
  human_spaceflight: "areaHumanSpaceflight",
  military_dual_use: "areaMilitaryDualUse",
  competition_antitrust: "areaCompetitionAntitrust",
  state_aid: "areaStateAid",
  procurement: "areaProcurement",
  tax_customs: "areaTaxCustoms",
  sanctions_compliance: "areaSanctionsCompliance",
  ip_patents: "areaIpPatents",
  product_liability: "areaProductLiability",
  fdi_screening: "areaFdiScreening",
  ai_compliance: "areaAiCompliance",
  aml_kyc: "areaAmlKyc",
  consumer_protection: "areaConsumerProtection",
  employment_labor: "areaEmploymentLabor",
  scientific_research: "areaScientificResearch",
  media_broadcasting: "areaMediaBroadcasting",
  critical_infrastructure: "areaCriticalInfrastructure",
  sustainability_reporting: "areaSustainabilityReporting",
};

/** Locale-aware label for a legal-source type machine value. */
function labelForType(value: string, locale: ScholarLocale): string {
  const key = TYPE_LABEL_KEYS[value];
  return key ? t(locale, BROWSE, key) : value;
}

/** Locale-aware label for a compliance-area machine value. */
function labelForArea(value: string, locale: ScholarLocale): string {
  const key = AREA_LABEL_KEYS[value];
  return key ? t(locale, BROWSE, key) : value;
}

// ─── Decade buckets (Chronologie) ────────────────────────────────────────────

/** Stable order of decade-bucket values, oldest → newest. */
const DECADE_ORDER = [
  "pre-1960",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
] as const;

// Decade-bucket machine value → BROWSE key (display strings in _i18n/browse.ts).
const DECADE_LABEL_KEYS: Record<string, keyof (typeof BROWSE)["en"]> = {
  "pre-1960": "decadePre1960",
  "1960s": "decade1960s",
  "1970s": "decade1970s",
  "1980s": "decade1980s",
  "1990s": "decade1990s",
  "2000s": "decade2000s",
  "2010s": "decade2010s",
  "2020s": "decade2020s",
};

/** Locale-aware label for a decade-bucket machine value. */
function labelForDecade(value: string, locale: ScholarLocale): string {
  const key = DECADE_LABEL_KEYS[value];
  return key ? t(locale, BROWSE, key) : value;
}

/**
 * The chronology anchor for a source: prefer date_in_force (the date it became
 * operative law), fall back to date_enacted. Returns a 4-digit year or null.
 */
function sourceYear(s: NormalizedLegalSource): number | null {
  const raw = s.date_in_force ?? s.date_enacted ?? null;
  if (!raw) return null;
  const m = /^(\d{4})/.exec(raw);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

/** Map a year to its decade-bucket value, or null when undated. */
function decadeBucket(year: number | null): string | null {
  if (year === null) return null;
  if (year < 1960) return "pre-1960";
  if (year < 1970) return "1960s";
  if (year < 1980) return "1970s";
  if (year < 1990) return "1980s";
  if (year < 2000) return "1990s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

// ─── Jurisdiction label (kept local; INT/EU specials) ────────────────────────
// INT/EU are not in ISO-3166; their display names are localised via BROWSE.

const SPECIAL_JURISDICTION_KEYS: Record<string, keyof (typeof BROWSE)["en"]> = {
  INT: "jurisdictionINT",
  EU: "jurisdictionEU",
};

/**
 * Resolve a jurisdiction code to a display name: INT/EU via BROWSE (locale-aware),
 * everything else via the caller-supplied ISO-3166 resolver. Falls back to the
 * raw code as a last resort.
 */
function labelForJurisdiction(
  code: string,
  locale: ScholarLocale,
  jurisdictionName: (c: string) => string,
): string {
  const key = SPECIAL_JURISDICTION_KEYS[code];
  if (key) return t(locale, BROWSE, key);
  return jurisdictionName(code) ?? code;
}

// ─── Selection parsing ───────────────────────────────────────────────────────

/**
 * Read a possibly-repeated query param into a clean string[].
 * Accepts ?type=a&type=b (array) or ?type=a (string) or a comma list ?type=a,b.
 */
function readMulti(
  v: string | string[] | undefined,
  transform: (s: string) => string = (s) => s,
): string[] {
  if (v === undefined) return [];
  const parts = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const p of parts) {
    for (const piece of p.split(",")) {
      const t = transform(piece.trim());
      if (t) out.push(t);
    }
  }
  // de-dupe, preserve first-seen order
  return Array.from(new Set(out));
}

const VALID_SORTS: ReadonlySet<string> = new Set([
  "relevance",
  "date_desc",
  "date_asc",
]);

/**
 * Parse the raw Next.js searchParams object into a normalised BrowseSelection.
 * Unknown / malformed values are dropped (defensive — these come from the URL).
 */
export function parseBrowseSelection(
  sp: Record<string, string | string[] | undefined>,
): BrowseSelection {
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "";
  return {
    types: readMulti(sp.type),
    jurisdictions: readMulti(sp.jurisdiction, (s) => s.toUpperCase()),
    areas: readMulti(sp.area),
    decades: readMulti(sp.decade),
    sort: (VALID_SORTS.has(sortRaw) ? sortRaw : "relevance") as SortKey,
  };
}

// ─── Predicate helpers (one per group) ───────────────────────────────────────

function matchesType(s: NormalizedLegalSource, sel: BrowseSelection): boolean {
  return sel.types.length === 0 || sel.types.includes(s.type);
}
function matchesJurisdiction(
  s: NormalizedLegalSource,
  sel: BrowseSelection,
): boolean {
  return (
    sel.jurisdictions.length === 0 || sel.jurisdictions.includes(s.jurisdiction)
  );
}
function matchesArea(s: NormalizedLegalSource, sel: BrowseSelection): boolean {
  return (
    sel.areas.length === 0 ||
    s.compliance_areas.some((a) => sel.areas.includes(a))
  );
}
function matchesDecade(
  s: NormalizedLegalSource,
  sel: BrowseSelection,
): boolean {
  if (sel.decades.length === 0) return true;
  const b = decadeBucket(sourceYear(s));
  return b !== null && sel.decades.includes(b);
}

/**
 * Sources that pass every group EXCEPT the named one — the base set for that
 * group's option counts (standard faceted-search "exclude own group" rule).
 */
function passingExcept(
  exclude: FacetGroupKey,
  sel: BrowseSelection,
): NormalizedLegalSource[] {
  return ALL_SOURCES.filter(
    (s) =>
      (exclude === "type" || matchesType(s, sel)) &&
      (exclude === "jurisdiction" || matchesJurisdiction(s, sel)) &&
      (exclude === "area" || matchesArea(s, sel)) &&
      (exclude === "decade" || matchesDecade(s, sel)),
  );
}

// ─── Relevance sort order (matches getLegalBasisChain) ───────────────────────

const RELEVANCE_ORDER: Record<string, number> = {
  fundamental: 0,
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Build the full faceted-browse view for the Library: facet groups (with
 * exclude-own-group counts) plus the filtered + sorted result list.
 *
 * @param sel     parsed selection (from parseBrowseSelection)
 * @param jurisdictionName  resolver for a jurisdiction code → display name
 *                          (the page passes its ISO-3166 helper so we don't
 *                          duplicate the country table here)
 * @param locale  active Scholar UI locale for facet labels + group headings
 *                 (EN fallback when omitted, e.g. unauthenticated)
 */
export function buildBrowse(
  sel: BrowseSelection,
  jurisdictionName: (code: string) => string,
  locale: ScholarLocale = "en",
): BrowseResult {
  // ── Facet: Quellentyp ──────────────────────────────────────────────────
  const typeBase = passingExcept("type", sel);
  const typeCounts = new Map<string, number>();
  for (const s of typeBase) {
    typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);
  }
  const typeOptions: FacetOption[] = Array.from(typeCounts.entries())
    .map(([value, count]) => ({
      value,
      label: labelForType(value, locale),
      count,
    }))
    .sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, locale),
    );

  // ── Facet: Jurisdiktion ────────────────────────────────────────────────
  const jurBase = passingExcept("jurisdiction", sel);
  const jurCounts = new Map<string, number>();
  for (const s of jurBase) {
    jurCounts.set(s.jurisdiction, (jurCounts.get(s.jurisdiction) ?? 0) + 1);
  }
  const jurOptions: FacetOption[] = Array.from(jurCounts.entries())
    .map(([value, count]) => ({
      value,
      label: labelForJurisdiction(value, locale, jurisdictionName),
      count,
    }))
    .sort((a, b) => {
      // Pin INT then EU to the top; rest alphabetical by localised label.
      if (a.value === "INT") return -1;
      if (b.value === "INT") return 1;
      if (a.value === "EU") return -1;
      if (b.value === "EU") return 1;
      return a.label.localeCompare(b.label, locale);
    });

  // ── Facet: Thema (compliance_areas) ────────────────────────────────────
  const areaBase = passingExcept("area", sel);
  const areaCounts = new Map<string, number>();
  for (const s of areaBase) {
    for (const a of s.compliance_areas) {
      areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
    }
  }
  const areaOptions: FacetOption[] = Array.from(areaCounts.entries())
    .map(([value, count]) => ({
      value,
      label: labelForArea(value, locale),
      count,
    }))
    .sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, locale),
    );

  // ── Facet: Chronologie (decade buckets) ────────────────────────────────
  const decBase = passingExcept("decade", sel);
  const decCounts = new Map<string, number>();
  for (const s of decBase) {
    const b = decadeBucket(sourceYear(s));
    if (b) decCounts.set(b, (decCounts.get(b) ?? 0) + 1);
  }
  // Keep chronological order (oldest → newest); drop empty buckets.
  const decOptions: FacetOption[] = DECADE_ORDER.filter((d) =>
    decCounts.has(d),
  ).map((d) => ({
    value: d,
    label: labelForDecade(d, locale),
    count: decCounts.get(d) ?? 0,
  }));

  const groups: FacetGroup[] = [
    {
      key: "type",
      heading: t(locale, BROWSE, "groupType"),
      options: typeOptions,
    },
    {
      key: "jurisdiction",
      heading: t(locale, BROWSE, "groupJurisdiction"),
      options: jurOptions,
    },
    {
      key: "area",
      heading: t(locale, BROWSE, "groupArea"),
      options: areaOptions,
    },
    {
      key: "decade",
      heading: t(locale, BROWSE, "groupDecade"),
      options: decOptions,
    },
  ];

  // ── Filtered result list (AND across all groups) ───────────────────────
  const filtered = ALL_SOURCES.filter(
    (s) =>
      matchesType(s, sel) &&
      matchesJurisdiction(s, sel) &&
      matchesArea(s, sel) &&
      matchesDecade(s, sel),
  );

  // ── Sort ────────────────────────────────────────────────────────────────
  const sorted = [...filtered];
  if (sel.sort === "date_desc" || sel.sort === "date_asc") {
    const dir = sel.sort === "date_asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const ya = sourceYear(a);
      const yb = sourceYear(b);
      // Undated sources sink to the bottom in both directions.
      if (ya === null && yb === null) return 0;
      if (ya === null) return 1;
      if (yb === null) return -1;
      return (ya - yb) * dir;
    });
  } else {
    // relevance (default) — fundamental → low, then title for stability
    sorted.sort(
      (a, b) =>
        (RELEVANCE_ORDER[a.relevance_level] ?? 5) -
          (RELEVANCE_ORDER[b.relevance_level] ?? 5) ||
        a.title_en.localeCompare(b.title_en, "de"),
    );
  }

  return { groups, sources: sorted, totalCount: sorted.length };
}

// ─── URL helpers (chip removal + toggle links) ───────────────────────────────

/** Build a query string from a selection (omits empty groups & default sort). */
export function selectionToQuery(sel: BrowseSelection): string {
  const p = new URLSearchParams();
  for (const t of sel.types) p.append("type", t);
  for (const j of sel.jurisdictions) p.append("jurisdiction", j);
  for (const a of sel.areas) p.append("area", a);
  for (const d of sel.decades) p.append("decade", d);
  if (sel.sort !== "relevance") p.set("sort", sel.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const GROUP_TO_FIELD: Record<FacetGroupKey, keyof BrowseSelection> = {
  type: "types",
  jurisdiction: "jurisdictions",
  area: "areas",
  decade: "decades",
};

/** A copy of the selection with `value` removed from the given group. */
export function selectionWithout(
  sel: BrowseSelection,
  group: FacetGroupKey,
  value: string,
): BrowseSelection {
  const field = GROUP_TO_FIELD[group];
  return {
    ...sel,
    [field]: (sel[field] as string[]).filter((v) => v !== value),
  };
}

/** A copy of the selection that toggles `value` in the given group on/off. */
export function selectionToggle(
  sel: BrowseSelection,
  group: FacetGroupKey,
  value: string,
): BrowseSelection {
  const field = GROUP_TO_FIELD[group];
  const cur = sel[field] as string[];
  const next = cur.includes(value)
    ? cur.filter((v) => v !== value)
    : [...cur, value];
  return { ...sel, [field]: next };
}

/** A copy of the selection with the sort key changed. */
export function selectionWithSort(
  sel: BrowseSelection,
  sort: SortKey,
): BrowseSelection {
  return { ...sel, sort };
}

/** True when at least one facet filter (not sort) is active. */
export function hasActiveFilters(sel: BrowseSelection): boolean {
  return (
    sel.types.length > 0 ||
    sel.jurisdictions.length > 0 ||
    sel.areas.length > 0 ||
    sel.decades.length > 0
  );
}

/** Human-readable, locale-aware label for an active value, for chip display. */
export function labelForValue(
  group: FacetGroupKey,
  value: string,
  jurisdictionName: (code: string) => string,
  locale: ScholarLocale = "en",
): string {
  switch (group) {
    case "type":
      return labelForType(value, locale);
    case "area":
      return labelForArea(value, locale);
    case "decade":
      return labelForDecade(value, locale);
    case "jurisdiction":
      return labelForJurisdiction(value, locale, jurisdictionName);
  }
}

/** Locale-aware heading for a group key (for chip a11y text). */
const GROUP_HEADING_KEYS: Record<FacetGroupKey, keyof (typeof BROWSE)["en"]> = {
  type: "groupType",
  jurisdiction: "groupJurisdiction",
  area: "groupArea",
  decade: "groupDecade",
};

export function groupHeading(
  group: FacetGroupKey,
  locale: ScholarLocale = "en",
): string {
  return t(locale, BROWSE, GROUP_HEADING_KEYS[group]);
}

// Re-export the corpus types used in page props for convenience.
export type { NormalizedLegalSource, LegalSourceType, ComplianceArea };
