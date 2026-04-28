# Legislative-History Verification Protocol

> **Status.** Internal compliance instruction. Mandatory before any
> `LegislativeMilestone` is marked `verified: true` on a public-facing
> Atlas source-detail page.

> **2026-04-28 catalogue-consistency audit close-out.** A systematic
> 8-pass scan of all 617 LegalSource entries was conducted. All
> 🔴 critical findings (1× duplicate ID, 1× broken cross-reference, 10×
> top-level/lh date mismatches, 1× cross-contamination) and all 🟡
> significant findings (4× duplicate official_reference, 2×
> jurisdiction misclassification, 4× Moon-Agreement status semantics,
> 1× NO-NEW-SPACE-ACT status caveat) were resolved in a single pass.
> Remaining 🟢 cosmetic items: see §6 Open Backlog.
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

## 5 · State of the corpus (last updated 2026-04-28 · Tranche 2)

**Total LegalSource entries in the corpus:** 619
**With `legislative_history` populated:** 6
**Coverage:** 0.97%

### 5.0 · Tooling unlocked between Tranche 1 and Tranche 2

The Chrome MCP (`mcp__Claude_in_Chrome__*`) became available with a
connected browser, which **renders JS-driven sites** that WebFetch
cannot reach. Verified during Tranche 2:

- ✅ EUR-Lex (Document Information tab) — yields verified date_of_document,
  date_of_effect, date_of_transposition, procedure_number, author,
  legal_basis, repeal-relations, review-deadlines.
- ✅ Procedure files via OEIL by their CELEX or 2YYY/NNNN(COD) form.

This **expands the verifiable subset substantially**: the ~50 EU
instruments that were previously blocked by EUR-Lex's JS render are
now accessible. Combined with WebFetch coverage (UK + UN-where-objid-
known + US-HTML), the verifiable subset now sits at roughly 200-250
of 619 corpus entries (~30-40 %).

Tooling matrix update:

| Primary register                           | Tool                       | Status                         |
| ------------------------------------------ | -------------------------- | ------------------------------ |
| `legislation.gov.uk`                       | WebFetch                   | ✅ working                     |
| `treaties.un.org` (objid known)            | WebFetch                   | ✅ working                     |
| `eur-lex.europa.eu` (Document Information) | Chrome MCP (browser-batch) | ✅ **unlocked Tranche 2**      |
| `oeil.secure.europarl.europa.eu`           | Chrome MCP                 | ✅ likely working (next test)  |
| `unoosa.org`                               | both                       | ❌ archive currently 404       |
| `bgbl.de` (German Bundesgesetzblatt)       | both                       | ❌ Xaver-PDF only              |
| `legifrance.gouv.fr`                       | Chrome MCP                 | ⚠️ likely working — needs test |
| `boe.es`                                   | Chrome MCP                 | ⚠️ likely working — needs test |
| `bundestag.de` DIP / dipbt                 | Chrome MCP                 | ⚠️ likely working — needs test |

### 5.1 · Per-source verification status (Tranche 5 final)

