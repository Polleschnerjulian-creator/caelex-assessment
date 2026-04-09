import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateNCANotificationDraft } from "./incident-notification-templates";

// ─── Helper ───

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

const makeIncident = (overrides: Partial<IncidentData> = {}): IncidentData => ({
  incidentNumber: "INC-2024-001",
  category: "cyber_incident",
  severity: "high",
  title: "Test Incident",
  description: "Test description",
  detectedAt: "2024-01-01T12:00:00Z",
  detectedBy: "Security Team",
  detectionMethod: "SIEM Alert",
  rootCause: null,
  impactAssessment: null,
  immediateActions: [],
  containmentMeasures: [],
  resolutionSteps: [],
  lessonsLearned: null,
  affectedAssets: [],
  reportedToNCA: false,
  ncaReferenceNumber: null,
  resolvedAt: null,
  ...overrides,
});

const makeFullIncident = (): IncidentData =>
  makeIncident({
    rootCause: "Misconfigured firewall rule",
    impactAssessment: "Two ground stations affected for 4 hours",
    immediateActions: ["Isolated network segment", "Engaged SOC team"],
    containmentMeasures: ["Applied emergency patch", "Blocked malicious IPs"],
    resolutionSteps: ["Full system scan", "Restored from backup"],
    lessonsLearned: "Implement quarterly pen-tests",
    affectedAssets: [
      {
        assetName: "SAT-1",
        cosparId: "2024-001A",
        noradId: "55001",
      },
      {
        assetName: "Ground Station Alpha",
      },
    ],
    ncaReferenceNumber: "NCA-REF-2024-42",
    resolvedAt: "2024-01-02T18:00:00Z",
  });

// ─── Category and Severity label mapping ───

describe("CATEGORY_LABELS and SEVERITY_LABELS", () => {
  it("maps known category to human label in content", () => {
    const incident = makeIncident({ category: "loss_of_contact" });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("Loss of Contact / Control");
  });

  it("falls back to raw value for unknown category", () => {
    const incident = makeIncident({ category: "alien_invasion" });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("alien_invasion");
  });

  it("maps known severity to human label", () => {
    const incident = makeIncident({ severity: "critical" });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("CRITICAL");
  });

  it("falls back to raw value for unknown severity", () => {
    const incident = makeIncident({ severity: "extreme" });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("extreme");
  });

  it.each([
    ["loss_of_contact", "Loss of Contact / Control"],
    ["debris_generation", "Debris Generation Event"],
    ["cyber_incident", "Cybersecurity Incident"],
    ["spacecraft_anomaly", "Spacecraft Anomaly"],
    ["conjunction_event", "Conjunction / Close Approach Event"],
    ["regulatory_breach", "Regulatory Non-Compliance"],
    ["nis2_significant_incident", "NIS2 Significant Incident"],
    ["nis2_near_miss", "NIS2 Near Miss"],
    ["other", "Other Operational Incident"],
  ])("category '%s' maps to '%s'", (category, expected) => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident({ category }),
    );
    expect(result.content).toContain(expected);
  });

  it.each([
    ["critical", "CRITICAL"],
    ["high", "HIGH"],
    ["medium", "MEDIUM"],
    ["low", "LOW"],
  ])("severity '%s' maps to '%s'", (severity, expected) => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident({ severity }),
    );
    expect(result.content).toContain(expected);
  });
});

// ─── Unknown phase ───

describe("unknown phase", () => {
  it("throws for an unrecognized phase", () => {
    expect(() =>
      generateNCANotificationDraft("unknown_phase" as never, makeIncident()),
    ).toThrow("Unknown NIS2 phase: unknown_phase");
  });
});

// ─── Early Warning — Art. 23(4)(a) ───

