# SENTINEL — Comprehensive Technical Report

**Date:** 2026-03-08
**Version:** 1.0
**Classification:** Internal — Engineering Reference
**Author:** Caelex Engineering

---

## 1. Executive Summary

Sentinel is Caelex's **autonomous compliance evidence collection subsystem** — a distributed agent architecture that deploys at satellite operator premises to continuously collect, cryptographically sign, hash-chain, and cross-verify operational compliance data. It forms the highest-trust tier in Caelex's three-tier evidence hierarchy:

| Tier       | Source     | Trust Score | Description                                                                       |
| ---------- | ---------- | ----------- | --------------------------------------------------------------------------------- |
| **Tier 1** | Sentinel   | 0.60–0.98   | Agent-collected, Ed25519-signed, hash-chained, cross-verified against public data |
| **Tier 2** | Verity     | 0.50–0.89   | Evidence-backed attestations or manual declarations                               |
| **Tier 3** | Assessment | 0.50–0.65   | Self-reported questionnaire data                                                  |

Sentinel data flows into two downstream systems:

- **Verity** — Anchors cryptographic attestations to Sentinel chain positions (SentinelAnchor)
- **Ephemeris** — Feeds compliance forecasting models with time-series telemetry

**Total codebase:** ~4,400 LOC (2,400 core + API + dashboard; 1,500 tests; 500 integration points)

---

## 2. Architecture

### 2.1 Design Principles

1. **Tamper-evident**: Every packet links to its predecessor via SHA-256 hash chain
2. **Cryptographically verifiable**: Ed25519 signatures on every packet
3. **Cross-verifiable**: Orbital data compared against public CelesTrak TLEs via SGP4
4. **Trust-scored**: 7-level hierarchy (L0–L6) reflecting evidence quality
5. **Privacy-preserving**: Actual values never stored in attestations — only commitment hashes
6. **Distributed**: Agents run at operator premises; Caelex only receives signed evidence

### 2.2 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OPERATOR PREMISES                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────┐               │
│  │           SENTINEL AGENT (Docker)                │               │
│  │                                                  │               │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │               │
│  │  │ Orbit &  │  │ Cyber    │  │ Ground   │  ... │               │
│  │  │ Debris   │  │ NIS2     │  │ Station  │      │               │
│  │  │ Collector│  │ Collector│  │ Collector│      │               │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │               │
│  │       │              │              │             │               │
│  │       └──────────────┼──────────────┘             │               │
│  │                      ▼                            │               │
│  │            ┌──────────────────┐                   │               │
│  │            │  Ed25519 Signing │                   │               │
│  │            │  + SHA-256 Hash  │                   │               │
│  │            │  + Chain Link    │                   │               │
│  │            └────────┬─────────┘                   │               │
│  └─────────────────────┼────────────────────────────┘               │
│                        │                                             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │ HTTPS POST /api/v1/sentinel/ingest
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CAELEX PLATFORM                              │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Sentinel API    │───▶│  Sentinel Service │───▶│  PostgreSQL   │  │
│  │  (7 endpoints)   │    │  (verify+store)   │    │  (Neon)       │  │
│  └─────────────────┘    └────────┬───────────┘    └───────────────┘  │
│                                  │                                   │
│                    ┌─────────────┼─────────────┐                    │
│                    ▼             ▼              ▼                    │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐      │
│  │  Cross-Verify    │  │  Verity      │  │  Ephemeris      │      │
│  │  Service         │  │  Attestation │  │  Forecasting    │      │
│  │  (CelesTrak+SGP4)│  │  (anchoring) │  │  (time-series)  │      │
│  └──────────────────┘  └──────────────┘  └─────────────────┘      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Dashboard UI                              │   │
│  │  Sentinel Monitor │ Audit Center │ Ephemeris │ Verity Certs │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 SentinelAgent

The agent registration record. Each Docker agent maps to one SentinelAgent row.

| Field               | Type            | Description                                                                            |
| ------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `id`                | String (CUID)   | Primary key                                                                            |
| `organizationId`    | String (FK)     | Owning organization                                                                    |
| `name`              | String          | Human-readable label                                                                   |
| `sentinelId`        | String (unique) | Agent identifier, format: `snt_*`                                                      |
| `publicKey`         | Text            | Ed25519 public key (PEM format)                                                        |
| `token`             | String (unique) | SHA-256 hash of bearer token                                                           |
| `status`            | String          | `PENDING` → `ACTIVE` → `REVOKED`                                                       |
| `lastSeen`          | DateTime?       | Last API contact                                                                       |
| `lastPacketAt`      | DateTime?       | Last successful packet ingestion                                                       |
| `chainPosition`     | Int             | Next expected position (monotonic counter)                                             |
| `lastChainHash`     | String?         | SHA-256 hash of most recent verified packet                                            |
| `version`           | String?         | Agent software version                                                                 |
| `configHash`        | String?         | Hash of agent configuration                                                            |
| `enabledCollectors` | String[]        | Active collectors: `orbit_debris`, `cybersecurity`, `ground_station`, `document_watch` |
| `createdAt`         | DateTime        | Registration timestamp                                                                 |
| `updatedAt`         | DateTime        | Last modification                                                                      |

