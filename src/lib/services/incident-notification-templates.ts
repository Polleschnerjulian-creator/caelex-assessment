/**
 * NCA Notification Draft Templates
 *
 * Template-based (zero AI cost) generation of NCA notification drafts
 * per NIS2 Art. 23(4) phases. Auto-fills from incident data.
 */

import "server-only";

// ─── Types ───

interface IncidentData {
  incidentNumber: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  detectedAt: string;
  detectedBy: string;
  detectionMethod: string;
  rootCause: string | null;
  impactAssessment: string | null;
  immediateActions: string[];
  containmentMeasures: string[];
  resolutionSteps: string[];
  lessonsLearned: string | null;
  affectedAssets: Array<{
    assetName: string;
    cosparId?: string | null;
    noradId?: string | null;
  }>;
  reportedToNCA: boolean;
  ncaReferenceNumber: string | null;
  resolvedAt: string | null;
}

type NIS2Phase =
  | "early_warning"
  | "notification"
  | "intermediate_report"
  | "final_report";

// ─── Category Labels ───

const CATEGORY_LABELS: Record<string, string> = {
  loss_of_contact: "Loss of Contact / Control",
  debris_generation: "Debris Generation Event",
  cyber_incident: "Cybersecurity Incident",
  spacecraft_anomaly: "Spacecraft Anomaly",
  conjunction_event: "Conjunction / Close Approach Event",
  regulatory_breach: "Regulatory Non-Compliance",
  nis2_significant_incident: "NIS2 Significant Incident",
  nis2_near_miss: "NIS2 Near Miss",
  other: "Other Operational Incident",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

// ─── Template Generator ───

export function generateNCANotificationDraft(
  phase: NIS2Phase,
  incident: IncidentData,
): { title: string; content: string; legalBasis: string } {
  switch (phase) {
    case "early_warning":
      return generateEarlyWarning(incident);
    case "notification":
      return generateNotification(incident);
    case "intermediate_report":
      return generateIntermediateReport(incident);
    case "final_report":
      return generateFinalReport(incident);
    default:
      throw new Error(`Unknown NIS2 phase: ${phase}`);
  }
}

// ─── Early Warning Template — Art. 23(4)(a) ───

function generateEarlyWarning(incident: IncidentData): {
  title: string;
  content: string;
  legalBasis: string;
} {
  const assets = incident.affectedAssets
    .map((a) => {
      const ids = [
        a.cosparId && `COSPAR: ${a.cosparId}`,
        a.noradId && `NORAD: ${a.noradId}`,
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${a.assetName}${ids ? ` (${ids})` : ""}`;
    })
    .join("\n");

  const content = `EARLY WARNING — NIS2 Art. 23(4)(a)
Incident Reference: ${incident.incidentNumber}
Submitted: ${new Date().toISOString()}
${incident.ncaReferenceNumber ? `NCA Reference: ${incident.ncaReferenceNumber}` : ""}

1. INCIDENT TYPE
Category: ${CATEGORY_LABELS[incident.category] || incident.category}
Severity: ${SEVERITY_LABELS[incident.severity] || incident.severity}

2. DETECTION
Date/Time of Detection: ${incident.detectedAt}
Detected By: ${incident.detectedBy}
Detection Method: ${incident.detectionMethod}

3. INCIDENT DESCRIPTION
${incident.title}

${incident.description}

4. AFFECTED ASSETS / SERVICES
${assets || "No specific assets identified yet."}

5. SUSPECTED CAUSE
${incident.rootCause || "Under investigation. Root cause analysis in progress."}

6. CROSS-BORDER IMPACT ASSESSMENT
${incident.impactAssessment || "Initial assessment pending. Cross-border impact being evaluated."}

7. IMMEDIATE MEASURES TAKEN
${incident.immediateActions.length > 0 ? incident.immediateActions.map((a) => `- ${a}`).join("\n") : "Immediate containment measures being implemented."}

---
This is an early warning pursuant to Article 23(4)(a) of Directive (EU) 2022/2555 (NIS2).
A full incident notification will follow within 72 hours of detection.`;

  return {
    title: `Early Warning: ${incident.incidentNumber} — ${incident.title}`,
    content,
    legalBasis: "NIS2 Directive Art. 23(4)(a) — Early warning within 24 hours",
  };
}

// ─── Notification Template — Art. 23(4)(b) ───

function generateNotification(incident: IncidentData): {
  title: string;
  content: string;
  legalBasis: string;
} {
  const assets = incident.affectedAssets
    .map((a) => {
      const ids = [
        a.cosparId && `COSPAR: ${a.cosparId}`,
        a.noradId && `NORAD: ${a.noradId}`,
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${a.assetName}${ids ? ` (${ids})` : ""}`;
    })
    .join("\n");

  const content = `INCIDENT NOTIFICATION — NIS2 Art. 23(4)(b)
Incident Reference: ${incident.incidentNumber}
Submitted: ${new Date().toISOString()}
${incident.ncaReferenceNumber ? `NCA Reference: ${incident.ncaReferenceNumber}` : ""}

1. UPDATED ASSESSMENT
Category: ${CATEGORY_LABELS[incident.category] || incident.category}
Severity Classification: ${SEVERITY_LABELS[incident.severity] || incident.severity}

2. INCIDENT DESCRIPTION (UPDATED)
${incident.title}

${incident.description}

3. AFFECTED SYSTEMS AND ASSETS
${assets || "No specific assets identified."}

4. INITIAL IMPACT ASSESSMENT
${incident.impactAssessment || "Impact assessment in progress."}

5. ROOT CAUSE / INDICATORS OF COMPROMISE
${incident.rootCause || "Root cause analysis ongoing."}

6. PRELIMINARY MEASURES TAKEN
Immediate Actions:
${incident.immediateActions.length > 0 ? incident.immediateActions.map((a) => `- ${a}`).join("\n") : "- Initial response in progress"}

Containment Measures:
${incident.containmentMeasures.length > 0 ? incident.containmentMeasures.map((m) => `- ${m}`).join("\n") : "- Containment measures being implemented"}

---
This is an incident notification pursuant to Article 23(4)(b) of Directive (EU) 2022/2555 (NIS2).
A final report will be submitted within one month of this notification.`;

  return {
    title: `Incident Notification: ${incident.incidentNumber} — ${incident.title}`,
    content,
    legalBasis:
      "NIS2 Directive Art. 23(4)(b) — Incident notification within 72 hours",
  };
}

// ─── Intermediate Report Template — Art. 23(4)(c) ───

function generateIntermediateReport(incident: IncidentData): {
  title: string;
  content: string;
  legalBasis: string;
} {
  const content = `INTERMEDIATE REPORT — NIS2 Art. 23(4)(c)
Incident Reference: ${incident.incidentNumber}
Submitted: ${new Date().toISOString()}
${incident.ncaReferenceNumber ? `NCA Reference: ${incident.ncaReferenceNumber}` : ""}

1. STATUS UPDATE
Current Status: ${incident.resolvedAt ? "Resolved" : "Ongoing"}
Severity: ${SEVERITY_LABELS[incident.severity] || incident.severity}

2. INVESTIGATION FINDINGS
${incident.rootCause || "Investigation ongoing. Preliminary findings being compiled."}

3. IMPACT UPDATE
${incident.impactAssessment || "Impact assessment continues to be refined."}

4. MEASURES IN PLACE
Containment:
${incident.containmentMeasures.length > 0 ? incident.containmentMeasures.map((m) => `- ${m}`).join("\n") : "- Containment measures ongoing"}

Resolution Steps:
${incident.resolutionSteps.length > 0 ? incident.resolutionSteps.map((s) => `- ${s}`).join("\n") : "- Resolution plan being developed"}

---
This intermediate report is provided pursuant to Article 23(4)(c) of Directive (EU) 2022/2555 (NIS2),
upon request of the CSIRT or competent authority.`;

  return {
    title: `Intermediate Report: ${incident.incidentNumber} — ${incident.title}`,
    content,
    legalBasis:
      "NIS2 Directive Art. 23(4)(c) — Intermediate report upon request",
  };
}

// ─── Final Report Template — Art. 23(4)(d) ───

function generateFinalReport(incident: IncidentData): {
  title: string;
  content: string;
  legalBasis: string;
} {
  const assets = incident.affectedAssets
    .map((a) => {
      const ids = [
        a.cosparId && `COSPAR: ${a.cosparId}`,
        a.noradId && `NORAD: ${a.noradId}`,
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${a.assetName}${ids ? ` (${ids})` : ""}`;
    })
    .join("\n");

  const content = `FINAL REPORT — NIS2 Art. 23(4)(d)
Incident Reference: ${incident.incidentNumber}
Submitted: ${new Date().toISOString()}
${incident.ncaReferenceNumber ? `NCA Reference: ${incident.ncaReferenceNumber}` : ""}

1. DETAILED INCIDENT DESCRIPTION
${incident.title}

${incident.description}

Detection: ${incident.detectedAt} (by ${incident.detectedBy}, method: ${incident.detectionMethod})
${incident.resolvedAt ? `Resolution: ${incident.resolvedAt}` : "Status: Ongoing"}

2. ROOT CAUSE ANALYSIS
${incident.rootCause || "Root cause could not be conclusively determined during the investigation period."}

3. AFFECTED SYSTEMS AND ASSETS
${assets || "No specific assets identified."}

4. IMPACT ASSESSMENT
${incident.impactAssessment || "No material impact beyond initial disruption."}

5. APPLIED MITIGATION MEASURES
Immediate Actions:
${incident.immediateActions.length > 0 ? incident.immediateActions.map((a) => `- ${a}`).join("\n") : "- None recorded"}

Containment Measures:
${incident.containmentMeasures.length > 0 ? incident.containmentMeasures.map((m) => `- ${m}`).join("\n") : "- None recorded"}

Resolution Steps:
${incident.resolutionSteps.length > 0 ? incident.resolutionSteps.map((s) => `- ${s}`).join("\n") : "- None recorded"}

6. CROSS-BORDER IMPACT
${incident.impactAssessment || "No cross-border impact identified."}

7. LESSONS LEARNED
${incident.lessonsLearned || "Lessons learned review to be completed during post-mortem."}

8. PREVENTIVE MEASURES
Based on the root cause analysis, the following preventive measures are recommended:
- Review and update incident response procedures
- Enhance monitoring for similar incident patterns
- Update risk assessment to incorporate findings

---
This is a final report pursuant to Article 23(4)(d) of Directive (EU) 2022/2555 (NIS2),
submitted within one month of the incident notification.`;

  return {
    title: `Final Report: ${incident.incidentNumber} — ${incident.title}`,
    content,
    legalBasis:
      "NIS2 Directive Art. 23(4)(d) — Final report within 1 month of notification",
  };
}
