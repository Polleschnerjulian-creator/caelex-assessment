# Caelex Trade — Production Migration Runbook

## What this is

Since batch 8 (2026-05-22), Caelex Trade has accumulated **8 additive Prisma schema deltas** on `main` that have NOT yet been applied to the Neon production database. The code builds and tests pass because `prisma generate` emits a typed client from `schema.prisma`, but any RUNTIME query against the new tables will fail with `relation "TradeXxx" does not exist`.

This runbook gets you from "code merged" to "feature live" in under 60 seconds.

---

## What gets migrated

All 8 deltas are **purely additive** — new models, new columns, new enum values. **Zero risk of data loss**: no DROP, no RENAME, no NULL-able-to-NOT-NULL flips.

| #   | Sprint | Schema change                                                             | Page unblocked                        |
| --- | ------ | ------------------------------------------------------------------------- | ------------------------------------- |
| 1   | Z4     | `TradeItemClassificationDraft` + `ClassificationDraftDecision` enum       | `/trade/classify`                     |
| 2   | Z29    | `TradeSupplement2Report` + `TradeSupplement2ReportItem` + status enum     | `/trade/reports/supplement-2`         |
| 3   | Z11    | `TradeSammelgenehmigung` + `TradeSammelgenehmigungDrawDown` + status enum | `/trade/sammelgenehmigungen`          |
| 4   | Z13    | `TradeDeemedExportAuthorization` + 2 enums + `hasForeignNationalAccess`   | `/trade/deemed-exports`               |
| 5   | Z9     | `OPEN_SANCTIONS` value added to `TradeSanctionsList` enum                 | (cross-screening backend)             |
| 6   | Z16-S  | `TradeOrgProfile` (1:1 Organization)                                      | `/trade/settings` → Org Profile tab   |
| 7   | Z16-S  | `TradeNotificationPreferences` (1:1 Organization)                         | `/trade/settings` → Notifications tab |
| 8   | Z16-S  | `TradeApiKey` (many per Organization)                                     | `/trade/settings` → API Keys tab      |

---

## Prerequisites

- You have admin access to the Vercel project (you are the project owner).
- You're on the same machine where `git status` shows `On branch main` and the working tree is clean.
- Your Vercel CLI is authenticated: `vercel whoami` returns your username (no error).

---

## The 3-command procedure

Run these in your terminal from the repo root (`/Users/julianpolleschner/caelex-assessment/`):

### Step 1 — Pull production env vars

```bash
vercel env pull .env.production --environment production --yes
```

**What it does:** Downloads all production env vars (including `DATABASE_URL` pointing at the Neon production DB) into a local `.env.production` file. **Read-only operation against Vercel.** Does NOT modify production state.

**Verify:** The file should exist and contain `DATABASE_URL=postgres://...`. Check:

```bash
grep -c '^DATABASE_URL' .env.production
# Expected: 1
```

### Step 2 — Apply the schema deltas

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.production | cut -d'=' -f2- | tr -d '"') \
  npx prisma db push --skip-generate --accept-data-loss=false
```

**What it does:** Compares `prisma/schema.prisma` against the live DB schema and applies the diff via `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, `ALTER TYPE ADD VALUE`. The `--skip-generate` flag avoids re-running the client codegen (already done at build-time). `--accept-data-loss=false` aborts if Prisma detects any destructive change (defensive).

**Expected output:**

```
🚀  Your database is now in sync with your Prisma schema. Done in ~3-8s
```

**If you see "data loss"** — STOP. Don't override the flag. That would mean schema.prisma is missing something Prisma considers destructive. Run `npx prisma db push --dry-run` and inspect the proposed diff before proceeding. Common cause: a hand-rolled column rename slipped in. Contact me/Claude to investigate.

### Step 3 — Clean up the env file (contains secrets)

```bash
rm .env.production
```

**Why:** The pulled env file contains `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, etc. Leaving it on disk creates a secret-exposure liability. The Vercel runtime never needs it — env vars are injected at function invocation time.

---

## Post-migration verification

After the 3 commands succeed, verify the new pages are functional. Open the production URL in a browser:

```
https://www.caelex.eu/trade
```

Then click through each new page and confirm no Prisma errors:

| Path                          | Expected behavior                                               |
| ----------------------------- | --------------------------------------------------------------- |
| `/trade/classify`             | Empty drafts list (no `relation does not exist` error)          |
| `/trade/reports/supplement-2` | Empty reports list                                              |
| `/trade/sammelgenehmigungen`  | Empty sammelgenehmigungen list                                  |
| `/trade/deemed-exports`       | Empty deemed-export authorizations list                         |
| `/trade/settings`             | All 4 tabs render (Org Profile, Notifications, API Keys, Audit) |

If any page shows a Prisma error: that table failed to apply. Check `npx prisma db push --preview-feature` for diagnostics, or look at the Neon console to see what's actually in the schema.

---

## Rollback (only if you need it)

Additive migrations don't need rollbacks — leaving the new tables in place is harmless if the code rolls back. But if you specifically want to revert:

```bash
# Restore the previous schema by hand (no Prisma migration history was created):
psql "$DATABASE_URL" <<EOF
DROP TABLE IF EXISTS "TradeApiKey";
DROP TABLE IF EXISTS "TradeNotificationPreferences";
DROP TABLE IF EXISTS "TradeOrgProfile";
DROP TABLE IF EXISTS "TradeDeemedExportAuthorization";
DROP TYPE IF EXISTS "TradeDeemedExportAuthorizationStatus";
DROP TYPE IF EXISTS "TradeDeemedExportAuthorizationType";
ALTER TABLE "TradeOperation" DROP COLUMN IF EXISTS "hasForeignNationalAccess";
DROP TABLE IF EXISTS "TradeSammelgenehmigungDrawDown";
DROP TABLE IF EXISTS "TradeSammelgenehmigung";
DROP TYPE IF EXISTS "TradeSammelgenehmigungStatus";
DROP TABLE IF EXISTS "TradeSupplement2ReportItem";
DROP TABLE IF EXISTS "TradeSupplement2Report";
DROP TYPE IF EXISTS "TradeSupplement2Status";
DROP TABLE IF EXISTS "TradeItemClassificationDraft";
DROP TYPE IF EXISTS "ClassificationDraftDecision";
-- OPEN_SANCTIONS enum value can't be dropped trivially in PostgreSQL — leave it.
EOF
```

(In practice you'd never run this. Listed for completeness.)

---

## Why I can't run this for you

The Vercel CLI's `vercel env pull` is denied by Claude Code's auto-mode classifier because it pulls production secrets to local disk. Per `CLAUDE.md` deploy policy, this requires per-action confirmation outside the standing authorization. You can:

1. **Run it yourself** (recommended — under 60 seconds, you stay in control of secrets)
2. **Loosen the permission rule** in `~/.claude/settings.json` by adding `Bash(vercel env pull*)` to the allowed-list, then re-invoke me
3. **Use a one-time migration API route** — I can build a `/api/admin/run-prisma-push` endpoint that runs the migration when hit with the `CRON_SECRET`. Less safe (an extra attack surface), but no permission friction.

---

## SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
