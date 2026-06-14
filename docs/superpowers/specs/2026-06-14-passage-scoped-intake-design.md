# Passage Scoped-Intake (Datenblatt _oder_ manuell → relevante Felder → Vorgang) — Design v2

**Status:** Draft for review (v2 — corpus-as-source-of-truth) · **Date:** 2026-06-14 · **Branch:** `feat/trade-origin-determination`
**Author:** Claude (brainstormed with founder; pressure-tested via a 4-lens + adversarial-critic workflow) · **Supersedes UX of:** `2026-06-13-passage-datasheet-intake-design.md` (upload-only flow)

---

## Goal

Replace the upload-only `/trade/assess` flow with a two-entry-path intake (**Datenblatt hochladen** _or_ **manuell eingeben**) that converges on a **product-class-scoped attribute form**: only the fields that actually drive the classification for _this_ product class appear, pre-filled where extraction is confident, the rest completed by the operator — then "Vorgang starten". The classification then works from **real operator-confirmed inputs instead of guesses from missing data**, while staying strictly fail-closed (worst case = REVIEW, never a false GO).

**v2 core idea:** make the **control-list corpus the single source of truth** — derive the relevant fields _and_ their decisiveness order directly from the corpus predicates (no second hand-curated copy to drift), pin the taxonomy with a build-failing invariant test, give the _deciding_ field vision-recall, and turn the form into a live deterministic co-pilot. Everything new is read-only over data that already exists; the verdict still comes solely from the operator-confirmed code.

## Why (problem statement)

Three defects, all observed/verified:

1. **Guess-from-missing-data.** Today's flow lifts only 6 attributes from extraction and gives the operator _no way to supply the rest_. When a decisive attribute is blank, the matcher cannot rule out a code (the live star-tracker case surfaced MTCR Item-1.A.1 because `payloadKg`/`rangeKm` were blank).
2. **Taxonomy mismatch / drift.** The datasheet extractor assigns `itemClass = avionics.attitude.star_tracker`, but the parametric corpus gates on `spacecraft.adcs.star_tracker`. They never match, so the genuine parametric candidate never fires. This is a _second-copy drift_ class of bug.
3. **Hand-curation re-bakes the drift.** (Caught by the adversarial review of the v1 spec.) The v1 spec hand-curated a `relevantAttributes` array _and_ mislabeled codes — it cited `7A004` as the star-tracker code, but **`7A004` does not exist in the parametric corpus** (`grep` = 0 hits). The real parametric entry is `USML:XV(e)(16)` (ITAR, conjunctive) with an EAR-CCL `9A515.x` fall-through; v1 also mis-mapped `gnss_receiver → spacecraft.gnss` (misses the real `gnss.receiver` gate of `ECCN:7A005`). Any design that keeps a hand-maintained copy of the attribute↔control mapping will keep re-baking exactly this bug.

The fix is structural: **derive from the corpus, assert the taxonomy with a red-build test, and never keep a second copy.**

### Two corpora — an important distinction the design must respect

- **Parametric classification corpus** — `control-list-cross-walk.ts`. Drives the classification _suggestions_. A star tracker here is `USML:XV(e)(16)` (gated on `spacecraft.adcs.star_tracker` + `starTrackerAccuracyArcsec ≤ 1.0 (1σ)` **AND** `starTrackerSlewRateDegPerS ≥ 3.0`; trackers failing either threshold fall to `9A515.x`, EAR-CCL). GNSS receivers are `ECCN:7A005` (gated on `gnss.receiver` + `gnssMaxVelocityMPerS ≥ 600`).
- **Origin/landscape corpus** — `eu-annex-i.ts` + `origin-determination/`. Drives the verdict/Liefer-Landkarte. A star tracker here is **EU `7A004`** ("Star-trackers and other celestial navigation systems") — which is why the landscape returns 13 GO / 2 REVIEW / 6 BLOCKED.

A category's `canonicalItemClass` aligns to the **parametric** corpus (that is what the matcher gates on). The landscape continues to key off the confirmed EU/ECCN code via the existing path. The two are bridged by the `crossWalk` relationships already in `control-list-cross-walk.ts`.

## Non-goals (YAGNI)

