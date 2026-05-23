/**
 * Tests for src/lib/trade/welcome-feed/activity-feed-service.ts.
 *
 * Coverage:
 *   1. Empty data returns []
 *   2. Operations created produce OPERATION_CREATED events
 *   3. Operations executed (with closedAt) produce OPERATION_EXECUTED
 *   4. Licenses with issuedAt produce LICENSE_ISSUED
 *   5. Screening results produce PARTY_SCREENED with hit count
 *   6. Items created produce ITEM_CREATED
 *   7. EUC requested + validated transitions each emit
 *   8. Re-export consents emit drafted + decided per-transition
 *   9. VSD discovered + submitted each emit
 *  10. Sammelgenehmigung created + activated each emit
 *  11. Sammelgenehmigung activation skipped when updatedAt == createdAt
 *  12. Events sorted descending by occurredAt
 *  13. maxItems caps the output
 *  14. windowDays option scopes Prisma queries
 *  15. groupActivityByDay buckets events by ISO date
 *  16. formatRelativeTime — minute, hour, day, fallback formats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  opsFind,
  licFind,
  scrFind,
  itemFind,
  eucFind,
  reexportFind,
  vsdFind,
  sagFind,
} = vi.hoisted(() => ({
  opsFind: vi.fn(),
  licFind: vi.fn(),
  scrFind: vi.fn(),
  itemFind: vi.fn(),
  eucFind: vi.fn(),
  reexportFind: vi.fn(),
  vsdFind: vi.fn(),
  sagFind: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { findMany: opsFind },
    tradeLicense: { findMany: licFind },
    tradeScreeningResult: { findMany: scrFind },
    tradeItem: { findMany: itemFind },
    tradeEUCRequest: { findMany: eucFind },
    tradeReexportConsent: { findMany: reexportFind },
    tradeVoluntaryDisclosure: { findMany: vsdFind },
    tradeSammelgenehmigung: { findMany: sagFind },
  },
}));

import {
  getActivityFeed,
  groupActivityByDay,
  formatRelativeTime,
  type ActivityEvent,
} from "./activity-feed-service";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function resetAllToEmpty() {
  vi.clearAllMocks();
  // Order of Promise.all in implementation:
  //   operationsCreated, operationsExecuted, licensesIssued, screenings,
  //   items, eucRequests, eucValidated, reexportEvents, vsdDiscovered,
  //   vsdSubmitted, sammelCreated, sammelActivated
  opsFind.mockResolvedValue([]);
  licFind.mockResolvedValue([]);
  scrFind.mockResolvedValue([]);
  itemFind.mockResolvedValue([]);
  eucFind.mockResolvedValue([]);
  reexportFind.mockResolvedValue([]);
  vsdFind.mockResolvedValue([]);
  sagFind.mockResolvedValue([]);
}

beforeEach(() => {
  resetAllToEmpty();
});

describe("getActivityFeed", () => {
  it("returns [] when no data", async () => {
    const res = await getActivityFeed("org_1", { now: NOW });
    expect(res).toEqual([]);
  });

  it("emits OPERATION_CREATED for newly created ops", async () => {
    opsFind
      .mockResolvedValueOnce([
        {
          id: "op_1",
          reference: "OP-2026-0034",
          createdAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
          createdBy: { email: "alice@org.de" },
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      kind: "OPERATION_CREATED",
      title: "Operation OP-2026-0034 created",
      actorEmail: "alice@org.de",
      href: "/trade/operations/op_1",
      category: "operation",
    });
  });

  it("emits OPERATION_EXECUTED with closedAt as occurredAt", async () => {
    const closedAt = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);
    opsFind.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "op_2",
        reference: "OP-2026-0099",
        closedAt,
        createdBy: { email: "bob@org.de" },
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(1);
    expect(res[0].kind).toBe("OPERATION_EXECUTED");
    expect(res[0].occurredAt).toEqual(closedAt);
    expect(res[0].title).toContain("OP-2026-0099");
  });

  it("emits LICENSE_ISSUED from issuedAt", async () => {
    const issuedAt = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    licFind.mockResolvedValue([
      {
        id: "lic_1",
        licenseNumber: "BAFA-AGG-12-2026",
        licenseType: "BAFA_AGG",
        issuedAt,
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(1);
    expect(res[0].kind).toBe("LICENSE_ISSUED");
    expect(res[0].title).toBe("License BAFA-AGG-12-2026 issued");
    expect(res[0].href).toBe("/trade/licenses");
  });

  it("emits PARTY_SCREENED with hit count from JSON hits array", async () => {
    scrFind.mockResolvedValue([
      {
        id: "scr_1",
        createdAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000),
        decision: "CLEAR",
        hits: [],
        partyId: "party_a",
        decidedBy: { email: "carol@org.de" },
        party: { legalName: "FOO Ltd." },
      },
      {
        id: "scr_2",
        createdAt: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
        decision: "POTENTIAL_MATCH",
        hits: [
          { list: "OFAC", entryId: "1" },
          { list: "EU", entryId: "2" },
        ],
        partyId: "party_b",
        decidedBy: null,
        party: { legalName: "Bar GmbH" },
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(2);
    const first = res.find((e) => e.id === "PARTY_SCREENED:scr_1")!;
    expect(first.title).toBe("Counterparty FOO Ltd. screened — 0 hits");
    expect(first.href).toBe("/trade/parties/party_a");
    const second = res.find((e) => e.id === "PARTY_SCREENED:scr_2")!;
    expect(second.title).toBe("Counterparty Bar GmbH screened — 2 hits");
    expect(second.actorEmail).toBeNull();
  });

  it("emits ITEM_CREATED", async () => {
    itemFind.mockResolvedValue([
      {
        id: "item_x",
        name: "Solar Array Drive Mechanism",
        createdAt: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
        createdBy: { email: "dave@org.de" },
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      kind: "ITEM_CREATED",
      title: 'Item "Solar Array Drive Mechanism" created',
      href: "/trade/items/item_x",
      category: "item",
    });
  });

  it("emits EUC_REQUESTED + EUC_VALIDATED", async () => {
    const requestedAt = new Date(NOW.getTime() - 10 * 60 * 60 * 1000);
    const validatedAt = new Date(NOW.getTime() - 1 * 60 * 60 * 1000);
    eucFind
      .mockResolvedValueOnce([
        {
          id: "euc_1",
          formType: "BAFA_C1",
          requestedAt,
          party: { legalName: "End User GmbH" },
          lastActionBy: { email: "ellie@org.de" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "euc_2",
          validatedAt,
          party: { legalName: "Final User Corp" },
          lastActionBy: { email: "frank@org.de" },
        },
      ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(2);
    const requested = res.find((e) => e.kind === "EUC_REQUESTED")!;
    expect(requested.title).toBe("EUC BAFA C1 requested from End User GmbH");
    const validated = res.find((e) => e.kind === "EUC_VALIDATED")!;
    expect(validated.title).toBe("EUC from Final User Corp validated");
  });

  it("emits both drafted and decided events for re-export consents", async () => {
    const requestedAt = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const decidedAt = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);
    reexportFind.mockResolvedValue([
      {
        id: "rec_1",
        status: "APPROVED",
        requestedAt,
        decidedAt,
        originalExporterName: "Old Exporter Co.",
        newDestinationCountry: "JP",
        newEndUserName: "Tokyo Customer KK",
        lastActionBy: { email: "grace@org.de" },
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(2);
    const drafted = res.find((e) => e.kind === "REEXPORT_DRAFTED")!;
    expect(drafted.title).toContain("Tokyo Customer KK");
    expect(drafted.title).toContain("JP");
    const approved = res.find((e) => e.kind === "REEXPORT_APPROVED")!;
    expect(approved.occurredAt).toEqual(decidedAt);
    expect(approved.title).toContain("Old Exporter Co.");
  });

  it("emits VSD_DISCOVERED + VSD_SUBMITTED", async () => {
    const discoveredAt = new Date(NOW.getTime() - 12 * 60 * 60 * 1000);
    const submittedAt = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
    vsdFind
      .mockResolvedValueOnce([
        {
          id: "vsd_1",
          title: "Shipped 5A002 to RU without license",
          discoveredAt,
          authority: "BIS",
          lastActionBy: { email: "henry@org.de" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "vsd_2",
          title: "Misclassification on item X",
          submittedAt,
          authority: "BAFA",
          lastActionBy: { email: "iris@org.de" },
        },
      ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(2);
    const disc = res.find((e) => e.kind === "VSD_DISCOVERED")!;
    expect(disc.title).toBe(
      'VSD discovered — "Shipped 5A002 to RU without license" (BIS)',
    );
    const sub = res.find((e) => e.kind === "VSD_SUBMITTED")!;
    expect(sub.title).toBe(
      'VSD submitted to BAFA — "Misclassification on item X"',
    );
  });

  it("emits SAMMELGENEHMIGUNG_CREATED + ACTIVATED when timestamps differ", async () => {
    const createdAt = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);
    sagFind
      .mockResolvedValueOnce([
        {
          id: "sag_1",
          title: "AeroJet 2026-2027",
          bafaReference: "AGG-DE-2026-12345",
          createdAt,
          lastActionBy: { email: "jane@org.de" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "sag_2",
          title: "Spectrum 2026",
          bafaReference: "AGG-DE-2026-99999",
          updatedAt,
          createdAt: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000),
          lastActionBy: { email: "kate@org.de" },
        },
      ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toHaveLength(2);
    expect(
      res.find((e) => e.kind === "SAMMELGENEHMIGUNG_CREATED"),
    ).toBeDefined();
    expect(
      res.find((e) => e.kind === "SAMMELGENEHMIGUNG_ACTIVATED"),
    ).toBeDefined();
  });

  it("skips SAG activation when updatedAt equals createdAt (never updated)", async () => {
    const ts = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);
    sagFind.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "sag_3",
        title: "Brand New SAG",
        bafaReference: null,
        updatedAt: ts,
        createdAt: ts,
        lastActionBy: null,
      },
    ]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res).toEqual([]);
  });

  it("sorts results descending by occurredAt", async () => {
    opsFind
      .mockResolvedValueOnce([
        {
          id: "op_old",
          reference: "OP-1",
          createdAt: new Date(NOW.getTime() - 10 * 60 * 60 * 1000),
          createdBy: { email: "x@org.de" },
        },
        {
          id: "op_new",
          reference: "OP-2",
          createdAt: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
          createdBy: { email: "x@org.de" },
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await getActivityFeed("org_1", { now: NOW });

    expect(res.map((e) => e.id)).toEqual([
      "OPERATION_CREATED:op_new",
      "OPERATION_CREATED:op_old",
    ]);
  });

  it("respects maxItems cap", async () => {
    const stubs = Array.from({ length: 50 }).map((_, i) => ({
      id: `op_${i}`,
      reference: `OP-${i}`,
      createdAt: new Date(NOW.getTime() - i * 60 * 1000),
      createdBy: { email: "x@org.de" },
    }));
    opsFind.mockResolvedValueOnce(stubs).mockResolvedValueOnce([]);

    const res = await getActivityFeed("org_1", { now: NOW, maxItems: 5 });

    expect(res).toHaveLength(5);
  });

  it("threads windowDays through to Prisma where-clauses", async () => {
    await getActivityFeed("org_1", { now: NOW, windowDays: 7 });

    // First call = operationsCreated; capture the where clause.
    const firstCallArgs = opsFind.mock.calls[0]?.[0];
    expect(firstCallArgs?.where?.createdAt?.gte).toBeInstanceOf(Date);
    const gte = firstCallArgs.where.createdAt.gte as Date;
    const expected = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(gte.getTime()).toBe(expected.getTime());
  });
});

describe("groupActivityByDay", () => {
  it("buckets events into YYYY-MM-DD groups, newest first", () => {
    const e1: ActivityEvent = {
      id: "a",
      kind: "ITEM_CREATED",
      occurredAt: new Date("2026-06-15T10:00:00Z"),
      title: "Item A",
      actorEmail: null,
      href: "/trade/items/a",
      category: "item",
    };
    const e2: ActivityEvent = {
      id: "b",
      kind: "ITEM_CREATED",
      occurredAt: new Date("2026-06-15T08:00:00Z"),
      title: "Item B",
      actorEmail: null,
      href: "/trade/items/b",
      category: "item",
    };
    const e3: ActivityEvent = {
      id: "c",
      kind: "ITEM_CREATED",
      occurredAt: new Date("2026-06-14T12:00:00Z"),
      title: "Item C",
      actorEmail: null,
      href: "/trade/items/c",
      category: "item",
    };

    const groups = groupActivityByDay([e1, e2, e3]);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe("2026-06-15");
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].date).toBe("2026-06-14");
    expect(groups[1].events).toHaveLength(1);
  });

  it("returns [] for empty input", () => {
    expect(groupActivityByDay([])).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for <1m", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 30 * 1000), NOW)).toBe(
      "just now",
    );
  });
  it("returns Nm ago for minutes", () => {
    expect(
      formatRelativeTime(new Date(NOW.getTime() - 10 * 60 * 1000), NOW),
    ).toBe("10m ago");
  });
  it("returns Nh ago for hours", () => {
    expect(
      formatRelativeTime(new Date(NOW.getTime() - 3 * 60 * 60 * 1000), NOW),
    ).toBe("3h ago");
  });
  it("returns Nd ago for days", () => {
    expect(
      formatRelativeTime(
        new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000),
        NOW,
      ),
    ).toBe("5d ago");
  });
  it("falls back to ISO date for >30 days", () => {
    const old = new Date("2025-01-01T00:00:00Z");
    expect(formatRelativeTime(old, NOW)).toBe("2025-01-01");
  });
});
