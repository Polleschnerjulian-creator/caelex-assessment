/**
 * prisma/list-atlas-access.ts
 *
 * One-shot read-only audit: who currently has access to /atlas?
 * Two sources:
 *   1. Hardcoded super-admins from src/lib/super-admin.ts — always
 *      pass the gate regardless of org-membership.
 *   2. Users with at least one OrganizationMember row in an active
 *      Organization of orgType LAW_FIRM or BOTH (see
 *      src/app/(atlas)/atlas/layout.tsx auth-gate logic).
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/list-atlas-access.ts
 *
 * Read-only — no writes, safe to run against production.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAILS = [
  "julian@caelex.eu",
  "niklas@caelex.eu",
  "polleschnerjulian@gmail.com",
  "niklas0506wieczorek@gmail.com",
] as const;

async function main() {
  console.log("\n┌─ ATLAS ACCESS AUDIT ───────────────────────────────────┐\n");

  /* ── 1. Super-admins ───────────────────────────────────────── */
  console.log("HARDCODED SUPER-ADMINS (bypass org-membership gate)\n");

  for (const email of SUPER_ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
      },
    });
    if (!user) {
      console.log(`  ⚠  ${email}  — no user record (never signed up)`);
      continue;
    }
    const status = user.isActive ? "✓" : "✗ INACTIVE";
    console.log(
      `  ${status}  ${user.email}  ${user.name ? `· ${user.name}` : ""}  · role=${user.role}`,
    );
  }

  /* ── 2. Org-membership-based access ────────────────────────── */
  console.log("\nORG-MEMBERSHIP ACCESS (LAW_FIRM or BOTH orgs only)\n");

  const memberships = await prisma.organizationMember.findMany({
    where: {
      organization: {
        isActive: true,
        orgType: { in: ["LAW_FIRM", "BOTH"] },
      },
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          orgType: true,
        },
      },
    },
    orderBy: [{ organization: { name: "asc" } }],
  });

  /* Group by org for readable output. */
  const byOrg = new Map<
    string,
    {
      org: (typeof memberships)[number]["organization"];
      members: typeof memberships;
    }
  >();
  for (const m of memberships) {
    const key = m.organization.id;
    const bucket = byOrg.get(key) ?? { org: m.organization, members: [] };
    bucket.members.push(m);
    byOrg.set(key, bucket);
  }

  if (byOrg.size === 0) {
    console.log(
      "  (none — no active LAW_FIRM/BOTH organizations have members)",
    );
  }

  for (const { org, members } of byOrg.values()) {
    console.log(
      `  ▸ ${org.name} [${org.orgType}] (slug: ${org.slug})  · ${members.length} member(s)`,
    );
    for (const m of members) {
      const userOk = m.user.isActive ? "✓" : "✗ INACTIVE";
      const roleStr = m.role.padEnd(7);
      console.log(
        `      ${userOk}  ${roleStr}  ${m.user.email}  ${m.user.name ? `· ${m.user.name}` : ""}`,
      );
    }
    console.log("");
  }

  /* ── Summary ───────────────────────────────────────────────── */
  const totalSuperAdmins = SUPER_ADMIN_EMAILS.length;
  const totalOrgMembers = memberships.length;
  const overlap = memberships.filter((m) =>
    SUPER_ADMIN_EMAILS.some((e) => e === m.user.email?.toLowerCase()),
  ).length;
  const distinct = totalSuperAdmins + totalOrgMembers - overlap;

  console.log("─────────────────────────────────────────────────────────");
  console.log(
    `  Super-admins (hardcoded): ${totalSuperAdmins}` +
      `\n  Org-membership entries:  ${totalOrgMembers}` +
      `\n  Overlap (both):          ${overlap}` +
      `\n  Distinct accounts:       ${distinct}`,
  );
  console.log("└─────────────────────────────────────────────────────────┘\n");
}

main()
  .catch((e) => {
    console.error("\n[atlas-access-audit] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
