/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * § 203 StGB · § 43e BRAO · § 62a StBerG
 * Verpflichtungserklärung — React-PDF template.
 *
 * Renders a single-page PDF with the canonical Verpflichtungserklärung
 * text plus the per-signer fields (name, role, scope, date). Output is
 * the binding evidence Caelex hands to law-firm customers on request
 * (DPA § 10a Abs. 2 promise).
 *
 * Template versioning: bump TEMPLATE_VERSION when the legal text
 * changes. Section203Commitment.templateVersion captures the version
 * each row was signed under so the PDF re-render is reproducible.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

export const TEMPLATE_VERSION = "v1-2026-05";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.55,
  },
  header: {
    marginBottom: 28,
    borderBottom: "2pt solid #0f172a",
    paddingBottom: 14,
  },
  brand: {
    fontSize: 9,
    color: "#64748b",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10.5,
    color: "#475569",
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify",
  },
  facts: {
    marginTop: 4,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#f1f5f9",
    border: "0.6pt solid #cbd5e1",
    borderRadius: 4,
  },
  factsLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 1,
  },
  factsValue: {
    fontSize: 11,
    color: "#0f172a",
    marginBottom: 6,
  },
  signature: {
    marginTop: 30,
    borderTop: "0.6pt solid #cbd5e1",
    paddingTop: 18,
  },
  sigLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 22,
  },
  sigLine: {
    borderBottom: "0.6pt solid #0f172a",
    width: "60%",
    marginBottom: 4,
  },
  sigName: {
    fontSize: 10,
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    paddingTop: 8,
    borderTop: "0.4pt solid #e2e8f0",
  },
});

export interface Section203PdfData {
  signerName: string;
  role: string;
  signerEmail?: string | null;
  scope: string;
  signedAt: Date;
  recordId: string;
}

export const Section203CommitmentDocument: React.FC<{
  data: Section203PdfData;
}> = ({ data }) => (
  <Document
    title={`Verpflichtungserklärung § 203 StGB — ${data.signerName}`}
    author="Caelex (Inhaber: Julian Polleschner)"
    subject="Verpflichtungserklärung Berufsgeheimnis"
    creator="Caelex Compliance Platform"
    producer="Caelex Compliance Platform"
  >
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>CAELEX · COMPLIANCE PLATFORM</Text>
        <Text style={styles.title}>
          Verpflichtungserklärung auf das Berufsgeheimnis
        </Text>
        <Text style={styles.subtitle}>
          gemäß § 203 StGB, § 43e BRAO sowie § 62a StBerG · Anlage zur
          Auftragsverarbeitungs-Vereinbarung (DPA § 10a)
        </Text>
      </View>

      {/* Facts box */}
      <View style={styles.facts}>
        <Text style={styles.factsLabel}>Verpflichtete Person</Text>
        <Text style={styles.factsValue}>{data.signerName}</Text>

        <Text style={styles.factsLabel}>Funktion / Verhältnis zu Caelex</Text>
        <Text style={styles.factsValue}>{data.role}</Text>

        {data.signerEmail ? (
          <>
            <Text style={styles.factsLabel}>E-Mail</Text>
            <Text style={styles.factsValue}>{data.signerEmail}</Text>
          </>
        ) : null}

        <Text style={styles.factsLabel}>Zugriffs-Scope</Text>
        <Text style={styles.factsValue}>{data.scope}</Text>

        <Text style={styles.factsLabel}>Datum der Verpflichtung</Text>
        <Text style={styles.factsValue}>
          {data.signedAt.toLocaleDateString("de-DE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>1. Verschwiegenheitspflicht</Text>
        <Text style={styles.paragraph}>
          Die unterzeichnende Person verpflichtet sich, sämtliche im Rahmen
          ihrer Tätigkeit für Caelex (Inhaber: Julian Polleschner, Berlin)
          bekannt gewordenen mandantenbezogenen Informationen, insbesondere
          solche, die dem anwaltlichen Berufsgeheimnis nach § 43a Abs. 2 BRAO
          und dem strafrechtlichen Geheimnisschutz nach § 203 StGB unterliegen,
          weder Dritten zu offenbaren noch für eigene oder fremde Zwecke
          auszuwerten.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>
          2. Einbeziehung in den Berufsgeheimnis-Schutzkreis
        </Text>
        <Text style={styles.paragraph}>
          Mit Unterzeichnung erklärt sich die Person ausdrücklich damit
          einverstanden, im Sinne von § 203 Abs. 4 Nr. 1 StGB als „mitwirkende
          Person" am Berufsgeheimnis der von Caelex betreuten
          Berufsgeheimnisträger:innen (Rechtsanwältinnen / Rechtsanwälte und
          Steuerberater:innen) teilzuhaben und sich der gleichen
          strafrechtlichen Verantwortlichkeit zu unterwerfen.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>3. Fortgeltung</Text>
        <Text style={styles.paragraph}>
          Die Verpflichtung gilt unbefristet auch nach Beendigung der Tätigkeit
          für Caelex fort. Eine Entbindung ist ausschließlich durch die jeweils
          betroffene Mandantin oder den jeweils betroffenen Mandanten möglich.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>4. Technische Schutzmaßnahmen</Text>
        <Text style={styles.paragraph}>
          Die Person hält die in Anlage 1 der Auftragsverarbeitungs-Vereinbarung
          (TOMs) beschriebenen technischen und organisatorischen Maßnahmen ein,
          insbesondere Mehr-Faktor-Authentifizierung, rollenbasierte
          Zugriffskontrolle, Audit-Logging und das Verbot der lokalen
          Klartext-Speicherung mandantenbezogener Daten außerhalb der
          freigegebenen Caelex-Systeme.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>5. Verstoßmeldepflicht</Text>
        <Text style={styles.paragraph}>
          Tatsächliche oder vermutete Verstöße gegen diese Erklärung sind
          unverzüglich dem Inhaber (Julian Polleschner) zu melden. Caelex behält
          sich rechtliche Schritte vor.
        </Text>
      </View>

      {/* Signature */}
      <View style={styles.signature}>
        <Text style={styles.sigLabel}>
          Ort, Datum · Unterschrift verpflichtete Person
        </Text>
        <View style={styles.sigLine} />
        <Text style={styles.sigName}>{data.signerName}</Text>
      </View>

      <View style={styles.footer} fixed>
        <Text>
          Caelex (Einzelunternehmen, Inhaber: Julian Polleschner) · Berlin ·
          Template {TEMPLATE_VERSION} · Record-ID {data.recordId}
        </Text>
      </View>
    </Page>
  </Document>
);
