# Atlas Correctness Batch 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six "silently broken for pilot lawyers" correctness defects from the Atlas audit (A-H2 ciphertext in drafts/exports, A-H5 dead deadline reminders, A-H9 no-op clause attachment, A-H10 unrecoverable saved drafts, A-H3 invisible RAG staleness) plus remove proven dead code (§6) — small, low-risk, mostly no-migration changes.

**Architecture:** Each fix mirrors an existing, verified pattern in the codebase (decryption → `mandate-context.ts`; notification fan-out → `notify.ts`; localStorage store → `clause-library.ts`/`drafting-history.ts`). One additive enum migration (A-H5). No new external dependencies, no Claude/OpenAI cost. TDD throughout.

**Tech Stack:** Next.js 15 App Router, Prisma (Neon, deploy via `prisma db push`), Vitest, NextAuth v5, AES-256-GCM (`atlas-encryption.ts`), localStorage stores.

**Branch / freeze:** Atlas is scope-frozen. Work on a **dedicated branch `fix/atlas-correctness`** off `main`; commit with `ALLOW_CROSS_SURFACE=1` (the `.husky/pre-commit` guard blocks atlas paths otherwise — do NOT use `--no-verify`). Deploy = merge→main→push, batched. The A-H5 enum is the single DB-affecting change; it auto-applies via `db push` on deploy (additive, safe).

**Source of findings:** `docs/CAELEX-ATLAS-FINDINGS-BACKLOG-2026-06-02.md`.

---

## File Structure

**Create:**

- `src/lib/atlas/drafting-chat/attached-clauses-store.ts` — localStorage store of attached clause IDs (A-H9)
- `src/lib/atlas/drafting-chat/attached-clauses-store.test.ts`
- `scripts/check-embeddings-freshness.ts` — CI guard: corpus vs embeddings.json drift (A-H3)
- `src/lib/atlas/embeddings-freshness.ts` + `.test.ts` — pure gap computation reused by the script (A-H3)

**Modify:**

- `src/lib/atlas/mandate-scaffold-context.server.ts` — decrypt 3 PII fields (A-H2)
- `src/app/api/atlas/mandate/[id]/export/route.ts` — decrypt 3 PII fields (A-H2)
- `prisma/schema.prisma` — add `DEADLINE_WARNING` to `AtlasNotificationKind` (A-H5)
- `src/lib/atlas/notify.ts` — add `dispatchDeadlineWarnings()` (A-H5)
- `src/app/api/cron/atlas-deadline-reminders/route.ts` — call the dispatcher instead of logging (A-H5)
- `src/lib/atlas/drafting-chat/browser-context.ts` — resolve attached clause IDs → `Clause[]` (A-H9)
- `src/lib/atlas/drafting-chat/action-executor.ts` — wire attach/detach + thread draft body (A-H9, A-H10)
- `src/lib/atlas/drafting-history.ts` — add optional `body` to `DraftLibraryEntry` (A-H10)
- `src/lib/atlas/drafting-chat/types.ts` — add `body?` to `push_to_library` action (A-H10)
- `src/lib/atlas/drafting-chat/engine.server.ts` — include generated body on the `push_to_library` action (A-H10)
- `src/app/(atlas)/atlas/drafting/history/page.tsx` — show/restore the persisted body (A-H10)
- the semantic-search UI consumer — surface "index degraded" signal (A-H3)
- `package.json` + `.github/workflows/ci.yml` — wire the freshness check (A-H3)

**Delete (after per-file grep proves 0 importers):** `src/app/(atlas)/atlas/AtlasShell.tsx`, `src/app/(atlas)/atlas/_components/CommandPalette.tsx`, `src/app/(atlas)/atlas/_components/CommandPaletteModal.tsx`, `src/components/atlas/{AtlasAstraChat,LegalNetwork,RegulatoryMap,LiveFeed,QuickStats,ForecastTimelineRibbon,JurisdictionTable}.tsx`, `src/data/regulatory/*`. **NOT** `clause-library.ts` (live; used by A-H9 + studio).

---

## Task 1 — A-H2: decrypt mandate PII in scaffold-context + export

**Files:**

- Modify: `src/lib/atlas/mandate-scaffold-context.server.ts:29,93-105`
- Modify: `src/app/api/atlas/mandate/[id]/export/route.ts:~92`
- Test: `src/lib/atlas/mandate-scaffold-context.server.test.ts` (exists)

