# Caelex Trade — UI-Redesign, Phase 1: Fundament & Home

**Status:** Design approved (2026-05-31) · **Surface:** Caelex Trade (`src/app/(trade)/trade/**`) · **Branch:** `fix/trade-to-92`
**Author:** Claude (Opus 4.8) with Julian Polleschner
**User bar:** „übersichtlich, nutzerfreundlich, super Spaß zu bedienen, top modern · keine unnötigen Menüpunkte · den Nutzer maximal führen · so viel wie möglich automatisieren."

---

## 0. Context — this is Phase 1 of 3

A full UI overhaul is too large for one spec, so it is decomposed:

- **Phase 1 (this spec):** the foundation — design tokens, the new slim navigation, the Home/Today page rebuilt as an **Action Cockpit**, and the first-run / empty state.
- **Phase 2 (later):** the core end-to-end flows (Ausfuhrvorgang as THE entry, item create+classify, party screening, screening-hit triage, licence lifecycle).
- **Phase 3 (later):** the deep data pages (Items, Counterparties, Pipeline, Licenses tables) + the 8 jurisdictional document types unified into one smart Documents hub.

Each phase gets its own spec → plan → build cycle. Phase 1 is what the user sees first and most often, so it lands first.

## Four approved design decisions (from the visual brainstorm)

1. **Navigation = "Schlank & aufgabenorientiert"** (option A): 6 top-level entries instead of 18, organised by task not data-entity.
2. **Home = "Aktions-Cockpit"** (option A): the page tells the user the single next action + a severity-sorted inbox; KPIs are small, at the bottom.
3. **Visual style = "Linear × Bloomberg"** (option A): the existing dark/indigo Trade DNA taken to its logical end — deep black, dense precision, sharp edges, indigo accent, subtle glows. Liquid-glass accents used sparingly on the most important verdict/hero cards (the glass system already exists).
4. **Automation level = "Auto-vorbereiten, Mensch bestätigt":** the system classifies, screens, pre-fills forms/reports and sorts by urgency automatically, but every legally-binding action (ship-release, BAFA submission, screening-hit decision) requires a one-click human confirmation. Conservative-by-design — a false auto-GO in export compliance is catastrophic.

---

## 1. Navigation — 18 → 6 entries

### Current (the problem)

The sidebar (`TradeSidebar.tsx`, `SECTIONS` array) has ~18 items across TODAY / MASTER DATA / OPERATIONS / DOCUMENTS + footer. It is organised by **data entity** (Items, Counterparties, and each of 7 document types as its own leaf) and by **tool** ("Classify AI" is a tool, not a destination). The user must decompose their task across many entries.

### New structure (preserve the existing `NavItem`/`NavSection`/`SidebarBadgeCounts` machinery — only change the `SECTIONS` content)

```
START
  🏠  Home              → /trade
  ✨  Astra             → /trade/astra        (prominent — the "just ask" entry)
ARBEIT
  🚀  Vorgänge          → /trade/operations   (badge: operationsBlocked; Pipeline + a big "+ Neuer Vorgang")
  📦  Stammdaten        → /trade/master-data  (one area, two tabs: Artikel `/trade/items` · Partner `/trade/parties`; badge: partiesNeedingReview)
  📄  Dokumente         → /trade/documents    (ONE smart hub for all authorisation types; badge: eucAwaitingAction + others)
FOOTER
  🛡️  Compliance-Programm → /trade/program
  ⚙️  Einstellungen        → /trade/settings
```

### What changes, concretely

