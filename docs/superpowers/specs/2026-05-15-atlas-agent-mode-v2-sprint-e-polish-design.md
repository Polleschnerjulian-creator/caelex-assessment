# Atlas Agent-Mode v2 — Sprint E (Polish v1-light)

**Date:** 2026-05-15
**Status:** Design approved, ready for implementation plan
**Owner:** JP (controller) + Claude (executor)
**Prior context:** Sprint A→D (9/9 items shipped, see `docs/atlas-agent-mode-improvements-tracker.md`)

---

## Goal

Schließe die UX- + Operational-Gaps der v1-light Sprint-Items A→D, ohne neue Capability-Surface zu öffnen. Sprint E ist **Quick Wins** — 5 atomare Items, ~1 Woche Aufwand, hohes Wert/Aufwand-Ratio.

## Out of scope

- Quality & Trust härten (separater Sprint F)
- Workflow-Smartness (separater Sprint G)
- Capability-Expansion / true multi-agent v2 / D3 Monitoring-Integrationen (separater Sprint H)

---

## Items

### E1 — D3 Settings Section in MandateDetailView

**Problem:** D3 (background agents) ist API-only. Power-Users konfigurieren via direct PUT — nicht zumutbar.

**Solution:** Neue Sektion `<section id="background-agent">` in MandateDetailView (Position: **nach Deadlines, vor Custom Instructions** — beide config-ish).

**Komponente:** `<MandateBackgroundAgentSection mandateId={id} />`

**States** (4):

1. **Loading** — Skeleton-Card während initialer GET
2. **Empty / Disabled** — Headline + "Hintergrund-Agent ist deaktiviert" + CTA `[Konfigurieren …]`
3. **Configured + Enabled** — Status-Card mit:
   - Schedule-Anzeige ("alle 12h", "täglich", etc.)
   - Goal (truncated mit show-more wenn lang)
   - Next-Run (relative: "in 4h (heute 18:00)")
   - Last-Run (Status-Badge + Cost + Iterations)
   - **Recent-Runs Liste** (top 3, mit Status + Datum + Link zu Run-Detail-Page)
   - `[Alle Background-Runs zeigen →]` (Link zu History filtered)
   - `[⏸ Deaktivieren]` + `[Bearbeiten ✏️]` Buttons
4. **Editing** — Inline-Editor:
   - Schedule `<select>`: "alle 6h" / "alle 12h" / "täglich" / "wöchentlich"
   - Goal `<textarea>` (10-4000 chars), zod-aligned client-validation
   - `[Speichern]` + `[Abbrechen]`

**Halt-Banner** (kritisch):

Wenn letzter Background-Run `status === "awaiting_approval"`:

- Roter Banner OBEN in der Section: **"⚠️ Letzter Lauf wartet auf deine Freigabe"**
- Button `[→ Jetzt freigeben]` springt direkt zum Run im B1-Approval-Flow (vermutlich `/atlas/agent?resumeRunId=X` oder dedizierte URL — implementation-detail)
- Banner verschwindet sobald lawyer den Run resolved (approve/reject)

**API**:

- GET `/api/atlas/agent/runs?mandateId=X&templateId=background-agent&limit=3` — **kleines Endpoint-Tweak nötig**: aktuelle runs-list-API filtert nicht nach templateId. Add `templateId?: string` zur zod GetQuery + entsprechender Where-Clause.
- GET `/api/atlas/mandate/[id]/background-agent` (existiert seit D3)
- PUT `/api/atlas/mandate/[id]/background-agent` (existiert seit D3)

**Effort**: ~250-300 LOC component + 5 LOC API tweak + 10 LOC MandateDetailView integration.

---

### E2 — Batched-Approval

**Problem:** B1 v1 pausiert on FIRST undecided dangerous tool. Bei 3+ dangerous tools in 1 Iteration: lawyer geht durch 3 Modal-Cycles. Friction.

**Solution:** Pause on ANY undecided, snapshot ALL undecided als pending, emit ONE event mit Array, UI zeigt N stacked ApprovalCards in 1 Modal, lawyer entscheidet alle, ONE POST.

