# Caelex Trade — Parametric Classification Moat: Architecture Overview

**Status:** Live in production (May 22, 2026 — Z3a through Z3r shipped).
**Purpose:** Single-page reference for anyone resuming work on the parametric
classification engine. Read this before touching any file in
`src/lib/comply-v2/trade/classification/`, `src/lib/trade/`, or
`src/app/(trade)/trade/items/_components/`.

---

## 1. Why this exists (the moat)

No incumbent in the dual-use compliance space — Descartes, AEB, SAP GTS,
OpenSanctions — encodes **parametric thresholds** as predicates against typed
item attributes. They all do string-based ECCN lookups. Caelex Trade does
ECCN derivation from product specs:

| Product spec                                                      | Predicate                              | Matches                                                                 |
| ----------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `apertureMeters: 0.4` + `itemClass: spacecraft.remote_sensing.eo` | aperture ∈ [0.35, 0.50] + class prefix | **9A515.a.1** (CCL) AND **USML XV(a)(7)(i)** by Order-of-Review overlap |
| `IspSeconds: 1500` + `propulsion.electric` + SD=true              | Isp ≥ 1000 + class + SD                | **9A515.x EP**                                                          |
| `totalImpulseNs: 1.2e6` + `propulsion.chemical.solid_rocket`      | impulse ≥ 1.1×10⁶                      | **USML IV(d)(2)** (MTCR Cat I)                                          |
| 5 rad-hard criteria all met                                       | TID + SEU + neutron + LET + dose-rate  | **9A515.d** (rad-hard IC, all 5) vs **9A515.e** (TID only)              |

This is what makes the product defensible.

---

## 2. The 6-layer engine chain

```
                                 USER
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  L6: UI Panel (ParametricMatcherPanel)   │ ← Z3n + Z3r
              │      /trade/items/[id]                   │
              │      - Candidate cards w/ confidence     │
              │      - PossibleMatch (UNKNOWN) section   │
              │      - Near-miss (single-refute) section │
              │      - Top-of-panel see-through banner   │
              └──────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  L5: Bridge Service                      │ ← Z3l
              │      classifyTradeItemParametric()       │
              │      - Marshals TradeItem snapshot       │
              │      - Pure function, no I/O             │
              └──────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  L4: Matcher Engine                      │ ← Z3c, Z3f, Z3k
              │      matchAgainstCrossWalk()             │
              │      - Three-valued logic (true/false/   │
              │        UNKNOWN — Z3f)                    │
              │      - Four result lanes:                │
              │         * candidates (full match)        │
              │         * possibleMatches (UNKNOWN)      │
              │         * nearMisses (1 refute, Z3k)     │
              │         * empty-bag suppression          │
              │      - Confidence: HIGH/MEDIUM/LOW       │
              │      - Boundary detection (1% tolerance) │
              └──────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  L3: Cross-Walk Data                     │ ← Z3b, Z3d, Z3h-Z3m, Z3q
              │      CONTROL_LIST_CROSS_WALK             │
              │      - 22 entries (USML, CCL, EU, MTCR)  │
              │      - Predicates: lt/lte/gt/gte/eq/     │
              │        between/prefix/in                 │
              │      - seeAlso graph (analogous,         │
              │        predecessor, components_of, ...)  │
              │      - reasonsForControl, license excs.  │
              │      - notes field with regulatory       │
              │        warnings (see-through detection)  │
              └──────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  L2: Schema                              │ ← Z3a, Z3e, Z3g
              │      TradeItem (Prisma)                  │
              │      - 14 Z3a tier-1 typed columns       │
              │      - 14 Z3e extended columns           │
              │      - 1 Z3g isSpeciallyDesigned         │
              │      - parametricAttributes JSON catch-  │
              │        all for one-off attributes        │
              └──────────────────────────────────────────┘

           ─────── PARALLEL PROPAGATION LAYER ───────

              ┌──────────────────────────────────────────┐
              │  P2: BOM Orchestrator                    │ ← Z3p
              │      classifyBOM(parent, children)       │
              │      - Calls L5 on every node            │
              │      - Maps regime → jurisdiction tag    │
              │      - Calls P1 to propagate             │
              └──────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │  P1: See-Through Engine                  │ ← Z3o
              │      propagateSeeThroughITAR()           │
              │      - ITAR + EU_ANNEX_IV → propagate    │
              │      - EAR/MTCR/EU dual-use/Wassenaar    │
              │        do NOT propagate                  │
              │      - UNKNOWN never propagates          │
              │      - Audit trail emitted               │
              └──────────────────────────────────────────┘
```

---

## 3. File layout

