# Caelex Comply v2 — Compliance-Officer-Audit (Living Document)

**Status:** Aktiv · **Letztes Update:** 2026-05-08 (Batch UF44-45) · **Eigentümer:** Claude + Julian

> Living document — wird nach jedem implementierten Sprint upgedated.
> Überlebt Kontext-Kompression: alle Findings + Sprint-Mapping +
> Verifikations-Pfade dokumentiert. Wenn ein anderer Agent ohne
> Vorwissen den State braucht, liest er hier.

---

## 0. Zweck dieses Dokuments

Dieses Audit testet Caelex Comply v2 aus der Perspektive eines
**in-house Compliance Officers** bei einem **aktiven
Satellitenbetreiber** (3 LEO-Sats operational, 1 in Bau für Q4-Launch,
NIS2 essential entity, EU-Space-Act-Operator-Type SCO, DE-jurisdiziert).

**Ziel:** Identifizieren, was den Operator-Tagesablauf wirklich
broken/friction-laden/unmöglich macht — im Gegensatz zu Marketing-
Surfaces, die schon poliert wurden (UF1–UF25).

**Methodik:** 5 parallele Sub-Agent-Walkthroughs durch alle 30+
relevanten Pages, jede mit `file:line`-Referenzen. Synthese hier.

---

## 1. Tier-Klassifizierung

| Tier      | Bedeutung                                                             | Sprint-Effort       |
| --------- | --------------------------------------------------------------------- | ------------------- |
| **🔴 P0** | Bricht den daily workflow — Operator kann seinen Job NICHT machen     | 1-3 Tage pro Item   |
| **🟡 P1** | Friction — Operator kann den Job machen, aber mit erheblichem Schmerz | ~1 Sprint pro Item  |
| **🟢 P2** | Polish — kosmetisch, sichtbar aber nicht blockierend                  | 0.5 Sprint zusammen |
| **🔵 X**  | Cross-Cutting / Architektur                                           | Multi-Wochen-Sprint |

---

## 2. Score-Card pro Surface

| Surface         | Score | Top-Fix                                    |
| --------------- | ----- | ------------------------------------------ |
| Today (Inbox)   | 7/10  | P0-B (`window.prompt()`-Bug)               |
| Triage          | 5/10  | Keyboard verifizieren                      |
| Proposals       | 6/10  | 50-Cap (Pending) Pagination                |
| Notifications   | 6/10  | UF41 added severity + category filters     |
| Astra V2        | 5/10  | Scratchpad-Loss-Warning, Archive-Confirm   |
| Missions-Liste  | 3/10  | Search/Filter/Compliance-Score (P1-M1+M2)  |
| Mission-Detail  | 6/10  | Spacecraft-Detail-Page (P0-D)              |
| Mission Control | ?/10  | MissionControlView ungeprüft               |
| Ephemeris       | 7/10  | Pre-Launch-Sats unsichtbar (P1-M7)         |
| Sentinel        | 6/10  | Pro-Mission-Configuration (P1-S1)          |
| Posture         | 7/10  | Top-Risks-Card (P1-P1)                     |
| Modules-Index   | 3/10  | Brochure→Control-Panel (P1-P3)             |
| Article-Tracker | 6/10  | Notes/Assignee/Bulk (P1-T1+T2+T3)          |
| Documents       | 5/10  | Article-FK (P1-P4)                         |
| Regulatory-Feed | 7/10  | UF40+UF45 closed P1-P7+P1-P8               |
| Incidents       | 7/10  | UF28+UF44 closed P0-A+P1-H2; H1 detail TBD |
| NCA Portal      | 6/10  | Generate-Handoff (P1-H6)                   |
| Audit Center    | 8/10  | ZIP-Evidence-Bundling verifizieren         |
| Audit Log       | 8/10  | CSV-Export-Pagination (P1-H3)              |
| Audit Chain     | 7/10  | (kaum Mängel)                              |
| Network         | 6/10  | Activity-Feed-Filter (P1-S5)               |
| Trade           | 6/10  | UF39 verified Wave A + C live; nicht stub  |
| Digital Twin    | 7/10  | Optimizer-Cross-Link (P1-S8)               |
| Optimizer       | 5/10  | Auto-Profile (P1-S9)                       |
| Settings        | 6/10  | Holiday/Delegate (P1-S6)                   |
| Onboarding      | 6/10  | UF38: cap 50 + escape hatch; full P0-F TBD |
| Timeline        | 3/10  | Hardcoded Phases + Dead Buttons (P0-G)     |

---

## 3. P0 Findings — Workflow-Blocker (sofort fixen)

### P0-A — `Nis2PhaseSubmitDialog` ist orphaned in Incidents-Page

