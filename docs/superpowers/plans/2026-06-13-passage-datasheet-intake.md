# Passage Datasheet-Intake — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/trade/assess` — upload a product datasheet (PDF) → confirm an evidence-cited classification → see a global "where can I ship this?" landscape → get a sharp, audit-trailed single verdict for a chosen destination + screened buyer.

**Architecture:** ~80 % composition of shipped pieces (datasheet extraction, the classifier, the deployed origin-determination engine, `deriveVerdict`, `DatasheetDropzone`, `VerdictPanel`, `TradeItemClassificationDraft`). The only genuinely new logic is `landscape.server.ts` — the **golden-set matrix harness productized**: run `classifyItemForOperation` + `deriveVerdict` (with a synthetic clean screening) over ~18 destinations for one real item, bucket GO/REVIEW/BLOCKED. Plus a thin route, the guided wizard, and persistence wiring.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Vitest, Prisma (Neon). No new deps, no DB migration in v1.

**Spec:** `docs/superpowers/specs/2026-06-13-passage-datasheet-intake-design.md`.

**Hard invariants (carry into every task):**

- **No false-CLEARED** — every GO (landscape or single) is engine-derived + cited; inherited from the deployed engine. Never synthesize a GO.
- **Human confirms the classification** before any verdict is computed/shown.
- **Clean-buyer caption is mandatory** on the landscape (it assumes a clean end-user; the single verdict uses the real screening).
- **Low-confidence / no-extraction → honest manual-entry fallback**, never a guessed code.
- Branch off `origin/main`; commitlint lowercase ≤100; explicit `git add`; never `--no-verify`; `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (baseline 666; component tests run under node-20 — local node-24 wedges jsdom collection, a known infra caveat).

---

## File Structure

**Create:**

- `src/lib/trade/landscape.ts` — pure types + `LANDSCAPE_DESTINATIONS` constant + `bucketize` (no server-only deps, importable by tests + client for labels).
- `src/lib/trade/landscape.server.ts` — `runDestinationLandscape(item, opts)`; imports the engine (server-only).
- `src/lib/trade/landscape.server.test.ts` — unit tests (golden-style).
- `src/app/api/trade/assess/landscape/route.ts` — `POST` thin wrapper.
- `src/app/api/trade/assess/landscape/route.test.ts` — route test.
- `src/app/(trade)/trade/assess/page.tsx` — the flow entry (server component shell).
- `src/app/(trade)/trade/assess/_components/AssessFlow.tsx` — client wizard orchestrator (the 4 screens / state machine).
- `src/app/(trade)/trade/assess/_components/ClassifyConfirm.tsx` — Screen 2 (classification + confirm).
- `src/app/(trade)/trade/assess/_components/LandscapeView.tsx` — Screen 3 (the buckets).
- `src/app/(trade)/trade/assess/_components/AssessFlow.test.tsx` — wizard render/flow tests.
- `src/app/api/trade/assess/from-datasheet/route.ts` — `POST` persistence: confirmed classification → create `TradeItem` + `TradeItemClassificationDraft`; returns `{ itemId }`.
- `src/app/api/trade/assess/from-datasheet/route.test.ts`.

**Reuse (no change — import only):** `DatasheetDropzone.tsx`, `POST /api/trade/classify/extract-vision`, `suggestionsFromAttributesAndText` (`classify-suggest.ts:129`), `classifyItemForOperation` (`classify-item.ts:105`), `deriveVerdict` (`operation-assistant-verdict.ts:439`), `originRegimes` (`origin-regime-map.ts`), `assessOperation` + `POST /api/trade/operations` + `/[id]/lines` + `/[id]/assess`, `VerdictPanel.tsx`, Prisma `TradeItem` / `TradeOperation` / `TradeOperationLine` / `TradeItemClassificationDraft`.

**Modify (light):** the Trade sidebar/nav — add a `/trade/assess` entry.

---

## Task 1: Landscape types + destination set (`landscape.ts`)

**Files:**

- Create: `src/lib/trade/landscape.ts`
- Test: `src/lib/trade/landscape.server.test.ts` (added in Task 2; the pure constant is asserted there)

- [ ] **Step 1: Create the pure module.** No engine imports here (keeps it client-safe for labels).

```ts
// src/lib/trade/landscape.ts
/**
 * Passage Liefer-Landkarte — pure types + the curated destination set.
 * The runner lives in `landscape.server.ts` (imports the engine).
 */
