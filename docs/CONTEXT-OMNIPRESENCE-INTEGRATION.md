# Kontext-Omnipräsenz — Integrations-Konzept für Caelex

> Einordnung: Dieses Dokument ist der **Bauplan**, wie wir das Research-Dokument
> "Kontext-Omnipräsenz für Caelex" (20-Produkt-Teardown) in die bestehende
> Caelex-Plattform integrieren, ohne existierende Nutzer zu brechen und
> ohne alles auf einmal umzubauen.
>
> **Kernaussage**: Caelex hat die Architektur für diese Redesign-Welle **schon
> zu 60% im Code** — insbesondere `OperatorProfile` als Prisma-Modell, Service
> und UI-Components. Was fehlt, ist die **Provenance-Schicht** und die
> UI-Promotion zum First-Class-Citizen. Die Integration ist daher eine
> **Evolution**, nicht ein Rewrite.

---

## 1. Executive Summary

Das Blackbox-Problem ist lösbar durch drei Schichten, die parallel auf
bestehender Infrastruktur aufgesetzt werden:

1. **Provenance-Tracking**: jeder Wert im System (Profile-Feld, Workflow-Step,
   Compliance-Score) bekommt eine Herkunfts-Spur, die bis zum Assessment
   oder User-Edit zurückverfolgbar ist. **Neu**: `DerivationTrace`-Tabelle
   - Cross-Reference-Felder.

2. **UI-Elevation**: das existierende `OperatorProfile` bekommt eine eigene
   Top-Level-Route `/profile` und wird zum sichtbaren Dreh- und Angelpunkt
   zwischen Assessment (upstream) und Workflows (downstream). **Neu**:
   Route + 5 Kern-Components (`FieldCard`, `CausalBreadcrumb`, `SidePeek`,
   `WhySidebar`, `TrustBadge`).

3. **Verity-Anbindung**: jede Profile-Version wird als Verity-Attestation
   signiert. Der Operator hat eine kryptografisch nachprüfbare Spur seiner
   Compliance-Annahmen über Zeit. **Baut auf**: bereits ausgelieferte
   Verity-Phase-2-Infrastruktur (Commit `e27e88d9` Regulator-Bundle).

