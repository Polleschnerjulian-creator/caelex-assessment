# Legal Portal Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data layer, auth middleware, scope service, and briefing engine that both the client-side engagement flow and the law firm portal depend on.

**Architecture:** Extends existing StakeholderEngagement/DataRoom patterns. New Prisma models for LegalFirm, LegalAttorney, LegalEngagement, LegalAccessLog, LegalReviewComment. New auth middleware for `/legal/*` routes. Engagement-scope service resolves which data an attorney can see based on engagement type. Briefing engine auto-generates intelligence summaries.

**Tech Stack:** Prisma 5, NextAuth v5 (JWT), AES-256-GCM encryption, Zod validation.

**Spec:** `docs/superpowers/specs/2026-04-04-legal-portal-design.md`

---

## File Map

### New Files (7)

| File                                                  | Responsibility                                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/legal-auth.ts`                               | Auth middleware for `/legal/*` routes — session validation, MFA enforcement, engagement-scope check |
| `src/lib/services/legal-scope-service.server.ts`      | Resolves which data an attorney can access based on engagement type + manual overrides              |
| `src/lib/services/legal-briefing-service.server.ts`   | Auto-generates intelligent compliance briefings for attorneys                                       |
| `src/app/api/legal-engagements/route.ts`              | List + create engagements (client-side API)                                                         |
| `src/app/api/legal-engagements/[id]/route.ts`         | Get + update + revoke engagement                                                                    |
| `src/app/api/legal-engagements/[id]/invite/route.ts`  | Send invitation to attorney                                                                         |
| `src/lib/services/legal-engagement-service.server.ts` | Engagement CRUD business logic                                                                      |

### Modified Files (3)

| File                     | Change                                                      |
| ------------------------ | ----------------------------------------------------------- |
| `prisma/schema.prisma`   | Add 6 new models + relations on User and Organization       |
| `src/lib/permissions.ts` | Add `legal:read`, `legal:write`, `legal:review` permissions |
| `src/lib/encryption.ts`  | Add `LegalReviewComment` to `ENCRYPTED_FIELDS`              |

---

## Task 1: Prisma Schema — Legal Portal Models

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Legal Portal models to Prisma schema**

Read the schema first to find exact insertion points. Add these models after the existing DataRoom models (around line 4951). Also add relations to the User and Organization models.

**New models to add:**

```prisma
// ─── LEGAL PORTAL ───

model LegalFirm {
  id        String   @id @default(cuid())
  name      String
  city      String?
  country   String?
  website   String?
  barNumber String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  attorneys   LegalAttorney[]
  engagements LegalEngagement[]

  @@index([name])
}

model LegalAttorney {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  firmId    String
  firm      LegalFirm @relation(fields: [firmId], references: [id])
  title     String?
  barNumber String?
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())

  engagements LegalEngagementAttorney[]
  comments    LegalReviewComment[]

  @@index([firmId])
}

model LegalEngagement {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  firmId         String
  firm           LegalFirm    @relation(fields: [firmId], references: [id])

  engagementType String
  title          String
  description    String?
  status         String       @default("pending")

  scopedModules       String[]
  scopedDataTypes     String[]
  scopedAssessmentIds String[]
  includeNIS2Overlap  Boolean  @default(false)

  expiresAt      DateTime
  allowExport    Boolean  @default(false)
  ipWhitelist    String[]

  invitedBy String
  note      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  revokedAt DateTime?

  attorneys  LegalEngagementAttorney[]
  accessLogs LegalAccessLog[]
  comments   LegalReviewComment[]

  @@index([organizationId])
  @@index([firmId])
  @@index([status])
}

model LegalEngagementAttorney {
  id           String   @id @default(cuid())
  engagementId String
  engagement   LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId   String
  attorney     LegalAttorney   @relation(fields: [attorneyId], references: [id])
  acceptedAt   DateTime?

  @@unique([engagementId, attorneyId])
}

model LegalAccessLog {
  id           String   @id @default(cuid())
  engagementId String
  engagement   LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId   String
  action       String
  resource     String
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  @@index([engagementId, createdAt])
}

model LegalReviewComment {
  id           String   @id @default(cuid())
  engagementId String
  engagement   LegalEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  attorneyId   String
  attorney     LegalAttorney @relation(fields: [attorneyId], references: [id])

  targetType  String
  targetId    String?
  commentType String
  content     String  @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([engagementId])
  @@index([targetType, targetId])
}
```

**Relations to add:**

- User model: `legalAttorney LegalAttorney?`
- Organization model: `legalEngagements LegalEngagement[]`

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(legal): add Legal Portal Prisma models (6 models)"
```

---

## Task 2: Permissions — Legal RBAC

**Files:**

- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/encryption.ts`

- [ ] **Step 1: Add legal permissions**

Read `src/lib/permissions.ts`. Find the `ALL_PERMISSIONS` array and the role permission maps. Add:

```typescript
// Add to ALL_PERMISSIONS:
"legal:read",
"legal:write",
"legal:review",

// Add to MANAGER role permissions:
"legal:read",
"legal:write",

// Add to ADMIN role permissions:
"legal:read",
"legal:write",
"legal:review",

// Add to OWNER role permissions:
// Already has "*" so automatically included
```

- [ ] **Step 2: Add encrypted fields for Legal**

Read `src/lib/encryption.ts`. Find the `ENCRYPTED_FIELDS` map. Add:

```typescript
LegalReviewComment: ["content"],
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/permissions.ts src/lib/encryption.ts
git commit -m "feat(legal): add legal RBAC permissions and encryption fields"
```

---

## Task 3: Legal Auth Middleware

**Files:**

- Create: `src/lib/legal-auth.ts`

- [ ] **Step 1: Create legal auth middleware**

This middleware validates that a request comes from an authenticated user who is a LegalAttorney with an active engagement for the target organization. Read `src/lib/middleware/organization-guard.ts` and `src/lib/api-auth.ts` for patterns.

```typescript
import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface LegalContext {
  attorneyId: string;
  firmId: string;
  userId: string;
  firmName: string;
  isAdmin: boolean;
}

/**
 * Verify the current session belongs to a registered LegalAttorney.
 * Returns attorney context or null.
 */
