import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "National Space Law Assessment",
  description:
    "Compare national space laws across 10 European jurisdictions. Assess licensing requirements, liability frameworks, and find the optimal regulatory environment for your mission.",
  path: "/assessment/space-law",
  keywords: [
    "national space law assessment",
    "space law comparison",
    "satellite licensing jurisdictions",
    "European space law analysis",
  ],
});

export default function SpaceLawAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
