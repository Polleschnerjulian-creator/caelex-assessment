# Caelex Trade — Living Roadmap

**Purpose.** This document is the single source of truth for what is built,
what is shipping, and what comes next in Caelex Trade. It is written so
that any future Claude / engineer can resume work after a context-window
compact without losing the strategic thread or the per-sprint detail.

**Cadence.** Update at the end of every sprint batch. Each completed
sprint moves from `Backlog` → `Shipped`. The pull request that ships a
sprint must include the corresponding update to this file in the same
commit (or the immediate follow-up).

**Last updated.** 2026-05-22 (Z3a-Z3l + Z8 + Z10 shipped — moat layer
complete with matcher engine + bridge service; Z4 AI Copilot is the
next major item).

---

## 1. Reference documents

These are the inputs that drive the roadmap. Treat as primary sources.

| Document                                                                   | What it is                                                                                                                                                                                                                                                                                                                   | Where                                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Caelex Trade — Exhaustive Export Control Research Blueprint** (May 2026) | The most important reference. Independent research that arrived at the same product model we're building (ICP + EUC + Re-Export + VSD + 50% Rule + Catch-all). Defines the moat we should build (parametric cross-walk + AI classification) and the operational integrations we lack (ELAN-K2, OpenSanctions UBO, Annex IV). | `~/Downloads/compass_artifact_wf-3ca00b32-3e99-4be3-81f9-1278d9556f31_text_markdown.md` (copy into `docs/` on next sprint) |
| **Caelex Trade — Deep Coverage Audit (2026-05-22)**                        | Internal audit from earlier in the project. Maps current capabilities to gaps and lays out Phase F-J.                                                                                                                                                                                                                        | `docs/CAELEX-TRADE-DEEP-COVERAGE-AUDIT-2026-05-22.md`                                                                      |
| **CLAUDE.md**                                                              | Project conventions, stack, security posture, design system, deploy policy.                                                                                                                                                                                                                                                  | `CLAUDE.md`                                                                                                                |
| **MEMORY.md**                                                              | User preferences + cross-session memory.                                                                                                                                                                                                                                                                                     | `~/.claude/projects/.../memory/MEMORY.md`                                                                                  |

---

## 2. Status snapshot (2026-05-22)

### Live in production at www.caelex.eu

