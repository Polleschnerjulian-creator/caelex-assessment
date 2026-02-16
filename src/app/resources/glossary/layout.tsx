import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.glossary;

export default function GlossaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
