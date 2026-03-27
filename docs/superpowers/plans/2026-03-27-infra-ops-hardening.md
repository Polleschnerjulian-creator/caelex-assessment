# Infrastruktur & Ops Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix cron job collisions, add missing DB indexes, create health endpoint, and remove dangerous `--accept-data-loss` from production builds.

**Architecture:** 4 independent changes — cron schedule fixes in vercel.json, 2 composite indexes in Prisma schema, a simple health API route, and a safer build script. No new dependencies.

**Tech Stack:** Next.js 15, Prisma, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-27-infra-ops-hardening-design.md`

---

## File Structure

| Action | File                          | Responsibility          |
| ------ | ----------------------------- | ----------------------- |
| Modify | `vercel.json`                 | Cron job schedules      |
| Modify | `prisma/schema.prisma`        | 2 new composite indexes |
| Create | `src/app/api/health/route.ts` | Health check endpoint   |
| Modify | `package.json`                | Safe build scripts      |

---

### Task 1: Fix cron job scheduling collisions

**Files:**

- Modify: `vercel.json`

- [ ] **Step 1: Update cron schedules to fix 07:00 collision and reduce cdm-polling**

In `vercel.json`, make these changes:

Change `compute-rrs` from `"0 7 * * *"` to `"10 7 * * *"`:

```json
{
  "path": "/api/cron/compute-rrs",
  "schedule": "10 7 * * *"
}
```

Change `nca-deadlines` from `"0 7 * * *"` to `"20 7 * * *"`:

```json
{
  "path": "/api/cron/nca-deadlines",
  "schedule": "20 7 * * *"
}
```

Change `cdm-polling` from `"*/30 * * * *"` to `"0 */4 * * *"`:

```json
{
  "path": "/api/cron/cdm-polling",
  "schedule": "0 */4 * * *"
}
```

Change `sentinel-auto-attest` from `"15 */4 * * *"` to `"30 */4 * * *"`:

```json
{
  "path": "/api/cron/sentinel-auto-attest",
  "schedule": "30 */4 * * *"
}
```

Leave all other cron jobs unchanged.

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add vercel.json && git commit -m "fix(cron): stagger 07:00 collision, reduce cdm-polling from 30min to 4hr"
```

---

### Task 2: Add missing composite database indexes

**Files:**

- Modify: `prisma/schema.prisma`

Note: 3 of the originally planned 5 indexes already exist (`Notification[userId, createdAt]`, `AstraMessage[conversationId, createdAt]`, `AstraConversation[userId, organizationId]`). Only 2 composite indexes are actually missing.

- [ ] **Step 1: Add composite index to AuditLog**

In `prisma/schema.prisma`, find the `AuditLog` model (around line 267). After the existing `@@index([organizationId])` line (around line 298), add:

```prisma
  @@index([organizationId, timestamp])
```

This enables efficient queries that filter by organization AND sort by timestamp (audit log page, compliance snapshots).

- [ ] **Step 2: Add composite index to Document**

Find the `Document` model (around line 1786). After the existing `@@index([organizationId])` line (around line 1858), add:

```prisma
  @@index([organizationId, status])
```

This enables efficient document filtering by organization AND status in the dashboard document vault.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma && git commit -m "perf(db): add composite indexes on AuditLog and Document for hot query paths"
```

---

### Task 3: Create health check endpoint

**Files:**

- Create: `src/app/api/health/route.ts`
- Test: `src/app/api/health/route.test.ts`

- [ ] **Step 1: Write test for health endpoint**

Create `src/app/api/health/route.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

// Mock server-only
vi.mock("server-only", () => ({}));

describe("GET /api/health", () => {
  it("returns ok when database is reachable", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when database is unreachable", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("Connection refused"),
    );

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/health/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement health endpoint**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ status: "ok", timestamp }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "degraded", timestamp },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/health/route.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/health/route.ts src/app/api/health/route.test.ts && git commit -m "feat(api): add /api/health endpoint for monitoring"
```

---

### Task 4: Migration guard — remove --accept-data-loss from build

**Files:**

- Modify: `package.json` (line 8)

- [ ] **Step 1: Update build scripts**

In `package.json`, replace line 8:

```json
"build:deploy": "prisma generate && prisma db push --skip-generate --accept-data-loss && next build",
```

With these 3 scripts (replace line 8 and add 2 new lines after it):

```json
"build:deploy": "prisma generate && prisma db push --skip-generate && next build",
"db:push:safe": "prisma db push --skip-generate",
"db:push:force": "prisma db push --skip-generate --accept-data-loss",
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add package.json && git commit -m "fix(build): remove --accept-data-loss from production build, add db:push:safe/force scripts"
```

---

### Task 5: Final verification

- [ ] **Step 1: Verify vercel.json is valid**

```bash
node -e "const v = JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log(v.crons.length + ' crons configured')"
```

Expected: `24 crons configured`

- [ ] **Step 2: Verify Prisma schema**

```bash
npx prisma validate
```

Expected: No errors

- [ ] **Step 3: Run health endpoint test**

```bash
npx vitest run src/app/api/health/route.test.ts
```

Expected: ALL PASS

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: No new failures