**Indexes:** `organizationId`, `sentinelId`, `status`

### 3.2 SentinelPacket

Individual evidence data point submitted by an agent. Each submission creates one row.

| Field                | Type            | Description                                                                       |
| -------------------- | --------------- | --------------------------------------------------------------------------------- |
| `id`                 | String (CUID)   | Primary key                                                                       |
| `packetId`           | String (unique) | Agent-generated packet identifier                                                 |
| `agentId`            | String (FK)     | Submitting agent                                                                  |
| `satelliteNorad`     | String?         | NORAD catalog number                                                              |
| `dataPoint`          | String          | Metric key (e.g., `remaining_fuel_pct`, `orbital_parameters`)                     |
| `values`             | JSON            | Measurement values: `{ "remaining_fuel_pct": 85 }`                                |
| `sourceSystem`       | String          | Origin system: `orbit-tracker`, `cyber-nis2`, `ground-station`, `document-system` |
| `collectionMethod`   | String          | How collected: `API`, `SNMP`, `manual`                                            |
| `collectedAt`        | DateTime        | When measurement was taken                                                        |
| `complianceNotes`    | String[]        | Regulatory notes: `["Article 64 compliant"]`                                      |
| `regulationMapping`  | JSON            | `[{ ref: "art_64", status: "COMPLIANT", note: "..." }]`                           |
| **Integrity Fields** |                 |                                                                                   |
| `contentHash`        | String          | `sha256:{hex}` — hash of canonicalized data + regulation_mapping                  |
| `previousHash`       | String          | Previous packet's contentHash (or `sha256:genesis` for first)                     |
| `chainPosition`      | Int             | Sequential position (0, 1, 2, ...)                                                |
| `signature`          | String          | `ed25519:{base64}` — signature over contentHash                                   |
| `signatureValid`     | Boolean         | Signature verified against agent's public key                                     |
| `chainValid`         | Boolean         | Previous hash matches AND position incremented correctly                          |
| **Trust Fields**     |                 |                                                                                   |
| `crossVerified`      | Boolean         | Cross-verification performed and passed                                           |
| `trustScore`         | Float?          | 0.60–0.98 composite trust score                                                   |
| `processedAt`        | DateTime        | Server-side processing timestamp                                                  |

**Indexes:** `agentId`, `satelliteNorad`, `dataPoint`, `collectedAt`, `chainPosition`

### 3.3 CrossVerification

Per-metric comparison of agent data vs. public data.

| Field             | Type          | Description                                            |
| ----------------- | ------------- | ------------------------------------------------------ | ------------------------ | --- |
| `id`              | String (CUID) | Primary key                                            |
| `packetId`        | String (FK)   | Verified packet                                        |
| `agentId`         | String (FK)   | Owning agent                                           |
| `dataPoint`       | String        | Metric compared (e.g., `altitude_km`)                  |
| `agentValue`      | Float         | Value reported by Sentinel agent                       |
| `publicValue`     | Float         | Value from CelesTrak/SGP4                              |
| `publicSource`    | String        | Source identifier (e.g., `CelesTrak GP (NORAD 25544)`) |
| `delta`           | Float         | `                                                      | agentValue - publicValue | `   |
| `result`          | String        | `MATCH`, `CLOSE`, or `MISMATCH`                        |
| `confidence`      | Float         | 1.0 (MATCH), 0.6 (CLOSE), 0.1 (MISMATCH)               |
| `verifiedAt`      | DateTime      | Verification timestamp                                 |
| `publicDataEpoch` | DateTime?     | Epoch of public data used                              |

**Indexes:** `packetId`, `agentId`

---

## 4. Core Services

### 4.1 Sentinel Service

**File:** `src/lib/services/sentinel-service.server.ts` — 331 LOC

Server-only module handling authentication, registration, packet ingestion, and chain verification.

#### 4.1.1 Authentication

```
authenticateSentinelAgent(rawToken) → SentinelAgent | null
```

- Hashes raw token with SHA-256
- Looks up agent by hashed token
- Returns null if not found

Token format: `snt_{24 bytes base64url}` (~36 characters)

#### 4.1.2 Agent Registration

```
registerSentinelAgent(input) → { agent?, error?, status }
```

Flow:

1. Find organization by ID or slug
2. Check if agent with `sentinelId` already exists
3. Create new or update existing agent record
4. Store Ed25519 public key for signature verification
5. Return 201 (created) or 200 (updated)

