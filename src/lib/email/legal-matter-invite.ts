import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Matter invite email renderer. Sent to the counter-party
 * when an Atlas law firm invites a Caelex operator (or vice versa)
 * to establish a bilateral LegalMatter.
 *
 * Follows the brand template pattern from invitation.ts:
 *   - HTML-escape every user-controllable placeholder
 *   - Scheme-validate the accept URL so a bug upstream can't inject
 *     a javascript: link
 *   - Plain-text fallback for clients that reject HTML
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface LegalMatterInviteEmailParams {
  /** Name of the org initiating the handshake. */
  inviterOrgName: string;
  /** User who clicked "invite" (display name or email). */
  inviterName: string;
  /** Name of the org receiving the invitation. */
  recipientOrgName: string;
  /** Matter's human-readable name. */
  matterName: string;
  /** Optional internal firm reference. */
  matterReference?: string | null;
  /** High-level scope summary (already humanised, e.g. "Compliance,
   *  Authorization, Deadlines — Lesen, Notizen"). */
  scopeSummary: string;
  /** Consent link embedding the raw token. */
  acceptUrl: string;
  /** Hours until the invitation expires. Default 72 per Phase 1 design. */
  expiresInHours: number;
  /** Direction — affects phrasing ("requests access" vs. "offers to advise"). */
  direction: "ATLAS_INVITES_CAELEX" | "CAELEX_INVITES_ATLAS";
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

export function renderLegalMatterInviteEmail(
  params: LegalMatterInviteEmailParams,
): { subject: string; html: string; text: string } {
  const safeInviterOrg = escapeHtml(params.inviterOrgName);
  const safeInviter = escapeHtml(params.inviterName);
  const safeRecipientOrg = escapeHtml(params.recipientOrgName);
  const safeMatter = escapeHtml(params.matterName);
  const safeRef = params.matterReference
    ? escapeHtml(params.matterReference)
    : "";
  const safeScope = escapeHtml(params.scopeSummary);
  const url = safeUrl(params.acceptUrl);
  const urlAttr = url.replace(/"/g, "&quot;");
  const urlText = escapeHtml(url);

  const headline =
    params.direction === "ATLAS_INVITES_CAELEX"
      ? `${safeInviterOrg} möchte Sie rechtlich beraten`
      : `${safeInviterOrg} möchte Sie als Kanzlei einbinden`;
  const ctaCopy =
    params.direction === "ATLAS_INVITES_CAELEX"
      ? `Als Mandant bestätigen Sie beidseitig, welche Compliance-Daten Ihr Anwalt sehen darf. Sie behalten Kontrolle, können den Zugriff jederzeit widerrufen, und jeder Zugriff wird hash-chain-signiert geloggt.`
      : `Als Kanzlei bestätigen Sie, dass Sie im Legal Network dieser Mandanten-Organisation eingebunden werden möchten.`;

  const subject = `${params.inviterOrgName} — Mandats-Anfrage über Caelex Legal Network`;

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
        <tr><td style="padding:0 0 32px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Caelex · Legal Network</td></tr>
        <tr><td style="padding:0 0 32px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;">${headline}</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #eee;border-radius:14px;">
            <tr><td style="padding:22px 24px 16px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Mandat</div>
              <div style="font-size:16px;font-weight:600;color:#111;">${safeMatter}${safeRef ? `<span style="color:#888;font-weight:400;"> · Ref. ${safeRef}</span>` : ""}</div>
            </td></tr>
            <tr><td style="padding:6px 24px 18px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Geplanter Scope</div>
              <div style="font-size:13px;color:#333;line-height:1.55;">${safeScope}</div>
            </td></tr>
            <tr><td style="padding:10px 24px 22px;">
              <div style="font-size:13px;color:#555;line-height:1.55;">${ctaCopy}</div>
            </td></tr>
            <tr><td style="padding:4px 24px 22px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${urlAttr}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#111">
                <w:anchorlock/><center style="color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;">Einladung prüfen</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${urlAttr}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:-0.005em;">Einladung prüfen</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;font-size:11px;color:#888;line-height:1.6;">
          Einladung läuft in ${params.expiresInHours} Stunden ab. Link nicht klicken, falls unbekannt — es wird ohne beidseitige Zustimmung kein Zugriff erteilt.<br/>
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

  const text = [
    headline.replace(/<[^>]+>/g, ""),
    "",
    `Mandat: ${params.matterName}${params.matterReference ? ` (Ref. ${params.matterReference})` : ""}`,
    `Geplanter Scope: ${params.scopeSummary}`,
    "",
    ctaCopy.replace(/<[^>]+>/g, ""),
    "",
    `Einladung prüfen: ${url}`,
    "",
    `Die Einladung läuft in ${params.expiresInHours} Stunden ab. Link nicht klicken, falls unbekannt — ohne beidseitige Zustimmung wird kein Zugriff erteilt.`,
    "",
    `Signiert durch ${params.inviterName} bei ${params.inviterOrgName}.`,
    "",
    "— Caelex · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
