import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Rejection email — sent to the OTHER side when a matter is rejected
 * (either the original invite or a counter-amendment). Recipient is
 * always the side that didn't click reject.
 *
 * Why a separate template from "activated":
 *   - Different visual treatment (neutral-red vs success-green).
 *   - The CTA differs — recipient probably wants /atlas/network or
 *     /dashboard/network/legal-counsel to start over, not a workspace
 *     link (the matter no longer has one).
 *   - Reason is prominently surfaced; activated email doesn't have a
 *     reason.
 *
 * Same XSS-safety pattern as legal-matter-invite.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface LegalMatterRejectedEmailParams {
  /** Org of the user who clicked reject. */
  rejectingOrgName: string;
  /** Display name of the rejecting user. */
  rejectingUserName: string;
  /** Org receiving this email (the side waiting for an answer). */
  recipientOrgName: string;
  matterName: string;
  matterReference?: string | null;
  /** Verbatim reason as supplied. Empty string = no reason given. */
  reason: string;
  /** Where to send the recipient to start over. Side-aware:
   *    Atlas (law firm) → /atlas/network
   *    Caelex (operator) → /dashboard/network/legal-counsel */
  newAttemptUrl: string;
  /** Whether this rejected an original invite (pending) or a
   *  counter-amendment (negotiation broke down). Affects copy. */
  flow: "ORIGINAL_REJECTED" | "COUNTER_AMENDMENT_REJECTED";
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
      return "https://caelex.eu/";
    }
    return url.toString();
  } catch {
    return "https://caelex.eu/";
  }
}

export function renderLegalMatterRejectedEmail(
  params: LegalMatterRejectedEmailParams,
): { subject: string; html: string; text: string } {
  const safeRejectingOrg = escapeHtml(params.rejectingOrgName);
  const safeRejectingUser = escapeHtml(params.rejectingUserName);
  const safeMatter = escapeHtml(params.matterName);
  const safeRef = params.matterReference
    ? escapeHtml(params.matterReference)
    : "";
  const safeReason = params.reason ? escapeHtml(params.reason) : "";
  const url = safeUrl(params.newAttemptUrl);
  const urlAttr = url.replace(/"/g, "&quot;");
  const urlText = escapeHtml(url);

  const headline =
    params.flow === "COUNTER_AMENDMENT_REJECTED"
      ? `Anpassung wurde abgelehnt — Mandat geschlossen`
      : `${safeRejectingOrg} hat abgelehnt`;
  const subline =
    params.flow === "COUNTER_AMENDMENT_REJECTED"
      ? `Die ausgehandelten Anpassungen wurden vom ursprünglichen Anfragenden zurückgewiesen. Das Mandat ist geschlossen, Sie können einen neuen Anlauf mit anderen Konditionen starten.`
      : `Die Mandatsanfrage wurde nicht angenommen. Sie können einen neuen Anlauf mit angepasstem Scope oder Konditionen starten.`;

  const subject = `Abgelehnt — ${params.matterName} · Caelex Legal Network`;

  const reasonBlock = safeReason
    ? `<tr><td style="padding:6px 24px 18px;">
         <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Begründung</div>
         <div style="font-size:13px;color:#333;line-height:1.6;font-style:italic;border-left:3px solid #cbd5e1;padding-left:12px;">${safeReason}</div>
       </td></tr>`
    : `<tr><td style="padding:6px 24px 18px;">
         <div style="font-size:13px;color:#888;font-style:italic;">Keine Begründung angegeben.</div>
       </td></tr>`;

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
        <tr><td style="padding:0 0 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;">Caelex · Legal Network · Abgelehnt</td></tr>
        <tr><td style="padding:0 0 12px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;">${headline}</td></tr>
        <tr><td style="padding:0 0 28px;font-size:14px;line-height:1.5;color:#555;">${subline}</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #eee;border-radius:14px;">
            <tr><td style="padding:22px 24px 16px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Mandat</div>
              <div style="font-size:16px;font-weight:600;color:#111;">${safeMatter}${safeRef ? `<span style="color:#888;font-weight:400;"> · Ref. ${safeRef}</span>` : ""}</div>
            </td></tr>
            ${reasonBlock}
            <tr><td style="padding:4px 24px 22px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${urlAttr}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#111">
                <w:anchorlock/><center style="color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;">Neuen Anlauf starten</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${urlAttr}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:-0.005em;">Neuen Anlauf starten</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;font-size:11px;color:#888;line-height:1.6;">
          Abgelehnt durch ${safeRejectingUser} bei ${safeRejectingOrg}.<br/>
          Der Audit-Log dieses geschlossenen Mandats bleibt einsehbar.<br/>
          Falls der Button nicht funktioniert: <span style="word-break:break-all;">${urlText}</span>
        </td></tr>
        <tr><td style="padding:24px 0 0;font-size:10px;color:#999;letter-spacing:0.04em;">
          Caelex (Julian Polleschner, Berlin) · hi@caelex.eu · <a href="https://www.caelex.eu" style="color:#999;text-decoration:underline;">caelex.eu</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    headline,
    "",
    subline,
    "",
    `Mandat: ${params.matterName}${params.matterReference ? ` (Ref. ${params.matterReference})` : ""}`,
    "",
    params.reason
      ? `Begründung: ${params.reason}`
      : "Begründung: nicht angegeben",
    "",
    `Neuen Anlauf starten: ${url}`,
    "",
    `Abgelehnt durch ${params.rejectingUserName} bei ${params.rejectingOrgName}.`,
    `Der Audit-Log dieses geschlossenen Mandats bleibt einsehbar.`,
    "",
    "— Caelex · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
