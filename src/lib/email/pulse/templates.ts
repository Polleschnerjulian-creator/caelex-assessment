/**
 * Pulse Email Templates — Sprint 4E
 *
 * Plain HTML templates for the funnel-stage nurture sequence.
 *
 * **Why hand-rolled HTML:** every existing Caelex template (deadline-
 * reminder, document-expiry, etc.) is a render-function returning
 * `{ subject, html, text }`. We follow the same convention so the
 * nurture-emails route through the existing `sendEmail()` dispatcher
 * with no special-casing.
 *
 * **Cadence (counted from `PulseLead.createdAt`):**
 *
 *   - Day 0  — delivery email with download link to the PDF report
 *   - Day 1  — "Did you read your report?" with 3 highlights from the
 *             user's actual cross-verification result
 *   - Day 3  — Comparison: regulatory pitfalls similar operators have
 *             hit, mapped against the prospect's detected jurisdiction
 *   - Day 7  — Final nudge: book a demo or sign up; this is the last
 *             email until they take action
 *
 * **Personalisation:** each template receives `PulseEmailContext` and
 * personalises by legalName, detected establishment country, and (if
 * any) merged-field values. Templates fall back to generic copy when
 * detection produced no fields (T0_UNVERIFIED case).
 *
 * **Plaintext fallback:** every template returns both `html` and
 * `text` because some corporate gateways strip HTML.
 */

export interface PulseEmailContext {
  legalName: string;
  email: string;
  leadId: string;
  reportUrl: string; // absolute URL to /api/public/pulse/report/[leadId]
  signupUrl: string; // absolute URL to /signup?leadId=...
  demoUrl: string; // absolute URL to /demo?leadId=...
  unsubscribeUrl: string;
  // Detection snapshot — same shape as PulsePdfData
  successfulSourceCount: number;
  failedSourceCount: number;
  mergedFields: Array<{
    fieldName: string;
    value: unknown;
    agreementCount: number;
  }>;
  establishment: string | null; // e.g. "DE" if detected
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ─── Shared HTML chrome ────────────────────────────────────────────────────

const COLORS = {
  navy: "#0F172A",
  navyDark: "#0A0F1E",
  emerald: "#10B981",
  emeraldDark: "#059669",
  slate: "#64748B",
  slateLight: "#94A3B8",
  bg: "#F8FAFC",
} as const;

function shell(content: string, ctx: PulseEmailContext): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Caelex Compliance Pulse</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.navy};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
            <tr>
              <td style="background:${COLORS.navyDark};padding:18px 24px;color:#FFFFFF;font-weight:bold;letter-spacing:2px;font-size:13px;">
                CAELEX · COMPLIANCE PULSE
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;font-size:14px;line-height:1.55;color:${COLORS.navy};">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;border-top:1px solid #E2E8F0;background:#FAFAFA;font-size:11px;color:${COLORS.slate};">
                Caelex Compliance · caelex.eu · Lead ${ctx.leadId.slice(0, 16)}…<br/>
                <a href="${ctx.unsubscribeUrl}" style="color:${COLORS.slate};text-decoration:underline;">Unsubscribe from this nurture sequence</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLORS.emerald};color:#FFFFFF;font-weight:bold;padding:12px 22px;border-radius:8px;text-decoration:none;font-size:14px;">${label}</a>`;
}

function secondaryButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#F1F5F9;color:${COLORS.navy};font-weight:600;padding:12px 22px;border-radius:8px;text-decoration:none;font-size:14px;border:1px solid #E2E8F0;">${label}</a>`;
}

