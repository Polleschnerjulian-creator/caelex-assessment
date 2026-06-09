/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side cross-screening wrapper (Sprint Z9c).
 *
 * Bridges the cascade engine with the Orbis UBO data layer. Loads the
 * existing ownership graph from Prisma + asks Orbis for the UBO tree
 * for the same target, then merges the two into one cascade input.
 *
 * Resilience: any Orbis failure (network, auth, not-found) is caught
 * and surfaces as `resolved: false` in the UBO summary. The cascade
 * still runs on the original TradePartyOwnership graph — we never
 * make the user wait for Orbis OR block the screening on Orbis errors.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  analyzeCascade,
  type AncestorSummary,
  type CascadeInput,
  type CascadeResult,
  type OwnershipEdgeSummary,
} from "./cascade-50pct";
import {
  getOrbisUboAdapter,
  OrbisEntityNotFoundError,
  UboSourceNotConfiguredError,
  type UboTree,
} from "./sources/orbis-ubo";
import {
  mergeUboTreeIntoCascade,
  type UboResolutionSummary,
} from "./cross-screening";

export interface CrossScreenInput {
  partyId: string;
  organizationId: string;
  maxDepth?: number;
}

export interface CrossScreenResult {
  cascade: CascadeResult | null;
  uboSummary: UboResolutionSummary;
}

/**
 * Run the 50%-rule cascade WITH Orbis UBO augmentation.
 *
 * Caller is responsible for org-scope authorization — pass `partyId`
 * only after verifying user access. This function trusts its inputs.
 *
 * Returns `cascade: null` when the party doesn't exist OR the org has
 * no edges + Orbis returned nothing meaningful — same convention as
 * the existing runCascadeForParty.
 */
export async function runCrossScreening(
  input: CrossScreenInput,
): Promise<CrossScreenResult> {
  const { partyId, organizationId, maxDepth } = input;

  const target = await prisma.tradeParty.findFirst({
    where: { id: partyId, organizationId },
    select: {
      id: true,
      legalName: true,
      countryCode: true,
      leiCode: true,
    },
  });

  if (!target) {
    return {
      cascade: null,
      uboSummary: emptyUboSummary(),
    };
  }

  // Load org-wide ownership graph in parallel with the Orbis fetch.
  const [allEdges, allParties, uboTree] = await Promise.all([
    prisma.tradePartyOwnership.findMany({
      where: {
        OR: [{ owner: { organizationId } }, { owned: { organizationId } }],
      },
      select: {
        ownerId: true,
        ownedId: true,
        percent: true,
        controlType: true,
      },
    }),
    prisma.tradeParty.findMany({
      where: { organizationId },
      select: {
        id: true,
        legalName: true,
        countryCode: true,
        screeningStatus: true,
        status: true,
      },
    }),
    tryFetchUboTree(target.leiCode ?? buildOrbisLookupKey(target)),
  ]);

  const baseEdges: OwnershipEdgeSummary[] = allEdges.map((e) => ({
    ownerId: e.ownerId,
    ownedId: e.ownedId,
    percent: e.percent,
    controlType: e.controlType,
  }));

  const baseSummaries = new Map<string, AncestorSummary>();
  for (const p of allParties) {
    baseSummaries.set(p.id, {
      id: p.id,
      legalName: p.legalName,
      countryCode: p.countryCode,
      screeningStatus: p.screeningStatus,
      isBlocked: p.status === "BLOCKED",
    });
  }

  const adapter = getOrbisUboAdapter();
  const merged = mergeUboTreeIntoCascade(
    baseEdges,
    baseSummaries,
    uboTree,
    target.id,
    adapter.name,
  );

  // If there are NO edges at all (real + UBO), skip the cascade entirely.
  if (merged.edges.length === 0) {
    return {
      cascade: null,
      uboSummary: merged.uboSummary,
    };
  }

  const cascadeInput: CascadeInput = {
    targetPartyId: target.id,
    edges: merged.edges,
    partySummaries: merged.partySummaries,
    maxDepth,
  };

  const cascade = analyzeCascade(cascadeInput);

  logger.info("runCrossScreening: completed", {
    partyId: target.id,
    cascadeHit: cascade.cascadeHit,
    uboResolved: merged.uboSummary.resolved,
    uboDepth: merged.uboSummary.depth,
    uboSanctioned: merged.uboSummary.sanctionedAncestorCount,
  });

  return {
    cascade,
    uboSummary: merged.uboSummary,
  };
}

/**
 * Build the lookup key passed to the Orbis adapter when we don't have
 * a definitive identifier (LEI / BvD ID). We use a composite "name +
 * country" string that the real adapter parses; the mock adapter
 * ignores it and only resolves by exact-match against ORBIS_FIXTURES.
 *
 * Format (mirrors the contract in orbis-ubo.ts):
 *   "name:{legalName}|country:{countryCode}"
 */
function buildOrbisLookupKey(target: {
  legalName: string;
  countryCode: string;
}): string {
  return `name:${target.legalName}|country:${target.countryCode}`;
}

/**
 * Fetch the UBO tree, swallowing not-found errors. Other errors
 * (auth, network) are logged + treated as "no tree" so screening can
 * proceed.
 */
async function tryFetchUboTree(lookupKey: string): Promise<UboTree | null> {
  try {
    const adapter = getOrbisUboAdapter();
    return await adapter.fetchUboTree(lookupKey);
  } catch (err) {
    if (err instanceof OrbisEntityNotFoundError) {
      // Quiet path — entity simply isn't in Orbis. Common case.
      return null;
    }
    if (err instanceof UboSourceNotConfiguredError) {
      // No real UBO source wired. The cascade proceeds on DECLARED ownership
      // only — ownership beyond declared edges is NOT checked. Logged
      // distinctly so this never silently reads as "UBO checked, clean".
      logger.warn(
        "tryFetchUboTree: UBO source not configured — cascade uses declared ownership only (indirect/UBO ownership NOT checked)",
        { lookupKey },
      );
      return null;
    }
    logger.warn(
      "tryFetchUboTree: UBO lookup failed — falling back to non-augmented cascade",
      { err: err instanceof Error ? err.message : String(err), lookupKey },
    );
    return null;
  }
}

function emptyUboSummary(): UboResolutionSummary {
  return {
    resolved: false,
    adapter: "",
    depth: 0,
    nodeCount: 0,
    edgeCount: 0,
    sanctionedAncestorCount: 0,
    pepAncestorCount: 0,
    confidence: 0,
    fetchedAt: "",
  };
}
