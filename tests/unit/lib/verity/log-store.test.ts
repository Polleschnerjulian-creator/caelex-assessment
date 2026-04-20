// tests/unit/lib/verity/log-store.test.ts

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// log-store.ts has `import "server-only"` — stub it out for unit tests.
vi.mock("server-only", () => ({}));
import {
  generateKeyPairSync,
  createPublicKey,
  verify,
  createCipheriv,
  randomBytes,
} from "node:crypto";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  appendToLog,
  backfillMissingLeaves,
  signNewSTH,
  getInclusionForAttestation,
  getConsistencyFromStore,
  attestationLeafBytes,
  attestationLeafHashHex,
} from "@/lib/verity/transparency/log-store";
import {
  hashLeaf,
  verifyInclusionProof,
  verifyConsistencyProof,
  sthSigningBytes,
} from "@/lib/verity/transparency/merkle-tree";
import { generateAttestation } from "@/lib/verity/core/attestation";
import type { GenerateAttestationParams } from "@/lib/verity/core/types";

// Real Ed25519 key pair once per suite.
let pubKeyHex: string;
let privKeyDer: Buffer;
let encryptedPrivKey: string;

// Inline mirror of the encryption used by generateIssuerKeyPair.
// (issuer-keys.ts only exports decryptPrivateKey, so we encrypt here.)
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
  // Seed VERITY_MASTER_KEY so decryptPrivateKey works inside signNewSTH.
  process.env.VERITY_MASTER_KEY = "00".repeat(32);
  encryptedPrivKey = encryptPrivateKeyForTest(
    privKeyDer,
    process.env.VERITY_MASTER_KEY!,
  );
});

// ─── In-memory Prisma stub ──────────────────────────────────────────
//
// Minimal shape that log-store.ts needs. NOT a general Prisma mock —
// just enough surface for these tests.

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
  attestationId: string;
  issuedAt: Date;
  fullAttestation: unknown;
};
type KeyRow = {
  id: string;
  keyId: string;
  publicKeyHex: string;
  encryptedPrivKey: string;
  active: boolean;
};

