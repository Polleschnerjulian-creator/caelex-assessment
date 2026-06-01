# Caelex Trade — Export-Control Applicability Onboarding ("Betrifft mich das überhaupt?")

**Status:** Design (2026-05-31) · **Surface:** Caelex Trade (branch `fix/trade-to-92`)
**Author:** Claude (Opus 4.8) with Julian Polleschner
**Companion plan:** `docs/superpowers/plans/2026-05-31-trade-applicability-onboarding.md`
**User bar:** the missing _front door_. Today Trade opens with "create your first operation" — it assumes the user already knows export control applies to them and that they must classify items + screen parties. The clueless first-time owner doesn't. This answers their _actual_ first question before any of that.

---

## 1. Problem & persona

**Persona — Mara, full-time engineer at a 25-person satellite startup.** She just inherited "export compliance" because nobody else would. She has **zero** compliance background. She has never heard of an ECCN, BAFA, the EU Dual-Use Regulation, ITAR, MTCR, or Wassenaar. Her honest first question is not "what's the ECCN of my reaction wheel?" — it is:

> **"Does export control even apply to us at all — and if so, _which_ rules?"**

**The gap (observed in the live product).** The Trade home (`src/app/(trade)/trade/page.tsx`) branches new orgs straight into `HomeOnboarding` — a 3-step "① Was lieferst du? → ② An wen? → ③ Darf ich liefern?" card that drops Mara directly into item-classification + party-screening. That flow is excellent for the **Ausfuhrvorgang-Assistent** persona (Klaus, who already knows he must get a licence) but it is the _second_ question. It silently assumes the answer to the first. Mara doesn't know whether she's subject to:

- **EU Dual-Use** (Reg. 2021/821) — almost certainly, if she's EU-based and ships hardware/software/technology;
- **German national law** (AWG/AWV, Teil I Abschnitt A of the Ausfuhrliste, administered by **BAFA**) — if established in DE;
- **US EAR / ITAR** — **only** if there's US-origin content, US-person involvement, or a US nexus (NOT automatic for a German company);
- **MTCR / Wassenaar** — multilateral regimes whose controls are _already implemented_ via the EU/national lists, but which carry a strong-presumption-of-denial overlay for propulsion/large items;
- nothing yet that rises to a licence — but she still has **recordkeeping + screening** duties.

Without this front door, Mara either (a) bounces ("this tool is for people who already know this"), or — far worse — (b) assumes "we're a small German company, US rules don't apply to us" and ships a part with >25% US-origin content to a D:1 destination. **That second failure mode is exactly what this feature exists to prevent.**

**Goal.** A short, guided **applicability triage** — ~7 questions in Mara's language — that outputs:

1. **Which regimes apply**, each tagged `clearly applies` / `likely applies — confirm` / `out of scope on these facts — verify`, each with a one-line plain-language _why_;
2. a **"Was bedeutet das / was musst du tun?"** obligations summary written for a novice;
3. a **persisted org applicability profile** that _seeds the rest of the app_ — narrows classification jurisdictions, picks which sanctions lists to screen against, flags deemed-export risk, and turns the home onboarding from "do everything" into "here's _your_ shortlist."

---

## 2. The single most important constraint — TRIAGE, NOT LEGAL ADVICE

This is a **first-class design requirement**, not a disclaimer footnote. A novice cannot be allowed to over-trust this output. The danger is asymmetric: a wrong **"applies"** costs Mara some unnecessary diligence; a wrong **"does not apply"** — especially "ITAR doesn't apply to you" — can mean a criminal-liability export with no licence. The framing must make over-trust structurally hard.

Concrete design rules (all enforced, all testable):

- **R1 — No confident "you're fine."** The result NEVER renders a regime as a flat green "does not apply." The most-negative verdict a regime can receive is **`OUT_OF_SCOPE_ON_THESE_FACTS`**, always paired with the literal words "auf Basis deiner Angaben — bitte fachlich bestätigen" and the specific fact that drove it ("du hast _keinen_ US-Ursprungsanteil angegeben"). Out-of-scope is shown in **neutral grey, never success-green** — green is reserved nowhere in this surface.
- **R2 — Conservative default = "may apply."** Whenever an input is unknown, ambiguous, or the user picks "weiß nicht / unsicher", the rule resolves to **`LIKELY_APPLIES`** (amber), never to out-of-scope. Doubt always rounds _up_ toward "confirm with an expert," never down.
- **R3 — US controls are sticky.** US-origin content / US-person / US-tech answers can only ever _add_ US regimes (EAR, and ITAR when defense/military-spacecraft signals are present). A "no" to the US questions yields `OUT_OF_SCOPE_ON_THESE_FACTS` (R1 wording) — it never yields silence and never yields a clean "no."
- **R4 — Mandatory, unmissable disclaimer.** A persistent disclaimer banner sits at the top of the result (not collapsed, not below the fold) and a one-line reminder under every regime verdict. Mirrors the wording already used by `license-determination.ts`'s `DISCLAIMER`: _screening-level orientation, NOT a legal opinion, NOT a substitute for qualified export-control counsel; verify with BAFA / BIS / your national competent authority._ German equivalent below.
- **R5 — Name what it does NOT do, in the UI.** The result page carries a short "Was diese Einordnung **nicht** ist" block: it does not classify your specific items (no ECCN/USML), it does not tell you whether a _particular_ shipment is allowed, it does not replace a Güterlistenauskunft or legal opinion.
- **R6 — One mandatory acknowledgement before seeding.** Before the result is persisted + used to seed the app, Mara ticks one checkbox: _"Mir ist klar, dass dies eine vorläufige Orientierung ist und keine Rechtsberatung ersetzt."_ The persisted profile records that she acknowledged (timestamp). No silent auto-trust.

