# Atlas Mandate — Interessenkonflikt-Check (Conflict-of-Interest Check)

**Status:** Design approved (2026-05-30) · **Surface:** Atlas (scope-frozen — branch `fix/atlas-deep-dive`, `ALLOW_CROSS_SURFACE=1`)
**Author:** Claude (Opus 4.8) with Julian Polleschner
**Roadmap-ID:** Mandate-Improvement #1 (foundation for #2 citation-register → #3 change-impact)

---

## 1. Problem & Goal

A law firm must, by professional-conduct rules, check every new matter for
conflicts of interest and **document** that the check happened and how any
conflict was cleared. Atlas already stores structured parties per mandate
(`AtlasMandateParty.type ∈ {client, opponent, authority, co_counsel,
other}`, org-scoped with an existing `@@index([organizationId, type])` that
makes an org-wide party scan cheap) — added in Sprint 12 to close the _"kein
Parties-Model"_ audit gap — but **no cross-mandate conflict scan was ever
built.** Today a lawyer can take on a matter against a party that is an
active client elsewhere in the firm with zero warning.

**Goal:** Detect, surface, and let a lawyer document-clear potential
conflicts across all of an organisation's mandates — deterministically, with
no external cost.

### Non-goals (YAGNI — explicitly out of v1)

- AI/LLM entity resolution ("are these the same corporate group?")
- Cross-organisation matching (tenant isolation is absolute)
- ML / fuzzy-vector name matching, `pg_trgm` (optional later enhancement)
- Hard-blocking matter creation (advisory model — see §3)

---

## 2. Behaviour: Advisory + severity + documented clearance

