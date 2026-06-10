/**
 * /assessment/quick — the public Quick-Check tier of the ultimate operator
 * assessment (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Task 2.3).
 *
 * Phase-2 note (explicit non-goal): this route is reachable but deliberately
 * NOT linked from the /assessment picker, and the four legacy wizard URLs are
 * untouched until Phase 4.
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

export default function QuickAssessmentPage() {
  return <SpineWizard tier="quick" />;
}
