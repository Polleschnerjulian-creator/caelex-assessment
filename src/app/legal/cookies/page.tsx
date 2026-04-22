import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { COOKIES_DE } from "./_content/cookies-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Cookie-Richtlinie (V3.0)",
    description:
      "Cookie-Richtlinie von Caelex V3.0. TTDSG-konforme Einwilligung, Kategorisierung, Liste der eingesetzten Cookies und LocalStorage-Einträge mit Zweck, Dauer und Rechtsgrundlage.",
    path: "/legal/cookies",
    keywords: ["Cookies", "TTDSG", "Einwilligung", "Caelex"],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/cookies",
    languages: { de: "/legal/cookies", en: "/legal/cookies-en" },
  },
};

export default function CookiesPage() {
  return <LegalRenderer doc={COOKIES_DE} />;
}
