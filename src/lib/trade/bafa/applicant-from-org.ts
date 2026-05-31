/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * T-H9 fix — pure helper: build the BafaReportInput applicant block from
 * the Organization row and a (decrypted) TradeOrgProfileView.
 *
 * Rationale for a separate module:
 *   - Keeps the route handler thin and the mapping testable in isolation.
 *   - "Pure" means no Prisma access, no `fetch`, no side effects — same
 *     input always yields the same output, making snapshot tests viable.
 *   - The route calls `getProfile()` (which decrypts) and passes the
 *     view here; we NEVER touch the `*Enc` ciphertext columns directly.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { BafaReportInput } from "./report-builder";
import type { TradeOrgProfileView } from "@/lib/trade/settings/org-profile-service";

/**
 * The slice of the Organization Prisma row the route selects.
 * Kept as a local interface so this helper has no Prisma runtime dep.
 */
export interface OrgForApplicant {
  id: string;
  name: string;
  vatNumber?: string | null;
  billingAddress?: unknown;
}

/**
 * Safely pull a string value from an unknown JSON blob, trying multiple
 * key spellings. Returns undefined if none of the keys resolve to a
 * non-empty string.
 */
function pickStr(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/**
 * Build the full `BafaReportInput["applicant"]` block from an
 * Organization row and an optional (decrypted) TradeOrgProfileView.
 *
 * Design rules:
 *   - `profile` may be null (no `TradeOrgProfile` row yet, or the DB call
 *     failed) — caller must NOT throw; we degrade to fewer fields.
 *   - `billingAddress` is an untyped JSON blob — access it defensively
 *     with multiple candidate key spellings.
 *   - `addressCountry` always has a value: billingAddress.country if set,
 *     otherwise "DE" (BAFA is the German authority, so Germany is the
 *     correct default fallback).
 *   - We NEVER read the `*Enc` ciphertext columns — all sensitive fields
 *     come in already decrypted via `TradeOrgProfileView`.
 */
export function buildApplicant(
  org: OrgForApplicant,
  profile: TradeOrgProfileView | null,
): BafaReportInput["applicant"] {
  // ── Postal address from billingAddress JSON blob ──────────────────
  const addr =
    org.billingAddress !== null &&
    org.billingAddress !== undefined &&
    typeof org.billingAddress === "object"
      ? (org.billingAddress as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const addressStreet = pickStr(addr, "street", "addressStreet");
  const addressZip = pickStr(addr, "zip", "postalCode", "addressZip");
  const addressCity = pickStr(addr, "city", "addressCity");
  // Default to "DE" — BAFA filings always originate from Germany
  const addressCountry = pickStr(addr, "country", "addressCountry") ?? "DE";

  // ── BAFA contact from decrypted profile ───────────────────────────
  let contactPerson: string | undefined;
  let contactEmail: string | undefined;
  let contactPhone: string | undefined;

  if (profile) {
    if (profile.bafaContactName) {
      // Optionally append role for clarity on the BAFA filing
      contactPerson = profile.bafaContactRole
        ? `${profile.bafaContactName} (${profile.bafaContactRole})`
        : profile.bafaContactName;
    }
    contactEmail = profile.bafaContactEmail ?? undefined;
    contactPhone = profile.bafaContactPhone ?? undefined;
  }

  return {
    legalName: org.name,
    addressStreet,
    addressZip,
    addressCity,
    addressCountry,
    vatNumber: org.vatNumber ?? undefined,
    contactPerson,
    contactEmail,
    contactPhone,
    // bafaAktenzeichen is not stored in the current schema — omit (undefined)
  };
}
