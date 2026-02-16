import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "EU Space Act Timeline",
  description:
    "Interactive timeline of EU Space Act milestones, from proposal to full enforcement. Track key dates, deadlines, and compliance windows for space operators.",
  path: "/resources/timeline",
  keywords: [
    "EU Space Act timeline",
    "space regulation deadlines",
    "EU Space Act milestones",
    "compliance timeline",
  ],
});

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
