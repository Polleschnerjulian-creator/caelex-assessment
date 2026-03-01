# Caelex Assure — Implementation Prompt for Claude Code

## Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 50+ Prisma models, and three server-only compliance engines (`engine.server.ts`, `nis2-engine.server.ts`, `space-law-engine.server.ts`).

## What to Build

Build **Caelex Assure** — a regulatory readiness intelligence layer that enables space operators to share their compliance status with external stakeholders (investors, insurers, board members). While Caelex Comply faces inward (operators managing their own compliance), Assure faces outward (proving compliance to others).

**Important:** The compliance engines, article-level tracking, audit trail, dashboard modules, and all underlying data infrastructure already exist in Caelex Comply. Assure is a new view/interface layer on top of existing data — NOT a new data platform. Do not rebuild what already exists. Read and reuse the existing engines and services.

---

## Core Feature: Regulatory Readiness Score (RRS)

Build a scoring engine at `src/lib/rrs-engine.server.ts` (server-only) that computes a composite score (0–100) from existing compliance data. The RRS is computed per organization from the data already tracked in the dashboard modules.

### RRS Components and Weights

| Component                     | Weight | Data Source (already exists)                                                              |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Authorization Readiness       | 25%    | `AuthorizationWorkflow` model, EU Space Act engine output, tracker completion             |
| Cybersecurity Posture         | 20%    | `CybersecurityAssessment`, `NIS2Assessment`, NIS2 engine output                           |
| Operational Compliance        | 20%    | `DebrisAssessment`, `EnvironmentalAssessment`, `InsuranceAssessment`, `SupervisionConfig` |
| Multi-Jurisdictional Coverage | 15%    | `SpaceLawAssessment`, space-law engine output, jurisdiction analysis                      |
| Regulatory Trajectory         | 10%    | Compute from timestamped compliance state changes — trend over 30/90/365 days             |
| Governance & Process          | 10%    | `AuditLog` completeness, `Document` vault population, assigned responsibilities           |

### Scoring Logic

Each component scores 0–100 individually based on completion rates, gap analysis, and quality metrics from the existing data. The weighted composite produces the overall RRS. Store computed scores in a new `RegulatoryReadinessScore` Prisma model with historical snapshots (compute daily via cron, store in `RRSSnapshot`).

The score must be deterministic and reproducible — same input data must always produce the same score. Include the computation methodology as an exportable appendix so investors can understand how the score was derived.

---

## Feature 1: Investor Due Diligence Package

### API Routes

- `POST /api/assure/dd-package/generate` — Generate a point-in-time DD package for the current organization
- `GET /api/assure/dd-package/[id]` — Retrieve a generated package
- `GET /api/assure/dd-package/[id]/export` — Export as PDF (use existing `@react-pdf/renderer` infrastructure in `src/lib/pdf/`)

### DD Package Contents

1. **Executive Summary** — RRS with component breakdown, one-paragraph assessment
2. **Regulatory Risk Register** — Top risks with severity/likelihood/mitigation (pull from existing assessment data)
3. **Authorization Timeline** — Milestones from `AuthorizationWorkflow` + `Deadline` + `MissionPhase` models
4. **Compliance Gap Analysis** — Current state vs. full compliance per module (compute from engine outputs)
5. **Regulatory Cost Projection** — Estimated future compliance costs based on gap size and industry benchmarks
6. **Benchmark Position** — Where this organization sits relative to anonymized cohort (requires aggregate data from multiple orgs)

### PDF Export

