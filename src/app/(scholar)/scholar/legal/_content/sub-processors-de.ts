/**
 * Caelex Scholar — Verzeichnis der Unterauftragsverarbeiter (DE, verbindlich).
 *
 * ScholarLegalDoc-Inhalt für /scholar/legal/sub-processors. Inhalt geprüft gegen
 * das plattformweite Register (src/app/legal/sub-processors/_content/
 * sub-processors-data.ts) und auf die von Scholar tatsächlich genutzten Dienste
 * eingegrenzt: Vercel (Hosting/CDN), Neon (Datenbank, eu-central-1 Frankfurt),
 * OpenAI (Embeddings via Vercel AI Gateway, Sub-Sub-Verarbeiter), Resend
 * (E-Mail), Upstash (Rate-Limiting, eu-west-1 Dublin), Sentry (Fehler-
 * Monitoring), LogSnag (Ereignis-Monitoring, Kanada), Google (OAuth-SSO).
 *
 * Block-Tabelle: Pro Eintrag ein subheading (Name) + ul mit Rolle/Standort/
 * Transfermechanismus/Daten (XSS-sicher, monochrom — keine HTML-Tabelle).
 */
import type { ScholarLegalDoc } from "../_components/types";

export const SUB_PROCESSORS_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Unterauftragsverarbeiter",
  subtitle: "Caelex Scholar — Verzeichnis der eingesetzten Dienstleister",
  version: "Version 0.1 (Entwurf)",
  lastUpdated: "{{DATE}}",
  preamble: [
    "Dieses Verzeichnis listet die Dienstleister (Unterauftragsverarbeiter) auf, die Caelex zur Bereitstellung von Caelex Scholar einsetzt, sowie deren Rolle, Standort und — bei Verarbeitung außerhalb der EU/des EWR — den jeweiligen Transfermechanismus.",
    "Es betrifft ausschließlich Caelex Scholar (caelex.eu/scholar). Weitere Produkte der Caelex-Plattform können zusätzliche Dienstleister nutzen, die hier nicht aufgeführt sind.",
  ],
  sections: [
    {
      id: "s0",
      number: "Hinweis",
      title: "Entwurf — Vorlage",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. / Template; must be reviewed and adapted by qualified legal counsel before publication or execution. Not legal advice.",
        },
      ],
    },
    {
      id: "s1",
      number: "§ 1",
      title: "Verantwortlicher und Rollen",
      blocks: [
        {
          type: "p",
          text: "Verantwortlicher im Sinne der DSGVO ist Caelex — Einzelunternehmen, Inhaber: Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland (Kleinunternehmer gemäß § 19 UStG). Kontakt: cs@caelex.eu, Datenschutz: privacy@caelex.eu.",
        },
        {
          type: "p",
          text: "Caelex Scholar wird im Modell „Anbieter an Hochschule an Studierende“ (B2B2C) bereitgestellt. Soweit Caelex personenbezogene Daten im Auftrag der lizenzierenden Hochschule verarbeitet, ist die Hochschule Verantwortliche und Caelex Auftragsverarbeiter (Art. 28 DSGVO); die nachstehend genannten Dienstleister sind in diesem Fall Unterauftragsverarbeiter. Für eigene Zwecke (Produktbetrieb, Sicherheit, KI-gestützte Recherche) handelt Caelex als eigener Verantwortlicher.",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Eingesetzte Unterauftragsverarbeiter",
      blocks: [
        {
          type: "p",
          text: "Die folgende Aufstellung nennt je Dienstleister: Name und Rechtsträger, Rolle/Kategorie, Verarbeitungsstandort, Transfermechanismus bei Drittlandbezug sowie die Art der verarbeiteten Daten.",
        },

        {
          type: "subheading",
          text: "1. Vercel Inc. — Hosting & Edge-Netzwerk",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.",
            "Rolle: Auslieferung der Anwendung über das Edge-Netzwerk; Build-/Deploy-Orchestrierung; serverlose Funktionen.",
            "Standort: USA mit Edge-Regionen weltweit; Caelex nutzt für dynamische Anfragen vorrangig EU-Regionen (fra1 Frankfurt, cdg1 Paris).",
            "Transfermechanismus: EU-Standardvertragsklauseln (Modul 3); EU-US Data Privacy Framework (Vercel zertifiziert).",
            "Daten: zur Auslieferung benötigte Daten (Anwendungscode, Request-Metadaten, IP-Adressen), flüchtige Daten während der Verarbeitung.",
          ],
        },

        {
          type: "subheading",
          text: "2. Neon Inc. — verwaltete PostgreSQL-Datenbank",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: Neon Inc., 2261 Market St #4474, San Francisco, CA 94114, USA.",
            "Rolle: Betrieb der Produktivdatenbank einschließlich Backups und Point-in-Time-Recovery.",
            "Standort: EU-Region eu-central-1 (Frankfurt, Deutschland).",
            "Transfermechanismus: Verarbeitung innerhalb der EU; etwaige Verwaltungszugriffe aus den USA über EU-Standardvertragsklauseln (Modul 3).",
            "Daten: alle persistierten Scholar-Daten — Konto (Name, E-Mail), Präferenzen, Suchverlauf (sofern aktiviert), Lesezeichen und Leselisten, Anmeldeereignisse (maskierte IP).",
          ],
        },

        {
          type: "subheading",
          text: "3. OpenAI, L.L.C. — KI-Embeddings (semantische Suche)",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: OpenAI, L.L.C., 3180 18th Street, San Francisco, CA 94110, USA — angebunden über das Vercel AI Gateway.",
            "Rolle: Erzeugung von Vektor-Embeddings für die semantische Suche im Scholar-Korpus. Es besteht keine unmittelbare Vertragsbeziehung zwischen OpenAI und Caelex; OpenAI wirkt als Unter-Unterauftragsverarbeiter von Vercel.",
            "Standort: USA.",
            "Transfermechanismus: EU-US Data Privacy Framework (zertifiziert); Standardvertragsklauseln; Zero-Data-Retention für API-Aufrufe; Routing über das Vercel AI Gateway.",
            "Daten: kurzer Anfragetext (Such-Query). Keine Klartextspeicherung über die Dauer des API-Aufrufs hinaus. Die semantische Suche ist standardmäßig deaktiviert (Opt-in).",
          ],
        },

        { type: "subheading", text: "4. Resend Inc. — transaktionale E-Mails" },
        {
          type: "ul",
          items: [
            "Rechtsträger: Resend Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA.",
            "Rolle: Versand transaktionaler E-Mails (z. B. Anmelde-/Sicherheitsbenachrichtigungen, Support-Kommunikation).",
            "Standort: USA mit EU-Edge-Regionen.",
            "Transfermechanismus: EU-Standardvertragsklauseln (Modul 3); optional aktivierte EU-Datenhaltung.",
            "Daten: E-Mail-Adresse der Empfänger, Betreff und Inhalt nur während der Zustellung.",
          ],
        },

        {
          type: "subheading",
          text: "5. Upstash Inc. — Rate-Limiting & Caching",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: Upstash Inc., 900 Mission St #203, San Francisco, CA 94103, USA.",
            "Rolle: Rate-Limiting (Missbrauchs- und Überlastschutz); kurzlebiges Caching.",
            "Standort: EU-Region eu-west-1 (Dublin, Irland).",
            "Transfermechanismus: Verarbeitung innerhalb der EU; EU-US DPF für US-Supportzugriffe; Standardvertragsklauseln Modul 3.",
            "Daten: IP-Adressen und Nutzer-IDs zu Rate-Limit-Zwecken (kurze TTL), kurzlebige Sitzungs-/MFA-Zähler.",
          ],
        },

        {
          type: "subheading",
          text: "6. Sentry (Functional Software Inc.) — Fehler-Monitoring",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: Functional Software Inc. (dba Sentry), 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA.",
            "Rolle: Erfassung von Laufzeitfehlern zur Produktstabilität und Sicherheitsbeobachtung. Es werden keine Cookies im Endgerät gesetzt.",
            "Standort: EU-Region (Frankfurt) mit Fallback USA.",
            "Transfermechanismus: Verarbeitung primär in der EU; EU-Standardvertragsklauseln (Modul 3) für den US-Fallback.",
            "Daten: Stack-Traces, Browser-/Betriebssystem-Informationen, Request-Metadaten, anonymisierte Nutzer-IDs. Entfernung personenbezogener Daten vor der Übertragung aktiviert.",
          ],
        },

        {
          type: "subheading",
          text: "7. LogSnag — Ereignis-Monitoring (serverseitig)",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: LogSnag (betrieben von Shayan Taslim, registriert in Kanada).",
            "Rolle: serverseitiges Tracking aussagekräftiger Betriebsereignisse für das Operator-Alerting. Keine Profilbildung, keine Werbeauswertung, kein Geräte-Fingerprinting.",
            "Standort: Kanada.",
            "Transfermechanismus: Drittland mit EU-Angemessenheitsbeschluss (Kanada — Entscheidung 2002/2/EG); ergänzend Standardvertragsklauseln im Anbietervertrag.",
            "Daten: Ereignistyp, Channel, kurze Beschreibung, Caelex-interne IDs, Zeitstempel. Keine E-Mail-Adressen, keine Klartext-PII.",
          ],
        },

        {
          type: "subheading",
          text: "8. Google Ireland Ltd. — Anmeldung (OAuth-SSO)",
        },
        {
          type: "ul",
          items: [
            "Rechtsträger: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (für Nutzer im EWR); Muttergesellschaft Google LLC, USA.",
            "Rolle: Identitätsanbieter für die optionale Anmeldung „Mit Google fortfahren“ bzw. das Hochschul-SSO, soweit über Google bereitgestellt. Google handelt insoweit als eigener Verantwortlicher für die Authentifizierungsdaten.",
            "Standort: EU/EWR mit möglicher Verarbeitung in den USA durch die Muttergesellschaft.",
            "Transfermechanismus: EU-US Data Privacy Framework (Google zertifiziert); EU-Standardvertragsklauseln.",
            "Daten: zur Authentifizierung übermittelte Kontodaten (z. B. E-Mail-Adresse, Name, verifizierter E-Mail-Status). Caelex empfängt nur die für die Kontoanlage erforderlichen Angaben.",
          ],
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Nicht von Scholar genutzte Plattformdienste",
      blocks: [
        {
          type: "p",
          text: "Folgende von anderen Caelex-Produkten genutzte Dienstleister werden vom aktuellen Funktionsumfang von Caelex Scholar nicht eingesetzt:",
        },
        {
          type: "ul",
          items: [
            "Anthropic PBC (KI-Inferenz „Claude“) — Caelex Scholar nutzt für die semantische Suche Embeddings (OpenAI), keine generative Sprachmodell-Ausgabe; Scholar ist „powered by Atlas“ im Sinne der zugrunde liegenden Recherchetechnik.",
            "Stripe (Zahlungsabwicklung) — Caelex Scholar ist für Nutzer kostenfrei; es findet keine Zahlungsabwicklung statt.",
            "Cloudflare R2 (Objektspeicher) — Caelex Scholar sieht keine Datei-Uploads durch Nutzer vor.",
            "Vercel Web Analytics / Speed Insights — werden im Scholar-Bereich nicht geladen.",
          ],
        },
        {
          type: "p",
          text: "[TBD: mit Rechtsberatung und Technik bestätigen: dass der aktuelle Scholar-Funktionsumfang keine generative KI (Anthropic), keine Zahlungs- und keine Objektspeicher-Dienste auslöst; bei Funktionserweiterung ist dieses Verzeichnis fortzuschreiben.]",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Datenübermittlung in Drittländer",
      blocks: [
        {
          type: "p",
          text: "Die produktive Speicherung der Scholar-Daten erfolgt in der EU (Neon, Frankfurt). Soweit Dienstleister mit Sitz oder Verarbeitung außerhalb der EU/des EWR eingesetzt werden, stützt Caelex die Übermittlung auf einen Angemessenheitsbeschluss (z. B. Kanada), das EU-US Data Privacy Framework und/oder EU-Standardvertragsklauseln nebst ergänzenden Maßnahmen (z. B. Verschlüsselung, Datenminimierung, Zero-Data-Retention).",
        },
        {
          type: "callout",
          variant: "info",
          text: "Die genaue Eignung der Transfermechanismen für die jeweilige Verarbeitung (Transfer-Folgenabschätzung, Schrems II) ist gesondert zu dokumentieren. [TBD: mit Rechtsberatung bestätigen.]",
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "Benachrichtigung über Änderungen",
      blocks: [
        {
          type: "p",
          text: "Caelex hält dieses Verzeichnis aktuell. Eine geplante Hinzufügung oder Ersetzung eines Unterauftragsverarbeiters wird der lizenzierenden Hochschule mit einer angemessenen Vorlauffrist (in der Regel mindestens 30 Tage) mitgeteilt, damit ein etwaiges vertragliches Widerspruchsrecht ausgeübt werden kann. Die jeweils aktuelle Fassung ist unter caelex.eu/scholar/legal/sub-processors abrufbar.",
        },
        {
          type: "p",
          text: "Die konkreten Modalitäten der Benachrichtigung und des Widerspruchs ergeben sich aus dem Auftragsverarbeitungsvertrag (AVV) mit der jeweiligen Hochschule.",
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Kontakt",
      blocks: [
        {
          type: "p",
          text: "Fragen zu diesem Verzeichnis oder zur Auftragsverarbeitung richten Sie bitte an privacy@caelex.eu.",
        },
      ],
    },
  ],
};
