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
    rigor: { debris: 5, cybersecurity: 3, general: 4, safety: 5 },
    focusAreas: [
      {
        articleRange: "Art. 64-66",
        weight: "critical",
        description:
          "Quantitative conjunction assessment with probability thresholds",
      },
      {
        articleRange: "Art. 72",
        weight: "critical",
        description:
          "Detailed orbital lifetime analysis with STELA/DRAMA validation",
      },
      {
        articleRange: "Art. 67(1)(d)",
        weight: "high",
        description:
          "Passivation sequence must include battery, propellant, AND pressure systems",
      },
    ],
    preferredStandards: ["ISO 24113:2019", "CNES LOS", "IADC Guidelines Rev.3"],
    preferredEvidence: [
      {
        type: "STELA_REPORT",
        description: "STELA orbital propagation output",
        acceptedAsShortcut: false,
      },
      {
        type: "DRAMA_OUTPUT",
        description: "ESA DRAMA demise analysis",
        acceptedAsShortcut: false,
      },
    ],
    documentGuidance: {
      DMP: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Include French-language executive summary",
          "CNES expects STELA tool output for orbital lifetime, not generic calculations",
          "Quantify collision probability thresholds (Pc) explicitly",
          "Reference Loi relative aux Opérations Spatiales alongside EU Space Act",
        ],
        commonRejectionReasons: [
          "Insufficient orbital lifetime analysis (34%)",
          "Missing FMECA reference (22%)",
          "Passivation detail insufficient (18%)",
        ],
      },
      ORBITAL_LIFETIME: {
        depthExpectation: "extensive",
        specificRequirements: [
          "Must include STELA propagation curves for mean, +2σ, and -2σ solar scenarios",
          "Show altitude vs time plots for full 25-year period",
          "CNES expects drag coefficient sensitivity analysis",
        ],
        commonRejectionReasons: [
          "No STELA validation (only parametric estimate)",
          "Missing solar cycle sensitivity",
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
