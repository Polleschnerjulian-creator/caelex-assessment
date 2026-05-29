import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Compliance Tools (Sprint 3, 2026-05-12).
 *
 * Wraps Caelex's eight compliance engines as research-style Atlas tools
 * the chat-engine can invoke. Each tool is intentionally a **lawyer-
 * oriented research surface**, not a full automated assessment:
 *   1. Tool takes a SLIM input (operatorType, jurisdiction, key
 *      activity flags).
 *   2. Returns a structured summary of how the regulation applies +
 *      next steps + cited Atlas-corpus sources.
 *   3. The lawyer can then call the engine via a wizard for a full
 *      score; the chat-side tool is for getting fast oriented.
 *
 * Why research-style instead of full-engine-call: full engines need
 * 30+ form fields. Asking the LLM to fill those would force users into
 * structured intake before they can ask basic questions. Research-style
 * tools turn Astra into a "knowledgeable colleague who knows the
 * regulation" rather than "a button that runs an audit."
 *
 * Compliance areas covered (8):
 *   - assess_eu_space_act
 *   - classify_nis2
 *   - assess_national_space_law
 *   - assess_uk_space_industry
 *   - assess_us_regulatory
 *   - classify_export_control
 *   - check_spectrum_filing
 *   - check_copuos_compliance
 *
 * See docs/ATLAS-V2-MASTER-PLAN.md § Tool Bundle 2.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getLegalSourceById } from "@/data/legal-sources";

/* H6: only emit an [ATLAS:id] citation pill when the id resolves in the
   corpus — directly OR via the standard -Art./-§ parent strip. These
   tools previously synthesised article-level ids (ITU-RR-Art-9,
   EU-NIS2-Art.21, UK-<mangled>, …) that don't resolve, producing
   fabricated citation pills. Non-resolving refs degrade to plain text so
   the model can still reference them without asserting a fake source. */
function atlasCite(id: string): string {
  const parent = id.replace(/-§.*$/i, "").replace(/-Art\..*$/i, "");
  return getLegalSourceById(id) || getLegalSourceById(parent)
    ? `[ATLAS:${id}]`
    : id;
}

export interface ComplianceToolResult {
  content: string;
  isError: boolean;
}

/* ── Tool definitions (Anthropic-tool format) ────────────────────────── */

