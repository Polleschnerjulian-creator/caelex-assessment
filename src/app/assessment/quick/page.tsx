/**
 * /assessment/quick — the public Quick-Check tier of the ultimate operator
 * assessment (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Task 2.3).
 *
 * Phase 4 (Task 4.1): the four legacy wizard URLs permanently redirect here,
 * carrying a `?preset=` section FOCUS. The preset adjusts the HEADLINE only —
 * it never filters the graph, never skips the always-on identity/defense
 * gates, and never changes question visibility (the redirects test pins this:
 * SpineWizard receives no graph/visibility prop derived from the preset).
 *
 * The wizard renders the QUICK-tier nodes of the real question graph via the
 * shared branch evaluator (display-only — the server re-enforces visibility
 * and gates at calculate time), persists answers to the profile API, and
 * finishes via the public quick-calculate endpoint.
 */

import type { Metadata } from "next";
import SpineWizard from "@/components/assessment/spine/SpineWizard";

export const metadata: Metadata = {
  title: "Quick Compliance Check | Caelex",
  description:
    "A free ~3-minute check that maps which obligation clusters attach to your space activities under the EU Space Act proposal, NIS2 and national space laws — honest about unknowns, with cited legal bases and no fabricated score.",
};

/** Preset → headline focus ONLY (never a visibility/graph change). */
const PRESET_HEADLINES: Record<string, string> = {
  space_act: "Quick Compliance Check — EU Space Act focus",
  nis2_gateway: "Quick Compliance Check — NIS2 focus",
  jurisdiction_market: "Quick Compliance Check — National space law focus",
};

export default async function QuickAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  const headline =
    (preset && PRESET_HEADLINES[preset]) || "Quick Compliance Check";
  return <SpineWizard tier="quick" headline={headline} />;
}
