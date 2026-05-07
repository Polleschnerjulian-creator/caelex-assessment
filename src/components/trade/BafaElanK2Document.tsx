/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BafaElanK2Document — Antrag-Vorbereitung PDF for the German BAFA-
 * ELAN-K2 export-license application portal.
 *
 * Wave C Sprint C4. Pragmatic scope: rather than replicate BAFA's
 * online form (which changes quarterly), this PDF presents the
 * operation data in BAFA-section order so the operator can copy-paste
 * into ELAN-K2 in one sitting. Robust against portal changes, saves
 * 80% of data-entry time.
 *
 * Sections mirror the official BAFA-Antrag-Aufbau:
 *   1. Antragsteller (applicant — operator's org)
 *   2. Antrag (operation type + reference)
 *   3. Empfänger und Endverwender (counterparty + end-user)
 *   4. Lieferung (route + scheduled date)
 *   5. Güter (items with all classification codes)
 *   6. Endverwendung (declared end-use + sector)
 *   7. Wert (total value breakdown)
 *   8. Lizenzen (existing license stack for cross-reference)
 *   9. Catch-all (any Art. 4-10 / §8 AWV triggers)
 *  10. Risiko-Profil (risk score + factors for the audit memo)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Types ──────────────────────────────────────────────────────────

export interface BafaPdfOperation {
  id: string;
  reference: string;
  description: string;
  operationType: string;
  status: string;
  shipFromCountry: string;
  shipToCountry: string;
  endUseCountry: string | null;
  routeStops: string[];
  declaredEndUse: string;
  endUserName: string | null;
  endUserSector: string | null;
  riskScore: number | null;
  catchAllArt4Hit: boolean;
  catchAllArt5Hit: boolean;
  catchAllArt9Hit: boolean;
  catchAllArt10Hit: boolean;
  notificationDuty: boolean;
  scheduledShipDate: string | null;
  createdAt: string;
  counterparty: {
    legalName: string;
    tradeName: string | null;
    countryCode: string;
    addressLines?: string[];
    vatNumber?: string | null;
    leiCode?: string | null;
  };
  lines: Array<{
    id: string;
    quantity: number;
    unitValue: number;
    unitCurrency: string;
    item: {
      name: string;
      internalSku: string | null;
      manufacturerName: string | null;
      manufacturerPartNo: string | null;
      description: string;
      eccnEU: string | null;
      eccnUS: string | null;
      usmlCategory: string | null;
      mtcrCategory: string | null;
      germanAlEntry: string | null;
    };
    appliedLicense: {
      licenseType: string;
      licenseNumber: string | null;
    } | null;
  }>;
  licenses: Array<{
    licenseType: string;
    licenseNumber: string | null;
    issuedAt: string | null;
    validUntil: string | null;
    status: string;
  }>;
}

export interface BafaPdfApplicant {
  legalName: string;
  address?: string;
  vatNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#0a0a0a",
    paddingBottom: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0a0a0a",
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#555555",
    marginTop: 3,
  },
  headerRef: {
    fontFamily: "Courier",
    fontSize: 10,
    color: "#0a0a0a",
    marginTop: 6,
  },
  section: {
    marginTop: 14,
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#0a0a0a",
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#888888",
    marginBottom: 6,
  },
  sectionNumber: {
    fontSize: 9,
    color: "#666666",
    marginRight: 6,
  },
  kvRow: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  kvLabel: {
    width: 130,
    color: "#666666",
    fontSize: 9,
  },
  kvValue: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 9,
  },
  kvValueMono: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 9,
    fontFamily: "Courier",
  },
  table: {
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#888888",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
    backgroundColor: "#f0f0f0",
  },
  tableCell: {
    paddingHorizontal: 4,
    fontSize: 8.5,
  },
  tableCellHeader: {
    paddingHorizontal: 4,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0a0a0a",
  },
  warningBox: {
    backgroundColor: "#fff3e0",
    borderWidth: 0.5,
    borderColor: "#cc7700",
    padding: 8,
    marginTop: 6,
  },
  warningTitle: {
    fontWeight: "bold",
    color: "#aa5500",
    fontSize: 9,
    marginBottom: 3,
  },
  warningText: {
    color: "#664400",
    fontSize: 8.5,
  },
  riskBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  riskScore: {
    fontSize: 28,
    fontWeight: "bold",
    marginRight: 14,
  },
  riskLabel: {
    fontSize: 9,
    color: "#666666",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: "#888888",
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 6,
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 12,
    right: 36,
    fontSize: 8,
    color: "#888888",
  },
});

