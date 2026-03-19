# Caelex — External Data Sources

## Architecture

Caelex uses a **dual-source architecture** with EU providers as primary and US providers as fallback. Every data fetch is logged with source provenance for compliance audit trail.

```
DataSourceRouter
  ├── EU Primary
  │   ├── ESA DISCOS      (object catalog)
  │   ├── ESA SWE HAPI    (space weather: F10.7, Kp)
  │   └── EU SST          (conjunctions — pending registration)
  │
  └── US Fallback
      ├── CelesTrak        (TLE/orbital elements)
      ├── NOAA SWPC        (space weather: F10.7, Kp, G/S/R scales)
      └── Space-Track      (CDMs)
```

## Provider Summary

| Provider         | Region     | Data Type                                 | Auth                            | Rate Limit         | Status               |
| ---------------- | ---------- | ----------------------------------------- | ------------------------------- | ------------------ | -------------------- |
| **ESA DISCOS**   | EU         | Object catalog (mass, class, launch date) | Bearer token (ESA Cosmos)       | 100 req/min        | Ready                |
| **ESA SWE HAPI** | EU         | Space weather (F10.7, Kp)                 | None                            | Unknown            | Ready                |
| **EU SST**       | EU         | Conjunction warnings (CDMs)               | Institutional (EU Reg 2021/696) | Portal-based       | Pending registration |
| **CelesTrak**    | US         | TLE/GP orbital elements                   | None                            | Undocumented       | Active               |
| **NOAA SWPC**    | US         | Solar flux, Kp, G/S/R scales              | None                            | Undocumented       | Active               |
| **Space-Track**  | US         | CDMs (conjunction data)                   | Username/password               | Batched (2s delay) | Active               |
| **LeoLabs**      | Commercial | CDMs (alternative)                        | Bearer token (operator BYOK)    | Per-contract       | Optional             |

## Environment Variables

### EU Sources

| Variable            | Required   | Description                                                  |
| ------------------- | ---------- | ------------------------------------------------------------ |
| `EU_DISCOS_API_KEY` | For DISCOS | ESA Cosmos Bearer token. Register at https://cosmos.esa.int  |
| `EU_SST_API_KEY`    | For EU SST | Institutional access token. Register at https://www.eusst.eu |

### US Sources

| Variable              | Required | Description              |
| --------------------- | -------- | ------------------------ |
| `SPACETRACK_IDENTITY` | For CDMs | Space-Track.org username |
| `SPACETRACK_PASSWORD` | For CDMs | Space-Track.org password |

### Commercial

| Variable                         | Required | Description                                          |
| -------------------------------- | -------- | ---------------------------------------------------- |
| Per-org `CAConfig.leolabsApiKey` | Optional | LeoLabs API key (encrypted in DB, operator provides) |

## Routing Logic

### Orbital Elements (TLEs)

**Primary: CelesTrak** (US) — CelesTrak remains primary because neither DISCOS nor EU SST provide current TLE data via API. DISCOS has catalog characteristics only (mass, dimensions, object class), not ephemeris data.

### Conjunction Data (CDMs)

**Primary: EU SST** (pending) → **Fallback: Space-Track** (US)
EU SST requires registration as a "user entity" under EU Regulation 2021/696 via the EU SST Front Desk. Until registration is complete, Space-Track is used automatically.

### Space Weather (F10.7, Kp)

**Primary: ESA SWE HAPI** (EU) → **Fallback: NOAA SWPC** (US)
ESA SWE provides F10.7 and Kp indices through the HAPI (Heliophysics API) server. If the HAPI server is unreachable, NOAA SWPC is used.

### Object Catalog

**Primary: ESA DISCOS** (EU) — no fallback needed.
Rich catalog data including mass, dimensions, object class, launch/decay dates.

## Data Fetch Result

Every fetch through the router returns a `DataFetchResult<T>`:

```typescript
{
  data: T | null,
  source: { name, region, baseUrl },
  fetchedAt: string,
  fallbackUsed: boolean,
  primaryFailureReason: string | null,
  durationMs: number,
}
```

## Cron Schedule

| Time (UTC) | Job                  | Source               | Model                    |
| ---------- | -------------------- | -------------------- | ------------------------ |
| 04:00      | Solar flux polling   | ESA SWE → NOAA       | SolarFluxRecord          |
| 05:00      | Orbital data polling | CelesTrak            | OrbitalData              |
| 06:00      | Ephemeris daily      | Uses above data      | SatelliteComplianceState |
| \*/30 min  | CDM polling          | EU SST → Space-Track | ConjunctionEvent         |

## File Structure

```
src/lib/data-sources/
├── types.ts                                  — Interfaces for all providers
├── router.server.ts                          — Smart EU-first routing with fallback
├── index.ts                                  — Barrel exports
└── providers/
    ├── discos-provider.server.ts             — ESA DISCOS (EU, catalog)
    ├── esa-swe-provider.server.ts            — ESA SWE HAPI (EU, space weather)
    ├── eu-sst-provider.server.ts             — EU SST stub (EU, conjunctions)
    ├── celestrak-provider.server.ts          — CelesTrak wrapper (US, TLEs)
    ├── noaa-provider.server.ts               — NOAA SWPC wrapper (US, weather)
    └── spacetrack-provider.server.ts         — Space-Track wrapper (US, CDMs)
```

## Registration Guide

### ESA DISCOS (5 minutes)

1. Go to https://cosmos.esa.int and create an account
2. Navigate to DISCOS settings and generate a personal access token
3. Set `EU_DISCOS_API_KEY` in your environment

### EU SST (weeks — institutional)

1. Go to https://www.eusst.eu
2. Register your organization as a "user entity" under EU Regulation 2021/696
3. Provide satellite NORAD IDs / COSPAR designators
4. Wait for approval (institutional process)
5. Once approved, set `EU_SST_API_KEY` in your environment

### Space-Track (5 minutes)

1. Go to https://www.space-track.org and create an account
2. Set `SPACETRACK_IDENTITY` and `SPACETRACK_PASSWORD`
