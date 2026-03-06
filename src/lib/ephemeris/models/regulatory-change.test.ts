import { describe, it, expect } from "vitest";
import {
  getRegulatoryChangeFactors,
  getRegulatoryChangeEvents,
} from "./regulatory-change";
import type { RegulatoryChangeImpact } from "../core/types";

const mockChange: RegulatoryChangeImpact = {
  event: {
    id: "evt-001",
    title: "EU Space Act Amendment 2026",
    eurLexUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0001",
    publishedAt: "2026-01-15T00:00:00Z",
    severity: "HIGH",
  },
  affectedSatellites: [
    {
      noradId: "25544",
      name: "SAT-ALPHA",
      impactType: "THRESHOLD_CHANGE",
      scoreDelta: -5,
      details: "Fuel reserve threshold increased from 5% to 10%",
    },
  ],
  totalAffected: 1,
  worstCaseImpact: "Non-compliance within 30 days for LEO operators",
};

// ─── getRegulatoryChangeFactors ─────────────────────────────────────────────

describe("getRegulatoryChangeFactors", () => {
  it("returns empty array with empty input", () => {
    const result = getRegulatoryChangeFactors([], "25544");
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("generates factors from regulatory changes", () => {
    const result = getRegulatoryChangeFactors([mockChange], "25544");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "regulatory_change_0",
      status: "WARNING", // HIGH → WARNING
      source: "derived",
      regulationRef: "eurlex_evt-001",
      lastMeasured: "2026-01-15T00:00:00Z",
    });
  });

  it("maps CRITICAL severity to NON_COMPLIANT status", () => {
    const criticalChange: RegulatoryChangeImpact = {
      ...mockChange,
      event: { ...mockChange.event, severity: "CRITICAL" },
    };
    const result = getRegulatoryChangeFactors([criticalChange], "25544");
    expect(result[0]!.status).toBe("NON_COMPLIANT");
    expect(result[0]!.confidence).toBe(0.9);
  });

  it("maps LOW severity to COMPLIANT status", () => {
    const lowChange: RegulatoryChangeImpact = {
      ...mockChange,
      event: { ...mockChange.event, severity: "LOW" },
    };
    const result = getRegulatoryChangeFactors([lowChange], "25544");
    expect(result[0]!.status).toBe("COMPLIANT");
    expect(result[0]!.confidence).toBe(0.7);
  });

  it("generates multiple factors from multiple changes", () => {
    const secondChange: RegulatoryChangeImpact = {
      event: {
        id: "evt-002",
        title: "NIS2 Update",
        eurLexUrl:
          "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0002",
        publishedAt: "2026-03-01T00:00:00Z",
        severity: "CRITICAL",
      },
      affectedSatellites: [],
      totalAffected: 0,
      worstCaseImpact: "Minor impact",
    };
    const result = getRegulatoryChangeFactors(
      [mockChange, secondChange],
      "25544",
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("regulatory_change_0");
    expect(result[1]!.id).toBe("regulatory_change_1");
  });
});

// ─── getRegulatoryChangeEvents ──────────────────────────────────────────────

describe("getRegulatoryChangeEvents", () => {
  it("returns empty array with empty input", () => {
    const result = getRegulatoryChangeEvents([], "25544");
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("generates events from CRITICAL/HIGH changes", () => {
    const result = getRegulatoryChangeEvents([mockChange], "25544");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      eventType: "REGULATORY_CHANGE",
      severity: "HIGH",
      regulationRef: "eurlex_evt-001",
      confidence: "MEDIUM",
      model: "regulatory",
    });
  });

  it("filters out MEDIUM/LOW severity changes", () => {
    const lowChange: RegulatoryChangeImpact = {
      ...mockChange,
      event: { ...mockChange.event, severity: "LOW" },
    };
    const mediumChange: RegulatoryChangeImpact = {
      ...mockChange,
      event: { ...mockChange.event, severity: "MEDIUM" },
    };
    const result = getRegulatoryChangeEvents(
      [lowChange, mediumChange],
      "25544",
    );
    expect(result).toEqual([]);
  });

  it("generates events from multiple HIGH+ changes", () => {
    const result = getRegulatoryChangeEvents([mockChange, mockChange], "25544");
    expect(result).toHaveLength(2);
    expect(result[0]!.id).not.toBe(result[1]!.id);
  });

  it("includes recommended action based on severity", () => {
    const criticalChange: RegulatoryChangeImpact = {
      ...mockChange,
      event: { ...mockChange.event, severity: "CRITICAL" },
    };
    const result = getRegulatoryChangeEvents([criticalChange], "25544");
    expect(result[0]!.recommendedAction).toContain("Immediate");
  });
});
