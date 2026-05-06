# Comply Onboarding Wizard — Concept & Build Plan

> **Status:** Concept — sign-off requested before Sprint A starts.
> **Author:** Claude + Julian
> **Date:** 2026-05-06
> **Persistent doc** — survives compaction.

---

## 1. The problem

A real customer scenario that prompted this:

> "Ich bin jetzt ein Unternehmen das 2 Satelliten ins All schickt.
> Ich nutze jetzt das erste Mal Comply. Was mache ich dann?"

The honest answer today: **the UI doesn't tell them.** A new user
lands on `/dashboard/today`, sees three equally-weighted CTAs
(Connect Sentinel / Run Assessment / Browse Modules), and has no
clue which to do first or how the pieces connect.

There IS an existing `/onboarding` wizard with 3 steps:

1. **Profile** — name + job title
2. **Organization** — name + country + operator type
3. **Ready** — summary card + CTA "Start Assessment" or "Skip"

But it has three problems:

1. **No spacecraft step.** The user explicitly mentions "2 satellites"
   — those need to live in the system before any compliance
   modeling is meaningful. Today they have to go to
   `/dashboard/modules/registration` separately and figure it out.
2. **The "Start Assessment" CTA leads to `/assessment/unified` but
   then dumps them out into a void.** There's no flow that says
   "assessment is done → here are your N applicable items → here's
   your Today inbox populated with them".
3. **The wizard UI is light-mode-only**, doesn't match the new
   Apple-HIG dark chrome the rest of the app now uses, and
   doesn't slot into the dashboard layout.

---

## 2. The target user journey

For a new satellite operator with 2 sats, Day 1 should look like:

```
SIGNUP → EMAIL VERIFY → LOGIN
   ↓
WIZARD STEP 1: Profile
   Name + role + (optional) which team they're on
   ↓
WIZARD STEP 2: Organization
   Company + jurisdiction(s) + operator type
   ↓
WIZARD STEP 3: Spacecraft   ← NEW
   "How many spacecraft?" → loop:
     - Name (e.g. "Bluebird-1")
     - Mission type (LEO comms / SAR / observation / etc.)
     - Launch status (already in orbit / pre-launch / planned)
     - If in orbit: optional NORAD-ID for CelesTrak auto-import
     - If pre-launch: target launch date
   "Or skip — I'll add later"
   ↓
WIZARD STEP 4: Applicability assessment   ← NEW (enhanced)
   ~10-15 questions, dynamically pruned based on Step 2+3
   answers. Yes/no questions like:
     - Do you offer services to EU customers?
     - Do you operate critical infrastructure?
     - Are any spacecraft in GEO?
     - Do you handle US-controlled components (ITAR)?
     - etc.
   ↓
SUBMIT
   ↓
SERVER: auto-generate ComplianceItems
   For each applicable regulation × each spacecraft:
     create ComplianceItem with status = PENDING or
     EVIDENCE_REQUIRED
   ↓
WIZARD STEP 5: Done — preview the populated Today
   "We've created N compliance items across M regulations.
    Here's what's urgent."
   - Big primary CTA: "Open Today inbox"
   - Secondary: "Show me a guided tour" (optional Phase 2)
```

After this flow the user lands on `/dashboard/today` with **real
items already populated** — not the empty-state OnboardingHero.
The Today inbox now actually means something.

---

## 3. Trigger logic — when does the wizard fire?

Today the dashboard layout has:

```ts
useEffect(() => {
  fetch("/api/onboarding/status")
    .then((r) => r.json())
    .then((data) => {
      if (data.onboardingCompleted === false) {
        router.replace("/onboarding");
      }
    });
}, [status]);
```

That gate already works. We just need to make sure
`onboardingCompleted` flips to `true` only when ALL 5 wizard
steps are done (not just steps 1-3 like today).

**Behavior per state:**

| User state                            | Effect                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| Brand new signup, never opened wizard | Wizard fires from Step 1                                        |
| Quit wizard mid-flow                  | Resume from where they left off (state read from DB)            |
| Skipped wizard via "Skip" button      | `onboardingCompleted = true`, never re-fires                    |
| Completed wizard fully                | `onboardingCompleted = true`, see populated Today               |
| Re-runs wizard manually via Settings  | Allowed; can update org info, add spacecraft, re-run assessment |

---

## 4. Three sprints to ship

### Sprint A — Wizard chrome + Spacecraft step

**Files:**

- `src/app/onboarding/OnboardingWizard.tsx` — restyle to Apple-HIG
  dark theme to match the rest of the app, expand from 3 → 5 steps
- `src/app/api/onboarding/spacecraft/route.ts` — NEW POST endpoint
  that creates spacecraft rows in DB
- `src/lib/onboarding/wizard-state.server.ts` — NEW: read/write
  partial wizard state to DB (so users can resume after closing)

**Visual changes to wizard:**

