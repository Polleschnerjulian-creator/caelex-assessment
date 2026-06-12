/**
 * Exporteur-Sitz-Resolver (Spec 2026-06-12 §4.1 / Task 5).
 *
 * Consumed by origin-routing: given an Organization row, determine the
 * country-of-seat of the exporter (Exporteur-SITZ).
 *
 * BEGRIFFSTRENNUNG (verbindlich, Lehre aus T-H6):
 *   Exporteur-SITZ  → bestimmt das anwendbare Ausfuhrrecht (DIESE Funktion).
 *   Item-countryOfOrigin → füttert nur Re-Export-Logik (De-minimis/FDPR).
 *
 * Design rules (enforced by tests):
 *   - Returns `null` when the seat cannot be determined — NEVER invents a
 *     default country.  The `?? "DE"` fallback in applicant-from-org.ts is
 *     correct for BAFA (a German-authority form) but would be a silent false
 *     origin here; fail-closed is the only safe behaviour.
 *   - `billingAddress` is a Prisma JSON column (type `unknown`); access
 *     defensively following the same narrowing pattern as
 *     `src/lib/trade/bafa/applicant-from-org.ts`.
 *   - ISO-2 strings pass through unchanged after trim+upper.  "UK" is NOT
 *     aliased to "GB": strict ISO-2 is the contract, and aliasing would hide
 *     the unsupported-origin signal that origin-regime-map emits for "UK".
 *     The name-map below handles the human spelling "United Kingdom" → "GB"
 *     instead, which is the correct place for the conversion.
 *   - Any `/^[A-Z]{2}$/` value that survives trim+upper is returned as-is;
 *     the downstream `originRegimes()` function decides supported/unsupported.
 *     This keeps the resolver single-responsibility.
 *   - The name-map covers DE+EN spellings for circle-A countries only.  Smaller
 *     states without common-name ambiguity are omitted — ISO-2 is the contract;
 *     the map is a convenience layer.
 *
 * Pure function — no Prisma import, no I/O, no side-effects.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ── Full-name → ISO-2 map (DE + EN, circle-A countries only) ────────────────
// Keys are lowercase-trimmed; values are canonical ISO 3166-1 alpha-2.
// Intentionally no "UK" → "GB" entry: we only map human-written names here;
// the two-letter code "UK" flows through unchanged (see design note above).
const NAME_MAP: Readonly<Record<string, string>> = {
  // EU-27
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  frankreich: "FR",
  italy: "IT",
  italien: "IT",
  spain: "ES",
  spanien: "ES",
  netherlands: "NL",
  niederlande: "NL",
  belgium: "BE",
  belgien: "BE",
  austria: "AT",
  österreich: "AT",
  oesterreich: "AT",
  poland: "PL",
  polen: "PL",
  sweden: "SE",
  schweden: "SE",
  denmark: "DK",
  dänemark: "DK",
  daenemark: "DK",
  finland: "FI",
  finnland: "FI",
  ireland: "IE",
  irland: "IE",
  portugal: "PT",
  greece: "GR",
  griechenland: "GR",
  czechia: "CZ",
  "czech republic": "CZ",
  tschechien: "CZ",
  romania: "RO",
  rumänien: "RO",
  rumaenien: "RO",
  hungary: "HU",
  ungarn: "HU",
  luxembourg: "LU",
  luxemburg: "LU",
  // Non-EU circle-A
  "united kingdom": "GB",
  großbritannien: "GB",
  grossbritannien: "GB",
  "vereinigtes königreich": "GB",
  "vereinigtes konigreich": "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  switzerland: "CH",
  schweiz: "CH",
  norway: "NO",
  norwegen: "NO",
  canada: "CA",
  kanada: "CA",
  japan: "JP",
  australia: "AU",
  australien: "AU",
  "south korea": "KR",
  südkorea: "KR",
  sudkorea: "KR",
  "korea (republic of)": "KR",
  india: "IN",
  indien: "IN",
};

/**
 * Safely pull the `country` string from an unknown Prisma JSON blob.
 * Returns undefined when the value is absent or not a non-empty string.
 * Mirrors the `pickStr` helper in applicant-from-org.ts (same narrowing
 * pattern) but scoped to the single `country` key this resolver needs.
 */
function pickCountry(addr: Record<string, unknown>): string | undefined {
  const v = addr["country"];
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/**
 * Resolve the exporter's country-of-seat from an Organization partial.
 *
 * @param org - A structural partial of the Organization row; only
 *   `billingAddress` is read.  Accepts `null | undefined` gracefully.
 * @returns ISO 3166-1 alpha-2 code (uppercase), or `null` when the seat
 *   cannot be determined.  Never returns a default country.
 */
export function resolveExporterSeat(
  org: { billingAddress?: unknown } | null | undefined,
): string | null {
  if (org == null) return null;

  const { billingAddress } = org;

  // Narrow billingAddress from `unknown` to a plain object — same pattern as
  // applicant-from-org.ts lines 67-72.
  if (
    billingAddress == null ||
    typeof billingAddress !== "object" ||
    Array.isArray(billingAddress)
  ) {
    return null;
  }

  const addr = billingAddress as Record<string, unknown>;
  const raw = pickCountry(addr);
  if (raw === undefined) return null;

  const normalized = raw.toUpperCase();

  // Fast path: valid ISO-2 format (two ASCII uppercase letters).
  // We pass it through as-is — "UK" is deliberately NOT aliased to "GB"
  // (see module doc comment).  Downstream originRegimes() returns
  // supported=false for "UK", which is the correct fail-closed signal.
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Slow path: try the human-name map (lowercase key lookup).
  const mapped = NAME_MAP[raw.toLowerCase()];
  return mapped ?? null;
}
