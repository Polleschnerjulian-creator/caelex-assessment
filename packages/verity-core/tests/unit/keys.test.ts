/**
 * Unit tests for the Key Management module — Verity 2036
 */

import { describe, it, expect, beforeEach } from "vitest";
import { KeyManager, InMemoryKeyStore } from "../../src/keys/index.js";
import { getPublicKey, generateKeyPair } from "../../src/signatures/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MASTER_PASSPHRASE =
  "a-very-secure-passphrase-that-is-at-least-32-chars-long!!";
const TENANT_ID = "tenant-001";

function createManager(passphrase?: string) {
  const store = new InMemoryKeyStore();
  return new KeyManager({
    store,
    masterPassphrase: passphrase ?? MASTER_PASSPHRASE,
    defaultExpiryDays: 365,
  });
}

// ---------------------------------------------------------------------------
// createKeyPair
// ---------------------------------------------------------------------------

describe("KeyManager — createKeyPair", () => {
  it("creates a key with ACTIVE status", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key.status).toBe("ACTIVE");
  });

  it("encrypts the private key (not plaintext hex)", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    // The encrypted form is "iv:authTag:ciphertext" — it should contain colons
    expect(key.encryptedPrivateKey).toContain(":");
    // It should NOT be a raw 64-char hex key
    expect(key.encryptedPrivateKey).not.toMatch(/^[0-9a-f]{64}$/);
  });

  it("increments key version", async () => {
    const manager = createManager();
    const key1 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const key2 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key2.keyVersion).toBe(key1.keyVersion + 1);
  });

  it("assigns a unique keyId", async () => {
    const manager = createManager();
    const key1 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const key2 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key1.keyId).not.toBe(key2.keyId);
  });

  it("sets the correct tenant and purpose", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "ATTESTING");
    expect(key.tenantId).toBe(TENANT_ID);
    expect(key.purpose).toBe("ATTESTING");
  });

  it("has valid publicKey in hex format", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key.publicKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sets activatedAt timestamp", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key.activatedAt).toBeTruthy();
    expect(new Date(key.activatedAt).getTime()).not.toBeNaN();
  });

  it("starts with version 1 for first key", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    expect(key.keyVersion).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rotateKey
// ---------------------------------------------------------------------------

describe("KeyManager — rotateKey", () => {
  it("creates new key and marks old as ROTATED", async () => {
    const manager = createManager();
    const oldKey = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const newKey = await manager.rotateKey(TENANT_ID, oldKey.keyId);

    expect(newKey.status).toBe("ACTIVE");

    const resolved = await manager.resolveKey(oldKey.keyId);
    expect(resolved?.status).toBe("ROTATED");
  });

  it("sets rotatedTo on old key", async () => {
    const manager = createManager();
    const oldKey = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const newKey = await manager.rotateKey(TENANT_ID, oldKey.keyId);

    const resolved = await manager.resolveKey(oldKey.keyId);
    expect(resolved?.rotatedTo).toBe(newKey.keyId);
  });

  it("throws for non-existent key", async () => {
    const manager = createManager();
    await expect(
      manager.rotateKey(TENANT_ID, "nonexistent-id"),
    ).rejects.toThrow("not found");
  });

  it("throws for revoked key", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.revokeKey(TENANT_ID, key.keyId, "test", revokerKp.privateKey);
    await expect(manager.rotateKey(TENANT_ID, key.keyId)).rejects.toThrow(
      "revoked",
    );
  });

  it("new key has same purpose as old key", async () => {
    const manager = createManager();
    const oldKey = await manager.createKeyPair(TENANT_ID, "ATTESTING");
    const newKey = await manager.rotateKey(TENANT_ID, oldKey.keyId);
    expect(newKey.purpose).toBe("ATTESTING");
  });

  it("new key has incremented version", async () => {
    const manager = createManager();
    const oldKey = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const newKey = await manager.rotateKey(TENANT_ID, oldKey.keyId);
    expect(newKey.keyVersion).toBe(oldKey.keyVersion + 1);
  });
});

// ---------------------------------------------------------------------------
// revokeKey
// ---------------------------------------------------------------------------

