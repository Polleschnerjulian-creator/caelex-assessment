# Germany Space Law — Verified Research & Database Corrections (2026-06)

> **Status:** Research complete + DB corrections applied. Method: deep-research
> harness (fan-out web search → primary-source fetch → 3-vote adversarial
> verification), run in **two passes**. Pass 1 (core framework) + Pass 2
> (gap-closing): **25/25 claims confirmed 3-0, 0 killed** — every finding rests
> on a primary/official source.
> **Primary sources:** gesetze-im-internet.de, recht.bund.de (Bundesgesetzblatt),
> BSI, BMI, BNetzA, BAFA, EUR-Lex, UNOOSA, Auswärtiges Amt, bmftr.bund.de,
> bundeswirtschaftsministerium.de.
>
> Audit trail for the German space-law data in
> `src/data/national-space-laws.ts` (DE entry),
> `src/data/regulatory/jurisdictions/germany.ts` and
> `src/data/legal-sources/sources/de.ts`.

## TL;DR — what was wrong and is now fixed

| #   | Was (in our data)                                             | Now (verified)                                                                                                                                                                                         | Severity                      |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 1   | NIS2UmsuCG = **draft / not yet verkündet** (as of 2026-04)    | **IN FORCE since 6 Dec 2025** (BGBl. 2025 I Nr. 301), recast the BSI Act (**BSIG 2025**), BSI competent, **"Weltraum" = Sector 7 of Anlage 1**                                                         | **High (stale, now binding)** |
| 2   | SatDSiG competent authority = **BMWK**                        | **BAFA** (§ 24 SatDSiG); **BSI** does the security/sensitivity assessment                                                                                                                              | **High (wrong authority)**    |
| 3   | Sensitivity threshold = **0.4m** ground resolution            | **SatDSiV § 1: optical ≤ 2.5m** (general "hochwertiges Erdfernerkundungssystem"); SAR ≤ 3m, thermal IR ≤ 5m                                                                                            | **High (wrong figure)**       |
| 4   | SatDSiG URL `…/satdsig/BJNR276810007.html`                    | `…/satdsig/**BJNR259000007**.html`                                                                                                                                                                     | Medium (broken citation)      |
| 5   | Space ministry = **BMWK** (Wirtschaft und Klimaschutz)        | **BMFTR** (Bundesministerium für Forschung, Technologie und Raumfahrt), since **6 May 2025**; economy ministry renamed **BMWE**                                                                        | **High (defunct ministry)**   |
| 6   | Spectrum basis = **§ 55 TKG**                                 | **§ 91 Abs. 5 TKG 2021** (Frequenzzuteilung) + **§ 95 TKG 2021** (satellite orbital/frequency rights); BNetzA                                                                                          | High (stale TKG-2004 number)  |
| 7   | "Weltraumgesetz discussed since 2019 but not enacted" (vague) | Still not in force, **but** Eckpunkte **4 Sept 2024**; planned **WRG** = Genehmigungsvorbehalt + national register + State recourse capped at **10% avg. annual turnover / max €50M** per damage event | Medium (under-specified)      |
| 8   | UN treaties: not represented (`TREATIES_DE` was **empty**)    | Party to **OST, Rescue, Liability, Registration**; **NOT a party to the 1979 Moon Agreement** — now 5 cited entries                                                                                    | Medium (gap)                  |
| 9   | §41 critical-component veto = **BMWK**                        | **BMI** (Federal Ministry of the Interior) under the BSIG                                                                                                                                              | Low (wrong ministry)          |

## Verified findings (by point)

**1. NIS2 transposition — NOW IN FORCE.** The NIS-2-Umsetzungs- und
Cybersicherheitsstärkungsgesetz (NIS2UmsuCG), official long title "Gesetz zur
Umsetzung der NIS-2-Richtlinie und zur Regelung wesentlicher Grundzüge des
Informationssicherheitsmanagements in der Bundesverwaltung", was ausgefertigt 2
Dec 2025, **verkündet 5 Dec 2025 (BGBl. 2025 I Nr. 301)** and **entered into
force 6 Dec 2025** (~14 months after the missed 17 Oct 2024 deadline). It recast
the BSI Act as **BSIG 2025** (identifier `bsig_2025` on gesetze-im-internet.de);
**BSI** is the competent authority; **"Weltraum" (Space) is Sector 7 of Anlage 1**
(Sektoren hoher Kritikalität) — covering "Betreiber von Bodeninfrastrukturen …
die … weltraumgestützte Dienste unterstützen". Risk-management measures sit in
**§ 30 BSIG**; supervised entities rose from ~4,500 to ~29,500. Path:
Regierungsentwurf 30 Jul 2025 → Bundestag 13 Nov 2025 → Bundesrat 20 Nov 2025.
_(3-0; recht.bund.de, BSI press release 5 Dec 2025, BMI tracker,
gesetze-im-internet.de/bsig_2025/anlage_1.html.)_

