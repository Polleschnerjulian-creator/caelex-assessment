# Caelex Internal Admin / Analytics Center — Concept & Specification

**Status:** PLANNING (concept + design — not yet built)
**Date:** 2026-06-08
**Author:** Lead author, Admin/Analytics Center
**Scope:** A world-class internal admin/analytics center at `caelex.eu/admin` — super-admin / founder-team only — that tracks behaviour, usage, funnels, retention, dwell, paths, acquisition, revenue and system health **across all five Caelex products** to steer and grow the business.
**Hard constraints:** Reuse-first (do NOT rebuild the existing analytics spine) · privacy-first (GDPR/DSGVO is a design pillar, not a footnote) · low/zero external cost · surface-separation-safe (must not break the Atlas/Pharos pre-commit guard) · dark navy/emerald "Linear-meets-Bloomberg-Terminal" design (NOT Scholar's monochrome).

> Every code claim in this document was verified by reading the cited file in the `feat/caelex-scholar` worktree on 2026-06-08. Where a section says "exists but unpopulated", that was confirmed by grepping for callers.

---

## 0. TL;DR for the owner

1. **You already own ~85% of the backbone.** A self-hosted, consent-gated event pipeline (`src/lib/analytics.ts` → `/api/analytics/track` → `AnalyticsEvent`), 9 analytics Prisma models, a daily aggregation cron, a 6-tab "CEO Analytics" dashboard, a hashed-IP consent proof-log, and a retention-enforcement cron the privacy policy literally cites by path. **We extend and generalise this — we do not rebuild.**
2. **Today it only sees Comply (and marketing).** The one client tracker (`useAnalyticsTracking`) is mounted in exactly ONE place — the legacy V1 `DashboardShell`. Atlas, Pharos, Trade and Scholar emit **zero** behavioural events. Worse: as the V2 shell becomes the super-admin default, even Comply page-view tracking goes dark, because `V2Shell` does not mount the tracker.
3. **The fix is one shared provider + a typed taxonomy + a `product` dimension.** Mount one consent-gated `<AnalyticsProvider/>` as a client sibling in `src/app/layout.tsx` (right next to the existing `ConditionalAnalytics`/`CookieConsent`). That file and `src/lib/analytics.ts` are **not** protected by the pre-commit guard, so this instruments all five products **across zero guarded paths and with no `ALLOW_CROSS_SURFACE` bypass.**
4. **The differentiator is cross-product, not exotic tech.** No competitor analytics tool can see across a lawyer surface, a compliance surface, an export-control surface, a student surface and a regulator surface in **one identity graph.** Caelex can. The "krass" view is per-product North-Stars + funnels + retention + the anonymous→signup→activation→paid funnel, all sliced by product, in one cockpit.
5. **Two legal landmines must be fixed before we ship:** (a) the cookie policy says analytics is "anonymous, cookieless, Vercel-only" while the real self-hosted pipeline is identified, device-stored, first-party telemetry — a disclosure mismatch a compliance company cannot afford; (b) retention + erasure today reach only `AnalyticsEvent`, leaving `AcquisitionEvent` (which holds `userId`) un-erased on account deletion. Both are in §6.
6. **Stay on Neon Postgres for v1.** It is the right choice to tens-of-millions of events with the existing 90-day retention sweep as the size safety-valve and pre-aggregated rollups for every dashboard. Defer ClickHouse/PostHog-EU. Session replay is explicitly **out of scope** (worst risk/reward for a German compliance company).

---

## 1. Vision + why

### 1.1 What we are building

A single internal cockpit — **caelex.eu/admin** — that answers, in one place, the questions a founder needs to steer the company:

- **Who is using what, across which product?** Per-screen dwell, click/navigation paths, feature usage per product (Atlas: which legal topics / searches / drafts; Comply: which assessment modules; Passage/Trade: classify→licence usage; Scholar: scenarios / searches / Planspiele; Pharos: oversight workflow throughput).
- **Where do users convert and where do they drop?** Conversion funnels (acquisition → signup → activation → paid), per-product activation funnels, the Trade classify→licence→ship funnel rendered natively from status transitions.
- **Are we keeping them?** Retention / cohort grids per product (signup-week × return-week).
- **Where does growth come from?** Acquisition by source/medium/campaign, attributed all the way to which product a signup activates into first.
- **Is the business healthy?** MRR/ARR, MRR-per-product, AI/COGS per product (Anthropic token spend), customer health scores, system + API health.
- **Right now?** A live pulse tile — events in the last N minutes — for the Bloomberg-terminal feel.

### 1.2 Why now, and why "krass but grounded"

Caelex ships **five standalone products on one codebase** (the canonical list is the `ProductCode` enum at `prisma/schema.prisma:3459` — `COMPLY · TRADE · ATLAS · PHAROS · SCHOLAR`). Today the company is flying with one instrument lit: only Comply emits behaviour. The owner wants the **best analytical admin center in the world** — but the honest path to "best in world" for _this_ company is not chasing ClickHouse/session-replay parity with Amplitude/PostHog. It is **owning the cross-product identity graph that no external tool can reconstruct**, instrumented through one shared library writing one typed taxonomy into one self-hosted store under full GDPR control.

The ambition is grounded by three facts established in §2: the event store, the ingestion endpoint, the rollup tables, the daily cron, the admin gate and the Recharts dashboard **already exist and are production-grade**. The work is a thin cross-product instrumentation layer + new aggregation passes + new dashboard tabs — not a new system.

### 1.3 Why the privacy framing is load-bearing

Caelex is a **German compliance company**. Its own user-behaviour analytics must be the _most_ compliant analytics, not the least. A compliance SaaS caught mis-tracking its users — or whose own cookie policy materially misstates its analytics (which is the case today, §6.2) — is the worst possible own-goal. GDPR/DSGVO is therefore a first-class design pillar with its own section (§6), and the spec's central legal decision (lawful basis for in-app behavioural telemetry) is flagged as an explicit owner/DPO sign-off, not silently assumed.

---

## 2. What already exists + the REUSE/EXTEND verdict

### 2.1 The verdict

**REUSE the spine end-to-end. EXTEND it cross-product. Do NOT rebuild.** Concretely:

| Layer             | Asset (verified path)                                                                                                                                                                                                                                                                                                                           | Verdict                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw event store   | `AnalyticsEvent` (`prisma/schema.prisma:4691`) — userId?/orgId?/sessionId, eventType, eventCategory, eventData Json, path, referrer, userAgent, ipCountry, durationMs, timestamp; 8 indices incl. `[userId,timestamp]`, `[eventType,timestamp]`, `[sessionId]`                                                                                  | **Reuse as-is.** Product-agnostic. eventData Json + path carry any per-product dimension. Add a nullable `product` column + 2 composite indices (additive).                |
| Generic rollup    | `AnalyticsDailyAggregate` (`:4725`) — `metricType`/`metricValue` + `dimension`/`dimensionValue` + `previousValue`/`changePercent`, unique `[date,metricType,dimension,dimensionValue]`; its own comment lists examples "plan, country, module"                                                                                                  | **Reuse as-is.** `dimension='product'` carries every per-product scalar metric with **no migration.**                                                                      |
| Ingestion         | `/api/analytics/track` (`src/app/api/analytics/track/route.ts`) — Zod-validated, validates `userId` against `auth()` session (anti-spoof), **consent-gated** (drops non-essential events unless analytics-consent; only `["signup","login"]` pass), ipCountry-only, pathname-only, auto-derives `AcquisitionEvent` from anonymous page_view+UTM | **Reuse as-is.** Add a rate-limit tier + array-batch body (§5).                                                                                                            |
| Client emitter    | `src/lib/analytics.ts` (307 LOC) — `analytics` (track/page/feature/conversion/error/timing/identify) via `navigator.sendBeacon` (fetch+keepalive fallback), CSPRNG `caelex_session_id` in sessionStorage, reads `localStorage['caelex-cookie-consent']`, embeds `_consent`; `serverAnalytics` writes `AnalyticsEvent` directly                  | **Reuse + extend.** Already best-practice. Add batching + the new emit helpers.                                                                                            |
| Daily aggregation | `/api/cron/analytics-aggregate` (449 LOC, daily 02:00, timing-safe `CRON_SECRET`, `maxDuration=120`) — DAU/WAU/MAU, signups, page_views, revenue, per-module FeatureUsageDaily, per-org CustomerHealthScore, RevenueSnapshot, ApiEndpointMetrics                                                                                                | **Reuse + generalise.** Hard-wired to `/dashboard/modules/` paths (`:128`) and 8 hardcoded module names (`:140-148`). Generalise off the path prefix; add new passes (§5). |
| Customer rollups  | `CustomerHealthScore` (`:4751`, @unique per org), `RevenueSnapshot` (`:4822`), `FeatureUsageDaily` (`:4857`), `FinancialEntry` (`:4782`), `AcquisitionEvent` (`:4884`, full UTM + `anonymousId`), `SystemHealthMetric` (`:4919`), `ApiEndpointMetrics` (`:4942`)                                                                                | **Reuse.** Several fields **declared but never written** — see §2.3.                                                                                                       |
| Admin dashboard   | `src/app/dashboard/admin/analytics/page.tsx` (1972 LOC) — 6 tabs, `useAnalyticsData(endpoint,range)` hook, `MetricCard`/`TabButton`/`TimeRangeSelector`, Recharts, Framer-Motion tabs, CSS-var emerald theme (`--accent-primary`), per-tab CSV export                                                                                           | **Reuse the chrome; decompose the monolith.** Lift the kit into `src/components/admin/` and add new tab families (§7).                                                     |
| Read routes       | 8 routes under `/api/admin/analytics/*` (overview, revenue, product, customers, acquisition, infrastructure, financial-entry, export) — **all** `requireRole(["admin"])`-gated                                                                                                                                                                  | **Reuse query logic; tighten the gate** to `isSuperAdmin` for the new center (§7).                                                                                         |
| Admin gate        | `src/lib/super-admin.ts` — `isSuperAdmin(email)` (5-account code allowlist) + `logSuperAdminAccess()` (tamper-evident audit-log, DPA-disclosed)                                                                                                                                                                                                 | **Reuse — this is the correct founder-only gate.** Stricter than `requireRole(["admin"])`.                                                                                 |
| Consent spine     | `CookieConsent.tsx` (4 categories, `CONSENT_VERSION="2026-05-19"`, 366-day TTL, button-parity), `src/lib/consent-log.ts` (coarsen-then-hash IP /24·/48 + UA-80 + PEPPER), `ConsentRecord` (`:12976`, hashed append-only proof log)                                                                                                              | **Reuse — gold standard.** Map new tracking onto the existing 'analytics' category; bump version + fix disclosure (§6).                                                    |
| Retention         | `/api/cron/data-retention-cleanup` (daily 03:00) — anonymises `AnalyticsEvent.userAgent` at 30d, deletes `AnalyticsEvent` at 90d, deletes `ScholarSearchHistory` at 90d                                                                                                                                                                         | **Reuse + extend** to the rollup tables (§6).                                                                                                                              |

### 2.2 The five critical gaps (what the new center must add)

1. **Tracking-mount regression (highest leverage).** `useAnalyticsTracking` is imported in exactly one place — `src/app/dashboard/DashboardShell.tsx:79` (the legacy V1 shell). `V2Shell` (`src/components/dashboard/v2/V2Shell.tsx:108`) renders `<main>{children}</main>` and does **not** mount it; the dashboard layout (`src/app/dashboard/layout.tsx:61`) renders `<V2Shell>` for super-admins (who default to v2 per `src/lib/comply-ui-version.server.ts`) and `V2Shell` does **not** wrap the legacy shell. **As V2 becomes default, Comply tracking stops firing.** This is the single highest-leverage item.
2. **Zero instrumentation in 4 of 5 products.** Grep across `src/app/(atlas)`, `(pharos)`, `(trade)`, `(scholar)` for `useAnalyticsTracking` or `@/lib/analytics` returns **nothing.** The only real client `analytics.*` call sites in the repo are the 4 login pages (one `track` each) + `AssessmentWizard.tsx:87` (one `feature()`). Server-side `serverAnalytics.track` is called from only 3 places (signup, stripe webhook, doc confirm-upload). The de-facto event taxonomy today is ~8 types.
3. **Cron is Comply-shaped.** It only buckets `path.startsWith("/dashboard/modules/")` with 8 hardcoded names and `moduleCategory:"compliance"` — Atlas/Pharos/Trade/Scholar feature usage is invisible.
4. **No infrastructure for the marquee features.** Grep across `src/lib`/`src/app/api/admin/analytics` for funnel/cohort/retention/dwell/clickPath/heatmap/session-replay returns **no analytics matches.** Dwell-time, click/navigation paths, funnels, cohorts/retention are all greenfield (but buildable on the existing substrate, §3/§5).
5. **GDPR enforcement is narrower than the new surface area** — retention/erasure reach only `AnalyticsEvent` (§6).

### 2.3 Fields that already exist but are never written (free substrate for new features)

- `AnalyticsEvent.durationMs` (`:4711`) and `analytics.timing()` (`src/lib/analytics.ts:209`) — **0 real callers.** Dwell-time storage + emitter already exist.
- `CustomerHealthScore.avgSessionMins` and `FeatureUsageDaily.avgDurationSecs` (`:4870`) — declared, never populated. Dwell rollup targets.
- `ApiEndpointMetrics.p50/p95/p99Latency` (`:4956`) — declared, only `avgLatency` populated by the cron.
- `RevenueSnapshot.newMrr/expansionMrr/contractionMrr/churnedMrr` (`:4831`) — declared, left at default 0; `CustomerHealthScore.trend` hardcoded `"stable"` in the cron.

**Implication:** dwell-time, p-latency and MRR-component features need **no schema upheaval** — only instrumentation + aggregation logic.

### 2.4 External analytics: keep peripheral

`src/lib/logsnag.ts` (ops pings) and `ConditionalAnalytics.tsx` (Vercel Web Analytics / Speed Insights, consent-gated) are thin and third-party. **Keep LogSnag for ops pings and Vercel for Web-Vitals; never route behavioural events to them** — they are third-party processors and only the self-hosted `AnalyticsEvent` spine can hold per-product feature data under full GDPR control. There is no PostHog/Amplitude/Segment/GA in the codebase.

---

## 3. The tracking model + event taxonomy

### 3.1 Principles (what makes it "best in world")

The five-pillar canon of world-class product analytics (Amplitude/Mixpanel/PostHog) is: **a clean object-action taxonomy + identity model**, then **Funnels, Retention/cohorts, Paths/Flows, and self-serve exploration**, all hung off **one North-Star + activation metric per product**. The single highest-leverage, zero-cost upgrade is the **taxonomy**: a typed, versioned event catalogue where the PII boundary is enforced _by the type_, not by app-code review.

### 3.2 The typed event catalogue

Ship a TS const catalogue at `src/lib/analytics/events.ts` (an **unguarded** path) — the single source of truth for allowed event names and their property shapes, validated by the project's existing Zod at the `/api/analytics/track` boundary (which already Zod-validates).

- **Naming:** Object-Action, lowercase `snake_case`, past-tense `verb_noun` (`page_viewed`, `screen_dwelled`, `element_clicked`, `feature_used`, `assessment_completed`, `operation_status_changed`).
- **Mandatory envelope on every event** (carried in `eventData`, zero migration):
  - `schemaVersion` (start `1`)
  - `product` — `comply | trade | atlas | pharos | scholar | marketing` (exact `ProductCode` string values where applicable, so rollups join to `OrganizationProductAccess.product`)
  - `surface` — the route-group / named feature area
  - `feature` — the named action area
  - `topic?` — a **normalised id or hash** (jurisdiction code, module id, ECCN bucket) — **never raw query text.**
- **PII boundary by construction:** because there is no field to put a client name, email, or query string into, **PII cannot enter `eventData`.** This is what lets the LIA (§6) assert "pseudonymous". Atlas/Trade events log `query_len` + hashed/normalised `topic` + `jurisdiction` only — never raw query text or party names, which can contain privileged matter.

This generalises the lone existing example `analytics.feature("eu_space_act","assessment_completed")` into a checked, cross-product vocabulary.

### 3.3 The product dimension (zero-migration, two ways)

- **Raw events:** `product` rides in `AnalyticsEvent.eventData`, **derived from the URL path prefix** at the shared provider (`/atlas`→ATLAS, `/pharos`→PHAROS, `/trade`→TRADE, `/scholar`→SCHOLAR, `/dashboard`→COMPLY, else MARKETING). No client per-page edits; no schema change.
- **Rollups:** `AnalyticsDailyAggregate.dimension='product'` + `dimensionValue=<ProductCode>` — **no new table.**
- **Optional later (additive):** a `product` column on `AnalyticsEvent` (derived at ingestion in `track/route.ts`, more durable than path-derivation) and on `FeatureUsageDaily` (its `moduleCategory` is hardcoded `"compliance"` in the cron). Deferrable by encoding product into `featureId` (e.g. `atlas:search`).

### 3.4 Identity model

Reuse what is already shaped for it and extend minimally:

- `AnalyticsEvent.userId` is **nullable** ("null for anonymous events (pre-login)") and `analytics.identify(userId, orgId)` (`src/lib/analytics.ts:225`) is already called on login; the track route validates `userId` against the session and **drops spoofed mismatches.**
- **Add a pseudonymous `anonId`** — a longer-lived first-party id (random, **not** a fingerprint), stored under the existing consent regime — so the anonymous visitor's pre-signup journey stitches via the existing `AcquisitionEvent.anonymousId` (`:4888`). On `identify()`, backfill `userId` onto recent same-`anonId` anonymous rows to complete cross-auth funnels. **No new model.**
- **Cross-product identity = the same `User` across surfaces** (`userId` is the join), with `organizationId` for the B2B tenant. Scholar students who are not in an Organization carry `organizationId=null` and cohort by `userId` alone. (Note: the cross-product _join_ is a new purpose under Art. 5(1)(b) — see §6 / §10.)

### 3.5 Per-product event taxonomy (the high-value events)

Grounded in the actual surfaces. Funnel spines are emitted as **status-transition events**, not just page views — these power the conversion funnels.

**ATLAS** (lawyer; ~66 routes under `(atlas)/atlas`, 40 API domains):
`atlas_search_ran` / `atlas_semantic_search_ran` {query_len, jurisdiction, resultCount, zeroResults} · `atlas_source_read` / `atlas_case_read` {sourceId, jurisdiction, dwell_ms} · `atlas_ai_mode_opened` · `atlas_chat_message_sent` {tokens, tool_calls, iterations} · `atlas_draft_started`/`atlas_draft_completed` {docType, mode} · `atlas_conflict_check_run` · `atlas_bookmark_added` · `atlas_export_run` {format: docx|pdf|datev}. **North-Star:** weekly active researchers running ≥N searches+drafts. **Activation:** first search OR first AI-chat within 24h. Token usage per org is also a **COGS** metric.

**COMPLY** (the instrumented dashboard; canonical module ids in `src/data/modules.ts`):
`comply_module_opened` {moduleId} · `comply_assessment_started`/`comply_assessment_completed` {regulation, durationMs} (generalise the existing `AssessmentWizard.tsx:87` event to all 4 wizards + 10 modules) · `comply_requirement_status_changed` · `comply_document_generated` {reportType} · `comply_astra_query`. Sub-surfaces: Assure (`assure_profile_section_completed`, `assure_dataroom_shared`), Academy (`academy_course_started`, `academy_simulation_run`). **North-Star:** orgs reaching a compliance score. **Activation:** first assessment completed. Module-adoption breadth = the existing `CustomerHealthScore.activeFeatures` factor.

**TRADE / Caelex Passage** (export-control; funnel encoded in `src/app/(trade)/trade/_components/trade-nav.ts`):
`trade_classify_started`/`trade_classify_completed` {itemId, eccn, method, confidence} · **`trade_operation_status_changed` {from, to}** — THE funnel spine (statuses `DRAFT→SCREENING→AWAITING_LICENSE→LICENSED→BLOCKED`, where `BLOCKED` is a friction/churn lane) · `trade_screening_hit`/`trade_screening_cleared` · `trade_license_granted` · `trade_document_generated` {type: EUC|VSD|…}. **North-Star / primary funnel:** operations reaching `LICENSED` ÷ created (the classify→licence→ship conversion, native from status transitions) + time-in-status (where deals stall). **Activation:** first classify completed.

**SCHOLAR** (student; uniquely already persists behaviour — 8 `Scholar*` models, `prisma/schema.prisma:15189-15328`):
Read `ScholarSearchHistory`, `ScholarBookmark`, `ScholarReadingList`, `ScholarPlanspielRun/Submission/Event` **directly** — no re-instrumentation for those KPIs. New events only where there is no table: `scholar_source_read` {dwell_ms}. **North-Star:** Planspiel completed. **Activation:** first search or first Planspiel run. Cross-product signal: which jurisdictions/topics students vs lawyers consume (same corpus as Atlas).

**PHAROS** (regulator; 14 routes, small expert userbase — track **workflow state, not vanity DAU**):
`pharos_oversight_initiated` · `pharos_workflow_advanced` {caseId, stage} · `pharos_approval_signed`/`pharos_approval_rejected` · `pharos_briefing_generated` · `pharos_transparency_published`. **KPIs:** case throughput + cycle time, approval-queue depth/SLA latency, # authorities/operators under oversight. (Whether to track regulator staff _at all_ is an open question — §10.)

**MARKETING / ACQUISITION** (top of every product's funnel; `AcquisitionEvent` already auto-derived from anonymous page*view+UTM at ingestion):
`acq_page_viewed` {utm*\*} · `acq_demo_requested` · `acq_contact_submitted` · `acq_newsletter_subscribed` · `acq_signup_started`/`acq_signup_completed`. **Cross-product KPI:** which product a signup activates into first (join `AcquisitionEvent.userId` → `OrganizationProductAccess.product` → first product event).

### 3.6 Dwell, paths, scroll — derived from existing substrate

- **Dwell:** reuse `analytics.timing()` + `AnalyticsEvent.durationMs` (both unused today). Accumulate **foreground-only** time per screen via `document.visibilitychange` (pause on hidden so background tabs don't inflate), flush `screen_dwelled {product, path, durationMs, maxScrollPct}` on the next route change **and** on `pagehide`/visibility-hidden via the existing `sendBeacon` (unload-safe). Roll into `avgSessionMins`/`avgDurationSecs`.
- **Navigation paths:** reconstructed in the **query layer** over the ordered `(sessionId, timestamp)` stream — both already indexed. No client-side path-chains, no new storage.
- **Clicks:** a **delegated** click listener emitting `element_clicked` only for elements annotated with a `data-track` allow-list token (prevents noise + accidental PII from inner text).
- **Scroll:** throttled max-scroll watcher folding `maxScrollPct` milestones into the dwell flush.

All land as ordinary `AnalyticsEvent` rows — zero schema change, and they inherit the 90-day retention sweep + consent gate automatically.

---

## 4. Cross-surface client instrumentation

### 4.1 The decisive fact: the mount point and the lib are NOT guarded

The pre-commit guard (`.husky/pre-commit`) FORBIDDEN regex protects:
`src/(app/atlas | app/atlas-access | app/legal-network | app/(pharos) | app/pharos | components/atlas | components/pharos | lib/atlas | lib/pharos | lib/legal-network | data/atlas | data/legal-sources | app/api/atlas | app/api/atlas-access | app/api/legal-network | app/api/pharos | app/api/network/matter)/` unless `ALLOW_CROSS_SURFACE=1`.

**Notably absent:** `src/app/layout.tsx`, `src/lib/analytics.ts`, `src/hooks/*`, `src/components/ConditionalAnalytics.tsx`, **`src/app/(atlas)`** (the parenthesised group dir is a different string than `app/atlas`), `(trade)`, `(scholar)`, `(comply)`.

> Note for implementers: the guard protects Atlas/Pharos/legal-network **only** — `(trade)`, `(scholar)`, `(comply)` are **not** path-guarded today, despite being described as "frozen" elsewhere. Treat them as instrument-anywhere for analytics, but still prefer the shared-provider pattern for consistency. (Open question §10 — confirm the guard scope is intentional.)

### 4.2 The mount: one shared provider in the root layout

`src/app/layout.tsx:206-210` already wraps every surface in `<Providers>` (which wraps `SessionProvider`, so `useSession()` works everywhere) and renders `<ConditionalAnalytics/>` + `<CookieConsent/>` as **client siblings** of children. **Add one `<AnalyticsProvider/>` client sibling here.**

```
<Providers>
  {children}
</Providers>
<ConditionalAnalytics />
<CookieConsent />
<AnalyticsProvider />   {/* NEW — client sibling, reaches all 5 products */}
```

- It auto-captures `page_viewed` + `screen_dwelled` + scroll + delegated clicks for **all five products in one file**, and that file is **not guarded** → **no `ALLOW_CROSS_SURFACE` bypass needed.**
- **Why not the product layouts?** All four product layouts (`(atlas)`, `(trade)`, `(scholar)`, `(pharos)`) are **server components** (they `import { auth }` + `prisma` on line 1-3). A client hook cannot be dropped into a server layout directly — it must be a client child. The root-layout-sibling pattern is therefore not just convenient, it is the correct shape, and it is exactly what the existing analytics siblings already do.

### 4.3 The shared hook

`<AnalyticsProvider/>` wraps a shared `useTracking()` hook (in `src/hooks/`, unguarded) that **extends** today's `useAnalyticsTracking`:

- Derives `product` from `window.location.pathname` prefix and stamps it on every event.
- Fires `page_viewed` on pathname change; manages the foreground dwell timer; attaches the delegated click + scroll listeners.
- Calls the **single consent gate** — `hasAnalyticsConsent()` (today in `useAnalyticsTracking.ts:11`) — **once** before any emit, not per call site, preserving the existing `localStorage` cookie-banner ⇄ server `_consent` re-check.
- Buffers events in a small **in-memory micro-batch** (flush on idle/interval + on visibility-hidden) and sends an **array** via one `sendBeacon`, coalescing high-frequency dwell/scroll/click events (which multiply volume) into far fewer requests.

### 4.4 Deep in-component events (the only `ALLOW_CROSS_SURFACE` case)

Most events — page views, dwell, scroll, clicks, and any **status-transition funnel visible in the URL or derivable from a route/DOM signal** — are emitted from the shared provider, so the frozen Atlas/Pharos trees stay untouched. Reserve the documented **one-time `ALLOW_CROSS_SURFACE=1`** wiring **only** for the handful of deep feature events that genuinely cannot be derived at the shared layer (e.g. an Atlas `draft_completed` fired from inside a guarded drafting component). Even most of those can be avoided:

- **Server-emitted facts** are cleaner for funnels: route Trade `operation_status_changed` and Pharos `workflow_advanced`/`approval_signed` through `serverAnalytics.track` (with `product` set explicitly) — no client round-trip, no event loss on unload, no consent dependency (these are first-party server facts under legitimate interest). `serverAnalytics` already writes `AnalyticsEvent` directly via a dynamic Prisma import.
- **Scholar** reads its existing behavioural models directly — no emitter needed for those KPIs.

---

## 5. Ingestion + storage + aggregation pipeline

### 5.1 Ingestion (do first — highest infra leverage)

1. **Add a dedicated `analytics` rate-limit tier.** `/api/analytics/track` is a public, unauthenticated, high-volume POST currently protected **only** by the consent gate — there is no `analytics` tier in `src/lib/ratelimit.ts` (the `analytics: true` hits in that file are a per-tier _flag_, not a tier). Add `analytics` to the `RateLimitType` union + the limiter map (~120/min, keyed on the existing 4-layer `getIdentifier(request)` **plus** `sessionId` so one tab cannot flood) and call `checkRateLimit('analytics', …)` at the top of POST. The in-memory dev fallback already halves limits. **This is the single most important infra add** to prevent event-spam / cost-DoS.
2. **Batch client → server.** Switch the emitter to buffer events and flush an **array** via one `sendBeacon` on a 5–10s timer + on `visibilitychange='hidden'`/`pagehide`; accept an array body in the route and `createMany` in one statement. Cuts ingestion writes ~5–20× — the cheapest scale win before any partitioning.
3. **Derive `product` at ingestion** (path-prefix) and keep the existing privacy hygiene: pathname-only, ipCountry-only (`cf-ipcountry`/`x-vercel-ip-country`), `userId` validated against session.

### 5.2 Storage (additive, `db push`-safe)

- **Additive to `AnalyticsEvent`:** `product String?` + composite indices `[product, eventType, timestamp]` (per-product feature/DAU passes) and `[sessionId, timestamp]` (path reconstruction + funnel ordering — today only `[sessionId]` alone exists, which does not serve ordered-within-session scans). Nullable column + indices are safe under the project's `db push` flow.
- **Reuse `AnalyticsDailyAggregate.dimension='product'`** for all per-product **scalar** metrics — no new table.
- **Three new thin, date-keyed rollup tables** (all bounded-cardinality, no partitioning needed; plain Prisma models → `db push`-safe):
  - `AnalyticsFunnelDaily` — `(date, product, funnelId, step, usersEntered, usersCompleted, medianMsToNext)`, unique `[date, funnelId, step]`.
  - `AnalyticsRetentionCohort` — `(cohortWeek, productScope, activityWeek, cohortSize, returnedUsers)`, unique `[cohortWeek, productScope, activityWeek]` — the signup-week × return-week grid the cron does **not** compute today (it only does point-in-time DAU/WAU/MAU).
  - `AnalyticsPathEdge` — `(date, product, fromPath, toPath, transitions)`, unique `[date, product, fromPath, toPath]` — bounded next-page **edge counts** (NOT raw session replays), so it is PII-free and small.
- **Dwell needs no new table** — populate the existing-but-unused `CustomerHealthScore.avgSessionMins` and `FeatureUsageDaily.avgDurationSecs`.

### 5.3 Aggregation (extend the cron, don't replace it)

- **Generalise** the cron's feature pass off the hardcoded `/dashboard/modules/` prefix + 8-name map to **per-product feature maps** keyed on `product`, writing `FeatureUsageDaily` per product.
- **Add passes:** dwell (`durationMs` → `avgDurationSecs`/`avgSessionMins`), funnels (ordered `[sessionId,timestamp]` step counts → `AnalyticsFunnelDaily`, via window functions/self-joins), retention (signup-week × active-week → `AnalyticsRetentionCohort`), paths (consecutive `page_view` pairs → `AnalyticsPathEdge`).
- **Split for the 120s budget.** The per-org `CustomerHealthScore` loop already runs ~3 grouped queries **per active org sequentially**; adding the new passes will blow the `maxDuration=120` ceiling at scale. **Keep the existing daily job for cheap scalar metrics; add a SECOND cron** (`/api/cron/analytics-rollup`, ~02:30, region-pinned `fra1`) for the heavier funnel/retention/path/dwell passes.
- **Cache the read side** with the existing `src/lib/cache.server.ts` `withCache` (`caelex:cache:` prefix, 5-min default TTL) so `/admin` tiles never re-scan raw events.

### 5.4 Scale on Neon — the honest answer, and the deploy constraint

**v1 = ONE Neon Postgres `AnalyticsEvent` table.** Postgres with proper indexing/partitioning is adequate to ~tens-of-millions of rows for a few analytical queries/day; ClickHouse only becomes compelling at hundreds-of-millions+. The existing 90-day retention DELETE is the natural **size safety-valve**, and **every dashboard reads pre-aggregated rollups**, so raw-event scans are limited to the nightly crons + a bounded "live" tile.

**Decisive deploy constraint:** `build:deploy` runs `prisma db push --skip-generate --accept-data-loss` (`package.json:8`). `db push` **cannot express** native Postgres declarative range partitioning or `CREATE EXTENSION timescaledb` + hypertables. The repo _does_ have a `migrate` workflow available (`db:migrate` = `prisma migrate deploy`, and ~28 migration folders exist), but **CI uses `db push`**, not migrate. Therefore:

- When the raw table approaches ~10–50M rows (driven up by the new dwell + path events), introduce **monthly RANGE partitioning on `timestamp`** as a **one-time hand-written numbered SQL migration applied out-of-band** (`prisma migrate deploy` / `psql`), explicitly **NOT** through `db push`. Document that the partition DDL lives outside the pushed schema.
- **Defer ClickHouse/PostHog-EU entirely.** Optionally add **cookieless Plausible** purely for **public-site top-of-funnel** page counts (it is page-level web analytics, not product analytics, and needs no consent banner) — but the cross-product behavioural core stays native.

### 5.5 Real-time vs batch — hybrid

- **Batch** everything heavy (the two crons + rollups + `withCache`).
- **Real-time only where it earns it:** the cockpit live tile + the Explorer live feed read `AnalyticsEvent` directly over a **bounded last-N-minute window** (timestamp-indexed, cheap). No streaming infra (Kafka) is warranted at this scale.

### 5.6 Revenue source of truth (open)

The cron derives MRR from `FinancialEntry` (manual/bank-import) and never sets `RevenueSnapshot.newMrr/expansionMrr/contractionMrr/churnedMrr` (left at 0). If Stripe is to be the source of truth for the new center's revenue tab, that is a cron change (read Subscription/Stripe events into the MRR-component fields). Flagged in §10.

---

## 6. GDPR / DSGVO + consent architecture (the compliance pillar)

> This is a first-class section. Caelex's own analytics must be the **most** compliant analytics. Three landmines must be fixed before "track everything" ships.

### 6.1 The central decision — a two-basis lawful-basis split

Split behavioural data into two classes with two bases (requires founder/DPO sign-off):

- **CLASS A — pseudonymous first-party product telemetry** (event counts, per-product feature usage, funnel transitions, dwell, paths, ipCountry): **Art. 6(1)(f) DSGVO legitimate interest.** Product-improvement of a B2B SaaS for its own logged-in business users is a textbook LI, **provided** it is (i) genuinely pseudonymous in the event store (guaranteed by the §3.2 taxonomy — no field can hold PII), (ii) never used for Art. 22 automated decisions about the user, (iii) covered by a documented **Legitimate-Interest Assessment (LIA)**, and (iv) honoured under an **Art. 21 opt-out.**
- **CLASS B — device-storage access + cross-product identity-stitching:** **consent.** Storing/reading the session id / `anonId` on the device is **§25(1) TTDSG**; linking a real-world identity across products into one cohort/retention graph is a new purpose under **Art. 5(1)(b)** and raises purpose-limitation. Both stay **consent-gated.**

**Why this matters:** today the ingestion route is **consent-strict** — it drops every non-essential event unless the user opts into analytics cookies (only `["signup","login"]` pass). Under the status quo, dwell/funnel/path/per-product events for a non-consenting user are **silently discarded**, so "track everything" actually stores almost nothing. The Class-A LI basis frees aggregate per-product analytics from that wall **while keeping the device-id and the identity graph consent-gated.** Note the existing contradiction the split resolves: privacy §3(3) already bases platform usage-data on Art. 6(1)(b)/(f), but the _code_ gates it on the analytics **cookie** — the two disagree today. The route's `essentialEvents` allowlist is the exact code seam to extend either way.

### 6.2 Landmine #1 (highest legal priority) — the disclosure mismatch

The cookie banner says `analyticsDesc: "Anonyme, cookielose Nutzungsstatistik."` (`CookieConsent.tsx:229`) and the cookie policy §3(C) says analytics is _"Vercel Web Analytics — cookielos … Keine Übermittlung an Dritte jenseits von Vercel Inc."_ (`cookies-de.ts:81`). **But the actual self-hosted `AnalyticsEvent` pipeline** — the very thing the admin center is built on — (a) stores a persistent `caelex_session_id` in **sessionStorage** (`analytics.ts:71-82`) → **not cookieless**; (b) attaches `userId` + `organizationId` to every authenticated event → **not anonymous**; (c) stores `userAgent`, `referrer`, pathname, ipCountry. **This is undisclosed and mis-described.** Fix:

- Rewrite `cookies-de.ts §2(3)/§3(C)` and the banner `analyticsDesc` to **stop claiming "cookieless/anonymous/Vercel-only"** and honestly disclose first-party self-hosted product telemetry (purpose; the device-stored session id; the `userId` linkage; `userAgent`[30d]/`ipCountry`; 90-day retention; per-product feature dimensions at a category level — Atlas topics, Comply modules, Trade classify→licence, Scholar Planspiele — **without** listing PII).
- **Bump `CONSENT_VERSION`** (currently `"2026-05-19"`) so all users re-consent (Art. 7(1) / Art. 12). Mirror into the EN twins (`cookies-en`, `privacy-en`) for Art. 12 parity.

### 6.3 Landmine #2 — retention reaches only `AnalyticsEvent`

`/api/cron/data-retention-cleanup` enforces `AnalyticsEvent` (userAgent→null @30d, delete @90d) + `ScholarSearchHistory` (@90d), and its header comment states _"the privacy policy is only true if this job runs reliably — keep the two in sync."_ But `AcquisitionEvent`, `FeatureUsageDaily`, `CustomerHealthScore`, `ApiEndpointMetrics`, `AnalyticsDailyAggregate` have **zero** retention (grep confirms 0 `deleteMany`/`updateMany` on them) → they grow **unbounded.** Fix:

- **Governing rule:** every new behavioural/rollup table is added to this cron **in the same commit** that creates it, with the matching figure added to **privacy `§3(3)`** (the policy is enforced-by-path; §3(3) already cites `/api/cron/data-retention-cleanup` and the 90d/30d figures).
- **Windows:** the rollups are aggregate/pseudonymous (counts per date/product/cohort — no `userId`) so they can carry a **longer window** (e.g. 13–24 months for trend/retention) **if the LIA argues they are effectively anonymous** — argued, not assumed. `AnalyticsPathEdge` (consecutive page pairs, the most re-identifying rollup at low traffic) should get a **shorter** window than the pure count tables. `AcquisitionEvent` (holds `userId` after signup) gets the 90d/erasure path.

### 6.4 Landmine #3 — erasure + DSAR don't reach the analytics surface

- **Erasure (Art. 17):** `src/app/api/user/delete/route.ts` nulls `AnalyticsEvent.userId` (updateMany) and deletes `ScholarSearchHistory`, **but does NOT touch `AcquisitionEvent`** → a deleted user's `userId` survives there. **Concrete bug to fix today.**
- **Access/portability (Art. 15/20):** `src/app/api/user/export/route.ts` includes ~25 entities but **no** `analyticsEvent`/`acquisitionEvent`/`consentRecord`. Once the center captures rich per-product behaviour keyed to `userId`, that data is in-scope for access requests but invisible in the export.
- **Fix — one shared module, two callers:** build a single **analytics-by-userId data-subject module** that the **delete** route (erase: delete/null `AnalyticsEvent` + `AcquisitionEvent` + any new per-product rows) and the **export** route (read: include the same) both call, so access and erasure can never drift — mirroring how `AuditLog` is pseudonymised (`userId` nulled) elsewhere.

### 6.5 Reconcile the three consent sources

Consent is triple-sourced and inconsistent: (1) `localStorage['caelex-cookie-consent']` read independently by `analytics.ts`, `useAnalyticsTracking.ts`, and `ConditionalAnalytics`; (2) `UserConsent` (`:5037`) which stores **raw** `ipAddress`/`userAgent` (Cascade-delete); (3) `ConsentRecord` (`:12976`) which stores **hashed** ip/UA (SetNull). The raw-IP `UserConsent` contradicts the data-minimisation design of `ConsentRecord`. Fix:

- Make `ConsentRecord` the single server-side **proof of record**; **harden or retire** `UserConsent`'s raw `ipAddress`/`userAgent` (hash via the `consent-log.ts` coarsen-then-hash helper, or drop).
- The shared tracking lib consults **one authoritative resolver**: **consent** for Class-B (device-id + cross-product join); an **opt-out / Art. 21** check for Class-A LI telemetry. Add an explicit per-user analytics opt-out persisted server-side.

### 6.6 Defer session replay (and never route behaviour to third parties)

Session/DOM replay records keystrokes, mouse paths and on-screen content — under German enforcement (the strictest) it is personal data, needs consent **before** recording, an Art. 28 DPA, and aggressive masking. Atlas/Trade screens can contain **privileged client matter** (firm names, mandate facts, ECCNs tied to a live deal) — **worst risk/reward.** **Out of scope for v1.** Get ~80% of replay's value PII-free from data already in the model: dwell-time, ordered page paths (sessionId+timestamp), rage/dead-click counts. The behavioural spine stays **self-hosted on Neon (fra1/EU)**; **never** route behavioural events to LogSnag (CA) or Vercel (US) — keep those for ops pings / Web-Vitals only. Keep raw IP confined to `AuditLog` forensics (already separate, 7-yr LI).

### 6.7 Disclosure change-list (ship WITH the instrumentation)

1. `CookieConsent.tsx` — bump `CONSENT_VERSION`; rewrite `analyticsDesc`.
2. `cookies-de.ts §2(3)/§3(C)` — replace the Vercel-only/cookieless entry with the honest first-party telemetry entry + per-product feature dimensions (no PII).
3. `privacy-de.ts §3(3)` — add the new behavioural/rollup tables + their Löschfristen (mirroring the cron); add a line on the cross-product identity graph + its purpose-limitation basis; point the new opt-out at `§9` (Art. 21 objection, already listed).
4. `privacy-de.ts §5(2)` — extend the existing cross-tenant admin-read-access disclosure to cover **behavioural** analytics viewed in the admin center.
5. Mirror 1–4 into the EN twins for Art. 12 parity.

---

## 7. The admin dashboard at caelex.eu/admin

### 7.1 Route + auth

**Build a NEW top-level `(admin)` route group** — `src/app/(admin)/admin/` — not an extension of `/dashboard/admin/analytics`. Reasons: the literal target is `caelex.eu/admin`; the dashboard tree forces the page through `resolveComplyUiVersion()` + the V1/V2 shell switch (irrelevant chrome); a sibling group gets its own minimal dark navy/emerald layout. 301-redirect `/dashboard/admin/analytics → /admin` so old bookmarks survive.

**Gate on the existing `isSuperAdmin(session.user.email)` allowlist** (`src/lib/super-admin.ts`) — **not** the broad `requireRole(["admin"])` the 8 old routes use (which grants any `User.role==='admin'/'auditor'` staffer). A center that surveils every product and every customer must be **founder-only.** Defence-in-depth, mirroring the codebase's existing 3-layer pattern:

1. **Middleware route-gate** in `src/middleware.ts` — add a `pathname.startsWith('/admin')` branch beside the existing `/dashboard` gate (`:592`); session-cookie + MFA check; redirect non-super-admins to `/dashboard`. (Today middleware does CSP + rate-limit exemptions but has **no** `/admin` gate.)
2. **Server-side** `(admin)/layout.tsx` re-checks `isSuperAdmin` (server component — fixing the **client-only** weakness of today's `dashboard/admin/layout.tsx`, which only `useSession()`-redirects).
3. **Every** read route under `/api/admin/v2/*` calls `isSuperAdmin()` as the **real boundary.**

**Audit every view.** Reuse the existing tamper-evident `logSuperAdminAccess()` / `super_admin_cross_tenant_access` audit pattern (hash-chained, DPA-disclosed) on **every load of the admin center and every per-customer drill-down**, so "who viewed which customer's behaviour" is answerable under DPA §5.

### 7.2 Reuse the chrome verbatim — no new design system

Lift, into shared `src/components/admin/` (unguarded), the production-grade kit already in `dashboard/admin/analytics/page.tsx`: the generic `useAnalyticsData<T>(endpoint, range)` fetch hook (point it at `/api/admin/v2/{endpoint}`), `MetricCard` (sparkline + change% + 5 colour variants), `TabButton`, `TimeRangeSelector` (7d/30d/90d/12m), the Recharts import block (ComposedChart/AreaChart/BarChart/PieChart/Cell), the `AnimatePresence mode='wait'` tab pattern, and the sticky `backdrop-blur-xl` header with per-tab CSV export. **Theming is CSS-var driven** (`--accent-primary` = emerald, `--text-primary`, `--surface-sunken`, `--accent-danger/warning/info`) → the navy/emerald palette is inherited with **no hardcoded colours.** Decompose the **1972-LOC monolith** into `(admin)/admin/_tabs/*` (one ≤200-LOC component per tab) as it is extended.

### 7.3 Information architecture — three layers

**LAYER 1 — Cross-product Cockpit (the founder home screen):**

- **North-Star strip:** one `MetricCard` per product with its single North-Star + sparkline (data from `AnalyticsDailyAggregate dimension='product'`).
- **Global Pulse:** DAU/WAU/MAU `ComposedChart` (already computed by the cron) + signups + a **live tile** (last-15-min event count, read straight from `AnalyticsEvent`).
- **The Growth Funnel (marquee):** anonymous visit → `signup_started` → `signup_completed` → first product event → habitual (≥3 active days) → paid, sliced by `?breakdown=product` and `?breakdown=utm_source`. Joins `AcquisitionEvent` → first `OrganizationProductAccess.product` event → `RevenueSnapshot`.
- **Per-product adoption grid:** rows = 5 products, columns = [active orgs, WoW growth, MRR-per-product, AI-tokens/COGS, retention D30].
- **Cross-sell matrix:** a 5×5 grid of orgs active in >1 product — the strongest upsell signal; **no single-product tool can show this.**

**LAYER 2 — Five per-product deep-dive tabs** (each a thin composition of the kit, fetching `/api/admin/v2/product/{atlas|comply|passage|scholar|pharos}`): the per-product screens of §3.5 — Atlas top-topics + search→read→draft→export funnel + AI-mode adoption + tokens/COGS; Comply module-adoption breadth + assessment completion-rate per regulation + document volume; **Passage classify→licence→ship funnel from `operation_status_changed` transitions** + time-in-status; Scholar reading its 8 `Scholar*` models directly (Planspiele completion, scenario popularity, classroom retention); Pharos workflow-state + SLA latency (not DAU). Each tab gets a breakdown dropdown (by plan/country/org).

**LAYER 3 — Cross-cutting Explorers** (an "Explore" tab family giving founder-level depth without a full query builder — sufficient for a handful of technical users):

- **Funnels** — step-builder (pick product + ordered events) → funnel bar chart + conversion% + median time-between-steps + breakdown.
- **Retention** — the signup-week × return-week **cohort grid** (the single most important growth-health viz), per-product toggle.
- **Path/Flow** — session-ordered next-screen flow (Sankey-style), surfacing drop/loop points.
- **Dwell heatmap** — per-screen median engaged-time + rage/dead-click counts (~80% of session-replay insight, PII-free).
- **Live feed** — real-time scrolling list of recent **pseudonymised** events (last N min) — the Bloomberg pulse.
- **Acquisition** — extend today's Acquisition tab: UTM → signup → product-activation attribution.
- **System/API health** — reuse today's Infrastructure tab (`SystemHealthMetric` + `ApiEndpointMetrics`); **fill the p50/p95/p99 fields** (declared, only `avgLatency` populated today).

### 7.4 How it extends the existing 6-tab dashboard

Today's 6 tabs (Executive Summary, Revenue, Product, Customers, Acquisition, Infrastructure) are **business/marketing-only**. The new center keeps Revenue/Customers/Acquisition/Infrastructure (extended with a `product` param), promotes Executive Summary into the **Cross-product Cockpit**, and adds the two **new tab families** the goal requires: **per-product Product-Usage deep-dives** (Layer 2) and the **Explorers** (Layer 3). The 1969→1972-LOC `page.tsx` monolith is decomposed rather than overloaded.

### 7.5 Read-route namespace (decision)

Introduce a parallel **`/api/admin/v2/*`** namespace rather than overloading the 8 existing `/api/admin/analytics/*` routes — so the founder-only `isSuperAdmin` gate diverges cleanly from the broad `requireRole(["admin"])` gate the old routes use. **Share query logic** via shared lib functions; cache rollup reads with `withCache`; rate-limit with the existing `admin` tier (30/min).

---

## 8. MVP (smallest end-to-end valuable slice) + the founder demo

### 8.1 The MVP

A vertical slice that is **honestly end-to-end** (instrumentation → ingestion → aggregation → dashboard) and immediately steers the business:

1. **Fix the tracking-mount regression + ship the shared provider.** One `<AnalyticsProvider/>` in `src/app/layout.tsx`; the shared `useTracking()` hook; `product` derived from path; consent gate consulted once; micro-batch + array ingestion. **Result: all five products emit `page_viewed` + `screen_dwelled` immediately** (the regression that silently kills Comply on V2 is closed, and 4 dark products light up).
2. **Add the `analytics` rate-limit tier** (the only true infra hard-requirement).
3. **Generalise the cron** off the `/dashboard/modules/` prefix to per-product feature usage (`AnalyticsDailyAggregate dimension='product'`); add the **retention cohort** pass.
4. **Ship the Cross-product Cockpit** (Layer 1): North-Star strip + DAU/WAU/MAU + the **growth funnel** + the per-product adoption grid (minus the AI-COGS column) — reusing the existing chrome in the new `(admin)` group, gated by `isSuperAdmin` at all three layers.
5. **Ship the Retention cohort grid** explorer.
6. **Ship the privacy fixes that the new tracking legally requires** — disclosure rewrite + `CONSENT_VERSION` bump + extend retention/erasure to `AcquisitionEvent` + the `analytics-by-userId` DSAR/erasure module. (Non-negotiable: these are part of "valuable", not phase 2, because the new tracking is unlawful to ship without them.)

**Explicitly deferred from MVP:** Path/Flow Sankey, Dwell heatmap, Live feed, Scholar/Pharos deep-dive tabs, AI-tokens/COGS column, monthly partitioning, Plausible.

### 8.2 The founder demo (the "krass" moment)

Open `caelex.eu/admin`. The cockpit shows, **in one screen**: five product North-Stars ticking; the global pulse with a live tile incrementing as a teammate clicks around Atlas; the **growth funnel** sliced by product — _"42 anonymous visits this week → 7 signups → 4 activated, and 3 of those activated into Comply, 1 into Passage"_; and the cross-sell row — _"2 Comply customers also touched Atlas this week"_ (the upsell signal no external tool can produce). Then click the **Retention** tab: the signup-week × return-week grid shows whether the curve flattens. The pitch lands because every number is real, cross-product, and self-hosted under full GDPR control.

---

## 9. Phased build plan (rough effort)

> Effort is rough order-of-magnitude for one engineer. "S" ≈ ≤1 day, "M" ≈ 2–4 days, "L" ≈ ~1 week.

**Phase 0 — Decisions + privacy foundation (gating).** Owner/DPO sign-off on the §6.1 two-basis split + the LIA; rewrite cookie/privacy disclosures (§6.2/§6.7); bump `CONSENT_VERSION`; fix the `AcquisitionEvent` erasure bug + build the `analytics-by-userId` DSAR/erasure+export module (§6.4); reconcile consent sources (§6.5). **Effort: M.** _Blocks lawful capture of the new events._

**Phase 1 — Instrumentation spine (MVP core).** Typed event catalogue (`src/lib/analytics/events.ts`) + `product` envelope; shared `<AnalyticsProvider/>` + `useTracking()` mounted in root layout (fixes the V2 regression, lights up all 5 products); dwell via `timing()`/`durationMs`; delegated clicks + scroll; micro-batch emitter. **Effort: M.**

**Phase 2 — Ingestion + storage hardening.** `analytics` rate-limit tier + array-batch ingestion + `createMany`; additive `AnalyticsEvent.product` column + `[product,eventType,timestamp]`/`[sessionId,timestamp]` indices; create the 3 rollup tables. **Effort: S–M.**

**Phase 3 — Aggregation.** Generalise the cron's feature pass to per-product maps; add dwell + retention-cohort passes; split the heavy passes into a second `/api/cron/analytics-rollup` cron (fra1, ~02:30); register the rollup tables in the retention cron + privacy §3(3). **Effort: M.**

**Phase 4 — The admin center (MVP dashboard).** New `(admin)/admin/` group + dark navy/emerald server layout; 3-layer `isSuperAdmin` gate (middleware + layout + `/api/admin/v2/*`) + `logSuperAdminAccess` on every view; lift the chrome kit into `src/components/admin/`; ship the Cross-product Cockpit (Layer 1) + the Retention grid explorer; 301-redirect the old route. **Effort: L.**

**Phase 5 — Funnel spines + per-product status events.** `serverAnalytics`-emitted Trade `operation_status_changed`, Pharos `workflow_advanced`/`approval_signed`; generalise Comply `assessment_completed` to all 4 wizards; Atlas `draft_started`→`draft_completed`→`export` (one-time `ALLOW_CROSS_SURFACE` where unavoidable); build the per-product Funnels explorer + the Passage/Comply/Atlas deep-dive tabs. **Effort: L.**

**Phase 6 — Depth + polish.** Path/Flow Sankey + `AnalyticsPathEdge`; Dwell heatmap; real-time Live feed; Scholar deep-dive (reads existing models) + Pharos workflow tab; AI-tokens/COGS column (needs token accounting — §10); fill p50/p95/p99. **Effort: L.**

**Phase 7 — Scale (only when triggered).** When the raw table approaches ~10–50M rows: out-of-band monthly RANGE-partitioning SQL migration; optionally Plausible for public top-of-funnel. **Effort: M, deferred.**

---

## 10. Key decisions / open questions for the owner

These are flagged, not assumed:

1. **Lawful basis (THE load-bearing decision).** Accept Art. 6(1)(f) legitimate interest (with a documented LIA + Art. 21 opt-out) for pseudonymous, logged-in, cross-product product-usage telemetry — i.e. run aggregate analytics **without** a consent wall for Class-A data? If the answer is "consent for everything", the center inherits today's reality where most events are dropped unless the user opts into analytics cookies. The route's `essentialEvents` allowlist is the code seam either way.
2. **Cross-product identity graph.** Linking the same human across Atlas/Comply/Passage/Scholar/Pharos is a new purpose under Art. 5(1)(b). Consent-gated (recommended) or asserted under LI? Does a compliance company holding itself to its own standard want the stricter (consent) path for optics even if LI is arguable?
3. **Raw-text capture.** Atlas/Trade payloads can contain privileged matter; the taxonomy logs `query_len` + hashed `topic` only. Does the owner also want **opt-in** raw-text capture for internal product improvement (separate consent, shorter retention, EU-only), or is hashed/aggregated strictly sufficient? Pure legal-basis call.
4. **Pharos in scope?** Pharos users are external regulators/authorities, not customers. Track them at all (and if so, workflow-throughput only — no DAU/dwell on regulator staff) for contractual/optics reasons?
5. **Revenue source of truth.** Keep MRR from `FinancialEntry` (manual/bank-import, MRR-components left at 0), or wire Stripe Subscription events into `RevenueSnapshot`'s MRR-component fields?
6. **AI-COGS-per-product.** Is per-request Anthropic token count already persisted (`AstraMessage` / agent runs), or does the shared engine need a lightweight `ai_usage` event before the cockpit's COGS column can be built? (Determines whether AI-COGS is MVP or Phase 6.)
7. **Real-time depth.** Sub-minute live tiles (uncached `AnalyticsEvent` scans on every founder load) or 5-min "near-live" (`withCache`)? The brief lists a live feed, so at least the Explorer feed needs the direct-read path.
8. **Founder gate permanence.** Is the hardcoded `isSuperAdmin` allowlist (5 emails, incl. 2 personal gmails) the intended permanent boundary, or should `/admin` move to an env/DB-backed super-admin role so a non-founder growth analyst can be granted access without a code deploy?
9. **Guard scope.** The pre-commit guard protects Atlas/Pharos/legal-network only; `(trade)`, `(scholar)`, `(comply)` are **not** path-guarded. Is that intentional, or should Trade/Comply instrumentation also assume guard coverage (affecting whether a one-time `ALLOW_CROSS_SURFACE` wiring is ever needed for them)?
10. **Rollup retention window.** Aggregates hold no `userId` and are pseudonymous — 13–24 months for trend/retention if the LIA argues effective anonymity? Should `AnalyticsPathEdge` (most re-identifying at low traffic) get a shorter window than the pure count tables? Must be argued in the LIA, not assumed.
11. **Partitioning delivery.** Since `build:deploy` uses `db push` (can't express partition DDL), is a parallel out-of-band raw-SQL migration step (`prisma migrate deploy`/`psql`) acceptable for the one-time partition setup, kept outside the pushed schema — or should `AnalyticsEvent` first move onto the migrate workflow?

---

### Appendix A — Verified file map (read 2026-06-08, `feat/caelex-scholar`)

- Schema: `prisma/schema.prisma` — `OrganizationProductAccess:3425`, `ProductCode:3459`, `AnalyticsEvent:4691`, `AnalyticsDailyAggregate:4725`, `CustomerHealthScore:4751`, `FinancialEntry:4782`, `RevenueSnapshot:4822`, `FeatureUsageDaily:4857`, `AcquisitionEvent:4884`, `SystemHealthMetric:4919`, `ApiEndpointMetrics:4942`, `UserConsent:5037`, `ConsentRecord:12976`, `Scholar*:15189-15328`.
- Ingestion: `src/app/api/analytics/track/route.ts` (consent gate L65-81, ipCountry L84-87, event create L93+, AcquisitionEvent derivation).
- Client lib: `src/lib/analytics.ts` (sessionId L70-82, pathname L105, consent read L117, sendBeacon L128-131, timing L209 — 0 callers, identify L225).
- Tracking hook: `src/hooks/useAnalyticsTracking.ts` (consent L11, identify L41, page L52) — mounted ONLY in `src/app/dashboard/DashboardShell.tsx:79`.
- V2 regression: `src/components/dashboard/v2/V2Shell.tsx:108` (no tracker); `src/app/dashboard/layout.tsx:61` (V2 for super-admins); `src/lib/comply-ui-version.server.ts` (super-admin→v2, fallback v1→v2).
- Crons: `src/app/api/cron/analytics-aggregate/route.ts` (maxDuration 120 L8, module-path lock L128, 8 hardcoded names L140-148, `moduleCategory:"compliance"` L177); `src/app/api/cron/data-retention-cleanup/route.ts` (AnalyticsEvent 30d/90d L128-141, ScholarSearchHistory 90d L248-252; no coverage for AcquisitionEvent/FeatureUsageDaily/CustomerHealthScore/ApiEndpointMetrics).
- Dashboard: `src/app/dashboard/admin/analytics/page.tsx` (1972 LOC; `useAnalyticsData` L237; `MetricCard` L280; `--accent-primary` theme); 8 routes `/api/admin/analytics/*` all `requireRole(["admin"])`; client-only gate `src/app/dashboard/admin/layout.tsx`.
- Auth: `src/lib/super-admin.ts` (`isSuperAdmin` 5-account allowlist + `logSuperAdminAccess` + DPA disclosure); `src/lib/dal.ts` (`requireRole`); `src/middleware.ts` (/dashboard gate L592, NO /admin gate; matcher L798).
- Guard: `.husky/pre-commit` (FORBIDDEN regex L81 — Atlas/Pharos/legal-network only; `ALLOW_CROSS_SURFACE=1` override).
- Privacy: `CookieConsent.tsx` (`CONSENT_VERSION="2026-05-19"` L21, `analyticsDesc` L229); `src/lib/consent-log.ts` (hashIp /24·/48, UA-80, PEPPER); `cookies-de.ts §3(C)` L81 (Vercel-only/cookieless claim); `privacy-de.ts §2` L48-51 (6(1)(b)+(f)), `§3(3)` L80-87 (cron path + 90d/30d figures).
- Erasure/DSAR: `src/app/api/user/delete/route.ts` (AnalyticsEvent L162 nulls userId, ScholarSearchHistory L181 deleted; **AcquisitionEvent NOT erased**); `src/app/api/user/export/route.ts` (no analytics/acquisition/consent).
- Deploy: `package.json:8` (`build:deploy` uses `prisma db push --accept-data-loss`); `db:migrate` L19 available; ~28 migration folders in `prisma/migrations/`.
- Infra: `src/lib/ratelimit.ts` (no `analytics` tier; `admin` 30/min; `getIdentifier` 4-layer); `src/lib/cache.server.ts` (`withCache`, `caelex:cache:`, 5-min TTL); `vercel.json` `regions:["fra1"]`.
