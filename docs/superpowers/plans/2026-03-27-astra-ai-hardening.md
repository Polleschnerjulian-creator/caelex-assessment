# Astra AI Engine Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversation size limits and topic-specific context filtering to reduce DB load and prevent unbounded memory growth.

**Architecture:** 2 independent changes on 2 files. Conversation manager gets a hard limit; context builder conditionally skips irrelevant DB queries based on detected topic.

**Tech Stack:** Next.js 15, Prisma, Anthropic SDK

**Spec:** `docs/superpowers/specs/2026-03-27-astra-ai-hardening-design.md`

---

## File Structure

| Action | File                                    | Responsibility                                       |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| Modify | `src/lib/astra/conversation-manager.ts` | Add MAX_TOTAL_MESSAGES, lower summarize threshold    |
| Modify | `src/lib/astra/context-builder.ts`      | Pass topics to buildUserContext, conditional queries |

---

### Task 1: Conversation size limits

**Files:**

- Modify: `src/lib/astra/conversation-manager.ts`

- [ ] **Step 1: Read the file and update constants**

In `src/lib/astra/conversation-manager.ts`, find the constants (around line 20-24):

```typescript
// Current:
const MAX_MESSAGES_IN_CONTEXT = 10;
const SUMMARIZE_THRESHOLD = 15;
const MAX_MESSAGE_LENGTH = 10000;
```

Change to:

```typescript
const MAX_MESSAGES_IN_CONTEXT = 10;
const SUMMARIZE_THRESHOLD = 10; // Was 15 — more aggressive summarization
const MAX_MESSAGE_LENGTH = 10000;
const MAX_TOTAL_MESSAGES = 200; // Hard limit per conversation
```

- [ ] **Step 2: Add size check in addMessage**

In the `addMessage` function (around line 101), BEFORE the message is created in the DB, add a size check:

```typescript
// Add at the start of addMessage, after any parameter validation:
const messageCount = await prisma.astraMessage.count({
  where: { conversationId },
});

if (messageCount >= MAX_TOTAL_MESSAGES) {
  // Force summarization to make room
  await summarizeConversation(conversationId);

  // Re-check after summarization
  const newCount = await prisma.astraMessage.count({
    where: { conversationId },
  });
  if (newCount >= MAX_TOTAL_MESSAGES) {
    // If still at limit after summarization, something is wrong
    // Log warning but allow the message (don't block the user)
    console.warn(
      `ASTRA: Conversation ${conversationId} at ${newCount} messages even after forced summarization`,
    );
  }
}
```

IMPORTANT: Read the file first to find the exact location in `addMessage` where this check should go. It should be BEFORE the `prisma.astraMessage.create()` call.

Also make sure `summarizeConversation` is the correct function name — it might be called differently.

- [ ] **Step 3: Update shouldSummarize threshold**

The `shouldSummarize` function (around line 215) already compares against `SUMMARIZE_THRESHOLD`. Since we changed the constant from 15 to 10, this automatically triggers earlier. No code change needed here — just the constant change from Step 1.

- [ ] **Step 4: Run Astra tests**

```bash
npx vitest run src/lib/astra/ 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/astra/conversation-manager.ts && git commit -m "fix(astra): add 200-message hard limit + lower summarize threshold to 10"
```

---

### Task 2: Topic-specific context filtering

**Files:**

- Modify: `src/lib/astra/context-builder.ts`

- [ ] **Step 1: Read the file and understand buildUserContext**

Read `src/lib/astra/context-builder.ts` lines 184-342. The function `buildUserContext` runs 4 assessment queries in `Promise.all` (around lines 213-244):

- `debrisAssessment.findFirst`
- `cybersecurityAssessment.findFirst`
- `insuranceAssessment.findFirst`
- `nIS2Assessment.findFirst`

These are ALWAYS executed regardless of topic.

- [ ] **Step 2: Add topics parameter to buildUserContext**

Change the function signature:

```typescript
// Before:
async function buildUserContext(
  userId: string,
  organizationId: string,
): Promise<AstraUserContext>;

// After:
async function buildUserContext(
  userId: string,
  organizationId: string,
  topics: string[] = [],
): Promise<AstraUserContext>;
```

- [ ] **Step 3: Make assessment queries conditional**

Replace the `Promise.all` block with topic-conditional queries:

```typescript
const isGeneral = topics.includes("general") || topics.length === 0;

// Always load org data (needed for all responses)
const orgData = await prisma.organization.findUnique({ ... }); // Keep existing query

// Conditionally load assessments based on topic
const needsDebris = isGeneral || topics.includes("debris");
const needsCyber = isGeneral || topics.includes("cybersecurity") || topics.includes("nis2");
const needsInsurance = isGeneral || topics.includes("insurance");
const needsNis2 = isGeneral || topics.includes("nis2") || topics.includes("cybersecurity");

const [debrisAssessment, cybersecurityAssessment, insuranceAssessment, nis2Assessment] =
  await Promise.all([
    needsDebris
      ? prisma.debrisAssessment.findFirst({ ... })  // Keep existing query
      : Promise.resolve(null),
    needsCyber
      ? prisma.cybersecurityAssessment.findFirst({ ... })  // Keep existing query
      : Promise.resolve(null),
    needsInsurance
      ? prisma.insuranceAssessment.findFirst({ ... })  // Keep existing query
      : Promise.resolve(null),
    needsNis2
      ? prisma.nIS2Assessment.findFirst({ ... })  // Keep existing query
      : Promise.resolve(null),
  ]);
```

IMPORTANT: Keep the existing query shapes exactly as they are. Only wrap them in the conditional. Copy the exact `where`, `select`, `orderBy` from the existing queries.

- [ ] **Step 4: Update buildCompleteContext to pass topics**

In `buildCompleteContext` (around line 504), topics are already detected. Pass them to `buildUserContext`:

```typescript
// Before:
const userContext = await buildUserContext(userId, organizationId);
const topics = detectTopics(message);

// After:
const topics = detectTopics(message); // Detect FIRST
const userContext = await buildUserContext(userId, organizationId, topics); // Pass topics
```

- [ ] **Step 5: Run Astra tests**

```bash
npx vitest run src/lib/astra/ 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/astra/context-builder.ts && git commit -m "perf(astra): topic-specific context filtering — skip irrelevant DB queries"
```
