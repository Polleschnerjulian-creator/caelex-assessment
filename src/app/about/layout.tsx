import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.about;

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
