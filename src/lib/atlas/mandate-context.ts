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
/* SEC-T0-1 step 2b — encryption-at-rest for mandate PII. This loader
   is the single choke-point for chat-engine + agent-mode mandate
   context, so decrypting here means both downstream paths get plaintext
   without needing per-callsite changes. */
import { decryptAtlasField } from "./atlas-encryption";

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
  const row = await prisma.atlasMandate.findFirst({
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
  if (!row) return null;
  /* SEC-T0-1: decrypt customInstructions + clientName. Parallel awaits
     because the two fields' decryption is independent. The chat-engine
     uses customInstructions to construct the per-mandate system-prompt
     prefix; if we returned ciphertext here the LLM would receive
     "org:...:..." garbage. */
  const [clientName, customInstructions] = await Promise.all([
    decryptAtlasField(row.clientName),
    decryptAtlasField(row.customInstructions),
  ]);
  return { ...row, clientName, customInstructions };
}
