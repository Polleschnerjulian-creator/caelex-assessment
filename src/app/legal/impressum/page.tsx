import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = genMeta({
  title: "Impressum",
  description:
    "Gesetzlich vorgeschriebene Angaben nach § 5 DDG, § 18 MStV und Art. 11/12 DSA für Caelex — Space-Compliance-Plattform von Julian Polleschner, Berlin, Deutschland.",
  path: "/legal/impressum",
  keywords: ["Impressum", "Caelex legal notice", "DSA SPOC", "§ 5 DDG"],
});

export default function ImpressumPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[820px] mx-auto">
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            Impressum
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3">
            Legal notice under German law
          </p>
          <p className="text-body text-[#6B7280] mb-10">
            Stand: 18. April 2026
          </p>

          <div className="space-y-8">
            {/* Anbieter */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Anbieter (§ 5 DDG, § 18 MStV)
              </h2>
              <address className="not-italic text-body-lg text-[#4B5563] leading-relaxed">
                Caelex
                <br />
                Inhaber: Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin
                <br />
                Deutschland
              </address>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-heading font-medium mb-3">Kontakt</h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Allgemein:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  cs@caelex.eu
                </a>
                <br />
                Rechtliches:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  legal@caelex.eu
                </a>
                <br />
                Datenschutz:{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  privacy@caelex.eu
                </a>
                <br />
                Sicherheit:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  security@caelex.eu
                </a>
                <br />
                Missbrauch:{" "}
                <a
                  href="mailto:abuse@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  abuse@caelex.eu
                </a>
              </p>
            </section>

            {/* USt-ID */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Umsatzsteuer-Identifikationsnummer
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Gemäß § 27a UStG wird auf Anfrage bekannt gegeben. Als
                Kleinunternehmer gemäß § 19 UStG wird in Rechnungen keine
                Umsatzsteuer ausgewiesen, soweit und solange einschlägig.
              </p>
            </section>

            {/* Verantwortlich für Inhalt */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin, Deutschland
              </p>
            </section>

            {/* DSA SPOC */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Zentrale Kontaktstelle nach Art. 11 und 12 DSA
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Zentrale Kontaktstelle (Single Point of Contact) gemäß
                Verordnung (EU) 2022/2065 (Digital Services Act) für Behörden
                und für Nutzer:
              </p>
              <div className="mt-3 p-4 rounded-lg bg-white border border-[#E5E7EB] text-body text-[#4B5563]">
                E-Mail für Behördenkontakt:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  legal@caelex.eu
                </a>
                <br />
                E-Mail für Nutzerkontakt:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  cs@caelex.eu
                </a>
                <br />
                Sprache der Kommunikation: Deutsch, Englisch
                <br />
                Postalische Anschrift: wie oben unter Anbieter
              </div>
            </section>

            {/* Berufsrechtliche Hinweise */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Berufsrechtliche Angaben
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Caelex ist keine Rechtsanwaltskanzlei, keine Steuerberatung und
                kein zugelassener Finanzdienstleister. Es bestehen keine
                spezifischen berufsrechtlichen Regelungen. Für ergänzende
                Klarstellungen siehe{" "}
                <Link
                  href="/legal/terms#s5"
                  className="text-[#111827] hover:underline"
                >
                  AGB § 5
                </Link>
                .
              </p>
            </section>

            {/* Haftung */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Haftung für Inhalte
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Als Dienstanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene
                Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
                verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Dienstanbieter
                jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die
                auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
                Informationen nach den allgemeinen Gesetzen bleiben hiervon
                unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt
                der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                Bekanntwerden entsprechender Rechtsverletzungen werden wir die
                Inhalte umgehend entfernen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Haftung für Links
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Unser Angebot enthält Links zu externen Websites Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
                diese fremden Inhalte auch keine Gewähr übernehmen. Für die
                Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
                oder Betreiber verantwortlich.
              </p>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-heading font-medium mb-3">Urheberrecht</h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Die durch Caelex erstellten Inhalte und Werke auf diesen Seiten
                unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
                der Grenzen des Urheberrechtes bedürfen der schriftlichen
                Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und
                Kopien dieser Seite sind nur für den privaten, nicht
                kommerziellen Gebrauch gestattet.
              </p>
            </section>

            {/* EU Streitbeilegung */}
            <section>
              <h2 className="text-heading font-medium mb-3">Streitbeilegung</h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Die Europäische Kommission stellt unter{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#111827] hover:underline"
                >
                  ec.europa.eu/consumers/odr
                </a>{" "}
                eine Plattform zur Online-Streitbeilegung bereit. Wir sind weder
                bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/legal/terms"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                AGB
              </Link>
              <Link
                href="/legal/privacy"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Datenschutz
              </Link>
              <Link
                href="/legal/cookies"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Cookies
              </Link>
              <Link
                href="/legal/dpa"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                DPA
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
