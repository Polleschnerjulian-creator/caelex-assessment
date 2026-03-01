# Assure Setup Workflow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a world-class, 4-phase gated setup workflow for Caelex Assure: Interactive Demo Tour → Call Booking → Hybrid Setup Wizard with live IRS score + ASTRA co-pilot.

**Architecture:** Public demo tour and call-booking pages feed qualify data into `DemoRequest`. After a sales call, admin grants access and pre-fills profile data. The user enters a 6-step wizard with a deterministic ASTRA co-pilot panel and a client-side IRS preview calculator that animates the score in real-time. A cinematic Score Reveal finale completes the flow.

**Tech Stack:** Next.js 15 (App Router), Framer Motion, Tailwind CSS (glass design system), Prisma (DemoRequest + AssureCompanyProfile extensions), Zod validation, CSRF via `csrfHeaders()`.

**Key patterns (from codebase analysis):**

- All Assure pages are `"use client"` components
- Public pages use `bg-black`, authenticated pages use `bg-navy-950`
- Glass system: `glass-surface`, `glass-elevated`, `glass-floating`
- Inputs: `bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20`
- Primary button: `bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg`
- Landing CTAs: `rounded-full shadow-[0_0_32px_rgba(16,185,129,0.3)]`
- API routes: rate limit → Zod safeParse → prisma → NextResponse.json
- CSRF: `csrfHeaders()` on all authenticated mutations, skip on public endpoints
- Animations: Framer Motion `AnimatePresence mode="wait"`, `useInView`

---

## Task 1: Extend Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma` (DemoRequest model ~line 4172, AssureCompanyProfile ~line 5039)

**Step 1: Add fields to DemoRequest**

Add these fields to the `DemoRequest` model:

```prisma
model DemoRequest {
  // ... existing fields ...

  // Assure qualify data (from /assure/book form)
  companyWebsite     String?
  operatorType       String?
  fundingStage       String?
  isRaising          Boolean?
  targetRaise        Float?
  demoTourCompleted  Boolean  @default(false)
}
```

Note: `operatorType` and `fundingStage` are already stored in the `role` field as a concatenated string. We now store them as dedicated fields for pre-fill.

**Step 2: Add onboardingStep to AssureCompanyProfile**

Add to `AssureCompanyProfile`:

```prisma
model AssureCompanyProfile {
  // ... existing fields ...

  onboardingStep     Int      @default(0)   // 0=not started, 1-6=in progress, 7=complete
}
```

**Step 3: Generate Prisma client**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx prisma generate`
Expected: "Generated Prisma Client"

**Step 4: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only pre-existing ones unrelated to our changes)

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(assure): extend DemoRequest and AssureCompanyProfile for new setup workflow"
```

---

## Task 2: Update Middleware — Add Public Routes

**Files:**

- Modify: `src/middleware.ts`

**Step 1: Find the `assurePublicPaths` array in middleware**

Look for:

```typescript
const assurePublicPaths = ["/assure", "/assure/onboarding"];
```

**Step 2: Add `/assure/demo` and `/assure/book` to public paths**

Change to:

```typescript
const assurePublicPaths = [
  "/assure",
  "/assure/onboarding",
  "/assure/demo",
  "/assure/book",
];
```

**Step 3: Also add `/assure/request-access` if not already public**

This was previously protected — it should be public since it's a landing-style page with `Navigation`/`Footer`.

**Step 4: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(assure): add /assure/demo and /assure/book as public routes"
```

---

## Task 3: Update Assure Layout — Exclude New Public Pages

**Files:**

- Modify: `src/app/assure/layout.tsx`

**Step 1: Find the `isUnlayouted` check**

Look for the condition that determines which paths skip the sidebar/topbar layout.

**Step 2: Add demo and book routes to unlayouted list**

Add `/assure/demo`, `/assure/book`, and `/assure/request-access` to the unlayouted paths:

```typescript
const isUnlayouted =
  pathname === "/assure" ||
  pathname === "/assure/onboarding" ||
  pathname === "/assure/demo" ||
  pathname === "/assure/book" ||
  pathname === "/assure/request-access" ||
  pathname.startsWith("/assure/view/") ||
  pathname.startsWith("/assure/dataroom/view/");
```

**Step 3: Commit**

```bash
git add src/app/assure/layout.tsx
git commit -m "feat(assure): exclude demo and book pages from sidebar layout"
```

---

## Task 4: Interactive Demo Tour — Page Shell + Chapter Data

**Files:**

- Create: `src/app/assure/demo/page.tsx`
- Create: `src/data/assure/demo-tour-chapters.ts`

**Step 1: Create demo tour chapter data**

File: `src/data/assure/demo-tour-chapters.ts`

```typescript
import {
  TrendingUp,
  BadgeCheck,
  FolderLock,
  ShieldAlert,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DemoChapter {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: LucideIcon;
  accentColor: string;
}

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: "irs-dashboard",
    title: "Investment Readiness Score",
    subtitle: "Your fundraise-readiness at a glance",
    description:
      "One score that synthesizes market opportunity, technology maturity, team strength, financials, regulatory position, and traction into a single investor-trusted metric. Updated in real-time as your company evolves.",
    highlights: [
      "6 weighted components scored 0–100",
      "Peer benchmarking against European space startups",
      "Actionable improvement roadmap",
    ],
    icon: TrendingUp,
    accentColor: "emerald",
  },
  {
    id: "rcr-rating",
    title: "Regulatory Credit Rating",
    subtitle: "A credit-rating for regulatory maturity",
    description:
      "AAA to D letter grades that investors instantly understand. Built on your real compliance data from Caelex Comply, with temporal decay, outlook signals, and peer percentile ranking.",
    highlights: [
      "Letter grades from AAA to D",
      "Outlook indicators (positive, stable, negative)",
      "Rating watch alerts for urgent action",
    ],
    icon: BadgeCheck,
    accentColor: "emerald",
  },
  {
    id: "data-room",
    title: "Investor Data Room",
    subtitle: "Due diligence, always audit-ready",
    description:
      "A structured, permission-controlled data room built for space industry due diligence. Track who viewed what, when, and for how long. Generate shareable links with granular access controls.",
    highlights: [
      "Standard DD folder structure pre-configured",
      "Viewer analytics and access logs",
      "One-click shareable links with expiry",
    ],
    icon: FolderLock,
    accentColor: "emerald",
  },
  {
    id: "risk-heatmap",
    title: "Risk Intelligence",
    subtitle: "Quantified risk that de-risks your fundraise",
    description:
      "A 5×5 risk heatmap with scenario analysis tailored to space operations. Auto-populated risk templates based on your operator type. Show investors you understand and manage your risk profile.",
    highlights: [
      "5×5 likelihood × impact heatmap",
      "Scenario analysis with financial projections",
      "Auto-populated templates per operator type",
    ],
    icon: ShieldAlert,
    accentColor: "emerald",
  },
  {
    id: "comply-integration",
    title: "Comply Integration",
    subtitle: "Regulatory data becomes competitive advantage",
    description:
      "Your compliance work in Caelex Comply automatically feeds into Assure. Assessment results, module statuses, and evidence coverage become your Regulatory Readiness Score — a unique advantage no competitor can replicate.",
    highlights: [
      "Automatic RRS calculation from Comply data",
      "+5 bonus on regulatory component for linked accounts",
      "47 EU Space Act cross-references mapped",
    ],
    icon: Layers,
    accentColor: "emerald",
  },
];
```

**Step 2: Create demo tour page shell**

File: `src/app/assure/demo/page.tsx`

```tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { DEMO_CHAPTERS } from "@/data/assure/demo-tour-chapters";

