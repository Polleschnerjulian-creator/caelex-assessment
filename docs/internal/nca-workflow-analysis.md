# NCA-Workflow Analyse — Caelex Platform

**Stand:** 14. März 2026
**Autor:** Julian Polleschner + Claude (Systembericht)
**Scope:** Vollständige Analyse des NCA-Submission-Workflows — IST-Zustand, Architektur, Bugs, Gaps, Empfehlungen

---

## 1. Executive Summary

Das NCA-System (National Competent Authority) ist das operative Herzstück der EU Space Act Autorisierung in Caelex. Es verbindet Compliance-Assessments, Dokumentgenerierung, Korrespondenz-Tracking und Deadline-Monitoring zu einem End-to-End Submission-Workflow.

**Aktueller Zustand:** Funktionsfähig, aber fragmentiert. Zwei parallele Submission-Pfade existieren (alt: Supervision-basiert, neu: Portal-basiert), die auf dieselbe `NCASubmission`-Tabelle schreiben. Mehrere kritische Bugs und fehlende Integrationen verhindern den produktionsreifen Einsatz.

**Kritischste Probleme:**

1. Status-Name-Mismatch im Transition-Guard — bestimmte Status-Übergänge schlagen fehl
2. Generate 2.0 Dokumente sind für den Package-Assembler unsichtbar
3. NCA-Deadline-Cron nicht in `vercel.json` — läuft nicht automatisch in Production
4. Korrespondenz-Service partiell angebunden — `markAsRead`/`markAsResponded` haben keine API-Routes
5. `reportId: "portal-submission"` Hardcoded-Placeholder blockiert den Package-Submit-Flow

---

## 2. Systemarchitektur — Überblick

### 2.1 Drei Subsysteme

| Subsystem                        | Zweck                                               | Einstiegspunkt                                 |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| **NCA Submission Tracker** (alt) | Supervision-Report-basierte Einreichung             | `/api/nca/submit`, SubmissionWizard-Komponente |
| **NCA Portal** (neu)             | Pipeline-View, Packages, Korrespondenz, Analytics   | `/api/nca-portal/*`, `/dashboard/nca-portal`   |
| **Generate 2.0**                 | KI-gestützte Dokumentgenerierung (20 Dokumenttypen) | `/api/generate2/*`, `/dashboard/generate`      |

### 2.2 Datenfluss

```
EU Space Act Art. 6-16 (Autorisierungspflicht)
    |
    v
determineNCA() [src/data/ncas.ts]
    → NCADetermination (Behörde, Pathway, Artikel, Anforderungen)
    |
    v
AuthorizationWorkflow [Prisma]
    ← WorkflowEngine [src/lib/workflow/]
    States: not_started → in_progress → ready_for_submission → submitted → approved
    |
    v (Submit-Transition)
assemblePackage() [nca-portal-service.ts]
    → Zieht: Assessments (Debris, Cyber, Insurance, Env, NIS2) + Vault Docs + Generated Docs
    → Gegen: authorization-documents.ts Templates (16 Typen, Art. 7-9)
    → Ergebnis: SubmissionPackage mit completenessScore
    |
    v
submitToNCA() [nca-submission-service.ts]
    → Erstellt: NCASubmission mit statusHistory JSON
    → Methode: PORTAL | EMAIL | API | REGISTERED_MAIL | IN_PERSON
    |
    v (Lifecycle)
updateSubmissionStatus() → statusHistory append
NCACorrespondence → Korrespondenz-Threading
    |
    v (Monitoring)
/api/cron/nca-deadlines (täglich)
    → Checks: followUpDeadline, slaDeadline, stale SUBMITTED, NIS2 Incident Phases
    → Sends: notifyUser() → Notification + Email
    |
    v (Audit)
logAuditEvent() → AuditLog [SHA-256 Hash-Chain, manipulationssicher]
    |
    v (Attestierung)
VerityAttestation → HMAC-signierte Compliance-Claims, optional Sentinel-verankert
```

---

## 3. Datenbank-Modelle

### 3.1 NCASubmission (Kern-Tabelle)

