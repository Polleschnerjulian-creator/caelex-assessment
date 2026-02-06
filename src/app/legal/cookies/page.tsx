"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicyPage() {
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
            Cookie-Richtlinie
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Was sind Cookies?
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Cookies sind kleine Textdateien, die auf Ihrem Computer oder
                mobilen Gerät gespeichert werden, wenn Sie eine Website
                besuchen. Sie ermöglichen es der Website, Ihre Aktionen und
                Präferenzen (wie Login, Sprache, Schriftgröße und andere
                Anzeigeeinstellungen) über einen bestimmten Zeitraum zu
                speichern, damit Sie diese nicht bei jedem Besuch der Website
                oder beim Navigieren zwischen Seiten erneut eingeben müssen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Wie wir Cookies verwenden
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wir verwenden verschiedene Arten von Cookies für
                unterschiedliche Zwecke:
              </p>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Notwendige Cookies
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Diese Cookies sind für das Funktionieren der Website unbedingt
                erforderlich und können nicht abgeschaltet werden. Sie werden
                als Reaktion auf von Ihnen vorgenommene Aktionen gesetzt, wie
                z.B. das Anmelden oder das Ausfüllen von Formularen.
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Cookie</th>
                      <th className="pb-2">Zweck</th>
                      <th className="pb-2">Dauer</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">authjs.session-token</td>
                      <td className="py-2 pr-4">
                        Authentifizierung &amp; Sitzungsmanagement
                      </td>
                      <td className="py-2">24 Stunden</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">authjs.csrf-token</td>
                      <td className="py-2 pr-4">CSRF-Schutz</td>
                      <td className="py-2">Sitzung</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">authjs.callback-url</td>
                      <td className="py-2 pr-4">OAuth-Weiterleitung</td>
                      <td className="py-2">Sitzung</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Lokale Speicherung (localStorage)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wir verwenden localStorage (keine Cookies) für folgende Zwecke:
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Schlüssel</th>
                      <th className="pb-2">Zweck</th>
                      <th className="pb-2">Dauer</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">caelex-cookie-consent</td>
                      <td className="py-2 pr-4">
                        Speicherung Ihrer Cookie-Einwilligung
                      </td>
                      <td className="py-2">Unbegrenzt</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">caelex-theme</td>
                      <td className="py-2 pr-4">
                        Theme-Einstellung (Hell/Dunkel)
                      </td>
                      <td className="py-2">Unbegrenzt</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[15px] font-medium text-white/90 mt-6 mb-3">
                Analyse &amp; Fehlerverfolgung (nur mit Einwilligung)
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Folgende Dienste werden nur aktiviert, wenn Sie im Cookie-Banner
                &quot;Accept All&quot; wählen:
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-white/40">
                      <th className="pb-2">Dienst</th>
                      <th className="pb-2">Zweck</th>
                      <th className="pb-2">Cookies</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr>
                      <td className="py-2 pr-4">Vercel Analytics</td>
                      <td className="py-2 pr-4">Anonyme Nutzungsstatistiken</td>
                      <td className="py-2">Keine (cookieless)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Vercel Speed Insights</td>
                      <td className="py-2 pr-4">Performance-Monitoring</td>
                      <td className="py-2">Keine</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Sentry</td>
                      <td className="py-2 pr-4">
                        Fehlerverfolgung &amp; Session Replay
                      </td>
                      <td className="py-2">Ja (Sentry-Sitzung)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Cookies von Drittanbietern
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei Nutzung bestimmter Funktionen können Dienste von
                Drittanbietern eigene Cookies setzen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <strong className="text-white/80">Stripe</strong>{" "}
                  (Zahlungsabwicklung): Wird nur bei Upgrade auf einen
                  kostenpflichtigen Plan aktiviert
                </li>
                <li>
                  <strong className="text-white/80">Google OAuth</strong>{" "}
                  (Anmeldung): Wird nur bei Anmeldung über Google aktiviert
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Ihre Cookie-Einstellungen
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei Ihrem ersten Besuch auf unserer Website werden Sie über ein
                Banner um Ihre Einwilligung gebeten. Sie haben zwei
                Möglichkeiten:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <strong className="text-white/80">Accept All</strong> –
                  Notwendige Cookies + Analyse-Dienste (Vercel Analytics,
                  Sentry)
                </li>
                <li>
                  <strong className="text-white/80">Necessary Only</strong> –
                  Nur technisch notwendige Cookies für Authentifizierung und
                  Sicherheit
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie den
                Eintrag &quot;caelex-cookie-consent&quot; in Ihrem
                Browser-localStorage löschen. Alternativ können Sie alle
                Website-Daten über die Browser-Einstellungen löschen.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Cookies in Ihrem Browser verwalten
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die meisten Webbrowser erlauben die Kontrolle von Cookies über
                die Browsereinstellungen:
              </p>
              <ul className="list-disc list-inside text-[14px] text-white/60 leading-relaxed mt-4 space-y-2">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/de/kb/cookies-erlauben-und-ablehnen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/de-de/guide/safari/sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline"
                  >
                    Apple Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/de-de/microsoft-edge/cookies-in-microsoft-edge-löschen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
              <p className="text-[14px] text-white/60 leading-relaxed mt-4">
                Bitte beachten Sie, dass das Blockieren von Cookies die
                Funktionalität unserer Website beeinträchtigen kann,
                insbesondere die Anmeldung.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Rechtsgrundlage
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Die Rechtsgrundlage für die Verwendung von technisch notwendigen
                Cookies ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
                Für Analyse-Dienste (Vercel Analytics, Sentry) holen wir Ihre
                ausdrückliche Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO ein.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Kontakt
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Bei Fragen zu unserer Cookie-Richtlinie können Sie uns
                kontaktieren:
                <br />
                <br />
                Julian Polleschner
                <br />
                Am Maselakepark 37, 13587 Berlin
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:cs@caelex.eu"
                  className="text-white/80 hover:text-white underline"
                >
                  cs@caelex.eu
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-medium text-white mb-4">
                Änderungen dieser Richtlinie
              </h2>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Wir können diese Cookie-Richtlinie von Zeit zu Zeit
                aktualisieren. Änderungen werden auf dieser Seite
                veröffentlicht.
              </p>
            </section>
          </div>

          <p className="text-[12px] text-white/30 mt-12">Stand: Februar 2026</p>
        </div>
      </div>
    </main>
  );
}
