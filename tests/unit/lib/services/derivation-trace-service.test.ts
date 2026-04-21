/**
 * Unit tests for DerivationTraceService — the provenance ledger that
 * powers the Context-Omnipresence redesign.
 *
 * Covers:
 *   - Value serialisation roundtrip + canonical key ordering
 *   - Origin-specific validation invariants (the trust guarantees)
 *   - Auto-expiry defaults per origin
 *   - Latest-per-field deduplication on entity read
 *   - Upstream-chain walk with cycle protection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    derivationTrace: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  serializeTraceValue,
  readTraceValue,
  assertValidTrace,
  writeTrace,
  getLatestTrace,
  getCurrentTracesForEntity,
  getStaleTraces,
  getUpstreamChain,
  DEFAULT_ASSESSMENT_TTL_DAYS,
  DEFAULT_AI_TTL_DAYS,
  type WriteTraceInput,
  type DerivationTrace,
} from "@/lib/services/derivation-trace-service";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Serialization ──────────────────────────────────────────────────────

describe("serializeTraceValue / readTraceValue", () => {
  it("roundtrips strings with surrounding quotes", () => {
    const s = serializeTraceValue("hello world");
    expect(s).toBe('"hello world"');
    expect(readTraceValue(s)).toBe("hello world");
  });

  it("roundtrips numbers as bare strings", () => {
    const s = serializeTraceValue(42);
    expect(s).toBe("42");
    expect(readTraceValue(s)).toBe(42);
  });

  it("roundtrips booleans", () => {
    expect(serializeTraceValue(true)).toBe("true");
    expect(readTraceValue("true")).toBe(true);
    expect(readTraceValue("false")).toBe(false);
  });

  it("preserves null vs undefined as null", () => {
    expect(serializeTraceValue(null)).toBe("null");
    expect(serializeTraceValue(undefined)).toBe("null");
    expect(readTraceValue("null")).toBeNull();
  });

  it("roundtrips arrays preserving order", () => {
    const input = ["DE", "FR", "LU"];
    const s = serializeTraceValue(input);
    expect(readTraceValue(s)).toEqual(input);
  });

  it("serialises objects with sorted keys (deterministic)", () => {
    const a = serializeTraceValue({ zebra: 1, apple: 2, mango: 3 });
    const b = serializeTraceValue({ mango: 3, apple: 2, zebra: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"apple":2,"mango":3,"zebra":1}');
  });

  it("roundtrips nested objects", () => {
    const input = { orbit: "LEO", altitude: 550, sats: [1, 2, 3] };
    const s = serializeTraceValue(input);
    expect(readTraceValue(s)).toEqual(input);
  });
});

// ─── Validation ─────────────────────────────────────────────────────────

describe("assertValidTrace", () => {
  const base: WriteTraceInput = {
    organizationId: "org_1",
    entityType: "operator_profile",
    entityId: "op_1",
    fieldName: "operatorType",
    value: "satellite_operator",
    origin: "deterministic",
  };

  it("accepts a minimal deterministic trace", () => {
    expect(() => assertValidTrace(base)).not.toThrow();
  });

  it("rejects missing organizationId", () => {
    expect(() => assertValidTrace({ ...base, organizationId: "" })).toThrow(
      /organizationId/,
    );
  });

  it("rejects missing entityType / entityId / fieldName", () => {
    expect(() => assertValidTrace({ ...base, entityType: "" })).toThrow();
    expect(() => assertValidTrace({ ...base, entityId: "" })).toThrow();
    expect(() => assertValidTrace({ ...base, fieldName: "" })).toThrow();
  });

  it("requires confidence for ai-inferred", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "ai-inferred",
        modelVersion: "claude-sonnet-4-6",
      }),
    ).toThrow(/confidence/);
  });

  it("requires modelVersion for ai-inferred", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "ai-inferred",
        confidence: 0.8,
      }),
    ).toThrow(/modelVersion/);
  });

  it("rejects confidence outside [0,1]", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "ai-inferred",
        confidence: 1.5,
        modelVersion: "claude-sonnet-4-6",
      }),
    ).toThrow(/confidence/);
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "ai-inferred",
        confidence: -0.1,
        modelVersion: "claude-sonnet-4-6",
      }),
    ).toThrow(/confidence/);
  });

  it("accepts valid ai-inferred", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "ai-inferred",
        confidence: 0.82,
        modelVersion: "claude-sonnet-4-6",
      }),
    ).not.toThrow();
  });

  it("requires sourceRef for source-backed", () => {
    expect(() =>
      assertValidTrace({ ...base, origin: "source-backed" }),
    ).toThrow(/sourceRef/);
  });

  it("rejects source-backed with wrong sourceRef kind", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "source-backed",
        sourceRef: {
          kind: "assessment",
          assessmentId: "a",
          questionId: "q",
        },
      }),
    ).toThrow(/kind/);
  });

  it("accepts source-backed with legal-source kind", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "source-backed",
        sourceRef: {
          kind: "legal-source",
          legalSourceId: "EU-SPACE-ACT",
          articleRef: "Art. 21(2)(d)",
        },
      }),
    ).not.toThrow();
  });

  it("requires assessment sourceRef for assessment origin", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        origin: "assessment",
        sourceRef: {
          kind: "user-edit",
          userId: "u_1",
          editedAt: new Date().toISOString(),
        },
      }),
    ).toThrow(/assessment/);
  });

  it("requires user-edit sourceRef for user-asserted origin", () => {
    expect(() =>
      assertValidTrace({ ...base, origin: "user-asserted" }),
    ).toThrow(/user-edit/);
  });

  it("rejects expiresAt in the past", () => {
    expect(() =>
      assertValidTrace({
        ...base,
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toThrow(/expiresAt/);
  });
});

// ─── writeTrace — expiry auto-defaults ─────────────────────────────────

describe("writeTrace auto-expiry", () => {
  const reference: WriteTraceInput = {
    organizationId: "org_1",
    entityType: "operator_profile",
    entityId: "op_1",
    fieldName: "operatorType",
    value: "satellite_operator",
    origin: "deterministic",
  };

  beforeEach(() => {
    mockPrisma.derivationTrace.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        ({ id: "trace_1", ...data }) as unknown as DerivationTrace,
    );
  });

  it("sets no expiry for deterministic origin", async () => {
    await writeTrace(reference);
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    expect(call.data.expiresAt).toBeNull();
  });

  it("sets no expiry for source-backed origin", async () => {
    await writeTrace({
      ...reference,
      origin: "source-backed",
      sourceRef: {
        kind: "legal-source",
        legalSourceId: "EU-SPACE-ACT",
      },
    });
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    expect(call.data.expiresAt).toBeNull();
  });

  it(`sets +${DEFAULT_ASSESSMENT_TTL_DAYS}d expiry for assessment origin`, async () => {
    const before = Date.now();
    await writeTrace({
      ...reference,
      origin: "assessment",
      sourceRef: {
        kind: "assessment",
        assessmentId: "a_1",
        questionId: "q_3",
      },
    });
    const after = Date.now();
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    const expiryMs = (call.data.expiresAt as Date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    expect(expiryMs).toBeGreaterThanOrEqual(
      before + DEFAULT_ASSESSMENT_TTL_DAYS * dayMs,
    );
    expect(expiryMs).toBeLessThanOrEqual(
      after + DEFAULT_ASSESSMENT_TTL_DAYS * dayMs + 1000,
    );
  });

  it(`sets +${DEFAULT_AI_TTL_DAYS}d expiry for ai-inferred origin`, async () => {
    const before = Date.now();
    await writeTrace({
      ...reference,
      origin: "ai-inferred",
      confidence: 0.82,
      modelVersion: "claude-sonnet-4-6",
    });
    const after = Date.now();
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    const expiryMs = (call.data.expiresAt as Date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    expect(expiryMs).toBeGreaterThanOrEqual(
      before + DEFAULT_AI_TTL_DAYS * dayMs,
    );
    expect(expiryMs).toBeLessThanOrEqual(
      after + DEFAULT_AI_TTL_DAYS * dayMs + 1000,
    );
  });

  it("respects explicit expiresAt", async () => {
    const explicit = new Date(Date.now() + 10_000);
    await writeTrace({ ...reference, expiresAt: explicit });
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    expect(call.data.expiresAt).toEqual(explicit);
  });

  it("allows explicit null expiry for assessment (override default)", async () => {
    await writeTrace({
      ...reference,
      origin: "assessment",
      sourceRef: {
        kind: "assessment",
        assessmentId: "a_1",
        questionId: "q_3",
      },
      expiresAt: null,
    });
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    expect(call.data.expiresAt).toBeNull();
  });

  it("serialises the value via serializeTraceValue", async () => {
    await writeTrace({
      ...reference,
      value: { orbit: "LEO", altitude: 550 },
    });
    const call = mockPrisma.derivationTrace.create.mock.calls[0][0];
    expect(call.data.value).toBe('{"altitude":550,"orbit":"LEO"}');
  });
});

// ─── Read APIs ─────────────────────────────────────────────────────────

describe("getLatestTrace", () => {
  it("returns null when no trace exists", async () => {
    mockPrisma.derivationTrace.findFirst.mockResolvedValue(null);
    const result = await getLatestTrace("operator_profile", "op_1", "foo");
    expect(result).toBeNull();
  });

  it("queries with correct where + orderBy", async () => {
    mockPrisma.derivationTrace.findFirst.mockResolvedValue({
      id: "t_1",
    });
    await getLatestTrace("operator_profile", "op_1", "operatorType");
    const call = mockPrisma.derivationTrace.findFirst.mock.calls[0][0];
    expect(call.where).toEqual({
      entityType: "operator_profile",
      entityId: "op_1",
      fieldName: "operatorType",
    });
    expect(call.orderBy).toEqual({ derivedAt: "desc" });
  });
});

describe("getCurrentTracesForEntity", () => {
  it("returns one trace per fieldName (latest wins)", async () => {
    // Simulate 5 rows already sorted by derivedAt DESC.
    const now = Date.now();
    const rows = [
      {
        id: "t_5",
        fieldName: "operatorType",
        derivedAt: new Date(now),
      },
      {
        id: "t_4",
        fieldName: "entitySize",
        derivedAt: new Date(now - 1000),
      },
      {
        id: "t_3",
        fieldName: "operatorType",
        derivedAt: new Date(now - 2000),
      }, // older duplicate
      {
        id: "t_2",
        fieldName: "establishment",
        derivedAt: new Date(now - 3000),
      },
      {
        id: "t_1",
        fieldName: "entitySize",
        derivedAt: new Date(now - 4000),
      }, // older duplicate
    ];
    mockPrisma.derivationTrace.findMany.mockResolvedValue(rows);

    const result = await getCurrentTracesForEntity("operator_profile", "op_1");

    expect(result.map((r) => r.id)).toEqual(["t_5", "t_4", "t_2"]);
    expect(result.map((r) => r.fieldName).sort()).toEqual([
      "entitySize",
      "establishment",
      "operatorType",
    ]);
  });

  it("returns empty array if no traces", async () => {
    mockPrisma.derivationTrace.findMany.mockResolvedValue([]);
    const result = await getCurrentTracesForEntity("operator_profile", "op_1");
    expect(result).toEqual([]);
  });
});

describe("getStaleTraces", () => {
  it("queries with expiresAt < now AND non-null", async () => {
    const now = new Date("2026-04-21T12:00:00Z");
    mockPrisma.derivationTrace.findMany.mockResolvedValue([]);
    await getStaleTraces("org_1", now);

    const call = mockPrisma.derivationTrace.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      organizationId: "org_1",
      expiresAt: { lt: now, not: null },
    });
    expect(call.orderBy).toEqual({ expiresAt: "asc" });
  });
});

// ─── Upstream-chain walk ───────────────────────────────────────────────

describe("getUpstreamChain", () => {
  it("walks upstream and deduplicates cycles", async () => {
    // Topology:
    //   t_3 → upstream [t_2]
    //   t_2 → upstream [t_1]
    //   t_1 → upstream [t_3]   (cycle!)
    const byId: Record<string, Partial<DerivationTrace>> = {
      t_1: { id: "t_1", upstreamTraceIds: ["t_3"] },
      t_2: { id: "t_2", upstreamTraceIds: ["t_1"] },
      t_3: { id: "t_3", upstreamTraceIds: ["t_2"] },
    };

    mockPrisma.derivationTrace.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => byId[id]).filter(Boolean),
    );

    const chain = await getUpstreamChain("t_3", 10);
    // Should include t_3, t_2, t_1 exactly once each — no infinite loop.
    const ids = chain.map((t) => t.id).sort();
    expect(ids).toEqual(["t_1", "t_2", "t_3"]);
  });

  it("respects maxDepth", async () => {
    // Linear chain t_3 → t_2 → t_1 → (nothing)
    const byId: Record<string, Partial<DerivationTrace>> = {
      t_1: { id: "t_1", upstreamTraceIds: [] },
      t_2: { id: "t_2", upstreamTraceIds: ["t_1"] },
      t_3: { id: "t_3", upstreamTraceIds: ["t_2"] },
    };

    mockPrisma.derivationTrace.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => byId[id]).filter(Boolean),
    );

    const chain = await getUpstreamChain("t_3", 1); // only self
    expect(chain.map((t) => t.id)).toEqual(["t_3"]);
  });

  it("returns empty chain for missing starting trace", async () => {
    mockPrisma.derivationTrace.findMany.mockResolvedValue([]);
    const chain = await getUpstreamChain("nonexistent", 5);
    expect(chain).toEqual([]);
  });
});
