import {
  Text,
  Button,
  Section,
  Row,
  Column,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";
import { BaseLayout, styles } from "./base-layout";
import type { IncidentAlertData } from "../types";

interface IncidentAlertEmailProps extends IncidentAlertData {}

function IncidentAlertEmail({
  recipientName,
  incidentNumber,
  title,
  severity,
  category,
  detectedAt,
  description,
  ncaReportingDeadline,
  dashboardUrl,
}: IncidentAlertEmailProps) {
  const severityVariant = getSeverityVariant(severity);
  const formattedDetectedAt = formatDateTime(detectedAt);
  const formattedDeadline = ncaReportingDeadline
    ? formatDateTime(ncaReportingDeadline)
    : null;

  return (
    <BaseLayout
      previewText={`[${severity.toUpperCase()}] Incident Alert: ${title}`}
    >
      {/* Greeting */}
      <Text style={styles.text}>Hello {recipientName},</Text>

      {/* Main Message */}
      <Text style={styles.heading}>
        {getSeverityEmoji(severity)} Incident Detected
      </Text>

      <Text style={styles.text}>
        A new incident has been recorded in your Caelex account and requires
        your attention.
      </Text>

      {/* Incident Card */}
      <Section
        style={{ ...styles.card, borderColor: getSeverityColor(severity) }}
      >
        <Row>
          <Column style={{ width: "70%" }}>
            <Text style={{ ...styles.mutedText, marginBottom: "4px" }}>
              {incidentNumber}
            </Text>
            <Text
              style={{ ...styles.text, fontWeight: "600", marginBottom: "8px" }}
            >
              {title}
            </Text>
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={styles.badge(severityVariant)}>
              {severity.toUpperCase()}
            </span>
          </Column>
        </Row>

        <Hr style={{ ...styles.hr, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Category</Text>
            <Text style={{ ...styles.text, margin: 0 }}>
              {formatCategory(category)}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Detected At</Text>
            <Text style={{ ...styles.text, margin: 0 }}>
              {formattedDetectedAt}
            </Text>
          </Column>
        </Row>

        {description && (
          <>
            <Hr style={{ ...styles.hr, margin: "16px 0" }} />
            <Text style={styles.mutedText}>Description</Text>
            <Text style={{ ...styles.text, margin: 0 }}>
              {description.length > 300
                ? `${description.slice(0, 300)}...`
                : description}
            </Text>
          </>
        )}
      </Section>

      {/* NCA Reporting Deadline */}
      {formattedDeadline && (
        <Section
          style={{ ...styles.card, borderColor: styles.colors.amber500 }}
        >
          <Row>
            <Column style={{ width: "10%" }}>
              <Text style={{ fontSize: "24px", margin: 0 }}>⏰</Text>
            </Column>
            <Column style={{ width: "90%" }}>
              <Text
                style={{
                  ...styles.text,
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                NCA Reporting Deadline
              </Text>
              <Text style={{ ...styles.text, margin: 0 }}>
                This incident must be reported to your National Competent
                Authority by <strong>{formattedDeadline}</strong>
              </Text>
            </Column>
          </Row>
        </Section>
      )}

      {/* Required Actions */}
      <Section style={styles.card}>
        <Text style={{ ...styles.subheading, marginTop: 0 }}>
          Immediate Actions Required
        </Text>
        <ul style={{ paddingLeft: "20px", margin: "12px 0" }}>
          <li style={styles.listItem}>
            Review the incident details and verify the classification
          </li>
          <li style={styles.listItem}>
            Document any immediate containment measures taken
          </li>
          <li style={styles.listItem}>
            Assess the impact on operations and affected assets
          </li>
          {severity === "critical" || severity === "high" ? (
            <li style={{ ...styles.listItem, color: styles.colors.amber500 }}>
              <strong>
                Prepare NCA incident report within required timeframe
              </strong>
            </li>
          ) : null}
          <li style={styles.listItem}>
            Update the incident status and add investigation notes
          </li>
        </ul>
      </Section>

      {/* Regulatory Context */}
      <Text style={styles.mutedText}>
        <strong>Regulatory Reference:</strong> Under the EU Space Act (Art.
        77-79), operators must report significant incidents to the National
        Competent Authority within the prescribed timeframes. Critical incidents
        require notification within 24 hours.
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={`${dashboardUrl}/modules/supervision/incidents`}
          style={styles.button}
        >
          Manage Incident
        </Button>
      </Section>

      {/* Additional Info */}
      <Text style={styles.mutedText}>
        Configure incident alert preferences in your{" "}
        <Link
          href={`${dashboardUrl.split("/dashboard")[0]}/dashboard/settings`}
          style={styles.link}
        >
          notification settings
        </Link>
        .
      </Text>
    </BaseLayout>
  );
}

// ─── Helper Functions ───

function getSeverityVariant(
  severity: string,
): "critical" | "high" | "medium" | "low" {
  const map: Record<string, "critical" | "high" | "medium" | "low"> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
  };
  return map[severity.toLowerCase()] || "medium";
}

function getSeverityEmoji(severity: string): string {
  const map: Record<string, string> = {
    critical: "🚨",
    high: "⚠️",
    medium: "📋",
    low: "ℹ️",
  };
  return map[severity.toLowerCase()] || "📋";
}

function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: styles.colors.red500,
    high: styles.colors.amber500,
    medium: styles.colors.blue500,
    low: styles.colors.slate400,
  };
  return map[severity.toLowerCase()] || styles.colors.navy700;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ─── Render Function ───

export async function renderIncidentAlert(data: IncidentAlertData): Promise<{
  html: string;
  subject: string;
}> {
  const severityPrefix =
    data.severity === "critical" || data.severity === "high"
      ? `[${data.severity.toUpperCase()}] `
      : "";
  const subject = `${severityPrefix}Incident Alert: ${data.title} (${data.incidentNumber})`;

  const html = await render(<IncidentAlertEmail {...data} />);

  return { html, subject };
}
