# Caelex Scholar — Planspiele Scenario Slate (Design Spec)

**Date:** 2026-06-08
**Author:** Scholar Planspiele lead (design synthesis of 6 corpus-grounded scenario agents)
**Status:** PLANNING ONLY — research + design. No implementation. Scholar-scoped; corpus + engines consumed READ-ONLY.
**Scope:** Six ADDITIONAL Planspiele scenarios that plug into the already-live engine. The MVP Planspiele engine (types, scorer, sim-coach, role-gated workflow, monochrome cockpit) and the flagship `asi-reentry-it` are ALREADY BUILT + in production. This spec designs what comes next.

---

## 0. How to read this spec / the engine contract being honoured

Every scenario below mirrors the flagship `src/data/scholar/planspiele/asi-reentry.ts`. The contract is fixed by:

- **Type** — `src/data/scholar/planspiele/types.ts`. `ScholarRoleKey` is a closed 7-member union (`operator | regulator | counsel | insurer | debris_stm | eu_body | ngo`). `ScholarArtifactKind` is a closed 4-member union (`authority_choice | application_form | cover_letter | deficiency_response`). A phase's rubric weights MUST sum to 100. `ScholarArtifactField.type` ∈ `boolean | select | text`.
- **Track-1 scorer** — `src/lib/scholar/planspiele/scoring.server.ts`. `scorePhaseEngine()` grades `track:"engine"` criteria against a per-scenario `ANSWER_KEY`. Today only THREE engine branches exist: `authority_correct` (exact-match `answer.authority === key.authority`), `mandatory_modules` (ratio of present booleans in `key.mandatoryModules` × weight), `casualty_threshold` (exact-match `answer.casualtyRisk === key.casualtyRisk`). Any other engine-criterion key falls through to the defensive `earned:0` branch — so **new engine criteria need a new code branch + an `ANSWER_KEY` entry.**
- **Track-2 coach** — `src/lib/scholar/planspiele/sim-coach.server.ts`. Grades `track:"ai"` free-text criteria. ZERO-COST no-key fallback: `fallbackReview()` scores generically EXCEPT it special-cases a criterion literally keyed `"citation_accuracy"` (passes when `countCitations(text) >= max(1, minCitations)`, notes `coach.cites.ok` / `coach.cites.few`). **Design implication:** name every free-text citation criterion `citation_accuracy` to inherit the smart fallback; other ai-track keys get the generic length/quality fallback (fine).
- **Workflow** — `src/lib/scholar/planspiele/sim-workflow.server.ts`. Generic role-gated advance; any ordered phase list works. `advanceRequiresRole` is a single role; the guard is one-shot (no looping). The AI counterparty's pushback (regulator deficiency, insurer coverage position, competing-admin objection) is a COACH PROMPT inside a phase, not a workflow transition — exactly as the flagship's AI regulator works.
- **i18n** — `src/app/(scholar)/scholar/_i18n/planspiele-play.ts`. Flat dotted keys (`asi.p1.title`). EN is source-of-truth; missing locales degrade to EN. New scenario = new prefixed key block.
- **Registry** — `src/data/scholar/planspiele/index.ts`. `SCENARIOS` array. Add one import + one array entry per scenario. (Note: `getScenarioById` returns `null`, not `undefined`, on a miss.)
- **Integrity test** — `src/data/scholar/planspiele/scenarios.test.ts`. Enforces: registry round-trip; **every phase rubric sums to 100**; phases contiguous + strictly ordered; `studentRole` + every `aiRoles[]` member declared in `roles[]`; and **every `citedSourceIds` id resolves via `getLegalSourceById` and every `citedCaseIds` id via `getCaseById`** (`toBeTruthy()`).

### Corpus-resolution rule the whole slate depends on (VERIFIED)

I traced the resolvers in this worktree:

- `getLegalSourceById(id)` (`src/data/legal-sources/index.ts:909`) searches `ALL_SOURCES`. **`ALL_SOURCES` (index.ts:166) spreads ONLY the `LEGAL_SOURCES_*` arrays — it spreads ZERO `AUTHORITIES_*` arrays** (verified by `grep -c AUTHORITIES_` over the array body = 0).
- `getCaseById(id)` (`src/data/legal-cases/index.ts:80`) searches `ATLAS_CASES`. `cases.ts` imports and spreads `...ATLAS_CASES_RESEARCH_2026_05`, `...ATLAS_CASES_P5_2026_05`, `...ATLAS_CASES_P5B_2026_05` (cases.ts:1687/1695/1705), so additions-file cases DO resolve.

**Consequence (load-bearing):** any id that lives in an `AUTHORITIES_*` array — `EU-EUSPA`, `EU-EC`, `FR-CNES`, `UK-CAA`, `LU-LSA`, `DE-BAFA`, `US-DDTC`, `US-BIS` — is **NOT resolvable** by `getLegalSourceById` and **MUST NOT** appear in any `citedSourceIds`. It may be referenced by NAME in briefs / answer-key prose. This is verified, not assumed: I grepped each id to its array (all returned `AUTHORITIES_*`). One incoming design (TCO) violates this and is corrected in §2.5 and called out as a build blocker in §5.

### Slate-wide corpus verification (what I personally confirmed)

I grepped every `id: "..."` cited across all six designs against `src/data/legal-sources/` and `src/data/legal-cases/`. **Every cited SOURCE id resolves in a `LEGAL_SOURCES_*` array, and every cited CASE id resolves in `ATLAS_CASES`** — with the single exception of the TCO authority-record misuse, fixed below. Confirmed-resolvable ids used by this slate:

- Sources: `DE-SATDSIG-2007`, `DE-SATDSIV-2008`, `DE-RAUG-1990`, `DE-WRG-ECKPUNKTE-2024`, `DE-TKG-2021`, `DE-NIS2UMSUCG-DRAFT`, `DE-DUALUSE-2021`, `DE-AWG-2013`, `DE-AWV-2013`, `DE-BSIG-NIS2`, `EU-SPACE-ACT`, `EU-NIS2-2022`, `EU-CRA-2024`, `FR-LOS-2008`, `LU-SPACE-ACTIVITIES-2020`, `UK-SIA-2018`, `US-ITAR`, `US-EAR`, `US-OFAC-SANCTIONS-PROGRAMS`, `INT-LIABILITY-1972`, `INT-ENISA-SPACE-2023`, `INT-NIST-IR-8270`, `INT-ITU-RR`, `INT-ITU-CONST`, `INT-ITU-WRC-23`, `INT-ITU-RES-35`.
- Cases: `CASE-DE-OVG-SATELLITE-DATA-2020`, `CASE-DE-VG-MUNCHEN-LICENCE-2018`, `CASE-VIASAT-KA-SAT-CYBERATTACK-2022`, `CASE-AMOS-6-INSURANCE-2017`, `CASE-VIASAT-3-INSURANCE-2023`, `CASE-ITT-ITAR-2007`, `CASE-BAE-ITAR-2011`, `CASE-ZTE-EAR-2017`, `CASE-LORAL-1996`, `CASE-EU-EUTELSAT-ONEWEB-MERGER-2023`, `CASE-UK-SAXAVORD-LICENCE-2023`, `CASE-EUTELSAT-V-SES-28E-2014`, `CASE-LIGADO-V-INMARSAT-2025`, `CASE-GALAXY-15-ZOMBIE-2010-2024`, `CASE-ITU-RES35-MILESTONE-NGSO-2024`.

NOT-resolvable-as-sources (authority records — name-only): `EU-EUSPA`, `EU-EC`, `FR-CNES`, `UK-CAA`, `LU-LSA`, `DE-BAFA`, `US-DDTC`, `US-BIS`.

---

## 1. Slate overview — domains, learning spread, archetypes

Six scenarios deliberately spread across **regulatory domains**, **jurisdictions**, **student roles**, and **legal skills** so the slate reads as a _curriculum_, not six copies of one demo. Together with the live flagship (`asi-reentry-it` — IT / debris / operator-vs-regulator), the surface would carry **seven** Planspiele covering eight regulatory modules.

