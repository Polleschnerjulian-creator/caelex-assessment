# MEVA / Caelex Trade — UX + WCAG Worklist

**Living-Doc · Created 2026-05-24 · Owner: ongoing Trade UI work**

This is the canonical worklist for making MEVA "maximal nutzerfreundlich"
(UX) AND fully WCAG 2.2 AA compliant (legal/EU Accessibility Act).
Update statuses as items ship. Group by phase + impact.

---

## 📊 Status Dashboard

| Stream                                     | % done | Last bump                                                       |
| ------------------------------------------ | ------ | --------------------------------------------------------------- |
| **WCAG 2.2 AA**                            | ~98%   | W18 progressbar (commit 88db0a1f)                               |
| **UX — Quick wins**                        | ~60%   | Phase 2 + U-HIGH-4 rich empty-states + Astra ?prefill deep-link |
| **UX — Phase A (Power-User basics)**       | ~50%   | U-HIGH-3 badges done; U-CRIT-4 palette + U-HIGH-1 inbox pending |
| **UX — Phase B (Onboarding + Bulk)**       | 0%     | not started                                                     |
| **UX — Phase C (Strategic deep features)** | 0%     | not started                                                     |

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

| #          | Fix                                                                                                                                                                                    | SC            | Aufwand  | Owner  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ------ |
| W14        | Run `npx @axe-core/cli` on production for actual contrast verification                                                                                                                 | 1.4.3         | 30min    | —      |
| W15        | VoiceOver/NVDA walkthrough of top-10 user flows                                                                                                                                        | —             | 4h       | —      |
| W16        | Per-input `autocomplete` attributes (name/email/address etc.)                                                                                                                          | 1.3.5 AA      | 1h       | —      |
| W17        | Form fieldset/legend for input groups in Settings                                                                                                                                      | 1.3.1 A       | 30min    | —      |
| ~~W18~~ ✅ | ~~Coverage-bar role="img" + aria-valuenow (CompliancePostureCard)~~ **DONE — Phase 2 follow-up** (commit 88db0a1f, used `role="progressbar"` which is more semantic than `role="img"`) | 1.3.1 + 4.1.2 | 15min ✅ | Claude |
| W19        | NotificationsTab + remaining ApiKeysTab inputs — aria-invalid + describedby                                                                                                            | 3.3.1 AA      | 1h       | —      |
| W20        | More per-section `lang="de"` patches on operations/licenses subtitles                                                                                                                  | 3.1.2 AA      | 1h       | —      |

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

### U-CRIT-2 — Onboarding Tour + Sample-Data

**Was:** Erster Login = leere App, kein Guide.
**Fix:**

- "Seed sample data" Button in Settings → erstellt 3 Items + 2 Parties + 1 Operation
- 5-Step Joyride-Tour (Today → Items → Parties → Operations → Audit)
- Toggle "Hide tour" persists in localStorage
  **Aufwand:** 2 Tage
  **Impact:** Hoch (first-user retention)
  **Files:** New `src/lib/trade/sample-data-seeder.server.ts` + `src/app/(trade)/trade/_components/OnboardingTour.tsx`

### ✅ U-CRIT-3 — Sidebar Tooltips für Jargon **(DONE — pre-Phase 2)**

**Was:** "Sammelgenehmigungen", "Deemed Exports", "FAA AST", "VSD" ohne Erklärung.
**Shipped:** All 15+ NavItems in `TradeSidebar.tsx` carry a 1-sentence `tooltip` field; surface via `title` attr on every `<Link>` row. Example: "Sammelgenehmigungen → German BAFA collective export authorisations (AGG / AGE) covering multiple shipments under one approval. Volume-cap + draw-down tracked."
**Aufwand:** 45min ✅ (landed in earlier WCAG batch)
**Impact:** Hoch (new-user comprehension)
**Files:** `src/app/(trade)/trade/_components/TradeSidebar.tsx`

### U-CRIT-4 — Command Palette ⌘K

**Was:** Keine globale Quick-Action. Comply V2 hat `CommandPalette` Component — Trade kann sie reusen.
**Fix:**

- Wire `src/components/dashboard/v2/CommandPalette.tsx` in TradeShell
- Trade-spezifische Verbs: "Classify item X" / "Add counterparty" / "Find license" / "Generate DCS"
- ⌘K Keyboard-Shortcut global
  **Aufwand:** 1 Tag
  **Impact:** Sehr hoch (Power-User transformation)
  **Files:** `src/app/(trade)/trade/_components/TradeShell.tsx` + new `TradeCommandPalette.tsx`