export const COMPLIANCE_TOOLS: Anthropic.Tool[] = [
  {
    name: "assess_eu_space_act",
    description:
      "Returns an oriented summary of how the EU Space Act (COM(2025) 335) applies to a given operator type + establishment. Includes: applicable modules (Authorization, Cybersecurity, Debris, etc.), key articles, exemption analysis (defence-only, third-country no-EU-services), and next steps. Use this when the lawyer asks anything starting with 'Wie wirkt sich der EU Space Act auf …' or 'Welche EU-Space-Act-Pflichten hat …'. Do NOT use for jurisdiction-comparison (use compare_jurisdictions_for_filing) or US/UK regulatory questions.",
    input_schema: {
      type: "object",
      properties: {
        operatorType: {
          type: "string",
          enum: [
            "spacecraft_operator",
            "launch_operator",
            "ground_segment_operator",
            "in_orbit_servicing",
            "space_traffic_coordination",
            "space_data_provider",
            "other",
          ],
          description:
            "Operator activity type per EU Space Act Art. 2. spacecraft_operator covers satellite ops; launch_operator covers launchers; ground_segment_operator covers ground stations + control centres.",
        },
        establishment: {
          type: "string",
          enum: ["eu", "third_country_eu_services", "third_country_no_eu"],
          description:
            "Where is the operator legally established? eu = EU member-state; third_country_eu_services = non-EU entity offering services in EU; third_country_no_eu = non-EU, no EU services offered (typically out-of-scope).",
        },
        defenceOnly: {
          type: "boolean",
          description:
            "True iff the operator handles ONLY defence-related space operations (triggers Art. 2(3) exemption from EU Space Act).",
        },
      },
      required: ["operatorType", "establishment"],
    },
  },
  {
    name: "classify_nis2",
    description:
      "Classifies an operator under NIS2 Directive (EU 2022/2555) as Essential / Important / Out-of-Scope. Returns: classification + reasoning + which Annex sector applies + key NIS2 obligations (Art. 21-23) + reporting timelines (24h/72h/30d). Use when lawyer asks 'NIS2-Klassifizierung für …' or 'Ist mein Mandant NIS2-essential?'.",
    input_schema: {
      type: "object",
      properties: {
        sector: {
          type: "string",
          enum: [
            "space",
            "digital_infrastructure",
            "ict_service_management",
            "managed_service_provider",
            "cloud_computing",
            "data_centre",
            "other",
          ],
          description:
            "Primary NIS2 sector of the operator. 'space' = NIS2 Annex I, point 11 (space sector). Most satellite operators map to 'space'.",
        },
        sizeClass: {
          type: "string",
          enum: ["small", "medium", "large"],
          description:
            "EU SME definition: small <50 emp + ≤€10M turnover; medium 50-249 emp OR ≤€50M turnover; large ≥250 emp OR >€50M turnover.",
        },
        memberState: {
          type: "string",
          description:
            "ISO-2 code of the EU member state where the operator is established (for transposition reference). 'DE', 'FR', 'IT', 'NL', 'LU', 'ES', 'SE', 'AT', 'BE', 'PL', 'IE', 'FI', etc.",
        },
        criticalForSocietalFunction: {
          type: "boolean",
          description:
            "True iff the operator provides services that are critical for societal/economic functions (Art. 3(1)(b) NIS2 essential-entity criterion).",
        },
      },
      required: ["sector", "sizeClass", "memberState"],
    },
  },
  {
    name: "assess_national_space_law",
    description:
      "Returns an oriented summary of how a specific national space law applies to an operator. Covers DE WeltraumG, FR LOS, IT Sp.Act, UK OSA-2018, NL Wbb-Spw, ES, BE, LU, NO, FI. Includes: authorization regime, liability cap, insurance minimum, frequency-coordination authority, registration requirements, key articles. Use when lawyer asks about a specific country's space law.",
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          enum: [
            "DE",
            "FR",
            "IT",
            "UK",
            "NL",
            "ES",
            "BE",
            "LU",
            "NO",
            "FI",
            "AT",
            "SE",
            "DK",
            "CH",
          ],
          description: "ISO-2 jurisdiction code.",
        },
        operatorType: {
          type: "string",
          description:
            "Free-text operator type (e.g. 'satellite_operator', 'launch_provider', 'data_relay').",
        },
        focus: {
          type: "string",
          enum: [
            "authorization",
            "liability_insurance",
            "registration",
            "supervision",
            "all",
          ],
          description:
            "What aspect to focus on. 'all' returns the full overview; the others return a focused summary on that single dimension.",
        },
      },
      required: ["jurisdiction", "operatorType"],
    },
  },
  {
    name: "assess_uk_space_industry",
    description:
      "Returns an oriented summary of UK Space Industry Act 2018 obligations for a given activity. Covers: licensing regime (CAA), insurance minimum (£60M default), liability cap, indemnification, range-control. Use when lawyer asks about UK launch / space-services authorisation.",
    input_schema: {
      type: "object",
      properties: {
        activityType: {
          type: "string",
          enum: [
            "launch",
            "spaceflight_operator",
            "range_control",
            "spaceport",
            "satellite_operation",
          ],
          description:
            "UK Space Industry Act activity classification. Each triggers different licensing tracks.",
        },
        ukEstablished: {
          type: "boolean",
          description:
            "True iff the operator has UK establishment. Non-UK operators offering services into UK still need CAA authorization.",
        },
      },
      required: ["activityType"],
    },
  },
  {
    name: "assess_us_regulatory",
    description:
      "Returns an oriented summary of US space-regulatory obligations (FCC for spectrum, FAA for launch + commercial-spaceports, ITAR/EAR for export control, NOAA for remote-sensing). Identifies which US agency authorisation is needed for a given operator activity.",
    input_schema: {
      type: "object",
      properties: {
        activityType: {
          type: "string",
          enum: [
            "satellite_communications",
            "remote_sensing",
            "launch",
            "reentry",
            "human_spaceflight",
            "manufacturing",
            "ground_station",
          ],
          description: "Primary activity type.",
        },
        usEstablished: {
          type: "boolean",
          description:
            "True iff the operator has a US presence. Non-US entities transmitting into/over US still trigger FCC obligations.",
        },
      },
      required: ["activityType"],
    },
  },
  {
    name: "classify_export_control",
    description:
      "Classifies a space item under ITAR (US Munitions List), EAR (US Commerce Control List), and EU Dual-Use Regulation 2021/821. Returns: applicable categories + control list entries + likely licence requirements + sanctions overlap. Use for any export-control question.",
    input_schema: {
      type: "object",
      properties: {
        item: {
          type: "string",
          description:
            "Free-text description of the item (e.g. 'thermal-imaging satellite payload', 'space-qualified radiation-hardened FPGA', 'inertial measurement unit for launch vehicle').",
        },
        endUse: {
          type: "string",
          enum: ["civil", "dual_use", "military", "unknown"],
          description: "Intended end-use of the item.",
        },
        destinationCountry: {
          type: "string",
          description:
            "ISO-2 destination country (e.g. 'CN', 'IN', 'AE', 'IL'). Critical for sanctions overlap analysis.",
        },
      },
      required: ["item"],
    },
  },
  {
    name: "check_spectrum_filing",
    description:
      "Returns an oriented summary of ITU spectrum-filing requirements for a satellite system. Covers: ITU API/CR/N coordination thresholds, applicable frequency bands (Ku/Ka/X/L/S), national notifying administration, RR Article 9.21 trigger analysis. Use for any frequency / spectrum / coordination question.",
    input_schema: {
      type: "object",
      properties: {
        frequencyBand: {
          type: "string",
          enum: ["L", "S", "C", "X", "Ku", "K", "Ka", "Q", "V", "W"],
          description: "ITU frequency band designation.",
        },
        orbitType: {
          type: "string",
          enum: ["LEO", "MEO", "GEO", "HEO", "L1_L2"],
          description: "Orbital regime.",
        },
        notifyingAdministration: {
          type: "string",
          description:
            "ISO-2 code of the notifying administration that will file with ITU on behalf of the operator (e.g. 'DE' = BNetzA; 'FR' = ARCEP; 'LU' = ILR).",
        },
      },
      required: ["frequencyBand", "orbitType"],
    },
  },
  {
    name: "check_copuos_compliance",
    description:
      "Returns an oriented summary of UN COPUOS / IADC space-debris-mitigation guideline applicability for a given mission. Covers: 25-year disposal rule, passivation, collision-avoidance, registration under 1976 Registration Convention. Use for any debris / sustainability / SSA question.",
    input_schema: {
      type: "object",
      properties: {
        orbitalAltitudeKm: {
          type: "number",
          description:
            "Operational altitude in km above Earth's surface. Triggers different COPUOS protected-region thresholds (LEO ≤2000 km, GEO ±200 km of 35786 km).",
        },
        massKg: {
          type: "number",
          description:
            "Spacecraft dry mass in kg. Influences debris-fragment-count concerns + propulsion-passivation requirements.",
        },
        propulsionType: {
          type: "string",
          enum: ["chemical", "electric", "cold_gas", "none", "unknown"],
          description: "Onboard propulsion system class.",
        },
        controlledReentry: {
          type: "boolean",
          description:
            "True iff the satellite design supports controlled reentry (passivation + de-orbit burn). Critical for COPUOS 25-year rule + casualty-risk assessment.",
        },
      },
      required: ["orbitalAltitudeKm"],
    },
  },
];

