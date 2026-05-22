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
 * Trade operation blocked email (Sprint E2).
 *
 * Triggered when a TradeOperation transitions to BLOCKED status. The
 * Trade engine auto-blocks operations when any of the following hold:
 *  - Counterparty was just blocked via sanctions screening
 *  - All required licenses have expired or been revoked
 *  - A catch-all determination was filed with "halt" outcome
 *  - The destination country entered an embargo state
 *
 * The email surfaces the blocking *cause* so operators can act:
 *  - If sanctions: defer to the counterparty record + legal review
 *  - If license: trigger renewal or alternate-license selection
 *  - If catch-all: open the determination workflow
 *  - If embargo: escalate to a compliance officer
 *
 * Distinct from the sanctions-hit email — that fires on the screening
 * event itself; this fires on the downstream operation state-change.
 */

export interface TradeOperationBlockedData {
  recipientName: string;
  operationId: string;
  operationReference: string;
  /** Block cause taxonomy. */
  blockCause:
    | "COUNTERPARTY_BLOCKED"
    | "LICENSE_EXPIRED"
    | "LICENSE_REVOKED"
    | "CATCH_ALL_HALT"
    | "DESTINATION_EMBARGO"
    | "MANUAL_BLOCK";
  /** Human-readable explanation, e.g. "BIS license D123456 expired on 2026-05-15". */
  blockReason: string;
  /** Optional citation/regulatory ref. */
  citation?: string;
  /** Counterparty + country for context. */
  counterpartyName: string;
  counterpartyCountry: string;
  /** Item count + total value for context. */
  itemCount: number;
  totalValueEur?: number;
}

function TradeOperationBlockedEmail({
  recipientName,
  operationId,
  operationReference,
  blockCause,
  blockReason,
  citation,
  counterpartyName,
  counterpartyCountry,
  itemCount,
  totalValueEur,
}: TradeOperationBlockedData) {
  return (
    <TradeBaseLayout
      previewText={`Operation ${operationReference} blocked — ${formatCause(blockCause)}`}
    >
      <Text style={tradeStyles.text}>Hello {recipientName},</Text>

      <Text style={tradeStyles.heading}>Operation blocked</Text>

      <Text style={tradeStyles.text}>
        Trade has automatically transitioned an operation to{" "}
        <strong>BLOCKED</strong> status. Until the underlying cause is resolved,
        this operation cannot progress to shipment, payment, or export
        authorisation.
      </Text>

      {/* Operation card */}
      <Section style={tradeStyles.cardCritical}>
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
            <span style={tradeStyles.badge("critical")}>BLOCKED</span>
          </Column>
        </Row>

        <Hr style={{ ...tradeStyles.hr, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "50%" }}>
            <Text style={tradeStyles.mutedText}>Line items</Text>
            <Text style={{ ...tradeStyles.text, margin: 0, fontWeight: "600" }}>
              {itemCount}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text style={tradeStyles.mutedText}>Total value</Text>
            <Text style={{ ...tradeStyles.text, margin: 0, fontWeight: "600" }}>
              {totalValueEur
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(totalValueEur)
                : "—"}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Block cause card */}
      <Section style={tradeStyles.card}>
        <Text
          style={{
            ...tradeStyles.text,
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}
        >
          Block cause
        </Text>
        <Text style={{ ...tradeStyles.text, margin: "0 0 12px 0" }}>
          {formatCause(blockCause)}
        </Text>

        <Text style={tradeStyles.mutedText}>Reason</Text>
        <Text style={{ ...tradeStyles.text, margin: 0 }}>{blockReason}</Text>

        {citation && (
          <>
            <Hr style={{ ...tradeStyles.hr, margin: "12px 0" }} />
            <Text style={tradeStyles.mutedText}>Citation</Text>
            <Text style={{ ...tradeStyles.text, margin: 0 }}>{citation}</Text>
          </>
        )}
      </Section>

      <Section style={tradeStyles.card}>
        <Text
          style={{
            ...tradeStyles.text,
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}
        >
          Resolve
        </Text>
        <Text style={{ ...tradeStyles.text, margin: 0 }}>
          {resolutionStepsFor(blockCause)}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={tradeUrl(`/trade/operations/${operationId}`)}
          style={tradeStyles.primaryButton}
        >
          Open Operation
        </Button>
      </Section>

      <Text style={tradeStyles.mutedText}>
        Blocked operations remain in your workspace as a complete record of the
        decision and the underlying compliance gate.
      </Text>
    </TradeBaseLayout>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatCause(cause: string): string {
  const map: Record<string, string> = {
    COUNTERPARTY_BLOCKED: "Counterparty blocked (sanctions)",
    LICENSE_EXPIRED: "License expired",
    LICENSE_REVOKED: "License revoked",
    CATCH_ALL_HALT: "Catch-all halt determination",
    DESTINATION_EMBARGO: "Destination embargo",
    MANUAL_BLOCK: "Manual block by operator",
  };
  return map[cause] ?? cause;
}

function resolutionStepsFor(cause: string): string {
  switch (cause) {
    case "COUNTERPARTY_BLOCKED":
      return "Review the counterparty's sanctions screening result. If the hit is a false positive, escalate to your compliance officer for manual clearance with full audit trail. Otherwise, terminate the operation and document the decision.";
    case "LICENSE_EXPIRED":
      return "Renew the underlying license, or rotate the operation to an alternate active license. If neither is feasible, file a license application via the Licenses tab.";
    case "LICENSE_REVOKED":
      return "License revocation is a regulatory action. Contact the issuing authority directly before re-attempting the operation. Document any communications with the authority for audit.";
    case "CATCH_ALL_HALT":
      return "A catch-all determination concluded the operation should halt. Re-opening requires a new determination with documented justification under §744.21 (or analogous BAFA / EU provisions).";
    case "DESTINATION_EMBARGO":
      return "The destination has entered an embargo state. Verify whether the operation falls under a humanitarian or research exception. Otherwise, the operation cannot proceed without specific authorisation.";
    case "MANUAL_BLOCK":
      return "An authorised operator manually blocked this operation. Review the audit log for the recorded reason and contact the operator who set the block to discuss next steps.";
    default:
      return "Open the operation page for full context and audit trail.";
  }
}

// ─── Render Function ────────────────────────────────────────────────

export async function renderTradeOperationBlocked(
  data: TradeOperationBlockedData,
): Promise<{ html: string; subject: string }> {
  const subject = `[BLOCKED] Operation ${data.operationReference} — ${formatCause(data.blockCause)}`;
  const html = await render(<TradeOperationBlockedEmail {...data} />);
  return { html, subject };
}
