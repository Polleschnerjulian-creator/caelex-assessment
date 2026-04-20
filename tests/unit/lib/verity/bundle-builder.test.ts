// tests/unit/lib/verity/bundle-builder.test.ts

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// The bundle builder imports log-store.ts which imports "server-only".
vi.mock("server-only", () => ({}));

import {
  generateKeyPairSync,
  createCipheriv,
  randomBytes,
  createPublicKey,
  verify,
} from "node:crypto";
import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  buildBundle,
  MAX_BUNDLE_SIZE,
} from "@/lib/verity/bundle/bundle-builder";
import type { Bundle } from "@/lib/verity/bundle/types";
import {
  verifyAttestation,
  generateAttestation,
} from "@/lib/verity/core/attestation";
import type { GenerateAttestationParams } from "@/lib/verity/core/types";
import {
  sthSigningBytes,
  verifyConsistencyProof,
} from "@/lib/verity/transparency/merkle-tree";
import { appendToLog, signNewSTH } from "@/lib/verity/transparency/log-store";
import { canonicalJsonStringify } from "@/lib/verity/utils/canonical-json";

// ─── Ed25519 key material (one per test suite) ─────────────────────

let pubKeyHex: string;
let privKeyDer: Buffer;
let encryptedPrivKey: string;

function encryptPrivateKeyForTest(
  privDer: Buffer,
  masterKeyHex: string,
): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(masterKeyHex, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(privDer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  pubKeyHex = publicKey.export({ type: "spki", format: "der" }).toString("hex");
  privKeyDer = privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
  process.env.VERITY_MASTER_KEY = "00".repeat(32);
  encryptedPrivKey = encryptPrivateKeyForTest(
    privKeyDer,
    process.env.VERITY_MASTER_KEY!,
  );
});

// ─── In-memory Prisma stub (parallels log-store.test.ts) ────────────

type LeafRow = {
  id: string;
  leafIndex: number;
  attestationId: string;
  leafHash: string;
  appendedAt: Date;
};
type STHRow = {
  id: string;
  treeSize: number;
  rootHash: string;
  issuerKeyId: string;
  signature: string;
  timestamp: Date;
  version: string;
};
type AttRow = {
  id: string;
  attestationId: string;
  organizationId: string;
  satelliteNorad: string | null;
  regulationRef: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  fullAttestation: unknown;
};
type KeyRow = {
  id: string;
  keyId: string;
  publicKeyHex: string;
  encryptedPrivKey: string;
  algorithm: string;
  active: boolean;
  createdAt: Date;
  rotatedAt: Date | null;
};
type OrgRow = { id: string; name: string };

