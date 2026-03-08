# Sentinel Phase 3: Quality & Scale — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Sentinel system for enterprise scale — incremental chain verification, parallel cross-verification, dashboard error handling, multi-tenant attestation isolation, GDPR erasure API, and trust-weighted ephemeris integration.

**Architecture:** Performance-critical changes (chain verification O(n)→O(1) amortized, cross-verify serial→parallel), schema migration (organizationId FK on VerityAttestation), UX hardening (error states), and compliance completion (GDPR Art. 17 erasure endpoint). Phase 3.7 (public key fallback removal) was already completed in Phase 1 — skip it.

**Tech Stack:** Next.js 15 App Router, Prisma 5.22, Zod, Ed25519 (node:crypto), satellite.js (SGP4), Vitest

---

## Task P3-1: Incremental Chain Verification (SVA-32, §9.1)

**Problem:** `verifyChain()` in `sentinel-service.server.ts:213-269` fetches ALL packets every time — O(n) per call. With 100k+ packets per agent, this will timeout on Vercel's 60s limit.

**Solution:** Add `lastVerifiedPosition` + `lastVerifiedHash` to `SentinelAgent` model. Verify only from last checkpoint forward. Update checkpoint atomically after successful verification.

**Files:**

- Modify: `prisma/schema.prisma` — Add fields to `SentinelAgent` model
- Modify: `src/lib/services/sentinel-service.server.ts:213-269` — Rewrite `verifyChain()`
- Modify: `src/lib/services/sentinel-service.server.test.ts` — Update chain verification tests

**Step 1: Add checkpoint fields to SentinelAgent**

In `prisma/schema.prisma`, find the `SentinelAgent` model and add two fields before the closing `}`:

```prisma
  // Chain verification checkpoint (for incremental verification)
  lastVerifiedPosition Int?
  lastVerifiedHash     String?
```

Run: `npx prisma db push --skip-generate && npx prisma generate`

**Step 2: Rewrite `verifyChain()` for incremental verification**

In `src/lib/services/sentinel-service.server.ts`, replace the entire `verifyChain()` function (lines 213-269) with:

```typescript
/**
 * Verifies the hash-chain integrity for a Sentinel agent.
 * Incremental: only verifies packets after lastVerifiedPosition.
 * Updates checkpoint atomically on success.
 *
 * @param agentId - The agent's database ID
 * @param fullVerify - If true, re-verify entire chain from genesis (ignores checkpoint)
 */
export async function verifyChain(
  agentId: string,
  fullVerify = false,
): Promise<{
  valid: boolean;
  total_packets: number;
  verified_from: number;
  verified_to: number;
  breaks: Array<{ position: number; expected: string; actual: string }>;
  incremental: boolean;
}> {
  const agent = await prisma.sentinelAgent.findUnique({
    where: { id: agentId },
    select: { lastVerifiedPosition: true, lastVerifiedHash: true },
  });

  const startPosition = fullVerify ? null : agent?.lastVerifiedPosition;
  const startHash = fullVerify ? null : agent?.lastVerifiedHash;

  // Fetch only unverified packets (or all if fullVerify / no checkpoint)
  const packets = await prisma.sentinelPacket.findMany({
    where: {
      agentId,
      ...(startPosition != null
        ? { chainPosition: { gt: startPosition } }
        : {}),
    },
    orderBy: { chainPosition: "asc" },
    select: {
      packetId: true,
      chainPosition: true,
      contentHash: true,
      previousHash: true,
      signatureValid: true,
    },
  });

  if (packets.length === 0) {
    return {
      valid: true,
      total_packets: 0,
      verified_from: startPosition ?? 0,
      verified_to: startPosition ?? 0,
      breaks: [],
      incremental: startPosition != null,
    };
  }

  const breaks: Array<{ position: number; expected: string; actual: string }> =
    [];

  // Determine expected state for first packet in this window
  let expectedPrevHash = startHash ?? "sha256:genesis";
  let expectedPosition = (startPosition ?? -1) + 1;

  for (const packet of packets) {
    // Position continuity check
    if (packet.chainPosition !== expectedPosition) {
      breaks.push({
        position: packet.chainPosition,
        expected: `position ${expectedPosition}`,
        actual: `position ${packet.chainPosition}`,
      });
    }

    // Hash chain continuity check
    if (packet.previousHash !== expectedPrevHash) {
      breaks.push({
        position: packet.chainPosition,
        expected: expectedPrevHash,
        actual: packet.previousHash,
      });
    }

    expectedPrevHash = packet.contentHash;
    expectedPosition = packet.chainPosition + 1;
  }

  const lastPacket = packets[packets.length - 1]!;

  // Update checkpoint atomically if chain is valid
  if (breaks.length === 0) {
    await prisma.sentinelAgent.update({
      where: { id: agentId },
      data: {
        lastVerifiedPosition: lastPacket.chainPosition,
        lastVerifiedHash: lastPacket.contentHash,
      },
    });
  }

  return {
    valid: breaks.length === 0,
    total_packets: packets.length,
    verified_from: packets[0]!.chainPosition,
    verified_to: lastPacket.chainPosition,
    breaks,
    incremental: startPosition != null,
  };
}
```