- No new DB migration. The matcher already reads operator-supplied attributes from the `parametricAttributes` JSON bag; we widen what flows in, not the schema.
- No new AI in the classification or verdict path. Claude stays confined to datasheet extraction (guarded, opt-in). A _scoped second extraction pass_ is still extraction, not a decision.
- No rework of the back half (`landscape` → `verdict`).
- v1 ships the ~12 most space-relevant classes + an honest generic fallback. It does **not** catalog all corpus item-classes, build σ-normalization, reuse-classified-parts, a live landscape preview, or a multi-component (BOM) splitter (all = fast-follow, see Scope).

---

## Architecture

### 0. Build-failing corpus invariant (apply FIRST, before any other code)

`src/lib/trade/intake/canonical-item-classes.ts` exports `CANONICAL_ITEM_CLASSES: Set<string>` — the **distinct `itemClass` prefix values that actually appear in `CONTROL_LIST_CROSS_WALK` predicates**, computed at module load from the corpus (not hand-listed). A test asserts:

- Every `ProductCategory.canonicalItemClass` is a prefix of ≥1 real corpus `itemClass` predicate value (red build otherwise).
- Every `itemClass` the datasheet extractor's `classifyItemClass` can emit is in `CANONICAL_ITEM_CLASSES` (so extractor ↔ corpus can never drift again).

This single test turns the taxonomy-mismatch bug class — including the v1 spec's own `7A004`/`gnss` errors — into a red build. It is the cheapest possible insurance and is fail-closed in the CI sense.

### 1. Product-category catalog — `src/lib/trade/intake/product-categories.ts`

```ts
export interface ProductCategory {
  id: string; // "star_tracker" — persisted on the item
  label: string; // "Sternsensor (Star Tracker)" (German)
  blurb: string; // short helper under the label
  /** The canonical itemClass the PARAMETRIC corpus gates on. Validated at
   *  build time against CANONICAL_ITEM_CLASSES (Architecture §0). */
  canonicalItemClass: string; // "spacecraft.adcs.star_tracker"
  synonyms: string[]; // aid manual-path search + category detect
  /** Thin presentation overlay — MAY ONLY reorder / relabel / append.
   *  `hide` is render-only: a hidden attribute still flows to the matcher
   *  as absent (cannot-rule-out). NEVER a place to drop a decisive field. */
  overlay?: {
    order?: AttributeName[];
    hide?: AttributeName[];
    extraOptional?: AttributeName[];
  };
}
```

`relevantAttributes` is **no longer stored** — it is derived:

```ts
// src/lib/trade/intake/derive-relevant-attributes.ts (pure, memoized; corpus is static)
export function deriveRelevantAttributes(
  canonicalItemClass: string,
): AttributeName[];
//  = the union of every non-itemClass AttributeName referenced in a
//    ParametricPredicate of any ControlListEntry whose itemClass-prefix
//    predicate BIDIRECTIONALLY matches canonicalItemClass (handles the
//    corpus's varied prefix depths, e.g. propulsion.electric vs sensor.imager),
//    frequency-counted, ordered by the decisiveness rank (§1.5).
```

The rendered field set for a category = `deriveRelevantAttributes(canonicalItemClass)` reordered/relabeled by `overlay`, with `overlay.hide` removed _from the rendered list only_. **Test (curation is monotone-non-shrinking on the decisive set):** the derived set ⊆ (rendered ∪ hidden). Removing the stored array kills the second copy, so the field set can never fall out of sync with the corpus.

v1 categories (canonicalItemClass = a real corpus prefix; primary parametric code shown where verified — the implementer greps `control-list-cross-walk.ts` per class and the §0 test enforces prefix validity):

