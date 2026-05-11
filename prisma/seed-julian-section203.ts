/**
 * prisma/seed-julian-section203.ts
 *
 * Idempotent: creates the founder's § 203 StGB Verpflichtungserklärung
 * if no active row for julian@caelex.eu exists yet, then prints the
 * download URL.
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/seed-julian-section203.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOUNDER = {
  signerName: "Julian Polleschner",
  signerEmail: "julian@caelex.eu",
  role: "Inhaber, Caelex Einzelunternehmen — alleinverantwortlicher Geschäftsführer mit operativem Vollzugriff auf alle Systeme",
  scope:
    "Vollzugriff auf alle Caelex-Postgres-Datenbanken (Neon EU), Cloudflare R2 Object-Storage, Vercel-Deployments und Production-Logs, Anthropic-API-Key, OpenAI-API-Key (über Vercel AI Gateway), Stripe-Account, Resend-Account, Sentry-Projekt, LogSnag-Projekt sowie operativer Zugriff auf alle Mandanten-Daten, Astra-Kontext, Atlas-Workspaces, Drafting-Chat-Historie und Audit-Logs.",
  notes:
    "Selbstverpflichtung als Solo-Founder. Wet-ink Original im Office hinterlegt; PDF generiert über /api/admin/section203/[id]/pdf. Bei Hinzukommen weiterer Mitwirkender wird je Person eine eigene Verpflichtungserklärung mit identischem Template angelegt.",
};

const TEMPLATE_VERSION = "v1-2026-05";

async function main() {
  console.log("\n┌─ § 203 StGB Verpflichtungserklärung — Julian seed ─┐");

  /* Idempotency: skip if there's already an ACTIVE row for this email
     under the current template version. */
  const existing = await prisma.section203Commitment.findFirst({
    where: {
      signerEmail: FOUNDER.signerEmail,
      templateVersion: TEMPLATE_VERSION,
      revokedAt: null,
    },
    select: { id: true, signedAt: true },
  });

  if (existing) {
    console.log(`  ✓ already exists: ${existing.id}`);
    console.log(`    signedAt: ${existing.signedAt.toISOString()}`);
    console.log(
      `\n  Download PDF (when signed in as super-admin):\n    /api/admin/section203/${existing.id}/pdf`,
    );
    console.log("└────────────────────────────────────────────────────┘\n");
    return;
  }

  /* Resolve the founder's User row if it exists, so the FK is set. */
  const founderUser = await prisma.user.findUnique({
    where: { email: FOUNDER.signerEmail },
    select: { id: true },
  });

  const created = await prisma.section203Commitment.create({
    data: {
      signerName: FOUNDER.signerName,
      role: FOUNDER.role,
      signerEmail: FOUNDER.signerEmail,
      scope: FOUNDER.scope,
      notes: FOUNDER.notes,
      signedAt: new Date(),
      scopeStartedAt: new Date("2024-01-01"),
      templateVersion: TEMPLATE_VERSION,
      userId: founderUser?.id ?? null,
      recordedByUserId: founderUser?.id ?? null,
    },
    select: { id: true, signedAt: true },
  });

  console.log(`  ✓ created: ${created.id}`);
  console.log(`    signedAt: ${created.signedAt.toISOString()}`);
  console.log(
    `\n  Download PDF (when signed in as super-admin):\n    /api/admin/section203/${created.id}/pdf`,
  );
  console.log("└────────────────────────────────────────────────────┘\n");
}

main()
  .catch((e) => {
    console.error("\n[seed-julian-section203] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
