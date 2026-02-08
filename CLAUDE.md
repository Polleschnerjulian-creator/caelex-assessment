# CLAUDE.md — Caelex Platform Specification

## What This Is

Caelex is a **full-stack space regulatory compliance SaaS platform** built with Next.js 15, PostgreSQL (Neon), Prisma ORM, and NextAuth v5. It helps satellite operators, launch providers, and space service companies assess and manage compliance with the EU Space Act (COM(2025) 335), NIS2 Directive (EU 2022/2555), and national space laws across 10 European jurisdictions.

The platform includes:

- **3 assessment modules** — EU Space Act (8 questions, 119 articles), NIS2 Directive (space-scoped), National Space Laws (10 jurisdictions)
- **8 compliance dashboard modules** — Authorization, Registration, Cybersecurity, Debris, Environmental, Insurance, NIS2, Supervision
- **Full SaaS infrastructure** — Multi-tenant organizations, RBAC, Stripe billing, document vault, audit trail, API v1

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Neon Serverless
- **ORM:** Prisma 5.22 (2,424-line schema, 50+ models, 108 indices)
- **Auth:** NextAuth v5 (credentials + Google OAuth + SSO SAML/OIDC)
- **Payments:** Stripe (checkout, portal, webhooks)
- **Storage:** Cloudflare R2 / S3-compatible (via AWS SDK)
- **Rate Limiting:** Upstash Redis (sliding window, 7 tiers)
- **Encryption:** AES-256-GCM (scrypt key derivation) for sensitive fields
- **Email:** Resend (primary) / Nodemailer SMTP (fallback)
- **PDF:** @react-pdf/renderer (client-side report generation)
- **3D:** Three.js (@react-three/fiber) for landing page
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Validation:** Zod
- **Styling:** Tailwind CSS (dark mode, navy palette)
- **Testing:** Vitest (unit/integration) + Playwright (E2E) + MSW (API mocking)
- **CI/CD:** GitHub Actions (security scans, tests) + Husky pre-commit hooks + Vercel auto-deploy
- **Monitoring:** Sentry error tracking + LogSnag events + Vercel Analytics

## Architecture

```
src/
  app/                  44 page routes + 138 API route files
    (root)              Landing page, layout, globals
    assessment/         3 assessment wizards (EU Space Act, NIS2, Space Law)
    dashboard/          Authenticated dashboard with 8 modules + admin
    api/                138 route handlers across 32 domains
    resources/          Public resource pages (FAQ, glossary, timeline)
    legal/              Legal pages (impressum, privacy, terms, cookies)
  components/           130 React components across 20 subdirectories
    assessment/         Wizard components (AssessmentWizard, QuestionStep, OptionCard, etc.)
    results/            Results dashboard components (ComplianceProfile, ModuleCards, etc.)
    dashboard/          Dashboard layout (Sidebar, TopBar, analytics cards)
    landing/            Landing page sections (Hero, Stats, Features, 3D scene)
    ui/                 Shared UI primitives (Button, Card, Badge, Input, etc.)
    [domain]/           Domain-specific components (audit, billing, documents, etc.)
  data/                 20 regulatory data files
    articles.ts         EU Space Act articles (67 grouped entries covering 119 articles)
    nis2-requirements.ts  NIS2 requirements (51 entries, 2,243 LOC)
    national-space-laws.ts  10 jurisdictions (1,681 LOC)
    modules.ts          Module definitions + compliance type normalization
    [domain]-requirements.ts  Domain-specific data (cybersecurity, debris, insurance, etc.)
  lib/                  Business logic, engines, services, utilities
    engine.server.ts    EU Space Act compliance engine (server-only)
    nis2-engine.server.ts  NIS2 compliance engine (server-only)
    space-law-engine.server.ts  National space law engine (server-only)
    services/           24 service files (notification, subscription, audit, etc.)
    email/              Email templates and sending (Resend + SMTP)
    pdf/                PDF report generation (6 report types)
    stripe/             Stripe integration (client, products, webhooks)
    storage/            R2/S3 file storage client
    workflow/           Authorization workflow state machine
  hooks/                Custom React hooks (keyboard shortcuts, onboarding)
  types/                External type declarations

prisma/
  schema.prisma         Database schema (2,424 lines, 50+ models, 108 indices)
  seed-admin.ts         Admin user seeding

tests/
  unit/                 37 unit test files
  integration/          25 integration test files
  e2e/                  6 E2E test files
  fixtures/             Test fixtures and factories
  mocks/                MSW handlers
```

## Key Routes

### Public Pages

