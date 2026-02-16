import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Sign Up",
  description:
    "Create your free Caelex account. Start assessing EU Space Act, NIS2, and national space law compliance in minutes.",
  path: "/signup",
  noIndex: true,
});

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