| Feld                   | Typ                     | Zweck                                                     |
| ---------------------- | ----------------------- | --------------------------------------------------------- |
| `id`                   | String (CUID)           | Primary Key                                               |
| `userId`               | FK → User               | Eigentümer                                                |
| `reportId`             | FK → SupervisionReport  | Verknüpfter Bericht                                       |
| `ncaAuthority`         | Enum (22 Werte)         | Zuständige Behörde (DE_BMWK, FR_CNES, IT_ASI, ..., EUSPA) |
| `ncaAuthorityName`     | String                  | Denormalisierter Anzeigename                              |
| `submissionMethod`     | Enum                    | PORTAL, EMAIL, API, REGISTERED_MAIL, IN_PERSON            |
| `status`               | NCASubmissionStatus     | Aktueller Status (siehe State Machine)                    |
| `statusHistory`        | Json                    | Array von `{status, timestamp, notes}`                    |
| `ncaReference`         | String?                 | NCA-vergebene Referenznummer                              |
| `coverLetter`          | Text?                   | Anschreiben                                               |
| `attachments`          | Json                    | `[{fileName, fileSize, fileUrl}]`                         |
| `followUpRequired`     | Boolean                 | Follow-Up nötig?                                          |
| `followUpDeadline`     | DateTime?               | Frist für Follow-Up                                       |
| `slaDeadline`          | DateTime?               | SLA-Frist                                                 |
| `priority`             | SubmissionPriority      | URGENT, HIGH, NORMAL, LOW                                 |
| `packageId`            | FK → SubmissionPackage? | Verknüpftes Dokumentpaket                                 |
| `originalSubmissionId` | FK → Self?              | Für Resends                                               |
| `resendCount`          | Int                     | Anzahl Neusendungen                                       |

### 3.2 NCACorrespondence

| Feld                    | Typ                | Zweck                                               |
| ----------------------- | ------------------ | --------------------------------------------------- |
| `submissionId`          | FK → NCASubmission | Zugehörige Einreichung                              |
| `direction`             | INBOUND / OUTBOUND | Richtung                                            |
| `messageType`           | Enum               | EMAIL, LETTER, PORTAL_MSG, PHONE_CALL, MEETING_NOTE |
| `subject`, `content`    | Text               | Nachrichteninhalt                                   |
| `sentAt` / `receivedAt` | DateTime?          | Auto-gesetzt je nach Direction                      |
| `isRead`                | Boolean            | Gelesen-Status                                      |
| `requiresResponse`      | Boolean            | Antwort erforderlich?                               |
| `responseDeadline`      | DateTime?          | Antwortfrist                                        |

### 3.3 SubmissionPackage

| Feld                | Typ   | Zweck                                                   |
| ------------------- | ----- | ------------------------------------------------------- |
| `documents`         | Json  | `[{sourceType, sourceId, documentType, title, status}]` |
| `completenessScore` | Float | 0–100, basierend auf required vs. found                 |
| `requiredDocuments` | Json  | Liste erforderlicher Dokumenttypen                      |
| `missingDocuments`  | Json  | Fehlende Dokumente                                      |

### 3.4 NCADocPackage + NCADocument (Generate 2.0)

Separates System für KI-generierte Dokumente. `NCADocPackage` = Container für bis zu 20 Dokumente. `NCADocument` = Einzeldokument mit Status (DRAFT → GENERATING → COMPLETED → EXPORTED), Section-Content als JSON, Token-Metriken, Versionierung (Self-FK).

---

## 4. State Machine — Submission Lifecycle

### 4.1 Schema-definierte Status

```
DRAFT → SUBMITTED → RECEIVED → UNDER_REVIEW → INFORMATION_REQUESTED
                                              → ACKNOWLEDGED → APPROVED
                                              → REJECTED
                                              → WITHDRAWN
```

### 4.2 Tatsächliche Transition-Map (Code)

```typescript
// src/app/api/nca/submissions/[id]/route.ts
DRAFT                    → [PENDING_SUBMISSION]        // BUG: PENDING_SUBMISSION existiert nicht im Schema
PENDING_SUBMISSION       → [SUBMITTED, DRAFT]          // BUG: PENDING_SUBMISSION existiert nicht im Schema
SUBMITTED                → [ACKNOWLEDGED, UNDER_REVIEW, REJECTED]
ACKNOWLEDGED             → [UNDER_REVIEW, APPROVED, REJECTED]
UNDER_REVIEW             → [APPROVED, REJECTED, ADDITIONAL_INFO_REQUIRED]  // BUG: != INFORMATION_REQUESTED
ADDITIONAL_INFO_REQUIRED → [SUBMITTED]                 // BUG: Dieser Status existiert nicht
APPROVED                 → []                          // Terminal
REJECTED                 → [DRAFT]
```

### 4.3 BUG: Status-Name-Mismatch

**Schweregrad: KRITISCH**

Der API-Route-Handler verwendet `PENDING_SUBMISSION` und `ADDITIONAL_INFO_REQUIRED` in seiner Transition-Map, aber das Prisma-Schema (`NCASubmissionStatus` Enum) kennt nur:

