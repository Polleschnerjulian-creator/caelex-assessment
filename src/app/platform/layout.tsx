import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.platform;

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
