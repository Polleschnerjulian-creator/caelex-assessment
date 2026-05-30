/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Mandate — Prisma-touching conflict scan. Split from the pure
 * conflict-check.server.ts so the matching logic stays DB-free and unit-
 * testable; this module wires it to the data.
 *
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  namesMatch,
  normalizePartyName,
  classifyConflict,
  type ConflictSeverity,
} from "./conflict-check.server";

export interface ConflictMatch {
  newPartyId: string;
  newPartyName: string;
  newPartyType: string;
  matchedPartyId: string;
  matchedPartyName: string;
  matchedPartyType: string;
  matchedMandateId: string;
  matchedMandateName: string;
  normalizedName: string;
  severity: ConflictSeverity;
}

/**
 * Scan one organisation's mandates for conflicts of interest with the
 * parties of `mandateId`. Live-computed; persisted clearances for the same
 * (matchedMandate, normalizedName) pair are subtracted. Tenant-isolated:
 * only ever reads within `orgId`.
 */
export async function detectConflicts(args: {
  orgId: string;
  mandateId: string;
}): Promise<ConflictMatch[]> {
  const { orgId, mandateId } = args;

  const target = await prisma.atlasMandate.findFirst({
    where: { id: mandateId, organizationId: orgId },
    select: {
      id: true,
      parties: { select: { id: true, name: true, type: true } },
    },
  });
  if (!target) return [];

  const others = await prisma.atlasMandate.findMany({
    where: { organizationId: orgId, id: { not: mandateId } },
    select: {
      id: true,
      name: true,
      status: true,
      parties: { select: { id: true, name: true, type: true } },
    },
  });

  const clearances = await prisma.atlasConflictClearance.findMany({
    where: { organizationId: orgId, mandateId },
    select: { matchedMandateId: true, normalizedName: true },
  });
  const cleared = new Set(
    clearances.map((c) => `${c.matchedMandateId}::${c.normalizedName}`),
  );

  const matches: ConflictMatch[] = [];
  for (const np of target.parties) {
    for (const m of others) {
      const existingClosed = m.status === "closed";
      for (const ep of m.parties) {
        if (!namesMatch(np.name, ep.name)) continue;
        const severity = classifyConflict({
          newType: np.type,
          existingType: ep.type,
          existingClosed,
        });
        if (!severity) continue;
        const normalizedName = normalizePartyName(np.name);
        if (cleared.has(`${m.id}::${normalizedName}`)) continue;
        matches.push({
          newPartyId: np.id,
          newPartyName: np.name,
          newPartyType: np.type,
          matchedPartyId: ep.id,
          matchedPartyName: ep.name,
          matchedPartyType: ep.type,
          matchedMandateId: m.id,
          matchedMandateName: m.name,
          normalizedName,
          severity,
        });
      }
    }
  }
  return matches;
}
