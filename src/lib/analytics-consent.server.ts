/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Authoritative analytics-consent resolver (DSGVO Art. 7 / § 25 Abs. 1 TTDSG).
 * ────────────────────────────────────────────────────────────────────
 * Consent for analytics is triple-sourced today and the three sources can
 * disagree:
 *   1. localStorage['caelex-cookie-consent'] — read independently (and with
 *      slightly different parsing) by lib/analytics.ts, hooks/useAnalyticsTracking
 *      and components/ConditionalAnalytics. This is the CLIENT proof.
 *   2. UserConsent — typed per-user consent rows, but they store RAW ip/ua
 *      (contradicts the data-minimisation of source 3) and are only written
 *      once at signup.
 *   3. ConsentRecord — append-only, HASHED ip/ua/session proof log, written on
 *      EVERY banner decision incl. "revoke". This is the data-minimised
 *      server-side proof of record (lib/consent-log.ts).
 *
 * This module makes (3) ConsentRecord the single SERVER-SIDE authority: it
 * resolves the most-recent decision for a subject (by userId, or by hashed
 * session key for anonymous visitors) and honours a later "revoke".
 *
 * SCOPE NOTE — this unifies the *read*, it does not change runtime behaviour.
 *   The ingestion route (api/analytics/track) keeps its existing client-supplied
 *   `_consent` gate as the primary signal (so a consenting user whose decision
 *   has not yet reached ConsentRecord is not silently dropped). This resolver
 *   is consulted as the authoritative server-side cross-check and as the single
 *   helper the new analytics provider will call — so all server consumers read
 *   consent through ONE function instead of re-deriving it three different ways.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { hashSession } from "@/lib/consent-log";

/** Shape of a stored ConsentRecord.preferences payload. */
interface StoredPreferences {
  necessary?: boolean;
  analytics?: boolean;
  performance?: boolean;
  errorTracking?: boolean;
}

type ConsentReader = {
  consentRecord: {
    findFirst: (args: unknown) => Promise<{
      decision: string;
      preferences: unknown;
    } | null>;
  };
};

/**
 * Identify the subject whose analytics consent we are resolving. Provide a
 * `userId` for an authenticated subject, and/or a raw `sessionKey` (the
 * per-browser uuid in localStorage) for an anonymous visitor — it is hashed
 * here before it touches the DB, matching how ConsentRecord stores it.
 */
export interface AnalyticsConsentSubject {
  userId?: string | null;
  /** Raw per-browser session uuid (NOT hashed yet). */
  sessionKey?: string | null;
}

/**
 * Resolve whether a subject currently consents to analytics, reading the
 * hashed ConsentRecord proof log as the single source of truth.
 *
 * Most-recent-decision wins: a later "revoke" (or a customise/decline that
 * leaves analytics=false) overrides an earlier "accept_all". Returns `false`
 * when no record exists (no consent → no analytics), matching the conservative
 * default of every existing client reader.
 */
export async function hasAnalyticsConsent(
  subject: AnalyticsConsentSubject,
  reader: ConsentReader = defaultPrisma as unknown as ConsentReader,
): Promise<boolean> {
  const { userId, sessionKey } = subject;
  if (!userId && !sessionKey) return false;

  // Prefer the userId binding when present; fall back to the hashed session
  // key for anonymous visitors. We do NOT OR them together in one query so a
  // stale anonymous row cannot override a fresher authenticated decision.
  const where = userId
    ? { userId }
    : { sessionHashed: hashSession(sessionKey as string) };

  const latest = await reader.consentRecord.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    select: { decision: true, preferences: true },
  });

  if (!latest) return false;

  // An explicit revoke always denies, regardless of the stored preferences.
  if (latest.decision === "revoke") return false;

  const prefs = (latest.preferences ?? {}) as StoredPreferences;
  return prefs.analytics === true;
}

/**
 * Coarse helper mirroring the legacy client gate semantics used by the
 * ingestion route: turn a client-supplied consent string into a boolean.
 * Centralised here so the route stops hand-rolling the comparison.
 */
export function isAnalyticsConsentString(
  consent: string | null | undefined,
): boolean {
  return (
    typeof consent === "string" && consent !== "none" && consent !== "necessary"
  );
}
