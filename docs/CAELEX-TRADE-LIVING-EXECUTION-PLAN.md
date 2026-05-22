# Caelex Trade — Living Execution Plan

## Master backlog for completing the product per all three research blueprints

> **Purpose.** This is the single source of truth for what remains to be built in
> Caelex Trade, structured so that any future Claude session — even after a full
> context compact — can resume work, pick the next sprint, and execute it without
> re-deriving priorities from code or research docs.
>
> **Cadence.** Every shipped sprint moves from `OPEN` to `SHIPPED` in § 4. The
> commit that ships a sprint must also update this file in the same push.
>
> **Authority order** (when guidance conflicts):
>
> 1. User direct instructions
> 2. CLAUDE.md (project conventions, deploy policy)
> 3. This document
> 4. The three research blueprints (§ 2)
> 5. The Z3-series Living Roadmap (`CAELEX-TRADE-LIVING-ROADMAP.md`) — superseded for execution priorities but still authoritative for Z3-series sprint details
> 6. The moat architecture doc (`CAELEX-TRADE-MOAT-ARCHITECTURE.md`) — describes the engine, NOT the backlog
>
> **Last updated.** 2026-05-22 — **Tier 1 complete** (9/9) AND **Tier 2
> complete** (7/7) AND **Tier 3 ~64% done** (7 of 11: Z23a/b, Z24a/b,
> Z25, Z26 shipped — Z24c/d, Z27, Z28 still open) AND **Tier 4 ~75%
> done** (3 of 4: Z30 DCS Generator, Z31 AUKUS Overlay, Z32 Recordkeeping
> Retention shipped — Z29 Supplement No. 2 still open) AND **Tier 5
> partial** (Z6 EU EUC Annex IIIa template shipped). Total: **871 trade
> tests passing** across 41 test files. Batch 9 closes much of the
> mid-stack — only Z24c/d (deferred after policy filter), Z27, Z28, Z29,
> Z6b-d VSD, Z9, Z11, Z12, Z16 remain in the queue.

---

## 1. Status snapshot

### 1.1 Live in production at www.caelex.eu

| Surface                                                                                                                                      | Sprints           | Test count                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items list + detail (multi-jurisdiction ECCN/USML/MTCR/DE-AL classification)                                                                 | A1                | covered in classification-pipeline.test                                                                                                                                     |
| Counterparty list + detail (6-list sanctions + 50% Rule Cascade + BIS Affiliate Rule)                                                        | A2 + B1 + B2 + D2 | covered in screening tests                                                                                                                                                  |
| Operations pipeline (catch-all triggers, license determination, license stack)                                                               | A3 + B3 + D4 + D5 | catch-all-evaluator.test, property-trigger-engine.test                                                                                                                      |
| Licenses tracking + expiry cron + reminders                                                                                                  | A4 + C1           | license-reminder-service.test                                                                                                                                               |
| Compliance Program (7 sections, editable for MANAGER+)                                                                                       | E3                | program-service.test                                                                                                                                                        |
| End-Use Certificates (EUC) full lifecycle + expiry cron                                                                                      | E5a–e             | euc-service.test + euc-reminder-service.test                                                                                                                                |
| Re-Export Consents full lifecycle + expiry cron                                                                                              | E4a–d             | reexport-service.test + reexport-reminder-service.test                                                                                                                      |
| Voluntary Self-Disclosures (VSD) + Deadline-Cron (OFAC/BIS/DDTC clocks)                                                                      | E1a–c + W1        | vsd-service.test + vsd-deadline-service.test                                                                                                                                |
| `/trade` dashboard (Compliance Health summary)                                                                                               | X1 + X2           | —                                                                                                                                                                           |
| Cross-links counterparty/operation → EUC/Re-Export/VSD                                                                                       | Y1+Y2+Y3          | —                                                                                                                                                                           |
| Email templates (license expiry, sanctions hit, catch-all, blocked, welcome)                                                                 | E2                | —                                                                                                                                                                           |
| License Exception Matrix (BIS STA/ENC/CSA/GOV/TMP + BAFA AGG-12/27 + EUGEA EU001)                                                            | B3 + D3           | license-exception-matrix.test (35)                                                                                                                                          |
| § 9(1) AWV nuclear catch-all (9 countries)                                                                                                   | Z1                | catch-all-evaluator.test                                                                                                                                                    |
| EU Annex IV (Reg. 833/2014 Art. 2b) as 7th sanctions layer + PROHIBITED gate                                                                 | Z2 + Z2b          | eu-annex-iv.test (17)                                                                                                                                                       |
| § 9(2) AWV military-end-use catch-all (19 arms-embargo countries)                                                                            | Z10               | catch-all-evaluator.test (45)                                                                                                                                               |
| **Parametric Cross-Walk Matcher** — 24 entries, three-valued logic, see-through propagation, BOM orchestrator, UI panel + see-through banner | Z3a–Z3v           | parametric-matcher.test (95) + see-through-propagation.test (13) + bom-classification.test (15) + item-parametric-classification.test (15) + cross-walk-integrity.test (17) |
| ICP 2019/1318 seven-element mapping + BAFA SAG-eligibility threshold                                                                         | Z8                | icp-mapping-service.test (25)                                                                                                                                               |

**Total Vitest count:** 839+ trade tests passing.

### 1.2 The MVP-wedge gap (per Blueprint 1 TL;DR)

Blueprint 1 defines the smallest defensible MVP as **four pillars**:

1. ✅ Space-aware catch-all reasoning — DONE (Z1, Z10, Z2b)
2. ✅ Annex IV / MEU / Entity-List screening — DONE (Z2, D2, B1, B2)
3. ❌ **AI-assisted classification** — Engine + UI shipped (Z3); **PDF-Datasheet-Extractor missing** (Z4)
4. ❌ **BAFA ELAN-K2 integration** — completely missing (Z5)

Plus: blueprints 2 and 3 surface additional structural gaps not in blueprint 1's stage tables.

---

## 2. Reference documents

All three drive this plan. Read in priority order on resume.

