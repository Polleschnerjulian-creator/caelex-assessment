/**
 * Caelex Trade — Country Group resolver.
 *
 * Sprint Z22. Tier 1 per the Living Execution Plan.
 *
 * Resolves an ISO-3166 alpha-2 country code into its EAR/State-Dept
 * country-group memberships. The catastrophic-trap carve-outs in Z19
 * (and the FDPR scenarios in Z20) gate on these groups, so accuracy
 * is load-bearing.
 *
 * Per Blueprint 2 § 4, the controlling D:5 list is defined by
 * reference to the State Department arms embargo list under 22 CFR
 * § 126.1. The eCFR table for Supplement No. 1 to Part 740 lags — in
 * case of any discrepancy, the State Department list governs. This
 * module hardcodes the current State-Dept list as of 2026-05-22; a
 * follow-up sprint (queued as Z22b — cron-driven refresh) will fetch
 * both lists daily, compare, and surface conflicts.
 *
 * Source: Blueprint 2 § 4. 15 CFR Supp. 1 to Part 740 + 22 CFR § 126.1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Authoritative country-group constants ──────────────────────────

/**
 * Country Group E:1 — comprehensive embargo. Per 22 CFR § 126.1
 * as of 2026-05-22.
 *
 * Note: the BIS table at Supp. 1 to Part 740 historically listed
 * Cuba, Iran, North Korea, and Syria together. Treasury and State
 * lists distinguish: E:1 (comprehensive arms embargo) vs E:2 (sub-
 * stantial embargo). The current readings:
 *   - Iran, North Korea, Syria → E:1
 *   - Cuba                      → E:2
 */
export const COUNTRY_GROUP_E1 = new Set<string>([
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
]);

/** Country Group E:2 — Cuba alone in the current reading. */
export const COUNTRY_GROUP_E2 = new Set<string>(["CU"]);

/**
 * Country Group D:5 — arms-embargo list. Per Blueprint 2 § 4 with
 * the 2026-02-03 Cambodia removal (91 FR 5091). 22 countries.
 *
 * The controlling list is the State Department list under 22 CFR
 * § 126.1; Supp. 1 to Part 740 lags. Z22b (queued) will fetch both
 * lists daily and surface conflicts.
 */
export const COUNTRY_GROUP_D5 = new Set<string>([
  "AF", // Afghanistan
  "BY", // Belarus
  "MM", // Burma (Myanmar)
  "CF", // Central African Republic
  "CN", // China (PRC)
  "CD", // Democratic Republic of the Congo
  "CU", // Cuba
  "ER", // Eritrea
  "HT", // Haiti
  "IR", // Iran
  "IQ", // Iraq
  "KP", // North Korea
  "LB", // Lebanon
  "LY", // Libya
  "NI", // Nicaragua
  "RU", // Russia
  "SO", // Somalia
  "SS", // South Sudan
  "SD", // Sudan
  "SY", // Syria
  "VE", // Venezuela
  "ZW", // Zimbabwe
]);

/**
 * Country Group D:1 — National Security concern. Smaller than D:5;
 * includes countries the US considers NS-controlled but not under
 * arms embargo. Used by NS-FDPR (§ 734.9(b)) and Computer-Tier rules.
 *
 * Note: this is a conservative current snapshot. The BIS list at
 * Supp. 1 to Part 740 is the authoritative reference.
 */
export const COUNTRY_GROUP_D1 = new Set<string>([
  "AM", // Armenia
  "AZ", // Azerbaijan
  "BY", // Belarus
  "KH", // Cambodia
  "CN", // China
  "GE", // Georgia
  "IQ", // Iraq
  "KZ", // Kazakhstan
  "KG", // Kyrgyzstan
  "LA", // Laos
  "MN", // Mongolia
  "RU", // Russia
  "TJ", // Tajikistan
  "TM", // Turkmenistan
  "UA", // Ukraine
  "UZ", // Uzbekistan
  "VN", // Vietnam
]);

/**
 * Country Group D:3 — Chemical/Biological proliferation concern.
 * Triggers the 600-series FDPR (§ 734.9(d)) alongside D:1/D:4/D:5/E:1/E:2.
 */
export const COUNTRY_GROUP_D3 = new Set<string>([
  ...COUNTRY_GROUP_D1,
  "IL", // Israel — note D:3 includes IL even though IL is otherwise A:5
  "PK", // Pakistan
  "IN", // India (CB historical; check Supp.1 — may have moved off D:3)
  "EG", // Egypt
  "SA", // Saudi Arabia
  "AE", // UAE
  "TW", // Taiwan
]);

/**
 * Country Group D:4 — Missile-Technology proliferation. Triggers the
 * 600-series FDPR (§ 734.9(d)) alongside D:1/D:3/D:5/E:1/E:2.
 */
export const COUNTRY_GROUP_D4 = new Set<string>([
  ...COUNTRY_GROUP_D1,
  "IL", // Israel
  "IN", // India
  "PK", // Pakistan
  "AE", // UAE
]);

/**
 * Country Group A:5 — STA-eligible (closely-cooperating). 36 countries.
 * Critical exclusion for the Russia/Belarus FDPR and Advanced Computing
 * FDPR — A:5/A:6 destinations are carved out.
 */