function makePrisma() {
  const leaves: LeafRow[] = [];
  const sths: STHRow[] = [];
  const atts: AttRow[] = [];
  const keys: KeyRow[] = [];

  const findFirst = <T>(
    rows: T[],
    opts?: { orderBy?: Record<string, "asc" | "desc">; where?: Partial<T> },
  ): T | null => {
    let arr = rows.slice();
    if (opts?.where) {
      arr = arr.filter((r) =>
        Object.entries(opts.where!).every(
          ([k, v]) => (r as Record<string, unknown>)[k] === v,
        ),
      );
    }
    if (opts?.orderBy) {
      const [k, dir] = Object.entries(opts.orderBy)[0]!;
      arr.sort((a, b) => {
        const av = (a as Record<string, unknown>)[k] as number;
        const bv = (b as Record<string, unknown>)[k] as number;
        return dir === "asc" ? av - bv : bv - av;
      });
    }
    return arr[0] ?? null;
  };

  let idCounter = 0;
  const nextId = () => `id_${++idCounter}`;

  const prisma = {
    verityLogLeaf: {
      findUnique: async ({ where }: { where: { attestationId: string } }) =>
        leaves.find((l) => l.attestationId === where.attestationId) ?? null,
      findFirst: async (opts?: { orderBy?: Record<string, "asc" | "desc"> }) =>
        findFirst(leaves, opts),
      findMany: async (opts?: {
        orderBy?:
          | Record<string, "asc" | "desc">
          | [Record<string, "asc" | "desc">];
        where?: { leafIndex?: { lt: number } };
        select?: Record<string, true>;
      }) => {
        let arr = leaves.slice();
        if (opts?.where?.leafIndex?.lt !== undefined) {
          const bound = opts.where.leafIndex.lt;
          arr = arr.filter((l) => l.leafIndex < bound);
        }
        const ob = Array.isArray(opts?.orderBy)
          ? opts!.orderBy[0]
          : opts?.orderBy;
        if (ob) {
          const [k, dir] = Object.entries(ob)[0]!;
          arr.sort((a, b) => {
            const av = (a as Record<string, unknown>)[k] as number;
            const bv = (b as Record<string, unknown>)[k] as number;
            return dir === "asc" ? av - bv : bv - av;
          });
        }
        return arr;
      },
      create: async ({
        data,
      }: {
        data: Omit<LeafRow, "id" | "appendedAt">;
      }) => {
        if (leaves.some((l) => l.leafIndex === data.leafIndex)) {
          throw new Error(
            `Unique constraint violation on leafIndex=${data.leafIndex}`,
          );
        }
        if (leaves.some((l) => l.attestationId === data.attestationId)) {
          throw new Error(
            `Unique constraint violation on attestationId=${data.attestationId}`,
          );
        }
        const row: LeafRow = {
          id: nextId(),
          appendedAt: new Date(),
          ...data,
        };
        leaves.push(row);
        return row;
      },
      count: async () => leaves.length,
    },
    verityLogSTH: {
      findFirst: async (opts?: { orderBy?: Record<string, "asc" | "desc"> }) =>
        findFirst(sths, opts),
      findUnique: async ({ where }: { where: { treeSize: number } }) =>
        sths.find((s) => s.treeSize === where.treeSize) ?? null,
      create: async ({ data }: { data: Omit<STHRow, "id"> }) => {
        const row: STHRow = { id: nextId(), ...data };
        sths.push(row);
        return row;
      },
    },
    verityAttestation: {
      findMany: async () =>
        atts.slice().sort((a, b) => {
          if (a.issuedAt.getTime() !== b.issuedAt.getTime()) {
            return a.issuedAt.getTime() - b.issuedAt.getTime();
          }
          return a.attestationId.localeCompare(b.attestationId);
        }),
    },
    verityIssuerKey: {
      findFirst: async (opts?: { where?: { active?: boolean } }) => {
        if (opts?.where?.active !== undefined) {
          return keys.find((k) => k.active === opts.where!.active) ?? null;
        }
        return keys[0] ?? null;
      },
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
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

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
      operator_id: "op_1",
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

function seedAttestationRow(
  env: ReturnType<typeof makePrisma>,
  params?: Partial<GenerateAttestationParams>,
  issuedAt = new Date(),
) {
  const att = generateAttestation(makeAttParams(params));
  env._atts.push({
    attestationId: att.attestation_id,
    issuedAt,
    fullAttestation: att,
  });
  return att;
}

function seedActiveKey(env: ReturnType<typeof makePrisma>) {
  env._keys.push({
    id: "kr_1",
    keyId: "k1",
    publicKeyHex: pubKeyHex,
    encryptedPrivKey,
    active: true,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("log-store — attestationLeafBytes / attestationLeafHashHex", () => {
  it("produces deterministic bytes for the same attestation", () => {
    const att = generateAttestation(makeAttParams());
    const a = attestationLeafBytes(att as unknown as Record<string, unknown>);
    const b = attestationLeafBytes(att as unknown as Record<string, unknown>);
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });

  it("leaf hash matches hashLeaf(leaf bytes)", () => {
    const att = generateAttestation(makeAttParams());
    const bytes = attestationLeafBytes(
      att as unknown as Record<string, unknown>,
    );
    const direct = bytesToHex(hashLeaf(bytes));
    expect(
      attestationLeafHashHex(att as unknown as Record<string, unknown>),
    ).toBe(direct);
  });

  it("differs when signature is tampered", () => {
    const att = generateAttestation(makeAttParams());
    const h1 = attestationLeafHashHex(
      att as unknown as Record<string, unknown>,
    );
    const tampered = { ...att, signature: "00".repeat(64) };
    const h2 = attestationLeafHashHex(
      tampered as unknown as Record<string, unknown>,
    );
    expect(h1).not.toBe(h2);
  });

  it("throws when signature is missing", () => {
    const att = generateAttestation(makeAttParams());
    const broken = { ...att, signature: undefined };
    expect(() =>
      attestationLeafBytes(broken as unknown as Record<string, unknown>),
    ).toThrow();
  });
});

describe("log-store — appendToLog", () => {
  let env: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    env = makePrisma();
  });

  it("appends a new leaf at index 0 and returns the index", async () => {
    const att = generateAttestation(makeAttParams());
    const idx = await appendToLog(
      env.prisma,
      att as unknown as Record<string, unknown>,
    );
    expect(idx).toBe(0);
    expect(env._leaves).toHaveLength(1);
    expect(env._leaves[0]!.attestationId).toBe(att.attestation_id);
  });

  it("monotonically increments leafIndex across calls", async () => {
    const a = generateAttestation(makeAttParams());
    const b = generateAttestation(makeAttParams());
    const idx1 = await appendToLog(
      env.prisma,
      a as unknown as Record<string, unknown>,
    );
    const idx2 = await appendToLog(
      env.prisma,
      b as unknown as Record<string, unknown>,
    );
    expect(idx1).toBe(0);
    expect(idx2).toBe(1);
  });

  it("is idempotent for the same attestationId", async () => {
    const a = generateAttestation(makeAttParams());
    const idx1 = await appendToLog(
      env.prisma,
      a as unknown as Record<string, unknown>,
    );
    const idx2 = await appendToLog(
      env.prisma,
      a as unknown as Record<string, unknown>,
    );
    expect(idx1).toBe(idx2);
    expect(env._leaves).toHaveLength(1);
  });

  it("throws when attestation_id is missing", async () => {
    const broken = { claim: {}, issued_at: "2026-01-01T00:00:00Z" };
    await expect(
      appendToLog(env.prisma, broken as Record<string, unknown>),
    ).rejects.toThrow(/attestation_id/);
  });
});

describe("log-store — backfillMissingLeaves", () => {
  let env: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    env = makePrisma();
  });

  it("adds one leaf per pre-existing attestation, in issuedAt order", async () => {
    // Seed 3 attestations out of chronological order.
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-02T00:00:00Z");
    const t2 = new Date("2026-01-03T00:00:00Z");
    seedAttestationRow(env, undefined, t2);
    seedAttestationRow(env, undefined, t0);
    seedAttestationRow(env, undefined, t1);

    const res = await backfillMissingLeaves(env.prisma);
    expect(res.added).toBe(3);
    expect(res.total).toBe(3);
    expect(env._leaves).toHaveLength(3);
    // Deterministic order: by issuedAt ASC
    expect(env._leaves[0]!.attestationId).toBe(env._atts[1]!.attestationId); // t0
    expect(env._leaves[1]!.attestationId).toBe(env._atts[2]!.attestationId); // t1
    expect(env._leaves[2]!.attestationId).toBe(env._atts[0]!.attestationId); // t2
  });

  it("is idempotent — running twice adds zero on the second run", async () => {
    seedAttestationRow(env);
    seedAttestationRow(env);
    await backfillMissingLeaves(env.prisma);
    const res = await backfillMissingLeaves(env.prisma);
    expect(res.added).toBe(0);
    expect(res.total).toBe(2);
  });
});

describe("log-store — signNewSTH", () => {
  let env: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    env = makePrisma();
    seedActiveKey(env);
  });

  it("returns null when there are no attestations", async () => {
    const res = await signNewSTH(env.prisma);
    expect(res).toBeNull();
    expect(env._sths).toHaveLength(0);
  });

  it("signs an STH whose signature verifies with the issuer public key", async () => {
    seedAttestationRow(env);
    seedAttestationRow(env);
    const sth = await signNewSTH(env.prisma);
    expect(sth).not.toBeNull();
    expect(sth!.treeSize).toBe(2);

    // Reproduce the signing bytes + verify Ed25519
    const bytes = sthSigningBytes(
      sth!.timestamp,
      sth!.treeSize,
      sth!.rootHash,
      sth!.issuerKeyId,
    );
    const pub = createPublicKey({
      key: Buffer.from(pubKeyHex, "hex"),
      format: "der",
      type: "spki",
    });
    const ok = verify(null, bytes, pub, Buffer.from(sth!.signature, "hex"));
    expect(ok).toBe(true);
  });

  it("returns null when treeSize has not advanced since the last STH", async () => {
    seedAttestationRow(env);
    const first = await signNewSTH(env.prisma);
    expect(first).not.toBeNull();
    const second = await signNewSTH(env.prisma);
    expect(second).toBeNull();
    expect(env._sths).toHaveLength(1);
  });

  it("returns null when no active issuer key exists", async () => {
    env._keys.length = 0;
    seedAttestationRow(env);
    const sth = await signNewSTH(env.prisma);
    expect(sth).toBeNull();
    expect(env._sths).toHaveLength(0);
  });

  it("stores the same rootHash that getInclusionForAttestation re-derives", async () => {
    const att = seedAttestationRow(env);
    const sth = await signNewSTH(env.prisma);
    const incl = await getInclusionForAttestation(
      env.prisma,
      att.attestation_id,
    );
    expect(incl).not.toBeNull();
    expect(incl!.proof.root).toBe(sth!.rootHash);
  });
});