| Doc                                                                                    | Path                                                                                    | What it gives you                                                                                                                   |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Blueprint 1 — Master (Caelex Trade Exhaustive Export Control Research)**             | `~/Downloads/compass_artifact_wf-3ca00b32-3e99-4be3-81f9-1278d9556f31_text_markdown.md` | Stage 1–3 sprint inventory; cross-walk product class table; data feeds; competitive landscape                                       |
| **Blueprint 2 — US Re-Export Controls**                                                | `~/Downloads/compass_artifact_wf-f1aff0e0-2ada-495c-8ad9-dab834adbd1a_text_markdown.md` | Three-Gate Cascade Engine spec; 9 § 734.4(a) hard carve-outs; 8 FDPR scenarios; data model; knowledge predicates                    |
| **Blueprint 3 — Ontology**                                                             | `~/Downloads/compass_artifact_wf-faf43728-c684-4c64-b847-607d992e1fe0_text_markdown.md` | Full parametric attribute vocabulary; complete USML XV / Annex I Cat 9 / DE AL enumerations; Annex-I suffix-digit correlation logic |
| **Z3-series Living Roadmap** (superseded for priorities, authoritative for Z3 details) | `docs/CAELEX-TRADE-LIVING-ROADMAP.md`                                                   | Z1-Z16 sprint specs                                                                                                                 |
| **Moat Architecture**                                                                  | `docs/CAELEX-TRADE-MOAT-ARCHITECTURE.md`                                                | 6-layer engine reference; type system; regulatory boundary table                                                                    |
| **CLAUDE.md**                                                                          | `CLAUDE.md`                                                                             | Project conventions; deploy policy (6-8 commit batches); design system                                                              |

---

## 3. The prioritized backlog

Sprints are grouped into **6 tiers**. Pick from Tier 1 first; only descend tiers when the higher tier is empty.

### Sequencing rationale

- **Tier 1** closes the **catastrophic Compliance gap** Blueprint 2 identifies (the 9x515-to-D:5 0% trap). A European space exporter with US-content shipped to China is currently NOT correctly classified. This is the highest-cost-of-mistake gap.
- **Tier 2** closes the **MVP-wedge gap** Blueprint 1 identifies (AI Copilot + ELAN-K2).
- **Tier 3** widens the **moat** per Blueprint 3 (ontology depth).
- **Tier 4** adds **operational workflows** that productize what Tiers 1-3 expose.
- **Tier 5** is **Stage-2 product expansion** (SAG lifecycle, BOM-de-minimis, etc.).
- **Tier 6** is **Stage-3 moat extension** and **future phases**.

---

## 4. Sprint cards

Each card is **self-contained** — the prompt that goes into a new Claude session.

### TIER 1 — Subject-to-the-EAR Three-Gate Cascade (Blueprint 2)

#### Z18 — Three-Gate Cascade Orchestrator

**Status:** OPEN
**Size:** 1-2 sprints
**Blocks:** Z19 (recommended to ship Z19 first as the table; Z18 composes)
**Why:** Blueprint 2 § TL;DR mandates a strict sequential cascade (ITAR → FDPR → De-Minimis) with stop-on-first-hit. We have all three engines as standalone modules but no orchestrator.

**Input:**

```ts
interface SubjectToEARInput {
  transaction: {
    destinationCountry: string;       // ISO-2
    endUser: { name, country, parentChain, entityListFootnote, ... };
    endUse: "civilian" | "military" | "advanced-computing" | ...;
    knowledgeFacts: KnowledgeFactSet;   // see Z20
    transactionParties: Party[];
  };
  endItem: { name, foreignEccnIfSubjectToEar, totalValueEur, manufacturerCountry };
  bom: BOMComponent[];                  // see § 9.2 of Blueprint 2
}
```

**Output:**

```ts
interface SubjectToEARResult {
  jurisdiction: "ITAR" | "EAR" | "NONE";
  subjectToEar: boolean;
  gateFired:
    | "ITAR_SEE_THROUGH"
    | "FDPR"
    | "DE_MINIMIS_CARVE_OUT"
    | "DE_MINIMIS_PERCENTAGE"
    | "NONE";
  fdprApplicable?: boolean;
  fdprRuleId?: string;
  deMinimisPassed?: boolean;
  appliedThresholdPercent?: number;
  rationale: string[];
  evidence: { source; url }[];
  obligations: { oneTimeDeMinimisReport; recordkeepingYears; dcsRequired };
  disclaimer: string;
}
```

**Files to create:**

- `src/lib/trade/subject-to-ear/cascade.ts` — main orchestrator
- `src/lib/trade/subject-to-ear/types.ts` — shared interfaces
- `src/lib/trade/subject-to-ear/cascade.test.ts`

**Files to consume:**

- `src/lib/trade/see-through-propagation.ts` (Z3o)
- `src/lib/comply-v2/trade/de-minimis-calculator.ts` (B5)
- `src/lib/trade/subject-to-ear/no-de-minimis-carve-outs.ts` (Z19)
- `src/lib/trade/subject-to-ear/fdpr-engine.ts` (Z20)

**Decision logic (verbatim from Blueprint 2 § 9.1):** stop on Gate 1; stop on Gate 2; only reach Gate 3 if both pass; OR them.

**Tests:** Blueprint 2 § 9.3 Examples A-F cover the canonical cases (EU sat with 9A515.d to PRC → DENY via FDPR + carve-out; same to Brazil → outside EAR; FDP at 0% physical content; etc.).

**Acceptance:** All 6 worked examples produce the documented outcome.

---

#### Z19 — § 734.4(a) Hard Carve-Out Table

**Status:** OPEN
**Size:** 1 sprint
**Blocks:** Z18 (the orchestrator consumes this)
**Why:** Blueprint 2 § 4 enumerates 9 numbered "no de minimis" traps in § 734.4(a). The most important — § 734.4(a)(6)(i) — is the catastrophic 9x515 .a-.x to D:5 = 0% threshold. Current `de-minimis-calculator.ts` has only 25%/10% generic thresholds and does NOT model these carve-outs.

**Input:**

```ts
interface NoDeMinimisCheckInput {
  bom: BOMComponent[]; // with us_origin, eccn, fair_market_value
  destinationCountry: string; // ISO-2
  countryGroups: Set<string>; // resolved D:5, E:1, E:2 etc.
}
```

**Output:**

```ts
interface NoDeMinimisCheckResult {
  hit: boolean;
  matchingCarveOutId?: "734.4(a)(1)" | "734.4(a)(2)" | ... | "734.4(a)(9)";
  matchingComponentNodeIds: string[];
  rationale: string;
  evidence: { cfr, url };
}
```

**The 9 carve-outs to encode (verbatim from § 4 of Blueprint 2):**

