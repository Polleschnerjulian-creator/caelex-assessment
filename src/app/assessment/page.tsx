import { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * /assessment — retired picker (landing review item #1, 2026-06-10).
 *
 * The four-regulation picker became a zombie after the Phase-4 cutover:
 * every card pointed at a legacy wizard route that 308s to
 * /assessment/quick anyway (a pointless double hop for footer/about
 * traffic). The ONE canonical entry is /assessment/quick — this page
 * now redirects there permanently. Canonical metadata moves with it.
 */

export const metadata: Metadata = {
  title: "Compliance Assessment",
  description:
    "Start your free space compliance assessment. Get your regulatory profile across EU Space Act, NIS2, and 10 national jurisdictions in minutes.",
  alternates: {
    canonical: "https://www.caelex.eu/assessment/quick",
  },
};

export default function AssessmentPage() {
  permanentRedirect("/assessment/quick");
}