#### 4.1.3 Packet Ingestion

```
ingestPacket(agentId, packet) → IngestResult
```

This is the critical path. Five verification steps before storage:

**Step 1 — Agent validation:**

- Agent exists and is ACTIVE

**Step 2 — Signature verification:**

```typescript
function verifyPacketSignature(
  contentHash,
  signatureStr,
  publicKeyPem,
): boolean;
```

- Strips `ed25519:` prefix from signature string
- Decodes base64 signature to Buffer
- Uses Node.js `crypto.verify(null, data, publicKey, sigBuffer)` with Ed25519
- Returns boolean (no exceptions on invalid — returns false)

**Step 3 — Hash verification:**

```typescript
function computeContentHash(data): string;
```

- Canonicalizes JSON (sorted keys, no whitespace)
- Returns `sha256:{hex}` format
- Compared against packet's declared contentHash

**Step 4 — Chain verification:**

- Checks `previousHash === agent.lastChainHash`
- Checks `chainPosition === agent.chainPosition`
- Genesis packet: `previousHash === "sha256:genesis"` AND `chainPosition === 0`

**Step 5 — Storage + state update:**

- Creates SentinelPacket record
- Updates SentinelAgent: `chainPosition++`, `lastChainHash`, `lastSeen`, `lastPacketAt`

#### 4.1.4 Chain Verification

```
verifyChain(agentId) → { valid, total_packets, breaks[] }
```

- Fetches all packets ordered by chainPosition
- Walks the chain from genesis:
  - Position 0 must have `previousHash === "sha256:genesis"`
  - Each subsequent position must increment by 1
  - Each `previousHash` must equal prior packet's `contentHash`
- Returns array of breaks with position, expected hash, actual hash

#### 4.1.5 Canonicalization

Deterministic JSON serialization for consistent hashing:

```typescript
function canonicalize(value: unknown): string;
```

- Sorted object keys
- No whitespace
- Null → `"null"`, string → escaped and quoted
- Array → canonicalized elements
- Number → `String(value)`
- Boolean → `"true"` / `"false"`

This ensures the same data always produces the same hash regardless of JSON key ordering.

---

### 4.2 Cross-Verification Service

**File:** `src/lib/services/cross-verification.server.ts` — 414 LOC

Server-only module that compares agent-reported orbital data against public CelesTrak data using SGP4 propagation.

#### 4.2.1 CelesTrak TLE Fetching

```
fetchTLE(noradId) → CelesTrakGPRecord | null
```

- Endpoint: `https://celestrak.org/NORAD/elements/gp.php?CATNR={noradId}&FORMAT=json`
- 4-hour in-memory cache per NORAD ID
- 15-second timeout
- Returns GP (General Perturbations) record with orbital elements

#### 4.2.2 SGP4 Propagation

```
propagatePosition(gp, targetDate) → PropagatedPosition | null
```

Uses `satellite.js` library:

1. Constructs TLE line 1 + line 2 from GP record fields
2. `twoline2satrec()`: Parse TLE into SGP4 satellite record
3. `propagate()`: Forward-propagate to targetDate
4. `gstime()`: Compute Greenwich Sidereal Time
5. `eciToGeodetic()`: Convert ECI (Earth-Centered Inertial) → WGS-84

Returns: `{ altitude_km, latitude_deg, longitude_deg, velocity_km_s }`

#### 4.2.3 Cross-Verification

```
crossVerifyPacket(packetId) → VerificationResult | null
```

**Eligibility:** Only packets with `dataPoint === "orbital_parameters"` AND a NORAD ID.

**Comparison metrics:**

| Metric            | Threshold | MATCH          | CLOSE         | MISMATCH      |
| ----------------- | --------- | -------------- | ------------- | ------------- |
| `altitude_km`     | 50 km     | delta < 10     | delta < 50    | delta ≥ 50    |
| `inclination_deg` | 0.5°      | delta < 0.1    | delta < 0.5   | delta ≥ 0.5   |
| `period_min`      | 2 min     | delta < 0.5    | delta < 2     | delta ≥ 2     |
| `eccentricity`    | 0.001     | delta < 0.0001 | delta < 0.001 | delta ≥ 0.001 |

**Confidence calculation:**

```
confidence = (matches × 1.0 + close × 0.6 + mismatches × 0.1) / totalChecks
```

**Result:**

- **Verified:** confidence ≥ 0.7 AND no MISMATCH
- **Plausible:** confidence 0.4–0.7 OR mostly CLOSE
- **Anomaly:** confidence < 0.4 OR multiple MISMATCH

**Side effects:**

- Creates CrossVerification records per metric
- Updates packet: `trustScore`, `crossVerified = true`

#### 4.2.4 Trust Score Computation

```
computeTrustScore({ signatureValid, chainValid, crossVerified, crossConfidence }) → number
```

