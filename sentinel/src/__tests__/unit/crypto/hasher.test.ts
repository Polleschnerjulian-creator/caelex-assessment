import { describe, it, expect } from "vitest";
import { hashContent, canonicalize } from "../../../crypto/hasher.js";

// Also import the server-side canonicalize for parity test
// The server version lives outside sentinel/ — we replicate it here
// to test against the agent version (both must produce identical output).
function serverCanonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return "[" + value.map((v) => serverCanonicalize(v)).join(",") + "]";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${serverCanonicalize(obj[k])}`,
    );
    return "{" + pairs.join(",") + "}";
  }
  return String(value);
}

describe("Canonicalization", () => {
  it("sorts object keys alphabetically", () => {
    expect(canonicalize({ z: 1, a: 2, m: 3 })).toBe('{"a":2,"m":3,"z":1}');
  });

  it("handles nested objects", () => {
    expect(canonicalize({ b: { z: 1, a: 2 }, a: 1 })).toBe(
      '{"a":1,"b":{"a":2,"z":1}}',
    );
  });

  it("handles arrays (preserves order)", () => {
    expect(canonicalize({ items: [3, 1, 2] })).toBe('{"items":[3,1,2]}');
  });

  it("handles null", () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it("handles strings with special characters", () => {
    expect(canonicalize({ text: 'hello "world"' })).toBe(
      '{"text":"hello \\"world\\""}',
    );
  });

  it("handles empty object", () => {
    expect(canonicalize({})).toBe("{}");
  });

  it("handles boolean + number correctly", () => {
    const result = canonicalize({ flag: true, count: 42, rate: 3.14 });
    expect(result).toBe('{"count":42,"flag":true,"rate":3.14}');
    // Deterministic — same input always same output
    expect(canonicalize({ flag: true, count: 42, rate: 3.14 })).toBe(result);
  });

  it("handles undefined values (treated as null)", () => {
    expect(canonicalize(undefined)).toBe("null");
  });

  it("handles empty array", () => {
    expect(canonicalize({ arr: [] })).toBe('{"arr":[]}');
  });

  it("handles deep nesting (3+ levels)", () => {
    const input = { a: { b: { c: { d: 1 } } } };
    expect(canonicalize(input)).toBe('{"a":{"b":{"c":{"d":1}}}}');
  });

  it("handles mixed types in arrays", () => {
    expect(canonicalize([1, "two", true, null])).toBe('[1,"two",true,null]');
  });
});

describe("Content Hash", () => {
  it("is deterministic", () => {
    const input = { fuel: 45, status: "NOMINAL" };
    const hash1 = hashContent(input);
    const hash2 = hashContent(input);
    expect(hash1).toBe(hash2);
  });

  it("changes with minimal input change", () => {
    const hash1 = hashContent({ fuel: 15.0 });
    const hash2 = hashContent({ fuel: 15.1 });
    expect(hash1).not.toBe(hash2);
  });

  it("starts with sha256: prefix", () => {
    const hash = hashContent({ test: true });
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("produces same hash regardless of property order", () => {
    const hash1 = hashContent({ z: 1, a: 2 });
    const hash2 = hashContent({ a: 2, z: 1 });
    expect(hash1).toBe(hash2);
  });
});

describe("Agent ↔ Server Canonicalization Parity", () => {
  const testCases: Array<{ name: string; input: unknown }> = [
    { name: "simple object", input: { a: 1, b: 2 } },
    { name: "reversed keys", input: { z: 1, a: 2 } },
    { name: "nested object", input: { b: { z: 1, a: 2 }, a: 1 } },
    { name: "array of numbers", input: [1, 2, 3] },
    { name: "array of strings", input: ["c", "a", "b"] },
    { name: "null value", input: null },
    { name: "string", input: "hello" },
    { name: "number", input: 42 },
    { name: "boolean true", input: true },
    { name: "boolean false", input: false },
    { name: "empty object", input: {} },
    { name: "empty array", input: [] },
    { name: "mixed array", input: [1, "two", true, null, { a: 1 }] },
    {
      name: "deep nesting",
      input: { a: { b: { c: { d: [1, { e: 2 }] } } } },
    },
    {
      name: "unicode strings",
      input: { name: "Caelex Sentinel", emoji: "satellite" },
    },
    { name: "special chars", input: { text: 'hello "world" \n\t' } },
    { name: "negative numbers", input: { val: -42.5 } },
    { name: "zero", input: { val: 0 } },
    {
      name: "real evidence data",
      input: {
        data: {
          data_point: "orbital_parameters",
          values: { altitude_km: 549.85, remaining_fuel_pct: 44.2 },
          source_system: "mission_control_fds",
          collection_method: "simulator_read",
          collection_timestamp: "2026-01-15T10:30:00.000Z",
          compliance_notes: ["Low fuel warning: 44.2%"],
        },
        regulation_mapping: [
          {
            ref: "eu_space_act_art_70",
            status: "COMPLIANT",
            note: "Fuel at 44.2%",
          },
        ],
      },
    },
    {
      name: "object with many keys",
      input: Object.fromEntries(
        "abcdefghijklmnopqrstuvwxyz".split("").map((c, i) => [c, i]),
      ),
    },
  ];

  for (const { name, input } of testCases) {
    it(`produces identical output for: ${name}`, () => {
      const agentResult = canonicalize(input);
      const serverResult = serverCanonicalize(input);
      expect(agentResult).toBe(serverResult);
    });
  }
});
