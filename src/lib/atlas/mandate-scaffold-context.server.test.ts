import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — mandate-scaffold-context test coverage (T0.3).
 *
 * The shared scaffold-context loader is consumed by every drafting +
 * templates bundle to pre-fill mandate facts (parties, header
 * metadata, lawyer owner, customInstructions). If the early-return
 * paths or the normalization shape regress, every draft tool ends up
 * with broken context — silent failure mode.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: {
      findFirst,
    },
  },
}));

import { loadMandateScaffoldContext } from "./mandate-scaffold-context.server";

beforeEach(() => {
  findFirst.mockReset();
});

describe("loadMandateScaffoldContext", () => {
  it("returns null without DB query when mandateId is null", async () => {
    const result = await loadMandateScaffoldContext({
      mandateId: null,
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null without DB query when mandateId is undefined", async () => {
    const result = await loadMandateScaffoldContext({
      mandateId: undefined,
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null without DB query when mandateId is empty string (falsy)", async () => {
    const result = await loadMandateScaffoldContext({
      mandateId: "",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null when DB lookup yields no mandate (access-gated)", async () => {
    findFirst.mockResolvedValue(null);

    const result = await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("scopes the query by mandateId + organizationId + (owner OR member)", async () => {
    findFirst.mockResolvedValue(null);
    await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    const arg = findFirst.mock.calls[0]?.[0] as {
      where: {
        id: string;
        organizationId: string;
        OR: Array<Record<string, unknown>>;
      };
    };
    expect(arg.where.id).toBe("m-42");
    expect(arg.where.organizationId).toBe("org-A");
    expect(arg.where.OR).toEqual([
      { ownerUserId: "u1" },
      { members: { some: { userId: "u1" } } },
    ]);
  });

  it("happy path: returns normalised context with all fields", async () => {
    findFirst.mockResolvedValue({
      id: "m-42",
      name: "OrbitCo Authorisation",
      jurisdiction: "DE",
      operatorType: "spacecraft_operator",
      primaryAuthority: "BMWK",
      clientName: "OrbitCo GmbH",
      clientContact: "ceo@orbitco.example",
      customInstructions: "Always cc the CTO.",
      parties: [
        {
          id: "p1",
          type: "client",
          name: "OrbitCo GmbH",
          role: "Operator",
          contact: "ops@orbitco.example",
          address: "Munich",
          reference: "OC-001",
        },
      ],
      owner: { name: "Dr. Jurist", email: "jurist@example.com" },
    });

    const result = await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    expect(result).toEqual({
      id: "m-42",
      name: "OrbitCo Authorisation",
      jurisdiction: "DE",
      operatorType: "spacecraft_operator",
      primaryAuthority: "BMWK",
      clientName: "OrbitCo GmbH",
      clientContact: "ceo@orbitco.example",
      customInstructions: "Always cc the CTO.",
      parties: [
        expect.objectContaining({
          id: "p1",
          type: "client",
          name: "OrbitCo GmbH",
        }),
      ],
      ownerName: "Dr. Jurist",
      ownerEmail: "jurist@example.com",
    });
  });

  it("handles missing owner gracefully (ownerName/ownerEmail = null)", async () => {
    findFirst.mockResolvedValue({
      id: "m-42",
      name: "X",
      jurisdiction: null,
      operatorType: null,
      primaryAuthority: null,
      clientName: null,
      clientContact: null,
      customInstructions: null,
      parties: [],
      owner: null,
    });

    const result = await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    expect(result?.ownerName).toBeNull();
    expect(result?.ownerEmail).toBeNull();
  });

  it("handles owner with missing name or email (partial nulls)", async () => {
    findFirst.mockResolvedValue({
      id: "m-42",
      name: "X",
      jurisdiction: null,
      operatorType: null,
      primaryAuthority: null,
      clientName: null,
      clientContact: null,
      customInstructions: null,
      parties: [],
      owner: { name: null, email: "no-name@example.com" },
    });

    const result = await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    expect(result?.ownerName).toBeNull();
    expect(result?.ownerEmail).toBe("no-name@example.com");
  });

  it("passes parties array through verbatim", async () => {
    const parties = [
      {
        id: "p1",
        type: "client",
        name: "A",
        role: null,
        contact: null,
        address: null,
        reference: null,
      },
      {
        id: "p2",
        type: "opponent",
        name: "B",
        role: null,
        contact: null,
        address: null,
        reference: null,
      },
    ];
    findFirst.mockResolvedValue({
      id: "m-42",
      name: "X",
      jurisdiction: null,
      operatorType: null,
      primaryAuthority: null,
      clientName: null,
      clientContact: null,
      customInstructions: null,
      parties,
      owner: null,
    });

    const result = await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    expect(result?.parties).toHaveLength(2);
    expect(result?.parties[0]?.type).toBe("client");
    expect(result?.parties[1]?.type).toBe("opponent");
  });

  it("requests parties ordered by [type asc, createdAt asc]", async () => {
    findFirst.mockResolvedValue(null);

    await loadMandateScaffoldContext({
      mandateId: "m-42",
      callerUserId: "u1",
      callerOrgId: "org-A",
    });

    const arg = findFirst.mock.calls[0]?.[0] as {
      select: { parties: { orderBy: unknown } };
    };
    expect(arg.select.parties.orderBy).toEqual([
      { type: "asc" },
      { createdAt: "asc" },
    ]);
  });
});
