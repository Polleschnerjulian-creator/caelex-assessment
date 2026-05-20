# Caelex Assessment — Pitch Briefing

> The regulatory triage engine every space operator needs before they launch, scale, or cross a border.
> Four assessment modules. One combined verdict. Fourteen dashboard modules for the follow-through.

---

## The one-line pitch

**Caelex Assessment** turns the overwhelming, fragmented space-regulation landscape —
EU Space Act + NIS2 + 31 national space laws + UK + US + export control + spectrum —
into a 10-minute guided wizard that outputs a precise compliance scorecard,
a jurisdiction-specific licensing roadmap, and a 14-module dashboard to track every
obligation to green.

---

## The problem

Every space operator — from a university cubesat team to a mega-constellation
operator — faces the same nightmare:

1. **"Which rules apply to me?"** The EU Space Act alone has 119 articles. Add
   NIS2 (51 requirements, 14 categories). Add 31 national space laws. Add UK SIA.
   Add FCC/FAA/ITAR. Add COPUOS. Add ITU. There is no authoritative map.
2. **"How ready am I?"** Even when the rules are known, operators lack a scoring
   baseline — are we at 30%, 70%, 95% compliant? What's missing?
3. **"What do I do next?"** A scorecard without a roadmap is useless. Operators
   need specific obligations, deadlines, evidence lists, cost ranges.
4. **"Has anything changed?"** Regulations evolve. Ad-hoc Excel trackers go stale.

**Without Caelex Assessment** → compliance is a 6-figure, 3-month external consultancy engagement, repeated every time the regulation changes.
**With Caelex Assessment** → 10 minutes, $0, continuously updated, dashboard-tracked.

---

## The four assessment modules

Each module is a standalone wizard that can run independently or feed into the
unified combined view.

| Module                 | Route                      | Questions                                        | Coverage                                                                                                                              | Output                                                                                                                                  |
| ---------------------- | -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **EU Space Act**       | `/assessment/eu-space-act` | **9** conditional steps                          | **119 articles** across 9 modules, **7 operator types**                                                                               | Standard/Light regime + per-module status (required/simplified/recommended/NA) + checklist + key dates                                  |
| **NIS2 Directive**     | `/assessment/nis2`         | **7** conditional steps                          | **51 requirements** across **14 categories** (governance, MFA, incident handling, supply chain, cryptography, business continuity, …) | Entity classification (Essential / Important / Out-of-scope) + requirement breakdown by severity (Critical / High / Medium / Low)       |
| **National Space Law** | `/assessment/space-law`    | Multi-select jurisdictions + 7 conditional steps | **31 jurisdictions**: EU-27 + UK + NO, CH, TR, IS, LI, US                                                                             | Jurisdiction-specific favorability score (0–100) + licensing-path comparison matrix + timelines + cost ranges                           |
| **Unified**            | `/assessment/unified`      | **59** across 5 phases                           | All three above, combined                                                                                                             | One cross-regulation scorecard with EU Space Act regime + NIS2 classification + Space Law recommendations, deduplicated across articles |

---

## The operator journey — end-to-end

```
   ┌───────────────────────────────────────────────────────────────────┐
   │  Step 1: Pick a module (or Unified if you span regimes)          │
   │    └─▶ Wizard adapts questions based on prior answers (conditional)│
   │                                                                   │
   │  Step 2: Answer 7–59 questions (10 minutes)                      │
   │    └─▶ Quick-exit paths for out-of-scope cases                    │
   │    └─▶ Anti-bot timing validation (≥3s floor)                    │
   │                                                                   │
   │  Step 3: Live results dashboard                                   │
   │    ├─▶ Compliance profile (scorecard)                            │
   │    ├─▶ Module status grid (9 modules for EU Space Act)           │
   │    ├─▶ Obligation checklist (article-level)                      │
   │    ├─▶ Key dates (deadlines, reviews)                            │
   │    └─▶ Jurisdiction comparison (Space Law)                       │
   │                                                                   │
   │  Step 4: Downloadable PDF report (email-gated)                   │
   │                                                                   │
   │  Step 5: Sign up → dashboard imports results automatically       │
   │    └─▶ 14 dashboard modules light up with pre-populated state    │
   │    └─▶ Astra AI gets the context for copilot questions          │
   │    └─▶ NCA Portal pre-populates submission forms                 │
   │    └─▶ Verity Passport generator gets the compliance baseline    │
   └───────────────────────────────────────────────────────────────────┘
```

---

## Behind the wizards — the engines

All regulatory intelligence lives in **server-only** TypeScript files
(`import "server-only"`). They never ship to the client, so the decision logic
isn't reverse-engineerable from browser dev tools.

