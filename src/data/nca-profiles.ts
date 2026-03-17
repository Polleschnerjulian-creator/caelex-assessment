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
    // Debris raised to 4: WRG Eckpunkte (Sept 2024) have explicit debris/sustainability
    // requirements including mandatory EOL planning, collision avoidance, and SSA data sharing.
    // Cybersecurity at 5: NIS2UmsuCG + BSI-TR-03184 space-specific requirements are the
    // most prescriptive in Europe alongside CNES.
    rigor: { debris: 4, cybersecurity: 5, general: 4, safety: 3 },
    focusAreas: [
      // ── Cybersecurity / NIS2 ──
      {
        articleRange: "Art. 74-95",
        weight: "critical",
        description:
          "Full NIS2 mapping required — Germany implements NIS2 via NIS2UmsuCG with BSI as supervisory authority. " +
          "BSI-TR-03184 (Parts 1 & 2) provides space-specific cybersecurity technical guidance. " +
          "Dual compliance demonstration required: NIS2UmsuCG + EU Space Act cyber provisions.",
      },
      {
        articleRange: "Art. 77-78",
        weight: "critical",
        description:
          "Risk assessment must reference BSI-TR-03184 methodology: structure description, protection needs " +
          "(Schutzbedarf: Normal/Hoch/Sehr Hoch), threat identification, risk treatment, security measures. " +
          "Must cover both space segment (Part 1) and ground segment (Part 2) separately.",
      },
      {
        articleRange: "Art. 89-92",
        weight: "critical",
        description:
          "Incident reporting follows NIS2UmsuCG timelines to BSI: 24h early warning (Frühwarnung), " +
          "72h incident notification (Meldung), 1-month final report (Abschlussbericht). " +
          "Dual reporting to BSI (cybersecurity) and NCA (space operations impact).",
      },
      {
        articleRange: "Art. 85",
        weight: "critical",
        description:
          "BCP must include tested recovery procedures with documented RTO/RPO. " +
          "BSI-Standard 200-4 (Business Continuity Management) is the expected methodology. " +
          "Must cover both ground segment failover and degraded-mode satellite operations.",
      },
      {
        articleRange: "Art. 79",
        weight: "high",
        description:
          "Access control policy must reference BSI IT-Grundschutz Bausteine (ORP.4, OPS.1.1.1). " +
          "MFA mandatory for critical operations per NIS2UmsuCG. " +
          "Physical access to ground stations must be addressed (INF.1, INF.2 Bausteine).",
      },
      // ── Debris & Space Sustainability ──
      {
        articleRange: "Art. 58-67",
        weight: "high",
        description:
          "WRG Eckpunkte (Sept 2024) establish explicit debris avoidance requirements (Weltraummüllvermeidung). " +
          "Mandatory planned end-of-life for every space activity. " +
          "Reference IADC Guidelines Rev.2 and ISO 24113:2019 as primary debris standards.",
      },
      {
        articleRange: "Art. 72",
        weight: "high",
        description:
          "WRG Eckpunkte require demonstrable orbital lifetime compliance and disposal planning. " +
          "No mandatory German-specific tools (unlike CNES STELA) — ESA DRAMA suite or equivalent accepted. " +
          "For constellations: WRG treats the constellation as a single activity (einheitliche Weltraumaktivität).",
      },
      {
        articleRange: "Art. 64",
        weight: "high",
        description:
          "Collision avoidance capabilities required. WRG Eckpunkte mandate SSA data sharing. " +
          "Reference EU SST services and coordination with CSpOC/18th SDS.",
      },
      // ── Authorization & Insurance ──
      {
        articleRange: "Art. 4-12",
        weight: "high",
        description:
          "Under WRG Eckpunkte, authorization will be required for all non-state space activities. " +
          "New BMWK agency will be licensing body. Constellations receive a single authorization. " +
          "Simplified regime (vereinfachtes Verfahren) planned for SMEs and research.",
      },
      {
        articleRange: "Art. 47-50",
        weight: "high",
        description:
          "WRG Eckpunkte liability regime: Federal Republic strict liability (verschuldensunabhängig) with " +
          "operator recourse. Insurance cap: 10% of 3-year average turnover, max €50M per incident. " +
          "Universities/research exempt from recourse unless gross negligence.",
      },
      // ── SatDSiG (EO only) ──
      {
        articleRange: "Art. 74 / SatDSiG",
        weight: "normal",
        description:
          "For Earth observation operators only: SatDSiG approval required in addition to EU Space Act authorization. " +
          "Data sensitivity classification and distribution controls. " +
          "Complementary to NIS2/EU Space Act cyber requirements.",
      },
    ],
    preferredStandards: [
      // German national framework
      "WRG Eckpunkte (Eckpunkte der Bundesregierung für ein Weltraumgesetz, Sept 2024)",
      "NIS2UmsuCG (NIS-2-Umsetzungs- und Cybersicherheitsstärkungsgesetz)",
      "BSI-TR-03184 Part 1 (Information Security for Space Systems — Space Segment, July 2023)",
      "BSI-TR-03184 Part 2 (Information Security for Space Systems — Ground Segment, July 2025)",
      "BSI IT-Grundschutz Kompendium (current edition)",
      "BSI-Standard 200-1/200-2/200-3/200-4 (ISMS, Methodology, Risk Analysis, BCM)",
      "SatDSiG (Satellitendatensicherheitsgesetz, 2007 — for EO operators)",
      "RAÜG (Raumfahrtaufgabenübertragungsgesetz)",
      // International standards
      "ISO/IEC 27001:2022 (Information security management)",
      "ISO 24113:2019 (Space debris mitigation requirements)",
      "IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)",
      "ECSS-U-AS-10C (Space sustainability)",
      // Cybersecurity
      "CCSDS 350.1-G-3 (Security threats against space missions)",
      "NIS2 Directive (EU 2022/2555)",
    ],
    preferredEvidence: [
      {
        type: "BSI_GRUNDSCHUTZ_CERT",
        description:
          "BSI ISO 27001 Certificate on the basis of IT-Grundschutz — the gold standard " +
          "for German NCA cybersecurity submissions. More prescriptive than standalone ISO 27001.",
        acceptedAsShortcut: true,
      },
      {
        type: "ISO27001_CERT",
        description:
          "ISO/IEC 27001:2022 certificate — accepted but less preferred than BSI IT-Grundschutz certification. " +
          "Must be accompanied by Statement of Applicability (SoA) demonstrating space-relevant controls.",
        acceptedAsShortcut: true,
      },
      {
        type: "BSI_TR_03184_COMPLIANCE",
        description:
          "BSI-TR-03184 compliance attestation — demonstrates adherence to BSI's space-specific " +
          "cybersecurity technical guideline for both space segment (Part 1) and ground segment (Part 2).",
        acceptedAsShortcut: false,
      },
      {
        type: "NIS2_COMPLIANCE_REPORT",
        description:
          "NIS2UmsuCG compliance report — demonstrates adherence to German NIS2 transposition " +
          "including incident reporting procedures, risk management measures, and supply chain security.",
        acceptedAsShortcut: false,
      },
      {
        type: "SATDSIG_APPROVAL",
        description:
          "SatDSiG approval (Genehmigung) from BMWK — required ONLY for Earth observation operators " +
          "with high-resolution imaging systems. Not applicable to non-EO missions.",
        acceptedAsShortcut: false,
      },
      {
        type: "DRAMA_OUTPUT",
        description:
          "ESA DRAMA suite output (OSCAR, MASTER, ARES) — accepted for orbital lifetime " +
          "and re-entry risk analysis. No mandatory German-specific tool equivalent to CNES STELA.",
        acceptedAsShortcut: false,
      },
    ],
    documentGuidance: {
      DMP: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Include German-language executive summary (Zusammenfassung auf Deutsch)",
          "Reference WRG Eckpunkte (Sept 2024) debris requirements alongside EU Space Act throughout",
          "WRG treats constellations as single activity (einheitliche Weltraumaktivität) — address fleet-level compliance",
          "Reference IADC Guidelines Rev.2 (IADC-02-01, 2020) and ISO 24113:2019 as primary debris standards",
          "No mandatory German-specific tools (unlike CNES) — ESA DRAMA suite or equivalent accepted for orbital analysis",
          "Include collision avoidance strategy referencing WRG SSA data sharing obligations",
          "Address WRG mandatory planned end-of-life (geplantes Missionsende) requirement",
          "Include compliance matrix mapping EU Space Act articles to WRG Eckpunkte provisions",
        ],
        commonRejectionReasons: [
          "No reference to WRG Eckpunkte or German regulatory context (28%)",
          "Constellation not treated as unified activity per WRG approach (18%)",
          "Missing SSA data sharing commitment per WRG requirements (15%)",
          "Compliance matrix missing German national regulation references (12%)",
        ],
      },
      ORBITAL_LIFETIME: {
        depthExpectation: "detailed",
        specificRequirements: [
          "ESA DRAMA suite (OSCAR module) or equivalent propagation tool accepted — no mandatory German-specific tool",
          "Include propagation curves for mean, +2σ, and -2σ solar activity scenarios",
          "Show altitude vs. time plots for the full 25-year post-mission period",
          "Reference WRG Eckpunkte debris avoidance requirements and planned end-of-life mandate",
          "Include atmospheric density model specification and justification",
          "For constellations: individual satellite analysis plus fleet-level statistical assessment",
        ],
        commonRejectionReasons: [
          "No solar cycle sensitivity analysis (must show mean, +2σ, -2σ scenarios)",
          "Atmospheric density model not specified or justified",
          "Constellation fleet-level analysis missing",
        ],
      },
      EOL_DISPOSAL: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference WRG Eckpunkte mandatory end-of-life planning requirement",
          "Delta-V budget with margin (≥10% recommended)",
          "Probability of success analysis for disposal maneuver",
          "For controlled re-entry: ESA DRAMA (SARA module) or equivalent for casualty risk assessment",
          "Contingency procedures for failed disposal must be described",
          "For constellations: fleet disposal strategy considering WRG unified activity concept",
        ],
        commonRejectionReasons: [
          "No probability of success analysis for disposal maneuver",
          "Insufficient fuel margin documentation",
          "Missing contingency procedures for failed disposal",
        ],
      },
      CYBER_POLICY: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Map every requirement to BOTH NIS2UmsuCG article AND EU Space Act article — dual compliance required",
          "Reference BSI-TR-03184 (Parts 1 & 2) as primary technical guidance for space cybersecurity",
          "Reference BSI IT-Grundschutz framework and applicable Bausteine (building blocks)",
          "Include ISMS scope aligned with BSI-Standard 200-1 or ISO 27001",
          "Address protection needs (Schutzbedarf) per BSI methodology: Normal/Hoch/Sehr Hoch",
          "German technical terminology preferred (with English in parentheses on first use)",
          "Reference WRG Eckpunkte alongside EU Space Act for forward-looking compliance",
          "ISO 27001 or BSI IT-Grundschutz certificate can substitute for detailed policy sections — reference explicitly",
          "Address both IT and OT (Operational Technology) segments per BSI-TR-03184",
        ],
        commonRejectionReasons: [
          "NIS2UmsuCG mapping incomplete — missing dual compliance demonstration (41%)",
          "No reference to BSI-TR-03184 or IT-Grundschutz framework (22%)",
          "Missing BCP test evidence (BSI-Standard 200-4 not referenced) (18%)",
          "Access control policy too generic — no IT-Grundschutz Baustein references (10%)",
        ],
      },
      CYBER_RISK_ASSESSMENT: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Use BSI-TR-03184 methodology as primary risk assessment framework for space systems",
          "Structure analysis per BSI approach: Strukturbeschreibung → Schutzbedarfsfeststellung → Risikoanalyse → Risikobehandlung",
          "Protection needs (Schutzbedarf) classification: Normal, Hoch (High), Sehr Hoch (Very High)",
          "Address space-specific threats from BSI-TR-03184 Part 1: unauthorized telecommand, telemetry interception, GNSS spoofing",
          "Address ground-segment threats from BSI-TR-03184 Part 2: SCC compromise, key management, physical security",
          "Reference CCSDS 350.1-G-3 for space-specific threat taxonomy",
          "Include lifecycle coverage per BSI-TR-03184: design through decommissioning",
          "Supply chain risk assessment per NIS2UmsuCG requirements (Lieferkettensicherheit)",
          "Cross-reference BSI IT-Grundschutz relevant Bausteine for each identified risk",
        ],
        commonRejectionReasons: [
          "Risk methodology not aligned with BSI-TR-03184 or IT-Grundschutz (35%)",
          "Protection needs classification missing or incomplete (22%)",
          "Space segment vs. ground segment not separately analyzed per BSI-TR-03184 Parts 1 & 2 (18%)",
          "TT&C link security not adequately assessed (12%)",
        ],
      },
      INCIDENT_RESPONSE: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Follow NIS2UmsuCG incident reporting timelines to BSI: 24h Frühwarnung, 72h Meldung, 1-month Abschlussbericht",
          "Define dual reporting: to BSI (cybersecurity incidents) and to NCA (space operations impact)",
          "Reference BSI IT-Grundschutz Baustein DER.2.1 (Behandlung von Sicherheitsvorfällen)",
          "Include IT forensics preparedness per BSI Baustein DER.2.2 (Vorsorge für die IT-Forensik)",
          "Reference EU Space Act Art. 89-92 alongside NIS2UmsuCG notification requirements",
          "Define penalties for non-compliance: essential entities up to €10M or 2% turnover, important entities up to €7M or 1.4%",
          "Include CSIRT coordination procedures with BSI CERT-Bund",
          "Address management liability (Geschäftsleitung) for compliance failures per NIS2UmsuCG",
        ],
        commonRejectionReasons: [
          "NIS2UmsuCG reporting timelines not accurately reflected (32%)",
          "Dual reporting to BSI + NCA not described (24%)",
          "No reference to BSI DER.2.1/DER.2.2 Bausteine (18%)",
          "Management liability provisions not addressed (12%)",
        ],
      },
      BCP_RECOVERY: {
        depthExpectation: "extensive",
        specificRequirements: [
          "BSI-Standard 200-4 (Business Continuity Management) is the expected methodology",
          "Document RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for all critical systems",
          "Cover both ground segment failover and degraded-mode satellite operations",
          "Reference BSI IT-Grundschutz Baustein DER.4 (Notfallmanagement)",
          "Include tested recovery procedures — BNetzA expects documented test results",
          "Address satellite-specific BCM: safe mode operations, ground station redundancy, backup TT&C paths",
          "Crisis communication procedures per NIS2UmsuCG",
        ],
        commonRejectionReasons: [
          "No documented BCP test results (32%)",
          "RTO/RPO not defined for critical systems (24%)",
          "BSI-Standard 200-4 not referenced (18%)",
          "Satellite-specific degraded-mode operations not covered (14%)",
        ],
      },
      ACCESS_CONTROL: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference BSI IT-Grundschutz Bausteine ORP.4 (Identitäts- und Berechtigungsmanagement)",
          "MFA mandatory for all critical operations per NIS2UmsuCG",
          "Physical access control for ground stations per BSI Bausteine INF.1 and INF.2",
          "Privileged access management (PAM) for satellite command operations",
          "Access control for TT&C systems per BSI-TR-03184 Part 2",
          "Role-based access control (RBAC) with least-privilege principle",
          "Regular access review and recertification procedures",
        ],
        commonRejectionReasons: [
          "MFA not mandated for critical operations (28%)",
          "Physical access control for ground facilities not addressed (22%)",
          "No IT-Grundschutz Baustein references (18%)",
          "TT&C access control not specifically addressed (14%)",
        ],
      },
      AUTHORIZATION_APPLICATION: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Structure must address both EU Space Act requirements and WRG Eckpunkte provisions",
          "Include compliance matrix with dual mapping: EU Space Act articles + German national regulations",
          "Matrix columns: Anforderung | EU Space Act Art. | German Law Reference | Status (K/NK/TK/NA) | Nachweis | Abschnitt | Bemerkung",
          "German-language Zusammenfassung (executive summary) mandatory",
          "Reference WRG Eckpunkte authorization requirements (Genehmigungsvorbehalt)",
          "Address WRG liability and insurance provisions (10% turnover cap, max €50M)",
          "For constellations: address unified activity concept (einheitliche Weltraumaktivität)",
          "For EO operators: include SatDSiG compliance status",
          "Reference BSI-TR-03184 compliance for cybersecurity sections",
          "Address WRG simplified regime eligibility if applicable (SME/research)",
          "Registration requirements per UN Registration Convention and WRG",
        ],
        commonRejectionReasons: [
          "Compliance matrix not mapped to German national regulations (34%)",
          "WRG Eckpunkte provisions not addressed (22%)",
          "Liability/insurance not quantified per WRG cap provisions (16%)",
          "Missing German-language executive summary (12%)",
        ],
      },
      ENVIRONMENTAL_FOOTPRINT: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference WRG Eckpunkte environmental impact assessment (Umweltverträglichkeitsprüfung, UVP) requirement",
          "German UVP framework may apply depending on mission type and launch arrangements",
          "Reference EU Space Act Art. 44-46 environmental requirements",
          "Include propellant environmental impact assessment for re-entry debris",
          "Address space sustainability per WRG Nachhaltige Nutzung des Weltraums provisions",
        ],
        commonRejectionReasons: [
          "No reference to WRG UVP requirement (28%)",
          "Space sustainability aspects not addressed (22%)",
        ],
      },
      INSURANCE_COMPLIANCE: {
        depthExpectation: "detailed",
        specificRequirements: [
          "Reference WRG Eckpunkte liability regime: Federal Republic strict liability with operator recourse",
          "Insurance cap calculation: 10% of average annual turnover (Jahresumsatz) over last 3 years, max €50M per incident",
          "Acceptable forms: Haftpflichtversicherung (liability insurance) or Bankbürgschaft (bank guarantee)",
          "For constellations: increased insurance considering higher aggregate risk",
          "University/research exemptions: regressfrei unless grobe Fahrlässigkeit (gross negligence)",
          "Reference Liability Convention 1972 obligations for Germany as launching state",
        ],
        commonRejectionReasons: [
          "WRG liability cap not properly calculated (28%)",
          "Constellation aggregate risk not addressed in insurance analysis (22%)",
          "German-specific liability regime not referenced (18%)",
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
