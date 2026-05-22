import {
  Text,
  Button,
  Section,
  Row,
  Column,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";
import { TradeBaseLayout, tradeStyles, tradeUrl } from "./trade-base";

/**
 * Trade catch-all trigger email (Sprint E2).
 *
 * The "catch-all" rule (BIS 15 CFR §744 + analogous EU + BAFA provisions)
 * captures otherwise-uncontrolled items that are KNOWN, or where there is
 * REASON TO KNOW, that they are destined for prohibited end-uses or end-
 * users — typically WMD programs, military intelligence, or sanctioned-
 * jurisdiction military-end-use.
 *
 * When the property-trigger-engine identifies a CATCH_ALL hit (e.g.
 * Russian satellite imagery customer + dual-use sensor), this email
 * alerts the trade officer so they can:
 *  - File a BIS Catch-All Determination
 *  - Decide whether to halt or pursue authorisation
 *  - Document the "reason to know" finding for audit
 *
 * Legal context: catch-all triggers create a *due diligence obligation*
 * even if the underlying item is EAR99 or no-license-required by ECCN.
 * Failure to act on a triggered catch-all is treated as constructive
 * knowledge under §744.21 and §744.6.
 */

export interface TradeCatchAllTriggerData {
  recipientName: string;
  /** The TradeOperation that fired the trigger. */
  operationId: string;
  operationReference: string;
  /** Counterparty name + country for context. */
  counterpartyName: string;
  counterpartyCountry: string;
  /** Property-trigger-engine rule that fired (e.g. "MILITARY_END_USE"). */
  triggerRule: string;
  /** Property-trigger-engine emitted description. */
  triggerDescription: string;
  /** Regulatory citation, e.g. "15 CFR §744.21 (MEU)". */
  triggerCitation: string;
  /** Confidence emitted by the engine. */
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

function TradeCatchAllEmail({
  recipientName,
  operationId,
  operationReference,
  counterpartyName,
  counterpartyCountry,
  triggerRule,
  triggerDescription,
  triggerCitation,
  confidence,
}: TradeCatchAllTriggerData) {
  return (
    <TradeBaseLayout
      previewText={`Catch-all trigger on operation ${operationReference} — ${triggerRule}`}
    >
      <Text style={tradeStyles.text}>Hello {recipientName},</Text>

      <Text style={tradeStyles.heading}>Catch-all due-diligence trigger</Text>

      <Text style={tradeStyles.text}>
        The Trade engine has detected a circumstance that triggers a catch-all
        review on an active operation. Catch-all provisions create a licensing
        obligation even when the item itself is uncontrolled (EAR99 /
        no-license-required by ECCN), if there is reason to know the end-use or
        end-user is prohibited.
      </Text>

      {/* Operation card */}
      <Section style={tradeStyles.cardWarning}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                ...tradeStyles.text,
                fontWeight: "600",
                margin: "0 0 6px 0",
                fontSize: "15px",
              }}
            >
              {operationReference}
            </Text>
            <Text style={{ ...tradeStyles.mutedText, margin: 0 }}>
              {counterpartyName} · {counterpartyCountry}
            </Text>
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={tradeStyles.badge("warning")}>{confidence}</span>
          </Column>
        </Row>
      </Section>

      {/* Trigger card */}
      <Section style={tradeStyles.card}>
        <Text
          style={{
            ...tradeStyles.text,
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}
        >
          Trigger rule
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 12px 0" }}>
          {formatRule(triggerRule)}
        </Text>

        <Text style={tradeStyles.mutedText}>Citation</Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 12px 0" }}>
          {triggerCitation}
        </Text>

        <Hr style={{ ...tradeStyles.hr, margin: "12px 0" }} />

        <Text style={tradeStyles.mutedText}>Finding</Text>
        <Text style={{ ...tradeStyles.text, margin: 0 }}>
          {triggerDescription}
        </Text>
      </Section>

      <Section style={tradeStyles.cardWarning}>
        <Text
          style={{
            ...tradeStyles.text,
            color: tradeStyles.colors.amber500,
            margin: 0,
            fontWeight: "600",
          }}
        >
          Required next steps
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "8px 0 0 0" }}>
          1. Review the trigger finding and confirm or refute the engine&apos;s
          reasoning. 2. If confirmed, file a Catch-All Determination via the
          Operation page. 3. Decide whether to halt the operation or pursue a
          licensing authorisation. Document your decision — the audit trail
          requires evidence of due diligence under §744.21.
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={tradeUrl(`/trade/operations/${operationId}`)}
          style={tradeStyles.primaryButton}
        >
          Review Operation
        </Button>
      </Section>

      <Text style={tradeStyles.mutedText}>
        Catch-all alerts are emitted automatically by the property-trigger
        engine. Engine confidence reflects pattern strength, not legal certainty
        — human judgment is required to convert a trigger into a formal
        determination.
      </Text>
    </TradeBaseLayout>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatRule(rule: string): string {
  return rule
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// ─── Render Function ────────────────────────────────────────────────

export async function renderTradeCatchAllTrigger(
  data: TradeCatchAllTriggerData,
): Promise<{ html: string; subject: string }> {
  const subject = `[Catch-all] ${formatRule(data.triggerRule)} on ${data.operationReference}`;
  const html = await render(<TradeCatchAllEmail {...data} />);
  return { html, subject };
}
