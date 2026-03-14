import "server-only";

import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentAuditResult {
  overallScore: number;
  regulationCoverage: {
    score: number;
    missing: string[];
    found: string[];
  };
  thresholdConsistency: {
    score: number;
    mismatches: ThresholdMismatch[];
  };
  sectionCompleteness: {
    score: number;
    missing: string[];
    present: string[];
  };
  recommendations: string[];
}

export interface ThresholdMismatch {
  claim: string;
  expectedValue: string;
  regulationRef: string;
}

interface ReportSection {
  title: string;
  content: string;
}

// ─── Required Regulation References ───────────────────────────────────────────

const REQUIRED_REGULATIONS: Record<string, string[]> = {
  DMP: [
    "eu_space_act_art_64",
    "eu_space_act_art_68",
    "eu_space_act_art_70",
    "eu_space_act_art_72",
    "iadc_5_3_1",
  ],
  CYBER_POLICY: ["nis2_art_21_2_e", "nis2_art_21_2_j", "nis2_art_23"],
  CYBER_RISK_ASSESSMENT: ["nis2_art_21_2_e", "nis2_art_21_2_j"],
  INCIDENT_RESPONSE: ["nis2_art_23"],
  ENVIRONMENTAL_FOOTPRINT: [
    "eu_space_act_art_96",
    "eu_space_act_art_97",
    "eu_space_act_art_98",
  ],
  AUTHORIZATION_APPLICATION: [
    "eu_space_act_art_6",
    "eu_space_act_art_8",
    "eu_space_act_art_10",
  ],
};

const REGULATION_PATTERNS: Record<string, RegExp> = {
  eu_space_act_art_6: /art(?:icle|\.)\s*6\b/i,
  eu_space_act_art_8: /art(?:icle|\.)\s*8\b/i,
  eu_space_act_art_10: /art(?:icle|\.)\s*10\b/i,
  eu_space_act_art_64: /art(?:icle|\.)\s*64\b/i,
  eu_space_act_art_68: /art(?:icle|\.)\s*68\b/i,
  eu_space_act_art_70: /art(?:icle|\.)\s*70\b/i,
  eu_space_act_art_72: /art(?:icle|\.)\s*72\b/i,
  eu_space_act_art_96: /art(?:icle|\.)\s*96\b/i,
  eu_space_act_art_97: /art(?:icle|\.)\s*97\b/i,
  eu_space_act_art_98: /art(?:icle|\.)\s*98\b/i,
  nis2_art_21_2_e:
    /nis2.*art(?:icle|\.)\s*21.*2.*e|art(?:icle|\.)\s*21\s*\(2\)\s*\(e\)/i,
  nis2_art_21_2_j:
    /nis2.*art(?:icle|\.)\s*21.*2.*j|art(?:icle|\.)\s*21\s*\(2\)\s*\(j\)/i,
  nis2_art_23: /nis2.*art(?:icle|\.)\s*23|art(?:icle|\.)\s*23.*nis2/i,
  iadc_5_3_1: /iadc.*5[\.\s]*3[\.\s]*1|iadc\s+guideline/i,
};

// ─── Required Sections ────────────────────────────────────────────────────────

const REQUIRED_SECTIONS: Record<string, string[]> = {
  DMP: [
    "Executive Summary",
    "Passivation Strategy",
    "Disposal Plan",
    "Collision Avoidance",
    "Timeline",
  ],
  CYBER_POLICY: [
    "Executive Summary",
    "Scope",
    "Risk Assessment",
    "Access Control",
    "Incident Response",
  ],
  CYBER_RISK_ASSESSMENT: [
    "Executive Summary",
    "Methodology",
    "Risk Register",
    "Mitigation Measures",
  ],
  INCIDENT_RESPONSE: [
    "Executive Summary",
    "Detection",
    "Containment",
    "Notification Timeline",
    "Recovery",
  ],
  ENVIRONMENTAL_FOOTPRINT: [
    "Executive Summary",
    "Lifecycle Assessment",
    "Emissions",
    "Mitigation",
  ],
  AUTHORIZATION_APPLICATION: [
    "Executive Summary",
    "Operator Profile",
    "Mission Description",
    "Compliance Matrix",
  ],
};

// ─── Audit Functions ──────────────────────────────────────────────────────────

function flattenContent(sections: ReportSection[]): string {
  return sections.map((s) => `${s.title}\n${s.content}`).join("\n");
}

