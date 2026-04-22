import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { DPA_DE } from "./_content/dpa-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Auftragsverarbeitungsvertrag (DPA V1.0)",
    description:
      "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO zwischen dem Kunden (Verantwortlicher) und Caelex (Auftragsverarbeiter). Integraler Bestandteil der Caelex-AGB V3.0.",
    path: "/legal/dpa",
    keywords: [
      "DPA",
      "Auftragsverarbeitung",
      "AV-Vertrag",
      "Art. 28 DSGVO",
      "Caelex Datenschutz",
    ],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/dpa",
    languages: { de: "/legal/dpa", en: "/legal/dpa-en" },
  },
};

export default function DPAPage() {
  return <LegalRenderer doc={DPA_DE} />;
}