- `DRAFT`, `SUBMITTED`, `RECEIVED`, `UNDER_REVIEW`, `INFORMATION_REQUESTED`, `ACKNOWLEDGED`, `APPROVED`, `REJECTED`, `WITHDRAWN`

**Auswirkung:**

- Transition `DRAFT → PENDING_SUBMISSION` schlägt auf Prisma-Ebene fehl (ungültiger Enum-Wert)
- Transition `UNDER_REVIEW → ADDITIONAL_INFO_REQUIRED` schlägt fehl (sollte `INFORMATION_REQUESTED` sein)
- `SUBMITTED → RECEIVED` fehlt komplett in der Map

**Fix:** Transition-Map an Prisma-Enum angleichen, `RECEIVED` als Zielstatus hinzufügen.

---

## 5. API-Endpunkte — Vollständige Auflistung

### 5.1 NCA Submission Tracker (`/api/nca/`)

| Method | Route                              | Funktion                                                                         |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/nca/submissions`             | Liste aller Submissions (Filter: reportId, authority, status, Datum, Pagination) |
| POST   | `/api/nca/submit`                  | Neue Submission aus SupervisionReport erstellen                                  |
| GET    | `/api/nca/submissions/[id]`        | Detail einer Submission                                                          |
| PATCH  | `/api/nca/submissions/[id]`        | Status-Update (State Machine)                                                    |
| POST   | `/api/nca/submissions/[id]/resend` | Neusendung (bei REJECTED/INFORMATION_REQUESTED)                                  |

### 5.2 NCA Portal (`/api/nca-portal/`)

| Method | Route                                             | Funktion                                                                      |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/nca-portal/dashboard`                       | KPIs: activeSubmissions, pendingFollowUps, upcomingDeadlines, avgResponseDays |
| GET    | `/api/nca-portal/pipeline`                        | Kanban-View gruppiert nach Status                                             |
| GET    | `/api/nca-portal/analytics`                       | Per-Authority Genehmigungsraten, Response-Zeiten, 12-Monats-Trend             |
| GET    | `/api/nca-portal/packages`                        | Liste aller Packages                                                          |
| POST   | `/api/nca-portal/packages`                        | Package zusammenstellen (scannt 7 Datenquellen)                               |
| GET    | `/api/nca-portal/packages/[id]`                   | Package-Detail                                                                |
| POST   | `/api/nca-portal/packages/[id]/submit`            | Package als NCASubmission einreichen                                          |
| GET    | `/api/nca-portal/submissions/[id]/correspondence` | Korrespondenz-Thread                                                          |
| POST   | `/api/nca-portal/submissions/[id]/correspondence` | Neue Korrespondenz hinzufügen                                                 |
| PATCH  | `/api/nca-portal/submissions/[id]/priority`       | Priorität ändern                                                              |
| GET    | `/api/nca-portal/submissions/[id]/timeline`       | Unified Timeline (Status + Korrespondenz)                                     |

### 5.3 Generate 2.0 (`/api/generate2/`)

| Method | Route                                    | Funktion                                   |
| ------ | ---------------------------------------- | ------------------------------------------ |
| GET    | `/api/generate2/readiness`               | Readiness-Scores für alle 20 Dokumenttypen |
| POST   | `/api/generate2/documents`               | Dokumentgenerierung initiieren             |
| POST   | `/api/generate2/documents/[id]/section`  | Einzelne Section generieren (Claude API)   |
| POST   | `/api/generate2/documents/[id]/complete` | Generierung abschließen                    |
| POST   | `/api/generate2/documents/[id]/export`   | PDF-Export                                 |
| POST   | `/api/generate2/package`                 | NCADocPackage erstellen                    |

### 5.4 Cron

| Route                     | Schedule                 | Funktion                                                        |
| ------------------------- | ------------------------ | --------------------------------------------------------------- |
| `/api/cron/nca-deadlines` | **NICHT in vercel.json** | Follow-Up-Fristen, SLA, Stale Submissions, NIS2 Incident Phases |

---

## 6. Frontend — Seiten und Komponenten

### 6.1 Seitenstruktur

| Route                                    | Datei         | Status                                              |
| ---------------------------------------- | ------------- | --------------------------------------------------- |
| `/dashboard/nca-portal`                  | `client.tsx`  | Funktionsfähig — Dashboard + Pipeline Kanban        |
| `/dashboard/nca-portal/submissions/[id]` | Detail-Seite  | Funktionsfähig — Timeline + Korrespondenz + Actions |
| `/dashboard/nca-portal/packages/new`     | 3-Step Wizard | Teilweise — Placeholder `reportId` blockiert Submit |

