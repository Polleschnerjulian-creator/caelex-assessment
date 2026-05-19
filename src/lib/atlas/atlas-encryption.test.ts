/**
 * Tests for src/lib/atlas/atlas-encryption.ts (audit finding SEC-T0-1).
 *
 * Verifies:
 *   1. String round-trip (encrypt → decrypt = original)
 *   2. null / undefined / empty fidelity (no surprising NULLs)
 *   3. Per-organization isolation (orgA's ciphertext fails to decrypt
 *      with orgB's key — actually returns wrong plaintext OR throws,
 *      depending on what the underlying lib does)
 *   4. Dual-read transition: plaintext input passes through unchanged
 *   5. JSONB content-block walking (only text blocks encrypted)
 *   6. Tool-result nested content (string + array variants)
 *   7. Backfill idempotency
 *   8. isAtlasFieldEncrypted detection
 */

import { describe, it, expect, vi } from "vitest";

/* Monkey-patch Node's crypto.scrypt to use fast OWASP-overridable
   params (N=1024 instead of 32768) so tests don't pay ~200ms per
   scrypt call. Same pattern as tests/unit/lib/encryption.test.ts —
   vi.hoisted runs before the encryption module imports + caches its
   derived key. */
vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const originalScrypt = crypto.scrypt;
  crypto.scrypt = function patchedScrypt(
    password: unknown,
    salt: unknown,
    keylen: number,
    ...rest: unknown[]
  ) {
    if (rest.length === 1 && typeof rest[0] === "function") {
      return originalScrypt.call(crypto, password, salt, keylen, rest[0]);
    }
    const [options, cb] = rest as [Record<string, unknown>, unknown];
    const patchedOptions = {
      ...options,
      N: 1024,
      r: 1,
      p: 1,
      maxmem: 128 * 1024 * 1024,
    };
    return originalScrypt.call(
      crypto,
      password,
      salt,
      keylen,
      patchedOptions,
      cb,
    );
  };
});

const TEST_KEY =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const TEST_SALT = "0123456789abcdef0123456789abcdef";
process.env.ENCRYPTION_KEY = TEST_KEY;
process.env.ENCRYPTION_SALT = TEST_SALT;

const ORG_A = "org_clcaaaaaaaa00000000000001";
const ORG_B = "org_clcbbbbbbbb00000000000002";

import {
  encryptAtlasField,
  decryptAtlasField,
  encryptAtlasMessageContent,
  decryptAtlasMessageContent,
  migrateAtlasField,
  migrateAtlasMessageContent,
  isAtlasFieldEncrypted,
} from "./atlas-encryption";