/* ── Executor — dispatches to per-tool handlers ──────────────────────── */

const COMPLIANCE_TOOL_NAMES = COMPLIANCE_TOOLS.map((t) => t.name) as string[];

export function isComplianceToolName(name: string): boolean {
  return COMPLIANCE_TOOL_NAMES.includes(name);
}

export async function executeComplianceTool(
  name: string,
  input: unknown,
): Promise<ComplianceToolResult> {
  switch (name) {
    case "assess_eu_space_act":
      return assessEuSpaceAct(input);
    case "classify_nis2":
      return classifyNis2(input);
    case "assess_national_space_law":
      return assessNationalSpaceLaw(input);
    case "assess_uk_space_industry":
      return assessUkSpaceIndustry(input);
    case "assess_us_regulatory":
      return assessUsRegulatory(input);
    case "classify_export_control":
      return classifyExportControl(input);
    case "check_spectrum_filing":
      return checkSpectrumFiling(input);
    case "check_copuos_compliance":
      return checkCopuosCompliance(input);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown compliance tool: ${name}`,
        }),
        isError: true,
      };
  }
}

/* ── Per-tool implementations ────────────────────────────────────────── */
/* Lawyer-oriented research wrappers. Each returns:
     { summary, applicableRegime, keyObligations[], applicableArticles[],
       authorities[], nextSteps[], citations[] }
   Citations use the [ATLAS:source-id] convention so the chat-engine's
   citation extractor picks them up. */

interface SpaceActInput {
  operatorType:
    | "spacecraft_operator"
    | "launch_operator"
    | "ground_segment_operator"
    | "in_orbit_servicing"
    | "space_traffic_coordination"
    | "space_data_provider"
    | "other";
  establishment: "eu" | "third_country_eu_services" | "third_country_no_eu";
  defenceOnly?: boolean;
}

function assessEuSpaceAct(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as SpaceActInput;
  if (!i?.operatorType || !i?.establishment) {
    return {
      content: JSON.stringify({
        error: "operatorType + establishment required",
      }),
      isError: true,
    };
  }

  /* Defence-only exemption (Art. 2(3)). */
  if (i.defenceOnly) {
    return {
      content: JSON.stringify({
        summary:
          "Defence-only operator: out-of-scope per Art. 2(3) EU Space Act. National defence-procurement law applies instead (DE: BMVg, FR: DGA, IT: SEGREDIFESA).",
        applicableRegime: "OUT_OF_SCOPE_DEFENCE",
        applicableArticles: ["EU-SPACE-ACT-Art.2(3)"],
        nextSteps: [
          "Confirm defence-only classification with national MoD authority.",
          "Map applicable national defence-procurement obligations.",
        ],
        citations: [atlasCite("EU-SPACE-ACT-Art.2(3)")],
      }),
      isError: false,
    };
  }

  /* Third-country no-EU-services: out-of-scope. */
  if (i.establishment === "third_country_no_eu") {
    return {
      content: JSON.stringify({
        summary:
          "Third-country operator with NO EU service offering: out-of-scope (territorial-establishment principle, Art. 4 EU Space Act).",
        applicableRegime: "OUT_OF_SCOPE_TERRITORIAL",
        applicableArticles: ["EU-SPACE-ACT-Art.4"],
        nextSteps: [
          "Verify NO EU customers are being served (any EU customer triggers third_country_eu_services regime).",
          "Map national authority of operator's home jurisdiction (e.g. FCC + ITAR if US).",
        ],
        citations: [atlasCite("EU-SPACE-ACT-Art.4")],
      }),
      isError: false,
    };
  }

  /* In-scope path. Map operator type → regime tier. */
  const isLight = i.operatorType === "ground_segment_operator";
  const regime = isLight ? "LIGHT_REGIME" : "STANDARD_REGIME";
  const baseObligations = [
    "Authorization (Art. 8-12)",
    "Registration on EU Space Object Register (Art. 14)",
    "Cybersecurity (Art. 16) + NIS2 cross-reference",
    "Liability + Insurance (Art. 22-26)",
    "Supervision + Reporting (Art. 28-32)",
  ];
  if (i.operatorType === "spacecraft_operator") {
    baseObligations.push("Debris-mitigation conformance (Art. 18-20)");
    baseObligations.push("End-of-life de-orbit (Art. 21)");
  }
  if (i.operatorType === "launch_operator") {
    baseObligations.push("Range-safety (Art. 17)");
    baseObligations.push(
      "Third-party liability (Art. 24, 1972 Liability Convention link)",
    );
  }

  return {
    content: JSON.stringify({
      summary: `In-scope operator under EU Space Act (${i.operatorType}, established in ${i.establishment === "eu" ? "EU" : "non-EU offering EU services"}). ${regime === "LIGHT_REGIME" ? "Light regime applies (ground-segment)." : "Full standard authorisation regime applies."}`,
      applicableRegime: regime,
      keyObligations: baseObligations,
      applicableArticles:
        regime === "LIGHT_REGIME"
          ? ["Art.8", "Art.14", "Art.16", "Art.22"]
          : ["Art.8-12", "Art.14", "Art.16", "Art.18-26", "Art.28-32"],
      authority:
        i.establishment === "eu"
          ? "Member-state competent authority + EUSPA (cross-border coordination)"
          : "EU representative-of-record + member-state of primary EU customer",
      nextSteps: [
        "Identify exact operator activity sub-type (Art. 2 definitions).",
        "Map national-level competent authority (DE: BMWK; FR: CNES/SGDSN; IT: ASI; etc.).",
        "Run NIS2 classification in parallel (mostly auto-essential for spacecraft operators).",
        "Pre-application meeting with national authority recommended.",
      ],
      citations: [
        atlasCite("EU-SPACE-ACT-Art.2"),
        atlasCite("EU-SPACE-ACT-Art.8"),
        regime === "STANDARD_REGIME" && atlasCite("EU-SPACE-ACT-Art.18"),
      ].filter(Boolean),
    }),
    isError: false,
  };
}

interface Nis2Input {
  sector: string;
  sizeClass: "small" | "medium" | "large";
  memberState: string;
  criticalForSocietalFunction?: boolean;
}

function classifyNis2(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as Nis2Input;
  if (!i?.sector || !i?.sizeClass || !i?.memberState) {
    return {
      content: JSON.stringify({
        error: "sector + sizeClass + memberState required",
      }),
      isError: true,
    };
  }

  /* NIS2 Annex I = essential-entity sectors; Annex II = important.
     Space is Annex I point 11; ICT service management is Annex I point 8;
     digital providers (cloud, data-centre) split between Annex I/II based on
     size + criticality. */
  const annexIEssentialSectors = [
    "space",
    "digital_infrastructure",
    "ict_service_management",
  ];
  const annexIImportantSectors = ["managed_service_provider"];
  const dependsOnSize = ["cloud_computing", "data_centre"];

  let classification: "essential" | "important" | "out_of_scope" =
    "out_of_scope";
  let annex: "I" | "II" | "—" = "—";
  let reasoning = "";

  if (annexIEssentialSectors.includes(i.sector)) {
    annex = "I";
    if (i.sizeClass === "large" || i.criticalForSocietalFunction) {
      classification = "essential";
      reasoning =
        "Annex I sector + (large size OR critical-for-societal-function) → Essential entity.";
    } else if (i.sizeClass === "medium") {
      classification = "important";
      reasoning =
        "Annex I sector + medium size + not critical → Important entity.";
    } else {
      classification = "out_of_scope";
      reasoning =
        "Annex I sector + small size + not critical → out-of-scope (size threshold not met).";
    }
  } else if (annexIImportantSectors.includes(i.sector)) {
    annex = "II";
    classification = i.sizeClass === "small" ? "out_of_scope" : "important";
    reasoning =
      i.sizeClass === "small"
        ? "Annex II sector + small size → out-of-scope."
        : "Annex II sector + medium/large size → Important entity.";
  } else if (dependsOnSize.includes(i.sector)) {
    annex = "I";
    classification = i.sizeClass === "large" ? "essential" : "important";
    reasoning =
      i.sizeClass === "large"
        ? "Cloud/data-centre + large size → Essential entity."
        : "Cloud/data-centre + medium size → Important entity.";
  } else {
    reasoning =
      "Sector not listed in NIS2 Annex I or Annex II. Likely out-of-scope.";
  }

  const obligations =
    classification === "out_of_scope"
      ? []
      : [
          "Cybersecurity risk-management (Art. 21) — 10 minimum measures",
          "Incident reporting (Art. 23): early warning ≤24h, notification ≤72h, final report ≤30d",
          "Registration with national CSIRT / competent authority",
          "Management-body accountability (Art. 20) — board liability",
          ...(classification === "essential"
            ? [
                "Proactive supervision (Art. 32) — competent authority audits",
                "Higher fines: up to €10M or 2% global turnover",
              ]
            : [
                "Reactive supervision (Art. 33)",
                "Lower fines: up to €7M or 1.4% global turnover",
              ]),
        ];

  return {
    content: JSON.stringify({
      summary: `Operator classified as ${classification.toUpperCase()} under NIS2. ${reasoning}`,
      classification,
      annex,
      obligations,
      reportingTimeline:
        classification === "out_of_scope"
          ? null
          : {
              earlyWarning: "≤24h",
              notification: "≤72h",
              finalReport: "≤30 days",
              article: "Art. 23 NIS2",
            },
      memberStateTransposition: `${i.memberState} — verify national transposition law (e.g. DE: NIS-2-Umsetzungsgesetz; FR: décret 2024-…; IT: D.Lgs. 138/2024).`,
      nextSteps:
        classification === "out_of_scope"
          ? ["Document the out-of-scope analysis for audit trail."]
          : [
              "Register with the national NIS2 CSIRT.",
              "Conduct a cybersecurity gap-assessment against Art. 21.",
              "Set up the incident-reporting workflow (Art. 23 timelines).",
              "Document board-level approval of cybersecurity policy (Art. 20).",
            ],
      citations: [
        atlasCite("EU-NIS2-Art.3"),
        atlasCite("EU-NIS2-Art.21"),
        atlasCite("EU-NIS2-Art.23"),
        classification === "essential" && atlasCite("EU-NIS2-Art.32"),
      ].filter(Boolean),
    }),
    isError: false,
  };
}

interface NationalSpaceLawInput {
  jurisdiction: string;
  operatorType: string;
  focus?: string;
}

function assessNationalSpaceLaw(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as NationalSpaceLawInput;
  if (!i?.jurisdiction || !i?.operatorType) {
    return {
      content: JSON.stringify({
        error: "jurisdiction + operatorType required",
      }),
      isError: true,
    };
  }

  /* Jurisdictional briefs — compact, matched to Atlas's national-space-law
     dataset. Each entry must have at least: regime, authority, insurance,
     liability, key articles. */
  const briefs: Record<
    string,
    {
      lawName: string;
      authority: string;
      insuranceMin: string;
      liabilityCap: string;
      registration: string;
      keyArticles: string[];
      sourceId: string;
    }
  > = {
    DE: {
      lawName:
        "Weltraumgesetz (entworfen / pending) + Satellitendatensicherheits­gesetz (SatDSiG, in Kraft seit 2007)",
      authority: "BMWK (Lizenzierung), BNetzA (Spektrum), DLR (Registrierung)",
      insuranceMin:
        "Mit dem Entwurf ~€60M; SatDSiG verlangt heute keine Insurance, nur Genehmigung.",
      liabilityCap:
        "Ohne aktuelles WeltraumG: unbegrenzt unter §§ 823 ff. BGB; Entwurf sieht Cap analog FR/IT vor.",
      registration:
        "Pflicht zur Eintragung im DLR-Register (UN-Registrierungs­konvention 1976 i.V.m. SatDSiG).",
      keyArticles: ["§ 1 SatDSiG", "§ 17 LuftVG", "§ 9 TKG"],
      sourceId: "DE-SatDSiG-2007",
    },
    FR: {
      lawName: "Loi sur les Opérations Spatiales (LOS) 2008",
      authority: "DGA + CNES (technical) + SGDSN (security)",
      insuranceMin: "€60M (default); reduzierbar auf antrag",
      liabilityCap:
        "€60M garantierte Staatshaftung; operator-haftung darüber unbegrenzt zur Staatsentlastung",
      registration:
        "CNES als nationale Registrierungs-Behörde unter Art. 12 LOS.",
      keyArticles: ["Art. 1 LOS", "Art. 4 LOS", "Art. 14 LOS"],
      sourceId: "FR-LOS-2008",
    },
    IT: {
      lawName: "Legge italiana sullo spazio (Legge 7/2018)",
      authority: "ASI (Agenzia Spaziale Italiana)",
      insuranceMin: "€50M default",
      liabilityCap:
        "Cap by Decree 2018; tatsächliche Höhe pro Aktivitäts-Typ verhandelbar",
      registration: "ASI als Register-Authority.",
      keyArticles: ["Art. 8 L. 7/2018", "Art. 14 L. 7/2018"],
      sourceId: "IT-LEGGE-7-2018",
    },
    UK: {
      lawName: "Outer Space Act 1986 + Space Industry Act 2018",
      authority: "CAA (Civil Aviation Authority)",
      insuranceMin: "£60M default",
      liabilityCap:
        "Sched 1 SIA-2018: £60M operator-cap, Crown indemnification above",
      registration: "UK Space Agency registry.",
      keyArticles: ["s. 3 OSA-1986", "Sched 1 SIA-2018"],
      sourceId: "UK-OSA-1986",
    },
    NL: {
      lawName: "Wet ruimtevaartactiviteiten (Wbb-Spw) 2007",
      authority: "Agentschap Telecom + Ministerie EZ",
      insuranceMin: "Per-license; oft €60M",
      liabilityCap: "Per-license cap; Crown above",
      registration: "Pflicht.",
      keyArticles: ["Art. 3 Wbb-Spw", "Art. 12 Wbb-Spw"],
      sourceId: "NL-WBB-SPW-2007",
    },
    LU: {
      lawName: "Loi sur les ressources spatiales (2017) + LOS-Bill",
      authority: "Luxembourg Space Agency (LSA)",
      insuranceMin: "€100M (highest in EU)",
      liabilityCap: "Negotiable under LOS-Bill",
      registration: "LSA registry.",
      keyArticles: ["Art. 1 Loi 2017", "Art. 4 Loi 2017"],
      sourceId: "LU-SPACE-RESOURCES-2017",
    },
    ES: {
      lawName: "RD 278/1995 (Registro de Objetos Espaciales)",
      authority: "MINECO + CDTI",
      insuranceMin: "Per-licence",
      liabilityCap: "Per-licence",
      registration: "Pflicht (RD 278/1995).",
      keyArticles: ["Art. 1 RD 278/1995"],
      sourceId: "ES-RD-278-1995",
    },
    BE: {
      lawName: "Wet 2005-09-17 (BE Space Activities Act)",
      authority: "BELSPO",
      insuranceMin: "Per-licence; default €60M",
      liabilityCap: "€60M default",
      registration: "BELSPO Registry.",
      keyArticles: ["Art. 4 BSAA-2005"],
      sourceId: "BE-SPACE-ACT-2005",
    },
  };

  const brief = briefs[i.jurisdiction];
  if (!brief) {
    return {
      content: JSON.stringify({
        summary: `No structured national-space-law brief is loaded for ${i.jurisdiction} yet. Falls back to: search the Atlas corpus directly via search_legal_sources({ jurisdiction: "${i.jurisdiction}" }) and synthesise.`,
        nextSteps: [
          `search_legal_sources(jurisdiction='${i.jurisdiction}', type='national_space_law')`,
        ],
        citations: [],
      }),
      isError: false,
    };
  }

  const focus = i.focus ?? "all";
  return {
    content: JSON.stringify({
      jurisdiction: i.jurisdiction,
      lawName: brief.lawName,
      authority: brief.authority,
      ...(focus === "all" || focus === "liability_insurance"
        ? {
            insuranceMin: brief.insuranceMin,
            liabilityCap: brief.liabilityCap,
          }
        : {}),
      ...(focus === "all" || focus === "registration"
        ? { registration: brief.registration }
        : {}),
      ...(focus === "all" || focus === "authorization"
        ? { keyArticles: brief.keyArticles }
        : {}),
      summary: `${i.jurisdiction} regime applicable to ${i.operatorType} under ${brief.lawName}. Authority: ${brief.authority}. Insurance min: ${brief.insuranceMin}. Liability: ${brief.liabilityCap}.`,
      citations: [atlasCite(brief.sourceId)],
      nextSteps: [
        `Run \`get_legal_source({ id: "${brief.sourceId}" })\` for verbatim wording.`,
        `Run \`compare_jurisdictions_for_filing\` to compare against neighbouring regimes.`,
      ],
    }),
    isError: false,
  };
}