| Level | Score | Requirements                       |
| ----- | ----- | ---------------------------------- |
| L0    | 0.50  | No agent (self-assessment only)    |
| L1    | 0.60  | Agent-collected, no signature      |
| L2    | 0.70  | Valid Ed25519 signature            |
| L3    | 0.80  | Valid signature + valid hash chain |
| L4    | 0.90  | L3 + cross-verified                |
| L5    | 0.95  | L4 + crossConfidence ≥ 0.90        |
| L6    | 0.98  | L4 + crossConfidence ≥ 0.98        |

---

### 4.3 Ephemeris Sentinel Adapter

**File:** `src/lib/ephemeris/data/sentinel-adapter.ts` — 231 LOC

Bridges Sentinel packet data into Ephemeris time-series format for compliance forecasting.

#### 4.3.1 Time Series Retrieval

```
getSentinelTimeSeries(prisma, orgId, noradId, dataPoint, days) → SentinelTimeSeries
```

- Fetches active agents for organization (30-second cache)
- Queries packets from last N days (default 365)
- Validates values against `METRIC_RANGES`:

| Metric                     | Min | Max     |
| -------------------------- | --- | ------- |
| `remaining_fuel_pct`       | 0   | 100     |
| `altitude_km`              | 150 | 50,000  |
| `thruster_status`          | 0   | 1       |
| `battery_state_of_charge`  | 0   | 100     |
| `solar_array_power_pct`    | 0   | 100     |
| `patch_compliance_pct`     | 0   | 100     |
| `mfa_adoption_pct`         | 0   | 100     |
| `critical_vulns_unpatched` | 0   | 1,000   |
| `mttr_minutes`             | 0   | 100,000 |

- Maps `sourceSystem` to category: `orbit`, `cyber`, `ground`, `document`
- Returns sorted TimeSeriesPoint array with trust scores

#### 4.3.2 Latest Value

```
getLatestSentinelValue(prisma, orgId, noradId, dataPoint) → { value, collectedAt, trustScore } | null
```

#### 4.3.3 Connection Status

```
getSentinelStatus(prisma, orgId, noradId) → { connected, lastPacket, packetsLast24h }
```

- Connected = packets received within last 24 hours
- Used by Ephemeris data freshness indicator

#### 4.3.4 Data Freshness Thresholds

| Classification | Age        |
| -------------- | ---------- |
| LIVE           | < 1 hour   |
| RECENT         | < 24 hours |
| STALE          | < 7 days   |
| NO_DATA        | > 7 days   |

---

## 5. API Endpoints

### 5.1 Agent-Facing (Bearer Token Auth)

| Method | Route                       | Purpose                 | Auth         |
| ------ | --------------------------- | ----------------------- | ------------ |
| POST   | `/api/v1/sentinel/register` | Agent self-registration | Bearer token |
| POST   | `/api/v1/sentinel/ingest`   | Submit evidence packet  | Bearer token |
| GET    | `/api/v1/sentinel/status`   | Agent health check      | Bearer token |

### 5.2 Dashboard-Facing (Session Auth)

| Method | Route                           | Purpose                    | Auth    |
| ------ | ------------------------------- | -------------------------- | ------- |
| GET    | `/api/v1/sentinel/agents`       | List org agents with stats | Session |
| GET    | `/api/v1/sentinel/packets`      | Paginated packet listing   | Session |
| GET    | `/api/v1/sentinel/chain/verify` | Verify chain integrity     | Session |
| POST   | `/api/v1/sentinel/cross-verify` | Trigger cross-verification | Session |

### 5.3 Evidence Packet Format (Ingest)

```json
{
  "packet_id": "pkt_20260308_a1b2c3",
  "version": "1.0",
  "sentinel_id": "snt_org123_sat",
  "operator_id": "org_cuid123",
  "satellite_norad_id": "25544",
  "data": {
    "data_point": "remaining_fuel_pct",
    "values": { "remaining_fuel_pct": 84.2 },
    "source_system": "orbit-tracker",
    "collection_method": "API",
    "collection_timestamp": "2026-03-08T14:30:00Z",
    "compliance_notes": ["Article 64: fuel reserve above 10% threshold"]
  },
  "regulation_mapping": [
    {
      "ref": "eu_space_act_art_64",
      "status": "COMPLIANT",
      "note": "Fuel at 84.2%, well above 10% passivation threshold"
    }
  ],
  "integrity": {
    "content_hash": "sha256:a1b2c3d4e5f6...",
    "previous_hash": "sha256:f6e5d4c3b2a1...",
    "chain_position": 42,
    "signature": "ed25519:base64signaturedata...",
    "agent_public_key": "-----BEGIN PUBLIC KEY-----\nMCowBQ...",
    "timestamp_source": "NTP"
  },
  "metadata": {
    "sentinel_version": "1.2.0",
    "collector": "orbit_debris",
    "config_hash": "sha256:config...",
    "uptime_seconds": 86400,
    "packets_sent_total": 42
  }
}
```

