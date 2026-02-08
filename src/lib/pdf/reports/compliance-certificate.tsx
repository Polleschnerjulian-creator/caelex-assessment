/**
 * Compliance Certificate PDF Template
 * Official compliance certificate for EU Space Act compliance
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ComplianceCertificateData } from "@/lib/services/audit-export-service";

// Certificate-specific styles
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },

  // Border frame
  borderFrame: {
    border: "3pt solid #1E3A5F",
    padding: 30,
    minHeight: "90%",
  },

  innerBorder: {
    border: "1pt solid #CBD5E0",
    padding: 25,
    minHeight: "100%",
  },

  // Header
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E3A5F",
    letterSpacing: 4,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 9,
    color: "#718096",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Title
  titleSection: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 25,
    paddingVertical: 15,
    borderTop: "2pt solid #1E3A5F",
    borderBottom: "2pt solid #1E3A5F",
  },
  certificateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A5F",
    textTransform: "uppercase",
    letterSpacing: 3,
  },
  certificateSubtitle: {
    fontSize: 12,
    color: "#4A5568",
    marginTop: 8,
  },

  // Main content
  mainContent: {
    marginTop: 20,
    textAlign: "center",
  },
  certifyText: {
    fontSize: 12,
    color: "#4A5568",
    marginBottom: 15,
  },
  organizationName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E3A5F",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1pt dashed #CBD5E0",
  },

  // Score section
  scoreSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 25,
    paddingVertical: 15,
    backgroundColor: "#F7FAFC",
    borderRadius: 8,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  scoreLabel: {
    fontSize: 8,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  scoreDescription: {
    marginLeft: 20,
    textAlign: "left",
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E3A5F",
  },
  scoreStatus: {
    fontSize: 11,
    color: "#4A5568",
    marginTop: 3,
  },

  // Modules section
  modulesSection: {
    marginTop: 25,
  },
  modulesTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E3A5F",
    marginBottom: 10,
    textAlign: "center",
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  moduleItem: {
    width: "30%",
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
    textAlign: "center",
  },
  moduleCompliant: {
    backgroundColor: "#C6F6D5",
    borderColor: "#38A169",
    borderWidth: 1,
  },
  modulePartial: {
    backgroundColor: "#FEFCBF",
    borderColor: "#D69E2E",
    borderWidth: 1,
  },
  moduleNonCompliant: {
    backgroundColor: "#FED7D7",
    borderColor: "#E53E3E",
    borderWidth: 1,
  },
  moduleName: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#2D3748",
  },
  moduleScore: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  moduleScoreGreen: {
    color: "#276749",
  },
  moduleScoreYellow: {
    color: "#975A16",
  },
  moduleScoreRed: {
    color: "#C53030",
  },

  // Attestations
  attestationsSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1pt solid #E2E8F0",
  },
  attestationsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#4A5568",
    marginBottom: 8,
    textAlign: "center",
  },
  attestation: {
    fontSize: 9,
    color: "#4A5568",
    marginBottom: 4,
    paddingLeft: 15,
  },
  attestationBullet: {
    position: "absolute",
    left: 0,
    color: "#38A169",
  },

  // Certificate details
  detailsSection: {
    marginTop: 25,
    paddingTop: 15,
    borderTop: "1pt solid #E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailColumn: {
    width: "45%",
  },
  detailItem: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 8,
    color: "#718096",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 10,
    color: "#2D3748",
    fontWeight: "bold",
  },

  // Signature section
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "40%",
    textAlign: "center",
  },
  signatureLine: {
    borderTop: "1pt solid #2D3748",
    marginTop: 40,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#4A5568",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 80,
    left: 80,
    right: 80,
    textAlign: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#A0AEC0",
    marginBottom: 3,
  },
  footerDisclaimer: {
    fontSize: 6,
    color: "#CBD5E0",
    fontStyle: "italic",
  },

  // QR placeholder
  qrSection: {
    position: "absolute",
    bottom: 110,
    right: 80,
    width: 60,
    height: 60,
    border: "1pt solid #E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholder: {
    fontSize: 6,
    color: "#A0AEC0",
    textAlign: "center",
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getComplianceLevel(score: number): string {
  if (score >= 80) return "Fully Compliant";
  if (score >= 60) return "Substantially Compliant";
  if (score >= 40) return "Partially Compliant";
  return "Non-Compliant";
}

interface ComplianceCertificateProps {
  data: ComplianceCertificateData;
}

export function ComplianceCertificate({ data }: ComplianceCertificateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.borderFrame}>
          <View style={styles.innerBorder}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>CAELEX</Text>
              <Text style={styles.tagline}>Space Compliance Platform</Text>
            </View>

            {/* Title */}
            <View style={styles.titleSection}>
              <Text style={styles.certificateTitle}>
                Certificate of Compliance
              </Text>
              <Text style={styles.certificateSubtitle}>
                EU Space Act Regulatory Compliance Assessment
              </Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.certifyText}>This is to certify that</Text>
              <Text style={styles.organizationName}>
                {data.organizationName}
              </Text>
              <Text style={styles.certifyText}>
                has been assessed for compliance with the EU Space Act
                (COM(2025) 335) and related regulatory requirements.
              </Text>
            </View>

            {/* Score Section */}
            <View style={styles.scoreSection}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{data.complianceScore}</Text>
                <Text style={styles.scoreLabel}>Score</Text>
              </View>
              <View style={styles.scoreDescription}>
                <Text style={styles.scoreTitle}>
                  {getComplianceLevel(data.complianceScore)}
                </Text>
                <Text style={styles.scoreStatus}>
                  Overall Compliance Status
                </Text>
              </View>
            </View>

            {/* Modules Grid */}
            <View style={styles.modulesSection}>
              <Text style={styles.modulesTitle}>Module Assessment Summary</Text>
              <View style={styles.modulesGrid}>
                {data.modules.map((module, index) => {
                  const moduleStyle =
                    module.status === "compliant"
                      ? styles.moduleCompliant
                      : module.status === "partially_compliant"
                        ? styles.modulePartial
                        : styles.moduleNonCompliant;
                  const scoreStyle =
                    module.status === "compliant"
                      ? styles.moduleScoreGreen
                      : module.status === "partially_compliant"
                        ? styles.moduleScoreYellow
                        : styles.moduleScoreRed;

                  return (
                    <View key={index} style={[styles.moduleItem, moduleStyle]}>
                      <Text style={styles.moduleName}>{module.name}</Text>
                      <Text style={[styles.moduleScore, scoreStyle]}>
                        {module.score}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Attestations */}
            {data.attestations.length > 0 && (
              <View style={styles.attestationsSection}>
                <Text style={styles.attestationsTitle}>
                  Compliance Attestations
                </Text>
                {data.attestations.map((attestation, index) => (
                  <View
                    key={index}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    <Text style={{ color: "#38A169", marginRight: 5 }}>✓</Text>
                    <Text style={styles.attestation}>{attestation}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Certificate Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Certificate Number</Text>
                  <Text style={styles.detailValue}>
                    {data.certificateNumber}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Issue Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(data.issuedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Valid Until</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(data.validUntil)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Assessment Type</Text>
                  <Text style={styles.detailValue}>
                    Automated Self-Assessment
                  </Text>
                </View>
              </View>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureLabel}>
                    Authorized Signatory
                  </Text>
                </View>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureLabel}>Date of Signature</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* QR Code Placeholder */}
        <View style={styles.qrSection}>
          <Text style={styles.qrPlaceholder}>Verification{"\n"}QR Code</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Issued by Caelex Compliance Platform | www.caelex.eu
          </Text>
          <Text style={styles.footerDisclaimer}>
            This certificate is based on self-reported data and automated
            assessment. It does not constitute official regulatory approval or
            legal advice. Regulatory requirements are subject to change. Consult
            qualified legal counsel. Verify at caelex.eu/verify/
            {data.certificateNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default ComplianceCertificate;
