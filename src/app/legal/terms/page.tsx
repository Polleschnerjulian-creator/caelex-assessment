import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "./_shared/LegalRenderer";
import { TERMS_DE } from "./_shared/content-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Allgemeine Geschäftsbedingungen (V3.0)",
    description:
      "AGB von Caelex V3.0 — verbindliche Nutzungsbedingungen für die Space-Compliance-Plattform einschließlich Atlas, Assure, Academy, API und Astra. Stand: April 2026.",
    path: "/legal/terms",
    keywords: [
      "AGB",
      "Nutzungsbedingungen",
      "Caelex terms",
      "space compliance AGB",
      "SaaS AGB",
    ],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/terms",
    languages: { de: "/legal/terms", en: "/legal/terms-en" },
  },
};

export default function TermsPage() {
  return <LegalRenderer doc={TERMS_DE} />;
}
