# Legal Network — Phase 1: Identity & Linking + Scoped Data Access

**Status:** Draft, ready for review
**Date:** 2026-04-23
**Author:** Atlas Platform Team
**Phase:** 1 of 4 (Foundation)

---

## 1. Context

Caelex's ecosystem has two distinct products:

- **Caelex** (the compliance-OS): used by space operators (satellite companies,
  launch providers, in-orbit-service firms) to manage their regulatory posture.
- **Atlas** (the space-law intelligence platform): used by law firms who advise
  those operators.

Today these two products are siloed. Lawyers at BHO Legal, Heuking, or Dentons
have no way to work inside their client-operator's compliance data from Atlas.
They either get ad-hoc PDF exports emailed to them, or they log into a shared
Caelex seat — both unscalable and audit-unfriendly.

The **Legal Network** is the bridge that connects both products while respecting
the sensitivity of the underlying data. A law firm should be able to represent a
specific operator-client inside Atlas, pull compliance context on demand, and
produce legal work (memos, comparisons, analyses) directly against that client's
real data — with full operator control, full auditability, and full compliance
with German / EU legal-profession regulations (in particular §43a BRAO and
parallel national professional-conduct rules).

The full Legal Network vision is a quarter-plus of work. This document scopes
**Phase 1** only: the trust foundation. Without it, no data can flow, so all
later phases depend on this shipping first.

## 2. Goals

Phase 1 establishes:

1. A **bilateral, cryptographically-signed handshake** between an Atlas law-firm
   organisation and a Caelex operator organisation.
2. A **granular scope model** so the operator controls exactly what data
   categories the firm can see, and with what permissions.
3. A **tamper-evident audit trail** of every cross-organisation data access.
4. **Revocation controls** that let the operator cut access in seconds.
5. UI surfaces on both sides for managing the lifecycle of these matters.

Phase 1 does **not** pull any operator data into Atlas yet — that's Phase 3's
"Data Bridge". Phase 1 builds the permission and audit substrate that Phase 3
will plug into.

## 3. User personas

### Law-firm user (Atlas)

Partner or senior associate at a space-law practice. Wants to establish a
formal matter with a client-operator so the firm's Atlas AI can later work
against that client's data. Doesn't want to manage tokens, invitations, or
data-category matrices — wants a short invite flow with sensible defaults.

### Operator compliance officer (Caelex)

Head of compliance at a space operator. Owns the regulatory data in Caelex.
Will consent to a law firm having access only if they can see precisely what
the firm will see, limit the scope, and revoke any time. Treats this like an
ISO-27001-grade access decision — it is one.

### Platform admin (out of scope for Phase 1)

Multi-tenant admin who might want to pre-provision firm-client relationships
for enterprise setup. Phase 2+.

## 4. High-level flow

Two initiation directions, one common consent step.

```
ATLAS side (law firm)                      CAELEX side (operator)
─────────────────────                      ──────────────────────

[A1] Partner clicks "New Matter"           [B1] Officer clicks "Add Lawyer"
       ↓                                          ↓
[A2] Enters client email + scope +          [B2] Enters firm + scope +
     matter reference                            duration
       ↓                                          ↓
[A3] Atlas signs an invite token            [B3] Caelex signs an invite token
       ↓                                          ↓
[A4] Email sent to operator with link       [B4] Email sent to firm with link
       ↓                                          ↓
                    ┌─────────────────────┐
                    │   Recipient opens   │
                    │   /network/accept/  │
                    │       :token         │
                    │                     │
                    │   Verified identity,│
                    │   scope preview,    │
                    │   duration, audit-  │
                    │   expectations.     │
                    │                     │
                    │  [Accept] [Amend]   │
                    │        [Reject]     │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │   Both sides sign.  │
                    │   handshakeHash     │
                    │   stored. Matter    │
                    │   → ACTIVE.         │
                    └─────────────────────┘
```

If the recipient chooses "Amend", they narrow the scope and counter-propose.
The original inviter then must either **fully accept** the amendment or the
matter is auto-closed. One amendment cycle maximum — we deliberately avoid
multi-round negotiation, which tends to drift and loses clear consent
snapshots. If the parties cannot agree within one cycle, they start a fresh
matter with a new invitation.

## 5. Data model

Phase 1 adds three new Prisma models and extends one existing.

### New: `LegalMatter`

The long-lived record of a law-firm ↔ operator matter.