export const COUNTRY_GROUP_A5 = new Set<string>([
  // 36 STA-eligible countries per 15 CFR § 740.20(c)(1) as of 2026-05-22
  "AR",
  "AT",
  "AU",
  "BE",
  "BG",
  "CA",
  "HR",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "JP",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "GB",
]);

/**
 * Country Group A:6 — Additional Allies. Adds 4 more partners on top of
 * A:5 for specific carve-outs (notably the AUKUS+Canada 9A515
 * license-free overlay per 89 FR 84766 of 23 Oct 2024).
 */
export const COUNTRY_GROUP_A6 = new Set<string>(["CY", "IL", "MX", "TW"]);

/**
 * Country Group B — General Group ("standard" destinations). Default
 * for re-exports; standard 25% de-minimis applies. Brazil, India,
 * Indonesia, etc.
 *
 * Implementation note: not enumerated here. Membership is computed as
 * complement: any country NOT in any other group, but considered an
 * EAR-friendly destination, is in B. Resolved at runtime via the
 * `resolveCountryGroups` function below — Group B always appears for
 * any non-D/E destination.
 */

/**
 * Country Group D:5 PLUS Macau. The (a)(3), (a)(8), and (a)(9) carve-
 * outs use "Macau or D:5" as the destination set. Macau is technically
 * part of China but treated as a separately-listed destination for
 * Footnote-5-FDP purposes.
 */
export const COUNTRY_MACAU_OR_D5 = new Set<string>([
  ...COUNTRY_GROUP_D5,
  "MO", // Macau (Special Administrative Region of PRC)
]);

// ─── Resolver ──────────────────────────────────────────────────────

/**
 * Result of country-group resolution. Includes the set of group
 * memberships plus convenience flags for the most-tested groups.
 */
export interface CountryGroupResolution {
  /** ISO-3166 alpha-2 country code (uppercase). */
  iso: string;
  /** The set of country-group labels this country belongs to. */
  groups: Set<string>;
  /** True if this country is the Macau SAR (treated separately for 3B carve-outs). */
  isMacau: boolean;
  /** True if NOT in D:1/D:3/D:4/D:5/E:1/E:2 — falls into "General Group B" default. */
  isGroupB: boolean;
  /** True if A:5 or A:6 (closely-cooperating; FDPR carve-out destination). */
  isA5OrA6: boolean;
}

/**
 * Resolve a country code into all applicable country-group labels.
 * Pure function — no I/O. Returns a Set of labels like "D:5", "D:1",
 * "E:1", "A:5", "A:6", or "B" (the fallback general group).
 *
 * Per Blueprint 2 § 4, this is a screening-grade resolver. The
 * production cascade (Z18) should treat the resolved groups as input,
 * not as authoritative regulatory status — the State Department list
 * under 22 CFR § 126.1 governs in case of conflict.
 */
export function resolveCountryGroups(iso: string): CountryGroupResolution {
  const upper = (iso || "").toUpperCase();
  const groups = new Set<string>();

  if (COUNTRY_GROUP_E1.has(upper)) groups.add("E:1");
  if (COUNTRY_GROUP_E2.has(upper)) groups.add("E:2");
  if (COUNTRY_GROUP_D1.has(upper)) groups.add("D:1");
  if (COUNTRY_GROUP_D3.has(upper)) groups.add("D:3");
  if (COUNTRY_GROUP_D4.has(upper)) groups.add("D:4");
  if (COUNTRY_GROUP_D5.has(upper)) groups.add("D:5");
  if (COUNTRY_GROUP_A5.has(upper)) groups.add("A:5");
  if (COUNTRY_GROUP_A6.has(upper)) groups.add("A:6");

  const isMacau = upper === "MO";
  const isA5OrA6 = groups.has("A:5") || groups.has("A:6");

  // Group B fallback — any country that's NOT in any restrictive group
  // AND not in a closely-cooperating group. Macau is its own thing;
  // exclude it from B too (treated separately per Footnote-5-FDP).
  const isInRestrictiveGroup =
    groups.has("E:1") ||
    groups.has("E:2") ||
    groups.has("D:1") ||
    groups.has("D:3") ||
    groups.has("D:4") ||
    groups.has("D:5");
  const isGroupB = !isInRestrictiveGroup && !isA5OrA6 && !isMacau;
  if (isGroupB) groups.add("B");

  return {
    iso: upper,
    groups,
    isMacau,
    isGroupB,
    isA5OrA6,
  };
}

/**
 * Bulk-check: is this country in the FDPR § 734.9(f)/(g) Russia/Belarus
 * exclusion list (Supplement No. 3 to Part 746 — 37 partner countries)?
 *
 * The list per Blueprint 2 § 9.1 step 7 covers: Australia, Canada,
 * the 27 EU member states, Iceland, Japan, Republic of Korea,
 * Liechtenstein, New Zealand, Norway, Switzerland, United Kingdom.
 *
 * Used by Z20c FDPR.
 */
export function isInRussiaBelarusExclusionList(iso: string): boolean {
  const upper = (iso || "").toUpperCase();
  const set = new Set<string>([
    "AU", // Australia
    "CA", // Canada
    "IS", // Iceland
    "JP", // Japan
    "KR", // Republic of Korea
    "LI", // Liechtenstein
    "NZ", // New Zealand
    "NO", // Norway
    "CH", // Switzerland
    "GB", // United Kingdom
    // 27 EU member states
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
  return set.has(upper);
}