**2. SatDSiG authority + threshold.** The Satellitendatensicherheitsgesetz
(SatDSiG, BGBl. I 2007 S. 2590, last amended 19 Apr 2021) is administered by
**BAFA** (§ 24), with the **BSI** performing the security/sensitivity assessment
— **not** BMWK and **not** BND. The SatDSiV § 1 threshold for a "hochwertiges
Erdfernerkundungssystem" is a ground sampling distance of **2.5m or better**
(general optical case; SAR ≤ 3m, thermal IR ≤ 5m, hyperspectral > 49 channels at
≤ 10m). The "0.4m" figure previously in our data was wrong. Correct statute URL:
`gesetze-im-internet.de/satdsig/BJNR259000007.html`. _(Pass 1 + pass-2 source
list.)_

**3. Ministry split (6 May 2025, Merz cabinet).** Space policy and the future
national space law now sit with the **new BMFTR** (Bundesministerium für
Forschung, Technologie und Raumfahrt, Min. Dorothee Bär) — created by adding
"Raumfahrt" to the former BMBF and moving space competence out of the former
BMWK. The economy ministry was renamed **BMWE** (Bundesministerium für Wirtschaft
und Energie, Min. Katherina Reiche). The **Auswärtiges Amt** leads on
international space law (Völkerrecht). **DLR** (Deutsche Raumfahrtagentur) runs
programmes/ESA/funding on behalf of the BMFTR — it is **not** a regulator.
_(3-0; auswaertiges-amt.de Weltraumrecht page, bmftr.bund.de,
bundeswirtschaftsministerium.de/BMWE press releases.)_

**4. Frequency / ITU.** Satellite frequency assignment runs under **§ 91 Abs. 5
TKG 2021** (Frequenzzuteilung), conditioned on completed national + ITU
coordination, administered by **BNetzA**; **§ 95 TKG 2021** carries the
satellite orbital/frequency-rights layer. The old TKG-2004 § 55 was renumbered.
_(3-0; BNetzA Erdfunkstellen page, gesetze-im-internet.de/tkg_2021.)_

**5. Dual-use export control.** Administered by **BAFA** under the AWG/AWV,
implementing directly-applicable **EU Reg. (EU) 2021/821** (in force 9 Sept 2021;
Annex I most recently recast by Delegated Reg. (EU) 2025/2003, in force 15 Nov
2025). Annex I Category **9** = Luftfahrt, Raumfahrt und Antriebe (satellites,
launch tech); Category **7** = avionics/navigation; encryption = Category 5
Part 2. _(3-0; EUR-Lex, BAFA Merkblatt + Güterlisten.)_

**6. UN treaties.** Germany is a full party (UNOOSA status "R") to the **Outer
Space Treaty, Rescue Agreement, Liability Convention and Registration
Convention**, and is **NOT a party (nor signatory) to the 1979 Moon Agreement**
(UNOOSA grid blank for Germany; only 17 States are parties). _(3-0; UNOOSA
status grid A/AC.105/C.2/2024/CRP.3, Wikipedia "Moon Treaty".)_

**7. Planned Weltraumgesetz (WRG).** Not in force. Eckpunkte published **4 Sept
2024**; a BMFTR Referentenentwurf was in progress as of early 2026 (paced partly
by the pending EU Space Act). Planned regime: authorisation requirement
(Genehmigungsvorbehalt), national space-object register, and a fault-independent
State right of recourse **capped at 10% of average annual turnover (max €50M per
damage event)**, with research-institution exemptions absent gross negligence.
_(Pass 1; carried in our data clearly marked NOT-yet-law.)_

## Refuted / NOT asserted (deliberately)

- "WRG uses DLR as Verwaltungshelfer with BMWK implementing ordinances" — **not
  confirmed**; not asserted.