| Source                                            | Entries | Verified | Status                                                                    |
| ------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------- |
| **UK statutes (legislation.gov.uk via WebFetch)** |         |          |                                                                           |
| UK-SIA-2018                                       | 4       | 4        | T1 ✓                                                                      |
| UK-OSA-1986                                       | 4       | 4        | T4 ✓                                                                      |
| UK-SIA-INDEMNITIES-2025                           | 2       | 2        | T4 ✓                                                                      |
| UK-SI-2021-792                                    | 2       | 2        | T4 ✓                                                                      |
| UK-SI-2021-793                                    | 2       | 2        | T4 ✓                                                                      |
| UK-SI-2021-816                                    | 2       | 2        | T4 ✓                                                                      |
| UK-NIS-REGS-2018                                  | 5       | 5        | T4 ✓                                                                      |
| **EU instruments (EUR-Lex via Chrome MCP)**       |         |          |                                                                           |
| EU-SPACE-ACT                                      | 1       | 1        | T2 ✓                                                                      |
| EU-NIS2-2022                                      | 6       | 6        | T2 ✓                                                                      |
| EU-CRA-2024                                       | 7       | 7        | T3 ✓                                                                      |
| EU-DORA-2022                                      | 4       | 4        | T3 ✓                                                                      |
| EU-CER-2022                                       | 4       | 4        | T3 ✓                                                                      |
| EU-EASA-2018                                      | 3       | 3        | T3 ✓                                                                      |
| EU-GDPR-2016                                      | 4       | 4        | T3 ✓                                                                      |
| EU-SPACE-PROG-2021                                | 4       | 4        | T3 ✓                                                                      |
| **National (Chrome MCP via national registers)**  |         |          |                                                                           |
| FR-LOS-2008                                       | 3       | 3        | T5 ✓ Légifrance JORFTEXT000018931380 — caught off-by-one in JORF n°       |
| ES-LEY-17-2022                                    | 2       | 2        | T5 ✓ BOE-A-2022-14581                                                     |
| IT-LEGGE-89-2025                                  | 3       | 3        | T5 ✓ Gazzetta Ufficiale 25G00095 — caught off-by-two in GU n° + wrong EIF |
| **UN treaties (UN Treaty Collection)**            |         |          |                                                                           |
| INT-OST-1967                                      | 3       | 2        | T1 ✓ partial (UNGA-adoption pending UNOOSA archive availability)          |
| INT-LIABILITY-1972                                | 3       | 0        | Pending — UNTC objid not yet located within session                       |
| **Pending registers**                             |         |          |                                                                           |
| DE-BSIG-NIS2                                      | 1       | 0        | BGBl. + DIP-Bundestag — Xaver-PDF, no Chrome-MCP attempt yet              |
| **Totals**                                        | **65**  | **58**   | **89 % of populated entries verified across 18 sources**                  |

### 5.1.1 · Corrections caught by primary-source verification

The verification process surfaced **EIGHT** factual errors and one
data-corruption bug in the existing catalogue / earlier fabrications
that have now been corrected against the primary record:

1. **EU-SPACE-ACT procedure number** was 2025/0185(COD) in the
   earlier draft; primary source confirms **2025/0335/COD**.
2. **UK-SIA-2018 principal commencement SI** was 2021/874 in the
   earlier draft; legislation.gov.uk confirms **S.I. 2021/817**
   (2021/874 is in fact an amending order to 817).
3. **FR-LOS-2008 JORF reference** was "JORF n° 0128 du 4 juin 2008"
   in `official_reference`; Légifrance confirms **JORF n° 0129**.
4. **IT-LEGGE-89-2025 GU reference + EIF** was "GU n. 146" with
   `date_in_force: 2025-07-09` in the catalogue; Gazzetta Ufficiale
   confirms **GU Serie Generale n. 144** with **EIF 25/06/2025**.
5. **IT-LEGGE-7-2018 EIF** was "2018-02-15" in the catalogue;
   Normattiva confirms **EIF 25/02/2018** (off by 10 days).
6. **IT-LEGGE-185-1990 EIF** was the GU publication date "1990-07-14"
   in the catalogue; Normattiva confirms **EIF 29/07/1990** (vacatio
   legis 15 days).
7. **IT-DLGS-128-2003 GU + EIF** was triple-wrong in the catalogue:
   "GU n. 156 del 8 luglio 2003" with `date_in_force: 2003-07-18`;
   Normattiva confirms **GU n. 129 del 6 giugno 2003** with **EIF
   7/6/2003** (off by 41 days — the largest single-source delta).
8. **UK-CA-2003 legislative_history cross-contamination**: the
   `legislative_history` array on the Communications Act 2003 was
   describing the Wireless Telegraphy Act 2006 (Royal Assent 8 Nov 2006) — wrong instrument entirely. T20 replaced the corrupted
   block with the actual CA-2003 history (Royal Assent 17 July 2003,
   long title verified verbatim) and added a separate WTA-2006 block.

These are exactly the kind of plausible-but-wrong details that
made the unverified backfill dangerous. Each correction is
documented in the `verification_note` field of the affected
milestone.

### 5.1.2 · Cumulative state after Tranche 9 (last updated 2026-04-28)