| #   | id                          | Jurisdiction | Module         | Student role           | AI role(s)                | Archetype                        | Fits engine as-is?              | LV  | Effort |
| --- | --------------------------- | ------------ | -------------- | ---------------------- | ------------------------- | -------------------------------- | ------------------------------- | --- | ------ |
| —   | `asi-reentry-it` (LIVE)     | IT           | debris         | operator               | regulator                 | Authorise-vs-regulate            | yes                             | —   | —      |
| 1   | `de-leo-eo`                 | DE           | authorization  | operator               | regulator                 | Authorise-vs-regulate (sibling)  | **almost** (1 scorer branch)    | 5   | S      |
| 2   | `nis2-orbit-cyber-incident` | EU           | nis2           | operator               | regulator                 | Incident clock                   | no (new kind OR cheap fallback) | 5   | M      |
| 3   | `insurance-placement-claim` | FR           | insurance      | operator               | insurer                   | Place-to-claim negotiation       | **yes** (additive branches)     | 5   | M      |
| 4   | `de-bafa-dualuse-export`    | DE           | export-control | counsel                | regulator                 | Classify → licence → comply      | almost (data + 3 tiny branches) | 5   | M      |
| 5   | `tco-equivalence-eu`        | EU           | authorization  | counsel                | eu_body + regulator       | Cross-border forum + equivalence | **yes** (additive branches)\*   | 5   | M      |
| 6   | `itu-leo-coordination`      | INT          | spectrum       | regulator (home admin) | eu_body (competing admin) | Two-administration coordination  | **yes** (additive branches)     | 5   | M      |

\* TCO fits the engine, but ONLY after the §2.5 corpus correction (move 4 authority ids out of `citedSourceIds`).

**Learning spread achieved:**

- **Domains:** authorisation (×3, but each a different skill — single-jurisdiction dossier, cross-border forum/equivalence, fragmented-authority), debris (flagship), cyber/incident reporting, insurance/claims, export control, ITU spectrum. Eight of the platform's compliance modules are touched.
- **Jurisdictions:** IT (live), DE (×2), FR, EU (×2), INT. Germany and the EU layer get the deepest treatment — matching the platform's German + EU centre of gravity.
- **Student roles exercised:** `operator` (1, 2, 3), `counsel` (4, 5), `regulator` (6, as the home Administration). AI plays `regulator`, `insurer`, `eu_body`. This is the full "useful" subset of `ScholarRoleKey`; `debris_stm` and `ngo` remain unused (candidates for a future STM/space-traffic or environmental-NGO scenario).
- **Legal skills:** competent-authority determination, scope-trigger/threshold reasoning, dossier assembly, deficiency-cure craft, statutory-clock compliance, exclusion negotiation, proportionate-payout quantification, jurisdiction triage, item classification, enforcement/self-disclosure strategy, extraterritorial reach, forum analysis, equivalence/mutual-recognition, ITU procedural sequencing, interference/priority doctrine.
- **Track coverage:** every scenario exercises BOTH tracks (engine-graded objective phases + AI-coached free-text phases), so each run is also a proof that the Track-1/Track-2 split works end-to-end.

**Demo arc recommendation:** lead with the live flagship (`asi-reentry-it`), then `de-leo-eo` ("same skill, new jurisdiction — and Germany has no space law"), then `nis2-orbit-cyber-incident` ("the timeline IS the law") for the cinematic countdown. `de-bafa-dualuse-export` is the strategic showpiece because it teaches Scholar-side exactly what the commercial Trade/Passage product automates.

---

## 2. Scenario designs

> Convention used in every phase table: **E** = `track:"engine"` (deterministic, answer-key), **AI** = `track:"ai"` (sim-coach). Rubric weights per phase sum to 100 (integrity-test requirement; verified for all phases below).

---

### 2.1 `de-leo-eo` — German LEO Earth-Observation Authorization (BAFA / SatDSiG)

**One line:** The German sibling of the ASI flagship. Student = German operator seeking authorization for a sub-metre LEO Earth-observation satellite; AI = German NCA (BAFA under SatDSiG, BSI for IT-conformity). The teaching pivot is uniquely German: Germany has **no national space law in force** and **no single space regulator**, so a high-resolution EO satellite is licensed today by an export-control office (BAFA) under a 2007 data-security statute.

**Difficulty:** INTERMEDIATE · **Est.:** 35 min · `studentRole: operator` · `aiRoles: [regulator]` · `module: authorization` · `jurisdiction: DE`

**Operator profile:** `{ activityType:"spacecraft", entitySize:"medium", establishment:"eu", primaryOrbit:"LEO", operatesConstellation:false, hasPostLaunchAssets:true, offersEUServices:true }`

**Learning objectives**

1. Competent-authority determination under a FRAGMENTED national regime — identify BAFA (not BMFTR / DLR / BNetzA) and articulate WHY Germany has no single space regulator.
2. Scope-trigger reasoning — apply the SatDSiV §1 ground-sample-distance thresholds (optical ≤2.5 m, SAR ≤3 m, TIR ≤5 m, hyperspectral ≤10 m); the classic "design to 3–5 m to avoid licensing" decision.
3. Dossier assembly under SatDSiG §§3–9 — data-security concept, BSI TR-03140 IT-conformity, BNetzA frequency assignment, NIS2/BSIG registration; distinguish the EO operating licence from the parallel spectrum + cyber obligations.
4. German-vs-EU interplay — national SatDSiG via BAFA today; the directly-applicable EU Space Act adds the first EU-wide authorization + insurance mandate (~2030, no transposition), unlike NIS2 (which Germany DID transpose via NIS2UmsuCG, in force 6 Dec 2025).
5. Deficiency-response craft — cure a notice grounded in real German case law (OVG Berlin-Brandenburg, §16 SatDSiG disclosure duties).

**Roles:** `operator` = Satellite Operator (Applicant) — lowest-friction German authorization, correct authority, complete dossier; private: ~0.7 m GSD → in scope, can't dodge BAFA; TR-03140 not yet certified; BNetzA frequency pending. `regulator` = German NCA (BAFA + BSI input) — grant only on a complete, well-grounded dossier; private: auto-deficiency if §16 data-distribution-control commitment or TR-03140 note is missing.

**Phases**

| #   | phaseKey       | Artifact kind                                                                                                                                                          | Rubric (key · weight · track)                                                      | Cited sources                                                              | Cited cases                       |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| 1   | `authority`    | `authority_choice` (select `authority` ∈ [BAFA, BMFTR, DLR, BNetzA] + text `justification`)                                                                            | `authority_correct` 60 **E** · `justification_quality` 40 **AI**                   | `DE-SATDSIG-2007`, `DE-RAUG-1990`, `DE-WRG-ECKPUNKTE-2024`                 | `CASE-DE-VG-MUNCHEN-LICENCE-2018` |
| 2   | `application`  | `application_form` (bool `dataSecurityConcept`, `itConformity`, `frequencyAssignment`, `nis2Registration` + select `resolutionBand` ∈ [≤2.5m-optical, >2.5m..5m, >5m]) | `mandatory_modules` 70 **E** · `resolution_band` 30 **E**                          | `DE-SATDSIG-2007`, `DE-SATDSIV-2008`, `DE-TKG-2021`, `DE-NIS2UMSUCG-DRAFT` | `CASE-DE-VG-MUNCHEN-LICENCE-2018` |
| 3   | `cover_letter` | `cover_letter` (`minCitations: 2`)                                                                                                                                     | `legal_basis` 40 **AI** · `completeness` 30 **AI** · `citation_accuracy` 30 **AI** | `DE-SATDSIG-2007`, `DE-SATDSIV-2008`, `EU-SPACE-ACT`                       | `CASE-DE-OVG-SATELLITE-DATA-2020` |
| 4   | `deficiency`   | `deficiency_response`                                                                                                                                                  | `addresses_deficiency` 60 **AI** · `revision_quality` 40 **AI**                    | `DE-SATDSIG-2007`, `DE-NIS2UMSUCG-DRAFT`                                   | `CASE-DE-OVG-SATELLITE-DATA-2020` |

All `advanceRequiresRole: "operator"`.

**ANSWER_KEY** (`scoring.server.ts`):

```
"de-leo-eo": {
  authority: "BAFA",
  mandatoryModules: ["dataSecurityConcept","itConformity","frequencyAssignment"],
  resolutionBand: "<=2.5m-optical",
}
```

