// src/data/assessment/question-graph.ts — pure data, importable client+server.
//
// THE question-graph dataset for the ultimate operator assessment
// (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
// Tasks 1.5 + 1.6) — the spec §4 catalog AS CORRECTED BY §7.
//
// BINDING conventions baked in (locked by question-graph.test.ts):
//  * Tri-state unsure (Task 1.3): NO QuestionOption.value anywhere equals
//    "unsure". An explicit "I'm not sure" choice is rendered via
//    `unsureMode: "option"` and stored `{state:"unsure"}` — never an option.
//  * §7.3 CUTS: q1_8 (completer), q8_3 (indemnification awareness), q5_3
//    (pre-application discussions), q4_7 (dedicated IGO question), q3_5
//    (brightness posture) DO NOT EXIST as questions. Their content moved to:
//    account creation (q1_8), an unconditional pipeline advisory from the
//    Q4.8 launching-State facts (q8_3, Task 1.9), roadmap copy (q5_3), a
//    q1_4_org_type option + flux-flagged finding (q4_7), and a pipeline
//    advisory from constellation tier + orbit with a verified:false citation
//    (q3_5, Task 1.9 — the Art 72 / magnitude-7 figure is UNVERIFIED, §7.1 #8,
//    and must not ship as a cited mandate).
//  * §7.1 citation corrections: no label/citation anywhere says "general
//    approach" (the 5 Dec 2025 Council-track text is a Danish PRESIDENCY
//    compromise; the Council has adopted NO position as of June 2026) and
//    nothing cites "Art 75a" (unverified/likely invented).
//  * Q10.1 (check-your-answers) is a mandatory WIZARD STEP, not a question —
//    it has no node here (the SpineWizard renders it before the verdict).
//  * Q6.6 battery answer encoding (evaluator leaves the value shape to this
//    dataset): stored as `{state:"answered", value: string[]}` where each
//    entry is `"<itemId>:<status>"` and status is one of
//    BATTERY_ITEM_STATUSES. The per-ITEM status "unsure" is part of the
//    composite answered value (plan Task 1.6: per-item statuses
//    evidenced | undocumented | partial | missing | unsure) — it is a
//    readiness status inside one answer, NOT a question-level answer state,
//    and feeds the "unknowns to resolve" list.
//
// Question ids + option values are a cross-lane CONTRACT — the NIS2 gateway
// adapter (nis2-gateway.server.ts), the applicability gates, the regime
// module and the verdict pipeline reference them by literal string.

import type {
  Condition,
  QuestionNode,
} from "@/data/assessment/question-graph-types";
import type { FindingSource } from "@/lib/assessment/finding";

// ─── Shared citation constants (non-binding nodes; binding blocks inline) ───

const CITE_COM = (citation: string): FindingSource => ({
  label: "EU Space Act proposal — Commission text",
  citation,
  asOf: "2025-06-25",
  verified: true,
});

const CITE_NIS2 = (citation: string): FindingSource => ({
  label: "NIS2 Directive",
  citation,
  asOf: "2022-12-27",
  verified: true,
});

const CITE_PRESIDENCY = (citation: string): FindingSource => ({
  label:
    "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
  citation,
  asOf: "2025-12-05",
  verified: true,
});

const CITE_ITRE = (citation: string): FindingSource => ({
  label: "EP ITRE draft report",
  citation,
  asOf: "2026-03-03",
  verified: true,
});

const CITE_SME = (citation: string): FindingSource => ({
  label: "Commission Recommendation 2003/361/EC",
  citation,
  asOf: "2003-05-06",
  verified: true,
});

const CITE_FR_LOS = (citation: string): FindingSource => ({
  label: "French Space Operations Act",
  citation,
  asOf: "2008-06-03",
  verified: true,
});

const CITE_UK = (citation: string): FindingSource => ({
  label: "UK Space Industry Act 2018 / Outer Space Act 1986",
  citation,
  asOf: "2018-03-15",
  verified: true,
});

const CITE_IT = (citation: string): FindingSource => ({
  label: "Italian Space Economy Act",
  citation,
  asOf: "2025-06-11",
  verified: true,
});

const CITE_ITU = (citation: string): FindingSource => ({
  label: "ITU Radio Regulations",
  citation,
  asOf: "2025-01-01", // WRC-23 edition in force
  verified: true,
});

const CITE_ITAR = (citation: string): FindingSource => ({
  label: "US International Traffic in Arms Regulations (ITAR)",
  citation,
  asOf: "2026-06-09",
  verified: true,
});

const CITE_EAR = (citation: string): FindingSource => ({
  label: "US Export Administration Regulations (EAR)",
  citation,
  asOf: "2026-06-09",
  verified: true,
});

const CITE_COPUOS = (citation: string): FindingSource => ({
  label: "UN COPUOS Space Debris Mitigation Guidelines",
  citation,
  asOf: "2007-12-22",
  verified: true,
});

const CITE_OST = (citation: string): FindingSource => ({
  label: "Outer Space Treaty (1967)",
  citation,
  asOf: "1967-10-10",
  verified: true,
});

const CITE_REG_CONVENTION = (citation: string): FindingSource => ({
  label: "UN Registration Convention (1975)",
  citation,
  asOf: "1976-09-15",
  verified: true,
});

const CITE_LIABILITY_CONVENTION = (citation: string): FindingSource => ({
  label: "UN Liability Convention (1972)",
  citation,
  asOf: "1972-09-01",
  verified: true,
});

const CITE_SATDSIG = (citation: string): FindingSource => ({
  label: "German Satellite Data Security Act (BAFA competent)",
  citation,
  asOf: "2007-11-23",
  verified: true,
});

const CITE_NIS2UMSUCG = (citation: string): FindingSource => ({
  label: "German NIS2 transposition (in force, BSI competent)",
  citation,
  asOf: "2025-12-06",
  verified: true,
});

// ─── Q6.6 battery per-item status vocabulary (answer-encoding contract) ──────
// "unsure" here is a per-ITEM readiness status inside the composite answered
// value — NOT a question option value and NOT a question-level answer state
// (see the file-header encoding note).
export const BATTERY_ITEM_STATUSES = [
  "evidenced",
  "undocumented",
  "partial",
  "missing",
  "unsure",
] as const;
export type BatteryItemStatus = (typeof BATTERY_ITEM_STATUSES)[number];

// ─── Shared conditions ───────────────────────────────────────────────────────

/** §7.2 / Task 1.6 (BINDING): any UK nexus — used by Q2.12 and Q7.4.
 *  Task 1.5's Q4.4/Q4.5 transcriptions MUST use these ids + option values. */
export const UK_NEXUS: Condition = {
  any: [
    { q: "q1_2_establishment", op: "eq", value: "uk" },
    { q: "q4_4_licenses_held", op: "includes", value: "uk_sia_osa" },
    { q: "q4_5_considered_jurisdictions", op: "includes", value: "uk" },
    { q: "q4_3b_ground_countries", op: "includes", value: "uk" },
  ],
};

