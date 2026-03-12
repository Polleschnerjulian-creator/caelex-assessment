/**
 * Migration: Move ALL HUB data into the shared Caelex organization.
 *
 * Problem: Julian (3 accounts) and Niklas (2 accounts) created data
 * under different email accounts in separate orgs. The shared "Caelex"
 * org is empty.
 *
 * This script:
 * 1. Identifies all user accounts for Julian and Niklas
 * 2. Adds ALL accounts to the Caelex org
 * 3. Moves ALL HUB projects from other orgs to Caelex
 * 4. Adds all users to all projects
 *
 * Run with: npx tsx prisma/migrate-to-caelex-org.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All known accounts
const ALL_EMAILS = [
  "julian@caelex.eu",
  "cs@ahrensandco.de",
  "polleschnerjulian@gmail.com",
  "niklas@caelex.eu",
  "niklas0506wieczorek@gmail.com",
];

const CAELEX_ORG_ID = "cmmngncn7000213hsaf2dvtk6";

async function main() {
  console.log("\n🔄 Migrating all HUB data to Caelex org...\n");

  // 1. Find all user accounts
  const users = await prisma.user.findMany({
    where: { email: { in: ALL_EMAILS } },
    select: { id: true, name: true, email: true },
  });

  console.log("📋 Found users:");
  for (const u of users) {
    console.log(`   ${u.name} (${u.email}) — ${u.id}`);
  }

  // 2. Add ALL users to Caelex org
  console.log(`\n🏢 Adding all users to Caelex org (${CAELEX_ORG_ID})...`);
  for (const user of users) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: CAELEX_ORG_ID,
          userId: user.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        organizationId: CAELEX_ORG_ID,
        userId: user.id,
        role: "OWNER",
      },
    });
    console.log(`   ✅ ${user.name} (${user.email}) → Caelex`);
  }

  // 3. Make Caelex the PRIMARY org for all users (earliest joinedAt)
  console.log("\n🔑 Ensuring Caelex is the primary org for all users...");
  for (const user of users) {
    // Set Caelex membership joinedAt to very early date
    await prisma.organizationMember.updateMany({
      where: {
        organizationId: CAELEX_ORG_ID,
        userId: user.id,
      },
      data: {
        joinedAt: new Date("2020-01-01T00:00:00Z"),
      },
    });
    console.log(`   ✅ ${user.name} primary org = Caelex`);
  }

  // 4. Move ALL HUB projects from all orgs to Caelex
  const allProjects = await prisma.hubProject.findMany({
    include: {
      organization: { select: { id: true, name: true } },
      members: { select: { userId: true } },
      _count: { select: { tasks: true } },
    },
  });

  console.log(`\n📦 Found ${allProjects.length} HUB projects total:`);
  for (const p of allProjects) {
    const inCaelex = p.organizationId === CAELEX_ORG_ID;
    console.log(
      `   ${inCaelex ? "✅" : "⬆️"} "${p.name}" — ${p.organization.name} (${p._count.tasks} tasks, ${p.members.length} members)`,
    );

    if (!inCaelex) {
      // Move project to Caelex
      await prisma.hubProject.update({
        where: { id: p.id },
        data: { organizationId: CAELEX_ORG_ID },
      });
      console.log(`      → Moved to Caelex`);
    }

    // Add ALL users as project members
    for (const user of users) {
      const alreadyMember = p.members.some((m) => m.userId === user.id);
      if (!alreadyMember) {
        await prisma.hubProjectMember.create({
          data: {
            projectId: p.id,
            userId: user.id,
            role: "ADMIN",
          },
        });
        console.log(`      → Added ${user.name} as member`);
      }
    }
  }

  // 5. Move calendar events too (if any exist in other orgs)
  const movedEvents = await prisma.hubCalendarEvent.updateMany({
    where: { organizationId: { not: CAELEX_ORG_ID } },
    data: { organizationId: CAELEX_ORG_ID },
  });
  if (movedEvents.count > 0) {
    console.log(`\n📅 Moved ${movedEvents.count} calendar events to Caelex`);
  }

  // 6. Verify final state
  console.log("\n─── FINAL STATE ───");

  const caelexProjects = await prisma.hubProject.count({
    where: { organizationId: CAELEX_ORG_ID },
  });
  const caelexTasks = await prisma.hubTask.count({
    where: { project: { organizationId: CAELEX_ORG_ID } },
  });
  const caelexMembers = await prisma.organizationMember.count({
    where: { organizationId: CAELEX_ORG_ID },
  });

  console.log(
    `   🏢 Caelex org: ${caelexProjects} projects, ${caelexTasks} tasks, ${caelexMembers} members`,
  );

  // Verify getUserOrgId for all users
  for (const user of users) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
      select: { organizationId: true },
    });
    const correct = membership?.organizationId === CAELEX_ORG_ID;
    console.log(
      `   ${correct ? "✅" : "❌"} getUserOrgId(${user.name}) => ${membership?.organizationId ?? "null"} ${correct ? "" : "⚠️ WRONG!"}`,
    );
  }

  console.log("\n✅ Migration complete!\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