**Backend changes:**

1. `src/app/api/atlas/agent/route.ts` — pause-detection ändern:
   - Aktuell: `toolUseBlocks.find(b => requiresApproval(b.name) && !decidedGate)` — first only
   - Neu: `toolUseBlocks.filter(b => requiresApproval(b.name) && !decidedGate)` — all
   - Push ALL als pending entries in approvalGates (decision: null jeweils)
   - SSE event payload ändert von `{ toolUseId, toolName, input, rationale, iteration }` zu `{ tools: Array<{toolUseId, toolName, input, rationale}>, iteration }`
   - conversationState bleibt unverändert (snapshot ist dasselbe)
2. `src/app/api/atlas/agent/runs/[id]/approve/route.ts` — PostBody ändert:
   - Aktuell: `{ toolUseId, decision, modifiedInput? }`
   - Neu: `{ decisions: z.array({ toolUseId, decision, modifiedInput? }).min(1).max(4) }`
   - Records all atomically in einer `prisma.update`
   - Resume-path-validation: alle pending gates müssen jetzt decided sein
3. Resume-path (in main agent route) unverändert — for-loop applies decision per tool wie bisher

**Frontend changes:**

1. `ApprovalPauseInfo` interface erweitert: `tools: Array<{toolUseId, toolName, input, rationale}>` statt single-tool fields + `iteration`
2. `<ApprovalCard>` (single) → `<ApprovalCards>` (plural wrapper) + `<ApprovalCardEntry>` (individual)
3. ApprovalCards container:
   - Renders N ApprovalCardEntry kids
   - Sammelt decisions in local state Map<toolUseId, decision>
   - "Submit alle N Entscheidungen" Button disabled bis Map.size === N
   - "Alle genehmigen" / "Alle ablehnen" Shortcut-Buttons oben
4. Per-card individual UX: Approve / Edit / Reject buttons funktionieren wie B1 ApprovalCard

**Edge cases:**

- N=1: Modal zeigt 1 card — identical UX wie B1 v1
- N=4 (max): scrollbar im Modal, alle 4 cards in einem Container
- Browser-close mid-decision: server-state bleibt `awaiting_approval` mit alle null-decisions → lawyer kann fresh starten, modal opened wieder mit allen pending

**LOC**: ~150 modifications (split: server ~50, client ~100) + ~50 für ApprovalCards wrapper.

---

### E3 — Sub-Agent Cost-Breakdown

**Problem:** Sub-agent (D2 `delegate_subtasks`) tokens werden in `totalInputTokens/totalOutputTokens` cumuliert. Lawyer sieht "$0.42" aber weiß nicht ob davon $0.35 main vs $0.07 sub-agents waren.

**Solution:** Parallel tracking + Live-Counter-Split.

**Schema** (AtlasAgentRun, 2 fields additive):

```prisma
subAgentInputTokens  Int @default(0)
subAgentOutputTokens Int @default(0)
```

Beide default 0. Eine `prisma db push --skip-generate` Migration.

**Agent route changes:**

- In tool-exec-loop bei `delegate_subtasks` special-case: parallel zu `totalInputTokens += outcome.totalInputTokens` auch `subAgentInputTokens += outcome.totalInputTokens` (gleich für output + cache-creation/read aggregiert in sub-agent-buckets).
- `cost_progress` SSE event erweitert um `subAgentCostUsd` (live computed)
- AtlasAgentRun.update bei complete persistiert die 2 neuen fields

**Background runner** (gleiches Pattern, copy/paste split):

- `runAgentInBackground` macht das gleiche split-tracking
- Persistiert die 2 Felder beim final update

**UI changes:**

- `costProgress` state-interface erweitert um `subAgentCost: number | null`
- Live-Counter:
  - sub-agent-cost > 0: `$0.42 ($0.27 main · $0.15 sub-agents)`
  - sub-agent-cost === 0: `$0.42` (unverändert)
