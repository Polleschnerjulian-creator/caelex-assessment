/**
 * Legacy wizard URL — permanently redirected into the assessment spine
 * (rebuild Task 4.1). The preset preselects a section FOCUS in the quick
 * wizard's headline only; it never skips the always-on identity/defense
 * gates and never changes question visibility. Metadata is kept so crawlers
 * see the 308 with a canonical destination. Stored results keep rendering
 * via their own saved snapshots — this page never owned them.
 */
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "NIS2 Assessment",
  description:
    "This assessment now runs on the unified Caelex operator assessment.",
};

export default function LegacyAssessmentRedirect() {
  permanentRedirect("/assessment/quick?preset=nis2_gateway");
}