### 6.2 Portal-Komponenten (`src/components/nca-portal/`)

| Komponente                   | LOC | Status | Beschreibung                                                    |
| ---------------------------- | --- | ------ | --------------------------------------------------------------- |
| `PortalStats.tsx`            | —   | Aktiv  | 4 KPI-Karten (Active, Pending, Deadlines, Avg Response)         |
| `SubmissionPipeline.tsx`     | —   | Aktiv  | Kanban mit 5 Spalten, Status-Merging                            |
| `SubmissionCard.tsx`         | —   | Aktiv  | Kanban-Karte mit Authority-Flag, Priority, SLA-Warning          |
| `CorrespondenceForm.tsx`     | —   | Aktiv  | Modal für INBOUND/OUTBOUND Kommunikation                        |
| `SubmissionActions.tsx`      | —   | Aktiv  | Priority-Dropdown + Status-Buttons (Received, Withdraw, Resend) |
| `NCAInfoCard.tsx`            | —   | Aktiv  | NCA-Auswahl im Package-Builder                                  |
| `TimelineEntry.tsx`          | —   | Aktiv  | Timeline-Event-Renderer                                         |
| `PackageCompletenessBar.tsx` | —   | Aktiv  | Fortschrittsbalken mit Farbschwellen                            |

### 6.3 Legacy-Komponenten (`src/components/nca/`)

| Komponente                 | Status                 | Beschreibung                               |
| -------------------------- | ---------------------- | ------------------------------------------ |
| `SubmissionWizard.tsx`     | **Vermutlich tot**     | 3-Step Modal aus Supervision-Modul         |
| `SubmissionStatusCard.tsx` | **Nicht referenziert** | Detail-Karte — nirgends importiert         |
| `SubmissionHistory.tsx`    | **Nicht referenziert** | Filterliste — nirgends importiert          |
| `AcknowledgmentForm.tsx`   | **Nicht referenziert** | Bestätigungsformular — nirgends importiert |

### 6.4 User Journey (Primary Path)

```
1. /dashboard/nca-portal
   → PortalStats (4 KPIs)
   → SubmissionPipeline (Kanban)
   → Recent Correspondence List

2. Click "Assemble Package" → /dashboard/nca-portal/packages/new
   Step 1: NCA auswählen (11 Authorities im Grid)
   Step 2: Package Review (Completeness-Score, Missing Docs)
   Step 3: Methode + Cover Letter → Submit

3. → /dashboard/nca-portal/submissions/[id]
   → Timeline (Status-Änderungen + Korrespondenz)
   → SubmissionActions (Priority, Status-Transitions)
   → CorrespondenceForm (Kommunikation loggen)
```

---

## 7. Regulatorischer Kontext

### 7.1 EU Space Act Bezug

- **Art. 6**: Autorisierungspflicht — Kern des gesamten NCA-Workflows
- **Art. 7**: Cross-Border Koordination zwischen NCAs bei Launch-Operatoren
- **Art. 8**: Antragsinhalte — definiert die 16 Dokumenttypen in `authorization-documents.ts`
- **Art. 10**: Light Regime (Spacecraft <100kg, <5 Jahre, LEO <600km) — reduzierte Anforderungen
- **Art. 14-16**: Drittstaaten-Operatoren → EUSPA statt nationale NCA
- **Art. 96-110**: NCA-Befugnisse, Inspektionen, Sanktionen (bis EUR 10M oder 2% Umsatz)

### 7.2 NCA-Routing Logik

`determineNCA()` in `src/data/ncas.ts` bestimmt:

- **primaryNCA**: Basierend auf Establishment Country
- **secondaryNCAs**: Bei Cross-Border Launch
- **pathway**: `national_authorization` | `euspa_registration` | `commission_decision`
- **relevantArticles**: Spezifische EU Space Act Artikel
- **estimatedTimeline**: Geschätzte Bearbeitungszeit

### 7.3 Meldepflichten (9 Typen)

