# Comply Export-Control — Sprint Plan & Decision Lock

> **Operativer Sprint-Plan.** Strategisches Konzept liegt in
> [`docs/COMPLY-EXPORT-CONTROL-CONCEPT.md`](./COMPLY-EXPORT-CONTROL-CONCEPT.md).
>
> **For Claude after context-reset:** Dieses Dokument ist die einzige
> Source-of-Truth dafür, was als Nächstes zu tun ist. Read this first,
> dann die Konzept-Datei für strategischen Hintergrund.

**Status (auto-updated per commit):** Sprint B1 (Foundation) abgeschlossen. Bereit für Sprint B2 (Classification Reference Data).

---

## 1. Decision Lock (final, 2026-05-07)

Diese 8 Entscheidungen sind getroffen und werden NICHT mehr re-litigated.
Wenn der User sie ändern will, neue Plan-Datei.

| #   | Frage                 | Entscheidung                          | Konsequenz im Code                                                                                        |
| --- | --------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Pilot-Kunden?         | Keine, aber komplett bauen            | Bauen für generische AV-Persona, kein Scope-Cut. Piloten kommen, wenn fertig.                             |
| 2   | OpenSanctions-Lizenz? | **Niemals externe Kosten**            | Free-Stack: OFAC SDN + BIS + DDTC + EU FSF + UK OFSI + UN. Eigene Aggregations-Logik.                     |
| 3   | Two-Layer-Split?      | Akzeptiert                            | Layer 1 (Posture) bleibt EXPORT_CONTROL-RegulationKey. Layer 2 (Operations) neu unter `/dashboard/trade`. |
| 4   | Multi-Tenancy?        | Org-scoped                            | Alle Trade-Models haben `organizationId` als FK.                                                          |
| 5   | MVP-Persona?          | AV einer New-Space-Firma              | Solo-AV mit ≤5 Side-Reviewers. Keine Multi-Stage-Approval-Workflows.                                      |
| 6   | Verity-Anchoring?     | Keine externen Kosten                 | Bitcoin-Fee raus. AuditLog-Hash-Chain reicht. OpenTimestamps Calendar (free) vielleicht später.           |
| 7   | Reihenfolge?          | **Wave B zuerst** (Klassifikation)    | B → A → C → D.                                                                                            |
| 8   | BAFA-Auskunft?        | Erst LLM, BAFA-Validation kommt 2027+ | Klassifikations-Engine = Property-Trigger + LLM + Human-Approval, mit prominenten Disclaimern.            |

**Daraus abgeleitete Constraints:**

- Keine externen API-Calls in der Standard-Pipeline. OFAC/BIS/DDTC werden via offene URLs gepullt (kostenfrei).
- Keine Bitcoin/Crypto-Anchoring im MVP.
- Keine kommerziellen Datenlizenzen.
- Keine Klassifikations-Auto-Apply ohne Human-Approval.

---

## 2. Wave-Roadmap (revidiert)

```
┌─────────────────────────────────────────────────────────────────┐
│ Wave B — Item Classification + License Determination             │
│ ~8 Sprints                                                       │
│ Surface: /dashboard/trade/items                                  │
│ Output: Operator klassifiziert ein Hardware-Item, bekommt        │
│         strukturierten ECCN/USML/MTCR-Vorschlag mit Confidence.  │
│         License-Determination zeigt passende AGG/EUGEA/Einzel.   │
└────────────────────────────────────┬─────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Wave A — Sanctions Screening + Counterparties                    │
│ ~8 Sprints (Free-Stack only)                                     │
│ Surface: /dashboard/trade/counterparties                         │
│ Output: Operator screent eine potenzielle Counterparty gegen     │
│         OFAC + BIS + DDTC + EU FSF + UK OFSI + UN, sieht         │
│         50%-Rule-Cascade.                                        │
└────────────────────────────────────┬─────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Wave C — Operations Lifecycle + License Stack                    │
│ ~4 Sprints                                                       │
│ Surface: /dashboard/trade/operations                             │
│ Output: Operator legt eine TradeOperation an, verbindet Items +  │
│         Counterparties, durchläuft Lifecycle bis "executed".     │
└────────────────────────────────────┬─────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Wave D — Intangible / Cloud / Deemed Export                      │
│ Sprint-Anzahl unbekannt, später                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Wave B — Sprint-Liste

Jeder Sprint endet mit Commit. Push zu main alle 6-8 Sprints (CLAUDE.md
Batch-Deploy-Policy).

### Sprint B1 — Trade Foundation Spike (JETZT)

**Goal:** Datenfundament + Empty-State `/dashboard/trade`-Stub. Zero Features.
Pure Infrastruktur. User-Wert = 0. Risiko = sehr niedrig.

**Acceptance Criteria:**

- [ ] Prisma schema kompiliert mit neuen `TradeItem` + `TradeItemNote` Models.
- [ ] Audit-Action-Verbs + Entity-Types ergänzt.
- [ ] TS-Types in `src/lib/comply-v2/trade/types.ts` exportiert.
- [ ] `/dashboard/trade` Server-Component-Page rendert mit Apple-HIG-Empty-State.
- [ ] V2Sidebar zeigt neuen Nav-Eintrag "Trade" mit Globe2-Icon.
- [ ] Smoke-Test rendert die Page.
- [ ] `npx tsc --noEmit` 0 neue Errors auf geänderten Files.
- [ ] Existing 315 V2-Tests bleiben grün.

**Files to add/modify:**

```
~ prisma/schema.prisma
    + model TradeItem (full classification fields)
    + model TradeItemNote
    + enum TradeItemStatus
    + enum TradeClassificationSource

