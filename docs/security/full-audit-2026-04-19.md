# Caelex Full Security Audit — 2026-04-19

**Methodology**: Five parallel security audits covering the complete Caelex
platform (Atlas was audited separately on the same date and its findings
are tracked in the git history via commits `c108fc1f` through `f75df687`).

**Scope**:

1. Authentication, authorization, session management
2. API routes (400 routes, 56 domains)
3. Data protection, encryption, GDPR
4. Frontend security (XSS, CSRF, CSP)
5. Infrastructure, dependencies, supply chain

**Totals**: ~90 findings

- 🔴 Critical: **11**
- 🟠 High: **25**
- 🟡 Medium: **35**
- 🟢 Low / Info: **19**

---

## 🔴 Critical (11)

### Authentication & Session

#### C1 — OAuth account-takeover via email trust

**File**: `src/lib/auth.ts:237-263`
NextAuth is initialised **without `PrismaAdapter`**. The `signIn` callback
only checks `dbUser.isActive`; it does not verify that
`account.providerAccountId` is linked to the user. An attacker with an
Apple or Google Workspace account matching an existing Caelex credentials
user's email can sign in via OAuth and receive a JWT with that user's id.
**Fix**: restore `PrismaAdapter` or add explicit link-check in signIn.

#### C2 — MFA auto-heal bypass

**File**: `src/app/api/auth/mfa/validate/route.ts:103-150`
If `mfaRequired=true` in JWT but `MfaConfig` is missing/disabled, the
route mints a new JWT with `mfaVerified=true` **without any challenge**
and without audit log. Attack chain: steal credentials + disable MFA via
compromised admin / race during re-setup → full session.
**Fix**: on missing config, force logout + password re-entry; audit-log
auto-heals.

### API / Access Control

#### C3 — Verity certificate IDOR (operatorId semantics inconsistent)

**Files**: `src/app/api/v1/verity/certificate/**`
`operatorId` is written as `user.id` on `issue` but read as
`organizationId` on `revoke`, `visibility`, `list`. `revoke` has no role
gate. Either broken functionality or org-wide revoke escalation for any
MEMBER.
**Fix**: normalise semantic across all verity routes; add
`role in [OWNER, ADMIN, MANAGER]` gate on revoke.

#### C4 — `/api/cron/data-retention-cleanup` POST surface

**File**: `src/app/api/cron/data-retention-cleanup/route.ts:230-232`
`POST` re-invokes `GET(req)`. No `X-Vercel-Cron` header check, no replay
protection. An attacker who obtains `CRON_SECRET` (or via internal
misrouting) can trigger `deleteMany` transactions at will.
**Fix**: remove POST, or gate behind admin session rather than CRON_SECRET.

#### C5 — Admin role check without DB re-fetch

**Files**: `src/app/api/admin/**`
`requireRole(["admin"])` consumes only the JWT. `updateAge: 5 * 60` means
demoted admins retain admin access for up to 5 minutes. No `isActive`
re-check.
**Fix**: `requireRole` should re-query DB for current role + active state.

#### C6 — Organization update mass-assignment via `billingAddress`

**File**: `src/app/api/organizations/[orgId]/route.ts` PATCH
`z.record(z.string(), z.unknown())` accepts arbitrary JSON. If the
service layer spreads it or downstream renders it in PDFs/HTML: stored
XSS or protected-field override.
**Fix**: concrete schema `{street, city, country, zip}` with bounded
string lengths.

### Data & Crypto

#### C7 — Per-org encryption is not truly tenant-isolated

**File**: `src/lib/encryption.ts:100-144`
`getOrgKey()` derives via `scrypt(masterKey, "org:{id}:{SALT}")`. The
only tenant-specific input is the **public** `organizationId` in the
salt. Master-key leak → every tenant's data plaintext.
**Fix**: per-tenant KEK via KMS/HSM (architecture change).

#### C8 — Audit hash chain not tamper-evident against DB admin