| Pflicht            | Frequenz     | Empfänger                 | Rechtsgrundlage |
| ------------------ | ------------ | ------------------------- | --------------- |
| Annual Compliance  | Jährlich     | Primary NCA               | Art. 21         |
| Incident Report    | Sofort       | Primary NCA + EUSPA       | Art. 83         |
| Cybersecurity      | 24h Initial  | NCA + CSIRT               | Art. 83 + NIS2  |
| Conjunction        | 72h          | NCA + SST                 | Art. 67         |
| Significant Change | 30 Tage      | Primary NCA               | Art. 12         |
| EOL Update         | Jährlich     | Primary NCA               | Art. 31         |
| Debris Event       | Sofort       | NCA + Space Debris Office | Art. 35         |
| Insurance          | Bei Änderung | Primary NCA               | Art. 44         |
| Ownership Transfer | 60 Tage      | Primary NCA               | Art. 15         |

### 7.4 Cross-Regulation Overlap

NIS2 Art. 21 ↔ EU Space Act Art. 74 (Cybersecurity) haben signifikanten Overlap. Der `cross-regulation-service.ts` quantifiziert: ~40% der NIS2-Anforderungen sind durch EU Space Act bereits abgedeckt. Das bedeutet ein Cybersecurity-Assessment-Dokument im NCA-Package deckt beide Regulierungen ab.

---

## 8. Package Assembly — Was wird gezogen?

### 8.1 Datenquellen (7 parallele Queries)

| Quelle                   | Prisma-Modell                   | Mapping im Package           |
| ------------------------ | ------------------------------- | ---------------------------- |
| Document Vault           | `Document`                      | By `category`                |
| Legacy Generated Docs    | `GeneratedDocument` (COMPLETED) | By `documentType`            |
| Debris Assessment        | `DebrisAssessment`              | → `debris_mitigation_plan`   |
| Cybersecurity Assessment | `CybersecurityAssessment`       | → `cybersecurity_assessment` |
| Insurance Assessment     | `InsuranceAssessment`           | → `insurance_proof`          |
| Environmental Assessment | `EnvironmentalAssessment`       | → `environmental_assessment` |
| NIS2 Assessment          | `NIS2Assessment`                | → `nis2_assessment`          |

### 8.2 Required Documents (16 Templates)

Definiert in `src/data/authorization-documents.ts`, kategorisiert als:

- **Technical**: Orbital Analysis, DMP, Cybersecurity Plan, Frequency Coordination
- **Legal**: Operator License, Insurance Certificate, Registration Application
- **Financial**: Financial Guarantee, Business Plan
- **Environmental**: Environmental Impact Assessment
- **Safety**: Hazard Analysis, Launch Safety Plan

Jedes Template hat `articleRef` (EU Space Act), `required` Flag, `applicableTo` (Operator-Typen), `estimatedEffort`.

### 8.3 GAP: Generate 2.0 nicht integriert

**Schweregrad: HOCH**

`assemblePackage()` scannt `GeneratedDocument` (Legacy-System) aber **nicht** `NCADocument` (Generate 2.0). Wenn ein Operator seinen DMP über Generate 2.0 erstellt, erscheint er im Package als "missing". Die beiden Dokumentsysteme sind nicht verbunden.

---

## 9. Dokumentgenerierung (Generate 2.0)

### 9.1 20 Dokumenttypen

DMP (Debris Mitigation Plan), Orbital Lifetime Analysis, Cybersecurity Assessment, Frequency Coordination, Registration Application, Insurance Certificate, Environmental Impact, Launch Safety, Contingency Procedures, Ground Segment, Data Protection, Spectrum Management, End-of-Life Plan, Passivation Plan, Collision Avoidance, Space Weather Response, Anomaly Response, Decommissioning, Financial Guarantee, Hazard Report.

### 9.2 Generierungsflow

1. `POST /api/generate2/documents` → Readiness berechnen, Prompt bauen, `NCADocument` erstellen (GENERATING)
2. Client iteriert Sections → `POST /documents/[id]/section` (Claude claude-sonnet-4-6, max_tokens=3072, Prompt Caching)
3. `POST /documents/[id]/complete` → Sections stitchen, Placeholders zählen, Status COMPLETED
4. `POST /documents/[id]/export` → PDF, Status EXPORTED

### 9.3 Readiness-Scoring

Gewichtetes Scoring: `critical=3, important=2, nice=1`. Prüft Verfügbarkeit von Assessment-Daten pro Dokumenttyp. Score 0–100 entscheidet über "generierbar" vs. "zu wenig Daten".

---

## 10. Korrespondenz-Tracking

### 10.1 Implementiert

- `createCorrespondence()` — INBOUND/OUTBOUND mit 5 Nachrichtentypen
- `getCorrespondence()` — Thread für eine Submission
- Timeline-Integration — Korrespondenz erscheint in der Unified Timeline

### 10.2 GAP: Fehlende API-Routes

