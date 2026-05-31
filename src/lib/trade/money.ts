/**
 * Trade money boundary — integer minor-units (euro cents) helpers.
 *
 * WHY: Trade money used to be stored as Prisma `Float` (Postgres `double
 * precision`). Floating-point can't represent decimal currency exactly, so
 * running totals (draw-down ledgers, de-minimis caps) accumulate drift
 * (T-H12). Money is now stored as `BigInt` integer cents — exact, no drift —
 * mirroring the UK-ECJU model's GBP-pence pattern.
 *
 * CONTRACT:
 *   - Persist + compute in `bigint` cents. NEVER do currency arithmetic in
 *     `number` euros.
 *   - Convert euros→cents at the WRITE boundary (`toCents`) and cents→euros
 *     at the READ / serialization boundary (`fromCents`).
 *   - When subtracting/comparing, do it in `bigint` FIRST, convert the result
 *     last — e.g. `fromCents(cap - drawn)`, never `fromCents(cap) - fromCents(drawn)`.
 *   - `bigint` is NOT JSON-serializable — every API response carrying a money
 *     field must `fromCents` it (to a euros `number`) before `NextResponse.json`.
 */

/**
 * Convert a euros amount (human/UI number) to integer euro cents.
 * Rounds to the nearest cent to absorb float input noise (e.g. 19.99 * 100
 * = 1998.9999999 → 1999). Throws on non-finite input — money must be a real
 * number, never NaN/Infinity.
 */
export function toCents(euros: number): bigint {
  if (!Number.isFinite(euros)) {
    throw new Error(`toCents: amount must be a finite number, got ${euros}`);
  }
  return BigInt(Math.round(euros * 100));
}

/**
 * Convert integer euro cents back to a euros number for display/serialization.
 * The division by 100 is exact for any value within Number.MAX_SAFE_INTEGER
 * cents (~90 trillion euros), which covers every realistic trade value.
 */
export function fromCents(cents: bigint): number {
  return Number(cents) / 100;
}

/**
 * Nullable variant of `toCents` — passes null/undefined through unchanged
 * (for optional money fields like `TradeLicense.totalCapValue`).
 */
export function toCentsNullable(
  euros: number | null | undefined,
): bigint | null {
  if (euros === null || euros === undefined) return null;
  return toCents(euros);
}

/**
 * Nullable variant of `fromCents` — passes null/undefined through as null.
 */
export function fromCentsNullable(
  cents: bigint | null | undefined,
): number | null {
  if (cents === null || cents === undefined) return null;
  return fromCents(cents);
}
