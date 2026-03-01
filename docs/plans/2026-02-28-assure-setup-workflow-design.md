# Caelex Assure — Setup Workflow Design

**Date:** 2026-02-28
**Status:** Approved
**Goal:** World-class, gated onboarding — users must contact Caelex before getting full access.

---

## Flow Overview

```
Phase 1: DISCOVER       Phase 2: EXPERIENCE        Phase 3: CONNECT          Phase 4: ONBOARD
/assure Landing  →   Interactive Demo Tour  →   Book Call + Qualify  →   Hybrid Setup Wizard
(public)              (public, guided)           (Calendly + form)        (post-call, authed)
```

---

## Phase 1: Landing Page Update (`/assure`)

Existing page. Changes:

- Primary CTA: **"Experience Assure"** → leads to `/assure/demo`
- Remove or deprioritize current "Request Access" flow
- Secondary CTA: "Book a Call" for users who already know the product

---

## Phase 2: Interactive Demo Tour (`/assure/demo`)

New page. Public, no authentication required.

### Structure

5 chapters, each showing a real feature of Assure:

| Chapter | Feature            | Key Message                                                         |
| ------- | ------------------ | ------------------------------------------------------------------- |
| 1       | IRS Dashboard      | "Your investment readiness at a glance — one score investors trust" |
| 2       | RCR Rating         | "A credit-rating-style grade for regulatory maturity"               |
| 3       | Data Room          | "Investor-grade due diligence, always audit-ready"                  |
| 4       | Risk Heatmap       | "Quantified risk visibility that de-risks your fundraise"           |
| 5       | Comply Integration | "Your regulatory data becomes your competitive advantage"           |

### Per-Chapter Layout

- Fullscreen illustration/screenshot of the real Assure UI
- Animated highlight dots on key features (Framer Motion)
- Explanatory text in ASTRA voice style
- Progress bar at bottom
- Navigation: Back / Next / Skip to Call

### Finale

- "Ready to get YOUR scores?" screen
- CTA: **"Book Your Onboarding Call"** → `/assure/book`
- Secondary: "Have questions? Contact us"

### Technical

- Custom React components + Framer Motion animations
- Static screenshots/illustrations of real UI (no live data)
- No account or auth required
- Track demo tour completion in analytics (`POST /api/analytics/track`)

---

## Phase 3: Call Booking (`/assure/book`)

New page. Public.

### Layout

Split view:

- **Left:** Qualify form
- **Right:** Calendly embed (or own scheduler later)

### Qualify Form Fields

| Field               | Type                                         | Required   |
| ------------------- | -------------------------------------------- | ---------- |
| Full Name           | text                                         | yes        |
| Work Email          | email                                        | yes        |
| Company Name        | text                                         | yes        |
| Company Website     | url                                          | no         |
| Operator Type       | select (SCO, LO, LSO, ISOS, CAP, PDP, TCO)   | yes        |
| Funding Stage       | select (Pre-Seed, Seed, Series A, Series B+) | yes        |
| Currently Raising?  | toggle                                       | yes        |
| Target Raise Amount | currency input                               | if raising |
| Message (optional)  | textarea                                     | no         |

### Backend

- `POST /api/assure/book` → creates/updates `DemoRequest` with `source: "assure-demo"`
- Stores qualify data for pre-fill in Phase 4
- Sends confirmation email to user
- Sends admin notification to `cs@caelex.eu`
- Redirects to Calendly or shows confirmation + calendar link

### Data Model Extension

Extend `DemoRequest` with:

- `operatorType: String?`
- `fundingStage: String?`
- `isRaising: Boolean?`
- `targetRaise: Float?`
- `companyWebsite: String?`
- `demoTourCompleted: Boolean` (default false)

---

## Phase 4: Setup Wizard (`/assure/onboarding`) — The Core

Replaces the existing 3-step wizard. Authentication required. Magic link or invite from admin after call.

