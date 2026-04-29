import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pure-Renderer-Splitting from briefing-email.ts: same HTML/text
 * rendering, but exported for use by the preview endpoint without
 * pulling Resend client init code.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { BriefingPayload } from "./daily-briefing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://caelex.app";

function severityEmoji(severity: "critical" | "warn" | "info"): string {
  return severity === "critical" ? "🔴" : severity === "warn" ? "🟡" : "🔵";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderBriefingHtml(opts: {
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
<head><meta charset="utf-8"><title>Pharos Briefing</title></head>
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
