#!/usr/bin/env tsx
/**
 * One-time CRM migration script
 *
 * Imports all existing DemoRequests, ContactRequests, Bookings, and
 * Organizations into the CRM layer. Idempotent — safe to re-run.
 *
 * This script intentionally does NOT import from `*.server.ts` files
 * (which use `import "server-only"` and cannot run in a plain Node/tsx
 * context). Instead, it reimplements a minimal version of the auto-link
 * logic inline. The production auto-link runs in Next.js API routes.
 *
 * Run:
 *   export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/crm-migrate-existing.ts
 */

import { PrismaClient, type CrmOperatorType } from "@prisma/client";

const prisma = new PrismaClient();

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "protonmail.com",
  "proton.me",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "mail.com",
  "aol.com",
]);

function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

function splitName(name: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  if (!name) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function inferOperatorType(raw?: string | null): CrmOperatorType {
  if (!raw) return "OTHER";
  const s = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (s.includes("spacecraft") || s.includes("satellite") || s === "sco")
    return "SPACECRAFT_OPERATOR";
  if (s.includes("launch") && s.includes("site")) return "LAUNCH_SITE";
  if (s.includes("launch") || s === "lo") return "LAUNCH_PROVIDER";
  if (s.includes("inspace") || s === "isos" || s.includes("servicing"))
    return "IN_SPACE_SERVICE";
  if (s.includes("collision") || s === "tco") return "COLLISION_AVOIDANCE";
  if (s.includes("positional") || s === "lso") return "POSITIONAL_DATA";
  if (s.includes("government")) return "GOVERNMENT";
  if (s.includes("manufact")) return "HARDWARE_MANUFACTURER";
  if (s.includes("defense")) return "DEFENSE";
  if (s.includes("insur")) return "INSURANCE";
  if (s.includes("legal") || s.includes("consult")) return "LEGAL_CONSULTING";
  if (s.includes("startup")) return "STARTUP";
  return "OTHER";
}

async function upsertCompany(input: {
  name?: string | null;
  domain?: string;
  operatorType?: string | null;
  fundingStage?: string | null;
  isRaising?: boolean | null;
  website?: string | null;
}) {
  const name = input.name?.trim();
  if (input.domain && !FREE_EMAIL_DOMAINS.has(input.domain)) {
    const existing = await prisma.crmCompany.findUnique({
      where: { domain: input.domain },
    });
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (!existing.name && name) patch.name = name;
      if (!existing.operatorType && input.operatorType)
        patch.operatorType = inferOperatorType(input.operatorType);
      if (!existing.fundingStage && input.fundingStage)
        patch.fundingStage = input.fundingStage;
      if (existing.isRaising === null && input.isRaising !== undefined)
        patch.isRaising = input.isRaising;
      if (!existing.website && input.website) patch.website = input.website;
      if (Object.keys(patch).length > 0) {
        return prisma.crmCompany.update({
          where: { id: existing.id },
          data: patch,
        });
      }
      return existing;
    }
    return prisma.crmCompany.create({
      data: {
        name: name || input.domain,
        domain: input.domain,
        website: input.website || undefined,
        operatorType: inferOperatorType(input.operatorType),
        fundingStage: input.fundingStage,
        isRaising: input.isRaising ?? undefined,
      },
    });
  }
  if (name) {
    return prisma.crmCompany.create({
      data: {
        name,
        operatorType: inferOperatorType(input.operatorType),
        fundingStage: input.fundingStage,
        isRaising: input.isRaising ?? undefined,
      },
    });
  }
  return null;
}

async function upsertContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyId?: string;
  source: string;
  firstTouchAt: Date;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return null;

  const existing = await prisma.crmContact.findUnique({ where: { email } });

  if (existing) {
    const newSourceTags = Array.from(
      new Set([...existing.sourceTags, input.source]),
    );
    const update: Record<string, unknown> = { lastTouchAt: new Date() };
    if (newSourceTags.length !== existing.sourceTags.length) {
      update.sourceTags = newSourceTags;
    }
    if (!existing.firstName && input.firstName)
      update.firstName = input.firstName;
    if (!existing.lastName && input.lastName) update.lastName = input.lastName;
    if (!existing.title && input.title) update.title = input.title;
    if (!existing.companyId && input.companyId)
      update.companyId = input.companyId;
    if (
      !existing.firstTouchAt ||
      input.firstTouchAt.getTime() < existing.firstTouchAt.getTime()
    ) {
      update.firstTouchAt = input.firstTouchAt;
    }
    return prisma.crmContact.update({
      where: { id: existing.id },
      data: update,
    });
  }

  return prisma.crmContact.create({
    data: {
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      title: input.title,
      companyId: input.companyId,
      sourceTags: [input.source],
      firstTouchAt: input.firstTouchAt,
      lastTouchAt: input.firstTouchAt,
      lifecycleStage: "LEAD",
    },
  });
}