| Service-Funktion                       | API-Route                 | Status          |
| -------------------------------------- | ------------------------- | --------------- |
| `createCorrespondence()`               | POST `.../correspondence` | Vorhanden       |
| `getCorrespondence()`                  | GET `.../correspondence`  | Vorhanden       |
| `markAsRead()`                         | —                         | **Keine Route** |
| `markAsResponded()`                    | —                         | **Keine Route** |
| `getUnreadCorrespondence()`            | —                         | **Keine Route** |
| `getCorrespondenceRequiringResponse()` | —                         | **Keine Route** |

### 10.3 GAP: Keine Datei-Uploads

`CorrespondenceForm.tsx` hat keinen File-Input. Das `attachments`-Feld existiert im API-Schema, aber die UI bietet keine Upload-Möglichkeit.

---

## 11. Deadline-Monitoring

### 11.1 Cron-Checks (4 NCA-spezifisch + 2 Cross-Cutting)

| Check                   | Trigger                                 | Notification                    |
| ----------------------- | --------------------------------------- | ------------------------------- |
| Follow-Up in 3 Tagen    | `followUpDeadline ≤ now+3d`             | NCA_DEADLINE_APPROACHING        |
| Überfälliges Follow-Up  | `followUpRequired + deadline < now`     | NCA_FOLLOW_UP_REQUIRED (URGENT) |
| Stale Submission (>14d) | `status=SUBMITTED, updatedAt < 14d ago` | NCA_STATUS_CHANGED              |
| SLA in 3 Tagen          | `slaDeadline ≤ now+3d`                  | NCA_DEADLINE_APPROACHING        |
| GDPR Breach Escalation  | Art. 33 72h Frist                       | Breach-spezifisch               |
| NIS2 Incident Phases    | Phase-Deadlines                         | 4 Severity-Stufen               |

### 11.2 GAP: slaDeadline und estimatedResponseDate nie automatisch gesetzt

Diese Felder existieren auf `NCASubmission`, werden vom Cron/Dashboard gelesen, aber **kein Service setzt sie programmatisch**. Sie müssen manuell oder über eine fehlende Auto-Berechnung befüllt werden.

### 11.3 GAP: Cron nicht in vercel.json

**Schweregrad: KRITISCH**

`/api/cron/nca-deadlines` ist implementiert aber nicht in `vercel.json` konfiguriert. Der Cron wird in Production **nicht** automatisch ausgeführt.

---

## 12. Verity-Integration (Kryptografische Attestierung)

### 12.1 Ablauf

1. Operator generiert `VerityAttestation` für eine Regulierung (z.B. Art. 35 Debris)
2. Attestation enthält: `claim` (Ergebnis + Schwellenwert), `evidence` (Quelle + Trust-Level), `signature` (HMAC)
3. Optional: `sentinel_anchor` — Verknüpfung mit Live-Telemetriedaten
4. Attestation kann in NCA-Packages als maschinenverifizierbare Compliance-Evidenz eingebunden werden
5. Öffentliche Verifikation: `/verity/verify`

### 12.2 GAP: Nicht in Package-Assembly integriert

`assemblePackage()` scannt keine `VerityAttestation`-Records. Attestierungen existieren parallel, aber fließen nicht automatisch in Submission-Packages ein.

---

## 13. Audit Trail

- Jede Status-Änderung → `AuditLog` Entry via `logAuditEvent()`
- **SHA-256 Hash-Chain**: Jeder Eintrag referenziert den Hash des vorherigen → manipulationssicher
- Logged Actions: `workflow_status_changed`, `workflow_submit`, `NCA_REPORT_SUBMITTED`
- `statusHistory` JSON auf `NCASubmission` — redundant zum AuditLog, aber UI-optimiert für Timeline

---

## 14. Vollständige Bug- und Gap-Liste

### 14.1 Kritisch (Blockiert Core Functionality)

| #   | Problem                                                                                                       | Ort                                                | Impact                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| B1  | **Status-Name-Mismatch**: `PENDING_SUBMISSION` und `ADDITIONAL_INFO_REQUIRED` existieren nicht im Prisma-Enum | `/api/nca/submissions/[id]/route.ts` L31           | Transitions schlagen fehl, Submissions bleiben stuck          |
| B2  | **NCA-Deadline-Cron nicht in vercel.json**                                                                    | `vercel.json`                                      | Keine automatischen Deadline-Benachrichtigungen in Production |
| B3  | **reportId Placeholder**: `"portal-submission"` hardcoded im Package-Builder                                  | `/dashboard/nca-portal/packages/new/page.tsx` L158 | Package-Submit braucht echte SupervisionReport ID             |

