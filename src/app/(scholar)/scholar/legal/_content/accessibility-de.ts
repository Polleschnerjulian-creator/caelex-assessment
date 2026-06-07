/**
 * Caelex Scholar — Erklärung zur Barrierefreiheit (DE, verbindlich).
 *
 * ScholarLegalDoc-Inhalt für /scholar/legal/accessibility. Konsistent mit der
 * korrigierten plattformweiten Erklärung (src/app/legal/barrierefreiheit):
 *   • Norm: WCAG 2.2 AA (übertrifft die EN-301-549-/WCAG-2.1-AA-Baseline).
 *   • Durchsetzung/Schlichtung: MLBF AöR, Carl-Miller-Str. 6, 39112 Magdeburg
 *     (Schlichtungsstelle nach § 16 BGG; seit 26.09.2025), www.mlbf-barrierefrei.de.
 *   • Geltung: freiwillige Einhaltung; Kleinstunternehmen-/B2B2C-Rahmen.
 *   • Scholar-spezifische Restbarrieren: Recherche-Graph (tabellarische
 *     Alternative), PDF-/Druck-Export, WCAG-2.2-Kriterien (2.5.8, 3.3.8, 2.4.11).
 */
import type { ScholarLegalDoc } from "../_components/types";

export const ACCESSIBILITY_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Erklärung zur Barrierefreiheit",
  subtitle: "Caelex Scholar",
  version: "Version 0.1 (Entwurf)",
  lastUpdated: "{{DATE}}",
  preamble: [
    "Caelex ist bestrebt, Caelex Scholar für alle Menschen zugänglich zu gestalten. Diese Erklärung beschreibt den Stand der Barrierefreiheit, die zugrunde gelegte Norm, bekannte Einschränkungen sowie die Feedback- und Durchsetzungswege. Sie bezieht sich auf die unter caelex.eu/scholar erreichbare Anwendung.",
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
      title: "Geltungsbereich",
      blocks: [
        {
          type: "p",
          text: "Diese Erklärung gilt für die unter caelex.eu/scholar erreichbare Anwendung Caelex Scholar einschließlich ihrer öffentlichen Rechtsseiten.",
        },
        {
          type: "p",
          text: "Caelex unterliegt dem Barrierefreiheitsstärkungsgesetz (BFSG) nach derzeitiger Einschätzung voraussichtlich nicht zwingend — namentlich aufgrund der Kleinstunternehmen-Ausnahme (§ 3 Abs. 3 BFSG: weniger als 10 Beschäftigte und höchstens 2 Mio. € Jahresumsatz/-bilanzsumme) sowie der Bereitstellung im Modell „Anbieter an Hochschule an Studierende“ (B2B2C), bei der kein Verbrauchervertrag im Sinne des § 2 Nr. 26 BFSG vorliegt. Unabhängig davon bemühen wir uns freiwillig um die Einhaltung der nachstehenden Anforderungen.",
        },
        {
          type: "callout",
          variant: "info",
          text: "[TBD: mit Rechtsberatung bestätigen — die Anwendbarkeit des BFSG (Kleinstunternehmen-Ausnahme und B2B2C-Verbrauchervertrag) ist eine rechtliche Einordnung; bis zur Bestätigung steht diese Erklärung unter dem Vorbehalt der freiwilligen Einhaltung.]",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Stand der Vereinbarkeit",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar wird fortlaufend an den Web Content Accessibility Guidelines (WCAG) 2.2 Level AA gemessen. Damit überschreiten wir die von BFSG / BITV 2.0 / EN 301 549 als Baseline referenzierte Norm WCAG 2.1 AA.",
        },
        {
          type: "p",
          text: "Wir streben freiwillig die vollständige Übereinstimmung mit WCAG 2.2 AA an. Die Anwendung ist in wesentlichen Teilen barrierefrei; an der Beseitigung der unter § 4 genannten verbliebenen Barrieren wird gearbeitet.",
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Umgesetzte Maßnahmen",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar ist als ruhige, kontraststarke Lese-Oberfläche gestaltet. Umgesetzt sind insbesondere:",
        },
        {
          type: "ul",
          items: [
            "semantisches HTML mit lückenloser Überschriften-Hierarchie, Landmark-Rollen und ARIA-Attributen",
            "Tastaturbedienbarkeit aller interaktiven Elemente mit sichtbarem Fokusindikator (WCAG 2.4.7)",
            "monochromes, kontraststarkes Lese-Design; Fließtext erfüllt mindestens das AA-Kontrastverhältnis (WCAG 1.4.3)",
            "keine allein farbabhängigen Statusindikatoren",
            "responsive Layouts mit Zoom bis 400 % ohne horizontalen Scroll (WCAG 1.4.10)",
            "Unterstützung von „prefers-reduced-motion“ (reduzierte Bewegung)",
            "programmatisch verknüpfte Formular-Labels und Fehlermeldungen",
            "Dokument-Sprachauszeichnung je Sprachfassung (lang-Attribut), damit Vorlesehilfen die richtige Sprache ansagen (WCAG 3.1.1/3.1.2)",
            "Anmeldung ohne kognitiven Funktionstest; Unterstützung von Passwort-Managern (WCAG 3.3.8 „Accessible Authentication“)",
            "Mindestgröße von Bedienzielen und ausreichende Abstände (WCAG 2.5.8)",
          ],
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Noch nicht vollständig zugängliche Inhalte",
      blocks: [
        {
          type: "p",
          text: "Folgende Inhalte sind derzeit nicht oder nur eingeschränkt barrierefrei; wir arbeiten an einer Lösung:",
        },
        {
          type: "ul",
          items: [
            "Die grafische Recherche-Graph-Darstellung (Beziehungsnetz zwischen Quellen) — eine informationsgleichwertige tabellarische bzw. listenbasierte Alternative wird bereitgestellt bzw. ausgebaut.",
            "Generierte PDF- und Druck-Exporte — barrierefreie, getaggte Erzeugung ist in Arbeit; als Zwischenlösung stehen die Inhalte als strukturiertes HTML zur Verfügung.",
            "Einzelne neuere Bedienmuster (z. B. Schnellsuche-/Befehlspalette) werden fortlaufend gegen die WCAG-2.2-Kriterien 2.4.11 (Fokus nicht verdeckt), 2.5.8 (Zielgröße) und 3.3.8 (zugängliche Authentifizierung) geprüft und nachgebessert.",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "Feedback und Kontakt",
      blocks: [
        {
          type: "p",
          text: "Haben Sie Barrieren bemerkt oder benötigen Sie Inhalte in einer zugänglicheren Form? Wir freuen uns über Ihr Feedback.",
        },
        {
          type: "p",
          text: "Kontakt: accessibility@caelex.eu — wir antworten innerhalb von fünf Werktagen und bieten, soweit möglich, eine zugängliche Alternative an. Allgemeine Anfragen: cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Durchsetzungsverfahren / Schlichtung",
      blocks: [
        {
          type: "p",
          text: "Bleiben Ihre Anliegen nach Kontaktaufnahme mit uns unbeantwortet oder unbefriedigend, können Sie sich an die Schlichtungsstelle nach § 16 BGG wenden:",
        },
        {
          type: "ul",
          items: [
            "Schlichtungsstelle nach § 16 BGG bei der Marktüberwachungsstelle der Länder für Barrierefreiheit (MLBF AöR)",
            "Carl-Miller-Str. 6, 39112 Magdeburg, Deutschland",
            "www.mlbf-barrierefrei.de",
          ],
        },
        {
          type: "p",
          text: "Die Schlichtung ist für die Beteiligten kostenlos; es besteht kein Anwaltszwang.",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Stand und Überprüfung",
      blocks: [
        {
          type: "p",
          text: "Diese Erklärung beruht auf einer Selbstbewertung von Caelex Scholar. Sie wird jährlich, bei wesentlichen Änderungen der Anwendung sowie bei entsprechenden Rückmeldungen überprüft und aktualisiert. Maßgeblich ist die unter caelex.eu/scholar/legal/accessibility veröffentlichte Fassung mit dem oben angegebenen Stand.",
        },
      ],
    },
  ],
};
