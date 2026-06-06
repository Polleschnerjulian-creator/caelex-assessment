import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Sign in to Scholar",
  description:
    "Sign in to Caelex Scholar — the searchable space-law database for universities and research institutions.",
  path: "/scholar-login",
  noIndex: true,
});

export default function ScholarLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
