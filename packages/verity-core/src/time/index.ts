/**
 * Time Utilities — Verity 2036
 *
 * Space systems involve ground segments across multiple time zones with clock
 * drift.  All temporal comparisons account for a configurable clock skew
 * tolerance so that certificates and attestations remain valid even when
 * clocks are slightly out of sync between satellite, ground station, and
 * cloud infrastructure.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default clock skew tolerance: 300 seconds (5 minutes). */
export const CLOCK_SKEW_TOLERANCE_S = 300;

// ---------------------------------------------------------------------------
// Validity checks
// ---------------------------------------------------------------------------

/**
 * Check if a timestamp has expired, accounting for clock skew.
 *
 * Returns `true` if the current time is past `expiresAt + tolerance`.
 * The tolerance ensures that a credential is not rejected just because the
 * verifier's clock is slightly ahead of the issuer's clock.
 *
 * @param expiresAt       ISO 8601 expiration timestamp.
 * @param now             Override for the current time (useful for testing).
 * @param skewToleranceS  Clock skew tolerance in seconds (default 300).
 */
export function isExpired(
  expiresAt: string,
  now?: Date,
  skewToleranceS?: number,
): boolean {
  const tolerance = skewToleranceS ?? CLOCK_SKEW_TOLERANCE_S;
  const expiresMs = new Date(expiresAt).getTime();
  if (isNaN(expiresMs)) {
    throw new RangeError(`Invalid expiration timestamp: ${expiresAt}`);
  }
  const nowMs = (now ?? new Date()).getTime();
  return nowMs > expiresMs + tolerance * 1000;
}

/**
 * Check if a timestamp is not yet valid, accounting for clock skew.
 *
 * Returns `true` if the current time is before `validFrom - tolerance`.
 * The tolerance ensures that a credential is not rejected just because the
 * verifier's clock is slightly behind the issuer's clock.
 *
 * @param validFrom       ISO 8601 "not before" timestamp.
 * @param now             Override for the current time (useful for testing).
 * @param skewToleranceS  Clock skew tolerance in seconds (default 300).
 */
export function isNotYetValid(
  validFrom: string,
  now?: Date,
  skewToleranceS?: number,
): boolean {
  const tolerance = skewToleranceS ?? CLOCK_SKEW_TOLERANCE_S;
  const fromMs = new Date(validFrom).getTime();
  if (isNaN(fromMs)) {
    throw new RangeError(`Invalid validFrom timestamp: ${validFrom}`);
  }
  const nowMs = (now ?? new Date()).getTime();
  return nowMs < fromMs - tolerance * 1000;
}

/**
 * Check if a timestamp falls within a validity window, accounting for clock
 * skew on both boundaries.
 *
 * Equivalent to: `!isNotYetValid(validFrom) && !isExpired(validUntil)`.
 *
 * @param validFrom       ISO 8601 start of validity window.
 * @param validUntil      ISO 8601 end of validity window.
 * @param now             Override for the current time (useful for testing).
 * @param skewToleranceS  Clock skew tolerance in seconds (default 300).
 */
export function isWithinValidityWindow(
  validFrom: string,
  validUntil: string,
  now?: Date,
  skewToleranceS?: number,
): boolean {
  return (
    !isNotYetValid(validFrom, now, skewToleranceS) &&
    !isExpired(validUntil, now, skewToleranceS)
  );
}

// ---------------------------------------------------------------------------
// Timestamp generation
// ---------------------------------------------------------------------------

/**
 * Create an ISO 8601 UTC timestamp string for the current instant.
 *
 * The returned format is `YYYY-MM-DDTHH:mm:ss.sssZ` — the canonical form
 * produced by `Date.prototype.toISOString()`, which always uses UTC ("Z"
 * suffix) and millisecond precision.
 */
export function utcNow(): string {
  return new Date().toISOString();
}

/**
 * Create an ISO 8601 UTC timestamp that is `daysFromNow` days in the future.
 *
 * @param daysFromNow  Number of days to add to the current time.  May be
 *                     fractional (e.g. 0.5 for 12 hours) or negative for
 *                     timestamps in the past.
 */
export function utcFuture(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a string is a valid ISO 8601 UTC timestamp in the canonical
 * form `YYYY-MM-DDTHH:mm:ss.sssZ`.
 *
 * This is deliberately strict: it rejects timezone offsets other than "Z",
 * date-only strings, and non-standard formats that `new Date()` might
 * otherwise accept.
 *
 * @param ts  The string to validate.
 * @returns   `true` if the string is a valid canonical ISO 8601 timestamp.
 */
export function isValidTimestamp(ts: string): boolean {
  const d = new Date(ts);
  return !isNaN(d.getTime()) && d.toISOString() === ts;
}
