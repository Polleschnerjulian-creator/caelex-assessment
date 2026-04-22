import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalRenderer } from "@/components/legal/LegalRenderer";
import { SECURITY_DE } from "./_content/security-de";

export const metadata: Metadata = {
  ...genMeta({
    title: "Sicherheitsrichtlinie · Security Policy (V1.0)",
    description:
      "Caelex Security Policy. Responsible disclosure, Coordinated Vulnerability Disclosure, Safe Harbor, Hall of Fame, security.txt (RFC 9116).",
    path: "/legal/security",
    keywords: [
      "Security Policy",
      "Responsible Disclosure",
      "RFC 9116",
      "Caelex",
    ],
  }),
  alternates: { canonical: "https://www.caelex.eu/legal/security" },
};

export default function SecurityPage() {
  return <LegalRenderer doc={SECURITY_DE} />;
}