describe("log-store — getInclusionForAttestation", () => {
  let env: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    env = makePrisma();
    seedActiveKey(env);
  });

  it("returns null for unknown attestation", async () => {
    await signNewSTH(env.prisma);
    const res = await getInclusionForAttestation(env.prisma, "va_unknown");
    expect(res).toBeNull();
  });

  it("returns null when no STH has been signed", async () => {
    const att = seedAttestationRow(env);
    await appendToLog(env.prisma, att as unknown as Record<string, unknown>);
    const res = await getInclusionForAttestation(
      env.prisma,
      att.attestation_id,
    );
    expect(res).toBeNull();
  });

  it("produces an inclusion proof that verifies against the STH root", async () => {
    // Seed 5 attestations for a non-trivial tree.
    const atts = Array.from({ length: 5 }, () => seedAttestationRow(env));
    const sth = await signNewSTH(env.prisma);
    expect(sth).not.toBeNull();

    for (const a of atts) {
      const res = await getInclusionForAttestation(
        env.prisma,
        a.attestation_id,
      );
      expect(res).not.toBeNull();
      // Reconstruct the leaf bytes and verify against the root
      const leafBytes = attestationLeafBytes(
        a as unknown as Record<string, unknown>,
      );
      const ok = verifyInclusionProof(leafBytes, res!.proof, sth!.rootHash);
      expect(ok).toBe(true);
      expect(res!.sth.rootHash).toBe(sth!.rootHash);
    }
  });

  it("returns null for leaves appended AFTER the latest STH (not yet covered)", async () => {
    const a = seedAttestationRow(env);
    await signNewSTH(env.prisma); // covers a only
    const b = seedAttestationRow(env);
    await appendToLog(env.prisma, b as unknown as Record<string, unknown>);
    // b is in the log but NOT covered by any STH
    const res = await getInclusionForAttestation(env.prisma, b.attestation_id);
    expect(res).toBeNull();
    // a is still verifiable
    const okA = await getInclusionForAttestation(env.prisma, a.attestation_id);
    expect(okA).not.toBeNull();
  });
});

