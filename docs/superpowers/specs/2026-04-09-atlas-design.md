# ATLAS — Space Regulatory Intelligence Dashboard

> **For agentic workers:** This is the design spec. Implementation plan will be created separately via the writing-plans skill.

**Goal:** Build a "Bloomberg Terminal for Space Law" within the Caelex ecosystem that replaces manual benchmarking work for space law firms, providing real-time regulatory intelligence across 19+ European jurisdictions.

**Primary User:** Dr. Ingo Baumann (BHO Legal) as pilot customer, then 20-30 specialized space law firms globally.

**Route:** `caelex.eu/atlas/*` — embedded in the existing Caelex app as a gated product.

---

## 1. Architecture

### 1.1 Integration Model: Hybrid Embedded

ATLAS lives as a Next.js route group `(atlas)` within the existing `caelex-assessment` codebase. It shares infrastructure but maintains clean boundaries:

```
src/app/(atlas)/
  layout.tsx              — ATLAS-specific layout (dense, Bloomberg-style)
  page.tsx                — Command Center (home)
  jurisdictions/
    page.tsx              — All jurisdictions grid
    [code]/page.tsx       — Country deep dive (FR, DE, UK, etc.)
  comparator/page.tsx     — Side-by-side analysis
  eu-space-act/page.tsx   — EU Space Act tracker
  cyber-standards/page.tsx — BSI/NIST/ENISA tracker
  sustainability/page.tsx — LCA/ESA framework
  alerts/page.tsx         — Change notifications
  api-access/page.tsx     — API keys + Swagger docs
  settings/page.tsx       — Watchlists, preferences
```

**Shared from Caelex core:**

- NextAuth v5 session + RBAC (`atlas:read`, `atlas:write` permissions)
- Prisma/Neon database (same connection, new `Atlas*` models)
- Stripe billing (new ATLAS subscription tiers)
- Upstash rate limiting (new `atlas` + `atlas_api` tiers)
- Resend email (ATLAS alert templates)
- Audit logging (SHA-256 hash chain)
- Glass design system tokens (Emerald palette, glass-\* classes)

**ATLAS-specific:**

- Own `layout.tsx` with dense Command Center sidebar
- Own API routes under `src/app/api/atlas/`
- Own Prisma models prefixed `Atlas*`
- Own cron jobs for scraping pipeline
- Own PDF/DOCX export for Comparator results

### 1.2 Data Architecture

ATLAS reads from two data layers:

1. **Static regulatory data** (already exists in `src/data/`):
   - `national-space-laws.ts` — 19 jurisdictions, `JurisdictionLaw` interface
   - `nis2-requirements.ts` — 56 NIS2 requirements
   - `articles.ts` — 119 EU Space Act articles
   - `cross-references.ts` — NIS2 ↔ EU Space Act mappings
   - `cybersecurity-requirements.ts` — ENISA/NIS2 controls
   - `copuos-iadc-requirements.ts` — debris mitigation guidelines

2. **Dynamic intelligence data** (new `Atlas*` Prisma models):
   - Versioned regulatory provisions (change-tracked)
   - Scraped legislative updates with diff history
   - EU Space Act version comparisons (Commission vs Council vs Parliament)
   - Cybersecurity standard updates
   - User annotations, saved searches, alert configs

---

## 2. Data Model

### 2.1 New Prisma Models

