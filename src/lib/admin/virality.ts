/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Efficiency — pure virality math (viral coefficient k + invite funnel).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The efficiency PAGE is a thin renderer and the efficiency ROUTE is a thin
 * reader; ALL of the virality arithmetic lives here as PURE, exported functions
 * so it can be unit-tested in isolation (no React, no DOM, no Prisma, no clock).
 * The route reads the `OrganizationInvitation` table READ-ONLY (it never emits a
 * new event), projects each row into the minimal {@link InviteRow} below, and
 * hands the array to {@link computeVirality} — deterministic given its inputs.
 *
 * This module also OWNS the virality slice of the efficiency API ⇄ UI contract
 * (the `Virality*` interfaces), co-located with the math exactly as
 * `steering-data.ts` / `growth-data.ts` do. The route and the page both import
 * from this single module so the compiler enforces the boundary.
 *
 * ─── What k means here ──────────────────────────────────────────────────────
 * The viral coefficient k = ACCEPTED invitations ÷ INVITING orgs in the window.
 * It is the average number of teammates each inviting organisation successfully
 * brought on board. We anchor the denominator to the DISTINCT organisations that
 * sent ≥1 invite in the window (not to the whole active base) because a tenant
 * that never invited anyone is not part of the viral loop — including silent
 * orgs would understate the loop's real strength. k ≥ 1 means the loop is
 * self-sustaining (every inviter, on average, lands at least one new seat).
 *
 * ─── The invite funnel ──────────────────────────────────────────────────────
 * `OrganizationInvitation` has NO `status` column — lifecycle is derived from
 * two timestamps:
 *   • acceptedAt != null            → ACCEPTED (the invite was redeemed)
 *   • acceptedAt == null & expired  → EXPIRED  (expiresAt is in the past, never
 *                                                accepted)
 *   • acceptedAt == null & !expired → PENDING  (still open, not yet redeemed)
 * So the honest funnel is SENT → ACCEPTED, with the un-accepted remainder split
 * into pending vs expired. We deliberately STOP at "accepted": whether an
 * accepted invitee went on to become an ACTIVE user is NOT derivable from this
 * table (it carries no back-reference to the resulting member's activity), and
 * the lane forbids inventing the "activated" step. The page surfaces that gap
 * honestly rather than fabricating an activation rate.
 *
 * HONESTY RULES (mirrored from steering-data.ts / growth-data.ts):
 *   • A ratio with a zero denominator is `null` (→ em-dash in the UI), NOT 0% —
 *     "no inviters yet" is different from "k = 0".
 *   • Every count is a real row tally; nothing is padded or randomised.
 *   • An empty invite table sets `isEmpty` so the page renders a friendly
 *     explainer instead of a wall of zeros / a misleading k of 0.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw input — the minimal shape the route projects each invitation row into.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One `OrganizationInvitation` row, projected to just the fields the virality
 * math needs. The route selects ONLY these columns (no email, no token) so the
 * shaper — and therefore the payload it feeds — is PII-free.
 *
 * All timestamps are epoch-millis (Date.getTime()) so the pure helper has no
 * Date/locale dependency and the tests can pass plain numbers. `acceptedAt` is
 * null for an invite that was never redeemed.
 */
export interface InviteRow {
  /** The inviting organisation's opaque id (the viral-loop actor). */
  organizationId: string;
  /** When the invite was created (epoch ms). Always present. */
  createdAtMs: number;
  /** When it expires (epoch ms). Used to classify an un-accepted invite. */
  expiresAtMs: number;
  /** When it was accepted (epoch ms), or null if never accepted. */
  acceptedAtMs: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public contract — the virality slice of the efficiency response.
// ─────────────────────────────────────────────────────────────────────────────

/** The SENT → ACCEPTED invite funnel, with the un-accepted remainder split. */
export interface InviteFunnel {
  /** Invitations created in the window (the funnel mouth). */
  sent: number;
  /** Of those, the ones that were ACCEPTED (acceptedAt set). */
  accepted: number;
  /** Un-accepted AND not yet expired (still open). */
  pending: number;
  /** Un-accepted AND expired (expiresAt in the past). */
  expired: number;
  /** accepted ÷ sent, 0..1 — or null when nothing was sent (no sample). */
  acceptanceRate: number | null;
}

/** The full virality view-model the efficiency page renders. */
export interface Virality {
  /**
   * Viral coefficient: accepted invitations per inviting org in the window.
   * `null` when no org sent an invite (the loop has no denominator yet — an
   * honest "—", never a fabricated 0). Rounded to 2 dp.
   */
  k: number | null;
  /** Distinct organisations that sent ≥1 invite in the window (k's denominator). */
  invitingOrgs: number;
  /** The SENT → ACCEPTED funnel. */
  funnel: InviteFunnel;
  /**
   * True when there is genuinely nothing to show — no invitations were sent in
   * the window. The page uses this to render a friendly empty state instead of
   * a k of "—" over a row of zeros.
   */
  isEmpty: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round a ratio to 2 dp, guarding non-finite inputs. Used for k (which can be
 * > 1) so the UI shows e.g. "1.34" without float-dust.
 */
function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Classify a single invite into exactly one funnel bucket, given "now" (epoch
 * ms). ACCEPTED takes precedence over expiry — an invite that was redeemed
 * before it lapsed is accepted, full stop, even if `expiresAt` is now in the
 * past. An un-accepted invite is EXPIRED when its `expiresAtMs <= now`, else
 * PENDING. Exported for direct unit-testing of the boundary.
 */
export function classifyInvite(
  row: InviteRow,
  nowMs: number,
): "accepted" | "pending" | "expired" {
  if (row.acceptedAtMs != null) return "accepted";
  // Un-accepted: expired the instant it reaches its expiry (inclusive).
  if (Number.isFinite(row.expiresAtMs) && row.expiresAtMs <= nowMs) {
    return "expired";
  }
  return "pending";
}

/**
 * Build the SENT → ACCEPTED funnel from the (already window-filtered) invite
 * rows. Pure: no clock — "now" is injected so expiry classification is
 * deterministic in tests. `acceptanceRate` is null (not 0) when nothing was
 * sent, so the UI shows an em-dash for the "no sample" case.
 */
export function buildInviteFunnel(
  rows: readonly InviteRow[],
  nowMs: number,
): InviteFunnel {
  let accepted = 0;
  let pending = 0;
  let expired = 0;
  for (const row of rows) {
    const bucket = classifyInvite(row, nowMs);
    if (bucket === "accepted") accepted += 1;
    else if (bucket === "pending") pending += 1;
    else expired += 1;
  }
  const sent = rows.length;
  return {
    sent,
    accepted,
    pending,
    expired,
    acceptanceRate: sent > 0 ? accepted / sent : null,
  };
}

/**
 * Count the DISTINCT inviting organisations across the rows (k's denominator).
 * An org appears once however many invites it sent — k measures "new seats per
 * INVITER", so each inviting org counts once regardless of invite volume.
 */
export function countInvitingOrgs(rows: readonly InviteRow[]): number {
  const orgs = new Set<string>();
  for (const row of rows) {
    if (row.organizationId) orgs.add(row.organizationId);
  }
  return orgs.size;
}

/**
 * Compute the full {@link Virality} view-model from the window's invite rows.
 *
 * PURE + total: returns a fresh object, tolerates an empty array, and applies
 * the honesty rules:
 *   • k is `null` when there are no inviting orgs (no denominator — an honest
 *     "—", not a fake 0).
 *   • `isEmpty` is true when nothing was sent in the window, so the page can
 *     show a single friendly note rather than a k of "—" over zeros.
 *
 * @param rows  invitations CREATED within the window (the route filters by
 *              `createdAt >= since` — k and the funnel both measure window
 *              cohort behaviour).
 * @param nowMs server "now" (epoch ms), injected for deterministic expiry.
 */
export function computeVirality(
  rows: readonly InviteRow[],
  nowMs: number,
): Virality {
  const funnel = buildInviteFunnel(rows, nowMs);
  const invitingOrgs = countInvitingOrgs(rows);
  // k = accepted seats landed per org that participated in the loop. Null when
  // no org invited anyone (the loop has no denominator to divide by).
  const k = invitingOrgs > 0 ? round2(funnel.accepted / invitingOrgs) : null;
  return {
    k,
    invitingOrgs,
    funnel,
    isEmpty: funnel.sent === 0,
  };
}
