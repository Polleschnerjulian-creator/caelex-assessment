# CAELEX Full Platform Audit — 08.02.2026

## Gesamtscore: 74 / 100

---

## Bewertungsübersicht

| Kategorie               | Score  | Gewicht  | Gewichtet     |
| ----------------------- | ------ | -------- | ------------- |
| Architektur & Codebase  | 82/100 | 15%      | 12.3          |
| Datenbank & Schema      | 65/100 | 12%      | 7.8           |
| Security                | 81/100 | 15%      | 12.2          |
| Testing                 | 80/100 | 12%      | 9.6           |
| Business Logic / Domain | 77/100 | 15%      | 11.6          |
| API-Architektur         | 62/100 | 10%      | 6.2           |
| UI/UX & Frontend        | 79/100 | 11%      | 8.7           |
| DevOps & CI/CD          | 64/100 | 10%      | 6.4           |
| **GESAMT**              |        | **100%** | **74.8 ~ 74** |

---

## Codebase-Metriken

| Metrik                  | Wert    |
| ----------------------- | ------- |
| Total TS/TSX Dateien    | 516     |
| Total Lines of Code     | 156,936 |
| Production Dependencies | 42      |
| Dev Dependencies        | 28      |
| API Route Handlers      | 138     |
| Page Routes             | 44      |
| React Components        | 142     |
| Service Files           | 24      |
| Data Files              | 18      |
| Test Files              | 65      |
| Test Cases              | 1,661   |
| Test LOC                | 32,975  |
| Prisma Models           | 50      |
| Prisma Enums            | 27      |
| Database Indices        | 108     |
| Middleware LOC          | 374     |
| Prisma Schema LOC       | 2,424   |
| Validations LOC         | 693     |

---

## 1. Architektur & Codebase (82/100)

### Staerken

- 157K Zeilen TypeScript ueber 516 Dateien — substanzielles Produkt, kein Prototyp
- Saubere Schichtenarchitektur: data/ -> lib/ -> components/ -> app/
- Compliance-Engines korrekt als \*.server.ts markiert (nie im Client-Bundle)
- 42 Production Dependencies — kein Dependency-Bloat, jede dient einem klaren Zweck
- TypeScript Strict Mode, Path Aliases, React Strict Mode — alles richtig konfiguriert
- Middleware (374 Zeilen) deckt 5 Sicherheitsbelange ab (Bot-Detection, Size Limits, Rate Limiting, CSRF, Route Protection)
- Maximale Verzeichnistiefe: 10 Ebenen (src/app/api/supervision/incidents/[id]/prepare-report/route.ts)

### LOC-Verteilung nach Verzeichnis

| Verzeichnis                 | Dateien | Zeilen |
| --------------------------- | ------- | ------ |
| lib/ (Business Logic)       | 82      | 30,540 |
| components/                 | 142     | 29,688 |
| app/api/ (Route Handlers)   | 138     | 22,609 |
| data/ (Regulatory Datasets) | 18      | 16,814 |
| app/dashboard/ (Pages)      | 19      | 15,360 |
| app/resources/              | 5       | 1,844  |
| app/legal/                  | 5       | 1,594  |
| hooks/                      | 2       | 616    |
| app/assessment/             | 5       | 119    |
| types/                      | 2       | 69     |

### Schwaechen

- Uebergrosse Page-Komponenten: environmental/page.tsx (1,900 LOC), cybersecurity/page.tsx (1,739 LOC), insurance/page.tsx (1,586 LOC) — brauchen Decomposition unter 500 LOC
- next.config.js noch CommonJS statt ESM/TS
- Nur 2 Custom Hooks fuer 142 Komponenten — wiederverwendbare Logik steckt vermutlich inline in Komponenten
- 138 API-Route-Files mit viel Boilerplate, das in Higher-Order-Functions abstrahiert werden koennte

### next.config.js (259 Zeilen)

- 16 Security Headers konfiguriert
- poweredByHeader: false
- React Strict Mode enabled
- Image Optimization: Google + GitHub remote patterns
- Server Actions: 10MB body size limit
- Webpack: Client-side aliases fuer @react-pdf/renderer, Node built-in fallbacks
- Sentry: Conditional wrapping, hideSourceMaps: true, tunnelRoute /monitoring, automaticVercelMonitors

### Middleware (374 Zeilen)

1. Bot Detection: 12 User-Agent-Blocklist auf Assessment-Endpoints
2. Request Size Limits: 10MB general, 50MB Document-Upload
3. Rate Limiting: Upstash Redis Sliding Window — 100 req/min API, 10 req/min Auth
4. CSRF Protection: Origin/Referer-Validierung + Double-Submit-Cookie mit Constant-Time-Comparison
5. Route Protection: Session-Cookie-Check fuer /dashboard/\*, Login-Redirect fuer /login und /signup

