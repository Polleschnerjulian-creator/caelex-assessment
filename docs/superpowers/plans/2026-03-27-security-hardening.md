# Security Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix middleware rate limit null-return, add encryption key TTL, and add streaming timeout to Astra AI.

**Architecture:** 3 independent changes on 3 separate files. No new dependencies.

**Tech Stack:** Next.js 15, Upstash Redis, Anthropic SDK

**Spec:** `docs/superpowers/specs/2026-03-27-security-hardening-design.md`

**Note:** API replay protection (originally planned) was found to ALREADY be implemented in `src/lib/hmac-signing.server.ts` with timestamp validation. Removed from plan.

---

## File Structure

| Action | File                      | Responsibility                   |
| ------ | ------------------------- | -------------------------------- |
| Modify | `src/middleware.ts`       | Fix rate limiter null return     |
| Modify | `src/lib/encryption.ts`   | Add TTL to key cache             |
| Modify | `src/lib/astra/engine.ts` | Add streaming inactivity timeout |

---

### Task 1: Fix middleware rate limiter null return

**Files:**

- Modify: `src/middleware.ts`

- [ ] **Step 1: Read the middleware file to find the rate limiter initialization**

Read `src/middleware.ts` and find the function that returns `null` when Redis is unavailable. This is likely `getApiRateLimiter()` or similar. The existing `checkRateLimit()` in `ratelimit.ts` already has an in-memory fallback — the problem is specifically in middleware.ts which has its OWN separate rate limiter instance.

- [ ] **Step 2: Replace null return with in-memory fallback**

Find the rate limiter initialization in middleware.ts. Where it returns `null`, replace with an in-memory fallback using the existing `InMemoryRateLimiter` pattern from `ratelimit.ts`, or import `checkRateLimit` from `ratelimit.ts` which already handles the fallback.

The simplest fix: if middleware creates its own Ratelimit instance, replace the null path with importing `checkRateLimit` from `@/lib/ratelimit` which already handles Redis unavailability gracefully.

If that's not possible due to middleware edge runtime constraints, create a minimal in-memory limiter inline:

```typescript
// Fallback when Redis not configured
const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean } {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    inMemoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  bucket.count++;
  return { success: bucket.count <= max };
}
```

IMPORTANT: Read the actual middleware.ts first to understand the exact pattern being used. The fix should be minimal — just ensure no code path returns null for the rate limiter.

- [ ] **Step 3: Verify the middleware still works**

```bash
npx vitest run src/middleware.test.ts 2>&1 | tail -10
```

Note: Some middleware tests may already be failing (pre-existing). Only check that we don't introduce NEW failures.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts && git commit -m "fix(security): add in-memory rate limit fallback in middleware when Redis unavailable"
```

---

### Task 2: Add encryption key cache TTL

**Files:**

- Modify: `src/lib/encryption.ts`

- [ ] **Step 1: Read the encryption file to understand current caching**

Read `src/lib/encryption.ts` lines 45-90. Key points:

- Line 51: `let cachedKey: Buffer | null = null` — cached forever
- Lines 54-55: `orgKeyCache = new Map<string, { key: Buffer; lastUsed: number }>()` — LRU but no TTL

- [ ] **Step 2: Add TTL to master key cache**

Replace line 51:

```typescript
// Before:
let cachedKey: Buffer | null = null;

// After:
const KEY_CACHE_TTL_MS = 3600000; // 1 hour
let cachedKey: { key: Buffer; expiresAt: number } | null = null;
```

Update `getKey()` function — replace the cache check:

```typescript
// Before:
if (cachedKey) {
  return cachedKey;
}

// After:
if (cachedKey && Date.now() < cachedKey.expiresAt) {
  return cachedKey.key;
}
```

Update where the key is cached:

```typescript
// Before:
cachedKey = derivedKey;
return cachedKey;

// After:
cachedKey = { key: derivedKey, expiresAt: Date.now() + KEY_CACHE_TTL_MS };
return derivedKey;
```

- [ ] **Step 3: Add TTL to org key cache**

Update the org key cache type and lookup:

```typescript
// Before (line 54):
const orgKeyCache = new Map<string, { key: Buffer; lastUsed: number }>();

