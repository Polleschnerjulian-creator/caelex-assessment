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
import type { DeadlineReminderData } from "../types";

interface DeadlineReminderEmailProps extends DeadlineReminderData {}

function DeadlineReminderEmail({
  recipientName,
  deadlineTitle,
  dueDate,
  daysRemaining,
  priority,
  category,
  regulatoryRef,
  penaltyInfo,
  description,
  dashboardUrl,
}: DeadlineReminderEmailProps) {
  const priorityVariant = getPriorityVariant(priority);
  const urgencyMessage = getUrgencyMessage(daysRemaining);
  const formattedDate = formatDate(dueDate);

  return (
    <BaseLayout
      previewText={`Deadline Reminder: ${deadlineTitle} - Due in ${daysRemaining} days`}
    >
      {/* Greeting */}
      <Text style={styles.text}>Hello {recipientName},</Text>

      {/* Main Message */}
      <Text style={styles.heading}>
        {urgencyMessage.emoji} {urgencyMessage.title}
      </Text>

      <Text style={styles.text}>{urgencyMessage.message}</Text>

      {/* Deadline Card */}
      <Section style={styles.card}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text
              style={{ ...styles.text, fontWeight: "600", marginBottom: "8px" }}
            >
              {deadlineTitle}
            </Text>
            {description && (
              <Text style={{ ...styles.mutedText, marginBottom: "12px" }}>
                {description.length > 150
                  ? `${description.slice(0, 150)}...`
                  : description}
              </Text>
            )}
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={styles.badge(priorityVariant)}>{priority}</span>
          </Column>
        </Row>

        <Hr style={{ ...styles.hr, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Due Date</Text>
            <Text style={{ ...styles.text, margin: 0, fontWeight: "600" }}>
              {formattedDate}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text style={styles.mutedText}>Category</Text>
            <Text style={{ ...styles.text, margin: 0 }}>
              {formatCategory(category)}
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

      {/* Warning for penalties */}
      {penaltyInfo && daysRemaining <= 7 && (
        <Section style={{ ...styles.card, borderColor: styles.colors.red500 }}>
          <Text
            style={{ ...styles.text, color: styles.colors.red500, margin: 0 }}
          >
            <strong>Important:</strong> {penaltyInfo}
          </Text>
        </Section>
      )}

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={dashboardUrl} style={styles.button}>
          View Deadline Details
        </Button>
      </Section>

      {/* Additional Info */}
      <Text style={styles.mutedText}>
        You can manage your notification preferences in your{" "}
        <Link
          href={`${dashboardUrl.split("/dashboard")[0]}/dashboard/settings`}
          style={styles.link}
        >
          account settings
        </Link>
        .
      </Text>
    </BaseLayout>
  );
}

// ─── Helper Functions ───

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

function getUrgencyMessage(daysRemaining: number): {
  emoji: string;
  title: string;
  message: string;
} {
  if (daysRemaining <= 0) {
    return {
      emoji: "🚨",
      title: "Deadline Overdue",
      message:
        "This deadline has passed. Please take immediate action to address this matter.",
    };
  }
  if (daysRemaining === 1) {
    return {
      emoji: "⚠️",
      title: "Deadline Tomorrow",
      message:
        "This deadline is due tomorrow. Ensure all required actions are completed.",
    };
  }
  if (daysRemaining <= 3) {
    return {
      emoji: "⚠️",
      title: `Deadline in ${daysRemaining} Days`,
      message:
        "This deadline requires your urgent attention. Please prioritize this item.",
    };
  }
  if (daysRemaining <= 7) {
    return {
      emoji: "📋",
      title: `Deadline in ${daysRemaining} Days`,
      message:
        "You have a deadline approaching this week. Plan accordingly to meet this requirement.",
    };
  }
  if (daysRemaining <= 14) {
    return {
      emoji: "📅",
      title: `Deadline in ${daysRemaining} Days`,
      message:
        "A deadline is approaching in the next two weeks. Review the requirements and begin preparation.",
    };
  }
  return {
    emoji: "📌",
    title: `Deadline in ${daysRemaining} Days`,
    message:
      "This is an advance notice for an upcoming deadline. Start planning to meet this requirement.",
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

export async function renderDeadlineReminder(
  data: DeadlineReminderData,
): Promise<{
  html: string;
  subject: string;
}> {
  const subject =
    data.daysRemaining <= 0
      ? `[OVERDUE] ${data.deadlineTitle}`
      : data.daysRemaining <= 3
        ? `[URGENT] ${data.deadlineTitle} - Due in ${data.daysRemaining} days`
        : `Reminder: ${data.deadlineTitle} - Due in ${data.daysRemaining} days`;

  const html = await render(<DeadlineReminderEmail {...data} />);

  return { html, subject };
}
