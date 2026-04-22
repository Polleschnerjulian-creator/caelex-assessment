import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { CONTENT_POLICY_DE } from "./_content/content-policy-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Acceptable Use Policy (V1.0)",
    description:
      "Caelex Acceptable Use Policy. Erweitert § 11 der AGB V3.0 um konkrete Verbotslisten, DSA-konforme Notice-and-Action und Coordinated Vulnerability Disclosure.",
    path: "/legal/content-policy",
    keywords: ["Acceptable Use", "AUP", "Nutzungsregeln", "Caelex"],
  }),
  alternates: { canonical: "https://www.caelex.eu/legal/content-policy" },
};

export default function ContentPolicyPage() {
  return <LegalRenderer doc={CONTENT_POLICY_DE} />;
}
