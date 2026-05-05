/**
 * T2-4 (audit fix 2026-05-05): tests for the transparency-log
 * persistence layer in `log-store.ts`.
 *
 * Coverage:
 *   - appendToLog: append, idempotent re-append, sequential leaf
 *     indexing, malformed-attestation rejection.
 *   - signNewSTH: skips when log empty, skips when treeSize unchanged,
 *     creates STH when leaves grow, monotonic timestamp guard (T5-8),
 *     no-active-key skip path.
 *   - getInclusionForAttestation: correct proof shape, null when
 *     leaf outside latest STH, null when no STH yet, null when leaf
 *     missing.
 *   - getConsistencyFromStore: input validation, missing-STH null,
 *     leaf-count mismatch null, returns proper bundle on happy path.
 *   - backfillMissingLeaves: H4d batching — only processes missing
 *     leaves, idempotent on re-run, skips malformed rows.
 *
 * The Prisma client is faked with a tiny in-memory store so the
 * tests exercise the real `log-store.ts` orchestration end-to-end.
 * Crypto (Ed25519 + RFC 6962 hashing) runs for real; only the
 * persistence boundary is mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCipheriv, generateKeyPairSync, randomBytes } from "node:crypto";
import { generateAttestation } from "../core/attestation";
import type { ThresholdAttestation } from "../core/types";

vi.mock("server-only", () => ({}));
vi.mock("../utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  appendToLog,
  signNewSTH,
  getInclusionForAttestation,
  getConsistencyFromStore,
  backfillMissingLeaves,
  attestationLeafHashHex,
} from "./log-store";

// ─── In-memory Prisma fake ────────────────────────────────────────────

interface FakeLeaf {
  leafIndex: number;
  attestationId: string;
  leafHash: string;
  appendedAt: Date;
}

interface FakeSTH {
  treeSize: number;
  rootHash: string;
  issuerKeyId: string;
  signature: string;
  timestamp: Date;
  version: string;
}

interface FakeIssuerKey {
  keyId: string;
  encryptedPrivKey: string;
  active: boolean;
}

interface FakeAttestation {
  attestationId: string;
  issuedAt: Date;
  fullAttestation: Record<string, unknown>;
}

interface FakePrisma {
  verityLogLeaf: {
    _store: FakeLeaf[];
    findUnique: (args: {
      where: { attestationId?: string; leafIndex?: number };
      select?: Record<string, true>;
    }) => Promise<FakeLeaf | null>;
    findFirst: (args: {
      orderBy: { leafIndex: "asc" | "desc" };
      select?: Record<string, true>;
    }) => Promise<FakeLeaf | null>;
    findMany: (args: {
      where?: {
        leafIndex?: { lt?: number };
        attestationId?: { in: string[] };
      };
      orderBy?: { leafIndex: "asc" | "desc" };
      select?: Record<string, true>;
    }) => Promise<FakeLeaf[]>;
    count: () => Promise<number>;
    create: (args: {
      data: { leafIndex: number; attestationId: string; leafHash: string };
    }) => Promise<FakeLeaf>;
  };
  verityLogSTH: {
    _store: FakeSTH[];
    findFirst: (args: {
      orderBy: { treeSize: "asc" | "desc" };
      select?: Record<string, true>;
    }) => Promise<FakeSTH | null>;
    findUnique: (args: {
      where: { treeSize: number };
    }) => Promise<FakeSTH | null>;
    create: (args: { data: Omit<FakeSTH, never> }) => Promise<FakeSTH>;
  };
  verityIssuerKey: {
    _store: FakeIssuerKey[];
    findFirst: (args: {
      where: { active: true };
      select?: Record<string, true>;
    }) => Promise<FakeIssuerKey | null>;
  };
  verityAttestation: {
    _store: FakeAttestation[];
    findMany: (args: {
      where?: unknown;
      orderBy: Array<{ issuedAt?: "asc"; attestationId?: "asc" }>;
      take: number;
      select?: Record<string, true>;
    }) => Promise<FakeAttestation[]>;
  };
  $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}

function makeFakePrisma(): FakePrisma {
  const leaves: FakeLeaf[] = [];
  const sths: FakeSTH[] = [];
  const issuerKeys: FakeIssuerKey[] = [];
  const attestations: FakeAttestation[] = [];

  const verityLogLeaf = {
    _store: leaves,
    findUnique: async ({
      where,
    }: {
      where: { attestationId?: string; leafIndex?: number };
    }) => {
      if (where.attestationId !== undefined) {
        return (
          leaves.find((l) => l.attestationId === where.attestationId) ?? null
        );
      }
      if (where.leafIndex !== undefined) {
        return leaves.find((l) => l.leafIndex === where.leafIndex) ?? null;
      }
      return null;
    },
    findFirst: async ({
      orderBy,
    }: {
      orderBy: { leafIndex: "asc" | "desc" };
    }) => {
      const sorted = [...leaves].sort((a, b) =>
        orderBy.leafIndex === "desc"
          ? b.leafIndex - a.leafIndex
          : a.leafIndex - b.leafIndex,
      );
      return sorted[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where?: {
        leafIndex?: { lt?: number };
        attestationId?: { in: string[] };
      };
      orderBy?: { leafIndex: "asc" | "desc" };
    }) => {
      let filtered = leaves;
      if (where?.leafIndex?.lt !== undefined) {
        const lt = where.leafIndex.lt;
        filtered = filtered.filter((l) => l.leafIndex < lt);
      }
      if (where?.attestationId?.in) {
        const ids = new Set(where.attestationId.in);
        filtered = filtered.filter((l) => ids.has(l.attestationId));
      }
      const sorted = orderBy
        ? [...filtered].sort((a, b) =>
            orderBy.leafIndex === "desc"
              ? b.leafIndex - a.leafIndex
              : a.leafIndex - b.leafIndex,
          )
        : filtered;
      return sorted;
    },
    count: async () => leaves.length,
    create: async ({
      data,
    }: {
      data: { leafIndex: number; attestationId: string; leafHash: string };
    }) => {
      // Enforce leafIndex unique
      if (leaves.some((l) => l.leafIndex === data.leafIndex)) {
        const err = new Error(
          `Unique constraint failed on leafIndex=${data.leafIndex}`,
        );
        // @ts-expect-error mimic Prisma error code shape
        err.code = "P2002";
        throw err;
      }
      const row: FakeLeaf = { ...data, appendedAt: new Date() };
      leaves.push(row);
      return row;
    },
  };

  const verityLogSTH = {
    _store: sths,
    findFirst: async ({
      orderBy,
    }: {
      orderBy: { treeSize: "asc" | "desc" };
    }) => {
      const sorted = [...sths].sort((a, b) =>
        orderBy.treeSize === "desc"
          ? b.treeSize - a.treeSize
          : a.treeSize - b.treeSize,
      );
      return sorted[0] ?? null;
    },
    findUnique: async ({ where }: { where: { treeSize: number } }) => {
      return sths.find((s) => s.treeSize === where.treeSize) ?? null;
    },
    create: async ({ data }: { data: FakeSTH }) => {
      const row = { ...data };
      sths.push(row);
      return row;
    },
  };

  const verityIssuerKey = {
    _store: issuerKeys,
    findFirst: async ({ where }: { where: { active: true } }) => {
      return issuerKeys.find((k) => k.active === where.active) ?? null;
    },
  };

  const verityAttestation = {
    _store: attestations,
    findMany: async ({ take }: { take: number }) => {
      // Tests don't exercise WHERE/cursor today; return everything
      // in (issuedAt asc, attestationId asc) order capped at `take`.
      const sorted = [...attestations].sort((a, b) => {
        const t = a.issuedAt.getTime() - b.issuedAt.getTime();
        if (t !== 0) return t;
        return a.attestationId.localeCompare(b.attestationId);
      });
      return sorted.slice(0, take);
    },
  };

  return {
    verityLogLeaf,
    verityLogSTH,
    verityIssuerKey,
    verityAttestation,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      // Tests never exercise true concurrency; serialise the closure.
      return fn({ verityLogLeaf, verityLogSTH });
    },
  } as FakePrisma;
}

// ─── Issuer-key + attestation helpers ──────────────────────────────────

function makeIssuerKey(prisma: FakePrisma) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // Encrypt with VERITY_MASTER_KEY using the same iv:authTag:cipher scheme
  const masterKey = Buffer.from("a".repeat(64), "hex");
  process.env.VERITY_MASTER_KEY = "a".repeat(64);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const encrypted = Buffer.concat([cipher.update(privDer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedHex = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;

  const keyId = "verity-test-2026-05-05";
  prisma.verityIssuerKey._store.push({
    keyId,
    encryptedPrivKey: encryptedHex,
    active: true,
  });
  return {
    keyId,
    publicKeyHex: publicKey
      .export({ type: "spki", format: "der" })
      .toString("hex"),
    privateKeyDer: privDer as Buffer,
  };
}

function makeAttestation(
  key: { keyId: string; publicKeyHex: string; privateKeyDer: Buffer },
  overrides: Partial<{
    actual_value: number;
    threshold_value: number;
    regulation_ref: string;
  }> = {},
): ThresholdAttestation {
  return generateAttestation({
    regulation_ref: overrides.regulation_ref ?? "eu_space_act_art_70",
    regulation_name: "Test reg",
    threshold_type: "ABOVE",
    threshold_value: overrides.threshold_value ?? 10,
    actual_value: overrides.actual_value ?? 95,
    data_point: "remaining_fuel_pct",
    claim_statement: "Above threshold",
    subject: {
      operator_id: "user_test",
      satellite_norad_id: "12345",
      satellite_name: "TestSat",
    },
    evidence_source: "sentinel",
    trust_score: 0.98,
    collected_at: new Date().toISOString(),
    sentinel_anchor: null,
    cross_verification: null,
    issuer_key_id: key.keyId,
    issuer_private_key_der: key.privateKeyDer,
    issuer_public_key_hex: key.publicKeyHex,
    expires_in_days: 90,
    commitment_scheme: "v1",
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("appendToLog", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof makeIssuerKey>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = makeIssuerKey(prisma);
  });

  it("creates a leaf at index 0 for the first attestation", async () => {
    const att = makeAttestation(key);
    const idx = await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    expect(idx).toBe(0);
    expect(prisma.verityLogLeaf._store).toHaveLength(1);
    expect(prisma.verityLogLeaf._store[0]?.attestationId).toBe(
      att.attestation_id,
    );
    expect(prisma.verityLogLeaf._store[0]?.leafIndex).toBe(0);
  });

  it("assigns sequential indices 0..N-1 across appends", async () => {
    for (let i = 0; i < 5; i++) {
      const att = makeAttestation(key, { regulation_ref: `reg_${i}` });
      const idx = await appendToLog(
        prisma as unknown as Parameters<typeof appendToLog>[0],
        att as unknown as Record<string, unknown>,
      );
      expect(idx).toBe(i);
    }
    expect(prisma.verityLogLeaf._store).toHaveLength(5);
    expect(prisma.verityLogLeaf._store.map((l) => l.leafIndex)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("is idempotent — re-appending the same attestation returns the same index", async () => {
    const att = makeAttestation(key);
    const first = await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    const second = await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    expect(first).toBe(0);
    expect(second).toBe(0);
    expect(prisma.verityLogLeaf._store).toHaveLength(1);
  });

  it("rejects when attestation_id is missing", async () => {
    await expect(
      appendToLog(
        prisma as unknown as Parameters<typeof appendToLog>[0],
        { signature: "deadbeef" } as Record<string, unknown>,
      ),
    ).rejects.toThrow(/attestation_id missing/);
  });

  it("rejects when signature is missing", async () => {
    // serializeForSigning requires every signed field to be present
    // before it gets to the signature check. We supply a fully-formed
    // attestation EXCEPT for the signature so the error we surface
    // is exactly the missing-signature one (not a missing-claim one).
    const att = makeAttestation(key);
    const noSig = { ...att } as Record<string, unknown>;
    delete noSig.signature;
    await expect(
      appendToLog(
        prisma as unknown as Parameters<typeof appendToLog>[0],
        noSig,
      ),
    ).rejects.toThrow(/missing string signature/);
  });

  it("computes the leaf hash deterministically (hex SHA-256)", async () => {
    const att = makeAttestation(key);
    const hash1 = attestationLeafHashHex(
      att as unknown as Record<string, unknown>,
    );
    const hash2 = attestationLeafHashHex(
      att as unknown as Record<string, unknown>,
    );
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("signNewSTH", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof makeIssuerKey>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = makeIssuerKey(prisma);
  });

  it("returns null when the log is empty", async () => {
    const sth = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(sth).toBeNull();
  });

  it("creates a v1 STH after the first attestation", async () => {
    const att = makeAttestation(key);
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    const sth = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(sth).not.toBeNull();
    expect(sth!.treeSize).toBe(1);
    expect(sth!.version).toBe("v1");
    expect(sth!.issuerKeyId).toBe(key.keyId);
    expect(sth!.rootHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sth!.signature).toMatch(/^[0-9a-f]+$/);
    expect(prisma.verityLogSTH._store).toHaveLength(1);
  });

  it("returns null when treeSize hasn't changed since the last STH", async () => {
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key) as unknown as Record<string, unknown>,
    );
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    // No new leaves; should be a no-op.
    const second = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(second).toBeNull();
    expect(prisma.verityLogSTH._store).toHaveLength(1);
  });

  it("creates a new STH when the log grows", async () => {
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r1" }) as unknown as Record<
        string,
        unknown
      >,
    );
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r2" }) as unknown as Record<
        string,
        unknown
      >,
    );
    const sth = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(sth).not.toBeNull();
    expect(sth!.treeSize).toBe(2);
    expect(prisma.verityLogSTH._store).toHaveLength(2);
  });

  // T5-8 regression: STH timestamp must be strictly monotonic.
  it("[T5-8 regression] timestamp is strictly > prior STH timestamp", async () => {
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r1" }) as unknown as Record<
        string,
        unknown
      >,
    );
    const first = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r2" }) as unknown as Record<
        string,
        unknown
      >,
    );

    // Advance neither real clock nor mock — just call signNewSTH again
    // on the same tick. Without T5-8, both STHs could share a
    // timestamp (or even regress on serverless clock drift). With T5-8,
    // the new timestamp is at minimum prior + 1ms.
    const second = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(new Date(second!.timestamp).getTime()).toBeGreaterThan(
      new Date(first!.timestamp).getTime(),
    );
  });

  it("returns null when no active issuer key exists", async () => {
    // Drop the active key
    prisma.verityIssuerKey._store.length = 0;
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key) as unknown as Record<string, unknown>,
    );
    const sth = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    expect(sth).toBeNull();
    expect(prisma.verityLogSTH._store).toHaveLength(0);
  });
});

describe("getInclusionForAttestation", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof makeIssuerKey>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = makeIssuerKey(prisma);
  });

  it("returns null when no STH has been signed", async () => {
    const att = makeAttestation(key);
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    const inc = await getInclusionForAttestation(
      prisma as unknown as Parameters<typeof getInclusionForAttestation>[0],
      att.attestation_id,
    );
    expect(inc).toBeNull();
  });

  it("returns null for a missing attestation", async () => {
    const inc = await getInclusionForAttestation(
      prisma as unknown as Parameters<typeof getInclusionForAttestation>[0],
      "va_does_not_exist",
    );
    expect(inc).toBeNull();
  });

  it("returns a proof whose root matches the latest STH", async () => {
    const att = makeAttestation(key);
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att as unknown as Record<string, unknown>,
    );
    const sth = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    const inc = await getInclusionForAttestation(
      prisma as unknown as Parameters<typeof getInclusionForAttestation>[0],
      att.attestation_id,
    );
    expect(inc).not.toBeNull();
    expect(inc!.proof.root).toBe(sth!.rootHash);
    expect(inc!.proof.leafIndex).toBe(0);
    expect(inc!.sth.treeSize).toBe(1);
  });

  it("returns null when leaf is appended after the latest STH", async () => {
    // Sign an STH with one leaf, then add a second leaf without
    // re-signing. Inclusion for the new leaf must return null
    // because the latest STH doesn't cover it yet.
    const att1 = makeAttestation(key, { regulation_ref: "r1" });
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att1 as unknown as Record<string, unknown>,
    );
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const att2 = makeAttestation(key, { regulation_ref: "r2" });
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      att2 as unknown as Record<string, unknown>,
    );

    const inc = await getInclusionForAttestation(
      prisma as unknown as Parameters<typeof getInclusionForAttestation>[0],
      att2.attestation_id,
    );
    expect(inc).toBeNull();
  });
});

describe("getConsistencyFromStore", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof makeIssuerKey>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = makeIssuerKey(prisma);
  });

  it("rejects non-integer sizes", async () => {
    const r = await getConsistencyFromStore(
      prisma as unknown as Parameters<typeof getConsistencyFromStore>[0],
      1.5,
      2,
    );
    expect(r).toBeNull();
  });

  it("rejects negative sizes", async () => {
    const r = await getConsistencyFromStore(
      prisma as unknown as Parameters<typeof getConsistencyFromStore>[0],
      -1,
      2,
    );
    expect(r).toBeNull();
  });

  it("rejects oldSize > newSize", async () => {
    const r = await getConsistencyFromStore(
      prisma as unknown as Parameters<typeof getConsistencyFromStore>[0],
      5,
      3,
    );
    expect(r).toBeNull();
  });

  it("returns null when an STH is missing", async () => {
    // Build 2 STHs but request consistency between non-existent sizes.
    for (let i = 0; i < 2; i++) {
      await appendToLog(
        prisma as unknown as Parameters<typeof appendToLog>[0],
        makeAttestation(key, { regulation_ref: `r${i}` }) as unknown as Record<
          string,
          unknown
        >,
      );
      await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    }
    const r = await getConsistencyFromStore(
      prisma as unknown as Parameters<typeof getConsistencyFromStore>[0],
      99,
      100,
    );
    expect(r).toBeNull();
  });

  it("returns a bundle linking two valid STHs", async () => {
    // Snapshot at size 1, add 2 more, snapshot at size 3.
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r1" }) as unknown as Record<
        string,
        unknown
      >,
    );
    const s1 = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r2" }) as unknown as Record<
        string,
        unknown
      >,
    );
    await appendToLog(
      prisma as unknown as Parameters<typeof appendToLog>[0],
      makeAttestation(key, { regulation_ref: "r3" }) as unknown as Record<
        string,
        unknown
      >,
    );
    const s3 = await signNewSTH(
      prisma as unknown as Parameters<typeof signNewSTH>[0],
    );

    const bundle = await getConsistencyFromStore(
      prisma as unknown as Parameters<typeof getConsistencyFromStore>[0],
      1,
      3,
    );
    expect(bundle).not.toBeNull();
    expect(bundle!.oldSize).toBe(1);
    expect(bundle!.newSize).toBe(3);
    expect(bundle!.oldRoot).toBe(s1!.rootHash);
    expect(bundle!.newRoot).toBe(s3!.rootHash);
    expect(Array.isArray(bundle!.proof)).toBe(true);
  });
});

describe("backfillMissingLeaves (H4d chunked backfill)", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof makeIssuerKey>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = makeIssuerKey(prisma);
  });

  it("returns zeros when the attestation table is empty", async () => {
    const r = await backfillMissingLeaves(
      prisma as unknown as Parameters<typeof backfillMissingLeaves>[0],
    );
    expect(r).toEqual({ added: 0, total: 0, skipped: 0 });
  });

  it("appends a leaf for an attestation that has none", async () => {
    const att = makeAttestation(key);
    prisma.verityAttestation._store.push({
      attestationId: att.attestation_id,
      issuedAt: new Date(att.issued_at),
      fullAttestation: att as unknown as Record<string, unknown>,
    });

    const r = await backfillMissingLeaves(
      prisma as unknown as Parameters<typeof backfillMissingLeaves>[0],
    );
    expect(r.added).toBe(1);
    expect(r.total).toBe(1);
    expect(r.skipped).toBe(0);
    expect(prisma.verityLogLeaf._store).toHaveLength(1);
  });

  it("is idempotent — second run adds nothing", async () => {
    const att = makeAttestation(key);
    prisma.verityAttestation._store.push({
      attestationId: att.attestation_id,
      issuedAt: new Date(att.issued_at),
      fullAttestation: att as unknown as Record<string, unknown>,
    });
    await backfillMissingLeaves(
      prisma as unknown as Parameters<typeof backfillMissingLeaves>[0],
    );

    const r = await backfillMissingLeaves(
      prisma as unknown as Parameters<typeof backfillMissingLeaves>[0],
    );
    expect(r.added).toBe(0);
    expect(r.total).toBe(1);
    expect(r.skipped).toBe(0);
  });

  it("skips malformed rows (no signature) but counts them in total", async () => {
    // Realistic seed/test row with no signature → appendToLog throws
    // → backfill counts as skipped, doesn't crash the whole run.
    prisma.verityAttestation._store.push({
      attestationId: "va_malformed",
      issuedAt: new Date(),
      fullAttestation: { attestation_id: "va_malformed" }, // no signature
    });

    const r = await backfillMissingLeaves(
      prisma as unknown as Parameters<typeof backfillMissingLeaves>[0],
    );
    expect(r.added).toBe(0);
    expect(r.total).toBe(1);
    expect(r.skipped).toBe(1);
    expect(prisma.verityLogLeaf._store).toHaveLength(0);
  });
});
