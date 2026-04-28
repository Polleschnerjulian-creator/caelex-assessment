import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Preview-Mode — TEMPORARY developer convenience.
 *
 * Hard-coded ON via the PREVIEW_OPEN constant below. While active,
 * any authenticated visitor to /pharos is auto-provisioned a demo
 * AUTHORITY org + AuthorityProfile (idempotent), so they can poke
 * around the workspace without first running the seed script or
 * curling the admin endpoint.
 *
 * The mechanism: we drop the demo membership in with a
 * `joinedAt = epoch` (1970-01-01). Every Pharos page uses
 * `findFirst({ orderBy: { joinedAt: 'asc' } })` to resolve the
 * caller's org — with epoch-joinedAt the demo authority always wins,
 * so all existing pages and APIs work without modification.
 *
 * ⚠️  REMOVE BEFORE PROD:
 *     1. Set PREVIEW_OPEN below to `false` (one-line edit).
 *     2. (Optional) Delete the auto-created "Pharos Preview" org from
 *        the DB — or leave it, it's harmless once the flag is off.
 *     3. (Optional) Delete this file once we don't need preview-mode
 *        ergonomics for real demos.
 *
 * This file is intentionally isolated so reviewing the diff for
 * "what does the preview mode change?" is a one-file read.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEMO_ORG_SLUG = "pharos-preview";
const DEMO_ORG_NAME = "Pharos Preview Authority";
const EPOCH = new Date(0);

// 🚧 PREVIEW MODE TOGGLE — set to `false` before going to production.
//    No env-var, no redeploy dance: flip this constant, push, done.
const PREVIEW_OPEN = true;

// Demo guest credentials. Hard-coded ON PURPOSE: the auto-signin page
// needs to know them client-side to call NextAuth's signIn(). Safe
// because preview mode itself is the bypass — no real data is gated
// behind this account once PREVIEW_OPEN is false.
export const PHAROS_PREVIEW_DEMO_EMAIL = "preview-guest@caelex.local";
export const PHAROS_PREVIEW_DEMO_PASSWORD = "PharosPreviewGuest2026!";

export function isPharosPreviewOpen(): boolean {
  return PREVIEW_OPEN;
}

/**
 * Ensure the demo guest user exists. Used by /pharos-auto-signin
 * before it programmatically signs in. Idempotent.
 */
export async function ensurePharosPreviewDemoUser(): Promise<{
  id: string;
  email: string;
}> {
  const existing = await prisma.user.findUnique({
    where: { email: PHAROS_PREVIEW_DEMO_EMAIL },
    select: { id: true, email: true, password: true },
  });

  if (existing) {
    // Re-hash if the stored hash doesn't match — keeps the demo
    // account usable even if someone manually changed the password.
    const matches = existing.password
      ? await bcrypt.compare(PHAROS_PREVIEW_DEMO_PASSWORD, existing.password)
      : false;
    if (!matches) {
      const passwordHash = await bcrypt.hash(PHAROS_PREVIEW_DEMO_PASSWORD, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: passwordHash, isActive: true },
      });
    }
    return { id: existing.id, email: PHAROS_PREVIEW_DEMO_EMAIL };
  }

  const passwordHash = await bcrypt.hash(PHAROS_PREVIEW_DEMO_PASSWORD, 12);
  const created = await prisma.user.create({
    data: {
      email: PHAROS_PREVIEW_DEMO_EMAIL,
      name: "Pharos Preview Guest",
      password: passwordHash,
      role: "user",
      isActive: true,
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  });
  return { id: created.id, email: PHAROS_PREVIEW_DEMO_EMAIL };
}

/**
 * Idempotent setup. Safe to call on every /pharos request — each step
 * checks-then-creates so re-runs are cheap (~3 indexed lookups).
 */
export async function ensurePharosPreviewSetup(userId: string): Promise<void> {
  if (!isPharosPreviewOpen()) return;

  try {
    // 1. Demo AUTHORITY org
    let org = await prisma.organization.findUnique({
      where: { slug: DEMO_ORG_SLUG },
      select: { id: true, orgType: true, isActive: true },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          slug: DEMO_ORG_SLUG,
          name: DEMO_ORG_NAME,
          orgType: "AUTHORITY",
          isActive: true,
          plan: "FREE",
        },
        select: { id: true, orgType: true, isActive: true },
      });
    } else if (org.orgType !== "AUTHORITY" || !org.isActive) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: { orgType: "AUTHORITY", isActive: true },
        select: { id: true, orgType: true, isActive: true },
      });
    }

    // 2. Membership (OWNER) with epoch-joinedAt so findFirst orderBy
    //    asc always picks the demo over the user's other memberships.
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: org.id, userId },
      },
      select: { id: true, joinedAt: true, role: true },
    });

    if (!existingMember) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: "OWNER",
          joinedAt: EPOCH,
        },
      });
    } else if (
      existingMember.joinedAt.getTime() !== EPOCH.getTime() ||
      existingMember.role !== "OWNER"
    ) {
      await prisma.organizationMember.update({
        where: { id: existingMember.id },
        data: { joinedAt: EPOCH, role: "OWNER" },
      });
    }

    // 3. AuthorityProfile (preview defaults — user can edit on /pharos/setup)
    const profileExists = await prisma.authorityProfile.findUnique({
      where: { organizationId: org.id },
      select: { id: true },
    });

    if (!profileExists) {
      await prisma.authorityProfile.create({
        data: {
          organizationId: org.id,
          authorityType: "BAFA",
          jurisdiction: "DE",
          oversightCategories: [
            "COMPLIANCE_ASSESSMENTS",
            "AUTHORIZATION_WORKFLOWS",
            "DOCUMENTS",
            "TIMELINE_DEADLINES",
            "INCIDENTS",
          ],
          contactEmail: "preview@caelex.local",
          legalReference:
            "Preview-Mode · § 14 Weltraumgesetz (WRV) i.V.m. Art. 7 EU Space Act",
        },
      });
    }
  } catch (err) {
    // Don't ever break the page render — preview mode is a soft
    // ergonomic, not a hard requirement. Log + continue; the layout's
    // own redirect logic will handle the "still no AUTHORITY" case.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-preview] ensurePharosPreviewSetup failed: ${msg}`);
  }
}
