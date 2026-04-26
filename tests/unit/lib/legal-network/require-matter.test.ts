/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the matter access middleware. Two responsibilities here:
 *
 *   1. requireActiveMatter — every Atlas-side data read passes through
 *      this single chokepoint. A regression makes scope-narrowing and
 *      tenant isolation moot. Tests cover all five MatterAccessErrorCodes
 *      plus the firm-vs-operator asymmetry (operators don't need a
 *      scope grant to introspect their own matter).
 *
 *   2. emitAccessLog — appends a hash-chained tamper-evident entry. The
 *      key invariant is `previousHash`: first entry hashes off the
 *      matter's handshakeHash; subsequent entries hash off the last
 *      entry's entryHash. We use the REAL `computeAccessLogEntryHash`
 *      so any change to the hash payload (a forgotten field, a flipped
 *      argument) shows up here as a chain mismatch.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScopeItem } from "@/lib/legal-network/scope";

// server-only is imported transitively; stub so the module graph
// imports under jsdom.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    legalMatter: {
      findUnique: vi.fn(),
    },
    legalMatterAccessLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// We intentionally DO NOT mock @/lib/legal-network/handshake — letting
// the real hash function run is the whole point of the chain tests.

import { prisma } from "@/lib/prisma";
import {
  requireActiveMatter,
  emitAccessLog,
  MatterAccessError,
} from "@/lib/legal-network/require-matter";

const mockedPrisma = vi.mocked(prisma);

// ─── Builders ─────────────────────────────────────────────────────────

const SCOPE: ScopeItem[] = [
  { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ", "ANNOTATE"] },
];

function buildMatter(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "matter-1",
    lawFirmOrgId: "firm-1",
    clientOrgId: "client-1",
    name: "Test Mandate",
    reference: null,
    description: null,
    scope: SCOPE,
    status: "ACTIVE",
    invitedBy: "user-firm-1",
    invitedFrom: "ATLAS",
    invitedAt: new Date("2026-01-01"),
    acceptedAt: new Date("2026-01-05"),
    acceptedBy: "user-client-1",
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    effectiveFrom: new Date("2026-01-05"),
    effectiveUntil: new Date("2030-01-05"),
    handshakeHash: "deadbeef".repeat(8), // 64 hex chars — looks like a real sha256
    ...overrides,
  };
}

// ─── requireActiveMatter ──────────────────────────────────────────────

