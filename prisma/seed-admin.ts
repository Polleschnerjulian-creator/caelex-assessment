/**
 * Admin Seed Script
 *
 * Sets platform admin accounts.
 * Run with: npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import { getSuperAdminEmails } from "../src/lib/super-admin";

const prisma = new PrismaClient();

// Super-admin allowlist (lib/super-admin.ts) is the source of truth
// for platform-owner accounts — those are *always* trusted at the
// code level regardless of the DB row's role. This script promotes
// any of those that already have User rows so the DB reflects reality.
//
// Additional admins via ADMIN_EMAILS env var (comma-separated). Used
// for one-off staff promotions without a code change. The two sources
// are merged + deduped.
const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean)
  .map((e) => e.toLowerCase());

const ADMIN_EMAILS = Array.from(
  new Set([...getSuperAdminEmails(), ...ENV_ADMIN_EMAILS]),
);

if (ADMIN_EMAILS.length === 0) {
  console.error(
    "\n❌ No admin emails found.\n" +
      "   Add to lib/super-admin.ts (preferred) or set ADMIN_EMAILS env var.\n",
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
