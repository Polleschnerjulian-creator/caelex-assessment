/**
 * /scholar/legal/imprint — Caelex Scholar Impressum / Imprint (§ 5 DDG).
 *
 * LegalDoc resolves the active Scholar UI locale itself and renders the binding
 * German edition for German readers, else the English convenience edition.
 */
import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { IMPRINT_DE } from "../_content/imprint-de";
import { IMPRINT_EN } from "../_content/imprint-en";

export const metadata: Metadata = {
  title: "Impressum / Imprint — Caelex Scholar",
  description:
    "Gesetzlich vorgeschriebene Angaben nach § 5 DDG, § 18 MStV und Art. 11/12 DSA für Caelex Scholar — Julian Polleschner, Berlin.",
};

export default function Page() {
  return <LegalDoc de={IMPRINT_DE} en={IMPRINT_EN} />;
}
