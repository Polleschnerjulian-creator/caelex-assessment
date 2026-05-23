/**
 * Tests for src/lib/trade/deemed-export/operation-integration.ts (Z13, Tier 6).
 *
 * Coverage (5 cases):
 *  1. throws when operation is in a different org (cross-org safety)
 *  2. short-circuits when hasForeignNationalAccess=false
 *  3. recommends roster setup when no authorisations exist for the org
 *  4. happy path: all lines covered for all employees → no gaps
 *  5. coverage gap: one line uncovered for one employee → reported
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOperationFindFirst, mockAuthFindMany } = vi.hoisted(() => ({
  mockOperationFindFirst: vi.fn(),
  mockAuthFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: {
      findFirst: mockOperationFindFirst,
    },
    tradeDeemedExportAuthorization: {
      findMany: mockAuthFindMany,
    },
  },
}));

import { evaluateOperationDeemedExportCoverage } from "./operation-integration";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("evaluateOperationDeemedExportCoverage", () => {
  it("throws on cross-org operation id", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(null);
    await expect(
      evaluateOperationDeemedExportCoverage({
        organizationId: "org_1",
        operationId: "op_from_other_org",
      }),
    ).rejects.toThrow(/Operation not found/);
  });

  it("short-circuits when hasForeignNationalAccess=false", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      hasForeignNationalAccess: false,
      lines: [],
    });

    const result = await evaluateOperationDeemedExportCoverage({
      organizationId: "org_1",
      operationId: "op_1",
    });

    expect(result.requiresCheck).toBe(false);
    expect(result.coverageGaps).toEqual([]);
    expect(result.recommendation).toMatch(
      /not declared as exposing technology/,
    );
    // Should NOT have queried authorisations.
    expect(mockAuthFindMany).not.toHaveBeenCalled();
  });

  it("recommends adding authorisations when org has no FN roster", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      hasForeignNationalAccess: true,
      lines: [
        {
          id: "line_1",
          item: {
            id: "item_1",
            name: "Star Tracker",
            internalSku: "ST-9000",
            eccnUS: "9A515.a",
            usmlCategory: null,
          },
        },
      ],
    });
    // distinct employees list is empty
    mockAuthFindMany.mockResolvedValueOnce([]);

    const result = await evaluateOperationDeemedExportCoverage({
      organizationId: "org_1",
      operationId: "op_1",
    });

    expect(result.requiresCheck).toBe(true);
    expect(result.totalGapCount).toBe(0);
    expect(result.recommendation).toMatch(
      /no deemed-export authorisations exist/,
    );
  });

  it("reports no gaps when every line is covered for every employee", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      hasForeignNationalAccess: true,
      lines: [
        {
          id: "line_1",
          item: {
            id: "item_1",
            name: "Star Tracker",
            internalSku: "ST-9000",
            eccnUS: "9A515.a",
            usmlCategory: null,
          },
        },
      ],
    });
    // Distinct employees query.
    mockAuthFindMany.mockResolvedValueOnce([
      { foreignNationalEmployeeId: "emp_42" },
    ]);
    // checkDeemedExportCoverage's internal findMany — returns a covering
    // authorisation for the (org, employee, ECCN) tuple.
    mockAuthFindMany.mockResolvedValueOnce([
      {
        id: "auth_1",
        organizationId: "org_1",
        foreignNationalEmployeeId: "emp_42",
        allowedECCNs: ["9A515"], // sub-paragraph match for 9A515.a
        allowedUSMLCategories: [],
        validFrom: new Date("2020-01-01"),
        validUntil: new Date("2099-01-01"),
        status: "ACTIVE",
      },
    ]);

    const result = await evaluateOperationDeemedExportCoverage({
      organizationId: "org_1",
      operationId: "op_1",
    });

    expect(result.requiresCheck).toBe(true);
    expect(result.coverageGaps).toHaveLength(0);
    expect(result.totalGapCount).toBe(0);
    expect(result.recommendation).toMatch(
      /All 1 classified line have deemed-export coverage/,
    );
  });

  it("reports a gap when an employee lacks coverage for a line", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      hasForeignNationalAccess: true,
      lines: [
        {
          id: "line_1",
          item: {
            id: "item_1",
            name: "Inertial Reference Unit",
            internalSku: "IRU-12",
            eccnUS: "9A515.d",
            usmlCategory: null,
          },
        },
      ],
    });
    // Distinct employees query — one cleared, one not.
    mockAuthFindMany.mockResolvedValueOnce([
      { foreignNationalEmployeeId: "emp_cleared" },
      { foreignNationalEmployeeId: "emp_uncleared" },
    ]);
    // First coverage check (emp_cleared) — covered.
    mockAuthFindMany.mockResolvedValueOnce([
      {
        id: "auth_1",
        organizationId: "org_1",
        foreignNationalEmployeeId: "emp_cleared",
        allowedECCNs: ["9A515.d"],
        allowedUSMLCategories: [],
        validFrom: new Date("2020-01-01"),
        validUntil: new Date("2099-01-01"),
        status: "ACTIVE",
      },
    ]);
    // Second coverage check (emp_uncleared) — no rows.
    mockAuthFindMany.mockResolvedValueOnce([]);

    const result = await evaluateOperationDeemedExportCoverage({
      organizationId: "org_1",
      operationId: "op_1",
    });

    expect(result.coverageGaps).toHaveLength(1);
    expect(result.coverageGaps[0]?.uncoveredEmployeeIds).toEqual([
      "emp_uncleared",
    ]);
    expect(result.totalGapCount).toBe(1);
    expect(result.recommendation).toMatch(/lack deemed-export coverage/);
  });
});
