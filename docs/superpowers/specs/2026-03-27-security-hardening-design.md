# Security Hardening — Design Spec

**Date:** 2026-03-27
**Scope:** Rate limit fallback, encryption key TTL, API replay protection, Astra streaming timeout
**Constraint:** No external costs, no new dependencies

---

## Problem Statement

Four security gaps: (1) Rate limiting returns null when Redis unavailable, leaving API unprotected. (2) Encryption master key cached forever with no expiration. (3) API HMAC signatures lack timestamps, enabling replay attacks. (4) Astra AI streaming has no timeout, clients hang indefinitely if Anthropic API stalls.

---

## Section 1: Rate Limit In-Memory Fallback

**File:** `src/middleware.ts` (and possibly `src/lib/ratelimit.ts`)

When Redis is not configured, `getApiRateLimiter()` currently returns `null`. Replace with an in-memory fallback.

**In-memory rate limiter:**

- `Map<string, { count: number; resetAt: number }>` keyed by IP
- Same interface as Upstash: `limit(key)` → `{ success: boolean; remaining: number }`
- Limits at ~50% of Redis limits (conservative for single-instance in-memory)
- Automatic cleanup of expired buckets on each `limit()` call (every 100th call to avoid overhead)
- Warning log on first use: `"[SECURITY] Using in-memory rate limiting — Redis not configured"`

**No null returns.** Every code path gets a rate limiter.

---

## Section 2: Encryption Key Cache TTL

**File:** `src/lib/encryption.ts`

Add TTL to the master key cache:

- `cachedKey` becomes `{ key: Buffer; expiresAt: number }`
- TTL: 1 hour (3,600,000 ms)
- On access: check `Date.now() < expiresAt`, re-derive if expired
- Org-key cache: add same TTL pattern (1 hour per org key entry)
- No behavior change — same encryption/decryption, just periodic re-derivation

---

## Section 3: API Replay Protection

**File:** `src/lib/api-auth.ts`

Add timestamp-based replay protection to HMAC signature verification:

- New header: `X-Timestamp` containing Unix milliseconds
- Max skew: 5 minutes (300,000 ms)
- Timestamp included in HMAC: `${method}:${path}:${timestamp}:${body || ""}`
- **Backward compatible:** If `X-Timestamp` header is missing, log warning but accept request (migration period). Once all clients send timestamps, this can be made mandatory.

---

## Section 4: Astra Streaming Timeout

**File:** `src/lib/astra/engine.ts`

Add inactivity timeout to streaming responses:

- Timeout: 30 seconds of no data received
- Each text chunk resets the timer
- On timeout: abort stream, return error response to client
- Not a hard total-duration timeout (long responses are fine as long as data flows)
- Constant: `STREAM_INACTIVITY_TIMEOUT_MS = 30000`

---

## Files Changed

| Action | File                                          |
| ------ | --------------------------------------------- |
| Modify | `src/middleware.ts` or `src/lib/ratelimit.ts` |
| Modify | `src/lib/encryption.ts`                       |
| Modify | `src/lib/api-auth.ts`                         |
| Modify | `src/lib/astra/engine.ts`                     |

## What This Does NOT Cover

- Astra AI conversation limits (Zyklus C)
- Bundle splitting / accessibility (Zyklus D)
