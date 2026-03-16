# Sentinel — Technischer Implementierungsbericht

**Erstellt:** 13. März 2026
**Zweck:** Grundlage für den Entwurf eines Mission Simulators (synthetische Telemetrie-Quelle für Sentinel)
**Scope:** Backend, Datenmodelle, Kryptographie, Compliance-Logik — keine UI-Komponenten

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Datenmodelle & Typen](#2-datenmodelle--typen)
3. [Daten-Ingestion](#3-daten-ingestion)
4. [Hash-Chain & Kryptographische Versiegelung](#4-hash-chain--kryptographische-versiegelung)
5. [Compliance-Logic](#5-compliance-logic)
6. [Integration mit anderen Caelex-Modulen](#6-integration-mit-anderen-caelex-modulen)
7. [Datenbankschema](#7-datenbankschema)
8. [CelesTrak / Space-Track / NOAA Integration](#8-celestrak--space-track--noaa-integration)
9. [Test-Coverage](#9-test-coverage)
10. [Aktueller Implementierungsstand](#10-aktueller-implementierungsstand)
11. [Datenfluss-Diagramm](#11-datenfluss-diagramm)
12. [Was der Mission Simulator liefern muss](#12-was-der-mission-simulator-liefern-muss)

---

## 1. Executive Summary

Sentinel ist ein **kryptographisch gesichertes Evidence-Collection-System** für Satellitenbetreiber. Edge-Agents sammeln Telemetrie (Orbital, Treibstoff, Cybersecurity, Bodenstationen) und senden signierte Pakete an den Caelex-Server, der:

- Ed25519-Signaturen verifiziert
- SHA-256 Hash-Chains pflegt (tamper-evident)
- Cross-Verification gegen CelesTrak TLE-Daten durchführt
- Trust Scores berechnet (6-stufige Hierarchie: 0.50–0.98)
- Compliance-Thresholds gegen EU Space Act, NIS2 und IADC prüft
- Verity-Attestierungen für regulatorische Nachweise ausstellt

**Core-Dateien:**

| Komponente                   | Pfad                                                   | LOC   |
| ---------------------------- | ------------------------------------------------------ | ----- |
| Sentinel Service             | `src/lib/services/sentinel-service.server.ts`          | ~463  |
| Cross-Verification           | `src/lib/services/cross-verification.server.ts`        | ~471  |
| Compliance Thresholds        | `src/lib/compliance/thresholds.ts`                     | ~113  |
| Satellite Compliance State   | `src/lib/ephemeris/core/satellite-compliance-state.ts` | ~698  |
| Sentinel Adapter (Ephemeris) | `src/lib/ephemeris/data/sentinel-adapter.ts`           | ~239  |
| Shield Adapter (CDM)         | `src/lib/ephemeris/data/shield-adapter.ts`             | ~245  |
| Verity Attestation           | `src/lib/verity/core/attestation.ts`                   | ~300+ |
| Verity Commitment            | `src/lib/verity/core/commitment.ts`                    | ~150+ |
| Evidence Resolver            | `src/lib/verity/evaluation/evidence-resolver.ts`       | ~200+ |
| CelesTrak Adapter            | `src/lib/ephemeris/data/celestrak-adapter.ts`          | ~200+ |
| Solar Flux Adapter           | `src/lib/ephemeris/data/solar-flux-adapter.ts`         | ~150+ |

---

## 2. Datenmodelle & Typen

### 2.1 Prisma-Modelle

#### SentinelAgent

```prisma
model SentinelAgent {
  id                   String   @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], onDelete: Cascade)
  name                 String
  sentinelId           String   @unique    // "snt_{sha256(pubkey)[0:16]}"
  publicKey            String   @db.Text   // Ed25519 PEM (SPKI)
  token                String   @unique    // HMAC-SHA256 hash des Bearer Tokens
  status               String   @default("PENDING")  // PENDING | ACTIVE | REVOKED
  lastSeen             DateTime?
  lastPacketAt         DateTime?
  chainPosition        Int      @default(0)
  lastChainHash        String?
  version              String?
  configHash           String?
  enabledCollectors    String[]  // ["orbit_debris", "cybersecurity", "fuel", ...]
  lastVerifiedPosition Int?     // Chain-Verification Checkpoint
  lastVerifiedHash     String?  // Hash am Checkpoint
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  packets     SentinelPacket[]
  crossChecks CrossVerification[]

  @@index([organizationId])
  @@index([sentinelId])
  @@index([status])
}
```

#### SentinelPacket

```prisma
model SentinelPacket {
  id               String   @id @default(cuid())
  packetId         String   @unique   // Global eindeutig
  agentId          String
  agent            SentinelAgent @relation(fields: [agentId], onDelete: Cascade)
  satelliteNorad   String?       // NORAD Catalog ID

  // Daten
  dataPoint        String        // "orbital_parameters", "cyber_posture", etc.
  values           Json          // Key-Value Messwerte
  sourceSystem     String        // Collector-Name
  collectionMethod String        // "agent_local", "api_polling"
  collectedAt      DateTime      // Zeitpunkt der Messung
  complianceNotes  String[]      // Freitext-Notizen
  regulationMapping Json         // [{ref, status, note}]

  // Integrität (Hash-Chain)
  contentHash      String        // "sha256:{hex}" — Hash über {data, regulation_mapping}
  previousHash     String        // Hash des Vorgänger-Pakets (oder "sha256:genesis")
  chainPosition    Int           // Monoton steigende Sequenznummer
  signature        String @db.Text  // "ed25519:{base64}" — Signatur über contentHash
  signatureValid   Boolean @default(false)
  chainValid       Boolean @default(false)

  // Trust
  crossVerified    Boolean @default(false)
  trustScore       Float?        // 0.50–0.98

  processedAt      DateTime @default(now())
  crossChecks      CrossVerification[]

  @@index([agentId])
  @@index([satelliteNorad])
  @@index([dataPoint])
  @@index([collectedAt])
  @@index([chainPosition])
  @@index([agentId, satelliteNorad, dataPoint, collectedAt])
  @@index([agentId, dataPoint, crossVerified])
  @@index([agentId, chainPosition])
  @@index([processedAt])
}
```

#### CrossVerification

```prisma
model CrossVerification {
  id              String   @id @default(cuid())
  packetId        String
  packet          SentinelPacket @relation(fields: [packetId], onDelete: Cascade)
  agentId         String
  agent           SentinelAgent @relation(fields: [agentId], onDelete: Cascade)

  dataPoint       String   // Verglichenes Feld: "altitude_km", "inclination_deg", etc.
  agentValue      Float    // Vom Agent gemeldeter Wert
  publicValue     Float    // CelesTrak GP-Wert
  publicSource    String   // "celestrak", "space_track", "esa_discos"
  delta           Float    // |agentValue - publicValue|

  result          String   // "VERIFIED" | "PLAUSIBLE" | "ANOMALY"
  confidence      Float    // 0.0–1.0

  verifiedAt      DateTime @default(now())
  publicDataEpoch DateTime?

  @@index([packetId])
  @@index([agentId])
}
```

#### SatelliteAlert

```prisma
model SatelliteAlert {
  id             String   @id @default(cuid())
  noradId        String
  operatorId     String
  organization   Organization @relation(fields: [operatorId], onDelete: Cascade)
  type           String   // FUEL_LOW, THRUSTER_DEGRADED, ORBIT_DECAY_WARNING, etc.
  severity       String   // CRITICAL | HIGH | MEDIUM | LOW
  title          String
  description    String   @db.Text
  regulationRef  String?  // "eu_space_act_art_70"
  dedupeKey      String   // noradId + type + regulationRef (verhindert Duplikate)
  triggeredAt    DateTime @default(now())
  resolvedAt     DateTime?
  acknowledged   Boolean  @default(false)
  acknowledgedAt DateTime?

  @@index([noradId])
  @@index([operatorId, severity])
  @@index([resolvedAt])
  @@index([dedupeKey])
}
```

#### SatelliteComplianceState & History

```prisma
model SatelliteComplianceState {
  id               String   @id @default(cuid())
  noradId          String
  operatorId       String
  organization     Organization @relation(fields: [operatorId], onDelete: Cascade)
  overallScore     Int      // 0–100
  moduleScores     Json     // Per-Modul Scores
  dataSources      Json     // Sentinel/Verity/Assessment Status
  horizonDays      Int?     // Tage bis zum nächsten Compliance-Breach
  horizonRegulation String? // Welche Regulation bricht zuerst
  horizonConfidence String  // HIGH | MEDIUM | LOW
  dataFreshness    String   // LIVE | RECENT | STALE | NO_DATA
  stateJson        Json?    // Vollständiger State-Snapshot
  satelliteName    String?
  calculatedAt     DateTime @default(now())

  @@unique([noradId, operatorId])
  @@index([operatorId])
  @@index([horizonDays])
}

model SatelliteComplianceStateHistory {
  id               String   @id @default(cuid())
  noradId          String
  operatorId       String
  organization     Organization @relation(fields: [operatorId], onDelete: Cascade)
  overallScore     Int
  moduleScores     Json
  horizonDays      Int?
  horizonRegulation String?
  dataFreshness    String
  stateJson        Json?
  alerts           Json?    // Serialisierte Alert-Liste
  forecastP10      Float?
  forecastP50      Float?
  forecastP90      Float?
  inputsHash       String?  // SHA-256 der Inputs für Reproduzierbarkeit
  calculatedAt     DateTime @default(now())

  @@index([noradId, calculatedAt])
  @@index([operatorId, calculatedAt])
}
```

#### OrbitalData & SolarFluxRecord

```prisma
model OrbitalData {
  id           String     @id @default(cuid())
  spacecraftId String
  spacecraft   Spacecraft @relation(fields: [spacecraftId], onDelete: Cascade)
  noradId      String
  altitude     Float      // km
  inclination  Float      // degrees
  eccentricity Float
  period       Float      // minutes
  epoch        DateTime
  rawGp        Json?      // Vollständiger CelesTrak GP/JSON Record
  createdAt    DateTime   @default(now())

  @@index([spacecraftId, createdAt])
  @@index([noradId, epoch])
}

model SolarFluxRecord {
  id         String   @id @default(cuid())
  f107       Float    // Solar Flux Units
  observedAt DateTime
  source     String   @default("NOAA_SWPC")
  createdAt  DateTime @default(now())

  @@unique([observedAt, source])
  @@index([observedAt])
}
```

#### Verity-Modelle

```prisma
model VerityAttestation {
  id               String   @id @default(cuid())
  attestationId    String   @unique
  organizationId   String
  organization     Organization @relation(fields: [organizationId], onDelete: Cascade)
  issuerKeyId      String
  issuerKey        VerityIssuerKey @relation(fields: [issuerKeyId])
  subjectNoradId   String?
  regulationRef    String
  result           Boolean       // PASS/FAIL
  claimStatement   String @db.Text
  trustLevel       String        // L0–L6
  sentinelAnchorJson Json?       // SentinelAnchor Referenz
  attestationJson  Json          // Vollständiger signierter Blob
  signature        String @db.Text
  issuedAt         DateTime
  expiresAt        DateTime
  revokedAt        DateTime?

  @@index([organizationId])
  @@index([regulationRef])
  @@index([subjectNoradId])
}

model VerityCertificate {
  id               String   @id @default(cuid())
  certificateId    String   @unique
  organizationId   String
  organization     Organization @relation(fields: [organizationId], onDelete: Cascade)
  certificateJson  Json
  signature        String @db.Text
  issuedAt         DateTime
  expiresAt        DateTime

  @@index([organizationId])
}

model VerityIssuerKey {
  id          String   @id @default(cuid())
  keyId       String   @unique
  publicKeyHex String  @db.Text   // Ed25519 DER als Hex
  algorithm   String   @default("Ed25519")
  status      String   @default("ACTIVE")  // ACTIVE | ROTATED | REVOKED
  createdAt   DateTime @default(now())
  rotatedAt   DateTime?
  attestations VerityAttestation[]

  @@index([status])
}
```

### 2.2 TypeScript Interfaces

#### EvidencePacketInput (Ingest Request)

```typescript
// sentinel-service.server.ts — validiert via Zod
interface EvidencePacketInput {
  packet_id: string;
  version: string;
  sentinel_id: string;
  operator_id: string;
  satellite_norad_id: string | null; // Regex: /^\d{1,8}$/
  data: {
    data_point: string;
    values: Record<string, unknown>;
    source_system: string;
    collection_method: string;
    collection_timestamp: string; // ISO 8601, ±1h Server-Drift erlaubt
    compliance_notes: string[];
  };
  regulation_mapping: Array<{
    ref: string; // z.B. "COM(2025)335:Art.5"
    status: string; // "COMPLIANT" | "NON_COMPLIANT" | "CONDITIONAL"
    note: string;
  }>;
  integrity: {
    content_hash: string; // "sha256:{hex}"
    previous_hash: string; // Vorgänger-Hash oder "sha256:genesis"
    chain_position: number; // 0-basiert, monoton steigend
    signature: string; // "ed25519:{base64}"
    agent_public_key: string; // Ed25519 PEM (verifiziert gegen registrierten Key)
    timestamp_source: string;
  };
  metadata: {
    sentinel_version: string;
    collector: string;
    config_hash: string;
    uptime_seconds: number;
    packets_sent_total: number;
  };
}
```

#### SentinelTimeSeries & TimeSeriesPoint

```typescript
// ephemeris/core/types.ts
interface SentinelTimeSeries {
  metric: string; // data_point Name
  noradId: string;
  points: TimeSeriesPoint[];
}

interface TimeSeriesPoint {
  timestamp: string; // ISO 8601
  value: number;
  source: "orbit" | "cyber" | "ground" | "document";
  verified: boolean; // crossVerified Status
  trustScore: number; // 0.50–0.98
}
```

#### DataSourcesStatus

```typescript
// ephemeris/core/types.ts
interface DataSourcesStatus {
  sentinel: {
    connected: boolean;
    lastPacket: string | null;
    packetsLast24h: number;
  };
  verity: {
    attestations: number;
    latestTrustLevel: string | null;
  };
  assessment: {
    completedModules: number;
    totalModules: number;
    lastUpdated: string | null;
  };
  celestrak: {
    lastTle: string | null;
    tleAge: number | null; // Minuten
  };
  shield?: {
    connected: boolean;
    activeEvents: number;
    lastPollAt: string | null;
    source: string;
  };
}
```

#### SentinelAnchor (Verity-Referenz)

```typescript
// verity/core/types.ts
interface SentinelAnchor {
  sentinel_id: string;
  chain_position: number;
  chain_hash: string;
  collected_at: string; // ISO 8601
}
```

### 2.3 Enums & Konstanten

| Kategorie                     | Werte                                                                                                                                                                                                                      | Verwendung                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Agent Status**              | `PENDING`, `ACTIVE`, `REVOKED`                                                                                                                                                                                             | SentinelAgent.status                   |
| **Data Points**               | `orbital_parameters`, `cyber_posture`, `ground_station_metrics`, `document_event`, `remaining_fuel_pct`, `thruster_status`, `battery_state_of_charge`, `solar_array_power_pct`, `patch_compliance_pct`, `mfa_adoption_pct` | SentinelPacket.dataPoint               |
| **Cross-Verify Result**       | `VERIFIED`, `PLAUSIBLE`, `ANOMALY`                                                                                                                                                                                         | CrossVerification.result               |
| **Regulation Mapping Status** | `COMPLIANT`, `NON_COMPLIANT`, `CONDITIONAL`                                                                                                                                                                                | regulationMapping[].status             |
| **Data Freshness**            | `LIVE`, `RECENT`, `STALE`, `NO_DATA`                                                                                                                                                                                       | SatelliteComplianceState.dataFreshness |
| **Alert Severity**            | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`                                                                                                                                                                                        | SatelliteAlert.severity                |
| **Trust Levels**              | L0=0.50, L1=0.60, L2=0.70, L3=0.80, L4=0.90, L5=0.95, L6=0.98                                                                                                                                                              | trustScore Berechnung                  |
| **Horizon Confidence**        | `HIGH`, `MEDIUM`, `LOW`                                                                                                                                                                                                    | SatelliteComplianceState               |
| **Health Status**             | `HEALTHY`, `WARNING`, `DEGRADED`, `INACTIVE`                                                                                                                                                                               | /health Endpoint                       |

---

## 3. Daten-Ingestion

### 3.1 API-Routen

| Endpoint                        | Methode | Auth                  | Rate Limit                | Beschreibung                |
| ------------------------------- | ------- | --------------------- | ------------------------- | --------------------------- |
| `/api/v1/sentinel/register`     | POST    | Bearer Token          | sentinel_register         | Agent-Registrierung         |
| `/api/v1/sentinel/ingest`       | POST    | Bearer Token          | sentinel_ingest (100/min) | Paket-Einreichung           |
| `/api/v1/sentinel/status`       | GET     | Bearer Token          | sentinel_read (60/min)    | Agent Self-Check            |
| `/api/v1/sentinel/agents`       | GET     | Session               | sentinel_read             | Agents auflisten            |
| `/api/v1/sentinel/agents`       | PATCH   | Session (OWNER/ADMIN) | sentinel_read             | Agent-Status ändern         |
| `/api/v1/sentinel/packets`      | GET     | Session               | sentinel_read             | Pakete abfragen (paginiert) |
| `/api/v1/sentinel/health`       | GET     | Session               | sentinel_read             | Org-weiter Health Check     |
| `/api/v1/sentinel/cross-verify` | POST    | Session (OWNER+)      | sentinel_expensive (10/h) | Cross-Verification triggern |
| `/api/v1/sentinel/chain/verify` | GET     | Session (OWNER+)      | sentinel_expensive        | Chain-Integrität prüfen     |
| `/api/v1/sentinel/data-erasure` | DELETE  | Session (OWNER/ADMIN) | sensitive (5/h)           | DSGVO Art. 17 Löschung      |

### 3.2 Ingestion-Flow (POST /ingest)

```
Agent → POST /api/v1/sentinel/ingest (Bearer Token + JSON Body)
  ├─ 1. Token-Auth: HMAC-SHA256(token, AUTH_SECRET) → SentinelAgent lookup
  ├─ 2. Rate Limit: sentinel_ingest Tier (100/min)
  ├─ 3. Agent-Status-Check: Muss "ACTIVE" sein
  ├─ 4. Schema-Validierung: Zod PacketSchema
  ├─ 5. Timestamp-Drift: |collection_timestamp - now()| ≤ 1h (MAX_TIMESTAMP_DRIFT_MS = 3.600.000)
  ├─ 6. Sentinel-ID-Match: packet.sentinel_id === agent.sentinelId
  ├─ 7. Ed25519-Signatur: verify(contentHash, signature, agent.publicKey)
  │     └─ REJECT wenn ungültig (SVA-39)
  ├─ 8. Content-Hash: recompute SHA-256(canonical({data, regulation_mapping}))
  │     └─ REJECT wenn Mismatch (SVA-15)
  ├─ 9. Chain-Continuity: previousHash === agent.lastChainHash, chainPosition === agent.chainPosition
  │     └─ WARN aber ACCEPT bei Lücken (Paketverlust toleriert)
  ├─ 10. Atomic Transaction:
  │     ├─ CREATE SentinelPacket (signatureValid=true, chainValid=<computed>, trustScore=0.6)
  │     └─ UPDATE SentinelAgent (chainPosition++, lastChainHash, lastPacketAt, lastSeen)
  └─ Response: { status: "accepted", chain_position: N }
```

### 3.3 Agent-Registrierung (POST /register)

```
Agent → POST /api/v1/sentinel/register (Bearer Token + JSON)
  ├─ Input: { sentinel_id, operator_id, public_key (Ed25519 PEM), version, collectors[] }
  ├─ Token: "snt_{base64url(24 random bytes)}" → hashed mit HMAC-SHA256
  ├─ Public Key: Ed25519 SPKI PEM, gespeichert in DB
  │   └─ IMMUTABEL nach Erstregistrierung (SVA-05)
  ├─ Sentinel ID: "snt_{sha256(publicKey)[0:16]}" — deterministisch aus Public Key
  ├─ Existierender Agent: Update nur metadata (version, collectors), NICHT publicKey
  ├─ Neuer Agent: Status "PENDING", Token einmalig im Response
  └─ Response: { sentinel_id, status: "PENDING" }
```

### 3.4 Cron-Jobs & Scheduling

| Cron Route                        | Schedule          | Funktion                                            |
| --------------------------------- | ----------------- | --------------------------------------------------- |
| `/api/cron/celestrak-polling`     | Täglich 05:00 UTC | TLE/GP-Daten von CelesTrak fetchen → OrbitalData    |
| `/api/cron/solar-flux-polling`    | Täglich 04:00 UTC | F10.7 Solar Flux von NOAA → SolarFluxRecord         |
| `/api/cron/sentinel-cross-verify` | Alle 4 Stunden    | Batch Cross-Verification ungeprüfter Orbital-Pakete |
| `/api/cron/sentinel-heartbeat`    | Täglich 00:30 UTC | Stille Agents erkennen (>24h ohne Paket)            |
| `/api/cron/cdm-polling`           | Alle 30 Minuten   | CDMs von Space-Track → Conjunction Events           |
| `/api/cron/ephemeris-daily`       | Täglich 06:00 UTC | Ephemeris-Forecasts berechnen                       |

---

## 4. Hash-Chain & Kryptographische Versiegelung

### 4.1 Sentinel Hash-Chain

**Algorithmus:** SHA-256 über kanonisiertes JSON

**Genesis:** `"sha256:genesis"` (Konstante CHAIN_GENESIS_HASH)

**Chain-Linking:**

```
Paket 0: previousHash = "sha256:genesis"
         contentHash  = sha256(canonical({data, regulation_mapping}))

Paket 1: previousHash = Paket_0.contentHash
         contentHash  = sha256(canonical({data, regulation_mapping}))

Paket N: previousHash = Paket_(N-1).contentHash
```

**Kanonisierung:**

```typescript
function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(obj).sort(); // ← Sortierte Keys
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
    );
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(value);
}
```

**Chain Verification (inkrementell oder voll):**

- Inkrementell: Ab `lastVerifiedPosition` / `lastVerifiedHash` (Checkpoint)
- Voll: Ab Genesis, recompute aller Content-Hashes (Tamper-Detection)
- Bei Erfolg: Checkpoint atomar aktualisiert

### 4.2 Ed25519-Signierung

**Agent-seitig (Sentinel Client `sentinel/src/crypto/signer.ts`):**

```typescript
// Signierung
function signContent(contentHash: string, privateKey: KeyObject): string {
  const data = Buffer.from(contentHash, "utf-8");
  const signature = sign(null, data, privateKey);
  return `ed25519:${signature.toString("base64")}`;
}

// Key-Generierung
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
// Pub: SPKI PEM → DB | Priv: PKCS8 PEM → Disk (mode 0o600)
```

**Server-seitig (Verification):**

```typescript
function verifyPacketSignature(
  contentHash,
  signatureStr,
  publicKeyPem,
): boolean {
  const sigBase64 = signatureStr.replace("ed25519:", "");
  const sigBuffer = Buffer.from(sigBase64, "base64");
  const data = Buffer.from(contentHash, "utf-8");
  const publicKey = createPublicKey(publicKeyPem);
  return verify(null, data, publicKey, sigBuffer);
}
```

**Key-Lifecycle:**

- Generierung: Agent lokal bei Erststart (`sentinel/src/crypto/signer.ts`)
- Speicherung: Private Key auf Agent-Disk (PKCS8 PEM, 0o600), Public Key in DB
- Rotation: **Nicht implementiert** — Public Key immutabel nach Registrierung (SVA-05)
- Revocation: Agent-Status auf "REVOKED" setzen

### 4.3 Trust Score Berechnung

```
Level 0 (0.50): Nur Self-Assessment (kein Agent)
Level 1 (0.60): Agent-gesammelt, keine Signatur
Level 2 (0.70): Agent + gültige Signatur
Level 3 (0.80): Agent + Signatur + gültige Chain
Level 4 (0.90): Agent + Signatur + Chain + Cross-Verified
Level 5 (0.95): Alles + hohe Cross-Confidence (≥0.90)
Level 6 (0.98): Alles + multiple Quellen bestätigt (≥0.98)
```

**Berechnung (`cross-verification.server.ts`):**

```typescript
function computeTrustScore(input: {
  signatureValid: boolean;
  chainValid: boolean;
  crossVerified: boolean;
  crossConfidence: number;
}): number {
  let score = 0.6; // Base: Agent collected
  if (input.signatureValid) score = 0.7;
  if (input.signatureValid && input.chainValid) score = 0.8;
  if (input.signatureValid && input.chainValid && input.crossVerified) {
    score = 0.9;
    if (input.crossConfidence >= 0.9) score = 0.95;
    if (input.crossConfidence >= 0.98) score = 0.98;
  }
  return score;
}
```

### 4.4 Verity Attestation System

**Attestierungs-Prozess:**

1. **Evidence Resolution** — Höchste Trust-Quelle finden (Sentinel > Evidence Record > Assessment)
2. **Commitment** — SHA-256(context + actualValue + blindingFactor) — Privacy-Preserving
3. **Attestation** — Signierter Claim: `result: boolean` (Threshold bestanden ja/nein)
4. **Signatur** — Ed25519 über definierte Felder (attestation_id, claim, evidence, issuer, dates)

**Attestation-Struktur:**

```typescript
interface ThresholdAttestation {
  attestation_id: string;          // "va_{timestamp}_{random}"
  version: "1.0";
  claim: {
    regulation_ref: string;        // "eu_space_act_art_70"
    regulation_name: string;
    threshold_type: "ABOVE" | "BELOW";
    threshold_value: number;
    result: boolean;               // NUR Pass/Fail, NICHT der echte Wert
    claim_statement: string;
  };
  subject: { ... };
  evidence: {
    value_commitment: string;      // SHA-256 Commitment (verbirgt echten Wert)
    source: string;
    trust_level: string;
    sentinel_anchor?: SentinelAnchor;  // Referenz zum Sentinel-Paket
  };
  issuer: {
    name: "Caelex";
    key_id: string;
    public_key: string;            // Ed25519 DER Hex
    algorithm: "Ed25519";
  };
  issued_at: string;
  expires_at: string;
  signature: string;               // Ed25519 Hex
  verification_url: string;
}
```

**Commitment-Schema (Privacy-Preserving):**

```typescript
// Commitment = SHA-256(context || value || blinding_factor)
// blinding_factor = 256 Bit Zufall
// Der echte Wert wird NICHT preisgegeben
// Nur der boolesche Threshold-Result wird attestiert
```

**Verity Key Management:**

- Keys gespeichert in `VerityIssuerKey` (Prisma Model)
- Public Key als DER Hex, Algorithmus "Ed25519"
- Status-Lifecycle: ACTIVE → ROTATED → REVOKED
- Key-ID referenziert in jeder Attestation

**Public Verification:**

- Endpoint: `GET /api/v1/verity/attestation/verify?id=...`
- Auch offline möglich: Signatur + Public Key reichen zur Verifikation
- Prüft: Struktur, Key Match, Expiry, Ed25519-Signatur

---

## 5. Compliance-Logic

### 5.1 Threshold-Definitionen

**Datei:** `src/lib/compliance/thresholds.ts`

| Regulation   | Artikel            | Metrik                       | Typ   | Threshold | Warning Buffer       | Unit  |
| ------------ | ------------------ | ---------------------------- | ----- | --------- | -------------------- | ----- |
| EU Space Act | Art. 70            | remaining_fuel_pct           | ABOVE | 15%       | 5% (warnt bei 20%)   | %     |
| EU Space Act | Art. 68            | orbital_lifetime_years       | BELOW | 25        | 3 (warnt bei 22)     | Jahre |
| EU Space Act | Art. 72            | disposal_delta_v_pct         | ABOVE | 25%       | 5% (warnt bei 30%)   | %     |
| EU Space Act | Art. 64            | collision_avoidance_capable  | ABOVE | 1.0       | 0 (binär)            | bool  |
| NIS2         | Art. 21.2(e)       | patch_compliance_pct         | ABOVE | 80%       | 5% (warnt bei 75%)   | %     |
| NIS2         | Art. 21.2(j)       | mfa_adoption_pct             | ABOVE | 95%       | 2% (warnt bei 93%)   | %     |
| NIS2         | Art. 21.2(e) vulns | unpatched_critical_vulns     | BELOW | 1         | 0 (binär)            | count |
| NIS2         | Art. 23            | incident_response_mttr_min   | BELOW | 1440      | 240 (warnt bei 1200) | min   |
| IADC         | 5.3.1              | passivation_fuel_reserve_pct | ABOVE | 10%       | 3% (warnt bei 7%)    | %     |

**Threshold-Interface:**

```typescript
interface ComplianceThreshold {
  metric: string;
  threshold: number;
  type: "ABOVE" | "BELOW"; // ABOVE = Wert muss >= threshold sein
  unit: string;
  name: string;
  warningBuffer: number; // Frühwarnung bei threshold ± buffer
}
```

### 5.2 Compliance-Bewertung

**Status-Progression:**

```
currentValue >= threshold + warningBuffer → COMPLIANT
currentValue >= threshold                 → WARNING
currentValue < threshold                  → NON_COMPLIANT
```

**Modul-Scores (`satellite-compliance-state.ts`):**

- **Fuel Module**: Sentinel `remaining_fuel_pct` → `predictFuelDepletion()` → daysToThreshold
- **Subsystems Module**: Kombination aus `thruster_status`, `battery_state_of_charge`, `solar_array_power_pct`
- **Cyber Module**: `patch_compliance_pct` + `mfa_adoption_pct` + Verity-Attestierungen
- **Orbital Module**: CelesTrak TLE → SGP4-Propagation + Solar Flux → Decay-Prognose
- **Insurance Module**: Assessment-Daten (has_active_policy, expiry)
- **Documentation Module**: Deorbit-Plan + Verity-Zertifikate
- **Collision Avoidance Module**: Shield CDM-Events → Risk-Tier → Score

### 5.3 Alert-Generierung

```
Threshold-Breach erkannt
  ├─ dedupeKey berechnen: noradId + type + regulationRef
  ├─ Existierender Alert mit gleichem Key?
  │   ├─ Ja: Skip (kein Duplikat)
  │   └─ Nein: SatelliteAlert erstellen
  ├─ Severity zuweisen:
  │   ├─ daysToThreshold ≤ 0: CRITICAL
  │   ├─ daysToThreshold ≤ 7: HIGH
  │   ├─ daysToThreshold ≤ 30: MEDIUM
  │   └─ sonst: LOW
  └─ Notification an Org-Admins
```

**Aktuell NICHT implementiert:** Automatische NCA-Benachrichtigungen.

---

## 6. Integration mit anderen Caelex-Modulen

### 6.1 Sentinel → Ephemeris

**Richtung:** Unidirektional (Sentinel liefert Daten an Ephemeris)

**Adapter:** `src/lib/ephemeris/data/sentinel-adapter.ts`

- `getSentinelTimeSeries(metric, noradId, days)` — Holt N Tage Metrik-History
- `getLatestSentinelValue(metric, noradId)` — Einzelwert mit Trust Score
- `getSentinelStatus(orgId)` — Verbindungsstatus

**Filter:** Nur Pakete mit `signatureValid=true AND chainValid=true` (SVA-64)

### 6.2 Sentinel → Verity

**Richtung:** Sentinel-Pakete als Evidence-Quelle für Verity-Attestierungen

- `SentinelAnchor` wird in Attestation eingebettet (sentinel_id, chain_position, chain_hash)
- Evidence Resolution priorisiert Sentinel (Trust 0.80–0.98) über Assessment (Trust 0.50–0.65)
- Commitment-Schema verbirgt echten Messwert, attestiert nur Pass/Fail

### 6.3 Shield → Sentinel/Ephemeris

**Adapter:** `src/lib/ephemeris/data/shield-adapter.ts`

- CDMs von Space-Track → `ConjunctionEvent` Records
- Risk-Klassifizierung: EMERGENCY/HIGH/MEDIUM/LOW basierend auf Pc und Miss Distance
- Auto-Eskalation: TCA ≤ 72h AND Risk > MEDIUM → ASSESSMENT_REQUIRED
- Collision Avoidance Module Score: basierend auf Event-Severity und Entscheidungsstatus

### 6.4 ASTRA → Sentinel

**Status: NICHT IMPLEMENTIERT**

- Keine Sentinel-spezifischen Tools in `src/lib/astra/tool-definitions.ts`
- ASTRA kann derzeit KEINE Sentinel-Daten abfragen
- **Design Gap** für Phase 2

### 6.5 Dashboard

- Echtzeit-Packet-Feed (30s Auto-Refresh)
- Agent-Status-Tracking (ACTIVE/INACTIVE/REVOKED)
- Chain-Integrität-Banner
- Trust-Score-Visualisierung (L1–L5 mit Farben)
- Cross-Verification-Trigger

---

## 7. Datenbankschema

### Relationen

```
Organization (1) ──→ (N) SentinelAgent
SentinelAgent (1) ──→ (N) SentinelPacket
SentinelPacket (1) ──→ (N) CrossVerification
SentinelAgent (1) ──→ (N) CrossVerification

Organization (1) ──→ (N) SatelliteComplianceState  [unique: noradId+operatorId]
Organization (1) ──→ (N) SatelliteComplianceStateHistory
Organization (1) ──→ (N) EphemerisForecast
Organization (1) ──→ (N) SatelliteAlert
Organization (1) ──→ (N) VerityAttestation

Spacecraft (1) ──→ (N) OrbitalData
VerityIssuerKey (1) ──→ (N) VerityAttestation
```

### Cascading Deletes

- Organization löschen → alle Agents, Pakete, CrossVerifications, Alerts, States, Forecasts
- SentinelAgent löschen → alle zugehörigen Pakete und CrossVerifications
- SentinelPacket löschen → alle zugehörigen CrossVerifications

### Retention

- **OrbitalData:** Kein automatisches Löschen (akkumuliert über täglichen CelesTrak-Cron)
- **SolarFluxRecord:** Upsert nach `observedAt+source` (keine Duplikate)
- **SentinelPacket:** Kein automatisches Löschen (Hash-Chain muss vollständig bleiben)
- **SatelliteComplianceStateHistory:** Kein Limit (wächst mit täglichen Snapshots)
- **EphemerisForecast:** `expiresAt` Feld vorhanden, aber kein automatischer Cleanup

---

## 8. CelesTrak / Space-Track / NOAA Integration

### 8.1 CelesTrak TLE/GP

**Endpoint:** `https://celestrak.org/NORAD/elements/gp.php?CATNR={noradId}&FORMAT=json`

**Polling:** Täglich 05:00 UTC via Cron → `OrbitalData` Records

**Cross-Verification Toleranzen:**

| Feld            | Noise (MATCH) | Toleranz (CLOSE) | Mismatch |
| --------------- | ------------- | ---------------- | -------- |
| altitude_km     | <10 km        | <50 km           | ≥50 km   |
| inclination_deg | <0.1°         | <0.5°            | ≥0.5°    |
| period_min      | <0.5 min      | <2 min           | ≥2 min   |
| eccentricity    | <0.0001       | <0.001           | ≥0.001   |

**TLE-Staleness:** >14 Tage alt → Rejected (SVA-71, SGP4 unzuverlässig)

**Cache:** 4 Stunden In-Memory pro Request-Session

### 8.2 Space-Track CDM

**Auth:** `https://www.space-track.org/ajaxauth/login` (SPACETRACK_IDENTITY + SPACETRACK_PASSWORD)

**Endpoint:** `https://www.space-track.org/basicspacedata/query/class/cdm_public`

**Risk-Klassifizierung:**

- EMERGENCY: Pc ≥ 1e-4 AND missDistance < 500m
- HIGH: Pc ≥ 1e-5 AND missDistance < 1000m
- MEDIUM: Pc ≥ 1e-6 AND missDistance < 2000m
- LOW: alle anderen

**Werden CDMs in die Hash-Chain einbezogen?** Nein. CDMs fließen über Shield → Ephemeris → Compliance State, nicht über den Sentinel-Paket-Pfad.

### 8.3 NOAA Solar Flux

**Endpoint:** `https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json`

**Polling:** Täglich 04:00 UTC → `SolarFluxRecord`

**Fallback:** 150 SFU (mittlere Solarbedingungen)

**Verwendung:** Atmosphärendichte-Skalierung im Orbital-Decay-Modell

---

## 9. Test-Coverage

### Existierende Tests

| Test-Datei                                               | Typ         | Was getestet wird                                              |
| -------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `src/lib/services/sentinel-service.server.test.ts`       | Unit        | Token-Generierung, Auth, Registration, Ingestion, Chain Verify |
| `src/lib/services/cross-verification.server.test.ts`     | Unit        | Trust Score (6 Level), CrossVerify Mocking, Confidence         |
| `src/lib/ephemeris/data/sentinel-adapter.test.ts`        | Unit        | TimeSeries Fetch, Agent-ID Cache, Latest Value                 |
| `tests/integration/sentinel-service.integration.test.ts` | Integration | HMAC-SHA256, Canonicalization, Content Hash Tampering          |

### Was getestet wird

- Krypto-Funktionen (HMAC, SHA256, Kanonisierung) — **gut abgedeckt**
- Chain Verification (Breaks, Gaps) — **getestet**
- Trust Score (alle 6 Level) — **getestet**
- Cross-Verification (SGP4 via satellite.js Mock) — **teilweise gemockt**

### Was NICHT getestet wird

- E2E Flow: Registration → Ingest → Chain Verify → Cross Verify
- Realistische Telemetrie-Payloads
- Heartbeat-Monitoring (24h Stille)
- ASTRA-Integration (existiert nicht)
- Edge Cases: Concurrent Ingestion, Token-Rotation, Chain-Recovery

### Mock-Daten / Fixtures

**Keine dedizierten Mock-Telemetrie-Generatoren vorhanden.** Tests verwenden inline-definierte Minimal-Fixtures. Das ist eine kritische Lücke für den Simulator.

---

## 10. Aktueller Implementierungsstand

### Fertig & Funktional ✓

- Agent-Registrierung mit Ed25519 Public Key
- Paket-Ingestion mit vollständiger Validierungspipeline
- SHA-256 Hash-Chain (Erstellung, inkrementelle/volle Verifikation)
- Ed25519 Signatur-Verifikation
- Cross-Verification gegen CelesTrak (SGP4-Propagation)
- Trust Score Berechnung (6-stufig, kalibriert)
- Ephemeris-Integration (Sentinel → Compliance State)
- Shield-Integration (CDMs → Collision Avoidance)
- Verity-Attestierungen (Commitment + Ed25519-Signatur)
- Dashboard UI (Agent-Management, Packet-Feed, Chain-Status)
- Cron-Jobs (Cross-Verify, Heartbeat, CelesTrak, Solar Flux, CDM)
- GDPR Data Erasure Endpoint
- Rate Limiting auf allen Endpoints

### Teilweise Implementiert ⚠

- **Compliance-Eskalation:** Alerts werden erzeugt, aber keine NCA-Benachrichtigungen
- **ASTRA-Zugriff:** Keine Sentinel-Tools in ASTRA definiert
- **Shield-Integration:** Funktioniert nur mit vorhandener CAConfig
- **Regulation Mapping Validation:** Agent-seitige Mapping wird akzeptiert ohne Server-Validation
- **Real-time Threshold Monitoring:** Nur bei Ephemeris-Berechnung, nicht bei jedem Ingest

### Nicht Implementiert ✗

- **Key Rotation:** Public Keys immutabel (kein Rotations-Mechanismus)
- **Automatische NCA-Submissions:** Kein Pfad von SatelliteAlert → NCA Portal
- **Multi-Source Attestation:** Orbital-Daten können nicht Sentinel + Verity kombinieren
- **Telemetrie-Retention-Policy:** Kein automatischer Cleanup alter Pakete
- **Agent SDK/Client Library:** Sentinel-Client als separates Package (`sentinel/`) existiert, aber kein publiziertes NPM-Paket

---

## 11. Datenfluss-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNE DATENQUELLEN                             │
├─────────────┬──────────────┬──────────────────┬────────────────────────┤
│  CelesTrak  │  Space-Track │  NOAA SWPC       │  Sentinel Agent        │
│  (TLE/GP)   │  (CDM)       │  (Solar Flux)    │  (Telemetrie)          │
│  Daily 05:00│  Every 30min │  Daily 04:00     │  Push (continuous)     │
└──────┬──────┴──────┬───────┴────────┬─────────┴──────────┬─────────────┘
       │             │                │                    │
       ▼             ▼                ▼                    ▼
┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐
│OrbitalData│  │Conjunction│  │SolarFlux     │  │POST /sentinel/ingest │
│(DB)       │  │Event (DB) │  │Record (DB)   │  │                      │
└──────┬────┘  └─────┬─────┘  └──────┬───────┘  │ 1. Token Auth        │
       │             │               │           │ 2. Schema Validation │
       │             │               │           │ 3. Timestamp Check   │
       │             │               │           │ 4. Ed25519 Verify    │
       │             │               │           │ 5. Content Hash      │
       │             │               │           │ 6. Chain Continuity  │
       │             │               │           └──────────┬───────────┘
       │             │               │                      │
       │             │               │                      ▼
       │             │               │           ┌──────────────────────┐
       │             │               │           │  SentinelPacket (DB) │
       │             │               │           │  trustScore = 0.6    │
       │             │               │           └──────────┬───────────┘
       │             │               │                      │
       │             │               │            ┌─────────┴──────────┐
       │             │               │            │ Cron: Cross-Verify │
       │             │               │            │ (every 4h)         │
       │             │               │            └─────────┬──────────┘
       │             │               │                      │
       │             │               │                      ▼
       │             │               │           ┌──────────────────────┐
       │             │               │           │ CrossVerification    │
       │             │               │           │ (CelesTrak vs Agent) │
       │             │               │           │ trustScore → 0.9+   │
       │             │               │           └──────────┬───────────┘
       │             │               │                      │
       ▼             ▼               ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EPHEMERIS ENGINE (Daily 06:00)                     │
│                                                                      │
│  Inputs:                                                             │
│  ├─ Sentinel TimeSeries (Fuel, Subsystems, Cyber)                   │
│  ├─ CelesTrak OrbitalData (TLE → SGP4 Propagation)                 │
│  ├─ Solar Flux F10.7 (Atmosphärendichte)                            │
│  ├─ Shield Conjunction Events (CDMs → CA Score)                     │
│  ├─ Verity Attestations (Trust Level)                               │
│  └─ Assessment Data (Insurance, Documentation)                       │
│                                                                      │
│  Processing:                                                         │
│  ├─ Fuel Depletion Prediction                                       │
│  ├─ Subsystem Degradation Model                                     │
│  ├─ Orbital Decay Forecast                                          │
│  ├─ Cyber Posture Evaluation                                        │
│  └─ Compliance Threshold Check (per Modul)                          │
│                                                                      │
│  Outputs:                                                            │
│  ├─ SatelliteComplianceState (overallScore, moduleScores)           │
│  ├─ SatelliteComplianceStateHistory (Snapshot)                      │
│  ├─ EphemerisForecast (Curves + ComplianceEvents)                   │
│  └─ SatelliteAlert (bei Threshold-Breach)                           │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌──────────────┐ ┌──────────┐ ┌───────────────┐
          │ Dashboard UI │ │ Verity   │ │ Notifications │
          │ (Compliance  │ │ (Attest- │ │ (Email, In-   │
          │  Score, Fore-│ │  ation)  │ │  App Alerts)  │
          │  casts, Alers│ │          │ │               │
          └──────────────┘ └──────────┘ └───────────────┘
```

### Fehlerbehandlung

```
Ingestion Errors:
  ├─ Invalid Token → 401 (kein Paket erstellt)
  ├─ Agent PENDING/REVOKED → 403 (kein Paket erstellt)
  ├─ Schema Fehler → 422 mit Feld-Details
  ├─ Timestamp Drift >1h → 400 (kein Paket erstellt)
  ├─ Signatur ungültig → 400 REJECT (kein Paket erstellt)
  ├─ Content Hash Mismatch → 400 REJECT (kein Paket erstellt)
  ├─ Chain Break → WARN, Paket wird trotzdem gespeichert (chainValid=false)
  └─ DB Error → 500 (Retry durch Agent)

Cross-Verification Errors:
  ├─ Kein NORAD ID → SKIP (nicht orbital)
  ├─ CelesTrak Fetch Error → Retry mit Backoff, dann SKIP
  ├─ TLE >14 Tage alt → SKIP (unzuverlässig)
  └─ Timeout (>50s) → Batch abbrechen, verbleibende beim nächsten Cron

Ephemeris Errors:
  ├─ Sentinel nicht verbunden → dataFreshness="NO_DATA", Modul UNKNOWN
  ├─ Shield Error → CA-Modul graceful degradation
  └─ Solar Flux unavailable → Fallback 150 SFU
```

---

## 12. Was der Mission Simulator liefern muss

Basierend auf der Analyse muss der Simulator folgende Daten generieren:

### 12.1 Pflicht-Outputs (Sentinel Ingest Format)

Der Simulator muss **EvidencePacketInput**-konforme JSON-Pakete erzeugen:

```typescript
{
  packet_id: string,           // UUID, global eindeutig
  version: "1.0",
  sentinel_id: string,         // "snt_{hash}" — deterministisch aus Public Key
  operator_id: string,         // Org-ID
  satellite_norad_id: string,  // Valides NORAD ID (Regex: /^\d{1,8}$/)

  data: {
    data_point: string,        // Siehe Tabelle unten
    values: object,            // Metriken je nach data_point
    source_system: string,     // "orbit_debris" | "cybersecurity" | "fuel" | ...
    collection_method: "agent_local",
    collection_timestamp: ISO8601,  // ±1h vom Server
    compliance_notes: string[],
  },

  regulation_mapping: [{
    ref: string,               // "COM(2025)335:Art.70" Format
    status: "COMPLIANT" | "NON_COMPLIANT" | "CONDITIONAL",
    note: string,
  }],

  integrity: {
    content_hash: "sha256:{hex}",     // SHA-256 canonical({data, regulation_mapping})
    previous_hash: string,             // Vorgänger-Hash oder "sha256:genesis"
    chain_position: number,            // 0-basiert, monoton steigend
    signature: "ed25519:{base64}",     // Ed25519(contentHash, privateKey)
    agent_public_key: string,          // Ed25519 SPKI PEM
    timestamp_source: "system_clock",
  },

  metadata: {
    sentinel_version: "1.0.0",
    collector: string,
    config_hash: "sha256:{hex}",
    uptime_seconds: number,
    packets_sent_total: number,
  }
}
```

### 12.2 Data Points die der Simulator erzeugen muss

| data_point                | values Felder                                                  | source_system    | Typische Werte                            | Compliance-Threshold                              |
| ------------------------- | -------------------------------------------------------------- | ---------------- | ----------------------------------------- | ------------------------------------------------- |
| `orbital_parameters`      | `altitude_km`, `inclination_deg`, `eccentricity`, `period_min` | `orbit_debris`   | 400–800km, 51–98°, 0.0001–0.01, 90–100min | Art. 68 (25y lifetime)                            |
| `remaining_fuel_pct`      | `remaining_fuel_pct`                                           | `fuel`           | 0–100%                                    | Art. 70 (≥15%), Art. 72 (≥25%), IADC 5.3.1 (≥10%) |
| `thruster_status`         | `thruster_status` (0=failed, 1=ok)                             | `subsystems`     | 0 oder 1                                  | Art. 64 (CA capability)                           |
| `battery_state_of_charge` | `battery_state_of_charge` (0–1)                                | `subsystems`     | 0.3–1.0                                   | Kein direkter Threshold                           |
| `solar_array_power_pct`   | `solar_array_power_pct`                                        | `subsystems`     | 50–100%                                   | Kein direkter Threshold                           |
| `patch_compliance_pct`    | `patch_compliance_pct`                                         | `cybersecurity`  | 0–100%                                    | NIS2 Art. 21.2(e) (≥80%)                          |
| `mfa_adoption_pct`        | `mfa_adoption_pct`                                             | `cybersecurity`  | 0–100%                                    | NIS2 Art. 21.2(j) (≥95%)                          |
| `cyber_posture`           | `unpatched_critical_vulns`, `incident_response_mttr_min`       | `cybersecurity`  | 0–10, 0–2880                              | NIS2 Art. 21.2(e) (<1), Art. 23 (≤1440)           |
| `ground_station_metrics`  | Frei definierbar                                               | `ground_station` | Variabel                                  | Kein Threshold                                    |
| `document_event`          | Frei definierbar                                               | `document`       | Variabel                                  | Kein Threshold                                    |

### 12.3 Kryptographische Anforderungen

Der Simulator muss:

1. **Ed25519 Key Pair** generieren und beibehalten
2. **Sentinel ID** deterministisch ableiten: `"snt_" + sha256(publicKeyPem)[0:16]`
3. **Content Hash** korrekt berechnen: `sha256(canonicalize({data, regulation_mapping}))`
4. **Hash Chain** pflegen: Genesis → monoton steigende Position, previousHash = letzter contentHash
5. **Ed25519 Signatur** über contentHash erstellen
6. **Token** generieren: `"snt_" + base64url(24 random bytes)`, Hash für Registration

### 12.4 Szenarien die der Simulator abdecken sollte

| Szenario               | Beschreibung                    | Relevante Metrics                         |
| ---------------------- | ------------------------------- | ----------------------------------------- |
| **Nominal Operations** | Alle Werte innerhalb Compliance | fuel 60%, patch 95%, altitude stabil      |
| **Fuel Depletion**     | Treibstoff sinkt über Zeit      | remaining_fuel_pct: 40% → 15% → 10%       |
| **Orbital Decay**      | Altitude sinkt (End-of-Life)    | altitude_km sinkend, period sinkend       |
| **Cyber Incident**     | Patch-Level fällt, MFA sinkt    | patch_compliance_pct <80%, mfa <95%       |
| **Subsystem Failure**  | Thruster fällt aus              | thruster_status → 0                       |
| **Conjunction Event**  | CDM-artiges Szenario            | Shield-Integration, nicht direkt Sentinel |
| **Chain Break**        | Paketverlust simulieren         | Lücke in chainPosition                    |
| **Trust Escalation**   | Von L1 (0.60) bis L5+ (0.95)    | Cross-Verification bestanden              |

### 12.5 Timing-Anforderungen

- **Collection Timestamp:** Muss innerhalb ±1h von Server-Zeit liegen
- **Paket-Frequenz:** Realistisch: 1 Paket pro Metrik pro 1–15 Minuten
- **CelesTrak-Kompatibilität:** Orbital-Daten müssen plausibel sein (innerhalb Cross-Verify-Toleranzen)
- **Epoch-Frische:** Simulierte Orbits müssen <14 Tage TLE-Alter einhalten

### 12.6 Registrierungssequenz

```
1. Simulator generiert Ed25519 Key Pair
2. Simulator generiert Bearer Token ("snt_" + 24 random bytes)
3. POST /register mit { sentinel_id, operator_id, public_key, version, collectors }
4. Admin aktiviert Agent (PATCH /agents → status: "ACTIVE")
5. Simulator beginnt mit POST /ingest (Bearer Token)
6. Erster Paket: chain_position=0, previous_hash="sha256:genesis"
7. Folgende Pakete: chain_position++, previous_hash=letzter contentHash
```
