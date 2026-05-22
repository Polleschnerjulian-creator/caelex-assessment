import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";
import { TradeBaseLayout, tradeStyles, tradeUrl } from "./trade-base";

/**
 * Trade welcome / access-granted email (Sprint E2).
 *
 * Sent when a user is granted ProductAccess.TRADE — either via Stripe
 * subscription, manual admin grant, or sales-assisted onboarding. This
 * is the user's first-time landing email for the Trade workspace.
 *
 * The body intentionally avoids product feature pitches (the user already
 * decided to buy/be granted access). Instead it orients them on:
 *  - The four core surfaces (Items, Counterparties, Operations, Licenses)
 *  - The "where to start" recommendation (set up compliance program first)
 *  - How to reach support
 *
 * For sales-assisted accounts, the support email is the customer's
 * dedicated account manager rather than the generic cs@.
 */

export interface TradeWelcomeAccessData {
  recipientName: string;
  /** Organisation display name. */
  organizationName: string;
  /**
   * Whether the org already has a TradeComplianceProgram row. If not, we
   * highlight the program-setup step as the "first thing" to do.
   */
  hasComplianceProgram: boolean;
  /**
   * Optional dedicated support contact (e.g. the sales rep / CSM).
   * Defaults to cs@caelex.eu when omitted.
   */
  supportEmail?: string;
  /**
   * Optional dedicated support contact display name (CSM full name).
   * Only used in the support sign-off when supportEmail is non-default.
   */
  supportContactName?: string;
}

function TradeWelcomeAccessEmail({
  recipientName,
  organizationName,
  hasComplianceProgram,
  supportEmail = "cs@caelex.eu",
  supportContactName,
}: TradeWelcomeAccessData) {
  return (
    <TradeBaseLayout
      previewText={`Welcome to Caelex Trade — your workspace is ready`}
    >
      <Text style={tradeStyles.text}>Hello {recipientName},</Text>

      <Text style={tradeStyles.heading}>
        Caelex Trade is live for {organizationName}.
      </Text>

      <Text style={tradeStyles.text}>
        Your Trade workspace is now active. The system covers classification
        across US, EU and MTCR jurisdictions, sanctions screening against six
        lists (OFAC SDN, BIS Entity, DDTC Debarred, EU FSF, UK OFSI, UN
        Consolidated), license determination across BIS / DDTC / BAFA / EU
        competent authorities, and the post-Dec-2025 OFAC trustee doctrine.
      </Text>

      {/* "Start here" card */}
      {!hasComplianceProgram ? (
        <Section style={tradeStyles.cardWarning}>
          <Text
            style={{
              ...tradeStyles.text,
              fontWeight: "600",
              margin: "0 0 8px 0",
              color: tradeStyles.colors.amber500,
            }}
          >
            Start here
          </Text>
          <Text style={{ ...tradeStyles.text, margin: 0 }}>
            Set up your Trade compliance program first. This grounds every
            downstream determination in your jurisdictions, authorities, and
            documented procedures — without it, license recommendations and
            screening results lack the program context auditors expect.
          </Text>
          <Section style={{ textAlign: "left" as const, margin: "16px 0 0 0" }}>
            <Button
              href={tradeUrl("/trade/program")}
              style={tradeStyles.primaryButton}
            >
              Set up Compliance Program →
            </Button>
          </Section>
        </Section>
      ) : (
        <Section style={tradeStyles.card}>
          <Text
            style={{
              ...tradeStyles.text,
              fontWeight: "600",
              margin: "0 0 8px 0",
            }}
          >
            Continue where you left off
          </Text>
          <Text style={{ ...tradeStyles.text, margin: 0 }}>
            Your compliance program is already configured. Add your first item
            or counterparty to start tracking determinations.
          </Text>
          <Section style={{ textAlign: "left" as const, margin: "16px 0 0 0" }}>
            <Button href={tradeUrl("/trade")} style={tradeStyles.primaryButton}>
              Open Workspace →
            </Button>
          </Section>
        </Section>
      )}

      {/* What's inside */}
      <Section style={tradeStyles.card}>
        <Text
          style={{
            ...tradeStyles.text,
            fontWeight: "600",
            margin: "0 0 12px 0",
          }}
        >
          Your four workspaces
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 8px 0" }}>
          <strong>Items</strong> — Track ECCN/USML/MTCR classifications.
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 8px 0" }}>
          <strong>Counterparties</strong> — Screen against six sanctions lists +
          50%-rule cascade.
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 8px 0" }}>
          <strong>Operations</strong> — Auto-determine license requirements and
          catch-all triggers.
        </Text>
        <Text style={{ ...tradeStyles.text, margin: 0 }}>
          <strong>Licenses</strong> — Track validity, expirations, and
          rotations.
        </Text>
      </Section>

      <Text style={tradeStyles.text}>
        Questions? Reply to this email or write to{" "}
        <a href={`mailto:${supportEmail}`} style={tradeStyles.link}>
          {supportEmail}
        </a>
        {supportContactName ? ` — ${supportContactName}` : ""}.
      </Text>
    </TradeBaseLayout>
  );
}

// ─── Render Function ────────────────────────────────────────────────

export async function renderTradeWelcomeAccess(
  data: TradeWelcomeAccessData,
): Promise<{ html: string; subject: string }> {
  const subject = `Welcome to Caelex Trade — ${data.organizationName}`;
  const html = await render(<TradeWelcomeAccessEmail {...data} />);
  return { html, subject };
}
