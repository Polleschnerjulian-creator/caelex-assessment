/**
 * /scholar/legal/privacy — Datenschutzerklärung / Privacy Notice.
 *
 * Renders the Scholar privacy notice via the frozen legal-doc shell. LegalDoc
 * resolves the active Scholar UI locale itself (server-side) and picks the
 * German (binding) edition when locale === "de", else the English (convenience)
 * edition. The mandatory ENTWURF/DRAFT banner + monochrome/WCAG chrome are
 * supplied by LegalDoc; this page only wires the content.
 */
import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { PRIVACY_DE } from "../_content/privacy-de";
import { PRIVACY_EN } from "../_content/privacy-en";

export const metadata: Metadata = {
  title: "Datenschutzerklärung / Privacy Notice — Caelex Scholar",
  description:
    "Wie Caelex personenbezogene Daten in Caelex Scholar verarbeitet (Art. 12–14 DSGVO): Verantwortliche, Zwecke, Rechtsgrundlagen, Empfänger, Speicherdauer und Ihre Rechte. — How Caelex processes personal data in Caelex Scholar (Arts. 12–14 GDPR).",
};

export default function Page() {
  return <LegalDoc de={PRIVACY_DE} en={PRIVACY_EN} />;
}