- `/` — Landing page
- `/assessment` — Assessment module picker
- `/assessment/eu-space-act` — EU Space Act 8-question wizard
- `/assessment/nis2` — NIS2 assessment wizard
- `/assessment/space-law` — National space law wizard
- `/pricing` — Pricing tiers
- `/resources/*` — FAQ, glossary, timeline, EU Space Act overview
- `/legal/*` — Impressum, privacy, terms (DE+EN), cookies
- `/docs/api` — API documentation (Swagger UI)

### Authenticated Pages

- `/dashboard` — Main compliance dashboard
- `/dashboard/modules/*` — 8 compliance modules (authorization, cybersecurity, debris, environmental, insurance, nis2, registration, supervision)
- `/dashboard/documents` — Document vault
- `/dashboard/timeline` — Mission timeline & deadlines
- `/dashboard/tracker` — Article-level compliance tracker
- `/dashboard/settings` — User settings + billing
- `/dashboard/admin` — Admin panel (users, organizations)

### API Domains (138 route files)

`admin`, `assessment`, `audit`, `auth`, `authorization`, `careers`, `contact`, `cron`, `cybersecurity`, `dashboard`, `debris`, `documents`, `environmental`, `insurance`, `invitations`, `nca`, `nis2`, `notifications`, `organization`, `organizations`, `registration`, `reports`, `security`, `sessions`, `space-law`, `sso`, `stripe`, `supervision`, `supplier`, `timeline`, `tracker`, `user`, `v1`

## Compliance Engines (server-only)

### EU Space Act Engine (`src/lib/engine.server.ts`)

- Maps 7 operator types (SCO, LO, LSO, ISOS, CAP, PDP, TCO) + ALL
- Filters 119 articles by operator type via `applies_to` field
- Determines regime (standard vs light) based on entity size
- Calculates module statuses across 9 modules
- Generates checklists (pre-authorization, ongoing, end-of-life)
- Light regime: Art. 10 simplified requirements for small/research entities

### NIS2 Engine (`src/lib/nis2-engine.server.ts`)

- Classifies entities as essential/important/out-of-scope per Art. 2-3
- Space-specific exceptions (SATCOM, ground infra, launch services)
- 51 requirements mapped to Art. 21(2) measures (a)-(j) + Art. 23/27/29
- Incident timeline: 24h early warning, 72h notification, 1 month final report
- Penalties: EUR 10M or 2% (essential), EUR 7M or 1.4% (important)

### Space Law Engine (`src/lib/space-law-engine.server.ts`)

- 10 jurisdictions: FR, UK, BE, NL, LU, AT, DK, DE, IT, NO
- Favorability scoring with weighted factors
- Multi-jurisdiction comparison matrices
- EU Space Act cross-references (47 mappings)

## Database Models (Key Ones)

```
User, Account, Session, VerificationToken     — Auth (NextAuth)
Organization, OrganizationMember, Invitation  — Multi-tenancy
Spacecraft                                     — Spacecraft registry
AuthorizationWorkflow                          — Authorization processes
CybersecurityAssessment, DebrisAssessment     — Module assessments
EnvironmentalAssessment, InsuranceAssessment
NIS2Assessment, SpaceLawAssessment
Document, DocumentTemplate, DocumentLink       — Document vault
SupervisionConfig, SupervisionReport          — Supervision
IncidentReport, NCASubmission                 — Incident tracking
Deadline, MissionPhase                        — Timeline
Notification, NotificationPreference          — Notifications
AuditLog, SecurityAuditLog                    — Audit trail
ApiKey, Webhook, WebhookDelivery              — API v1
Subscription, SubscriptionUsage, Invoice      — Billing (Stripe)
ScheduledReport, ReportArchive                — Automated reports
SupplierDataRequest                           — Supplier portal
SSODomain                                      — Enterprise SSO
Comment                                        — Collaboration
```

## Environment Variables

### Required

| Variable          | Purpose                            |
| ----------------- | ---------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection (Neon)       |
| `AUTH_SECRET`     | NextAuth JWT signing (32+ chars)   |
| `AUTH_URL`        | Application URL for auth callbacks |
| `ENCRYPTION_KEY`  | AES-256-GCM encryption key         |
| `ENCRYPTION_SALT` | Scrypt key derivation salt         |

### Recommended (Production)

| Variable                   | Purpose                          |
| -------------------------- | -------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Rate limiting (required in prod) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting token              |
| `SENTRY_DSN`               | Error monitoring                 |
| `CRON_SECRET`              | Cron job authentication          |
| `STRIPE_SECRET_KEY`        | Payment processing               |
| `STRIPE_WEBHOOK_SECRET`    | Webhook signature verification   |
| `RESEND_API_KEY`           | Email sending                    |

