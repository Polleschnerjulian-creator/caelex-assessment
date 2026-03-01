# PROMPT: Caelex Ecosystem — World-Class Upgrade

## Mission

Transform Caelex from a compliance tool into a **compliance platform with network effects**. Three new features that no competitor has and that make Caelex more valuable with every new user.

**Cost Constraint:** Everything must be implementable with zero external costs. No paid APIs, no paid services. Use only existing stack (Next.js 15, Prisma, PostgreSQL/Neon, existing engines, existing widget system).

---

## Critical Context

### Existing Infrastructure You MUST Build On

| System                 | What Exists                                                                                                          | Where                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Stakeholder Portal** | Token-based access for 7 stakeholder types (Auditor, Supplier, Insurer, NCA, Legal, Consultant, Launch Provider)     | `src/lib/services/stakeholder-engagement.ts` (467 LOC)                                         |
| **Data Rooms**         | Encrypted doc sharing with 4 access levels, watermarks, download/print control                                       | `src/lib/services/data-room.ts` (443 LOC)                                                      |
| **Attestations**       | Cryptographic compliance signatures with chain-of-custody                                                            | `src/app/api/stakeholder/attestations/route.ts`                                                |
| **Supplier Portal**    | Token-based environmental data collection from suppliers                                                             | `src/app/supplier/[token]/page.tsx`, `src/lib/services/supplier-outreach-service.ts` (365 LOC) |
| **Widget System**      | Embeddable badges (ComplianceBadge, QuickCheck, NIS2Classifier), Shadow DOM, CORS, analytics                         | `src/widget/` (6 files), `src/app/dashboard/settings/widget/page.tsx`                          |
| **NCA Portal**         | 14+ NCAs, package assembly, submission pipeline, correspondence tracking                                             | `src/lib/services/nca-portal-service.ts` (853 LOC)                                             |
| **Space Law Engine**   | 10 jurisdictions, favorability scoring, comparison matrices                                                          | `src/lib/space-law-engine.server.ts`                                                           |
| **Compliance Scoring** | Module-level scoring, overall grade A-F, velocity tracking                                                           | `src/lib/services/compliance-scoring-service.ts`                                               |
| **RBAC**               | 5 roles (Owner, Admin, Manager, Member, Viewer), 40+ permissions                                                     | `src/lib/permissions.ts`                                                                       |
| **API v1**             | 14 endpoints, API key auth, webhooks, HMAC signing                                                                   | `src/app/api/v1/`                                                                              |
| **Prisma Schema**      | StakeholderEngagement, DataRoom, ComplianceAttestation, SupplierDataRequest, SupplierPortalToken, WidgetConfig, etc. | `prisma/schema.prisma`                                                                         |

---

## Feature 1: Public Compliance Status Page

### What It Is

Every organization on Caelex gets a public URL: `/status/[org-slug]`

This page shows — **without authentication** — the organization's compliance health, as configured by the org admin. Like statuspage.io but for space regulatory compliance.

### Why It Matters

Today, every stakeholder (investor, partner, customer, NCA) must individually request compliance information. The Status Page makes compliance **publicly verifiable** — the organization decides what's visible.

### Database Changes

Add to `prisma/schema.prisma`:

```prisma
model PublicStatusPage {
  id             String  @id @default(cuid())
  organizationId String  @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // URL & Identity
  slug           String  @unique  // e.g., "acme-space" → /status/acme-space
  isEnabled      Boolean @default(false)
  customDomain   String? // Optional: status.acme-space.com

  // What to show (all default false — opt-in)
  showOverallScore     Boolean @default(false)
  showGrade            Boolean @default(false)
  showModuleStatuses   Boolean @default(false)
  showFrameworks       Boolean @default(false) // EU Space Act, NIS2
  showLicenses         Boolean @default(false)
  showInsurance        Boolean @default(false)
  showAttestations     Boolean @default(false) // Signed attestations
  showLastAuditDate    Boolean @default(false)
  showCertifications   Boolean @default(false)
  showDeadlineHealth   Boolean @default(false)

  // Branding
  logoUrl        String?
  accentColor    String  @default("#10B981") // emerald-500
  description    String? // "ACME Space — EU Space Act compliant satellite operator"

  // Access control
  requirePassword Boolean @default(false)
  passwordHash   String? // Bcrypt hash for optional password protection

  // Analytics
  viewCount      Int     @default(0)
  lastViewedAt   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
  @@index([organizationId])
}
```