Engine criteria: `authority_correct` (existing branch, exact match → BAFA). `mandatory_modules` (existing ratio branch over the three SatDSiG-licensing-critical booleans; `nis2Registration` deliberately EXCLUDED to test over/under-inclusion). `resolution_band` (**NEW** branch — verbatim clone of `casualty_threshold` reading `answer.resolutionBand`/`key.resolutionBand`, notes `de-eo.fb.resolution.ok`/`.wrong`).

**Effort: S.** Fits the engine but for ONE ~6-line scorer branch (`resolution_band`) + the answer-key entry. Reuses all 4 existing artifact kinds and 2 of the 3 existing engine branches. New data file `de-leo-eo.ts`, registry line, `de-eo.*` i18n block (DE recommended since German scenario; not required for green tests). A zero-code fallback exists (name the field `casualtyRisk` and reuse `casualty_threshold`) but is a naming smell — the dedicated branch is recommended.

**Learning value 5. Demo:** the single most counter-intuitive fact in European space law for a German audience — Europe's largest space economy has no space law and no space agency licence; a high-res EO operator is licensed by an export-control office. The Phase-1 authority picker is a genuine trap; the SatDSiV 2.5 m threshold gives a crisp engine-graded number; the deficiency phase rests on a real binding precedent.

---

### 2.2 `nis2-orbit-cyber-incident` — In-Orbit Cyber/Anomaly Incident: NIS2 24h/72h/30d Reporting (EU/DE)

**One line:** A KA-SAT-style AcidRain wiper bricks tens of thousands of user modems and degrades an EU satcom service. Student = operator working the NIS2 Art. 23 reporting clock; AI = national competent authority (BSI). The timeline IS the legal instrument — highest learning value for cyber/incident law in the slate.

**Difficulty:** ADVANCED · **Est.:** 40 min · `studentRole: operator` · `aiRoles: [regulator]` · `module: nis2` · `jurisdiction: EU`

**Operator profile:** `{ activityType:"data_provider", entitySize:"large", establishment:"eu", primaryOrbit:"LEO", operatesConstellation:true, constellationSize:120, offersEUServices:true }` (large, EU-critical broadband → keyed `essential`).

**Learning objectives**

1. Reproduce the Art. 23 clock from memory — 24h early warning, 72h notification (initial assessment incl. suspected unlawful/malicious cause + cross-border impact), intermediate report on request, final report within one month; know which facts MUST appear at each stage.
2. Classify a space operator (essential vs important; Space = Annex I high-criticality) and pick the NCA + statutory channel (DE: BSI via the BSI-Meldeportal, §§30–31 BSIG), distinguishing the parallel telecom/TKG and CRA product-incident channels.
3. Map AcidRain (modem/CPE-layer supply-chain compromise) onto Art. 21(2)(a)–(j) and argue which duty failed — supply-chain security 21(2)(d) reaching CPE, per the Viasat KA-SAT holding.
4. Distinguish the overlapping EU cyber regimes one incident triggers at once (NIS2→NCA; CRA Art. 14→ENISA 24h/72h; EU Space Act cyber pillar) and reason about dual/triple reporting.
5. Draft a defensible final-report narrative and answer a deficiency notice — sequencing facts to the statutory stage, avoiding attribution overreach.

**Roles:** `operator` = incident commander / legal lead (discharge Art. 23 on time + defensibly; private: state-aligned actor suspected, CPE-layer supply-chain, attribution UNconfirmed → say "suspected", CRA channel runs in parallel). `regulator` = BSI (verify each deadline + content; escalate; private: press on suspected-cause, cross-border, and the 21(2)(d) CPE dimension; fire the deficiency on the weakest element citing KA-SAT).

**Phases**

| #   | phaseKey       | Artifact kind                                                                                                                                                                                                                                                        | Rubric (key · weight · track)                                                                     | Cited sources                                         | Cited cases                           |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| 1   | `authority`    | `authority_choice` (select `authority` ∈ [BSI, BNetzA, ENISA, ASI] + select `classification` ∈ [essential, important, out_of_scope] + text justification)                                                                                                            | `authority_correct` 50 **E** · `nis2_classification` 30 **E** · `channel_justification` 20 **AI** | `EU-NIS2-2022`, `DE-BSIG-NIS2`                        | `CASE-VIASAT-KA-SAT-CYBERATTACK-2022` |
| 2   | `notification` | **NEW kind `incident_report`** (select `earlyWarningFiledH` ∈ [≤24h, 24-48h, >48h]; select `notificationFiledH` ∈ [≤72h, 72h-7d, >7d]; bool `crossBorderImpact`, `suspectedUnlawfulCause`, `severityAssessment`, `indicatorsOfCompromise`, `triggerCraEnisaChannel`) | `notification_timing` 40 **E** · `mandatory_modules` 40 **E** · `cra_parallel_channel` 20 **E**   | `EU-NIS2-2022`, `EU-CRA-2024`, `INT-ENISA-SPACE-2023` | `CASE-VIASAT-KA-SAT-CYBERATTACK-2022` |
| 3   | `final_report` | `cover_letter` (`minCitations: 2`)                                                                                                                                                                                                                                   | `root_cause` 35 **AI** · `art21_gap_analysis` 35 **AI** · `citation_accuracy` 30 **AI**           | `EU-NIS2-2022`, `EU-SPACE-ACT`, `INT-NIST-IR-8270`    | `CASE-VIASAT-KA-SAT-CYBERATTACK-2022` |
| 4   | `deficiency`   | `deficiency_response`                                                                                                                                                                                                                                                | `addresses_deficiency` 60 **AI** · `revision_quality` 40 **AI**                                   | `EU-NIS2-2022`, `DE-BSIG-NIS2`                        | `CASE-VIASAT-KA-SAT-CYBERATTACK-2022` |

All `advanceRequiresRole: "operator"`.

**ANSWER_KEY:**

```
"nis2-orbit-cyber-incident": {
  authority: "BSI",
  classification: "essential",
  earlyWarningDeadlineH: 24,
  notificationDeadlineH: 72,
  mandatoryModules: ["crossBorderImpact","suspectedUnlawfulCause","severityAssessment","indicatorsOfCompromise"],
  craChannelRequired: true,
}
```

Engine criteria: `authority_correct` + `mandatory_modules` reuse existing branches verbatim. **NEW** branches (~30 LOC total): `nis2_classification` (exact-match select); `notification_timing` (two-part deadline check, half-weight per on-time filing: `earlyWarningFiledH==="<=24h"`→20, `notificationFiledH==="<=72h"`→20); `cra_parallel_channel` (boolean `triggerCraEnisaChannel===true`). Feedback i18n keys `nis2.fb.class.*`, `nis2.fb.timing.*`, `nis2.fb.cra.*`.

**Effort: M.** The honest cost driver is the Phase-2 artifact. See §3 (Engine Gap A) for the new `incident_report` kind. **Two build options:**

- **Cheap MVP (recommended first):** drop the new kind, render Phase 2 as the existing `application_form` (its fields are already boolean/select; the timing selects score via the new `notification_timing` branch, which is data+scorer only — no renderer work). Net: "data + i18n + 3 small scorer branches", **fits the engine**. You only lose the countdown chrome.
- **Fast-follow:** add the `incident_report` kind + a 24h/72h deadline-countdown card. This is where the demo wow lives.

**Learning value 5. Demo:** the most legible, highest-stakes Planspiel — a real, attributable, EU-felt incident (KA-SAT/AcidRain knocked ~5,800 German wind turbines offline) driving a statutory countdown. "One incident, three regimes" shows depth no checklist conveys.

---

### 2.3 `insurance-placement-claim` — Launch & In-Orbit Insurance: Placement to Claim Adjudication (FR)

**One line:** Place launch + first-year in-orbit cover to satisfy the EU Space Act insurance condition and France's Art. 6 LOS mandatory TPL, negotiate exclusions, suffer a Viasat-3-style reflector anomaly, then write a coverage-position letter adjudicating the claim. The only money-and-claims scenario; two-sided (operator vs insurer).

**Difficulty:** ADVANCED · **Est.:** 40 min · `studentRole: operator` (swappable to `insurer`) · `aiRoles: [insurer]` · `module: insurance` · `jurisdiction: FR`

**Operator profile:** `{ activityType:"spacecraft", entitySize:"medium", establishment:"eu", primaryOrbit:"GEO", operatesConstellation:false, hasPostLaunchAssets:true, offersEUServices:true }`

