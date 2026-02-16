import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Careers",
  description:
    "Join Caelex and help build the future of space compliance. Explore open positions in engineering, regulatory affairs, and business development.",
  path: "/careers",
  keywords: [
    "space compliance careers",
    "Caelex jobs",
    "space regulation jobs",
    "RegTech careers",
  ],
});

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