- **Wo:** `src/app/dashboard/incidents/page.tsx:1176-1199` (inline minimal-submit)
  vs. `src/components/dashboard/v2/Nis2PhaseSubmitDialog.tsx` (ungenutzte rich form)
- **Problem:** Der 24h-NIS2-Hot-Path nutzt eine bare-bones Inline-Submit-Variante
  (PATCH ohne Body-Content). Der reiche Dialog mit Statutory-Checklist + Per-
  Phase-Fields + NCA-Reference ist nicht importiert.
- **Reproduzieren:** Klick "Submit" auf Phase-Row → bare PATCH → keine
  statutory content gespeichert
- **Sprint:** UF28
- **Status:** ✅ Done (commit 678ef672 — Dialog wired with type-narrowed phase keys, listing-refresh on submit)

### P0-B — "Mark as attested" benutzt `window.prompt()`

- **Wo:** `src/components/dashboard/v2/ComplianceItemCard.tsx:225-256`
- **Problem:** Native Browser-Prompt für Evidence-Summary. Kein Upload, kein
  Co-Signer, kein Audit-Trail-Required-Field. <10 Zeichen silent abort ohne
  Toast. UI bricht Dark-Cinema-Design.
- **Reproduzieren:** Hover Item → `…` Menu → "Mark as attested" → Prompt
- **Sprint:** UF29
- **Status:** ✅ Done (commit 04ced89d — AttestModal + co-signer + notes + composed rationale)

### P0-C — Generate2Page ignoriert UF24-URL-Param `?mission=<id>`

- **Wo:** `src/components/generate2/Generate2Page.tsx` (zero `useSearchParams`)
- **Problem:** Mission-Detail "Generate report"-Button (UF24) linkt mit Param
  `?mission=<id>`, aber Generate2Page liest ihn nicht. UF24-Win ist fake.
- **Reproduzieren:** Mission-Detail → "Generate report" → Generate öffnet
  ohne Mission-Kontext
- **Sprint:** UF27
- **Status:** ✅ Done (commit 211f5926 — MissionContextBanner with loading/error/loaded states)

### P0-D — Kein Spacecraft-Detail-Page

- **Wo:** `src/app/dashboard/missions/[id]/page.tsx:584-637` (Spacecraft-Tabelle,
  keine Klick-Targets)
- **Problem:** Click auf Spacecraft-Namen tut nichts. Kein TLE-History, keine
  Compliance-State, keine Decommissioning-Plan pro Hardware. Bei Konstellationen
  kritisch.
- **Reproduzieren:** Mission-Detail → Spacecraft-Liste → Klick auf Sat-Name
- **Sprint:** UF33
- **Status:** ✅ Done (commit 2eec01c5 — server component with org-scope, mission assignments, debris assessments, roadmap card)

### P0-E — Trade-Module Counterparties + Operations sind Stubs

- **Wo:** `src/app/dashboard/trade/page.tsx:114` (`pointerEvents: none`)
- **Problem:** UF23 surfacted "Trade" in Sidebar; User landet auf Marketing-
  Roadmap. 2/3 der Sub-Module nicht implementiert (Counterparty-Screening
  OFAC/BIS/DDTC, Operations-Lifecycle Item×Counterparty×Route×License).
- **Reproduzieren:** Sidebar → Trade → 2 von 3 Cards `pointerEvents: none`
- **Sprint:** UF39 (verification)
- **Status:** ✅ Resolved (audit war veraltet — `pointerEvents: none` ist
  nicht mehr im Code; alle 3 Cards verlinken auf gelaufene Implementierungen:
  `trade/items/page.tsx`, `trade/counterparties/page.tsx` (17KB),
  `trade/operations/page.tsx` (27KB), je mit `[id]`-Detail-Pages und
  `/api/trade/{parties,operations}` API-Routes. Wave A + Wave C live.)

### P0-F — Onboarding-Wizard Cap auf 12 Spacecraft, kein TLE/CelesTrak-Pull

- **Wo:** `src/app/onboarding/OnboardingWizard.tsx:319` (`if (spacecraft.length >= 12) return`)
- **Problem:** Operator mit 50 Sats kann nicht onboarden. Kein CSV-Upload, kein
  CelesTrak-Pull, kein NORAD-ID-Bulk-Lookup.
- **Reproduzieren:** Onboarding starten → Spacecraft-Step → 12 Sats max
- **Sprint:** UF38
- **Status:** ✅ Done partial (commit 0d465c33 — Cap 12 → 50 + explanatory
  hint card "Operating a large constellation? Add a few representative sats
  here, then bulk-import via Settings → Spacecraft → Import (CSV) or via
  Sentinel agent (auto-syncs from CelesTrak NORAD)" appearing at ≥10. Bulk-
  import + CelesTrak-Pull selbst bleiben für später.)

