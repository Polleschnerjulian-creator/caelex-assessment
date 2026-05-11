# Legal Corpus — IP & Source Provenance

> **Audit-Trail:** Compliance-Audit 2026-05 documented this file as the
> single canonical reference for the IP status of every entry under
> `src/data/legal-sources/` and `src/data/legal-cases/`. Add to this
> file whenever the corpus gains a new jurisdiction, sub-corpus, or
> licensing wrinkle.

## Scope of this document

The Atlas legal corpus consists of:

- ~950 source records under `src/data/legal-sources/sources/` (45 jurisdictions + `_template.ts`)
- 55 case records under `src/data/legal-cases/cases.ts` + `cases-additions-research-2026-05.ts`
- Translation files under `src/data/legal-cases/translations-de.ts` and `translations-fr.ts`

This README documents which legal regime governs **redistribution** of each piece of content and how Caelex's editorial work interacts with the underlying primary sources.

## Two layers of IP

Every entry has two IP layers:

| Layer                                                                                          | Owner                                | Licence                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Editorial work** — paraphrase, taxonomy, structure, glossing, cross-references, translations | Caelex (Inhaber: Julian Polleschner) | Proprietary (`SPDX-License-Identifier: LicenseRef-Caelex-Proprietary` headers on every file)                           |
| **Underlying primary source** — the statute / regulation / decision text                       | the issuing public body              | Per-jurisdiction public-domain regime (see table below). Caelex does NOT claim copyright in the primary source itself. |

The `LICENSE` file at repo root governs the editorial layer. The primary-source layer is governed by the per-jurisdiction rules summarised below.

## Per-jurisdiction primary-source rules

| Jurisdiction | Statute / decision text status                                                         | Reference                                                                  |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| DE           | Gesetze, Verordnungen, amtliche Erlasse, amtlich verfasste Leitsätze: gemeinfrei       | § 5 Abs. 1 UrhG                                                            |
| EU           | Most Eur-Lex content reusable with attribution                                         | Commission Decision 2011/833/EU                                            |
| INT          | UN treaty texts (UN Treaty Series): public-domain via UN Secretariat                   | UN-OHRLLS publishing terms; UNOOSA distribution                            |
| US           | Works of the U.S. Government are not subject to copyright                              | 17 USC § 105                                                               |
| UK           | Crown copyright works: Open Government Licence v3.0                                    | https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ |
| FR           | French statutes: free of monopoly under CPI Art. L122-5 2°; commentary still protected | Code de la propriété intellectuelle Art. L122-5                            |
| IT           | Atti ufficiali dello Stato: outside copyright                                          | L. 633/1941 Art. 5                                                         |
| CA           | Crown copyright (Reproduction of Federal Law Order — non-commercial reproduction OK)   | Reproduction of Federal Law Order, SI/97-5                                 |
| AU           | Crown copyright; CC-BY 4.0 for most federal statutes                                   | https://www.legislation.gov.au/Content/Linking                             |

The runtime mapping is `src/lib/atlas/verbatim-attribution.ts`.

## Closed-licence content (USE WITH CARE)

The corpus includes references to standards / specifications whose normative text is NOT free to redistribute. Atlas reproduces only **section identifiers + Caelex-paraphrased summaries** of these — never the normative text itself.

| Prefix        | Body  | Distribution restriction                                  |
| ------------- | ----- | --------------------------------------------------------- |
| `INT-ITU-…`   | ITU   | Subscription / member-state distribution; section refs OK |
| `INT-ISO-…`   | ISO   | Subscription only; quoting normative text is infringement |
| `INT-CCSDS-…` | CCSDS | Free to distribute (Blue Books are openly published)      |
| `INT-IADC-…`  | IADC  | Free with attribution (IADC public release)               |

**Editorial rule:** if a contributor wants to extend an `INT-ISO-…` or `INT-ITU-…` entry, they MUST paraphrase the normative text in their own words. Pasting verbatim from the standard is a contractual breach with the standards body.

The `npm run lint:legal-corpus` script (added in Compliance-Audit 2026-05) checks for high-confidence verbatim-text patterns in `summary` fields of these prefixes.

## Verbatim quoting policy

Caelex paraphrases by default. The `paragraph_text` field on `KeyProvision` is reserved for verbatim statutory text and is currently used in **10 entries only** (all from the 1967 Outer Space Treaty — public domain via UN Secretariat).

When verbatim text appears, the source-detail page renders it inside `<VerbatimProvisionText>` (`src/components/atlas/VerbatimProvisionText.tsx`), which automatically prepends the per-jurisdiction attribution clause from `verbatim-attribution.ts`.

The Astra LLM tool (`atlas-tool-executor.ts::get_legal_source`) caps each `paragraph_text` at 600 chars + ellipsis when serialising into the prompt. This prevents Astra from emitting unbounded verbatim quotations into chat output (Compliance-Audit 2026-05).

## Translations

`translations-de.ts` and `translations-fr.ts` translate Caelex's own paraphrased English narrative — they are derivative of Caelex's editorial work, NOT derivative of NJW / Beck / JURIS-edited Leitsätze. No third-party-edited German Leitsätze are reproduced or translated.

## On adding new entries

1. **Identify the jurisdiction** and confirm the per-jurisdiction status above.
2. **Provide `source_url` + `last_verified`** — the type system enforces both as non-optional.
3. **Default to paraphrase** — avoid `paragraph_text` unless the source is clearly within the public-domain regime AND the paragraph matters enough to need verbatim treatment.
4. **For ISO/ITU entries**: section-identifier + Caelex paraphrase only. Never paste normative text.
5. **For court decisions**: facts/ruling/holding fields are Caelex-authored prose. Do not copy NJW-edited Leitsätze, Beck-Online editor headnotes, or JURIS structured summaries.

## Caveats

This README is descriptive of the codebase as of Compliance-Audit 2026-05. Independent IP-counsel review is recommended before substantially expanding verbatim-text coverage to additional jurisdictions, especially where the source jurisdiction's "official text" carve-out is narrower than the German § 5 UrhG (e.g. France's CPI Art. L122-5 2° has a stricter scope).

Caelex does not warrant that every entry's IP status is correct — the corpus is provided as research material, not legal advice.
