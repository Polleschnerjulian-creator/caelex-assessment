# Caelex Command Center — `caelex.eu/admin`

## A world-class, real-data, zero-external-cost founder/admin cockpit

**Author:** Lead Product Architect · **Date:** 2026-06-09 · **Status:** Decision-ready (founder sign-off requested)
**Grounding:** 5 audit agents + direct code verification against `.worktrees/caelex-scholar` (branch `feat/caelex-scholar`). Every model/route/field below was grep-verified in the actual codebase.

---

## 0. TL;DR for the founder (read this first)

You do **not** have a fake admin and you do **not** have a greenfield build. You have a **production-grade analytics spine running on almost no fuel**, plus a **1,972-line legacy CEO dashboard** that overlaps it. The decisive facts:

1. **The new `(admin)` v2 surface is genuinely world-class plumbing.** Four pages (Cockpit / Funnels / Paths / Retention) are real Prisma reads against PII-free rollup tables, gated by a 3-layer super-admin defence, access-audited, Redis-cached, fed by registered crons. I found **zero `Math.random`, zero hardcoded numbers, zero mock fixtures** in the data path. This is the keeper.
2. **The single biggest problem is data starvation, not fakeness.** Of **54 defined event types** (`src/lib/analytics/events.ts`), **none of the ~30 product-funnel events are emitted anywhere** outside the analytics library. I verified this directly: a repo-wide grep for `EVENT_TYPES.(COMPLY_|TRADE_|ATLAS_|SCHOLAR_|PHAROS_|ACQ_)` returns **nothing** in product code. Only **4 generic events auto-fire** (page_viewed, screen_dwelled, element_clicked, user_identified) + a single `signup`. Consequence: the `trade_classify_to_license` and `comply_activation` funnels render but are **permanently zero past signup**, and channel attribution is **blind**.
3. **Revenue is structurally hollow.** MRR = "sum this month's `FinancialEntry`", and `FinancialEntry` is **manual-only** (no Stripe sync). The `RevenueSnapshot.{newMrr, expansionMrr, contractionMrr, churnedMrr, cashBalance, burnRate, runwayMonths}` columns **exist in the schema but are never written** — they sit at 0. So MRR reads €0 and NRR (the one number investors steer on) is absent.
4. **You can ship a complete cockpit on data you already own.** Every "missing" depth metric is **derivable at €0** from authoritative domain tables that exist today: `TradeItem`/`TradeScreeningResult`/`TradeLicense`/`TradeOperation`, `AtlasMessage` (with per-message `costUsd`!), `AstraMessage`, `GeneratedDocument`, `NCASubmission`, `Deadline`, `OrganizationProductAccess`, `ScholarPlanspielRun`, `WorkflowTransition`/`ApprovalSignature`. No vendor, no new infra.
5. **The product dimension — your #1 steering signal — is half-wired.** `AnalyticsEvent.product` and `ProductCode {COMPLY, TRADE, ATLAS, PHAROS, SCHOLAR}` exist; `FeatureUsageDaily` is already per-product. But revenue, health, and activation are still blended across 5 businesses with different buyers and price points.

**The plan, in one line:** Make `(admin)` v2 canonical → kill the legacy 1,972-LOC page → fill revenue + per-product depth from data you already own (P0, ~zero new capture) → wire the 30 dead events + UTM capture so funnels and attribution come alive (P1) → add the Steering/PMF home screen + forecasting (P2). **All zero external cost.**

> **One correction to the source research:** one audit treated **Ephemeris as a 6th standalone product**. The entitlement enum `ProductCode` has exactly **5 members** (COMPLY, TRADE, ATLAS, PHAROS, SCHOLAR) — Ephemeris is a _feature inside Comply_, not a billable product. This concept uses **5 products** everywhere. Use `OrganizationProductAccess` (not a path heuristic) as the source of truth for "what is a product."

---

## 1. Verdict on the current state — keep / kill / merge

You have **two** admin surfaces. Here is the honest verdict on each.

### Surface A — Legacy `dashboard/admin/` (the 6-tab "CEO Analytics")

