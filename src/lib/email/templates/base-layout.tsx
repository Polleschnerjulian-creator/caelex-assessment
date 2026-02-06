import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

// ─── Caelex Design System Colors ───
const colors = {
  navy950: "#0A0F1E",
  navy900: "#0F172A",
  navy800: "#1E293B",
  navy700: "#334155",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  white: "#F8FAFC",
  blue500: "#3B82F6",
  blue400: "#60A5FA",
  green500: "#22C55E",
  amber500: "#F59E0B",
  red500: "#EF4444",
};

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export function BaseLayout({ children, previewText }: BaseLayoutProps) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        {previewText && <meta name="x-apple-disable-message-reformatting" />}
      </Head>
      <Body style={bodyStyle}>
        {previewText && <Text style={previewStyle}>{previewText}</Text>}
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>CAELEX</Text>
            <Text style={taglineStyle}>Space Compliance, Simplified</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>{children}</Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Hr style={hrStyle} />
            <Text style={footerTextStyle}>
              This is an automated notification from Caelex. You received this
              email because you have an account with Caelex.
            </Text>
            <Text style={footerLinksStyle}>
              <Link href="https://caelex.io/dashboard" style={footerLinkStyle}>
                Dashboard
              </Link>
              {" • "}
              <Link
                href="https://caelex.io/dashboard/settings"
                style={footerLinkStyle}
              >
                Notification Settings
              </Link>
              {" • "}
              <Link href="https://caelex.io/help" style={footerLinkStyle}>
                Help
              </Link>
            </Text>
            <Text style={copyrightStyle}>
              &copy; {new Date().getFullYear()} Caelex GmbH. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───

const bodyStyle: React.CSSProperties = {
  backgroundColor: colors.navy950,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: "40px 0",
};

const previewStyle: React.CSSProperties = {
  display: "none",
  visibility: "hidden",
  maxHeight: 0,
  overflow: "hidden",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: colors.navy900,
  borderRadius: "12px",
  border: `1px solid ${colors.navy700}`,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: colors.navy800,
  padding: "24px 32px",
  textAlign: "center" as const,
  borderBottom: `1px solid ${colors.navy700}`,
};

const logoStyle: React.CSSProperties = {
  color: colors.white,
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: 0,
};

const taglineStyle: React.CSSProperties = {
  color: colors.slate400,
  fontSize: "12px",
  margin: "4px 0 0 0",
  letterSpacing: "0.05em",
};

const contentStyle: React.CSSProperties = {
  padding: "32px",
};

const footerStyle: React.CSSProperties = {
  padding: "0 32px 32px",
};

const hrStyle: React.CSSProperties = {
  borderColor: colors.navy700,
  borderWidth: "1px 0 0 0",
  margin: "0 0 24px 0",
};

const footerTextStyle: React.CSSProperties = {
  color: colors.slate400,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 16px 0",
  textAlign: "center" as const,
};

const footerLinksStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0 0 16px 0",
};

const footerLinkStyle: React.CSSProperties = {
  color: colors.blue400,
  fontSize: "12px",
  textDecoration: "none",
};

const copyrightStyle: React.CSSProperties = {
  color: colors.navy700,
  fontSize: "11px",
  textAlign: "center" as const,
  margin: 0,
};

// ─── Shared Components ───

export const styles = {
  colors,

  heading: {
    color: colors.white,
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 16px 0",
    lineHeight: "32px",
  } as React.CSSProperties,

  subheading: {
    color: colors.slate200,
    fontSize: "18px",
    fontWeight: "600",
    margin: "24px 0 12px 0",
  } as React.CSSProperties,

  text: {
    color: colors.slate200,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px 0",
  } as React.CSSProperties,

  mutedText: {
    color: colors.slate400,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 12px 0",
  } as React.CSSProperties,

  button: {
    backgroundColor: colors.blue500,
    borderRadius: "8px",
    color: colors.white,
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
  } as React.CSSProperties,

  card: {
    backgroundColor: colors.navy800,
    borderRadius: "8px",
    border: `1px solid ${colors.navy700}`,
    padding: "16px",
    marginBottom: "16px",
  } as React.CSSProperties,

  badge: (
    variant: "critical" | "high" | "medium" | "low" | "info" | "success",
  ) => {
    const bgColors = {
      critical: colors.red500,
      high: colors.amber500,
      medium: colors.blue500,
      low: colors.slate400,
      info: colors.blue400,
      success: colors.green500,
    };
    return {
      backgroundColor: bgColors[variant],
      borderRadius: "4px",
      color: colors.white,
      display: "inline-block",
      fontSize: "11px",
      fontWeight: "600",
      padding: "4px 8px",
      textTransform: "uppercase" as const,
    } as React.CSSProperties;
  },

  listItem: {
    color: colors.slate200,
    fontSize: "14px",
    lineHeight: "24px",
    padding: "4px 0",
  } as React.CSSProperties,

  link: {
    color: colors.blue400,
    textDecoration: "none",
  } as React.CSSProperties,

  hr: {
    borderColor: colors.navy700,
    borderWidth: "1px 0 0 0",
    margin: "24px 0",
  } as React.CSSProperties,

  stat: {
    textAlign: "center" as const,
    padding: "12px",
  } as React.CSSProperties,

  statValue: {
    color: colors.white,
    fontSize: "28px",
    fontWeight: "700",
    margin: "0",
  } as React.CSSProperties,

  statLabel: {
    color: colors.slate400,
    fontSize: "12px",
    margin: "4px 0 0 0",
  } as React.CSSProperties,
};
