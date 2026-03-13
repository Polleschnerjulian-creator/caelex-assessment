# Sentinel Security Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 8 CRITICAL and the most impactful HIGH severity findings from SVA-2026-0308 (Phase 1 Security Hardening)

**Architecture:** Harden the existing Sentinel ingest pipeline by adding input validation (Zod), cryptographic rejection gates, transactional writes, rate limiting, registration authentication, and cross-verification vocabulary alignment. No new tables or models — only service-layer and route-layer changes.

**Tech Stack:** Next.js 15 App Router, Prisma, Zod, Upstash Ratelimit, Ed25519 (node:crypto)

---

## Task 1: Add Zod Schema to Ingest Endpoint (SVA-03)

**Files:**

- Modify: `src/app/api/v1/sentinel/ingest/route.ts`
- Modify: `src/lib/services/sentinel-service.server.ts` (export the type)

**Step 1: Add Zod schema and validate request body in the ingest route**

In `src/app/api/v1/sentinel/ingest/route.ts`, add Zod validation after parsing the JSON body. The schema must match the `EvidencePacketInput` interface exactly.

```typescript
// Add at top of file:
import { z } from "zod";

// Add schema after imports:
const PacketSchema = z.object({
  packet_id: z.string().min(1),
  version: z.string().min(1),
  sentinel_id: z.string().min(1),
  operator_id: z.string().min(1),
  satellite_norad_id: z
    .string()
    .regex(/^\d{1,8}$/)
    .nullable(),
  data: z.object({
    data_point: z.string().min(1),
    values: z.record(z.unknown()),
    source_system: z.string().min(1),
    collection_method: z.string().min(1),
    collection_timestamp: z.string().datetime(),
    compliance_notes: z.array(z.string()),
  }),
  regulation_mapping: z.array(
    z.object({
      ref: z.string(),
      status: z.string(),
      note: z.string(),
    }),
  ),
  integrity: z.object({
    content_hash: z.string().startsWith("sha256:"),
    previous_hash: z.string().min(1),
    chain_position: z.number().int().nonneg(),
    signature: z.string().min(1),
    agent_public_key: z.string(),
    timestamp_source: z.string(),
  }),
  metadata: z.object({
    sentinel_version: z.string().min(1),
    collector: z.string().min(1),
    config_hash: z.string().min(1),
    uptime_seconds: z.number().nonneg(),
    packets_sent_total: z.number().int().nonneg(),
  }),
});
```

Replace `const packet = await request.json();` (line 32) with:

```typescript
const rawBody = await request.json();
const parsed = PacketSchema.safeParse(rawBody);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
    { status: 400 },
  );
}
const packet = parsed.data;
```

Also add a timestamp window check after validation:

```typescript
// Reject packets with timestamps more than 1 hour from server time
const packetTime = new Date(packet.data.collection_timestamp).getTime();
const now = Date.now();
if (Math.abs(packetTime - now) > 3600000) {
  return NextResponse.json(
    { error: "collection_timestamp must be within ±1 hour of server time" },
    { status: 400 },
  );
}
```

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds with no type errors.

**Step 3: Commit**

```bash
git add src/app/api/v1/sentinel/ingest/route.ts
git commit -m "fix(sentinel): add Zod schema validation to ingest endpoint (SVA-03)"
```

---

## Task 2: Reject Packets with Invalid Signatures/Hashes (SVA-02)

**Files:**

- Modify: `src/lib/services/sentinel-service.server.ts` (lines 112-184, the `ingestPacket` function)

**Step 1: Add rejection gates after signature and hash verification**

In `ingestPacket()`, after the signature and hash checks (lines 124-136), add early returns that reject invalid packets instead of storing them:

Replace the current code from line 124 to line 164 with:

