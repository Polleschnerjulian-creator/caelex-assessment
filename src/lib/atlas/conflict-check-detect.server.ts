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
import { logger } from "@/lib/logger";
import { maskId } from "./log-masking";
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

interface PartyLite {
  id: string;
  name: string;
  type: string;
}

interface ScannedMandate {
  id: string;
  name: string;
  status: string;
  parties: PartyLite[];
}

/**
 * Pure match loop shared by the per-mandate scan (detectConflicts) and
 * the firm-wide scan (detectConflictsFirmWide). `cleared` keys are
 * `${matchedMandateId}::${normalizedName}` — the persisted clearance
 * pair key from AtlasConflictClearance.
 */
function collectConflictMatches(
  targetParties: PartyLite[],
  others: ScannedMandate[],
  cleared: ReadonlySet<string>,
): ConflictMatch[] {
  const matches: ConflictMatch[] = [];
  for (const np of targetParties) {
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

/**
 * Scan one organisation's mandates for conflicts of interest with the
 * parties of `mandateId`. Live-computed; persisted clearances for the same
 * (matchedMandate, normalizedName) pair are subtracted. Tenant-isolated:
 * only ever reads within `orgId`.
 */
export async function detectConflicts(args: {
  orgId: string;
  mandateId: string;
  /** When provided, the TARGET mandate lookup is gated on mandate
   *  membership (owner OR explicit member), matching the convention of
   *  every other Atlas mandate route. A non-member gets `[]` — no party
   *  names of a walled-off mandate leak. Omit only for trusted server-
   *  side firm-wide scans. The cross-mandate `others` scan stays
   *  org-wide by design (a conflict check must see matters you're not
   *  on). */
  callerUserId?: string;
}): Promise<ConflictMatch[]> {
  const { orgId, mandateId, callerUserId } = args;

  const target = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId: orgId,
      ...(callerUserId && {
        OR: [
          { ownerUserId: callerUserId },
          { members: { some: { userId: callerUserId } } },
        ],
      }),
    },
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

  return collectConflictMatches(target.parties, others, cleared);
}

/**
 * detectConflicts wrapped for write paths (mandate create, party
 * create/update — spec §7 detect-on-write): a conflict-check failure
 * must NEVER block the write. Logs the error (masked ids) and falls
 * back to `[]` so the route can always include a `conflicts` field.
 */
export async function detectConflictsOnWrite(args: {
  orgId: string;
  mandateId: string;
  callerUserId: string;
  /** Log prefix of the calling route, e.g. "[atlas/parties]". */
  logScope: string;
}): Promise<ConflictMatch[]> {
  const { logScope, ...detectArgs } = args;
  try {
    return await detectConflicts(detectArgs);
  } catch (err) {
    logger.error(`${logScope} conflict detect failed`, {
      mandateId: maskId(args.mandateId),
      userId: maskId(args.callerUserId),
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export interface FirmConflictGroup {
  mandateId: string;
  mandateName: string;
  conflicts: ConflictMatch[];
}

export interface FirmWideConflictResult {
  /** Detail groups — ONLY mandates the caller owns or is a member of.
   *  Mirrors the IDOR gate of the per-mandate conflicts route: a caller
   *  never sees party/matter details of a mandate they're walled off
   *  from. */
  groups: FirmConflictGroup[];
  /** Org-wide count of open conflicts across ALL active mandates,
   *  including mandates whose details the caller may not see. The §43a
   *  BRAO check is firm-wide — the alarm may count, the identities stay
   *  protected (same model as the legacy /api/atlas/conflict-check
   *  redaction). */
  totalOpenConflicts: number;
}

/**
 * Firm-wide conflict scan: open (un-cleared) conflicts of every ACTIVE
 * mandate of one organisation, grouped per mandate. Tenant-isolated.
 *
 * Two queries total (mandates+parties, clearances) — the O(n²) party
 * comparison runs in application code, which is bounded for the
 * boutique-kanzlei reality (<200 mandates/firm, see the sizing note in
 * /api/atlas/conflict-check). Per-target semantics are identical to
 * detectConflicts (same collectConflictMatches loop, same clearance
 * subtraction), so the per-mandate banner and the firm-wide view never
 * disagree.
 */
export async function detectConflictsFirmWide(args: {
  orgId: string;
  callerUserId: string;
}): Promise<FirmWideConflictResult> {
  const { orgId, callerUserId } = args;

  const mandates = await prisma.atlasMandate.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      status: true,
      ownerUserId: true,
      members: { select: { userId: true } },
      parties: { select: { id: true, name: true, type: true } },
    },
  });

  const clearances = await prisma.atlasConflictClearance.findMany({
    where: { organizationId: orgId },
    select: { mandateId: true, matchedMandateId: true, normalizedName: true },
  });
  const clearedByMandate = new Map<string, Set<string>>();
  for (const c of clearances) {
    let set = clearedByMandate.get(c.mandateId);
    if (!set) {
      set = new Set<string>();
      clearedByMandate.set(c.mandateId, set);
    }
    set.add(`${c.matchedMandateId}::${c.normalizedName}`);
  }

  const EMPTY: ReadonlySet<string> = new Set<string>();
  const groups: FirmConflictGroup[] = [];
  let totalOpenConflicts = 0;

  for (const target of mandates) {
    /* Firm-wide view lists conflicts OF active mandates only; closed /
       archived matters still participate as the EXISTING side inside
       collectConflictMatches (former-client rule), exactly like the
       per-mandate scan. */
    if (target.status !== "active") continue;
    if (target.parties.length === 0) continue;

    const others = mandates.filter((m) => m.id !== target.id);
    const matches = collectConflictMatches(
      target.parties,
      others,
      clearedByMandate.get(target.id) ?? EMPTY,
    );
    if (matches.length === 0) continue;

    totalOpenConflicts += matches.length;

    const callerHasAccess =
      target.ownerUserId === callerUserId ||
      target.members.some((m) => m.userId === callerUserId);
    if (callerHasAccess) {
      groups.push({
        mandateId: target.id,
        mandateName: target.name,
        conflicts: matches,
      });
    }
  }

  return { groups, totalOpenConflicts };
}
