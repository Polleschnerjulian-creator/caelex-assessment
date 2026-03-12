/**
 * HUB Users Seed Script
 *
 * Creates or updates Julian and Niklas, ensuring both are
 * in the same organization and added to all HUB projects.
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
    role: "user" as const,
  },
];

const DEFAULT_PASSWORD = "Caelex2026!";
const ORG_NAME = "Caelex";

async function main() {
  console.log("\n🚀 Seeding HUB users...\n");

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // Upsert users
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

  // Ensure organization exists
  let org = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: ORG_NAME,
        slug: "caelex",
      },
    });
    console.log(`\n🏢 Created organization "${ORG_NAME}" — ${org.id}`);
  } else {
    console.log(`\n🏢 Organization "${ORG_NAME}" exists — ${org.id}`);
  }

  // Add both users to the organization
  for (const user of users) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        userId: user.id,
        role: user.role === "admin" ? "OWNER" : "MEMBER",
      },
    });
    console.log(`   → ${user.name} added to org`);
  }

  // Add both users to all HUB projects in the org
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
        update: {},
        create: {
          projectId: project.id,
          userId: user.id,
          role: "ADMIN",
        },
      });
    }
    console.log(`   → Both users added to project "${project.name}"`);
  }

  console.log("\n✅ Done!\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
