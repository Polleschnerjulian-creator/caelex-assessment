# Tier-1 Platform Innovations — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Features

1. **Ephemeris → Compliance Score** — Feed satellite physics models into dashboard compliance score
2. **AI Document Auditor** — Rule-based + AI audit of generated documents against regulations
3. **NOAA Space Weather** — Extend solar flux polling with Kp, predicted cycle, NOAA scales
4. **NCA Rejection → Score Feedback** — NCA outcomes impact compliance scoring

---

## Feature 2: Ephemeris → Compliance Score

### Goal

Add a 7th `space_operations` module to `compliance-scoring-service.ts` that reads `SatelliteComplianceState` records and feeds satellite compliance into the dashboard score.

### Architecture

The main dashboard compliance score currently has 6 modules (authorization=0.25, debris=0.20, cybersecurity=0.20, insurance=0.15, environmental=0.10, reporting=0.10). We add a 7th module and rebalance weights.

### New Module: `space_operations` (weight: 0.15)

**Data query:** `getSpaceOperationsData(userId)`

- Find user's org via `OrganizationMember`
- Query all `SatelliteComplianceState` for org
- Query `SentinelAgent` count (active) for org
- Query `EphemerisForecast` count (non-expired) for org

**3 Scoring Factors:**

| Factor             | Max Points | Logic                                                                                                                                          |
| ------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fleet Health       | 40         | Average of all satellite `overallScore` values. If score >= 70: 40pts, >= 50: 30pts, >= 30: 20pts, < 30: 10pts. No satellites: 20pts (neutral) |
| Compliance Horizon | 35         | Shortest `horizonDays` across fleet. >180d: 35pts, >90d: 25pts, >30d: 15pts, <=30d: 5pts. No data: 17pts (neutral)                             |
| Active Monitoring  | 25         | Has active Sentinel agents: 15pts. Has non-expired forecasts: 10pts                                                                            |

**Weight rebalancing:**

| Module           | Old  | New  |
| ---------------- | ---- | ---- |
| authorization    | 0.25 | 0.22 |
| debris           | 0.20 | 0.17 |
| cybersecurity    | 0.20 | 0.17 |
| insurance        | 0.15 | 0.13 |
| environmental    | 0.10 | 0.08 |
| reporting        | 0.10 | 0.08 |
| space_operations | —    | 0.15 |
| **Total**        | 1.00 | 1.00 |

### Files

| Action | File                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| MODIFY | `src/lib/services/compliance-scoring-service.ts` — add module, rebalance weights       |
| MODIFY | `src/app/api/cron/compliance-snapshot/route.ts` — include space_operations in snapshot |

---

## Feature 3: AI Document Auditor

### Goal

Automatically audit Generate 2.0 documents for regulation coverage, threshold consistency, and section completeness. Provide both rule-based (free) and AI-powered (on-demand) auditing.

### Architecture

**Rule-based audit service** (`document-audit-service.server.ts`):

- Takes a document's sections and documentType
- Runs 3 checks:

**Check 1: Regulation Coverage**

- Map each documentType to required regulation refs:
  - `DEBRIS_MITIGATION_PLAN` → `[eu_space_act_art_64, art_68, art_70, art_72, iadc_5_3_1]`
  - `CYBERSECURITY_FRAMEWORK` → `[nis2_art_21_2_e, art_21_2_j, art_23]`
  - `ENVIRONMENTAL_FOOTPRINT` → `[eu_space_act_art_96, art_97, art_98]`
  - `MISSION_DESCRIPTION` → `[eu_space_act_art_6, art_8, art_10]`
  - `AUTHORIZATION_APPLICATION` → all authorization articles
- Scan document content for each required ref (regex: article numbers, regulation names)
- Score: found / required × 100

**Check 2: Threshold Consistency**

- Extract numeric claims from document (regex patterns like "15%", "25 years")
- Compare against `COMPLIANCE_THRESHOLDS` values
- Flag mismatches (e.g., document says "10% fuel reserve" but threshold is 15%)

**Check 3: Section Completeness**

- Define required sections per documentType (e.g., DEBRIS_MITIGATION_PLAN needs: Executive Summary, Passivation Strategy, Disposal Plan, Collision Avoidance, Timeline)
- Check section titles against required list
- Score: present / required × 100

**Output type:**

```typescript
interface DocumentAuditResult {
  overallScore: number; // 0-100
  regulationCoverage: { score: number; missing: string[]; found: string[] };
  thresholdConsistency: { score: number; mismatches: ThresholdMismatch[] };
  sectionCompleteness: { score: number; missing: string[]; present: string[] };
  recommendations: string[];
}
```

**Astra Tool** (`audit_document`):

- New tool definition in `tool-definitions.ts`
- User invokes via chat: "Audit mein Debris Mitigation Plan"
- Runs rule-based audit first, then optionally sends findings + document to Claude for deep analysis
- Returns structured `DocumentAuditResult`

### Files

| Action | File                                                                  |
| ------ | --------------------------------------------------------------------- |
| CREATE | `src/lib/services/document-audit-service.server.ts`                   |
| MODIFY | `src/lib/astra/tool-definitions.ts` — add `audit_document` tool       |
| MODIFY | `src/lib/astra/tool-executor.ts` — implement `audit_document` handler |

---

## Feature 4: NOAA Space Weather Integration

### Goal

