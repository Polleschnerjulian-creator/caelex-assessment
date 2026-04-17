/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export const JURISDICTION_CODES = [
  // EU/EFTA (19)
  "DE",
  "FR",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
  // Priority Non-EU (10)
  "US",
  "IN",
  "AE",
  "SA",
  "BR",
  "JP",
  "SG",
  "AU",
  "CA",
  "ZA",
] as const;

export type JurisdictionCode = (typeof JURISDICTION_CODES)[number];

export function isJurisdictionCode(v: string): v is JurisdictionCode {
  return (JURISDICTION_CODES as readonly string[]).includes(v);
}