/** Spacecraft or launch operator (recurring role gate). */
const SPACECRAFT_OR_LAUNCH: Condition = {
  any: [
    { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
    { q: "q1_1_roles", op: "includes", value: "launch_operator" },
  ],
};

// ─── The graph ───────────────────────────────────────────────────────────────

export const QUESTION_GRAPH: readonly QuestionNode[] = [
  // ═══ SECTION 1: IDENTITY & ROLE (profile-first — scopes everything) ═══════

  {
    id: "q1_1_roles",
    section: "identity_role",
    tier: "both",
    kind: "multi",
    title: "Which roles describe your organisation?",
    why: "The master branching dimension — each role attaches a distinct EU Space Act obligation cluster (the 119-article engine's operator-type filters: SCO/LO/LSO/ISOS/CAP/PDP). Ground-segment operation triggers NIS2 Annex I 'Space'; hosted-payload owners can be in scope without controlling the host spacecraft (Cooley reading of Art 17 indirect delivery); component suppliers are largely outside the Space Act but inside export control.",
    citation: [
      CITE_COM(
        "COM(2025) 335 — operator-type obligation clusters (spacecraft / launch / launch-site / in-space-servicing / collision-avoidance / data-provider filters)",
      ),
      CITE_NIS2(
        "Directive (EU) 2022/2555 Annex I, Sector 11 (Space — operators of ground-based infrastructure)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "spacecraft_operator", label: "Spacecraft operator" },
      { value: "launch_operator", label: "Launch operator" },
      { value: "launch_site_operator", label: "Launch-site operator" },
      {
        value: "in_space_service_provider",
        label:
          "In-space service provider (servicing, refuelling, debris removal, inspection)",
      },
      {
        value: "collision_avoidance_provider",
        label: "Collision-avoidance or SSA service provider",
      },
      { value: "data_provider", label: "Primary provider of space-based data" },
      {
        value: "ground_segment_operator",
        label:
          "Ground-segment operator (ground stations, TT&C, mission control)",
      },
      { value: "hosted_payload_owner", label: "Hosted-payload owner" },
      {
        value: "reseller_distributor",
        label: "Reseller / distributor of space data",
      },
      {
        value: "component_supplier",
        label: "Component or subsystem supplier",
      },
    ],
  },

  {
    id: "q1_2_establishment",
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: "Where is your organisation established?",
    why: "The applicability gate — EU establishment → Union operator needing member-state authorisation (Art 6; the Presidency compromise allocates the authorising authority to the member state of main establishment); third country → the Art 17 registration path. Multiple establishments shift NIS2 main-establishment jurisdiction and multiply national-law overlap.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 6, 17"),
      CITE_PRESIDENCY(
        "authorising member state allocated to the main establishment",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "eu", label: "EU member state" },
      { value: "eea", label: "EEA (non-EU): Norway, Iceland, Liechtenstein" },
      { value: "uk", label: "United Kingdom" },
      { value: "ch", label: "Switzerland" },
      { value: "us", label: "United States" },
      { value: "other", label: "Other" },
    ],
  },

  {
    id: "q1_2b_additional_establishments",
    section: "identity_role",
    tier: "full",
    kind: "country_multi",
    title:
      "Additional establishments — in which other countries do you have legal entities?",
    why: "Multiple establishments shift NIS2 main-establishment jurisdiction (Art 26(1)) and multiply national space-law overlap — a dimension a single-country answer cannot capture. Leave empty if you have a single establishment.",
    citation: [
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 26(1) (main-establishment jurisdiction)",
      ),
      CITE_COM("COM(2025) 335 Arts. 6, 17"),
    ],
    unsureMode: "none",
  },

  {
    id: "q1_3_main_establishment",
    section: "identity_role",
    tier: "full",
    kind: "text",
    title: "Which is your MAIN place of establishment?",
    why: "The Presidency compromise text assigns the authorising authority — and NIS2 assigns jurisdiction — to the main establishment.",
    citation: [
      CITE_PRESIDENCY(
        "authorising member state allocated to the main establishment",
      ),
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 26(1) (main-establishment jurisdiction)",
      ),
    ],
    unsureMode: "none",
    // Shown once additional establishments were provided (approximation of
    // ">1 establishment given" — the wizard pre-fills from q1_2).
    showIf: { q: "q1_2b_additional_establishments", op: "answered" },
  },

  // Q1.4 — org-type fold (§7.3 cuts Q4.7 + trims quick tier: research status
  // and IGO become options of ONE question). BINDING shape (plan Task 1.5).
  {
    id: "q1_4_org_type",
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: "What type of organisation are you?",
    why: "Research/educational status drives Art 10 light-regime eligibility, Art 62 carve-outs and Italian Law 89/2025 insurance reductions. International intergovernmental organisations carry an Art 2(2) exemption that BOTH co-legislators have made contingent on bilateral agreements — that finding ships with a flux flag, folded here instead of a dedicated IGO question (§7.3).",
    citation: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Art. 10, Art. 2(2), Art. 62",
        asOf: "2025-06-25",
        verified: true,
      },
      {
        label: "Italian space law",
        citation: "Law 89/2025 (insurance reductions for startups/research)",
        asOf: "2025-06-11",
        verified: true,
      },
    ],
    unsureMode: "none",
    options: [
      { value: "commercial", label: "Commercial company" },
      {
        value: "research_edu",
        label: "Research or educational institution",
      },
      { value: "public_body", label: "Public body / agency" },
      {
        value: "igo",
        label:
          "International intergovernmental organisation (ESA, EUMETSAT, …)",
      },
    ],
  },

  // Q1.5 — size bands: TWO question nodes on ONE screen (screenGroup
  // "q1_5_size") so downstream conditions (Q6.8's showIf, the NIS2 gateway
  // adapter) can reference each dimension by id. BINDING shapes (plan Task 1.5).
  {
    id: "q1_5_headcount",
    section: "identity_role",
    tier: "both",
    kind: "bands",
    screenGroup: "q1_5_size",
    title: "Headcount band?",
    why: "Double duty: EU SME definition (Space Act light regime, EP draft's 'small mid-cap' extension) and the NIS2 size cap. ≥250 headcount alone makes you LARGE per Rec. 2003/361 (→ NIS2 'essential' candidate); ≥50 puts you at the 'important' floor. Bands, not exact figures, to cut friction and don't-know rates.",
    citation: [
      {
        label: "Commission Recommendation 2003/361/EC",
        citation: "Annex Art. 2 (SME ceilings)",
        asOf: "2003-05-06",
        verified: true,
      },
      {
        label: "NIS2 Directive",
        citation: "Directive (EU) 2022/2555 Art. 2(1), Art. 3",
        asOf: "2022-12-27",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      { value: "h_1_9", label: "1–9" },
      { value: "h_10_49", label: "10–49" },
      { value: "h_50_249", label: "50–249" },
      { value: "h_250_plus", label: "250 or more" },
    ],
  },
  {
    id: "q1_5_turnover",
    section: "identity_role",
    tier: "both",
    kind: "bands",
    screenGroup: "q1_5_size",
    title: "Annual turnover band?",
    why: "CORRECTED (§7.1 #4): 'essential' requires LARGE per Rec. 2003/361 = ≥250 headcount OR (turnover >€50M AND balance sheet >€43M). Turnover alone never upgrades you to essential — the balance-sheet leg comes from Q1.6, and an unsure balance sheet takes the conservative (larger) reading.",
    citation: [
      {
        label: "Commission Recommendation 2003/361/EC",
        citation: "Annex Art. 2 (SME ceilings)",
        asOf: "2003-05-06",
        verified: true,
      },
      {
        label: "NIS2 Directive",
        citation: "Directive (EU) 2022/2555 Art. 2(1), Art. 3",
        asOf: "2022-12-27",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      { value: "t_lt_2m", label: "Under €2M" },
      { value: "t_2_10m", label: "€2–10M" },
      { value: "t_10_50m", label: "€10–50M" },
      { value: "t_gt_50m", label: "Over €50M" },
    ],
  },

  {
    id: "q1_6_balance_sheet",
    section: "identity_role",
    tier: "full",
    kind: "bands",
    title: "Balance-sheet total band?",
    why: "Both the SME definition and the NIS2 size caps use turnover OR balance sheet — the balance-sheet leg is the AND-condition that prevents a turnover-only upgrade to 'essential' (§7.1 #4). 'I'm not sure' takes the conservative (larger) reading.",
    citation: [
      CITE_SME("Annex Art. 2 (SME ceilings — balance-sheet alternative)"),
      CITE_NIS2("Directive (EU) 2022/2555 Art. 2(1), Art. 3"),
    ],
    unsureMode: "option",
    options: [
      { value: "bs_le_10m", label: "≤ €10M" },
      { value: "bs_le_43m", label: "> €10M and ≤ €43M" },
      { value: "bs_gt_43m", label: "> €43M" },
    ],
  },

  // Q1.7 — group structure: tier "full" (§7.3 trim — pushed out of quick; the
  // quick verdict states "regime direction pending group verification"
  // instead, encoded in the regime module, NOT as a hidden default answer).
  {
    id: "q1_7_group",
    section: "identity_role",
    tier: "full",
    kind: "single",
    title:
      "Is your company part of a group (parent company or linked enterprises ≥25%)?",
    why: "The EU SME definition aggregates linked enterprises — this closes the 'a 30-person Airbus subsidiary self-declares small and gets the Light Regime' hole, and affects both light-regime and NIS2 classification. 'Yes' or 'I'm not sure' rounds UP to the standard regime pending verification.",
    citation: [
      CITE_SME("Annex Art. 3 (linked and partner enterprises — aggregation)"),
      CITE_COM("COM(2025) 335 Art. 10 (light regime eligibility)"),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "q1_7_group_headcount",
    section: "identity_role",
    tier: "full",
    kind: "bands",
    screenGroup: "q1_7_group_figures",
    title: "Aggregated GROUP headcount band?",
    why: "The SME test runs on aggregated group figures (linked enterprises ≥25%), not the single entity's — an aggregated band above the ceilings disqualifies the light regime and can flip the NIS2 size classification.",
    citation: [
      CITE_SME("Annex Art. 3 + Art. 6 (aggregated data of linked enterprises)"),
    ],
    unsureMode: "option",
    options: [
      { value: "h_1_9", label: "1–9" },
      { value: "h_10_49", label: "10–49" },
      { value: "h_50_249", label: "50–249" },
      { value: "h_250_plus", label: "250 or more" },
    ],
    showIf: { q: "q1_7_group", op: "eq", value: "yes" },
  },
  {
    id: "q1_7_group_turnover",
    section: "identity_role",
    tier: "full",
    kind: "bands",
    screenGroup: "q1_7_group_figures",
    title: "Aggregated GROUP annual turnover band?",
    why: "Same aggregation rule as the group headcount: the SME ceilings are tested against aggregated group turnover; an unsure aggregate takes the conservative (larger) reading.",
    citation: [
      CITE_SME("Annex Art. 3 + Art. 6 (aggregated data of linked enterprises)"),
    ],
    unsureMode: "option",
    options: [
      { value: "t_lt_2m", label: "Under €2M" },
      { value: "t_2_10m", label: "€2–10M" },
      { value: "t_10_50m", label: "€10–50M" },
      { value: "t_gt_50m", label: "Over €50M" },
    ],
    showIf: { q: "q1_7_group", op: "eq", value: "yes" },
  },

  // Q1.9 — defense gate, GATE FIX (§7.2/§7.4): trinary + unsure, dual-use
  // first-class. BINDING shape (plan Task 1.5).
  {
    id: "q1_9_defense_exclusivity",
    section: "identity_role",
    tier: "both",
    kind: "single",
    title:
      "Are your space assets used exclusively for defence or national security?",
    why: "Art 2(3) excludes EXCLUSIVELY-defence activities. Partial/dual-use stays fully in scope and is noted in the verdict. This gate is enforced server-side; 'unsure' rounds UP to in-scope-presumed (more obligations), never to an exemption.",
    citation: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Art. 2(3)",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    // §7.4 explicit-unknown gate: the rendered "I'm not sure" choice comes from
    // unsureMode and stores {state:"unsure"} (Task 1.3 convention).
    unsureMode: "option",
    options: [
      {
        value: "exclusively_defense",
        label: "Yes — exclusively defence / national security",
      },
      {
        value: "dual_use",
        label: "Partially — dual-use or mixed civil/defence",
      },
      { value: "no", label: "No — civil / commercial" },
    ],
  },

  // ═══ SECTION 2: ACTIVITY & ASSETS ══════════════════════════════════════════

  {
    id: "q2_1_spacecraft_count",
    section: "activity_assets",
    tier: "both",
    kind: "bands",
    title:
      "How many operational spacecraft do you operate or plan within 5 years?",
    why: "The proposal's constellation tiers (10–99 constellation, 100–999 mega, 1000+ giga) flip consolidated-authorisation eligibility, the Art 73(1) propulsion mandate (mega/giga — see Q2.3) and enhanced debris/pollution obligations. The new engine actually consumes this answer.",
    citation: [
      CITE_COM(
        "COM(2025) 335 — constellation tiers (10–99 constellation, 100–999 mega, 1000+ giga); consolidated authorisation; Art. 73(1)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "c_1", label: "1" },
      { value: "c_2_9", label: "2–9" },
      { value: "c_10_99", label: "10–99" },
      { value: "c_100_999", label: "100–999" },
      { value: "c_1000_plus", label: "1000 or more" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q2_2_identical_design",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title:
      "Are the spacecraft identical in design and launched together from the same site/vehicle?",
    why: "Eligibility for a consolidated single authorisation. The savings figure (~€68M over a decade) is a Commission impact-assessment ESTIMATE, not an enacted fee schedule — it keeps that provenance label everywhere it is shown.",
    citation: [
      CITE_COM(
        "COM(2025) 335 — consolidated constellation authorisation (savings: Commission impact-assessment estimate, not an enacted fee schedule)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "partially", label: "Partially" },
    ],
    showIf: {
      q: "q2_1_spacecraft_count",
      op: "in",
      value: ["c_10_99", "c_100_999", "c_1000_plus"],
    },
  },

  // Q2.3 — propulsion, CALIBRATION FIX (§7.1 #6). BINDING shape (plan Task 1.5).
  {
    id: "q2_3_propulsion",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title: "Propulsion / manoeuvre capability per spacecraft?",
    why: "Art 66 manoeuvrability + Art 64 collision-avoidance feasibility. CALIBRATED (§7.1): the propulsion MANDATE attaches to mega (100–999) and giga (1000+) constellations — NOT at ≥10. 'None' + 10–99 emits a CONSERVATIVE ADVISORY (no cited mandate); 'none' + ≥100 emits the cited finding. The <400 km manoeuvrability carve-out (recital 63) is consumed from the orbit altitude band before either fires.",
    citation: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Arts. 64, 66, 73(1); recital 63",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      { value: "full", label: "Full propulsion" },
      { value: "limited", label: "Limited (e.g. differential drag)" },
      { value: "none", label: "None" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q2_4_mass_class",
    section: "activity_assets",
    tier: "full",
    kind: "bands",
    title: "Largest spacecraft wet-mass class?",
    why: "Debris-mitigation class, re-entry casualty risk and national third-party-liability insurance minimums all scale with mass — the engine actually consumes this answer (the old unified helpText claimed mass was used without using it).",
    citation: [
      CITE_COM(
        "COM(2025) 335 Arts. 61–74 (debris mitigation, casualty risk classes)",
      ),
      CITE_FR_LOS(
        "Loi n° 2008-518 (LOS) — risk-scaled authorisation and insurance practice",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "m_lt_10kg", label: "Under 10 kg" },
      { value: "m_10_100kg", label: "10–100 kg" },
      { value: "m_100_500kg", label: "100–500 kg" },
      { value: "m_gt_500kg", label: "Over 500 kg" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q2_5_trackability",
    section: "activity_assets",
    tier: "full",
    kind: "multi",
    title: "Trackability means fitted or planned?",
    why: "Art 63 trackability obligation — it binds Union operators; ESPI flags the third-country asymmetry, so the finding text adapts to your establishment.",
    citation: [CITE_COM("COM(2025) 335 Art. 63 (trackability)")],
    unsureMode: "option",
    options: [
      { value: "gnss_beacon", label: "GNSS beacon" },
      { value: "laser_retroreflector", label: "Laser retroreflector" },
      { value: "ssa_registration", label: "SSA-provider registration" },
      { value: "none", label: "None" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q2_6_launch_vehicle_class",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    screenGroup: "q2_6_launch_profile",
    title: "Launch vehicle class?",
    why: "Launch-provider authorisation fees scale by vehicle capacity (€200k–1.5M — a Commission impact-assessment ESTIMATE, not an enacted fee schedule) and launcher re-entry safeguards (Arts 58–61) attach.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Arts. 58–61 (launcher safeguards); fee figures: Commission impact-assessment estimate, not an enacted fee schedule",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "vc_small", label: "Small (≤ 2 t to LEO)" },
      { value: "vc_medium", label: "Medium (2–20 t to LEO)" },
      { value: "vc_heavy", label: "Heavy (> 20 t to LEO)" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "launch_operator" },
  },
  {
    id: "q2_6b_launches_per_year",
    section: "activity_assets",
    tier: "full",
    kind: "bands",
    screenGroup: "q2_6_launch_profile",
    title: "Expected launches per year?",
    why: "Launch cadence scales supervision intensity and the per-launch authorisation workload — it shapes the roadmap, not just the obligation list.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 58–61 (launch authorisation, safeguards)"),
    ],
    unsureMode: "none",
    options: [
      { value: "l_1_2", label: "1–2" },
      { value: "l_3_10", label: "3–10" },
      { value: "l_gt_10", label: "More than 10" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "launch_operator" },
  },

  {
    id: "q2_7_launch_site_countries",
    section: "activity_assets",
    tier: "full",
    kind: "country_multi",
    title: "In which country/countries is your launch site?",
    why: "National launch-site licensing + EU Act applicability. ESPI flags the enforcement gap for wholly-non-EU sites — that is surfaced as an uncertainty note in the verdict, not hidden.",
    citation: [CITE_COM("COM(2025) 335 — launch-site operator authorisation")],
    unsureMode: "none",
    showIf: { q: "q1_1_roles", op: "includes", value: "launch_site_operator" },
  },

  {
    id: "q2_8_hosted_payloads",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title:
      "Do you own payloads hosted on third-party spacecraft, or host third-party payloads?",
    why: "Hosted-payload owners may be in EU scope without controlling the host spacecraft (Cooley reading of Art 17 indirect delivery) — a population the legacy product could not see.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Art. 17 (indirect delivery of space-based services)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        { q: "q1_1_roles", op: "includes", value: "hosted_payload_owner" },
      ],
    },
  },

  {
    id: "q2_9_servicing_target",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title: "What do you service?",
    why: "RPO-specific authorisation conditions differ by target: own assets, a cooperative third-party object, or a non-cooperative object. The target's licensing state attaches additional obligations (see the follow-up).",
    citation: [
      CITE_COM(
        "COM(2025) 335 — in-space servicing (ISOS) authorisation conditions",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "own_assets", label: "Our own assets" },
      {
        value: "cooperative_third_party",
        label: "A cooperative third-party object",
      },
      { value: "non_cooperative", label: "A non-cooperative object" },
    ],
    showIf: {
      q: "q1_1_roles",
      op: "includes",
      value: "in_space_service_provider",
    },
  },
  {
    id: "q2_9b_target_licensing",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title: "Is the serviced object licensed, and where?",
    why: "The serviced object's licensing state attaches obligations to the servicing mission — an unlicensed or third-country-licensed target changes the authorisation conditions.",
    citation: [
      CITE_COM(
        "COM(2025) 335 — ISOS authorisation conditions (target licensing state)",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "licensed_eu", label: "Licensed in an EU member state" },
      { value: "licensed_third_country", label: "Licensed in a third country" },
      { value: "not_licensed", label: "Not licensed" },
    ],
    showIf: {
      q: "q2_9_servicing_target",
      op: "in",
      value: ["cooperative_third_party", "non_cooperative"],
    },
  },

  {
    id: "q2_10_data_products",
    section: "activity_assets",
    tier: "full",
    kind: "multi",
    title: "Which data products do you provide?",
    why: "Arts 26–27 primary-provider obligations and the collision-avoidance-provider-specific articles attach per data product.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 26–27 (primary data providers; CAP)"),
    ],
    unsureMode: "none",
    options: [
      { value: "ssa_tracking", label: "SSA tracking" },
      { value: "collision_warnings", label: "Collision warnings" },
      { value: "ephemeris", label: "Ephemeris" },
      { value: "conjunction_assessments", label: "Conjunction assessments" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "data_provider" },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "collision_avoidance_provider",
        },
      ],
    },
  },

  {
    id: "q2_11_eo_resolution",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title:
      "Do you operate or distribute Earth-observation data, and what is the best ground resolution?",
    why: "The German SatDSiG trigger — operators of high-grade EO systems AND data distributors each need BAFA approval with BSI TR-03140 conformity (2.5 m per the corrected DE dataset). 'I'm not sure' yields a verify-flag with the obligations shown conditionally.",
    citation: [
      CITE_SATDSIG(
        "SatDSiG — high-grade EO data (2.5 m threshold), BAFA approval + BSI TR-03140 conformity",
      ),
    ],
    unsureMode: "option",
    options: [
      {
        value: "no_eo_activity",
        label: "We do not operate or distribute EO data",
      },
      { value: "eo_ge_2_5m", label: "Yes — best resolution 2.5 m or coarser" },
      { value: "eo_lt_2_5m", label: "Yes — best resolution finer than 2.5 m" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "data_provider" },
        { q: "q1_1_roles", op: "includes", value: "reseller_distributor" },
        {
          q: "q1_2b_additional_establishments",
          op: "includes",
          value: "de",
        },
        { q: "q4_3b_ground_countries", op: "includes", value: "de" },
        { q: "q4_5_considered_jurisdictions", op: "includes", value: "de" },
      ],
    },
  },

  {
    id: "q2_12_human_spaceflight",
    section: "activity_assets",
    tier: "full",
    kind: "single",
    title: "Does your activity involve human spaceflight or suborbital flight?",
    why: "UK SIA 2018 scoping — the legacy UK profile hardcoded involvesPeople:false and isSuborbital:false; this answer makes the UK assessment real.",
    citation: [CITE_UK("SIA 2018 — human-spaceflight / suborbital scoping")],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: UK_NEXUS,
  },

  // ═══ SECTION 3: ORBIT & MISSION PROFILE ════════════════════════════════════

  {
    id: "q3_1_orbital_regimes",
    section: "orbit_mission",
    tier: "both",
    kind: "multi",
    title: "Orbital regime(s)?",
    why: "Debris rules, orbital lifetime vs natural decay, and collision-avoidance intensity all hang on the altitude band — 'LEO/MEO/GEO' alone cannot assess deorbit compliance. Multiple regimes → the most restrictive reading applies per cluster and the finding SAYS so (heterogeneous-fleet disclosure, §7.2). 'Cislunar/beyond' triggers a planetary-protection advisory cluster (OST Art IX / COSPAR policy + UN Nuclear Power Source Principles) — the option is offered AND owed downstream output.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Arts. 61–74 (debris, disposal, collision avoidance)",
      ),
      CITE_OST(
        "OST Art. IX (planetary protection — advisory for cislunar/beyond; COSPAR policy)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "leo_lt_400", label: "LEO below 400 km" },
      { value: "leo_400_650", label: "LEO 400–650 km" },
      { value: "leo_gt_650", label: "LEO above 650 km" },
      { value: "meo", label: "MEO" },
      { value: "geo", label: "GEO" },
      { value: "heo_sso", label: "HEO / SSO" },
      { value: "cislunar_beyond", label: "Cislunar or beyond" },
    ],
    quickVariant: {
      kind: "multi",
      options: [
        { value: "leo", label: "LEO" },
        { value: "meo", label: "MEO" },
        { value: "geo", label: "GEO" },
        { value: "heo_sso", label: "HEO / SSO" },
        { value: "cislunar_beyond", label: "Cislunar or beyond" },
      ],
    },
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "in_space_service_provider",
        },
      ],
    },
  },

  {
    id: "q3_2_eol_disposal",
    section: "orbit_mission",
    tier: "full",
    kind: "single",
    title: "End-of-life disposal strategy?",
    why: "Arts 61–74 disposal and casualty-risk obligations; the French LOS requires CNES-verified debris compliance; Italian Law 89/2025 conditions authorisation on debris mitigation.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 61–74 (disposal, casualty risk)"),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — CNES-verified debris compliance"),
      CITE_IT("Law 89/2025 — debris mitigation as an authorisation condition"),
    ],
    unsureMode: "option",
    options: [
      { value: "controlled_reentry", label: "Controlled re-entry" },
      { value: "uncontrolled_reentry", label: "Uncontrolled re-entry" },
      { value: "graveyard_orbit", label: "Graveyard orbit" },
      { value: "retrieval", label: "Retrieval" },
      { value: "none_yet", label: "None yet" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q3_3_disposal_timeline",
    section: "orbit_mission",
    tier: "full",
    kind: "single",
    title: "Post-mission disposal timeline and casualty-risk assessment?",
    why: "Separates plan EXISTENCE from plan ADEQUACY — the readiness layer behind the debris-mitigation-plan question (Q7.1).",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 61–74 (post-mission disposal)"),
      CITE_COPUOS(
        "A/62/20 (2007), endorsed UNGA Res. 62/217 — disposal guidelines",
      ),
    ],
    unsureMode: "option",
    options: [
      {
        value: "within_5y_assessed",
        label: "Within 5 years, casualty risk assessed",
      },
      { value: "within_25y", label: "Within 25 years" },
      { value: "not_assessed", label: "Not assessed" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q3_4_ssa_subscription",
    section: "orbit_mission",
    tier: "full",
    kind: "single",
    title:
      "Are you subscribed to a collision-avoidance/SSA service (EU SST or commercial)?",
    why: "Art 64 makes the subscription mandatory for Union operators AND Art 15(1) imposes collision-avoidance contracting on third-country operators — one of the few obligations binding both populations.",
    citation: [CITE_COM("COM(2025) 335 Art. 64; Art. 15(1)")],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  // NO q3_5 (CUT §7.3): brightness becomes a pipeline ADVISORY from
  // constellation tier + orbit with a verified:false citation (Task 1.9) —
  // the magnitude figure is UNVERIFIED (§7.1 #8) and never ships as a mandate.

  // Q3.6 — launch timing, three-valued contested date (§7.1 #7), SOFT gate.
  // BINDING shape (plan Task 1.5).
  {
    id: "q3_6_launch_timing",
    section: "orbit_mission",
    tier: "both",
    kind: "single",
    title:
      "When do your space assets launch relative to the Act's application date?",
    why: "Art 2 grandfathering. The application date itself is contested THREE ways: 1 Jan 2030 (Commission) OR 1 Jan 2032 for certain assets (Commission second prong) vs 36 months after entry into force (Presidency compromise + EP ITRE). 'All before' yields a LIKELY-out-of-scope verdict carrying the scenario note and PROBABLE confidence — never an unqualified hard verdict (replenishment / lifetime-extension / transfer edge cases unverified, §7.1) and never a client-only stop.",
    citation: [
      {
        label: "EU Space Act proposal — Commission text",
        citation:
          "COM(2025) 335 Art. 2 + application provisions (1 Jan 2030 / 1 Jan 2032 second prong)",
        asOf: "2025-06-25",
        verified: true,
      },
      {
        label:
          "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
        citation: "application: 36 months after entry into force",
        asOf: "2025-12-05",
        verified: true,
      },
      {
        label: "EP ITRE draft report",
        citation: "application: 36 months after entry into force",
        asOf: "2026-03-03",
        verified: true,
      },
    ],
    // §7.4 explicit-unknown gate: "I'm not sure" rendered via unsureMode, stored {state:"unsure"}.
    unsureMode: "option",
    options: [
      {
        value: "all_before",
        label: "All assets launch before the application date",
      },
      { value: "some_or_all_after", label: "Some or all launch after it" },
    ],
  },

  {
    id: "q3_7_cdr_status",
    section: "orbit_mission",
    tier: "full",
    kind: "single",
    title: "Critical design review status?",
    why: "Transition-window eligibility (Arts 118–119): the CDR threshold is 12 months after entry into force in the Commission text vs 24 months in the Presidency compromise, with transitions up to 8 years — output as a scenario table across the texts, never a single date.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 118–119 (CDR within 12 months prong)"),
      CITE_PRESIDENCY("transition: CDR within 24 months of entry into force"),
    ],
    unsureMode: "option",
    options: [
      { value: "completed", label: "Completed" },
      {
        value: "within_12m",
        label: "Expected within ~12 months of entry into force",
      },
      { value: "within_24m", label: "Within ~24 months" },
      { value: "later", label: "Later" },
    ],
    showIf: {
      all: [
        SPACECRAFT_OR_LAUNCH,
        {
          any: [
            { q: "q3_6_launch_timing", op: "eq", value: "some_or_all_after" },
            { q: "q3_6_launch_timing", op: "unsure" },
          ],
        },
      ],
    },
  },

  // ═══ SECTION 4: JURISDICTION & MARKET ══════════════════════════════════════

  {
    id: "q4_1_eu_nexus",
    section: "jurisdiction_market",
    tier: "both",
    kind: "single",
    title:
      "Do you provide space services or space-based data in the EU, directly or INDIRECTLY (EU customers, EU-located TT&C, hosted payloads serving EU users)?",
    why: "The third-country scope trigger (Art 17) under the broad indirect-delivery reading. 'I'm not sure' → in-scope-presumed with a verify flag; 'No' → an honest, cited out-of-scope verdict. Server-enforced.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Art. 17 (third-country operators — indirect delivery)",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q1_2_establishment", op: "neq", value: "eu" },
  },

  // Q4.2 — EU representative, CITATION FIX (§7.1 #3): cites Space Act Art 23 ONLY.
  // §7.1: NIS2 Art 26(3) representative mechanism applies ONLY to Art 26(1)(b) digital categories — a non-EU space operator NEVER becomes "important + representative" via Art 26; NIS2 space-sector jurisdiction follows establishment (Art 26(1) chapeau). Do not re-add the "unlocks NIS2 Art 26" claim.
  {
    id: "q4_2_eu_representative",
    section: "jurisdiction_market",
    tier: "full",
    kind: "single",
    title: "Have you designated an EU legal representative in writing?",
    why: "Art 23 requires third-country operators in scope to designate an EU legal representative in writing. This question covers the Space Act representative duty only.",
    citation: [CITE_COM("COM(2025) 335 Art. 23 (EU legal representative)")],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "not_yet", label: "Not yet" },
    ],
    showIf: {
      all: [
        { q: "q1_2_establishment", op: "neq", value: "eu" },
        {
          any: [
            { q: "q4_1_eu_nexus", op: "eq", value: "yes" },
            { q: "q4_1_eu_nexus", op: "unsure" },
          ],
        },
      ],
    },
  },

  // Q4.3 — ground segment, OUTSOURCING FIX (§7.2): single-select, NOT Y/N.
  {
    id: "q4_3_ground_segment",
    section: "jurisdiction_market",
    tier: "both",
    kind: "single",
    title:
      "Do you operate ground stations, TT&C, or mission control — or use third-party ground-segment services?",
    why: "NIS2 Annex I 'Space' attaches to the infrastructure OPERATOR ('own'). 'Outsourced' produces a supply-chain finding instead — the two outcomes differ legally and a Y/N cannot represent either (§7.2). Asked once, reused everywhere (never-ask-twice); the country list (full tier) drives national-law applicability per ground-segment state.",
    citation: [
      CITE_NIS2(
        "Directive (EU) 2022/2555 Annex I, Sector 11 (Space — ground-based infrastructure operators)",
      ),
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 21(2)(d) (supply-chain security)",
      ),
    ],
    unsureMode: "option", // "I'm not sure" rendered via unsureMode, stored {state:"unsure"}
    options: [
      {
        value: "own",
        label: "We operate our own ground stations / TT&C / mission control",
      },
      {
        value: "outsourced",
        label:
          "We use third-party ground-segment services (GSaaS — e.g. KSAT, AWS)",
      },
      { value: "none", label: "No ground-segment use" },
    ],
  },
  {
    id: "q4_3b_ground_countries",
    section: "jurisdiction_market",
    tier: "full",
    kind: "country_multi",
    title: "In which countries is that ground segment located?",
    why: "The country list drives national-law applicability per ground-segment state, the NIS2 member-state derivation (Q6.4) and — for third-country operators — the establishment analysis.",
    citation: [
      CITE_NIS2(
        "Directive (EU) 2022/2555 Annex I, Sector 11 (Space); Art. 26(1) (jurisdiction)",
      ),
    ],
    unsureMode: "none",
    showIf: {
      q: "q4_3_ground_segment",
      op: "in",
      value: ["own", "outsourced"],
    },
  },

  {
    id: "q4_4_licenses_held",
    section: "jurisdiction_market",
    tier: "both",
    kind: "multi",
    title: "Do you hold or have pending national space licenses?",
    why: "Brownfield vs greenfield — existing authorisations are credited in the roadmap and mapped onto the national→EU transition (Art 3 free movement with stricter-requirement reservations; the Italian double-applicability friction is flagged). A France-licensed operator must never get a greenfield checklist.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Art. 3 (free movement; stricter-requirement reservations)",
      ),
      CITE_FR_LOS("Loi n° 2008-518 (LOS)"),
      CITE_IT("Law 89/2025"),
      CITE_UK("Space Industry Act 2018 c. 5; Outer Space Act 1986 c. 38"),
    ],
    unsureMode: "none",
    options: [
      { value: "none", label: "None" },
      { value: "fr_los", label: "France (LOS)" },
      { value: "it_law_89_2025", label: "Italy (Law 89/2025)" },
      { value: "lu", label: "Luxembourg" },
      { value: "at", label: "Austria" },
      { value: "be", label: "Belgium" },
      { value: "nl", label: "Netherlands" },
      { value: "dk", label: "Denmark" },
      { value: "fi", label: "Finland" },
      { value: "se", label: "Sweden" },
      { value: "ee", label: "Estonia" },
      { value: "pt", label: "Portugal" },
      { value: "uk_sia_osa", label: "United Kingdom (SIA / OSA)" },
      { value: "other", label: "Other" },
    ],
    quickVariant: {
      kind: "single",
      options: [
        {
          value: "any",
          label: "Yes — one or more national licenses held or pending",
        },
        { value: "none", label: "None" },
      ],
    },
  },

  {
    id: "q4_5_considered_jurisdictions",
    section: "jurisdiction_market",
    tier: "full",
    kind: "multi",
    title:
      "Which jurisdictions are you considering for your (next) authorisation? (up to 3)",
    why: "Invokes the national-space-law engine for the procedural comparison section of the report — a factual comparison of timelines, insurance requirements and fees as stated in law. 'I'm not sure yet' is a valid answer and is stored as an explicit unknown.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Art. 3 (free movement; stricter-requirement reservations)",
      ),
      CITE_UK("Space Industry Act 2018 c. 5; Outer Space Act 1986 c. 38"),
    ],
    // Spec offers "not sure yet" — rendered via unsureMode (stored {state:"unsure"}),
    // never as an option value (Task 1.3 convention).
    unsureMode: "option",
    options: [
      { value: "fr", label: "France" },
      { value: "it", label: "Italy" },
      { value: "lu", label: "Luxembourg" },
      { value: "at", label: "Austria" },
      { value: "be", label: "Belgium" },
      { value: "nl", label: "Netherlands" },
      { value: "dk", label: "Denmark" },
      { value: "de", label: "Germany" },
      { value: "fi", label: "Finland" },
      { value: "se", label: "Sweden" },
      { value: "ee", label: "Estonia" },
      { value: "pt", label: "Portugal" },
      { value: "no", label: "Norway" },
      { value: "uk", label: "United Kingdom" },
    ],
  },

  {
    id: "q4_6_eu_control",
    section: "jurisdiction_market",
    tier: "full",
    kind: "single",
    title:
      "Is your entity directly or indirectly controlled by an EU person or entity?",
    why: "Art 2(1)(c) scope rule — collected before but ignored by the legacy mapper; the new engine actually consumes it for establishment derivation.",
    citation: [CITE_COM("COM(2025) 335 Art. 2(1)(c)")],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q1_2_establishment", op: "neq", value: "eu" },
  },

  // NO q4_7 (CUT §7.3): the IGO question is folded into q1_4_org_type ("igo"
  // option); the flux-flagged Art 2(2) finding is emitted from there.

  // Q4.8 — launching-State nexus: three facts on ONE screen. The
  // launching-State indemnification ADVISORY (ex-Q8.3, cut §7.3) is emitted
  // unconditionally from these facts by the pipeline (Task 1.9).
  {
    id: "q4_8_launching_state",
    section: "jurisdiction_market",
    tier: "full",
    kind: "single",
    screenGroup: "q4_8_launching_state",
    title: "Which country is your launch provider from?",
    why: "UN Liability + Registration Convention attribution (which state registers and bears indemnification), FR LOS extraterritorial reach over French operators launching anywhere, and ITAR exposure via US launch services.",
    citation: [
      CITE_LIABILITY_CONVENTION(
        "Convention on International Liability for Damage Caused by Space Objects (1972) — launching-State attribution",
      ),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — extraterritorial reach"),
      CITE_ITAR("22 CFR Parts 120–130 — US launch services exposure"),
    ],
    unsureMode: "option",
    options: [
      { value: "eu", label: "EU member state" },
      { value: "uk", label: "United Kingdom" },
      { value: "us", label: "United States" },
      { value: "other", label: "Other" },
      { value: "not_contracted", label: "Not contracted yet" },
    ],
    showIf: SPACECRAFT_OR_LAUNCH,
  },
  {
    id: "q4_8b_launch_site_countries",
    section: "jurisdiction_market",
    tier: "full",
    kind: "country_multi",
    screenGroup: "q4_8_launching_state",
    title: "Where is the launch site?",
    why: "The launch-site state is a launching State under the Liability and Registration Conventions — it co-determines registration and indemnification attribution.",
    citation: [
      CITE_LIABILITY_CONVENTION(
        "1972 Liability Convention Art. I(c) (launching State: territory/facility)",
      ),
      CITE_REG_CONVENTION(
        "Convention on Registration of Objects Launched into Outer Space (1975)",
      ),
    ],
    unsureMode: "option",
    showIf: SPACECRAFT_OR_LAUNCH,
  },
  {
    id: "q4_8c_procuring_states",
    section: "jurisdiction_market",
    tier: "full",
    kind: "country_multi",
    screenGroup: "q4_8_launching_state",
    title: "Which state(s) procure the launch?",
    why: "A state that procures a launch is a launching State — procurement attribution decides which state registers the object and bears Liability-Convention indemnification exposure.",
    citation: [
      CITE_LIABILITY_CONVENTION(
        "1972 Liability Convention Art. I(c) (launching State: procurement)",
      ),
    ],
    unsureMode: "option",
    showIf: SPACECRAFT_OR_LAUNCH,
  },

  {
    id: "q4_9_un_registration",
    section: "jurisdiction_market",
    tier: "full",
    kind: "single",
    title:
      "Are your space objects entered in a national registry and the UN register?",
    why: "OST Art VIII + the 1975 Registration Convention. The finding explains that URSO (Art 24, EUSPA) will be an ADDITIONAL register, not a substitute.",
    citation: [
      CITE_OST("OST Art. VIII (registration, jurisdiction and control)"),
      CITE_REG_CONVENTION(
        "Convention on Registration of Objects Launched into Outer Space (1975)",
      ),
      CITE_COM("COM(2025) 335 Art. 24 (URSO — Union register, EUSPA)"),
    ],
    unsureMode: "option",
    options: [
      { value: "registered", label: "Registered" },
      { value: "pending", label: "Pending" },
      { value: "not_registered", label: "Not registered" },
    ],
    showIf: {
      all: [
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        {
          q: "q5_1_lifecycle_phase",
          op: "in",
          value: ["launched_operating", "end_of_life"],
        },
      ],
    },
  },

  // Q4.10 — NEW: on-orbit transfer / change of control (§7.2 MUST-ADD).
  // BINDING shape (plan Task 1.5).
  {
    id: "q4_10_transfer_change_of_control",
    section: "jurisdiction_market",
    tier: "full",
    kind: "single",
    title:
      "Is an acquisition, sale or transfer of in-orbit assets — or a change of control of your organisation — planned or underway?",
    why: "FR LOS, UK OSA/SIA and NL law require authorisation/consent for transfers of space objects or operator control; the EU proposal also touches transfer. Without this, a pending deal is invisible to the verdict (§7.2).",
    citation: [
      {
        label: "French Space Operations Act",
        citation: "Loi n° 2008-518 (LOS) — transfer authorisation",
        asOf: "2008-06-03",
        verified: true,
      },
      {
        label: "UK Space Industry Act 2018 / Outer Space Act 1986",
        citation: "licence transfer consent",
        asOf: "2018-03-15",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      {
        value: "transfer_out",
        label: "Sale / transfer of in-orbit assets planned or underway",
      },
      {
        value: "acquisition",
        label: "Acquisition of in-orbit assets planned or underway",
      },
      {
        value: "change_of_control",
        label: "Change of control of our organisation planned or underway",
      },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  // ═══ SECTION 5: LIFECYCLE STAGE (Q5.3 CUT §7.3 → roadmap copy) ═════════════

  {
    id: "q5_1_lifecycle_phase",
    section: "lifecycle",
    tier: "both",
    kind: "single",
    title: "What phase is your (primary) mission in?",
    why: "Separates obligations that are live NOW from upcoming ones — turns a flat gap list into a dated roadmap; feeds transition logic together with launch timing (Q3.6) and CDR status (Q3.7). Heterogeneous fleets: the verdict DISCLOSES that a single primary-mission phase aggregates a multi-mission fleet most-restrictively (§7.2).",
    citation: [CITE_COM("COM(2025) 335 Arts. 118–119 (transition windows)")],
    unsureMode: "none",
    options: [
      { value: "concept", label: "Concept" },
      { value: "design_pre_cdr", label: "Design (pre-CDR)" },
      { value: "built_pre_launch", label: "Built, pre-launch" },
      { value: "launched_operating", label: "Launched, operating" },
      { value: "end_of_life", label: "End of life" },
    ],
  },

  // Q5.2 — key dates: three structured date answers on ONE screen; they feed
  // the deadline-ordered roadmap (Task 3.x). ISO dates expected; "I'm not
  // sure" is a valid (and honest) answer for dates not yet set.
  {
    id: "q5_2_target_launch_date",
    section: "lifecycle",
    tier: "full",
    kind: "text",
    screenGroup: "q5_2_key_dates",
    title: "Target launch date? (YYYY-MM-DD)",
    why: "Produces the deadline-ordered roadmap — the artifact a board or lawyer actually uses. The launch date anchors transition-window and authorisation lead times.",
    citation: [CITE_COM("COM(2025) 335 Arts. 118–119 (transition windows)")],
    unsureMode: "option",
  },
  {
    id: "q5_2b_target_authorisation_date",
    section: "lifecycle",
    tier: "full",
    kind: "text",
    screenGroup: "q5_2_key_dates",
    title: "Target authorisation date? (YYYY-MM-DD)",
    why: "Authorisation lead time orders the roadmap — national procedures take months; the date you NEED the authorisation determines when each gap must close.",
    citation: [CITE_COM("COM(2025) 335 — authorisation procedure timelines")],
    unsureMode: "option",
  },
  {
    id: "q5_2c_license_expiry_dates",
    section: "lifecycle",
    tier: "full",
    kind: "text",
    screenGroup: "q5_2_key_dates",
    title:
      "Existing license expiry date(s)? (YYYY-MM-DD, comma-separated if several)",
    why: "Expiring national licenses are live deadlines — the roadmap shows renewal lead times next to new obligations.",
    citation: [
      CITE_COM("COM(2025) 335 Art. 3 (national authorisations; transition)"),
    ],
    unsureMode: "option",
    showIf: { q: "q4_4_licenses_held", op: "answered" },
  },

  // NO q5_3 (CUT §7.3): pre-application-engagement praise becomes roadmap copy
  // ("UK CAA and CNES practice reward early engagement"), not a question.

  // ═══ SECTION 6: NIS2 GATEWAY & SECURITY POSTURE ════════════════════════════
  // The engine computes NIS2 classification FIRST. The cyber-architecture
  // routing itself is CONTESTED (Commission resilience chapter vs Council
  // synchronisation vs EP deletion + NIS2 extension) — the routing finding
  // always carries the cyberArchitecture flux flag (Task 1.9); nothing here
  // cites the unverified "Art 75a".

  // Q6.1 — ECN, GATE FIX (§7.2/§7.4). BINDING shape (plan Task 1.6).
  {
    id: "q6_1_public_ecn",
    section: "nis2_gateway",
    tier: "full",
    kind: "single",
    title:
      "Are you a public electronic-communications network or service provider?",
    why: "NIS2 Annex I 'Space' explicitly EXCLUDES public ECN providers (covered under other NIS2 sectors). A Yes answer routes to 'in scope under another NIS2 sector — outside this tool's space-sector scope' — NEVER to a clean 'NIS2 does not apply' (§7.2 gate fix). Unsure rounds up to needs-clarification.",
    citation: [
      {
        label: "NIS2 Directive",
        citation: "Directive (EU) 2022/2555 Annex I, Sector 11 (Space)",
        asOf: "2022-12-27",
        verified: true,
      },
    ],
    unsureMode: "option", // unsure → needs-clarification (gateway), stored {state:"unsure"}
    options: [
      {
        value: "yes",
        label:
          "Yes — we provide public electronic-communications networks/services",
      },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q4_3_ground_segment", op: "eq", value: "own" },
  },

  // Q6.2 — designation, CITATION FIX (§7.1 #5).
  // NOT Art 2(2)(f) — that is public administration (§7.1).
  {
    id: "q6_2_ms_designation",
    section: "nis2_gateway",
    tier: "full",
    kind: "single",
    title:
      "Has any member state designated you as an essential/important entity (NIS2) or critical entity (CER)?",
    why: "Member-state identification overrides the size cap: NIS2 Art. 2(2)(b)–(e) + final subparagraph (member-state identification list); CER-critical entities enter via Art. 2(3) / Art. 3(1)(f). 'I'm not sure' produces a named 'clarify with your NCA' flag — never a silent No.",
    citation: [
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 2(2)(b)–(e) + final subparagraph; CER-critical entities via Art. 2(3) / Art. 3(1)(f)",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },

  {
    id: "q6_3_sole_provider",
    section: "nis2_gateway",
    tier: "full",
    kind: "single",
    title:
      "Are you the sole provider of your service in any member state, or would disruption have significant societal or safety impact?",
    why: "The Art 2(2)(b)–(e) size-cap exceptions — exactly the trap small space operators fall into; never asked anywhere before. A sole-provider or societal-impact 'yes' puts a below-the-caps entity in scope.",
    citation: [CITE_NIS2("Directive (EU) 2022/2555 Art. 2(2)(b)–(e)")],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    // Asked when BELOW the size caps (the exceptions only matter there); an
    // unsure size band keeps the question visible (round up — ask, don't skip).
    showIf: {
      not: {
        any: [
          {
            q: "q1_5_headcount",
            op: "in",
            value: ["h_50_249", "h_250_plus"],
          },
          { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
        ],
      },
    },
  },

  // Q6.4 — member-state transposition list (auto-derived, confirm-only).
  // BINDING shape (plan Task 1.6). The confirmed list feeds
  // NIS2GatewayResult.transpositions (Task 1.7) — the computed source for the
  // §6 verdict-header "(DE transposition)" element (Task 3.3).
  {
    id: "q6_4_ms_transpositions",
    section: "nis2_gateway",
    tier: "full",
    kind: "country_multi",
    title: "Member states where your NIS2-relevant services are provided",
    why: "Selects WHICH national transposition applies — registration duties, deadlines and sanctions differ per member state (DE NIS2UmsuCG in force 6 Dec 2025 → BSI; transposition state varies across the EU27 — 19 MS received reasoned opinions May 2025). Pre-filled from your establishment, ground-station countries and EU service markets; you confirm or edit the list (§4 Q6.4).",
    citation: [
      {
        label: "German NIS2 transposition (in force, BSI competent)",
        citation: "NIS2UmsuCG",
        asOf: "2025-12-06",
        verified: true,
      },
      {
        label: "NIS2 Directive",
        citation: "Directive (EU) 2022/2555 Art. 41 (transposition)",
        asOf: "2022-12-27",
        verified: true,
      },
    ],
    unsureMode: "none", // derived confirm/edit list — uncertainty is expressed by editing, not by an unsure state
    derivedFrom: [
      "q1_2_establishment",
      "q4_3b_ground_countries",
      "q4_1_eu_nexus",
    ],
    showIf: {
      any: [
        { q: "q6_2_ms_designation", op: "eq", value: "yes" },
        { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
        { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
        { q: "q4_3_ground_segment", op: "eq", value: "own" },
      ],
    }, // = NIS2 potentially in scope
  },

  // Q6.5 — quick-tier composite cyber signal (expanded into Q6.6 in full tier).
  {
    id: "q6_5_cyber_programme",
    section: "nis2_gateway",
    tier: "quick",
    kind: "single",
    title: "Do you have a formal cybersecurity programme?",
    why: "The quick tier's single readiness signal for the cyber cluster; expanded into the full per-measure battery in the full assessment.",
    citation: [
      CITE_NIS2("Directive (EU) 2022/2555 Art. 21 (risk-management measures)"),
    ],
    unsureMode: "option",
    options: [
      { value: "yes_documented", label: "Yes, documented" },
      { value: "partial", label: "Partial" },
      { value: "no", label: "No" },
    ],
  },

  // Q6.6 — battery, 10 items (§7.2 adds Art 20 management-body accountability).
  // ONE node, per-item statuses. Answer encoding: {state:"answered",
  // value: string[]} of "<itemId>:<status>" entries, status ∈
  // BATTERY_ITEM_STATUSES (see file header). Per-item "unsure" = gap, listed
  // under "unknowns to resolve".
  {
    id: "q6_6_battery",
    section: "nis2_gateway",
    tier: "full",
    kind: "battery",
    title: "Cybersecurity & resilience measures — status per area",
    why: "Maps 1:1 to the NIS2 Art 21 measures (ENISA Technical Implementation Guidance) AND the Space Act resilience cluster (Arts 83, 84, 86, 87, 89, 92 in the Commission text — the routing between the two regimes is contested in legislation and carries a flux flag). The 4-state evidence scale separates applicability from readiness; management-body accountability (board approval, oversight, training, personal liability) is a DISTINCT NIS2 Art 20 obligation — staff 'security training' does not cover it (§7.2).",
    citation: [
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 21 (risk-management measures; ENISA Technical Implementation Guidance)",
      ),
      CITE_COM(
        "COM(2025) 335 Arts. 83, 84, 86, 87, 89, 92 (resilience cluster, Commission text)",
      ),
      CITE_NIS2(
        "Directive (EU) 2022/2555 Art. 20 (management-body approval, oversight, training, personal liability)",
      ),
    ],
    unsureMode: "none", // uncertainty is expressed PER ITEM via the "unsure" status
    items: [
      { id: "risk_assessment", label: "Risk assessment process" },
      {
        id: "incident_detection_reporting_chain",
        label:
          "Incident detection + handling incl. readiness for the 24h early-warning / 72h notification / 1-month final-report chain",
      },
      {
        id: "business_continuity",
        label: "Business continuity & disaster recovery",
      },
      { id: "supply_chain", label: "Supply-chain security" },
      { id: "cryptography", label: "Cryptography & encryption" },
      {
        id: "access_control_identity",
        label: "Access control & identity management",
      },
      { id: "security_training", label: "Security training (staff)" },
      { id: "vulnerability_management", label: "Vulnerability management" },
      { id: "ttc_link_protection", label: "TT&C link protection" },
      {
        id: "management_body_accountability",
        label:
          "Management-body accountability (board approval of measures, oversight, training, personal liability — NIS2 Art. 20)",
      },
    ],
    showIf: {
      any: [
        { q: "q6_2_ms_designation", op: "eq", value: "yes" },
        { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
        { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
        { q: "q4_3_ground_segment", op: "eq", value: "own" },
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        { q: "q1_1_roles", op: "includes", value: "launch_operator" },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "in_space_service_provider",
        },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "ground_segment_operator",
        },
      ],
    }, // = NIS2 potentially in scope OR Space Act resilience applies (operator roles)
  },

  {
    id: "q6_7_certifications",
    section: "nis2_gateway",
    tier: "full",
    kind: "multi",
    title: "Which certifications/frameworks do you hold?",
    why: "Credit-mapping — e.g. 'Art 84 partially evidenced via your ISO 27001 Annex A controls' (CyFun/Purview mapping-table pattern). The certification answer is finally consumed by the engine instead of being collected and ignored.",
    citation: [
      CITE_NIS2("Directive (EU) 2022/2555 Art. 21"),
      CITE_COM("COM(2025) 335 Art. 84 (Commission text resilience cluster)"),
    ],
    unsureMode: "none",
    options: [
      { value: "iso_27001", label: "ISO 27001" },
      { value: "iso_9001", label: "ISO 9001" },
      { value: "soc_2", label: "SOC 2" },
      { value: "cyfun", label: "CyFun (CyberFundamentals) tier" },
      { value: "ecss", label: "ECSS standards" },
      { value: "cyber_essentials", label: "Cyber Essentials" },
      { value: "other", label: "Other" },
      { value: "none", label: "None" },
    ],
  },

  // Q6.8 — NEW: NIS2 registration status (§7.2 MUST-ADD). BINDING shape
  // (plan Task 1.6).
  {
    id: "q6_8_nis2_registration_status",
    section: "nis2_gateway",
    tier: "full",
    kind: "single",
    title:
      "Are you registered with the national NIS2 authority in each member state where you are classified?",
    why: "Classification without registration status hides the single most urgent live deadline: in Germany the BSI registration duty applies WITHOUT transition since 6 Dec 2025 (NIS2UmsuCG). The roadmap cannot show this deadline unless asked (§7.2).",
    citation: [
      {
        label: "German NIS2 transposition (in force, BSI competent)",
        citation: "NIS2UmsuCG — registration duty",
        asOf: "2025-12-06",
        verified: true,
      },
      {
        label: "NIS2 Directive",
        citation: "Directive (EU) 2022/2555 Art. 3(3)–(4)",
        asOf: "2022-12-27",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      {
        value: "registered_all",
        label: "Registered in every member state where classified",
      },
      { value: "partial", label: "Registered in some, not all" },
      { value: "not_registered", label: "Not registered anywhere" },
    ],
    showIf: {
      any: [
        { q: "q6_2_ms_designation", op: "eq", value: "yes" },
        { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
        { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
      ],
    },
  },

  // ═══ SECTION 7: DEBRIS & ENVIRONMENT ═══════════════════════════════════════

  // Q7.1 — full tier only (§7.3 trim: the quick verdict derives the debris
  // signal from role + lifecycle instead of asking).
  {
    id: "q7_1_debris_plan",
    section: "debris_environment",
    tier: "full",
    kind: "single",
    title: "Do you have a debris-mitigation plan?",
    why: "Gateway to the Arts 58–74 readiness diff plus the FR (CNES verification) and IT (authorisation condition) national requirements.",
    citation: [
      CITE_COM("COM(2025) 335 Arts. 58–74 (debris & safety)"),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — CNES-verified debris compliance"),
      CITE_IT("Law 89/2025 — debris mitigation as an authorisation condition"),
    ],
    unsureMode: "option",
    options: [
      { value: "approved", label: "Approved by a regulator" },
      { value: "drafted", label: "Drafted" },
      { value: "none", label: "None" },
    ],
    showIf: SPACECRAFT_OR_LAUNCH,
  },

  {
    id: "q7_2_passivation",
    section: "debris_environment",
    tier: "full",
    kind: "single",
    title: "Can your spacecraft be passivated at end of mission?",
    why: "Core debris-mitigation control (COPUOS/IADC guidelines + the Space Act technical rules) — reuses the existing COPUOS engine's requirement set.",
    citation: [
      CITE_COPUOS("A/62/20 (2007), endorsed UNGA Res. 62/217 — passivation"),
      CITE_COM("COM(2025) 335 Arts. 61–74 (technical debris rules)"),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
  },

  {
    id: "q7_3_environmental_footprint",
    section: "debris_environment",
    tier: "full",
    kind: "single",
    title:
      "Can you produce lifecycle environmental data for an environmental footprint declaration?",
    why: "Arts 96–98 require the footprint declaration WITH the authorisation request; the EP draft downgrades it to an 'estimate' — the finding carries the legislative-flux flag.",
    citation: [
      CITE_COM(
        "COM(2025) 335 Arts. 96–98 (environmental footprint declaration)",
      ),
      CITE_ITRE(
        "environmental footprint declaration downgraded to an 'estimate' (draft amendment)",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partially", label: "Partially" },
      { value: "no", label: "No" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        { q: "q1_1_roles", op: "includes", value: "launch_operator" },
        { q: "q1_1_roles", op: "includes", value: "launch_site_operator" },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "in_space_service_provider",
        },
      ],
    },
  },

  // Q7.4 — generalized launch-site / mission environmental assessment (§7.2):
  // UK CAA AEE AND FR/SE/NO launch-site EIA obligations; the finding text
  // branches per jurisdiction nexus (pipeline).
  {
    id: "q7_4_environmental_assessment",
    section: "debris_environment",
    tier: "full",
    kind: "single",
    title:
      "Is a launch-site / mission environmental assessment prepared or planned?",
    why: "The UK CAA Assessment of Environmental Effects is a statutory test — the AEE must be fit for public consultation. FR, SE and NO impose launch-site environmental-impact-assessment obligations of their own (Kourou/CNES practice, Esrange, Andøya). The finding text branches per your jurisdiction nexus (§7.2).",
    citation: [
      CITE_UK(
        "SIA 2018 s. 11 — Assessment of Environmental Effects (CAA statutory test, fit for public consultation)",
      ),
      CITE_FR_LOS(
        "Loi n° 2008-518 (LOS) — launch-site environmental obligations",
      ),
      {
        label: "Swedish / Norwegian launch-site EIA obligations",
        citation:
          "national environmental-assessment law (Esrange / Andøya practice) — pending primary-text verification",
        asOf: "2026-06-09",
        verified: false,
      },
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes — prepared or planned" },
      { value: "no", label: "No" },
    ],
    showIf: {
      any: [
        UK_NEXUS,
        { q: "q1_1_roles", op: "includes", value: "launch_site_operator" },
      ],
    },
  },

  // ═══ SECTION 8: INSURANCE & LIABILITY (Q8.3 CUT §7.3 → pipeline advisory) ══

  {
    id: "q8_1_tpl_insurance",
    section: "insurance_liability",
    tier: "both",
    kind: "single",
    title:
      "Do you hold third-party liability insurance for your space activities?",
    why: "Third-party liability remains NATIONAL law and stays national even after the Space Act (the proposal contains no insurance harmonisation) — so the verdict binds to your actual jurisdictions: IT €100M per claim with startup/research reductions, FR state-guarantee ceiling mechanics, UK per-license limits.",
    citation: [
      CITE_IT("Law 89/2025 — TPL €100M per claim; startup/research reductions"),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — state-guarantee ceiling mechanics"),
      CITE_UK("SIA 2018 / OSA 1986 — per-license liability limits"),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "in_procurement", label: "In procurement" },
      { value: "no", label: "No" },
    ],
  },

  // Q8.2 — coverage bands split by phase: two band nodes on ONE screen.
  {
    id: "q8_2_coverage_launch",
    section: "insurance_liability",
    tier: "full",
    kind: "bands",
    screenGroup: "q8_2_coverage",
    title: "Third-party liability coverage band — LAUNCH phase?",
    why: "Compared against the NAMED national minimums of your selected jurisdictions with the national legal basis cited — never a fabricated 'EU Art 48 TPL calculation'.",
    citation: [
      CITE_IT("Law 89/2025 — TPL €100M per claim (reductions available)"),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — launch-phase liability ceiling"),
      CITE_UK("SIA 2018 / OSA 1986 — per-license liability limits"),
    ],
    unsureMode: "option",
    options: [
      { value: "b_lt_60m", label: "Under €60M" },
      { value: "b_60_100m", label: "€60–100M" },
      { value: "b_gt_100m", label: "Over €100M" },
    ],
    showIf: {
      q: "q8_1_tpl_insurance",
      op: "in",
      value: ["yes", "in_procurement"],
    },
  },
  {
    id: "q8_2b_coverage_orbit",
    section: "insurance_liability",
    tier: "full",
    kind: "bands",
    screenGroup: "q8_2_coverage",
    title: "Third-party liability coverage band — IN-ORBIT phase?",
    why: "In-orbit coverage minimums differ from launch-phase minimums in several national regimes — the comparison runs per phase against the named national legal basis.",
    citation: [
      CITE_IT("Law 89/2025 — TPL per claim (in-orbit phase)"),
      CITE_FR_LOS("Loi n° 2008-518 (LOS) — in-orbit liability ceiling"),
    ],
    unsureMode: "option",
    options: [
      { value: "b_lt_60m", label: "Under €60M" },
      { value: "b_60_100m", label: "€60–100M" },
      { value: "b_gt_100m", label: "Over €100M" },
    ],
    showIf: {
      q: "q8_1_tpl_insurance",
      op: "in",
      value: ["yes", "in_procurement"],
    },
  },

  // NO q8_3 (CUT §7.3): the launching-State indemnification advisory is
  // emitted unconditionally from the Q4.8 facts (pipeline, Task 1.9) —
  // awareness questions never discriminate.

  // ═══ SECTION 9: SPECTRUM & EXPORT CONTROL ══════════════════════════════════

  {
    id: "q9_1_rf_spectrum",
    section: "spectrum_export",
    tier: "both",
    kind: "single",
    title: "Does your mission use radio-frequency spectrum?",
    why: "Applicability gate for the ITU/spectrum cluster — finally wires the existing spectrum engine (never invoked by any legacy assessment) into the verdict.",
    citation: [
      CITE_ITU(
        "ITU Radio Regulations Arts. 9 & 11 (coordination, notification)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        { q: "q1_1_roles", op: "includes", value: "launch_operator" },
        {
          q: "q1_1_roles",
          op: "includes",
          value: "ground_segment_operator",
        },
      ],
    },
  },

  {
    id: "q9_2_itu_filing",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title:
      "Which administration files for you at the ITU, and what stage is your filing?",
    why: "The ITU lifecycle (advance publication → coordination → notification → MIFR) plus bringing-into-use deadlines. 'I'm not sure' becomes a TOP-PRIORITY named unknown — spectrum is existential.",
    citation: [
      CITE_ITU(
        "ITU Radio Regulations Arts. 9 & 11 — API/coordination/notification lifecycle; bringing-into-use deadlines",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "none", label: "No filing yet" },
      { value: "advance_publication", label: "Advance publication (API)" },
      { value: "coordination", label: "Coordination" },
      { value: "notified", label: "Notified" },
      { value: "recorded_mifr", label: "Recorded in the MIFR" },
    ],
    showIf: { q: "q9_1_rf_spectrum", op: "eq", value: "yes" },
  },

  {
    id: "q9_3_landing_rights",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title:
      "Do you hold national frequency assignments and landing rights for each market you serve?",
    why: "Per-country market access is separate from the ITU filing — mirrors the UK CAA RF/spectrum question set.",
    citation: [CITE_ITU("ITU Radio Regulations Art. 18 (station licensing)")],
    unsureMode: "option",
    options: [
      { value: "in_place", label: "In place" },
      { value: "partial", label: "Partial" },
      { value: "none", label: "None" },
    ],
    showIf: { q: "q9_1_rf_spectrum", op: "eq", value: "yes" },
  },

  {
    id: "q9_4_us_origin",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title:
      "Does your supply chain include US-origin components, technology, or launch services?",
    why: "ITAR/EAR attach to US-origin CONTENT regardless of which certifications you hold. 'I'm not sure' → an export-classification-screening-recommended finding.",
    citation: [
      CITE_ITAR("22 CFR Parts 120–130"),
      CITE_EAR("15 CFR Parts 730–774"),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },

  // Q9.5 — orphan fix (§7.2): no phantom "manufacturer" role; the showIf
  // references only role values that exist in q1_1_roles.
  {
    id: "q9_5_dual_use",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title:
      "Do your products/technology fall under EU Dual-Use Regulation 2021/821 Annex I?",
    why: "EU export-authorisation exposure. NOTE: the September 2025 Annex I update (Delegated Reg. (EU) 2025/2003) expanded spacecraft 'mission equipment' — on-board computing, inter-satellite links, thermal management — which catches operators who last checked years ago.",
    citation: [
      {
        label: "EU Dual-Use Regulation",
        citation: "Regulation (EU) 2021/821 Annex I",
        asOf: "2021-09-09",
        verified: true,
      },
      {
        label:
          "Dual-Use Annex I update (spacecraft 'mission equipment' rework)",
        citation: "Delegated Reg. (EU) 2025/2003, OJ 14 Nov 2025",
        asOf: "2025-09-08",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: {
      any: [
        { q: "q1_1_roles", op: "includes", value: "component_supplier" },
        { q: "q1_1_roles", op: "includes", value: "spacecraft_operator" },
        { q: "q1_1_roles", op: "includes", value: "launch_operator" },
      ],
    },
  },

  {
    id: "q9_6_deemed_export",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title: "Do non-US/EU nationals have access to controlled technical data?",
    why: "The ITAR deemed-export trap for European teams with international staff — release of controlled technical data to a foreign person counts as an export.",
    citation: [
      CITE_ITAR(
        "22 CFR Parts 120–130 — release of technical data to foreign persons ('deemed export')",
      ),
    ],
    unsureMode: "option",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    showIf: { q: "q9_4_us_origin", op: "eq", value: "yes" },
  },

  // Q9.7 — NEW: EU sanctions (§7.2 MUST-ADD). BINDING shape (plan Task 1.6).
  {
    id: "q9_7_sanctions_screening",
    section: "spectrum_export",
    tier: "full",
    kind: "single",
    title:
      "Do you screen customers and end-users against EU sanctions lists — and do you supply items subject to the Russia/Belarus space-sector embargoes?",
    why: "EU restrictive measures embargo space-sector items to Russia/Belarus and require end-user screening — in 2026 the highest-frequency export risk for European space supply chains; ITAR/EAR/dual-use questions do not cover it (§7.2).",
    citation: [
      {
        label: "EU restrictive measures (Russia)",
        citation:
          "Council Reg. (EU) 833/2014 as amended — space-sector export restrictions",
        asOf: "2024-12-16",
        verified: true,
      },
      {
        label: "EU restrictive measures (Belarus)",
        citation: "Council Reg. (EC) 765/2006 as amended",
        asOf: "2024-06-29",
        verified: true,
      },
    ],
    unsureMode: "option",
    options: [
      {
        value: "screening_in_place",
        label: "Yes — systematic sanctions/end-user screening in place",
      },
      { value: "partial", label: "Partial — ad-hoc screening only" },
      { value: "none", label: "No screening" },
    ],
  },

  // ═══ SECTION 10: REVIEW & LIVING PROFILE ═══════════════════════════════════
  // Q10.1 check-your-answers is a mandatory WIZARD STEP (GOV.UK pattern), not
  // a question — no node (see file header).

  {
    id: "q10_2_living_triggers",
    section: "review",
    tier: "full",
    kind: "multi",
    title: "Notify me and re-assess when things change?",
    why: "The living-assessment tier: exception-based delta-reassessment of ONLY the affected questions when a trigger fires (new spacecraft, new jurisdiction, new service line, ownership change, or a Caelex rulebook version bump — e.g. a trilogue outcome).",
    citation: [
      CITE_COM(
        "COM(2025) 335 — legislative procedure in progress (rulebook version bumps re-trigger assessment)",
      ),
    ],
    unsureMode: "none",
    options: [
      { value: "new_spacecraft", label: "New spacecraft" },
      { value: "new_jurisdiction", label: "New jurisdiction" },
      { value: "new_service_line", label: "New service line" },
      { value: "ownership_change", label: "Ownership change" },
      {
        value: "rulebook_version_bump",
        label: "Caelex rulebook version bump (e.g. trilogue outcome)",
      },
    ],
  },
];

/** Every question id in the graph — the known-id set injected into
 *  `buildAnswerMapSchema` (Task 1.3) and used by integrity tests. */
export const QUESTION_IDS: ReadonlySet<string> = new Set(
  QUESTION_GRAPH.map((n) => n.id),
);
