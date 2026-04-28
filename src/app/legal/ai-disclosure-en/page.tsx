import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { AI_DISCLOSURE_EN } from "./_content/ai-disclosure-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "AI Transparency Notice (V2.0)",
    description:
      "AI transparency: Caelex uses Claude (Anthropic). Zero data retention, AI Act-compliant, clear limits on AI outputs. Supplements Terms § 7 and Annex E.",
    path: "/legal/ai-disclosure-en",
    keywords: [
      "AI transparency",
      "EU AI Act",
      "Regulation 2024/1689",
      "Caelex",
    ],
  }),
  alternates: { canonical: "https://www.caelex.eu/legal/ai-disclosure-en" },
};

export default function AIDisclosureEnPage() {
  return <LegalRenderer doc={AI_DISCLOSURE_EN} />;
}
