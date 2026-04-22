# ATLAS Cybersecurity Audit — 2026-04-22

**Scope:** Complete security analysis of the ATLAS sub-application — authentication + invitation flows, API endpoints, data access + multi-tenancy, frontend + infrastructure.
**Methodology:** Four parallel audit tracks (auth, API, data, frontend/infra) with cross-verification of disputed findings.
**Posture:** Findings only — no code changes were made as part of this audit.

---

## Executive Summary

ATLAS demonstrates mature defence-in-depth. Input validation is comprehensive (Zod everywhere), CSRF is layered (origin + double-submit cookie with session binding), invitation tokens are cryptographically sound, and multi-tenant isolation is correctly scoped in query layers. However, **four CRITICAL issues** require immediate attention — three of them exist in code paths that were added or changed in the last two sprints.

### Severity Summary

| Severity          | Count | Items                                                                                                                                                                                               |
| ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **CRITICAL**   | 4     | invite-info token enumeration · open redirect via `callbackUrl` · `AtlasAnnotation` cross-org IDOR · password-reset stub (availability-critical)                                                    |
| 🟠 **HIGH**       | 3     | `/atlas-access` slot-booking race · missing audit log on annotation/bookmark mutations · CSP `'unsafe-inline'` scripts (Next.js-imposed)                                                            |
| 🟡 **MEDIUM**     | 5     | inviter-email leak on invite-info · `acceptTerms` not enforced server-side · `AtlasBookmark` not org-scoped · bookmark bulk-import quota race · `AtlasSourceCheck` review logged only to app-logger |
| 🔵 **LOW / INFO** | 3     | session-ID entropy (analytics only) · no retention policy on `AtlasSourceCheckHistory` · Sentry `beforeSend` only scrubs `event.user`                                                               |

**Risk posture overall:** **MODERATE**. With the four CRITICAL findings remediated, posture drops to LOW. The strongest weaknesses are concentrated in two spots: (1) the invite-info public endpoint and (2) the just-shipped `/atlas-access` flow.

---

## 🔴 CRITICAL — Fix this week

### C-1. `GET /api/atlas/team/invite-info` — no rate limit → token enumeration + inviter-email harvesting

**File:** `src/app/api/atlas/team/invite-info/route.ts:23-87`

The endpoint is publicly exposed (no auth, no session) and performs a `prisma.organizationInvitation.findUnique({ where: { token } })` lookup with **no rate limit, no delay, no token probe protection**. Response codes clearly distinguish cases: `400` (malformed), `404` (token does not exist), `410` (expired/accepted), `200` (valid + returns `email`, `organizationName`, `inviterName`, `expiresAt`, `accountExists`).

An attacker can trivially loop random 64-char hex strings. While the 256-bit keyspace makes brute-forcing any one token infeasible, enumeration of **in-flight** tokens gets dramatically easier when combined with leaked email addresses or sub-sets of the hex space — and even without that, it leaks existence of invitations over time. When a token does hit, the response discloses the target firm, inviter identity, and (often) the inviter's email.

**Exploit chain:**

```
1. Attacker scripts a loop: GET /invite-info?token=<guess>
2. Status 200 reveals: { email, organizationName, inviterName }
3. Inviter name falls back to inviter email (see C-4 below)
4. Attacker accumulates a corpus of (firm → partner email) pairs for phishing.
```

**Fix:**

- Apply `checkRateLimit("public_api", getIdentifier(request))` — matches the 5/hr pattern used on `/api/atlas-access`.
- Return a constant-time 404 for `!exists || expired || accepted` so the response shape never distinguishes state.
- Drop the inviter-email fallback (see C-4).

---

### C-2. Open redirect via unvalidated `callbackUrl` on `/login` (and MFA challenge)

**File:** `src/app/login/page.tsx:145,186`

```ts
const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
// …
router.push(callbackUrl); // line 186 — no validation
router.push(
  `/auth/mfa-challenge?callbackUrl=${encodeURIComponent(callbackUrl)}`,
);
```

Next.js `router.push()` with an absolute URL to a different origin triggers a full-document navigation. **The middleware will not intercept a client-side navigation away from your domain** — middleware only runs on requests that hit your server. An attacker can send `https://atlas.caelex.eu/login?callbackUrl=https://evil.com/harvest` and an authenticated victim's session is then active when they land on the attacker-controlled page (they can be prompted to re-enter credentials, triggered to click a dangerous OAuth consent, etc).