No hard block. Rationale: professional conduct requires the check to be
**performed and documented**, not that the system refuse the matter; and a
hard block on mere name similarity ("Spire Global Inc" vs "Spire Global
Lux") would be brittle in daily practice. Instead:

1. On a triggering event, compute matches live and surface them.
2. The lawyer reviews and **records a clearance decision** (no-conflict /
   screen erected / declined) with a free-text justification.
3. The clearance is **persisted** → it does not re-fire, and it is the
   defensible file record.
4. The strongest case (`high` — new opponent = active client) renders
   prominently and **requires** a justification before it can be cleared.

---

## 3. Conflict matrix

Scanned across all **non-closed** mandates of the **same organisation**
(tenant-isolated). "New party" = the party just added / the parties of the
mandate just created.

| New party `type` | Matches existing                 | Severity  | Reason                                         |
| ---------------- | -------------------------------- | --------- | ---------------------------------------------- |
| `opponent`       | active `client`                  | 🔴 high   | Acting against a current client                |
| `client`         | active `opponent`                | 🟠 medium | Representing someone you oppose elsewhere      |
| `opponent`       | `client` of a **closed** mandate | 🟠 medium | Former-client / successive-matter issue        |
| any              | same party in another mandate    | 🔵 info   | Informational (often the same client — benign) |

`authority`, `co_counsel`, `other` matches are `info` only (not adverse by
nature).

Same-name-but-different-entity disambiguation ("Spire Global Inc" vs "Spire
Global Lux") is left to the human clearance step in v1 — there is no
structured country/jurisdiction discriminator on `AtlasMandateParty`, and
automated entity resolution is explicitly out of scope (§1 non-goals).

---

## 4. Matching engine (deterministic, €0 external)

Names are free text (`AtlasMandateParty.name`, plus the legacy
`AtlasMandate.clientName`). Matching runs in application code over the
parties of **one organisation** (a small, bounded set) — no index, no
service, no extension.

**Normalisation** (`normalizePartyName(name)`):

1. Unicode NFKC, lowercase, trim, collapse internal whitespace.
2. Strip punctuation (keep alphanumerics + spaces).
3. Strip legal-form tokens from the name string (GmbH, AG, mbH, Ltd, Inc,
   LLC, S.A., S.p.A., B.V., N.V., Co, KG, GmbH & Co KG, plc, SE, …).

**Match decision** between two normalised names A, B:

- **Exact** normalised equality → strong match.
- Else **token-set similarity**: Jaccard over word-token sets ≥ `0.85`
  → match. (Catches word-order / minor extra tokens; deterministic.)

The threshold + suffix list live in one module so they are testable and
tunable. `pg_trgm` is noted as a _future_ server-side accelerator, not in
v1.

---

## 5. Architecture & data flow

### Live compute, persist only the human judgment

Conflict **matches** are always recomputed from current parties (never
stored — avoids orphaned/stale flags when parties change). The **only**
persisted state is the lawyer's **clearance decision**.

```
add/edit party  ─┐
create mandate  ─┼─►  detectConflicts(orgId, mandateId)  ──► matches[]
                 │         (normalise → matrix → severity)      │
                 │                                              ▼
                 │     filter out matches already covered by a persisted
                 │     AtlasConflictClearance (status=cleared|waived)
                 │                                              │
                 ▼                                              ▼
            UI banner / firm-wide "Konflikte" view  ◄───  open matches[]
                 │
            lawyer records clearance (reason) ──► persist AtlasConflictClearance
```

### New module: `src/lib/atlas/conflict-check.server.ts`

- `normalizePartyName(name) → string`
- `namesMatch(a, b) → boolean` (exact-or-Jaccard)
- `detectConflicts({ orgId, mandateId }) → ConflictMatch[]` — pure, reads
  parties of the org's non-closed mandates, applies the matrix, subtracts
  persisted clearances.
- `ConflictMatch = { newPartyId, matchedPartyId, matchedMandateId, normalizedName, severity, status }`

Pure functions (`normalizePartyName`, `namesMatch`, matrix) are split from
the Prisma-touching `detectConflicts` so the logic is unit-testable without
a DB.

---

## 6. Persistence — new model (one migration)

```prisma
model AtlasConflictClearance {
  id              String   @id @default(cuid())
  organizationId  String
  mandateId       String   // mandate where the conflict was flagged (the "new" side)
  matchedMandateId String  // the other mandate in the pair
  normalizedName  String   // the normalised name that matched (pair key)
  severity        String   // "high" | "medium" | "low" | "info"
  status          String   @default("cleared") // "cleared" | "waived" | "declined"
  clearanceReason String?  @db.Text
  clearedByUserId String?
  clearedAt       DateTime @default(now())
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  mandate         AtlasMandate @relation(fields: [mandateId], references: [id], onDelete: Cascade)

  @@unique([mandateId, matchedMandateId, normalizedName])
  @@index([organizationId, status])
}
```

A clearance is keyed by the pair `(mandateId, matchedMandateId,
normalizedName)` so clearing a specific conflict does not suppress an
unrelated one. Requires `prisma db push` against the project's own Neon DB
(**no external cost**; this is the one ops step). Back-relations added on
`Organization` and `AtlasMandate`.

---

## 7. API changes

- `POST /api/atlas/mandate/[id]/parties` and `POST /api/atlas/mandate`
  (and party PATCH): after the write, call `detectConflicts` and include
  `conflicts: ConflictMatch[]` in the response (additive — no breaking
  change).
- `GET  /api/atlas/mandate/[id]/conflicts` — open conflicts for one mandate.
- `POST /api/atlas/mandate/[id]/conflicts/clear` — body `{ matchedMandateId,
normalizedName, severity, status, reason }` → upsert `AtlasConflictClearance`.
  `high` severity requires a non-empty `reason` (400 otherwise).
- `GET  /api/atlas/conflicts` — firm-wide open conflicts (org-scoped).

All routes go through `getAtlasAuth()` (org `LAW_FIRM`/`BOTH` entitlement)
and Zod-validate input; `high`-clear enforces the reason server-side.

---

## 8. UI (reuse existing components)

- **Conflict banner** in `MandateDetailView` above `MandateParties` when
  open conflicts exist — severity-coloured, lists the matched mandate +
  party, with a "Prüfen & freigeben" action.
- **Clearance dialog**: choose status (kein Konflikt / Abschirmung
  eingerichtet / Mandat abgelehnt) + reason (mandatory for `high`).
- **Firm-wide "Konflikte" tab** on the mandate list page
  (`(atlas)/atlas/mandate/page.tsx`) — all open org conflicts.

---

## 9. Testing

- Unit (`conflict-check.server.test.ts`): normalisation (legal-form strip,
  Unicode, punctuation), `namesMatch` (exact + Jaccard boundary at 0.85),
  conflict matrix per pairing (severity per row).
- Integration: `detectConflicts` subtracts persisted clearances; tenant
  isolation (never crosses `organizationId`); `high`-clear without reason
  → 400.
- Regression: party CRUD responses include `conflicts` without breaking
  existing shape.

---

## 10. Rollout

1. Migration (`AtlasConflictClearance` + back-relations) — ops step.
2. `conflict-check.server.ts` + tests (TDD: pure functions first).
3. API routes (detect on write, conflicts GET, clear POST, firm-wide GET).
4. UI (banner, dialog, firm-wide tab).
5. Ship on `fix/atlas-deep-dive`, batch-deploy per policy.

Foundation for #2 (mandate citation register) and #3 (source-change →
mandate impact): the same `normalizePartyName` + org-scoped scan pattern
generalises to citation/source matching.