- [ ] **Step 1 — Failing test:** add to `mandate-scaffold-context.server.test.ts` a case where the mocked `prisma.atlasMandate.findFirst` returns encrypted-shaped values and assert the resolved context is decrypted. Mirror how `mandate-context` is tested. Mock `decryptAtlasField` to map `"ENC:x"` → `"x"`.

```ts
vi.mock("./atlas-encryption", () => ({
  decryptAtlasField: vi.fn(async (v: string | null) =>
    v == null ? v : v.startsWith("ENC:") ? v.slice(4) : v,
  ),
}));

it("decrypts clientName/clientContact/customInstructions", async () => {
  prismaMock.atlasMandate.findFirst.mockResolvedValue({
    id: "m1",
    name: "M",
    jurisdiction: null,
    operatorType: null,
    primaryAuthority: null,
    clientName: "ENC:ACME",
    clientContact: "ENC:c@x",
    customInstructions: "ENC:be terse",
    parties: [],
    owner: null,
  });
  const ctx = await loadMandateScaffoldContext({
    mandateId: "m1",
    callerUserId: "u1",
    callerOrgId: "o1",
  });
  expect(ctx?.clientName).toBe("ACME");
  expect(ctx?.clientContact).toBe("c@x");
  expect(ctx?.customInstructions).toBe("be terse");
});
```

- [ ] **Step 2 — Run, expect FAIL** (`npx vitest run src/lib/atlas/mandate-scaffold-context.server.test.ts`) — current code returns `ENC:` ciphertext.

- [ ] **Step 3 — Implement** in `mandate-scaffold-context.server.ts`: add `import { decryptAtlasField } from "./atlas-encryption";`, and replace the `return {...}` (lines 93-105) with a decrypt-then-return mirroring `mandate-context.ts:67-71`:

```ts
if (!m) return null;
const [clientName, clientContact, customInstructions] = await Promise.all([
  decryptAtlasField(m.clientName),
  decryptAtlasField(m.clientContact),
  decryptAtlasField(m.customInstructions),
]);
return {
  id: m.id,
  name: m.name,
  jurisdiction: m.jurisdiction,
  operatorType: m.operatorType,
  primaryAuthority: m.primaryAuthority,
  clientName,
  clientContact,
  customInstructions,
  parties: m.parties,
  ownerName: m.owner?.name ?? null,
  ownerEmail: m.owner?.email ?? null,
};
```

- [ ] **Step 4 — Apply the same to the export route.** In `mandate/[id]/export/route.ts`, after the `findFirst` (~line 92) and before the render that reads `mandate.clientName/clientContact/customInstructions` (207-209, 329-332), decrypt those three fields. Add `import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";`. Reassign into locals (e.g. `const clientName = await decryptAtlasField(mandate.clientName)`) and use the locals in the `lines.push(...)`.

- [ ] **Step 5 — Run, expect PASS;** then `npx tsc --noEmit` on the two files (expect no new errors).

- [ ] **Step 6 — Commit** `fix(atlas): decrypt mandate PII in scaffold-context + export (A-H2)`.

---

## Task 2 — A-H5: real deadline-reminder notifications

**Files:**

- Modify: `prisma/schema.prisma` (`AtlasNotificationKind`)
- Modify: `src/lib/atlas/notify.ts` (add `dispatchDeadlineWarnings`)
- Modify: `src/app/api/cron/atlas-deadline-reminders/route.ts:101-125`
- Test: `src/lib/atlas/notify.test.ts` (exists)

- [ ] **Step 1 — Add enum value.** In `prisma/schema.prisma` `enum AtlasNotificationKind` add:

```prisma
  // A mandate deadline is within its warn-window (or overdue). Fanned
  // out by the atlas-deadline-reminders cron to the mandate owner + members.
  DEADLINE_WARNING
```

Then `npx prisma generate`.

- [ ] **Step 2 — Failing test** in `notify.test.ts`: `dispatchDeadlineWarnings` (a) skips (userId,deadlineId) pairs already notified within 20h, (b) `createMany`s a row per remaining (user × deadline) with `kind: DEADLINE_WARNING`, `targetType: "DEADLINE"`, `targetId: deadlineId`. Mock `prisma.atlasNotification.findMany` (existing) + `.createMany`.

