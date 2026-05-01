# Caelex — UI-Architektur & Funnel-System

**Stand:** 2026-05-01
**Scope:** Wie sieht die Caelex-Plattform UI-mäßig aus (innen) + wie ziehen wir Operatoren rein (außen)? **State-of-the-art, ohne externe Kosten.**
**Trigger:** Founder-Frage: "Wie stellen wir das ganze Comply-System UI-mäßig dar? Aktuell haben wir Sidebar mit allen Modulen — das passt nicht mehr zur Guided-Compliance-Vision. Und wie ziehen wir Operatoren auf die Plattform die nicht random ihre Daten eingeben?"

> **Eine Zeile.** Innen: Mission-First-UI mit adaptiver Komplexität (Newcomer → Standard → Power-User). Außen: 5-stufiger Funnel mit Public-Tools die Wert liefern OHNE Anmeldung — caelex.eu wird zum kostenlosen Compliance-Lakmus-Test, der dann zur Plattform zieht.

---

## TEIL A — UI-Architektur (innen)

### Was die V1-UI heute macht (und warum es nicht passt)

V1-Sidebar:

```
- Dashboard
- Modules
  - Authorization
  - Cybersecurity
  - NIS2
  - CRA
  - Debris
  - Environmental
  - Insurance
  - COPUOS
  - Export Control
  - Spectrum
  - Supervision
  - UK Space
  - US Regulatory
  - Digital Twin
  - Evidence
- Documents
- Generator
- Mission Control
- Audit Center
- Astra
- Tracker
- Timeline
- Network
- ...
```

**Das ist Module-zentriert.** Operator denkt aber nicht in "Module" — er denkt in **Missionen** und **konkreten Aufgaben**. Wenn Anna fragt "was muss ich für Sat-Acme-3 tun?", muss sie heute durch 8 Module klicken um die Antwort zu finden.

**Plus:** Die Module reflektieren Compliance-Frameworks (NIS2, EU Space Act, CRA), nicht User-Goals. Ein Operator will nicht "NIS2 erfüllen" — er will "Sat-3 launchen können".

### Die neue UI-Architektur

**Vier Hauptbereiche, Mission-First.**

```
┌────────────────────────────────────────────────────────────────────┐
│  CAELEX                                                  Anna 🛰   │
├──────┬─────────────────────────────────────────────────────────────┤
│      │                                                             │
│ ═══  │   MAIN VIEW (changes per primary nav-target)                │
│      │                                                             │
│ MIS- │                                                             │
│ SION │                                                             │
│      │                                                             │
│ WORK │                                                             │
│ FLOW │                                                             │
│      │                                                             │
│ COM- │                                                             │
│ PLI- │                                                             │
│ ANCE │                                                             │
│      │                                                             │
│ REF  │                                                             │
│      │                                                             │
└──────┴─────────────────────────────────────────────────────────────┘
```

### Die vier Bereiche

#### Bereich 1: MISSION (default landing)

**Das ist der Operator's Heimat-Bereich.** Hier sieht er seine Missionen + Continuous-Compliance.

```
Sidebar-Section:                Main-View:
┌──────────────┐               ┌──────────────────────────────────┐
│  MISSION     │               │  ⚡ NÄCHSTE AKTION                │
│              │               │  Sign Document via D-Trust       │
│  + New       │               │  [Sign now →]                    │
│              │               ├──────────────────────────────────┤
│  Sat-Acme-1  │ ──active──    │  AKTIVE MISSIONEN                │
│  Sat-Acme-2  │               │                                  │
│  Sat-Acme-3  │ ●urgent       │  🛰 Sat-Acme-1 (LIVE)            │
│              │               │     Continuous · Healthy ✓        │
│  Continuous  │ ●12 active    │                                  │
│              │               │  🛰 Sat-Acme-2 (LIVE)            │
│  + Mission   │               │     Continuous · Healthy ✓        │
│  Operations  │               │                                  │
│              │               │  🚀 Sat-Acme-3 (T-145d)          │
│              │               │     Phase 1 · 67% · Action ⚡    │
│              │               │                                  │
│              │               │  ⚙ Continuous Compliance         │
│              │               │     12 active background tasks   │
│              │               │     0 alerts                     │
└──────────────┘               └──────────────────────────────────┘
```

**Default-Landing nach Login** = Mission-Bereich. Operator sieht **was zu tun ist**, nicht **welche Module existieren**.

#### Bereich 2: WORKFLOWS

**Hier sieht der Operator alle aktiven, wartenden, completed Workflows — über alle Missionen.**

```
Sidebar-Section:                Main-View:
┌──────────────┐               ┌──────────────────────────────────┐
│  WORKFLOWS   │               │  Workflow-Map  ▣  List  ▦         │
│              │               │                                  │
│  Active (8)  │               │  [Force-directed graph]          │
│  Waiting (3) │               │                                  │
│  Completed   │               │  Sat-3 BAFA-Auth → Sat-3 CNES    │
│              │               │       │              │           │
│  ⚙ Default   │               │       └──→ Pre-Launch ←──┘       │
│              │               │                  │               │
│  + Custom    │               │              Launch              │
│              │               │                  │               │
│              │               │           Continuous             │
│              │               │                                  │
│              │               │  [Click any node to drill in]    │
└──────────────┘               └──────────────────────────────────┘
```

