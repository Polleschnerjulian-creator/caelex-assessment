# Caelex Passage (Trade) — Bug + Improvement Findings, 2026-06-14

**Method:** multi-agent adversarial hunt — 7 dimension finders (fail-closed, intake, engine, security, origin/verdict/landscape, persistence, UX) → adversarial verification of every HIGH/MEDIUM bug (refute-by-default, code-traced + empirically reproduced where possible) → deduped synthesis. 47 raw findings → 26 verified real → 17 confirmed bugs + 8 improvements (7 refuted/dropped).

**Scope note:** the `failclosed` dimension finder dropped on an "Overloaded" API error, but the fail-open cluster surfaced redundantly through the intake/engine/persistence/origin finders (~9× across 5 dimensions). None of the fail-open cluster is in the prior `2026-05-30` Trade backlog (the scoped-intake postdates it; closest prior item is T-M5).

---

## 🔴 CRITICAL — the fail-OPEN cluster (LIVE in prod, one root cause)

> **A controlled item confirmed under a regime other than EU-dual-use / US-CCL / US-ITAR currently shows GO — including to embargoed RU/BY.** Reproduced empirically. This is the system's defined cardinal sin. The earlier `confirmed-code-cell.ts` fix (`c61d5e70`) only closed the `eccnEU` path (the one case the integration test covered); MTCR, German-AL, JP-METI, NSG, RU-833 and Wassenaar confirmations are still fail-open.

### B1 [ROOT CAUSE] Verdict engine reads only 3 of 5 regime cells → confirmed MTCR / German-AL code dropped → false GO incl. RU/BY

`src/lib/trade/classification/classify-item.ts:113-124,149-152,164-168` (+ `comply-v2/trade/property-trigger-engine.ts` ItemSignals)
`classifyItemForOperation` builds `ItemSignals` / `actualCodes` / `matchDeclaredCodes` from **only** `eccnEU`/`eccnUS`/`usmlCategory`. `ItemSignals` has no `mtcrCategory`/`germanAlEntry` field; no gate reads them. **Reproduced:** a confirmed `MTCR:Item-3.A.3` (rocket nozzle) or `DE-AL:0009` item → `runDestinationLandscape(seat=DE)` = GO across ~21 destinations **incl. RU + BY**, BLOCKED only IR/KP/SY/CU.
**Fix:** add mtcr/germanAl to `ItemSignals` + `actualCodes` + `matchDeclaredCodes`; a non-empty declared code must fire Gate 0/1.6 and raise ≥ REVIEW. Until then, fail-closed: a declared code on an unconsumable cell forces REVIEW.

### B2 confirmedCodeCell returns `{}` for JP-METI / NSG / RU-833 / Wassenaar → code dropped → UNCONTROLLED → GO to RU/BY

`src/lib/trade/intake/confirmed-code-cell.ts:58-73,80-97,124-128`
`cellForRegime`/`cellForPrefix` recognise only 5 regimes; everything else → empty. The scoped matcher surfaces confirmable JP-METI/NSG/RU-833 candidates (e.g. a SAR/spacecraft item surfaces `RU833:VII.9A004`). Confirming spreads `{}` onto the landscape item **and persists an empty cell**.
**Fix:** a confirmed code resolving to no engine-readable cell must FAIL CLOSED (block confirm, or carry a `declaredOtherCode` treated as controlled → REVIEW), never return empty.

### B3 Gate 1.6 (RU/BY ban) fires only on an EU-dual-use signal → code-only MTCR/DE-AL/JP-METI/NSG/RU-833 item to RU/BY passes as GO

`src/lib/comply-v2/trade/license-determination.ts:430-453`
RU/BY are not in `EMBARGOED_COUNTRIES` (CU/IR/KP/SY), so Gate 1.6 is the only RU/BY backstop — and it only fires on `eccnEU` / non-EAR99 `eccnUS` / the EU-US heuristic. A code-only item on another regime supplies none → ban skipped → RU/BY GO.
**Fix:** broaden the RU/BY signal to ANY declared control code on ANY regime cell → at minimum REVIEW; listed dual-use/military → BLOCK.

