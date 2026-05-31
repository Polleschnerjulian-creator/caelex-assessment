# Trade Money Migration Runbook — T-H12 (Float → integer minor-units)

> **Status:** DEFERRED — not yet applied. This is the ONE Sprint-D task that
> cannot go through the normal autonomous deploy, because it is data-destructive
> under this repo's deploy pipeline. Run it deliberately when you choose.
>
> **Why it's deferred:** `vercel.json` sets `buildCommand: "npm run build:deploy"`,
> which runs `prisma db push --accept-data-loss`. On a column **type change**
> (`Float` → `BigInt`), `db push` DROPS and RECREATES the column — it does NOT emit
> an `ALTER COLUMN ... USING (value*100)` cast. So if you simply change the schema
> and let Vercel deploy, **every existing money value in production becomes 0/NULL.**
> The fix must be a manual, data-preserving SQL migration run against Neon BEFORE
> the schema change reaches `db push`.

---

## What changes and why

Money is currently stored as PostgreSQL `double precision` (Prisma `Float`).
Floating-point can't represent decimal currency exactly, so running totals
(draw-down ledgers, de-minimis caps) accumulate drift. The fix: store **integer
minor units** (euro cents / pence) as `BigInt`, mirroring the pattern foreign
models already use (`TradeUkEcjuLicense.drawnDownValueGbp BigInt` = integer pence,
`schema.prisma` ~14770).

### Fields to convert (all `Float` → `BigInt`, value × 100 = cents)

| Model                            | Field                      | schema line (approx) | Semantics   |
| -------------------------------- | -------------------------- | -------------------- | ----------- |
| `TradeLicense`                   | `drawnDownValue`           | 11860                | EUR → cents |
| `TradeLicense`                   | `totalCapValue` (nullable) | 11864                | EUR → cents |
| `TradeOperationLine`             | `unitValue`                | 11814                | EUR → cents |
| `TradeSammelgenehmigung`         | `totalValueCapEur`         | 12642                | EUR → cents |
| `TradeSammelgenehmigung`         | `drawnDownValueEur`        | 12647                | EUR → cents |
| `TradeSammelgenehmigungDrawDown` | `valueEur`                 | (ledger)             | EUR → cents |

**NOT in this migration:** `TradePartyOwnership.percent` (line 11437) is a
_percentage_, not money — it should become `Decimal` or basis-points in a separate
change, and it feeds the 50%-cliff sanctions math, so treat it independently.
`TradeOperationLine.quantity` is a count, leave as-is (or `Int` separately).

---

## The safe two-phase procedure (run by a human against Neon)

The golden rule: **convert the DB data and the schema in the same maintenance
window, data-first, and make sure the next `db push` sees a schema that already
matches the converted columns** (so it's a no-op, not a drop).

### Phase 0 — prep

1. Take a Neon branch/snapshot (Neon console → Branches → create a branch from
   `main` DB as a rollback point). This is your undo.
2. Announce a short write-freeze on Trade money writes (draw-downs, line edits) —
   a few minutes. The affected tables are low-write.

### Phase 1 — convert the DATA in-place (preserves values via `USING`)

Run this SQL against the production Neon database (psql or the Neon SQL editor).
`USING (round(col * 100))::bigint` preserves each value as cents:

```sql
BEGIN;

ALTER TABLE "TradeLicense"
  ALTER COLUMN "drawnDownValue" TYPE BIGINT USING (round("drawnDownValue" * 100))::bigint,
  ALTER COLUMN "totalCapValue"  TYPE BIGINT USING (round("totalCapValue"  * 100))::bigint;

ALTER TABLE "TradeOperationLine"
  ALTER COLUMN "unitValue" TYPE BIGINT USING (round("unitValue" * 100))::bigint;

ALTER TABLE "TradeSammelgenehmigung"
  ALTER COLUMN "totalValueCapEur"  TYPE BIGINT USING (round("totalValueCapEur"  * 100))::bigint,
  ALTER COLUMN "drawnDownValueEur" TYPE BIGINT USING (round("drawnDownValueEur" * 100))::bigint;

ALTER TABLE "TradeSammelgenehmigungDrawDown"
  ALTER COLUMN "valueEur" TYPE BIGINT USING (round("valueEur" * 100))::bigint;

COMMIT;
```

(Confirm the exact table/column names against `prisma generate`'s SQL — Prisma
maps model `TradeLicense` → table `"TradeLicense"`, field `drawnDownValue` →
column `"drawnDownValue"`, by default in this schema. Verify with
`\d "TradeLicense"` first.)

### Phase 2 — land the schema + code change (then deploy)

Only AFTER Phase 1 has converted the columns to BIGINT in prod:

1. Apply the prepared code/schema diff (see "Code changes" below) — schema now says
   `BigInt`, matching the DB. The next Vercel `db push` sees BIGINT-vs-BIGINT = no-op.
2. Deploy normally (merge → main → push).

This ordering is what makes it safe: the DB is BigInt before the schema is, so
`db push` never has a Float→BigInt diff to "fix" destructively.

---

## Code changes that ship WITH Phase 2 (prepared, not yet written)

These are deferred until you green-light the migration, because they're useless
(and a data hazard) until Phase 1 has run. When ready, the work is:

1. **Schema:** change the 6 fields to `BigInt` (drop `@default(0)` Float → `@default(0)` BigInt is fine).
2. **A money boundary module** `src/lib/trade/money.ts`:
   - `toCents(eur: number): bigint` = `BigInt(Math.round(eur * 100))`
   - `fromCents(cents: bigint): number` = `Number(cents) / 100`
   - Keep ALL arithmetic in `bigint` cents; convert to `number` euros ONLY at the
     UI/serialization boundary (and JSON-stringify bigints as strings).
3. **Update every reader/writer** of those 6 fields to go through `money.ts`:
   - `sammelgenehmigung-service.ts` (`recordDrawDown` cap math, `getAvailableCapacity`,
     `findCoveringSammelgenehmigungen` capacity filter, `createSammelgenehmigung`).
     NOTE: the T-H7 atomic `updateMany` already uses `{ increment: value }` — that
     becomes `{ increment: toCents(value) }` and the `lte: bound` bound becomes cents.
   - `TradeLicense` draw-down paths.
   - `TradeOperationLine.unitValue` read/write + any BAFA/report serializer that
     prints the value (they must `fromCents` for display).
   - **API JSON:** `bigint` is not JSON-serializable — every route/response that
     returns these fields must serialize cents→euros (or cents-as-string). Grep the
     route responses for the field names and convert at the boundary.
4. **Tests:** update the money assertions to cents; add `money.ts` unit tests
   (round-trip `toCents(fromCents(x)) === x`, no float drift on accumulation).
5. **Concurrency test (Sprint I2):** the T-H7 atomic draw-down now has an exact
   integer cap — add a real-Postgres concurrency test that two parallel draws can't
   exceed the cap (cents make the assertion exact).

---

## Rollback

If anything looks wrong after Phase 1, restore from the Neon branch snapshot taken
in Phase 0. Because Phase 2 (schema/code) hasn't deployed yet, the running app is
still on the old Float schema — so a DB restore fully reverts.

---

## Why this wasn't done autonomously

The user's standing constraint for this round was "nothing manual." Every other
Sprint-D task (T-H7 atomic draw-down, T-M8 unique, T-M9 onDelete) is additive/logic
and applied automatically by the normal deploy. T-H12 is the sole exception: it
_requires_ a human-run, data-preserving SQL step against Neon before the schema
change, which no agent can perform through the merge→push pipeline. Captured here so
it's a deliberate one-session task whenever you want it, not lost.