export async function getLegalContext(): Promise<LegalContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attorney = await prisma.legalAttorney.findUnique({
    where: { userId: session.user.id },
    include: { firm: { select: { id: true, name: true } } },
  });

  if (!attorney) return null;

  return {
    attorneyId: attorney.id,
    firmId: attorney.firmId,
    userId: session.user.id,
    firmName: attorney.firm.name,
    isAdmin: attorney.isAdmin,
  };
}

/**
 * Verify the attorney has access to a specific engagement.
 * Checks: engagement exists, attorney is assigned, engagement is active, not expired, not revoked.
 */
export async function verifyEngagementAccess(
  attorneyId: string,
  engagementId: string,
): Promise<{
  success: boolean;
  engagement?: {
    id: string;
    organizationId: string;
    engagementType: string;
    scopedModules: string[];
    scopedDataTypes: string[];
    scopedAssessmentIds: string[];
    includeNIS2Overlap: boolean;
    allowExport: boolean;
  };
  error?: string;
}> {
  const assignment = await prisma.legalEngagementAttorney.findUnique({
    where: {
      engagementId_attorneyId: { engagementId, attorneyId },
    },
    include: {
      engagement: true,
    },
  });

  if (!assignment) {
    return { success: false, error: "Not assigned to this engagement" };
  }

  if (!assignment.acceptedAt) {
    return { success: false, error: "Invitation not yet accepted" };
  }

  const eng = assignment.engagement;

  if (eng.status === "revoked") {
    return { success: false, error: "Engagement has been revoked" };
  }

  if (eng.status !== "active") {
    return { success: false, error: `Engagement is ${eng.status}` };
  }

  if (new Date() > eng.expiresAt) {
    return { success: false, error: "Engagement has expired" };
  }

  if (eng.revokedAt) {
    return { success: false, error: "Engagement has been revoked" };
  }

  return {
    success: true,
    engagement: {
      id: eng.id,
      organizationId: eng.organizationId,
      engagementType: eng.engagementType,
      scopedModules: eng.scopedModules,
      scopedDataTypes: eng.scopedDataTypes,
      scopedAssessmentIds: eng.scopedAssessmentIds,
      includeNIS2Overlap: eng.includeNIS2Overlap,
      allowExport: eng.allowExport,
    },
  };
}