**Step 3: Update chain verify API route**

In `src/app/api/v1/sentinel/chain/verify/route.ts`, add `full_verify` query param support. After the `agentId` extraction (line 48), add:

```typescript
const fullVerify = url.searchParams.get("full_verify") === "true";
// ... existing agent lookup ...
const result = await verifyChain(agentId, fullVerify);
```

Replace `const result = await verifyChain(agentId);` with `const result = await verifyChain(agentId, fullVerify);`

**Step 4: Update tests**

In `sentinel-service.server.test.ts`, update the `verifyChain` tests to account for the new return shape (`verified_from`, `verified_to`, `incremental` fields) and add a test for incremental mode:

```typescript
it("should verify incrementally from checkpoint", async () => {
  // Mock agent with checkpoint at position 2
  vi.mocked(prisma.sentinelAgent.findUnique).mockResolvedValue({
    lastVerifiedPosition: 2,
    lastVerifiedHash: "sha256:hash_at_2",
  } as any);

  // Only return packets after position 2
  vi.mocked(prisma.sentinelPacket.findMany).mockResolvedValue([
    {
      packetId: "p3",
      chainPosition: 3,
      contentHash: "sha256:hash_3",
      previousHash: "sha256:hash_at_2",
      signatureValid: true,
    },
  ] as any);

  vi.mocked(prisma.sentinelAgent.update).mockResolvedValue({} as any);

  const result = await verifyChain("agent-1");
  expect(result.valid).toBe(true);
  expect(result.incremental).toBe(true);
  expect(result.verified_from).toBe(3);
  expect(result.verified_to).toBe(3);
});
```

**Step 5: Run tests**

```bash
npx vitest run src/lib/services/sentinel-service.server.test.ts
```

**Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/services/sentinel-service.server.ts src/app/api/v1/sentinel/chain/verify/route.ts src/lib/services/sentinel-service.server.test.ts
git commit -m "perf(sentinel): incremental chain verification with checkpoint (SVA-32)"
```

---

## Task P3-2: Parallel Cross-Verification Batch (SVA-33, §9.2)

**Problem:** `crossVerifyAgent()` in `cross-verification.server.ts:381-414` processes packets sequentially. 100 packets × 15s CelesTrak timeout = 25+ min worst case. Serverless timeout is 60s.

**Solution:** Process packets in parallel batches of 5 (respect CelesTrak rate limits), with early abort on timeout approaching. Pre-fetch unique NORAD IDs to minimize HTTP calls.

**Files:**

- Modify: `src/lib/services/cross-verification.server.ts:381-414` — Rewrite `crossVerifyAgent()`

**Step 1: Rewrite batch function**

In `cross-verification.server.ts`, replace the `crossVerifyAgent()` function with:

```typescript
const BATCH_CONCURRENCY = 5;
const BATCH_TIMEOUT_MS = 50_000; // Leave 10s buffer for Vercel's 60s limit

