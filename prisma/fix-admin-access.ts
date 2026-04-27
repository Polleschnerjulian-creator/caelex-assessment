/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * One-shot fix script for the five accounts that need full admin
 * access to Caelex. Idempotent — safe to run multiple times.
 *
 * For each account this script:
 *   1. Sets User.role = "admin"          (Platform-Admin)
 *   2. Sets User.isActive = true
 *   3. Sets User.onboardingCompleted = true   (skips the get-started
 *      redirect that triggers when a logged-in user has the flag false
 *      and no orgs)
 *   4. Ensures OWNER membership in the Caelex org (auto-creates if
 *      missing)
 *
 * Run with:
 *   DATABASE_URL=<prod-url> npx tsx prisma/fix-admin-access.ts
 *
 * Read the OUTPUT carefully — it lists every change applied. No
 * destructive writes; only role/flag escalation + membership upsert.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Authorized by the user — these five emails get full admin rights
// across Caelex. List is the canonical source of truth; adding a new
// admin requires adding the email here AND re-running the script.
const ADMIN_EMAILS = [
  "julian@caelex.eu",
  "cs@ahrensandco.de",
  "polleschnerjulian@gmail.com",
  "niklas@caelex.eu",
  "niklas0506wieczorek@gmail.com",
];

// Production Caelex org id (from migrate-to-caelex-org.ts).
const CAELEX_ORG_ID = "cmmngncn7000213hsaf2dvtk6";

async function main() {
  console.log(
    "\n═══════════════════════════════════════════════════════════════════",
  );
  console.log("  CAELEX — Fix admin access for the 5 authorized emails");
  console.log(
    "═══════════════════════════════════════════════════════════════════\n",
  );

  // Verify the Caelex org actually exists. If not, the membership
  // upsert below would fail with a foreign-key error — better to fail
  // fast with a clear message.
  const caelexOrg = await prisma.organization.findUnique({
    where: { id: CAELEX_ORG_ID },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!caelexOrg) {
    console.error(
      `❌ Caelex org with id ${CAELEX_ORG_ID} not found. The migrate-to-caelex-org.ts\n` +
        `   script may not have run yet, or the org id has changed.\n` +
        `   Run: npx tsx prisma/migrate-to-caelex-org.ts first, OR update CAELEX_ORG_ID\n` +
        `   in this file to the current id.\n`,
    );
    process.exit(1);
  }
  if (!caelexOrg.isActive) {
    console.error(
      `❌ Caelex org "${caelexOrg.name}" exists but is INACTIVE. Reactivate before\n` +
        `   running this script — owners of an inactive org are blocked from auth.\n`,
    );
    process.exit(1);
  }
  console.log(
    `▶  Target org: ${caelexOrg.name} (${caelexOrg.slug}) — id ${caelexOrg.id}\n`,
  );

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        onboardingCompleted: true,
        organizationMemberships: {
          where: { organizationId: CAELEX_ORG_ID },
          select: { role: true },
        },
      },
    });

    if (!user) {
      console.log(
        `⏭  ${email.padEnd(40)} not found — skipped (user must register first)`,
      );
      continue;
    }

    const changes: string[] = [];

    // 1. Platform-admin role
    if (user.role !== "admin") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
      changes.push(`role: ${user.role} → admin`);
    }

    // 2. Active flag
    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
      changes.push("isActive: false → true");
    }

    // 3. Onboarding-completed flag (otherwise dashboard redirects to
    //    /onboarding which displays as "Get Started")
    if (!user.onboardingCompleted) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      });
      changes.push("onboardingCompleted: false → true");
    }

    // 4. Caelex org membership — must be OWNER
    const existingMembership = user.organizationMemberships[0];
    if (!existingMembership) {
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: CAELEX_ORG_ID,
          role: "OWNER",
        },
      });
      changes.push("caelex-membership: created (OWNER)");
    } else if (existingMembership.role !== "OWNER") {
      await prisma.organizationMember.updateMany({
        where: {
          userId: user.id,
          organizationId: CAELEX_ORG_ID,
        },
        data: { role: "OWNER" },
      });
      changes.push(`caelex-membership: ${existingMembership.role} → OWNER`);
    }

    if (changes.length === 0) {
      console.log(
        `✅ ${email.padEnd(40)} already admin + OWNER + onboarded — no change`,
      );
    } else {
      console.log(`🔧 ${email.padEnd(40)} fixed:`);
      for (const c of changes) console.log(`     • ${c}`);
    }
  }

  console.log(
    "\n   Done. Affected users must log out + log back in for the new role to\n" +
      "   propagate into their JWT session.\n",
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
