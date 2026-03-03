import { describe, it, expect } from "vitest";
import { canonicalJsonStringify } from "@/lib/verity/utils/canonical-json";

describe("canonicalJsonStringify", () => {
  it("sorts nested objects recursively", () => {
    expect(canonicalJsonStringify({ b: { z: 1, a: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"a":2,"z":1}}',
    );
  });

  it("preserves array order", () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("throws on undefined as standalone value", () => {
    expect(() => canonicalJsonStringify(undefined)).toThrow(
      "Canonical JSON: undefined is not allowed",
    );
  });

  it("throws on undefined as property value", () => {
    expect(() => canonicalJsonStringify({ a: undefined })).toThrow(
      'property "a" is undefined',
    );
  });

  it("allows null", () => {
    expect(canonicalJsonStringify({ a: null })).toBe('{"a":null}');
  });

  it("allows null as standalone", () => {
    expect(canonicalJsonStringify(null)).toBe("null");
  });

  it("throws on NaN", () => {
    expect(() => canonicalJsonStringify(NaN)).toThrow("NaN is not allowed");
  });

  it("throws on Infinity", () => {
    expect(() => canonicalJsonStringify(Infinity)).toThrow(
      "Infinity is not allowed",
    );
  });

  it("throws on -Infinity", () => {
    expect(() => canonicalJsonStringify(-Infinity)).toThrow(
      "-Infinity is not allowed",
    );
  });

  it("converts Date to ISO string", () => {
    expect(canonicalJsonStringify(new Date("2026-03-15T14:32:07.000Z"))).toBe(
      '"2026-03-15T14:32:07.000Z"',
    );
  });

  it("produces identical output for different key orders", () => {
    const a = { name: "test", value: 42, nested: { z: true, a: false } };
    const b = { nested: { a: false, z: true }, value: 42, name: "test" };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
  });

  it("handles deeply nested objects", () => {
    const obj = { c: { b: { a: 1 } }, a: { z: { y: 2 } } };
    expect(canonicalJsonStringify(obj)).toBe(
      '{"a":{"z":{"y":2}},"c":{"b":{"a":1}}}',
    );
  });

  it("handles arrays of objects with sorted keys", () => {
    const arr = [
      { b: 2, a: 1 },
      { d: 4, c: 3 },
    ];
    expect(canonicalJsonStringify(arr)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });

  it("handles strings with special characters", () => {
    expect(canonicalJsonStringify('hello "world"')).toBe('"hello \\"world\\""');
  });

  it("handles booleans", () => {
    expect(canonicalJsonStringify(true)).toBe("true");
    expect(canonicalJsonStringify(false)).toBe("false");
  });

  it("handles numbers correctly", () => {
    expect(canonicalJsonStringify(0)).toBe("0");
    expect(canonicalJsonStringify(-1)).toBe("-1");
    expect(canonicalJsonStringify(3.14)).toBe("3.14");
  });

  it("handles empty objects and arrays", () => {
    expect(canonicalJsonStringify({})).toBe("{}");
    expect(canonicalJsonStringify([])).toBe("[]");
  });
});