### Layout

Three-column layout:

- **Left (narrow):** Step sidebar with progress
- **Center (wide):** Form content
- **Right (medium):** ASTRA Co-Pilot panel + Live IRS Score widget

### 6 Steps

#### Step 1: Company Identity

- Company Name (pre-filled from DemoRequest)
- Logo upload
- Founded year
- Headquarters / Jurisdiction (pre-filled)
- Company stage (pre-filled)
- One-liner pitch
- **ASTRA:** "Welcome {Company}! Let's build your investor profile. I'll guide you through each section."
- **Score:** Base score appears (e.g., 12/100)

#### Step 2: Market & Technology

- TAM / SAM / SOM (currency inputs)
- Technology Readiness Level (TRL 1-9 slider)
- Key technology / IP description
- Patents (count + status)
- Product stage (concept → revenue)
- **ASTRA:** Contextual tips on market sizing, TRL benchmarks, IP valuation signals
- **Score:** Market + Tech bars animate up

#### Step 3: Team & Leadership

- Founders (name, role, LinkedIn, years of experience, space background toggle)
- Key hires count
- Advisory board members
- Board composition
- **ASTRA:** "A CTO with space-sector background boosts your team score by +8. Investors look for domain expertise."
- **Score:** Team bar fills

#### Step 4: Financials

- Revenue model (SaaS, Usage, License, etc.)
- Current MRR / ARR
- Monthly burn rate
- Runway (months)
- Previous funding raised
- **ASTRA:** "18 months runway is the sweet spot for Series A. You're at 14 — consider this in your raise target."
- **Score:** Financial bar grows

#### Step 5: Comply Integration

- Auto-detect: check if user's organization has Comply data
- If yes: show summary of assessments, module statuses, article coverage
- If no: option to run quick assessment or skip
- Link Comply account if separate
- **ASTRA:** "I found 3 completed assessments — that gives you a Regulatory Bonus of +12 on your RRS!"
- **Score:** RRS auto-calculated, feeds into IRS

#### Step 6: Fundraising & Goals

- Currently raising (pre-filled)
- Round type (Pre-Seed, Seed, Series A, etc.)
- Target raise amount (pre-filled)
- Use of funds allocation (sliders: Product, Hiring, Sales, Operations)
- Timeline to close
- Target investors (VCs, Angels, Grants, Corporate)
- **ASTRA:** "Based on your profile, you're positioned for a strong Series A. Your regulatory readiness is a key differentiator."
- **Score:** Final adjustments

### Score Reveal Finale (after Step 6)

Dedicated fullscreen page/overlay:

1. Score counts up from 0 to final value (animated counter, ~3 seconds)
2. Gauge/ring fills with emerald gradient
3. Particle/confetti effect on completion (if score > 60)
4. Peer comparison: "Top X% of European space startups"
5. RCR letter grade reveal with card-flip animation
6. 3 key insights from ASTRA (strongest area, biggest opportunity, next action)
7. CTA: **"Enter Your Dashboard"** → `/assure/dashboard`

### ASTRA Co-Pilot Behavior

NOT using the live Anthropic API. Instead:

- Deterministic, pre-written messages per step
- Context-aware: messages reference the user's actual input values
- Template system: `{companyName}`, `{tam}`, `{runway}` placeholders filled at render
- Typing animation (fake delay) for natural feel
- Expandable tips: short message visible, "Learn more" expands to detailed explanation
- File: `src/lib/assure/onboarding-astra-messages.ts`

### Live IRS Score Widget

Client-side lightweight calculation that mirrors the server engine logic:

- Recalculates on every field change (debounced 300ms)
- Shows: total score, per-component bars, delta indicator (+N from last change)
- Animated transitions (Framer Motion spring physics)
- Grayed-out bars for incomplete steps
- File: `src/lib/assure/irs-preview-calculator.ts`
- Server-side engine validates and persists the final score on wizard completion

