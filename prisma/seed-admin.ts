/**
 * Admin Seed Script
 *
 * Sets platform admin accounts.
 * Run with: npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// C9 fix: no hardcoded defaults. A staging / fork env restored from a
// prod DB would otherwise silently elevate anyone who registered one of
// those emails. ADMIN_EMAILS must be explicitly set as an env var
// (comma-separated) — otherwise the script refuses to run.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
  console.error(
    "\n❌ ADMIN_EMAILS environment variable is empty or unset.\n" +
      "   Set it explicitly before running this script, e.g.:\n" +
      '   ADMIN_EMAILS="you@example.com,ops@example.com" npx tsx prisma/seed-admin.ts\n',
  );
  process.exit(1);
}

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
