# Verity Evolution — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Verity from a cryptographic attestation engine into a full compliance proof platform with public passports, NCA integration, continuous scoring, peer-to-peer verification, and tamper-proof audit chains.

**Architecture:** 5 independent features built on top of existing Verity infrastructure (core crypto, attestations, certificates, thresholds, Sentinel auto-attestation). Each feature adds a new layer: Passport (public sharing), NCA Bridge (regulatory submission), Compliance Score (live metric), P2P Verify (operator-to-operator), Audit Chain (tamper-proof history). All features share the existing `VerityAttestation` and `VerityCertificate` Prisma models — new models added only where needed.

**Tech Stack:** Next.js 15 App Router, Prisma/PostgreSQL, Ed25519 (existing crypto), Recharts (score visualization), existing Verity lib (`src/lib/verity/`), existing Glass design system.

---

## File Structure

### New Files

| Path                                                      | Purpose                                               |
| --------------------------------------------------------- | ----------------------------------------------------- |
| **Feature 1: Compliance Passport**                        |                                                       |
| `src/lib/verity/passport/builder.server.ts`               | Builds passport data from attestations + certificates |
| `src/lib/verity/passport/types.ts`                        | Passport types and interfaces                         |
| `src/app/api/v1/verity/passport/generate/route.ts`        | POST — Generate passport for satellite/fleet          |
| `src/app/api/v1/verity/passport/[passportId]/route.ts`    | GET — Public passport data (no auth)                  |
| `src/app/verity/passport/[passportId]/page.tsx`           | Public passport page (shareable link)                 |
| `src/app/verity/passport/[passportId]/PassportView.tsx`   | Client component for passport rendering               |
| **Feature 2: NCA Submission Bridge**                      |                                                       |
| `src/lib/verity/nca-bridge/submission-builder.server.ts`  | Builds NCA-specific attestation bundles               |
| `src/lib/verity/nca-bridge/types.ts`                      | NCA bridge types                                      |
| `src/app/api/v1/verity/nca-bundle/route.ts`               | POST — Generate NCA submission bundle                 |
| **Feature 3: Continuous Compliance Score**                |                                                       |
| `src/lib/verity/score/calculator.ts`                      | Pure function: attestations → score (0-100)           |
| `src/lib/verity/score/types.ts`                           | Score types                                           |
| `src/app/api/v1/verity/score/[operatorId]/route.ts`       | GET — Public compliance score                         |
| **Feature 4: Peer-to-Peer Verification**                  |                                                       |
| `src/lib/verity/p2p/request-builder.ts`                   | Build verification request payloads                   |
| `src/lib/verity/p2p/types.ts`                             | P2P types                                             |
| `src/app/api/v1/verity/p2p/request/route.ts`              | POST — Create verification request                    |
| `src/app/api/v1/verity/p2p/respond/[requestId]/route.ts`  | POST — Respond to verification request                |
| `src/app/api/v1/verity/p2p/verify/[requestId]/route.ts`   | GET — Public verify response                          |
| **Feature 5: Compliance Audit Chain**                     |                                                       |
| `src/lib/verity/audit-chain/chain-writer.server.ts`       | Append attestation events to hash chain               |
| `src/lib/verity/audit-chain/chain-verifier.ts`            | Verify chain integrity                                |
| `src/lib/verity/audit-chain/types.ts`                     | Audit chain types                                     |
| `src/app/api/v1/verity/audit-chain/[operatorId]/route.ts` | GET — Audit chain for operator                        |
| `src/app/api/v1/verity/audit-chain/verify/route.ts`       | POST — Verify chain integrity                         |

### Modified Files

| Path                                       | Change                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `prisma/schema.prisma`                     | Add `VerityPassport`, `VerityP2PRequest`, `VerityAuditChainEntry` models |
| `src/app/dashboard/verity/page.tsx`        | Add Passport tab, Score widget, P2P section                              |
| `src/lib/verity/certificates/generator.ts` | Add `isPublic` flag propagation to passport                              |
| `vercel.json`                              | Add passport/score routes to public paths if needed                      |

### Test Files

| Path                                                | Tests                                 |
| --------------------------------------------------- | ------------------------------------- |
| `src/lib/verity/passport/builder.test.ts`           | Passport generation from attestations |
| `src/lib/verity/score/calculator.test.ts`           | Score computation edge cases          |
| `src/lib/verity/p2p/request-builder.test.ts`        | P2P request/response flow             |
| `src/lib/verity/audit-chain/chain-writer.test.ts`   | Chain append + integrity              |
| `src/lib/verity/audit-chain/chain-verifier.test.ts` | Chain verification                    |

---

## Chunk 1: Prisma Schema + Types

### Task 1: Add Prisma Models

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add VerityPassport model**

Add after `VerityCertificateClaim` model:

```prisma
model VerityPassport {
  id             String   @id @default(cuid())
  passportId     String   @unique @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  operatorId     String

  // Scope
  satelliteNorad String?         // null = fleet-level passport
  satelliteName  String?
  label          String          // "Fleet Compliance Passport" or satellite name

  // Snapshot data (denormalized for public access without auth)
  attestationCount    Int
  certificateCount    Int
  complianceScore     Int         // 0-100
  scoreBreakdown      Json        // { category: score } breakdown
  attestationSummary  Json        // [{ regulation_ref, result, trust_level, expires_at }]
  jurisdictions       String[]    // ["FR", "DE", "GB"]

  // Sharing
  isPublic       Boolean  @default(true)
  accessToken    String?  @unique   // Optional token-gated access
  viewCount      Int      @default(0)
  lastViewedAt   DateTime?

  // Lifecycle
  generatedAt    DateTime @default(now())
  expiresAt      DateTime
  revokedAt      DateTime?

  @@index([organizationId])
  @@index([operatorId])
  @@index([passportId])
  @@index([isPublic, revokedAt])
}

model VerityP2PRequest {
  id              String   @id @default(cuid())
  requestId       String   @unique @default(cuid())

  // Requester
  requesterOrgId  String
  requesterName   String
  requesterEmail  String?

  // Target
  targetOrgId     String
  targetNoradId   String?

  // What's being requested
  regulationRefs  String[]    // e.g. ["eu_art64_ca_capability", "eu_art70_fuel_passivation"]
  purpose         String      // "conjunction_coordination", "ride_share_verification", "insurance_due_diligence"
  message         String?

  // Response
  status          String   @default("PENDING")  // PENDING, APPROVED, DECLINED, EXPIRED
  responseAt      DateTime?
  responseMessage String?
  attestationIds  String[]    // Attestation IDs shared in response
  certificateId   String?     // Certificate shared in response

  // Lifecycle
  createdAt       DateTime @default(now())
  expiresAt       DateTime

  @@index([requesterOrgId])
  @@index([targetOrgId, status])
  @@index([requestId])
}

model VerityAuditChainEntry {
  id              String   @id @default(cuid())
  organizationId  String
  sequenceNumber  Int

  // Event
  eventType       String      // "ATTESTATION_CREATED", "ATTESTATION_REVOKED", "CERTIFICATE_ISSUED", "SCORE_COMPUTED", "PASSPORT_GENERATED"
  entityId        String      // attestation_id, certificate_id, etc.
  entityType      String      // "attestation", "certificate", "passport", "score"
  eventData       Json        // Relevant event metadata

  // Hash chain
  entryHash       String      // SHA-256(sequenceNumber + eventType + entityId + eventData + previousHash)
  previousHash    String      // Hash of previous entry (or "GENESIS" for first)

  // Timestamp
  createdAt       DateTime @default(now())

  @@unique([organizationId, sequenceNumber])
  @@index([organizationId, createdAt])
  @@index([entityId])
  @@index([entryHash])
}
```

- [ ] **Step 2: Add Organization relation**

In the `Organization` model, add:

```prisma
  verityPassports   VerityPassport[]
```

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client generated successfully.

- [ ] **Step 4: Push schema to database**

Run: `npx prisma db push`
Expected: Schema synced.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(verity): add Passport, P2PRequest, AuditChainEntry models"
```

---

### Task 2: Define Types

**Files:**

- Create: `src/lib/verity/passport/types.ts`
- Create: `src/lib/verity/score/types.ts`
- Create: `src/lib/verity/p2p/types.ts`
- Create: `src/lib/verity/audit-chain/types.ts`

- [ ] **Step 1: Create passport types**

```typescript
// src/lib/verity/passport/types.ts

export interface PassportData {
  passportId: string;
  label: string;
  operatorId: string;
  satelliteNorad: string | null;
  satelliteName: string | null;
  complianceScore: number;
  scoreBreakdown: Record<string, number>;
  jurisdictions: string[];
  attestations: PassportAttestationSummary[];
  certificates: PassportCertificateSummary[];
  generatedAt: string;
  expiresAt: string;
  verificationUrl: string;
}

export interface PassportAttestationSummary {
  regulationRef: string;
  regulationName: string;
  dataPoint: string;
  result: boolean;
  trustLevel: string;
  issuedAt: string;
  expiresAt: string;
  attestationId: string;
}

export interface PassportCertificateSummary {
  certificateId: string;
  claimsCount: number;
  minTrustLevel: string;
  issuedAt: string;
  expiresAt: string;
}

export interface GeneratePassportParams {
  organizationId: string;
  operatorId: string;
  satelliteNorad?: string | null;
  satelliteName?: string | null;
  label: string;
  isPublic?: boolean;
  expiresInDays?: number;
}
```

- [ ] **Step 2: Create score types**

```typescript
// src/lib/verity/score/types.ts

export interface ComplianceScore {
  overall: number; // 0-100
  breakdown: ScoreBreakdown;
  attestationCount: number;
  passingCount: number;
  failingCount: number;
  expiredCount: number;
  coveragePercent: number; // % of known thresholds with active attestation
  trend: "improving" | "declining" | "stable";
  computedAt: string;
}

export interface ScoreBreakdown {
  debris: number; // 0-100 per category
  cybersecurity: number;
  authorization: number;
  environmental: number;
  spectrum: number;
  insurance: number;
}

// Maps regulation_ref prefixes to score categories
export const SCORE_CATEGORIES: Record<string, keyof ScoreBreakdown> = {
  eu_art70: "debris",
  eu_art68: "debris",
  eu_art72: "debris",
  eu_art64: "debris",
  iadc: "debris",
  nis2: "cybersecurity",
};
```

- [ ] **Step 3: Create P2P types**

```typescript
// src/lib/verity/p2p/types.ts