function makePrisma() {
  const leaves: LeafRow[] = [];
  const sths: STHRow[] = [];
  const atts: AttRow[] = [];
  const keys: KeyRow[] = [];
  const orgs: OrgRow[] = [];
  let idCounter = 0;
  const nextId = () => `id_${++idCounter}`;

  const sortBy = <T>(
    arr: T[],
    ob: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>,
  ): T[] => {
    const keys = Array.isArray(ob) ? ob : [ob];
    return arr.slice().sort((a, b) => {
      for (const k of keys) {
        const [field, dir] = Object.entries(k)[0]!;
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        let cmp = 0;
        if (av instanceof Date && bv instanceof Date) {
          cmp = av.getTime() - bv.getTime();
        } else if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else if (typeof av === "string" && typeof bv === "string") {
          cmp = av.localeCompare(bv);
        }
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  };

  const prisma = {
    verityLogLeaf: {
      findUnique: async ({ where }: { where: { attestationId: string } }) =>
        leaves.find((l) => l.attestationId === where.attestationId) ?? null,
      findFirst: async (opts?: { orderBy?: Record<string, "asc" | "desc"> }) =>
        (opts?.orderBy ? sortBy(leaves, opts.orderBy)[0] : leaves[0]) ?? null,
      findMany: async (opts?: {
        orderBy?:
          | Record<string, "asc" | "desc">
          | Array<Record<string, "asc" | "desc">>;
        where?: { leafIndex?: { lt: number } };
        select?: Record<string, true>;
      }) => {
        let arr = leaves.slice();
        if (opts?.where?.leafIndex?.lt !== undefined) {
          arr = arr.filter((l) => l.leafIndex < opts.where!.leafIndex!.lt);
        }
        if (opts?.orderBy) arr = sortBy(arr, opts.orderBy);
        return arr;
      },
      create: async ({
        data,
      }: {
        data: Omit<LeafRow, "id" | "appendedAt">;
      }) => {
        if (leaves.some((l) => l.leafIndex === data.leafIndex)) {
          throw new Error(`Unique leafIndex violation ${data.leafIndex}`);
        }
        if (leaves.some((l) => l.attestationId === data.attestationId)) {
          throw new Error(
            `Unique attestationId violation ${data.attestationId}`,
          );
        }
        const row: LeafRow = { id: nextId(), appendedAt: new Date(), ...data };
        leaves.push(row);
        return row;
      },
      count: async () => leaves.length,
    },
    verityLogSTH: {
      findFirst: async (opts?: { orderBy?: Record<string, "asc" | "desc"> }) =>
        (opts?.orderBy ? sortBy(sths, opts.orderBy)[0] : sths[0]) ?? null,
      findUnique: async ({ where }: { where: { treeSize: number } }) =>
        sths.find((s) => s.treeSize === where.treeSize) ?? null,
      findMany: async (opts?: {
        orderBy?: Record<string, "asc" | "desc">;
        select?: Record<string, true>;
      }) => (opts?.orderBy ? sortBy(sths, opts.orderBy) : sths.slice()),
      create: async ({ data }: { data: Omit<STHRow, "id"> }) => {
        const row: STHRow = { id: nextId(), ...data };
        sths.push(row);
        return row;
      },
    },
    verityAttestation: {
      findMany: async (opts?: {
        where?: {
          organizationId?: string;
          attestationId?: { in: string[] };
          satelliteNorad?: string;
          regulationRef?: string;
        };
        orderBy?: Record<string, "asc" | "desc">;
        take?: number;
      }) => {
        let arr = atts.slice();
        const w = opts?.where;
        if (w?.organizationId)
          arr = arr.filter((a) => a.organizationId === w.organizationId);
        if (w?.attestationId?.in)
          arr = arr.filter((a) =>
            w.attestationId!.in.includes(a.attestationId),
          );
        if (w?.satelliteNorad)
          arr = arr.filter((a) => a.satelliteNorad === w.satelliteNorad);
        if (w?.regulationRef)
          arr = arr.filter((a) => a.regulationRef === w.regulationRef);
        if (opts?.orderBy) arr = sortBy(arr, opts.orderBy);
        if (opts?.take) arr = arr.slice(0, opts.take);
        return arr;
      },
      findUnique: async ({ where }: { where: { attestationId: string } }) =>
        atts.find((a) => a.attestationId === where.attestationId) ?? null,
    },
    verityIssuerKey: {
      findFirst: async (opts?: { where?: { active?: boolean } }) => {
        if (opts?.where?.active !== undefined) {
          return keys.find((k) => k.active === opts.where!.active) ?? null;
        }
        return keys[0] ?? null;
      },
      findMany: async (opts?: { orderBy?: Record<string, "asc" | "desc"> }) =>
        opts?.orderBy ? sortBy(keys, opts.orderBy) : keys.slice(),
    },
    organization: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        orgs.find((o) => o.id === where.id) ?? null,
    },
    $transaction: async <T>(fn: (tx: typeof prisma) => Promise<T>) =>
      fn(prisma),
  };

  return {
    prisma: prisma as unknown as import("@prisma/client").PrismaClient,
    _leaves: leaves,
    _sths: sths,
    _atts: atts,
    _keys: keys,
    _orgs: orgs,
  };
}

function makeAttParams(
  overrides?: Partial<GenerateAttestationParams>,
): GenerateAttestationParams {
  return {
    regulation_ref: "eu_space_act_art_70",
    regulation_name: "fuel reserve",
    threshold_type: "ABOVE",
    threshold_value: 15,
    actual_value: 57.66,
    data_point: "remaining_fuel_pct",
    claim_statement: "fuel above 15%",
    subject: {
      operator_id: "op_primary",
      satellite_norad_id: "58421",
      satellite_name: "CAELEX-SAT-1",
    },
    evidence_source: "sentinel",
    trust_score: 0.98,
    collected_at: "2026-03-15T14:32:07.000Z",
    sentinel_anchor: null,
    cross_verification: null,
    issuer_key_id: "k1",
    issuer_private_key_der: privKeyDer,
    issuer_public_key_hex: pubKeyHex,
    expires_in_days: 90,
    ...overrides,
  };
}

function seedEnv() {
  const env = makePrisma();
  env._keys.push({
    id: "kr_1",
    keyId: "k1",
    publicKeyHex: pubKeyHex,
    encryptedPrivKey,
    algorithm: "Ed25519",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    rotatedAt: null,
  });
  env._orgs.push({ id: "op_primary", name: "Primary Operator" });
  return env;
}

function seedAtt(
  env: ReturnType<typeof makePrisma>,
  opts?: {
    organizationId?: string;
    satelliteNorad?: string;
    regulationRef?: string;
    expiresInDays?: number;
    revoked?: { reason?: string };
    issuedAt?: Date;
  },
) {
  const att = generateAttestation(
    makeAttParams({
      expires_in_days: opts?.expiresInDays ?? 90,
      regulation_ref: opts?.regulationRef ?? "eu_space_act_art_70",
    }),
  );
  const row: AttRow = {
    id: `att_${env._atts.length + 1}`,
    attestationId: att.attestation_id,
    organizationId: opts?.organizationId ?? "op_primary",
    satelliteNorad: opts?.satelliteNorad ?? "58421",
    regulationRef: att.claim.regulation_ref,
    issuedAt: opts?.issuedAt ?? new Date(att.issued_at),
    expiresAt: new Date(att.expires_at),
    revokedAt: opts?.revoked ? new Date() : null,
    revokedReason: opts?.revoked?.reason ?? null,
    fullAttestation: att,
  };
  env._atts.push(row);
  return att;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("bundle-builder — happy path", () => {
  it("emits a bundle whose attestations all re-verify", async () => {
    const env = seedEnv();
    const atts = [seedAtt(env), seedAtt(env), seedAtt(env)];
    for (const a of atts) {
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: {
        type: "ids",
        attestationIds: atts.map((a) => a.attestation_id),
      },
    });

    expect(bundle.bundleVersion).toBe("verity-bundle-v1");
    expect(bundle.operator.id).toBe("op_primary");
    expect(bundle.operator.name).toBe("Primary Operator");
    expect(bundle.entries).toHaveLength(3);
    for (const entry of bundle.entries) {
      const result = verifyAttestation(entry.attestation, pubKeyHex, true);
      expect(result.valid).toBe(true);
      expect(entry.status.state).toBe("valid");
      expect(entry.vc.type).toContain("VerifiableCredential");
      expect(entry.inclusion).not.toBeNull();
      expect(entry.inclusion!.root).toBe(bundle.sth!.rootHash);
    }
  });

  it("STH signature in the bundle verifies against the issuer public key", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });

    expect(bundle.sth).not.toBeNull();
    const dataToSign = sthSigningBytes(
      bundle.sth!.timestamp,
      bundle.sth!.treeSize,
      bundle.sth!.rootHash,
      bundle.sth!.issuerKeyId,
    );
    const pub = createPublicKey({
      key: Buffer.from(pubKeyHex, "hex"),
      format: "der",
      type: "spki",
    });
    const ok = verify(
      null,
      dataToSign,
      pub,
      Buffer.from(bundle.sth!.signature, "hex"),
    );
    expect(ok).toBe(true);
  });
});

