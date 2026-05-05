# Verity Tier 4 — Schema Migration Plan

**Created:** 2026-05-05 (read-only investigation; no DB changes made)
**Status:** Awaiting user approval per migration. Each section
includes a pre-flight prod-query the user should run first.

---

## Why this doc exists

Tier 4 of the Verity audit (`docs/VERITY-AUDIT-FIX-PLAN.md`) lists
six items that touch the production database:

| ID   | Change                                                               | Risk   |
| ---- | -------------------------------------------------------------------- | ------ |
| T4-1 | `VerityAttestation.organizationId` → NOT NULL                        | MEDIUM |
| T4-2 | `VerityCertificate` add `organizationId` + FK                        | MEDIUM |
| T4-3 | `VerityAuditChainEntry` FK to Organization with `onDelete: Restrict` | MEDIUM |
| T4-4 | `@@index([attestationId])` on `VerityCertificateClaim`               | LOW    |
| T4-5 | `@db.VarChar(N)` caps on crypto fields                               | LOW    |
| T4-7 | BLS-aggregated cert signatures                                       | HIGH   |

The 2026-05-01 deploy policy (`CLAUDE.md` § Deployment Policy)
forbids autonomous DB-state inspection, so the planning was done from
the schema + caller code only. Each section below tells you the
single prod query needed to validate the migration is safe, and the
exact SQL to run.

---

## Recommended sequencing

```
     ┌──────────────────────────┐
     │ T4-4 add index           │  smallest, no data motion
     └──────────────────────────┘
                ↓
     ┌──────────────────────────┐
     │ T4-5 VarChar caps        │  ALTER TYPE; needs prod LENGTH() audit
     └──────────────────────────┘
                ↓
     ┌──────────────────────────┐
     │ T4-1 attestation org NOT │  backfill + ALTER NULL; touches every row
     │      NULL                │
     └──────────────────────────┘
                ↓
     ┌──────────────────────────┐
     │ T4-2 cert org FK         │  rename `operatorId` (already org-id post-C3),
     │                          │  add FK
     └──────────────────────────┘
                ↓
     ┌──────────────────────────┐
     │ T4-3 audit-chain FK      │  add FK + onDelete: Restrict; orphan audit
     │      Restrict            │  rows would block — needs cleanup decision
     └──────────────────────────┘
                ↓
     ┌──────────────────────────┐
     │ T4-7 BLS cert signatures │  feature, not refactor — separate sprint
     └──────────────────────────┘
```

T4-4 → T4-3 are bundle-able into a single Prisma migration
(`20260505_verity_tier4_schema`) if you want one deploy instead of
five. T4-7 should be its own sprint because it changes the cert wire
format and needs verifier-side support.

---

## T4-4 — `@@index([attestationId])` on `VerityCertificateClaim`

### Pre-flight check

None. The composite PK `[certificateId, attestationId]` already
exists; we're just adding a covering index on the second column for
attestation-side lookups (revoke flows iterate
`VerityCertificateClaim WHERE attestationId = ?`).

### Schema diff

```diff
 model VerityCertificateClaim {
   certificateId String
   attestationId String

   certificate VerityCertificate @relation(fields: [certificateId], references: [id])
   attestation VerityAttestation @relation(fields: [attestationId], references: [id])

   @@id([certificateId, attestationId])
+  @@index([attestationId])
 }
```

### Generated SQL

```sql
CREATE INDEX "VerityCertificateClaim_attestationId_idx"
  ON "VerityCertificateClaim"("attestationId");
```

### Rollout

1. Run `npx prisma migrate dev --name verity_cert_claim_attestation_idx`
   in dev (creates the migration file).
2. Inspect `prisma/migrations/<ts>_verity_cert_claim_attestation_idx/migration.sql`
   — must be exactly the CREATE INDEX above.
3. Commit + deploy. `npm run build:deploy` runs
   `prisma migrate deploy` against prod.

### Rollback

