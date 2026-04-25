import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Counter-sign email — sent to the ORIGINAL inviter when the recipient
 * narrowed the proposed scope and the matter moved to PENDING_CONSENT.
 *
 * Different from legal-matter-invite in three ways:
 *
 *   1. The CTA goes to /dashboard/network/inbox (session-auth flow),
 *      not a token URL — the original inviter is already a logged-in
 *      member of their org and we don't need a fresh secret to identify
 *      them.
 *
 *   2. The body shows a *diff*: original scope vs. amended scope, so
 *      the recipient can see at a glance what was removed before
 *      counter-signing.
 *
 *   3. There is no expiry copy in the headline — the counter-token has
 *      the same expiry as the original invitation but the inbox link
 *      stays valid as long as the matter is in PENDING_CONSENT.
 *
 * Same XSS-safety pattern as legal-matter-invite.ts (escape, scheme-
 * validate, plain-text fallback).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface LegalMatterCounterSignEmailParams {
  /** Display name of the org that just narrowed the scope. */
  amendingOrgName: string;
  /** User who clicked "Anpassen" (display name or email). */
  amendingUserName: string;
  /** Org receiving the counter-sign request (the original inviter). */
  recipientOrgName: string;
  /** Matter's human-readable name. */
  matterName: string;
  /** Optional internal firm reference. */
  matterReference?: string | null;
  /** Humanised diff of what was REMOVED, e.g.
   *  "Documents — Export entzogen · Spacecraft — Kategorie entfernt".
   *  Empty string is allowed if nothing material changed (rare — the
   *  amend flow only triggers a counter-token if scope is strictly
   *  narrower, so usually there IS a diff to show). */
  scopeChangesSummary: string;
  /** Final scope after amendment, humanised. Provides full context
   *  in case the diff alone is ambiguous. */
  amendedScopeSummary: string;
  /** Final duration after amendment in months. */
  amendedDurationMonths: number;
  /** Was the duration also changed? Triggers an extra line. */
  durationChanged: boolean;
  /** Original duration in months (for context if changed). */
  originalDurationMonths?: number | null;
  /** Inbox URL — recipient logs in and counter-signs from there. */
  inboxUrl: string;
  /** Direction of the ORIGINAL invitation. Affects pronouns. */
  originalDirection: "ATLAS_INVITES_CAELEX" | "CAELEX_INVITES_ATLAS";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "https://caelex.eu/dashboard/network/inbox";
    }
    return url.toString();
  } catch {
    return "https://caelex.eu/dashboard/network/inbox";
  }
}