### P0-G — Timeline-Page hat Hardcoded Phases + Dead Buttons

- **Wo:** `src/app/dashboard/timeline/page.tsx:161-223, 381, 386`
- **Problem:** `DEFAULT_MISSION_PHASES` ist `useState` ohne Setter. "Add Phase"
  und "Export" Buttons haben kein onClick. Demo-Reste in Production.
- **Reproduzieren:** `/dashboard/timeline` → "Add Phase" → kein Effect
- **Sprint:** UF30
- **Status:** ✅ Done (commit 4aee6ea0 — Demo-Banner + disabled buttons with explanatory tooltips)

---

## 4. P1 Findings — Workflow-Friction (1 Sprint pro Item)

### Article-Tracker (operative Hauptfläche)

| ID    | Was                                                             | File:Line                    | Sprint             | Status                                                                                                          |
| ----- | --------------------------------------------------------------- | ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| P1-T1 | Keine Notes inline (Schema hat sie, UI rendert nicht)           | `tracker/page.tsx:86-89`     | UF32               | ✅ Done (commit 0a5ce832 — ArticleNotesEditor)                                                                  |
| P1-T2 | Kein Assignee/Due-Date/Priority pro Article                     | `tracker/page.tsx:1328-1456` | später             | ⏳                                                                                                              |
| P1-T3 | Keine Bulk-Actions (51 NIS2-Items = 51 Klicks)                  | `tracker/page.tsx:1399-1435` | UF34               | ✅ Done (commit c599dea4 — checkbox + select-all + BulkActionsToolbar)                                          |
| P1-T4 | NIS2/Cyber/Debris Sub-Pages haben keinen Article-Detail         | `tracker/page.tsx:1640-1781` | später             | ⏳                                                                                                              |
| P1-T5 | Light-Mode-Kontrast-Bug (`rgba(255,255,255,0.96)` ohne theme)   | `tracker/page.tsx:599-632`   | später             | ⏳                                                                                                              |
| P1-T6 | V1↔V2 Vocabulary-Mismatch (Tracker-Statuses ≠ Posture-Statuses) | `tracker/page.tsx:237-249`   | später (X-1 below) | ⏳                                                                                                              |
| P1-T7 | Action-Items-Cap bei 20 ohne Pagination                         | `tracker/page.tsx:849`       | später             | ⏳                                                                                                              |
| P1-T8 | `expandedArticles` persistiert über Regulation-Switch           | `tracker/page.tsx:383-385`   | UF42               | ✅ Done (useEffect resets expandedArticles + selectedArticleIds + collapsedGroups on selectedRegulation change) |

### Missions-Domäne

| ID    | Was                                                              | File:Line                          | Sprint | Status |
| ----- | ---------------------------------------------------------------- | ---------------------------------- | ------ | ------ |
| P1-M1 | Missions-Liste hat kein Search/Filter/Sort                       | `missions/page.tsx:60-127`         | später | ⏳     |
| P1-M2 | Header-KPIs sind Counts, kein Compliance-Score                   | `missions/page.tsx:88-92`          | später | ⏳     |
| P1-M3 | Kein EU-Space-Act-Article-Status pro Mission                     | `missions/[id]/page.tsx:155-176`   | später | ⏳     |
| P1-M4 | StatsRow misst `roadmapProgressPct` (Schedule!) statt Compliance | `missions/[id]/page.tsx:454-527`   | später | ⏳     |
| P1-M5 | Kein Jurisdictional View pro Mission                             | `missions/[id]/page.tsx:155-176`   | später | ⏳     |
| P1-M6 | Kein Decommissioning-Workflow (nur Status-Toggle)                | Mission-Detail                     | später | ⏳     |
| P1-M7 | Pre-Launch-Sats unsichtbar in Ephemeris (no NORAD)               | `ephemeris/page.tsx:43-46`         | später | ⏳     |
| P1-M8 | `primaryEndUserCountryCode` nur Pattern, keine ISO-3166-Liste    | `MissionDetailActions.tsx:561-572` | später | ⏳     |
| P1-M9 | `authorityRefs` silently `slice(0,50)` ohne Warning              | `MissionDetailActions.tsx:485-491` | später | ⏳     |

### Posture / Modules / Documents / Feed

