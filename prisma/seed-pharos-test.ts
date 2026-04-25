/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pharos Test-Seed
 *
 * Idempotent seed script that sets up:
 *   1. A test AUTHORITY org ("BAFA — Test")
 *   2. A test user (default: pharos-test@caelex.local) as OWNER of that org
 *   3. An AuthorityProfile (BAFA, DE, all categories)
 *   4. A demo OversightRelationship to a randomly-picked existing
 *      OPERATOR org (if any exist) — gives you something to click in
 *      the dashboard heatmap
 *
 * Run:
 *   PHAROS_TEST_EMAIL="you@example.com" \
 *   PHAROS_TEST_PASSWORD="ChooseAStrongOne1!" \
 *   npx tsx prisma/seed-pharos-test.ts
 *
 * Re-running is safe: every step uses upsert / findFirst-then-create.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

const EMAIL = process.env.PHAROS_TEST_EMAIL ?? "pharos-test@caelex.local";
const PASSWORD =
  process.env.PHAROS_TEST_PASSWORD ??
  "PharosTest" + randomBytes(4).toString("hex") + "!";
const AUTH_ORG_NAME = process.env.PHAROS_TEST_ORG ?? "BAFA — Test (Pharos)";
const AUTH_ORG_SLUG = "bafa-test-pharos";