export async function crossVerifyAgent(agentId: string): Promise<{
  total: number;
  verified: number;
  failed: number;
  skipped: number;
}> {
  const startTime = Date.now();

  const packets = await prisma.sentinelPacket.findMany({
    where: {
      agentId,
      dataPoint: "orbital_parameters",
      crossVerified: false,
      satelliteNorad: { not: null },
    },
    orderBy: { chainPosition: "asc" },
    take: 100,
    select: { id: true, satelliteNorad: true },
  });

  if (packets.length === 0) {
    return { total: 0, verified: 0, failed: 0, skipped: 0 };
  }

  // Pre-warm TLE cache: fetch unique NORAD IDs upfront
  const uniqueNorads = [...new Set(packets.map((p) => p.satelliteNorad!))];
  await Promise.allSettled(uniqueNorads.map((n) => fetchTLE(n)));

  let verified = 0;
  let failed = 0;
  let skipped = 0;

  // Process in parallel batches
  for (let i = 0; i < packets.length; i += BATCH_CONCURRENCY) {
    // Timeout guard: abort if approaching serverless limit
    if (Date.now() - startTime > BATCH_TIMEOUT_MS) {
      skipped += packets.length - i;
      break;
    }

    const batch = packets.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) => crossVerifyPacket(p.id)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        failed++;
      } else if (result.value === null) {
        skipped++;
      } else if (result.value.verified) {
        verified++;
      } else {
        failed++;
      }
    }
  }

  return { total: packets.length, verified, failed, skipped };
}
```

**Step 2: Run existing tests**

```bash
npx vitest run src/lib/services/cross-verification.server.test.ts
```

**Step 3: Commit**

```bash
git add src/lib/services/cross-verification.server.ts
git commit -m "perf(sentinel): parallel cross-verify batches with timeout guard (SVA-33)"
```

---

## Task P3-3: Dashboard Error State Handling (SVA-52, §7.4)

**Problem:** All fetch calls in `src/app/dashboard/sentinel/page.tsx` silently catch errors (lines 143-156, 158-171). Users see stale/empty data with no indication of failure.

**Solution:** Add `error` state, show error banner with retry, and add toast notifications on fetch failure.

**Files:**

- Modify: `src/app/dashboard/sentinel/page.tsx`

**Step 1: Add error state and update fetch handlers**

In the `SentinelDashboard` component, after the existing state declarations (around line 138), add:

```typescript
const [error, setError] = useState<string | null>(null);
```

Then update `fetchAgents` to set error state on failure. Replace the existing `fetchAgents` callback:

```typescript
const fetchAgents = useCallback(async () => {
  try {
    setError(null);
    const res = await fetch("/api/v1/sentinel/agents");
    if (!res.ok) {
      setError(`Failed to load agents (${res.status})`);
      return;
    }
    const json = await res.json();
    setAgents(json.data || []);
  } catch (err) {
    setError("Network error — could not reach Sentinel API");
  }
}, []);
```

Similarly update `fetchPackets` and `verifyChain` handlers to call `setError()` on failure instead of silently catching.

**Step 2: Add error banner component**

After the `ChainIntegrityBanner` sub-component definition, add an error banner:

```tsx
function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-small text-red-300">{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="text-small font-medium text-red-400 hover:text-red-300"
      >
        Retry
      </button>
    </div>
  );
}
```

Make sure `AlertCircle` is in the lucide-react imports at the top of the file.

**Step 3: Render error banner in main dashboard**

In the main return, before the agent selector section, add:

```tsx
{
  error && <ErrorBanner message={error} onRetry={fetchAgents} />;
}
```

**Step 4: Commit**

```bash
git add src/app/dashboard/sentinel/page.tsx
git commit -m "fix(sentinel): add error state handling to dashboard (SVA-52)"
```

---

## Task P3-4: Add organizationId FK to VerityAttestation (SVA-38, §8.5)

**Problem:** `VerityAttestation` links to users via `operatorId` but has no direct organization reference. Multi-tenant queries require joining through user→membership→org, which is error-prone and slow.

**Solution:** Add `organizationId` FK + index to `VerityAttestation`. Populate it during attestation creation.

**Files:**

- Modify: `prisma/schema.prisma` — Add field + relation + index to `VerityAttestation`
- Modify: `src/app/api/v1/verity/attestation/[id]/route.ts` — Scope GET to organization

**Step 1: Add organizationId to VerityAttestation**

In `prisma/schema.prisma`, find the `VerityAttestation` model. After the `operatorId` field, add:

```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
```

Add to the existing indexes section:

```prisma
  @@index([organizationId])
```

Also add to the `Organization` model a reverse relation. Find the Organization model and add:

```prisma
  verityAttestations VerityAttestation[]
