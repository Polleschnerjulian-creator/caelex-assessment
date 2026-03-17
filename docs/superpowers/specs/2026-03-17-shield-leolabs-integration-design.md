# Shield LeoLabs CDM Integration — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Add LeoLabs as a second CDM (Conjunction Data Message) source alongside Space-Track in Caelex Shield. Operators bring their own LeoLabs API key (BYOK model). Zero cost for Caelex. LeoLabs CDMs are normalized into Shield's existing `ParsedCDM` format and processed identically to Space-Track CDMs.

### Constraints

- **No cost to Caelex** — operator provides their own LeoLabs API key
- **Data usage rights** — CDMs belong to the operator's LeoLabs contract; Caelex processes them on operator's behalf
- **CDMs only** — no tracking data, no screening-as-a-service (license implications)
- **Backwards compatible** — Space-Track remains the default; LeoLabs is opt-in per organization
- **Existing Shield flow untouched** — ConjunctionEvent, Risk Classifier, Decision Engine, Dashboard all unchanged

---

## Architecture

```
CURRENT:
  Space-Track API ──▶ CDM Polling Cron ──▶ Parse ──▶ ConjunctionEvent

NEW:
  Space-Track API ──┐
                    ├──▶ CDM Normalizer ──▶ ConjunctionEvent
  LeoLabs API ──────┘
                    (parallel fetch, merge by conjunction ID)
```

### Components

| Component        | File                                      | Purpose                                        |
| ---------------- | ----------------------------------------- | ---------------------------------------------- |
| LeoLabs Client   | `src/lib/shield/leolabs-client.server.ts` | REST client for LeoLabs Conjunction API        |
| CDM Normalizer   | Update in `cdm-polling/route.ts`          | Merge CDMs from both sources                   |
| Config Extension | Update `CAConfig` model + Settings UI     | Store encrypted API key, enable/disable toggle |
| Source Tracking  | Update `CDMRecord` model                  | New `source` field to distinguish CDM origin   |

---

## Feature 1: LeoLabs Client

### File: `src/lib/shield/leolabs-client.server.ts`

Server-only module following the same pattern as `space-track-client.server.ts`.

### LeoLabs Conjunction API

- **Base URL:** `https://api.leolabs.space/v1`
- **Auth:** Bearer token in `Authorization` header
- **Endpoint:** `GET /conjunctions` with query params for NORAD IDs and time range
- **Response:** Array of conjunction objects with Pc, miss distance, TCA, object identifiers

### Interface

```typescript
interface LeoLabsClientConfig {
  apiKey: string; // Operator's Bearer token
  baseUrl?: string; // Default: https://api.leolabs.space/v1
  timeoutMs?: number; // Default: 30000
}

// Exported functions:
async function fetchLeoLabsCDMs(
  config: LeoLabsClientConfig,
  noradIds: string[],
  since: Date,
): Promise<ParsedCDM[]>;

async function testLeoLabsConnection(
  apiKey: string,
): Promise<{ ok: boolean; error?: string }>;
```

### CDM Mapping

LeoLabs conjunction fields → Shield's `ParsedCDM`:

| LeoLabs Field              | ParsedCDM Field     |
| -------------------------- | ------------------- |
| `conjunction_id`           | `conjunctionId`     |
| `probability_of_collision` | `pc`                |
| `miss_distance_km`         | `missDistanceKm`    |
| `time_of_closest_approach` | `tca`               |
| `primary.norad_id`         | `primaryNoradId`    |
| `secondary.norad_id`       | `secondaryNoradId`  |
| `primary.position_xyz`     | `primaryPosition`   |
| `secondary.position_xyz`   | `secondaryPosition` |

### Error Handling

- 401/403: Log "LeoLabs API key invalid or expired", disable polling for this org until key is updated
- 429: Respect `Retry-After` header, backoff
- 5xx: Retry with exponential backoff (max 3 attempts)
- Network timeout: Log warning, continue with Space-Track data only

---

## Feature 2: Schema Changes

### CAConfig — New Fields

```prisma
model CAConfig {
  // ... existing fields unchanged ...
  leolabsEnabled    Boolean  @default(false)
  leolabsApiKey     String?  @db.Text    // Encrypted (AES-256-GCM)
}
```

### CDMRecord — Source Tracking

```prisma
model CDMRecord {
  // ... existing fields unchanged ...
  source            String   @default("space_track")  // "space_track" | "leolabs"
}
```

### Migration

- Both fields have defaults → non-breaking migration
- Existing CDMRecords get `source: "space_track"` automatically

---

## Feature 3: CDM Polling Extension

### File: `src/app/api/cron/cdm-polling/route.ts`

Current flow:

