/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Shared mandate-context loader (Q05 dedup, 2026-05-17).
 *
 * Used by both:
 *   - chat-engine.server.ts (regular chat with attached mandate)
 *   - api/atlas/agent/route.ts (agent-mode with attached mandate)
 *
 * Both call-sites previously defined this verbatim. Any schema change
 * to AtlasMandate (e.g. adding `caseNumber`) had to be applied twice.
 *
 * Returns `null` when the mandate doesn't exist OR the caller is not
 * the owner / a member — same observable behaviour as the previous
 * inline versions (membership-gate is via the OR-relation filter).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

export interface ResolvedMandateContext {
  id: string;
  name: string;
  customInstructions: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  clientName: string | null;
}

export async function loadMandateContext(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<ResolvedMandateContext | null> {
  /* Membership gate: caller must be owner OR explicit member.
     Org-scope is enforced as belt-and-suspenders. */
  return prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      customInstructions: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      clientName: true,
    },
  });
}
