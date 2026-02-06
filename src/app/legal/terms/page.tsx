"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Zurück</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-8">
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 1 Geltungsbereich
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB")
                gelten für alle Verträge zwischen der Caelex GmbH (nachfolgend
                "Anbieter") und dem Nutzer (nachfolgend "Kunde") über die
                Nutzung der Caelex-Plattform und der damit verbundenen
                Dienstleistungen.
                <br />
                <br />
                (2) Abweichende Bedingungen des Kunden werden nicht anerkannt,
                es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich
                schriftlich zu.
                <br />
                <br />
                (3) Diese AGB gelten sowohl für Verbraucher als auch für
                Unternehmer, es sei denn, in der jeweiligen Klausel wird eine
                Differenzierung vorgenommen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 2 Vertragsgegenstand
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Gegenstand des Vertrages ist die Bereitstellung der
                Caelex-Plattform zur Unterstützung bei der Compliance mit dem EU
                Space Act (COM(2025) 335).
                <br />
                <br />
                (2) Die Plattform bietet folgende Leistungen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-2 space-y-1">
                <li>
                  Compliance-Assessment zur Feststellung der Anwendbarkeit des
                  EU Space Act
                </li>
                <li>Dashboard zur Verwaltung von Compliance-Anforderungen</li>
                <li>Dokumentenmanagement und Audit-Trail</li>
                <li>Informationsressourcen zum EU Space Act</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                (3) Die Plattform stellt keine Rechtsberatung dar. Für
                verbindliche rechtliche Einschätzungen ist qualifizierter
                Rechtsrat einzuholen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 3 Vertragsschluss
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Die Darstellung der Leistungen auf der Website stellt kein
                rechtlich bindendes Angebot, sondern eine Aufforderung zur
                Abgabe eines Angebots dar.
                <br />
                <br />
                (2) Durch die Registrierung auf der Plattform gibt der Kunde ein
                verbindliches Angebot zum Abschluss eines Nutzungsvertrages ab.
                <br />
                <br />
                (3) Der Vertrag kommt durch die Freischaltung des Kundenkontos
                durch den Anbieter zustande.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 4 Pflichten des Kunden
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Kunde verpflichtet sich, bei der Registrierung
                wahrheitsgemäße und vollständige Angaben zu machen und diese
                aktuell zu halten.
                <br />
                <br />
                (2) Der Kunde ist für die Geheimhaltung seiner Zugangsdaten
                verantwortlich und hat diese vor dem Zugriff Dritter zu
                schützen.
                <br />
                <br />
                (3) Der Kunde darf die Plattform nicht missbräuchlich nutzen,
                insbesondere nicht:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-2 space-y-1">
                <li>Rechte Dritter verletzen</li>
                <li>Gegen geltendes Recht verstoßen</li>
                <li>Die technische Infrastruktur gefährden</li>
                <li>Automatisierte Abfragen ohne Genehmigung durchführen</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 5 Preise und Zahlung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Die aktuellen Preise ergeben sich aus der Preisliste auf der
                Website oder dem individuellen Angebot.
                <br />
                <br />
                (2) Alle Preise verstehen sich zuzüglich der gesetzlichen
                Mehrwertsteuer.
                <br />
                <br />
                (3) Die Zahlung erfolgt per SEPA-Lastschrift, Kreditkarte oder
                auf Rechnung, je nach gewähltem Tarif und Vereinbarung.
                <br />
                <br />
                (4) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang
                zur Plattform zu sperren.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 6 Verfügbarkeit
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter bemüht sich um eine Verfügbarkeit der Plattform
                von 99,5% im Jahresmittel. Hiervon ausgenommen sind Zeiten, in
                denen die Plattform aufgrund von technischen oder sonstigen
                Problemen, die nicht im Einflussbereich des Anbieters liegen,
                nicht erreichbar ist.
                <br />
                <br />
                (2) Der Anbieter ist berechtigt, die Plattform für
                Wartungsarbeiten vorübergehend außer Betrieb zu setzen. Geplante
                Wartungsarbeiten werden rechtzeitig angekündigt.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 7 Haftung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe
                Fahrlässigkeit.
                <br />
                <br />
                (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei
                Verletzung wesentlicher Vertragspflichten (Kardinalpflichten)
                und nur begrenzt auf den vorhersehbaren, vertragstypischen
                Schaden.
                <br />
                <br />
                (3) Die Haftung für mittelbare Schäden, insbesondere entgangenen
                Gewinn, ist ausgeschlossen, soweit gesetzlich zulässig.
                <br />
                <br />
                (4) Die vorstehenden Haftungsbeschränkungen gelten nicht für
                Schäden aus der Verletzung des Lebens, des Körpers oder der
                Gesundheit sowie für Ansprüche nach dem Produkthaftungsgesetz.
                <br />
                <br />
                (5) Die Plattform ersetzt keine professionelle Rechtsberatung.
                Der Anbieter übernimmt keine Haftung für Entscheidungen, die auf
                Basis der bereitgestellten Informationen getroffen werden.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 8 Datenschutz
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die Erhebung und Verarbeitung personenbezogener Daten erfolgt
                gemäß unserer{" "}
                <Link
                  href="/legal/privacy"
                  className="text-white/80 hover:text-white underline"
                >
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 9 Vertragslaufzeit und Kündigung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Kostenlose Accounts können jederzeit ohne Angabe von Gründen
                gekündigt werden.
                <br />
                <br />
                (2) Kostenpflichtige Tarife haben eine Mindestlaufzeit gemäß dem
                gewählten Abrechnungszeitraum (monatlich oder jährlich) und
                verlängern sich automatisch, wenn nicht fristgerecht gekündigt
                wird.
                <br />
                <br />
                (3) Die Kündigung bedarf der Textform (E-Mail ist ausreichend).
                <br />
                <br />
                (4) Das Recht zur außerordentlichen Kündigung aus wichtigem
                Grund bleibt unberührt.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 10 Geistiges Eigentum
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Alle Inhalte der Plattform, einschließlich Texte, Grafiken,
                Logos und Software, sind Eigentum des Anbieters oder seiner
                Lizenzgeber und urheberrechtlich geschützt.
                <br />
                <br />
                (2) Der Kunde erhält ein einfaches, nicht übertragbares
                Nutzungsrecht für die Dauer des Vertrages.
                <br />
                <br />
                (3) Die Inhalte der Plattform dürfen nicht ohne schriftliche
                Genehmigung vervielfältigt, verbreitet oder anderweitig
                verwertet werden.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 11 Änderungen der AGB
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter behält sich vor, diese AGB jederzeit zu ändern.
                <br />
                <br />
                (2) Änderungen werden dem Kunden mindestens 30 Tage vor
                Inkrafttreten per E-Mail mitgeteilt.
                <br />
                <br />
                (3) Widerspricht der Kunde nicht innerhalb von 30 Tagen nach
                Zugang der Änderungsmitteilung, gelten die geänderten AGB als
                akzeptiert.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 12 Schlussbestimmungen
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Es gilt das Recht der Bundesrepublik Deutschland unter
                Ausschluss des UN-Kaufrechts.
                <br />
                <br />
                (2) Ist der Kunde Kaufmann, juristische Person des öffentlichen
                Rechts oder öffentlich-rechtliches Sondervermögen, ist
                ausschließlicher Gerichtsstand für alle Streitigkeiten aus
                diesem Vertrag der Geschäftssitz des Anbieters.
                <br />
                <br />
                (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder
                werden, bleibt die Wirksamkeit der übrigen Bestimmungen
                unberührt.
              </p>
            </section>
          </div>

          <p className="text-[12px] text-white/30 mt-12">Stand: Februar 2026</p>
        </div>
      </div>
    </main>
  );
}
