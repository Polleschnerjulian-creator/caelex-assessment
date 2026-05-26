import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Shared mandate-scaffold-context loader (T0.1.c, 2026-05-26).
 *
 * Pulls everything a draft scaffold typically needs from a single
 * mandate query — parties grouped by type, header metadata,
 * customInstructions, lawyer-owner. Returns null when the mandateId
 * is missing OR the user has no access (membership-gated via the
 * same relation filter used everywhere else).
 *
 * Extracted from `atlas-tool-executor.ts` so it can be shared
 * between:
 *   - The drafting tools still inside the executor (draft_schriftsatz,
 *     draft_mandantenbrief, etc. — pending T0.1.h extraction)
 *   - The templates bundle (templates-tools.server.ts — T0.1.c)
 *
 * Parallel to `mandate-context.ts` which loads chat-style context.
 * The naming reflects the use case: this loader provides everything
 * needed to assemble a DOCUMENT SCAFFOLD (parties block, header
 * fields, customInstructions). The chat-context loader provides the
 * lighter metadata for SYSTEM-PROMPT INJECTION.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";

export interface MandateScaffoldContext {
  id: string;
  name: string;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  clientName: string | null;
  clientContact: string | null;
  customInstructions: string | null;
  parties: {
    id: string;
    type: string;
    name: string;
    role: string | null;
    contact: string | null;
    address: string | null;
    reference: string | null;
  }[];
  ownerName: string | null;
  ownerEmail: string | null;
}

export async function loadMandateScaffoldContext(args: {
  mandateId: string | null | undefined;
  callerUserId: string;
  callerOrgId: string;
}): Promise<MandateScaffoldContext | null> {
  if (!args.mandateId) return null;
  const m = await prisma.atlasMandate.findFirst({
    where: {
      id: args.mandateId,
      organizationId: args.callerOrgId,
      OR: [
        { ownerUserId: args.callerUserId },
        { members: { some: { userId: args.callerUserId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      clientName: true,
      clientContact: true,
      customInstructions: true,
      parties: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          name: true,
          role: true,
          contact: true,
          address: true,
          reference: true,
        },
      },
      owner: { select: { name: true, email: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    jurisdiction: m.jurisdiction,
    operatorType: m.operatorType,
    primaryAuthority: m.primaryAuthority,
    clientName: m.clientName,
    clientContact: m.clientContact,
    customInstructions: m.customInstructions,
    parties: m.parties,
    ownerName: m.owner?.name ?? null,
    ownerEmail: m.owner?.email ?? null,
  };
}
