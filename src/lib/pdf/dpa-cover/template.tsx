/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * AVV / DPA Cover Sheet — React-PDF template.
 *
 * The full DPA content lives at /legal/dpa (646 LOC, single canonical
 * source). This cover sheet is the **executable instrument** that
 * binds a specific customer to a specific DPA version. The cover
 * carries:
 *   - Parties (Caelex Inhaber + Customer Org)
 *   - DPA version + content hash (so any later edit is detectable)
 *   - Signature blocks for both parties
 *
 * Pattern matches how big SaaS vendors (Stripe, Vercel) execute their
 * DPAs — the legal text stays online; the customer counter-signs the
 * cover that references it.
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

export const DPA_TEMPLATE_VERSION = "v1-2026-05";

Font.register({
  family: "Helvetica",
  fonts: [{ src: "Helvetica" }, { src: "Helvetica-Bold", fontWeight: "bold" }],
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
    marginBottom: 24,
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
  parties: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  party: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f1f5f9",
    border: "0.6pt solid #cbd5e1",
    borderRadius: 4,
  },
  partyLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  partyAddress: {
    fontSize: 10,
    color: "#334155",
  },
  meta: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#fefce8",
    border: "0.6pt solid #fde68a",
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 130,
    fontSize: 9.5,
    color: "#92400e",
  },
  metaValue: {
    flex: 1,
    fontSize: 10,
    color: "#0f172a",
  },
  hash: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#475569",
  },
  signatureRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 36,
  },
  signatureBlock: {
    flex: 1,
  },
  sigLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 22,
  },
  sigLine: {
    borderBottom: "0.6pt solid #0f172a",
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

export interface DpaCoverPdfData {
  customerOrgName: string;
  customerOrgSlug: string;
  customerOrgAddress?: string | null;
  customerSignerName?: string | null;
  customerSignerRole?: string | null;
  dpaVersion: string;
  dpaContentHash: string;
  generatedAt: Date;
  recordId: string;
}

export const DpaCoverDocument: React.FC<{ data: DpaCoverPdfData }> = ({
  data,
}) => (
  <Document
    title={`AVV / DPA Cover · Caelex ↔ ${data.customerOrgName}`}
    author="Caelex (Inhaber: Julian Polleschner)"
    subject="Auftragsverarbeitungsvertrag"
    creator="Caelex Compliance Platform"
    producer="Caelex Compliance Platform"
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.brand}>CAELEX · COMPLIANCE PLATFORM</Text>
        <Text style={styles.title}>
          Auftragsverarbeitungsvertrag (AVV) — Vollziehungs-Deckblatt
        </Text>
        <Text style={styles.subtitle}>
          gemäß Art. 28 DSGVO · Anlage zum Hauptvertrag (Caelex AGB §§ 1, 20)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.paragraph}>
          Dieses Deckblatt dokumentiert die verbindliche Annahme der
          Auftragsverarbeitungs-Vereinbarung zwischen den nachfolgend genannten
          Parteien. Die vollständige Vertragsfassung steht unter
          https://caelex.com/legal/dpa zur Einsicht und ist Bestandteil dieser
          Vereinbarung. Die unten angegebene SHA-256-Prüfsumme verbindet dieses
          Deckblatt eindeutig mit dem zum Ausstellungszeitpunkt gültigen
          Vertragstext.
        </Text>
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Auftragsverarbeiter (Caelex)</Text>
          <Text style={styles.partyName}>Caelex (Einzelunternehmen)</Text>
          <Text style={styles.partyAddress}>
            Inhaber: Julian Polleschner{"\n"}
            Am Maselakepark 37{"\n"}
            13587 Berlin{"\n"}
            Deutschland
          </Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Verantwortlicher (Kanzlei)</Text>
          <Text style={styles.partyName}>{data.customerOrgName}</Text>
          <Text style={styles.partyAddress}>
            {data.customerOrgAddress ||
              "[Vollständige Anschrift eintragen — wird beim\nZurücksenden des Deckblatts ergänzt.]"}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>DPA-Version</Text>
          <Text style={styles.metaValue}>{data.dpaVersion}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Ausstellungs-Datum</Text>
          <Text style={styles.metaValue}>
            {data.generatedAt.toLocaleDateString("de-DE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Vertragstext</Text>
          <Text style={styles.metaValue}>https://caelex.com/legal/dpa</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>SHA-256 Prüfsumme</Text>
          <Text style={[styles.metaValue, styles.hash]}>
            {data.dpaContentHash}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Record-ID</Text>
          <Text style={[styles.metaValue, styles.hash]}>{data.recordId}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>
          Besondere Annexe (DPA Anlagen)
        </Text>
        <Text style={styles.paragraph}>
          Anlage 1 — Technische und organisatorische Maßnahmen (TOMs).{"\n"}
          Anlage 2 — Sub-Prozessoren-Register
          (https://caelex.com/legal/sub-processors).{"\n"}§ 10a — Annex
          Berufsgeheimnisträger (§ 43e BRAO · § 203 StGB · § 62a StBerG) —
          verbindlich für rechtsanwaltliche Mandantenarbeit.
        </Text>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.signatureBlock}>
          <Text style={styles.sigLabel}>
            Berlin, {data.generatedAt.toLocaleDateString("de-DE")}
            {"\n"}
            Auftragsverarbeiter
          </Text>
          <View style={styles.sigLine} />
          <Text style={styles.sigName}>Julian Polleschner</Text>
          <Text style={styles.sigName}>Inhaber, Caelex Einzelunternehmen</Text>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.sigLabel}>
            Ort, Datum{"\n"}
            Verantwortlicher (Unterschrift Kanzlei)
          </Text>
          <View style={styles.sigLine} />
          <Text style={styles.sigName}>
            {data.customerSignerName || "[Name eintragen]"}
          </Text>
          <Text style={styles.sigName}>
            {data.customerSignerRole || "[Funktion eintragen]"}
          </Text>
        </View>
      </View>

      <View style={styles.footer} fixed>
        <Text>
          Caelex (Einzelunternehmen, Inhaber: Julian Polleschner) · Berlin ·
          DPA-Cover {DPA_TEMPLATE_VERSION}
        </Text>
      </View>
    </Page>
  </Document>
);