**Learning objectives**

1. Determine the statutory MINIMUM TPL cover to clear an authorization condition — reconcile the EU Space Act "adequate insurance / financial guarantee proportionate to risk" standard with France's two-tier Art. 6 LOS model (operator insures the layer; State guarantees beyond; no fixed cap, set per authorization).
2. Structure the coverage stack across pre-launch / launch-failure / first-year in-orbit and explain WHY the strata exist (AMOS-6: propellant-loading commencement, not ignition, is the pre-launch trigger).
3. Read and negotiate exclusions/perils (deployment-mechanism failure, gradual degradation, manufacturing defect, war/cyber).
4. Apply proportionate-payout reasoning to a partial in-orbit loss (Viasat-3: ~10% capacity → ~$370M on ~$420M insured).
5. Draft a reasoned coverage-position letter citing the policy clause + governing liability instrument (INT-LIABILITY-1972 launching-State backdrop; FR-LOS recourse regime) and allocate residual risk across operator/insurer/State.

**Roles:** `operator` = Risk Manager (compliant, cost-efficient stack; defend the recovery; private: CFO wants the thinnest TPL, resists the in-orbit layer; the reflector leaves ~10% capacity → PARTIAL loss, CTL may not trigger; leverage = deployment-failure is covered unless excluded in Phase 3). `insurer` = London-market underwriter (bind only priceable risk; pay proportionate, not total; private: hardened market, hold the line on proportionate settlement; concede CTL only below the constructive-total-loss threshold).

**Phases**

| #   | phaseKey                                             | Artifact kind                                                                                                                                         | Rubric (key · weight · track)                                                                    | Cited sources                                       | Cited cases                                                  |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `authority`                                          | `authority_choice` (select `regime` ∈ [FR-LOS-2008, EU-SPACE-ACT, INT-LIABILITY-1972] + text justification)                                           | `regime_correct` 60 **E** · `minimum_justification` 40 **AI**                                    | `FR-LOS-2008`, `EU-SPACE-ACT`, `INT-LIABILITY-1972` | —                                                            |
| 2   | `application`                                        | `application_form` (bool `tplLiability`, `inOrbitFirstYear`, `preLaunch`, `launchFailure` + select `tplTier` ∈ [<60M, 60M..150M, >150M-state-backed]) | `mandatory_layers` 60 **E** · `tpl_minimum_tier` 40 **E**                                        | `FR-LOS-2008`, `EU-SPACE-ACT`                       | `CASE-AMOS-6-INSURANCE-2017`                                 |
| 3   | `cover_letter`                                       | `cover_letter` (`minCitations: 2`)                                                                                                                    | `exclusion_reasoning` 40 **AI** · `risk_allocation` 30 **AI** · `citation_accuracy` 30 **AI**    | `FR-LOS-2008`, `INT-LIABILITY-1972`                 | `CASE-AMOS-6-INSURANCE-2017`                                 |
| 4   | `deficiency` (loss event + coverage-position letter) | `deficiency_response`                                                                                                                                 | `addresses_position` 40 **AI** · `payout_reasoning` 35 **AI** · `adjudication_quality` 25 **AI** | `FR-LOS-2008`, `INT-LIABILITY-1972`                 | `CASE-VIASAT-3-INSURANCE-2023`, `CASE-AMOS-6-INSURANCE-2017` |

All `advanceRequiresRole: "operator"` (default path).

**ANSWER_KEY:**

```
"insurance-placement-claim": {
  regime: "FR-LOS-2008",
  mandatoryLayers: ["tplLiability","inOrbitFirstYear","preLaunch","launchFailure"],
  tplTier: "60M..150M",
}
```

Engine criteria — all three are simple clones: `regime_correct` (clone of `authority_correct`, compares `answer.regime`/`key.regime`); `mandatory_layers` (clone of `mandatory_modules` reading `key.mandatoryLayers`); `tpl_minimum_tier` (clone of `casualty_threshold` reading `answer.tplTier`). Feedback keys `ins.fb.regime.*`, `ins.fb.layers.*`, `ins.fb.tpl.*`.

> **Naming caution (applies to scenarios 1, 3, 5, 6):** the existing `mandatory_modules` branch hard-reads `key.mandatoryModules`, and `casualty_threshold` hard-reads `answer.casualtyRisk`. A new criterion under a NEW key (`mandatory_layers`, `mandatory_modules`-but-different-field, `resolution_band`, `tpl_minimum_tier`, etc.) needs its OWN branch reading its OWN answer-key field. The cheapest zero-code path is to REUSE the literal key `mandatory_modules` and add a `mandatoryModules:[...]` answer-key entry — but only one boolean-set criterion per scenario can do that, and it forces the artifact's boolean field names to match the keyed strings. For clarity the slate prefers small dedicated branches (each ~6–10 lines). Effort estimates assume dedicated branches.

**Effort: M.** `fitsExistingEngine: true` for the default operator path — data + i18n + a handful of additive scorer branches identical in shape to the flagship's. No new artifact kind, no UI/workflow change. The AI insurer's openings in P3/P4 are coach prompts. **Optional:** an INSURER-perspective variant is cheapest as a SECOND scenario object (`insurance-placement-claim-insurer`) reusing the phases/answer-key with `studentRole:"insurer"`, `aiRoles:["operator"]`, `advanceRequiresRole:"insurer"` — pure data duplication. A true runtime side-picker WOULD need a type/UI extension (see §3 Gap D) and is out of scope for the cheap build.

**Learning value 5. Demo:** turns abstract "authorization conditions" into a felt commercial negotiation with a real loss and a real number; the two-sided design is a live-demo crowd-pleaser. Showcases the full Track-1/Track-2 range in one run.

---

### 2.4 `de-bafa-dualuse-export` — Dual-Use Export Control: Classify, Licence, Comply (BAFA, Germany)

**One line:** Student = exporter's counsel for a German star-tracker / GNSS-receiver maker shipping to a third country; AI = BAFA. The arc mirrors the commercial Trade/Passage product (classify → licence → comply) but is taught entirely Scholar-side. **CRITICAL: the export-control engine lives in the FROZEN Trade surface — this scenario does NOT import or edit it.** Grading is answer-key + ai-coach only.

**Difficulty:** ADVANCED · **Est.:** 40 min · `studentRole: counsel` · `aiRoles: [regulator]` · `module: export-control` · `jurisdiction: DE` · **3 phases** (classify → licence/TCP → enforcement).

**Operator profile:** `{ activityType:"data_provider", entitySize:"medium", establishment:"eu", offersEUServices:false }` (component supplier; profile is type-valid filler — engine grading here is answer-key-driven, not profile-derived).

**Learning objectives**

1. Jurisdiction triage — decide which regime(s) bite (EU dual-use Reg 2021/821 / BAFA; US ITAR / DDTC; US EAR / BIS) and recognise US-origin content drags US re-export jurisdiction across borders (the ITT/Loral lesson).
2. Classification — map a real space item to the correct entry (EU Annex I Cat 7 vs 9; USML Cat XV vs post-2014-reform EAR ECCN 9A515/9E515) and apply the Art. 4 catch-all "know-or-suspect" duty.
3. Licensing path + Technology Control Plan — pick the BAFA basis under AWG §§4–8 / AWV, identify when a US TAA is needed for technical-data/deemed-export transfers, draft a TCP cover letter.
4. Enforcement reasoning — weigh voluntary self-disclosure vs concealment using the real settlement record (ITT $100M criminal, BAE $79M civil for recordkeeping alone, ZTE $1.19B coordinated, Loral deemed-export from a debrief).
5. Sanctions overlay — screen the end-user against OFAC + the SDN 50% Rule; see EAR + OFAC violations stack rather than offset.

**Roles:** `counsel` = Export-Control Counsel (ship lawfully at lowest enforcement risk; private: a sub-supplier already drop-shipped US-origin rad-tolerant parts to this end-user unlicensed, the CTO ran a "troubleshooting" call walking through calibration internals = probable deemed-export with no TAA, end-user parent one layer from an SDN). `regulator` = BAFA Licensing & Enforcement (license only on a complete, correctly-classified dossier; private: already holds the sub-supplier record + knows about the call; testing whether counsel self-identifies and proposes credible remediation).

**Phases**

