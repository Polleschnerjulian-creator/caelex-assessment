import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.pricing;

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