```

Run: `npx prisma db push --skip-generate && npx prisma generate`

**Step 2: Scope attestation GET to organization**

In `src/app/api/v1/verity/attestation/[id]/route.ts`, after the auth check, add organization scoping:

```typescript
// Get user's organization for tenant isolation
const membership = await prisma.organizationMember.findFirst({
  where: { userId: session.user.id },
  select: { organizationId: true },
});

if (!membership) {
  return NextResponse.json({ error: "No organization" }, { status: 403 });
}
```

Then update the `findUnique` query to include organization check:

```typescript
const attestation = await prisma.verityAttestation.findFirst({
  where: {
    attestationId: id,
    OR: [
      { organizationId: membership.organizationId },
      { operatorId: session.user.id },
    ],
  },
});
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma src/app/api/v1/verity/attestation/\[id\]/route.ts
git commit -m "feat(verity): add organizationId FK to VerityAttestation (SVA-38)"
```

---

## Task P3-5: GDPR Art. 17 Data Erasure API (SVA-37, §8.1)

**Problem:** No mechanism for GDPR "right to erasure" for Sentinel and Verity data. The existing `data-retention-cleanup` cron only handles time-based deletion, not user-initiated erasure requests.

**Solution:** Add a DELETE endpoint at `/api/v1/sentinel/data-erasure` that allows OWNER/ADMIN to request erasure of all Sentinel data for a specific agent, and all Verity attestations for their organization.

**Files:**

- Create: `src/app/api/v1/sentinel/data-erasure/route.ts`

**Step 1: Create the erasure endpoint**

Create `src/app/api/v1/sentinel/data-erasure/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

const ErasureSchema = z.object({
  scope: z.enum(["agent", "organization"]),
  agent_id: z.string().uuid().optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Must confirm erasure with confirm: true" }),
  }),
});

