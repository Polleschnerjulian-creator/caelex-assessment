# CAELEX SHIELD — Design Document

**Date:** 2026-03-09
**Status:** Approved
**Author:** Claude (with user specification)

## Overview

Shield is a top-level subsystem in Caelex — on the same level as Ephemeris. It transforms raw Conjunction Data Messages (CDMs) from Space-Track into a fully documented, auditable, regulatory-compliant collision avoidance workflow.

**Critical design principle:** Shield is a compliance documentation tool, NOT an operational decision system. The human operator always decides. Shield documents everything.

**Cost:** €0 — Space-Track API is free. All computation runs on existing Caelex infrastructure.

## Architecture

```
Space-Track API → CDM Polling Cron (30min) → Parse & Classify → ConjunctionEvent lifecycle
                                                                      ↓
                                              Dashboard ← API Routes ← Core Engine
                                                                      ↓
                                              Verity Attestation + Ephemeris Factor + NCA Report
```

## Schema (4 models, 3 enums)

### ConjunctionEvent

- Lifecycle entity, one per conjunction (org-scoped by conjunctionId)
- Tracks risk tier, collision metrics, decision record, maneuver tracking, compliance outputs
- Unique constraint: `[organizationId, conjunctionId]`

### CDMRecord

- Immutable CDM archive, many per event
- Stores raw CDM JSON for full audit trail
- Unique on `cdmId` (Space-Track's identifier)

### CAEscalationLog

- Append-only tier/status change log
- Tracks: previousTier → newTier, previousStatus → newStatus, trigger reason

### CAConfig

- Per-org configurable thresholds (EMERGENCY=1e-3, HIGH=1e-4, ELEVATED=1e-5, MONITOR=1e-7)
- Notification preferences, auto-close timer, NCA settings, default assignee
- Unique on `organizationId`

### Enums

- **ConjunctionStatus:** NEW → MONITORING → ASSESSMENT_REQUIRED → DECISION_MADE → MANEUVER_PLANNED → MANEUVER_EXECUTED → MANEUVER_VERIFIED → CLOSED
- **RiskTier:** EMERGENCY | HIGH | ELEVATED | MONITOR | INFORMATIONAL
- **CADecision:** MANEUVER | ACCEPT_RISK | MONITOR | COORDINATE

## Core Engine (`src/lib/shield/`)

All modules use `*.server.ts` with `import "server-only"`.

| Module                | File                              | Purpose                                                 |
| --------------------- | --------------------------------- | ------------------------------------------------------- |
| Types                 | `types.ts`                        | All Shield TypeScript types                             |
| Space-Track Client    | `space-track-client.server.ts`    | Session auth, CDM fetch, rate limiting, backoff         |
| Risk Classifier       | `risk-classifier.server.ts`       | Pc + miss distance → RiskTier                           |
| Pc Trend              | `pc-trend.server.ts`              | Linear regression on log10(Pc) → trend + TCA projection |
| Conjunction Tracker   | `conjunction-tracker.server.ts`   | Event lifecycle state machine + escalation              |
| Decision Engine       | `decision-engine.server.ts`       | Compute decision factors (read-only)                    |
| Compliance Reporter   | `compliance-reporter.server.ts`   | PDF report builders                                     |
| Verity Integration    | `verity-integration.server.ts`    | Attestations for closed events                          |
| Ephemeris Integration | `ephemeris-integration.server.ts` | CA compliance factor + fuel propagation                 |

### Risk Classification Thresholds (defaults)

| Tier          | Pc Threshold | Miss Distance |
| ------------- | ------------ | ------------- |
| EMERGENCY     | >= 1e-3      | < 100m        |
| HIGH          | >= 1e-4      | < 500m        |
| ELEVATED      | >= 1e-5      | < 1000m       |
| MONITOR       | >= 1e-7      | < 5000m       |
| INFORMATIONAL | < 1e-7       | >= 5000m      |

### Conjunction Lifecycle State Machine

```
NEW → MONITORING (tier <= MONITOR)
NEW → ASSESSMENT_REQUIRED (tier >= ELEVATED)
MONITORING → ASSESSMENT_REQUIRED (tier escalates to ELEVATED+)
MONITORING → CLOSED (TCA passed + autoCloseAfterTcaHours)
ASSESSMENT_REQUIRED → DECISION_MADE (operator decides)
DECISION_MADE → MANEUVER_PLANNED (decision = MANEUVER)
DECISION_MADE → CLOSED (decision = ACCEPT_RISK, TCA passes)
MANEUVER_PLANNED → MANEUVER_EXECUTED (execution confirmed)
MANEUVER_EXECUTED → MANEUVER_VERIFIED (post-maneuver verification)
MANEUVER_VERIFIED → CLOSED
Any → CLOSED (manual close)
```

Key rules:

- De-escalation logs tier decrease but does NOT downgrade status below ASSESSMENT_REQUIRED
- TCA < 24h + tier >= ELEVATED + status < ASSESSMENT_REQUIRED → auto-escalate
- Auto-close: TCA passed + configurable hours elapsed + no EMERGENCY

### Pc Trend Analysis

Linear regression on log10(Pc) vs time:

- |slope| < 0.1/day → STABLE
- slope > 0.1 AND R² > 0.5 → INCREASING
- slope < -0.1 AND R² > 0.5 → DECREASING
- R² < 0.3 → VOLATILE

## API Routes (12 endpoints)

All under `/api/shield/`, following existing patterns: session auth → org membership → RBAC → Zod validation → service call → audit log.

### Events

- `GET /api/shield/events` — List (paginated, filterable by status/tier/noradId/date)
- `GET /api/shield/events/[eventId]` — Detail with CDMs and escalation log
- `GET /api/shield/events/[eventId]/cdms` — CDM history
- `POST /api/shield/events/[eventId]/decide` — Record decision (MANAGER+)
- `POST /api/shield/events/[eventId]/maneuver-executed` — Confirm execution (MANAGER+)
- `POST /api/shield/events/[eventId]/verify` — Post-maneuver verification (MANAGER+)
- `POST /api/shield/events/[eventId]/close` — Manual close (MANAGER+)
- `POST /api/shield/events/[eventId]/report` — Generate CA report PDF
- `POST /api/shield/events/[eventId]/nca-notify` — NCA notification (MANAGER+)

### Configuration

- `GET /api/shield/config` — Get org CA config
- `PUT /api/shield/config` — Update config (ADMIN+)

### Dashboard

- `GET /api/shield/analytics` — Activity analytics
- `GET /api/shield/stats` — Quick header stats

## Cron Jobs (3 new)

| Cron        | Schedule       | Endpoint                | maxDuration |
| ----------- | -------------- | ----------------------- | ----------- |
| CDM Polling | `*/30 * * * *` | `/api/cron/cdm-polling` | 60s         |
| CA Digest   | `30 7 * * *`   | `/api/cron/ca-digest`   | 30s         |
| CA Cleanup  | `0 2 * * 0`    | `/api/cron/ca-cleanup`  | 30s         |

## Dashboard

### Sidebar

Under PREDICTIVE MODELING, below Ephemeris: Shield icon + "Shield" label.

### Main Page (`/dashboard/shield`)

Three tabs: **Events** | **Analytics** | **Settings**

- Events tab: filter row + event list cards (color-coded by tier, sorted EMERGENCY first then by TCA)
- Analytics tab: 7 Recharts charts (CDMs/week, events by status, decisions, response time, fuel consumed, top threats, Pc distribution)
- Settings tab: CAConfig form + Space-Track connection status

### Event Detail (`/dashboard/shield/[eventId]`)

Four tabs: **Overview** | **Decision** | **Documentation** | **Coordination**

- Overview: Pc evolution chart (log scale), miss distance chart, CDM table, threat object card, event timeline, Pc trend card
- Decision: Decision factors panel + decision form (or read-only recorded decision)
- Documentation: PDF generation, NCA notification, Verity attestation, raw CDM archive
- Coordination: Communication log for recording coordination exchanges

## Ephemeris Integration

1. New compliance factor "Collision Avoidance Compliance" in orbital module
2. Data Sources tab row showing Shield connection status
3. Scenario Builder block: "Collision Avoidance Maneuver" (deltaV + frequency → fuel impact)

## Notification Types

- `SHIELD_EMERGENCY` — Immediate, all channels
- `SHIELD_HIGH` — Email + in-app
- `SHIELD_ASSESSMENT_REQUIRED` — In-app
- `SHIELD_DECISION_OVERDUE` — Email + in-app
- `SHIELD_EVENT_CLOSED` — In-app

## Implementation Phases

### Phase 1: Foundation

Schema + Space-Track client + core engine (risk-classifier, pc-trend, conjunction-tracker) + CDM polling cron + basic API routes (events list, detail, CDMs, stats, config)

### Phase 2: Dashboard + Decisions

Full Shield dashboard (Events/Analytics/Settings tabs), event detail page (all 4 tabs), decision engine, compliance-reporter PDF, decision/maneuver/verify/close API routes

### Phase 3: Integration + Polish

Ephemeris integration (compliance factor, scenario builder block), Verity attestation, NCA notification, daily digest cron, cleanup cron, email templates, unit tests

## Verification Checklist

1. `npx prisma generate` succeeds
2. `npx prisma db push` succeeds
3. `npm run typecheck` passes
4. `npm run test:unit` passes (existing + new Shield tests)
5. `npm run build` succeeds
6. Existing Ephemeris scores unchanged
7. Shield sidebar entry appears in dashboard
8. Shield dashboard loads with empty state
9. CDM polling cron executes without error
10. Event detail page renders all 4 tabs
11. Decision form submits correctly
12. CA Report PDF generates
13. Verity attestation creates for closed events
14. Notifications fire at correct tier thresholds
15. Ephemeris Data Sources tab shows Shield status
16. Scenario Builder shows CA Maneuver block
17. Analytics charts render
18. Settings tab saves CAConfig
