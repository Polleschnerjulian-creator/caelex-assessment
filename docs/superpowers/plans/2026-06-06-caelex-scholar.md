# Caelex Scholar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship **Caelex Scholar** at `caelex.eu/scholar` — a gated, institutionally-licensed, searchable window into the existing Atlas legal-sources corpus for law students.

**Architecture:** A new `(scholar)/scholar` route group (mirrors `(atlas)/atlas`) gated by a new `getScholarAuth()` helper that checks the `OrganizationProductAccess` ledger for a `SCHOLAR` entitlement (the **Trade** product-gate pattern, NOT Atlas's legacy `orgType` gate). A Scholar-scoped search API reuses the server-only `korpus-tools.server.ts` / `semantic-corpus.server.ts` engines — never the Atlas-gated `corpus-search` route, and never importing the corpus into client bundles. Access is institutional: a university = an `Organization` with a free `SCHOLAR` grant; students sign in via the org's existing `SSOConnection`.

**Tech Stack:** Next.js 15 App Router, Prisma 5.22 (Neon), NextAuth v5, Zod, Vitest, Upstash rate-limit, the existing Vercel AI Gateway embedding pipeline (`ATLAS_SEMANTIC_ENABLED`).

**Spec:** `docs/superpowers/specs/2026-06-06-caelex-scholar-design.md`

---

## Scope & decomposition

This plan delivers **Phases 1–3** = a working, tested, gated Scholar search+read surface. **Phase 4** is user-gated ops (DB migration apply, pilot-university grant, SSO return-url, deploy). The UI phase (3) is the natural split point if you'd rather make it a separate plan — it depends on 1+2 but is otherwise self-contained.

**Hard rules:**

- **TDD** on all backend logic (Phases 1–2): RED → run-fail → minimal GREEN → run-pass → commit.
- **No corpus in client bundles.** All corpus access goes through `/api/scholar/*`. (The data barrel `@/data/legal-sources` is NOT `server-only` today — do not import it into a `"use client"` Scholar file.)
- **IP guardrail inherited:** Scholar's source-read endpoint caps `paragraph_text` at 600 chars, mirroring `korpus-tools.server.ts`.
- **Branch:** dedicated branch off `main` (e.g. `feat/caelex-scholar`). **NOT** `fix/trade-to-92` (stale Trade surface) — Scholar belongs to the Atlas/main lineage.
- Single-test command: `npx vitest run <path>`. Typecheck: `npx tsc --noEmit`.

---

## File Structure

**Create:**

- `src/lib/scholar/scholar-auth.ts` — `getScholarAuth()` product gate (clone of `trade-auth.ts`)
- `src/lib/scholar/scholar-auth.test.ts`
- `src/lib/scholar/scholar-search.server.ts` — typed Scholar DTO wrapper over `searchLegalSources()`
- `src/lib/scholar/scholar-search.server.test.ts`
- `src/lib/scholar/source-detail.server.ts` — single-source read with 600-char IP cap
- `src/lib/scholar/source-detail.server.test.ts`
- `src/app/api/scholar/search/route.ts` (+ `route.test.ts`)
- `src/app/api/scholar/sources/[id]/route.ts` (+ `route.test.ts`)
- `src/app/(scholar)/scholar/layout.tsx` — gated shell
- `src/app/(scholar)/scholar/page.tsx` — search home (client)
- `src/app/(scholar)/scholar/sources/[id]/page.tsx` — source detail (client)
- `src/app/scholar-login/page.tsx` — branded login (mirror `atlas-login`)
- `src/app/scholar-no-access/page.tsx` — bounce target (server; re-runs exact gate predicate)
- `src/app/scholar-access/page.tsx` — "for universities" lead page (optional, simple)

**Modify:**

- `prisma/schema.prisma` — add `SCHOLAR` to `ProductCode`; add `INSTITUTIONAL` to `ProductAccessSource`; add `seatCap Int?` to `OrganizationProductAccess`
- `src/lib/safe-redirect.ts` — add `safeScholarUrl()` mirroring `safeAtlasUrl()`
- `src/lib/ratelimit.ts` — add `scholar` tier (3 places)
- `src/lib/audit.ts` — append Scholar verbs/entities to the action/entity unions
- `src/lib/atlas/korpus-tools.server.ts` — `export` the existing `searchLegalSources` (currently internal)

---

# PHASE 1 — Entitlement & auth foundation

### Task 1.1: Add `SCHOLAR` to the product enum + institutional-license fields

**Files:**

- Modify: `prisma/schema.prisma` (`ProductCode` ~line 3452, `ProductAccessSource` ~3465, `OrganizationProductAccess` ~3419)

- [ ] **Step 1: Edit the enum + model**

In `ProductCode`:

```prisma
enum ProductCode {
  COMPLY
  TRADE
  ATLAS
  PHAROS
  SCHOLAR
}
```

In `ProductAccessSource` add one variant:

```prisma
enum ProductAccessSource {
  STRIPE
  MANUAL
  LEGACY_BACKFILL
  TRIAL_PROMO
  ORG_TYPE
  INSTITUTIONAL // free per-org Scholar grant to a university
}
```

In `OrganizationProductAccess`, add a nullable seat cap below `notes`:

```prisma
  notes       String?
  seatCap     Int?    // null = unlimited; institutional seat ceiling (Scholar)
```

- [ ] **Step 2: Validate + regenerate the client**

Run: `npx prisma validate && npx prisma generate`
Expected: "The schema is valid" + "Generated Prisma Client". This updates the TS `ProductCode` type so `"SCHOLAR"` is assignable (no DB connection needed).

- [ ] **Step 3: Verify the type exists**

Run: `node -e "const {ProductCode}=require('@prisma/client'); console.log(ProductCode.SCHOLAR)"`
Expected: prints `SCHOLAR`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(scholar): add SCHOLAR product code + institutional license fields"
```

> **Note (Phase 4 / ops):** the migration FILE is authored locally via `npm run db:migrate:dev` and applied in prod by the deploy's `prisma db push --accept-data-loss`. Adding an enum value + nullable column is non-destructive. Do NOT run `db:migrate:dev` here unless a dev DATABASE_URL is set — `prisma generate` is enough to unblock the code.

---

### Task 1.2: `getScholarAuth()` product-gate helper

**Files:**

- Create: `src/lib/scholar/scholar-auth.ts`
- Test: `src/lib/scholar/scholar-auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/middleware/organization-guard", () => ({
  getCurrentOrganization: vi.fn(),
}));
vi.mock("@/lib/products", () => ({ hasProductAccess: vi.fn() }));