describe("early_warning phase", () => {
  it("returns correct title format", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.title).toBe("Early Warning: INC-2024-001 — Test Incident");
  });

  it("returns correct legalBasis", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.legalBasis).toBe(
      "NIS2 Directive Art. 23(4)(a) — Early warning within 24 hours",
    );
  });

  it("includes early warning header", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.content).toContain("EARLY WARNING — NIS2 Art. 23(4)(a)");
  });

  it("shows fallback text when fields are null/empty (default incident)", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.content).toContain("No specific assets identified yet.");
    expect(result.content).toContain(
      "Under investigation. Root cause analysis in progress.",
    );
    expect(result.content).toContain(
      "Initial assessment pending. Cross-border impact being evaluated.",
    );
    expect(result.content).toContain(
      "Immediate containment measures being implemented.",
    );
    // ncaReferenceNumber is null, so no NCA Reference line
    expect(result.content).not.toContain("NCA Reference:");
  });

  it("renders fully populated incident correctly", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeFullIncident(),
    );
    expect(result.content).toContain("NCA Reference: NCA-REF-2024-42");
    expect(result.content).toContain("Misconfigured firewall rule");
    expect(result.content).toContain(
      "Two ground stations affected for 4 hours",
    );
    expect(result.content).toContain("- Isolated network segment");
    expect(result.content).toContain("- Engaged SOC team");
    expect(result.content).toContain(
      "- SAT-1 (COSPAR: 2024-001A, NORAD: 55001)",
    );
    expect(result.content).toContain("- Ground Station Alpha");
  });

  it("renders asset with only COSPAR ID", () => {
    const incident = makeIncident({
      affectedAssets: [{ assetName: "SAT-X", cosparId: "2024-099A" }],
    });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("- SAT-X (COSPAR: 2024-099A)");
  });

  it("renders asset with only NORAD ID", () => {
    const incident = makeIncident({
      affectedAssets: [{ assetName: "SAT-Y", noradId: "99999" }],
    });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("- SAT-Y (NORAD: 99999)");
  });

  it("renders asset with no IDs", () => {
    const incident = makeIncident({
      affectedAssets: [{ assetName: "Ground Station Beta" }],
    });
    const result = generateNCANotificationDraft("early_warning", incident);
    expect(result.content).toContain("- Ground Station Beta");
    expect(result.content).not.toContain("COSPAR");
    expect(result.content).not.toContain("NORAD");
  });

  it("includes detection info", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.content).toContain("2024-01-01T12:00:00Z");
    expect(result.content).toContain("Security Team");
    expect(result.content).toContain("SIEM Alert");
  });

  it("includes footer with 72h follow-up notice", () => {
    const result = generateNCANotificationDraft(
      "early_warning",
      makeIncident(),
    );
    expect(result.content).toContain(
      "A full incident notification will follow within 72 hours of detection.",
    );
  });
});

// ─── Notification — Art. 23(4)(b) ───

describe("notification phase", () => {
  it("returns correct title format", () => {
    const result = generateNCANotificationDraft("notification", makeIncident());
    expect(result.title).toBe(
      "Incident Notification: INC-2024-001 — Test Incident",
    );
  });

  it("returns correct legalBasis", () => {
    const result = generateNCANotificationDraft("notification", makeIncident());
    expect(result.legalBasis).toBe(
      "NIS2 Directive Art. 23(4)(b) — Incident notification within 72 hours",
    );
  });

  it("includes notification header", () => {
    const result = generateNCANotificationDraft("notification", makeIncident());
    expect(result.content).toContain(
      "INCIDENT NOTIFICATION — NIS2 Art. 23(4)(b)",
    );
  });

  it("shows fallback text when fields are null/empty", () => {
    const result = generateNCANotificationDraft("notification", makeIncident());
    expect(result.content).toContain("No specific assets identified.");
    expect(result.content).toContain("Impact assessment in progress.");
    expect(result.content).toContain("Root cause analysis ongoing.");
    expect(result.content).toContain("- Initial response in progress");
    expect(result.content).toContain(
      "- Containment measures being implemented",
    );
    expect(result.content).not.toContain("NCA Reference:");
  });

  it("renders fully populated incident", () => {
    const result = generateNCANotificationDraft(
      "notification",
      makeFullIncident(),
    );
    expect(result.content).toContain("NCA Reference: NCA-REF-2024-42");
    expect(result.content).toContain("Misconfigured firewall rule");
    expect(result.content).toContain(
      "Two ground stations affected for 4 hours",
    );
    expect(result.content).toContain("- Isolated network segment");
    expect(result.content).toContain("- Applied emergency patch");
    expect(result.content).toContain(
      "- SAT-1 (COSPAR: 2024-001A, NORAD: 55001)",
    );
    expect(result.content).toContain("- Ground Station Alpha");
  });

  it("includes final report notice in footer", () => {
    const result = generateNCANotificationDraft("notification", makeIncident());
    expect(result.content).toContain(
      "A final report will be submitted within one month of this notification.",
    );
  });
});

// ─── Intermediate Report — Art. 23(4)(c) ───

