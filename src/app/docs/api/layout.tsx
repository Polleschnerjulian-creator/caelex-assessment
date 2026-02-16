import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "API Documentation",
  description:
    "Caelex API v1 documentation. Integrate space compliance checks, NIS2 classification, and regulatory assessments into your applications via REST API.",
  path: "/docs/api",
  keywords: [
    "space compliance API",
    "Caelex API docs",
    "satellite regulation API",
    "compliance integration",
  ],
});

export default function DocsApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
