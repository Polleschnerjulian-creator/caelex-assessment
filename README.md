# Caelex

Full-stack space regulatory compliance SaaS platform for satellite operators, launch providers, and space service companies.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![License](https://img.shields.io/badge/License-Proprietary-red)

## What is Caelex

Caelex is a comprehensive regulatory compliance platform that helps space companies navigate the EU Space Act (COM(2025) 335), NIS2 Directive (EU 2022/2555), and national space laws across 10 European jurisdictions. The platform provides automated compliance assessments, real-time regulatory tracking, document management, and AI-powered compliance assistance through the ASTRA assistant.

## Features

- **3 Compliance Assessment Modules**
  - EU Space Act assessment (8 questions, 119 articles, 7 operator types)
  - NIS2 Directive assessment (space-scoped, essential/important classification)
  - National Space Laws assessment (10 jurisdictions with favorability scoring)

- **8 Compliance Dashboard Modules**
  - Authorization workflow management
  - Registration tracking
  - Cybersecurity compliance (NIS2 Art. 21)
  - Debris mitigation (UN guidelines + national reqs)
  - Environmental compliance
  - Insurance requirements
  - NIS2 incident reporting
  - Supervision & reporting

- **Enterprise SaaS Infrastructure**
  - Multi-tenant organizations with RBAC (5 permission levels)
  - Stripe billing integration (3 subscription tiers)
  - Document vault with versioning & expiry tracking
  - Audit trail with IP/user-agent logging
  - RESTful API v1 with API key authentication
  - Embeddable compliance widget (5KB gzipped)
  - ASTRA AI assistant (context-aware compliance Q&A)

- **Security & Compliance**
  - AES-256-GCM encryption for sensitive data
  - Upstash Redis rate limiting (7 tiers)
  - CSRF protection, HSTS, CSP headers
  - Brute force detection (5 attempts per 15 min)
  - NextAuth v5 (credentials + Google OAuth + SSO SAML/OIDC)

## Tech Stack

| Layer              | Technologies                                                        |
| ------------------ | ------------------------------------------------------------------- |
| **Framework**      | Next.js 15 (App Router), TypeScript (strict mode)                   |
| **Database**       | PostgreSQL (Neon Serverless), Prisma 5.22 (50+ models, 108 indices) |
| **Authentication** | NextAuth v5 (credentials, Google OAuth, SAML/OIDC)                  |
| **Payments**       | Stripe (checkout, portal, webhooks)                                 |
| **Storage**        | Cloudflare R2 / S3-compatible (AWS SDK)                             |
| **Rate Limiting**  | Upstash Redis (sliding window)                                      |
| **Email**          | Resend (primary), Nodemailer SMTP (fallback)                        |
| **PDF Generation** | @react-pdf/renderer                                                 |
| **3D Graphics**    | Three.js (@react-three/fiber)                                       |
| **UI**             | Tailwind CSS, Framer Motion, Lucide React                           |
| **Validation**     | Zod                                                                 |
| **Testing**        | Vitest (unit/integration), Playwright (E2E), MSW (API mocking)      |
| **CI/CD**          | GitHub Actions, Husky, Vercel auto-deploy                           |
| **Monitoring**     | Sentry, LogSnag, Vercel Analytics                                   |

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database (Neon recommended)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/caelex-assessment.git
cd caelex-assessment
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the following required variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="your-32-char-secret"
AUTH_URL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="your-encryption-key"
ENCRYPTION_SALT="your-encryption-salt"
```

See `CLAUDE.md` for the full list of optional environment variables (Stripe, Redis, Sentry, etc.).

4. Set up the database:

```bash
npm run db:push
npm run db:generate
```

5. (Optional) Seed admin user:

```bash
npx tsx prisma/seed-admin.ts
```

6. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Scripts

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start development server                      |
| `npm run build`         | Production build (includes Prisma generation) |
| `npm run start`         | Start production server                       |
| `npm run lint`          | Run ESLint                                    |
| `npm run typecheck`     | Run TypeScript type checking                  |
| `npm run test`          | Run Vitest tests (watch mode)                 |
| `npm run test:run`      | Run tests once (no watch)                     |
| `npm run test:coverage` | Run tests with coverage report                |
| `npm run test:e2e`      | Run Playwright E2E tests                      |
| `npm run test:all`      | Run all tests (Vitest + Playwright)           |
| `npm run db:push`       | Push Prisma schema to database                |
| `npm run db:generate`   | Generate Prisma client                        |
| `npm run db:studio`     | Open Prisma Studio                            |
| `npm run build:widget`  | Build embeddable compliance widget            |

## Architecture

```
src/
├── app/                   # Next.js 15 App Router (44 pages + 138 API routes)
│   ├── (root)            # Landing page
│   ├── assessment/       # 3 assessment wizards (EU Space Act, NIS2, Space Law)
│   ├── dashboard/        # Authenticated dashboard (8 modules + admin)
│   ├── api/              # API routes (32 domains)
│   ├── resources/        # Public resources (FAQ, glossary, timeline)
│   └── legal/            # Legal pages (impressum, privacy, terms)
├── components/            # 130+ React components
│   ├── assessment/       # Wizard UI (AssessmentWizard, QuestionStep)
│   ├── results/          # Results dashboard (ComplianceProfile, ModuleCards)
│   ├── dashboard/        # Dashboard layout (Sidebar, TopBar)
│   ├── astra/            # ASTRA AI assistant (13 components)
│   ├── landing/          # Landing page sections (Hero, 3D scene)
│   └── ui/               # Shared UI primitives (Button, Card, Input)
├── data/                  # 20 regulatory data files
│   ├── articles.ts       # EU Space Act (119 articles)
│   ├── nis2-requirements.ts  # NIS2 requirements (51 entries)
│   └── national-space-laws.ts  # 10 jurisdictions
├── lib/                   # Business logic & services
│   ├── engine.server.ts  # EU Space Act compliance engine
│   ├── nis2-engine.server.ts  # NIS2 compliance engine
│   ├── space-law-engine.server.ts  # National space law engine
│   ├── services/         # 24 service files (notification, subscription, audit)
│   ├── email/            # Email templates (Resend + SMTP)
│   ├── pdf/              # PDF report generation (6 report types)
│   ├── stripe/           # Stripe integration
│   ├── storage/          # R2/S3 file storage
│   ├── astra/            # ASTRA AI engine & context
│   └── workflow/         # Authorization workflow state machine
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type declarations
└── widget/                # Embeddable compliance widget (vanilla TS)

prisma/
├── schema.prisma          # Database schema (2,424 lines, 50+ models)
└── seed-admin.ts          # Admin user seeding

tests/
├── unit/                  # 37 unit test files
├── integration/           # 25 integration test files
├── e2e/                   # 6 E2E test files
├── fixtures/              # Test fixtures
└── mocks/                 # MSW handlers
```

## Testing

### Unit & Integration Tests (Vitest)

```bash
npm run test              # Watch mode
npm run test:run          # Run once
npm run test:coverage     # With coverage report
```

### E2E Tests (Playwright)

```bash
npm run test:e2e          # Run all E2E tests
```

### Run All Tests

```bash
npm run test:all          # Vitest + Playwright
```

Tests cover:

- Compliance engines (EU Space Act, NIS2, Space Law)
- API routes (authentication, authorization, assessment)
- UI components (wizards, dashboard modules)
- Integration flows (registration, assessment, billing)

## Deployment

### Vercel (Recommended)

The application is configured for automatic deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Vercel will automatically deploy on every push to `main`

### Required Environment Variables (Production)

- `DATABASE_URL` - PostgreSQL connection string (Neon recommended)
- `AUTH_SECRET` - 32+ character secret for NextAuth JWT signing
- `AUTH_URL` - Full application URL (e.g., `https://app.caelex.io`)
- `ENCRYPTION_KEY` - AES-256-GCM encryption key
- `ENCRYPTION_SALT` - Scrypt key derivation salt
- `UPSTASH_REDIS_REST_URL` - Required for rate limiting in production
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - Resend email API key
- `SENTRY_DSN` - Sentry error tracking DSN
- `CRON_SECRET` - Secret for authenticating cron jobs

See `CLAUDE.md` for the complete list of optional environment variables.

### Build Process

```bash
npm run build
```

This runs:

1. `prisma generate` - Generate Prisma client
2. `next build` - Build Next.js application

Vercel automatically runs this command during deployment.

## Security

Caelex implements enterprise-grade security measures:

- **Authentication**: NextAuth v5 with credentials, Google OAuth, and enterprise SSO (SAML/OIDC)
- **Authorization**: Role-based access control (OWNER, ADMIN, MANAGER, MEMBER, VIEWER)
- **Encryption**: AES-256-GCM encryption for sensitive database fields (VAT numbers, bank accounts, policy numbers)
- **Rate Limiting**: Upstash Redis sliding window rate limiting (7 tiers: api, auth, registration, assessment, export, sensitive, supplier)
- **CSRF Protection**: Origin header validation + CSRF tokens on state-changing requests
- **Brute Force Protection**: 5 login attempts per 15 minutes with event logging
- **Security Headers**: CSP, HSTS (2-year preload), X-Frame-Options DENY, Permissions-Policy
- **Password Hashing**: Bcrypt with 12 rounds
- **Audit Trail**: Full activity logging with IP addresses and user agents
- **CI Security**: CodeQL analysis, TruffleHog secret scanning, OWASP dependency checks
- **Pre-commit Hooks**: Husky + lint-staged (ESLint + TypeScript checks)

## API Documentation

REST API v1 is available at `/docs/api` (Swagger UI) when running the application.

Key endpoints:

- `/api/v1/compliance/assess` - EU Space Act assessment
- `/api/v1/compliance/nis2/assess` - NIS2 assessment
- `/api/v1/compliance/space-law/assess` - National space law assessment
- `/api/v1/compliance/score` - Compliance score calculation
- `/api/v1/compliance/modules` - Module requirements
- `/api/v1/compliance/articles` - Article details

Public API (unauthenticated):

- `/api/public/quick-check` - Quick compliance check
- `/api/public/nis2/quick-classify` - NIS2 classification
- `/api/public/widget/track` - Widget analytics

## License

Copyright (c) 2026 Caelex. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.
