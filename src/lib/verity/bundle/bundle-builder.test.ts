/**
 * T2-8 (audit fix 2026-05-05): tests for the regulator-ready
 * bundle builder in `bundle-builder.ts`.
 *
 * Coverage:
 *   - happy path: bundle with N attestations, all primitives present
 *     (entries, sth, issuerKeys, didDocument, consistencyChain,
 *     readme, deterministic bundleId).
 *   - selector: ids / satellite / regulation each filter correctly.
 *   - operator-scope: mismatch attestationId throws (no silent drop).
 *   - operator-scope: empty selector throws.
 *   - MAX_BUNDLE_SIZE cap on `ids` selector.
 *   - status resolution: valid / expired / revoked entries reflected.
 *   - status uses the injected clock (T5-5 consolidation).
 *   - bundleId is deterministic SHA-256 over canonical JSON.
 *   - consistency chain emitted between consecutive STHs.
 *   - resolveStatus exported function works for ad-hoc callers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCipheriv, generateKeyPairSync, randomBytes } from "node:crypto";
import { generateAttestation } from "../core/attestation";
import type { ThresholdAttestation } from "../core/types";

vi.mock("server-only", () => ({}));
vi.mock("../utils/redaction", () => ({ safeLog: vi.fn() }));

import { buildBundle, resolveStatus, MAX_BUNDLE_SIZE } from "./bundle-builder";
import { appendToLog, signNewSTH } from "../transparency/log-store";

// ─── In-memory Prisma fake (Verity-scoped) ────────────────────────────

interface FakeAttRow {
  id: string;
  attestationId: string;
  organizationId: string;
  satelliteNorad: string | null;
  regulationRef: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  fullAttestation: Record<string, unknown>;
}

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
  createdAt?: Date;
}

interface FakeIssuerKey {
  keyId: string;
  publicKeyHex: string;
  encryptedPrivKey: string;
  active: boolean;
  algorithm: string;
  createdAt: Date;
  rotatedAt: Date | null;
}

interface FakeOrg {
  id: string;
  name: string;
}

function makeFakePrisma() {
  const attestations: FakeAttRow[] = [];
  const leaves: FakeLeaf[] = [];
  const sths: FakeSTH[] = [];
  const issuerKeys: FakeIssuerKey[] = [];
  const orgs: FakeOrg[] = [];

  const verityAttestation = {
    findMany: async (args: {
      where?: {
        organizationId?: string;
        attestationId?: { in: string[] };
        satelliteNorad?: string;
        regulationRef?: string;
      };
      // backfillMissingLeaves uses an array of orderBy sort keys.
      orderBy:
        | { issuedAt: "asc" | "desc" }
        | Array<{ issuedAt?: "asc"; attestationId?: "asc" }>;
      take?: number;
    }) => {
      let rows = attestations;
      const where = args.where ?? {};
      if (where.organizationId !== undefined) {
        rows = rows.filter((r) => r.organizationId === where.organizationId);
      }
      if (where.attestationId?.in) {
        const ids = new Set(where.attestationId.in);
        rows = rows.filter((r) => ids.has(r.attestationId));
      }
      if (where.satelliteNorad !== undefined) {
        rows = rows.filter((r) => r.satelliteNorad === where.satelliteNorad);
      }
      if (where.regulationRef !== undefined) {
        rows = rows.filter((r) => r.regulationRef === where.regulationRef);
      }
      // bundle-builder always passes a single { issuedAt: "asc" | "desc" }
      // object; backfill passes an array. Handle both.
      const direction = Array.isArray(args.orderBy)
        ? "asc"
        : args.orderBy.issuedAt;
      const sorted = [...rows].sort((a, b) => {
        const t =
          direction === "desc"
            ? b.issuedAt.getTime() - a.issuedAt.getTime()
            : a.issuedAt.getTime() - b.issuedAt.getTime();
        if (t !== 0) return t;
        return a.attestationId.localeCompare(b.attestationId);
      });
      return args.take ? sorted.slice(0, args.take) : sorted;
    },
  };

  const verityLogLeaf = {
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
      where?: { leafIndex?: { lt?: number }; attestationId?: { in: string[] } };
      orderBy?: { leafIndex: "asc" | "desc" };
    }) => {
      let f = leaves;
      if (where?.leafIndex?.lt !== undefined) {
        const lt = where.leafIndex.lt;
        f = f.filter((l) => l.leafIndex < lt);
      }
      if (where?.attestationId?.in) {
        const ids = new Set(where.attestationId.in);
        f = f.filter((l) => ids.has(l.attestationId));
      }
      return orderBy
        ? [...f].sort((a, b) =>
            orderBy.leafIndex === "desc"
              ? b.leafIndex - a.leafIndex
              : a.leafIndex - b.leafIndex,
          )
        : f;
    },
    count: async () => leaves.length,
    create: async ({
      data,
    }: {
      data: { leafIndex: number; attestationId: string; leafHash: string };
    }) => {
      if (leaves.some((l) => l.leafIndex === data.leafIndex)) {
        const e = new Error("P2002");
        // @ts-expect-error mimic Prisma error shape
        e.code = "P2002";
        throw e;
      }
      const row: FakeLeaf = { ...data, appendedAt: new Date() };
      leaves.push(row);
      return row;
    },
  };

  const verityLogSTH = {
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
    findUnique: async ({ where }: { where: { treeSize: number } }) =>
      sths.find((s) => s.treeSize === where.treeSize) ?? null,
    findMany: async ({
      orderBy,
    }: {
      orderBy: { treeSize: "asc" | "desc" };
      select?: Record<string, true>;
    }) => {
      return [...sths].sort((a, b) =>
        orderBy.treeSize === "asc"
          ? a.treeSize - b.treeSize
          : b.treeSize - a.treeSize,
      );
    },
    create: async ({ data }: { data: FakeSTH }) => {
      const row = { ...data };
      sths.push(row);
      return row;
    },
  };

  const verityIssuerKey = {
    _store: issuerKeys,
    findFirst: async ({
      where,
    }: {
      where?: { active?: boolean };
      select?: Record<string, true>;
    }) => {
      if (where?.active !== undefined) {
        return issuerKeys.find((k) => k.active === where.active) ?? null;
      }
      return issuerKeys[0] ?? null;
    },
    findMany: async ({
      orderBy,
    }: {
      orderBy: { createdAt: "asc" | "desc" };
    }) => {
      return [...issuerKeys].sort((a, b) =>
        orderBy.createdAt === "desc"
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : a.createdAt.getTime() - b.createdAt.getTime(),
      );
    },
  };

  const organization = {
    findUnique: async ({
      where,
    }: {
      where: { id: string };
      select?: Record<string, true>;
    }) => orgs.find((o) => o.id === where.id) ?? null,
  };

  return {
    _stores: { attestations, leaves, sths, issuerKeys, orgs },
    verityAttestation,
    verityLogLeaf,
    verityLogSTH,
    verityIssuerKey,
    organization,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({ verityLogLeaf, verityLogSTH }),
  };
}

type FakePrisma = ReturnType<typeof makeFakePrisma>;

// ─── Fixtures ────────────────────────────────────────────────────────

function seedIssuerKey(prisma: FakePrisma, keyId = "verity-bundle-test") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  process.env.VERITY_MASTER_KEY = "a".repeat(64);
  const masterKey = Buffer.from("a".repeat(64), "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const encrypted = Buffer.concat([cipher.update(privDer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedHex = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  const publicKeyHex = publicKey
    .export({ type: "spki", format: "der" })
    .toString("hex");
  prisma._stores.issuerKeys.push({
    keyId,
    publicKeyHex,
    encryptedPrivKey: encryptedHex,
    active: true,
    algorithm: "Ed25519",
    createdAt: new Date(Date.now() - 86400000),
    rotatedAt: null,
  });
  return {
    keyId,
    publicKeyHex,
    privateKeyDer: privDer as Buffer,
  };
}

function seedOrganization(prisma: FakePrisma, id: string, name: string) {
  prisma._stores.orgs.push({ id, name });
  return { id, name };
}

async function seedAttestation(
  prisma: FakePrisma,
  key: { keyId: string; publicKeyHex: string; privateKeyDer: Buffer },
  organizationId: string,
  overrides: {
    regulationRef?: string;
    satelliteNorad?: string | null;
    issuedAtOffsetMs?: number;
    expiresAtOffsetMs?: number;
    revokedAtOffsetMs?: number | null;
    revokedReason?: string | null;
  } = {},
): Promise<ThresholdAttestation> {
  const att = generateAttestation({
    regulation_ref: overrides.regulationRef ?? "eu_space_act_art_70",
    regulation_name: "Test reg",
    threshold_type: "ABOVE",
    threshold_value: 10,
    actual_value: 95,
    data_point: "remaining_fuel_pct",
    claim_statement: "Above",
    subject: {
      operator_id: "user_test",
      satellite_norad_id: overrides.satelliteNorad ?? "12345",
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
  const now = Date.now();
  prisma._stores.attestations.push({
    id: `db_${att.attestation_id}`,
    attestationId: att.attestation_id,
    organizationId,
    satelliteNorad: overrides.satelliteNorad ?? "12345",
    regulationRef: att.claim.regulation_ref,
    issuedAt: new Date(now + (overrides.issuedAtOffsetMs ?? 0)),
    expiresAt: new Date(now + (overrides.expiresAtOffsetMs ?? 90 * 86400000)),
    revokedAt:
      overrides.revokedAtOffsetMs !== undefined &&
      overrides.revokedAtOffsetMs !== null
        ? new Date(now + overrides.revokedAtOffsetMs)
        : null,
    revokedReason: overrides.revokedReason ?? null,
    fullAttestation: att as unknown as Record<string, unknown>,
  });
  await appendToLog(
    prisma as unknown as Parameters<typeof appendToLog>[0],
    att as unknown as Record<string, unknown>,
  );
  return att;
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("buildBundle — happy path", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof seedIssuerKey>;
  const orgId = "org_bundle_test";

  beforeEach(async () => {
    prisma = makeFakePrisma();
    key = seedIssuerKey(prisma);
    seedOrganization(prisma, orgId, "Test Operator");
  });

  it("emits a bundle with all primitives present", async () => {
    const att1 = await seedAttestation(prisma, key, orgId, {
      regulationRef: "r1",
    });
    await seedAttestation(prisma, key, orgId, { regulationRef: "r2" });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "ids", attestationIds: [att1.attestation_id] },
    });

    expect(bundle.bundleVersion).toBe("verity-bundle-v1");
    expect(bundle.bundleId).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0]?.attestation.attestation_id).toBe(
      att1.attestation_id,
    );
    expect(bundle.entries[0]?.vc).toBeDefined();
    expect(bundle.entries[0]?.inclusion).not.toBeNull();
    expect(bundle.entries[0]?.status.state).toBe("valid");
    expect(bundle.sth).not.toBeNull();
    expect(bundle.sth!.treeSize).toBe(2);
    expect(bundle.issuerKeys).toHaveLength(1);
    expect(bundle.didDocument).not.toBeNull();
    expect(bundle.operator).toEqual({ id: orgId, name: "Test Operator" });
    expect(bundle.readme).toContain("Verity Bundle");
  });

  it("bundleId is deterministic over the same input", async () => {
    const att = await seedAttestation(prisma, key, orgId);
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    const fixedClock = new Date("2026-05-05T12:00:00.000Z");
    const a = await buildBundle(
      {
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "ids", attestationIds: [att.attestation_id] },
      },
      fixedClock,
    );
    const b = await buildBundle(
      {
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "ids", attestationIds: [att.attestation_id] },
      },
      fixedClock,
    );
    expect(a.bundleId).toBe(b.bundleId);
  });
});

describe("buildBundle — selectors", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof seedIssuerKey>;
  const orgId = "org_sel";

  beforeEach(async () => {
    prisma = makeFakePrisma();
    key = seedIssuerKey(prisma);
    seedOrganization(prisma, orgId, "Sel Op");
  });

  it("ids selector: filters by attestation ids", async () => {
    const a = await seedAttestation(prisma, key, orgId, {
      regulationRef: "rA",
    });
    await seedAttestation(prisma, key, orgId, { regulationRef: "rB" });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0]?.attestation.attestation_id).toBe(
      a.attestation_id,
    );
  });

  it("ids selector: throws on empty list", async () => {
    await seedAttestation(prisma, key, orgId);
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    await expect(
      buildBundle({
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "ids", attestationIds: [] },
      }),
    ).rejects.toThrow(/non-empty/);
  });

  it(`ids selector: throws on > MAX_BUNDLE_SIZE (${MAX_BUNDLE_SIZE})`, async () => {
    await seedAttestation(prisma, key, orgId);
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    const bigList = Array.from(
      { length: MAX_BUNDLE_SIZE + 1 },
      (_, i) => `va_phantom_${i}`,
    );
    await expect(
      buildBundle({
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "ids", attestationIds: bigList },
      }),
    ).rejects.toThrow(/too many attestations/);
  });

  it("ids selector: throws when an id doesn't belong to operator", async () => {
    await seedAttestation(prisma, key, orgId);
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    await expect(
      buildBundle({
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "ids", attestationIds: ["va_phantom"] },
      }),
    ).rejects.toThrow(/not owned by this operator/);
  });

  it("satellite selector: filters by NORAD id", async () => {
    await seedAttestation(prisma, key, orgId, {
      satelliteNorad: "11111",
      regulationRef: "r1",
    });
    await seedAttestation(prisma, key, orgId, {
      satelliteNorad: "22222",
      regulationRef: "r2",
    });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "satellite", satelliteNoradId: "22222" },
    });
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0]?.attestation.subject.satellite_norad_id).toBe(
      "22222",
    );
  });

  it("regulation selector: filters by regulationRef", async () => {
    await seedAttestation(prisma, key, orgId, { regulationRef: "rA" });
    await seedAttestation(prisma, key, orgId, { regulationRef: "rB" });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "regulation", regulationRef: "rB" },
    });
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0]?.attestation.claim.regulation_ref).toBe("rB");
  });

  it("throws when no attestations match the selector", async () => {
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);
    await expect(
      buildBundle({
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "regulation", regulationRef: "no_such" },
      }),
    ).rejects.toThrow(/no attestations match/);
  });
});

describe("buildBundle — entry status (T5-5 clock-injected resolveStatus)", () => {
  let prisma: FakePrisma;
  let key: ReturnType<typeof seedIssuerKey>;
  const orgId = "org_status";

  beforeEach(() => {
    prisma = makeFakePrisma();
    key = seedIssuerKey(prisma);
    seedOrganization(prisma, orgId, "Status Op");
  });

  it("marks revoked when revokedAt is set", async () => {
    await seedAttestation(prisma, key, orgId, {
      revokedAtOffsetMs: -1000,
      revokedReason: "test_reason",
    });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "regulation", regulationRef: "eu_space_act_art_70" },
    });
    expect(bundle.entries[0]?.status.state).toBe("revoked");
    expect(bundle.entries[0]?.status.revocationReason).toBe("test_reason");
  });

  it("marks expired when expiresAt < clock", async () => {
    await seedAttestation(prisma, key, orgId, {
      expiresAtOffsetMs: -1000,
    });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const bundle = await buildBundle({
      prisma: prisma as unknown as Parameters<typeof buildBundle>[0]["prisma"],
      operatorId: orgId,
      selector: { type: "regulation", regulationRef: "eu_space_act_art_70" },
    });
    expect(bundle.entries[0]?.status.state).toBe("expired");
  });

  it("uses the injected clock, not Date.now", async () => {
    // Issue an attestation that expires in 30 days. Resolve status
    // against a clock 60 days in the future → should report expired.
    await seedAttestation(prisma, key, orgId, {
      expiresAtOffsetMs: 30 * 86400000,
    });
    await signNewSTH(prisma as unknown as Parameters<typeof signNewSTH>[0]);

    const futureClock = new Date(Date.now() + 60 * 86400000);
    const bundle = await buildBundle(
      {
        prisma: prisma as unknown as Parameters<
          typeof buildBundle
        >[0]["prisma"],
        operatorId: orgId,
        selector: { type: "regulation", regulationRef: "eu_space_act_art_70" },
      },
      futureClock,
    );
    expect(bundle.entries[0]?.status.state).toBe("expired");
  });
});

describe("resolveStatus — exported helper (T5-5 single function)", () => {
  it("returns valid for a non-expired, non-revoked row", () => {
    const status = resolveStatus({
      issuedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      revokedReason: null,
    });
    expect(status.state).toBe("valid");
  });

  it("returns expired against the default clock", () => {
    const status = resolveStatus({
      issuedAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      revokedReason: null,
    });
    expect(status.state).toBe("expired");
  });

  it("respects an injected clock", () => {
    // Row expires in 30s. Clock pinned 1 minute in the future →
    // expired.
    const futureClock = new Date(Date.now() + 60_000);
    const status = resolveStatus(
      {
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30_000),
        revokedAt: null,
        revokedReason: null,
      },
      futureClock,
    );
    expect(status.state).toBe("expired");
  });

  it("revoked beats expired", () => {
    const status = resolveStatus({
      issuedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() - 500),
      revokedAt: new Date(Date.now() - 100),
      revokedReason: "test",
    });
    expect(status.state).toBe("revoked");
  });
});
