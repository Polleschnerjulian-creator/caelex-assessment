import type {
  AssetType,
  AssetCategory,
  AssetCriticality,
  ComplianceStatus,
} from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS — Space Asset Taxonomy
// ═══════════════════════════════════════════════════════════

export interface AssetTypeConfig {
  id: AssetType;
  label: string;
  nis2Relevant: boolean;
  euSpaceActRelevant: boolean;
  defaultNis2Requirements: string[];
}

export interface AssetCategoryConfig {
  id: AssetCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  types: AssetTypeConfig[];
}

export const ASSET_CATEGORIES: AssetCategoryConfig[] = [
  {
    id: "SPACE_SEGMENT",
    label: "Space Segment",
    description: "Orbital assets and payloads",
    icon: "Satellite",
    types: [
      {
        id: "SPACECRAFT",
        label: "Spacecraft / Satellite",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "PAYLOAD",
        label: "Payload Instrument",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "PROPULSION",
        label: "Propulsion System",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "CONSTELLATION_ELEMENT",
        label: "Constellation Element",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
    ],
  },
  {
    id: "GROUND_SEGMENT",
    label: "Ground Segment",
    description: "Earth-based infrastructure",
    icon: "Radio",
    types: [
      {
        id: "GROUND_STATION",
        label: "Ground Station",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_d",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
          "art_21_2_j",
        ],
      },
      {
        id: "ANTENNA",
        label: "Antenna System",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "MISSION_CONTROL",
        label: "Mission Control Center",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_g",
          "art_21_2_h",
          "art_21_2_i",
          "art_21_2_j",
        ],
      },
      {
        id: "DATA_CENTER",
        label: "Data Center / Processing Facility",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "LAUNCH_PAD",
        label: "Launch Pad / Range",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
    ],
  },
  {
    id: "LINK_SEGMENT",
    label: "Link Segment",
    description: "Communication links and data paths",
    icon: "Link",
    types: [
      {
        id: "TTC_UPLINK",
        label: "TT&C Uplink",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "TTC_DOWNLINK",
        label: "TT&C Downlink",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "PAYLOAD_DATA_LINK",
        label: "Payload Data Link",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "INTER_SATELLITE_LINK",
        label: "Inter-Satellite Link (ISL)",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "GROUND_NETWORK",
        label: "Ground Network / VPN",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
    ],
  },
  {
    id: "SOFTWARE_DATA",
    label: "Software & Data Systems",
    description: "Software, databases, and processing systems",
    icon: "Server",
    types: [
      {
        id: "FLIGHT_SOFTWARE",
        label: "Flight Software (FSW)",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "GROUND_SOFTWARE",
        label: "Ground Control Software",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "DATA_PROCESSING",
        label: "Data Processing Pipeline",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_e"],
      },
      {
        id: "CLOUD_INFRASTRUCTURE",
        label: "Cloud Infrastructure",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_c",
          "art_21_2_d",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "ENCRYPTION_SYSTEM",
        label: "Encryption / Key Management",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_h", "art_21_2_j"],
      },
      {
        id: "MONITORING_SYSTEM",
        label: "Monitoring / SIEM",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_f"],
      },
    ],
  },
  {
    id: "ORGANISATIONAL",
    label: "Organisational Assets",
    description: "Processes, personnel, and third parties",
    icon: "Building2",
    types: [
      {
        id: "THIRD_PARTY_SERVICE",
        label: "Third-Party Service Provider",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "LAUNCH_SERVICE",
        label: "Launch Service Provider",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "INSURANCE_PROVIDER",
        label: "Insurance Provider",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "FREQUENCY_ALLOCATION",
        label: "Frequency Allocation / ITU Filing",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
    ],
  },
];

// Flat lookup: AssetType → config
export function getAssetTypeConfig(
  assetType: AssetType,
): AssetTypeConfig | undefined {
  for (const cat of ASSET_CATEGORIES) {
    const found = cat.types.find((t) => t.id === assetType);
    if (found) return found;
  }
  return undefined;
}

// Flat lookup: AssetType → AssetCategory
export function getCategoryForType(assetType: AssetType): AssetCategory {
  for (const cat of ASSET_CATEGORIES) {
    if (cat.types.some((t) => t.id === assetType)) return cat.id;
  }
  return "ORGANISATIONAL"; // fallback
}

// NIS2 requirement label lookup
export const NIS2_REQUIREMENT_LABELS: Record<string, string> = {
  art_21_2_a:
    "Art. 21(2)(a) — Policies on risk analysis and information system security",
  art_21_2_b: "Art. 21(2)(b) — Incident handling",
  art_21_2_c: "Art. 21(2)(c) — Business continuity and crisis management",
  art_21_2_d: "Art. 21(2)(d) — Supply chain security",
  art_21_2_e:
    "Art. 21(2)(e) — Security in acquisition, development and maintenance",
  art_21_2_f:
    "Art. 21(2)(f) — Policies to assess the effectiveness of cybersecurity measures",
  art_21_2_g:
    "Art. 21(2)(g) — Basic cyber hygiene practices and cybersecurity training",
  art_21_2_h:
    "Art. 21(2)(h) — Policies on the use of cryptography and encryption",
  art_21_2_i:
    "Art. 21(2)(i) — Human resources security, access control policies",
  art_21_2_j:
    "Art. 21(2)(j) — Use of multi-factor authentication, secured communications",
};

// Criticality weights for risk calculation
export const CRITICALITY_WEIGHTS: Record<AssetCriticality, number> = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.25,
};

// NIS2 status string → ComplianceStatus enum mapping (for sync with NIS2 module)
export function nis2StatusToComplianceStatus(status: string): ComplianceStatus {
  const map: Record<string, ComplianceStatus> = {
    compliant: "COMPLIANT",
    partial: "PARTIAL",
    non_compliant: "NON_COMPLIANT",
    not_assessed: "NOT_ASSESSED",
    not_applicable: "NOT_APPLICABLE",
  };
  return map[status] ?? "NOT_ASSESSED";
}

// Impact analysis result type
export interface ImpactAnalysisResult {
  assetId: string;
  assetName: string;
  impactLevel: "DIRECT" | "INDIRECT_1HOP" | "INDIRECT_2HOP";
  dependencyType: string;
  strength: string;
}

// Auto-detect suggestion type
export interface DependencySuggestion {
  sourceAssetId: string;
  sourceAssetName: string;
  targetAssetId: string;
  targetAssetName: string;
  dependencyType: string;
  strength: string;
  reason: string;
}
