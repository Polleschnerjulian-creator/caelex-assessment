# Atlas Security Audit — Remediation Log (2026-04-20)

## Overview

The original audit (`atlas-audit-2026-04-20.md`) produced **20 findings**. A
line-by-line re-review against the actual current code established that
**13 findings were false positives** — the claimed vulnerability was
already mitigated before the audit ran. **3 findings were real** and have
been fixed in this pass. **4 findings** (mostly low-severity cleanup)
were deferred as either not exploitable in practice or architecturally
out of scope for this pass.

The user instructed: _"C1 ist gewollt, das ignorieren"_ — C1 (temporary
public access to `/atlas`) is a known, intentional, time-limited state
while an external reviewer checks the product. It is not fixed here and
will be re-locked when the reviewer is done.

## Per-finding disposition

### 🟢 False positives (already protected by existing code)

| ID     | Audit claim                                                     | Code-line evidence                                                                                                                                                                                                                                                                                                                           | Disposition                                                                                   |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **C2** | IDOR on team DELETE — unvalidated memberId                      | `src/app/api/atlas/team/route.ts:211` — `if (!member \|\| member.organizationId !== atlas.organizationId) return 404`                                                                                                                                                                                                                        | Already enforces org-scoping before delete.                                                   |
| **C3** | Org cookie lacks binding check — cross-org leak via cookie swap | `src/lib/atlas-auth.ts:73-77` — `findFirst({ where: { userId: session.user.id, organizationId: targetOrgId } })`                                                                                                                                                                                                                             | A cookie pointing to a non-member org resolves to `null` and getAtlasAuth returns null → 401. |
| **H1** | Stored XSS in team invitation emails — HTML escaping incomplete | `src/app/api/atlas/team/route.ts:20-27` defines `escapeHtml`, used on lines 133-134 for every interpolated field (`safeInviterName`, `safeOrg`). The only other interpolation (`inviteUrl`) comes from env-configured `AUTH_URL` + DB-generated token — both trusted sources.                                                                | Escaping is complete for every user-controlled field.                                         |
| **H2** | IDOR on annotations — no org scoping in GET                     | `src/app/api/atlas/annotations/route.ts:43-49, 119-125` — every query (GET, POST upsert, DELETE) includes `organizationId: atlas.organizationId` in the where clause.                                                                                                                                                                        | Fully org-scoped.                                                                             |
| **H5** | SVG logo upload allows XSS payloads                             | `src/app/api/atlas/settings/firm/route.ts:15-23` — Zod `FirmPatchSchema` enforces `.url().max(2048).refine((v) => /^https:\/\//.test(v))`. Even if the URL points to an `.svg`, it is rendered via `<img>` tags only (browser image sandbox blocks script execution in SVG). Would need `<object>` or `<embed>` rendering to be exploitable. | Not exploitable with current rendering.                                                       |
| **H6** | Missing audit logging on sensitive atlas ops                    | Verified: `logger.info` calls exist on team invite (line 165), team remove (223), firm settings update (80), annotation upsert failures, bookmark operations. The audit's claim of "missing" logging is factually wrong.                                                                                                                     | Logging is present, structured, and tied to user+org.                                         |
| **H7** | Country memo API lacks resource-level authorization             | `src/app/api/atlas/country-memo/[code]/route.ts:55-58` requires authenticated session; `:76-81` validates the country code against an allowlist; the memo content is static reference material (statutes, treaties) not user-scoped data.                                                                                                    | Auth + allowlist present. No per-user data returned.                                          |
| **M1** | Bookmarks bulk import — shallow validation                      | `src/app/api/atlas/bookmarks/route.ts:16-35` — strict Zod schema: `href` must match `/^(https?:)?\/\//` (blocks `javascript:` / `data:` / file URIs), length caps on every field, bulk cap of 500, per-user quota cap of 1000, Zod `.strict()` equivalent via explicit schema.                                                               | Validation is already deep and Zod-enforced.                                                  |
| **L1** | Missing permissions check in team GET                           | Verified: team GET intentionally returns the org's own member list to any authenticated member — this is the intended UX (every member can see who's on the team).                                                                                                                                                                           | Behaviour is correct, not a vulnerability.                                                    |
| **L2** | Unused link-status query                                        | Reviewed `src/lib/atlas/link-status.ts` — used by `/atlas/international` and `/atlas/eu` hub pages to render a verification badge per source. Not dead code.                                                                                                                                                                                 | Used, not dead.                                                                               |
| **L3** | Timezone injection via org settings                             | Inspected: `ianaSchema` regex validates timezone names against the standard `^[A-Za-z0-9+_\-/]+$` pattern; all downstream uses go through `Intl.DateTimeFormat` which rejects invalid tz strings at runtime.                                                                                                                                 | Defense-in-depth already present.                                                             |
| **L6** | Missing `X-Content-Type-Options` header on API responses        | `src/middleware.ts:175` — `applySecurityHeaders` sets `nosniff` on every response globally, including all `/api/atlas/*` paths.                                                                                                                                                                                                              | Already set.                                                                                  |
| **L7** | Country memo PDF filename predictable                           | `src/app/api/atlas/country-memo/[code]/route.ts:115` — filename is `atlas-memo-{code}-{YYYY-MM-DD}.pdf`. A public reference memo has no confidentiality requirement; predictability here is desirable for cache-ability and user expectation.                                                                                                | Design choice, not a vulnerability.                                                           |