| id                  | label                     | canonicalItemClass               | primary parametric code                   |
| ------------------- | ------------------------- | -------------------------------- | ----------------------------------------- |
| `star_tracker`      | Sternsensor               | `spacecraft.adcs.star_tracker`   | `USML:XV(e)(16)` → fall-through `9A515.x` |
| `reaction_wheel`    | Reaktionsrad              | `spacecraft.adcs.reaction_wheel` | grep per class                            |
| `cmg`               | Drallrad / CMG            | `spacecraft.adcs.cmg`            | grep per class                            |
| `thruster_electric` | Elektrisches Triebwerk    | `propulsion.electric`            | `USML:XV(e)(16)` power-disjunct + others  |
| `thruster_chemical` | Chemisches Triebwerk      | `propulsion.chemical`            | grep per class                            |
| `eo_imager`         | EO-Imager / Optik-Payload | `sensor.imager`                  | grep per class                            |
| `sar_payload`       | SAR-Payload               | `spacecraft.remote_sensing.sar`  | grep per class                            |
| `radhard_ic`        | Rad-harter IC / Prozessor | `ic.radhard`                     | grep per class                            |
| `gnss_receiver`     | GNSS-Empfänger            | `gnss.receiver`                  | `ECCN:7A005` (velocity ≥ 600 m/s)         |
| `rf_antenna`        | RF-Antenne / Transponder  | `rf.antenna`                     | grep per class                            |
| `solar_array`       | Solar-Array               | `spacecraft.power.solar`         | grep per class                            |
| `battery`           | Satelliten-Batterie       | `spacecraft.power.battery`       | grep per class                            |

> Where one user-facing category spans two corpus prefixes (e.g. EO payload across `sensor.imager` / `sensor.optical.*` / `spacecraft.remote_sensing.eo`), the bidirectional `deriveRelevantAttributes` already unions fields across reachable prefixes — pick the broadest single persist-prefix; a prefix-_set_ per category is deferred (only needed if a class genuinely cannot pick one).

### 1.5 Decisiveness ordering — `src/lib/trade/intake/decisiveness.ts` (one signal, consumed by all field ordering)

```ts
export function decisivenessRank(attribute: AttributeName): number;
//  weight ↑ when the attribute appears with a THRESHOLD op (lt/lte/gt/gte/between)
//  in a corpus entry, extra weight when that entry is ITAR-USML or MTCR-ANNEX
//  (use ControlListEntry.regime + reasonsForControl), × how many reachable
//  entries predicate on it. Pure read over the corpus.
```