import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { getScholarAuth } from "./scholar-auth";

const mockAuth = vi.mocked(auth);
const mockGetOrg = vi.mocked(getCurrentOrganization);
const mockHasAccess = vi.mocked(hasProductAccess);

const orgCtx = {
  userId: "u1",
  organizationId: "org1",
  role: "MEMBER",
  permissions: [],
  organization: {
    id: "org1",
    name: "Uni",
    slug: "uni",
    plan: "FREE",
    isActive: true,
  },
} as never;

beforeEach(() => vi.clearAllMocks());

describe("getScholarAuth", () => {
  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns null when the user has no active org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(null);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns null when the org lacks SCHOLAR access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(false);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns the context when SCHOLAR access is granted", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(true);
    expect(await getScholarAuth()).toEqual({
      userId: "u1",
      organizationId: "org1",
      role: "MEMBER",
    });
  });

  it("gates specifically on the SCHOLAR product", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(true);
    await getScholarAuth();
    expect(mockHasAccess).toHaveBeenCalledWith("org1", "SCHOLAR");
  });
});
```

- [ ] **Step 2: Run → verify FAIL**

Run: `npx vitest run src/lib/scholar/scholar-auth.test.ts`
Expected: FAIL — `Cannot find module './scholar-auth'`.

- [ ] **Step 3: Implement (clone of `trade-auth.ts`)**

```ts
import "server-only";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import type { OrganizationRole } from "@prisma/client";

export interface ScholarAuthContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

/**
 * Resolve the caller's Scholar context, or null if they may not use Scholar.
 * Mirrors getTradeAuth(): session → active org → SCHOLAR product entitlement.
 */