This is the textbook open-redirect pattern and is especially damaging on a post-login destination.

**Middleware has callbackUrl validation** (`src/middleware.ts` — must start with `/`, no `//`, no `://`) but that only protects server-issued redirects. Client-side `router.push(callbackUrl)` is out of its reach.

**Fix (one utility, applied everywhere `callbackUrl` is used):**

```ts
function safeInternalUrl(raw: string, fallback = "/atlas"): string {
  if (!raw) return fallback;
  if (raw.startsWith("//") || raw.includes("://")) return fallback;
  if (!raw.startsWith("/")) return fallback;
  return raw;
}
```

Apply in `LoginForm`, in `/auth/mfa-challenge` (same pattern — verify), and in `/accept-invite` where it builds the callbackUrl that ultimately feeds into `/login`.

---

### C-3. `AtlasAnnotation` unique constraint missing `organizationId` → cross-org IDOR race

**File:** `prisma/schema.prisma:8402-8418`

```prisma
model AtlasAnnotation {
  userId         String
  organizationId String
  sourceId       String
  // …
  @@unique([userId, sourceId])     // ← organizationId missing
  @@index([organizationId])
}
```

The API handler (`src/app/api/atlas/annotations/route.ts`) **does** filter by `organizationId` in its WHERE clauses, so read-path isolation is intact. But the Prisma upsert uses the composite unique key `(userId, sourceId)`, and that key does not include `organizationId`. If a user is a member of two organisations (e.g., an outside counsel who consults for multiple firms), their annotation on a given `sourceId` can only exist once per `(userId, sourceId)` — not per `(userId, orgId, sourceId)`.

**Consequence:**

- User U in OrgA writes an annotation on source "EU-NIS2".
- User U switches to OrgB, annotates the same source.
- The DB silently UPDATES the OrgA record (same composite key) — the annotation now "belongs to" OrgB per the latest `organizationId` write, but any handler that read it by `(userId, sourceId)` alone would see stale data, and the AuditLog (if it existed — see H-2) would be misleading.
- Concurrent writes from both orgs can race on the unique key, causing inconsistent state.

**Fix:** Migration adding `organizationId` to the unique constraint, then updating the upsert callsite:

```prisma
@@unique([userId, organizationId, sourceId])
```

Schema migration requires dropping the old unique index and creating the new one — safe on an empty table or with a dedup preflight on live data.

---

### C-4. `/api/auth/forgot-password` — stub, users can't reset their own passwords

**File:** `src/app/api/auth/forgot-password/route.ts:19-63`

The endpoint is intentionally stubbed (log-only) as documented in a TODO at the top of the file. Anti-enumeration contract is correct (always 200, rate-limited at `sensitive` = 5/hr), and the API shape matches the eventual real implementation. But **no reset email is ever sent and no reset token is created**. In production, a user who forgets their password has no self-service path to recover it — an admin must reset the password manually out-of-band.

This is filed as CRITICAL not as a confidentiality/integrity vuln but as an **availability-class security issue**: a documented auth feature is non-functional in a product that handles regulated/compliance workflows. The /atlas-forgot-password UI is live and accessible from /login, so users will try the flow and silently fail.

**Fix (deferred from previous sprint — now blocking):**

1. Add `PasswordResetToken` model (token hash, userId, createdAt, expiresAt ≤ 60min, usedAt).
2. On POST: `findUnique` by email → if exists, generate `crypto.randomBytes(32).toString("hex")`, store SHA-256 hash, send Resend email with `/atlas-reset-password?token=…` link. Always return 200.
3. New `POST /api/auth/reset-password` that consumes the token atomically (single-use, expiry check, length-bounded password enforcement via existing `RegisterSchema.password`).
4. `/atlas-reset-password` page with same dark-stage ATLAS brand as the rest of the auth flow.

---

## 🟠 HIGH — Fix this sprint

### H-1. `/api/atlas-access` — slot-booking race condition can double-book

**File:** `src/app/api/atlas-access/route.ts:159-251`

The handler re-checks slot availability (DB + Google Calendar) **before** `prisma.booking.create`, but between the check and the INSERT there is no transactional lock. Two concurrent requests for the same slot will both pass the availability check and both create a `Booking` row. Google Calendar deduplicates on `externalId` (per-DemoRequest cuid) so you may or may not see two calendar events, but the database state becomes inconsistent.