export function renderLegalMatterCounterSignEmail(
  params: LegalMatterCounterSignEmailParams,
): { subject: string; html: string; text: string } {
  const safeAmendingOrg = escapeHtml(params.amendingOrgName);
  const safeAmendingUser = escapeHtml(params.amendingUserName);
  const safeRecipientOrg = escapeHtml(params.recipientOrgName);
  const safeMatter = escapeHtml(params.matterName);
  const safeRef = params.matterReference
    ? escapeHtml(params.matterReference)
    : "";
  const safeChanges = params.scopeChangesSummary
    ? escapeHtml(params.scopeChangesSummary)
    : "";
  const safeFinalScope = escapeHtml(params.amendedScopeSummary);
  const url = safeUrl(params.inboxUrl);
  const urlAttr = url.replace(/"/g, "&quot;");
  const urlText = escapeHtml(url);

  const headline = `${safeAmendingOrg} hat den Scope angepasst`;
  const subline =
    params.originalDirection === "ATLAS_INVITES_CAELEX"
      ? `Ihre Mandatsanfrage wurde mit engerem Scope zurückgegeben. Bitte gegenzeichnen oder zurückziehen.`
      : `Ihre Anwalts-Einbindung wurde mit engerem Scope zurückgegeben. Bitte gegenzeichnen oder zurückziehen.`;

  const subject = `Scope angepasst — ${params.matterName} · Caelex Legal Network`;

  const durationLine = params.durationChanged
    ? `<tr><td style="padding:0 24px 18px;">
         <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Laufzeit</div>
         <div style="font-size:13px;color:#333;line-height:1.55;">
           ${escapeHtml(String(params.amendedDurationMonths))} Monate${
             params.originalDurationMonths
               ? ` <span style="color:#888;">(zuvor ${escapeHtml(String(params.originalDurationMonths))})</span>`
               : ""
           }
         </div>
       </td></tr>`
    : "";

  const changesBlock = safeChanges
    ? `<tr><td style="padding:6px 24px 6px;">
         <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Was sich geändert hat</div>
         <div style="font-size:13px;color:#a0522d;line-height:1.55;">${safeChanges}</div>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Segoe UI,Helvetica,Arial,sans-serif;color:#111;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width:520px;">
        <tr><td style="padding:0 0 32px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Caelex · Legal Network · Gegenzeichnung</td></tr>
        <tr><td style="padding:0 0 12px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;">${headline}</td></tr>
        <tr><td style="padding:0 0 28px;font-size:14px;line-height:1.5;color:#555;">${subline}</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #eee;border-radius:14px;">
            <tr><td style="padding:22px 24px 16px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Mandat</div>
              <div style="font-size:16px;font-weight:600;color:#111;">${safeMatter}${safeRef ? `<span style="color:#888;font-weight:400;"> · Ref. ${safeRef}</span>` : ""}</div>
            </td></tr>
            ${changesBlock}
            <tr><td style="padding:6px 24px 18px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Finaler Scope nach Anpassung</div>
              <div style="font-size:13px;color:#333;line-height:1.55;">${safeFinalScope}</div>
            </td></tr>
            ${durationLine}
            <tr><td style="padding:6px 24px 22px;">
              <div style="font-size:13px;color:#555;line-height:1.55;">Nach Ihrer Gegenzeichnung wird das Mandat aktiv und alle Zugriffe werden im Hash-Chain-Audit-Log signiert. Sie können stattdessen auch ablehnen, falls der angepasste Scope nicht reicht.</div>
            </td></tr>
            <tr><td style="padding:4px 24px 22px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${urlAttr}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#111">
                <w:anchorlock/><center style="color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;">Anpassung prüfen</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${urlAttr}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:-0.005em;">Anpassung prüfen</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;font-size:11px;color:#888;line-height:1.6;">
          Vorgeschlagen von ${safeAmendingUser} bei ${safeAmendingOrg}.<br/>
          Falls der Button nicht funktioniert: <span style="word-break:break-all;">${urlText}</span>
        </td></tr>
        <tr><td style="padding:24px 0 0;font-size:10px;color:#999;letter-spacing:0.04em;">
          Caelex GmbH · hi@caelex.eu · <a href="https://www.caelex.eu" style="color:#999;text-decoration:underline;">caelex.eu</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textChanges = params.scopeChangesSummary
    ? `Was sich geändert hat: ${params.scopeChangesSummary}\n\n`
    : "";
  const textDuration = params.durationChanged
    ? `Laufzeit: ${params.amendedDurationMonths} Monate${
        params.originalDurationMonths
          ? ` (zuvor ${params.originalDurationMonths})`
          : ""
      }\n`
    : "";

  const text = [
    headline,
    "",
    subline,
    "",
    `Mandat: ${params.matterName}${params.matterReference ? ` (Ref. ${params.matterReference})` : ""}`,
    "",
    textChanges + `Finaler Scope nach Anpassung: ${params.amendedScopeSummary}`,
    textDuration,
    "Nach Ihrer Gegenzeichnung wird das Mandat aktiv und alle Zugriffe werden im Hash-Chain-Audit-Log signiert. Sie können stattdessen auch ablehnen, falls der angepasste Scope nicht reicht.",
    "",
    `Anpassung prüfen: ${url}`,
    "",
    `Vorgeschlagen von ${params.amendingUserName} bei ${params.amendingOrgName}.`,
    "",
    "— Caelex · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
