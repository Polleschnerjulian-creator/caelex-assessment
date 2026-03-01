# Caelex Assure — Regulatory API Infrastructure Layer

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line. The base Assure layer, Regulatory Credit Rating (RCR), State of Space Compliance (SSC), Insurance Risk Pricing Engine (IRPE), Regulatory Escrow, and Stress Testing Engine already exist.

**Existing API v1:** Caelex already has an API v1 infrastructure (`src/app/api/v1/`, `ApiKey` model, `src/lib/api-auth.ts`) with key-based authentication, rate limiting, webhook delivery, and usage tracking. The Assure API builds on top of this foundation.

---

### What to Build

Build the **Assure API Infrastructure Layer** — a machine-readable API that exposes Caelex Assure intelligence to external systems. This turns Caelex from a dashboard-only product into **programmable compliance infrastructure**. Investment platforms can embed RCR grades in their portfolios. Insurance underwriting systems can pull risk profiles automatically. VC due diligence platforms can integrate compliance data into their workflows.

**Strategic Intent:** APIs create platform lock-in and network effects. Once a VC firm integrates the Caelex Assure API into their deal flow, switching costs are enormous. Once an insurer's underwriting engine pulls from Caelex, we become embedded in their pricing pipeline. The API makes Caelex the "compliance data layer" for the space industry's financial infrastructure — invisible but indispensable.

**Important:** The API v1 infrastructure already exists with API key management, rate limiting (`src/lib/ratelimit.ts`), webhook delivery (`Webhook`, `WebhookDelivery` models), and usage tracking (`ApiRequest` model). Build the Assure API as a v2 extension within the existing API framework. Do NOT rebuild auth, rate limiting, or webhook infrastructure — extend what exists.

---

### Core: API v2 Design

The Assure API is a RESTful API at `/api/v2/assure/` that provides read-only access to Assure intelligence. It follows OpenAPI 3.1 specification and is designed for machine-to-machine integration.

#### Authentication

Extend the existing API key system:

1. **API Key Scopes**: Add new scopes for Assure data access. Each key can have granular permissions:

```typescript
type AssureAPIScope =
  | "assure:rrs:read" // Read RRS scores
  | "assure:rcr:read" // Read RCR grades and reports
  | "assure:insurance:read" // Read insurance risk profiles
  | "assure:stress:read" // Read stress test results
  | "assure:intelligence:read" // Read SSC aggregate data
  | "assure:escrow:read" // Read escrow transaction data (buyer-side)
  | "assure:escrow:write" // Create/manage escrow transactions
  | "assure:webhook:manage" // Manage webhook subscriptions
  | "assure:bulk:read"; // Bulk data export
```

2. **Organization-Scoped Keys**: Keys are always scoped to a single organization. Cross-org access is not possible via API keys.

3. **Partner Keys**: New key type for integration partners (insurers, VCs) that grants read access to data shared WITH them (via share links or escrow). Partner keys can only access data explicitly shared with the partner's organization.

#### Rate Limiting

Add new rate limit tiers in `src/lib/ratelimit.ts`:

```typescript
// New tiers for Assure API
'assure-standard': {
  tokens: 100,
  window: '1m',         // 100 requests/minute
  description: 'Assure API standard tier'
},
'assure-premium': {
  tokens: 500,
  window: '1m',         // 500 requests/minute
  description: 'Assure API premium tier'
},
'assure-partner': {
  tokens: 1000,
  window: '1m',         // 1000 requests/minute
  description: 'Assure API partner integrations'
},
'assure-webhook': {
  tokens: 50,
  window: '1m',
  description: 'Assure webhook delivery'
}
```

---

### Feature 1: API Endpoints

All endpoints are under `/api/v2/assure/`. All require API key authentication. All return JSON.

#### RRS Endpoints

```
GET /api/v2/assure/rrs
  → Current RRS score for the organization
  → Scope: assure:rrs:read
  → Response: { score, components[], computedAt, validUntil }

GET /api/v2/assure/rrs/history
  → Historical RRS scores
  → Scope: assure:rrs:read
  → Query: ?from=2026-01-01&to=2026-03-01&interval=daily|weekly|monthly
  → Response: { dataPoints[], trend }

GET /api/v2/assure/rrs/components
  → Detailed component breakdown
  → Scope: assure:rrs:read
  → Response: { components[{ name, weight, score, dataCompleteness, keyFindings[] }] }
```

#### RCR Endpoints