function fieldList(
  fields: PulseEmailContext["mergedFields"],
  successfulSourceCount: number,
): string {
  if (fields.length === 0) return "";
  const FIELD_LABELS: Record<string, string> = {
    establishment: "Country of establishment",
    isConstellation: "Operates a constellation",
    constellationSize: "Constellation size",
    primaryOrbit: "Primary orbit class",
    operatorType: "Operator type",
    entitySize: "Entity size",
  };
  const rows = fields
    .map(
      (f) => `<li style="margin-bottom:6px;">
        <strong>${FIELD_LABELS[f.fieldName] ?? f.fieldName}:</strong>
        <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;">${escapeHtml(String(f.value))}</code>
        <span style="color:${COLORS.slate};font-size:12px;"> · ${f.agreementCount}/${successfulSourceCount} sources confirmed</span>
      </li>`,
    )
    .join("");
  return `<ul style="padding-left:18px;margin:12px 0;">${rows}</ul>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Day-0: Delivery email ─────────────────────────────────────────────────

export function renderDay0Delivery(ctx: PulseEmailContext): RenderedEmail {
  const fieldCount = ctx.mergedFields.length;
  const headline =
    fieldCount > 0
      ? `Your Caelex Pulse report is ready — ${fieldCount} verified field${fieldCount === 1 ? "" : "s"}`
      : `Your Caelex Pulse report is ready`;

  const intro =
    fieldCount > 0
      ? `<p>Hi ${escapeHtml(ctx.legalName)},</p>
         <p>Your cross-verification just finished. Caelex hit four authoritative public sources (VIES, GLEIF, UNOOSA, CelesTrak) and confirmed <strong>${fieldCount} field${fieldCount === 1 ? "" : "s"}</strong> across ${ctx.successfulSourceCount} of ${ctx.successfulSourceCount + ctx.failedSourceCount} sources.</p>`
      : `<p>Hi ${escapeHtml(ctx.legalName)},</p>
         <p>Your Pulse run finished. The four authoritative public sources we checked didn't have data on your operator profile yet — that's normal for early-stage operators. We've still prepared your report with the full regulatory context for your jurisdiction.</p>`;

  const html = shell(
    `
${intro}
${fieldCount > 0 ? `<p><strong>What we found:</strong></p>${fieldList(ctx.mergedFields, ctx.successfulSourceCount)}` : ""}
<p style="margin:20px 0 12px;">${button("Download your 15-page PDF report", ctx.reportUrl)}</p>
<p style="color:${COLORS.slate};font-size:12px;">The report includes per-source detail, regulatory context (EU Space Act + NIS2 + COPUOS), jurisdictional authorities, and recommended next steps. Print-shareable — no PII inside.</p>
<hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0;" />
<p>The next step depends on where you are in your compliance journey:</p>
<p>
  ${button("Sign up for free", ctx.signupUrl)}
  &nbsp;
  ${secondaryButton("Book a demo", ctx.demoUrl)}
</p>
<p style="color:${COLORS.slate};font-size:12px;margin-top:18px;">If neither feels right yet, we'll check in over the next week with a few short emails — three more, then we stop. You can <a href="${ctx.unsubscribeUrl}" style="color:${COLORS.slate};">unsubscribe</a> any time.</p>
`,
    ctx,
  );

  const text = `${headline}

Hi ${ctx.legalName},

Your Pulse cross-verification is complete. ${
    fieldCount > 0
      ? `We confirmed ${fieldCount} field(s) across ${ctx.successfulSourceCount} of ${ctx.successfulSourceCount + ctx.failedSourceCount} authoritative public sources.`
      : `The 4 sources had no public data for you yet — your report includes the regulatory context for your jurisdiction.`
  }

Download your 15-page PDF report:
${ctx.reportUrl}

Sign up free: ${ctx.signupUrl}
Book a demo:  ${ctx.demoUrl}

You'll hear from us 3 more times over the next week. Unsubscribe: ${ctx.unsubscribeUrl}

— Caelex Compliance · Lead ${ctx.leadId}`;

  return { subject: headline, html, text };
}

// ─── Day-1: Highlights ─────────────────────────────────────────────────────

export function renderDay1Highlights(ctx: PulseEmailContext): RenderedEmail {
  const headline = `3 things to know from your Caelex Pulse report`;

  const establishmentLine = ctx.establishment
    ? `<li><strong>Jurisdiction:</strong> we detected <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;">${escapeHtml(ctx.establishment)}</code> across multiple authoritative registries. That maps to a specific NCA (national competent authority) footprint inside the EU Space Act.</li>`
    : `<li><strong>Jurisdiction:</strong> we couldn't auto-detect it from public sources, which means manual setup during onboarding. Don't worry — the assessment wizard handles this in 8 questions.</li>`;

  const html = shell(
    `
<p>Hi ${escapeHtml(ctx.legalName)},</p>
<p>Quick follow-up on your Pulse report from yesterday. If you didn't get to it, here are the three takeaways most operators care about:</p>

<ol style="padding-left:18px;line-height:1.7;">
  ${establishmentLine}
  <li><strong>EU Space Act applicability:</strong> 7 operator types, 9 modules. Your report's page 9 walks through each. Most early-stage space operators are SCO (Spacecraft Operator) or LO (Launch Operator).</li>
  <li><strong>NIS2 incident-reporting deadlines are live:</strong> 24h early-warning, 72h update, 30d final report. Penalties reach €10M. Your report's page 10 has the checklist.</li>
</ol>

<p style="margin:20px 0 12px;">${button("Re-open your full report", ctx.reportUrl)}</p>

<p style="margin-top:24px;">If you'd rather skip the reading and let someone walk you through, a 30-minute demo is on the house:</p>
<p>${secondaryButton("Book a demo", ctx.demoUrl)}</p>
`,
    ctx,
  );

  const text = `${headline}

Hi ${ctx.legalName},

Three takeaways from your Pulse report:

1. Jurisdiction: ${ctx.establishment ? `we detected ${ctx.establishment} across multiple authoritative registries.` : "couldn't auto-detect — manual setup needed in onboarding."}
2. EU Space Act: 7 operator types, 9 modules. Page 9 of the report walks through each.
3. NIS2: 24h / 72h / 30d incident-reporting deadlines, penalties up to €10M. Page 10.

Re-open the report: ${ctx.reportUrl}
Book a demo:       ${ctx.demoUrl}

Unsubscribe: ${ctx.unsubscribeUrl}

— Caelex Compliance · Lead ${ctx.leadId}`;

  return { subject: headline, html, text };
}