The German disclaimer string (single-sourced as a constant, reused in module + UI):

> „Diese Einordnung ist eine **vorläufige Orientierung auf Screening-Niveau** — **keine Rechtsberatung** und kein Ersatz für eine qualifizierte exportkontrollrechtliche Beratung. Insbesondere die Aussage, ob ein Regime _zutrifft_ oder _nicht zutrifft_, muss fachlich bestätigt werden (BAFA, BIS, oder die zuständige nationale Behörde). Im Zweifel gilt: ein Regime kann zutreffen."

---

## 3. Non-Goals / YAGNI

- **Not item classification.** It never produces an ECCN, USML category, or Anlage-AL number. That is the `classify` surface + `classification-pipeline.ts`. Applicability answers "which _list/regime_ universe is yours," not "what is _this thing_."
- **Not a per-shipment licence determination.** "Darf ich _diese Lieferung_ raus?" is the Ausfuhrvorgang-Assistent (`operation-assistant-verdict.ts` + `license-determination.ts`). Applicability is upstream + destination-agnostic.
- **Not sanctions screening.** It decides _which lists_ matter; it doesn't screen a party. That's `screen-party.server.ts`.
- **Not a legal opinion / Güterlistenauskunft.** Explicit per R5.
- **No new runtime dependencies.** Pure TS + existing Prisma + existing React/Tailwind `--trade-*` tokens + lucide. No new packages.
- **No multi-language beyond German.** UI strings are German (matches the rest of Trade). The pure module's `reason` strings are German too (they surface verbatim in the UI).
- **No coupling to the main-app assessment engines.** `src/lib/*.server.ts` (EU Space Act `engine.server.ts`, `unified-engine-merger.server.ts`, `export-control-engine.server.ts`) exist and are operator-profile-driven, but they answer _space-regulatory_ applicability (Space Act modules, NIS2), not _trade-control regime_ applicability, and they're DB/operator-profile-coupled. We deliberately build a small, focused, **pure** Trade module instead. (Reuse note: the question-set's _operator-type_ vocabulary echoes `OperatorType`/`companyTypesJson` so the seeded profile lines up — but no engine import.)
- **No re-screening / no scoring number.** No "applicability score 73/100." Regimes + verdicts + obligations only. A number invites exactly the over-trust R1–R6 fight against.

---

## 4. Architecture

Three layers, mirroring the proven Trade pattern (pure logic module → thin server action → presentational client UI), exactly like `unified-documents.ts` / `operation-assistant-verdict.ts`:

```
src/lib/trade/applicability/
  assess-applicability.ts        ← PURE. The rule engine. Node-tested truth table.
  assess-applicability.test.ts   ← Vitest, node env. The correctness gate.
  applicability-copy.ts          ← German obligation blurbs per regime (pure data; imported by UI + seed).
  applicability-service.server.ts← server-only. persist result + map answers → TradeComplianceProgram/TradeOrgProfile seed.

src/app/(trade)/trade/applicability/
  page.tsx                       ← server page (auth + org + "already done?" read + render).
  _components/ApplicabilityWizard.tsx   ← "use client" stepper over the question set.
  _components/ApplicabilityResult.tsx   ← "use client" verdict cards + obligations + disclaimer + ack + seed CTA.

src/app/(trade)/trade/_components/
  ApplicabilityGateBanner.tsx    ← "use client" dismissible banner shown on home until the profile exists.
```

### 4.1 The pure core — `assessApplicability(answers): ApplicabilityResult`

**No I/O, no async, no DB** — identical discipline to `license-determination.ts` ("This engine is PURE"). All correctness lives here and is node-testable (jsdom hangs on this machine — see §8).

**Input shape (the answer model):**

