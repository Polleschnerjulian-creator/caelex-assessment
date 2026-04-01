/**
 * EU Declaration of Conformity — CRA Art. 28
 *
 * Generates a formal EU Declaration of Conformity document as required
 * by Regulation (EU) 2024/2847 (Cyber Resilience Act), Article 28.
 *
 * This is a regulatory document intended for Notified Bodies and market
 * surveillance authorities. All text is in English (regulatory language).
 */

import type { ReportSection, ReportSectionContent } from "../types";

// ─── Input Data ─────────────────────────────────────────────────────────────

export interface CRAAssessmentData {
  productName: string;
  productVersion: string | null;
  productClassification: string;
  conformityRoute: string;
  classificationReasoning: Array<{
    criterion: string;
    legalBasis: string;
    satisfied: boolean;
    reasoning: string;
  }>;
  organizationName: string;
  maturityScore: number | null;
  requirementStats: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
  };
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLASSIFICATION_LABELS: Record<string, string> = {
  default: "Default Category",
  class_I: "Class I (Annex III)",
  class_II: "Class II (Annex IV)",
};

const CONFORMITY_ROUTE_LABELS: Record<string, string> = {
  self_assessment: "Internal Control (Module A) — Self-Assessment",
  harmonised_standard:
    "Harmonised Standard / Third-Party Assessment (Module B+C or H)",
  third_party_type_exam:
    "EU-Type Examination (Module B) + Conformity to Type (Module C)",
  full_quality_assurance: "Full Quality Assurance (Module H)",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function generateDocumentNumber(createdAt: string): string {
  const d = new Date(createdAt);
  const yr = d.getFullYear();
  const seq = Math.floor(d.getTime() / 1000) % 100000;
  return `CRA-DoC-${yr}-${String(seq).padStart(5, "0")}`;
}

// ─── Section Generator ──────────────────────────────────────────────────────

export function generateCRADeclarationSections(
  assessment: CRAAssessmentData,
): ReportSection[] {
  const docNumber = generateDocumentNumber(assessment.createdAt);
  const classLabel =
    CLASSIFICATION_LABELS[assessment.productClassification] ||
    assessment.productClassification;
  const routeLabel =
    CONFORMITY_ROUTE_LABELS[assessment.conformityRoute] ||
    assessment.conformityRoute;
  const issuedDate = formatDate(assessment.createdAt);

  const needsNotifiedBody =
    assessment.conformityRoute === "third_party_type_exam" ||
    assessment.conformityRoute === "full_quality_assurance" ||
    (assessment.productClassification === "class_I" &&
      assessment.conformityRoute === "harmonised_standard");

  const sections: ReportSection[] = [];

  // ─── Cover: EU Declaration of Conformity ───

  sections.push({
    title: "EU DECLARATION OF CONFORMITY",
    content: [
      {
        type: "text",
        value:
          "Pursuant to Article 28 of Regulation (EU) 2024/2847 of the European Parliament and of the Council (Cyber Resilience Act)",
      },
      { type: "spacer", height: 8 },
      {
        type: "keyValue",
        items: [
          { key: "Document Number", value: docNumber },
          { key: "Date of Issue", value: issuedDate },
          { key: "Regulation", value: "Regulation (EU) 2024/2847 (CRA)" },
        ],
      },
    ],
  });

  // ─── Section 1: Manufacturer Information ───

  sections.push({
    title: "1. Manufacturer Information",
    content: [
      {
        type: "text",
        value:
          "The manufacturer identified below hereby declares that the product with digital elements described in Section 2 conforms to the essential requirements set out in Annex I of Regulation (EU) 2024/2847.",
      },
      { type: "spacer", height: 4 },
      {
        type: "keyValue",
        items: [
          {
            key: "Manufacturer / Economic Operator",
            value: assessment.organizationName,
          },
          {
            key: "EU Establishment",
            value: "See company registration records",
          },
          {
            key: "Authorised Representative",
            value: "[To be completed by manufacturer]",
          },
          { key: "Contact", value: "[To be completed by manufacturer]" },
        ],
      },
    ],
  });

  // ─── Section 2: Product Identification ───

  sections.push({
    title: "2. Product Identification",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Product Name", value: assessment.productName },
          {
            key: "Product Version",
            value: assessment.productVersion || "Not specified",
          },
          {
            key: "Product Type",
            value: "Product with digital elements (Art. 3(1) CRA)",
          },
          {
            key: "Unique Identification",
            value:
              "[To be completed — serial number, batch, or other identifier]",
          },
        ],
      },
      { type: "spacer", height: 4 },
      {
        type: "text",
        value:
          "The product identified above allows the manufacturer or other economic operators to electronically identify the product in accordance with Article 28(2)(a) of the CRA.",
      },
    ],
  });

  // ─── Section 3: Classification & Conformity Route ───

  const classificationContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        { key: "Product Classification", value: classLabel },
        { key: "Conformity Assessment Route", value: routeLabel },
      ],
    },
    { type: "spacer", height: 4 },
  ];

  if (assessment.productClassification === "default") {
    classificationContent.push({
      type: "text",
      value:
        "This product falls under the Default category. The manufacturer has performed an internal control conformity assessment procedure (Module A) in accordance with Article 32(2) of the CRA.",
    });
  } else if (assessment.productClassification === "class_I") {
    if (assessment.conformityRoute === "self_assessment") {
      classificationContent.push({
        type: "text",
        value:
          "This product is classified as Class I (Annex III). The manufacturer has applied harmonised standards covering the essential requirements of Annex I and has therefore performed a self-assessment pursuant to Article 32(3)(a) of the CRA.",
      });
    } else {
      classificationContent.push({
        type: "text",
        value:
          "This product is classified as Class I (Annex III). The conformity assessment has been performed through third-party assessment in accordance with Article 32(3)(b) or (c) of the CRA.",
      });
    }
  } else if (assessment.productClassification === "class_II") {
    classificationContent.push({
      type: "text",
      value:
        "This product is classified as Class II (Annex IV). The conformity assessment has been performed through EU-type examination (Module B + C) or full quality assurance (Module H) in accordance with Article 32(4) of the CRA.",
    });
  }

  sections.push({
    title: "3. Classification & Conformity Assessment Route",
    content: classificationContent,
  });

  // ─── Section 4: Classification Reasoning Chain ───

  const reasoningContent: ReportSectionContent[] = [
    {
      type: "text",
      value:
        "The following classification criteria were evaluated in accordance with Annexes III and IV of the CRA to determine the product classification:",
    },
    { type: "spacer", height: 4 },
  ];

  if (assessment.classificationReasoning.length > 0) {
    reasoningContent.push({
      type: "table",
      headers: ["Criterion", "Legal Basis", "Satisfied", "Reasoning"],
      rows: assessment.classificationReasoning.map((step) => [
        step.criterion,
        step.legalBasis,
        step.satisfied ? "Yes" : "No",
        step.reasoning,
      ]),
    });
  } else {
    reasoningContent.push({
      type: "text",
      value:
        "No specific classification criteria were flagged. The product defaults to the Default category.",
    });
  }

  sections.push({
    title: "4. Classification Reasoning Chain",
    content: reasoningContent,
  });

  // ─── Section 5: Applied Standards ───

  const standardsContent: ReportSectionContent[] = [
    {
      type: "text",
      value:
        "The following harmonised standards, common specifications, or European cybersecurity certification schemes have been applied in the conformity assessment:",
    },
    { type: "spacer", height: 4 },
    {
      type: "list",
      items: [
        "EN IEC 62443 series — Industrial communication networks / IT security (where applicable)",
        "ETSI EN 303 645 — Cyber Security for Consumer Internet of Things (where applicable)",
        "ISO/IEC 27001 — Information Security Management Systems (where applicable)",
        "Common Criteria (ISO/IEC 15408) — Evaluation Criteria for IT Security (where applicable)",
      ],
    },
    { type: "spacer", height: 4 },
    {
      type: "alert",
      severity: "info",
      message:
        "Where harmonised standards have not yet been published in the Official Journal of the European Union, the manufacturer has applied the essential requirements directly as set out in Annex I of the CRA, supplemented by available technical specifications.",
    },
  ];

  sections.push({
    title: "5. Applied Standards & Specifications",
    content: standardsContent,
  });

  // ─── Section 6: Compliance Statement ───

  const complianceContent: ReportSectionContent[] = [
    {
      type: "text",
      value:
        "The manufacturer hereby declares that the product with digital elements identified in Section 2 of this declaration:",
    },
    { type: "spacer", height: 4 },
    {
      type: "list",
      items: [
        "Complies with the essential cybersecurity requirements set out in Part I of Annex I of Regulation (EU) 2024/2847 (Cyber Resilience Act).",
        "Complies with the vulnerability handling requirements set out in Part II of Annex I of Regulation (EU) 2024/2847.",
        "Has been subject to a conformity assessment procedure as specified in Article 32 of the CRA.",
        "The technical documentation has been drawn up in accordance with Article 31 of the CRA.",
      ],
      ordered: true,
    },
    { type: "spacer", height: 6 },
    {
      type: "keyValue",
      items: [
        {
          key: "Compliance Maturity Score",
          value:
            assessment.maturityScore !== null
              ? `${assessment.maturityScore}%`
              : "Not yet assessed",
        },
        {
          key: "Requirements Assessed",
          value: `${assessment.requirementStats.total} total`,
        },
        {
          key: "Compliant",
          value: `${assessment.requirementStats.compliant} of ${assessment.requirementStats.total}`,
        },
        {
          key: "Partially Compliant",
          value: `${assessment.requirementStats.partial} of ${assessment.requirementStats.total}`,
        },
        {
          key: "Non-Compliant",
          value: `${assessment.requirementStats.nonCompliant} of ${assessment.requirementStats.total}`,
        },
      ],
    },
  ];

  if (needsNotifiedBody) {
    complianceContent.push({ type: "spacer", height: 6 });
    complianceContent.push({
      type: "heading",
      value: "Notified Body",
      level: 2,
    });
    complianceContent.push({
      type: "keyValue",
      items: [
        {
          key: "Notified Body Name",
          value: "[To be completed — name of the Notified Body]",
        },
        {
          key: "Notified Body Number",
          value: "[To be completed — four-digit NB number]",
        },
        {
          key: "Certificate Number",
          value: "[To be completed — EU-type examination certificate number]",
        },
        {
          key: "Date of Certificate",
          value: "[To be completed]",
        },
      ],
    });
    complianceContent.push({
      type: "alert",
      severity: "warning",
      message:
        "This product requires third-party conformity assessment. The Notified Body details above must be completed before this declaration is valid.",
    });
  }

  sections.push({
    title: "6. Compliance Statement",
    content: complianceContent,
  });

  // ─── Section 7: Signature Block ───

  sections.push({
    title: "7. Signature & CE Marking",
    content: [
      {
        type: "text",
        value:
          "This declaration of conformity is issued under the sole responsibility of the manufacturer identified in Section 1.",
      },
      { type: "spacer", height: 4 },
      {
        type: "keyValue",
        items: [
          { key: "Place of Issue", value: "[To be completed by manufacturer]" },
          { key: "Date of Issue", value: issuedDate },
          { key: "Signed By", value: "[Name, function — to be completed]" },
          { key: "Signature", value: "________________________" },
        ],
      },
      { type: "spacer", height: 8 },
      { type: "divider" },
      { type: "spacer", height: 4 },
      {
        type: "heading",
        value: "CE Marking",
        level: 2,
      },
      {
        type: "text",
        value:
          "The CE marking has been affixed to the product in accordance with Article 27 of Regulation (EU) 2024/2847. The CE marking is affixed visibly, legibly, and indelibly to the product with digital elements, or where that is not possible or warranted, to its packaging or accompanying documentation.",
      },
      needsNotifiedBody
        ? {
            type: "text",
            value: `The CE marking is accompanied by the identification number of the Notified Body involved in the conformity assessment procedure: [NB Number].`,
          }
        : {
            type: "text",
            value:
              "No Notified Body identification number is required for this conformity assessment route.",
          },
      { type: "spacer", height: 8 },
      { type: "divider" },
      { type: "spacer", height: 4 },
      {
        type: "alert",
        severity: "info",
        message:
          "This document has been generated by Caelex Compliance Platform for assessment purposes. Fields marked '[To be completed]' must be filled in by the manufacturer before this declaration has regulatory effect. This is not legal advice — consult qualified counsel.",
      },
      { type: "spacer", height: 4 },
      {
        type: "keyValue",
        items: [
          { key: "Document Reference", value: docNumber },
          { key: "Generated By", value: "Caelex Compliance Platform" },
          { key: "Platform Version", value: "1.0" },
        ],
      },
    ],
  });

  return sections;
}