### U-CRIT-5 — Bulk Operations + Checkbox-Column

**Was:** Single-row clicks blockieren 1000+ Item Workflows.
**Fix:**

- Checkbox-Column auf Items / Parties / Licenses / Operations
- Bulk-Toolbar appears when selection >0: "Classify with Astra" / "Export" / "Delete"
- `select all matching filter` Pattern
  **Aufwand:** 2-3 Tage
  **Impact:** Sehr hoch (Power-User Throughput)
  **Files:** Each list page + new `BulkActionsBar` component

---

## 🟠 HIGH — Verlangsamt Daily Work

### U-HIGH-1 — Today's Action Inbox

**Was:** /trade Welcome zeigt KPIs + Quick-Start, aber kein triage-actionable feed.
**Fix:**

- Auto-aggregiert: ablaufende Licenses, ungescreente Parties, drafts >7d, expiring EUCs, blocked operations
- Linear-style Inbox: 1 Row pro Issue + Resolve-Action
- Per-item Snooze + Resolve + Open
  **Aufwand:** 2 Tage
  **Impact:** Sehr hoch (daily-triage transformation)
  **Files:** New `src/lib/trade/action-inbox-aggregator.server.ts` + `src/app/(trade)/trade/_components/ActionInboxPanel.tsx`

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

### U-HIGH-6 — Workflow Stepper für Operations

**Was:** Operation-Lifecycle DRAFT→SCREENING→AWAITING_LICENSE→LICENSED→EXECUTED nur als Bar.
**Fix:** Horizontal Stepper auf Operation-Detail mit Current-Step-Highlight + "Next Action" CTA.
**Aufwand:** 4h
**Impact:** Mittel-Hoch (workflow clarity)
**Files:** `src/app/(trade)/trade/operations/[id]/page.tsx` + new `OperationStepper.tsx`

### U-HIGH-7 — Contextual Help / Tooltips überall

**Was:** Compliance-Jargon ohne Hilfe.
**Fix:**

- Globaler `<Tooltip>` Component
- Wrap technical terms ("ECCN", "FDPR", "De Minimis") mit Hover-Definition
- Inline-Help-Icon (?) neben Form-Labels: opens popover with explanation
  **Aufwand:** 1 Tag (template + 50+ wrappings)
  **Impact:** Hoch (lower onboarding curve)
  **Files:** `src/components/trade/Tooltip.tsx` (NEW) + per-place wrappings

### U-HIGH-8 — Help-Center / Glossar / Docs-Link in Header

**Was:** Kein in-app Hilfe-Zugang.
**Fix:** Header-Button "?" → Side-Panel mit Glossar + FAQs + Astra-Chat-Shortcut.
**Aufwand:** 1 Tag
**Impact:** Hoch (self-service support)
**Files:** New `src/app/(trade)/trade/help/page.tsx` + Header-Button

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

### U-MED-5 — Card visual priority + status-tinted alerts

**Was:** All KPI-cards visually equal.
**Fix:** Tint cards red when compliance-score <80, pulse on pending reviews.
**Aufwand:** 2h
**Files:** QuickStartGrid + CompliancePostureCard

### U-MED-6 — Status-Pills mit Icons (not color-only)

**Was:** Status conveyed via color only in some chips.
**Fix:** Add icon prefix to every status pill (Clear → ✓, Pending → ⋯, Confirmed → ⚠).
**Aufwand:** 1h
**Files:** Counterparty status pills, license status badges

### U-MED-7 — Recently Visited / Pinned Sidebar Items

**Was:** Sidebar static.
**Fix:** "Recent" section at top of sidebar (last 5 visited pages). "Pin/Unpin" per item.
**Aufwand:** 1 Tag
**Files:** TradeSidebar + localStorage state

### U-MED-8 — Mobile-Responsive Tables

**Was:** Tables overflow horizontally on mobile.
**Fix:** Card-list mode below md breakpoint.
**Aufwand:** 1.5 Tage (per list page)

---

## 🟢 LOW — Nice-to-Have

### U-LOW-1 — Toast/Notification-Center

**Fix:** Top-right toast container + persistent notification-history popover.

### U-LOW-2 — Dark/Light-Mode-Toggle

**Fix:** Settings → Appearance → Light/Dark/System.

### U-LOW-3 — Density-Toggle (Comfortable/Compact)

**Fix:** Settings → UI → Density. Affects row-height tokens.

### U-LOW-4 — Keyboard-Shortcuts-Cheatsheet

**Fix:** "?" key → modal with all shortcuts.

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
