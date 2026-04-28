/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Schema-drift resilience helpers for `Organization.orgType`.
 *
 * Background: the orgType column was added to schema.prisma weeks
 * ago for the bilateral handshake (LAW_FIRM ↔ OPERATOR side
 * discrimination). The Vercel build:deploy pipeline tries to apply
 * schema changes via `prisma db push` but wraps it in `|| echo`,
 * so failed pushes have been silently dropped. Result: prod DB lacks
 * the column, and every endpoint that selects orgType crashes with
 * PrismaClientKnownRequestError.
 *
 * Until the migration lands, every consumer of orgType should route
 * through these helpers. They try the column read first, catch the
 * column-missing exception, and return null so callers can fall back
 * to permissive / heuristic logic.
 *
 * Once the column lands, the catch block becomes a no-op and the
 * helpers return the correct value — no caller-side change needed.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type OrgTypeValue = "OPERATOR" | "LAW_FIRM" | "BOTH";

/** Fetch a single org's type. Returns null on schema drift OR when
 *  the org id doesn't exist. */
export async function getOrgType(orgId: string): Promise<OrgTypeValue | null> {
  try {
    const o = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { orgType: true },
    });
    return (o?.orgType as OrgTypeValue) ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only swallow the schema-drift specific error. Anything else
    // (network, auth, etc.) should bubble — we don't want to mask
    // unrelated prisma issues.
    if (/orgtype.*does not exist|column.*orgtype/i.test(msg)) {
      logger.warn(
        `Schema drift: Organization.orgType column missing — auth checks degrade to permissive. Apply migration 20260425120000_add_organization_orgtype.`,
      );
      return null;
    }
    throw err;
  }
}

/** Derive a caller's bilateral side from their org type. Atlas-side
 *  iff orgType=LAW_FIRM. Returns null when orgType is BOTH (caller
 *  must decide which side they're acting on) OR when schema drift
 *  has hidden the column. Callers should fall back to matter-data
 *  heuristics in those cases. */
export async function getCallerSide(
  orgId: string,
): Promise<"ATLAS" | "CAELEX" | null> {
  const t = await getOrgType(orgId);
  if (t === "LAW_FIRM") return "ATLAS";
  if (t === "OPERATOR") return "CAELEX";
  // BOTH or null (drift) — caller decides via context
  return null;
}

/** Fetch the firm + client orgs for invite validation. Returns the
 *  full record with orgType when available; returns orgType: null
 *  on drift so callers can skip the type-shape validation. */
export async function findOrgForInvite(orgId: string): Promise<{
  id: string;
  isActive: boolean;
  name: string;
  orgType: OrgTypeValue | null;
} | null> {
  // First try the rich select. On column-missing, retry without
  // orgType so the existence + isActive checks still work.
  try {
    const o = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, orgType: true, isActive: true, name: true },
    });
    return o ? { ...o, orgType: o.orgType as OrgTypeValue } : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/orgtype.*does not exist|column.*orgtype/i.test(msg)) throw err;
    logger.warn(
      `Schema drift in findOrgForInvite — falling back to read without orgType.`,
    );
    const o = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, isActive: true, name: true },
    });
    return o ? { ...o, orgType: null } : null;
  }
}