```ts
/** ISO-3166-1 alpha-2, plus the special "EU" pseudo-code for "EU but unsure which member state". */
export type CountryCode = string;

export type YesNoUnsure = "yes" | "no" | "unsure";

export interface ApplicabilityAnswers {
  /** Q1 — Where is the company legally established? ISO-2 (e.g. "DE", "FR"), "EU" (member state TBD), or "NON_EU". */
  establishmentCountry: CountryCode | "EU" | "NON_EU";

  /** Q2 — What do you make / move? Multi-select; drives "is there a controllable good at all". */
  productKinds: ProductKind[]; // see enum below — hardware | software | technology/technical-data | pure-service | unsure

  /** Q3 — Is anything you build space/defense-flavoured? Multi-select of coarse domain signals. */
  domainSignals: DomainSignal[]; // satellite | launch_propulsion | ground_station | rf_payload | imaging_eo_sar | none | unsure

  /** Q4 — US-origin content? Any US-made parts, components, software, or US-origin technology in your product. */
  hasUsOriginContent: YesNoUnsure;

  /** Q5 — US persons / US-incorporated entity / US-origin technical data handled? (deemed-export + ITAR-person nexus) */
  hasUsPersonOrTechNexus: YesNoUnsure;

  /** Q6 — Do you build, integrate, or service anything specifically MILITARY / defense (vs purely civil/commercial)? */
  hasMilitaryOrDefenseNexus: YesNoUnsure;

  /** Q7 — Do you ship / transmit / give access to anyone OUTSIDE your establishment country? (incl. intra-EU, incl. emailing tech data, incl. foreign staff) */
  transfersAbroad: TransferScope; // none | intra_eu_only | outside_eu | global | unsure

  /** Optional Q8 — known destination markets, ISO-2 list. Used only to RAISE confidence/flags, never to clear a regime. */
  destinationCountries?: CountryCode[];
}

export type ProductKind =
  | "hardware"
  | "software"
  | "technology"
  | "service_only"
  | "unsure";
export type DomainSignal =
  | "satellite"
  | "launch_propulsion"
  | "ground_station"
  | "rf_payload"
  | "imaging_eo_sar"
  | "none"
  | "unsure";
export type TransferScope =
  | "none"
  | "intra_eu_only"
  | "outside_eu"
  | "global"
  | "unsure";
```

**Output shape (the result model):** echoes the established `Verdict`/`StepResult` and `LicenseRequirement` shapes so the UI reuses card patterns.

```ts
export type Regime =
  | "EU_DUAL_USE" // Reg. (EU) 2021/821
  | "DE_NATIONAL" // AWG/AWV + Ausfuhrliste Teil I A (BAFA)
  | "US_EAR" // 15 CFR 730–774 (BIS)
  | "US_ITAR" // 22 CFR 120–130 (DDTC)
  | "MTCR" // Missile Technology Control Regime overlay
  | "WASSENAAR"; // Wassenaar Arrangement (dual-use + munitions baseline)

export type Applicability =
  | "CLEARLY_APPLIES" // strong basis (red/amber dot, NOT a "do nothing")
  | "LIKELY_APPLIES" // default under doubt (amber) — "confirm"
  | "OUT_OF_SCOPE_ON_THESE_FACTS"; // NEVER a confident "no" — neutral grey + R1 wording

export interface RegimeVerdict {
  regime: Regime;
  applicability: Applicability;
  /** One-line plain-German why, naming the deciding fact. */
  reason: string;
  /** Stable key into applicability-copy.ts for the obligations blurb. */
  copyKey: string;
  /** The answer field(s) that drove this verdict — for "show your work" + test assertions. */
  basis: Array<keyof ApplicabilityAnswers>;
  /** True when this verdict came from the conservative doubt-rounds-up path (R2). */
  fromUncertainty: boolean;
}

export interface ApplicabilityResult {
  verdicts: RegimeVerdict[]; // one per Regime, ALWAYS all six present (never omit a regime silently)
  /** Coarse headline mirroring operation-assistant: how loud is this? */
  headline: "VIELE_REGIME" | "EINIGE_REGIME" | "ORIENTIERUNG_NÖTIG";
  /** Seed payload for the app (consumed by the server service; never persisted as-is). */
  seed: ApplicabilitySeed;
  /** The mandatory disclaimer text (single constant). */
  disclaimer: string;
}

export interface ApplicabilitySeed {
  /** ISO-2 primary jurisdiction for TradeOrgProfile.primaryExportJurisdiction. */
  primaryExportJurisdiction: string | null;
  /** Regime tags for TradeOrgProfile.preferredRegimesJson (BIS|BAFA|DDTC|ECJU subset that the schema documents). */
  preferredRegimes: string[];
  /** Booleans that seed TradeComplianceProgram. */
  hasItarItems: boolean; // only true when ITAR is CLEARLY/LIKELY (never on out-of-scope)
  hasEarItems: boolean;
  hasForeignNationals: boolean; // from US-person/tech nexus (deemed-export)
  /** companyTypesJson seed — coarse operator types derived from domainSignals. */
  companyTypes: string[];
  /** Which sanctions-list families downstream screening should default-on. */
  screeningListHints: string[]; // e.g. ["OFAC","BIS_ENTITY","DDTC_DEBARRED"] when US; always ["EU","UN"].
}
```

