# ATLAS Landing Rights Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Atlas Landing Rights MVP — a static, read-only content layer covering 29 jurisdictions × 4 authorisation categories (market access, ITU coordination, earth station, re-entry) with filterable list, country detail, deep-dives, case studies, operator matrix, and conduct-conditionality pages.

**Architecture:** Pure static TypeScript data under `src/data/landing-rights/`, Next.js Server Components with `generateStaticParams`, filter state URL-query-synced, editorial workflow via Git-PR. No DB models, no API routes, no admin UI. Mirrors the existing `src/data/legal-sources/` pattern.

**Tech Stack:** Next.js 15 App Router (Server Components), TypeScript (strict), Tailwind (Atlas light-mode tokens), Zod (content validation), Vitest (unit), Playwright (E2E), existing `LanguageProvider` for i18n.

**Spec:** [docs/superpowers/specs/2026-04-16-atlas-landing-rights-design.md](../specs/2026-04-16-atlas-landing-rights-design.md)

**Scope note:** This plan ships the architecture + seed content for 3 countries (DE, US, IN). The remaining 26 country profiles, full deep-dive set, case studies, operator matrix entries, and conduct conditions are follow-up editorial PRs that use the seed files as templates.

---

## File Structure

### New files

```
src/data/landing-rights/
├── index.ts                                  Aggregated arrays + lookup functions
├── types.ts                                  Zod schemas + TS types
├── _helpers.ts                               JurisdictionCode union + shared utils
├── types.test.ts                             Schema validation over all profiles
├── profiles/
│   ├── _template.ts                          Template file for new jurisdictions
│   ├── de.ts                                 Germany seed profile
│   ├── us.ts                                 US seed profile
│   └── in.ts                                 India seed profile
├── category-deep-dives/
│   ├── market-access.ts                      Flat array (seeded with 1 example)
│   ├── itu-coordination.ts                   Flat array (empty initial)
│   ├── earth-station.ts                      Flat array (empty initial)
│   └── re-entry.ts                           Flat array (empty initial)
├── case-studies.ts                           Seeded with 1 example (Starlink India)
├── operator-matrix.ts                        Seeded with Starlink row (3 countries)
└── conduct-conditions.ts                     Seeded with 2 India entries

src/components/atlas/landing-rights/
├── LandingRightsStatusBadge.tsx              Colored status dot + label
├── DepthBadge.tsx                            Deep/Limited/Stub pill
├── LastVerifiedStamp.tsx                     Date badge, ages to amber/red
├── LandingRightsDisclaimer.tsx               Liability banner for LR pages
├── LandingRightsList.tsx                     Grid list component (used by list route)
├── LandingRightsFilters.tsx                  URL-query-synced filter sidebar
├── JurisdictionCard.tsx                      Card for grid view
├── JurisdictionProfileView.tsx               Country detail body (also embeddable)
├── CategoryDeepDiveView.tsx                  Deep-dive detail body
├── CaseStudyCard.tsx                         List item for /case-studies
├── CaseStudyView.tsx                         Case study detail body
├── OperatorMatrixTable.tsx                   Sticky-header matrix
└── ConductTable.tsx                          Sortable conduct table

src/app/(atlas)/atlas/landing-rights/
├── page.tsx                                  List view
├── layout.tsx                                Disclaimer wrapper for all LR routes
├── [jurisdiction]/
│   ├── page.tsx                              Country detail
│   └── [category]/
│       └── page.tsx                          Category deep-dive
├── case-studies/
│   ├── page.tsx                              List
│   └── [id]/
│       └── page.tsx                          Detail
├── operators/
│   └── page.tsx                              Operator matrix
└── conduct/
    └── page.tsx                              Conduct conditions

tests/e2e/
└── atlas-landing-rights.spec.ts              Smoke E2E
```

### Modified files

```
src/app/(atlas)/atlas/AtlasShell.tsx                    Add MAIN_NAV entry
src/app/(atlas)/atlas/i18n-labels.ts                    Add atlas.landing_rights.* keys
src/app/(atlas)/atlas/page.tsx                          Extend performSearch()
src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx     Embed Landing Rights section
```

---

## Task Breakdown

- **Phase A — Foundation:** T1 types, T2 helpers+index, T3 seed data
- **Phase B — UI primitives:** T4 badges + disclaimer + i18n
- **Phase C — Routes:** T5 list, T6 country detail, T7 deep-dive, T8 case studies, T9 operators + conduct
- **Phase D — Integration:** T10 sidebar, T11 jurisdiction-page embed, T12 command-center search
- **Phase E — E2E:** T13 Playwright smoke

---

Write `docs/superpowers/plans/2026-04-17-atlas-landing-rights-tasks.md` gets tasks T1–T7.
Write `docs/superpowers/plans/2026-04-17-atlas-landing-rights-tasks-part2.md` gets tasks T8–T13.

(Tasks are split across two files to keep each readable.)

See [Part 1: Tasks T1–T7](./2026-04-17-atlas-landing-rights-tasks.md) and [Part 2: Tasks T8–T13](./2026-04-17-atlas-landing-rights-tasks-part2.md).
