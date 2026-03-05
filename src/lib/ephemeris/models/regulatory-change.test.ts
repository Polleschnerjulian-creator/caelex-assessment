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
  it("returns empty array (Phase 1 stub) with empty input", () => {
    const result = getRegulatoryChangeFactors([], "25544");
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array (Phase 1 stub) with changes provided", () => {
    const result = getRegulatoryChangeFactors([mockChange], "25544");
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array regardless of noradId", () => {
    const result = getRegulatoryChangeFactors([mockChange], "99999");
    expect(result).toEqual([]);
  });

  it("returns empty array with multiple changes", () => {
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
    expect(result).toEqual([]);
  });
});

// ─── getRegulatoryChangeEvents ──────────────────────────────────────────────

describe("getRegulatoryChangeEvents", () => {
  it("returns empty array (Phase 1 stub) with empty input", () => {
    const result = getRegulatoryChangeEvents([], "25544");
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array (Phase 1 stub) with changes provided", () => {
    const result = getRegulatoryChangeEvents([mockChange], "25544");
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array regardless of noradId", () => {
    const result = getRegulatoryChangeEvents([mockChange], "99999");
    expect(result).toEqual([]);
  });

  it("returns empty array with multiple changes", () => {
    const result = getRegulatoryChangeEvents([mockChange, mockChange], "25544");
    expect(result).toEqual([]);
  });
});