| #   | phaseKey      | Artifact kind                                                                                                                                                  | Rubric (key · weight · track)                                                                                                          | Cited sources                                             | Cited cases                                                                        |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `classify`    | `authority_choice` (THREE selects: `authority` ∈ [BAFA, DDTC, BIS], `euCategory` ∈ [Cat 7, Cat 9], `usClass` ∈ [EAR 9A515, ITAR USML XV] + text justification) | `lead_authority_correct` 25 **E** · `eu_control_category` 25 **E** · `us_classification` 25 **E** · `catchall_justification` 25 **AI** | `DE-DUALUSE-2021`, `US-ITAR`, `US-EAR`                    | `CASE-LORAL-1996`                                                                  |
| 2   | `licence_tcp` | `application_form` (bool `bafaLicence`, `endUserStatement`, `technicalAssistanceAgreement`, `technologyControlPlan`)                                           | `licence_elements` 60 **E** · `tcp_letter_quality` 40 **AI**                                                                           | `DE-AWG-2013`, `DE-AWV-2013`, `US-EAR`, `DE-DUALUSE-2021` | `CASE-LORAL-1996`                                                                  |
| 3   | `enforcement` | `deficiency_response`                                                                                                                                          | `identifies_violations` 40 **AI** · `remediation_strategy` 35 **AI** · `enforcement_grounding` 25 **AI**                               | `US-ITAR`, `US-EAR`, `US-OFAC-SANCTIONS-PROGRAMS`         | `CASE-ITT-ITAR-2007`, `CASE-BAE-ITAR-2011`, `CASE-ZTE-EAR-2017`, `CASE-LORAL-1996` |

All `advanceRequiresRole: "counsel"`. **Note:** `BAFA`, `DDTC`, `BIS` (authority records) are select OPTION strings + name-only references — they are NOT in `citedSourceIds`, so the integrity test is safe. The `authority_choice` kind already supports multiple fields (flagship used 2), so three selects need no new kind.

**ANSWER_KEY:**

```
"de-bafa-dualuse-export": {
  leadAuthority: "BAFA",
  euCategory: "Cat 7",
  usClass: "EAR 9A515",
  requiredElements: ["bafaLicence","endUserStatement","technicalAssistanceAgreement","technologyControlPlan"],
}
```

Engine criteria: THREE exact-match clones of `authority_correct` — `lead_authority_correct` (`answer.authority`/`key.leadAuthority`), `eu_control_category` (`answer.euCategory`/`key.euCategory`), `us_classification` (`answer.usClass`/`key.usClass`); notes `de.fb.authority.*` / `de.fb.eucat.*` / `de.fb.usclass.*`. For `licence_elements`: cheapest path is the **zero-new-code** option — name the criterion literally `mandatory_modules` AND add `mandatoryModules:["bafaLicence",...]` to the answer-key entry, reusing the existing ratio branch. (If you prefer the descriptive key `licence_elements`, add a tiny branch reading `key.requiredElements`.)

**Effort: M** (closer to S–M). `fitsExistingEngine: false` only because of the 3 new exact-match scorer branches; no new artifact KIND, no new field TYPE, no UI change, no Trade-engine coupling. Data file `de-bafa-dualuse.ts`, registry line, `de.*` i18n block (~45–55 keys, same volume as `asi.*`). Recommended to add a small unit test pinning the 3 new branches.

**Learning value 5. Demo:** the single most resonant Scholar scenario for the Caelex story — it teaches Scholar-side exactly what the flagship Trade/Passage product automates, so a demo pivots from "here's how a student learns export control" to "here's the product that does this for real" in one breath. The three-regime classification puzzle is a genuinely hard lawyer task; the Phase-3 twist lands with brand-name cases (ZTE $1.19B, Loral). **Deck caveat to flag:** deliberately NO coupling to the frozen Trade engine — itself a selling point (clean surface separation).

---

### 2.5 `tco-equivalence-eu` — Third-Country Operator: Competent NCA & TCO Equivalence (EU)

**One line:** A UK-incorporated, CAA-licensed LEO broadband operator ("OrbitLink Ltd") wants to sell into the EU once the EU Space Act applies. Student = its EU regulatory counsel. Teaches extraterritorial reach + forum analysis + equivalence/mutual-recognition — the most transferable skills in EU regulatory practice.

**Difficulty:** ADVANCED · **Est.:** 40 min · `studentRole: counsel` · `aiRoles: [eu_body, regulator]` · `module: authorization` · `jurisdiction: EU`