```prisma
// ─── ATLAS Jurisdiction Intelligence ───

model AtlasJurisdiction {
  id                    String   @id @default(cuid())
  countryCode           String   @unique  // ISO 3166-1 alpha-2
  countryName           String
  flagEmoji             String
  hasSpaceLaw           Boolean
  regulatoryTier        String   // "champions_league" | "bundesliga" | "zweite_liga" | "kreisliga"
  competentAuthority    String
  authorityContact      String?
  authorityStaffSize    String?
  primaryLegislation    String
  legislationUrl        String?
  legislationStatus     String   // "enacted" | "draft" | "pending" | "none"
  yearEnacted           Int?
  lastAmended           DateTime?
  geltungsbereich       String?  @db.Text  // scope description

  // Relations
  provisions            AtlasProvision[]
  changes               AtlasChange[]
  alerts                AtlasAlert[]

  // Metadata
  lastScrapedAt         DateTime?
  lastReviewedAt        DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([countryCode])
  @@index([regulatoryTier])
}

model AtlasProvision {
  id                    String   @id @default(cuid())
  jurisdictionId        String
  jurisdiction          AtlasJurisdiction @relation(fields: [jurisdictionId], references: [id])

  dimension             String   // "authorization" | "liability" | "insurance" | "registration" | "cybersecurity" | "sustainability" | "compliance"
  subdimension          String?
  title                 String
  content               String   @db.Text
  legalReference        String?
  effectiveDate         DateTime?
  version               Int      @default(1)

  // Change tracking
  previousVersionId     String?
  previousVersion       AtlasProvision? @relation("ProvisionHistory", fields: [previousVersionId], references: [id])
  nextVersions          AtlasProvision[] @relation("ProvisionHistory")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([jurisdictionId, dimension])
  @@index([dimension])
}

model AtlasChange {
  id                    String   @id @default(cuid())
  jurisdictionId        String?
  jurisdiction          AtlasJurisdiction? @relation(fields: [jurisdictionId], references: [id])

  changeType            String   // "new_legislation" | "amendment" | "repeal" | "draft_published" | "standard_update" | "eu_space_act_update"
  title                 String
  summary               String   @db.Text
  impactLevel           String   // "breaking" | "significant" | "minor" | "informational"
  affectedDimensions    String[] // ["authorization", "liability", ...]

  // Diff tracking
  oldContent            String?  @db.Text
  newContent            String?  @db.Text
  sourceUrl             String?
  sourceName            String?

  // Review workflow
  detectedAt            DateTime @default(now())
  reviewedAt            DateTime?
  reviewedBy            String?
  isVerified            Boolean  @default(false)
  isPublished           Boolean  @default(false)
  publishedAt           DateTime?

  // Relations
  alerts                AtlasAlertDelivery[]

  createdAt             DateTime @default(now())

  @@index([jurisdictionId, detectedAt])
  @@index([changeType])
  @@index([impactLevel])
  @@index([isPublished, detectedAt])
}

// ─── EU Space Act Version Tracking ───

model AtlasEUSpaceActVersion {
  id                    String   @id @default(cuid())
  versionName           String   // "Commission Proposal", "Council Compromise", "EP Report"
  institution           String   // "commission" | "parliament" | "council"
  date                  DateTime
  documentUrl           String?
  articles              Json     // Full article tree for this version
  summary               String?  @db.Text

  // Diff against previous version
  previousVersionId     String?
  diffSummary           String?  @db.Text
  articlesChanged       Int?
  articlesAdded         Int?
  articlesRemoved       Int?

  createdAt             DateTime @default(now())

  @@index([institution, date])
}

// ─── Cybersecurity Standards ───

model AtlasCyberStandard {
  id                    String   @id @default(cuid())
  name                  String
  shortName             String   // "BSI TR-03184-1", "NISTIR 8270"
  publisher             String   // "BSI" | "NIST" | "ENISA" | "ESA" | "ECSS"
  status                String   // "published" | "draft" | "in_development" | "superseded"
  applicableSegments    String[] // ["space", "ground", "launch", "user"]
  jurisdictions         String[] // country codes where applicable
  publishDate           DateTime?
  lastUpdated           DateTime?
  url                   String?
  summary               String?  @db.Text

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([publisher])
  @@index([status])
}

// ─── Alert System ───

model AtlasAlert {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  organizationId        String?
  organization          Organization? @relation(fields: [organizationId], references: [id])

  name                  String
  alertType             String   // "jurisdiction_change" | "eu_space_act" | "cyber_standard" | "custom"
  jurisdictions         String[] // country codes to watch (empty = all)
  dimensions            String[] // regulatory dimensions to watch (empty = all)
  impactLevels          String[] // minimum impact level to trigger
  isActive              Boolean  @default(true)

  // Delivery
  emailEnabled          Boolean  @default(true)
  inAppEnabled          Boolean  @default(true)
  digestFrequency       String   @default("realtime") // "realtime" | "daily" | "weekly"

  deliveries            AtlasAlertDelivery[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([userId])
  @@index([organizationId])
}

model AtlasAlertDelivery {
  id                    String   @id @default(cuid())
  alertId               String
  alert                 AtlasAlert @relation(fields: [alertId], references: [id])
  changeId              String
  change                AtlasChange @relation(fields: [changeId], references: [id])

  deliveredAt           DateTime?
  channel               String   // "email" | "in_app"
  readAt                DateTime?

  createdAt             DateTime @default(now())

  @@index([alertId, createdAt])
  @@index([changeId])
}

// ─── API Access ───

model AtlasApiKey {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])
  name                  String
  keyHash               String   @unique
  keyPrefix             String   // "atlas_" + first 8 chars for identification
  tier                  String   // "standard" | "premium"
  dailyLimit            Int      @default(1000)
  requestCount          Int      @default(0)
  lastUsedAt            DateTime?
  expiresAt             DateTime?
  isActive              Boolean  @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([keyHash])
  @@index([organizationId])
}

// ─── Saved Searches & Annotations ───

model AtlasSavedSearch {
  id                    String   @id @default(cuid())
  userId                String
  name                  String
  searchType            String   // "comparison" | "jurisdiction" | "provision"
  parameters            Json     // search parameters
  createdAt             DateTime @default(now())

  @@index([userId])
}

model AtlasAnnotation {
  id                    String   @id @default(cuid())
  userId                String
  provisionId           String?
  jurisdictionCode      String?
  content               String   @db.Text
  isPrivate             Boolean  @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([userId])
  @@index([provisionId])
}
```