### 14.2 Hoch (Wichtige Funktion fehlt)

| #   | Problem                                                       | Ort                                         | Impact                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| G1  | **Generate 2.0 nicht in Package-Assembly**                    | `nca-portal-service.ts` `assemblePackage()` | KI-generierte Dokumente als "missing" angezeigt |
| G2  | **Korrespondenz-Aktionen ohne API-Routes**                    | `nca-correspondence-service.ts`             | markAsRead, markAsResponded nicht erreichbar    |
| G3  | **slaDeadline/estimatedResponseDate nie automatisch gesetzt** | `NCASubmission` Modell                      | Deadline-Monitoring greift ins Leere            |
| G4  | **Keine Datei-Uploads in Korrespondenz**                      | `CorrespondenceForm.tsx`                    | Attachments nur API-seitig, kein UI             |
| G5  | **Analytics-Route existiert, aber kein Frontend**             | `/api/nca-portal/analytics`                 | Daten vorhanden, aber nirgends visualisiert     |

### 14.3 Mittel (Architektur-Schulden)

| #   | Problem                                                           | Ort                                                                | Impact                                   |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| D1  | **Zwei parallele Submission-Pfade**                               | SubmissionWizard vs. PackageBuilder                                | Verwirrung, doppelte Logik               |
| D2  | **NCA Authority-Daten dupliziert**                                | `NCA_OPTIONS` (11, keine URLs) vs. `NCA_AUTHORITY_INFO` (21, voll) | UI zeigt Subset, Service hat mehr        |
| D3  | **SubmissionPackage vs. NCADocPackage** — zwei "Package"-Konzepte | Prisma Schema                                                      | Nicht verknüpft, erzeugt Verwirrung      |
| D4  | **statusHistory als JSON-String statt Relation**                  | `NCASubmission.statusHistory`                                      | Kein Index, Parse-Risiko                 |
| D5  | **4 Legacy-Komponenten in `src/components/nca/`**                 | SubmissionWizard, StatusCard, History, AcknowledgmentForm          | Nicht referenziert, Dead Code            |
| D6  | **updatePriority() dupliziert**                                   | nca-submission-service + nca-portal-service                        | Identische Implementierung, Drift-Risiko |
| D7  | **DOCX-Export nur Stub** (501)                                    | `/api/generate2/documents/[id]/export`                             | "Phase 2" — nie implementiert            |

---

## 15. Empfehlungen

### 15.1 Sofort-Fixes (Quick Wins)

#### E1: Transition-Map fixen

```diff
- DRAFT → [PENDING_SUBMISSION]
+ DRAFT → [SUBMITTED]
- UNDER_REVIEW → [APPROVED, REJECTED, ADDITIONAL_INFO_REQUIRED]
+ UNDER_REVIEW → [APPROVED, REJECTED, INFORMATION_REQUESTED]
+ SUBMITTED → [RECEIVED, ACKNOWLEDGED, UNDER_REVIEW, REJECTED]
+ INFORMATION_REQUESTED → [SUBMITTED]
```

Aufwand: 30 Min

#### E2: nca-deadlines Cron in vercel.json

```json
{ "path": "/api/cron/nca-deadlines", "schedule": "0 7 * * *" }
```

Aufwand: 5 Min

#### E3: Generate 2.0 in assemblePackage() integrieren

Achte Query hinzufügen: `prisma.nCADocument.findMany({ where: { organizationId, status: "COMPLETED" } })`.
Aufwand: 1h

### 15.2 Kurzfristig (Sprint)

#### E4: Korrespondenz-API-Routes vervollständigen

- `PATCH /api/nca-portal/submissions/[id]/correspondence/[corrId]` → markAsRead / markAsResponded
- `GET /api/nca-portal/correspondence/unread` → Unread-Badge im Sidebar
  Aufwand: 3h

#### E5: SLA-Deadline Auto-Berechnung

Bei `submitToNCA()` automatisch `slaDeadline` setzen basierend auf NCA-Authority-spezifischer erwarteter Bearbeitungszeit (z.B. DE_BMWK: 90 Tage, FR_CNES: 60 Tage). Werte aus `NCA_AUTHORITY_INFO` ableiten.
Aufwand: 2h

#### E6: Analytics-Page im Portal

Route `/dashboard/nca-portal/analytics` mit Charts: Genehmigungsraten pro NCA, Response-Zeiten, Submission-Volume 12 Monate. API existiert bereits.
Aufwand: 4h

