import "server-only";

/**
 * Caelex Trade — Demo workspace seeder (ILA review item #1).
 *
 * One click gives a fresh org a realistic, self-explanatory sample
 * workspace so the product is demonstrable (booth, trial signups)
 * without hand-creating data:
 *
 *   - 3 items: a CLASSIFIED reaction wheel (9A004, USER_DECLARED — no AI
 *     call), a REQUIRES_REVIEW star tracker with an ASTRA_SUGGESTED code
 *     (demonstrates the four-eyes accept flow live), and an unclassified
 *     CFRP panel (demonstrates the live corpus matcher).
 *   - 2 counterparties: a clean Finnish operator and a party carrying the
 *     name of a REAL listed entity ("Rosneft Oil Company") so screening
 *     produces a genuine potential-match to triage. Both are screened
 *     with the REAL engine at seed time — statuses are derived, never
 *     faked (if the lists have never been synced the parties honestly
 *     stay UNVERIFIED/NOT_SCREENED).
 *   - 1 DRAFT export operation (DE → IN) with the classified wheel on a
 *     line, recomputed with the real engine so risk/catch-all flags are
 *     genuine.
 *   - 1 ACTIVE Sammelgenehmigung drawn to 85% of its value cap — feeds
 *     the hub's new utilization warning.
 *
 * EVERY row is prefixed "[DEMO] " — `removeDemoWorkspace` deletes by
 * that marker and nothing else. No schema change.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { toCents } from "@/lib/trade/money";
import { canonicalizeName } from "@/lib/comply-v2/trade/screening/sources/types";
import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { recomputeOperation } from "@/lib/comply-v2/trade/operations/recompute.server";

export const DEMO_PREFIX = "[DEMO] ";

export async function hasDemoWorkspace(
  organizationId: string,
): Promise<boolean> {
  const item = await prisma.tradeItem.findFirst({
    where: { organizationId, name: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  if (item) return true;
  const party = await prisma.tradeParty.findFirst({
    where: { organizationId, legalName: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  return party !== null;
}

export interface LoadDemoResult {
  alreadyLoaded: boolean;
  created?: {
    items: number;
    parties: number;
    operations: number;
    sammelgenehmigungen: number;
  };
}

export async function loadDemoWorkspace(
  organizationId: string,
  userId: string,
): Promise<LoadDemoResult> {
  if (await hasDemoWorkspace(organizationId)) {
    return { alreadyLoaded: true };
  }

  const now = new Date();
  const daysFromNow = (d: number) =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // ── Items ──────────────────────────────────────────────────────────
  const reactionWheel = await prisma.tradeItem.create({
    data: {
      organizationId,
      createdById: userId,
      name: `${DEMO_PREFIX}RW-250 Reaction Wheel`,
      internalSku: "DEMO-RW-250",
      manufacturerName: "Caelex Demo Systems GmbH",
      description:
        "Momentum-exchange reaction wheel for satellite attitude control " +
        "(AOCS). 0.25 Nms momentum storage, space-qualified bearings, " +
        "designed for LEO smallsat constellations.",
      countryOfOrigin: "DE",
      eccnEU: "9A004",
      status: "CLASSIFIED",
      classificationSource: "USER_DECLARED",
      classifiedAt: now,
      classifiedById: userId,
    },
  });

  await prisma.tradeItem.create({
    data: {
      organizationId,
      createdById: userId,
      name: `${DEMO_PREFIX}ST-40 Star Tracker`,
      internalSku: "DEMO-ST-40",
      manufacturerName: "Caelex Demo Systems GmbH",
      description:
        "Autonomous stellar attitude sensor (star tracker) with radiation-" +
        "tolerant detector, 40 arcsec accuracy, for spacecraft attitude " +
        "determination.",
      countryOfOrigin: "DE",
      eccnEU: "9A004",
      status: "REQUIRES_REVIEW",
      classificationSource: "ASTRA_SUGGESTED",
    },
  });

  await prisma.tradeItem.create({
    data: {
      organizationId,
      createdById: userId,
      name: `${DEMO_PREFIX}CFRP Structural Panel`,
      internalSku: "DEMO-PNL-CF",
      manufacturerName: "Caelex Demo Systems GmbH",
      description:
        "Carbon-fibre reinforced polymer (CFRP) sandwich panel for " +
        "satellite primary structure. Aerospace-grade prepreg layup, " +
        "aluminium honeycomb core.",
      countryOfOrigin: "DE",
      status: "DRAFT",
    },
  });

  // ── Parties ────────────────────────────────────────────────────────
  const cleanParty = await prisma.tradeParty.create({
    data: {
      organizationId,
      createdById: userId,
      legalName: `${DEMO_PREFIX}Aalto Orbital Oy`,
      countryCode: "FI",
      canonicalName: canonicalizeName("Aalto Orbital Oy"),
      addressLines: ["Otakaari 5", "02150 Espoo", "Finland"],
    },
  });

  // Deliberately carries a REAL listed entity's name so the screening
  // engine produces a genuine hit to triage (the [DEMO] marker keeps it
  // unmistakably sample data).
  const hitParty = await prisma.tradeParty.create({
    data: {
      organizationId,
      createdById: userId,
      legalName: `${DEMO_PREFIX}Rosneft Oil Company`,
      countryCode: "RU",
      canonicalName: canonicalizeName("Rosneft Oil Company"),
      isHighRiskCountry: true,
    },
  });

  // ── Operation (DRAFT, real recompute) ──────────────────────────────
  const operation = await prisma.tradeOperation.create({
    data: {
      organizationId,
      createdById: userId,
      reference: `${DEMO_PREFIX}EXP-2026-042`,
      description:
        "Export of two RW-250 reaction wheels to a satellite integrator " +
        "in India. Sample operation for walkthroughs — run the licence " +
        "check to see the dual-use verdict.",
      operationType: "EXPORT",
      counterpartyId: cleanParty.id,
      shipFromCountry: "DE",
      shipToCountry: "IN",
      endUseCountry: "IN",
      declaredEndUse: "CIVIL",
      endUserName: "Demo Satellite Integrator Pvt Ltd",
      lines: {
        create: [
          {
            itemId: reactionWheel.id,
            quantity: 2,
            unitValue: toCents(45000),
            unitCurrency: "EUR",
          },
        ],
      },
    },
  });

  // ── Sammelgenehmigung at 85% utilization (hub warning demo) ────────
  await prisma.tradeSammelgenehmigung.create({
    data: {
      organizationId,
      title: `${DEMO_PREFIX}AGG-12 Sammelgenehmigung`,
      bafaReference: "DEMO-AGG-12/2026",
      validFrom: daysFromNow(-90),
      validUntil: daysFromNow(275),
      allowedECCNs: ["9A004"],
      allowedDestinations: ["IN", "JP", "KR"],
      totalValueCapEur: toCents(250000),
      drawnDownValueEur: toCents(212500),
      status: "ACTIVE",
    },
  });

  // ── Derive real statuses (never faked) ─────────────────────────────
  // Screening + recompute run the genuine engines; failures degrade
  // honestly (NOT_SCREENED / DRAFT) instead of inventing state.
  await Promise.all([
    screenParty(cleanParty.id).catch((err) =>
      logger.warn("demo-workspace: screening clean party failed", {
        err: err instanceof Error ? err.message : String(err),
      }),
    ),
    screenParty(hitParty.id).catch((err) =>
      logger.warn("demo-workspace: screening hit party failed", {
        err: err instanceof Error ? err.message : String(err),
      }),
    ),
  ]);
  await recomputeOperation(operation.id, organizationId).catch((err) =>
    logger.warn("demo-workspace: operation recompute failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  return {
    alreadyLoaded: false,
    created: { items: 3, parties: 2, operations: 1, sammelgenehmigungen: 1 },
  };
}

export interface RemoveDemoResult {
  removed: {
    items: number;
    parties: number;
    operations: number;
    sammelgenehmigungen: number;
  };
}

export async function removeDemoWorkspace(
  organizationId: string,
): Promise<RemoveDemoResult> {
  // Order matters: lines → operations → items/parties/SAGs (FK safety
  // regardless of cascade configuration).
  const demoOps = await prisma.tradeOperation.findMany({
    where: { organizationId, reference: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const opIds = demoOps.map((o) => o.id);
  if (opIds.length > 0) {
    await prisma.tradeOperationLine.deleteMany({
      where: { operationId: { in: opIds } },
    });
  }
  const operations = await prisma.tradeOperation.deleteMany({
    where: { id: { in: opIds } },
  });
  const items = await prisma.tradeItem.deleteMany({
    where: { organizationId, name: { startsWith: DEMO_PREFIX } },
  });
  const parties = await prisma.tradeParty.deleteMany({
    where: { organizationId, legalName: { startsWith: DEMO_PREFIX } },
  });
  const sammelgenehmigungen = await prisma.tradeSammelgenehmigung.deleteMany({
    where: { organizationId, title: { startsWith: DEMO_PREFIX } },
  });

  return {
    removed: {
      items: items.count,
      parties: parties.count,
      operations: operations.count,
      sammelgenehmigungen: sammelgenehmigungen.count,
    },
  };
}