import type { Verdict } from "./operation-assistant-verdict";

/** One destination's verdict + the cited reason (from the engine's row). */
export interface LandscapeCell {
  /** ISO-2 destination. */
  country: string;
  verdict: Verdict; // "GO" | "REVIEW" | "BLOCKED"
  /** The licence/reason line from the engine for this destination (cited). */
  detail: string;
}

export interface LandscapeResult {
  go: LandscapeCell[];
  review: LandscapeCell[];
  blocked: LandscapeCell[];
  /** Always set — the clean-buyer honesty caption (rendered verbatim). */
  caption: string;
}

export const LANDSCAPE_CAPTION =
  "Annahme: sauberer Endkunde — im nächsten Schritt mit dem echten Käufer verschärft.";

/**
 * Curated ~18 destinations: the EU001/friendly allies + an EU-27 sample +
 * the watch set + the hard-block set so the red zone is always visible.
 * Tuned later (spec §10 fast-follow). ISO-2.
 */
export const LANDSCAPE_DESTINATIONS: readonly string[] = [
  // EU001/friendly allies
  "US",
  "JP",
  "CA",
  "AU",
  "NZ",
  "NO",
  "CH",
  "GB",
  // EU-27 sample
  "DE",
  "FR",
  "IT",
  "NL",
  "ES",
  // watch set
  "IN",
  "CN",
  // hard-block set (always red — proves the engine blocks them)
  "RU",
  "BY",
  "IR",
  "KP",
  "SY",
  "CU",
] as const;
```

- [ ] **Step 2: Commit.**

```bash
git add src/lib/trade/landscape.ts
git commit -m "feat(trade): liefer-landkarte pure types + destination set"
```

---

## Task 2: The landscape runner (`landscape.server.ts`) — the heart

**Files:**

- Create: `src/lib/trade/landscape.server.ts`
- Test: `src/lib/trade/landscape.server.test.ts`

**Context for the engineer:** This is the golden-set matrix harness (`src/lib/comply-v2/trade/classification/golden-set/golden-set.test.ts` → `runPipeline`) turned into a runtime function. Read that `runPipeline` + `SYNTHETIC_CLEAR_SCREENING` first — you are reproducing it over `LANDSCAPE_DESTINATIONS` for one real item. The engine call is `classifyItemForOperation(item, opts)` (`classify-item.ts:105`) → wrap as a `LineAssessment` → `deriveVerdict([line], screening)` (`operation-assistant-verdict.ts:439`). Same engine as the single verdict → no divergence.

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/trade/landscape.server.test.ts
import { describe, it, expect } from "vitest";
import { runDestinationLandscape } from "./landscape.server";
import type { ClassifiableItem } from "./classification/classify-item";

// A DE-seated exporter (matches the golden harness origin).
const DE_OPTS = { exporterSeat: "DE" as const };

describe("runDestinationLandscape", () => {
  it("buckets a sensitive MTCR item (9A004 sat-bus) fail-closed: never GO; RU/embargoes BLOCKED", () => {
    const satBus: ClassifiableItem = {
      name: "500kg LEO Satellitenbus",
      description: "3-axis stabilized, S-band TT&C",
      payloadKg: 500,
      eccnEU: "9A004",
    };
    const r = runDestinationLandscape(satBus, DE_OPTS);
    const all = [...r.go, ...r.review, ...r.blocked];
    expect(all).toHaveLength(20); // LANDSCAPE_DESTINATIONS length
    // 9A004 is an EU Annex IV member → never a bare GO anywhere (fail-closed).
    expect(r.go.find((c) => c.country === "US")).toBeUndefined();
    // Hard-block destinations are BLOCKED.
    for (const iso of ["RU", "BY", "IR", "KP"]) {
      expect(r.blocked.map((c) => c.country)).toContain(iso);
    }
    // The honesty caption is always present.
    expect(r.caption).toContain("sauberer Endkunde");
  });

  it("an EU001-eligible non-sensitive item (5A002) is GO to friendly allies, BLOCKED to RU", () => {
    const crypto: ClassifiableItem = {
      name: "TT&C Ground station AES-256",
      description: "Uplink encryption AES-256",
      eccnEU: "5A002",
    };
    const r = runDestinationLandscape(crypto, DE_OPTS);
    expect(r.go.map((c) => c.country)).toEqual(
      expect.arrayContaining(["US", "JP"]),
    );
    expect(r.blocked.map((c) => c.country)).toContain("RU");
  });

  it("an uncontrolled item is GO everywhere (no control code, no engine block)", () => {
    const wheel: ClassifiableItem = {
      name: "Reaction wheel 1 Nms",
      description: "AOCS wheel",
    };
    const r = runDestinationLandscape(wheel, DE_OPTS);
    expect(r.review).toHaveLength(0);
    expect(r.blocked).toHaveLength(0);
    expect(r.go).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run it — verify it fails.**

Run: `npx vitest run src/lib/trade/landscape.server.test.ts --no-file-parallelism`
Expected: FAIL — `runDestinationLandscape` not exported.

- [ ] **Step 3: Implement the runner.**

```ts
// src/lib/trade/landscape.server.ts
import "server-only";
import {
  classifyItemForOperation,
  type ClassifiableItem,
  type ClassifyOptions,
} from "./classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
} from "./operation-assistant-verdict";
import { originRegimes } from "@/lib/comply-v2/trade/classification/origin-regime-map";
import {
  LANDSCAPE_DESTINATIONS,
  LANDSCAPE_CAPTION,
  type LandscapeCell,
  type LandscapeResult,
} from "./landscape";