| ID            | Trap                                                                                    | Trigger condition                                                                                |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| (a)(1)        | Foreign computers > 4A003.b APP + 3A001 semis to Computer Tier 3                        | 4A003.b above APP + US 3A001 + Tier-3 destination                                                |
| (a)(2)        | Foreign encryption tech incorporating 5E002                                             | Any value of 5E002 in foreign encryption tech, anywhere                                          |
| (a)(3)        | 3B993.f.1 advanced-node IC fab to Macau/D:5                                             | 3B993.f.1 + Cat 3/4/5 IC content + Macau or D:5                                                  |
| (a)(4)        | 9E003.a.1-.6, .a.8, .h, .i, .l → no de minimis anywhere                                 | Any value of these 9E003 sub-paragraphs commingled abroad                                        |
| (a)(5)        | Military commodities with 0A919.a.1 to D:5                                              | 0A919.a.1 incorporation + D:5 destination                                                        |
| **(a)(6)(i)** | **9x515/600-series .a-.x → D:5 = 0%**                                                   | **THE CATASTROPHIC SPACE TRAP** — any non-zero 9x515 or 600-series .a-.x value + D:5 destination |
| (a)(6)(ii)    | 9x515/600-series .y → E:1/E:2/Belarus/PRC/Russia = 0%                                   | .y content + named destinations                                                                  |
| (a)(7)        | OFAC overrides (Cuba/Iran)                                                              | OFAC-listed destination                                                                          |
| (a)(8)        | 3B001.a.4/.c/.d/.f.1/.f.5/.f.6/.k-.n/.p.2/.p.4/.r OR 3B002.c + Cat 3/4/5 IC + Macau/D:5 | Specific 3B parameters                                                                           |
| (a)(9)        | Other 3B parameters to Macau/D:5                                                        | The "other 3B Footnote-5 FDP zero-threshold trap"                                                |

**Files to create:**

- `src/lib/trade/subject-to-ear/no-de-minimis-carve-outs.ts` (data + checker)
- `src/lib/trade/subject-to-ear/no-de-minimis-carve-outs.test.ts`

**Tests:** Each carve-out has a positive case (fires) + negative case (doesn't fire because destination is wrong or ECCN doesn't match). Plus the canonical 9A515.d to PRC case.

**Acceptance:** Blueprint 2 Example A (EU sat with 9A515.d to PRC) returns hit=true with matchingCarveOutId="734.4(a)(6)(i)".

---

#### Z20 — FDPR 8 Scenarios + Knowledge Predicates

**Status:** OPEN
**Size:** 2-3 sprints
**Blocks:** Z18 (the orchestrator consumes this)
**Why:** Blueprint 2 § 3 enumerates 8 FDPR rules in § 734.9(b)-(i). FDPR has no de minimis — it's an orthogonal jurisdictional capture. Each rule has product scope + country/end-user scope. We currently have only a rudimentary FDPR mention in `de-minimis-calculator.ts`.

**Sub-sprints suggested:**

- **Z20a** — NS-FDP (734.9(b)) + 9x515-FDP (734.9(c)) + 600-series-FDP (734.9(d)). Pure US-EAR control regimes.
- **Z20b** — Entity-List FDPR with Footnote 1/4/5 (734.9(e)(1)/(2)/(3)). Requires Entity-List dataset with footnote tagging.
- **Z20c** — Russia/Belarus/Crimea (734.9(f)) + Russia/Belarus MEU/Procurement Footnote-3 (734.9(g)). Includes the Supplement No. 3 to Part 746 "37 partner countries" carve-out.
- **Z20d** — Advanced Computing (734.9(h)) + Supercomputer (734.9(i)). Includes the A:5/A:6 exclusion.

**Knowledge Predicate Catalog** (per Blueprint 2 § 9.4):

```ts
type KnowledgeFact =
  | "kf_destination_explicit"
  | "kf_end_user_in_entity_list"
  | "kf_owner_50pct_entity_list" // stayed by 90 FR 50857 until 2026-11-09
  | "kf_red_flag_customer_inconsistency"
  | "kf_red_flag_29_affiliate" // also stayed until 2026-11-09
  | "kf_advanced_node_ic_facility"
  | "kf_meu_procurement_footnote3";
```

**Files to create:**

- `src/lib/trade/subject-to-ear/fdpr-engine.ts`
- `src/lib/trade/subject-to-ear/knowledge-facts.ts`
- `src/lib/trade/subject-to-ear/fdpr-engine.test.ts`
- `src/lib/trade/subject-to-ear/knowledge-facts.test.ts`

**Tests:** Blueprint 2 Examples C, D, E (FDPR at 0% physical content cases) + the supercomputer/advanced-computing trigger cases.

**Acceptance:** EU rocket engine produced on a 9E003.a.1 US-direct-product plant fires § 734.9(b) NS-FDP for China; same engine to India does NOT fire FDPR.

---

#### Z21 — Affiliates Rule with Stay Tracking

**Status:** OPEN
**Size:** 1 sprint
**Blocks:** Z20b (the Entity-List FDPR consumes this)
**Why:** 90 FR 47201 (30 Sept 2025) introduces the 50%-affiliate-look-through for Entity-List entities. Stayed by 90 FR 50857 until **9 November 2026**. Engine must hold `rule_status` per FDP scenario with `effective_date` + `stay_until_date` and surface a warning when the stay approaches expiry.

**Files to create:**

- `src/lib/trade/subject-to-ear/rule-corpus-version.ts` — typed manifest of all FDPR/de-minimis rules with status
- `src/lib/trade/subject-to-ear/rule-corpus-version.test.ts`

**Acceptance:** Calling `getRuleStatus("affiliates-rule")` between 2026-05-22 and 2026-11-08 returns `{ inForce: false, stayedUntil: "2026-11-09", warningRequired: false }`. After 2026-11-09 unless restayed, returns `{ inForce: true, warningRequired: false }`.

---

#### Z22 — Country Group D:5 Dynamic Resolver

**Status:** OPEN
**Size:** 1 sprint
**Blocks:** Z19, Z20 (both need a resolved D:5 list)
**Why:** Per Blueprint 2 § 4 the controlling D:5 list is dynamically defined by reference to State Department arms-embargo notices under 22 CFR 126.1. The eCFR table for Supplement No. 1 to Part 740 lags. Engine must fetch BOTH lists and use State Dept as authoritative on conflict.

**Files to create:**

- `src/lib/trade/subject-to-ear/country-group-resolver.ts`
- `src/lib/trade/subject-to-ear/country-group-resolver.test.ts`
- `src/app/api/cron/country-group-refresh/route.ts` (daily refresh)

**Current D:5 list to hardcode (verify against ecfr on resolve):** AF, BY, MM, CF, CN, CD, CU, ER, HT, IR, IQ, KP, LB, LY, NI, RU, SO, SS, SD, SY, VE, ZW (22 countries; Cambodia removed 2026-02-03 per 91 FR 5091).