---

## 6. Verity Integration

### 6.1 Evidence Resolution Priority

**File:** `src/lib/verity/evaluation/evidence-resolver.ts`

When generating an attestation, the evidence resolver searches in order:

| Priority | Source                             | Trust Score | Sentinel Anchor?           |
| -------- | ---------------------------------- | ----------- | -------------------------- |
| 1        | SentinelPacket + CrossVerification | 0.98        | Yes + CrossVerificationRef |
| 2        | SentinelPacket (no cross-check)    | 0.92        | Yes                        |
| 3        | ComplianceEvidence record          | 0.75–0.90   | No                         |
| 4        | Assessment input                   | 0.50–0.65   | No                         |

### 6.2 SentinelAnchor

Embedded in every Sentinel-backed attestation:

```typescript
interface SentinelAnchor {
  sentinel_id: string; // "snt_org123_sat"
  chain_position: number; // 42
  chain_hash: string; // "sha256:a1b2c3..."
  collected_at: string; // "2026-03-08T14:30:00Z"
}
```

This creates a **cryptographic link** from the Verity attestation back to the specific Sentinel chain position. A verifier can:

1. Look up the SentinelPacket by `chain_hash`
2. Verify the hash chain integrity forward and backward
3. Confirm the data was collected at the stated time
4. Cross-check against CelesTrak if orbital data

### 6.3 CrossVerificationRef

Included when cross-verification was performed:

```typescript
interface CrossVerificationRef {
  public_source: string; // "CelesTrak GP (NORAD 25544)"
  verification_result: string; // "VERIFIED" | "PLAUSIBLE" | "ANOMALY"
  verified_at: string; // "2026-03-08T15:00:00Z"
}
```

### 6.4 Privacy Preservation

Critical design choice: the actual measured value (e.g., 84.2% fuel) is NEVER stored in the attestation. The flow:

1. Sentinel collects value → 84.2
2. Verity evaluates threshold → 84.2 ≥ 10% → result: `true`
3. Verity creates commitment → `SHA-256(value + blinding_factor + context)` → commitment hash
4. Actual value discarded after evaluation
5. Attestation contains: `result: true`, `commitment_hash: "sha256:..."`, `trust_level: "HIGH"`
6. Verifier sees: "compliant" + "SHA-256 commitment" but CANNOT reconstruct the 84.2

This is key for regulatory contexts where overprecision creates litigation risk.

---

## 7. Ephemeris Integration

### 7.1 Data Source Hierarchy

Ephemeris ranks data sources by trust:

| Priority | Source     | Weight | Description                                 |
| -------- | ---------- | ------ | ------------------------------------------- |
| 1        | Sentinel   | 1.0    | Agent-collected, cryptographically verified |
| 2        | CelesTrak  | 0.8    | Public TLE data                             |
| 3        | Verity     | 0.7    | Attestation-backed evidence                 |
| 4        | Assessment | 0.5    | Self-reported compliance data               |

### 7.2 Metrics Consumed

Ephemeris consumes these Sentinel metrics for compliance forecasting:

| Metric                     | Module             | Usage                               |
| -------------------------- | ------------------ | ----------------------------------- |
| `remaining_fuel_pct`       | Fuel & Passivation | Depletion trend → days-to-threshold |
| `thruster_status`          | Subsystems         | Thruster health monitoring          |
| `battery_state_of_charge`  | Subsystems         | Battery degradation modeling        |
| `solar_array_power_pct`    | Subsystems         | Solar panel degradation             |
| `altitude_km`              | Orbital Lifetime   | Decay prediction                    |
| `patch_compliance_pct`     | Cybersecurity      | NIS2 compliance tracking            |
| `mfa_adoption_pct`         | Cybersecurity      | Access control monitoring           |
| `critical_vulns_unpatched` | Cybersecurity      | Vulnerability exposure              |

### 7.3 Forecast Models

Sentinel time-series feeds three physics-based forecast models:

**Fuel Depletion:**

- Inputs: `remaining_fuel_pct` time series
- Model: Linear regression with seasonal correction
- Output: Days until fuel falls below passivation threshold (EU Space Act Art. 64)

**Orbital Decay:**

- Inputs: `altitude_km` time series + solar flux (NOAA)
- Model: Atmospheric drag with density correction
- Output: Days until below controlled reentry altitude

**Subsystem Degradation:**

- Inputs: `battery_state_of_charge`, `solar_array_power_pct`, `thruster_status`
- Model: Exponential degradation with mean-lifetime curves
- Output: Days until subsystem reaches critical threshold

---

## 8. Dashboard UI

### 8.1 Sentinel Monitor

