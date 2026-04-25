# Pharos — Technisches Konzept (Implementation Spec)

> **Status:** Konzept · noch kein Code · 25. April 2026  
> **Vorausgegangen:** [PHAROS-VISION.md](./PHAROS-VISION.md) (Strategie + Naming)  
> **Approval:** ausstehend von Polleschnerjulian — kein Code wird gebaut bevor dieses Spec abgenommen ist (Konzept-vor-Code).

## 0. Lese-Anleitung

Dieses Dokument ist die **detaillierte Implementations-Spezifikation** für Pharos — das dritte Pillar des Caelex-Ökosystems (Caelex × Atlas × Pharos). Es baut auf der Strategie-Vision in [PHAROS-VISION.md](./PHAROS-VISION.md) auf und ergänzt sie um konkrete Schema-Änderungen, API-Surfaces, UI-Pages, User-Flows und MVP-Slicing.

**Wenn du dieses Doc zum ersten Mal liest:**

1. § 1 Scope + Annahmen — was Pharos ist und nicht ist
2. § 4 Core Concepts — die fünf Bausteine die Pharos unique machen
3. § 11 Implementation-Phasen — was wann gebaut wird
4. § 12 Offene Entscheidungen — wo deine Meinung gebraucht wird

Der Rest sind technische Tiefenkapitel die du beim Code-Bauen nachliest.

---

## 1. Scope & Annahmen

### 1.1 Was Pharos ist

Pharos ist die **Behörden-seitige Software** des Caelex-Ökosystems. Behörden (BAFA, BNetzA, BMWK, BSI, BMVg, ESA-Liaison, EU Commission DG DEFIS) bekommen einen Workspace mit dem sie:

1. ihren **Operator-Aufsichtsbereich** live einsehen
2. **Anträge / Submissions** strukturiert empfangen + reviewen
3. **Cross-Authority** mit anderen Behörden koordinieren (mit Operator-Consent)
4. **Public Attestations** signieren (kryptografisch verifizierbar)
5. **AI-gestützt** vorprüfen, Anomalien erkennen, Bescheide drafte

### 1.2 Was Pharos NICHT ist

- ❌ **Kein Überwachungs-Tool** — Pharos zeigt was Operatoren explizit / regulatorisch teilen, nichts darüber hinaus
- ❌ **Kein Geheimdienst-System** — keine Real-Time-Telemetrie der Operator-Aktivitäten
- ❌ **Kein Eingangstor für unbeauftragte Behörden** — invite-only via Caelex
- ❌ **Kein Selbstbedien-Public-Portal** — Behörden-Mitarbeiter haben verifizierte Credentials
- ❌ **Kein Replacement für ELSTER / GeNeSiS / VS-Geheim** — Pharos ist Open-Tier, klassifizierte Daten bleiben in Behörden-eigenen Systemen

### 1.3 Voraussetzungen die schon stehen

Pharos wiederverwendet die Architektur von Caelex × Atlas:

| Vorhandener Baustein                    | Pharos-Wiederverwendung                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| Bilateral-Handshake (matter-service.ts) | → Oversight-Handshake (Variante mit Mandatory Disclosure Floor) |
| Hash-Chain Audit-Log (handshake.ts)     | → identisch wiederverwendet                                     |
| Scope-Gate (scope.ts)                   | → erweitert um MDF-Concept                                      |
| Multi-Tenant Organization-Model         | → erweitert um AUTHORITY org-type                               |
| Astra-AI Engine                         | → wiederverwendet, eigene Tool-Definitionen                     |
| Sovereign-AI Routing (Path A)           | → MANDATORY für Pharos (nie direct-US)                          |
| EU AI Act + DSGVO Compliance            | → erweitert um Behörden-Sonderregeln                            |

### 1.4 Bewusste Trade-offs

- **Konsistenz vor Geschwindigkeit:** wir replizieren Atlas-Patterns überall, auch wenn Pharos-spezifische Lösungen marginal eleganter wären. Das macht Code-Maintenance über 3 Pillars überschaubar.
- **Server-side Sovereign-AI only:** kein Fallback auf US-Direct für Pharos. Wenn EU-Bedrock mal down ist → Service degradiert auf "kein AI", nicht auf "AI aus USA". DSGVO + Behörden-Compliance verlangt das.
- **Operator-Sichtbarkeit explizit:** jeder Behörden-Zugriff ist im Operator-Caelex sichtbar. Keine "stealth queries". Vertrauen über Symmetrie.

---

## 2. Glossar

| Begriff                              | Bedeutung                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **AUTHORITY**                        | Neuer OrganizationType — Behörde / Aufsichtsstelle                                                     |
| **Aufsicht**                         | Regulatorische Beaufsichtigung (vs. anwaltliche Beratung im Mandat)                                    |
| **Oversight Handshake**              | Beidseitige Aufsicht-Beziehungs-Initiierung (Pharos-Variante des Mandat-Handshakes)                    |
| **MDF — Mandatory Disclosure Floor** | Nicht-verhandelbares Minimum was Operator Behörde offenlegen MUSS (per Gesetz)                         |
| **VDF — Voluntary Disclosure Floor** | Zusätzliche freiwillige Offenlegung über das MDF hinaus                                                |
| **Submission**                       | Strukturierter Antrag/Dossier vom Operator an Behörde (z.B. BWRG-Erlaubnis-Antrag)                     |
| **Bescheid**                         | Behörden-Entscheidung zu einer Submission (Genehmigung / Auflagen / Ablehnung)                         |
| **Section Review**                   | Behörden-Mitarbeiter prüft eine spezifische Section eines Submissions (status: OK / QUESTION / REJECT) |
| **Cross-Authority Bridge**           | Authority A sieht Authority B's Submission-Decision für selben Operator (mit Consent)                  |
| **Public Attestation**               | Kryptografisch signierte Compliance-Bescheinigung die Operator publik machen kann                      |
| **Verity-Layer**                     | Existierendes Caelex-Modul für signierte Compliance-Zertifikate (wiederverwendet)                      |

---

## 3. User-Personas

### 3.1 Eva — BAFA Sachbearbeiterin Dual-Use

- Bearbeitet Export-Genehmigungen für Dual-Use-Güter
- Heute: 200-Seiten-PDF-Anträge, 8 Wochen Bearbeitung, viel Email
- Mit Pharos: strukturierte Submissions, Live-Operator-Compliance-Sicht, AI-Vorprüfung → 2 Wochen
- Pain-Points: Operator-Inkonsistenzen erkennen, Genehmigungs-Auflagen drafte, Cross-Check mit US-Behörden (für ITAR)

### 3.2 Markus — BNetzA Spektrum-Officer

- Koordiniert Frequenz-Anmeldungen, ITU-Filings für Satellite-Operators
- Heute: ITU SpaceCap-Tool + Excel + Email
- Mit Pharos: ITU-Filing direkt aus Operator-Caelex, automatischer Konflikt-Check, Submission-Inbox
- Pain-Points: Konflikte zwischen Operator-Antragen erkennen (zwei Operatoren wollen selbe Frequenz)

### 3.3 Dr. Schmidt — BMWK Inspektor BWRG

- Aufsicht über § 5 BWRG-Erlaubnisinhaber (deutsche Satelliten-Operatoren)
- Heute: jährliche Berichte als PDF, ad-hoc Anfragen per Email
- Mit Pharos: Live-Compliance-Heatmap aller 47 deutschen Operatoren, automatische Drift-Erkennung
- Pain-Points: Compliance-Drift erkennen, Sanktions-Workflows, Cross-Border-Eskalation

### 3.4 Frau Weber — BSI Auditor NIS2 KRITIS

- NIS2-Aufsicht für Sektor "Raumfahrt" (kritische Infrastruktur)
- Heute: jährliche NIS2-Audits, Incident-Reports manuell aggregiert
- Mit Pharos: Live-Cyber-Compliance, Anomalie-Detection im Operator-Pool, Incident-Pipeline strukturiert
- Pain-Points: Sektor-weite Trends erkennen, gemeinsame Bedrohungen, Incident-Response-Koordination