interface UkInput {
  activityType:
    | "launch"
    | "spaceflight_operator"
    | "range_control"
    | "spaceport"
    | "satellite_operation";
  ukEstablished?: boolean;
}

function assessUkSpaceIndustry(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as UkInput;
  if (!i?.activityType) {
    return {
      content: JSON.stringify({ error: "activityType required" }),
      isError: true,
    };
  }
  const tracks: Record<
    UkInput["activityType"],
    { licence: string; insurance: string; key: string[] }
  > = {
    launch: {
      licence: "Launch Operator Licence (CAA, ss. 1+2 SIA-2018)",
      insurance: "£60M (default); negotiable per mission profile",
      key: ["s. 3 OSA-1986", "ss. 1-2 SIA-2018", "Sched 1 SIA-2018"],
    },
    spaceflight_operator: {
      licence: "Spaceflight Operator Licence (CAA)",
      insurance: "Variable per operation; min £60M typical",
      key: ["s. 3 OSA-1986", "ss. 1-2 SIA-2018"],
    },
    range_control: {
      licence: "Range Control Licence (CAA)",
      insurance: "Lower than launch; per-MoU with launch operators",
      key: ["s. 3 SIA-2018"],
    },
    spaceport: {
      licence: "Spaceport Licence (CAA)",
      insurance: "Per facility-risk-assessment",
      key: ["s. 4 SIA-2018"],
    },
    satellite_operation: {
      licence: "OSA-1986 Authorization (lighter than SIA-2018)",
      insurance: "Per OSA Sched 1 — lower than SIA",
      key: ["s. 3 OSA-1986", "Sched 1 OSA-1986"],
    },
  };
  const t = tracks[i.activityType];
  return {
    content: JSON.stringify({
      summary: `UK ${i.activityType} requires ${t.licence}. ${i.ukEstablished === false ? "Non-UK operator: still requires CAA authorisation if activity touches UK soil/airspace/satellite-services-into-UK." : "UK-established operator path."}`,
      licence: t.licence,
      insurance: t.insurance,
      authority: "CAA + UK Space Agency (joint-jurisdiction in some areas)",
      keyArticles: t.key,
      crownIndemnification:
        "Crown indemnification above the operator-cap (Sched 1 SIA-2018).",
      nextSteps: [
        "Pre-application meeting with CAA Spaceflight team.",
        "Engage Reuschlaw / Bird&Bird / specialist UK counsel for application.",
      ],
      citations: t.key.map((k) => atlasCite(`UK-${k.replace(/[\s.()]/g, "")}`)),
    }),
    isError: false,
  };
}

