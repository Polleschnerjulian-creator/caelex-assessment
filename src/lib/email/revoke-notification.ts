import "server-only";

/**
 * Caelex ATLAS invitation-revoked notification — renderer.
 *
 * Sent to the recipient whose pending ATLAS invitation an org owner
 * just revoked. Informational only: the recipient has nothing to
 * click (no primary CTA), so the card contains a short explanation
 * plus a soft "contact your firm admin / hi@caelex.eu" path for
 * anyone who thinks the revoke was unintended.
 *
 * Design matches invitation.ts 1:1 — same Apple-style light stage,
 * hero headline on plain #fafafa, white card below for the body,
 * English hero + German body copy. Kept visually parallel so a
 * recipient who got both emails sees a coherent sequence.
 *
 * Placeholders (mustache style):
 *   {{organizationName}}                      — firm that revoked
 *   {{recipientFirstNameGreetingSuffix}}      — "" or " Anna" (leading space)
 *
 * Everything user-controllable is HTML-escaped. No URLs in the
 * rendered body (the only link is the static mailto:hi@caelex.eu)
 * so there's no invite-token re-exposure risk.
 */

export interface RevokeNotificationParams {
  organizationName: string;
  recipientEmail: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Best-effort first-name extraction from an email address.
 * Shared logic with invitation.ts — kept as a local copy rather than
 * a cross-file import because the two files evolve independently and
 * the function body is six lines.
 */
function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local) return "";
  const first = local.split(/[._\-+]/)[0] ?? "";
  if (first.length < 2) return "";
  if (!/^[a-zA-ZÀ-ÿ]/.test(first)) return "";
  if ((first.match(/\d/g)?.length ?? 0) >= Math.ceil(first.length / 2))
    return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

