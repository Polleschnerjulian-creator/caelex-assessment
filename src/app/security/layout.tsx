import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.security;

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
