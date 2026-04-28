import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { DPA_EN } from "./content-dpa-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "Data Processing Agreement (DPA V1.0)",
    description:
      "Caelex Data Processing Agreement pursuant to Art. 28 GDPR between the customer (Controller) and Caelex (Processor). Integral part of the Caelex Terms V3.0.",
    path: "/legal/dpa-en",
    keywords: [
      "DPA",
      "Data Processing Agreement",
      "Art. 28 GDPR",
      "Caelex data protection",
    ],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/dpa-en",
    languages: { de: "/legal/dpa", en: "/legal/dpa-en" },
  },
};

export default function DPAEnPage() {
  return <LegalRenderer doc={DPA_EN} altLangHref="/legal/dpa" />;
}