export async function getScholarAuth(): Promise<ScholarAuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await getCurrentOrganization(session.user.id);
  if (!org) return null;

  const ok = await hasProductAccess(org.organizationId, "SCHOLAR");
  if (!ok) return null;

  return {
    userId: org.userId,
    organizationId: org.organizationId,
    role: org.role,
  };
}
```

- [ ] **Step 4: Run → verify PASS**

Run: `npx vitest run src/lib/scholar/scholar-auth.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scholar/scholar-auth.ts src/lib/scholar/scholar-auth.test.ts
git commit -m "feat(scholar): getScholarAuth product gate (SCHOLAR entitlement)"
```

---

### Task 1.3: `safeScholarUrl()` redirect clamp

**Files:**

- Modify: `src/lib/safe-redirect.ts`
- Test: `src/lib/safe-redirect.test.ts` (extend if present; else create)

- [ ] **Step 1: Read `safe-redirect.ts`** to copy the EXACT structure of `safeAtlasUrl` (the existing function clamps to `/atlas`, `/atlas/*`, `/atlas-*` and rejects `//`, `://`, non-`/` prefixes). Mirror it byte-for-byte with `scholar`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { safeScholarUrl } from "./safe-redirect";

describe("safeScholarUrl", () => {
  it("accepts the scholar surface", () => {
    expect(safeScholarUrl("/scholar")).toBe("/scholar");
    expect(safeScholarUrl("/scholar/sources/DE-SATDSIG-2007")).toBe(
      "/scholar/sources/DE-SATDSIG-2007",
    );
    expect(safeScholarUrl("/scholar-login")).toBe("/scholar-login");
  });
  it("rejects other internal paths", () => {
    expect(safeScholarUrl("/dashboard")).toBe("/scholar");
    expect(safeScholarUrl("/atlas")).toBe("/scholar");
  });
  it("rejects open redirects", () => {
    expect(safeScholarUrl("//evil.com")).toBe("/scholar");
    expect(safeScholarUrl("https://evil.com")).toBe("/scholar");
    expect(safeScholarUrl("evil")).toBe("/scholar");
    expect(safeScholarUrl(null)).toBe("/scholar");
  });
});
```

- [ ] **Step 3: Run → FAIL** (`safeScholarUrl is not a function`)
      Run: `npx vitest run src/lib/safe-redirect.test.ts`

- [ ] **Step 4: Implement** — add, matching the file's existing `safeAtlasUrl` shape:

```ts
export function safeScholarUrl(
  url: string | null | undefined,
  fallback = "/scholar",
): string {
  if (!url) return fallback;
  if (url.startsWith("//") || url.includes("://")) return fallback;
  if (!url.startsWith("/")) return fallback;
  if (
    url === "/scholar" ||
    url.startsWith("/scholar/") ||
    url.startsWith("/scholar-")
  ) {
    return url;
  }
  return fallback;
}
```

- [ ] **Step 5: Run → PASS**, then **commit**

```bash
git add src/lib/safe-redirect.ts src/lib/safe-redirect.test.ts
git commit -m "feat(scholar): safeScholarUrl redirect clamp"
```

---

### Task 1.4: `scholar` rate-limit tier

**Files:** Modify `src/lib/ratelimit.ts` (3 edits — keep them in lockstep)

- [ ] **Step 1: Add to `rateLimiters`** (near `astra_chat`):

```ts
      // Scholar corpus search: 60/min per student (interactive research)
      scholar: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "ratelimit:scholar",
      }),
```

- [ ] **Step 2: Add to `fallbackLimiters`** (ms form, ~half):

```ts
  scholar: new InMemoryRateLimiter(30, 60000), // 30/min dev
```

- [ ] **Step 3: Add to the `RateLimitType` union:** `| "scholar"`.
- [ ] **Step 4: Typecheck** — Run: `npx tsc --noEmit` → no new errors.
- [ ] **Step 5: Commit**

```bash
git add src/lib/ratelimit.ts
git commit -m "feat(scholar): add scholar rate-limit tier (60/min)"
```

---

### Task 1.5: Scholar audit verbs

**Files:** Modify `src/lib/audit.ts`

- [ ] **Step 1: Append to the `AuditAction` union:** `| "scholar_search" | "scholar_view_source"`.
- [ ] **Step 2: Append to the `AuditEntityType` union:** `| "scholar_source"`.
- [ ] **Step 3: Typecheck** → `npx tsc --noEmit`, no new errors.
- [ ] **Step 4: Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat(scholar): audit action/entity literals"
```

---

# PHASE 2 — Scholar-scoped search API

### Task 2.1: Export `searchLegalSources` + typed Scholar wrapper

**Files:**

- Modify: `src/lib/atlas/korpus-tools.server.ts`
- Create: `src/lib/scholar/scholar-search.server.ts` (+ `.test.ts`)

- [ ] **Step 1: Read `korpus-tools.server.ts:254-446`** to confirm the exact `SearchSourcesInput` shape and the return type of `searchLegalSources` (documented hit fields: `id, jurisdiction, type, status, title, scope_description, score, keyword_score, semantic_score`; envelope: `{ query, filters, hit_count, hits[], semantic_available, hint }`). Confirm before writing the wrapper.

- [ ] **Step 2: Export the function** — change its declaration to `export async function searchLegalSources(...)`. (No behaviour change.)

- [ ] **Step 3: Write the failing wrapper test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/atlas/korpus-tools.server", () => ({
  searchLegalSources: vi.fn(),
}));

import { searchLegalSources } from "@/lib/atlas/korpus-tools.server";
import { scholarSearchSources } from "./scholar-search.server";

const mockSearch = vi.mocked(searchLegalSources);
beforeEach(() => vi.clearAllMocks());

describe("scholarSearchSources", () => {
  it("maps the engine result into the Scholar DTO", async () => {
    mockSearch.mockResolvedValue({
      query: "satellite",
      filters: {},
      hit_count: 1,
      semantic_available: true,
      hint: "",
      hits: [
        {
          id: "DE-SATDSIG-2007",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
          title: "Satellite Data Security Act",
          scope_description: "EO operators only",
          score: 0.8,
          keyword_score: 0.6,
          semantic_score: 0.9,
        },
      ],
    } as never);

    const out = await scholarSearchSources({ query: "satellite" });
    expect(out).toEqual({
      query: "satellite",
      hitCount: 1,
      semanticAvailable: true,
      hits: [
        {
          id: "DE-SATDSIG-2007",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
          title: "Satellite Data Security Act",
          scopeDescription: "EO operators only",
          score: 0.8,
        },
      ],
    });
  });

  it("forwards optional filters with snake_case key", async () => {
    mockSearch.mockResolvedValue({
      query: "x",
      filters: {},
      hit_count: 0,
      semantic_available: false,
      hint: "",
      hits: [],
    } as never);
    await scholarSearchSources({
      query: "x",
      jurisdiction: "DE",
      type: "treaty",
      complianceArea: "licensing",
    });
    expect(mockSearch).toHaveBeenCalledWith({
      query: "x",
      jurisdiction: "DE",
      type: "treaty",
      compliance_area: "licensing",
    });
  });
});
```

- [ ] **Step 4: Run → FAIL** (`Cannot find module './scholar-search.server'`)
      Run: `npx vitest run src/lib/scholar/scholar-search.server.test.ts`

- [ ] **Step 5: Implement the wrapper**

```ts
import "server-only";
import { searchLegalSources } from "@/lib/atlas/korpus-tools.server";

export interface ScholarSearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scopeDescription: string | null;
  score: number;
}

export interface ScholarSearchResult {
  query: string;
  hitCount: number;
  semanticAvailable: boolean;
  hits: ScholarSearchHit[];
}

export interface ScholarSearchInput {
  query: string;
  jurisdiction?: string;
  type?: string;
  complianceArea?: string;
}

export async function scholarSearchSources(
  input: ScholarSearchInput,
): Promise<ScholarSearchResult> {
  const result = await searchLegalSources({
    query: input.query,
    jurisdiction: input.jurisdiction,
    type: input.type,
    compliance_area: input.complianceArea,
  });
  return {
    query: result.query,
    hitCount: result.hit_count,
    semanticAvailable: result.semantic_available,
    hits: result.hits.map((h) => ({
      id: h.id,
      jurisdiction: h.jurisdiction,
      type: h.type,
      status: h.status,
      title: h.title,
      scopeDescription: h.scope_description ?? null,
      score: h.score,
    })),
  };
}
```

- [ ] **Step 6: Run → PASS**, then **commit**

```bash
git add src/lib/atlas/korpus-tools.server.ts src/lib/scholar/scholar-search.server.ts src/lib/scholar/scholar-search.server.test.ts
git commit -m "feat(scholar): typed search wrapper over korpus-tools (export searchLegalSources)"
```

---

### Task 2.2: `POST /api/scholar/search`

**Files:** Create `src/app/api/scholar/search/route.ts` (+ `route.test.ts`)

- [ ] **Step 1: Write the failing route-gate test** (mirror `trade/parties/route.test.ts`)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/scholar/scholar-auth", () => ({ getScholarAuth: vi.fn() }));
vi.mock("@/lib/scholar/scholar-search.server", () => ({
  scholarSearchSources: vi.fn(),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("u"),
}));

function req(body?: unknown): Request {
  return new Request("http://localhost/api/scholar/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}
const validAuth = { userId: "u1", organizationId: "org1", role: "MEMBER" };

describe("POST /api/scholar/search — gate", () => {
  beforeEach(() => vi.resetModules());

  it("403 when getScholarAuth is null", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(req({ query: "satellite" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("400 when auth valid but body invalid (gate runs before validation)", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { POST } = await import("./route");
    const res = await POST(req({ query: "x" })); // too short (<2)
    expect(res.status).toBe(400);
  });

  it("200 when auth valid and body valid", async () => {
    const { getScholarAuth } = await import("@/lib/scholar/scholar-auth");
    vi.mocked(getScholarAuth).mockResolvedValue(validAuth as never);
    const { scholarSearchSources } =
      await import("@/lib/scholar/scholar-search.server");
    vi.mocked(scholarSearchSources).mockResolvedValue({
      query: "satellite",
      hitCount: 0,
      semanticAvailable: false,
      hits: [],
    });
    const { POST } = await import("./route");
    const res = await POST(req({ query: "satellite" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ query: "satellite" });
  });
});
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module './route'`)
      Run: `npx vitest run src/app/api/scholar/search/route.test.ts`

- [ ] **Step 3: Implement the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { scholarSearchSources } from "@/lib/scholar/scholar-search.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SearchBody = z.object({
  query: z.string().min(2).max(200),
  jurisdiction: z.string().max(5).optional(),
  type: z.string().max(60).optional(),
  complianceArea: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const auth = await getScholarAuth();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await checkRateLimit("scholar", getIdentifier(req, auth.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const parsed = SearchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await scholarSearchSources(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Scholar search failed") },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run → PASS** (3 passed), then **commit**

```bash
git add src/app/api/scholar/search
git commit -m "feat(scholar): POST /api/scholar/search (gated + rate-limited)"
```

---

### Task 2.3: `GET /api/scholar/sources/[id]` with 600-char IP cap

**Files:**

- Create: `src/lib/scholar/source-detail.server.ts` (+ `.test.ts`)
- Create: `src/app/api/scholar/sources/[id]/route.ts` (+ `route.test.ts`)

- [ ] **Step 1: Write the failing IP-cap test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/data/legal-sources", () => ({ getLegalSourceById: vi.fn() }));

import { getLegalSourceById } from "@/data/legal-sources";
import { getScholarSourceDetail } from "./source-detail.server";

beforeEach(() => vi.clearAllMocks());

describe("getScholarSourceDetail", () => {
  it("returns null for an unknown id", () => {
    vi.mocked(getLegalSourceById).mockReturnValue(undefined as never);
    expect(getScholarSourceDetail("NOPE")).toBeNull();
  });

  it("caps paragraph_text at 600 chars and flags truncation", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "X",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "T",
      key_provisions: [
        {
          section: "§1",
          title: "P",
          summary: "s",
          paragraph_text: "a".repeat(900),
        },
      ],
    } as never);
    const out = getScholarSourceDetail("X")!;
    const prov = out.keyProvisions[0];
    expect(prov.paragraphText!.length).toBeLessThanOrEqual(640); // 600 + suffix
    expect(prov.paragraphTextTruncated).toBe(true);
  });

  it("leaves short paragraph_text intact", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "Y",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "T",
      key_provisions: [
        { section: "§1", title: "P", summary: "s", paragraph_text: "short" },
      ],
    } as never);
    const prov = getScholarSourceDetail("Y")!.keyProvisions[0];
    expect(prov.paragraphText).toBe("short");
    expect(prov.paragraphTextTruncated).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL**, then **Step 3: Implement**

```ts
import "server-only";
import { getLegalSourceById } from "@/data/legal-sources";

// Mirrors PARAGRAPH_TEXT_CAP in korpus-tools.server.ts (IP guardrail: closed-licence
// normative text must never be served verbatim in full). Keep in sync.
const PARAGRAPH_TEXT_CAP = 600;
const TRUNCATION_SUFFIX = " […] (truncated — see paragraph_url for full text)";

export interface ScholarProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;
  paragraphText?: string;
  paragraphTextTruncated: boolean;
  paragraphUrl?: string;
}

export interface ScholarSourceDetail {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  titleLocal?: string;
  sourceUrl?: string;
  issuingBody?: string;
  scopeDescription?: string;
  keyProvisions: ScholarProvision[];
}

export function getScholarSourceDetail(id: string): ScholarSourceDetail | null {
  const s = getLegalSourceById(id);
  if (!s) return null;
  return {
    id: s.id,
    jurisdiction: s.jurisdiction,
    type: s.type,
    status: s.status,
    title: s.title_en,
    titleLocal: s.title_local,
    sourceUrl: s.source_url,
    issuingBody: s.issuing_body,
    scopeDescription: s.scope_description,
    keyProvisions: s.key_provisions.map((p) => {
      const full = p.paragraph_text;
      const truncated = !!full && full.length > PARAGRAPH_TEXT_CAP;
      return {
        section: p.section,
        title: p.title,
        summary: p.summary,
        complianceImplication: p.complianceImplication,
        paragraphText: truncated
          ? full!.slice(0, PARAGRAPH_TEXT_CAP) + TRUNCATION_SUFFIX
          : full,
        paragraphTextTruncated: truncated,
        paragraphUrl: p.paragraph_url,
      };
    }),
  };
}
```

> Note: `key_provisions` is already normalized to `KeyProvision[]` by the barrel (`NormalizedLegalSource`), so `.map` over objects is safe.

- [ ] **Step 4: Run → PASS**, **commit**

```bash
git add src/lib/scholar/source-detail.server.ts src/lib/scholar/source-detail.server.test.ts
git commit -m "feat(scholar): source-detail reader with 600-char IP cap"
```

- [ ] **Step 5: Route test** `src/app/api/scholar/sources/[id]/route.test.ts` — same gate pattern (mock `getScholarAuth`, `getScholarSourceDetail`, ratelimit): 403 when null auth; 404 when detail null; 200 with body. Then implement:

```ts
import { NextResponse } from "next/server";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { getScholarSourceDetail } from "@/lib/scholar/source-detail.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getScholarAuth();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await checkRateLimit("scholar", getIdentifier(req, auth.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { id } = await params;
  const detail = getScholarSourceDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAuditEvent({
    userId: auth.userId,
    organizationId: auth.organizationId,
    action: "scholar_view_source",
    entityType: "scholar_source",
    entityId: id,
    ...getRequestContext(req),
  });

  return NextResponse.json(detail, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
```

> **Note:** Next.js 15 dynamic route `params` is a Promise — `await params`. Confirm against a sibling `[id]` route during implementation.

- [ ] **Step 6: Run both tests → PASS, commit**

```bash
git add src/app/api/scholar/sources
git commit -m "feat(scholar): GET /api/scholar/sources/[id] (capped + audited)"
```

- [ ] **Step 7: Full backend gate check** — Run: `npx vitest run src/lib/scholar src/app/api/scholar` → all green. `npx tsc --noEmit` → no new errors.

---

# PHASE 3 — Scholar UI surface

> UI tasks are verified by **manual run** (`npm run dev` → `/scholar`) and (optionally) Playwright, not unit TDD. Each task ends with an explicit manual check.

### Task 3.1: Gated route group + layout

**Files:** Create `src/app/(scholar)/scholar/layout.tsx`

- [ ] **Step 1: Implement the gate** (mirror `(trade)/trade/layout.tsx`; uses the modern product gate, NOT orgType):

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";

export default async function ScholarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/scholar-login?callbackUrl=%2Fscholar");
  }
  if (!isSuperAdmin(session.user.email)) {
    const org = await getCurrentOrganization(session.user.id);
    const ok = org
      ? await hasProductAccess(org.organizationId, "SCHOLAR")
      : false;
    if (!ok) redirect("/scholar-no-access");
  }
  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* TODO(impl): ScholarShell — header "Caelex Scholar · powered by Atlas" + search nav */}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Manual check** — with a non-entitled user, hitting `/scholar` redirects to `/scholar-no-access`; unauthenticated → `/scholar-login`. (Full verification after Task 3.2 exists.)
