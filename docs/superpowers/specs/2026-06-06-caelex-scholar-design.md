# Caelex Scholar — Concept Spec

> **Status:** Concept (one-pager) for sign-off. NOT a build plan — no implementation
> until this is approved and a `writing-plans` plan is drawn up.
> **Date:** 2026-06-06 · **Author:** brainstorm w/ Julian Polleschner

## Goal

**Caelex Scholar** is a free, **institutionally-licensed**, searchable window into the
**existing Atlas space-law corpus**, aimed at law students. Universities license it
(at no cost); their students reach it through the campus identity they already have.

It is **not a revenue product**. Its purpose is strategic:

- **Academic legitimacy** for the Caelex corpus ("used by _N_ law faculties").
- **Long-horizon funnel** — students who learn space law on Caelex become the
  associates who reach for **Atlas** at their firm.
- **Signal** — what students search reveals demand and corpus gaps for free.

The originating question was naming ("wie nennen wir das?"). This spec records the
naming outcome **and** the product/access decisions that fell out of it.

## Decisions (locked)

| #   | Decision            | Choice                                                                                                                                                   |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Name**            | **Caelex Scholar** — standalone name in the Caelex family, _powered by Atlas_ (endorsement, **not** an Atlas sub-brand)                                  |
| 2   | **Placement**       | **`caelex.eu/scholar`** — top-level path on the main domain (not a subdomain, not under `/atlas`)                                                        |
| 3   | **Business model**  | **Free institutional licensing** to universities (B2B2C). No payment, no paywall, no Stripe                                                              |
| 4   | **Access**          | **Fully gated, institutional.** University = licensed `Organization`; student = member via **Campus SSO (SAML/OIDC)**. Not self-serve `.edu` signup      |
| 5   | **Discovery / SEO** | **Explicitly irrelevant.** Distribution is via university partnerships, not search. The entire surface may be gated — no public crawlable layer required |
| 6   | **Corpus**          | **Reuse the full existing Atlas corpus as-is.** No new data acquisition                                                                                  |
| 7   | **Core function**   | **Searchable** corpus (keyword + semantic) + browse + read                                                                                               |

## Naming rationale

- **Why "Scholar":** instantly legible to a student audience; warmth/clarity beats
  erudition for this market. Apt category word (cf. scholarly legal databases).
- **Always a compound — never bare "Scholar".** "Scholar" alone collides with Google
  Scholar (unownable as a mark, invisible in search). `Caelex Scholar` in the
  _space-law_ niche is distinctive and likely registrable. **TM/domain clearance is a
  pre-launch must — not cleared here.**
- **No collision with the existing `Academy`.** Caelex `Academy` = the LMS (courses,
  classrooms, badges). Caelex `Scholar` = corpus access. Different category; names do
  not clash.
- Considered + rejected: `Lyceum`, `Codex`, `Athenaeum` (more gravitas, less instantly
  legible); `Atlas Scholar` (tighter funnel but reads as a sub-brand — conflicts with
  decision #1).

## Auth / Access model

Institutional access maps almost 1:1 onto infrastructure Caelex **already has**:

| Concept             | Existing primitive                                                         |
| ------------------- | -------------------------------------------------------------------------- |
| Licensed university | `Organization` (with a Scholar entitlement + term + optional seat cap)     |
| Student             | `OrganizationMember`                                                       |
| Campus login        | `SSOConnection` (SAML/OIDC) — Shibboleth-compatible, what libraries expect |
| Roster / seats      | `OrganizationInvitation` + RBAC                                            |

Surface auth pages mirror the proven `atlas-*` set: `scholar-login`,
`scholar-access`, `scholar-no-access` (+ `scholar-signup` only if a non-SSO fallback is
chosen).

**Pending — recommended default:** primary access = **institutional SSO**; secondary
fallback = **licensed academic email-domain allowlist** per Organization (for faculties
without SSO). Avoid literal `.edu` checks — they exclude the EU home market
(`.ac.uk`, `.uni-*.de`, `.edu.pl`, institution-specific TLDs).

## Architecture / Layout (sketch — analysis level)

- New route group **`src/app/(scholar)/scholar/…`**, built on the same pattern as
  [`src/app/(atlas)/atlas`](<../../../src/app/(atlas)/atlas>) — own layout, own sidebar.
- **Reuse corpus data, no duplication:** [`src/data/legal-sources`](../../../src/data/legal-sources)
  (~950 records / 45 jurisdictions), `src/data/legal-cases` (55 cases),
  `src/data/treaties.ts`, `src/data/national-space-laws.ts`,
  [`src/data/atlas/embeddings.json`](../../../src/data/atlas/embeddings.json) (semantic search).
- **New Scholar-scoped search API.** The existing
  [`/api/atlas/workspace/corpus-search`](../../../src/app/api/atlas/workspace/corpus-search)
  is **Atlas-product-gated** (paying firms only). Scholar needs its **own** search
  route, scoped to a licensed Scholar org, with its own rate-limit tier. **Do not
  widen the Atlas route** — that would hole the Atlas product gate.

## Data / Corpus & IP guardrail

The corpus has **two IP layers** (see
[`src/data/LEGAL-SOURCES-README.md`](../../../src/data/LEGAL-SOURCES-README.md)):
Caelex-proprietary editorial work (taxonomy, cross-refs, glossing, translations) over
per-jurisdiction public-domain primary sources.

**Free distribution to universities does not change the closed-licence rules.**
`INT-ITU-…` / `INT-ISO-…` entries may expose **section identifiers + Caelex paraphrase
only — never the normative standard text.** Scholar must honour the same
`lint:legal-corpus` guard Atlas does. (Primary statutes/treaties are fine — they are
public-domain by the README's per-jurisdiction table.)

## Out of scope (YAGNI)

- **Not the Atlas workspace** — no drafting, matters, vault, or agent/copilot in v1.
- **Not the Academy LMS** — no courses, quizzes, badges, classrooms.
- **No payment / billing** — licensing is a free grant, not a purchase.
- **No public/SEO surface** — discovery is via university BD, per decision #5.
- **No new data** — corpus is the existing Atlas set, as-is.

## Open decisions (pending — each has a recommended default)

| Topic                        | Recommended default                                                                      | Needs your call |
| ---------------------------- | ---------------------------------------------------------------------------------------- | --------------- |
| Access mechanism             | SSO primary + per-org email-domain allowlist fallback                                    | ✅              |
| Feature depth                | **Search + browse + read** for v1; AI Q&A copilot = later tier (you said "durchsuchbar") | ✅              |
| Corpus breadth               | Expose the **full** corpus (all 45 jurisdictions + cases + treaties)                     | ✅              |
| Faculty vs student           | Same access in v1; instructor features later                                             | ✅              |
| Wordmark / visual lockup     | Defer to a later visual pass (offer browser-companion then)                              | ✅              |
| Licensing terms doc for unis | Legal/Julian to draft (out of code scope)                                                | ✅              |

## Why this is mostly **not** greenfield

Name aside, Scholar is largely an **assembly** of things Caelex already owns: the
corpus + embeddings (Atlas), the org/SSO/RBAC tenancy (platform), the route-group +
auth-surface pattern (Atlas). The genuinely **new** build is: the `(scholar)` surface,
a Scholar-scoped search endpoint, and the Scholar entitlement on `Organization`.

---

### Next step

On approval → `writing-plans` to turn this into a phased, shippable implementation plan
(route group → Scholar-scoped search API → institutional access/SSO entitlement →
student search/read UI). Until then: **concept only, nothing built.**