const TEMPLATE = `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Einladung zu ATLAS zurückgezogen</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Neutralise Gmail's auto dark-mode inversion for our grey palette */
    :root { color-scheme: light only; supported-color-schemes: light only; }

    @media only screen and (max-width: 620px) {
      .container  { width: 100% !important; padding: 0 20px !important; }
      .card       { padding: 32px 24px !important; }
      .display    { font-size: 30px !important; line-height: 1.1 !important; letter-spacing: -0.025em !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#fafafa; color:#0a0a0b; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif;">

  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#fafafa; opacity:0;">
    Ihre ausstehende Einladung zu {{organizationName}} auf ATLAS wurde zurückgezogen.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafafa;">
    <tr>
      <td align="center" style="padding: 56px 16px 24px 16px;">

        <!-- Caelex wordmark -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td align="left" style="padding-bottom: 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px; vertical-align:middle;">
                    <img src="https://www.caelex.eu/images/logo-black.png"
                         width="22" height="22" alt="Caelex"
                         style="display:block; width:22px; height:22px; border:0;">
                  </td>
                  <td style="vertical-align:middle; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:17px; font-weight:500; letter-spacing:-0.01em; color:#0a0a0b;">
                    caelex
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Hero -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <div class="display" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-weight:300; font-size:40px; line-height:1.06; letter-spacing:-0.03em; color:#0a0a0b;">
                Your ATLAS invitation<br>was revoked.
              </div>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 36px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:16px; font-weight:400; line-height:1.55; letter-spacing:-0.005em; color:rgba(10,10,11,0.58);">
                Die Einladung zu <strong style="color:#0a0a0b; font-weight:500;">{{organizationName}}</strong> auf Caelex ATLAS wurde von einem Firmen-Owner zur&uuml;ckgezogen. Sie haben keinen Zugang zu diesem Workspace.
              </div>
            </td>
          </tr>
        </table>

        <!-- Card: informational body -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background-color:#ffffff; border:1px solid rgba(10,10,11,0.08); border-radius:14px;">
          <tr>
            <td class="card" style="padding: 36px 40px;">

              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:15px; font-weight:400; line-height:1.6; letter-spacing:-0.005em; color:#0a0a0b; margin-bottom:4px;">
                Hallo{{recipientFirstNameGreetingSuffix}},
              </div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:15px; font-weight:400; line-height:1.6; letter-spacing:-0.005em; color:rgba(10,10,11,0.65); margin-bottom:20px;">
                Ein Administrator von {{organizationName}} hat Ihre ausstehende Einladung zu ATLAS zur&uuml;ckgezogen. Der zuvor versendete Einladungslink funktioniert nicht mehr.
              </div>

              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:14px; font-weight:400; line-height:1.6; letter-spacing:-0.005em; color:rgba(10,10,11,0.65); margin-bottom:8px;">
                <strong style="color:#0a0a0b; font-weight:500;">Was bedeutet das?</strong>
              </div>
              <ul style="margin:0 0 24px 0; padding-left:20px; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:14px; font-weight:400; line-height:1.65; letter-spacing:-0.005em; color:rgba(10,10,11,0.65);">
                <li style="margin-bottom:6px;">Es wurde kein Konto f&uuml;r Sie erstellt.</li>
                <li style="margin-bottom:6px;">Ihre E-Mail-Adresse wird nicht weiter von Caelex verarbeitet.</li>
                <li>Falls Sie bereits einen Account besitzen, bleibt dieser unber&uuml;hrt &mdash; nur die Workspace-Einladung ist entfallen.</li>
              </ul>

              <div style="margin-top:24px; padding-top:20px; border-top:1px solid rgba(10,10,11,0.08); font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:13px; line-height:1.6; color:rgba(10,10,11,0.65); letter-spacing:-0.005em;">
                <strong style="color:#0a0a0b; font-weight:500;">War das unerwartet?</strong><br>
                Wenden Sie sich bitte direkt an {{organizationName}} &mdash; wir k&ouml;nnen als Plattform keine Auskunft zu einzelnen Zugangsentscheidungen geben. F&uuml;r technische Fragen erreichen Sie uns unter
                <a href="mailto:hi@caelex.eu" style="color:#0a0a0b; text-decoration:underline; text-underline-offset:2px;">hi@caelex.eu</a>.
              </div>

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td align="center" style="padding: 40px 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="padding-right:8px; vertical-align:middle;">
                    <img src="https://www.caelex.eu/images/logo-black.png"
                         width="18" height="18" alt=""
                         style="display:block; width:18px; height:18px; border:0; opacity:0.55;">
                  </td>
                  <td style="vertical-align:middle; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:rgba(10,10,11,0.55); padding-right:10px;">
                    Atlas
                  </td>
                  <td style="vertical-align:middle; color:rgba(10,10,11,0.22); font-size:13px; padding-right:10px;">
                    &middot;
                  </td>
                  <td style="vertical-align:middle; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:400; color:rgba(10,10,11,0.55); letter-spacing:-0.005em;">
                    by Caelex
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 12px 24px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:12px; line-height:1.6; color:rgba(10,10,11,0.42); letter-spacing:-0.005em;">
                Automatisch versendet. Bitte nicht auf diese Adresse antworten.<br>
                Bei Fragen: <a href="mailto:hi@caelex.eu" style="color:rgba(10,10,11,0.55); text-decoration:underline; text-underline-offset:2px;">hi@caelex.eu</a>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 8px 24px 0 24px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:11px; color:rgba(10,10,11,0.35); letter-spacing:-0.005em;">
                Caelex &middot;
                <a href="https://www.caelex.eu" style="color:rgba(10,10,11,0.42); text-decoration:none;">caelex.eu</a> &middot;
                <a href="https://www.caelex.eu/legal/impressum" style="color:rgba(10,10,11,0.42); text-decoration:underline; text-underline-offset:2px;">Impressum</a> &middot;
                <a href="https://www.caelex.eu/legal/privacy" style="color:rgba(10,10,11,0.42); text-decoration:underline; text-underline-offset:2px;">Datenschutz</a>
              </div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

/**
 * Render the revoke-notification email with placeholders substituted.
 * Returns subject + html + plain-text alternative, ready to pass to
 * Resend's send() call.
 */
export function renderRevokeNotificationEmail(
  params: RevokeNotificationParams,
): {
  subject: string;
  html: string;
  text: string;
} {
  const safeOrg = escapeHtml(params.organizationName);

  const firstName = firstNameFromEmail(params.recipientEmail);
  const greetingSuffix = firstName ? ` ${escapeHtml(firstName)}` : "";

  const html = TEMPLATE.replace(/\{\{organizationName\}\}/g, safeOrg).replace(
    /\{\{recipientFirstNameGreetingSuffix\}\}/g,
    greetingSuffix,
  );

  const subject = `${params.organizationName} — Einladung zu ATLAS zurückgezogen`;

  const text = [
    firstName ? `Hallo ${firstName},` : "Hallo,",
    "",
    `ein Administrator von ${params.organizationName} hat Ihre ausstehende Einladung zu Caelex ATLAS zurückgezogen. Der zuvor versendete Einladungslink funktioniert nicht mehr.`,
    "",
    "Was bedeutet das:",
    "- Es wurde kein Konto für Sie erstellt.",
    "- Ihre E-Mail-Adresse wird nicht weiter von Caelex verarbeitet.",
    "- Falls Sie bereits einen Account besitzen, bleibt dieser unberührt.",
    "",
    `War das unerwartet? Bitte wenden Sie sich direkt an ${params.organizationName} — wir können als Plattform keine Auskunft zu einzelnen Zugangsentscheidungen geben. Technische Fragen: hi@caelex.eu.`,
    "",
    "— Caelex ATLAS · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
