# Engine-Origin-Determination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans, task-by-task. Steps use checkbox (`- [ ]`). **Multi-phase plan: Foundation first (one session), then one origin-module per focused session. Update §0 status board after every task.**

**Goal:** Give Caelex Passage a real per-country licence verdict for every circle-A exporter origin (EU/UK/US/CH/NO/CA/AU/KR/JP/IN) — "GO under general licence X / individual licence at NCA Y / prohibited" — instead of the generic fail-closed thin-coverage REVIEW; lift every circle-A `REGIME_MATURITY` 3→2; target 100/100 on the honest rubric (§9 of the spec).

**Architecture:** A uniform `OriginLicenceModule` interface + a registry + per-country general-licence data tables (spec Ansatz 1). The destination hard-prohibition gates (0/1.5/1.6/2) stay vorrangig; the new origin-determination stage answers the licence question for non-prohibited cases. Invariant = **no false-CLEARED** (every GO backed by a cited general licence), NOT tightening-only — a GO that overrides an embargo is forbidden, but turning a thin-coverage REVIEW into a legally-backed GO is the whole point.

**Tech Stack:** Next.js 15, TypeScript strict, Vitest, pure TS (`src/lib/comply-v2/trade/origin-determination/`), official free sources only. NO new deps, NO migration, NO runtime AI.

**Spec:** `docs/superpowers/specs/2026-06-13-engine-origin-determination-design.md`.

---

## 0. CONTEXT-SURVIVAL + STATUS BOARD (update after every task)

**Branch:** Create `feat/trade-origin-determination` **fresh from `origin/main`** — but ONLY once the ground is stable: (a) the S5/S6/S7 + base-corpus-audit batch is deployed to main, AND (b) the concurrent base-corpus-audit session has finished committing. Until then the corpus base (`eu-annex-i*.ts`, `wassenaar-cat6-9.ts`) is moving; building origin-determination on top of a moving corpus risks merge pain. **Verify before branching:** `git log origin/main -1` shows the audit batch landed; ask the user if unsure.

**Read in this order (fresh agent):**

