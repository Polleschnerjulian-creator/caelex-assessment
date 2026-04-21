/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas Regulatory Forecast Engine.
 *
 * Aggregates two existing data sources into a single time-indexed
 * event catalogue used by the comparator's "time-travel" view:
 *
 *   1. REGULATION_TIMELINE — curated high-level regulatory phases
 *      (EU Space Act ramp-up, NIS2 supersession, FCC 5-year PMD, etc.)
 *
 *   2. LEGAL_SOURCES — per-jurisdiction draft / proposed / planned
 *      instruments with ISO `date_in_force` or `date_published`, plus
 *      future-dated `amendments[]` entries.
 *
 * The engine produces a list of `ForecastEvent` objects the UI can
 * filter against a user-selected target date to show what changes
 * between today and that date — per jurisdiction, per dimension, per
 * comparison-table row concept.
 *
 * Pure deterministic — no DB calls, no LLM, no network. All data
 * lives in TypeScript module exports compiled into the bundle.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { REGULATION_TIMELINE } from "@/data/regulation-timeline";
import type { RegulationPhase } from "@/data/regulation-timeline";
import type { LegalSource } from "@/data/legal-sources/types";

// Legal sources imported from the files most likely to contain
// forecastable future events. Keeping these explicit (rather than a
// sprawling 31-import barrel pull) keeps the forecast-engine's
// data-surface transparent and its bundle footprint modest.
import { LEGAL_SOURCES_INT } from "@/data/legal-sources/sources/intl";
import { LEGAL_SOURCES_EU } from "@/data/legal-sources/sources/eu";
import { LEGAL_SOURCES_FR } from "@/data/legal-sources/sources/fr";
import { LEGAL_SOURCES_DE } from "@/data/legal-sources/sources/de";
import { LEGAL_SOURCES_UK } from "@/data/legal-sources/sources/uk";
import { LEGAL_SOURCES_US } from "@/data/legal-sources/sources/us";
import { LEGAL_SOURCES_NZ } from "@/data/legal-sources/sources/nz";
import { LEGAL_SOURCES_IT } from "@/data/legal-sources/sources/it";
import { LEGAL_SOURCES_LU } from "@/data/legal-sources/sources/lu";
import { LEGAL_SOURCES_NL } from "@/data/legal-sources/sources/nl";
import { LEGAL_SOURCES_BE } from "@/data/legal-sources/sources/be";
import { LEGAL_SOURCES_ES } from "@/data/legal-sources/sources/es";
import { LEGAL_SOURCES_AT } from "@/data/legal-sources/sources/at";
import { LEGAL_SOURCES_PL } from "@/data/legal-sources/sources/pl";
import { LEGAL_SOURCES_DK } from "@/data/legal-sources/sources/dk";
import { LEGAL_SOURCES_NO } from "@/data/legal-sources/sources/no";
import { LEGAL_SOURCES_SE } from "@/data/legal-sources/sources/se";
import { LEGAL_SOURCES_FI } from "@/data/legal-sources/sources/fi";
import { LEGAL_SOURCES_CH } from "@/data/legal-sources/sources/ch";

// ─── Types ──────────────────────────────────────────────────────────

export type ForecastConfidence = "high" | "medium" | "low";

export type ForecastDimension =
  | "authorization"
  | "liability"
  | "debris"
  | "registration"
  | "timeline"
  | "eu_readiness";

export interface ForecastEvent {
  /** Canonical source id (e.g. "EU-SPACE-ACT", "FR-TECHREG-CONSULT-2024"). */
  id: string;
  /** Human-readable label used in tooltips + timeline ribbon. */
  label: string;
  /** ISO date (YYYY-MM-DD) the change takes effect. */
  effectiveDate: string;
  /** Confidence the change will land on schedule. */
  confidence: ForecastConfidence;
  /** Jurisdictions affected. ISO alpha-2 (FR, DE, …), plus "EU" / "INT". */
  jurisdictions: string[];
  /** Which comparator dimensions this change touches. */
  dimensions: ForecastDimension[];
  /**
   * Comparator-row concepts modified by this change — drives per-cell
   * forecast badge rendering. Leave empty for ribbon-only visibility.
   */
  affectedConcepts: string[];
  /** Short summary for the tooltip / details panel. */
  summary: string;
  /** Optional link to the authoritative source. */
  sourceUrl?: string;
}

