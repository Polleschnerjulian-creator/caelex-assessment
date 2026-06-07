/**
 * Caelex Scholar — Cookie-/Speicher-Hinweis (DE, verbindlich).
 *
 * ScholarLegalDoc-Inhalt für /scholar/legal/cookies. Die Chrome (DRAFT-Banner,
 * Stand/Version-Zeile) liefert LegalDoc.tsx; diese Datei trägt nur Text.
 *
 * Tatsächlicher Stand gegen den Code geprüft (Branch feat/caelex-scholar):
 *   • NextAuth v5, Session-Strategie "jwt", maxAge 24 h (src/lib/auth.ts:130-189).
 *   • Cookies (alle httpOnly): Session-Token, Callback-URL, CSRF-Token —
 *     in Produktion mit __Secure-/__Host-Präfix.
 *   • Scholar UI-Sprache wird SERVERSEITIG in ScholarUserPreferences.uiLanguage
 *     (DB) gespeichert — KEIN Sprach-Cookie, KEIN localStorage in (scholar).
 *   • Im gesamten (scholar)-Baum: kein localStorage/sessionStorage; kein
 *     Consent-Banner und keine Analytics im Scholar-Shell montiert.
 */
import type { ScholarLegalDoc } from "../_components/types";

export const COOKIES_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Cookie- und Speicher-Hinweis",
  subtitle: "Caelex Scholar",
  version: "1.0",
  lastUpdated: "7. Juni 2026",
  preamble: [
    "Dieser Hinweis erklärt, welche Cookies und vergleichbaren Speichertechnologien Caelex Scholar in Ihrem Endgerät einsetzt, zu welchem Zweck, auf welcher Rechtsgrundlage und für welche Dauer. Er ergänzt die Datenschutzerklärung von Caelex Scholar.",
    "Caelex Scholar ist eine über Ihre Hochschule lizenzierte, anmeldepflichtige (SSO-gestützte) Rechtsrecherche-Datenbank. Sie ist für Sie kostenfrei.",
  ],
  sections: [
    {
      id: "s1",
      number: "§ 1",
      title: "Verantwortlicher und Rollen",
      blocks: [
        {
          type: "p",
          text: "Verantwortlicher für die technisch notwendigen Speichervorgänge im Rahmen des Betriebs von Caelex Scholar im Sinne des § 25 TDDDG und der DSGVO ist:",
        },
        {
          type: "ul",
          items: [
            "Caelex — Einzelunternehmen, Inhaber: Julian Polleschner",
            "Am Maselakepark 37, 13587 Berlin, Deutschland",
            "Kleinunternehmer gemäß § 19 UStG",
            "E-Mail: cs@caelex.eu · Datenschutz: privacy@caelex.eu",
          ],
        },
        {
          type: "p",
          text: "Caelex Scholar wird im Modell „Anbieter an Hochschule an Studierende“ (B2B2C) bereitgestellt. Soweit Caelex Daten im Auftrag der lizenzierenden Hochschule verarbeitet, ist die Hochschule Verantwortliche und Caelex Auftragsverarbeiter; für die hier beschriebenen, ausschließlich technisch notwendigen Speichervorgänge zum Betrieb und zur Sicherheit des Dienstes handelt Caelex als eigener Verantwortlicher. Einzelheiten zur Rollenverteilung enthält die Datenschutzerklärung.",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Was sind Cookies und vergleichbare Technologien?",
      blocks: [
        {
          type: "p",
          text: "Cookies sind kleine Textdateien, die eine Website in Ihrem Browser ablegt und bei späteren Anfragen wieder ausliest. Zu den vergleichbaren Technologien zählen der lokale Speicher des Browsers (LocalStorage, SessionStorage), IndexedDB sowie ähnliche Verfahren, die Informationen in Ihrem Endgerät speichern oder von dort abrufen.",
        },
        {
          type: "p",
          text: "Rechtlich erfasst § 25 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz, vormals § 25 TTDSG) jeden Zugriff auf Informationen, die bereits in Ihrem Endgerät gespeichert sind, sowie jede Speicherung von Informationen in Ihrem Endgerät — unabhängig davon, ob es sich dabei um personenbezogene Daten handelt.",
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Grundsatz: nur unbedingt Erforderliches, keine Tracker",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar setzt ausschließlich unbedingt erforderliche Cookies ein. Ihre Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (technisch notwendig für einen ausdrücklich gewünschten Telemediendienst) in Verbindung mit Art. 6 Abs. 1 lit. b und lit. f DSGVO.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Caelex Scholar verwendet keine Marketing-, Werbe- oder Cross-Site-Tracking-Cookies, keine Drittanbieter-Werbenetzwerke und kein Geräte-Fingerprinting. Im Scholar-Bereich wird kein Cookie-Banner angezeigt, weil keine einwilligungsbedürftigen Speichervorgänge stattfinden.",
        },
        {
          type: "p",
          text: "Die Scholar-Oberfläche speichert keine Daten im LocalStorage oder SessionStorage Ihres Browsers. Ihre Spracheinstellung und sonstigen Präferenzen werden serverseitig in Ihrem Konto gespeichert (nicht in einem Cookie). Optionale, datenschutzfreundliche Funktionen wie Lesezeichen und Leselisten werden in unserer Datenbank gespeichert und sind in der Datenschutzerklärung beschrieben.",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Liste der eingesetzten Cookies",
      blocks: [
        {
          type: "p",
          text: "Die folgende Tabelle listet die Cookies auf, die Caelex Scholar tatsächlich setzt. Alle sind unbedingt erforderlich, ausschließlich auf der Domain caelex.eu (Erstanbieter) gesetzt, mit dem Attribut HttpOnly versehen (für Skripte im Browser nicht lesbar) und in der Produktivumgebung mit dem Attribut Secure (nur über HTTPS) sowie SameSite=Lax übertragen. In der Produktivumgebung tragen die Cookie-Namen zusätzlich die Präfixe __Secure- bzw. __Host-.",
        },
        {
          type: "subheading",
          text: "authjs.session-token (in Produktion: __Secure-authjs.session-token)",
        },
        {
          type: "ul",
          items: [
            "Zweck: Anmeldesitzung — hält Sie nach der SSO-/Login-Anmeldung eingeloggt (NextAuth-Sitzungstoken, JWT).",
            "Kategorie: unbedingt erforderlich.",
            "Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. b DSGVO.",
            "Speicherdauer: Sitzungs-Cookie mit einer maximalen Gültigkeit von 24 Stunden; endet spätestens mit der Abmeldung.",
            "Eigenschaften: HttpOnly, Secure (Produktion), SameSite=Lax.",
          ],
        },
        {
          type: "subheading",
          text: "authjs.csrf-token (in Produktion: __Host-authjs.csrf-token)",
        },
        {
          type: "ul",
          items: [
            "Zweck: Schutz vor Cross-Site-Request-Forgery (CSRF) bei zustandsändernden Anfragen.",
            "Kategorie: unbedingt erforderlich (Sicherheit).",
            "Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. f DSGVO (Sicherheit des Dienstes).",
            "Speicherdauer: Sitzung (wird mit dem Schließen der Browsersitzung gelöscht).",
            "Eigenschaften: HttpOnly; in Produktion __Host-gebunden (an den Ursprung gebunden, ohne Domain-Attribut).",
          ],
        },
        {
          type: "subheading",
          text: "authjs.callback-url (in Produktion: __Secure-authjs.callback-url)",
        },
        {
          type: "ul",
          items: [
            "Zweck: speichert das Rücksprungziel während des Anmeldevorgangs (z. B. nach der Weiterleitung über das SSO-/OAuth-Verfahren Ihrer Hochschule).",
            "Kategorie: unbedingt erforderlich.",
            "Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. b DSGVO.",
            "Speicherdauer: Sitzung.",
            "Eigenschaften: HttpOnly, Secure (Produktion), SameSite=Lax.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          text: "Hinweis zur Anmeldung über Ihre Hochschule (Single Sign-On): Während der Weiterleitung zum und vom Identitätsanbieter Ihrer Hochschule bzw. zum Google-OAuth-Dienst können von diesen Anbietern eigene, für die Authentifizierung notwendige Cookies in deren Verantwortung gesetzt werden. Diese unterliegen den Datenschutz- und Cookie-Hinweisen des jeweiligen Anbieters; Caelex hat hierauf keinen Einfluss.",
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title:
        "Keine Analyse-, Performance- oder Marketing-Speichervorgänge in Scholar",
      blocks: [
        {
          type: "p",
          text: "Im Scholar-Bereich werden keine Analyse-, Performance- oder Marketing-Cookies gesetzt und keine entsprechenden Skripte geladen. Insbesondere wird im Scholar-Shell weder eine Web-Analyse (z. B. Vercel Web Analytics) noch ein Performance-Messdienst (z. B. Vercel Speed Insights) geladen.",
        },
        {
          type: "p",
          text: "Zur Wahrung der Stabilität und Sicherheit des Dienstes setzen wir serverseitige Fehlerüberwachung (Sentry) ein. Diese arbeitet ohne das Setzen von Cookies in Ihrem Endgerät und mit Entfernung personenbezogener Daten vor der Übertragung. Die eingesetzten Dienstleister sind im Verzeichnis der Unterauftragsverarbeiter aufgeführt.",
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Verwaltung und Löschung von Cookies",
      blocks: [
        {
          type: "p",
          text: "Da Caelex Scholar ausschließlich unbedingt erforderliche Cookies verwendet, ist kein Einwilligungsbanner und keine Cookie-Einstellung erforderlich. Sie können Cookies jederzeit in Ihren Browsereinstellungen verwalten, blockieren oder löschen.",
        },
        {
          type: "ul",
          items: [
            "Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies und andere Websitedaten",
            "Firefox: Einstellungen → Datenschutz und Sicherheit → Cookies und Website-Daten",
            "Safari: Einstellungen → Datenschutz → Cookies und Website-Daten verwalten",
            "Edge: Einstellungen → Cookies und Websiteberechtigungen",
          ],
        },
        {
          type: "callout",
          variant: "warn",
          text: "Wenn Sie die unbedingt erforderlichen Cookies blockieren oder löschen, können Sie sich nicht anmelden oder bleiben nicht angemeldet; der Dienst ist dann nicht oder nur eingeschränkt nutzbar.",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Ihre Rechte und Kontakt",
      blocks: [
        {
          type: "p",
          text: "Soweit über Cookies personenbezogene Daten verarbeitet werden, stehen Ihnen die in der Datenschutzerklärung beschriebenen Betroffenenrechte zu (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde).",
        },
        {
          type: "p",
          text: "Fragen zu diesem Hinweis richten Sie bitte an privacy@caelex.eu. Weitere Einzelheiten zur Verarbeitung personenbezogener Daten enthält die Datenschutzerklärung von Caelex Scholar; die eingesetzten Dienstleister sind im Verzeichnis der Unterauftragsverarbeiter aufgeführt.",
        },
      ],
    },
    {
      id: "s8",
      number: "§ 8",
      title: "Änderungen dieses Hinweises",
      blocks: [
        {
          type: "p",
          text: "Wir aktualisieren diesen Hinweis, wenn sich die eingesetzten Cookies oder die rechtlichen Anforderungen ändern. Maßgeblich ist die jeweils unter caelex.eu/scholar/legal/cookies veröffentlichte Fassung mit dem oben angegebenen Stand.",
        },
      ],
    },
  ],
};
