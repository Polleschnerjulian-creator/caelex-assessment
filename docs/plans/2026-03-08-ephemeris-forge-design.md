# Ephemeris Forge — Scenario Builder Redesign

**Date:** 2026-03-08
**Status:** Approved
**Approach:** React Flow (`@xyflow/react`) with thin abstraction layer

---

## Summary

Replace the 3-panel linear Scenario Builder with a spatial node-graph canvas ("Ephemeris Forge"). Light mode, real-time computation (no Run button), branching scenario paths, animated data-flow edges.

## Key Decisions

1. **Fullscreen takeover** — When SCENARIOS tab is active, Forge takes over the entire content area (hides metrics strip, tab bar, alerts sidebar). Back arrow returns to tabbed view.
2. **@xyflow/react** — Handles canvas pan/zoom, node dragging, edge rendering, minimap. We build custom node types, custom edge types, and overlays on top.
3. **Light mode forced** — Forge always renders in light mode regardless of OS preference. New `useForgeTheme()` hook with Forge-specific tokens.
4. **Debounced auto-compute** — Every graph mutation triggers recalculation after 500ms debounce. No Run button. AbortController cancels in-flight requests on new mutations.
5. **Unchanged backend** — Same `POST /api/v1/ephemeris/what-if` API. Same `block-definitions.ts`.

## File Architecture

```
src/app/dashboard/ephemeris/components/scenario-builder/
├── EphemerisForge.tsx              — Top-level canvas (replaces ScenarioBuilder.tsx)
├── useForgeGraph.ts                — Graph state: nodes, edges, CRUD, serialization
├── useForgeComputation.ts          — Debounced auto-computation, per-chain DAG execution
├── nodes/
│   ├── SatelliteOriginNode.tsx     — Mandatory start node (live satellite state)
│   ├── ScenarioNode.tsx            — Scenario block with inline params
│   └── ResultNode.tsx              — Auto-generated chain terminal
├── edges/
│   └── ForgeEdge.tsx               — Animated Bézier with severity color + pulse
├── overlays/
│   ├── ForgeToolbar.tsx            — Top floating bar (back, name, save/load, zoom)
│   ├── RadialMenu.tsx              — Right-click circular category menu
│   ├── SlashCommand.tsx            — "/" command palette
│   └── ComparisonBar.tsx           — Floating parallel-branch comparison
├── block-definitions.ts            — UNCHANGED
└── types.ts                        — ForgeNode, ForgeEdge, shared types
```

## Node Types

### SatelliteOriginNode (~280x160px)

- Always present, not deletable, positioned left-center
- Shows live score (36px mono), risk category, horizon, weakest module
- 2px emerald border + glow
- Output port only (right side)

### ScenarioNode (~220x auto, min 120px)

- White card, 1px category-colored border, 3px left accent
- Top: input port + category icon + name + delete (hover)
- Body: inline parameter controls (sliders, selects) from block-definitions.ts
- Bottom: computed ΔH + severity badge (shimmer while computing)
- Output port right side
- Three zoom detail levels: zoomed-out (title only), medium (title + param summary), full (all controls)

### ResultNode (~200x140px)

- Auto-generated at chain end, input port only
- Shows aggregated: total ΔH, severity, affected regs count, cost
- Expandable: compliance timeline sparkline + risk heatmap
- Border color = severity, background = severity tint 5%
- CRITICAL: red pulse animation on border

## Edge Design (ForgeEdge)

- Smooth cubic Bézier, 2px stroke (3px on hover)
- Animated pulse particle (4px dot traveling along path, SVG animateMotion, 2s loop)
- Color by computed impact: emerald (improves), amber (warning), red (critical), slate (computing/idle)
- Computing state: shimmer gradient sweep
- CRITICAL chains: reverse red pulse (6px dot, result→origin direction)
- Connection drag: ghost dashed Bézier follows cursor with elastic delay
- Snap: port scale pulse (1.0→1.15→1.0) + glow flash

## Overlays

### ForgeToolbar (fixed top, 48px)

- Left: ← back + satellite name + NORAD ID
- Center: editable scenario name + Save/Load dropdown
- Right: Reset, Zoom (−/level/+), Minimap toggle, Present mode

### RadialMenu (right-click / double-click canvas)

- 7 category segments in category colors, circular layout
- Hover expands segment → shows individual blocks
- Click spawns node at cursor with spring animation (200ms)

### SlashCommand (press "/")

- Notion-style centered overlay, 400px wide
- Auto-focused search, filtered block list grouped by category
- Keyboard navigation (↑/↓/Enter), spawns at viewport center

### ComparisonBar (between parallel ResultNodes)

- Floating glass card at geometric midpoint of compared ResultNodes
- Side-by-side: ΔH, severity, cost for each branch
- Auto-generated insight line ("Branch B saves 158 days, $4.1M less")

## Graph State (useForgeGraph)

- Manages nodes[] and edges[] in React state
- CRUD: addScenarioNode, removeNode, updateNodeParams, connectNodes, disconnectEdge
- Auto ResultNode management: appends when node has unconnected output, removes when connected past
- Chain detection: walks DAG from origin, identifies linear paths for computation
- Serialization: JSON save/load to localStorage keyed by noradId
- Undo/redo: state history stack (Cmd+Z / Cmd+Shift+Z)

## Auto-Computation (useForgeComputation)

- Triggers on any graph mutation after 500ms debounce
- Extracts chains from DAG (each chain: origin → ... → result)
- Per chain (parallel across chains, sequential within):
  1. Set nodes to computeState: "computing", edges to "computing"
  2. POST each scenario node to /api/v1/ephemeris/what-if
  3. Store StepResult on node data
  4. Aggregate into ResultNode
  5. Color edges by severity
- AbortController cancels in-flight on new mutation
- Parallel branches compute concurrently via Promise.all

## Canvas

- Background: white (#FAFBFC) with dot grid (#E2E8F0), density adapts to zoom
- Zoom range: 25%–200%
- React Flow MiniMap (bottom-right, ~160x100px)

## Category Colors

| Category      | Color             |
| ------------- | ----------------- |
| Orbital       | #3B82F6 (Blue)    |
| Hardware      | #F59E0B (Amber)   |
| Environment   | #06B6D4 (Cyan)    |
| Communication | #8B5CF6 (Violet)  |
| Regulatory    | #10B981 (Emerald) |
| Operational   | #EC4899 (Pink)    |
| Financial     | #EF4444 (Red)     |

## Micro-Interactions

- Node spawn: spring bounce 200ms (scale 0.8→1.02→1.0)
- Node hover: translateY(-2px) + shadow increase, 150ms
- Node delete: scale(0.95) + opacity(0), 150ms
- Parameter change: shimmer on connected edges
- Connection snap: port scale pulse + glow flash
- CRITICAL result: red border pulse + reverse edge ripple

## Integration

In `[noradId]/page.tsx`:

- When activeTab === "scenarios": render EphemerisForge as fixed fullscreen overlay (z-40)
- Pass noradId, satelliteName, satelliteState as props
- Toolbar back arrow sets activeTab back to "forecast"
- Parent state preserved while Forge is open

## Typography

- IBM Plex Mono: all metrics, scores, regulation refs, numerical values, status labels
- System/Inter: UI labels, descriptions, button text

## Keyboard Shortcuts

- `/` — SlashCommand
- Delete/Backspace — Remove selected
- Cmd+Z — Undo
- Cmd+Shift+Z — Redo
- Cmd+S — Save scenario
- Escape — Close overlay / deselect
- Space+drag — Pan
