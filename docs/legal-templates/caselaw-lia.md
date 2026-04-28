# Legitimate-Interest Assessment — Atlas Caselaw Display

> **Status.** Internal compliance document. Documents the
> Art. 6(1)(f) GDPR legitimate-interest balancing test for displaying
> real party names (plaintiff/defendant) in the Atlas caselaw database
> (`/atlas/cases` and `/atlas/cases/[id]`). Closes audit-finding #16.
>
> **Owner.** Julian Polleschner (legal@caelex.eu).
> **Effective date.** 18 April 2026.
> **Review cadence.** Annually + on material change to the caselaw
> dataset (e.g. addition of jurisdictions where party-name redaction is
> the norm).

---

## 1 · Background and processing description

Atlas displays a curated database of court rulings, regulator
settlements, civil judgments, arbitral awards and treaty awards in the
space-law / space-regulatory domain. Each entry includes:

- Case caption / title (frequently in the form
  "Plaintiff v. Defendant")
- Plaintiff name (regulator, government agency, private litigant)
- Defendant name (operator, licensee, individual)
- Forum, jurisdiction, date decided
- Caelex-authored summaries of facts, ruling, holding and significance

Most party names in the dataset are corporate entities (e.g.
"In re ITT Corp.", "FCC v. Iridium Satellite LLC"). Where individuals
appear, they are typically named in their professional capacity (e.g.
named officers in regulator settlements). The dataset does **not**
include private individuals named only in their personal capacity.

Some plaintiff/defendant names constitute personal data under
Art. 4(1) GDPR — primarily where (a) the named entity is a sole
proprietor, (b) an individual officer is named, or (c) the matter
concerns a natural-person licensee (rare in space law).

This LIA documents the legal basis for processing those names.

---

## 2 · Lawful basis selection — why Art. 6(1)(f)

We rule out:

- **Consent (Art. 6(1)(a))** — impractical for historical case-law
  records; infeasible to obtain ex ante from defendants in adversarial
  matters.
- **Contract (Art. 6(1)(b))** — there is no contractual relationship
  between Caelex and the named parties.
- **Legal obligation (Art. 6(1)(c))** — no statute compels Caelex to
  publish caselaw summaries.
- **Vital interests (Art. 6(1)(d))** — not engaged.
- **Public interest / official authority (Art. 6(1)(e))** — Caelex is
  not vested with public authority.

The remaining basis is **Art. 6(1)(f) — legitimate interests**. The
following three-part test follows the EDPB and ICO LIA template.

---

## 3 · Purpose test — is the interest legitimate?

**Identified interest:** Operating an editorial regulatory database
that helps lawyers and compliance officers understand how the law in
their domain is actually applied, by linking statutory text to the
adjudicative outcomes that interpret it.

This interest is:

- **Specific.** The Atlas caselaw module exists for the narrow purpose
  of regulatory-decision research; it is not a general gossip database.
- **Real.** Lawyers explicitly asked for this surface during
  product-discovery interviews; the case-detail pages are among the
  most-accessed surfaces in Atlas.
- **Lawful.** Editorial reporting on judicial decisions and regulator
  enforcement is a recognised legitimate interest under recital 47
  GDPR ("processing for direct marketing purposes ... may be regarded
  as carried out for a legitimate interest" — by analogy, a fortiori
  for regulatory-transparency reporting). German § 5 UrhG, EU EUR-Lex
  re-use rules, UK OGL v3, and UN public-domain treatment of treaty
  documents collectively recognise that statutory and judicial output
  is a public good.
- **Beneficial to identifiable third parties** — the legal community
  benefits; the public-interest argument is supported by the
  recognised interest in regulatory transparency (CJEU C-184/20
  _OT v. Vyriausioji_ §83 ff. on public-data balancing).

**Conclusion.** The purpose test is satisfied.

---

## 4 · Necessity test — is processing necessary?

We considered alternatives:

- **Anonymised case names** ("Operator A v. Regulator B") — would
  destroy the connecting reference between statutory citations
  (`[ATLAS-…]`) and the relevant case law. Lawyers cite by case name
  in pleadings; without names the database stops being legally useful.
- **Citation-only entries** without facts/ruling text — would
  reproduce only the case caption (still personal data) but lose the
  research utility.
- **Restricting access to logged-in lawyers only** — would frustrate
  the platform's function as a public regulatory-research tool and
  would not in itself avoid GDPR processing.

The processing as designed is therefore necessary; less-intrusive
alternatives meaningfully degrade the legitimate purpose.

**Conclusion.** The necessity test is satisfied.

---

## 5 · Balancing test — does the interest override data-subject rights?

We weigh Caelex's legitimate interest against the rights and freedoms
of the named parties.

### 5.1 Factors favouring Caelex's interest

