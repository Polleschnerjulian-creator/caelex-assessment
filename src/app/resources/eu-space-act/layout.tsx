import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "EU Space Act Overview",
  description:
    "Comprehensive overview of the EU Space Act (COM(2025) 335). Explore all 119 articles, operator categories, authorization requirements, and compliance modules.",
  path: "/resources/eu-space-act",
  keywords: [
    "EU Space Act overview",
    "EU Space Act articles",
    "space regulation summary",
    "COM(2025) 335",
  ],
});

export default function EuSpaceActResourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