```prisma
model LegalMatter {
  id              String   @id @default(cuid())

  // Identities — both sides of the relationship
  lawFirmOrgId    String
  clientOrgId     String

  // Human labels
  name            String
  reference       String?   // firm's internal matter number (e.g. "BHO-2026-112")
  description     String?

  // Scope — array of ScopeItem (see section 6)
  scope           Json

  // Lifecycle
  status          MatterStatus
  invitedBy       String     // userId of the initiator
  invitedFrom     NetworkSide
  invitedAt       DateTime   @default(now())
  acceptedAt      DateTime?
  revokedAt       DateTime?
  revocationReason String?

  // Effective window — both set at ACTIVE transition (nullable only
  // while status is PENDING_*). Default duration 12 months from
  // acceptedAt; renewable via scope-amendment before expiry.
  effectiveFrom   DateTime?
  effectiveUntil  DateTime?

  // Mutual consent proof
  handshakeHash   String      // SHA-256 of the canonical handshake bundle

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  lawFirmOrg      Organization @relation("LegalMatterFirm", fields: [lawFirmOrgId], references: [id])
  clientOrg       Organization @relation("LegalMatterClient", fields: [clientOrgId], references: [id])

  accessLogs      LegalMatterAccessLog[]
  invitations     LegalMatterInvitation[]

  @@unique([lawFirmOrgId, clientOrgId, reference])
  @@index([clientOrgId, status])
  @@index([lawFirmOrgId, status])
}

enum MatterStatus {
  PENDING_INVITE      // token sent, no acceptance yet
  PENDING_CONSENT     // token accepted; counter-signature outstanding
  ACTIVE
  SUSPENDED           // operator paused; can be resumed
  CLOSED              // normal termination
  REVOKED             // forced termination (trust breach)
}

enum NetworkSide {
  ATLAS
  CAELEX
}
```

### New: `LegalMatterInvitation`

Ephemeral record that lives only until the token is consumed or expires.

```prisma
model LegalMatterInvitation {
  id                      String   @id @default(cuid())
  matterId                String   @unique
  tokenHash               String   // SHA-256 of the one-time token
  expiresAt               DateTime // 72h from creation
  consumedAt              DateTime?
  proposedScope           Json
  proposedDurationMonths  Int?

  matter                  LegalMatter @relation(fields: [matterId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
  @@index([expiresAt])
}
```

### New: `LegalMatterAccessLog`

Append-only audit-trail, one entry per access event.

```prisma
model LegalMatterAccessLog {
  id              String   @id @default(cuid())
  matterId        String

  // Who
  actorUserId     String?
  actorOrgId      String
  actorSide       NetworkSide

  // What
  action          AccessAction
  resourceType    String       // Prisma model name, e.g. "CybersecurityAssessment"
  resourceId      String?

  // Authorisation trace
  matterScope     String       // which ScopeItem category authorised this access
  context         Json?        // arbitrary metadata

  // Request fingerprint
  ipAddress       String?
  userAgent       String?

  // Tamper-evident hash chain
  previousHash    String?
  entryHash       String

  createdAt       DateTime @default(now())

  matter          LegalMatter @relation(fields: [matterId], references: [id], onDelete: Cascade)

  @@index([matterId, createdAt])
}

enum AccessAction {
  READ_ASSESSMENT
  READ_AUTHORIZATION
  READ_DOCUMENT
  READ_TIMELINE
  READ_INCIDENT
  EXPORT_DOCUMENT
  SUMMARY_GENERATED
  MEMO_DRAFTED
}
```

### Extend: `Organization`

```prisma
// Add to existing Organization model:
type    OrganizationType  @default(OPERATOR)

enum OrganizationType {
  OPERATOR
  LAW_FIRM
  BOTH         // rare; some firms also operate satellites (e.g. Rocket Lab Counsel)
}
```

Backward-compatible: existing orgs default to `OPERATOR`.

## 6. Scope model

A scope is an array of `ScopeItem`. Each item names a data category, the
permissions granted, and optional narrowing filters.

