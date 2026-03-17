# Shield LeoLabs CDM Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LeoLabs as a second CDM source in Shield, with BYOK (Bring Your Own Key) model, parallel polling, cross-source merge, and encrypted key storage.

**Architecture:** New `leolabs-client.server.ts` alongside existing `space-track-client.server.ts`. Both produce `ParsedCDM` objects. A new `cdm-merger.server.ts` handles cross-source deduplication. The CDM polling cron fetches both sources in parallel when LeoLabs is enabled. API key stored encrypted in `CAConfig`.

**Tech Stack:** TypeScript, Prisma, Next.js App Router, AES-256-GCM encryption, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-shield-leolabs-integration-design.md`

---

## Task 1: Schema Changes

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to CAConfig model**

Find the `CAConfig` model in `prisma/schema.prisma` and add two new fields at the end (before the closing brace):

```prisma
  leolabsEnabled    Boolean  @default(false)
  leolabsApiKey     String?  @db.Text
```

- [ ] **Step 2: Add source field to CDMRecord model**

Find the `CDMRecord` model and add:

```prisma
  source            String   @default("space_track")
```

- [ ] **Step 3: Run prisma generate**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(shield): add LeoLabs config fields and CDM source tracking to schema"
```

---

## Task 2: LeoLabs Client

**Files:**

- Create: `src/lib/shield/leolabs-client.server.ts`
- Create: `tests/unit/shield/leolabs-client.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

import {
  parseLeoLabsCDM,
  mapLeoLabsCDMToParsed,
} from "../../../src/lib/shield/leolabs-client.server";

const mockLeoLabsResponse = {
  conjunction_id: "conj-12345",
  probability_of_collision: 2.1e-5,
  miss_distance_km: 0.45,
  time_of_closest_approach: "2026-03-20T14:32:00Z",
  primary: {
    norad_id: "55001",
    name: "SAT-1",
    object_type: "PAYLOAD",
  },
  secondary: {
    norad_id: "99001",
    name: "DEBRIS-X",
    object_type: "DEBRIS",
  },
  relative_speed_km_s: 7.8,
  creation_date: "2026-03-17T10:00:00Z",
};

describe("parseLeoLabsCDM", () => {
  it("maps LeoLabs conjunction to ParsedCDM format", () => {
    const parsed = mapLeoLabsCDMToParsed(mockLeoLabsResponse);
    expect(parsed.cdmId).toBe("leolabs-conj-12345");
    expect(parsed.collisionProbability).toBe(2.1e-5);
    expect(parsed.missDistanceMeters).toBe(450); // 0.45km * 1000
    expect(parsed.sat1NoradId).toBe("55001");
    expect(parsed.sat2NoradId).toBe("99001");
    expect(parsed.relativeSpeedMs).toBe(7800); // 7.8 km/s * 1000
    expect(parsed.tca).toBeInstanceOf(Date);
  });

  it("handles missing optional fields", () => {
    const minimal = {
      ...mockLeoLabsResponse,
      relative_speed_km_s: null,
    };
    const parsed = mapLeoLabsCDMToParsed(minimal);
    expect(parsed.relativeSpeedMs).toBeNull();
  });

  it("prefixes CDM ID with leolabs- to avoid collision with Space-Track IDs", () => {
    const parsed = mapLeoLabsCDMToParsed(mockLeoLabsResponse);
    expect(parsed.cdmId).toStartWith("leolabs-");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/leolabs-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the client**

```typescript
/**
 * SHIELD — LeoLabs CDM Client
 *
 * REST client for LeoLabs Conjunction API.
 * Server-only — mirrors space-track-client.server.ts pattern.
 * BYOK: operator provides their own API key.
 */

import "server-only";
import { logger } from "@/lib/logger";
import type { ParsedCDM } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeoLabsConjunction {
  conjunction_id: string;
  probability_of_collision: number;
  miss_distance_km: number;
  time_of_closest_approach: string;
  creation_date: string;
  primary: {
    norad_id: string;
    name: string;
    object_type: string;
  };
  secondary: {
    norad_id: string;
    name: string;
    object_type: string;
  };
  relative_speed_km_s: number | null;
}