// ─── Sources import (lazy via dynamic require to avoid bundling every
//     country file in the public bundle; the comparator page is
//     server-renderable so this is fine for SSR) ─────────────────────

// We rely on the `ALL_SOURCES` aggregation exported by the legal-sources
// index. Importing from the barrel keeps the engine insulated from
// the per-country file layout and automatically picks up any new
// jurisdiction module added to the registry.
import type { LegalSourceStatus } from "@/data/legal-sources/types";

// ─── Config ─────────────────────────────────────────────────────────

/** Today as an ISO YYYY-MM-DD string, evaluated once per process. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** Confidence resolution for a REGULATION_TIMELINE phase. */
function phaseConfidence(phase: RegulationPhase): ForecastConfidence {
  // "upcoming" with a concrete effective date → high confidence if
  // official, medium otherwise. Since REGULATION_TIMELINE is
  // curator-approved, we treat all its entries as high unless the
  // status explicitly signals uncertainty.
  if (phase.status === "upcoming") return "high";
  if (phase.status === "transition") return "high";
  if (phase.status === "in_force") return "high";
  return "medium";
}

/** Confidence resolution for a LegalSource status. */
function sourceConfidence(status: LegalSourceStatus): ForecastConfidence {
  switch (status) {
    case "in_force":
    case "planned":
      return "high";
    case "draft":
      return "medium";
    case "proposed":
      return "low";
    default:
      return "low";
  }
}

/**
 * Map a REGULATION_TIMELINE `applicableTo` array to ISO jurisdiction
 * codes. The timeline uses broad labels ("all_eu_operators",
 * "us_licensed_operators", "fr_operators"); we expand them here to
 * the 31-jurisdiction Atlas keyspace. Unknown labels are kept as-is
 * so the UI can still group them under "INT".
 */
function expandApplicableTo(applicableTo: string[]): string[] {
  const out = new Set<string>();
  for (const tag of applicableTo) {
    if (tag === "all_operators" || tag === "all_space_operators") {
      out.add("INT");
      continue;
    }
    if (tag === "all_eu_operators") {
      for (const c of EU_ISO_CODES) out.add(c);
      continue;
    }
    if (tag === "us_licensed_operators" || tag === "us_market_access") {
      out.add("US");
      continue;
    }
    if (tag === "uk_operators") {
      out.add("UK");
      continue;
    }
    if (tag === "fr_operators") {
      out.add("FR");
      continue;
    }
    if (tag === "de_operators") {
      out.add("DE");
      continue;
    }
    if (tag === "spectrum_users") {
      // Spectrum affects all satellite operators globally.
      out.add("INT");
      continue;
    }
    out.add(tag.toUpperCase());
  }
  return Array.from(out);
}

const EU_ISO_CODES = [
  "FR",
  "DE",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "AT",
  "PL",
  "DK",
  "SE",
  "FI",
  "PT",
  "GR",
  "CZ",
  "IE",
  "EE",
  "RO",
  "HU",
  "SI",
  "LV",
  "LT",
  "SK",
  "HR",
];

/**
 * Heuristic: map a LegalSource to the set of comparator dimensions
 * it touches, using its compliance_areas + type. The mapping is
 * intentionally conservative — an event shows up under as many
 * dimensions as its compliance areas hint at, but we don't make up
 * dimensions that aren't supported by the data.
 */
function mapSourceDimensions(source: LegalSource): ForecastDimension[] {
  const dims = new Set<ForecastDimension>();
  for (const area of source.compliance_areas) {
    switch (area) {
      case "licensing":
        dims.add("authorization");
        break;
      case "registration":
        dims.add("registration");
        break;
      case "liability":
      case "insurance":
        dims.add("liability");
        break;
      case "debris_mitigation":
        dims.add("debris");
        break;
      default:
        // Cybersecurity, export, spectrum, etc. don't surface in the
        // comparator today — skip.
        break;
    }
  }
  if (source.type === "eu_regulation" || source.type === "eu_directive") {
    dims.add("eu_readiness");
  }
  if (
    source.type === "draft_legislation" ||
    source.status === "draft" ||
    source.status === "proposed"
  ) {
    dims.add("timeline");
  }
  return Array.from(dims);
}

