/**
 * Canonical Serialization — Verity 2036
 *
 * Deterministic, cross-platform JSON serialization for cryptographic use.
 *
 * Rules:
 *  1. Object keys sorted lexicographically by UTF-8 byte value.
 *  2. Numbers: IEEE 754, no -0, reject NaN/Infinity.
 *  3. Strings: NFC normalized, escaped control chars.
 *  4. null / true / false as literal tokens.
 *  5. undefined values excluded (not serialized).
 *  6. Arrays preserve element order.
 *  7. No whitespace between tokens.
 *  8. Prototype pollution keys rejected (__proto__, constructor, prototype).
 *  9. Circular references rejected.
 * 10. Max depth 64, max output size 1 MB.
 *
 * IMPORTANT: This module does NOT delegate to JSON.stringify.  Every byte of
 * the output is produced by the code below so that the canonical form is
 * fully specified and auditable.
 */

import {
  MAX_DEPTH,
  MAX_INPUT_SIZE,
  FORBIDDEN_KEYS,
  normalizeString,
  encodeNumber,
  escapeString,
} from "./rules.js";

// Re-export rules so consumers can import from the package root.
export {
  MAX_DEPTH,
  MAX_INPUT_SIZE,
  FORBIDDEN_KEYS,
  normalizeString,
  encodeNumber,
  escapeString,
} from "./rules.js";

// ---------------------------------------------------------------------------
// UTF-8 byte-order comparison for object keys
// ---------------------------------------------------------------------------

/**
 * Compare two strings by their UTF-8 byte representation.
 *
 * This is the sort order mandated by the canonical rules.  We encode both
 * strings to UTF-8 and compare byte-by-byte.
 */
function compareByUtf8Bytes(a: string, b: string): number {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.compare(bb);
}

// ---------------------------------------------------------------------------
// Internal recursive serializer
// ---------------------------------------------------------------------------

/**
 * Recursively serialize a value into canonical JSON.
 *
 * @param value   The value to serialize.
 * @param depth   Current recursion depth (starts at 0).
 * @param seen    Set of object references already visited (cycle detection).
 * @returns       The canonical JSON string fragment for `value`.
 */
function serializeValue(
  value: unknown,
  depth: number,
  seen: Set<unknown>,
): string {
  // --- Depth guard ---
  if (depth > MAX_DEPTH) {
    throw new RangeError(
      `Canonical serialization exceeded maximum depth of ${MAX_DEPTH}`,
    );
  }

  // --- Primitive types ---
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";

  const t = typeof value;

  if (t === "number") {
    return encodeNumber(value as number);
  }

  if (t === "string") {
    const normalized = normalizeString(value as string);
    return '"' + escapeString(normalized) + '"';
  }

  // --- Disallowed primitive types ---
  if (t === "undefined") {
    throw new TypeError(
      "Cannot canonicalize undefined at top level or as a standalone value",
    );
  }
  if (t === "bigint") {
    throw new TypeError(
      "Cannot canonicalize BigInt — convert to string or number first",
    );
  }
  if (t === "symbol") {
    throw new TypeError("Cannot canonicalize Symbol values");
  }
  if (t === "function") {
    throw new TypeError("Cannot canonicalize function values");
  }

  // --- Reference types (object / array) ---

  // Reject non-plain objects (Date, RegExp, Map, Set, typed arrays, etc.).
  // Only plain objects and arrays are permitted.
  if (value instanceof Date) {
    throw new TypeError(
      "Cannot canonicalize Date — convert to ISO string first",
    );
  }
  if (value instanceof RegExp) {
    throw new TypeError("Cannot canonicalize RegExp");
  }
  if (value instanceof Map || value instanceof Set) {
    throw new TypeError(
      "Cannot canonicalize Map/Set — convert to object/array first",
    );
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    throw new TypeError(
      "Cannot canonicalize binary data — encode to base64 string first",
    );
  }

  // Circular reference detection.
  if (seen.has(value)) {
    throw new TypeError("Circular reference detected during canonicalization");
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return serializeArray(value, depth, seen);
    }

    // Must be a plain object at this point.
    return serializeObject(value as Record<string, unknown>, depth, seen);
  } finally {
    seen.delete(value);
  }
}

// ---------------------------------------------------------------------------
// Array serialization
// ---------------------------------------------------------------------------

function serializeArray(
  arr: unknown[],
  depth: number,
  seen: Set<unknown>,
): string {
  let out = "[";
  for (let i = 0; i < arr.length; i++) {
    if (i > 0) out += ",";
    const elem = arr[i];
    // undefined inside arrays is replaced with null (same behaviour as
    // JSON.stringify, and required by the spec).
    if (elem === undefined) {
      out += "null";
    } else {
      out += serializeValue(elem, depth + 1, seen);
    }
  }
  out += "]";
  return out;
}

// ---------------------------------------------------------------------------
// Object serialization
// ---------------------------------------------------------------------------

function serializeObject(
  obj: Record<string, unknown>,
  depth: number,
  seen: Set<unknown>,
): string {
  // Collect own enumerable string keys.
  const keys = Object.keys(obj);

  // Check for forbidden keys.
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new TypeError(
        `Forbidden key "${key}" detected — potential prototype pollution`,
      );
    }
  }

  // Sort keys by UTF-8 byte order.
  keys.sort(compareByUtf8Bytes);

  let out = "{";
  let first = true;

  for (const key of keys) {
    const val = obj[key];

    // Skip undefined values (rule 5).
    if (val === undefined) continue;

    if (!first) out += ",";
    first = false;

    // Key is always a string — normalize and escape.
    const normalizedKey = normalizeString(key);
    out += '"' + escapeString(normalizedKey) + '":';
    out += serializeValue(val, depth + 1, seen);
  }

  out += "}";
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Deterministic canonical serialization for cryptographic use.
 *
 * Produces a JSON string that is guaranteed to be identical for identical
 * logical input, regardless of key insertion order, platform, or runtime.
 *
 * @param value  The value to serialize.  Must be a JSON-compatible type
 *               (null, boolean, number, string, plain object, or array).
 * @returns      The canonical JSON string.
 * @throws {TypeError}   For non-serializable types, circular references, or
 *                        forbidden keys.
 * @throws {RangeError}  If depth exceeds MAX_DEPTH or output exceeds
 *                        MAX_INPUT_SIZE.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) {
    throw new TypeError(
      "Cannot canonicalize undefined — top-level value must be a JSON type",
    );
  }

  const seen = new Set<unknown>();
  const result = serializeValue(value, 0, seen);

  // Validate output size.
  const byteLength = Buffer.byteLength(result, "utf8");
  if (byteLength > MAX_INPUT_SIZE) {
    throw new RangeError(
      `Canonical output exceeds maximum size of ${MAX_INPUT_SIZE} bytes (got ${byteLength})`,
    );
  }

  return result;
}

/**
 * Canonicalize and return as UTF-8 bytes for cryptographic operations
 * (hashing, signing, etc.).
 */
export function canonicalizeToBytes(value: unknown): Uint8Array {
  const str = canonicalize(value);
  return new TextEncoder().encode(str);
}