describe("requireActiveMatter — gate decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matter+scope for a firm with sufficient permission", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    const result = await requireActiveMatter({
      matterId: "matter-1",
      callerOrgId: "firm-1",
      callerSide: "ATLAS",
      category: "COMPLIANCE_ASSESSMENTS",
      permission: "READ",
    });

    expect(result.matter.id).toBe("matter-1");
    expect(result.scope).toEqual(SCOPE);
  });

  it("returns matter for an OPERATOR introspecting their own matter (no scope check)", async () => {
    // Operators introspect matters they're a party to without needing
    // a scope grant. They're looking AT the scope from the outside.
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    const result = await requireActiveMatter({
      matterId: "matter-1",
      callerOrgId: "client-1",
      callerSide: "CAELEX",
      category: "AUDIT_LOGS", // category not in scope — would fail for firm
      permission: "EXPORT", // permission not granted to anyone
    });

    expect(result.matter.id).toBe("matter-1");
  });

  it("throws MATTER_NOT_FOUND when matter id is unknown", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(null);

    await expect(
      requireActiveMatter({
        matterId: "ghost",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({
      code: "MATTER_NOT_FOUND",
      name: "MatterAccessError",
    });
  });

  it("throws CALLER_NOT_PARTY when firm orgId doesn't match lawFirmOrgId", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "OTHER-firm",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "CALLER_NOT_PARTY" });
  });

  it("throws CALLER_NOT_PARTY when an ATLAS caller passes the operator's orgId", async () => {
    // Cross-side mismatch: caller claims ATLAS but uses the client org id.
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "client-1",
        callerSide: "ATLAS", // wrong side for client-1
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "CALLER_NOT_PARTY" });
  });

  it("throws MATTER_NOT_ACTIVE for SUSPENDED matters", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "SUSPENDED" }),
    );

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "MATTER_NOT_ACTIVE" });
  });

  it("throws MATTER_NOT_ACTIVE for REVOKED matters", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "REVOKED" }),
    );

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "MATTER_NOT_ACTIVE" });
  });

  it("throws MATTER_EXPIRED when effectiveUntil is in the past", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ effectiveUntil: new Date("2020-01-01") }),
    );

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "MATTER_EXPIRED" });
  });

  it("throws SCOPE_INSUFFICIENT for firm asking for permission not granted", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "EXPORT", // SCOPE only has READ + ANNOTATE
      }),
    ).rejects.toMatchObject({ code: "SCOPE_INSUFFICIENT" });
  });

  it("throws SCOPE_INSUFFICIENT for firm asking for category not in scope", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(buildMatter());

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "DOCUMENTS", // SCOPE only has COMPLIANCE_ASSESSMENTS
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "SCOPE_INSUFFICIENT" });
  });

  it("STANDALONE matter passes for lawFirm-side caller", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({
        id: "m_solo",
        status: "STANDALONE",
        lawFirmOrgId: "lf_1",
        clientOrgId: null,
        scope: [],
        handshakeHash: null,
        acceptedAt: null,
        acceptedBy: null,
      }),
    );

    const result = await requireActiveMatter({
      matterId: "m_solo",
      callerOrgId: "lf_1",
      callerSide: "ATLAS",
      category: "COMPLIANCE_ASSESSMENTS",
      permission: "READ",
    });
    expect(result.matter.id).toBe("m_solo");
    expect(result.matter.status).toBe("STANDALONE");
    expect(result.scope).toEqual([]);
  });

  it("STANDALONE matter rejects non-lawFirm caller with CALLER_NOT_PARTY", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({
        id: "m_solo",
        status: "STANDALONE",
        lawFirmOrgId: "lf_1",
        clientOrgId: null,
        scope: [],
        handshakeHash: null,
        acceptedAt: null,
        acceptedBy: null,
      }),
    );

    await expect(
      requireActiveMatter({
        matterId: "m_solo",
        callerOrgId: "co_1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "CALLER_NOT_PARTY" });
  });

  it("STANDALONE matter rejects CAELEX-side caller with CALLER_NOT_PARTY", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({
        id: "m_solo",
        status: "STANDALONE",
        lawFirmOrgId: "lf_1",
        clientOrgId: null,
        scope: [],
        handshakeHash: null,
        acceptedAt: null,
        acceptedBy: null,
      }),
    );

    await expect(
      requireActiveMatter({
        matterId: "m_solo",
        callerOrgId: "co_1",
        callerSide: "CAELEX",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "CALLER_NOT_PARTY" });
  });

  it("throws SCOPE_INSUFFICIENT when stored scope is malformed JSON", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ scope: "this is not a scope object" }),
    );

    await expect(
      requireActiveMatter({
        matterId: "matter-1",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    ).rejects.toMatchObject({ code: "SCOPE_INSUFFICIENT" });
  });

  it("error class is MatterAccessError (instanceof check)", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(null);

    let caught: unknown;
    try {
      await requireActiveMatter({
        matterId: "ghost",
        callerOrgId: "firm-1",
        callerSide: "ATLAS",
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MatterAccessError);
  });
});

// ─── emitAccessLog — hash chain ───────────────────────────────────────