### 3.5 Hauptmann Berger — BMVg Procurement-Officer

- Procurement von Space-Capabilities (SatCom, EO, SAR) für die Bundeswehr
- Heute: Ausschreibungs-Verfahren, Lieferanten-Compliance manuell verifizieren
- Mit Pharos: Live-Compliance-Status der Lieferanten, automatisches Compliance-Evidence-Paket für Vergabe-Akte
- Pain-Points: Vendor-Compliance über Vertragslaufzeit verfolgen, Defense-Sicherheits-Anforderungen prüfen

---

## 4. Core Concepts

### 4.1 Authority Org-Type

`OrganizationType` Enum bekommt 4. Variante:

```prisma
enum OrganizationType {
  OPERATOR    // existing — Satelliten-Betreiber, Launch, Services
  LAW_FIRM    // existing — Kanzleien (Atlas)
  AUTHORITY   // NEW — Behörden, Aufsichtsstellen
  BOTH        // existing — Org die OPERATOR + LAW_FIRM ist (selten)
}
```

**Implikationen:**

- AUTHORITY-Orgs können keine Mandate als Operator haben
- AUTHORITY-Orgs können keine Mandate als LawFirm haben
- AUTHORITY-Orgs können nur Oversight-Relationships haben (siehe § 4.3)
- AUTHORITY-Orgs haben einen verknüpften `AuthorityProfile` mit Behörden-Spezifika

### 4.2 AuthorityProfile (1:1 zu Organization)

```prisma
model AuthorityProfile {
  id              String  @id @default(cuid())
  organizationId  String  @unique

  jurisdiction    String  // ISO-Country: "DE", "FR", "EU", "NATO"
  authorityType   AuthorityType

  // Welche Scope-Kategorien beaufsichtigt diese Behörde?
  // z.B. BNetzA: ["SPECTRUM"], BSI: ["INCIDENTS","COMPLIANCE_ASSESSMENTS"]
  oversightCategories ScopeCategory[]

  // Public-Attestation Signing-Key (Phase P4)
  publicSigningKey String?  // base64 ed25519 public key

  // Behörden-Kontakt (publik, da Behörden in Pharos öffentlich auffindbar)
  contactEmail    String
  publicWebsite   String?
  legalReference  String?  // z.B. "§ 5 BWRG i.V.m. § 1 RfPlanV"

  createdAt       DateTime @default(now())
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([authorityType])
  @@index([jurisdiction])
}

enum AuthorityType {
  BAFA              // Bundesamt für Wirtschaft und Ausfuhrkontrolle
  BNETZA            // Bundesnetzagentur
  BMWK              // Bundesministerium für Wirtschaft und Klimaschutz
  BMVG              // Bundesministerium der Verteidigung
  BSI               // Bundesamt für Sicherheit in der Informationstechnik
  BAFIN             // Bundesanstalt für Finanzdienstleistungsaufsicht
  ESA_LIAISON       // ESA Member-State Liaison
  EU_COMMISSION     // EU DG DEFIS / DG GROW / DG CNECT
  NATO_NCIA         // NATO Communications and Information Agency
  EU_MEMBER_STATE   // andere EU-MS Behörden generisch
  OTHER             // catch-all
}
```

**Warum AuthorityProfile separates Model:**

- Behörden sind nicht "Operatoren mit anderem Type" — sie haben fundamental andere Daten (Aufsichts-Kategorien, Signing-Keys, legal references)
- Sauberer als Boolean-Flags auf Organization
- Erlaubt zukünftige Behörden-spezifische Felder (z.B. AWS-account-id für eigene Sovereign-Tenancy)

### 4.3 Oversight Handshake

**Variante des Mandat-Handshakes** (matter-service.ts) für Behörden-Operator-Beziehungen.

**Unterschiede zum Mandat:**

| Aspekt                    | Mandat (Atlas)                       | Oversight (Pharos)                                             |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| **Initiator**             | Operator ODER LawFirm                | nur AUTHORITY                                                  |
| **Scope-Verhandlung**     | frei beidseitig verhandelbar         | MDF nicht verhandelbar                                         |
| **Operator-Reject-Recht** | Vollständig (kann komplett ablehnen) | Begrenzt — kann nur außerhalb der MDF reject                   |
| **Status-Lifecycle**      | PENDING → ACTIVE → REVOKED/CLOSED    | gleicher Lifecycle, plus DISPUTED                              |
| **Ende durch**            | beide Parteien                       | nur Authority (Operator kann widersprechen aber nicht beenden) |
| **Audit-Chain**           | hash-chain im LegalMatter            | hash-chain im OversightRelationship                            |

**Schema:**

```prisma
model OversightRelationship {
  id                String  @id @default(cuid())

  authorityOrgId    String
  operatorOrgId     String

  // Scope-Definition
  // mandatoryDisclosure = MDF: was ist gesetzlich vorgeschrieben
  mandatoryDisclosure Json   // Array<ScopeItem> (read-only für Operator)
  // voluntaryDisclosure = was Operator zusätzlich freigibt
  voluntaryDisclosure Json   // Array<ScopeItem> (kann Operator amenden)

  // Legal Basis — warum darf diese Behörde überwachen?
  legalReference    String   // z.B. "§ 5 BWRG", "NIS2 Art. 32"
  oversightTitle    String   // human-readable: "BWRG-Aufsicht 2026"
  oversightReference String? // Behörden-Aktenzeichen

  // Status
  status            OversightStatus

  // Lifecycle
  initiatedBy       String   // userId (authority-side)
  initiatedAt       DateTime @default(now())
  acceptedAt        DateTime?
  acceptedBy        String?  // userId (operator-side)
  endedAt           DateTime?
  endedBy           String?
  endReason         String?

  // Conflict / Dispute
  disputedAt        DateTime?
  disputeReason     String?

  // Hash-chain root (sha256 of canonical handshake bundle)
  handshakeHash     String

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  authorityOrg      Organization @relation("OversightAuthority", fields: [authorityOrgId], references: [id])
  operatorOrg       Organization @relation("OversightOperator", fields: [operatorOrgId], references: [id])

  accessLogs        OversightAccessLog[]
  submissions       RegulatorySubmission[]

  @@unique([authorityOrgId, operatorOrgId, oversightReference])
  @@index([authorityOrgId, status])
  @@index([operatorOrgId, status])
}

enum OversightStatus {
  PENDING_OPERATOR_ACCEPT  // Behörde hat initiiert, Operator muss MDF akzeptieren + ggf. VDF amenden
  ACTIVE                   // Aufsicht läuft
  SUSPENDED                // temporär pausiert (Behörde-side, z.B. ruhendes Verfahren)
  CLOSED                   // normal beendet (z.B. Frist abgelaufen, Sektor-Wechsel)
  REVOKED                  // außerordentlich beendet (Lizenz entzogen, Misuse)
  DISPUTED                 // Operator widerspricht der MDF (Eskalations-Pfad)
}
```

**Warum nicht einfach LegalMatter wiederverwenden?**

- LegalMatter hat `lawFirmOrgId` + `clientOrgId` semantisch
- Verwendung als Authority-Operator wäre semantisch verwirrend
- Felder wie `mandatoryDisclosure` machen für Mandat-Handshake keinen Sinn
- Sauberer ein eigenes Modell — Code-Duplikation marginal weil Helpers (Scope, Hash-Chain) wiederverwendet werden

### 4.4 RegulatorySubmission (Antrag/Dossier)

Die zentrale Daten-Einheit der Behörden-Arbeit. Eine Submission ist ein **strukturierter Antrag** vom Operator an Behörde.

