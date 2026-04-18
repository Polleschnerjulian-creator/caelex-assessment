import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { A11Y_EN } from "./_content/a11y-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "Accessibility Statement (V1.0)",
    description:
      "Accessibility of the Caelex platform under BFSG / BITV 2.0 / WCAG 2.1 AA. Status, measures and feedback channel.",
    path: "/legal/accessibility",
    keywords: ["Accessibility", "BFSG", "WCAG", "Barrierefreiheit"],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/accessibility",
    languages: {
      de: "/legal/barrierefreiheit",
      en: "/legal/accessibility",
    },
  },
};

export default function AccessibilityPage() {
  return <LegalRenderer doc={A11Y_EN} />;
}
