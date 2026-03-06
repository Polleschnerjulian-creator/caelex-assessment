# Scenario Builder Overhaul — Design Document

**Date:** 2026-03-06
**Scope:** Expand from 6 to 55 blocks, add rich results visualization, integrate Ephemeris theme

## 1. Block Catalog (55 blocks, 7 categories)

### ORBITAL MECHANICS (8)

1. **Orbit Raise** — altitude delta (10-200 km), fuel cost %
2. **Orbit Lower** — altitude delta (10-100 km), fuel cost %
3. **Orbit Plane Change** — inclination delta (1-15°), fuel cost %
4. **Orbital Slot Change** — target slot (GEO), fuel cost %
5. **Collision Avoidance Maneuver** — miss distance (1-50 km), fuel cost (0.1-5%)
6. **Deorbit Execute** — target alt (200-400 km), fuel cost (5-30%)
7. **Constellation Resize** — fleet delta (-5 to +10)
8. **Atmospheric Drag Increase** — factor (1.5x-5x)

### HARDWARE FAILURES (12)

9. **Thruster Failure** — no params
10. **Reaction Wheel Failure** — wheels lost (1-3 of 4)
11. **Solar Panel Degradation** — capacity loss (5-50%)
12. **Battery Degradation** — capacity loss (5-50%)
13. **Antenna Degradation** — link margin loss (3-20 dB)
14. **Attitude Control Anomaly** — severity (tumble/drift/bias)
15. **Thermal Control Failure** — no params
16. **Sensor Degradation** — type (star tracker/sun sensor/GPS), severity
17. **Payload Failure** — no params
18. **Passivation Failure** — no params
19. **Propellant Leak** — rate (%/month)
20. **Power Bus Anomaly** — severity (brownout/shutdown)

### SPACE ENVIRONMENT (6)

21. **Solar Storm** — intensity (G1-G5)
22. **Coronal Mass Ejection** — velocity (500-3000 km/s), direction (direct/glancing)
23. **Solar Particle Event** — fluence level (moderate/severe/extreme)
24. **Debris Cloud Event** — proximity (near/adjacent/direct), density
25. **Micrometeoroid Impact** — severity (surface/penetrating)
26. **Electrostatic Discharge** — no params

### COMMUNICATION & DATA (5)

27. **Communication Failure** — severity (partial/total), duration (1-30 days)
28. **Ground Station Loss** — stations (1-3), duration (days)
29. **Frequency Interference** — band, severity (minor/major)
30. **Cyber Incident** — severity (low/medium/high/critical)
31. **Data Breach** — records affected, personal data (yes/no)

### REGULATORY & LEGAL (12)

32. **Jurisdiction Change** — target country (DE/NO/GB/LU/FR/IT/SE)
33. **Operator Type Change** — type (SCO/LO/LSO/ISOS/CAP/PDP/TCO)
34. **Regulatory Change** — framework (EU Space Act/NIS2/IADC), severity
35. **Insurance Lapse** — duration (1-12 months)
36. **NCA Audit Trigger** — authority, scope (full/targeted)
37. **Licensing Condition Change** — type (add/modify/remove)
38. **Debris Remediation Order** — deadline (30-365 days)
39. **Mandatory Maneuver Order** — reason, deadline (days)
40. **Spectrum Reallocation** — timeline (months)
41. **Treaty/Agreement Change** — treaty (OST/Liability/Registration), change type
42. **Liability Claim** — amount, basis (fault/absolute)
43. **NIS2 Notification Trigger** — incident class

### OPERATIONAL (7)

44. **EOL Extension** — years (1-10)
45. **Launch Delay** — months (1-24)
46. **Mission Scope Change** — direction (expand/reduce), magnitude %
47. **Software Anomaly** — subsystem (AOCS/TT&C/payload/power)
48. **Service Interruption** — duration (hours), customers affected %
49. **Operations Team Change** — personnel loss %, training gap months
50. **Frequency Band Migration** — timeline (months), cost factor

### FINANCIAL & BUSINESS (5)

51. **Insurance Premium Increase** — increase % (10-200%)
52. **Supply Chain Disruption** — component type, lead time (months)
53. **Sanctions/Export Control** — target country, component
54. **Budget Cut** — reduction % (10-50%)
55. **Partner/Supplier Default** — criticality (low/medium/high)

## 2. Results Panel Overhaul

### Compliance Timeline Chart

- SVG mini-chart, 12-month projection
- Baseline (dashed) vs projected (solid) compliance score
- Crossover point highlighted
- Module-level breakdown on hover

### Risk Heatmap

- 8-column grid (one per compliance module)
- Before/after color-coded cells
- Color scale: green (COMPLIANT) → amber (WARNING) → red (NON_COMPLIANT)

### Impact Summary Card

- Severity badge: LOW / MEDIUM / HIGH / CRITICAL
- Derived from aggregated deltas
- Confidence band: ±20% on horizon delta

### Cost Estimate Section

- Fuel cost in kg propellant
- Financial impact estimate where applicable

### Step Breakdown (enhanced)

- Each step shows block icon + name instead of raw scenario type
- Before → after compliance score per step
- Cumulative delta visualization

## 3. Block Palette Redesign

### Collapsible Categories

- 7 collapsible sections with block counts
- Category icons and color coding
- Search/filter input at top of palette
- Scrollable within sidebar area

## 4. Theme Integration

Convert all scenario builder files to use `useEphemerisTheme()`:

- ScenarioBuilder.tsx
- BlockPalette.tsx
- ScenarioPipeline.tsx
- PipelineBlock.tsx
- ResultsPanel.tsx

Replace hardcoded colors (#111827, #E5E7EB, etc.) with theme variables (C.textPrimary, C.border, etc.)

## 5. Backend: What-If Engine Expansion

### New Scenario Type Handlers

Add handlers to `what-if-engine.ts` for all 49 new scenario types (55 total minus 6 existing).

### Handler Pattern

Each handler receives `SatelliteComplianceStateInternal` + scenario parameters, returns `WhatIfResult` with:

- Horizon delta
- Affected regulations
- Fuel impact (if applicable)
- Recommendation text

### Grouping

Handlers organized into separate files by category to keep what-if-engine.ts manageable:

- `handlers/orbital.ts`
- `handlers/hardware.ts`
- `handlers/environment.ts`
- `handlers/communication.ts`
- `handlers/regulatory.ts`
- `handlers/operational.ts`
- `handlers/financial.ts`
