import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * NCA Significant Change Report Data Structure
 *
 * Per EU Space Act Art. 27: Operators must notify NCAs of significant changes
 * to authorized space operations within specified timeframes.
 */
export interface NCASignificantChangeReportData {
  // Header info
  notificationNumber: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;

  // Authorization reference
  authorizationNumber: string;
  authorizationDate?: Date;
  primaryNCA: string;

  // Change classification
  changeType:
    | "ownership_transfer"
    | "mission_modification"
    | "technical_change"
    | "operational_change"
    | "orbital_change"
    | "end_of_life_update"
    | "insurance_change"
    | "contact_change"
    | "other";
  changeTypeDescription: string;
  notificationDeadlineDays: number;
  requiresPreApproval: boolean;

  // Change details
  changeTitle: string;
  changeDescription: string;
  justification: string;
  effectiveDate: Date;
  plannedImplementationDate?: Date;

  // Before/After comparison
  currentState: {
    field: string;
    value: string;
  }[];
  proposedState: {
    field: string;
    value: string;
  }[];

  // Impact assessment
  impactAssessment: {
    safetyImpact: "none" | "low" | "medium" | "high";
    debrisImpact: "none" | "low" | "medium" | "high";
    thirdPartyImpact: "none" | "low" | "medium" | "high";
    regulatoryImpact: "none" | "low" | "medium" | "high";
  };
  impactDescription?: string;
  mitigationMeasures?: string[];

  // Affected assets
  affectedSpacecraft: Array<{
    name: string;
    cosparId?: string;
    noradId?: string;
  }>;

  // Supporting documents
  supportingDocuments?: Array<{
    name: string;
    type: string;
    reference?: string;
  }>;

  // For ownership transfers
  ownershipTransfer?: {
    currentOwner: string;
    newOwner: string;
    newOwnerCountry: string;
    newOwnerRegistration?: string;
    transferDate: Date;
    liabilityTransfer: boolean;
  };

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole?: string;

  // Declaration
  declarationText?: string;
  declarantName?: string;
  declarantRole?: string;
}

// Change type descriptions and requirements
const CHANGE_TYPE_INFO: Record<
  NCASignificantChangeReportData["changeType"],
  {
    description: string;
    articleRef: string;
    deadlineDays: number;
    requiresPreApproval: boolean;
  }
> = {
  ownership_transfer: {
    description: "Transfer of Ownership or Control",
    articleRef: "EU Space Act Art. 27(1)(a)",
    deadlineDays: 30,
    requiresPreApproval: true,
  },
  mission_modification: {
    description: "Mission Objectives or Parameters Modification",
    articleRef: "EU Space Act Art. 27(1)(b)",
    deadlineDays: 30,
    requiresPreApproval: true,
  },
  technical_change: {
    description: "Significant Technical Modification",
    articleRef: "EU Space Act Art. 27(1)(c)",
    deadlineDays: 30,
    requiresPreApproval: true,
  },
  operational_change: {
    description: "Operational Procedures Change",
    articleRef: "EU Space Act Art. 27(1)(d)",
    deadlineDays: 14,
    requiresPreApproval: false,
  },
  orbital_change: {
    description: "Orbital Parameters Modification",
    articleRef: "EU Space Act Art. 27(1)(e), Art. 55-73",
    deadlineDays: 30,
    requiresPreApproval: true,
  },
  end_of_life_update: {
    description: "End-of-Life Plan Update",
    articleRef: "EU Space Act Art. 27(1)(f), Art. 55-73",
    deadlineDays: 30,
    requiresPreApproval: true,
  },
  insurance_change: {
    description: "Insurance Coverage Change",
    articleRef: "EU Space Act Art. 27(1)(g)",
    deadlineDays: 14,
    requiresPreApproval: false,
  },
  contact_change: {
    description: "Designated Contact Change",
    articleRef: "EU Space Act Art. 27(2)",
    deadlineDays: 7,
    requiresPreApproval: false,
  },
  other: {
    description: "Other Significant Change",
    articleRef: "EU Space Act Art. 27",
    deadlineDays: 30,
    requiresPreApproval: false,
  },
};

/**
 * Build report configuration from significant change data
 */