describe("emitAccessLog — hash chain integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first entry uses matter.handshakeHash as previousHash", async () => {
    const matter = buildMatter();
    // No prior log entries
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValue(null);
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValue({
      id: "log-1",
    });

    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "ComplianceOverview",
      matterScope: "COMPLIANCE_ASSESSMENTS",
    });

    expect(mockedPrisma.legalMatterAccessLog.create).toHaveBeenCalledTimes(1);
    const call = mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0];
    expect(call.data.previousHash).toBe(matter.handshakeHash);
    // entryHash is sha256 hex — 64 chars, deterministic
    expect(call.data.entryHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("second entry chains off the first entry's entryHash", async () => {
    const matter = buildMatter();

    // First call: no prior entries
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValueOnce(null);
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValueOnce({
      id: "log-1",
    });

    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "ComplianceOverview",
      matterScope: "COMPLIANCE_ASSESSMENTS",
    });

    const firstEntryHash =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0].data.entryHash;

    // Second call: findFirst now returns the first entry
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValueOnce({
      entryHash: firstEntryHash,
    });
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValueOnce({
      id: "log-2",
    });

    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "MEMO_DRAFTED",
      resourceType: "MatterNote",
      matterScope: "AUDIT_LOGS",
    });

    const secondCall =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[1][0].data;

    expect(secondCall.previousHash).toBe(firstEntryHash);
    expect(secondCall.entryHash).not.toBe(firstEntryHash);
    expect(secondCall.entryHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("identical inputs produce DIFFERENT hashes (createdAt is part of the hash)", async () => {
    const matter = buildMatter();
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValue(null);
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValue({ id: "log" });

    const args = {
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS" as const,
      action: "READ_ASSESSMENT" as const,
      resourceType: "ComplianceOverview",
      matterScope: "COMPLIANCE_ASSESSMENTS" as const,
    };

    await emitAccessLog(args);
    // 1ms gap so createdAt differs
    await new Promise((r) => setTimeout(r, 2));
    await emitAccessLog(args);

    const hash1 =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0].data.entryHash;
    const hash2 =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[1][0].data.entryHash;

    expect(hash1).not.toBe(hash2);
  });

  it("persists all required audit fields", async () => {
    const matter = buildMatter();
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValue(null);
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValue({ id: "log" });

    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "ComplianceOverview",
      resourceId: "overview-42",
      matterScope: "COMPLIANCE_ASSESSMENTS",
      context: { tool: "load_compliance_overview" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    const data = mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0].data;

    expect(data).toMatchObject({
      matterId: matter.id,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "ComplianceOverview",
      resourceId: "overview-42",
      matterScope: "COMPLIANCE_ASSESSMENTS",
      context: { tool: "load_compliance_overview" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });
    expect(data.previousHash).toBeDefined();
    expect(data.entryHash).toBeDefined();
  });

  it("handles a null actorUserId (system-emitted entries)", async () => {
    const matter = buildMatter();
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValue(null);
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValue({ id: "log" });

    await emitAccessLog({
      matter,
      actorUserId: null,
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "Cron",
      matterScope: "AUDIT_LOGS",
    });

    expect(mockedPrisma.legalMatterAccessLog.create).toHaveBeenCalledTimes(1);
    const data = mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0].data;
    expect(data.actorUserId).toBeNull();
    expect(data.entryHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hash flips when previousHash flips (chain integrity)", async () => {
    const matter = buildMatter();
    mockedPrisma.legalMatterAccessLog.create.mockResolvedValue({ id: "log" });

    // Same payload, two different chain heads → different entryHashes
    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValueOnce({
      entryHash: "a".repeat(64),
    });
    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "X",
      matterScope: "COMPLIANCE_ASSESSMENTS",
    });

    mockedPrisma.legalMatterAccessLog.findFirst.mockResolvedValueOnce({
      entryHash: "b".repeat(64),
    });
    await emitAccessLog({
      matter,
      actorUserId: "user-firm-1",
      actorOrgId: "firm-1",
      actorSide: "ATLAS",
      action: "READ_ASSESSMENT",
      resourceType: "X",
      matterScope: "COMPLIANCE_ASSESSMENTS",
    });

    const hash1 =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[0][0].data.entryHash;
    const hash2 =
      mockedPrisma.legalMatterAccessLog.create.mock.calls[1][0].data.entryHash;

    expect(hash1).not.toBe(hash2);
  });
});