// ─── Day-3: Pitfalls ───────────────────────────────────────────────────────

export function renderDay3Pitfalls(ctx: PulseEmailContext): RenderedEmail {
  const headline = `Compliance pitfalls similar operators have hit`;

  const html = shell(
    `
<p>Hi ${escapeHtml(ctx.legalName)},</p>
<p>From talking to dozens of early-stage space operators, three pitfalls show up over and over. They're not theoretical — they cost real time and money:</p>

<ol style="padding-left:18px;line-height:1.7;">
  <li>
    <strong>Authorisation submitted without counsel review.</strong>
    The EU Space Act lets you self-submit, but a missing technical-documentation section means a 90-day NCA-clarification round-trip. Caelex catches the gap before submit.
  </li>
  <li>
    <strong>NIS2 mapped only to the 24h deadline.</strong>
    The full Article 21 covers 10 categories of cybersecurity-risk-management measures. Operators ship "incident response" but skip "supply-chain security" and "MFA" — and that's where the audits land.
  </li>
  <li>
    <strong>COPUOS 25-year-rule treated as a launch-day check, not a continuous obligation.</strong>
    Atmospheric drag changes with solar flux. Caelex's ephemeris engine forecasts your fleet's compliance posture every day, not once.
  </li>
</ol>

<p style="margin:24px 0 16px;">If any of these match what you're already worrying about, it might be time to look at the Caelex platform end-to-end:</p>
<p>${button("See the platform", ctx.signupUrl)} &nbsp; ${secondaryButton("Or book a 30-min demo", ctx.demoUrl)}</p>
`,
    ctx,
  );

  const text = `${headline}

Hi ${ctx.legalName},

Three pitfalls early-stage space operators run into:

1. Authorisation submitted without counsel review → 90-day NCA round-trip.
2. NIS2 mapped only to the 24h deadline, missing the rest of Art. 21.
3. COPUOS 25-year-rule treated as launch-day, not continuous.

Caelex catches all three. See the platform: ${ctx.signupUrl}
Or 30-min demo: ${ctx.demoUrl}

Unsubscribe: ${ctx.unsubscribeUrl}

— Caelex Compliance · Lead ${ctx.leadId}`;

  return { subject: headline, html, text };
}

// ─── Day-7: Final nudge ────────────────────────────────────────────────────

export function renderDay7FinalNudge(ctx: PulseEmailContext): RenderedEmail {
  const headline = `Last note from Caelex — your free tier is waiting`;

  const html = shell(
    `
<p>Hi ${escapeHtml(ctx.legalName)},</p>
<p>This is the last email in the Pulse-report nurture sequence. We won't send another unless you sign up or book a demo.</p>

<p>The Caelex free tier gives you:</p>
<ul style="padding-left:18px;line-height:1.7;">
  <li>1 mission slot — model one satellite or constellation end-to-end</li>
  <li>2 active workflows — e.g. EU Space Act authorisation + NIS2 cyber-readiness</li>
  <li>100 Astra-AI calls per month — enough to get through the assessment + draft your first technical document</li>
  <li>No expiring trial — compliance projects take months, we don't time-box</li>
</ul>

<p>Quote your lead ID at signup so we can pre-load your Pulse data:</p>
<p style="font-family:monospace;background:#F1F5F9;padding:10px 14px;border-radius:8px;display:inline-block;">${ctx.leadId}</p>

<p style="margin:20px 0 12px;">${button("Sign up for free", ctx.signupUrl)}</p>

<p style="margin-top:24px;color:${COLORS.slate};">If now isn't the right moment, your report stays available at <a href="${ctx.reportUrl}" style="color:${COLORS.slate};">this link</a> indefinitely. Reach out whenever — compliance@caelex.eu.</p>
`,
    ctx,
  );

  const text = `${headline}

Hi ${ctx.legalName},

Last email in the nurture sequence. The Caelex free tier:
- 1 mission slot
- 2 active workflows
- 100 Astra-AI calls per month
- No expiring trial

Lead ID for signup: ${ctx.leadId}

Sign up: ${ctx.signupUrl}
Report:  ${ctx.reportUrl}

Reach out anytime: compliance@caelex.eu
Unsubscribe: ${ctx.unsubscribeUrl}

— Caelex Compliance · Lead ${ctx.leadId}`;

  return { subject: headline, html, text };
}

// ─── Stage selector ────────────────────────────────────────────────────────

export type PulseEmailStage = "day0" | "day1" | "day3" | "day7";

export function renderPulseEmail(
  stage: PulseEmailStage,
  ctx: PulseEmailContext,
): RenderedEmail {
  switch (stage) {
    case "day0":
      return renderDay0Delivery(ctx);
    case "day1":
      return renderDay1Highlights(ctx);
    case "day3":
      return renderDay3Pitfalls(ctx);
    case "day7":
      return renderDay7FinalNudge(ctx);
  }
}