Run `npx prisma db push` after adding.

### API Routes

#### `GET /api/public/status/[slug]` — Public (no auth)

```typescript
// src/app/api/public/status/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const config = await prisma.publicStatusPage.findUnique({
    where: { slug: params.slug, isEnabled: true },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Optional password check
  if (config.requirePassword) {
    const authHeader = request.headers.get("x-status-password");
    if (
      !authHeader ||
      !(await verifyPassword(authHeader, config.passwordHash!))
    ) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }
  }

  // Increment view count
  await prisma.publicStatusPage.update({
    where: { id: config.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  // Build response based on visibility settings
  const orgId = config.organization.id;
  const response: Record<string, unknown> = {
    organization: config.organization.name,
    description: config.description,
    logoUrl: config.logoUrl,
    accentColor: config.accentColor,
    lastUpdated: new Date().toISOString(),
  };

  if (
    config.showOverallScore ||
    config.showGrade ||
    config.showModuleStatuses
  ) {
    // Get first user in org to calculate score
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId },
      select: { userId: true },
    });
    if (member) {
      const score = await calculateComplianceScore(member.userId);
      if (config.showOverallScore) response.overallScore = score.overall;
      if (config.showGrade) response.grade = score.grade;
      if (config.showModuleStatuses) {
        response.modules = score.modules.map((m) => ({
          name: m.name,
          status: m.status,
          // Never expose exact scores publicly — just status
        }));
      }
    }
  }

  if (config.showAttestations) {
    const attestations = await prisma.complianceAttestation.findMany({
      where: {
        engagement: { organizationId: orgId },
        isRevoked: false,
        validUntil: { gt: new Date() },
      },
      select: {
        type: true,
        title: true,
        signerOrg: true,
        issuedAt: true,
        validUntil: true,
        // Never expose signer name/email publicly
      },
      orderBy: { issuedAt: "desc" },
      take: 10,
    });
    response.attestations = attestations;
  }

  if (config.showLicenses) {
    const workflows = await prisma.authorizationWorkflow.findMany({
      where: { organizationId: orgId, status: "approved" },
      select: { operatorType: true, ncaAuthority: true, approvedAt: true },
    });
    response.licenses = workflows.map((w) => ({
      operatorType: w.operatorType,
      authority: w.ncaAuthority,
      approved: w.approvedAt,
    }));
  }

  if (config.showDeadlineHealth) {
    const totalDeadlines = await prisma.deadline.count({
      where: { organizationId: orgId },
    });
    const overdueDeadlines = await prisma.deadline.count({
      where: {
        organizationId: orgId,
        dueDate: { lt: new Date() },
        status: { not: "completed" },
      },
    });
    response.deadlineHealth = {
      total: totalDeadlines,
      overdue: overdueDeadlines,
      healthPercent:
        totalDeadlines > 0
          ? Math.round(
              ((totalDeadlines - overdueDeadlines) / totalDeadlines) * 100,
            )
          : 100,
    };
  }

  return NextResponse.json({ success: true, data: response });
}
```

#### Admin Routes (authenticated)

```
POST   /api/dashboard/status-page          — Create/update status page config
GET    /api/dashboard/status-page          — Get current config
PATCH  /api/dashboard/status-page          — Toggle visibility settings
GET    /api/dashboard/status-page/analytics — View count, referrers
DELETE /api/dashboard/status-page          — Disable status page
```

### Public Page UI

Create `src/app/status/[slug]/page.tsx`:

```tsx
// This is a SERVER COMPONENT — no auth required, SEO-friendly
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  // Fetch org name for meta tags
  return {
    title: `${orgName} — Compliance Status | Caelex`,
    description: `Live compliance status for ${orgName}`,
    openGraph: {
      /* ... */
    },
  };
}

export default async function StatusPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await fetch(
    `${process.env.AUTH_URL}/api/public/status/${params.slug}`,
  );
  // ...render status page with organization branding
}
```

