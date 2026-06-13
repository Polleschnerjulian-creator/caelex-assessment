# Passage Datasheet-Intake („Datenblatt → Einschätzung") — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — pending spec review → writing-plans
**Surface:** Caelex **Passage** / Trade (`src/app/(trade)/trade/`) — export-control automation for space companies.
**Builds on:** the Engine-Origin-Determination shipped to prod main `77179de3` (10 circle-A origin modules; per-item × destination verdict with cited general licences; fail-closed, no false-CLEARED).

---

## 1. Goal (one sentence)

A space company uploads a product **datasheet (PDF)** and gets, in one guided flow, (a) an **instant, evidence-cited export classification** (ECCN/USML), (b) a **global "where can I ship this?" landscape** (GO / REVIEW / BLOCKED per destination), and (c) a **sharp, audit-trailed single verdict** once they name the real destination + buyer — with the exact licence path.

## 2. Why a 2-beat flow (the honest domain truth)

A datasheet answers only **WHAT** the item is. A real export verdict also needs **WHERE** it goes (destination) and **TO WHOM / FOR WHAT** (end-user → sanctions screening; end-use → catch-all). The same 9A004 satellite bus is _GO under EU001_ to the US, _BLOCKED_ to Russia, _REVIEW_ to India — the datasheet never changes; the destination + buyer decide. So:

- **Beat 1 — Classify** (instant, from the datasheet): the "wow", but only a classification.
- **Beat 2 — Assess** (destination + screened buyer): the legally complete GO/REVIEW/BLOCKED verdict.

The **Liefer-Landkarte** bridges the two: right after classification — before the user types a single destination — Passage runs the engine across ~18 relevant destinations under a _clean-buyer assumption_ and shows the global landscape. This is the headline differentiator and is **nearly free**, because the engine already computes per-destination verdicts (it is literally the golden-matrix harness pattern applied to one real item at runtime).

## 3. User-facing flow (4 screens, route `/trade/assess`)

1. **Upload.** A drop-zone: "Produkt-Datenblatt hier ablegen (PDF, max 5 MB)". Reuses `DatasheetDropzone`.
2. **Classify (Beat 1).** Extraction runs; Passage shows the **top classification** (`9A004 — Spacecraft/Satellitenbus · EU dual-use · MTCR-relevant`), the **evidence spans** from the datasheet ("3-axis stabilized", "payload 500 kg"), a **confidence**, and ranked **alternatives**. The operator **confirms with one click** or picks an alternative / edits the code.
   - **Hard safety rule (§7):** the classification is NEVER auto-applied to a verdict without this human confirm. A wrong ECCN → wrong verdict → the catastrophic false-CLEARED. The confirm is one click (pre-filled + evidence shown), not a form.
3. **Liefer-Landkarte (the genial moment).** Immediately after confirm, three buckets:
   - 🟢 **GO** (with a named general licence): US, JP, CA, AU, NZ, NO, CH, GB, EU-27 (sample), …
   - 🟡 **REVIEW** (individual licence at the NCA): India, China, …
   - 🔴 **VERBOTEN**: Russia, Belarus, Iran, North Korea, Syria, Cuba, …
   - Caption (mandatory, honesty): _"Annahme: sauberer Endkunde — im nächsten Schritt mit dem echten Käufer verschärft."_
   - The user picks **one destination** from the map (or types one) → Beat 2.
4. **Einzelurteil (Beat 2).** Two inputs: **Endkunde** (screened against sanctions/Annex-IV) + optional **Endverwendung**. Confirming creates a real `TradeOperation` + line, so the **existing `VerdictPanel` renders Screen 4 unchanged** via its `/api/trade/operations/{id}/assess` endpoint (incl. the W2 origin-licence-detail line) — the precise **GO / REVIEW / BLOCKED** with the exact licence + conditions + cited reasons. Stored with an audit trail.

## 4. Architecture — reuse vs. new

**Reused (≈80 %, no change):**

