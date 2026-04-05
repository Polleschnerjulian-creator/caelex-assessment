import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

// ─── NCA Definitions ─────────────────────────────────────────────────────────

const NCA_LABELS: Record<string, string> = {
  CNES: "Centre National d'Etudes Spatiales -- FSOA Technical Regulation",
  RDI: "Rijksoverheid -- Netherlands Space Activities Act",
  MINISTRY_LU: "Ministry of the Economy -- Luxembourg Space Law",
  BELSPO: "Belgian Science Policy Office -- Belgian Space Law",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HazardMitigationData {
  id: string;
  type: string;
  description: string;
  implementedAt: string | null;
  verifiedBy: string | null;
}

export interface HazardEntryData {
  id: string;
  hazardId: string;
  hazardType: string;
  title: string;
  description: string;
  severity: string;
  likelihood: number;
  riskIndex: number;
  mitigationStatus: string;
  residualRisk: string | null;
  regulatoryRefs: string[];
  fmecaNotes: string | null;
  acceptanceStatus: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  verityAttestationId: string | null;
  mitigations: HazardMitigationData[];
}

export interface SpacecraftData {
  id: string;
  name: string;
  noradId: string | null;
  cosparId: string | null;
  missionType: string;
  orbitType: string;
  altitudeKm: number | null;
  inclinationDeg: number | null;
  launchDate: string | null;
  endOfLifeDate: string | null;
  status: string;
  description: string | null;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
}

export interface EphemerisData {
  overallScore: number | null;
  horizonDays: number | null;
  horizonRegulation: string | null;
  dataFreshness: string | null;
  forecastHorizonDays: number | null;
  f107Used: number | null;
  modelVersion: string | null;
}

export interface ConjunctionData {
  id: string;
  conjunctionId: string;
  threatObjectName: string | null;
  threatObjectType: string;
  riskTier: string;
  status: string;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: string;
  decision: string | null;
}

export interface DebrisData {
  missionName: string | null;
  orbitType: string;
  complianceScore: number | null;
  deorbitStrategy: string;
  deorbitTimelineYears: number | null;
  hasPassivationCap: boolean;
}

export interface HazardReportData {
  // Header info
  reportNumber: string;
  reportDate: Date;
  version: string;
  generatedBy: string;

  // Target NCA
  targetNCA: string;
  language: string;

  // Entities
  spacecraft: SpacecraftData;
  organization: OrganizationData;
  hazards: HazardEntryData[];

  // Optional data sources
  ephemeris: EphemerisData | null;
  conjunctions: ConjunctionData[];
  debris: DebrisData | null;
}

// ─── Build Report Config ─────────────────────────────────────────────────────

export function buildHazardReportConfig(data: HazardReportData): ReportConfig {
  const sections: ReportSection[] = [];
  const ncaLabel = NCA_LABELS[data.targetNCA] || data.targetNCA;

  // ─── Chapter 0: Document Cover ───
  sections.push({
    title: "0. Document Information",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Operator", value: data.organization.name },
          { key: "Mission / Spacecraft", value: data.spacecraft.name },
          { key: "Target NCA", value: ncaLabel },
          {
            key: "Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
          { key: "Version", value: data.version },
          { key: "Document ID", value: data.reportNumber },
        ],
      },
    ],
  });

  // ─── Chapter 1: Mission Overview ───
  sections.push({
    title: "1. Mission Overview",
    content: [
      { type: "heading", value: "1.1 Orbital Parameters", level: 2 },
      {
        type: "table",
        headers: ["Parameter", "Value"],
        rows: [
          ["Spacecraft Name", data.spacecraft.name],
          ["NORAD ID", data.spacecraft.noradId || "Not assigned"],
          ["COSPAR ID", data.spacecraft.cosparId || "Not assigned"],
          ["Mission Type", data.spacecraft.missionType],
          ["Orbit Type", data.spacecraft.orbitType],
          [
            "Altitude",
            data.spacecraft.altitudeKm
              ? `${data.spacecraft.altitudeKm} km`
              : "N/A",
          ],
          [
            "Inclination",
            data.spacecraft.inclinationDeg
              ? `${data.spacecraft.inclinationDeg} deg`
              : "N/A",
          ],
          ["Status", data.spacecraft.status],
          [
            "Launch Date",
            data.spacecraft.launchDate
              ? new Date(data.spacecraft.launchDate).toLocaleDateString("en-GB")
              : "TBD",
          ],
          [
            "End of Life Date",
            data.spacecraft.endOfLifeDate
              ? new Date(data.spacecraft.endOfLifeDate).toLocaleDateString(
                  "en-GB",
                )
              : "TBD",
          ],
        ],
      },
      { type: "heading", value: "1.2 Operator Information", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Organization", value: data.organization.name },
          { key: "Organization ID", value: data.organization.slug },
        ],
      },
      { type: "heading", value: "1.3 Mission Phases", level: 2 },
      {
        type: "list",
        items: [
          `Pre-launch / Design Phase${data.spacecraft.status === "PRE_LAUNCH" ? " (current)" : ""}`,
          `Launch and Early Orbit Phase (LEOP)${data.spacecraft.status === "LAUNCHED" ? " (current)" : ""}`,
          `Operational Phase${data.spacecraft.status === "OPERATIONAL" ? " (current)" : ""}`,
          `End-of-Life / Disposal Phase${data.spacecraft.status === "DECOMMISSIONING" || data.spacecraft.status === "DEORBITED" ? " (current)" : ""}`,
        ],
        ordered: true,
      },
    ],
  });

  // ─── Chapter 2: Applicable Safety Requirements ───
  sections.push({
    title: "2. Applicable Safety Requirements",
    content: [
      {
        type: "text",
        value:
          "This hazard report has been prepared in accordance with the following standards and regulatory frameworks:",
      },
      {
        type: "list",
        items: [
          "FSOA Technical Regulations -- French Space Operations Act (Loi relative aux Operations Spatiales)",
          "ECSS-Q-ST-40-02C -- Space product assurance: Hazard analysis",
          "IADC Space Debris Mitigation Guidelines (2020 revision)",
          "ISO 24113:2019 -- Space debris mitigation requirements",
          "UN COPUOS Space Debris Mitigation Guidelines",
        ],
      },
      { type: "heading", value: "2.1 Quantitative Safety Limits", level: 2 },
      {
        type: "table",
        headers: ["Safety Metric", "Threshold", "Source"],
        rows: [
          [
            "Expected Casualties (EC)",
            "< 1:10,000 per re-entry event",
            "FSOA Art. 34",
          ],
          [
            "Deorbit Timeline",
            "< 25 years post-mission (5-year target)",
            "IADC / EU Space Act",
          ],
          [
            "Collision Probability",
            "< 1:1,000 per conjunction event",
            "ECSS / IADC",
          ],
          [
            "Explosion Probability",
            "Passivation required at end-of-life",
            "ISO 24113",
          ],
        ],
      },
      {
        type: "alert",
        severity: "info",
        message: `Target National Competent Authority: ${ncaLabel}`,
      },
    ],
  });

  // ─── Chapter 3: Hazard Log ───
  const hazardRows = data.hazards.map((h) => [
    h.hazardId,
    h.hazardType,
    h.severity,
    h.likelihood.toString(),
    h.riskIndex.toString(),
    h.mitigationStatus,
  ]);

  sections.push({
    title: "3. Hazard Log",
    content: [
      {
        type: "text",
        value: `A total of ${data.hazards.length} hazard(s) have been identified and tracked for this mission.`,
      },
      {
        type: "table",
        headers: [
          "Hazard ID",
          "Type",
          "Severity",
          "Likelihood",
          "Risk Index",
          "Status",
        ],
        rows: hazardRows,
      },
      { type: "heading", value: "3.1 Risk Matrix", level: 2 },
      {
        type: "text",
        value:
          "Hazards are assessed using a 4x5 risk matrix. Severity follows ECSS-Q-ST-40-02C classification: CATASTROPHIC (4), CRITICAL (3), MARGINAL (2), NEGLIGIBLE (1). Likelihood is scored 1-5 (Improbable to Frequent). The Risk Index is computed as Severity Score x Likelihood.",
      },
      {
        type: "table",
        headers: [
          "Severity \\ Likelihood",
          "1 (Improbable)",
          "2 (Remote)",
          "3 (Occasional)",
          "4 (Probable)",
          "5 (Frequent)",
        ],
        rows: [
          ["CATASTROPHIC (4)", "4", "8", "12", "16", "20"],
          ["CRITICAL (3)", "3", "6", "9", "12", "15"],
          ["MARGINAL (2)", "2", "4", "6", "8", "10"],
          ["NEGLIGIBLE (1)", "1", "2", "3", "4", "5"],
        ],
      },
      { type: "heading", value: "3.2 Regulatory Mapping", level: 2 },
      ...data.hazards.map((h) => ({
        type: "text" as const,
        value: `${h.hazardId} (${h.title}): ${h.regulatoryRefs.length > 0 ? h.regulatoryRefs.join(", ") : "No regulatory references mapped"}`,
      })),
    ],
  });

  // ─── Chapter 4: Quantitative Risk Assessment ───
  const ch4Content: ReportSection["content"] = [];

  // 4.1 Orbital Decay
  ch4Content.push({ type: "heading", value: "4.1 Orbital Decay", level: 2 });
  if (data.ephemeris) {
    ch4Content.push({
      type: "keyValue",
      items: [
        {
          key: "Compliance Score",
          value:
            data.ephemeris.overallScore !== null
              ? `${data.ephemeris.overallScore}/100`
              : "N/A",
        },
        {
          key: "Compliance Horizon",
          value:
            data.ephemeris.horizonDays !== null
              ? `${data.ephemeris.horizonDays} days until predicted breach`
              : "No breach predicted within forecast window",
        },
        {
          key: "First Breach Regulation",
          value: data.ephemeris.horizonRegulation || "None",
        },
        {
          key: "Data Freshness",
          value: data.ephemeris.dataFreshness || "Unknown",
        },
        {
          key: "Forecast Model Version",
          value: data.ephemeris.modelVersion || "N/A",
        },
        {
          key: "F10.7 Solar Flux",
          value:
            data.ephemeris.f107Used !== null
              ? data.ephemeris.f107Used.toString()
              : "N/A",
        },
      ],
    });
  } else {
    ch4Content.push({
      type: "alert",
      severity: "warning",
      message:
        "No ephemeris data available. Orbital decay analysis requires ephemeris forecasting to be configured for this spacecraft.",
    });
  }

  // 4.2 Re-entry Casualty
  ch4Content.push({
    type: "heading",
    value: "4.2 Re-entry Casualty Risk",
    level: 2,
  });
  if (data.debris) {
    ch4Content.push({
      type: "keyValue",
      items: [
        {
          key: "Debris Compliance Score",
          value:
            data.debris.complianceScore !== null
              ? `${data.debris.complianceScore}/100`
              : "N/A",
        },
        { key: "Deorbit Strategy", value: data.debris.deorbitStrategy },
        {
          key: "Deorbit Timeline",
          value: data.debris.deorbitTimelineYears
            ? `${data.debris.deorbitTimelineYears} years`
            : "TBD",
        },
        {
          key: "Passivation Capability",
          value: data.debris.hasPassivationCap ? "Yes" : "No",
        },
      ],
    });
  } else {
    ch4Content.push({
      type: "alert",
      severity: "warning",
      message:
        "No debris assessment data available. Re-entry casualty analysis requires a completed debris assessment for this spacecraft.",
    });
  }

  // 4.3 Collision Probability
  ch4Content.push({
    type: "heading",
    value: "4.3 Collision Probability",
    level: 2,
  });
  if (data.conjunctions.length > 0) {
    ch4Content.push({
      type: "text",
      value: `${data.conjunctions.length} conjunction event(s) recorded from the Shield collision avoidance module.`,
    });
    ch4Content.push({
      type: "table",
      headers: [
        "Conjunction ID",
        "Threat Object",
        "Risk Tier",
        "Peak Pc",
        "Miss Dist. (m)",
        "TCA",
        "Decision",
      ],
      rows: data.conjunctions
        .slice(0, 20)
        .map((c) => [
          c.conjunctionId,
          c.threatObjectName || c.threatObjectType,
          c.riskTier,
          c.peakPc.toExponential(2),
          c.latestMissDistance.toFixed(0),
          new Date(c.tca).toLocaleDateString("en-GB"),
          c.decision || "Pending",
        ]),
    });
  } else {
    ch4Content.push({
      type: "alert",
      severity: "info",
      message:
        "No conjunction events recorded. Collision probability data will populate as Shield module tracks conjunction events for this spacecraft.",
    });
  }

  // 4.4 Explosion Risk / Passivation
  ch4Content.push({
    type: "heading",
    value: "4.4 Explosion Risk / Passivation (FMECA)",
    level: 2,
  });

  const hazardsWithFmeca = data.hazards.filter((h) => h.fmecaNotes);
  if (hazardsWithFmeca.length > 0) {
    ch4Content.push({
      type: "text",
      value:
        "Explosion and passivation risk assessment follows FMECA methodology (Failure Mode, Effects and Criticality Analysis). The following operator-provided FMECA notes have been recorded:",
    });
    for (const h of hazardsWithFmeca) {
      ch4Content.push({
        type: "heading",
        value: `${h.hazardId}: ${h.title}`,
        level: 3,
      });
      ch4Content.push({
        type: "text",
        value: h.fmecaNotes!,
      });
    }
    ch4Content.push({
      type: "alert",
      severity: "info",
      message:
        "FMECA data is operator-provided. Ensure this section is reviewed and validated with mission-specific failure analysis before submission to the NCA.",
    });
  } else {
    ch4Content.push({
      type: "text",
      value:
        "Explosion and passivation risk assessment follows FMECA methodology (Failure Mode, Effects and Criticality Analysis). This section should be supplemented with operator-provided FMECA documentation covering:",
    });
    ch4Content.push({
      type: "list",
      items: [
        "Propellant system failure modes and pressure vessel integrity",
        "Battery thermal runaway scenarios and mitigation",
        "Reaction wheel / CMG containment analysis",
        "End-of-life passivation procedures and success probability",
        "Post-mission energy source depletion verification",
      ],
    });
    ch4Content.push({
      type: "alert",
      severity: "warning",
      message:
        "FMECA data is operator-provided. Ensure this section is reviewed and supplemented with mission-specific failure analysis before submission to the NCA.",
    });
  }

  sections.push({
    title: "4. Quantitative Risk Assessment",
    content: ch4Content,
  });

  // ─── Chapter 5: Mitigation Measures ───
  const ch5Content: ReportSection["content"] = [];
  ch5Content.push({
    type: "text",
    value:
      "The following mitigation measures have been identified and implemented for each hazard:",
  });

  for (const hazard of data.hazards) {
    ch5Content.push({
      type: "heading",
      value: `${hazard.hazardId}: ${hazard.title}`,
      level: 2,
    });
    ch5Content.push({
      type: "keyValue",
      items: [
        { key: "Severity", value: hazard.severity },
        { key: "Risk Index", value: hazard.riskIndex.toString() },
        { key: "Mitigation Status", value: hazard.mitigationStatus },
        { key: "Residual Risk", value: hazard.residualRisk || "Not assessed" },
      ],
    });

    if (hazard.mitigations.length > 0) {
      ch5Content.push({
        type: "table",
        headers: [
          "Mitigation Type",
          "Description",
          "Implemented",
          "Verified By",
        ],
        rows: hazard.mitigations.map((m) => [
          m.type,
          m.description.length > 60
            ? m.description.slice(0, 57) + "..."
            : m.description,
          m.implementedAt
            ? new Date(m.implementedAt).toLocaleDateString("en-GB")
            : "Pending",
          m.verifiedBy || "Not verified",
        ]),
      });
    } else {
      ch5Content.push({
        type: "alert",
        severity: "warning",
        message: `No mitigation measures recorded for ${hazard.hazardId}.`,
      });
    }
  }

  sections.push({
    title: "5. Mitigation Measures",
    content: ch5Content,
  });

  // ─── Chapter 6: Deorbit & Disposal Strategy ───
  const ch6Content: ReportSection["content"] = [];
  if (data.debris) {
    ch6Content.push({
      type: "keyValue",
      items: [
        {
          key: "Mission Name",
          value: data.debris.missionName || data.spacecraft.name,
        },
        { key: "Orbit Type", value: data.debris.orbitType },
        { key: "Deorbit Strategy", value: data.debris.deorbitStrategy },
        {
          key: "Deorbit Timeline",
          value: data.debris.deorbitTimelineYears
            ? `${data.debris.deorbitTimelineYears} years post-mission`
            : "To be determined",
        },
        {
          key: "Passivation Capability",
          value: data.debris.hasPassivationCap
            ? "Passivation system available"
            : "Limited / no passivation capability",
        },
        {
          key: "Compliance Score",
          value:
            data.debris.complianceScore !== null
              ? `${data.debris.complianceScore}/100`
              : "Not assessed",
        },
      ],
    });

    const deorbitCompliant = (() => {
      if (data.debris.orbitType === "LEO") {
        return (data.debris.deorbitTimelineYears || 25) <= 25;
      }
      if (data.debris.orbitType === "GEO") {
        return data.debris.deorbitStrategy === "graveyard_orbit";
      }
      // For MEO, HEO, cislunar: require an explicit deorbit strategy
      return (
        data.debris.deorbitStrategy !== null &&
        data.debris.deorbitStrategy !== "none"
      );
    })();
    const deorbitMessage = (() => {
      if (deorbitCompliant) {
        if (data.debris.orbitType === "GEO") {
          return "Disposal strategy meets the GEO graveyard orbit guideline.";
        }
        return "Disposal strategy meets the 25-year deorbit guideline.";
      }
      if (data.debris.orbitType === "GEO") {
        return "WARNING: GEO spacecraft must use a graveyard orbit disposal strategy. Current strategy does not comply.";
      }
      return "WARNING: Current disposal timeline exceeds the 25-year guideline. Remediation required.";
    })();
    ch6Content.push({
      type: "alert",
      severity: deorbitCompliant ? "info" : "error",
      message: deorbitMessage,
    });
  } else {
    ch6Content.push({
      type: "alert",
      severity: "warning",
      message:
        "No debris assessment data available for this spacecraft. Deorbit and disposal strategy details require a completed debris mitigation assessment.",
    });
    ch6Content.push({
      type: "text",
      value:
        "The operator must provide a detailed end-of-life disposal plan covering deorbit strategy, passivation procedures, and 25-year compliance analysis.",
    });
  }

  sections.push({
    title: "6. Deorbit & Disposal Strategy",
    content: ch6Content,
  });

  // ─── Chapter 7: Hazard Acceptance & Open Items ───
  const acceptedHazards = data.hazards.filter(
    (h) => h.acceptanceStatus === "ACCEPTED",
  );
  const openHazards = data.hazards.filter(
    (h) => h.acceptanceStatus !== "ACCEPTED" && h.mitigationStatus !== "CLOSED",
  );
  const allResolved = openHazards.length === 0 && data.hazards.length > 0;

  const ch7Content: ReportSection["content"] = [];
  ch7Content.push({
    type: "heading",
    value: "7.1 Accepted Hazards",
    level: 2,
  });

  if (acceptedHazards.length > 0) {
    ch7Content.push({
      type: "table",
      headers: [
        "Hazard ID",
        "Title",
        "Severity",
        "Risk Index",
        "Accepted At",
        "Attestation ID",
      ],
      rows: acceptedHazards.map((h) => [
        h.hazardId,
        h.title.length > 35 ? h.title.slice(0, 32) + "..." : h.title,
        h.severity,
        h.riskIndex.toString(),
        h.acceptedAt
          ? new Date(h.acceptedAt).toLocaleDateString("en-GB")
          : "N/A",
        h.verityAttestationId
          ? h.verityAttestationId.slice(0, 12) + "..."
          : "None",
      ]),
    });
  } else {
    ch7Content.push({
      type: "text",
      value: "No hazards have been formally accepted yet.",
    });
  }

  ch7Content.push({ type: "heading", value: "7.2 Open Items", level: 2 });

  if (openHazards.length > 0) {
    ch7Content.push({
      type: "table",
      headers: [
        "Hazard ID",
        "Title",
        "Severity",
        "Mitigation Status",
        "Acceptance Status",
      ],
      rows: openHazards.map((h) => [
        h.hazardId,
        h.title.length > 40 ? h.title.slice(0, 37) + "..." : h.title,
        h.severity,
        h.mitigationStatus,
        h.acceptanceStatus,
      ]),
    });
  } else {
    ch7Content.push({
      type: "text",
      value: "No open items. All hazards are either accepted or closed.",
    });
  }

  ch7Content.push({
    type: "heading",
    value: "7.3 Report Status",
    level: 2,
  });
  ch7Content.push({
    type: "alert",
    severity: allResolved ? "info" : "error",
    message: allResolved
      ? "READY: All hazards have been accepted or mitigated. This report is ready for NCA submission."
      : `INCOMPLETE: ${openHazards.length} open item(s) remain. All hazards must be accepted or closed before NCA submission.`,
  });

  sections.push({
    title: "7. Hazard Acceptance & Open Items",
    content: ch7Content,
  });

  // ─── Chapter 8: Appendices ───
  const evidenceSources: string[] = [
    "Caelex Hazard Report Workflow",
    "Verity Attestation System",
  ];
  if (data.ephemeris) evidenceSources.push("Ephemeris Forecasting Engine");
  if (data.conjunctions.length > 0)
    evidenceSources.push("Shield Collision Avoidance Module");
  if (data.debris) evidenceSources.push("Debris Mitigation Assessment");

  sections.push({
    title: "8. Appendices",
    content: [
      { type: "heading", value: "8.1 Evidence Sources", level: 2 },
      {
        type: "list",
        items: evidenceSources,
      },
      { type: "heading", value: "8.2 Referenced Standards", level: 2 },
      {
        type: "list",
        items: [
          "FSOA -- French Space Operations Act (Loi n. 2008-518)",
          "ECSS-Q-ST-40-02C -- Hazard Analysis",
          "IADC Space Debris Mitigation Guidelines (IADC-02-01, Rev. 3)",
          "ISO 24113:2019 -- Space debris mitigation requirements",
          "UN COPUOS Guidelines for the Long-term Sustainability of Outer Space Activities",
        ],
      },
      { type: "heading", value: "8.3 Verity Attestation References", level: 2 },
      {
        type: "text",
        value:
          acceptedHazards.length > 0
            ? `${acceptedHazards.length} Verity attestation(s) have been created for accepted hazards. Each attestation cryptographically records the hazard acceptance decision, risk assessment data, and mitigation evidence for regulatory traceability.`
            : "No Verity attestations have been created yet.",
      },
      { type: "divider" },
      {
        type: "keyValue",
        items: [
          { key: "Generated By", value: data.generatedBy },
          { key: "Organization", value: data.organization.name },
          {
            key: "Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
          { key: "Document Reference", value: data.reportNumber },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: data.reportNumber,
      reportType: "hazard_report",
      title: "Hazard Report",
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization.name,
      version: data.version,
    },
    header: {
      title: "Hazard Report",
      subtitle: `${data.spacecraft.name} -- ${ncaLabel}`,
      reportNumber: data.reportNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This document is generated for regulatory compliance purposes. It does not constitute legal advice.",
    },
    sections,
  };
}

// ─── PDF Component ───────────────────────────────────────────────────────────

interface HazardReportPDFProps {
  data: HazardReportData;
}

export function HazardReportPDF({ data }: HazardReportPDFProps) {
  const config = buildHazardReportConfig(data);
  return <BaseReport config={config} />;
}
