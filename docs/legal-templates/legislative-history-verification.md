# Legislative-History Verification Protocol

> **Status.** Internal compliance instruction. Mandatory before any
> `LegislativeMilestone` is marked `verified: true` on a public-facing
> Atlas source-detail page.
>
> **Why this exists.** A legislative-history timeline is only useful
> to a lawyer if every entry can be relied on. Any single fabricated
> reference (a wrong BT-Drs. number, a misattributed rapporteur name,
> a vote count drawn from memory) destroys the credibility of the
> whole surface. This document is the gate that prevents that.
>
> **Applies to.** Every entry in `LegalSource.legislative_history`.
> Untouched data fields (date, body, reference, description,
> source_url, affected_sections) MUST each be confirmed against the
> primary source before the milestone is stamped verified.

---

## 1 · Hard rule

A `LegislativeMilestone` may carry `verified: true` only when **all**
of the following hold:

1. **`source_url` resolves to the primary source.** Not a Wikipedia
   article, not a press release, not a Caelex secondary write-up —
   the official record (BGBl., EUR-Lex, UN Treaty Series, gov.uk
   legislation register, FCC eLibrary, etc.).
2. **`date` is taken from the primary source**, not inferred.
3. **`body` is named exactly as the primary source names it** (e.g.
   "European Parliament · ITRE Committee", not "EP committee").
4. **`reference`** (if present) **matches the canonical citation
   format** of the issuing body (BGBl. citation rules, EUR-Lex
   document-naming conventions, UN doc-symbol rules, etc.).
5. **`description`** (if present) **says only what the primary source
   says.** No vote counts, no rapporteur attributions, no
   compromise-text content unless the linked URL contains that
   information.
6. **`affected_sections`** (if present) **matches the section list
   in the amending instrument's preamble or schedule.**
7. A named human reviewer has stamped the entry with
   `verified_by` (email or initials), `verified_at` (ISO date),
   and optionally `verification_note` documenting any caveats.

When any of (1)-(6) is uncertain, do NOT set `verified: true`. Either
leave the entry as a structural placeholder with conservative
phrasing, or remove it entirely. Showing a partial timeline is
**always** better than showing a fabricated one.

---

## 2 · Standard sources by jurisdiction