Add new templates in `src/lib/pdf/` following the existing pattern (see `src/lib/pdf/` for current report templates). Use Caelex branding: Black (#000000) + Emerald (#10B981), clean professional layout.

---

## Feature 2: Permissioned Sharing

### Data Model (add to `prisma/schema.prisma`)

```
model AssureShareLink {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  token           String   @unique  // cryptographically random access token
  label           String   // "Series B DD — Investor X"

  // Access controls
  granularity     ShareGranularity @default(SUMMARY)  // SUMMARY | COMPONENT | DETAILED
  expiresAt       DateTime
  maxViews        Int?     // optional view limit
  viewCount       Int      @default(0)
  isRevoked       Boolean  @default(false)

  // What's included
  includeRRS          Boolean @default(true)
  includeGapAnalysis  Boolean @default(false)
  includeTimeline     Boolean @default(false)
  includeRiskRegister Boolean @default(false)
  includeTrend        Boolean @default(false)

  // Audit
  views           AssureShareView[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ShareGranularity {
  SUMMARY     // RRS total score + component scores only
  COMPONENT   // + gap analysis per module, risk register summary
  DETAILED    // + article-level detail, full timeline, documents list
}

model AssureShareView {
  id          String   @id @default(cuid())
  linkId      String
  link        AssureShareLink @relation(fields: [linkId], references: [id])
  viewerIp    String?
  userAgent   String?
  viewedAt    DateTime @default(now())
}
```

### API Routes

- `POST /api/assure/share` — Create a new share link
- `GET /api/assure/share` — List all share links for the org
- `PATCH /api/assure/share/[id]` — Update or revoke a share link
- `DELETE /api/assure/share/[id]` — Delete a share link

### Public Shared View (no auth required)

- `GET /assure/view/[token]` — Public page that renders the shared compliance view based on granularity level. No NextAuth session required. Validate token, check expiry, increment view count, log the view. This is what the investor sees.

The shared view must be clean, professional, and read-only. Show the Caelex branding, the RRS with visual gauge/chart, and whatever modules the operator has enabled for this share link. Include a "Powered by Caelex" footer with link to caelex.eu.

---

## Feature 3: Assure Dashboard (Operator Side)

### Pages

- `/dashboard/assure` — Main Assure overview for the operator
- `/dashboard/assure/score` — Detailed RRS breakdown with trend charts
- `/dashboard/assure/share` — Manage share links (create, view, revoke)
- `/dashboard/assure/packages` — Generate and manage DD packages

### UI Components (in `src/components/assure/`)

- `RRSGauge` — Circular/arc gauge showing 0–100 score with color gradient (red→amber→green)
- `RRSComponentBreakdown` — Bar chart or radar chart showing 6 component scores
- `RRSTrendChart` — Line chart showing score over time (30/90/365 day views)
- `ShareLinkManager` — Table of active share links with create/revoke actions
- `DDPackageGenerator` — Form to configure and generate a DD package

Follow the existing design system exactly: dark theme, navy palette (`bg-navy-900`, `border-navy-700`), emerald accents, `GlassCard` component, Framer Motion transitions. Look at existing dashboard modules for patterns.

### Sidebar Integration

Add "Assure" as a new section in the dashboard sidebar (`src/components/dashboard/Sidebar.tsx`) with a shield or chart icon from Lucide React. Position it after the existing compliance modules.

---

## Feature 4: Cron Job for RRS Computation

Add a new cron endpoint at `/api/cron/compute-rrs` that:

1. Iterates all organizations with active subscriptions
2. Computes the current RRS for each
3. Stores a snapshot in `RRSSnapshot`
4. Detects significant score changes (>5 points) and triggers notifications

Schedule: Daily at 7:00 AM UTC (add to `vercel.json` cron config alongside existing cron jobs).

Use the existing notification service (`src/lib/services/notification.ts`) for alerts.

---

## Implementation Guidelines

1. **Server-only engines:** The RRS engine must be in a `.server.ts` file and import `server-only`. Follow the pattern of existing engines.

2. **Validation:** Use Zod schemas for all API inputs. Add them to `src/lib/validations.ts` following existing patterns.

3. **Rate limiting:** Add rate limit tier for Assure endpoints in `src/lib/ratelimit.ts`. Share links should have their own public tier (more restrictive).

4. **Audit logging:** Log all Assure actions (share link creation, DD package generation, share link access) using the existing audit service (`src/lib/audit.ts`).

5. **Permissions:** Assure features require at minimum MANAGER role. Share link creation requires ADMIN or OWNER. Follow the RBAC system in `src/lib/permissions.ts`.

6. **Encryption:** The share link tokens should be cryptographically random (use `crypto.randomBytes`). Viewer IP addresses in `AssureShareView` should be encrypted using the existing encryption utilities (`src/lib/encryption.ts`).

7. **Testing:** Write unit tests for the RRS computation engine (deterministic scoring is testable). Write integration tests for share link CRUD and access flow. Follow existing test patterns in `tests/`.

8. **Styling:** Match the existing design system exactly. Use semantic type tokens (`text-body`, `text-heading`, etc.) not arbitrary sizes. Use `GlassCard`, existing Button/Badge/Input components from `src/components/ui/`. Dark theme, navy backgrounds, emerald accents.

---

## What NOT to Build

- Do NOT build a separate Compliance Digital Twin — the what-if analysis and scenario modeling features are already part of Comply's roadmap.
- Do NOT build the Portfolio Intelligence view (VC multi-company view) — that's Phase 3, after we have enough operator data.
- Do NOT build the Agency/NCA oversight module — that's Phase 3.
- Do NOT rebuild any compliance engine logic — reuse the existing engines.
- Do NOT create a separate database or data pipeline — Assure reads from the same database as Comply.

---

## File Structure

```
src/
  app/
    assure/
      view/[token]/page.tsx        # Public shared view (no auth)
    dashboard/
      assure/
        page.tsx                    # Main Assure dashboard
        score/page.tsx              # Detailed RRS view
        share/page.tsx              # Share link management
        packages/page.tsx           # DD package management
    api/
      assure/
        score/route.ts              # GET current RRS
        dd-package/
          generate/route.ts         # POST generate package
          [id]/route.ts             # GET package
          [id]/export/route.ts      # GET PDF export
        share/
          route.ts                  # POST create, GET list
          [id]/route.ts             # PATCH update, DELETE
      cron/
        compute-rrs/route.ts        # Daily RRS computation

  lib/
    rrs-engine.server.ts            # RRS computation (server-only)
    pdf/
      dd-package-report.tsx         # PDF template for DD export

  components/
    assure/
      RRSGauge.tsx
      RRSComponentBreakdown.tsx
      RRSTrendChart.tsx
      ShareLinkManager.tsx
      DDPackageGenerator.tsx
      AssurePublicView.tsx          # Shared view component
```

## Priority Order

Build in this order:

1. Prisma schema additions + `db:push`
2. RRS engine (`rrs-engine.server.ts`)
3. RRS API route + cron job
4. Assure dashboard pages (score view first)
5. Share link system (model, API, public view)
6. DD Package generation + PDF export
7. Tests