### Optional

| Variable                                                                       | Purpose             |
| ------------------------------------------------------------------------------ | ------------------- |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`                                        | Google OAuth        |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`                          | SMTP email fallback |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | File storage        |
| `LOGSNAG_TOKEN`                                                                | Event tracking      |

## Commands

```bash
npm run dev           # Development server
npm run build         # Production build (prisma generate + next build)
npm run start         # Start production server
npm run lint          # ESLint check
npm run typecheck     # TypeScript type check (tsc --noEmit)
npm run test          # Run Vitest (unit + integration)
npm run test:run      # Run tests once (no watch)
npm run test:coverage # Run tests with coverage report
npm run test:e2e      # Run Playwright E2E tests
npm run test:all      # Run all tests (Vitest + Playwright)
npm run db:push       # Push Prisma schema to database
npm run db:generate   # Generate Prisma client
npm run db:studio     # Open Prisma Studio
```

## Code Conventions

- **Server-only files:** `*.server.ts` — Never bundled to client. Import `server-only` package.
- **Input validation:** Centralized Zod schemas in `src/lib/validations.ts`
- **Rate limiting:** `src/lib/ratelimit.ts` — Upstash Redis with 7 tiers (api, auth, registration, assessment, export, sensitive, supplier)
- **Encryption:** `src/lib/encryption.ts` — AES-256-GCM for VAT numbers, bank accounts, tax IDs, policy numbers
- **Auth helpers:** `src/lib/auth.ts` (NextAuth config) + `src/lib/api-auth.ts` (API key auth)
- **Audit logging:** `src/lib/audit.ts` — Full trail with IP, user-agent, entity changes
- **Error handling:** `getSafeErrorMessage()` for generic production errors, detailed in dev
- **Permissions:** `src/lib/permissions.ts` — RBAC system (OWNER, ADMIN, MANAGER, MEMBER, VIEWER)

## Security

- **CSRF:** Origin header validation in middleware + CSRF tokens on state-changing requests
- **Rate limiting:** Upstash Redis sliding window (7 tiers, IP-based + user-based)
- **Brute force:** 5 login attempts per 15 minutes, event logging
- **Bot detection:** User-Agent blocking + timing validation on assessment endpoints
- **Headers:** CSP, HSTS (2yr preload), X-Frame-Options DENY, Permissions-Policy
- **Encryption:** AES-256-GCM with scrypt key derivation for sensitive DB fields
- **Password hashing:** Bcrypt with 12 rounds
- **Source maps:** Disabled in production (`hideSourceMaps: true`)
- **Secrets:** All externalized to env vars, zero hardcoded
- **CI security:** GitHub Actions — CodeQL, TruffleHog secret scanning, OWASP dependency checks
- **Pre-commit:** Husky + lint-staged (ESLint + TypeScript check)

## Design System

### Visual Direction

Dark, premium, space-tech. Linear.app meets Bloomberg Terminal aesthetics.

### Colors

```
--navy-950: #0A0F1E       (page background)
--navy-900: #0F172A       (card backgrounds)
--navy-800: #1E293B       (elevated surfaces)
--navy-700: #334155       (borders, muted elements)
--slate-400: #94A3B8      (secondary text)
--slate-200: #E2E8F0      (primary text)
--white: #F8FAFC          (headings, emphasis)
--blue-500: #3B82F6       (primary accent, CTAs)
--green-500: #22C55E      (compliant, positive)
--amber-500: #F59E0B      (warnings, conditional)
--red-500: #EF4444        (mandatory, critical)
```

### Component Patterns

- Cards: `bg-navy-800 border border-navy-700 rounded-xl`
- Glass effect: `bg-white/5 backdrop-blur-sm border border-white/10`
- Buttons: `bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3`
- Transitions: Framer Motion for wizard steps, `transition-all duration-200` for hovers

## Cron Jobs (Vercel)

- `/api/cron/deadline-reminders` — Daily at 8:00 AM UTC
- `/api/cron/document-expiry` — Daily at 9:00 AM UTC
- `/api/cron/generate-scheduled-reports` — Weekly Monday at 6:00 AM UTC

## Deployment

- **Platform:** Vercel (auto-deploy on push)
- **Database:** Neon PostgreSQL (serverless)
- **Node.js:** >= 18.0.0 required
- **Build:** `prisma generate && next build`
