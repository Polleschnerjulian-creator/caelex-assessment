# Caelex Security Remediation Log — 2026-04-19

Companion to `full-audit-2026-04-19.md`. Tracks what was fixed in this
session, what remains, and what requires manual operator action.

## ✅ Closed (27 findings)

### Critical (10 of 11)

| ID  | Commit     | Summary                                                             |
| --- | ---------- | ------------------------------------------------------------------- |
| C1  | `e66c59af` | OAuth takeover hardening: email_verified + credentials-user block   |
| C2  | `f60ac899` | MFA auto-heal bypass removed; forces re-login + audit event         |
| C3  | `56d7566b` | Verity operatorId unified to orgId + role gate on revoke/visibility |
| C4  | `f60ac899` | Cron POST surface removed on data-retention-cleanup                 |
| C5  | `f60ac899` | `requirePlatformAdmin()` re-queries DB instead of trusting JWT      |
| C6  | `814892ca` | Organization billingAddress → strict typed schema                   |
| C8  | `4f98e1a2` | Audit-chain no-null policy + first-failure SecurityEvent            |
| C9  | `f60ac899` | `seed-admin.ts` requires ADMIN_EMAILS env, no hardcoded defaults    |
| C10 | `f60ac899` | `jspdf ^4.1.0 → ^4.2.1` (CVSS 8.1 fix)                              |
| C11 | `f60ac899` | `next ^15.5.12 → ^15.5.15` (GHSA-q4gf, ghsa-ggv3, ghsa-3x4c)        |

**Remaining**: C7 (per-tenant KEK via KMS — requires external cost
decision, deferred).

### High (17 of 17 code-fixable)

| ID     | Commit     | Summary                                                        |
| ------ | ---------- | -------------------------------------------------------------- |
| H-A2   | `f60ac899` | MFA per-user fail counter + 15-min lock at 5 fails             |
| H-A5   | `677a8c36` | change-password timing oracle removed                          |
| H-API1 | `443af288` | Supplier lcaData strict schema + bounded additionalFields      |
| H-API2 | `038543d4` | Document download enforces AccessLevel + role                  |
| H-API3 | `038543d4` | Upload-URL ownership check before presign                      |
| H-API4 | `814892ca` | Astra/supplier/api-auth use shared 4-layer IP resolver         |
| H-API5 | `f82aa0d0` | Astra chat verifies conversationId ownership                   |
| H-API6 | `443af288` | Widget /track CORS no-wildcard on error paths                  |
| H-D1   | `a624e7b5` | GeneratedDocument.rawContent in ENCRYPTED_FIELDS               |
| H-D2   | `a624e7b5` | AstraMessage.content encrypted + daily cleanup cron            |
| H-D3   | `f82aa0d0` | Astra conversation-manager functions require userId param      |
| H-D4   | `038543d4` | R2 presigned URL TTL 3600s → 300s                              |
| H-D5   | `814892ca` | Honey-token alert email HTML-escapes all interpolations        |
| H-D6   | `814892ca` | Honey-token persisted IP/UA sanitised + length-capped          |
| H-D7   | `677a8c36` | R2 metadata stamps sha256(orgId) hash, not raw id              |
| H-D8   | `677a8c36` | `isEncrypted()` strict hex + tag-length check                  |
| H-F1   | `f60ac899` | Astra actionUrl validator (isSafeInternalUrl)                  |
| H-F3   | `677a8c36` | Stakeholder localStorage fallback removed                      |
| H-I1   | `f60ac899` | Dependabot patch-ignore rule removed                           |
| H-I2   | `023c5536` | Stripe webhook idempotency + real 500 on handler error         |
| H-I3   | `7f0484e0` | next.config CI=true flips ignoreBuildErrors/ignoreDuringBuilds |

## 🟡 Manual Operator Tasks (require GitHub UI / branch protection)

These can't be pushed via git token without the `workflow` scope, and
in some cases involve GitHub repo settings directly.

### H-I4 — GitHub Actions SHA pinning

**Action**: Edit `.github/workflows/ci.yml` + `.github/workflows/security.yml`
directly in the GitHub web UI (or via a PAT with `workflow` scope).

Replace:

- `trufflesecurity/trufflehog@main` → `trufflesecurity/trufflehog@907ff29ad74bf9e2cc19b85ad0f96b3e3b62d11b # v3.90.8`
- `treosh/lighthouse-ci-action@v12` → `treosh/lighthouse-ci-action@1b0d7b5d8c7bff16cb7b4359e1651cf20a80ca1f # v12`

Rationale: mitigates tj-actions-class tag-hijack supply-chain attacks.

### H-I5 — Branch protection on `main`

**Action**: GitHub Settings → Branches → add protection rule for `main`:

- Require a pull request before merging
- Require status checks: `lint-typecheck`, `test`, `e2e`, `security-audit`
- Require branches to be up to date
- Do not allow force-pushes
- Include administrators

Without this, a direct push to main auto-deploys to Vercel without
review. Can't be automated from code.

## 🔴 Deferred (architecture / product decisions)

| ID         | Reason                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| C7         | Per-tenant KEK via KMS — external cost (AWS KMS / Ionos HSM). Needs product budget sign-off. |
| C4 (atlas) | Atlas auth-gate split — SEO vs access-control product decision.                              |

## 🟡 Deferred (larger refactors — next session)

- **H-A1**: TOTP window+replay documentation (doc-only)
- **H-A3**: Passkey `expectedUserId` flow refactor
- **H-A4**: `getCurrentOrganization` active-org cookie switcher (needs UI)
- **H-F2**: CSP `unsafe-inline` removal (waits for Next.js 16 nonce propagation)

## Summary

- **Critical findings**: 10 / 11 fixed (C7 architecture-deferred)
- **High findings**: 21 / 25 fixed (4 deferred to separate work items)
- **Remaining in code**: 35 mediums + 19 low/info → planned for follow-up batches
- **Zero external cost** across all shipped fixes.
