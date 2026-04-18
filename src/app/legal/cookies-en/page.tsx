import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { COOKIES_EN } from "./_content/cookies-en";

export const metadata: Metadata = {
  ...genMeta({
    title: "Cookie Policy (V3.0)",
    description:
      "Caelex Cookie Policy V3.0. TTDSG-compliant consent, categorisation, list of cookies and LocalStorage entries with purpose, retention and legal basis.",
    path: "/legal/cookies-en",
    keywords: ["Cookies", "TTDSG", "consent", "Caelex"],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/cookies-en",
    languages: { de: "/legal/cookies", en: "/legal/cookies-en" },
  },
};

export default function CookiesEnPage() {
  return <LegalRenderer doc={COOKIES_EN} />;
}
