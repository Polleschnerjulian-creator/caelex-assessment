import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";

// Register fonts (using built-in Helvetica)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },

  // Header styles
  header: {
    marginBottom: 30,
    borderBottom: "2pt solid #1E3A5F",
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E3A5F",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#4A5568",
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  headerMetaItem: {
    fontSize: 9,
    color: "#718096",
  },
  logo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E3A5F",
    letterSpacing: 2,
  },

  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E3A5F",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1pt solid #E2E8F0",
  },
  sectionContent: {
    paddingLeft: 5,
  },

  // Content styles
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#2D3748",
    marginBottom: 8,
  },
  heading1: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E3A5F",
    marginTop: 15,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2D3748",
    marginTop: 12,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#4A5568",
    marginTop: 10,
    marginBottom: 6,
  },

  // List styles
  list: {
    marginBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listBullet: {
    width: 15,
    fontSize: 10,
    color: "#4A5568",
  },
  listNumber: {
    width: 20,
    fontSize: 10,
    color: "#4A5568",
  },
  listText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: "#2D3748",
  },

  // Table styles
  table: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E0",
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    color: "#2D3748",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1E3A5F",
  },

  // Key-Value styles
  keyValueContainer: {
    marginBottom: 10,
  },
  keyValueRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  keyValueKey: {
    width: "35%",
    fontSize: 9,
    fontWeight: "bold",
    color: "#4A5568",
  },
  keyValueValue: {
    width: "65%",
    fontSize: 10,
    color: "#2D3748",
  },

  // Alert styles
  alert: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  alertInfo: {
    backgroundColor: "#EBF8FF",
    borderLeftColor: "#3182CE",
  },
  alertWarning: {
    backgroundColor: "#FFFAF0",
    borderLeftColor: "#DD6B20",
  },
  alertError: {
    backgroundColor: "#FFF5F5",
    borderLeftColor: "#E53E3E",
  },
  alertText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  alertInfoText: {
    color: "#2B6CB0",
  },
  alertWarningText: {
    color: "#C05621",
  },
  alertErrorText: {
    color: "#C53030",
  },

  // Spacer and divider
  spacer: {
    marginBottom: 20,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 15,
  },

  // Footer styles
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #E2E8F0",
    paddingTop: 10,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#A0AEC0",
  },
  pageNumber: {
    fontSize: 9,
    color: "#4A5568",
  },
  confidentialNotice: {
    fontSize: 8,
    color: "#E53E3E",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  disclaimer: {
    fontSize: 7,
    color: "#A0AEC0",
    marginTop: 5,
    textAlign: "center",
  },
  headerDisclaimer: {
    fontSize: 7,
    color: "#E53E3E",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
  },
});

/**
 * Render a single content item
 */
function renderContent(content: ReportSectionContent, index: number) {
  switch (content.type) {
    case "text":
      return (
        <Text key={index} style={styles.text}>
          {content.value}
        </Text>
      );

    case "heading":
      const headingStyle =
        content.level === 1
          ? styles.heading1
          : content.level === 2
            ? styles.heading2
            : styles.heading3;
      return (
        <Text key={index} style={headingStyle}>
          {content.value}
        </Text>
      );

    case "list":
      return (
        <View key={index} style={styles.list}>
          {content.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              {content.ordered ? (
                <Text style={styles.listNumber}>{i + 1}.</Text>
              ) : (
                <Text style={styles.listBullet}>•</Text>
              )}
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case "table":
      return (
        <View key={index} style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {content.headers.map((header, i) => (
              <Text key={i} style={styles.tableHeaderCell}>
                {header}
              </Text>
            ))}
          </View>
          {content.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <Text key={cellIndex} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );

    case "keyValue":
      return (
        <View key={index} style={styles.keyValueContainer}>
          {content.items.map((item, i) => (
            <View key={i} style={styles.keyValueRow}>
              <Text style={styles.keyValueKey}>{item.key}</Text>
              <Text style={styles.keyValueValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      );

    case "spacer":
      return (
        <View
          key={index}
          style={[styles.spacer, { marginBottom: content.height || 20 }]}
        />
      );

    case "divider":
      return <View key={index} style={styles.divider} />;

    case "alert":
      const alertStyle =
        content.severity === "info"
          ? styles.alertInfo
          : content.severity === "warning"
            ? styles.alertWarning
            : styles.alertError;
      const alertTextStyle =
        content.severity === "info"
          ? styles.alertInfoText
          : content.severity === "warning"
            ? styles.alertWarningText
            : styles.alertErrorText;
      return (
        <View key={index} style={[styles.alert, alertStyle]}>
          <Text style={[styles.alertText, alertTextStyle]}>
            {content.message}
          </Text>
        </View>
      );

    default:
      return null;
  }
}

/**
 * Render a section
 */
function renderSection(section: ReportSection, index: number) {
  return (
    <View key={index} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionContent}>
        {section.content.map((content, i) => renderContent(content, i))}
      </View>
    </View>
  );
}

/**
 * Base Report Document Component
 */
interface BaseReportProps {
  config: ReportConfig;
}

export function BaseReport({ config }: BaseReportProps) {
  const { header, footer, sections, metadata } = config;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {header.logo && <Text style={styles.logo}>CAELEX</Text>}
          <Text style={styles.headerTitle}>{header.title}</Text>
          {header.subtitle && (
            <Text style={styles.headerSubtitle}>{header.subtitle}</Text>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>
              Report Date:{" "}
              {header.date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
            {header.reportNumber && (
              <Text style={styles.headerMetaItem}>
                Reference: {header.reportNumber}
              </Text>
            )}
            {metadata.organization && (
              <Text style={styles.headerMetaItem}>{metadata.organization}</Text>
            )}
          </View>
        </View>

        {/* Legal header notice */}
        <Text style={styles.headerDisclaimer}>
          For informational purposes only — not legal advice
        </Text>

        {/* Sections */}
        {sections.map((section, index) => renderSection(section, index))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>
              Generated by Caelex (caelex.eu). Not legal advice.
            </Text>
            {footer.confidentialityNotice && (
              <Text style={styles.confidentialNotice}>
                {footer.confidentialityNotice}
              </Text>
            )}
            {footer.pageNumbers && (
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) =>
                  `Page ${pageNumber} of ${totalPages}`
                }
              />
            )}
          </View>
          {footer.disclaimer && (
            <Text style={styles.disclaimer}>{footer.disclaimer}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export { styles };
