/**
 * Pulse Report PDF — Sprint 4D
 *
 * 15-page branded PDF generated for every public-pulse run. Sent on the
 * "Download report" button on /pulse + emailed in Sprint 4E's nurture
 * sequence. Aimed at the prospect's CTO / Compliance-Lead — a take-home
 * artefact they can share internally and use as a reference.
 *
 * **Page outline:**
 *
 *   1.  Cover
 *   2.  Executive summary (3-line elevator pitch + verification headline)
 *   3.  About this report (methodology — 4 free public sources)
 *   4.  Source 1 — VIES (with their result if applicable)
 *   5.  Source 2 — GLEIF
 *   6.  Source 3 — UNOOSA
 *   7.  Source 4 — CelesTrak SATCAT
 *   8.  Cross-verification matrix (per-field agreement count)
 *   9.  EU Space Act overview (regulatory context)
 *  10.  NIS2 Directive overview
 *  11.  Jurisdiction-specific authority list (BAFA, BNetzA, CNES, etc.)
 *  12.  COPUOS / IADC debris-mitigation overview
 *  13.  Compliance gaps + recommended actions
 *  14.  How Caelex helps (platform overview)
 *  15.  Next steps + contact
 *
 * **Privacy:** the prospect's email + IP are NOT printed in the PDF — they
 * appear only on the lead row server-side. The PDF only shows what the
 * operator typed (legalName, vatId), what the public sources returned,
 * and Caelex's regulatory context. So the PDF is shareable internally
 * without leaking PII.
 *
 * **Build target:** A4. Helvetica fonts (built-in to @react-pdf/renderer).
 * Caelex navy + emerald palette.
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

// ─── Fonts ─────────────────────────────────────────────────────────────────

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

// ─── Palette (matches /pulse UI) ───────────────────────────────────────────

const C = {
  navy950: "#0A0F1E",
  navy900: "#0F172A",
  navy800: "#1E293B",
  navy700: "#334155",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  white: "#F8FAFC",
  emerald500: "#10B981",
  emerald300: "#6EE7B7",
  amber500: "#F59E0B",
  amber300: "#FCD34D",
  red500: "#EF4444",
} as const;

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: C.navy900,
    lineHeight: 1.55,
  },

  // Header strip on every non-cover page
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 18,
    borderBottom: `0.5pt solid ${C.slate200}`,
    fontSize: 8,
    color: C.slate400,
  },
  pageHeaderBrand: {
    fontWeight: "bold",
    color: C.navy900,
    letterSpacing: 1.5,
  },

  // Footer (page number)
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.slate400,
  },

  // Cover styles
  coverContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  coverBrand: {
    fontSize: 12,
    color: C.emerald500,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: C.navy900,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 14,
    color: C.navy700,
    marginBottom: 48,
  },
  coverOperator: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.navy900,
    marginBottom: 6,
  },
  coverMeta: {
    fontSize: 10,
    color: C.slate400,
  },
  coverFooter: {
    position: "absolute",
    bottom: 48,
    left: 48,
    right: 48,
    fontSize: 8,
    color: C.slate400,
    borderTop: `0.5pt solid ${C.slate200}`,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Headings
  h1: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.navy900,
    marginBottom: 12,
  },
  h2: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.navy900,
    marginTop: 14,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold",
    color: C.navy700,
    marginTop: 8,
    marginBottom: 4,
  },

  // Body
  p: {
    marginBottom: 8,
    color: C.navy700,
  },
  // Light "muted" caption
  muted: {
    color: C.slate400,
    fontSize: 9,
  },
  bold: { fontWeight: "bold", color: C.navy900 },

  // Callout boxes
  callout: {
    backgroundColor: "#F1F5F9",
    borderLeft: `3pt solid ${C.emerald500}`,
    padding: 12,
    marginVertical: 12,
    fontSize: 10,
    color: C.navy900,
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderLeft: `3pt solid ${C.amber500}`,
    padding: 12,
    marginVertical: 12,
    fontSize: 10,
    color: C.navy900,
  },

  // Table-ish source row
  sourceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottom: `0.5pt solid ${C.slate200}`,
  },
  sourceLabel: { fontWeight: "bold", color: C.navy900, fontSize: 11 },
  sourceStatus: { fontSize: 10 },
  statusOk: { color: C.emerald500, fontWeight: "bold" },
  statusFail: { color: C.amber500, fontWeight: "bold" },
  statusSkip: { color: C.slate400 },

  // Field matrix
  matrixRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: `0.5pt solid ${C.slate200}`,
  },
  matrixField: { flex: 2, fontSize: 10, color: C.navy700 },
  matrixValue: { flex: 2, fontSize: 10, color: C.navy900, fontWeight: "bold" },
  matrixAgreement: {
    flex: 1,
    fontSize: 9,
    color: C.emerald500,
    textAlign: "right",
  },

  // Bullets
  bullet: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletDot: {
    width: 12,
    color: C.emerald500,
    fontSize: 11,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: C.navy700,
  },

  // CTA
  ctaBox: {
    backgroundColor: C.navy900,
    color: "#FFFFFF",
    padding: 20,
    marginTop: 20,
    borderRadius: 4,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 10,
    color: C.slate200,
    marginBottom: 8,
  },
  ctaLink: {
    color: C.emerald300,
    fontWeight: "bold",
  },
});

// ─── Public types ──────────────────────────────────────────────────────────

export interface PulsePdfData {
  leadId: string;
  generatedAt: Date;
  legalName: string;
  vatId?: string | null;
  email: string;
  // Cross-verification snapshot (mirrors PulseLead.detectionResult)
  successfulSources: string[];
  failedSources: Array<{ source: string; errorKind: string; message?: string }>;
  mergedFields: Array<{
    fieldName: string;
    value: unknown;
    agreementCount: number;
    contributingAdapters: string[];
  }>;
  warnings: string[];
  bestPossibleTier: "T0_UNVERIFIED" | "T2_SOURCE_VERIFIED";
}

// ─── Source labels (mirror /pulse UI) ──────────────────────────────────────

const SOURCES: Array<{
  key: string;
  label: string;
  authority: string;
  description: string;
}> = [
  {
    key: "vies-eu-vat",
    label: "VIES — EU VAT Information Exchange System",
    authority: "EU Commission DG TAXUD",
    description:
      "Cross-validates VAT registration against each member-state's tax authority. Authoritative for jurisdiction confirmation.",
  },
  {
    key: "gleif-lei",
    label: "GLEIF — Global Legal Entity Identifier Foundation",
    authority: "G20 / ISO 17442",
    description:
      "Global registry of LEIs. Issued by Local Operating Units (e.g. Bundesanzeiger Verlag for DE). Confirms legal-entity status, jurisdiction, and entity legal form.",
  },
  {
    key: "unoosa-online-index",
    label: "UNOOSA Online Index",
    authority: "UN Office for Outer Space Affairs",
    description:
      "Official UN registry of space objects under the 1976 Registration Convention. National governments file directly with UNOOSA.",
  },
  {
    key: "celestrak-satcat",
    label: "CelesTrak SATCAT",
    authority: "Public derivative of US-AF / CSpOC tracking data",
    description:
      "Authoritative satellite catalog used by orbital-mechanics tools globally. Returns owner-country, orbit class, launch date.",
  },
];

const FIELD_LABELS: Record<string, string> = {
  establishment: "Country of establishment",
  isConstellation: "Operates a constellation",
  constellationSize: "Constellation size",
  primaryOrbit: "Primary orbit class",
  operatorType: "Operator type",
  entitySize: "Entity size",
};

// ─── Page Header / Footer ──────────────────────────────────────────────────

function PageHeader({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text style={styles.pageHeaderBrand}>CAELEX</Text>
      <Text>{subtitle}</Text>
    </View>
  );
}

function PageFooter({ leadId }: { leadId: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>Pulse Report · Lead {leadId.slice(0, 12)}…</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Page Components ──────────────────────────────────────────────────────

/** Page 1 — Cover */
function CoverPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverContainer}>
        <Text style={styles.coverBrand}>CAELEX · COMPLIANCE PULSE</Text>
        <Text style={styles.coverTitle}>Cross-verification report</Text>
        <Text style={styles.coverSubtitle}>
          Real-time check against four authoritative public sources.
        </Text>
        <Text style={styles.coverOperator}>{data.legalName}</Text>
        {data.vatId && (
          <Text style={styles.coverMeta}>VAT-ID: {data.vatId}</Text>
        )}
        <Text style={styles.coverMeta}>
          Generated {data.generatedAt.toISOString().slice(0, 10)} · Lead{" "}
          {data.leadId}
        </Text>
      </View>
      <View style={styles.coverFooter}>
        <Text>Caelex Compliance · caelex.eu</Text>
        <Text>Pulse v1 · 2026</Text>
      </View>
    </Page>
  );
}