### 4.2 Persistence — **additive Prisma migration on `TradeOrgProfile`** (no new model)

`TradeOrgProfile` (schema line 14361) **already** carries `primaryExportJurisdiction` and `preferredRegimesJson` — the applicability output's core ("your jurisdiction + your regimes") literally already has a home. We only need to store the _full result snapshot_ + a completion marker so the home can gate on it and the result page can re-render without recompute.

**Migration (additive, all nullable — zero backfill, safe):** add to `model TradeOrgProfile`:

```prisma
  // ── Applicability onboarding (front-door triage) ──
  /// JSON snapshot of the last ApplicabilityResult (verdicts + answers + version).
  /// NULL = the org has never completed the applicability triage → home shows the gate banner.
  applicabilityResultJson String?  @db.Text
  /// When the triage was completed/acknowledged. NULL = not done.
  applicabilityCompletedAt DateTime?
  /// Rule-set version that produced the snapshot, so a future rule change can re-prompt.
  applicabilityRuleVersion Int?
```

That is the **only** schema change. It is purely additive + nullable, so `prisma migrate` needs no data migration and existing orgs simply read `NULL` (= "not done", banner shows). The richer answer-derived booleans (`hasITARItems`, `hasEARItems`, `hasForeignNationals`, `companyTypesJson`, `exportsToCountries`, `jurisdictionDetermination`) are seeded into the **existing** `TradeComplianceProgram` columns (schema line 12020) via `upsertProgramProfile()` — no schema work there at all.

> **Decision flag for the human:** persist a snapshot (chosen here, so the result is durable, re-viewable, and audit-traceable, and the home gate is one cheap field read) **vs** recompute-on-the-fly from raw answers each visit (less storage, but then we must store the raw answers _somewhere_ anyway and re-run the engine on every home load). The snapshot also lets a future rule-version bump detect staleness via `applicabilityRuleVersion`. Recommended: **persist the snapshot.**

### 4.3 The server service — `applicability-service.server.ts`

`import "server-only"`. Three functions, all org-scoped, all routed through the existing `program-service.ts` encryption boundary for the program seed (never write `TradeComplianceProgram` directly):