describe("intermediate_report phase", () => {
  it("returns correct title format", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident(),
    );
    expect(result.title).toBe(
      "Intermediate Report: INC-2024-001 — Test Incident",
    );
  });

  it("returns correct legalBasis", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident(),
    );
    expect(result.legalBasis).toBe(
      "NIS2 Directive Art. 23(4)(c) — Intermediate report upon request",
    );
  });

  it("includes intermediate report header", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident(),
    );
    expect(result.content).toContain(
      "INTERMEDIATE REPORT — NIS2 Art. 23(4)(c)",
    );
  });

  it("shows 'Ongoing' when resolvedAt is null", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident(),
    );
    expect(result.content).toContain("Current Status: Ongoing");
  });

  it("shows 'Resolved' when resolvedAt is set", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident({ resolvedAt: "2024-01-02T18:00:00Z" }),
    );
    expect(result.content).toContain("Current Status: Resolved");
  });

  it("shows fallback text when fields are null/empty", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeIncident(),
    );
    expect(result.content).toContain(
      "Investigation ongoing. Preliminary findings being compiled.",
    );
    expect(result.content).toContain(
      "Impact assessment continues to be refined.",
    );
    expect(result.content).toContain("- Containment measures ongoing");
    expect(result.content).toContain("- Resolution plan being developed");
    expect(result.content).not.toContain("NCA Reference:");
  });

  it("renders fully populated incident", () => {
    const result = generateNCANotificationDraft(
      "intermediate_report",
      makeFullIncident(),
    );
    expect(result.content).toContain("NCA Reference: NCA-REF-2024-42");
    expect(result.content).toContain("Misconfigured firewall rule");
    expect(result.content).toContain(
      "Two ground stations affected for 4 hours",
    );
    expect(result.content).toContain("- Applied emergency patch");
    expect(result.content).toContain("- Full system scan");
  });
});

// ─── Final Report — Art. 23(4)(d) ───

describe("final_report phase", () => {
  it("returns correct title format", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.title).toBe("Final Report: INC-2024-001 — Test Incident");
  });

  it("returns correct legalBasis", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.legalBasis).toBe(
      "NIS2 Directive Art. 23(4)(d) — Final report within 1 month of notification",
    );
  });

  it("includes final report header", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain("FINAL REPORT — NIS2 Art. 23(4)(d)");
  });

  it("shows 'Status: Ongoing' when resolvedAt is null", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain("Status: Ongoing");
    expect(result.content).not.toContain("Resolution:");
  });

  it("shows Resolution line when resolvedAt is set", () => {
    const result = generateNCANotificationDraft(
      "final_report",
      makeIncident({ resolvedAt: "2024-01-02T18:00:00Z" }),
    );
    expect(result.content).toContain("Resolution: 2024-01-02T18:00:00Z");
  });

  it("shows fallback text when fields are null/empty", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain("No specific assets identified.");
    expect(result.content).toContain(
      "Root cause could not be conclusively determined during the investigation period.",
    );
    expect(result.content).toContain(
      "No material impact beyond initial disruption.",
    );
    expect(result.content).toContain(
      "Lessons learned review to be completed during post-mortem.",
    );
    // immediateActions / containmentMeasures / resolutionSteps empty
    expect(result.content).toContain("- None recorded");
    expect(result.content).not.toContain("NCA Reference:");
  });

  it("shows cross-border impact fallback", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain(
      "Cross-border impact assessment has not been completed separately.",
    );
  });

  it("renders fully populated incident", () => {
    const full = makeFullIncident();
    const result = generateNCANotificationDraft("final_report", full);
    expect(result.content).toContain("NCA Reference: NCA-REF-2024-42");
    expect(result.content).toContain("Misconfigured firewall rule");
    expect(result.content).toContain(
      "Two ground stations affected for 4 hours",
    );
    expect(result.content).toContain("- Isolated network segment");
    expect(result.content).toContain("- Engaged SOC team");
    expect(result.content).toContain("- Applied emergency patch");
    expect(result.content).toContain("- Blocked malicious IPs");
    expect(result.content).toContain("- Full system scan");
    expect(result.content).toContain("- Restored from backup");
    expect(result.content).toContain("Implement quarterly pen-tests");
    expect(result.content).toContain(
      "- SAT-1 (COSPAR: 2024-001A, NORAD: 55001)",
    );
    expect(result.content).toContain("- Ground Station Alpha");
  });

  it("includes preventive measures section", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain("8. PREVENTIVE MEASURES");
    expect(result.content).toContain(
      "Review and update incident response procedures",
    );
  });

  it("includes footer referencing one-month deadline", () => {
    const result = generateNCANotificationDraft("final_report", makeIncident());
    expect(result.content).toContain(
      "submitted within one month of the incident notification.",
    );
  });

  it("renders assets with COSPAR and NORAD IDs in final report", () => {
    const incident = makeIncident({
      affectedAssets: [
        { assetName: "SAT-A", cosparId: "2024-002B", noradId: "55002" },
        { assetName: "SAT-B", cosparId: "2024-003C" },
        { assetName: "SAT-C", noradId: "55003" },
        { assetName: "SAT-D" },
      ],
    });
    const result = generateNCANotificationDraft("final_report", incident);
    expect(result.content).toContain(
      "- SAT-A (COSPAR: 2024-002B, NORAD: 55002)",
    );
    expect(result.content).toContain("- SAT-B (COSPAR: 2024-003C)");
    expect(result.content).toContain("- SAT-C (NORAD: 55003)");
    expect(result.content).toContain("- SAT-D");
  });
});
