import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.contact;

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
