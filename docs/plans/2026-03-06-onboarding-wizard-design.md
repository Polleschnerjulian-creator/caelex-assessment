# Onboarding Wizard — Design Document

**Date:** 2026-03-06
**Status:** Approved

## Overview

Guided 3-step onboarding wizard at `/onboarding` that collects profile, organization, and operator type data before redirecting to the Unified Compliance Assessment. Light theme, standalone full-page layout, DB-persisted progress.

## User Flow

```
Signup → POST /api/auth/signup → redirect /dashboard
  → Middleware detects !onboardingCompleted → redirect /onboarding
    → Step 1: Profile (name, job title)
    → Step 2: Organization (name, country, operator type)
    → Step 3: Summary + CTA
      → "Start Assessment" → /assessment/unified
      → "Skip to Dashboard" → /dashboard
```

## Steps

### Step 1 — Profile

- Headline: "Welcome, [First Name]"
- Fields: Full Name (pre-filled), Job Title (optional), Phone (optional)
- Saves via: PATCH /api/user/profile

### Step 2 — Organization

- Headline: "Tell us about your organization"
- Fields: Organization Name (pre-filled), Country (dropdown: DE, FR, UK, BE, NL, LU, AT, DK, IT, NO, Other), Operator Type (7 cards: SCO, LO, LSO, ISOS, CAP, PDP, TCO with descriptions)
- Saves via: PATCH /api/onboarding/organization

### Step 3 — Confirmation

- Headline: "Ready to assess your compliance"
- Shows summary of collected data
- Primary CTA: "Start Compliance Assessment" → /assessment/unified
- Secondary: "Skip to Dashboard" → /dashboard
- Saves via: PATCH /api/onboarding/complete (sets onboardingCompleted = true)

## Design

- Light theme: white background, clean cards
- Emerald accent for CTAs
- Horizontal step indicator at top
- Standalone page — no sidebar, no nav, no footer
- Framer Motion transitions between steps

## DB Changes

```prisma
// On User model
onboardingCompleted  Boolean  @default(false)
```

## Files to Create/Modify

| File                                           | Action                                  |
| ---------------------------------------------- | --------------------------------------- |
| `prisma/schema.prisma`                         | Add `onboardingCompleted` field to User |
| `src/middleware.ts`                            | Add onboarding redirect logic           |
| `src/app/onboarding/page.tsx`                  | Server component with metadata          |
| `src/app/onboarding/OnboardingWizard.tsx`      | Client component — 3-step wizard        |
| `src/app/api/onboarding/organization/route.ts` | PATCH: save org + operator type         |
| `src/app/api/onboarding/complete/route.ts`     | PATCH: set onboardingCompleted = true   |
| `src/components/layout/PublicLayout.tsx`       | Add /onboarding to EXCLUDED_ROUTES      |
| `src/app/dashboard/layout.tsx`                 | Remove OnboardingOverlay usage          |

## Operator Types (for Step 2 cards)

| Code | Label                     | Description                              |
| ---- | ------------------------- | ---------------------------------------- |
| SCO  | Satellite Operator        | Operates satellites in orbit             |
| LO   | Launch Operator           | Provides launch services                 |
| LSO  | Launch Site Operator      | Operates launch facilities               |
| ISOS | In-orbit Service Operator | Provides in-orbit servicing              |
| CAP  | Capsule Operator          | Operates re-entry vehicles               |
| PDP  | Personal Data Processor   | Processes space-derived personal data    |
| TCO  | Telecom Operator          | Operates satellite communication systems |
