# Caelex Trade — UI-Redesign, Phase 2: Reibung killen (Such-Picker + Datenblatt-Auto-Klassifizierung)

**Status:** Design approved (2026-05-31) · **Surface:** Caelex Trade (`src/app/(trade)/trade/**`) · **Branch:** `fix/trade-to-92`
**Author:** Claude (Opus 4.8) with Julian Polleschner
**User bar (carried from Phase 1):** „maximal führen · so viel wie möglich automatisieren · auto-vorbereiten, Mensch bestätigt."

---

## 0. Context — Phase 2 of 3

Phase 1 (shipped) rebuilt the navigation + Home cockpit + tokens. Phase 2 attacks the **two highest-friction patterns that recur across the core flows**, chosen by the user over a per-flow rewrite:

1. **Raw-ID entry → searchable pickers.** The Ausfuhrvorgang wizard makes the operator type raw IDs (`itm_abc123`, `tp_xyz789`). Replace with a debounced search picker that finds items/parties by name and shows their status — using the **`?q=` search APIs that already exist**.
2. **Manual classification → datasheet-driven auto-classification.** Item creation has no datasheet upload; the Claude-Vision extractor exists (`extract-vision` route) but is **unwired in the create UI**. Add a dropzone: PDF → Vision attributes → parametric-matcher → suggested ECCN/USML → operator confirms.

Both directly serve "maximal führen" + "auto-vorbereiten, Mensch bestätigt." Phase 3 (deep data tables, smart Documents filtering, screening batch-triage, licence renewal) stays separate.

## Verified groundwork (all confirmed in code at design time)

- **Search APIs already exist.** `GET /api/trade/items?q=…` filters by name/SKU/ECCN (`contains`, insensitive) and returns `{ id, name, internalSku, eccnEU, status, … }`. `GET /api/trade/parties?q=…` filters by `legalName` and returns `{ id, legalName, countryCode, status, screeningStatus }`. The pickers consume these — **no new backend**.
- **Vision extractor is wired as a route but not in the create UI.** `POST /api/trade/classify/extract-vision` accepts `multipart/form-data` with a `file` (PDF), runs regex + (cost-gated) `extractDatasheetViaVision`, merges via `mergeExtractions`, and returns `{ ok: true, extraction: MergedExtraction, skippedVision, … }`. `extraction.attributes` are **physical attributes** (`{ attribute, value, confidence: "high"|"medium"|"low", reasoning }`), NOT ECCN codes. Role-gated to Owner/Admin/Manager; rate-limited `document_generation`.
- **Attributes → codes is a second step.** The parametric matcher `matchAgainstCrossWalk(itemAttributeBag)` (in `src/lib/comply-v2/trade/classification/parametric-matcher.ts`) turns attributes into candidate control-list entries (the suggested ECCN/USML). So the suggestion chain is **PDF → extract-vision → attributes → matcher → candidate codes → confirm**.
- **The wizard's raw-id fields** live in `src/app/(trade)/trade/operations/new/page.tsx`: `Draft.itemId` / `Draft.counterpartyId` (string), set by `onChange={(e) => patch({ itemId: … })}` at the "was"/"anWen" steps. These two inputs are what the pickers replace.
- **Style + automation philosophy** are inherited from the Phase-1 spec (Linear×Bloomberg tokens, auto-prepare/human-confirms). No re-decision needed.

---

## 1. Feature A — `AsyncSearchPicker` (search instead of raw IDs)

### The unit

A reusable client component `AsyncSearchPicker<T>` that:

- Renders a search input; on input (debounced ~250ms) fetches a caller-provided async `search(query) → Promise<Option<T>[]>`.
- Shows a results dropdown; each option renders a caller-provided `renderOption(item)` (so items show name + SKU + classification status; parties show name + country + screening status).
- On select, calls `onSelect(item)` and collapses; shows the chosen item as a "chip" with a clear (×) to reset.
- Empty results show a "Nicht gefunden" row **with an optional `onCreateNew` action** ("+ Neu anlegen") when the caller provides it.
- Keyboard: ↑/↓ to move, Enter to select, Esc to close. ARIA combobox roles.

It is generic + presentational; it does NOT know about items/parties — the caller supplies `search`, `renderOption`, `getId`, `getLabel`, and optional `onCreateNew`. This keeps it testable in isolation and reusable in Phase 3.