```prisma
model RegulatorySubmission {
  id                      String  @id @default(cuid())
  oversightRelationshipId String

  submissionType          SubmissionType
  title                   String
  description             String?
  reference               String?    // Operator-internal reference, e.g. "EXP-2026-042"

  status                  SubmissionStatus

  // Strukturierter Inhalt — Schema variiert per submissionType
  // (Zod-Schemas pro Type in src/lib/pharos/submission-schemas/*)
  payload                 Json

  // Authority response
  decision                Json?     // Bescheid-Inhalt
  decisionType            DecisionType?
  decisionAt              DateTime?
  decisionBy              String?   // authority userId

  // Lifecycle
  submittedBy             String?   // operator userId
  submittedAt             DateTime?
  withdrawnAt             DateTime?

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  oversightRelationship   OversightRelationship @relation(fields: [oversightRelationshipId], references: [id], onDelete: Cascade)
  attachments             SubmissionAttachment[]
  reviews                 SubmissionReview[]

  @@index([oversightRelationshipId, status])
  @@index([status, submittedAt])
}

enum SubmissionType {
  EXPORT_LICENSE         // BAFA: Dual-Use export
  ITU_FILING             // BNetzA: Spektrum
  BWRG_ERLAUBNIS         // BMWK: Weltraumtätigkeitsgesetz
  NIS2_AUDIT             // BSI: NIS2-Compliance
  INCIDENT_REPORT        // BSI: NIS2-Incident
  PROCUREMENT_EVIDENCE   // BMVg: Vergabe-Compliance-Paket
  CHANGE_NOTIFICATION    // generic: "wir haben uns geändert"
  ANNUAL_REPORT          // generic
  OTHER
}

enum SubmissionStatus {
  DRAFT          // Operator-side WIP
  SUBMITTED      // an Behörde gegangen
  IN_REVIEW      // Behörde prüft aktiv
  CLARIFICATION  // Behörde hat Rückfrage gestellt
  APPROVED       // Bescheid: Genehmigung
  CONDITIONAL    // Bescheid: Genehmigung mit Auflagen
  REJECTED       // Bescheid: Ablehnung
  WITHDRAWN      // Operator hat zurückgezogen
  EXPIRED        // Frist verstrichen
}

enum DecisionType {
  APPROVAL             // unconditional yes
  CONDITIONAL_APPROVAL // yes mit Auflagen
  REJECTION            // no
  REFERRAL             // weitergeleitet an andere Behörde
}
```

### 4.5 SubmissionReview (Section-by-Section)

Behörden-Mitarbeiter reviewen einen Antrag **section-by-section**. Jeder Review ist eine eigene Datenbank-Zeile (audit-trail).

```prisma
model SubmissionReview {
  id              String  @id @default(cuid())
  submissionId    String

  reviewerId      String  // authority userId
  sectionKey      String  // z.B. "applicant_info", "intended_use", "destination_country"

  status          SectionReviewStatus
  comment         String?

  reviewedAt      DateTime @default(now())

  submission      RegulatorySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@index([submissionId, sectionKey])
  @@index([reviewerId, reviewedAt])
}

enum SectionReviewStatus {
  OK              // Section-Inhalt akzeptiert
  QUESTION        // Behörde hat Rückfrage
  REJECT          // Section-Inhalt unzulässig
  PENDING         // noch nicht reviewed (Default beim Open)
}
```

### 4.6 Mandatory Disclosure Floor (MDF) — Detailed

Das ist das **konzeptuelle Kernstück** das Pharos von Atlas unterscheidet.

**Im Mandat (Atlas):** Operator und Anwalt verhandeln vollständig den Scope. Operator kann sagen "ich gebe dir nur DOCUMENTS Read, nicht TIMELINE". Der Anwalt akzeptiert oder verhandelt nach.

**In der Aufsicht (Pharos):** Bestimmte Daten **MUSS** der Operator offenlegen — das ist gesetzlich vorgegeben. Das ist die MDF. Operator kann darüber hinaus freiwillig mehr offenlegen (VDF), aber nicht weniger als MDF.

**Konkrete Beispiele:**

| Behörde | Gesetz            | MDF-Items                                                                 |
| ------- | ----------------- | ------------------------------------------------------------------------- |
| BAFA    | AWG/AWV           | Empfänger-Land, Endverwendung, Empfänger-Identität, Güter-Klassifizierung |
| BNetzA  | TKG, ITU          | Frequenz-Anmeldung, Bahn-Parameter, Sende-Leistung, Footprint             |
| BMWK    | BWRG § 5          | Versicherungs-Nachweis, Bahn-Daten, Mission-Beschreibung, Risiko-Analyse  |
| BSI     | NIS2 Art. 23-25   | Incident-Reports innerhalb 24h/72h, Cyber-Maßnahmen-Dokumentation         |
| BMVg    | Geheimschutz, VgV | Compliance-Status, Lieferanten-Hierarchie, Mission-Payload-Spezifikation  |

**Schema:**

Die MDF ist als JSON-Array von ScopeItems im OversightRelationship gespeichert. Sie wird von Authority-Side bei Initiation gesetzt (Behörde definiert was sie braucht), Operator kann nicht reduzieren.

```typescript
// Beispiel mandatoryDisclosure für BAFA-Aufsicht:
[
  {
    category: "DOCUMENTS",
    permissions: ["READ"],
    submissionTypes: ["EXPORT_LICENSE"], // nur für Export-Anträge
  },
  {
    category: "COMPLIANCE_ASSESSMENTS",
    permissions: ["READ_SUMMARY"],
    submissionTypes: ["EXPORT_LICENSE", "PROCUREMENT_EVIDENCE"],
  },
][
  // Operator kann in voluntaryDisclosure ergänzen:
  {
    category: "TIMELINE_DEADLINES",
    permissions: ["READ_SUMMARY"], // freiwillig: "schau dir an wann meine Lieferungen sind"
  }
];
```

**Validation-Logik:**

- Bei Operator-Accept: MDF wird IMMER aktiviert (kein opt-out möglich)
- Operator kann die VDF in Acceptance-Form anpassen
- Operator-Status nach Accept: ACTIVE
- Wenn Operator MDF "ablehnt" (technisch: kann sie nicht ablehnen) → Status DISPUTED
- DISPUTED triggert Eskalation: Behörde kann Sanktionen verhängen, Operator kann gerichtlich vorgehen

### 4.7 Cross-Authority Bridge

Eine Satelliten-Firma wird von 4-6 Behörden gleichzeitig reguliert. Heute: jede Behörde silo'd. Pharos: kontrollierte Cross-Sicht.

**Drei Modi:**

#### Modus 1 — Operator-Initiated Cross-Disclosure

Operator entscheidet aktiv: _"BAFA, ich gebe dir Read auf meine BNetzA-ITU-Filings."_

- UI-Action im Operator-Caelex: pro OversightRelationship → "andere Behörde X darf das auch sehen"
- Authority B sieht in ihrem Pharos-Workspace: "Operator XYZ hat dir Sicht auf seine Aufsicht-bei-A gegeben"
- Audit: Cross-Disclosure-Eintrag in beiden Authority-Logs

#### Modus 2 — Mutual Recognition Framework

Behörden-zu-Behörden-Vereinbarung: _"Wenn BAFA OK gegeben hat, akzeptieren wir das automatisch."_

- Konfiguriert auf Authority-Profile-Ebene
- Per Submission-Type definiert (z.B. "Export-Genehmigungen werden mutual recognized")
- Operator profitiert: kein Doppel-Antrag bei verwandten Behörden
- Risiko: Behörden müssen einander vertrauen

#### Modus 3 — EU-Cross-Border (für EU-MS-Behörden)

Eine deutsche Operator-Firma die in Luxemburg auch reguliert wird → beide Authorities sehen sich gegenseitig.

- Federation-Architektur: jeder MS hat eigene Pharos-Instanz
- Cross-MS Permissions definiert per EU-Verordnung (z.B. NIS2 Art. 32 Cooperation)
- Implementation: Phase P3+ (komplex)

### 4.8 Public Attestation (Phase P4)