- Im Evidence-Pack (D1) `audit-log.json` → `tokens` block erweitert: `{ input, output, mainInput, mainOutput, subAgentInput, subAgentOutput }`

**LOC**: ~80 (schema + tracking + counter + audit-log).

---

### E4 — `conversationState` TTL-Cleanup Cron

**Problem:** C1 persistiert conversationState auf JEDEM completed run (50-150 KB pro Row). Bei 1000+ runs pro Org: GB-scale storage debt.

**Solution:** Daily cron wiped `conversationState = null` für runs älter 30 Tage. Keeps row + steps/artifacts/etc. — nur das heavy snapshot wird genuked.

**Cron Route** (combined mit E5):

`src/app/api/cron/atlas-housekeeping/route.ts`

```ts
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const wiped = await prisma.atlasAgentRun.updateMany({
  where: {
    startedAt: { lt: cutoff },
    conversationState: { not: Prisma.JsonNull },
  },
  data: { conversationState: Prisma.JsonNull },
});
```

**Auth**: CRON_SECRET (gleiches Pattern wie 18 andere Crons).

**Schedule**: Daily 04:00 UTC (`0 4 * * *`) — freier Slot in vercel.json crons array.

**TTL value**: 30 Tage default. Konstante `CONVERSATION_STATE_TTL_DAYS` im Top-of-File, später konfigurierbar.

**Trade-off**: Forks von Runs älter als 30 Tage funktionieren nicht mehr (kein conversationState mehr da). Acceptable — typische Fork-Use-Cases sind days-old, nicht months-old.

**LOC**: ~40 (kombiniert mit E5).

---

### E5 — Stale `awaiting_approval` Cleanup

**Problem:** Runs in `status="awaiting_approval"` verrotten wenn lawyer Browser-Close oder vergisst. Stale forever.

**Solution:** Im selben Housekeeping-Cron, mark Runs als `status="abandoned"` wenn >7 Tage in `awaiting_approval`.

```ts
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const abandoned = await prisma.atlasAgentRun.updateMany({
  where: {
    status: "awaiting_approval",
    startedAt: { lt: cutoff },
  },
  data: {
    status: "abandoned",
    conversationState: Prisma.JsonNull,
    completedAt: new Date(),
  },
});
```

**`startedAt` als Stale-Proxy**: AtlasAgentRun hat kein `updatedAt`-Feld (typical migration-debt). Background runs pausieren typisch sek nach start, also `startedAt` ist eine gute Annäherung an "wann ist die awaiting_approval lifecycle gestartet". Echte `updatedAt` einzuführen wäre v2-Schema-Change, nicht v1 wert.

**Notification**: SILENT. Lawyer sieht "abandoned" Status-Badge in der History. Keine in-app oder email notification (vermeidet Spam).

**LOC**: ~30 (Job 2 in Housekeeping route).

**Combined Cron Response shape**:

```json
{ "ok": true, "conversationStateWiped": 47, "awaitingApprovalAbandoned": 3 }
```

---

## Schema Summary

**AtlasAgentRun additions** (E3 only, 2 fields):

```prisma
subAgentInputTokens  Int @default(0)
subAgentOutputTokens Int @default(0)
```

Einer `prisma db push --skip-generate` Push. Beide additive mit default 0 — safe für existing rows.

---

## File Inventory

**New (3):**

- `src/components/atlas/v2/MandateBackgroundAgentSection.tsx` — E1
- `src/app/api/cron/atlas-housekeeping/route.ts` — E4 + E5 combined
- (none for E2 / E3 — modifications only)

**Modified (6-7):**

- `src/components/atlas/v2/MandateDetailView.tsx` — E1 (add Section)
- `src/app/(atlas)/atlas/agent/page.tsx` — E2 (ApprovalCards + bulk shortcuts) + E3 (counter split)
- `src/app/api/atlas/agent/route.ts` — E2 (batch pause-detection) + E3 (sub-agent token tracking)
- `src/lib/atlas/agent/background-runner.server.ts` — E3 (same split tracking)
- `src/app/api/atlas/agent/runs/[id]/approve/route.ts` — E2 (array body)
- `src/app/api/atlas/agent/runs/route.ts` — E1 (`templateId` filter in zod + where)
- `vercel.json` — E4+E5 cron entry
- `prisma/schema.prisma` — E3 (2 fields)

