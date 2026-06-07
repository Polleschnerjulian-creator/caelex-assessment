import type { Metadata } from "next";
import { LegalDoc } from "../_components/LegalDoc";
import { COOKIES_DE } from "../_content/cookies-de";
import { COOKIES_EN } from "../_content/cookies-en";

export const metadata: Metadata = {
  title:
    "Cookie- und Speicher-Hinweis / Cookie & Storage Notice — Caelex Scholar",
  description:
    "Welche Cookies und Speichertechnologien Caelex Scholar einsetzt — Zweck, Dauer und Rechtsgrundlage (§ 25 TDDDG). Nur unbedingt Erforderliches, keine Tracker.",
};

export default function Page() {
  return <LegalDoc de={COOKIES_DE} en={COOKIES_EN} />;
}