describe("bundle-builder — bundleId determinism", () => {
  it("is deterministic when inputs + clock are identical", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const clock = new Date("2026-04-20T12:00:00Z");
    const b1 = await buildBundle(
      {
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a.attestation_id] },
      },
      clock,
    );
    const b2 = await buildBundle(
      {
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a.attestation_id] },
      },
      clock,
    );
    expect(b1.bundleId).toBe(b2.bundleId);
  });

  it("matches sha256(canonicalJson(bundle - bundleId))", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });

    const { bundleId: _id, ...rest } = bundle;
    const expected = bytesToHex(
      sha256(
        new TextEncoder().encode(
          canonicalJsonStringify(rest as unknown as Record<string, unknown>),
        ),
      ),
    );
    expect(bundle.bundleId).toBe(expected);
  });

  it("bundleId changes when any entry content changes", async () => {
    const env1 = seedEnv();
    const a1 = seedAtt(env1);
    await appendToLog(env1.prisma, a1 as unknown as Record<string, unknown>);
    await signNewSTH(env1.prisma);

    const env2 = seedEnv();
    const a2 = seedAtt(env2, { regulationRef: "eu_space_act_art_71" });
    await appendToLog(env2.prisma, a2 as unknown as Record<string, unknown>);
    await signNewSTH(env2.prisma);

    const clock = new Date("2026-04-20T12:00:00Z");
    const b1 = await buildBundle(
      {
        prisma: env1.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a1.attestation_id] },
      },
      clock,
    );
    const b2 = await buildBundle(
      {
        prisma: env2.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a2.attestation_id] },
      },
      clock,
    );
    expect(b1.bundleId).not.toBe(b2.bundleId);
  });
});