- **Where:** `src/app/dashboard/admin/analytics/page.tsx` (**1,972 LOC**, verified) + 8 routes under `/api/admin/analytics/{overview,revenue,product,customers,acquisition,infrastructure,export,financial-entry}`.
- **What's real:** Counting metrics are trustworthy — users, orgs, documents, spacecraft, per-module assessment counts, subscriptions, DAU/WAU/MAU, signups. Every empty branch renders an honest "No data available" (no fabricated fallbacks). This page is **not a mock**.
- **What's fake/hollow:**
  - **Revenue tab** reads €0 — `mrr: currentRevenue` is literally stubbed with the comment _"Will be refined when Stripe integration is added"_; NRR is heuristic `100 ± (newSubs vs churned)`.
  - **Infrastructure tab is the worst offender** — `SystemHealthMetric` has **0 writers and 0 reads** (verified), so CPU/memory/disk/db tiles are permanently 0; `trackApiCall()` has **0 callers** (verified), so API latency/uptime/error-rate are empty and uptime shows a hardcoded-feeling 99.99%. **A CEO is being shown fake 99.99% uptime.**
  - A latent bug: the Product route matches only `eventType='page_view'` while the cron also matches `'page_viewed'` → progressive undercount.
- **Auth:** Client-side gate only (`"use client"` + `useSession` redirect — verified). Harmless because every data route re-checks `requireRole(["admin"])` server-side, but it's defence-in-depth, not the boundary.
- **Verdict: KILL the analytics page + its 8 routes** once v2 absorbs the 3 unique capabilities (manual FinancialEntry entry/export, per-module assessment breakdown, infra-if-kept). It's a **clean, self-contained retirement** — verified that _only_ `dashboard/admin/analytics/page.tsx` consumes `/api/admin/analytics/*`.

### Surface B — New `(admin)/` v2 (the "Analytics Center" / Cockpit)

- **Where:** `src/app/(admin)/admin/{page(Cockpit), funnels, paths, retention, crm}` + 4 routes `/api/admin/v2/{cockpit,funnels,paths,retention}`, shared primitives (`AdminCard`, `KpiTile`, `RangeTabs`, `useAdminData`, `format.ts`), and the heavier `analytics-rollup` cron feeding graph-shaped tables (`AnalyticsPathEdge`, `AnalyticsFunnelDaily`, `AnalyticsRetentionCohort`).
- **What's real:** **Everything in the data path.** Disciplined 4-state pages (loading/error/empty/data), pure unit-tested helpers (`cockpit-data.ts`, `funnel-data.ts`, …, each with a co-located `.test.ts`), 3-layer super-admin gate (`requireSuperAdminPage` + per-route `requireSuperAdminApi` + hash-chained `AuditLog` via `logSuperAdminAccess` — all verified), 5-min Redis cache, MFA-aware redirects.
- **What's starved:** 3 of 4 pages are half-empty because the product events never fire (see §1-verdict point 2 in TL;DR). Retention/Paths partially rescue themselves via URL-inferred `productFromPath`; the **Funnels page cannot** — its activation steps are zero by construction.
- **Polish gaps (a notch below Stripe/Linear):** read-only (no CSV/PNG export, no date-picker beyond 7/30/90, no drill-down from a product row into its funnel); no "as of yesterday" freshness stamp despite the API returning `generatedAt` and data being T-1; raw union labels ("7d" not "7 days"); inline `onMouseEnter` color hacks instead of CSS `:hover`; no keyboard nav on `role="tablist"`. **Doc drift (verified):** `AdminSidebar` docstring says "four-item IA" but the rail has **5 items** (Cockpit/CRM/Retention/Funnels/Paths); `AdminShell` hardcodes the topbar label "Analytics Center" even on the CRM route.
- **Verdict: KEEP and make CANONICAL.** It is the flagship. Point the dashboard sidebar's "Analytics" link here. Fix the polish + doc drift as part of P0.

### What to MERGE (legacy → v2 before deletion)

