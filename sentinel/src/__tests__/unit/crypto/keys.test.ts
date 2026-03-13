import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync, createHash } from "node:crypto";

const testDir = join(tmpdir(), `sentinel-test-keys-${Date.now()}`);

describe("Key Management", () => {
  beforeEach(() => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("generates Ed25519 key pair", async () => {
    const { loadOrGenerateKeys } = await import("../../../crypto/keys.js");
    const keys = loadOrGenerateKeys();

    expect(keys.publicKeyPem).toContain("BEGIN PUBLIC KEY");
    expect(keys.publicKeyPem).toContain("END PUBLIC KEY");
    expect(keys.publicKey.asymmetricKeyType).toBe("ed25519");
    expect(keys.privateKey.asymmetricKeyType).toBe("ed25519");
  });

  it("saves keys to disk and loads them", async () => {
    const { loadOrGenerateKeys } = await import("../../../crypto/keys.js");
    const keys1 = loadOrGenerateKeys();

    // Keys should be persisted
    const keysDir = join(testDir, "keys");
    expect(existsSync(join(keysDir, "sentinel_ed25519.pub"))).toBe(true);
    expect(existsSync(join(keysDir, "sentinel_ed25519.key"))).toBe(true);

    // Load again — should get same keys
    const keys2 = loadOrGenerateKeys();
    expect(keys2.publicKeyPem).toBe(keys1.publicKeyPem);
  });

  it("sentinel ID is deterministic for same public key", async () => {
    const { deriveSentinelId } = await import("../../../crypto/keys.js");
    const { publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const id1 = deriveSentinelId(pem);
    const id2 = deriveSentinelId(pem);
    expect(id1).toBe(id2);
  });

  it("sentinel ID format is snt_{16 hex chars}", async () => {
    const { deriveSentinelId } = await import("../../../crypto/keys.js");
    const { publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const id = deriveSentinelId(pem);
    expect(id).toMatch(/^snt_[a-f0-9]{16}$/);
  });

  it("different keys produce different sentinel IDs", async () => {
    const { deriveSentinelId } = await import("../../../crypto/keys.js");
    const keys1 = generateKeyPairSync("ed25519");
    const keys2 = generateKeyPairSync("ed25519");
    const pem1 = keys1.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const pem2 = keys2.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    const id1 = deriveSentinelId(pem1);
    const id2 = deriveSentinelId(pem2);
    expect(id1).not.toBe(id2);
  });

  it("sentinel ID derivation matches manual computation", async () => {
    const { deriveSentinelId } = await import("../../../crypto/keys.js");
    const { publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const expectedHash = createHash("sha256")
      .update(pem)
      .digest("hex")
      .slice(0, 16);
    const expectedId = `snt_${expectedHash}`;

    expect(deriveSentinelId(pem)).toBe(expectedId);
  });
});