/**
 * Synthetic all-CLEAR screening — the landscape is party-less by design
 * (the clean-buyer assumption). Mirrors the golden harness's
 * SYNTHETIC_CLEAR_SCREENING: `lastScreenedAt: null` means "freshness unknown",
 * which deriveVerdict does NOT downgrade to a gap, so the screening never
 * artificially inflates the verdict.
 */
const CLEAN: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Landscape (clean-buyer assumption)",
  partyBlocked: false,
  lastScreenedAt: null,
};

/** The cited detail line for a cell — the origin/licence requirement reason. */
function cellDetail(
  classification: ReturnType<typeof classifyItemForOperation>,
): string {
  const reqs = classification.licenseDetermination.requirements;
  // Prefer an origin-determination row (carries the cited licence), else the first.
  const origin = reqs.find((r) => (r.triggerCode ?? "").startsWith("ORIGIN_"));
  return (origin ?? reqs[0])?.reason ?? "Keine Genehmigung erforderlich.";
}

/**
 * Run the engine over LANDSCAPE_DESTINATIONS for one classified item under a
 * clean-buyer assumption, bucketed GO/REVIEW/BLOCKED. Pure (no DB / AI / HTTP).
 *
 * `opts` carries the exporter seat; the exporter origin is resolved here (only
 * forwarded when supported, matching the server source + golden harness).
 */
