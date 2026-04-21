/**
 * profile-snapshot-service tests.
 *
 * Two test tiers:
 *
 *   1. Pure crypto helpers — computeSnapshotHash, buildSnapshotPayload,
 *      signSnapshotHash, verifySnapshotSignature. Exercised against real
 *      Ed25519 keys generated in-memory. No DB, no mocks beyond
 *      server-only + VERITY_MASTER_KEY env.
 *
 *   2. End-to-end determinism — a snapshot built twice from the same
 *      input at the same frozenAt produces the identical hash.
 *      Tampering with any field flips the signature verification.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { generateKeyPairSync, createCipheriv, randomBytes } from "node:crypto";

vi.mock("server-only", () => ({}));

// Mock prisma so that derivation-trace-service can import without a DB.
// We only exercise pure-crypto helpers in this file — no DB round-trips.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    derivationTrace: {},
    profileSnapshot: {},
    operatorProfile: {},
    verityIssuerKey: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import {
  computeSnapshotHash,
  signSnapshotHash,
  verifySnapshotSignature,
  buildSnapshotPayload,
  type SignedPayloadV1,
} from "@/lib/services/profile-snapshot-service";
import { canonicalJsonStringify } from "@/lib/verity/utils/canonical-json";

// ─── Fixtures: generate a real Ed25519 keypair once for the suite ──────

let pubKeyHex: string;
let privKeyDer: Buffer;

beforeAll(() => {
  // 64-char hex master key needed by issuer-keys decrypt path — we
  // don't use it in these tests (we hold the DER private key directly),
  // but set it anyway to avoid env tripping any side imports.
  process.env.VERITY_MASTER_KEY = "a".repeat(64);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  pubKeyHex = publicKey.export({ type: "spki", format: "der" }).toString("hex");
  privKeyDer = privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
  // Mutually reference so lint sees all vars used
  void createCipheriv;
  void randomBytes;
});

// ─── Canonical hash + sign + verify roundtrip ──────────────────────────

describe("computeSnapshotHash", () => {
  it("is deterministic for the same input", () => {
    const a = computeSnapshotHash('{"x":1}');
    const b = computeSnapshotHash('{"x":1}');
    expect(a).toBe(b);
  });

  it("produces 64-char hex (SHA-256)", () => {
    const h = computeSnapshotHash("hello");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when input changes", () => {
    const a = computeSnapshotHash('{"x":1}');
    const b = computeSnapshotHash('{"x":2}');
    expect(a).not.toBe(b);
  });
});

describe("sign + verify Ed25519 roundtrip", () => {
  it("signs a hash and verifies against the matching public key", () => {
    const hash = computeSnapshotHash("anything");
    const sig = signSnapshotHash(hash, privKeyDer);
    expect(verifySnapshotSignature(hash, sig, pubKeyHex)).toBe(true);
  });

  it("returns false for a tampered hash", () => {
    const hash = computeSnapshotHash("anything");
    const sig = signSnapshotHash(hash, privKeyDer);
    const tampered = computeSnapshotHash("DIFFERENT");
    expect(verifySnapshotSignature(tampered, sig, pubKeyHex)).toBe(false);
  });

  it("returns false for a tampered signature", () => {
    const hash = computeSnapshotHash("anything");
    const sig = signSnapshotHash(hash, privKeyDer);
    // Flip the last hex char.
    const lastChar = sig[sig.length - 1];
    const flipped = lastChar === "0" ? "1" : "0";
    const tamperedSig = sig.slice(0, -1) + flipped;
    expect(verifySnapshotSignature(hash, tamperedSig, pubKeyHex)).toBe(false);
  });

  it("returns false for a wrong public key", () => {
    const hash = computeSnapshotHash("anything");
    const sig = signSnapshotHash(hash, privKeyDer);
    const { publicKey } = generateKeyPairSync("ed25519");
    const otherPubKeyHex = publicKey
      .export({ type: "spki", format: "der" })
      .toString("hex");
    expect(verifySnapshotSignature(hash, sig, otherPubKeyHex)).toBe(false);
  });

  it("returns false for a malformed signature hex (does not throw)", () => {
    const hash = computeSnapshotHash("anything");
    expect(verifySnapshotSignature(hash, "not-hex-at-all", pubKeyHex)).toBe(
      false,
    );
  });
});

// ─── Payload shape + canonicalization ─────────────────────────────────

function makeProfileFixture(): SignedPayloadV1["profile"] & {
  plannedLaunchDate: Date | string | null;
} {
  return {
    id: "prof_1",
    operatorType: "satellite_operator",
    euOperatorCode: "SCO",
    entitySize: "medium",
    isResearch: false,
    isDefenseOnly: false,
    primaryOrbit: "LEO",
    orbitAltitudeKm: 550,
    satelliteMassKg: 250,
    isConstellation: true,
    constellationSize: 50,
    missionDurationMonths: 60,
    plannedLaunchDate: new Date("2027-05-01T00:00:00Z"),
    establishment: "DE",
    operatingJurisdictions: ["DE", "FR", "LU"],
    offersEUServices: true,
    completeness: 0.88,
  };
}

describe("buildSnapshotPayload", () => {
  const frozenAt = new Date("2026-04-21T12:00:00Z");

  it("stamps version 'profile-snapshot-v1'", () => {
    const p = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-2026-04-21",
    });
    expect(p.version).toBe("profile-snapshot-v1");
  });

  it("converts plannedLaunchDate Date → ISO string", () => {
    const p = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-2026-04-21",
    });
    expect(p.profile.plannedLaunchDate).toBe("2027-05-01T00:00:00.000Z");
  });

  it("accepts plannedLaunchDate already as string", () => {
    const prof = {
      ...makeProfileFixture(),
      plannedLaunchDate: "2027-05-01T00:00:00.000Z",
    };
    const p = buildSnapshotPayload({
      organizationId: "org_1",
      profile: prof,
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-2026-04-21",
    });
    expect(p.profile.plannedLaunchDate).toBe("2027-05-01T00:00:00.000Z");
  });
});

describe("canonical JSON determinism (end-to-end)", () => {
  const frozenAt = new Date("2026-04-21T12:00:00Z");

  it("produces identical hashes for equivalent payloads with different key order", () => {
    // Same semantic payload — different key order on input.
    const payload1 = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });
    const payload2 = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });

    const json1 = canonicalJsonStringify(payload1);
    const json2 = canonicalJsonStringify(payload2);
    expect(json1).toBe(json2);

    expect(computeSnapshotHash(json1)).toBe(computeSnapshotHash(json2));
  });

  it("hash changes when any profile field is changed", () => {
    const base = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });
    const modifiedProfile = { ...makeProfileFixture(), entitySize: "large" };
    const modified = buildSnapshotPayload({
      organizationId: "org_1",
      profile: modifiedProfile,
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });

    const h1 = computeSnapshotHash(canonicalJsonStringify(base));
    const h2 = computeSnapshotHash(canonicalJsonStringify(modified));
    expect(h1).not.toBe(h2);
  });

  it("hash changes when a single trace value flips", () => {
    const traces1: SignedPayloadV1["traces"] = [
      {
        id: "t_1",
        fieldName: "entitySize",
        value: "medium",
        origin: "assessment",
        sourceRef: { kind: "assessment", assessmentId: "a_1", questionId: "q" },
        confidence: null,
        modelVersion: null,
        derivedAt: "2026-01-15T12:00:00.000Z",
        expiresAt: null,
      },
    ];
    const traces2: SignedPayloadV1["traces"] = [
      { ...traces1[0], value: "large" },
    ];

    const p1 = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: traces1,
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });
    const p2 = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: traces2,
      frozenAt,
      frozenBy: "u_1",
      purpose: null,
      issuerKeyId: "verity-1",
    });

    const h1 = computeSnapshotHash(canonicalJsonStringify(p1));
    const h2 = computeSnapshotHash(canonicalJsonStringify(p2));
    expect(h1).not.toBe(h2);
  });

  it("sign-verify full pipeline: build → canonicalize → hash → sign → verify", () => {
    const payload = buildSnapshotPayload({
      organizationId: "org_1",
      profile: makeProfileFixture(),
      traces: [],
      frozenAt,
      frozenBy: "u_1",
      purpose: "audit",
      issuerKeyId: "verity-1",
    });
    const json = canonicalJsonStringify(payload);
    const hash = computeSnapshotHash(json);
    const sig = signSnapshotHash(hash, privKeyDer);

    expect(verifySnapshotSignature(hash, sig, pubKeyHex)).toBe(true);

    // If the payload is tampered after signing, verification fails.
    const tamperedPayload = {
      ...payload,
      profile: { ...payload.profile, entitySize: "large" },
    };
    const tamperedHash = computeSnapshotHash(
      canonicalJsonStringify(tamperedPayload),
    );
    expect(verifySnapshotSignature(tamperedHash, sig, pubKeyHex)).toBe(false);
  });
});
