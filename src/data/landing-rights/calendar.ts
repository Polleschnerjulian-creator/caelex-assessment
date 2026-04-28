/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Renewal calendar — events auto-computed from existing profile data
 * plus hardcoded global milestones (ITU Resolution 35, FCC milestones,
 * WRC conferences, known regulatory change deadlines).
 *
 * No external fetches. Pure function of static content.
 */

import { ALL_LANDING_RIGHTS_PROFILES } from "./index";
import type { CalendarEvent } from "./types";
import type { JurisdictionCode } from "./_helpers";

const TODAY_ISO = "2026-04-17";

function addYears(iso: string, years: number): string {
  // Accepts "YYYY-MM" or "YYYY-MM-DD"; returns in same granularity.
  const parts = iso.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  if (!year) return iso;
  const newYear = year + years;
  return parts.length === 1
    ? `${newYear}`
    : parts.length === 2
      ? `${newYear}-${parts[1]}`
      : `${newYear}-${parts[1]}-${parts[2]}`;
}

function normalizeDate(iso: string): string {
  // Pad YYYY or YYYY-MM to YYYY-MM-DD for sorting.
  const parts = iso.split("-");
  return [parts[0] ?? "0000", parts[1] ?? "01", parts[2] ?? "01"].join("-");
}

function computeStatus(date: string): CalendarEvent["status"] {
  const today = normalizeDate(TODAY_ISO);
  const d = normalizeDate(date);
  return d < today ? "past" : "upcoming";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Hardcoded global milestones — publicly verified regulatory deadlines
 * that are not derivable from profile data.
 */
const GLOBAL_MILESTONES: CalendarEvent[] = [
  {
    id: "kuiper-fcc-50pct-milestone",
    date: "2026-07-30",
    type: "milestone",
    jurisdiction: "US",
    operator: "Kuiper",
    title: "Kuiper FCC 50% deployment milestone",
    description:
      "Per FCC authorisation (30 July 2020), Amazon must launch 50% of the 3,236-satellite Kuiper constellation by this date or face licence modifications under Resolution 35 (Rev.WRC-23).",
    source_url:
      "https://www.fcc.gov/document/fcc-authorizes-kuiper-ngso-system",
    status: "upcoming",
  },
  {
    id: "kuiper-fcc-100pct-milestone",
    date: "2029-07-30",
    type: "milestone",
    jurisdiction: "US",
    operator: "Kuiper",
    title: "Kuiper FCC 100% deployment milestone",
    description: "100% of the 3,236-satellite constellation must be deployed.",
    source_url:
      "https://www.fcc.gov/document/fcc-authorizes-kuiper-ngso-system",
    status: "upcoming",
  },
  {
    id: "wrc-27",
    date: "2027-11-01",
    type: "wrc",
    title: "WRC-27 opens",
    description:
      "Key agenda items: AI 1.5 (unauthorised NGSO earth stations), AI 1.7 (Q/V band equitable access), AI 1.13/1.14 (sub-3 GHz MSS allocations for direct-to-device).",
    source_url:
      "https://www.itu.int/en/ITU-R/conferences/wrc/Pages/default.aspx",
    status: "upcoming",
  },
  {
    id: "wrc-31",
    date: "2031-11-01",
    type: "wrc",
    title: "WRC-31 — EPFD review consequences",
    description:
      "WRC-23 deferred meaningful Article 22 EPFD change to WRC-31. GSO protection baseline expected to remain through 2031.",
    source_url:
      "https://www.itu.int/en/ITU-R/conferences/wrc/Pages/default.aspx",
    status: "upcoming",
  },
  {
    id: "in-navic-mandate",
    date: "2029-01-01",
    type: "regulatory_change",
    jurisdiction: "IN",
    title: "India NavIC terminal mandate in force",
    description:
      "All satellite-based user terminals operated in India must support NavIC positioning from this date.",
    status: "upcoming",
  },
  {
    id: "de-wrg-expected",
    date: "2026-12-01",
    type: "regulatory_change",
    jurisdiction: "DE",
    title: "Germany Weltraumgesetz (WRG) expected enactment",
    description:
      "Draft Space Act based on September 2024 Eckpunkte expected to be enacted, introducing licensing, liability, and insurance regime for German-established operators.",
    status: "upcoming",
  },
  {
    id: "it-law-89-2025-in-force",
    date: "2025-06-25",
    type: "regulatory_change",
    jurisdiction: "IT",
    title: "Italy Law 89/2025 in force",
    description:
      "€100M insurance cap per claim (€20M for innovative startups/scientific missions); 60+120 day authorisation windows.",
    status: "past",
  },
  {
    id: "eu-space-act-proposal",
    date: "2025-06-25",
    type: "regulatory_change",
    jurisdiction: "EU" as unknown as JurisdictionCode, // marker only, not in schema
    title: "EU Space Act — Commission proposal published",
    description:
      "119-article draft; GDPR-style extraterritorial reach for non-EU operators providing space services within the Union. Parliament and Council vote expected 2026.",
    source_url: "https://eur-lex.europa.eu/",
    status: "past",
  },
  {
    id: "marlink-team-telecom-enforcement",
    date: "2026-01-01",
    type: "enforcement",
    jurisdiction: "US",
    title: "First FCC Team Telecom enforcement action (Marlink)",
    description:
      "First public post-EO 13913 Team Telecom enforcement; signal that Letters of Agreement are now actively audited.",
    status: "past",
  },
];

/**
 * Compute license-renewal events from profile.renewal.term_years + operator_snapshots.X.since.
 */
function computeRenewalEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const profile of ALL_LANDING_RIGHTS_PROFILES) {
    const term = profile.renewal.term_years;
    if (!term) continue;
    for (const [op, snap] of Object.entries(profile.operator_snapshots)) {
      if (!snap?.since || snap.status !== "licensed") continue;
      const renewDate = addYears(snap.since, term);
      events.push({
        id: `${op}-${profile.jurisdiction.toLowerCase()}-renewal`,
        date: renewDate,
        type: "license_renewal",
        jurisdiction: profile.jurisdiction,
        operator: capitalize(op),
        title: `${capitalize(op)} licence renewal — ${profile.jurisdiction}`,
        description: `Original grant ${snap.since}, ${term}-year term.`,
        status: computeStatus(renewDate),
      });
    }
  }
  return events;
}

/**
 * Pure function: returns sorted array of all calendar events (past + upcoming).
 * Called at render time, no caching.
 */
export function getAllCalendarEvents(): CalendarEvent[] {
  const events = [...GLOBAL_MILESTONES, ...computeRenewalEvents()];
  return events.sort((a, b) => {
    const cmp = normalizeDate(a.date).localeCompare(normalizeDate(b.date));
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
}

export function getUpcomingEvents(withinDays = 365): CalendarEvent[] {
  const today = new Date(TODAY_ISO).getTime();
  const cutoff = today + withinDays * 24 * 60 * 60 * 1000;
  return getAllCalendarEvents().filter((e) => {
    const t = new Date(normalizeDate(e.date)).getTime();
    return t >= today && t <= cutoff;
  });
}

export function getNextDeadline(): CalendarEvent | undefined {
  return getUpcomingEvents(365 * 5)[0];
}

export function formatDaysUntil(iso: string): string {
  const target = new Date(normalizeDate(iso)).getTime();
  const today = new Date(TODAY_ISO).getTime();
  const days = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return "today";
  if (days < 60) return `in ${days} days`;
  const months = Math.round(days / 30);
  if (months < 24) return `in ${months} months`;
  const years = Math.round(days / 365);
  return `in ${years} years`;
}