- "BND + BMWK jointly review SatDSiG sensitivity" — replaced with the verified
  **BAFA (§ 24) + BSI** position.
- "SatDSiG sensitivity threshold 0.4m" — **wrong**; corrected to SatDSiV 2.5m.

## Open / UNVERIFIED (left as-is / flagged — no fabrication)

These were scope gaps in the verified set; not invented:

- **Exact UN-treaty ratification/accession dates** for Germany (OST/ARRA/LIAB/
  REG) — party-status verified via the UNOOSA "R" codes, but the grid gives codes
  not dates. Treaty entries therefore state party-status without specific dates.
- **Operational national-registry maintainer** (Auswärtiges Amt vs DLR /
  Deutsche Raumfahrtagentur compiling UNOOSA submissions) — not pinned.
- **EU Space Act COM(2025) 335** (25 June 2025) — exact Council/Parliament stage
  and the concrete obligations on German operators were not confirmed in the
  verified set; referenced as a proposal only.
- **German case law** on space activities — research surfaced essentially none;
  the gap stands.
- **Exact BSIG 2025 recast section numbers beyond § 30** (reporting/registration)
  — § 30 (risk management) is verified; other §-numbers from the earlier draft
  analysis should be re-confirmed against the consolidated BSIG 2025 text.
- A few non-space `competent_authorities: ["DE-BMWK"]` (DE-KWKG war-weapons,
  DE-UVPG environmental, DE-GG-SPACE constitutional, DE-BMVG defence) still
  resolve to the `DE-BMWK` entry, which is **now the economy ministry (BMWE)** and
  explicitly notes that space policy sits with BMFTR. Acceptable; flagged.

## Corrections applied (files)

- **`src/data/national-space-laws.ts`** (DE entry): SatDSiG URL → BJNR259000007;
  licensingAuthority BMWK → **BMFTR** (+ BAFA for SatDSiG, dropped defunct
  bmwk email); de-data-handling / de-security-clearance BMWK/BND → **BAFA + BSI**,
  0.4m → **2.5m**; de-spectrum § 55 → **§ 91 Abs. 5 / § 95 TKG 2021**; dataSensing
  0.4m → SatDSiV 2.5m; euSpaceActCrossRef transitionNotes (DLR → BMFTR, WRG
  drafting); `notes` rewritten (Eckpunkte/WRG cap, BMFTR/BMWE/BAFA/AA split,
  **NIS2 in-force**, treaties + Moon non-party); `lastUpdated: 2026-06`.
- **`src/data/legal-sources/sources/de.ts`**: header sources/date; `DE-BMWK` →
  **BMWE** (economy successor, with split note) + **new `DE-BMFTR`** authority;
  DLR delegation → BMFTR; `DE-BSIG-NIS2` → BSIG 2025 / in force 6 Dec 2025 /
  Sector 7 / source_url bsig_2025 / §41 BMI; `DE-NIS2UMSUCG-DRAFT` flipped to
  **in_force** (id kept for embeddings stability) with verified dates + official
  title + legislative path; **`TREATIES_DE` filled** (OST/Rescue/Liability/
  Registration party + Moon not-party, cited, no fabricated dates); space-policy
  entries (Raumfahrtstrategie, Eckpunkte, Koalitionsvertrag, KRITIS-DachG space
  authority, WRG-debris draft, funding, RAÜG) repointed → **BMFTR**; economy
  entries (export, FDI screening, Ausfuhrliste, price supervision) → **BMWE**.
- **`src/data/regulatory/jurisdictions/germany.ts`**: SatDSiG approval BMWK →
  **BAFA (§ 24)** (×4); sensitivity 0.4m → SatDSiV thresholds; RAÜG supervision /
  WRG authority / registry / institutional list BMWK → **BMFTR** (+ BAFA, BMWE);
  NIS2 knowledge block + `additionalLaws` NIS2 entry → **in force 6 Dec 2025,
  BSIG 2025, Sector 7**; `nca` block → BMFTR/BAFA/BSI/BNetzA (DLR is the agency,
  not the regulator).

## Operational note

Editing corpus content invalidates the Atlas semantic embeddings for the touched
DE sources (same as the NL pass). An **embeddings regeneration** for the DE
sources is the follow-up ops step. Typecheck: **clean (0 errors repo-wide).**

_Last updated 2026-06-04._
