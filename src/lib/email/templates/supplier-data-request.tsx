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
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface SupplierDataRequestEmailProps {
  supplierName: string;
  companyName: string;
  missionName?: string;
  componentType: string;
  dataRequired: string[];
  deadline?: Date;
  portalUrl: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
}

export default function SupplierDataRequestEmail({
  supplierName,
  companyName,
  missionName,
  componentType,
  dataRequired,
  deadline,
  portalUrl,
  notes,
  contactName,
  contactEmail,
}: SupplierDataRequestEmailProps) {
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Html>
      <Head />
      <Preview>
        Environmental Data Request from {companyName} - {componentType}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Caelex</Heading>
            <Text style={tagline}>Space Compliance Platform</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Environmental Data Request</Heading>

            <Text style={text}>Dear {supplierName},</Text>

            <Text style={text}>
              <strong>{companyName}</strong> is requesting environmental
              footprint data for components you supply{" "}
              {missionName ? `for the "${missionName}" mission` : ""}.
            </Text>

            <Text style={text}>
              This information is required to comply with the{" "}
              <strong>
                EU Space Act Environmental Footprint Declaration (EFD)
              </strong>{" "}
              requirements.
            </Text>

            {/* Component Info */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Component Type</Text>
              <Text style={infoValue}>{componentType}</Text>

              {deadline && (
                <>
                  <Text style={infoLabel}>Deadline</Text>
                  <Text style={infoValue}>{formattedDeadline}</Text>
                </>
              )}
            </Section>

            {/* Data Required */}
            <Text style={sectionTitle}>Data Requested</Text>
            <Section style={listBox}>
              {dataRequired.map((item, index) => (
                <Text key={index} style={listItem}>
                  • {item}
                </Text>
              ))}
            </Section>

            {/* Notes */}
            {notes && (
              <>
                <Text style={sectionTitle}>Additional Notes</Text>
                <Section style={notesBox}>
                  <Text style={notesText}>{notes}</Text>
                </Section>
              </>
            )}

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={portalUrl}>
                Submit Environmental Data
              </Button>
            </Section>

            <Text style={smallText}>
              Or copy and paste this URL into your browser:
              <br />
              <Link href={portalUrl} style={link}>
                {portalUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            {/* Security Notice */}
            <Text style={securityTitle}>Security & Privacy</Text>
            <Text style={securityText}>
              This is a secure link unique to your organization. Please do not
              share it. Your data will be handled in accordance with GDPR
              requirements and used solely for environmental footprint
              calculations as required by EU regulations.
            </Text>

            {/* Contact Info */}
            {(contactName || contactEmail) && (
              <>
                <Hr style={hr} />
                <Text style={contactTitle}>Questions?</Text>
                <Text style={contactText}>
                  Contact {contactName || "the requester"}{" "}
                  {contactEmail && (
                    <>
                      at{" "}
                      <Link href={`mailto:${contactEmail}`} style={link}>
                        {contactEmail}
                      </Link>
                    </>
                  )}
                </Text>
              </>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by Caelex on behalf of {companyName}.
            </Text>
            <Text style={footerText}>
              Caelex · Space Compliance, Simplified
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#0A0F1E",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

const header = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logo = {
  color: "#FFFFFF",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
};

const tagline = {
  color: "#64748B",
  fontSize: "12px",
  margin: "4px 0 0 0",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const content = {
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  padding: "32px",
};

const h1 = {
  color: "#FFFFFF",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 24px 0",
  textAlign: "center" as const,
};

const text = {
  color: "#E2E8F0",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const infoBox = {
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#94A3B8",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const infoValue = {
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 12px 0",
};

const sectionTitle = {
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600",
  margin: "24px 0 12px 0",
};

const listBox = {
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  borderRadius: "8px",
  padding: "16px",
};

const listItem = {
  color: "#E2E8F0",
  fontSize: "13px",
  margin: "0 0 8px 0",
};

const notesBox = {
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  borderLeft: "3px solid rgba(59, 130, 246, 0.5)",
  padding: "12px 16px",
  margin: "0 0 24px 0",
};

const notesText = {
  color: "#CBD5E1",
  fontSize: "13px",
  fontStyle: "italic" as const,
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0 16px 0",
};

const button = {
  backgroundColor: "#3B82F6",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
};

const smallText = {
  color: "#64748B",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  wordBreak: "break-all" as const,
};

const link = {
  color: "#60A5FA",
  textDecoration: "underline",
};

const hr = {
  borderColor: "rgba(255, 255, 255, 0.1)",
  margin: "24px 0",
};

const securityTitle = {
  color: "#FFFFFF",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const securityText = {
  color: "#94A3B8",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0",
};

const contactTitle = {
  color: "#FFFFFF",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const contactText = {
  color: "#94A3B8",
  fontSize: "12px",
  margin: "0",
};

const footer = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const footerText = {
  color: "#475569",
  fontSize: "11px",
  margin: "0 0 4px 0",
};