- [ ] **Step 3: Commit** `feat(scholar): gated (scholar) route-group layout`

---

### Task 3.2: Auth surface pages

**Files:** Create `src/app/scholar-login/page.tsx`, `src/app/scholar-no-access/page.tsx`

- [ ] **Step 1: `scholar-login`** — copy `src/app/atlas-login/page.tsx`, then: replace branding with "Caelex Scholar", swap `safeAtlasUrl`→`safeScholarUrl` and default `/atlas`→`/scholar`, point footer to `/scholar-access` ("For universities"). Keep the credentials + Google `signIn` and MFA handling identical.

- [ ] **Step 2: `scholar-no-access`** (server) — **re-run the EXACT layout predicate** to avoid the documented infinite-redirect loop:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";

export default async function ScholarNoAccess() {
  const session = await auth();
  if (!session?.user?.id) redirect("/scholar-login?callbackUrl=%2Fscholar");

  const org = await getCurrentOrganization(session.user.id);
  const ok = org
    ? await hasProductAccess(org.organizationId, "SCHOLAR")
    : false;
  if (ok) redirect("/scholar"); // eligibility regained → don't strand the user

  return (
    <main className="min-h-screen grid place-items-center bg-navy-950 text-slate-200 p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-display-sm text-white">Kein Scholar-Zugang</h1>
        <p className="text-slate-400">
          Caelex Scholar wird über deine Hochschule lizenziert. Bitte melde dich
          mit deinem Campus-Login an, oder bitte deine Universität um
          Freischaltung.
        </p>
        <a
          href="/scholar-access"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Für Universitäten →
        </a>
      </div>
    </main>
  );
}
```

> **Critical:** the predicate here (`hasProductAccess(orgId,"SCHOLAR")`) must match the layout's byte-for-byte. If you later add a seat-cap check to the layout, add it here too.

- [ ] **Step 3: Manual check** — entitled user reaches `/scholar`; unentitled sees the no-access page with no redirect loop.
- [ ] **Step 4: Commit** `feat(scholar): scholar-login + scholar-no-access surface`

---

### Task 3.3: Search home page

**Files:** Create `src/app/(scholar)/scholar/page.tsx` (`"use client"`)

- [ ] **Step 1: Implement** — a client page that POSTs to `/api/scholar/search` and renders hits. **Do NOT import `@/data/legal-sources`** (not server-only; would bloat the client bundle and bypass the gate). Essentials:
  - search input + optional jurisdiction/type filters
  - `fetch("/api/scholar/search", { method: "POST", body: JSON.stringify({ query, jurisdiction, type }) })`
  - render `hits[]` → each links to `/scholar/sources/${hit.id}`
  - show a "semantic search off" hint when `semanticAvailable === false`
  - empty/loading/error states
- [ ] **Step 2: Manual check** — search "satellite" returns ranked hits; clicking a hit navigates to the detail route.
- [ ] **Step 3: Commit** `feat(scholar): corpus search home`

---

### Task 3.4: Source detail page

**Files:** Create `src/app/(scholar)/scholar/sources/[id]/page.tsx` (`"use client"`)

- [ ] **Step 1: Implement** — fetch `/api/scholar/sources/${id}`, render title/jurisdiction/status, `keyProvisions[]` (section, title, summary, complianceImplication), and `paragraphText` with a "truncated — view official source" link to `paragraphUrl` when `paragraphTextTruncated`. Link out to `sourceUrl`.
- [ ] **Step 2: Manual check** — a closed-licence entry (e.g. an `INT-ITU-…` id) shows capped text + the official-source link; a public-domain statute shows full provisions.
- [ ] **Step 3: Commit** `feat(scholar): source detail view (IP-capped)`

---

### Task 3.5: "For universities" lead page (optional)

**Files:** Create `src/app/scholar-access/page.tsx` — a simple public page describing the free institutional licence + a contact/request CTA (reuse the `atlas-access` structure). Commit `feat(scholar): for-universities access page`.

---

# PHASE 4 — Ops / launch (USER-GATED)

These need you (DB + infra + sales). Not agent-autonomous.

- [ ] **4.1 Migration** — locally: `npm run db:migrate:dev` (names the migration for the enum + `seatCap`). Prod applies via the deploy's `prisma db push --accept-data-loss` (non-destructive here). Verify post-deploy: `ProductCode` has `SCHOLAR`, `OrganizationProductAccess.seatCap` exists.
- [ ] **4.2 Grant a pilot university** — `grantProductAccess({ organizationId, product: "SCHOLAR", source: "INSTITUTIONAL", expiresAt: <term>, grantedById })` (extend `grantProductAccess` to accept `INSTITUTIONAL` + optional `seatCap` if you added it). Admin UI or a one-off script.
- [ ] **4.3 Semantic search** — set `ATLAS_SEMANTIC_ENABLED=true` for Scholar to get hybrid ranking (else keyword-only; still works). Embeddings already cover sources (`embeddings.json`, 800 entries) — no re-embed needed unless the corpus changed.
- [ ] **4.4 SSO return-url** — for the pilot org's `SSOConnection`, thread a `/scholar` return-url (clamp with `safeScholarUrl`); default SSO return is `/dashboard`.
- [ ] **4.5 E2E** — student SSO login → `/scholar` → search → open a source → confirm capped text on a closed-licence entry.
- [ ] **4.6 IP guard in CI** — confirm `npm run lint:legal-corpus` is green (it already guards the corpus; Scholar adds no new corpus data).
- [ ] **4.7 Deploy** — merge the `feat/caelex-scholar` branch → `main` → push (production). NOT from `fix/trade-to-92`.

---

## Self-Review (against the spec)

**Spec coverage:**

- Name/placement (`Caelex Scholar` @ `/scholar`) → Phase 3 route group ✅
- Free institutional licensing → `INSTITUTIONAL` source + `seatCap` (Task 1.1), grant (4.2); no payment code ✅
- Gated, institutional access via SSO → layout gate (3.1) + `getScholarAuth` (1.2) + SSO return-url (4.4) ✅
- SEO irrelevant / fully gated → no public crawlable corpus surface; only `scholar-access` lead page is public ✅
- Reuse full Atlas corpus → `searchLegalSources` over `ALL_SOURCES` (2.1), no new data ✅
- Searchable (keyword + semantic) → wrapper + API (2.1–2.2), `ATLAS_SEMANTIC_ENABLED` (4.3) ✅
- IP guardrail (ITU/ISO) → 600-char cap (2.3) + `lint:legal-corpus` (4.6) ✅
- Own search API, not the Atlas-gated one → `/api/scholar/*` (2.2–2.3) ✅
- `safeScholarUrl`, `scholar` rate tier, audit verbs → 1.3, 1.4, 1.5 ✅

**Placeholder scan:** UI tasks (3.3/3.4) describe behaviour + the exact fetch contract + the no-import rule rather than full JSX — acceptable for client pages verified manually; the one `{/* TODO(impl): ScholarShell */}` is a cosmetic shell, not logic. All backend logic has complete code.

**Type consistency:** `ScholarAuthContext` (1.2) ↔ route mocks (2.2); `ScholarSearchResult`/`ScholarSearchHit` (2.1) ↔ search route + UI; `ScholarSourceDetail`/`ScholarProvision` (2.3) ↔ detail route + UI. `hasProductAccess(orgId,"SCHOLAR")` is consistent across 1.2 / 3.1 / 3.2 — and depends on Task 1.1 landing first (correct ordering).

**Open follow-ups (non-blocking):** unify the 600-char cap into one shared helper used by both korpus-tools and Scholar (currently mirrored with a sync note); land F3 (`server-only` on the corpus barrel) to _enforce_ the no-client-import rule rather than relying on discipline.