```typescript
// 2. Verify Ed25519 signature
const signatureValid = verifyPacketSignature(
  packet.integrity.content_hash,
  packet.integrity.signature,
  agent.publicKey,
);

if (!signatureValid) {
  return { accepted: false, error: "SIGNATURE_INVALID" };
}

// 3. Verify content hash (re-hash data+regulation_mapping)
const expectedHash = computeContentHash({
  data: packet.data,
  regulation_mapping: packet.regulation_mapping,
});
const hashValid = expectedHash === packet.integrity.content_hash;

if (!hashValid) {
  return { accepted: false, error: "HASH_MISMATCH" };
}

// 4. Verify chain continuity (warn but don't reject — chain breaks may indicate packet loss)
const chainValid =
  agent.chainPosition === 0 ||
  (packet.integrity.previous_hash ===
    (agent.lastChainHash ?? "sha256:genesis") &&
    packet.integrity.chain_position === agent.chainPosition);

// 5. Store packet
await prisma.sentinelPacket.create({
  data: {
    packetId: packet.packet_id,
    agentId,
    satelliteNorad: packet.satellite_norad_id,
    dataPoint: packet.data.data_point,
    values: packet.data.values as object,
    sourceSystem: packet.data.source_system,
    collectionMethod: packet.data.collection_method,
    collectedAt: new Date(packet.data.collection_timestamp),
    complianceNotes: packet.data.compliance_notes,
    regulationMapping: packet.regulation_mapping as object[],
    contentHash: packet.integrity.content_hash,
    previousHash: packet.integrity.previous_hash,
    chainPosition: packet.integrity.chain_position,
    signature: packet.integrity.signature,
    signatureValid: true,
    chainValid,
  },
});
```

Note: `signatureValid` is now always `true` when we reach the store step (invalid packets are rejected before). `chainValid` stores the actual chain check result (chain breaks are logged but accepted, per design — they may indicate lost packets, not tampering).

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/services/sentinel-service.server.ts
git commit -m "fix(sentinel): reject packets with invalid signatures or hash mismatches (SVA-02)"
```

---

## Task 3: Wrap Ingest in Database Transaction (SVA-08)

**Files:**

- Modify: `src/lib/services/sentinel-service.server.ts` (lines 145-178)

**Step 1: Replace the two sequential writes with a `$transaction`**

Replace the separate `prisma.sentinelPacket.create` and `prisma.sentinelAgent.update` calls with a transactional batch:

```typescript
// 5. Store packet + update agent atomically
await prisma.$transaction([
  prisma.sentinelPacket.create({
    data: {
      packetId: packet.packet_id,
      agentId,
      satelliteNorad: packet.satellite_norad_id,
      dataPoint: packet.data.data_point,
      values: packet.data.values as object,
      sourceSystem: packet.data.source_system,
      collectionMethod: packet.data.collection_method,
      collectedAt: new Date(packet.data.collection_timestamp),
      complianceNotes: packet.data.compliance_notes,
      regulationMapping: packet.regulation_mapping as object[],
      contentHash: packet.integrity.content_hash,
      previousHash: packet.integrity.previous_hash,
      chainPosition: packet.integrity.chain_position,
      signature: packet.integrity.signature,
      signatureValid: true,
      chainValid,
    },
  }),
  prisma.sentinelAgent.update({
    where: { id: agentId },
    data: {
      lastSeen: new Date(),
      lastPacketAt: new Date(),
      chainPosition: packet.integrity.chain_position + 1,
      lastChainHash: packet.integrity.content_hash,
      version: packet.metadata.sentinel_version,
      configHash: packet.metadata.config_hash,
    },
  }),
]);
```

Also add a duplicate packet ID handler. Wrap the transaction in a try/catch:

```typescript
  try {
    await prisma.$transaction([...]);
  } catch (err: unknown) {
    // Handle duplicate packet_id (idempotent retry)
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return { accepted: true, chain_position: packet.integrity.chain_position };
    }
    throw err;
  }
```

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/services/sentinel-service.server.ts
git commit -m "fix(sentinel): wrap ingest in $transaction, handle duplicate packets (SVA-08, SVA-14)"
```

---

## Task 4: Add Rate Limiting to All Sentinel & Verity Endpoints (SVA-04)

**Files:**

- Modify: `src/lib/ratelimit.ts` (add sentinel tiers)
- Modify: `src/app/api/v1/sentinel/register/route.ts`
- Modify: `src/app/api/v1/sentinel/ingest/route.ts`
- Modify: `src/app/api/v1/sentinel/cross-verify/route.ts`
- Modify: `src/app/api/v1/sentinel/chain/verify/route.ts`
- Modify: `src/app/api/v1/sentinel/agents/route.ts`
- Modify: `src/app/api/v1/sentinel/packets/route.ts`
- Modify: `src/app/api/v1/sentinel/status/route.ts`
- Modify: `src/app/api/v1/verity/attestation/verify/route.ts`