| Engine                           | File                                        | Core function                                        | What it computes                                                                                              |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **EU Space Act**                 | `engine.server.ts` (633 LOC)                | `calculateCompliance()`                              | Operator type → article applicability → regime (Standard/Light) → 9 module statuses                           |
| **NIS2**                         | `nis2-engine.server.ts` (489 LOC)           | `classifyNIS2Entity()` + `calculateNIS2Compliance()` | Article 2+3 decision tree → Essential/Important/Out-of-scope + 51 severity-weighted requirements              |
| **National Space Law**           | `space-law-engine.server.ts` (928 LOC)      | `calculateSpaceLawCompliance()`                      | Jurisdiction profile lookup × activity mapping → favorability score + licensing path                          |
| **Unified Merger**               | `unified-engine-merger.server.ts` (881 LOC) | `mergeMultiActivityResults()`                        | Dedupes articles by number, applies most-restrictive module status, concatenates checklists, merges key-dates |
| **IRPE (compliance aggregator)** | `irpe-engine.server.ts`                     | Compliance posture scorer                            | Rolls up all 14 dashboard modules into a single 0–100 compliance score                                        |

---

## Regulatory data — the knowledge base

| Data file                         | Size      | Content                                                                                                                         |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `caelex-eu-space-act-engine.json` | 73 KB     | 119 articles, 7 operator types, 9 modules, chapters, decision tree, cost estimates, key dates                                   |
| `nis2-requirements.ts`            | 4,213 LOC | 56 requirement objects with severity, ENISA mappings, ISO 27001 mappings, implementation timeframes, evidence requirements      |
| `national-space-laws.ts`          | 1,681 LOC | 31 jurisdiction profiles: legal text, licensing requirements, timelines, cost ranges, regulatory contacts, recent amendments    |
| `modules.ts`                      | —         | 9 module definitions: Authorization, Registration, Cybersecurity, Debris, Environmental, Insurance, NIS2, Supervision, Evidence |

---

## Output artifacts — what an operator walks away with

### 1. Live results dashboard

Module-by-module scorecard, rendered immediately on wizard completion. Four
flavors of results dashboard depending on module:

- `ResultsDashboard.tsx` — EU Space Act (module cards + checklist + articles)
- `NIS2ResultsDashboard.tsx` — Classification badge + severity-filtered requirements
- `SpaceLawResultsDashboard.tsx` — Jurisdiction matrix + licensing paths
- `UnifiedResultsDashboard.tsx` — Cross-regulation scorecard

### 2. PDF report

Generated client-side via jsPDF. Includes compliance profile, module status grid,
full checklist, article breakdown, operator-specific guidance. Email-gated
(lead-gen signal).

### 3. Dashboard integration (upon sign-up)

Results cached in `localStorage` (`caelex-pending-assessment`,
`caelex-pending-nis2-assessment`) survive the sign-up flow and populate the
14-module compliance dashboard.

### 4. Astra AI context

Compliance score + operator profile flow directly into the Astra AI copilot's
context builder — the user can immediately ask "what do I need to do for
Article 70?" and get a contextualized answer.

### 5. NCA Portal pre-population

For operators about to file with a National Competent Authority, the
Supervision module pre-fills submission forms using assessment outputs.

### 6. Verity Passport baseline

Compliance scores feed into the Verity Passport generator — each module's
status becomes a cryptographic claim in the operator's space compliance passport.

---

## The 14 dashboard modules — continuous compliance

After the assessment, operators land in a 14-module dashboard that tracks every
regulatory obligation to green.

| #   | Module                | Regulatory anchor                             |
| --- | --------------------- | --------------------------------------------- |
| 1   | **Authorization**     | EU Space Act licensing workflow               |
| 2   | **Registration**      | URSO / national space object registries       |
| 3   | **Cybersecurity**     | NIS2 + ENISA controls                         |
| 4   | **Debris Mitigation** | COPUOS + IADC + EU Space Act Art. 70          |
| 5   | **Environmental**     | SEA / IAA + launch-site NEPA                  |
| 6   | **Insurance**         | EU Space Act + national third-party liability |
| 7   | **NIS2**              | Directive (EU) 2022/2555                      |
| 8   | **Supervision**       | NCA notifications + annual reports            |
| 9   | **COPUOS**            | International coordination + LTS guidelines   |
| 10  | **Export Control**    | ITAR / EAR / EU Dual-Use                      |
| 11  | **Spectrum**          | ITU frequency coordination                    |
| 12  | **UK Space**          | UK Space Industry Act 2018                    |
| 13  | **US Regulatory**     | FCC / FAA / ITAR filings                      |
| 14  | **CRA (EU AI Act)**   | Cyber Resilience Act + AI Act                 |

Each module is a dedicated page under `/dashboard/modules/<id>` with evidence
uploader, requirement tracker, timeline view, and AI-assisted obligation
interpretation.

---

## Security & anti-gaming

- **Server-only engines:** Regulatory decision logic never leaves the server.
- **Rate limiting:** 10 assessments per hour per IP.
- **Anti-bot timing:** Assessments completed in under 3 seconds are rejected.
- **User-Agent blocking:** Known bot UAs excluded.
- **Input validation:** Centralized Zod schemas on every calculate endpoint.
- **Article-level redaction:** Server-only fields (internal notes, scoring hints)
  stripped from client responses.

---

## Numbers (at a glance)