1. Manual `FinancialEntry` entry form + CSV export.
2. Per-module assessment-type breakdown (currently only on legacy Product tab).
3. Infrastructure **only if** you wire real telemetry (else drop it — don't port fake 99.99%).
4. The operational pages that v2 does **not** duplicate stay where they are (do **not** kill): Users, Organizations, Audit, Bookings, Contact-Requests, the 3 Atlas review queues, and the §203-StGB compliance register (the one Server Component, stronger `requirePlatformAdmin` gate). CRM is **already unified** — both routes render one `CrmWorkspace`.

---

## 2. Canonical Information Architecture

The cockpit is **North-Star-first** with a **global product switcher** (All · Atlas · Comply · Passage · Scholar) on every view — mirroring how Vercel scopes by project. An **AARRR spine** underneath, and a dedicated **Steering** tab that is the founder's home screen. Sections below; the structured `informationArchitecture` array carries the machine-readable version with real data sources + status.

| #   | Section                          | Purpose                                                                                                                                 | Status                                      |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **Steering / PMF (home)**        | "Which product/jurisdiction/regulation do I double down on, and where do users drop off?" — the one screen that drives roadmap + spend. | **new** (composed from existing data)       |
| 2   | **Cockpit (Executive snapshot)** | One-glance health: NSM, MRR/NRR, DAU/WAU/MAU, signups, per-product engagement.                                                          | **exists-real** (extend)                    |
| 3   | **Revenue**                      | True plan-priced MRR/ARR, MRR-movement waterfall, NRR, Quick Ratio, ARPA, churn, runway.                                                | **exists-mock** → real                      |
| 4   | **Growth & Acquisition**         | Channel mix, signup→activation→paid funnel by source, CAC/LTV, top-of-funnel demand (demos/contact/newsletter), CRM pipeline.           | **exists-mock** (attribution blind)         |
| 5   | **Activation & Retention**       | Per-product activation funnels with aha-moments; weekly cohort retention triangles; stickiness; resurrection.                           | **exists-real** (starved → fed)             |
| 6   | **Product Engagement & Paths**   | Per-product feature-adoption matrix, depth metrics (assessments/classifications/drafts), navigation Sankey, drop-off map.               | **exists-real** (breadth) + **new** (depth) |
| 7   | **Customers & Health**           | Health-score watchlist 2.0, at-risk + expansion lists, per-product paid/trial/churn, plan mix.                                          | **exists-real** (upgrade)                   |
| 8   | **Ops / SLO & Cost**             | Real SLO/error-budget, per-cron health (17 crons), AI cost-per-active-account.                                                          | **exists-mock** (fake infra) → real-or-hide |
| 9   | **Operations (keep-as-is)**      | Users, Orgs, Audit, Bookings, Contact-Requests, Atlas queues, §203 register.                                                            | **exists-real** (do not touch)              |

---

## 3. Headline metrics + ideal visualizations per section (Stripe/Linear/Vercel bar)

**Cross-cutting rule:** every metric card carries a **sparkline + period-over-period delta + alert threshold**. Revenue is a **waterfall, not a number**. Retention is a **triangular heatmap**. PMF is a **bubble chart**. Cadence is mixed: ops = near-real-time; executive/AARRR = daily (existing crons, +product dimension); retention/cohort/NRR = weekly-cohort.

### §1 Steering / PMF (the home screen)

- **North Star — Weekly Active Compliance Outcomes (WACO):** product-weighted count of distinct orgs producing ≥1 core value-event/week. Per-product canonical outcome: Atlas = research/draft completed; Comply = assessment/module completed; Passage = classify→licence→ship action; Scholar = research session; Pharos = approval signed.
  - _Why:_ for compliance software, value = "a regulatory outcome was produced." Usage-rooted NSM beats vanity logins and is leading vs lagging MRR. **Source:** `AnalyticsEvent` value-events once wired + domain-table fallback (assessments, Trade lifecycle).
  - _Viz:_ big-number + 12-week trend + per-product stacked contribution.
- **PMF traction matrix — product × jurisdiction × regulation:** ranked by value-events (assessments run, NCA submissions, classifications, research sessions). **Source:** the 10-12 `*Assessment` models + `NCASubmission` + `Deadline` + `GeneratedDocument`, grouped by `User.establishmentCountry` / per-framework jurisdiction fields. _Viz:_ **bubble chart** (x = adoption, y = WoW growth, size = revenue).
- **Drop-off / friction map:** biggest step-to-step abandonment per product's core flow. **Source:** `AnalyticsFunnelDaily` (once events fire) + `AnalyticsPathEdge`. _Viz:_ funnel with the worst-leak step highlighted red.

### §2 Cockpit

- **KPIs:** NSM, MRR, NRR, DAU/WAU/MAU + **stickiness DAU/MAU**, signups, page-views. **Source:** `AnalyticsDailyAggregate` (dau/wau/mau/signups/page_views) — all real today. _Viz:_ 6 KpiTiles w/ sparkline + delta; Recharts area+line DAU trend.
- **Per-product engagement table:** features touched, peak users, actions, avg dwell — **link each row → its Funnels/Paths**. **Source:** `FeatureUsageDaily` grouped by `<product>:` prefix (real today). _Viz:_ sortable table w/ inline bars.
- **Freshness stamp:** render the already-returned `generatedAt` as "as of <yesterday> · nightly rollup" (fixes the staleness-honesty gap).

### §3 Revenue

- **MRR-movement waterfall:** new / expansion / contraction / churned / reactivation → ending MRR. **Source:** populate the **already-existing** `RevenueSnapshot.{newMrr,expansionMrr,contractionMrr,churnedMrr}` by diffing each org's plan-priced MRR vs prior snapshot. _Viz:_ Stripe-style bridge chart.
- **NRR + Quick Ratio + ARPA:** NRR = (startMRR + expansion − contraction − churn)/startMRR for the retained cohort; Quick Ratio = (new+expansion)/(contraction+churn). **Source:** derived from the waterfall. _Viz:_ NRR gauge w/ 100% reference line.
- **Plan-priced MRR/ARR:** replace the `mrr=currentRevenue` stub with Σ active-`Subscription`.plan × `src/lib/stripe/pricing.ts` (FREE €0 / STARTER €299 / PROFESSIONAL €799 / ENTERPRISE custom — verified). **Per-product MRR** via `OrganizationProductAccess × pricing`. _Viz:_ plan-mix stacked area + product split.
- **Runway/burn:** burn = trailing `FinancialEntry(expense)` − revenue; runway = cashBalance/burn (columns exist; needs a tiny cash-input form). _Viz:_ runway countdown.

### §4 Growth & Acquisition

- **Channel mix + funnel by source:** visit→signup→activation→paid per UTM source. **Source:** `AcquisitionEvent` (source/medium/campaign) — wired at the route but **fed only on signup today**; lights up once `acq_page_viewed` carries UTM. _Viz:_ funnel + channel bar.
- **Top-of-funnel demand:** demos requested→booked→completed, contact volume, newsletter growth, pulse-lead→signup conversion. **Source:** `DemoRequest`, `Booking`, `ContactRequest`, `NewsletterSubscription`, `PulseLead` (`convertedToOrgId`), CRM `CrmCompany/Contact/Deal` — **all real today, none surfaced.** _Viz:_ weighted-pipeline board.
- **CAC / LTV:CAC by channel:** marketing spend tagged in `FinancialEntry.category` ÷ new logos. _Viz:_ efficiency scatter.

### §5 Activation & Retention

- **Per-product activation funnel + time-to-activate:** % of signup cohort reaching the product aha-moment within N days. **Source:** `AnalyticsFunnelDaily` (`comply_activation`, `trade_classify_to_license` + new atlas/scholar/pharos defs). _Viz:_ funnel + median-time bar.
- **Cohort retention triangle:** weekly signup cohorts × activity-week, per product. **Source:** `AnalyticsRetentionCohort` (`productScope` = all + each ProductCode) — **already populated** by `analytics-rollup`. _Viz:_ triangular heatmap (the strongest page today).
- **Resurrection:** orgs active after ≥30d gap. **Source:** `AnalyticsEvent` timeline + reengagement cron.

### §6 Product Engagement & Paths

- **Feature-adoption matrix:** feature × week, color = unique-user penetration vs entitlement. **Source:** `FeatureUsageDaily.uniqueUsers ÷ OrganizationProductAccess` entitled count. _Viz:_ adoption heatmap.
- **Depth metrics (the real value events):** assessments completed, classifications, screening hit-rate, licenses granted, drafts, AI messages + **USD cost**. **Source:** domain tables — `TradeItem.status`/`TradeScreeningResult.decision`/`TradeLicense.issuedAt`, `AtlasMessage.costUsd`, `AstraMessage.tokensUsed`, `GeneratedDocument`. _Viz:_ per-product KPI strip.
- **Navigation Sankey:** **Source:** `AnalyticsPathEdge` (real today, consumed by `/api/admin/v2/paths`). _Viz:_ Sankey (or honestly relabel the current bar-list — the code over-promises "Sankey").

### §7 Customers & Health

- **Health watchlist 2.0:** ranked at-risk (declining trend + high/critical) + expansion list (high-health near plan limits). **Source:** `CustomerHealthScore` (real today, but `trend` is hardcoded 'stable' and ignores domain depth + billing — fix both). _Viz:_ ranked list w/ reason codes; feeds `ChurnIntervention`.
- **Per-product paid/trial/churn + plan mix.** **Source:** `OrganizationProductAccess` (status transitions) + `Subscription`. _Viz:_ plan-mix Sankey (upgrades/downgrades).

### §8 Ops / SLO & Cost

- **SLO/error-budget:** uptime, error-rate, p50/p95/p99. **Source:** `ApiEndpointMetrics` once `trackApiCall` is wired into a route wrapper/middleware (**0 callers today**), or read Vercel/Sentry (already integrated). Note `ApiRequest` already gives accurate **customer-key** API metrics today. _Viz:_ error-budget burn-down.
- **Per-cron health (17 crons):** emit success/duration at each cron end. _Viz:_ last-run grid.
- **AI cost-per-active-account:** `AtlasMessage.costUsd` + `AstraMessage` tokens × model price. _Viz:_ cost vs revenue margin line.
  > **Honesty gate:** until telemetry is real, **hide System Health or badge it "Coming soon"** — never show fake 99.99% uptime / 0% CPU to a founder.

---

## 4. Zero-cost data-collection & instrumentation plan

**Principle:** nearly everything is **emission wiring + DB-derived cron aggregates** — no paid tools, no new infra. The GDPR posture is already strong (closed enums, slug/pathname-only payloads, server-side `ipCountry`, consent gate, PII firewall) and **every addition stays inside it** (bounded slugs + numbers; never query text — only `queryLen` + a normalized topic).

### 4a. Fix the emitter (prerequisite — P0, S)

`serverAnalytics.track` (`src/lib/analytics.ts` ~486-514) writes `eventData` **flat** and **never sets `product`**, unlike the client `buildEventData` which nests typed props under `eventData.payload` and stamps `product`. The rollup reads `eventData.payload.*` and groups by `product`. **Fix first** — set `product` (via `productFromPath` or explicit arg) + nest `payload`. Without this, every server-emitted product event misses product-scoped rollups + dwell extraction.

### 4b. Wire the ~30 dead events at handlers that already exist (P1, M-L)

Use the existing 54-type taxonomy. The high-leverage batch (each maps to a DB mutation that already runs):

| Event                                                   | Emit at                                                                            | Unlocks                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `comply_assessment_started/completed`                   | `src/app/api/assessment/calculate/route.ts`                                        | `comply_activation` funnel + assessments-by-framework       |
| `comply_module_opened`                                  | Comply module route loader                                                         | middle step of `comply_activation`                          |
| `comply_astra_query`                                    | `src/app/api/astra/chat`                                                           | Astra usage (queryLen + tokens, never text)                 |
| `trade_classify_started/completed`                      | `src/app/api/trade/classify/route.ts`                                              | first 2 steps of `trade_classify_to_license`                |
| `trade_operation_status_changed`                        | `src/app/api/trade/operations/[id]/route.ts:302` (beside the existing audit write) | Passage funnel spine                                        |
| `trade_license_granted`                                 | licence-grant transition                                                           | terminal funnel step                                        |
| `trade_screening_hit/cleared`                           | `src/app/api/trade/parties/[id]/screen/route.ts`                                   | sanctions-screening friction                                |
| `atlas_search_ran` / `atlas_semantic_search_ran`        | `src/app/api/atlas/search` + `semantic-search`                                     | **zeroResults-by-jurisdiction = content-gap demand signal** |
| `atlas_chat_message_sent` / `atlas_case_read`           | `src/app/api/atlas/chat` + case route                                              | Atlas activation + demand-by-jurisdiction                   |
| `scholar_source_read`                                   | Scholar source route                                                               | Scholar engagement (natural pilot — runs on this worktree)  |
| `pharos_workflow_advanced` / `approval_signed/rejected` | Pharos workflow transitions                                                        | regulator funnel throughput                                 |

> **Cleanup:** `confirm-upload/route.ts:299` ('document*uploaded') and `stripe/webhooks/route.ts:151` ('stripe*\*') emit raw strings the route's `isEventType` allow-list **silently drops** — replace with typed events or remove. Retire the legacy `useAnalyticsTracking` hook (still mounted in `DashboardShell`) to avoid double-counting Comply page views.

### 4c. UTM capture with zero tools (P1, M)

In `AnalyticsProvider`, on first marketing pageview read `window.location.search`, slug-normalize `utm_*`, persist to `sessionStorage`, emit `acq_page_viewed` with the slugs — the ingestion route **already** converts that into an `AcquisitionEvent` (`track/route.ts:399`). Add `acq_demo_requested/contact_submitted/newsletter_subscribed` server emits in the respective POST routes + `acq_signup_completed` alongside `signup`. **This is the entire channel-attribution unlock at €0.**

### 4d. DB-derived cron aggregates — NO schema change (P1, M)

`AnalyticsDailyAggregate` is a generic grid `@@unique([date, metricType, dimension, dimensionValue])` (**verified**). Add nightly passes reading existing tables:

| New metric                             | Source table                                                            | dimension               |
| -------------------------------------- | ----------------------------------------------------------------------- | ----------------------- |
| `assessments_started/completed`        | the 10-12 `*Assessment` models                                          | framework, jurisdiction |
| `deadlines_created/met/overdue`        | `Deadline`                                                              | jurisdiction            |
| `nca_submissions`                      | `NCASubmission`                                                         | status                  |
| `documents_generated`                  | `GeneratedDocument`                                                     | docType                 |
| `astra_messages` / `astra_active_orgs` | `AstraConversation`+`AstraMessage`                                      | —                       |
| per-product `dau/wau/mau` + stickiness | `AnalyticsEvent.product` (index `[product,eventType,timestamp]` exists) | product                 |

### 4e. Revenue engine — fill existing columns (P0, M)

The decomposition columns **exist**; the cron leaves them 0 (**verified**). In `analytics-aggregate` revenue pass: (1) replace MRR-as-monthly-revenue with plan-priced MRR (Σ active sub plan × pricing constants, filter `FinancialEntry.isRecurring`); (2) populate `new/expansion/contraction/churnedMrr` by diffing vs prior `RevenueSnapshot`; (3) optionally feed `FinancialEntry(source='stripe')` from `invoice.paid`/`charge.refunded` in the **already-running** `stripe/webhooks/route.ts` for ledger truth. Surface **NRR**.

### 4f. Minimal additive schema (the only migrations needed)

Almost none. The **only** genuinely additive items, if you want them:

- A small **`SystemHealthMetric` writer cron** (optional — only if you keep the infra tab; reads `process.memoryUsage()`/event-loop-lag/Neon pool — no external cost).
- A lightweight **`Lead`/`PipelineDeal`** model (stage, value, source, product, owner) **only if** you don't ingest from an external CRM. Everything else (revenue components, per-product dims, all the derived aggregates) needs **zero schema change** — columns and the generic aggregate grid already exist.

---

## 5. Startup-steering insights layer

The signals that tell you **what to double down on** and **where users leak** — all from the data above:

1. **Which product is working** → per-product **stickiness (DAU/MAU)** + **NSM contribution** + **per-product NRR** (from `OrganizationProductAccess × pricing`). Double down where stickiness AND NRR are highest; deprioritize where both lag.
2. **Which jurisdiction to expand the corpus** → **`atlas_search_ran` zeroResults-rate by jurisdiction** + `atlas_case_read` jurisdiction distribution (demand for content you don't yet have) + assessments-by-jurisdiction. A high zero-result rate in DE/NL/FR = a direct "build this corpus next" signal.
3. **Which regulation/module is the wedge** → PMF bubble chart of `*Assessment` + `NCASubmission` counts per regulation. The biggest bubble with the steepest growth is your land-and-expand wedge.
4. **Where users drop off** → per-product activation funnel worst-leak step (`AnalyticsFunnelDaily`) + navigation Sankey exits (`AnalyticsPathEdge`). E.g. if `trade_classify_completed → trade_license_granted` leaks 80%, the licence flow is the friction.
5. **Who's about to churn / ready to expand** → Health watchlist 2.0 (declining `trend` + domain-depth drop) and expansion list (high health near plan limits).
6. **Which channel to fund** → channel→signup→paid conversion + CAC by source once UTM capture lands.
7. **Margin health** → AI cost-per-active-account (`AtlasMessage.costUsd`) vs MRR per account — critical for an AI-heavy product.

---

## 6. Gap analysis (fake/missing today → target) + phased roadmap

| Area                     | Today                                 | Target                                     |
| ------------------------ | ------------------------------------- | ------------------------------------------ |
| Admin surfaces           | 2 overlapping (legacy 1,972-LOC + v2) | 1 canonical v2; legacy analytics killed    |
| Product events           | 30 defined, **0 emitted**             | all emitted at existing handlers           |
| Funnels                  | zero past signup                      | live per-product activation funnels        |
| Attribution              | blind (UTM never captured)            | channel→paid funnel by source              |
| MRR                      | €0 stub                               | plan-priced MRR + movement waterfall       |
| NRR / expansion / churn$ | absent (columns at 0)                 | computed; NRR headline                     |
| Infra/SLO                | **fake 99.99%**, 0 writers            | real SLO or hidden                         |
| Per-product depth        | breadth only                          | assessments/classifications/drafts/AI-cost |
| Health score             | hardcoded 'stable', page-only         | real trend + domain + billing signals      |
| CRM/demand               | exists, unsurfaced                    | demand + pipeline tiles                    |

### Roadmap (full detail in the structured `phasing` array)

- **P0 — Ship the real core (no new capture):** make v2 canonical + fix polish/doc-drift; fix the `serverAnalytics` emitter; plan-priced MRR + populate `RevenueSnapshot` movement columns + NRR; build the cockpit's per-product **depth** from domain tables; ship the **Steering/PMF home screen** from existing assessment/NCA/Trade data; **hide or honest-badge** the fake infra tab; freeze + plan deletion of the legacy analytics page.
- **P1 — Instrumentation + depth:** wire the 30 events (Comply/Trade first, then Atlas/Scholar/Pharos); UTM capture + acq\_\* emits; DB-derived nightly aggregates (deadlines/NCA/docs/astra/per-product DAU); per-product cohort triangles + activation funnels; Health watchlist 2.0; surface CRM/demand; wire `trackApiCall` (or Vercel/Sentry) for real SLO; **delete the legacy page + 8 routes.**
- **P2 — Advanced / steering:** referral/virality (k from `OrganizationInvitation`); MRR/runway forecasting (reuse the digital-twin 90-day linear pattern); SaaS benchmarking (NRR>100%, Quick Ratio>4); anomaly alerts (LogSnag/email) on signups/revenue/churn/error spikes; CSV/PNG export + custom date-picker + drill-down across all v2 pages; modernize legacy `OrgTable`/`UserTable` (`window.alert()` → toast, forbidden `dark:bg-white/[0.06]` → glass tokens).

---

## 7. The North Star, stated plainly

**Weekly Active Compliance Outcomes (WACO)** — distinct orgs producing ≥1 regulatory outcome/week, product-weighted. Beneath it: **NRR** as the durable business-quality metric, and the **PMF matrix** as the steering instrument. WACO resists vanity (it's not logins), is leading (it precedes MRR), and is true to what Caelex sells: _a regulatory outcome was produced._
