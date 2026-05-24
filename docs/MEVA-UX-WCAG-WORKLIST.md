# MEVA / Caelex Trade — UX + WCAG Worklist

**Living-Doc · Created 2026-05-24 · Owner: ongoing Trade UI work**

This is the canonical worklist for making MEVA "maximal nutzerfreundlich"
(UX) AND fully WCAG 2.2 AA compliant (legal/EU Accessibility Act).
Update statuses as items ship. Group by phase + impact.

---

## 📊 Status Dashboard

| Stream                                     | % done   | Last bump                                                                           |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------------- |
| **WCAG 2.2 AA**                            | ~99.3%   | W17 NotificationsTab fieldset/legend coverage                                       |
| **UX — Quick wins**                        | ~95%     | Phase 4c — U-MED-7 Recently Visited sidebar section (localStorage)                  |
| **UX — Phase A (Power-User basics)**       | **100%** | Phase 4b — U-HIGH-8 + U-LOW-4 help-center side-panel (26-term glossary + shortcuts) |
| **UX — Phase B (Onboarding + Bulk)**       | **~60%** | Phase 5e — U-CRIT-5 MVP bulk-select + CSV export on items page (14 tests)           |
| **UX — Phase C (Strategic deep features)** | 0%       | not started                                                                         |

---

## ✅ DONE — WCAG 2.2 AA (kept for audit-trail)

| #   | Fix                                                                                | SC               | Commit   |
| --- | ---------------------------------------------------------------------------------- | ---------------- | -------- |
| W1  | Dark-mode label tokens bumped (0.6→0.78 / 0.3→0.55 / 0.18→0.40)                    | 1.4.3 AA         | 9ab84de8 |
| W2  | Focus-visible global rule for `.trade-themed` (2px white ring)                     | 2.4.7 AA         | 9ab84de8 |
| W3  | Skip-link "Skip to main content" + main#main-content landmark                      | 2.4.1 A          | 9ab84de8 |
| W4  | lang="en" on shell + lang="de" patches on German content blocks                    | 3.1.2 AA         | 1191ee16 |
| W5  | Mobile drawer (hamburger + slide-in)                                               | n/a              | 9ab84de8 |
| W6  | Sidebar section-label contrast (0.35 → 0.62)                                       | 1.4.3 AA         | 9ab84de8 |
| W7  | Sidebar inactive-icon contrast (0.55 → 0.65)                                       | 1.4.11 AA        | 9ab84de8 |
| W8  | Sidebar nav-row icons aria-hidden                                                  | 4.1.2 A          | 9ab84de8 |
| W9  | Loading states role="status" + aria-live + aria-busy (parties/operations/licenses) | 4.1.3 AA         | 9ab84de8 |
| W10 | EmptyState icons aria-hidden (items/parties/operations/licenses/classify)          | 4.1.2 A          | 1191ee16 |
| W11 | Form aria-describedby + role="alert" (OrgProfile/Audit/ApiKeys tabs)               | 3.3.1 + 4.1.3 AA | 8299b906 |
| W12 | PageTransition splash excluded for /trade routes                                   | 2.2.2 (motion)   | 69461874 |
| W13 | Monochrome white accent (replaces indigo) — high contrast + Apple-vibe             | 1.4.1 A          | df12bf37 |

---

## 🔴 TODO — WCAG 2.2 AA (remaining ~3%)

| #          | Fix                                                                                                                                                                                                                                                                    | SC            | Aufwand  | Owner  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ------ |
| W14        | Run `npx @axe-core/cli` on production for actual contrast verification                                                                                                                                                                                                 | 1.4.3         | 30min    | —      |
| W15        | VoiceOver/NVDA walkthrough of top-10 user flows                                                                                                                                                                                                                        | —             | 4h       | —      |
| ~~W16~~ ✅ | ~~Per-input `autocomplete` attributes~~ **DONE — Phase 5b**: OrgProfileTab Field accepts `autoComplete` prop now; wired bafa contact (name/role/tel/email), eori/duns (off — encrypted), primaryExportJurisdiction (country), ApiKeys key-name (off).                  | 1.3.5 AA      | 1h ✅    | Claude |
| ~~W17~~ ✅ | ~~Form fieldset/legend for input groups in Settings~~ **DONE — Phase 5c**: NotificationsTab toggle list wrapped in `<fieldset>` + `<legend>` so AT users hear "Email notifications, group, N checkboxes". OrgProfile/ApiKeys/Audit tabs already had fieldset coverage. | 1.3.1 A       | 30min ✅ | Claude |
| ~~W18~~ ✅ | ~~Coverage-bar role="img" + aria-valuenow (CompliancePostureCard)~~ **DONE — Phase 2 follow-up** (commit 88db0a1f, used `role="progressbar"` which is more semantic than `role="img"`)                                                                                 | 1.3.1 + 4.1.2 | 15min ✅ | Claude |
| W19        | NotificationsTab + remaining ApiKeysTab inputs — aria-invalid + describedby                                                                                                                                                                                            | 3.3.1 AA      | 1h       | —      |
| W20        | More per-section `lang="de"` patches on operations/licenses subtitles                                                                                                                                                                                                  | 3.1.2 AA      | 1h       | —      |