export interface P2PVerificationRequest {
  requestId: string;
  requesterName: string;
  regulationRefs: string[];
  purpose: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface P2PVerificationResponse {
  requestId: string;
  status: "APPROVED" | "DECLINED";
  message: string | null;
  attestations: Array<{
    attestationId: string;
    regulationRef: string;
    result: boolean;
    trustLevel: string;
    issuedAt: string;
    expiresAt: string;
    signature: string;
  }>;
  certificateId: string | null;
  respondedAt: string;
}

export type P2PPurpose =
  | "conjunction_coordination"
  | "ride_share_verification"
  | "insurance_due_diligence"
  | "nca_cross_check"
  | "general";
```

- [ ] **Step 4: Create audit chain types**

```typescript
// src/lib/verity/audit-chain/types.ts

export interface AuditChainEntry {
  sequenceNumber: number;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  eventData: Record<string, unknown>;
  entryHash: string;
  previousHash: string;
  createdAt: string;
}

export type AuditEventType =
  | "ATTESTATION_CREATED"
  | "ATTESTATION_REVOKED"
  | "CERTIFICATE_ISSUED"
  | "CERTIFICATE_REVOKED"
  | "SCORE_COMPUTED"
  | "PASSPORT_GENERATED"
  | "P2P_REQUEST_CREATED"
  | "P2P_RESPONSE_SENT";

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAt: number | null; // sequence number where chain breaks (null if valid)
  firstEntry: string; // ISO timestamp
  lastEntry: string;
  errors: string[];
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/verity/passport/types.ts src/lib/verity/score/types.ts src/lib/verity/p2p/types.ts src/lib/verity/audit-chain/types.ts
git commit -m "feat(verity): add types for passport, score, p2p, audit chain"
```

---

## Chunk 2: Feature 1 — Compliance Passport

### Task 3: Compliance Score Calculator

**Files:**

- Create: `src/lib/verity/score/calculator.ts`
- Test: `src/lib/verity/score/calculator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/verity/score/calculator.test.ts
import { describe, it, expect } from "vitest";
import { computeComplianceScore } from "./calculator";

describe("computeComplianceScore", () => {
  it("returns 0 for no attestations", () => {
    const result = computeComplianceScore([]);
    expect(result.overall).toBe(0);
    expect(result.attestationCount).toBe(0);
  });

  it("returns 100 for all passing with high trust", () => {
    const attestations = [
      {
        regulationRef: "eu_art70_fuel_passivation",
        result: true,
        trustLevel: "HIGH",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        regulationRef: "nis2_art21_patch_compliance",
        result: true,
        trustLevel: "HIGH",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];
    const result = computeComplianceScore(attestations);
    expect(result.overall).toBeGreaterThanOrEqual(90);
  });

  it("penalizes failed attestations", () => {
    const attestations = [
      {
        regulationRef: "eu_art70_fuel_passivation",
        result: false,
        trustLevel: "HIGH",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];
    const result = computeComplianceScore(attestations);
    expect(result.overall).toBeLessThan(50);
  });

  it("penalizes low trust levels", () => {
    const high = computeComplianceScore([
      {
        regulationRef: "eu_art70_fuel_passivation",
        result: true,
        trustLevel: "HIGH",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);
    const low = computeComplianceScore([
      {
        regulationRef: "eu_art70_fuel_passivation",
        result: true,
        trustLevel: "LOW",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);
    expect(high.overall).toBeGreaterThan(low.overall);
  });

  it("excludes expired attestations", () => {
    const attestations = [
      {
        regulationRef: "eu_art70_fuel_passivation",
        result: true,
        trustLevel: "HIGH",
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    const result = computeComplianceScore(attestations);
    expect(result.expiredCount).toBe(1);
    expect(result.passingCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/verity/score/calculator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement score calculator**

```typescript
// src/lib/verity/score/calculator.ts
import type {
  ComplianceScore,
  ScoreBreakdown,
  SCORE_CATEGORIES,
} from "./types";

interface AttestationInput {
  regulationRef: string;
  result: boolean;
  trustLevel: string;
  expiresAt: string;
}

const TRUST_WEIGHTS: Record<string, number> = {
  HIGH: 1.0,
  MEDIUM: 0.7,
  LOW: 0.4,
};

const CATEGORY_MAP: Record<string, keyof ScoreBreakdown> = {
  eu_art70: "debris",
  eu_art68: "debris",
  eu_art72: "debris",
  eu_art64: "debris",
  iadc: "debris",
  nis2: "cybersecurity",
};

const ALL_CATEGORIES: (keyof ScoreBreakdown)[] = [
  "debris",
  "cybersecurity",
  "authorization",
  "environmental",
  "spectrum",
  "insurance",
];

export function computeComplianceScore(
  attestations: AttestationInput[],
): ComplianceScore {
  const now = new Date();

  // Partition attestations
  const active = attestations.filter((a) => new Date(a.expiresAt) > now);
  const expired = attestations.filter((a) => new Date(a.expiresAt) <= now);
  const passing = active.filter((a) => a.result);
  const failing = active.filter((a) => !a.result);

  if (active.length === 0) {
    return {
      overall: 0,
      breakdown: {
        debris: 0,
        cybersecurity: 0,
        authorization: 0,
        environmental: 0,
        spectrum: 0,
        insurance: 0,
      },
      attestationCount: attestations.length,
      passingCount: 0,
      failingCount: 0,
      expiredCount: expired.length,
      coveragePercent: 0,
      trend: "stable",
      computedAt: now.toISOString(),
    };
  }

  // Compute per-category scores
  const breakdown: ScoreBreakdown = {
    debris: 0,
    cybersecurity: 0,
    authorization: 0,
    environmental: 0,
    spectrum: 0,
    insurance: 0,
  };

  const categoryAttestations: Record<string, AttestationInput[]> = {};
  for (const cat of ALL_CATEGORIES) {
    categoryAttestations[cat] = [];
  }

  for (const a of active) {
    const prefix = Object.keys(CATEGORY_MAP).find((p) =>
      a.regulationRef.startsWith(p),
    );
    const category = prefix ? CATEGORY_MAP[prefix] : "authorization";
    categoryAttestations[category].push(a);
  }

  for (const cat of ALL_CATEGORIES) {
    const catAttestations = categoryAttestations[cat];
    if (catAttestations.length === 0) {
      breakdown[cat] = 0;
      continue;
    }

    const scores = catAttestations.map((a) => {
      const baseScore = a.result ? 100 : 0;
      const trustWeight = TRUST_WEIGHTS[a.trustLevel] ?? 0.5;
      return baseScore * trustWeight;
    });

    breakdown[cat] = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length,
    );
  }

  // Overall: weighted average of categories that have attestations
  const activeCats = ALL_CATEGORIES.filter(
    (c) => categoryAttestations[c].length > 0,
  );
  const overall =
    activeCats.length > 0
      ? Math.round(
          activeCats.reduce((sum, c) => sum + breakdown[c], 0) /
            activeCats.length,
        )
      : 0;

  // Coverage: how many of the 9 known thresholds have active attestations
  const knownThresholdCount = 9;
  const coveredRefs = new Set(active.map((a) => a.regulationRef));
  const coveragePercent = Math.round(
    (coveredRefs.size / knownThresholdCount) * 100,
  );

  return {
    overall,
    breakdown,
    attestationCount: attestations.length,
    passingCount: passing.length,
    failingCount: failing.length,
    expiredCount: expired.length,
    coveragePercent,
    trend: "stable",
    computedAt: now.toISOString(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/verity/score/calculator.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verity/score/calculator.ts src/lib/verity/score/calculator.test.ts
git commit -m "feat(verity): compliance score calculator with tests"
```

---

### Task 4: Passport Builder

**Files:**

- Create: `src/lib/verity/passport/builder.server.ts`
- Test: `src/lib/verity/passport/builder.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/verity/passport/builder.test.ts
import { describe, it, expect } from "vitest";
import { buildPassportData } from "./builder.server";

describe("buildPassportData", () => {
  it("builds passport from attestations and certificates", () => {
    const result = buildPassportData({
      passportId: "test-123",
      label: "Test Fleet",
      operatorId: "op-1",
      satelliteNorad: null,
      satelliteName: null,
      jurisdictions: ["FR", "DE"],
      attestations: [
        {
          attestationId: "va-1",
          regulationRef: "eu_art70_fuel_passivation",
          regulationName: "EU Space Act Art. 70 — Fuel Reserve",
          dataPoint: "fuel_reserve_percent",
          result: true,
          trustLevel: "HIGH",
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
      certificates: [],
    });

    expect(result.passportId).toBe("test-123");
    expect(result.complianceScore).toBeGreaterThan(0);
    expect(result.attestations).toHaveLength(1);
    expect(result.verificationUrl).toContain("test-123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/verity/passport/builder.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement passport builder**

```typescript
// src/lib/verity/passport/builder.server.ts
import "server-only";

import type {
  PassportData,
  PassportAttestationSummary,
  PassportCertificateSummary,
  GeneratePassportParams,
} from "./types";
import { computeComplianceScore } from "../score/calculator";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://caelex.eu";

export function buildPassportData(params: {
  passportId: string;
  label: string;
  operatorId: string;
  satelliteNorad: string | null;
  satelliteName: string | null;
  jurisdictions: string[];
  attestations: PassportAttestationSummary[];
  certificates: PassportCertificateSummary[];
}): PassportData {
  const {
    passportId,
    label,
    operatorId,
    satelliteNorad,
    satelliteName,
    jurisdictions,
    attestations,
    certificates,
  } = params;

  // Compute score from attestation data
  const scoreInput = attestations.map((a) => ({
    regulationRef: a.regulationRef,
    result: a.result,
    trustLevel: a.trustLevel,
    expiresAt: a.expiresAt,
  }));
  const score = computeComplianceScore(scoreInput);

  return {
    passportId,
    label,
    operatorId,
    satelliteNorad,
    satelliteName,
    complianceScore: score.overall,
    scoreBreakdown: score.breakdown as unknown as Record<string, number>,
    jurisdictions,
    attestations,
    certificates,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    verificationUrl: `${APP_URL}/verity/passport/${passportId}`,
  };
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/lib/verity/passport/builder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verity/passport/builder.server.ts src/lib/verity/passport/builder.test.ts
git commit -m "feat(verity): passport builder with score computation"
```

---

### Task 5: Passport API — Generate + Public View

**Files:**

- Create: `src/app/api/v1/verity/passport/generate/route.ts`
- Create: `src/app/api/v1/verity/passport/[passportId]/route.ts`

- [ ] **Step 1: Implement generate endpoint**

```typescript
// src/app/api/v1/verity/passport/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPassportData } from "@/lib/verity/passport/builder.server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        organization: { select: { name: true } },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const {
      satelliteNorad = null,
      satelliteName = null,
      label = "Compliance Passport",
      isPublic = true,
      expiresInDays = 30,
    } = body;

    const operatorId = member.organizationId;

    // Fetch active attestations
    const attestations = await prisma.verityAttestation.findMany({
      where: {
        organizationId: operatorId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(satelliteNorad ? { satelliteNorad } : {}),
      },
      orderBy: { issuedAt: "desc" },
    });

    // Fetch active certificates
    const certificates = await prisma.verityCertificate.findMany({
      where: {
        operatorId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(satelliteNorad ? { satelliteNorad } : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: 10,
    });

    // Build passport data
    const passportId = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const passportData = buildPassportData({
      passportId,
      label,
      operatorId,
      satelliteNorad,
      satelliteName,
      jurisdictions: [], // Populated from org config
      attestations: attestations.map((a) => ({
        attestationId: a.attestationId,
        regulationRef: a.regulationRef,
        regulationName: a.claimStatement.split(" — ")[0] || a.regulationRef,
        dataPoint: a.dataPoint,
        result: a.result,
        trustLevel: a.trustLevel,
        issuedAt: a.issuedAt.toISOString(),
        expiresAt: a.expiresAt.toISOString(),
      })),
      certificates: certificates.map((c) => ({
        certificateId: c.certificateId,
        claimsCount: c.claimsCount,
        minTrustLevel: c.minTrustLevel,
        issuedAt: c.issuedAt.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
      })),
    });

    // Store passport
    await prisma.verityPassport.create({
      data: {
        passportId,
        organizationId: operatorId,
        operatorId,
        satelliteNorad,
        satelliteName,
        label,
        attestationCount: attestations.length,
        certificateCount: certificates.length,
        complianceScore: passportData.complianceScore,
        scoreBreakdown: passportData.scoreBreakdown,
        attestationSummary: passportData.attestations,
        jurisdictions: passportData.jurisdictions,
        isPublic,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      passport: passportData,
      shareUrl: passportData.verificationUrl,
    });
  } catch (error) {
    console.error("Error generating passport:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Implement public view endpoint**

```typescript
// src/app/api/v1/verity/passport/[passportId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ passportId: string }> },
) {
  try {
    const { passportId } = await params;

    const passport = await prisma.verityPassport.findUnique({
      where: { passportId },
    });

    if (!passport) {
      return NextResponse.json(
        { error: "Passport not found" },
        { status: 404 },
      );
    }

    if (!passport.isPublic) {
      return NextResponse.json(
        { error: "Passport is private" },
        { status: 403 },
      );
    }

    if (passport.revokedAt) {
      return NextResponse.json(
        { error: "Passport has been revoked" },
        { status: 410 },
      );
    }

    if (passport.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Passport has expired" },
        { status: 410 },
      );
    }

    // Increment view count
    await prisma.verityPassport.update({
      where: { passportId },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json({
      passportId: passport.passportId,
      label: passport.label,
      operatorId: passport.operatorId,
      satelliteNorad: passport.satelliteNorad,
      satelliteName: passport.satelliteName,
      complianceScore: passport.complianceScore,
      scoreBreakdown: passport.scoreBreakdown,
      attestationCount: passport.attestationCount,
      certificateCount: passport.certificateCount,
      attestations: passport.attestationSummary,
      jurisdictions: passport.jurisdictions,
      generatedAt: passport.generatedAt.toISOString(),
      expiresAt: passport.expiresAt.toISOString(),
      viewCount: passport.viewCount + 1,
    });
  } catch (error) {
    console.error("Error fetching passport:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/verity/passport/
git commit -m "feat(verity): passport generate + public view API endpoints"
```

---

### Task 6: Public Passport Page

**Files:**

- Create: `src/app/verity/passport/[passportId]/page.tsx`
- Create: `src/app/verity/passport/[passportId]/PassportView.tsx`

- [ ] **Step 1: Create server page (fetches data)**

```typescript
// src/app/verity/passport/[passportId]/page.tsx
import { Metadata } from "next";
import PassportView from "./PassportView";

interface Props {
  params: Promise<{ passportId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { passportId } = await params;
  return {
    title: `Compliance Passport — Caelex Verity`,
    description: `Cryptographically verified compliance passport ${passportId}`,
    openGraph: {
      title: "Compliance Passport — Caelex Verity",
      description: "Independently verifiable compliance status for space operations",
    },
  };
}

export default async function PassportPage({ params }: Props) {
  const { passportId } = await params;
  return <PassportView passportId={passportId} />;
}
```

- [ ] **Step 2: Create client view component**

Create `PassportView.tsx` — a full-page public passport view with:

- Compliance score ring (0-100, color-coded)
- Category breakdown bars
- Attestation list with PASS/FAIL badges and trust level indicators
- Certificate summary
- "Powered by Caelex Verity" branding footer
- "Verify this passport" link
- Caelex design system (Glass design, dark theme, emerald accents)

This is a large component (~300 lines). The implementer should follow the existing `src/app/verity/VerityPageClient.tsx` patterns for styling, and use the Glass design system classes (`glass-surface`, `glass-elevated`).

Key sections of the PassportView:

1. **Header**: Passport ID, label, satellite name, generated date, expiry
2. **Score Ring**: Large circular score (0-100) with color gradient (red < 40, amber < 70, green ≥ 70)
3. **Category Breakdown**: Horizontal bars per category (debris, cybersecurity, etc.)
4. **Attestations Grid**: Cards showing each attestation with regulation name, PASS/FAIL, trust badge
5. **Verification Footer**: "This passport is cryptographically verified by Caelex Verity" + public key link
6. **CTA**: "Get your compliance passport at caelex.eu"

- [ ] **Step 3: Commit**

```bash
git add src/app/verity/passport/
git commit -m "feat(verity): public compliance passport page"
```

---

## Chunk 3: Features 2-3 — NCA Bridge + Score API

### Task 7: NCA Submission Bundle

**Files:**

- Create: `src/lib/verity/nca-bridge/types.ts`
- Create: `src/lib/verity/nca-bridge/submission-builder.server.ts`
- Create: `src/app/api/v1/verity/nca-bundle/route.ts`

- [ ] **Step 1: Create NCA bridge types**

```typescript
// src/lib/verity/nca-bridge/types.ts

export interface NCASubmissionBundle {
  bundleId: string;
  jurisdiction: string;
  authority: string;
  operatorId: string;
  satelliteNorad: string | null;
  generatedAt: string;

  // Attestations relevant to this NCA
  attestations: Array<{
    attestationId: string;
    regulationRef: string;
    result: boolean;
    trustLevel: string;
    signature: string;
    issuedAt: string;
    expiresAt: string;
  }>;

  // Verification instructions for the NCA
  verification: {
    publicKeyUrl: string;
    verificationUrl: string;
    instructions: string;
  };

  // Compliance score at time of bundle
  complianceScore: number;
}
```

- [ ] **Step 2: Implement NCA submission builder**

Build `submission-builder.server.ts` that:

- Takes an organization ID, jurisdiction code, and optional satellite NORAD
- Fetches active attestations for that org
- Filters to only attestations relevant to the target NCA's jurisdiction
- Cross-references with NCA threshold profiles from `src/lib/shield/nca-thresholds.server.ts`
- Bundles attestations with verification instructions
- Returns `NCASubmissionBundle`

- [ ] **Step 3: Implement API endpoint**

`POST /api/v1/verity/nca-bundle` — Authenticated. Takes `{ jurisdiction, satelliteNorad? }`. Returns `NCASubmissionBundle`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/verity/nca-bridge/ src/app/api/v1/verity/nca-bundle/
git commit -m "feat(verity): NCA submission bundle builder + API"
```

---

### Task 8: Public Compliance Score API

**Files:**

- Create: `src/app/api/v1/verity/score/[operatorId]/route.ts`

- [ ] **Step 1: Implement public score endpoint**

`GET /api/v1/verity/score/[operatorId]` — Public, no auth. Returns:

- `ComplianceScore` computed from all active attestations for the operator
- Query param `?satellite=NORAD_ID` to filter to specific satellite
- Rate limited (public_api tier)

The endpoint:

1. Fetches active non-revoked attestations for `operatorId`
2. Calls `computeComplianceScore()` from `src/lib/verity/score/calculator.ts`
3. Returns score with breakdown

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/verity/score/
git commit -m "feat(verity): public compliance score API endpoint"
```

---

## Chunk 4: Feature 4 — Peer-to-Peer Verification

### Task 9: P2P Request/Response Flow

**Files:**

- Create: `src/lib/verity/p2p/request-builder.ts`
- Create: `src/app/api/v1/verity/p2p/request/route.ts`
- Create: `src/app/api/v1/verity/p2p/respond/[requestId]/route.ts`
- Create: `src/app/api/v1/verity/p2p/verify/[requestId]/route.ts`
- Test: `src/lib/verity/p2p/request-builder.test.ts`

- [ ] **Step 1: Implement request builder**

```typescript
// src/lib/verity/p2p/request-builder.ts
export function buildVerificationRequest(params: {
  requesterName: string;
  regulationRefs: string[];
  purpose: string;
  message?: string;
  expiresInDays?: number;
}): { requestId: string; expiresAt: string } {
  return {
    requestId: `vr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: new Date(
      Date.now() + (params.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}
```

- [ ] **Step 2: Implement POST /api/v1/verity/p2p/request**

Authenticated. Creates a `VerityP2PRequest` in the database. Sends notification to target org.

- [ ] **Step 3: Implement POST /api/v1/verity/p2p/respond/[requestId]**

Authenticated (target org only). Body: `{ status: "APPROVED" | "DECLINED", message?, attestationIds? }`.

- If APPROVED: shares specified attestation data (without actual values — only signed attestations)
- If DECLINED: stores reason

- [ ] **Step 4: Implement GET /api/v1/verity/p2p/verify/[requestId]**

Public. Returns the P2P verification result (if APPROVED) so requester can verify the shared attestations.

- [ ] **Step 5: Write tests for request builder**

- [ ] **Step 6: Commit**

```bash
git add src/lib/verity/p2p/ src/app/api/v1/verity/p2p/
git commit -m "feat(verity): peer-to-peer verification request/respond flow"
```

---

## Chunk 5: Feature 5 — Compliance Audit Chain

### Task 10: Audit Chain Writer + Verifier

**Files:**

- Create: `src/lib/verity/audit-chain/chain-writer.server.ts`
- Create: `src/lib/verity/audit-chain/chain-verifier.ts`
- Test: `src/lib/verity/audit-chain/chain-writer.test.ts`
- Test: `src/lib/verity/audit-chain/chain-verifier.test.ts`

- [ ] **Step 1: Write failing tests for chain writer**

```typescript
// src/lib/verity/audit-chain/chain-writer.test.ts
import { describe, it, expect } from "vitest";
import { computeEntryHash } from "./chain-writer.server";

describe("computeEntryHash", () => {
  it("produces deterministic hash", () => {
    const hash1 = computeEntryHash(
      1,
      "ATTESTATION_CREATED",
      "va-1",
      {},
      "GENESIS",
    );
    const hash2 = computeEntryHash(
      1,
      "ATTESTATION_CREATED",
      "va-1",
      {},
      "GENESIS",
    );
    expect(hash1).toBe(hash2);
  });

  it("changes when previousHash changes", () => {
    const hash1 = computeEntryHash(
      1,
      "ATTESTATION_CREATED",
      "va-1",
      {},
      "GENESIS",
    );
    const hash2 = computeEntryHash(
      1,
      "ATTESTATION_CREATED",
      "va-1",
      {},
      "abc123",
    );
    expect(hash1).not.toBe(hash2);
  });
});
```

- [ ] **Step 2: Implement chain writer**

```typescript
// src/lib/verity/audit-chain/chain-writer.server.ts
import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { AuditEventType } from "./types";

export function computeEntryHash(
  sequenceNumber: number,
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  previousHash: string,
): string {
  const payload = JSON.stringify({
    sequenceNumber,
    eventType,
    entityId,
    eventData,
    previousHash,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function appendToChain(params: {
  organizationId: string;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  eventData: Record<string, unknown>;
}): Promise<{ sequenceNumber: number; entryHash: string }> {
  const { organizationId, eventType, entityId, entityType, eventData } = params;

  // Get latest entry for this org
  const latest = await prisma.verityAuditChainEntry.findFirst({
    where: { organizationId },
    orderBy: { sequenceNumber: "desc" },
    select: { sequenceNumber: true, entryHash: true },
  });

  const sequenceNumber = latest ? latest.sequenceNumber + 1 : 1;
  const previousHash = latest ? latest.entryHash : "GENESIS";

  const entryHash = computeEntryHash(
    sequenceNumber,
    eventType,
    entityId,
    eventData,
    previousHash,
  );

  await prisma.verityAuditChainEntry.create({
    data: {
      organizationId,
      sequenceNumber,
      eventType,
      entityId,
      entityType,
      eventData,
      entryHash,
      previousHash,
    },
  });

  return { sequenceNumber, entryHash };
}
```

- [ ] **Step 3: Implement chain verifier**

```typescript
// src/lib/verity/audit-chain/chain-verifier.ts
import { computeEntryHash } from "./chain-writer.server";
import type { ChainVerificationResult } from "./types";

interface ChainEntry {
  sequenceNumber: number;
  eventType: string;
  entityId: string;
  eventData: Record<string, unknown>;
  entryHash: string;
  previousHash: string;
  createdAt: string;
}

export function verifyChain(entries: ChainEntry[]): ChainVerificationResult {
  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      brokenAt: null,
      firstEntry: "",
      lastEntry: "",
      errors: [],
    };
  }

  const sorted = [...entries].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber,
  );
  const errors: string[] = [];

  // Check first entry has GENESIS previous
  if (sorted[0].previousHash !== "GENESIS") {
    errors.push(
      `First entry (seq ${sorted[0].sequenceNumber}) previousHash is not GENESIS`,
    );
  }

  let brokenAt: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    // Verify hash
    const expectedHash = computeEntryHash(
      entry.sequenceNumber,
      entry.eventType,
      entry.entityId,
      entry.eventData,
      entry.previousHash,
    );

    if (entry.entryHash !== expectedHash) {
      errors.push(`Entry ${entry.sequenceNumber}: hash mismatch (tampered)`);
      if (brokenAt === null) brokenAt = entry.sequenceNumber;
    }

    // Verify chain linkage
    if (i > 0 && entry.previousHash !== sorted[i - 1].entryHash) {
      errors.push(
        `Entry ${entry.sequenceNumber}: previousHash doesn't match entry ${sorted[i - 1].sequenceNumber}`,
      );
      if (brokenAt === null) brokenAt = entry.sequenceNumber;
    }
  }

  return {
    valid: errors.length === 0,
    totalEntries: sorted.length,
    brokenAt,
    firstEntry: sorted[0].createdAt,
    lastEntry: sorted[sorted.length - 1].createdAt,
    errors,
  };
}
```

- [ ] **Step 4: Write chain verifier tests**

- [ ] **Step 5: Run all tests**

Run: `npx vitest run src/lib/verity/audit-chain/`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/verity/audit-chain/
git commit -m "feat(verity): tamper-proof audit chain writer + verifier"
```

---

### Task 11: Audit Chain API Endpoints

**Files:**

- Create: `src/app/api/v1/verity/audit-chain/[operatorId]/route.ts`
- Create: `src/app/api/v1/verity/audit-chain/verify/route.ts`

- [ ] **Step 1: GET /api/v1/verity/audit-chain/[operatorId]**

Returns the full audit chain for an operator. Query params: `?from=seq&to=seq` for pagination.

- [ ] **Step 2: POST /api/v1/verity/audit-chain/verify**

Public. Takes `{ operatorId }`. Fetches chain and runs `verifyChain()`. Returns `ChainVerificationResult`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/verity/audit-chain/
git commit -m "feat(verity): audit chain API endpoints"
```

---

### Task 12: Integrate Audit Chain into Existing Verity Flows

**Files:**

- Modify: `src/lib/verity/evaluation/threshold-evaluator.ts`
- Modify: `src/lib/verity/evaluation/auto-attestation.server.ts`
- Modify: `src/lib/verity/certificates/generator.ts`

- [ ] **Step 1: Add chain append after attestation creation in threshold-evaluator.ts**

After the `prisma.verityAttestation.create()` call in `evaluateAndAttest()`, add:

```typescript
import { appendToChain } from "../audit-chain/chain-writer.server";

// After creating attestation in DB:
await appendToChain({
  organizationId: params.organizationId ?? params.operatorId,
  eventType: "ATTESTATION_CREATED",
  entityId: attestation.attestation_id,
  entityType: "attestation",
  eventData: {
    regulationRef: attestation.claim.regulation_ref,
    result: attestation.claim.result,
    trustLevel: attestation.evidence.trust_level,
  },
}).catch(() => {}); // Non-blocking — chain is advisory
```

- [ ] **Step 2: Add chain append for revocations in auto-attestation.server.ts**

When revoking an attestation, append `ATTESTATION_REVOKED` event.

- [ ] **Step 3: Add chain append for certificate issuance**

After `issueCertificate()`, append `CERTIFICATE_ISSUED` event.

- [ ] **Step 4: Run existing tests to verify nothing breaks**

Run: `npx vitest run src/lib/verity/`
Expected: All existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verity/evaluation/threshold-evaluator.ts src/lib/verity/evaluation/auto-attestation.server.ts src/lib/verity/certificates/generator.ts
git commit -m "feat(verity): integrate audit chain into attestation + certificate flows"
```

---

## Chunk 6: Dashboard Integration

### Task 13: Update Verity Dashboard

**Files:**

- Modify: `src/app/dashboard/verity/page.tsx`

- [ ] **Step 1: Add Passport tab**

Add a new tab "Passports" that:

- Lists existing passports with score, view count, expiry
- "Generate Passport" button that calls `/api/v1/verity/passport/generate`
- Copy link button for sharing
- Shows QR code for mobile sharing (optional, stretch)

- [ ] **Step 2: Add Compliance Score widget**

Add a score summary card to the main dashboard showing:

- Overall score (0-100) in a circular gauge
- Category breakdown bars
- Trend indicator (improving/declining/stable)
- "Share Score" link

- [ ] **Step 3: Add P2P section**

Add "Verification Requests" section:

- Incoming requests (with Approve/Decline buttons)
- Outgoing requests (with status)
- "New Request" form

- [ ] **Step 4: Add Audit Chain section**

Add "Audit Trail" section:

- Chain integrity status (verified/broken)
- Total entries count
- Latest events list
- "Verify Chain" button

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/verity/page.tsx
git commit -m "feat(verity): dashboard with passports, score, p2p, audit chain"
```

---

## Execution Notes

### Build Order (Dependencies)

```
Task 1 (Schema) → Task 2 (Types) → Task 3 (Score) → Task 4 (Passport Builder)
                                   → Task 7 (NCA Bridge)
                                   → Task 8 (Score API)
Task 4 → Task 5 (Passport API) → Task 6 (Passport Page)
Task 2 → Task 9 (P2P Flow)
Task 2 → Task 10 (Audit Chain Core) → Task 11 (Audit Chain API) → Task 12 (Integration)
All → Task 13 (Dashboard)
```

### Parallelizable Tasks

- Tasks 7, 8, 9, 10 can run in parallel after Task 2
- Task 6 and Task 11 can run in parallel after their dependencies
- Task 13 runs last (depends on all features)

### Testing Strategy

- Pure functions (score calculator, chain verifier, request builder) → unit tests with Vitest
- API endpoints → manual testing via curl + dashboard UI
- Integration → existing Verity tests should continue passing

### CSRF Exemption

The public passport and score endpoints need CSRF exemption in middleware since they're unauthenticated GET requests. Add to `CSRF_EXEMPT_ROUTES`:

```typescript
"/api/v1/verity/passport/",    // Public passport view
"/api/v1/verity/score/",       // Public compliance score
"/api/v1/verity/p2p/verify/",  // Public P2P verification
"/api/v1/verity/audit-chain/verify", // Public chain verification
```

Note: These are GET endpoints so CSRF doesn't apply (CSRF only checks mutating methods), but list them for documentation.
