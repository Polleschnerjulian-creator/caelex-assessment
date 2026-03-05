import type { Metadata } from "next";
import VerityPageClient from "./VerityPageClient";

export const metadata: Metadata = {
  title: "Verity — Privacy-Preserving Compliance Attestations | Caelex",
  description:
    "Prove regulatory compliance without revealing sensitive operational data. Cryptographically signed attestations for satellite operators, verified by anyone.",
  openGraph: {
    title: "Verity — Prove Compliance. Reveal Nothing.",
    description:
      "Privacy-preserving compliance attestations for satellite operators. Cryptographically signed proof that regulatory thresholds are met — without exposing telemetry.",
    images: ["/images/verity-hero.png"],
  },
};

export default function VerityPage() {
  return <VerityPageClient />;
}
