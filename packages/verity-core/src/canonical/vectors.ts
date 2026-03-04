/**
 * Golden Test Vectors for Canonical Serialization — Verity 2036
 *
 * These vectors define the expected output of `canonicalize()` for a
 * comprehensive set of inputs.  They serve as cross-platform compatibility
 * tests: any conforming implementation MUST produce identical output for
 * every non-throwing vector, and MUST reject every throwing vector.
 */

export interface TestVector {
  /** Human-readable name for the test case. */
  name: string;
  /** The input value to pass to `canonicalize()`. */
  input: unknown;
  /** The expected canonical JSON string (for non-throwing cases). */
  expected: string;
  /** If true, `canonicalize()` must throw an error. */
  shouldThrow?: boolean;
  /** Optional substring that the thrown error message should contain. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Helper: build a deeply nested object to a given depth.
// ---------------------------------------------------------------------------

function buildDeepObject(depth: number): unknown {
  let obj: unknown = "leaf";
  for (let i = 0; i < depth; i++) {
    obj = { nested: obj };
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Helper: build a circular reference.
// ---------------------------------------------------------------------------

function buildCircularReference(): Record<string, unknown> {
  const obj: Record<string, unknown> = { a: 1 };
  obj["self"] = obj;
  return obj;
}

// ---------------------------------------------------------------------------
// Golden vectors
// ---------------------------------------------------------------------------

export const GOLDEN_VECTORS: TestVector[] = [
  // =========================================================================
  // Basic Types
  // =========================================================================
  {
    name: "null literal",
    input: null,
    expected: "null",
  },
  {
    name: "true literal",
    input: true,
    expected: "true",
  },
  {
    name: "false literal",
    input: false,
    expected: "false",
  },
  {
    name: "zero",
    input: 0,
    expected: "0",
  },
  {
    name: "positive integer 1",
    input: 1,
    expected: "1",
  },
  {
    name: "negative integer -1",
    input: -1,
    expected: "-1",
  },
  {
    name: "fractional number 1.5",
    input: 1.5,
    expected: "1.5",
  },
  {
    name: "empty string",
    input: "",
    expected: '""',
  },
  {
    name: "simple string hello",
    input: "hello",
    expected: '"hello"',
  },

  // =========================================================================
  // Number Edge Cases
  // =========================================================================
  {
    name: "very small number 1e-20",
    input: 1e-20,
    expected: "1e-20",
  },
  {
    name: "very large number 1e20",
    input: 1e20,
    expected: "100000000000000000000",
  },
  {
    name: "IEEE 754 floating-point: 0.1 + 0.2",
    input: 0.1 + 0.2,
    expected: "0.30000000000000004",
  },
  {
    name: "MAX_SAFE_INTEGER",
    input: Number.MAX_SAFE_INTEGER,
    expected: "9007199254740991",
  },
  {
    name: "MIN_SAFE_INTEGER",
    input: Number.MIN_SAFE_INTEGER,
    expected: "-9007199254740991",
  },

  // =========================================================================
  // Number Errors
  // =========================================================================
  {
    name: "negative zero produces 0 (normalised)",
    input: -0,
    expected: "0",
  },
  {
    name: "NaN throws",
    input: NaN,
    expected: "",
    shouldThrow: true,
    errorMessage: "non-finite",
  },
  {
    name: "Infinity throws",
    input: Infinity,
    expected: "",
    shouldThrow: true,
    errorMessage: "non-finite",
  },
  {
    name: "negative Infinity throws",
    input: -Infinity,
    expected: "",
    shouldThrow: true,
    errorMessage: "non-finite",
  },

  // =========================================================================
  // Top-level Errors
  // =========================================================================
  {
    name: "undefined at top level throws",
    input: undefined,
    expected: "",
    shouldThrow: true,
    errorMessage: "undefined",
  },
  {
    name: "circular reference throws",
    input: buildCircularReference(),
    expected: "",
    shouldThrow: true,
    errorMessage: "Circular reference",
  },
  {
    name: "object with __proto__ key throws",
    input: (() => {
      const obj: Record<string, unknown> = { safe: 1 };
      Object.defineProperty(obj, "__proto__", {
        value: "bad",
        enumerable: true,
      });
      return obj;
    })(),
    expected: "",
    shouldThrow: true,
    errorMessage: "__proto__",
  },
  {
    name: "object with constructor key throws",
    input: Object.create(null, {
      constructor: { value: "bad", enumerable: true },
    }),
    expected: "",
    shouldThrow: true,
    errorMessage: "constructor",
  },
  {
    name: "depth exceeding 64 throws",
    input: buildDeepObject(65),
    expected: "",
    shouldThrow: true,
    errorMessage: "maximum depth",
  },

  // =========================================================================
  // String Edge Cases
  // =========================================================================
  {
    name: "null byte control character",
    input: "\x00",
    expected: '"\\u0000"',
  },
  {
    name: "newline escape",
    input: "\n",
    expected: '"\\n"',
  },
  {
    name: "tab escape",
    input: "\t",
    expected: '"\\t"',
  },
  {
    name: "backslash escape",
    input: "\\",
    expected: '"\\\\"',
  },
  {
    name: "double quote escape",
    input: '"',
    expected: '"\\""',
  },
  {
    name: "emoji passthrough (rocket)",
    input: "\u{1F680}",
    expected: '"\u{1F680}"',
  },
  {
    // e with combining acute accent (U+0065 U+0301) → NFC → e-acute (U+00E9)
    name: "combining character NFC normalization",
    input: "e\u0301",
    expected: '"\u00e9"',
  },
  {
    name: "Arabic RTL text passthrough",
    input: "\u0645\u0631\u062D\u0628\u0627",
    expected: '"\u0645\u0631\u062D\u0628\u0627"',
  },
  {
    // U+200D is a control-range character above U+001F, so it is NOT escaped.
    // The zero-width joiner is U+200D which is above the control character
    // range.  It is valid UTF-8 and passed through unchanged.
    name: "zero-width joiner passthrough",
    input: "\u200D",
    expected: '"\u200D"',
  },
  {
    name: "backspace escape",
    input: "\b",
    expected: '"\\b"',
  },
  {
    name: "form feed escape",
    input: "\f",
    expected: '"\\f"',
  },
  {
    name: "carriage return escape",
    input: "\r",
    expected: '"\\r"',
  },
  {
    // U+001F is the last control character in the range.
    name: "U+001F unit separator escaped",
    input: "\x1F",
    expected: '"\\u001f"',
  },

  // =========================================================================
  // Object Key Ordering
  // =========================================================================
  {
    name: "object keys sorted alphabetically",
    input: { b: 1, a: 2 },
    expected: '{"a":2,"b":1}',
  },
  {
    // Greek: beta (U+03B2) vs alpha (U+03B1).
    // UTF-8: alpha = CE B1, beta = CE B2.  alpha sorts first.
    name: "object keys sorted by UTF-8 bytes (Greek)",
    input: { "\u03B2": 1, "\u03B1": 2 },
    expected: '{"\u03B1":2,"\u03B2":1}',
  },
  {
    name: "nested object keys sorted recursively",
    input: { b: { d: 1, c: 2 }, a: 3 },
    expected: '{"a":3,"b":{"c":2,"d":1}}',
  },

  // =========================================================================
  // Arrays
  // =========================================================================
  {
    name: "empty array",
    input: [],
    expected: "[]",
  },
  {
    name: "array of integers preserves order",
    input: [1, 2, 3],
    expected: "[1,2,3]",
  },
  {
    name: "array order is not changed",
    input: [3, 1, 2],
    expected: "[3,1,2]",
  },
  {
    name: "mixed-type array",
    input: [1, "a", null, true],
    expected: '[1,"a",null,true]',
  },
  {
    name: "array with undefined replaced by null",
    input: [undefined],
    expected: "[null]",
  },

  // =========================================================================
  // Nested Structures
  // =========================================================================
  {
    name: "empty object",
    input: {},
    expected: "{}",
  },
  {
    name: "3-level nested object",
    input: { a: { b: { c: 1 } } },
    expected: '{"a":{"b":{"c":1}}}',
  },
  {
    name: "object with array values",
    input: { nums: [1, 2], str: "x" },
    expected: '{"nums":[1,2],"str":"x"}',
  },
  {
    name: "array of objects",
    input: [{ id: 1 }, { id: 2 }],
    expected: '[{"id":1},{"id":2}]',
  },

  // =========================================================================
  // Undefined Handling in Objects
  // =========================================================================
  {
    name: "undefined value excluded from object",
    input: { a: 1, b: undefined },
    expected: '{"a":1}',
  },
  {
    name: "all-undefined object becomes empty",
    input: { a: undefined },
    expected: "{}",
  },

  // =========================================================================
  // Type-specific Errors
  // =========================================================================
  {
    name: "Date object throws",
    input: new Date("2024-01-01T00:00:00Z"),
    expected: "",
    shouldThrow: true,
    errorMessage: "Date",
  },
  {
    name: "function throws",
    input: () => 42,
    expected: "",
    shouldThrow: true,
    errorMessage: "function",
  },
  {
    name: "Symbol throws",
    input: Symbol("test"),
    expected: "",
    shouldThrow: true,
    errorMessage: "Symbol",
  },
  {
    name: "BigInt throws",
    input: BigInt(42),
    expected: "",
    shouldThrow: true,
    errorMessage: "BigInt",
  },
];