export default function AssureDemoTourPage() {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [direction, setDirection] = useState(1);
  const chapter = DEMO_CHAPTERS[currentChapter];
  const isLast = currentChapter === DEMO_CHAPTERS.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrentChapter((c) => c + 1);
    }
  }, [isLast]);

  const goBack = useCallback(() => {
    if (currentChapter > 0) {
      setDirection(-1);
      setCurrentChapter((c) => c - 1);
    }
  }, [currentChapter]);

  const Icon = chapter.icon;

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/[0.03] blur-[160px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-12">
            {DEMO_CHAPTERS.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => {
                  setDirection(i > currentChapter ? 1 : -1);
                  setCurrentChapter(i);
                }}
                className="flex-1 group"
              >
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i <= currentChapter
                      ? "bg-emerald-500"
                      : "bg-white/10 group-hover:bg-white/20"
                  }`}
                />
                <p
                  className={`text-micro mt-2 transition-colors ${
                    i === currentChapter
                      ? "text-emerald-400"
                      : "text-white/30 group-hover:text-white/50"
                  }`}
                >
                  {ch.title}
                </p>
              </button>
            ))}
          </div>

          {/* Chapter content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={chapter.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="grid lg:grid-cols-[1fr_1fr] gap-12 items-center min-h-[480px]">
                {/* Left: Text content */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-micro text-emerald-400 uppercase tracking-wider font-medium">
                      {chapter.subtitle}
                    </span>
                  </div>

                  <h2 className="text-display font-bold text-white mb-4">
                    {chapter.title}
                  </h2>

                  <p className="text-body-lg text-white/60 leading-relaxed mb-8">
                    {chapter.description}
                  </p>

                  <ul className="space-y-3">
                    {chapter.highlights.map((highlight, i) => (
                      <motion.li
                        key={highlight}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        <span className="text-body text-white/70">
                          {highlight}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Right: Feature illustration */}
                <div className="glass-elevated rounded-2xl border border-white/[0.08] p-8 min-h-[400px] flex items-center justify-center">
                  <DemoIllustration chapterId={chapter.id} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/[0.06]">
            <button
              onClick={goBack}
              disabled={currentChapter === 0}
              className="flex items-center gap-2 text-body text-white/40 hover:text-white/60 disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-caption text-white/30">
              {currentChapter + 1} of {DEMO_CHAPTERS.length}
            </span>

            {isLast ? (
              <Link
                href="/assure/book"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-body px-6 py-3 rounded-full shadow-[0_0_32px_rgba(16,185,129,0.3)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Get Your Scores
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* Placeholder illustration component — renders a stylized preview per chapter */
function DemoIllustration({ chapterId }: { chapterId: string }) {
  const illustrations: Record<string, React.ReactNode> = {
    "irs-dashboard": (
      <div className="w-full space-y-4">
        <div className="text-center mb-6">
          <div className="text-display-sm font-bold text-white">74</div>
          <div className="text-micro text-emerald-400 uppercase tracking-wider">
            Investment Readiness Score
          </div>
        </div>
        {[
          { label: "Market", score: 82 },
          { label: "Technology", score: 71 },
          { label: "Team", score: 68 },
          { label: "Financials", score: 75 },
          { label: "Regulatory", score: 88 },
          { label: "Traction", score: 55 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-small text-white/50 w-20 text-right">
              {item.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <span className="text-small text-white/60 w-8">{item.score}</span>
          </div>
        ))}
      </div>
    ),
    "rcr-rating": (
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
          className="inline-flex items-center justify-center w-32 h-32 rounded-2xl glass-surface border border-emerald-500/30"
        >
          <span className="text-[56px] font-bold text-emerald-400">A-</span>
        </motion.div>
        <div>
          <div className="text-body text-white/60">
            Regulatory Credit Rating
          </div>
          <div className="text-small text-emerald-400 mt-1">
            Outlook: Positive
          </div>
        </div>
        <div className="text-small text-white/40">Peer Percentile: Top 22%</div>
      </div>
    ),
    "data-room": (
      <div className="w-full space-y-3">
        {[
          { name: "Corporate Documents", count: 8, status: "complete" },
          { name: "Financial Statements", count: 5, status: "complete" },
          { name: "Regulatory Filings", count: 12, status: "complete" },
          { name: "IP & Patents", count: 3, status: "partial" },
          { name: "Team & HR", count: 6, status: "partial" },
          { name: "Technical Documentation", count: 0, status: "empty" },
        ].map((folder) => (
          <div
            key={folder.name}
            className="flex items-center gap-3 p-3 rounded-lg glass-surface"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                folder.status === "complete"
                  ? "bg-emerald-500"
                  : folder.status === "partial"
                    ? "bg-amber-500"
                    : "bg-white/20"
              }`}
            />
            <span className="text-body text-white/70 flex-1">
              {folder.name}
            </span>
            <span className="text-small text-white/40">
              {folder.count} files
            </span>
          </div>
        ))}
      </div>
    ),
    "risk-heatmap": (
      <div className="w-full">
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }, (_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const intensity = (row + col) / 8;
            const hasRisk = [3, 7, 11, 13, 18, 22].includes(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`aspect-square rounded-sm ${
                  hasRisk
                    ? intensity > 0.6
                      ? "bg-red-500/60"
                      : intensity > 0.3
                        ? "bg-amber-500/50"
                        : "bg-emerald-500/40"
                    : "bg-white/[0.03]"
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-3">
          <span className="text-micro text-white/30">Low Impact</span>
          <span className="text-micro text-white/30">High Impact</span>
        </div>
      </div>
    ),
    "comply-integration": (
      <div className="w-full space-y-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="glass-surface rounded-xl p-4 border border-white/10">
            <div className="text-micro text-white/40 uppercase tracking-wider mb-1">
              Comply
            </div>
            <div className="text-heading font-bold text-white">87%</div>
            <div className="text-micro text-white/40">Compliance</div>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="w-12 h-px bg-gradient-to-r from-emerald-500 to-emerald-300"
          />
          <div className="glass-surface rounded-xl p-4 border border-emerald-500/20">
            <div className="text-micro text-emerald-400 uppercase tracking-wider mb-1">
              Assure
            </div>
            <div className="text-heading font-bold text-emerald-400">A-</div>
            <div className="text-micro text-white/40">RCR Grade</div>
          </div>
        </div>
        <p className="text-small text-white/40 max-w-[240px] mx-auto">
          Compliance data flows automatically into your investor-facing scores
        </p>
      </div>
    ),
  };

  return illustrations[chapterId] || null;
}
```

**Step 3: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/assure/demo/page.tsx src/data/assure/demo-tour-chapters.ts
git commit -m "feat(assure): add interactive demo tour page with 5 chapters"
```

---

## Task 5: Call Booking Page + API

**Files:**

- Create: `src/app/assure/book/page.tsx`
- Create: `src/app/api/assure/book/route.ts`

**Step 1: Create booking API route**

File: `src/app/api/assure/book/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

const bookingSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email format").max(320),
  company: z.string().min(1, "Company name is required").max(200),
  companyWebsite: z.string().url().max(500).optional().or(z.literal("")),
  operatorType: z.string().min(1, "Operator type is required").max(100),
  fundingStage: z.string().min(1, "Funding stage is required").max(100),
  isRaising: z.boolean(),
  targetRaise: z.number().positive().optional(),
  message: z.string().max(5000).optional(),
  demoTourCompleted: z.boolean().default(false),
  _hp: z.string().max(0).optional(),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIdentifier(req);
    const rateLimit = await checkRateLimit("public_api", ip);
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      name,
      email,
      company,
      companyWebsite,
      operatorType,
      fundingStage,
      isRaising,
      targetRaise,
      message,
      demoTourCompleted,
      _hp,
    } = parsed.data;

    // Honeypot check
    if (_hp) {
      return NextResponse.json({ success: true });
    }

    await prisma.demoRequest.create({
      data: {
        name,
        email,
        company,
        role: [operatorType, fundingStage].filter(Boolean).join(" · "),
        message: message || null,
        source: "assure-demo",
        status: "NEW",
        followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyWebsite: companyWebsite || null,
        operatorType,
        fundingStage,
        isRaising,
        targetRaise: targetRaise ?? null,
        demoTourCompleted,
      },
    });

    // User confirmation email
    try {
      await sendEmail({
        to: email,
        subject: "Caelex Assure — Your Onboarding Call",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #0f172a;">Thanks, ${escapeHtml(name)}!</h1>
            <p style="font-size: 15px; color: #64748b; line-height: 1.6;">
              We received your request and will get back to you within 24 hours to schedule your personalized onboarding call.
            </p>
            <p style="font-size: 15px; color: #64748b; line-height: 1.6;">
              During the call, we'll walk you through Assure, understand your specific needs, and set up your personalized dashboard.
            </p>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 32px;">— The Caelex Team</p>
          </div>
        `,
      });
    } catch (emailErr) {
      logger.error("Failed to send booking confirmation email", { emailErr });
    }

    // Admin notification
    try {
      await sendEmail({
        to: "cs@caelex.eu",
        subject: `[Assure Booking] ${escapeHtml(company)} — ${escapeHtml(name)}`,
        html: `
          <div style="font-family: monospace; font-size: 13px; color: #333;">
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Company:</strong> ${escapeHtml(company)}</p>
            <p><strong>Website:</strong> ${escapeHtml(companyWebsite || "—")}</p>
            <p><strong>Operator:</strong> ${escapeHtml(operatorType)}</p>
            <p><strong>Stage:</strong> ${escapeHtml(fundingStage)}</p>
            <p><strong>Raising:</strong> ${isRaising ? `Yes — €${targetRaise?.toLocaleString() || "?"}` : "No"}</p>
            <p><strong>Demo Tour:</strong> ${demoTourCompleted ? "Completed" : "Skipped"}</p>
            ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ""}
          </div>
        `,
      });
    } catch (emailErr) {
      logger.error("Failed to send admin notification", { emailErr });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Assure booking error", { error });
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to submit. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
```

**Step 2: Create booking page**

File: `src/app/assure/book/page.tsx`

This is a large file. Key structure:

- `"use client"` component
- Two-column layout: left = qualify form, right = Calendly placeholder + trust signals
- Same styling patterns as request-access page (public page = `bg-black`, `Navigation`/`Footer`)
- Form fields: name, email, company, website, operator type (select), funding stage (select), raising toggle + conditional amount, message
- Honeypot field
- On submit: `POST /api/assure/book` (no csrfHeaders — public endpoint)
- Success state: confirmation message + Calendly link/embed placeholder

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  Shield,
  Clock,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const OPERATOR_TYPES = [
  { value: "SCO", label: "Satellite/Constellation Operator" },
  { value: "LO", label: "Launch Operator" },
  { value: "LSO", label: "Launch Service Operator" },
  { value: "ISOS", label: "In-orbit Service Operator" },
  { value: "CAP", label: "Capacity Provider" },
  { value: "PDP", label: "Payload Data Provider" },
  { value: "TCO", label: "Tracking & Command Operator" },
];

const FUNDING_STAGES = [
  { value: "PRE_SEED", label: "Pre-Seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B", label: "Series B+" },
  { value: "GROWTH", label: "Growth / Revenue Stage" },
];

const inputClasses =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200";
const labelClasses = "block text-body font-medium text-white/60 mb-2";
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;

interface BookingForm {
  name: string;
  email: string;
  company: string;
  companyWebsite: string;
  operatorType: string;
  fundingStage: string;
  isRaising: boolean;
  targetRaise: string;
  message: string;
}

export default function AssureBookPage() {
  const [form, setForm] = useState<BookingForm>({
    name: "",
    email: "",
    company: "",
    companyWebsite: "",
    operatorType: "",
    fundingStage: "",
    isRaising: false,
    targetRaise: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof BookingForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/assure/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetRaise: form.targetRaise
            ? parseFloat(form.targetRaise)
            : undefined,
          demoTourCompleted: document.referrer.includes("/assure/demo"),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-[160px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-micro text-emerald-400 uppercase tracking-wider font-medium">
                Book Your Onboarding Call
              </span>
            </div>
            <h1 className="text-display font-bold text-white mb-4">
              Get Your Personalized Scores
            </h1>
            <p className="text-body-lg text-white/50 max-w-[520px] mx-auto">
              Tell us about your company and we&apos;ll schedule a call to set
              up your Assure dashboard with pre-filled data.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto glass-elevated rounded-2xl border border-white/[0.08] p-10 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-heading font-semibold text-white mb-3">
                  You&apos;re on the list!
                </h2>
                <p className="text-body text-white/50 mb-6">
                  We&apos;ll review your profile and reach out within 24 hours
                  to schedule your onboarding call.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Try a free compliance assessment while you wait
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="grid lg:grid-cols-[1fr_380px] gap-10">
                  {/* Left: Form */}
                  <div className="glass-elevated rounded-2xl border border-white/[0.08] p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClasses}>Full Name *</label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) =>
                              updateField("name", e.target.value)
                            }
                            placeholder="Jane Smith"
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Work Email *</label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                              updateField("email", e.target.value)
                            }
                            placeholder="jane@company.com"
                            className={inputClasses}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClasses}>Company Name *</label>
                          <input
                            type="text"
                            required
                            value={form.company}
                            onChange={(e) =>
                              updateField("company", e.target.value)
                            }
                            placeholder="AstroLink GmbH"
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>
                            Company Website
                          </label>
                          <input
                            type="url"
                            value={form.companyWebsite}
                            onChange={(e) =>
                              updateField("companyWebsite", e.target.value)
                            }
                            placeholder="https://astrolink.space"
                            className={inputClasses}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClasses}>
                            Operator Type *
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={form.operatorType}
                              onChange={(e) =>
                                updateField("operatorType", e.target.value)
                              }
                              className={selectClasses}
                            >
                              <option value="">Select type...</option>
                              {OPERATOR_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={labelClasses}>
                            Funding Stage *
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={form.fundingStage}
                              onChange={(e) =>
                                updateField("fundingStage", e.target.value)
                              }
                              className={selectClasses}
                            >
                              <option value="">Select stage...</option>
                              {FUNDING_STAGES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.isRaising}
                            onChange={(e) =>
                              updateField("isRaising", e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 rounded-full bg-white/10 peer-checked:bg-emerald-500/30 border border-white/10 peer-checked:border-emerald-500/40 relative transition-all">
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/40 peer-checked:bg-emerald-400 peer-checked:translate-x-5 transition-all" />
                          </div>
                          <span className="text-body text-white/60">
                            Currently raising
                          </span>
                        </label>
                      </div>

                      <AnimatePresence>
                        {form.isRaising && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <label className={labelClasses}>
                              Target Raise (EUR)
                            </label>
                            <input
                              type="number"
                              value={form.targetRaise}
                              onChange={(e) =>
                                updateField("targetRaise", e.target.value)
                              }
                              placeholder="2000000"
                              className={inputClasses}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <label className={labelClasses}>
                          Anything we should know?
                        </label>
                        <textarea
                          value={form.message}
                          onChange={(e) =>
                            updateField("message", e.target.value)
                          }
                          placeholder="Tell us about your priorities..."
                          rows={3}
                          className={`${inputClasses} resize-none`}
                        />
                      </div>

                      {/* Honeypot */}
                      <div className="hidden" aria-hidden="true">
                        <input name="_hp" tabIndex={-1} autoComplete="off" />
                      </div>

                      {error && (
                        <p
                          role="alert"
                          className="text-small text-red-400 text-center"
                        >
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Calendar className="w-4 h-4" />
                            Book Onboarding Call
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right: Trust signals */}
                  <div className="space-y-6">
                    <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                      <h3 className="text-body font-medium text-white mb-4">
                        What happens next
                      </h3>
                      <div className="space-y-4">
                        {[
                          {
                            step: "1",
                            text: "We review your profile within 24 hours",
                          },
                          {
                            step: "2",
                            text: "30-minute onboarding call at your convenience",
                          },
                          {
                            step: "3",
                            text: "We pre-fill your dashboard with your data",
                          },
                          {
                            step: "4",
                            text: "You complete setup and get your IRS score",
                          },
                        ].map((item) => (
                          <div
                            key={item.step}
                            className="flex items-start gap-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <span className="text-micro text-emerald-400 font-medium">
                                {item.step}
                              </span>
                            </div>
                            <span className="text-small text-white/50">
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-body font-medium text-white">
                          Your data is safe
                        </span>
                      </div>
                      <p className="text-small text-white/40">
                        AES-256-GCM encryption, GDPR-compliant, EU-hosted
                        infrastructure. We never share your data with third
                        parties.
                      </p>
                    </div>

                    <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-body font-medium text-white">
                          30 min setup
                        </span>
                      </div>
                      <p className="text-small text-white/40">
                        The onboarding wizard takes about 30 minutes. Most
                        fields are pre-filled from your call.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              href="/assure/demo"
              className="inline-flex items-center gap-2 text-body text-white/30 hover:text-white/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to demo tour
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

**Step 3: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/assure/book/page.tsx src/app/api/assure/book/route.ts
git commit -m "feat(assure): add call booking page with qualify form and API"
```

---

## Task 6: IRS Preview Calculator (Client-Side)

**Files:**

- Create: `src/lib/assure/irs-preview-calculator.ts`

**Step 1: Create the client-side preview calculator**

This is a lightweight, client-side mirror of the server-side IRS engine. It does NOT import `server-only` and does NOT use Prisma. It takes plain objects and returns a score preview.

```typescript
/**
 * Client-side IRS preview calculator for the onboarding wizard.
 * Lightweight mirror of irs-engine.server.ts — deterministic, no DB, no API.
 */

export interface IRSPreviewInput {
  // Step 1: Company Identity
  companyName?: string;
  stage?: string;
  operatorType?: string;
  oneLiner?: string;

  // Step 2: Market & Technology
  tam?: number;
  sam?: number;
  som?: number;
  trl?: number;
  patentCount?: number;
  productStage?: string;

  // Step 3: Team
  founderCount?: number;
  hasSpaceBackground?: boolean;
  keyHiresCount?: number;
  advisorCount?: number;

  // Step 4: Financials
  mrr?: number;
  burnRate?: number;
  runwayMonths?: number;
  previousFunding?: number;

  // Step 5: Comply Integration
  complyLinked?: boolean;
  assessmentsCompleted?: number;
  complianceScore?: number;

  // Step 6: Fundraising
  targetRaise?: number;
  roundType?: string;
}

export interface IRSPreviewComponent {
  id: string;
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  dataAvailable: boolean;
}

export interface IRSPreviewResult {
  overallScore: number;
  grade: string;
  gradeLabel: string;
  components: IRSPreviewComponent[];
  delta: number;
}

const WEIGHTS = {
  market: 0.2,
  technology: 0.2,
  team: 0.15,
  financial: 0.15,
  regulatory: 0.15,
  traction: 0.15,
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreMarket(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let fields = 0;
  let filled = 0;

  fields++;
  if (input.tam && input.tam > 0) {
    filled++;
    score +=
      input.tam >= 1_000_000_000 ? 30 : input.tam >= 100_000_000 ? 20 : 10;
  }
  fields++;
  if (input.sam && input.sam > 0) {
    filled++;
    score += input.sam >= 100_000_000 ? 20 : input.sam >= 10_000_000 ? 15 : 8;
  }
  fields++;
  if (input.som && input.som > 0) {
    filled++;
    score += input.som >= 10_000_000 ? 20 : input.som >= 1_000_000 ? 15 : 8;
  }
  fields++;
  if (input.stage) {
    filled++;
    score += 10;
  }

  const completeness = fields > 0 ? filled / fields : 0;
  if (completeness < 0.3)
    return { score: Math.min(score, 30), available: filled > 0 };
  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTechnology(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.trl && input.trl > 0) {
    filled++;
    score += Math.min(input.trl * 10, 40);
  }
  if (input.patentCount && input.patentCount > 0) {
    filled++;
    score += Math.min(input.patentCount * 10, 30);
  }
  if (input.productStage) {
    filled++;
    const stages: Record<string, number> = {
      concept: 5,
      prototype: 15,
      mvp: 25,
      beta: 30,
      revenue: 30,
    };
    score += stages[input.productStage] || 10;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTeam(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.founderCount && input.founderCount > 0) {
    filled++;
    score += input.founderCount >= 2 ? 25 : 15;
  }
  if (input.hasSpaceBackground) {
    filled++;
    score += 25;
  }
  if (input.keyHiresCount && input.keyHiresCount > 0) {
    filled++;
    score += Math.min(input.keyHiresCount * 5, 25);
  }
  if (input.advisorCount && input.advisorCount > 0) {
    filled++;
    score += Math.min(input.advisorCount * 5, 25);
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreFinancial(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.mrr && input.mrr > 0) {
    filled++;
    score += input.mrr >= 50_000 ? 30 : input.mrr >= 10_000 ? 20 : 10;
  }
  if (input.runwayMonths && input.runwayMonths > 0) {
    filled++;
    score += input.runwayMonths >= 18 ? 30 : input.runwayMonths >= 12 ? 20 : 10;
  }
  if (input.burnRate && input.burnRate > 0) {
    filled++;
    score += 15;
  }
  if (input.previousFunding && input.previousFunding > 0) {
    filled++;
    score += 15;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreRegulatory(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.complyLinked) {
    filled++;
    score += 20; // Comply link bonus
  }
  if (input.assessmentsCompleted && input.assessmentsCompleted > 0) {
    filled++;
    score += Math.min(input.assessmentsCompleted * 15, 40);
  }
  if (input.complianceScore && input.complianceScore > 0) {
    filled++;
    score += Math.round(input.complianceScore * 0.4);
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTraction(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  // Traction is derived from other signals during onboarding
  if (input.mrr && input.mrr > 0) {
    filled++;
    score += 30;
  }
  if (input.targetRaise && input.targetRaise > 0) {
    filled++;
    score += 20;
  }
  if (input.operatorType) {
    filled++;
    score += 15;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function getGrade(score: number): { grade: string; label: string } {
  if (score >= 90) return { grade: "A+", label: "Exceptional" };
  if (score >= 80) return { grade: "A", label: "Excellent" };
  if (score >= 70) return { grade: "A-", label: "Very Strong" };
  if (score >= 60) return { grade: "B+", label: "Strong" };
  if (score >= 50) return { grade: "B", label: "Good" };
  if (score >= 40) return { grade: "B-", label: "Developing" };
  if (score >= 30) return { grade: "C+", label: "Early Stage" };
  if (score >= 20) return { grade: "C", label: "Needs Work" };
  return { grade: "C-", label: "Getting Started" };
}

let lastScore = 0;

export function calculateIRSPreview(input: IRSPreviewInput): IRSPreviewResult {
  const market = scoreMarket(input);
  const technology = scoreTechnology(input);
  const team = scoreTeam(input);
  const financial = scoreFinancial(input);
  const regulatory = scoreRegulatory(input);
  const traction = scoreTraction(input);

  const components: IRSPreviewComponent[] = [
    {
      id: "market",
      label: "Market & Opportunity",
      score: market.score,
      weight: WEIGHTS.market,
      weightedScore: market.score * WEIGHTS.market,
      dataAvailable: market.available,
    },
    {
      id: "technology",
      label: "Technology & Product",
      score: technology.score,
      weight: WEIGHTS.technology,
      weightedScore: technology.score * WEIGHTS.technology,
      dataAvailable: technology.available,
    },
    {
      id: "team",
      label: "Team & Leadership",
      score: team.score,
      weight: WEIGHTS.team,
      weightedScore: team.score * WEIGHTS.team,
      dataAvailable: team.available,
    },
    {
      id: "financial",
      label: "Financial Health",
      score: financial.score,
      weight: WEIGHTS.financial,
      weightedScore: financial.score * WEIGHTS.financial,
      dataAvailable: financial.available,
    },
    {
      id: "regulatory",
      label: "Regulatory Position",
      score: regulatory.score,
      weight: WEIGHTS.regulatory,
      weightedScore: regulatory.score * WEIGHTS.regulatory,
      dataAvailable: regulatory.available,
    },
    {
      id: "traction",
      label: "Traction & Validation",
      score: traction.score,
      weight: WEIGHTS.traction,
      weightedScore: traction.score * WEIGHTS.traction,
      dataAvailable: traction.available,
    },
  ];

  const overallScore = Math.round(
    components.reduce((sum, c) => sum + c.weightedScore, 0),
  );

  const { grade, label } = getGrade(overallScore);
  const delta = overallScore - lastScore;
  lastScore = overallScore;

  return { overallScore, grade, gradeLabel: label, components, delta };
}
```

**Step 2: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/assure/irs-preview-calculator.ts
git commit -m "feat(assure): add client-side IRS preview calculator for onboarding wizard"
```

---

## Task 7: ASTRA Onboarding Messages (Deterministic)

**Files:**

- Create: `src/lib/assure/onboarding-astra-messages.ts`

**Step 1: Create the deterministic ASTRA message system**

```typescript
/**
 * Deterministic ASTRA co-pilot messages for the Assure onboarding wizard.
 * No API calls — template-based with variable substitution.
 */

export interface AstraMessage {
  text: string;
  tip?: string;
  sentiment: "neutral" | "positive" | "encouraging";
}

type TemplateVars = Record<string, string | number | boolean | undefined>;

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "—";
  });
}

const STEP_MESSAGES: Record<
  number,
  {
    welcome: AstraMessage;
    fieldTips: Record<string, (vars: TemplateVars) => AstraMessage>;
  }
> = {
  1: {
    welcome: {
      text: "Welcome to Assure! Let's build your investor-ready profile. I'll guide you through each section and show you how every field impacts your Investment Readiness Score.",
      sentiment: "neutral",
    },
    fieldTips: {
      companyName: (vars) => ({
        text: interpolate(
          "Great, {companyName}! A clear company identity is the foundation of your investor narrative.",
          vars,
        ),
        sentiment: "positive",
      }),
      stage: (vars) => ({
        text: interpolate(
          "You're at the {stage} stage. I'll calibrate all benchmarks to match companies at your maturity level.",
          vars,
        ),
        tip: "Investors expect different metrics at each stage. We adjust scoring thresholds accordingly.",
        sentiment: "neutral",
      }),
      operatorType: (vars) => ({
        text: interpolate(
          "As a {operatorType}, you'll be assessed against EU Space Act requirements specific to your operator category.",
          vars,
        ),
        tip: "Your operator type determines which of the 119 EU Space Act articles apply to you.",
        sentiment: "neutral",
      }),
    },
  },
  2: {
    welcome: {
      text: "Now let's define your market opportunity. This is what investors look at first — a large, growing market with a clear path to capture.",
      sentiment: "neutral",
    },
    fieldTips: {
      tam: (vars) => {
        const tam = Number(vars.tam) || 0;
        if (tam >= 1_000_000_000) {
          return {
            text: `A TAM of €${(tam / 1_000_000_000).toFixed(1)}B puts you in the top quartile. Investors love billion-dollar markets.`,
            sentiment: "positive",
          };
        }
        if (tam >= 100_000_000) {
          return {
            text: `€${(tam / 1_000_000).toFixed(0)}M TAM is solid for a focused space niche. Consider if you can credibly expand the boundary.`,
            tip: "Investors typically want to see >€500M TAM for VC-scale returns.",
            sentiment: "neutral",
          };
        }
        return {
          text: "A smaller TAM works if you can show a clear path to dominating your niche.",
          tip: "Consider including adjacent markets in your TAM calculation.",
          sentiment: "encouraging",
        };
      },
      trl: (vars) => {
        const trl = Number(vars.trl) || 0;
        if (trl >= 7)
          return {
            text: `TRL ${trl} — your technology is flight-proven or near-production. This significantly reduces investor risk perception.`,
            sentiment: "positive",
          };
        if (trl >= 4)
          return {
            text: `TRL ${trl} — validated in lab/relevant environment. Investors will want to see your path to TRL 7+.`,
            sentiment: "neutral",
          };
        return {
          text: `TRL ${trl} — early stage technology. Focus on your validation roadmap and key milestones ahead.`,
          sentiment: "encouraging",
        };
      },
      patentCount: (vars) => ({
        text:
          vars.patentCount && Number(vars.patentCount) > 0
            ? `${vars.patentCount} patent(s) — IP protection is a strong signal of defensibility for space investors.`
            : "No patents? Consider trade secrets, proprietary algorithms, or unique data assets as alternative moats.",
        sentiment:
          vars.patentCount && Number(vars.patentCount) > 0
            ? "positive"
            : "neutral",
      }),
    },
  },
  3: {
    welcome: {
      text: "Team is everything at early stage. Investors bet on people first. Let's showcase your founding team's strengths.",
      sentiment: "neutral",
    },
    fieldTips: {
      founderCount: (vars) => ({
        text:
          Number(vars.founderCount) >= 2
            ? "A multi-founder team is preferred by most VCs — it shows shared conviction and complementary skills."
            : "Solo founders can succeed, but investors will look closely at your ability to recruit senior talent.",
        sentiment: Number(vars.founderCount) >= 2 ? "positive" : "neutral",
      }),
      hasSpaceBackground: (vars) => ({
        text: vars.hasSpaceBackground
          ? "Space-sector experience on the founding team is a major differentiator. It boosts your team score by +8."
          : "No space background? Emphasize adjacent domain expertise and your advisory board's sector knowledge.",
        sentiment: vars.hasSpaceBackground ? "positive" : "encouraging",
      }),
      advisorCount: (vars) => ({
        text:
          Number(vars.advisorCount) >= 3
            ? `${vars.advisorCount} advisors — a strong advisory board signals credibility and access to networks.`
            : "Consider adding space industry veterans or regulatory experts to your advisory board.",
        tip: "Quality over quantity — one well-known advisor beats five unknown ones.",
        sentiment: Number(vars.advisorCount) >= 3 ? "positive" : "neutral",
      }),
    },
  },
  4: {
    welcome: {
      text: "Let's talk numbers. Investors need to understand your financial trajectory — runway, burn, and revenue signals.",
      sentiment: "neutral",
    },
    fieldTips: {
      mrr: (vars) => {
        const mrr = Number(vars.mrr) || 0;
        if (mrr >= 50_000)
          return {
            text: `€${(mrr / 1000).toFixed(0)}K MRR is strong — this puts you ahead of most space startups at your stage.`,
            sentiment: "positive",
          };
        if (mrr > 0)
          return {
            text: `€${(mrr / 1000).toFixed(1)}K MRR — revenue traction, even early, is a powerful signal.`,
            sentiment: "positive",
          };
        return {
          text: "Pre-revenue is normal at early stage. Focus on your path to first customers and LOIs.",
          sentiment: "neutral",
        };
      },
      runwayMonths: (vars) => {
        const runway = Number(vars.runwayMonths) || 0;
        if (runway >= 18)
          return {
            text: `${runway} months runway — the sweet spot for Series A. You have time to hit milestones without pressure.`,
            sentiment: "positive",
          };
        if (runway >= 12)
          return {
            text: `${runway} months runway — adequate, but start your raise process now. Fundraising takes 4-6 months.`,
            sentiment: "neutral",
          };
        return {
          text: `${runway} months runway — this is tight. Consider this urgency in your raise target.`,
          tip: "Investors get nervous below 12 months. Plan your raise to land with 18+ months.",
          sentiment: "encouraging",
        };
      },
      burnRate: (vars) => ({
        text: vars.burnRate
          ? `€${(Number(vars.burnRate) / 1000).toFixed(0)}K monthly burn. Investors will compare this to your runway and growth rate.`
          : "Track your burn rate — it's one of the first questions investors ask.",
        sentiment: "neutral",
      }),
    },
  },
  5: {
    welcome: {
      text: "This is where Caelex shines. Your compliance data from Comply becomes your competitive advantage with investors.",
      sentiment: "positive",
    },
    fieldTips: {
      complyLinked: (vars) => ({
        text: vars.complyLinked
          ? "Comply account linked! Your regulatory data will automatically feed into your Regulatory Readiness Score — that's a +5 bonus on your regulatory component."
          : "Linking your Comply account gives you an automatic Regulatory Readiness Score. This is unique data no competitor can replicate.",
        sentiment: vars.complyLinked ? "positive" : "encouraging",
      }),
      assessmentsCompleted: (vars) => ({
        text:
          Number(vars.assessmentsCompleted) >= 2
            ? `${vars.assessmentsCompleted} completed assessments — excellent. Each one strengthens your regulatory narrative.`
            : "Run your first compliance assessment to unlock the Regulatory Readiness Score.",
        sentiment:
          Number(vars.assessmentsCompleted) >= 2 ? "positive" : "neutral",
      }),
    },
  },
  6: {
    welcome: {
      text: "Final step — your fundraising strategy. This calibrates everything: benchmarks, comparisons, and your recommended positioning.",
      sentiment: "neutral",
    },
    fieldTips: {
      targetRaise: (vars) => ({
        text: vars.targetRaise
          ? `Targeting €${(Number(vars.targetRaise) / 1_000_000).toFixed(1)}M — I'll benchmark this against comparable space rounds.`
          : "Defining your target helps us calibrate your benchmarks and peer comparisons.",
        sentiment: "neutral",
      }),
      roundType: (vars) => ({
        text: interpolate(
          "Preparing for {roundType} — I'll adjust all scoring thresholds to match investor expectations at this stage.",
          vars,
        ),
        sentiment: "neutral",
      }),
    },
  },
};

export function getWelcomeMessage(step: number): AstraMessage {
  return (
    STEP_MESSAGES[step]?.welcome || {
      text: "Let's continue building your profile.",
      sentiment: "neutral",
    }
  );
}

export function getFieldTip(
  step: number,
  field: string,
  vars: TemplateVars,
): AstraMessage | null {
  const stepMessages = STEP_MESSAGES[step];
  if (!stepMessages?.fieldTips[field]) return null;
  return stepMessages.fieldTips[field](vars);
}

export function getScoreRevealMessages(
  score: number,
  grade: string,
  topComponent: string,
  weakestComponent: string,
): AstraMessage[] {
  const messages: AstraMessage[] = [];

  if (score >= 70) {
    messages.push({
      text: `An IRS of ${score} and a ${grade} grade — you're in strong shape. Investors will see a well-prepared company.`,
      sentiment: "positive",
    });
  } else if (score >= 50) {
    messages.push({
      text: `An IRS of ${score} (${grade}) — solid foundation with clear room to improve. Let's turn those gaps into action items.`,
      sentiment: "encouraging",
    });
  } else {
    messages.push({
      text: `Your IRS is ${score} (${grade}) — we've identified exactly where to focus. Every point you gain makes your pitch stronger.`,
      sentiment: "encouraging",
    });
  }

  messages.push({
    text: `Your strongest area is ${topComponent}. Lead with this in investor conversations.`,
    sentiment: "positive",
  });

  messages.push({
    text: `The biggest opportunity for improvement is ${weakestComponent}. I've prepared specific actions in your dashboard.`,
    tip: "Check the Improvement Roadmap tab for prioritized next steps.",
    sentiment: "neutral",
  });

  return messages;
}
```

**Step 2: Commit**

```bash
git add src/lib/assure/onboarding-astra-messages.ts
git commit -m "feat(assure): add deterministic ASTRA co-pilot messages for onboarding"
```

---

## Task 8: Onboarding Wizard Progress API

**Files:**

- Create: `src/app/api/assure/onboarding/progress/route.ts`

**Step 1: Create the progress API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { csrfProtect } from "@/lib/csrf.server";

const progressSchema = z.object({
  step: z.number().int().min(0).max(7),
  data: z.record(z.unknown()).optional(),
});

// GET — load current progress
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId: session.user.organizationId },
      select: {
        onboardingStep: true,
        companyName: true,
        stage: true,
        operatorType: true,
        oneLiner: true,
      },
    });

    // Also check for pre-fill data from DemoRequest
    const demoRequest = await prisma.demoRequest.findFirst({
      where: { email: session.user.email!, source: "assure-demo" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      currentStep: profile?.onboardingStep ?? 0,
      profile: profile || null,
      preFill: demoRequest
        ? {
            companyName: demoRequest.company,
            companyWebsite: demoRequest.companyWebsite,
            operatorType: demoRequest.operatorType,
            fundingStage: demoRequest.fundingStage,
            isRaising: demoRequest.isRaising,
            targetRaise: demoRequest.targetRaise,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to load progress") },
      { status: 500 },
    );
  }
}

// PATCH — save step progress
export async function PATCH(req: NextRequest) {
  try {
    const csrfError = await csrfProtect(req);
    if (csrfError) return csrfError;

    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getIdentifier(req);
    const rateLimit = await checkRateLimit("api", ip);
    if (!rateLimit.success) return createRateLimitResponse(rateLimit);

    const body = await req.json();
    const parsed = progressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await prisma.assureCompanyProfile.upsert({
      where: { organizationId: session.user.organizationId },
      update: { onboardingStep: parsed.data.step },
      create: {
        organizationId: session.user.organizationId,
        companyName: session.user.name || "My Company",
        onboardingStep: parsed.data.step,
      },
    });

    return NextResponse.json({ success: true, step: parsed.data.step });
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to save progress") },
      { status: 500 },
    );
  }
}
```

Note: The exact import paths for `csrfProtect` and `authOptions` may need adjustment based on the actual codebase. Check:

- `src/lib/csrf.server.ts` for the CSRF protection function name
- `src/lib/auth.ts` for the auth config export name

**Step 2: Typecheck and commit**

```bash
git add src/app/api/assure/onboarding/progress/route.ts
git commit -m "feat(assure): add onboarding progress API with pre-fill from DemoRequest"
```

---

## Task 9: Setup Wizard — Main Orchestrator + Step Components

**Files:**

- Create: `src/components/assure/onboarding/SetupWizard.tsx`
- Create: `src/components/assure/onboarding/AstraCoPilot.tsx`
- Create: `src/components/assure/onboarding/LiveScoreWidget.tsx`
- Create: `src/components/assure/onboarding/steps/CompanyIdentityStep.tsx`
- Create: `src/components/assure/onboarding/steps/MarketTechStep.tsx`
- Create: `src/components/assure/onboarding/steps/TeamStep.tsx`
- Create: `src/components/assure/onboarding/steps/FinancialsStep.tsx`
- Create: `src/components/assure/onboarding/steps/ComplyIntegrationStep.tsx`
- Create: `src/components/assure/onboarding/steps/FundraisingStep.tsx`
- Create: `src/components/assure/onboarding/ScoreReveal.tsx`

This is the largest task. The implementing agent should:

1. **Create `SetupWizard.tsx`** as the orchestrator:
   - 3-column layout: left step sidebar (200px), center form (flex-1), right ASTRA + score panel (320px)
   - Manages all wizard state via a single `useState<IRSPreviewInput>` object
   - Calls `calculateIRSPreview()` on every state change (debounced 300ms)
   - Saves progress on each step completion via `PATCH /api/assure/onboarding/progress`
   - Loads pre-fill data on mount via `GET /api/assure/onboarding/progress`
   - Uses `AnimatePresence mode="wait"` for step transitions
   - On final step completion → shows `ScoreReveal`

2. **Create `AstraCoPilot.tsx`**:
   - Right panel component showing ASTRA messages
   - On step change: shows welcome message with typing animation (fake 1.5s delay)
   - On field change: shows relevant field tip (if one exists for that field)
   - Message bubble style: glass-surface, `text-body text-white/70`
   - "Learn more" expandable tips
   - ASTRA avatar: small emerald circle with `Sparkles` icon

3. **Create `LiveScoreWidget.tsx`**:
   - Sticky widget in the right panel above ASTRA
   - Shows overall score as animated number + progress ring (reuse SVG pattern from `IRSScoreGauge`)
   - Shows per-component bars with labels
   - Delta indicator: `+N` in emerald when score increases
   - Grayed-out bars for components with no data yet
   - Framer Motion spring animations on score changes

4. **Create each step component** following existing onboarding patterns:
   - Each receives `data: IRSPreviewInput`, `onChange: (field, value) => void`
   - Uses same input/label/select classes from current onboarding page
   - `CompanyIdentityStep`: companyName, logo upload placeholder, foundedYear, headquarters, stage (select), operatorType (select), oneLiner
   - `MarketTechStep`: TAM/SAM/SOM (currency inputs), TRL (1-9 slider), patents, productStage (select)
   - `TeamStep`: dynamic founder list (name, role, linkedin, years, spaceBackground toggle), keyHiresCount, advisorCount
   - `FinancialsStep`: revenueModel (select), MRR, burnRate, runwayMonths, previousFunding
   - `ComplyIntegrationStep`: auto-detect + display existing Comply data, link account CTA
   - `FundraisingStep`: isRaising toggle, roundType (select), targetRaise, useOfFunds (visual sliders), timeline, targetInvestorTypes (multi-select)

5. **Create `ScoreReveal.tsx`**:
   - Fullscreen overlay with dark backdrop
   - Score counts from 0 to final value (3-second animation)
   - Large `IRSScoreGauge` (size 280) as centerpiece
   - Confetti/particle burst when animation completes (use `canvas-confetti` or simple CSS particles)
   - Peer comparison line: "Top X% of European space startups"
   - RCR grade card flip animation
   - 3 ASTRA insight messages from `getScoreRevealMessages()`
   - CTA: "Enter Your Dashboard" → `/assure/dashboard`

**Styling rules (from codebase analysis):**

- Page bg: `bg-navy-950` (authenticated)
- Card: `<GlassCard>` or `glass-elevated rounded-2xl border border-white/[0.08]`
- Input: `bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all`
- Label: `text-body font-medium text-white/60 mb-1.5`
- Step active: `bg-emerald-500/10 text-emerald-400`
- Step complete: `bg-emerald-500 text-white`
- Step pending: `bg-white/5 border border-white/10 text-white/30`
- Animations: Framer Motion `AnimatePresence mode="wait"`, `initial={{ opacity: 0, x: 20 }}`, spring physics for score

**Step 6: Replace the existing onboarding page**

Modify `src/app/assure/onboarding/page.tsx` to import and render `SetupWizard`:

```tsx
"use client";

import SetupWizard from "@/components/assure/onboarding/SetupWizard";

export default function AssureOnboardingPage() {
  return <SetupWizard />;
}
```

**Step 7: Typecheck**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -40`

**Step 8: Commit**

```bash
git add src/components/assure/onboarding/ src/app/assure/onboarding/page.tsx
git commit -m "feat(assure): add 6-step setup wizard with ASTRA co-pilot and live IRS score"
```

---

## Task 10: Update Assure Landing Page CTAs

**Files:**

- Modify: `src/app/assure/page.tsx`

**Step 1: Update primary CTA**

Find all instances of the primary CTA that link to `/assure/onboarding` or `/assure/request-access` and change them to point to `/assure/demo`:

- Hero CTA: `href="/assure/demo"` with text "Experience Assure" + Sparkles icon
- Secondary CTA: `href="/assure/book"` with text "Book a Call"
- Any bottom-of-page CTA: link to `/assure/demo`

Keep the existing page structure and styling. Only change the `href` values and button text.

**Step 2: Commit**

```bash
git add src/app/assure/page.tsx
git commit -m "feat(assure): update landing page CTAs to point to demo tour"
```

---

## Task 11: Final Integration Test

**Step 1: Typecheck the entire project**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit`

Fix any type errors.

**Step 2: Build test**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx prisma generate && npx next build 2>&1 | tail -40`

Fix any build errors.

**Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat(assure): complete setup workflow — demo tour, booking, 6-step wizard"
git push origin main
```

---

## Execution Order Summary

| Task | Description                   | Dependencies     |
| ---- | ----------------------------- | ---------------- |
| 1    | Prisma schema extensions      | None             |
| 2    | Middleware public routes      | None             |
| 3    | Layout unlayouted routes      | None             |
| 4    | Demo tour page                | Task 2, 3        |
| 5    | Booking page + API            | Task 1, 2, 3     |
| 6    | IRS preview calculator        | None             |
| 7    | ASTRA onboarding messages     | None             |
| 8    | Onboarding progress API       | Task 1           |
| 9    | Setup wizard + all components | Tasks 1, 6, 7, 8 |
| 10   | Landing page CTA update       | Task 4           |
| 11   | Final integration test        | All              |

Tasks 1, 2, 3, 6, 7 can be parallelized. Tasks 4 and 5 can be parallelized after 1-3. Task 9 is the largest and depends on 1, 6, 7, 8.