**File:** `src/app/dashboard/sentinel/page.tsx` — 972 LOC

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  SENTINEL                          [Agent ▼]    │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ │
│  │ STATUS  │ │ PACKETS │ │ CHAIN   │ │CROSS │ │
│  │ ACTIVE  │ │  1,247  │ │  #1247  │ │  98% │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────┘ │
├─────────────────────────────────────────────────┤
│  CHAIN INTEGRITY  ✓ VERIFIED  [Recheck]        │
│  1,247 packets verified, 0 breaks               │
├─────────────────────────────────────────────────┤
│  AGENT DETAILS                                  │
│  Sentinel ID: snt_org123_sat                    │
│  Version: 1.2.0                                 │
│  Last Seen: 2 minutes ago                       │
│  Collectors: orbit_debris, cybersecurity,       │
│              ground_station, document_watch      │
├─────────────────────────────────────────────────┤
│  EVIDENCE FEED                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ pkt_... │ remaining_fuel_pct │ L5 │ ✓ V │   │
│  │  (expandable: values, regulation map,   │   │
│  │   compliance notes, crypto details)     │   │
│  ├─────────────────────────────────────────┤   │
│  │ pkt_... │ orbital_parameters │ L6 │ ✓ C │   │
│  ├─────────────────────────────────────────┤   │
│  │ ...                                     │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  SETUP GUIDE (collapsed)                        │
└─────────────────────────────────────────────────┘
```

**Features:**

- **Agent selector:** Multi-agent support with status badges
- **Stat cards:** Status, packet count, chain position, cross-verification rate
- **Chain integrity banner:** Real-time verification with break detection
- **Evidence feed:** Expandable packet rows with full detail
- **Trust badges:** L1–L6 color-coded levels
- **Cross-verification trigger:** Manual verification from dashboard
- **Setup guide:** Step-by-step Docker deployment instructions
- **Auto-refresh:** 30-second polling interval

### 8.2 Trust Badge Display

| Badge | Color   | Score Range |
| ----- | ------- | ----------- |
| L1    | Gray    | 0.60–0.69   |
| L2    | Blue    | 0.70–0.79   |
| L3    | Cyan    | 0.80–0.89   |
| L4    | Green   | 0.90–0.94   |
| L5    | Emerald | 0.95–0.97   |
| L6    | Gold    | 0.98        |

### 8.3 Cross-System Display

Sentinel data appears in multiple dashboards:

| Location                    | What's Shown                                           |
| --------------------------- | ------------------------------------------------------ |
| Sentinel Monitor            | Full evidence feed, chain status, agent management     |
| Ephemeris > Data Sources    | "Sentinel Telemetry" — connection status, last update  |
| Ephemeris > Modules         | ✓ V badge on modules with Sentinel-backed attestations |
| Audit Center > Attestations | "Sentinel anchored: Yes/No" indicator                  |
| Verity > Certificates       | "Sentinel-backed: 2/3 claims" counter                  |
| Verity > Attestation Detail | Full SentinelAnchor display (chain position, hash)     |

---

## 9. Security Architecture

### 9.1 Cryptographic Stack

| Function        | Algorithm | Key Size | Usage                                  |
| --------------- | --------- | -------- | -------------------------------------- |
| Packet signing  | Ed25519   | 256-bit  | Agent signs each packet's contentHash  |
| Content hashing | SHA-256   | 256-bit  | Canonical JSON → deterministic hash    |
| Token hashing   | SHA-256   | 256-bit  | Bearer tokens stored as one-way hashes |
| Chain linking   | SHA-256   | 256-bit  | Each packet links to predecessor hash  |

### 9.2 Threat Model

| Threat                  | Mitigation                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| **Packet forgery**      | Ed25519 signature verification against registered public key      |
| **Packet tampering**    | SHA-256 content hash verified on ingestion                        |
| **Chain manipulation**  | Hash chain with position counter detects gaps and substitutions   |
| **Replay attacks**      | Monotonic chain position prevents duplicate submission            |
| **Token theft**         | Tokens stored as SHA-256 hashes; raw token shown once             |
| **Data fabrication**    | Cross-verification against independent public sources (CelesTrak) |
| **Agent impersonation** | sentinelId must match authenticated agent record                  |
| **Value leakage**       | Actual values never stored in attestations (commitment scheme)    |
| **Log pollution**       | `safeLog()` strips sensitive values from all logging              |

### 9.3 Authentication Flow

```
Agent                                   Caelex API
  │                                        │
  │─── POST /register ────────────────────▶│
  │    Authorization: Bearer snt_raw...     │
  │    Body: { sentinel_id, public_key }    │
  │◀──────────────────── 201 Created ──────│
  │                                        │
  │─── POST /ingest ──────────────────────▶│
  │    Authorization: Bearer snt_raw...     │  ── SHA256(token) → lookup agent
  │    Body: { packet with signature }      │  ── Verify sentinelId matches
  │                                        │  ── Verify Ed25519 signature
  │                                        │  ── Verify content hash
  │                                        │  ── Verify chain link
  │◀──────────────────── 200 Accepted ─────│  ── Store packet
  │                                        │  ── Update agent state