---

## 2. Datenbank & Schema (65/100)

### Staerken

- 2,424 Zeilen Prisma-Schema, 50 Models, 27 Enums, 108 Indizes
- Korrekte Cascade-Deletion (onDelete: Cascade fuer Owned-Entities, SetNull fuer Audit-Logs)
- 4 separate Audit-/Log-Models mit 40+ Security-Event-Types
- Self-referentielle Relationen fuer Comment-Threading, Document-Versioning, Deadline-Recurrence
- Named Relations wo Ambiguitaet besteht (GeneratedReports, CommentReplies, DocumentVersions, RecurringDeadlines, SubmissionResends)
- 1:1 Relations korrekt mit @unique enforced (SupervisionConfig, Subscription, SSOConnection, NotificationPreference)

### Model-Verteilung nach Domain

- Auth/Identity: 4 (User, Account, Session, VerificationToken)
- Multi-Tenancy: 3 (Organization, OrganizationMember, OrganizationInvitation)
- Compliance Tracker: 2 (ArticleStatus, ChecklistStatus)
- Authorization Workflow: 2 (AuthorizationWorkflow, AuthorizationDocument)
- Audit: 2 (AuditLog, SecurityAuditLog)
- Debris: 2 (DebrisAssessment, DebrisRequirementStatus)
- Cybersecurity: 2 (CybersecurityAssessment, CybersecurityRequirementStatus)
- NIS2: 2 (NIS2Assessment, NIS2RequirementStatus)
- Insurance: 2 (InsuranceAssessment, InsurancePolicy)
- Environmental: 3 (EnvironmentalAssessment, EnvironmentalImpactResult, SupplierDataRequest)
- Supplier Portal: 1 (SupplierPortalToken)
- Security Events: 2 (LoginAttempt, SecurityEvent)
- Supervision: 5 (SupervisionConfig, Incident, IncidentAsset, IncidentAttachment, SupervisionReport)
- Calendar: 1 (SupervisionCalendarEvent)
- Timeline: 3 (Deadline, MissionPhase, Milestone)
- Documents: 5 (Document, DocumentAccessLog, DocumentComment, DocumentShare, DocumentTemplate)
- Notifications: 3 (Notification, NotificationPreference, NotificationLog)
- Scheduled Reports: 2 (ScheduledReport, ReportArchive)
- NCA Submissions: 1 (NCASubmission)
- Subscriptions: 1 (Subscription)
- Spacecraft: 1 (Spacecraft)
- Registration: 3 (SpaceObjectRegistration, RegistrationStatusHistory, RegistrationAttachment)
- SSO: 2 (SSOConnection, UserSession)
- API/Webhooks: 4 (ApiKey, ApiRequest, Webhook, WebhookDelivery)
- Collaboration: 2 (Comment, Activity)

### Kritische Schwaechen

1. HYBRIDE TENANCY (Hauptproblem): Alle Assessment-Models (Debris, Cybersecurity, NIS2, Insurance, Environmental, ArticleStatus, ChecklistStatus, AuthorizationWorkflow) linken direkt auf userId OHNE organizationId. Collaboration/API-Models (Comment, Activity, ApiKey, Webhook, Spacecraft) linken auf organizationId. Konsequenz: Org-weite Compliance-Aggregation unmoeglich ohne komplexe Joins, Multi-Org-User koennen Daten nicht partitionieren.

2. KEINE SOFT-DELETES auf Compliance-Daten: Nur Comment hat isDeleted. Alle anderen Models nutzen Hard-Cascade-Delete. Fuer eine Compliance-Plattform, wo Datenaufbewahrung gesetzlich vorgeschrieben sein kann, ist das ein Haftungsrisiko.

3. FEHLENDE INDIZES auf Account.userId und Session.userId — die meistgenutzten NextAuth-Queries. Performance-Problem schon bei moderater Nutzerzahl.

4. Inkonsistente Enum vs. String Nutzung: ~50% der Status-Felder nutzen Prisma-Enums (Deadline, Document, Spacecraft), ~50% nutzen plain String (ArticleStatus, ChecklistStatus, AuthorizationWorkflow, alle Assessment-Models).

5. JSON-in-String-Columns: AuthorizationWorkflow.secondaryNCAs, CybersecurityAssessment.existingCertifications, NIS2Assessment.existingCertifications, AuditLog.previousValue/newValue, SupplierDataRequest.dataRequired/responseData, DocumentTemplate.placeholders, NotificationLog.metadata — sollten Prisma Json nutzen.

