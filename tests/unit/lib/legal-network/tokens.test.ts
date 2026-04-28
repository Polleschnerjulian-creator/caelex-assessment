// tests/unit/lib/legal-network/tokens.test.ts

/**
 * Unit tests for src/lib/legal-network/tokens.ts.
 *
 * Token-mint + verify is the auth boundary for the token-flow
 * acceptance path of the bilateral handshake. Bugs here = an attacker
 * could either guess valid invite URLs or exploit timing-side-channels
 * to recover stored hashes one byte at a time.
 *
 * Pinned guarantees:
 *   - Each mint produces a fresh raw token (no reuse)
 *   - hash(raw) is deterministic and matches mint().hash
 *   - tokenMatches uses constant-time compare semantics — same length
 *     comparison + timingSafeEqual underneath
 *   - 72-hour TTL is the contract; tests drift-detect any change
 *   - isExpired is "≤ now" (inclusive: a token expiring exactly now is
 *     already expired)
 *   - Raw tokens are URL-safe base64 (no +, /, =)
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

vi.mock("server-only", () => ({}));

import { vi } from "vitest";
import {
  mintInviteToken,
  hashToken,
  tokenMatches,
  isExpired,
} from "@/lib/legal-network/tokens";

describe("mintInviteToken — randomness + structure", () => {
  it("emits a fresh raw token on every call (50 trials)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(mintInviteToken().raw);
    }
    expect(seen.size).toBe(50);
  });

  it("emits a fresh hash on every call (50 trials)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(mintInviteToken().hash);
    }
    expect(seen.size).toBe(50);
  });

  it("the raw token is URL-safe base64 (no +, /, =)", () => {
    for (let i = 0; i < 10; i++) {
      const { raw } = mintInviteToken();
      expect(raw).not.toContain("+");
      expect(raw).not.toContain("/");
      expect(raw).not.toContain("=");
      expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("the raw token decodes to ≥ 32 bytes (256 bits of entropy)", () => {
    // base64url with no padding: ceil(32 * 4/3) = 43 chars for 32 bytes.
    // The implementation uses `randomBytes(32).toString('base64url')`.
    const { raw } = mintInviteToken();
    expect(raw.length).toBeGreaterThanOrEqual(43);
  });

  it("the hash is the SHA-256 hex digest of the raw token", () => {
    const { raw, hash } = mintInviteToken();
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");
    expect(hash).toBe(expected);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("mintInviteToken — TTL", () => {
  it("expiresAt is ~72 hours from now", () => {
    const before = Date.now();
    const { expiresAt } = mintInviteToken();
    const after = Date.now();
    const expected = 72 * 3600 * 1000;
    const drift = expiresAt.getTime() - before;
    expect(drift).toBeGreaterThanOrEqual(expected - 5);
    expect(drift).toBeLessThanOrEqual(after - before + expected + 5);
  });
});

describe("hashToken", () => {
  it("is deterministic — same input always produces same hash", () => {
    const a = hashToken("abc");
    const b = hashToken("abc");
    expect(a).toBe(b);
  });

  it("matches the SHA-256 hex digest exactly", () => {
    const expected = createHash("sha256").update("hello", "utf8").digest("hex");
    expect(hashToken("hello")).toBe(expected);
  });

  it("differs for different inputs (avalanche)", () => {
    const a = hashToken("hello");
    const b = hashToken("Hello");
    expect(a).not.toBe(b);
  });

  it("returns 64-char hex (256-bit digest)", () => {
    expect(hashToken("any")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("tokenMatches — verify happy + reject paths", () => {
  it("returns true when raw matches the stored hash", () => {
    const { raw, hash } = mintInviteToken();
    expect(tokenMatches(raw, hash)).toBe(true);
  });

  it("returns false when raw does NOT match the stored hash", () => {
    const { hash } = mintInviteToken();
    const bogus = mintInviteToken().raw;
    expect(tokenMatches(bogus, hash)).toBe(false);
  });

  it("returns false when storedHash has wrong length (no length oracle)", () => {
    const { raw } = mintInviteToken();
    // truncated stored hash
    expect(tokenMatches(raw, "deadbeef")).toBe(false);
  });

  it("returns false on empty raw token (must not be a default-accept)", () => {
    const { hash } = mintInviteToken();
    expect(tokenMatches("", hash)).toBe(false);
  });

  it("returns false on empty stored hash", () => {
    const { raw } = mintInviteToken();
    expect(tokenMatches(raw, "")).toBe(false);
  });

  it("matches when callers re-derive the hash via hashToken", () => {
    const raw = "fixed-test-input";
    const storedHash = hashToken(raw);
    expect(tokenMatches(raw, storedHash)).toBe(true);
  });

  it("rejects when storedHash differs by a single bit", () => {
    const raw = "fixed-test-input";
    const correct = hashToken(raw);
    // Flip the last hex digit
    const lastIdx = correct.length - 1;
    const flipped =
      correct.slice(0, lastIdx) +
      (correct[lastIdx] === "0" ? "1" : "0").toString();
    expect(tokenMatches(raw, flipped)).toBe(false);
  });
});

describe("isExpired — boundary semantics", () => {
  it("returns true when expiresAt is in the past", () => {
    const past = new Date(Date.now() - 1000);
    expect(isExpired(past)).toBe(true);
  });

  it("returns false when expiresAt is in the future", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isExpired(future)).toBe(false);
  });

  it("returns true at the exact expiry instant (≤ semantics)", () => {
    const now = new Date("2026-04-28T10:00:00Z");
    const expiresAt = new Date("2026-04-28T10:00:00Z");
    expect(isExpired(expiresAt, now)).toBe(true);
  });

  it("returns false 1ms before the exact expiry instant", () => {
    const now = new Date("2026-04-28T10:00:00Z");
    const expiresAt = new Date("2026-04-28T10:00:00.001Z");
    expect(isExpired(expiresAt, now)).toBe(false);
  });

  it("uses the supplied `now` arg over wall clock when provided", () => {
    // expiresAt is in the FUTURE by wall clock, but the supplied `now`
    // is even further in the future — should be flagged expired.
    const farFuture = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const evenFurther = new Date(Date.now() + 366 * 24 * 3600 * 1000);
    expect(isExpired(farFuture, evenFurther)).toBe(true);
  });
});