**Acceptance:** `resolveCountryGroups("CN")` returns `["D:1","D:3","D:4","D:5"]`; `resolveCountryGroups("BR")` returns `["B"]`.

---

### TIER 2 — MVP-Wedge Completion (Blueprint 1)

#### Z4 — AI Classification Copilot v0

**Status:** OPEN
**Size:** 3-4 sprints
**Why:** Blueprint 1 § 5.4 + Stage 3 #1 — "Drop in a datasheet, get a defensible classification draft." This is the biggest DX win and the final piece of the Stage-3 moat (we already have the matcher + UI; only the datasheet extractor is missing).

**Sub-sprints:**

- **Z4a — Datasheet PDF + Image Extractor** (1 sprint). Astra (Anthropic Claude vision) parses a product PDF / image, extracts typed attributes per the predicate vocabulary in `parametric-matcher.ts`, fills `TradeItemParametricSnapshot`.
- **Z4b — Astra Tool: classify-item** (1 sprint). New Astra tool that wraps the extractor + matcher + composes a draft.
- **Z4c — TradeItemClassificationDraft schema** (1 sprint). DB model storing draft with confidence, reviewer-sign-off fields, provenance pointers.
- **Z4d — UI: Draft Acceptance Flow** (1 sprint). Operator reviews the draft, accepts/rejects, signs off.

**Files to create per sub-sprint** — see Z4 entry in Z3-series Living Roadmap.

**Acceptance:** Drop a Honeywell reaction-wheel datasheet PDF → extracts itemClass + relevant attributes → matcher returns 9A515.x-rw + citation + datasheet evidence span quote.

---

#### Z5 — BAFA ELAN-K2 XML Reporting Interface

**Status:** OPEN
**Size:** 2-3 sprints
**Why:** Blueprint 1 § 1 + Stage 1 #4 — every German operator using an AGG (allgemeine Genehmigung) must file annual reports via ELAN-K2 XML. Without this, German operators **can't actually use the AGGs we model**.

**Sub-sprints:**

- **Z5a — BAFA XSD Types** (1 sprint). TypeScript types derived from the BAFA Meldeschnittstelle XSD. Last update 5 Feb 2026 per blueprint.
- **Z5b — Report Builder + Serializer** (1 sprint). Given org + license + date range, build the M1 report XML; serialize to BAFA-compliant XML.
- **Z5c — UI + XSD Changelog Watcher** (1 sprint). `/trade/elan-k2` page; "Generate M1 report XML" button; XSD-validation step in tests.

**Files to create:**

- `src/lib/trade/elan-k2/xsd-types.ts`
- `src/lib/trade/elan-k2/report-builder.ts`
- `src/lib/trade/elan-k2/xml-serializer.ts`
- `src/lib/trade/elan-k2/*.test.ts`
- `src/app/(trade)/trade/elan-k2/page.tsx`

**Acceptance:** Generate an M1 report for an org with one AGG-12-eligible license; XSD validation passes against the published BAFA schema.

---

### TIER 3 — Ontology Depth Completion (Blueprint 3)

#### Z23 — Complete USML XV Coverage

**Status:** OPEN
**Size:** 2-3 sprints
**Why:** Blueprint 3 § 3 enumerates USML XV(a)(1)-(13) and XV(e)(1)-(21). We have ~10 sub-entries; ~16 are missing.

**Sub-sprints:**

- **Z23a — USML XV(a) full enumeration** (1 sprint). Add (a)(1) nuclear detonation detection, (a)(2) autonomous tracking, (a)(3) SIGINT/MASINT, (a)(4) virtual-satellite constellation, (a)(5) ASAT, (a)(6) space-to-ground weapons, (a)(9) PNT signal generation, (a)(10) collision avoidance, (a)(11) sub-orbital re-entry, (a)(12) inspection-via-grappling, (a)(13) classified.
- **Z23b — USML XV(e) full enumeration** (1-2 sprints). Add (e)(2) optics, (e)(3) FPAs >900nm, (e)(4) cryocoolers, (e)(5) vibration suppression, (e)(6) optical bench, (e)(7) directed-energy weapons, (e)(9) atomic clocks, (e)(10) ADCS-geolocation, (e)(11)(i)-(iii) nuclear-thermal propulsion, (e)(12) chemical thrusters >150 lbf, (e)(14) T/R MMICs, (e)(15) oscillators, (e)(19) re-entry heat shields, (e)(20) propulsion modules, (e)(21) classified catch-all.

**Files to touch:** `src/lib/comply-v2/trade/classification/control-list-cross-walk.ts` only (no schema changes). Add tests in `parametric-matcher.test.ts`.

**Acceptance:** Cross-walk has ≥ 40 entries post-Z23; every Blueprint 3 § 7 "hard edge" parameter produces the correct flip.

---

#### Z24 — Complete EU Annex I Cat 9 Coverage

**Status:** OPEN
**Size:** 2-3 sprints
**Why:** Blueprint 3 § 4 enumerates the full Annex I Cat 9 post-Delegated Reg. (EU) 2025/2003 (in force 15 Nov 2025). We have 2 entries (9A004, 9A005); ~25 are missing.

**Sub-sprints:**

- **Z24a — Core 9A006-9A012** (1 sprint). 9A006 (incl. **cryogenic T ≤ 100K** per 2025/2003), 9A007, 9A008, 9A010 (composite structures), 9A011 (ramjet/scramjet), 9A012 (UAVs).
- **Z24b — MTCR-derived 9A101-9A121** (1 sprint). Full MTCR-derived family.
- **Z24c — Software 9D001-9D105 + Technology 9E001-9E102** (1 sprint). Two new groups.
- **Z24d — AM Entries from Reg 2025/2003** (1 sprint, requires Z25 attributes). New Cat 1/Cat 2 AM entries for turbopumps, heat exchangers, lightweight structures.

**Files to touch:** `control-list-cross-walk.ts`. Plus Z25 typed attributes if cryocooler_temp_K is needed.

---

#### Z25 — Extended Parametric Attributes (Z3a/Z3e tier 3)

**Status:** OPEN
**Size:** 1-2 sprints (1 file + migration)
**Why:** Blueprint 3 § 12 specifies a 30+-attribute predicate vocabulary. We have ~28; ~7 are missing.

**Attributes to add (typed columns + AttributeName union extension):**

