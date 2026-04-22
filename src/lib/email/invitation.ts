import "server-only";

/**
 * Caelex ATLAS invitation email — renderer.
 *
 * The canonical design lives as a standalone HTML file at
 * src/lib/email/templates/invitation.html so designers can preview it
 * without running Node. The TypeScript here ships the exact same HTML
 * as a template literal so runtime delivery doesn't depend on Vercel's
 * file-trace picking up an ad-hoc .html asset — one bundled constant,
 * one source of truth.
 *
 * If you edit the .html file, mirror the edit here (or vice versa).
 * The shape is load-bearing: Outlook VML fallback + mustache-style
 * placeholders + inline styles only. See the .html file's top comment
 * for placeholder names and design constraints.
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
 * containing `<` must NOT render as markup. Same rationale as H3 in
 * the /api/atlas/team route.
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

const TEMPLATE = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Einladung zu Caelex ATLAS</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">{{inviterName}} hat Sie zu {{organizationName}} auf Caelex ATLAS eingeladen.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F8FA;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;background-color:#0A0D12;color:#FFFFFF;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Caelex&nbsp;·&nbsp;ATLAS</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:600;color:#111827;line-height:1.3;">Einladung zu {{organizationName}}</h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">{{inviterName}} hat Sie eingeladen, dem Team von <strong style="color:#111827;">{{organizationName}}</strong> auf Caelex ATLAS beizutreten &mdash; der Regulatorik-Plattform f&uuml;r die Raumfahrtbranche.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                  <tr>
                    <td align="center" bgcolor="#10B981" style="border-radius:10px;">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{inviteUrl}}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="23%" stroke="f" fillcolor="#10B981">
                        <w:anchorlock/>
                        <center style="color:#FFFFFF;font-family:sans-serif;font-size:14px;font-weight:600;">Einladung annehmen</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-- -->
                      <a href="{{inviteUrl}}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;background-color:#10B981;border-radius:10px;">Einladung annehmen</a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#6B7280;">Oder kopieren Sie diesen Link in Ihren Browser:</p>
                <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;color:#10B981;word-break:break-all;font-family:'SF Mono',Menlo,Consolas,monospace;"><a href="{{inviteUrl}}" style="color:#10B981;text-decoration:underline;">{{inviteUrl}}</a></p>
                <hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0;" />
                <p style="margin:0 0 6px 0;font-size:12px;color:#6B7280;line-height:1.6;">Diese Einladung wurde an <strong style="color:#374151;">{{recipientEmail}}</strong> gesendet und ist {{expiresInDays}} Tage g&uuml;ltig.</p>
                <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">Falls Sie nicht erwartet haben, zu einer Organisation auf Caelex ATLAS eingeladen zu werden, ignorieren Sie diese E-Mail einfach &mdash; es wird kein Konto erstellt.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#FAFBFC;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;line-height:1.6;">
                <strong style="color:#374151;">Caelex GmbH</strong> &nbsp;&middot;&nbsp; The regulatory operating system for the orbital economy<br />
                <a href="https://caelex.eu" style="color:#9CA3AF;text-decoration:underline;">caelex.eu</a> &nbsp;&middot;&nbsp; <a href="mailto:hi@caelex.eu" style="color:#9CA3AF;text-decoration:underline;">hi@caelex.eu</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

/**
 * Render the invitation email with all placeholders substituted. Returns
 * an HTML string ready to pass to Resend's `html` field. The matching
 * text alternative for clients that reject HTML is returned separately
 * so Resend can include both parts.
 */
export function renderInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const safeOrg = escapeHtml(params.organizationName);
  const safeInviter = escapeHtml(params.inviterName);
  const safeRecipient = escapeHtml(params.recipientEmail);
  const safeExpires = escapeHtml(String(params.expiresInDays));
  const url = safeUrl(params.inviteUrl);
  // URL in attribute context: escape only `"` so we don't break the
  // attribute, but leave `&` intact so query strings survive.
  const urlAttr = url.replace(/"/g, "&quot;");
  // URL in text context (shown inline for copy-paste): full HTML-escape.
  const urlText = escapeHtml(url);

  const html = TEMPLATE.replace(/\{\{organizationName\}\}/g, safeOrg)
    .replace(/\{\{inviterName\}\}/g, safeInviter)
    .replace(/\{\{recipientEmail\}\}/g, safeRecipient)
    .replace(/\{\{expiresInDays\}\}/g, safeExpires)
    // inviteUrl appears both inside href="" attributes and in body text.
    // Using attribute-safe form everywhere is correct — & stays literal,
    // " is encoded, which is valid inside text too.
    .replace(/href="\{\{inviteUrl\}\}"/g, `href="${urlAttr}"`)
    .replace(/\{\{inviteUrl\}\}/g, urlText);

  const subject = `${params.organizationName} — Einladung zu Caelex ATLAS`;

  const text = [
    `${params.inviterName} hat Sie zu ${params.organizationName} auf Caelex ATLAS eingeladen.`,
    "",
    `Einladung annehmen: ${url}`,
    "",
    `Diese Einladung wurde an ${params.recipientEmail} gesendet und ist ${params.expiresInDays} Tage gültig.`,
    "",
    "Falls Sie nicht erwartet haben, eingeladen zu werden, ignorieren Sie diese E-Mail — es wird kein Konto erstellt.",
    "",
    "— Caelex · hi@caelex.eu · https://caelex.eu",
  ].join("\n");

  return { subject, html, text };
}