**File**: `src/lib/audit-hash.server.ts:280-296`
`entryHash` + `previousHash` live in the same Postgres table as the
audit rows. DB-write access → full chain rewrite undetectable. `verifyChain`
only checks internal consistency. Hash-fail fallback writes unhashed rows
(`entryHash: null`) — 9 silent breaks before `SecurityEvent` fires.
**Fix**: external trust anchor (daily signed root hash published to
append-only log or KMS signing service).

#### C9 — Hardcoded admin emails in seed script

**File**: `prisma/seed-admin.ts:12-16`
Default admin list `["julian@caelex.eu", "cs@ahrensandco.de"]`. In staging
/fork env with restored prod DB, anyone registering these emails gets
admin on next seed run.
**Fix**: env-only, no defaults.

### Infrastructure

#### C10 — `jspdf ^4.1.0` critical RCE-class CVE

PDF Object Injection (CVSS 8.1). Caelex uses jsPDF for 8+ server-side
report types with user-controllable input → directly exploitable.
**Fix**: `npm update jspdf` (fix available).

#### C11 — Next.js 15.5.12 DoS + request smuggling

GHSA-q4gf-8mx6-v5v3 (CVSS 7.5), GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8.
Patch ≥15.5.15 available for weeks but blocked by Dependabot config (see
H-I1).
**Fix**: `npm update next` after H-I1.

---

## 🟠 High (25)

### Auth & Session (5)

- **H-A1**: TOTP `window=1` accepts ±30s — real-time phishing proxy can
  replay before legitimate user
- **H-A2**: `mfa/validate` does not increment `failedLoginAttempts` →
  7200 brute-force attempts/day per IP possible, 6-digit space = 0.7%
  hit/day
- **H-A3**: Passkey verify without `expectedUserId` — anonymous challenge
  accepts any credential. OK if attacker has no foreign private key,
  but the validation is missing
- **H-A4**: `getCurrentOrganization` uses "first joined membership"
  rather than `atlas_active_org` cookie — cross-org leak for multi-org
  users (`satellites/fleet/route.ts:15-18`)
- **H-A5**: `change-password` plaintext equality check before
  `bcrypt.compare` → timing oracle 400-"different" vs 400-"incorrect"

### API / Access (6)

- **H-API1**: Supplier-token `lcaData: z.record(z.string(), z.unknown())`
  unbounded → storage DoS + second-order XSS
- **H-API2**: `/api/documents/[id]/download` OR-scoped
  `{userId} ∪ {organizationId}` — any MEMBER can download TOP_SECRET
  docs; `Document.accessLevel` enum is nowhere enforced
- **H-API3**: `/api/documents/upload-url` trusts `documentId` from body
  without ownership check → cross-tenant file overwrite in R2 keyspace
- **H-API4**: Astra chat IP resolution uses leftmost `x-forwarded-for`
  (spoofable) vs CLAUDE.md's 4-layer spec (cf-connecting-ip → x-real-ip
  → rightmost XFF). Same bug in supplier/[token], api-auth.ts. Audit
  logs and anomaly detection contaminated
- **H-API5**: `astra/chat` POST streaming trusts `conversationId`
  without ownership check — possible cross-user conversation leak via
  streamed response
- **H-API6**: `/api/public/widget/track` returns `Access-Control-Allow-
Origin: *` on error paths (missing widgetId, JSON parse fail)

### Data / Crypto (8)

- **H-D1**: `GeneratedDocument.content` + `rawContent` **plaintext**
  despite containing PII (names, addresses, incident descriptions)
- **H-D2**: `AstraMessage.content` + `toolCalls` + `toolResults`
  plaintext. `cleanupOldConversations(90)` exists but **not wired to
  cron** → conversations persist indefinitely
- **H-D3**: Astra `getConversationHistory`, `summarizeOlderMessages`,
  `shouldSummarize` have **no userId check** — IDOR if caller does not
  pre-gate with `getConversation`
- **H-D4**: R2 presigned download URL default TTL **1 hour**. No
  referrer binding, no one-time enforcement. Presigned upload has
  **no size condition** → 50MB client-side limit bypassable