### 2.2 Seeding Strategy

Initial data comes from three sources:

1. **Migrate existing `national-space-laws.ts`** — the 19 `JurisdictionLaw` objects become `AtlasJurisdiction` + `AtlasProvision` records. This is a one-time seed script.

2. **EU Space Act versions** — seed the Commission Proposal (COM(2025) 335, June 2025), the Council Compromise (Cyprus Presidency, March 2026), and the EP Report (Donazzan, March 2026) as `AtlasEUSpaceActVersion` records.

3. **Cybersecurity standards** — seed the 12 standards from the spec (BSI TR-03184-1/2, NISTIR 8270/8401, ECSS, etc.) as `AtlasCyberStandard` records.

---

## 3. Features

### 3.1 Command Center (Home — `/atlas`)

Dense multi-panel layout showing:

- **Regulatory Map** (left, ~60% width): Interactive SVG Europe map with choropleth coloring + pulse markers for recent changes. Click country → navigates to deep dive.
- **Live Feed** (right, ~40% width): Chronological feed of `AtlasChange` records. Each entry shows: country flag, title, impact badge, time ago. Click → navigates to change detail.
- **Quick Stats Bar** (bottom): 19 enacted laws | 4 in progress | 3 alerts pending | Last update: 2h ago

### 3.2 Comparator (`/atlas/comparator`)

The "Werkstudenten-Killer". Full-page side-by-side comparison:

- **Country selector** (top): Multi-select up to 5 countries
- **Dimension selector**: Authorization | Liability | Insurance | Registration | Cybersecurity | Sustainability | All
- **Comparison table**: Countries as columns, provisions as rows. Differences highlighted. Each cell shows the actual legal text with article reference.
- **Preset comparisons**: Dropdown with common queries (liability caps, insurance minimums, processing times)
- **Export**: PDF and DOCX buttons. Output formatted for direct inclusion in legal opinions/Gutachten.

Data source: reads from `AtlasProvision` records, falls back to `national-space-laws.ts` static data for fields not yet migrated.

### 3.3 Country Deep Dive (`/atlas/jurisdictions/[code]`)

Full-page profile for each jurisdiction:

- **Header**: Flag, country name, legislation name, authority, last update, Baumann-tier badge
- **Compliance Scorecard**: Ampel for each dimension (Authorization ✅, Liability ✅, Cyber ⚠️, etc.)
- **Provisions by Dimension**: Accordion/tab layout with full text for each regulatory area
- **Change History**: Timeline of all amendments with diff view
- **Original Documents**: Links to legislation texts (Originalsprache + English translation where available)
- **EU Space Act Readiness**: Gap analysis between national law and EU Space Act proposal
- **Annotations**: User's private notes on specific provisions

### 3.4 EU Space Act Tracker (`/atlas/eu-space-act`)

Dedicated legislation tracker:

- **Timeline**: Visual timeline from Commission Proposal → EP Committee → Council Working Group → Trilogue → Adoption
- **Version Comparison**: Side-by-side diff between Commission (June 2025), Council Compromise (March 2026), EP Report (March 2026). Article-level changes highlighted.
- **Article Tracker**: Expandable list of all 119 articles. Each shows: changes across versions, national law cross-references, status (unchanged/modified/new/deleted).
- **Impact Assessment**: Per-country breakdown of what changes the EU Space Act would bring.

### 3.5 Cyber Standards Tracker (`/atlas/cyber-standards`)