```typescript
type ScopeItem = {
  category: ScopeCategory;
  permissions: ScopePermission[];
  resourceFilter?: {
    assessmentIds?: string[];
    jurisdictions?: string[];
    spacecraftIds?: string[];
  };
};

type ScopeCategory =
  | "COMPLIANCE_ASSESSMENTS" // Cybersec, Debris, Environmental, NIS2, Insurance
  | "AUTHORIZATION_WORKFLOWS" // AuthorizationWorkflow + child docs
  | "DOCUMENTS" // Document vault (opt-in per matter)
  | "TIMELINE_DEADLINES" // Deadline + Milestone
  | "INCIDENTS" // Incident + NIS2 phases
  | "SPACECRAFT_REGISTRY" // Spacecraft + registration
  | "AUDIT_LOGS"; // meta-scope, rarely granted

type ScopePermission =
  | "READ" // full read of values
  | "READ_SUMMARY" // aggregate only (counts, flags, status)
  | "EXPORT" // download / produce PDF
  | "ANNOTATE"; // attach lawyer notes; does NOT modify originals
```

### Default levels (shown in invite UI as quick-picks)

| Level               | Categories                               | Permissions                  | Intended for        |
| ------------------- | ---------------------------------------- | ---------------------------- | ------------------- |
| L1 — Advisory       | Assessments, Timeline                    | `READ`, `READ_SUMMARY`       | One-off consulting  |
| L2 — Active Counsel | L1 + Authorization, Documents, Incidents | `READ`, `ANNOTATE`           | Ongoing mandate     |
| L3 — Full Counsel   | All categories except Audit-Logs         | `READ`, `ANNOTATE`, `EXPORT` | Full representation |

Operator may narrow any quick-pick at accept time (e.g. pick L2 but filter
`jurisdictions: ["DE", "FR"]` on `AUTHORIZATION_WORKFLOWS`). The firm sees
exactly what the operator ultimately approved — never more.

## 7. UI surface (Phase 1 minimal)

### Atlas side

| Route                       | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `/atlas/network`            | Matter list for the firm. Table: client, name, status, scope, accesses |
| `/atlas/network/invite`     | Invite form: client email, matter name, scope quick-pick, duration     |
| `/atlas/network/[matterId]` | Matter detail: status, full scope, timeline, audit-log summary         |

### Caelex side

| Route                                               | Purpose                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| `/dashboard/network/legal-counsel`                  | Active law firms list                                 |
| `/dashboard/network/invitations`                    | Pending invites awaiting consent                      |
| `/dashboard/network/legal-counsel/[matterId]`       | "What is this firm seeing?" — scope + recent accesses |
| `/dashboard/network/legal-counsel/[matterId]/audit` | Full 90-day access log                                |

### Both sides

| Route                     | Purpose                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/network/accept/[token]` | Consent landing. Shows verified identity, scope preview, duration, revocation terms. `[Accept]` / `[Amend]` / `[Reject]` |

### Email templates

- `legal-matter-invited-to-operator` — firm → operator invite
- `legal-matter-invited-to-lawfirm` — operator → firm invite
- `legal-matter-accepted` — to the original inviter
- `legal-matter-revoked` — to both sides
- `legal-matter-expiring` — sent 30 days before `effectiveUntil`

## 8. Security, audit, and revocation

### Token design

- One-time tokens, 32 bytes of randomness, base64url-encoded in the email link
- **Only the SHA-256 hash is stored** server-side — the raw token lives only
  in the email and browser URL
- 72-hour expiry on unconsumed invitations
- `consumedAt` stamp on first successful `POST /accept` — any further use is
  rejected
- Optional IP-binding (flagged; off by default because law firms often have
  egress through VPNs that shift IP)

### Handshake proof

On acceptance, we compute:

```
handshakeHash = SHA-256(
  canonicalJSON({
    matterId,
    lawFirmOrgId,
    clientOrgId,
    scope,              // canonical-sorted ScopeItem array
    effectiveFrom,
    effectiveUntil,
    invitedBy,
    acceptedBy,         // the consenting user on the other side
    acceptedAt,
    handshakeVersion: "v1"
  })
)
```

Stored once, never mutated. Any later scope amendment produces a new matter
record or a linked `handshakeHash` chain.

### Access-log hash chain

Each `LegalMatterAccessLog.entryHash` is computed as:

```
entryHash = SHA-256(
  previousHash || canonicalJSON(thisEntryWithoutHashes)
)
```

The `matterId`'s first entry has `previousHash = null` and chains to the matter
creation hash. Tampering with any entry breaks the chain from that point
forward.

**Daily anchor**: the existing `audit-chain-anchor` cron (03:00 UTC) extends to
also sign each matter's current chain head into the Verity attestation service,
producing an externally verifiable proof.

### Revocation

Operator-initiated revocation:

1. Operator clicks "Revoke" with a reason
2. Matter `status` → `REVOKED`, `revokedAt` stamped
3. All active bearer-tokens (in Phase 3 when Atlas queries Caelex) for this
   matter are invalidated immediately server-side
4. 24-hour **read-only grace window** on already-open Atlas matters —
   a lawyer mid-memo can finish and export, but cannot pull any new data
5. Grace window is hard-capped: after 24h, all surfaces return a
   `MATTER_REVOKED` error and the UI redirects to a summary page

Revocation itself is an access-log entry (`action: MATTER_REVOKED`).

### Middleware invariant

All Atlas routes that will eventually touch operator data (Phase 3) must pass
through `requireActiveMatter(matterId, scopeCategory)` middleware before any
query hits the database. Phase 1 introduces the middleware and wires it on the
matter-detail endpoints, returning 404 when no active matter exists. This is
the enforcement seam Phase 3 extends with actual data access.

Integration test invariant: any attempt to access operator resources without a
valid matter scope must produce a test failure.

## 9. API endpoints (Phase 1)

All endpoints are rate-limited (see section 10) and audit-logged.

```
# Invitation flows
POST   /api/atlas/network/invite
       body: { clientEmail, matterName, reference?, proposedScope, durationMonths }
       → creates PENDING_INVITE matter + invitation + sends email

