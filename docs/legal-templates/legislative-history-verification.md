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

## 5 · State of the corpus (snapshot 2026-04-28)

After the audit-honesty cleanup that produced this protocol, **NO
`LegislativeMilestone` entry in the corpus is currently marked
`verified: true`.** The 6 showcase sources retain a small number of
high-confidence placeholder entries (Royal Assent dates, OJ
publication dates, UNGA resolution numbers) but each entry awaits
formal stamping.

The user-visible UI surfaces this state with a red "Verification
pending — preview" banner and per-entry amber badges (see
`src/components/atlas/LegislativeTimeline.tsx`).

The verification backlog (showcase sources):

| Source             | Entries        | Status                   |
| ------------------ | -------------- | ------------------------ |
| EU-SPACE-ACT       | 2 placeholders | All pending verification |
| EU-NIS2-2022       | 4 placeholders | All pending verification |
| DE-BSIG-NIS2       | 1 placeholder  | Pending verification     |
| INT-OST-1967       | 3 placeholders | All pending verification |
| INT-LIABILITY-1972 | 3 placeholders | All pending verification |
| UK-SIA-2018        | 2 placeholders | All pending verification |

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