**Operator profile:** `{ activityType:"spacecraft", entitySize:"medium", establishment:"third_country_eu_services", primaryOrbit:"LEO", operatesConstellation:true, constellationSize:120, offersEUServices:true }` (the `third_country_eu_services` + `offersEUServices` fields are exactly the type's third-country surface — verified type-valid).

> **⚠ BUILD-BLOCKING CORPUS CORRECTION (verified).** The incoming design listed `EU-EUSPA`, `EU-EC`, `FR-CNES`, `UK-CAA` inside `citedSourceIds`. I traced the resolver: these ids live in `AUTHORITIES_*` arrays, and `ALL_SOURCES` (which `getLegalSourceById` searches) spreads ZERO `AUTHORITIES_*` arrays. Therefore `getLegalSourceById` returns `undefined` for all four and **`scenarios.test.ts` would FAIL** ("source EU-EUSPA in tco-equivalence-eu/... toBeTruthy"). **Correction applied in the tables below:** these four are removed from `citedSourceIds` and referenced by NAME only (in briefs / select options / answer-key prose). The phases retain only resolvable SOURCE ids (`EU-SPACE-ACT`, `FR-LOS-2008`, `LU-SPACE-ACTIVITIES-2020`, `UK-SIA-2018`) plus the two resolvable cases. This is the de-bafa pattern (authority = name-only) applied consistently.

**Learning objectives**

1. Apply the extraterritorial-reach test of the EU Space Act (Art. 20 services-nexus) — WHEN a non-EU operator is caught (offering services into the Union) vs outside scope — and distinguish the establishment-nexus of national law (FR "French jurisdiction"; LU "Luxembourg responsibility").
2. Competent-authority / forum analysis — which single Member-State NCA becomes the point of designation/registration for a no-EU-establishment operator, and why the choice is strategic (timelines, fees, liability backstop, register transparency).
3. Construct an equivalence / mutual-recognition argument — map the UK CAA (SIA 2018) authorisation against EU Space Act harmonised requirements (Art. 6–16) to argue the lighter TCO pathway (EU representative + registration) applies instead of full re-authorisation.
4. Assemble the mandatory TCO obligations (designate an EU representative established in the Union + register under Art. 20) and recognise which obligations the home-state licence CANNOT discharge.
5. Read and answer a regulator's deficiency notice on a contested equivalence finding — defend with provision-level citations while conceding the genuinely non-equivalent gaps.

**Roles:** `counsel` = EU Regulatory Counsel (OrbitLink) — fast/cheap lawful EU service via the third-country pathway; pick the most favourable NCA; secure an equivalence determination; private: board wants NO EU establishment; the real non-equivalent gap is space cybersecurity (Art. 74–95, never assessed against the UK licence); of the candidate NCAs, Luxembourg = unlimited liability + 6-month filing, France = State backstop above the insured amount; the EU representative (Art. 20) is non-negotiable. `eu_body` = DG DEFIS / EUSPA (uniform application; red lines: a UK licence is not by itself an equivalence finding; the EU representative must be genuinely established; issue the deficiency specifically on the cyber gap). `regulator` = competing Member-State NCA (FR-CNES or LU-MECO route; surface the national-law overlay + the asymmetric liability fact the memo may gloss).

**Phases**

| #   | phaseKey                  | Artifact kind                                                                                                            | Rubric (key · weight · track)                                                                      | Cited sources (CORRECTED)                                 | Cited cases                           |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| 1   | `jurisdiction_memo`       | `cover_letter` (`minCitations: 2`)                                                                                       | `extraterritorial_basis` 45 **AI** · `memo_completeness` 30 **AI** · `citation_accuracy` 25 **AI** | `EU-SPACE-ACT`, `FR-LOS-2008`, `LU-SPACE-ACTIVITIES-2020` | `CASE-EU-EUTELSAT-ONEWEB-MERGER-2023` |
| 2   | `competent_nca`           | `authority_choice` (select `competentNca` ∈ [FR_CNES, LU_MECO, UK_CAA, DE_BNetzA] + text justification)                  | `competent_nca_correct` 60 **E** · `justification_quality` 40 **AI**                               | `EU-SPACE-ACT`, `FR-LOS-2008`, `LU-SPACE-ACTIVITIES-2020` | `CASE-UK-SAXAVORD-LICENCE-2023`       |
| 3   | `tco_equivalence`         | `application_form` (bool `euRepresentative`, `nationalRegistration` + select `equivalenceBasis` ∈ [FULL, PARTIAL, NONE]) | `tco_obligations_present` 55 **E** · `equivalence_determination` 45 **E**                          | `EU-SPACE-ACT`, `UK-SIA-2018`                             | `CASE-UK-SAXAVORD-LICENCE-2023`       |
| 4   | `registration_deficiency` | `deficiency_response`                                                                                                    | `addresses_deficiency` 60 **AI** · `revision_quality` 40 **AI**                                    | `EU-SPACE-ACT`                                            | —                                     |

`advanceRequiresRole: "counsel"` on every phase. **Removed from `citedSourceIds` (name-only):** `EU-EUSPA`, `EU-EC` (P1/P3/P4), `FR-CNES`, `UK-CAA` (P2). `FR_CNES`/`LU_MECO`/`UK_CAA`/`DE_BNetzA` remain as select OPTION strings (data, not corpus ids) — the `authority_choice` UI renders arbitrary option strings (flagship used `["ASI","MIMIT","ENAC","AGCOM"]`).

**ANSWER_KEY:**

```
"tco-equivalence-eu": {
  competentNca: "FR_CNES",
  tcoObligations: ["euRepresentative","nationalRegistration"],
  equivalenceBasis: "PARTIAL",
}
```

Engine criteria — three clones: `competent_nca_correct` (clone of `authority_correct`, `answer.competentNca`/`key.competentNca`; UK_CAA = hard error, LU_MECO = 0 on this engine key but its rationale is rewarded under the AI `justification_quality`); `tco_obligations_present` (clone of `mandatory_modules` over `key.tcoObligations`, both booleans required); `equivalence_determination` (clone of `casualty_threshold`, `answer.equivalenceBasis`/`key.equivalenceBasis`; `PARTIAL` correct — cyber Art. 74–95 not equivalent, FULL is the trap, NONE wrong because debris+insurance ARE equivalent). Feedback keys `tco.fb.nca.*`, `tco.fb.obligations.*`, `tco.fb.equiv.*`.

**Effort: M.** `fitsExistingEngine: true` AFTER the corpus correction — data + i18n + one ANSWER_KEY entry + 3 small additive branches; no new artifact KIND, no field TYPE, no workflow change. Phases reuse all 4 existing kinds. Track-2 P1/P4 work via the zero-cost fallback. Data file `tco-equivalence.ts`, registry line, `tco.*` i18n block (EN + DE recommended; IT/FR/ES degrade).

**Learning value 5. Demo:** teaches the single most transferable skill in EU regulatory law on the most topical fact pattern (post-Brexit UK operator selling into the EU under the brand-new EU Space Act). The "pick the competent NCA" phase is a defensible-but-non-obvious engine-graded decision (France vs Luxembourg on the liability backstop); the equivalence trap (claiming FULL when cyber is genuinely non-equivalent) produces a great "gotcha" when the AI EU body fires the deficiency. Pairs naturally with the flagship (operator-inside-one-state vs counsel-reasoning-across-the-boundary).

---

### 2.6 `itu-leo-coordination` — ITU Spectrum Coordination & Interference Dispute (INT)

**One line:** A two-administration ITU role-play tracking a new non-GSO constellation through API → CR/C (Art. 9) → interference dispute over EPFD/date-priority (Art. 22 / 11.32A) → notification & MIFR recording (Art. 11). Student = operator's home Administration ("Notifying Administration"); AI = a competing-system Administration. The least document-driven scenario; broadens archetype coverage to government-vs-government.

**Difficulty:** ADVANCED · **Est.:** 40 min · `studentRole: regulator` (home admin) · `aiRoles: [eu_body]` (re-cast as competing admin) · `module: spectrum` · `jurisdiction: INT`

**Operator profile:** `{ activityType:"spacecraft", entitySize:"large", establishment:"eu", primaryOrbit:"LEO", operatesConstellation:true, constellationSize:300, offersEUServices:true }` (type-valid filler; ITU grading is answer-key-driven).

> **Role-key mapping note (verified safe).** `ScholarRoleKey` has no "second administration" member, so student→`regulator` (home Administration) and AI→`eu_body` (re-cast as competing/incumbent Administration). The two parties MUST be distinct role keys (the workflow guard is role-keyed) and both are declared in `roles[]` — satisfies the integrity test. `ScholarRoleKey` is not exhaustively switched anywhere outside `types.ts`, so reusing `eu_body` needs no code branch. (Optional cosmetic polish: add a `foreign_admin` member — a 1-line additive type edit — for cleaner labelling. Not required.)

**Learning objectives**

1. Trace the full ITU coordination lifecycle for a non-GSO system and place each step on its legal basis: API (Art. 9), CR/C (Art. 9), Notification/MIFR (Art. 11), EPFD/PFD envelope (Art. 22) — distinguishing what each instrument secures.
2. Apply date-priority ("first-come") AND its limit — an earlier network's protection is conditional on continuing/actual use, not an absolute right (Eutelsat v. SES); Resolution 35 milestones strip filed-but-not-deployed satellites from the MIFR.
3. Analyse a harmful-interference claim against the Art. 22 EPFD limits + the Art. 11.32A "no increase in probability of harmful interference" test; decide whether an objection is founded or mere warehousing.
4. Operate the procedural reality that operators don't deal with the ITU directly — rights flow through the responsible national Administration, which files/coordinates/notifies and bears the inter-Administration duty.
5. Draft a coordination-objection response and a notification-defence invoking continuing-use, BIU status, and milestone compliance to preserve recorded rights.

**Roles:** `regulator` = Notifying Administration / operator's home spectrum desk (secure international protection; defeat or settle the objection; record in the MIFR before priority erodes; private: filing is genuine + funded, meets Res. 35 milestones, EPFD compliant in Ku but close to the limit in one Ka sub-band — disclose accurately; strongest shield = the competitor's partial/paper use). `eu_body` (competing admin) = Incumbent / Objecting Administration (protect an earlier network; extract concessions or delay MIFR recording; private: paper priority but only partial BIU, one sub-band dormant past the window → a continuing-use challenge defeats part of the claim; real EPFD concern is ONE Ka sub-band; over-claiming risks a warehousing brand under Res. 35).

**Phases**

| #   | phaseKey               | Artifact kind                                                                                                                                                                                                                 | Rubric (key · weight · track)                                                                       | Cited sources                  | Cited cases                                                       |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| 1   | `authority`            | `authority_choice` (select `filingRoute` ∈ [NATIONAL_ADMIN_TO_ITU, OPERATOR_DIRECT_TO_ITU, ITU_DIRECT_GRANT, NATIONAL_LICENCE_ONLY] + select `openingAct` ∈ [API, CR_C, NOTIFICATION, NATIONAL_LICENCE] + text justification) | `administration_correct` 35 **E** · `filing_act_correct` 35 **E** · `route_justification` 30 **AI** | `INT-ITU-RR`, `INT-ITU-CONST`  | `CASE-ITU-RES35-MILESTONE-NGSO-2024`                              |
| 2   | `application`          | `application_form` (bool `frequencyAssignment`, `epfdEnvelope`, `biuPlan`, `milestoneSchedule`, `affectedNetworks` + select `epfdBracket` ∈ [within_limit, at_limit_margin, exceeds_limit])                                   | `coordination_elements` 60 **E** · `epfd_compliant` 40 **E**                                        | `INT-ITU-RR`, `INT-ITU-RES-35` | `CASE-ITU-RES35-MILESTONE-NGSO-2024`                              |
| 3   | `interference_dispute` | `cover_letter` (`minCitations: 2`)                                                                                                                                                                                            | `interference_law` 40 **AI** · `priority_argument` 30 **AI** · `citation_accuracy` 30 **AI**        | `INT-ITU-RR`, `INT-ITU-WRC-23` | `CASE-EUTELSAT-V-SES-28E-2014`, `CASE-GALAXY-15-ZOMBIE-2010-2024` |
| 4   | `notification`         | `deficiency_response`                                                                                                                                                                                                         | `addresses_finding` 60 **AI** · `recording_quality` 40 **AI**                                       | `INT-ITU-RR`, `INT-ITU-RES-35` | `CASE-LIGADO-V-INMARSAT-2025`                                     |

