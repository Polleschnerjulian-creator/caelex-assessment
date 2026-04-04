import "server-only";

// Engagement types with automatic data scoping
export const ENGAGEMENT_TYPES = [
  {
    id: "cra_notified_body",
    name: "CRA Notified Body Submission",
    description:
      "Review and support for Class I/II conformity assessment with a Notified Body",
    autoScope: {
      modules: ["cra"],
      dataTypes: [
        "assessment",
        "classification_reasoning",
        "requirements",
        "sbom",
        "evidence",
        "nb_workflow",
        "documents",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "nis2_nca_registration",
    name: "NIS2 NCA Registration",
    description:
      "Legal support for NIS2 entity registration with national competent authority",
    autoScope: {
      modules: ["nis2"],
      dataTypes: [
        "assessment",
        "classification",
        "requirements",
        "incidents",
        "nca_submissions",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "jurisdiction_selection",
    name: "Jurisdiktionswahl & Licensing",
    description:
      "Legal advisory for optimal jurisdiction selection and authorization",
    autoScope: {
      modules: ["authorization", "space_law"],
      dataTypes: [
        "assessment",
        "jurisdiction_comparison",
        "workflow",
        "documents",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "incident_response",
    name: "Incident Response & NCA Notification",
    description:
      "Legal support during an active security incident with regulatory notification obligations",
    autoScope: {
      modules: ["nis2", "cra", "cybersecurity"],
      dataTypes: [
        "incidents",
        "nis2_phases",
        "draft_notifications",
        "timeline",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "export_control",
    name: "Export Control Review (ITAR/EAR)",
    description:
      "Legal review of export control compliance for space technology transfers",
    autoScope: {
      modules: ["export_control"],
      dataTypes: ["assessment", "requirements", "documents", "evidence"],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "full_compliance_review",
    name: "Full Compliance Audit",
    description: "Comprehensive legal review across all regulatory modules",
    autoScope: {
      modules: ["all"],
      dataTypes: ["all"],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "custom",
    name: "Custom Engagement",
    description: "Manually select which data to share",
    autoScope: null,
  },
] as const;

export type EngagementTypeId = (typeof ENGAGEMENT_TYPES)[number]["id"];

export function getEngagementType(id: string) {
  return ENGAGEMENT_TYPES.find((t) => t.id === id);
}

/**
 * Resolve the auto-scope for an engagement type.
 * Returns the modules and data types that should be accessible.
 */
export function resolveAutoScope(engagementTypeId: string): {
  modules: string[];
  dataTypes: string[];
  includeNIS2Overlap: boolean;
} | null {
  const type = getEngagementType(engagementTypeId);
  if (!type || !type.autoScope) return null;
  return {
    modules: [...type.autoScope.modules],
    dataTypes: [...type.autoScope.dataTypes],
    includeNIS2Overlap: type.autoScope.includeNIS2Overlap,
  };
}

/**
 * Check if a specific module is within the engagement scope.
 */
export function isModuleInScope(
  scopedModules: string[],
  module: string,
): boolean {
  if (scopedModules.includes("all")) return true;
  return scopedModules.includes(module);
}

/**
 * Check if a specific data type is within the engagement scope.
 */
export function isDataTypeInScope(
  scopedDataTypes: string[],
  dataType: string,
): boolean {
  if (scopedDataTypes.includes("all")) return true;
  return scopedDataTypes.includes(dataType);
}
