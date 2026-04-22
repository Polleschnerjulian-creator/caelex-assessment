import "server-only";

/**
 * Caelex ATLAS invitation email — renderer.
 *
 * Apple-style light template (updated 2026-04-22 per brand refresh).
 * Hero headline on plain #fafafa stage, white card below holding the
 * action. English hero line, German body copy — matches the brand's
 * bilingual posture for EU law-firm audiences.
 *
 * Placeholders (mustache style, all substituted in renderInvitationEmail):
 *   {{organizationName}}    — inviting firm's name
 *   {{inviterName}}         — inviting user's display name or email
 *   {{recipientFirstName}}  — best-effort first name derived from email
 *   {{inviteUrl}}           — invite link (href-safe substitution)
 *   {{expiresInDays}}       — expiry in days (integer)
 *
 * Everything user-controllable is HTML-escaped; the invite URL is
 * scheme-validated (http/https only) to block javascript: injection.
 * Outlook VML fallback preserved for the CTA button.
 */

export interface InvitationEmailParams {
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  recipientEmail: string;
  expiresInDays: number;
}

/**
 * Escape untrusted input before it lands in the HTML body. Every
 * placeholder comes from the database and can legally contain HTML-
 * special characters — an org name with `&` or an inviter email
 * containing `<` must NOT render as markup.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * inviteUrl is the one placeholder that MUST stay unescaped inside
 * `href` attributes (otherwise the browser sees `&amp;` instead of `&`
 * in the query string). We still sanity-check that it's an http/https
 * URL so a bug upstream can't inject `javascript:`.
 */
function safeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "about:blank";
    return u.toString();
  } catch {
    return "about:blank";
  }
}

/**
 * Best-effort first-name extraction from an email address.
 *
 * Falls back to an empty string when the local part doesn't look
 * name-like (digits, short, hex), which lets the caller render
 * a neutral "Hallo," greeting without awkward "Hallo foo.bar123,".
 *
 * Examples:
 *   anna.schmidt@firm.eu     → "Anna"
 *   julian+atlas@caelex.eu   → "Julian"
 *   j.polleschner@caelex.eu  → "J"       (too short → "")
 *   5f7c@throwaway.example   → ""        (no letters in first segment)
 *   contact@firm.eu          → "Contact"
 */