```
src/lib/comply-v2/trade/classification/
├── control-list-cross-walk.ts    L3 — 22 entries, types, helpers
├── parametric-matcher.ts          L4 — three-valued matcher
└── parametric-matcher.test.ts     81 cases

src/lib/trade/
├── item-parametric-classification.ts  L5 — bridge
├── see-through-propagation.ts         P1 — propagation
├── bom-classification.ts              P2 — orchestrator
└── *.test.ts                          43 cases

src/app/(trade)/trade/items/
├── [id]/page.tsx                      Wires panel into item-detail page
└── _components/
    ├── ParametricMatcherPanel.tsx     L6 — UI panel + see-through banner
    └── ClassificationPanel.tsx        (Z3-series-independent, license
                                        determination only)

prisma/migrations/
├── 20260520...trade_item_parametric/  Z3a — 14 columns
└── 20260522230000_extend_trade_item_  Z3e — 15 columns
    parametric_attrs_z3e/
```

---

## 4. Type system at a glance

```ts
// L3 — cross-walk
type RegimeName = "EAR-CCL" | "ITAR-USML" | "EU-ANNEX-I"
                  | "DE-AL-TEIL-IB" | "MTCR-ANNEX" | "WASSENAAR"
                  | "NSG" | "OTHER";

type AttributeName = (14 Z3a) | (14 Z3e) | (1 Z3g);
                   // ⊂ keys of TradeItem typed columns
                   // | keys in parametricAttributes JSON catchall

type PredicateOp = "lt" | "lte" | "gt" | "gte" | "eq"
                 | "between" | "prefix" | "in";

type CrossWalkRelationship =
  "analogous" | "predecessor" | "successor"
  | "superset_of" | "subset_of"
  | "derived_from" | "components_of";    // Z3i added components_of

// L4 — matcher
interface MatcherResult {
  candidates: CandidateMatch[];          // full matches, confidence-ranked
  possibleMatches: PossibleMatch[];      // unknown-attribute partials
  nearMisses: NearMissMatch[];           // single-refute almost-matches
  noAttributesPopulated: boolean;        // empty-bag prompt
  disclaimer: string;
}

// P1 — see-through
type JurisdictionTag = "ITAR" | "EAR" | "EU_DUAL_USE" | "EU_ANNEX_IV"
                     | "MTCR" | "WASSENAAR" | "UNKNOWN";

// P2 — orchestrator
interface BOMClassificationResult {
  parent: NodeClassification & {
    finalJurisdictions: JurisdictionTag[];     // post see-through
    seeThroughTrail: PropagationEvent[];
    itarInherited: boolean;
  };
  children: NodeClassification[];
  disclaimer: string;
}
```

---

## 5. Regulatory boundaries encoded

All quantitative tripwires from the May 2026 ontology research blueprint § 5 + § 8:

| Boundary                        | Encoding                                  | Test      |
| ------------------------------- | ----------------------------------------- | --------- |
| Aperture 0.50 m (USML vs CCL)   | USML lt 0.50 / CCL between [0.35, 0.50]   | Z3c + Z3d |
| SEU 1×10⁻¹⁰ (9A515.d crit 4)    | seuRateErrorsPerBitDay lte 1e-10          | Z3d       |
| MTCR Cat I (300 km × 500 kg)    | rangeKm gte 300 + payloadKg gte 500       | Z3d       |
| Total impulse 1.1×10⁶ N·s       | totalImpulseNs gte 1.1e6                  | Z3d       |
| Spectral SWIR boundary          | peakWavelengthNm gte ~900                 | Z3d       |
| SAR bandwidth 300 MHz           | radarBandwidthMhz between [50, 300] (CCL) | Z3d       |
| Star-tracker dual threshold     | arcsec ≤ 1 AND slewRate ≥ 3 deg/s         | Z3d       |
| Antenna 5 m diameter            | antennaDiameterM gte 5                    | Z3d       |
| EP Isp ≥ 1000 s                 | IspSeconds gte 1000                       | Z3c       |
| Rad-hard 5 conjunctive criteria | All 5 columns gte their thresholds        | Z3d       |
| Specially-designed catch-alls   | isSpeciallyDesigned eq true               | Z3g       |
| CMG vs reaction-wheel           | itemClass prefix discrimination           | Z3h       |
| Civilian vs military TT&C       | isSpeciallyDesigned bifurcation           | Z3g + Z3j |
| Hosted payload XV(e)(17)        | itemClass + SD true                       | Z3m       |
| ITAR see-through § 123.1(b)     | Propagation engine                        | Z3o       |

---

## 6. The 22 cross-walk entries

By regime:

**USML (ITAR)** — 9 entries

- XV(a)(7)(i) — high-res EO spacecraft (< 0.50 m)
- XV(a)(8) — wide-bandwidth SAR spacecraft
- XV(b) — military TT&C ground station (SD=true)
- XV(e)(1) — large-aperture antenna ≥ 5 m
- XV(e)(11)(iv) — anti-jam GNSS receiver via XV(e)
- XV(e)(13) — Control Moment Gyros (Z3h, NOT reaction wheels)
- XV(e)(16) — star tracker (dual-threshold)
- XV(e)(17) — hosted payload performing XV(a) function (Z3m)
- IV(d)(2) — rocket motors at MTCR Cat I (≥ 1.1×10⁶ N·s)
- IV(d)(3) — rocket motors at MTCR Cat II
- XII (anti-jam GNSS sub-paragraph from 2024 IFR)

**CCL (EAR)** — 7 entries

