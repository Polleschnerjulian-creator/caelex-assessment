import { describe, it, expect } from "vitest";
import { sha256, sha256Buffer } from "./hash-utils";

// Known SHA-256 test vectors (verified against standard implementations)

describe("sha256", () => {
  it("hashes an empty string", () => {
    const result = sha256("");
    expect(result).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes 'hello'", () => {
    const result = sha256("hello");
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("hashes a longer string", () => {
    const result = sha256("The quick brown fox jumps over the lazy dog");
    expect(result).toBe(
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    );
  });

  it("returns hex string of 64 characters", () => {
    const result = sha256("test");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = sha256("input1");
    const hash2 = sha256("input2");
    expect(hash1).not.toBe(hash2);
  });

  it("is deterministic — same input always produces same hash", () => {
    const hash1 = sha256("deterministic");
    const hash2 = sha256("deterministic");
    expect(hash1).toBe(hash2);
  });

  it("handles unicode characters", () => {
    const result = sha256("\u00e9\u00e8\u00ea");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sha256Buffer", () => {
  it("hashes an empty buffer", () => {
    const result = sha256Buffer(Buffer.from(""));
    expect(result).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes a buffer with content", () => {
    const result = sha256Buffer(Buffer.from("hello"));
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces same result as sha256 for equivalent content", () => {
    const stringHash = sha256("test data");
    const bufferHash = sha256Buffer(Buffer.from("test data", "utf8"));
    expect(bufferHash).toBe(stringHash);
  });

  it("handles binary data (non-UTF8 bytes)", () => {
    const binaryData = Buffer.from([0x00, 0xff, 0x80, 0x7f, 0x01]);
    const result = sha256Buffer(binaryData);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns hex string of 64 characters", () => {
    const result = sha256Buffer(Buffer.from("anything"));
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same buffer always produces same hash", () => {
    const buf = Buffer.from("repeat");
    const hash1 = sha256Buffer(buf);
    const hash2 = sha256Buffer(buf);
    expect(hash1).toBe(hash2);
  });
});