// After:
const orgKeyCache = new Map<
  string,
  { key: Buffer; lastUsed: number; expiresAt: number }
>();
```

When getting org key, check TTL:

```typescript
const cached = orgKeyCache.get(cacheKey);
if (cached && Date.now() < cached.expiresAt) {
  cached.lastUsed = Date.now();
  return cached.key;
}
```

When setting org key:

```typescript
orgKeyCache.set(cacheKey, {
  key: orgKey,
  lastUsed: Date.now(),
  expiresAt: Date.now() + KEY_CACHE_TTL_MS,
});
```

- [ ] **Step 4: Run encryption tests**

```bash
npx vitest run tests/unit/lib/encryption.test.ts 2>&1 | tail -10
```

Expected: ALL PASS (behavior unchanged for non-expired keys)

- [ ] **Step 5: Commit**

```bash
git add src/lib/encryption.ts && git commit -m "fix(security): add 1-hour TTL to encryption key cache"
```

---

### Task 3: Add Astra streaming inactivity timeout

**Files:**

- Modify: `src/lib/astra/engine.ts`

- [ ] **Step 1: Read the streaming method**

Read `src/lib/astra/engine.ts` lines 318-412. The `callAnthropicWithToolLoopStreaming` method has:

- `stream.on("text", (text) => { onTextChunk(text); })` — text chunk handler
- `const response = await stream.finalMessage()` — waits for completion
- No timeout mechanism

- [ ] **Step 2: Add inactivity timeout constant**

Near the top of the file where other constants are defined (near `MAX_TOOL_ITERATIONS`, `MAX_TOKENS`), add:

```typescript
const STREAM_INACTIVITY_TIMEOUT_MS = 30000; // 30 seconds
```

- [ ] **Step 3: Wrap stream consumption with timeout**

In the `callAnthropicWithToolLoopStreaming` method, after the `stream` is created and before `stream.finalMessage()`, add timeout logic:

```typescript
const stream = client.messages.stream({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  system: systemPrompt,
  messages: messages as Anthropic.MessageParam[],
  tools: ALL_TOOLS as Anthropic.Tool[],
  temperature: 0.7,
});

// Inactivity timeout — abort if no data received for 30 seconds
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    stream.abort();
  }, STREAM_INACTIVITY_TIMEOUT_MS);
};

// Start the timer
resetInactivityTimer();

// Forward text chunks in real-time and reset timer on each chunk
stream.on("text", (text) => {
  resetInactivityTimer();
  onTextChunk(text);
});

try {
  const response = await stream.finalMessage();
  // Clear timer on successful completion
  if (inactivityTimer) clearTimeout(inactivityTimer);
  // ... rest of existing logic
} catch (error) {
  if (inactivityTimer) clearTimeout(inactivityTimer);

  // Check if this was our timeout abort
  if (error instanceof Error && error.message.includes("abort")) {
    console.warn("ASTRA: Stream aborted due to inactivity timeout");
    return {
      responseText:
        "The AI response timed out. Please try again with a simpler question.",
      toolCalls: allToolCalls,
      tokensUsed: totalTokens,
    };
  }
  throw error;
}
```

IMPORTANT: Read the actual file first. The `stream.abort()` method name may differ — check the Anthropic SDK for the correct abort method. It might be `stream.controller.abort()` or similar.

- [ ] **Step 4: Run Astra tests**

```bash
npx vitest run src/lib/astra/engine.test.ts 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/astra/engine.ts && git commit -m "fix(security): add 30s inactivity timeout to Astra AI streaming"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run relevant tests**

```bash
npx vitest run src/middleware.test.ts tests/unit/lib/encryption.test.ts src/lib/astra/engine.test.ts 2>&1 | tail -10
```

- [ ] **Step 2: TypeScript check on changed files**

```bash
npx tsc --noEmit 2>&1 | grep -E "(middleware|encryption|astra/engine)" | head -10
```

Expected: No new errors in our changed files.
