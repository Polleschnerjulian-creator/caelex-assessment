/**
 * /scholar/legal/terms — Caelex Scholar Terms of Use / Nutzungsbedingungen.
 *
 * LegalDoc resolves the active Scholar UI locale itself and renders the binding
 * German edition for German readers, else the English convenience edition.
 */
import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { TERMS_DE } from "../_content/terms-de";
import { TERMS_EN } from "../_content/terms-en";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen / Terms of Use — Caelex Scholar",
  description:
    "Nutzungsbedingungen für Caelex Scholar — kostenlose, hochschullizenzierte Rechtsrecherche. Entwurf; keine Rechtsberatung.",
};

export default function Page() {
  return <LegalDoc de={TERMS_DE} en={TERMS_EN} />;
}