async function main() {
  console.log("\n🪔  Pharos test-seed starting…\n");

  // ─── 1. User ─────────────────────────────────────────────────────────
  console.log(`1/4  Test-User · ${EMAIL}`);
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, name: true, password: true },
  });

  let user: { id: string; email: string | null; name: string | null };
  let passwordWasSet = false;

  if (existing) {
    // Respect the existing user's password — they keep logging in with
    // their normal credentials. We just attach them to the AUTHORITY
    // org. This is the ergonomic path when the operator wants to test
    // Pharos without juggling a second account.
    console.log(`     · User existiert bereits — Passwort bleibt unverändert`);
    await prisma.user.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    user = existing;
  } else {
    // No user with that email yet → create one with a fresh password.
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: "Pharos Test-Officer",
        password: passwordHash,
        role: "user",
        isActive: true,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
    passwordWasSet = true;
    console.log(`     ✓ Neuer User angelegt`);
  }
  console.log(`     ✓ user.id = ${user.id}`);

  // ─── 2. AUTHORITY-Org ────────────────────────────────────────────────
  console.log(
    `\n2/4  AUTHORITY-Org anlegen / aktualisieren · ${AUTH_ORG_NAME}`,
  );
  let org = await prisma.organization.findUnique({
    where: { slug: AUTH_ORG_SLUG },
    select: { id: true, name: true, orgType: true, isActive: true },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        slug: AUTH_ORG_SLUG,
        name: AUTH_ORG_NAME,
        orgType: "AUTHORITY",
        isActive: true,
        // Defensive minimum required fields — keep this list small so
        // schema additions don't break the seed.
        plan: "FREE",
      },
      select: { id: true, name: true, orgType: true, isActive: true },
    });
  } else if (org.orgType !== "AUTHORITY" || !org.isActive) {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { orgType: "AUTHORITY", isActive: true },
      select: { id: true, name: true, orgType: true, isActive: true },
    });
  }
  console.log(`     ✓ org.id = ${org.id} (orgType = ${org.orgType})`);

  // Membership (OWNER)
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });
  console.log(`     ✓ membership: ${user.email} → OWNER of ${org.name}`);

  // ─── 3. AuthorityProfile ─────────────────────────────────────────────
  console.log(`\n3/4  AuthorityProfile anlegen / aktualisieren`);
  await prisma.authorityProfile.upsert({
    where: { organizationId: org.id },
    update: {
      authorityType: "BAFA",
      jurisdiction: "DE",
      oversightCategories: [
        "COMPLIANCE_ASSESSMENTS",
        "AUTHORIZATION_WORKFLOWS",
        "DOCUMENTS",
        "TIMELINE_DEADLINES",
        "INCIDENTS",
      ],
      contactEmail: EMAIL,
      legalReference: "§ 14 Weltraumgesetz (WRV) i.V.m. Art. 7 EU Space Act",
    },
    create: {
      organizationId: org.id,
      authorityType: "BAFA",
      jurisdiction: "DE",
      oversightCategories: [
        "COMPLIANCE_ASSESSMENTS",
        "AUTHORIZATION_WORKFLOWS",
        "DOCUMENTS",
        "TIMELINE_DEADLINES",
        "INCIDENTS",
      ],
      contactEmail: EMAIL,
      legalReference: "§ 14 Weltraumgesetz (WRV) i.V.m. Art. 7 EU Space Act",
    },
  });
  console.log("     ✓ profile: BAFA · DE · 5 oversight categories");

  // ─── 4. Optional: Demo Oversight zu existierenden Operator-Orgs ──────
  console.log(`\n4/4  Demo-Aufsichten anlegen (zu existierenden Operatoren)`);
  const profile = await prisma.authorityProfile.findUniqueOrThrow({
    where: { organizationId: org.id },
    select: { id: true },
  });

  const operators = await prisma.organization.findMany({
    where: { orgType: "OPERATOR", isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
    take: 3, // first three so we don't drown the demo with 50 rows
  });

  if (operators.length === 0) {
    console.log(
      "     ⚠ Keine OPERATOR-Orgs gefunden — Dashboard bleibt erstmal leer.",
    );
  } else {
    for (const op of operators) {
      const existing = await prisma.oversightRelationship.findFirst({
        where: {
          authorityProfileId: profile.id,
          operatorOrgId: op.id,
        },
        select: { id: true },
      });
      if (existing) {
        console.log(`     · ${op.name} → bereits Aufsicht angelegt`);
        continue;
      }
      const created = await prisma.oversightRelationship.create({
        data: {
          authorityProfileId: profile.id,
          operatorOrgId: op.id,
          oversightTitle: `Demo-Aufsicht: ${op.name}`,
          oversightReference: `BAFA-DEMO-${Math.floor(
            Math.random() * 9000 + 1000,
          )}`,
          legalReference: "§ 14 WRV i.V.m. Art. 7 EU Space Act",
          status: "ACTIVE",
          mandatoryDisclosure: [
            { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
            { category: "INCIDENTS", permissions: ["READ"] },
          ],
          voluntaryDisclosure: [],
          initiatedBy: user.id,
          acceptedBy: user.id,
          acceptedAt: new Date(),
          effectiveFrom: new Date(),
          effectiveUntil: new Date(
            Date.now() + 12 * 30 * 24 * 60 * 60 * 1000, // ~12 months
          ),
          // Without a real handshake we just put a marker hash so the
          // page that reads handshakeHash doesn't render "—". The
          // detail page makes clear this is a demo; real oversights
          // get their hash from initiateOversight + acceptOversight.
          handshakeHash: "demo:" + randomBytes(16).toString("hex"),
        },
        select: { id: true, oversightTitle: true },
      });
      console.log(`     ✓ ${op.name} → Aufsicht ${created.id}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log("\n✅  Pharos test-seed fertig.\n");
  console.log("   Login-Daten");
  console.log("   ───────────────────────────────────────");
  console.log(`   URL:      /pharos-login`);
  console.log(`   E-Mail:   ${EMAIL}`);
  if (passwordWasSet) {
    console.log(`   Passwort: ${PASSWORD}`);
  } else {
    console.log(`   Passwort: <bestehendes Passwort des Users>`);
  }
  console.log("   ───────────────────────────────────────");
  console.log(`   Org:      ${org.name}`);
  console.log(`   Rolle:    OWNER`);
  console.log("\n   👉  Nach dem Login → /pharos\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Pharos test-seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
