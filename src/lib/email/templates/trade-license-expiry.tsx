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
 * Trade license expiry email (Sprint E2).
 *
 * One template, three behavioural variants driven by `severity`:
 *  - CRITICAL → red card, "[URGENT]" subject prefix, action language
 *  - WARNING  → amber card, regular subject, planning language
 *  - INFO     → neutral card, advance-notice language
 *
 * Triggered from `license-reminder-service.ts` for each org member at
 * MANAGER+ permission when a TradeLicense falls into one of the three
 * threshold buckets (7d / 30d / 90d). The cron is idempotent per-bucket
 * per-day so we won't double-send.
 *
 * Subject line examples:
 *  - "[URGENT] BIS license D123456 expires in 5 days"
 *  - "License BAFA-AGG-12-2026-001 expires in 28 days"
 *  - "License renewal planning — DDTC TAA expires in 87 days"
 */

export interface TradeLicenseExpiryData {
  recipientName: string;
  /** TradeLicense.licenseNumber, e.g. "D123456" or null for "no number assigned" */
  licenseNumber: string | null;
  /** Human-readable license type label, e.g. "BIS Export License", "BAFA AGG-12". */
  licenseType: string;
  /** Authority short-code: "BIS", "DDTC", "BAFA", "EU_COMPETENT_AUTHORITY". */
  authority: string;
  /** ISO Date string YYYY-MM-DD or full date — we format internally. */
  validUntil: Date;
  daysRemaining: number;
  severity: "CRITICAL" | "WARNING" | "INFO";
  /** Optional: list of items / ECCNs this license covers, displayed if present. */
  coversItems?: string[];
}

function TradeLicenseExpiryEmail({
  recipientName,
  licenseNumber,
  licenseType,
  authority,
  validUntil,
  daysRemaining,
  severity,
  coversItems,
}: TradeLicenseExpiryData) {
  const variant = mapSeverity(severity);
  const cardStyle =
    severity === "CRITICAL"
      ? tradeStyles.cardCritical
      : severity === "WARNING"
        ? tradeStyles.cardWarning
        : tradeStyles.card;
  const headline = headlineFor(severity, daysRemaining);
  const message = messageFor(severity, authority);
  const numberLabel = licenseNumber ?? "(no license number)";

  return (
    <TradeBaseLayout
      previewText={`${headline} — ${numberLabel} (${authority})`}
    >
      <Text style={tradeStyles.text}>Hello {recipientName},</Text>

      <Text style={tradeStyles.heading}>{headline}</Text>

      <Text style={tradeStyles.text}>{message}</Text>

      <Section style={cardStyle}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                ...tradeStyles.text,
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              {licenseType}
            </Text>
            <Text style={{ ...tradeStyles.mutedText, margin: 0 }}>
              {numberLabel}
            </Text>
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={tradeStyles.badge(variant)}>{severity}</span>
          </Column>
        </Row>

        <Hr style={{ ...tradeStyles.hr, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "50%" }}>
            <Text style={tradeStyles.mutedText}>Authority</Text>
            <Text style={{ ...tradeStyles.text, margin: 0, fontWeight: "600" }}>
              {formatAuthority(authority)}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text style={tradeStyles.mutedText}>Expires</Text>
            <Text style={{ ...tradeStyles.text, margin: 0, fontWeight: "600" }}>
              {formatDate(validUntil)}{" "}
              <span style={{ color: tradeStyles.colors.slate400 }}>
                ({daysRemaining}d)
              </span>
            </Text>
          </Column>
        </Row>

        {coversItems && coversItems.length > 0 && (
          <>
            <Hr style={{ ...tradeStyles.hr, margin: "16px 0" }} />
            <Text style={tradeStyles.mutedText}>Covers</Text>
            <Text style={{ ...tradeStyles.text, margin: 0 }}>
              {coversItems.slice(0, 6).join(", ")}
              {coversItems.length > 6 ? ` +${coversItems.length - 6} more` : ""}
            </Text>
          </>
        )}
      </Section>

      {severity === "CRITICAL" && (
        <Section
          style={{
            ...tradeStyles.cardCritical,
            marginTop: "0",
          }}
        >
          <Text
            style={{
              ...tradeStyles.text,
              color: tradeStyles.colors.red500,
              margin: 0,
              fontWeight: "600",
            }}
          >
            Action required
          </Text>
          <Text style={{ ...tradeStyles.text, margin: "8px 0 0 0" }}>
            Operations linked to this license will be auto-blocked at midnight
            UTC on the expiry day. Renew, extend, or migrate to an alternate
            license before the deadline to avoid disruption.
          </Text>
        </Section>
      )}

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={tradeUrl("/trade/licenses")}
          style={tradeStyles.primaryButton}
        >
          Open Licenses
        </Button>
      </Section>

      <Text style={tradeStyles.mutedText}>
        This reminder fires at 90, 30, and 7 days before expiry. You can manage
        delivery in your Trade workspace settings.
      </Text>
    </TradeBaseLayout>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapSeverity(
  severity: "CRITICAL" | "WARNING" | "INFO",
): "critical" | "warning" | "info" {
  if (severity === "CRITICAL") return "critical";
  if (severity === "WARNING") return "warning";
  return "info";
}

function headlineFor(
  severity: "CRITICAL" | "WARNING" | "INFO",
  days: number,
): string {
  if (severity === "CRITICAL") {
    if (days <= 0) return "License expired";
    if (days === 1) return "License expires tomorrow";
    return `License expires in ${days} days`;
  }
  if (severity === "WARNING") return `License expires in ${days} days`;
  return `License renewal planning — ${days} days remaining`;
}

function messageFor(
  severity: "CRITICAL" | "WARNING" | "INFO",
  authority: string,
): string {
  const authorityLabel = formatAuthority(authority);
  if (severity === "CRITICAL") {
    return `Your ${authorityLabel} license is approaching its validity end date. Operations dependent on this license will be blocked automatically once the expiry date passes. Renew or rotate to an alternate license immediately.`;
  }
  if (severity === "WARNING") {
    return `Your ${authorityLabel} license needs renewal soon. ${authorityLabel} typical processing times can exceed 30 days — start the renewal flow now to avoid an operations pause.`;
  }
  return `Heads-up: a ${authorityLabel} license in your portfolio is approaching renewal. No action required today, but plan your renewal workflow accordingly.`;
}

function formatAuthority(authority: string): string {
  const map: Record<string, string> = {
    BIS: "BIS (US Bureau of Industry & Security)",
    DDTC: "DDTC (US State Department)",
    BAFA: "BAFA (German Federal Office)",
    EU_COMPETENT_AUTHORITY: "EU Competent Authority",
    MTCR_REVIEW: "MTCR Review",
    OFAC: "OFAC (US Treasury)",
  };
  return map[authority] ?? authority;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

// ─── Render Function ────────────────────────────────────────────────

export async function renderTradeLicenseExpiry(
  data: TradeLicenseExpiryData,
): Promise<{ html: string; subject: string }> {
  const numberLabel = data.licenseNumber ?? "(no number)";
  const prefix =
    data.severity === "CRITICAL"
      ? "[URGENT]"
      : data.severity === "WARNING"
        ? "[Renewal]"
        : "";
  const dayText = data.daysRemaining === 1 ? "day" : "days";
  const subjectCore = `${data.authority} license ${numberLabel} expires in ${data.daysRemaining} ${dayText}`;
  const subject = prefix ? `${prefix} ${subjectCore}` : subjectCore;

  const html = await render(<TradeLicenseExpiryEmail {...data} />);
  return { html, subject };
}
