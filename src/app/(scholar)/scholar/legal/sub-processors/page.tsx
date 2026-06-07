import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { SUB_PROCESSORS_DE } from "../_content/sub-processors-de";
import { SUB_PROCESSORS_EN } from "../_content/sub-processors-en";

export const metadata: Metadata = {
  title: "Unterauftragsverarbeiter / Sub-processors — Caelex Scholar",
  description:
    "Verzeichnis der von Caelex Scholar eingesetzten Dienstleister — Name, Rolle, Standort und Transfermechanismus (Vercel, Neon Frankfurt, OpenAI, Resend, Upstash, Sentry, LogSnag, Google).",
};

export default function Page() {
  return <LegalDoc de={SUB_PROCESSORS_DE} en={SUB_PROCESSORS_EN} />;
}
