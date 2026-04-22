import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { FileText, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  ...genMeta({
    title: "Widerrufsbelehrung · Right-of-withdrawal notice",
    description:
      "Widerrufsbelehrung und Muster-Widerrufsformular für Verbraucher gemäß §§ 312g, 355 BGB. Caelex AGB V3.0 § 15.",
    path: "/legal/widerruf",
    keywords: ["Widerrufsrecht", "Widerrufsbelehrung", "Caelex", "§ 312g BGB"],
  }),
  alternates: {
    canonical: "https://www.caelex.eu/legal/widerruf",
  },
};

export default function WiderrufPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[820px] mx-auto">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
            <FileText size={12} />
            Verbraucherrecht · Consumer right
          </div>
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            Widerrufsbelehrung
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3">
            Right-of-withdrawal notice for consumers
          </p>
          <p className="text-body text-[#6B7280] mb-10">
            Stand · Effective: 18. April 2026 · Version 1.0 · Caelex, Berlin
          </p>

          <div className="mb-10 p-5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
            <AlertTriangle
              size={16}
              className="flex-shrink-0 text-amber-700 mt-0.5"
            />
            <p className="text-body text-[#4B5563] leading-relaxed">
              Diese Belehrung gilt ausschließlich für Verbraucher im Sinne des §
              13 BGB. Unternehmer i.S.d. § 14 BGB haben kein gesetzliches
              Widerrufsrecht. Die Informationen auf dieser Seite erfüllen die
              gesetzliche Belehrungspflicht nach Art. 246a EGBGB.
            </p>
          </div>

          <article className="prose prose-sm max-w-none space-y-8">
            {/* Widerrufsrecht */}
            <section>
              <h2 className="text-heading font-medium mb-3">Widerrufsrecht</h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen
                diesen Vertrag zu widerrufen.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Die Widerrufsfrist beträgt 14 Tage ab dem Tag des
                Vertragsschlusses.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
              </p>
              <div className="mt-3 p-4 rounded-lg bg-white border border-[#E5E7EB] text-body text-[#4B5563]">
                Caelex
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin, Deutschland
                <br />
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-[#111827] hover:underline"
                >
                  legal@caelex.eu
                </a>
              </div>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                mittels einer eindeutigen Erklärung (z. B. ein mit der Post
                versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen
                Vertrag zu widerrufen, informieren. Sie können dafür das
                nachstehende Muster-Widerrufsformular verwenden, das jedoch
                nicht vorgeschrieben ist.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die
                Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der
                Widerrufsfrist absenden.
              </p>
            </section>

            {/* Folgen */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Folgen des Widerrufs
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle
                Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und
                spätestens binnen 14 Tagen ab dem Tag zurückzuzahlen, an dem die
                Mitteilung über Ihren Widerruf dieses Vertrages bei uns
                eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
                Zahlungsmittel, das Sie bei der ursprünglichen Transaktion
                eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich
                etwas anderes vereinbart; in keinem Fall werden Ihnen wegen
                dieser Rückzahlung Entgelte berechnet.
              </p>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Haben Sie verlangt, dass die Dienstleistungen oder die Lieferung
                digitaler Inhalte während der Widerrufsfrist beginnen sollen, so
                haben Sie uns einen angemessenen Betrag zu zahlen, der dem
                Anteil der bis zum Zeitpunkt, zu dem Sie uns von der Ausübung
                des Widerrufsrechts hinsichtlich dieses Vertrages unterrichten,
                bereits erbrachten Dienstleistungen im Vergleich zum
                Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen
                entspricht.
              </p>
            </section>

            {/* Erlöschen */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Vorzeitiges Erlöschen des Widerrufsrechts
              </h2>
              <p className="text-body-lg text-[#4B5563] leading-relaxed">
                Das Widerrufsrecht erlischt bei einem Vertrag über die Lieferung
                von nicht auf einem körperlichen Datenträger befindlichen
                digitalen Inhalten gemäß § 356 Abs. 5 BGB, wenn wir mit der
                Ausführung des Vertrages begonnen haben, nachdem
              </p>
              <ol className="list-decimal list-inside text-body-lg text-[#4B5563] mt-3 space-y-1">
                <li>
                  Sie ausdrücklich zugestimmt haben, dass wir mit der Ausführung
                  des Vertrages vor Ablauf der Widerrufsfrist beginnen,
                </li>
                <li>
                  Sie Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre
                  Zustimmung mit Beginn der Ausführung des Vertrages Ihr
                  Widerrufsrecht verlieren, und
                </li>
                <li>
                  wir Ihnen eine Bestätigung gemäß § 312f Abs. 3 BGB zur
                  Verfügung gestellt haben.
                </li>
              </ol>
              <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3">
                Bei kostenpflichtigen Abonnements und API-Zugängen werden Sie im
                Bestellprozess ausdrücklich um diese Zustimmungen gebeten.
              </p>
            </section>

            {/* Muster */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                Muster-Widerrufsformular
              </h2>
              <p className="text-body text-[#6B7280] italic mb-3">
                (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte
                dieses Formular aus und senden Sie es zurück.)
              </p>
              <div className="p-5 rounded-xl bg-white border border-[#E5E7EB] text-body text-[#4B5563] leading-relaxed whitespace-pre-line">
                {`An:
Caelex
Julian Polleschner
Am Maselakepark 37
13587 Berlin, Deutschland
E-Mail: legal@caelex.eu

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag
über die Erbringung der folgenden Dienstleistung (*)

_________________________________________________________________

Bestellt am (*) / erhalten am (*): _______________________________

Name des/der Verbraucher(s): _____________________________________

Anschrift des/der Verbraucher(s):
_________________________________________________________________
_________________________________________________________________

Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)

_________________________________________________________________

Datum: _______________________

(*) Unzutreffendes streichen.`}
              </div>
            </section>

            {/* English summary */}
            <section>
              <h2 className="text-heading font-medium mb-3">
                English summary (non-binding)
              </h2>
              <p className="text-body text-[#6B7280] leading-relaxed italic">
                Consumers have a statutory 14-day withdrawal right after
                conclusion of the contract, under German Sections 312g, 355 BGB.
                The right expires for digital-content contracts where
                performance starts with the consumer&rsquo;s express consent,
                the consumer acknowledges loss of the withdrawal right, and the
                provider confirms the consent in text form (Section 356(5) BGB).
                This English summary is non-binding; the German text above is
                legally authoritative.
              </p>
            </section>
          </article>

          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/legal/terms"
                className="text-small text-[#111827] hover:underline"
              >
                AGB (§ 15) →
              </Link>
              <Link
                href="/legal/privacy"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Datenschutz
              </Link>
              <Link
                href="/legal/impressum"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Impressum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