```
GET /api/v2/assure/rcr
  → Current regulatory credit rating
  → Scope: assure:rcr:read
  → Response: { grade, outlook, onWatch, numericScore, confidence, validUntil, methodologyVersion }

GET /api/v2/assure/rcr/history
  → Rating action history
  → Scope: assure:rcr:read
  → Query: ?from=2026-01-01&limit=50
  → Response: { actions[{ grade, previousGrade, actionType, rationale, date }] }

GET /api/v2/assure/rcr/report/latest
  → Latest published rating report
  → Scope: assure:rcr:read
  → Response: { report (structured JSON), pdfUrl (if generated) }

GET /api/v2/assure/rcr/benchmark
  → Peer benchmark data
  → Scope: assure:rcr:read
  → Response: { operatorType, cohortSize, percentileRank, distribution }
```

#### Insurance Risk Endpoints

```
GET /api/v2/assure/insurance/risk-profile
  → Current insurance risk profile
  → Scope: assure:insurance:read
  → Response: { riskTier, overallMultiplier, factors[], premiumImpact, validUntil }

GET /api/v2/assure/insurance/risk-profile/history
  → Historical risk profiles
  → Scope: assure:insurance:read
  → Response: { profiles[] }

GET /api/v2/assure/insurance/simulate
  → Simulate premium impact for hypothetical improvements
  → Scope: assure:insurance:read
  → Method: POST
  → Body: { improvements: [{ factorId, targetScore }] }
  → Response: { currentMultiplier, projectedMultiplier, estimatedSavings }
```

#### Stress Testing Endpoints

```
GET /api/v2/assure/stress/results
  → List stress test results
  → Scope: assure:stress:read
  → Response: { results[] }

GET /api/v2/assure/stress/results/:id
  → Specific stress test result
  → Scope: assure:stress:read
  → Response: { result with full component impacts, resilience assessment }

GET /api/v2/assure/stress/resilience
  → Current resilience score (latest test across all scenarios)
  → Scope: assure:stress:read
  → Response: { overallResilience, worstCaseScenario, vulnerabilities[] }
```

#### Intelligence Endpoints (SSC Data)

```
GET /api/v2/assure/intelligence/industry
  → Industry-wide aggregate compliance data
  → Scope: assure:intelligence:read
  → Response: { rrsDistribution, moduleCompliance[], trends[] }

GET /api/v2/assure/intelligence/benchmark
  → Organization's position vs. industry
  → Scope: assure:intelligence:read
  → Response: { myScore, industryMedian, percentileRank, moduleComparison[] }

GET /api/v2/assure/intelligence/insights
  → Recent industry insights
  → Scope: assure:intelligence:read
  → Query: ?type=TREND|ANOMALY|MILESTONE&severity=SIGNIFICANT
  → Response: { insights[] }
```

#### Escrow Endpoints (Partner Access)

```
GET /api/v2/assure/escrow/transactions
  → List escrow transactions where the API key holder is a participant
  → Scope: assure:escrow:read
  → Response: { transactions[] }

GET /api/v2/assure/escrow/transactions/:id/snapshot
  → Latest compliance snapshot for an escrow transaction
  → Scope: assure:escrow:read
  → Response: { snapshot with RRS, RCR, components, gaps }

GET /api/v2/assure/escrow/transactions/:id/transfer-analysis
  → Authorization transfer analysis
  → Scope: assure:escrow:read
  → Response: { jurisdictionAnalyses[], risks[], recommendations[] }
```

#### Composite Endpoint

```
GET /api/v2/assure/profile
  → Complete Assure profile in a single call (combines RRS, RCR, insurance, resilience)
  → Scope: assure:rrs:read + assure:rcr:read + assure:insurance:read + assure:stress:read
  → Response: { rrs, rcr, insuranceRisk, resilience, lastUpdated, validUntil }
  → Useful for dashboard widgets and quick integrations
```

---

### Feature 2: Webhook System

Extend the existing webhook infrastructure to support Assure events. Partners can subscribe to real-time notifications.

#### Webhook Events

```typescript
type AssureWebhookEvent =
  // RRS Events
  | "assure.rrs.updated" // RRS score recomputed
  | "assure.rrs.threshold_crossed" // Score crossed a configured threshold

  // RCR Events
  | "assure.rcr.upgraded" // Rating improved
  | "assure.rcr.downgraded" // Rating worsened
  | "assure.rcr.watch_placed" // Placed on rating watch
  | "assure.rcr.watch_removed" // Removed from watch
  | "assure.rcr.published" // New rating published

  // Insurance Events
  | "assure.insurance.tier_changed" // Risk tier changed
  | "assure.insurance.profile_updated" // Risk profile recomputed

  // Escrow Events
  | "assure.escrow.snapshot_created" // New compliance snapshot
  | "assure.escrow.phase_changed" // Transaction phase changed
  | "assure.escrow.request_completed" // DD request fulfilled

  // Stress Testing Events
  | "assure.stress.completed" // Stress test completed
  | "assure.stress.resilience_changed" // Resilience rating changed

  // Intelligence Events
  | "assure.intelligence.insight_published" // New industry insight
  | "assure.intelligence.report_published"; // New SSC report
```

