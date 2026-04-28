# AI-Act External-Counsel Review — Standing Instruction

> **Status:** Internal compliance instruction. Not a public document.
> Lives alongside the public AI-Disclosure (`/legal/ai-disclosure`) and
> tracks the boundary between in-house legal interpretation and the
> external-counsel attestation required to defend our risk-classification
> if challenged.
>
> Closes audit-finding #8.

---

## 1 · Why this document exists

`/legal/ai-disclosure § 5b` (and its EN twin) reaches the conclusion that
**Atlas and Caelex Comply are NOT high-risk AI systems** under Annex III
of Regulation (EU) 2024/1689 ("EU AI Act"). The analysis relies on
three legs:

1. **Annex III no. 8 textual scope** — applies to systems supporting
   _judicial authorities_, not to systems supporting lawyers acting
   for private clients.
2. **Article 6(3) carve-out** — even if Atlas were partially in scope,
   it performs only "narrow procedural tasks" (tool calls, search
   aggregation), "improves human activity" (memo drafts as
   suggestions), and "detects patterns without decisions" (Foresight,
   Recall).
3. **No autonomous legal effect** — the lawyer always remains the
   decision-maker; Atlas does not file documents, send memos, or
   represent clients.

Each of these is a _defensible_ legal position, not a settled one. They
must be backed by an external attestation before any of the trigger
events in §3 below.

---

## 2 · The standing instruction

**Caelex shall not represent — to a customer, regulator, supervisory
body, court, or commercial counterparty — that Atlas or Caelex Comply
are 'AI Act-compliant' or 'not high-risk' without the documented review
described in §3.** Until that review is on file, all such public-facing
language must:

- Frame the classification as Caelex's own interpretation pending
  external attestation (the existing § 5b language already does this);
- Avoid promissory language like "we are AI-Act compliant" or
  "regulators have confirmed our classification";
- Direct customers asking for AI Act deep-dive assurances to
  `legal@caelex.eu` so the request can be tracked and answered with
  current evidence rather than ad-hoc claims.

`/legal/ai-disclosure` already follows this pattern. Any new collateral
(decks, RFP responses, pricing pages, press) must match.

---

## 3 · Trigger events for external review

The following events trigger a **mandatory** external-counsel review.
Until review is complete and documented (§4), the corresponding action
is paused.

| Trigger                                                                                                                                                 | Pause condition                       | Latest acceptable review                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| **First paid pilot with a regulated-industry customer** (financial services, healthcare, critical-infrastructure operator subject to Annex III sectors) | Pilot kick-off                        | Before contract counter-signature         |
| **First general-availability launch of Atlas** (post-pilot, broad waitlist drop)                                                                        | Public-availability announcement      | Before launch press release               |
| **First customer request for AI-Act-compliance attestation in writing**                                                                                 | Written response to customer          | Within 30 days of request                 |
| **Any product change that introduces autonomous decisions with legal effect** (e.g. auto-filing to NCAs without lawyer review)                          | Feature-flag rollout                  | Before flag enabled in production         |
| **Any product change that introduces profiling of natural persons**                                                                                     | Feature-flag rollout                  | Before flag enabled in production         |
| **Material amendment of the AI Act, of Annex III, or of any GPAI implementing act**                                                                     | Public statements about the amendment | Before any public communication on impact |
| **Inquiry from a national or EU AI Act supervisory authority**                                                                                          | Public response to inquiry            | Before substantive response is sent       |
| **Annual review** (regardless of triggers above)                                                                                                        | n/a                                   | Once per calendar year                    |

---

## 4 · What "documented review" means

A review qualifies as documented when:

1. **Engagement letter** with an external EU AI Act specialist law firm
   is on file in `data-room/contracts/external-counsel/`.
2. **Scope statement** lists the three legs in §1 above plus any
   trigger-specific questions.
3. **Written opinion** (≥ 3 pages, signed by an admitted lawyer) is
   delivered, attached to this document as Annex A in PDF.
4. **Action items** from the opinion are captured as tickets in the
   internal tracker; high-risk items are gated behind feature flags
   until resolved.
5. **Review-date stamp** is added to the table in §6 below, with a link
   to the opinion PDF and the firm name.
6. **Public collateral update**: if the opinion changes the
   classification or requires new disclosures, `/legal/ai-disclosure`
   and any affected ToS/DPA sections are updated within 30 days.

---

## 5 · Recommended scope-questions for external counsel

When drafting the scope statement (§4 step 2), the following questions
should be put to counsel:

1. Is Atlas, in its current functional state and on the assumption
   that the user-facing surface is restricted to admitted lawyers,
   covered by Annex III no. 8 of the AI Act?
2. Does the Article 6(3) "narrow procedural tasks" exception apply to
   the Atlas tool-use loop, the Atlas Foresight feature, and the
   Atlas Personal Library Recall feature, separately considered?
3. Is the GPAI deployer obligation under Art. 50 AI Act fully
   discharged by our current labelling regime (chat-orb UI, "🤖 AI-
   generated" badges on pinboard cards, watermarks on Generate
   outputs)?
4. Are there any AI Act provisions whose application depends on the
   _deployer_'s status that change once Caelex's customer base
   includes (a) regulated-industry operators, (b) public-sector
   bodies, (c) law firms acting for public clients?
5. Does the Caelex Comply automated NIS2-classification path (§ 1 of
   the AI Disclosure) constitute "decision support for risk
   classification of natural persons" under any Annex III item once
   compliance officers' identities are linked to outputs?
6. Does our analysis of "no profiling of natural persons" in § 5b(3)
   hold for the Astra-Customer-Health-Score path and the Assure
   Investment-Readiness Score path (both of which include named
   individuals in their inputs)?
7. Are there national-implementation acts (Germany's
   KI-Durchführungsgesetz / France's loi d'application etc.) whose
   text is now adopted and whose obligations differ from the EU AI
   Act baseline we have analysed?

This list is non-exhaustive. Any question that has surfaced in a
customer security review since the last external review must be added.

---

## 6 · Review history

| Review date                       | Trigger                                                                                                        | External firm | Counsel | Opinion PDF | Outcome |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- | ------- | ----------- | ------- |
| _none yet — first review pending_ | _Trigger 1 ("first paid pilot in regulated industry") OR Trigger 2 ("Atlas GA launch"), whichever comes first_ | _TBD_         | _TBD_   | _TBD_       | _TBD_   |

> **Owner:** Julian Polleschner, Caelex (legal@caelex.eu).
> **Review cadence:** annually + on every trigger in §3.
> **Public reference:** `/legal/ai-disclosure § 5b` (DE) and `/legal/ai-disclosure-en § 5b` (EN) cite this document indirectly through the phrase _"We document this assessment internally and provide it to supervisory authorities on request."_