Operator möchte sein Compliance-Status öffentlich machen (für Investoren, Kunden, Versicherer).

**Flow:**

1. Operator triggert: "Erstelle mir eine Public Attestation für meinen aktuellen Compliance-Status"
2. Behörden die Operator beaufsichtigen werden gefragt: "Stimme der signierten Attestation zu?"
3. Behörde reviewed (manuell oder per AI), signiert kryptografisch (ed25519)
4. Operator bekommt JSON Web Signature (JWS) zurück
5. Operator kann die JWS auf eigene Website hosten
6. Jeder Dritte kann mit Behörden-Public-Key (publik) die Signatur verifizieren

**Schema (Phase P4):**

```prisma
model PublicAttestation {
  id              String  @id @default(cuid())
  operatorOrgId   String

  // Welche Behörden haben mit-signiert?
  signatures      AttestationSignature[]

  // Kanonisierter Attestation-Inhalt (was wird attestiert)
  payload         Json    // {"compliantWith": ["BWRG", "NIS2"], "asOf": "2026-04-25"}
  payloadHash     String  // sha256 of canonical JSON

  validFrom       DateTime
  validUntil      DateTime
  revokedAt       DateTime?

  createdAt       DateTime @default(now())

  operator        Organization @relation(fields: [operatorOrgId], references: [id])

  @@index([operatorOrgId, validFrom])
}

model AttestationSignature {
  id                String  @id @default(cuid())
  attestationId     String
  authorityOrgId    String

  signature         String  // base64 ed25519 sig
  signedAt          DateTime
  signerId          String  // authority userId

  attestation       PublicAttestation @relation(fields: [attestationId], references: [id], onDelete: Cascade)
}
```

---

## 5. Komplette Schema-Erweiterungen

Alle neuen Models in einem Block (für Migration-Planning):

```prisma
// 1. Organization-Erweiterung (existing)
enum OrganizationType {
  OPERATOR
  LAW_FIRM
  AUTHORITY      // NEW
  BOTH
}

// 2. Neue Models für Pharos
model AuthorityProfile { ... }       // siehe § 4.2
model OversightRelationship { ... }  // siehe § 4.3
model OversightAccessLog { ... }     // wie LegalMatterAccessLog, hash-chain
model RegulatorySubmission { ... }   // siehe § 4.4
model SubmissionReview { ... }       // siehe § 4.5
model SubmissionAttachment { ... }   // joins Submission ↔ Document
model PublicAttestation { ... }      // Phase P4 (siehe § 4.8)
model AttestationSignature { ... }   // Phase P4

// 3. Neue Enums
enum AuthorityType { ... }
enum OversightStatus { ... }
enum SubmissionType { ... }
enum SubmissionStatus { ... }
enum SectionReviewStatus { ... }
enum DecisionType { ... }
```

**Migration-Reihenfolge (idempotent):**

1. Migration `20260501000000_add_authority_org_type` — extends OrganizationType enum
2. Migration `20260501000001_add_authority_profile` — AuthorityProfile model
3. Migration `20260501000002_add_oversight_models` — OversightRelationship + OversightAccessLog
4. Migration `20260501000003_add_submissions` — RegulatorySubmission + SubmissionReview + SubmissionAttachment
5. Migration `20260501000004_add_public_attestations` — Phase P4

Alle idempotent (CREATE IF NOT EXISTS, EXCEPTION duplicate_object). Pattern wie schon dokumentiert in PHAROS-VISION § "Was wir schon haben".

---

## 6. API Surface

### 6.1 Authority Self-Service

```
POST   /api/pharos/authority/profile        — create/update AuthorityProfile
GET    /api/pharos/authority/profile        — read
PATCH  /api/pharos/authority/profile        — update jurisdiction, contact, etc.
```

### 6.2 Operator Roster (Authority-side)

```
GET    /api/pharos/operators                — list operators in authority's
                                              jurisdiction with active oversight
GET    /api/pharos/operators/[id]           — operator detail (compliance heatmap)
GET    /api/pharos/operators/[id]/timeline  — recent activity (filtered to MDF)
```

### 6.3 Oversight Lifecycle

```
POST   /api/pharos/oversight                — Authority initiates oversight
                                              { operatorOrgId, mandatoryDisclosure,
                                                legalReference, title }
GET    /api/pharos/oversight                — list authority's oversights
GET    /api/pharos/oversight/[id]           — detail
POST   /api/pharos/oversight/[id]/end       — end oversight (authority-only)
POST   /api/pharos/oversight/[id]/dispute   — dispute lifecycle event

POST   /api/network/oversight/accept        — Operator accepts oversight invite
                                              { token, voluntaryDisclosure }
GET    /api/network/oversight/preview       — preview before accept
                                              ?token=xxx
```

### 6.4 Submission Lifecycle

```
POST   /api/pharos/submissions              — Operator creates submission
                                              (status: DRAFT)
GET    /api/pharos/submissions              — list (filtered by caller-type)
GET    /api/pharos/submissions/[id]         — detail (with permissions check)
PATCH  /api/pharos/submissions/[id]         — update payload (DRAFT only)
POST   /api/pharos/submissions/[id]/submit  — Operator submits (DRAFT → SUBMITTED)
POST   /api/pharos/submissions/[id]/withdraw — Operator withdraws

POST   /api/pharos/submissions/[id]/review  — Authority reviews a section
                                              { sectionKey, status, comment }
POST   /api/pharos/submissions/[id]/decision — Authority issues Bescheid
                                              { decisionType, payload }
```

### 6.5 Cross-Authority

```
POST   /api/pharos/cross-disclosure        — Operator grants Authority B
                                              read on Authority A oversight
GET    /api/pharos/cross-references/[opId] — list of cross-disclosures
                                              involving operator
POST   /api/pharos/mutual-recognition       — Configure recognition policy
                                              (Authority-side, admin only)
```

### 6.6 Pharos-AI

```
POST   /api/pharos/ai/chat                  — Pharos-Astra streaming chat
                                              (similar to /api/atlas/ai-chat)
POST   /api/pharos/ai/screen-submission     — auto-prescreen submission
POST   /api/pharos/ai/anomaly-scan          — find anomalies in operator pool
POST   /api/pharos/ai/draft-bescheid        — generate Bescheid template
```

### 6.7 Audit (cross-cutting)

```
GET    /api/pharos/audit                   — Authority's own audit log
GET    /api/network/oversight/[id]/access-log — bilateral audit (both sides)
```

### 6.8 Public Attestations (Phase P4)

```
POST   /api/pharos/attestations            — Operator creates attestation request
POST   /api/pharos/attestations/[id]/sign  — Authority signs
GET    /api/public/attestations/[id]       — public verification endpoint
GET    /api/public/attestations/[id]/verify — JWS verification details
```

---

## 7. Frontend-Pages

### 7.1 Authority-side (`/pharos/*`)

#### `/pharos` — Authority Dashboard

Layout: ähnlich Caelex-Dashboard aber Authority-fokussiert.

```
┌──────────────────────────────────────────────────────────┐
│ KPIs:                                                    │
│  47 Operatoren  │  3 Anträge offen │  2 Anomalien        │
├──────────────────────────────────────────────────────────┤
│ Inbox (neue Submissions seit gestern)                    │
│  • [BWRG] Rocket Inc. — Erstantrag (heute 14:30)         │
│  • [Export] Planet Labs — Genehmigung verlängern (Mo)    │
├──────────────────────────────────────────────────────────┤
│ Compliance-Heatmap (47 Operators × Categories)           │
│  [Visualization mit grün/gelb/rot-Tiles]                 │
├──────────────────────────────────────────────────────────┤
│ Pharos-AI Quick-Actions                                  │
│  [Anomalien scannen] [Wochenbericht] [Submission prüfen] │
└──────────────────────────────────────────────────────────┘
```

#### `/pharos/operators` — Operator Roster