**Design:** Dark theme matching Caelex brand. Score gauge at top (if enabled), module cards below, attestation badges, license list, deadline health bar. Footer: "Verified by Caelex — Space Regulatory Compliance Platform" with link to caelex.eu.

### Settings UI

Add a tab in `/dashboard/settings` → "Public Status Page":

- Toggle: Enable/Disable
- Slug input (auto-generated from org name, editable)
- Checklist: What to show (each item toggleable)
- Preview button (opens status page in new tab)
- Optional: Password protection toggle + password input
- Analytics: Total views, views this month, last viewed

---

## Feature 2: Supply Chain Compliance Graph

### What It Is

A visual, interactive graph showing an operator's entire supply chain with compliance scores for each supplier. When a supplier improves their compliance, the operator's graph updates automatically.

### Why It Matters

NIS2 Art. 21(2)(d) explicitly requires "supply chain security." The EU Space Act Art. 74-95 require cybersecurity across the entire value chain. No tool currently provides visibility into supplier compliance — everyone just collects questionnaires.

### Database Changes

```prisma
model SupplierComplianceProfile {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Supplier identity
  supplierName    String
  supplierType    SupplierCategory
  criticality     SupplierCriticality
  contactName     String?
  contactEmail    String?
  website         String?

  // Compliance status
  overallScore       Int       @default(0) // 0-100
  cybersecurityScore Int?      // NIS2 Art. 21(2)(d)
  debrisScore        Int?      // For launch/spacecraft suppliers
  insuranceScore     Int?      // Insurance coverage adequacy
  environmentalScore Int?      // Environmental compliance
  lastAssessedAt     DateTime?
  nextAssessmentDue  DateTime?

  // Self-assessment (supplier fills this)
  selfAssessmentToken  String?   @unique
  selfAssessmentStatus SelfAssessmentStatus @default(NOT_SENT)
  selfAssessmentData   String?   @db.Text // JSON
  selfAssessmentAt     DateTime?

  // Documents
  certifications  String?  @db.Text // JSON array of cert names
  hasISO27001     Boolean  @default(false)
  hasSOC2         Boolean  @default(false)
  hasITAR         Boolean  @default(false)

  // Risk
  riskLevel       String   @default("unknown") // low, medium, high, critical, unknown
  riskFactors     String?  @db.Text // JSON array

  // Graph position (for visualization)
  tier            Int      @default(1) // 1 = direct supplier, 2 = sub-supplier
  parentSupplierId String? // For sub-supplier chains
  parentSupplier   SupplierComplianceProfile? @relation("SupplierChain", fields: [parentSupplierId], references: [id])
  subSuppliers     SupplierComplianceProfile[] @relation("SupplierChain")

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([selfAssessmentToken])
  @@index([supplierType])
}

enum SupplierCategory {
  LAUNCH_PROVIDER
  GROUND_STATION
  COMPONENT_MANUFACTURER
  SOFTWARE_PROVIDER
  INSURANCE_PROVIDER
  LEGAL_COUNSEL
  CYBERSECURITY_VENDOR
  COMMUNICATIONS_PROVIDER
  DATA_PROCESSOR
  TESTING_FACILITY
  CONSULTING
  OTHER
}

enum SupplierCriticality {
  CRITICAL       // Single point of failure
  HIGH           // Limited alternatives
  MEDIUM         // Multiple alternatives exist
  LOW            // Easily replaceable
}

enum SelfAssessmentStatus {
  NOT_SENT
  SENT
  IN_PROGRESS
  COMPLETED
  OVERDUE
  DECLINED
}
```

### Supplier Self-Assessment Portal

Extend the existing supplier portal (`src/app/supplier/[token]/page.tsx`) with a **compliance self-assessment form** — not just environmental data.

Create `src/app/supplier/[token]/compliance/page.tsx`:

```tsx
// Public page — no auth. Token-based access.
// Shows a multi-section compliance questionnaire:
// 1. Company Info (name, size, certifications)
// 2. Cybersecurity (10 questions matching NIS2 Art. 21(2)(a)-(j))
// 3. Data Protection (GDPR basics)
// 4. Quality Management (ISO certifications)
// 5. Insurance Coverage
// 6. Environmental Practices
// 7. Sub-suppliers (do THEY have compliance programs?)
```

The questionnaire uses the **same question format** as the unified assessment for consistency. Results are scored automatically:

```typescript
// src/lib/services/supplier-compliance-service.ts

export function scoreSupplierAssessment(
  data: SupplierSelfAssessment,
): SupplierScores {
  const cyber = scoreCybersecurity(data); // 0-100
  const insurance = scoreInsurance(data);
  const environmental = scoreEnvironmental(data);
  const quality = scoreQuality(data);

  // Weighted overall score
  const overall = Math.round(
    cyber * 0.35 + // Cybersecurity most important (NIS2)
      insurance * 0.2 + // Insurance coverage
      quality * 0.25 + // Quality management
      environmental * 0.2, // Environmental
  );

  // Risk classification
  const riskLevel =
    overall >= 80
      ? "low"
      : overall >= 60
        ? "medium"
        : overall >= 40
          ? "high"
          : "critical";

  return { overall, cyber, insurance, environmental, quality, riskLevel };
}
```

### Supply Chain Dashboard

Create `src/app/dashboard/supply-chain/page.tsx`:

**Two views:**

#### 1. Graph View (Interactive Force-Directed Graph)

Use D3.js (already available as dependency) for a force-directed network graph:

```tsx
// Nodes = suppliers, edges = relationships
// Node size = criticality, node color = risk level
// Click node → show detail panel with scores
// Drag to rearrange, zoom to focus

interface GraphNode {
  id: string;
  name: string;
  type: SupplierCategory;
  criticality: SupplierCriticality;
  score: number;
  riskLevel: string;
  tier: number;
  children: string[]; // Sub-supplier IDs
}
```

Center node = the operator's organization. First ring = Tier 1 (direct suppliers). Second ring = Tier 2 (sub-suppliers, if data available).

Color coding:

- Green (score >= 80): Low risk
- Yellow (score 60-79): Medium risk
- Orange (score 40-59): High risk
- Red (score < 40): Critical risk
- Gray: Not assessed

#### 2. Table View

Sortable table with all suppliers:

| Supplier     | Type            | Criticality | Overall | Cyber | Insurance | Risk | Last Assessed | Actions               |
| ------------ | --------------- | ----------- | ------- | ----- | --------- | ---- | ------------- | --------------------- |
| Ariane Group | Launch Provider | Critical    | 92      | 95    | 88        | Low  | 2026-01-15    | View / Request Update |

### Supply Chain Aggregate Score

Calculate an overall supply chain health score for the operator:

```typescript
export function calculateSupplyChainScore(suppliers: SupplierComplianceProfile[]): {
  overallHealth: number;
  criticalSupplierRisk: string;
  weakestLink: { name: string; score: number } | null;
  nis2Compliant: boolean;
  recommendations: string[];
} {
  if (suppliers.length === 0) return { overallHealth: 0, ... };

  // Weighted by criticality
  const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of suppliers) {
    const weight = weights[s.criticality] || 1;
    weightedSum += s.overallScore * weight;
    totalWeight += weight;
  }

  const overallHealth = Math.round(weightedSum / totalWeight);

  // Find weakest critical supplier
  const criticalSuppliers = suppliers.filter(s => s.criticality === "CRITICAL");
  const weakestCritical = criticalSuppliers.sort((a, b) => a.overallScore - b.overallScore)[0];

  // NIS2 compliance requires all critical suppliers assessed
  const allCriticalAssessed = criticalSuppliers.every(s => s.lastAssessedAt !== null);
  const allCriticalAbove60 = criticalSuppliers.every(s => s.overallScore >= 60);

  return {
    overallHealth,
    criticalSupplierRisk: weakestCritical?.riskLevel || "unknown",
    weakestLink: weakestCritical ? { name: weakestCritical.supplierName, score: weakestCritical.overallScore } : null,
    nis2Compliant: allCriticalAssessed && allCriticalAbove60,
    recommendations: generateSupplyChainRecommendations(suppliers),
  };
}
```

### Integration Points

1. **Digital Twin** — Add supply chain health as a new metric on the Digital Twin overview tab
2. **What-If Simulator** — New scenario type: "What if a critical supplier becomes non-compliant?"
3. **Status Page** — Optional: Show supply chain health score on public status page
4. **NCA Submissions** — Include supply chain assessment in authorization packages
5. **Notifications** — Alert when a supplier's self-assessment expires or drops below threshold

