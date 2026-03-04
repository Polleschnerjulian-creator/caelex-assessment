/**
 * Unit tests for the Canonical Serialization module — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  canonicalize,
  canonicalizeToBytes,
  MAX_DEPTH,
} from "../../src/canonical/index.js";
import { GOLDEN_VECTORS } from "../../src/canonical/vectors.js";

// ---------------------------------------------------------------------------
// Golden Test Vectors
// ---------------------------------------------------------------------------

describe("canonicalize — golden vectors", () => {
  for (const vector of GOLDEN_VECTORS) {
    if (vector.shouldThrow) {
      it(`throws for: ${vector.name}`, () => {
        expect(() => canonicalize(vector.input)).toThrow();
        if (vector.errorMessage) {
          expect(() => canonicalize(vector.input)).toThrow(vector.errorMessage);
        }
      });
    } else {
      it(`produces correct output for: ${vector.name}`, () => {
        expect(canonicalize(vector.input)).toBe(vector.expected);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// canonicalizeToBytes returns valid UTF-8 Uint8Array
// ---------------------------------------------------------------------------

describe("canonicalizeToBytes", () => {
  it("returns a Uint8Array", () => {
    const result = canonicalizeToBytes({ a: 1 });
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("bytes decode to the same string as canonicalize", () => {
    const input = { hello: "world", num: 42 };
    const str = canonicalize(input);
    const bytes = canonicalizeToBytes(input);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toBe(str);
  });

  it("handles unicode content correctly", () => {
    const input = { emoji: "\u{1F680}", greek: "\u03B1" };
    const bytes = canonicalizeToBytes(input);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toBe(canonicalize(input));
  });

  it("returns non-empty bytes for a simple object", () => {
    const bytes = canonicalizeToBytes({ x: 1 });
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("returns valid UTF-8 that round-trips through TextEncoder/TextDecoder", () => {
    const input = { key: "caf\u00e9" };
    const bytes = canonicalizeToBytes(input);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    expect(decoded).toBe(canonicalize(input));
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe("canonicalize — idempotency", () => {
  const idempotencyInputs = [
    { b: 2, a: 1 },
    [3, 1, 2],
    { nested: { z: 1, a: 2 }, top: true },
    null,
    "hello",
    42,
    { empty: {}, arr: [], val: null },
  ];

  for (const input of idempotencyInputs) {
    it(`idempotent for: ${JSON.stringify(input)}`, () => {
      const first = canonicalize(input);
      const second = canonicalize(JSON.parse(first));
      expect(second).toBe(first);
    });
  }
});

// ---------------------------------------------------------------------------
// Key ordering is by UTF-8 byte value, not locale-dependent
// ---------------------------------------------------------------------------

describe("canonicalize — UTF-8 byte order keys", () => {
  it("sorts ASCII keys lexicographically", () => {
    const result = canonicalize({ z: 1, a: 2, m: 3 });
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it("sorts Greek letters by UTF-8 bytes (alpha before beta)", () => {
    const result = canonicalize({ "\u03B2": 1, "\u03B1": 2 });
    expect(result).toBe('{"\u03B1":2,"\u03B2":1}');
  });

  it("sorts mixed ASCII and non-ASCII by bytes", () => {
    // 'a' = 0x61, '\u00E9' (e-acute) = 0xC3 0xA9 in UTF-8
    // So 'a' sorts before '\u00E9'
    const result = canonicalize({ "\u00e9": 1, a: 2 });
    expect(result).toBe('{"a":2,"\u00e9":1}');
  });

  it("sorts uppercase before lowercase (ASCII byte order)", () => {
    // 'A' = 0x41, 'a' = 0x61 — A sorts first
    const result = canonicalize({ a: 1, A: 2 });
    expect(result).toBe('{"A":2,"a":1}');
  });

  it("sorts numeric-named keys as strings by byte order", () => {
    const result = canonicalize({ "10": 1, "2": 2, "1": 3 });
    expect(result).toBe('{"1":3,"10":1,"2":2}');
  });
});

// ---------------------------------------------------------------------------
// Max depth enforcement
// ---------------------------------------------------------------------------

describe("canonicalize — max depth enforcement", () => {
  it("accepts object nested exactly at MAX_DEPTH", () => {
    // Build object nested to MAX_DEPTH levels (64)
    let obj: unknown = "leaf";
    for (let i = 0; i < MAX_DEPTH; i++) {
      obj = { n: obj };
    }
    // Should not throw — exactly at the limit
    expect(() => canonicalize(obj)).not.toThrow();
  });

  it("throws for object nested 65 levels deep", () => {
    let obj: unknown = "leaf";
    for (let i = 0; i < 65; i++) {
      obj = { n: obj };
    }
    expect(() => canonicalize(obj)).toThrow("maximum depth");
  });

  it("throws for deeply nested arrays", () => {
    let arr: unknown = "leaf";
    for (let i = 0; i < 65; i++) {
      arr = [arr];
    }
    expect(() => canonicalize(arr)).toThrow("maximum depth");
  });

  it("throws with RangeError type", () => {
    let obj: unknown = "leaf";
    for (let i = 0; i < 65; i++) {
      obj = { n: obj };
    }
    expect(() => canonicalize(obj)).toThrow(RangeError);
  });

  it("error message contains the depth limit value", () => {
    let obj: unknown = "leaf";
    for (let i = 0; i < 65; i++) {
      obj = { n: obj };
    }
    expect(() => canonicalize(obj)).toThrow(String(MAX_DEPTH));
  });
});

// ---------------------------------------------------------------------------
// Empty inputs
// ---------------------------------------------------------------------------

describe("canonicalize — empty inputs", () => {
  it("empty object produces '{}'", () => {
    expect(canonicalize({})).toBe("{}");
  });

  it("empty array produces '[]'", () => {
    expect(canonicalize([])).toBe("[]");
  });

  it("null produces 'null'", () => {
    expect(canonicalize(null)).toBe("null");
  });

  it("object with only undefined values becomes '{}'", () => {
    expect(canonicalize({ a: undefined })).toBe("{}");
  });

  it("nested empty structures", () => {
    expect(canonicalize({ a: {}, b: [] })).toBe('{"a":{},"b":[]}');
  });
});

// ---------------------------------------------------------------------------
// undefined at top level throws
// ---------------------------------------------------------------------------

describe("canonicalize — undefined at top level", () => {
  it("throws TypeError for undefined", () => {
    expect(() => canonicalize(undefined)).toThrow(TypeError);
  });

  it("error message mentions undefined", () => {
    expect(() => canonicalize(undefined)).toThrow("undefined");
  });

  it("undefined inside object is silently excluded", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("undefined inside array becomes null", () => {
    expect(canonicalize([undefined])).toBe("[null]");
  });

  it("all-undefined object becomes empty", () => {
    expect(canonicalize({ x: undefined, y: undefined })).toBe("{}");
  });
});

// ---------------------------------------------------------------------------
// Prototype pollution keys throw
// ---------------------------------------------------------------------------

describe("canonicalize — prototype pollution protection", () => {
  it("throws for __proto__ key", () => {
    const obj: Record<string, unknown> = { safe: 1 };
    Object.defineProperty(obj, "__proto__", {
      value: "bad",
      enumerable: true,
    });
    expect(() => canonicalize(obj)).toThrow("__proto__");
  });

  it("throws for constructor key", () => {
    const obj = Object.create(null, {
      constructor: { value: "bad", enumerable: true },
    });
    expect(() => canonicalize(obj)).toThrow("constructor");
  });

  it("throws for prototype key", () => {
    const obj = Object.create(null, {
      prototype: { value: "bad", enumerable: true },
    });
    expect(() => canonicalize(obj)).toThrow("prototype");
  });

  it("error message mentions prototype pollution", () => {
    const obj: Record<string, unknown> = { safe: 1 };
    Object.defineProperty(obj, "__proto__", {
      value: "bad",
      enumerable: true,
    });
    expect(() => canonicalize(obj)).toThrow("prototype pollution");
  });

  it("throws TypeError for pollution keys", () => {
    const obj: Record<string, unknown> = { safe: 1 };
    Object.defineProperty(obj, "__proto__", {
      value: "bad",
      enumerable: true,
    });
    expect(() => canonicalize(obj)).toThrow(TypeError);
  });
});
