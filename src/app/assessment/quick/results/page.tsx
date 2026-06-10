/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /assessment/quick/results — the quick-check result page (plan Task 2.4).
 *
 * Server component: resolves the visitor's OperatorAssessmentProfile (the
 * httpOnly anonymous-profile cookie set by the profile API, or the signed-in
 * user's latest profile), loads the latest STORED QUICK verdict snapshot —
 * the verdict is never recomputed from anything client-supplied — projects
 * it into the §6b "counts + headlines" view, and renders QuickResultPanel.
 *
 * No snapshot → redirect to the quick wizard. An unrecognizable stored
 * result → the same redirect (an honest restart, never a fabricated
 * verdict).
 *
 * PUBLIC page (founder §11.2): the on-screen result is free — no email, no
 * account. Only the PDF download inside the panel is email-gated.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QuickResultPanel from "@/components/assessment/spine/QuickResultPanel";
import { projectQuickResult } from "@/components/assessment/spine/quick-projection";
import { ASSESSMENT_PROFILE_COOKIE } from "@/lib/assessment/assessment-profile";

export const dynamic = "force-dynamic";

async function resolveProfileId(): Promise<string | null> {
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get(ASSESSMENT_PROFILE_COOKIE)?.value;
  if (anonymousId) {
    const profile = await prisma.operatorAssessmentProfile.findUnique({
      where: { anonymousId },
      select: { id: true },
    });
    if (profile) return profile.id;
  }

  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    const profile = await prisma.operatorAssessmentProfile.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (profile) return profile.id;
  }

  return null;
}

export default async function QuickResultsPage() {
  const profileId = await resolveProfileId();
  if (!profileId) {
    redirect("/assessment/quick");
  }

  const snapshot = await prisma.assessmentVerdictSnapshot.findFirst({
    where: { profileId, tier: "QUICK" },
    orderBy: { createdAt: "desc" },
    select: { result: true },
  });
  if (!snapshot) {
    redirect("/assessment/quick");
  }

  const view = projectQuickResult(snapshot.result);
  if (!view) {
    // Unrecognizable stored result: honest restart, never a guessed verdict.
    redirect("/assessment/quick");
  }

  return (
    <div className="landing-page min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/assessment/quick"
            className="flex items-center gap-2 text-body text-white/45 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the quick check
          </Link>
          <span className="text-caption font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            Caelex
          </span>
        </div>

        <QuickResultPanel view={view} profileId={profileId} />
      </div>
    </div>
  );
}