function checkRegulationCoverage(
  fullText: string,
  documentType: string,
): DocumentAuditResult["regulationCoverage"] {
  const required = REQUIRED_REGULATIONS[documentType] ?? [];
  if (required.length === 0) {
    return { score: 100, missing: [], found: [] };
  }

  const found: string[] = [];
  const missing: string[] = [];

  for (const ref of required) {
    const pattern = REGULATION_PATTERNS[ref];
    if (pattern && pattern.test(fullText)) {
      found.push(ref);
    } else {
      missing.push(ref);
    }
  }

  const score =
    required.length > 0
      ? Math.round((found.length / required.length) * 100)
      : 100;

  return { score, missing, found };
}

function checkThresholdConsistency(
  fullText: string,
): DocumentAuditResult["thresholdConsistency"] {
  const mismatches: ThresholdMismatch[] = [];

  const numericClaims = fullText.matchAll(
    /(\d+(?:\.\d+)?)\s*(%|years?|minutes?|SFU)/gi,
  );

  for (const match of numericClaims) {
    const value = parseFloat(match[1]!);
    const unit = match[2]!.toLowerCase().replace(/s$/, "");

    for (const [ref, threshold] of Object.entries(COMPLIANCE_THRESHOLDS)) {
      const thresholdUnit = threshold.unit.toLowerCase().replace(/s$/, "");

      if (unit === "%" && thresholdUnit === "%") {
        if (
          threshold.type === "ABOVE" &&
          value < threshold.threshold &&
          value > 0
        ) {
          mismatches.push({
            claim: `${value}%`,
            expectedValue: `≥${threshold.threshold}% (${threshold.name})`,
            regulationRef: ref,
          });
        }
      } else if (unit === "year" && thresholdUnit === "year") {
        if (threshold.type === "BELOW" && value > threshold.threshold) {
          mismatches.push({
            claim: `${value} years`,
            expectedValue: `≤${threshold.threshold} years (${threshold.name})`,
            regulationRef: ref,
          });
        }
      } else if (unit === "minute" && thresholdUnit === "minute") {
        if (threshold.type === "BELOW" && value > threshold.threshold) {
          mismatches.push({
            claim: `${value} minutes`,
            expectedValue: `≤${threshold.threshold} minutes (${threshold.name})`,
            regulationRef: ref,
          });
        }
      }
    }
  }

  const score =
    mismatches.length === 0 ? 100 : Math.max(0, 100 - mismatches.length * 25);

  return { score, mismatches };
}

function checkSectionCompleteness(
  sections: ReportSection[],
  documentType: string,
): DocumentAuditResult["sectionCompleteness"] {
  const required = REQUIRED_SECTIONS[documentType] ?? [];
  if (required.length === 0) {
    return { score: 100, missing: [], present: [] };
  }

  const sectionTitles = sections.map((s) => s.title.toLowerCase());

  const present: string[] = [];
  const missing: string[] = [];

  for (const requiredTitle of required) {
    const found = sectionTitles.some(
      (title) =>
        title.includes(requiredTitle.toLowerCase()) ||
        requiredTitle.toLowerCase().includes(title),
    );
    if (found) {
      present.push(requiredTitle);
    } else {
      missing.push(requiredTitle);
    }
  }

  const score =
    required.length > 0
      ? Math.round((present.length / required.length) * 100)
      : 100;

  return { score, missing, present };
}

// ─── Main Audit Function ──────────────────────────────────────────────────────

export function auditDocument(
  sections: ReportSection[],
  documentType: string,
): DocumentAuditResult {
  const fullText = flattenContent(sections);

  const regulationCoverage = checkRegulationCoverage(fullText, documentType);
  const thresholdConsistency = checkThresholdConsistency(fullText);
  const sectionCompleteness = checkSectionCompleteness(sections, documentType);

  const overallScore = Math.round(
    regulationCoverage.score * 0.4 +
      thresholdConsistency.score * 0.3 +
      sectionCompleteness.score * 0.3,
  );

  const recommendations: string[] = [];

  if (regulationCoverage.missing.length > 0) {
    recommendations.push(
      `Add references to: ${regulationCoverage.missing.join(", ")}`,
    );
  }

  for (const mismatch of thresholdConsistency.mismatches) {
    recommendations.push(
      `Check claim "${mismatch.claim}" — expected ${mismatch.expectedValue}`,
    );
  }

  if (sectionCompleteness.missing.length > 0) {
    recommendations.push(
      `Add missing sections: ${sectionCompleteness.missing.join(", ")}`,
    );
  }

  return {
    overallScore,
    regulationCoverage,
    thresholdConsistency,
    sectionCompleteness,
    recommendations,
  };
}