**Mitigation in place:** `public_api` rate limit (5/hr per IP), so the attack surface is small. Also, the calls are intended for sales follow-up so human review catches collisions in practice.

**Fix:** The cleanest mitigation is a Postgres partial unique index:

```sql
CREATE UNIQUE INDEX booking_no_overlap
  ON "Booking" ("scheduledAt")
  WHERE status IN ('CONFIRMED', 'COMPLETED');
```

Combined with a `try { ... } catch (PrismaError P2002)` around the create → 409 response. Optionally wrap the re-check + create in `prisma.$transaction([...], { isolationLevel: "Serializable" })`.

---

### H-2. No audit logging on `AtlasAnnotation` / `AtlasBookmark` mutations

**Files:** `src/app/api/atlas/annotations/route.ts` + `src/app/api/atlas/bookmarks/route.ts`

ATLAS is pitched at regulated law firms; traceability of who-changed-what is part of that value proposition. Invitation lifecycle (invite, accept, cancel, remove) is audit-logged. Annotation and bookmark CRUD are not. For bookmarks this is lower-impact (user-scoped, non-shared). For annotations — which are **organisation-scoped** and might contain firm-confidential case notes — this is a clear gap.

**Fix:** Call `logAuditEvent({ userId, organizationId, action: "atlas_annotation_upserted" | "…_deleted", entityType, entityId, newValue })` from each mutation path. Pattern already exists in `src/lib/services/organization-service.ts` for invitations — copy that.

`AtlasSourceCheck` admin review (`src/app/api/admin/atlas-updates/route.ts:73-77`) goes to `logger.info()` but not the `AuditLog` table. Platform-admin actions should appear in the Audit Center UI. Same fix.

---

### H-3. CSP permits `'unsafe-inline'` for scripts (and styles)

**File:** `src/lib/csp-nonce.ts:64-92`

`script-src` includes `'unsafe-inline'` unconditionally; `style-src` includes `'unsafe-inline'` too. `'unsafe-eval'` is dev-only (`isDev` gate). The file comments correctly identify this as a Next.js 15 limitation — App Router inlines hydration/streaming scripts that the runtime can't yet tag with a per-request nonce. The surrounding CSP is strict (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`), and an explicit migration plan to nonce-based CSP is documented.

**Current mitigation quality:** The other defences (DOMPurify for user HTML, no `dangerouslySetInnerHTML` in ATLAS components, no DOM XSS sinks, React auto-escape everywhere) collapse the practical XSS surface. But once an attacker has a foothold (e.g., a third-party dependency with a supply-chain issue), `'unsafe-inline'` lets injected `<script>` tags run freely.

**Fix:** Monitor Next.js 16 for native nonce support; until then, document as accepted risk and add a regression test that the CSP header stays otherwise strict.

---

## 🟡 MEDIUM

### M-1. Inviter email leaked on invite-info when no display name set

**File:** `src/app/api/atlas/team/invite-info/route.ts:77`

```ts
inviterName: inviter?.name || inviter?.email || "A colleague";
```

When a valid token is hit and the inviter's `User.name` is null, the response returns the inviter's email address. Compounded with **C-1** (no rate limit), this becomes a low-friction way to harvest `(firm → inviter email)` pairs.

**Fix:** Drop the email fallback — `inviter?.name || "A colleague"`.

---

### M-2. `acceptTerms` only enforced on the client

**File:** `src/app/api/auth/signup/route.ts:40-47`

The Zod schema includes `acceptTerms`, but the route handler destructures only `name, email, password, organization, acceptAnalytics, inviteToken`. There is no server-side check that `acceptTerms === true`. The UI disables the submit button until the box is ticked, but an API consumer can bypass this by POSTing with `acceptTerms: false` (or omitting it) and the account still gets created.

**Fix:** Either require it in the Zod schema (`z.literal(true)`) or add an explicit runtime check after `safeParse`. The `UserConsent` row is being written regardless, so recording the actual consent value rather than "always true" is also a GDPR-hygiene improvement.

---

### M-3. `AtlasBookmark` is user-scoped, not org-scoped

**File:** `prisma/schema.prisma:8343-8358`

Unique key `(userId, itemId)` — a user who works across two orgs has a single shared bookmark set. Could be deliberate (users follow sources across firms) or could be a product-intent gap. If firms expect bookmark data to be per-workspace, this leaks existence of bookmarks between orgs.

**Fix:** Product decision needed. If org-scoped: add `organizationId` + migrate unique key to `(userId, organizationId, itemId)`.

