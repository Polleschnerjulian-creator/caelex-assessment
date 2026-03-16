/**
 * Generate 2.0 — Operator Context Builder
 *
 * Layer 3 of 4: Serializes the operator's assessment data into a structured
 * user message. Selects relevant data based on document category.
 */

import type {
  NCADocumentType,
  Generate2DataBundle,
  DocumentCategory,
} from "../types";
import { NCA_DOC_TYPE_MAP } from "../types";

/**
 * M-4 / M-8 / L-8: Proper category label mapping for all four categories.
 * Previously only handled "debris" and "cybersecurity" via a ternary.
 */
const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  debris: "Debris Mitigation (Title IV)",
  cybersecurity: "Cybersecurity (Title V)",
  general: "General Requirements (Title I-III)",
  safety: "Safety & Environmental (Title VI)",
};

/**
 * Builds a structured operator context string for the AI prompt.
 * Includes operator info always, plus category-specific assessment data.
 */
export function buildOperatorContext(
  docType: NCADocumentType,
  data: Generate2DataBundle,
): string {
  const meta = NCA_DOC_TYPE_MAP[docType];
  const parts: string[] = [];

  // --- Header ---
  parts.push(`## Document Generation Request`);
  parts.push(``);
  parts.push(`**Document:** ${meta.code} — ${meta.title}`);
  parts.push(
    `**Category:** ${CATEGORY_LABELS[meta.category] || meta.category}`,
  );
  parts.push(`**Priority:** ${meta.priority}`);
  parts.push(`**Primary Article Reference:** ${meta.articleRef}`);
  parts.push(``);

  // --- Operator Information (always included) ---
  parts.push(`## Operator Information`);
  parts.push(``);
  parts.push(
    `**Organization Name:** ${data.operator.organizationName || "[ACTION REQUIRED: Organization name not provided]"}`,
  );
  parts.push(
    `**Operator Type:** ${formatOperatorType(data.operator.operatorType) || "[ACTION REQUIRED: Operator type not specified]"}`,
  );
  parts.push(
    `**Establishment Country:** ${data.operator.establishmentCountry || "[ACTION REQUIRED: Country of establishment not specified]"}`,
  );
  parts.push(``);

  // --- Category-specific data ---
  // M-4: For "general" and "safety" categories, include BOTH debris and cybersecurity
  // data since these cross-cutting documents reference both compliance domains.
  if (meta.category === "debris") {
    parts.push(serializeDebrisData(data));
  } else if (meta.category === "cybersecurity") {
    parts.push(serializeCybersecurityData(data));
  } else if (meta.category === "general" || meta.category === "safety") {
    // Cross-cutting categories need visibility into all assessment data
    parts.push(serializeDebrisData(data));
    parts.push(serializeCybersecurityData(data));
  }

  // --- Spacecraft data (relevant for all categories when available) ---
  if (
    meta.category === "debris" ||
    meta.category === "general" ||
    meta.category === "safety" ||
    data.spacecraft.length > 0
  ) {
    parts.push(serializeSpacecraftData(data));
  }

  return parts.join("\n");
}

// ─── Helpers ───

function formatOperatorType(type?: string | null): string | null {
  if (!type) return null;
  const labels: Record<string, string> = {
    SCO: "Satellite Constellation Operator (SCO)",
    LO: "Launch Operator (LO)",
    LSO: "Launch Service Operator (LSO)",
    ISOS: "In-orbit Servicing Operator (ISOS)",
    CAP: "Commercial Applications Provider (CAP)",
    PDP: "Payload Data Provider (PDP)",
    TCO: "Telecommunications Operator (TCO)",
  };
  return labels[type] || type;
}

