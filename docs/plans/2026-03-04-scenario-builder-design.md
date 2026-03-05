# Ephemeris Scenario Builder — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Problem

The Ephemeris "Simulate" tab only exposes jurisdiction comparison. The backend already supports 5 what-if scenario types (ORBIT_RAISE, FUEL_BURN, THRUSTER_FAILURE, EOL_EXTENSION, JURISDICTION_CHANGE) — but there's no UI for composing and chaining them.

## Solution

A drag-and-drop **Scenario Builder** that lets users compose multi-step simulation pipelines from building blocks.

## Layout: Pipeline Stack (3-Column)

```
┌──────────┬───────────────────────┬───────────┐
│ PALETTE  │   SCENARIO PIPELINE   │  RESULTS  │
│  (240px) │       (flex-1)        │  (320px)  │
│          │                       │           │
│ [Orbit]  │  ┌────────────────┐   │ Horizon   │
│ [Fuel]   │  │ Orbit Raise    │   │ 847→912d  │
│ [Crash]  │  │  +50km, -2%    │   │           │
│ [EOL]    │  └────────────────┘   │ Score     │
│ [Juris]  │         ↓            │ 72 → 78   │
│ [Custom] │  ┌────────────────┐   │           │
│          │  │ Re-flag → LU   │   │ Fuel      │
│  drag →  │  │  Luxembourg    │   │ 34%→32%   │
│          │  └────────────────┘   │           │
│          │         ↓            │ Regs: 3   │
│          │  ┌ ─ ─ ─ ─ ─ ─ ─ ┐   │           │
│          │  │   Drop here    │   │ [Run ▶]   │
│          │  └ ─ ─ ─ ─ ─ ─ ─ ┘   │ [Reset]   │
└──────────┴───────────────────────┴───────────┘
```

## Block Types

| Block               | Icon          | Parameters                                     | API Type             |
| ------------------- | ------------- | ---------------------------------------------- | -------------------- |
| Orbit Raise         | ArrowUp       | altitudeDeltaKm (10-200), fuelCostPct (0.5-10) | ORBIT_RAISE          |
| Fuel Burn           | Fuel          | burnPct (1-50)                                 | FUEL_BURN            |
| Thruster Failure    | AlertTriangle | None (complete failure)                        | THRUSTER_FAILURE     |
| EOL Extension       | Clock         | extensionYears (1-10)                          | EOL_EXTENSION        |
| Jurisdiction Change | Globe         | toJurisdiction (dropdown)                      | JURISDICTION_CHANGE  |
| Combined Scenario   | Layers        | Multiple sub-effects                           | Chains API calls     |
| Custom Block        | Wrench        | User-defined key-value params                  | Extensible POST body |

## Interaction Flow

1. Drag block from palette → drop into pipeline
2. Block expands with parameter controls (sliders, dropdowns)
3. Configure parameters
4. Click "Run Scenario"
5. Sequential API calls to `/api/v1/ephemeris/what-if` per block
6. Results panel shows cumulative impact
7. Reorder blocks by dragging within pipeline
8. Remove blocks with X button
9. Reset clears entire pipeline

## Results Panel

- Compliance Horizon delta (days before → after)
- Overall Score delta
- Fuel Impact (percentage before → after)
- Affected Regulations list (status changes)
- AI-generated recommendation text

## Technical Stack

- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- **API:** Existing `/api/v1/ephemeris/what-if` endpoint (no backend changes)
- **State:** React useState + custom hook `useScenarioSimulation`

## Files to Create

| File                                                             | Purpose              |
| ---------------------------------------------------------------- | -------------------- |
| `ephemeris/components/scenario-builder/ScenarioBuilder.tsx`      | 3-column container   |
| `ephemeris/components/scenario-builder/BlockPalette.tsx`         | Draggable palette    |
| `ephemeris/components/scenario-builder/ScenarioPipeline.tsx`     | Sortable drop zone   |
| `ephemeris/components/scenario-builder/PipelineBlock.tsx`        | Block with params    |
| `ephemeris/components/scenario-builder/ResultsPanel.tsx`         | Results display      |
| `ephemeris/components/scenario-builder/block-definitions.ts`     | Block registry       |
| `ephemeris/components/scenario-builder/useScenarioSimulation.ts` | Pipeline state + API |

## Files to Modify

| File                           | Change                                             |
| ------------------------------ | -------------------------------------------------- |
| `ephemeris/[noradId]/page.tsx` | Replace JurisdictionSimulator with ScenarioBuilder |

## Responsive Behavior

- **Desktop (lg+):** 3 columns
- **Tablet (md):** Palette as horizontal strip, pipeline + results stacked
- **Mobile (sm):** Palette as drawer, single column

## Custom Blocks

- User creates: name + key-value parameter list
- Stored in localStorage (future: DB per org)
- Serialized into what-if API `parameters` field
