/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for detectConflicts — the Prisma-touching conflict scan.
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: { findFirst: vi.fn(), findMany: vi.fn() },
    atlasConflictClearance: { findMany: vi.fn() },
  },
}));

const { detectConflicts } = await import("./conflict-check-detect.server");
const { prisma } = await import("@/lib/prisma");

const mockedPrisma = prisma as unknown as {
  atlasMandate: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  atlasConflictClearance: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedPrisma.atlasConflictClearance.findMany.mockResolvedValue([]);
});

const target = {
  id: "m1",
  organizationId: "o1",
  name: "Mandat A",
  status: "active",
  parties: [{ id: "p1", name: "Planet Labs GmbH", type: "opponent" }],
};

describe("detectConflicts", () => {
  it("flags a new opponent matching an active client in another mandate (high)", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(target);
    mockedPrisma.atlasMandate.findMany.mockResolvedValue([
      {
        id: "m2",
        name: "Mandat B",
        status: "active",
        parties: [{ id: "p2", name: "Planet Labs Inc", type: "client" }],
      },
    ]);

    const matches = await detectConflicts({ orgId: "o1", mandateId: "m1" });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      severity: "high",
      matchedMandateId: "m2",
      normalizedName: "planet labs",
      newPartyId: "p1",
      matchedPartyId: "p2",
    });
  });

  it("scans only the caller's organisation (tenant isolation)", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(target);
    mockedPrisma.atlasMandate.findMany.mockResolvedValue([]);

    await detectConflicts({ orgId: "o1", mandateId: "m1" });

    const findManyArg = mockedPrisma.atlasMandate.findMany.mock.calls[0][0];
    expect(findManyArg.where.organizationId).toBe("o1");
    expect(findManyArg.where.id).toEqual({ not: "m1" });
  });

  it("subtracts a persisted clearance for the same pair", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(target);
    mockedPrisma.atlasMandate.findMany.mockResolvedValue([
      {
        id: "m2",
        name: "Mandat B",
        status: "active",
        parties: [{ id: "p2", name: "Planet Labs Inc", type: "client" }],
      },
    ]);
    mockedPrisma.atlasConflictClearance.findMany.mockResolvedValue([
      {
        matchedMandateId: "m2",
        normalizedName: "planet labs",
        status: "cleared",
      },
    ]);

    const matches = await detectConflicts({ orgId: "o1", mandateId: "m1" });
    expect(matches).toHaveLength(0);
  });

  it("does not flag non-adverse pairings (authority vs authority)", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue({
      ...target,
      parties: [{ id: "p1", name: "BNetzA", type: "authority" }],
    });
    mockedPrisma.atlasMandate.findMany.mockResolvedValue([
      {
        id: "m2",
        name: "Mandat B",
        status: "active",
        parties: [{ id: "p2", name: "BNetzA", type: "authority" }],
      },
    ]);

    const matches = await detectConflicts({ orgId: "o1", mandateId: "m1" });
    expect(matches).toHaveLength(0);
  });

  it("returns empty when the target mandate is not found in the org", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(null);
    const matches = await detectConflicts({ orgId: "o1", mandateId: "nope" });
    expect(matches).toHaveLength(0);
  });

  it("gates the target lookup on mandate membership when callerUserId is given", async () => {
    // A non-member's findFirst resolves null (the membership OR-filter
    // excludes them), so the scan must short-circuit to [] — no party
    // names of a walled-off mandate leak.
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(null);

    const matches = await detectConflicts({
      orgId: "o1",
      mandateId: "m1",
      callerUserId: "stranger",
    });

    expect(matches).toHaveLength(0);
    // the membership OR-filter must be present on the target lookup
    const where = mockedPrisma.atlasMandate.findFirst.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { ownerUserId: "stranger" },
      { members: { some: { userId: "stranger" } } },
    ]);
  });

  it("omits the membership filter when callerUserId is absent (firm-wide scan)", async () => {
    mockedPrisma.atlasMandate.findFirst.mockResolvedValue(target);
    mockedPrisma.atlasMandate.findMany.mockResolvedValue([]);

    await detectConflicts({ orgId: "o1", mandateId: "m1" });

    const where = mockedPrisma.atlasMandate.findFirst.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });
});
