import "server-only";

/**
 * Caelex Trade — daily compliance digest (ILA review item #9).
 *
 * Compliance officers live in their inbox, not in the app. Once a day,
 * every org with OPEN Trade posture items gets ONE email summarizing:
 *   - open screening hits awaiting triage (POTENTIAL_MATCH / CONFIRMED_HIT),
 *   - licenses expiring within 30 days,
 *   - Sammelgenehmigungen at ≥80% of their value cap.
 *
 * Honesty + idempotency by design: the digest reports the CURRENT open
 * posture (not a fabricated "new since yesterday" delta), so re-sending
 * daily while an item stays open is the intended reminder behaviour.
 * [DEMO]-marked rows never reach an email.
 *
 * Recipients: org OWNER + ADMIN members with an email address.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { DEMO_PREFIX } from "@/lib/trade/demo-workspace.server";

export interface OrgDigest {
  organizationId: string;
  organizationName: string;
  recipients: string[];
  openHits: Array<{ legalName: string; status: string }>;
  expiringLicenses: Array<{
    label: string;
    validUntil: Date;
    daysLeft: number;
  }>;
  sagsHigh: Array<{ label: string; utilizationPct: number }>;
}

/** Pure: subject line for a digest (tested). */
export function digestSubject(d: OrgDigest): string {
  const parts: string[] = [];
  if (d.openHits.length > 0) parts.push(`${d.openHits.length} Screening`);
  if (d.expiringLicenses.length > 0)
    parts.push(`${d.expiringLicenses.length} Lizenzen`);
  if (d.sagsHigh.length > 0) parts.push(`${d.sagsHigh.length} SAG`);
  return `Passage Digest: ${parts.join(" · ")} — Handlungsbedarf`;
}

/** Pure: minimal, scannable HTML body (tested for content presence). */
export function digestHtml(d: OrgDigest, appUrl: string): string {
  const section = (title: string, rows: string[]): string =>
    rows.length === 0
      ? ""
      : `<h3 style="margin:18px 0 6px;font-size:14px;color:#111">${title}</h3>
         <ul style="margin:0;padding-left:18px;color:#333;font-size:13px;line-height:1.6">
           ${rows.map((r) => `<li>${r}</li>`).join("")}
         </ul>`;

  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px">
    <p style="font-size:13px;color:#555">Täglicher Compliance-Digest für ${escapeHtml(d.organizationName)}</p>
    ${section(
      "Offene Screening-Treffer (Triage nötig)",
      d.openHits.map(
        (h) =>
          `${escapeHtml(h.legalName)} — <strong>${h.status === "CONFIRMED_HIT" ? "bestätigter Treffer" : "möglicher Treffer"}</strong>`,
      ),
    )}
    ${section(
      "Lizenzen laufen ab (≤30 Tage)",
      d.expiringLicenses.map(
        (l) => `${escapeHtml(l.label)} — in ${l.daysLeft} Tagen`,
      ),
    )}
    ${section(
      "Sammelgenehmigungen fast ausgeschöpft",
      d.sagsHigh.map(
        (s) => `${escapeHtml(s.label)} — ${s.utilizationPct}% des Wertrahmens`,
      ),
    )}
    <p style="margin-top:20px">
      <a href="${appUrl}/trade" style="font-size:13px;color:#111">Im Passage-Cockpit öffnen →</a>
    </p>
    <p style="margin-top:16px;font-size:11px;color:#999">
      Dieser Digest listet den aktuellen offenen Stand — er kommt täglich,
      solange Punkte offen sind.
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Collect the digest for ONE org; null when nothing is open. */
export async function buildOrgDigest(
  organizationId: string,
  now: Date,
): Promise<OrgDigest | null> {
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [org, hits, licenses, sags, admins] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.tradeParty.findMany({
      where: {
        organizationId,
        screeningStatus: { in: ["POTENTIAL_MATCH", "CONFIRMED_HIT"] },
        NOT: { legalName: { startsWith: DEMO_PREFIX } },
      },
      select: { legalName: true, screeningStatus: true },
      take: 20,
    }),
    prisma.tradeLicense.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        validUntil: { gte: now, lte: in30d },
      },
      select: { licenseNumber: true, licenseType: true, validUntil: true },
      take: 20,
    }),
    prisma.tradeSammelgenehmigung.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        NOT: { title: { startsWith: DEMO_PREFIX } },
      },
      select: {
        title: true,
        bafaReference: true,
        totalValueCapEur: true,
        drawnDownValueEur: true,
      },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      select: { user: { select: { email: true } } },
    }),
  ]);

  const sagsHigh = sags
    .filter((s) => s.totalValueCapEur > BigInt(0))
    .map((s) => ({
      label: s.bafaReference ?? s.title,
      utilizationPct: Number(
        (s.drawnDownValueEur * BigInt(100)) / s.totalValueCapEur,
      ),
    }))
    .filter((s) => s.utilizationPct >= 80);

  const openHits = hits.map((h) => ({
    legalName: h.legalName,
    status: h.screeningStatus as string,
  }));
  const expiringLicenses = licenses
    .filter((l): l is typeof l & { validUntil: Date } => l.validUntil !== null)
    .map((l) => ({
      label: l.licenseNumber ?? l.licenseType,
      validUntil: l.validUntil,
      daysLeft: Math.max(
        0,
        Math.round(
          (l.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      ),
    }));

  if (
    openHits.length === 0 &&
    expiringLicenses.length === 0 &&
    sagsHigh.length === 0
  ) {
    return null;
  }

  const recipients = admins
    .map((m) => m.user.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);
  if (recipients.length === 0) return null;

  return {
    organizationId,
    organizationName: org?.name ?? "Workspace",
    recipients,
    openHits,
    expiringLicenses,
    sagsHigh,
  };
}

/** Run the digest across every org that has Trade data. */
export async function runTradeDigest(
  now: Date,
): Promise<{ orgsScanned: number; emailsSent: number; skipped: number }> {
  // Orgs with any Trade footprint (parties are created by every flow).
  const orgRows = await prisma.tradeParty.groupBy({
    by: ["organizationId"],
    _count: { _all: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.caelex.eu";
  let emailsSent = 0;
  let skipped = 0;

  for (const row of orgRows) {
    try {
      const digest = await buildOrgDigest(row.organizationId, now);
      if (!digest) {
        skipped += 1;
        continue;
      }
      // sendEmail takes a single recipient — one mail per OWNER/ADMIN.
      for (const recipient of digest.recipients) {
        const result = await sendEmail({
          to: recipient,
          subject: digestSubject(digest),
          html: digestHtml(digest, appUrl),
          text:
            `Passage Digest für ${digest.organizationName}: ` +
            `${digest.openHits.length} offene Screening-Treffer, ` +
            `${digest.expiringLicenses.length} ablaufende Lizenzen, ` +
            `${digest.sagsHigh.length} SAG-Warnungen. ${appUrl}/trade`,
        });
        if (result.success) emailsSent += 1;
      }
    } catch (err) {
      logger.error(
        "trade-digest: org failed",
        err instanceof Error ? err : undefined,
        { organizationId: row.organizationId },
      );
    }
  }

  return { orgsScanned: orgRows.length, emailsSent, skipped };
}
