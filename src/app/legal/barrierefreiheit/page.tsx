import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { A11Y_DE } from "./_content/a11y-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Erklärung zur Barrierefreiheit (V1.0)",
    description:
      "Erklärung zur Barrierefreiheit der Caelex-Plattform gemäß BFSG / BITV 2.0 / WCAG 2.1 AA. Status, Maßnahmen und Feedback-Kanal.",
    path: "/legal/barrierefreiheit",
    keywords: ["Barrierefreiheit", "BFSG", "WCAG", "Accessibility"],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/barrierefreiheit",
    languages: {
      de: "/legal/barrierefreiheit",
      en: "/legal/accessibility",
    },
  },
};

export default function BarrierefreiheitPage() {
  return <LegalRenderer doc={A11Y_DE} />;
}
