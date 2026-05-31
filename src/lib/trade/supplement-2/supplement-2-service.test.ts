/**
 * Tests for src/lib/trade/supplement-2/supplement-2-service.ts (Z29, Tier 4).
 *
 * Coverage (12+ cases):
 *   - listEligibleOperations: filters by ship date + eligible ECCN
 *   - listEligibleOperations: excludes operations with no eligible items
 *   - listEligibleOperations: uses scheduledShipDate when actualShipDate is null
 *   - listEligibleOperations: aggregates lineValue per item
 *   - generateReport: creates new DRAFT with snapshot items
 *   - generateReport: updates existing DRAFT, prunes + replaces items
 *   - generateReport: refuses to regenerate FILED reports
 *   - generateReport: aggregates lines with the same ECCN inside one op
 *   - markFiled: DRAFT → FILED with filedAt + reference number
 *   - markFiled: FILED → AMENDED on re-file
 *   - markFiled: refuses unknown report id
 *   - getOverdueReports: returns DRAFT past due-date only
 *   - markOverdueReports: bulk updateMany returns affected count
 *   - openPeriodForAllOrganisations: iterates active orgs
 *   - openPeriodForAllOrganisations: continues on per-org error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOpFindMany,
  mockReportFindFirst,
  mockReportFindMany,
  mockReportCreate,
  mockReportUpdate,
  mockReportUpdateMany,
  mockItemDeleteMany,
  mockOrgFindMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOpFindMany: vi.fn(),
  mockReportFindFirst: vi.fn(),
  mockReportFindMany: vi.fn(),
  mockReportCreate: vi.fn(),
  mockReportUpdate: vi.fn(),
  mockReportUpdateMany: vi.fn(),
  mockItemDeleteMany: vi.fn(),
  mockOrgFindMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { findMany: mockOpFindMany },
    tradeSupplement2Report: {
      findFirst: mockReportFindFirst,
      findMany: mockReportFindMany,
      create: mockReportCreate,
      update: mockReportUpdate,
      updateMany: mockReportUpdateMany,
    },
    tradeSupplement2ReportItem: {
      deleteMany: mockItemDeleteMany,
    },
    organization: { findMany: mockOrgFindMany },
    $transaction: mockTransaction,
  },
}));

import {
  listEligibleOperations,
  generateReport,
  markFiled,
  getOverdueReports,
  markOverdueReports,
  openPeriodForAllOrganisations,
  makeReportingPeriod,
} from "./supplement-2-service";

const PERIOD = makeReportingPeriod(2026, "H1");

beforeEach(() => {
  vi.clearAllMocks();
  mockOpFindMany.mockResolvedValue([]);
  mockReportFindFirst.mockResolvedValue(null);
  mockReportFindMany.mockResolvedValue([]);
  mockReportCreate.mockResolvedValue({ id: "report_new", items: [] });
  mockReportUpdate.mockResolvedValue({ id: "report_upd", items: [] });
  mockReportUpdateMany.mockResolvedValue({ count: 0 });
  mockItemDeleteMany.mockResolvedValue({ count: 0 });
  mockOrgFindMany.mockResolvedValue([]);
  // Default transaction passthrough — runs the callback with our mocks
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const tx = {
      tradeSupplement2Report: {
        findFirst: mockReportFindFirst,
        create: mockReportCreate,
        update: mockReportUpdate,
      },
      tradeSupplement2ReportItem: {
        deleteMany: mockItemDeleteMany,
      },
    };
    return fn(tx);
  });
});

function makeOperation(overrides: Record<string, unknown> = {}) {
  return {
    id: "op_1",
    reference: "ISAR-2026-001",
    shipToCountry: "DE",
    actualShipDate: new Date("2026-03-15T00:00:00.000Z"),
    scheduledShipDate: null,
    lines: [
      {
        id: "line_1",
        quantity: 5,
        // BigInt cents: €1000 = 100_000 cents
        unitValue: BigInt(100_000),
        unitCurrency: "USD",
        item: { eccnEU: null, eccnUS: "5A002.a.1.a" },
      },
    ],
    ...overrides,
  };
}

describe("listEligibleOperations", () => {
  it("returns operations with at least one eligible ECCN line", async () => {
    mockOpFindMany.mockResolvedValueOnce([makeOperation()]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result).toHaveLength(1);
    expect(result[0].operationId).toBe("op_1");
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].eccn).toBe("5A002.a.1.a");
    expect(result[0].items[0].lineValue).toBe(5000);
  });

  it("excludes operations whose lines have no eligible ECCN", async () => {
    mockOpFindMany.mockResolvedValueOnce([
      makeOperation({
        lines: [
          {
            id: "line_x",
            quantity: 1,
            unitValue: BigInt(10_000),
            unitCurrency: "EUR",
            item: { eccnEU: "9A515.a", eccnUS: "9A515.a" },
          },
        ],
      }),
    ]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result).toHaveLength(0);
  });

  // T-H8: the old test encoded the bug (scheduled-only ops being included).
  // A BIS Supplement No. 2 report covers exports that ACTUALLY occurred, so
  // only EXECUTED ops with actualShipDate set are eligible. An op with
  // actualShipDate=null is not shipped and must not appear in the report.
  // The query now filters status=EXECUTED AND actualShipDate in-period, so
  // the DB will never return a null-actualShipDate row. Test updated accordingly.
  it("uses actualShipDate (not scheduledShipDate) to bin an EXECUTED operation (T-H8)", async () => {
    const shipDate = new Date("2026-04-10T00:00:00.000Z");
    mockOpFindMany.mockResolvedValueOnce([
      makeOperation({
        actualShipDate: shipDate,
        scheduledShipDate: new Date("2026-03-01T00:00:00.000Z"),
      }),
    ]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result[0].shipDate.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });

  it("sums lineValue across multiple eligible lines on one operation", async () => {
    mockOpFindMany.mockResolvedValueOnce([
      makeOperation({
        lines: [
          {
            id: "line_a",
            quantity: 2,
            // BigInt cents: €500 = 50_000 cents
            unitValue: BigInt(50_000),
            unitCurrency: "USD",
            item: { eccnEU: null, eccnUS: "5A002.a" },
          },
          {
            id: "line_b",
            quantity: 1,
            // BigInt cents: €2000 = 200_000 cents
            unitValue: BigInt(200_000),
            unitCurrency: "USD",
            item: { eccnEU: null, eccnUS: "4A003.b" },
          },
        ],
      }),
    ]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result[0].items).toHaveLength(2);
    expect(result[0].totalValue).toBe(3000); // 2*500 + 1*2000
  });

  // T-H8: verify the where clause contains status=EXECUTED and actualShipDate range
  it("passes status=EXECUTED and actualShipDate range to findMany (T-H8)", async () => {
    mockOpFindMany.mockResolvedValueOnce([]);
    await listEligibleOperations("org_1", PERIOD.start, PERIOD.end);
    const callArgs = mockOpFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("EXECUTED");
    expect(callArgs.where.actualShipDate).toEqual({
      gte: PERIOD.start,
      lt: PERIOD.end,
    });
    // Must NOT contain an OR branch that allows scheduledShipDate-only ops
    expect(callArgs.where.OR).toBeUndefined();
  });

  // T-H8: a DRAFT op with only scheduledShipDate in-period must NOT be included
  it("excludes DRAFT operations that only have a scheduledShipDate in the period (T-H8)", async () => {
    // The mock returns a DRAFT op (status not EXECUTED, actualShipDate null)
    // with scheduledShipDate in-period. After the fix the where clause
    // must never request such rows, so we simulate the DB correctly filtering
    // them out by having findMany return nothing.
    mockOpFindMany.mockResolvedValueOnce([]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result).toHaveLength(0);
    // Confirm the query did NOT ask for scheduledShipDate-only rows
    const callArgs = mockOpFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("EXECUTED");
    expect(callArgs.where.OR).toBeUndefined();
  });

  it("prefers eccnUS over eccnEU when both are present", async () => {
    mockOpFindMany.mockResolvedValueOnce([
      makeOperation({
        lines: [
          {
            id: "line_z",
            quantity: 1,
            unitValue: BigInt(10_000),
            unitCurrency: "EUR",
            item: { eccnEU: "9A515.a", eccnUS: "5A002.a" },
          },
        ],
      }),
    ]);
    const result = await listEligibleOperations(
      "org_1",
      PERIOD.start,
      PERIOD.end,
    );
    expect(result[0].items[0].eccn).toBe("5A002.a");
  });
});

describe("generateReport", () => {
  it("creates a new DRAFT report with snapshot items", async () => {
    mockOpFindMany.mockResolvedValueOnce([makeOperation()]);
    mockReportFindFirst.mockResolvedValueOnce(null);
    mockReportCreate.mockResolvedValueOnce({
      id: "report_new",
      organizationId: "org_1",
      reportingPeriod: "2026-H1",
      status: "DRAFT",
      items: [
        {
          id: "item_1",
          operationId: "op_1",
          operationReference: "ISAR-2026-001",
          eccn: "5A002.a.1.a",
          destinationCountry: "DE",
          quantity: 5,
          totalValue: 5000,
          currency: "USD",
          shipDate: new Date("2026-03-15T00:00:00.000Z"),
        },
      ],
    });

    const report = await generateReport("org_1", PERIOD, "user_1");
    expect(mockReportCreate).toHaveBeenCalledOnce();
    const createArgs = mockReportCreate.mock.calls[0][0];
    expect(createArgs.data.organizationId).toBe("org_1");
    expect(createArgs.data.reportingPeriod).toBe("2026-H1");
    expect(createArgs.data.status).toBe("DRAFT");
    expect(createArgs.data.items.create).toHaveLength(1);
    expect(report.items).toHaveLength(1);
  });

  it("updates an existing DRAFT, pruning + replacing item rows", async () => {
    mockOpFindMany.mockResolvedValueOnce([makeOperation()]);
    mockReportFindFirst.mockResolvedValueOnce({
      id: "report_existing",
      status: "DRAFT",
    });
    mockReportUpdate.mockResolvedValueOnce({
      id: "report_existing",
      items: [],
    });

    await generateReport("org_1", PERIOD, "user_1");
    expect(mockItemDeleteMany).toHaveBeenCalledWith({
      where: { reportId: "report_existing" },
    });
    expect(mockReportUpdate).toHaveBeenCalledOnce();
    expect(mockReportCreate).not.toHaveBeenCalled();
  });

  it("refuses to regenerate a FILED report", async () => {
    mockOpFindMany.mockResolvedValueOnce([makeOperation()]);
    mockReportFindFirst.mockResolvedValueOnce({
      id: "report_filed",
      status: "FILED",
    });

    await expect(generateReport("org_1", PERIOD, "user_1")).rejects.toThrow(
      /status is FILED/,
    );
  });

  it("aggregates multiple lines with the same ECCN in one operation", async () => {
    mockOpFindMany.mockResolvedValueOnce([
      makeOperation({
        lines: [
          {
            id: "line_a",
            quantity: 3,
            // BigInt cents: €100 = 10_000 cents
            unitValue: BigInt(10_000),
            unitCurrency: "USD",
            item: { eccnEU: null, eccnUS: "5A002.a" },
          },
          {
            id: "line_b",
            quantity: 2,
            unitValue: BigInt(10_000),
            unitCurrency: "USD",
            item: { eccnEU: null, eccnUS: "5A002.a" },
          },
        ],
      }),
    ]);
    mockReportFindFirst.mockResolvedValueOnce(null);
    mockReportCreate.mockResolvedValueOnce({
      id: "report_new",
      items: [],
    });
    await generateReport("org_1", PERIOD, "user_1");
    const createArgs = mockReportCreate.mock.calls[0][0];
    // One aggregated row per (operation, ECCN) — both lines collapse
    // into a single row with quantity 5, totalValue 500.
    expect(createArgs.data.items.create).toHaveLength(1);
    expect(createArgs.data.items.create[0].quantity).toBe(5);
    expect(createArgs.data.items.create[0].totalValue).toBe(500);
  });
});

describe("markFiled", () => {
  it("transitions DRAFT to FILED with filedAt + reference number", async () => {
    mockReportFindFirst.mockResolvedValueOnce({
      id: "report_1",
      status: "DRAFT",
      organizationId: "org_1",
    });
    mockReportUpdate.mockResolvedValueOnce({
      id: "report_1",
      status: "FILED",
    });
    const filed = await markFiled({
      organizationId: "org_1",
      reportId: "report_1",
      filedAt: new Date("2026-07-15T00:00:00.000Z"),
      bisReferenceNumber: "BIS-2026-12345",
      lastActionById: "user_1",
    });
    expect(filed.status).toBe("FILED");
    expect(mockReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report_1" },
        data: expect.objectContaining({
          status: "FILED",
          filedAt: new Date("2026-07-15T00:00:00.000Z"),
          bisReferenceNumber: "BIS-2026-12345",
        }),
      }),
    );
  });

  it("transitions OVERDUE to FILED (late filing)", async () => {
    mockReportFindFirst.mockResolvedValueOnce({
      id: "report_late",
      status: "OVERDUE",
      organizationId: "org_1",
    });
    mockReportUpdate.mockResolvedValueOnce({
      id: "report_late",
      status: "FILED",
    });
    await markFiled({
      organizationId: "org_1",
      reportId: "report_late",
      filedAt: new Date("2026-08-10T00:00:00.000Z"),
      lastActionById: "user_1",
    });
    expect(mockReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FILED" }),
      }),
    );
  });

  it("transitions FILED to AMENDED on re-file", async () => {
    mockReportFindFirst.mockResolvedValueOnce({
      id: "report_filed",
      status: "FILED",
      organizationId: "org_1",
    });
    mockReportUpdate.mockResolvedValueOnce({
      id: "report_filed",
      status: "AMENDED",
    });
    await markFiled({
      organizationId: "org_1",
      reportId: "report_filed",
      filedAt: new Date("2026-08-20T00:00:00.000Z"),
      lastActionById: "user_1",
    });
    expect(mockReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "AMENDED",
          amendedAt: new Date("2026-08-20T00:00:00.000Z"),
        }),
      }),
    );
  });

  it("refuses to file a report not in this org", async () => {
    mockReportFindFirst.mockResolvedValueOnce(null);
    await expect(
      markFiled({
        organizationId: "org_1",
        reportId: "report_x",
        filedAt: new Date(),
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe("getOverdueReports", () => {
  it("queries only DRAFT reports past due date", async () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    mockReportFindMany.mockResolvedValueOnce([
      { id: "r1", status: "DRAFT", dueDate: new Date("2026-07-31") },
    ]);
    const result = await getOverdueReports("org_1", now);
    expect(result).toHaveLength(1);
    expect(mockReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "DRAFT",
          dueDate: { lt: now },
        }),
      }),
    );
  });
});

describe("markOverdueReports", () => {
  it("returns the count of transitioned rows", async () => {
    mockReportUpdateMany.mockResolvedValueOnce({ count: 3 });
    const now = new Date("2026-08-01T00:00:00.000Z");
    const count = await markOverdueReports(now);
    expect(count).toBe(3);
    expect(mockReportUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "DRAFT",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });
  });
});

describe("openPeriodForAllOrganisations", () => {
  it("iterates active orgs and aggregates a summary", async () => {
    mockOrgFindMany.mockResolvedValueOnce([{ id: "org_a" }, { id: "org_b" }]);
    // First org: existing DRAFT exists → update path
    // Second org: no existing report → create path
    let opFindManyCalls = 0;
    mockOpFindMany.mockImplementation(async () => {
      opFindManyCalls += 1;
      return [makeOperation({ id: `op_${opFindManyCalls}` })];
    });
    let firstCall = true;
    mockReportFindFirst.mockImplementation(async () => {
      if (firstCall) {
        firstCall = false;
        return { id: "report_existing_a", status: "DRAFT" };
      }
      return null;
    });
    mockReportUpdate.mockResolvedValue({
      id: "report_existing_a",
      items: [{}],
    });
    mockReportCreate.mockResolvedValue({ id: "report_new_b", items: [{}] });

    const summary = await openPeriodForAllOrganisations(PERIOD);
    expect(summary.organisationsScanned).toBe(2);
    expect(summary.reportsCreated).toBe(1);
    expect(summary.reportsUpdated).toBe(1);
    expect(summary.totalEligibleOperations).toBe(2);
    expect(summary.errors).toHaveLength(0);
  });

  it("collects per-org errors without aborting the run", async () => {
    mockOrgFindMany.mockResolvedValueOnce([
      { id: "org_ok" },
      { id: "org_fail" },
    ]);
    mockOpFindMany.mockResolvedValue([makeOperation()]);
    // findFirst is called twice per org: once by openPeriodForAllOrgs
    // for the "before" check, and once inside generateReport's
    // transaction. For org_ok both return null (new create); for
    // org_fail the second call inside the transaction returns a FILED
    // report → generateReport throws.
    const sequence: Array<{ id: string; status: string } | null> = [
      null, // org_ok before-check
      null, // org_ok transaction lookup
      null, // org_fail before-check
      { id: "report_filed", status: "FILED" }, // org_fail transaction lookup
    ];
    let i = 0;
    mockReportFindFirst.mockImplementation(async () => {
      const r = sequence[i] ?? null;
      i += 1;
      return r;
    });
    mockReportCreate.mockResolvedValue({ id: "report_new", items: [{}] });

    const summary = await openPeriodForAllOrganisations(PERIOD);
    expect(summary.organisationsScanned).toBe(2);
    expect(summary.reportsCreated).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].organizationId).toBe("org_fail");
    expect(summary.errors[0].error).toMatch(/FILED/);
  });
});