Grid/table of all 12+ cybersecurity standards:

- Name, publisher, status, applicable segments, last updated
- Click → detail page with summary, applicability matrix, links to documents
- Filter by: publisher, status, segment, jurisdiction
- Cross-reference to NIS2 requirements (via existing `cross-references.ts`)

### 3.6 Sustainability & LCA (`/atlas/sustainability`)

Focused page covering:

- ESA LCA Database & Handbook overview
- ESA Space System LCA Guidelines (current + upcoming revision)
- EU Space Act Title IV sustainability requirements
- National requirements matrix (which countries require what)
- Links to ESA Clean Space Office resources

### 3.7 Alert System (`/atlas/alerts`)

Alert management page:

- **Create Alert**: Pick jurisdictions, dimensions, impact levels, delivery preferences
- **Alert List**: Active alerts with last triggered date, total deliveries
- **Alert History**: Chronological log of all deliveries with read/unread status
- **Email Digest Settings**: Realtime / Daily / Weekly toggle

Implementation: `AtlasAlert` + `AtlasAlertDelivery` models. A cron job matches new `AtlasChange` records against active alerts and queues deliveries.

### 3.8 API Access (`/atlas/api-access`)

Self-service API key management:

- **Generate Key**: Name, tier (Standard 1K/day, Premium 10K/day)
- **Key List**: Active keys with usage stats, last used, expiry
- **Swagger Documentation**: Embedded Swagger UI for the ATLAS REST API

### 3.9 ATLAS REST API

Public API under `/api/atlas/v1/`:

```
GET  /api/atlas/v1/jurisdictions                              — List all jurisdictions
GET  /api/atlas/v1/jurisdictions/:code                        — Jurisdiction detail
GET  /api/atlas/v1/jurisdictions/:code/provisions              — Provisions by dimension
GET  /api/atlas/v1/compare?countries=FR,DE,UK&dimension=liability — Comparison
GET  /api/atlas/v1/changes?since=2026-01-01&impact=breaking    — Change feed
GET  /api/atlas/v1/eu-space-act/versions                       — EU Space Act versions
GET  /api/atlas/v1/eu-space-act/diff?from=commission&to=council — Version diff
GET  /api/atlas/v1/standards/cyber                             — Cybersecurity standards
```

Authentication: `Atlas-Api-Key` header. Rate limits per `AtlasApiKey.tier`.

---

## 4. Scraping & Intelligence Pipeline

### 4.1 Cron Jobs

Two new cron routes:

**`/api/cron/atlas-regulatory-scraper`** (Daily, 03:00 UTC)

- Scrapes: national gazette URLs, EUR-Lex, legislation.gov.uk, BSI publications
- For each source: fetch page, compute SHA-256 hash, compare with last scrape
- On change: generate diff, create `AtlasChange` record with `isVerified: false`
- Queue changed pages for manual review

**`/api/cron/atlas-alert-dispatcher`** (Hourly)

- Query newly published `AtlasChange` records (since last run)
- Match against active `AtlasAlert` configurations
- Create `AtlasAlertDelivery` records
- Send emails via Resend for `emailEnabled` alerts
- Create in-app notifications for `inAppEnabled` alerts

### 4.2 Review Queue

Admin page (internal, not customer-facing):

- List of unverified `AtlasChange` records
- For each: show source URL, detected diff, suggested impact level
- Actions: Verify & Publish, Edit & Publish, Dismiss
- Publishing triggers the alert dispatcher

### 4.3 Scraping Sources

| Source                          | URL Pattern                         | Frequency | Method                    |
| ------------------------------- | ----------------------------------- | --------- | ------------------------- |
| EUR-Lex                         | `eur-lex.europa.eu/search.html?...` | Daily     | Cheerio HTML parse        |
| UK legislation.gov.uk           | `legislation.gov.uk/new/...`        | Daily     | RSS feed parse            |
| BSI Publications                | `bsi.bund.de/SharedDocs/...`        | Weekly    | Cheerio HTML parse        |
| ESA ECSL                        | `esa.int/law/national/...`          | Weekly    | Cheerio HTML parse        |
| EU Council Register             | `consilium.europa.eu/register/...`  | Daily     | Cheerio HTML parse        |
| National gazettes (per country) | Varies                              | Daily     | Country-specific scrapers |

Each scraper is a module in `src/lib/atlas/scrapers/` implementing a common interface:

