import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { TERMS_EN } from "../terms/_shared/content-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "General Terms and Conditions (V3.0)",
    description:
      "Caelex Terms V3.0 — binding terms of use for the space-compliance platform including Atlas, Assure, Academy, API and Astra. Effective: April 2026.",
    path: "/legal/terms-en",
    keywords: [
      "Terms and Conditions",
      "Caelex terms",
      "SaaS terms",
      "space compliance terms",
    ],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/terms-en",
    languages: { de: "/legal/terms", en: "/legal/terms-en" },
  },
};

export default function TermsEnPage() {
  return <LegalRenderer doc={TERMS_EN} altLangHref="/legal/terms" />;
}