### Two thin adapters (caller-side, in the wizard)

- **Item picker:** `search(q)` = `fetch('/api/trade/items?q='+q)` → map to options; `renderOption` shows `name`, `internalSku`, and a status pill (`status === "CLASSIFIED"` or an ECCN present → green "✓ klassifiziert · {eccnEU}"; else amber "○ unklassifiziert"). `onCreateNew` → opens the inline quick-create (Feature C) or links to `/trade/items` with a return.
- **Party picker:** `search(q)` = `fetch('/api/trade/parties?q='+q)` → options; `renderOption` shows `legalName`, `countryCode`, and a screening pill (CLEAR=green, POTENTIAL_MATCH/CONFIRMED_HIT=red/amber, NOT_SCREENED/STALE=muted). `onCreateNew` → inline quick-create party.

### Wizard wiring

In `operations/new/page.tsx`, the "was" step's raw `itemId` text input is replaced by the item `AsyncSearchPicker` (it sets `draft.itemId` from the selected option's id, and stashes the chosen item's display label for the chip). The "anWen" step's raw `counterpartyId` input is replaced by the party picker (sets `draft.counterpartyId`). The "Weiter" buttons stay disabled until a real selection exists (same gate, now id-from-selection instead of free text). Quantity/unit-value/destination/end-use are unchanged.

## 2. Feature B — `DatasheetDropzone` + suggestion card (auto-classify on create)

### The flow

