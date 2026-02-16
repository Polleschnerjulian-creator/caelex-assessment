import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "EU Space Act Assessment",
  description:
    "Assess your compliance with the EU Space Act (COM(2025) 335). Answer 8 questions to identify applicable articles, operator obligations, and authorization requirements.",
  path: "/assessment/eu-space-act",
  keywords: [
    "EU Space Act assessment",
    "space compliance check",
    "satellite operator obligations",
    "EU Space Act compliance tool",
  ],
});

export default function EuSpaceActAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
