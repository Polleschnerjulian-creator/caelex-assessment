import { generateMetadata as genMeta } from "@/lib/seo";
import { AtlasSoftwareApplicationJsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "ATLAS by Caelex — Space Law Database for Law Firms",
  description:
    "Compare 10+ space-law jurisdictions side by side. EU Space Act, national regulations, treaty obligations. Always current, always cited. Book a free 30-minute intro.",
  path: "/atlas-access",
  keywords: [
    "space law database",
    "space law research",
    "space law firm software",
    "EU Space Act legal research",
    "ATLAS Caelex",
    "space law comparison",
    "space law jurisdictions",
    "space treaty research",
  ],
});

export default function AtlasAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Atlas-specific SoftwareApplication schema. Rendered here at
          the layout level (Server Component) rather than inside the
          "use client" page, so the <script type="application/ld+json">
          appears in the initial HTML response and is visible to
          every crawler / LLM on first fetch. */}
      <AtlasSoftwareApplicationJsonLd />
      {children}
    </>
  );
}