---

### M-4. Bulk bookmark import quota race

**File:** `src/app/api/atlas/bookmarks/route.ts:122-147`

```ts
const currentCount = await prisma.atlasBookmark.count(...)
if (currentCount + items.length > MAX_BOOKMARKS_PER_USER) return 400
// race window
await prisma.$transaction(items.map(it => prisma.atlasBookmark.upsert(...)))
```

Two concurrent imports can both observe `count = 990`, both pass the 1000-cap check with 15 items each, and both commit — 1005 bookmarks stored, over quota. Low impact (quota is a soft guardrail, not a security boundary), but worth hardening.

**Fix:** Move the count inside the transaction with `FOR UPDATE` or a DB-level trigger enforcing the cap.

---

### M-5. `AtlasSourceCheck` admin review logs only to app logger, not `AuditLog`

**File:** `src/app/api/admin/atlas-updates/route.ts:73-77`

Admin actions on regulatory source changes are captured via `logger.info()` which flows to CloudWatch/Sentry but not the `AuditLog` table. They won't appear in compliance exports or the Audit Center UI, which is a regression against the "full audit trail" promise.

**Fix:** Add `logAuditEvent` alongside the existing `logger.info` call.

---

## 🔵 LOW / INFO

- **L-1.** Analytics session IDs use `Date.now() + Math.random()` (`src/lib/analytics.ts:75`). Predictable but only used for analytics grouping — not an auth context. Acceptable.
- **L-2.** `AtlasSourceCheckHistory` has no retention policy. Regulatory-history append-only table; will accumulate indefinitely. Document retention (7yr per GDPR Art. 5(1)(e)) and implement an archival cron.
- **L-3.** Sentry `beforeSend` (`sentry.client.config.ts:55-82`) only scrubs `event.user` fields. Sensitive data in `event.contexts`, `event.breadcrumbs`, or `event.request.data` is not filtered. Add breadcrumb filtering and use Sentry's `denyUrls` / data-scrubbing rules.

---

## ✅ Confirmed Controls

The audit verified the following controls **are correctly implemented**:

### Auth + Invitation

- `OrganizationInvitation.token`: `crypto.randomBytes(32).toString("hex")` = 256-bit CSPRNG entropy (`src/lib/services/organization-service.ts:550`).
- Invite expiry: 14 days (`src/app/api/atlas/team/route.ts:18` + `organization-service.ts:555-556`).
- Single-use enforcement: `acceptedAt` check inside a `prisma.$transaction`, which also creates the membership atomically (`organization-service.ts:616-684`).
- Email-match gate on accept: case-insensitive, verified server-side (`organization-service.ts:640-651`).
- Invite creation rate-limited at `sensitive` (5/hr per authenticated owner).
- Password policy enforced server-side: 12+ chars, mixed case + digit + special, `bcrypt` cost 12 (`src/lib/validations.ts:84-94`, `src/app/api/auth/signup/route.ts:99`).
- ATLAS auth guard (`src/app/(atlas)/atlas/layout.tsx:34-50`): requires authenticated user + active org membership; deactivated org redirects to `/atlas-no-access`.
- Email HTML escaping in invitation template + `/api/atlas-access` prospect/admin emails (`escapeHtml` helper applied to all DB-sourced values).
- `safeUrl()` in invitation renderer blocks `javascript:` / `data:` scheme injection.

### API + CSRF + Rate limiting

- All 18 ATLAS API routes use Zod for input validation. Strings are bounded, arrays capped (bookmarks max 500 per import), `.strict()` rejects unknown fields where used.
- CSRF middleware (`src/middleware.ts:255-494`): layered origin + double-submit cookie with session-hash binding. ATLAS endpoints are not exempted.
- `/api/atlas-access` uses `public_api` tier, other user-facing endpoints use `api` (100/min), `sensitive` writes use `sensitive` (5/hr).
- Admin endpoints (`/api/admin/atlas-*`) use `requirePlatformAdmin()` which re-fetches the role from the DB (not JWT) — instant revocation on role change.
- `getSafeErrorMessage` used consistently on 5xx paths; no stack traces leak to clients.
- `maskEmail()` applied in logger calls on sensitive paths.

### Data access + multi-tenancy

