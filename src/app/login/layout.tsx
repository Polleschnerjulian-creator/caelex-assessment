import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Log In",
  description:
    "Log in to your Caelex account to access your space compliance dashboard, assessments, and regulatory tracking tools.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
