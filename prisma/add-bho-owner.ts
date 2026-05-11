/**
 * prisma/add-bho-owner.ts
 *
 * Creates (or reactivates) ingo.baumann@bho-legal.com as the OWNER of
 * the BHO Legal organization, then issues a single-use password-reset
 * token. Prints the reset URL — operator delivers it to the user via a
 * secure out-of-band channel (Signal / WhatsApp / Slack / etc.) since
 * the email-dispatch pipeline is paused.
 *
 * No password is ever set by this script. The user picks their own at
 * the reset URL. Avoids the "weak default + please change it"
 * anti-pattern.
 *
 * Idempotent:
 *   - User exists → reactivated (if needed)
 *   - Membership exists → role upgraded to OWNER (if needed)
 *   - Existing unused reset-tokens → invalidated before issuing the new one
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/add-bho-owner.ts
 *
 * Adapt the constants at the top to onboard a different user / org.
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

/* ── Knobs ────────────────────────────────────────────────────────── */

const TARGET_EMAIL = "ingo.baumann@bho-legal.com";
const TARGET_NAME = "Ingo Baumann";
const ORG_NAME_SUBSTRING = "BHO";
const ORG_ROLE = "OWNER" as const;
const TOKEN_TTL_MINUTES = 60;

/* ── Helpers ──────────────────────────────────────────────────────── */

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/* ── Main ─────────────────────────────────────────────────────────── */

async function main() {
  /* 1. Find the org. Must be active + LAW_FIRM/BOTH so the Atlas
     auth-gate accepts the membership. */
  const org = await prisma.organization.findFirst({
    where: {
      name: { contains: ORG_NAME_SUBSTRING, mode: "insensitive" },
      isActive: true,
      orgType: { in: ["LAW_FIRM", "BOTH"] },
    },
    select: { id: true, name: true, slug: true, orgType: true },
  });

  if (!org) {
    console.error(
      `\n✗ No active LAW_FIRM/BOTH org with name containing '${ORG_NAME_SUBSTRING}' found.\n` +
        `   Run prisma/bho-members.ts first to confirm the org exists / pick the exact name.\n`,
    );
    process.exit(1);
  }
  console.log(
    `\n▸ Org: ${org.name}` +
      `\n  id:     ${org.id}` +
      `\n  slug:   ${org.slug}` +
      `\n  type:   ${org.orgType}`,
  );

  /* 2. Find or create user. NEVER write a password here — the user
     sets one via the reset-token flow below. */
  const emailLower = TARGET_EMAIL.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: emailLower },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (user) {
    console.log(
      `\n▸ User exists: ${user.email}` +
        `\n  id:     ${user.id}` +
        `\n  active: ${user.isActive}`,
    );
    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
      console.log("  ✓ Reactivated");
    }
  } else {
    const created = await prisma.user.create({
      data: {
        email: emailLower,
        name: TARGET_NAME,
        isActive: true,
        emailVerified: new Date(),
        /* No password field — login is impossible until the reset-token
           is consumed at /atlas-reset-password. Equivalent to an
           invite-flow without the email. */
      },
      select: { id: true, email: true, name: true, isActive: true },
    });
    user = created;
    console.log(
      `\n▸ User created: ${user.email}` +
        `\n  id:     ${user.id}` +
        `\n  name:   ${user.name}`,
    );
  }

  /* 3. Org-membership. Idempotent — upgrades existing role if needed. */
  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: org.id },
    select: { id: true, role: true },
  });

  if (existingMembership) {
    if (existingMembership.role !== ORG_ROLE) {
      await prisma.organizationMember.update({
        where: { id: existingMembership.id },
        data: { role: ORG_ROLE },
      });
      console.log(
        `\n✓ Membership upgraded: ${existingMembership.role} → ${ORG_ROLE}`,
      );
    } else {
      console.log(`\n✓ Membership already correct: ${ORG_ROLE}`);
    }
  } else {
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: ORG_ROLE,
      },
    });
    console.log(`\n✓ Membership created: ${ORG_ROLE}`);
  }

  /* 4. Invalidate any outstanding reset-tokens, then issue a fresh
     one. Same logic as the public forgot-password endpoint. */
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  /* 5. Build the reset URL. Trust env vars over Host header. */
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "https://app.caelex.eu";
  const resetUrl = `${appUrl.replace(/\/+$/, "")}/atlas-reset-password?token=${encodeURIComponent(rawToken)}`;

  /* ── Operator handoff ─────────────────────────────────────────── */
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" SEND THIS LINK TO THE USER  (NOT BY EMAIL — paused)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log(`  ${resetUrl}`);
  console.log("");
  console.log(`  Recipient:  ${user.email}`);
  console.log(`  Expires:    ${expiresAt.toISOString()}`);
  console.log(`  Valid for:  ${TOKEN_TTL_MINUTES} minutes`);
  console.log(`  Single-use: yes`);
  console.log("");
  console.log(
    "  Channel: Signal / WhatsApp / Slack DM / SMS — NOT plaintext email.",
  );
  console.log(
    "  After click → user picks their own password → can sign in to /atlas.",
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n[add-bho-owner] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