| Jurisdiction | Sources verified | Verified milestones |
| ------------ | ---------------- | ------------------- |
| EU           | 14               | 55                  |
| UK           | 16               | 42                  |
| ES           | 2                | 5                   |
| IT           | 1                | 3                   |
| FR           | 1                | 3                   |
| INT          | 1                | 2                   |
| **Totals**   | **35 sources**   | **110 milestones**  |

**Absolute corpus coverage:** 35 / 619 = **5.7 %** of all corpus sources
now carry at least one verified `legislative_history` milestone.

**Of populated entries:** 110 of ~115 populated milestones are
verified ≈ **96 %** verification rate within the curated subset.

### 5.1.2bis · Cumulative state after Tranche 20 (last updated 2026-04-28)

| Jurisdiction | Sources verified | Verified milestones        |
| ------------ | ---------------- | -------------------------- |
| EU           | 14               | 55                         |
| UK           | 18               | 47                         |
| IT           | 11               | 37                         |
| ES           | 6                | 22                         |
| AT           | 2                | 11                         |
| NO           | 2                | 13                         |
| BE           | 2                | 8                          |
| SE           | 1                | 4                          |
| FR           | 1                | 3                          |
| INT          | 1                | 2                          |
| DE           | 0                | 0 (BGBl Xaver-PDF blocked) |
| FI           | 0                | 0 (Finlex non-text)        |
| DK           | 0                | 0 (retsinformation 403)    |
| NL           | 0                | 0 (wetten.overheid SPA)    |
| CZ           | 0                | 0 (zakonyprolidi 403)      |
| **Totals**   | **60 sources**   | **210 milestones**         |

**Absolute corpus coverage:** 60 / 619 = **9.7 %** of all corpus sources
now carry at least one verified `legislative_history` milestone.

**Of populated entries:** ~200 of ~210 populated milestones are
verified ≈ **95 %** verification rate within the curated subset
(remaining ~10 are stamped `verified: false` with explanatory
verification_notes — e.g. AT § 15 Inkrafttretens-Klausel, NO 1969 CAA
delegation, ES AEE Consejo Rector first-meeting date).

### 5.1.3 · Tranche-by-tranche commit log

| Tranche | Commit     | Highlights                                                      |
| ------- | ---------- | --------------------------------------------------------------- |
| T1      | `abdc9b58` | UK-SIA-2018 + INT-OST-1967 (partial)                            |
| T2      | `3c5242de` | EU-NIS2-2022 + EU-SPACE-ACT + Browser-MCP unlock                |
| T3+T4   | `32fbd111` | 8 EU + 6 UK sources                                             |
| T5      | `45a4f159` | FR-LOS-2008 + ES-LEY-17-2022 + IT-LEGGE-89-2025                 |
| T6      | `515f3258` | 6 more EU instruments                                           |
| T7      | `bb04fecb` | ES-RD-158-2023 + 4 UK acts                                      |
| T8      | `4284f814` | 5 UK SIs                                                        |
| T9      | `04b79193` | UK-SI-2021-815, UK-SI-2021-879                                  |
| T10     | `8925dabf` | 2 UK export-control sources                                     |
| T11     | `ee9c23bc` | 3 IT sources via Normattiva                                     |
| T12     | `a7705977` | 2 IT (DLgs 128/2003 + DLgs 66/2010-SPACE)                       |
| T13     | `f51b59b3` | 5 IT (CCE + CCE-Reform + NIS2 + Privacy + Ambiente)             |
| T14     | `991f4d08` | 2 AT (Weltraumgesetz + Verordnung) via RIS+parlament            |
| T15     | `90494f2e` | 2 NO (1969 + 2025 LOV-128) via Lovdata                          |
| T16     | `e4684aa5` | 1 SE (Lag 1982:963) via Riksdagen + lagen.nu                    |
| T17     | `f137df7c` | 2 BE (Loi 2005-09-17 + amendement 2013) via ejustice            |
| T18     | `379baaf4` | 3 ES (Ley 11/2022 + Ley 53/2007 + RDL 12/2018) via BOE          |
| T19     | `808021d1` | 2 ES defence (RD 524/2022 + Orden DEF/264/2023) + RD 158 refine |
| T20     | `def510c7` | UK lh fix (CA-2003 cross-contamination) + WTA-2006 add          |

