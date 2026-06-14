# Passage Scoped-Intake (Datenblatt _oder_ manuell → relevante Felder → Vorgang) — Design

**Status:** Draft for review · **Date:** 2026-06-14 · **Branch:** `feat/trade-origin-determination`
**Author:** Claude (brainstormed with founder) · **Supersedes UX of:** `2026-06-13-passage-datasheet-intake-design.md` (upload-only flow)

---

## Goal

Replace the upload-only `/trade/assess` flow with a two-entry-path intake (**Datenblatt hochladen** _or_ **manuell eingeben**) that converges on a **product-class-scoped attribute form**: only the fields that actually drive the classification for _this_ product class appear, pre-filled where extraction is confident, the rest completed by the operator — then "Vorgang starten". The classification then works from **real operator-confirmed inputs instead of guesses from missing data**, while staying strictly fail-closed (worst case = REVIEW, never a false GO).

## Why (problem statement)

Two defects in today's flow, both observed live (star tracker classified as "Complete rocket systems / MTCR Item-1.A.1"):

1. **Guess-from-missing-data.** The flow lifts only 6 attributes from extraction and gives the operator _no way to supply the rest_. When `payloadKg`/`rangeKm` are blank, the matcher cannot rule out MTCR Item-1.A.1 (predicates `payloadKg≥500 ∧ rangeKm≥300`), so a zero-signal possible surfaces.
2. **Taxonomy mismatch.** The datasheet extractor assigns `itemClass = avionics.attitude.star_tracker`, but the corpus gates `7A004` on `itemClass = spacecraft.adcs.star_tracker` (verified: `control-list-cross-walk.ts:865-872`). They never match, so the genuine parametric candidate never fires and the item falls through to keyword/possible matching.

The founder's insight: let the operator **supply the relevant fields up front** (filling, where we can, from the datasheet). The classification then evaluates the regulation's _actual_ predicates against _real_ values. Each relevant field is a predicate the control list turns on — e.g. `7A004` ⇔ `starTrackerAccuracyArcsec ≤ 1.0 (1σ)` — so capturing it converts a guess into a determinate GO/REVIEW with a stated reason.

## Non-goals (YAGNI)

- No new DB migration. The matcher already reads operator-supplied attributes from the `parametricAttributes` JSON bag; we widen what flows in, not the schema.
- No new AI in the classification or verdict path. Claude stays confined to extraction (guarded, opt-in) exactly as today.
- No rework of the back half (`landscape` → `verdict`). Those screens are unchanged.
- v1 does **not** catalog all ~40 corpus item-classes — it ships the ~12 most space-relevant classes + an honest generic fallback (see Scope).

---

## Architecture

Two small new data modules are the single source of truth; everything else wires existing pieces.

### 1. Product-category catalog — `src/lib/trade/intake/product-categories.ts`

```ts
export interface ProductCategory {
  /** Stable id used in the UI + persisted on the item. */
  id: string; // e.g. "star_tracker"
  /** Operator-facing label (German). */
  label: string; // e.g. "Sternsensor (Star Tracker)"
  /** Short helper shown under the label. */
  blurb: string;
  /** The canonical itemClass string the CORPUS gates on. This is the fix:
   *  it MUST equal the string used in CONTROL_LIST_CROSS_WALK predicates. */
  canonicalItemClass: string; // e.g. "spacecraft.adcs.star_tracker"
  /** Ordered AttributeNames relevant to this class (drive the form). */
  relevantAttributes: AttributeName[];
  /** Free-text synonyms to aid manual-path search + extractor mapping. */
  synonyms: string[];
}
```

v1 classes (canonicalItemClass verified against the corpus `value:"…"` gates):