describe("KeyManager — revokeKey", () => {
  it("marks key as REVOKED", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.revokeKey(
      TENANT_ID,
      key.keyId,
      "compromised",
      revokerKp.privateKey,
    );

    const resolved = await manager.resolveKey(key.keyId);
    expect(resolved?.status).toBe("REVOKED");
  });

  it("creates signed revocation record", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const revocation = await manager.revokeKey(
      TENANT_ID,
      key.keyId,
      "compromised",
      revokerKp.privateKey,
    );

    expect(revocation.revocationId).toBeTruthy();
    expect(revocation.keyId).toBe(key.keyId);
    expect(revocation.reason).toBe("compromised");
    expect(revocation.revocationSignature).toMatch(/^[0-9a-f]{128}$/);
  });

  it("throws for already revoked key", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.revokeKey(
      TENANT_ID,
      key.keyId,
      "first",
      revokerKp.privateKey,
    );
    await expect(
      manager.revokeKey(TENANT_ID, key.keyId, "second", revokerKp.privateKey),
    ).rejects.toThrow("already revoked");
  });

  it("records revocation timestamp", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const revocation = await manager.revokeKey(
      TENANT_ID,
      key.keyId,
      "test",
      revokerKp.privateKey,
    );
    expect(revocation.revokedAt).toBeTruthy();
    expect(new Date(revocation.revokedAt).getTime()).not.toBeNaN();
  });

  it("throws for non-existent key", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    await expect(
      manager.revokeKey(TENANT_ID, "nonexistent", "test", revokerKp.privateKey),
    ).rejects.toThrow("not found");
  });
});

// ---------------------------------------------------------------------------
// resolveKey
// ---------------------------------------------------------------------------

