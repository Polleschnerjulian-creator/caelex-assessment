import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href="/legal/privacy-en"
              className="text-[12px] text-white/40 hover:text-white/60 transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              English Version
            </Link>
          </div>

          <h1 className="text-[32px] font-light tracking-[-0.02em] mb-4">
            Datenschutzerklärung
          </h1>
          <p className="text-[13px] text-white/40 mb-8">
            Stand: Februar 2026 · Caelex, Berlin, Deutschland
          </p>

          <div className="prose prose-invert prose-sm max-w-none space-y-10">
            {/* Section 1 - Overview */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                1. Datenschutz auf einen Blick
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Verantwortliche Stelle
              </h3>
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[14px] text-white/60">
                <p>
                  <strong className="text-white/80">Caelex</strong>
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
                    href="mailto:privacy@caelex.eu"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    privacy@caelex.eu
                  </a>
                  <br />
                  Allgemein:{" "}
                  <a
                    href="mailto:cs@caelex.eu"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    cs@caelex.eu
                  </a>
                </p>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Datenschutzbeauftragter
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Gemäß § 38 BDSG i.V.m. Art. 37 DSGVO ist die Benennung eines
                Datenschutzbeauftragten für uns derzeit nicht verpflichtend. Für
                alle Fragen zum Datenschutz wenden Sie sich bitte direkt an die
                oben genannte verantwortliche Stelle unter{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  privacy@caelex.eu
                </a>
                .
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Kurzübersicht der Datenverarbeitung
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Caelex ist eine Compliance-Plattform für den EU Space Act und
                verwandte Weltraumregulierung. Wir verarbeiten personenbezogene
                Daten ausschließlich zur Erbringung unserer Dienste, zur
                Verbesserung der Plattform und zur Erfüllung gesetzlicher
                Pflichten. Diese Datenschutzerklärung informiert Sie umfassend
                über Art, Umfang und Zweck der Datenverarbeitung.
              </p>

              <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-[13px] text-emerald-400 font-medium mb-2">
                  Ihre Rechte auf einen Blick
                </p>
                <ul className="text-[13px] text-white/60 space-y-1">
                  <li>
                    • Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)
                  </li>
                  <li>• Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
                  <li>• Löschung Ihrer Daten (Art. 17 DSGVO)</li>
                  <li>• Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>• Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>• Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
                  <li>
                    • Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)
                  </li>
                  <li>
                    • Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2 - Data Collection */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                2. Datenerfassung auf dieser Website
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.1 Automatisch erfasste Daten (Server-Logs)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei jedem Zugriff auf unsere Website werden automatisch
                technische Daten erfasst:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>IP-Adresse (anonymisiert nach 24 Stunden)</li>
                <li>Datum und Uhrzeit des Zugriffs</li>
                <li>Aufgerufene Seite/Ressource</li>
                <li>Browser-Typ und -Version</li>
                <li>Betriebssystem</li>
                <li>Referrer-URL</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Rechtsgrundlage:</strong> Art.
                6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Sicherheit
                und Stabilität der Website).
                <br />
                <strong className="text-white/80">Speicherdauer:</strong> 14
                Tage, danach automatische Löschung.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.2 Registrierung und Kundenkonto
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei der Registrierung erfassen wir:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>E-Mail-Adresse (Pflichtfeld)</li>
                <li>Name (optional)</li>
                <li>Unternehmen/Organisation (optional)</li>
                <li>Passwort (bcrypt-gehasht mit 12 Runden)</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Rechtsgrundlage:</strong> Art.
                6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
                <br />
                <strong className="text-white/80">Speicherdauer:</strong> Bis
                zur Löschung des Kontos plus gesetzliche Aufbewahrungsfristen.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.3 Compliance-Assessments
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei der Nutzung unserer Assessment-Tools verarbeiten wir:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Antworten auf Assessment-Fragen</li>
                <li>Berechnete Compliance-Profile</li>
                <li>Generierte Berichte und Empfehlungen</li>
                <li>Zeitstempel und Versionierung</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Rechtsgrundlage:</strong> Art.
                6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
                <br />
                <strong className="text-white/80">Speicherdauer:</strong> Bis
                zur Löschung durch den Nutzer oder Kontolöschung.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                2.4 Kontaktformular und E-Mail
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei Kontaktanfragen verarbeiten wir die von Ihnen mitgeteilten
                Daten (Name, E-Mail, Nachricht) zur Bearbeitung Ihrer Anfrage.
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Rechtsgrundlage:</strong> Art.
                6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) oder Art. 6
                Abs. 1 lit. f DSGVO (berechtigtes Interesse).
                <br />
                <strong className="text-white/80">Speicherdauer:</strong> 3
                Jahre nach Abschluss der Anfrage.
              </p>
            </section>

            {/* Section 3 - Third Party Services */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                3. Drittanbieter und Auftragsverarbeiter
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                Wir setzen folgende Dienstleister ein, die in unserem Auftrag
                personenbezogene Daten verarbeiten. Mit allen Dienstleistern
                bestehen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO.
              </p>

              {/* Hosting */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Vercel Inc. — Hosting & CDN
                </h4>
                <p className="text-[13px] text-white/60">
                  440 N Barranca Ave #4133, Covina, CA 91723, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  Website-Hosting, Content Delivery, Edge Functions
                  <br />
                  <strong className="text-white/70">Daten:</strong> IP-Adressen,
                  Request-Daten, Logs
                  <br />
                  <strong className="text-white/70">Garantien:</strong> EU-US
                  Data Privacy Framework, SCCs
                  <br />
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Database */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Neon Inc. — Datenbank
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  PostgreSQL-Datenbank für alle Anwendungsdaten
                  <br />
                  <strong className="text-white/70">Daten:</strong> Alle in der
                  Plattform gespeicherten Daten (verschlüsselt)
                  <br />
                  <strong className="text-white/70">Garantien:</strong> SOC 2
                  Type II, SCCs, Verschlüsselung at-rest
                  <br />
                  <a
                    href="https://neon.tech/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Payments */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Stripe Inc. — Zahlungsabwicklung
                </h4>
                <p className="text-[13px] text-white/60">
                  354 Oyster Point Blvd, South San Francisco, CA 94080, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong> Verarbeitung
                  von Zahlungen, Abonnementverwaltung
                  <br />
                  <strong className="text-white/70">Daten:</strong> E-Mail,
                  Name, Zahlungsinformationen, Rechnungsadresse
                  <br />
                  <strong className="text-white/70">Garantien:</strong> PCI DSS
                  Level 1, EU-US DPF, SCCs
                  <br />
                  <a
                    href="https://stripe.com/de/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Email */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Resend Inc. — E-Mail-Versand
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  Transaktionale E-Mails, Benachrichtigungen
                  <br />
                  <strong className="text-white/70">Daten:</strong>{" "}
                  E-Mail-Adressen, E-Mail-Inhalte, Öffnungsraten
                  <br />
                  <strong className="text-white/70">Garantien:</strong> SCCs
                  <br />
                  <a
                    href="https://resend.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* File Storage */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Cloudflare Inc. — Dateispeicherung (R2)
                </h4>
                <p className="text-[13px] text-white/60">
                  101 Townsend St, San Francisco, CA 94107, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong> Speicherung
                  von hochgeladenen Dokumenten
                  <br />
                  <strong className="text-white/70">Daten:</strong> Hochgeladene
                  Dateien, Metadaten
                  <br />
                  <strong className="text-white/70">Garantien:</strong> ISO
                  27001, SOC 2, EU-US DPF, SCCs
                  <br />
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Rate Limiting */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Upstash Inc. — Rate Limiting
                </h4>
                <p className="text-[13px] text-white/60">
                  San Francisco, CA, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  API-Rate-Limiting, Missbrauchsschutz
                  <br />
                  <strong className="text-white/70">Daten:</strong>{" "}
                  Anonymisierte Request-Identifier, Zähler
                  <br />
                  <strong className="text-white/70">Garantien:</strong> SOC 2,
                  SCCs
                  <br />
                  <a
                    href="https://upstash.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Error Tracking */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Sentry (Functional Software Inc.) — Fehlerverfolgung
                </h4>
                <p className="text-[13px] text-white/60">
                  45 Fremont Street, San Francisco, CA 94105, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  Fehlererkennung, Performance-Monitoring (nur mit Einwilligung)
                  <br />
                  <strong className="text-white/70">Daten:</strong>{" "}
                  Fehlerberichte, Browser-Informationen, anonymisierte
                  Session-Daten
                  <br />
                  <strong className="text-white/70">Garantien:</strong> SOC 2,
                  SCCs
                  <br />
                  <a
                    href="https://sentry.io/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Vercel Analytics — Nutzungsanalyse
                </h4>
                <p className="text-[13px] text-white/60">
                  <strong className="text-white/70">Zweck:</strong> Anonyme
                  Nutzungsstatistiken (nur mit Einwilligung)
                  <br />
                  <strong className="text-white/70">Daten:</strong> Aggregierte,
                  anonymisierte Seitenaufrufe
                  <br />
                  <strong className="text-white/70">Cookies:</strong> Keine
                  (cookieless)
                  <br />
                  <a
                    href="https://vercel.com/docs/analytics/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>

              {/* KI-Dienst */}
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] mt-4">
                <h4 className="text-[14px] font-medium text-white mb-2">
                  Anthropic PBC — KI-Assistent (ASTRA)
                </h4>
                <p className="text-[13px] text-white/60">
                  548 Market St, San Francisco, CA 94104, USA
                  <br />
                  <strong className="text-white/70">Zweck:</strong>{" "}
                  KI-gestützter Compliance-Assistent (ASTRA) — Beantwortung von
                  Fragen zu regulatorischen Anforderungen
                  <br />
                  <strong className="text-white/70">Daten:</strong> Textanfragen
                  der Nutzer, Kontext aus Compliance-Modulen (keine
                  personenbezogenen Daten, sofern nicht vom Nutzer eingegeben)
                  <br />
                  <strong className="text-white/70">Garantien:</strong> SCCs,
                  Zero Data Retention Policy (API-Anfragen werden nicht für
                  Trainingszwecke verwendet)
                  <br />
                  <strong className="text-white/70">Hinweis:</strong> Die
                  Nutzung von ASTRA ist freiwillig. Daten werden nur bei aktiver
                  Nutzung des KI-Assistenten übermittelt.
                  <br />
                  <a
                    href="https://www.anthropic.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[12px]"
                  >
                    Datenschutzerklärung →
                  </a>
                </p>
              </div>
            </section>

            {/* Section 4 - International Transfers */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                4. Internationale Datenübermittlung
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Einige unserer Dienstleister haben ihren Sitz in den USA. Die
                Übermittlung personenbezogener Daten in die USA erfolgt auf
                Grundlage folgender Garantien:
              </p>

              <div className="mt-4 space-y-3">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    EU-US Data Privacy Framework
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Für Dienstleister, die unter dem EU-US DPF zertifiziert sind
                    (Vercel, Stripe, Cloudflare), besteht ein
                    Angemessenheitsbeschluss der EU-Kommission gemäß Art. 45
                    DSGVO.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Standardvertragsklauseln (SCCs)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Zusätzlich oder alternativ zum DPF haben wir mit allen
                    US-Dienstleistern die von der EU-Kommission genehmigten
                    Standardvertragsklauseln abgeschlossen (Art. 46 Abs. 2 lit.
                    c DSGVO). Dies umfasst insbesondere Anthropic PBC, deren
                    Dienste über SCCs und eine Zero Data Retention Policy
                    abgesichert sind.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Zusätzliche technische Maßnahmen
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Alle Daten werden während der Übertragung (TLS 1.3) und im
                    Ruhezustand (AES-256) verschlüsselt. Sensible Daten
                    (Steuernummern, Bankdaten) werden zusätzlich mit AES-256-GCM
                    und abgeleitetem Schlüssel verschlüsselt.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 - AI and Automated Decision Making */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                5. KI und automatisierte Entscheidungsfindung
              </h2>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                5.1 ASTRA AI-Assistent
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Unsere Plattform nutzt den KI-Assistenten "ASTRA" zur
                Unterstützung bei Compliance-Fragen. ASTRA basiert auf Large
                Language Models und verarbeitet Ihre Anfragen wie folgt:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Ihre Textanfragen werden an den KI-Dienst übermittelt</li>
                <li>
                  Antworten werden auf Basis der Eingabe und unserer
                  Regulierungsdatenbank generiert
                </li>
                <li>Konversationshistorie wird temporär gespeichert</li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Wichtig:</strong> ASTRA trifft
                keine rechtlich bindenden Entscheidungen. Alle Ausgaben sind als
                Unterstützung zu verstehen und ersetzen keine Rechtsberatung.
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                5.2 Compliance-Assessment-Algorithmen
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Unsere Assessments verwenden regelbasierte Algorithmen zur
                Bestimmung der Anwendbarkeit von Regulierungen. Diese
                Algorithmen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>
                  Verarbeiten Ihre Antworten deterministisch (gleiche Eingabe =
                  gleiches Ergebnis)
                </li>
                <li>Treffen keine eigenständigen Entscheidungen</li>
                <li>
                  Liefern Empfehlungen, keine verbindlichen rechtlichen
                  Feststellungen
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                <strong className="text-white/80">Rechtsgrundlage:</strong> Art.
                6 Abs. 1 lit. b DSGVO. Es findet keine automatisierte
                Entscheidungsfindung im Sinne von Art. 22 DSGVO statt, da keine
                Entscheidungen mit rechtlicher Wirkung getroffen werden.
              </p>
            </section>

            {/* Section 6 - Data Retention */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                6. Speicherdauer
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                Wir speichern personenbezogene Daten nur so lange, wie es für
                die jeweiligen Zwecke erforderlich ist oder gesetzliche
                Aufbewahrungspflichten bestehen.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="py-3 pr-4">Datenkategorie</th>
                      <th className="py-3 pr-4">Speicherdauer</th>
                      <th className="py-3">Rechtsgrundlage</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Kontodaten</td>
                      <td className="py-3 pr-4">Bis Kontolöschung + 30 Tage</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. b DSGVO</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Assessment-Daten</td>
                      <td className="py-3 pr-4">Bis Löschung durch Nutzer</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. b DSGVO</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Server-Logs</td>
                      <td className="py-3 pr-4">14 Tage</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. f DSGVO</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Rechnungsdaten</td>
                      <td className="py-3 pr-4">10 Jahre (§ 147 AO)</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. c DSGVO</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Audit-Logs</td>
                      <td className="py-3 pr-4">7 Jahre</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. f DSGVO</td>
                    </tr>
                    <tr className="border-b border-white/[0.06]">
                      <td className="py-3 pr-4">Kontaktanfragen</td>
                      <td className="py-3 pr-4">3 Jahre nach Abschluss</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. f DSGVO</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Cookie-Einwilligung</td>
                      <td className="py-3 pr-4">Unbegrenzt (localStorage)</td>
                      <td className="py-3">Art. 6 Abs. 1 lit. c DSGVO</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 7 - Security */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                7. Datensicherheit
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                Wir setzen umfangreiche technische und organisatorische
                Maßnahmen zum Schutz Ihrer Daten ein:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Verschlüsselung
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• TLS 1.3 für alle Verbindungen</li>
                    <li>• AES-256 für Daten im Ruhezustand</li>
                    <li>• AES-256-GCM für sensible Felder</li>
                    <li>• Bcrypt (12 Runden) für Passwörter</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Zugriffsschutz
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• Rollenbasierte Zugriffskontrolle (RBAC)</li>
                    <li>• Zwei-Faktor-Authentifizierung (optional)</li>
                    <li>• Session-Management mit Timeout</li>
                    <li>• Brute-Force-Schutz</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Infrastruktur
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• ISO 27001 zertifizierte Rechenzentren</li>
                    <li>• SOC 2 Type II Compliance</li>
                    <li>• Regelmäßige Sicherheitsaudits</li>
                    <li>• DDoS-Schutz</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Monitoring
                  </h4>
                  <ul className="text-[13px] text-white/60 space-y-1">
                    <li>• Vollständiger Audit-Trail</li>
                    <li>• Security-Event-Logging</li>
                    <li>• Anomalie-Erkennung</li>
                    <li>• Incident Response Plan</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 8 - Data Breach */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                8. Datenpannen
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Im Falle einer Verletzung des Schutzes personenbezogener Daten
                (Datenpanne) handeln wir gemäß Art. 33 und 34 DSGVO:
              </p>

              <ul className="list-disc list-inside text-[14px] text-white/60 mt-3 space-y-2">
                <li>
                  <strong className="text-white/80">
                    Meldung an Aufsichtsbehörde:
                  </strong>{" "}
                  Innerhalb von 72 Stunden nach Bekanntwerden, sofern ein Risiko
                  für Betroffene besteht
                </li>
                <li>
                  <strong className="text-white/80">
                    Benachrichtigung Betroffener:
                  </strong>{" "}
                  Unverzüglich bei hohem Risiko, mit Beschreibung der Maßnahmen
                </li>
                <li>
                  <strong className="text-white/80">Dokumentation:</strong> Alle
                  Vorfälle werden dokumentiert, einschließlich Ursache,
                  Auswirkung und ergriffener Maßnahmen
                </li>
              </ul>

              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Sicherheitsvorfälle können Sie melden an:{" "}
                <a
                  href="mailto:security@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  security@caelex.eu
                </a>
              </p>
            </section>

            {/* Section 9 - Rights */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                9. Ihre Rechte im Detail
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Auskunftsrecht (Art. 15 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, eine Bestätigung darüber zu verlangen,
                    ob wir Sie betreffende personenbezogene Daten verarbeiten,
                    und gegebenenfalls Auskunft über diese Daten sowie eine
                    Kopie zu erhalten.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Recht auf Berichtigung (Art. 16 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, unverzüglich die Berichtigung
                    unrichtiger Daten sowie die Vervollständigung
                    unvollständiger Daten zu verlangen.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Recht auf Löschung (Art. 17 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, die Löschung Ihrer Daten zu verlangen,
                    sofern keine gesetzlichen Aufbewahrungspflichten oder
                    berechtigten Interessen entgegenstehen. Sie können Ihr Konto
                    jederzeit in den Einstellungen löschen.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Recht auf Einschränkung (Art. 18 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, die Einschränkung der Verarbeitung zu
                    verlangen, etwa wenn Sie die Richtigkeit der Daten
                    bestreiten oder die Verarbeitung unrechtmäßig ist.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, Ihre Daten in einem strukturierten,
                    gängigen und maschinenlesbaren Format zu erhalten (JSON/CSV
                    Export in den Kontoeinstellungen verfügbar).
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Widerspruchsrecht (Art. 21 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, aus Gründen, die sich aus Ihrer
                    besonderen Situation ergeben, der Verarbeitung Ihrer Daten
                    zu widersprechen, soweit diese auf berechtigtem Interesse
                    basiert.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie können erteilte Einwilligungen (z.B. für Analytics)
                    jederzeit widerrufen. Der Widerruf berührt nicht die
                    Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <h4 className="text-[14px] font-medium text-white mb-2">
                    Beschwerderecht (Art. 77 DSGVO)
                  </h4>
                  <p className="text-[13px] text-white/60">
                    Sie haben das Recht, sich bei einer
                    Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist:
                    <br />
                    <br />
                    Berliner Beauftragte für Datenschutz und
                    Informationsfreiheit
                    <br />
                    Friedrichstr. 219, 10969 Berlin
                    <br />
                    <a
                      href="mailto:mailbox@datenschutz-berlin.de"
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      mailbox@datenschutz-berlin.de
                    </a>
                  </p>
                </div>
              </div>

              <p className="text-[14px] text-white/60 leading-relaxed mt-6">
                <strong className="text-white/80">
                  So üben Sie Ihre Rechte aus:
                </strong>{" "}
                Senden Sie eine E-Mail an{" "}
                <a
                  href="mailto:privacy@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  privacy@caelex.eu
                </a>{" "}
                mit Angabe Ihres Anliegens. Wir werden Ihre Anfrage innerhalb
                von 30 Tagen bearbeiten.
              </p>
            </section>

            {/* Section 10 - Cookies */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                10. Cookies und Tracking
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Detaillierte Informationen zu den von uns verwendeten Cookies
                finden Sie in unserer{" "}
                <Link
                  href="/legal/cookies"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Cookie-Richtlinie
                </Link>
                .
              </p>
            </section>

            {/* Section 11 - B2B */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                11. Auftragsverarbeitung (B2B)
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Wenn Sie Caelex als Unternehmen nutzen und wir in Ihrem Auftrag
                personenbezogene Daten verarbeiten (z.B. Daten Ihrer
                Mitarbeiter), schließen wir auf Anfrage einen
                Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO ab.
              </p>

              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                Für Enterprise-Kunden bieten wir:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 mt-2 space-y-1">
                <li>Individuellen AVV nach Ihren Anforderungen</li>
                <li>Technische und organisatorische Maßnahmen (TOMs)</li>
                <li>Liste aller Unterauftragsverarbeiter</li>
                <li>Unterstützung bei Datenschutz-Folgenabschätzungen</li>
              </ul>

              <p className="text-[14px] text-white/60 leading-relaxed mt-3">
                Kontakt:{" "}
                <a
                  href="mailto:legal@caelex.eu"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  legal@caelex.eu
                </a>
              </p>
            </section>

            {/* Section 12 - Changes */}
            <section>
              <h2 className="text-[20px] font-medium text-white mb-6">
                12. Änderungen dieser Datenschutzerklärung
              </h2>

              <p className="text-[14px] text-white/60 leading-relaxed">
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um
                sie an geänderte Rechtslagen oder bei Änderungen des Dienstes
                anzupassen. Die aktuelle Version ist stets auf dieser Seite
                verfügbar. Bei wesentlichen Änderungen informieren wir
                registrierte Nutzer per E-Mail.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/30">
              Stand: Februar 2026 · Version 2.0
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/legal/privacy-en"
                className="text-[12px] text-emerald-400 hover:text-emerald-300"
              >
                English Version →
              </Link>
              <Link
                href="/legal/cookies"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                Cookie-Richtlinie
              </Link>
              <Link
                href="/legal/terms"
                className="text-[12px] text-white/40 hover:text-white/60"
              >
                AGB
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