async function migrate() {
  console.log("─── CRM Migration ───");

  // 1. DemoRequests
  console.log("\n[1/4] Importing DemoRequests...");
  const demos = await prisma.demoRequest.findMany({
    include: { booking: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  Found ${demos.length} demo requests`);

  let demoSuccess = 0;
  for (const demo of demos) {
    try {
      const emailDomain = getEmailDomain(demo.email);
      const company = await upsertCompany({
        name: demo.company,
        domain: emailDomain || undefined,
        operatorType: demo.operatorType,
        fundingStage: demo.fundingStage,
        isRaising: demo.isRaising,
        website: demo.companyWebsite,
      });

      const names = splitName(demo.name);
      const contact = await upsertContact({
        email: demo.email,
        firstName: names.firstName,
        lastName: names.lastName,
        title: demo.role || undefined,
        companyId: company?.id,
        source: demo.booking ? "booking" : "demo",
        firstTouchAt: demo.createdAt,
      });

      if (!contact) continue;

      // Back-reference IDs
      await prisma.crmContact.update({
        where: { id: contact.id },
        data: {
          demoRequestIds: Array.from(
            new Set([...contact.demoRequestIds, demo.id]),
          ),
          ...(demo.booking && {
            bookingIds: Array.from(
              new Set([...contact.bookingIds, demo.booking.id]),
            ),
          }),
        },
      });

      // Activity
      await prisma.crmActivity.create({
        data: {
          type: demo.booking ? "MEETING_SCHEDULED" : "DEMO_REQUESTED",
          source: "IMPORT",
          summary: demo.booking
            ? `Demo booked (migrated): ${demo.booking.scheduledAt.toISOString().slice(0, 10)}`
            : `Demo requested (migrated): ${demo.createdAt.toISOString().slice(0, 10)}`,
          body: demo.message || undefined,
          contactId: contact.id,
          companyId: company?.id,
          occurredAt: demo.createdAt,
        },
      });

      // Create a deal if there's a company
      if (company) {
        const existingOpen = await prisma.crmDeal.findFirst({
          where: { companyId: company.id, status: "OPEN", deletedAt: null },
        });
        if (!existingOpen) {
          await prisma.crmDeal.create({
            data: {
              title: `Caelex Demo — ${company.name}`,
              companyId: company.id,
              primaryContactId: contact.id,
              stage: demo.booking ? "ENGAGED" : "IDENTIFIED",
              status: "OPEN",
              probability: demo.booking ? 15 : 5,
            },
          });
        }
      }

      demoSuccess++;
    } catch (err) {
      console.error(`  ✗ Failed for ${demo.email}:`, err);
    }
  }
  console.log(`  ✓ Imported ${demoSuccess}/${demos.length}`);

  // 2. ContactRequests
  console.log("\n[2/4] Importing ContactRequests...");
  const contacts = await prisma.contactRequest.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log(`  Found ${contacts.length} contact requests`);

  let crSuccess = 0;
  for (const cr of contacts) {
    try {
      const emailDomain = getEmailDomain(cr.email);
      const company = await upsertCompany({
        name: cr.company,
        domain: emailDomain || undefined,
      });

      const names = splitName(cr.name);
      const contact = await upsertContact({
        email: cr.email,
        firstName: names.firstName,
        lastName: names.lastName,
        companyId: company?.id,
        source: "contact",
        firstTouchAt: cr.createdAt,
      });

      if (!contact) continue;

      await prisma.crmContact.update({
        where: { id: contact.id },
        data: {
          contactRequestIds: Array.from(
            new Set([...contact.contactRequestIds, cr.id]),
          ),
        },
      });

      await prisma.crmActivity.create({
        data: {
          type: "CONTACT_FORM",
          source: "IMPORT",
          summary: `Contact form (migrated): ${cr.subject}`,
          body: cr.message,
          contactId: contact.id,
          companyId: company?.id,
          occurredAt: cr.createdAt,
          metadata: { subject: cr.subject },
        },
      });

      crSuccess++;
    } catch (err) {
      console.error(`  ✗ Failed for ${cr.email}:`, err);
    }
  }
  console.log(`  ✓ Imported ${crSuccess}/${contacts.length}`);

  // 3. Organizations → CrmCompany links
  console.log("\n[3/4] Linking Organizations to CrmCompanies...");
  const orgs = await prisma.organization.findMany({
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });
  console.log(`  Found ${orgs.length} organizations`);

  let linked = 0;
  for (const org of orgs) {
    try {
      const ownerEmail = org.members[0]?.user?.email;
      if (!ownerEmail) continue;

      const domain = ownerEmail.split("@")[1]?.toLowerCase();
      if (!domain) continue;

      const crmCompany = await prisma.crmCompany.findUnique({
        where: { domain },
      });
      if (crmCompany && !crmCompany.organizationId) {
        await prisma.crmCompany.update({
          where: { id: crmCompany.id },
          data: {
            organizationId: org.id,
            lifecycleStage: "CUSTOMER",
          },
        });
        linked++;
      }
    } catch (err) {
      console.error(`  ✗ Failed for org ${org.name}:`, err);
    }
  }
  console.log(`  ✓ Linked ${linked} organizations to companies`);

  // 4. Summary
  console.log("\n[4/4] Final counts:");
  const [companiesCount, contactsCount, dealsCount, activitiesCount] =
    await Promise.all([
      prisma.crmCompany.count({ where: { deletedAt: null } }),
      prisma.crmContact.count({ where: { deletedAt: null } }),
      prisma.crmDeal.count({ where: { deletedAt: null } }),
      prisma.crmActivity.count(),
    ]);

  console.log(`  CrmCompany:  ${companiesCount}`);
  console.log(`  CrmContact:  ${contactsCount}`);
  console.log(`  CrmDeal:     ${dealsCount}`);
  console.log(`  CrmActivity: ${activitiesCount}`);

  console.log(
    "\n✓ Migration complete. Lead scores will compute on first page load.",
  );
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
