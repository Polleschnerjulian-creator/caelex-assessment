# Comply Export-Control-Modul — Konzept (Stand: 2026-05-07)

> **Konzept vor Code.** Dieses Dokument liegt zur Abnahme bereit; nach
> Freigabe wird es in Sprint-Plan + ADRs heruntergebrochen.

## TL;DR

1. **EXPORT_CONTROL existiert bereits in V2** als Posture-Assessment
   (160-Felder-Modell `ExportControlAssessment` + 1319-Zeilen-Engine
   - 2150-Zeilen-Datenbasis). Das ist die ICP-Self-Assessment-Schicht
     ("haben wir einen AV? gibt's Schulungen? ist ein TCP vorhanden?").
     Die ist **nicht das Problem** und braucht nur Pflege.
2. **Was fehlt — und was Julians Briefing meint** — ist die
   **transaktionale Schicht**: pro Lieferung / pro Counterparty /
   pro BoM-Position klassifizieren, screenen, lizenzieren, dokumentieren.
   Das ist konzeptuell nicht "noch eine Regulation" in der Comply-
   Ontologie, sondern ein eigenes Trade-Operations-Subsystem.
3. **Empfehlung: Two-Layer-Split**, beide unter `/dashboard/`:
   - `EXPORT_CONTROL`-RegulationKey bleibt für **Posture/Policy** (ICP-
     Reife, AV-Bestellung, Schulungs-Quote, Audit-Cadence).
   - Neues `/dashboard/trade`-Surface mit eigenen Modellen für
     **Operations** (Counterparty, TradeItem, TradeOperation, License).
4. **MVP-Persona** wie im Briefing empfohlen: AV einer New-Space-Firma
   (Isar / RFA / HyImpulse / Mynaric / OHB-spinout). Erste Welle:
   Sanktions-Screening + Counterparty-Management. Schnellster Pfad zu
   "Kann ich an diese Firma verkaufen?" als bezahlte Antwort.
5. **Phasing**: Wave A (Screening + Counterparties, 6 Sprints) → Wave B
   (BoM-Klassifizierung + Lizenz-Determination, 6 Sprints) → Wave C
   (License-Lifecycle + Recordkeeping, 4 Sprints) → Wave D (Intangible/
   Cloud/Deemed-Export, später).
6. **Was wir nicht bauen**: Customs/Origin/Preference (AEB-Domäne),
   generisches DPS für Massen-E-Commerce (Descartes-Domäne), Rechtsrat
   (Boutiquen-Domäne — wir sind Werkzeug, nicht Counsel).

---

## 1. Strategische Positionierung

### 1.1 Das, was Caelex Comply Export Control IST

> "Domain-Native-Compliance-OS für New-Space-Operatoren" (Briefing-Wortlaut).

- **Vertikal Space, nicht horizontal Trade.** Wir bauen tiefe ECCN-9A515-/
  USML-XV-/MTCR-9A101-Logik, wir bauen NICHT die siebzehnte
  Customs-Engine.
- **Decision-Support, kein Auto-Pilot.** Jede Klassifizierung, jede
  Lizenzempfehlung läuft über Astra-Vorschlag → Human-Approval (das
  V2-Proposal-Pattern, das wir in Sprint 6B hardened haben). Bei 20-
  Jahre-Haftstrafen + 40 Mio. €-Bußen ist Astra-only-write nicht
  vertretbar.
- **Audit-First.** Jede Entscheidung schreibt einen Eintrag in den
  bestehenden V2-AuditLog (Hash-Chain) + optional in den Verity-
  Anchor-Path. 5-Jahre-Retention nach §22 AWV / 15 CFR Part 762 fällt
  nebenbei mit ab.

### 1.2 Was Caelex Comply Export Control NICHT ist

- Kein Customs/Preference/AES-Filing — AEB macht das besser. Wenn
  Kunden das wollen, integrieren wir AEB als Side-Car.
- Kein generischer DPS-Massen-Screener — Descartes screent Milliarden
  pro Jahr. Wir nutzen OpenSanctions als Datenquelle und bauen den
  Workflow on top.
- Kein Rechtsanwalts-Output — wir liefern strukturierte Decision-Logs,
  die ein:e Anwält:in (GvW, Cattwyk, AWB, Akin Gump) nutzen kann.
  Empfehlungstexte sind Hinweise, keine Legal Opinion.
- Kein On-Prem — Cloud-native, BSI-C5-Path für Defense-Kunden.

### 1.3 Differenzierung gegenüber V2-bestehendem EXPORT_CONTROL

Das aktuelle Modul antwortet auf: _"Hat unsere Firma als Ganzes ein
funktionierendes ITAR/EAR-Compliance-Programm?"_

Das neue Operations-Layer antwortet auf: _"Darf ich diese konkrete
Sendung an diese konkrete Firma in diesem konkreten Land morgen
ausliefern, und wenn ja unter welcher Lizenz?"_

Das sind grundverschiedene Fragen mit unterschiedlicher Cadence
(jährliches Self-Assessment vs. tägliche Trade-Decisions) und
Datenmodellen. Sie zwangsweise in dasselbe `*RequirementStatus`-
Schema zu pressen wäre Modellbruch.

---