The form renders fields top-to-bottom by: (1) decisive-AND-(blank or in-disagreement) first — a prioritized worklist that closes the exact gap that caused the bug; (2) other decisive fields, with **conjunction state surfaced** ("BEIDE nötig" for conjunctive partners like XV(e)(16)'s accuracy ≤ 1.0 AND slew ≥ 3.0); (3) high-confidence-prefilled + non-decisive fields collapsed below. The conjunctive-grouping and confidence-ordering behaviors _consume this one rank_ — they are not three separate systems. (The toggle-present-vs-absent simulation variant is dropped as over-engineering for a 12-class v1.)

### 2. Attribute dictionary — `src/lib/trade/intake/attribute-fields.ts`

```ts
export interface AttributeField {
  attribute: AttributeName;
  label: string; // "Genauigkeit (cross-boresight)"
  unit?: string; // "arcsec", "kg", "krad", "Hz", "°/s"
  kind: "number" | "boolean" | "enum" | "string";
  enumValues?: string[];
  help?: string;
}
```

One hand-written entry per `AttributeName` the v1 catalog references (label/unit/help are genuinely editorial). **Inline validation reuses `ATTRIBUTE_SANITY_RANGES`** (the matcher's _actual_ UNKNOWN-routing bound in `parametric-matcher.ts`) — imported, not redefined — so the form's validation and the matcher's fail-closed routing agree _by construction_. (Full metadata-generation from predicate value-types is deferred; the sanity-range reuse is the LOW slice that the v1 "parity" intent really wants.)

### 3. Flow / components

```
Entry screen (2 cards)
   ├── "Datenblatt hochladen"  → DatasheetDropzone → extract (1st pass)
   │        → rankCategories (scored, never decides) → pre-seed
   │        → scoped 2nd vision pass on the detected class's decisive attrs ─┐
   └── "Manuell eingeben"      → CategoryPicker (grouped, searchable) ───────┤
                                                                             ▼
                                          ScopedItemForm  (the convergence point)
                                            – category row (confirm/change; runner-up chips)
                                            – Artikelname
                                            – decisiveness-ordered scoped fields
                                              (prefilled w/ EvidenceSpan quote · low-conf = accept-prompt)
                                            – ClassificationPreview (live) + RationaleCard
                                            – certainty ladder (pinned < "genug" while decisive blank)
                                            – standing review prompts (SD tri-state · end-use banner · "no hit ≠ frei")
                                            – "Vorgang starten"
                                                       │ classify (richer bag)
                                                       ▼
                                          ClassifyConfirm (human confirms code) — UNCHANGED
                                                       ▼
                                          Liefer-Landkarte → Urteil — UNCHANGED
```

New/changed files:

| File                                                                 | Responsibility                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/trade/intake/canonical-item-classes.ts` (+test)             | §0 corpus-derived class set + invariant                               |
| `src/lib/trade/intake/product-categories.ts` (+test)                 | the catalog (data + overlay)                                          |
| `src/lib/trade/intake/derive-relevant-attributes.ts` (+test)         | corpus-derived field set                                              |
| `src/lib/trade/intake/decisiveness.ts` (+test)                       | derived field ordering signal                                         |
| `src/lib/trade/intake/attribute-fields.ts` (+test)                   | dictionary (labels/units) + sanity-range reuse                        |
| `src/lib/trade/intake/detect-category.ts` (+test)                    | extraction/text → ranked categories (never decides)                   |
| `src/app/(trade)/trade/assess/_components/EntryChoice.tsx`           | 2-path entry screen                                                   |
| `src/app/(trade)/trade/assess/_components/CategoryPicker.tsx`        | grouped searchable class picker                                       |
| `src/app/(trade)/trade/assess/_components/ScopedItemForm.tsx`        | the scoped form                                                       |
| `src/app/(trade)/trade/assess/_components/ClassificationPreview.tsx` | live convergence + RationaleCard                                      |
| `src/app/(trade)/trade/assess/_components/AssessFlow.tsx`            | reworked orchestrator                                                 |
| `src/lib/trade/datasheet-extractor.ts`                               | taxonomy fix: emit canonical classes; scoped 2nd-pass vocabulary      |
| `src/lib/trade/classification/claude-vision-extractor.server.ts`     | scoped 2nd-pass `PROMPT_VOCABULARY` = detected class's decisive attrs |

### Component upgrades (the live co-pilot + scoped vision)

- **Scoped second vision pass.** Today `PROMPT_VOCABULARY` ends at `antennaAdaptiveBeamforming` — the single decisive field for several space classes (`starTrackerAccuracyArcsec`, `starTrackerSlewRateDegPerS`, `totalImpulseNs`, `neutronFluenceNPerCm2`, `selLetThresholdMevCm2Mg`, `gnssMaxVelocityMPerS`) is **regex-only** today. After the cheap first pass detects the candidate category, run a guarded vision pass whose vocabulary is exactly that category's derived decisive attributes (~3-6 fields). Every value still passes `guardValue` (out-of-range → dropped → matcher UNKNOWN) and the operator confirms. This is what makes the AstroSense example pre-fill accuracy (so the ITAR conjunction evaluates) instead of leaving it blank. Extraction only — no AI in the verdict.
- **ClassificationPreview (live).** Debounce-call `suggestionsFromAttributesAndText` on keystroke (pure/synchronous over the static corpus, client-side) → animate a code chip grey → amber (possible, _naming the missing attribute_) → blue (near-miss, _naming the refuting predicate_) → solid (candidate). Never feeds the verdict (`ClassifyConfirm` unchanged).
- **RationaleCard.** Wire `explainClassification` (pure, dependency-free, conservative-by-design) into a deterministic "officer rationale" joined to the datasheet `EvidenceSpan` quotes that drove the result. Null/possible/near-miss render the existing UNVERIFIED copy.
- **Certainty ladder.** Derived from matcher state; **pinned below "genug für eine Einschätzung" while any decisive predicate is unresolved** — so it can only _under_-claim certainty (safe direction), neutralizing the "fill cheap fields, feel done" fail-OPEN complacency a naive progress bar would create. Display-only; never gates start; never feeds the verdict.

## Pre-fill + confidence model

- **High confidence** (regex, or regex+Vision agreement, or guarded Vision `high`): pre-filled + green "aus Datenblatt ✓" badge **with the `EvidenceSpan` quote shown inline** ("aus: ‚Cross-boresight accuracy 10 arcsec (3σ)'") for instant verification. Editable.
- **Low confidence / regex↔Vision disagreement** (`alternateValue`): field shown **empty** with a one-tap resolver ("Vision: X · Regex: Y — welcher?"). Never silently pre-filled; an unresolved conflict reads as "offen" → cannot-rule-out.
- **Not extracted:** empty field + dictionary placeholder + "offen" chip; floated to the top if decisive (§1.5).

Reuses `MergedExtraction.{value,source,confidence,reasoning,alternateValue}` + `EvidenceSpan.quote` verbatim — the model already exists.

## Fail-closed gating (hard invariant)

- **Required to start:** `productCategory` (→ `canonicalItemClass`) and `Artikelname`. Nothing else.
- **Relevant attributes are optional;** the operator can start with blanks.
- **Blank ⇒ cannot-rule-out, surfaced never dropped (load-bearing).** The danger is **fail-OPEN**: a blank _decisive_ field must never make the item read as uncontrolled / all-GO. The matcher already surfaces a code with an unknown predicate as a possible-match/near-miss (the MTCR case proves it). Hard requirement, pinned by test: **a controllable class whose decisive attributes are blank STILL surfaces its primary code(s) as "cannot rule out"; it never collapses to an all-GO landscape.** The verdict is code-driven, so a blank field can never _manufacture_ a GO. The "N Felder offen" worklist + the pinned certainty ladder communicate reduced certainty (not a claim that destinations auto-flip to REVIEW).
- **Standing review prompts** (the three places a junior misses, surfacing behavior that already exists):
  1. `isSpeciallyDesigned` as a **tri-state** (ja / nein / **unbekannt**) for any category whose corpus entries gate on `isSpeciallyDesigned eq true`; "unbekannt" deliberately surfaces the catch-all entry as a possible-match.
  2. A non-blocking banner that the parametric corpus does **not** evaluate end-use / end-user (MTCR catch-all, EAR §744) — a clean parametric result is not an end-use clearance.
  3. When the engine returns no candidate, render the existing UNVERIFIED copy "eine fehlende Einstufung ist **keine** Freigabe" prominently — never an empty/positive-looking state.
- **Scoping narrows only the parametric candidate set, not the safety net.** The corpus-keyword text path still runs globally over the full description; a mis-chosen category degrades to "a parametric hit might be missed, but text signal + human-confirm + fail-closed verdict still catch it" → worst case REVIEW.
- **No false-CLEARED anywhere.** The verdict still comes solely from the operator-confirmed code via the existing `from-datasheet` → `landscape`/verdict path.

## Data flow (detailed)

1. **Entry.** EntryChoice → upload or manual.
2. **Upload:** POST `/api/trade/classify/extract-vision` (1st pass, unchanged) → `MergedExtraction` → `rankCategories(extraction)` (scored, never decides) → pre-seed `ScopedItemForm` for the top category + runner-up chips → **scoped 2nd vision pass** on that category's decisive attributes → merge.
   **Manual:** `CategoryPicker` (grouped: ADCS / Antrieb / Payload / Power / RF / Elektronik) → empty `ScopedItemForm` for the chosen category.
3. **Form.** Operator confirms/changes category (carrying the `relevantAttributes` intersection across a change), fills/edits fields; `ClassificationPreview` + `RationaleCard` + certainty ladder update live.
4. **Start.** Classify with the richer bag via the existing `suggestionsFromAttributesAndText`.
5. **Confirm.** `ClassifyConfirm` (unchanged) — human confirms the code. Persist via `/api/trade/assess/from-datasheet` (the `item` now carries the full operator-supplied attribute bag — replace the 6-key whitelist in `itemFromPayload` with "all dictionary attributes for the confirmed category that are present").
6. **Landscape → verdict.** Unchanged (keys off the confirmed EU/ECCN code).

## Error handling

- Extraction failure / scanned-PDF parse error → land in the manual `CategoryPicker` with an honest banner. Never a guessed category.
- `rankCategories` returns nothing confident → generic fallback category: a small core field set (`itemClass` free-text + description + {mass, frequencyGhz, radHardTidKrad, isRadHardened}) + the disclaimer. Honest, fail-closed.
- Inline validation uses `ATTRIBUTE_SANITY_RANGES`; out-of-bound → flagged ("außerhalb des plausiblen Bereichs / möglicher Einheitenfehler"), not auto-dropped (operator edits).

## Testing strategy

- **§0 invariant (FIRST):** every `canonicalItemClass` is a prefix of ≥1 real corpus entry; every extractor-emittable `itemClass` ∈ `CANONICAL_ITEM_CLASSES`. (Catches the `7A004`/`gnss` class of error as a red build.)
- **Derived field set:** `deriveRelevantAttributes(spacecraft.adcs.star_tracker)` ⊇ {`starTrackerAccuracyArcsec`, `starTrackerSlewRateDegPerS`}; curation overlay is monotone-non-shrinking (derived ⊆ rendered ∪ hidden).
- **Decisiveness:** `starTrackerAccuracyArcsec` outranks a non-threshold attribute for `star_tracker` (it gates an ITAR entry).
- **detect/rank:** star-tracker text → `star_tracker` top; ambiguous → low/empty → generic fallback (never a wrong confident pick).
- **Golden regression:** star-tracker datasheet → `USML:XV(e)(16)` (or `9A515.x`) is a _candidate_, not the 0-predicate rocket possible; AstroSense (10 arcsec) → fails the ≤1 arcsec conjunction → `9A515.x` (EAR), honest "not ITAR XV(e)(16)"; genuine MTCR item (payload ≥ 500, range ≥ 300) → Item-1.A.1 still flagged (no false-negative).
- **Fail-closed (load-bearing):** `star_tracker` with `starTrackerAccuracyArcsec` blank → its primary code STILL surfaces as candidate/possible ("cannot rule out"); the landscape is NOT all-GO. The item must never read as uncontrolled merely because a field is empty.
- **Component (jsdom):** `ScopedItemForm` renders decisiveness-ordered scoped fields per category, pre-fills high-confidence with EvidenceSpan badge, shows low-confidence as accept-prompt, surfaces conjunction state, blocks start without category, allows start with blank attributes + shows the worklist + pinned certainty ladder; standing review prompts present. **lucide-react mocked with explicit named exports (NOT a Proxy — vitest-4 collection hang); next/link stubbed.**
- **Live preview safety:** `ClassificationPreview` with a decisive field blank shows "kann nicht ausgeschlossen werden" (fails toward review), never a confident/green state.
- Oracle: `npx vitest run <paths> --no-file-parallelism`; `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (baseline 666, zero new in touched files).

## Scope / phasing (v1)

- **v1:** §0 invariant; corpus-derived field set + decisiveness ordering; the 12 categories + generic fallback; two-path entry; scoped form with evidence-linked pre-fill + confidence; scoped 2nd vision pass; live ClassificationPreview + RationaleCard + pinned certainty ladder; standing review prompts; taxonomy fix; back half unchanged.
- **Fast-follow (not v1):** σ/unit normalization (display-only qualifier later — **never auto-divide a 3σ value down toward a threshold**, the one fail-OPEN direction); reuse already-classified parts (org `TradeItem` history, no migration); inline live Liefer-Landkarte mini-preview (only after the form proves out; its "no determinate candidate ⇒ no map" guard is unforgiving); multi-component (BOM) datasheet splitter (detect+list+mark-uncleared, no auto-aggregate); full field-metadata generation from predicate value-types; per-category prefix-set.

## Worked example — AstroSense ST-300

Manual or upload → category `star_tracker` (`spacecraft.adcs.star_tracker`). Scoped fields, decisiveness-ordered: accuracy (cross/around-boresight) + slew-rate **grouped as "BEIDE nötig"** (the XV(e)(16) conjunction), then TID rad-hardness, mass, update rate. The scoped 2nd vision pass pre-fills accuracy=10 arcsec, slew=3 °/s, TID=30 krad, mass=0.45 kg (✓ with datasheet quotes). Live preview: `itemClass` now matches the parametric gate, but `starTrackerAccuracyArcsec=10 > 1.0` → the XV(e)(16) conjunction fails → the chip lands on **`9A515.x` (EAR-CCL)** with the RationaleCard reason "Genauigkeit 10 arcsec über der 1-arcsec-ITAR-Schwelle → fällt auf 9A515.x". Emphatically not MTCR Item-1.A.1, and honestly _not_ ITAR XV(e)(16). Operator confirms → landscape (keyed on EU `7A004`) → 13 GO / 2 REVIEW / 6 BLOCKED.

## Open questions for review

1. Generic-fallback field set — `itemClass`(frei) + description + {mass, frequencyGhz, radHardTidKrad, isRadHardened} a sensible common core? (founder default: yes)
2. CategoryPicker grouping — ADCS / Antrieb / Payload / Power / RF / Elektronik. (founder default: yes)
3. 12-class cut as listed. (founder default: yes)