export interface LeoLabsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.leolabs.space/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

// ─── CDM Mapping ─────────────────────────────────────────────────────────────

/**
 * Map a LeoLabs conjunction object to Shield's ParsedCDM format.
 */
export function mapLeoLabsCDMToParsed(conj: LeoLabsConjunction): ParsedCDM {
  return {
    cdmId: `leolabs-${conj.conjunction_id}`,
    creationDate: new Date(conj.creation_date),
    tca: new Date(conj.time_of_closest_approach),
    missDistanceMeters: conj.miss_distance_km * 1000,
    collisionProbability: conj.probability_of_collision,
    probabilityMethod: "LEOLABS",
    relativeSpeedMs:
      conj.relative_speed_km_s != null ? conj.relative_speed_km_s * 1000 : null,
    sat1NoradId: conj.primary.norad_id,
    sat1Name: conj.primary.name,
    sat1ObjectType: conj.primary.object_type,
    sat2NoradId: conj.secondary.norad_id,
    sat2Name: conj.secondary.name,
    sat2ObjectType: conj.secondary.object_type,
    sat2Maneuverable: null,
    rawCdm: conj as unknown as import("./types").SpaceTrackCDM,
  };
}

// ─── API Client ──────────────────────────────────────────────────────────────

/**
 * Fetch CDMs from LeoLabs for the given NORAD IDs.
 */
export async function fetchLeoLabsCDMs(
  config: LeoLabsClientConfig,
  noradIds: string[],
  since: Date,
): Promise<ParsedCDM[]> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (noradIds.length === 0) return [];

  const sinceStr = since.toISOString();
  const url = `${baseUrl}/conjunctions?norad_ids=${noradIds.join(",")}&start_time=${sinceStr}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        logger.error("[Shield/LeoLabs] API key invalid or expired");
        return [];
      }

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "60",
          10,
        );
        logger.warn(`[Shield/LeoLabs] Rate limited, waiting ${retryAfter}s`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          logger.warn(
            `[Shield/LeoLabs] HTTP ${response.status}, retrying in ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        logger.error(
          `[Shield/LeoLabs] Failed after ${MAX_RETRIES} attempts: ${response.status}`,
        );
        return [];
      }

      const data = (await response.json()) as LeoLabsConjunction[];
      logger.info(`[Shield/LeoLabs] Fetched ${data.length} conjunctions`);
      return data.map(mapLeoLabsCDMToParsed);
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        logger.warn(`[Shield/LeoLabs] Error, retrying in ${delay}ms`, err);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      logger.error("[Shield/LeoLabs] Failed after retries", err);
      return [];
    }
  }

  return [];
}

/**
 * Test LeoLabs API key validity.
 */
