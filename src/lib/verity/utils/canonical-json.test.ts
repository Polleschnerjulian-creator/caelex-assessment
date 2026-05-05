/**
 * Tests for the deterministic JSON serializer used as the input to
 * every Ed25519 signature in Verity. If two parties produce different
 * canonical bytes from the same logical input, signatures don't match
 * and the entire trust chain breaks.
 */

import { describe, it, expect } from "vitest";
import { canonicalJsonStringify } from "./canonical-json";

describe("canonicalJsonStringify — RFC 8785 essentials", () => {
  it("sorts top-level keys alphabetically", () => {
    expect(canonicalJsonStringify({ z: 1, a: 2, m: 3 })).toBe(
      '{"a":2,"m":3,"z":1}',
    );
  });

  it("sorts nested keys recursively", () => {
    expect(canonicalJsonStringify({ outer: { z: 1, a: 2 }, alpha: 3 })).toBe(
      '{"alpha":3,"outer":{"a":2,"z":1}}',
    );
  });

  it("preserves array order (arrays MUST not be sorted)", () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("recurses into array elements", () => {
    expect(canonicalJsonStringify([{ z: 1, a: 2 }])).toBe('[{"a":2,"z":1}]');
  });

  it("emits null literally", () => {
    expect(canonicalJsonStringify(null)).toBe("null");
    expect(canonicalJsonStringify({ a: null })).toBe('{"a":null}');
  });

  it("serialises Date as ISO 8601 string", () => {
    const d = new Date("2026-05-05T12:00:00.000Z");
    expect(canonicalJsonStringify(d)).toBe('"2026-05-05T12:00:00.000Z"');
  });

  it("serialises strings, numbers, booleans correctly", () => {
    expect(canonicalJsonStringify("hello")).toBe('"hello"');
    expect(canonicalJsonStringify(42)).toBe("42");
    expect(canonicalJsonStringify(true)).toBe("true");
    expect(canonicalJsonStringify(false)).toBe("false");
  });

  it("escapes special characters in strings", () => {
    expect(canonicalJsonStringify('he said "hi"')).toBe('"he said \\"hi\\""');
  });

  it("rejects undefined at the top level", () => {
    expect(() => canonicalJsonStringify(undefined)).toThrow(
      /undefined is not allowed/,
    );
  });

  it("rejects undefined as a property value (must throw, not skip)", () => {
    expect(() => canonicalJsonStringify({ a: undefined })).toThrow(
      /property "a" is undefined/,
    );
  });

  it("rejects NaN", () => {
    expect(() => canonicalJsonStringify(Number.NaN)).toThrow(/NaN.*Infinity/);
  });

  it("rejects Infinity / -Infinity", () => {
    expect(() => canonicalJsonStringify(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => canonicalJsonStringify(Number.NEGATIVE_INFINITY)).toThrow();
  });

  it("rejects unsupported type (function)", () => {
    expect(() => canonicalJsonStringify(() => 1)).toThrow(
      /unsupported type function/,
    );
  });

  it("rejects unsupported type (symbol)", () => {
    expect(() => canonicalJsonStringify(Symbol("x"))).toThrow(
      /unsupported type symbol/,
    );
  });

  it("two different orderings of the same logical object produce identical bytes", () => {
    const a = { x: 1, y: 2, z: { c: 3, a: 4, b: 5 } };
    const b = { z: { b: 5, c: 3, a: 4 }, y: 2, x: 1 };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
  });
});
