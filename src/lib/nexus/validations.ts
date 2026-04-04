import { z } from "zod";

// ── Asset ──
export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  assetType: z.enum([
    "SPACECRAFT",
    "PAYLOAD",
    "PROPULSION",
    "CONSTELLATION_ELEMENT",
    "GROUND_STATION",
    "ANTENNA",
    "MISSION_CONTROL",
    "DATA_CENTER",
    "LAUNCH_PAD",
    "TTC_UPLINK",
    "TTC_DOWNLINK",
    "PAYLOAD_DATA_LINK",
    "INTER_SATELLITE_LINK",
    "GROUND_NETWORK",
    "FLIGHT_SOFTWARE",
    "GROUND_SOFTWARE",
    "DATA_PROCESSING",
    "CLOUD_INFRASTRUCTURE",
    "ENCRYPTION_SYSTEM",
    "MONITORING_SYSTEM",
    "THIRD_PARTY_SERVICE",
    "LAUNCH_SERVICE",
    "INSURANCE_PROVIDER",
    "FREQUENCY_ALLOCATION",
  ]),
  description: z.string().max(5000).optional(),
  externalId: z.string().max(100).optional(),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dataClassification: z
    .enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"])
    .default("INTERNAL"),
  operationalStatus: z
    .enum(["ACTIVE", "STANDBY", "MAINTENANCE", "DECOMMISSIONED", "PLANNED"])
    .default("ACTIVE"),
  location: z.string().max(500).optional(),
  jurisdiction: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  manufacturer: z.string().max(200).optional(),
  commissionedDate: z.string().datetime().optional(),
  expectedEolDate: z.string().datetime().optional(),
  spacecraftId: z.string().optional(),
  operatorEntityId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const AssetFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(), // comma-separated
  assetType: z.string().optional(),
  criticality: z.string().optional(), // comma-separated
  operationalStatus: z.string().optional(),
  minComplianceScore: z.coerce.number().min(0).max(100).optional(),
  maxComplianceScore: z.coerce.number().min(0).max(100).optional(),
  showDecommissioned: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z
    .enum(["name", "criticality", "complianceScore", "riskScore", "updatedAt"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ── Requirement ──
export const BulkCreateRequirementsSchema = z.object({
  requirements: z.array(
    z.object({
      regulationFramework: z.string().min(1),
      requirementId: z.string().min(1),
      requirementLabel: z.string().min(1),
      status: z
        .enum([
          "NOT_ASSESSED",
          "COMPLIANT",
          "PARTIAL",
          "NON_COMPLIANT",
          "NOT_APPLICABLE",
        ])
        .default("NOT_ASSESSED"),
    }),
  ),
});

export const UpdateRequirementSchema = z.object({
  status: z
    .enum([
      "NOT_ASSESSED",
      "COMPLIANT",
      "PARTIAL",
      "NON_COMPLIANT",
      "NOT_APPLICABLE",
    ])
    .optional(),
  evidenceId: z.string().nullable().optional(),
  notes: z.string().max(5000).optional(),
  nextReviewDate: z.string().datetime().optional(),
});

// ── Dependency ──
export const CreateDependencySchema = z.object({
  targetAssetId: z.string().min(1),
  dependencyType: z.enum([
    "REQUIRES",
    "COMMUNICATES_WITH",
    "CONTROLLED_BY",
    "PROCESSES_DATA_FROM",
    "POWERED_BY",
    "BACKS_UP",
  ]),
  strength: z.enum(["HARD", "SOFT", "REDUNDANT"]).default("HARD"),
  description: z.string().max(500).optional(),
});

// ── Supplier ──
export const CreateSupplierSchema = z.object({
  supplierName: z.string().min(1).max(200),
  supplierType: z.enum([
    "MANUFACTURER",
    "SOFTWARE_VENDOR",
    "SERVICE_PROVIDER",
    "COMPONENT_SUPPLIER",
    "CLOUD_PROVIDER",
  ]),
  jurisdiction: z.string().length(2).optional(),
  riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  certifications: z.array(z.string()).default([]),
  contractExpiry: z.string().datetime().optional(),
  singlePointOfFailure: z.boolean().default(false),
  alternativeAvailable: z.boolean().default(false),
  notes: z.string().max(5000).optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

// ── Vulnerability ──
export const CreateVulnerabilitySchema = z.object({
  cveId: z.string().max(20).optional(),
  title: z.string().min(1).max(300),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  cvssScore: z.number().min(0).max(10).optional(),
  affectedComponent: z.string().max(200).optional(),
  patchAvailable: z.boolean().default(false),
  workaround: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateVulnerabilitySchema =
  CreateVulnerabilitySchema.partial().extend({
    status: z
      .enum([
        "OPEN",
        "IN_PROGRESS",
        "MITIGATED",
        "RESOLVED",
        "ACCEPTED",
        "FALSE_POSITIVE",
      ])
      .optional(),
    patchApplied: z.boolean().optional(),
    patchVersion: z.string().max(100).optional(),
  });

// ── Personnel ──
export const CreatePersonnelSchema = z.object({
  personName: z.string().min(1).max(200),
  role: z.enum([
    "OPERATOR",
    "ADMINISTRATOR",
    "VIEWER",
    "MAINTENANCE",
    "VENDOR_ACCESS",
  ]),
  accessLevel: z.enum(["FULL", "READ_ONLY", "PHYSICAL_ONLY", "REMOTE_ONLY"]),
  mfaEnabled: z.boolean().default(false),
  lastTraining: z.string().datetime().optional(),
  trainingRequired: z.boolean().default(true),
  clearanceLevel: z.string().max(50).optional(),
  accessExpiresAt: z.string().datetime().optional(),
});

export const UpdatePersonnelSchema = CreatePersonnelSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type AssetFiltersInput = z.infer<typeof AssetFiltersSchema>;
