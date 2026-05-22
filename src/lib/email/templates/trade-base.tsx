import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import * as React from "react";

/**
 * Trade-themed email layout (Sprint E2).
 *
 * Separate from the Comply BaseLayout because:
 *  - Trade has its own brand wordmark ("CAELEX TRADE")
 *  - Trade uses Indigo (#6366f1) instead of Blue (#3B82F6) as accent
 *  - Trade footer links point to /trade/* routes (not /dashboard/*)
 *
 * Otherwise the structural rules are identical: dark navy canvas,
 * 600px container, Apple-system font stack, footer with Impressum +
 * legal links per German requirements.
 */

const colors = {
  navy950: "#0A0F1E",
  navy900: "#0F172A",
  navy800: "#1E293B",
  navy700: "#334155",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  white: "#F8FAFC",
  indigo500: "#6366F1",
  indigo400: "#818CF8",
  indigo300: "#A5B4FC",
  green500: "#22C55E",
  amber500: "#F59E0B",
  red500: "#EF4444",
};

interface TradeBaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export function TradeBaseLayout({
  children,
  previewText,
}: TradeBaseLayoutProps) {
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
          <Section style={headerStyle}>
            <Text style={logoStyle}>CAELEX TRADE</Text>
            <Text style={taglineStyle}>
              Export-compliance engine for the space economy
            </Text>
          </Section>

          <Section style={contentStyle}>{children}</Section>

          <Section style={footerStyle}>
            <Hr style={hrStyle} />
            <Text style={footerTextStyle}>
              Automated notification from Caelex Trade. You received this email
              because you have a Trade workspace seat.
            </Text>
            <Text style={footerLinksStyle}>
              <Link href="https://www.caelex.eu/trade" style={footerLinkStyle}>
                Trade Workspace
              </Link>
              {" • "}
              <Link
                href="https://www.caelex.eu/trade/licenses"
                style={footerLinkStyle}
              >
                Licenses
              </Link>
              {" • "}
              <Link
                href="https://www.caelex.eu/trade/counterparties"
                style={footerLinkStyle}
              >
                Counterparties
              </Link>
            </Text>
            <Text style={impressumStyle}>
              Caelex | Julian Polleschner | Am Maselakepark 37, 13587 Berlin,
              Germany
            </Text>
            <Text style={impressumStyle}>
              cs@caelex.eu | +49 1636726480 | Kleinunternehmer gem&auml;&szlig;
              &sect;19 UStG
            </Text>
            <Text style={impressumLinksStyle}>
              <Link
                href="https://www.caelex.eu/legal/impressum"
                style={footerLinkStyle}
              >
                Impressum
              </Link>
              {" • "}
              <Link
                href="https://www.caelex.eu/legal/privacy"
                style={footerLinkStyle}
              >
                Datenschutz
              </Link>
            </Text>
            <Text style={copyrightStyle}>
              &copy; {new Date().getFullYear()} Caelex. All rights reserved.
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
  fontSize: "26px",
  fontWeight: "700",
  letterSpacing: "0.18em",
  margin: 0,
};

const taglineStyle: React.CSSProperties = {
  color: colors.indigo300,
  fontSize: "11px",
  margin: "6px 0 0 0",
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
  color: colors.indigo400,
  fontSize: "12px",
  textDecoration: "none",
};

const impressumStyle: React.CSSProperties = {
  color: colors.slate400,
  fontSize: "11px",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "0 0 4px 0",
};

const impressumLinksStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "8px 0 16px 0",
};

const copyrightStyle: React.CSSProperties = {
  color: colors.navy700,
  fontSize: "11px",
  textAlign: "center" as const,
  margin: 0,
};

// ─── Shared style tokens (re-used by all trade-* templates) ───

export const tradeStyles = {
  colors,

  heading: {
    color: colors.white,
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 16px 0",
    lineHeight: "30px",
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

  primaryButton: {
    backgroundColor: colors.indigo500,
    borderRadius: "8px",
    color: colors.white,
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
  } as React.CSSProperties,

  secondaryButton: {
    backgroundColor: "transparent",
    border: `1px solid ${colors.navy700}`,
    borderRadius: "8px",
    color: colors.slate200,
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "500",
    padding: "11px 22px",
    textDecoration: "none",
  } as React.CSSProperties,

  card: {
    backgroundColor: colors.navy800,
    borderRadius: "8px",
    border: `1px solid ${colors.navy700}`,
    padding: "16px",
    marginBottom: "16px",
  } as React.CSSProperties,

  cardCritical: {
    backgroundColor: "#2a1414",
    borderRadius: "8px",
    border: `1px solid ${colors.red500}`,
    padding: "16px",
    marginBottom: "16px",
  } as React.CSSProperties,

  cardWarning: {
    backgroundColor: "#2a1f0a",
    borderRadius: "8px",
    border: `1px solid ${colors.amber500}`,
    padding: "16px",
    marginBottom: "16px",
  } as React.CSSProperties,

  badge: (
    variant: "critical" | "warning" | "info" | "success",
  ): React.CSSProperties => {
    const bgColors = {
      critical: colors.red500,
      warning: colors.amber500,
      info: colors.indigo500,
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
      letterSpacing: "0.05em",
    };
  },

  link: {
    color: colors.indigo400,
    textDecoration: "none",
  } as React.CSSProperties,

  hr: {
    borderColor: colors.navy700,
    borderWidth: "1px 0 0 0",
    margin: "24px 0",
  } as React.CSSProperties,
};

export function tradeUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.caelex.eu";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
