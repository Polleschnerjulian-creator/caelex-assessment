/**
 * prisma/bho-members.ts
 *
 * Ad-hoc audit: list every member of any organization whose name
 * contains "BHO" (case-insensitive). Read-only.
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/bho-members.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: "BHO", mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      slug: true,
      orgType: true,
      isActive: true,
      members: {
        select: {
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  });

  if (orgs.length === 0) {
    console.log("\n⚠ Kein Org mit 'BHO' im Namen gefunden.\n");
    return;
  }

  for (const org of orgs) {
    console.log(
      `\n▸ ${org.name} [${org.orgType}]` +
        `\n  id:     ${org.id}` +
        `\n  slug:   ${org.slug}` +
        `\n  active: ${org.isActive ? "yes" : "NO"}` +
        `\n  members (${org.members.length}):`,
    );
    if (org.members.length === 0) {
      console.log("    (none)");
      continue;
    }
    for (const m of org.members) {
      const stat = m.user.isActive ? "✓" : "✗ INACTIVE";
      console.log(
        `    ${stat}  ${m.role.padEnd(7)}  ${m.user.email}` +
          `${m.user.name ? `  · ${m.user.name}` : ""}` +
          `  · userId=${m.user.id}`,
      );
    }
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n[bho-members] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