**Workflow-Map (Force-Directed-Graph)** als Default-View — Power-User-Friendly. Mit Toggle zu klassischer **List-View** für die Newcomer.

**Workflow-Detail-Page** zeigt:

- Phase-Roadmap mit Steps
- Aktiver Step mit "What Astra is doing right now"
- Counsel/Authority-Approval-Slots
- Audit-Trail-Sidebar
- Time-Travel-Slider

#### Bereich 3: COMPLIANCE

**Hier sind die Module aus V1 — aber neu organisiert als Reference-Drilldown, nicht als Default.**

```
Sidebar-Section:                Main-View (when "Compliance" clicked):
┌──────────────┐               ┌──────────────────────────────────┐
│  COMPLIANCE  │               │  COMPLIANCE-MAP                  │
│              │               │                                  │
│  Posture     │               │  [3D Operator-Universe]          │
│  Map         │               │                                  │
│  Items       │               │       Acme Space (you)           │
│              │               │      ╱     │     ╲              │
│  ━━ FRAMEWORKS │             │   Sat-1  Sat-2  Sat-3           │
│  EU Space Act│               │                                  │
│  NIS2        │               │  Outer ring: 8 frameworks        │
│  CRA         │               │  applicable, color-coded         │
│  COPUOS      │               │                                  │
│  Insurance   │               │  Click framework → drill into    │
│  Cyber       │               │  applicable articles + status    │
│  Export      │               │                                  │
│  Spectrum    │               │                                  │
│  ITU         │               │                                  │
│  ━━ NATIONAL │               │                                  │
│  DE Space    │               │                                  │
│  FR Space    │               │                                  │
│  ...         │               │                                  │
└──────────────┘               └──────────────────────────────────┘
```

**Compliance-Map als Default-View** zeigt 3D-Universe (Three.js, existing). Operator sieht visuell wie alles zusammenhängt.

**Items** = ComplianceItem-Liste mit Filter (Status, Regulation, Mission).
**Posture** = Score-Dashboard mit Sparklines.
**Frameworks** = Pro Regulation eine Page mit applicable Articles + State.

#### Bereich 4: REFERENCE (für Power-User + Counsel)

```
Sidebar-Section:                Main-View:
┌──────────────┐               ┌──────────────────────────────────┐
│  REFERENCE   │               │  ATLAS — Article-Tracker          │
│              │               │                                  │
│  Article     │               │  [Search 119 EU-Space-Act-Art.]  │
│  Tracker     │               │                                  │
│              │               │  Article 7 — Authorisation       │
│  Glossary    │               │  Article 14 — Insurance          │
│              │               │  Article 17 — Risk Assessment    │
│  Atlas       │               │  ...                             │
│  (Counsel)   │               │                                  │
│              │               │  [Click article → deep view]     │
│  Audit       │               │                                  │
│  Center      │               │                                  │
│              │               │                                  │
│  Documents   │               │                                  │
│              │               │                                  │
│  Network     │               │                                  │
│  (Stake-     │               │                                  │
│   holders)   │               │                                  │
└──────────────┘               └──────────────────────────────────┘
```

**Reference** ist Power-User-Bereich. Newcomer sehen das als kollapierte Section. Power-User mit deep-search-needs nutzen es heavy.

### Was bleibt von V1, was wird entfernt

| V1-Item               | Status                                                                |
| --------------------- | --------------------------------------------------------------------- |
| 15 Compliance-Modules | **Bleibt** — als Drilldown unter Compliance > Frameworks              |
| Documents             | **Bleibt** — als Sub-Page unter Reference                             |
| Generator             | **Wird embedded** — Astra-driven, kein dedizierter Tab                |
| Mission Control       | **Bleibt** — als Sub-Page unter Mission                               |
| Audit Center          | **Bleibt** — als Sub-Page unter Reference                             |
| Astra (separate page) | **Wird embedded** — Astra-Chat als persistent Sidebar-Drawer (rechts) |
| Tracker               | **Bleibt** — unter Reference > Article Tracker                        |
| Timeline              | **Wird embedded** — innerhalb Mission-Detail                          |
| Network               | **Bleibt** — unter Reference > Network (Stakeholder)                  |
| Optimizer             | **Wird embedded** — als Astra-Tool in Continuous-Compliance           |
| Settings              | **Bleibt** — Top-right User-Menu                                      |

### Adaptive Komplexität — drei UI-Modi

Caelex erkennt automatisch wo der Operator steht:

```
NEWCOMER-MODE (Tag 1-30 oder ≤ 1 Mission)
  - Nur "Mission" Sidebar-Section sichtbar
  - "Workflows", "Compliance", "Reference" als kollabierte Sections
  - Walkthrough-Tour beim ersten Besuch
  - Inline-Erklärungen überall expanded
  - Cmd-K hidden (zu komplex)

STANDARD-MODE (Tag 30-120 oder 2-5 Missionen)
  - Alle 4 Sidebar-Sections sichtbar
  - Erklärungen als kollabierte Tooltips (auf-Klick)
  - Cmd-K verfügbar (mit subtle Hinweis)
  - Workflow-Map default to List-View (Force-Directed nur opt-in)

POWER-USER-MODE (≥ 5 Missionen oder ≥ 30 Workflow-Aktivität-Score)
  - Mission-Operations-Center als alternatives Default-Landing
  - Workflow-Map default to Force-Directed-Graph
  - Cmd-K als primärer Navigation-Mode
  - Custom Views + Workspaces aktivierbar
  - All density-controls verfügbar (Cozy/Compact/Dense)
```

**Operator wählt nicht den Modus** — Caelex erkennt Patterns (Click-Frequenz, Cmd-K-Usage, Mission-Count, Skip-Rate für Tours) und passt UI-Komplexität automatisch an.

### Astra-Integration — nicht separater Tab, sondern persistente Sidebar

```
                                                       ┌──────────┐
                                                       │ ASTRA    │
                                                       │          │
                                                       │ "Was muss│
                                                       │  ich für │
[Main View — Mission, Workflow, Compliance, Reference] │ Sat-3 als│
                                                       │ nächstes │
                                                       │ tun?"    │
                                                       │          │
                                                       │ Answer:  │
                                                       │  ...     │
                                                       │          │
                                                       │ [Send]   │
                                                       └──────────┘
```

**Astra-Drawer** rechts, optional einklappbar. Astra ist **kontext-bewusst** — sie weiß wo du gerade bist (welche Mission, welcher Workflow, welcher Step) und kann direkt darauf reagieren.

Operator kann Astra ausblenden — aber sie ist immer 1 Klick entfernt. **Astra ist nicht eine Page, sie ist ein Companion.**

### Mobile + Tablet

Caelex ist primär **Desktop-First** (Compliance-Lead arbeitet am Computer), aber Mobile/Tablet gibt's auch:

**Mobile (read-only-first):**

- Posture-Score sehen
- Today-Inbox
- Astra-Chat
- Notifications
- Approve einfache AstraProposals (nicht QES — das geht nur Desktop)

**Tablet:**

- Read-mostly mit limited-write
- Approval-Flows funktionieren
- 3D-Universe in Touch-optimiert

**Native Apps:** Brauchen wir nicht. PWA reicht. Reduces Cost massiv.

### Visual Direction — high-tech aber lesbar

Aus den bestehenden Caelex-Aesthetic-Patterns (Palantir-Style nach den letzten Aesthetic-Passes):

- **Deep Navy Canvas** mit Dot-Grid-Background (`palantir-canvas`)
- **Glass-Morphic Surfaces** (`palantir-surface`) — backdrop-blur über Canvas
- **Sharp 1px Ring-Inset Borders** statt Soft-Shadows
- **Mono-Typography für Codes/IDs** (font-mono mit tracking-wider)
- **Emerald Accent** als operator-brand color
- **Data-Density-Toggle** (cozy/compact/dense)

Plus für 2026 Modern-State-of-Art:

- **Subtle Animations** (Framer Motion) — nicht overdone
- **Live-Pulse-Effects** auf Status-Changes
- **Streaming-Reveal** (Suspense + Server-Components) für Reasoning-Trails
- **3D-Elements punktuell** — Operator-Universe, nicht überall
- **Type-Hierarchy** mit semantic Tokens (text-display / text-body / text-mono)

**Anti-Patterns die wir vermeiden:**

- Glassmorphism überall (zu beliebig)
- Neumorphism (zu trendy 2020)
- Dark-Mode-only-by-Default (Light-Mode für Print-Reports nötig)
- Übertriebene Animations (Compliance-Trust durch Ruhe)
- Cards-on-Cards-on-Cards (visual noise)

### Tech-Stack für die UI (alles existing)

```
Layer            Technology
─────            ──────────
Framework        Next.js 15 (App Router, RSC)
Styling          Tailwind CSS + custom utilities
3D               Three.js / @react-three/fiber (existing)
Charts           Recharts (existing)
Force-Graphs     React-Flow (free, MIT)
Drag-Drop        @dnd-kit (existing)
Animations       Framer Motion (existing)
Icons            Lucide React (existing)
Forms            React-Hook-Form + Zod (existing)
Data-Tables      TanStack Table (existing)
Cmd-K            cmdk library (existing)
Code-Editor      Monaco (only for Power-User-Mode, optional)
Real-Time        Server-Sent-Events + Postgres LISTEN/NOTIFY
PDF              @react-pdf/renderer (existing client) + jsPDF (existing server)
```

**Keine externen Subscriptions.** Alles existing oder open-source.

---

## TEIL B — Funnel-System (außen)

### Das Cold-Start-Problem ehrlich

Wenn ein Operator zu caelex.eu kommt, muss er **innerhalb 30 Sekunden Wert sehen** — sonst schließt er den Browser und kommt nicht wieder. Aber er gibt natürlich keine sensiblen Daten ein als erstes.

**Was er bisher macht:**