Ergebnis: fünf der sechs Caelex-Grundfragen ("Warum bin ich hier / Worauf
basiert das / Was muss ich tun / Wo stehe ich / Was vergesse ich / Was
passiert, wenn ich's nicht mache?") werden an **jeder** UI-Stelle
beantwortet, ohne dass der Nutzer dafür klicken muss.

---

## 2. Ist-Zustand (was bereits im Code ist)

### 2.1 Assessment-Layer — reif

- **4 Wizards** live: `/assessment/eu-space-act`, `/assessment/nis2`,
  `/assessment/space-law`, `/assessment/unified`
- **Engines**: `engine.server.ts`, `nis2-engine.server.ts`,
  `space-law-engine.server.ts`, `unified-engine-merger.server.ts`
  — insgesamt ~3 000 LOC server-only TypeScript
- **Datenquelle**: 119 EU-Space-Act-Artikel, 51 NIS2-Requirements,
  31 Jurisdiktionen
- **Persistence**: Ergebnisse werden in `localStorage` + (auf
  Sign-Up) in mehrere Prisma-Modelle geschrieben. **Kritischer
  Schwachpunkt**: die Antwort → Profile-Feld → Workflow-Ableitung
  ist nirgends explizit als Trail persistiert. Sie läuft im Engine
  ab und wird verworfen.

### 2.2 Operator-Profile-Layer — 60% vorhanden, aber versteckt

- **Prisma-Modell**: `OperatorProfile` existiert (siehe
  `prisma/schema.prisma`, Organization-scoped)
  - Core Classification: `operatorType`, `euOperatorCode`,
    `entitySize`, `isResearch`, `isDefenseOnly`
  - Mission Profile: `primaryOrbit`, `orbitAltitudeKm`,
    `satelliteMassKg`, `isConstellation`, `constellationSize`,
    `missionDurationMonths`, `plannedLaunchDate`
  - Jurisdiction: `establishment`, `operatingJurisdictions`,
    `offersEUServices`
  - Metadata: `completeness` (0–1), `lastUpdated`, `createdAt`
- **Service-Layer**: `src/lib/services/operator-profile-service.ts`
  - Test-File
- **UI-Components**: `src/components/dashboard/OperatorProfileCard.tsx`,
  `src/components/dashboard/OperatorProfileEditor.tsx`
- **Route**: keine eigene. Das Profile erscheint nur als Card im
  Dashboard und als Editor-Modal an ein paar Stellen. **Das
  Blackbox-Problem beginnt genau hier**: der Nutzer kann das
  Profile schwer erreichen und sieht nie den Zusammenhang zu seinen
  Workflows.

### 2.3 Workflow-/Modul-Layer — reif, aber ohne sichtbare Profile-Verknüpfung

- 14 Dashboard-Module unter `/dashboard/modules/*` — authorization,
  cybersecurity, debris, environmental, export-control, insurance,
  nis2, registration, supervision, copuos, spectrum, uk-space,
  us-regulatory, cra
- Jedes Modul liest **implizit** aus `OperatorProfile` + Organization +
  Spacecraft — aber im UI gibt es keine Indikation, welches
  Profile-Feld welche Modul-Entscheidung getrieben hat.
- 15. Modul (Digital Twin) und Evidence-Layer arbeiten quer.

### 2.4 Verity-Layer — bereits integrierbar

- Phase-2 komplett live inkl. W3C-VC, Merkle-Log, Consistency-Proofs
- **Regulator-Bundle-Export** (`e27e88d9`) bündelt bereits Attestations
  - VCs + STHs — ideal, um später das Operator-Profile als
    signed-contract einzubinden ohne neue Crypto-Arbeit.

### 2.5 Design-System-Grundlage — teilweise vorhanden

- Dashboard hat Dark-/Light-Mode, Tailwind, Lucide, glass-surface-
  Klassen (siehe CLAUDE.md Liquid-Glass-System)
- Atlas-Comparator hat bereits Sticky-Glass-Panels (Commit `075b4351`)
- **Fehlt**: konsistente Tokens für die 4 Trust-Layer, keine
  Causal-Breadcrumb-Component, keine Side-Peek-Component, kein
  globales Why-Sidebar-Pattern.

---

## 3. Zielbild

### 3.1 Das "Provenance-Atom"

Jeder Wert in Caelex ist ein **Provenance-Atom**:

```
Wert = {
  value:        <der eigentliche Inhalt>,
  origin:       "assessment" | "ai-inferred" | "user-asserted"
                | "external-import" | "regulatory-derivation",
  source:       <zB. Assessment-Q-ID, User-ID, AI-Model-Version>,
  confidence:   <0..1, nur bei ai-inferred>,
  derivedAt:    <ISO timestamp>,
  expiresAt?:   <ISO, optional, für zeitgebundene Werte>,
  downstream:   [<IDs von Entities, die diesen Wert konsumieren>]
}
```

Jedes Prisma-Feld, das heute einfach ein `String` ist, erhält eine
Begleit-Zeile in einer neuen `DerivationTrace`-Tabelle. **Kein Eingriff
in die bestehenden Spalten**, nur Anbau.

### 3.2 Die vier durchgängigen UI-Komponenten

An jeder Caelex-Seite:

1. **Causal Breadcrumb** unter Page-Title (`⟵ weil`-Separator,
   Type-Icon pro Crumb, Hover-Preview, Sibling-Dropdown)
2. **Side-Peek** (400–640 px, rechts, resizable) als Default für
   Detail-Ansichten — ersetzt 80 % der heutigen Modals
3. **Why-Sidebar** (280–320 px, rechts, `⌘I` Toggle) mit Tabs
   `Sources / Confidence / Edits / Downstream / History`
4. **Command-K** (global, kontextaware Results, @-Scope-Prefixes)
   — teilweise schon als `CommandPaletteModal` vorhanden, braucht
   Scope-Prefix-Update

### 3.3 Die Journey in 3 Stufen

```
ASSESSMENT                OPERATOR PROFILE           WORKFLOWS (Module)
──────────────            ────────────────           ────────────────────
4 Wizards                 /profile (NEU)             14 Module-Pages
  + Pre-Filter                                         + Causal Breadcrumb
  + Impact-Panel                                       + Profile-Pills
  + Uncertainty-Dropdown  • First-Class Route         + Readiness-Cards
  + Auto-Save              • Field-Tree (260 px)      + Why-Sidebar
                           • Field-Table (mittel)     + Rule-Citations
↓ populates              ↓ reads
                           • Why-Sidebar (320 px)
                           • "Freeze"-Button
                             → Verity-Snapshot
                           • Version-History
                             (Diff-View)
```

Die drei Stufen sind die gleiche Architektur mit unterschiedlicher
Dichte. Der Nutzer lernt Side-Peek + Causal-Breadcrumb einmal und
kann überall anwenden.

### 3.4 Das Profile als signierter Vertrag (Verity-Integration)

Bei jedem `Freeze Profile`-Klick:

1. Aktuelle Profile-Values + alle `DerivationTrace`-Einträge →
   canonicalisiert
2. Ed25519-signiert mit dem existierenden Verity-Issuer-Key
3. In `VerityLogLeaf` als Attestation-Leaf angehängt
4. Die nächste Cron-Tick-STH inkludiert sie automatisch
5. Der Operator kann über `POST /api/v1/verity/bundle/export` ein
   Bundle generieren, das _inklusive Profile-Snapshot_ an den
   Regulator geht

**Strategische Bedeutung**: Caelex ist das einzige GRC-Tool, das
seine Compliance-Annahmen kryptografisch versiegelt. Kein
Wettbewerber (Vanta, Drata, Secureframe) hat diese Infrastruktur.

---

## 4. Gap-Analyse — was wir neu bauen müssen

| Kategorie         | Existiert                                                       | Neu zu bauen                                                                                                |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Daten**         | OperatorProfile (Prisma), Assessment-Engines, Verity-Log        | `DerivationTrace`-Modell (Prisma), Profile-Snapshot-Signing-Helper                                          |
| **Service**       | operator-profile-service.ts, verity/bundle-builder.ts           | `derivation-tracker.server.ts` (hooks in jede Write-Operation), `profile-freeze.server.ts`                  |
| **Routes**        | /assessment/_, /dashboard/modules/_                             | `/profile` (Top-Level), `/profile/history`                                                                  |
| **Components**    | OperatorProfileCard, OperatorProfileEditor, CommandPaletteModal | `FieldCard`, `CausalBreadcrumb`, `SidePeek`, `WhySidebar`, `TrustBadge`, `ImpactPanel`, `DiffView` (8 neue) |
| **Design-Tokens** | Liquid-Glass-System, dark/light                                 | Trust-Encoding (4 Varianten), Confidence-Ampel (3 Stufen), Mode-Banner-States (3)                           |
| **i18n**          | DE + EN in /lib/i18n                                            | +~30 Keys (profile._, why._, trust.\*)                                                                      |

**Gesamt-Aufwand-Schätzung**: 5–7 Wochen für ein 1-Entwickler-Team,
parallelisierbar auf 3–4 Wochen bei 2 Devs (UI + Data in parallel).

---

## 5. Integrations-Strategie — 6 Phasen

Jede Phase ist **produktiv deploy-bar**. Kein Big-Bang. Existierende
User sehen bis Phase 3 keinerlei Veränderung; ab Phase 4 kommt die
sichtbare Transformation.

### Phase 1 — Provenance-Foundation (Woche 1)

**Ziel**: `DerivationTrace`-Tabelle + Write-Hooks. Kein UI-Change.

- Neues Prisma-Modell:
  ```
  DerivationTrace {
    id, entityType ("profile" | "workflow" | ...),
    entityId, fieldName,
    origin, sourceRef (nullable JSON: assessmentQId, userId, ...),
    confidence (nullable), derivedAt, expiresAt (nullable)
  }
  ```
- Write-Hook via neuen Wrapper `derive(field, value, origin, source)`
  der sowohl das Original-Feld schreibt als auch eine Trace-Row anlegt
- Migration: einmaliger Backfill-Job der für alle existierenden
  `OperatorProfile`-Felder einen Trace-Eintrag `origin: "legacy-migration"`
  erzeugt — damit alt-Nutzer nicht leere Provenance-Anzeigen sehen
- Tests: Engine-Funktionen die schreiben (`calculateCompliance`, etc.)
  müssen Hook aufrufen

**Deploy-fähig**: ja. Null UI-Impact.

### Phase 2 — Design-Tokens + Primitive Components (Woche 2)

**Ziel**: die 5 Kern-Components in `src/components/context/` anlegen,
in Storybook/Playground testen. Noch nicht in Live-Routes eingebaut.

- `FieldCard` — nutzt Trust-Tokens (4 Varianten)
- `CausalBreadcrumb` — rendert eine typisierte Kette
- `SidePeek` — resizable Drawer, ESC-close, Pin-Button
- `WhySidebar` — Tab-Container, `⌘I` Toggle, Context-aware via Prop
- `TrustBadge` — Icon + Label + Confidence-Dot

Tokens in `tailwind.config.ts` erweitern:

```
trust: {
  derived: { icon, bg, border, label },
  inferred: { ... },
  sourced: { ... },
  asserted: { ... }
}
confidence: { high, medium, low }
mode: { draft, filed, audit }
```

**Deploy-fähig**: ja. Komponenten liegen noch brach im Code, werden
ab Phase 4 eingebaut.

### Phase 3 — `/profile`-Route als First-Class-Citizen (Woche 3)

**Ziel**: neue Top-Level-Route mit Field-Tree + Field-Table +
Why-Sidebar. Feature-Flagged, damit Beta-User eingeladen werden können.

- Route: `src/app/dashboard/profile/page.tsx`
- Layout: Field-Tree links (260 px, Sektionen: Context / Mission /
  Jurisdiction / Safety / Comms / Personnel), Field-Table mittel,
  Why-Sidebar rechts (aus Phase 2)
- Jeder Field-Card rendert mit Trust-Badge aus `DerivationTrace`
- Downstream-Tab in Why-Sidebar zeigt gefilterte Liste der Workflows
  die das Feld konsumieren (Reverse-Lookup über Cross-Ref-IDs)
- Sidebar-Nav-Entry "Profile" sichtbar für Beta-User (Feature-Flag
  `FEAT_PROFILE_V2`)

**Deploy-fähig**: ja. Old UI (OperatorProfileCard) bleibt parallel
sichtbar. Beta-User erreicht.

### Phase 4 — Causal Breadcrumbs auf 2 Pilot-Modulen (Woche 4)

**Ziel**: das "aha-moment"-Pattern live in zwei Dashboard-Modulen
— Authorization + Cybersecurity. Alle anderen Module bleiben unverändert.

- In `/dashboard/modules/authorization/page.tsx` und `nis2/page.tsx`:
  Causal Breadcrumb einfügen, die aus `DerivationTrace` rückwärts
  bis zur Assessment-Antwort walked
- Inline-Pills auf jedem Workflow-Step: Rule-Citation + Profile-Feld
  (klickbar → öffnet Side-Peek mit dem jeweiligen Field)
- Readiness-Cards oben am Modul (Drata-Pattern): `Profile ✓ /
Regulatory ⚠ / Module ✓ / Approval ⏳`
- `⌘I`-Toggle öffnet Why-Sidebar mit `Sources / Rule / Dependencies`

**Deploy-fähig**: ja. User-Feedback aus diesen 2 Modulen steuert die
Rollout-Reihenfolge der anderen 12.

### Phase 5 — Profile-Snapshot-Signing + Verity-Bundle-Integration (Woche 5)

**Ziel**: die Differentiator-Schicht. Jedes `Freeze Profile` erzeugt
einen signierten Snapshot, der in den Verity-Log und in jedes
Regulator-Bundle fließt.

- Neue Server-Action: `freezeProfile(orgId)` → `ProfileSnapshot`-Entity
  mit canonicalized JSON + Ed25519-Signatur
- Hook in `bundle-builder.ts` (existierend): jedes Bundle bekommt
  optional `operatorProfile: ProfileSnapshot` als neues Top-Level-Feld
- UI: "Freeze Profile"-Button prominent auf `/profile`, daneben
  "Export Regulator-Bundle"
- `/profile/history`-Route: Diff-View zwischen zwei Snapshots

**Deploy-fähig**: ja. Setzt Phase-3-Profile-Route voraus.

### Phase 6 — Rollout auf alle 14 Module + Assessment-Impact-Panel (Wochen 6–7)

**Ziel**: das durchgängige Pattern. Jedes Modul-Page wie Authorization
in Phase 4, das Assessment bekommt Live-Impact-Panel.

- 12 restliche Module migrieren (copy-paste-Pattern aus Phase 4)
- Assessment-Seiten: Impact-Panel rechts der Question-Area, zeigt
  Live-Delta bei jeder Antwort ("+5 Controls aktiviert, 1 Framework ✓")
- `FEAT_PROFILE_V2`-Flag auf 100 %, alte `OperatorProfileCard`
  entfernt

**Deploy-fähig**: ja, stufenweise pro Modul.

---

## 6. Datenmodell-Änderungen (nur 2 neue Tabellen)

```prisma
model DerivationTrace {
  id          String   @id @default(cuid())
  entityType  String   // "operator_profile" | "workflow_step" | ...
  entityId    String   // FK-by-value
  fieldName   String   // z.B. "primaryOrbit"

  origin      String   // "assessment" | "ai-inferred" | "user-asserted" |
                       // "external-import" | "regulatory-derivation" |
                       // "legacy-migration"
  sourceRef   Json?    // z.B. { assessmentId, questionId } oder { userId, editedAt }

  value       String   // canonicalized value at derivation time
  confidence  Float?   // 0..1, only if origin = "ai-inferred"
  modelVersion String? // only if ai-inferred

  derivedAt   DateTime @default(now())
  expiresAt   DateTime?

  @@index([entityType, entityId])
  @@index([fieldName])
  @@index([derivedAt])
}

model ProfileSnapshot {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  canonicalJson  String   @db.Text  // canonicalized profile + trace
  snapshotHash   String   // SHA-256 over canonicalJson
  signature      String   // Ed25519 signature, hex
  issuerKeyId    String   // FK-by-value to VerityIssuerKey

  frozenAt       DateTime @default(now())
  frozenBy       String   // userId
  supersededBy   String?  // nullable FK to later snapshot

  @@index([organizationId])
  @@index([frozenAt])
}
```

Beide additiv. Kein Break an bestehenden Modellen. Keine Migration-Risiken.

---

## 7. Migrations-Strategie für bestehende Nutzer

### 7.1 Legacy-Trace-Backfill

Einmal-Job beim Deploy von Phase 1:

- Für jedes existierende `OperatorProfile`: erzeuge 1 `DerivationTrace`-
  Eintrag pro nicht-null Feld mit `origin: "legacy-migration"`,
  `sourceRef: null`, `derivedAt: OperatorProfile.lastUpdated`.
- Nutzer sehen ab Phase-3-Rollout "unknown origin"-Badges für diese
  Felder — aber sie sind nicht leer. Sobald Nutzer editiert, flippt
  das Feld auf `user-asserted`.

### 7.2 Feature-Flag-Rollout

- `FEAT_PROFILE_V2` default-off bei Phase-3-Deploy
- Manuell aktivierbar für Beta-Operators (~5 Organisationen)
- Nach 2 Wochen: Rollout 50 %, parallel alter Profile-Card sichtbar
- Nach weiteren 2 Wochen: 100 %, Alt-UI entfernt

### 7.3 Assessment-Replay (optional, Phase 5+)

Für Operators, die wollen: Button "Assessment neu abspielen & Profile
neu herleiten" — läuft Assessment-Antworten durch die aktuelle
Engine-Version, erzeugt frischen `DerivationTrace` mit `origin:
"assessment"`. So kann ein Nutzer Legacy-Migrations-Traces durch
saubere Assessment-Traces ersetzen.

---

## 8. Risiken + Mitigation

| Risiko                                                                      | Wahrscheinlich | Schwere | Mitigation                                                                                                                         |
| --------------------------------------------------------------------------- | -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `DerivationTrace` bloats die DB (viel Write-Traffic)                        | mittel         | niedrig | Retention-Policy (älter als 2 Jahre → archive), Index auf (entityType, entityId)                                                   |
| Bestehende Nutzer verwirrt durch neue /profile-Route                        | hoch           | niedrig | Feature-Flag, Beta-Kohorte, Tooltip "New" an Sidebar-Entry                                                                         |
| Why-Sidebar ist auf schmalen Viewports (<1280 px) unnutzbar                 | mittel         | mittel  | auto-collapse unter `lg:` Breakpoint, Button "Why?" öffnet Full-Screen-Modal als Mobile-Fallback                                   |
| Trust-Encoding-Farben kollidieren mit Status-Farben (green/amber/red)       | mittel         | mittel  | strenges Designtoken-System, Review mit einem Color-Blindness-Simulator, Icon + Label immer mit Farbe (nicht nur Farbe)            |
| Verity-Signing bricht, wenn Issuer-Key rotiert während `freezeProfile`-Call | niedrig        | hoch    | Transaction wrappt Key-Read + Sign + Write. Alte Snapshots bleiben verifizierbar (Key-History in `VerityIssuerKey.rotatedAt`)      |
| Der Mental-Model-Shift ist für bestehende User zu groß                      | mittel         | hoch    | In-App-Onboarding (3-Step-Tour: "Hier ist dein Profile", "Hier ist der Ursprung eines Felds", "Hier siehst du, was davon abhängt") |

---

## 9. Erfolgs-Metriken

Wie messen wir, ob das Redesign das Blackbox-Problem löst?

| Metrik                                                                    | Baseline (heute)              | Ziel (nach Phase 6)      | Messung                              |
| ------------------------------------------------------------------------- | ----------------------------- | ------------------------ | ------------------------------------ |
| **"Why?"-Click-Rate** auf einer zufälligen Workflow-Seite                 | 0 % (Feature existiert nicht) | ≥25 %                    | Analytics-Event `profile.why.open`   |
| **Profile-Edit-Rate** (Operators, die Profile-Felder manuell editieren)   | unbekannt, vermutlich <5 %    | ≥40 %                    | Analytics-Event `profile.field.edit` |
| **Time-to-first-Bundle-Export** nach Sign-Up                              | mehrere Tage                  | <30 Minuten              | Server-log timestamp diff            |
| **NPS auf die Frage "Verstehe ich, warum Caelex diese Workflows zeigt?"** | Baseline-Survey               | ≥+30 Punkte              | Quartals-Survey                      |
| **Support-Tickets** mit Phrase "woher kommt" / "warum"                    | Baseline 30 Tage              | −60 %                    | Zendesk/Linear-Label                 |
| **Profile-Freeze-Rate** (Operators, die Snapshot signieren)               | 0 (Feature neu)               | ≥1×/Quartal per Operator | DB-Query                             |

---

## 10. Was dieses Konzept bewusst NICHT adressiert

Im Sinne von "was bauen wir erst Phase 7+":

- **Mission-Visualisierung** (3D-Orbital-Regime-Diagramm statt
  Dropdown) — großer UX-Win, aber eigenes Design-Projekt
- **Graph-View** des Regulatory-Stacks — optional, wenn Daten > 500 Nodes
- **Time-Travel-Forecast** im Profile — wir haben den Forecast-Engine
  schon im Atlas-Comparator (`4539be78`), Migration ins Profile
  ist Phase-7-Feature
- **Multiplayer-Presence** (Live-Cursors, Follow-Mode) — B2B-Nice,
  aber nicht Differentiator
- **Mobile-Edit-Mode** — View-Only reicht für Phase-6-Rollout

---

## 11. Strategische Eckpunkte (für Investor-/Board-Stand)

- **Time-to-Ship**: 5–7 Wochen für ein 1–2-Personen-Team
- **Tech-Debt**: null. Alle Änderungen additiv, kein Breaking-Change
- **Budget**: 0 externe Dienste. Keine neuen npm-Abhängigkeiten
- **Wettbewerbsabstand**: weder Vanta, Drata, Secureframe noch
  OneTrust haben Provenance-Atome + Signed-Profile-Snapshots.
  Caelex ist damit das erste **AI-transparent** GRC-Tool, nicht nur
  AI-native
- **Verity-Synergie**: die bereits ausgelieferte Pillar-Infrastruktur
  (1.5, B.2, 4.5, 4.6, 5) wird wiederverwendet — kein Doppelbau
- **User-Migration-Risiko**: niedrig. Feature-Flag + Legacy-Migration-
  Backfill + 4-Wochen-Beta-Fenster

---

## 12. Nächste Schritte

Nach Freigabe dieses Konzepts:

1. **Phase-1-Plan als Detail-Plan** schreiben (konkrete File-Pfade
   - Prisma-Schema-Diff + Test-Suite)
2. **Design-Token-File** als erste greifbare Artefakt (`src/lib/design/
trust-tokens.ts`)
3. **In-App-Tour-Skript** für Beta-Rollout vorbereiten (3 Steps,
   jeder ≤60 Wörter)
4. **Messpunkt-Baseline** heute erheben, bevor Änderungen landen
   (Support-Tickets, Analytics-Events)

Die Phase 1 ist risiko-arm und kann parallel zum weiteren Konzept-
Feedback gestartet werden — der `DerivationTrace`-Backfill muss
sowieso passieren, egal wie die UI am Ende aussieht.

---

## Anhang — Mapping: Research-Prinzipien ↔ Phase

| Research-Prinzip              | Wird implementiert in                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Kontext-Quartett              | Phase 2 (Components) → Phase 3 (/profile) → Phase 4+6 (Module) |
| Provenance-Pflicht            | Phase 1 (Data) → Phase 3+4 (UI-Surface)                        |
| 4-Layer-Trust-Encoding        | Phase 2 (Tokens) → Phase 3+4 (Render)                          |
| Never-Commit-Without-Approval | Phase 5 (Diff-View + Profile-Freeze)                           |
| Mode-is-Sacred                | Phase 2 (Mode-Banner-Token) → Phase 3+ (Pages)                 |
| Scope-Before-Generate         | Phase 6 (Assessment-Impact-Panel + ASTRA-@-Mentions)           |
| Graceful-Degradation          | Phase 2 (Confidence-Ampel) → durchgängig                       |
| Rollen-adaptive Dichte        | Phase 6+ (Operator/Reviewer/Auditor-Toggle)                    |

Und die 10 Ergänzungen aus meiner vorigen Kritik:

| Ergänzung                               | Phase                                      |
| --------------------------------------- | ------------------------------------------ |
| Warum-jetzt-Dimension (Temporal)        | Phase 6 (Urgency-Chips auf Workflow-Cards) |
| Profile als signierter Vertrag (Verity) | **Phase 5**                                |
| Pre-Assessment Archetype-Screen         | Phase 7+                                   |
| Assumption-Cascade-Preview              | Phase 4 (inline im Modul-Page)             |
| Refuse-to-Answer als Feature            | Phase 6 (ASTRA-Integration)                |
| Space-native Visual-Mechanik            | Phase 7+ (Design-Projekt)                  |
| Regulator-Ready-Moment als Endgame      | **Phase 5** (Bundle + Profile kombiniert)  |
| Progressive User-Depth                  | Phase 7+ (User-Preference-Learning)        |
| Change-as-First-Class-Citizen           | Phase 7+ (Regulation-Change-Digest)        |
| Trust-Budget-Modell                     | Phase 7+ (Global-Counter + Review-Prompt)  |

Alles in 5–7 Wochen Kernarbeit (Phasen 1–6), der Rest ist Pflichttrieb
für Caelex 2.0.