```ts
it("dedups within 20h and fans out per user×deadline", async () => {
  prismaMock.atlasNotification.findMany.mockResolvedValue([
    { userId: "u1", targetId: "d1" },
  ]);
  await dispatchDeadlineWarnings([
    {
      deadlineId: "d1",
      mandateId: "m1",
      mandateName: "Sky-Sat",
      title: "BNetzA",
      phrase: "fällig in 3 Tagen",
      organizationId: "o1",
      userIds: new Set(["u1", "u2"]),
    },
  ]);
  const rows = prismaMock.atlasNotification.createMany.mock.calls[0][0].data;
  expect(rows).toHaveLength(1); // u1 already notified → only u2
  expect(rows[0]).toMatchObject({
    userId: "u2",
    kind: "DEADLINE_WARNING",
    targetType: "DEADLINE",
    targetId: "d1",
  });
});
```

- [ ] **Step 3 — Run, expect FAIL** (function undefined).

- [ ] **Step 4 — Implement `dispatchDeadlineWarnings`** in `notify.ts` (mirror the `createMany` style of `dispatchSourceAmendment`; non-blocking try/catch):

```ts
interface DeadlineTarget {
  deadlineId: string;
  mandateId: string;
  mandateName: string;
  title: string;
  phrase: string;
  organizationId: string;
  userIds: Set<string>;
}

export async function dispatchDeadlineWarnings(
  targets: DeadlineTarget[],
): Promise<{ created: number }> {
  if (targets.length === 0) return { created: 0 };
  try {
    const deadlineIds = targets.map((t) => t.deadlineId);
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const recent = await prisma.atlasNotification.findMany({
      where: {
        kind: AtlasNotificationKind.DEADLINE_WARNING,
        targetType: "DEADLINE",
        targetId: { in: deadlineIds },
        createdAt: { gte: since },
      },
      select: { userId: true, targetId: true },
    });
    const seen = new Set(recent.map((r) => `${r.userId}:${r.targetId}`));
    const data = targets.flatMap((t) =>
      [...t.userIds]
        .filter((uid) => !seen.has(`${uid}:${t.deadlineId}`))
        .map((uid) => ({
          userId: uid,
          organizationId: t.organizationId,
          kind: AtlasNotificationKind.DEADLINE_WARNING,
          title: `Frist: ${t.title} (${t.mandateName})`,
          summary: `${t.title} — ${t.phrase}.`,
          targetType: "DEADLINE",
          targetId: t.deadlineId,
          sourceId: null,
        })),
    );
    if (data.length === 0) return { created: 0 };
    await prisma.atlasNotification.createMany({ data, skipDuplicates: false });
    logger.info("Atlas deadline-warning fan-out complete", {
      targets: targets.length,
      created: data.length,
    });
    return { created: data.length };
  } catch (err) {
    logger.warn("Atlas deadline-warning dispatch failed (non-blocking)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { created: 0 };
  }
}
```

- [ ] **Step 5 — Wire the cron.** In `atlas-deadline-reminders/route.ts`, add `organizationId` + `phrase` to each `targets` entry (the model already selects `mandate.organizationId`), then replace the logging loop (lines 108-125) with:

```ts
const { created } = await dispatchDeadlineWarnings(
  targets.map((t) => ({
    deadlineId: t.deadlineId,
    mandateId: t.mandateId,
    mandateName: t.mandateName,
    title: t.title,
    phrase: phraseFor(t.daysToGo),
    organizationId: t.organizationId,
    userIds: t.userIds,
  })),
);
```

(extract the existing inline phrase logic into a small `phraseFor(daysToGo)` helper; add `organizationId: d.mandate.organizationId` to the `targets.push({...})`). Return `created` in the JSON.

- [ ] **Step 6 — Run notify tests + typecheck; commit** `feat(atlas): real deadline-reminder notifications (A-H5)`.

---

## Task 3 — A-H9: working clause attachment in drafting chat

**Files:**

- Create: `src/lib/atlas/drafting-chat/attached-clauses-store.ts` + `.test.ts`
- Modify: `src/lib/atlas/drafting-chat/browser-context.ts:82`
- Modify: `src/lib/atlas/drafting-chat/action-executor.ts:147-157`

Scope note: this makes the **chat** surface's attach/detach genuinely work (the injection path `buildClauseDirective` already exists). The studio keeps its own React state; a later bundle can unify both onto this store.

- [ ] **Step 1 — Failing test** for the store: `attachClause`/`detachClause`/`getAttachedClauseIds` round-trip via a mocked localStorage; dedupes; caps.

- [ ] **Step 2 — Run, expect FAIL.**

- [ ] **Step 3 — Implement `attached-clauses-store.ts`** (mirror `clause-library.ts` defensive shape):