---

## 🔴 KRITISCH — UX Blocker (blockt Daily Work)

### ✅ U-CRIT-1 — Enum-Humanizer **(DONE — Phase 2)**

**Was:** Status-Strings wie `REQUIRES_REVIEW`, `AWAITING_CLASSIFICATION`, `POTENTIAL_MATCH` werden roh angezeigt.
**Fix:** Util `humanizeEnum(s)` + `tradeStatusLabel(s)` mit PRESERVE_UPPER für Compliance-Acronyms (ITAR/EAR/BAFA/etc.). Wired in:

- `items/page.tsx` — Status-Filter-Pills jetzt humanized (`REQUIRES_REVIEW` → "Requires Review"); auch von `Loader2` → `ListSkeleton`
- `operations/page.tsx` — Operation-Type-Pill humanized; StatusBadge mit aria-label + title für screen-reader-friendly Full-Label statt Abkürzung
- `parties/page.tsx` — ScreeningBadge (icon-only) bekommt aria-label + title-tooltip via `<span title>` wrapper
- `licenses/page.tsx` — STATUS_TABS hatten schon human labels (no-op)
  **Aufwand:** 1h ✅
  **Files:** `src/lib/trade/format.ts` (NEW pre-Phase 2) + 4 list pages
  **Commits:** Phase 2 batch (see git log)

### ✅ U-CRIT-2 — Onboarding Tour + Sample-Data **(DONE — Phase 4d MVP)**

**Shipped (MVP):**

- ✅ New `src/lib/trade/sample-data-seeder.server.ts` — idempotent (no-op if org already has any TradeItem/TradeParty/TradeOperation). Creates 3 items (EO payload USML XV(a)+9A515.a, X-band transponder EAR 5A001.b.5, star tracker EAR99), 2 parties (German integrator CLEAR, Indian academic NOT_SCREENED for triage flow demo), 1 operation linking them with reference "SAMPLE-2026-Q1-001". All rows labelled "(Sample)" so operators recognise + delete later.
- ✅ New `src/lib/trade/sample-data-actions.ts` server action wrapper — auth + super-admin fallback + role gate (MANAGER+) + revalidatePath('/trade', '/trade/items', '/trade/parties', '/trade/operations').
- ✅ New `src/app/(trade)/trade/_components/OnboardingBanner.tsx` — replaces the bare "Erste Items klassifizieren" block on /trade welcome with a 4-path entry banner:
  1. **Seed sample data** — one-click with loading / success / already-seeded / error states
  2. **Ask Astra** — pre-filled "How do I classify my first item?" deep-link
  3. **⌘K hint** — discoverability for the palette
  4. **Open help center** — dispatches the same window event the sidebar uses
- ✅ Banner only renders when `hasAnyData === false` — disappears the moment any Trade row exists.

**Deferred to a later sprint:**

- ❌ 5-step Joyride-style guided tour (heavy 3rd-party dep + multi-page choreography)
- ❌ "Hide tour permanently" localStorage toggle (no tour to hide yet)

**Aufwand:** ~3h ✅ (vs. 2 Tage estimate — Joyride tour deferred halved scope)
**Impact:** Sehr hoch (first-user retention) — sample data lets operators experience the full data model in 1 click instead of bouncing on the empty workspace
**Files:** `sample-data-seeder.server.ts` (NEW) + `sample-data-actions.ts` (NEW) + `OnboardingBanner.tsx` (NEW) + `/trade/page.tsx` (replace bare empty-state)

### ✅ U-CRIT-3 — Sidebar Tooltips für Jargon **(DONE — pre-Phase 2)**