#### Webhook Payload Format

```typescript
interface AssureWebhookPayload {
  id: string; // Unique delivery ID
  event: AssureWebhookEvent;
  timestamp: string; // ISO 8601
  organizationId: string;
  data: Record<string, unknown>; // Event-specific payload
  metadata: {
    apiVersion: "v2";
    webhookVersion: "1.0";
  };
}
```

#### API Routes for Webhook Management

```
POST /api/v2/assure/webhooks
  → Create webhook subscription
  → Body: { url, events[], secret }
  → Scope: assure:webhook:manage

GET /api/v2/assure/webhooks
  → List webhook subscriptions
  → Scope: assure:webhook:manage

PATCH /api/v2/assure/webhooks/:id
  → Update webhook (change events, URL, enable/disable)
  → Scope: assure:webhook:manage

DELETE /api/v2/assure/webhooks/:id
  → Delete webhook subscription
  → Scope: assure:webhook:manage

GET /api/v2/assure/webhooks/:id/deliveries
  → View delivery history and status
  → Scope: assure:webhook:manage

POST /api/v2/assure/webhooks/:id/test
  → Send test event
  → Scope: assure:webhook:manage
```

Webhook delivery: Use the existing `WebhookDelivery` model and delivery logic. Sign payloads with HMAC-SHA256 using the webhook's secret. Retry failed deliveries: 3 attempts with exponential backoff (1min, 5min, 30min).

---

### Feature 3: SDK & Developer Portal

#### OpenAPI Specification

Generate an OpenAPI 3.1 spec for the Assure API at `/api/v2/assure/openapi.json`. Use the existing OpenAPI infrastructure (`src/lib/openapi.ts`) and extend it.

The spec must include:

- All endpoints with full request/response schemas
- Authentication (API key in header: `X-API-Key`)
- Error responses (400, 401, 403, 404, 429, 500)
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Pagination parameters (`cursor`, `limit`)
- Filtering parameters per endpoint

#### Developer Documentation Page

- `/docs/api/v2/assure` — Interactive API documentation (Swagger UI or similar)
  - Endpoint reference with try-it-out
  - Authentication guide
  - Rate limiting explanation
  - Webhook setup guide
  - Code examples in cURL, Python, TypeScript, Go
  - Changelog

#### SDK Stubs

Generate TypeScript SDK types at `src/lib/assure-api-types.ts` that can be published as an npm package:

```typescript
// Types for external consumers
export interface CaelexAssureClient {
  rrs: {
    getCurrent(): Promise<RRSResponse>;
    getHistory(params: HistoryParams): Promise<RRSHistoryResponse>;
    getComponents(): Promise<RRSComponentsResponse>;
  };
  rcr: {
    getCurrent(): Promise<RCRResponse>;
    getHistory(params: HistoryParams): Promise<RCRHistoryResponse>;
    getBenchmark(): Promise<BenchmarkResponse>;
  };
  insurance: {
    getRiskProfile(): Promise<InsuranceRiskResponse>;
    simulate(improvements: Improvement[]): Promise<SimulationResponse>;
  };
  stress: {
    getResults(): Promise<StressResultsResponse>;
    getResilience(): Promise<ResilienceResponse>;
  };
  intelligence: {
    getIndustry(): Promise<IndustryResponse>;
    getBenchmark(): Promise<MyBenchmarkResponse>;
    getInsights(params: InsightParams): Promise<InsightsResponse>;
  };
  profile: {
    getComplete(): Promise<AssureProfileResponse>;
  };
}
```

---

### Feature 4: Prisma Schema Additions

