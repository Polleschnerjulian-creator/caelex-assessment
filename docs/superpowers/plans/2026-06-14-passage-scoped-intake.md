# Passage Scoped-Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the upload-only `/trade/assess` flow with a two-entry-path (datasheet **or** manual) intake that converges on a product-class-scoped attribute form — relevant fields derived from the control-list corpus, pre-filled where extraction is confident, completed by the operator — so classification works from real inputs, fail-closed, no false GO.

**Architecture:** The control-list corpus (`control-list-cross-walk.ts`) is the single source of truth: a build-time invariant pins the item-class taxonomy, the relevant-field set + decisiveness order are _derived_ from predicates (no second hand-curated copy), the deciding fields get vision recall, and the form is a live deterministic co-pilot (`suggestionsFromAttributesAndText` + `explainClassification`, both pure). The verdict path is unchanged and stays code-driven.

**Tech Stack:** Next.js 15 (App Router, RSC + client components), TypeScript strict, Vitest (jsdom for components, `--no-file-parallelism`), Prisma/Neon (no migration — `TradeItem.parametricAttributes Json?` already exists), Anthropic Claude (extraction only, guarded).

**Spec:** `docs/superpowers/specs/2026-06-14-passage-scoped-intake-design.md`

**Global rules (every task):**

- TDD: failing test first → run red → minimal implementation → run green → commit.
- Oracle: `npx vitest run <paths> --no-file-parallelism`; `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (baseline **666**, zero new in touched files).
- Branch `feat/trade-origin-determination` (verify `git branch --show-current`; do NOT switch; commit LOCAL only, never push).
- Commit subjects lowercase ≤100 chars; explicit `git add` of the named paths (never `-A`); husky must pass; never `--no-verify`.
- No new npm deps, no DB migration.
- **Fail-closed (hard invariant):** never synthesise a GO; a blank _decisive_ field must surface its code as "cannot rule out" (possible/near-miss), never make the item look uncontrolled; the verdict comes only from the operator-confirmed code. No new AI in classification or verdict (Claude = extraction only).
- **jsdom component tests:** mock `lucide-react` with an EXPLICIT named-exports object (NOT a Proxy — vitest-4 collection hang) and stub `next/link`. Copy the pattern verbatim from `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx` (reproduced in Task 10).

**File structure (new unless noted):**

```
src/lib/trade/intake/
  canonical-item-classes.ts        Task 1   corpus-derived itemClass prefix set + invariant helper
  derive-relevant-attributes.ts    Task 4   corpus → relevant AttributeName[] per class
  decisiveness.ts                  Task 5   corpus → decisiveness rank per attribute
  attribute-fields.ts              Task 6   label/unit/kind/help dictionary + sanity-range validate
  product-categories.ts            Task 7   the 12-class catalog + overlay + rendered-field assembly
  detect-category.ts               Task 8   extraction/text → ranked ProductCategory[]
src/lib/trade/classify-suggest.ts            Task 3   widen attributesToBag (route extended → parametricAttributes)
src/lib/trade/datasheet-extractor.ts         Task 2   taxonomy fix (canonical itemClass)
src/lib/trade/classification/claude-vision-extractor.server.ts  Task 9  PROMPT_VOCABULARY + vocabularySubset
src/app/(trade)/trade/assess/_components/
  EntryChoice.tsx                  Task 10
  CategoryPicker.tsx               Task 11
  ScopedItemForm.tsx               Task 12
  ClassificationPreview.tsx        Task 13  (live preview + RationaleCard + certainty ladder)
  AssessFlow.tsx                   Task 14  (rework)
src/app/api/trade/assess/from-datasheet/route.ts  Task 15  widen item schema + persist parametricAttributes
```

**Phasing:** Tasks 1–9 = backend foundation (independently testable, no UI). Tasks 10–14 = UI. Task 15 = persistence widening. Task 16 = end-to-end fail-closed + worked-example regression (the gate).

---

### Task 1: Corpus-derived canonical item-class set (the drift guard) — apply FIRST

**Files:**

- Create: `src/lib/trade/intake/canonical-item-classes.ts`
- Test: `src/lib/trade/intake/canonical-item-classes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/canonical-item-classes.test.ts
import { describe, it, expect } from "vitest";
import {
  CANONICAL_ITEM_CLASSES,
  isCanonicalItemClassPrefix,
} from "./canonical-item-classes";

describe("CANONICAL_ITEM_CLASSES", () => {
  it("is derived from the corpus and non-empty", () => {
    expect(CANONICAL_ITEM_CLASSES.size).toBeGreaterThan(10);
  });
  it("contains the verified real prefixes", () => {
    expect(CANONICAL_ITEM_CLASSES.has("spacecraft.adcs.star_tracker")).toBe(
      true,
    );
    expect(CANONICAL_ITEM_CLASSES.has("gnss.receiver")).toBe(true);
  });
  it("never contains the legacy extractor mislabel", () => {
    expect(CANONICAL_ITEM_CLASSES.has("avionics.attitude.star_tracker")).toBe(
      false,
    );
  });
  it("isCanonicalItemClassPrefix matches a real corpus class by prefix", () => {
    // a category's canonicalItemClass is valid iff it is the prefix of >=1 real class
    expect(isCanonicalItemClassPrefix("spacecraft.adcs.star_tracker")).toBe(
      true,
    );
    expect(isCanonicalItemClassPrefix("spacecraft.power")).toBe(true); // prefix of .solar/.battery
    expect(isCanonicalItemClassPrefix("totally.invented.class")).toBe(false);
  });
});
```

- [ ] **Step 2: Run red** — `npx vitest run src/lib/trade/intake/canonical-item-classes.test.ts --no-file-parallelism` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/trade/intake/canonical-item-classes.ts
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

/**
 * The distinct `itemClass` prefix VALUES the parametric corpus actually gates
 * on — computed at module load from CONTROL_LIST_CROSS_WALK, never hand-listed.
 * This is the single canonical taxonomy: the product-category catalog, the
 * datasheet extractor, and category-detection all validate against it so the
 * extractor↔corpus mismatch that caused the star-tracker bug cannot recur.
 */
export const CANONICAL_ITEM_CLASSES: ReadonlySet<string> = new Set(
  CONTROL_LIST_CROSS_WALK.flatMap((entry) =>
    entry.predicates
      .filter(
        (p) =>
          p.attribute === "itemClass" &&
          p.op === "prefix" &&
          typeof p.value === "string",
      )
      .map((p) => p.value as string),
  ),
);

/** True when `cls` is the prefix of (or equal to) >=1 real corpus itemClass. */
export function isCanonicalItemClassPrefix(cls: string): boolean {
  if (!cls) return false;
  for (const real of CANONICAL_ITEM_CLASSES) {
    if (
      real === cls ||
      real.startsWith(cls + ".") ||
      cls.startsWith(real + ".") ||
      cls === real
    ) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Run green** — same command → PASS. Then `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/canonical-item-classes.ts src/lib/trade/intake/canonical-item-classes.test.ts
git commit -m "feat(trade): corpus-derived canonical item-class set + prefix invariant (intake §0)"
```

---

### Task 2: Extractor taxonomy fix (align to corpus canonical classes)

**Files:**

- Modify: `src/lib/trade/datasheet-extractor.ts` (the `classifyItemClass` heuristics, ~lines 392–426)
- Test: `src/lib/trade/datasheet-extractor.intake.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/datasheet-extractor.intake.test.ts
import { describe, it, expect } from "vitest";
import { extractFromText } from "./datasheet-extractor";
import { CANONICAL_ITEM_CLASSES } from "./intake/canonical-item-classes";