```typescript
interface AtlasScraper {
  source: string;
  scrape(): Promise<ScrapedDocument[]>;
}

interface ScrapedDocument {
  sourceUrl: string;
  title: string;
  content: string;
  contentHash: string;
  detectedAt: Date;
  jurisdictionCode?: string;
}
```

---

## 5. Monetization

> **DEFERRED** — Pilot phase. All features unlocked, no billing integration.
> Monetization tiers (Essentials €590, Professional €1,190, Enterprise €2,490)
> are defined in the original product spec and will be implemented post-pilot
> once Baumann validates the product-market fit.

---

## 6. UX & Design

### 6.1 Design Language

- **Palette**: Same Caelex Emerald (#10B981) accent on Navy (#0A0F1E) background
- **Typography**: Geist (headings) + JetBrains Mono (data/article references) + Source Serif 4 (legal text)
- **Layout**: Dense information display. Command Center = multi-panel. Sub-pages = focused single-purpose.
- **Glass system**: Reuse existing `glass-surface`, `glass-elevated`, `glass-floating` from Caelex
- **Map**: Custom SVG Europe map, choropleth coloring by regulatory status, pulsing markers for recent updates

### 6.2 Component Inventory

New ATLAS-specific components (in `src/components/atlas/`):

- `AtlasLayout` — dense sidebar + main content shell
- `AtlasSidebar` — navigation with 9 items (Command Center, Comparator, Jurisdictions, EU Space Act, Cyber Standards, Sustainability, Alerts, API, Settings)
- `RegulatoryMap` — interactive SVG Europe map (client component, d3 or raw SVG)
- `LiveFeed` — scrollable change feed with real-time updates
- `ComparisonTable` — multi-column table with diff highlighting
- `JurisdictionCard` — compact card for grid views
- `JurisdictionProfile` — full-page profile with tabbed dimensions
- `ChangeDetail` — single change view with diff rendering
- `EUSpaceActTimeline` — visual legislation timeline
- `ArticleDiff` — side-by-side article comparison with highlighted changes
- `CyberStandardCard` — standard overview card
- `AlertConfigForm` — alert creation/edit form
- `ApiKeyManager` — key generation and management UI
- `ExportButton` — PDF/DOCX export trigger

---

## 7. Legal

### 7.1 Disclaimer

Displayed prominently in ATLAS layout footer, in every export, and in API responses:

> ATLAS is an information tool, not legal advice. The information provided serves exclusively for orientation and research purposes. Caelex assumes no guarantee for the completeness, accuracy, or timeliness of the data. Usage does not replace individual legal advice from a qualified law firm. Liability claims against Caelex arising from the use of the provided information are excluded to the extent legally permissible.

### 7.2 Licensing

- Named User licensing (no sharing with clients)
- Clients of law firms need their own Caelex operator license
- API usage restricted to licensee's internal systems (no reselling)
- 12-month contract, 3-month cancellation notice

---

## 8. Implementation Order

The subsystems should be built in this order (each is a separate plan):

1. **Data Layer** (~1 week) — Prisma schema, seed script (migrate `national-space-laws.ts`), seed EU Space Act versions + cyber standards
2. **ATLAS Layout + Command Center** (~1 week) — Route group, layout, sidebar, regulatory map, live feed, quick stats
3. **Comparator** (~1 week) — Country/dimension selectors, comparison table, diff highlighting, PDF/DOCX export
4. **Country Deep Dives** (~1 week) — Jurisdiction profile pages, provision views, change history timeline
5. **EU Space Act Tracker** (~1 week) — Version list, article-level diff, timeline visualization
6. **Scraping Pipeline** (~1 week) — Cron jobs, scraper modules, change detection, review queue
7. **Alert System** (~3 days) — Alert CRUD, dispatcher cron, email templates
8. **API Layer** (~3 days) — REST endpoints, API key management, Swagger docs, rate limiting
9. **Billing Integration** (~2 days) — Stripe products, feature gating middleware
10. **Polish & Pilot** (~1 week) — Performance, accessibility, Baumann test account, remaining jurisdictions

Total estimate: ~8-9 weeks for full product.

---

## 9. Success Criteria

- Baumann uses ATLAS daily for his Ministeriums-Studien within 3 months
- 5 paying law firm customers within 6 months
- Comparator generates a side-by-side PDF in under 3 seconds
- Regulatory changes detected within 24 hours of publication
- 19 jurisdictions fully populated at launch
- API response times under 200ms for all endpoints