/** Page 2 — Executive summary */
function ExecutiveSummaryPage({ data }: { data: PulsePdfData }) {
  const sourceCount = data.successfulSources.length + data.failedSources.length;
  const fieldCount = data.mergedFields.length;
  const verified = data.bestPossibleTier === "T2_SOURCE_VERIFIED";

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Executive summary" />
      <Text style={styles.h1}>Executive summary</Text>
      <Text style={styles.p}>
        This report summarises a Caelex Pulse run for{" "}
        <Text style={styles.bold}>{data.legalName}</Text>. Pulse cross- verifies
        an operator&apos;s legal identity and orbital footprint against four
        free public sources: EU VIES, GLEIF, UNOOSA, and CelesTrak SATCAT. No
        demos, no fakes — every source listed below was hit live at the time of
        generation.
      </Text>

      <View style={verified ? styles.callout : styles.warningBox}>
        <Text style={styles.bold}>
          {verified
            ? `${fieldCount} verified field${fieldCount === 1 ? "" : "s"} across ${data.successfulSources.length} of ${sourceCount} sources.`
            : "No public-source data available for this operator."}
        </Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>
          {verified
            ? "Caelex would write these as T2_SOURCE_VERIFIED evidence rows in your operator profile if you sign up."
            : "Manual setup is needed during onboarding — operator-supplied data starts at T1_SELF_CONFIRMED until you upload backing documents."}
        </Text>
      </View>

      <Text style={styles.h2}>What this report contains</Text>
      <View>
        <BulletItem text="Per-source verification details — what each authority confirmed, what failed" />
        <BulletItem text="Cross-verification matrix — every field with the agreement count" />
        <BulletItem text="Regulatory context — EU Space Act, NIS2, COPUOS/IADC, jurisdictional authorities" />
        <BulletItem text="Compliance gaps and Caelex-recommended next steps" />
        <BulletItem text="Platform overview + signup CTA" />
      </View>

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 3 — Methodology */
function MethodologyPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Methodology" />
      <Text style={styles.h1}>About this report</Text>
      <Text style={styles.p}>
        Caelex Pulse is built on a strict zero-cost, no-vendor-lock-in
        foundation. The four sources below are all public, free, and directly
        maintained by the relevant tax / corporate / space authorities. None of
        them require an API key. None of them are scraped from third-party data
        brokers.
      </Text>

      <Text style={styles.h2}>Source authority hierarchy</Text>
      <Text style={styles.p}>
        When sources disagree, Caelex&apos;s cross-verifier picks the
        highest-priority result. Priority ordering reflects the
        authoritativeness of the underlying registry:
      </Text>
      <View>
        <BulletItem text="VIES (tax authority — EU Commission)" />
        <BulletItem text="GLEIF (G20/ISO LEI registry — national LOUs)" />
        <BulletItem text="UNOOSA (UN Outer Space Affairs)" />
        <BulletItem text="CelesTrak SATCAT (US Air Force / CSpOC public derivative)" />
      </View>

      <Text style={styles.h2}>Privacy posture</Text>
      <Text style={styles.p}>
        Caelex captured: legalName, optional VAT-ID, email, IP, user- agent. The
        PDF does NOT print email or IP — those stay server- side on your lead
        record. Share this PDF internally without PII leakage.
      </Text>
      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Pages 4-7 — Per-source detail pages */
function SourceDetailPage({
  data,
  source,
}: {
  data: PulsePdfData;
  source: (typeof SOURCES)[number];
}) {
  const succeeded = data.successfulSources.includes(source.key);
  const failed = data.failedSources.find((f) => f.source === source.key);
  const fields = data.mergedFields.filter((f) =>
    f.contributingAdapters.includes(source.key),
  );

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle={source.label} />
      <Text style={styles.h1}>{source.label}</Text>
      <Text style={[styles.muted, { marginBottom: 12 }]}>
        Authority: {source.authority}
      </Text>
      <Text style={styles.p}>{source.description}</Text>

      <View style={styles.sourceRow}>
        <Text style={styles.sourceLabel}>Result</Text>
        <Text
          style={[
            styles.sourceStatus,
            succeeded
              ? styles.statusOk
              : failed
                ? styles.statusFail
                : styles.statusSkip,
          ]}
        >
          {succeeded
            ? "✓ Confirmed"
            : failed
              ? `✗ ${failed.errorKind}`
              : "Not applicable to this query"}
        </Text>
      </View>

      {fields.length > 0 && (
        <>
          <Text style={styles.h3}>Fields contributed</Text>
          {fields.map((f) => (
            <View key={f.fieldName} style={styles.matrixRow}>
              <Text style={styles.matrixField}>
                {FIELD_LABELS[f.fieldName] ?? f.fieldName}
              </Text>
              <Text style={styles.matrixValue}>{String(f.value)}</Text>
              <Text style={styles.matrixAgreement}>
                {f.agreementCount}/{data.successfulSources.length} agree
              </Text>
            </View>
          ))}
        </>
      )}

      {failed && failed.message && (
        <View style={styles.warningBox}>
          <Text style={styles.bold}>Why it failed</Text>
          <Text style={[styles.muted, { marginTop: 4 }]}>{failed.message}</Text>
        </View>
      )}

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 8 — Cross-verification matrix */
function MatrixPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Cross-verification matrix" />
      <Text style={styles.h1}>Cross-verification matrix</Text>
      <Text style={styles.p}>
        For each detected field, this matrix shows the value chosen by the
        cross-verifier and how many independent sources agreed.
      </Text>
      <View style={[styles.matrixRow, { backgroundColor: "#F1F5F9" }]}>
        <Text style={[styles.matrixField, styles.bold]}>Field</Text>
        <Text style={[styles.matrixValue, styles.bold]}>Value</Text>
        <Text style={[styles.matrixAgreement, styles.bold]}>Agreement</Text>
      </View>
      {data.mergedFields.length === 0 ? (
        <Text style={[styles.p, styles.muted, { marginTop: 12 }]}>
          No fields detected from public sources. Manual setup required during
          onboarding.
        </Text>
      ) : (
        data.mergedFields.map((f) => (
          <View key={f.fieldName} style={styles.matrixRow}>
            <Text style={styles.matrixField}>
              {FIELD_LABELS[f.fieldName] ?? f.fieldName}
            </Text>
            <Text style={styles.matrixValue}>{String(f.value)}</Text>
            <Text style={styles.matrixAgreement}>
              {f.agreementCount}/{data.successfulSources.length}
            </Text>
          </View>
        ))
      )}

      {data.warnings.length > 0 && (
        <>
          <Text style={[styles.h2, { marginTop: 16 }]}>Source notes</Text>
          {data.warnings.slice(0, 8).map((w, i) => (
            <BulletItem key={i} text={w} />
          ))}
        </>
      )}

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 9 — EU Space Act overview */
function EUSpaceActPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="EU Space Act overview" />
      <Text style={styles.h1}>EU Space Act (COM(2025) 335)</Text>
      <Text style={styles.p}>
        The EU Space Act establishes harmonised authorisation rules for space
        activities in the European Union. It applies to any operator established
        in the EU or offering services to EU customers. The Act covers:
      </Text>
      <View>
        <BulletItem text="Authorisation of space activities (Articles 4–24)" />
        <BulletItem text="Registration of space objects with national authorities (Articles 25–32)" />
        <BulletItem text="Cybersecurity requirements (Articles 33–48 — aligned with NIS2)" />
        <BulletItem text="Debris-mitigation obligations (Articles 49–66 — aligned with COPUOS/IADC)" />
        <BulletItem text="Environmental impact assessment (Articles 67–80)" />
        <BulletItem text="Mandatory third-party-liability insurance (Articles 81–92)" />
        <BulletItem text="Supervision + enforcement (Articles 93–119)" />
      </View>

      <Text style={styles.h2}>Operator-type matrix</Text>
      <Text style={styles.p}>
        The Act recognises 7 operator types (Spacecraft Operator, Launch
        Operator, In-Space Operator, ISOS, Data Provider, Launch Site,
        Spacecraft Manufacturer). The applicable subset of obligations depends
        on the type and on entity size.
      </Text>

      <View style={styles.callout}>
        <Text style={styles.bold}>What we infer for {data.legalName}</Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>
          Based on the cross-verification, our best inference is that this
          operator is in the early-stage compliance phase. Caelex&apos;s
          onboarding wizard determines applicability via an 8-question
          assessment that maps to the canonical operator- type taxonomy.
        </Text>
      </View>
      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 10 — NIS2 overview */
function NIS2Page({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="NIS2 Directive overview" />
      <Text style={styles.h1}>NIS2 Directive (EU 2022/2555)</Text>
      <Text style={styles.p}>
        NIS2 is the EU&apos;s cybersecurity baseline for essential and important
        entities. Space-sector operators are scoped in via Annex I (sector:
        Space). Two essential pillars apply:
      </Text>
      <Text style={styles.h2}>
        Cybersecurity-risk-management measures (Art. 21)
      </Text>
      <View>
        <BulletItem text="Risk-analysis and information-system security policies" />
        <BulletItem text="Incident-handling and response procedures" />
        <BulletItem text="Business-continuity / disaster-recovery / crisis-management" />
        <BulletItem text="Supply-chain security" />
        <BulletItem text="Network + system acquisition / development / maintenance" />
        <BulletItem text="Cryptographic policies + encryption" />
        <BulletItem text="Human-resource security + access control" />
        <BulletItem text="Multi-factor authentication" />
        <BulletItem text="Effectiveness assessment of cybersecurity measures" />
        <BulletItem text="Basic cyber-hygiene practices + cybersecurity training" />
      </View>
      <Text style={styles.h2}>Incident-reporting timeline (Art. 23)</Text>
      <View>
        <BulletItem text="24h after detection — early-warning notification (CSIRT)" />
        <BulletItem text="72h after detection — incident-update notification" />
        <BulletItem text="30d after notification — final report with root-cause analysis" />
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.bold}>Why this matters for {data.legalName}</Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>
          NIS2 transposition deadlines have lapsed. Penalties for non-compliance
          reach €10M or 2% of global annual turnover (essential entities).
          Caelex&apos;s NIS2 module auto-runs a 51-requirement gap analysis from
          your operator profile.
        </Text>
      </View>
      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 11 — Jurisdiction-specific authority list */
function JurisdictionPage({ data }: { data: PulsePdfData }) {
  const establishment = data.mergedFields.find(
    (f) => f.fieldName === "establishment",
  )?.value as string | undefined;

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Jurisdictional authorities" />
      <Text style={styles.h1}>National authorities</Text>
      <Text style={styles.p}>
        EU Space Act delegates implementation to national competent authorities
        (NCAs). For your detected jurisdiction
        {establishment ? ` (${establishment})` : ""}, the typical authority
        footprint is below. Caelex&apos;s NCA-portal module handles submissions
        to each.
      </Text>

      {/* Show 4 authorities — generic if no jurisdiction match, DE-specific
          if establishment === DE */}
      {establishment === "DE" ? (
        <>
          <AuthorityRow
            name="BAFA — Bundesamt für Wirtschaft und Ausfuhrkontrolle"
            scope="Export control (dual-use), space-component licences"
          />
          <AuthorityRow
            name="BNetzA — Bundesnetzagentur"
            scope="Spectrum / frequency licensing, ITU-R coordination"
          />
          <AuthorityRow
            name="BSI — Bundesamt für Sicherheit in der Informationstechnik"
            scope="NIS2 incident reporting, cybersecurity supervision"
          />
          <AuthorityRow
            name="BfDI — Bundesbeauftragte für Datenschutz"
            scope="GDPR / DSGVO oversight, data protection"
          />
        </>
      ) : (
        <>
          <AuthorityRow
            name="National space agency / NCA"
            scope="EU Space Act authorisation, registration"
          />
          <AuthorityRow
            name="Telecommunications regulator"
            scope="Spectrum / frequency licensing"
          />
          <AuthorityRow
            name="National cyber authority (CSIRT)"
            scope="NIS2 incident reporting, cybersecurity supervision"
          />
          <AuthorityRow
            name="Data-protection authority"
            scope="GDPR oversight"
          />
        </>
      )}

      <View style={styles.callout}>
        <Text style={[styles.muted]}>
          Caelex maintains live deadline trackers, submission templates, and
          NCA-portal status polling for 27 EU + EEA jurisdictions.
        </Text>
      </View>

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 12 — COPUOS / IADC overview */
function CopuosPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="COPUOS / IADC debris mitigation" />
      <Text style={styles.h1}>Space debris mitigation</Text>
      <Text style={styles.p}>
        UN COPUOS (Committee on the Peaceful Uses of Outer Space) and IADC
        (Inter-Agency Space Debris Coordination Committee) jointly publish
        debris-mitigation guidelines. These are non-binding internationally but
        transposed into EU Space Act Articles 49–66 and into national space laws
        of all EU member states.
      </Text>
      <Text style={styles.h2}>Core obligations</Text>
      <View>
        <BulletItem text="25-year post-mission disposal rule for LEO objects" />
        <BulletItem text="Casualty-risk threshold ≤ 1:10,000 for re-entry" />
        <BulletItem text="Collision-avoidance manoeuvre planning" />
        <BulletItem text="Conjunction Data Message (CDM) handling protocols" />
        <BulletItem text="Passivation of spacecraft + upper stages at end of mission" />
        <BulletItem text="No intentional break-up below 2,000 km altitude" />
      </View>
      <View style={styles.callout}>
        <Text style={[styles.muted]}>
          Caelex&apos;s Mission-Control + Ephemeris modules continuously
          forecast compliance against the 25-year rule using TLE data from
          CelesTrak (the same source used in this report) and Solar-Flux drag
          projections.
        </Text>
      </View>
      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 13 — Compliance gaps + recommended actions */
function GapsPage({ data }: { data: PulsePdfData }) {
  const hasFields = data.mergedFields.length > 0;
  const hasFailures = data.failedSources.length > 0;

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Gaps + recommended actions" />
      <Text style={styles.h1}>Recommended next steps</Text>

      <Text style={styles.h2}>1. Operator-profile setup</Text>
      <Text style={styles.p}>
        {hasFields
          ? "Caelex would import the verified fields above as T2_SOURCE_VERIFIED evidence rows on your operator profile during onboarding. You can confirm or override each before the cross-platform hash chain is committed."
          : "No public-source data was found. Caelex onboarding will start with operator-supplied data at T1_SELF_CONFIRMED tier and walk you through document-upload to upgrade fields to T2/T3."}
      </Text>

      <Text style={styles.h2}>2. EU Space Act applicability assessment</Text>
      <Text style={styles.p}>
        Run the 8-question wizard at /assessment/eu-space-act. It maps your
        operator profile to the 7 canonical operator types and produces an
        applicability matrix across all 9 EU Space Act modules.
      </Text>

      <Text style={styles.h2}>3. NIS2 gap analysis</Text>
      <Text style={styles.p}>
        Caelex&apos;s NIS2 module auto-runs a 51-requirement gap analysis from
        your operator profile. Output: prioritised list of policies + technical
        controls to implement, with article- level traceability.
      </Text>

      {hasFailures && (
        <>
          <Text style={styles.h2}>4. Re-verify failed sources</Text>
          <Text style={styles.p}>
            {data.failedSources.length} source
            {data.failedSources.length === 1 ? "" : "s"} failed during this run.
            Caelex&apos;s re-verification cron retries failed sources daily —
            fields move from T0 → T2 automatically when they become available.
          </Text>
        </>
      )}

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 14 — Caelex platform overview */
function PlatformPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Caelex platform" />
      <Text style={styles.h1}>How Caelex helps</Text>
      <Text style={styles.p}>
        Caelex Comply is the only compliance platform built specifically for
        European space operators. The same infrastructure that produced this
        report drives the full operator workflow.
      </Text>
      <Text style={styles.h2}>Core modules</Text>
      <View>
        <BulletItem text="Operator profile with T0–T5 verification tier system + tamper-evident hash chain" />
        <BulletItem text="EU Space Act assessment + applicability matrix" />
        <BulletItem text="NIS2 cybersecurity gap analysis (51 requirements)" />
        <BulletItem text="National space-law module for 10 EU jurisdictions" />
        <BulletItem text="Mission Control: live 3D satellite tracking + ephemeris forecasting" />
        <BulletItem text="NCA-portal: deadline tracking + submission templates for all 27 EU NCAs" />
        <BulletItem text="Astra AI assistant: AI-Act-compliant compliance copilot" />
        <BulletItem text="COWF workflow engine: durable, AI-aware, audit-fest workflows" />
        <BulletItem text="Assure investor-due-diligence with Regulatory-Readiness-Score" />
      </View>
      <Text style={styles.h2}>Architectural commitments</Text>
      <View>
        <BulletItem text="Postgres-only — no Inngest / Temporal / external workflow vendor" />
        <BulletItem text="Hash-chained audit trail across every state change" />
        <BulletItem text="EU-AI-Act-compliant AI integration (Art. 12–14, 50)" />
        <BulletItem text="GDPR-by-default, German-server-deployable" />
      </View>
      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

/** Page 15 — Next steps + contact */
function NextStepsPage({ data }: { data: PulsePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader subtitle="Next steps" />
      <Text style={styles.h1}>Next steps</Text>
      <Text style={styles.p}>
        This Pulse report is the first 30 seconds of Caelex onboarding. The full
        operator-profile setup takes about 18 minutes; from there, your daily
        compliance routine is 5–8 minutes.
      </Text>

      <View style={styles.ctaBox}>
        <Text style={styles.ctaTitle}>Sign up for free</Text>
        <Text style={styles.ctaText}>
          The free tier includes 1 mission, 2 workflows, and 100 Astra calls per
          month. No expiring trial — compliance workflows take months, so we
          don&apos;t time-box. Use{" "}
          <Text style={styles.ctaLink}>caelex.eu/signup</Text>.
        </Text>
        <Text style={styles.ctaText}>
          Quote your lead ID at signup to retain this report&apos;s context:{" "}
          <Text style={styles.ctaLink}>{data.leadId}</Text>
        </Text>
      </View>

      <Text style={styles.h2}>Or get a guided tour</Text>
      <Text style={styles.p}>
        If you&apos;d prefer to see Caelex with someone walking you through it,
        book a 30-minute demo at <Text style={styles.bold}>caelex.eu/demo</Text>
        . We&apos;ll pre-load the cross-verification result above so the call
        starts from your real data, not a generic deck.
      </Text>

      <Text style={styles.h2}>Questions about this report?</Text>
      <Text style={styles.p}>
        Email <Text style={styles.bold}>compliance@caelex.eu</Text> with the
        lead ID above. We&apos;ll respond within 24 hours on business days.
      </Text>

      <Text style={[styles.muted, { marginTop: 24 }]}>
        Generated {data.generatedAt.toISOString()} · Caelex Compliance Pulse
        v1.0
      </Text>

      <PageFooter leadId={data.leadId} />
    </Page>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bullet} wrap={false}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function AuthorityRow({ name, scope }: { name: string; scope: string }) {
  return (
    <View style={styles.matrixRow}>
      <View style={{ flex: 3 }}>
        <Text style={[styles.matrixField, styles.bold]}>{name}</Text>
        <Text style={[styles.muted, { marginTop: 2 }]}>{scope}</Text>
      </View>
    </View>
  );
}

// ─── Top-level Document ────────────────────────────────────────────────────

export function PulsePdfReport({ data }: { data: PulsePdfData }) {
  return (
    <Document
      title={`Caelex Pulse Report — ${data.legalName}`}
      author="Caelex Compliance"
      subject="Cross-verification report from public sources"
      creator="Caelex Pulse v1"
    >
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <MethodologyPage data={data} />
      {SOURCES.map((s) => (
        <SourceDetailPage key={s.key} data={data} source={s} />
      ))}
      <MatrixPage data={data} />
      <EUSpaceActPage data={data} />
      <NIS2Page data={data} />
      <JurisdictionPage data={data} />
      <CopuosPage data={data} />
      <GapsPage data={data} />
      <PlatformPage data={data} />
      <NextStepsPage data={data} />
    </Document>
  );
}