| ID    | Was                                                    | File:Line                             | Sprint       | Status                                                                                                                                                                                 |
| ----- | ------------------------------------------------------ | ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-P1 | Kein Top-Risks-Card auf Posture                        | `posture/page.tsx:106-167`            | UF35         | ✅ Done (commit ac0de037 — Top-5 urgent items inline, empty-state für 0 urgent)                                                                                                        |
| P1-P2 | V1↔V2 Score-Diskrepanz möglich, kein Reconciliation    | `posture/page.tsx:266-329`            | später (X-1) | ⏳                                                                                                                                                                                     |
| P1-P3 | Modules-Index ist Brochure (keine Live-Daten)          | `modules/page.tsx:173-192, 247-277`   | UF31         | ✅ Done (commit 325c0f68)                                                                                                                                                              |
| P1-P4 | Documents `regulatoryRef` Plain-Text statt Article-FK  | `documents/page.tsx:781-791, 635-639` | später       | ⏳                                                                                                                                                                                     |
| P1-P5 | "Renew" öffnet Upload-Modal cold ohne Pre-fill         | `documents/page.tsx:985-991, 889-894` | später       | ⏳                                                                                                                                                                                     |
| P1-P6 | Documents-Pagination cap bei 50                        | `documents/page.tsx:207-228`          | später       | ⏳                                                                                                                                                                                     |
| P1-P7 | Regulatory-Feed kein "Convert to ComplianceItem"-CTA   | `regulatory-feed/page.tsx`            | UF40         | ✅ Done (Forward-to-Inbox Button → POST /api/regulatory-feed/forward → erzeugt Notification + markiert Update als read; idempotent via entityType:"regulatory_update", entityId guard) |
| P1-P8 | Regulatory-Feed Module-Filter deckt nur 8/14 Module ab | `regulatory-feed/page.tsx:124-133`    | UF45         | ✅ Done (extended to 10 — added `cra` (eurlex-service tags it) + `regulatory`; now mirrors crawler MODULE_KEYWORDS)                                                                    |

### Daily-Driver

| ID    | Was                                         | File:Line                        | Sprint | Status                                                                                                       |
| ----- | ------------------------------------------- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| P1-D1 | Today buckets cap bei 25 pro Bucket         | `compliance-item.server.ts:1023` | später | ⏳                                                                                                           |
| P1-D2 | "This week" = 30d Cutoff, nicht Mon-Fri     | `compliance-item.server.ts:50`   | später | ⏳                                                                                                           |
| P1-D3 | `clearedToday` UTC-midnight (Timezone-Leak) | `compliance-item.server.ts:1061` | später | ⏳                                                                                                           |
| P1-D4 | Notifications: nur all/unread Filter        | `notifications/page.tsx:25`      | UF41   | ✅ Done (severity + category dropdowns; URL-mirrored; server-resolved category→type via NOTIFICATION_CONFIG) |
| P1-D5 | Astra V2 Scratchpad-Loss ohne Warning       | `astra-v2/page.tsx:38-41, 80-85` | UF36   | ✅ Done (commit ae3cc019 — beforeunload + visible amber banner)                                              |
| P1-D6 | Astra V2 Archive ohne Confirmation          | `astra-v2/page.tsx:122-128`      | UF36   | ✅ Done (commit ae3cc019 — 2-stage ArchiveConversationButton)                                                |

### Hot-Path

| ID    | Was                                                        | File:Line                       | Sprint   | Status                                                                                                          |
| ----- | ---------------------------------------------------------- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| P1-H1 | Keine `incidents/[id]/page.tsx` (nur Listing)              | Filesystem                      | später   | ⏳                                                                                                              |
| P1-H2 | Incidents-Page: kein Status-Filter trotz 6 Workflow-States | `incidents/page.tsx:139-146`    | UF44     | ✅ Done (workflow-state filter row in sidebar; API `workflowState` query param; Reported→Closed pipeline order) |
| P1-H3 | CSV-Export Audit-Log nur loaded rows (silent footgun)      | `AuditLogClient.tsx:195-235`    | später   | ⏳                                                                                                              |
| P1-H4 | Audit-Pack ZIP Evidence-Bundling unverifiziert             | `audit-center/page.tsx:288-290` | UF35 V-2 | ✅ Verified (R2-stream evidence/regulation/filename in /api/audit-center/export route.ts:155-184)               |
| P1-H5 | NCA Portal kein Inline-Reply                               | `nca-portal/page.tsx:339-388`   | später   | ⏳                                                                                                              |
| P1-H6 | Generate ↔ NCA-Portal-Handoff fehlt                        | Cross-page                      | später   | ⏳                                                                                                              |

### Side-Surfaces

