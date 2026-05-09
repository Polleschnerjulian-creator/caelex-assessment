/**
 * Atlas — DSGVO Art. 17 Data-Deletion Request Endpoint
 *
 * Stage-1 implementation: user submits a deletion request → we email
 * them a confirmation that includes a 30-day grace-period notice AND
 * email datenschutz@caelex.eu with full context. The actual deletion
 * is then executed manually by the DPO team after the 30-day window
 * (unless the user cancels via reply-email). Stage-2 (later sprint)
 * adds:
 *   - `AtlasDataDeletionRequest` Prisma model with `scheduledDeletionAt`
 *   - Vercel-Cron job that hard-deletes accounts after the 30-day grace
 *   - In-app cancel-button (instead of email-reply cancellation)
 *
 * DSGVO Art. 17 ("Right to Erasure") allows reasonable processing
 * time. The 30-day grace period is industry-standard for SaaS
 * deletion (matches Stripe, Vercel, GitHub patterns). It also
 * protects the user against impulse-deletion regret.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
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
const GRACE_PERIOD_DAYS = 30;

const RequestSchema = z.object({
  reason: z.string().max(2000).optional(),
  /** User must explicitly confirm by typing their email — same pattern
   *  Stripe/Vercel use to make accidental deletion harder. */
  confirmEmail: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;

    // Rate-limit very strictly: deletion requests are not casual.
    // 1 request per user per day.
    const rl = await checkRateLimit(
      "sensitive",
      `atlas-deletion:${getIdentifier(request, userId)}`,
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { reason, confirmEmail } = parsed.data;

    // Email-typing-confirmation must match the session email (case-
    // insensitive). This is the deliberate-action gate.
    if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Bestätigungs-Email stimmt nicht mit Ihrer Konto-Email überein.",
        },
        { status: 400 },
      );
    }

    const requestedAt = new Date();
    const scheduledDeletionAt = new Date(
      requestedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    // Resolve org context for the DPO email.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    const orgName = membership?.organization?.name ?? "(no org)";
    const orgSlug = membership?.organization?.slug ?? "(no slug)";
    const orgId = membership?.organization?.id ?? null;
    const isOrgOwner = membership?.role === "OWNER";

    // 1. Confirmation email to the user with cancel instructions.
    const userSubject =
      "Ihre Account-Lösch-Anfrage wurde empfangen · Atlas (Caelex)";
    const userHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 16px; color: #111827;">
          Ihre Account-Lösch-Anfrage wurde empfangen
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Hallo ${escapeHtml(userName)},
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          wir haben Ihre Anfrage auf Account-Löschung gemäß
          <strong>Art. 17 DSGVO (Recht auf Vergessenwerden)</strong>
          empfangen. Aus Sicherheitsgründen wird die endgültige Löschung
          nach einer <strong>30-tägigen Wartefrist</strong> ausgeführt
          — geplant für den
          <strong>${formatDateDe(scheduledDeletionAt)}</strong>.
        </p>
        <div style="margin: 20px 0; padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="font-size: 13px; line-height: 1.6; color: #78350f; margin: 0;">
            <strong>Sie haben es sich anders überlegt?</strong><br>
            Antworten Sie einfach auf diese Email mit dem Wort
            <strong>STORNIEREN</strong>, oder schreiben Sie an
            <a href="mailto:${DPO_EMAIL}?subject=L%C3%B6sch-Anfrage%20stornieren&body=Bitte%20stornieren%20Sie%20meine%20L%C3%B6sch-Anfrage." style="color: #047857;">${DPO_EMAIL}</a>.
            Vor dem ${formatDateDe(scheduledDeletionAt)} können Sie die
            Anfrage jederzeit zurückziehen.
          </p>
        </div>
        ${
          isOrgOwner
            ? `<div style="margin: 20px 0; padding: 16px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <p style="font-size: 13px; line-height: 1.6; color: #7f1d1d; margin: 0;">
                  <strong>Wichtiger Hinweis:</strong> Sie sind Owner der
                  Organisation <strong>${escapeHtml(orgName)}</strong>.
                  Vor der Löschung Ihres Accounts müssen Sie entweder
                  einen anderen Owner ernennen oder die gesamte
                  Organisation löschen lassen. Bitte koordinieren Sie
                  dies mit ${DPO_EMAIL}.
                </p>
              </div>`
            : ""
        }
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          <strong>Was wird gelöscht?</strong>
        </p>
        <ul style="font-size: 13px; line-height: 1.8; color: #374151;">
          <li>Ihre Profil-Daten (Name, Email, Passwort-Hash)</li>
          <li>Ihre persönlichen Atlas-Daten (Bookmarks, Annotations, Library, Workspace-Cards)</li>
          <li>Ihre Session- und Authentifizierungs-Daten</li>
          <li>Ihre Notification-Präferenzen</li>
        </ul>
        <p style="font-size: 13px; line-height: 1.6; color: #6b7280;">
          <strong>Was bleibt erhalten?</strong> Audit-Log-Einträge
          (DSGVO § 6 Abs. 1 lit. c, 7 Jahre Aufbewahrungspflicht) und
          Daten die Sie für andere Atlas-Nutzer geteilt haben (z.B.
          Annotations in einem Org-Workspace).
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">
          <strong>Anfrage-Details:</strong><br>
          Konto: ${escapeHtml(userEmail)}<br>
          Organisation: ${escapeHtml(orgName)}<br>
          Eingang: ${requestedAt.toISOString()}<br>
          Geplante Löschung: ${formatDateDe(scheduledDeletionAt)}
        </p>
      </div>
    `;
    const userText =
      `Ihre Account-Lösch-Anfrage wurde empfangen.\n\n` +
      `Wir haben Ihre Anfrage auf Account-Löschung gemäß Art. 17 DSGVO empfangen. ` +
      `Aus Sicherheitsgründen wird die endgültige Löschung nach einer 30-tägigen Wartefrist ausgeführt — geplant für den ${formatDateDe(scheduledDeletionAt)}.\n\n` +
      `Sie haben es sich anders überlegt? Antworten Sie auf diese Email mit "STORNIEREN" oder schreiben Sie an ${DPO_EMAIL}.\n\n` +
      `Anfrage-Details:\n` +
      `  Konto: ${userEmail}\n` +
      `  Organisation: ${orgName}\n` +
      `  Eingang: ${requestedAt.toISOString()}\n` +
      `  Geplante Löschung: ${formatDateDe(scheduledDeletionAt)}\n`;

    // 2. Internal alert to DPO with full context + scheduled date.
    const dpoSubject = `[Atlas DSGVO] Account-Löschung angefordert · ${userEmail} (geplant ${formatDateDe(scheduledDeletionAt)})`;
    const dpoHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 16px; color: #111827;">
          Neue Account-Löschungs-Anfrage
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Ein Atlas-Nutzer hat eine Account-Löschung gemäß
          Art. 17 DSGVO angefordert. <strong>Geplante Löschung:
          ${formatDateDe(scheduledDeletionAt)}</strong> (30 Tage Grace).
        </p>
        ${
          isOrgOwner
            ? `<div style="margin: 12px 0; padding: 12px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <p style="font-size: 13px; color: #7f1d1d; margin: 0;">
                  ⚠️ <strong>OWNER-Account:</strong> Vor Ausführung
                  Ownership-Transfer oder Org-Lösch-Workflow klären.
                </p>
              </div>`
            : ""
        }
        <table style="font-size: 13px; color: #374151; border-collapse: collapse; width: 100%; margin-top: 12px;">
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Nutzer:</strong></td><td>${escapeHtml(userName)}</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</a></td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>User-ID:</strong></td><td><code>${escapeHtml(userId)}</code></td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Organisation:</strong></td><td>${escapeHtml(orgName)} (slug: <code>${escapeHtml(orgSlug)}</code>)</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Org-Rolle:</strong></td><td>${escapeHtml(membership?.role ?? "(none)")}${isOrgOwner ? " ⚠️" : ""}</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Eingang:</strong></td><td>${requestedAt.toISOString()}</td></tr>
          <tr><td style="padding: 4px 8px 4px 0;"><strong>Geplante Löschung:</strong></td><td><strong>${formatDateDe(scheduledDeletionAt)}</strong></td></tr>
          ${
            reason
              ? `<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><strong>Begründung:</strong></td><td>${escapeHtml(reason)}</td></tr>`
              : ""
          }
        </table>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          Audit-Log-Eintrag erstellt: <code>atlas_data_deletion_requested</code>
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
        // notificationType intentionally omitted — see data-export route.
      }),
      sendEmail({
        to: DPO_EMAIL,
        subject: dpoSubject,
        html: dpoHtml,
      }),
    ]);

    // Audit-trail. The audit-log retention (7 years per § 6 Abs. 1
    // lit. c) outlives the account itself, satisfying GDPR
    // accountability when the account is later hard-deleted.
    const ctx = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "atlas_data_deletion_requested",
      entityType: "user",
      entityId: userId,
      previousValue: null,
      newValue: {
        userEmail,
        orgName,
        orgId,
        isOrgOwner,
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        reason: reason ?? null,
        userEmailSent: userResult.success,
        dpoEmailSent: dpoResult.success,
      },
      description: `Atlas-User ${userEmail} requested DSGVO Art. 17 account deletion (scheduled ${formatDateDe(scheduledDeletionAt)})`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    if (!userResult.success || !dpoResult.success) {
      logger.error("Atlas data-deletion emails partially failed", {
        userResult,
        dpoResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Lösch-Anfrage empfangen. Geplante Ausführung: ${formatDateDe(scheduledDeletionAt)}. Sie können die Anfrage bis dahin per Email an ${DPO_EMAIL} stornieren.`,
      scheduledDeletionAt: scheduledDeletionAt.toISOString(),
    });
  } catch (error) {
    logger.error("Atlas data-deletion request failed", error);
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

function formatDateDe(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
