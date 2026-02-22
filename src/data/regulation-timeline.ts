/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Regulatory timeline for space compliance — tracks regulation lifecycle phases,
 * effective dates, transition periods, and supersession chains.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface RegulationPhase {
  id: string;
  regulation: string;
  status: "in_force" | "transition" | "superseded" | "upcoming";
  effectiveDate: string; // ISO date
  transitionEndDate?: string;
  supersededBy?: string;
  applicableTo: string[];
  notes: string;
}

export const REGULATION_TIMELINE: RegulationPhase[] = [
  {
    id: "nis2-current",
    regulation: "NIS2 Directive (EU 2022/2555)",
    status: "in_force",
    effectiveDate: "2024-10-18",
    transitionEndDate: "2030-12-31",
    supersededBy: "EU Space Act (COM(2025) 335)",
    applicableTo: ["all_space_operators"],
    notes:
      "Currently binding for space operators. EU Space Act Chapter VI (Art. 74-95) will become lex specialis for cybersecurity after transition.",
  },
  {
    id: "eu-space-act-proposal",
    regulation: "EU Space Act (COM(2025) 335)",
    status: "upcoming",
    effectiveDate: "2026-06-30",
    applicableTo: ["all_eu_operators"],
    notes:
      "Proposed June 2025. Expected adoption 2026, full application by 2030 with transition period.",
  },
  {
    id: "eu-space-act-transition",
    regulation: "EU Space Act — Transition Period",
    status: "upcoming",
    effectiveDate: "2027-01-01",
    transitionEndDate: "2030-12-31",
    applicableTo: ["all_eu_operators"],
    notes:
      "Existing operators must achieve full compliance by end of transition. New operators must comply immediately.",
  },
  {
    id: "eu-space-act-full",
    regulation: "EU Space Act — Full Application",
    status: "upcoming",
    effectiveDate: "2030-01-01",
    applicableTo: ["all_eu_operators"],
    notes:
      "Full application including authorization regime, debris mitigation, insurance, cybersecurity (supersedes NIS2 for space).",
  },
  {
    id: "fcc-deorbit-2024",
    regulation: "FCC 5-Year Deorbit Rule",
    status: "in_force",
    effectiveDate: "2024-09-29",
    applicableTo: ["us_licensed_operators", "us_market_access"],
    notes:
      "Replaces 25-year guideline. All new LEO satellites must deorbit within 5 years of mission end.",
  },
  {
    id: "uk-space-act",
    regulation: "UK Space Industry Act 2018",
    status: "in_force",
    effectiveDate: "2018-03-15",
    applicableTo: ["uk_operators"],
    notes:
      "UK national space law. Requires orbital/launch/return licenses from CAA.",
  },
  {
    id: "copuos-lts-2019",
    regulation: "COPUOS LTS Guidelines",
    status: "in_force",
    effectiveDate: "2019-06-21",
    applicableTo: ["all_operators"],
    notes:
      "21 Long-term Sustainability guidelines. Non-binding but referenced by national regulators.",
  },
  {
    id: "itu-rr-2020",
    regulation: "ITU Radio Regulations (WRC-23 Updates)",
    status: "in_force",
    effectiveDate: "2024-01-01",
    applicableTo: ["spectrum_users"],
    notes:
      "Updated coordination procedures for NGSO constellations. Milestone-based filing requirements.",
  },
  // National space laws (key ones)
  {
    id: "fr-los-2008",
    regulation: "French Space Operations Act (LOS 2008)",
    status: "in_force",
    effectiveDate: "2008-06-03",
    applicableTo: ["fr_operators"],
    notes:
      "Comprehensive space law with \u20AC60M minimum TPL insurance. CNES as technical authority.",
  },
  {
    id: "de-weltraumgesetz",
    regulation: "German Space Act (WeltraumG) \u2014 Draft",
    status: "upcoming",
    effectiveDate: "2026-01-01",
    applicableTo: ["de_operators"],
    notes:
      "Germany currently lacks dedicated space law. Draft expected to align with EU Space Act.",
  },
];

export function getCurrentRegime(
  operatorType: string,
  date?: Date,
): RegulationPhase[] {
  const now = date || new Date();
  const nowStr = now.toISOString().split("T")[0];
  return REGULATION_TIMELINE.filter((phase) => {
    if (phase.effectiveDate > nowStr) return false;
    if (
      phase.transitionEndDate &&
      phase.transitionEndDate < nowStr &&
      phase.status === "transition"
    )
      return false;
    return true;
  });
}

export function getUpcomingChanges(months: number = 12): RegulationPhase[] {
  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + months);
  const nowStr = now.toISOString().split("T")[0];
  const futureStr = future.toISOString().split("T")[0];
  return REGULATION_TIMELINE.filter(
    (phase) => phase.effectiveDate > nowStr && phase.effectiveDate <= futureStr,
  );
}