function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local) return "";
  // Split on common separators then pick the first segment.
  const first = local.split(/[._\-+]/)[0] ?? "";
  // Reject non-name-like segments: too short, digit-heavy, or no
  // alphabetic content at all.
  if (first.length < 2) return "";
  if (!/^[a-zA-ZÀ-ÿ]/.test(first)) return "";
  if ((first.match(/\d/g)?.length ?? 0) >= Math.ceil(first.length / 2))
    return "";
  // Capitalise first letter, lower-case the rest — handles "ANNA"
  // and "anna" uniformly as "Anna".
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
  <title>Einladung zu ATLAS</title>
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
      .display    { font-size: 32px !important; line-height: 1.08 !important; letter-spacing: -0.025em !important; }
      .btn-cell a { width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#fafafa; color:#0a0a0b; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif;">

  <!-- Preheader (hidden preview text in inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#fafafa; opacity:0;">
    {{inviterName}} hat Sie zu ATLAS eingeladen — {{expiresInDays}} Tage gültig.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafafa;">
    <tr>
      <td align="center" style="padding: 56px 16px 24px 16px;">

        <!-- Caelex wordmark: logo + text, left-aligned at top -->
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

        <!-- Hero: Apple-style display headline on plain background (no card around it) -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <div class="display" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-weight:300; font-size:44px; line-height:1.04; letter-spacing:-0.03em; color:#0a0a0b;">
                You've been<br>invited to ATLAS.
              </div>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 36px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:16px; font-weight:400; line-height:1.55; letter-spacing:-0.005em; color:rgba(10,10,11,0.58);">
                <strong style="color:#0a0a0b; font-weight:500;">{{inviterName}}</strong> von {{organizationName}} hat Sie zu ATLAS hinzugefügt &mdash; der durchsuchbaren Space-Law-Datenbank für Kanzleien.
              </div>
            </td>
          </tr>
        </table>

        <!-- Card: only contains the action -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background-color:#ffffff; border:1px solid rgba(10,10,11,0.08); border-radius:14px;">
          <tr>
            <td class="card" style="padding: 36px 40px;">

              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:15px; font-weight:400; line-height:1.6; letter-spacing:-0.005em; color:#0a0a0b; margin-bottom:4px;">
                Hallo{{recipientFirstNameGreetingSuffix}},
              </div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:15px; font-weight:400; line-height:1.6; letter-spacing:-0.005em; color:rgba(10,10,11,0.65); margin-bottom:28px;">
                Mit Ihrem Zugang können Sie Weltraumrecht-Jurisdiktionen vergleichen, Lizenzierungsanforderungen durchsuchen, Compliance-Briefings exportieren und sich benachrichtigen lassen, sobald sich relevante Regelwerke ändern.
              </div>

              <!-- Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="btn-cell" align="left" style="border-radius:10px; background-color:#0a0a0b;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{inviteUrl}}" style="height:46px; v-text-anchor:middle; width:220px;" arcsize="22%" stroke="f" fillcolor="#0a0a0b">
                      <w:anchorlock/>
                      <center style="color:#ffffff; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; font-weight:600; letter-spacing:-0.005em;">Einladung annehmen &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="{{inviteUrl}}" style="display:inline-block; padding:13px 26px; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:15px; font-weight:600; letter-spacing:-0.005em; color:#ffffff; text-decoration:none; border-radius:10px; background-color:#0a0a0b;">
                      Einladung annehmen &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <div style="margin-top:24px; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:12px; line-height:1.55; color:rgba(10,10,11,0.55); letter-spacing:-0.005em;">
                Falls der Button nicht funktioniert, &ouml;ffnen Sie diesen Link:<br>
                <a href="{{inviteUrl}}" style="color:#0a0a0b; text-decoration:underline; text-underline-offset:2px; word-break:break-all;">{{inviteUrl}}</a>
              </div>

              <!-- Meta -->
              <div style="margin-top:24px; padding-top:20px; border-top:1px solid rgba(10,10,11,0.08); font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Arial,sans-serif; font-size:12px; line-height:1.55; color:rgba(10,10,11,0.55); letter-spacing:-0.005em;">
                Diese Einladung l&auml;uft in {{expiresInDays}} Tagen ab. Falls Sie diese E-Mail unerwartet erhalten, k&ouml;nnen Sie sie ignorieren &mdash; es wird kein Konto erstellt.
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
 * Render the invitation email with all placeholders substituted.
 * Returns an HTML string ready to pass to Resend's `html` field, a
 * matching plain-text alternative for clients that reject HTML, and
 * the subject line.
 */
export function renderInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const safeOrg = escapeHtml(params.organizationName);
  const safeInviter = escapeHtml(params.inviterName);
  const safeExpires = escapeHtml(String(params.expiresInDays));

  // First-name greeting: when we get a usable first name, render
  // "Hallo Anna,"; otherwise render a neutral "Hallo,". Implemented
  // via a greeting-suffix placeholder so the template has a single
  // substitution slot regardless of whether we have a name.
  const firstName = firstNameFromEmail(params.recipientEmail);
  const greetingSuffix = firstName ? ` ${escapeHtml(firstName)}` : "";

  const url = safeUrl(params.inviteUrl);
  // URL in attribute context: escape only `"` so we don't break the
  // attribute, but leave `&` intact so query strings survive.
  const urlAttr = url.replace(/"/g, "&quot;");
  // URL in text context (shown inline for copy-paste): full HTML-escape.
  const urlText = escapeHtml(url);

  const html = TEMPLATE.replace(/\{\{organizationName\}\}/g, safeOrg)
    .replace(/\{\{inviterName\}\}/g, safeInviter)
    .replace(/\{\{expiresInDays\}\}/g, safeExpires)
    .replace(/\{\{recipientFirstNameGreetingSuffix\}\}/g, greetingSuffix)
    // inviteUrl appears both inside href="" attributes and in body
    // text. Replace attribute form first (exact match of href="…"
    // prevents double-substitution) then the remaining text forms.
    .replace(/href="\{\{inviteUrl\}\}"/g, `href="${urlAttr}"`)
    .replace(/\{\{inviteUrl\}\}/g, urlText);

  const subject = `${params.organizationName} — Einladung zu ATLAS`;

  const text = [
    firstName ? `Hallo ${firstName},` : "Hallo,",
    "",
    `${params.inviterName} von ${params.organizationName} hat Sie zu Caelex ATLAS eingeladen — der durchsuchbaren Space-Law-Datenbank für Kanzleien.`,
    "",
    `Einladung annehmen: ${url}`,
    "",
    `Diese Einladung läuft in ${params.expiresInDays} Tagen ab. Falls Sie sie unerwartet erhalten, ignorieren Sie die E-Mail — es wird kein Konto erstellt.`,
    "",
    "— Caelex ATLAS · hi@caelex.eu · https://www.caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