```sql
DROP INDEX "VerityCertificateClaim_attestationId_idx";
```

Online — zero downtime.

---

## T4-5 — `@db.VarChar(N)` caps on crypto fields

### Pre-flight check

Before applying these caps, confirm no existing row exceeds the cap.
Run this read-only query:

```sql
SELECT
  MAX(LENGTH("signature"))         AS max_signature,
  MAX(LENGTH("valueCommitment"))   AS max_commitment,
  MAX(LENGTH("issuerPublicKey"))   AS max_issuer_pk,
  MAX(LENGTH("encryptedSecret"))   AS max_secret
FROM "VerityAttestation";

SELECT
  MAX(LENGTH("entryHash"))    AS max_entry_hash,
  MAX(LENGTH("previousHash")) AS max_prev_hash
FROM "VerityAuditChainEntry";

SELECT
  MAX(LENGTH("keyId"))            AS max_key_id,
  MAX(LENGTH("publicKeyHex"))     AS max_pubkey_hex,
  MAX(LENGTH("encryptedPrivKey")) AS max_priv_key
FROM "VerityIssuerKey";

SELECT
  MAX(LENGTH("leafHash")) AS max_leaf_hash
FROM "VerityLogLeaf";

SELECT
  MAX(LENGTH("rootHash"))  AS max_root_hash,
  MAX(LENGTH("signature")) AS max_sth_sig
FROM "VerityLogSTH";
```

Expected (derived from code):

| Field                                | Format                  | Expected max | Proposed cap |
| ------------------------------------ | ----------------------- | ------------ | ------------ |
| `VerityAttestation.signature`        | Ed25519 hex             | 128          | VarChar(256) |
| `VerityAttestation.valueCommitment`  | SHA-256 / Pedersen hex  | 64           | VarChar(128) |
| `VerityAttestation.issuerPublicKey`  | Ed25519 SPKI hex        | 88           | VarChar(128) |
| `VerityAttestation.encryptedSecret`  | iv:tag:cipher hex       | ~200         | VarChar(512) |
| `VerityAuditChainEntry.entryHash`    | SHA-256 hex / "GENESIS" | 64           | VarChar(64)  |
| `VerityAuditChainEntry.previousHash` | SHA-256 hex / "GENESIS" | 64           | VarChar(64)  |
| `VerityIssuerKey.keyId`              | `verity-YYYY-MM-DD`     | 19           | VarChar(64)  |
| `VerityIssuerKey.publicKeyHex`       | Ed25519 SPKI hex        | 88           | VarChar(128) |
| `VerityIssuerKey.encryptedPrivKey`   | iv:tag:cipher hex       | ~250         | VarChar(512) |
| `VerityLogLeaf.leafHash`             | SHA-256 hex             | 64           | VarChar(64)  |
| `VerityLogSTH.rootHash`              | SHA-256 hex             | 64           | VarChar(64)  |
| `VerityLogSTH.signature`             | Ed25519 hex             | 128          | VarChar(256) |

If `MAX(LENGTH(...))` exceeds the proposed cap for any column, raise
the cap to ≥ 2× the observed max and re-evaluate.

### Schema diff

```diff
 model VerityAttestation {
-  signature       String
+  signature       String  @db.VarChar(256)
-  valueCommitment String
+  valueCommitment String  @db.VarChar(128)
-  issuerPublicKey String
+  issuerPublicKey String  @db.VarChar(128)
-  encryptedSecret String?
+  encryptedSecret String? @db.VarChar(512)
   ...
 }

 model VerityAuditChainEntry {
-  entryHash    String
+  entryHash    String @db.VarChar(64)
-  previousHash String
+  previousHash String @db.VarChar(64)
 }

 model VerityIssuerKey {
-  keyId            String    @unique
+  keyId            String    @unique @db.VarChar(64)
-  publicKeyHex     String    @unique
+  publicKeyHex     String    @unique @db.VarChar(128)
-  encryptedPrivKey String
+  encryptedPrivKey String    @db.VarChar(512)
 }

 model VerityLogLeaf {
-  leafHash      String
+  leafHash      String @db.VarChar(64)
 }

 model VerityLogSTH {
-  rootHash    String
+  rootHash    String @db.VarChar(64)
-  signature   String
+  signature   String @db.VarChar(256)
 }
```