interface UsInput {
  activityType:
    | "satellite_communications"
    | "remote_sensing"
    | "launch"
    | "reentry"
    | "human_spaceflight"
    | "manufacturing"
    | "ground_station";
  usEstablished?: boolean;
}

function assessUsRegulatory(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as UsInput;
  if (!i?.activityType) {
    return {
      content: JSON.stringify({ error: "activityType required" }),
      isError: true,
    };
  }
  const map: Record<
    UsInput["activityType"],
    { agency: string; licence: string; key: string[] }
  > = {
    satellite_communications: {
      agency: "FCC (Federal Communications Commission)",
      licence: "FCC Part 25 Earth Station / Space Station authorisation",
      key: ["47 CFR Part 25", "47 CFR Part 5"],
    },
    remote_sensing: {
      agency: "NOAA Commercial Remote Sensing Regulatory Affairs (CRSRA)",
      licence: "NOAA Tier 1/2/3 licence (15 CFR Part 960)",
      key: ["15 CFR Part 960", "Land Remote Sensing Policy Act of 1992"],
    },
    launch: {
      agency: "FAA Office of Commercial Space Transportation (AST)",
      licence: "Launch Vehicle Operator Licence (14 CFR Part 415/417/450)",
      key: ["14 CFR Part 450", "51 USC § 50901"],
    },
    reentry: {
      agency: "FAA AST",
      licence: "Re-entry Licence (14 CFR Part 435)",
      key: ["14 CFR Part 435"],
    },
    human_spaceflight: {
      agency: "FAA AST + OSHA (workplace)",
      licence: "Crewed-spaceflight informed-consent regime",
      key: ["14 CFR Part 460", "51 USC § 50905"],
    },
    manufacturing: {
      agency: "Commerce (BIS) for export, FAA for safety",
      licence: "EAR/ITAR classification + BIS export licences",
      key: ["EAR Part 740", "ITAR Part 121"],
    },
    ground_station: {
      agency: "FCC",
      licence: "FCC Part 25 Earth Station licence",
      key: ["47 CFR Part 25"],
    },
  };
  const m = map[i.activityType];
  return {
    content: JSON.stringify({
      summary: `US ${i.activityType} primary authority: ${m.agency}. Required: ${m.licence}.`,
      agency: m.agency,
      licence: m.licence,
      keyArticles: m.key,
      itarOverlay:
        "ITAR (22 CFR 120-130) overlays for any defense-article technical data — almost always relevant for satellite payloads.",
      earOverlay: "EAR (15 CFR 730-774) for dual-use commercial items.",
      sanctions:
        "OFAC Specially Designated Nationals (SDN) list applies regardless of agency licence path.",
      nextSteps: [
        i.usEstablished === false
          ? "Engage US-licensed counsel (Hogan Lovells DC, Pillsbury, etc.); non-US operators still trigger ITAR via 'deemed-export' rules."
          : "Run classify_export_control() in parallel.",
        "Pre-application meeting with the lead agency.",
      ],
      citations: m.key.map((k) => atlasCite(`US-${k.replace(/[\s/.]/g, "-")}`)),
    }),
    isError: false,
  };
}