## 2. Architektur: Two-Layer-Split

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — POSTURE (existiert)                                   │
│ /dashboard/modules/export-control                                │
│ Datenbasis: ExportControlAssessment + ExportControlReqStatus    │
│ Antwort: "Wie reif ist unser ICP?"                              │
│ Cadence: jährlich, Astra kann auf Diff-Triggern Re-Assessment   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ posture_score speist priority
                               │ in TradeOperation-Risk-Score
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — OPERATIONS (neu)                                       │
│ /dashboard/trade                                                 │
│ /dashboard/trade/counterparties                                  │
│ /dashboard/trade/items                                           │
│ /dashboard/trade/operations/[id]                                 │
│ /dashboard/trade/licenses                                        │
│ Datenbasis: TradeParty, TradeItem, TradeOperation, TradeLicense │
│ Antwort: "Was darf ich mit Sendung X tun?"                       │
│ Cadence: pro Event, kontinuierliches Re-Screening               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Decisions → V2-Proposals (high-impact)
                               │ Decisions → V2-Notes (low-impact)
                               │ Audit → AuditLog hash chain
                               │ Optional: Verity anchor for high-stakes
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ V2-INFRASTRUKTUR (vorhanden — wiederverwendet)                   │
│ • defineAction() — Auth + Audit + Rate-Limit + Proposals        │
│ • AstraProposal — Reviewer-Approval-Gates                       │
│ • AuditLog — Hash-Chain, 5-Jahre-Retention                       │
│ • ComplianceItemNote — Markdown-Notes mit Backreferenzen        │
│ • Astra Engine — Tool-Use mit Human-in-the-Loop                  │
│ • V2Shell + Apple HIG — UI-System                                │
└─────────────────────────────────────────────────────────────────┘
```

**Kernprinzip:** Der Operations-Layer ist _kein_ neues V2 von V2. Er
nutzt jede einzelne der V2-Infrastrukturen, die wir in Sprints D-J
gebaut haben. Das spart Zeit und garantiert dieselbe Compliance-
Qualität (Audit, Proposals, Rate-Limits).

---

## 3. Datenmodell — neue Prisma-Models

Alle neuen Models leben unter dem Präfix `Trade*`. Foreign Keys auf
`User` + `Organization` für Multi-Tenancy.

### 3.1 TradeParty — Counterparty-Management mit 50%-Rule-Cascade

```prisma
model TradeParty {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)
  createdById    String
  createdBy      User         @relation(...)

  // Identity
  legalName      String
  tradeName      String?
  countryCode    String       // ISO 3166-1 alpha-2
  addressLines   String[]     @default([])
  /// "ICEYE Polska sp. z o.o." would canonicalize to "iceye polska"
  /// for fuzzy matching. Maintained by entity-resolution job.
  canonicalName  String       @db.Text

  // External identifiers
  vatNumber      String?
  ducnsNumber    String?      // D-U-N-S
  leiCode        String?      // Legal Entity Identifier
  cageCode       String?      // US DoD CAGE
  iso3166Region  String?

  // Beneficial-Ownership Graph — for OFAC 50%-Rule cascade
  beneficialOwners TradePartyOwnership[] @relation("OwnedEntity")
  ownershipIn      TradePartyOwnership[] @relation("OwnerEntity")

  // Latest screening result (denormalized for list queries)
  lastScreenedAt   DateTime?
  screeningStatus  TradeScreeningStatus  @default(NOT_SCREENED)
  screeningHits    Json? // top-N raw hits, full set in TradeScreeningResult

  // Risk markers
  isUSPerson       Boolean   @default(false) // for ITAR §126 + deemed-export
  isHighRiskCountry Boolean  @default(false) // computed from countryCode

  // Audit + lifecycle
  status         TradePartyStatus @default(ACTIVE) // ACTIVE / ARCHIVED / BLOCKED
  blockedReason  String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  operations     TradeOperation[] @relation("OperationCounterparty")
  intermediates  TradeOperation[] @relation("OperationIntermediates")
  screenings     TradeScreeningResult[]

  @@index([organizationId, canonicalName])
  @@index([organizationId, screeningStatus])
  @@index([countryCode])
}

model TradePartyOwnership {
  id             String     @id @default(cuid())
  ownerId        String
  owner          TradeParty @relation("OwnerEntity", fields: [ownerId], references: [id], onDelete: Cascade)
  ownedId        String
  owned          TradeParty @relation("OwnedEntity", fields: [ownedId], references: [id], onDelete: Cascade)
  /// 0.0 - 1.0 — direct equity %
  percent        Float
  /// "voting" / "economic" / "control_no_equity" (for the post-Dec-2025
  /// trustee-case path where OFAC pursues control without ownership)
  controlType    String     @default("economic")
  notes          String?
  createdAt      DateTime   @default(now())

  @@unique([ownerId, ownedId])
  @@index([ownedId])
}

model TradeScreeningResult {
  id             String      @id @default(cuid())
  partyId        String
  party          TradeParty  @relation(...)
  /// Snapshot of all sanctions list IDs hit at screening time.
  /// JSON shape: [{ list: "OFAC_SDN", entryId: "12345", score: 0.97, matchedFields: [...] }]
  hits           Json
  /// "CLEAR" / "POTENTIAL_MATCH" / "CONFIRMED_HIT" / "FALSE_POSITIVE_DISMISSED"
  decision       TradeScreeningDecision
  decidedById    String?
  decidedBy      User?       @relation(...)
  decidedAt      DateTime?
  notes          String?     @db.Text
  /// Hash of the OpenSanctions snapshot used for this screening.
  /// Lets us prove later WHICH list version was checked.
  snapshotHash   String
  createdAt      DateTime    @default(now())

  @@index([partyId, createdAt])
}

