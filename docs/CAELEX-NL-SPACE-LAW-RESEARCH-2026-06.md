# Netherlands Space Law — Verified Research & Database Corrections (2026-06)

> **Status:** Research complete + DB corrections applied. Method: deep-research
> harness (fan-out web search → primary-source fetch → 3-vote adversarial
> verification). 25 claims verified, 23 confirmed (3-0 / 2-1), 2 refuted.
> **Primary sources:** wetten.overheid.nl, rdi.nl, business.gov.nl,
> rijksoverheid.nl, eerstekamer.nl, UNOOSA, EUR-Lex / EC digital-strategy.
>
> This document is the audit trail for the NL space-law data in
> `src/data/national-space-laws.ts`, `src/data/regulatory/jurisdictions/netherlands.ts`
> and `src/data/legal-sources/sources/nl.ts`.

## TL;DR — what was wrong and is now fixed

| #   | Was (in our data)                                                                         | Now (verified)                                                                                                                          | Severity                               |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Regulator "Agentschap Telecom"                                                            | **RDI** (Rijksinspectie Digitale Infrastructuur), renamed **1 Jan 2023**                                                                | High (stale)                           |
| 2   | Licensing authority = **NSO**                                                             | **Minister of Economic Affairs**, licence handled/supervised by **RDI** (Art. 13). NSO is the policy/programme agency, not the licensor | **High (wrong authority)**             |
| 3   | "unlimited liability, no cap" / "flexible, no fixed cap"                                  | Liability + State recourse **CAPPED at the sum insured** (Art. 12); Minister sets "maximum possible cover" per licence (Section 3(4))   | **High (dangerous, reversed meaning)** |
| 4   | "€3,000,000 minimum (small sats)"                                                         | **No** fixed statutory minimum (figure was unsupported)                                                                                 | High                                   |
| 5   | Act = "24 oktober 2007" / "2006-12-14"; BWBR0023147; in force 2007-01-01; URL /2021-07-01 | **24 januari 2007**; **BWBR0021418**; in force **1 Jan 2008**; consolidated text **1 July 2025**                                        | High                                   |
| 6   | "2013 amendment" for small sats                                                           | **Besluit ongeleide satellieten** (19 Jan 2015, Stb. 2015, 18, **BWBR0036190**), in force 1 Jul 2015 — _added_ to DB                    | Medium                                 |
| 7   | Registry decree = BWBR0023441                                                             | **BWBR0022944** (primary-source-verified)                                                                                               | Medium                                 |
| 8   | Supervision "Art. 9"                                                                      | **Art. 13(1)** (RDI inspectors, Besluit aanwijzing toezichthouders BWBR0038004)                                                         | Medium                                 |
| 9   | NIS2/Cbw "applies"                                                                        | Cbw **passed Tweede Kamer 15 Apr 2026**, pending Eerste Kamer, EIF targeted **Q2 2026** — _not yet in force_; replaces Wbni             | Medium                                 |

## Verified findings (by point)

**1. Primary legislation.** _Wet ruimtevaartactiviteiten_ — full title "Wet van 24
januari 2007, houdende regels omtrent ruimtevaartactiviteiten en de instelling van
een register van ruimtevoorwerpen." Identifier **BWBR0021418**. In force **1 Jan
2008** (Besluit Stb. 2007, 492). Current consolidated text **valid from 1 July
2025**. _(3-0; wetten.overheid.nl/BWBR0021418.)_

**1b. Implementing instruments.** _Regeling aanvraag vergunning ruimtevaartactiviteiten
en registratie_ (**BWBR0023494**, under Art. 4(2)-(3)); _Besluit register
ruimtevoorwerpen_ (**BWBR0022944**); _Besluit ongeleide satellieten_ (**BWBR0036190**, 2015) extending the Act to remote management of **unguided/non-steerable** space
objects from NL. _(3-0.)_

**2. Competent authorities.** De jure the licence is issued by the **Minister of
Economic Affairs** ("Our Minister", Section 3). Supervision under **Art. 13(1)** is
charged to **RDI** inspectors (Besluit aanwijzing toezichthouders, **BWBR0038004**,
in force 1 Jan 2023). business.gov.nl: the licence is "from the Dutch Authority for
Digital Infrastructure (RDI)"; apply ≥ 6 months ahead. **Agentschap Telecom → RDI on
1 Jan 2023.** _(3-0; rdi.nl, business.gov.nl, BWBR0038004.)_

