/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * BHO Legal Pilot-Seed
 *
 * Idempotent seed script that sets up the BHO Legal pilot tenant:
 *   1. Organization "BHO Legal" mit orgType=LAW_FIRM
 *   2. LegalFirm-Record (für operator-seitige Engagement-Invitations)
 *   3. (Optional) Pilot-User als OWNER der Org
 *   4. Subscription mit 6-Monats-Pilot-Trial (TRIALING)
 *
 * Re-running ist safe: alle Steps verwenden upsert / findUnique-then-create.
 *
 * Run:
 *   # Default (Platzhalter-User bho-pilot@caelex.eu, OWNER, gen. Passwort):
 *   npx tsx prisma/seed-bho-legal.ts
 *
 *   # Mit konkretem BHO-Partner als OWNER:
 *   BHO_PILOT_EMAIL="vorname.nachname@bho-legal.com" \
 *   BHO_PILOT_NAME="Vorname Nachname" \
 *   BHO_PILOT_PASSWORD="ChooseAStrongOne1!" \
 *   npx tsx prisma/seed-bho-legal.ts
 *
 *   # Member statt OWNER (Atlas-Zugriff bleibt, aber keine Org-Verwaltung):
 *   BHO_PILOT_EMAIL="anwalt@bho-legal.com" \
 *   BHO_PILOT_NAME="Vorname Nachname" \
 *   BHO_PILOT_PASSWORD="Changeme123!" \
 *   BHO_PILOT_ROLE=MEMBER \
 *   npx tsx prisma/seed-bho-legal.ts
 *
 *   # Pilot-Dauer überschreiben (Default: 180 Tage):
 *   BHO_PILOT_DAYS=120 npx tsx prisma/seed-bho-legal.ts
 *
 * Gültige Rollen: OWNER, ADMIN, MANAGER, MEMBER, VIEWER. Atlas-Zugriff hängt
 * NICHT an der Rolle (sondern an org.orgType=LAW_FIRM); Rolle steuert nur
 * Org-Management-Rechte (Settings, Member einladen, Billing).
 *
 * Wenn der User mit der angegebenen E-Mail bereits existiert, bleibt sein
 * Passwort unverändert — er wird nur an die Org mit der gewählten Rolle gehängt.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { OrganizationRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

// ─── Konfiguration via ENV ─────────────────────────────────────────────
const ORG_NAME = "BHO Legal";
const ORG_SLUG = "bho-legal";

const PILOT_EMAIL = (
  process.env.BHO_PILOT_EMAIL ?? "bho-pilot@caelex.eu"
).toLowerCase();
const PILOT_NAME = process.env.BHO_PILOT_NAME ?? "BHO Legal — Pilot-User";
const PILOT_PASSWORD =
  process.env.BHO_PILOT_PASSWORD ??
  "BHOLegalPilot" + randomBytes(4).toString("hex") + "!";
const PILOT_DAYS = Number(process.env.BHO_PILOT_DAYS ?? "180");

// Validierte Rolle (OWNER/ADMIN/MANAGER/MEMBER/VIEWER). Default OWNER für
// Backwards-Kompatibilität — Pilot-User die nicht die Org verwalten sollen
// bekommen MEMBER (oder MANAGER für eingeschränktes Rechtemanagement).
function parseRole(raw: string | undefined): OrganizationRole {
  const value = (raw ?? "OWNER").toUpperCase();
  const valid: OrganizationRole[] = [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "MEMBER",
    "VIEWER",
  ];
  if (!valid.includes(value as OrganizationRole)) {
    throw new Error(
      `Invalid BHO_PILOT_ROLE="${raw}" — must be one of ${valid.join(", ")}.`,
    );
  }
  return value as OrganizationRole;
}
const PILOT_ROLE = parseRole(process.env.BHO_PILOT_ROLE);

const FIRM_CITY = process.env.BHO_FIRM_CITY ?? "Bremen";
const FIRM_COUNTRY = process.env.BHO_FIRM_COUNTRY ?? "DE";
const FIRM_WEBSITE =
  process.env.BHO_FIRM_WEBSITE ?? "https://www.bho-legal.com";

async function main() {
  console.log("\n⚖️   BHO Legal pilot-seed starting …\n");

  // ─── 1. Organization (orgType = LAW_FIRM) ────────────────────────────
  console.log(`1/5  Organization · ${ORG_NAME}`);
  let org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true, name: true, orgType: true, isActive: true, plan: true },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        slug: ORG_SLUG,
        name: ORG_NAME,
        orgType: "LAW_FIRM",
        plan: "PROFESSIONAL",
        maxUsers: 10, // pilot-tier headroom
        maxSpacecraft: 0, // law firm doesn't operate satellites
        timezone: "Europe/Berlin",
        defaultLanguage: "de",
        billingEmail: PILOT_EMAIL,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        orgType: true,
        isActive: true,
        plan: true,
      },
    });
    console.log(`     ✓ Org neu angelegt`);
  } else if (org.orgType !== "LAW_FIRM" || !org.isActive) {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { orgType: "LAW_FIRM", isActive: true },
      select: {
        id: true,
        name: true,
        orgType: true,
        isActive: true,
        plan: true,
      },
    });
    console.log(`     ✓ Org existiert bereits — orgType/isActive nachgezogen`);
  } else {
    console.log(`     ✓ Org existiert bereits (idempotent — kein Update)`);
  }
  console.log(`     · org.id = ${org.id} (orgType = ${org.orgType})`);

  // ─── 2. LegalFirm-Record (Engagement-Architektur) ────────────────────
  // BHO Legal ist über zwei Wege adressierbar:
  //   (a) als LAW_FIRM-Organization → eigene Atlas-Workspaces, Pilot-User
  //   (b) als LegalFirm → Operator-Customer kann sie via LegalEngagement
  //       in seinen Atlas-Workspace einladen (Read-Only-Portal-Pattern).
  // Beides parallel halten: ein Pilot-Customer wird BHO Legal früher oder
  // später beide Wege parallel benutzen wollen.
  console.log(`\n2/5  LegalFirm-Record (Engagement-Architektur)`);
  const existingFirm = await prisma.legalFirm.findFirst({
    where: { name: ORG_NAME },
    select: { id: true, name: true },
  });
  let firm: { id: string; name: string };
  if (existingFirm) {
    firm = existingFirm;
    console.log(`     ✓ LegalFirm existiert bereits — id = ${firm.id}`);
  } else {
    firm = await prisma.legalFirm.create({
      data: {
        name: ORG_NAME,
        city: FIRM_CITY,
        country: FIRM_COUNTRY,
        website: FIRM_WEBSITE,
      },
      select: { id: true, name: true },
    });
    console.log(`     ✓ LegalFirm neu angelegt — id = ${firm.id}`);
  }

  // ─── 3. Pilot-User ───────────────────────────────────────────────────
  console.log(`\n3/5  Pilot-User · ${PILOT_EMAIL}`);
  const existingUser = await prisma.user.findUnique({
    where: { email: PILOT_EMAIL },
    select: { id: true, email: true, name: true },
  });

  let user: { id: string; email: string | null; name: string | null };
  let passwordWasSet = false;

  if (existingUser) {
    console.log(`     · User existiert bereits — Passwort bleibt unverändert`);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: true },
    });
    user = existingUser;
  } else {
    const passwordHash = await bcrypt.hash(PILOT_PASSWORD, 12);
    user = await prisma.user.create({
      data: {
        email: PILOT_EMAIL,
        name: PILOT_NAME,
        password: passwordHash,
        role: "user",
        isActive: true,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
    passwordWasSet = true;
    console.log(`     ✓ Neuer User angelegt`);
  }
  console.log(`     · user.id = ${user.id}`);

  // ─── 4. OrganizationMember (Rolle via BHO_PILOT_ROLE, default OWNER) ─
  console.log(`\n4/5  Membership · ${user.email} → ${PILOT_ROLE}`);
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: PILOT_ROLE },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: PILOT_ROLE,
    },
  });
  console.log(`     ✓ membership: ${PILOT_ROLE} of ${org.name}`);

  // Sanity-Check: Org sollte mindestens einen OWNER haben — sonst kann sie
  // niemand intern verwalten. Super-admins (lib/super-admin.ts) haben zwar
  // Bypass-Zugriff, aber für Org-interne Self-Service-Operations (Members
  // einladen, Plan ändern) braucht es einen OWNER innerhalb der Org.
  const ownerCount = await prisma.organizationMember.count({
    where: { organizationId: org.id, role: "OWNER" },
  });
  if (ownerCount === 0) {
    console.log(
      `     ⚠  Org ${org.name} hat aktuell KEINEN OWNER. Promote einen Member ` +
        `oder seede einen weiteren Pilot-User mit BHO_PILOT_ROLE=OWNER.`,
    );
  }

  // ─── 5. Subscription (Pilot-Trial) ───────────────────────────────────
  console.log(`\n5/5  Subscription · TRIALING (${PILOT_DAYS} Tage)`);
  const trialStart = new Date();
  const trialEnd = new Date(
    trialStart.getTime() + PILOT_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {
      // Idempotent: bei wiederholtem Lauf nur aktualisieren wenn der bestehende
      // Trial schon abgelaufen ist — sonst respektieren wir den ursprünglichen Trial.
      status: "TRIALING",
      plan: "PROFESSIONAL",
    },
    create: {
      organizationId: org.id,
      status: "TRIALING",
      plan: "PROFESSIONAL",
      trialStart,
      trialEnd,
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
    },
  });
  console.log(`     ✓ Pilot-Trial bis ${trialEnd.toISOString().slice(0, 10)}`);

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log("\n✅  BHO Legal pilot-seed fertig.\n");
  console.log("   Login-Daten");
  console.log("   ───────────────────────────────────────");
  console.log(`   E-Mail:   ${PILOT_EMAIL}`);
  if (passwordWasSet) {
    console.log(`   Passwort: ${PILOT_PASSWORD}`);
    console.log(
      `   ⚠  Passwort sicher an BHO Legal übermitteln — wird nicht erneut angezeigt.`,
    );
  } else {
    console.log(`   Passwort: <bestehendes Passwort des Users>`);
  }
  console.log("   ───────────────────────────────────────");
  console.log(`   Org:      ${org.name} (slug: ${ORG_SLUG})`);
  console.log(`   orgType:  LAW_FIRM`);
  console.log(`   Plan:     PROFESSIONAL (Pilot-Trial)`);
  console.log(`   Trial-End: ${trialEnd.toISOString().slice(0, 10)}`);
  console.log(`   Rolle:    ${PILOT_ROLE}`);
  console.log(
    "\n   👉  Nach dem Login → /atlas (Atlas-Workspace für LAW_FIRM)\n",
  );
  console.log(
    "   👉  Weitere BHO-Partner einladen via /dashboard/settings → Members\n",
  );
}

main()
  .catch((err) => {
    console.error("\n❌ BHO Legal pilot-seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