enum TradeScreeningStatus {
  NOT_SCREENED
  CLEAR
  POTENTIAL_MATCH
  CONFIRMED_HIT
  STALE  // last screen > 30 days, needs refresh
}

enum TradeScreeningDecision {
  CLEAR
  POTENTIAL_MATCH
  CONFIRMED_HIT
  FALSE_POSITIVE_DISMISSED
}

enum TradePartyStatus {
  ACTIVE
  ARCHIVED
  BLOCKED  // user-marked block, hardstops on operations
}
```

### 3.2 TradeItem — BoM-Position mit Mehrfach-Klassifizierung

```prisma
model TradeItem {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)
  createdById    String

  // Identification
  name           String
  internalSku    String?
  manufacturerName String?
  manufacturerPartNo String?
  /// Free-text description for Astra to consume.
  description    String       @db.Text

  // Classifications — mehrere parallel, weil real
  /// EU Annex I — z.B. "9A515.a", "9A101", "5A001.f"
  eccnEU         String?
  /// US CCL — z.B. "9A515.a", "5A002.a.1.a"
  eccnUS         String?
  /// USML — z.B. "XV(a)(7)(i)", "IV(h)"
  usmlCategory   String?
  /// MTCR Annex — z.B. "9A101", "1.A.1"
  mtcrCategory   String?
  /// AL Anlage AL DE — z.B. "0001", "1900-Übergangskennung 4A1906"
  germanAlEntry  String?

  // Origin + Composition (für De-minimis + FDPR)
  countryOfOrigin String?
  /// % US-content by value — drives 25% / 10% / 0% De-minimis decision
  usContentPercent Float?
  /// True wenn US-Software in Design verwendet (FDPR-Trigger)
  designedWithUSTech Boolean   @default(false)
  /// True wenn US-Equipment im Manufacturing verwendet
  manufacturedWithUSEquipment Boolean @default(false)

  // Property-flags für die Decision-Engine
  /// Apertur-Größe für Optik (USML XV(a)(7)(i) Schwelle 0.50 m)
  apertureMeters     Float?
  rangeKm            Float?
  payloadKg          Float?
  isRadHardened      Boolean? @default(false)
  isMilSpec          Boolean? @default(false)
  isAntiJam          Boolean? @default(false)

  // Source of classification truth
  /// "USER_DECLARED" / "ASTRA_SUGGESTED" / "ATTORNEY_OPINION" /
  /// "BAFA_AUSKUNFT_GUETERLISTE"
  classificationSource TradeClassificationSource @default(USER_DECLARED)
  classifiedAt        DateTime?
  classifiedById      String?
  /// Reference to BAFA "Auskunft zur Güterliste" letter, attorney
  /// memo, or CJ-determination if available.
  classificationEvidenceUrl String?

  status         TradeItemStatus @default(DRAFT)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  operations     TradeOperationLine[]
  notes          TradeItemNote[]

  @@index([organizationId, status])
  @@index([eccnEU])
  @@index([usmlCategory])
}

enum TradeClassificationSource {
  USER_DECLARED
  ASTRA_SUGGESTED
  ATTORNEY_OPINION
  BAFA_AUSKUNFT_GUETERLISTE
  CJ_DETERMINATION       // US Commodity Jurisdiction
}

enum TradeItemStatus {
  DRAFT
  CLASSIFIED
  REQUIRES_REVIEW
  ARCHIVED
}

model TradeItemNote {
  id        String    @id @default(cuid())
  itemId    String
  item      TradeItem @relation(...)
  userId    String
  body      String    @db.Text
  createdAt DateTime  @default(now())
  @@index([itemId, createdAt])
}
```

### 3.3 TradeOperation — die transaktionale Einheit

```prisma
model TradeOperation {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)
  createdById    String
  createdBy      User         @relation(...)

  // Operation identity
  /// User-friendly reference, e.g. "ISAR-2026-Q1-001" or
  /// "Spectrum-Avionics-to-AeroJet"
  reference      String
  description    String       @db.Text
  /// "EXPORT" / "REEXPORT" / "INTRA_EU" / "TRANSIT" /
  /// "TECH_TRANSFER" / "DEEMED_EXPORT" / "CLOUD_PROVISION"
  operationType  TradeOperationType

  // Counterparty + intermediaries
  counterpartyId String
  counterparty   TradeParty   @relation("OperationCounterparty", ...)
  intermediates  TradeParty[] @relation("OperationIntermediates")

  // Geography
  shipFromCountry String  // ISO 3166-1
  shipToCountry   String
  endUseCountry   String?
  routeStops      String[] @default([])

  // End-use + end-user
  /// "CIVIL" / "DUAL_USE" / "MILITARY" / "WMD_RELATED" / "UNKNOWN"
  declaredEndUse TradeEndUseClass @default(CIVIL)
  endUserName    String?
  endUserSector  String?

  // Items in this operation
  lines          TradeOperationLine[]

  // Computed risk
  riskScore         Int? // 0-100
  catchAllArt4Hit   Boolean @default(false) // WMD/Military
  catchAllArt5Hit   Boolean @default(false) // Cyber-surveillance / Human Rights
  catchAllArt9Hit   Boolean @default(false) // National (DE §8 AWV)
  catchAllArt10Hit  Boolean @default(false) // Intra-EU sensitive
  notificationDuty  Boolean @default(false) // §8 AWV Anzeige fällig

  // Decisions taken (drives lifecycle)
  /// "DRAFT" / "SCREENING" / "AWAITING_CLASSIFICATION" /
  /// "AWAITING_LICENSE" / "LICENSED" / "EXECUTED" /
  /// "BLOCKED" / "VOLUNTARY_DISCLOSURE_FILED"
  status TradeOperationStatus @default(DRAFT)

  // Linked licenses (zero-to-many — stack of AGGen + Einzelgenehmigung)
  licenses       TradeLicense[]

  // Lifecycle timestamps
  scheduledShipDate DateTime?
  actualShipDate    DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  closedAt          DateTime?

  @@index([organizationId, status])
  @@index([organizationId, scheduledShipDate])
  @@index([counterpartyId])
}

