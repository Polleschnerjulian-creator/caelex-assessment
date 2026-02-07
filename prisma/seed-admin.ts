/**
 * Admin Seed Script
 *
 * Sets julian@caelex.eu as platform admin.
 * Run with: npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "julian@caelex.eu";

async function main() {
  console.log(`\n🔐 Setting ${ADMIN_EMAIL} as platform admin...\n`);

  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${ADMIN_EMAIL}`);
    console.error("   Make sure you've signed up with this email first.\n");
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`✅ ${user.name || user.email} is already an admin.\n`);
    return;
  }

  const updated = await prisma.user.update({
    where: { email: ADMIN_EMAIL },
    data: { role: "admin" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`✅ Success! Updated user:`);
  console.log(`   Name:  ${updated.name}`);
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role:  ${updated.role}`);
  console.log(`\n   You can now access /dashboard/admin\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
