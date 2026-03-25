# Copernicus Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Copernicus Sentinel-5P atmospheric data into the Environmental module to verify operator-declared Environmental Footprint Declarations against real satellite measurements, with a map visualization.

**Architecture:** New `copernicus-cams-provider.server.ts` following the existing data-sources provider pattern (EU-first). Sentinel Hub Statistical API returns computed NO2/CO/aerosol stats as JSON. Sentinel Hub Process API returns colored map tiles as PNG. New API routes expose this to the frontend. New dashboard section in the Environmental module shows verification results + satellite imagery.

**Tech Stack:** Sentinel Hub Statistical API (CDSE), Sentinel Hub Process API (CDSE), OAuth2 client credentials, existing data-sources provider pattern, React + inline styles (matching existing module pattern)

**Auth:** CDSE OAuth2 — needs `COPERNICUS_CLIENT_ID` and `COPERNICUS_CLIENT_SECRET` env vars. Free registration at https://dataspace.copernicus.eu.

---

## File Structure

### New Files

| File                                                                            | Responsibility                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/lib/data-sources/providers/copernicus-cams-provider.server.ts`             | Sentinel Hub auth + Statistical API + Process API calls  |
| `src/lib/data-sources/types-environmental.ts`                                   | Types for atmospheric data, verification results         |
| `src/app/api/environmental/copernicus/route.ts`                                 | GET atmospheric stats for a launch site                  |
| `src/app/api/environmental/copernicus/map/route.ts`                             | GET Sentinel-5P map image (PNG proxy)                    |
| `src/app/dashboard/modules/environmental/components/CopernicusVerification.tsx` | Dashboard section with stats + map + verification badges |
| `src/data/launch-sites.ts`                                                      | Launch site name → lat/lon/radius mapping                |

### Modified Files

| File                                               | Change                                   |
| -------------------------------------------------- | ---------------------------------------- |
| `src/lib/data-sources/index.ts`                    | Export copernicus provider               |
| `src/lib/data-sources/router.server.ts`            | Add `fetchAtmosphericDataWithFallback()` |
| `src/app/dashboard/modules/environmental/page.tsx` | Add CopernicusVerification section       |

---

## Task 1: Launch Site Coordinates Data

**Files:**

- Create: `src/data/launch-sites.ts`

- [ ] **Step 1: Create launch site coordinate mapping**

Maps launch vehicle / launch site names (already in EnvironmentalAssessment schema) to geographic coordinates for Sentinel-5P queries.

```typescript
// src/data/launch-sites.ts
export interface LaunchSiteCoords {
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  country: string;
}

export const LAUNCH_SITES: Record<string, LaunchSiteCoords> = {
  kourou: {
    name: "Guiana Space Centre (CSG)",
    lat: 5.236,
    lon: -52.775,
    radiusKm: 30,
    country: "FR-GF",
  },
  cape_canaveral: {
    name: "Cape Canaveral SFS",
    lat: 28.396,
    lon: -80.605,
    radiusKm: 20,
    country: "US",
  },
  vandenberg: {
    name: "Vandenberg SFB",
    lat: 34.632,
    lon: -120.611,
    radiusKm: 20,
    country: "US",
  },
  baikonur: {
    name: "Baikonur Cosmodrome",
    lat: 45.965,
    lon: 63.305,
    radiusKm: 30,
    country: "KZ",
  },
  mahia: {
    name: "Rocket Lab LC-1",
    lat: -39.262,
    lon: 177.864,
    radiusKm: 15,
    country: "NZ",
  },
  esrange: {
    name: "Esrange Space Center",
    lat: 67.893,
    lon: 21.104,
    radiusKm: 20,
    country: "SE",
  },
  andoya: {
    name: "Andøya Spaceport",
    lat: 69.294,
    lon: 16.021,
    radiusKm: 15,
    country: "NO",
  },
};

// Map launch vehicles to their primary launch sites
export const VEHICLE_LAUNCH_SITES: Record<string, string> = {
  ariane_6: "kourou",
  vega_c: "kourou",
  falcon_9: "cape_canaveral",
  falcon_heavy: "cape_canaveral",
  electron: "mahia",
  soyuz: "baikonur",
  generic_small: "kourou",
};

export function getLaunchSiteForVehicle(
  vehicle: string,
): LaunchSiteCoords | null {
  const siteKey = VEHICLE_LAUNCH_SITES[vehicle];
  return siteKey ? (LAUNCH_SITES[siteKey] ?? null) : null;
}

export function bboxFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): [number, number, number, number] {
  const delta = radiusKm / 111; // rough deg per km
  return [lon - delta, lat - delta, lon + delta, lat + delta];
}