/**
 * Heuristic: map a LegalSource to the set of ComparisonTable row
 * concepts it affects. Based on keyword matching over the title_en.
 * Conservative on purpose — rows that don't match any keyword get
 * an empty `affectedConcepts` and only show up in the ribbon, not
 * as per-cell badges.
 */
function mapSourceConcepts(source: LegalSource): string[] {
  const concepts = new Set<string>();
  const title = source.title_en.toLowerCase();
  const tags = source.compliance_areas;

  if (
    /deorbit|disposal|debris/.test(title) ||
    tags.includes("debris_mitigation")
  ) {
    concepts.add("deorbit_timeline");
    concepts.add("debris_mitigation_plan");
  }
  if (
    /liability|insurance|indemnity/.test(title) ||
    tags.includes("liability")
  ) {
    concepts.add("liability_regime");
    concepts.add("liability_cap");
    concepts.add("mandatory_insurance");
    concepts.add("minimum_coverage");
  }
  if (
    /licence|licens|authoris|authoriz/.test(title) ||
    tags.includes("licensing")
  ) {
    concepts.add("status");
    concepts.add("licensing_authority");
  }
  if (/registration|registry/.test(title) || tags.includes("registration")) {
    concepts.add("national_registry");
    concepts.add("registry_name");
  }
  if (source.type === "eu_regulation" || /eu space act/i.test(title)) {
    concepts.add("eu_space_act_readiness");
    concepts.add("relationship");
  }
  return Array.from(concepts);
}

// ─── Event aggregation ──────────────────────────────────────────────

let cachedEvents: ForecastEvent[] | null = null;

/**
 * Primary accessor: all forecast events, sorted by effectiveDate ASC.
 * Memoised module-level; the underlying data is static so we never
 * need to refresh mid-process.
 */
export function getAllForecastEvents(): ForecastEvent[] {
  if (cachedEvents) return cachedEvents;

  const fromTimeline: ForecastEvent[] = REGULATION_TIMELINE.filter(
    (p) => !!p.effectiveDate,
  ).map((p) => ({
    id: p.id,
    label: p.regulation,
    effectiveDate: p.effectiveDate,
    confidence: phaseConfidence(p),
    jurisdictions: expandApplicableTo(p.applicableTo),
    dimensions: dimensionsForTimelinePhase(p),
    affectedConcepts: conceptsForTimelinePhase(p),
    summary: p.notes,
  }));

  // Dynamic import avoided: ALL_SOURCES is aggregated at module load.
  // The require pattern below keeps the bundle analyser happy and
  // avoids TS circular dependency warnings.
  const fromSources: ForecastEvent[] = [];
  for (const source of getAllLegalSources()) {
    // Primary event from date_in_force if in the future.
    if (source.date_in_force && source.date_in_force > TODAY_ISO) {
      fromSources.push({
        id: source.id,
        label: source.title_en,
        effectiveDate: source.date_in_force,
        confidence: sourceConfidence(source.status),
        jurisdictions: resolveJurisdictions(source),
        dimensions: mapSourceDimensions(source),
        affectedConcepts: mapSourceConcepts(source),
        summary: source.scope_description ?? source.title_en,
        sourceUrl: source.source_url,
      });
    }
    // Future-dated amendments — each becomes its own event.
    for (const amendment of source.amendments ?? []) {
      if (amendment.date > TODAY_ISO) {
        fromSources.push({
          id: `${source.id}:AMEND:${amendment.date}`,
          label: `${source.title_en} — amendment`,
          effectiveDate: amendment.date,
          confidence: "high", // amendments have a formal reference
          jurisdictions: resolveJurisdictions(source),
          dimensions: mapSourceDimensions(source),
          affectedConcepts: mapSourceConcepts(source),
          summary: amendment.summary,
          sourceUrl: amendment.source_url ?? source.source_url,
        });
      }
    }
  }

  // Deduplicate by id — REGULATION_TIMELINE entries can overlap with
  // legal-sources (e.g. "eu-space-act-proposal" vs EU-SPACE-ACT).
  // First occurrence wins (timeline preferred — it's curator-approved).
  const seen = new Set<string>();
  const merged = [...fromTimeline, ...fromSources].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  merged.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  cachedEvents = merged;
  return merged;
}

// ─── Timeline-phase concept/dimension resolution ────────────────────