**Step 1: Add Sentinel rate limit tiers to `ratelimit.ts`**

In the Redis `rateLimiters` object (after the `academy` entry, ~line 210), add:

```typescript
      // Sentinel agent registration: 5 per hour per IP
      sentinel_register: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:sentinel_register",
      }),

      // Sentinel ingest: 10 per minute per token (burst-friendly for agents)
      sentinel_ingest: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:sentinel_ingest",
      }),

      // Sentinel dashboard reads: 60 per minute per user
      sentinel_read: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "ratelimit:sentinel_read",
      }),

      // Sentinel expensive ops (cross-verify, chain verify): 10 per hour
      sentinel_expensive: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "ratelimit:sentinel_expensive",
      }),

      // Verity public verify: 30 per hour per IP
      verity_public: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: true,
        prefix: "ratelimit:verity_public",
      }),
```

Add matching fallback limiters in `fallbackLimiters` (~line 303):

```typescript
  sentinel_register: new InMemoryRateLimiter(2, 3600000),
  sentinel_ingest: new InMemoryRateLimiter(5, 60000),
  sentinel_read: new InMemoryRateLimiter(30, 60000),
  sentinel_expensive: new InMemoryRateLimiter(3, 3600000),
  verity_public: new InMemoryRateLimiter(10, 3600000),
```

Add to the `RateLimitType` union type (~line 307):

```typescript
  | "sentinel_register"
  | "sentinel_ingest"
  | "sentinel_read"
  | "sentinel_expensive"
  | "verity_public";
```

**Step 2: Apply rate limiting to each Sentinel route**

For each route file, add these imports at the top:

```typescript
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
```

Then add the rate check as the first operation inside the handler.

**`register/route.ts`** — after the `try {` on line 15, before line 16:

```typescript
const rl = await checkRateLimit("sentinel_register", getIdentifier(request));
if (!rl.success) return createRateLimitResponse(rl);
```

**`ingest/route.ts`** — after extracting the token (line 11), before auth check:

```typescript
const rl = await checkRateLimit("sentinel_ingest", `token:${token}`);
if (!rl.success) return createRateLimitResponse(rl);
```

**`status/route.ts`** — after extracting the token, before auth:

```typescript
const rl = await checkRateLimit("sentinel_read", getIdentifier(request));
if (!rl.success) return createRateLimitResponse(rl);
```

**`agents/route.ts`** — after session check succeeds:

```typescript
const rl = await checkRateLimit(
  "sentinel_read",
  getIdentifier(request, session.user.id),
);
if (!rl.success) return createRateLimitResponse(rl);
```

**`packets/route.ts`** — after session check succeeds:

```typescript
const rl = await checkRateLimit(
  "sentinel_read",
  getIdentifier(request, session.user.id),
);
if (!rl.success) return createRateLimitResponse(rl);
```

**`cross-verify/route.ts`** — after session check succeeds:

```typescript
const rl = await checkRateLimit(
  "sentinel_expensive",
  getIdentifier(request, session.user.id),
);
if (!rl.success) return createRateLimitResponse(rl);
```

**`chain/verify/route.ts`** — after session check succeeds:

```typescript
const rl = await checkRateLimit(
  "sentinel_expensive",
  getIdentifier(request, session.user.id),
);
if (!rl.success) return createRateLimitResponse(rl);
```

**`verity/attestation/verify/route.ts`** — after the `try {`:

```typescript
const rl = await checkRateLimit("verity_public", getIdentifier(request));
if (!rl.success) return createRateLimitResponse(rl);
```