```

### 9.4 Organization Isolation

- Every SentinelAgent belongs to one Organization
- Dashboard queries filter by user's organization membership
- API packets are scoped to the authenticated agent's organization
- No cross-organization data leakage possible

---

## 10. Agent Deployment

### 10.1 Docker Configuration

```yaml
# sentinel-config.yaml
operator_id: "clxyz123abc"
satellite:
  norad_id: "25544"
  name: "ISS (ZARYA)"
collectors:
  orbit_debris:
    enabled: true
    cron: "*/15 * * * *" # Every 15 minutes
  cybersecurity:
    enabled: true
    cron: "*/30 * * * *" # Every 30 minutes
  ground_station:
    enabled: true
    cron: "0 * * * *" # Every hour
  document_watch:
    enabled: true
    cron: "0 */6 * * *" # Every 6 hours
```

### 10.2 Docker Run

```bash
docker run -d \
  --name sentinel \
  -e SENTINEL_TOKEN=snt_your_token_here \
  -e CAELEX_API_URL=https://app.caelex.eu \
  -v sentinel-data:/data \
  -v ./sentinel-config.yaml:/config/config.yaml \
  ghcr.io/caelex/sentinel:latest
```

### 10.3 Collector Types

| Collector        | Data Points                                                                            | Schedule      | Source                                     |
| ---------------- | -------------------------------------------------------------------------------------- | ------------- | ------------------------------------------ |
| `orbit_debris`   | `orbital_parameters`, `remaining_fuel_pct`, `altitude_km`                              | Every 15 min  | Onboard telemetry / ground station API     |
| `cybersecurity`  | `patch_compliance_pct`, `mfa_adoption_pct`, `critical_vulns_unpatched`, `mttr_minutes` | Every 30 min  | Security tools API (SIEM, IAM, patch mgmt) |
| `ground_station` | `ground_contact_minutes`, `link_margin_db`                                             | Every hour    | Ground station monitoring                  |
| `document_watch` | `insurance_expiry`, `license_status`                                                   | Every 6 hours | Document management system                 |

---

## 11. Test Coverage

### 11.1 Test Files

| File                                | LOC | Scope                                                |
| ----------------------------------- | --- | ---------------------------------------------------- |
| `sentinel-service.server.test.ts`   | 289 | Auth, registration, ingestion, chain verification    |
| `cross-verification.server.test.ts` | 550 | Trust scores, CelesTrak comparison, SGP4 propagation |
| `sentinel-adapter.test.ts`          | 635 | Time series, latest value, status, source mapping    |

### 11.2 Coverage Areas

- **Authentication:** Token hashing, lookup, format validation
- **Registration:** Create/update agent, organization resolution
- **Ingestion:** Signature verification, hash validation, chain continuity
- **Chain Verification:** Position gaps, hash breaks, genesis validation
- **Cross-Verification:** All 4 orbital metrics, threshold boundaries, confidence calculation
- **Trust Scores:** All 7 levels (L0–L6)
- **Adapter:** Time range filtering, value range validation, source system mapping
- **Connection Status:** 24h window, connected flag logic

---

## 12. Performance Characteristics

### 12.1 Request Latency

| Operation                   | Typical Latency | Notes                       |
| --------------------------- | --------------- | --------------------------- |
| Packet ingestion            | 50–150ms        | Signature verify + DB write |
| Chain verification          | 200–2,000ms     | Depends on chain length     |
| Cross-verification (single) | 500–3,000ms     | CelesTrak fetch + SGP4      |
| Cross-verification (batch)  | 5–30s           | Up to 100 packets           |
| Agent list                  | 30–80ms         | Cached org query            |
| Packet listing              | 50–200ms        | Paginated, indexed          |

### 12.2 Storage

| Entity            | Typical Growth                              | Retention                |
| ----------------- | ------------------------------------------- | ------------------------ |
| SentinelPacket    | ~100/day per agent (all collectors)         | Indefinite (audit trail) |
| CrossVerification | ~400/day per agent (4 checks × 100 packets) | Indefinite               |
| SentinelAgent     | Static (1 per deployment)                   | Until revoked            |

### 12.3 Caching

| Cache                     | TTL        | Purpose                              |
| ------------------------- | ---------- | ------------------------------------ |
| Agent IDs (in-memory)     | 30 seconds | Avoid repeated findMany in Ephemeris |
| CelesTrak TLE (in-memory) | 4 hours    | Reduce external API calls            |

---

## 13. Landing Page Presence

### 13.1 Software Showcase

```
Name: "Sentinel"
Tagline: "Collect compliance evidence, from orbit to ground."
Description: "Autonomous evidence agents deployed at operator premises.
Cryptographically signed hash chains, tamper-evident audit trails,
and cross-verification against public orbital data."
```

### 13.2 Blog Showcase

```
Title: "Caelex Agentic System"
Pill: "Sentinel"
Description: "Deploy an autonomous agent into your infrastructure
that continuously monitors operational data, validates it against
regulatory requirements, and sends evidence-based compliance reports
back to Caelex — fully automated."
```

---

## 14. File Index

| Path                                                 | LOC  | Purpose                                           |
| ---------------------------------------------------- | ---- | ------------------------------------------------- |
| **Core Services**                                    |      |                                                   |
| `src/lib/services/sentinel-service.server.ts`        | 331  | Auth, registration, ingestion, chain verification |
| `src/lib/services/cross-verification.server.ts`      | 414  | CelesTrak cross-verification + trust scoring      |
| `src/lib/ephemeris/data/sentinel-adapter.ts`         | 231  | Sentinel → Ephemeris time-series bridge           |
| `src/lib/verity/evaluation/evidence-resolver.ts`     | 122  | Evidence priority resolution (Sentinel → Verity)  |
| `src/lib/verity/evaluation/threshold-evaluator.ts`   | 115  | Attestation generation with Sentinel anchor       |
| **API Routes**                                       |      |                                                   |
| `src/app/api/v1/sentinel/register/route.ts`          | 69   | Agent registration                                |
| `src/app/api/v1/sentinel/ingest/route.ts`            | 60   | Packet submission                                 |
| `src/app/api/v1/sentinel/agents/route.ts`            | 61   | List agents                                       |
| `src/app/api/v1/sentinel/packets/route.ts`           | 119  | List packets (paginated)                          |
| `src/app/api/v1/sentinel/status/route.ts`            | 44   | Agent health check                                |
| `src/app/api/v1/sentinel/chain/verify/route.ts`      | 66   | Chain verification                                |
| `src/app/api/v1/sentinel/cross-verify/route.ts`      | 96   | Cross-verification trigger                        |
| **Dashboard**                                        |      |                                                   |
| `src/app/dashboard/sentinel/page.tsx`                | 972  | Sentinel monitoring dashboard                     |
| **Types**                                            |      |                                                   |
| `src/lib/verity/core/types.ts`                       | 228  | SentinelAnchor, CrossVerificationRef              |
| `src/lib/ephemeris/core/types.ts`                    | 350+ | SentinelTimeSeries, TimeSeriesPoint               |
| **Tests**                                            |      |                                                   |
| `src/lib/services/sentinel-service.server.test.ts`   | 289  | Service unit tests                                |
| `src/lib/services/cross-verification.server.test.ts` | 550  | Cross-verification tests                          |
| `src/lib/ephemeris/data/sentinel-adapter.test.ts`    | 635  | Adapter tests                                     |
| **Database**                                         |      |                                                   |
| `prisma/schema.prisma`                               | —    | SentinelAgent, SentinelPacket, CrossVerification  |

---

## 15. Glossary

| Term                   | Definition                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Sentinel Agent**     | Autonomous Docker container deployed at operator premises; collects and signs compliance evidence              |
| **Evidence Packet**    | Cryptographically-signed data unit containing metrics, regulation mapping, and chain integrity fields          |
| **Hash Chain**         | Sequential SHA-256 links between packets; enables tamper detection across the full evidence history            |
| **Content Hash**       | SHA-256 of canonicalized (data + regulation_mapping); the signed payload                                       |
| **Chain Position**     | Monotonic counter (0, 1, 2, ...) preventing replay and detecting gaps                                          |
| **Cross-Verification** | Comparison of agent-reported orbital data against public CelesTrak TLE data via SGP4 propagation               |
| **Trust Score**        | Composite confidence metric (0.50–0.98) reflecting signature validity, chain integrity, and cross-verification |
| **SentinelAnchor**     | Metadata struct embedded in Verity attestations linking to a specific chain position and hash                  |
| **Collector**          | Agent sub-module specialized for one data domain (orbit, cyber, ground, document)                              |
| **Genesis Packet**     | First packet in a chain; previousHash = `sha256:genesis`, chainPosition = 0                                    |
| **SGP4**               | Simplified General Perturbations model #4; standard orbital propagation algorithm                              |
| **CelesTrak GP**       | Public repository of orbital element sets maintained by T.S. Kelso                                             |
| **Ed25519**            | Edwards-curve Digital Signature Algorithm; 256-bit signatures with 128-bit security                            |
| **Canonicalization**   | Deterministic JSON serialization (sorted keys, no whitespace) ensuring consistent hashing                      |

---

_End of report._