function dimensionsForTimelinePhase(p: RegulationPhase): ForecastDimension[] {
  const name = p.regulation.toLowerCase();
  const dims = new Set<ForecastDimension>();
  if (/eu space act|nis2/.test(name)) {
    dims.add("eu_readiness");
    dims.add("authorization");
    dims.add("debris");
  }
  if (/deorbit|debris/.test(name)) dims.add("debris");
  if (/space industry act|space activities/.test(name)) {
    dims.add("authorization");
    dims.add("liability");
  }
  if (/lts|long-term sustainability/.test(name)) dims.add("debris");
  if (/itu|radio regulations|spectrum/.test(name)) dims.add("authorization");
  if (/space act|space operations/.test(name)) {
    dims.add("authorization");
    dims.add("timeline");
  }
  if (dims.size === 0) dims.add("timeline");
  return Array.from(dims);
}

function conceptsForTimelinePhase(p: RegulationPhase): string[] {
  const name = p.regulation.toLowerCase();
  const concepts = new Set<string>();
  if (/eu space act/.test(name)) {
    concepts.add("eu_space_act_readiness");
    concepts.add("relationship");
    concepts.add("status");
  }
  if (/nis2/.test(name)) {
    concepts.add("cybersecurity_regime");
    concepts.add("eu_space_act_readiness");
  }
  if (/deorbit|debris/.test(name)) {
    concepts.add("deorbit_timeline");
    concepts.add("debris_mitigation_plan");
  }
  if (/space industry act|space activities|space operations/.test(name)) {
    concepts.add("status");
    concepts.add("legislation");
  }
  return Array.from(concepts);
}

// ─── Time-indexed queries ────────────────────────────────────────────

/**
 * Events whose effective date falls in (today, targetDate].
 * Used by the comparator to decide which rows need forecast badges
 * at a given slider position.
 */
export function getEffectiveEventsAt(targetDate: Date): ForecastEvent[] {
  const iso = toISO(targetDate);
  return getAllForecastEvents().filter(
    (e) => e.effectiveDate > TODAY_ISO && e.effectiveDate <= iso,
  );
}

/**
 * Per-jurisdiction subset of the full catalogue, for the timeline
 * ribbon visualisation. Returns only future events; past events are
 * surfaced in the static comparator table itself and don't need to
 * clutter the ribbon.
 */
export function getJurisdictionTimeline(code: string): ForecastEvent[] {
  return getAllForecastEvents().filter(
    (e) =>
      e.effectiveDate > TODAY_ISO &&
      (e.jurisdictions.includes(code) ||
        e.jurisdictions.includes("INT") ||
        (e.jurisdictions.includes("EU") && EU_ISO_CODES.includes(code))),
  );
}

// ─── Internal helpers ───────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveJurisdictions(source: LegalSource): string[] {
  const codes = new Set<string>();
  codes.add(source.jurisdiction);
  for (const c of source.applies_to_jurisdictions ?? []) codes.add(c);
  return Array.from(codes);
}

/**
 * Concatenated legal-source catalogue covering every jurisdiction
 * with draft / proposed / future-dated content we care about. The
 * list is explicit (rather than dynamic) so the forecast-engine's
 * data dependencies are reviewable at a glance.
 */
function getAllLegalSources(): LegalSource[] {
  return [
    ...LEGAL_SOURCES_INT,
    ...LEGAL_SOURCES_EU,
    ...LEGAL_SOURCES_FR,
    ...LEGAL_SOURCES_DE,
    ...LEGAL_SOURCES_UK,
    ...LEGAL_SOURCES_US,
    ...LEGAL_SOURCES_NZ,
    ...LEGAL_SOURCES_IT,
    ...LEGAL_SOURCES_LU,
    ...LEGAL_SOURCES_NL,
    ...LEGAL_SOURCES_BE,
    ...LEGAL_SOURCES_ES,
    ...LEGAL_SOURCES_AT,
    ...LEGAL_SOURCES_PL,
    ...LEGAL_SOURCES_DK,
    ...LEGAL_SOURCES_NO,
    ...LEGAL_SOURCES_SE,
    ...LEGAL_SOURCES_FI,
    ...LEGAL_SOURCES_CH,
  ];
}

// ─── Test-only hooks (bypass module-level caching) ──────────────────

/**
 * @internal — only for unit tests. Resets the in-memory event cache
 * so tests can mutate the underlying data and re-query.
 */
export function __resetForecastCacheForTests(): void {
  cachedEvents = null;
}