POST   /api/network/operator/invite
       body: { lawFirmEmail, matterName, proposedScope, durationMonths }
       → creates PENDING_INVITE matter from operator side

POST   /api/network/accept/:token
       body: { acceptedScope?, amendedDurationMonths? }  // narrower than proposed only
       → consumes token, transitions to ACTIVE (or PENDING_CONSENT if amended)

POST   /api/network/reject/:token
       body: { reason? }
       → token consumed, matter CLOSED (never activated)

# Matter management
GET    /api/network/matters
       → list matters scoped to caller's org

GET    /api/network/matter/:id
POST   /api/network/matter/:id/suspend
POST   /api/network/matter/:id/resume
POST   /api/network/matter/:id/revoke
       body: { reason }
POST   /api/network/matter/:id/scope-amendment
       body: { proposedScope }
       → generates new invitation for counter-sign by the other side

GET    /api/network/matter/:id/access-log
       query: ?since=<ISO>&limit=<int>
```

Auth: every endpoint uses `getAtlasAuth` or `getCaelexAuth` (determined by
the route-path prefix) — never cross-applicable.

## 10. Rate limits

New tiers added to the existing `src/lib/ratelimit.ts`:

- `legal_matter_invite` — 10/hour/user (limits invite spam)
- `legal_matter_accept` — 20/day/user (stops token brute-force)
- `legal_matter_amendment` — 5/day/matter (stops scope-negotiation loops)
- `legal_matter_audit_read` — 30/minute/user (normal audit viewing)

## 11. Non-goals for Phase 1

- No cross-product data pull (that's Phase 3 Data Bridge)
- No AI tool-use against client data (Phase 3)
- No workspace/matter-workbench UI beyond the matter-detail page (Phase 2)
- No billing or commercial integration (Phase 4)
- No multi-firm management of a single operator-org from a single screen
  (Phase 2+; operator can still accept multiple matters separately)
- No pre-provisioned bulk onboarding for enterprise (Phase 4+)
- No mobile-optimised flows — desktop-first for this phase

## 12. Success metrics

- **Adoption**: 2+ bilateral handshakes complete in the first week (internal
  dogfood: Caelex legal team + a friendly law-firm partner)
- **Audit integrity**: every `ACTIVE` matter produces a valid `entryHash` chain
  verified by the daily anchor cron within 7 days
- **Zero data leaks**: no access event recorded without a corresponding valid
  `ScopeItem` — enforced by integration test invariant
- **Revocation speed**: operator revoke action becomes fully effective within
  5 seconds end-to-end (measured via synthetic test)
- **Token safety**: zero successful token-replay attempts in penetration test

## 13. Risk register

| Risk                                            | Likelihood | Impact   | Mitigation                                                                                                                                  |
| ----------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator accidentally accepts                   | Medium     | High     | Consent screen shows plain-language preview of every data category. Accept button is not the primary button — Amend is visually equal.      |
| Token replay attack                             | Low        | High     | One-time consume + SHA-256 hash + 72h expiry + single-use `consumedAt`. IP-binding available as flag.                                       |
| Bug → unauthorised cross-org data leak          | Medium     | Critical | `requireActiveMatter` middleware is the only path. Integration-test invariant fails on unauthorised access. Every access creates audit-log. |
| Verschwiegenheitspflicht (§43a BRAO) violation  | Low        | Critical | Matter transitions signed. Revocation instant. Data-access middleware always checks scope. Legal review before GA.                          |
| Lawyer leaves firm with access to open matters  | Medium     | Medium   | User-level session ends, but matter is org-bound. Org maintains matter; the departing user loses personal access at session expiry.         |
| Scope-creep after acceptance                    | High       | Medium   | No silent scope changes. Any amendment triggers a new counter-signature cycle.                                                              |
| Operator over-restricts, making matter unusable | Medium     | Low      | Firm sees "scope-insufficient for this action" messages in Phase 3. Can request amendment.                                                  |
| Data residency concerns (US firm, EU client)    | Low        | High     | Phase 1 stores everything in EU-region Postgres. Phase 4 hardens for cross-border legal privilege.                                          |

## 14. Open questions for Phase 2 scoping

Not blocking Phase 1, but recorded now so they don't surprise us later:

- **Multi-matter per client**: can BHO Legal have two concurrent matters with
  SpaceCorp (e.g. M&A + launch authorization), with different scopes? Probably
  yes — use `reference` as the disambiguator.
- **Delegation within the firm**: which partners/associates at BHO Legal can
  act on which matters? Phase 2 introduces matter-membership RBAC.
- **Client-side workspace**: does the operator see a read-only view of the
  firm's workspace (the memo being drafted, the tasks being tracked)? Phase 2
  question.
- **Document attachment**: the lawyer may want to attach their own documents
  (templates, precedents) to a matter. Those are firm-owned, not client-owned;
  separate storage scope. Phase 2.

## 15. Implementation sequence (rough)

Not a plan, just an outline for the writing-plans phase:

1. Prisma migration: new models + `Organization.type`
2. Token generation + handshake hashing utilities (`src/lib/legal-network/`)
3. `requireActiveMatter` middleware
4. Invite API endpoints + email dispatch
5. Accept/amend/reject flows + consent landing page
6. Matter list + detail pages (both sides)
7. Audit-log viewer + chain verification
8. Revocation flow + grace window
9. Integration tests for scope invariants
10. Legal review + sign-off

---

## Appendix A — Canonical handshake JSON

For reproducibility of `handshakeHash`:

```json
{
  "acceptedAt": "2026-04-23T14:22:07.120Z",
  "acceptedBy": "user_cmb8z...",
  "clientOrgId": "org_yvwk2...",
  "effectiveFrom": "2026-04-23T00:00:00.000Z",
  "effectiveUntil": "2027-04-23T00:00:00.000Z",
  "handshakeVersion": "v1",
  "invitedBy": "user_cm4qa...",
  "lawFirmOrgId": "org_bqxr8...",
  "matterId": "mat_01hg3...",
  "scope": [
    {
      "category": "COMPLIANCE_ASSESSMENTS",
      "permissions": ["READ", "ANNOTATE"],
      "resourceFilter": { "jurisdictions": ["DE", "FR"] }
    },
    {
      "category": "TIMELINE_DEADLINES",
      "permissions": ["READ"]
    }
  ]
}
```

Keys are sorted alphabetically, arrays preserve order (scope is canonicalised
at creation), timestamps in ISO-8601 UTC.

## Appendix B — Consent-landing content guidelines

The `/network/accept/:token` page is a legal-weight moment. It must show:

1. **Who**: verified organisation name, logo if present, primary contact user
2. **What**: plain-language scope summary
   - Not: "COMPLIANCE_ASSESSMENTS × READ"
   - But: "Read your Cybersecurity, Debris, Environmental, NIS2 and Insurance
     assessment scores and findings"
3. **When**: effective-from date + duration + renewal note
4. **Who will see what**: link to the firm's org members (opt-in; Phase 2)
5. **Revocation**: explicit note that access can be ended any time with
   24h read-only grace for open work
6. **Audit assurance**: one sentence confirming every access is logged and
   visible to the operator

No dark patterns. `[Accept]`, `[Amend scope]`, `[Reject]` buttons are visually
equal. Reject is not hidden in a secondary menu.