### API Routes

```
GET    /api/dashboard/supply-chain              — List all suppliers with scores
POST   /api/dashboard/supply-chain              — Add new supplier
GET    /api/dashboard/supply-chain/[id]         — Get supplier detail
PATCH  /api/dashboard/supply-chain/[id]         — Update supplier info
DELETE /api/dashboard/supply-chain/[id]         — Remove supplier
POST   /api/dashboard/supply-chain/[id]/assess  — Send self-assessment request
GET    /api/dashboard/supply-chain/graph        — Graph data (nodes + edges)
GET    /api/dashboard/supply-chain/score        — Aggregate supply chain score
POST   /api/supplier/[token]/compliance         — Submit self-assessment (public)
GET    /api/supplier/[token]/compliance         — Get assessment form config (public)
```

---

## Feature 3: Compliance Passport (Mutual Recognition)

### What It Is

A digital "passport" view that shows which compliance achievements in one jurisdiction are recognized in others. When an operator has a Luxembourg license, the passport shows: "73% of Netherlands requirements are automatically satisfied. These 4 items remain."

### Why It Matters

The EU Space Act introduces mutual recognition (Art. 13). An authorization in one Member State should be valid across the EU. But in practice, national laws still differ. The Compliance Passport makes this transparent and actionable — it answers the question every multi-jurisdiction operator has: "What do I still need?"

### Database Changes

```prisma
model CompliancePassport {
  id             String  @id @default(cuid())
  organizationId String  @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Current authorizations
  authorizations CompliancePassportAuthorization[]

  // Generated passport data (cached, recomputed on changes)
  passportData   String?  @db.Text  // JSON: full recognition matrix
  computedAt     DateTime?
  version        Int      @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CompliancePassportAuthorization {
  id          String  @id @default(cuid())
  passportId  String
  passport    CompliancePassport @relation(fields: [passportId], references: [id], onDelete: Cascade)

  jurisdiction    String  // Country code: FR, DE, LU, etc.
  operatorType    String  // SCO, LO, etc.
  authorizedAt    DateTime
  validUntil      DateTime?
  ncaReference    String? // NCA tracking number
  status          String  @default("active") // active, expired, suspended

  // What was covered
  coveredModules  String  @db.Text // JSON array of module IDs
  coveredArticles String  @db.Text // JSON array of article numbers

  createdAt DateTime @default(now())

  @@index([passportId])
  @@index([jurisdiction])
}
```

### Recognition Engine

Create `src/lib/services/compliance-passport-service.ts`:

