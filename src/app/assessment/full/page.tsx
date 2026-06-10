/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Full-tier assessment page — Ultimate Assessment rebuild (Task 3.1).
 *
 * Account gate (founder §11.2: the full tier sits behind a FREE account):
 * an unauthenticated visit redirects into the EXISTING sign-in flow with
 * `callbackUrl=/assessment/full` — no new auth path. After sign-in, the
 * profile POST (Task 2.1) claims any anonymous quick profile via the
 * carry-forward cookie, so quick answers arrive PRE-FILLED (never re-asked
 * blank) and `currentSection` resume happens server-side through the same
 * endpoint the wizard already uses.
 *
 * The page itself is a thin server component: session check → render the
 * spine wizard in full mode. All claim/resume/carry-forward logic lives in
 * the tested profile route, not here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SpineWizard from "@/components/assessment/spine/SpineWizard";

export const metadata: Metadata = {
  title: "Full Compliance Assessment",
  description:
    "The complete operator assessment: a cited obligation map across the EU Space Act proposal, NIS2 and national space laws — readiness bands, credit map and a dated roadmap. Free account required.",
  robots: { index: false }, // gated surface; the quick tier is the public entry
};

export default async function FullAssessmentPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fassessment%2Ffull");
  }

  return (
    <SpineWizard
      tier="full"
      calculateEndpoint="/api/assessment/v2/calculate"
      resultsPath="/assessment/full/results"
      headline="Full Compliance Assessment"
    />
  );
}