Extend the existing solar flux polling cron to fetch additional free NOAA SWPC data: Kp geomagnetic index, predicted solar cycle, and active space weather scales/warnings.

### Architecture

**Additional NOAA endpoints (all free, no API key):**

1. `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
   - Returns: `{ time_tag, kp_index, estimated_kp, kp }`
   - Latest 1-minute Kp geomagnetic index (0-9 scale)

2. `https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json`
   - Returns: monthly predicted F10.7 values for next 12+ months
   - Used for long-term forecast confidence bands

3. `https://services.swpc.noaa.gov/products/noaa-scales.json`
   - Returns: current G (geomagnetic), S (solar radiation), R (radio blackout) scale levels
   - Format: `{ "0": { "DateStamp", "TimeStamp", "G": { "Scale": "G0-G5", ... }, "S": {...}, "R": {...} } }`

**New Prisma model:**

```prisma
model SpaceWeatherEvent {
  id          String   @id @default(cuid())
  eventType   String   // GEOMAGNETIC_STORM, SOLAR_RADIATION, RADIO_BLACKOUT
  severity    String   // G1-G5, S1-S5, R1-R5
  kpIndex     Float?   // Kp value at time of event
  startedAt   DateTime
  endedAt     DateTime?
  description String?
  source      String   @default("NOAA_SWPC")
  createdAt   DateTime @default(now())

  @@index([eventType, startedAt])
  @@index([severity])
}
```

**Integration points:**

- `SolarFluxRecord` — add `kpIndex Float?` field to existing model
- `orbital-decay.ts` — use Kp for thermospheric heating adjustment: `densityMultiplier = 1 + (kp / 9) * 0.3` (Kp=9 → 30% density increase)
- `SatelliteAlert` — auto-create WARNING alert when G3+ storm detected, CRITICAL at G4+
- Predicted solar cycle → store as `SolarFluxRecord` with `isPredicted: Boolean` flag for forecast confidence bands

**Dashboard integration:**

- Space weather status function returning current NOAA scale levels
- Consumed by ephemeris satellite detail page header

### Files

| Action | File                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| MODIFY | `prisma/schema.prisma` — add `SpaceWeatherEvent` model, add `kpIndex` to `SolarFluxRecord` |
| MODIFY | `src/app/api/cron/solar-flux-polling/route.ts` — fetch 3 additional endpoints              |
| MODIFY | `src/lib/ephemeris/models/orbital-decay.ts` — use Kp in density model                      |
| CREATE | `src/lib/services/space-weather-service.server.ts` — parse NOAA data, create events/alerts |

---

## Feature 5: NCA Rejection → Score Feedback

### Goal

Make NCA submission outcomes (APPROVED, REJECTED, INFORMATION_REQUESTED) impact the compliance score's `reporting` module.

### Architecture

**Modify `getReportingData(userId)`** to also query:

```typescript
const ncaSubmissions = await prisma.nCASubmission.findMany({
  where: { userId },
  select: {
    id: true,
    status: true,
    rejectedAt: true,
    followUpRequired: true,
    followUpDeadline: true,
    createdAt: true,
  },
});
```

**New factor in `calculateReportingScore`:**

Current factors: NCA Config (30pts), Incident Notifications (40pts), Report Submissions (30pts) = 100pts total.

Redistribute to add NCA Outcomes:

| Factor                 | Old Pts | New Pts |
| ---------------------- | ------- | ------- |
| NCA Config             | 30      | 25      |
| Incident Notifications | 40      | 30      |
| Report Submissions     | 30      | 20      |
| **NCA Outcomes**       | —       | **25**  |
| **Total**              | 100     | 100     |

**NCA Outcomes scoring logic (25 pts):**

```
if (no NCA submissions): 12 pts (neutral)
else:
  approved = count(APPROVED)
  rejected = count(REJECTED where rejectedAt > 30 days ago and not re-submitted)
  infoReq = count(INFORMATION_REQUESTED where followUpDeadline < now and not responded)
  total = count(non-DRAFT, non-WITHDRAWN)

  if (total === 0): 12 pts
  else:
    baseScore = (approved / total) × 25
    penalty = rejected × 5 + overdueInfoReq × 3
    score = max(0, min(25, baseScore - penalty))
```

**Also fix:** `SubmissionActions.tsx` — change Resend from REJECTED to call the `resendSubmission` API (creates new submission) instead of PATCH status to SUBMITTED (which violates FSM).

### Files

| Action | File                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| MODIFY | `src/lib/services/compliance-scoring-service.ts` — add NCA outcomes factor to reporting module |
| MODIFY | `src/components/nca-portal/SubmissionActions.tsx` — fix Resend FSM mismatch                    |

---

## Cost Analysis

| Feature               | External API                            | Cost                       |
| --------------------- | --------------------------------------- | -------------------------- |
| Ephemeris → Score     | None                                    | $0                         |
| AI Document Auditor   | Existing Anthropic key (on-demand only) | Marginal (existing budget) |
| NOAA Space Weather    | NOAA SWPC (US Gov)                      | $0 (public data)           |
| NCA Rejection → Score | None                                    | $0                         |

## Implementation Order

1. **NCA Rejection → Score** — smallest change, immediate value (2 files)
2. **Ephemeris → Compliance Score** — connects two existing systems (2 files)
3. **NOAA Space Weather** — extends existing cron with free data (4 files)
4. **AI Document Auditor** — most complex, new service + tool (4 files)