| Attribute                         | Type     | Trigger                                            |
| --------------------------------- | -------- | -------------------------------------------------- |
| `gsd_m`                           | Float?   | XV(a)(7)(ii) hyperspectral GSD                     |
| `geolocation_accuracy_LEO_m_CE90` | Float?   | XV(e)(10) AOCS without GCPs                        |
| `dose_rate_latchup_rad_si_s`      | Float?   | 9A515.d kriterium 5 (separate from upset)          |
| `input_power_W`                   | Float?   | XV(e)(11)(iv) EP > 15 kW alternative path          |
| `thrust_N`                        | Float?   | XV(e)(12) chem thruster, XV(e)(11)(iv) EP combined |
| `cryocooler_temp_K`               | Float?   | EU 9A006 (Reg 2025/2003) ≤ 100 K                   |
| `psat_w_per_ghz2`                 | Float?   | XV(e)(14) T/R MMICs                                |
| `oscillator_phase_noise_dbc_hz`   | Float?   | XV(e)(15)                                          |
| `material_type`                   | String?  | EU 9A010.c composites enum                         |
| `additive_process`                | String?  | EU 2025/2003 AM entries enum                       |
| `is_classified`                   | Boolean? | XV(a)(13), XV(e)(21) catch-all                     |

**Files to touch:**

- `prisma/schema.prisma` — add to TradeItem
- `prisma/migrations/<timestamp>_extend_trade_item_parametric_attrs_z25/migration.sql`
- `src/lib/comply-v2/trade/classification/control-list-cross-walk.ts` — extend AttributeName union
- `src/lib/comply-v2/trade/classification/parametric-matcher.ts` — extend ItemAttributeBag
- `src/lib/trade/item-parametric-classification.ts` — extend snapshot interface

**Acceptance:** All Z25 attributes round-trip through bridge service into matcher; integrity tests (Z3u) pass.

---

#### Z26 — DE Ausfuhrliste Teil I A + B Entries

**Status:** OPEN
**Size:** 1-2 sprints
**Why:** Blueprint 3 § 5 enumerates DE-specific entries needed for German operators. We have 0 DE entries currently.

**Entries to add:**

- **DE AL Teil I A 0004** Military missiles
- **DE AL Teil I A 0008** Treibstoffe / Sprengstoffe
- **DE AL Teil I A 0010** Luftfahrzeuge — incl. **0010j suborbitale Fahrzeuge für militärische Zwecke** (22. AWV-ÄndVO 29 Okt 2025, in force 1 Nov 2025)
- **DE AL Teil I A 0011** Military electronics
- **DE AL Teil I B 9A901** National Russia/Belarus extensions
- **DE AL Teil I B 9A994** Civil aircraft below 0010 threshold
- **DE AL Teil I B 9E991/9E992** National technology positions

**Files to touch:** `control-list-cross-walk.ts`. New `RegimeName` already supports `DE-AL-TEIL-IB`.

---

#### Z27 — Annex-I Suffix-Digit Runtime Correlator

**Status:** OPEN
**Size:** 1 sprint
**Why:** Blueprint 3 § 4.1 + § 11 specify the suffix-digit auto-correlation logic (9A001-099 = WA, 9A101-199 = MTCR, etc.) as the strongest auto-correlation key. We have it documented in `MOAT-ARCHITECTURE.md` but not as runtime logic.

**Files to create:**

- `src/lib/comply-v2/trade/classification/annex-i-correlator.ts`
- `src/lib/comply-v2/trade/classification/annex-i-correlator.test.ts`

**API:**

```ts
type SourceRegime =
  | "WASSENAAR"
  | "MTCR"
  | "NSG"
  | "AUSTRALIA_GROUP"
  | "CWC"
  | "NATIONAL";
function deriveSourceRegime(annexIid: string): SourceRegime | null;
// "9A101" → "MTCR", "9A001" → "WASSENAAR", "9A901" → "NATIONAL"
```

**Acceptance:** Function correctly classifies all 6 suffix bands for Cat 9; degrades gracefully for non-matching strings.

---

#### Z28 — Order-of-Review Auto-Trump Enforcement

**Status:** OPEN
**Size:** 1 sprint
**Why:** Per CCL Supplement No. 4 to Part 774 (Order of Review step 3) and Blueprint 3 § 14.6: "9x515 and 600-series trump other ECCNs". Currently the matcher shows both candidates (operator picks). Blueprint 3 says the matcher should auto-trump with a warning.

**Files to touch:** `src/lib/comply-v2/trade/classification/parametric-matcher.ts` — add post-processing step that promotes 9x515/600-series candidates and demotes others to "secondary" rank with explanatory note.

**Acceptance:** Item matching both 9A515.d and 3A001 returns 9A515.d as primary, 3A001 as "trumped by Order of Review". Tests cover both directions.

---

### TIER 4 — Operational Workflows (Blueprints 1 + 2)

#### Z29 — Supplement No. 2 One-Time Report Workflow

**Status:** OPEN
**Size:** 2 sprints
**Why:** Blueprint 2 § 9.5 — before relying on de-minimis for **technology** (not software since 73 FR 56969), exporter must file a one-time report with BIS Regulatory Policy Division. 30-day clock — if BIS doesn't respond, exporter can rely. Workflow currently absent.

**Files to create:**

- `prisma/schema.prisma` — add `BISDeMinimisReport` model (id, organizationId, foreignProductDescription, fairMarketValue, valuationRationale, destinationCountry, usContentPct, filedAt, bisResponseDeadline, bisResponse, reliableForUse)
- `prisma/migrations/<timestamp>_bis_de_minimis_report/migration.sql`
- `src/lib/trade/bis-reports/de-minimis-one-time.ts` — service
- `src/lib/trade/bis-reports/de-minimis-one-time.test.ts`
- `src/app/(trade)/trade/bis-reports/page.tsx` + form

**Cron:** Daily check for reports whose 30-day clock has expired → auto-mark `reliableForUse=true`.

**Acceptance:** File report → 30-day clock starts → after day 31 with no BIS response, report becomes reliable. UI surfaces "reliance OK as of <date>" badge.

---

#### Z30 — Destination Control Statement Generator

**Status:** OPEN
**Size:** 1 sprint
**Why:** Blueprint 2 § 9.5 — § 758.6 requires DCS for any CCL item exported. Auto-generate when Z18 cascade returns subject_to_ear=true.

**Files to create:**

- `src/lib/trade/destination-control-statement.ts` — pure function generating the DCS text
- `src/lib/pdf/reports/destination-control-statement.tsx` — React-PDF template
- Tests