- `getApplicability(orgId)` → reads `TradeOrgProfile.applicabilityResultJson` (+ completedAt), returns the parsed `ApplicabilityResult | null`.
- `saveApplicability(orgId, answers, ackAt)` → calls the **pure** `assessApplicability(answers)`, writes the snapshot JSON + `applicabilityCompletedAt = ackAt` + `applicabilityRuleVersion` onto `TradeOrgProfile`, **and** seeds `primaryExportJurisdiction` / `preferredRegimesJson` on the same row from `result.seed`.
- `seedProgramFromApplicability(orgId, seed)` → `upsertProgramProfile(orgId, { hasITARItems, hasEARItems, hasForeignNationals, companyTypesJson: JSON.stringify(seed.companyTypes), exportsToCountries: …, jurisdictionDetermination: deriveJurisdictionTag(seed) })`. Idempotent (it's an upsert-merge). Conservative: it only ever _sets_ `hasITARItems`/`hasEARItems` to `true` — it never flips an operator's existing `true` back to `false` from an out-of-scope verdict (the operator may know better; we don't override downward).

The **answers→seed→profile** mapping is the bridge that makes the front door actually wire into the app, not a dead-end quiz.

### 4.4 How it seeds the rest of the app (the payoff)

| Seed field                              | Persisted to                                                                                                                                                                                                                              | Downstream effect                                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primaryExportJurisdiction`             | `TradeOrgProfile.primaryExportJurisdiction`                                                                                                                                                                                               | Dashboards/report templates already bias on this (schema comment). Classify + licence flows default the home jurisdiction.                                              |
| `preferredRegimes` (`["BAFA","BIS",…]`) | `TradeOrgProfile.preferredRegimesJson`                                                                                                                                                                                                    | Narrows the **classify** surface to the relevant control-list universes; hides ITAR/US panels for a pure-EU org until/unless a US signal appears.                       |
| `hasItarItems` / `hasEarItems`          | `TradeComplianceProgram.hasITARItems/hasEARItems`                                                                                                                                                                                         | Drives ITAR/EAR requirement-applicability in the program (`itar-ear-requirements.ts` status rows) — exactly the field `migrate-legacy-assessment.ts` already populates. |
| `hasForeignNationals`                   | `TradeComplianceProgram.hasForeignNationals`                                                                                                                                                                                              | Flags **deemed-export** relevance → surfaces `/trade/deemed-exports` in the obligations list + home shortlist.                                                          |
| `companyTypes`                          | `TradeComplianceProgram.companyTypesJson`                                                                                                                                                                                                 | Requirement applicability (which program requirements are in-scope).                                                                                                    |
| `screeningListHints`                    | (not a column) returned in result; the obligations UI + the home "your shortlist" use it to say _which lists matter_; party-screening already screens all critical lists, so this is informational, not a filter that could under-screen. | Honest: we never _narrow_ screening (that could miss a hit) — we only _highlight_ which lists are most relevant.                                                        |

Result: after the triage, the home onboarding stops saying "do all three generic steps" and starts saying **"You're subject to EU Dual-Use + German BAFA. Your shortlist: 1) classify your items against Annex I, 2) screen your buyers against EU/UN, 3) (no US duties on these facts — but confirm if you ever add US parts)."**

---

## 5. The question set + branching

Aim: **7 core questions** (Q8 optional), each in plain German with a one-line "warum wir das fragen" helper and a "weiß nicht / unsicher" option that triggers R2. Single-screen-per-question stepper (matches the wizard feel of the existing onboarding), back/forward, progress dots, resumable via the persisted draft (answers held client-side until the final ack-submit; no half-state in the DB).

| #               | Question (DE)                                                                                                                                                     | Type                                                             | Drives                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Q1              | „Wo ist euer Unternehmen rechtlich ansässig?"                                                                                                                     | single (ISO-2 / „EU, weiß nicht welcher Staat" / „außerhalb EU") | base jurisdiction → EU Dual-Use + DE national                                                  |
| Q2              | „Was stellt ihr her oder bewegt ihr?" (Hardware · Software · Technologie/technische Unterlagen · nur Dienstleistung · weiß nicht)                                 | multi                                                            | „is there a controllable good at all"                                                          |
| Q3              | „Hat davon etwas mit Raumfahrt oder Verteidigung zu tun?" (Satellit · Antrieb/Trägerrakete · Bodenstation · RF-Nutzlast · Erdbeobachtung/SAR · nein · weiß nicht) | multi                                                            | MTCR/Wassenaar overlay + companyTypes + military hint                                          |
| Q4              | „Steckt US-Ursprung drin?" — US-Teile, -Komponenten, -Software oder US-Technologie im Produkt                                                                     | yes/no/unsure                                                    | **US_EAR** gate (R3)                                                                           |
| Q5              | „Sind US-Personen beteiligt oder verarbeitet ihr US-Technologie/technische Daten?"                                                                                | yes/no/unsure                                                    | ITAR-person nexus + **deemed-export** flag                                                     |
| Q6              | „Baut, integriert oder wartet ihr gezielt MILITÄRISCHES Gerät (statt rein zivil)?"                                                                                | yes/no/unsure                                                    | **US_ITAR** + munitions-list signal                                                            |
| Q7              | „Liefert oder übermittelt ihr an jemanden außerhalb eures Landes?" (nein · nur innerhalb EU · außerhalb EU · weltweit · weiß nicht)                               | single                                                           | whether transfer/licence universe is even reached; intra-EU vs extra-EU nuance                 |
| Q8 _(optional)_ | „In welche Länder liefert ihr (falls bekannt)?"                                                                                                                   | multi ISO-2                                                      | only RAISES flags (e.g. a D:1/E:1 destination bumps confidence/urgency); never clears a regime |

**Branching is deliberately minimal** (transparency > cleverness): all 7 are always asked except —

- If Q2 = **only** „nur Dienstleistung" AND Q7 = „nein": we still ask Q4–Q6 (services can still carry US-tech/ITAR-person nexus) but the result foregrounds "auf diesen Angaben wird wohl kein _Güter_-Export ausgelöst — aber technische Unterstützung kann eigene Pflichten haben."
- Q5/Q6 are never skipped on a "no" elsewhere (R3 stickiness).

---

## 6. The rule logic (transparent + conservative)

Plain, readable, branch-per-regime — same shape as `license-determination.ts`'s gate sequence. Each regime is evaluated independently and **always emitted** (six verdicts, every time). Pseudocode of the deciding logic (full code in the plan):

**EU_DUAL_USE**

- `establishmentCountry ∈ EU/DE/specific-EU` AND `productKinds` includes any of hardware/software/technology → `CLEARLY_APPLIES` ("EU-Ansässigkeit + handelbares Gut → EU-Dual-Use-VO 2021/821 ist euer Grundregime").
- establishment EU but `productKinds = [service_only]` only → `LIKELY_APPLIES` ("technische Unterstützung kann erfasst sein").
- establishment `NON_EU` → `LIKELY_APPLIES` (re-export of EU/US-origin items can still pull EU/extraterritorial rules — never clear it) unless _no_ product + no transfer → `OUT_OF_SCOPE_ON_THESE_FACTS`.
- any `unsure` in the driving inputs → `LIKELY_APPLIES` (R2).

**DE_NATIONAL (BAFA / AWV)**

- `establishmentCountry === "DE"` AND has a product → `CLEARLY_APPLIES` ("in DE ansässig → zusätzlich AWG/AWV, BAFA ist eure Behörde").
- establishment `"EU"` (member state unknown) → `LIKELY_APPLIES` ("falls Deutschland: nationales Recht + BAFA").
- establishment a _specific non-DE_ EU state → `OUT_OF_SCOPE_ON_THESE_FACTS` for the _German_ regime, with R1 wording + "euer nationales Recht ist das eures Sitzlandes — bitte dort prüfen." (We don't model FR/IT/ES national law in v1; we say so honestly.)

**US_EAR** (R3 — sticky, never auto-applies for a non-US org)

- `hasUsOriginContent === "yes"` → `CLEARLY_APPLIES` ("US-Ursprungsanteil → EAR kann gelten (de-minimis-/FDPR-Prüfung nötig)").
- `hasUsOriginContent === "unsure"` OR `hasUsPersonOrTechNexus === "yes"/"unsure"` → `LIKELY_APPLIES` (R2/R3).
- `hasUsOriginContent === "no"` AND `hasUsPersonOrTechNexus === "no"` → `OUT_OF_SCOPE_ON_THESE_FACTS` with the **exact R1 sentence** naming the fact ("du hast keinen US-Ursprungsanteil und keinen US-Personen-/Technologie-Bezug angegeben — auf dieser Basis nicht im Anwendungsbereich; bitte fachlich bestätigen, sobald sich Lieferkette oder Team ändert").

**US_ITAR** (the most dangerous "no" — most conservative)

- `hasMilitaryOrDefenseNexus === "yes"` AND (`hasUsPersonOrTechNexus === "yes"` OR `hasUsOriginContent === "yes"`) → `CLEARLY_APPLIES` ("militärischer Bezug + US-Nexus → ITAR/USML möglich; das ist ein Fall für Fachberatung, **nicht** für dieses Tool allein").
- `hasMilitaryOrDefenseNexus === "yes"` alone, OR any relevant `unsure`, OR `domainSignals` includes `launch_propulsion` with a military/`unsure` answer → `LIKELY_APPLIES` ("möglicher ITAR-Bezug — unbedingt fachlich klären").
- `hasMilitaryOrDefenseNexus === "no"` AND `hasUsPersonOrTechNexus === "no"` AND `hasUsOriginContent === "no"` → `OUT_OF_SCOPE_ON_THESE_FACTS` with the strongest R1 wording, explicitly: "ITAR ist ein extraterritoriales US-Recht mit hohen Strafen — die Aussage 'trifft nicht zu' MUSS fachlich bestätigt werden."

**MTCR** (overlay)

- `domainSignals` includes `launch_propulsion` → `CLEARLY_APPLIES` ("Antrieb/Trägertechnik berührt MTCR — Kat. I trägt eine starke Ablehnungsvermutung").
- `domainSignals` includes `satellite`/`imaging_eo_sar` → `LIKELY_APPLIES` ("kompletter Satellit / bestimmte Nutzlasten können MTCR-relevant sein").
- else → `OUT_OF_SCOPE_ON_THESE_FACTS` (neutral, "auf Basis der genannten Produktarten").

**WASSENAAR** (baseline overlay)

- has any product (hardware/software/technology) → `LIKELY_APPLIES` by default ("die EU-/nationalen Listen setzen Wassenaar bereits um — relevant, sobald euer Gut gelistet ist; die konkrete Einstufung klärt die Klassifizierung"). Wassenaar essentially never gets a confident out-of-scope while a product exists, because its controls are baked into the EU list the company is already (likely) subject to.
- `productKinds = [service_only]`/`[unsure]` → `LIKELY_APPLIES` (R2).
- truly no product + no transfer → `OUT_OF_SCOPE_ON_THESE_FACTS`.

**Headline** mirrors `pickHeroAction`/`deriveVerdict`: count regimes at `CLEARLY_APPLIES` → ≥3 ⇒ `VIELE_REGIME`; ≥1 ⇒ `EINIGE_REGIME`; 0 ⇒ `ORIENTIERUNG_NÖTIG` (note: never "alles gut" — even zero-clearly still has amber/confirm items).

**Why this is honest:** the only paths to `OUT_OF_SCOPE_ON_THESE_FACTS` require an explicit, deliberate **"no"** on the relevant questions (never `unsure`, never silence), and even then the verdict is grey-with-a-warning, never green-with-a-checkmark. Every `unsure` rounds up. US/ITAR can only be added by US-signal answers, never silently cleared.

---

## 7. UI placement + flow

**Where it lives — recommended: a dedicated route `/trade/applicability`, gated into the home for brand-new orgs.** (Decision flag in §9.)

- **Route:** `src/app/(trade)/trade/applicability/page.tsx` — server component: `auth()` → `resolveOrgId` (reuse the home's helper pattern) → `getApplicability(orgId)`. If already completed, render the **result** (re-viewable, re-runnable via a "neu einschätzen" button); else render the **wizard**.
- **Home gate (the front door):** in `page.tsx`, when the org has **no trade data AND no applicability profile**, the `showOnboarding` branch leads with a new top card — `ApplicabilityGateBanner` — "**Neu hier? Klär in 2 Minuten, welche Regeln für dich gelten.** → Einschätzung starten" linking to `/trade/applicability`, _above_ the existing 3-step `HomeOnboarding`. The 3 steps stay (they're the natural next move once you know the regimes), but they're now framed as step 2. Once `applicabilityCompletedAt` is set, the banner disappears and the home shows the **"dein Geltungsbereich"** mini-summary chip (regimes that apply) instead.
- **Wizard flow:** stepper Q1→Q7 (+optional Q8), `--trade-*` tokens, indigo accent, lucide icons, progress dots — visually a sibling of `HomeOnboarding`/`EmptyStateRich`. "Zurück/Weiter," "weiß nicht" always available. Answers live in client state; nothing persists until the final acknowledged submit.
- **Result page:** top = the **mandatory disclaimer banner** (R4, indigo-bordered, not dismissible) → headline ("Auf Basis deiner Angaben betreffen dich diese Regime:") → **six verdict cards** in a deterministic order (clearly-applies first, then likely, then out-of-scope), each: regime name, an `Applicability` dot (red=clearly / amber=likely / **neutral grey**=out-of-scope — NO green anywhere), the one-line `reason`, and a "Was bedeutet das?" expandable obligations blurb from `applicability-copy.ts`. Below the cards: the **"Was diese Einordnung NICHT ist"** block (R5). Then the **acknowledgement checkbox** (R6) gating an **"Übernehmen & meine Schritte anzeigen"** primary button → calls `saveApplicability` + `seedProgramFromApplicability`, then routes to home (now showing the personalised shortlist).
- **Astra hand-off (reuse `?prefill=`):** each verdict card and the result footer carry a quiet "Astra fragen" link → `/trade/astra?prefill=<regime-specific question>` (the exact `EmptyStateRich` deep-link pattern, line 111), e.g. for ITAR-likely: `prefill="ITAR könnte uns betreffen — was muss ich als deutsches Raumfahrt-Startup zuerst klären?"`. This is the escape hatch for a novice who wants to go deeper without us pretending to give the legal answer.

**Obligations copy** (`applicability-copy.ts`, pure data, German, novice-readable) — e.g. for `EU_DUAL_USE` CLEARLY: "Eure Güter müssen gegen **Anhang I** der EU-Dual-Use-VO geprüft (klassifiziert) werden. Steht etwas auf der Liste, braucht ihr für Ausfuhren aus der EU eine Genehmigung. Erste Schritte: Artikel anlegen → klassifizieren." Each blurb ends pointing at the relevant in-app surface (classify / parties / deemed-exports) so the obligations are _actionable_, plus the per-verdict disclaimer reminder.

---

## 8. Testing strategy

**The pure module is the correctness contract — and it is the only thing that gets exhaustive automated coverage**, because that is where the rule-correctness risk lives and because **jsdom component tests HANG on this machine** (consistent with Trade UI phases 1/2/3A–3D).

- **`assess-applicability.test.ts` — Vitest, node env** (`import { describe, it, expect } from "vitest"`; no jsdom). A **truth table** over the rule set:
  - One block per regime asserting all three verdicts (`CLEARLY_APPLIES` / `LIKELY_APPLIES` / `OUT_OF_SCOPE_ON_THESE_FACTS`) on representative answer fixtures, asserting `applicability`, the `basis` fields, and `fromUncertainty`.
  - **R1 invariant test:** for _every_ regime and _every_ fixture in the table, assert no verdict equals a (nonexistent) "DOES_NOT_APPLY" and that any `OUT_OF_SCOPE_ON_THESE_FACTS` carries the R1 marker substring in `reason`.
  - **R2 invariant test:** a parametric sweep — for each US/military input, flipping it to `"unsure"` must never produce `OUT_OF_SCOPE_ON_THESE_FACTS` for the regime it gates (doubt rounds up).
  - **R3 invariant test:** `hasUsOriginContent="no" + hasUsPersonOrTechNexus="no"` → US_EAR is out-of-scope; flipping either to "yes"/"unsure" must (re)introduce US_EAR as clearly/likely. ITAR analog.
  - **Completeness test:** `verdicts.length === 6` and the set of regimes is exactly the six, for an arbitrary fixture (no silent omission).
  - **Seed-mapping test:** out-of-scope regimes never set their seed boolean true (e.g. ITAR out-of-scope ⇒ `seed.hasItarItems === false`); clearly/likely US ⇒ `seed.hasEarItems === true`; military+US ⇒ `seed.hasItarItems === true`.
  - **Determinism test:** same answers ⇒ deep-equal result (pure, no Date.now / no randomness in the core).
  - `applicability-copy.ts`: a test asserting every `copyKey` emitted by the engine across the table has a matching blurb entry (no missing copy).
- **`applicability-service.server.ts`:** covered by `tsc --noEmit` + source review for the seed mapping; the encryption/DB boundary is the already-tested `program-service.ts`. (No new DB integration test required — it composes tested primitives.)
- **Components** (`ApplicabilityWizard`, `ApplicabilityResult`, `ApplicabilityGateBanner`, the home edit): **gated by `npm run lint` + `npx tsc --noEmit` + source review** — NOT jsdom (it hangs). This matches every recent Trade UI phase's stated gate.

---

## 9. Top decisions for the human

1. **Where it lives.** Recommended: **dedicated `/trade/applicability` route + a home gate banner** for new orgs (banner until `applicabilityCompletedAt` set), keeping the existing 3-step `HomeOnboarding` as the natural "step 2." Alternative considered: replace the home onboarding entirely / make it a blocking first-run modal. The banner+route approach is the least disruptive, is re-visitable, and doesn't trap a user who already knows the basics. **Confirm this vs a blocking first-run gate.**
2. **Persist a snapshot vs recompute.** Recommended: **persist** the `ApplicabilityResult` JSON + `completedAt` + `ruleVersion` on `TradeOrgProfile` (3 additive nullable columns → one tiny migration). Durable, re-viewable, audit-friendly, cheap home gate, and enables rule-version staleness detection. Alternative: store only raw answers and re-run the engine each load (saves the JSON column but still needs an answers column + recompute). **Confirm the additive migration is acceptable** (it is purely additive + nullable, zero backfill).
3. **Question count / depth (7 core +1 optional).** Recommended 7 to stay honestly "2 Minuten." More questions (e.g. splitting US-origin into parts-vs-software-vs-tech, or adding an annual-export-value bracket) would sharpen the EAR/de-minimis hinting and the program seed, at the cost of novice fatigue. **Confirm 7, or ask for the extra US-granularity question** if seeding `annualExportValueEur` / finer ITAR signals is worth one more screen.

(Secondary, lower-stakes: do we want the German national branch to honestly say "non-DE EU state → your national law, not modelled here" — recommended **yes**, per R5 honesty — vs attempting FR/IT/ES national-law verdicts in v1, which we'd rather defer.)

---

## 10. Risks

- **Over-trust despite framing (the central risk).** Mitigated by R1–R6 (no green, no confident "no," mandatory disclaimer + ack, "what this isn't" block, doubt-rounds-up). Residual risk: a user clicks through the ack without reading. Accepted — we make over-trust _structurally hard_, not impossible; the seeding is conservative (never flips a known-true risk to false).
- **Rule drift / regulatory change.** The rules encode 2026 regime boundaries (e.g. EU 2021/821, ITAR person/US-origin nexus). `applicabilityRuleVersion` lets a future bump detect stale snapshots and re-prompt. The pure module + truth table make a rules change a reviewable, test-gated diff.
- **Seeding wrong.** A wrong seed (e.g. `hasItarItems=true` when it shouldn't be) only ever _adds_ diligence surfaces — conservative by direction. We never seed a `false` that suppresses a surface from an out-of-scope verdict (the service guards this).
- **Scope creep into classification.** Tempting to let a "satellite" answer pre-suggest an ECCN. Explicitly out of scope (§3) — applicability picks the _regime universe_, classification picks the _code_. Keeping the line sharp is what keeps the honesty claim true.
- **German-only.** Matches Trade today; if Trade ever internationalises, the `reason`/copy strings move to i18n. Not a v1 concern.

---

## 11. What this feature does NOT determine (explicit, for the record)

- It does **not** classify any specific item (no ECCN, USML category, or Anlage-AL number).
- It does **not** decide whether a particular shipment to a particular destination is allowed (that is the Ausfuhrvorgang-Assistent).
- It does **not** screen any party against sanctions lists (it only names which lists matter).
- It does **not** produce a Güterlistenauskunft, a binding jurisdiction determination, or a legal opinion.
- It does **not** ever output a confident "this regime does not apply to you" — the most negative verdict is "out of scope on these facts — verify," in neutral grey, with a mandatory expert-confirmation reminder.
