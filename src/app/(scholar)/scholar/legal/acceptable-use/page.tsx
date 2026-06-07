/**
 * /scholar/legal/acceptable-use — Acceptable Use Policy / Nutzungsrichtlinie.
 *
 * LegalDoc resolves the active Scholar UI locale itself and renders the binding
 * German edition for German readers, else the English convenience edition.
 */
import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { ACCEPTABLE_USE_DE } from "../_content/acceptable-use-de";
import { ACCEPTABLE_USE_EN } from "../_content/acceptable-use-en";

export const metadata: Metadata = {
  title: "Nutzungsrichtlinie / Acceptable Use Policy — Caelex Scholar",
  description:
    "Nutzungsrichtlinie für Caelex Scholar — kein Scraping, kein Teilen von Zugangsdaten, keine missbräuchliche KI-Nutzung. Entwurf; keine Rechtsberatung.",
};

export default function Page() {
  return <LegalDoc de={ACCEPTABLE_USE_DE} en={ACCEPTABLE_USE_EN} />;
}