#### E7: reportId-Placeholder im Package-Builder beheben

Entweder: (a) Package-Submit ohne SupervisionReport ermöglichen (neues Schema-Feld `reportId` optional machen), oder (b) Report-Selector in den Wizard einbauen.
Aufwand: 2-4h

### 15.3 Mittelfristig (Quartal)

#### E8: Submission-Pfade konsolidieren

Legacy SubmissionWizard + Supervision-Flow deprecaten. Einziger Pfad: NCA Portal → Package Assembly → Submit. Dead Code in `src/components/nca/` entfernen.

#### E9: Datei-Upload für Korrespondenz

`FileUploader.tsx` (existiert im Projekt für Document Vault) in `CorrespondenceForm` integrieren. Upload zu R2/S3, URL in `attachments` JSON.

#### E10: Verity-Attestierungen in Packages

`assemblePackage()` um Verity-Query erweitern. Attestierungen als maschinenverifizierbare Evidenz-Dokumente in Package aufnehmen. Besonders wertvoll für Sentinel-verankerte Claims.

#### E11: SubmissionPackage ↔ NCADocPackage verknüpfen

FK `docPackageId` auf `SubmissionPackage` hinzufügen. Package-Builder soll Generate-2.0-Packages als Quelle anbieten.

#### E12: Drag-and-Drop Kanban

`@dnd-kit` ist bereits im Projekt. Submissions per Drag zwischen Status-Spalten verschieben (löst automatisch PATCH auf den Submission-Status aus).

### 15.4 Langfristig (Vision)

#### E13: NCA-Portal als eigenständiger Bereich

Eigene Sub-Navigation (ähnlich Assure): Dashboard, Pipeline, Packages, Korrespondenz, Analytics, Deadlines. Aktuell ist alles in 3 Seiten gequetscht.

#### E14: Automatische NCA-Portal-Integration

Für NCAs die ein API/Portal anbieten (DE_BMWK, FR_CNES): Direkte Einreichung über API statt manueller Upload. Status-Polling vom NCA-Portal.

#### E15: statusHistory als eigene Tabelle

`NCASubmissionStatusChange` Modell mit Timestamps, User-FK, Notes. Ermöglicht indizierte Queries auf Status-Verlauf, eliminiert JSON-Parse-Risiko.

---

## 16. Priorisierungsmatrix

| Priorität | Item                         | Aufwand | Impact                         |
| --------- | ---------------------------- | ------- | ------------------------------ |
| P0        | E1: Transition-Map fixen     | 30 Min  | Unblocks alle Status-Updates   |
| P0        | E2: Cron in vercel.json      | 5 Min   | Aktiviert Deadline-Monitoring  |
| P1        | E3: Generate 2.0 in Package  | 1h      | Zeigt KI-Docs als vorhanden    |
| P1        | E7: reportId-Placeholder fix | 2h      | Package-Submit funktioniert    |
| P1        | E5: SLA Auto-Berechnung      | 2h      | Deadline-Monitoring sinnvoll   |
| P2        | E4: Korrespondenz-Routes     | 3h      | Read/Response-Tracking         |
| P2        | E6: Analytics Page           | 4h      | Daten bereits vorhanden        |
| P3        | E8: Pfade konsolidieren      | 8h      | Architektur-Bereinigung        |
| P3        | E9: File Upload              | 4h      | Korrespondenz-Attachments      |
| P4        | E10-E15                      | Wochen  | Strategische Weiterentwicklung |

---

## 17. Zusammenfassung

Das NCA-System hat ein solides Fundament: 22 API-Endpunkte, 5 Prisma-Modelle, KI-Dokumentgenerierung, Korrespondenz-Tracking, Deadline-Monitoring und kryptografische Attestierung. Die regulatorische Basis (EU Space Act Art. 6-110, NCA-Routing, 16 Dokumenttemplates, 9 Meldepflichten) ist vollständig encoded.

**Was fehlt ist die letzte Meile**: Die Transition-Map hat einen Status-Bug der Status-Updates blockiert, der Cron läuft nicht, Generate 2.0 speist nicht in Packages ein, und 4 Service-Funktionen haben keine API-Routes. Mit den 7 Quick-Wins (E1-E7, zusammen ~12h Aufwand) wäre das System production-ready für den ersten End-to-End NCA-Submission-Flow.

Die langfristige Vision — eigener NCA-Bereich, direkte API-Integration mit NCAs, Drag-and-Drop Pipeline, Verity-verankerte Evidenz — würde Caelex als das führende NCA-Submission-Tool für EU Space Act Compliance positionieren.