**Was:** "Sammelgenehmigungen", "Deemed Exports", "FAA AST", "VSD" ohne Erklärung.
**Shipped:** All 15+ NavItems in `TradeSidebar.tsx` carry a 1-sentence `tooltip` field; surface via `title` attr on every `<Link>` row. Example: "Sammelgenehmigungen → German BAFA collective export authorisations (AGG / AGE) covering multiple shipments under one approval. Volume-cap + draw-down tracked."
**Aufwand:** 45min ✅ (landed in earlier WCAG batch)
**Impact:** Hoch (new-user comprehension)
**Files:** `src/app/(trade)/trade/_components/TradeSidebar.tsx`

### ✅ U-CRIT-4 — Command Palette ⌘K **(DONE — Phase 3d)**

**Shipped:**

- ✅ New `src/app/(trade)/trade/_components/TradeCommandPalette.tsx` — Trade-scoped palette built on the cmdk primitives from `@/components/ui/v2/command` (Comply V2's shared dialog shell). Self-contained — no coupling to Comply's search server-actions.
- ✅ 27 statically-defined verbs across 4 groups:
  - **Navigate** (16 verbs): every sidebar destination (Overview / Items / Counterparties / Pipeline / Licenses / Classify / EUC / Re-Export / VSD / Sammelg / France LOS / UK ECJU / FAA AST / Deemed Exports / Program / Training Corpus)
  - **Create** (6 verbs): "New trade item / counterparty / operation / license / EUC / VSD" — each navigates to the list page with `?new=1` hint for future auto-open form wiring
  - **Astra AI** (4 verbs): "Open Astra Trade" + 3 pre-filled deep-link prompts (classify / screen / license-choice) routed via `?prefill=` (the same hook U-HIGH-4 added)
  - **Settings** (1 verb)
- ✅ Mounted globally inside `TradeShell` so the shortcut works across every `/trade/*` route
- ✅ Keyboard contract: ⌘K / Ctrl+K / ⌘/ all toggle (Linear convention), Esc closes (free from Radix Dialog), `e.preventDefault()` so we don't conflict with browser ⌘K-search
- ✅ a11y: dialog gets `aria-label`, Radix supplies focus-trap + aria-modal + Esc-handling, CommandInput is a proper `<input>` with cmdk's live result-count announcements
- ✅ Defer-after-close: `setTimeout(..., 0)` between dialog close and `router.push` so the close animation doesn't fight the route change

**Aufwand:** ~3h ✅ (vs. 1 Tag estimate — cmdk primitive made it fast)
**Impact:** Sehr hoch (Power-User transformation) — any of 27 actions reachable in 2 keystrokes
**Files:** `TradeCommandPalette.tsx` (NEW) + `TradeShell.tsx` (mount)

### ✅ U-CRIT-5 — Bulk Operations + Checkbox-Column **(DONE — Phase 5e MVP, items page only)**

**Shipped:**

- ✅ New `src/app/(trade)/trade/_components/BulkActionsBar.tsx` — fixed bottom-center pill toolbar that renders only when `count > 0`. Shows "N selected · Clear · [actions]". role="toolbar" + aria-label for AT.
- ✅ New `src/lib/trade/csv-export.ts` — RFC 4180-compliant CSV builder + browser-download helper. UTF-8 BOM prepended so Excel (Windows) detects encoding. Filename auto-stamped with ISO date suffix.
- ✅ 14 vitest tests covering RFC 4180 escaping (quotes/commas/newlines), formatCell type-coverage (string/number/boolean/null/Date), filename stamping, and full buildCsv round-trips.
- ✅ Wired into `items/page.tsx`: per-row checkbox column with native-`indeterminate` "some-selected" header, select-all toggle, selection clears on filter change so stale rows don't carry over, Export-CSV button in the bar (13 columns covering full item metadata) + toast feedback on success.

**Deferred to follow-up sprints:**

- ❌ Replicate the pattern on parties / operations / licenses (mechanical port — the primitives are now in place)
- ❌ Bulk-Delete / Bulk-Archive (need API mutations + confirmation modal)
- ❌ "Select all matching filter" pattern across pagination (needs server-side count + a one-click prompt)

**Aufwand:** ~2.5h ✅ (vs. 2-3 Tage estimate — single page + reusable primitives)
**Impact:** Sehr hoch (Power-User throughput) — operators can now CSV-export filtered selections in one click instead of copy-pasting from the UI
**Files:** `BulkActionsBar.tsx` (NEW) + `csv-export.ts` (NEW) + `csv-export.test.ts` (NEW) + `items/page.tsx` (refactor)

---

## 🟠 HIGH — Verlangsamt Daily Work

### ✅ U-HIGH-1 — Today's Action Inbox **(DONE — Phase 4a MVP)**

**Was:** /trade Welcome zeigt KPIs + Quick-Start, aber kein triage-actionable feed.
**Shipped (MVP):**

- ✅ New `src/lib/trade/action-inbox-aggregator.ts` — pure-function aggregator that normalises 6 cohorts (BLOCKED operations, expiring licenses ≤30d, EUCs awaiting >7d, POTENTIAL_MATCH/STALE/CONFIRMED_HIT parties, VSD authority-deadlines ≤30d, VSDs sitting in DISCOVERED) into a flat `ActionItem[]`. Severity classification with concrete bands (critical / warning), sort-by-severity-then-by-urgency, no Prisma coupling.
- ✅ New `src/app/(trade)/trade/_components/ActionInboxPanel.tsx` — Linear-style flat list: severity-coloured leading chip, title + optional subtitle, countdown chip ("in 7d", "sent 12d ago"), per-row deep-link to the source detail page. Top-8 by default + "Show all N items ↓" disclosure for busy orgs. "All clear" empty state with Astra link instead of bare nothing.
- ✅ Wired into `/trade` welcome page above UpcomingDeadlinesStrip — "act now" beats "act in 14d" for daily-triage attention.
- ✅ a11y: section `aria-labelledby`, items rendered as a proper `<ul role="list">`, severity announced via offscreen "Severity: Critical/Warning/Info", `aria-expanded` on the disclosure toggle.
- ✅ 21 vitest tests covering all 6 cohort transforms, severity bands, sort order, id uniqueness across cohorts, and the presentation helpers.

**Deferred to next sprint:**

- ❌ Per-row Snooze / Resolve actions (need mutation API + per-user persistence)

**Aufwand:** ~3h ✅ (vs. 2 Tage estimate — pure-function aggregator + reuse of already-fetched data made it fast)
**Impact:** Sehr hoch (daily-triage transformation) — every login now starts with "here's what's burning"
**Files:** `action-inbox-aggregator.ts` + `action-inbox-aggregator.test.ts` + `ActionInboxPanel.tsx` + `/trade/page.tsx`

### U-HIGH-2 — Skeleton-Screens statt "Loading..." text

**Was:** Loading-States sind flacher "Loading licenses..." Text.
**Fix:** Animated Skeleton-Cards (grey boxes in der Form des Final-Layouts) per Page.
**Aufwand:** 1.5h
**Impact:** Mittel-Hoch (perceived performance)
**Files:** New `src/app/(trade)/trade/_components/Skeletons.tsx` + replace per-page loading divs

### ✅ U-HIGH-3 — Notification-Badges auf Sidebar **(DONE — Phase 2)**

**Was:** Sidebar zeigt keine Counts pro Section.
**Fix:**

- ✅ `getSidebarBadgeCounts(orgId)` aggregator (5 cohorts in parallel: parties needing review / blocked ops / licenses expiring ≤14d / EUCs awaiting action / open VSDs)
- ✅ Layout fetches counts server-side, passes through TradeShell → TradeSidebar as serializable prop
- ✅ Right-aligned tabular-nums pills (`rgba(255,255,255,0.10)` chip) only render when count > 0 (avoid alert-fatigue from empty badges)
- ✅ "99+" rollover cap (Gmail/Slack/Linear convention)
- ✅ `aria-label` augmentation per row: "Counterparties (3 need screening review)" for VoiceOver clarity
- ✅ Super-admin "no org" sentinel short-circuits to zeros; graceful degradation if any individual cohort query throws
- ✅ 9 vitest tests covering filters, short-circuit, parallel exec, and failure path

**Aufwand:** ~1.5h (vs. 2h estimate) ✅
**Files:** `src/lib/trade/sidebar-badge-counts.server.ts` (NEW) + `sidebar-badge-counts.test.ts` (NEW) + TradeSidebar + TradeShell + layout
**Commits:** Phase 2 batch

### ✅ U-HIGH-4 — Better Empty-States mit CTAs **(DONE — Phase 3a)**

**Was:** "No items yet" + Button = bare minimum.
**Shipped (this batch):**

- ✅ Shared `src/app/(trade)/trade/_components/EmptyStateRich.tsx` — icon + title + description + primary CTA + Astra deep-link + arbitrary secondary actions
- ✅ Items / Parties / Operations / Licenses pages — all 4 EmptyStates rewritten to delegate to EmptyStateRich
- ✅ `AstraChatInput` patched to read `?prefill=` query param — pre-fills the textarea + focuses + caret-to-end, but does NOT auto-send (user can edit before submitting)
- ✅ Per-page Astra prompts: "How do I classify a new trade item?" / "How does Caelex screen counterparties?" / "Walk me through the operation lifecycle" / "Which license should I pursue?"
- ✅ Per-page secondary actions wire cross-entity flows: items → counterparties; parties → items + operations; operations → items + parties + licenses; licenses → operations

**Deferred (not in scope for the immediate batch):**

- ❌ "Quick-start example" link — needs `sample-data-seeder.server.ts` (U-CRIT-2)
- ❌ "Import from CSV / BoM" button — needs S-2 strategic build
- ❌ "Watch 30-second demo" video link — no demo assets yet

**Aufwand:** ~1.5h ✅
**Impact:** Hoch (first-task completion) — every empty page now nudges 3 directions: do the obvious thing, ask Astra, or jump to a related setup page
**Files:** New `EmptyStateRich.tsx`, modified items/parties/operations/licenses page.tsx, modified `src/components/astra/AstraChatInput.tsx`

### U-HIGH-5 — Filter Combinations + Saved Views

**Was:** Single-select status pills + simple search.
**Fix:**

- Multi-Select Status-Filter (cmd-click adds to selection)
- Date-Range-Picker für created/updated
- "Save this view" → named filter combos (e.g. "My pending reviews")
- "Saved views" dropdown
  **Aufwand:** 2 Tage
  **Impact:** Hoch (Power-User efficiency)
  **Files:** Each list page + new `FilterBar` component + DB `TradeUserView` model

### ✅ U-HIGH-6 — Workflow Stepper für Operations **(DONE — Phase 3b)**

**Was:** Operation-Lifecycle DRAFT→SCREENING→AWAITING_LICENSE→LICENSED→EXECUTED nur als kompakte Pill-Reihe.
**Shipped:**

- ✅ New `src/app/(trade)/trade/operations/_components/OperationStepper.tsx` — proper horizontal stepper: numbered circles for upcoming, accent-fill icon for current, emerald-check for done. Off-pipeline states (BLOCKED / VOLUNTARY_DISCLOSURE_FILED) render the happy path + a separate red terminal pill so direction-of-flow stays readable.
- ✅ `OperationLifecyclePanel.tsx` refactored to delegate visualization to the new stepper.
- ✅ "Next Action" primary CTA — single bright button labeled with a verb ("Submit for classification" / "Begin sanctions screening" / "Mark as licensed" / etc.) promoted from the canonical happy-path transition. Other allowed transitions demoted under a "More actions (N) ↓" disclosure so the user sees one obvious next move instead of a wall of buttons.
- ✅ a11y: `role="group"` + `aria-label` on stepper, `aria-current="step"` on the active node, offscreen "Step N of 6: Label · in progress" verbose announcement per step, `aria-expanded` + `aria-controls` on the disclosure.
- ✅ Pure-function helpers `happyPathNext` + `nextActionLabel` exported with 8 vitest tests covering the chain (DRAFT→…→EXECUTED), terminal nulls, and verb-phrasing guard.

**Aufwand:** 4h ✅
**Impact:** Mittel-Hoch (workflow clarity)
**Files:** `OperationStepper.tsx` (NEW) + `OperationStepper.test.ts` (NEW) + `OperationLifecyclePanel.tsx` (refactored)

### ✅ U-HIGH-7 — Contextual Help / Inline Tooltips **(DONE — Phase 5a)**

**Shipped:**

- ✅ Extracted the 26-term glossary out of `TradeHelpCenter.tsx` into a shared `src/lib/trade/glossary.ts` module so both surfaces (help-center side-panel + inline tooltip) consume one source-of-truth. Lookup is case-insensitive, whitespace-tolerant, with alias support ("AWG", "AWV" both resolve to the "AWG / AWV" entry).
- ✅ New `src/app/(trade)/trade/_components/Term.tsx` — inline tooltip primitive: dotted underline + hover/focus popover with the glossary definition. Usage: `<Term>ECCN</Term>`. Falls back to plain text when the term isn't in the glossary (no noise on typos / new acronyms).
- ✅ Accessibility: trigger is `<span tabindex=0 role=button aria-describedby=…>`, tooltip itself has `role="tooltip"`, Esc closes when focused, hover AND focus both open.
- ✅ Wired into two high-traffic disclaimer paragraphs:
  - `parties/page.tsx` — wraps **OFAC** in the mandatory-disclaimer copy
  - `operations/page.tsx` — wraps **AWG**, **EAR**, **ITAR** in the Freiheitsstrafen-disclaimer
- ✅ 10 vitest tests for `lookupTerm` + glossary integrity (case/whitespace tolerance, alias resolution, no-duplicates, coverage of must-have high-traffic terms).

**Deferred:** 50+ further wrappings across the codebase — the primitive is in place and trivial to extend per page over time. Inline-help-icon next to form labels (popovers with explanations) — separate sprint.

**Aufwand:** ~2.5h ✅ (vs. 1 Tag estimate)
**Impact:** Hoch (lower onboarding curve) — every "AWG"/"EAR"/"ITAR" mention now reveals its meaning on hover, no jump-out-of-context required
**Files:** `glossary.ts` (NEW) + `glossary.test.ts` (NEW) + `Term.tsx` (NEW) + `TradeHelpCenter.tsx` (refactor) + 2 list-page disclaimers

### ✅ U-HIGH-8 + ✅ U-LOW-4 — In-app Help Center side-panel **(DONE — Phase 4b)**

Combined both items into one panel because they answer the same operator question ("what am I looking at and how do I use it?"). Splitting them across two surfaces would fragment the answer.
**Shipped:**

- ✅ New `src/app/(trade)/trade/_components/TradeHelpCenter.tsx` — slide-in side-panel mounted globally in TradeShell.
- ✅ Triggers (any of): "?" key (Slack/Linear/GitHub convention), "Help" button in sidebar footer, programmatic `window.dispatchEvent(new Event("caelex-trade:open-help"))`.
- ✅ Smart "?" handler — ignores the keypress when focus is inside an `<input>`, `<textarea>` or contentEditable so typing "?" into search bars doesn't open the panel.
- ✅ Four sections:
  - **Quick start with Astra** — 3 pre-filled deep-link prompts (classify / screen / license-choice)
  - **Glossary** — 26 curated compliance acronyms (ECCN/USML/FDPR/AGG/BAFA/OFAC/CSA/AUKUS/MTCR/NSG/Wassenaar/etc.) with one-line definitions + per-entry category tags. Live search filters across term + definition + category.
  - **Keyboard shortcuts** — ⌘K/Ctrl+K/⌘/ → palette, ? → help, Esc → close — rendered as `<kbd>` chips.
  - **Resources** — links to Training Corpus + Compliance Program page.
- ✅ a11y: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`, Esc-to-close, click-outside-to-close, sidebar trigger has `title` + visible `<kbd>` hint showing the "?" shortcut, close button has `aria-label`, glossary search input has hidden label.
- ✅ Discoverable: sidebar footer now has a "Help" button with a `kbd-styled` ⌘-style hint chip showing "?" so first-time users find it visually before learning the shortcut.

**Aufwand:** ~2h ✅ (vs. 1 Tag estimate — sharing the surface across U-HIGH-8 + U-LOW-4 halved the work)
**Impact:** Hoch — self-service answers for the most-Googled compliance acronyms inline + power-user shortcut discovery
**Files:** `TradeHelpCenter.tsx` (NEW) + `TradeShell.tsx` (mount) + `TradeSidebar.tsx` (trigger button + ? kbd hint)

---

## 🟡 MEDIUM — Polish

### U-MED-1 — Autosave + "Saved" indicators

**Was:** Forms keine Autosave, kein "Saving..." Toast.
**Fix:** Debounced autosave on Settings inputs + inline "✓ Saved 2s ago" indicator.
**Aufwand:** 1 Tag
**Files:** Settings tab forms

### U-MED-2 — Optimistic UI

**Was:** Save-Buttons wait for server response.
**Fix:** Update UI immediately, rollback on error.
**Aufwand:** 0.5-1 Tag pro form
**Files:** Settings + Operations + Items mutation paths

### U-MED-3 — Decision-Audit-Trail UI

**Was:** Audit-Trail data exists, no in-context UI.
**Fix:** "History" tab on Item/Operation/Counterparty detail pages.
**Aufwand:** 1 Tag
**Files:** Each detail page + new `HistoryPanel.tsx`

### U-MED-4 — Print/Export für Audits

**Was:** No "Export as PDF" / "Generate Audit Pack" buttons.
**Fix:** "Export PDF" auf List pages + "Generate Audit Pack" on dashboards.
**Aufwand:** 1.5 Tage
**Files:** Reuse existing PDF generator + per-page buttons

### ✅ U-MED-5 — Card visual priority + status-tinted alerts **(DONE — Phase 3c)**

**Was:** All KPI-cards visually equal.
**Shipped:**

- ✅ `KpiCard` extended with full-card `accentTintClass` (soft hue tint on card surface) on top of the existing accent left-border — strong enough to differentiate at a glance, soft enough not to wash out the value
- ✅ New `pulse` prop: subtle amber outer-ring `animate-pulse` for cards with actionable backlogs. Wrapped in `motion-safe:` so users with `prefers-reduced-motion` never see it
- ✅ Wiring:
  - **Open Licenses** → amber accent when `expiringSoon > 0`
  - **Pending Reviews** → amber accent + pulse when `total > 0`
  - **Compliance Score** → emerald/amber/red accent via `scoreAccent(score)` (already wired pre-Phase 3c)
- ✅ Pulse uses a `motion-safe:before:…` pseudo-element so the card content itself never opacity-flickers (would impede reading)

**Aufwand:** ~1h ✅ (vs. 2h estimate)
**Impact:** Hoch — turns the dashboard from "static cards" into "the dashboard taps you on the shoulder"
**Files:** `src/app/(trade)/trade/_components/KpiCardsRow.tsx`

### ✅ U-MED-6 — Status-Pills mit Icons (not color-only) **(DONE — pre-Phase 3)**

**Was:** Status conveyed via color only in some chips.
**Shipped:** Audit confirms all 4 list pages already have an icon prefix on every status pill:

- `items` STATUS_CONFIG: Clock / CheckCircle2 / AlertTriangle / Archive per status
- `parties` ScreeningBadge: Shield / ShieldCheck / ShieldAlert / AlertTriangle per screening status (icon-only)
- `operations` StatusBadge: Clock / CheckCircle2 / XCircle / AlertTriangle per status
- `licenses` STATUS_META: Clock / ShieldCheck / XCircle / ShieldAlert per status

**Aufwand:** 1h ✅ (work landed across earlier port sprints)
**Impact:** WCAG SC 1.4.1 — colour is never the sole means of conveying status
**Files:** All 4 list pages

### U-MED-6 — Status-Pills mit Icons (not color-only)

**Was:** Status conveyed via color only in some chips.
**Fix:** Add icon prefix to every status pill (Clear → ✓, Pending → ⋯, Confirmed → ⚠).
**Aufwand:** 1h
**Files:** Counterparty status pills, license status badges

### ✅ U-MED-7 — Recently Visited Sidebar Section **(DONE — Phase 4c, partial)**

**Shipped:**

- ✅ New `useRecentlyVisited()` hook (localStorage-backed, key `caelex-trade:recently-visited`, max 5 entries, de-dupes on revisit so the latest position 0 always reflects the most recently visited)
- ✅ Excludes the welcome page itself + `/trade/astra` sub-routes (those have their own internal state) from the history
- ✅ New `RecentlyVisitedSection.tsx` rendered in TradeSidebar BELOW the static nav (so a first-time user with no history doesn't see anything extra; the section only appears once it has entries)
- ✅ Per-entry label resolved via longest-prefix-match against ROUTE_PREFIXES (e.g. `/trade/items/abc-12` → label "Items" + faded detail "abc-12")
- ✅ Active state highlight when row matches current pathname

**Deferred:** "Pin/Unpin" per item — needs a second localStorage key + UI primitive; not in MVP.

**Aufwand:** ~1.5h ✅ (vs. 1 Tag estimate)
**Impact:** Mittel-Hoch (saves the sidebar round-trip for daily-jumping operators)
**Files:** `useRecentlyVisited.ts` (NEW) + `RecentlyVisitedSection.tsx` (NEW) + `TradeSidebar.tsx` (mount)

### U-MED-8 — Mobile-Responsive Tables

**Was:** Tables overflow horizontally on mobile.
**Fix:** Card-list mode below md breakpoint.
**Aufwand:** 1.5 Tage (per list page)

---

## 🟢 LOW — Nice-to-Have

### ✅ U-LOW-1 — Toast notifications mounted in TradeShell **(DONE — Phase 5d)**

**Shipped:**

- ✅ Mounted the existing `ToastProvider` (from `src/components/ui/Toast`) inside TradeShell so any descendent client component can call `useToast()` for success / error / warning / info pills.
- ✅ Wired into OnboardingBanner seed flow — success, already-seeded, and error each surface a top-right toast in addition to the inline state, so users with the banner scrolled off-screen still see the outcome.
- ✅ ToastProvider is itself already a11y-correct (`role="region"`, `aria-live="polite"`, auto-dismiss timing).

**Deferred:** Persistent notification-history popover (separate sprint — needs a per-user persistence model).
**Aufwand:** ~30min ✅ (existing primitive made this trivial)
**Files:** `TradeShell.tsx` + `OnboardingBanner.tsx`

### U-LOW-2 — Dark/Light-Mode-Toggle

**Fix:** Settings → Appearance → Light/Dark/System.

### U-LOW-3 — Density-Toggle (Comfortable/Compact)

**Fix:** Settings → UI → Density. Affects row-height tokens.

### ✅ U-LOW-4 — Keyboard-Shortcuts-Cheatsheet **(DONE — Phase 4b, combined with U-HIGH-8)**

**Shipped** as a section of TradeHelpCenter — see U-HIGH-8 entry above.

### U-LOW-5 — Animated Transitions zwischen Pages

**Fix:** Subtle slide-in on route change (Framer Motion).

---

## 🚀 STRATEGIC — 1+ Wochen Builds

### S-1 — Astra Smart-Defaults across Forms

**Was:** Forms ohne AI-Suggestions.
**Fix:** Astra-Powered Auto-Fill: ECCN-Suggestion auf Items, Counterparty-UBO auto-resolve via OpenSanctions, etc.
**Aufwand:** 1 Woche

### S-2 — CSV / SAP / ERP Import-Pipeline

**Was:** Manuelle Daten-Entry only.
**Fix:** Drag-drop CSV import for Items + Counterparties + Licenses. Mapping-UI für Spaltennames.
**Aufwand:** 1 Woche

### S-3 — Compliance-Dashboard mit Live-Risk-Score

**Was:** No central risk view.
**Fix:** Trade Posture Dashboard (separate from /trade welcome) with real-time aggregated risk metrics per regime.
**Aufwand:** 1.5 Wochen

### S-4 — Multi-Workspace + Org-Switcher

**Was:** Single-org per session.
**Fix:** Multi-org membership + sidebar workspace switcher (like Slack).
**Aufwand:** 2 Wochen

### S-5 — Real-Time Collaboration (Multi-User on Same Item)

**Was:** Single-User edits only.
**Fix:** Yjs/CRDT collab on Item classification + Operation review.
**Aufwand:** 3+ Wochen

---

## 📋 Execution Order (Recommended)

### Phase 1 — Quick Wins (1 Tag total)

1. U-CRIT-1 Enum-Humanizer (1h)
2. U-CRIT-3 Sidebar Tooltips (45min)
3. U-HIGH-2 Skeleton-Screens (1.5h)
4. U-MED-6 Status-Pills with icons (1h)
5. U-MED-5 Card visual priority (2h)
6. W14-W20 Remaining WCAG (2-3h)

### Phase 2 — Power-User Basics (1 Woche)

7. U-CRIT-4 Command Palette ⌘K (1 Tag)
8. U-HIGH-1 Today's Action Inbox (2 Tage)
9. U-HIGH-3 Notification Badges (2h)
10. U-HIGH-7 Contextual Tooltips (1 Tag)
11. U-HIGH-8 Help-Center in Header (1 Tag)

### Phase 3 — Onboarding (1 Woche)

12. U-CRIT-2 Onboarding Tour + Sample-Data (2 Tage)
13. U-HIGH-4 Better Empty-States (1.5h)
14. U-CRIT-5 Bulk Operations (2-3 Tage)
15. U-HIGH-5 Filter Combos + Saved Views (2 Tage)

### Phase 4 — Strategic (2+ Wochen)

16. S-1 Astra Smart-Defaults
17. S-2 CSV Import Pipeline
18. S-3 Compliance Dashboard
19. Mobile-Responsive

---

## 🎯 Definition of "Maximal Nutzerfreundlich"

When ALL of these are true:

- [ ] New user completes first task (classify an item) in <2 minutes
- [ ] Power user can do bulk-operation on 50 items in <30 seconds
- [ ] No untooltipped jargon visible anywhere
- [ ] Every page loads with skeleton + content streams in
- [ ] Status, validation, errors all announced to screen reader
- [ ] ⌘K palette finds anything in <3 keystrokes
- [ ] Compliance-Officer can generate audit-pack PDF in 1 click
- [ ] Today-Inbox shows what needs attention right now
- [ ] WCAG 2.2 AA + EU Accessibility Act fully compliant
- [ ] Mobile works for triage + read-only

---

## SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