- Drop the white background + `bg-emerald-500` step indicators
- Use `comply-dark-canvas` background + Inter font + 28px SF-Display
  headlines + Apple-form-controls
- Step indicator: minimal dots row, no green ticks (Apple HIG)
- Back / Continue buttons: Apple-secondary / Apple-primary patterns

**Step-3 (Spacecraft) UX:**

```
"How many spacecraft will you operate?"
[ - ]  2  [ + ]      <- number stepper, default 1, max 12

[Continue]

Then for each spacecraft N:

  "Spacecraft 1 of 2"
  Name           [_________]
  Mission type   [Comms ▾]  (LEO comms / SAR / observation /
                              navigation / science / other)
  Status         ◯ Already in orbit
                 ◯ Pre-launch (≤ 6 months)
                 ◯ Planned (>6 months out)

  [If "Already in orbit"]:
    NORAD ID (optional)  [_______]   "Auto-import orbital data
                                       from CelesTrak"
  [If "Pre-launch"]:
    Target launch date   [date picker]

  [Back]   [Skip this one]   [Continue →]
```

After all N spacecraft entered → goes to Step 4.
"Skip — I'll add later" jumps directly to Step 4 with empty
spacecraft list.

---

### Sprint B — Embedded applicability assessment + auto-population

**Files:**

- `src/app/onboarding/OnboardingWizard.tsx` — add Step 4
  (assessment) inline rather than redirecting to `/assessment/unified`
- `src/lib/comply-v2/onboarding-assessment.server.ts` — NEW:
  evaluates assessment answers against operator profile + spacecraft
  list, returns the set of applicable regulations
- `src/lib/comply-v2/onboarding-populate.server.ts` — NEW:
  takes the applicability result + spacecraft list, generates
  ComplianceItems for every applicable {regulation × spacecraft ×
  requirement} triple

**Step-4 (Assessment) UX:**

```
"Tell us about your operation"
~10 questions, dynamically pruned. Each is yes/no/unsure.

  1. Do you offer space services or data to customers in the EU?
     ◯ Yes  ◯ No  ◯ Unsure

  2. Are you headquartered in the EU?
     ◯ Yes  ◯ No

  3. Will any of your spacecraft operate in geostationary orbit?
     ◯ Yes  ◯ No  ◯ Unsure

  4. Do you process personal data of EU citizens?
     ...etc

[Back]   [Continue →]
```

**Auto-population output:**

For a 2-sat LEO comms operator headquartered in DE:

```
Applicable regulations:
  - EU Space Act (2 satellites × 119 articles = ~50 actually scoped)
  - NIS2 Directive (1 set of org-wide controls)
  - Cybersecurity (2 sats × 30-ish controls)
  - Debris Mitigation (2 sats × 8 controls)
  - Spectrum/ITU (per-sat frequency filings)
  - Insurance (national policy)
  - Authorization (DE BNetzA authorization workflow)
  - National Space Law: Germany (none yet — DE has no Space Act)

Total ComplianceItems generated: ~150-200
Initial status distribution:
  - PENDING: 80%   (no evidence yet)
  - EVIDENCE_REQUIRED: 15% (Sentinel-auto-attestable)
  - NOT_APPLICABLE: 5% (negative-applicability flagged)
```

---

### Sprint C — Setup-progress badge + smart Today empty-state

**Files:**

- `src/components/dashboard/v2/V2Sidebar.tsx` — add a "Setup
  N/5" badge below the user footer when onboarding incomplete
  (e.g. user signed in but never finished the wizard)
- `src/app/dashboard/today/page.tsx` — make the OnboardingHero
  smarter:
  - If org missing → "Set up organization" primary CTA
  - If spacecraft missing → "Add spacecraft" primary CTA
  - If assessment never run → "Run applicability assessment"
    primary CTA
  - If assessment done but items still all PENDING →
    "Connect Sentinel" / "Upload first evidence" CTAs

**Setup-progress badge (sidebar footer, above account block):**

```
┌─ Setup ────────────────────┐
│  ●●●○○                     │
│  3 of 5 steps              │
│  [ Continue setup → ]      │
└────────────────────────────┘
```

Tapping it returns the user to the wizard at the next incomplete
step. Disappears entirely once `onboardingCompleted = true`.

**Smart Today empty-state (replaces current 3-CTA grid):**

```
Conditional logic in today/page.tsx render:

if (totalItems === 0 && noOrg)         → "Set up organization"
elif (totalItems === 0 && noSpacecraft) → "Add spacecraft"
elif (totalItems === 0 && !assessed)    → "Run applicability assessment"
elif (totalItems > 0 && allPending)     → "Start with the first item"
elif (totalItems > 0 && hasEvidenceReq) → today inbox renders normally
```

---

## 5. Schema additions

**New table: `OnboardingProgress`** (per User)