describe("log-store — tamper evidence", () => {
  it("tampering with any signed field of the attestation changes the leaf hash", () => {
    const att = generateAttestation(makeAttParams());
    const before = attestationLeafHashHex(
      att as unknown as Record<string, unknown>,
    );
    const tampered = {
      ...att,
      claim: { ...att.claim, result: !att.claim.result },
    };
    const after = attestationLeafHashHex(
      tampered as unknown as Record<string, unknown>,
    );
    expect(before).not.toBe(after);
  });

  it("RFC 6962 domain separation: leaf and inner hashes are distinct spaces", () => {
    // Reuse the verification that a direct sha256 over leaf bytes does NOT
    // equal hashLeaf (which prefixes 0x00). This protects against
    // leaf/inner confusion attacks.
    const att = generateAttestation(makeAttParams());
    const bytes = attestationLeafBytes(
      att as unknown as Record<string, unknown>,
    );
    const direct = bytesToHex(sha256(bytes));
    const domain = bytesToHex(hashLeaf(bytes));
    expect(direct).not.toBe(domain);
    // sanity: domain uses 0x00 prefix
    const withPrefix = new Uint8Array(1 + bytes.length);
    withPrefix[0] = 0x00;
    withPrefix.set(bytes, 1);
    expect(bytesToHex(sha256(withPrefix))).toBe(domain);
  });
});

// Convert to unused import tolerance for hexToBytes (used transitively)
void hexToBytes;