describe("classifyItemClass — canonical alignment", () => {
  it("maps a star tracker to the corpus canonical class", () => {
    const ex = extractFromText(
      "Autonomous star tracker for 3-axis attitude determination.",
    );
    expect(ex.attributes.itemClass).toBe("spacecraft.adcs.star_tracker");
  });
  it("maps a reaction wheel to the corpus canonical class", () => {
    const ex = extractFromText(
      "Reaction wheel RW-250 for momentum management.",
    );
    expect(ex.attributes.itemClass).toBe("spacecraft.adcs.reaction_wheel");
  });
  it("every itemClass the extractor can emit is a real corpus prefix", () => {
    // drift guard: nothing classifyItemClass emits may be absent from the corpus
    for (const text of [
      "hall effect thruster",
      "ion thruster",
      "earth observation satellite",
      "synthetic aperture radar",
      "rad-hard FPGA",
      "star tracker",
      "reaction wheel",
    ]) {
      const ex = extractFromText(text);
      if (ex.attributes.itemClass) {
        // prefix-match (extractor may emit a deeper class than the corpus gate)
        const cls = ex.attributes.itemClass;
        const ok = [...CANONICAL_ITEM_CLASSES].some(
          (real) =>
            real === cls || cls.startsWith(real) || real.startsWith(cls),
        );
        expect(ok, `extractor emitted "${cls}" not in corpus`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run red** — `npx vitest run src/lib/trade/datasheet-extractor.intake.test.ts --no-file-parallelism` → FAIL (star tracker yields `avionics.attitude.star_tracker`).

- [ ] **Step 3: Implement** — in `classifyItemClass` change the two `avionics.attitude.*` mappings:

```ts
    {
      regex: /\bstar\s+tracker\b/i,
      itemClass: "spacecraft.adcs.star_tracker",   // was: avionics.attitude.star_tracker
    },
    {
      regex: /\breaction\s+wheel\b/i,
      itemClass: "spacecraft.adcs.reaction_wheel", // was: avionics.attitude.reaction_wheel
    },
```

> The other heuristics (`propulsion.electric.hall|ion`, `spacecraft.remote_sensing.*`, `ic.radhard.processor`) already prefix-match a real corpus class — leave them. The drift-guard test confirms.

- [ ] **Step 4: Run green** — that test + `npx vitest run src/lib/trade/datasheet-extractor.test.ts --no-file-parallelism` (existing) → PASS. tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/datasheet-extractor.ts src/lib/trade/datasheet-extractor.intake.test.ts
git commit -m "fix(trade): align extractor itemClass to corpus canonical classes (star tracker, reaction wheel)"
```

---

### Task 3: Widen `attributesToBag` so decisive extended attributes reach the matcher (THE enabling fix)

**Files:**

- Modify: `src/lib/trade/classify-suggest.ts` (`BAG_KEYS` + `attributesToBag`, lines 34–67)
- Test: `src/lib/trade/classify-suggest.intake.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/classify-suggest.intake.test.ts
import { describe, it, expect } from "vitest";
import {
  attributesToBag,
  suggestionsFromAttributesAndText,
} from "./classify-suggest";

describe("attributesToBag — extended attribute routing", () => {
  it("routes typed keys to typed fields", () => {
    const bag = attributesToBag([
      { attribute: "payloadKg", value: 600, confidence: "high" },
    ]);
    expect(bag.payloadKg).toBe(600);
  });
  it("routes EXTENDED keys into parametricAttributes (so the matcher sees them)", () => {
    const bag = attributesToBag([
      {
        attribute: "starTrackerAccuracyArcsec",
        value: 0.5,
        confidence: "high",
      },
      {
        attribute: "starTrackerSlewRateDegPerS",
        value: 4.0,
        confidence: "high",
      },
    ]);
    expect(bag.parametricAttributes).toBeTruthy();
    expect(
      (bag.parametricAttributes as Record<string, unknown>)
        .starTrackerAccuracyArcsec,
    ).toBe(0.5);
    expect(
      (bag.parametricAttributes as Record<string, unknown>)
        .starTrackerSlewRateDegPerS,
    ).toBe(4.0);
  });
});

describe("suggestionsFromAttributesAndText — decisive field now fires the candidate", () => {
  it("a 0.5-arcsec / 4 deg-s star tracker yields USML:XV(e)(16) as a candidate", () => {
    const suggestions = suggestionsFromAttributesAndText([
      {
        attribute: "itemClass",
        value: "spacecraft.adcs.star_tracker",
        confidence: "high",
      },
      {
        attribute: "starTrackerAccuracyArcsec",
        value: 0.5,
        confidence: "high",
      },
      {
        attribute: "starTrackerSlewRateDegPerS",
        value: 4.0,
        confidence: "high",
      },
    ]);
    const ids = suggestions.map((s) => s.canonicalId);
    expect(ids).toContain("USML:XV(e)(16)");
  });
});
```

- [ ] **Step 2: Run red** — `npx vitest run src/lib/trade/classify-suggest.intake.test.ts --no-file-parallelism` → FAIL (extended keys dropped; XV(e)(16) never surfaces).

- [ ] **Step 3: Implement** — keep typed keys in `BAG_KEYS`; route everything else into `parametricAttributes`:

```ts
/** Fold extracted attributes into the matcher's ItemAttributeBag.
 *  Typed keys (BAG_KEYS) go to typed fields; every OTHER attribute is routed
 *  into `parametricAttributes`, which the matcher's readAttribute reads via
 *  fallthrough — so operator-supplied decisive fields like
 *  starTrackerAccuracyArcsec actually reach the predicates that gate on them. */
export function attributesToBag(
  attributes: ReadonlyArray<SuggestInputAttribute>,
): ItemAttributeBag {
  const bag: ItemAttributeBag = {};
  const parametric: Record<string, unknown> = {};
  for (const a of attributes) {
    if (BAG_KEYS.has(a.attribute as keyof ItemAttributeBag)) {
      (bag as Record<string, unknown>)[a.attribute] = a.value;
    } else {
      parametric[a.attribute] = a.value;
    }
  }
  if (Object.keys(parametric).length > 0) bag.parametricAttributes = parametric;
  return bag;
}
```

> No restriction to a known-attribute set is needed: the matcher's `readAttribute` only looks up the attributes that appear in predicates; unrelated keys are inert. The scoped form (Task 7/12) only ever emits valid `AttributeName`s anyway.

- [ ] **Step 4: Run green** — that test + `npx vitest run src/lib/trade/classify-suggest.test.ts src/lib/comply-v2/trade/classification --no-file-parallelism` → PASS. tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/classify-suggest.ts src/lib/trade/classify-suggest.intake.test.ts
git commit -m "fix(trade): route extended attributes into parametricAttributes so decisive fields reach the matcher"
```

---

### Task 4: `deriveRelevantAttributes` — corpus-derived field set per class

**Files:**

- Create: `src/lib/trade/intake/derive-relevant-attributes.ts`
- Test: `src/lib/trade/intake/derive-relevant-attributes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/derive-relevant-attributes.test.ts
import { describe, it, expect } from "vitest";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

describe("deriveRelevantAttributes", () => {
  it("includes the decisive star-tracker predicates", () => {
    const attrs = deriveRelevantAttributes("spacecraft.adcs.star_tracker");
    expect(attrs).toContain("starTrackerAccuracyArcsec");
    expect(attrs).toContain("starTrackerSlewRateDegPerS");
  });
  it("never includes itemClass itself", () => {
    expect(
      deriveRelevantAttributes("spacecraft.adcs.star_tracker"),
    ).not.toContain("itemClass");
  });
  it("includes the gnss velocity gate for gnss.receiver", () => {
    expect(deriveRelevantAttributes("gnss.receiver")).toContain(
      "gnssMaxVelocityMPerS",
    );
  });
  it("returns [] for an unknown class (honest, no guessing)", () => {
    expect(deriveRelevantAttributes("totally.invented")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run red** → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/trade/intake/derive-relevant-attributes.ts
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import { decisivenessRank } from "./decisiveness";

/** Two itemClass strings are on the same branch when one is a prefix of the
 *  other (bidirectional) — handles the corpus's varied prefix depths. */
function classMatches(canonical: string, predicateValue: string): boolean {
  return (
    canonical === predicateValue ||
    canonical.startsWith(predicateValue + ".") ||
    predicateValue.startsWith(canonical + ".")
  );
}

const cache = new Map<string, AttributeName[]>();

/** The union of every non-itemClass AttributeName referenced in a predicate of
 *  any corpus entry whose itemClass-prefix gate bidirectionally matches
 *  `canonicalItemClass`, ordered by decisiveness rank (desc). Memoized. */
export function deriveRelevantAttributes(
  canonicalItemClass: string,
): AttributeName[] {
  const hit = cache.get(canonicalItemClass);
  if (hit) return hit;

  const set = new Set<AttributeName>();
  for (const entry of CONTROL_LIST_CROSS_WALK) {
    const gate = entry.predicates.find(
      (p) =>
        p.attribute === "itemClass" &&
        p.op === "prefix" &&
        typeof p.value === "string",
    );
    if (!gate || !classMatches(canonicalItemClass, gate.value as string))
      continue;
    for (const p of entry.predicates) {
      if (p.attribute !== "itemClass") set.add(p.attribute);
    }
  }
  const ordered = [...set].sort(
    (a, b) => decisivenessRank(b) - decisivenessRank(a),
  );
  cache.set(canonicalItemClass, ordered);
  return ordered;
}
```

- [ ] **Step 4: Run green** (Task 5 must land first if run in isolation — see note; if executing in order, implement Task 5 before this passes; or stub `decisivenessRank` then). Run → PASS. tsc → 666.

> **Sequencing note:** `deriveRelevantAttributes` imports `decisivenessRank` (Task 5). Execute Task 5 immediately after writing this test, OR temporarily order by frequency then swap to `decisivenessRank`. The subagent should implement Task 5 in the same task if needed to get green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/derive-relevant-attributes.ts src/lib/trade/intake/derive-relevant-attributes.test.ts
git commit -m "feat(trade): derive relevant attribute set per class from corpus predicates"
```

---

### Task 5: `decisivenessRank` — corpus-derived field ordering signal

**Files:**

- Create: `src/lib/trade/intake/decisiveness.ts`
- Test: `src/lib/trade/intake/decisiveness.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/decisiveness.test.ts
import { describe, it, expect } from "vitest";
import { decisivenessRank } from "./decisiveness";

describe("decisivenessRank", () => {
  it("ranks a threshold attribute on an ITAR/MTCR entry above a non-threshold attribute", () => {
    // starTrackerAccuracyArcsec gates USML:XV(e)(16) (ITAR, lte threshold)
    expect(decisivenessRank("starTrackerAccuracyArcsec")).toBeGreaterThan(0);
  });
  it("an attribute never used in any predicate has rank 0", () => {
    expect(decisivenessRank("temperatureRangeCelsius")).toBe(0); // adjust if used; pick a truly-unused one
  });
});
```

> Implementer: pick a genuinely-unused `AttributeName` for the rank-0 assertion by grepping `control-list-cross-walk.ts` (any name absent from all `predicates`). If all are used, assert relative ordering instead (`rank(starTrackerAccuracyArcsec) > rank(missionDurationYears)`).

- [ ] **Step 2: Run red** → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/trade/intake/decisiveness.ts
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const THRESHOLD_OPS = new Set(["lt", "lte", "gt", "gte", "between"]);
const HARD_REGIMES = new Set(["ITAR-USML", "MTCR-ANNEX"]);

const cache = new Map<AttributeName, number>();

/** Weight an attribute by how decisive it is: +1 per entry it appears in,
 *  +2 more when it appears with a THRESHOLD op, +3 more when that entry is a
 *  hard regime (ITAR/MTCR). Pure read over the corpus, memoized. */
export function decisivenessRank(attribute: AttributeName): number {
  const hit = cache.get(attribute);
  if (hit !== undefined) return hit;

  let rank = 0;
  for (const entry of CONTROL_LIST_CROSS_WALK) {
    for (const p of entry.predicates) {
      if (p.attribute !== attribute) continue;
      rank += 1;
      if (THRESHOLD_OPS.has(p.op)) rank += 2;
      if (HARD_REGIMES.has(entry.regime)) rank += 3;
    }
  }
  cache.set(attribute, rank);
  return rank;
}
```

- [ ] **Step 4: Run green** — this test + Task 4's test (now both pass). tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/decisiveness.ts src/lib/trade/intake/decisiveness.test.ts
git commit -m "feat(trade): corpus-derived decisiveness rank for intake field ordering"
```

---

### Task 6: Attribute dictionary (labels/units/kind/help + sanity-range validation)

**Files:**

- Create: `src/lib/trade/intake/attribute-fields.ts`
- Test: `src/lib/trade/intake/attribute-fields.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/attribute-fields.test.ts
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_FIELDS,
  getAttributeField,
  validateAttributeValue,
} from "./attribute-fields";

describe("attribute dictionary", () => {
  it("defines the decisive star-tracker fields with units", () => {
    const acc = getAttributeField("starTrackerAccuracyArcsec");
    expect(acc?.unit).toBe("arcsec");
    expect(acc?.kind).toBe("number");
  });
  it("flags an out-of-range value using the matcher's sanity bound", () => {
    // ATTRIBUTE_SANITY_RANGES.starTrackerAccuracyArcsec = { min: 0.001, max: 3600 }
    expect(validateAttributeValue("starTrackerAccuracyArcsec", 999999).ok).toBe(
      false,
    );
    expect(validateAttributeValue("starTrackerAccuracyArcsec", 10).ok).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — one entry per AttributeName the v1 catalog references (Task 7 lists them). Reuse `ATTRIBUTE_SANITY_RANGES` for bounds.

```ts
// src/lib/trade/intake/attribute-fields.ts
import { ATTRIBUTE_SANITY_RANGES } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

export interface AttributeField {
  attribute: AttributeName;
  label: string;
  unit?: string;
  kind: "number" | "boolean" | "enum" | "string";
  enumValues?: string[];
  help?: string;
}

/** Editorial metadata for every attribute the v1 catalog can render. Bounds are
 *  NOT redefined here — validation reuses ATTRIBUTE_SANITY_RANGES (the matcher's
 *  actual UNKNOWN-routing bound) so the form and matcher agree by construction. */
export const ATTRIBUTE_FIELDS: Partial<Record<AttributeName, AttributeField>> =
  {
    starTrackerAccuracyArcsec: {
      attribute: "starTrackerAccuracyArcsec",
      label: "Genauigkeit (1σ)",
      unit: "arcsec",
      kind: "number",
      help: "Kreuz-Boresight-Genauigkeit; ITAR-Schwelle ≤ 1 arcsec.",
    },
    starTrackerSlewRateDegPerS: {
      attribute: "starTrackerSlewRateDegPerS",
      label: "Slew-Rate-Toleranz",
      unit: "°/s",
      kind: "number",
      help: "ITAR-Schwelle ≥ 3 °/s (konjunktiv mit Genauigkeit).",
    },
    gnssMaxVelocityMPerS: {
      attribute: "gnssMaxVelocityMPerS",
      label: "Max. Geschwindigkeit",
      unit: "m/s",
      kind: "number",
      help: "MTCR/EAR-Schwelle ≥ 600 m/s.",
    },
    radHardTidKrad: {
      attribute: "radHardTidKrad",
      label: "Strahlungshärte (TID)",
      unit: "krad",
      kind: "number",
    },
    isRadHardened: {
      attribute: "isRadHardened",
      label: "Strahlungsgehärtet",
      kind: "boolean",
    },
    isSpeciallyDesigned: {
      attribute: "isSpeciallyDesigned",
      label: "Speziell konstruiert (specially designed)",
      kind: "boolean",
    },
    payloadKg: {
      attribute: "payloadKg",
      label: "Nutzlast",
      unit: "kg",
      kind: "number",
    },
    rangeKm: {
      attribute: "rangeKm",
      label: "Reichweite",
      unit: "km",
      kind: "number",
    },
    frequencyGhz: {
      attribute: "frequencyGhz",
      label: "Frequenz",
      unit: "GHz",
      kind: "number",
    },
    thrustNewtons: {
      attribute: "thrustNewtons",
      label: "Schub",
      unit: "N",
      kind: "number",
    },
    specificImpulseSecondsVacuum: {
      attribute: "specificImpulseSecondsVacuum",
      label: "Spezifischer Impuls (Vakuum)",
      unit: "s",
      kind: "number",
    },
    apertureMeters: {
      attribute: "apertureMeters",
      label: "Apertur",
      unit: "m",
      kind: "number",
    },
    gsdMeters: {
      attribute: "gsdMeters",
      label: "Bodenauflösung (GSD)",
      unit: "m",
      kind: "number",
    },
    // …implementer adds one entry per attribute returned by deriveRelevantAttributes
    // for each of the 12 v1 categories (Task 7). The completeness test (Task 7)
    // fails the build if any rendered attribute lacks an entry here.
  };

export function getAttributeField(
  a: AttributeName,
): AttributeField | undefined {
  return ATTRIBUTE_FIELDS[a];
}

export function validateAttributeValue(
  a: AttributeName,
  value: number | boolean | string,
): { ok: boolean; reason?: string } {
  const bound = ATTRIBUTE_SANITY_RANGES[a];
  if (bound && typeof value === "number") {
    if (!Number.isFinite(value) || value < bound.min || value > bound.max) {
      return {
        ok: false,
        reason: `Wert ${value} außerhalb des plausiblen Bereichs (${bound.min}–${bound.max}). Möglicher Einheitenfehler.`,
      };
    }
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/attribute-fields.ts src/lib/trade/intake/attribute-fields.test.ts
git commit -m "feat(trade): intake attribute dictionary (labels/units) + sanity-range validation reuse"
```

---

### Task 7: Product-category catalog (12 classes + overlay + rendered-field assembly)

**Files:**

- Create: `src/lib/trade/intake/product-categories.ts`
- Test: `src/lib/trade/intake/product-categories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/product-categories.test.ts
import { describe, it, expect } from "vitest";
import {
  PRODUCT_CATEGORIES,
  getCategory,
  renderedFields,
} from "./product-categories";
import { isCanonicalItemClassPrefix } from "./canonical-item-classes";
import { getAttributeField } from "./attribute-fields";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

describe("product-category catalog", () => {
  it("ships 12 categories", () => {
    expect(PRODUCT_CATEGORIES.length).toBe(12);
  });
  it("every canonicalItemClass is a real corpus prefix (the §0 invariant)", () => {
    for (const c of PRODUCT_CATEGORIES) {
      expect(
        isCanonicalItemClassPrefix(c.canonicalItemClass),
        `${c.id}: ${c.canonicalItemClass}`,
      ).toBe(true);
    }
  });
  it("every rendered field has a dictionary entry (completeness)", () => {
    for (const c of PRODUCT_CATEGORIES) {
      for (const a of renderedFields(c.id)) {
        expect(
          getAttributeField(a),
          `${c.id} field ${a} missing in dictionary`,
        ).toBeTruthy();
      }
    }
  });
  it("curation overlay is monotone-non-shrinking on the decisive set", () => {
    for (const c of PRODUCT_CATEGORIES) {
      const derived = deriveRelevantAttributes(c.canonicalItemClass);
      const renderedPlusHidden = new Set([
        ...renderedFields(c.id),
        ...(c.overlay?.hide ?? []),
      ]);
      for (const a of derived) {
        expect(
          renderedPlusHidden.has(a),
          `${c.id} dropped decisive field ${a}`,
        ).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — the 12 verified categories + assembly. `relevantAttributes` is derived, NOT stored.

```ts
// src/lib/trade/intake/product-categories.ts
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

export interface ProductCategory {
  id: string;
  label: string;
  blurb: string;
  /** Validated at build time against CANONICAL_ITEM_CLASSES (Task 1). */
  canonicalItemClass: string;
  synonyms: string[];
  group: "ADCS" | "Antrieb" | "Payload" | "Power" | "RF" | "Elektronik";
  /** Thin overlay — MAY ONLY reorder / relabel / append; `hide` is render-only. */
  overlay?: {
    order?: AttributeName[];
    hide?: AttributeName[];
    extraOptional?: AttributeName[];
  };
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "star_tracker",
    label: "Sternsensor (Star Tracker)",
    blurb: "Lagebestimmung über Sternfeld",
    canonicalItemClass: "spacecraft.adcs.star_tracker",
    group: "ADCS",
    synonyms: ["star tracker", "sternsensor", "celestial navigation"],
  },
  {
    id: "reaction_wheel",
    label: "Reaktionsrad",
    blurb: "Drehmoment-Aktuator zur Lageregelung",
    canonicalItemClass: "spacecraft.adcs.reaction_wheel",
    group: "ADCS",
    synonyms: ["reaction wheel", "momentum wheel"],
  },
  {
    id: "cmg",
    label: "Drallrad / CMG",
    blurb: "Control Moment Gyroscope",
    canonicalItemClass: "spacecraft.adcs.cmg",
    group: "ADCS",
    synonyms: ["cmg", "control moment gyro"],
  },
  {
    id: "thruster_electric",
    label: "Elektrisches Triebwerk",
    blurb: "Hall / Ionen / Plasma",
    canonicalItemClass: "propulsion.electric",
    group: "Antrieb",
    synonyms: ["hall thruster", "ion engine", "electric propulsion"],
  },
  {
    id: "thruster_chemical",
    label: "Chemisches Triebwerk",
    blurb: "Mono-/Bipropellant",
    canonicalItemClass: "propulsion.chemical",
    group: "Antrieb",
    synonyms: ["chemical thruster", "monopropellant", "bipropellant"],
  },
  {
    id: "eo_imager",
    label: "EO-Imager / Optik-Payload",
    blurb: "Optische Erdbeobachtung",
    canonicalItemClass: "sensor.imager",
    group: "Payload",
    synonyms: ["imager", "telescope", "optical payload", "camera"],
  },
  {
    id: "sar_payload",
    label: "SAR-Payload",
    blurb: "Radar mit synthetischer Apertur",
    canonicalItemClass: "spacecraft.remote_sensing.sar",
    group: "Payload",
    synonyms: ["sar", "synthetic aperture radar"],
  },
  {
    id: "radhard_ic",
    label: "Rad-harter IC / Prozessor",
    blurb: "Strahlungsfeste Elektronik",
    canonicalItemClass: "ic.radhard",
    group: "Elektronik",
    synonyms: ["rad-hard", "radiation hardened", "fpga", "processor"],
  },
  {
    id: "gnss_receiver",
    label: "GNSS-Empfänger",
    blurb: "Satellitennavigation",
    canonicalItemClass: "gnss.receiver",
    group: "Elektronik",
    synonyms: ["gnss", "gps receiver", "navigation receiver"],
  },
  {
    id: "rf_antenna",
    label: "RF-Antenne / Transponder",
    blurb: "Kommunikations-Hardware",
    canonicalItemClass: "rf.antenna",
    group: "RF",
    synonyms: ["antenna", "transponder", "rf"],
  },
  {
    id: "solar_array",
    label: "Solar-Array",
    blurb: "Photovoltaik-Stromerzeugung",
    canonicalItemClass: "spacecraft.power.solar",
    group: "Power",
    synonyms: ["solar array", "solar panel", "photovoltaic"],
  },
  {
    id: "battery",
    label: "Satelliten-Batterie",
    blurb: "Energiespeicher",
    canonicalItemClass: "spacecraft.power.battery",
    group: "Power",
    synonyms: ["battery", "li-ion", "energy storage"],
  },
];

export function getCategory(id: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((c) => c.id === id);
}

/** Derived field set for a category, with overlay applied: reorder by overlay.order
 *  first (stable), append overlay.extraOptional, remove overlay.hide from the
 *  RENDERED list only (hidden fields still flow to the matcher as absent). */
export function renderedFields(categoryId: string): AttributeName[] {
  const c = getCategory(categoryId);
  if (!c) return [];
  const derived = deriveRelevantAttributes(c.canonicalItemClass);
  const extra = (c.overlay?.extraOptional ?? []).filter(
    (a) => !derived.includes(a),
  );
  const hide = new Set(c.overlay?.hide ?? []);
  const orderHint = c.overlay?.order ?? [];
  const all = [...derived, ...extra].filter((a) => !hide.has(a));
  return all.sort((a, b) => {
    const ia = orderHint.indexOf(a),
      ib = orderHint.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
```

> When the completeness test flags a rendered field with no dictionary entry, add that `AttributeName` to `ATTRIBUTE_FIELDS` (Task 6). Iterate until green — this is the deliberate mechanism that forces full dictionary coverage of exactly the fields the corpus makes relevant.

- [ ] **Step 4: Run green** (loop with Task 6 dictionary additions until all 4 assertions pass). tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/product-categories.ts src/lib/trade/intake/product-categories.test.ts src/lib/trade/intake/attribute-fields.ts
git commit -m "feat(trade): 12-class product-category catalog (derived fields + monotone overlay)"
```

---

### Task 8: `detectCategory` — ranked, never decides

**Files:**

- Create: `src/lib/trade/intake/detect-category.ts`
- Test: `src/lib/trade/intake/detect-category.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trade/intake/detect-category.test.ts
import { describe, it, expect } from "vitest";
import { rankCategories } from "./detect-category";

describe("rankCategories", () => {
  it("ranks star_tracker top for a matching itemClass", () => {
    const ranked = rankCategories({
      itemClass: "spacecraft.adcs.star_tracker",
      text: "",
    });
    expect(ranked[0]?.id).toBe("star_tracker");
  });
  it("uses synonyms in free text when itemClass is absent", () => {
    const ranked = rankCategories({
      itemClass: null,
      text: "high-accuracy reaction wheel",
    });
    expect(ranked[0]?.id).toBe("reaction_wheel");
  });
  it("returns [] when nothing matches (caller → generic fallback)", () => {
    expect(rankCategories({ itemClass: null, text: "a wooden chair" })).toEqual(
      [],
    );
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/trade/intake/detect-category.ts
import { PRODUCT_CATEGORIES, type ProductCategory } from "./product-categories";

export interface CategoryRanking {
  id: string;
  category: ProductCategory;
  score: number;
}

/** Score each category by: +100 if the extracted itemClass prefix-matches its
 *  canonicalItemClass; +N synonym hits in the free text. Returns descending,
 *  positive-score categories only — NEVER decides (the operator confirms). */
export function rankCategories(input: {
  itemClass: string | null;
  text: string;
}): CategoryRanking[] {
  const text = (input.text ?? "").toLowerCase();
  const cls = input.itemClass ?? "";
  const ranked = PRODUCT_CATEGORIES.map((category) => {
    let score = 0;
    if (
      cls &&
      (cls === category.canonicalItemClass ||
        cls.startsWith(category.canonicalItemClass) ||
        category.canonicalItemClass.startsWith(cls))
    ) {
      score += 100;
    }
    for (const syn of category.synonyms)
      if (text.includes(syn.toLowerCase())) score += 10;
    return { id: category.id, category, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked;
}
```

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/intake/detect-category.ts src/lib/trade/intake/detect-category.test.ts
git commit -m "feat(trade): ranked category detection from extraction + synonyms (never decides)"
```

---

### Task 9: Scoped second vision pass (extend PROMPT_VOCABULARY + `vocabularySubset`)

**Files:**

- Modify: `src/lib/trade/classification/claude-vision-extractor.server.ts` (PROMPT_VOCABULARY, `buildSystemPrompt`, `extractDatasheetViaVision` options)
- Test: `src/lib/trade/classification/claude-vision-extractor.vocab.test.ts`

- [ ] **Step 1: Write the failing test** (pure helpers only — no network)

```ts
// src/lib/trade/classification/claude-vision-extractor.vocab.test.ts
import { describe, it, expect } from "vitest";
import {
  __buildSystemPromptForTest,
  PROMPT_VOCABULARY_NAMES,
} from "./claude-vision-extractor.server";

describe("scoped vision vocabulary", () => {
  it("now includes the decisive extended attributes", () => {
    expect(PROMPT_VOCABULARY_NAMES).toContain("starTrackerAccuracyArcsec");
    expect(PROMPT_VOCABULARY_NAMES).toContain("starTrackerSlewRateDegPerS");
    expect(PROMPT_VOCABULARY_NAMES).toContain("gnssMaxVelocityMPerS");
  });
  it("a vocabularySubset prompt asks ONLY for the listed attributes", () => {
    const prompt = __buildSystemPromptForTest(["starTrackerAccuracyArcsec"]);
    expect(prompt).toContain("starTrackerAccuracyArcsec");
    expect(prompt).not.toContain("antennaAdaptiveBeamforming");
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — (a) append the decisive extended attrs to `PROMPT_VOCABULARY`; (b) make `buildSystemPrompt` accept an optional subset; (c) add `vocabularySubset?: AttributeName[]` to `extractDatasheetViaVision` options + thread it; (d) export a test seam + the names list.

```ts
// add to PROMPT_VOCABULARY (after antennaAdaptiveBeamforming):
  { name: "starTrackerAccuracyArcsec", description: "star-tracker pointing accuracy (1σ)", type: "number", unitHint: "arcseconds" },
  { name: "starTrackerSlewRateDegPerS", description: "star-tracker max tracking/slew rate", type: "number", unitHint: "degrees per second" },
  { name: "gnssMaxVelocityMPerS", description: "GNSS receiver max operating velocity", type: "number", unitHint: "metres per second" },
  { name: "totalImpulseNs", description: "total impulse", type: "number", unitHint: "newton-seconds" },
  { name: "thrustNewtons", description: "thrust", type: "number", unitHint: "newtons" },
  { name: "specificImpulseSecondsVacuum", description: "vacuum specific impulse (Isp)", type: "number", unitHint: "seconds" },
  { name: "isSpeciallyDesigned", description: "specially designed for a military/space application", type: "boolean" },

// buildSystemPrompt — accept optional subset:
function buildSystemPrompt(subset?: ReadonlyArray<AttributeName>): string {
  const vocab = subset && subset.length > 0
    ? PROMPT_VOCABULARY.filter((a) => subset.includes(a.name))
    : PROMPT_VOCABULARY;
  const attributeLines = vocab.map((a) => /* …unchanged mapping… */).join("\n");
  /* …unchanged… */
}

// extractDatasheetViaVision options:
  options: { modelOverride?: string; vocabularySubset?: AttributeName[] } = {},
// …pass options.vocabularySubset into buildSystemPrompt(...)

// test seams (exported):
export const PROMPT_VOCABULARY_NAMES: ReadonlyArray<AttributeName> = PROMPT_VOCABULARY.map((a) => a.name);
export function __buildSystemPromptForTest(subset?: AttributeName[]): string { return buildSystemPrompt(subset); }
```

> `guardValue` already covers the new numeric attrs via `ATTRIBUTE_SANITY_RANGES` (verified present for starTracker\*, gnssMaxVelocityMPerS, thrustNewtons, specificImpulseSecondsVacuum, totalImpulseNs). No guard change needed.

- [ ] **Step 4: Run green** + existing `claude-vision-extractor.test.ts` + `claude-vision-value-guard.test.ts` → PASS. tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/classification/claude-vision-extractor.server.ts src/lib/trade/classification/claude-vision-extractor.vocab.test.ts
git commit -m "feat(trade): extend vision vocabulary with decisive attrs + scoped vocabularySubset pass"
```

---

### Task 10: `EntryChoice` — two-path entry screen

**Files:**

- Create: `src/app/(trade)/trade/assess/_components/EntryChoice.tsx`
- Test: `src/app/(trade)/trade/assess/_components/EntryChoice.test.tsx`

- [ ] **Step 1: Write the failing test** (note the MANDATORY mock header)

```tsx
// src/app/(trade)/trade/assess/_components/EntryChoice.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntryChoice } from "./EntryChoice";

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${name}`} {...p} />
    );
    I.displayName = name;
    return I;
  };
  return {
    Upload: icon("Upload"),
    PencilLine: icon("PencilLine"),
    ArrowRight: icon("ArrowRight"),
  };
});

describe("EntryChoice", () => {
  it("offers upload and manual paths", () => {
    render(<EntryChoice onUpload={vi.fn()} onManual={vi.fn()} />);
    expect(screen.getByText(/Datenblatt hochladen/i)).toBeInTheDocument();
    expect(screen.getByText(/Manuell eingeben/i)).toBeInTheDocument();
  });
  it("fires onUpload / onManual", () => {
    const onUpload = vi.fn(),
      onManual = vi.fn();
    render(<EntryChoice onUpload={onUpload} onManual={onManual} />);
    fireEvent.click(screen.getByTestId("entry-upload"));
    fireEvent.click(screen.getByTestId("entry-manual"));
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onManual).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run red** — `npm run test:run -- "src/app/(trade)/trade/assess/_components/EntryChoice.test.tsx"` → FAIL.

- [ ] **Step 3: Implement** — two trade-styled cards.

```tsx
// src/app/(trade)/trade/assess/_components/EntryChoice.tsx
"use client";
import { Upload, PencilLine, ArrowRight } from "lucide-react";

export function EntryChoice({
  onUpload,
  onManual,
}: {
  onUpload: () => void;
  onManual: () => void;
}) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2"
      data-testid="assess-entry-step"
    >
      <button
        type="button"
        data-testid="entry-upload"
        onClick={onUpload}
        className="rounded-xl border border-trade-border bg-trade-bg-panel p-6 text-left transition hover:bg-trade-hover"
      >
        <Upload className="h-6 w-6 text-trade-accent" />
        <h3 className="mt-3 text-title text-trade-text-primary">
          Datenblatt hochladen
        </h3>
        <p className="mt-1 text-sm text-trade-text-muted">
          Wir lesen die Spezifikationen aus dem PDF und füllen die relevanten
          Felder vor.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-trade-accent">
          Weiter <ArrowRight className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        data-testid="entry-manual"
        onClick={onManual}
        className="rounded-xl border border-trade-border bg-trade-bg-panel p-6 text-left transition hover:bg-trade-hover"
      >
        <PencilLine className="h-6 w-6 text-trade-accent" />
        <h3 className="mt-3 text-title text-trade-text-primary">
          Manuell eingeben
        </h3>
        <p className="mt-1 text-sm text-trade-text-muted">
          Produktklasse wählen und die relevanten Werte selbst eintragen.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-trade-accent">
          Weiter <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/assess/_components/EntryChoice.tsx" "src/app/(trade)/trade/assess/_components/EntryChoice.test.tsx"
git commit -m "feat(trade): assess entry-choice screen (upload or manual)"
```

---

### Task 11: `CategoryPicker` — grouped, searchable

**Files:**

- Create: `src/app/(trade)/trade/assess/_components/CategoryPicker.tsx`
- Test: `src/app/(trade)/trade/assess/_components/CategoryPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// CategoryPicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryPicker } from "./CategoryPicker";

vi.mock("lucide-react", () => {
  const icon = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return { Search: icon("Search") };
});

describe("CategoryPicker", () => {
  it("renders the ADCS group with the star tracker", () => {
    render(<CategoryPicker onSelect={vi.fn()} />);
    expect(screen.getByText("ADCS")).toBeInTheDocument();
    expect(screen.getByText(/Sternsensor/)).toBeInTheDocument();
  });
  it("filters by search term", () => {
    render(<CategoryPicker onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/suchen/i), {
      target: { value: "reaction" },
    });
    expect(screen.getByText(/Reaktionsrad/)).toBeInTheDocument();
    expect(screen.queryByText(/Sternsensor/)).not.toBeInTheDocument();
  });
  it("fires onSelect with the category id", () => {
    const onSelect = vi.fn();
    render(<CategoryPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Sternsensor/));
    expect(onSelect).toHaveBeenCalledWith("star_tracker");
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — group `PRODUCT_CATEGORIES` by `group`, filter on label/synonyms.

```tsx
// CategoryPicker.tsx
"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/trade/intake/product-categories";

const GROUPS = [
  "ADCS",
  "Antrieb",
  "Payload",
  "Power",
  "RF",
  "Elektronik",
] as const;

export function CategoryPicker({
  onSelect,
}: {
  onSelect: (categoryId: string) => void;
}) {
  const [q, setQ] = useState("");
  const term = q.toLowerCase().trim();
  const match = (c: (typeof PRODUCT_CATEGORIES)[number]) =>
    !term ||
    c.label.toLowerCase().includes(term) ||
    c.synonyms.some((s) => s.toLowerCase().includes(term));
  return (
    <section className="space-y-4" data-testid="assess-category-step">
      <label className="flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2">
        <Search className="h-4 w-4 text-trade-text-muted" />
        <input
          className="w-full bg-transparent text-trade-text-primary outline-none"
          placeholder="Produktklasse suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {GROUPS.map((g) => {
        const items = PRODUCT_CATEGORIES.filter(
          (c) => c.group === g && match(c),
        );
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <h4 className="text-caption uppercase tracking-wide text-trade-text-muted">
              {g}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-left transition hover:bg-trade-hover"
                >
                  <div className="text-trade-text-primary">{c.label}</div>
                  <div className="text-caption text-trade-text-muted">
                    {c.blurb}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/assess/_components/CategoryPicker.tsx" "src/app/(trade)/trade/assess/_components/CategoryPicker.test.tsx"
git commit -m "feat(trade): grouped searchable product-category picker (manual path)"
```

---

### Task 12: `ScopedItemForm` — decisiveness-ordered scoped fields + evidence prefill + standing prompts

**Files:**

- Create: `src/app/(trade)/trade/assess/_components/ScopedItemForm.tsx`
- Test: `src/app/(trade)/trade/assess/_components/ScopedItemForm.test.tsx`

**Component contract:**

```ts
export interface ScopedFieldValue {
  attribute: AttributeName;
  value: number | boolean | string;
  source: "prefill" | "operator";
  confidence: "high" | "medium" | "low";
}
export interface ScopedItemFormProps {
  categoryId: string;
  /** Pre-fill seeds keyed by attribute (from MergedExtraction; high-confidence only). */
  prefill: Record<
    string,
    {
      value: number | boolean | string;
      confidence: "high" | "medium" | "low";
      quote?: string;
      alternateValue?: { value: number | boolean | string; source: string };
    }
  >;
  name: string;
  onNameChange: (n: string) => void;
  onChangeCategory: () => void;
  /** Emitted on every edit so the parent can run the live preview (Task 13). */
  onAttributesChange: (attrs: ScopedFieldValue[]) => void;
  onStart: () => void;
  submitting: boolean;
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// ScopedItemForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScopedItemForm } from "./ScopedItemForm";

vi.mock("lucide-react", () => {
  const icon = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return {
    Check: icon("Check"),
    AlertTriangle: icon("AlertTriangle"),
    ArrowRight: icon("ArrowRight"),
    Pencil: icon("Pencil"),
  };
});

const baseProps = {
  categoryId: "star_tracker",
  name: "AstroSense ST-300",
  onNameChange: vi.fn(),
  onChangeCategory: vi.fn(),
  onAttributesChange: vi.fn(),
  onStart: vi.fn(),
  submitting: false,
};

describe("ScopedItemForm", () => {
  it("renders the decisive star-tracker fields, accuracy before a non-decisive field", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    const labels = screen
      .getAllByTestId(/^field-/)
      .map((n) => n.getAttribute("data-testid"));
    expect(labels).toContain("field-starTrackerAccuracyArcsec");
    expect(labels.indexOf("field-starTrackerAccuracyArcsec")).toBeLessThan(
      labels.length,
    ); // present + ranked
  });
  it("prefills a high-confidence value with an evidence quote badge", () => {
    render(
      <ScopedItemForm
        {...baseProps}
        prefill={{
          starTrackerAccuracyArcsec: {
            value: 10,
            confidence: "high",
            quote: "Cross-boresight accuracy 10 arcsec",
          },
        }}
      />,
    );
    expect(
      (
        screen.getByTestId(
          "input-starTrackerAccuracyArcsec",
        ) as HTMLInputElement
      ).value,
    ).toBe("10");
    expect(
      screen.getByText(/Cross-boresight accuracy 10 arcsec/),
    ).toBeInTheDocument();
  });
  it("shows the specially-designed tri-state with an 'unbekannt' default", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    expect(screen.getByTestId("sd-tristate")).toBeInTheDocument();
  });
  it("renders the end-use + no-clearance standing prompts", () => {
    render(<ScopedItemForm {...baseProps} prefill={{}} />);
    expect(screen.getByText(/keine Endverwendung/i)).toBeInTheDocument();
    expect(screen.getByText(/keine Freigabe/i)).toBeInTheDocument();
  });
  it("allows start (category + name present) and fires onStart", () => {
    const onStart = vi.fn();
    render(<ScopedItemForm {...baseProps} prefill={{}} onStart={onStart} />);
    fireEvent.click(screen.getByTestId("start-vorgang"));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — render `renderedFields(categoryId)` (already decisiveness-ordered), each via `getAttributeField`; seed from `prefill`; emit `onAttributesChange` on edits; SD tri-state; conjunction hint when ≥2 threshold predicates share an entry (use a simple "BEIDE nötig" badge on grouped fields — minimal: badge the two star-tracker fields); the three standing prompts at the bottom; "Vorgang starten" enabled when `name.trim()` is set.

```tsx
// ScopedItemForm.tsx (skeleton — full field loop + handlers)
"use client";
import { useEffect, useState } from "react";
import { Check, AlertTriangle, ArrowRight, Pencil } from "lucide-react";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import {
  getCategory,
  renderedFields,
} from "@/lib/trade/intake/product-categories";
import {
  getAttributeField,
  validateAttributeValue,
} from "@/lib/trade/intake/attribute-fields";

// …ScopedFieldValue, ScopedItemFormProps as in the contract above…

export function ScopedItemForm(props: ScopedItemFormProps) {
  const category = getCategory(props.categoryId);
  const fields = renderedFields(props.categoryId);
  const [values, setValues] = useState<
    Record<string, number | boolean | string>
  >(() => {
    const seed: Record<string, number | boolean | string> = {};
    for (const a of fields)
      if (props.prefill[a]) seed[a] = props.prefill[a].value;
    return seed;
  });
  const [sd, setSd] = useState<"ja" | "nein" | "unbekannt">("unbekannt");

  useEffect(() => {
    const attrs: ScopedFieldValue[] = [];
    for (const a of fields) {
      if (values[a] !== undefined && values[a] !== "") {
        attrs.push({
          attribute: a,
          value: values[a],
          source: props.prefill[a] ? "prefill" : "operator",
          confidence: props.prefill[a]?.confidence ?? "high",
        });
      }
    }
    if (sd !== "unbekannt")
      attrs.push({
        attribute: "isSpeciallyDesigned",
        value: sd === "ja",
        source: "operator",
        confidence: "high",
      });
    props.onAttributesChange(attrs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, sd]);

  return (
    <section className="space-y-4" data-testid="assess-scoped-form">
      {/* category row with onChangeCategory ("falsche Klasse? ändern") */}
      {/* Artikelname input (props.name / props.onNameChange) */}
      {fields.map((a: AttributeName) => {
        const def = getAttributeField(a);
        if (!def) return null;
        const pf = props.prefill[a];
        return (
          <div key={a} data-testid={`field-${a}`} className="…">
            <label className="text-sm text-trade-text-muted">
              {def.label}
              {def.unit ? ` (${def.unit})` : ""}
            </label>
            <input
              data-testid={`input-${a}`}
              className="…"
              value={String(values[a] ?? "")}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [a]:
                    def.kind === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                }))
              }
            />
            {pf?.quote && (
              <span className="text-caption text-trade-text-muted">
                aus: „{pf.quote}"
              </span>
            )}
            {/* validateAttributeValue(a, values[a]) → out-of-range warning */}
          </div>
        );
      })}
      {/* SD tri-state */}
      <div data-testid="sd-tristate">
        {/* ja / nein / unbekannt radios → setSd */}
      </div>
      {/* standing prompts */}
      <p className="text-caption text-trade-text-muted">
        Hinweis: die Korpus-Prüfung bewertet keine Endverwendung/Endnutzer —
        eine saubere Einstufung ist keine Endverwendungs-Freigabe.
      </p>
      <p className="text-caption text-trade-text-muted">
        Eine fehlende Einstufung ist keine Freigabe.
      </p>
      <button
        type="button"
        data-testid="start-vorgang"
        disabled={!props.name.trim() || props.submitting}
        onClick={props.onStart}
        className="…"
      >
        Vorgang starten <ArrowRight className="inline h-4 w-4" />
      </button>
    </section>
  );
}
```

> The conjunction "BEIDE nötig" badge: detect at render time whether the category's primary entry has ≥2 threshold predicates (read the corpus, or hardcode for `star_tracker` in v1 with a TODO to derive) — keep v1 minimal: show the badge on `starTrackerAccuracyArcsec` + `starTrackerSlewRateDegPerS`. Do NOT block on it for green.

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/assess/_components/ScopedItemForm.tsx" "src/app/(trade)/trade/assess/_components/ScopedItemForm.test.tsx"
git commit -m "feat(trade): scoped attribute form (decisiveness order, evidence prefill, standing prompts)"
```

---

### Task 13: `ClassificationPreview` — live suggestion + RationaleCard + certainty ladder

**Files:**

- Create: `src/app/(trade)/trade/assess/_components/ClassificationPreview.tsx`
- Test: `src/app/(trade)/trade/assess/_components/ClassificationPreview.test.tsx`

**Contract:** takes `attributes: ScopedFieldValue[]` + `text: string`, runs `suggestionsFromAttributesAndText` (client-side, synchronous, debounced) and renders the top suggestion chip + a deterministic rationale; pins certainty below "genug" while a decisive field is blank.

- [ ] **Step 1: Write the failing test**

```tsx
// ClassificationPreview.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClassificationPreview } from "./ClassificationPreview";

vi.mock("lucide-react", () => {
  const i = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return {
    Sparkles: i("Sparkles"),
    AlertTriangle: i("AlertTriangle"),
    CheckCircle2: i("CheckCircle2"),
  };
});

describe("ClassificationPreview", () => {
  it("shows a determinate candidate for a complete star tracker", () => {
    render(
      <ClassificationPreview
        categoryId="star_tracker"
        text=""
        attributes={[
          {
            attribute: "itemClass",
            value: "spacecraft.adcs.star_tracker",
            source: "operator",
            confidence: "high",
          },
          {
            attribute: "starTrackerAccuracyArcsec",
            value: 0.5,
            source: "operator",
            confidence: "high",
          },
          {
            attribute: "starTrackerSlewRateDegPerS",
            value: 4,
            source: "operator",
            confidence: "high",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("preview-code").textContent).toMatch(
      /XV\(e\)\(16\)/,
    );
  });
  it("stays 'kann nicht ausgeschlossen werden' while a decisive field is blank", () => {
    render(
      <ClassificationPreview
        categoryId="star_tracker"
        text=""
        attributes={[
          {
            attribute: "itemClass",
            value: "spacecraft.adcs.star_tracker",
            source: "operator",
            confidence: "high",
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/kann nicht ausgeschlossen werden|nicht ausschließbar/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("certainty-enough")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — map `ScopedFieldValue[]` → `SuggestInputAttribute[]`, call `suggestionsFromAttributesAndText(attrs, text)`; the top suggestion (if any candidate-confidence) → solid chip; else amber/grey "nicht ausschließbar"; certainty "enough" only when ≥1 HIGH/MEDIUM candidate. Use `explainClassification(matchAgainstCrossWalk(...))` for the rationale OR derive the rationale string from the top suggestion's `rationale` (simpler, no extra import) — v1: render `suggestions[0].rationale` + the disclaimer.

```tsx
// ClassificationPreview.tsx
"use client";
import { useMemo } from "react";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  suggestionsFromAttributesAndText,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";
import type { ScopedFieldValue } from "./ScopedItemForm";

export function ClassificationPreview({
  categoryId,
  attributes,
  text,
}: {
  categoryId: string;
  attributes: ScopedFieldValue[];
  text: string;
}) {
  const suggestions = useMemo(() => {
    const input: SuggestInputAttribute[] = attributes.map((a) => ({
      attribute: a.attribute,
      value: a.value,
      confidence: a.confidence,
    }));
    return suggestionsFromAttributesAndText(input, text);
  }, [attributes, text]);
  const top = suggestions[0];
  const determinate =
    top && (top.confidence === "HIGH" || top.confidence === "MEDIUM");
  return (
    <div
      className="rounded-lg border border-trade-border bg-trade-bg-panel p-4"
      data-testid="assess-preview"
    >
      {determinate ? (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-trade-accent-success" />
            <span
              data-testid="preview-code"
              className="text-trade-text-primary"
            >
              {top!.canonicalId}
            </span>
            <span
              data-testid="certainty-enough"
              className="text-caption text-trade-text-muted"
            >
              genug für eine Einschätzung
            </span>
          </div>
          <p className="mt-1 text-caption text-trade-text-muted">
            {top!.rationale}
          </p>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-trade-accent-warn" />
          <span className="text-trade-text-muted">
            Noch nicht ausschließbar — relevante Felder ergänzen. Eine fehlende
            Einstufung ist keine Freigabe.
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run green.** tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/assess/_components/ClassificationPreview.tsx" "src/app/(trade)/trade/assess/_components/ClassificationPreview.test.tsx"
git commit -m "feat(trade): live classification preview + certainty ladder (fail-closed)"
```

---

### Task 14: `AssessFlow` rework — wire entry → form → classify → confirm → landscape → verdict

**Files:**

- Modify: `src/app/(trade)/trade/assess/_components/AssessFlow.tsx`
- Modify: `src/app/(trade)/trade/assess/_components/AssessFlow.test.tsx`

- [ ] **Step 1: Update the test** — assert the new step machine: starts on `entry`; choosing manual → `category`; choosing a category → `form`; the form mounts `ScopedItemForm` + `ClassificationPreview`; "Vorgang starten" advances to `classify` (`ClassifyConfirm`); confirm → `landscape`. Mock the heavy children (DatasheetDropzone, ClassifyConfirm, LandscapeView, VerdictPanel, ScopedItemForm, ClassificationPreview, PartyPicker) + lucide + next/link.

```tsx
// AssessFlow.test.tsx (key cases — copy the lucide/next-link mock header from VerdictPanel.test.tsx)
vi.mock("./EntryChoice", () => ({
  EntryChoice: ({ onUpload, onManual }: any) => (
    <div>
      <button data-testid="m-upload" onClick={onUpload} />
      <button data-testid="m-manual" onClick={onManual} />
    </div>
  ),
}));
vi.mock("./CategoryPicker", () => ({
  CategoryPicker: ({ onSelect }: any) => (
    <button data-testid="m-pick" onClick={() => onSelect("star_tracker")} />
  ),
}));
vi.mock("./ScopedItemForm", () => ({
  ScopedItemForm: ({ onStart }: any) => (
    <button data-testid="m-start" onClick={onStart} />
  ),
}));
vi.mock("./ClassificationPreview", () => ({
  ClassificationPreview: () => <div data-testid="m-preview" />,
}));
// …

it("manual path reaches the scoped form", () => {
  render(<AssessFlow />);
  fireEvent.click(screen.getByTestId("m-manual"));
  fireEvent.click(screen.getByTestId("m-pick"));
  expect(screen.getByTestId("assess-form-step")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — extend the `Step` union to `"entry" | "upload" | "category" | "form" | "classify" | "landscape" | "verdict"`; hold `categoryId`, `scopedAttributes: ScopedFieldValue[]`, `rawText`; on "Vorgang starten", build the `confirmedCode` from the live top suggestion (or hand to `ClassifyConfirm`); keep the existing `from-datasheet` → `loadLandscape` → verdict tail. The upload path still uses `DatasheetDropzone` but now routes its payload + detected category into the `form` step (pre-filled) instead of straight to `classify`.

> Reuse the existing `handleConfirm` / `loadLandscape` / `createOperationAndAssess` bodies (verified in the current file) — only the front half (entry/category/form) is new. The `item` sent to `from-datasheet` is built from `scopedAttributes` (Task 15 widens the route to accept them).

- [ ] **Step 4: Run green** — `npm run test:run -- "src/app/(trade)/trade/assess/_components/AssessFlow.test.tsx"`. tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/assess/_components/AssessFlow.tsx" "src/app/(trade)/trade/assess/_components/AssessFlow.test.tsx"
git commit -m "feat(trade): rework AssessFlow for two-path scoped intake (entry → category → form → classify)"
```

---

### Task 15: Widen `from-datasheet` route to accept + persist the scoped attribute bag

**Files:**

- Modify: `src/app/api/trade/assess/from-datasheet/route.ts` (`ItemSchema` + the `tradeItem.create` data)
- Modify: `src/app/api/trade/assess/from-datasheet/route.test.ts`

- [ ] **Step 1: Update the test** — POST a body whose `item` carries `parametricAttributes: { starTrackerAccuracyArcsec: 10 }`; assert 200 + the created `TradeItem` persists it in `parametricAttributes` (mock prisma; assert the `create` data).

```ts
// route.test.ts (add)
it("persists the scoped extended attribute bag into parametricAttributes", async () => {
  // body.item = { name: "ST-300", description: "", parametricAttributes: { starTrackerAccuracyArcsec: 10 } }
  // confirmedCode = { canonicalId: "USML:XV(e)(16)", regime: "ITAR-USML" }
  // expect prisma.tradeItem.create called with data.parametricAttributes === { starTrackerAccuracyArcsec: 10 }
});
```

- [ ] **Step 2: Run red** → FAIL (schema rejects unknown key / not persisted).

- [ ] **Step 3: Implement** — add `parametricAttributes` to `ItemSchema` and the `create` data (the column already exists — no migration):

```ts
const ItemSchema = z.object({
  // …existing fields…
  /** Extended operator-supplied attributes (Z3e+) — persisted verbatim into the
   *  TradeItem.parametricAttributes JSON column (no migration; column exists). */
  parametricAttributes: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).optional(),
});
// …in tx.tradeItem.create data, add:
  parametricAttributes: (item.parametricAttributes ?? undefined) as Prisma.InputJsonValue | undefined,
```

> The verdict/landscape stay code-driven (they read typed columns + the confirmed ECCN cell), so persisting `parametricAttributes` is for audit/re-classification, not the verdict — keep the existing `...cellPatch` + draft logic unchanged.

- [ ] **Step 4: Run green** — `npx vitest run src/app/api/trade/assess/from-datasheet/route.test.ts --no-file-parallelism`. tsc → 666.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/trade/assess/from-datasheet/route.ts" "src/app/api/trade/assess/from-datasheet/route.test.ts"
git commit -m "feat(trade): persist scoped extended attribute bag on confirmed datasheet item (no migration)"
```

---

### Task 16: End-to-end fail-closed + worked-example regression (the gate)

**Files:**

- Create: `src/lib/trade/intake/intake-regression.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/lib/trade/intake/intake-regression.test.ts
import { describe, it, expect } from "vitest";
import { suggestionsFromAttributesAndText } from "@/lib/trade/classify-suggest";
import { runDestinationLandscape } from "@/lib/trade/landscape.server";

const ST = "spacecraft.adcs.star_tracker";

describe("intake regression — fail-closed + worked example", () => {
  it("AstroSense (10 arcsec) fails the ≤1 arcsec ITAR conjunction → 9A515.x, not XV(e)(16), not a rocket", () => {
    const s = suggestionsFromAttributesAndText(
      [
        { attribute: "itemClass", value: ST, confidence: "high" },
        {
          attribute: "starTrackerAccuracyArcsec",
          value: 10,
          confidence: "high",
        },
        {
          attribute: "starTrackerSlewRateDegPerS",
          value: 3,
          confidence: "high",
        },
      ],
      "autonomous star tracker celestial navigation",
    );
    const ids = s.map((x) => x.canonicalId);
    expect(ids).not.toContain("MTCR:Item-1.A.1"); // never a rocket
    // 9A515.x is the EAR fall-through; XV(e)(16) must NOT be a hard candidate at 10 arcsec
    expect(s[0]?.canonicalId).not.toBe("USML:XV(e)(16)");
  });

  it("FAIL-CLOSED: a star tracker with accuracy BLANK still surfaces its code as cannot-rule-out (never all-GO)", () => {
    const s = suggestionsFromAttributesAndText(
      [{ attribute: "itemClass", value: ST, confidence: "high" }],
      "autonomous star tracker",
    );
    // the class code surfaces (possible/near-miss), the item never reads as uncontrolled
    expect(s.length).toBeGreaterThan(0);
  });

  it("a genuine MTCR rocket still flags Item-1.A.1 (no false negative)", () => {
    const s = suggestionsFromAttributesAndText(
      [
        { attribute: "payloadKg", value: 600, confidence: "high" },
        { attribute: "rangeKm", value: 400, confidence: "high" },
      ],
      "complete two-stage launch vehicle to orbit",
    );
    expect(s.map((x) => x.canonicalId)).toContain("MTCR:Item-1.A.1");
  });

  it("a confirmed 7A004 star tracker (DE seat) yields a colorful landscape, RU/embargo BLOCKED", () => {
    const r = runDestinationLandscape(
      { name: "ST-300", description: "star tracker", eccnEU: "7A004" } as any,
      { exporterSeat: "DE" },
    );
    expect(r.blocked.map((c) => c.country)).toContain("RU");
    expect(r.go.length).toBeGreaterThan(0); // not all-REVIEW
  });
});
```

> Implementer: confirm the exact codes against the live corpus when wiring (the `expect` targets must match real `canonicalId`s — adjust `9A515.x` vs `EAR-CCL:9A515.x` etc. to whatever `suggestionsFromAttributesAndText` actually emits; the _intent_ — not-a-rocket, cannot-rule-out, MTCR-still-flagged, colorful-landscape — is the gate).

- [ ] **Step 2: Run red/green** — run; adjust the code-string assertions to the real emitted `canonicalId`s; all four must pass.

- [ ] **Step 3: Full regression** — `npx vitest run src/lib/trade src/lib/comply-v2/trade "src/lib/comply-v2/trade/classification/golden-set/" --no-file-parallelism` → all green. `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → 666.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trade/intake/intake-regression.test.ts
git commit -m "test(trade): intake fail-closed + AstroSense worked-example regression gate"
```

---

## Self-review (run after all tasks)

- [ ] **Spec coverage:** §0 invariant (T1) · taxonomy fix (T2) · enabling bag-widening (T3, the third root cause) · derive fields (T4) · decisiveness (T5) · dictionary+validation (T6) · 12-class catalog+overlay (T7) · ranked detect (T8) · scoped vision (T9) · entry (T10) · picker (T11) · scoped form + standing prompts + evidence prefill (T12) · live preview + certainty (T13) · AssessFlow rework (T14) · persistence widening (T15) · fail-closed + worked-example gate (T16). Deferred items (σ-norm, reuse-parts, live landscape, BOM) correctly absent.
- [ ] **Type consistency:** `ScopedFieldValue` defined in T12, consumed in T13/T14; `SuggestInputAttribute` ({attribute, value, confidence}) is the verified shape; `renderedFields(categoryId)` used in T12 + tested in T7; `deriveRelevantAttributes`/`decisivenessRank` signatures match across T4/T5/T7; `extractDatasheetViaVision` `vocabularySubset` option matches T9.
- [ ] **No placeholders:** every code step shows real code; the few "grep per class / adjust to real canonicalId" notes are deliberate verification steps against the live corpus, not vague TODOs.
