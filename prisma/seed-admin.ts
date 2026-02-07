/**
 * Admin Seed Script
 *
 * Sets platform admin accounts.
 * Run with: npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAILS = ["julian@caelex.eu", "cs@ahrensandco.de"];

async function main() {
  console.log(`\n🔐 Setting admin accounts...\n`);

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      console.log(`⏭️  ${email} — not found (skipped)`);
      continue;
    }

    if (user.role === "admin") {
      console.log(`✅ ${email} — already admin`);
      continue;
    }

    await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });

    console.log(`✅ ${email} — set to admin`);
  }

  console.log(`\n   Done. Log out & back in for changes to take effect.\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