### Generated SQL

```sql
ALTER TABLE "VerityAttestation"
  ALTER COLUMN "signature" TYPE varchar(256),
  ALTER COLUMN "valueCommitment" TYPE varchar(128),
  ALTER COLUMN "issuerPublicKey" TYPE varchar(128),
  ALTER COLUMN "encryptedSecret" TYPE varchar(512);

ALTER TABLE "VerityAuditChainEntry"
  ALTER COLUMN "entryHash" TYPE varchar(64),
  ALTER COLUMN "previousHash" TYPE varchar(64);

ALTER TABLE "VerityIssuerKey"
  ALTER COLUMN "keyId" TYPE varchar(64),
  ALTER COLUMN "publicKeyHex" TYPE varchar(128),
  ALTER COLUMN "encryptedPrivKey" TYPE varchar(512);

ALTER TABLE "VerityLogLeaf"
  ALTER COLUMN "leafHash" TYPE varchar(64);

ALTER TABLE "VerityLogSTH"
  ALTER COLUMN "rootHash" TYPE varchar(64),
  ALTER COLUMN "signature" TYPE varchar(256);
```

### Rollout

1. Run the pre-flight `MAX(LENGTH(...))` queries on the prod replica.
2. If any value exceeds the proposed cap, **stop** and either:
   - raise the cap, or
   - investigate why a row exceeds the expected protocol size (could
     indicate corruption or unauthorized data injection).
3. Generate the migration: `npx prisma migrate dev --name verity_varchar_caps`.
4. Postgres `ALTER COLUMN TYPE varchar(N)` is online when the new
   length is ≥ the column's current max value (it just adds a length
   check) — confirmed safe given the pre-flight check.
5. Deploy via push to main.

### Rollback

```sql
ALTER TABLE "VerityAttestation"
  ALTER COLUMN "signature" TYPE text,
  ...;
```

Online — zero downtime.

---

## T4-1 — `VerityAttestation.organizationId` NOT NULL

### Pre-flight check

```sql
-- 1. How many rows are currently NULL?
SELECT COUNT(*)
FROM "VerityAttestation"
WHERE "organizationId" IS NULL;

-- 2. How many of those can be backfilled via operatorId → User → Org?
SELECT COUNT(*)
FROM "VerityAttestation" a
JOIN "OrganizationMember" m ON m."userId" = a."operatorId"
WHERE a."organizationId" IS NULL;

-- 3. The orphans — rows whose operatorId has no current OrgMember
--    (e.g. user deleted, attestation pre-multitenancy). These must
--    be either deleted, archived, or assigned to a "legacy" org
--    before the NOT NULL constraint can land.
SELECT a."attestationId", a."operatorId", a."issuedAt"
FROM "VerityAttestation" a
LEFT JOIN "OrganizationMember" m ON m."userId" = a."operatorId"
WHERE a."organizationId" IS NULL
  AND m."organizationId" IS NULL
LIMIT 50;
```

### Migration sequence

The migration must be split into THREE deploys to avoid a window
where new writes can land NULL while the backfill is running:

**Deploy A — backfill code-side (no schema change yet)**

Update `evaluateAndAttest` and `attestation/manual` to ALWAYS pass
`organizationId`. Both already do today (post-T5-3) — nothing to
change in code; this is just the safety check.

**Deploy B — backfill historical rows + add CHECK constraint**

Migration `20260506_verity_attestation_org_backfill`:

```sql
-- Backfill from operatorId → OrganizationMember
UPDATE "VerityAttestation" a
SET "organizationId" = m."organizationId"
FROM "OrganizationMember" m
WHERE m."userId" = a."operatorId"
  AND a."organizationId" IS NULL;

-- Soft-block: NEW rows must have organizationId set
ALTER TABLE "VerityAttestation"
  ADD CONSTRAINT verity_attestation_org_required
  CHECK ("organizationId" IS NOT NULL) NOT VALID;
```

`NOT VALID` means existing rows are NOT checked but new INSERTs are.
Anything still NULL after the backfill triggers manual investigation.

**Deploy C — finalise**

Migration `20260507_verity_attestation_org_not_null`:

```sql
-- Validate any remaining rows pass the constraint
ALTER TABLE "VerityAttestation"
  VALIDATE CONSTRAINT verity_attestation_org_required;

-- Drop the constraint, replace with NOT NULL
ALTER TABLE "VerityAttestation"
  ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "VerityAttestation"
  DROP CONSTRAINT verity_attestation_org_required;
```

### Schema diff (final)

```diff
 model VerityAttestation {
-  organizationId String?
-  organization   Organization? @relation(fields: [organizationId], references: [id])
+  organizationId String
+  organization   Organization  @relation(fields: [organizationId], references: [id])
   ...
 }
```

### Code follow-up after Deploy C

In `attestation/list/route.ts` (lines 56-72) the current code
resolves all org-member user-ids and uses `operatorId IN (...)`.
Replace with a direct `where: { organizationId: membership.organizationId }`
filter. Drops a query and an in-memory list.

### Rollback

If Deploy C reveals broken assumptions (a row went NULL between
B and C):

```sql
ALTER TABLE "VerityAttestation"
  ALTER COLUMN "organizationId" DROP NOT NULL;
```

Online. Then investigate why the backfill missed the row.

---

## T4-2 — `VerityCertificate` `organizationId` + FK

### State today

- The `operatorId` field on `VerityCertificate` was repurposed by
  the C3 fix (commit `76fdf9fb`) to carry the organisation id, not
  the user id. All write/read sites filter by
  `membership.organizationId` against `operatorId`. See:
  - `certificate/issue/route.ts:154`
  - `certificate/list/route.ts:33`
  - `certificate/[id]/revoke/route.ts:61`
  - `certificate/[id]/visibility/route.ts:70`
  - `certificate/[id]/route.ts:36-47`
- Pre-C3 rows may still hold the user-id (orphan).

### Pre-flight check

```sql
-- How many cert rows have an operatorId that doesn't match any
-- existing Organization.id? Those are pre-C3 orphans.
SELECT COUNT(*)
FROM "VerityCertificate" c
LEFT JOIN "Organization" o ON o.id = c."operatorId"
WHERE o.id IS NULL;

-- Cross-reference: do those operatorIds match a User instead?
-- (confirms they are pre-C3 user-id rows we need to remap)
SELECT COUNT(*)
FROM "VerityCertificate" c
LEFT JOIN "Organization" o ON o.id = c."operatorId"
JOIN "User" u ON u.id = c."operatorId"
WHERE o.id IS NULL;
```

### Migration sequence

**Deploy A — add `organizationId` column, backfill, dual-write**

```sql
ALTER TABLE "VerityCertificate"
  ADD COLUMN "organizationId" TEXT;

-- Backfill: operatorId already IS the org-id for post-C3 rows
UPDATE "VerityCertificate"
SET "organizationId" = "operatorId"
WHERE "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" o WHERE o.id = "operatorId");

-- Pre-C3 rows: operatorId is a user-id. Remap via OrganizationMember.
UPDATE "VerityCertificate" c
SET "organizationId" = m."organizationId"
FROM "OrganizationMember" m
WHERE m."userId" = c."operatorId"
  AND c."organizationId" IS NULL;

CREATE INDEX "VerityCertificate_organizationId_idx"
  ON "VerityCertificate"("organizationId");
```

