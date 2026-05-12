/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SpaceLaw Bench v0 — Golden Queries (Sprint 6, 2026-05-12).
 *
 * 25 attorney-graded queries spanning the 6 evaluation categories.
 * Each entry has been reviewed for: (1) the question is realistic for
 * a German space-law boutique lawyer, (2) the expected sources resolve
 * to corpus entries, (3) the expected tools exist + are well-suited.
 *
 * Iteration plan:
 *   v0 (Sprint 6): 25 queries, internally labelled (Caelex team).
 *   v1 (Sprint 7+): 50+ queries, externally labelled by Reuschlaw or
 *     BHO Legal senior counsel.
 *   v2: 100+ queries; cross-language (DE/EN); regression-locked in CI.
 *
 * Adding a query: copy an existing entry, run the runner, eyeball the
 * pass/fail to decide if your `expectedSources` + `expectedTools`
 * match Atlas's actual behaviour or if Atlas needs improvement.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { GoldenQuery } from "./types";

export const GOLDEN_SET: GoldenQuery[] = [
  /* ─── Compliance: EU Space Act (4) ────────────────────────────────── */
  {
    id: "spaceact-001",
    category: "compliance",
    query:
      "Mein Mandant ist ein deutscher Satellitenoperator (Earth Observation). Wie wirkt sich der EU Space Act auf ihn aus? Welche Module + Artikel?",
    expectedSources: ["EU-SPACE-ACT-Art.8", "EU-SPACE-ACT-Art.18"],
    expectedTools: ["assess_eu_space_act"],
    expectedKeywords: ["Authorization", "spacecraft_operator", "Modul"],
    mustNotContain: ["FCC", "ITAR Cat. XV"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "spaceact-002",
    category: "compliance",
    query:
      "Ist ein US-Operator ohne EU-Niederlassung und ohne EU-Service-Angebote vom EU Space Act betroffen?",
    expectedSources: ["EU-SPACE-ACT-Art.4"],
    expectedTools: ["assess_eu_space_act"],
    expectedKeywords: ["out-of-scope", "third_country_no_eu"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "spaceact-003",
    category: "compliance",
    query:
      "Welche Ausnahmen vom EU Space Act gibt es für reine Defense-Operatoren?",
    expectedSources: ["EU-SPACE-ACT-Art.2(3)"],
    expectedTools: ["assess_eu_space_act"],
    expectedKeywords: ["Art. 2(3)", "defence", "out-of-scope"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "spaceact-004",
    category: "compliance",
    query:
      "Welches Regime gilt für einen Ground-Segment-Operator unter dem EU Space Act?",
    expectedSources: ["EU-SPACE-ACT-Art.8", "EU-SPACE-ACT-Art.16"],
    expectedTools: ["assess_eu_space_act"],
    expectedKeywords: ["LIGHT_REGIME", "ground_segment_operator"],
    labelledBy: "Caelex Internal v0",
  },

  /* ─── Compliance: NIS2 (4) ────────────────────────────────────────── */
  {
    id: "nis2-001",
    category: "compliance",
    query:
      "Klassifiziere meinen Mandanten nach NIS2: deutsche GmbH, Space-Sektor, 80 Mitarbeiter, kein societal-critical service.",
    expectedSources: ["EU-NIS2-Art.21", "EU-NIS2-Art.23"],
    expectedTools: ["classify_nis2"],
    expectedKeywords: ["Important", "Annex I", "Art. 21"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "nis2-002",
    category: "compliance",
    query:
      "Welche NIS2-Reporting-Fristen gelten bei einem cybersecurity incident?",
    expectedSources: ["EU-NIS2-Art.23"],
    expectedTools: ["classify_nis2"],
    expectedKeywords: ["24h", "72h", "30"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "nis2-003",
    category: "compliance",
    query:
      "Ist ein US-cloud-Provider ohne EU-Tochter NIS2-anwendbar wenn er EU-Kunden hat?",
    expectedSources: ["EU-NIS2-Art.21"],
    expectedTools: ["classify_nis2"],
    expectedKeywords: ["EU customers", "establishment"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "nis2-004",
    category: "compliance",
    query: "Was sind die 10 cybersecurity-Mindestmaßnahmen unter NIS2 Art. 21?",
    expectedSources: ["EU-NIS2-Art.21"],
    expectedTools: ["classify_nis2", "search_legal_sources"],
    expectedKeywords: ["risk-management", "10"],
    labelledBy: "Caelex Internal v0",
  },

  /* ─── National Law (5) ────────────────────────────────────────────── */
  {
    id: "natlaw-de-001",
    category: "national_law",
    query:
      "Welche deutsche Behörde ist für Satelliten-Authorisierung zuständig?",
    expectedSources: ["DE-SatDSiG-2007"],
    expectedTools: ["assess_national_space_law", "find_authority"],
    expectedKeywords: ["BMWK", "BNetzA", "DLR"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "natlaw-fr-001",
    category: "national_law",
    query:
      "Wie hoch ist die staatlich garantierte Liability-Cap unter dem französischen LOS?",
    expectedSources: ["FR-LOS-2008"],
    expectedTools: ["assess_national_space_law"],
    expectedKeywords: ["€60M", "Art. 14", "DGA"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "natlaw-uk-001",
    category: "national_law",
    query:
      "Welche Lizenz braucht ein UK-Spaceflight-Operator unter dem Space Industry Act 2018?",
    expectedSources: ["UK-OSA-1986"],
    expectedTools: ["assess_uk_space_industry"],
    expectedKeywords: ["CAA", "Spaceflight Operator Licence", "£60M"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "natlaw-lu-001",
    category: "national_law",
    query: "Was ist die Insurance-Mindestsumme in Luxemburg?",
    expectedSources: ["LU-SPACE-RESOURCES-2017"],
    expectedTools: ["assess_national_space_law"],
    expectedKeywords: ["€100M", "LSA"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "natlaw-it-001",
    category: "national_law",
    query:
      "Welche italienische Behörde reguliert kommerzielle Weltraum-Aktivitäten?",
    expectedSources: ["IT-LEGGE-7-2018"],
    expectedTools: ["assess_national_space_law"],
    expectedKeywords: ["ASI"],
    labelledBy: "Caelex Internal v0",
  },

  /* ─── Treaty (3) ──────────────────────────────────────────────────── */
  {
    id: "treaty-001",
    category: "treaty",
    query:
      "Was sagt Art. VI Outer Space Treaty 1967 zur Verantwortlichkeit des launching state?",
    expectedSources: ["INT-OST-1967"],
    expectedTools: ["search_legal_sources", "find_treaty"],
    expectedKeywords: ["state responsibility", "non-governmental"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "treaty-002",
    category: "treaty",
    query:
      "Wer haftet unter der Liability Convention 1972 wenn ein Satellit auf der Erde Schaden verursacht?",
    expectedSources: ["INT-LIABILITY-1972"],
    expectedTools: ["search_legal_sources", "find_treaty"],
    expectedKeywords: ["absolute liability", "launching state"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "treaty-003",
    category: "treaty",
    query:
      "Welche Verpflichtung trifft Staaten aus der Registration Convention 1976?",
    expectedSources: ["INT-REG-CONV-1976", "INT-UN-REG-CONV-1976"],
    expectedTools: ["search_legal_sources"],
    expectedKeywords: ["registry", "60 days"],
    labelledBy: "Caelex Internal v0",
  },

  /* ─── Comparison (3) ──────────────────────────────────────────────── */
  {
    id: "compare-001",
    category: "comparison",
    query:
      "Vergleiche DE, FR und LU für die Authorisierung eines Satelliten-Operators (Liability-Cap, Insurance, Behörde).",
    expectedSources: [
      "DE-SatDSiG-2007",
      "FR-LOS-2008",
      "LU-SPACE-RESOURCES-2017",
    ],
    expectedTools: ["compare_jurisdictions_for_filing"],
    expectedKeywords: ["BMWK", "DGA", "LSA"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "compare-002",
    category: "comparison",
    query:
      "Wo ist die Insurance-Mindestsumme für Satelliten-Operatoren am niedrigsten in der EU?",
    expectedSources: ["IT-LEGGE-7-2018", "FR-LOS-2008"],
    expectedTools: [
      "compare_jurisdictions_for_filing",
      "assess_national_space_law",
    ],
    expectedKeywords: ["€50M", "€60M"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "compare-003",
    category: "comparison",
    query:
      "Welches EU-Land hat das schnellste Authorisierungs-Verfahren für eine NewSpace-CubeSat-Mission?",
    expectedSources: [],
    expectedTools: ["compare_jurisdictions_for_filing", "find_optimization"],
    expectedKeywords: ["Verfahren"],
    labelledBy: "Caelex Internal v0 (loose label — comparison-judgment)",
  },

  /* ─── Validity (3) ────────────────────────────────────────────────── */
  {
    id: "validity-001",
    category: "validity",
    query: "Ist § 1 SatDSiG noch in Kraft? Wann wurde er zuletzt geändert?",
    expectedSources: ["DE-SatDSiG-2007"],
    expectedTools: ["check_article_status"],
    expectedKeywords: ["in force", "verified"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "validity-002",
    category: "validity",
    query:
      "Welche Norm-Änderungen gab es in Deutschland in den letzten 90 Tagen?",
    expectedSources: [],
    expectedTools: ["get_recent_norm_changes"],
    expectedKeywords: ["DE", "verified"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "validity-003",
    category: "validity",
    query: "Welche EU-Verordnungen sind eng verwandt mit der NIS2-Richtlinie?",
    expectedSources: ["EU-NIS2"],
    expectedTools: ["find_related_norms", "search_legal_sources"],
    expectedKeywords: ["related"],
    labelledBy: "Caelex Internal v0",
  },

  /* ─── Drafting (3) ────────────────────────────────────────────────── */
  {
    id: "drafting-001",
    category: "drafting",
    query:
      "Erstelle eine Mission-Authorization-Application für die deutsche BMWK. Mission: 6U CubeSat, EO, X-Band, LEO 500 km, Launch Q3 2026.",
    expectedSources: ["DE-SatDSiG-2007"],
    expectedTools: ["draft_authorization_application"],
    expectedKeywords: ["BMWK", "Earth Observation"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "drafting-002",
    category: "drafting",
    query:
      "Erstelle einen Compliance-Brief für meinen Mandanten zur NIS2-Implementation in Deutschland.",
    expectedSources: ["EU-NIS2-Art.21"],
    expectedTools: ["draft_compliance_brief"],
    expectedKeywords: ["NIS2", "DE", "Implementation"],
    labelledBy: "Caelex Internal v0",
  },
  {
    id: "drafting-003",
    category: "drafting",
    query:
      "Welche Pflicht-Provisions müssen in einem Lieferanten-Vertrag stehen, wenn ITAR-relevante Komponenten enthalten sind (22 CFR 124.8)?",
    expectedSources: [],
    expectedTools: ["classify_export_control"],
    expectedKeywords: ["flow-down", "22 CFR 124.8", "ITAR"],
    labelledBy: "Caelex Internal v0",
  },
];