```ts
"use client";
export const ATTACHED_CLAUSES_KEY = "atlas-drafting-attached-clauses";
const CAP = 25;
export function getAttachedClauseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTACHED_CLAUSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
function write(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ATTACHED_CLAUSES_KEY,
      JSON.stringify(ids.slice(0, CAP)),
    );
  } catch {}
}
export function attachClause(id: string): void {
  const s = getAttachedClauseIds();
  if (!s.includes(id)) write([id, ...s]);
}
export function detachClause(id: string): void {
  write(getAttachedClauseIds().filter((x) => x !== id));
}
export function clearAttachedClauses(): void {
  write([]);
}
```

- [ ] **Step 4 — Resolve in `browser-context.ts`:** replace the hardcoded `attachedClauses: []` (line 82) with a resolution of stored IDs through `clause-library`:

```ts
import { getClauses } from "../clause-library";
import { getAttachedClauseIds } from "./attached-clauses-store";
// ...
const attachedIds = new Set(getAttachedClauseIds());
const attachedClauses = getClauses().filter((c) => attachedIds.has(c.id));
// ... attachedClauses,  (in the returned object)
```

(also fix the `EMPTY` SSR default — leave `attachedClauses: []` there).

- [ ] **Step 5 — Wire `action-executor.ts`** (replace the no-op at 147-157):

```ts
import { attachClause, detachClause } from "./attached-clauses-store";
// ...
      case "attach_clause_to_session":
        attachClause(action.clauseId);
        break;
      case "detach_clause_from_session":
        detachClause(action.clauseId);
        break;
```

- [ ] **Step 6 — Run store + browser-context tests; typecheck; commit** `fix(atlas): wire clause attach/detach in drafting chat (A-H9)`.

---

## Task 4 — A-H10: persist generated draft body in the library

**Files:**

- Modify: `src/lib/atlas/drafting-history.ts` (`DraftLibraryEntry`, `pushDraftLibrary`)
- Modify: `src/lib/atlas/drafting-chat/types.ts` (`push_to_library` action)
- Modify: `src/lib/atlas/drafting-chat/engine.server.ts` (attach body to the action)
- Modify: `src/lib/atlas/drafting-chat/action-executor.ts:159-169` (pass body through)
- Modify: `src/app/(atlas)/atlas/drafting/history/page.tsx` (show/restore body)
- Test: `drafting-history` test (new or existing)

- [ ] **Step 1 — Failing test:** `pushDraftLibrary({...body:"TEXT"})` persists and `getDraftLibrary()[0].body === "TEXT"`.

- [ ] **Step 2 — Run, expect FAIL.**

- [ ] **Step 3 — Add the field.** In `drafting-history.ts` `DraftLibraryEntry` add `/** Generated body text (B1 A-H10). Optional for backward compat. */ body?: string;`. `pushDraftLibrary` already spreads `entry`, so passing `body` flows through — confirm the `Omit<...,"id"|"ts"|"versions">` param type now includes `body`.

- [ ] **Step 4 — Thread through the action.** In `types.ts` add `body?: string;` to the `push_to_library` action variant (and update the "Body is intentionally NOT persisted" comment to note it now is). In `engine.server.ts`, where the `push_to_library` client action is built from the tool input, capture the current turn's most-recent `generate_draft` body (the `generatedBody` already computed for `toolCalls`) and set `body` on the emitted action. In `action-executor.ts:159-169` pass `body: action.body` into `pushDraftLibrary({...})`.

- [ ] **Step 5 — UI.** In `drafting/history/page.tsx`, when an entry has `body`, render a "Volltext anzeigen / Wiederherstellen" affordance that loads the stored `body` into the artifact view (instead of only the prompt). (Read the page first; match its existing restore handler.)

- [ ] **Step 6 — Run tests; typecheck; commit** `feat(atlas): persist generated draft body in library (A-H10)`.

---

## Task 5 — A-H3: make RAG staleness visible (no regen)

**Files:**

- Create: `src/lib/atlas/embeddings-freshness.ts` + `.test.ts`
- Create: `scripts/check-embeddings-freshness.ts`
- Modify: `package.json` (script) + `.github/workflows/ci.yml` (step)
- Modify: the semantic-search UI consumer (degraded signal)

- [ ] **Step 1 — Failing test** for a pure `computeEmbeddingGap(corpusIds: string[], embeddedIds: string[])` → `{ total, embedded, missing, missingIds }`.

- [ ] **Step 2 — Implement `embeddings-freshness.ts`** (pure set-diff). **Step 3 — test passes.**

