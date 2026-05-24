/**
 * Caelex Trade — small format utilities.
 *
 * Currently provides:
 *   - humanizeEnum: SCREAMING_SNAKE_CASE → "Title Case With Spaces"
 *
 * Used everywhere a Prisma enum / API status string would otherwise be
 * shown raw to the user. Loud enum strings ("REQUIRES_REVIEW") look like
 * leaked DB values and signal "alpha software"; humanizing them is the
 * cheapest UX win in the product.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Convert a SCREAMING_SNAKE_CASE enum value to "Title Case With Spaces".
 *
 *   humanizeEnum("REQUIRES_REVIEW")           → "Requires Review"
 *   humanizeEnum("AWAITING_CLASSIFICATION")  → "Awaiting Classification"
 *   humanizeEnum("POTENTIAL_MATCH")          → "Potential Match"
 *   humanizeEnum("EXECUTED")                 → "Executed"
 *   humanizeEnum(null)                       → ""
 *
 * Optionally accepts a `labelOverrides` map for words that should NOT
 * follow standard title-case (e.g. acronyms, brand names):
 *
 *   humanizeEnum("AWAITING_CLASSIFICATION", { CLASSIFICATION: "AI Classification" })
 *
 * Pure function — safe to import in server + client.
 */
export function humanizeEnum(
  raw: string | null | undefined,
  labelOverrides: Record<string, string> = {},
): string {
  if (!raw) return "";

  // Apply whole-string override first (handles "VOLUNTARY_DISCLOSURE_FILED"
  // → "Self-Disclosure Filed", etc.)
  if (labelOverrides[raw]) return labelOverrides[raw];

  return raw
    .split("_")
    .map((word) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      // Word-level override
      if (labelOverrides[word]) return labelOverrides[word];
      // Preserve common acronyms that should stay uppercase
      if (PRESERVE_UPPER.has(word)) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Common compliance acronyms that should stay UPPERCASE post-humanize. */
const PRESERVE_UPPER = new Set([
  "ITAR",
  "EAR",
  "DDTC",
  "BIS",
  "BAFA",
  "OFAC",
  "ECCN",
  "USML",
  "NSG",
  "MTCR",
  "AWV",
  "AWG",
  "FDPR",
  "STA",
  "CSA",
  "AUKUS",
  "EUC",
  "AES",
  "ATLAS",
  "ELAN",
  "SDN",
  "EU",
  "US",
  "UK",
  "DE",
  "FR",
  "IT",
  "ES",
  "JP",
  "IN",
  "RU",
  "VSD",
  "RPO",
  "ISL",
  "AOCS",
  "TT",
  "TC",
  "RF",
  "AI",
  "ML",
  "FAA",
  "AST",
  "ECJU",
  "LOS",
  "DGFT",
  "METI",
  "SCOMET",
  "ID",
  "API",
  "UI",
]);

/**
 * Specialized humanizer for common Trade status enums with curated labels.
 * Use this when you want explicit human-friendly labels per status rather
 * than the generic title-case transform.
 */
export const TRADE_STATUS_LABELS: Readonly<Record<string, string>> = {
  // TradeItem.status
  DRAFT: "Draft",
  REQUIRES_REVIEW: "Requires Review",
  CLASSIFIED: "Classified",
  ARCHIVED: "Archived",

  // TradeParty.screeningStatus
  NOT_SCREENED: "Not Screened",
  CLEAR: "Clear",
  POTENTIAL_MATCH: "Potential Match",
  CONFIRMED_HIT: "Confirmed Hit",
  STALE: "Stale",

  // TradeOperation.status
  AWAITING_CLASSIFICATION: "Awaiting Classification",
  SCREENING: "Screening",
  AWAITING_LICENSE: "Awaiting License",
  LICENSED: "Licensed",
  EXECUTED: "Executed",
  BLOCKED: "Blocked",
  VOLUNTARY_DISCLOSURE_FILED: "Self-Disclosure Filed",

  // TradeLicense.status
  PENDING: "Pending",
  ACTIVE: "Active",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
  EXHAUSTED: "Exhausted",

  // TradeEUCRequest.status
  IN_PREPARATION: "In Preparation",
  ISSUED_TO_COUNTERPARTY: "Issued to Counterparty",
  AWAITING_SIGNATURE: "Awaiting Signature",
  VALIDATED: "Validated",
  EXPIRED_EUC: "Expired",
  REJECTED: "Rejected",
};

/**
 * Get a human-friendly label for a Trade status enum. Falls back to
 * generic humanizeEnum() if the value isn't in the curated map.
 */
export function tradeStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return TRADE_STATUS_LABELS[status] ?? humanizeEnum(status);
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
