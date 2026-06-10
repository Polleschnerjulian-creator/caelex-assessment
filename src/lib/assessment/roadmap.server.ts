/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Dated roadmap — Ultimate Assessment rebuild (Task 3.2).
 *
 * The deadline-ordered action list a board or lawyer actually uses, derived
 * from Q5.2 key dates, the lifecycle phase, the NIS2 registration status
 * (Q6.8 — the DE/BSI duty applies since 6 Dec 2025 with NO transition) and the
 * contested EU-Space-Act application window.
 *
 * Honesty rules (binding):
 *  - NO fabricated dates: an item is dated ONLY by a user-provided date or the
 *    snapshot's own computedAt anchor (for already-in-force duties). Items
 *    whose timing depends on contested legislation carry `due: "contested"`
 *    plus a FluxFlag built from the rulebook's CONTESTED_POSITIONS — rendered
 *    collapsed on screen; the full scenario table lives in the PDF appendix
 *    only (founder §11.4).
 *  - Every item cites its legal basis (FindingSource[], §7-corrected labels).
 *  - Pre-application-engagement guidance ("UK CAA and CNES practice reward
 *    early engagement") ships as roadmap COPY (exported note), not a question
 *    (Q5.3 was cut, §7.3) and not a fake dated item.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type { FluxFlag, FindingSource } from "@/lib/assessment/finding";
import { CONTESTED_POSITIONS } from "@/data/assessment/rulebook";
import { answeredValue, type AnswerMap } from "@/lib/assessment/answers";
import type { ObligationMapResult } from "@/lib/assessment/verdict-pipeline.server";

// ─── Contract (plan Task 3.2) ────────────────────────────────────────────────

export interface RoadmapItem {
  due: string | "contested"; // ISO date | contested (NEVER a guessed date)
  action: string;
  basis: FindingSource[];
  fluxFlag?: FluxFlag;
}

/** Roadmap COPY (not a question — Q5.3 cut, §7.3). Rendered under the roadmap. */
export const PRE_APPLICATION_ENGAGEMENT_NOTE =
  "Regulators reward early engagement: UK CAA and CNES practice both favor applicants who open pre-application discussions well before filing. Consider contacting your target authority before your formal application.";

const Q_LAUNCH_DATE = "q5_2_target_launch_date";
const Q_AUTH_DATE = "q5_2b_target_authorisation_date";
const Q_LICENSE_EXPIRY = "q5_2c_license_expiry_dates";
const Q_NIS2_REGISTRATION = "q6_8_nis2_registration";
const Q_GROUND_COUNTRIES = "q4_3b_ground_countries";
const Q_CONSIDERED_JURISDICTIONS = "q4_5_considered_jurisdictions";

// §7-corrected citations (verified entries only).
const CITE_NIS2UMSUCG: FindingSource = {
  label: "German NIS2 transposition (NIS2UmsuCG)",
  citation:
    "NIS2UmsuCG — BSI registration duty for in-scope entities, in force 6 December 2025 (no transition period)",
  asOf: "2025-12-06",
  verified: true,
};

const CITE_TRANSITION: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Arts. 118–119 (transition windows)",
  asOf: "2025-06-25",
  verified: true,
};

const APPLICATION_DATE_FLUX: FluxFlag = {
  summary: "contested — conservative reading shown",
  conservativeReading:
    "Plan against the earliest plausible application window; the application date differs across the Commission text, the Presidency compromise and the EP ITRE draft.",
  positions: CONTESTED_POSITIONS.applicationDate.map((p) => ({
    source: p.source,
    position: p.position,
  })),
};

/** Strict ISO-date guard — an item is dated only by a REAL date. */
function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/** DE nexus per the plan: German ground stations or Germany among the
 *  considered authorization jurisdictions (q4_4 has no DE license option —
 *  Germany has no general space-authorization regime pre-Space-Act). */
export function hasGermanNexus(answers: AnswerMap): boolean {
  const ground = stringArray(answeredValue(answers, Q_GROUND_COUNTRIES));
  const considered = stringArray(
    answeredValue(answers, Q_CONSIDERED_JURISDICTIONS),
  );
  return ground.includes("de") || considered.includes("de");
}

/**
 * Deadline-ordered roadmap. Dated items ascending; contested items last.
 * `result.computedAt` anchors "already in force" duties (never Date.now —
 * the roadmap is reproducible from the stored snapshot).
 */
export function computeRoadmap(
  answers: AnswerMap,
  result: Pick<ObligationMapResult, "computedAt">,
): RoadmapItem[] {
  const dated: RoadmapItem[] = [];
  const contested: RoadmapItem[] = [];

  // 1 — DE/BSI NIS2 registration: an ALREADY-IN-FORCE duty → immediate item
  //     anchored on the snapshot date (no transition period since 2025-12-06).
  const registration = answeredValue(answers, Q_NIS2_REGISTRATION);
  if (
    (registration === "not_registered" || registration === "partial") &&
    hasGermanNexus(answers)
  ) {
    dated.push({
      due: String(result.computedAt).slice(0, 10),
      action:
        "Register with the BSI under the German NIS2 transposition (NIS2UmsuCG) — the registration duty has applied since 6 December 2025 with no transition period.",
      basis: [CITE_NIS2UMSUCG],
    });
  }

  // 2 — Authorization ahead of launch (user-provided dates only).
  const authDate = answeredValue(answers, Q_AUTH_DATE);
  if (isIsoDate(authDate)) {
    dated.push({
      due: authDate,
      action:
        "Target date for your space-activity authorization — assemble the application package (technical file, debris-mitigation plan, insurance evidence) ahead of this date.",
      basis: [CITE_TRANSITION],
    });
  }
  const launchDate = answeredValue(answers, Q_LAUNCH_DATE);
  if (isIsoDate(launchDate)) {
    dated.push({
      due: launchDate,
      action:
        "Target launch date — your authorization, registration, insurance and spectrum filings must be complete before this date.",
      basis: [CITE_TRANSITION],
    });
  }

  // 3 — Existing license expiries (free-text; only REAL ISO dates qualify).
  const expiryRaw = answeredValue(answers, Q_LICENSE_EXPIRY);
  if (typeof expiryRaw === "string") {
    const isoDates = expiryRaw.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    for (const d of isoDates) {
      if (!isIsoDate(d)) continue;
      dated.push({
        due: d,
        action:
          "National license expiry — start the renewal (or EU-regime transition) process well before this date.",
        basis: [CITE_TRANSITION],
      });
    }
  }

  // 4 — The contested EU Space Act application window (scenario DATA, flux-
  //     flagged; collapsed on screen, full table in the PDF appendix only).
  contested.push({
    due: "contested",
    action:
      "EU Space Act application window — align your authorization timeline with the final application date once the co-legislators converge.",
    basis: [CITE_TRANSITION],
    fluxFlag: APPLICATION_DATE_FLUX,
  });

  dated.sort((a, b) => a.due.localeCompare(b.due));
  return [...dated, ...contested];
}
