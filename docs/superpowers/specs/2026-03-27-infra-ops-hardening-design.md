# Infrastruktur & Ops Hardening — Design Spec

**Date:** 2026-03-27
**Scope:** Cron job scheduling, DB indexes, health endpoint, migration guard
**Constraint:** No external costs, no new dependencies

---

## Problem Statement

The Caelex platform has 23 cron jobs with 3 timing collisions at 07:00, a `cdm-polling` job running every 30 minutes (48 runs/day) risking DB connection pool exhaustion, missing database indexes on frequently queried columns, no health check endpoint for monitoring, and a dangerous `--accept-data-loss` flag in the production build command.

---

## Section 1: Cron Job Scheduling

**File:** `vercel.json`

### 07:00 Collision Fix (stagger by 10 min)

| Job               | Current      | New                                           |
| ----------------- | ------------ | --------------------------------------------- |
| `regulatory-feed` | `0 7 * * *`  | `0 7 * * *` (unchanged)                       |
| `compute-rrs`     | `0 7 * * *`  | `10 7 * * *`                                  |
| `nca-deadlines`   | `0 7 * * *`  | `20 7 * * *`                                  |
| `compute-rcr`     | `30 7 * * *` | `30 7 * * *` (unchanged, now 20min after rrs) |

### cdm-polling Reduction

| Current                       | New                           | Impact          |
| ----------------------------- | ----------------------------- | --------------- |
| `*/30 * * * *` (every 30 min) | `0 */4 * * *` (every 4 hours) | 48 → 6 runs/day |

### Sentinel Entzerrung

| Job                     | Current        | New                                      |
| ----------------------- | -------------- | ---------------------------------------- |
| `sentinel-cross-verify` | `0 */4 * * *`  | `0 */4 * * *` (unchanged)                |
| `sentinel-auto-attest`  | `15 */4 * * *` | `30 */4 * * *` (30min gap instead of 15) |

No code changes — only `vercel.json` schedule values.

---

## Section 2: Database Indexes

**File:** `prisma/schema.prisma`

5 new composite indexes on hot query paths:

| Model               | Index                                  | Query Pattern                              |
| ------------------- | -------------------------------------- | ------------------------------------------ |
| `AuditLog`          | `@@index([organizationId, timestamp])` | Audit queries filter by org + sort by time |
| `Notification`      | `@@index([userId, createdAt])`         | Notification feed loading                  |
| `AstraMessage`      | `@@index([conversationId, createdAt])` | Conversation history fetching              |
| `Document`          | `@@index([organizationId, status])`    | Document filtering in dashboard            |
| `AstraConversation` | `@@index([organizationId, userId])`    | Batch queries in Astra context builder     |

After adding indexes: `prisma generate` + `prisma db push`.

---

## Section 3: Health Endpoint

**New file:** `src/app/api/health/route.ts`

Simple GET endpoint for monitoring:

- Checks DB connection via `SELECT 1`
- Returns `{ status: "ok" | "degraded", timestamp: ISO string }`
- No authentication required (monitoring must always work)
- No rate limiting
- Returns 200 for "ok", 503 for "degraded"

---

## Section 4: Migration Guard

**Modify:** `package.json` scripts

Current dangerous script:

```
"build:deploy": "prisma generate && prisma db push --skip-generate --accept-data-loss && next build"
```

New safe scripts:

```
"db:push:safe": "prisma db push --skip-generate"
"db:push:force": "prisma db push --skip-generate --accept-data-loss"
"build:deploy": "prisma generate && npm run db:push:safe && next build"
```

- `db:push:safe` — Runs without `--accept-data-loss`. If Prisma detects a destructive change (dropping column, changing type), the build fails with a clear error message.
- `db:push:force` — Manual escape hatch for intentional destructive changes.
- `build:deploy` — Uses `db:push:safe` by default, protecting production data.

---

## Files Changed

| Action | File                                   |
| ------ | -------------------------------------- |
| Modify | `vercel.json` (cron schedules)         |
| Modify | `prisma/schema.prisma` (5 new indexes) |
| Create | `src/app/api/health/route.ts`          |
| Modify | `package.json` (build scripts)         |

## What This Does NOT Cover

- Rate limiting fallback (Zyklus B: Security)
- Encryption key TTL (Zyklus B: Security)
- Astra AI improvements (Zyklus C)
- Bundle splitting / accessibility (Zyklus D)
