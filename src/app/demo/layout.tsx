import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata.demo;

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