| Capability                                                         | Where                                                                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datasheet PDF → attributes (regex + Claude Vision, merged, cached) | `extractDatasheet()` (`src/lib/trade/datasheet-extractor.ts:478`), `POST /api/trade/classify/extract-vision`, `claude-vision-extractor.server.ts`, `DatasheetDropzone.tsx` |
| Attributes/text → ranked ECCN/USML/Annex-I proposals               | `suggestionsFromAttributesAndText()` (`src/lib/trade/classify-suggest.ts:129`)                                                                                             |
| Item × destination → verdict (the deployed engine)                 | `classifyItemForOperation(item, opts)` (`src/lib/trade/classification/classify-item.ts:105`) → `determineLicenseRequirements` → origin-determination stage                 |
| Verdict aggregation (GO/REVIEW/BLOCKED + steps + licence detail)   | `deriveVerdict(lines, screening)` (`src/lib/trade/operation-assistant-verdict.ts:439`)                                                                                     |
| Audit-grade proposal persistence                                   | `TradeItemClassificationDraft` (Prisma)                                                                                                                                    |
| Single-verdict render (incl. origin licence detail, W2)            | `VerdictPanel.tsx`                                                                                                                                                         |
| Counterparty sanctions screening context                           | existing screen-party path feeding `screeningContext`                                                                                                                      |

**New (the glue + the landscape):**

1. **`/trade/assess`** — the guided 4-screen flow (client). A focused wizard distinct from the existing power-user `operations/new`. The existing manual flow stays.
2. **Liefer-Landkarte runner** — `src/lib/trade/landscape.server.ts`: pure server function `runDestinationLandscape(item, { exporterOrigin, exporterSeat }): LandscapeResult`. For each destination in a curated `LANDSCAPE_DESTINATIONS` set, it runs **exactly** the proven golden-harness pipeline — `classifyItemForOperation(item, { destinationCountry, exporterOrigin, exporterSeat, screeningContext: CLEAN })` → `deriveVerdict([line], SYNTHETIC_CLEAR_SCREENING)` — and buckets each result GO/REVIEW/BLOCKED with the cell's cited licence/reason. No DB, no AI, no external call → runs in one request.
3. **`POST /api/trade/assess/landscape`** — thin route wrapping the runner for a confirmed classification.
4. **Persistence wiring** — on "confirm classification" create a `TradeItem` (status `REQUIRES_REVIEW`, the confirmed/edited code) + the `TradeItemClassificationDraft` (already supported); on the single verdict create a `TradeOperation` + line and run `assessOperation` (existing), storing the verdict for the audit trail.

## 5. The Liefer-Landkarte — mechanism + destination set