/**
 * DELETE /api/v1/sentinel/data-erasure
 * GDPR Art. 17 — Right to erasure for Sentinel/Verity data.
 * Auth: Session-based, OWNER or ADMIN only.
 *
 * Scopes:
 * - "agent": Deletes all packets, cross-verifications for a specific agent
 * - "organization": Deletes all Sentinel agents + data + Verity attestations for the org
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only OWNER or ADMIN can request data erasure" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = ErasureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { scope, agent_id } = parsed.data;

    if (scope === "agent") {
      if (!agent_id) {
        return NextResponse.json(
          { error: "agent_id required for agent-scope erasure" },
          { status: 400 },
        );
      }

      // Verify agent belongs to org
      const agent = await prisma.sentinelAgent.findFirst({
        where: { id: agent_id, organizationId: membership.organizationId },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      // Cascade: CrossVerification → SentinelPacket → SentinelAgent (all cascade)
      // Deleting agent cascades packets and cross-verifications
      const [deletedCrossVerifications, deletedPackets] =
        await prisma.$transaction([
          prisma.crossVerification.deleteMany({
            where: { agentId: agent_id },
          }),
          prisma.sentinelPacket.deleteMany({ where: { agentId: agent_id } }),
        ]);

      // Reset agent data but keep the record (for audit trail)
      await prisma.sentinelAgent.update({
        where: { id: agent_id },
        data: {
          status: "REVOKED",
          chainPosition: 0,
          lastVerifiedPosition: null,
          lastVerifiedHash: null,
          lastPacketAt: null,
        },
      });

      logger.info("[data-erasure] Agent data erased (GDPR Art. 17)", {
        agentId: agent_id,
        userId: session.user.id,
        packets: deletedPackets.count,
        crossVerifications: deletedCrossVerifications.count,
      });

      return NextResponse.json({
        success: true,
        scope: "agent",
        erased: {
          packets: deletedPackets.count,
          cross_verifications: deletedCrossVerifications.count,
        },
        processedAt: new Date().toISOString(),
      });
    }

    // scope === "organization"
    const orgId = membership.organizationId;

    const [deletedAttestations, agentIds] = await Promise.all([
      prisma.verityAttestation.deleteMany({
        where: { organizationId: orgId },
      }),
      prisma.sentinelAgent.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      }),
    ]);

    const ids = agentIds.map((a) => a.id);

    const [deletedCrossVerifications, deletedPackets] =
      await prisma.$transaction([
        prisma.crossVerification.deleteMany({
          where: { agentId: { in: ids } },
        }),
        prisma.sentinelPacket.deleteMany({
          where: { agentId: { in: ids } },
        }),
      ]);

    // Revoke all agents
    await prisma.sentinelAgent.updateMany({
      where: { organizationId: orgId },
      data: {
        status: "REVOKED",
        chainPosition: 0,
        lastVerifiedPosition: null,
        lastVerifiedHash: null,
        lastPacketAt: null,
      },
    });

    logger.info("[data-erasure] Organization data erased (GDPR Art. 17)", {
      organizationId: orgId,
      userId: session.user.id,
      attestations: deletedAttestations.count,
      packets: deletedPackets.count,
      crossVerifications: deletedCrossVerifications.count,
      agents: ids.length,
    });

    return NextResponse.json({
      success: true,
      scope: "organization",
      erased: {
        attestations: deletedAttestations.count,
        packets: deletedPackets.count,
        cross_verifications: deletedCrossVerifications.count,
        agents_revoked: ids.length,
      },
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[data-erasure] GDPR erasure failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/v1/sentinel/data-erasure/route.ts
git commit -m "feat(sentinel): add GDPR Art. 17 data erasure endpoint (SVA-37)"
```

---

## Task P3-6: Dashboard Fetch Error Handling for Packets and Chain (SVA-52 continued)

**Problem:** P3-3 only handles agent fetch errors. Packet fetching (`fetchPackets`) and chain verification (`verifyChain`) in the dashboard also silently swallow errors.

**Files:**

- Modify: `src/app/dashboard/sentinel/page.tsx`

**Step 1: Update fetchPackets**

Find the `fetchPackets` callback and update it to set error state:

```typescript
const fetchPackets = useCallback(async (agentId: string) => {
  try {
    const res = await fetch(
      `/api/v1/sentinel/packets?agent_id=${agentId}&limit=50`,
    );
    if (!res.ok) {
      setError(`Failed to load packets (${res.status})`);
      return;
    }
    const json = await res.json();
    setPackets(json.data || []);
  } catch {
    setError("Network error — could not load evidence packets");
  }
}, []);
```

**Step 2: Update verifyChain handler**

Find the chain verification handler and update:

```typescript
const handleVerifyChain = useCallback(async (agentId: string) => {
  try {
    setIsVerifying(true);
    setError(null);
    const res = await fetch(
      `/api/v1/sentinel/chain/verify?agent_id=${agentId}`,
    );
    if (!res.ok) {
      setError(`Chain verification failed (${res.status})`);
      return;
    }
    const json = await res.json();
    setChainResult(json.data);
  } catch {
    setError("Network error — chain verification unavailable");
  } finally {
    setIsVerifying(false);
  }
}, []);
```

**Step 3: Commit**

```bash
git add src/app/dashboard/sentinel/page.tsx
git commit -m "fix(sentinel): complete error handling for all dashboard fetches (SVA-52)"
```

---

## Task P3-7: Sentinel Health Endpoint (SVA-53)

**Problem:** No aggregate health endpoint to monitor overall Sentinel system status. Operators and monitoring tools need a single endpoint to check if the system is healthy.

**Files:**

- Create: `src/app/api/v1/sentinel/health/route.ts`

**Step 1: Create health endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/sentinel/health
 * Aggregate Sentinel health status for the organization.
 * Auth: Session-based (Caelex dashboard auth)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sentinel_read",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const orgId = membership.organizationId;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [agents, recentPackets, unverifiedCount, invalidSignatures] =
      await Promise.all([
        prisma.sentinelAgent.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            sentinelId: true,
            name: true,
            status: true,
            lastSeen: true,
            lastPacketAt: true,
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            processedAt: { gte: twentyFourHoursAgo },
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            crossVerified: false,
            dataPoint: "orbital_parameters",
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            signatureValid: false,
          },
        }),
      ]);

    const activeAgents = agents.filter((a) => a.status === "ACTIVE");
    const silentAgents = activeAgents.filter(
      (a) => !a.lastPacketAt || a.lastPacketAt < twentyFourHoursAgo,
    );

    const status =
      invalidSignatures > 0
        ? "DEGRADED"
        : silentAgents.length > 0
          ? "WARNING"
          : activeAgents.length > 0
            ? "HEALTHY"
            : "INACTIVE";

    return NextResponse.json({
      data: {
        status,
        agents: {
          total: agents.length,
          active: activeAgents.length,
          silent: silentAgents.length,
          silent_ids: silentAgents.map((a) => a.sentinelId),
        },
        packets_24h: recentPackets,
        pending_verification: unverifiedCount,
        invalid_signatures: invalidSignatures,
        checked_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/v1/sentinel/health/route.ts
git commit -m "feat(sentinel): add aggregate health endpoint (SVA-53)"
```

---

## Task P3-8: decryptPrivateKey Split Validation (SVA-49)

**Problem:** `decryptPrivateKey()` in `issuer-keys.ts:79` splits on `:` without verifying the result has exactly 3 parts. A malformed `encryptedHex` string could cause silent undefined access.

**Files:**

- Modify: `src/lib/verity/keys/issuer-keys.ts:79`

**Step 1: Add split validation**

In `src/lib/verity/keys/issuer-keys.ts`, in `decryptPrivateKey()`, replace the split line:

```typescript
const parts = encryptedHex.split(":");
if (parts.length !== 3) {
  throw new Error(
    "Invalid encrypted key format (expected iv:authTag:ciphertext)",
  );
}
const [ivHex, authTagHex, ciphertextHex] = parts;
```

Replace the old line:

```typescript
const [ivHex, authTagHex, ciphertextHex] = encryptedHex.split(":");
```

**Step 2: Commit**

```bash
git add src/lib/verity/keys/issuer-keys.ts
git commit -m "fix(verity): validate encrypted key format before decryption (SVA-49)"
```

---

## Task P3-9: Date Parameter Validation on Packets Route (SVA-47)

**Problem:** `since`/`until` query parameters in `src/app/api/v1/sentinel/packets/route.ts` are not validated. Malformed dates pass through to Prisma, causing opaque DB errors.

**Files:**

- Modify: `src/app/api/v1/sentinel/packets/route.ts`

**Step 1: Add date validation**

Find the `since`/`until` parsing section and add validation. After extracting the query params, add:

```typescript
const sinceParam = url.searchParams.get("since");
const untilParam = url.searchParams.get("until");

const since = sinceParam ? new Date(sinceParam) : undefined;
const until = untilParam ? new Date(untilParam) : undefined;

if (sinceParam && isNaN(since!.getTime())) {
  return NextResponse.json(
    { error: "Invalid 'since' date format" },
    { status: 400 },
  );
}
if (untilParam && isNaN(until!.getTime())) {
  return NextResponse.json(
    { error: "Invalid 'until' date format" },
    { status: 400 },
  );
}
```

**Step 2: Commit**

```bash
git add src/app/api/v1/sentinel/packets/route.ts
git commit -m "fix(sentinel): validate date params on packets endpoint (SVA-47)"
```

---

## Task P3-10: Protect dataPoint from Prototype Pollution (SVA-46)

**Problem:** `dataPoint` from user input is used as an object key in `sentinel-adapter.ts:88`, which could be exploited for prototype pollution (`__proto__`, `constructor`, `prototype`).

**Files:**

- Modify: The file that uses `dataPoint` as object key (find via grep for the pattern)

**Step 1: Add key sanitization**

Wherever `dataPoint` is used as an object key, add a guard:

```typescript
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function safeKey(key: string): string {
  if (FORBIDDEN_KEYS.has(key)) {
    throw new Error(`Forbidden key: ${key}`);
  }
  return key;
}
```

Use `safeKey(dataPoint)` instead of raw `dataPoint` when indexing into objects.

**Step 2: Commit**

```bash
git commit -m "fix(sentinel): guard dataPoint against prototype pollution (SVA-46)"
```

---

## Execution Order

Execute tasks in this order (dependencies noted):

1. **P3-1** (incremental chain verification) — schema change, run `db push`
2. **P3-4** (organizationId FK) — schema change, run `db push` together with P3-1
3. **P3-2** (parallel cross-verify) — independent
4. **P3-8** (decryptPrivateKey split) — independent, quick fix
5. **P3-9** (date param validation) — independent, quick fix
6. **P3-10** (prototype pollution) — independent, quick fix
7. **P3-5** (GDPR erasure) — depends on P3-1 schema fields
8. **P3-3 + P3-6** (dashboard error states) — combine into single commit
9. **P3-7** (health endpoint) — independent
10. **Build, commit, push, deploy**