| Surface                                                                                            | Sprints           | Test count                                                        |
| -------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| Items list + detail with multi-jurisdiction classification (ECCN US/EU, USML, MTCR, German AL)     | A1                | (covered in classification-pipeline.test)                         |
| Counterparty list + detail with 6-list sanctions screening + 50% Rule Cascade + BIS Affiliate Rule | A2 + B1 + B2 + D2 | (covered in screening tests)                                      |
| Operations pipeline with catch-all triggers (15 rules), license determination, license stack       | A3 + B3 + D4 + D5 | catch-all-evaluator.test (27) + property-trigger-engine.test (45) |
| Licenses tracking with expiry cron + reminders                                                     | A4 + C1           | (covered in license-reminder-service.test)                        |
| Compliance Program (7 sections) editable for MANAGER+                                              | E3                | program-service.test (10)                                         |
| End-Use Certificates (EUC) full lifecycle + expiry cron                                            | E5a–e             | euc-service.test (13) + euc-reminder-service.test (8)             |
| Re-Export Consents full lifecycle + expiry cron                                                    | E4a–d             | reexport-service.test (15) + reexport-reminder-service.test (9)   |
| Voluntary Self-Disclosures (VSD) + Deadline-Cron with OFAC/BIS/DDTC clocks                         | E1a–c + W1        | vsd-service.test (18) + vsd-deadline-service.test (16)            |
| `/trade` dashboard with Compliance Health summary                                                  | X1 + X2           | —                                                                 |
| Cross-links counterparty/operation → EUC/Re-Export/VSD                                             | Y1+Y2+Y3          | —                                                                 |
| Email templates (license expiry, sanctions hit, catch-all, blocked, welcome)                       | E2                | —                                                                 |
| License Exception Matrix (BIS STA/ENC/CSA/GOV/TMP + BAFA AGG-12/AGG-27 + EUGEA EU001)              | B3 + D3           | license-exception-matrix.test (35)                                |
| § 9(1) AWV nuclear catch-all (9 countries, BAFA-notified / aware / keyword)                        | Z1                | catch-all-evaluator.test (covered)                                |
| EU Annex IV (Reg. 833/2014 Art. 2b) as 7th sanctions layer with hard PROHIBITED gate               | Z2 + Z2b          | eu-annex-iv.test (17)                                             |
| § 9(2) AWV military-end-use catch-all (19 arms-embargo countries)                                  | Z10               | catch-all-evaluator.test (45)                                     |
| Parametric control-list cross-walk + three-valued matcher (USML/CCL/EU/MTCR with "specially        | Z3a–Z3h           | parametric-matcher.test (52)                                      |
| designed" gating, CMG vs reaction-wheel disambiguation, full 9A515.a/.d/.e sub-paragraph rules)    |                   |                                                                   |
| ICP 2019/1318 seven-element mapping with BAFA SAG eligibility (≥ 80% mandatory)                    | Z8                | icp-mapping-service.test (25)                                     |

**Total Vitest count:** 700+ trade tests passing (post Z3h + Z8 + Z10).

### What's NOT yet built (the gap)

See § 3 below for the prioritised list against the May 2026 research blueprint.

---

## 3. Prioritised backlog

Each item below has a Z-prefix sprint number and detail enough that a fresh
session can implement it. Order = top-down execution priority.

### Z1 — § 9 AWV nuclear catch-all (1 sprint) ✅ SHIPPED

**Why.** Research blueprint § 4 calls out the German § 9(1) AWV nuclear
end-use catch-all on **non-listed items** to nine specified countries:
Algeria, Iraq, Iran, Israel, Jordan, Libya, North Korea, Pakistan, Syria.
Triggered by BAFA notification OR positive exporter knowledge of an
intended nuclear-related end-use under Annex I Category 0. Our
property-trigger-engine has 15 rules but **no explicit § 9 AWV nuclear
catch-all** — we'd miss the trigger on a non-listed item shipped to one
of the nine countries.

**Files to touch.**

- `src/lib/comply-v2/trade/property-trigger-engine.ts` — add Rule 16
  `NUCLEAR_END_USE_NINE_COUNTRIES`. Fires when destination ∈ {DZ, IQ, IR,
  IL, JO, LY, KP, PK, SY} AND any of: (a) operation has flag
  `nuclearEndUseAware = true`, OR (b) item's name/description matches
  nuclear-related keywords (centrifuge, isotope separation, plutonium,
  enrichment, uranium hexafluoride, …).
- Confidence: HIGH when BAFA notification flag set, MEDIUM on keyword
  match.
- `property-trigger-engine.test.ts` — add tests for the 9-country gate
  - the keyword/notification triggers + the negative case (10th
    country).

**Out of scope.** UI for marking `nuclearEndUseAware = true` on an
operation — operators can set it via Astra or future operation-edit UI.

### Z2 — Annex IV (Reg. 833/2014 Art. 2b) as separate sanctions layer (2 sprints) ✅ SHIPPED

**Why.** Research blueprint § 7. Council Regulation (EU) 2026/506 of
23 April 2026 added 60 entities to Annex IV (32 Russian, 28 in third
countries — China inc. HK, Türkiye, UAE, Thailand). Annex IV is
**enhanced end-user screening on top of** the EU FSF — same entity can
appear in both, but Annex IV carries a different prohibition surface
(Art. 2b ban on dual-use to ANY Annex IV-listed party regardless of
civilian intent).

Right now `screen-party.server.ts` checks 6 lists. Annex IV is a 7th
distinct list. Treating it as "more entries in FSF" loses the legal
distinction.

**Files to touch.**

- `prisma/schema.prisma` — add `EU_ANNEX_IV` to `TradeSanctionsList`
  enum.
- `src/lib/comply-v2/trade/screening/sources/eu-annex-iv.ts` — new
  parser. Source: EUR-Lex Reg. 833/2014 Annex IV PDF + JSON
  consolidated extract.
- `src/lib/comply-v2/trade/screening/sync-orchestrator.ts` — register
  the new parser.
- `src/lib/comply-v2/trade/screening/screen-party.server.ts` — when an
  Annex IV hit is found, set `decision = POTENTIAL_MATCH` AND emit a
  `screeningHits` entry tagged with `list: "EU_ANNEX_IV"` so the UI
  can show it distinctly.
- License-determination must learn that an EU_ANNEX_IV match for a
  dual-use item triggers Art. 2b PROHIBITED (not just license-
  required) — this is a hard prohibition, not a discretionary regime.
- Tests in `eu-annex-iv.test.ts`.

**Z2-sub.** Update the property-trigger-engine to add Rule 17
`ANNEX_IV_END_USER_PROHIBITION` that triggers when any counterparty
or intermediary in the operation is on Annex IV.

### Z3 — Parametric control list schema (2-3 sprints) ✅ SHIPPED (Z3a-Z3h)

**Status (2026-05-22).** Eight sub-sprints landed across the matcher
moat — the most differentiated part of the product. Production-grade
parametric classification with:

- 20+ cross-walk entries: USML XV(a)(7)(i), 9A515.a.1-.a.4 (split by
  EO / SWIR / SAR / OSAM with full sub-paragraph predicates),
  9A515.d (all 5 conjunctive radiation criteria), 9A515.e, 9A515.x
  (EP + RW with isSpeciallyDesigned gating), 9A515.g, USML XV(b),
  USML XV(e)(1) / (e)(11)(iv) / (e)(13) / (e)(16), USML XII anti-jam
  GNSS, USML IV(d)(2) / (d)(3) MTCR Cat I/II, EU 9A004, MTCR 1.A.1
- 15+ typed parametric columns on `TradeItem` (aperture, payload,
  range, Isp, ΔV, GSD, transmit power, radar centre freq / bandwidth,
  TID, SEU, dose-rate upset, neutron fluence, SEL LET, antenna
  diameter, star-tracker accuracy / slew rate, total impulse, GNSS
  max velocity, isSpeciallyDesigned, isAntiJam, …)
- Three-valued logic (true / false / UNKNOWN): NULL attribute emits a
  PossibleMatch with actionable "populate X to resolve" rationale;
  refutation overrides UNKNOWN (defence-in-depth)
- "Specially designed" predicate integration on 9A515.x catch-alls
  and USML XV(b) — industrial flywheels and commercial TT&C antennas
  no longer overfire
- CMG vs reaction-wheel disambiguation closes the most-frequent
  classification error documented in the 2014 IFR preamble (79 FR 27184)
- Boundary tolerance with 1e-9 epsilon for IEEE-754 imprecision;
  Order-of-Review respected (USML/CCL overlap surfaces BOTH)

71 tests on the matcher (post Z3k); full coverage of every regulatory
boundary in the May 2026 research blueprint § 5. See-through rule
propagation across a BOM graph is deferred (needs a BOM model) —
queued as Z3m.

**Sub-sprints shipped (May 22, 2026 batch 2):**

- **Z3i** — 9A515.g entry (components specially designed for
  9A515.a.1-.a.4 sensitive remote-sensing satellites). New
  `component.spacecraft.remote_sensing.*` itemClass prefix
  convention; introduces `components_of` cross-walk relationship.
- **Z3j** — 9A515.b entry (EAR civilian TT&C ground station, the
  pair to USML XV(b)). Bifurcation via `isSpeciallyDesigned`
  predicate — military → ITAR, civilian → EAR. Closes a coverage
  gap where civilian TT&C antennas had no match.
- **Z3k** — Near-miss surfacing. A fourth result lane on
  `MatcherResult` (`nearMisses`) exposes entries that almost
  matched: ≥1 matched + exactly 1 refuted + 0 unknowns. Includes
  the refuting predicate's expected AND actual values so the
  operator can correct the item spec.
- **Z3l** — TradeItem → matcher bridge service
  (`classifyTradeItemParametric`). Pure function that marshals a
  TradeItem snapshot into the matcher's input shape. This is the
  integration seam server actions / API routes will use to expose
  the engine to the UI.

**Why.** Research blueprint § 5. The genuine moat. No incumbent
(Descartes, AEB, SAP GTS, OpenSanctions) models space-domain
classification with technical-parameter queryability.

Right now we have `TradeItem` with eccnUS, eccnEU, usmlCategory,
mtcrCategory, germanAlEntry as nullable strings. We have a CCL data
file with 49 ECCNs. **What we don't have:** the parametric predicates
that link a product's specs to the regulatory entry.

**Files to touch.**

- `prisma/schema.prisma` — extend `TradeItem` with typed technical
  attributes:
  - `apertureM` Float?
  - `payloadKg` Float?
  - `rangeKm` Float?
  - `IspSeconds` Float?
  - `deltaVMetersPerSecond` Float?
  - `seuRateErrorsPerBitDay` Float?
  - `gsdMeters` Float?
  - `transmitPowerW` Float?
  - `frequencyBandGhz` Float? (or array)
  - `radHardTidKrad` Float?
  - Plus a JSON `additionalAttributes` for one-off specs.
- `src/data/trade/control-list-cross-walk.ts` — new structured file.
  Each entry has shape:
  ```ts
  {
    canonicalId: "9A515.a.1",  // primary key
    regime: "EAR-CCL",
    category: "9", productGroup: "A", entryNumber: "515", subpara: "a.1",
    title: "...",
    predicates: [
      { attribute: "apertureM", op: "between", value: [0.35, 0.50] },
      { attribute: "spacecraftClass", op: "eq", value: "remote_sensing" },
    ],
    seeAlso: [
      { regime: "ITAR-USML", id: "XV(a)(7)", relationship: "predecessor" },
      { regime: "EU-Annex-I", id: "9A004", relationship: "analogous" },
      { regime: "MTCR-Annex", id: "Item 19", relationship: "source" },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial", "GOV"],
    citation: "15 CFR 774 Supp. 1 Cat 9",
    validFrom: "2017-01-15",
  }
  ```
- Start with full coverage of USML XV(a)–(g), CCL 9A515.a–.y +
  9A004 family, EU Annex I Cat 9, DE AL 9xx + 19xx, MTCR Items 1–20.
- `src/lib/comply-v2/trade/classification/parametric-matcher.ts` —
  pure function that takes a TradeItem's attributes and returns
  ranked candidate matches with confidence + matching-predicate
  trail.
- Tests: `parametric-matcher.test.ts` covering boundary thresholds
  (0.49m vs 0.50m aperture, SEU 1×10⁻¹¹ vs 1×10⁻¹⁰), no-match cases,
  ambiguous multi-match.

### Z4 — AI Classification Copilot v0 (3-4 sprints)

**Why.** Research blueprint § 5.4 + Stage 3 #1. "Drop in a datasheet,
get a defensible classification draft." Single biggest DX win.

**Approach.** Two-phase:

1. **Spec-extraction phase** — operator uploads a product PDF /
   datasheet. Astra (Anthropic Claude) parses the PDF, extracts typed
   attributes, fills the new `TradeItem` fields from Z3.

2. **Classification phase** — call `parametric-matcher` from Z3
   against the extracted attributes. Astra synthesises the matcher
   output into a human-readable rationale citing the exact predicate
   that fired + the regulatory clause.

**Output.** A `TradeItemClassificationDraft` with:

- Ranked candidate list (ECCN + EU Annex I + DE AL + MTCR Item).
- Per-candidate confidence (0–1).
- Citation trail (which predicate matched on which attribute).
- Provenance pointer to the source clause.
- **Always requires human sign-off.** Output is a draft, never binding.

**Files to touch.**

- `src/lib/astra/tools/classify-item.ts` — new Astra tool.
- `src/lib/comply-v2/trade/classification/datasheet-extractor.ts` — PDF
  - image parsing via Anthropic Claude vision.
- `src/lib/comply-v2/trade/classification/draft-classification.ts` —
  orchestrator that calls extractor + matcher + composes draft.
- DB: new model `TradeItemClassificationDraft` with FK to TradeItem,
  store the draft + confidence + reviewerSignOff fields.
- Tests.

### Z5 — BAFA ELAN-K2 XML reporting interface (2-3 sprints)

**Why.** Research blueprint § 1 + Stage 1 #4. Every German operator
who uses AGG (allgemeine Genehmigung) must file annual reports via
ELAN-K2 XML. BAFA publishes the XSD. **Without this, German operators
can't actually use the AGGs we model.**

**Files to touch.**

- `src/lib/trade/elan-k2/xsd-types.ts` — TypeScript types derived from
  the BAFA Meldeschnittstelle XSD.
- `src/lib/trade/elan-k2/report-builder.ts` — given an org + license
  - date range, build the M1 report XML.
- `src/lib/trade/elan-k2/xml-serializer.ts` — serialise to BAFA-
  compliant XML.
- UI: `/trade/elan-k2` page showing eligible licenses + a "Generate
  M1 report XML" button.
- BAFA XSD changelog watcher (last update 5 Feb 2026 per blueprint).
- Tests against the XSD via a validation step.

### Z6 — PDF templating for EUC + VSD filings (3-4 sprints)

**Why.** Research blueprint § 6 + Stage 2 #4. We track EUCs and VSDs
but the operator still has to fill out the actual BAFA / BIS / DDTC
forms by hand. The 2024 BAFA Bekanntmachung tightened the required
Anlage C 1 / C 2 / C 4 / C 6 / C 7 formats.

**Forms to template.**

- BAFA C1, C2, C4, C6, C7 (Endverbleibserklärungen)
- BIS Form 711 (Statement by Ultimate Consignee)
- DDTC DS-83 (NDAA Compliance Statement)
- VSD narrative templates for BIS §764.5, DDTC §127.12, OFAC §501.805(c)

**Files to touch.**

- `src/lib/pdf/reports/trade-euc-bafa-c1.tsx` etc. — one per form.
- `src/lib/trade/euc-pdf-prefill.ts` — pulls TradeEUCRequest +
  counterparty + operation data and feeds the template.
- "Download prefilled PDF" button on each EUC list row.
- VSD narrative composer: Astra tool that drafts the disclosure
  letter from the TradeVoluntaryDisclosure + operation/item/party
  context.

### Z7 — De minimis + FDPR deep-dive calculator (2 sprints)

**Why.** Research blueprint § 2 + § 8. We have `de-minimis-calculator.ts`
already (43 tests) but the FDPR scenarios are critical and complex.

**What's missing.**

- 0% de minimis for 9×515 and 600-series to D:5 / E:1 / E:2.
- 0% de minimis for ECCN 9E003.a.1–a.6, .a.8, .h, .i, .l (turbine /
  rocket-engine "technology").
- FDPR (15 CFR §734.9) — 9 separate scenarios:
  - Entity-List FDP
  - Russia/Belarus FDP
  - Advanced Computing/Semiconductor SME FDP
  - Plus 6 others
- Per-scenario predicate evaluation + clear "subject to EAR" / "not
  subject" output with citation.

**Files to touch.**

- Extend `de-minimis-calculator.ts` with the 9 FDPR scenarios.
- Add ECCN-aware thresholds (0% for 9x515 to D:5, 25%/10% by default).
- New tests covering the 9 FDPR scenarios.

### Z8 — ICP 2019/1318 seven-element mapping (1 sprint) ✅ SHIPPED

**Status (2026-05-22).** Pure data + engine landed. 7 elements, 22
check items (15 mandatory), auto-satisfaction wiring to existing
`TradeComplianceProgram` fields, manual override map for auditor
sign-off, and BAFA SAG-eligibility flag at ≥ 80% mandatory completion.
UI rendering of the seven-element view on `/trade/program` is
deferred to a UI sprint (data layer + engine are the moat).

**Why.** Research blueprint § 1 + 7. Our `TradeComplianceProgram` has
7 sections but they don't 1:1 map to the EU 2019/1318 Recommendation
seven core elements. BAFA's ICP merkblatt expects this exact mapping.

**The seven elements.**

1. Top-level management commitment
2. Organisation structure, responsibilities, resources (incl.
   Ausfuhrverantwortlicher / CECO)
3. Training and awareness
4. Transaction screening process and procedures
5. Performance review, audits, reporting, corrective actions
6. Recordkeeping and documentation
7. Physical and information security

**Files to touch.**

- `prisma/schema.prisma` — extend `TradeComplianceProgram` with the
  7-element-aligned fields (some exist, some need adding —
  e.g. `physicalAndInfoSecurity` JSON field).
- `/trade/program` page — restructure the 7 sections to match the
  2019/1318 element order with explicit labels.
- BAFA-style ICP audit checklist generator.

### Z9 — OpenSanctions / Orbis UBO integration for OFAC 50% Rule (3 sprints)

**Why.** Research blueprint § 7 + 8. Today our 50% cascade walks the
org's own `TradePartyOwnership` graph. For real-world enforcement we
need external beneficial-ownership data — operators rarely have full
UBO chains internally. OpenSanctions has the OJEU-pre-FSF watcher +
EU national lists; Orbis has the corporate ownership data.

**Files to touch.**

- `src/lib/comply-v2/trade/screening/sources/opensanctions.ts` —
  parser for the OpenSanctions API (commercial license needed).
- `src/lib/trade/ubo-resolver.ts` — given a `TradeParty`, query
  Orbis or OpenSanctions for the UBO chain and ingest it into our
  `TradePartyOwnership` table. Refresh on a schedule.
- Tests + env-var management for the API keys.

### Z10 — § 9(2) AWV + other AWV catch-alls (1 sprint) ✅ SHIPPED

**Status (2026-05-22).** § 9(2) AWV military-end-use catch-all to
19 arms-embargo countries (EU+UN+national union) wired into the
catch-all evaluator. Triggers HIGH on BAFA notification / self-
attested awareness / declared MILITARY end-use; MEDIUM on sectoral
keyword match. Decoupled from § 9(1) (Iran fires nuclear only, not
military, when only a nuclear keyword is present). § 9(3) (chemical/
biological) and § 9(4) (other embargo destinations) remain queued
under Z10b — research blueprint doesn't pin a tight specification
for those yet.

**Why.** Research blueprint § 4 + § 1. § 9 AWV also covers other
catch-all triggers beyond § 9(1) nuclear — including military-end-use
to broader country lists per German interpretation (which is wider
than Art. 4(1)(b) EU 2021/821 reading).

**Files to touch.**

- `property-trigger-engine.ts` — Rules 18, 19, 20 for the additional
  § 9 AWV triggers.

### Z11 — Sammelgenehmigung (SAG) lifecycle (3-4 sprints)

**Why.** Research blueprint § 3 + Stage 2 #2. Operators with ICP +
BAFA Zuverlässigkeitsprüfung can use SAGs to amortise the long
processing time. Currently we model `TradeLicense` but not the SAG-
specific lifecycle (application → BAFA correspondence → grant →
shipment-by-shipment use → annual reporting → renewal).

### Z12 — Bill-of-materials de minimis integration (2 sprints)

**Why.** Research blueprint § 2 + Stage 2 #3. De minimis is per-item,
but an operator's BOM has many items each with different US-origin
content. A BOM-level calculator that rolls up per-line de minimis to
a finished-good determination is real workflow.

### Z13 — Deemed export controls for multinational R&D teams (3 sprints)

**Why.** Research blueprint § 2. Transfer of US-origin technical data
to a foreign national inside the EU = "deemed export" requiring a
licence. We need nationality-aware access controls on technical data
repositories.

### Z14 — ATLAS DE + AES US customs filing integration (4 sprints)

**Why.** Research blueprint § 4.5 + Stage 3 #3. The export declaration
is the final step; reconciling it against the export-control
determination closes the loop.

### Z15 — Predictive licence-time analytics (3 sprints)

**Why.** Research blueprint Stage 3 #4. BAFA processing times tripled
2021→2023 (36 → 83 working days). Operators want forecast: given my
item, destination, end-use, how long?

### Z16 — 2026 OFAC sham-transaction "control-in-fact" doctrine (2 sprints)

**Why.** Research blueprint § 7. 31 March 2026 OFAC guidance extends
50% Rule beyond formal ownership to control-in-fact patterns. The
GVA Capital \$215m statutory-max penalty (June 2025) is the case law.

**Files to touch.**

- `cascade-50pct.ts` — add a parallel "control-in-fact" finding that
  doesn't aggregate into the 50% number but is reported as a separate
  flag (already partially modelled via the `controlType =
"control_no_equity"` post-Dec-2025 OFAC trustee doctrine).
- New heuristics: pattern of dealings, payment routing, common
  directors — surface as a "control indicia" finding requiring human
  review.

---

## 4. Future / non-immediate Phases

These items from the deep-coverage audit + research blueprint are
slated for **after** the Z-series:

| Phase                                           | What                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Sanctions expansion**                         | Add NK / Iran-specific source lists, Switzerland SECO, Japan METI                                                        |
| **Public API v1 expansion**                     | Document the existing `/api/v1/compliance/*` endpoints + add VSD/EUC/Re-Export/EUC endpoints + OpenAPI spec + Swagger UI |
| **Embeddable widget for end-user attestations** | Public token-gated JS widget for B2B portal embedding                                                                    |
| **Astra-Composer for VSD narrative**            | AI drafts the disclosure narrative from operation/item/party data                                                        |
| **Sanctions diff alerts**                       | Daily diff of 6 sanctions sources + alert on new entries matching existing org parties                                   |
| **Multi-org benchmarking**                      | "Your VSD outcomes vs industry median"                                                                                   |
| **Mobile / responsive review**                  | All `/trade/*` routes are desktop-first today                                                                            |
| **Cross-industry expansion**                    | Defence electronics (3A611), UAV (9A012 / Cat VIII) to widen TAM                                                         |

---

## 5. Architecture invariants — do not violate

When implementing any of the above, these rules hold:

1. **All `*-service.ts` files are org-scoped.** Cross-org reads/writes
   must be refused via defensive lookups before persistence.
2. **All server actions are role-gated.** OWNER/ADMIN/MANAGER can
   write; below that is read-only. Use the existing `assertEditor`
   helper pattern.
3. **All sanctions parsers register in `sync-orchestrator.ts`.**
   Adding a parser without registering it = silent failure.
4. **Crons authenticate via `Authorization: Bearer ${CRON_SECRET}`
   with `timingSafeEqual`.** Mirror the `trade-license-expiry/route.ts`
   pattern.
5. **Tests are co-located** as `*.test.ts` next to the file under test.
   Use `vi.hoisted()` for shared mock refs (Prisma client mocks).
6. **Migrations are hand-rolled SQL** under
   `prisma/migrations/<timestamp>_<slug>/migration.sql`. Apply via
   `prisma migrate deploy` on build (in `package.json` `build:deploy`).
7. **`.vercelignore` patterns must be anchored with `/`** if they
   refer to root-only directories. Bare names (e.g. `reports/`) match
   any directory of that name in the tree — bit us once already.
8. **AI / Astra output is never binding.** Always require human
   sign-off. Liability cannot be transferred to the SaaS vendor.

---

## 6. Deploy + batch-policy reminder

- Batch 6–8 commits before push to `main`.
- Push triggers Vercel production build (the only working deploy
  path; CLI direct upload hits Vercel's 10MB / 15k-files limits
  because this is a polyglot repo with src-tauri 1.9 GB).
- `git push` needs `~/.netrc` with `machine github.com` + GitHub PAT
  in non-TTY shells (osxkeychain requires a TTY).
- Migrations apply at build time via `prisma migrate deploy`.
- Crons activate on the next scheduled tick after deploy.

---

## 7. Open questions for future sessions

These are items where direction isn't fully decided:

1. **Annex IV parsing source.** EU OJEU PDF vs. a community-maintained
   structured extract? Both have lag risk. Pre-FSF watcher option via
   OpenSanctions?
2. **AI Classification — own model or Anthropic Claude tool calls?**
   Tool calls give zero-infrastructure but ongoing API cost; own
   model means training corpus curation + fine-tuning effort.
3. **Sammelgenehmigung — model SAGs as a separate entity from
   TradeLicense, or extend TradeLicense?** Extending keeps the
   licenses list unified but the SAG state machine is meaningfully
   different (per-shipment use, annual reporting cadence).
4. **PDF generation library — keep `@react-pdf/renderer` for
   client-side + `jsPDF` for server-side, or migrate to `puppeteer`
   for both?** The 2024 BAFA Bekanntmachung tightened formatting
   requirements; pixel-accuracy matters.

---

## 8. How to resume after compact

If you (Claude or human) are picking up this work fresh:

1. Read this file top-to-bottom.
2. Check `git log origin/main..HEAD --oneline` to see if any sprints
   are committed locally but unpushed.
3. Check the `Backlog` section (§ 3) for the next Z-sprint not yet
   marked shipped.
4. Run `npx vitest run src/lib/trade src/lib/comply-v2/trade 2>&1 | tail -5`
   to confirm baseline test count.
5. Read the corresponding section in the research blueprint
   (`compass_artifact_*.md`) to refresh context on the next sprint's
   "why".
6. Implement the sprint. Update `Status snapshot` (§ 2) when shipped.
7. Move the sprint entry from `Backlog` to a new `Shipped` subsection
   in § 2.

Do not skip steps 1 and 5 — the strategic rationale is what makes
the implementation defensible.