- **H-D5**: Honey-token alert email interpolates `lastTriggeredIp`,
  `lastTriggeredUa`, `requestPath` in HTML without escape → stored XSS
  in security-team inbox
- **H-D6**: `lastTriggeredIp` / `lastTriggeredUa` stored without
  sanitisation → XSS sink if rendered anywhere
- **H-D7**: R2 object metadata stamps unencrypted `organizationId` →
  tenant mapping visible via `HeadObject` if bucket misconfigured
- **H-D8**: `isEncrypted` format check too weak → downgrade DoS (craft
  encrypted-looking string to force decrypt throw)

### Frontend (3)

- **H-F1**: Astra `insight.actionUrl` used unvalidated as
  `window.location.href` in `AstraMissionBriefing.tsx:334-336` —
  prompt-injection → `javascript:` scheme or external phishing redirect
- **H-F2**: CSP `script-src 'unsafe-inline'` (Next.js 15 limitation,
  acknowledged in code). Defeats XSS mitigations when any sink leaks
- **H-F3**: Stakeholder-token localStorage fallback (persistent +
  XSS-exfiltrable vs sessionStorage)

### Infra (3)

- **H-I1**: Dependabot config ignores **all** patch versions. Root
  cause of C11. Security patches blocked globally
- **H-I2**: Stripe webhook has **no idempotency** (no
  `ProcessedStripeEvent` dedup) + swallows handler errors with 200 OK
  → double subscription activation on retry, silent real failures
- **H-I3**: `typescript.ignoreBuildErrors: true` +
  `eslint.ignoreDuringBuilds: true` in Next config → no prod gate
- **H-I4**: `.github/workflows/ci.yml` hardcoded test-secrets in
  plaintext + GitHub Actions not SHA-pinned (tj-actions style supply
  chain risk)
- **H-I5**: No branch protection on `main` → direct push auto-deploys
  to prod via Vercel without review/CI gate

---

## 🟡 Medium (35)

### Auth (8)

- `User.role` as free string, not enum
- Inconsistent IP resolution across legal-auth / middleware / signup
- Unlock endpoint no rate-limit
- API-key rate-limit via DB count (DoS vector)
- Signup geo-lookup synchronous (blocks login on ip-api outage)
- MFA validate re-implements TOTP instead of using shared helper
- LoginEvent geo-lookup per request (latency spike under slow
  third-party)
- `updateSession` accepts client data for JWT update (theme only, but
  pattern is dangerous)

### API (7)

- Stripe webhook idempotency (= H-I2)
- Admin CRM AI feeds Claude unsanitized DB content (prompt injection
  into admin session)
- Astra tool-executor logs full user input verbatim (PII in logs)
- Webhooks `headers` map not blacklisted for `Host`/`Cookie`/
  `Authorization` → header smuggling
- Public `/v1/verity/passport/[id]` leaks operatorId + scoreBreakdown
  without rate-limit
- `generate2/package` accepts `language` without Zod
- `updates.ts` `category as any` (pattern may exist elsewhere post
  Atlas-C1 fix)

### Data / GDPR (14)

- Art. 17 delete does **not** delete R2 files → orphan PII blobs
- Art. 20 export **excludes** user's own Astra messages
- Audit "anonymisation" nulls `userId` but keeps description + values
  (email plaintext persists)
- `decryptFields` swallows errors silently (masks key rotation failure
  - tampering)
- Scrypt double-cost per-org key (DoS knob under cold cache burst)
- `verifyChain` error-on-DB-hiccup → false-positive tamper alert
- `computeHashForNewEntry` (deprecated) resolves org via "most recent
  membership" → cross-org log writes
- `checkForHoneyToken` likely full-table scan
- `AUTH_SECRET` min 32 chars (OWASP recommends 64)
- Signed-URL `ResponseContentDisposition` filename not escaped →
  filename masquerade
- SSRF validator for honey-token webhooks not verified
- HMAC signed payload excludes query string (GET params not protected)
- HMAC no replay-nonce → 5-min replay window
- `timingSafeCompare` fallback swallowed exception → debug hell

### Frontend (3)