describe("log-store — getConsistencyFromStore", () => {
  let env: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    env = makePrisma();
    seedActiveKey(env);
  });

  it("returns null when the oldSize STH does not exist", async () => {
    for (let i = 0; i < 3; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma); // STH at treeSize=3 only
    const res = await getConsistencyFromStore(env.prisma, 2, 3);
    expect(res).toBeNull();
  });

  it("returns null when the newSize STH does not exist", async () => {
    for (let i = 0; i < 3; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma); // STH at treeSize=3
    for (let i = 0; i < 2; i++) seedAttestationRow(env);
    // NOT signing a new STH — treeSize=5 has no STH row
    await appendToLog(
      env.prisma,
      env._atts[3]!.fullAttestation as Record<string, unknown>,
    );
    await appendToLog(
      env.prisma,
      env._atts[4]!.fullAttestation as Record<string, unknown>,
    );
    const res = await getConsistencyFromStore(env.prisma, 3, 5);
    expect(res).toBeNull();
  });

  it("returns null when oldSize > newSize", async () => {
    for (let i = 0; i < 3; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma);
    const res = await getConsistencyFromStore(env.prisma, 5, 3);
    expect(res).toBeNull();
  });

  it("produces a proof that verifies end-to-end", async () => {
    // Seed 5 attestations and sign STH #1.
    for (let i = 0; i < 5; i++) seedAttestationRow(env);
    const oldSTH = await signNewSTH(env.prisma);
    expect(oldSTH!.treeSize).toBe(5);

    // Append 3 more attestations, append each to the log, sign STH #2.
    for (let i = 0; i < 3; i++) {
      const a = seedAttestationRow(env);
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    const newSTH = await signNewSTH(env.prisma);
    expect(newSTH!.treeSize).toBe(8);

    const bundle = await getConsistencyFromStore(env.prisma, 5, 8);
    expect(bundle).not.toBeNull();
    expect(bundle!.oldRoot).toBe(oldSTH!.rootHash);
    expect(bundle!.newRoot).toBe(newSTH!.rootHash);

    const ok = verifyConsistencyProof(
      bundle!.proof,
      bundle!.oldSize,
      bundle!.newSize,
      bundle!.oldRoot,
      bundle!.newRoot,
    );
    expect(ok).toBe(true);
  });

  it("the returned bundle contains both signed tree heads for offline verification", async () => {
    for (let i = 0; i < 4; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma);
    for (let i = 0; i < 2; i++) {
      const a = seedAttestationRow(env);
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);

    const bundle = await getConsistencyFromStore(env.prisma, 4, 6);
    expect(bundle!.oldSTH.signature).toMatch(/^[a-f0-9]+$/);
    expect(bundle!.newSTH.signature).toMatch(/^[a-f0-9]+$/);
    expect(bundle!.oldSTH.treeSize).toBe(4);
    expect(bundle!.newSTH.treeSize).toBe(6);
  });

  it("oldSize == 0 returns an empty proof that verifies against any new STH", async () => {
    for (let i = 0; i < 3; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma);
    // Seed a fake STH row at treeSize=0 so the lookup succeeds.
    // (In reality, treeSize=0 is never signed — this test probes the
    // verifier logic, not realistic cron output.)
    env._sths.push({
      id: "fake-zero-sth",
      treeSize: 0,
      rootHash: "00".repeat(32),
      issuerKeyId: "k1",
      signature: "00".repeat(64),
      timestamp: new Date(),
      version: "v1",
    });
    const bundle = await getConsistencyFromStore(env.prisma, 0, 3);
    expect(bundle!.proof).toEqual([]);
    const ok = verifyConsistencyProof(
      bundle!.proof,
      0,
      3,
      bundle!.oldRoot,
      bundle!.newRoot,
    );
    expect(ok).toBe(true);
  });

  it("detects internal log inconsistency (stored oldSTH root doesn't match recomputation)", async () => {
    for (let i = 0; i < 4; i++) seedAttestationRow(env);
    await signNewSTH(env.prisma);
    for (let i = 0; i < 2; i++) {
      const a = seedAttestationRow(env);
      await appendToLog(env.prisma, a as unknown as Record<string, unknown>);
    }
    await signNewSTH(env.prisma);

    // Corrupt the oldSTH row — simulating DB tampering.
    const corrupted = env._sths.find((s) => s.treeSize === 4)!;
    corrupted.rootHash = "ff".repeat(32);

    const bundle = await getConsistencyFromStore(env.prisma, 4, 6);
    expect(bundle).toBeNull();
  });
});
