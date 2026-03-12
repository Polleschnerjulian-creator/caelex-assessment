/**
 * HUB Users Seed Script
 *
 * Ensures Julian and Niklas are in the SAME organization.
 * Uses Julian's existing org (first by joinedAt) or creates one.
 * Removes stale org memberships, adds both to all HUB projects.
 *
 * Run with: npx tsx prisma/seed-hub-users.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERS = [
  {
    name: "Julian Polleschner",
    email: "julian@caelex.eu",
    role: "admin" as const,
  },
  {
    name: "Niklas",
    email: "niklas@caelex.eu",
    role: "admin" as const,
  },
];

const DEFAULT_PASSWORD = "Caelex2026!";

async function main() {
  console.log("\n🚀 Seeding HUB users...\n");

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // 1. Upsert users (both admin)
  const users = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        emailVerified: new Date(),
      },
    });
    users.push(user);
    console.log(`✅ ${user.name} (${user.email}) — ${user.id}`);
  }

  const [julian, niklas] = users;

  // 2. Find Julian's PRIMARY org (first by joinedAt — same logic as getUserOrgId)
  const julianMembership = await prisma.organizationMember.findFirst({
    where: { userId: julian.id },
    orderBy: { joinedAt: "asc" },
    include: { organization: true },
  });

  let org;
  if (julianMembership) {
    org = julianMembership.organization;
    console.log(`\n🏢 Using Julian's existing org: "${org.name}" — ${org.id}`);
  } else {
    // No org exists — create one
    org = await prisma.organization.create({
      data: { name: "Caelex", slug: "caelex" },
    });
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: julian.id,
        role: "OWNER",
      },
    });
    console.log(`\n🏢 Created org "Caelex" — ${org.id}`);
  }

  // 3. Add Niklas to Julian's org (upsert)
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: niklas.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: org.id,
      userId: niklas.id,
      role: "OWNER",
    },
  });
  console.log(`   → Niklas added to "${org.name}" as OWNER`);

  // 4. Remove Niklas from any OTHER orgs so getUserOrgId returns the shared one
  const niklasOtherMemberships = await prisma.organizationMember.findMany({
    where: { userId: niklas.id, organizationId: { not: org.id } },
    include: { organization: true },
  });
  for (const m of niklasOtherMemberships) {
    await prisma.organizationMember.delete({ where: { id: m.id } });
    console.log(`   → Removed Niklas from "${m.organization.name}"`);
  }

  // 5. Add both users to ALL HUB projects in the shared org
  const projects = await prisma.hubProject.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  });

  for (const project of projects) {
    for (const user of users) {
      await prisma.hubProjectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: user.id,
          },
        },
        update: { role: "ADMIN" },
        create: {
          projectId: project.id,
          userId: user.id,
          role: "ADMIN",
        },
      });
    }
    console.log(`   → Both users → project "${project.name}"`);
  }

  console.log("\n✅ Done! Both users share org and all projects.\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
