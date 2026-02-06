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
import type { WeeklyDigestData } from "../types";

interface WeeklyDigestEmailProps extends WeeklyDigestData {}

function WeeklyDigestEmail({
  recipientName,
  weekStart,
  weekEnd,
  upcomingDeadlines,
  expiringDocuments,
  overdueItems,
  complianceStats,
  dashboardUrl,
}: WeeklyDigestEmailProps) {
  const hasUrgentItems =
    overdueItems.length > 0 ||
    upcomingDeadlines.some((d) => d.daysRemaining <= 7);
  const weekRange = formatWeekRange(weekStart, weekEnd);

  return (
    <BaseLayout
      previewText={`Caelex Weekly Digest: ${upcomingDeadlines.length} deadlines, ${expiringDocuments.length} documents expiring`}
    >
      {/* Greeting */}
      <Text style={styles.text}>Hello {recipientName},</Text>

      {/* Main Message */}
      <Text style={styles.heading}>
        {hasUrgentItems ? "⚠️" : "📊"} Your Weekly Compliance Summary
      </Text>

      <Text style={styles.mutedText}>{weekRange}</Text>

      {/* Compliance Stats */}
      <Section style={styles.card}>
        <Row>
          <Column style={styles.stat}>
            <Text style={styles.statValue}>
              {complianceStats.completionPercentage}%
            </Text>
            <Text style={styles.statLabel}>Compliance</Text>
          </Column>
          <Column style={styles.stat}>
            <Text style={styles.statValue}>{upcomingDeadlines.length}</Text>
            <Text style={styles.statLabel}>Deadlines</Text>
          </Column>
          <Column style={styles.stat}>
            <Text style={styles.statValue}>{expiringDocuments.length}</Text>
            <Text style={styles.statLabel}>Expiring Docs</Text>
          </Column>
          <Column style={styles.stat}>
            <Text
              style={{
                ...styles.statValue,
                color:
                  overdueItems.length > 0
                    ? styles.colors.red500
                    : styles.colors.green500,
              }}
            >
              {overdueItems.length}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </Column>
        </Row>
      </Section>

      {/* Overdue Items (if any) */}
      {overdueItems.length > 0 && (
        <>
          <Text style={{ ...styles.subheading, color: styles.colors.red500 }}>
            🚨 Overdue Items Requiring Attention
          </Text>
          <Section
            style={{ ...styles.card, borderColor: styles.colors.red500 }}
          >
            {overdueItems.slice(0, 5).map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Hr style={{ ...styles.hr, margin: "12px 0" }} />}
                <Row>
                  <Column style={{ width: "70%" }}>
                    <Text style={{ ...styles.text, margin: 0 }}>
                      {item.title}
                    </Text>
                    <Text style={{ ...styles.mutedText, margin: "4px 0 0 0" }}>
                      Was due: {formatDate(item.dueDate)}
                    </Text>
                  </Column>
                  <Column style={{ width: "30%", textAlign: "right" as const }}>
                    <span style={styles.badge("critical")}>
                      {item.type === "deadline" ? "DEADLINE" : "DOCUMENT"}
                    </span>
                  </Column>
                </Row>
              </React.Fragment>
            ))}
            {overdueItems.length > 5 && (
              <Text style={{ ...styles.mutedText, marginTop: "12px" }}>
                +{overdueItems.length - 5} more overdue items
              </Text>
            )}
          </Section>
        </>
      )}

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <>
          <Text style={styles.subheading}>📋 Upcoming Deadlines</Text>
          <Section style={styles.card}>
            {upcomingDeadlines.slice(0, 5).map((deadline, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Hr style={{ ...styles.hr, margin: "12px 0" }} />}
                <Row>
                  <Column style={{ width: "60%" }}>
                    <Text style={{ ...styles.text, margin: 0 }}>
                      {deadline.title}
                    </Text>
                    <Text style={{ ...styles.mutedText, margin: "4px 0 0 0" }}>
                      Due: {formatDate(deadline.dueDate)}
                    </Text>
                  </Column>
                  <Column
                    style={{ width: "20%", textAlign: "center" as const }}
                  >
                    <span
                      style={styles.badge(
                        getPriorityVariant(deadline.priority),
                      )}
                    >
                      {deadline.priority}
                    </span>
                  </Column>
                  <Column style={{ width: "20%", textAlign: "right" as const }}>
                    <Text
                      style={{ ...styles.text, margin: 0, fontWeight: "600" }}
                    >
                      {deadline.daysRemaining}d
                    </Text>
                  </Column>
                </Row>
              </React.Fragment>
            ))}
            {upcomingDeadlines.length > 5 && (
              <Text style={{ ...styles.mutedText, marginTop: "12px" }}>
                +{upcomingDeadlines.length - 5} more deadlines
              </Text>
            )}
          </Section>
        </>
      )}

      {/* Expiring Documents */}
      {expiringDocuments.length > 0 && (
        <>
          <Text style={styles.subheading}>📄 Expiring Documents</Text>
          <Section style={styles.card}>
            {expiringDocuments.slice(0, 5).map((doc, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Hr style={{ ...styles.hr, margin: "12px 0" }} />}
                <Row>
                  <Column style={{ width: "70%" }}>
                    <Text style={{ ...styles.text, margin: 0 }}>
                      {doc.name}
                    </Text>
                    <Text style={{ ...styles.mutedText, margin: "4px 0 0 0" }}>
                      Expires: {formatDate(doc.expiryDate)}
                    </Text>
                  </Column>
                  <Column style={{ width: "30%", textAlign: "right" as const }}>
                    <Text
                      style={{
                        ...styles.text,
                        margin: 0,
                        fontWeight: "600",
                        color:
                          doc.daysUntilExpiry <= 14
                            ? styles.colors.amber500
                            : styles.colors.slate200,
                      }}
                    >
                      {doc.daysUntilExpiry}d
                    </Text>
                  </Column>
                </Row>
              </React.Fragment>
            ))}
            {expiringDocuments.length > 5 && (
              <Text style={{ ...styles.mutedText, marginTop: "12px" }}>
                +{expiringDocuments.length - 5} more documents
              </Text>
            )}
          </Section>
        </>
      )}

      {/* No Items Message */}
      {upcomingDeadlines.length === 0 &&
        expiringDocuments.length === 0 &&
        overdueItems.length === 0 && (
          <Section style={styles.card}>
            <Text
              style={{
                ...styles.text,
                textAlign: "center" as const,
                margin: 0,
              }}
            >
              ✅ No urgent items this week. Great job staying on top of your
              compliance!
            </Text>
          </Section>
        )}

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={dashboardUrl} style={styles.button}>
          Open Dashboard
        </Button>
      </Section>

      {/* Footer Note */}
      <Text style={styles.mutedText}>
        This is your weekly compliance digest. You can adjust the frequency or
        disable these emails in your{" "}
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

function formatWeekRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startStr = new Intl.DateTimeFormat("en-US", options).format(
    new Date(start),
  );
  const endStr = new Intl.DateTimeFormat("en-US", {
    ...options,
    year: "numeric",
  }).format(new Date(end));
  return `${startStr} - ${endStr}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getPriorityVariant(
  priority: string,
): "critical" | "high" | "medium" | "low" {
  const map: Record<string, "critical" | "high" | "medium" | "low"> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  };
  return map[priority.toUpperCase()] || "medium";
}

// ─── Render Function ───

export async function renderWeeklyDigest(data: WeeklyDigestData): Promise<{
  html: string;
  subject: string;
}> {
  const urgentCount =
    data.overdueItems.length +
    data.upcomingDeadlines.filter((d) => d.daysRemaining <= 7).length;
  const subject =
    urgentCount > 0
      ? `[Action Required] Your Caelex Weekly Digest - ${urgentCount} urgent items`
      : `Your Caelex Weekly Digest - ${data.complianceStats.completionPercentage}% Compliance`;

  const html = await render(<WeeklyDigestEmail {...data} />);

  return { html, subject };
}
