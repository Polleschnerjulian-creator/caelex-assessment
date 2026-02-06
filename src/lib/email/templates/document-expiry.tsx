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
import type { DocumentExpiryData } from "../types";

interface DocumentExpiryEmailProps extends DocumentExpiryData {}

function DocumentExpiryEmail({
  recipientName,
  documentName,
  expiryDate,
  daysUntilExpiry,
  category,
  moduleType,
  regulatoryRef,
  dashboardUrl,
}: DocumentExpiryEmailProps) {
  const urgency = getUrgencyLevel(daysUntilExpiry);
  const formattedDate = formatDate(expiryDate);

  return (
    <BaseLayout
      previewText={`Document Expiry Alert: ${documentName} expires in ${daysUntilExpiry} days`}
    >
      {/* Greeting */}
      <Text style={styles.text}>Hello {recipientName},</Text>

      {/* Main Message */}
      <Text style={styles.heading}>
        {urgency.emoji} {urgency.title}
      </Text>

      <Text style={styles.text}>{urgency.message}</Text>

      {/* Document Card */}
      <Section style={styles.card}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text
              style={{ ...styles.text, fontWeight: "600", marginBottom: "8px" }}
            >
              {documentName}
            </Text>
            <Text style={styles.mutedText}>
              {formatCategory(category)}
              {moduleType && ` • ${formatCategory(moduleType)} Module`}
            </Text>
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={styles.badge(urgency.variant)}>
              {daysUntilExpiry <= 0 ? "EXPIRED" : `${daysUntilExpiry} DAYS`}
            </span>
          </Column>
        </Row>

        <Hr style={{ ...styles.hr, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Expiry Date</Text>
            <Text style={{ ...styles.text, margin: 0, fontWeight: "600" }}>
              {formattedDate}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Status</Text>
            <Text
              style={{
                ...styles.text,
                margin: 0,
                color:
                  daysUntilExpiry <= 0
                    ? styles.colors.red500
                    : styles.colors.amber500,
              }}
            >
              {daysUntilExpiry <= 0 ? "Expired" : "Expiring Soon"}
            </Text>
          </Column>
        </Row>

        {regulatoryRef && (
          <>
            <Hr style={{ ...styles.hr, margin: "16px 0" }} />
            <Text style={styles.mutedText}>Regulatory Reference</Text>
            <Text style={{ ...styles.text, margin: 0 }}>{regulatoryRef}</Text>
          </>
        )}
      </Section>

      {/* Action Required */}
      <Section
        style={{ ...styles.card, backgroundColor: styles.colors.navy800 }}
      >
        <Text style={{ ...styles.subheading, marginTop: 0 }}>
          Recommended Actions
        </Text>
        <ul style={{ paddingLeft: "20px", margin: "12px 0" }}>
          <li style={styles.listItem}>
            Review the document and its current validity
          </li>
          <li style={styles.listItem}>
            Contact the issuing authority for renewal if needed
          </li>
          <li style={styles.listItem}>
            Upload the renewed document to maintain compliance
          </li>
          <li style={styles.listItem}>
            Update any dependent compliance records
          </li>
        </ul>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${dashboardUrl}/documents`} style={styles.button}>
          View Document
        </Button>
      </Section>

      {/* Additional Info */}
      <Text style={styles.mutedText}>
        You can manage document expiry alerts in your{" "}
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

function getUrgencyLevel(daysUntilExpiry: number): {
  emoji: string;
  title: string;
  message: string;
  variant: "critical" | "high" | "medium" | "info";
} {
  if (daysUntilExpiry <= 0) {
    return {
      emoji: "🚨",
      title: "Document Has Expired",
      message:
        "This document has expired and may no longer be valid for compliance purposes. Immediate action is required.",
      variant: "critical",
    };
  }
  if (daysUntilExpiry <= 7) {
    return {
      emoji: "⚠️",
      title: `Document Expires in ${daysUntilExpiry} Days`,
      message:
        "This document requires urgent attention. Begin the renewal process immediately to avoid compliance gaps.",
      variant: "critical",
    };
  }
  if (daysUntilExpiry <= 14) {
    return {
      emoji: "📋",
      title: `Document Expires in ${daysUntilExpiry} Days`,
      message:
        "A compliance document is expiring soon. Start the renewal process to maintain your compliance status.",
      variant: "high",
    };
  }
  if (daysUntilExpiry <= 30) {
    return {
      emoji: "📅",
      title: `Document Expires in ${daysUntilExpiry} Days`,
      message:
        "This is an advance notice about an upcoming document expiry. Plan for renewal accordingly.",
      variant: "medium",
    };
  }
  return {
    emoji: "📌",
    title: `Document Expires in ${daysUntilExpiry} Days`,
    message:
      "A document will expire in the coming months. This is an early reminder to plan for renewal.",
    variant: "info",
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ─── Render Function ───

export async function renderDocumentExpiry(data: DocumentExpiryData): Promise<{
  html: string;
  subject: string;
}> {
  const subject =
    data.daysUntilExpiry <= 0
      ? `[EXPIRED] ${data.documentName} - Action Required`
      : data.daysUntilExpiry <= 7
        ? `[URGENT] ${data.documentName} expires in ${data.daysUntilExpiry} days`
        : `Document Expiry Notice: ${data.documentName}`;

  const html = await render(<DocumentExpiryEmail {...data} />);

  return { html, subject };
}
