/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Diagnostic — list all platform-admins and all org-owners.
 *
 * Read-only. Run with:
 *   DATABASE_URL=<prod-url> npx tsx prisma/list-admins-and-owners.ts
 *
 * Output is structured for quick audit before the next user-management
 * pass: (1) which accounts have global admin powers, (2) which accounts
 * own which orgs, (3) any test/seed accounts that leaked into prod.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "\n═══════════════════════════════════════════════════════════════════",
  );
  console.log("  CAELEX — Admin & Owner Audit");
  console.log(
    "═══════════════════════════════════════════════════════════════════\n",
  );

  // ─── 1. Platform admins (User.role === "admin") ──────────────────
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { email: "asc" },
  });

  console.log(`▶  Platform admins (User.role = "admin"): ${admins.length}\n`);
  for (const a of admins) {
    const flags: string[] = [];
    if (!a.isActive) flags.push("INACTIVE");
    if (!a.emailVerified) flags.push("UNVERIFIED");
    const last = a.lastLoginAt
      ? a.lastLoginAt.toISOString().slice(0, 10)
      : "never";
    console.log(
      `   ${a.email.padEnd(40)} ${(a.name ?? "(no name)").padEnd(25)} last-login=${last}${
        flags.length ? "  " + flags.join(",") : ""
      }`,
    );
  }
  console.log("");

  // ─── 2. Test / seed accounts (regardless of role) ───────────────
  const testEmails = ["atlas-demo@caelex.local", "pharos-test@caelex.local"];
  const testAccounts = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      memberships: {
        select: {
          role: true,
          organization: { select: { name: true, slug: true, orgType: true } },
        },
      },
    },
  });

  console.log(
    `▶  Test / seed accounts (should be reviewed): ${testAccounts.length}\n`,
  );
  for (const t of testAccounts) {
    console.log(
      `   ${t.email.padEnd(35)} role=${t.role}  active=${t.isActive}`,
    );
    for (const m of t.memberships) {
      console.log(
        `      → ${m.role.padEnd(8)} of ${m.organization.name} (${m.organization.slug}, type=${m.organization.orgType})`,
      );
    }
  }
  console.log("");

  // ─── 3. Org owners (OrganizationMember.role === "OWNER") ────────
  const owners = await prisma.organizationMember.findMany({
    where: { role: "OWNER" },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: { email: true, name: true, isActive: true, role: true },
      },
      organization: {
        select: {
          name: true,
          slug: true,
          orgType: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ organization: { name: "asc" } }, { joinedAt: "asc" }],
  });

  console.log(
    `▶  Org owners (OrganizationMember.role = "OWNER"): ${owners.length}\n`,
  );

  // Group by org
  const byOrg = new Map<string, Array<(typeof owners)[number]>>();
  for (const o of owners) {
    const key = `${o.organization.name} | ${o.organization.slug} | ${o.organization.orgType} | active=${o.organization.isActive}`;
    if (!byOrg.has(key)) byOrg.set(key, []);
    byOrg.get(key)!.push(o);
  }

  for (const [orgKey, members] of byOrg) {
    console.log(`   ${orgKey}`);
    for (const m of members) {
      const userFlag = m.user.role === "admin" ? "  [PLATFORM-ADMIN]" : "";
      const inactive = !m.user.isActive ? "  INACTIVE-USER" : "";
      console.log(
        `      ${m.user.email.padEnd(38)} ${(m.user.name ?? "(no name)").padEnd(22)} joined=${m.joinedAt.toISOString().slice(0, 10)}${userFlag}${inactive}`,
      );
    }
    console.log("");
  }

  // ─── 4. Sanity checks ───────────────────────────────────────────
  const orgsWithoutOwner = await prisma.organization.findMany({
    where: {
      isActive: true,
      members: { none: { role: "OWNER" } },
    },
    select: { name: true, slug: true, orgType: true },
  });
  if (orgsWithoutOwner.length > 0) {
    console.log(`⚠  Active orgs with NO owner: ${orgsWithoutOwner.length}`);
    for (const o of orgsWithoutOwner) {
      console.log(`   ${o.name} (${o.slug}, ${o.orgType})`);
    }
    console.log("");
  }

  const inactiveAdmins = admins.filter((a) => !a.isActive);
  if (inactiveAdmins.length > 0) {
    console.log(
      `⚠  INACTIVE platform admins (cannot log in but still hold privilege): ${inactiveAdmins.length}`,
    );
    for (const a of inactiveAdmins) console.log(`   ${a.email}`);
    console.log("");
  }

  console.log(
    "═══════════════════════════════════════════════════════════════════\n",
  );
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