**Acceptance:** Z18 cascade returns subject_to_ear=true → DCS PDF auto-generated per § 758.6.

---

#### Z31 — AUKUS+Canada 9A515 License-Free Overlay

**Status:** OPEN
**Size:** 1 sprint
**Why:** 89 FR 84766 (23 Oct 2024) — 9A515.a.1, .a.2, .a.3, .a.4, .g and 9E515.f no longer require a license to AU/CA/UK. Currently not in license-determination engine.

**Files to touch:**

- `src/lib/comply-v2/trade/license-determination.ts` — add country-specific carve-out for these ECCNs

**Acceptance:** Operation with 9A515.a.1 spacecraft + destination AU/CA/UK → license-determination returns "NO_LICENSE_REQUIRED" with citation to 89 FR 84766.

---

#### Z32 — Recordkeeping 5-Year Retention Policy

**Status:** OPEN
**Size:** 1 sprint
**Why:** Blueprint 1 § 1 Stage 2.5 + Blueprint 2 § 9.5 — § 762.6 / Art. 27(3) EU 2021/821 / § 22 AWG require 5+ year retention with immutable audit log. Audit log exists but no explicit retention enforcement.

**Files to touch:**

- `src/lib/audit.ts` — add retention metadata
- `src/app/api/cron/audit-retention-check/route.ts` — daily cron flags records approaching expiry
- Add tests

**Acceptance:** Audit log entries carry `retentionUntil` timestamp; UI surfaces "earliest deletable" date for compliance officers.

---

### TIER 5 — Stage 2 Product Expansion (Blueprint 1)

#### Z6 — PDF Templates for EUC + VSD Filings

**Status:** OPEN
**Size:** 3-4 sprints
**Why:** Blueprint 1 § 6 + Stage 2 #4. The 2024 BAFA Bekanntmachung tightened required Anlage C 1 / C 2 / C 4 / C 6 / C 7 formats. We track EUCs but operators still hand-fill the forms.

**Sub-sprints:**

- **Z6a — BAFA C1 template** (Endverbleibserklärung) — pilot
- **Z6b — BAFA C2 / C4 / C6 / C7 templates**
- **Z6c — BIS Form 711 + DDTC DS-83**
- **Z6d — VSD narrative templates** (Astra-Composer) for BIS §764.5 / DDTC §127.12 / OFAC §501.805(c)

---

#### Z7 — De Minimis + FDPR Deep-Dive

**Status:** OPEN
**Size:** 2 sprints — **largely absorbed by Z18-Z20**
**Why:** Blueprint 1 § 2 + § 8. Most of Z7's content is now Z18-Z20 territory. Remaining gap: ECCN-aware thresholds (0% for 9x515 to D:5 = Z19; 25%/10% by default = existing).

**Status post Z18-Z20:** Z7 becomes largely redundant; close as DUPLICATE.

---

#### Z9 — OpenSanctions / Orbis UBO Integration

**Status:** OPEN
**Size:** 3 sprints
**Why:** Blueprint 1 § 7 + § 8. Real-world OFAC 50% Rule + 2026 sham-transaction control-in-fact needs external UBO data.

**Sub-sprints:**

- **Z9a** — OpenSanctions API parser + sync-orchestrator registration
- **Z9b** — `ubo-resolver.ts` (Orbis or OpenSanctions) — given a TradeParty, query UBO chain
- **Z9c** — Tests + env-var management for API keys

**Pre-requisites:** Commercial licence with OpenSanctions or Moody's Orbis.

---

#### Z11 — Sammelgenehmigung (SAG) Lifecycle

**Status:** OPEN
**Size:** 3-4 sprints
**Why:** Blueprint 1 § 3 + Stage 2 #2. Z8 ships SAG-eligibility threshold (≥ 80% mandatory ICP). Z11 ships the actual workflow.

**Sub-sprints:**

- **Z11a** — `TradeSAGApplication` schema + migration
- **Z11b** — Application → BAFA correspondence → grant → per-shipment use lifecycle
- **Z11c** — Annual reporting (ELAN-K2-driven, depends on Z5)
- **Z11d** — Renewal workflow

---

#### Z12 — Bill-of-Materials De Minimis Integration

**Status:** OPEN
**Size:** 2 sprints
**Why:** Blueprint 1 § 2 + Stage 2 #3. De minimis is per-item; an operator's BOM has many items with different US-content. BOM-level rollup to finished-good determination.

**Sub-sprints:**

- **Z12a** — `TradeBomEdge` schema + migration (parent-child component graph) — also enables recursive multi-level see-through propagation Z3o supports today as single-level
- **Z12b** — BOM rollup calculator that consumes Z18 cascade per node + aggregates upward

---

#### Z16 — OFAC 2026 Sham-Transaction Doctrine

**Status:** OPEN
**Size:** 2 sprints
**Why:** Blueprint 1 § 7 — 31 March 2026 OFAC guidance extends 50% Rule beyond formal ownership to control-in-fact. GVA Capital $215M (June 2025) is the case-law evidence.

**Files to touch:**

- `src/lib/comply-v2/trade/screening/cascade-50pct.ts` — add parallel control-in-fact finding that doesn't aggregate but flags separately
- Tests against the GVA fact pattern

---

### TIER 6 — Stage 3 Moat Extension + Future Phases

#### Z13 — Deemed Export Controls

**Status:** OPEN
**Size:** 3 sprints
**Why:** Blueprint 1 § 2. Transfer of US-origin technical data to a foreign national inside the EU = "deemed export." Need nationality-aware access controls on technical data repositories.

---

#### Z14 — ATLAS DE + AES US Customs Filing Integration

**Status:** OPEN
**Size:** 4 sprints
**Why:** Blueprint 1 § 4.5 + Stage 3 #3. Reconciling customs filing against export-control determination closes the loop.

---

#### Z15 — Predictive Licence-Time Analytics

**Status:** OPEN
**Size:** 3 sprints
**Why:** Blueprint 1 Stage 3 #4. BAFA processing times tripled (36 → 83 working days). Operators want forecast.

---

#### Z33 — Training Corpus for AI Copilot (BAFA AzG + DDTC CJ scrapers)

**Status:** OPEN
**Size:** 3 sprints
**Why:** Blueprint 3 § 14 specifies the training corpus for Z4 AI Copilot: BAFA AzG public rulings + DDTC CJ determinations + BIS CCATS roll-ups + Wassenaar/MTCR/NSG/AG handbooks.

**Sub-sprints:**

- **Z33a** — BAFA AzG scraper
- **Z33b** — DDTC CJ scraper
- **Z33c** — BIS CCATS roll-up ingestion