export function runDestinationLandscape(
  item: ClassifiableItem,
  opts: { exporterSeat?: string } = {},
): LandscapeResult {
  const origin = opts.exporterSeat
    ? originRegimes(opts.exporterSeat)
    : undefined;
  const go: LandscapeCell[] = [];
  const review: LandscapeCell[] = [];
  const blocked: LandscapeCell[] = [];

  for (const country of LANDSCAPE_DESTINATIONS) {
    const classifyOpts: ClassifyOptions = {
      destinationCountry: country,
      exporterSeat: opts.exporterSeat,
      ...(origin?.supported ? { exporterOrigin: origin } : {}),
    };
    const classification = classifyItemForOperation(item, classifyOpts);
    const line: LineAssessment = {
      lineId: `landscape-${country}`,
      itemId: "landscape",
      itemName: item.name,
      classified: true,
      classification,
    };
    const { verdict } = deriveVerdict([line], CLEAN);
    const cell: LandscapeCell = {
      country,
      verdict,
      detail: cellDetail(classification),
    };
    if (verdict === "GO") go.push(cell);
    else if (verdict === "REVIEW") review.push(cell);
    else blocked.push(cell);
  }

  return { go, review, blocked, caption: LANDSCAPE_CAPTION };
}
```

- [ ] **Step 4: Run the test — verify it passes.**

Run: `npx vitest run src/lib/trade/landscape.server.test.ts --no-file-parallelism`
Expected: PASS (3 tests). If the 9A004 "never GO" assertion fails, STOP — that is a fail-closed regression, not a test bug.

- [ ] **Step 5: tsc + commit.**

```bash
NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit   # expect 666, 0 in landscape*
git add src/lib/trade/landscape.ts src/lib/trade/landscape.server.ts src/lib/trade/landscape.server.test.ts
git commit -m "feat(trade): destination-landscape runner (golden-harness pattern, fail-closed)"
```

---

## Task 3: Landscape API route (`/api/trade/assess/landscape`)

**Files:**

- Create: `src/app/api/trade/assess/landscape/route.ts`, `…/route.test.ts`

**Context:** Copy the auth + JSON-validation shape from a nearby Trade route (e.g. `src/app/api/trade/classify/extract-vision/route.ts` for the auth guard pattern). Body = the confirmed classifiable item (name, description, declared codes, attributes) + the exporter seat (resolved server-side from the org if omitted, but accept it for v1 simplicity).

- [ ] **Step 1: Write the failing route test** (auth-gated; returns buckets for a posted item). Mirror an existing Trade `route.test.ts` for the auth-mock setup.

```ts
// src/app/api/trade/assess/landscape/route.test.ts
import { describe, it, expect, vi } from "vitest";
// (mock auth/session per the pattern in a sibling trade route.test.ts)
import { POST } from "./route";

