import "server-only";

/**
 * Caelex Trade — Sample Data Seeder (U-CRIT-2 MVP).
 *
 * One-shot idempotent function that creates a representative slice of
 * Trade data for a fresh organisation so first-time operators have
 * something to click around before they manually enter their first
 * item. Inspired by Linear / Notion onboarding patterns.
 *
 * What gets seeded (clearly labelled "(Sample)" everywhere so users
 * can recognise + delete later):
 *   - 3 TradeItems covering different classification regimes:
 *       1. EO satellite payload — USML XV(a) / ECCN 9A515.a
 *       2. RF transponder — EAR 5A001.b dual-use
 *       3. Star tracker — uncontrolled EAR99 example
 *   - 2 TradeParties from different jurisdictions:
 *       1. German systems integrator (CLEAR)
 *       2. Indian academic institute (NOT_SCREENED, for triage flow)
 *   - 1 TradeOperation linking the EO payload to the German party
 *
 * Idempotency:
 *   If the org already has ANY TradeItem / TradeParty / TradeOperation,
 *   the seeder is a no-op. We never duplicate sample data.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";

export interface SeedResult {
  /** True when seed actually inserted rows; false when org already had data. */
  seeded: boolean;
  /** Per-entity counts of what was inserted (zero when seeded === false). */
  inserted: {
    items: number;
    parties: number;
    operations: number;
  };
}

/**
 * Seed a fresh org with sample Trade data. NO-OP if the org has any
 * pre-existing rows in TradeItem / TradeParty / TradeOperation.
 */
export async function seedSampleTradeData(
  orgId: string,
  userId: string,
): Promise<SeedResult> {
  // ── Idempotency gate ──
  const [itemCount, partyCount, opCount] = await Promise.all([
    prisma.tradeItem.count({ where: { organizationId: orgId } }),
    prisma.tradeParty.count({ where: { organizationId: orgId } }),
    prisma.tradeOperation.count({ where: { organizationId: orgId } }),
  ]);
  if (itemCount > 0 || partyCount > 0 || opCount > 0) {
    return {
      seeded: false,
      inserted: { items: 0, parties: 0, operations: 0 },
    };
  }

  // ── Items ──
  const items = await Promise.all([
    prisma.tradeItem.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "Optical Earth-observation payload (Sample)",
        description:
          "Sample item: high-resolution EO camera with 0.30 m GSD. Likely USML XV(a)(7)(i) ITAR-controlled + 9A515.a CCL dual-use.",
        internalSku: "SAMPLE-EO-001",
        manufacturerName: "Sample Optics GmbH",
        status: "REQUIRES_REVIEW",
        eccnUS: "9A515.a",
        usmlCategory: "XV(a)(7)(i)",
        eccnEU: "9A515.a",
        classificationSource: "USER_DECLARED",
      },
    }),
    prisma.tradeItem.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "X-band telemetry transponder (Sample)",
        description:
          "Sample item: 10 W X-band transponder for satellite TT&C. EAR-controlled 5A001.b.5 dual-use.",
        internalSku: "SAMPLE-RF-002",
        manufacturerName: "Sample RF Systems Ltd",
        status: "CLASSIFIED",
        eccnUS: "5A001.b.5",
        eccnEU: "5A001.b.5",
        classificationSource: "USER_DECLARED",
        classifiedAt: new Date(),
      },
    }),
    prisma.tradeItem.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "Star tracker (Sample)",
        description:
          "Sample item: commercial-grade star tracker for attitude determination. Typically uncontrolled — EAR99.",
        internalSku: "SAMPLE-STR-003",
        manufacturerName: "Sample Sensors AG",
        status: "CLASSIFIED",
        eccnUS: "EAR99",
        classificationSource: "USER_DECLARED",
        classifiedAt: new Date(),
      },
    }),
  ]);

  // ── Parties ──
  const parties = await Promise.all([
    prisma.tradeParty.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        legalName: "Beispiel Raumfahrt GmbH (Sample)",
        canonicalName: "beispiel raumfahrt",
        tradeName: "BeispielSpace",
        countryCode: "DE",
        screeningStatus: "CLEAR",
        lastScreenedAt: new Date(),
        isUSPerson: false,
      },
    }),
    prisma.tradeParty.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        legalName: "Sample Academic Institute (Sample)",
        canonicalName: "sample academic institute",
        countryCode: "IN",
        screeningStatus: "NOT_SCREENED",
        isUSPerson: false,
        isHighRiskCountry: false,
      },
    }),
  ]);

  // ── Operation ──
  // Wire the EO payload → German systems integrator. Reference uses
  // a "SAMPLE-" prefix so the operator can grep / filter sample data
  // later. We don't capture the return value — the side effect (row
  // creation) is what we want.
  await prisma.tradeOperation.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      reference: "SAMPLE-2026-Q1-001",
      description:
        "Sample operation: ship EO payload (USML XV) from DE to DE for integration into a customer satellite bus. Demonstrates the DRAFT → SCREENING → LICENSED → EXECUTED workflow.",
      operationType: "EXPORT",
      counterpartyId: parties[0].id,
      shipFromCountry: "DE",
      shipToCountry: "DE",
      declaredEndUse: "CIVIL",
      endUserName: "Beispiel Raumfahrt GmbH",
      endUserSector: "Satellite manufacturing",
      status: "DRAFT",
    },
  });

  return {
    seeded: true,
    inserted: {
      items: items.length,
      parties: parties.length,
      operations: 1,
    },
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
