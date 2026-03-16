/**
 * NCA (National Competent Authority) Profiles
 *
 * Static profiles defining how each NCA evaluates submissions.
 * Used by NCA-Targeting to optimize document generation for the target authority.
 */

import type { NCADocumentType } from "@/lib/generate/types";

// ─── Types ───

export type DocumentCategory =
  | "debris"
  | "cybersecurity"
  | "general"
  | "safety";

export interface NCAProfile {
  id: string;
  name: string;
  country: string;
  language: string;
  executiveSummaryLanguage: string;
  rigor: Record<DocumentCategory, 1 | 2 | 3 | 4 | 5>;
  focusAreas: FocusArea[];
  preferredStandards: string[];
  preferredEvidence: PreferredEvidence[];
  documentGuidance: Partial<Record<NCADocumentType, NCADocumentGuidance>>;
}

export interface FocusArea {
  articleRange: string;
  weight: "critical" | "high" | "normal";
  description: string;
}

export interface PreferredEvidence {
  type: string;
  description: string;
  acceptedAsShortcut: boolean;
}

export interface NCADocumentGuidance {
  depthExpectation: "standard" | "detailed" | "extensive";
  specificRequirements: string[];
  commonRejectionReasons: string[];
}

// ─── Profiles ───

export const NCA_PROFILES: NCAProfile[] = [
  {
    id: "cnes",
    name: "CNES (France)",
    country: "FR",
    language: "fr",
    executiveSummaryLanguage: "fr",
    // Cybersecurity raised to 4: CNES published a dedicated "Guide d'Hygiène Cybersécurité
    // des Systèmes Orbitaux" (2025) with ANSSI/EBIOS RM requirements beyond NIS2.
    rigor: { debris: 5, cybersecurity: 4, general: 5, safety: 5 },
    focusAreas: [
      // ── Debris / LOS RT ──
      {
        articleRange: "RT Art. 35-48",
        weight: "critical",
        description:
          "French LOS Réglementation Technique (RT) articles 35-48 govern orbital mastery. " +
          "CNES evaluates compliance against the RT, not just the EU Space Act. " +
          "The 'Notice Générale de Conformité Technique' is the mandatory master document.",
      },
      {
        articleRange: "Art. 64-66 / RT Art. 40",
        weight: "critical",
        description:
          "Quantitative conjunction assessment with explicit Pc thresholds. " +
          "CNES expects reference to CAESAR service (CNES/ESA conjunction analysis) " +
          "and documented collision avoidance maneuver criteria.",
      },
      {
        articleRange: "Art. 72 / RT Art. 43-44",
        weight: "critical",
        description:
          "Orbital lifetime analysis MUST use CNES STELA tool with mean, +2σ, and -2σ solar scenarios. " +
          "Generic parametric estimates are not accepted. Show altitude vs. time plots for full 25-year period. " +
          "Reference GBP SO-NG v3.0 Chapter 4 for methodology.",
      },
      {
        articleRange: "Art. 67(1)(d) / RT Art. 42",
        weight: "critical",
        description:
          "Passivation sequence must cover ALL stored energy sources: batteries (discharge to safe level), " +
          "propellant tanks (depletion or venting), pressure vessels (depressurization), reaction wheels (spin-down). " +
          "CNES GBP v3.0 Section 3.3 defines the expected passivation analysis.",
      },
      {
        articleRange: "RT Art. 45-46",
        weight: "critical",
        description:
          "Re-entry casualty risk must use CNES DEBRISK tool for demise analysis and ELECTRA tool " +
          "for ground casualty estimation. 1:10,000 threshold per Art. 72(4). " +
          "GBP v3.0 Chapter 5 provides the complete methodology.",
      },
      {
        articleRange: "RT Art. 47-48",
        weight: "high",
        description:
          "Environmental impact assessment per LOS. CNES expects reference to INERIS methodology " +
          "for terrestrial environmental impact (propellant toxicity, debris contamination). " +
          "GBP v3.0 Chapter 6 covers environmental requirements.",
      },
      // ── Cybersecurity ──
      {
        articleRange: "Art. 74-95",
        weight: "high",
        description:
          "CNES published 'Guide d'Hygiène Cybersécurité des Systèmes Orbitaux' (2025) " +
          "with space-specific cybersecurity requirements. Must reference ANSSI guidelines, " +
          "EBIOS RM risk methodology, and CCSDS 350.1-G-3 space security threat taxonomy. " +
          "PCA (Plan de Continuité d'Activité) and PRA (Plan de Reprise d'Activité) are mandatory.",
      },
    ],
    preferredStandards: [
      // French national framework
      "Loi n° 2008-518 (LOS — Loi relative aux Opérations Spatiales)",
      "RT 2024 (Réglementation Technique, Arrêté du 31 mars 2011 modifié le 28 juin 2024)",
      "GBP SO-NG v3.0 (Guide des Bonnes Pratiques LOS pour les Systèmes Orbitaux, CNES 2025)",
      "Guide d'Hygiène Cybersécurité des Systèmes Orbitaux (CNES DCS-2024.0004634)",
      // International standards
      "ISO 24113:2019 (Space debris mitigation requirements)",
      "IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)",
      "ECSS-U-AS-10C (Space sustainability)",
      // Cybersecurity
      "ANSSI Guidelines (Agence Nationale de la Sécurité des Systèmes d'Information)",
      "EBIOS RM (Expression des Besoins et Identification des Objectifs de Sécurité — Risk Manager)",
      "CCSDS 350.1-G-3 (Security threats against space missions)",
    ],
    preferredEvidence: [
      {
        type: "STELA_REPORT",
        description:
          "CNES STELA tool output — orbital lifetime propagation with mean/±2σ solar scenarios. " +
          "Mandatory for LEO missions. Ref: GBP v3.0 DR5.",
        acceptedAsShortcut: false,
      },
      {
        type: "DEBRISK_REPORT",
        description:
          "CNES DEBRISK tool output — spacecraft demise/survivability analysis during re-entry. " +
          "Required for casualty risk assessment. Ref: GBP v3.0 DR3.",
        acceptedAsShortcut: false,
      },
      {
        type: "ELECTRA_REPORT",
        description:
          "CNES ELECTRA tool output — ground casualty risk estimation from surviving debris. " +
          "Required for Art. 72(4) compliance. Ref: GBP v3.0 DR4.",
        acceptedAsShortcut: false,
      },
      {
        type: "DRAMA_OUTPUT",
        description:
          "ESA DRAMA suite output (alternative to DEBRISK for demise analysis)",
        acceptedAsShortcut: false,
      },
      {
        type: "NOTICE_GENERALE",
        description:
          "Notice Générale de Conformité Technique — master compliance document per Art. 13 of Arrêté du 23 février 2022. " +
          "CNES provides a template; all technical documents are annexes to this notice.",
        acceptedAsShortcut: false,
      },
      {
        type: "MATRICE_CONFORMITE",
        description:
          "Matrice de Conformité RT 2024 — compliance matrix with columns: Article | Exigence | C/NC/PC/NA | Paragraphe | Commentaire. " +
          "CNES provides official template. Must map to RT articles, not just EU Space Act.",
        acceptedAsShortcut: false,
      },
      {
        type: "FAIT_TECHNIQUE",
        description:
          "Déclaration de Fait Technique — incident report template per RT Art. 36 / Décret Art. 7. " +
          "Must include: impact on mission, passivation capability, maneuverability, debris risk, RdS capacity.",
        acceptedAsShortcut: false,
      },
    ],
    documentGuidance: {
      DMP: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Include French-language executive summary (résumé exécutif en français)",
          "Reference the LOS (Loi n° 2008-518) and RT 2024 alongside the EU Space Act throughout",
          "Structure must follow GBP SO-NG v3.0 Chapter 3 (Limiter la génération de débris en orbite)",
          "CNES expects STELA tool output for orbital lifetime — generic parametric estimates are NOT accepted",
          "Quantify collision probability thresholds (Pc) explicitly, reference CAESAR/EU SST service",
          "Passivation analysis must cover ALL energy sources per GBP v3.0 Section 3.3: batteries, propellant, pressure vessels, reaction wheels",
          "Reference IADC Guidelines Rev.2 (IADC-02-01, 2020) Section 5 for debris mitigation measures",
          "Include a 'Matrice de Conformité' mapping to RT articles 35-48, not just EU Space Act articles",
          "Fait Technique (incident reporting) obligations per RT Art. 36 must be described",
        ],
        commonRejectionReasons: [
          "Insufficient orbital lifetime analysis — STELA output missing or only parametric estimate (34%)",
          "Missing FMECA reference for fragmentation/break-up prevention (22%)",
          "Passivation detail insufficient — not all energy sources covered (18%)",
          "No reference to French LOS/RT alongside EU Space Act (12%)",
          "Compliance matrix not mapped to RT articles (8%)",
        ],
      },
      ORBITAL_LIFETIME: {
        depthExpectation: "extensive",
        specificRequirements: [
          "MUST use CNES STELA tool (Semi-analytic Tool for End of Life Analysis) — ref GBP v3.0 DR5",
          "Include STELA propagation curves for mean, +2σ, and -2σ solar activity scenarios",
          "Show altitude vs. time plots for the full 25-year post-mission period",
          "Include drag coefficient (Cd) sensitivity analysis — CNES expects ±20% variation study",
          "Reference RT Art. 43-44 for orbital lifetime and disposal requirements",
          "For constellations: individual satellite analysis + fleet-level statistical assessment",
          "Include atmospheric density model used (e.g., NRLMSISE-00, JB2008) and justify choice",
          "GBP v3.0 Chapter 4 defines the complete CNES methodology for lifetime analysis",
        ],
        commonRejectionReasons: [
          "No STELA validation — only generic/parametric estimate provided",
          "Missing solar cycle sensitivity (must show mean, +2σ, -2σ scenarios)",
          "No drag coefficient sensitivity analysis",
          "Atmospheric density model not specified or justified",
        ],
      },
      EOL_DISPOSAL: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Reference RT Art. 43-44 for disposal requirements alongside EU Space Act Art. 72",
          "Use STELA to demonstrate post-disposal orbital lifetime compliance",
          "Include probability of success (PdR) analysis per GBP v3.0 DR6 methodology",
          "Delta-V budget must include margin (CNES expects ≥10% margin documented)",
          "For controlled re-entry: use DEBRISK for demise analysis, ELECTRA for casualty risk",
          "Contingency procedures for failed disposal must be described in detail",
          "GBP v3.0 Section 4.4 covers end-of-life disposal best practices",
        ],
        commonRejectionReasons: [
          "No probability of success analysis for disposal maneuver",
          "Insufficient fuel margin documentation",
          "Missing DEBRISK/ELECTRA output for controlled re-entry cases",
        ],
      },
      PASSIVATION: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Must cover ALL stored energy sources per RT Art. 42 and GBP v3.0 Section 3.3",
          "Battery passivation: discharge sequence, target DoD, CID/UVD behavior, thermal considerations",
          "Propulsion passivation: propellant depletion burns, tank venting procedures, pressure vessel depressurization",
          "Reaction wheel passivation: spin-down procedure and timeline",
          "Pressurant gas: controlled venting procedure for all pressure vessels",
          "Include timeline showing passivation sequence relative to end-of-life disposal maneuver",
          "Failure mode analysis: what happens if passivation commands fail? Autonomous passivation capability?",
        ],
        commonRejectionReasons: [
          "Not all energy sources addressed (e.g., missing pressure vessel or reaction wheel passivation)",
          "No failure mode analysis for passivation sequence",
          "Timeline unclear relative to disposal maneuver",
        ],
      },
      REENTRY_RISK: {
        depthExpectation: "extensive",
        specificRequirements: [
          "MUST use CNES DEBRISK tool for demise/survivability analysis — ref GBP v3.0 DR3",
          "MUST use CNES ELECTRA tool for ground casualty risk estimation — ref GBP v3.0 DR4",
          "Casualty risk threshold: < 1:10,000 per re-entry event (RT Art. 45-46, EU Space Act Art. 72(4))",
          "Include Declared Material List (DML) for DEBRISK input",
          "For controlled re-entry: define SPOUA (South Pacific Ocean Uninhabited Area) targeting",
          "Include NOTAM/AVURNAV notification procedures for re-entry corridor",
          "GBP v3.0 Chapter 5 defines the complete re-entry risk methodology",
        ],
        commonRejectionReasons: [
          "No DEBRISK analysis — only generic demise estimates",
          "No ELECTRA output for casualty risk quantification",
          "DML incomplete — not all components/materials listed",
        ],
      },
      COLLISION_AVOIDANCE: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference RT Art. 40 alongside EU Space Act Art. 64",
          "Describe use of CAESAR (CNES/ESA) or EU SST conjunction assessment services",
          "Define explicit Pc (probability of collision) thresholds for maneuver decisions",
          "For constellations: describe inter-satellite coordination and fleet-level CA management",
          "Include communication protocols with CSpOC/18th SDS and EU SST",
          "GBP v3.0 Section 3.4 covers collision avoidance best practices",
        ],
        commonRejectionReasons: [
          "No explicit Pc threshold defined for maneuver decisions",
          "Missing reference to CAESAR or EU SST services",
        ],
      },
      CYBER_POLICY: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference CNES 'Guide d'Hygiène Cybersécurité des Systèmes Orbitaux' (2025, ref DCS-2024.0004634)",
          "Use EBIOS RM (Expression des Besoins et Identification des Objectifs de Sécurité) as risk methodology",
          "Reference ANSSI (Agence Nationale de la Sécurité des Systèmes d'Information) guidelines",
          "Include PSSI (Politique de Sécurité des Systèmes d'Information) aligned with ANSSI framework",
          "PCA (Plan de Continuité d'Activité) and PRA (Plan de Reprise d'Activité) are mandatory per CNES guide",
          "Address both IT (Information Technology) and OT (Operational Technology) segments",
          "Reference CCSDS 350.1-G-3 for space-specific threat taxonomy",
          "Include ISP (Instruction de Sécurité Programme) for classified/sensitive operations",
        ],
        commonRejectionReasons: [
          "No reference to CNES cybersecurity guide or ANSSI framework",
          "EBIOS RM methodology not used for risk assessment",
          "OT/space segment cybersecurity not adequately addressed",
        ],
      },
      CYBER_RISK_ASSESSMENT: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Use EBIOS RM methodology as primary risk assessment framework — CNES cybersecurity guide mandates this",
          "Include space-specific threat scenarios from CCSDS 350.1-G-3 taxonomy",
          "Address TT&C (telecommand/telemetry) link security: TRANSEC, command authentication, encryption",
          "Assess supply chain risks per CNES guide: COTS components, SBOM (Software Bill of Materials)",
          "Include PQC (Post-Quantum Cryptography) considerations for long-duration missions",
          "Reference ITAR/EAR export control implications for encryption technology",
        ],
        commonRejectionReasons: [
          "Risk methodology not aligned with EBIOS RM",
          "TT&C link security not adequately assessed",
          "Supply chain cyber risks not covered",
        ],
      },
      INCIDENT_RESPONSE: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Must align with CNES 'Déclaration de Fait Technique' process (RT Art. 36, Décret Art. 7)",
          "Fait Technique declaration template: impact on mission, passivation capability, maneuverability, debris risk, RdS capacity",
          "Incident notification to Bureau LOS du CNES 'sans délai' (without delay) for any fact affecting authorized operations",
          "Include CSIRT/CERT coordination procedures",
          "Reference 24h/72h/1 month notification timelines per EU Space Act Art. 90-92",
          "Define interface with ANSSI for significant cyber incidents",
        ],
        commonRejectionReasons: [
          "Fait Technique process not described",
          "Bureau LOS notification procedure missing",
          "No interface with ANSSI defined",
        ],
      },
      AUTHORIZATION_APPLICATION: {
        depthExpectation: "extensive",
        specificRequirements: [
          "For CNES submission: structure must follow the 'Notice Générale de Conformité Technique' format",
          "Reference Arrêté du 23 février 2022 modifié (composition du dossier) Art. 12-17",
          "Include a complete Matrice de Conformité mapped to RT 2024 articles (not just EU Space Act)",
          "Matrix columns: Article | Objet de l'exigence | C/NC/PC/NA | Paragraphe du dossier | Commentaire",
          "All technical documents are annexes to the Notice Générale — provide document index table",
          "Include état des recommandations if preliminary compliance attestation is provided",
          "Documents must be conserved until end of space operation per LOS requirements",
          "Fait Technique and organizational change reporting obligations must be described (RT Art. 36)",
        ],
        commonRejectionReasons: [
          "Notice Générale format not followed — CNES expects specific template structure",
          "Matrice de Conformité missing or not mapped to RT articles",
          "Document index incomplete — not all annexes listed",
          "Fait Technique obligations not described",
        ],
      },
      ENVIRONMENTAL_FOOTPRINT: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference RT Art. 47-48 for environmental requirements alongside EU Space Act Art. 44-46",
          "CNES expects INERIS methodology for terrestrial environmental impact assessment",
          "Include propellant toxicity analysis (VTR — Valeurs Toxicologiques de Référence) for re-entry debris",
          "PNEC (Predicted No Effect Concentration) analysis for aquatic/soil contamination",
          "GBP v3.0 Chapter 6 covers environmental impact methodology",
        ],
        commonRejectionReasons: [
          "No INERIS methodology referenced",
          "Propellant toxicity not assessed",
        ],
      },
      INSURANCE_COMPLIANCE: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference French LOS liability regime (operator strict liability per LOS Art. 6)",
          "Include Liability Convention 1972 obligations specific to France as launching state",
          "CNES expects quantified TPL exposure analysis based on mission parameters",
          "Insurance coverage must be demonstrated before authorization (LOS requirement)",
        ],
        commonRejectionReasons: [
          "French-specific liability regime not referenced",
          "TPL exposure not quantified",
        ],
      },
    },
  },
  {
    id: "bnetza",
    name: "BNetzA (Germany)",
    country: "DE",
    language: "de",
    executiveSummaryLanguage: "de",
    rigor: { debris: 3, cybersecurity: 5, general: 4, safety: 3 },
    focusAreas: [
      {
        articleRange: "Art. 74-95",
        weight: "critical",
        description:
          "Full NIS2 mapping required — BNetzA enforces NIS2 strictly for space operators",
      },
      {
        articleRange: "Art. 85",
        weight: "high",
        description:
          "BCP must include tested recovery procedures with documented RTO/RPO",
      },
    ],
    preferredStandards: [
      "ISO/IEC 27001:2022",
      "BSI IT-Grundschutz",
      "NIS2 Directive",
    ],
    preferredEvidence: [
      {
        type: "ISO27001_CERT",
        description: "ISO 27001 certificate",
        acceptedAsShortcut: true,
      },
      {
        type: "BSI_GRUNDSCHUTZ",
        description: "BSI IT-Grundschutz certification",
        acceptedAsShortcut: true,
      },
    ],
    documentGuidance: {
      CYBER_POLICY: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Map every requirement to NIS2 Article as well as EU Space Act",
          "Reference Weltraumgesetz alongside EU Space Act",
          "ISO 27001 certificate can substitute for detailed policy sections — reference it explicitly",
          "German technical terminology preferred in cybersecurity sections",
        ],
        commonRejectionReasons: [
          "NIS2 mapping incomplete (41%)",
          "Missing BCP test evidence (26%)",
          "Access control policy too generic (15%)",
        ],
      },
    },
  },
  {
    id: "uksa",
    name: "UKSA (United Kingdom)",
    country: "GB",
    language: "en",
    executiveSummaryLanguage: "en",
    rigor: { debris: 4, cybersecurity: 4, general: 3, safety: 4 },
    focusAreas: [
      {
        articleRange: "Art. 72(4)",
        weight: "critical",
        description:
          "Casualty risk must be quantified with 1:10,000 threshold explicitly stated",
      },
    ],
    preferredStandards: [
      "UK Space Industry Act 2018",
      "Outer Space Act 1986",
      "ISO 24113:2019",
    ],
    preferredEvidence: [
      {
        type: "NASA_DAS",
        description: "NASA DAS casualty risk output",
        acceptedAsShortcut: false,
      },
    ],
    documentGuidance: {
      REENTRY_RISK: {
        depthExpectation: "extensive",
        specificRequirements: [
          "UKSA expects NASA DAS tool output for casualty risk quantification",
          "Must explicitly state 1:10,000 threshold and whether it is met",
          "Risk-based approach — quantify probabilities, don't just describe procedures",
        ],
        commonRejectionReasons: [
          "Casualty risk not quantified (just qualitative description)",
          "No DAS or equivalent tool output referenced",
        ],
      },
    },
  },
  {
    id: "belspo",
    name: "BELSPO (Belgium)",
    country: "BE",
    language: "fr",
    executiveSummaryLanguage: "fr",
    rigor: { debris: 3, cybersecurity: 3, general: 4, safety: 3 },
    focusAreas: [
      {
        articleRange: "Art. 47-50",
        weight: "high",
        description:
          "Strong focus on insurance and liability — Belgian Space Law 2005 baseline",
      },
    ],
    preferredStandards: [
      "Belgian Law on Activities in Outer Space (2005)",
      "Liability Convention 1972",
    ],
    preferredEvidence: [],
    documentGuidance: {},
  },
  {
    id: "nso",
    name: "NSO (Netherlands)",
    country: "NL",
    language: "en",
    executiveSummaryLanguage: "en",
    rigor: { debris: 3, cybersecurity: 3, general: 3, safety: 3 },
    focusAreas: [
      {
        articleRange: "Art. 47-50",
        weight: "high",
        description:
          "Detailed financial risk analysis and insurance coverage assessment expected",
      },
    ],
    preferredStandards: ["Dutch Space Activities Act"],
    preferredEvidence: [],
    documentGuidance: {},
  },
];

// ─── Lookup ───

export const NCA_PROFILE_MAP: Record<string, NCAProfile> = Object.fromEntries(
  NCA_PROFILES.map((p) => [p.id, p]),
);

export function getNCAProfile(id: string): NCAProfile | null {
  return NCA_PROFILE_MAP[id] || null;
}
