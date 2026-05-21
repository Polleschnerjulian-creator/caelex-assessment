#!/usr/bin/env tsx
/**
 * One-time backfill for Caelex Trade Sprint T1.
 *
 * Populates the new `OrganizationProductAccess` ledger from existing
 * state so the multi-product gating layer has the same coverage as the
 * legacy `Organization.orgType` + `Subscription.plan` checks did:
 *
 *   - COMPLY  ← every isActive org with a non-FREE plan AND
 *               (no Subscription row OR subscription.status IN ACTIVE/TRIALING).
 *               Mirrors src/app/dashboard/SubscriptionGate.tsx exactly.
 *   - ATLAS   ← every isActive org where orgType ∈ {LAW_FIRM, BOTH}.
 *               Mirrors src/app/(atlas)/atlas/layout.tsx.
 *   - PHAROS  ← every isActive org where orgType = AUTHORITY.
 *               Mirrors src/app/(pharos)/pharos/layout.tsx.
 *
 * Idempotent: rows are upserted with empty `update: {}`, so re-running
 * after first execution is a no-op for existing rows. Source is always
 * stamped `LEGACY_BACKFILL` so we can later distinguish backfilled rows
 * from Stripe-driven or admin grants in audit queries.
 *
 * T1 itself does NOT switch any existing gate to consume this table —
 * SubscriptionGate, Atlas-layout and Pharos-layout still use their old
 * checks. This script just ensures the new ledger reflects current
 * reality so Sprint T2+ can start reading from it without surprises.
 *
 * Run:
 *   export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/backfill-product-access.ts
 *
 * Dry-run mode (counts what would happen, no DB writes):
 *   DRY_RUN=1 npx tsx scripts/backfill-product-access.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

async function backfillComply() {
  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      plan: { not: "FREE" },
      OR: [
        { subscription: null },
        { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
      ],
    },
    select: {
      id: true,
      subscription: {
        select: { stripeSubscriptionId: true, stripePriceId: true },
      },
    },
  });

  let inserted = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (DRY_RUN) {
      inserted += 1;
      continue;
    }
    const before = await prisma.organizationProductAccess.findUnique({
      where: {
        organizationId_product: { organizationId: org.id, product: "COMPLY" },
      },
      select: { id: true },
    });
    if (before) {
      skipped += 1;
      continue;
    }
    await prisma.organizationProductAccess.create({
      data: {
        organizationId: org.id,
        product: "COMPLY",
        status: "ACTIVE",
        source: "LEGACY_BACKFILL",
        stripeSubscriptionId: org.subscription?.stripeSubscriptionId ?? null,
        stripePriceId: org.subscription?.stripePriceId ?? null,
      },
    });
    inserted += 1;
  }

  return { product: "COMPLY", inserted, skipped, total: orgs.length };
}

async function backfillByOrgType(
  product: "ATLAS" | "PHAROS",
  orgTypes: ("OPERATOR" | "LAW_FIRM" | "AUTHORITY" | "BOTH")[],
) {
  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      orgType: { in: orgTypes },
    },
    select: { id: true },
  });

  let inserted = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (DRY_RUN) {
      inserted += 1;
      continue;
    }
    const before = await prisma.organizationProductAccess.findUnique({
      where: {
        organizationId_product: { organizationId: org.id, product },
      },
      select: { id: true },
    });
    if (before) {
      skipped += 1;
      continue;
    }
    await prisma.organizationProductAccess.create({
      data: {
        organizationId: org.id,
        product,
        status: "ACTIVE",
        source: "ORG_TYPE",
      },
    });
    inserted += 1;
  }

  return { product, inserted, skipped, total: orgs.length };
}

async function main() {
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Backfilling OrganizationProductAccess...\n`,
  );

  const results = [
    await backfillComply(),
    await backfillByOrgType("ATLAS", ["LAW_FIRM", "BOTH"]),
    await backfillByOrgType("PHAROS", ["AUTHORITY"]),
  ];

  for (const r of results) {
    console.log(
      `  ${r.product.padEnd(7)} candidates=${r.total}  inserted=${r.inserted}  already-present=${r.skipped}`,
    );
  }
  console.log(`\nDone.${DRY_RUN ? " (no writes — DRY_RUN=1)" : ""}\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
