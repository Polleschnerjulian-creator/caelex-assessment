import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...genMeta({
    title: "Erklärung zur Barrierefreiheit",
    description:
      "Erklärung zur Barrierefreiheit von Caelex gemäß BFSG. Informationen zum Stand der Konformität mit WCAG 2.1 AA, bekannte Einschränkungen und Kontaktmöglichkeiten.",
    path: "/legal/barrierefreiheit",
    keywords: [
      "Barrierefreiheit",
      "BFSG",
      "WCAG",
      "BITV",
      "Caelex Accessibility",
      "Barrierefreiheitsstärkungsgesetz",
    ],
  }),
  alternates: {
    canonical: "https://caelex.eu/legal/barrierefreiheit",
    languages: {
      de: "/legal/barrierefreiheit",
      en: "/legal/accessibility",
    },
  },
};

export default function BarrierefreiheitPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/accessibility"
              className="text-small text-[#4B5563] hover:text-[#4B5563] transition-colors border border-[#E5E7EB] rounded-full px-3 py-1"
            >
              English Version
            </Link>
          </div>

          <h1 className="text-display font-light tracking-[-0.02em] mb-4">
            Erklärung zur Barrierefreiheit
          </h1>
          <p className="text-body text-[#4B5563] mb-8">
            Stand: 13. März 2026 · Caelex, Berlin, Deutschland
          </p>

          <div className="prose prose-sm max-w-none space-y-10">
            {/* Section 1 - Geltungsbereich */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                1. Geltungsbereich
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Diese Erklärung zur Barrierefreiheit gilt für die Website{" "}
                <a
                  href="https://caelex.eu"
                  className="text-[#4B5563] hover:text-[#111827] underline"
                >
                  caelex.eu
                </a>
                , betrieben von Julian Polleschner (Einzelunternehmer). Sie
                wurde gemäß § 12a des Barrierefreiheitsstärkungsgesetzes (BFSG)
                in Verbindung mit der
                Barrierefreie-Informationstechnik-Verordnung (BITV 2.0)
                erstellt.
              </p>
            </section>

            {/* Section 2 - Stand der Konformität */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                2. Stand der Konformität
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Diese Website ist{" "}
                <strong className="text-[#111827]">teilweise konform</strong>{" "}
                mit den Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
                sowie der europäischen Norm EN 301 549.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Wir arbeiten kontinuierlich daran, die Barrierefreiheit unserer
                Plattform zu verbessern und bestehende Barrieren schrittweise
                abzubauen.
              </p>
            </section>

            {/* Section 3 - Nicht barrierefreie Inhalte */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                3. Nicht barrierefreie Inhalte
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mb-4">
                Die nachfolgend aufgeführten Inhalte sind aus den folgenden
                Gründen noch nicht vollständig barrierefrei:
              </p>
              <ul className="text-body-lg text-[#4B5563] leading-relaxed space-y-3 list-disc pl-6">
                <li>
                  <strong className="text-[#111827]">
                    Diagramme und Visualisierungen:
                  </strong>{" "}
                  Einige Diagramme (Charts) im Dashboard-Bereich sind noch nicht
                  vollständig für Screenreader beschrieben. Alternativtexte und
                  tabellarische Darstellungen werden sukzessive ergänzt.
                </li>
                <li>
                  <strong className="text-[#111827]">
                    Interaktive Elemente:
                  </strong>{" "}
                  Einzelne interaktive Elemente (Schaltflächen, Links) haben
                  noch keine optimale Mindestgröße von 24×24 Pixeln gemäß WCAG
                  2.5.8 (Target Size).
                </li>
                <li>
                  <strong className="text-[#111827]">Hintergrund-Video:</strong>{" "}
                  Das Hintergrund-Video auf der Startseite verfügt derzeit noch
                  nicht über Untertitel oder eine Audiodeskription.
                </li>
              </ul>
            </section>

            {/* Section 4 - Erstellung dieser Erklärung */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                4. Erstellung dieser Erklärung
              </h2>
              <div className="text-body-lg text-[#4B5563] leading-relaxed space-y-2">
                <p>
                  Diese Erklärung wurde am{" "}
                  <strong className="text-[#111827]">13. März 2026</strong>{" "}
                  erstellt.
                </p>
                <p>
                  Die Bewertung basiert auf einer{" "}
                  <strong className="text-[#111827]">Selbstbewertung</strong>{" "}
                  durch den Betreiber der Website.
                </p>
              </div>
            </section>

            {/* Section 5 - Feedback und Kontakt */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                5. Feedback und Kontakt
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Wenn Sie Barrieren auf unserer Website feststellen oder
                Informationen zur Barrierefreiheit benötigen, kontaktieren Sie
                uns bitte:
              </p>
              <div className="text-body-lg text-[#4B5563] leading-relaxed mt-4 space-y-1">
                <p>Julian Polleschner</p>
                <p>Am Maselakepark 37</p>
                <p>13587 Berlin</p>
                <p className="mt-3">
                  E-Mail:{" "}
                  <a
                    href="mailto:accessibility@caelex.eu"
                    className="text-[#4B5563] hover:text-[#111827] underline"
                  >
                    accessibility@caelex.eu
                  </a>
                </p>
                <p>
                  Alternativ:{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-[#4B5563] hover:text-[#111827] underline"
                  >
                    cs@caelex.eu
                  </a>
                </p>
                <p>Telefon: +49 1636726480</p>
              </div>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-4">
                Wir bemühen uns, Ihre Anfrage innerhalb von{" "}
                <strong className="text-[#111827]">4 Wochen</strong> zu
                beantworten und festgestellte Barrieren schnellstmöglich zu
                beheben.
              </p>
            </section>

            {/* Section 6 - Durchsetzungsverfahren */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                6. Durchsetzungsverfahren
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Sollten Sie innerhalb von{" "}
                <strong className="text-[#111827]">6 Wochen</strong> nach Ihrer
                Kontaktaufnahme keine zufriedenstellende Antwort erhalten haben,
                können Sie sich im Rahmen des Durchsetzungsverfahrens gemäß §
                12b BFSG an die zuständige Durchsetzungsbehörde wenden.
              </p>
              <div className="text-body-lg text-[#4B5563] leading-relaxed mt-4 space-y-1 bg-[#F0F1F3] rounded-lg p-5">
                <p className="font-medium text-[#111827]">
                  Landesbeauftragte für digitale Barrierefreiheit
                </p>
                <p>
                  Für Berlin zuständig ist die Landesbeauftragte für digitale
                  Barrierefreiheit beim Landesamt für Gesundheit und Soziales
                  (LAGeSo).
                </p>
                <p className="mt-2">
                  Weitere Informationen zum Durchsetzungsverfahren und den
                  Kontaktmöglichkeiten finden Sie auf der Website der
                  zuständigen Behörde.
                </p>
              </div>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-4">
                Darüber hinaus kann die Marktüberwachungsbehörde im Sinne des
                BFSG kontaktiert werden, die für die Durchsetzung der
                Barrierefreiheitsanforderungen gemäß § 12b BFSG zuständig ist.
              </p>
            </section>

            {/* Section 7 - Technische Informationen */}
            <section>
              <h2 className="text-heading font-medium text-[#111827] mb-4">
                7. Technische Informationen
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mb-4">
                Diese Website wurde mit folgenden Technologien erstellt und auf
                Barrierefreiheit getestet:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Kompatible Browser
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>Google Chrome (aktuelle Version)</li>
                    <li>Mozilla Firefox (aktuelle Version)</li>
                    <li>Apple Safari (aktuelle Version)</li>
                    <li>Microsoft Edge (aktuelle Version)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Screenreader
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>VoiceOver (macOS) — getestet</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2">
                    Verwendete Technologien
                  </h3>
                  <ul className="text-body-lg text-[#4B5563] leading-relaxed list-disc pl-6 space-y-1">
                    <li>HTML5</li>
                    <li>CSS3</li>
                    <li>JavaScript (ECMAScript)</li>
                    <li>WAI-ARIA</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <p className="text-small text-[#9CA3AF] mt-12">
            Stand: 13. März 2026
          </p>
        </div>
      </div>
    </main>
  );
}