**3. Registry.** National register of space objects under the _Besluit register
ruimtevoorwerpen_ (BWBR0022944). _Operational maintainer not independently
re-verified_ (open — see below).

**4. Liability / insurance.** Section 3(4): operator must hold the "maximum possible
cover" (account taken of what is reasonably insurable); **no fixed statutory minimum
amount** — the Minister sets the sum per licence. Chapter 4 (Art. 12): the State has a
**right of recourse**, but the operator's liability and the State's recourse are
**capped at the sum insured**. _(3-0; UNOOSA Act text.)_ Open: whether intent/gross
negligence lifts the cap.

**5. UN treaties.** NL is a full party (status "R") to **all five** core treaties:
OST (ratified 10 Oct 1969), Rescue Agreement (1968), Liability Convention (ratified
26 Mar 1981), Registration Convention (1981), and the **Moon Agreement (ratified 17
Feb 1983)** — the only major space-faring nation fully bound. _(3-0; UNOOSA status
document A/AC.105/C.2/2026/CRP.9/Rev.1.)_

**6. NIS2 (Cyberbeveiligingswet).** NL missed the 17 Oct 2024 deadline (EC reasoned
opinion 7 May 2025). The **Cbw** (replacing the Wbni) **passed the Tweede Kamer on 15
Apr 2026**, pending the Eerste Kamer, with EIF targeted for **Q2 2026** — _not yet
formally in force as of mid-2026_. _(3-0; rijksoverheid.nl, eerstekamer.nl dossier
36764, ncsc.nl.)_

## Refuted (NOT asserted in the DB)

- "Responsible ministry is simply 'Economic Affairs (Economische Zaken)'" — **refuted
  (1-2)**. We use "Minister of Economic Affairs" / "Ministry of Economic Affairs and
  Climate (EZK)"; the hypothesised 2024 rename to "Klimaat en Groene Groei" was **not
  confirmed** — treat the exact current ministry style as OPEN.
- "UNOOSA English text is the 2006 Bill version" — refuted (1-2); provenance uncertain.

## Open / UNVERIFIED (deliberately NOT changed — no fabrication)

These were scope gaps in the verified set; existing DB values left as-is and flagged:

- **EU Space Act COM(2025) 335** — legislative status + concrete NL obligations.
- **Dual-use export control** Reg. (EU) 2021/821 NL implementation (CDIU / Belastingdienst Douane) detail.
- **Spectrum/ITU** procedure (beyond "RDI is the notifying administration").
- **Registry operational maintainer** (RDI? Ministry?) + exact workflow.
- **National space strategy / NSO role / ESTEC** — _unverified lead:_ one low-quality
  source claimed "NSO → Netherlands Space **Agency**" (Mar 2026); **not verified**, not applied.
- **Dutch case law** — research surfaced essentially **none**; the gap stands.
- **Implementing-decree dates/Stb** for BWBR0022944 — ID verified, date/Stb to re-confirm
  (wetten.overheid.nl blocked automated fetch during this pass).
- Comparative/structural claims left intact but unverified: dual-part registry, Art. 3a
  command-and-control extension, criminal-fine amounts.

## Corrections applied (files)

- `src/data/national-space-laws.ts` (NL entry): legislation URL/title, RDI authority,
  insurance/liability → capped (Section 3(4)/Art. 12), removed €3M, added unguided-
  satellites applicability rule, transition note, `lastUpdated: 2026-06`.
- `src/data/regulatory/jurisdictions/netherlands.ts`: `nca` NSO→RDI/Minister, spaceLaw
  BWBR/date/url, `additionalLaws` (+ 2015 + registry decree), NL-SAA-5/7/9 (registration
  basis, liability cap, supervision Art. 13), insurance block, knowledge base rewritten
  from NSO-as-authority → Minister/RDI + capped liability + corrected NIS2 status.
- `src/data/legal-sources/sources/nl.ts`: NL-WRA-2007 (dates, URL, liability, notes),
  NL-LIABILITY-1972 implication/notes, NL-CBW-NIS2 status/notes, NL-REGISTRY-DECREE
  (→ BWBR0022944), NL-RDI mandate (now space licence + Art. 13 supervision), NL-NSO
  (not the licensor), **added NL-BESLUIT-ONGELEIDE-2015**, header verification note.

_Last updated 2026-06-04._