model TradeOperationLine {
  id            String         @id @default(cuid())
  operationId   String
  operation     TradeOperation @relation(...)
  itemId        String
  item          TradeItem      @relation(...)
  quantity      Float
  unitValue     Float
  unitCurrency  String         @default("EUR")
  /// License-stack-Reference — welche der TradeLicense-Stack-Zeilen
  /// deckt diese Position?
  appliedLicenseId String?
  @@index([operationId])
  @@index([itemId])
}

model TradeLicense {
  id             String          @id @default(cuid())
  organizationId String
  /// "BAFA_EINZEL" / "BAFA_AGG_12" ... / "BAFA_AGG_47" /
  /// "BAFA_EUGEA_EU001" ... / "BIS_EAR" / "BIS_LICENSE_EXCEPTION_STA" /
  /// "BIS_LICENSE_EXCEPTION_CSA" / "DDTC_DSP5" / "DDTC_TAA"
  licenseType    TradeLicenseType
  licenseNumber  String?
  issuedAt       DateTime?
  validUntil     DateTime?
  /// JSON — ECCN/USML codes covered, end-use restrictions,
  /// volume/value caps, country lists.
  conditions     Json
  /// Computed total drawdown from operations referencing this license.
  drawnDownValue Float           @default(0)
  totalCapValue  Float?
  /// Path in document vault to the actual license PDF.
  documentId     String?

  status         TradeLicenseStatus @default(ACTIVE)
  createdAt      DateTime           @default(now())

  operations     TradeOperation[]

  @@index([organizationId, status])
  @@index([validUntil])
}
```

### 3.4 Verbindung zur bestehenden V2-Ontologie

- **Audit:** Jede TradeOperation-Statusänderung → `AuditLog`-Eintrag
  via existierendem `logAuditEvent()`. Neue AuditEntityTypes:
  `trade_party`, `trade_item`, `trade_operation`, `trade_license`,
  `trade_screening`. Neue AuditActions: `trade_screening_run`,
  `trade_party_classified`, `trade_item_classified`,
  `trade_operation_blocked`, `trade_license_drawn_down`, etc.
- **Proposals:** High-impact Aktionen (z.B. `markScreeningClear`,
  `applyLicense`, `unblockParty`, `submitToBAFA`) laufen über das
  existierende `defineAction()` mit `requiresApproval: true`. Reviewer
  approval over `/dashboard/proposals` ist bereits gebaut.
- **Notes:** Nutzt das `ComplianceItemNote`-Pattern als Vorlage —
  `TradePartyNote`, `TradeItemNote`, `TradeOperationNote`, jeweils
  Markdown-fähig.
- **Verity:** High-stakes Operationen können on-chain anchored werden
  (Sprint 10C-Pattern, OpenTimestamps). Optional, vermutlich für
  Government-Submissions wie BAFA-Antrag.
- **Dashboard-Posture:** Layer-1-EXPORT_CONTROL-Score wird in Layer-2-
  Risk-Score eingespeist (eine Operation an einer Counterparty in
  einem High-Risk-Land bei niedrigem ICP-Reife-Score → höherer
  computed Risk-Score).

---

## 4. Engine-Komponenten

Reihenfolge entspricht Wave-Phasing.

### 4.1 SanctionsScreeningEngine (`src/lib/comply-v2/trade/screening.server.ts`)

- **Datenquelle:** OpenSanctions kommerzielle Lizenz als Anker (deckt
  EU FSF + OFAC SDN + UK OFSI + UN 1267 + 325 weitere). Direkte BIS
  Entity List + DDTC Debarred + EU FSF als Backup-Pulls (täglich
  Cron).
- **Matching:** fuzzy via Jaro-Winkler + Levenshtein + phonetisch
  (Beider-Morse für transliterierte Namen). Threshold per Tenant
  konfigurierbar (Default 0.85).
- **50%-Rule-Cascade:** Beneficial-Ownership-Graph-Traversal. Für
  jeden Hit: prüfe rekursiv Owner mit `percent ≥ 0.5`. Aggregation
  programmübergreifend (OFAC FAQ 398).
- **Snapshot-Hashing:** Jeder Screening-Run hashed die OpenSanctions-
  Datei-Versionen — beweisen können, **welche Listenversion** geprüft
  wurde, ist regulatorisch entscheidend.
- **Continuous Monitoring:** Cron-Job re-screent alle ACTIVE
  TradeParties täglich. Neue Hits → Notification + TradeOperation-
  Statusänderung auf BLOCKED, falls offene Operationen existieren.

### 4.2 ClassificationEngine (`src/lib/comply-v2/trade/classification.server.ts`)

- **Decision-Tree** über die kanonischen Listen:
  - EU Annex I (Cat. 0–9, ~11.000 Lines)
  - US CCL (Cat. 0–9 mit ECCN-Sub-Items)
  - USML (21 Categories)
  - MTCR Annex (Cat. I + II)
  - DE Anlage AL Teil I A/B (incl. 1900er-Übergangskennungen)
- **Astra-Tool:** Neuer Astra-Tool `classify_trade_item` — der Tool
  bekommt Item-Description + technical specs, gibt strukturierten
  Vorschlag zurück inkl. Confidence + Reasoning-Path. **Schreibt nicht
  direkt** — schreibt einen Proposal mit `requiresApproval: true`,
  Human bestätigt.
- **Property-Triggered Classifications:** z.B. `apertureMeters >= 0.5`
  → automatisch USML-XV(a)(7)(i)-Vorschlag. `rangeKm >= 300 &&