Tabelle aller Operatoren im Aufsichtsbereich:

| Operator    | Status   | Compliance     | Last Activity | Action |
| ----------- | -------- | -------------- | ------------- | ------ |
| Rocket Inc. | ACTIVE   | 87% (gelb)     | 2h ago        | →      |
| Planet Labs | ACTIVE   | 95% (grün)     | 1d ago        | →      |
| Constellr   | DISPUTED | n/a (Konflikt) | 4d ago        | →      |

Mit Filter / Search / Bulk-Aktionen.

#### `/pharos/operators/[id]` — Operator Detail

Vollständige Sicht (gefiltert auf MDF + VDF):

- Compliance-Status pro Kategorie
- Recent Submissions
- Recent Activity Timeline
- Pharos-AI Insights ("dieser Operator weicht von Sektor-Mean ab in X")
- Per-Section Drill-Down

#### `/pharos/submissions` — Submission Inbox

Liste aller Submissions an diese Behörde:

- Filter: status, type, date, operator
- Bulk-actions: assign reviewer, change status

#### `/pharos/submissions/[id]` — Review Interface

Section-by-section Review:

```
┌──────────────────────────────────────────────────────────┐
│ BWRG-Erlaubnis-Antrag · Rocket Inc.                     │
│ Submitted: 25.04.2026 14:30                              │
│ Status: IN_REVIEW                                        │
├──────────────────────────────────────────────────────────┤
│ Sections                                                 │
│  ▶ Antragsteller-Identifikation     [✓ OK · 5min]       │
│  ▶ Mission-Beschreibung             [? QUESTION · 12m]   │
│  ▶ Versicherungs-Nachweis           [✓ OK · 3min]       │
│  ▶ Bahn-Parameter                   [✗ REJECT · 8min]   │
│  ▶ Risiko-Analyse                   [─ PENDING]         │
├──────────────────────────────────────────────────────────┤
│ Pharos-AI Vorprüfung                                     │
│  ⚠ Inkonsistenz: Operator behauptet Insurance €100M,     │
│    in Caelex hinterlegt €50M                             │
├──────────────────────────────────────────────────────────┤
│ Decision Drafting                                        │
│  [Genehmigung] [Auflagen] [Ablehnung]                   │
│  ☐ AI-Draft generieren                                   │
└──────────────────────────────────────────────────────────┘
```

#### `/pharos/coordination` — Cross-Authority Hub (Phase P3)

Liste aller Cross-Disclosures + Mutual-Recognition-Settings.

#### `/pharos/policies` — Aufsichtsbereich

Konfiguration was diese Behörde tatsächlich beaufsichtigt:

- jurisdiction
- oversightCategories
- Default-MDF-Templates pro Submission-Type

#### `/pharos/audit` — Authority Audit Log

Liste aller Aktivitäten von Behörden-Mitarbeitern (intern):

- Wer hat welche Operator-Daten gesehen
- Wer hat welche Submissions reviewed
- Audit-Trail für interne Kontrolle (Compliance-Officer der Behörde)

### 7.2 Operator-side Erweiterungen (`/dashboard/network/oversight/*`)

#### `/dashboard/network/oversight` — Oversight List

Liste aller Behörden die Operator beaufsichtigen:

- Status (Active, Pending Accept, Disputed)
- Per-Authority Submissions
- Aufsicht-Reference

#### `/dashboard/network/oversight/[id]` — Oversight Detail

- MDF (was MUSS Behörde sehen) — read-only
- VDF (was zusätzlich freigegeben) — editable
- Behörden-Aktivität (audit-trail von Behörden-Zugriffen)
- Cross-Disclosure-Settings ("BAFA darf BNetzA-Dossier sehen")

#### `/dashboard/submissions` — Submissions

Liste aller Anträge des Operators:

- Filter per Behörde, Status, Typ
- Submit-new flow

#### `/network/pharos-accept/[token]` — Oversight Accept Flow

Analog zu `/network/accept/[token]` (Atlas), aber:

- MDF-Sektion ist nicht-editierbar markiert (mit Erklärung warum)
- VDF-Sektion ist optional erweiterbar
- Klare Reject-Pfade: "Ablehnen" wird zu "Disputieren" mit Eskalations-Hinweis

### 7.3 Atlas-side Erweiterung (Anwalt sieht Behörden-Sicht)

Anwalt braucht potentiell Visibility auf Behörden-Aktivität im Mandat:

#### `/atlas/network/[matterId]/oversights`

Im Matter-Workspace eine neue Sektion: "Behörden die diesen Mandanten beaufsichtigen". Anwalt kann je nach Matter-Scope sehen:

- welche Behörden im Spiel sind
- welche Submissions laufen
- aktuelle Bescheide

Hilft dem Anwalt, Beratung zu kontextualisieren ("wenn BNetzA noch nicht entschieden hat, sollten wir nicht launchen").

---

## 8. AI Tools — Pharos-Astra

System-Prompt für Pharos-AI sitzt parallel zu Atlas-System-Prompt aber mit Behörden-Frame:

```
Du bist Pharos, ein KI-Assistent für Behörden-Mitarbeiter im Aufsichtsbereich
{authorityType}. Du hilfst bei der Bewertung von Operator-Submissions, der
Erkennung von Compliance-Anomalien und dem Drafting von Bescheiden.

WICHTIG:
- Du bist ein Hilfsmittel — die Entscheidung trifft immer der Mensch
- Halluziniere nie Behörden-Akten oder Operator-Identitäten
- Wenn Daten fehlen: sag das klar
- Cite immer den Rechtsgrund deiner Aussagen
- Bevorzuge konservative Auslegung bei Unsicherheit
```

### 8.1 Tool: `screen_operator_submission`

```typescript
{
  input: { submissionId: string },
  output: {
    completeness: { complete: boolean, missing: string[] },
    consistency: { consistent: boolean, conflicts: Array<{ section, found, expected }> },
    redFlags: string[],
    recommendation: "fast-track" | "standard-review" | "deep-investigation"
  }
}
```

Cross-checked against operator's Caelex-data (within MDF/VDF).

### 8.2 Tool: `find_pattern_anomalies`

```typescript
{
  input: { authority: string, period: "7d" | "30d" | "quarter", scope: ScopeCategory[] },
  output: {
    anomalies: Array<{
      operatorId,
      operatorName,
      anomalyType: "outlier" | "drift" | "missing-required" | "cluster",
      detail: string,
      severity: "info" | "warning" | "alert"
    }>
  }
}
```

Run as cron-job nightly + on-demand.

### 8.3 Tool: `cross_reference_disclosures`

```typescript
{
  input: { operatorId: string, scope?: ScopeCategory[] },
  output: {
    inconsistencies: Array<{
      authorityA, dataPointA,
      authorityB, dataPointB,
      conflict: string
    }>
  }
}
```

Operator hat z.B. an BAFA gesagt "Insurance €100M", an BMWK "€50M" — wird hier erkannt.

### 8.4 Tool: `draft_genehmigungsbescheid`

```typescript
{
  input: {
    submissionId: string,
    decisionType: "APPROVAL" | "CONDITIONAL_APPROVAL" | "REJECTION",
    keyFacts: string[]
  },
  output: {
    draft: string,           // Markdown formatted Bescheid
    citationsUsed: string[],
    auflage_suggestions?: string[]
  }
}
```

Authority-Mitarbeiter editiert + signiert.

### 8.5 Tool: `regulatory_horizon_scan`

```typescript
{
  input: { jurisdiction: string, scope: ScopeCategory[], horizon: "30d" | "90d" | "180d" },
  output: {
    upcoming: Array<{
      title,                 // "NIS2 Audit Deadline 2026"
      date,
      affectedOperators,     // count or list
      requiredAction
    }>
  }
}
```

Hilft Behörden, ihre eigene Roadmap zu planen.

### 8.6 Tool: `simulate_policy_impact`