export async function testLeoLabsConnection(
  apiKey: string,
  baseUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${baseUrl || DEFAULT_BASE_URL}/conjunctions?limit=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid or expired API key" };
    }

    if (!response.ok) {
      return { ok: false, error: `LeoLabs API returned ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/shield/leolabs-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/shield/leolabs-client.server.ts tests/unit/shield/leolabs-client.test.ts
git commit -m "feat(shield): implement LeoLabs CDM client with BYOK auth"
```

---

## Task 3: CDM Merger

**Files:**

- Create: `src/lib/shield/cdm-merger.server.ts`
- Create: `tests/unit/shield/cdm-merger.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { mergeCDMs } from "../../../src/lib/shield/cdm-merger.server";
import type { ParsedCDM } from "../../../src/lib/shield/types";

function makeCDM(overrides: Partial<ParsedCDM> & { cdmId: string }): ParsedCDM {
  return {
    cdmId: overrides.cdmId,
    creationDate: overrides.creationDate || new Date("2026-03-17T10:00:00Z"),
    tca: overrides.tca || new Date("2026-03-20T14:00:00Z"),
    missDistanceMeters: overrides.missDistanceMeters ?? 500,
    collisionProbability: overrides.collisionProbability ?? 1e-5,
    probabilityMethod: overrides.probabilityMethod || "FOSTER",
    relativeSpeedMs: overrides.relativeSpeedMs ?? 7800,
    sat1NoradId: overrides.sat1NoradId || "55001",
    sat1Name: overrides.sat1Name || "SAT-1",
    sat1ObjectType: overrides.sat1ObjectType || "PAYLOAD",
    sat2NoradId: overrides.sat2NoradId || "99001",
    sat2Name: overrides.sat2Name || "DEBRIS-X",
    sat2ObjectType: overrides.sat2ObjectType || "DEBRIS",
    sat2Maneuverable: null,
    rawCdm: {} as any,
  };
}

describe("mergeCDMs", () => {
  it("returns all CDMs when no overlap", () => {
    const st = [makeCDM({ cdmId: "st-1", sat2NoradId: "99001" })];
    const ll = [makeCDM({ cdmId: "leolabs-1", sat2NoradId: "99002" })];
    const result = mergeCDMs(st, ll);
    expect(result.length).toBe(2);
  });

  it("prefers LeoLabs when same conjunction detected by both", () => {
    const st = [
      makeCDM({
        cdmId: "st-1",
        sat1NoradId: "55001",
        sat2NoradId: "99001",
        tca: new Date("2026-03-20T14:00:00Z"),
      }),
    ];
    const ll = [
      makeCDM({
        cdmId: "leolabs-1",
        sat1NoradId: "55001",
        sat2NoradId: "99001",
        tca: new Date("2026-03-20T14:30:00Z"),
        collisionProbability: 1.8e-5,
      }),
    ];
    const result = mergeCDMs(st, ll);
    // Both stored, but LeoLabs-tagged one should come first (preferred)
    expect(result.length).toBe(2);
    expect(result[0].cdmId).toBe("leolabs-1");
  });

  it("returns Space-Track only when LeoLabs is empty", () => {
    const st = [
      makeCDM({ cdmId: "st-1" }),
      makeCDM({ cdmId: "st-2", sat2NoradId: "99002" }),
    ];
    const result = mergeCDMs(st, []);
    expect(result.length).toBe(2);
  });

  it("returns LeoLabs only when Space-Track is empty", () => {
    const ll = [makeCDM({ cdmId: "leolabs-1" })];
    const result = mergeCDMs([], ll);
    expect(result.length).toBe(1);
  });

  it("matches conjunctions within 1 hour TCA window", () => {
    const st = [
      makeCDM({ cdmId: "st-1", tca: new Date("2026-03-20T14:00:00Z") }),
    ];
    const ll = [
      makeCDM({ cdmId: "leolabs-1", tca: new Date("2026-03-20T14:45:00Z") }),
    ];
    const result = mergeCDMs(st, ll);
    // Same NORAD IDs + TCA within 1h → matched, both kept, LeoLabs preferred
    expect(result.length).toBe(2);
    expect(result[0].cdmId).toBe("leolabs-1");
  });

  it("does NOT match when TCA differs by more than 1 hour", () => {
    const st = [
      makeCDM({ cdmId: "st-1", tca: new Date("2026-03-20T14:00:00Z") }),
    ];
    const ll = [
      makeCDM({ cdmId: "leolabs-1", tca: new Date("2026-03-20T16:00:00Z") }),
    ];
    const result = mergeCDMs(st, ll);
    // Different conjunctions — both independent
    expect(result.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/cdm-merger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the merger**

```typescript
/**
 * SHIELD — CDM Merger
 *
 * Merges CDMs from multiple sources (Space-Track + LeoLabs).
 * Deduplicates by conjunction (same NORAD IDs + TCA within 1h).
 * Prefers LeoLabs data when both sources report the same conjunction.
 */

import "server-only";
import type { ParsedCDM } from "./types";

const TCA_MATCH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface ConjunctionKey {
  primaryNorad: string;
  secondaryNorad: string;
}

function makeKey(cdm: ParsedCDM): string {
  // Normalize: always put smaller NORAD ID first
  const ids = [cdm.sat1NoradId, cdm.sat2NoradId].sort();
  return `${ids[0]}-${ids[1]}`;
}

function tcaMatch(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= TCA_MATCH_WINDOW_MS;
}

/**
 * Merge CDMs from Space-Track and LeoLabs.
 *
 * Rules:
 * - All CDMs are kept (full audit trail)
 * - Matched conjunctions (same NORAD pair + TCA within 1h): LeoLabs CDM sorted first
 * - Unmatched: kept as-is
 */
export function mergeCDMs(
  spaceTrackCDMs: ParsedCDM[],
  leoLabsCDMs: ParsedCDM[],
): ParsedCDM[] {
  if (leoLabsCDMs.length === 0) return spaceTrackCDMs;
  if (spaceTrackCDMs.length === 0) return leoLabsCDMs;

  const result: ParsedCDM[] = [];
  const matchedStIndices = new Set<number>();

  // For each LeoLabs CDM, try to find a matching Space-Track CDM
  for (const llCdm of leoLabsCDMs) {
    const llKey = makeKey(llCdm);
    let matched = false;

    for (let i = 0; i < spaceTrackCDMs.length; i++) {
      if (matchedStIndices.has(i)) continue;

      const stCdm = spaceTrackCDMs[i];
      const stKey = makeKey(stCdm);

      if (llKey === stKey && tcaMatch(llCdm.tca, stCdm.tca)) {
        // Match found — LeoLabs first (preferred), then Space-Track
        result.push(llCdm);
        result.push(stCdm);
        matchedStIndices.add(i);
        matched = true;
        break;
      }
    }

    if (!matched) {
      result.push(llCdm);
    }
  }

  // Add unmatched Space-Track CDMs
  for (let i = 0; i < spaceTrackCDMs.length; i++) {
    if (!matchedStIndices.has(i)) {
      result.push(spaceTrackCDMs[i]);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/shield/cdm-merger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/shield/cdm-merger.server.ts tests/unit/shield/cdm-merger.test.ts
git commit -m "feat(shield): implement cross-source CDM merger for Space-Track + LeoLabs"
```

---

## Task 4: CDM Polling Extension + API Routes

**Files:**

- Modify: `src/app/api/cron/cdm-polling/route.ts`
- Modify: `src/app/api/shield/config/route.ts`
- Create: `src/app/api/shield/config/test-leolabs/route.ts`

- [ ] **Step 1: Modify CDM polling cron to fetch from both sources**

In `src/app/api/cron/cdm-polling/route.ts`:

Add imports:

```typescript
import { fetchLeoLabsCDMs } from "@/lib/shield/leolabs-client.server";
import { mergeCDMs } from "@/lib/shield/cdm-merger.server";
import { decrypt } from "@/lib/encryption";
```

In the `pollCDMs()` function, find the line where CDMs are fetched from Space-Track:

```typescript
const cdms = await fetchCDMs(noradIds, 1); // Last 24h
```

Replace with:

```typescript
// Fetch from Space-Track (always)
const spaceTrackCDMs = await fetchCDMs(noradIds, 1);

// Fetch from LeoLabs (if enabled for this org)
let leoLabsCDMs: ParsedCDM[] = [];
if (org.caConfig?.leolabsEnabled && org.caConfig?.leolabsApiKey) {
  try {
    const apiKey = decrypt(org.caConfig.leolabsApiKey);
    leoLabsCDMs = await fetchLeoLabsCDMs(
      { apiKey },
      noradIds,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
  } catch (err) {
    errors.push(
      `LeoLabs fetch failed for org ${org.id}: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

// Merge CDMs from both sources
const cdms = mergeCDMs(spaceTrackCDMs, leoLabsCDMs);
```

Also add the `ParsedCDM` import from types:

```typescript
import type { CDMPollingResult, ParsedCDM } from "@/lib/shield/types";
```

- [ ] **Step 2: Add source field when creating CDMRecords**

In the same file, find where `CDMRecord` is created (the `prisma.cDMRecord.create` call) and add the source field:

```typescript
source: cdm.cdmId.startsWith("leolabs-") ? "leolabs" : "space_track",
```

- [ ] **Step 3: Update config API to handle LeoLabs fields**

In `src/app/api/shield/config/route.ts`, update the Zod schema for PUT to accept the new fields, and mask the API key in GET responses. Read the file first to understand the exact pattern, then add:

For GET: if `config.leolabsApiKey`, return masked version (`"••••••" + key.slice(-6)`)
For PUT: accept `leolabsEnabled` (boolean) and `leolabsApiKey` (string, encrypt before storage)

- [ ] **Step 4: Create test-leolabs endpoint**

```typescript
/**
 * POST /api/shield/config/test-leolabs
 * Tests a LeoLabs API key without storing it.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testLeoLabsConnection } from "@/lib/shield/leolabs-client.server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { apiKey } = body as { apiKey: string };

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    const result = await testLeoLabsConnection(apiKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/cdm-polling/route.ts src/app/api/shield/config/route.ts src/app/api/shield/config/test-leolabs/route.ts
git commit -m "feat(shield): extend CDM polling for LeoLabs + config API + test endpoint"
```

---

## Task 5: Dashboard UI — Settings + Source Badge

**Files:**

- Modify: `src/app/dashboard/shield/page.tsx`
- Modify: `src/app/dashboard/shield/[eventId]/page.tsx`

- [ ] **Step 1: Add LeoLabs settings section to Shield dashboard**

In `src/app/dashboard/shield/page.tsx`, find the Settings tab content. Add a "LeoLabs Integration" section below the existing Space-Track section:

```tsx
{
  /* LeoLabs Integration */
}
<div className="rounded-xl p-4" style={glassPanel}>
  <h4 className="text-sm font-semibold text-slate-700 mb-3">
    LeoLabs Integration
  </h4>

  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">Status</span>
      <span
        className={`text-xs px-2 py-1 rounded-lg ${
          leolabsEnabled
            ? "bg-green-500/10 text-green-600"
            : "bg-slate-500/10 text-slate-500"
        }`}
      >
        {leolabsEnabled ? "Connected" : "Disabled"}
      </span>
    </div>

    <div>
      <label className="text-xs text-slate-500 block mb-1">API Key</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={leolabsKey}
          onChange={(e) => setLeolabsKey(e.target.value)}
          placeholder="Enter your LeoLabs API key"
          className="flex-1 text-sm bg-white/50 border border-black/[0.08] rounded-xl px-3 py-2 text-slate-700"
        />
        <button
          onClick={handleTestLeolabs}
          className="text-xs px-3 py-2 rounded-xl border border-black/[0.08] hover:bg-white/40"
        >
          Test
        </button>
      </div>
    </div>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={leolabsEnabled}
        onChange={(e) => setLeolabsEnabled(e.target.checked)}
        className="rounded"
      />
      <span className="text-sm text-slate-600">Enable LeoLabs CDM polling</span>
    </label>

    <p className="text-xs text-slate-400">
      Provide your LeoLabs API key for faster, higher-accuracy conjunction data
      alongside Space-Track. Your key is encrypted and never shared.
    </p>
  </div>
</div>;
```

Add state variables and handlers for the LeoLabs settings (leolabsKey, leolabsEnabled, handleTestLeolabs, handleSaveLeolabs).

- [ ] **Step 2: Add source badge to CDM display in event detail**

In `src/app/dashboard/shield/[eventId]/page.tsx`, find where CDM records are displayed (the CDM table/cards). Add a small badge showing the source:

```tsx
<span
  className={`text-xs px-1.5 py-0.5 rounded ${
    cdm.source === "leolabs"
      ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
      : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
  }`}
>
  {cdm.source === "leolabs" ? "LeoLabs" : "Space-Track"}
</span>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "shield" | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/shield/page.tsx src/app/dashboard/shield/[eventId]/page.tsx
git commit -m "feat(shield): add LeoLabs settings UI and CDM source badges"
```

---

## Verification

- [ ] **Run all Shield tests**

Run: `npx vitest run tests/unit/shield/`
Expected: All tests PASS (existing + new)

- [ ] **TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error"`
Expected: No increase in error count

- [ ] **Build check**

Run: `npm run build`
Expected: Compiles with warnings only (no errors)
