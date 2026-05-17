/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Shared mandate-membership check (Q03 dedup, 2026-05-17).
 *
 * Used by every Atlas API route that needs to gate a write operation
 * on mandate-membership (deadlines POST, time-entries POST, parties
 * POST, knowledge POST when mandateId provided, etc.).
 *
 * The check is "is this user the owner of mandate `mandateId` in org
 * `organizationId` OR an explicit member?" Returns true/false.
 *
 * IMPORTANT: this is a SEPARATE-QUERY check (find first, then act).
 * For atomic membership-gated mutations, prefer building the relation
 * filter inline into updateMany/deleteMany (see deadlines/[deadlineId]
 * route for the pattern — AUDIT-FIX C03). This helper is for routes
 * where the mutation itself can't accept a relation filter (e.g.
 * Prisma `create` on a child table that needs the parent first).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

export async function checkMandateMembership(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const hit = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!hit;
}
