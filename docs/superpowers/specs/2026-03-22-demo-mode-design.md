# Demo Mode — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Admin-toggle that populates the current organization with realistic demo data for CASSINI Challenge presentations. A fictional EU operator "EuroSat Operations GmbH" with 3 real ESA satellites, active conjunction events, compliance scores, generated documents, Verity attestations, Sentinel agents, NCA submissions, and timeline deadlines.

## Demo Fleet

| Satellite            | NORAD | COSPAR    | Orbit        | Demo Role                                   |
| -------------------- | ----- | --------- | ------------ | ------------------------------------------- |
| Sentinel-2A          | 40697 | 2015-028A | LEO 786km    | Earth Observation, primary compliance focus |
| Galileo-FOC FM10     | 41859 | 2016-069A | MEO 23,222km | Navigation, MEO-specific obligations        |
| EUTELSAT HOTBIRD 13G | 52040 | 2022-053A | GEO 35,786km | Telecom, GEO regime + insurance             |

## Demo Data Per Module

### 1. Compliance Dashboard

- Overall Score: 78%
- Breakdown: Debris 92%, Cybersecurity 71%, Authorization 85%, Insurance 65%, Environmental 80%
- 30-day trend (slightly improving)

### 2. Shield (3 Conjunction Events)

- **EMERGENCY**: Sentinel-2A vs Cosmos-2251 debris — Pc 2.3e-4, 340m, TCA in 18h, decision pending, CNES 72h deadline active
- **ELEVATED**: Galileo-FOC vs SL-8 rocket body — Pc 8.1e-6, 890m, decision MONITOR
- **CLOSED**: HOTBIRD vs defunct Intelsat — ACCEPT_RISK, report generated, Verity attestation created

### 3. Document Generator

- 3 documents: DMP (completed), Cyber Policy (completed), Authorization App (draft)

### 4. Verity

- 6 attestations: 4x PASS, 2x FAIL
- 1 certificate (HIGH trust)
- 1 passport (score 78%)
- 8 audit chain entries

### 5. Mission Control

- 3 Spacecraft with real NORAD IDs → CelesTrak globe works automatically
- Jurisdictions: DE, FR, GB

### 6. Timeline

- 5 future deadlines (14d to 180d)
- 2 past milestones

### 7. Sentinel

- 1 agent "eurosat-gcs-primary" (ACTIVE, v2.1.0)
- 15 evidence packets
- Valid chain, trust 0.85-0.95

### 8. NCA Portal

- 1 CNES submission (UNDER_REVIEW)
- 1 BNetzA submission (DRAFT)

### 9. Ontology

- Already seeded (390 nodes, 1713 edges) — no demo data needed

## Admin UI

In `/dashboard/admin`, new "Demo Mode" section:

- Toggle button: "Activate Demo Mode" / "Deactivate Demo Mode"
- Warning text about data creation/deletion
- Status indicator

## Technical Architecture

```
src/lib/demo/
├── seed-demo.server.ts     — Creates all demo data for an org
├── demo-data.ts            — Static demo data definitions
├── cleanup-demo.server.ts  — Removes all demo data
└── types.ts                — Demo types

src/app/api/admin/demo-mode/route.ts — Activate/deactivate endpoint
```

### Tagging Strategy

All demo records tagged with `{ _demo: true }` in JSON metadata fields or `[DEMO]` prefix in names. Cleanup queries by this tag.

### Seed is idempotent — cleanup first, then seed.