~ src/lib/audit.ts
    + AuditAction: trade_item_created, trade_item_classified,
                   trade_item_archived, trade_item_note_added
    + AuditEntityType: trade_item

+ src/lib/comply-v2/trade/types.ts
    Re-export of generated Prisma types for client use

+ src/app/dashboard/trade/page.tsx
    Server Component, force-dynamic, V2-only, auth gate,
    Apple HIG empty state with Globe2 icon

~ src/components/dashboard/v2/V2Sidebar.tsx
    Add nav item: { label: "Trade", href: "/dashboard/trade",
                    icon: Globe2 }

+ src/app/dashboard/trade/page.test.tsx (or smoke-only)
    Render test, redirect-on-no-session test
```

**Audit verbs detail:**

```ts
| "trade_item_created"
| "trade_item_classified"     // Klassifikation gespeichert
| "trade_item_archived"
| "trade_item_note_added"
```

**Audit entity types detail:**

```ts
| "trade_item"
```

**Time estimate:** ~2-3h Code, kein Pilot-Risiko.

---

### Sprint B2 — Classification Reference Data

**Goal:** Strukturierte Klassifikations-DB als TS-Files. Reine Daten, kein Code.
Layer für Sprint B3-B5.

**Acceptance Criteria:**

- [ ] EU Annex I Cat. 9 Sub-Items (Aerospace + Propulsion fokussiert) als TS-Datei.
- [ ] US CCL Cat. 9 (9A515.a/b/d/e/f/g/w/x/y) als TS-Datei.
- [ ] USML Cat. IV (Launch Vehicles, SLVs) + Cat. XV (Spacecraft) als TS-Datei.
- [ ] MTCR Annex Cat. I + II (9A101–9A121, 9A350) als TS-Datei.
- [ ] DE Anlage AL Teil I A/B (Aerospace-relevante Einträge + 1900er-Übergangskennungen) als TS-Datei.
- [ ] Cross-Reference-Map (welche EU/US/USML/MTCR/AL-Codes korrespondieren).
- [ ] Type-safe lookup-functions: `lookupECCN(code)`, `lookupUSML(category)`, etc.

**Files:**

```
+ src/data/trade/eu-annex-i-cat9.ts          (~500 LOC)
+ src/data/trade/us-ccl-cat9.ts              (~400 LOC)
+ src/data/trade/usml-cat-iv-xv.ts           (~400 LOC)
+ src/data/trade/mtcr-annex.ts               (~300 LOC)
+ src/data/trade/de-anlage-al.ts             (~400 LOC)
+ src/data/trade/cross-reference-map.ts      (~200 LOC)
+ src/lib/comply-v2/trade/classification-lookup.ts
+ tests for each lookup function
```

**Risk:** Daten-Genauigkeit. Mitigation: jede Datei zitiert die EUR-Lex /
eCFR / BAFA / MTCR-Quelle pro Eintrag. Fehler sind später korrigierbar
(es ist Daten, kein Schema).

**Time:** Größerer Sprint, ~6-8h. Eventuell auf B2a + B2b splitten.

---

### Sprint B3 — Property-Trigger Engine

**Goal:** Pure-Function Decision-Tree, der auf Item-Properties schaut und
hardcoded Klassifikations-Kandidaten liefert.

**Acceptance Criteria:**

- [ ] `applyPropertyTriggers(item: TradeItem): TriggeredClassification[]` pure function.
- [ ] Triggers:
  - `apertureMeters >= 0.5` → `USML XV(a)(7)(i)` (high confidence)
  - `rangeKm >= 300 && payloadKg >= 500` → `MTCR Cat. I` (high confidence)
  - `isRadHardened && countryOfOrigin === "US"` → `9A515.a` candidate
  - `isMilSpec` → flag for Cat. IV review
  - ... etc. (full list in spec)
- [ ] Tests for jeden Trigger + edge cases.
- [ ] No LLM, no DB, no I/O.

**Files:**

```
+ src/lib/comply-v2/trade/property-triggers.ts
+ src/lib/comply-v2/trade/property-triggers.test.ts
```

---

### Sprint B4 — Astra Tool: classify_trade_item

**Goal:** LLM-vermittelte Klassifikation mit Property-Trigger-Override.
Schreibt Proposal, Human approves.

**Acceptance Criteria:**

- [ ] `classifyTradeItem` defineAction in `src/lib/comply-v2/actions/trade-item-actions.ts`.
- [ ] `requiresApproval: true` → schreibt AstraProposal.
- [ ] Astra-Tool registration in tool-definitions.ts.
- [ ] LLM-Output structured (Zod schema): suggestedECCN_EU, suggestedECCN_US, suggestedUSML, suggestedMTCR, confidence, reasoning.
- [ ] Property-Triggers (B3) ÜBERSCHREIBEN LLM-Vorschläge bei Konflikt — hardcoded > LLM.
- [ ] Audit verb `trade_item_classification_proposed`.
- [ ] Rate-limited via existing `comply_v2_action` tier.
- [ ] Tests: happy path, override-case, low-confidence-case.

**Files:**

```
+ src/lib/comply-v2/actions/trade-item-actions.ts
+ src/lib/comply-v2/actions/trade-item-actions.test.ts
~ src/lib/astra/tool-definitions.ts (register classify_trade_item)
~ src/lib/audit.ts (add new verb)
```

---

### Sprint B5 — De-Minimis + FDPR Calculator

**Goal:** Pure-function calculator für US-content-share + FDPR-trigger.

**Acceptance Criteria:**

- [ ] `calculateDeMinimis(items: TradeItem[], destinationCountry: string): { percent: number; threshold: number; exceeded: boolean }`
- [ ] Country-spezifische Schwellenwerte: 25% generell / 10% E:1+E:2 / 0% RU+BY+IR+CU+SY+Crimea+DNR+LNR+NK
- [ ] `evaluateFDPRTrigger(items: TradeItem[]): { triggered: boolean; reasons: string[] }`
- [ ] Tests für alle Country-Group-Permutationen.

**Files:**

```
+ src/lib/comply-v2/trade/de-minimis.ts
+ src/lib/comply-v2/trade/de-minimis.test.ts
+ src/lib/comply-v2/trade/country-groups.ts (consts: COUNTRY_GROUP_E1, E2, etc.)
```

---

### Sprint B6 — License-Determination Engine

**Goal:** Rule-based engine, die für ein Item + Empfangsland + End-Use
die passenden Lizenzen vorschlägt.

**Acceptance Criteria:**

- [ ] `determineLicenseStack(item, destinationCountry, endUse): LicenseRecommendation[]`
- [ ] AGG-Eligibility-Matrix (deutsche AGG Nr. 12, 13, 14, 16, 18-35, 36, 39, 42, 43, 44, 47).
- [ ] EUGEA-Eligibility (EU001-008).
- [ ] Catch-All-Engine: Art. 4 (WMD) / Art. 5 (Cyber-Surveillance) / Art. 9 (DE national §8 AWV) / Art. 10 (intra-EU sensitive) red-flags.
- [ ] Notification-Pflicht-Trigger (§8 AWV / Art. 5(2) 2021/821).
- [ ] Tests pro AGG + pro Country-Group.

**Files:**

```
+ src/data/trade/agg-matrix.ts        (~500 LOC strukturierte Daten)
+ src/data/trade/eugea-matrix.ts      (~200 LOC)
+ src/data/trade/catch-all-flags.ts   (~300 LOC red-flag library)
+ src/lib/comply-v2/trade/license-determination.ts
+ src/lib/comply-v2/trade/license-determination.test.ts
```

---

### Sprint B7 — `/dashboard/trade/items` UI

**Goal:** User kann Item anlegen, klassifizieren, klassifikations-Vorschlag
ansehen, approve/reject.

**Acceptance Criteria:**

- [ ] List-Page `/dashboard/trade/items` mit Filter (status, classification).
- [ ] Detail-Page `/dashboard/trade/items/[id]` mit:
  - Identity + Properties
  - Alle parallel-Klassifikationen (EU, US, USML, MTCR, AL)
  - Astra-Vorschlag-Surface (mit Confidence + Reasoning)
  - NextStep-Action-Panel (Sprint 10H pattern wiederverwenden):
    - "Classify with Astra" wenn DRAFT
    - "Approve classification" wenn classification proposal pending
    - "Add note" wenn classified
    - "Archive" wenn obsolete
  - Notes timeline (TradeItemNote)
- [ ] Apple-HIG-styling konsistent mit existierenden V2-Pages.

**Files:**

```
+ src/app/dashboard/trade/items/page.tsx
+ src/app/dashboard/trade/items/[id]/page.tsx
+ src/app/dashboard/trade/items/[id]/server-actions.ts
+ src/components/dashboard/v2/TradeItemList.tsx
+ src/components/dashboard/v2/TradeItemDetailPanel.tsx
+ tests
```

---

### Sprint B8 — Wave-B Integration Tests + Disclaimer Surface

**Goal:** End-to-end test + prominenter Compliance-Disclaimer auf jeder
Trade-Surface.

**Acceptance Criteria:**

- [ ] E2E-Test (vitest mit gemockten Astra-Calls): User legt Item an → Astra schlägt vor → Human approved → Audit-Eintrag korrekt.
- [ ] Disclaimer-Komponente (`<TradeComplianceDisclaimer />`) auf jeder /trade-Page sichtbar.
- [ ] CLAUDE.md / docs aktualisiert mit "Wave B is live".

**Files:**

```
+ src/components/dashboard/v2/TradeComplianceDisclaimer.tsx
+ tests/integration/trade-classify-flow.test.ts (or src/-co-located)
```

---

## 4. Wave A — Sprint Outline (kommt nach Wave B)

Nur grobes Outline, finalisiert wenn Wave B fertig.

| Sprint | Goal                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| A1     | Prisma: TradeParty + TradePartyOwnership + TradeScreeningResult                                       |
| A2     | OFAC SDN + BIS Entity List + DDTC Debarred Sync (Cron jobs, free pulls)                               |
| A3     | EU FSF + UK OFSI + UN Sync                                                                            |
| A4     | OpenSanctions-Frei-Equivalent: Eigene Aggregations-Logik (deduplicate identical entries across lists) |
| A5     | Fuzzy-Match-Engine (Jaro-Winkler + Levenshtein + Beider-Morse phonetic) + Snapshot-Hashing            |
| A6     | 50%-Rule-Cascade-Logic + Beneficial-Ownership-Graph-UI                                                |
| A7     | Astra-Tool `screen_trade_party` + Continuous-Monitoring-Cron                                          |
| A8     | `/dashboard/trade/counterparties` UI (List + Detail + Graph)                                          |

---

## 5. Wave C — Sprint Outline

| Sprint | Goal                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| C1     | Prisma: TradeOperation full + TradeOperationLine + TradeLicense full + lifecycle state machine |
| C2     | Operation Wizard `/dashboard/trade/operations/new` (5-step)                                    |
| C3     | Operation Detail Page mit NextStep-Action-Panel                                                |
| C4     | Document-Generation: BAFA-ELAN-K2 prefill + EUC PDF                                            |

---

## 6. Conventions (für Code-Konsistenz)

### File paths

- Server-only logic: `src/lib/comply-v2/trade/*.server.ts`
- Pure functions / shared types: `src/lib/comply-v2/trade/*.ts`
- Actions (defineAction): `src/lib/comply-v2/actions/trade-*-actions.ts`
- UI components: `src/components/dashboard/v2/Trade*.tsx`
- Pages: `src/app/dashboard/trade/**/*.tsx`
- Reference data: `src/data/trade/*.ts`
- Tests: co-located, `*.test.ts(x)`

### Naming

- Models: `Trade*` prefix (TradeItem, TradeParty, TradeOperation, TradeLicense, TradeScreeningResult, TradePartyOwnership, TradeItemNote)
- Audit verbs: `trade_<entity>_<verb>` (trade_item_classified, trade_party_screened)
- Audit entity types: `trade_<entity>` (trade_item, trade_party, trade_operation, trade_license, trade_screening)
- Astra tools: snake_case verbs (`classify_trade_item`, `screen_trade_party`)
- Action names: `<verb>-trade-<entity>` (`classify-trade-item`, `screen-trade-party`)

### Disclaimers (legal)

Jede Trade-Surface zeigt einen Disclaimer:

> "Caelex Comply Trade ist ein Compliance-Werkzeug, kein Counsel. Vor jeder
> Export-Entscheidung mit qualifizierter Exportkontroll-Rechtsberatung
> verifizieren. Verstöße gegen AWG/EAR/ITAR können zu Freiheitsstrafen bis
> zu 10/20 Jahren und Bußen bis zu 40 Mio. € (DE) bzw. USD 1 Mio. (US) führen."

### Audit-Pattern für jede Action

- `requiresApproval: true` für alle high-impact (classify, license-apply, block-party).
- Audit-Verb pro Action zwingend.
- Rate-Limit via `comply_v2_action` tier (default 30/min).

---

## 7. Status-Tracker (auto-updated commit-by-commit)

| Sprint | Status  | Commit        | Tests added               | Date       |
| ------ | ------- | ------------- | ------------------------- | ---------- |
| B1     | ✅ done | (this commit) | +4 (types: 3, sidebar: 1) | 2026-05-07 |
| B2     | pending | —             | —                         | —          |
| B3     | pending | —             | —                         | —          |
| B4     | pending | —             | —                         | —          |
| B5     | pending | —             | —                         | —          |
| B6     | pending | —             | —                         | —          |
| B7     | pending | —             | —                         | —          |
| B8     | pending | —             | —                         | —          |

(Update this table im selben commit, der den Sprint abschließt.)

---

## 8. Notes for Claude after context-reset

**Erste 3 Schritte nach Context-Reset:**

1. Read this doc (`docs/COMPLY-EXPORT-CONTROL-PLAN.md`) — gives roadmap + decisions.
2. Read `docs/COMPLY-EXPORT-CONTROL-CONCEPT.md` — strategic backdrop.
3. Read `git log --oneline -10` — see what's been committed.
4. Read the Status-Tracker (§7) above — find the first non-completed sprint.
5. Open the corresponding "Sprint Bx" section and execute its Acceptance Criteria.

**Hard rules (no exceptions):**

- No external API calls in production code paths (except free OFAC/BIS/DDTC/EU/UK/UN).
- No paid SaaS dependencies (no OpenSanctions, no Bitcoin-Anchoring).
- No classifications auto-applied without Human-Approval (use `requiresApproval: true`).
- No deploy without 6-8 sprints batched (CLAUDE.md policy).
- Apple HIG dark theme + Inter font on every UI surface.
- Every defineAction needs audit + rate-limit (CLAUDE.md compliance).

**If user asks "what's next":**

- Look at §7 status tracker, find next pending sprint.
- Show the Acceptance Criteria from §3 for that sprint.
- Wait for explicit "go" before coding (Konzept-vor-Code-Pattern).

**If user introduces a new constraint:**

- DO NOT silently change the plan. Update §1 Decision-Lock with the new constraint, document the implication, then proceed.

**If a Wave-A free-stack-source goes down (OFAC URL changes etc):**

- Add fallback in Wave A4 (data-source aggregation). Do NOT add a paid alternative without explicit user approval (decision #2).

---

## 9. Out of Scope (across all Waves)

Per Konzept § 9:

- AES/EEI Filing
- Customs/Tariff/HS-Code Lookup
- Preference Calculation
- Mass-Email-Marketing-Suppressions
- Generic-DPS-API
- OnPrem-Deployment
- Direct-BAFA-API-Submission (BAFA hat keine offene API)
- Direct-DDTC-DECCS-Submission
- Outbound-Investment-Screening (US E.O. 14105) — Wave Z
- KI-generierte Rechtsmemos

Wenn ein User das anfragt: höflich ablehnen, in `out-of-scope`-Backlog
notieren, weitermachen.