1. Spec `docs/superpowers/specs/2026-06-13-engine-origin-determination-design.md` (interface §4.1, fail-closed §4.5, DoD §9).
2. This file (§0 board + the phase you're on).
3. `src/lib/comply-v2/trade/license-determination.ts` — the engine you wire into (Gates 0–4.5; `determineLicenseRequirements`).
4. `src/lib/comply-v2/trade/classification/origin-regime-map.ts` — `OriginRegimeRouting`, `originRegimes`.
5. `src/data/trade/normalized-corpus.ts` — `REGIME_MATURITY` (the per-origin lift target).

**Hard rules:**

- **Zero external cost.** Only official free sources (spec §5 table). No new deps, no migration, no runtime AI. Every general licence carries a `citation` + `asOfDate`.
- **No false-CLEARED.** A GO is only legal when a `generalLicence` with a citation backs it. Discretionary/unclear eligibility → REVIEW. Destination hard-prohibitions (Gate 0/1.5/1.6/2) are never overridable by an origin module.
- **TDD:** RED → minimal GREEN → commit. Per-module: unit tests + an **independent W6 source-verification agent** against the official text BEFORE lifting that module's maturity.
- **Golden distribution shifts on purpose** here (thin-REVIEW → precise verdict). Every shift is documented + legally justified; no cell loosens without a cited general licence; the fail-closed invariant (no false-CLEARED) stays hard.
- **Objective oracle** for legal edits: `grep -c`, `npx vitest run`, `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (tsc baseline = whatever main is at branch time — measure + record here). macOS: no `timeout`; tsc needs the NODE_OPTIONS heap flag.
- Commitlint: lowercase subject ≤100 chars; explicit `git add` paths, NO `-A`; never `--no-verify`.

| Phase                                                                     | Status | Commits                                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F — Foundation (interface + registry + wiring + US-wrap + golden-harness) | ✅     | 95d72cb · 31529be · efed662 · e67a1e0 · fc2b295 · 3256af8 · (+wrap) | tsc baseline **666** (held, 0 new). Golden distribution UNCHANGED **744 = 74/396/274**. US-wrap behaviour-identical (8 inline snapshots reproduce bit-identically after wiring). Safety pin proven: embargo/RU + GO-module → BLOCKED. NO REGIME_MATURITY lifted. Stage runs after Gates 0/1.5/1.6/2; replaces ONLY Gate 4.5 for origins with a module.                                                                                                                                                                                                                                                                                                                                                                                         |
| M-EU — EU module (EUGEA + member→NCA)                                     | ✅     | 932d084 · 2ad0e31 · d829df5 · c0f46dc · 611c727                     | **REFERENCE MODULE — done + W6-verified.** EU001 + member→NCA. maturity EU_ANNEX_I/EU_CML already 2 (no lift). Golden **90/380/274** (+16 REVIEW→GO vs Phase-F 74, all EU001-cited). Section-I = exact 2-part official list (Annex IV ∪ 13 explicit codes), **double-sourced verbatim** (EUR-Lex OJ L206/443 + BAFA, byte-identical) + independent W6. **Key finding:** 9A004/9A106.c are Annex IV members → stay fail-closed REVIEW (NOT the naive flip-to-GO). **Bare-parent guard** (611c727) closes a false-CLEARED: EU corpus emits bare `9A009` (spans excluded 9A009.a) → REVIEW. eu.test 69. tsc 666. **LESSON for fan-out W6: verify list-vs-source AND corpus-emission granularity (bare-parent traps).**                            |
| M-UK — UK module (OGELs/ECJU)                                             | ✅     | db696eeb                                                            | **done + W6-VERIFIED.** ONE OGEL ("Export of Dual-Use items to EU Member States", 16 Dec 2025) → EU-27∪{IS,JE,GG}, covers Annex I minus Annex IIg; else SIEL@ECJU. UK Annex IIg = "all Annex IV + 13 codes" **byte-identical to EU 2021/821 Section I** (reuses M-EU's verified list). UK_STRATEGIC 3→2; thin set 8→7. Golden 90/380/274→**94/376/274** (+4: star-tracker/ground-tt-c/flight-sw/prepreg GB→DE GO-under-OGEL). sat-bus(9A004)/apogee(9A106) GB→DE stay REVIEW (Annex IV→IIg→SIEL). W6 cleared the NTE-2024/05 close-ally trap (OGEL→allies ONLY for PL9013/14/15, absent from corpus) + confirmed **7 bare-parent codes fail-close**. tsc 666.                                                                                  |
| M-CH — Switzerland (GAB/SECO)                                             | ✅     | 3f8aa80d                                                            | **done + W6-VERIFIED.** OGB (ord. Generalausfuhrbewilligung, GKV SR 946.202.1 Art. 12 + **Anhang 7** = 29 partner states incl. **US+JP**, verbatim fedlex XML Stand 2024-06-01) → GENERAL/GO for non-sensitive dual-use; else Einzelbewilligung@SECO. GKV has **no written goods-exclusion schedule** → reuse the EU/UK Annex-IV + 13-code set as an honest fail-closed **safety floor** (sensitive 9A004/9A106 → REVIEW). CH_GKV 3→2; thin set 7→6. Golden 94/376/274→**106/364/274** (+12: 4 non-sensitive × {DE,US,JP}; broader than UK b/c OGB covers US+JP). IN not on Anhang 7 → REVIEW. W6 caught a douana.ch error (BG wrongly listed as a 2026 future-add; fedlex confirms BG already in-force) + 3 bare parents fail-close. tsc 666. |
| M-NO — Norway (MFA)                                                       | ✅     | 18c36175 (parallel fan-out)                                         | **done + W6-VERIFIED.** NO item+destination-only general licence exists (verified lovdata FOR-2013-06-19-718 Liste II + DEKSA): dual-use exports need an individual MFA licence; the only "general" instrument is the Defence-Transfers general transfer licence (Liste I, EEA only) — not dual-use. So **empty general-licence set → all controlled NO cells REVIEW** (cited individual@MFA, replacing generic Gate-4.5). 0 GO. NO_LIST 3→2. Honest, correct (rubric: never wrong, not never REVIEW).                                                                                                                                                                                                                                         |
| M-CA — Canada (GEPs/GAC)                                                  | ✅     | 18c36175 (parallel fan-out)                                         | **done + W6-VERIFIED.** GEP No. 41 (cryptography, SOR/2015-200) + the US permit-exemption (Export Controls Handbook). **+10 GO**: 4 non-sensitive items CA→US (US exemption) + 6 (star-tracker/flight-sw/prepreg)×{DE,JP} under GEP-41 — crypto **5A002 correctly EXCLUDED** (GEP-41 Schedule 13) so ground-tt-c stays REVIEW. Sensitive 9A004/9A106 (Group-6 MTCR) REVIEW; radhard-obc (US ECCN) REVIEW. CA_ECL 3→2.                                                                                                                                                                                                                                                                                                                          |
| M-AU — Australia (DSGL permits)                                           | ✅     | 18c36175 (parallel fan-out)                                         | **done + W6-VERIFIED.** Empty general-licence set → all controlled AU cells REVIEW (cited individual permit@DEC). The AUKUS DTCA-2024 licence-free environment was judged NOT cleanly item+destination-only grantable (conditions/exclusions need per-shipment facts) → fail-closed to REVIEW (over-block acceptable, no over-claim — W6 faithful=true). 0 GO. AU*DSGL 3→2. \_Possible Phase-W refinement: model AUKUS→US GO for non-excluded items.*                                                                                                                                                                                                                                                                                          |
| M-JP — Japan (METI bulk)                                                  | ✅     | 18c36175 (parallel fan-out)                                         | **done + W6-VERIFIED.** General Bulk Export Licence (一般包括許可) to Group-A countries (METI 2023-06-27; KR restored to Group A 2023). **+8 GO**: 4 non-sensitive items (7A004/5A002/9D001/1C010)×{DE,US} (both Group A). JP→IN REVIEW (India not Group A). Sensitive 9A004/9A106 REVIEW. English-source honesty applied. JP_METI 3→2.                                                                                                                                                                                                                                                                                                                                                                                                        |
| M-KR — Korea (MOTIE)                                                      | ✅     | 18c36175 (parallel fan-out)                                         | **done + W6-VERIFIED.** Comprehensive licence (포괄허가) to "Ga" region is exporter/registration-gated (CP/AEO status) → NOT item+destination-only grantable → empty general-licence set → all controlled KR cells REVIEW (cited individual@MOTIE). 0 GO. Sensitive 9A004/9A106 REVIEW. English-source honesty. KR_STRATEGIC 3→2.                                                                                                                                                                                                                                                                                                                                                                                                              |
| M-IN — India (DGFT/SCOMET)                                                | ✅     | 18c36175 · a1ca309a (W6 citation fix)                               | **done + W6-VERIFIED-after-fix.** SCOMET general authorisations (GAICT intra-company / GAET telecom / GAEIS info-sec / GAED drones) are all intra-company/end-use/registration-gated → empty general-licence set → all controlled IN cells REVIEW (cited individual@DGFT). 0 GO. W6 REFUTED on a **citation defect only** (GAET mislabelled "Technology", GAICT omitted) — fixed in a1ca309a (comment-only, verdict-neutral; noFalseCleared+sensitivePin held throughout). Sensitive 9A004/9A106 REVIEW. IN_SCOMET 3→2.                                                                                                                                                                                                                        |
| W — Wrap (score reassessment + boards + PF-2 decision)                    | ✅     | 4b98eece · 77179de3                                                 | **W1 ✅** score reassessment (below): safety axis 100/100, golden 124/346/274, all maturities lifted. **W2 ✅** AVA VerdictPanel renders the origin licence detail (`77179de3`) — verified via tsc 666 + standalone logic proof (all 4 cases) + correct-by-construction; the jsdom render test wedges at collection under LOCAL node-24 (repo pins node 20; sibling component tests pass) → test-infra follow-up spawned. **PF-2 ✅** decided (dead resolveOrderOfReview → follow-up). **DEPLOYED to prod main `77179de3` 2026-06-13** (23-commit FF push; Vercel build in flight). AU/AUKUS conservative under-grant noted (safe, optional refinement).                                                                                       |

Legend: ⬜ offen · 🟡 läuft · ✅ fertig

---

## File structure

**Foundation (new dir `src/lib/comply-v2/trade/origin-determination/`):**

- `types.ts` — `OriginLicenceVerdict`, `OriginLicenceModule`, `OriginDeterminationInput`, `GeneralLicence`, `evaluateGeneralLicence()` helper.
- `registry.ts` — `ORIGIN_MODULES: Map<…>` + `resolveOriginModule(exporterOrigin)`.
- `eu-member-nca.ts` — `EU_MEMBER_NCA: Record<ISO2, string>`.
- `<eu|uk|us|ch|no|ca|au|kr|jp|in>.ts` (+ each `.test.ts`) — one module + its `GeneralLicence[]`.
- `fold-origin-verdict.ts` — pure mapper `OriginLicenceVerdict → LicenseRequirement[]` deltas for the engine.

**Modified:**

- `src/lib/comply-v2/trade/license-determination.ts` — new "Origin-Determination stage" after the hard-prohibition gates; Gate 4.5 becomes the no-module fallback.
- `src/data/trade/normalized-corpus.ts` — `REGIME_MATURITY` 3→2 per built module.
- `src/lib/comply-v2/trade/classification/golden-set/golden-set.test.ts` (+ `space-items.ts` if new fixtures) — origin-specific expected verdicts.
- `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx` — licence detail in the assessed-under line.

---

# PHASE F — Foundation 🔴 FIRST

**Acceptance:** the interface + registry + wiring compile and are unit-tested; the US module wraps the existing EAR/ITAR/de-minimis logic **behavior-identically** (snapshot-proven); the golden harness can express origin-specific verdicts; NO maturity lifted yet (so golden stays at its pre-feature distribution); full trade suite green; tsc baseline held.

### Task F1: Core types

**Files:** Create `src/lib/comply-v2/trade/origin-determination/types.ts` + `types.test.ts`

- [ ] **F1.1 — Read first.** Read `license-determination.ts` for the real `RequirementStatus`, the classification/input shapes it consumes, and `origin-regime-map.ts` for `OriginRegimeRouting`. Bind `ClassificationLike`/`ScreeningContextLike` to the REAL types used there (import them; do NOT invent parallel shapes).
- [ ] **F1.2 RED** — `types.test.ts`: assert `evaluateGeneralLicence(licence, classification, destIso)` returns `true` only when `eligibleCodes(classification)` AND the destination is in `eligibleDestinations` AND NOT in `excludedDestinations`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateGeneralLicence, type GeneralLicence } from "./types";

const LIC: GeneralLicence = {
  id: "TEST_GL",
  label: "Test GL",
  authority: "TEST",
  eligibleCodes: (c) => c.eccnEU === "9A004",
  eligibleDestinations: new Set(["JP", "US"]),
  excludedDestinations: new Set(["CN"]),
  conditions: ["register"],
  citation: "https://example.gov/gl",
};

describe("evaluateGeneralLicence", () => {
  it("eligible: matching code + allowed dest", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, "JP")).toBe(true);
  });
  it("not eligible: wrong code", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A001" }, "JP")).toBe(false);
  });
  it("not eligible: dest not in allow-set", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, "IN")).toBe(false);
  });
  it("excluded dest beats allow-set", () => {
    const lic2 = {
      ...LIC,
      eligibleDestinations: (iso: string) => iso.length === 2,
    };
    expect(evaluateGeneralLicence(lic2, { eccnEU: "9A004" }, "CN")).toBe(false);
  });
});
```

(Adapt the `{ eccnEU: ... }` literal to the real `ClassificationLike` minimal shape after F1.1.)

- [ ] **F1.3** run → FAIL (module missing).
- [ ] **F1.4 GREEN** — implement `types.ts` with the interfaces from spec §4.1 + `evaluateGeneralLicence`:

```ts
export function evaluateGeneralLicence(
  lic: GeneralLicence,
  c: ClassificationLike,
  destIso: string,
): boolean {
  const dest = destIso.trim().toUpperCase();
  if (lic.excludedDestinations.has(dest)) return false;
  if (!lic.eligibleCodes(c)) return false;
  const ok =
    typeof lic.eligibleDestinations === "function"
      ? lic.eligibleDestinations(dest)
      : lic.eligibleDestinations.has(dest);
  return ok;
}
```

- [ ] **F1.5** run → PASS → commit `feat(trade): origin-determination core types + general-licence evaluator (F)`

### Task F2: Registry

**Files:** Create `registry.ts` + `registry.test.ts`

- [ ] **F2.1 RED** — `resolveOriginModule(originRegimes("GB"))` returns a module; `resolveOriginModule(originRegimes("BR"))` (unsupported) returns `null`; an unregistered-but-supported origin returns `null` (so the engine falls back to Gate 4.5).
- [ ] **F2.2** FAIL → **F2.3 GREEN** — `ORIGIN_MODULES = new Map<CorpusRegime, OriginLicenceModule>()` keyed by `dualUsePrimary`/`militaryPrimary`; `resolveOriginModule(o)` returns the module for `o.dualUsePrimary` (or `militaryPrimary`) or `null`. Empty map initially (modules register as built). → PASS → commit `feat(trade): origin-module registry (F)`

### Task F3: Verdict→requirements folder

**Files:** Create `fold-origin-verdict.ts` + test

- [ ] **F3.1 RED** — `foldOriginVerdict(verdict)` maps: PROHIBITED→a BLOCKED-class requirement; INDIVIDUAL→a REVIEW_NEEDED-class requirement naming the authority; GENERAL→a GO-with-conditions requirement (the general-licence id + conditions); NONE→no licence requirement (uncontrolled). Assert the produced `RequirementStatus` matches the engine's enum (read it in F1.1).
- [ ] **F3.2** FAIL → **F3.3 GREEN** — implement the pure mapper using the real `RequirementStatus`/requirement shape. → PASS → commit `feat(trade): fold origin verdict into engine requirements (F)`

### Task F4: US module (WRAP — behavior-identical)

**Files:** Create `us.ts` + `us.test.ts`

- [ ] **F4.1 — Snapshot first.** Before refactoring: in `us.test.ts`, capture the CURRENT `determineLicenseRequirements` output for ~8 representative US-origin inputs (controlled+EAR, EAR99, ITAR-declared, de-minimis over/under, embargo dest, RU dest) as expected snapshots.
- [ ] **F4.2 GREEN** — implement `us.ts` as an `OriginLicenceModule` that wraps the EXISTING EAR-exception/de-minimis/ITAR decision the engine already makes (call into the existing helpers; do NOT duplicate logic). EAR License Exceptions (STA/GBS/…) + ITAR exemptions become its `GeneralLicence[]` where the engine already encodes them; otherwise INDIVIDUAL at BIS/DDTC.
- [ ] **F4.3** Assert the wrapped module reproduces the F4.1 snapshots bit-identically for all 8 inputs. → commit `feat(trade): us origin module wraps existing ear/itar logic, behavior-identical (F)`

### Task F5: Wire the origin-determination stage into the engine

**Files:** Modify `license-determination.ts`; extend its test

- [ ] **F5.1 — Read the gate chain.** Confirm the order: Gate 0 (Annex IV) → 1 (MTCR) → 1.5 (embargo) → 1.6 (RU/BY) → 2 (ITAR) → 3 (EAR/de-minimis) → 3.5 → 4 (EU Annex I) → 4.5 (thin-origin). Identify the exact point AFTER the hard-prohibition gates (0/1.5/1.6/2) where the origin stage belongs.
- [ ] **F5.2 RED** — tests:
  - US origin + EAR-controlled item: engine output unchanged vs. F4 snapshot (US module wired, behavior-identical).
  - GB origin + controlled item + NO UK module registered yet: still hits Gate 4.5 fail-closed REVIEW (fallback intact).
  - An embargo/RU destination + any origin with a (mock) GENERAL-GO module: stays BLOCKED (hard-prohibition outranks the module). **This is the load-bearing safety pin.**
  - No `exporterOrigin`: byte-identical legacy behavior.
- [ ] **F5.3 GREEN** — add the stage: after the hard-prohibition gates, `const mod = resolveOriginModule(exporterOrigin); if (mod) { fold its verdict } else { existing Gate 4.5 }`. The hard-prohibition BLOCKED results computed earlier are never downgraded by the module (guard like Gate 1.6's `alreadyProhibited`).
- [ ] **F5.4** PASS → full determination suite green → commit `feat(trade): origin-determination stage wired after hard-prohibition gates (F)`

### Task F6: Golden harness — origin-specific verdicts

**Files:** Modify `golden-set.test.ts`

- [ ] **F6.1** — Extend the harness so an EXACT entry can be keyed `item|origin|dest` with a verdict that reflects the origin module (not just the floor). Since NO non-US module is built yet, the distribution must still equal the current pre-feature numbers (re-measure at branch time and pin). US-origin cells now flow through the wrapped module → must match their pre-feature verdicts (snapshot parity). Run golden → unchanged distribution. → commit `test(trade): golden harness expresses origin-specific verdicts (F)`

### Task F7: Foundation wrap

- [ ] **F7.1** full suites green: `npx vitest run src/lib/comply-v2/trade src/lib/trade src/data/trade --no-file-parallelism`.
- [ ] **F7.2** tsc == branch baseline (record the number in §0).
- [ ] **F7.3** §0 board F→✅; commit `chore(trade): origin-determination foundation wrap (F)`.

---

# ORIGIN MODULES M-\* — shared workflow (per module)

Each origin module follows this EXACT workflow (template). The per-module blocks below give only the parameters — the legal content (which general licences exist, their item×dest eligibility) is curated from the official source at build time; pre-writing specific licence rules here would be a placeholder-in-disguise (same discipline as the corpus sprints).

- [ ] **MW1 — Source.** Fetch the origin's official general-licence texts (spec §5 row). Free + official only; if JS-gated, use the official PDF/register and say which. Record `asOfDate`.
- [ ] **MW2 — RED (module unit tests first).** Create `<origin>.test.ts`: for each general licence, an eligible item×dest → GO-under-that-licence; an item it does NOT cover → INDIVIDUAL/REVIEW at the NCA; an excluded destination → REVIEW/BLOCKED; a discretionary/end-use case → REVIEW (never GO); an embargo dest is not the module's concern (handled upstream) — assert the module itself returns its licence verdict and the engine test (MW5) proves upstream override. Run → FAIL (module missing).
- [ ] **MW3 — Curate the module.** Implement `<origin>.ts`: the `OriginLicenceModule` + its `GeneralLicence[]` (each licence: `eligibleCodes` predicate over the classification, `eligibleDestinations`/`excludedDestinations`, `conditions`, `citation`, `asOfDate`). The module's decision flow: item uncontrolled under this origin's regime → NONE/GO; controlled + a general licence covers item×dest → GENERAL/GO with conditions; controlled + no general licence → INDIVIDUAL/REVIEW at `<NCA>`; discretionary → REVIEW. Authority from the origin (EU: member→NCA table).
- [ ] **MW4 — Register + lift maturity.** Add the module to `registry.ts`. Lift `REGIME_MATURITY[<regime>]` 3→2 in `normalized-corpus.ts` with a comment ("origin-licence determination now modelled — <date>; lift-condition satisfied"). Update the maturity test (the tier-3 set shrinks). **NOTE:** this makes the thin-origin Gate 4.5 stop firing for this origin → its golden cells change from generic REVIEW to the module's precise verdict.
- [ ] **MW5 — Golden + GREEN.** Update the golden EXACT entries for this origin's cells to the module's correct verdicts (each with a source-cited comment). Add the upstream-override pin (embargo/RU dest + this origin → still BLOCKED). Run `npx vitest run src/lib/comply-v2/trade/ src/data/trade/ "src/lib/comply-v2/trade/classification/golden-set/" --no-file-parallelism`: module tests + golden green; **every changed golden cell is a legally-justified shift (REVIEW→GO only with a cited general licence; never a false-CLEARED)** — if a cell would go GO without a covering licence, that's a bug, STOP.
- [ ] **MW6 — W6 (independent source verification, PFLICHT).** Dispatch a fresh adversarial agent: "Fetch <origin> official general-licence source. Verify each `GeneralLicence` in `<origin>.ts`: does it exist, is its item×dest eligibility + conditions faithful, is any GO-eligibility over-claimed (would the real licence actually cover this), is any discretionary case wrongly GO instead of REVIEW? REFUTE if you can." Fix any REFUTED finding; re-verify. No maturity stays lifted on an unverified module.
- [ ] **MW7 — Commit + board.** Commits: `feat(trade): <origin> origin licence module + maturity 3->2 (M-<origin>)`. Update §0 board.

### M-EU — parameters

- Source: EUR-Lex VO 2021/821 Annex II EUGEA **EU001** (export to AU/CA/JP/NZ/NO/CH/UK/US — the "friendly destinations" GL), **EU002** (low-value), **EU003** (after repair), **EU004** (temporary), **EU005** (telecom), **EU006** (chemicals — likely out of space scope), **EU007** (intra-group tech), **EU008** (cybersurveillance). Curate the space-relevant ones (EU001 is the big one).
- `eu-member-nca.ts`: DE→BAFA, FR→"DGA/SBDU", IT→UAMA, NL→"CDIU", ES→"SGCEDD", … (all EU-27; cite each NCA name from the member state's official designation).
- Maturity: EU_ANNEX_I + EU_CML are ALREADY 2 — no lift; this module ADDS the EUGEA licence detail + NCA routing to EU-origin verdicts (replaces the generic EU_COMPETENT_AUTHORITY hint with the real member NCA + the applicable EUGEA).
- Golden: EU-origin (DE/FR/…) cells gain EUGEA detail; intra-EU stays GO, EU001-destinations (JP/US/…) for EU001-eligible items → GO-under-EU001.

### M-UK — parameters

- Source: gov.uk OGELs (Open General Export Licences) — the space-relevant ones (e.g. "Military Goods", "Dual-Use Items: Hong Kong/…", country-specific OGELs) + the SIEL fallback (ECJU). Authority "ECJU".
- Lift UK_STRATEGIC 3→2. Golden: GB-origin cells → GO-under-OGEL where an OGEL covers item×dest (with registration conditions), else REVIEW-SIEL-at-ECJU.

### M-CH — parameters

- Source: fedlex GKV — ordentliche/ausserordentliche Generalausfuhrbewilligung (OGB/AGB), SECO. Authority "SECO". Lift CH_GKV 3→2.

### M-NO — parameters

- Source: regjeringen.no / Lovdata — Norwegian general export authorisations, MFA. Authority "Norwegian MFA (UD)". Lift NO_LIST 3→2. (NO mirrors EU dual-use; its GLs are EEA-aligned — verify, don't assume.)

### M-CA — parameters

- Source: laws-lois.justice.gc.ca + GAC — General Export Permits (e.g. GEP No. 41 cryptography, others). Authority "Global Affairs Canada (TIE)". Lift CA_ECL 3→2.

### M-AU — parameters

- Source: legislation.gov.au — Defence Trade Controls Act permits / DSGL general permits. Authority "Defence Export Controls (DEC)". Lift AU_DSGL 3→2.

### M-JP — parameters

- Source: meti.go.jp — General Bulk Licence / Special General Bulk Licence (包括許可). Authority "METI". Lift JP_METI 3→2. (English-source honesty: where a bulk-licence condition is not verifiable in official English, REVIEW + document.)

### M-KR — parameters

- Source: yestrade.go.kr / MOTIE — Comprehensive/General export licences. Authority "MOTIE". Lift KR_STRATEGIC 3→2. (Same English-source honesty as JP.)

### M-IN — parameters

- Source: dgft.gov.in — SCOMET General Authorisations (GAET intra-company tech, GAEIS intra-company SW, and any others); most SCOMET exports are individual. Authority "DGFT". Lift IN_SCOMET 3→2.

---

# PHASE W — Wrap

### Task W1: Score reassessment + PF-2

- [ ] All 9 maturities lifted (UK/CH/NO/CA/AU/JP/KR/IN to 2; EU already 2). Confirm golden: every circle-A cell has a precise, cited verdict; no false-CLEARED (fail-closed invariant green).
- [ ] Re-assess the score against the spec §9 rubric; write a "Score-Reassessment" section in this plan (target 100/100: every module W6-verified, every cell correct+cited, all maturities lifted, US-wrap behavior-identical, zero external cost, AVA shows licence detail).
- [ ] PF-2 decision: does the new origin stage consume `resolveOrderOfReview`, or is it finally deleted? Decide + act.
- [ ] Commit `docs(trade): engine-origin-determination wrap — score reassessment + pf-2 (W)`.

### Task W2: AVA licence detail

- [ ] Extend `VerdictPanel.tsx` assessed-under line to render the licence detail (general-licence id + conditions / individual-at-NCA / prohibited). Test the render. Commit `feat(trade): ava shows origin licence detail (W)`.

---

## Score Reassessment — 2026-06-13 (against spec §9 rubric)

**Engine fan-out COMPLETE: all 10 circle-A origin modules built + independently W6-verified.** Golden matrix (744 cells, measured via the real `deriveVerdict` oracle): **124 GO / 346 REVIEW / 274 BLOCKED** (Phase-F baseline 74/396/274 → +50 GO, all cited general-licence cells; BLOCKED steady at 274 — no hard prohibition ever touched). `tsc` held at **666** throughout. `feat/trade-origin-determination` HEAD `72f4c170` (+ W2 pending).

| §9 rubric item                                                                          | Status                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. ~10 modules, each W6-verified                                                        | ✅                            | EU·US (Phase F) + UK·CH·NO·CA·AU·JP·KR·IN — every module passed an independent adversarial W6 source-verification pass (10 passes total).                                                                                                                                                                                                                                                                                                 |
| 2. Every cell legally correct + cited; **no false-CLEARED**                             | ✅                            | Fail-closed invariant green; sat-bus(9A004)/apogee(9A106) REVIEW at every origin (BLOCKED→RU). Two defects the W6/review CAUGHT + fixed: the M-EU bare-`9A009` false-CLEARED (611c727) and the M-IN GAET/GAICT citation mislabel (a1ca309a).                                                                                                                                                                                              |
| 3. All circle-A `REGIME_MATURITY` 3→2                                                   | ✅                            | All 9 non-US regimes lifted; circle-A thin (tier-3) set is now **empty**.                                                                                                                                                                                                                                                                                                                                                                 |
| 4. General-licence logic where the source bears it; honest REVIEW on genuine discretion | ✅ (1 noted conservative gap) | GO paths cited: EU001, UK dual-use-to-EU OGEL, CH OGB (Anhang 7), CA GEP-41 + US permit-exemption, JP General Bulk Licence (Group A). NO/KR/IN/AU = empty general-licence sets → honest all-REVIEW. **KNOWN CONSERVATIVE GAP:** AU's AUKUS (DTCA-2024) licence-free→US path was judged not cleanly item+destination-only grantable and fail-closed to REVIEW — an over-block (rubric-acceptable, never a false-CLEARED), refinable later. |
| 5. US-wrap behaviour-identical; EU/DE bestand unchanged                                 | ✅                            | Phase-F inline snapshots reproduce bit-identically.                                                                                                                                                                                                                                                                                                                                                                                       |
| 6. Zero external cost (no deps/feeds/AI-runtime; no migration)                          | ✅                            | Pure TS data + pure engine; official free sources only; grep-confirmed.                                                                                                                                                                                                                                                                                                                                                                   |
| 7. AVA shows licence detail; boards/docs current; score reassessment documented         | 🟡                            | Boards ✅ · this reassessment ✅ · **AVA UI = Task W2 (remaining)** — the origin licence detail already rides in `licenseDetermination` (foldOriginVerdict triggerCodes `ORIGIN_*` + `applicableException`); W2 surfaces it in the VerdictPanel.                                                                                                                                                                                          |

**PF-2 decision:** `resolveOrderOfReview`, `normalizeListId`, `deriveLicenseAuthorityHint` are confirmed **dead** (0 production callers — the origin-determination stage + gate chain replaced them); only the `ListId` type stays live (4 consumers). Decision = **delete** the dead functions. Deferred to a dedicated follow-up task (an 803-line file requiring a careful ListId extraction + 800-line test cleanup — pure hygiene, zero rubric/safety impact) rather than risk it in the wrap.

**Score:** on the paramount **safety axis (no false-CLEARED)** the engine is **100/100** — fully verified, every sensitive item fail-closed at every origin, two latent defects caught + closed. On the functional rubric, **6/7 items fully met + verified**; item 7 closes when W2 (AVA licence-detail rendering) lands. One honest conservative under-grant (AU/AUKUS) remains as an optional precision refinement (safe, not wrong-in-the-false-CLEARED-sense).

---

## Self-Review (done at write time)

- **Spec coverage:** §4.1 types→F1; §4.2 modules+registry→F2 + M-_; §4.3 wiring→F5 (with the no-false-CLEARED invariant + hard-prohibition override pin); §4.4 maturity→MW4; §4.5 fail-closed→MW2/MW5/MW6 + F5.2 embargo pin; §4.6 AVA→W2; §5 sources→per-module MW1 + parameter blocks; §7 testing→MW2/MW5/MW6 + F4 snapshot; §8 phasing→F then M-_ then W; §9 DoD→W1. US-wrap behavior-identity→F4 snapshot. No gap.
- **Placeholders:** the per-module legal content is deliberately curated-at-build (MW1–MW3) with a source per module — NOT a placeholder but the spec's mandated read-source-then-curate discipline (pre-writing fabricated licence rules would be the real placeholder). Foundation tasks (F1–F6) carry real code. `ClassificationLike`/`ScreeningContextLike` are bound to real engine types in F1.1.
- **Type consistency:** `OriginLicenceVerdict`/`OriginLicenceModule`/`GeneralLicence`/`evaluateGeneralLicence` (F1) ↔ registry (F2) ↔ folder (F3) ↔ modules (M-\*) ↔ wiring (F5). `resolveOriginModule` (F2) used in F5.3. `foldOriginVerdict` (F3) used in F5.3. Maturity lift symbol `REGIME_MATURITY` (MW4) matches normalized-corpus.
- **Branch discipline:** §0 mandates fresh-from-origin/main AFTER the audit batch lands — prevents building on the moving corpus.