---

#### Future Phases (post-Z-series, per Blueprint 1 § 4)

- Sanctions expansion (Switzerland SECO, Japan METI)
- Public API v1 expansion + OpenAPI spec + Swagger UI
- Embeddable widget for B2B portal embedding
- Sanctions diff alerts (daily diff of 6+ sources)
- Multi-org benchmarking ("Your VSD outcomes vs industry median")
- Mobile / responsive review of all `/trade/*` routes
- Cross-industry expansion (Defence electronics 3A611, UAV 9A012 / Cat VIII)

---

## 5. Dependency graph (compact)

```
                Z22 (Country Group Resolver)
                  ↓
       ┌──────────┼──────────┐
       ↓          ↓          ↓
      Z19        Z20        Z21
     (Carve     (FDPR)    (Affiliates
      Outs)                  + Stay)
       │          │          │
       └──────────┼──────────┘
                  ↓
                Z18 (Three-Gate Cascade Orchestrator)
                  ↓
                Z30 (DCS Generator)
                Z29 (Supp No. 2 Report)


Z25 (Extended Attributes) ─┬→ Z24d (AM entries)
                            └→ Z23 (USML XV full)


Z3o (see-through, shipped) ─→ Z12a (BomEdge schema) ─→ Z12b (BOM rollup)


Z5a → Z5b → Z5c (ELAN-K2)
        ↓
       Z11c (SAG annual reporting)


Z4a → Z4b → Z4c → Z4d (AI Copilot)
       ↑
      Z33 (Training corpus)
```

---

## 6. Architecture invariants (do not violate)