/**
 * Log an access event for audit trail.
 */
export async function logLegalAccess(
  engagementId: string,
  attorneyId: string,
  action: string,
  resource: string,
  request?: Request,
): Promise<void> {
  try {
    await prisma.legalAccessLog.create({
      data: {
        engagementId,
        attorneyId,
        action,
        resource,
        ipAddress:
          request?.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
          null,
        userAgent: request?.headers.get("user-agent")?.slice(0, 200) || null,
      },
    });
  } catch (err) {
    logger.warn("Failed to log legal access", err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/legal-auth.ts
git commit -m "feat(legal): add legal auth middleware with engagement-scoped access control"
```

---

## Task 4: Engagement Scope Service

**Files:**

- Create: `src/lib/services/legal-scope-service.server.ts`

- [ ] **Step 1: Create scope service**

This service resolves which data an attorney can see based on the engagement type. It returns query filters that downstream API routes use to scope their Prisma queries.

```typescript
import "server-only";

// Engagement types with automatic data scoping
export const ENGAGEMENT_TYPES = [
  {
    id: "cra_notified_body",
    name: "CRA Notified Body Submission",
    description:
      "Review and support for Class I/II conformity assessment with a Notified Body",
    autoScope: {
      modules: ["cra"],
      dataTypes: [
        "assessment",
        "classification_reasoning",
        "requirements",
        "sbom",
        "evidence",
        "nb_workflow",
        "documents",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "nis2_nca_registration",
    name: "NIS2 NCA Registration",
    description:
      "Legal support for NIS2 entity registration with national competent authority",
    autoScope: {
      modules: ["nis2"],
      dataTypes: [
        "assessment",
        "classification",
        "requirements",
        "incidents",
        "nca_submissions",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "jurisdiction_selection",
    name: "Jurisdiktionswahl & Licensing",
    description:
      "Legal advisory for optimal jurisdiction selection and authorization",
    autoScope: {
      modules: ["authorization", "space_law"],
      dataTypes: [
        "assessment",
        "jurisdiction_comparison",
        "workflow",
        "documents",
      ],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "incident_response",
    name: "Incident Response & NCA Notification",
    description:
      "Legal support during an active security incident with regulatory notification obligations",
    autoScope: {
      modules: ["nis2", "cra", "cybersecurity"],
      dataTypes: [
        "incidents",
        "nis2_phases",
        "draft_notifications",
        "timeline",
      ],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "export_control",
    name: "Export Control Review (ITAR/EAR)",
    description:
      "Legal review of export control compliance for space technology transfers",
    autoScope: {
      modules: ["export_control"],
      dataTypes: ["assessment", "requirements", "documents", "evidence"],
      includeNIS2Overlap: false,
    },
  },
  {
    id: "full_compliance_review",
    name: "Full Compliance Audit",
    description: "Comprehensive legal review across all regulatory modules",
    autoScope: {
      modules: ["all"],
      dataTypes: ["all"],
      includeNIS2Overlap: true,
    },
  },
  {
    id: "custom",
    name: "Custom Engagement",
    description: "Manually select which data to share",
    autoScope: null,
  },
] as const;

export type EngagementTypeId = (typeof ENGAGEMENT_TYPES)[number]["id"];

export function getEngagementType(id: string) {
  return ENGAGEMENT_TYPES.find((t) => t.id === id);
}

/**
 * Resolve the auto-scope for an engagement type.
 * Returns the modules and data types that should be accessible.
 */
export function resolveAutoScope(engagementTypeId: string): {
  modules: string[];
  dataTypes: string[];
  includeNIS2Overlap: boolean;
} | null {
  const type = getEngagementType(engagementTypeId);
  if (!type || !type.autoScope) return null;
  return {
    modules: [...type.autoScope.modules],
    dataTypes: [...type.autoScope.dataTypes],
    includeNIS2Overlap: type.autoScope.includeNIS2Overlap,
  };
}

/**
 * Check if a specific module is within the engagement scope.
 */
export function isModuleInScope(
  scopedModules: string[],
  module: string,
): boolean {
  if (scopedModules.includes("all")) return true;
  return scopedModules.includes(module);
}

/**
 * Check if a specific data type is within the engagement scope.
 */
export function isDataTypeInScope(
  scopedDataTypes: string[],
  dataType: string,
): boolean {
  if (scopedDataTypes.includes("all")) return true;
  return scopedDataTypes.includes(dataType);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/legal-scope-service.server.ts
git commit -m "feat(legal): add engagement scope service with 7 engagement types"
```

---

## Task 5: Legal Briefing Engine

**Files:**

- Create: `src/lib/services/legal-briefing-service.server.ts`

- [ ] **Step 1: Create briefing engine**

The briefing engine auto-generates structured intelligence summaries from compliance data. It reads assessments, requirements, evidence, and produces a legal-context briefing.

Read `src/lib/services/cyber-suite-score.server.ts` for the pattern of querying multiple assessment models. Read `src/data/cra-requirements.ts` and `src/data/nis2-requirements.ts` for requirement metadata.

The service must:

1. Accept an engagement scope (modules, data types, assessment IDs)
2. Fetch relevant assessment data from Prisma
3. For each compliance gap, generate a `legalImplication` based on the requirement's article reference
4. Return a structured `LegalBriefing` object

Key function:

```typescript
export async function generateLegalBriefing(
  organizationId: string,
  engagementScope: {
    modules: string[];
    dataTypes: string[];
    assessmentIds: string[];
    includeNIS2Overlap: boolean;
  },
): Promise<LegalBriefing>;
```

The `legalImplication` for each gap should be derived from the requirement's `articleRef` and `severity`:

- Critical severity + missing: "Non-compliance may result in fines up to EUR {amount} under {articleRef}."
- Major severity + missing: "Required under {articleRef}. Absence may delay conformity assessment."
- Minor severity + missing: "Recommended under {articleRef}. Not blocking but flagged by auditors."

The implementing agent should read the actual requirement data files and cross-reference data to build meaningful implications.

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/legal-briefing-service.server.ts
git commit -m "feat(legal): add intelligent legal briefing engine with gap analysis"
```

---

## Task 6: Engagement CRUD Service + API Routes

**Files:**

- Create: `src/lib/services/legal-engagement-service.server.ts`
- Create: `src/app/api/legal-engagements/route.ts`
- Create: `src/app/api/legal-engagements/[id]/route.ts`
- Create: `src/app/api/legal-engagements/[id]/invite/route.ts`

- [ ] **Step 1: Create engagement service**

CRUD operations for legal engagements. Follow the pattern from `src/lib/services/stakeholder-engagement.ts`. Functions:

- `createEngagement(input)` — creates engagement + auto-resolves scope from engagement type
- `getEngagements(organizationId)` — list all engagements for an org
- `getEngagement(id, organizationId)` — get single engagement with attorney details
- `updateEngagement(id, data)` — update scope, expiry, export permission
- `revokeEngagement(id)` — set status to "revoked", set revokedAt

- [ ] **Step 2: Create API routes**

Three route files following the existing API patterns (auth, org-scoping, Zod validation, audit logging).

`POST /api/legal-engagements` — Create engagement (requires `legal:write` permission)
`GET /api/legal-engagements` — List engagements (requires `legal:read` permission)
`GET /api/legal-engagements/[id]` — Get engagement detail
`PATCH /api/legal-engagements/[id]` — Update engagement
`DELETE /api/legal-engagements/[id]` — Revoke engagement
`POST /api/legal-engagements/[id]/invite` — Send invitation email to attorney

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/legal-engagement-service.server.ts src/app/api/legal-engagements/
git commit -m "feat(legal): add engagement CRUD service and API routes"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep "legal"` — should have zero errors.

- [ ] **Step 2: Verify Prisma generates**

Run: `npx prisma generate` — should succeed.

- [ ] **Step 3: Commit any fixes**

```bash
git commit -am "fix(legal): resolve type errors from legal portal foundation"
```
