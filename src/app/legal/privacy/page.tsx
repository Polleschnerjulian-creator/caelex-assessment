import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { PRIVACY_DE } from "./_content/privacy-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Datenschutzerklärung (V3.0)",
    description:
      "Datenschutzerklärung von Caelex V3.0. GDPR-Transparenz: Art. 13/14 DSGVO, Sub-Auftragsverarbeiter, KI-Verarbeitung (Astra, Zero-Data-Retention), Speicherdauern, Betroffenenrechte.",
    path: "/legal/privacy",
    keywords: ["Datenschutz", "DSGVO", "GDPR", "Privacy Policy", "Caelex"],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/privacy",
    languages: { de: "/legal/privacy", en: "/legal/privacy-en" },
  },
};

export default function PrivacyPage() {
  return <LegalRenderer doc={PRIVACY_DE} />;
}
