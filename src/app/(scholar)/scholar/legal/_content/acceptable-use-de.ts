/**
 * Caelex Scholar — Nutzungsrichtlinie / Acceptable Use Policy (DE, verbindlich).
 *
 * Binding German edition. Keep in sync with `acceptable-use-en.ts`.
 *
 * DRAFT — the mandatory ENTWURF banner is rendered by LegalDoc; do NOT add one
 * here. Template pending qualified-counsel review.
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain strings only.
 *
 * Facts grounded in the legal-compliance spec (sui-generis DB right §§ 87a ff.
 * UrhG / Dir. 96/9/EC; scholar rate-tier 60/min; SSO-gated access; cs@caelex.eu).
 */

import type { ScholarLegalDoc } from "../_components/types";

export const ACCEPTABLE_USE_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Nutzungsrichtlinie",
  subtitle: "Caelex Scholar — Acceptable Use Policy",
  version: "1.0",
  lastUpdated: "7. Juni 2026",
  preamble: [
    "Diese Nutzungsrichtlinie (Acceptable Use Policy) ergänzt die Nutzungsbedingungen von Caelex Scholar und ist deren Bestandteil. Sie beschreibt, welche Nutzung von Scholar zulässig ist und welche untersagt ist, um den Dienst, seinen Quellenbestand und alle Nutzerinnen und Nutzer zu schützen.",
    "Verbindlich ist die deutsche Fassung; die englische Fassung ist eine unverbindliche Übersetzung.",
  ],
  sections: [
    {
      id: "s1",
      number: "§ 1",
      title: "Grundsatz",
      blocks: [
        {
          type: "p",
          text: "Scholar darf ausschließlich für eigene, nicht kommerzielle Studien-, Lehr- und Forschungszwecke im Rahmen der Zugangsberechtigung genutzt werden. Jede darüber hinausgehende, missbräuchliche oder rechtswidrige Nutzung ist untersagt.",
        },
        {
          type: "p",
          text: "Bei Verstößen gegen diese Nutzungsrichtlinie kann Caelex den Zugang vorübergehend sperren oder dauerhaft beenden (vgl. Nutzungsbedingungen § 10) und erforderlichenfalls die lizenzierende Hochschule informieren.",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Kein Scraping, kein massenhaftes Extrahieren",
      blocks: [
        {
          type: "p",
          text: "Untersagt sind das automatisierte Auslesen (Scraping, Crawling), das massenhafte Herunterladen sowie jede systematische Vervielfältigung von Inhalten — gleich ob manuell oder mittels Skripten, Bots, Browser-Erweiterungen oder sonstiger Werkzeuge.",
        },
        {
          type: "callout",
          variant: "warn",
          text: "Die Zusammenstellung des Quellenbestands ist als Datenbank nach dem Schutzrecht sui generis (Richtlinie 96/9/EG, §§ 87a ff. UrhG) geschützt, auch soweit einzelne Inhalte gemeinfrei sind. Die Entnahme oder Weiterverwendung eines wesentlichen Teils sowie die wiederholte und systematische Entnahme unwesentlicher Teile sind unzulässig.",
        },
        {
          type: "p",
          text: "Zulässig bleiben das Lesen, das gelegentliche Speichern oder Drucken einzelner Quellen sowie das Zitieren in angemessenem Umfang für eigene Studien- und Forschungszwecke.",
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Keine missbräuchliche Nutzung der KI-Suche",
      blocks: [
        {
          type: "p",
          text: "Die semantische (KI-gestützte) Suche darf nicht missbraucht werden. Untersagt sind insbesondere: das automatisierte oder massenhafte Absetzen von Suchanfragen; Versuche, dem System Eingaben unterzuschieben (Prompt Injection) oder Sicherheits- bzw. Inhaltsmechanismen zu umgehen; sowie der Versuch, den Quellenbestand, zugrundeliegende Modelle oder Embeddings auszulesen, zu rekonstruieren oder abzuziehen.",
        },
        {
          type: "p",
          text: "Die KI-Suche dient dem Auffinden von Inhalten. Ergebnisse sind stets anhand der amtlichen Quelle zu überprüfen (vgl. Nutzungsbedingungen § 5). Eine Nutzung zum Aufbau konkurrierender Datenbanken oder zum Training eigener Modelle ist nicht gestattet.",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Keine Weitergabe von Zugangsdaten",
      blocks: [
        {
          type: "p",
          text: "Der Zugang ist persönlich. Sie dürfen Ihre Zugangsdaten — insbesondere Ihr Hochschul-SSO — nicht weitergeben, teilen oder Dritten zugänglich machen und keine gemeinsam genutzten Konten einrichten.",
        },
        {
          type: "p",
          text: "Sie sind verpflichtet, Ihre Zugangsdaten sorgfältig zu schützen. Einen Verdacht auf unbefugte Nutzung Ihres Zugangs melden Sie bitte unverzüglich unter cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "Keine rechtswidrige oder beeinträchtigende Nutzung",
      blocks: [
        {
          type: "p",
          text: "Untersagt ist jede rechtswidrige Nutzung sowie jede Nutzung, die den Dienst, seine Infrastruktur, andere Nutzerinnen und Nutzer oder Dritte beeinträchtigt oder gefährdet.",
        },
        {
          type: "ul",
          items: [
            "Umgehung oder Aushebelung von Zugangs-, Authentifizierungs-, Sicherheits- oder Ratenbegrenzungsmaßnahmen;",
            "Eingriffe in die Integrität oder Verfügbarkeit des Dienstes (z. B. Überlastung, Störung, Einschleusen von Schadcode);",
            "unbefugter Zugriff auf Konten, Daten oder Systeme sowie Penetrationstests ohne ausdrückliche schriftliche Erlaubnis;",
            "Verletzung von Rechten Dritter, einschließlich Urheber-, Kennzeichen- und Datenschutzrechten;",
            "Verschleierung der Identität zur Umgehung von Sperren oder Beschränkungen.",
          ],
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Ratenbegrenzung (Rate-Limiting)",
      blocks: [
        {
          type: "p",
          text: "Zum Schutz des Dienstes und aller Nutzerinnen und Nutzer unterliegt der Zugang technischen Ratenbegrenzungen. Anfragen, die diese Grenzen überschreiten, können vorübergehend gedrosselt oder abgewiesen werden.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Die konkreten Grenzwerte können sich aus Sicherheits- und Stabilitätsgründen jederzeit ändern. Ein Umgehen oder absichtliches Ausreizen der Ratenbegrenzung ist untersagt.",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Meldung von Verstößen und Sicherheitslücken",
      blocks: [
        {
          type: "p",
          text: "Verstöße gegen diese Nutzungsrichtlinie sowie mutmaßliche Sicherheitslücken melden Sie bitte an cs@caelex.eu. Bitte nutzen Sie etwaige Schwachstellen nicht aus und veröffentlichen Sie sie nicht, bevor sie behoben sind.",
        },
        {
          type: "p",
          text: "Caelex behält sich vor, bei Verstößen geeignete Maßnahmen zu ergreifen, einschließlich Sperrung des Zugangs und — soweit erforderlich — Information der lizenzierenden Hochschule sowie zuständiger Behörden.",
        },
      ],
    },
  ],
};
