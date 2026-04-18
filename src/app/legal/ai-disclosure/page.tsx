import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { AI_DISCLOSURE_DE } from "./_content/ai-disclosure-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "KI-Transparenz-Erklärung (V2.0)",
    description:
      "KI-Transparenz: Caelex setzt Claude (Anthropic) ein. Zero-Data-Retention, KI-VO-konform, klare Grenzen der KI-Ausgaben. Ergänzt AGB § 7 und Anhang E.",
    path: "/legal/ai-disclosure",
    keywords: ["KI-Transparenz", "AI Act", "VO 2024/1689", "Caelex"],
  }),
  alternates: { canonical: "https://caelex.eu/legal/ai-disclosure" },
};

export default function AIDisclosurePage() {
  return <LegalRenderer doc={AI_DISCLOSURE_DE} />;
}