- **"Classify AI" leaves the sidebar.** Classification is automatic inside a Vorgang and reachable via the ⌘K command palette — it is a verb, not a place.
- **Items + Counterparties → one "Stammdaten" area** with two tabs. (The existing `/trade/items` and `/trade/parties` pages become tabs/sub-routes; Phase 3 restyles their internals.)
- **The document/authorisation types (EUC `/trade/euc`, Re-Export `/trade/reexport-consents`, VSD `/trade/vsd`, Sammelgenehmigungen `/trade/sammelgenehmigungen`, France LOS `/trade/france-los`, UK ECJU `/trade/uk-ecju`, FAA AST `/trade/faa-ast`, Deemed Exports `/trade/deemed-exports`) → one "Dokumente" hub.** Phase 1 ships the hub as a **launcher page** that lists the document types as cards, **showing relevance** (a type the org never uses is de-emphasised; full smart-filtering by the org's actual destinations is Phase 3). The existing leaf routes keep working — the hub links to them. No leaf page is deleted in Phase 1.
- **Licenses** moves under "Vorgänge" (operations) — it is part of the operation lifecycle, not a separate top concept. (Phase 1: a tab/section; the existing `/trade/licenses` route stays reachable.)
- **Astra** is promoted to the second START entry (was buried).
- **Badges stay** — the existing `SidebarBadgeCounts` keys (`partiesNeedingReview`, `operationsBlocked`, `licensesExpiringSoon`, `eucAwaitingAction`, `vsdOpen`) map onto the new entries (aggregate where an entry now covers several old ones, e.g. Dokumente sums the document-type badges).

### Command palette (⌘K)

A new lightweight command palette is the catch-all for everything not in the 6 entries: "Neuer Vorgang", "Partner screenen", "Artikel klassifizieren", jump-to-licence, jump-to-document-type, search. This is what lets the sidebar stay at 6 without hiding functionality. Phase 1 ships the palette with the high-frequency actions + navigation; deep search is incremental.

---

## 2. Home — the Action Cockpit

Rebuild `src/app/(trade)/trade/page.tsx` (currently 703 lines, server component, already fetches `aggregateActionItems` from `action-inbox-aggregator`) around a single principle: **the page tells you what to do next.** Top-to-bottom hierarchy:

1. **Greeting + ⌘K bar** — date, workspace, "Guten Morgen", and the command bar top-right ("⌘K Suchen oder Aktion…").
2. **Hero — "Deine nächste Aktion"** (indigo gradient card, one liquid-glass accent): the single most important thing, derived from the action aggregator. E.g. _"3 Vorgänge warten auf deine Freigabe — alle automatisch klassifiziert & gescreent, du bestätigst nur"_ with a primary CTA. If there is no pending action, the hero shows an encouraging "alles erledigt" state + the primary "Neuer Vorgang" CTA. The hero is computed: pick the highest-leverage item (most-blocking, or the largest confirm-batch) from the aggregator.
3. **Posteingang (Action Inbox)** — the existing `ActionInboxPanel` fed by `aggregateActionItems(...)`, already severity-sorted (🔴/🟡/🟢). Restyle to the new dense-card look with a coloured left border per severity. Each row is one click to act. This is the heart of "the system guides you."
4. **Mini-stats strip** — 4 small tiles (Vorgänge aktiv · Compliance % · Artikel · Regime aktiv), reusing the real KPI data the page already fetches. Demoted from hero to footer (they answer "how are things" — secondary to "what to do").

The Compliance-Posture regime grid (16 regimes / 914 entries) from today's page moves into the Compliance-Programm page (it is reference, not a daily action) — or a collapsed "Abdeckung" strip; Phase 1 removes it from the Home hero area to keep the cockpit focused.

**Data:** all from what the page already fetches (the ~20 parallel Prisma queries + `aggregateActionItems`). No new queries required for Phase 1; the rebuild is presentational + the hero-selection logic (a pure function over the existing `ActionItem[]`).

## 3. First-run / Empty state (the user's current reality: 0 of everything)

When the workspace has 0 items / 0 parties / 0 operations, the cockpit must NOT show empty zero-cards (today's failure: four "0" tiles). Instead, Home renders a **first-run onboarding**:

- A welcoming hero: "Willkommen bei Caelex Trade — lass uns deinen ersten Ausfuhrvorgang prüfen."
- A 3-step getting-started checklist that doubles as the automation pitch: **① Was lieferst du?** (Artikel anlegen — wird automatisch klassifiziert) **② An wen?** (Partner anlegen — wird automatisch gescreent) **③ Darf ich liefern?** (Vorgang starten → 🟢/🟡/🔴 Urteil). Each step is a CTA; completing one advances the checklist.
- The Compliance-Posture "16 Regime · 914 Einträge" card is GOOD here as a trust signal (it shows the product's coverage before the user has data) — keep it on the empty state.
- Detection: a small server helper `hasAnyTradeData(orgId)` (counts items/parties/operations) decides cockpit-vs-onboarding. Pure, cheap, cached with the page's existing fetch.

## 4. Design tokens (Linear × Bloomberg)

The Trade theme already exposes the right CSS-variable surface (`tailwind.config.ts` maps `trade-bg-page/panel/elevated/subtle`, `trade-border[-subtle/-strong]`, `trade-text-primary/secondary/muted`, `trade-accent[-soft/-strong]`, `trade-hover`; values in `globals.css` `--trade-*`, scoped via `TradeThemeProvider`). Phase 1:

- **Audit + tune the dark-mode `--trade-*` values** toward the deep-black Linear/Bloomberg end (near-black page `#08080c`-ish, panel `#0c0c11`, sharp 1px borders `#1c1c24`, indigo accent kept). Do NOT introduce new arbitrary hex in components — everything references the tokens, so the whole surface shifts from one place.
- **Density + type scale:** define the cockpit's spacing/typography as a small set of reusable classes/tokens (label 10–11px uppercase tracked, body 13px, numbers 19–22px semibold) so Phases 2/3 inherit them.
- **Glass accent:** the hero + verdict cards may use the existing liquid-glass utility for the "premium" feel; everything else stays flat/sharp for speed + legibility.
- **Motion:** subtle, fast (Framer Motion already in use) — inbox items fade/slide in, hero has a soft glow; nothing slow or bouncy (Linear-grade restraint).

---

## 5. Architecture & component boundaries

New/changed units (each small, one responsibility):

- `TradeSidebar.tsx` (modify) — replace the `SECTIONS` content with the 6-entry structure; keep the `NavItem`/badge machinery. Add the ⌘K trigger.
- `src/app/(trade)/trade/_components/CommandPalette.tsx` (new, client) — ⌘K palette: a list of actions + navigation, keyboard-driven. Fed a static action registry + the nav routes.
- `src/app/(trade)/trade/page.tsx` (rebuild) — server component; decides onboarding-vs-cockpit via `hasAnyTradeData`; composes Hero + ActionInbox + MiniStats (or Onboarding).
- `src/app/(trade)/trade/_components/HomeHero.tsx` (new, client/server) — renders the single next action; pure selection `pickHeroAction(items: ActionItem[]): HeroAction` lives in `src/lib/trade/home-hero.ts` (pure, unit-tested).
- `src/app/(trade)/trade/_components/HomeOnboarding.tsx` (new) — the 3-step first-run checklist.
- `src/app/(trade)/trade/_components/MiniStatsStrip.tsx` (new) — the 4 demoted KPI tiles.
- `ActionInboxPanel.tsx` (restyle only — keep its `aggregateActionItems` data contract).
- `src/lib/trade/home-hero.ts` (new, pure) — `pickHeroAction` selection logic, the only new "logic" (everything else is presentation + token tuning).
- `src/lib/trade/has-trade-data.server.ts` (new) — `hasAnyTradeData(orgId)`.
- The new hub/area routes (`/trade/documents`, `/trade/master-data`) are **thin Phase-1 launchers** that link to the existing leaf routes; the deep restyle of those leaves is Phase 3.

**No new DB models, no migration.** All data comes from existing queries. The `pickHeroAction` pure function is the only testable new logic; the rest is presentational and verified visually + by component tests.

## 6. Error handling & edge cases

- **No action items / all clear:** hero shows the positive "alles erledigt → Neuer Vorgang" state, inbox shows an empty-but-encouraging state (not a blank).
- **Empty workspace (0 data):** onboarding instead of cockpit (§3).
- **Aggregator/query failure:** the page already runs ~20 parallel queries; wrap the cockpit sections so one failed sub-query degrades that panel (skeleton/"konnte nicht laden") without blanking the whole Home — mirror the existing `Promise.allSettled` resilience.
- **A removed-from-sidebar route is still deep-linked** (e.g. someone bookmarked `/trade/classify`): the route keeps working; only the nav entry is gone.

## 7. Testing

- `pickHeroAction` — pure unit tests: picks the most-blocking item; the confirm-batch case; the empty case → "alles erledigt".
- `hasAnyTradeData` — unit test (mocked counts) → onboarding vs cockpit boundary.
- `CommandPalette` — component test: opens on ⌘K, filters actions, fires the right route/action.
- Home page — component test: renders cockpit with data, renders onboarding at 0 data.
- Sidebar — the new 6-entry `SECTIONS` renders, badges map correctly.
- Visual check via the running app (the brainstorm mockups are the reference).

## 8. Deliberately NOT in Phase 1 (YAGNI / later phases)

- Restyling the deep data tables (Items, Counterparties, Pipeline, Licenses internals) → Phase 3.
- The full smart **filtering** of the Documents hub by the org's actual destinations → Phase 3 (Phase 1 ships the hub as a relevance-ordered launcher).
- The end-to-end flow polish of Ausfuhrvorgang / screening-triage / licence-renewal → Phase 2.
- Deep ⌘K search across all entities → incremental after Phase 1.
- Any new automation engine — the automation already exists (classify, screen, aggregator, crons); Phase 1 only **surfaces** it better.

## 9. Why this is the right Phase 1

It changes what the user sees first and most often — the navigation and the Home — with **almost no new backend**: the action aggregator, KPIs, and automation crons already exist; Phase 1 re-presents them as a cockpit that guides ("deine nächste Aktion"), trims the menu from 18 to 6 (task not entity), and fixes the empty-state first impression. Highest perceived-quality jump for the least risk, and it establishes the design tokens + command-palette pattern that Phases 2–3 inherit.