On the item create surface (the list page's `NewItemForm` and/or a dedicated create step), add a `DatasheetDropzone`:

1. Operator drags/drops or picks a **PDF**. The component POSTs it as `multipart/form-data` (`file`) to `/api/trade/classify/extract-vision`.
2. On `{ ok: true, extraction }`, it shows a **suggestion card**: the merged `extraction.attributes` (each with its `confidence` + `reasoning` tooltip), and — by running them through the parametric matcher — the **candidate ECCN/USML** with confidence.
3. The card has **"✓ Übernehmen"** (apply the suggested codes + attributes into the create form / the new item) and **"Bearbeiten"** (apply but let the operator adjust). Nothing is persisted as a binding classification without the operator's confirm — _auto-prepare, human confirms_.
4. Errors (`{ ok: false, error }`, non-PDF, Vision down, role/ratelimit 403) degrade gracefully: the card shows the message; the operator can still classify manually (the existing path is untouched).

### Where the matcher runs

To keep the client thin and avoid shipping the cross-walk to the browser, the suggestion (attributes → candidate codes) is computed via a small **new GET/POST helper or an extension of the extract-vision response**. Decision for v1: a new lightweight route `POST /api/trade/classify/suggest-codes` that takes the `extraction.attributes` (or the dropzone calls the existing matcher path) and returns candidate codes. _Implementation detail finalised in the plan; the matcher (`matchAgainstCrossWalk`) and its result shape already exist — this route is a thin wrapper, no new classification logic._ If the simplest correct path is to have `extract-vision` ALSO return the matcher candidates in one response, the plan may fold it in instead of a second route — whichever avoids a second round-trip without duplicating logic.

### Reuse

The suggestion card reuses the existing `ClassificationPanel` / `ParametricMatcherPanel` look where it fits; the dropzone styling follows the existing BAFA-Bescheid `LicensePdfDrop` pattern (a drop affordance already proven in the licence create form) so the interaction is consistent with the rest of Trade.

## 3. Feature C — Inline quick-create (so "not found" doesn't bounce the user away)

When a picker's search returns nothing, the **"+ Neu anlegen"** affordance opens a minimal inline create (a small panel/modal, not a navigation away):

- **Item quick-create:** name (+ optional SKU) → `POST /api/trade/items` → the new item id is selected into the wizard. The DatasheetDropzone (Feature B) is available here too, so a brand-new item can be datasheet-classified on the spot.
- **Party quick-create:** legalName + countryCode → `POST /api/trade/parties` → selected into the wizard.
  This closes the loop: the operator never leaves the Ausfuhrvorgang to create a missing item/party.

---

## 4. Architecture & component boundaries (small, isolated units)

- `src/app/(trade)/trade/_components/AsyncSearchPicker.tsx` (new, client, **generic**) — the reusable search-select. Props: `{ search, renderOption, getId, getLabel, placeholder, value, onSelect, onClear, onCreateNew? }`. Pure presentational over a caller-supplied async `search`. Unit-tested with a mocked `search`.
- `src/app/(trade)/trade/operations/new/_components/ItemPicker.tsx` (new, client) — the item adapter (fetch `/api/trade/items?q=`, render status pill). Thin.
- `src/app/(trade)/trade/operations/new/_components/PartyPicker.tsx` (new, client) — the party adapter (fetch `/api/trade/parties?q=`, render screening pill). Thin.
- `src/app/(trade)/trade/_components/DatasheetDropzone.tsx` (new, client) — the PDF dropzone → extract-vision → suggestion card. Props: `{ onApply(codes, attributes), disabled? }`.
- `src/lib/trade/classify-suggest.ts` (new, **pure**) — `attributesToCandidateCodes(attributes) → CodeSuggestion[]` wrapping `matchAgainstCrossWalk`; the only new logic, unit-tested. (Or fold into the route if that's cleaner — finalised in the plan.)
- `src/app/api/trade/classify/suggest-codes/route.ts` (new, optional) — thin auth-gated wrapper over `classify-suggest` IF a separate round-trip is chosen.
- `operations/new/page.tsx` (modify) — swap the two raw-id inputs for `ItemPicker`/`PartyPicker`; wire quick-create.
- `items/page.tsx` `NewItemForm` (modify) — add the `DatasheetDropzone` + suggestion-apply.

**No new DB model, no migration.** All persistence uses existing routes (`/api/trade/items`, `/api/trade/parties`, `/api/trade/operations[/lines]`, `extract-vision`). The only new "logic" unit is `attributesToCandidateCodes` (a pure wrapper over the existing matcher).

## 5. Error handling & edge cases

- **Search API failure / empty query:** the picker shows "Tippe zum Suchen…" for empty, "Keine Treffer" + create-new on empty results, and a soft error row on fetch failure (never blocks the wizard; the field just stays unselected).
- **Vision unavailable / non-PDF / 403 / rate-limited:** the dropzone shows the server's message and the manual classification path remains fully usable (Feature B is additive).
- **Low-confidence suggestions:** rendered with their `confidence` badge; "✓ Übernehmen" is always an explicit operator action — never auto-applied. A "low"-confidence candidate is shown but visually de-emphasised, and the operator is nudged to verify (consistent with conservative-by-design compliance).
- **Stale selection:** if a picked item is later deleted, the wizard's existing create-operation/add-line calls already 404 → surfaced as the existing error toast; no new handling needed.

## 6. Testing

- `AsyncSearchPicker` — component tests: typing fires the debounced `search`; results render; select calls `onSelect` + shows the chip; empty → create-new affordance fires `onCreateNew`; keyboard nav.
- `ItemPicker` / `PartyPicker` — tests with a stubbed `fetch`: maps API rows to options + renders the correct status pill.
- `attributesToCandidateCodes` — pure unit tests: a known attribute bag → expected candidate codes (mirrors the matcher's own tests; assert we pass through its candidates faithfully).
- `DatasheetDropzone` — component test: a stubbed `fetch` returning `{ ok: true, extraction }` renders the suggestion card; `{ ok: false, error }` renders the error + leaves manual path; "✓ Übernehmen" fires `onApply` with the codes.
- Wizard smoke: the "was"/"anWen" steps render the pickers and gate "Weiter" on a real selection.

## 7. Deliberately NOT in Phase 2 (YAGNI / later)

- Screening batch-triage UI (Flow 3) and licence renewal/conditions editor (Flow 4) → a later spec.
- Restyling the deep Items/Parties/Pipeline/Licenses tables → Phase 3.
- Multi-item BoM in the wizard (still single line) → later.
- Forcing a Vision re-run (`forceVision=true`) / OCR of physical-property fields beyond what extract-vision returns → later.
- Deep ⌘K entity search → incremental.

## 8. Why this is the right Phase 2

It removes the two frictions the user singled out, and both are **wiring existing capability into the UI**, not new engines: the `?q=` search APIs and the Vision/matcher classification chain already exist and are tested. So Phase 2 is high perceived-value (search instead of memorised IDs; drop a datasheet instead of hand-typing ECCNs) at low risk — the only new logic is one pure matcher-wrapper. It also delivers the reusable `AsyncSearchPicker` that Phase 3's data-table redesign will lean on.