### B4 Regression guard tests only `EU:9A004` → all dropped-cell siblings unguarded (the reason the cluster shipped)

`src/lib/trade/intake/confirmed-code-landscape.integration.test.ts:44-56`
The one integration test "billed as catching what units miss" asserts fail-closed for exactly `EU:9A004` — the single regime mapping to a read cell (`eccnEU`). 7 of 10 surfaceable regimes map to an unread/empty cell and are untested.
**Fix:** parametrize the test over MTCR, DE-AL, JP-METI, NSG-TRIGGER, NSG-DU, RU-833, Wassenaar — each asserting no GO + RU/BY BLOCKED. (Fails now; passes after B1/B2/B3.)

### B5 LOW itemClass-prefix matches are one-click confirmable → arms the dropped-cell fail-open

`src/app/(trade)/trade/assess/_components/ClassifyConfirm.tsx:55-65,143-161`
The primary "Bestätigen" button renders for ANY top suggestion incl. LOW (itemClass-prefix-only, no decisive parametric match); only guard is a soft banner, button stays enabled.
**Fix:** for LOW, no one-click confirm — require typing/affirming the code or a decisive field. Pair with B1/B2 so a confirmed LOW code on a dropped regime degrades to REVIEW.

---

## 🔴 HIGH — RBAC fail-opens (separate from the cluster)

### B6 Sanctions-hit dismissal (`FALSE_POSITIVE_DISMISSED`) has no role gate → any VIEWER can clear a POTENTIAL_MATCH to CLEAR

`src/app/api/trade/parties/[id]/screenings/[screeningId]/decide/route.ts:43-69,99-104`
The most consequential verdict-flip (clearing a sanctions hit) is gated only on auth+entitlement — **no `role` check** — so a read-only VIEWER can dismiss a sanctions match. Inverted gradient: the read-only AI routes (extract-vision, licenses/parse) require MANAGER+.
**Fix:** gate `FALSE_POSITIVE_DISMISSED` behind MANAGER+ (VIEWER read-only); ideally four-eyes (different actor than who ran the screening).

---

## 🟠 MEDIUM

- **B7 [fail-open] EU001 over-eligibility:** `eu.ts:343-349,363-367,470-485` — a non-EAR99 `eccnUS` (e.g. `9A515.a.1`, 600-series) is treated as an EU Annex I code and gets a cited GENERAL/GO under EU001 to allies. Fix: derive EU001 eligibility from `eccnEU` only, or cross-walk `eccnUS`→EU first; unmirrored `eccnUS` → INDIVIDUAL/REVIEW.
- **B8 [fail-open] `isClassified` ignores mtcr/germanAl:** `operation-assistant.server.ts:37-48,200-238` — a from-datasheet item with the code on mtcr/germanAl reads "noch nicht klassifiziert" (honesty defect, live). Fix together with B1.
- **B9 `from-datasheet` ACCEPTED sign-off ungated:** `assess/from-datasheet/route.ts:111-122,173-200` — a VIEWER can mint a confirmed classification + audit stamp (the real `recordDecision` enforces MEMBER+ four-eyes). Fix: require MEMBER+.
- **B10 Upload path drops suggestions + rawText:** `AssessFlow.tsx:190,242-253,489-507` — `rawText` is a stateless `useState` (always empty) and `p.suggestions` is never read → DCW-1 keyword/declared-code/org-precedent recall is dead on /trade/assess. Fix: thread rawText + carry suggestions to confirm.
- **B11 [fail-open] Only 12 of ~68 corpus item-classes have a product category:** `product-categories.ts`; `AssessFlow.tsx:175-180,247-253` — uncovered controlled goods (propulsion.nozzle, reentry_vehicle, crypto, graphite_nuclear_grade…) get mis-scoped or have no honest manual path. Fix: add an "Andere — nicht gelistet" category (no itemClass, forces text/declared-code recall + REVIEW); wire `handleManual` to a real code-entry surface.
- **B12 LOW-confidence vision attributes silently auto-seed the matcher:** `AssessFlow.tsx:138-157`; `ScopedItemForm.tsx:65-96` — `prefillFromPayload` copies EVERY attribute regardless of confidence (comment claims high/medium only); a single LOW decisive read can flip the suggestion to MEDIUM. Fix: filter prefill to high/medium or badge LOW reads.
- **B13 Line DELETE/PATCH never recompute the operation:** `operations/[id]/lines/[lineId]/route.ts:86-96,184-210` — stale riskScore/catch-all/notificationDuty flow into the BAFA-XML export; DELETE writes no AuditLog. Fix: call `recomputeOperation` after DELETE/PATCH + audit the delete.
- **B14 [fail-open] Landscape route validates only `name`, passthrough-es the rest:** `assess/landscape/route.ts:28-31,53-56` — the GO/REVIEW/BLOCKED chokepoint accepts arbitrary/absent control cells with a 200. Fix: validate `exporterSeat` (ISO-2) + downgrade to REVIEW when the code maps to no engine-readable signal.
- **B15 deriveRelevantAttributes is BIDIRECTIONAL but the matcher prefix op is UNIDIRECTIONAL:** `derive-relevant-attributes.ts:10-16,31-42` — the form asks for fields the matcher can never match (live: `gnss.receiver` vs USML `gnss.receiver.antijam` → asks `isAntiJam` but the matcher gates the deeper class). Fix: align the two matching rules.

