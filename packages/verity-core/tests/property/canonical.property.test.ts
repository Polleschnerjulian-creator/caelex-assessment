/**
 * Property-Based Tests — Canonical Serialization
 *
 * Uses fast-check to verify fundamental properties of the canonical
 * serialization module: idempotency, determinism, key order independence,
 * and compact (no-whitespace) output.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canonicalize } from "../../src/canonical/index.js";

// ---------------------------------------------------------------------------
// Helpers: custom arbitraries for canonical-safe JSON values
// ---------------------------------------------------------------------------

/**
 * Arbitrary that produces values accepted by canonicalize().
 * JSON-compatible: null, boolean, finite number, string, plain object, array.
 * Excludes NaN, Infinity, undefined, Date, etc.
 */
const jsonPrimitive: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.boolean(),
  fc.double({ min: -1e15, max: 1e15, noNaN: true, noDefaultInfinity: true }),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc.string(),
);

const canonicalValue: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  leaf: jsonPrimitive,
  array: fc.array(tie("value"), { maxLength: 5 }),
  object: fc.dictionary(
    // Keys must not be forbidden (__proto__, constructor, prototype)
    fc
      .string()
      .filter(
        (s) => s !== "__proto__" && s !== "constructor" && s !== "prototype",
      ),
    tie("value"),
    { maxKeys: 5 },
  ),
  value: fc.oneof(
    { weight: 3, arbitrary: tie("leaf") },
    { weight: 1, arbitrary: tie("array") },
    { weight: 1, arbitrary: tie("object") },
  ),
})).value;

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Canonical Serialization — Property-Based Tests", () => {
  it("idempotency: canonicalize(parse(canonicalize(x))) === canonicalize(x)", () => {
    fc.assert(
      fc.property(canonicalValue, (value) => {
        const first = canonicalize(value);
        const reparsed = JSON.parse(first) as unknown;
        const second = canonicalize(reparsed);
        expect(second).toBe(first);
      }),
      { numRuns: 200 },
    );
  });

  it("determinism: same input always produces same output", () => {
    fc.assert(
      fc.property(canonicalValue, (value) => {
        const a = canonicalize(value);
        const b = canonicalize(value);
        expect(a).toBe(b);
      }),
      { numRuns: 200 },
    );
  });

  it("key order independence: insertion order does not affect output", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc
            .string()
            .filter(
              (s) =>
                s !== "__proto__" && s !== "constructor" && s !== "prototype",
            ),
          jsonPrimitive,
          { minKeys: 2, maxKeys: 8 },
        ),
        (obj) => {
          // Create a new object with reversed key insertion order
          const keys = Object.keys(obj);
          const reversed: Record<string, unknown> = {};
          for (let i = keys.length - 1; i >= 0; i--) {
            reversed[keys[i]!] = obj[keys[i]!];
          }

          const original = canonicalize(obj);
          const reordered = canonicalize(reversed);
          expect(reordered).toBe(original);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("no structural whitespace: output has no spaces/tabs/newlines outside strings", () => {
    fc.assert(
      fc.property(canonicalValue, (value) => {
        const output = canonicalize(value);

        // Walk through the output. Track whether we are inside a JSON string.
        let inString = false;
        let escaped = false;

        for (let i = 0; i < output.length; i++) {
          const ch = output[i]!;

          if (escaped) {
            escaped = false;
            continue;
          }

          if (ch === "\\") {
            if (inString) {
              escaped = true;
            }
            continue;
          }

          if (ch === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            // Outside a string, there must be no whitespace.
            expect(ch).not.toBe(" ");
            expect(ch).not.toBe("\t");
            expect(ch).not.toBe("\n");
            expect(ch).not.toBe("\r");
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("valid JSON: output is parseable by JSON.parse", () => {
    fc.assert(
      fc.property(canonicalValue, (value) => {
        const output = canonicalize(value);
        expect(() => JSON.parse(output)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  it("semantic preservation: parse(canonicalize(x)) deep-equals x for pure JSON values", () => {
    // Use only types where round-trip through JSON is exact (no NaN/-0 issues)
    const safeValue = fc.oneof(
      fc.constant(null),
      fc.boolean(),
      fc.integer({ min: -1_000_000, max: 1_000_000 }),
      fc.string(),
    );

    fc.assert(
      fc.property(
        fc.dictionary(
          fc
            .string()
            .filter(
              (s) =>
                s !== "__proto__" && s !== "constructor" && s !== "prototype",
            ),
          safeValue,
          { maxKeys: 5 },
        ),
        (obj) => {
          const output = canonicalize(obj);
          const parsed = JSON.parse(output) as Record<string, unknown>;
          // All values should survive the round-trip
          for (const key of Object.keys(obj)) {
            expect(parsed[key]).toStrictEqual(obj[key]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