| ID     | Was                                                           | File:Line                   | Sprint | Status                                                                                       |
| ------ | ------------------------------------------------------------- | --------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| P1-S1  | Sentinel-Agenten nicht pro Mission/Spacecraft konfigurierbar  | `sentinel/page.tsx:535-559` | später | ⏳                                                                                           |
| P1-S2  | Sentinel Evidence-Feed kein Search/Filter                     | `sentinel/page.tsx:638-644` | später | ⏳                                                                                           |
| P1-S3  | Sentinel 30s polling ohne Visibility-API-Pause                | `sentinel/page.tsx:172-209` | später | ⏳                                                                                           |
| P1-S4  | Network `dataRoomCount: 0`/`attestationCount: 0` hardcoded    | `network/page.tsx:479-480`  | UF43   | ✅ Done (read from `eng._count.{dataRooms,attestations}` — Prisma include was already there) |
| P1-S5  | Network Activity-Feed nicht pro Stakeholder gefiltert         | `network/page.tsx:501-512`  | später | ⏳                                                                                           |
| P1-S6  | Settings: kein Holiday/Delegate-Mode                          | Settings allgemein          | später | ⏳                                                                                           |
| P1-S7  | Settings: Billing-Folder ohne Nav-Eintrag (toter Pfad)        | `settings/page.tsx:128-239` | später | ⏳                                                                                           |
| P1-S8  | Digital Twin ↔ Optimizer keine Cross-Links                    | Beide Pages                 | später | ⏳                                                                                           |
| P1-S9  | Optimizer: kein Auto-Profile vom Onboarding                   | `optimizer/page.tsx:55-60`  | später | ⏳                                                                                           |
| P1-S10 | Optimizer: kein "Save Comparison" / "Generate Migration Plan" | Optimizer                   | später | ⏳                                                                                           |
| P1-S11 | Onboarding: kein Re-do nach Abschluss                         | `OnboardingWizard.tsx`      | später | ⏳                                                                                           |

---

## 5. P2 Findings — Polish (zusammen 0.5 Sprint)

| ID    | Was                                                                    | File:Line                        |
| ----- | ---------------------------------------------------------------------- | -------------------------------- |
| P2-1  | "spacecrafts"-Plural-Bug                                               | `missions/page.tsx:228`          |
| P2-2  | Datums ohne Locale                                                     | `missions/page.tsx:247, 257`     |
| P2-3  | Footer-Date ohne Year ("Overdue · 9 May")                              | `ComplianceItemCard.tsx:130-134` |
| P2-4  | Demo-Banner "7 mock items" hardcoded                                   | `today/page.tsx:325`             |
| P2-5  | `clearedToday = 4` hardcoded in Demo-Mode                              | `today/page.tsx:265`             |
| P2-6  | Snooze-Badge amber egal ob 1d oder 30d                                 | `ComplianceItemCard.tsx:332`     |
| P2-7  | Astra "ONLINE" ist nur env-check                                       | `astra-v2/page.tsx:157-161`      |
| P2-8  | Filter-Pill X-Click-Target zu klein                                    | `today/page.tsx:1112`            |
| P2-9  | Empty-Copy "Take a breath" unprofessionell                             | `today/page.tsx:436`             |
| P2-10 | Mission-Control hardcoded `bg-white dark:bg-dark-bg`                   | `mission-control/page.tsx:11`    |
| P2-11 | Boot-Screen Ephemeris pro Session ohne Skip                            | `ephemeris/page.tsx:122-127`     |
| P2-12 | `lookback_days=90` hartkodiert                                         | `ephemeris/page.tsx:144-150`     |
| P2-13 | `glassPanelLight/Dark` 3× kopiert (sollte glass-elevated Token sein)   | Cross-page                       |
| P2-14 | Trade-Items `inputStyle` `focusRingColor` (kein gültiger CSS-Property) | `trade/items/page.tsx:530`       |
| P2-15 | Modules CRA in `specialised`, sollte `core` sein                       | `modules/page.tsx:168`           |
| P2-16 | Modules Jurisdictions-Chips look-filterable but aren't                 | `modules/page.tsx:266-273`       |
| P2-17 | Tracker `STATUS_CONFIG` lowercase, Posture UPPERCASE                   | `tracker/page.tsx:237`           |
| P2-18 | Cap auf max-w-[1400-1600px] — Tablet portrait bricht                   | Cross-page                       |
| P2-19 | Triage Empty-Copy ironisch awkward                                     | `triage/page.tsx:59`             |
| P2-20 | Notifications "All caught up" lügt bei 200 read items                  | `notifications/page.tsx:82`      |

---

## 6. Cross-Cutting Concerns (Architektur, Multi-Sprint)