```prisma
model OnboardingProgress {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id])

  // Step completion flags
  profileCompleted    Boolean  @default(false)
  orgCompleted        Boolean  @default(false)
  spacecraftCompleted Boolean  @default(false)
  assessmentCompleted Boolean  @default(false)

  // Wizard resumability — current step the user was on
  currentStep         Int      @default(0)

  // Snapshot of assessment answers for re-runs
  assessmentAnswers   Json?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**New endpoints:**

- `GET /api/onboarding/wizard-state` — returns current
  OnboardingProgress for the user
- `POST /api/onboarding/wizard-step` — updates one step's data
  (profile / org / spacecraft / assessment) + advances `currentStep`
- `POST /api/onboarding/finalize` — after Step 4: triggers
  ComplianceItem auto-population, sets `onboardingCompleted = true`,
  returns summary { itemsCreated, regulationsApplicable }

---

## 6. Open questions — need decisions before Sprint A starts

1. **Assessment depth.** Quick 10-question version inside the wizard,
   OR full 15-question per regulation? Quick = better UX for Day 1.
   Full = more accurate auto-population but more friction.
   - **Recommendation:** Quick (10 questions, broad strokes), with
     "refine your assessment" links from each Module page later.

2. **Spacecraft cap in wizard.** Stepper cap at 12? Or unlimited
   with a warning above 5?
   - **Recommendation:** Cap at 12 in the wizard; users with bigger
     fleets can bulk-import via CSV from `/modules/registration` after
     onboarding.

3. **Skip behavior.** If user skips Step 3 (no spacecraft), should
   Step 4 still run?
   - **Recommendation:** Yes. Assessment determines org-level
     applicability (NIS2 essential/important is org-wide, not
     per-spacecraft). Spacecraft-level items just don't get generated
     yet.

4. **Re-running the wizard.** After completion, should there be a
   "Re-run setup" button somewhere?
   - **Recommendation:** Yes, in `/dashboard/settings/onboarding`.
     Re-running is destructive (replaces ComplianceItems based on
     new assessment) so it gets a confirmation step.

5. **Pre-fill from email domain?** If user signs up with
   `julian@spacex.com`, should we pre-fill org name "SpaceX"?
   - **Recommendation:** v2 nice-to-have; not Sprint A.

6. **Mobile flow.** Wizard works on mobile but is desktop-optimized.
   Is mobile a Day-1 requirement?
   - **Recommendation:** Desktop-first for v1. Mobile breakpoints in
     Sprint D follow-up.

---

## 7. Build sequence + estimated effort

| Sprint    | Scope                                                | Effort      |
| --------- | ---------------------------------------------------- | ----------- |
| **A**     | Wizard re-style + Step 3 (Spacecraft) + state-resume | 1-2 days    |
| **B**     | Step 4 (assessment inline) + auto-population engine  | 2 days      |
| **C**     | Setup-progress badge + smart Today empty-state       | 0.5 days    |
| **Total** |                                                      | **~4 days** |

Each sprint ships independently — Sprint A alone already
delivers value (a real spacecraft entry step). Sprints B and C
build on top.

---

## 8. Acceptance criteria — done means done

After all 3 sprints land, the following journey works end-to-end:

```
1. New user signs up → email verifies → first login
2. Auto-redirect to /onboarding (because onboardingCompleted=false)
3. Wizard fires Step 1 (Profile) — Apple-HIG dark theme
4. Continue → Step 2 (Org) → Step 3 (Spacecraft, 2 sats) →
   Step 4 (Assessment, 10 questions) → Step 5 (Done summary)
5. "Open Today" CTA → /dashboard/today now shows ~150 real
   ComplianceItems sorted by Urgent / This week / Watching
6. User can immediately start working — first card has a clear
   NextStep CTA, sidebar shows "Setup 5/5 ✓"
```

If any step takes more than 60 seconds, scope is wrong. If the
populated Today inbox is empty after wizard completion, the
auto-population engine has a bug.

---

## 9. Out of scope (intentionally deferred)

- Bulk-import of spacecraft via CSV (use existing
  `/modules/registration` after onboarding)
- Connecting Sentinel telemetry during onboarding (Day-7 task,
  not Day-1)
- Document vault upload during onboarding (lots of friction;
  defer to first-attestation moment)
- Stripe billing collection (free tier covers onboarding; trial
  flow is a separate concern)
- Team invitations / multi-user setup (Day-7+)
- Tutorial overlay / interactive tour (Phase 2)

These are real things to build, just not blocking the
"new operator can land in a populated Today" milestone.

---

**Bottom line:** ~4 days of focused work to close the biggest UX
gap in Comply right now — the Day-1 onboarding hole. Sprint A is
the highest-leverage piece (no more "I have spacecraft but the
app doesn't know about them" moment). Sprint B is what makes
everything downstream feel real. Sprint C adds the polish that
makes the user feel guided rather than abandoned.
