import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Apply",
  description:
    "Apply for a position at Caelex. Join the team building the world's space compliance platform.",
  path: "/careers/apply",
  noIndex: true,
});

export default function CareerApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