| Jurisdiction | Primary register                                                           | Procedure tracker                                                                               | Notes                                  |
| ------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| **EU**       | [EUR-Lex](https://eur-lex.europa.eu/) (OJ + procedure files)               | [Legislative Observatory](https://oeil.secure.europarl.europa.eu/) (OEIL)                       | Match `2YYY/NNNN(COD)` procedure files |
| **DE**       | [Bundesgesetzblatt](https://www.bgbl.de/)                                  | [DIP Bundestag](https://dip.bundestag.de/) (Drucksachen / Plenarprotokolle)                     | Cite as `BGBl. I YYYY S. NNN`          |
| **UK**       | [legislation.gov.uk](https://www.legislation.gov.uk/)                      | [bills.parliament.uk](https://bills.parliament.uk/) + [Hansard](https://hansard.parliament.uk/) | Cite as `c.N` (chapter number)         |
| **FR**       | [Légifrance JORF](https://www.legifrance.gouv.fr/)                         | [Assemblée nationale](https://www.assemblee-nationale.fr/) / [Sénat](https://www.senat.fr/)     | Cite by JORF date + page               |
| **IT**       | [Gazzetta Ufficiale](https://www.gazzettaufficiale.it/)                    | [Camera dei deputati](https://www.camera.it/) / [Senato](https://www.senato.it/)                |                                        |
| **ES**       | [BOE](https://www.boe.es/)                                                 | [Congreso de los Diputados](https://www.congreso.es/)                                           |                                        |
| **NL**       | [wetten.overheid.nl](https://wetten.overheid.nl/)                          | [Tweede Kamer](https://www.tweedekamer.nl/)                                                     |                                        |
| **US**       | [GovInfo](https://www.govinfo.gov/) (Statutes at Large + Federal Register) | [Congress.gov](https://www.congress.gov/)                                                       | Cite as `P.L. NNN-NN` + `Stat.`        |
| **UN**       | [UN Treaty Collection](https://treaties.un.org/)                           | [UNOOSA](https://www.unoosa.org/oosa/en/ourwork/spacelaw/) (space-law specific)                 | UN doc-symbol format `A/RES/NNNN (XX)` |

When a milestone's primary register isn't in this table, add the
register here in the same PR that adds the milestone.

---

## 3 · Per-step verification checklist

For each milestone, the reviewer ticks each of the following before
stamping `verified: true`:

```
[ ] source_url loads and shows the official document (not a
    summary, not a press release)
[ ] date in the milestone matches the date on the official document
[ ] body name matches the official document's masthead / signing
    block
[ ] reference (if any) matches the official citation format and
    actually points at this document
[ ] description (if any) says only what the official document says,
    no extrapolation
[ ] affected_sections (if any) matches the schedule / preamble of
    the amending instrument
[ ] cross-checked against at least one of: an authoritative
    secondary source (legal commentary, EUR-Lex procedure file,
    UNOOSA register), OR a sister Caelex source (e.g. an EU
    directive's transposition act in DE/FR)
[ ] verified_by + verified_at stamped on the entry
```

If any box is unticked, the reviewer either fills the gap or leaves
the milestone as `verified: false` (the safe default).

---

## 4 · Escalation: when the primary source is ambiguous

Some primary sources don't map cleanly to a single milestone — e.g. a
trilogue agreement is announced via press release, not by a doc
number; a "general approach" is referenced in Council documents that
are not always public. In those cases:

1. Use the most authoritative published reference available.
2. Set the `verification_note` field explicitly: e.g.
   _"Trilogue political-agreement date taken from EP press release
   2022-05-13; Council doc number not public at time of verification."_
3. Set `verified: true` only if the date AND body remain
   defensible against the cited press release.
4. When a more authoritative reference becomes available later,
   update the entry and re-stamp `verified_at`.

---

## 5 · State of the corpus (last updated 2026-04-28 · Tranche 1)

**Total LegalSource entries in the corpus:** 619
**With `legislative_history` populated:** 6
**Coverage:** 0.97%

### 5.1 · Per-source verification status

| Source             | Entries | Verified | Status                                                                 |
| ------------------ | ------- | -------- | ---------------------------------------------------------------------- |
| EU-SPACE-ACT       | 2       | 0        | Pending — EUR-Lex JS-driven, blocks WebFetch                           |
| EU-NIS2-2022       | 4       | 0        | Pending — same EUR-Lex block                                           |
| DE-BSIG-NIS2       | 1       | 0        | Pending — BGBl./Bundestag DIP not reachable via WebFetch               |
| INT-OST-1967       | 3       | 2        | Tranche 1 (Apr 2026) — signing + EIF verified via UN Treaty Collection |
| INT-LIABILITY-1972 | 3       | 0        | Pending — depositary URL not located                                   |
| UK-SIA-2018        | 4       | 4        | Tranche 1 (Apr 2026) — fully verified via legislation.gov.uk ✓         |
| **Totals**         | **17**  | **6**    | **35 % of populated entries verified**                                 |

### 5.2 · Realistic per-tranche throughput (WebFetch-only)

The verification mechanism in §3 above is mechanically achievable
via WebFetch only for primary registers that serve **static HTML**.
The April 2026 Tranche-1 verification pass produced this throughput:

| Primary register                         | WebFetch-fetchable?         | Sources verifiable per session |
| ---------------------------------------- | --------------------------- | ------------------------------ |
| `legislation.gov.uk` (UK statutes + SIs) | ✅ excellent                | ~5-10                          |
| `treaties.un.org` (UN Treaty Collection) | ⚠️ only when objid known    | ~1-2                           |
| `eur-lex.europa.eu` (EU OJ)              | ❌ JS-driven, returns empty | 0                              |
| `unoosa.org` (treaty status, COPUOS)     | ❌ currently 404            | 0                              |
| `govinfo.gov` (US Federal Register)      | ⚠️ HTML pages OK, PDFs no   | ~1-3                           |
| `bgbl.de` (German Bundesgesetzblatt)     | ❌ Xaver-PDF only           | 0                              |
| `legifrance.gouv.fr` (FR JORF)           | ❌ JS-driven for historical | 0                              |
| `boe.es` (Spanish BOE)                   | ❌ PDF-heavy archive        | 0                              |
| `bills.parliament.uk` (UK bills tracker) | ⚠️ needs testing            | ?                              |

**Implication.** WebFetch can mechanically verify approximately 70-80
of the 619 corpus entries (UK statutes, the subset of UN treaties
where the objid is known, and a handful of US Federal-Register HTML
pages). The remaining ~540 entries require either (a) a human
researcher with PDF reader and archive-viewer access, or (b) a more
capable rendering tool than WebFetch (e.g. headless-browser
automation that can execute the EUR-Lex / Légifrance JS bundles).

### 5.3 · Tranche schedule

| Tranche          | Primary register                     | Target sources                                                                                                                                  | Capacity                     |
| ---------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **1 — Apr 2026** | legislation.gov.uk + treaties.un.org | UK-SIA-2018 (full), INT-OST-1967 (partial)                                                                                                      | ✅ shipped                   |
| **2**            | legislation.gov.uk                   | UK-OSA-1986, UK-NIS-REGS-2018, UK SIs 2021/792 + 2021/793 + 2021/816, UK-SIA-INDEMNITIES-2025                                                   | ~5-7 sources                 |
| **3**            | govinfo.gov + treaties.un.org        | US-COMMERCIAL-SPACE-LAUNCH-ACT, US-OUTER-SPACE-COMMERCIALIZATION-ACT, INT-RESCUE-1968, INT-LIABILITY-1972, INT-REGISTRATION-1975, INT-MOON-1979 | ~5-7 sources                 |
| **4**            | legislation.gov.uk                   | remaining ~50 UK national-space + telecoms sources                                                                                              | ~10/session × ~5 sessions    |
| **5+**           | mixed                                | All EU instruments (~50), DE/FR/IT/ES/NL/SE/NO/JP/KR/CN national, every other gap                                                               | NEEDS NEW TOOLING — see §5.4 |

### 5.4 · Tooling gap for Tranche 5+

The remaining ~540 corpus entries cannot be verified mechanically
with the current toolset. Three options to unblock:

1. **Headless-browser automation tool** (e.g. Playwright via an MCP)
   that can execute the EUR-Lex / Légifrance / OEIL JS bundles and
   parse the rendered DOM. Would unblock all EU instruments,
   French national, and most national procedure trackers.

2. **PDF-OCR pipeline** for BGBl., JORF and BOE archives — these
   register publications are PDF-only and need text extraction plus
   structured-citation parsing.

3. **External-researcher contract** — a paralegal or law-student
   contractor with archive access; ~12 person-weeks for a thorough
   pass per the earlier estimate.

Until one of (1)-(3) is in place, the verified portion of the
corpus stays bounded at ~70-80 entries (~13 % of total).

---

## 6 · Backfill workflow

1. Pick a target source (start with the showcase six in §5 above).
2. Open the primary register entry-point (§2) for the target
   jurisdiction.
3. For each milestone, work through the checklist in §3.
4. Stamp `verified_by`, `verified_at`, and (where relevant)
   `verification_note`.
5. Open a PR. The PR description must list each milestone stamped
   in the diff and link to each `source_url` so the reviewer can
   spot-check.
6. The PR is merged only after a second pair of eyes has confirmed
   at least 30% of the stamped milestones (random sampling).
7. After merge, the showcase source's UI banner flips from "Pending"
   (red) → "Partially verified" (amber, count) → "Fully verified"
   (green) automatically based on the per-entry flags.

---

## 7 · When external counsel is required

For verification of milestones in the following cases, engage
external counsel (see `ai-act-external-counsel-review.md` for the
analogous protocol):

- **High-stakes regulatory citations** that may be relied on by a
  customer in pleadings (e.g. an in-force date that controls a
  transition window for the customer's compliance obligations).
- **Treaty ratifications** by states whose primary register is
  not in §2 above and where a translation may be required.
- **Pre-adoption EU steps** (committee report numbers, council
  general approach documents, trilogue political agreements) where
  the Council document register is not fully public — these often
  require the reviewer to triangulate between EP, Council and
  Commission press materials.

External-counsel sign-off is itself recorded in
`verification_note` (e.g. _"Verified against EUR-Lex procedure
file; external review by [Firm Name] on [Date]"_).
