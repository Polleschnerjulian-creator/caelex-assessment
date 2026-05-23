# Caelex Trade — Production Migration Runbook

> **TL;DR:** Schema migrations on this project run **automatically on every Vercel deploy**. There is nothing manual to do. This document explains how the auto-migration works, what to do if it stops working, and what the historical "8 pending migrations" warning meant.

## How migrations actually work here

**`vercel.json` sets `buildCommand: "npm run build:deploy"`**, which expands to:

```
prisma generate && (prisma db push --skip-generate --accept-data-loss || echo 'Warning: db push failed, continuing build') && next build
```

So every `git push origin main` triggers a Vercel build that:

1. Runs `prisma generate` to emit the typed client
2. Runs `prisma db push --accept-data-loss` to sync the live Neon DB to `prisma/schema.prisma`
3. Runs `next build` to produce the deployable bundle

The `--accept-data-loss` flag is on because **all our schema changes have been purely additive** (CREATE TABLE / ADD COLUMN / ADD ENUM VALUE). Prisma flags any destructive change for review, but additive ones go through silently.

The `|| echo 'Warning: ...'` fallback means **if `prisma db push` fails, the build STILL completes** — leaving prod with stale schema. This is by design (don't break the deploy pipeline on a transient DB issue) but it means you can't assume "deploy succeeded → DB is in sync."

### How to verify after each deploy

After every push to main, the Vercel build log for the new deployment shows one of two outcomes:

```bash
vercel inspect <deployment-url> --logs | grep -iE "database is now in sync|already in sync|db push"
```

Expected (one of):

- `🚀 Your database is now in sync with your Prisma schema. Done in N.NNs` — applied N new changes
- `The database is already in sync with the Prisma schema.` — nothing to apply, already current

Anything else (especially `Warning: db push failed, continuing build`) means migrations didn't apply.

## What were the "8 pending migrations" that this doc previously described?

Between batches 8-12 (2026-05-22 to 2026-05-23), 8 additive schema deltas accumulated:

| #   | Sprint | Schema change                                                             |
| --- | ------ | ------------------------------------------------------------------------- |
| 1   | Z4     | `TradeItemClassificationDraft` + `ClassificationDraftDecision` enum       |
| 2   | Z29    | `TradeSupplement2Report` + `TradeSupplement2ReportItem` + status enum     |
| 3   | Z11    | `TradeSammelgenehmigung` + `TradeSammelgenehmigungDrawDown` + status enum |
| 4   | Z13    | `TradeDeemedExportAuthorization` + 2 enums + `hasForeignNationalAccess`   |
| 5   | Z9     | `OPEN_SANCTIONS` value added to `TradeSanctionsList` enum                 |
| 6   | Z16-S  | `TradeOrgProfile` (1:1 Organization)                                      |
| 7   | Z16-S  | `TradeNotificationPreferences` (1:1 Organization)                         |
| 8   | Z16-S  | `TradeApiKey` (many per Organization)                                     |

These were assumed pending because no one had explicitly run `npx prisma db push` locally. But **the Vercel build pipeline was applying them automatically all along**. Verified via build logs on deployments `caelex-assessment-8fjh2nvj2-...` (batch 11) and `caelex-assessment-a0nv6uq7q-...` (batch 12 post-fix), both showing `🚀 Your database is now in sync` then `The database is already in sync` — meaning the changes landed in production and subsequent builds saw nothing to do.

## When you DO need a manual migration

The auto-pipeline handles ~95% of cases (additive changes). You need the manual path when:

1. **You're changing a destructive schema element** (DROP COLUMN, NULLable → NOT NULL on a populated column, type change). Prisma's `--accept-data-loss` flag is off in our build script — Prisma will refuse, the build's `|| echo 'Warning'` will swallow the error, and the deploy will succeed with stale schema. You need to handle the destructive change with a hand-rolled migration file under `prisma/migrations/`.
2. **You want to preview the diff before deploying.** Run locally:
   ```bash
   vercel env pull .env.production --environment production --yes
   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production | cut -d'=' -f2- | tr -d '"') \
     npx prisma db push --skip-generate --accept-data-loss=false --dry-run
   rm .env.production
   ```
3. **The Vercel build step failed (Error status)** and you suspect the migration was the cause. Check `vercel inspect <url> --logs` for the prisma section.

## Manual fallback (DESTRUCTIVE migrations only)

If you need to run a migration manually (e.g. destructive schema change), the procedure is:

```bash
vercel env pull .env.production --environment production --yes
DATABASE_URL=$(grep '^DATABASE_URL=' .env.production | cut -d'=' -f2- | tr -d '"') \
  npx prisma db push --skip-generate --accept-data-loss=false
rm .env.production    # secrets — delete immediately
```

Notes:

- `--accept-data-loss=false` aborts on any destructive change. To allow it: append `--accept-data-loss` (alone — true is implied).
- The pulled `.env.production` contains `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, all Stripe/Resend keys. Delete it immediately after use.
- If you don't have `vercel env pull` permission, the alternative is to copy `DATABASE_URL` from the Vercel dashboard → Settings → Environment Variables → Production.

## Why "prisma migrate" isn't used

Standard Prisma practice is `prisma migrate dev` (creates migration files) and `prisma migrate deploy` (applies them in order). This project deliberately uses `prisma db push` instead because:

- The team has chosen schema.prisma as the single source of truth
- `db push` is faster and simpler for additive changes (which we've done exclusively so far)
- The trade-off: no migration history (can't undo by reverting a specific migration), but we can roll back via schema.prisma + db push

If we ever need to go back to migration files, the procedure is:

1. `npx prisma migrate diff --from-schema-datasource <prod-url> --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_baseline/migration.sql`
2. Set `npm run build` (not `build:deploy`) in vercel.json's `buildCommand`
3. Add `prisma migrate deploy` to a postbuild step or cron

But this would be a deliberate change of strategy, not a routine action.

## SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
