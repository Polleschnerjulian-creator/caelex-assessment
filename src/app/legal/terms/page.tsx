import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/terms-en"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              English Version
            </Link>
          </div>

          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-4">
            Allgemeine Geschäftsbedingungen
          </h1>
          <p className="text-[13px] text-white/40 mb-8">
            Stand: Februar 2026 · Caelex, Berlin, Deutschland
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            {/* § 1 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 1 Geltungsbereich
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB")
                gelten für alle Verträge zwischen Caelex, vertreten durch Julian
                Polleschner, Am Maselakepark 37, 13587 Berlin (nachfolgend
                "Anbieter") und dem Nutzer (nachfolgend "Kunde") über die
                Nutzung der Caelex-Plattform und der damit verbundenen
                Dienstleistungen, einschließlich des kostenlosen EU Space Act
                Compliance Assessments, des Compliance-Dashboards und
                zukünftiger kostenpflichtiger Module.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Abweichende Bedingungen des Kunden werden nicht anerkannt,
                es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich
                schriftlich zu.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Diese AGB gelten sowohl für Verbraucher als auch für
                Unternehmer, es sei denn, in der jeweiligen Klausel wird eine
                Differenzierung vorgenommen.
              </p>
            </section>

            {/* § 2 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 2 Vertragsgegenstand
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Gegenstand des Vertrages ist die Bereitstellung der
                Caelex-Plattform zur Unterstützung bei der Compliance mit dem EU
                Space Act (COM(2025) 335), der NIS2-Richtlinie (EU 2022/2555)
                und nationalen Weltraumgesetzen.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Die Plattform bietet folgende Leistungen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  Compliance-Assessments zur Feststellung der Anwendbarkeit
                  regulatorischer Anforderungen
                </li>
                <li>Dashboard zur Verwaltung von Compliance-Anforderungen</li>
                <li>Dokumentenmanagement und Audit-Trail</li>
                <li>ASTRA KI-Assistent für regulatorische Fragen</li>
                <li>Informationsressourcen zum EU Space Act und NIS2</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Die Plattform stellt keine Rechtsberatung dar. Für
                verbindliche rechtliche Einschätzungen ist qualifizierter
                Rechtsrat einzuholen.
              </p>
            </section>

            {/* § 3 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 3 Geistiges Eigentum
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Alle Inhalte der Plattform, einschließlich, aber nicht
                beschränkt auf Quellcode, regulatorische Mappings,
                Compliance-Algorithmen, Assessment-Logik, Datenstrukturen,
                Benutzeroberflächen-Designs, Texte, Grafiken, Logos und
                Dokumentation, sind ausschließliches Eigentum des Anbieters oder
                seiner Lizenzgeber und durch Urheberrecht, Geschäftsgeheimnis
                und andere geistige Eigentumsrechte geschützt.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Die regulatorischen Mapping-Daten, Compliance-Checklisten,
                Entscheidungsbäume und Assessment-Algorithmen der Plattform
                stellen erhebliche Forschungs- und Entwicklungsinvestitionen dar
                und sind proprietäre Geschäftsgeheimnisse des Anbieters.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Der Kunde erhält ein beschränktes, nicht ausschließliches,
                nicht übertragbares, widerrufliches Recht zur Nutzung der
                Plattform für ihren bestimmungsgemäßen Zweck während der
                Vertragslaufzeit. Diese Lizenz beinhaltet kein Recht zur
                Unterlizenzierung, Verbreitung oder Erstellung abgeleiteter
                Werke.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Die Inhalte der Plattform dürfen ohne vorherige schriftliche
                Zustimmung des Anbieters nicht vervielfältigt, verbreitet,
                modifiziert, öffentlich zugänglich gemacht oder anderweitig
                verwertet werden.
              </p>
            </section>

            {/* § 4 - Prohibited Activities */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 4 Verbotene Aktivitäten
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die folgenden Aktivitäten sind strikt untersagt und stellen eine
                wesentliche Vertragsverletzung dar:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-3 space-y-3">
                <li>
                  <strong className="text-white/80">
                    Reverse Engineering:
                  </strong>{" "}
                  Dekompilierung, Disassemblierung oder jeglicher Versuch, den
                  Quellcode, Algorithmen, Datenstrukturen oder die
                  Geschäftslogik der Plattform abzuleiten.
                </li>
                <li>
                  <strong className="text-white/80">
                    Automatisierte Datenextraktion:
                  </strong>{" "}
                  Scraping, Crawling, Spidering oder jegliches automatisierte
                  oder systematische Herunterladen von Daten, regulatorischen
                  Mappings oder Inhalten von der Plattform.
                </li>
                <li>
                  <strong className="text-white/80">
                    Wettbewerbliche Nutzung:
                  </strong>{" "}
                  Nutzung von Daten, Inhalten, Algorithmen oder Know-how, das
                  von der Plattform erhalten wurde, direkt oder indirekt, um
                  konkurrierende Produkte oder Dienstleistungen zu erstellen, zu
                  verbessern, zu trainieren oder zu entwickeln.
                </li>
                <li>
                  <strong className="text-white/80">
                    Unberechtigter Zugriff:
                  </strong>{" "}
                  Versuche, auf Systeme oder Netzwerke im Zusammenhang mit der
                  Plattform zuzugreifen, diese zu testen oder deren
                  Schwachstellen zu prüfen, oder Sicherheits- oder
                  Authentifizierungsmaßnahmen zu umgehen.
                </li>
                <li>
                  <strong className="text-white/80">API-Missbrauch:</strong>{" "}
                  Übermäßige oder automatisierte API-Anfragen, Umgehung von
                  Rate-Limits oder Nutzung der API in einer Weise, die nicht
                  ausdrücklich von Caelex autorisiert ist.
                </li>
                <li>
                  <strong className="text-white/80">
                    Inhaltsveröffentlichung:
                  </strong>{" "}
                  Neuveröffentlichung, Weiterverteilung oder Bereitstellung
                  wesentlicher Teile der regulatorischen Daten,
                  Compliance-Assessments oder Plattforminhalte an Dritte.
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Der Anbieter behält sich das Recht vor, den Zugang sofort zu
                beenden und alle verfügbaren Rechtsmittel, einschließlich
                einstweiliger Verfügungen und Schadensersatz, gegen jede Person
                oder juristische Person zu verfolgen, die verbotene Aktivitäten
                durchführt.
              </p>
            </section>

            {/* § 5 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 5 Kostenloses Assessment-Tool
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Das EU Space Act Compliance Assessment-Tool wird kostenlos
                für die individuelle Nutzung bereitgestellt. Es soll
                Weltraumbetreibern ein erstes Verständnis dafür vermitteln, wie
                der EU Space Act auf ihre Tätigkeiten anwendbar sein könnte.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Die Assessment-Ergebnisse werden auf Basis des
                Verordnungsvorschlags (COM(2025) 335) generiert und können sich
                im Laufe des Gesetzgebungsprozesses ändern. Die Ergebnisse
                stellen keine definitive Feststellung regulatorischer
                Verpflichtungen dar.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Generierte Compliance-Berichte sind nur für die persönliche
                Nutzung des anfragenden Nutzers bestimmt. Berichte enthalten
                eindeutige Kennungen und Wasserzeichen. Die Weiterverbreitung
                von Berichten ohne Genehmigung ist untersagt.
              </p>
            </section>

            {/* § 6 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 6 Kostenpflichtige Dienste
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Die aktuellen Preise ergeben sich aus der Preisliste auf der
                Website oder dem individuellen Angebot.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Alle Preise verstehen sich zuzüglich der gesetzlichen
                Mehrwertsteuer.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Die Zahlung erfolgt per SEPA-Lastschrift, Kreditkarte oder
                auf Rechnung über unseren Zahlungsdienstleister Stripe, je nach
                gewähltem Tarif und Vereinbarung.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang
                zur Plattform zu sperren.
              </p>
            </section>

            {/* § 7 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 7 Verfügbarkeit und SLA
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter bemüht sich um eine Verfügbarkeit der Plattform
                von 99,5% im Jahresmittel. Hiervon ausgenommen sind Zeiten, in
                denen die Plattform aufgrund von technischen oder sonstigen
                Problemen, die nicht im Einflussbereich des Anbieters liegen,
                nicht erreichbar ist (höhere Gewalt, Wartung).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Der Anbieter ist berechtigt, die Plattform für
                Wartungsarbeiten vorübergehend außer Betrieb zu setzen. Geplante
                Wartungsarbeiten werden mindestens 48 Stunden im Voraus per
                E-Mail oder In-App-Benachrichtigung angekündigt.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Bei Unterschreitung der garantierten Verfügbarkeit in
                Enterprise-Tarifen werden Gutschriften gemäß dem individuellen
                Service Level Agreement gewährt.
              </p>
            </section>

            {/* § 8 - Force Majeure */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 8 Höhere Gewalt
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Keine Partei haftet für Verzögerungen oder Nichterfüllung
                ihrer Verpflichtungen, wenn diese auf Umstände zurückzuführen
                sind, die außerhalb ihrer zumutbaren Kontrolle liegen,
                einschließlich, aber nicht beschränkt auf:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Naturkatastrophen, Epidemien oder Pandemien</li>
                <li>Krieg, Terrorismus, Aufstände oder Unruhen</li>
                <li>
                  Streiks, Aussperrungen oder andere Arbeitskampfmaßnahmen
                </li>
                <li>
                  Staatliche Handlungen, Gesetze, Verordnungen oder Embargos
                </li>
                <li>
                  Stromausfälle, Internet-Ausfälle oder Ausfall von
                  Drittanbieter-Diensten
                </li>
                <li>
                  Cyberangriffe, die trotz angemessener Sicherheitsmaßnahmen
                  erfolgen
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Die betroffene Partei muss die andere Partei unverzüglich
                über das Eintreten und die voraussichtliche Dauer des
                Ereignisses höherer Gewalt informieren.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Dauert ein Ereignis höherer Gewalt länger als 90 Tage, kann
                jede Partei den Vertrag mit einer Frist von 30 Tagen kündigen.
              </p>
            </section>

            {/* § 9 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 9 Haftung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe
                Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens,
                des Körpers oder der Gesundheit.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei
                Verletzung wesentlicher Vertragspflichten (Kardinalpflichten)
                und nur begrenzt auf den vorhersehbaren, vertragstypischen
                Schaden, maximal jedoch auf die vom Kunden in den letzten 12
                Monaten gezahlten Entgelte.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Die Haftung für mittelbare Schäden, insbesondere entgangenen
                Gewinn, Datenverlust oder Betriebsunterbrechung, ist
                ausgeschlossen, soweit gesetzlich zulässig.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Die vorstehenden Haftungsbeschränkungen gelten nicht für
                Ansprüche nach dem Produkthaftungsgesetz oder bei arglistigem
                Verschweigen von Mängeln.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) Die Plattform ersetzt keine professionelle Rechtsberatung.
                Der Anbieter übernimmt keine Haftung für Entscheidungen, die auf
                Basis der bereitgestellten Informationen oder KI-generierten
                Inhalte getroffen werden.
              </p>
            </section>

            {/* § 10 - Indemnification */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 10 Freistellung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Kunde stellt den Anbieter von allen Ansprüchen Dritter
                frei, die aus einer rechtswidrigen Nutzung der Plattform durch
                den Kunden resultieren, einschließlich, aber nicht beschränkt
                auf:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Verletzung dieser AGB oder der Nutzungsrichtlinien</li>
                <li>Verletzung von Rechten Dritter</li>
                <li>
                  Hochladen von rechtswidrigen oder rechtsverletzenden Inhalten
                </li>
                <li>
                  Verstoß gegen anwendbare Gesetze oder behördliche Vorschriften
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Die Freistellungspflicht umfasst auch die angemessenen
                Kosten der Rechtsverteidigung, einschließlich Anwalts- und
                Gerichtskosten.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Der Anbieter wird den Kunden unverzüglich über geltend
                gemachte Ansprüche informieren und ihm die Möglichkeit zur
                Verteidigung einräumen.
              </p>
            </section>

            {/* § 11 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 11 Datenschutz
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Die Erhebung und Verarbeitung personenbezogener Daten
                erfolgt gemäß unserer{" "}
                <Link
                  href="/legal/privacy"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Datenschutzerklärung
                </Link>
                .
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Soweit der Kunde uns personenbezogene Daten zur Verarbeitung
                überlässt, schließen wir auf Anfrage einen
                Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO ab.
              </p>
            </section>

            {/* § 12 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 12 Vertragslaufzeit und Kündigung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Kostenlose Accounts können jederzeit ohne Angabe von Gründen
                gekündigt werden.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Kostenpflichtige Tarife haben eine Mindestlaufzeit gemäß dem
                gewählten Abrechnungszeitraum (monatlich oder jährlich) und
                verlängern sich automatisch um den gleichen Zeitraum, wenn nicht
                mindestens 30 Tage vor Ablauf der Laufzeit gekündigt wird.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Die Kündigung bedarf der Textform (E-Mail an cs@caelex.eu
                ist ausreichend) oder kann über die Kontoeinstellungen erfolgen.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Das Recht zur außerordentlichen Kündigung aus wichtigem
                Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere
                vor bei wesentlicher Vertragsverletzung, wiederholtem Verstoß
                gegen diese AGB oder Insolvenz einer Partei.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (5) Mit Beendigung des Vertrages erlöschen alle eingeräumten
                Rechte. Der Kunde muss alle Kopien von Plattforminhalten in
                seinem Besitz vernichten oder löschen.
              </p>
            </section>

            {/* § 13 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 13 API-Nutzung
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Die Nutzung der Caelex API unterliegt zusätzlich zu diesen
                AGB den folgenden Bedingungen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  API-Schlüssel sind vertraulich zu behandeln und dürfen nicht
                  an Dritte weitergegeben werden
                </li>
                <li>Rate-Limits gemäß dem jeweiligen Tarif sind einzuhalten</li>
                <li>
                  Die API darf nicht für automatisierte Datenextraktion oder
                  Scraping verwendet werden
                </li>
                <li>Anwendungen müssen ordnungsgemäß authentifiziert sein</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Der Anbieter behält sich vor, API-Zugang bei Missbrauch oder
                Verstoß gegen diese Bedingungen sofort zu sperren.
              </p>
            </section>

            {/* § 14 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 14 Beta-Funktionen
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Von Zeit zu Zeit können wir Beta- oder Vorschau-Funktionen
                anbieten, die als "Beta", "Vorschau", "Experimentell" oder
                ähnlich gekennzeichnet sind.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Beta-Funktionen werden "wie besehen" ohne jegliche Garantie
                bereitgestellt und können jederzeit ohne Vorankündigung geändert
                oder eingestellt werden.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Die Nutzung von Beta-Funktionen erfolgt auf eigenes Risiko.
                Der Anbieter übernimmt keine Haftung für Schäden aus der Nutzung
                von Beta-Funktionen.
              </p>
            </section>

            {/* § 15 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 15 Änderungen der AGB
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Der Anbieter behält sich vor, diese AGB jederzeit zu ändern.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Änderungen werden dem Kunden mindestens 30 Tage vor
                Inkrafttreten per E-Mail mitgeteilt.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Widerspricht der Kunde nicht innerhalb von 30 Tagen nach
                Zugang der Änderungsmitteilung, gelten die geänderten AGB als
                akzeptiert. Der Kunde wird in der Änderungsmitteilung auf diese
                Rechtsfolge hingewiesen.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Im Falle eines Widerspruchs ist jede Partei berechtigt, den
                Vertrag zum Zeitpunkt des geplanten Inkrafttretens der Änderung
                zu kündigen.
              </p>
            </section>

            {/* § 16 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 16 Schlussbestimmungen
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                (1) Es gilt das Recht der Bundesrepublik Deutschland unter
                Ausschluss des UN-Kaufrechts (CISG).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (2) Ist der Kunde Kaufmann, juristische Person des öffentlichen
                Rechts oder öffentlich-rechtliches Sondervermögen, ist
                ausschließlicher Gerichtsstand für alle Streitigkeiten aus
                diesem Vertrag Berlin, Deutschland.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder
                werden, bleibt die Wirksamkeit der übrigen Bestimmungen
                unberührt. Anstelle der unwirksamen Bestimmung gilt eine
                Regelung, die dem wirtschaftlichen Zweck der unwirksamen
                Bestimmung am nächsten kommt.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                (4) Es bestehen keine mündlichen Nebenabreden. Änderungen und
                Ergänzungen dieses Vertrages bedürfen der Textform.
              </p>
            </section>

            {/* § 17 */}
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                § 17 Kontakt
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Caelex
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin, Deutschland
                <br />
                <br />
                Allgemeine Anfragen:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  cs@caelex.eu
                </a>
                <br />
                Rechtliche Anfragen:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  legal@caelex.eu
                </a>
                <br />
                Sicherheitsmeldungen:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  security@caelex.eu
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/30">
              Stand: Februar 2026 · Version 2.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/terms-en"
                className="text-[12px] text-emerald-400 hover:text-emerald-300"
              >
                English Version →
              </Link>
              <Link
                href="/legal/privacy"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Datenschutzerklärung
              </Link>
              <Link
                href="/legal/cookies"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Cookie-Richtlinie
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
