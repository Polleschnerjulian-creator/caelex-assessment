import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * Authorization Application Package Data Structure
 * Based on EU Space Act Art. 7-9 requirements
 */
export interface AuthorizationApplicationData {
  // Header info
  reportNumber: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;

  // Application type
  applicationType: "new" | "modification" | "transfer" | "renewal";
  applicationCategory: string; // e.g., "Standard Authorization", "Light Regime"

  // Applicant details
  applicant: {
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    incorporationDate: string;
    jurisdiction: string;
    registeredAddress: string;
    operationalAddress?: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    website?: string;
    parentCompany?: string;
    ultimateBeneficialOwners?: string[];
  };

  // Operator qualification
  operatorQualification: {
    operatorType: string;
    entitySize: string;
    isResearchEntity: boolean;
    lightRegimeEligible: boolean;
    previousAuthorizations: string[];
    relevantExperience: string[];
    qualityManagementSystem?: string;
    technicalCapabilities: string[];
  };

  // Mission details
  missionDetails: {
    missionName: string;
    missionObjective: string;
    missionType: string;
    operationalConcept: string;
    servicesToBeProvided?: string[];
    targetMarkets?: string[];
    plannedLaunchDate: string;
    missionDurationYears: number;
    endOfMissionDate: string;
  };

  // Space segment
  spaceSegment: {
    spacecraftCount: number;
    spacecraftType: string;
    manufacturer?: string;
    massKg: number;
    dimensions?: string;
    orbitType: string;
    altitudeKm: number;
    inclinationDeg: number;
    expectedLifetimeYears: number;
    hasPropulsion: boolean;
    propulsionType?: string;
    payloads: string[];
    frequencies?: string[];
  };

  // Ground segment
  groundSegment: {
    controlCenterLocation: string;
    backupControlCenter?: string;
    groundStations: string[];
    dataProcessingLocation?: string;
    cybersecurityMeasures: string[];
  };

  // Launch details
  launchDetails: {
    launchProvider: string;
    launchVehicle: string;
    launchSite: string;
    launchContract: "signed" | "negotiating" | "planning";
    deploymentMethod: string;
  };

  // Compliance documentation
  complianceDocumentation: {
    debrisMitigationPlan: "attached" | "pending" | "not_required";
    insuranceCertificate: "attached" | "pending" | "not_required";
    cybersecurityAssessment: "attached" | "pending" | "not_required";
    environmentalAssessment: "attached" | "pending" | "not_required";
    frequencyCoordination: "attached" | "pending" | "not_required";
    financialStatements: "attached" | "pending";
    technicalDossier: "attached" | "pending";
  };

  // Regulatory cross-references
  regulatoryRequirements: Array<{
    article: string;
    requirement: string;
    complianceStatus: "compliant" | "in_progress" | "planned";
    evidence?: string;
  }>;

  // EU Space Act checklist
  euSpaceActChecklist: Array<{
    category: string;
    items: Array<{
      requirement: string;
      articleRef: string;
      status: "yes" | "no" | "partial" | "n/a";
      notes?: string;
    }>;
  }>;

  // Declarations
  declarations: {
    accuracyDeclaration: boolean;
    complianceCommitment: boolean;
    changeNotificationCommitment: boolean;
    supervisoryCooperation: boolean;
    dataProtectionCompliance: boolean;
    sanctionsCompliance: boolean;
  };

  // Fees
  applicationFee?: {
    amount: string;
    currency: string;
    paymentMethod: string;
    paymentReference?: string;
  };
}

/**
 * Build report configuration from authorization application data
 */