| id                  | label                             | canonicalItemClass               | primary code(s) |
| ------------------- | --------------------------------- | -------------------------------- | --------------- |
| `star_tracker`      | Sternsensor                       | `spacecraft.adcs.star_tracker`   | 7A004           |
| `reaction_wheel`    | Reaktionsrad                      | `spacecraft.adcs.reaction_wheel` | 9A004 family    |
| `cmg`               | Drallrad / CMG                    | `spacecraft.adcs.cmg`            | 9A004 family    |
| `thruster_electric` | Elektrisches Triebwerk (Hall/Ion) | `propulsion.electric`            | 9A004/MTCR-19   |
| `thruster_chemical` | Chemisches Triebwerk              | `propulsion.chemical`            | MTCR / 9A004    |
| `eo_imager`         | EO-Imager / Optik-Payload         | `sensor.imager`                  | 6A002 / 9A004   |
| `sar_payload`       | SAR-Payload                       | `spacecraft.remote_sensing.sar`  | 6A008 / 9A004   |
| `radhard_ic`        | Rad-harter IC / Prozessor         | `ic.radhard`                     | 3A001 family    |
| `gnss_receiver`     | GNSS-Empfänger                    | `spacecraft.gnss`                | 7A005 / 7A105   |
| `rf_antenna`        | RF-Antenne / Transponder          | `rf.antenna`                     | 3A001 / 5A001   |
| `solar_array`       | Solar-Array                       | `spacecraft.power.solar`         | 9A004 family    |
| `battery`           | Satelliten-Batterie               | `spacecraft.power.battery`       | 9A004 family    |

> **Implementer note:** the corpus itemClass strings are mildly inconsistent (`sensor.imager` vs `sensor.optical.*` vs `spacecraft.remote_sensing.eo`; `propulsion.chemical` vs `propulsion.liquid_rocket`). Each category's `canonicalItemClass` must be set to the string the _actual_ corpus entries for that class gate on — grep `control-list-cross-walk.ts` per class and use the real value. Where one user-facing category spans two corpus prefixes, pick the broadest prefix that the relevant entries share, or split into two categories. This catalog is the place that taxonomy is rationalised.