describe("bundle-builder — operator scope", () => {
  it("refuses to include attestations owned by a different operator", async () => {
    const env = seedEnv();
    env._orgs.push({ id: "op_other", name: "Other" });
    const mine = seedAtt(env); // op_primary
    const theirs = seedAtt(env, { organizationId: "op_other" });

    await expect(
      buildBundle({
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: {
          type: "ids",
          attestationIds: [mine.attestation_id, theirs.attestation_id],
        },
      }),
    ).rejects.toThrow(/not owned by this operator/);
  });

  it("satellite selector returns only caller's rows", async () => {
    const env = seedEnv();
    env._orgs.push({ id: "op_other", name: "Other" });
    const mine = seedAtt(env);
    seedAtt(env, { organizationId: "op_other", satelliteNorad: "58421" });

    await appendToLog(env.prisma, mine as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "satellite", satelliteNoradId: "58421" },
    });
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0]!.attestation.attestation_id).toBe(
      mine.attestation_id,
    );
  });
});

describe("bundle-builder — size and input validation", () => {
  it("throws on empty attestationIds", async () => {
    const env = seedEnv();
    await expect(
      buildBundle({
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [] },
      }),
    ).rejects.toThrow(/non-empty/);
  });

  it("throws when attestationIds exceeds MAX_BUNDLE_SIZE", async () => {
    const env = seedEnv();
    const ids = Array.from(
      { length: MAX_BUNDLE_SIZE + 1 },
      (_, i) => `va_fake_${i}`,
    );
    await expect(
      buildBundle({
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: ids },
      }),
    ).rejects.toThrow(/too many attestations/);
  });

  it("throws when the selector matches zero attestations", async () => {
    const env = seedEnv();
    await expect(
      buildBundle({
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "regulation", regulationRef: "nonexistent" },
      }),
    ).rejects.toThrow(/no attestations match/);
  });
});