| Metric                        | Value                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Assessment modules            | **4** (EU Space Act / NIS2 / Space Law / Unified)                              |
| Unique wizard questions       | **9 + 7 + ~10 + 59** (per module)                                              |
| EU Space Act articles covered | **119**                                                                        |
| NIS2 requirements tracked     | **51** across 14 categories                                                    |
| National jurisdictions        | **31** (EU-27 + UK, NO, CH, TR, IS, LI, US)                                    |
| Dashboard modules             | **14**                                                                         |
| Regulatory data volume        | ~**6,000 LOC** of structured requirements + **73 KB** EU Space Act engine JSON |
| Engine codebase               | ~**3,000 LOC** server-only TypeScript across 5 engines                         |
| Average completion time       | **10 minutes**                                                                 |
| PDF report length             | **~20 pages**                                                                  |
| Rate limit                    | 10 assessments / hour / IP                                                     |

---

## Competitive positioning

|                               | Traditional legal counsel   | Big-4 compliance consultancy | Generic GRC platform  | **Caelex Assessment**                                                    |
| ----------------------------- | --------------------------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------ |
| **Cost**                      | €500/hr, 20–40 hrs          | €100k+ engagement            | €5k–20k/year, generic | **Free tier + SaaS**                                                     |
| **Turnaround**                | 2–4 weeks                   | 3 months                     | Days (setup)          | **10 minutes**                                                           |
| **Space-specific**            | If you find the right firm  | Rarely                       | Almost never          | **100% native**                                                          |
| **Regulation coverage**       | One at a time               | Depends on scope             | Generic frameworks    | **EU Space Act + NIS2 + 31 jurisdictions + US + UK + export + spectrum** |
| **Updated when rules change** | Manual + paid re-engagement | Paid re-engagement           | Generic patch         | **Continuous**                                                           |
| **Machine-readable output**   | No                          | No                           | Sometimes             | **Yes (JSON + Astra AI)**                                                |
| **Dashboard follow-through**  | No                          | Excel tracker                | Yes, generic          | **14 space-native modules**                                              |

---

## Tagline options

- _"From 'am I compliant?' to 'here's the exact list' in 10 minutes."_
- _"Every article. Every jurisdiction. One scorecard."_
- _"The regulatory triage every space company needs before series A."_
- _"119 articles. 51 requirements. 31 jurisdictions. One wizard."_
- _"Your compliance roadmap, pre-written by the regulation itself."_

---

## Suggested pitch-graphic structures

### Option A — The funnel (vertical)

Top: the chaos — 119 articles, 51 requirements, 31 jurisdictions, NIS2, UK SIA,
FCC, FAA, ITAR, ITU, COPUOS, Export Control, CRA, AI Act. Shown as a messy cloud.
Middle: the 4 wizards as funnels condensing chaos into structure.
Bottom: a clean 14-module dashboard showing per-module % compliance.
**Pitch message:** "Chaos in → Clarity out."

### Option B — The journey (horizontal)

Operator icon on the left. Five stages across: **Assess → Scorecard → PDF →
Dashboard → Continuous**. Under each stage, the specific Caelex feature
(module wizard, results dashboard, PDF report, 14-module dashboard, Astra AI

- NCA pre-fill + Verity Passport).
  **Pitch message:** "Compliance is a lifecycle, not a moment."

### Option C — The regulation-coverage map

World map highlighting the 31 covered jurisdictions, overlaid with badges for
each supra-national framework (EU Space Act, NIS2, COPUOS, ITU, ITAR). Adjacent
heatmap: module coverage per jurisdiction.
**Pitch message:** "The only platform that speaks every space regulation."

### Option D — The competitive square (2×2)

Y-axis: **Space-specific ↑** / Generic ↓. X-axis: **Automated ↔ Manual**.
Place: traditional law firms (top-left), Big-4 consultancies (bottom-right),
generic GRC platforms (bottom-left), **Caelex Assessment (top-right)** with a
star.
**Pitch message:** "The only space-native, automated compliance platform."

### Option E — Before / After side-by-side

Left panel ("Before"): Cluttered desk with printed PDFs of 6 different
regulations, an Excel tracker, a $100k invoice, and a 3-month calendar.
Right panel ("With Caelex"): A laptop showing the unified scorecard, a phone
showing the Astra AI copilot, a green-all-across 14-module dashboard.
**Pitch message:** "Stop managing compliance. Start proving it."

---

## References

- **EU Space Act** — COM(2025) 335 (proposed), expected application Jan 2030
- **NIS2 Directive** — Directive (EU) 2022/2555
- **UK Space Industry Act** — UK SIA 2018
- **Outer Space Treaty** — United Nations, 1967
- **COPUOS LTS Guidelines** — Long-term Sustainability of Outer Space Activities
- **ENISA** — European Union Agency for Cybersecurity
- **National space laws** — Caelex covers 31 jurisdictions (EU-27 + UK, NO, CH, TR, IS, LI, US)
- **Caelex platform** — https://caelex.eu
- **Assessment entry point** — https://caelex.eu/assessment
