// tests/unit/lib/atlas/notify.test.ts

/**
 * Unit tests for src/lib/atlas/notify.ts.
 *
 * The two dispatch helpers fan out a SOURCE_AMENDED or
 * JURISDICTION_UPDATE row per subscriber. Pinned behaviours:
 *   - Empty subscribers → return 0, do NOT call createMany
 *   - Source dispatch dedupes when the same userId is subscribed to
 *     both SOURCE and its containing JURISDICTION
 *   - Source dispatch unions SOURCE + JURISDICTION subscriptions in
 *     the where clause when the source has a known jurisdiction
 *   - Source dispatch falls back to SOURCE-only when getLegalSourceById
 *     returns undefined (unknown source)
 *   - Failures are SWALLOWED (non-blocking by design) — return 0,
 *     log a warn, never throw
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findManyMock, createManyMock, getSourceMock, infoMock, warnMock } =
  vi.hoisted(() => ({
    findManyMock: vi.fn(),
    createManyMock: vi.fn(),
    getSourceMock: vi.fn(),
    infoMock: vi.fn(),
    warnMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAlertSubscription: { findMany: findManyMock },
    atlasNotification: { createMany: createManyMock },
  },
}));

vi.mock("@prisma/client", () => ({
  AtlasAlertTargetType: { SOURCE: "SOURCE", JURISDICTION: "JURISDICTION" },
  AtlasNotificationKind: {
    SOURCE_AMENDED: "SOURCE_AMENDED",
    JURISDICTION_UPDATE: "JURISDICTION_UPDATE",
    ADMIN_BROADCAST: "ADMIN_BROADCAST",
  },
}));

vi.mock("@/data/legal-sources", () => ({
  getLegalSourceById: getSourceMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: infoMock,
    warn: warnMock,
    error: vi.fn(),
  },
}));

import {
  dispatchSourceAmendment,
  dispatchJurisdictionUpdate,
} from "@/lib/atlas/notify";

beforeEach(() => {
  findManyMock.mockReset();
  createManyMock.mockReset();
  getSourceMock.mockReset();
  infoMock.mockReset();
  warnMock.mockReset();
});

describe("dispatchSourceAmendment — subscriber resolution", () => {
  it("returns 0 and skips createMany when no subscribers exist", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([]);

    const out = await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "Amendment X",
      summary: "Article 5 was added.",
    });

    expect(out).toEqual({ recipientCount: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("dedupes a single user subscribed to both SOURCE and JURISDICTION", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" }, // SOURCE row
      { userId: "u1", organizationId: "o1" }, // JURISDICTION row (dup)
      { userId: "u2", organizationId: "o2" }, // distinct user
    ]);
    createManyMock.mockResolvedValueOnce({ count: 2 });

    const out = await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "Amendment X",
      summary: "Test.",
    });

    expect(out.recipientCount).toBe(2);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const call = createManyMock.mock.calls[0][0];
    expect(call.data).toHaveLength(2);
    expect(call.data.map((d: { userId: string }) => d.userId).sort()).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("queries SOURCE + JURISDICTION subscriptions when source has a jurisdiction", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([]);
    await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "T",
      summary: "S",
    });

    const where = findManyMock.mock.calls[0][0].where as {
      OR: Array<{ targetType: string; targetId: string }>;
    };
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toMatchObject({
      targetType: "SOURCE",
      targetId: "DE-VVG",
    });
    expect(where.OR[1]).toMatchObject({
      targetType: "JURISDICTION",
      targetId: "DE",
    });
  });

  it("falls back to SOURCE-only subscriptions when getLegalSourceById returns undefined", async () => {
    getSourceMock.mockReturnValueOnce(undefined);
    findManyMock.mockResolvedValueOnce([]);
    await dispatchSourceAmendment({
      sourceId: "UNKNOWN",
      title: "T",
      summary: "S",
    });
    const where = findManyMock.mock.calls[0][0].where as {
      OR: Array<unknown>;
    };
    expect(where.OR).toHaveLength(1);
  });
});

describe("dispatchSourceAmendment — fan-out shape", () => {
  it("emits SOURCE_AMENDED rows with title, summary, and source linkage", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockResolvedValueOnce({ count: 1 });

    await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "VVG §80 amended",
      summary: "Wording adjusted.",
    });

    const data = createManyMock.mock.calls[0][0].data[0];
    expect(data).toMatchObject({
      userId: "u1",
      organizationId: "o1",
      kind: "SOURCE_AMENDED",
      title: "VVG §80 amended",
      summary: "Wording adjusted.",
      targetType: "SOURCE",
      targetId: "DE-VVG",
      sourceId: "DE-VVG",
    });
  });

  it("logs success at info level with sourceId + recipient count", async () => {
    // dispatchSourceAmendment calls getLegalSourceById twice (once in
    // subscribersForSource, once inline for the log context). Use plain
    // mockReturnValue so both calls hit the same payload.
    getSourceMock.mockReturnValue({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
      { userId: "u2", organizationId: "o2" },
    ]);
    createManyMock.mockResolvedValueOnce({ count: 2 });

    await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "X",
      summary: "Y",
    });

    expect(infoMock).toHaveBeenCalledOnce();
    const [, ctx] = infoMock.mock.calls[0];
    expect(ctx).toMatchObject({
      kind: "SOURCE_AMENDED",
      sourceId: "DE-VVG",
      jurisdiction: "DE",
      recipients: 2,
    });
  });
});

describe("dispatchSourceAmendment — failure tolerance (non-blocking)", () => {
  it("returns 0 when findMany rejects, logs a warn — does not throw", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockRejectedValueOnce(new Error("Neon timeout"));

    const out = await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "X",
      summary: "Y",
    });

    expect(out).toEqual({ recipientCount: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0][1].error).toContain("Neon timeout");
  });

  it("returns 0 when createMany rejects, logs a warn", async () => {
    getSourceMock.mockReturnValueOnce({ id: "DE-VVG", jurisdiction: "DE" });
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockRejectedValueOnce(new Error("unique constraint"));

    const out = await dispatchSourceAmendment({
      sourceId: "DE-VVG",
      title: "X",
      summary: "Y",
    });

    expect(out).toEqual({ recipientCount: 0 });
    expect(warnMock).toHaveBeenCalledOnce();
  });

  it("never throws on a non-Error rejection (string)", async () => {
    getSourceMock.mockReturnValueOnce(undefined);
    findManyMock.mockRejectedValueOnce("network down");
    await expect(
      dispatchSourceAmendment({
        sourceId: "X",
        title: "T",
        summary: "S",
      }),
    ).resolves.toEqual({ recipientCount: 0 });
    expect(warnMock.mock.calls[0][1].error).toBe("network down");
  });
});

describe("dispatchJurisdictionUpdate", () => {
  it("returns 0 when no subscribers and skips createMany", async () => {
    findManyMock.mockResolvedValueOnce([]);
    const out = await dispatchJurisdictionUpdate({
      jurisdiction: "FR",
      title: "FR overhaul",
      summary: "Test.",
    });
    expect(out).toEqual({ recipientCount: 0 });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("queries with targetType=JURISDICTION and targetId=jurisdiction", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "T",
      summary: "S",
    });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { targetType: "JURISDICTION", targetId: "DE" },
      select: { userId: true, organizationId: true },
    });
  });

  it("emits JURISDICTION_UPDATE rows referencing the jurisdiction code", async () => {
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockResolvedValueOnce({ count: 1 });

    await dispatchJurisdictionUpdate({
      jurisdiction: "FR",
      sourceId: "FR-LOI-2008-518",
      title: "Décret revised",
      summary: "Article 4 reworded.",
    });

    const data = createManyMock.mock.calls[0][0].data[0];
    expect(data).toMatchObject({
      kind: "JURISDICTION_UPDATE",
      title: "Décret revised",
      targetType: "JURISDICTION",
      targetId: "FR",
      sourceId: "FR-LOI-2008-518",
    });
  });

  it("emits sourceId=null when params.sourceId is omitted", async () => {
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockResolvedValueOnce({ count: 1 });
    await dispatchJurisdictionUpdate({
      jurisdiction: "EU",
      title: "T",
      summary: "S",
    });
    const data = createManyMock.mock.calls[0][0].data[0];
    expect(data.sourceId).toBeNull();
  });

  it("emits sourceId=null when params.sourceId is explicitly null", async () => {
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockResolvedValueOnce({ count: 1 });
    await dispatchJurisdictionUpdate({
      jurisdiction: "EU",
      sourceId: null,
      title: "T",
      summary: "S",
    });
    const data = createManyMock.mock.calls[0][0].data[0];
    expect(data.sourceId).toBeNull();
  });

  it("returns 0 and warns when createMany rejects", async () => {
    findManyMock.mockResolvedValueOnce([
      { userId: "u1", organizationId: "o1" },
    ]);
    createManyMock.mockRejectedValueOnce(new Error("constraint failure"));
    const out = await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "X",
      summary: "Y",
    });
    expect(out).toEqual({ recipientCount: 0 });
    expect(warnMock).toHaveBeenCalledOnce();
  });
});