export function buildAuthorizationApplicationConfig(
  data: AuthorizationApplicationData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // Cover page info
  sections.push({
    title: "Application Summary",
    content: [
      {
        type: "alert",
        severity: "info",
        message: `${data.applicationType.toUpperCase()} APPLICATION - ${data.applicationCategory}`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Application Reference", value: data.reportNumber },
          { key: "Applicant", value: data.applicant.legalName },
          { key: "Mission Name", value: data.missionDetails.missionName },
          {
            key: "Application Type",
            value: data.applicationType.replace("_", " ").toUpperCase(),
          },
          {
            key: "Submission Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
          {
            key: "Planned Launch",
            value: data.missionDetails.plannedLaunchDate,
          },
        ],
      },
      {
        type: "text",
        value: `This application is submitted pursuant to EU Space Act Articles 7-9 for authorization to conduct space activities within the European Union regulatory framework.`,
      },
    ],
  });

  // Section 1: Applicant Information
  sections.push({
    title: "Section 1: Applicant Information",
    content: [
      { type: "heading", value: "1.1 Legal Entity Details", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Legal Name", value: data.applicant.legalName },
          ...(data.applicant.tradingName
            ? [{ key: "Trading Name", value: data.applicant.tradingName }]
            : []),
          {
            key: "Registration Number",
            value: data.applicant.registrationNumber,
          },
          {
            key: "Date of Incorporation",
            value: data.applicant.incorporationDate,
          },
          { key: "Jurisdiction", value: data.applicant.jurisdiction },
          {
            key: "Registered Address",
            value: data.applicant.registeredAddress,
          },
          ...(data.applicant.operationalAddress
            ? [
                {
                  key: "Operational Address",
                  value: data.applicant.operationalAddress,
                },
              ]
            : []),
          ...(data.applicant.website
            ? [{ key: "Website", value: data.applicant.website }]
            : []),
          ...(data.applicant.parentCompany
            ? [{ key: "Parent Company", value: data.applicant.parentCompany }]
            : []),
        ],
      },
      { type: "heading", value: "1.2 Contact Information", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Primary Contact", value: data.applicant.contactPerson },
          { key: "Email", value: data.applicant.contactEmail },
          { key: "Phone", value: data.applicant.contactPhone },
        ],
      },
      ...(data.applicant.ultimateBeneficialOwners &&
      data.applicant.ultimateBeneficialOwners.length > 0
        ? [
            {
              type: "heading" as const,
              value: "1.3 Beneficial Ownership",
              level: 2 as const,
            },
            {
              type: "list" as const,
              items: data.applicant.ultimateBeneficialOwners,
            },
          ]
        : []),
    ],
  });

  // Section 2: Operator Qualification
  sections.push({
    title: "Section 2: Operator Qualification (Art. 8)",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Operator Type",
            value: data.operatorQualification.operatorType,
          },
          { key: "Entity Size", value: data.operatorQualification.entitySize },
          {
            key: "Research Entity",
            value: data.operatorQualification.isResearchEntity ? "Yes" : "No",
          },
          {
            key: "Light Regime Eligible (Art. 10)",
            value: data.operatorQualification.lightRegimeEligible
              ? "Yes"
              : "No",
          },
          ...(data.operatorQualification.qualityManagementSystem
            ? [
                {
                  key: "QMS Certification",
                  value: data.operatorQualification.qualityManagementSystem,
                },
              ]
            : []),
        ],
      },
      { type: "heading", value: "2.1 Previous Authorizations", level: 2 },
      {
        type: "list",
        items:
          data.operatorQualification.previousAuthorizations.length > 0
            ? data.operatorQualification.previousAuthorizations
            : ["No previous space authorizations"],
      },
      { type: "heading", value: "2.2 Relevant Experience", level: 2 },
      {
        type: "list",
        items: data.operatorQualification.relevantExperience,
      },
      { type: "heading", value: "2.3 Technical Capabilities", level: 2 },
      {
        type: "list",
        items: data.operatorQualification.technicalCapabilities,
      },
    ],
  });

  // Section 3: Mission Description
  sections.push({
    title: "Section 3: Mission Description",
    content: [
      { type: "heading", value: "3.1 Mission Overview", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Mission Name", value: data.missionDetails.missionName },
          { key: "Mission Type", value: data.missionDetails.missionType },
          {
            key: "Mission Objective",
            value: data.missionDetails.missionObjective,
          },
        ],
      },
      { type: "heading", value: "3.2 Operational Concept", level: 2 },
      {
        type: "text",
        value: data.missionDetails.operationalConcept,
      },
      ...(data.missionDetails.servicesToBeProvided &&
      data.missionDetails.servicesToBeProvided.length > 0
        ? [
            {
              type: "heading" as const,
              value: "3.3 Services to be Provided",
              level: 2 as const,
            },
            {
              type: "list" as const,
              items: data.missionDetails.servicesToBeProvided,
            },
          ]
        : []),
      { type: "heading", value: "3.4 Mission Timeline", level: 2 },
      {
        type: "keyValue",
        items: [
          {
            key: "Planned Launch Date",
            value: data.missionDetails.plannedLaunchDate,
          },
          {
            key: "Mission Duration",
            value: `${data.missionDetails.missionDurationYears} years`,
          },
          {
            key: "End of Mission Date",
            value: data.missionDetails.endOfMissionDate,
          },
        ],
      },
    ],
  });

  // Section 4: Space Segment
  sections.push({
    title: "Section 4: Space Segment",
    content: [
      { type: "heading", value: "4.1 Spacecraft Details", level: 2 },
      {
        type: "keyValue",
        items: [
          {
            key: "Number of Spacecraft",
            value: data.spaceSegment.spacecraftCount.toString(),
          },
          { key: "Spacecraft Type", value: data.spaceSegment.spacecraftType },
          ...(data.spaceSegment.manufacturer
            ? [{ key: "Manufacturer", value: data.spaceSegment.manufacturer }]
            : []),
          { key: "Mass", value: `${data.spaceSegment.massKg} kg` },
          ...(data.spaceSegment.dimensions
            ? [{ key: "Dimensions", value: data.spaceSegment.dimensions }]
            : []),
          {
            key: "Expected Lifetime",
            value: `${data.spaceSegment.expectedLifetimeYears} years`,
          },
        ],
      },
      { type: "heading", value: "4.2 Orbital Parameters", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Orbit Type", value: data.spaceSegment.orbitType },
          { key: "Altitude", value: `${data.spaceSegment.altitudeKm} km` },
          { key: "Inclination", value: `${data.spaceSegment.inclinationDeg}°` },
        ],
      },
      { type: "heading", value: "4.3 Propulsion System", level: 2 },
      {
        type: "keyValue",
        items: [
          {
            key: "Propulsion",
            value: data.spaceSegment.hasPropulsion
              ? `Yes - ${data.spaceSegment.propulsionType || "Type TBD"}`
              : "No onboard propulsion",
          },
        ],
      },
      { type: "heading", value: "4.4 Payloads", level: 2 },
      {
        type: "list",
        items: data.spaceSegment.payloads,
      },
      ...(data.spaceSegment.frequencies &&
      data.spaceSegment.frequencies.length > 0
        ? [
            {
              type: "heading" as const,
              value: "4.5 Radio Frequencies",
              level: 2 as const,
            },
            {
              type: "list" as const,
              items: data.spaceSegment.frequencies,
            },
          ]
        : []),
    ],
  });

  // Section 5: Ground Segment
  sections.push({
    title: "Section 5: Ground Segment",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Primary Control Center",
            value: data.groundSegment.controlCenterLocation,
          },
          ...(data.groundSegment.backupControlCenter
            ? [
                {
                  key: "Backup Control Center",
                  value: data.groundSegment.backupControlCenter,
                },
              ]
            : []),
          ...(data.groundSegment.dataProcessingLocation
            ? [
                {
                  key: "Data Processing Location",
                  value: data.groundSegment.dataProcessingLocation,
                },
              ]
            : []),
        ],
      },
      { type: "heading", value: "5.1 Ground Stations", level: 2 },
      {
        type: "list",
        items: data.groundSegment.groundStations,
      },
      { type: "heading", value: "5.2 Cybersecurity Measures", level: 2 },
      {
        type: "list",
        items: data.groundSegment.cybersecurityMeasures,
      },
    ],
  });

  // Section 6: Launch Arrangements
  sections.push({
    title: "Section 6: Launch Arrangements",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Launch Provider", value: data.launchDetails.launchProvider },
          { key: "Launch Vehicle", value: data.launchDetails.launchVehicle },
          { key: "Launch Site", value: data.launchDetails.launchSite },
          {
            key: "Contract Status",
            value: data.launchDetails.launchContract
              .replace("_", " ")
              .toUpperCase(),
          },
          {
            key: "Deployment Method",
            value: data.launchDetails.deploymentMethod,
          },
        ],
      },
    ],
  });

  // Section 7: Compliance Documentation
  const docStatusMap = {
    attached: "✓ Attached",
    pending: "⏳ Pending",
    not_required: "N/A",
  };

  sections.push({
    title: "Section 7: Compliance Documentation",
    content: [
      {
        type: "table",
        headers: ["Document", "Status", "Article Reference"],
        rows: [
          [
            "Debris Mitigation Plan",
            docStatusMap[data.complianceDocumentation.debrisMitigationPlan],
            "Art. 12",
          ],
          [
            "Insurance Certificate",
            docStatusMap[data.complianceDocumentation.insuranceCertificate],
            "Art. 15",
          ],
          [
            "Cybersecurity Assessment",
            docStatusMap[data.complianceDocumentation.cybersecurityAssessment],
            "Art. 13",
          ],
          [
            "Environmental Assessment",
            docStatusMap[data.complianceDocumentation.environmentalAssessment],
            "Art. 14",
          ],
          [
            "Frequency Coordination",
            docStatusMap[data.complianceDocumentation.frequencyCoordination],
            "Art. 16",
          ],
          [
            "Financial Statements",
            docStatusMap[data.complianceDocumentation.financialStatements],
            "Art. 8",
          ],
          [
            "Technical Dossier",
            docStatusMap[data.complianceDocumentation.technicalDossier],
            "Art. 7",
          ],
        ],
      },
    ],
  });

  // Section 8: EU Space Act Compliance Checklist
  for (const category of data.euSpaceActChecklist) {
    sections.push({
      title: `Section 8: ${category.category}`,
      content: [
        {
          type: "table",
          headers: ["Requirement", "Article", "Status", "Notes"],
          rows: category.items.map((item) => [
            item.requirement.length > 45
              ? item.requirement.slice(0, 42) + "..."
              : item.requirement,
            item.articleRef,
            item.status.toUpperCase(),
            item.notes?.slice(0, 25) || "-",
          ]),
        },
      ],
    });
  }

  // Section 9: Declarations
  sections.push({
    title: "Section 9: Applicant Declarations",
    content: [
      {
        type: "text",
        value: "The applicant hereby declares and confirms the following:",
      },
      {
        type: "list",
        items: [
          `${data.declarations.accuracyDeclaration ? "✓" : "☐"} All information provided in this application is true, accurate, and complete to the best of my knowledge.`,
          `${data.declarations.complianceCommitment ? "✓" : "☐"} The applicant commits to complying with all conditions attached to any authorization granted.`,
          `${data.declarations.changeNotificationCommitment ? "✓" : "☐"} The applicant commits to notifying the competent authority of any significant changes per Art. 27.`,
          `${data.declarations.supervisoryCooperation ? "✓" : "☐"} The applicant commits to cooperating with the competent authority in supervisory matters per Art. 33-34.`,
          `${data.declarations.dataProtectionCompliance ? "✓" : "☐"} The applicant confirms compliance with applicable data protection regulations (GDPR).`,
          `${data.declarations.sanctionsCompliance ? "✓" : "☐"} The applicant confirms compliance with applicable sanctions and export control regulations.`,
        ],
      },
    ],
  });

  // Section 10: Application Fee (if applicable)
  if (data.applicationFee) {
    sections.push({
      title: "Section 10: Application Fee",
      content: [
        {
          type: "keyValue",
          items: [
            {
              key: "Fee Amount",
              value: `${data.applicationFee.amount} ${data.applicationFee.currency}`,
            },
            { key: "Payment Method", value: data.applicationFee.paymentMethod },
            ...(data.applicationFee.paymentReference
              ? [
                  {
                    key: "Payment Reference",
                    value: data.applicationFee.paymentReference,
                  },
                ]
              : []),
          ],
        },
      ],
    });
  }

  // Section 11: Signature Block
  sections.push({
    title: "Section 11: Certification & Signature",
    content: [
      {
        type: "text",
        value: `I, the undersigned, being duly authorized to represent ${data.applicant.legalName}, hereby submit this application for space activity authorization and certify that all statements made herein are true and complete.`,
      },
      { type: "spacer", height: 30 },
      {
        type: "keyValue",
        items: [
          { key: "Name", value: "________________________" },
          { key: "Title", value: "________________________" },
          { key: "Signature", value: "________________________" },
          {
            key: "Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
        ],
      },
      { type: "spacer", height: 20 },
      {
        type: "text",
        value: `Application Reference: ${data.reportNumber}`,
      },
      {
        type: "text",
        value: `Submitted to: National Competent Authority - ${data.applicant.jurisdiction}`,
      },
    ],
  });

  return {
    metadata: {
      reportId: data.reportNumber,
      reportType: "audit_trail", // Using existing type
      title: "Authorization Application",
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Space Activity Authorization Application",
      subtitle: `${data.missionDetails.missionName} - EU Space Act Art. 7-9`,
      reportNumber: data.reportNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "Application form generated by Caelex. Submit to your National Competent Authority.",
    },
    sections,
  };
}

/**
 * Authorization Application PDF Component
 */
interface AuthorizationApplicationPDFProps {
  data: AuthorizationApplicationData;
}

export function AuthorizationApplicationPDF({
  data,
}: AuthorizationApplicationPDFProps) {
  const config = buildAuthorizationApplicationConfig(data);
  return <BaseReport config={config} />;
}