- 9A515.a.1 — sensitive EO spacecraft (0.35-0.50 m)
- 9A515.a.2 — SWIR/MWIR/LWIR spacecraft (peak λ ≥ 900 nm)
- 9A515.a.3 — SAR spacecraft (BW ≤ 300 MHz)
- 9A515.a.4 — OSAM spacecraft (in-space servicing)
- 9A515.b — civilian TT&C ground station (Z3j, SD=false)
- 9A515.d — rad-hard ICs (5 conjunctive criteria)
- 9A515.e — TID-only rad-hard catch-all
- 9A515.g — components for 9A515.a.1-.a.4 (Z3i, SD=true)
- 9A515.x-ep — electric propulsion (Isp ≥ 1000, SD=true)
- 9A515.x-rw — reaction wheels (Z3g, SD=true)

**EU Annex I** — 2 entries

- 9A004 — spacecraft generic (any spacecraft itemClass)
- 9A005 — liquid rocket engines (Z3q)

**MTCR** — 1 entry

- Item 1.A.1 — complete launch vehicles (300 km × 500 kg)

---

## 7. How three-valued logic works (Z3f, critical)

Per ontology research § 14: "an unknown SEU rate must NOT silently classify
a rad-hard FPGA as below-threshold."

```
For each entry:
  For each predicate:
    Read attribute from item bag
    ┌─ NULL/undefined  → collect into unknownPredicates, continue
    ├─ matches         → collect into matchedPredicates, continue
    └─ refutes         → collect into refutedPredicates, continue

  After scanning:
    matched=0                                  → drop entry (refute)
    matched≥1 + refuted=1 + unknown=0          → emit as nearMiss (Z3k)
    matched≥1 + refuted≥2                      → drop entry (refute)
    matched≥1 + refuted≥1 + unknown≥1          → drop entry (mixed signals)
    matched≥1 + refuted=0 + unknown=0          → emit as candidate
    matched≥1 + refuted=0 + unknown≥1          → emit as possibleMatch
```

**Operator UX consequence:** an unpopulated `seuRateErrorsPerBitDay` does
NOT cause 9A515.d to silently drop. It surfaces as a PossibleMatch saying
"populate seuRateErrorsPerBitDay to confirm classification" — exactly what
the regulator's intent demands.

---

## 8. When to add a new cross-walk entry

Before adding, ask:

1. **Is the regulatory boundary parametric?** If it's purely qualitative
   (e.g. "designed for military use"), the existing `isSpeciallyDesigned`
   boolean is the right hook — don't add a new typed column.

2. **Does the entry need a new typed column?** Adding a typed column is
   a schema migration (high cost). Try `parametricAttributes` JSON first.

3. **Does it overlap with an existing entry?** USML XV(a)(7)(i) and
   ECCN 9A515.a.1 overlap on [0.35, 0.50] aperture by **regulatory
   design** — they should both match, and the operator resolves via
   Order-of-Review. Don't deduplicate.

4. **Does it need a see-through warning?** If yes, include "see-through",
   "§ 123.1(b)", or "retransfer" in the `notes` field. The Z3r banner
   detects these phrases automatically.

---

## 9. Open work (sprints NOT yet shipped)

| Sprint                          | Scope                            | Why deferred                 |
| ------------------------------- | -------------------------------- | ---------------------------- |
| Z3n recursive (multi-level BOM) | Multi-level see-through walking  | Needs `TradeBomEdge` schema  |
| Z4 AI Copilot                   | Datasheet → matcher integration  | 3-4 sprints, separate effort |
| Z5 BAFA ELAN-K2 XML             | Electronic-filing serializer     | 2-3 sprints, low priority    |
| Z6 PDF templates                | BAFA C1/C6/C7 EUC PDF            | 3-4 sprints, low priority    |
| Z11 SAG lifecycle               | Sammelgenehmigung workflows      | 3-4 sprints, big             |
| Z12 BOM de minimis              | Bill-of-materials de minimis     | 2 sprints, needs BOM schema  |
| Z13 Deemed export               | Nationality-aware access control | 3 sprints, big               |

---

## 10. Resume points after compact

If you're a future Claude session resuming work:

1. Read this doc top-to-bottom (15 minutes).
2. Check `git log --oneline --since=7.days | grep -E "Z3"` to see latest matcher commits.
3. Run `npx vitest run src/lib/comply-v2/trade src/lib/trade` — should be 800+ tests green.
4. The next 1-sprint moat extensions worth considering:
   - 9A515.f (software for 9A515.a-.g)
   - Wassenaar Cat 7 entries (encryption GNSS)
   - USML XV(e)(20) (high-precision reaction wheels still on USML)
   - Server action to persist matcher's chosen candidate as `TradeItem.eccnUS/eccnEU`

5. **Do NOT** start a recursive BOM walk without first landing the schema
   (`TradeBomEdge` model). The Z3p orchestrator is intentionally
   single-level for this reason.

---

**Last updated:** 2026-05-22 (after Z3r ship).
**Maintainer:** Caelex engineering. Update when any matcher-touching sprint lands.