```typescript
/**
 * Compliance Passport Service
 *
 * Calculates mutual recognition between EU jurisdictions based on:
 * 1. EU Space Act mutual recognition (Art. 13)
 * 2. National space law overlaps (from space-law-engine.server.ts)
 * 3. Actual authorization coverage (which articles/modules are covered)
 */
import "server-only";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

// Recognition matrix: For each jurisdiction pair, what % of requirements overlap
const RECOGNITION_MATRIX: Record<string, Record<string, number>> = {
  // Luxembourg → other jurisdictions
  LU: {
    NL: 0.82,
    BE: 0.78,
    AT: 0.75,
    FR: 0.7,
    DE: 0.68,
    DK: 0.72,
    IT: 0.65,
    NO: 0.6,
    UK: 0.45,
  },
  // France → other jurisdictions
  FR: {
    DE: 0.75,
    BE: 0.8,
    NL: 0.72,
    LU: 0.7,
    IT: 0.73,
    AT: 0.68,
    DK: 0.65,
    NO: 0.55,
    UK: 0.5,
  },
  // Germany → other jurisdictions
  DE: {
    FR: 0.75,
    AT: 0.85,
    NL: 0.78,
    BE: 0.72,
    LU: 0.68,
    IT: 0.7,
    DK: 0.65,
    NO: 0.55,
    UK: 0.48,
  },
  // ... complete for all 10 jurisdictions
};

export interface PassportView {
  currentAuthorizations: Authorization[];
  recognitionMap: JurisdictionRecognition[];
  bestExpansionPath: ExpansionRecommendation[];
  euSpaceActCoverage: number; // % of EU Space Act already covered
}

export interface JurisdictionRecognition {
  jurisdiction: string;
  jurisdictionName: string;
  recognitionPercent: number; // How much is auto-recognized
  remainingRequirements: string[]; // What still needs to be done
  additionalCost: string; // Estimated additional cost
  additionalTime: string; // Estimated additional time
  recommendedOrder: number; // Optimal expansion sequence
}

export interface ExpansionRecommendation {
  step: number;
  jurisdiction: string;
  reason: string;
  recognizedPercent: number;
  effortLevel: "minimal" | "moderate" | "significant";
}

export async function generatePassportView(
  organizationId: string,
): Promise<PassportView> {
  // 1. Get all current authorizations
  const passport = await prisma.compliancePassport.findUnique({
    where: { organizationId },
    include: { authorizations: { where: { status: "active" } } },
  });

  if (!passport || passport.authorizations.length === 0) {
    return emptyPassportView();
  }

  // 2. For each non-authorized jurisdiction, calculate recognition %
  const authorizedJurisdictions = new Set(
    passport.authorizations.map((a) => a.jurisdiction),
  );

  const allJurisdictions = Object.keys(JURISDICTION_DATA);
  const recognitionMap: JurisdictionRecognition[] = [];

  for (const target of allJurisdictions) {
    if (authorizedJurisdictions.has(target)) continue;

    // Calculate cumulative recognition from ALL existing authorizations
    let bestRecognition = 0;
    for (const auth of passport.authorizations) {
      const matrix = RECOGNITION_MATRIX[auth.jurisdiction];
      if (matrix && matrix[target]) {
        bestRecognition = Math.max(bestRecognition, matrix[target]);
      }
    }

    // Determine remaining requirements
    const targetData = JURISDICTION_DATA[target];
    const totalReqs = targetData.requirements?.length || 10;
    const recognizedReqs = Math.round(totalReqs * bestRecognition);
    const remaining = totalReqs - recognizedReqs;

    recognitionMap.push({
      jurisdiction: target,
      jurisdictionName: targetData.name,
      recognitionPercent: Math.round(bestRecognition * 100),
      remainingRequirements: getRemainingRequirements(
        target,
        passport.authorizations,
      ),
      additionalCost: estimateAdditionalCost(remaining, target),
      additionalTime: estimateAdditionalTime(remaining, target),
      recommendedOrder: 0, // Filled below
    });
  }

  // 3. Sort by recognition % (highest first = easiest expansion)
  recognitionMap.sort((a, b) => b.recognitionPercent - a.recognitionPercent);
  recognitionMap.forEach((j, i) => {
    j.recommendedOrder = i + 1;
  });

  // 4. Generate optimal expansion path
  const bestExpansionPath = recognitionMap.slice(0, 5).map((j, i) => ({
    step: i + 1,
    jurisdiction: j.jurisdiction,
    reason: `${j.recognitionPercent}% already recognized from your existing ${passport.authorizations
      .map((a) => a.jurisdiction)
      .join(
        ", ",
      )} authorization(s). Only ${j.remainingRequirements.length} additional requirements.`,
    recognizedPercent: j.recognitionPercent,
    effortLevel:
      j.recognitionPercent >= 75
        ? ("minimal" as const)
        : j.recognitionPercent >= 50
          ? ("moderate" as const)
          : ("significant" as const),
  }));

  // 5. Calculate overall EU Space Act coverage
  const allCoveredArticles = new Set<number>();
  for (const auth of passport.authorizations) {
    const articles = JSON.parse(auth.coveredArticles || "[]") as number[];
    articles.forEach((a) => allCoveredArticles.add(a));
  }
  const euSpaceActCoverage = Math.round((allCoveredArticles.size / 119) * 100);

  return {
    currentAuthorizations: passport.authorizations,
    recognitionMap,
    bestExpansionPath,
    euSpaceActCoverage,
  };
}
```

### Passport Dashboard

Create `src/app/dashboard/passport/page.tsx`:

**Three sections:**

#### 1. Current Authorizations

Cards showing active licenses:

```
🇱🇺 Luxembourg — SCO License
   Issued: 2025-08-15 | Valid until: 2030-08-15
   NCA Reference: LSA-2025-0142
   Covers: 45 EU Space Act articles, 6 modules
```

