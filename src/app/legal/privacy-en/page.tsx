import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { PRIVACY_EN } from "./_content/privacy-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "Privacy Policy (V3.0)",
    description:
      "Caelex Privacy Policy V3.0. GDPR transparency: Art. 13/14 GDPR, sub-processors, AI processing (Astra, zero data retention), retention periods, data-subject rights.",
    path: "/legal/privacy-en",
    keywords: ["Privacy Policy", "GDPR", "DSGVO", "Caelex"],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/privacy-en",
    languages: { de: "/legal/privacy", en: "/legal/privacy-en" },
  },
};

export default function PrivacyEnPage() {
  return <LegalRenderer doc={PRIVACY_EN} />;
}