In code (this same deploy): write to BOTH `operatorId` AND
`organizationId` so the new column stays current while the cutover
happens. Keep all read sites unchanged.

**Deploy B — read from `organizationId`, retire `operatorId`**

Code: switch all reads from `operatorId: membership.organizationId`
to `organizationId: membership.organizationId`. Continue dual-writing
during this deploy as a safety net.

**Deploy C — drop `operatorId`, add FK**

```sql
ALTER TABLE "VerityCertificate"
  DROP COLUMN "operatorId";

ALTER TABLE "VerityCertificate"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ADD CONSTRAINT "VerityCertificate_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Tighten the existing operatorId index name
DROP INDEX IF EXISTS "VerityCertificate_operatorId_idx";
```

### Schema diff (final)

```diff
 model VerityCertificate {
-  operatorId     String
+  organizationId String
+  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
   ...
-  @@index([operatorId])
+  @@index([organizationId])
 }
```

### Cascade rationale

Cascading from Organization → VerityCertificate is acceptable
because cert deletion follows the org's lifecycle. The audit chain
(T4-3 below) does NOT cascade — it stays Restrict.

### Rollback

The dual-write window in Deploy A means you can roll back to reading
`operatorId` at any point before Deploy C. After Deploy C, the
column is gone — rollback requires a forward-fix migration that
re-creates `operatorId` and copies values.

---

## T4-3 — `VerityAuditChainEntry` FK with `onDelete: Restrict`

### Pre-flight check

```sql
-- 1. How many audit-chain entries reference an organizationId
--    that no longer exists?
SELECT COUNT(*)
FROM "VerityAuditChainEntry" e
LEFT JOIN "Organization" o ON o.id = e."organizationId"
WHERE o.id IS NULL;

-- 2. List a sample of orphans for triage
SELECT e."organizationId", e."sequenceNumber", e."eventType", e."createdAt"
FROM "VerityAuditChainEntry" e
LEFT JOIN "Organization" o ON o.id = e."organizationId"
WHERE o.id IS NULL
ORDER BY e."createdAt" DESC
LIMIT 50;
```

If any orphans exist, you have a decision to make BEFORE the
migration: the `onDelete: Restrict` FK cannot be added until every
orphan is either:

- **(a) Deleted** — but this is destructive; the audit chain is
  supposed to be immutable. Only acceptable if you can prove the
  rows are corrupt/test data.
- **(b) Reassigned** to a "legacy" Organization row created for
  exactly this purpose (e.g. id `org_legacy_audit_2026_05_05`).
  Preserves the audit trail, makes the FK addable.
- **(c) Migrated to an `OrphanedAuditChainEntry` table** — preserves
  history without polluting the live audit-chain.

Default recommendation: **(b)**. Cheapest, preserves audit immutability,
and the orphan rows remain queryable for compliance review.

### Migration sequence

**Deploy A — orphan triage (only if pre-flight finds orphans)**

```sql
-- Create the legacy carrier org if needed
INSERT INTO "Organization" (id, name, "createdAt")
VALUES (
  'org_legacy_audit_2026_05_05',
  '[Legacy] Pre-FK audit chain orphans',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Reassign orphans
UPDATE "VerityAuditChainEntry" e
SET "organizationId" = 'org_legacy_audit_2026_05_05'
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization" o WHERE o.id = e."organizationId"
);
```

**Deploy B — add FK with Restrict**

```sql
ALTER TABLE "VerityAuditChainEntry"
  ADD CONSTRAINT "VerityAuditChainEntry_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
```

### Schema diff

```diff
 model VerityAuditChainEntry {
   id             String @id @default(cuid())
-  organizationId String
+  organizationId String
+  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
   ...
 }
```

### Operational implication

After this lands, **deleting an Organization with audit-chain entries
will fail** with a Postgres FK violation. This is intentional: the
chain is immutable. If a tenant needs to be "deleted" for GDPR or
contract reasons, the operational pattern becomes:

1. Soft-delete the Organization (set a `deletedAt` flag — already
   exists on `Organization`).
2. Audit chain remains intact, queryable for the regulatory window.
3. After the regulatory window passes, archive the audit-chain
   entries to cold storage and DELETE — at which point the tenant
   row can also be hard-deleted.

This pattern needs to be documented in the platform admin runbook
(out of scope for the audit; flag as follow-up).

### Rollback

```sql
ALTER TABLE "VerityAuditChainEntry"
  DROP CONSTRAINT "VerityAuditChainEntry_organizationId_fkey";
```

Online. The reassigned orphan rows stay reassigned (no rollback for
the data move).

---

## T4-7 — BLS-aggregated cert signatures (DEFERRED — own sprint)

### Why this is a feature, not a refactor

The current cert wire format embeds N × 64-byte Ed25519 signatures
(one per attestation). Switching to BLS aggregation:

- Reduces wire size from 64N to ~96 bytes total (huge win for
  100-claim certs going through P2P or NCA bundle export).
- Reduces verifier CPU from O(N) ed25519 verifies to one O(N) pairing.
- BUT requires:
  - Provisioning BLS keypairs alongside Ed25519 in `VerityIssuerKey`
    (new fields: `blsPublicKeyHex`, `blsEncryptedPrivKey`).
  - Dual-signing during the rollout (Ed25519 for backwards-compat,
    BLS for the aggregate). Cert format gets a `signature_scheme`
    field selecting which to verify.
  - Verifier-side support in:
    - `src/app/api/v1/verity/certificate/verify/route.ts`
    - Bundle verifier (offline reverse-of-`buildBundle`)
    - Any third-party VC-aware client that consumes the bundle.
  - Migration plan for already-issued certs: they stay Ed25519
    forever (per the Phase-1 forward-only rule); only NEW certs
    get the BLS aggregate.

The crypto library is ready (`src/lib/verity/core/bls-aggregator.ts`,
fully implemented and tested). The integration is the work, and it
overlaps with the Phase-3 BLS-pubkey-in-VC roadmap. **Recommend
parking T4-7 for the Verity Phase 3 sprint** rather than bundling
into the schema cleanup batch.

### Pre-flight (when the time comes)

```sql
-- How big are existing cert signatures? Establishes the wire-size
-- improvement BLS would deliver per-cert.
SELECT
  AVG(LENGTH("signature")) AS avg_sig_chars,
  MAX("claimsCount") AS max_claims,
  COUNT(*) AS total_certs
FROM "VerityCertificate";
```

---

## Pre-deploy checklist (every Tier-4 schema migration)

1. Run the pre-flight `SELECT` from the relevant section above on a
   prod read-replica. Investigate any non-zero counts that indicate
   orphans or oversized values.
2. Run `npx prisma migrate dev --name <descriptive>` in dev. Inspect
   the generated `migration.sql` — must match the SQL block above.
3. Run `npm run test:run` and `npx tsc --noEmit -p .` — both clean.
4. Stage migration files + schema.prisma + any code changes.
5. Bundle into the next batch-deploy push to `main`.
6. After deploy, confirm via:
   - `npx prisma migrate status` (in a repo with prod DATABASE_URL set)
   - the migration appears in `_prisma_migrations` table.

---

## Appendix — Why this couldn't be done autonomously

The CLAUDE.md deployment policy (line ~30) standing-authorises
read-only Vercel commands and forward-only deploys. It does NOT
authorise:

- Reading `.env.local` to extract `DATABASE_URL` (credential probe).
- Running queries against the production database (data exposure).
- Running `prisma db push` or `prisma migrate deploy` against prod
  (destructive in the failure case).

Each migration in this plan needs the user to:

1. Run the pre-flight query from a trusted environment.
2. Approve the migration SQL.
3. Trigger the deploy.

This split keeps Claude on the design + verification side of the
fence and the user on the credentials + execution side.