**Total LOC estimate**: ~700-900 LOC across all files.

---

## Shipping Strategy

**Approach A (atomic)** — alle 5 Items in einem feat()-Commit + einem docs()-tracker-Commit, mirrors v1-Sprint-Pattern. Single deploy. Single `prisma db push`.

Rationale: Each item is small enough that an atomic ship doesn't bloat the diff beyond review-comfort. Easier rollback if any breaks.

---

## Acceptance Criteria

**E1:**

- Lawyer öffnet MandateDetailView → sieht "Hintergrund-Agent" Section
- Empty state → kann Konfigurieren-CTA klicken → öffnet Editor → speichert → Section zeigt enabled-state
- Enabled state → sieht Schedule + Goal + Next/Last-Run + Recent-3-Runs
- Bei letztem Run mit status=awaiting_approval → roter Halt-Banner + Direct-Link in B1-Flow

**E2:**

- Agent-Run mit 3 dangerous tools in 1 Iteration → modal zeigt 3 ApprovalCards (statt 3 modal-cycles)
- "Alle genehmigen" → 3 decisions als approved batch-recorded → resume
- Per-card Edit funktioniert (jede card hat eigenes textarea)
- N=1: modal funktioniert wie vorher (1 card)

**E3:**

- Run der `delegate_subtasks` nutzt → Live-Counter zeigt `$X main · $Y sub-agents`
- Run der KEIN delegate_subtasks nutzt → Live-Counter zeigt nur `$X` (unverändert)
- AtlasAgentRun row hat `subAgentInputTokens` + `subAgentOutputTokens` korrekt persistiert
- Evidence-Pack JSON enthält die Split-Tokens

**E4:**

- Daily 04:00 UTC: Cron lookt durch, wiped conversationState für runs > 30 Tage
- Run-row selbst überlebt (status/steps/artifacts/citations bleiben)
- Forks von älteren Runs failen sauber mit "Parent run has no conversationState — cannot fork (pre-C1 run)" Error (existing C1 error-path)

**E5:**

- Daily 04:00 UTC: Cron findet awaiting_approval runs > 7 Tage → marked abandoned
- Status-Badge in History zeigt "abandoned"
- Lawyer kann betreffende Run nicht mehr resume-en (status check)

---

## Risk Register

| Risk                                                                 | Impact                                              | Mitigation                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Approval batch >4 tools = zu viel UI scrollen                        | UX                                                  | Zod max(4) cap — Anthropic returns >4 dangerous tools per iter ist extrem selten |
| TTL nuked conversationState eines Runs den lawyer noch forken wollte | low (typisch days-old, nicht months)                | 30-Tage default ist großzügig; konstante leicht erhöhbar                         |
| Abandoned-cleanup hits a run lawyer war gerade dabei zu approven     | very low (7-day threshold)                          | startedAt-Proxy bevorzugt false-negatives (nicht-cleanup) über false-positives   |
| Sub-agent token tracking weicht von main tracking ab durch Race      | none — sequential in route                          | N/A                                                                              |
| Housekeeping-Cron updateMany lockt rows                              | low (Neon row-locks pro UPDATE, updateMany batches) | Acceptable; daily 04:00 ist low-traffic                                          |

---

## Out-of-scope (für E)

- Spec'd separat als Sprint F (Quality & Trust), G (Workflow-Smartness), H (Capability v2).
- E spielt NICHT an: D2 true multi-agent, real D3 monitoring integrations, run-sharing, AI-suggested forks, cross-mandate memory, org-level cost caps.

---

## Changelog

- **2026-05-15:** Document created. Design approved through 4-section review (Architecture, E1, E2, E3+E4+E5). All sub-decisions captured (Recent-Runs YES, Halt-Banner prominent + direct-link, Bulk-Shortcut YES, TTL 30d, abandoned silent).