describe("bundle-builder — status resolution", () => {
  it("valid attestations report status=valid with null revocation fields", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.entries[0]!.status.state).toBe("valid");
    expect(bundle.entries[0]!.status.revokedAt).toBeNull();
  });

  it("revoked attestations report status=revoked with reason", async () => {
    const env = seedEnv();
    const a = seedAtt(env, {
      revoked: { reason: "operator withdrawal" },
    });
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.entries[0]!.status.state).toBe("revoked");
    expect(bundle.entries[0]!.status.revocationReason).toBe(
      "operator withdrawal",
    );
  });

  it("expired attestations report status=expired (clock fixed to after expiry)", async () => {
    const env = seedEnv();
    const a = seedAtt(env, { expiresInDays: 1 });
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const future = new Date(Date.now() + 365 * 86400000);
    const bundle = await buildBundle(
      {
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a.attestation_id] },
      },
      future,
    );
    expect(bundle.entries[0]!.status.state).toBe("expired");
  });

  it("revoked wins over expired", async () => {
    const env = seedEnv();
    const a = seedAtt(env, {
      expiresInDays: 1,
      revoked: { reason: "superseded" },
    });
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const future = new Date(Date.now() + 365 * 86400000);
    const bundle = await buildBundle(
      {
        prisma: env.prisma,
        operatorId: "op_primary",
        selector: { type: "ids", attestationIds: [a.attestation_id] },
      },
      future,
    );
    expect(bundle.entries[0]!.status.state).toBe("revoked");
  });
});

describe("bundle-builder — consistency chain", () => {
  it("emits [] when only one STH has been signed", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.consistencyChain).toEqual([]);
  });

  it("emits consecutive proofs that each verify, for multiple STHs", async () => {
    const env = seedEnv();
    // Round 1: 3 attestations, sign STH @ size=3
    const round1 = [seedAtt(env), seedAtt(env), seedAtt(env)];
    for (const a of round1) {
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);
    // Round 2: 2 more, sign STH @ size=5
    const round2 = [seedAtt(env), seedAtt(env)];
    for (const a of round2) {
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);
    // Round 3: 3 more, sign STH @ size=8
    const round3 = [seedAtt(env), seedAtt(env), seedAtt(env)];
    for (const a of round3) {
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [round1[0]!.attestation_id] },
    });
    expect(bundle.consistencyChain).toHaveLength(2);

    // Each link verifies.
    for (const link of bundle.consistencyChain) {
      const ok = verifyConsistencyProof(
        link.proof,
        link.fromSize,
        link.toSize,
        link.fromRoot,
        link.toRoot,
      );
      expect(ok).toBe(true);
    }
    // Chain continuity.
    expect(bundle.consistencyChain[1]!.fromRoot).toBe(
      bundle.consistencyChain[0]!.toRoot,
    );
    // Last link lands on current STH.
    expect(bundle.consistencyChain.at(-1)!.toRoot).toBe(bundle.sth!.rootHash);
  });
});

describe("bundle-builder — issuer keys + DID snapshot", () => {
  it("includes the active issuer key plus any rotated ones", async () => {
    const env = seedEnv();
    env._keys.push({
      id: "kr_2",
      keyId: "k0_retired",
      publicKeyHex: "ab".repeat(32),
      encryptedPrivKey,
      algorithm: "Ed25519",
      active: false,
      createdAt: new Date("2025-12-01T00:00:00Z"),
      rotatedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.issuerKeys).toHaveLength(2);
    expect(bundle.issuerKeys.some((k) => k.active && k.keyId === "k1")).toBe(
      true,
    );
    expect(
      bundle.issuerKeys.some((k) => !k.active && k.rotatedAt !== null),
    ).toBe(true);
  });

  it("includes a DID document that points at the active key", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.didDocument).not.toBeNull();
    expect(bundle.didDocument!.id).toBe("did:web:caelex.eu");
    expect(bundle.didDocument!.verificationMethod[0]!.id).toContain("k1");
  });
});

describe("bundle-builder — readme", () => {
  it("embeds an offline-verification guide referencing all major fields", async () => {
    const env = seedEnv();
    const a = seedAtt(env);
    await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    await signNewSTH(env.prisma);

    const bundle: Bundle = await buildBundle({
      prisma: env.prisma,
      operatorId: "op_primary",
      selector: { type: "ids", attestationIds: [a.attestation_id] },
    });
    expect(bundle.readme).toContain("bundleId");
    expect(bundle.readme).toContain("sth");
    expect(bundle.readme).toContain("consistencyChain");
    expect(bundle.readme).toContain("RFC 6962");
  });
});
