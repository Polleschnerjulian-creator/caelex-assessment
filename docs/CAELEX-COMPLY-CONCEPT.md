# Caelex Comply — Der ultimative Konzeptansatz

**Stand:** 2026-04-30
**Status:** Konzept · noch nicht implementiert
**Autor:** Julian Polleschner mit Claude Code (Opus 4.7, 1M context)
**Zweck:** Strategische Vision für Caelex Comply als bahnbrechende Komplettlösung. Basis für weitere Diskussion.

---

## Inhalt

1. [Die These in einem Satz](#these)
2. [Scope: nur Comply — Atlas und Pharos sind tabu](#scope)
3. [Rollback-Strategie: V1 bleibt parallel](#rollback)
4. [Ist-Zustand der Codebasis](#ist-zustand)
5. [Forschungsgrundlage — Patterns aus 13 Tech-Plattformen](#forschungsgrundlage)
6. [Das Atom — `ComplianceItem`](#atom)
7. [Die fünf Architekturebenen](#architektur)
8. [Die sieben Surfaces](#surfaces)
9. [AI-Native — die fünf Astra-Surfaces](#ai-native)
10. [Das Differenzierungs-Triangle](#differenzierung)
11. [Was wir explizit nicht bauen — Tar-Pit-Liste](#tar-pit)
12. [18-Monats-Roadmap](#roadmap)
13. [Pricing-Modell](#pricing)
14. [Drei strategische Entscheidungen](#entscheidungen)
15. [Anhang: Pattern-Library nach Quelle](#pattern-library)
16. [Anhang: Quellen & Referenzen](#quellen)

---

<a id="these"></a>

## 1. Die These in einem Satz

**Caelex Comply ist nicht "Drata für Space" — sondern das regulatorische Betriebssystem, in dem Operatoren, Anwälte, Behörden und Investoren auf einer einzigen lebenden Compliance-Wahrheit arbeiten, mit kryptographischer Verifizierbarkeit, AI als Substrat und live-physikalischen Signalen statt Checkboxen.**

### Warum das jetzt möglich ist

- **Die GRC-Kategorie hat keine Vision**: Gartner's 2025 GRC Magic Quadrant hat den Visionaries-Quadranten leer gelassen. Drata, Vanta, OneTrust konsolidieren — die Innovation-Lücke ist real und 18 Monate offen.
- **Auditoren vertrauen GRC-Daten nicht**: 82% der Organisationen haben innerhalb eines Jahres nach bestandenem Audit einen Data Breach. Das System ist Theater. Caelex's `Verity + Sentinel + Ephemeris` machen Compliance zum ersten Mal **beobachtbar** statt versichert.
- **Niemand bedient das Trio Operator/Counsel/Authority**: Existierende Tools haben "Auditor-View" + "Customer-View". Caelex's Schema hat bereits `OrganizationType: OPERATOR | LAW_FIRM | AUTHORITY | BOTH` codifiziert und Bridge-Models (`LegalMatter`, `OversightRelationship`, `StakeholderEngagement`).
- **Es gibt keine "Drata für Space"**: Slingshot Aerospace = Traffic. LeoLabs = SSA. Privateer = SSA. Epsilon3 = Mission-Ops. Keiner ist regulatory-compliance vertikal.

---

<a id="scope"></a>

## 2. Scope: nur Comply — Atlas und Pharos sind tabu

**Wichtigster Constraint dieses Re-Designs:** Es betrifft **ausschließlich Caelex Comply** (die Operator-Surface unter `/dashboard/*`). Atlas (Anwalts-Surface) und Pharos (Behörden-Surface) bleiben in Phase 0–4 **vollständig unangetastet**.

### Begründung

- **Atlas läuft produktiv für BHO Legal Pilot.** Persistierte Workspaces, 46 Jurisdiktionen mit prebuilt Embeddings, Team-Invites — bestehende Customer-Verträge.
- **Pharos ist 50 von 52 letzten Commits** — gerade in aktiver Beta-Stabilisierung mit BAFA / BNetzA / BSI Pilot-Targets.
- **Beide haben eigene UX-Sprache, eigene Akteurs-Farben, eigene Reife.** Sie zu "harmonisieren" wäre Mehrarbeit ohne Customer-Wert.
- **Marketing-Disziplin:** Der Re-Design heißt "Caelex Comply 2.0", nicht "Caelex 2.0". Atlas-Customer und Pharos-Pilot-Behörden sollen nicht denken, dass ihre Surface mit-rebrand-betroffen ist.

### TABU — wird in keiner einzigen Datei während Phase 0–4 angefasst

```
src/app/atlas/**                       # Atlas Routes
src/app/atlas-access/**                # Atlas Sales-Funnel
src/app/legal-network/**               # Anwalts-Marketing-Page
src/components/atlas/**                # Atlas Components
src/lib/atlas/**                       # Atlas Engines
src/lib/legal-network/**               # Matter-Service
src/data/atlas/**                      # Embeddings + Sources
src/data/legal-sources/**              # 46 Jurisdiktionen
src/app/api/atlas/**                   # Atlas APIs (43 Routes)
src/app/api/legal-network/**           # Matter APIs
src/app/api/atlas-access/**            # Booking
src/app/api/network/matter/**          # Matter sub-tree

src/app/(pharos)/**                    # Pharos Route-Group
src/app/pharos/**
src/components/pharos/**               # Pharos Components
src/lib/pharos/**                      # Pharos Engines
src/app/api/pharos/**                  # Pharos APIs
```

**Schema-Modelle, die nicht geändert werden:**
`AtlasWorkspace`, `AtlasWorkspaceCard`, `AtlasAnnotation`, `AtlasAlertSubscription`, `AtlasNotification`, `AtlasSourceCheck`, `LegalMatter`, `LegalAttorney`, `LegalEngagementAttorney`, `AuthorityProfile`, `OversightRelationship`, `AuthorizationApproval`, plus alle Pharos-spezifischen Modelle.

### FAIR GAME — Comply-Surface

```
src/app/dashboard/**                   # alle 96 Operator-Routes
src/components/dashboard/**            # Operator-Components
src/app/api/v1/compliance/**           # Compliance API
src/app/api/assessment/**
src/app/api/authorization/**
src/app/api/audit/**
src/app/api/dashboard/**
src/app/api/documents/**
src/app/api/incidents/**
src/app/api/notifications/**
src/app/api/timeline/**
src/app/api/tracker/**
```

### Neue, additive Bereiche (Comply-V2)

```
src/lib/ontology/**                    # NEU — Ontology Registry (Phase 1)
src/lib/actions/**                     # NEU — Action Layer (Phase 1)
src/components/v2/**                   # NEU — V2-Components (parallel zu v1)
src/components/ui/v2/**                # NEU — shadcn/ui Pattern parallel
src/app/dashboard/today/**             # NEU — Mercury-Inbox
src/app/dashboard/triage/**            # NEU — Linear-Triage
src/app/dashboard/review-queue/**      # NEU — Stripe-Radar-Queue
src/app/dashboard/lineage/**           # NEU — Score-Lineage
src/app/dashboard/proposals/**         # NEU — AstraProposal Queue
```

### Heikle Shared-Bereiche — Regeln

| Bereich                                                   | Regel                                                                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/*` (16 UI-Primitives, überall genutzt) | **Parallel-Set:** `src/components/ui/v2/*` neu mit shadcn/ui-Pattern. Bestehende Files bleiben byte-identisch. Atlas/Pharos importieren weiter aus altem Pfad.             |
| `src/lib/astra/*` (auch von Pharos-Astra benutzt)         | **Nur additive Änderungen.** Neue Files (`proposals.server.ts`, `ghost-text.server.ts`) okay. Bestehende `tool-definitions.ts` und `tool-executor.ts` bleiben unverändert. |
| `prisma/schema.prisma`                                    | **Nur additive Migrations.** Neue Models, neue Spalten mit Defaults. Keine Änderungen an bestehenden Atlas/Pharos-Models.                                                  |
| `src/app/layout.tsx` (Root)                               | **Wird nicht angefasst.** V1/V2-Switch lebt in `src/app/dashboard/layout.tsx` — Comply-spezifisch.                                                                         |

### Durchsetzung

Husky-Pre-Commit-Hook (`/.husky/pre-commit`) prüft staged Files gegen die TABU-Liste und blockt Commits, die Atlas/Pharos berühren. Override für legitime Cross-Cutting-Arbeit:

```bash
ALLOW_CROSS_SURFACE=1 git commit -m "..."
```

---

<a id="rollback"></a>

## 3. Rollback-Strategie: V1 bleibt parallel

**Drei Sicherheitsnetze:**

### 3.1 Code-Level — keine destruktiven Löschungen während Phase 0–4

- Alte Pages (`/dashboard/page.tsx`, alte Sidebar) bleiben byte-identisch im Repo
- Neue Pages bekommen neue Pfade (`/dashboard/today`, neue V2Sidebar)
- Erst nach Stabilitätsphase (Phase 5+) wird in einer separaten, klar revertierbaren Cleanup-PR V1-Code entfernt

### 3.2 Feature-Flag — `Organization.complyUiVersion`

```ts
Organization.complyUiVersion: "v1" | "v2"  // default "v1" während Bauphase
User.preferences.complyUiVersion: optional Override per User
URL-Param: ?ui=v1 oder ?ui=v2 für Quick-Test
```

**Wirkung:**

- `/dashboard/*` → respektiert das Flag, zeigt v1 oder v2
- `/atlas/*` → ignoriert das Flag komplett, zeigt unverändert Atlas
- `/pharos/*` → ignoriert das Flag komplett
- `/assure/*` → ignoriert das Flag

**Default-Sequenz:**

- **Phase 0–3 (Bauzeit, ~12 Wochen):** Default `v1`. V2 via Settings-Toggle aktivierbar (für willige Pilots).
- **Phase 3 fertig + stabil:** Default-Flip auf `v2` (eine Zeile Code). Alle sehen sofort die neue Welt.
- **Phase 5 fertig + 4 Wochen ohne Beschwerden:** Cleanup-PR entfernt V1-Code endgültig.

### 3.3 Git-Level — Phase-revertierbar

Jede Phase ist ein clean revertierbarer Branch-Merge:

```
phase-0-foundation       shadcn parallel + tokens-codemod (Comply only) + cmd-k
phase-1-architecture     ontology + actions (additive only)
phase-2-trust            proposals + approvals + purpose
phase-3-surfaces         today + triage + review-queue + lineage + audit-rebuild
phase-4-ai-substrate     ghost-text + autofill + ai-blocks + mcp-server
phase-5-polish           density + slides + method-docs
phase-6-ecosystem        api-versioning + integrations + sandbox
```

Wenn Phase 3 sich als Reinfall erweist:

```bash
git revert <phase-3-merge-commit>
```

→ alle neuen Surfaces sind weg, V2-Toggle zeigt Layout-Shell, V1 läuft normal weiter.

### 3.4 Datenbank — additive Migrations

- **Neue Tabellen:** `AstraProposal`, `ApprovalRule`, `Purpose`
- **Neue Spalten mit Default:** `Organization.complyUiVersion = "v1"`
- **Niemals** `DROP TABLE`, `DROP COLUMN`, `RENAME` während Phase 0–4

Bei Rollback bleiben zusätzliche Tabellen leer in der DB. Kein Schema-Rollback nötig. Kein Datenverlust-Risiko. Plus: **Neon Point-in-Time-Recovery** als ultimative letzte Linie.

---

<a id="ist-zustand"></a>

## 4. Ist-Zustand der Codebasis

### Reife pro Surface

| Surface                | Akteur                  | Reife                                    | Beleg                                                                                                                                                                                      |
| ---------------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Comply** (Dashboard) | Operator                | **8.5/10 produktionsreif**               | 96 Routes, 708 APIs, 47 Astra-Tools, 15 Compliance-Module, Sentinel-Evidence-Chain, Ephemeris 3D Fleet Twin, Optimizer, Digital Twin, Audit Center                                         |
| **Atlas**              | Law Firm                | **Beta-funktional, Production-Backbone** | 46 Jurisdiktionen, 8.8 MB prebuilt OpenAI-Embeddings, persistierte `AtlasWorkspace` + `AtlasAnnotation`, Public Share-Tokens, AI-Mode mit Hybrid-Search, Team-Invites                      |
| **Pharos**             | Authority               | **Beta — 50 von 52 letzten Commits**     | `/pharos/operators`, `/pharos/workflow`, `/pharos/approvals`, `/pharos/webhooks`, `/pharos/briefing`, `/pharos/transparency`, `/pharos/astra`. Auth-gated auf `OrganizationType.AUTHORITY` |
| **Assure**             | Operator-CEO → Investor | **Reif, 23 Pages**                       | RRS, RCR, Investor-Data-Rooms, Risk Register, Benchmarking, Investor-Relations-Tracking                                                                                                    |

### Strukturelle Schulden (verifiziert)

- **365 hardcoded `dark:`-Klassen** trotz definierter CSS-Var-Layer
- **927 arbitrary text-sizes** (`text-[14px]`) trotz definierter Token-Skala
- **96 Dashboard-Routen** ohne Information-Architecture-Hierarchie
- **448 Komponenten** dezentralisiert pro Feature
- **16 UI-Primitives** intern, kein shadcn/ui
- **Modul-orientierte Sidebar** statt Workflow-orientiert

### Visuelle Reife: 8/10

Liquid Glass + 3-Tier-Elevation + Pharos-Amber-Differenzierung sind state-of-the-art. Hier liegt nicht das Problem.

### UX-Architektur-Reife: 4/10

96 Routes, Modul-orientiert, kein Cmd-K, kein Today-Hub, keine zentrale Action-Surface, AI als Floating-Panel nicht Substrate.

---

<a id="forschungsgrundlage"></a>

## 5. Forschungsgrundlage — Patterns aus 13 Tech-Plattformen

| Domäne                 | Plattformen                                                                     | Kern-Pattern für Caelex                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Operativ-Plattform** | Palantir Foundry/Gotham/AIP                                                     | Ontology + Actions + Proposals + PBAC                                                                      |
| **Productivity**       | Linear, Notion, Vercel                                                          | Atom-basierte Architektur, Cmd-K, Block-Model, Trace-IDs                                                   |
| **Regulated FinTech**  | Stripe, Plaid, Mercury                                                          | Workbench-Audit, Radar-Review-Queue, Plaid-Link-Consent, Mercury-Inbox+Approvals, Bill-Pay-Email-to-Action |
| **AI-Native + Design** | Figma, Cursor, Raycast                                                          | Multiplayer-Canvas, Tab-Predictive-AI, Action-Panel, MCP-as-Server                                         |
| **GRC-Wettbewerb**     | Drata, Vanta, OneTrust, Hyperproof, Anecdotes, Hadrian, AuditBoard, Secureframe | Crosswalks, Audit-Hub, "Palantir for Space" Positioning, Hourly-Tests, Compliance-as-Code, Sovereign EU    |

Volltext der einzelnen Recherchen liegt in den Conversation-Transcripts vor und kann bei Bedarf in separaten Files extrahiert werden.

---

<a id="atom"></a>

## 6. Das Atom — `ComplianceItem`

Jedes State-of-the-Art-Tool hat **ein Atom**:

- Linear = Issue
- Notion = Block
- Vercel = Deployment
- Stripe = Resource
- Plaid = Item
- Palantir = ObjectType

**Caelex's Atom heißt `ComplianceItem`** — eine normalisierte Sicht über alle 10+ aktuellen `*RequirementStatus`-Tabellen (Cybersecurity, Debris, NIS2, Insurance, Environmental, Spectrum, ExportControl, Authorization, Supervision, COPUOS).

### Eigenschaften

```typescript
type ComplianceItem = {
  id: string;
  organizationId: string;
  regulationRef: string; // EU_SPACE_ACT | NIS2 | DE_SatDSiG | ...
  articleRef: string; // "Art.7", "§ 12 Abs. 2", ...
  jurisdictionScope: string[]; // ISO country codes
  status:
    | "PENDING"
    | "DRAFT"
    | "EVIDENCE_REQUIRED"
    | "UNDER_REVIEW"
    | "ATTESTED"
    | "EXPIRED";
  evidenceTree: Block[]; // Notion-style nested blocks
  attestations: VerityAttestation[]; // cryptographic proofs
  liveSignals: SentinelEvidence[]; // observable, not declared
  forecastSignals: EphemerisProjection[]; // future-state
  pinned: boolean; // Gotham-style "object of interest"
  watchers: User[]; // multiplayer presence
  links: Link[]; // graph edges to other ComplianceItems
};
```

### Konsequenzen

- **15 Module-Pages** werden **15 Filterregeln** über demselben Atom
- **47 Astra-Tools** werden **typisierte Operationen auf Atom**
- **`/dashboard/today`** wird Inbox: "ComplianceItems, die heute Aktion brauchen"
- **`/dashboard/triage`** wird Liste: "neue ComplianceItems aus externen Signalen"
- **Compliance-Score** wird Aggregation: `mean(status)` gewichtet nach criticality
- **API v1** wird CRUD: `GET /v1/compliance-items?regulation=eu-space-act&status=pending`

---

<a id="architektur"></a>

## 7. Die fünf Architekturebenen

```
┌────────────────────────────────────────────────────────────┐
│  1. ATOMS          ComplianceItem (+ Spacecraft, Document, │
│                    Stakeholder als verlinkte Objects)      │
│                    [Palantir Ontology + Linear Atom]       │
└────────────────────────────────────────────────────────────┘
                            ↑
┌────────────────────────────────────────────────────────────┐
│  2. ACTIONS        defineAction({name, schema, criteria,    │
│                    sideEffects, handler, requiresApproval}) │
│                    Einzige Mutationsschicht. Idempotenz.    │
│                    [Palantir Action + Stripe Idempotency]   │
└────────────────────────────────────────────────────────────┘
                            ↑
┌────────────────────────────────────────────────────────────┐
│  3. PROPOSALS      AstraProposal-Queue mit Decision-Log     │
│                    + ApprovalRule-Engine (stackable, Role-  │
│                    Placeholder)                             │
│                    [Palantir AIP Logic + Mercury Approvals] │
└────────────────────────────────────────────────────────────┘
                            ↑
┌────────────────────────────────────────────────────────────┐
│  4. SURFACES       Today / Triage / Workflows / Reference   │
│                    + Cmd-K Verb-Engine + Action-Panel       │
│                    + 3-Actor-Themes (Emerald/Cyan/Amber)    │
│                    [Linear + Mercury + Raycast + Pharos]    │
└────────────────────────────────────────────────────────────┘
                            ↑
┌────────────────────────────────────────────────────────────┐
│  5. PROOF LAYER    Verity-Attestations + Sentinel/Ephemeris │
│                    Live-Signals + Trace-IDs propagiert über │
│                    alle Mutations                           │
│                    [Stripe Workbench + Vercel Drains +      │
│                     Hadrian's "observable not declared"]    │
└────────────────────────────────────────────────────────────┘
```

### Layer 1 — Atoms (Ontology)

- `src/lib/ontology/types.ts` — Registry aus Prisma generiert
- Polymorphe Interfaces für die 10 Assessment-Models (`ComplianceAssessable`)
- Shared Properties + Links als first-class

### Layer 2 — Actions (einzige Mutationsschicht)

```typescript
defineAction({
  name: "submitNCASubmission",
  schema: z.object({ submissionId: z.string(), justification: z.string() }),
  criteria: ["OWNER", "ADMIN"],
  sideEffects: [notifyNCA, logToAuditChain, refreshScore],
  requiresApproval: true,
  handler: async (params, ctx) => {
    /* ... */
  },
});
```

- API-Routen werden Thin-Wrappers
- Astra-Tools auto-generiert aus Action-Registry
- ActionLog ersetzt freie Audit-Strings (Decision-Snapshot mit Parameter-Werten)

### Layer 3 — Proposals (Trust-Unlock für AI-Autonomie)

- `AstraProposal` Model mit Pending/Applied/Rejected
- Decision-Log dabei (welche Tool-Calls führten zur Proposal)
- ApprovalRules stackable: Threshold + Required-Approver-Role + Department-Lead-Placeholder

### Layer 4 — Surfaces (siehe Sektion 6)

### Layer 5 — Proof Layer

- Verity Ed25519-signed Certificates mit Public-Verify-Endpoint
- Sentinel Evidence-Hash-Chains
- Ephemeris Forecasting als Live-Compliance-State
- Trace-ID-Propagation: User-Click → Action → AuditLog → Notification → AstraMessage drill-downbar

---

<a id="surfaces"></a>

## 8. Die sieben Surfaces

### 6.1 `/dashboard/today` — Mercury-Inbox als Default-Landing

Statt 6 Charts: **Tasks für _diesen_ User**, gruppiert "Heute / Diese Woche / Beobachtet". Jeder Task hat eine 1-Klick-Action. Snooze als first-class Verb. Charts wandern nach `/dashboard/analytics`.

### 6.2 `/dashboard/triage` — Linear-Triage für externe Signale

Konsolidiert heute fragmentierte Streams (RegulatoryFeed, NCACorrespondence, SatelliteAlert, IncidentNIS2Phase, Notification) in **eine Inbox mit Single-Key-Disposition**:

- `1` accept → ComplianceItem erstellen
- `2` duplicate of existing
- `3` decline + Begründung
- `H` snooze 7 Tage

### 6.3 `/dashboard/workflows` — Stripe-Radar-Style Multi-Step-Surfaces

Authorization-Stepper, NIS2-Incident-Reporter, Investor-Dataroom-Setup, NCA-Submission-Builder als **Stepper-getriebene Workflows mit Approval-Gates** (Mercury-Style multi-party signoff).

### 6.4 `/dashboard/atlas` — Cursor/Figma-Synthesis: Regulation als Multiplayer-Canvas

**Die radikalste Surface.** EU Space Act, NIS2, National Laws gerendert als **lebende, multi-user-bearbeitbare Dokumente**:

- Jeder Article ist ein **Block** (Notion) mit Properties (Status, Evidence, Last-Reviewed)
- **Cursor-Tab-Pattern**: User klickt Article 7, beginnt zu tippen → Astra ghost-text-suggested die Antwort basierend auf Org-Profile → ein TAB akzeptiert
- **Figma-Multiplayer-Cursors**: Counsel und Operator sehen sich live, wenn beide am gleichen Article arbeiten
- **Mode-Switch (Figma Variables)**: Toggle "EU view" / "UK view" / "DE view" → derselbe Article zeigt jurisdiktionspezifische Variations
- **Vote-Mechanik (FigJam)**: Bei Disagreement zwischen Counsel + Operator über Compliance-Status anonymes Voting

### 6.5 `/dashboard/review-queue` — Stripe-Radar für Astra-Findings

Astra surfaced kontinuierlich Compliance-Gaps. Diese kommen in Single-Triage-List mit:

- **Risk-Insights-Panel**: Top 3 contributing factors
- **Related-Items-Panel**: gleiche Article, gleiche Regulation, gleicher Spacecraft
- **4 Fixed Actions**: Approve / Reject / Request Evidence / Refer to Counsel

### 6.6 `/dashboard/audit-center` — Stripe Workbench Reborn

Heute flat audit log. Wird zu Tab-Set:

- **Logs**: filterable by actor, entity, action, time, hash-chain status (J/K nav)
- **Webhooks**: `WebhookDelivery`-Status (Delivered/Pending/Failed) mit Retry-History
- **Inspector**: Click any audit row → JSON pane right + linked Prisma model state
- **Trace-Viewer**: Vercel-style trace propagation als drill-downbarer Pfad

### 6.7 `/dashboard/lineage` — Compliance-Score-Lineage als React-Flow-Graph

"78% Compliance kommt aus 4 Assessments → 12 Articles → 8 Evidence-Dokumenten → letzter Refresh vor 3h." Massive Trust-Win für Auditoren und NCAs.

### Plus: `Cmd-K` global

Auf jeder Page. Immer ein Tastendruck weg. Linear-Verb-Engine über alle Actions. Raycast-Action-Panel auf jeder List-Row.

---

<a id="ai-native"></a>

## 9. AI-Native — die fünf Astra-Surfaces

Cursor/Notion's wichtigste Lehre: **AI ist nicht ein Panel, AI ist verschiedene Surfaces**.

### 7.1 Surface 1: Inline Ghost-Text (Cursor Tab Pattern)

Bei jedem Form-Input, jedem Evidence-Notes-Editor, jedem Article-Answer:

- User beginnt zu tippen
- Ghost-Text erscheint (Astra-Vorschlag)
- TAB akzeptiert, weiter tippen rejected

Caelex's **physisch sichtbare AI** — überall, immer, ein Tastendruck.

### 7.2 Surface 2: Background Autofill (Notion AI Pattern)

Wenn neuer `Spacecraft` hinzugefügt wird:

- Astra inferiert Operator-Klassifikation, Jurisdiktion, applicable Regulations
- Erstellt vorgeschlagene ComplianceItems mit Status `DRAFT`
- User reviewt und akzeptiert/lehnt ab

### 7.3 Surface 3: AI Blocks (Notion + Palantir AIP)

Durable, re-runnable prompt-blocks pinned in ComplianceItem-Pages:

- "Re-generate gap analysis whenever evidence changes"
- "Summarize regulator correspondence weekly"
- Trigger-basiert, persistiert, evaluierbar

### 7.4 Surface 4: Caelex als MCP-Server (Figma Pattern)

**Radikalstes Differenzierungs-Asset.**

Statt Astra in Caelex zu integrieren, **Caelex selbst zum MCP-Server machen**. Externe AI-Tools (Cursor, Claude Code, ChatGPT, Warp) können Spacecraft, ComplianceItems, Atlas-Articles direkt lesen/schreiben.

Keine andere GRC-Plattform tut das. Compliance-Officer ist in Cursor, fragt: _"Generate an EU Space Act Article 7 evidence package for sat-23 based on its Sentinel telemetry"_ — Cursor ruft Caelex MCP auf, holt Daten, generiert Package, schreibt zurück.

### 7.5 Surface 5: AstraProposal-Queue (Palantir AIP Logic)

Hochrisiko-Actions (Submit-NCA, Approve-Authorization, Send-Stakeholder-Email) führt Astra **nicht direkt aus**, sondern erstellt eine Proposal mit Decision-Log. Mensch sieht Pending/Applied/Rejected. **Trust-Unlock für autonomere AI.**

---

<a id="differenzierung"></a>

## 10. Das Differenzierungs-Triangle

Drei Achsen, in denen kein Wettbewerber alle drei hat:

```
              Regulatorische
              Ontologie-Tiefe
              (119 Articles ×
              10 Jurisdiktionen ×
              Cross-References)
                    ▲
                    │
                    │     Hyperproof hat
                    │     Crosswalk, aber
                    │     keine Multi-Actor
                    │     keine Live-Signals
                    │
        ────────────●────────────
        ╱           │           ╲
       ╱            │            ╲
      ╱             │             ╲
     ╱              │              ╲
    ╱               │               ╲
   ╱                │                ╲
  ╱     Palantir    │      Hadrian    ╲
 ╱      hat Multi-  │     hat Live-    ╲
╱       Actor, aber │   Signals, aber   ╲
        keine Space-│   keine Multi-
        Vertikale   │   Actor / Onto
                    │
Multi-Stakeholder   ●   Live-Physical-Signals
(Operator + Counsel │   (Sentinel + Ephemeris
+ Authority +       │   + Verity Crypto-Proof)
Investor) auf       │
einer Quelle        │
```

**Caelex sitzt in der Mitte. Niemand sonst.**

### Vergleichsmatrix

| Achse                          | Drata/Vanta | OneTrust/AuditBoard | Hadrian | Palantir     | **Caelex**                     |
| ------------------------------ | ----------- | ------------------- | ------- | ------------ | ------------------------------ |
| Multi-Stakeholder (4 Actors)   | ❌          | ❌                  | ❌      | ✓ horizontal | ✓ **vertikal**                 |
| Regulatorische Ontologie-Tiefe | shallow     | shallow             | n/a     | extern       | ✓ **119 Art × 10 Juris**       |
| Live-Physical-Signals          | ❌          | ❌                  | ✓ Cyber | ❌           | ✓ **Sentinel+Ephemeris+Cyber** |
| Cryptographic Attestation      | ❌          | ❌                  | ❌      | ❌           | ✓ **Verity**                   |
| EU Sovereign Stack             | ❌          | hybrid              | ❌      | komplex      | ✓ **Neon EU + self-host**      |
| Authority-Side Tooling         | ❌          | ❌                  | ❌      | ❌           | ✓ **Pharos**                   |
| MCP-Server für externe AI      | ❌          | ❌                  | ❌      | ❌           | ✓ **roadmap**                  |

---

<a id="tar-pit"></a>

## 11. Was wir explizit nicht bauen — Tar-Pit-Liste

1. **OneTrust-Style universal workflow builder** — 9-Monate-3-FTE-Black-Hole. Caelex's Edge ist _opinionierte regulatorische Pfade_, nicht generische Workflow-Primitives.
2. **400+ generische SaaS-Integrationen** (GitHub/Slack/Okta-Evidence-Collectors) — Operator hat dafür Drata. Wir bauen **10 space-spezifische Integrationen**.
3. **Generische Risk-Register-Heatmaps** — AuditBoard/LogicGate haben Jahrzehnte. Caelex's Risks sind space-spezifisch (Collision, Debris, Fuel, Spectrum) und physik-modelliert.
4. **Auditor-Marketplace** — Drata/Vanta haben das. Wir **partnern** stattdessen mit Mayer Brown, White & Case, Bird & Bird.
5. **Literal Blockchain für Verity** — Auditoren wollen Ed25519-signed Certificates mit publishable Issuer-Keys. Bleibt boring und standards-based (X.509, Ed25519, RFC 6962 Merkle-Logs).
6. **Sync-Engine wie Linear** — Optimistic Updates auf 161 Models = Engineering-Monster. Wir nehmen das _Pattern_ (lokale Optimistic-Updates auf einzelne Properties), nicht die _Engine_.
7. **SOC 2 / ISO 27001 / TPRM** für Operator's IT — defer to Drata oder Secureframe; Caelex bietet Connector der deren Evidence ingested.
8. **Foundry Branching für Daten** — Git-Style-Branching auf Production-DB ist ein Engineering-Monster. Die abgeschwächte Form (Branch-Preview pro Edit) reicht.
9. **Slate als ganzer Widget-Builder** — wir brauchen kein No-Code-Tool. Wir brauchen Config-driven Module-Pages.
10. **Blueprint als Library** — Blueprint ist Apple-2015-Style. Wir behalten unser Liquid Glass + shadcn/ui. Wir stehlen nur die _Ideen_ (Density-Tokens, Callout-Pattern, Action-Bindings).

---

<a id="roadmap"></a>

## 12. 18-Monats-Roadmap

### Phase 0 — Foundation (Wochen 1-3)

- shadcn/ui + CVA + next-themes Migration
- Codemod: 927 arbitrary text-sizes → Token
- 365 hardcoded `dark:` → CSS-Var-Layer
- Tailwind v4
- Cmd-K palette mit allen aktuellen Routes als Verbs

**Liefert:** konsistentes Design-System, Schulden getilgt.

### Phase 1 — Architektur (Wochen 4-9)

- `src/lib/ontology/` aus Prisma generiert
- ComplianceItem als normalisierte Sicht über 10+ RequirementStatus
- `src/lib/actions/` als einzige Mutationsschicht
- ActionLog ersetzt freie Audit-Strings
- Astra-Tools werden aus Actions auto-generiert
- Trace-IDs propagieren über alle Mutationen

**Liefert:** konsistente Permissions, Audit, Schema. Ein Atom.

### Phase 2 — Trust & Autonomie (Wochen 10-13)

- AstraProposal-Model + `/dashboard/proposals` Queue
- `requiresApproval`-Flag pro Action
- ApprovalRule-Engine (stackable, Role-Placeholder à la Mercury)
- Purpose-Modell auf bestehende DataRoom-Tokens
- Compliance-Consent-Audit-Log

**Liefert:** Astra autonomer ohne Trust-Risiko. Three-Actor-Trust-Layer fertig.

### Phase 3 — Die neuen Surfaces (Wochen 14-19)

- `/dashboard/today` (Mercury-Inbox)
- `/dashboard/triage` (Linear-Triage)
- `/dashboard/review-queue` (Stripe Radar)
- `/dashboard/audit-center` Workbench-Rebuild
- `/dashboard/lineage` (React-Flow Score-Graph)
- Hyperproof Crosswalk-Pattern: "Sie sind 73% bereit für FR basierend auf DE-Assessment"
- Stripe Radar-Style Compliance-Rule-DSL

**Liefert:** 96 Routes kollabieren auf 7 prominente Surfaces.

### Phase 4 — AI als Substrate (Wochen 20-25)

- Inline Ghost-Text in allen Forms (Cursor Tab)
- Background Autofill für neue Spacecraft/Submissions
- AI Blocks (durable, re-runnable prompt blocks)
- Caelex MCP-Server (Figma-Pattern)
- Astra MultiPlayer-Cursors in Atlas-Surface
- @-mentions im Astra-Chat (`@article 7`, `@incident INC-23`)

**Liefert:** AI ist überall, niemals Panel. Cursor-für-Compliance.

### Phase 5 — Polish & Differentiation (Wochen 26-32)

- Pinned Objects Drawer (Gotham)
- Briefing Slides Drag-and-Drop für `/dashboard/generate`
- Density-Tokens (cozy/compact/dense)
- Bill-Pay-Style: `compliance@<org>.caelex.app` inbound
- Live-Multi-Player Atlas-Surface
- Caelex Method (linear.app/method-Style Manifesto-Docs)

**Liefert:** das "Wow" + Differenzierung gegen alle Wettbewerber.

### Phase 6 — Ecosystem (Monate 8-12)

- Stripe-Style API-Versioning (dated versions, backward compat)
- 10 space-spezifische Integrationen (CelesTrak, FCC IBFS, Space-Track, ITU SNS, EUSPA, OneWeb, etc.)
- "Compliance-as-Code" Export (Anecdotes-Pattern)
- Sandbox/Production Environments à la Plaid
- Caelex Sovereign SKU für Defense-Customers (on-prem K8s)

**Liefert:** Caelex als Plattform, nicht Tool. Ecosystem-Effekte.

**Gesamt: 32 Wochen Hauptarbeit (8 Monate) + 4 Monate Ecosystem = 12 Monate.**

---

<a id="pricing"></a>

## 13. Pricing-Modell

### Problem mit Wettbewerbern

Drata's Renewal-Schock (40-100% Hike, $7.5K → $20K für 2 zusätzliche Frameworks) ist der größte Reddit-Hass-Grund. Vanta gleich.

### Caelex-Modell

- **Per active satellite × per jurisdiction**, nicht per seat
- **Alle Frameworks inklusive** (EU Space Act, NIS2, COPUOS, ITAR/EAR, Spectrum, jurisdiktionale Space Laws — wir haben sie eh)
- **Counsel + Investor + Authority Seats sind frei** (sie sind Operator's Stakeholder, nicht zusätzliche Customer)
- **Pharos für Authorities ist kostenlos** (Distribution-Channel — wenn BAFA Caelex nutzt, will jeder DE-Operator auch drauf)

Macht Caelex **billiger pro Operator als Drata pro Org**, aber profitabler weil Operatoren mit 50+ Satelliten (Constellation-Era) der Standard werden.

### Beispiel-Tiers (initial Hypothese)

| Tier              | Active Satellites | Jurisdiktionen | Preis/Monat        |
| ----------------- | ----------------- | -------------- | ------------------ |
| **Starter**       | 1-5               | bis 2          | €2,500             |
| **Professional**  | 6-25              | bis 5          | €8,000             |
| **Constellation** | 26-100            | unlimited      | €25,000            |
| **Enterprise**    | 100+              | unlimited      | individuell        |
| **Sovereign**     | unlimited         | unlimited      | on-prem, 6-stellig |

---

<a id="entscheidungen"></a>

## 14. Drei strategische Entscheidungen

### Entscheidung 1: Linear-First vs. Bloomberg-Density?

**Optionen:**

- **Linear-First**: Default-View ist spacious (Counsel/Investor/CEO werden's lieben). Operator muss mit einem Klick auf Bloomberg-Tight wechseln (15 Module auf einem Screen).
- **Bloomberg-First**: Default-Tight für Power-User. Counsel braucht Switch.

**Vorschlag:** **Linear-First mit Density-Toggle**. Erste 1000 Users sind Counsel + CEOs in Pilot — die brauchen Linear-Spacious. Operator-Power-Users mit Density-Switch nachrüsten ist trivial.

### Entscheidung 2: MCP-Server: Phase 4 oder Phase 6?

**Optionen:**

- **Jetzt** (Phase 4): radikales Differenzierungs-Asset. "Caelex ist die einzige GRC-Plattform, die du in Cursor benutzen kannst." Massive PR-Story.
- **Phase 6**: nach Foundation. Sicherer, aber 6 Monate später am Markt.

**Vorschlag:** **Phase 4**. MCP-Spec ist jung, aber Anthropic + OpenAI sind committed. First-Mover-Vorteil ist massiv.

### Entscheidung 3: MCP-Pricing-Modell?

Wenn Cursor-User Caelex MCP benutzen — wer zahlt?

**Optionen:**

- **Org-basiert**: Org subscription, MCP-Zugang inkludiert.
- **Per-User**: Counsel-User in Org X bekommt MCP-Token, kann von eigenem Cursor zugreifen.

**Vorschlag:** **Org-basiert mit User-Tokens**. Wie GitHub OAuth-Apps: Org installiert MCP-App, vergibt Tokens per User, Audit-Log zeigt wer was wann.

### Weitere offene Fragen für die Diskussion

- **Modul-First vs. Workflow-First in der Sidebar**: Sanft (Module bleiben, Workflows zusätzlich) oder radikal (Module nur via Cmd-K + Reference-Tab)?
- **Astra-Position**: Floating-Panel oder Always-Visible Bottom-Bar?
- **Surface-Theme**: Auto via OrgType oder user-controlled?
- **Pharos-Sichtbarkeit auf Public-Site**: prominent als dritte Säule oder dezent?
- **Marken-Architektur**: "Caelex Comply / Caelex Atlas / Caelex Pharos" als Sub-Marken oder eigenständige Marken mit Caelex als "powered by"?

---

<a id="pattern-library"></a>

## 15. Anhang: Pattern-Library nach Quelle

### Palantir

- **Ontology-Registry** aus Prisma generiert
- **defineAction()** als einzige Mutationsschicht
- **AstraProposal/Approval-Queue** für High-Impact-Actions
- **Purpose-Based Access Control** statt RBAC
- **Workshop-Pages als JSON-Config** (Widget-Tree)
- **AI Tools = Ontology Actions** (gleiche Permission/Audit)

### Linear

- **Issue als Atom** (alles ist Filter/View darüber)
- **Cmd-K als Verb-Engine** (nicht nur Navigation)
- **Triage als separate Inbox** mit Single-Key-Disposition
- **Cycles als opinionierte Sprints**
- **Insights = Cmd+Shift+I** auf jeder gefilterten Liste
- **Method als Manifesto-Disguised-As-Docs**

### Notion

- **Block = Page = URL = Document** (rekursiv)
- **Database-Views als Projektionen** (Table/Board/Calendar/Gallery/Timeline)
- **Templates als first-class** (Schema + Initial-Block-Tree)
- **3 AI-Surfaces**: Inline / Autofill / AI-Blocks
- **Permissions als Inheritance** mit "highest rule wins"

### Vercel

- **Deployment als Atom**, Project als Aggregator
- **Scope-Switcher** (Team/Project/Time) als Top-Bar-Triple
- **Trace-IDs** propagieren über alle Events
- **AI Gateway Dashboard** als Prototype für AI-Observability
- **Drains** für Customer-Controlled Log-Sinks

### Stripe

- **Resource als Atom** mit stable ID + versioned Schema
- **Workbench**: Logs/Webhooks/Inspector mit J/K-Nav
- **Radar Review-Queue** mit Risk-Insights + Related-Items + 4 Fixed Actions
- **Radar Rules DSL**: `[action] if [condition]` + AI-Englisch→DSL + Backtest
- **Idempotency-Keys** auf jedem POST
- **Sigma**: SQL on production data, in-dashboard
- **Connect**: Multi-Tenant-Marketplace-Pattern
- **API-Versioning**: per-account dated versions

### Plaid

- **Item als Atom** (persistent connection user↔institution)
- **Plaid Link**: Pre-Flow → Consent → Scope-Chips (kein Toggling)
- **Returning-User-Experience**: OTP-only re-auth
- **Activity-Log Dashboard** mit 14 Tagen
- **Sandbox-First Development** mit `/sandbox/fire-cron`
- **Consent-Audit-Endpoint** als immutable Log

### Mercury

- **Task als Atom** (Inbox als Default-Landing)
- **Stackable Approval-Rules** + Role-Placeholder ("Department Lead")
- **Bill-Pay**: Email-PDF → OCR → Structured-Data → Approval-Flow
- **Custom Roles** (Approvals-only, View-Only, Accountant)
- **Treasury Rules Engine** (declarative cash management)

### Figma

- **Node-Tree** mit fractional indexing für conflict-free ordering
- **Multiplayer-Cursors** als first-class affordance
- **Variables × Modes** (gleiches Token, Kontext-aware)
- **Code Connect**: Design-System pinned to repo symbols
- **FigJam Voting** (anonymous, hidden until tally)
- **Figma als MCP-Server** für externe AI-Tools

### Cursor

- **Tab als primärer Input** (Ghost-Text Acceptance)
- **@-mentions** als strukturiertes Context-Injection (`@File`, `@Code`, `@Symbol`, `@Web`, `@Docs`)
- **`.cursorrules`** als per-project system prompt
- **Composer** für multi-file edits mit Diff-Preview
- **Gradient: Tab (suggest) → Composer (assert) → Background-Agents (autonomous)**

### Raycast

- **Command-Palette als Operating System**
- **Action-Panel auf jeder Liste** (`⌘K` öffnet contextuelle Verbs)
- **Aliases vs Hotkeys** (zwei Acceleration-Tiers)
- **Quicklinks** mit Parameter-Substitution
- **AI als named, hotkeyable verb** (nicht Conversation)
- **Extension = 1 TypeScript-File = 1 Command**

### Drata / Vanta / Hyperproof / Anecdotes / OneTrust / Hadrian

- **Audit-Hub** mit shared customer/auditor workspace (Drata)
- **Trust-Center** mit engagement analytics (Drata)
- **Crosswalk-Pattern**: ein Control → multiple Frameworks (Hyperproof) — **HÖCHSTER ROI-COPY-PATTERN**
- **Hourly automated tests** (Vanta) — wir haben Cron-Ergebnisse, surface them als Tests
- **Compliance-as-Code Export** (Anecdotes) — YAML/JSON specs
- **CTEM Validation Step** (Hadrian) — observable, not declared

---

<a id="quellen"></a>

## 16. Anhang: Quellen & Referenzen

### Palantir

- [Ontology Overview](https://www.palantir.com/docs/foundry/ontology/overview)
- [Action Types Overview](https://www.palantir.com/docs/foundry/action-types/overview)
- [Action Types Permissions](https://www.palantir.com/docs/foundry/action-types/permissions)
- [Action Log](https://www.palantir.com/docs/foundry/action-types/action-log)
- [AIP Logic](https://www.palantir.com/docs/foundry/logic/overview)
- [AIP Agent Studio Tools](https://www.palantir.com/docs/foundry/agent-studio/tools)
- [Workshop Widgets](https://www.palantir.com/docs/foundry/workshop/concepts-widgets)
- [Object Security Policies](https://www.palantir.com/docs/foundry/object-permissioning/object-security-policies)
- [Purpose-Based Access Controls](https://blog.palantir.com/purpose-based-access-controls-at-palantir-f419faa400b3)
- [Audit Log Categories](https://www.palantir.com/docs/foundry/security/audit-log-categories)
- [Foundry Branching](https://www.palantir.com/docs/foundry/foundry-branching/overview)
- [Apollo Introduction](https://www.palantir.com/docs/apollo/core/introduction)

### Linear

- [Linear Sync Engine Architecture](https://www.fujimon.com/blog/linear-sync-engine)
- [Reverse Engineering Linear's Sync](https://github.com/wzhudev/reverse-linear-sync-engine)
- [Linear Concepts](https://linear.app/docs/conceptual-model)
- [Triage Docs](https://linear.app/docs/triage)
- [Insights Docs](https://linear.app/docs/insights)
- [Linear Method](https://linear.app/method)

### Notion

- [Exploring Notion's Data Model](https://www.notion.com/blog/data-model-behind-notion)
- [Notion Building & Scaling Data Lake](https://www.notion.com/blog/building-and-scaling-notions-data-lake)
- [Notion AI FAQ](https://www.notion.com/help/notion-ai-faqs)
- [Database Templates](https://www.notion.com/help/database-templates)

### Vercel

- [Vercel Observability Docs](https://vercel.com/docs/observability)
- [AI Gateway Observability](https://vercel.com/docs/ai-gateway/capabilities/observability)
- [Vercel Drains](https://vercel.com/blog/introducing-vercel-drains)

### Stripe

- [Workbench: New Way to Debug](https://stripe.com/blog/workbench-a-new-way-to-debug-monitor-and-grow-your-stripe-integration)
- [Radar Reviews](https://docs.stripe.com/radar/reviews)
- [Radar Rules](https://docs.stripe.com/radar/rules)
- [Stripe Sigma](https://stripe.com/sigma)
- [Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [API Versioning](https://stripe.com/blog/api-versioning)

### Plaid

- [Inside the Design of Plaid Link](https://plaid.com/blog/inside-link-design/)
- [API Items](https://plaid.com/docs/api/items/)
- [API Consent](https://plaid.com/docs/api/consent/)
- [Sandbox Overview](https://plaid.com/docs/sandbox/)
- [Activity Logs](https://plaid.com/docs/account/activity/)

### Mercury

- [Managing Tasks in Task Feed](https://support.mercury.com/hc/en-us/articles/28769957843732-Managing-tasks-in-your-Task-Feed)
- [Multi-User Approval Workflows](https://mercurydocumentation.com/banking-multi-user-approval-workflows)
- [Bill Pay Overview](https://support.mercury.com/hc/en-us/articles/30472018752148-Bill-Pay-overview)
- [Mercury Treasury](https://mercury.com/treasury)

### Figma

- [How Figma's Multiplayer Technology Works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [How They Built the Plugin System](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)
- [FigJam as Coding Agent's Whiteboard](https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/)
- [Modes for Variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)

### Cursor

- [A New Tab Model](https://cursor.com/blog/tab-update)
- [How Cursor Serves Billions of Completions](https://blog.bytebytego.com/p/how-cursor-serves-billions-of-ai)
- [How Cursor Works Internally](https://adityarohilla.com/2025/05/08/how-cursor-works-internally/)

### Raycast

- [How Raycast API & Extensions Work](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- [Raycast AI Core Features](https://www.raycast.com/core-features/ai)
- [Quicklinks](https://www.raycast.com/core-features/quicklinks)

### GRC Wettbewerb

- [2025 Gartner GRC Magic Quadrant Analysis (Wheelhouse)](https://www.wheelhouseadvisors.com/risktech-journal/grc-without-visionaries-what-the-2025-gartner-magic-quadrant-reveals-about-the-future-of-risk)
- [Drata Audit Hub](https://help.drata.com/en/articles/6928357-auditor-experience)
- [Drata Trust Center](https://drata.com/products/trust-center)
- [Drata Pricing](https://soc2auditors.org/insights/drata-pricing/)
- [Vanta Agentic Trust Platform](https://www.businesswire.com/news/home/20251118962649/en/Vanta-Introduces-Agentic-Trust-Platform-to-Unify-Compliance-Risk-and-Security-Assessments)
- [Vanta-Riskey Acquisition](https://www.businesswire.com/news/home/20250717555906/en/Vanta-Acquires-Riskey-to-Transform-Vendor-Risk-with-Continuous-AI-Powered-Monitoring)
- [Hyperproof Crosswalks](https://hyperproof.io/resource/crosswalks-between-compliance-frameworks/)
- [OneTrust Review (Sprinto)](https://sprinto.com/blog/onetrust-review/)
- [Anecdotes Homepage](https://www.anecdotes.ai/)
- [Hadrian CTEM Framework](https://hadrian.io/blog/ctem-and-what-it-means-for-cyber-security)
- [Cybersierra: Why GRC Platforms Suck](https://cybersierra.co/blog/why-grc-platforms-fail-ciso-alternatives/)
- [Mayer Brown: Securing the Final Frontier](https://www.mayerbrown.com/en/insights/publications/2025/12/securing-the-final-frontier-cybersecurity-risk-regulation-and-compliance-trends-in-space-and-satellite-operations)

### Space-Spezifisch

- [European Commission EU Space Act](https://defence-industry-space.ec.europa.eu/eu-space-act_en)
- [White & Case EU Space Act Analysis](https://www.whitecase.com/insight-our-thinking/regulating-space-closer-look-proposed-eu-space-act)
- [NIS2 Directive — Space Sector](https://nis2directive.eu/space/)
- [ENISA: Securing Commercial Satellite Operations](https://www.enisa.europa.eu/news/from-cyber-to-outer-space-a-guide-to-securing-commercial-satellite-operations)

---

## Erinnerung für die Diskussion

Dieses Dokument ist **konzeptionell**. Code-Änderungen kommen erst nach strategischer Zustimmung zu:

1. Atom-Wahl (`ComplianceItem` als universale Sicht)
2. Action-Layer als einzige Mutationsschicht
3. AstraProposal-Default (opt-in vs default-on)
4. MCP-Server-Timing (Phase 4 vs Phase 6)
5. Pricing-Modell (Per-Satellite × Per-Jurisdiction)
6. Sidebar-Reform (Module-First vs Workflow-First)

**Kosten extern: 0 €.** Alles in unserem bestehenden Stack realisierbar (Next.js 15 + Prisma + Anthropic + Vercel + Neon + open-source-libs).
