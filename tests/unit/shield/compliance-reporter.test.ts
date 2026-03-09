/**
 * Shield Compliance Reporter Tests
 *
 * Tests for pure functions: formatPcScientific and buildCAReportSections.
 * generateCAReportPDF is not tested here (requires jsPDF runtime).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  formatPcScientific,
  buildCAReportSections,
} from "@/lib/shield/compliance-reporter.server";

// ─── Test fixtures ──────────────────────────────────────────────────────────

const baseEvent = {
  id: "evt-001",
  conjunctionId: "CONJ-2026-00042",
  noradId: "55001",
  threatNoradId: "99887",
  threatObjectName: "COSMOS 2251 DEB",
  threatObjectType: "DEBRIS",
  status: "MONITORING",
  riskTier: "ELEVATED",
  peakPc: 3.5e-5,
  latestPc: 1.2e-5,
  latestMissDistance: 320,
  tca: new Date("2026-03-15T08:30:00Z"),
  relativeSpeed: 14200,
  decision: null,
  decisionBy: null,
  decisionAt: null,
  decisionRationale: null,
  createdAt: new Date("2026-03-10T12:00:00Z"),
};

const baseCdms = [
  {
    cdmId: "CDM-001",
    creationDate: new Date("2026-03-10T12:00:00Z"),
    collisionProbability: 1.5e-5,
    missDistance: 450,
    riskTier: "MONITOR",
  },
  {
    cdmId: "CDM-002",
    creationDate: new Date("2026-03-11T06:00:00Z"),
    collisionProbability: 3.5e-5,
    missDistance: 320,
    riskTier: "ELEVATED",
  },
];

const baseEscalationLog = [
  {
    previousTier: "MONITOR",
    newTier: "ELEVATED",
    previousStatus: "MONITORING",
    newStatus: "MONITORING",
    triggeredBy: "CDM update: Pc increased",
    createdAt: new Date("2026-03-11T06:05:00Z"),
  },
];

// ─── formatPcScientific ─────────────────────────────────────────────────────

describe("formatPcScientific", () => {
  it("formats a collision probability in scientific notation", () => {
    expect(formatPcScientific(1.5e-5)).toBe("1.50e-5");
    expect(formatPcScientific(3.5e-5)).toBe("3.50e-5");
    expect(formatPcScientific(1e-3)).toBe("1.00e-3");
    expect(formatPcScientific(2.718e-7)).toBe("2.72e-7");
  });

  it("handles zero as 0.00e+0", () => {
    expect(formatPcScientific(0)).toBe("0.00e+0");
  });
});

// ─── buildCAReportSections ──────────────────────────────────────────────────

describe("buildCAReportSections", () => {
  it("returns an array of 5 sections", () => {
    const sections = buildCAReportSections(
      baseEvent,
      baseCdms,
      baseEscalationLog,
    );
    expect(sections).toHaveLength(5);
  });

  it("includes Event Summary as section 1 with keyValue content", () => {
    const sections = buildCAReportSections(
      baseEvent,
      baseCdms,
      baseEscalationLog,
    );
    const summary = sections[0];
    expect(summary.title).toBe("1. Event Summary");
    expect(summary.content.length).toBeGreaterThan(0);

    const kvBlock = summary.content.find(
      (b: Record<string, unknown>) => b.type === "keyValue",
    ) as
      | { type: string; items: Array<{ key: string; value: string }> }
      | undefined;
    expect(kvBlock).toBeDefined();

    const keys = kvBlock!.items.map((i) => i.key);
    expect(keys).toContain("Conjunction ID");
    expect(keys).toContain("Risk Tier");
    expect(keys).toContain("Status");
    expect(keys).toContain("Peak Pc");
    expect(keys).toContain("Latest Pc");
  });

  it("includes CDM History as section 2 with table", () => {
    const sections = buildCAReportSections(
      baseEvent,
      baseCdms,
      baseEscalationLog,
    );
    const cdmSection = sections[1];
    expect(cdmSection.title).toBe("2. CDM History");

    const table = cdmSection.content.find(
      (b: Record<string, unknown>) => b.type === "table",
    ) as { type: string; headers: string[]; rows: string[][] } | undefined;
    expect(table).toBeDefined();
    expect(table!.headers).toEqual([
      "CDM ID",
      "Date",
      "Pc",
      "Miss (m)",
      "Tier",
    ]);
    expect(table!.rows).toHaveLength(2);
  });

  it("includes Decision Record with decision data when present", () => {
    const eventWithDecision = {
      ...baseEvent,
      decision: "MANEUVER",
      decisionBy: "ops@caelex.eu",
      decisionAt: new Date("2026-03-12T10:00:00Z"),
      decisionRationale: "Risk too high, maneuver approved",
    };
    const sections = buildCAReportSections(
      eventWithDecision,
      baseCdms,
      baseEscalationLog,
    );
    const decisionSection = sections[2];
    expect(decisionSection.title).toBe("3. Decision Record");

    const kvBlock = decisionSection.content.find(
      (b: Record<string, unknown>) => b.type === "keyValue",
    ) as
      | { type: string; items: Array<{ key: string; value: string }> }
      | undefined;
    expect(kvBlock).toBeDefined();

    const keys = kvBlock!.items.map((i) => i.key);
    expect(keys).toContain("Decision");
    expect(keys).toContain("Decided By");
  });

  it("includes Decision Record with 'No decision' text when absent", () => {
    const sections = buildCAReportSections(
      baseEvent,
      baseCdms,
      baseEscalationLog,
    );
    const decisionSection = sections[2];
    expect(decisionSection.title).toBe("3. Decision Record");

    const textBlock = decisionSection.content.find(
      (b: Record<string, unknown>) => b.type === "text",
    ) as { type: string; value: string } | undefined;
    expect(textBlock).toBeDefined();
    expect(textBlock!.value).toBe("No decision recorded.");
  });

  it("includes Escalation History as section 4 with table", () => {
    const sections = buildCAReportSections(
      baseEvent,
      baseCdms,
      baseEscalationLog,
    );
    const escalationSection = sections[3];
    expect(escalationSection.title).toBe("4. Escalation History");

    const table = escalationSection.content.find(
      (b: Record<string, unknown>) => b.type === "table",
    ) as { type: string; headers: string[]; rows: string[][] } | undefined;
    expect(table).toBeDefined();
    expect(table!.headers).toEqual([
      "Date",
      "Tier Change",
      "Status Change",
      "Trigger",
    ]);
    expect(table!.rows).toHaveLength(1);
  });
});