## 🟡 LOW

- **B16 detect-category lacks the dot-boundary guard** its sibling modules use → cross-class false matches (`detect-category.ts:21-27`).
- **B17 ScopedItemForm seeds field values once (lazy init)** → a prefill change for the same categoryId is ignored (latent; `ScopedItemForm.tsx:65-72`).
- **B18 ClassificationPreview hides a LOW candidate** that ClassifyConfirm presents as confirmable → two screens disagree (safe direction; `ClassificationPreview.tsx:32-34`).

## Improvements (ranked)

- [M] Render boundary-MEDIUM matches with a distinct caveat, not the green success check (`ClassificationPreview.tsx`).
- [M] Add a specific-vs-generic specificity tie-break to candidate ranking (`parametric-matcher.ts:347-358`) — also addresses the 9A004-vs-7A004 point.
- [M] Pass mtcr/germanAl into `matchDeclaredCodes`; a controlled corpusMatch tightens the gate (`classify-item.ts:164-168`).
- [M] Feed scoped `parametricAttributes` into the operation classifier, or explicitly label them audit-only (`AssessFlow.tsx`; `from-datasheet/route.ts`).
- [L] Persist `disclaimerAtReview` + consult org four-eyes policy on the from-datasheet ACCEPTED draft.
- [L] Emit AuditLog + ops-event when from-datasheet persists a confirmed classification.
- [L] Close the `auto-classify-on-create` vs `confirmedCodeCell` prefix-mapper drift (add DE-AL; share one mapper).
- [L] Tighten input validation on Trade write routes (seat ISO-2, FMV bounds, import origin, Zod issue leakage).

## Dropped (adversarially refuted)

Operation de-minimis omits usContentEccns (refuted — 9A515 carries eccnUS so Gate 3.5 fires) · Landscape "trusts client item / diverges from verdict" (refuted — same pure mapper) · de-minimis provenance hardcoded (fail-closed-correct) · suffix-digit-correlator dead module (cleanup only) · US-origin no-nexus GO wording (no-op fold) · matchDeclaredCodes omission standalone (no live consumer → folded into improvements) · "Code manuell wählen" dead-end (folded into B11).

---

## Recommended fix order

1. **B1 + B2 + B3 + B4 as ONE root-cause fix** (engine reads all declared regime cells + fail-closed for unmappable + Gate-1.6 broadened + parametrized regression). Closes the entire live fail-open cluster. **Hotfix-worthy.**
2. **B6** (sanctions-dismissal role gate) + **B9** (from-datasheet role gate) — RBAC, quick.
3. **B7** (EU001 over-eligibility), **B5** (LOW one-click confirm), **B14** (landscape API validation).
4. The remaining MEDIUM/LOW + improvements as a batch.