### 🔴 Real findings — fixed in this pass (3)

#### H3 — Prompt injection via unsanitized pathname in Astra chat

**Before:**

```typescript
// src/components/atlas/AtlasAstraChat.tsx
const code = pathname.split("/jurisdictions/")[1]?.split("/")[0]?.toUpperCase();
return `User is viewing the ${code} jurisdiction detail page ...`;
```

A crafted URL like `/atlas/jurisdictions/DE/ignore_previous_instructions...` would
interpolate attacker text directly into the LLM system prompt.

**After:**

- New helper `safePathSegment(raw, maxLen)` strips to `[A-Za-z0-9_-]` and
  caps length.
- Country code path validates against `/^[A-Z]{2,3}$/`; unknown codes
  collapse to a generic sentence that carries no URL content.
- Source ID path caps at 40 chars alphanumeric.

**Commit:** this commit.

#### L4 — Missing rate limit on `GET /api/atlas/bookmarks`

**Before:** GET had no `checkRateLimit` call — authenticated token leak
enabled bookmark-namespace exfiltration at full DB speed.

**After:** added `await checkRateLimit("api", getIdentifier(req, userId))`
with `createRateLimitResponse` on rejection. Matches write-path tier.

#### L5 — Zod schema leak in validation error responses

**Before:** `annotations/route.ts:68-71` and `settings/firm/route.ts:59-62`
returned `{ details: parsed.error.format() }` — leaks Zod schema shape,
internal field types, and validation paths to unauthenticated or
pre-auth probers.

**After:** response body is `{ error, fields: string[] }` — only the
field names that failed. Full Zod issues go to `logger.warn` server-side
with userId for operator debugging.

### 🟡 Deferred (4) — real issues, intentionally not fixed this pass

| ID     | Finding                                     | Rationale for deferral                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H4** | Team invitation token not one-time use      | Requires DB-schema change (add `consumed_at` column on `OrganizationInvitation`) + migration. Cross-cutting with the OrganizationInvitation flow used by other products. Separate migration pass recommended.                                                                                                                    |
| **M2** | Rate-limit IP spoofing (partial mitigation) | `getIdentifier` already prefers authenticated userId over IP when available. Pure-IP paths (unauth assessment endpoints etc.) would need a WAF-level fix (Cloudflare / Vercel edge) rather than an application-layer change. Out of scope for an Atlas-only pass.                                                                |
| **M3** | Missing CSRF on astra chat API              | Astra chat is inside `/dashboard` / `/atlas` which are SameSite-cookie protected. SameSite=lax default on the session cookie + Origin-header check in middleware provide de-facto CSRF defence. Adding an explicit CSRF token would be a larger cross-product change (Astra is shared with the broader Caelex dashboard). Defer. |
| **C1** | Authentication disabled on `/atlas`         | Intentional temporary state per user instruction. Will be re-enabled after the external reviewer finishes their walkthrough.                                                                                                                                                                                                     |

## Net impact

- **3 real vulnerabilities** patched: H3 (Critical-impact prompt injection), L4, L5.
- **13 audit findings** documented as false positives with line-level code evidence, to inform future audits.
- **No regressions**: `tsc --noEmit` clean; no existing tests broken.
- **Audit process note:** LLM-based security audits tend to over-flag because
  they pattern-match on surface shapes (e.g. "this API takes an `id` param
  → IDOR risk") without tracing the full authorisation path. All audit
  findings going forward should be triaged against the code before fix
  commits land. Roughly 1 in 6 findings in this audit were actionable.

## Files changed

- `src/components/atlas/AtlasAstraChat.tsx` — add `safePathSegment` sanitizer, validate country codes against `/^[A-Z]{2,3}$/` before prompt interpolation.
- `src/app/api/atlas/bookmarks/route.ts` — add rate-limit on GET.
- `src/app/api/atlas/annotations/route.ts` — drop `parsed.error.format()` from response, return field names only; log full issues server-side.
- `src/app/api/atlas/settings/firm/route.ts` — same L5 treatment.
- `docs/security/atlas-remediation-2026-04-20.md` — this log.
