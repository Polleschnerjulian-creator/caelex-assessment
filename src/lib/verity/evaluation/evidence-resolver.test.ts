import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("../utils/redaction", () => ({ safeLog: vi.fn() }));

import { resolveEvidence } from "./evidence-resolver";

function createMockPrisma() {
  return {
    organizationMember: {
      findFirst: vi.fn(),
    },
    sentinelAgent: {
      findFirst: vi.fn(),
    },
    sentinelPacket: {
      findFirst: vi.fn(),
    },
  } as unknown as PrismaClient & {
    organizationMember: { findFirst: ReturnType<typeof vi.fn> };
    sentinelAgent: { findFirst: ReturnType<typeof vi.fn> };
    sentinelPacket: { findFirst: ReturnType<typeof vi.fn> };
  };
}

describe("evidence-resolver", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("returns null when no org membership found", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result).toBeNull();
  });

  it("returns null when no active sentinel agent", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue(null);

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result).toBeNull();
  });

  it("returns null when no packet found", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue(null);

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result).toBeNull();
  });

  it("returns evidence with trust 0.98 when cross-verified", async () => {
    const collectedAt = new Date("2026-02-01T12:00:00Z");
    const verifiedAt = new Date("2026-02-01T12:05:00Z");

    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue({
      values: { remaining_fuel_pct: 95.5 },
      collectedAt,
      chainPosition: 42,
      contentHash: "hash_abc",
      crossChecks: [
        {
          publicSource: "ESA",
          result: "MATCH",
          verifiedAt,
          dataPoint: "remaining_fuel_pct",
        },
      ],
    });

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );

    expect(result).not.toBeNull();
    expect(result!.actual_value).toBe(95.5);
    expect(result!.trust_score).toBe(0.98); // cross-verified trust score
    expect(result!.source).toBe("sentinel");
    expect(result!.data_point).toBe("remaining_fuel_pct");
    expect(result!.sentinel_anchor).toEqual({
      sentinel_id: "sentinel_1",
      chain_position: 42,
      chain_hash: "hash_abc",
      collected_at: collectedAt.toISOString(),
    });
    expect(result!.cross_verification).toEqual({
      public_source: "ESA",
      verification_result: "MATCH",
      verified_at: verifiedAt.toISOString(),
    });
  });

  it("returns evidence with trust 0.92 when no cross-verification (T1-H5 regression)", async () => {
    // T1-H5 (audit fix 2026-05-05): Sentinel without cross-verification
    // is HIGH-trust (0.92), NOT MEDIUM (was wrongly 0.8). Doc-comment
    // at the top of evidence-resolver.ts has always said 0.92; the
    // implementation was the bug. This test guards against regression.
    const collectedAt = new Date("2026-02-01T12:00:00Z");

    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue({
      values: { remaining_fuel_pct: 80 },
      collectedAt,
      chainPosition: 10,
      contentHash: "hash_xyz",
      crossChecks: [],
    });

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );

    expect(result).not.toBeNull();
    expect(result!.actual_value).toBe(80);
    expect(result!.trust_score).toBe(0.92);
    expect(result!.cross_verification).toBeNull();
  });

  it("returns trust 0.92 when crossCheck result is MISMATCH (only MATCH counts)", async () => {
    // Edge case: a CrossCheck row exists, but its result is MISMATCH
    // (or CLOSE). The code only treats result === 'MATCH' as
    // verification — anything else falls back to single-source trust.
    const collectedAt = new Date("2026-02-01T12:00:00Z");
    const verifiedAt = new Date("2026-02-01T12:05:00Z");

    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue({
      values: { remaining_fuel_pct: 80 },
      collectedAt,
      chainPosition: 10,
      contentHash: "hash_xyz",
      crossChecks: [
        {
          publicSource: "ESA",
          result: "MISMATCH",
          verifiedAt,
          dataPoint: "remaining_fuel_pct",
        },
      ],
    });

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result!.trust_score).toBe(0.92);
    // cross_verification is still emitted with the MISMATCH detail
    // (the verifier needs to know the discrepancy was checked).
    expect(result!.cross_verification?.verification_result).toBe("MISMATCH");
  });

  // ❌ KNOWN BUG (T5-1, audit fix plan Tier 5): the metaValue check at
  // evidence-resolver.ts:173 uses `if (!metaValue || ...)` which treats
  // `value: 0` as falsy and skips the row. Legitimate measurements like
  // `critical_vulns_count: 0` (BELOW-threshold rule
  // `nis2_art21_zero_critical_vulns`) get dropped. The fix is
  // `metaValue === null || Number.isNaN(metaValue)` instead.
  //
  // This regression test is parked until T5-1 lands.
  it.todo(
    "[T5-1 KNOWN BUG] accepts ComplianceEvidence value === 0 (regression for `!metaValue` truthy bug)",
  );

  it("returns null when packet value is not a number", async () => {
    const collectedAt = new Date("2026-02-01T12:00:00Z");

    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue({
      values: { remaining_fuel_pct: "not_a_number" },
      collectedAt,
      chainPosition: 10,
      contentHash: "hash_xyz",
      crossChecks: [],
    });

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result).toBeNull();
  });

  it("handles errors gracefully (returns null)", async () => {
    mockPrisma.organizationMember.findFirst.mockRejectedValue(
      new Error("DB connection failed"),
    );

    const result = await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "12345",
      "remaining_fuel_pct",
    );
    expect(result).toBeNull();
  });

  it("includes satellite_norad filter when provided", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org_1",
    });
    mockPrisma.sentinelAgent.findFirst.mockResolvedValue({
      id: "agent_1",
      sentinelId: "sentinel_1",
    });
    mockPrisma.sentinelPacket.findFirst.mockResolvedValue(null);

    await resolveEvidence(
      mockPrisma as unknown as PrismaClient,
      "op_1",
      "SAT-99999",
      "remaining_fuel_pct",
    );

    expect(mockPrisma.sentinelPacket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          satelliteNorad: "SAT-99999",
        }),
      }),
    );
  });
});