1. Get all orgs with spacecraft
2. For each org: fetch CDMs from Space-Track
3. Process CDMs (classify, create events, log escalations)

New flow:

1. Get all orgs with spacecraft
2. For each org:
   a. Fetch CDMs from Space-Track (always)
   b. If `leolabsEnabled && leolabsApiKey`: fetch CDMs from LeoLabs (parallel)
   c. Merge CDMs by conjunction ID
3. Process merged CDMs (unchanged)

### Merge Logic

```typescript
function mergeCDMs(
  spaceTrackCDMs: ParsedCDM[],
  leoLabsCDMs: ParsedCDM[],
): ParsedCDM[];
```

Rules:

- Match by: same primary + secondary NORAD IDs + TCA within 1 hour window
- If both sources report same conjunction: use LeoLabs data (more recent/accurate), tag `source: "leolabs"`
- If only one source reports: use that source's data
- All CDMs are stored regardless (full audit trail with source tracking)

### API Key Decryption

The LeoLabs API key is stored encrypted. Before polling:

```typescript
const decryptedKey = decrypt(config.leolabsApiKey);
```

Uses the existing `src/lib/encryption.ts` AES-256-GCM functions.

---

## Feature 4: Settings UI Extension

### File: `src/app/dashboard/shield/page.tsx` (Settings tab)

Add a "LeoLabs Integration" section below the existing Space-Track connection status:

```
LeoLabs Integration
─────────────────────────────────────
Status: [Disabled / Connected / Error]

API Key: [••••••••abc123    ] [Test] [Save]

☐ Enable LeoLabs CDM polling

ℹ Provide your LeoLabs API key to receive faster,
  higher-accuracy conjunction data alongside Space-Track.
  Your key is encrypted and never shared.
```

### Test Button

Calls `testLeoLabsConnection(apiKey)` via a new API endpoint:

```
POST /api/shield/config/test-leolabs
  Body: { apiKey: string }
  Response: { ok: boolean; error?: string }
```

### Save Flow

1. Encrypt API key client-side? No — send plaintext over HTTPS, encrypt server-side before storage
2. Update `CAConfig` via existing `PUT /api/shield/config` endpoint (add new fields to Zod schema)

---

## Feature 5: Dashboard Source Indicator

### Minimal UI change in Event Detail page

CDM table and CDM cards show a small badge indicating source:

```
CDM #247  ·  2026-03-17 14:32  ·  Pc: 2.1e-5  ·  [Space-Track]
CDM #248  ·  2026-03-17 14:45  ·  Pc: 1.8e-5  ·  [LeoLabs]
```

Badge colors: Space-Track = slate, LeoLabs = blue.

---

## API Changes Summary

| Route                                   | Change                                                            |
| --------------------------------------- | ----------------------------------------------------------------- |
| `PUT /api/shield/config`                | Accept `leolabsEnabled`, `leolabsApiKey` fields                   |
| `GET /api/shield/config`                | Return `leolabsEnabled` (never return decrypted key, only masked) |
| `POST /api/shield/config/test-leolabs`  | NEW — test LeoLabs API key validity                               |
| `GET /api/shield/events/[eventId]/cdms` | CDMs now include `source` field                                   |
| `/api/cron/cdm-polling`                 | Poll LeoLabs in parallel when enabled                             |

---

## Files to Create

| File                                              | Purpose                      |
| ------------------------------------------------- | ---------------------------- |
| `src/lib/shield/leolabs-client.server.ts`         | LeoLabs REST client          |
| `src/lib/shield/leolabs-client.test.ts`           | Client unit tests            |
| `src/lib/shield/cdm-merger.server.ts`             | Cross-source CDM merge logic |
| `src/lib/shield/cdm-merger.test.ts`               | Merger unit tests            |
| `src/app/api/shield/config/test-leolabs/route.ts` | API key test endpoint        |

## Files to Modify

| File                                          | Change                                 |
| --------------------------------------------- | -------------------------------------- |
| `prisma/schema.prisma`                        | Add fields to `CAConfig` + `CDMRecord` |
| `src/app/api/cron/cdm-polling/route.ts`       | Add LeoLabs fetch + merge step         |
| `src/app/api/shield/config/route.ts`          | Handle new config fields               |
| `src/app/dashboard/shield/page.tsx`           | LeoLabs settings section               |
| `src/app/dashboard/shield/[eventId]/page.tsx` | Source badge on CDMs                   |

## Security

- API key encrypted at rest (AES-256-GCM via `src/lib/encryption.ts`)
- Key only decrypted in server-only cron job context
- GET config endpoint returns masked key (`••••••••` + last 6 chars)
- Test endpoint validates key but does not store it
- No LeoLabs data is cached or redistributed — processed in-flight only