`relevantAttributes` derivation rule (so it's principled, not arbitrary): for a category's `canonicalItemClass`, the relevant attributes are **the union of every `AttributeName` referenced in a `ParametricPredicate` of any `ControlListEntry` whose `itemClass`-prefix predicate the canonical class satisfies** — minus `itemClass` itself, ordered by frequency. The implementer computes this union from the corpus, then curates (drops noise, fixes order) for UX. A unit test asserts each category's `relevantAttributes` is a superset of the attributes its primary code(s) predicate on (so we never omit a field the regulation turns on).

### 2. Attribute dictionary — `src/lib/trade/intake/attribute-fields.ts`

```ts
export interface AttributeField {
  attribute: AttributeName;
  label: string; // "Genauigkeit (cross-boresight)"
  unit?: string; // "arcsec", "kg", "krad", "Hz", "°/s"
  kind: "number" | "boolean" | "enum" | "string";
  enumValues?: string[]; // for kind:"enum" (e.g. propellantType)
  help?: string; // one-line operator hint
  /** Reuse the existing guardValue plausibility bound for inline validation. */
}
```

One entry per `AttributeName` the v1 catalog references. The plausibility bound is **the same bound `guardValue` (claude-vision-extractor.server.ts) already enforces** — imported, not redefined — so the form's inline validation and the extraction guard agree.

### 3. Flow / components

```
Entry screen (2 cards)
   ├── "Datenblatt hochladen"  → DatasheetDropzone → extract → detectCategory → prefill ─┐
   └── "Manuell eingeben"      → CategoryPicker (pick class) ───────────────────────────┤
                                                                                         ▼
                                                              ScopedItemForm (the convergence point)
                                                                – category row (confirm/change)
                                                                – Artikelname
                                                                – scoped relevant fields (prefilled / empty)
                                                                – "N Felder offen → konservativ" note
                                                                – "Vorgang starten"
                                                                         │ classify (richer bag)
                                                                         ▼
                                                              ClassifyConfirm (human confirms code) — UNCHANGED
                                                                         ▼
                                                              Liefer-Landkarte → Urteil — UNCHANGED
```

New/changed files:

| File                                                          | Responsibility                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/trade/intake/product-categories.ts`                  | the catalog (data)                                                    |
| `src/lib/trade/intake/attribute-fields.ts`                    | the attribute dictionary (data)                                       |
| `src/lib/trade/intake/detect-category.ts`                     | pure: extracted `itemClass` / text → best `ProductCategory` (or null) |
| `src/app/(trade)/trade/assess/_components/EntryChoice.tsx`    | the 2-path entry screen                                               |
| `src/app/(trade)/trade/assess/_components/CategoryPicker.tsx` | manual-path class picker (searchable)                                 |
| `src/app/(trade)/trade/assess/_components/ScopedItemForm.tsx` | the scoped attribute form                                             |
| `src/app/(trade)/trade/assess/_components/AssessFlow.tsx`     | reworked orchestrator (upload→entry; + form step)                     |
| `src/lib/trade/datasheet-extractor.ts`                        | taxonomy fix: heuristics emit canonical classes                       |

## Pre-fill + confidence model

The `ScopedItemForm` seeds each relevant field from the merged extraction:

- **High confidence** (regex value, or regex+Vision agreement, or guarded Vision marked `high`): field pre-filled with the value + a green "aus Datenblatt ✓" badge. Editable.
- **Low confidence / disagreement** (Vision `low`/`medium` only, or a regex↔Vision disagreement carried in `alternateValue`): field shown **empty** with the candidate offered inline as "Vorschlag: X (Vision) — übernehmen?" (operator must accept). Never silently pre-filled.
- **Not extracted:** empty field with the dictionary placeholder + an "offen" chip.

This reuses `MergedExtraction` (source + confidence + alternateValue per attribute) verbatim — the model already exists; the form just renders it per the rules above.

## Fail-closed gating (hard invariant)

- **Required to start:** `productCategory` (→ `canonicalItemClass`) and `Artikelname`. Nothing else.
- **Relevant attributes are optional.** The operator can "Vorgang starten" with blanks.
- **Blank ⇒ cannot-rule-out, surfaced never dropped (the load-bearing invariant).** A blank relevant attribute flows to the engine as _absent_ (not zero). The danger to guard against is **fail-OPEN, not fail-closed**: if a blank decisive field (e.g. star-tracker accuracy) made the engine _silently miss_ the controlling code, the item would look uncontrolled → an all-GO landscape → a false green light. The matcher's existing behavior prevents this — a code with an unknown predicate surfaces as a _possible-match / near-miss_ (the MTCR case proves unknown predicates surface rather than vanish). The hard requirement: **a controllable class whose decisive attributes are blank MUST still surface its primary code(s) as "cannot rule out"; it must never collapse to an apparently-uncontrolled all-GO landscape.** The operator then confirms (or chooses manual); the verdict is code-driven, so a blank field can never _manufacture_ a GO. The UI surfaces "N Felder offen → Klassifizierung unsicherer" (a certainty caveat, not a claim that destinations auto-flip to REVIEW). Pinned by the fail-closed test below.
- **Scoping narrows only the parametric candidate set, not the safety net.** The corpus-keyword text path still runs globally over the full description, so a mis-chosen category degrades to "a parametric hit might be missed, but the text signal + human-confirm + fail-closed verdict still catch it" — worst case REVIEW. This caveat is stated in-product near the category row ("falsche Klasse? ändern").
- **No false-CLEARED anywhere.** The verdict still comes solely from the operator-confirmed code via the existing `from-datasheet` → `landscape`/verdict path. The form changes _inputs and UX_, never the verdict logic.

## Taxonomy alignment fix

In `datasheet-extractor.ts` `classifyItemClass`, remap the heuristic outputs to the catalog's `canonicalItemClass` strings (the strings the corpus gates on):

- `avionics.attitude.star_tracker` → `spacecraft.adcs.star_tracker`
- `avionics.attitude.reaction_wheel` → `spacecraft.adcs.reaction_wheel`
- (audit the remaining heuristics: `propulsion.electric.hall|ion` already prefix-match `propulsion.electric` ✓; `spacecraft.remote_sensing.*` and `ic.radhard.processor` prefix-match their corpus gates ✓ — fix only the ones that don't.)

A regression test asserts: a star-tracker datasheet → extracted `itemClass` prefix-matches `7A004`'s gate, so `7A004` surfaces as a genuine **candidate** (not a keyword/possible). A second asserts the AstroSense case (accuracy 10 arcsec) yields `7A004` as a **near-miss with the ≤1 arcsec reason**, not a hard control and not a rocket.

## Data flow (detailed)

1. **Entry.** EntryChoice → upload or manual.
2. **Upload:** POST `/api/trade/classify/extract-vision` (unchanged) → `MergedExtraction` → `detectCategory(extraction)` → pre-seed `ScopedItemForm`.
   **Manual:** `CategoryPicker` → empty `ScopedItemForm` for the chosen category.
3. **Form.** Operator confirms/changes category, fills/edits fields. Client builds the attribute bag from the (scoped) field values.
4. **Start.** Classify with the richer bag via the existing `suggestionsFromAttributesAndText` path → suggestions.
5. **Confirm.** `ClassifyConfirm` (unchanged) — human confirms the code. Persist via `/api/trade/assess/from-datasheet` (the `item` now carries the full operator-supplied attribute bag, not just 6 keys).
6. **Landscape → verdict.** Unchanged.

> The `from-datasheet` route + the carried `item` shape are widened to accept the full attribute bag (today `itemFromPayload` whitelists 6 keys — replace with "all dictionary attributes for the confirmed category, that are present"). No route signature change beyond a wider `item` body.

## Error handling

- Extraction failure / scanned-PDF parse error → land directly in the manual `CategoryPicker` with an honest banner ("Datenblatt nicht lesbar — bitte Klasse wählen und Werte eintragen"). Never a guessed category.
- `detectCategory` returns null (unknown class) → generic fallback category: a small core field set (`itemClass` free-text + description + a few common attributes) + the disclaimer. Honest, fail-closed.
- Inline field validation uses the `guardValue` bound; an out-of-bound entry is flagged ("außerhalb des plausiblen Bereichs") but not auto-dropped (operator edits).

## Testing strategy

- **Unit (pure):** catalog integrity (every `canonicalItemClass` is non-empty and is actually gated on by ≥1 corpus entry; every `relevantAttributes` ⊇ its primary code's predicate attributes); dictionary completeness (every referenced `AttributeName` has a field def + a guard bound); `detectCategory` mapping (star tracker text → `star_tracker`; ambiguous → null).
- **Golden regression:** star-tracker datasheet → `7A004` is a candidate (taxonomy fix); AstroSense (10 arcsec) → near-miss-with-reason, not rocket; genuine MTCR item (payload≥500, range≥300) → Item-1.A.1 still flagged (no false-negative).
- **Component (jsdom):** `ScopedItemForm` renders scoped fields per category, pre-fills high-confidence with badge, shows low-confidence as accept-prompt, blocks start without category, allows start with blank attributes + shows the "N offen" note. **lucide-react mocked with explicit named exports (NOT a Proxy — vitest-4 collection hang); next/link stubbed.**
- **Fail-closed assertion (the load-bearing one):** a controllable class (e.g. `star_tracker`) with its _decisive_ relevant attribute (accuracy) left blank → its primary code (`7A004`) STILL surfaces as a candidate/possible ("cannot rule out"), and the resulting landscape is NOT all-GO. The item must never read as uncontrolled merely because a field is empty. (This pins the fail-OPEN risk from the gating section.)
- Oracle: `npx vitest run <paths> --no-file-parallelism`; `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (baseline 666, zero new in touched files).

## Scope / phasing (v1)

- **v1:** the 12 categories above + generic fallback; two-path entry; scoped form with pre-fill/confidence; fail-closed gating; taxonomy fix; the back half unchanged.
- **Fast-follow (not v1):** more categories; org-derived exporter seat (already a known fast-follow); "optionale Zusatzfelder" escape hatch per category; remembering a category's last-used values.

## Worked example — AstroSense ST-300

Manual or upload → category `star_tracker` (`spacecraft.adcs.star_tracker`). Scoped fields: accuracy (cross/around-boresight), slew-rate tolerance, TID rad-hardness, mass, update rate. Upload pre-fills accuracy=10 arcsec, slew=3 °/s, TID=30 krad, mass=0.45 kg from the datasheet (✓ badges); update-rate left open. Classify: `itemClass` now matches `7A004`'s gate, but `starTrackerAccuracyArcsec=10 > 1.0` → `7A004` is a **near-miss** ("Genauigkeit 10 arcsec über der 1-arcsec-Schwelle"), not a hard control and emphatically not MTCR Item-1.A.1. Operator confirms the honest result → landscape/verdict.

## Open questions for review

1. Generic-fallback field set — is `itemClass`(frei) + description + {mass, frequencyGhz, radHardTidKrad, isRadHardened} a sensible "common core", or a different set?
2. Manual-path category picker — flat searchable list of 12, or grouped (ADCS / Propulsion / Payload / Power / RF / Electronics)?
3. Keep the 12-class table as the v1 cut, or trim/extend any specific class?