// ─── Subcomponents ──────────────────────────────────────────────────

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={mono ? styles.kvValueMono : styles.kvValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionNumber}>{number}.</Text> {title}
      </Text>
    </View>
  );
}

// ─── Main Document ──────────────────────────────────────────────────

export function BafaElanK2Document({
  operation,
  applicant,
}: {
  operation: BafaPdfOperation;
  applicant: BafaPdfApplicant;
}) {
  const totalValue = operation.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitValue,
    0,
  );
  const currencies = Array.from(
    new Set(operation.lines.map((l) => l.unitCurrency)),
  );
  const totalCurrency = currencies.length === 1 ? currencies[0] : "MIXED";

  const catchAllHits = [
    operation.catchAllArt4Hit && {
      cite: "Art. 4 EU 2021/821",
      desc: "WMD/Military catch-all",
    },
    operation.catchAllArt5Hit && {
      cite: "Art. 5 EU 2021/821",
      desc: "Cyber-surveillance / Human Rights catch-all",
    },
    operation.catchAllArt9Hit && {
      cite: "§ 8 AWV",
      desc: "Nationaler Auffangtatbestand (DE)",
    },
    operation.catchAllArt10Hit && {
      cite: "Art. 10 EU 2021/821",
      desc: "Innergemeinschaftliche Verbringung sensitiver Güter (Anlage IV)",
    },
  ].filter(Boolean) as { cite: string; desc: string }[];

  return (
    <Document
      title={`BAFA-Antrag-Vorbereitung — ${operation.reference}`}
      author="Caelex Comply Trade"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            BAFA-ELAN-K2 — Antrag-Vorbereitung
          </Text>
          <Text style={styles.headerSubtitle}>
            Auto-generiert von Caelex Comply Trade. Nicht direkt einreichen —
            als Vorlage für die Eingabe im BAFA-ELAN-K2 Portal nutzen.
          </Text>
          <Text style={styles.headerRef}>{operation.reference}</Text>
        </View>

        {/* §8 AWV warning if notification duty */}
        {operation.notificationDuty && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Anzeigepflicht nach § 8 AWV</Text>
            <Text style={styles.warningText}>
              Catch-all-Tatbestand greift und derzeit ist KEINE deckende
              Genehmigung verbunden. Vor Ausführung MUSS eine Anzeige bei BAFA
              erfolgen oder eine Einzelgenehmigung beantragt werden.
            </Text>
          </View>
        )}

        {/* 1. Antragsteller */}
        <SectionHeader number={1} title="Antragsteller (Applicant)" />
        <KV label="Firma" value={applicant.legalName} />
        {applicant.address && <KV label="Adresse" value={applicant.address} />}
        {applicant.vatNumber && (
          <KV label="USt-IdNr." value={applicant.vatNumber} mono />
        )}
        {applicant.contactPerson && (
          <KV label="Kontakt-AV" value={applicant.contactPerson} />
        )}
        {applicant.contactEmail && (
          <KV label="E-Mail" value={applicant.contactEmail} />
        )}

        {/* 2. Antrag */}
        <SectionHeader number={2} title="Antrag (Application)" />
        <KV label="Vorgangs-Nr." value={operation.reference} mono />
        <KV
          label="Vorgangsart"
          value={operation.operationType.replace(/_/g, " ")}
        />
        <KV
          label="Status (Caelex)"
          value={operation.status.replace(/_/g, " ")}
        />
        {operation.description && (
          <KV label="Beschreibung" value={operation.description} />
        )}
        <KV
          label="Erstellt am"
          value={new Date(operation.createdAt).toLocaleDateString("de-DE")}
        />

        {/* 3. Empfänger und Endverwender */}
        <SectionHeader
          number={3}
          title="Empfänger und Endverwender (Recipient + End-user)"
        />
        <KV label="Empfänger" value={operation.counterparty.legalName} />
        {operation.counterparty.tradeName && (
          <KV label="Handelsname" value={operation.counterparty.tradeName} />
        )}
        <KV label="Land Empfänger" value={operation.counterparty.countryCode} />
        {operation.counterparty.addressLines &&
          operation.counterparty.addressLines.length > 0 && (
            <KV
              label="Anschrift"
              value={operation.counterparty.addressLines.join(", ")}
            />
          )}
        {operation.counterparty.vatNumber && (
          <KV
            label="USt-IdNr. Empf."
            value={operation.counterparty.vatNumber}
            mono
          />
        )}
        {operation.counterparty.leiCode && (
          <KV label="LEI" value={operation.counterparty.leiCode} mono />
        )}
        <KV
          label="Endverwender"
          value={operation.endUserName ?? "(identisch mit Empfänger)"}
        />
        {operation.endUserSector && (
          <KV label="Endverw.-Sektor" value={operation.endUserSector} />
        )}

        {/* 4. Lieferung */}
        <SectionHeader number={4} title="Lieferung (Shipment Route)" />
        <KV label="Versendung aus" value={operation.shipFromCountry} />
        <KV label="Versendung nach" value={operation.shipToCountry} />
        {operation.endUseCountry &&
          operation.endUseCountry !== operation.shipToCountry && (
            <KV label="Endverwendung in" value={operation.endUseCountry} />
          )}
        {operation.routeStops.length > 0 && (
          <KV label="Transit" value={operation.routeStops.join(" → ")} />
        )}
        {operation.scheduledShipDate && (
          <KV
            label="Voraussichtl. Versanddatum"
            value={new Date(operation.scheduledShipDate).toLocaleDateString(
              "de-DE",
            )}
          />
        )}
      </Page>

      {/* Page 2: Items + Values + Catch-all + Risk */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            BAFA-Antrag-Vorbereitung — {operation.reference}
          </Text>
          <Text style={styles.headerSubtitle}>
            Fortsetzung — Güter, Wert, Catch-all, Risiko-Profil
          </Text>
        </View>

        {/* 5. Güter */}
        <SectionHeader number={5} title="Güter (Items)" />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2.4 }]}>
              Bezeichnung
            </Text>
            <Text style={[styles.tableCellHeader, { width: 50 }]}>Menge</Text>
            <Text style={[styles.tableCellHeader, { width: 60 }]}>
              Einzelwert
            </Text>
            <Text style={[styles.tableCellHeader, { width: 50 }]}>EU AL</Text>
            <Text style={[styles.tableCellHeader, { width: 50 }]}>USML</Text>
            <Text style={[styles.tableCellHeader, { width: 40 }]}>MTCR</Text>
            <Text style={[styles.tableCellHeader, { width: 60 }]}>Lizenz</Text>
          </View>
          {operation.lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={[{ flex: 2.4 }]}>
                <Text style={styles.tableCell}>{line.item.name}</Text>
                {line.item.manufacturerName && (
                  <Text
                    style={[styles.tableCell, { color: "#777", fontSize: 7 }]}
                  >
                    {line.item.manufacturerName}
                    {line.item.manufacturerPartNo
                      ? ` · ${line.item.manufacturerPartNo}`
                      : ""}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, { width: 50 }]}>
                {line.quantity}
              </Text>
              <Text
                style={[styles.tableCell, { width: 60, fontFamily: "Courier" }]}
              >
                {line.unitValue.toFixed(2)} {line.unitCurrency}
              </Text>
              <Text
                style={[styles.tableCell, { width: 50, fontFamily: "Courier" }]}
              >
                {line.item.eccnEU ?? "—"}
              </Text>
              <Text
                style={[styles.tableCell, { width: 50, fontFamily: "Courier" }]}
              >
                {line.item.usmlCategory ?? "—"}
              </Text>
              <Text
                style={[styles.tableCell, { width: 40, fontFamily: "Courier" }]}
              >
                {line.item.mtcrCategory ?? "—"}
              </Text>
              <Text style={[styles.tableCell, { width: 60, fontSize: 7.5 }]}>
                {line.appliedLicense
                  ? line.appliedLicense.licenseType.replace(/_/g, " ")
                  : "(keine)"}
              </Text>
            </View>
          ))}
        </View>

        {/* 6. Endverwendung */}
        <SectionHeader number={6} title="Endverwendung (Declared End-use)" />
        <KV
          label="Klassifikation"
          value={operation.declaredEndUse.replace(/_/g, " ")}
        />
        {operation.endUserSector && (
          <KV label="Sektor" value={operation.endUserSector} />
        )}

        {/* 7. Wert */}
        <SectionHeader number={7} title="Wert (Total Value)" />
        <KV
          label="Summe netto"
          value={`${totalValue.toFixed(2)} ${totalCurrency}`}
          mono
        />
        <KV
          label="Anzahl Positionen"
          value={operation.lines.length.toString()}
        />

        {/* 8. Lizenzen */}
        <SectionHeader
          number={8}
          title="Bestehende Genehmigungen (License Stack)"
        />
        {operation.licenses.length === 0 ? (
          <Text
            style={[styles.kvValue, { fontStyle: "italic", color: "#888" }]}
          >
            Keine deckenden Lizenzen verbunden. Antrag wird voraussichtlich
            Einzelausfuhrgenehmigung benötigen.
          </Text>
        ) : (
          operation.licenses.map((lic, i) => (
            <KV
              key={i}
              label={`Lizenz ${i + 1}`}
              value={`${lic.licenseType.replace(/_/g, " ")}${
                lic.licenseNumber ? ` Nr. ${lic.licenseNumber}` : ""
              } · ${lic.status}${
                lic.validUntil
                  ? ` · gültig bis ${new Date(lic.validUntil).toLocaleDateString("de-DE")}`
                  : ""
              }`}
            />
          ))
        )}

        {/* 9. Catch-all */}
        <SectionHeader number={9} title="Catch-all-Tatbestände" />
        {catchAllHits.length === 0 ? (
          <Text
            style={[styles.kvValue, { fontStyle: "italic", color: "#888" }]}
          >
            Keine Catch-all-Tatbestände nach Caelex-Analyse ausgelöst.
          </Text>
        ) : (
          catchAllHits.map((hit, i) => (
            <KV key={i} label={hit.cite} value={hit.desc} />
          ))
        )}

        {/* 10. Risiko-Profil */}
        {operation.riskScore !== null && (
          <>
            <SectionHeader number={10} title="Risiko-Profil (Caelex-Analyse)" />
            <View style={styles.riskBox}>
              <Text
                style={[
                  styles.riskScore,
                  {
                    color:
                      operation.riskScore >= 70
                        ? "#cc2222"
                        : operation.riskScore >= 40
                          ? "#cc8800"
                          : "#228855",
                  },
                ]}
              >
                {operation.riskScore}
              </Text>
              <Text style={styles.riskLabel}>
                /100 ·{" "}
                {operation.riskScore >= 70
                  ? "Hoch"
                  : operation.riskScore >= 40
                    ? "Mittel"
                    : "Niedrig"}
                {"\n"}
                Caelex-Risiko-Score über alle Faktoren aggregiert. Detaillierte
                Faktor-Aufschlüsselung im Caelex-Dashboard verfügbar.
              </Text>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Caelex Comply Trade · BAFA-ELAN-K2 Antrag-Vorbereitung · Compliance-
            Werkzeug, kein Counsel · Vor Einreichung mit qualifizierter Export-
            kontroll-Rechtsberatung verifizieren · § 22 AWV / 15 CFR 762: 5+
            Jahre Aufbewahrungsfrist
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