```typescript
{
  input: {
    policyChange: string,    // "Senke NIS2-Schwelle von 250 auf 100 Mitarbeiter"
    affectedScope: ScopeCategory[]
  },
  output: {
    affectedOperators: number,
    estimatedComplianceCost: { min, max, currency },
    sectorBreakdown: Array<{ category, count }>
  }
}
```

Policy-Maker-Tool — was bringt eine Regulierungs-Änderung?

---

## 9. End-to-End User-Flows

### 9.1 Flow A — Behörde initiiert neue Aufsicht

1. **BAFA-Mitarbeiter Eva** öffnet Pharos
2. Klick "Neue Aufsicht initiieren" → Operator-Suche
3. Operator gewählt (Rocket Inc.)
4. MDF wählen (Eva pickt aus AWG-§-Templates)
5. Pharos generiert Token + sendet E-Mail an Operator-Compliance-Officer
6. **Operator (Markus, CCO)** öffnet `/network/pharos-accept/[token]` in Caelex
7. Sieht MDF (read-only), kann VDF amenden
8. Click "Akzeptieren" → OversightRelationship.status = ACTIVE
9. Pharos updated bei Eva: "Rocket Inc. ist jetzt aktiv unter Aufsicht"
10. Hash-Chain Audit-Log Entry: "MDF + VDF + signed at T"

### 9.2 Flow B — Operator submitted Antrag

1. **Markus (Rocket Inc.)** öffnet Caelex-Dashboard → Submissions
2. Click "Neuer Antrag" → SubmissionType = EXPORT_LICENSE
3. Strukturiertes Form (per Submission-Type) ausgefüllt
4. Documents aus Vault als Attachments verlinken
5. Click "Submit" → Submission.status = SUBMITTED, Notification an BAFA
6. **Eva (BAFA)** sieht in `/pharos/submissions` neuen Eintrag
7. Click → Review-Interface
8. Pharos-AI hat Vorprüfung gemacht: inkonsistenz-flag bei Section "intended_use"
9. Eva markiert Section "intended_use" als QUESTION + Comment
10. Submission.status = CLARIFICATION → Markus bekommt Notification
11. Markus updated Section, re-submits → Submission.status = IN_REVIEW
12. Eva approved nun Section, alle anderen Sections auch OK
13. Eva clickt "Decision" → Pharos-AI draftet Bescheid → Eva ediert + bestätigt
14. Submission.status = APPROVED (oder CONDITIONAL_APPROVAL mit Auflagen)
15. Operator + Atlas-Anwalt (wenn vorhanden) bekommen Notification

### 9.3 Flow C — Cross-Authority Inconsistency

1. **Pharos-AI** läuft nightly cross_reference_disclosures()
2. Findet: Rocket Inc. hat an BAFA "Insurance €100M" angegeben, an BMWK "€50M"
3. Beide Authorities (BAFA, BMWK) bekommen Pharos-Notification
4. **Eva (BAFA)** + **Dr. Schmidt (BMWK)** sehen den Conflict in ihrem Dashboard
5. Eva initiiert Cross-Disclosure-Request: "Darf BMWK BAFA's Antragsdaten sehen?"
6. **Markus (Operator)** bekommt Request → muss zustimmen
7. Markus ackt → BMWK kann BAFA's Antrag einsehen
8. Eva und Dr. Schmidt klären gemeinsam (oder eskalieren an Operator)

### 9.4 Flow D — Public Attestation (Phase P4)

1. **Markus (Rocket Inc.)** möchte für Investor-Pitch Compliance-Bescheinigung
2. `/dashboard/attestations/new` → wählt "Comprehensive Compliance"
3. Pharos requested Signaturen von BAFA + BMWK + BSI
4. Eva (BAFA) reviewed Antrag → signs (ed25519)
5. Dr. Schmidt (BMWK) signs
6. Frau Weber (BSI) signs
7. Markus bekommt Multi-Sig JWS
8. Hostet auf rocket-inc.de/compliance.json
9. Investor verifiziert mit Public-Keys (in /api/public/attestations/[id]/verify)

---

## 10. Bilateral / Trilateral Integration

Die Architektur fließt zusammen:

```
                Caelex (Operator)
                  ↕                ↕
        Atlas (Kanzlei)     Pharos (Behörde)

OPERATOR → LAW_FIRM Mandat-Handshake (existing)
OPERATOR → AUTHORITY Oversight-Handshake (NEW)
LAW_FIRM ↔ AUTHORITY no direct bridge (Anwalt sieht Behörden-Aktivität nur durch
                                       sein Mandat zum Operator)
```

**Wichtige Implikationen:**