`advanceRequiresRole: "regulator"` on every phase (the student = home Administration drives all submissions).

**ANSWER_KEY:**

```
"itu-leo-coordination": {
  filingRoute: "NATIONAL_ADMIN_TO_ITU",
  openingAct: "API",
  coordinationElements: ["frequencyAssignment","epfdEnvelope","biuPlan","milestoneSchedule"],
  epfdBracket: "within_limit",
}
```

Engine criteria — four clones: `administration_correct` + `filing_act_correct` + `epfd_compliant` are exact-match selects (clones of `authority_correct`/`casualty_threshold` reading `answer.filingRoute`/`answer.openingAct`/`answer.epfdBracket`); `coordination_elements` is a ratio clone of `mandatory_modules` over `key.coordinationElements` (`affectedNetworks` collected but NOT scored). ~30 LOC; feedback keys `itu.fb.route.*`, `itu.fb.act.*`, `itu.fb.coord.*`, `itu.fb.epfd.*`.

**Effort: M.** `fitsExistingEngine: true` for the MVP — data + i18n + 4 additive scorer branches reusing the two existing shapes; no new types. Data file, registry line, `itu.*` i18n block (EN + DE). **Optional higher-fidelity upgrade (NOT MVP):** a true live bilateral negotiation (multi-round offer/counter-offer within one phase) is a genuinely new mechanic the single-actor turn-based engine lacks — see §3 Gap B. The current model is honest because real ITU coordination IS asynchronous formal correspondence, which `deficiency_response` models faithfully (the AI competitor's objection in P3, the Bureau finding in P4).

**Learning value 5. Demo:** ITU spectrum coordination is the most mystifying part of space law; almost no teaching tool walks the actual API→CR/C→dispute→MIFR pipeline. The two-Administration framing visibly broadens the slate's archetypes. The interference-dispute phase is a genuine "aha" (wield the continuing-use doctrine from a real ICC arbitration + Res. 35's strip-back to defeat a date-priority bully). Honest caveat for the demo: the "negotiation" is modelled as formal coordination correspondence (true to how ITU works), not a live haggling chat.

---

## 3. Engine gaps (extensions) — what each is, what it unlocks, effort

The slate is deliberately front-loaded with scenarios that fit the engine as-is (data + i18n + small additive scorer branches). The genuinely NEW engine capabilities are isolated to a small number of extensions, ranked by value.

### Gap A — NEW artifact kind `incident_report` (the only new kind in the slate)

