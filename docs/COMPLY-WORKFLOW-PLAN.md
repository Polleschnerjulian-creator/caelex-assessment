# Comply Workflow Redesign — Plan

**Created:** 2026-05-05
**Status:** UI default reset to V1 (commit `8e7084a0`). Sprint #1 (Today
inbox redesign) starting now.
**Survives:** Conversation compaction. Single source of truth for the
Comply workflow-redesign work.

---

## Why this exists

Comply is the regulatory-compliance pillar of Caelex. Today's UX is a
**collection of modules** (Authorization, NIS2, Debris, Insurance,
Cybersecurity, Spectrum, Export-Control, ...) that each have their own
tab/page. The user has to decide what to do, when, and in which order —
and the dashboard's first impression is "here are charts" instead of
"here's what you need to do."

The redesign: turn Comply from a **dashboard you read** into a
**workflow you work through**. Linear-style inbox + Mercury-style
clear-state + Astra-as-co-pilot per item.

---

## State of the world

- **V1** = legacy chart-heavy dashboard (`V1DashboardClient.tsx`,
  rendered by `/dashboard` when `complyUiVersion = "v1"`). Currently
  the implicit default after the `8e7084a0` reset.
- **V2** = redesigned shell with `/dashboard/today`, `/dashboard/posture`,
  `/dashboard/missions`, `/dashboard/astra-v2`, `/dashboard/proposals`.
  Reachable via Settings → UI, `/ui/v2`, Cmd-K, or explicit DB override.
- Resolver: [`src/lib/comply-ui-version.server.ts`](src/lib/comply-ui-version.server.ts) — 6-step
  precedence chain (URL param → cookie → user → org → super-admin → fallback "v1").
- Already-shipped V2 surfaces:
  - `/dashboard/today` — 3-bucket inbox (URGENT / THIS WEEK / WATCHING)
    with action menu (Snooze / Wake / Note) wired to Server Actions
  - `/dashboard/posture` — executive overview with trend lines
  - `/dashboard/missions` + `/dashboard/missions/[id]` — mission grouping
  - `/dashboard/astra-v2` — full-page chat
  - `/dashboard/proposals` — Astra-suggested DB writes (apply/reject)

---

## The 10 ideas (full inventory — for future-Claude context)

These came out of the 2026-05-05 workflow-recon discussion. Sprint #1
picks #1+#2+#3 as the highest-leverage cluster; the rest stay parked
here so we don't lose them.

### #1 — "Today" Inbox as the only entry question ⭐ SPRINT 1

One landing screen: `/dashboard/today`. Charts/scores move to
`/dashboard/posture` (separate, opt-in). 3 buckets (URGENT / THIS WEEK
/ WATCHING) with 1-click clear (Snooze / Delegate / Done). "Inbox Zero"
as visible KPI top-right.

### #2 — "Next Step" card per item ⭐ SPRINT 1

Replace opaque `EVIDENCE_REQUIRED` status pills with explicit next-step
cards: "Upload telemetry OR connect Sentinel-Agent OR request from
team", with concrete CTA buttons. Each item carries its own action
panel.

### #3 — Astra inline per item ⭐ SPRINT 1

Each item gets a right-side Astra panel with 3 quick-actions: "Explain
this requirement" / "What did peers submit?" / "Generate evidence-brief
from our data". Astra outputs land as draft on the item — review +
sign workflow, not copy-paste.

### #4 — Missions = Gantt rückwärts vom Termin

Mission = "We launch Sat-X in Q3 2026". Compliance items computed
backwards from the launch date, critical-path visualisation. Each item
shows "if this slips, launch slips by N days."

### #5 — Proposals als zweite Inbox