Mirrors `CAELEX-TRADE-LIVING-ROADMAP.md` § 5 with one addition (#9).

1. **All `*-service.ts` files are org-scoped.** Cross-org reads/writes must be refused via defensive lookups before persistence.
2. **All server actions are role-gated.** OWNER/ADMIN/MANAGER write; below is read-only. Use `assertEditor`.
3. **All sanctions parsers register in `sync-orchestrator.ts`.**
4. **Crons authenticate via `Authorization: Bearer ${CRON_SECRET}` with `timingSafeEqual`.**
5. **Tests are co-located** as `*.test.ts` next to file under test. Use `vi.hoisted()` for mock refs.
6. **Migrations are hand-rolled SQL** under `prisma/migrations/<timestamp>_<slug>/migration.sql`.
7. **`.vercelignore` patterns must be anchored with `/`** if root-only.
8. **AI / Astra output is never binding.** Always require human sign-off.
9. **The Three-Gate Cascade (Z18) is the single entry point for "subject to the EAR" determinations.** No service may bypass it. The cascade orders are non-negotiable (ITAR see-through → FDPR → De-Minimis → carve-outs).

---

## 7. Deploy + batch policy (mirrors CLAUDE.md)

- Batch 6–8 commits before push to `main`.
- Push triggers Vercel production build (no preview builds — explicit user policy).
- Migrations apply at build time via `prisma migrate deploy`.
- `git push` needs `~/.netrc` with `machine github.com` + GitHub PAT in non-TTY shells.
- Commit subjects lowercase (commitlint rejects sentence-case).
- Conventional-Commit format: `feat(trade):`, `fix(trade):`, `test(trade):`, `docs(trade):`.
- `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer required.

---

## 8. How to resume after compact

You are a future Claude session. The context window just compacted. You need to pick up where the prior session left off.

### Step 1 — Orient (3 minutes)

1. Read this document top-to-bottom.
2. Read `docs/CAELEX-TRADE-MOAT-ARCHITECTURE.md` (15 minutes if first time; 2 minutes if you've seen it).
3. `git log --oneline --since=14.days | grep -iE "feat\(trade\)|fix\(trade\)|test\(trade\)" | head -30` — see what shipped recently.
4. `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run src/lib/comply-v2/trade src/lib/trade 2>&1 | tail -5` — should report 840+ green; if not, fix tests first.

### Step 2 — Pick the next sprint (1 minute)

Walk Tier 1 → Tier 2 → Tier 3 → Tier 4 → Tier 5 → Tier 6 in order. Pick the first sprint in the highest tier where status = OPEN.

If multiple sprints have OPEN status in the same tier, prefer:

- The one with the smallest scope (1-sprint > 2-sprint > 3-sprint)
- The one whose dependencies are all SHIPPED
- The one whose tests would catch the highest-consequence regulatory mistake

### Step 3 — Execute the sprint (timeboxed)

For each sprint:

1. Re-read the sprint card in § 4.
2. Read the relevant blueprint section (§ 2 of this doc lists which blueprint).
3. Implement files per the card.
4. Write tests covering the acceptance criteria.
5. Run `npx vitest run <test-paths>` until green.
6. Run `npx tsc --noEmit 2>&1 | grep "<your-files>"` clean.
7. Commit with Conventional-Commit message (lowercase subject!).
8. Update this doc: move the sprint from OPEN to SHIPPED with a one-paragraph status note.

### Step 4 — Deploy when batch threshold reached

- Per CLAUDE.md: batch 6–8 commits before `git push origin main`.
- After push, monitor `vercel ls 2>&1 | head -5` — typical build is 4-5 min.
- Schedule a ScheduleWakeup at 270s only if you have nothing else to work on.

### Step 5 — Stop signals

Stop only when:

- All Tier 1-3 sprints are SHIPPED (the MVP-wedge + ontology depth complete), AND
- The user explicitly asks you to.

Until then: pick the next sprint and continue.

---

## 9. Sprint status table (the working surface)

This is the table to update on every sprint completion. Move sprints between SHIPPED / IN-PROGRESS / OPEN columns.

| Sprint                                          | Tier | Size                  | Status      | Shipped at                                                    |
| ----------------------------------------------- | ---- | --------------------- | ----------- | ------------------------------------------------------------- |
| Z18 — Three-Gate Cascade Orchestrator           | 1    | 1-2 sprints           | **SHIPPED** | 2026-05-22 (Gate 2 stubbed pending Z20)                       |
| Z19 — § 734.4(a) Hard Carve-Out Table           | 1    | 1 sprint              | **SHIPPED** | 2026-05-22                                                    |
| Z20a — NS/9x515/600-series FDPR                 | 1    | 1 sprint              | **SHIPPED** | 2026-05-22 (engine + cascade Gate 2 wired)                    |
| Z20b — Entity-List FDPR (footnotes 1/4/5)       | 1    | 1 sprint              | **SHIPPED** | 2026-05-22 (knowledge-facts module + cascade)                 |
| Z20c — Russia/Belarus FDPR (.f/.g)              | 1    | 1 sprint              | **SHIPPED** | 2026-05-22 (Cat 3-9 D/E + occupied-region flag)               |
| Z20d — Advanced Computing / Supercomputer FDPR  | 1    | 1 sprint              | **SHIPPED** | 2026-05-22 (FDPR (h)/(i) — closes Tier 1)                     |
| Z21 — Affiliates Rule with Stay Tracking        | 1    | 1 sprint              | **SHIPPED** | 2026-05-22                                                    |
| Z22 — Country Group D:5 Dynamic Resolver        | 1    | 1 sprint              | **SHIPPED** | 2026-05-22 (Z22b queued for daily-cron refresh)               |
| Z4a — Datasheet PDF Extractor                   | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (unpdf-based, 16 tests)                            |
| Z4b — Astra Tool: classify-item                 | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (classify-from-datasheet tool, 7+7)                |
| Z4c — TradeItemClassificationDraft schema       | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (Prisma model + service, 11 tests)                 |
| Z4d — UI: Draft Acceptance Flow                 | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (/trade/classify, 7 tests)                         |
| Z5a — BAFA XSD Types                            | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (typed XSD shape, 8 tests)                         |
| Z5b — Report Builder + Serializer               | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (hand-rolled XML, 21+18 tests)                     |
| Z5c — UI + XSD Changelog Watcher                | 2    | 1 sprint              | **SHIPPED** | 2026-05-22 (drift detector + UI, 6 tests)                     |
| Z23a — USML XV(a) full enumeration              | 3    | 1 sprint              | **SHIPPED** | 2026-05-22 (9 entries appended, 6 tests)                      |
| Z23b — USML XV(e) full enumeration              | 3    | 1-2 sprints           | **SHIPPED** | 2026-05-22 (23 entries + see-through (17))                    |
| Z24a — EU 9A006-9A012                           | 3    | 1 sprint              | **SHIPPED** | 2026-05-22 (3 ECCNs + 4 parametric predicates)                |
| Z24b — MTCR-derived 9A101-9A121                 | 3    | 1 sprint              | **SHIPPED** | 2026-05-22 (13 ECCNs, 19 tests, salvaged after policy filter) |
| Z24c — Software 9D + Tech 9E                    | 3    | 1 sprint              | OPEN        | —                                                             |
| Z24d — AM Entries from Reg 2025/2003            | 3    | 1 sprint              | OPEN        | —                                                             |
| Z25 — Extended Parametric Attributes            | 3    | 1-2 sprints           | **SHIPPED** | 2026-05-22 (10 new attrs + apertureMM demo, 46 tests)         |
| Z26 — DE Ausfuhrliste Teil I A + B              | 3    | 1-2 sprints           | **SHIPPED** | 2026-05-22 (28 entries, 37 tests)                             |
| Z27 — Annex-I Suffix-Digit Runtime Correlator   | 3    | 1 sprint              | OPEN        | —                                                             |
| Z28 — Order-of-Review Auto-Trump                | 3    | 1 sprint              | OPEN        | —                                                             |
| Z29 — Supplement No. 2 One-Time Report Workflow | 4    | 2 sprints             | OPEN        | —                                                             |
| Z30 — Destination Control Statement Generator   | 4    | 1 sprint              | **SHIPPED** | 2026-05-22 (generator + route + UI, 19 tests)                 |
| Z31 — AUKUS+Canada 9A515 License-Free Overlay   | 4    | 1 sprint              | **SHIPPED** | 2026-05-22 (AUS/STA-AUKUS, 26 tests)                          |
| Z32 — Recordkeeping 5-Year Retention Policy     | 4    | 1 sprint              | **SHIPPED** | 2026-05-22 (policy + audit-center page, 29 tests)             |
| Z6a-d — EUC + VSD PDF Templates                 | 5    | 3-4 sprints           | PARTIAL     | 2026-05-22 EUC Annex IIIa shipped — VSD pending               |
| Z7 — De Minimis + FDPR Deep-Dive                | 5    | (absorbed by Z18-Z20) | DUPLICATE   | —                                                             |
| Z9 — OpenSanctions / Orbis UBO                  | 5    | 3 sprints             | OPEN        | —                                                             |
| Z11 — Sammelgenehmigung Lifecycle               | 5    | 3-4 sprints           | OPEN        | —                                                             |
| Z12 — BOM De Minimis Integration                | 5    | 2 sprints             | OPEN        | —                                                             |
| Z16 — OFAC 2026 Sham-Transaction Doctrine       | 5    | 2 sprints             | OPEN        | —                                                             |
| Z13 — Deemed Export Controls                    | 6    | 3 sprints             | OPEN        | —                                                             |
| Z14 — ATLAS DE + AES US Customs Filing          | 6    | 4 sprints             | OPEN        | —                                                             |
| Z15 — Predictive Licence-Time Analytics         | 6    | 3 sprints             | OPEN        | —                                                             |
| Z33 — Training Corpus (BAFA AzG + DDTC CJ)      | 6    | 3 sprints             | OPEN        | —                                                             |

### Already-shipped (for context, not to redo)

Z1, Z2, Z2b, Z3a-Z3v, Z8, Z10 — see `CAELEX-TRADE-LIVING-ROADMAP.md` § 3 for one-line status notes.

---

## 10. Acceptance criteria for "done"

The product is **functionally complete** per the three blueprints when:

- [ ] All Tier 1 sprints SHIPPED (Z18, Z19, Z20a-d, Z21, Z22) — closes the catastrophic 9x515-to-D:5 0% trap
- [ ] All Tier 2 sprints SHIPPED (Z4a-d, Z5a-c) — closes the MVP-wedge
- [ ] All Tier 3 sprints SHIPPED (Z23, Z24, Z25, Z26, Z27, Z28) — full ontology coverage per Blueprint 3
- [ ] All Tier 4 sprints SHIPPED (Z29, Z30, Z31, Z32) — operational workflows
- [ ] Tier 5 sprints prioritised per user direction (Z6 PDFs + Z9 UBO are the highest-value remaining)
- [ ] 1500+ trade tests passing
- [ ] Every Blueprint 3 § 7 "hard edge" parameter encoded with two-sided boundary tests
- [ ] Every Blueprint 2 § 9.3 Example A-F produces the documented outcome

When this is true, the product can be marketed as **legally defensible for European space exporters**. Until then, the gaps are real and operators must be told.

---

**End of plan. Pick a sprint and ship.**
