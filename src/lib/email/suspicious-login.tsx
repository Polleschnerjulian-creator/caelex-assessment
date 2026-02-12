/**
 * Suspicious Login Email Template
 * Sent when a login from a new device, location, or IP is detected
 */

import { render } from "@react-email/render";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import { sendEmail } from "./index";

interface SuspiciousLoginEmailProps {
  email: string;
  name?: string;
  device: string;
  location: string;
  ipAddress: string;
  time: Date;
  reasons: string[];
}

function SuspiciousLoginEmail({
  name,
  device,
  location,
  ipAddress,
  time,
  reasons,
}: Omit<SuspiciousLoginEmailProps, "email">) {
  const formattedTime = time.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Html>
      <Head />
      <Preview>
        New login detected on your Caelex account from {device} in {location}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Security Alert</Heading>

          <Text style={text}>Hi {name || "there"},</Text>

          <Text style={text}>
            We detected a new sign-in to your Caelex account. If this was you,
            no action is needed.
          </Text>

          <Section style={alertBox}>
            <Text style={alertTitle}>New login detected</Text>

            <Row style={detailRow}>
              <Column style={detailLabel}>Device:</Column>
              <Column style={detailValue}>{device}</Column>
            </Row>

            <Row style={detailRow}>
              <Column style={detailLabel}>Location:</Column>
              <Column style={detailValue}>{location}</Column>
            </Row>

            <Row style={detailRow}>
              <Column style={detailLabel}>IP Address:</Column>
              <Column style={detailValue}>{ipAddress}</Column>
            </Row>

            <Row style={detailRow}>
              <Column style={detailLabel}>Time:</Column>
              <Column style={detailValue}>{formattedTime}</Column>
            </Row>

            {reasons.length > 0 && (
              <>
                <Hr style={divider} />
                <Text style={reasonsTitle}>Why this is flagged:</Text>
                <ul style={reasonsList}>
                  {reasons.map((reason, index) => (
                    <li key={index} style={reasonItem}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Text style={text}>
            <strong>If this wasn&apos;t you,</strong> someone else may have
            access to your account. Please take these steps immediately:
          </Text>

          <ol style={stepsList}>
            <li style={stepItem}>
              <Link href="https://caelex.app/auth/reset-password" style={link}>
                Change your password
              </Link>
            </li>
            <li style={stepItem}>
              <Link href="https://caelex.app/dashboard/settings" style={link}>
                Review your active sessions
              </Link>{" "}
              and revoke any you don&apos;t recognize
            </li>
            <li style={stepItem}>
              <Link href="https://caelex.app/dashboard/settings" style={link}>
                Enable two-factor authentication
              </Link>{" "}
              if you haven&apos;t already
            </li>
          </ol>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated security alert from Caelex. You&apos;re
            receiving this because you have security notifications enabled for
            your account.
          </Text>

          <Text style={footer}>
            <Link
              href="https://caelex.app/dashboard/settings"
              style={footerLink}
            >
              Manage notification preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginTop: "40px",
  marginBottom: "40px",
  borderRadius: "8px",
  maxWidth: "580px",
};

const heading = {
  color: "#dc2626",
  fontSize: "24px",
  fontWeight: "bold" as const,
  margin: "0 0 20px",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const alertBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const alertTitle = {
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
};

const detailRow = {
  marginBottom: "8px",
};

const detailLabel = {
  color: "#6b7280",
  fontSize: "14px",
  width: "100px",
  verticalAlign: "top" as const,
};

const detailValue = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "500" as const,
};

const divider = {
  borderColor: "#fecaca",
  margin: "16px 0",
};

const reasonsTitle = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 8px",
};

const reasonsList = {
  margin: "0",
  paddingLeft: "20px",
};

const reasonItem = {
  color: "#7f1d1d",
  fontSize: "14px",
  marginBottom: "4px",
};

const stepsList = {
  margin: "0 0 24px",
  paddingLeft: "20px",
};

const stepItem = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  marginBottom: "8px",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px",
};

const footerLink = {
  color: "#6b7280",
  textDecoration: "underline",
};

// Send function
export async function sendSuspiciousLoginEmail(
  props: SuspiciousLoginEmailProps,
): Promise<void> {
  const { email, ...emailProps } = props;

  // Render the React email to HTML
  const html = await render(<SuspiciousLoginEmail {...emailProps} />);

  await sendEmail({
    to: email,
    subject: `Security Alert: New login to your Caelex account`,
    html,
  });
}