function serializeDebrisData(data: Generate2DataBundle): string {
  const parts: string[] = [];

  parts.push(`## Debris Assessment Data`);
  parts.push(``);

  if (!data.debris) {
    parts.push(
      `> WARNING: No debris assessment data available. The operator has not completed a debris assessment. Document will be generated with regulatory guidance and industry best practices, but all operator-specific parameters will require manual input.`,
    );
    parts.push(``);
    return parts.join("\n");
  }

  const a = data.debris.assessment;

  parts.push(`### Mission Parameters`);
  parts.push(``);
  parts.push(`| Parameter | Value |`);
  parts.push(`|---|---|`);
  parts.push(`| Mission Name | ${a.missionName || "Not specified"} |`);
  parts.push(`| Orbit Type | ${a.orbitType} |`);
  parts.push(
    `| Altitude | ${a.altitudeKm ? `${a.altitudeKm} km` : "Not specified"} |`,
  );
  parts.push(`| Satellite Count | ${a.satelliteCount} |`);
  parts.push(`| Constellation Tier | ${a.constellationTier} |`);
  parts.push(`| Maneuverability | ${a.hasManeuverability} |`);
  parts.push(`| Propulsion System | ${a.hasPropulsion ? "Yes" : "No"} |`);
  parts.push(
    `| Passivation Capability | ${a.hasPassivationCap ? "Yes" : "No"} |`,
  );
  parts.push(`| Planned Mission Duration | ${a.plannedDurationYears} years |`);
  parts.push(`| Deorbit Strategy | ${a.deorbitStrategy} |`);
  parts.push(
    `| Deorbit Timeline | ${a.deorbitTimelineYears ? `${a.deorbitTimelineYears} years` : "Not specified"} |`,
  );
  parts.push(
    `| Collision Avoidance Provider | ${a.caServiceProvider || "Not specified"} |`,
  );
  parts.push(
    `| Compliance Score | ${a.complianceScore != null ? `${a.complianceScore}%` : "Not assessed"} |`,
  );
  parts.push(``);

  if (data.debris.requirements.length > 0) {
    parts.push(`### Requirement Compliance Status`);
    parts.push(``);
    parts.push(`| Requirement ID | Status | Notes |`);
    parts.push(`|---|---|---|`);
    for (const req of data.debris.requirements) {
      parts.push(
        `| ${req.requirementId} | ${req.status} | ${req.notes || "—"} |`,
      );
    }
    parts.push(``);
  }

  return parts.join("\n");
}

function serializeCybersecurityData(data: Generate2DataBundle): string {
  const parts: string[] = [];

  parts.push(`## Cybersecurity Assessment Data`);
  parts.push(``);

  if (!data.cybersecurity) {
    parts.push(
      `> WARNING: No cybersecurity assessment data available. The operator has not completed a cybersecurity assessment. Document will be generated with regulatory guidance and industry best practices, but all operator-specific parameters will require manual input.`,
    );
    parts.push(``);
    return parts.join("\n");
  }

  const a = data.cybersecurity.assessment;

  parts.push(`### Organization Security Profile`);
  parts.push(``);
  parts.push(`| Parameter | Value |`);
  parts.push(`|---|---|`);
  parts.push(`| Assessment Name | ${a.assessmentName || "Not specified"} |`);
  parts.push(`| Organization Size | ${a.organizationSize} |`);
  parts.push(`| Employee Count | ${a.employeeCount ?? "Not specified"} |`);
  parts.push(`| Space Segment Complexity | ${a.spaceSegmentComplexity} |`);
  parts.push(`| Satellite Count | ${a.satelliteCount ?? "Not specified"} |`);
  parts.push(`| Data Sensitivity Level | ${a.dataSensitivityLevel} |`);
  parts.push(
    `| Existing Certifications | ${a.existingCertifications || "None reported"} |`,
  );
  parts.push(
    `| Dedicated Security Team | ${a.hasSecurityTeam ? "Yes" : "No"} |`,
  );
  parts.push(`| Security Team Size | ${a.securityTeamSize ?? "N/A"} |`);
  parts.push(
    `| Incident Response Plan | ${a.hasIncidentResponsePlan ? "Yes" : "No"} |`,
  );
  parts.push(`| Business Continuity Plan | ${a.hasBCP ? "Yes" : "No"} |`);
  parts.push(
    `| Critical Supplier Count | ${a.criticalSupplierCount ?? "Not specified"} |`,
  );
  parts.push(
    `| Maturity Score | ${a.maturityScore != null ? `${a.maturityScore}%` : "Not assessed"} |`,
  );
  parts.push(
    `| Simplified Regime | ${a.isSimplifiedRegime ? "Yes (Art. 10)" : "No — Full compliance required"} |`,
  );
  parts.push(``);

  if (data.cybersecurity.requirements.length > 0) {
    parts.push(`### Requirement Compliance Status`);
    parts.push(``);
    parts.push(`| Requirement ID | Status | Notes |`);
    parts.push(`|---|---|---|`);
    for (const req of data.cybersecurity.requirements) {
      parts.push(
        `| ${req.requirementId} | ${req.status} | ${req.notes || "—"} |`,
      );
    }
    parts.push(``);
  }

  return parts.join("\n");
}

function serializeSpacecraftData(data: Generate2DataBundle): string {
  const parts: string[] = [];

  parts.push(`## Registered Spacecraft`);
  parts.push(``);

  if (data.spacecraft.length === 0) {
    parts.push(
      `No spacecraft registered in the system. The operator should register their spacecraft for accurate document generation.`,
    );
    parts.push(``);
    return parts.join("\n");
  }

  parts.push(`| Name | NORAD ID | Mission Type |`);
  parts.push(`|---|---|---|`);
  for (const sc of data.spacecraft) {
    parts.push(
      `| ${sc.name} | ${sc.noradId || "Not assigned"} | ${sc.missionType || "Not specified"} |`,
    );
  }
  parts.push(``);

  return parts.join("\n");
}