1. **Anwalt hat Indirect-Visibility** auf Behörden-Aktivität. Wenn Mandat Scope COMPLIANCE_ASSESSMENTS umfasst, und Behörde reviewed Compliance-Submission, sieht Anwalt das im Matter-Audit-Log (weil im Operator-Caelex log'd).

2. **Cross-Tier Notifications** sind wichtig: Operator bekommt Alert wenn Anwalt UND Behörde gleichzeitig auf selbe Daten zugreifen — könnte legaler Konflikt sein (Anwaltsgeheimnis vs. Behördenpflicht).

3. **Dispute-Handling kann eskalieren** in den Mandat-Bereich: wenn Operator MDF disputiert, könnte Anwalt automatisch alarmiert werden ("Behörde X disputiert mit Mandant — soll ich dazu beraten?").

---

## 11. Implementation-Phasen

### Phase P0 — Pre-Pharos (DONE)

- ✅ Bilateral-Handshake-Architektur (Atlas)
- ✅ Hash-Chain Audit-Log
- ✅ Sovereign-AI Routing (Path A)
- ✅ Compliance-Foundation (P0/P1/P2 docs)

### Phase P1 — MVP Pharos (4-6 Wochen Code)

**Ziel:** Lighthouse-Behörde (BAFA oder BNetzA) onboardbar.

Build:

- [P1.1] Schema: AUTHORITY org-type + AuthorityProfile + OversightRelationship + OversightAccessLog (4 Migrations)
- [P1.2] API: Authority Self-Service + Operator Roster + Oversight Lifecycle (10 Routes)
- [P1.3] Frontend: `/pharos` (Dashboard, Operators, Operator-Detail) — read-heavy, kein Submission-flow yet
- [P1.4] Frontend: `/network/pharos-accept/[token]` (Operator-side accept)
- [P1.5] Frontend: `/dashboard/network/oversight/*` (Operator-side overview)
- [P1.6] Pharos-AI: 1 Tool (`screen_operator_submission`)
- [P1.7] Authority-side AI Disclosure Page (`/legal/pharos-ai-disclosure`)
- [P1.8] Tests: ≥30 unit tests across new surface
- [P1.9] Compliance docs update (DPA-Annex § 10b für Behörden-Sub-Processing)

**Out-of-scope für P1:**

- Submissions (read-only Pharos in P1, Operator-side submission-creation kommt P2)
- Cross-Authority Bridge
- Public Attestations
- Mutual Recognition

### Phase P2 — Submission Pipeline (8-12 Wochen)

Build:

- [P2.1] Schema: RegulatorySubmission + SubmissionReview + SubmissionAttachment
- [P2.2] API: Full Submission Lifecycle (8 Routes)
- [P2.3] Frontend: Submission Inbox + Review Interface
- [P2.4] Operator-side Submission-Creator (per SubmissionType Form)
- [P2.5] Pharos-AI Tools: anomaly-scan, draft-bescheid, regulatory-horizon
- [P2.6] Decision-Issuance flow (Bescheid generation + signing-prep)
- [P2.7] Cron-jobs: nightly anomaly scans, deadline reminders
- [P2.8] Tests: ≥40 additional tests

**Win:** Behörde kann komplette Antragspipeline durchlaufen, von Operator-Submit bis Bescheid-Issue.

### Phase P3 — Cross-Authority (14-20 Wochen)

Build:

- [P3.1] Cross-Disclosure-API + UI
- [P3.2] Mutual-Recognition-Framework
- [P3.3] Cross-Reference AI-Tool (cross_reference_disclosures)
- [P3.4] Federation-Architecture für EU-MS-Behörden

**Win:** 3-Behörden-Cluster (BAFA + BMWK + BSI) funktioniert mit kontrolliertem Data-Sharing.

### Phase P4 — Public Trust Layer (24+ Wochen)

Build:

- [P4.1] PublicAttestation + AttestationSignature schema
- [P4.2] Crypto-Signing-Module (ed25519, JWS)
- [P4.3] Public verification endpoint
- [P4.4] Operator UI für Attestation-Request
- [P4.5] Authority UI für Attestation-Sign
- [P4.6] Whistleblower-Channel (separater Trust-Layer)

**Win:** Operatoren können Compliance-Status verifizierbar publik machen.

---

## 12. Offene Entscheidungen (need polleschnerjulian-Input)

Diese Entscheidungen müssen GETROFFEN sein bevor Implementation-Phase P1 startet:

### D1 — Lighthouse-Behörde

Welche Behörde priorisieren wir für P1 Pilot?

| Kandidat   | Pro                                                                                          | Con                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **BAFA**   | Export-Genehmigungen sind formalisiert, klare Submission-Schemas, viele Operatoren betroffen | konservativer Auftritt, Vergabe-Cycle länger                              |
| **BNetzA** | ITU-Filings strukturiert, technische Receivers, gute Open-Data-Kultur                        | weniger Operator-Volumen pro Behörden-Mitarbeiter                         |
| **BSI**    | NIS2 zwingt sowieso Modernisierung, BSI hat Innovation-Budget, KRITIS-Fokus passt zu Caelex  | sehr scope-spezifisch (nur Cyber), schwerer in andere Module zu erweitern |

**Empfehlung:** **BAFA** — größter Operator-Fußabdruck, Submission-Patterns gut formalisiert, Innovation-Hunger nach Modernisierung der Antragspipeline.

### D2 — Geschäftsmodell

Welches der Modelle aus PHAROS-VISION § "Geschäftsmodell-Varianten"?

- A: Self-Build, direct-to-Behörde
- B: White-Label für GovTech-Integratoren
- C: Joint-Venture mit GovTech-Player
- D: Open-Source-Core + kommerzielles Hosting

**Empfehlung aus Vision-Doc:** **D + B** kombiniert. Aber Entscheidung treibt Architektur — Open-Source-Core erfordert anderen Code-Style (klare APIs, weniger interne Magic, mehr Doku).

### D3 — Förder-Antrag-Strategie

Welches Programm?

- **EU Horizon Europe — Cluster 4 Digital, Industry, Space** (Antragsfenster Q3/Q4 2026)
- **Digital Europe Programme — DIGITAL-2026 GovTech Strand**
- **BMWK Innovations-Programm Raumfahrt**
- **BMI Modernisierungsprogramm — KOM-CONNECT**

**Empfehlung:** **Digital Europe + BMI parallel**. Förder-Beträge €500k-2M möglich, decken P1+P2 Engineering.

### D4 — Co-Founder/Hire-Profil

Wer sollte Pharos-Vertical leiten?

- **Ex-BSI / Ex-BMWK Angestellter** (Behörden-Sales)
- **Ex-Materna / Ex-Capgemini-Public-Sector** (GovTech-Integration)
- **Spätere C-Level-Position?** (zu früh?)

**Empfehlung:** Erst **Senior Sales/BizDev mit Behörden-Track-Record** als ersten Hire. Phase B-1 schaffbar mit Founder + 1 Person.

### D5 — Operator-side Onboarding

Sollen Operatoren Pharos sehen bevor sie eine Aufsicht haben?

**Variante a)** Pharos ist unsichtbar bis Operator von einer Behörde invited wird
**Variante b)** Operatoren sehen "Aufsichtsbehörden — verfügbare Optionen" als preview

**Empfehlung:** **Variante a)** für P1. Macht Onboarding-UX einfacher, Behörden behalten Initiative-Hoheit.

### D6 — MDF-Definition: per Behörde oder per Submission-Type?

**Variante a)** MDF ist per Authority-Profile definiert (eine Behörde hat ein Default-MDF für alle ihre Operatoren)
**Variante b)** MDF ist per Submission-Type (BAFA hat unterschiedliches MDF für Export-License vs. End-User-Cert)
**Variante c)** Beides — Authority hat Default-MDF, kann aber pro Operator/Submission-Type verschärfen

**Empfehlung:** **Variante c)** — flexibler, näher an realer Behörden-Praxis.

### D7 — Pharos-AI Default Model

EU-Bedrock Routing ist mandatory, aber welches Model?

- **Claude Sonnet 4.6** (über Bedrock EU) — bewährt, gleiches Modell wie Atlas
- **Claude Opus 4.7** — stärker für komplexe Bescheid-Drafts, teurer
- **Mistral Large** (über Bedrock EU) — EU-souveräner Anbieter, fully sovereign-EU

**Empfehlung:** **Claude Sonnet 4.6** für P1/P2 (Konsistenz mit Atlas, gleiche Quality), **Mistral Large** als Fallback für extreme-sovereignty Behörden (z.B. BMVg).

### D8 — Domain / URL-Strategie

- **`pharos.eu`** (eigene Domain, klar getrennt)
- **`pharos.caelex.eu`** (Subdomain, signalisiert Beziehung)
- **`caelex.eu/pharos`** (Pfad, kosten-effizient aber weniger eindeutig)

**Empfehlung:** **`pharos.caelex.eu`** für P1, später `pharos.eu` wenn Brand etabliert.

### D9 — Bezeichnung "Aufsicht-Handshake" oder "Oversight-Handshake"?

DE-only oder EN-fluent in Code-Identifiern?

**Empfehlung:** **Englisch in Code** (`OversightRelationship`, `mandatoryDisclosure`), **Deutsch in UI** (Aufsicht, Pflicht-Offenlegung). Konsistent mit Caelex-Codebase-Konvention.

### D10 — Public-Attestation Crypto-Standard

- **ed25519 + JWS** (RFC 7515) — bewährt, weit unterstützt
- **CRS / Verifiable Credentials** (W3C standard) — moderner, EU-favored
- **Beides Optional**

**Empfehlung:** **JWS in P4 starten** (einfacher), Verifiable Credentials in P5 als optional layer.

---

## 13. Compliance & Legal

### 13.1 DSGVO

Pharos verarbeitet:

- **Behörden-Mitarbeiter PII** (Names, Email, Sign-In-Records) — Auth.User Reuse
- **Operator-Daten** (durch MDF + VDF) — Operator's verantwortlicher Stelle, Behörde ist gemeinsam Verantwortlicher (Art. 26 DSGVO?)
- **Submission-Inhalte** (kann sensible Operationsdaten enthalten)

**Anforderungen:**

- Joint Controller Vereinbarung Operator ↔ Behörde (Art. 26 DSGVO)
- Pharos-spezifische Datenschutz-Erklärung
- Operator-side Sichtbarkeit aller Behörden-Zugriffe (Art. 15 DSGVO Auskunft + Pharos automatisiert)
- Recht auf Löschung schwierig (Behörden haben Aufbewahrungspflichten) → klare Information

### 13.2 KI-VO Art. 50 + Art. 6(3)

Pharos-AI fällt unter Anhang III KI-VO Nr. 8 (Justizbehörden — analog für Aufsichtsbehörden?):

- **Risikoklassifizierung:** Anhang III Nr. 8 erfasst "Justizbehörden bei der Recherche, Auslegung und Anwendung von Rechtsvorschriften"
- **Pharos-AI ist dort NÄHER** als Atlas-AI (das war für Anwälte) — könnte Hochrisiko sein
- **Auswirkung:** Verschärfte Anforderungen — Conformity Assessment, EU-Datenbank-Registrierung, Human Oversight Pflicht

