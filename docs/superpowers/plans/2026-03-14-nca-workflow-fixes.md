# NCA Workflow Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and high-priority bugs in the NCA submission workflow identified in the analysis report.

**Architecture:** Seven targeted fixes to existing files — no new models, no new pages. Fixes the status transition map, adds the missing cron entry, wires Generate 2.0 into package assembly, adds correspondence API routes, auto-calculates SLA deadlines, and fixes the reportId placeholder.

**Tech Stack:** Next.js API routes, Prisma ORM, TypeScript

---

## Task 1: Fix Status Transition Map (P0 — CRITICAL)

**Files:**

- Modify: `src/app/api/nca/submissions/[id]/route.ts:26-35`

- [ ] **Step 1: Fix the transition map to match Prisma enum values**

Replace lines 26-35:

```typescript
const ALLOWED_NCA_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: [
    "RECEIVED",
    "ACKNOWLEDGED",
    "UNDER_REVIEW",
    "REJECTED",
    "WITHDRAWN",
  ],
  RECEIVED: ["UNDER_REVIEW", "ACKNOWLEDGED", "REJECTED"],
  ACKNOWLEDGED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "INFORMATION_REQUESTED"],
  INFORMATION_REQUESTED: ["SUBMITTED", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
  WITHDRAWN: [],
};
```

- [ ] **Step 2: Commit**

```
fix(nca): align status transition map with Prisma NCASubmissionStatus enum
```

---

## Task 2: Add NCA Deadlines Cron to vercel.json (P0 — CRITICAL)

**Files:**

- Modify: `vercel.json:92` (before closing bracket of crons array)

- [ ] **Step 1: Add the cron entry**

Add after the last cron entry (ca-digest):

```json
{
  "path": "/api/cron/nca-deadlines",
  "schedule": "0 7 * * *"
}
```

- [ ] **Step 2: Commit**

```
fix(nca): add nca-deadlines cron to vercel.json for production scheduling
```

---

## Task 3: Integrate Generate 2.0 Documents into Package Assembly (P1)

**Files:**

- Modify: `src/lib/services/nca-portal-service.ts:370-421` (the Promise.all block)

- [ ] **Step 1: Add NCADocument query to the parallel fetch**

Add `nCADocuments` as an 8th query inside the `Promise.all`:

```typescript
prisma.nCADocument.findMany({
  where: { organizationId, status: "COMPLETED" },
  select: { id: true, title: true, documentType: true },
  orderBy: { updatedAt: "desc" },
}),
```

- [ ] **Step 2: Map NCADocuments into the document list**

After the generated documents mapping block, add a block that maps NCADocuments into the `documents` array with `sourceType: "generated_v2"`.

- [ ] **Step 3: Commit**

```
feat(nca): include Generate 2.0 NCADocument records in package assembly
```

---

## Task 4: Make reportId Optional for Package-Based Submissions (P1)

**Files:**

- Modify: `prisma/schema.prisma:2260` — make reportId optional
- Modify: `src/lib/services/nca-portal-service.ts:600-650` — handle optional reportId
- Modify: `src/app/dashboard/nca-portal/packages/new/page.tsx:150-158` — remove placeholder

- [ ] **Step 1: Make reportId optional in Prisma schema**

Change line 2260 from:

```prisma
reportId String
report   SupervisionReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
```

to:

```prisma
reportId String?
report   SupervisionReport? @relation(fields: [reportId], references: [id], onDelete: Cascade)
```

- [ ] **Step 2: Run prisma db push**

```bash
npx prisma db push --skip-generate && npx prisma generate
```

- [ ] **Step 3: Update submitPackage() to not require reportId**

In `nca-portal-service.ts`, change `reportId: input.reportId` to `reportId: input.reportId || null`.

- [ ] **Step 4: Remove placeholder from package builder page**

In `packages/new/page.tsx`, remove the `reportId: "portal-submission"` line from the submit body.

- [ ] **Step 5: Commit**

```
fix(nca): make reportId optional for package-based submissions
```

---

## Task 5: Auto-Calculate SLA Deadline on Submission (P1)

**Files:**

- Modify: `src/lib/services/nca-submission-service.ts:201-233`
- Modify: `src/lib/services/nca-portal-service.ts:629-650`

- [ ] **Step 1: Add SLA days to NCA_AUTHORITY_INFO**

Add an `expectedResponseDays` field to each authority entry in `NCA_AUTHORITY_INFO`. Default 90 days, shorter for specific NCAs (FR_CNES: 60, EUSPA: 120).

- [ ] **Step 2: Set slaDeadline in submitToNCA()**

After line 223 (`submittedAt: new Date()`), add:

```typescript
slaDeadline: new Date(Date.now() + (ncaInfo.expectedResponseDays || 90) * 86400000),
estimatedResponseDate: new Date(Date.now() + (ncaInfo.expectedResponseDays || 90) * 86400000),
```

- [ ] **Step 3: Set slaDeadline in submitPackage()**

Same change in `nca-portal-service.ts` `submitPackage()` function.

- [ ] **Step 4: Commit**

```
feat(nca): auto-calculate SLA deadline based on NCA authority response times
```

---

## Task 6: Add Missing Correspondence API Routes (P2)

**Files:**

- Create: `src/app/api/nca-portal/submissions/[id]/correspondence/[corrId]/route.ts`
- Create: `src/app/api/nca-portal/correspondence/unread/route.ts`

- [ ] **Step 1: Create markAsRead / markAsResponded route**

New file at `src/app/api/nca-portal/submissions/[id]/correspondence/[corrId]/route.ts`:

- PATCH handler that accepts `{ action: "read" | "responded" }`
- Calls `markAsRead()` or `markAsResponded()` from correspondence service

- [ ] **Step 2: Create unread correspondence route**

New file at `src/app/api/nca-portal/correspondence/unread/route.ts`:

- GET handler that calls `getUnreadCorrespondence(userId)`

- [ ] **Step 3: Commit**

```
feat(nca): add API routes for correspondence read/respond tracking
```

---

## Task 7: Final Build Verification + Deploy

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit all remaining changes and push**

- [ ] **Step 4: Deploy**

```bash
vercel --prod --yes
```
