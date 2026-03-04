/**
 * Canonical Serialization Rules for Verity 2036
 *
 * Deterministic, cross-platform JSON serialization for cryptographic signing.
 * MUST produce identical bytes for identical logical input across all runtimes.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum recursion depth to prevent stack overflow. */
export const MAX_DEPTH = 64;

/** Maximum output size in bytes (1 MB). */
export const MAX_INPUT_SIZE = 1_048_576;

/** Dangerous keys that MUST be rejected (prototype pollution prevention). */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

// ---------------------------------------------------------------------------
// String normalisation
// ---------------------------------------------------------------------------

/**
 * NFC-normalize a string and validate that it contains no lone surrogates.
 *
 * Lone surrogates (U+D800..U+DFFF) are invalid in UTF-8. They can appear in
 * JavaScript strings but MUST be rejected for canonical serialization because
 * they cannot be round-tripped through UTF-8 encoding.
 */
export function normalizeString(s: string): string {
  // Detect lone surrogates: high surrogate not followed by low, or low not
  // preceded by high.
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate — must be followed by a low surrogate.
      const next = s.charCodeAt(i + 1);
      if (isNaN(next) || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError(
          `Invalid lone high surrogate at index ${i} (U+${code.toString(16).toUpperCase().padStart(4, "0")})`,
        );
      }
      // Skip the low surrogate; it is part of a valid pair.
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(
        `Invalid lone low surrogate at index ${i} (U+${code.toString(16).toUpperCase().padStart(4, "0")})`,
      );
    }
  }

  return s.normalize("NFC");
}

// ---------------------------------------------------------------------------
// Number encoding
// ---------------------------------------------------------------------------

/**
 * Encode a number to its canonical JSON string representation.
 *
 * - NaN, Infinity, and -Infinity are rejected.
 * - Negative zero is normalised to positive zero ("0").
 * - The output matches the ECMA-262 `Number::toString` / JSON spec:
 *   no leading `+`, no trailing zeros in the fractional part.
 */
export function encodeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError(`Cannot canonicalize non-finite number: ${String(n)}`);
  }

  // Object.is distinguishes -0 from +0.
  if (Object.is(n, -0)) {
    return "0";
  }

  // The default Number→String conversion in JavaScript already satisfies the
  // canonical requirements: no trailing fractional zeros, no leading `+`, and
  // it uses exponential notation only when the exponent is large enough.
  // This is specified by ECMA-262 "Number::toString" (7.1.12.1).
  //
  // We do NOT use JSON.stringify here — we produce the string ourselves.
  return String(n);
}

// ---------------------------------------------------------------------------
// String escaping
// ---------------------------------------------------------------------------

/**
 * Escape a string for canonical JSON output.
 *
 * The following characters are escaped:
 *   - `"` → `\"`
 *   - `\` → `\\`
 *   - `\b` (U+0008) → `\\b`
 *   - `\f` (U+000C) → `\\f`
 *   - `\n` (U+000A) → `\\n`
 *   - `\r` (U+000D) → `\\r`
 *   - `\t` (U+0009) → `\\t`
 *   - All other control characters U+0000..U+001F → `\\uXXXX` (lowercase hex)
 *
 * Characters above U+001F that are valid UTF-8 (including emoji, CJK, RTL,
 * ZWJ, etc.) are passed through unchanged.
 */
export function escapeString(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    switch (code) {
      case 0x22: // "
        out += '\\"';
        break;
      case 0x5c: // backslash
        out += "\\\\";
        break;
      case 0x08: // \b
        out += "\\b";
        break;
      case 0x0c: // \f
        out += "\\f";
        break;
      case 0x0a: // \n
        out += "\\n";
        break;
      case 0x0d: // \r
        out += "\\r";
        break;
      case 0x09: // \t
        out += "\\t";
        break;
      default:
        if (code <= 0x1f) {
          // Control characters → \\uXXXX (lowercase hex, 4 digits).
          out += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          out += s[i]!;
        }
        break;
    }
  }
  return out;
}
