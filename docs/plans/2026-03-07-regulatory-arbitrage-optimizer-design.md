# Regulatory Arbitrage Optimizer — Design Document

## Goal

Help satellite operators find the optimal jurisdiction for registering their spacecraft by providing multi-objective optimization across 10 European jurisdictions. Supports both pre-launch planning (new missions) and re-flagging optimization (existing satellites), with configurable weight profiles, interactive trade-off visualizations, and exportable migration paths.

## Architecture

Engine Extension approach: new `regulatory-optimizer.server.ts` module layered on top of the existing `space-law-engine.server.ts`. Reuses all existing jurisdiction data, favorability scoring, and comparison matrix logic. Adds parametrizable weights, multi-objective ranking, trade-off computation, and migration path generation.

## Tech Stack

- **Engine:** Server-only TypeScript module (extends space-law-engine)
- **API:** Next.js route handlers under `/api/v1/optimizer/`
- **DB:** New Prisma model `OptimizationResult` for persistence
- **UI:** React components with Ephemeris theme + Glass Design System
- **Charts:** Pure SVG (scatter-plot, radar chart) — no chart libraries
- **PDF:** `@react-pdf/renderer` (existing stack)

---

## 1. Optimizer Engine

**File:** `src/lib/regulatory-optimizer.server.ts`

### Input

```typescript
interface OptimizationInput {
  // Satellite Specs
  activityType: SpaceLawActivityType;
  entityNationality: EntityNationality;
  entitySize: "small" | "medium" | "large";
  primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond";
  constellationSize: number;
  missionDurationYears: number;
  hasDesignForDemise: boolean;

  // Optimization Preferences
  weightProfile:
    | "startup"
    | "enterprise"
    | "government"
    | "balanced"
    | "custom";
  customWeights?: OptimizationWeights;

  // Re-Flagging Context (optional)
  currentJurisdiction?: string;
  currentNoradId?: string;
}

interface OptimizationWeights {
  timeline: number; // 0-100
  cost: number; // 0-100
  compliance: number; // 0-100
  insurance: number; // 0-100
  liability: number; // 0-100
  debrisFlex: number; // 0-100
}
```

### Weight Presets

| Profile        | Timeline | Cost | Compliance | Insurance | Liability | Debris |
| -------------- | -------- | ---- | ---------- | --------- | --------- | ------ |
| **Startup**    | 35       | 30   | 15         | 10        | 5         | 5      |
| **Enterprise** | 10       | 15   | 30         | 20        | 15        | 10     |
| **Government** | 5        | 5    | 35         | 15        | 15        | 25     |
| **Balanced**   | 20       | 20   | 20         | 15        | 15        | 10     |

### Core Logic

1. Call existing `calculateSpaceLawCompliance()` for all 10 jurisdictions
2. Re-calculate favorability scores with user-provided weights (instead of hardcoded weights)
3. Compute normalized cost score (Application Fee + Annual Fee + Insurance)
4. Compute normalized timeline score (Processing Weeks)
5. Multi-objective ranking: weighted sum across all 6 dimensions
6. For re-flagging: delta analysis via existing Jurisdiction Simulator
7. Generate migration path (steps, documents, timeline, estimated costs)

### Output

```typescript
interface OptimizationResult {
  rankings: JurisdictionRanking[]; // Sorted by total score
  tradeOffData: TradeOffPoint[]; // For scatter-plot visualization
  migrationPath?: MigrationStep[]; // Only for re-flagging
  summary: {
    bestOverall: string;
    bestForTimeline: string;
    bestForCost: string;
    bestForCompliance: string;
  };
}

interface JurisdictionRanking {
  jurisdiction: string; // Country code
  jurisdictionName: string;
  totalScore: number; // 0-100 weighted composite
  dimensionScores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
  badges: string[]; // "BEST_OVERALL", "FASTEST", "CHEAPEST"
  timeline: { min: number; max: number }; // Weeks
  estimatedCost: { application: string; annual: string };
  keyAdvantages: string[];
  keyRisks: string[];
}

interface TradeOffPoint {
  jurisdiction: string;
  x: number; // Normalized cost (0-1)
  y: number; // Compliance score (0-100)
  size: number; // Timeline weeks (for bubble size)
  label: string; // Country name
}

interface MigrationStep {
  order: number;
  title: string;
  description: string;
  estimatedDuration: string;
  documents: string[];
  cost?: string;
  authority?: string;
}
```

---

## 2. API Routes

| Route                              | Method | Purpose                                            |
| ---------------------------------- | ------ | -------------------------------------------------- |
| `/api/v1/optimizer/analyze`        | POST   | Main optimization — takes inputs, returns rankings |
| `/api/v1/optimizer/compare`        | POST   | Side-by-side comparison of 2-3 jurisdictions       |
| `/api/v1/optimizer/migration-path` | POST   | Detailed migration path from jurisdiction A → B    |
| `/api/v1/optimizer/presets`        | GET    | Available weight profiles with descriptions        |
| `/api/v1/optimizer/history`        | GET    | Past optimization results for the org              |