1. Operator erfährt von Caelex (Newsletter, Konferenz, Empfehlung)
2. Geht auf caelex.eu
3. Sieht Marketing-Page mit "Try Caelex"
4. Denkt "warum sollte ich?"
5. Schließt Browser

**Was er machen soll:**

1. Operator erfährt von Caelex
2. Geht auf caelex.eu
3. **Sieht in 10 Sekunden ohne Anmeldung etwas wertvolles über seine eigene Firma**
4. Fragt sich "was kann Caelex noch?"
5. Engagiert tiefer
6. Wird Customer

### Die 5-Stufen-Funnel

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STUFE 1 — DISCOVERY (no input, free)                           │
│         Public-Tools die Wert liefern ohne irgendwas            │
│         ├─ Compliance-Pulse-Check                               │
│         ├─ Public-Article-Tracker                               │
│         ├─ Newsletter "Space Compliance Weekly"                 │
│         └─ Public Operator-Reports (anonymized)                 │
│         → 30 Sekunden bis "Wow das ist nützlich"                │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│  STUFE 2 — VALUE-PREVIEW (domain only, free)                    │
│         Auto-Detection aus public-data, no signup               │
│         ├─ caelex.eu/check?domain=acme-space.de                 │
│         ├─ Sofort: "Wir sehen 3 Risiken für deine Firma"        │
│         └─ Public-Data-Verified Hypothesen-Map                  │
│         → 30 Sekunden bis personalisierter Wert                 │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│  STUFE 3 — EMAIL-CAPTURE (email only, free)                     │
│         Detailed personalized PDF report sent to inbox          │
│         ├─ "Get your full compliance report (15 pages)"         │
│         ├─ Keep email-magic-link for revisits                   │
│         └─ Newsletter signup auto-included                      │
│         → 1 minute bis Lead-Capture                             │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│  STUFE 4 — SOFT-SIGNUP (free tier)                              │
│         Limited Caelex-Access, prove value over weeks           │
│         ├─ 1 mission, 1 workflow                                │
│         ├─ No QES, no counsel-network                           │
│         ├─ But: full Astra-V2 + auto-detection + roadmap       │
│         └─ Free forever                                         │
│         → 18 minutes bis erstem Compliance-Action solved        │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│  STUFE 5 — SALES-CONVERSION (paid)                              │
│         Triggered when operator hits free-tier-limit            │
│         ├─ "Du hast jetzt 3 Missions geplant — upgrade?"        │
│         ├─ Or: critical compliance-need hits                    │
│         ├─ Or: counsel/authority engagement starts              │
│         └─ Sales-Call → Pro/Enterprise Tier                     │
│         → Days/weeks bis Revenue                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stufe 1 — Discovery (Lead-Magnets, no input)

**Die kostenlosen Tools die Operatoren auf caelex.eu ziehen.**

#### Tool 1: Compliance-Pulse-Check

```
caelex.eu/pulse

────────────────────────────────────────────────────────────
COMPLIANCE-PULSE-CHECK FÜR DEINE FIRMA

Domain:  [acme-space.de_____________]    [Check Now →]

In 30 Sekunden zeigen wir dir:
• Welche EU-Compliance-Frameworks gelten für deine Firma
• 3 wahrscheinliche Compliance-Risiken
• Eingeschätzte Penalty-Exposure

Keine Anmeldung. Keine Eingabe außer Domain.
Wir nutzen nur öffentliche Daten.
────────────────────────────────────────────────────────────
```

