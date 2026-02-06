"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
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
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-8">
            Datenschutzerklärung
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                1. Datenschutz auf einen Blick
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Allgemeine Hinweise
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die folgenden Hinweise geben einen einfachen Überblick darüber,
                was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
                Website besuchen. Personenbezogene Daten sind alle Daten, mit
                denen Sie persönlich identifiziert werden können.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Datenerfassung auf dieser Website
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                <strong className="text-white/80">
                  Wer ist verantwortlich für die Datenerfassung auf dieser
                  Website?
                </strong>
                <br />
                Die Datenverarbeitung auf dieser Website erfolgt durch den
                Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum
                dieser Website entnehmen.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                <strong className="text-white/80">
                  Wie erfassen wir Ihre Daten?
                </strong>
                <br />
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
                mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie
                in ein Kontaktformular eingeben. Andere Daten werden automatisch
                oder nach Ihrer Einwilligung beim Besuch der Website durch
                unsere IT-Systeme erfasst. Das sind vor allem technische Daten
                (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des
                Seitenaufrufs).
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                <strong className="text-white/80">
                  Wofür nutzen wir Ihre Daten?
                </strong>
                <br />
                Ein Teil der Daten wird erhoben, um eine fehlerfreie
                Bereitstellung der Website zu gewährleisten. Andere Daten können
                zur Analyse Ihres Nutzerverhaltens verwendet werden.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                <strong className="text-white/80">
                  Welche Rechte haben Sie bezüglich Ihrer Daten?
                </strong>
                <br />
                Sie haben jederzeit das Recht, unentgeltlich Auskunft über
                Herkunft, Empfänger und Zweck Ihrer gespeicherten
                personenbezogenen Daten zu erhalten. Sie haben außerdem ein
                Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
                Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben,
                können Sie diese Einwilligung jederzeit für die Zukunft
                widerrufen. Außerdem haben Sie das Recht, unter bestimmten
                Umständen die Einschränkung der Verarbeitung Ihrer
                personenbezogenen Daten zu verlangen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                2. Hosting
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wir hosten die Inhalte unserer Website bei Vercel Inc., 340 S
                Lemon Ave #4133, Walnut, CA 91789, USA.
                <br />
                <br />
                Vercel ist Empfänger Ihrer personenbezogenen Daten und als
                Auftragsverarbeiter für uns tätig. Dies entspricht unserem
                berechtigten Interesse im Sinne des Art. 6 Abs. 1 S. 1 lit. f
                DSGVO, selbst keinen Server in unseren Räumlichkeiten vorhalten
                zu müssen.
                <br />
                <br />
                Vercel hat Compliance-Maßnahmen für internationale
                Datenübermittlungen umgesetzt. Diese gelten für alle weltweiten
                Aktivitäten, bei denen Vercel personenbezogene Daten von
                natürlichen Personen in der EU verarbeitet.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                3. Allgemeine Hinweise und Pflichtinformationen
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Datenschutz
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen
                Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
                vertraulich und entsprechend den gesetzlichen
                Datenschutzvorschriften sowie dieser Datenschutzerklärung.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Hinweis zur verantwortlichen Stelle
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser
                Website ist:
                <br />
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37
                <br />
                13587 Berlin
                <br />
                E-Mail: cs@caelex.eu
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Speicherdauer
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Soweit innerhalb dieser Datenschutzerklärung keine speziellere
                Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
                Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt.
                Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine
                Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten
                gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe
                für die Speicherung Ihrer personenbezogenen Daten haben.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Widerruf Ihrer Einwilligung zur Datenverarbeitung
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Viele Datenverarbeitungsvorgänge sind nur mit Ihrer
                ausdrücklichen Einwilligung möglich. Sie können eine bereits
                erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit
                der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom
                Widerruf unberührt.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Beschwerderecht bei der zuständigen Aufsichtsbehörde
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein
                Beschwerderecht bei einer Aufsichtsbehörde zu. Das
                Beschwerderecht besteht unbeschadet anderweitiger
                verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Recht auf Datenübertragbarkeit
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Sie haben das Recht, Daten, die wir auf Grundlage Ihrer
                Einwilligung oder in Erfüllung eines Vertrags automatisiert
                verarbeiten, an sich oder an einen Dritten in einem gängigen,
                maschinenlesbaren Format aushändigen zu lassen.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Auskunft, Löschung und Berichtigung
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
                jederzeit das Recht auf unentgeltliche Auskunft über Ihre
                gespeicherten personenbezogenen Daten, deren Herkunft und
                Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht
                auf Berichtigung oder Löschung dieser Daten.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                4. Datenerfassung auf dieser Website
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Cookies
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Unsere Internetseiten verwenden so genannte "Cookies". Cookies
                sind kleine Datenpakete und richten auf Ihrem Endgerät keinen
                Schaden an. Sie werden entweder vorübergehend für die Dauer
                einer Sitzung (Session-Cookies) oder dauerhaft (permanente
                Cookies) auf Ihrem Endgerät gespeichert.
                <br />
                <br />
                Sie können Ihren Browser so einstellen, dass Sie über das Setzen
                von Cookies informiert werden und Cookies nur im Einzelfall
                erlauben, die Annahme von Cookies für bestimmte Fälle oder
                generell ausschließen sowie das automatische Löschen der Cookies
                beim Schließen des Browsers aktivieren.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Kontaktformular
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen,
                werden Ihre Angaben aus dem Anfrageformular inklusive der von
                Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der
                Anfrage und für den Fall von Anschlussfragen bei uns
                gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung
                weiter.
                <br />
                <br />
                Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6
                Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines
                Vertrags zusammenhängt oder zur Durchführung vorvertraglicher
                Maßnahmen erforderlich ist.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Registrierung auf dieser Website
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Sie können sich auf dieser Website registrieren, um zusätzliche
                Funktionen auf der Seite zu nutzen. Die dazu eingegebenen Daten
                verwenden wir nur zum Zwecke der Nutzung des jeweiligen
                Angebotes oder Dienstes, für den Sie sich registriert haben.
                <br />
                <br />
                Die bei der Registrierung abgefragten Pflichtangaben müssen
                vollständig angegeben werden. Anderenfalls werden wir die
                Registrierung ablehnen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                5. Analyse-Tools und Werbung
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Vercel Analytics
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Diese Website nutzt Vercel Analytics, einen Webanalysedienst.
                Vercel Analytics verwendet keine Cookies und erfasst keine
                personenbezogenen Daten. Es werden lediglich aggregierte,
                anonymisierte Daten über die Nutzung der Website erhoben.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                6. Newsletter
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wenn Sie den auf der Website angebotenen Newsletter beziehen
                möchten, benötigen wir von Ihnen eine E-Mail-Adresse sowie
                Informationen, welche uns die Überprüfung gestatten, dass Sie
                der Inhaber der angegebenen E-Mail-Adresse sind und mit dem
                Empfang des Newsletters einverstanden sind.
                <br />
                <br />
                Die von Ihnen zum Zwecke des Newsletter-Bezugs bei uns
                hinterlegten Daten werden von uns bis zu Ihrer Austragung aus
                dem Newsletter gespeichert und nach der Abbestellung des
                Newsletters gelöscht.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                7. Ihre Rechte
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Sie haben folgende Rechte hinsichtlich Ihrer personenbezogenen
                Daten:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                <li>
                  Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)
                </li>
                <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Um Ihre Rechte auszuüben, kontaktieren Sie uns bitte unter
                cs@caelex.eu.
              </p>
            </section>
          </div>

          <p className="text-[12px] text-white/30 mt-12">Stand: Februar 2026</p>
        </div>
      </div>
    </main>
  );
}