### Pre-Fill Logic

On wizard mount:

1. Check `DemoRequest` for user's email → pre-fill company basics, operator type, funding stage
2. Check `Organization` for existing Comply data → auto-populate Step 5
3. Check `AssureCompanyProfile` for any existing data → resume where left off

### Persistence

- Save progress after each step completion (`PATCH /api/assure/onboarding/progress`)
- User can leave and resume at any time
- Server-side progress tracking (not localStorage)
- New field on `AssureCompanyProfile`: `onboardingStep: Int` (0-6, 0 = not started, 7 = complete)

---

## Architecture Decisions

| Decision             | Choice                         | Rationale                                        |
| -------------------- | ------------------------------ | ------------------------------------------------ |
| Demo Tour engine     | Custom React + Framer Motion   | Matches existing stack, full animation control   |
| ASTRA in wizard      | Deterministic templates        | Zero-cost, instant, controlled messaging         |
| Live Score           | Client-side preview calculator | Instant feedback; server validates on completion |
| Call scheduling      | Calendly embed (Phase 1)       | Fast to integrate, own scheduler later if needed |
| Pre-fill source      | Extended DemoRequest model     | Already exists, minimal schema change            |
| Progress persistence | Server-side (Prisma)           | Reliable, survives device switches               |

---

## Files to Create/Modify

### New Files

- `src/app/assure/demo/page.tsx` — Demo tour page
- `src/components/assure/demo/DemoTour.tsx` — Tour orchestrator
- `src/components/assure/demo/DemoChapter.tsx` — Per-chapter layout
- `src/components/assure/demo/DemoProgress.tsx` — Progress bar
- `src/app/assure/book/page.tsx` — Call booking page
- `src/components/assure/book/QualifyForm.tsx` — Qualify form
- `src/components/assure/book/CalendlyEmbed.tsx` — Calendly integration
- `src/app/api/assure/book/route.ts` — Booking API
- `src/components/assure/onboarding/SetupWizard.tsx` — Main wizard orchestrator
- `src/components/assure/onboarding/steps/CompanyIdentityStep.tsx`
- `src/components/assure/onboarding/steps/MarketTechStep.tsx`
- `src/components/assure/onboarding/steps/TeamStep.tsx`
- `src/components/assure/onboarding/steps/FinancialsStep.tsx`
- `src/components/assure/onboarding/steps/ComplyIntegrationStep.tsx`
- `src/components/assure/onboarding/steps/FundraisingStep.tsx`
- `src/components/assure/onboarding/ScoreReveal.tsx` — Finale animation
- `src/components/assure/onboarding/AstraCoPilot.tsx` — ASTRA panel for wizard
- `src/components/assure/onboarding/LiveScoreWidget.tsx` — Real-time score display
- `src/lib/assure/onboarding-astra-messages.ts` — Deterministic ASTRA messages
- `src/lib/assure/irs-preview-calculator.ts` — Client-side score preview
- `src/app/api/assure/onboarding/progress/route.ts` — Save/load wizard progress

### Modified Files

- `prisma/schema.prisma` — Extend DemoRequest + AssureCompanyProfile
- `src/app/assure/page.tsx` — Update CTAs
- `src/app/assure/onboarding/page.tsx` — Replace 3-step with 6-step wizard
- `src/middleware.ts` — Add `/assure/demo` and `/assure/book` to public routes
- `src/data/i18n/*.json` — New translation keys

---

## Success Criteria

1. A visitor can complete the full demo tour without an account
2. The demo tour drives visitors to book a call (track conversion rate)
3. Pre-fill data from the call flows seamlessly into the wizard
4. The setup wizard shows a live IRS score that updates on every input
5. ASTRA provides contextual, helpful guidance at each step
6. The Score Reveal finale creates a memorable "wow" moment
7. Wizard progress persists server-side across sessions
8. The entire flow works on mobile (responsive)