describe("encryptAtlasField / decryptAtlasField", () => {
  it("round-trips a normal string", async () => {
    const plaintext = "Mandant: SpaceCo GmbH, Az: KM/2026/123";
    const ciphertext = await encryptAtlasField(plaintext, ORG_A);
    expect(ciphertext).not.toBe(plaintext);
    expect(typeof ciphertext).toBe("string");
    const recovered = await decryptAtlasField(ciphertext as string);
    expect(recovered).toBe(plaintext);
  });

  it("round-trips German unicode (Umlaute, ß)", async () => {
    const plaintext = "Rückgängig: Verstößt gegen § 433 BGB — Übergabe";
    const ciphertext = await encryptAtlasField(plaintext, ORG_A);
    const recovered = await decryptAtlasField(ciphertext as string);
    expect(recovered).toBe(plaintext);
  });

  it("round-trips a long string (10KB)", async () => {
    const plaintext = "a".repeat(10_000);
    const ciphertext = await encryptAtlasField(plaintext, ORG_A);
    const recovered = await decryptAtlasField(ciphertext as string);
    expect(recovered).toBe(plaintext);
    expect((recovered as string).length).toBe(10_000);
  });

  it("preserves null", async () => {
    expect(await encryptAtlasField(null, ORG_A)).toBeNull();
    expect(await decryptAtlasField(null)).toBeNull();
  });

  it("preserves undefined", async () => {
    expect(await encryptAtlasField(undefined, ORG_A)).toBeUndefined();
    expect(await decryptAtlasField(undefined)).toBeUndefined();
  });

  it("preserves empty string (does NOT encrypt to non-empty)", async () => {
    expect(await encryptAtlasField("", ORG_A)).toBe("");
    expect(await decryptAtlasField("")).toBe("");
  });

  it("dual-read: plaintext input passes through decryptAtlasField unchanged", async () => {
    const plaintext = "this is a legacy plaintext row from before backfill";
    const result = await decryptAtlasField(plaintext);
    expect(result).toBe(plaintext);
  });

  it("isolates ciphertext across organizations", async () => {
    const plaintext = "Mandant-vertraulich: Strategie für 2026";
    const ciphertextA = await encryptAtlasField(plaintext, ORG_A);
    /* Decrypting orgA's ciphertext should fail when the key is wrong.
       The underlying lib uses the orgId baked into the ciphertext for
       key-lookup, so a corrupted org-prefix should throw. */
    const tampered = (ciphertextA as string).replace(ORG_A, ORG_B);
    await expect(decryptAtlasField(tampered)).rejects.toThrow();
  });

  it("produces distinct ciphertext for same plaintext (random IV)", async () => {
    const plaintext = "deterministic-input";
    const c1 = await encryptAtlasField(plaintext, ORG_A);
    const c2 = await encryptAtlasField(plaintext, ORG_A);
    expect(c1).not.toBe(c2); // IV randomization makes each call unique
    // But both decrypt to same plaintext
    expect(await decryptAtlasField(c1 as string)).toBe(plaintext);
    expect(await decryptAtlasField(c2 as string)).toBe(plaintext);
  });
});

describe("isAtlasFieldEncrypted", () => {
  it("returns false for plaintext", () => {
    expect(isAtlasFieldEncrypted("hello world")).toBe(false);
    expect(isAtlasFieldEncrypted("a:b:c")).toBe(false); // structural noise
  });

  it("returns true for org-encrypted format", async () => {
    const c = await encryptAtlasField("foo", ORG_A);
    expect(isAtlasFieldEncrypted(c)).toBe(true);
  });

  it("returns false for null/undefined/empty/non-string", () => {
    expect(isAtlasFieldEncrypted(null)).toBe(false);
    expect(isAtlasFieldEncrypted(undefined)).toBe(false);
    expect(isAtlasFieldEncrypted("")).toBe(false);
    expect(isAtlasFieldEncrypted(42)).toBe(false);
    expect(isAtlasFieldEncrypted({ encrypted: true })).toBe(false);
  });
});