export function polygonFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): number[][] {
  const d = radiusKm / 111;
  return [
    [lon - d, lat - d],
    [lon + d, lat - d],
    [lon + d, lat + d],
    [lon - d, lat + d],
    [lon - d, lat - d],
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/launch-sites.ts
git commit -m "feat(copernicus): add launch site coordinate mapping"
```

---

## Task 2: Types for Atmospheric Data

**Files:**

- Create: `src/lib/data-sources/types-environmental.ts`

- [ ] **Step 1: Define atmospheric data types**

```typescript
// src/lib/data-sources/types-environmental.ts
import "server-only";
import type { ProviderInfo, DataFetchResult } from "./types";

export interface AtmosphericStats {
  variable: string;
  unit: string;
  mean: number;
  min: number;
  max: number;
  stDev: number;
  sampleCount: number;
}

export interface AtmosphericData {
  launchSite: string;
  lat: number;
  lon: number;
  radiusKm: number;
  dateRange: { from: string; to: string };
  measurements: AtmosphericStats[];
  observedAt: string;
  source: ProviderInfo;
}

export interface VerificationResult {
  metric: string;
  declared: number | null;
  measured: number;
  unit: string;
  deviation: number | null; // percent
  status: "verified" | "warning" | "discrepancy" | "no_data";
}

export interface CopernicusVerificationReport {
  launchSite: string;
  atmospheric: AtmosphericData;
  verifications: VerificationResult[];
  overallStatus: "verified" | "warning" | "discrepancy" | "pending";
  mapImageUrl: string | null;
}

export interface EnvironmentalDataProvider {
  getInfo(): ProviderInfo;
  isConfigured(): boolean;
  fetchAtmosphericStats(
    lat: number,
    lon: number,
    radiusKm: number,
    dateRange: { from: string; to: string },
    variables?: string[],
  ): Promise<AtmosphericData | null>;
  fetchMapImage(
    lat: number,
    lon: number,
    radiusKm: number,
    variable: string,
    dateRange: { from: string; to: string },
  ): Promise<Buffer | null>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data-sources/types-environmental.ts
git commit -m "feat(copernicus): add atmospheric data types"
```

---

## Task 3: Copernicus Provider (Sentinel Hub)

**Files:**

- Create: `src/lib/data-sources/providers/copernicus-cams-provider.server.ts`
- Modify: `src/lib/data-sources/index.ts`
- Modify: `src/lib/data-sources/router.server.ts`

- [ ] **Step 1: Implement the Copernicus provider**

Core responsibilities:

1. OAuth2 token management (client credentials flow against CDSE identity server)
2. Statistical API calls — get mean/min/max NO2, CO, aerosol for a polygon
3. Process API calls — render a colored NO2 map as PNG

OAuth2 endpoint: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
Statistical API: `https://sh.dataspace.copernicus.eu/api/v1/statistics`
Process API: `https://sh.dataspace.copernicus.eu/api/v1/process`

The provider must:

- Cache the OAuth token (expires after ~5 min, refresh on 401)
- Use `sentinel-5p-l2` collection with `minQa: 50` for quality filter
- For stats: request NO2, CO, AER_AI_340_380 with `P1D` aggregation
- For map: use an evalscript that colorizes NO2 values on a blue-red scale
- Follow the existing provider pattern (`getInfo()`, `isConfigured()`, etc.)

Evalscript for NO2 visualization (returns RGB image):

```javascript
//VERSION=3
function setup() {
  return {
    input: ["NO2", "dataMask"],
    output: { bands: 4 },
  };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return [0, 0, 0, 0];
  let v = s.NO2 * 1e5; // scale to visible range
  let r = Math.min(1, Math.max(0, v * 3));
  let g = Math.min(1, Math.max(0, 1 - Math.abs(v - 0.5) * 4));
  let b = Math.min(1, Math.max(0, 1 - v * 2));
  return [r * 255, g * 255, b * 255, 200];
}
```

Env vars: `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`

- [ ] **Step 2: Export in index.ts and add router function**

In `src/lib/data-sources/index.ts`, add:

```typescript
export { copernicusProvider } from "./providers/copernicus-cams-provider.server";
```

In `src/lib/data-sources/router.server.ts`, add:

```typescript
export async function fetchAtmosphericDataWithFallback(
  lat: number, lon: number, radiusKm: number,
  dateRange: { from: string; to: string },
): Promise<DataFetchResult<AtmosphericData>> { ... }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/data-sources/providers/copernicus-cams-provider.server.ts src/lib/data-sources/index.ts src/lib/data-sources/router.server.ts
git commit -m "feat(copernicus): add Sentinel Hub provider with stats + map image"
```

---

## Task 4: API Routes

**Files:**

- Create: `src/app/api/environmental/copernicus/route.ts`
- Create: `src/app/api/environmental/copernicus/map/route.ts`

- [ ] **Step 1: Stats route**

`GET /api/environmental/copernicus?assessmentId=xxx`

1. Auth check
2. Load EnvironmentalAssessment from DB (get launchVehicle)
3. Resolve launch site coordinates via `getLaunchSiteForVehicle()`
4. Call `fetchAtmosphericDataWithFallback()`
5. Return JSON with atmospheric stats + verification results

- [ ] **Step 2: Map image route**

`GET /api/environmental/copernicus/map?assessmentId=xxx&variable=NO2`

1. Auth check
2. Resolve launch site from assessment
3. Call `copernicusProvider.fetchMapImage()`
4. Return PNG with `Content-Type: image/png`
5. Cache with `Cache-Control: public, max-age=3600`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/environmental/copernicus/
git commit -m "feat(copernicus): add atmospheric data + map image API routes"
```

---

## Task 5: CopernicusVerification Dashboard Component

**Files:**

- Create: `src/app/dashboard/modules/environmental/components/CopernicusVerification.tsx`

- [ ] **Step 1: Build the verification component**

The component shows 3 sections:

**A) Header** — "Copernicus Satellite Verification" with EU flag icon + Sentinel-5P badge

**B) Stats Grid** — 3 cards showing:

- NO2 concentration (mol/m2) with trend indicator
- CO concentration (mol/m2)
- Aerosol Index
  Each card shows the measured value, the declared value (if any), and a verification badge (checkmark/warning)

**C) Satellite Map** — Full-width image loaded from `/api/environmental/copernicus/map?assessmentId=xxx&variable=NO2`, styled with glass panel, showing the colored NO2 concentration over the launch site area. Below the map: attribution text "Data: Copernicus Sentinel-5P TROPOMI | ESA/EU"

**D) Verification Summary** — Status bar: "Environmental data verified against Copernicus measurements" with overall status badge

Style: Follow existing glassmorphism pattern from the environmental module. Use `useForgeTheme` or inline dark/light styles matching existing components.

Props:

```typescript
interface CopernicusVerificationProps {
  assessmentId: string;
  launchVehicle: string;
}
```

State: fetch from `/api/environmental/copernicus?assessmentId=xxx` on mount.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/modules/environmental/components/CopernicusVerification.tsx
git commit -m "feat(copernicus): add CopernicusVerification dashboard component"
```

---

## Task 6: Wire Into Environmental Module Page

**Files:**

- Modify: `src/app/dashboard/modules/environmental/page.tsx`

- [ ] **Step 1: Add CopernicusVerification to the environmental dashboard**

Find the section after the EFD calculation results (after the grade display / impact breakdown). Add the CopernicusVerification component there, passing the current assessment ID and launch vehicle.

Only render when an assessment has been calculated (has `efdGrade` set).

```tsx
{
  assessment?.efdGrade && (
    <CopernicusVerification
      assessmentId={assessment.id}
      launchVehicle={assessment.launchVehicle}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/modules/environmental/page.tsx
git commit -m "feat(copernicus): integrate verification into environmental dashboard"
```

---

## Task 7: Environment Variables + Final Wiring

- [ ] **Step 1: Add env vars to .env.local**

```
COPERNICUS_CLIENT_ID=<from CDSE dashboard>
COPERNICUS_CLIENT_SECRET=<from CDSE dashboard>
```

- [ ] **Step 2: Register at Copernicus Data Space**

1. Go to https://dataspace.copernicus.eu
2. Create free account
3. Dashboard → User Settings → OAuth Clients → Create new
4. Copy client_id and client_secret to env

- [ ] **Step 3: Test end-to-end**

1. Open Environmental module
2. Create/load an assessment with a launch vehicle selected
3. Run EFD calculation
4. CopernicusVerification section should appear with real Sentinel-5P data
5. Map image should load showing NO2 concentration

- [ ] **Step 4: Final commit + push**

```bash
git add -A
git commit -m "feat(copernicus): complete Sentinel-5P integration for EFD verification"
git push origin main
```

---

## Execution Order (Parallelizable)

```
Task 1 (launch-sites.ts)  ─┐
Task 2 (types)             ─┼─→ Task 3 (provider) ─→ Task 4 (API routes) ─→ Task 6 (wire in)
                            │                                                      ↑
                            └─────────────────────────→ Task 5 (component) ────────┘
                                                                                    ↓
                                                                            Task 7 (env + test)
```

Tasks 1+2 are independent → can run in parallel.
Task 3 depends on 1+2.
Tasks 4+5 can run in parallel after 3.
Task 6 depends on 4+5.
Task 7 is final integration.

**Estimated time: 6-8 hours total, ~4-5 hours with parallel execution.**
