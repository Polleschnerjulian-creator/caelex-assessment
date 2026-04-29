/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * scripts/seed-pharos-workflow-demo.ts
 *
 * Erzeugt einen Demo-NIS2-Incident + einen Demo-EU-Space-Act-Authorisation-
 * Workflow gegen die erstbeste AUTHORITY-Org in der DB. Idempotent — bei
 * zweitem Lauf werden nur fehlende Cases ergänzt.
 *
 * Use:
 *   DATABASE_URL=<url> npx tsx scripts/seed-pharos-workflow-demo.ts
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

process.env.NEXT_RUNTIME = process.env.NEXT_RUNTIME || "nodejs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Pharos Workflow Demo Seeder");
  console.log("─".repeat(50));

  const authority = await prisma.authorityProfile.findFirst({
    where: { organization: { isActive: true } },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });
  if (!authority) {
    console.error("✗ keine aktive AuthorityProfile gefunden — abbruch");
    process.exit(1);
  }
  console.log(
    `✓ Authority: ${authority.organization.name} (${authority.authorityType}, ${authority.jurisdiction})`,
  );

  // Find any active oversight under this authority — if none, create
  // a synthetic one against any active operator org.
  let oversight = await prisma.oversightRelationship.findFirst({
    where: { authorityProfileId: authority.id, status: "ACTIVE" },
    select: { id: true, operatorOrgId: true, oversightTitle: true },
  });

  if (!oversight) {
    const operatorOrg = await prisma.organization.findFirst({
      where: {
        isActive: true,
        orgType: { not: "AUTHORITY" },
      },
      select: { id: true, name: true },
    });
    if (!operatorOrg) {
      console.error("✗ keine aktive Operator-Org für Oversight verfügbar");
      process.exit(1);
    }
    console.log(
      `· Erzeuge synthetische Aufsicht gegen ${operatorOrg.name} ...`,
    );
    const created = await prisma.oversightRelationship.create({
      data: {
        authorityProfileId: authority.id,
        operatorOrgId: operatorOrg.id,
        oversightTitle: "Demo-Aufsicht (workflow-seed)",
        legalReference: "Demo · seed-pharos-workflow-demo.ts",
        mandatoryDisclosure: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ_SUMMARY"],
          },
        ],
        voluntaryDisclosure: [],
        status: "ACTIVE",
        initiatedBy: "system:seed",
        acceptedAt: new Date(),
        acceptedBy: "system:seed",
        effectiveFrom: new Date(),
        effectiveUntil: new Date(Date.now() + 365 * 24 * 3600_000),
        handshakeHash: "seed:" + Date.now().toString(16),
      },
      select: { id: true, operatorOrgId: true, oversightTitle: true },
    });
    oversight = created;
  }
  console.log(`✓ Oversight: ${oversight.oversightTitle} (${oversight.id})`);

  const stats = { nis2: 0, auth: 0, skipped: 0 };

  // 1) NIS2-Incident demo
  const nis2Ref = "DEMO-NIS2-2026-001";
  const existingNis2 = await prisma.workflowCase.findFirst({
    where: { caseRef: nis2Ref, fsmId: "nis2-incident-v1" },
    select: { id: true },
  });
  if (!existingNis2) {
    await prisma.workflowCase.create({
      data: {
        fsmId: "nis2-incident-v1",
        caseRef: nis2Ref,
        oversightId: oversight.id,
        authorityProfileId: authority.id,
        operatorOrgId: oversight.operatorOrgId,
        currentState: "AwaitingEarlyWarning",
        // Set enteredStateAt 25h ago so SLA-Watchdog instantly auto-
        // transitions it to Breached24h on next tick.
        enteredStateAt: new Date(Date.now() - 25 * 3600_000),
        metadata: {
          severity: "major",
          summary: "Demo: TT&C-Link-Anomalie auf LEO-Mission",
        },
      },
    });
    console.log(`✓ Created NIS2-Incident ${nis2Ref}`);
    stats.nis2++;
  } else {
    console.log(`· NIS2-Incident ${nis2Ref} existiert bereits — skip`);
    stats.skipped++;
  }

  // 2) EU-Space-Act-Authorisation demo
  const authRef = "DEMO-AUTH-2026-001";
  const existingAuth = await prisma.workflowCase.findFirst({
    where: { caseRef: authRef, fsmId: "eu-space-act-authorisation-v1" },
    select: { id: true },
  });
  if (!existingAuth) {
    await prisma.workflowCase.create({
      data: {
        fsmId: "eu-space-act-authorisation-v1",
        caseRef: authRef,
        oversightId: oversight.id,
        authorityProfileId: authority.id,
        operatorOrgId: oversight.operatorOrgId,
        currentState: "AwaitingApproval",
        enteredStateAt: new Date(),
        metadata: {
          missionName: "Demo-Mission Alpha-1",
          operatorType: "SCO",
          summary:
            "Demo: Antrag auf Authorisation einer LEO-Constellation, 12 Satelliten",
        },
      },
    });
    console.log(
      `✓ Created Authorisation case ${authRef} (state=AwaitingApproval)`,
    );
    stats.auth++;
  } else {
    console.log(`· Authorisation case ${authRef} existiert bereits — skip`);
    stats.skipped++;
  }

  console.log("\n" + "─".repeat(50));
  console.log("Summary");
  console.log("─".repeat(50));
  console.log(
    `  NIS2 created: ${stats.nis2} · Auth created: ${stats.auth} · skipped: ${stats.skipped}`,
  );
  console.log(`\nNext step:`);
  console.log(
    `  Trigger /api/cron/pharos-workflow-sla once — the NIS2 case will`,
  );
  console.log(`  auto-transition to Breached24h, and the Auth case will get a`);
  console.log(
    `  fresh AUTHORIZATION_DECISION ApprovalRequest from the bridge.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
