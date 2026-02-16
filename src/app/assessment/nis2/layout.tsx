import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "NIS2 Assessment for Space Operators",
  description:
    "Assess your NIS2 Directive compliance as a space operator. Determine entity classification, identify security gaps, and understand incident reporting obligations.",
  path: "/assessment/nis2",
  keywords: [
    "NIS2 assessment",
    "NIS2 space operator",
    "cybersecurity compliance check",
    "NIS2 essential entity classification",
  ],
});

export default function Nis2AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