**Step 3: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/ratelimit.ts src/app/api/v1/sentinel/ src/app/api/v1/verity/attestation/verify/route.ts
git commit -m "fix(sentinel): add rate limiting to all Sentinel and Verity public endpoints (SVA-04)"
```

---

## Task 5: Secure Agent Registration (SVA-01, SVA-05)

**Files:**

- Modify: `src/lib/services/sentinel-service.server.ts` (the `registerSentinelAgent` function, lines 46-100)
- Modify: `src/app/api/v1/sentinel/register/route.ts`

**Step 1: Block public key overwrites on existing agents**

In `sentinel-service.server.ts`, replace the existing agent update block (lines 70-81) with authentication-gated logic:

```typescript
if (existing) {
  // Verify caller owns this agent (token must match stored hash)
  if (existing.token !== input.tokenHash) {
    return { error: "Cannot update agent: invalid token", status: 403 };
  }

  // Update metadata only — NEVER overwrite publicKey after initial registration
  const updated = await prisma.sentinelAgent.update({
    where: { sentinelId: input.sentinel_id },
    data: {
      version: input.version,
      enabledCollectors: input.collectors,
      lastSeen: new Date(),
    },
  });
  return { agent: updated, status: 200 };
}
```

**Step 2: New agents start as PENDING (require admin approval)**

In `sentinel-service.server.ts`, change the agent creation (line 92) from `status: "ACTIVE"` to `status: "PENDING"`:

```typescript
const agent = await prisma.sentinelAgent.create({
  data: {
    organizationId: org.id,
    name: `Sentinel ${input.sentinel_id.slice(0, 12)}`,
    sentinelId: input.sentinel_id,
    publicKey: input.public_key,
    token: input.tokenHash,
    status: "PENDING",
    version: input.version,
    enabledCollectors: input.collectors,
    lastSeen: new Date(),
  },
});
```

**Step 3: Validate Ed25519 PEM format at registration**

In `register/route.ts`, add PEM validation after the Zod parse (after line 35):

```typescript
// Validate public key is valid Ed25519 PEM
try {
  const { createPublicKey } = await import("node:crypto");
  const key = createPublicKey(parsed.data.public_key);
  if (key.asymmetricKeyType !== "ed25519") {
    return NextResponse.json(
      { error: "Public key must be Ed25519" },
      { status: 400 },
    );
  }
} catch {
  return NextResponse.json(
    { error: "Invalid public key PEM format" },
    { status: 400 },
  );
}
```

**Step 4: Mask organization existence in error responses**

In `sentinel-service.server.ts`, change the org-not-found error (line 62) to a generic message:

```typescript
if (!org) {
  return { error: "Registration failed", status: 400 };
}
```

**Step 5: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add src/lib/services/sentinel-service.server.ts src/app/api/v1/sentinel/register/route.ts
git commit -m "fix(sentinel): secure registration — block key overwrites, PENDING status, Ed25519 validation (SVA-01, SVA-05)"
```

---

## Task 6: Fix Cross-Verification Result Vocabulary Mismatch (SVA-07)

**Files:**

- Modify: `src/lib/verity/evaluation/evidence-resolver.ts` (line 81)

**Step 1: Align the evidence resolver to use the actual cross-verification result values**

In `evidence-resolver.ts`, line 81, change `"VERIFIED"` to `"MATCH"`:

```typescript
const hasCrossVerification = crossCheck?.result === "MATCH";
```

This aligns the check with the actual values written by `cross-verification.server.ts` line 313 (`"MATCH"`, `"CLOSE"`, `"MISMATCH"`).

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/verity/evaluation/evidence-resolver.ts
git commit -m "fix(verity): align evidence-resolver to use 'MATCH' instead of 'VERIFIED' (SVA-07)"
```

---

## Task 7: Add Integrity Filters to Evidence Resolver (SVA-18)

**Files:**

- Modify: `src/lib/verity/evaluation/evidence-resolver.ts` (lines 56-74)

**Step 1: Add `signatureValid` and `chainValid` filters to the Sentinel packet query**

In `evidence-resolver.ts`, update the `packetWhere` filter (lines 56-62) to include integrity requirements:

```typescript
const packetWhere: Record<string, unknown> = {
  agentId: agent.id,
  dataPoint,
  signatureValid: true,
  chainValid: true,
};
if (satelliteNorad) {
  packetWhere.satelliteNorad = satelliteNorad;
}
```

This ensures that only packets with valid Ed25519 signatures AND valid chain continuity are used as evidence for Verity attestations.

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/verity/evaluation/evidence-resolver.ts
git commit -m "fix(verity): only use integrity-verified packets for attestation evidence (SVA-18)"
```