interface ExportControlInput {
  item: string;
  endUse?: "civil" | "dual_use" | "military" | "unknown";
  destinationCountry?: string;
}

function classifyExportControl(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as ExportControlInput;
  if (!i?.item) {
    return {
      content: JSON.stringify({ error: "item required" }),
      isError: true,
    };
  }
  /* Heuristic classification — best-effort. Real classification needs
     deep-dive on the specific item against USML / CCL / Annex I lists. */
  const item = i.item.toLowerCase();
  const isMilitarySpaceItem =
    /space-?qualified|rad-?hardened|inertial measurement|imu|guidance|missile|reentry/i.test(
      item,
    );
  const isPureCivil = i.endUse === "civil";

  const itarLikely = isMilitarySpaceItem || i.endUse === "military";
  const earLikely = !itarLikely;

  return {
    content: JSON.stringify({
      summary: `${i.item} likely classified under: ${itarLikely ? "ITAR (USML Cat. XV — Spacecraft Systems & Associated Equipment)" : "EAR (CCL Cat. 9 — Aerospace & Propulsion)"}. ${i.destinationCountry ? `Destination ${i.destinationCountry}: check OFAC sanctions + EU dual-use Regulation 2021/821 Annex IV embargo list.` : ""}`,
      itarLikely,
      earLikely,
      euDualUseRegulation:
        "EU 2021/821 — Annex I categories 9A001-9E991 cover spacecraft + propulsion + materials.",
      usmlCategoryHints: itarLikely ? ["XV", "IV", "VIII"] : [],
      cclCategoryHints: earLikely ? ["9A", "9B", "9D", "9E"] : [],
      sanctionsCheck:
        i.destinationCountry &&
        ["RU", "BY", "KP", "IR", "SY", "VE"].includes(i.destinationCountry)
          ? `Destination ${i.destinationCountry}: comprehensive EU/US sanctions program — virtually all space items prohibited.`
          : "Run sanctions screening (OFAC SDN + EU Consolidated List + UK OFSI).",
      nextSteps: [
        `Definitive classification requires technical drawings + commercial specs. Engage classification counsel (Steptoe / Sheppard Mullin / Reuschlaw).`,
        `If ITAR-likely: file Commodity Jurisdiction (CJ) request with DDTC.`,
        `If EAR: run BIS Commerce Control List (CCL) ECCN determination.`,
        `Always: deemed-export analysis for any non-US-person engineers.`,
      ],
      citations: [
        atlasCite("US-ITAR-USML-Cat-XV"),
        atlasCite("US-EAR-CCL-Cat-9"),
        atlasCite("EU-DUAL-USE-2021-821-Annex-I"),
      ],
    }),
    isError: false,
  };
}