All endpoints: session-based auth, org-scoped, rate-limited (assessment tier).

---

## 3. Prisma Model

```prisma
model OptimizationResult {
  id                  String        @id @default(cuid())
  organizationId      String
  organization        Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Input Snapshot
  inputJson           Json
  weightProfile       String        // "startup" | "enterprise" | "custom" etc.

  // Re-Flagging Context
  spacecraftId        String?
  spacecraft          Spacecraft?   @relation(fields: [spacecraftId], references: [id])
  currentJurisdiction String?

  // Results
  resultJson          Json
  topJurisdiction     String
  topScore            Float

  createdAt           DateTime      @default(now())

  @@index([organizationId, createdAt])
}
```

---

## 4. UI — Dashboard Optimizer Page

**Route:** `/dashboard/optimizer`

### Layout (3-column, desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  REGULATORY ARBITRAGE OPTIMIZER                    [Export]  │
├──────────────┬──────────────────────────┬───────────────────┤
│  INPUT PANEL │   RESULTS AREA           │  DETAIL PANEL     │
│  (320px)     │   (flex)                 │  (360px)          │
│              │                          │                   │
│  Mission     │  [Rankings] [Trade-off]  │  Selected:        │
│  Specs       │                          │  Jurisdiction     │
│              │  Ranked List             │  Detail Card      │
│  Weight      │  - or -                  │                   │
│  Profile     │  Scatter Plot            │  Score Breakdown  │
│              │                          │  (Radar Chart)    │
│  Custom      │                          │                   │
│  Sliders     │                          │  Migration Path   │
│              │                          │  (if re-flagging) │
│  [Analyze]   │                          │                   │
│              │                          │  Documents        │
│              │                          │  Checklist        │
├──────────────┴──────────────────────────┴───────────────────┤
│  COMPARISON TABLE (collapsible) — 11 criteria × top 5      │
└─────────────────────────────────────────────────────────────┘
```

### Input Panel (left, 320px)

- **Mission Specs Section:** Activity Type dropdown, Orbit dropdown, Entity Size radio, Constellation Size input, Mission Duration input, Design-for-Demise toggle
- **Weight Profile Section:** 4 preset buttons (Startup, Enterprise, Government, Balanced) + "Custom" toggle
- **Custom Sliders:** 6 range sliders (0-100) for each dimension, only visible when Custom is active. Values normalized to sum to 100.
- **"Analyze" Button:** Calls `/api/v1/optimizer/analyze`, shows loading state
- **Re-Flagging Toggle:** "I have an existing satellite" → shows Spacecraft selector dropdown (reads from org's spacecraft list) + current jurisdiction

### Results Area (center, flex)

**Tab 1 — Rankings:**

- Sorted list of all 10 jurisdictions
- Each row: flag emoji, name, total score bar (0-100), mini dimension breakdown, badges
- Click selects → Detail Panel updates
- Top-3 highlighted with accent border

**Tab 2 — Trade-off Map:**

- SVG scatter plot (pure SVG, no libraries)
- X-axis: Normalized cost (low → high)
- Y-axis: Compliance score (0-100)
- Bubble size: Timeline (smaller = faster)
- Hover: tooltip with jurisdiction name + scores
- Click: selects jurisdiction → Detail Panel
- Grid lines + axis labels in IBM Plex Mono

### Detail Panel (right, 360px)

- **Header:** Flag + Jurisdiction name + Total Score badge
- **Score Breakdown:** SVG radar/spider chart with 6 axes (timeline, cost, compliance, insurance, liability, debris)
- **Key Advantages:** Green-tagged list
- **Key Risks:** Amber-tagged list
- **Timeline:** Processing weeks range with visual bar
- **Estimated Costs:** Application fee + annual fee
- **Migration Path** (re-flagging only): Numbered steps with duration, documents, costs per step
- **Documents Checklist:** Required documents with checkbox style
- **[Export PDF]** button

### Comparison Table (bottom, collapsible)

Reuses existing `ComparisonMatrix` component pattern from space law results. Shows top-5 ranked jurisdictions side-by-side across 11 criteria.

---

## 5. UI — Ephemeris Integration

**Location:** New tab "Optimize" in `/dashboard/ephemeris/[noradId]` (alongside Forecast, Modules, Scenarios, etc.)

### Compact Optimizer View

- Pre-filled from Spacecraft data (orbit type, activity) + detected jurisdiction
- Banner: "Currently registered: 🇩🇪 DE — Score 68/100. Better options may exist."
- Quick-cards for top 3 alternative jurisdictions: score, delta, key advantage
- "Open Full Optimizer →" link to `/dashboard/optimizer?spacecraft=<id>&from=<jurisdiction>`

---

## 6. Design System

- **Theme:** `useEphemerisTheme()` hook — all colors via theme constants
- **Glass System:** `glass-elevated` for cards, `glass-surface` for panels
- **Font:** IBM Plex Mono for data/scores, system font for labels
- **Charts:** Pure SVG (scatter-plot + radar chart), no external chart libraries
- **Responsive:** 3-column on desktop, stacked on mobile (input → results → detail)