6. 4 Redundante Indizes: SupplierPortalToken.token, DocumentShare.shareToken, OrganizationInvitation.token, ApiKey.keyHash (alle haben bereits @unique).

7. Dupliziertes plan-Feld: Organization.plan und Subscription.plan speichern dasselbe — Drift moeglich.

8. Legacy User.organization String-Feld neben dem Organization-Model noch vorhanden.

9. Notification.organizationId ist ein plain String ohne Prisma-Relation (keine referentielle Integritaet).

10. User-Model ist ein Mega-Model mit 23 Relation Fields — zentraler Coupling-Point.

---

## 3. Security (81/100)

### Encryption (B+)

Staerken:

- AES-256-GCM (authentifizierte Verschluesselung mit Confidentiality + Integrity)
- scrypt Key Derivation (memory-hard KDF) statt Raw-Key
- Zufaellige IV pro Verschluesselung via randomBytes(IV_LENGTH)
- Auth Tag Length validiert (16 Bytes)
- Format: iv:authTag:ciphertext
- HMAC-SHA256 fuer searchable encrypted fields (hashForSearch)
- Deklaratives ENCRYPTED_FIELDS Registry

Schwaechen:

- Kein Key-Rotation-Mechanismus (Deployment-Reset noetig)
- Decryption-Failure gibt verschluesselten Ciphertext an Downstream zurueck (Daten-Leak)
- isEncrypted ist Heuristik-basiert (Format-Match koennte False Positive erzeugen)
- Minimale Key-Laenge 32 chars (nur 128 bit Entropie, scrypt kompensiert aber)

### Rate Limiting (A-)

Staerken:

- 7 Tiers: general API (100/min), auth (5/min), registration (3/hr), assessment (10/hr), export (20/hr), sensitive (5/hr), supplier (30/hr)
- Upstash Redis Sliding Window
- Korrekte IP-Extraktion: cf-connecting-ip > x-real-ip > rightmost x-forwarded-for
- IP-Validation mit Regex fuer IPv4 + IPv6
- In-Memory Fallback fuer Development
- Standard Rate-Limit Headers (X-RateLimit-Limit, Remaining, Reset, Retry-After)

Schwaechen:

- Fallback zu "ip:unknown" — alle unbekannten IPs teilen einen Bucket
- In-Memory Fallback hat unbegrenztes Map-Wachstum
- Kein kombiniertes per-user + per-IP Limiting

### Authentication (B+)

Staerken:

- JWT Session Strategy mit 24h Max-Age und 1h Refresh
- Secure Cookie: HttpOnly, SameSite=lax, Secure in Prod, **Secure-/**Host- Prefixes
- Bcrypt 12 Rounds
- Brute Force Protection: 5 Versuche/15min pro Email mit Security-Event-Logging
- Account-Deaktivierung geprueft bei Login, OAuth, Token-Refresh
- Audit Logging fuer Sign-in und Sign-out Events
- Google OAuth mit prompt: "consent", access_type: "offline"

Schwaechen:

- Fail-Open bei DB-Ausfall (OAuth-Login + JWT-Refresh erlauben deaktivierte User)
- Keine JWT-Invalidierung bei Passwortaenderung (bis zu 24h kompromittierte Session)
- Login-Attempt Cleanup Race Condition bei gleichzeitigen Logins

### API Key Auth (B)

Staerken:

- SHA-256 gehashte Keys (nie Klartext gespeichert)
- crypto.randomBytes(32) fuer Key-Generierung
- Prefixed Format (caelex\_) fuer Leak-Scanning
- Scope-basierte Authorization mit Wildcard-Support
- Key-Expiration und Revocation mit Reason-Tracking

Schwaechen:

- Rate Limiting per DB COUNT(\*) statt Redis — Latenz/DB-Last unter hohem Traffic
- SHA-256 ohne HMAC-Secret (kein Server-seitiger Schutz bei DB-Compromise)
- lastUsedAt Update auf jeder Validierung — Write-Contention
- IP-Extraktion nutzt leftmost XFF (spoofbar, inkonsistent mit Rate Limiter)

### Audit Logging (B+)

Staerken:

- 46 Action Types, before/after Values, IP + User Agent
- Batch Logging Support
- Security Events mit Severity Levels (LOW/MEDIUM/HIGH/CRITICAL)
- High-Severity Escalation zu dediziertem Security Logger
- CSV Export mit proper Escaping
- Resolution Tracking
- Non-blocking (Failures brechen Main-Flow nicht)
- Query Limit capped bei 1000

Schwaechen:

- Kein Tamper Protection (keine Hash-Chains, keine Signaturen)
- Keine Immutability-Garantie (UPDATE/DELETE auf Audit-Records moeglich)
- getRequestContext nutzt leftmost XFF (spoofbar)
- Nur User-scoped Queries (kein Cross-User Query ohne Entity-Filter)
- Keine Retention Policy

### RBAC Permissions (A-)

Staerken:

- 5-stufige Hierarchie: OWNER > ADMIN > MANAGER > MEMBER > VIEWER
- 32 granulare Permissions in 10 Kategorien
- Wildcard-Support (global + category)
- canManageRole verhindert Privilege Escalation
- Pure Functions (keine Side Effects, testbar)

Schwaechen:

- OWNER ist all-or-nothing (["*"]) — keine selektive Revocation
- Keine Resource-Level Permissions (nur Org-Level)
- Statisch im Code (keine Custom Roles)
- canManageRole erlaubt Same-Level Management (ADMIN kann ADMIN demoten)
- Keine Middleware-Enforcement (jeder Handler muss selbst pruefen)

### Middleware/CSRF (A-)

Staerken:

- X-Frame-Options DENY, X-Content-Type-Options nosniff
- Zwei-Layer CSRF: Origin/Referer + Double-Submit-Cookie
- CSRF Token mit crypto.getRandomValues (32 Bytes)
- Constant-Time Comparison (XOR-basiert, Timing-Attack-sicher)
- Bot Detection auf Assessment-Endpoints
- Request Size Limits (10MB/50MB)
- Edge-kompatibles Rate Limiting
- Noindex Headers auf API/Dashboard

Schwaechen:

- CSRF nur enforced wenn Cookie existiert ("gradual rollout")
- Bot Detection leicht umgehbar (realistischer UA reicht)
- Potentielles Open Redirect via callbackUrl

### Input Validation (A)

Staerken:

- Umfassende Zod Schemas (693 Zeilen) fuer alle Input-Typen
- Starke Password Policy: 12+ Zeichen, Uppercase, Lowercase, Number, Special
- HTML Sanitization: Two-Pass Strip als Defense-in-Depth
- ReDoS-sichere Patterns
- XSS Prevention via noHtml Pattern
- Max Length Constraints auf allen String-Feldern
- CUID Validation mit striktem Regex
- Webhook URL muss HTTPS sein
- Safe Error Messages in Production (getSafeErrorMessage)

Schwaechen:

- isUserFacingError nutzt Regex-Matching auf Error-Messages (fragil)
- QueryParamsSchema erlaubt page bis 10,000 (teure OFFSET-Queries moeglich)
- Keine File-Content-Validation (nur Metadata)

---

## 4. Testing (80/100)

### Test-Verteilung

| Typ               | Dateien | Test Cases |
| ----------------- | ------- | ---------- |
| Unit Tests        | 41      | 930        |
| Integration Tests | 19      | 640        |
| E2E Tests         | 5       | 91         |
| **Gesamt**        | **65**  | **1,661**  |

### Unit Tests nach Bereich

- unit/components/: 19 Dateien (assessment, results, UI, audit, billing)
- unit/lib/: 10 Dateien (engine, encryption, permissions, validations, pricing, audit)
- unit/services/: 9 Dateien (subscription, notification, organization, spacecraft, API key)
- unit/hooks/: 2 Dateien (keyboard shortcuts, onboarding)
- unit/providers/: 1 Datei (ThemeProvider)

### Integration Tests (19 Dateien)

API Routes: authorization, audit, auth, cybersecurity, dashboard, debris, environmental, insurance, NCA, NIS2, notifications, organizations, registration, supervision, v1
Plus: documents, timeline, tracker, middleware (CSRF, rate limiting)

### E2E Tests (5 Dateien, Playwright)

assessment.spec.ts, documents.spec.ts, full-journey.spec.ts, nis2-assessment.spec.ts, security.spec.ts

### Konfiguration

Vitest:

- Environment: jsdom
- Coverage: v8, Reporters: text, json, html, lcov
- Thresholds: branches 70%, functions/lines/statements 75%
- Pool: forks, isolate: true, fileParallelism: false
- Timeout: 10s test, 10s hooks

Playwright:

- 5 Browser: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- CI: retries 2, single worker, GitHub reporter
- Trace/Screenshot/Video on failure
- Timeouts: 60s global, 15s action, 30s navigation, 10s expect

### Test-Infrastruktur

MSW Handlers: 400 Zeilen, MSW v2, onUnhandledRequest: 'error'
Fixtures: 357 Zeilen, 7 Domains, TypeScript as const, Edge Cases inklusive
Setup: Proper MSW Lifecycle, cleanup, Browser-API-Mocks

### Staerken

- Pyramide gut proportioniert (930 unit / 640 integration / 91 e2e)
- Core Compliance Engines, RBAC, Encryption, Billing alle getestet
- Dedizierte Security E2E Tests (XSS, CSRF, SQLi, Path Traversal, Information Disclosure)
- Multi-Browser/Viewport E2E
- Coverage-Enforcement konfiguriert
- Error-Path Testing konsistent (401, 400, 500)

### Schwaechen

- CSRF-Middleware-Test reimplementiert Logik inline statt Import (Drift-Risiko)
- Fixtures definiert aber underutilized (Engine-Tests bauen eigene Daten inline)
- Keine Snapshot-Tests oder Visual Regression Tests
- Keine Performance-/Load-Tests
- E2E-Tests nutzen fragile text=-Locators statt data-testid
- Incomplete Assertion in engine.test.ts (hasSimplified deklariert, nie asserted)

---

## 5. Business Logic & Domain Expertise (77/100)

### EU Space Act Engine (engine.server.ts)

- 7 Operator-Typen: SCO, LO, LSO, ISOS, CAP, PDP, TCO (+ ALL)
- 119 Artikel gemappt mit korrekten appliesTo-Arrays
- Light Regime: Art. 10 fuer small/research Entities korrekt implementiert
- Constellation Tiering: single -> small (2+) -> medium (10+) -> large (100+) -> mega (1000+)
- TCO-Handling mit separaten Registration-Pfaden (EUSPA vs. NCA)
- Article Filtering: excludes hat Vorrang vor applies_to — korrekte Praezedenz
- Module Status Hierarchie: required > simplified > recommended > not_applicable

### NIS2 Engine (nis2-engine.server.ts)

- Entity Classification: micro (<10/2M), small (<50/10M), medium (50-250), large (>250/50M)
- Space-Sector Exceptions: Micro SATCOM -> important (Art. 2(2)(b)), Medium Ground Infra -> essential (Art. 3(1)(e))
- Incident Timeline: 24h Early Warning, 72h Notification, Intermediate auf Anfrage, 1 Monat Final Report (Art. 23(4))
- Penalties: EUR 10M/2% essential, EUR 7M/1.4% important (Art. 34)
- 51 Requirements mit ECSS-Q-ST-80C Referenzen, GNSS-Spoofing, RF Uplink Command Injection

### Space Law Engine (space-law-engine.server.ts)

- 10 Jurisdiktionen: FR, UK, BE, NL, LU, AT, DK, DE, IT, NO
- Deutschland korrekt als Sonderfall (nur SatDSiG, kein umfassendes Weltraumgesetz)
- Favorability Scoring mit gewichteten Faktoren
- EU Space Act Cross-References (47 Mappings)
- Luxemburg Space Resources Legislation korrekt als Unique Feature

### Service Layer

- Cross-Regulation Service: Unified Compliance Matrix, Overlap Savings (Wochen-Einsparung)
- Authorization Service: State Machine Pattern, Ownership-Verification, automatische + manuelle Transitions
- Incident Response Service: 9 Kategorien, korrekte NCA-Meldepflichten (4h/24h/72h), NIS2-Significance-Pruefung
- Compliance Scoring Service: Module Weights summieren zu 1.0, Critical Failure Override

### IP-Schutz

- server-only Import auf allen Engines
- Dedizierte redact\*ForClient() Funktionen stripping proprietary Fields
- Redacted Types separat definiert (Type-Level Enforcement)
- Lazy Loading der Daten-Module

### Schwaechen

1. CAP-Operator-Mapping fehlt: collision_avoidance_provider defaulted stillschweigend zu spacecraft_operator
2. Race Condition bei generateIncidentNumber() unter Concurrent Requests
3. Dual-Schema fuer Articles: camelCase in articles.ts vs. snake_case in types.ts/JSON
4. Insurance Scoring bestraft Policies ohne Ablaufdatum (koennten unbefristet sein)
5. Application Fee Scoring differenziert nicht nach Kostenhoehe (EUR 500 = EUR 50,000)
6. third_country_no_eu Establishment-Typ wird mehrdeutig gehandhabt
7. Constellation Size null (operatesConstellation=true, size=null) propagiert null zum UI

---

## 6. API-Architektur (62/100)

### Struktur

- 138 route.ts Dateien, 32 Domains
- 7 Public API v1 Routes (/compliance, /spacecraft, /keys, /keys/[keyId], /webhooks, /webhooks/[webhookId], /webhooks/[webhookId]/deliveries)
- ~125 Internal/Authenticated Routes
- 3 Cron Routes (deadline-reminders, document-expiry, generate-scheduled-reports)
- 3 Stripe Routes (checkout, portal, webhooks)

### Dual-Auth-System

- Session-Auth (intern): auth() von NextAuth v5 — aber als Raw-Boilerplate in ~130 Handlers (sollte withSessionAuth Wrapper sein)
- API-Key-Auth (v1): withApiAuth HOF mit Scope-Validation, Rate Limiting, Request Logging

### Staerken

- withApiAuth Pattern fuer v1 ist sauber
- Swagger UI mit Dark Mode und Code-Beispielen in 5 Sprachen (bash, JS, Python, TS, Go)
- Korrekte HTTP Status Codes (200, 201, 400, 401, 403, 404, 413, 429, 500, 503)
- Stripe Webhook Handler gibt HTTP 200 auch bei Fehlern zurueck (korrekte Stripe-Praxis)
- Cron Routes nutzen Timing-Safe Comparison fuer Secret-Validation

### Kritische Schwaechen

1. ZOD-VALIDATION NICHT GENUTZT: Nur ~5% der Routes nutzen die definierten Zod-Schemas. CybersecurityAssessmentSchema, CreateApiKeySchema, CreateWebhookSchema existieren in validations.ts aber werden nicht importiert. 95% der Routes validieren ad-hoc mit typeof/!Array.isArray Checks.

2. 3 VERSCHIEDENE RESPONSE-FORMATE:
   - v1: { data: {...}, meta: { pagination: {...} } } und { error: { message, code } }
   - Internal: Flat-Objects variierend ({ assessments: [...] }, { success: true, document: {...} }, { documents: [...], total: 150 })
   - Signup: { error: "Validation failed", details: {...} }

3. OPENAPI-SPEC DRIFT: Spec dokumentiert Endpoints die nicht existieren (/compliance/score, /reports, /reports/{id}, /incidents, /deadlines). Nur /compliance und /spacecraft sind implementiert. Spec sagt Error-Code ist String ("UNAUTHORIZED"), Implementation liefert Number (401).

4. Kein strukturiertes Logging: console.error in 95% der Routes statt Logger aus lib/logger.ts.

5. Einige POST-Handlers geben 200 statt 201 fuer Resource-Creation zurueck.

---

## 7. UI/UX & Frontend (79/100)

### Component-Architektur

- 142 Komponenten in 20+ Subdirectories
- UI Primitives: Button (5 Variants, 3 Sizes), Card, Input, Select, Badge, Toast — alle mit forwardRef und className-Overrides
- Landing Page: Saubere Composition aus 11 benannten Sections
- Assessment Wizard: State Management + API in AssessmentWizard, Rendering delegiert an QuestionStep + OptionCard
- Alle Komponenten voll typisiert mit expliziten Interfaces

### Design System

Farben:

- navy-950 #0A0F1E (Page Background)
- navy-900 #0F172A (Card Backgrounds)
- navy-800 #1E293B (Elevated Surfaces)
- navy-700 #334155 (Borders)
- slate-400 #94A3B8 (Secondary Text)
- slate-200 #E2E8F0 (Primary Text)
- white #F8FAFC (Headings)
- blue-500 #3B82F6 (Primary Accent)
- green-500 #22C55E (Compliant)
- amber-500 #F59E0B (Warnings)
- red-500 #EF4444 (Critical)

Typography: Pixel-Scale [10px]-[22px] + clamp() fuer Headings
Spacing: Konsistentes Tailwind gap-3/4, px-6, py-2.5, rounded-xl/lg/full
Borders: white/[0.06]-[0.12] Landing, slate-200 dark:white/10 Dashboard
Transitions: duration-300 Landing, duration-200 Dashboard

### Animations (Exzellent)

- Framer Motion: Directional Wizard-Transitions mit AnimatePresence mode="wait"
- Scroll-triggered: useInView mit once: true, margin: "-100px"
- Staggered: Index-basiertes Delay (0.2 + index \* 0.05)
- Micro-Interactions: whileHover scale 1.01, whileTap scale 0.98 auf Buttons
- Toast: Spring Physics (damping: 25, stiffness: 300, mode: "popLayout")
- 3D Entity: Dynamic Import mit ssr: false und Pulsing-Gradient Placeholder

### Accessibility

Gut:

- OptionCard: role="radio", aria-checked, tabIndex, Keyboard Events (Enter/Space)
- QuestionStep: role="radiogroup" mit aria-label
- ProgressBar: role="progressbar", aria-valuenow/min/max, aria-label
- Navigation: aria-label + aria-expanded auf Mobile-Menu

Fehlend:

- TopBar Hamburger-Button: kein aria-label
- Sidebar Close-Button: kein aria-label
- Input/Select: kein htmlFor/id Label-Association
- PlatformPreview Tabs: keine role="tablist"/tab/tabpanel Semantik
- Toast Dismiss: kein aria-label
- Kein Skip-Navigation-Link (WCAG 2.1 Level A Failure)
- Niedrige Kontrast-Werte: text-white/25 ~ 1.8:1 (WCAG AA fordert 4.5:1)

### Responsive Design (Stark)

- clamp() Fluid Typography
- Mobile-Drawer mit fixed/sticky, translate-x, body scroll lock
- Auto-Close bei Resize (768px Threshold)
- Content Hiding: hidden sm:flex, hidden sm:inline
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- CTA Buttons: flex-col sm:flex-row

### Theming (Stark)

- Flash Prevention: Inline Script vor React Hydration liest Theme aus localStorage
- Dual-Mode: Alle UI Primitives mit dark: Prefix
- Landing Page Isolation: .landing-page + .dark-section CSS-Override-System

### UX Patterns

Positiv:

- Anti-Bot: startedAt Zeitstempel im Wizard
- Assessment Persistenz in localStorage + Import im Onboarding (Conversion Funnel)
- Feature Gating: Upgrade-Path mit Plan, Preis, Billing-Link, Lock-Icons
- Section Numbering: "01/11" bis "11/11"
- PlatformPreview: Interactive Tabbed Dashboard-Mockup auf Landing Page

Negativ:

- Hardcoded Admin-Email im Sidebar (cs@ahrensandco.de statt Role-Based)
- font-mono zeigt Inter statt Monospace-Font (Bloomberg-Aesthetik untergraben)
- Keine Skeleton-Loader fuer Dashboard-Daten
- Toast Timeout ohne Cleanup bei Unmount (Memory-Leak)
- OptionCard: Redundanter Ternary (text-white in beiden Branches)

---

## 8. DevOps & CI/CD (64/100)

### GitHub Actions

security.yml (5 Jobs, parallel):

1. Dependency Audit: npm audit --audit-level=moderate (continue-on-error: true)
2. CodeQL Analysis: security-extended Queries
3. Secret Scanning: TruffleHog --only-verified (@main, nicht versioniert)
4. TypeScript Check: tsc --noEmit
5. OWASP Dependency Check: HTML Report (continue-on-error: true)

test.yml (5 Jobs, dependency chain):

1. Lint & Type Check: ESLint + tsc --noEmit
2. Unit & Integration Tests: Postgres 15 Service Container, Prisma db push, Vitest (haengt von lint ab)
3. E2E Tests: Postgres + Playwright Chromium-only (haengt von lint ab)
4. Security Scan: npm audit (continue-on-error: true)
5. Build Check: Next.js build (haengt von unit-tests ab)
6. Coverage Threshold Check: (continue-on-error: true, nicht enforced)

### Pre-Commit (Husky)

1. Secret Detection: API Keys, AWS Keys (AKIA...), Private Key Headers, DB Connection Strings, .env Files
2. lint-staged: ESLint auto-fix + tsc --noEmit + Prettier

### TypeScript

- strict: true (Full Strict Mode)
- noEmit: true
- target: ES2017
- module: esnext, moduleResolution: bundler
- isolatedModules: true
- Tests excluded aus typecheck

### ESLint

- Minimal: nur next/core-web-vitals
- Einzige Custom Rule: react/no-unescaped-entities off
- Kein eslint-plugin-security

### Vercel

3 Cron Jobs:

- /api/cron/deadline-reminders: Daily 08:00 UTC
- /api/cron/document-expiry: Daily 09:00 UTC
- /api/cron/generate-scheduled-reports: Weekly Monday 06:00 UTC

### Sentry (3 Runtimes)

Client:

- Cookie Consent Check (GDPR)
- tracesSampleRate: 0.1 (10%)
- Session Replay: 100% on Error, 10% Session
- Replay masks all text, blocks all media
- Filtert AbortError + Failed to fetch
- Suppressed in Development

Server:

- Conditional auf SENTRY_DSN
- Filtert NEXT_NOT_FOUND + NEXT_REDIRECT
- 10% Trace Sample Rate

Edge:

- Minimal Config, conditional auf SENTRY_DSN

next.config.js Sentry:

- hideSourceMaps: true
- widenClientFileUpload: true
- reactComponentAnnotation: true
- tunnelRoute: /monitoring (Ad-Blocker Bypass)
- automaticVercelMonitors: true
- disableLogger: true

### Commit History

- Neuere Commits: Conventional Commits (fix:, feat:, docs:, refactor:)
- Aeltere Commits: Free-Form (kein Conventional Commits)
- Kein commitlint Hook

### Staerken

- Multi-Layer Security Scanning (CodeQL, TruffleHog, OWASP, npm audit, Pre-Commit)
- Proper Postgres Service Containers in CI
- Sentry auf allen 3 Runtimes mit GDPR-Awareness und Data Masking
- Pre-Commit Secret Detection + lint-staged
- TypeScript Strict Mode ohne Ausnahmen

### Kritische Schwaechen

1. KEIN SECURITY-GATE BLOCKIERT MERGES: Alle Scans nutzen continue-on-error: true
2. COVERAGE-THRESHOLDS NICHT ENFORCED: Nur informativ in CI
3. Kein Dependabot/Renovate
4. Kein CODEOWNERS
5. ESLint minimal (kein eslint-plugin-security)
6. TruffleHog @main (Supply-Chain-Risiko)
7. E2E in CI nur Chromium
8. Tests excluded aus tsconfig.json typecheck
9. .env.example unvollstaendig (Stripe, R2, Resend, LogSnag fehlen)
10. Kein Commit-Message-Enforcement
11. Kein Dockerfile (Vercel-only, keine lokale Paritaet)

---

## Top 5 Staerken

1. **Echte Domain-Expertise**: EU Space Act (119 Artikel), NIS2 (51 Requirements), 10 nationale Jurisdiktionen — monatelange Facharbeit
2. **Security-First-Architektur**: AES-256-GCM, scrypt, bcrypt-12, CSRF Constant-Time, 7-Tier Rate Limiting
3. **Umfassende Test-Suite**: 1,661 Tests mit dedizierter Security E2E Suite
4. **Poliertes Frontend**: Premium Dark-Mode-Design, exzellente Framer Motion Animations, cleverer Conversion-Funnel
5. **Skalierbare Architektur**: Server-only Engines, Lazy Loading, Neon Serverless, Vercel Edge-Compatible

## Top 5 Schwaechen

1. **Hybride Tenancy**: Assessments user-scoped statt org-scoped — echtes Multi-Tenancy unmoeglich
2. **Zod-Validation nicht genutzt**: Schemas existieren, 95% der API-Routes validieren ad-hoc
3. **CI-Pipeline Advisory statt Enforcing**: Security-Scans und Coverage blockieren nie Merges
4. **Keine Soft-Deletes**: Hard-Delete auf regulatorischen Daten ist Haftungsrisiko
5. **OpenAPI-Spec Drift**: Dokumentiert Endpoints die nicht existieren

## Einordnung

| Kontext                    | Bewertung                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Fuer Startup/MVP           | SEHR STARK — weit ueber Durchschnitt von Seed-Stage SaaS                            |
| Fuer Production/Enterprise | NOCH NICHT BEREIT — Multi-Tenancy, Soft-Delete, CI-Enforcement zuerst               |
| Fuer Fundraising           | UEBERZEUGEND — Domain-Tiefe, Security, Tests beeindrucken Due Diligence             |
| Markt-Fit                  | NISCHE MIT TIMING — EU Space Act tritt in Kraft, NIS2 laeuft, regulatorischer Druck |

---

## Priorisierte Roadmap (nach Impact)

### P0 — Kritisch (vor Production)

1. organizationId auf alle Assessment-Models hinzufuegen + Migration
2. Soft-Delete Mechanismus fuer Compliance-Daten (isDeleted + deletedAt)
3. Zod-Validation in allen POST/PUT/PATCH API-Routes aktivieren
4. continue-on-error: true in CI-Workflows durch blocking Gates ersetzen
5. Fehlende Indizes auf Account.userId und Session.userId hinzufuegen

### P1 — Hoch (naechste Iteration)

1. withSessionAuth Wrapper analog zu withApiAuth
2. Einheitliches Response-Envelope fuer interne Routes
3. OpenAPI-Spec mit tatsaechlichen Endpoints synchronisieren
4. Key-Rotation-Mechanismus fuer Encryption
5. JWT-Invalidierung bei Passwortaenderung (passwordChangedAt vs. iat)
6. Konsistente IP-Extraktion (rightmost XFF ueberall)

### P2 — Mittel

1. Page-Komponenten decomposieren (>500 LOC aufteilen)
2. Skeleton-Loader fuer Dashboard-Daten
3. Accessibility Fixes (aria-labels, label-association, skip-nav, Kontraste)
4. Dependabot/Renovate einrichten
5. CODEOWNERS fuer auth/, encryption/, billing/, api/v1/
6. eslint-plugin-security hinzufuegen
7. Enum-Migration fuer verbleibende String-Status-Felder

### P3 — Nice to Have

1. Structured Logging (Logger statt console.error)
2. Commit-Message-Enforcement (commitlint)
3. Visual Regression Tests
4. Performance/Load Tests
5. next.config.ts Migration (ESM)
6. font-mono auf echten Monospace-Font setzen
7. Docker-Compose fuer lokale Development-Paritaet

---

_Audit durchgefuehrt am 08.02.2026. 8 spezialisierte Agenten haben 516 Dateien mit 156,936 Zeilen Code analysiert._
