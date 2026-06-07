import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { ACCESSIBILITY_DE } from "../_content/accessibility-de";
import { ACCESSIBILITY_EN } from "../_content/accessibility-en";

export const metadata: Metadata = {
  title:
    "Erklärung zur Barrierefreiheit / Accessibility Statement — Caelex Scholar",
  description:
    "Barrierefreiheit von Caelex Scholar — WCAG 2.2 AA, freiwillige Einhaltung, Feedback-Kanäle und Schlichtungsstelle (MLBF AöR, Magdeburg).",
};

export default function Page() {
  return <LegalDoc de={ACCESSIBILITY_DE} en={ACCESSIBILITY_EN} />;
}