- [ ] **Step 4 — Script `scripts/check-embeddings-freshness.ts`:** import `ALL_SOURCES`, `ALL_AUTHORITIES` from `@/data/legal-sources`, read `src/data/atlas/embeddings.json`, derive the expected embeddable ID set the **same way `scripts/atlas-embed.ts` does** (read that script first to match its keying), compute the gap, `console.error` a summary, and `process.exit(missing > 0 ? 1 : 0)`. Add `"check:embeddings": "tsx scripts/check-embeddings-freshness.ts"` to `package.json` and a non-blocking (`continue-on-error: true`) CI step that surfaces the count. (Non-blocking because regen is OpenAI-key-gated and excluded — the goal is _visibility_, not a hard gate, until a key is available.)

- [ ] **Step 5 — UI signal:** in the semantic-search consumer, when the API returns `reason: "not_indexed"` (or `semanticSearch` null), render a subtle inline notice: "Semantische Suche eingeschränkt — Stichwortsuche aktiv." (Read the search route + its UI first.)

- [ ] **Step 6 — Commit** `feat(atlas): surface embeddings-index staleness (A-H3, visibility only)`.

---

## Task 6 — §6: remove proven dead code

**Files:** the deletion list above.

- [ ] **Step 1 — Re-verify each file has 0 real importers** (this gate catches any single-agent error, e.g. `JurisdictionTable`):

```bash
for f in AtlasAstraChat LegalNetwork RegulatoryMap LiveFeed QuickStats ForecastTimelineRibbon JurisdictionTable; do
  echo "== $f =="; grep -rln "components/atlas/$f\|from \"\\./$f\"\|from \"\\.\\./$f\"" src | grep -v "components/atlas/$f.tsx" || echo "  0 importers";
done
grep -rln "AtlasShell\b" src/app src/components | grep -v "AtlasShellV2\|/AtlasShell.tsx"   # expect: only layout.tsx comment
grep -rln "_components/CommandPalette" src   # expect: only the dead AtlasShell
grep -rln "data/regulatory" src              # expect: only RegulatoryMap (itself dead)
```

Delete ONLY files that prove 0 importers. If any shows a live importer, leave it and note it.

- [ ] **Step 2 — `git rm`** the verified-dead files (the 10 components/modal/shell + `src/data/regulatory/*`). Keep `clause-library.ts`.

- [ ] **Step 3 — `npx tsc --noEmit`** (expect: no NEW errors; deletions shouldn't break anything since 0 importers).

- [ ] **Step 4 — Commit** `chore(atlas): remove proven-dead components + regulatory data (§6/L9)`.

---

## Task 7 — Verify & prepare deploy

- [ ] **Step 1 — Scoped typecheck:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep -c "error TS"` — confirm the count did **not increase** vs the 733 baseline on touched files.
- [ ] **Step 2 — Tests:** `npx vitest run src/lib/atlas/mandate-scaffold-context.server.test.ts src/lib/atlas/notify.test.ts src/lib/atlas/drafting-chat/attached-clauses-store.test.ts src/lib/atlas/embeddings-freshness.test.ts src/lib/atlas/drafting-history.test.ts` — all green.
- [ ] **Step 3 — eslint** on touched files.
- [ ] **Step 4 — Deploy note:** A-H5 adds the `DEADLINE_WARNING` enum value → the deploy's `prisma db push` applies it additively. Verify post-deploy that the cron creates rows (check one `AtlasNotification` with `kind=DEADLINE_WARNING`). Batch with the other Atlas work per the 6–8-sprint policy; merge→main→push.

---

## Self-Review

- **Spec coverage:** A-H2 ✓(T1) · A-H5 ✓(T2) · A-H9 ✓(T3) · A-H10 ✓(T4) · A-H3 ✓(T5) · §6 dead-code ✓(T6). All six Batch-1 items covered.
- **Placeholders:** decrypt edit, enum value, dispatcher, store, freshness gap = real code above; the 3 spots flagged "read the file first" (export render lines, engine action-emission, history-page restore handler, search UI) are existing code the executor reads at edit time — not invented APIs.
- **Type consistency:** `DraftLibraryEntry.body?` (T4) ↔ `push_to_library.body?` (T4) ↔ `action.body` in action-executor (T4) — same name. `dispatchDeadlineWarnings` `DeadlineTarget` (T2) ↔ cron mapping (T2) — same fields. `getAttachedClauseIds`/`attachClause`/`detachClause` (T3) used consistently in store + browser-context + action-executor.

## Execution Handoff

Two options: **(1) Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (implementer → code-quality) between tasks; **(2) Inline** — execute here with checkpoints. Tasks 1, 2, 6 are independent and could run in parallel; Tasks 3+4 both touch `action-executor.ts` so should be sequential.