- **What:** extend the closed `ScholarArtifactKind` union in `types.ts` with `"incident_report"`, plus a cockpit artifact-renderer branch for it: a timed-notification card grouping the two timing selects (`earlyWarningFiledH`, `notificationFiledH`) with the content-element booleans, ideally with visible **24h/72h deadline-countdown chrome** for the teaching effect. The structured FIELDS all fit the existing `ScholarArtifactField` shape (boolean/select), so field DATA needs no type change — only the union + the renderer branch. No new scorer track (all Phase-2 criteria are engine-track, handled by the new branches).
- **Unlocks:** `nis2-orbit-cyber-incident` Phase 2 at full fidelity. Reusable by any future incident/clock scenario (CRA product-incident, GDPR 72h breach, FCC orbital-debris incident).
- **Effort:** S–M (the union edit is trivial; the countdown renderer is the real work). **Cheap fallback removes this gap entirely for v1:** render Phase 2 as `application_form` — fully scorable, you lose only the countdown chrome. **Recommendation:** ship the fallback first, add `incident_report` + countdown as a fast-follow (it's where the demo wow lives).

### Gap B — Live negotiation mechanic `coordination_exchange` (DEFERRED — multi-sprint)

- **What:** a true multi-round offer/counter-offer bargaining loop WITHIN a single phase. Needs: (1) a NEW artifact kind `coordination_exchange` carrying a structured proposal (`{ sharedBand, requestedBackoffDb, bandSplitOffer, acceptReject }`); (2) a WORKFLOW change so a phase can loop / require BOTH roles to act before advancing (today `advanceRequiresRole` is a single role and the guard is one-shot); (3) a new scorer dimension grading concession/BATNA quality (how much spectrum the student conceded vs preserved given the continuing-use leverage), likely AI-track; (4) UI for a two-column proposal/counter-proposal exchange.
- **Unlocks:** a higher-fidelity `itu-leo-coordination`; any future true-negotiation scenario (insurance binder haggling, NCA settlement, supplier indemnity). The insurance scenario (2.3) and the ITU scenario (2.6) both model their adversarial beats via `deficiency_response` today and do NOT need this for the MVP.
- **Effort:** L (multi-sprint). Keep OUT of the MVP. This is the slate's biggest single capability lever if the owner later wants real bargaining.

### Gap C — New engine-scorer criterion branches (small, the recurring cost)

- **What:** `scorePhaseEngine()` currently implements only `authority_correct`, `mandatory_modules`, `casualty_threshold`. The slate adds these branches, each ~6–10 lines following the existing defensive pattern (push a `RubricLine`, never throw):
  - **Exact-match select** (clone of `authority_correct`/`casualty_threshold`): `resolution_band`, `nis2_classification`, `cra_parallel_channel` (boolean===true variant), `regime_correct`, `tpl_minimum_tier`, `lead_authority_correct`, `eu_control_category`, `us_classification`, `competent_nca_correct`, `equivalence_determination`, `administration_correct`, `filing_act_correct`, `epfd_compliant`.
  - **Ratio-of-booleans** (clone of `mandatory_modules` reading a per-scenario answer-key array): `mandatory_layers`, `tco_obligations_present`, `coordination_elements`, `licence_elements`. (Each reads its own `key.<field>` array — or reuse the literal `mandatory_modules` key once per scenario for zero new code.)
  - **Two-part deadline** (genuinely new shape, but tiny): `notification_timing` (half-weight per on-time filing).
  - Plus one `ANSWER_KEY[...]` entry per scenario and the matching `*.fb.*` feedback i18n keys.
- **Unlocks:** the engine-track phases of scenarios 1–6. None of these is architecturally new — they are field-renamed clones of patterns already in the file.
- **Effort:** S per scenario (∼10–30 LOC). This is the "maybe one scorer branch" the brief budgets for, multiplied across the slate. Pin them with a sibling unit test.

### Gap D — Runtime side-picker (OPTIONAL, only for "pick your side" insurance)

- **What:** `studentRole` is a single `ScholarRoleKey`. A runtime "play as operator OR insurer" toggle would need `studentRole: ScholarRoleKey | ScholarRoleKey[]` + a side-picker on the cockpit entry screen + role-aware brief selection.
- **Unlocks:** a first-class two-sided `insurance-placement-claim`. **Cheaper alternative (no engine change):** ship a second scenario object `insurance-placement-claim-insurer` flipping `studentRole`/`aiRoles`/`advanceRequiresRole` — pure data.
- **Effort:** M (type + UI). Out of scope for the cheap build; the data-duplication alternative is preferred.

### Gap E — `foreign_admin` role key (OPTIONAL, cosmetic)

- **What:** add `"foreign_admin"` to `ScholarRoleKey` for cleaner ITU labelling instead of reusing `eu_body`. 1-line additive type edit, safe (no exhaustive switch).
- **Unlocks:** nicer labels in `itu-leo-coordination`. Strictly cosmetic.
- **Effort:** XS. Optional.

**No other engine surface needs touching.** The frozen corpus and the frozen Trade export-control engine are consumed READ-ONLY throughout; the `de-bafa-dualuse-export` scenario specifically does NOT import or edit the Trade engine.

---

## 4. Prioritised build slate (cheap engine-fitting wins first)

Ordered so the owner gets demo-ready breadth fastest, deferring the one multi-sprint capability.

| Order               | Scenario                                                                | What it costs to build                                                                        | Effort      | Gates on                        |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- | ------------------------------- |
| **1**               | `de-leo-eo`                                                             | Data + i18n (DE) + **1** new scorer branch (`resolution_band`) + answer-key                   | **S**       | Gap C (1 branch)                |
| **2**               | `insurance-placement-claim` (operator path)                             | Data + i18n + **3** clone scorer branches + answer-key. No new kind/UI.                       | **M** (low) | Gap C (3 clones)                |
| **3**               | `de-bafa-dualuse-export`                                                | Data + i18n + **3** exact-match clone branches + answer-key. Trade engine untouched.          | **M** (low) | Gap C (3 clones)                |
| **4**               | `tco-equivalence-eu`                                                    | **First apply §2.5 corpus correction**, then data + i18n + **3** clone branches + answer-key. | **M**       | §2.5 fix + Gap C (3 clones)     |
| **5**               | `itu-leo-coordination` (MVP)                                            | Data + i18n + **4** clone branches + answer-key. Role-key reuse (`eu_body`).                  | **M**       | Gap C (4 clones)                |
| **6**               | `nis2-orbit-cyber-incident` (cheap fallback)                            | Data + i18n + **3** scorer branches; Phase 2 via `application_form`.                          | **M**       | Gap C (3 branches)              |
| **7 (fast-follow)** | `nis2-orbit-cyber-incident` → `incident_report` kind + countdown chrome | Type union edit + cockpit renderer branch.                                                    | **S–M**     | Gap A                           |
| **8 (optional)**    | Insurance INSURER variant                                               | Second data object (flip roles).                                                              | **S**       | — (or Gap D for runtime picker) |
| **9 (deferred)**    | ITU live-bargaining upgrade                                             | New kind + workflow loop + scorer dimension + UI.                                             | **L**       | Gap B                           |

**Reading of the slate:** items 1–6 are all "data + i18n + small additive scorer branches" — zero new artifact kinds, zero workflow changes, zero frozen-surface edits. Scenario 1 is genuinely cheap (S). Items 7–9 are upgrades, not blockers; the slate is fully demo-able after items 1–6. The single biggest "cheap breadth" insight is that the four existing artifact kinds + the two existing scorer shapes cover **every** phase of **every** scenario except the one cyber-incident timing card — and even that has a zero-extension fallback.

**Suggested first cut (one sprint of breadth):** items 1 + 2 + 3 (S + M + M) gives authorisation/insurance/export-control across DE/FR plus the Trade-product tie-in — the strongest demo triad — before any new artifact kind exists.

---

## 5. Key decisions for the owner

1. **TCO corpus correction — accept the §2.5 fix?** The incoming TCO design cites four authority records (`EU-EUSPA`, `EU-EC`, `FR-CNES`, `UK-CAA`) as sources. **Verified:** these are in `AUTHORITIES_*` arrays, which are NOT in `ALL_SOURCES`, so `getLegalSourceById` returns `undefined` and `scenarios.test.ts` fails. **Recommendation:** adopt the corrected tables (authority = name-only, keep only resolvable `LEGAL_SOURCES_*` ids in `citedSourceIds`). This is the de-bafa pattern; it costs nothing pedagogically. **Owner action: confirm** the corrected citation set before building scenario 4.

2. **`nis2-orbit-cyber-incident` — fallback first or the new kind up front?** The `incident_report` kind + 24h/72h countdown is the slate's most cinematic demo asset, but it's the only NEW artifact kind. **Recommendation:** ship the `application_form` fallback in the first build (fully scorable, fits the engine), then add the `incident_report` kind as a fast-follow. **Owner action: decide** whether the countdown chrome is wanted for the first demo (if yes, fold Gap A into the initial build and bump that scenario to M+).

3. **ITU live bargaining — model as formal correspondence (MVP) or build the negotiation mechanic (deferred)?** Real ITU coordination IS asynchronous formal filings, so the `deficiency_response` model is honest and ships now. The true offer/counter-offer loop (Gap B) is multi-sprint. **Recommendation:** ship the correspondence model; defer Gap B unless the owner wants a flagship "negotiation" demo. **Owner action: confirm** the MVP framing is acceptable for the demo narrative (set expectations: "coordination correspondence, not a live haggle").

4. **Insurance two-sidedness — data-duplicate variant or runtime side-picker?** Cheapest is a second scenario object with flipped roles (pure data). The runtime "pick your side" toggle (Gap D) is a nicer demo but needs a type + UI change. **Recommendation:** ship the operator path first; add the insurer variant as a data duplicate if the two-sided demo is wanted; only build the runtime picker if a single-entry "choose your role" UX is a priority. **Owner action: rank** the insurer variant vs other scenarios.

5. **Scorer-branch naming convention — dedicated keys vs reusing `mandatory_modules`.** Every new boolean-set criterion can either get its own descriptive key + branch (clear, ~10 LOC) or reuse the literal `mandatory_modules` key + a `mandatoryModules:[...]` answer-key entry (zero new code, but only one such criterion per scenario and the artifact field names must match the keyed strings). **Recommendation:** dedicated branches for readability and future maintainers; the effort delta is trivial. **Owner action: ratify** the convention (this spec's effort estimates assume dedicated branches).

6. **Localisation depth — which scenarios get authored DE/IT, which degrade to EN?** The engine degrades missing locales to EN, so tests stay green with EN-only. **Recommendation:** author DE for the two German scenarios (`de-leo-eo`, `de-bafa-dualuse-export`) and the EU/NIS2 ones; let IT/FR/ES degrade (matching the flagship, which wrote EN/DE/IT and stubbed FR/ES). **Owner action: confirm** the EN+DE-authored, others-degrade policy for the slate.

7. **Module/jurisdiction coverage gaps — green-light a future `debris_stm`/`ngo` scenario?** The slate exercises `operator`/`counsel`/`regulator`/`insurer`/`eu_body` but leaves `debris_stm` (space-traffic/conjunction) and `ngo` (environmental) unused, and the `environmental` + `copuos` modules untouched. **Recommendation:** note as a future slate-2 candidate (e.g. a conjunction/STM coordination Planspiel using `debris_stm`, or an environmental-NGO intervention). **Owner action: decide** whether to scope a 7th scenario now or after this slate ships.

---

## Appendix — verification log (what was actually read/grepped)

- Read: `types.ts`, `asi-reentry.ts`, `scoring.server.ts`, `scenarios.test.ts`, `index.ts` (planspiele), `sim-coach.server.ts` (fallback contract).
- Grepped every cited source id across `src/data/legal-sources/` and every cited case id across `src/data/legal-cases/` — all present (output captured in session).
- Traced resolver aggregation: `ALL_SOURCES` (`legal-sources/index.ts:166`) spreads only `LEGAL_SOURCES_*` (verified `grep -c AUTHORITIES_` over the array body = 0); `getLegalSourceById` (line 909) searches `ALL_SOURCES`. `ATLAS_CASES` (`cases.ts:25`) spreads `...ATLAS_CASES_RESEARCH_2026_05` / `...ATLAS_CASES_P5_2026_05` / `...ATLAS_CASES_P5B_2026_05` (lines 1687/1695/1705); `getCaseById` (`legal-cases/index.ts:80`) searches `ATLAS_CASES`. Confirmed the four additions-file cases used by the slate (`CASE-VIASAT-KA-SAT-CYBERATTACK-2022`, `CASE-VIASAT-3-INSURANCE-2023`, `CASE-EU-EUTELSAT-ONEWEB-MERGER-2023`, `CASE-UK-SAXAVORD-LICENCE-2023`, `CASE-EUTELSAT-V-SES-28E-2014`, `CASE-LIGADO-V-INMARSAT-2025`, `CASE-GALAXY-15-ZOMBIE-2010-2024`, `CASE-ITU-RES35-MILESTONE-NGSO-2024`) resolve.
- Verified authority-record placement: `EU-EUSPA`, `EU-EC`, `FR-CNES`, `UK-CAA`, `LU-LSA`, `DE-BAFA`, `US-DDTC`, `US-BIS` all live in `AUTHORITIES_*` arrays → NOT resolvable as sources → name-only (drives the §2.5 correction).
- Confirmed `EU-SPACE-ACT` carries Art. 20 "Third-country operator obligations" + EU-representative + mutual-recognition language (load-bearing for TCO).
- Confirmed integrity-test assertions (rubric==100 verified for all 22 phases below; contiguous order; roles declared; cited-id resolution).