### 5.1.4 · Tooling-gap diary (additional registers tested)

In Tranche-9 follow-up, additional national registers were tested
and their reachability assessed:

| Register                      | Tool                  | Status                                                      |
| ----------------------------- | --------------------- | ----------------------------------------------------------- |
| `wetten.overheid.nl` (NL)     | Chrome MCP            | ❌ Title loads but `document.body` is null — JS-driven SPA  |
| `fedlex.admin.ch` (CH)        | Chrome MCP            | ❌ Catalogue URL returns 404; needs URL discovery           |
| `ecfr.gov` (US Federal Reg)   | Chrome MCP / WebFetch | ❌ CAPTCHA / programmatic-access protections                |
| `law.cornell.edu` (US LII)    | WebFetch              | ⚠️ Partial — chapter-level metadata yes, original PL no     |
| `gazzettaufficiale.it` eli/id | Chrome MCP            | ⚠️ Works only with known eli code; no algorithmic discovery |
| `legifrance.gouv.fr` LODA     | Chrome MCP            | ⚠️ Works for primary statute; some catalogue URLs broken    |

Practical implication: WebFetch + Chrome MCP can reliably reach
~5-7 jurisdictions' primary registers (UK, EU, FR statutes,
ES national, IT national, partial UN treaties). Other registers
need additional tooling or human-curated URL discovery.

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

---

## 8 · Open backlog (post-2026-04-28 audit)

The 2026-04-28 catalogue-consistency audit closed all 🔴 critical and
🟡 significant findings. The remaining 🟢 cosmetic backlog is tracked
here for follow-up:

### 8.1 · Missing `date_in_force` on 334 sources marked `status: "in_force"`

A scan of the 617-entry corpus identified **334 sources** that have
`status: "in_force"` but no `date_in_force` value. This is permitted
by the schema and reflects the heterogeneity of the catalogue:

- **Standards & soft-law (large share)**: ISO/CCSDS/ECSS standards,
  IADC guidelines, ITU recommendations, NATO policies. These have
  publication years but rarely a binding "in-force" date in the
  legal sense.
- **Policy documents**: National space strategies, white papers,
  ministerial communications. Their "in-force" semantics are
  programmatic, not statutory.
- **Codices & consolidated framework laws**: Where the original
  Act's date_enacted is in the catalogue but the consolidated text
  has accreted dozens of amendments — the canonical "in-force" date
  becomes ambiguous.

**Recommendation.** This is a verification expansion task, not a
correction task. Fix forward via the legislative-history protocol
in §3 above: each `legislative_history` block that gets a verified
`in_force` milestone naturally produces a primary-source-confirmed
EIF that can be promoted to `date_in_force`. As of 2026-04-28, 73
sources have `legislative_history` blocks — meaning ~261 of the
334 still need primary-source verification before their EIF can be
asserted with confidence.

### 8.2 · 18 sources fixed: `title_local` added in audit close-out

All 18 sources flagged in the audit pass now carry `title_local`
values. Note that the IL entries (3 Hebrew laws) re-used existing
single-quoted Hebrew titles; the audit had falsely reported them as
missing because the regex pattern matched only double-quoted
strings.

### 8.3 · Schema extensions deferred (to a separate design)

Two semantic gaps surfaced during the audit but were not resolved
schema-side because they require deliberate design:

1. **Treaty ratification status.** The `LegalSourceStatus` enum
   conflates state-specific ratification with treaty-general EIF.
   Moon-Agreement entries (4×) carry inline comments documenting
   the disambiguation; a future schema revision should split into
   `treaty_status` (signed/ratified/not_ratified per state) and
   `treaty_eif` (general in-force date).

2. **"Adopted but not yet in force" enum value.** NO-NEW-SPACE-ACT-
   DRAFT was adopted as LOV-2025-12-22-128 on 22.12.2025 but does
   not enter into force until 1.7.2026. Currently retained under
   `status: "draft"` with an inline caveat; a future schema
   revision should add `enacted_pending_eif` (or similar) to this
   enum.