- All annotation GET/POST/DELETE handlers scope queries to `organizationId` in the WHERE clause (handler-level isolation is intact; the schema constraint gap in **C-3** is the concern).
- `onDelete: Cascade` on bookmarks + annotations → clean up on user deletion.
- `/api/user/delete` anonymises audit-log `userId` to `null` before deleting the user — retains audit integrity, satisfies GDPR erasure.
- Cron endpoints validate `CRON_SECRET` with `timingSafeEqual` + length-precheck (**correct** — the length check before `timingSafeEqual` is required; `timingSafeEqual` throws on length mismatch, and length itself is trivially observable).
- Source-check cron applies an SSRF allowlist (`isSafeHttpUrl`) rejecting localhost, RFC1918, link-local, and AWS metadata (169.254.169.254).
- Cron fetch: 10s timeout, 5MB body cap, 8-worker concurrency, 200KB snapshot cap. DoS via malicious source URL response is constrained.
- Content hashing: SHA-256 (`createHash("sha256")`). Appropriate for integrity detection (not an auth primitive).

### Frontend + infra

- Security headers: HSTS (2yr preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denies geolocation/camera/mic/FLoC/USB/payment, X-Powered-By stripped.
- CSP core: `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`.
- Image `remotePatterns` is an explicit allowlist — no wildcards.
- Source maps hidden in production (`hideSourceMaps: true`).
- Sentry `sendDefaultPii: false`; session replay `maskAllText: true` + `blockAllMedia: true`.
- No `dangerouslySetInnerHTML` in ATLAS components. No user-controlled URL in `<a href>` without the `safeUrl` pattern.
- No auth tokens in `localStorage` (NextAuth uses HttpOnly cookies). The `atlas-notes` localStorage key is a one-time legacy migration artifact that clears itself.

---

## Remediation Priority

### This week (CRITICAL)

1. **C-1** — Add `checkRateLimit("public_api", …)` to `/api/atlas/team/invite-info`.
2. **C-1 + C-4** — Drop `inviter?.email` fallback from invite-info response.
3. **C-2** — Add `safeInternalUrl(callbackUrl)` helper; apply in `/login` + `/auth/mfa-challenge`.
4. **C-3** — Prisma migration: `@@unique([userId, organizationId, sourceId])` on `AtlasAnnotation` after dedup check.
5. **C-4** — Finish the password-reset flow (model + email send + `/atlas-reset-password` page + POST endpoint).

### This sprint (HIGH)

6. **H-1** — Partial unique index on `Booking.scheduledAt` for active statuses; 409 on collision.
7. **H-2** — `logAuditEvent` on annotation + bookmark CRUD and on `AtlasSourceCheck` admin review.

### Next sprint (MEDIUM)

8. **M-2** — Enforce `acceptTerms` server-side (`z.literal(true)` or explicit check).
9. **M-3** — Product decision on `AtlasBookmark` org-scoping; migration if needed.
10. **M-4** — Enforce bookmark quota inside transaction.

### Backlog (LOW/INFO + long-horizon)

11. **H-3** — Track Next.js 16 for CSP nonce support; add a regression test on header strictness.
12. **L-2** — Retention policy on `AtlasSourceCheckHistory` + archival cron.
13. **L-3** — Harden Sentry `beforeSend` to scrub breadcrumbs + contexts + request bodies.

---

## Methodology notes

Four parallel audit tracks were used:

1. **Auth + invitation flow** — login, signup, forgot-password, invite, accept-invite, OAuth, auth guard.
2. **API + rate limit + CSRF** — endpoint-by-endpoint inventory, auth checks, input validation, error handling.
3. **Data access + multi-tenancy** — Prisma model inventory, query scoping, IDOR probing, token cryptography, audit coverage, retention.
4. **Frontend + infra + deps** — XSS, redirects, localStorage, CSP, security headers, source maps, Sentry scrubbing.

Cross-track disagreements were manually verified before inclusion in this report:

- One track claimed the 14-day invite expiry was 7 days — verified in source as **14 days**; the 7-day setter at `organization-service.ts:737` is a separate `resendInvitation` / alternate-flow code path that is not the main ATLAS team invite.
- One track claimed the `CRON_SECRET` comparison had a timing-attack bug due to the length pre-check. This is **incorrect** — `crypto.timingSafeEqual` throws on length mismatch, so the length check is mandatory; the length itself is trivially observable in any HTTP request (bytes on the wire), so there is no new leak. The implementation is sound.

No code was changed during this audit. All findings are reported against the head of `claude/vibrant-kirch-091e7e` (equal to `origin/main` as of commit `268c1fcb`).