- **Already-public source material.** Every caselaw entry is sourced
  from official publications: court bulletins, regulator press
  releases, _Curia_, EUR-Lex, FCC eLibrary, FAA enforcement actions,
  national gazettes. Re-publishing already-public personal data
  carries materially less weight than first-publication.
- **Editorial framing, not gossip.** Each entry contains
  professionally relevant facts only (forum, date, ruling
  significance). The amber editorial-disclosure banner and per-section
  Caelex-summary pills (audit-finding #5 close-out) make clear what
  is editorial vs. cited.
- **Limited audience.** Atlas is not surfaced through search-engine
  homepage promotion; it is primarily reached via authenticated
  research workflows. The Cmd-K palette and source-detail
  cross-references are the dominant entry points.
- **Regulatory-transparency rationale.** Lawyers and compliance
  professionals need to understand how the law has been applied to
  identifiable parties in order to advise their own clients.

### 5.2 Factors favouring data-subject rights

- **Surprise risk** — a defendant in a 1990s FCC settlement may not
  expect to find their name in a 2026 SaaS caselaw database. We
  mitigate by (a) using only matters already published in official
  channels, and (b) honouring erasure requests on a case-by-case
  basis (see § 6).
- **Combined-data risk** — the Atlas dataset includes case caption +
  forum + date decided. Combining these does not in itself produce
  particularly sensitive information, but a third party could
  triangulate. Mitigated by professional-context-only publication.
- **Special-category data risk** — case entries are screened to
  exclude special-category personal data (Art. 9 GDPR). Health,
  political, religious or sexual-orientation data is not displayed.

### 5.3 Mitigations in place

1. **Editorial-disclosure banner** — every caselaw page shows that
   facts/ruling/holding/significance are Caelex-authored summaries
   and links to the official record (audit-finding #5).
2. **Linked official record** — each entry surfaces `source_url`
   prominently, giving readers the canonical version.
3. **Right to erasure pathway** — privacy@caelex.eu accepts erasure
   requests; the standard turnaround is 30 days (Art. 12(3)). Erasure
   is granted unless an overriding legitimate interest still applies
   (e.g. the matter remains the leading case on a regulatory point).
4. **No name in low-relevance entries** — settlements without
   precedential weight or industry significance are excluded by
   editorial policy (`PrecedentialWeight !== "non_precedential"`),
   reducing the volume of personal-data processing to matters with
   genuine professional value.
5. **No profiling.** Names are not used as inputs to any scoring,
   ranking or behavioural-prediction system. The Atlas Foresight
   feature operates on the user's own query, not on the defendants
   in case entries.

**Conclusion.** On balance, Caelex's interest in operating a
regulatory-transparency database, supported by the mitigations above,
overrides the residual privacy interest of named parties. The processing
is permitted under Art. 6(1)(f) GDPR.

---

## 6 · Data-subject rights handling

Persons whose name appears in a caselaw entry retain the full GDPR
rights catalogue. Channel: **privacy@caelex.eu**.

| Right                   | Handling                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Access (Art. 15)        | Full record provided within 30 days                                                                                         |
| Rectification (Art. 16) | Verified factual corrections applied                                                                                        |
| Erasure (Art. 17)       | Granted unless overriding legitimate interest persists; entry replaced with anonymised "Operator X" naming on partial grant |
| Restriction (Art. 18)   | Implemented as visibility flag on the entry                                                                                 |
| Object (Art. 21)        | Triggers a fresh balancing test against the specific objection grounds; outcome documented in the entry's audit-trail       |
| Complaint (Art. 77)     | Berliner Beauftragte für Datenschutz und Informationsfreiheit                                                               |

The privacy policy (`/legal/privacy § 9`) already names privacy@caelex.eu
as the access channel. No additional UI work is required for this
right's pathway, but the public-facing balancing-disclosure note
(§ 7 below) makes the basis explicit.

---

## 7 · Public-facing balancing disclosure

The caselaw listing page (`/atlas/cases`) has been updated to display a
small note on the legal basis next to the editorial-content banner
(audit-finding #5 close-out + #16 close-out). The wording references
this LIA without exposing internal-only details:

> _"Personenbezogene Parteienangaben werden auf Grundlage von Art. 6
> Abs. 1 lit. f DSGVO verarbeitet (berechtigtes Interesse an der
> regulatorischen Transparenz). Die zugrundeliegende Interessenabwägung
> ist in einem internen Legitimate-Interest-Assessment dokumentiert.
> Betroffenenrechte können unter privacy@caelex.eu geltend gemacht
> werden."_

The English mirror sits on the same component.

---

## 8 · Review log

| Review date                                      | Reason                                   | Outcome                                                       | Reviewer           |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- | ------------------ |
| 2026-04-28                                       | First documented LIA (audit-finding #16) | Processing permitted under Art. 6(1)(f), mitigations in place | Julian Polleschner |
| _next: 2027-04-28 or earlier on material change_ | Annual review or trigger event           | _pending_                                                     | _pending_          |