- **Mechanism = the golden-set matrix harness, productized.** The golden harness (`golden-set.test.ts` `runPipeline`) already proves: `originRegimes(seat)` → `classifyItemForOperation(item, {destinationCountry, exporterOrigin, exporterSeat})` → `deriveVerdict([line], SYNTHETIC_CLEAR_SCREENING)` yields the correct, cited per-destination verdict. The runner is that loop over real input. This guarantees the landscape and the eventual single verdict are computed by the **same engine** (no divergence).
- **`LANDSCAPE_DESTINATIONS` (curated ~18):** the EU001/friendly set (US, JP, CA, AU, NZ, NO, CH, GB) + an EU-27 sample (DE, FR, IT, NL, ES) + the watch set (IN, CN) + the hard-block set (RU, BY, IR, KP, SY, CU) so the red zone is visible. Stored as a small constant with a comment; tuned later. (Pulling the _exporter's own_ country is excluded — that is intra-EU/domestic, handled separately.)
- **Clean-buyer assumption (load-bearing honesty):** the landscape uses `SYNTHETIC_CLEAR_SCREENING` (no specific end-user). It therefore shows the **destination-law** picture only; a listed/end-use-tainted buyer can still turn a green destination into BLOCKED in Beat 2. The caption states this; Beat 2's verdict (real screening) is authoritative. The landscape **never** downgrades a hard prohibition — a 🔴 destination stays 🔴 regardless of buyer.

## 6. Data flow (end-to-end)

```
PDF ─▶ /api/trade/classify/extract-vision ─▶ MergedExtraction (attributes + evidence)
     ─▶ suggestionsFromAttributesAndText() ─▶ ranked proposals  ──▶  [Screen 2: confirm]
confirm ─▶ persist TradeItem (REQUIRES_REVIEW, code) + TradeItemClassificationDraft (audit)
        ─▶ /api/trade/assess/landscape ─▶ runDestinationLandscape() ─▶ buckets  ──▶  [Screen 3: map]
pick destination + enter buyer ─▶ create TradeOperation + line ─▶ assessOperation()
        ─▶ deriveVerdict(lines, REAL screening) ─▶ VerdictResult  ──▶  [Screen 4: VerdictPanel]
```

## 7. Safety invariants (export-control-critical — non-negotiable)

1. **Human confirms the classification** before any verdict is shown (Screen 2). No auto-applied classification → no auto-verdict on an unconfirmed code.
2. **No false-CLEARED** — inherited from the engine: every GO (landscape or single) is backed by a cited general licence; uncertain/discretionary → REVIEW; hard prohibitions (embargo / RU-BY / Annex-IV / ITAR) are never overridable. The landscape uses the same engine, so the same guarantee holds.
3. **Clean-buyer caption is mandatory** on the landscape — a green there is "destination-clear, buyer-unchecked", explicitly stated; the real verdict comes in Beat 2.
4. **Low-confidence / no-extraction is honest** — if extraction yields nothing usable or confidence is low, Screen 2 says "konnte nicht sicher klassifizieren — bitte Code manuell wählen" and offers manual entry; it never guesses a code to fabricate a green.
5. **Audit trail** — the confirmed classification (with evidence + who/when) and the verdict are persisted; an export decision must be reconstructable after the fact.

## 8. Error handling / edge cases

- **Extraction fails / non-PDF / >5 MB** → the existing route's 400/413 responses surface as a friendly Screen-2 message + manual-code fallback.
- **Vision/AI unavailable** → regex extractor still runs; if both empty → manual entry (never a blank green).
- **Item resolves to USML/ITAR** → handled by the engine's upstream DDTC gate; landscape shows the ITAR picture; single verdict names DDTC. (No origin general licence applies to ITAR — correct.)
- **Multiple plausible codes** → the alternatives list lets the operator pick; the chosen code drives the landscape + verdict.
- **Sensitive MTCR codes (9A004/9A106)** → stay REVIEW/BLOCKED appropriately (engine's fail-closed floor); the landscape will not show them as a bare GO to a destination where the law requires an individual licence.

## 9. Testing strategy

- **`landscape.server.test.ts`** — unit-test `runDestinationLandscape` for the reference golden items: e.g. a 9A004 bus from DE buckets US/JP/EU as GO-with-licence, IN/CN as REVIEW, RU/BY/embargoes as BLOCKED; an uncontrolled item is GO everywhere; an ITAR item routes to DDTC. Assert it matches `deriveVerdict` per cell (same engine → reuse the golden expectations).
- **Fail-closed invariants** — no landscape cell is GO for a sensitive MTCR code where the engine pins REVIEW; every GO carries a cited licence; embargo destinations always BLOCKED.
- **Flow integration** — a server test threads a fixture extraction → confirm → landscape → single verdict and asserts the single verdict for the picked destination equals the landscape bucket for that destination under a clean buyer (consistency), and tightens (never loosens) under a tainted buyer.
- **Route tests** — `/api/trade/assess/landscape` auth-gated, validates input, returns buckets.
- **Component** — the new flow's classification-confirm + landscape render (jsdom; note the known local node-version test-runner caveat — runs in CI/node-20).

## 10. Scope

**v1 (this spec):** 1 datasheet → 1 product → confirm classification → Liefer-Landkarte → 1 chosen destination + buyer → audit-trailed single verdict. Reuses all existing engines; new = `/trade/assess` flow + `landscape.server.ts` + the landscape route + persistence wiring.

**Non-goals / fast-follows (NOT v1):**

- Multiple products per shipment (multi-line operations) in the fast-track flow.
- Persisting the **raw datasheet file** to R2 (v1 keeps the extraction snapshot + draft evidence for audit; the binary archive is a follow-up).
- Astra-proposal-queue integration of the fast-track classification.
- Tuning/expanding `LANDSCAPE_DESTINATIONS` beyond the initial ~18.
- A public/anonymous "quick-check" variant (v1 is logged-in operator only).

## 11. Files

**Create:** `src/app/(trade)/trade/assess/page.tsx` (+ `_components/` for the wizard steps); `src/lib/trade/landscape.server.ts` + `.test.ts`; `src/app/api/trade/assess/landscape/route.ts` (+ route test).
**Modify (light):** a nav entry to `/trade/assess`; reuse — not fork — `DatasheetDropzone`, `VerdictPanel`, `classifyItemForOperation`, `deriveVerdict`, `assessOperation`, `TradeItemClassificationDraft`.
**No new deps, no DB migration in v1** (uses existing tables; persistence wiring only). Engine + extraction are unchanged.