| ID      | Was                                                                                                           | Aufwand      | Status |
| ------- | ------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| **X-1** | V1↔V2 Vokabular-Migration: 4 separate Status-Sprachen (Tracker/Posture/Documents/RegFeed) auf eine kanonische | Multi-Wochen | ⏳     |
| **X-2** | Mobile-Strategy V2: 0/34 V2-Komponenten nutzen Breakpoints                                                    | Multi-Wochen | ⏳     |
| **X-3** | Document-Entity-Graph: Document↔Article↔Module↔Posture als FKs                                                | 1-2 Sprints  | ⏳     |
| **X-4** | Persona-Switch-UI in Settings (UF21 Server-Side da, UI fehlt)                                                 | 0.5 Sprint   | ⏳     |

---

## 7. Use-Case-Coverage-Matrix

| Use-Case (CO im Daily-Driver)              | Status | Bruchstelle                                              |
| ------------------------------------------ | ------ | -------------------------------------------------------- |
| Morgens 9h: "Was muss ich heute?"          | 🟢     | 25-Item-Cap pro Bucket, "This week"=30d misleading       |
| 23h: NIS2 Early Warning T-12h              | 🔴     | `Nis2PhaseSubmitDialog` orphaned (P0-A)                  |
| Mark item as ATTESTED                      | 🔴     | `window.prompt()` (P0-B)                                 |
| Quartals-CFO-Report                        | 🟡     | Manual stitching, kein Posture-PDF-Export                |
| Auditor: Art. 6 EU Space Act + Evidence    | 🟢     | 4-5 Klicks via Tracker → EvidenceDrawer                  |
| Insurance läuft in 30d ab                  | 🟡     | Visibility ja, "Renew" cold (P1-P5)                      |
| Neuer Sat im Oktober (PRE_LAUNCH)          | 🟡     | Status setzbar, Ephemeris-Forecast braucht NORAD = blind |
| Conjunction-Warning bei ICEYE-1            | 🔴     | Inkonsistent über Pages                                  |
| Bulk auf 12-Sat-Konstellation              | 🟡     | Bulk-Assign ✅, Bulk-Detach/Status ❌                    |
| End-of-Life Decommissioning                | 🔴     | Workflow fehlt komplett (P1-M6)                          |
| Audit-Pack-ZIP für Big4                    | 🟡     | Frontend claim's, Server-Code unverifiziert (P1-H4)      |
| Tamper-Verdacht Hash-Chain                 | 🟢     | Audit-Center → Verify → JSON-Result                      |
| Regulator: "Compliance changes 31.12.2025" | 🟡     | Date-Filter ja, CSV nur loaded rows (P1-H3)              |
| Lieferant aus China ECCN                   | 🟡     | Items ja, Counterparty STUB (P0-E)                       |
| DE→LU Verlegung simulieren                 | 🟡     | Twin ja, Optimizer ja, **keine Verkettung** (P1-S8)      |
| Vertretung im Urlaub                       | 🔴     | Kein Holiday/Delegate (P1-S6)                            |
| Neue NIS2-Anforderung im Feed              | 🔴     | Read-and-forget, kein "Convert"-CTA (P1-P7)              |

---

## 8. Sprint-Mapping (was wird wann gemacht)