User tippt Domain, klickt Check. **Source-Verification-Stream** läuft live (siehe Anna's Walkthrough Tag 0). 30 Sekunden später sehen sie eine **public-data-only Hypothesen-Compliance-Map**.

**Was sie sehen (no signup):**

```
ACME SPACE GMBH
LEO Earth-Observation Operator · Berlin · ~14 employees

⚠ 3 LIKELY COMPLIANCE-RISKS DETECTED:

1. NIS2-BSI-Registrierung verpasst (Frist 06.03.2026)
   Penalty-Exposure: bis €10M
   Lösbar mit Late-Notification — siehe Caelex

2. Insurance-Renewal in 14 Wochen ablaufend
   Article 14 EU Space Act verlangt aktive Coverage

3. Sat-Acme-2 Lizenz-Status unklar
   Public-Register zeigt nur Sat-1 separat

[Get full 15-page report → enter your email]
[See how Caelex helps → talk to us]
```

**Trick:** der Free-Pulse zeigt nur Hypothesen + Headlines. Für Detail muss User in nächste Stufe.

#### Tool 2: Public-Article-Tracker

```
caelex.eu/eu-space-act
```

Vollständiger Article-Tracker für EU Space Act (alle 119 Articles), mit:

- Cross-References zu NIS2, COPUOS, IADC
- Sample-Compliance-Statements
- Common-Mistakes
- Penalty-Exposure-Estimates

**SEO-Goal:** Wenn jemand "EU Space Act Article 14" googelt, landet er auf Caelex's Page.

**Cost:** Caelex hat die Daten schon im Repo (`data/articles.ts`). Ist nur eine andere Render-Surface.

#### Tool 3: Newsletter "Space Compliance Weekly"

Wöchentlicher Email-Newsletter mit:

- Aktuelle EU-Regulatory-Updates
- BAFA/BNetzA/EUSPA-Announcements
- Case-Studies "How operator X handled NIS2 incident"
- 1 Sponsored-Snippet von Caelex (subtle)

**Tech:** Resend (existing, free tier 3000 emails/mo) + neuer `/newsletter`-Route mit Sub-Form.

**Cost:** 0€ bis ~5000 Subscriber, dann ~$20/mo.

#### Tool 4: Public-Operator-Reports (anonymized)

Quartalsweise: anonymisierte Aggregations-Reports über die EU-Space-Operator-Compliance-Landschaft.

```
Q3 2026 Report:
- Of 250 EU operators with public data:
  - 73% NIS2-applicable, only 41% registered
  - 58% have active insurance, 12% with coverage gaps
  - Average compliance-readiness-score: 62/100
- Top 3 risks across industry: ...
```

**Caelex's USP:** wir haben die Daten weil wir Public-Register parsen. Niemand sonst publiziert solche Aggregations.

**Cost:** 0€ — Daten haben wir schon, nur als Quartals-PDF rendern.

### Stufe 2 — Value-Preview (Domain-only, kein Signup)

**Die Hauptsache: caelex.eu/check?domain=X gibt sofort personalisierten Wert.**

Was passiert wenn Operator die volle Map sehen will (statt nur 3 Headlines):

```
"3 Compliance-Risiken für Acme Space GmbH"

Du willst die volle Analyse?
Wir zeigen dir 47 applicable Articles, 12 active Workflows, Roadmap.

Option A: [→ Per Email als PDF erhalten]
          (Email-Capture, kein Account nötig)

Option B: [→ Account erstellen + interaktiv ansehen]
          (Free-Tier-Account, 18 Min Onboarding zum ersten gelösten Problem)

Option C: [→ Mit unserem Team sprechen]
          (15-Min Demo-Call)
```

**3 Wege je nach Lead-Temperature:**

- Cold: Email-PDF-Capture (we'll nurture later)
- Warm: Account erstellen
- Hot: Sales-Call

### Stufe 3 — Email-Capture (warm leads)

PDF-Report-Generation läuft im Backend. User bekommt in <1 Minute eine Email mit:

- 15-Page-PDF "Compliance-Pulse-Check für Acme Space"
- Magic-Link für späteren Account-Zugang
- Auto-Subscribe zu Newsletter
- Link zur Demo-Booking

**Tech-Stack für PDF-Generation:**

- Existing PDF-Pipeline (`@react-pdf/renderer` + `jsPDF`)
- Astra V2 generiert Personalized Content
- Resend sendet Email
- Cost: ~$0.001 pro Report (Anthropic + Resend)

### Stufe 4 — Soft-Signup (Free-Tier)

User klickt "Account erstellen" → 18-Min-Onboarding-Flow (siehe Anna's Walkthrough Tag 0).

**Free-Tier-Limitations:**

| Feature                | Free      | Pro        | Enterprise        |
| ---------------------- | --------- | ---------- | ----------------- |
| Mission-Count          | 1         | unlimited  | unlimited         |
| Active-Workflows       | 2         | unlimited  | unlimited         |
| Astra-V2-Tool-Calls    | 100/mo    | unlimited  | unlimited         |
| Counsel-Network        | ❌        | ✓          | ✓                 |
| Authority-Pharos-Pilot | ❌        | ❌         | ✓                 |
| QES-Integration        | ❌        | ✓          | ✓                 |
| Hash-Chain-Verity      | read-only | read-write | + Witness-Network |
| Document-Generation    | 5/mo      | 50/mo      | unlimited         |
| Multi-User-Org         | 1 user    | 5 users    | unlimited         |
| API-Access             | ❌        | limited    | full              |
| BYOK Encryption        | ❌        | ❌         | ✓                 |
| Sovereign Hosting      | ❌        | ❌         | ✓                 |
| Support                | Email     | Priority   | Dedicated CSM     |

**Free-Tier-Pricing-Strategy:**

- Free forever (kein Trial-Expiry)
- Reicht für 5-10 MA-Operator mit 1 Mission
- Conversion-Trigger sind klar (mehr Missions, Counsel-Engagement, QES-Need)

**Why Free-Forever (not Trial):**

- Compliance-Workflows sind 6-12 Monate lang — Trial-Expire mid-workflow ist Verlust-Garantie
- Trust-Building: "Caelex glaubt an seinen Wert ohne Druck"
- Network-Effects: jeder Free-User ist ein Counsel-Network-Knoten

### Stufe 5 — Sales-Conversion

Triggered automatically bei:

```
TRIGGER 1: Mission-Count > 1
  "Du hast jetzt Sat-Acme-3 hinzugefügt. Free-Tier ist auf 1 Mission limitiert.
   [Upgrade auf Pro €299/mo →]   [Talk to sales →]"

TRIGGER 2: Counsel-Engagement gestartet
  "Du willst Tobias als Counsel einladen. Counsel-Network ist Pro-Feature.
   [Try Pro 30 days free →]"

TRIGGER 3: QES-Submission-Bedarf
  "Diese Submission braucht QES. Verfügbar in Pro.
   [Upgrade jetzt + sofort signieren →]"

TRIGGER 4: 90 Tage Aktivität
  "Du nutzt Caelex seit 90 Tagen mit 1 Mission. Wir sehen du hast Sat-Acme-3
   geplant. Lass uns sprechen wie Pro dir hilft.
   [15-Min-Demo-Call →]"
```

**Sales-Call-Pattern (15-30 Min):**

- Operator zeigt seine Caelex-Free-Account
- Sales sieht reale Daten (mit Operator-Permission)
- Diskutiert konkret welche Pro-Features helfen
- Pricing transparent (€299/€999/Custom)
- Kein "talk to us" Bullshit — Pricing-Page öffentlich

### Plus: Network-Acquisition für Counsel + Authority + Investor

Operator-Acquisition ist die eine Hälfte. Die andere: **Counsel + Authority + Investor** auf die Plattform ziehen — das schafft den Network-Effect.

#### Counsel-Acquisition

**Strategy: Counsel als Lead-Generation für Operator.**

```
caelex.eu/atlas (Counsel-Landing-Page)

────────────────────────────────────────────
CAELEX ATLAS FÜR COMPLIANCE-ANWÄLTE

Verwalte alle Mandanten-Compliance-Workflows
in einer Workspace mit:

✓ EU-Space-Act-Knowledge-Base (alle 119 Articles)
✓ Cross-Reference-Engine
✓ Citation-Validator
✓ QES-Integration via D-Trust
✓ Multi-Mandant-Workspace

Free für Anwälte mit ≤3 Mandanten.
────────────────────────────────────────────
```

**Hook:** Anwalt nutzt Caelex Atlas (free) → empfiehlt es seinen Mandanten → Mandanten werden Operator-Customer.

#### Authority-Acquisition

**Strategy: Pilot mit BSI/BAFA als Trust-Anchor + Marketing.**

Pharos-Pilot mit 1-2 Authorities (BSI für NIS2, BAFA für EU Space Act). Hoch-individuelle Implementation, wahrscheinlich subsidized oder kostenlos initial.

**ROI:** ein BAFA-Pilot ist Marketing-Gold. "BAFA nutzt Caelex Pharos für NIS2-Submissions" wird in jedem Operator-Pitch verwendet.

#### Investor-Acquisition

**Strategy: Free Investor-Briefings + RRS/RCR-Reports als Lead-Magnet.**

```
caelex.eu/investors

────────────────────────────────────────────
CAELEX ASSURE FÜR SPACE-INVESTORS

Quarterly Free Investor-Briefing:
"State of EU Space Compliance"

Plus on-demand:
✓ RRS (Regulatory Readiness Score) für jeden Public-Operator
✓ RCR (Regulatory Credit Rating) für Portfolio-Analyse
✓ Risk-Heatmap pro Investee

Free Tier: 5 RRS-Reports/mo
Pro: €499/mo unlimited
────────────────────────────────────────────
```

**Multi-side-Marketplace:** Operator und Investor beide nutzen Caelex → Operator zahlt für DD-Package, Investor zahlt für Aggregation.

### Content-Marketing-Strategy (organic SEO)

**Keine bezahlten Ads.** Statt dessen Content-Marketing:

| Content                                         | Frequency    | Hook                                  |
| ----------------------------------------------- | ------------ | ------------------------------------- |
| Newsletter "Space Compliance Weekly"            | weekly       | Brand-Building + Lead-Capture         |
| Article-Tracker-Pages (119+)                    | static       | SEO für "EU Space Act Art X" Searches |
| Quarterly "State of EU Space Compliance" Report | quarterly    | PR + Industry-Authority               |
| Case-Study-Stories (anonymized)                 | monthly      | "How operator X handled Y"            |
| Atlas-Glossary                                  | static       | SEO für Compliance-Terms              |
| Operator-Pulse-Public-Reports                   | quarterly    | Industry-Reputation                   |
| Conference-Speaking                             | as available | Direct lead-generation                |
| Open-Source EU-Space-Act-Engine                 | once         | Developer-Community-Hook              |

**Tech for Content:**

- Next.js MDX-Pages für Articles
- Vercel Edge for SEO
- Plausible / PostHog für Analytics (free self-hosted)
- Resend für Newsletter
- ConvertKit / Buttondown für Newsletter (free tier 1k subscribers)

### Tech-Stack für Funnel (alles existing oder free)

```
Layer                    Technology                          Cost
─────                    ──────────                          ────
Marketing Site           Next.js + MDX (existing)            $0
Public-Pulse-Tool        Same Caelex stack                   $0
Newsletter               Resend (existing free tier)         $0
PDF-Reports              Existing PDF pipeline + Astra       ~$0.001/report
SEO Article-Tracker      Static MDX + sitemap                $0
Analytics                Plausible self-hosted OR PostHog    $0
A/B Testing              PostHog (free)                      $0
Lead-Tracking            Existing Caelex DB + Webhook        $0
CRM                      Existing Caelex DB                  $0
Pricing-Calculator       Embedded in pricing page            $0
Demo-Booking             Cal.com self-host (free) OR existing$0
```

**Total Funnel-Tooling-Cost: $0/mo bis ~5k MAU.**

### Funnel-KPIs (was wir messen)

| Stage             | KPI                         | Target Q3 2026 |
| ----------------- | --------------------------- | -------------- |
| **Awareness**     | Newsletter Subscribers      | 500            |
| **Awareness**     | Article-Tracker MAU         | 2000           |
| **Awareness**     | Public-Pulse Domain-Checks  | 200/mo         |
| **Interest**      | Pulse-to-Email-Conversion   | 25%            |
| **Interest**      | Email-to-Account-Conversion | 15%            |
| **Consideration** | Free-Tier Active Users      | 50             |
| **Consideration** | Free-Tier 30d-Retention     | 60%            |
| **Decision**      | Free-to-Pro-Conversion      | 10%            |
| **Action**        | Pro-Tier MRR                | €5000          |

**3-12 Monate später:**

- 200+ paying customers
- €30-50k MRR
- 5+ counsel-firm-partners
- 2+ authority-pilots

### Was wir NICHT machen

**Kein:**

- Paid Ads (Google/LinkedIn) — zu teuer für B2B-Compliance-Niche
- Influencer-Marketing — irrelevant in B2B-Space
- Trade-Show-Booths >€10k — ROI unsicher
- Kalt-Akquise per Email-Spam — verboten + schädlich
- Custom Demo-Calls für jeden Lead — automatisierter Flow first
- Free-Tier mit Trial-Expiry — kostet Compliance-Kunden mid-workflow
- Salesforce — overkill, eigene Caelex-DB reicht
- HubSpot — overkill, $0 stack reicht
- Marketo — overkill

**Lessons aus B2B-SaaS-Funnel-Best-Practices:**

- **Drata's Approach:** SOC-2-Pre-Audit-Checker als Lead-Magnet. Wir adaptieren: NIS2-Pre-Check, EU-Space-Act-Pre-Check.
- **Vanta's Approach:** Trust-Center + Free-Tier. Wir haben Verity + Free-Tier.
- **Anecdotes' Approach:** "Compliance-as-Data" Engineering-Blog. Wir können das mit Caelex-Open-Source-Engines.
- **Hyperproof's Approach:** Crosswalk-Engine als Differentiator. Wir bauen Caelex-Specific-Crosswalks.

---

## TEIL C — Implementation-Sequence

### Phase 1: UI-Foundation (Q3 2026, ~6-8 Wochen)

**Sprint 1-A: Sidebar-Restructure** (~2 Wochen)

- Vier Sidebar-Sections (Mission/Workflows/Compliance/Reference)
- Adaptive-Mode-Detection-Logic
- Default-Landing nach Login = Mission-Section

**Sprint 1-B: Mission-First-Page-Layout** (~2 Wochen)

- Mission-Detail-Page mit Phase-Roadmap
- Next-Action-Card prominent
- Background-Tasks-Sidebar

**Sprint 1-C: Astra-as-Drawer** (~2 Wochen)

- Persistent Right-Sidebar-Drawer
- Context-aware (knows current page)
- Streaming-Reasoning-Trail

**Sprint 1-D: Workflow-Map-View** (~2 Wochen)

- React-Flow Force-Directed-Graph
- Node-Click → Detail-Drilldown
- Toggle to List-View

### Phase 2: Public Funnel (Q3-Q4 2026, ~6-8 Wochen)

**Sprint 2-A: Pulse-Check-Tool** (~3 Wochen)

- caelex.eu/pulse Public-Page
- Source-Verification-Stream-UI (existing component)
- Email-Capture-Flow + PDF-Generation
- 15-Page-Report-Template

**Sprint 2-B: Article-Tracker-Public** (~2 Wochen)

- caelex.eu/eu-space-act/[article] static MDX-pages
- 119 Articles + Cross-References
- SEO-optimized

**Sprint 2-C: Newsletter** (~1 Woche)

- caelex.eu/newsletter Sub-Page
- Resend-Integration
- Weekly-Cron für Publication

**Sprint 2-D: Pricing-Page + Sales-Triggers** (~1 Woche)

- caelex.eu/pricing transparent
- In-app Sales-Triggers
- Cal.com Demo-Booking

### Phase 3: Free-Tier + Conversion (Q4 2026, ~4-6 Wochen)

**Sprint 3-A: Free-Tier-Implementation** (~2 Wochen)

- Limit-Checks im Code (1 Mission, 2 Workflows, etc.)
- Upgrade-Prompts UI
- Subscription-Plan-Tracking

**Sprint 3-B: Onboarding-Wizard-Optimization** (~2 Wochen)

- 18-Min-Onboarding nach Anna's Story
- Walkthrough-Tour
- First-Win-Tracking

**Sprint 3-C: In-App-Sales-Triggers** (~1 Woche)

- Trigger-Logic für Conversion
- "Talk to Sales" CTA in-app

### Phase 4: Network-Acquisition (Q1 2027, ~6-8 Wochen)

**Sprint 4-A: Counsel-Atlas-Public-Page** (~2 Wochen)

- caelex.eu/atlas Lead-Page
- Counsel-Onboarding-Flow
- Multi-Mandant-Workspace

**Sprint 4-B: Investor-Assure-Public-Page** (~2 Wochen)

- caelex.eu/investors Lead-Page
- RRS-Public-Lookup
- Quarterly-Investor-Briefing-Template

**Sprint 4-C: Authority-Pharos-Pilot** (~Variable, 4+ Wochen)

- Authority-Onboarding-Flow
- BSI-/BAFA-spezifische-Customizations

### Total Timeline

```
2026 Q3                 Q4                  2027 Q1                 Q2
├─ UI Foundation ────┬─ Public Funnel ───┬─ Network ──────────┐
│  6-8 Wochen        │  6-8 Wochen       │  6-8 Wochen        │
│                    │                   │                    │
└─ Mission-First ────┴─ Pulse-Tool ──────┴─ Counsel/Investor ┘
   Sidebar+Astra        Article-Tracker    Network-Effects
```

**Total: ~18-24 Wochen Engineering** für volles UI + Funnel-System.

---

## ZUSAMMENFASSUNG — die zwei Antworten

### UI-Architektur (Antwort auf Frage 1)

**Mission-First, nicht Module-First.** Vier Sidebar-Sections:

1. **MISSION** (default landing) — Mission-Roadmap + Continuous-Compliance
2. **WORKFLOWS** — alle aktiven, mit Force-Directed-Graph-View
3. **COMPLIANCE** — Posture, Items, Frameworks (alte Module hier als Drilldown)
4. **REFERENCE** — Article-Tracker, Atlas, Audit-Center, Documents, Network

**Plus:**

- **Astra als persistente rechte Drawer** (nicht als separate Page)
- **Adaptive-Mode** (Newcomer/Standard/Power-User automatic)
- **High-Tech-Aesthetic** (Palantir-Glass, Three.js Operator-Universe, Live-Pulse, Streaming-Reasoning)
- **Mobile + Tablet** als Read-Mostly-PWA (no native apps)
- **Tech-Stack** alles existing, kein neuer Vendor-Cost

### Funnel-System (Antwort auf Frage 2)

**5-stufiger Funnel mit Public-Tools die Wert liefern OHNE Anmeldung:**

1. **DISCOVERY** — Public-Pulse-Check, Article-Tracker, Newsletter, Public-Reports → Awareness
2. **VALUE-PREVIEW** — caelex.eu/check?domain=X gibt 30-Sekunden-Hypothesen-Map → Interest
3. **EMAIL-CAPTURE** — 15-Page-PDF-Report per Email → Lead-Capture
4. **SOFT-SIGNUP** — Free-Tier (1 Mission, 2 Workflows, free forever) → Trust-Building
5. **SALES-CONVERSION** — Auto-Triggers bei Limits → Pro/Enterprise-Revenue

**Plus:**

- **Counsel-Network** als Lead-Generation für Operator (Atlas)
- **Authority-Pilots** als Trust-Anchor (Pharos)
- **Investor-Network** als Multi-Sided-Marketplace (Assure)
- **Content-Marketing-First** (Newsletter + Article-Tracker + Quarterly-Reports) — keine Paid-Ads
- **Tech-Stack** $0/mo bis 5k MAU

### Was Caelex dadurch wird

> **caelex.eu wird zum kostenlosen Compliance-Lakmus-Test der EU-Raumfahrt.** Ein Operator gibt seine Domain ein und sieht in 30 Sekunden 3 reale Compliance-Risiken. Das ist Wert ohne Anmeldung. Das ist der Hook. Daraus zieht der Funnel ihn auf die Plattform — wo er in 18 Minuten sein erstes Compliance-Problem löst und in 90 Tagen seinen Compliance-Alltag automatisiert hat.

**Inside und Outside zusammen.** Innen: Mission-First-UI mit adaptiver Komplexität. Außen: 5-stufiger Funnel mit kostenlosen Wert-Liefer-Tools. Beides zusammen: **das Acquisition-Engine + Retention-Engine für Caelex's Plattform-Vision**.

---

## SCHLUSS

Das Cold-Start-Trust-Problem (Operator gibt nicht random sensible Daten ein) lösen wir nicht durch besseres Onboarding allein — wir lösen es durch **Lead-Magnets die Wert liefern bevor Trust nötig ist**.

caelex.eu/pulse ist der Hook. Anna's 18-Minuten-Tag-0-Story ist der Conversion-Pfad. Mission-First-UI ist die Retention. Free-Tier ist der Trust-Builder. Sales-Triggers sind der Revenue-Pfad.

Alles state-of-the-art technologisch (Next.js 15, Server-Components, Three.js, Real-Time-Streaming, Hash-Chain). Alles kosten-optimiert ($0/mo bis 5k MAU). Alles Caelex-konsistent (gleiche Aesthetic, gleiche Hash-Chain, gleiche Astra).

**~18-24 Wochen Engineering** um die zwei Systeme komplett zu bauen. Aber: erste Pulse-Tool-Version ist in **3 Wochen** shippable und sofort Lead-Generation-aktiv.

— UI- und Funnel-Design, im Auftrag des Founders
