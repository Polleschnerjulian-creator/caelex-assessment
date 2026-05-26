import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Deadlines-Tools bundle smoke-tests (Atlas V3 T0.1.g).
 *
 * Data sources (regulatoryDeadlines + REGULATION_TIMELINE) are
 * imported as real modules — no DB, no Anthropic, no network.
 * Tests assert the SHAPE and DISPATCH behavior, not specific
 * counts (those drift with the corpus).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  DEADLINES_TOOLS,
  isDeadlinesToolName,
  executeDeadlinesTool,
} from "./deadlines-tools.server";

describe("deadlines-tools bundle", () => {
  describe("DEADLINES_TOOLS schema", () => {
    it("exports exactly 1 tool (get_filing_deadlines)", () => {
      expect(DEADLINES_TOOLS).toHaveLength(1);
      expect(DEADLINES_TOOLS[0]?.name).toBe("get_filing_deadlines");
    });

    it("declares operator_type as the documented 6-member enum", () => {
      const schema = DEADLINES_TOOLS[0]?.input_schema as {
        properties: {
          operator_type: { enum?: string[] };
        };
      };
      const operators = schema.properties.operator_type.enum ?? [];
      expect(operators).toContain("satellite_operator");
      expect(operators).toContain("launch_provider");
      expect(operators).toContain("ground_segment");
      expect(operators).toContain("in_orbit_services");
      expect(operators).toContain("constellation_operator");
      expect(operators).toContain("earth_observation");
      expect(operators).toHaveLength(6);
    });

    it("horizon_days has min/max constraints (7..1825)", () => {
      const schema = DEADLINES_TOOLS[0]?.input_schema as {
        properties: {
          horizon_days: { minimum?: number; maximum?: number };
        };
      };
      expect(schema.properties.horizon_days.minimum).toBe(7);
      expect(schema.properties.horizon_days.maximum).toBe(1825);
    });
  });

  describe("isDeadlinesToolName", () => {
    it("returns true for get_filing_deadlines", () => {
      expect(isDeadlinesToolName("get_filing_deadlines")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isDeadlinesToolName("get_org_branding")).toBe(false);
      expect(isDeadlinesToolName("search_cases")).toBe(false);
      expect(isDeadlinesToolName("")).toBe(false);
      expect(isDeadlinesToolName("filing_deadlines")).toBe(false); // missing get_
    });
  });

  describe("executeDeadlinesTool — get_filing_deadlines", () => {
    it("rejects invalid input (horizon_days out of range)", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: { horizon_days: 5000 }, // > 1825 max
      });
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content);
      expect(payload.code).toBe("INVALID_INPUT");
    });

    it("accepts empty input (returns global view)", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: {},
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.horizon_days).toBe(365); // default
      expect(payload.scope.jurisdiction).toBeNull();
      expect(payload.scope.operator_type).toBeNull();
      expect(Array.isArray(payload.recurring)).toBe(true);
      expect(Array.isArray(payload.lifecycle)).toBe(true);
      expect(Array.isArray(payload.headlines)).toBe(true);
      expect(payload.counts).toMatchObject({
        recurring: expect.any(Number),
        lifecycle: expect.any(Number),
      });
    });

    it("respects jurisdiction filter (DE)", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: { jurisdiction: "DE" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.scope.jurisdiction).toBe("DE");
    });

    it("respects operator_type filter", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: { operator_type: "satellite_operator" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.scope.operator_type).toBe("satellite_operator");
    });

    it("respects custom horizon_days", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: { horizon_days: 90 },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.horizon_days).toBe(90);
    });

    it("always emits drafting_directives array", async () => {
      const result = await executeDeadlinesTool({
        name: "get_filing_deadlines",
        input: {},
      });
      const payload = JSON.parse(result.content);
      expect(Array.isArray(payload.drafting_directives)).toBe(true);
      expect(payload.drafting_directives.length).toBeGreaterThan(0);
    });
  });

  describe("executeDeadlinesTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeDeadlinesTool({
        name: "bogus_tool" as never,
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown deadlines");
    });
  });
});
