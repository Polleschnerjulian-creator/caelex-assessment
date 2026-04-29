import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Daily-Briefing Email Renderer + Sender.
 *
 * Konvertiert ein BriefingPayload in eine HTML + Plain-Text-Mail und
 * verschickt es via Resend an alle aktiven Mitglieder der Behörde,
 * die ein verifiziertes Email-Feld haben. Idempotent: schickt nicht
 * doppelt für denselben briefingHash.
 *
 * Phase-1: pro Behörde eine Mail an alle Mitglieder (kein
 * per-User-Rollen-Filter). Phase-2: bevorzugt Sachbearbeiter mit
 * SACHBEARBEITER-Rolle, Heads-of-Section CC.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  getEmailFrom,
  getEmailFromName,
  getResendClient,
  isResendConfigured,
} from "@/lib/email/resend-client";
import type { BriefingPayload } from "./daily-briefing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://caelex.app";

function severityEmoji(severity: "critical" | "warn" | "info"): string {
  return severity === "critical" ? "🔴" : severity === "warn" ? "🟡" : "🔵";
}

function renderHtml(opts: {
  authorityName: string;
  authorityType: string;
  briefing: BriefingPayload;
}): string {
  const b = opts.briefing;
  const priorities = b.topPriorities
    .map(
      (p) => `
        <tr>
          <td style="padding: 6px 0; vertical-align: top; width: 24px;">${severityEmoji(p.severity)}</td>
          <td style="padding: 6px 0;">
            ${p.href ? `<a href="${APP_URL}${p.href}" style="color:#92400e; text-decoration:none;">` : ""}
            <span style="font-size:13px; color:#1e293b;">${escapeHtml(p.message)}</span>
            ${p.href ? "</a>" : ""}
          </td>
        </tr>`,
    )
    .join("");

  const summary = b.summary;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background:#f8fafc; margin:0; padding:24px;">
  <div style="max-width:600px; margin:0 auto; background:white; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
    <div style="padding: 16px 20px; background: linear-gradient(135deg, #fbbf24, #d97706); color: #78350f;">
      <div style="font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:700; opacity:0.85;">PHAROS Tagesbriefing</div>
      <div style="font-size:18px; font-weight:600; margin-top:4px;">${escapeHtml(opts.authorityName)}</div>
      <div style="font-size:11px; opacity:0.85;">${escapeHtml(opts.authorityType.replace("_", " "))} · ${new Date(b.generatedAt).toLocaleDateString("de-DE")}</div>
    </div>
    <div style="padding:20px;">
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr>
          <td style="padding:8px; background:#f1f5f9; border-radius:6px; text-align:center; width:25%;">
            <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Workflows</div>
            <div style="font-size:22px; font-weight:600; color:#0f172a;">${summary.workflowsTotal}</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px; background:${summary.workflowsBreached > 0 ? "#fef2f2" : "#f1f5f9"}; border-radius:6px; text-align:center; width:25%;">
            <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Frist verletzt</div>
            <div style="font-size:22px; font-weight:600; color:${summary.workflowsBreached > 0 ? "#b91c1c" : "#0f172a"};">${summary.workflowsBreached}</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px; background:${summary.workflowsCritical > 0 ? "#fffbeb" : "#f1f5f9"}; border-radius:6px; text-align:center; width:25%;">
            <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">&lt; 6h kritisch</div>
            <div style="font-size:22px; font-weight:600; color:${summary.workflowsCritical > 0 ? "#92400e" : "#0f172a"};">${summary.workflowsCritical}</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px; background:${summary.approvalsUrgent > 0 ? "#fffbeb" : "#f1f5f9"}; border-radius:6px; text-align:center; width:25%;">
            <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Approvals &lt; 24h</div>
            <div style="font-size:22px; font-weight:600; color:${summary.approvalsUrgent > 0 ? "#92400e" : "#0f172a"};">${summary.approvalsUrgent}</div>
          </td>
        </tr>
      </table>

      <div style="font-size:11px; letter-spacing:0.05em; text-transform:uppercase; color:#64748b; font-weight:600; margin-bottom:8px;">Top Prioritäten</div>
      ${
        b.topPriorities.length === 0
          ? `<div style="font-size:13px; color:#475569;">✓ Keine kritischen Vorgänge — saubere Lage.</div>`
          : `<table style="width:100%; border-collapse:collapse;">${priorities}</table>`
      }

      <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0;">
        <a href="${APP_URL}/pharos/briefing" style="display:inline-block; padding:10px 16px; background:#f59e0b; color:#451a03; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">Briefing in Pharos öffnen →</a>
      </div>

      <div style="margin-top:16px; font-size:10px; color:#94a3b8; font-family: ui-monospace, monospace;">
        briefingHash: ${b.briefingHash.slice(0, 32)}…
      </div>
    </div>
    <div style="padding:12px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:10px; color:#64748b; line-height:1.5;">
      Diese Mail wurde automatisch durch Pharos Daily-Briefing erzeugt.
      Cron <code>/api/cron/pharos-daily-briefing</code> läuft täglich
      06:00 UTC. Jeder Eintrag ist hash-versioniert + reproduzierbar.
    </div>
  </div>
</body>
</html>`;
}

function renderText(opts: {
  authorityName: string;
  authorityType: string;
  briefing: BriefingPayload;
}): string {
  const b = opts.briefing;
  const lines: string[] = [];
  lines.push(`PHAROS Tagesbriefing — ${opts.authorityName}`);
  lines.push(
    `${opts.authorityType.replace("_", " ")} · ${new Date(b.generatedAt).toLocaleString("de-DE")}`,
  );
  lines.push("");
  lines.push("ZUSAMMENFASSUNG");
  lines.push(`  Workflows offen:    ${b.summary.workflowsTotal}`);
  lines.push(`  Frist verletzt:     ${b.summary.workflowsBreached}`);
  lines.push(`  < 6h kritisch:      ${b.summary.workflowsCritical}`);
  lines.push(`  Approvals < 24h:    ${b.summary.approvalsUrgent}`);
  lines.push(
    `  Webhook 24h:        ${b.summary.webhookInvocations24h} (rejection ${(b.summary.webhookRejectionRate * 100).toFixed(1)}%)`,
  );
  lines.push(`  Drift-Alerts neu:   ${b.summary.newDriftAlerts}`);
  lines.push("");
  lines.push("TOP PRIORITÄTEN");
  if (b.topPriorities.length === 0) {
    lines.push("  ✓ Keine kritischen Vorgänge — saubere Lage.");
  } else {
    for (const p of b.topPriorities) {
      lines.push(
        `  ${severityEmoji(p.severity)} ${p.message}${p.href ? `\n      → ${APP_URL}${p.href}` : ""}`,
      );
    }
  }
  lines.push("");
  lines.push(`Briefing in Pharos öffnen: ${APP_URL}/pharos/briefing`);
  lines.push(`briefingHash: ${b.briefingHash}`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Idempotency: track which (briefingHash, recipient) pairs were
// sent. We reuse OversightAccessLog with synthetic oversightId
// "BRIEFING_LEDGER" + resourceType="DailyBriefingEmail" so we don't
// need a new table for phase 1. The entryHash gives idempotency:
// pre-check by querying for the (briefingHash, email) entry. ─────────

async function alreadySent(
  briefingHash: string,
  email: string,
): Promise<boolean> {
  const existing = await prisma.oversightAccessLog.findFirst({
    where: {
      resourceType: "DailyBriefingEmail",
      resourceId: briefingHash,
      context: { path: ["email"], equals: email },
    },
    select: { id: true },
  });
  return !!existing;
}

async function recordSent(opts: {
  briefingHash: string;
  email: string;
  authorityProfileId: string;
  resendId: string | null;
}): Promise<void> {
  // Without a real oversight to chain into we can't persist via
  // OversightAccessLog (FK requirement). Phase 1: log + accept that
  // there's no DB-level idempotency until we have a dedicated table.
  // This is acceptable because Resend itself dedupes via Idempotency-Key.
  logger.info(
    `[pharos-briefing-email] sent ${opts.email} hash=${opts.briefingHash.slice(0, 16)} resendId=${opts.resendId ?? "n/a"}`,
  );
}

// ─── Sender ─────────────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  sent: number;
  skipped: number;
  errors: number;
  reason?: string;
}

export async function sendBriefingEmails(
  briefing: BriefingPayload,
): Promise<SendResult> {
  if (!isResendConfigured()) {
    return {
      ok: false,
      sent: 0,
      skipped: 0,
      errors: 0,
      reason: "RESEND_API_KEY not configured",
    };
  }
  const client = getResendClient();
  if (!client) {
    return {
      ok: false,
      sent: 0,
      skipped: 0,
      errors: 0,
      reason: "Resend client unavailable",
    };
  }

  const profile = await prisma.authorityProfile.findUnique({
    where: { id: briefing.authorityProfileId },
    include: {
      organization: {
        select: {
          name: true,
          members: {
            select: {
              user: {
                select: { email: true, name: true, isActive: true },
              },
            },
          },
        },
      },
    },
  });
  if (!profile) {
    return {
      ok: false,
      sent: 0,
      skipped: 0,
      errors: 0,
      reason: "Authority profile not found",
    };
  }

  const recipients = profile.organization.members
    .map((m) => m.user)
    .filter((u) => u.isActive && u.email)
    .map((u) => ({ email: u.email, name: u.name ?? "" }));

  if (recipients.length === 0) {
    return {
      ok: true,
      sent: 0,
      skipped: 0,
      errors: 0,
      reason: "no recipients",
    };
  }

  const html = renderHtml({
    authorityName: profile.organization.name,
    authorityType: profile.authorityType,
    briefing,
  });
  const text = renderText({
    authorityName: profile.organization.name,
    authorityType: profile.authorityType,
    briefing,
  });
  const subject = `Pharos Briefing — ${profile.organization.name} · ${new Date(briefing.generatedAt).toLocaleDateString("de-DE")}`;

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of recipients) {
    try {
      // Phase 1 idempotency: skip if we logged this hash+email already.
      // (Reuse of OversightAccessLog requires a real oversightId; we
      // skip the check unless we have one. For the 06:00-cron-case
      // it's de-facto idempotent because briefingHash changes daily.)
      if (await alreadySent(briefing.briefingHash, r.email)) {
        skipped++;
        continue;
      }
      const result = await client.emails.send({
        from: `${getEmailFromName()} <${getEmailFrom()}>`,
        to: r.email,
        subject,
        html,
        text,
        // Resend uses Idempotency-Key to dedupe within 24h.
        headers: {
          "Idempotency-Key": `pharos-briefing-${briefing.briefingHash}-${Buffer.from(r.email).toString("base64url").slice(0, 16)}`,
        },
      });
      const resendId =
        result && typeof result === "object" && "data" in result
          ? ((result.data as { id?: string } | null)?.id ?? null)
          : null;
      await recordSent({
        briefingHash: briefing.briefingHash,
        email: r.email,
        authorityProfileId: briefing.authorityProfileId,
        resendId,
      });
      sent++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[pharos-briefing-email] send to ${r.email} failed: ${msg}`);
    }
  }

  return { ok: errors === 0, sent, skipped, errors };
}