- Handrolled markdown in blog / glossary / guides (DOMPurify backstop,
  OK while content is static; dangerous if DB/CMS-sourced)
- CSRF exempt list includes `/api/assessment/` (coupled with
  localStorage → cross-domain precondition)
- `img-src 'self' data: https:` too open for XSS exfiltration

### Infra (3)

- CSRF exempt "rate-limited instead" fragile (proxy-stripped Origin
  fails silent)
- Widget CORS `*` — check `/api/widget/config` tenant scoping
- `X-XSS-Protection: 1; mode=block` deprecated

---

## 🟢 Low / Info (19 samples)

- X-XSS-Protection legacy (consider removal)
- `legacy-peer-deps=true` weakens peer safety net
- Husky secret-grep hand-rolled, no local TruffleHog
- SessionCookie `sameSite:"lax"` (strict better, needs OAuth test)
- Backup codes 32-bit entropy (NIST ≥64 recommended)
- Impossible-travel NaN handling missing
- `BreachReport` model has no 72h-enforcement cron (Art. 33)
- `window.open(url, "_blank")` without `rel="noopener noreferrer"` in
  multiple places
- Supplier token in URL path (landed in history/logs; referrer policy
  mitigates cross-origin)
- Service worker / PWA not audited (none found)
- No production debug routes (+)
- Lockfile present + `npm ci` in CI (+)
- Sentry PII scrubbing aggressive (+)
- `poweredByHeader: false`, `hideSourceMaps: true` (+)
- `ci.yml` missing explicit `permissions:` → inherits default
- Raw SQL only via `Prisma.sql` template tag (+)
- Account-delete: CSRF + password + typed confirm (+)
- Widget uses Shadow DOM + `createElement` (+)
- CSRF double-submit + Origin + session-binding + constant-time (+)

---

## ✅ Strong Points (confirmed)

- CSRF double-submit + Origin check + session binding +
  constant-time compare
- NextAuth session cookie with `__Secure-` prefix, HttpOnly,
  `SameSite=Lax`
- API keys HMAC-SHA256 with `ENCRYPTION_KEY` (rainbow-table resistant)
- Passkey challenges HMAC-signed, stateless, 5-min TTL
- `LoginAttempt` per-email rate-limit defeats user enumeration
- Signup enumeration-safe return message
- Per-user MFA TOTP replay via Redis
- API-key rotation with 48h grace
- Unlock tokens stored SHA-256 hashed
- DOMPurify consistent on all HTML sinks
- Security headers complete (HSTS preload, XFO DENY, Permissions-Policy)
- Sentry PII scrubbing aggressive
- Robots.txt blocks AI crawlers (GPTBot, ClaudeBot, CCBot, anthropic-ai)
- Image `remotePatterns` whitelist-only (no wildcard)
- All 27 cron routes use `timingSafeEqual` on CRON_SECRET
- Account delete: CSRF + password + typed confirm
- Widget: Shadow DOM + `createElement` isolation

---

## 🎯 Recommended Remediation Order

| #   | Finding     | File / Effort                                       |
| --- | ----------- | --------------------------------------------------- |
| 1   | C10 + C11   | `npm update jspdf next` — one command               |
| 2   | C1          | PrismaAdapter re-enabled + OAuth link-check         |
| 3   | C2          | MFA auto-heal disabled, force logout                |
| 4   | H-I1        | Remove dependabot patch-ignore                      |
| 5   | H-I2        | Stripe webhook `ProcessedStripeEvent` table         |
| 6   | C3          | Verity `operatorId` unification + role gate         |
| 7   | H-D1 + H-D2 | Encrypt GeneratedDocument + AstraMessage, wire cron |
| 8   | C8          | Audit chain external anchor                         |
| 9   | H-F1        | Astra `actionUrl` URL validator                     |
| 10  | C7          | Per-tenant KEK via KMS (architecture, last)         |

C4 (Atlas auth gate) remains a product decision.

---

_Audit ran on commit `d19a1f52` (2026-04-19). Subsequent fixes will be
tracked in git history and referenced by finding ID in commit messages._
