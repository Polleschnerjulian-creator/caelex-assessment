# Sentinel → Verity Auto-Attestation

## Goal

Automatically generate Verity compliance attestations from verified Sentinel telemetry data. When a Sentinel agent reports metrics that match regulation thresholds (EU Space Act, NIS2, IADC), the system creates cryptographically signed attestations without manual intervention. When telemetry shows a metric crossing from compliant to non-compliant, the previous PASS attestation is auto-revoked.

## Architecture

A new cron job (`sentinel-auto-attest`) runs every 4 hours, 15 minutes after the existing `sentinel-cross-verify` cron. It queries all organizations with active Sentinel agents, matches their packet data points against the 9 `REGULATION_THRESHOLDS`, deduplicates against existing active attestations, and calls the existing `evaluateAndAttest()` pipeline. A PASS→FAIL flip triggers auto-revocation of the superseded attestation.

## Tech Stack

- Prisma (existing models: `SentinelAgent`, `SentinelPacket`, `VerityAttestation`)
- Existing Verity pipeline: `evaluateAndAttest()`, `resolveEvidence()`, `generateAttestation()`
- Vercel Cron (existing pattern)
- Notification system (existing `Notification` model)

---

## Components

### 1. Auto-Attestation Service

**File:** `src/lib/verity/evaluation/auto-attestation.server.ts`

**Core function:** `autoAttestFromSentinel(prisma: PrismaClient): Promise<AutoAttestResult>`

**Algorithm:**

1. Find all organizations with at least one ACTIVE Sentinel agent
2. For each organization:
   a. Find the OWNER (fallback: first ADMIN) as `operatorId`
   b. Collect all unique `(satelliteNorad, dataPoint)` pairs from recent packets (last 24h) where `signatureValid = true`
   c. For each pair, check if `dataPoint` matches any `REGULATION_THRESHOLDS[].data_point`
   d. For each matching threshold:
   - **Dedup check:** Query `VerityAttestation` for same `organizationId + satelliteNorad + regulationRef` where `revokedAt = null AND expiresAt > now AND collectedAt > (now - 24h)`
   - If exists and `result = true`: skip (still valid PASS)
   - If exists and `result = false`: skip (already recorded FAIL)
   - If no active attestation exists in 24h window: proceed
     e. Call `evaluateAndAttest()` with the operator context
     f. **PASS→FAIL detection:** If new attestation `result = false`, find any active PASS attestation for same `organizationId + satelliteNorad + regulationRef` and revoke it with reason `"Auto-revoked: threshold no longer met (Sentinel telemetry update)"`
     g. **FAIL→PASS detection:** If new attestation `result = true`, find any active FAIL attestation and revoke it with reason `"Auto-revoked: threshold now met (Sentinel telemetry update)"`
3. Send notification to org admins summarizing new attestations
4. Return stats: `{ orgs_processed, attestations_created, attestations_revoked, skipped, errors }`

**Helper:** `findOrgOperator(prisma, organizationId): Promise<string | null>` — returns OWNER userId, fallback ADMIN.

**Helper:** `revokeSupersededAttestations(prisma, params): Promise<number>` — revokes old attestations when result flips.

### 2. Cron Route

**File:** `src/app/api/cron/sentinel-auto-attest/route.ts`

- Standard cron auth (CRON_SECRET, timingSafeEqual)
- `runtime = "nodejs"`, `maxDuration = 60`
- Calls `autoAttestFromSentinel(prisma)`
- Returns JSON summary

### 3. vercel.json Update

Add cron entry:

```json
{
  "path": "/api/cron/sentinel-auto-attest",
  "schedule": "15 3,7,11,15,19,23 * * *"
}
```

(Every 4 hours at :15, offset from cross-verify which runs at :00)

### 4. Notifications

After processing each org, if attestations were created or revoked:

- Create one `Notification` per org admin (OWNER/ADMIN role)
- Type: `"COMPLIANCE_UPDATE"`
- Title: `"Sentinel Auto-Attestation: X new, Y revoked"`
- Message includes satellite names and regulation refs
- ActionUrl: `/dashboard/verity`
- Dedup: entity*id = `auto_attest*{orgId}\_{date}`

---

## Data Flow

```
sentinel-cross-verify cron (every 4h at :00)
  → Updates trustScore on cross-verified packets (0.90-0.98)

sentinel-auto-attest cron (every 4h at :15)
  → Queries orgs with active Sentinel agents
  → For each org:
      → Finds unique (satellite, dataPoint) from recent packets
      → Matches against REGULATION_THRESHOLDS
      → Dedup: skips if active attestation exists within 24h
      → evaluateAndAttest()
          → resolveEvidence() picks up cross-verified Sentinel packet
          → generateAttestation() creates commitment + signature
          → Stores VerityAttestation (actual_value NOT stored)
      → If result flipped: revokes old attestation
      → Notifies org admins
```

## PASS→FAIL Revocation Rules

When auto-attestation creates a new result that contradicts an existing active attestation:

| Previous | New       | Action                           |
| -------- | --------- | -------------------------------- |
| PASS     | PASS      | Skip (dedup)                     |
| PASS     | FAIL      | Revoke old PASS, create new FAIL |
| FAIL     | PASS      | Revoke old FAIL, create new PASS |
| FAIL     | FAIL      | Skip (dedup)                     |
| None     | PASS/FAIL | Create new attestation           |

Revocation reason follows pattern: `"Auto-revoked: threshold [no longer met|now met] (Sentinel telemetry update)"`

## Security Considerations

- No new attack surface: cron uses existing CRON_SECRET auth
- `evaluateAndAttest()` already handles all privacy guarantees (blinded commitment, no actual_value storage)
- `operatorId` is resolved server-side from org membership, not from user input
- Revocation is auditable via `revokedAt` + `revokedReason` fields
- Rate limited by cron schedule (max 6 runs/day)

## Error Handling

- Per-org failures are caught and logged, don't block other orgs
- If `evaluateAndAttest()` returns null (no evidence available), skip silently
- If `findOrgOperator()` returns null (no owner/admin), skip org with warning log
- All errors logged via existing `logger` + `safeLog` (no actual values in logs)

## Files to Create/Modify

| Action | File                                                   |
| ------ | ------------------------------------------------------ |
| CREATE | `src/lib/verity/evaluation/auto-attestation.server.ts` |
| CREATE | `src/app/api/cron/sentinel-auto-attest/route.ts`       |
| MODIFY | `vercel.json` (add cron entry)                         |