Astra-Vorschläge surface in `/today` as a badge ("3 new Astra
suggestions"). 1-click apply/reject/modify. Per-item history visible:
"Astra suggested ATTESTED on 03.05, approved by @niklas on 04.05."

### #6 — Time-Travel als Audit-Defense

`/dashboard/time-travel` exists. Promote it to: "show compliance state
at time X" with diff-markers and downloadable cryptographic-receipt
PDF. Sales angle: CYA for audits.

### #7 — Density-Modes als echtes Feature

Density already exists (`density.server.ts`). Today it's just padding.
Make it real: Compact (30+ items per screen, Linear-style) /
Comfortable (6-8 cards per screen) / Focus (1 item full-screen for
deep-work). `Cmd-D` toggles.

### #8 — Cross-Module-Triggers

Module today are isolated. Real-world is chained: "Cyber incident →
NIS2 24h notification + Insurance pre-claim + Audit-Center entry."
Auth expired → all dependent items BLOCKED + Mission status flips.
Visible in item as "Triggers" sub-list.

### #9 — Ask-the-network escalation

Stuck on Art 64.3? Tier 1: Astra. Tier 2: P2P-question (other operators,
anonymized — uses the existing Verity P2P layer). Tier 3: Caelex
compliance-officer (Stripe-paid). Comply becomes Compliance-as-a-Service.

### #10 — Onboarding-as-a-Mission (5-day funnel)

Replace setup wizard with daily nudges: Day 1 questions → Day 2
risk-analysis from Astra → Day 3 connect Sentinel → Day 4 review top 8
items → Day 5 30-day roadmap. Daily emails + inbox items.

---

## Sprint 1 — "Today" Inbox Redesign

**Goal:** turn Comply's first impression from "charts" into "this is
what you do today, here's how, here's AI helping." Three ideas
combined: #1 (inbox) + #2 (next-step cards) + #3 (Astra inline).

**Effort:** 6-9 days total. Can ship in 3 sub-sprints with mini-demos
between each.

### Sub-sprint 1.1 — Make Today the universal landing (1-2 days)

**State:** `/dashboard/today` exists, V2-only (line 62-65 redirects V1
users back). V1 default is the chart-heavy `V1DashboardClient.tsx`.

**Target:**

- Remove the V1-redirect from `/dashboard/today` so V1 users can reach it.
- Add a "Today" card to V1 dashboard chrome OR change `/dashboard` →
  redirect to `/dashboard/today` for both V1 and V2 users (V2 already
  redirects there per the existing logic at `src/app/dashboard/page.tsx:23`).
- Add "Inbox Zero KPI" header element: `12 in inbox · 8 cleared today`.
  Cleared-today count = items where the user took an action
  (snooze/wake/note/mark-attested) since 00:00 local.
- Add a "Skip to legacy charts" link for users who want the old V1
  chart dashboard view.

**Files to touch:**

- [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) — flip V1 redirect to `/today` too
- [`src/app/dashboard/today/page.tsx`](src/app/dashboard/today/page.tsx) — drop V1-redirect, add KPI header
- [`src/lib/comply-v2/compliance-item.server.ts`](src/lib/comply-v2/compliance-item.server.ts) — new query
  `getClearedTodayCountForUser()` for the KPI

### Sub-sprint 1.2 — "Next Step" cards per item (2-3 days)

**State:** [`ComplianceItemCard.tsx`](src/components/dashboard/v2/ComplianceItemCard.tsx) exists in
`src/components/dashboard/v2/`. Today shows status + regulation +
target date + action menu. No "what should I do next" hint.

**Target:**

- Each item card carries a `nextStep: NextStep` field.
- Possible NextSteps (status-derived, regulation-aware):
  - `UPLOAD_EVIDENCE` ("Upload [type] document — drag & drop or pick from vault")
  - `CONNECT_SENTINEL` ("Connect Sentinel-Agent to auto-attest [data point]")
  - `RUN_ASSESSMENT` ("Complete [N] questions to determine applicability")
  - `REQUEST_FROM_TEAM` ("Ask [@user] to provide [thing]")
  - `REVIEW_DRAFT` ("Astra prepared a draft — review + sign")
  - `WAIT_FOR_APPROVAL` ("Pending [@user]'s approval since [date]")
  - `ATTEST` ("Mark as attested for the next 12 months")
- CTA-Button cluster on each card: primary = the next step, secondary
  = `Snooze` + `Delegate` + `Skip`.
- Server-side derivation: `deriveNextStep(item: ComplianceItem) →
NextStep` in `compliance-item.server.ts`.

**Files to add/touch:**

- `src/lib/comply-v2/next-step.server.ts` — new derivation engine
- `src/components/dashboard/v2/ComplianceItemCard.tsx` — render the card
  with primary CTA + secondary actions
- New `src/lib/comply-v2/types.ts` — add `NextStepKind` union + `NextStep`
  interface
- `src/app/dashboard/items/[regulation]/[rowId]/server-actions.ts` — new
  actions: `delegateAction`, `skipAction` (in addition to existing
  snooze/unsnooze/add-note/mark-attested)

### Sub-sprint 1.3 — Astra inline per item (3-4 days)

**State:** `/dashboard/astra-v2` is a separate full-page chat. Astra
proposals exist (`/dashboard/proposals`) but are decoupled from items.

**Target:**

- Right-side panel on each item-detail page (`/dashboard/items/[regulation]/[rowId]`):
  ```
  [Item Details            ] [Astra Co-Pilot           ]
  [                        ] [                         ]
  [                        ] [ 🤖 Quick actions:       ]
  [                        ] [ • Explain this rule     ]
  [                        ] [ • What did peers submit?]
  [                        ] [ • Generate evidence-brief]
  [                        ] [                         ]
  [                        ] [ Or ask anything:        ]
  [                        ] [ [_____________________] ]
  ```
- Astra-output that suggests a DB write (e.g. "I drafted the evidence
  document — accept?") creates an `AstraProposal` row with `targetItemId`
  - the proposed change. Visible in `/dashboard/proposals` and as a
    badge on the item card ("⚡ 1 Astra draft awaiting your review").
- Per-item Astra context auto-includes: the item's regulation text,
  the org's previous attestations for similar items, public peer data
  (anonymized, via the existing Atlas index).

**Files to add/touch:**

- `src/components/dashboard/v2/AstraItemPanel.tsx` — new right-side panel
- `src/lib/comply-v2/astra-engine.server.ts` — extend with
  `runForItem(itemId, prompt)` that auto-injects context
- `src/lib/comply-v2/actions/astra-bridge.server.ts` — add
  `proposeForItem(itemId, draft)` that writes an AstraProposal row
- Schema migration: add `targetItemId String?` to `AstraProposal` model
  (optional — nullable so existing proposals are unaffected)

---

## Open questions for the user before each sub-sprint

### Before 1.1 (universal landing)

1. Should `/dashboard` redirect to `/today` for V1 users too, or keep
   V1's chart dashboard as the V1 landing and only let users reach
   `/today` via a "Today" card / nav link?
2. KPI: "12 in inbox · 8 cleared today" — is "cleared today" calculated
   on a 24h-rolling-window or on local-day-since-00:00?

### Before 1.2 (next-step cards)

3. The 7 NextStep kinds I proposed — any missing? Anything that doesn't
   map cleanly to the existing ComplianceItem statuses?
4. Should `Skip` be a real status (with reason + audit-log entry) or a
   soft hide (cookie / preference, item still counts in posture)?

### Before 1.3 (Astra inline)

5. Per-item Astra context auto-includes peer data — privacy implications?
   (Atlas index is anonymized, but worth checking the Astra prompt
   doesn't accidentally leak operator-specific phrasing.)
6. AstraProposal already supports apply/reject. Do we want a third
   "modify" action that opens the draft for inline editing before
   apply?

---

## Done-criteria for Sprint 1

- [ ] Both V1 and V2 users land on `/dashboard/today` by default (with
      a "Skip to legacy charts" escape hatch for V1 users).
- [ ] Inbox-zero KPI rendered with live counts.
- [ ] Every item card shows a primary CTA derived from its status +
      regulation + missing-data + last-action history.
- [ ] Item-detail page has an Astra panel with 3 quick-actions.
- [ ] Astra outputs that suggest DB writes route into the existing
      AstraProposal queue with `targetItemId` linkage.
- [ ] At least 5 unit tests covering `deriveNextStep` (one per
      NextStepKind variant).

---

## Sequencing after Sprint 1

| Sprint | Idea(s)                                         | Effort | Why next                                                                                                                           |
| ------ | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2      | #4 Mission Gantt + #6 Time-Travel               | 1 week | Sales-side: makes "why does this matter NOW" visible (mission slip-risk) and "we had it under control" visible (time-travel diff). |
| 3      | #5 Proposals badging + #8 Cross-Module Triggers | 1 week | Operational: chains items together, surfaces AI work where it matters.                                                             |
| 4      | #10 5-day Onboarding Funnel                     | 1 week | Customer-acquisition: turns first-week wow-moment into structured journey.                                                         |
| 5      | #9 Ask-the-network escalation                   | 1 week | Monetization: opens Stripe-paid compliance-officer tier.                                                                           |
| 6      | #7 Density modes                                | 2 days | Polish; do once the workflow is locked.                                                                                            |

---

## How to pick this up after compaction

If you (future-Claude) are reading this fresh:

1. Status header at the top tells you which sprint is in flight.
2. The 10 ideas are documented in full so we don't lose context.
3. Sprint 1 has 3 sub-sprints — check git log for which commits landed
   them. Search for `[comply-workflow]` in commit messages.
4. Open questions to the user are marked at the section header.
5. The design pattern to follow:
   - Server-side derivation of "what should the user do next" lives in
     `src/lib/comply-v2/`.
   - UI components use the existing `palantir-surface` glass class +
     emerald accent + slate text per the V2 design language.
   - Server Actions are defined via `defineAction()` in
     `src/lib/comply-v2/actions/define-action.ts`.
   - All data writes that change compliance state go through
     `compliance-item-actions.ts` so the audit log catches them.
6. **Don't break V1** — the resolver fallback is V1, V1 chart dashboard
   is reachable via `V1DashboardClient.tsx`. New work goes into the V2
   shell + the universal `/today` landing.

---

## Related docs

- [`docs/CAELEX-COMPLY-CONCEPT.md`](docs/CAELEX-COMPLY-CONCEPT.md) — original V2-redesign concept
  (Mercury / Linear-inspired, single inbox, palette-search)
- [`docs/VERITY-AUDIT-FIX-PLAN.md`](docs/VERITY-AUDIT-FIX-PLAN.md) — pattern for tier-based audit work
  (we'll reuse the structure if Comply needs a security audit later)
- [`docs/PHAROS-AUDIT-FIX-PLAN.md`](docs/PHAROS-AUDIT-FIX-PLAN.md) — sister doc for Pharos T2-T5 work