payloadKg >= 500` → MTCR Cat. I. Diese Trigger sind hartcodiert; das
  reduziert die LLM-Surface-Area.
- **Dual-Listing Support:** Jedes Item kann gleichzeitig EU-Annex-I,
  US-CCL, USML, MTCR und DE-AL-Einträge haben. Engine zeigt alle
  parallel, nicht "die richtige" Klassifikation.

### 4.3 LicenseDeterminationEngine (`src/lib/comply-v2/trade/license-determination.server.ts`)

- **Input:** TradeOperation (counterparty, items, route, end-use).
- **Output:** Geordnete Liste passender Lizenzen mit Eligibility-Flags
  und Begründung:
  - "AGG Nr. 12 anwendbar — unter Wertgrenze 5.000 €, Empfangsland in
    Anhang II Teil 1, Empfänger nicht auf Sanktionsliste."
  - "EU001 anwendbar — Empfangsland USA, ECCN nicht in EU001-Ausschluss-
    liste, Endverwendung zivil."
  - "Einzelgenehmigung erforderlich — Catch-All Art. 4 getriggert
    durch deklarierten Militär-End-Use."
- **AGG-Eligibility-Matrix:** Pflege die ~31 deutschen AGG (Nr. 12,
  13, 14, 16, 18-35, 36, 39, 42, 43, 44, 47) + EU001-008 als
  strukturierte Regel-Datenbank, nicht als LLM-Prompts. Konkrete
  Wertgrenzen, Empfangsländer, Empfänger-Bedingungen, Meldepflichten.
- **Catch-All-Engine:** Red-Flag-Library (BIS "Know-Your-Customer"-
  Indikatoren + BAFA Hinweise). Triggered Notification-Pflicht (§8
  AWV / Art. 5(2) 2021/821) wenn Hits.

### 4.4 DeMinimisCalculator (`src/lib/comply-v2/trade/de-minimis.server.ts`)

- **Per BoM-Line:** Aggregiert `usContentPercent` über alle TradeItems
  einer TradeOperation, berechnet Gesamt-US-Content-Anteil nach Wert.
- **Schwellenwert je Empfangsland:**
  - 25% generell
  - 10% für E:1/E:2-Länder
  - 0% für RU/BY/IR/CU/SY/Crimea/DNR/LNR/NK
- **FDPR-Trigger:** Wenn `designedWithUSTech || manufacturedWithUSEquipment`
  → FDPR potenziell anwendbar; markieren für Human-Review.

### 4.5 DocumentGenerationEngine (`src/lib/comply-v2/trade/documents.server.ts`)

- **BAFA-Antrag**: Pre-fill für ELAN-K2 (Excel-/XML-Export, da BAFA
  keine offene API hat). Kunde kopiert in BAFA-Portal.
- **EUC** (Endverbleibserklärung): Templated PDF gemäß §21 Abs. 6
  AWV; Anlage A1 für Rüstung.
- **US AES/EEI**: JSON für Filer-Tools (wir filen nicht selbst).
- **BIS SNAP-R**: Pre-fill für BIS-Lizenzantrag.
- **DDTC DECCS-kompatible Outputs**: Strukturiertes JSON.

---

## 5. UI-Surfaces

Apple HIG dark theme, Inter font — gleicher Style wie alle V2-Pages.

### 5.1 `/dashboard/trade` (Übersicht)

Sektionen oben-nach-unten:

1. **Heute-Inbox**: TradeOperations mit Status `AWAITING_*`, sortiert
   nach geplantem Versanddatum. Gleiches Card-Pattern wie
   `/dashboard/today`.
2. **Open Screening Hits**: TradeParty-Hits mit `decision = POTENTIAL_MATCH`
   die Review brauchen.
3. **License Drawdown**: TradeLicenses mit `drawnDownValue / totalCapValue
≥ 0.8` — Warnung, dass Cap bald erschöpft.
4. **Stale Screenings**: TradeParties mit `screeningStatus = STALE`
   (>30 Tage alt) — Re-Screen-CTA.

### 5.2 `/dashboard/trade/counterparties`

- Liste aller TradeParties mit Filter (countryCode, status,
  screeningStatus).
- **Counterparty-Detail-Page** `/dashboard/trade/counterparties/[id]`:
  - Identity + Beneficial-Ownership-Graph (interaktiv, traversable).
  - Screening-History (alle TradeScreeningResult-Einträge).
  - Connected Operations (alle TradeOperations mit dieser Party).
  - Actions: `screen now`, `mark blocked`, `add ownership entry`.

### 5.3 `/dashboard/trade/items`

- Liste aller TradeItems mit Klassifizierungs-Status.
- **Item-Detail-Page** `/dashboard/trade/items/[id]`:
  - Klassifikationen (alle parallel: EU/US/USML/MTCR/AL).
  - Property-Flags + computed-classifications.
  - Astra-Vorschläge mit Reasoning.
  - Notes + Audit-Trail.
  - **Action**: `classify with Astra` → Astra-Tool runs, Vorschlag
    erscheint als Proposal, User approved.

### 5.4 `/dashboard/trade/operations/new` (Wizard)

Step-wise wie Onboarding:

1. **Operation Identity** (reference, type, end-use)
2. **Counterparty** (pick existing or create new + sofort screen)
3. **Items** (BoM lines — pick from items library oder neu klassifizieren)
4. **Geography + Route** (ship-from, ship-to, intermediates)
5. **Pre-Decision-Review**: Engine zeigt:
   - Computed risk score
   - Sanctions-Hit-Status aller Counterparties
   - Klassifikations-Status aller Items
   - Catch-All-Trigger (Art. 4/5/9/10)
   - License-Determination-Vorschlag
6. **Decision**: Submit operation → status `SCREENING` oder
   `AWAITING_CLASSIFICATION` etc.

### 5.5 `/dashboard/trade/operations/[id]` (Detail)

Like `/dashboard/items/[reg]/[id]` aber mit Trade-Operation-Spezifika:

- NextStep-style Action-Panel oben (Sprint 10H-Pattern):
  - "Run sanctions screening" wenn `screeningStatus = NOT_SCREENED`
  - "Classify items" wenn ungeklassifizierte Items
  - "Apply for BAFA license" wenn keine passende AGG
  - "Submit to BAFA via ELAN-K2" wenn ready
- Risk-Heatmap pro BoM-Line + Counterparty-Chain
- Decision-Log Timeline
- Document-Vault-Verknüpfung (EUC, BAFA-Antrag, License-PDF)

### 5.6 `/dashboard/trade/licenses`

- Liste aller TradeLicenses mit Validity + Drawdown-Bar.
- License-Detail mit allen TradeOperations, die darauf gezogen haben.
- Renewal-Reminder 60 Tage vor `validUntil`.

---

## 6. Astra-Integration

Astra bekommt **5 neue Tools**, alle gehen über `defineAction()`:

| Tool                      | Action                      | requiresApproval | Was es tut                                                     |
| ------------------------- | --------------------------- | ---------------- | -------------------------------------------------------------- |
| `screen_trade_party`      | `runSanctionsScreening`     | nein             | Re-screent eine Party gegen alle Listen, schreibt Result.      |
| `classify_trade_item`     | `proposeItemClassification` | **ja**           | Vorschlag für ECCN/USML/MTCR — Reviewer approved.              |
| `determine_trade_license` | `proposeLicenseStack`       | **ja**           | Vorschlag für AGG/EUGEA/Einzelgenehmigung — Reviewer approved. |
| `flag_catch_all_concern`  | `markCatchAllConcern`       | nein             | Setzt Flag + schreibt Note + öffnet Notification.              |
| `block_trade_party`       | `blockTradeParty`           | **ja**           | Hard-block einer Party — Reviewer approved (irreversibel).     |

**User-Story-Beispiel:**

> Operator sagt zu Astra: _"Wir wollen 50 Stück unseres Star-Trackers
> X an Spire Global Polska liefern, 80k EUR pro Stück."_
> Astra:
>
> 1. Screent Spire Global Polska → CLEAR (öffentlicher Datenstand).
> 2. Klassifiziert Star-Tracker X → Vorschlag ECCN 7A004,
>    Wassenaar-relevant. Confidence 0.92. **Proposal erstellt.**
> 3. Risk-Check: PL ist EU-Mitglied, intra-EU-Lieferung. Catch-All-
>    Art. 10 nicht getriggert (nicht in Anhang IV).
> 4. License-Determination: keine Lizenz nötig (intra-EU,
>    nicht-Anhang-IV). Empfehlt nur AWG-Bestätigung schreiben.
> 5. Schreibt eine TradeOperation mit allen Refs, Status
>    `AWAITING_CLASSIFICATION` (weil Klassifikations-Vorschlag
>    Approval braucht).
>
> Operator approved den Klassifikations-Vorschlag, Operation flippt zu
> `AWAITING_LICENSE` → engine sagt "no license needed", flippt zu
> `LICENSED` → operator drückt `mark shipped`.

---

## 7. Daten-Source-of-Truth-Strategie

| Quelle                                          | Update-Cadence                | Wer pulled                                 |
| ----------------------------------------------- | ----------------------------- | ------------------------------------------ |
| OpenSanctions (kommerzielle Lizenz)             | mehrmals täglich              | Cron `trade-screening-sync`                |
| OFAC SDN + non-SDN + delta files                | täglich                       | Cron `ofac-sync` (Backup zu OpenSanctions) |
| BIS Entity List + UVL + MEU                     | täglich                       | Cron `bis-sync`                            |
| DDTC Debarred Parties                           | wöchentlich                   | Cron `ddtc-sync`                           |
| EU FSF Consolidated                             | täglich                       | Cron `eu-fsf-sync`                         |
| EU Council Official Journal Sanctioned Entities | täglich (via OpenSanctions)   | Cron `eu-oj-bridge`                        |
| EU Annex I (Excel + EUR-Lex)                    | jährlich + Sub-Updates        | Manuell + Diff-Tool                        |
| DE Anlage AL (BAFA + BGBl.)                     | bei AWV-Änderungen            | Manuell + Diff-Tool                        |
| US CCL (eCFR Title 15 Part 774)                 | bei BIS Final Rules           | Manuell + Diff-Tool                        |
| USML (eCFR Title 22)                            | bei DDTC Rules                | Manuell + Diff-Tool                        |
| MTCR Annex Handbook (PDF 2010)                  | praktisch nie                 | Caelex-eigene strukturierte DB             |
| BAFA AGG-Updates                                | bei Maßnahmenpaketen (jährl.) | Manuell                                    |

**Empfehlung:** OpenSanctions als Anker, alle anderen als
Verifikations-Pulls. Snapshot-Hash jeder Sanktions-Liste, sodass jede
historische Screening-Entscheidung reproduzierbar ist.

---

## 8. Phasing — vier Wellen

Jede Welle = ein eigenständiger Spike, lieferbar als separate Mini-
Sprint-Folge im V2-Stil (5-10 Sprints, 1-2 Wochen jeweils).

### Wave A — Sanctions Screening + Counterparties (~6 Sprints)

**Lieferung:** Operator kann Counterparty anlegen, screenen, 50%-Rule-
Cascade ansehen, Hits review-en.

- Sprint A1: Prisma-Models `TradeParty`, `TradePartyOwnership`,
  `TradeScreeningResult`. Migration. Audit-Verbs ergänzen.
- Sprint A2: OpenSanctions-Sync-Cron + Snapshot-Hashing. Sanctions-
  Listen-Storage-Modell.
- Sprint A3: Screening-Engine (Fuzzy-Match + 50%-Rule-Cascade).
  Tests.
- Sprint A4: `/dashboard/trade/counterparties` Liste + Detail-Page
  mit Beneficial-Ownership-Graph (kann erstmal Tabelle sein, später
  D3-Graph).
- Sprint A5: Continuous-Monitoring-Cron + Notification-Verdrahtung
  in V2-Notification-System.
- Sprint A6: Astra-Tool `screen_trade_party` + tests.

### Wave B — Item Classification + License Determination (~6 Sprints)

- Sprint B1: Prisma-Models `TradeItem`, `TradeItemNote`. Klassifikations-
  Source-Tracking.
- Sprint B2: Klassifikations-DB (EU Annex I + US CCL + USML + MTCR + AL)
  als strukturierte Rule-Engine, nicht LLM.
- Sprint B3: Classification-Engine + Astra-Tool `classify_trade_item`
  mit Proposal-Gating.
- Sprint B4: De-Minimis + FDPR-Calculator.
- Sprint B5: License-Determination-Engine (AGG-Matrix + EUGEA +
  Einzelgenehmigung).
- Sprint B6: `/dashboard/trade/items` UI + Astra-Tool tests.

### Wave C — Operations Lifecycle + License Stack (~4 Sprints)

- Sprint C1: Prisma-Models `TradeOperation`, `TradeOperationLine`,
  `TradeLicense`. Lifecycle-State-Machine.
- Sprint C2: `/dashboard/trade/operations/new` Wizard (5 Schritte).
- Sprint C3: Operations-Detail-Page mit NextStep-Action-Panel
  (Pattern aus Sprint 10H wiederverwenden).
- Sprint C4: Document-Generation (BAFA-Antrag + EUC) + License-
  Drawdown-Tracking.

### Wave D — Intangible/Cloud/Deemed Export (~später)

- Cloud-upload-monitoring (S3/Azure-Audit-Log-Integration)
- Deemed-export-Workflow für US-Persons in EU-Engineering
- Software-download-control mit signed URLs + Geo-Restriction

---

## 9. Was wir bewusst weglassen (initial)

| Weggelassen                                   | Warum                                                                |
| --------------------------------------------- | -------------------------------------------------------------------- |
| AES/EEI-Filing                                | US-Customs-Domäne, AEB/Descartes machen das.                         |
| Customs-Tariff-/HS-Code-Lookup                | Customs-Domäne.                                                      |
| Preference-Calculation                        | Customs-Domäne.                                                      |
| Mass-Email-Marketing-Suppressions             | Nicht unsere Persona.                                                |
| Generic-DPS-API                               | Descartes hat zehn Milliarden Screens/Jahr.                          |
| OnPrem-Deployment                             | Cloud-native, BSI-C5 Path für Defense später.                        |
| Direct-BAFA-API-Submission                    | BAFA hat keine offene API; wir generieren ELAN-K2-kompatibles Excel. |
| Direct-DDTC-DECCS-Submission                  | Gleiche Logik.                                                       |
| Outbound-Investment-Screening (US E.O. 14105) | Wave-Z, wenn EU-Pendant kommt.                                       |
| KI-generierte Rechtsmemos                     | Wir sind Werkzeug, nicht Counsel.                                    |

---

## 10. Risiken

| Risiko                                                                                | Mitigation                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenSanctions-Lizenz** wird teurer als angenommen oder Lizenz-Modell ändert sich.   | Direkte BIS/DDTC/OFAC/EU-FSF-Pulls als Backup-Stack. Alle drei + UN sind frei zugänglich.                                                                                                   |
| **AGG-Matrix wird nie vollständig korrekt** (BAFA ändert die Matrix laufend).         | Versionierung der Rule-Engine + monatliches BAFA-Newsletter-Monitoring durch Caelex-Compliance-Team. Astra-Vorschläge zeigen _immer_ AGG-Versions-Stand der Empfehlung an.                  |
| **Klassifikations-Halluzination** durch Astra.                                        | Hardcoded Property-Trigger als Override (z.B. `apertureMeters >= 0.5 → USML XV` immer). Confidence-Threshold + immer Human-Approval. Decision-Log archiviert auch das volle LLM-Reasoning.  |
| **Persönliche Haftung** des AV bei falscher Engine-Empfehlung.                        | Disclaimer in jeder UI-Surface + im Document-Output, dass Caelex Werkzeug ist, kein Counsel. License Footer mit "Confirm with qualified export-control counsel before any export decision." |
| **Sanktions-Liste-Verzögerungen** (offizielle EU Consolidated >20 Tage hinter EU OJ). | OpenSanctions liefert OJ-Bridging täglich. Wir mappen Bridging-Hits explizit als "OJ-listed but not yet in Consolidated" — Operator sieht Verzögerung.                                      |
| **MTCR Annex Handbook** offiziell nur 2010 öffentlich.                                | Caelex-eigene strukturierte DB + dokumentierte Versionierung + BAFA Auskunft zur Güterliste als Validierungs-Path.                                                                          |

---

## 11. Offene Fragen für Julian (vor Sprint A1)

1. **Kunden-Zugang**: Hast du Pilot-Kunden-Zusagen aus Isar / RFA /
   HyImpulse / Mynaric / OHB-Spinout-Spektrum? Wenn ja, lass mich
   ihre konkreten Pain-Points sehen — bestimmt die Sprint-A1-Prio.
2. **OpenSanctions-Lizenz**: Hast du Budget-Approval (~€/Jahr-niedriger-
   fünfstellig PAYG, höher bei Bulk)? Wenn nein, müssen wir Wave A
   mit nur den Free-Quellen starten und OpenSanctions in Wave A.5
   nachziehen.
3. **Two-Layer-Split-OK?** Bist du mit der Trennung Posture vs
   Operations einverstanden, oder willst du alles in einer einheitlichen
   Surface? (Ich empfehle Split, weil es Modellbruch vermeidet — aber
   es ist eine Design-Entscheidung mit langer Halbwertszeit.)
4. **Multi-Tenancy-Scope**: Trade-Operations sind organization-scoped,
   nicht user-scoped. Bestätigt? (Ja = Counterparties werden über alle
   Org-Mitglieder geteilt; Nein = jeder User hat seine eigene
   Counterparty-Datenbank.)
5. **MVP-Persona-Kompromiss**: Briefing empfiehlt AV einer New-Space-
   Firma. Akzeptiert? Oder sollen wir früh schon Tier-1 (OHB / Airbus
   DS-Tochter) mitbedenken?
6. **Verity-Anchoring**: Sollen high-stakes-Operationen (BAFA-Submission,
   License-Approval) on-chain anchored werden? Kostet ~ 5 USD pro
   Anchor (Bitcoin transaction fee), gibt aber bombenfeste
   Reproduzierbarkeit.
7. **Reihenfolge der Welle**: Ist Wave A (Screening) wirklich der
   richtige Start, oder ist BoM-Klassifikation (Wave B) der schmerz-
   reichere Pain-Point? Aus dem Briefing ist Screening "leichter Sieg"
   und Klassifikation "größerer Wert" — aber nur du kennst, was die
   ersten Pilot-Kunden tatsächlich verlangen.
8. **Compliance-Gewährleistung**: Wenn wir die Engine eines Tages
   "richtig" klassifizieren wollen, brauchen wir BAFA-Auskünfte zur
   Güterliste als Validierungs-Path. Hast du das Rechtsbudget für
   ~10-20 BAFA-Auskünfte pro Jahr (jeweils €500-2.000), die wir als
   Ground-Truth nutzen?

---

## 12. Anhang — Referenz auf Briefing-Quellen

Dieses Konzept verarbeitet folgende Punkte aus dem Briefing:

- **TL;DR-Strategie**: § 1.1 + § 1.2
- **EU 2021/821 + Delegierte VO 2025/2003**: § 4.2 ClassificationEngine,
  § 7 Source-of-Truth
- **AWG-Novelle 2026**: § 1 disclaimers (40 Mio. €), § 4.5 Document-Gen
  (§22 AWV recordkeeping)
- **19. Sanktionspaket**: § 4.1 SanctionsScreeningEngine (Art. 5n Russia
  EO/Sat-Nav-Verbot als spezifischer Trigger)
- **De-minimis + FDPR**: § 4.4 DeMinimisCalculator
- **MTCR Cat. I/II + USML XV/IV/XI/XII**: § 4.2 ClassificationEngine
- **OFAC 50%-Rule + Trustee-Case**: § 3.1 TradeParty (`controlType =
control_no_equity` als post-Dec-2025 path), § 4.1
- **ICP-Pflichten**: bleibt im existierenden EXPORT_CONTROL-Layer-1
  (Posture)
- **AGG Nr. 12-47 + EU001-008**: § 4.3 LicenseDeterminationEngine
- **Wettbewerbsanalyse (AEB / Descartes / SAP GTS)**: § 1.2 + § 9 Was-
  weglassen
- **EU Space Act / Deutsches Weltraumgesetz**: nicht in diesem
  Konzept-Scope (separates Modul, das DAS hier referenziert)
- **Cyber Resilience Act / NIS2 / AI Act**: separate Module, nicht hier

---

## Empfohlener nächster Schritt

1. **Lies das Konzept** und beantworte Fragen 1-8 in § 11.
2. **Approve** (oder request changes) den Two-Layer-Split.
3. **Wenn approve** → ich schreibe Sprint-A1-Plan: konkrete
   Migration + Tests + Audit-Verbs + Rate-Limits.
4. **Erstes Coding** ist dann ein 1-Sprint-Spike: nur die Prisma-
   Migration + die Audit-Verbs + ein leerer `/dashboard/trade`
   Stub-Page mit Empty-State. Damit haben wir die Foundation, ohne
   Risiko.