describe("encryptAtlasMessageContent / decryptAtlasMessageContent", () => {
  it("encrypts text-blocks while preserving structure", async () => {
    const content = [
      { type: "text", text: "Frage: was sind die Fristen?" },
      { type: "image", source: { type: "base64", data: "...base64..." } },
      { type: "text", text: "Zusatzkontext: Mandant X" },
    ];
    const encrypted = (await encryptAtlasMessageContent(
      content,
      ORG_A,
    )) as Array<Record<string, unknown>>;
    expect(encrypted).toHaveLength(3);
    expect((encrypted[0] as { type: string; text: string }).type).toBe("text");
    expect((encrypted[0] as { type: string; text: string }).text).not.toBe(
      "Frage: was sind die Fristen?",
    );
    /* Image block: untouched */
    expect(encrypted[1]).toEqual(content[1]);
    expect((encrypted[2] as { text: string }).text).not.toBe(
      "Zusatzkontext: Mandant X",
    );

    /* Round-trip */
    const decrypted = (await decryptAtlasMessageContent(encrypted)) as Array<
      Record<string, unknown>
    >;
    expect(decrypted).toEqual(content);
  });

  it("handles tool_result blocks with string content", async () => {
    const content = [
      {
        type: "tool_result",
        tool_use_id: "toolu_01",
        content: "Vault-extracted text: § 433 BGB Übergabe der Sache.",
      },
    ];
    const encrypted = (await encryptAtlasMessageContent(
      content,
      ORG_A,
    )) as Array<Record<string, unknown>>;
    expect((encrypted[0] as { content: string }).content).not.toBe(
      content[0].content,
    );
    const decrypted = await decryptAtlasMessageContent(encrypted);
    expect(decrypted).toEqual(content);
  });

  it("handles tool_result blocks with nested array content", async () => {
    const content = [
      {
        type: "tool_result",
        tool_use_id: "toolu_02",
        content: [
          { type: "text", text: "Vault-result text 1" },
          { type: "text", text: "Vault-result text 2" },
        ],
      },
    ];
    const encrypted = (await encryptAtlasMessageContent(
      content,
      ORG_A,
    )) as Array<Record<string, unknown>>;
    const innerEncrypted = (
      encrypted[0] as { content: Array<{ text: string }> }
    ).content;
    expect(innerEncrypted[0].text).not.toBe("Vault-result text 1");
    expect(innerEncrypted[1].text).not.toBe("Vault-result text 2");
    const decrypted = await decryptAtlasMessageContent(encrypted);
    expect(decrypted).toEqual(content);
  });

  it("passes through non-array content unchanged", async () => {
    expect(await encryptAtlasMessageContent(null, ORG_A)).toBeNull();
    expect(await encryptAtlasMessageContent("just a string", ORG_A)).toBe(
      "just a string",
    );
    expect(await decryptAtlasMessageContent(null)).toBeNull();
  });

  it("handles empty array", async () => {
    expect(await encryptAtlasMessageContent([], ORG_A)).toEqual([]);
    expect(await decryptAtlasMessageContent([])).toEqual([]);
  });

  it("dual-read: array containing plaintext text-blocks passes through decryptAtlasMessageContent", async () => {
    /* Legacy row: text-blocks still have plaintext .text */
    const legacyContent = [
      { type: "text", text: "Legacy plaintext message" },
      { type: "image", source: { type: "base64", data: "..." } },
    ];
    const result = await decryptAtlasMessageContent(legacyContent);
    expect(result).toEqual(legacyContent);
  });
});

describe("migrateAtlasField — idempotency for backfill", () => {
  it("plaintext → encrypted on first run", async () => {
    const result = await migrateAtlasField("plaintext", ORG_A);
    expect(isAtlasFieldEncrypted(result)).toBe(true);
    expect(await decryptAtlasField(result as string)).toBe("plaintext");
  });

  it("already-org-encrypted → unchanged on re-run", async () => {
    const first = await migrateAtlasField("plaintext", ORG_A);
    const second = await migrateAtlasField(first, ORG_A);
    expect(second).toBe(first); // exact same ciphertext, no re-encryption
  });

  it("preserves null/undefined/empty across migration", async () => {
    expect(await migrateAtlasField(null, ORG_A)).toBeNull();
    expect(await migrateAtlasField(undefined, ORG_A)).toBeUndefined();
    expect(await migrateAtlasField("", ORG_A)).toBe("");
  });
});

describe("migrateAtlasMessageContent — idempotency for backfill", () => {
  it("plaintext-text-blocks → encrypted on first run", async () => {
    const content = [
      { type: "text", text: "Hello" },
      { type: "image", source: { type: "base64", data: "..." } },
    ];
    const migrated = (await migrateAtlasMessageContent(
      content,
      ORG_A,
    )) as Array<Record<string, unknown>>;
    expect(isAtlasFieldEncrypted((migrated[0] as { text: string }).text)).toBe(
      true,
    );
    expect(migrated[1]).toEqual(content[1]); // image untouched
  });

  it("already-encrypted text-blocks → unchanged on re-run", async () => {
    const content = [{ type: "text", text: "Hello" }];
    const first = (await migrateAtlasMessageContent(content, ORG_A)) as Array<
      Record<string, unknown>
    >;
    const second = (await migrateAtlasMessageContent(first, ORG_A)) as Array<
      Record<string, unknown>
    >;
    expect((second[0] as { text: string }).text).toBe(
      (first[0] as { text: string }).text,
    );
  });
});