**Pflicht-Mitigation:**

- Pharos-AI ist **strikt advisory** (Behörden-Mitarbeiter entscheidet immer)
- Pharos-AI Outputs MÜSSEN reviewed werden bevor sie in Bescheid-Drafts gehen
- Detailliertes Logging jeder AI-Inferenz pro Bescheid
- Conformity Assessment dokumentieren (analog zu existing /legal/ai-disclosure § 5b, aber verschärft)

**Phase B-1 Action:** Eigenes `/legal/pharos-ai-act-conformity` Dokument mit detailliertem Risk-Assessment.

### 13.3 BSI / IT-Sicherheit

Pharos = potentielle KRITIS (Sektor "Staat und Verwaltung"). Implikationen:

- BSI-Grundschutz-konforme Architektur
- ISO 27001 Zertifizierung (medium-term)
- Sicherheitsüberprüfung der Caelex-Mitarbeiter (Ü1 nach SÜG für Pharos-Team)

**Phase B-1 OK ohne** — wird relevant bei Production-Deployment für richtige Behörden.

### 13.4 Beschaffungs-Recht

Behörden kaufen via Vergaberecht (VgV/UVgO/VOL):

- Open-Source-Variante stark begünstigt (Vendor-Lock-In ist Vergabe-Killer-Argument)
- Klare TCO-Kalkulation in Pitch
- Angebot bid-bar formulieren

---

## 14. Risiken

### R1 — Vertrauens-Risiko (Operator-side)

_"Caelex ist im Bett mit der Behörde"_

**Mitigation:**

- Strikte technische Architektur-Trennung (separate Domain, separater Vertrag, hash-chain audit überall)
- Marketing-Narrative: _"Caelex ist deine Datenheimat. Pharos ist deine Brücke — du kontrollierst sie."_
- Open-Source-Core macht Code-Inspection möglich (Vertrauens-mehrer)

### R2 — Behörden-Adoption-Risiko

Behörden sind langsam, vergaberechtlich gebunden, IT-konservativ.

**Mitigation:**

- Förder-finanzierter Pilot (kein Risiko für Behörde initial)
- Lighthouse-Pilot mit progressiver Behörde (BAFA hat IT-Affinität)
- Open-Source senkt Vendor-Lock-In Bedenken

### R3 — Mehrere-Behörden-Cross-Border-Komplexität

Federation-Architektur für 27 EU-MS-Behörden ist komplex.

**Mitigation:**

- Phase P3+ Problem, nicht P1
- Erst DACH (DE, AT, CH-Bund), dann EU-Erweiterung

### R4 — KI-VO High-Risk Classification

Pharos-AI könnte als High-Risk klassifiziert werden.

**Mitigation:**

- Strikte Advisory-Only Positionierung (entscheidet immer Mensch)
- Conformity Assessment frühzeitig
- Notfall-Plan: Pharos-AI deaktivieren, manuelle Behörden-Workflows
- KI-Behörden-Bestimmung: bei KI-VO-Sondergutachten Anfragen frühzeitig

### R5 — Konkurrenz von etablierten GovTech-Playern

Materna, Capgemini, IBM-Public-Sector haben etablierte Behörden-Beziehungen.

**Mitigation:**

- White-Label-Strategie: nicht gegen sie, mit ihnen
- Caelex-Spezial-Wert: Space-Compliance-Wissen, Atlas-Bridge, Sovereign-AI

---

## 15. Was ich brauche um zu starten

Ich kann nicht implementieren bevor:

1. ✅ Vision-Doc accepted (PHAROS-VISION.md geshipped)
2. **THIS DOC accepted** (sign-off, evtl. Anmerkungen)
3. **Decisions D1-D10 entschieden** (insbesondere D1 Lighthouse-Behörde, D6 MDF-Definition, D7 Pharos-AI Model)
4. **Customer-Discovery durchgeführt** mit ≥1 Lighthouse-Behörde (für P1-Implementation-Validation)

Wenn 1-3 entschieden sind und 4 in flight, kann ich Phase P1 starten — ~4-6 Wochen Code, am Ende lauffähiger Pharos-MVP der Lighthouse-Pilot ermöglicht.

---

## 16. Status & Next Steps

**Status:** Draft 1 · 25. April 2026  
**Erstellt von:** Polleschnerjulian + Claude (Konzept-Sparring-Pair)  
**Nächste Schritte:**

1. **Polleschnerjulian** liest, kommentiert, signoffed
2. Bei Bedarf: zweite Iteration mit Korrekturen
3. Decisions D1-D10 in einem Beschluss-Doc festhalten
4. Customer-Discovery-Sprint starten (4-6 Wochen)
5. Förder-Antrag drafte (parallel)
6. Phase P1 Implementation-Kickoff (~T+8 Wochen wenn alles parallel läuft)

---

## Anhang A — Schema-Sketch (TypeScript)

Vollständige Prisma-Models siehe § 4. Hier ein verdichteter Überblick für Code-Reviewer:

```typescript
// Neue Models (Pharos)
AuthorityProfile; // 1:1 zu Organization (when orgType=AUTHORITY)
OversightRelationship; // ∞:1 to Authority/Operator orgs
OversightAccessLog; // ∞:1 to Relationship, hash-chain
RegulatorySubmission; // ∞:1 to Relationship
SubmissionReview; // ∞:1 to Submission, per section
SubmissionAttachment; // ∞:1 to Submission, links Document
PublicAttestation; // ∞:1 to Operator org (Phase P4)
AttestationSignature; // ∞:1 to Attestation (Phase P4)

// Neue Enums
AuthorityType; // BAFA, BNETZA, ...
OversightStatus; // PENDING_OPERATOR_ACCEPT, ACTIVE, ...
SubmissionType; // EXPORT_LICENSE, BWRG_ERLAUBNIS, ...
SubmissionStatus; // DRAFT, SUBMITTED, ...
SectionReviewStatus; // OK, QUESTION, REJECT, PENDING
DecisionType; // APPROVAL, CONDITIONAL_APPROVAL, ...

// Erweiterte Enums
OrganizationType; // adds AUTHORITY
```

## Anhang B — API-Sketch (gesamt)

```
Authority Self-Service     (3 routes)
Operator Roster            (3 routes)
Oversight Lifecycle        (5 routes + 2 operator-side)
Submission Lifecycle       (8 routes)
Cross-Authority            (3 routes — Phase P3)
Pharos-AI                  (4 routes)
Audit                      (2 routes)
Public Attestations        (3 routes — Phase P4)

Total: ~30 routes
```

## Anhang C — Page-Inventar (gesamt)

```
Authority-side (Pharos)
  /pharos                         — dashboard
  /pharos/operators               — roster
  /pharos/operators/[id]          — operator detail
  /pharos/submissions             — inbox
  /pharos/submissions/[id]        — review
  /pharos/coordination            — cross-authority (P3)
  /pharos/policies                — config
  /pharos/audit                   — internal audit log

Operator-side (Caelex extensions)
  /dashboard/network/oversight        — list
  /dashboard/network/oversight/[id]   — detail
  /dashboard/submissions              — submissions list
  /dashboard/submissions/new          — submission creator
  /dashboard/submissions/[id]         — submission detail

Bilateral (no auth)
  /network/pharos-accept/[token]      — operator accept oversight

Atlas-side (Phase P3+)
  /atlas/network/[matterId]/oversights  — lawyer view of authority activity

Public (Phase P4)
  /public/attestations/[id]              — verification page

Total: ~13 pages (P1: 5, P2: +5, P3: +2, P4: +1)
```

---

**Document-End. Approval-Block:**

```
[ ] Polleschnerjulian — Konzept abgenommen (signed off, ggf. mit Anmerkungen)
[ ] Decisions D1-D10 entschieden
[ ] Customer-Discovery-Sprint initiiert
[ ] Phase P1 Implementation freigegeben
```

Sobald alle Boxen checked, Code-Implementation startet.