export function buildNCASignificantChangeReportConfig(
  data: NCASignificantChangeReportData,
): ReportConfig {
  const sections: ReportSection[] = [];
  const changeInfo = CHANGE_TYPE_INFO[data.changeType];

  // 1. Change Notification Overview
  sections.push({
    title: "1. Change Notification Overview",
    content: [
      {
        type: "alert",
        severity: data.requiresPreApproval ? "warning" : "info",
        message: data.requiresPreApproval
          ? "This change requires prior NCA approval before implementation."
          : "This change requires notification only (no prior approval required).",
      },
      {
        type: "keyValue",
        items: [
          { key: "Notification Number", value: data.notificationNumber },
          { key: "Change Type", value: data.changeTypeDescription },
          { key: "Article Reference", value: changeInfo.articleRef },
          {
            key: "Notification Deadline",
            value: `${data.notificationDeadlineDays} days from change`,
          },
          {
            key: "Prior Approval Required",
            value: data.requiresPreApproval ? "Yes" : "No",
          },
          {
            key: "Effective Date",
            value: data.effectiveDate.toLocaleDateString("en-GB"),
          },
        ],
      },
    ],
  });

  // 2. Authorization Reference
  sections.push({
    title: "2. Authorization Reference",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Authorization Number", value: data.authorizationNumber },
          {
            key: "Authorization Date",
            value: data.authorizationDate
              ? data.authorizationDate.toLocaleDateString("en-GB")
              : "N/A",
          },
          { key: "Primary NCA", value: data.primaryNCA },
          { key: "Operator", value: data.organization },
        ],
      },
    ],
  });

  // 3. Change Description
  sections.push({
    title: "3. Change Description",
    content: [
      { type: "heading", value: data.changeTitle, level: 3 },
      { type: "text", value: data.changeDescription },
      { type: "spacer", height: 10 },
      { type: "heading", value: "Justification", level: 3 },
      { type: "text", value: data.justification },
    ],
  });

  // 4. Before/After Comparison
  if (data.currentState.length > 0 || data.proposedState.length > 0) {
    const comparisonRows: string[][] = [];

    const maxLen = Math.max(
      data.currentState.length,
      data.proposedState.length,
    );
    for (let i = 0; i < maxLen; i++) {
      const current = data.currentState[i];
      const proposed = data.proposedState[i];
      comparisonRows.push([
        current?.field || proposed?.field || "",
        current?.value || "N/A",
        proposed?.value || "N/A",
      ]);
    }

    sections.push({
      title: "4. Before/After Comparison",
      content: [
        {
          type: "table",
          headers: ["Parameter", "Current State", "Proposed State"],
          rows: comparisonRows,
        },
      ],
    });
  }

  // 5. Affected Spacecraft
  if (data.affectedSpacecraft.length > 0) {
    sections.push({
      title: "5. Affected Spacecraft",
      content: [
        {
          type: "table",
          headers: ["Spacecraft Name", "COSPAR ID", "NORAD ID"],
          rows: data.affectedSpacecraft.map((sc) => [
            sc.name,
            sc.cosparId || "N/A",
            sc.noradId || "N/A",
          ]),
        },
      ],
    });
  }

  // 6. Impact Assessment
  const impactLevelColors: Record<string, string> = {
    none: "None",
    low: "Low",
    medium: "Medium",
    high: "HIGH",
  };

  sections.push({
    title: "6. Impact Assessment",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Safety Impact",
            value: impactLevelColors[data.impactAssessment.safetyImpact],
          },
          {
            key: "Debris/Environment Impact",
            value: impactLevelColors[data.impactAssessment.debrisImpact],
          },
          {
            key: "Third Party Impact",
            value: impactLevelColors[data.impactAssessment.thirdPartyImpact],
          },
          {
            key: "Regulatory Compliance Impact",
            value: impactLevelColors[data.impactAssessment.regulatoryImpact],
          },
        ],
      },
      ...(data.impactDescription
        ? [
            {
              type: "heading" as const,
              value: "Impact Details",
              level: 3 as const,
            },
            { type: "text" as const, value: data.impactDescription },
          ]
        : []),
      ...(data.mitigationMeasures && data.mitigationMeasures.length > 0
        ? [
            {
              type: "heading" as const,
              value: "Mitigation Measures",
              level: 3 as const,
            },
            {
              type: "list" as const,
              items: data.mitigationMeasures,
              ordered: true,
            },
          ]
        : []),
    ],
  });

  // 7. Ownership Transfer Details (if applicable)
  if (data.changeType === "ownership_transfer" && data.ownershipTransfer) {
    sections.push({
      title: "7. Ownership Transfer Details",
      content: [
        {
          type: "alert",
          severity: "warning",
          message:
            "Ownership transfers require prior NCA approval and may require re-authorization.",
        },
        {
          type: "keyValue",
          items: [
            {
              key: "Current Owner",
              value: data.ownershipTransfer.currentOwner,
            },
            { key: "New Owner", value: data.ownershipTransfer.newOwner },
            {
              key: "New Owner Country",
              value: data.ownershipTransfer.newOwnerCountry,
            },
            {
              key: "New Owner Registration",
              value: data.ownershipTransfer.newOwnerRegistration || "Pending",
            },
            {
              key: "Transfer Date",
              value:
                data.ownershipTransfer.transferDate.toLocaleDateString("en-GB"),
            },
            {
              key: "Liability Transfer",
              value: data.ownershipTransfer.liabilityTransfer ? "Yes" : "No",
            },
          ],
        },
      ],
    });
  }

  // 8. Supporting Documents
  if (data.supportingDocuments && data.supportingDocuments.length > 0) {
    const sectionNum = data.changeType === "ownership_transfer" ? "8" : "7";
    sections.push({
      title: `${sectionNum}. Supporting Documents`,
      content: [
        {
          type: "table",
          headers: ["Document Name", "Type", "Reference"],
          rows: data.supportingDocuments.map((doc) => [
            doc.name,
            doc.type,
            doc.reference || "Attached",
          ]),
        },
      ],
    });
  }

  // 9. Implementation Timeline
  const timelineNum =
    data.changeType === "ownership_transfer"
      ? data.supportingDocuments?.length
        ? "9"
        : "8"
      : data.supportingDocuments?.length
        ? "8"
        : "7";

  sections.push({
    title: `${timelineNum}. Implementation Timeline`,
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Notification Date",
            value: data.reportDate.toLocaleDateString("en-GB"),
          },
          {
            key: "Effective Date",
            value: data.effectiveDate.toLocaleDateString("en-GB"),
          },
          {
            key: "Planned Implementation",
            value: data.plannedImplementationDate
              ? data.plannedImplementationDate.toLocaleDateString("en-GB")
              : "Upon approval",
          },
        ],
      },
    ],
  });

  // Contact Information
  if (data.contactName || data.contactEmail) {
    sections.push({
      title: "Designated Contact",
      content: [
        {
          type: "keyValue",
          items: [
            { key: "Name", value: data.contactName || "Not specified" },
            { key: "Role", value: data.contactRole || "Not specified" },
            { key: "Email", value: data.contactEmail || "Not specified" },
            { key: "Phone", value: data.contactPhone || "Not specified" },
          ],
        },
      ],
    });
  }

  // Declaration
  sections.push({
    title: "Declaration",
    content: [
      {
        type: "text",
        value:
          data.declarationText ||
          "I hereby declare that the information provided in this notification is accurate and complete to the best of my knowledge. I understand that providing false or misleading information may result in regulatory action.",
      },
      { type: "spacer", height: 15 },
      {
        type: "keyValue",
        items: [
          { key: "Declarant", value: data.declarantName || data.generatedBy },
          {
            key: "Role",
            value: data.declarantRole || "Authorized Representative",
          },
          {
            key: "Date",
            value: data.reportDate.toLocaleDateString("en-GB"),
          },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: data.notificationNumber,
      reportType: "significant_change",
      title: `NCA Significant Change Notification - ${data.notificationNumber}`,
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Significant Change Notification",
      subtitle: `EU Space Act Art. 27 - ${data.changeTypeDescription}`,
      reportNumber: data.notificationNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: data.requiresPreApproval
        ? "OFFICIAL - REQUIRES APPROVAL"
        : "OFFICIAL",
      disclaimer:
        "This notification is submitted in accordance with EU Space Act Article 27. " +
        "Changes requiring prior approval must not be implemented until NCA approval is received.",
    },
    sections,
  };
}

/**
 * Get change type info helper
 */
export function getChangeTypeInfo(
  changeType: NCASignificantChangeReportData["changeType"],
) {
  return CHANGE_TYPE_INFO[changeType];
}

/**
 * NCA Significant Change Report Component
 */
export function NCASignificantChangeReport({
  data,
}: {
  data: NCASignificantChangeReportData;
}) {
  const config = buildNCASignificantChangeReportConfig(data);
  return <BaseReport config={config} />;
}
