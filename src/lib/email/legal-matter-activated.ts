import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Activation email — sent to the OTHER side when a matter transitions
 * to ACTIVE. Two firing scenarios:
 *
 *   1. Direct accept: counter-party accepted the original invite.
 *      Recipient = original inviter (the lawyer or operator who
 *      created the matter and was waiting).
 *
 *   2. Counter-sign accept: original inviter signed the counter-
 *      party's amendment. Recipient = the counter-party (who amended
 *      and was waiting).
 *
 * The actor never gets this email — they just clicked something and
 * already know it worked from the UI. Email serves the waiting side.
 *
 * Same XSS-safety pattern as legal-matter-invite.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface LegalMatterActivatedEmailParams {
  /** Org of the user who just acted (acceptor or counter-signer). */
  actorOrgName: string;
  /** Display name of the user who acted. */
  actorUserName: string;
  /** Org receiving this email (the side that was waiting). */
  recipientOrgName: string;
  /** Matter's human-readable name. */
  matterName: string;
  matterReference?: string | null;
  /** Humanised final scope, e.g. "Compliance (Lesen/Notizen)". */
  scopeSummary: string;
  /** Validity window in months. */
  durationMonths: number;
  /** Workspace URL — the recipient lands here on click. */
  workspaceUrl: string;
  /** Whether this was a direct accept or a counter-sign. Affects copy. */
  flow: "DIRECT_ACCEPT" | "COUNTER_SIGN_ACCEPT";
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

export function renderLegalMatterActivatedEmail(
  params: LegalMatterActivatedEmailParams,
): { subject: string; html: string; text: string } {
  const safeActorOrg = escapeHtml(params.actorOrgName);
  const safeActorUser = escapeHtml(params.actorUserName);
  const safeMatter = escapeHtml(params.matterName);
  const safeRef = params.matterReference
    ? escapeHtml(params.matterReference)
    : "";
  const safeScope = escapeHtml(params.scopeSummary);
  const url = safeUrl(params.workspaceUrl);
  const urlAttr = url.replace(/"/g, "&quot;");
  const urlText = escapeHtml(url);

  const headline =
    params.flow === "COUNTER_SIGN_ACCEPT"
      ? `Ihre Anpassung wurde angenommen — Mandat ist aktiv`
      : `${safeActorOrg} hat zugestimmt — Mandat ist aktiv`;
  const subline =
    params.flow === "COUNTER_SIGN_ACCEPT"
      ? `Der ursprüngliche Anfragende hat den engeren Scope gegengezeichnet. Beide Seiten haben jetzt Zugriff im final ausgehandelten Umfang.`
      : `Beide Seiten haben den Handshake bestätigt. Sie können jetzt im Workspace mit der gemeinsamen Arbeit beginnen — alle Zugriffe werden hash-chain-signiert geloggt.`;

  const subject = `Aktiviert — ${params.matterName} · Caelex Legal Network`;

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
        <tr><td style="padding:0 0 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#10b981;">✓ Caelex · Legal Network · Aktiviert</td></tr>
        <tr><td style="padding:0 0 12px;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;">${headline}</td></tr>
        <tr><td style="padding:0 0 28px;font-size:14px;line-height:1.5;color:#555;">${subline}</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #eee;border-radius:14px;">
            <tr><td style="padding:22px 24px 16px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Mandat</div>
              <div style="font-size:16px;font-weight:600;color:#111;">${safeMatter}${safeRef ? `<span style="color:#888;font-weight:400;"> · Ref. ${safeRef}</span>` : ""}</div>
            </td></tr>
            <tr><td style="padding:6px 24px 18px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Aktiver Scope</div>
              <div style="font-size:13px;color:#333;line-height:1.55;">${safeScope}</div>
            </td></tr>
            <tr><td style="padding:0 24px 18px;">
              <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#777;margin-bottom:6px;">Laufzeit</div>
              <div style="font-size:13px;color:#333;line-height:1.55;">${escapeHtml(String(params.durationMonths))} Monate, jederzeit beidseitig kündbar</div>
            </td></tr>
            <tr><td style="padding:4px 24px 22px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${urlAttr}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#10b981">
                <w:anchorlock/><center style="color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;">Workspace öffnen</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${urlAttr}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:-0.005em;">Workspace öffnen</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;font-size:11px;color:#888;line-height:1.6;">
          Aktion durch ${safeActorUser} bei ${safeActorOrg}.<br/>
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
    `Aktiver Scope: ${params.scopeSummary}`,
    `Laufzeit: ${params.durationMonths} Monate, jederzeit beidseitig kündbar`,
    "",
    `Workspace öffnen: ${url}`,
    "",
    `Aktion durch ${params.actorUserName} bei ${params.actorOrgName}.`,
    "",
    "— Caelex · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
