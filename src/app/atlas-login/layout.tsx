import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Sign in to ATLAS",
  description:
    "Sign in to Caelex ATLAS — the searchable space-law database for law firms.",
  path: "/atlas-login",
  noIndex: true,
});

export default function AtlasLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
