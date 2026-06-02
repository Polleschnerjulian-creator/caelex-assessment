/**
 * Atlas — DSGVO Art. 20 Data-Export Request Endpoint
 *
 * Stage-1 implementation: user submits a request → we email them a
 * confirmation AND email datenschutz@caelex.eu with user/org context;
 * the data-export bundle is then assembled manually within the 30-day
 * GDPR window. Stage-2 (later sprint) will add a DB-tracking model
 * (`AtlasDataExportRequest`) + a Vercel-Cron processor that auto-
 * generates a JSON-ZIP bundle and stores it in R2 with a 24h signed
 * URL.
 *
 * Why email-only for now: Atlas-Lawyer-UX-Audit DSGVO-2 wanted
 * production-ready intake without touching the Prisma schema or
 * adding paid external services. DSGVO Art. 20 explicitly allows
 * a 30-day fulfillment window, so manual processing inside that
 * window is fully compliant.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

const DPO_EMAIL = "datenschutz@caelex.eu";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;

    // Rate-limit: 1 export-request per user per hour. DSGVO doesn't
    // require unlimited requests; rate-limiting prevents accidental
    // spam from a stuck UI button.
    const rl = await checkRateLimit(
      "sensitive",
      `atlas-export:${getIdentifier(request, userId)}`,
    );
    if (!rl.success) return createRateLimitResponse(rl);

    // Resolve the user's primary org so the DPO can include org context in
    // the manual export workflow.
    // NOTE: GDPR Art. 20 is a universal right — this route is intentionally
    // accessible to any authenticated user, including those without an Atlas
    // (LAW_FIRM/BOTH) org. When no org membership exists we use the user's
    // email as a neutral identifier rather than the misleading "(no org)"
    // Atlas-branded label.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    const orgName =
      membership?.organization?.name ??
      `Kein zugeordnetes Unternehmen (${userEmail})`;
    const orgSlug = membership?.organization?.slug ?? "(kein Unternehmen)";
    const orgId = membership?.organization?.id ?? null;

    const requestedAt = new Date().toISOString();

    // 1. Confirmation email to the user (their copy).
    const userSubject =
      "Ihre Daten-Export-Anfrage wurde empfangen · Atlas (Caelex)";
    const userHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 16px; color: #111827;">
          Ihre Daten-Export-Anfrage wurde empfangen
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Hallo ${escapeHtml(userName)},
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          wir haben Ihre Anfrage auf Daten-Export gemäß
          <strong>Art. 20 DSGVO (Recht auf Datenübertragbarkeit)</strong>
          empfangen. Unser Datenschutzteam wird Ihre Daten aufbereiten
          und Ihnen innerhalb der gesetzlichen Frist von
          <strong>30 Tagen</strong> einen sicheren Download-Link
          per Email zusenden.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Bei Rückfragen erreichen Sie uns unter
          <a href="mailto:${DPO_EMAIL}" style="color: #047857;">${DPO_EMAIL}</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">
          <strong>Anfrage-Details:</strong><br>
          Konto: ${escapeHtml(userEmail)}<br>
          Organisation: ${escapeHtml(orgName)}<br>
          Eingang: ${requestedAt}
        </p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">
          Caelex GmbH · Datenschutzbeauftragter ·
          <a href="mailto:${DPO_EMAIL}" style="color: #047857;">${DPO_EMAIL}</a>
        </p>
      </div>
    `;
    const userText =
      `Ihre Daten-Export-Anfrage wurde empfangen.\n\n` +
      `Wir haben Ihre Anfrage auf Daten-Export gemäß Art. 20 DSGVO (Recht auf Datenübertragbarkeit) empfangen. ` +
      `Unser Datenschutzteam wird Ihre Daten aufbereiten und Ihnen innerhalb der gesetzlichen Frist von 30 Tagen einen sicheren Download-Link per Email zusenden.\n\n` +
      `Bei Rückfragen: ${DPO_EMAIL}\n\n` +
      `Anfrage-Details:\n` +
      `  Konto: ${userEmail}\n` +
      `  Organisation: ${orgName}\n` +
      `  Eingang: ${requestedAt}\n`;

    // 2. Internal alert to the DPO with full context.
    const dpoSubject = `[Atlas DSGVO] Daten-Export angefordert · ${userEmail}`;
    const dpoHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 16px; color: #111827;">
          Neue Daten-Export-Anfrage
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Ein Atlas-Nutzer hat einen Daten-Export gemäß Art. 20 DSGVO
          angefordert. Bitte innerhalb von <strong>30 Tagen</strong>
          bearbeiten und einen sicheren Download-Link an den Nutzer
          senden.
        </p>
        <table style="font-size: 13px; color: #374151; border-collapse: collapse; width: 100%; margin-top: 12px;">
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Nutzer:</strong></td><td>${escapeHtml(userName)}</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</a></td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>User-ID:</strong></td><td><code>${escapeHtml(userId)}</code></td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Organisation:</strong></td><td>${escapeHtml(orgName)} (slug: <code>${escapeHtml(orgSlug)}</code>)</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Org-ID:</strong></td><td>${orgId ? `<code>${escapeHtml(orgId)}</code>` : "(none)"}</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Eingang:</strong></td><td>${requestedAt}</td></tr>
        </table>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          Audit-Log-Eintrag erstellt: <code>atlas_data_export_requested</code>
        </p>
      </div>
    `;

    const [userResult, dpoResult] = await Promise.all([
      sendEmail({
        to: userEmail,
        subject: userSubject,
        html: userHtml,
        text: userText,
        userId,
        // notificationType intentionally omitted — the NotificationType
        // enum is shared with the in-app notification system; this is
        // a transactional GDPR-compliance email and shouldn't trigger
        // notification-preferences gating.
      }),
      sendEmail({
        to: DPO_EMAIL,
        subject: dpoSubject,
        html: dpoHtml,
      }),
    ]);

    // Audit-trail entry. We use the existing audit infrastructure so
    // this surfaces in the Caelex AuditLog where it can be queried
    // for compliance investigations.
    const ctx = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "atlas_data_export_requested",
      entityType: "user",
      entityId: userId,
      previousValue: null,
      newValue: {
        userEmail,
        orgName,
        orgId,
        userEmailSent: userResult.success,
        dpoEmailSent: dpoResult.success,
      },
      description: `Atlas-User ${userEmail} requested DSGVO Art. 20 data export`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    if (!userResult.success || !dpoResult.success) {
      logger.error("Atlas data-export emails partially failed", {
        userResult,
        dpoResult,
      });
      // Even if email failed, the audit-log entry exists and Klaus's
      // DPO team can find the request via the audit log. So we still
      // return success to the user — the request is provably submitted.
    }

    return NextResponse.json({
      success: true,
      message:
        "Anfrage empfangen. Sie erhalten eine Bestätigungs-Email und der Download-Link wird Ihnen innerhalb von 30 Tagen zugesendet.",
      receivedAt: requestedAt,
    });
  } catch (error) {
    logger.error("Atlas data-export request failed", error);
    return NextResponse.json(
      {
        error:
          "Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.",
      },
      { status: 500 },
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