#### 2. Recognition Map (Interactive)

A map of Europe where each country is color-coded:

- Dark green = Authorized (you have a license here)
- Light green = 75%+ recognized (easy expansion)
- Yellow = 50-74% recognized (moderate effort)
- Orange = 25-49% recognized (significant effort)
- Gray = Not assessed

Click a country → slide-in panel showing:

- Recognition percentage
- Remaining requirements (bullet list)
- Estimated time and cost
- "Start Expansion" button (links to What-If Simulator with this jurisdiction pre-filled)

For the map, use a simple SVG of Europe (no external dependency needed). Each country is a `<path>` element with `fill` set by recognition score.

```tsx
// Use a pre-made Europe SVG inline — no external libs needed
// Example for one country:
<path
  d={COUNTRY_PATHS.DE}
  fill={getColor(
    recognitionMap.find((j) => j.jurisdiction === "DE")?.recognitionPercent,
  )}
  onClick={() => setSelectedJurisdiction("DE")}
  className="cursor-pointer hover:opacity-80 transition-opacity"
/>
```

#### 3. Optimal Expansion Path

A numbered list showing the recommended order of expansion:

```
1. 🇳🇱 Netherlands — 82% recognized (minimal effort)
   → Only 2 additional requirements. Estimated 60 days, ~€15,000
2. 🇧🇪 Belgium — 78% recognized (minimal effort)
   → Only 3 additional requirements. Estimated 90 days, ~€25,000
3. 🇦🇹 Austria — 75% recognized (moderate effort)
   → 4 additional requirements. Estimated 90 days, ~€30,000
```

### Integration Points

1. **What-If Simulator** — "Add Jurisdiction" scenario pre-fills recognition % from Passport
2. **Scenario Chains** — Auto-suggest optimal expansion path as a chain
3. **NCA Portal** — When starting a new jurisdiction application, show what's already recognized
4. **Status Page** — Optional: Show passport on public status page (number of jurisdictions authorized)

### API Routes

```
GET    /api/dashboard/passport              — Get full passport view
POST   /api/dashboard/passport/authorization — Add new authorization
PATCH  /api/dashboard/passport/authorization/[id] — Update authorization
DELETE /api/dashboard/passport/authorization/[id] — Remove authorization
GET    /api/dashboard/passport/recognition/[jurisdiction] — Detail for one country
POST   /api/dashboard/passport/recompute    — Force recompute recognition matrix
```

---

## Implementation Order

1. **Feature 1: Public Status Page** (smallest scope, highest immediate impact)
   - Schema migration
   - Public API endpoint
   - Public page UI (server component)
   - Settings UI in dashboard
   - Analytics tracking

2. **Feature 3: Compliance Passport** (medium scope, unique value proposition)
   - Schema migration
   - Recognition engine
   - Passport dashboard with SVG map
   - Expansion path recommendations
   - What-If Simulator integration

3. **Feature 2: Supply Chain Compliance Graph** (largest scope, strongest network effect)
   - Schema migration
   - Supplier self-assessment portal (extend existing supplier portal)
   - Scoring engine
   - Dashboard with D3 graph view + table view
   - Aggregate supply chain score
   - Notification system for assessment expiry
   - Digital Twin integration

## Quality Checklist

- [ ] All new routes follow existing patterns (auth check, error handling, rate limiting)
- [ ] Public routes have rate limiting via `src/lib/ratelimit.ts` (use "api" tier)
- [ ] Prisma migrations run without errors (`npx prisma db push`)
- [ ] Status page is SEO-friendly (server component with generateMetadata)
- [ ] Status page respects all visibility toggles (never leak non-enabled data)
- [ ] Password-protected status pages use bcrypt (consistent with existing auth)
- [ ] Supply chain graph uses D3.js (already in dependencies, no new cost)
- [ ] Supplier self-assessment reuses unified assessment question format
- [ ] Passport map is pure SVG (no external map library needed)
- [ ] Recognition matrix values are based on real national space law data
- [ ] All new models have proper indexes for query performance
- [ ] Audit logging on all state changes (use existing `src/lib/audit.ts`)
- [ ] No paid services or APIs introduced
- [ ] TypeScript compiles with zero errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
