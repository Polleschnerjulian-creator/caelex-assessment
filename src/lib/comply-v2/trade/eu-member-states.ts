/**
 * The 27 current EU member states (ISO 3166-1 alpha-2, uppercase).
 *
 * Export-control-domain list, deliberately SEPARATE from
 * `EU_MEMBER_STATES` in `@/lib/space-law-types` (which is scoped to the 24
 * EU countries the National Space Law wizard supports and omits BG, CY, MT).
 * Using that space-law subset for licensing would wrongly treat exports to
 * Bulgaria / Cyprus / Malta as extra-EU.
 */
export const EU27_MEMBER_STATES: ReadonlySet<string> = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);