describe("KeyManager — resolveKey", () => {
  it("returns key by ID", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const resolved = await manager.resolveKey(key.keyId);
    expect(resolved).not.toBeNull();
    expect(resolved?.keyId).toBe(key.keyId);
  });

  it("returns null for non-existent key", async () => {
    const manager = createManager();
    const resolved = await manager.resolveKey("nonexistent");
    expect(resolved).toBeNull();
  });

  it("with atTime returns null if key was not active at that time", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    // Request a time far in the past, before the key was activated
    const pastTime = new Date("2000-01-01T00:00:00.000Z").toISOString();
    const resolved = await manager.resolveKey(key.keyId, pastTime);
    expect(resolved).toBeNull();
  });

  it("with atTime returns key if it was active at that time", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    // Request a time slightly after now
    const futureTime = new Date(Date.now() + 60_000).toISOString();
    const resolved = await manager.resolveKey(key.keyId, futureTime);
    expect(resolved).not.toBeNull();
    expect(resolved?.keyId).toBe(key.keyId);
  });

  it("returns a copy of the key record (not a reference)", async () => {
    const manager = createManager();
    const key = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const r1 = await manager.resolveKey(key.keyId);
    const r2 = await manager.resolveKey(key.keyId);
    expect(r1).toEqual(r2);
    expect(r1).not.toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// listActiveKeys
// ---------------------------------------------------------------------------

describe("KeyManager — listActiveKeys", () => {
  it("returns only ACTIVE keys", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const key1 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const key2 = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.revokeKey(
      TENANT_ID,
      key1.keyId,
      "test",
      revokerKp.privateKey,
    );

    const active = await manager.listActiveKeys(TENANT_ID);
    expect(active.length).toBe(1);
    expect(active[0]!.keyId).toBe(key2.keyId);
  });

  it("returns empty array for tenant with no keys", async () => {
    const manager = createManager();
    const active = await manager.listActiveKeys("no-such-tenant");
    expect(active).toEqual([]);
  });

  it("does not include rotated keys", async () => {
    const manager = createManager();
    const oldKey = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.rotateKey(TENANT_ID, oldKey.keyId);

    const active = await manager.listActiveKeys(TENANT_ID);
    const ids = active.map((k) => k.keyId);
    expect(ids).not.toContain(oldKey.keyId);
  });

  it("returns all active keys for a tenant with multiple active keys", async () => {
    const manager = createManager();
    await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.createKeyPair(TENANT_ID, "ATTESTING");
    await manager.createKeyPair(TENANT_ID, "PLATFORM_ROOT");

    const active = await manager.listActiveKeys(TENANT_ID);
    expect(active.length).toBe(3);
  });

  it("does not return keys from different tenants", async () => {
    const manager = createManager();
    await manager.createKeyPair("tenant-a", "SIGNING");
    await manager.createKeyPair("tenant-b", "SIGNING");

    const active = await manager.listActiveKeys("tenant-a");
    expect(active.length).toBe(1);
    expect(active[0]!.tenantId).toBe("tenant-a");
  });
});

// ---------------------------------------------------------------------------
// decryptPrivateKey
// ---------------------------------------------------------------------------

describe("KeyManager — decryptPrivateKey", () => {
  it("returns valid private key that derives correct public key", async () => {
    const manager = createManager();
    const keyRecord = await manager.createKeyPair(TENANT_ID, "SIGNING");

    const decryptedHex = await manager.decryptPrivateKey(keyRecord);
    expect(decryptedHex).toMatch(/^[0-9a-f]{64}$/);

    const derivedPublic = getPublicKey(decryptedHex);
    expect(derivedPublic).toBe(keyRecord.publicKey);
  });

  it("throws for revoked key", async () => {
    const manager = createManager();
    const revokerKp = generateKeyPair();
    const keyRecord = await manager.createKeyPair(TENANT_ID, "SIGNING");
    await manager.revokeKey(
      TENANT_ID,
      keyRecord.keyId,
      "test",
      revokerKp.privateKey,
    );

    // Fetch the updated record
    const revokedRecord = await manager.resolveKey(keyRecord.keyId);
    await expect(manager.decryptPrivateKey(revokedRecord!)).rejects.toThrow(
      "revoked",
    );
  });

  it("returns consistent result when called multiple times", async () => {
    const manager = createManager();
    const keyRecord = await manager.createKeyPair(TENANT_ID, "SIGNING");

    const d1 = await manager.decryptPrivateKey(keyRecord);
    const d2 = await manager.decryptPrivateKey(keyRecord);
    expect(d1).toBe(d2);
  });

  it("returns 64-char hex string", async () => {
    const manager = createManager();
    const keyRecord = await manager.createKeyPair(TENANT_ID, "SIGNING");
    const decryptedHex = await manager.decryptPrivateKey(keyRecord);
    expect(decryptedHex.length).toBe(64);
  });

  it("works for ATTESTING purpose key", async () => {
    const manager = createManager();
    const keyRecord = await manager.createKeyPair(TENANT_ID, "ATTESTING");
    const decryptedHex = await manager.decryptPrivateKey(keyRecord);
    const derivedPublic = getPublicKey(decryptedHex);
    expect(derivedPublic).toBe(keyRecord.publicKey);
  });
});

// ---------------------------------------------------------------------------
// Master passphrase validation
// ---------------------------------------------------------------------------

describe("KeyManager — passphrase validation", () => {
  it("passphrase shorter than 32 chars throws", () => {
    expect(
      () =>
        new KeyManager({
          store: new InMemoryKeyStore(),
          masterPassphrase: "short",
          defaultExpiryDays: 365,
        }),
    ).toThrow("32 characters");
  });

  it("passphrase of exactly 32 chars is accepted", () => {
    expect(
      () =>
        new KeyManager({
          store: new InMemoryKeyStore(),
          masterPassphrase: "a".repeat(32),
          defaultExpiryDays: 365,
        }),
    ).not.toThrow();
  });

  it("empty passphrase throws", () => {
    expect(
      () =>
        new KeyManager({
          store: new InMemoryKeyStore(),
          masterPassphrase: "",
          defaultExpiryDays: 365,
        }),
    ).toThrow();
  });

  it("passphrase of 31 chars throws", () => {
    expect(
      () =>
        new KeyManager({
          store: new InMemoryKeyStore(),
          masterPassphrase: "a".repeat(31),
          defaultExpiryDays: 365,
        }),
    ).toThrow("32 characters");
  });

  it("long passphrase is accepted", () => {
    expect(
      () =>
        new KeyManager({
          store: new InMemoryKeyStore(),
          masterPassphrase: "a".repeat(256),
          defaultExpiryDays: 365,
        }),
    ).not.toThrow();
  });
});