| Sprint      | Items                                                                             | Status                                                                    |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **UF26**    | Living-Doc Erstellung (dieses Dokument)                                           | ✅ Done (commit 64cc64ab)                                                 |
| **UF27**    | P0-C — Generate2Page liest `?mission=<id>`                                        | ✅ Done (commit 211f5926)                                                 |
| **UF28**    | P0-A — Nis2PhaseSubmitDialog in incidents/page.tsx einbinden                      | ✅ Done (commit 678ef672)                                                 |
| **UF29**    | P0-B — AttestModal-Komponente (replace `window.prompt()`)                         | ✅ Done (commit 04ced89d)                                                 |
| **UF30**    | P0-G — Timeline-Page Cleanup                                                      | ✅ Done (commit 4aee6ea0)                                                 |
| **UF31**    | P1-P3 — Modules-Index Live-Daten                                                  | ✅ Done (commit 325c0f68)                                                 |
| **UF32**    | P1-T1 — Tracker Notes inline (P1-T3 Bulk deferred to UF33)                        | ✅ Done (commit 0a5ce832, Notes only — Bulk separated to UF33)            |
| **UF33**    | P0-D — Spacecraft-Detail-Page                                                     | ✅ Done (commit 2eec01c5)                                                 |
| **UF34**    | P1-T3 — Tracker Bulk-Actions (was P0-E, retasked)                                 | ✅ Done (commit c599dea4)                                                 |
| **UF35**    | P1-P1 — Posture Top-Risks-Card + V-2 verified                                     | ✅ Done (commit ac0de037)                                                 |
| **UF36**    | P1-D5 + P1-D6 — Astra footgun-prevention                                          | ✅ Done (commit ae3cc019)                                                 |
| **UF37**    | P2 Polish-Bundle (P2-1, P2-3, P2-9, P2-10, P2-14, P2-15, P2-19)                   | ✅ Done (commit 65127b08 — 7 of 20 P2 items)                              |
| **UF38**    | P0-F partial — Onboarding Cap 12→50 + Bulk-import escape hatch                    | ✅ Done (commit 0d465c33 — full TLE/CelesTrak-Pull später)                |
| **UF39**    | P0-E — Trade Counterparty/Operations (verification only)                          | ✅ Resolved — audit war veraltet, Wave A + C bereits live                 |
| **UF40**    | P1-P7 — Regulatory-Feed "Forward to Inbox" (re-frame ComplianceItem→Notification) | ✅ Done (forward API + 2-stage button, idempotent on entityType+entityId) |
| **UF41**    | P1-D4 — Notifications severity + category filters                                 | ✅ Done (URL-mirrored dropdowns; server-resolved category→type)           |
| **UF42**    | P1-T8 — Tracker `expandedArticles` regression on regulation switch                | ✅ Done (useEffect resets all 3 selection Sets on regulation change)      |
| **UF43**    | P1-S4 — Network engagement hardcoded counts                                       | ✅ Done (use `eng._count.{dataRooms,attestations}` from API)              |
| **UF44**    | P1-H2 — Incidents page workflow-state filter                                      | ✅ Done (sidebar row + API `workflowState` query param)                   |
| **UF45**    | P1-P8 — Regulatory-Feed module filter coverage (added `cra` + `regulatory`)       | ✅ Done (mirrors eurlex-service MODULE_KEYWORDS)                          |
| **(later)** | P0-F (full) — Onboarding Bulk-Spacecraft-Import + CelesTrak-Pull                  | ⏳ pending (escape hatch live in UF38; full impl deferred)                |
| **(later)** | P1-S6 — Holiday/Delegate-Mode (Settings)                                          | ⏳ pending                                                                |
| **(later)** | P2 Polish-Bundle Rest (P2-2, P2-7, P2-13, P2-17, P2-18, P2-20)                    | ⏳ pending (deferred — bigger or contested)                               |
| **(later)** | X-4 — Persona-Switch-UI in Settings                                               | ⏳ pending                                                                |
| **(later)** | X-1, X-2, X-3 — Architektur-Sprints                                               | ⏳ pending                                                                |

---

## 9. Verifikations-Checkliste (was muss aktiv überprüft werden)

| ID  | Was                                                                         | Wie verifizieren                                                                                                             |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| V-1 | Onboarding-Wizard 4 vs 6 Steps — Sub-Agent sah 4, UF6+UF8 sollten 6 ergeben | Read aktuelle main `OnboardingWizard.tsx` lines 32-45 (Header-Comment)                                                       |
| V-2 | Audit-Pack-ZIP enthält Evidence-Files?                                      | Read `/api/audit-center/export/route.ts` Format-zip-Branch komplett, prüfen ob R2-Files in den ZIP-Stream geschrieben werden |
| V-3 | Mission-Control-View                                                        | Read `MissionControlView`-Component-Source separat                                                                           |
| V-4 | Triage J/K/A/D-Keyboard                                                     | Read `TriageList`-Client-Island (nicht im Sub-Agent-Read-Set)                                                                |

---

## 10. Was schon gefixed ist (Reference)

Bereits in Production durch UF1-UF25:

| Audit-Finding                           | Sprint | Bemerkung                                                           |
| --------------------------------------- | ------ | ------------------------------------------------------------------- |
| Tooltips für opaque Terms               | UF1    | HelpTooltip + GLOSSARY                                              |
| NIS2-Submit-Dialog                      | UF2    | Dialog created BUT only wired in Mission-Detail (P0-A!)             |
| Module-Index-Page                       | UF3    | Aber: **brochure**, kein Control-Panel (P1-P3 offen)                |
| Today Getting-Started                   | UF4    |                                                                     |
| Help-Drawer                             | UF5    |                                                                     |
| Use-Case-Onboarding-Step                | UF6    | (V-1: Verifikation nötig)                                           |
| Score Anti-Gaming                       | UF7    | Trust-Indikatoren auf Posture                                       |
| Onboarding Operator-Type optional       | UF8    | (V-1: Verifikation nötig)                                           |
| Auditor Read-Only client                | UF9    | UI-Layer, server-side via UF21                                      |
| NIS2 Countdown Visual Escalation        | UF10   |                                                                     |
| Today Cross-Links + error.tsx           | UF11   |                                                                     |
| Org-Switcher in V2-Topbar               | UF12   | Visibility-Half von Multi-Tenant                                    |
| Incidents Phase-Banner + NCA-Disclaimer | UF13   | Banner-Visibility, aber **Submit-Dialog nicht eingebunden** (P0-A!) |
| Audit-Center As-Of-Picker               | UF14   | Time-Travel via Audit-Log                                           |
| Astra Persona-Awareness                 | UF15   | System-Prompt persona-aware                                         |
| Hash-Chain-Explorer surfaced            | UF16   |                                                                     |
| Audit-Pack-ZIP-Button                   | UF17   | Frontend ja, **Backend-Inhalt verifizieren** (V-2)                  |
| Investor Peer-Benchmark                 | UF18   |                                                                     |
| Evidence-Drawer per Article             | UF19   |                                                                     |
| Astra Confidence-Indicator              | UF20   |                                                                     |
| User.useCase Prisma + Server-RBAC       | UF21   |                                                                     |
| NIS2-Submit Idempotency                 | UF22   | TOCTOU-Race fixed                                                   |
| Operator-Routes in Sidebar              | UF23   | Generate, NCA Portal, Digital Twin                                  |
| In-Context Generate-Report Action       | UF24   | **Aber Generate ignoriert Param** (P0-C!)                           |
| Posture KPI Click-Through               | UF25   |                                                                     |

---

## 11. Bemerkenswerte Pattern-Findings

### Pattern A — Discoverability-Surgery dominiert

Mehrere "Audit-Findings" lösen sich über UI-Routing (UF16, UF17, UF23) —
das Feature war bereits implementiert, nur nicht erreichbar. Das deutet
auf einen systemischen Build-Engineering-Pattern hin: Backend-Features
werden ohne UI-Surface gemerged, dann später nachgezogen. **Empfehlung:**
"Keine Backend-Feature ohne sichtbare UI-Surface in derselben PR".

### Pattern B — Demo-Reste in Production

Mehrere "Production-Pages" enthalten hardcoded Demo-Werte:

- `today/page.tsx:265` — `clearedToday = 4`
- `today/page.tsx:325` — "7 mock items"
- `network/page.tsx:479-480` — `dataRoomCount: 0, attestationCount: 0`
- `timeline/page.tsx:161-223` — `DEFAULT_MISSION_PHASES` 2024-2050

**Empfehlung:** Storybook/Demo-Mode trennen von Production-State,
unverwechselbarer Demo-Banner über jedem Demo-Surface.

### Pattern C — Vokabular-Drift

4 separate Status-Sprachen (Tracker/Posture/Documents/RegFeed) sind
historisch gewachsen. Das ist X-1 Cross-Cutting — größter Tech-Debt-
Posten der Codebase aus Compliance-Officer-Sicht.

### Pattern D — Plural-Sprache fehlt

- "spacecrafts" (uncountable im Englischen)
- "1 spacecraft / 2 spacecraft" wäre korrekt
  **Empfehlung:** Lint-Regel oder i18n-Keys mit korrektem Plural-System.

### Pattern E — Mobile-First fehlt

Komplette Codebase ist desktop-first. Kein responsiver Sidebar-Collapse,
keine Touch-Targets, keine Off-Canvas-Pattern. Für NIS2-Hot-Path
(24h Early Warning, oft mobile) operativ relevant.

---

## 12. Schedule für Verifikation + Implementation

```
Phase 1 (jetzt):       UF26 — Living-Doc anlegen
Phase 2 (heute):       UF27, UF28, UF29, UF30, UF31 — P0+P1 Quick-Wins
Phase 3 (heute):       Verify V-1, V-2, V-3, V-4
Phase 4 (heute Push):  UF26-UF31 + Verifikations-Updates
Phase 5 (next batch):  UF32 (Tracker), UF33 (Spacecraft), UF34 (Trade),
                       UF35 (Onboarding), UF36-UF38 (rest)
Phase 6 (Multi-Wochen): X-1, X-2, X-3
```

---

## 13. Glossar

- **Compliance Officer (CO)** — In-house Verantwortlicher für regulatorische
  Compliance bei einem Operator. Persona unserer Tests.
- **Hot-Path** — Zeitkritische Workflow-Stelle (z.B. NIS2 24h Early Warning)
- **Stub** — Page existiert, aber Funktionalität fehlt (`pointerEvents: none`)
- **Brochure** — Page rendert statische Cards ohne Live-Daten
- **Orphaned** — Component implementiert, aber nicht importiert
- **TOCTOU** — Time-of-check-to-time-of-use Race-Condition

---

**End of Living Document.** Update this file after every implemented sprint
in section 4-5 (set Status to ✅) and section 8 (Sprint Mapping).