```prisma
// Extend existing ApiKey model with Assure scopes
// Add to ApiKey model:
// assureScopes  String[]  @default([])

model AssureAPIUsage {
  id              String   @id @default(cuid())
  apiKeyId        String
  organizationId  String
  endpoint        String   // "/api/v2/assure/rrs"
  method          String   // "GET"
  statusCode      Int
  responseTimeMs  Int
  requestSize     Int?     // Bytes
  responseSize    Int?     // Bytes
  ipAddress       String?  // Encrypted
  userAgent       String?

  createdAt       DateTime @default(now())

  @@index([apiKeyId, createdAt])
  @@index([organizationId, createdAt])
  @@index([endpoint, createdAt])
}

model AssureWebhookSubscription {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  apiKeyId        String
  apiKey          ApiKey   @relation(fields: [apiKeyId], references: [id])

  url             String
  secret          String   // Encrypted, for HMAC signing
  events          String[] // AssureWebhookEvent[]
  isActive        Boolean  @default(true)

  // Delivery stats
  totalDeliveries Int      @default(0)
  failedDeliveries Int     @default(0)
  lastDeliveryAt  DateTime?
  lastFailureAt   DateTime?

  deliveries      AssureWebhookDelivery[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId])
  @@index([isActive])
}

model AssureWebhookDelivery {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    AssureWebhookSubscription @relation(fields: [subscriptionId], references: [id])

  event           String
  payload         Json
  statusCode      Int?
  responseBody    String?  @db.Text
  responseTimeMs  Int?
  attempt         Int      @default(1)
  maxAttempts     Int      @default(3)
  nextRetryAt     DateTime?
  deliveredAt     DateTime?
  failedAt        DateTime?
  error           String?

  createdAt       DateTime @default(now())

  @@index([subscriptionId, createdAt])
  @@index([nextRetryAt])
}

model AssurePartnerKey {
  id              String   @id @default(cuid())
  partnerOrgId    String?  // Partner's Caelex org (if they have one)
  partnerName     String   // "Munich Re Space", "EQT Partners"
  partnerType     PartnerType

  apiKeyId        String   @unique
  apiKey          ApiKey   @relation(fields: [apiKeyId], references: [id])

  // What data this partner can access
  accessGrants    AssurePartnerAccess[]

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([partnerType])
}

enum PartnerType {
  INSURER
  REINSURER
  INVESTOR_VC
  INVESTOR_PE
  INVESTMENT_BANK
  LAW_FIRM
  REGULATOR
  AUDITOR
}

model AssurePartnerAccess {
  id              String   @id @default(cuid())
  partnerKeyId    String
  partnerKey      AssurePartnerKey @relation(fields: [partnerKeyId], references: [id])
  organizationId  String   // Which org's data the partner can access
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Scope of access (what the org has shared with this partner)
  scopes          String[] // AssureAPIScope[]
  grantedAt       DateTime @default(now())
  expiresAt       DateTime?
  isRevoked       Boolean  @default(false)

  @@unique([partnerKeyId, organizationId])
  @@index([organizationId])
}
```

---

### Feature 5: API Analytics Dashboard

#### Pages

- `/dashboard/assure/api` — API overview (keys, usage, webhooks)
- `/dashboard/assure/api/keys` — API key management with scope configuration
- `/dashboard/assure/api/usage` — Usage analytics (requests, response times, errors)
- `/dashboard/assure/api/webhooks` — Webhook subscription management
- `/dashboard/assure/api/partners` — Partner access management

#### UI Components

- `APIKeyManager` — Table of API keys with scopes, usage stats, create/revoke actions
- `AssureAPIUsageChart` — Time series chart of API requests (by endpoint, by status code)
- `APIResponseTimeChart` — Response time distribution and trend
- `WebhookSubscriptionManager` — List of subscriptions with event configuration, delivery stats
- `WebhookDeliveryLog` — Table of recent deliveries with status, response code, retry info
- `PartnerAccessManager` — Manage which partners have access to which data, revoke access
- `APIQuotaGauge` — Visual gauge showing current rate limit usage vs. allowance

---

### Feature 6: Response Formatting

All API responses follow a consistent format:

```typescript
// Success response
interface AssureAPIResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    apiVersion: "v2";
    organization: {
      id: string;
      name: string;
    };
  };
  pagination?: {
    cursor: string | null;
    hasMore: boolean;
    totalCount: number;
  };
}

// Error response
interface AssureAPIError {
  success: false;
  error: {
    code: string; // "RATE_LIMIT_EXCEEDED", "INVALID_SCOPE", etc.
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
    apiVersion: "v2";
  };
}
```

#### Response Headers

All responses include:

```
X-Request-Id: <uuid>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706140800
X-API-Version: v2
Cache-Control: private, max-age=300  (5 min cache for read endpoints)
```

---

### Implementation Guidelines