interface SpectrumInput {
  frequencyBand: "L" | "S" | "C" | "X" | "Ku" | "K" | "Ka" | "Q" | "V" | "W";
  orbitType: "LEO" | "MEO" | "GEO" | "HEO" | "L1_L2";
  notifyingAdministration?: string;
}

function checkSpectrumFiling(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as SpectrumInput;
  if (!i?.frequencyBand || !i?.orbitType) {
    return {
      content: JSON.stringify({
        error: "frequencyBand + orbitType required",
      }),
      isError: true,
    };
  }
  const bandHzMap: Record<SpectrumInput["frequencyBand"], string> = {
    L: "1-2 GHz",
    S: "2-4 GHz",
    C: "4-8 GHz",
    X: "8-12 GHz",
    Ku: "12-18 GHz",
    K: "18-27 GHz",
    Ka: "27-40 GHz",
    Q: "33-50 GHz",
    V: "40-75 GHz",
    W: "75-110 GHz",
  };
  /* Coordination triggers per ITU RR Article 9. GEO satellites in
     coordination-required bands trigger CR; NGSO usually file via API
     plus N-notice. Real coordination depth depends on the band's
     allocation table. */
  const isGeoBand = i.orbitType === "GEO";
  const coordinationProcess = isGeoBand
    ? "Coordination Request (CR) — Art. 9.7 process; can take 18-36 months"
    : "Advance Publication of Information (API) → N-notice (NGSO simplified path)";

  const auths: Record<string, string> = {
    DE: "Bundesnetzagentur (BNetzA)",
    FR: "ARCEP + ANFR (frequency-spectrum office)",
    IT: "AGCOM + MISE",
    UK: "Ofcom",
    NL: "Agentschap Telecom",
    LU: "ILR (Institut Luxembourgeois de Régulation)",
    ES: "Ministerio para la Transformación Digital",
    BE: "BIPT",
  };

  return {
    content: JSON.stringify({
      summary: `${i.frequencyBand}-band (${bandHzMap[i.frequencyBand]}) ${i.orbitType} system: ${coordinationProcess} required via ITU.`,
      bandRange: bandHzMap[i.frequencyBand],
      coordinationProcess,
      itArticles: ["RR Art. 9.21", "RR Art. 11", "RR Appendix 4"],
      notifyingAdministration: i.notifyingAdministration
        ? auths[i.notifyingAdministration] ||
          `${i.notifyingAdministration} (specific authority TBD)`
        : "TBD per operator's chosen flag-state",
      typicalTimeline: isGeoBand
        ? "12-36 months from CR to bringing-into-use (BIU)"
        : "6-12 months from API to NGSO N-notice acceptance",
      nextSteps: [
        "Generate the SRS database submission via ITU's eSubmission tool.",
        "Engage spectrum counsel + technical coordination consultant.",
        "Identify potentially-affected administrations early (especially neighbouring orbital slots for GEO).",
      ],
      citations: [
        atlasCite("ITU-RR-Art-9"),
        atlasCite("ITU-RR-Art-11"),
        atlasCite("ITU-RR-Appendix-4"),
      ],
    }),
    isError: false,
  };
}