describe("POST /api/trade/assess/landscape", () => {
  it("returns GO/REVIEW/BLOCKED buckets for a posted item", async () => {
    const req = new Request("http://t/api/trade/assess/landscape", {
      method: "POST",
      body: JSON.stringify({
        item: { name: "Reaction wheel", description: "AOCS" },
        exporterSeat: "DE",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.caption).toContain("sauberer Endkunde");
    expect(Array.isArray(json.go)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`POST` undefined). `npx vitest run src/app/api/trade/assess/landscape/route.test.ts --no-file-parallelism`

- [ ] **Step 3: Implement the route** — auth guard (reuse the org-session helper used by sibling trade routes), Zod-validate `{ item, exporterSeat? }`, call `runDestinationLandscape`, return the `LandscapeResult` as JSON. Keep ≤40 lines. The item shape maps 1:1 to `ClassifiableItem`.

- [ ] **Step 4: Run → PASS.** Then `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (666).

- [ ] **Step 5: Commit.** `git commit -m "feat(trade): /api/trade/assess/landscape route"`

---

## Task 4: Persistence — confirmed classification → TradeItem + draft

**Files:**

- Create: `src/app/api/trade/assess/from-datasheet/route.ts`, `…/route.test.ts`

**Context:** Reuse how `/trade/classify` accept-flow persists a `TradeItemClassificationDraft` and how `/trade/items` creates a `TradeItem`. Read both before writing. v1 does NOT persist the raw PDF to R2 (spec §10) — store `sourceFilename` + the extraction snapshot on the draft (audit), nothing more.

- [ ] **Step 1: Write the failing test** — POST `{ item, confirmedCode, evidence, sourceFilename }` creates a `TradeItem` (status `REQUIRES_REVIEW`, the confirmed code set) + a `TradeItemClassificationDraft` (decision `ACCEPTED`, `acceptedSnapshot`), returns `{ itemId }`. Mock Prisma per the sibling route tests.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — auth guard; in a Prisma `$transaction`: create `TradeItem` (org-scoped, the confirmed `eccnEU`/`eccnUS`/`usmlCategory`, status `REQUIRES_REVIEW`, attributes from the extraction) + create `TradeItemClassificationDraft` (`tradeItemId`, `evidence`, `sourceFilename`, `decision: "ACCEPTED"`, `reviewedBy`, `acceptedSnapshot`). Return the new `itemId`.

- [ ] **Step 4: Run → PASS.** tsc 666.

- [ ] **Step 5: Commit.** `git commit -m "feat(trade): persist confirmed datasheet classification (item + audited draft)"`

---

## Task 5: The wizard UI — `/trade/assess` (Screens 1–2: upload + classify-confirm)

**Files:**

- Create: `src/app/(trade)/trade/assess/page.tsx` (server shell → renders `AssessFlow`)
- Create: `src/app/(trade)/trade/assess/_components/AssessFlow.tsx` (client state machine: `upload | classify | landscape | verdict`)
- Create: `src/app/(trade)/trade/assess/_components/ClassifyConfirm.tsx`
- Test: `src/app/(trade)/trade/assess/_components/AssessFlow.test.tsx`

**Context:** Reuse `DatasheetDropzone` (uploads to `/api/trade/classify/extract-vision`, returns the merged extraction). Pass its result to `ClassifyConfirm`, which renders the top classification + evidence spans + confidence + alternatives (from `suggestionsFromAttributesAndText`), with a one-click **Bestätigen**. On confirm → POST `/api/trade/assess/from-datasheet` (Task 4) → advance to landscape with `{ itemId, item }`.

- [ ] **Step 1: Write the failing flow test** (jsdom — note: run under node-20). Assert: rendering `AssessFlow` shows the dropzone; after a mocked extraction the classification + a **Bestätigen** button appear; clicking it (with a mocked `from-datasheet` 200) advances to the landscape step. Mock `fetch`, `DatasheetDropzone` (fire its `onExtracted` callback), and the heavy children — mirror the `VerdictPanel.test.tsx` mock setup (`vi.mock` lucide + child panels).

- [ ] **Step 2: Run → FAIL.** `npx vitest run AssessFlow.test --no-file-parallelism` (under node-20).

- [ ] **Step 3: Implement `AssessFlow` + `ClassifyConfirm`.** State machine; Screen 1 = `DatasheetDropzone`; Screen 2 = `ClassifyConfirm` (top proposal + evidence + alternatives + **Bestätigen** / "Code manuell wählen" fallback when confidence is low or extraction empty — the honesty rule §7.4). No verdict is computed until confirm.

- [ ] **Step 4: Run → PASS.** tsc 666.

- [ ] **Step 5: Commit.** `git commit -m "feat(trade): /trade/assess wizard — upload + classify-confirm (screens 1-2)"`

---

## Task 6: The wizard UI — Screen 3 (Liefer-Landkarte)

**Files:**

- Create: `src/app/(trade)/trade/assess/_components/LandscapeView.tsx`
- Modify: `AssessFlow.tsx` (wire the landscape step), `AssessFlow.test.tsx` (add a landscape assertion)

- [ ] **Step 1: Add the failing test** — on entering the landscape step, `AssessFlow` POSTs `/api/trade/assess/landscape` (mock 200 with `go/review/blocked/caption`); `LandscapeView` renders the three buckets, the mandatory caption (`/sauberer Endkunde/`), and each destination is clickable → advances to the verdict step with the chosen country.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `LandscapeView`** — three labelled groups (🟢 GO / 🟡 REVIEW / 🔴 VERBOTEN) with country + the cited `detail`; the caption rendered verbatim from `LANDSCAPE_CAPTION`; clicking a country sets the chosen destination and advances. Plus a free-text "anderes Ziel" input.

- [ ] **Step 4: Run → PASS.** tsc 666.

- [ ] **Step 5: Commit.** `git commit -m "feat(trade): /trade/assess liefer-landkarte (screen 3)"`

---

## Task 7: The wizard UI — Screen 4 (single verdict) + nav

**Files:**

- Modify: `AssessFlow.tsx` (verdict step), `AssessFlow.test.tsx`
- Modify: the Trade sidebar/nav component (add `/trade/assess`)

**Context:** On the verdict step, collect **Endkunde** (a `PartyPicker` or a name → screened) + optional **Endverwendung**, then create a `TradeOperation` (POST `/api/trade/operations`) with `shipToCountry` = the chosen destination + a line for `itemId` (POST `/[id]/lines`), then render the **existing `VerdictPanel`** with that `operationId` (it fetches `/[id]/assess` itself — no new render code). Read `operations/new/page.tsx` for the exact create-operation + create-line request bodies and reuse them verbatim.

- [ ] **Step 1: Add the failing test** — entering the verdict step with a chosen destination + buyer creates an operation (mock the two POSTs) and mounts `VerdictPanel` with the returned `operationId` (assert `VerdictPanel` is rendered / its assess endpoint is called).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** the verdict step (buyer + end-use inputs → create operation + line → `<VerdictPanel operationId={id} />`) and add the sidebar nav entry to `/trade/assess`.

- [ ] **Step 4: Run → PASS.** tsc 666.

- [ ] **Step 5: Commit.** `git commit -m "feat(trade): /trade/assess single verdict (screen 4) + nav entry"`

---

## Task 8: End-to-end consistency test + wrap

**Files:**

- Create: `src/lib/trade/landscape.consistency.test.ts`

- [ ] **Step 1: Write the consistency test** — for a fixture item + a chosen destination D, assert the **single-verdict path** (`classifyItemForOperation` + `deriveVerdict` with the CLEAN screening for D) equals the **landscape bucket** for D (same engine → must agree). Then assert that with a _tainted_ screening (e.g. Annex IV) the single verdict is **≥ severity** of the landscape cell (tightens, never loosens). This pins the spec §9 consistency + §7.3 honesty.

- [ ] **Step 2: Run → PASS.** `npx vitest run src/lib/trade/landscape.consistency.test.ts --no-file-parallelism`

- [ ] **Step 3: Full regression + tsc.** `npx vitest run src/lib/trade src/lib/comply-v2/trade "src/lib/comply-v2/trade/classification/golden-set/" --no-file-parallelism` (all green); `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (666). Component tests under node-20.

- [ ] **Step 4: Commit.** `git commit -m "test(trade): landscape↔single-verdict consistency + fail-closed wrap"`

---

## Self-Review (done at write time)

- **Spec coverage:** §3 flow → Tasks 5/6/7 (4 screens). §4 reuse map → "Reuse" list + Task imports. §4.2 landscape runner → Task 2. §4.3 route → Task 3. §4.4 persistence → Task 4. §5 mechanism (golden-harness, clean-buyer, destination set) → Tasks 1/2 (real code). §6 data flow → Tasks 4→3→7 ordering. §7 safety invariants → Task 2 fail-closed test, Task 5 human-confirm + manual fallback, Task 6 mandatory caption, Task 8 consistency/tighten-never-loosen. §8 error handling → Task 5 low-confidence fallback. §9 testing → Tasks 2/3/4/5/6/7/8. §10 scope (v1, no R2, no migration, single item) → respected (Task 4 note, no Prisma migration). §11 files → File Structure. No gaps.
- **Placeholder scan:** the load-bearing new logic (`landscape.ts`, `landscape.server.ts`) has complete code. UI/route/persistence tasks reference exact existing patterns to copy (auth guard, operation-create bodies, draft-persist) rather than restating large existing code — this is "follow the established pattern", not a placeholder; each names the exact sibling file to read + the precise behaviour + the test that pins it.
- **Type consistency:** `ClassifiableItem`/`ClassifyOptions`/`ClassificationResult` (classify-item.ts:105), `LineAssessment`/`ScreeningAssessment`/`deriveVerdict`/`Verdict` (operation-assistant-verdict.ts:439), `originRegimes` (origin-regime-map), `LandscapeResult`/`LandscapeCell`/`LANDSCAPE_DESTINATIONS`/`LANDSCAPE_CAPTION` (landscape.ts) — all consistent across Tasks 1→2→3→8. `CLEAN` mirrors the golden `SYNTHETIC_CLEAR_SCREENING`.