---

## Task 8: Add RBAC to Privileged Sentinel Operations (SVA-09)

**Files:**

- Modify: `src/app/api/v1/sentinel/cross-verify/route.ts`
- Modify: `src/app/api/v1/sentinel/chain/verify/route.ts`

**Step 1: Add role check to cross-verify endpoint**

In `cross-verify/route.ts`, change the membership query (line 24-27) to include the role:

```typescript
const membership = await prisma.organizationMember.findFirst({
  where: { userId: session.user.id },
  select: { organizationId: true, role: true },
});

if (!membership) {
  return NextResponse.json({ error: "No organization" }, { status: 403 });
}

// Cross-verification is a write operation — require ADMIN or OWNER
if (!["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
  return NextResponse.json(
    { error: "Insufficient permissions" },
    { status: 403 },
  );
}
```

**Step 2: Add role check to chain verify endpoint**

In `chain/verify/route.ts`, change the membership query (line 19-22) similarly:

```typescript
const membership = await prisma.organizationMember.findFirst({
  where: { userId: session.user.id },
  select: { organizationId: true, role: true },
});

if (!membership) {
  return NextResponse.json({ error: "No organization" }, { status: 403 });
}

if (!["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
  return NextResponse.json(
    { error: "Insufficient permissions" },
    { status: 403 },
  );
}
```

**Step 3: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/api/v1/sentinel/cross-verify/route.ts src/app/api/v1/sentinel/chain/verify/route.ts
git commit -m "fix(sentinel): add RBAC role checks to cross-verify and chain-verify (SVA-09)"
```

---

## Task 9: Remove Public Key Fallback from Verify Endpoint (SVA-25)

**Files:**

- Modify: `src/app/api/v1/verity/attestation/verify/route.ts` (line 45)

**Step 1: Remove the fallback to embedded public key**

In `verify/route.ts`, replace line 45:

```typescript
const publicKeyHex = keyInfo?.publicKeyHex ?? attestation.issuer.public_key;
```

With strict key lookup:

```typescript
if (!keyInfo) {
  return NextResponse.json({
    valid: false,
    attestation_id: attestation.attestation_id,
    issuer_known: false,
    errors: ["Issuer key not found in Caelex keyset. Cannot verify."],
    verified_at: new Date().toISOString(),
  });
}
const publicKeyHex = keyInfo.publicKeyHex;
```

Also remove the now-unnecessary `issuer_known` variable on line 44 since we return early when key is not found. Update the `verifyAttestation` call:

```typescript
const result = verifyAttestation(attestation, publicKeyHex, true);
```

**Step 2: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/v1/verity/attestation/verify/route.ts
git commit -m "fix(verity): remove embedded public key fallback in verify endpoint (SVA-25)"
```

---

## Task 10: Build, Test, Push, Deploy

**Step 1: Full build verification**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 2: Run existing tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (some may need updating due to the new rejection behavior in `ingestPacket`).

**Step 3: Commit any test fixes**

If tests need updating (e.g., tests that relied on invalid packets being accepted), fix them and commit:

```bash
git commit -m "test(sentinel): update tests for new signature rejection behavior"
```

**Step 4: Push and deploy**

```bash
git push origin feat/ephemeris-forge
vercel --prod
```

---

## Summary of Findings Addressed

| Task | Finding ID     | Title                                  |
| ---- | -------------- | -------------------------------------- |
| 1    | SVA-03         | Zod schema validation on ingest        |
| 2    | SVA-02         | Reject invalid signatures/hashes       |
| 3    | SVA-08, SVA-14 | Transaction + duplicate handling       |
| 4    | SVA-04, SVA-41 | Rate limiting on all endpoints         |
| 5    | SVA-01, SVA-05 | Registration auth + key protection     |
| 6    | SVA-07         | Cross-verify vocabulary fix            |
| 7    | SVA-18         | Integrity filters in evidence resolver |
| 8    | SVA-09         | RBAC on privileged operations          |
| 9    | SVA-25         | Remove verify key fallback             |