1. **Extend, don't rebuild:** Use existing `src/lib/api-auth.ts` for authentication. Extend `ApiKey` model with Assure scopes. Use existing rate limiting infrastructure.
2. **Middleware pattern:** Create a shared Assure API middleware at `src/lib/assure-api-middleware.ts` that handles: auth validation, scope checking, rate limiting, request logging, response formatting. All v2 endpoints go through this middleware.
3. **Pagination:** Use cursor-based pagination (not offset). Return opaque cursor tokens. Default limit: 25, max: 100.
4. **Caching:** Use `Cache-Control` headers. Read endpoints: `private, max-age=300` (5 min). Real-time endpoints (webhooks, current scores): `no-cache`.
5. **Versioning:** API version in URL path (`/v2/`). Include version in response metadata. Plan for v3 without breaking v2.
6. **Error codes:** Define standardized error codes: `AUTHENTICATION_REQUIRED`, `INSUFFICIENT_SCOPE`, `RATE_LIMIT_EXCEEDED`, `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
7. **Audit trail:** Log every API request to `AssureAPIUsage`. Log webhook deliveries to `AssureWebhookDelivery`.
8. **Security:** All API keys are hashed (SHA-256) before storage. Display prefix only (`caelex_sk_...`). Webhook secrets encrypted with existing encryption utilities. HMAC-SHA256 signature on every webhook delivery.
9. **OpenAPI:** Generate spec programmatically from Zod schemas. Keep spec in sync with implementation.
10. **Testing:** Unit tests for middleware (auth, scope checking, rate limiting). Integration tests for each endpoint. Webhook delivery tests with mock receiver.

---

### What NOT to Build

- Do NOT build a client-side SDK package (npm) — just provide TypeScript types
- Do NOT build GraphQL — REST is sufficient for this use case
- Do NOT build real-time streaming (WebSocket/SSE) — webhooks handle event notification
- Do NOT build a sandbox/test environment — use API key scoping for test vs. prod
- Do NOT build OAuth2 for third-party apps — API keys with scopes are sufficient for now

---

### File Structure

```
src/
  app/
    docs/
      api/
        v2/
          assure/page.tsx               # API documentation
    dashboard/
      assure/
        api/
          page.tsx                       # API overview
          keys/page.tsx                  # Key management
          usage/page.tsx                 # Usage analytics
          webhooks/page.tsx              # Webhook management
          partners/page.tsx              # Partner access
    api/
      v2/
        assure/
          openapi.json/route.ts          # OpenAPI spec
          rrs/route.ts                   # GET current
          rrs/history/route.ts           # GET history
          rrs/components/route.ts        # GET components
          rcr/route.ts                   # GET current
          rcr/history/route.ts           # GET history
          rcr/report/latest/route.ts     # GET latest report
          rcr/benchmark/route.ts         # GET benchmark
          insurance/
            risk-profile/route.ts        # GET, GET /history
            simulate/route.ts            # POST simulate
          stress/
            results/route.ts             # GET list
            results/[id]/route.ts        # GET specific
            resilience/route.ts          # GET resilience
          intelligence/
            industry/route.ts            # GET industry data
            benchmark/route.ts           # GET org benchmark
            insights/route.ts            # GET insights
          escrow/
            transactions/route.ts        # GET list
            transactions/[id]/
              snapshot/route.ts          # GET snapshot
              transfer-analysis/route.ts # GET analysis
          profile/route.ts               # GET composite
          webhooks/
            route.ts                     # POST, GET
            [id]/route.ts               # PATCH, DELETE
            [id]/deliveries/route.ts    # GET
            [id]/test/route.ts          # POST

  lib/
    assure-api-middleware.ts             # Shared middleware
    assure-api-types.ts                  # SDK types (publishable)
    services/
      assure-webhook-service.ts          # Webhook delivery logic

  components/
    assure/
      APIKeyManager.tsx
      AssureAPIUsageChart.tsx
      APIResponseTimeChart.tsx
      WebhookSubscriptionManager.tsx
      WebhookDeliveryLog.tsx
      PartnerAccessManager.tsx
      APIQuotaGauge.tsx
```

### Priority Order

1. Prisma schema additions (AssureAPIUsage, webhook models, partner models) + `db:push`
2. Assure API middleware (auth, scopes, rate limiting, response formatting)
3. Core endpoints (RRS, RCR, insurance, profile composite)
4. OpenAPI spec generation
5. Webhook system (subscriptions, delivery, retry)
6. Dashboard pages (API overview, key management, usage)
7. Intelligence + Escrow endpoints
8. Partner key system + access grants
9. Developer documentation page
10. Tests
