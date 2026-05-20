/**
 * Test Operator Seed Script
 *
 * Creates a self-contained Test-Operator account for end-to-end UI
 * testing of the Comply surface. Idempotent — running twice updates
 * the existing rows rather than failing.
 *
 * What it creates:
 *   - User  (credentials login, bcrypt-hashed password, useCase=operator)
 *   - Organization (PROFESSIONAL plan, orgType=OPERATOR, complyUiVersion=v2)
 *   - OrganizationMember (role=OWNER — full operator access, NOT platform admin)
 *   - Subscription (ACTIVE, PROFESSIONAL plan, 1-year period)
 *
 * Deliberately NOT created:
 *   - OperatorProfile (empty state — operator runs Day-1 magic moment first)
 *   - Mission / Spacecraft / Assessment data (empty state intended)
 *   - role="admin" (this is an org-OWNER, not a platform admin)
 *
 * Run:    npx tsx prisma/seed-test-operator.ts
 * Delete: npx tsx prisma/seed-test-operator.ts --delete
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Test Account Identity ─────────────────────────────────────────────

const TEST_EMAIL = "test-operator@caelex.eu";
const TEST_PASSWORD = "Operator2026!Test";
const TEST_NAME = "Test Operator";
const ORG_NAME = "Test Sat Operator GmbH";
const ORG_SLUG = "test-sat-operator";

async function main() {
  const shouldDelete = process.argv.includes("--delete");

  if (shouldDelete) {
    await deleteTestOperator();
    return;
  }

  console.log("\n🚀 Seeding Test Operator...\n");

  // 1. Hash password (bcrypt 12 rounds — same as the credentials provider).
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  // 2. Upsert User (idempotent).
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      name: TEST_NAME,
      password: passwordHash,
      isActive: true,
      role: "user", // NOT "admin" — this is an org-OWNER, not platform admin
      useCase: "operator",
      // Email pre-verified so credentials login works immediately.
      emailVerified: new Date(),
    },
    create: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      password: passwordHash,
      role: "user",
      useCase: "operator",
      emailVerified: new Date(),
      isActive: true,
      language: "en",
      theme: "dark",
    },
  });
  console.log(`  ✅ User       ${user.email}  (id=${user.id})`);

  // 3. Upsert Organization (idempotent on slug).
  // PROFESSIONAL plan = full Comply access. Plan duration: 1 year out.
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {
      name: ORG_NAME,
      plan: "PROFESSIONAL",
      planExpiresAt: oneYearFromNow(),
      maxUsers: 25,
      maxSpacecraft: 100,
      isActive: true,
      complyUiVersion: "v2",
      orgType: "OPERATOR",
    },
    create: {
      name: ORG_NAME,
      slug: ORG_SLUG,
      plan: "PROFESSIONAL",
      planExpiresAt: oneYearFromNow(),
      maxUsers: 25,
      maxSpacecraft: 100,
      isActive: true,
      complyUiVersion: "v2",
      orgType: "OPERATOR",
      timezone: "Europe/Berlin",
      defaultLanguage: "en",
      primaryColor: "#10B981",
    },
  });
  console.log(
    `  ✅ Organization  ${org.name}  (id=${org.id}, plan=${org.plan})`,
  );

  // 4. Upsert OrganizationMember (OWNER role).
  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
      permissions: [],
    },
  });
  console.log(`  ✅ Membership    role=${member.role}`);

  // 5. Upsert Subscription (ACTIVE, PROFESSIONAL).
  const subscription = await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {
      status: "ACTIVE",
      plan: "PROFESSIONAL",
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYearFromNow(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      organizationId: org.id,
      status: "ACTIVE",
      plan: "PROFESSIONAL",
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYearFromNow(),
      cancelAtPeriodEnd: false,
    },
  });
  console.log(
    `  ✅ Subscription  status=${subscription.status}, plan=${subscription.plan}, expires=${subscription.currentPeriodEnd?.toISOString().slice(0, 10)}`,
  );

  console.log("\n─────────────────────────────────────────────────");
  console.log("  TEST OPERATOR READY");
  console.log("─────────────────────────────────────────────────");
  console.log(`  Login at:  https://caelex.eu/login`);
  console.log(`  Email:     ${TEST_EMAIL}`);
  console.log(`  Password:  ${TEST_PASSWORD}`);
  console.log(`  Role:      OWNER (full Comply, NOT platform admin)`);
  console.log(`  Org:       ${ORG_NAME}`);
  console.log(`  Plan:      PROFESSIONAL (1 year)`);
  console.log("─────────────────────────────────────────────────");
  console.log("\n  ℹ️  Empty-state account — first surface should be");
  console.log("     /dashboard/today with the Day-1 Magic Moment hero.\n");
  console.log(
    "  ℹ️  Delete with:  npx tsx prisma/seed-test-operator.ts --delete\n",
  );
}

async function deleteTestOperator() {
  console.log("\n🗑️  Deleting test operator + org...\n");

  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
  });

  if (org) {
    // OrganizationMember + Subscription cascade via onDelete: Cascade.
    await prisma.organization.delete({ where: { id: org.id } });
    console.log(`  ✅ Organization deleted (${org.name})`);
  } else {
    console.log("  ⏭️  Organization not found");
  }

  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  ✅ User deleted (${user.email})`);
  } else {
    console.log("  ⏭️  User not found");
  }

  console.log("\n");
}

function oneYearFromNow(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:\n", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
