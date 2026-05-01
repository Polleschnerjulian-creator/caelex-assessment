/**
 * evidence.server.ts — hash-chain integrity + tier-validation tests.
 *
 * Vitest with hoisted Prisma mocks. We don't run real DB queries; we
 * simulate a per-org chain using an in-memory array and assert that:
 *
 *   1. The first row links to GENESIS_<orgId>
 *   2. Every subsequent row's prevHash matches the previous row's entryHash
 *   3. canonicalize() produces stable byte strings (key-order independent)
 *   4. Tier-validation rejects mismatched attestationRef shapes
 *   5. The fallback-row path produces a non-null entryHash even when the
 *      Serializable transaction throws
 *   6. verifyEvidenceChain() detects tampered prevHash
 *
 * These tests guard the cryptographic backbone of Sprint 1A. If they break,
 * the audit-trail can no longer be relied on.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDerivationTrace, mockSecurityEvent, mockTransaction } = vi.hoisted(
  () => ({
    mockDerivationTrace: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mockSecurityEvent: {
      create: vi.fn(),
    },
    mockTransaction: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    derivationTrace: mockDerivationTrace,
    securityEvent: mockSecurityEvent,
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  appendEvidence,
  computeEntryHash,
  computeSourceHash,
  genesisHashForOrg,
  getLatestEvidenceHash,
  verifyEvidenceChain,
  __test,
} from "./evidence.server";

const ORG_ID = "org_test_001";
const PROFILE_ID = "profile_test_001";

interface SimulatedRow {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string;
  origin: string;
  sourceRef: unknown;
  confidence: number | null;
  modelVersion: string | null;
  expiresAt: Date | null;
  upstreamTraceIds: string[];
  verificationTier: string | null;
  sourceHash: string | null;
  prevHash: string | null;
  entryHash: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  attestationRef: unknown;
  revokedAt: Date | null;
  revokedReason: string | null;
  derivedAt: Date;
}

let chain: SimulatedRow[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `evidence_${idCounter.toString().padStart(6, "0")}`;
}

function setupHappyPathTransaction(): void {
  // Inside the txn callback, expose the same shape mockDerivationTrace has
  mockTransaction.mockImplementation(
    async (
      cb: (tx: {
        derivationTrace: typeof mockDerivationTrace;
      }) => Promise<unknown>,
    ) => {
      return cb({ derivationTrace: mockDerivationTrace });
    },
  );

  mockDerivationTrace.findFirst.mockImplementation(async () => {
    if (chain.length === 0) return null;
    // Return latest by derivedAt DESC
    const sorted = [...chain].sort(
      (a, b) => b.derivedAt.getTime() - a.derivedAt.getTime(),
    );
    return sorted[0];
  });

  mockDerivationTrace.create.mockImplementation(
    async ({ data }: { data: Partial<SimulatedRow> }) => {
      const row: SimulatedRow = {
        id: nextId(),
        organizationId: data.organizationId ?? ORG_ID,
        entityType: data.entityType ?? "operator_profile",
        entityId: data.entityId ?? PROFILE_ID,
        fieldName: data.fieldName ?? "operatorType",
        value: data.value ?? "null",
        origin: data.origin ?? "user-asserted",
        sourceRef: data.sourceRef ?? null,
        confidence: data.confidence ?? null,
        modelVersion: data.modelVersion ?? null,
        expiresAt: data.expiresAt ?? null,
        upstreamTraceIds: data.upstreamTraceIds ?? [],
        verificationTier: (data.verificationTier as string) ?? null,
        sourceHash: data.sourceHash ?? null,
        prevHash: data.prevHash ?? null,
        entryHash: data.entryHash ?? null,
        verifiedAt: data.verifiedAt ?? null,
        verifiedBy: data.verifiedBy ?? null,
        attestationRef: data.attestationRef ?? null,
        revokedAt: data.revokedAt ?? null,
        revokedReason: data.revokedReason ?? null,
        derivedAt: new Date(Date.now() + chain.length), // monotonic
      };
      chain.push(row);
      return row;
    },
  );

  mockDerivationTrace.findMany.mockImplementation(
    async ({ skip = 0, take = 100 }: { skip?: number; take?: number }) => {
      const sorted = [...chain].sort(
        (a, b) => a.derivedAt.getTime() - b.derivedAt.getTime(),
      );
      return sorted.slice(skip, skip + take);
    },
  );

  mockSecurityEvent.create.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  chain = [];
  idCounter = 0;
  setupHappyPathTransaction();
});

// ─── Canonical Serialisation ──────────────────────────────────────────────

describe("canonicalize", () => {
  const { canonicalize, sha256Hex } = __test;

  it("produces identical output regardless of key order", () => {
    const a = { foo: 1, bar: 2, baz: 3 };
    const b = { baz: 3, bar: 2, foo: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("preserves nested key ordering", () => {
    const a = { outer: { z: 1, a: 2 } };
    const b = { outer: { a: 2, z: 1 } };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("hashes equal payloads to equal SHA-256 hex strings", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
    expect(sha256Hex("hello")).not.toBe(sha256Hex("world"));
  });

  it("handles arrays, dates, buffers", () => {
    const date = new Date("2026-04-30T12:00:00Z");
    const buf = Buffer.from("regulator-letter", "utf8");
    expect(canonicalize([1, 2, 3])).toBe("[1,2,3]");
    expect(canonicalize(date)).toContain("2026-04-30");
    expect(canonicalize(buf)).toContain(buf.toString("hex"));
  });
});

// ─── computeSourceHash ──────────────────────────────────────────────────

describe("computeSourceHash", () => {
  it("returns the SHA-256 of a string artifact", () => {
    const h = computeSourceHash("regulator-letter-v1");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a stable hash for object artifacts regardless of key order", () => {
    const a = computeSourceHash({ a: 1, b: 2 });
    const b = computeSourceHash({ b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it("returns a deterministic hash for null artifacts", () => {
    const a = computeSourceHash(null);
    const b = computeSourceHash(null);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes Buffer artifacts as raw bytes", () => {
    const buf = Buffer.from("source-content", "utf8");
    const h = computeSourceHash(buf);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── computeEntryHash ───────────────────────────────────────────────────

describe("computeEntryHash", () => {
  it("includes prevHash in the digest — different prev produces different entry", () => {
    const base = {
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: '"satellite_operator"',
      verificationTier: "T1_SELF_CONFIRMED" as const,
      sourceHash: "a".repeat(64),
      verifiedAt: new Date("2026-04-30T10:00:00Z"),
      verifiedBy: "user_test",
      attestationRef: null,
    };
    const h1 = computeEntryHash({
      ...base,
      prevHash: genesisHashForOrg(ORG_ID),
    });
    const h2 = computeEntryHash({ ...base, prevHash: "a".repeat(64) });
    expect(h1).not.toBe(h2);
  });

  it("is deterministic for the same input", () => {
    const input = {
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: '"DE"',
      verificationTier: "T2_SOURCE_VERIFIED" as const,
      sourceHash: "b".repeat(64),
      verifiedAt: new Date("2026-04-30T10:00:00Z"),
      verifiedBy: null,
      attestationRef: null,
      prevHash: genesisHashForOrg(ORG_ID),
    };
    expect(computeEntryHash(input)).toBe(computeEntryHash(input));
  });
});

// ─── appendEvidence — happy path ────────────────────────────────────────

describe("appendEvidence — happy path", () => {
  it("first row in an empty chain links to GENESIS_<orgId>", async () => {
    const result = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "user_anna",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });

    expect(result.prevHash).toBe(genesisHashForOrg(ORG_ID));
    expect(result.entryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(chain.length).toBe(1);
  });

  it("second row links to the first row's entryHash", async () => {
    const a = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "user_anna",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });

    const b = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://www.handelsregister.de/...",
        fetchedAt: "2026-04-30T10:01:00Z",
      },
    });

    expect(b.prevHash).toBe(a.entryHash);
  });

  it("two rows with different sources have different sourceHashes", async () => {
    const a = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "source-A",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://A",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    const b = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "source-B",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://B",
        fetchedAt: "2026-04-30T10:01:00Z",
      },
    });
    expect(a.sourceHash).not.toBe(b.sourceHash);
  });

  it("getLatestEvidenceHash returns genesis on empty chain", async () => {
    const h = await getLatestEvidenceHash(ORG_ID);
    expect(h).toBe(genesisHashForOrg(ORG_ID));
  });
});

// ─── appendEvidence — tier validation ───────────────────────────────────

describe("appendEvidence — tier validation", () => {
  it("rejects T2_SOURCE_VERIFIED without a public-source attestation", async () => {
    await expect(
      appendEvidence({
        organizationId: ORG_ID,
        entityType: "operator_profile",
        entityId: PROFILE_ID,
        fieldName: "establishment",
        value: "DE",
        tier: "T2_SOURCE_VERIFIED",
        sourceArtifact: "x",
        attestationRef: {
          kind: "self",
          userId: "u1",
          confirmedAt: "2026-04-30T10:00:00Z",
        },
      }),
    ).rejects.toThrow(/T2_SOURCE_VERIFIED requires/);
  });

  it("rejects T3_COUNSEL_ATTESTED without a counsel attestation", async () => {
    await expect(
      appendEvidence({
        organizationId: ORG_ID,
        entityType: "operator_profile",
        entityId: PROFILE_ID,
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T3_COUNSEL_ATTESTED",
        sourceArtifact: null,
        attestationRef: null,
      }),
    ).rejects.toThrow(/T3_COUNSEL_ATTESTED requires/);
  });

  it("rejects T4_AUTHORITY_VERIFIED without an authority attestation", async () => {
    await expect(
      appendEvidence({
        organizationId: ORG_ID,
        entityType: "operator_profile",
        entityId: PROFILE_ID,
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T4_AUTHORITY_VERIFIED",
        sourceArtifact: null,
        attestationRef: {
          kind: "self",
          userId: "u1",
          confirmedAt: "2026-04-30T10:00:00Z",
        },
      }),
    ).rejects.toThrow(/T4_AUTHORITY_VERIFIED requires/);
  });

  it("rejects T5_CRYPTOGRAPHIC_PROOF without a verity attestation", async () => {
    await expect(
      appendEvidence({
        organizationId: ORG_ID,
        entityType: "operator_profile",
        entityId: PROFILE_ID,
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T5_CRYPTOGRAPHIC_PROOF",
        sourceArtifact: null,
        attestationRef: null,
      }),
    ).rejects.toThrow(/T5_CRYPTOGRAPHIC_PROOF requires/);
  });

  it("rejects ai-inferred origin without confidence", async () => {
    await expect(
      appendEvidence({
        organizationId: ORG_ID,
        entityType: "operator_profile",
        entityId: PROFILE_ID,
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T1_SELF_CONFIRMED",
        sourceArtifact: null,
        attestationRef: null,
        origin: "ai-inferred",
      }),
    ).rejects.toThrow(/confidence/);
  });
});

// ─── appendEvidence — fallback path ─────────────────────────────────────

describe("appendEvidence — fallback path", () => {
  it("writes a fallback row when the serializable transaction throws", async () => {
    // Force the transaction to throw
    mockTransaction.mockImplementationOnce(async () => {
      throw new Error("simulated serialisation failure");
    });

    const result = await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "user_anna",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });

    expect(result.entryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.prevHash).toBe(genesisHashForOrg(ORG_ID));
    expect(mockSecurityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "EVIDENCE_HASH_CHAIN_DEGRADED",
          severity: "CRITICAL",
        }),
      }),
    );
  });
});

// ─── verifyEvidenceChain ────────────────────────────────────────────────

describe("verifyEvidenceChain", () => {
  it("returns valid:true for an empty chain", async () => {
    const result = await verifyEvidenceChain(ORG_ID);
    expect(result.valid).toBe(true);
    expect(result.checkedEntries).toBe(0);
  });

  it("returns valid:true after a sequence of correct appends", async () => {
    await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "u1",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });
    await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "x",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:01:00Z",
      },
    });

    const result = await verifyEvidenceChain(ORG_ID);
    expect(result.valid).toBe(true);
    expect(result.checkedEntries).toBe(2);
  });

  it("detects a tampered prevHash", async () => {
    await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "u1",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });
    await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "x",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:01:00Z",
      },
    });

    // Tamper: rewrite the second row's prevHash
    chain[1].prevHash = "tampered_" + "0".repeat(56);

    const result = await verifyEvidenceChain(ORG_ID);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.fieldDiffers).toBe("prevHash");
  });

  it("detects a tampered value (entryHash mismatch)", async () => {
    await appendEvidence({
      organizationId: ORG_ID,
      entityType: "operator_profile",
      entityId: PROFILE_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "u1",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });

    // Tamper: rewrite the first row's value
    chain[0].value = '"different_operator_type"';

    const result = await verifyEvidenceChain(ORG_ID);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.fieldDiffers).toBe("entryHash");
  });
});