interface CopuosInput {
  orbitalAltitudeKm: number;
  massKg?: number;
  propulsionType?: "chemical" | "electric" | "cold_gas" | "none" | "unknown";
  controlledReentry?: boolean;
}

function checkCopuosCompliance(rawInput: unknown): ComplianceToolResult {
  const i = rawInput as CopuosInput;
  if (!i?.orbitalAltitudeKm) {
    return {
      content: JSON.stringify({ error: "orbitalAltitudeKm required" }),
      isError: true,
    };
  }
  const inLeoProtected = i.orbitalAltitudeKm <= 2000;
  const inGeoProtected =
    i.orbitalAltitudeKm >= 35586 && i.orbitalAltitudeKm <= 35986;

  const region = inLeoProtected
    ? "LEO Protected Region (≤2000 km)"
    : inGeoProtected
      ? "GEO Protected Region (35586-35986 km)"
      : "Outside protected regions";

  const obligations: string[] = [];
  if (inLeoProtected) {
    obligations.push(
      "25-year disposal rule (IADC 5.3.1) — natural decay or active de-orbit within 25 years post-mission",
    );
    if (i.propulsionType === "none" || i.propulsionType === "cold_gas") {
      obligations.push(
        "WARNING: passive de-orbit at this altitude likely violates 25-year rule. Need controlled re-entry or higher-thrust propulsion.",
      );
    }
  }
  if (inGeoProtected) {
    obligations.push(
      "GEO graveyard orbit (IADC 5.3.2) — re-orbit ≥235 km above GEO ring at end-of-life",
    );
  }
  if (!i.controlledReentry && i.massKg && i.massKg > 100) {
    obligations.push(
      "Casualty-risk assessment (NASA-STD-8719.14 < 1:10,000 standard) — uncontrolled re-entry of ≥100 kg satellite",
    );
  }
  obligations.push(
    "Passivation at end-of-life (battery + propulsion residual energy)",
  );
  obligations.push(
    "UN Registration Convention 1976 — register satellite with national registry within 60 days of launch",
  );

  return {
    content: JSON.stringify({
      summary: `Mission at ${i.orbitalAltitudeKm} km altitude: ${region}. ${obligations.length > 1 ? `${obligations.length} COPUOS/IADC obligations identified.` : ""}`,
      region,
      obligations,
      iadcGuideline: "IADC-02-01 Rev. 3 (2020)",
      copuosLtsGuidelines:
        "UN COPUOS Long-Term Sustainability of Outer Space Activities (LTS) Guidelines (2018)",
      nextSteps: [
        "Document the post-mission disposal plan in operator's safety case.",
        "Verify propulsion budget supports controlled-disposal manoeuvre.",
        "Set up SSA/conjunction-warning subscription (LeoLabs, Slingshot, or 18 SDS) — needed for collision-avoidance under IADC 5.5.",
      ],
      citations: [
        atlasCite("INT-IADC-MITIGATION-2020"),
        atlasCite("INT-COPUOS-LTS-2018"),
        atlasCite("INT-UN-REG-CONV-1976"),
      ],
    }),
    isError: false,
  };
}
