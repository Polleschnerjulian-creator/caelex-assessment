/**
 * Caelex Scholar — Datenschutzerklärung (DE, verbindlich).
 *
 * Verbindliche deutsche Fassung der Scholar-Datenschutzerklärung (Art. 12–14
 * DSGVO). Die englische Datei `privacy-en.ts` ist eine reine Übersetzung zur
 * Information; bei Abweichungen gilt diese deutsche Fassung.
 *
 * Reine Inhaltsdatei (Plain-String-Blöcke, kein JSX/HTML). Der ENTWURF-Banner
 * und die monochrome/WCAG-Darstellung kommen aus `../_components/LegalDoc.tsx`.
 *
 * ENTWURF — vor Veröffentlichung durch qualifizierte Rechtsberatung zu prüfen.
 * Offene Punkte sind im Text mit „[TBD: mit Rechtsberatung bestätigen]“ markiert.
 */
import type { ScholarLegalDoc } from "../_components/types";

export const PRIVACY_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Datenschutzerklärung",
  subtitle:
    "Caelex Scholar — die juristische Recherchedatenbank für Hochschulen",
  version: "1.0",
  lastUpdated: "7. Juni 2026",
  preamble: [
    "Diese Datenschutzerklärung informiert Sie nach Art. 12 bis 14 der Datenschutz-Grundverordnung (DSGVO) darüber, wie Caelex personenbezogene Daten verarbeitet, wenn Sie Caelex Scholar (caelex.eu/scholar) nutzen — die kostenlose, von Ihrer Hochschule lizenzierte juristische Recherchedatenbank für das Weltraumrecht.",
    "Caelex Scholar ist „powered by Atlas“: Die semantische Suche stützt sich auf eine KI-gestützte Bedeutungssuche über das Atlas-Korpus. Sie ist standardmäßig ausgeschaltet und nur auf Ihre ausdrückliche Einwilligung hin aktiv (siehe § 5 und § 11).",
    "Maßgeblich ist diese deutsche Fassung; die englische Übersetzung dient nur Ihrer Information.",
  ],
  sections: [
    // ─────────────────────────────────────────────────────────────────
    // 0 · Kurzfassung in einfacher Sprache (Recital 58 — kind-/laienfreundlich)
    // ─────────────────────────────────────────────────────────────────
    {
      id: "kurz",
      number: "Auf einen Blick",
      title: "Das Wichtigste in einfacher Sprache",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "Diese Kurzfassung erklärt das Wichtigste in einfachen Worten — auch, falls Sie noch keine 18 Jahre alt sind. Sie ersetzt nicht die ausführlichen Abschnitte darunter; bei Abweichungen gilt der ausführliche Text.",
        },
        {
          type: "subheading",
          text: "Was ist Caelex Scholar?",
        },
        {
          type: "p",
          text: "Caelex Scholar ist eine Online-Bibliothek mit weltraumrechtlichen Texten — Verträgen, EU-Recht, nationalen Gesetzen und Gerichtsentscheidungen. Ihre Hochschule hat Scholar für Sie lizenziert; für Sie ist die Nutzung kostenlos. Sie melden sich über den Zugang Ihrer Hochschule (Single Sign-On) oder mit einem Konto an.",
        },
        {
          type: "subheading",
          text: "Welche Daten haben wir von Ihnen?",
        },
        {
          type: "ul",
          items: [
            "Ihr Konto: Name und E-Mail-Adresse (in der Regel von Ihrer Hochschule über die Anmeldung).",
            "Ihre Einstellungen: z. B. Sprache, bevorzugtes Rechtsgebiet, Zitierformat.",
            "Was Sie speichern: Lesezeichen und Leselisten, die Sie selbst anlegen.",
            "Nur wenn Sie es einschalten: Ihr Suchverlauf (welche Suchbegriffe Sie eingegeben haben) und die KI-Bedeutungssuche.",
            "Technische Anmelde-Protokolle zur Sicherheit (mit gekürzter, also unvollständiger IP-Adresse).",
          ],
        },
        {
          type: "subheading",
          text: "Wir schonen Ihre Daten von Anfang an",
        },
        {
          type: "p",
          text: "Der Suchverlauf und die KI-Bedeutungssuche sind standardmäßig AUSgeschaltet. Sie entscheiden selbst, ob Sie sie einschalten — und können sie jederzeit wieder ausschalten.",
        },
        {
          type: "subheading",
          text: "Was können Sie tun?",
        },
        {
          type: "ul",
          items: [
            "Sie können in den Einstellungen mit einem Klick alle Ihre Scholar-Daten herunterladen.",
            "Sie können Ihr Konto in den Einstellungen selbst löschen — dann werden auch Ihre Suchanfragen, Lesezeichen und Leselisten gelöscht.",
            "Ihren gespeicherten Suchverlauf löschen wir außerdem automatisch nach 90 Tagen.",
            "Sie können uns jederzeit unter privacy@caelex.eu schreiben.",
          ],
        },
        {
          type: "subheading",
          text: "Trifft die KI Entscheidungen über mich?",
        },
        {
          type: "p",
          text: "Nein. Die KI ordnet nur Suchergebnisse nach Bedeutung. Sie trifft keine Entscheidung über Sie und hat keine rechtliche Wirkung für Sie. Prüfen Sie wichtige Ergebnisse immer an der offiziellen Quelle.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 1 · Verantwortlicher + Rollen (Art. 13(1)(a), 26, 28)
    // ─────────────────────────────────────────────────────────────────
    {
      id: "verantwortlicher",
      number: "§ 1",
      title: "Verantwortlicher und Datenschutzkontakt",
      blocks: [
        {
          type: "p",
          text: "Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO für die in dieser Erklärung beschriebenen Verarbeitungen ist:",
        },
        {
          type: "p",
          text: "Caelex — Einzelunternehmen, Inhaber: Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland. Caelex ist Kleinunternehmer im Sinne des § 19 UStG. Die vollständigen Anbieterangaben finden Sie im Impressum (/legal/impressum).",
        },
        {
          type: "p",
          text: "Allgemeine Kontaktadresse: cs@caelex.eu. In Datenschutzangelegenheiten erreichen Sie uns unter privacy@caelex.eu.",
        },
        {
          type: "subheading",
          text: "Datenschutzbeauftragter",
        },
        {
          type: "p",
          text: "Ein benannter Datenschutzbeauftragter wird hier mit seinen Kontaktdaten veröffentlicht. Für Datenschutzanfragen wenden Sie sich bitte an privacy@caelex.eu.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 2 · Rollenverteilung Hochschule (Verantwortliche) / Caelex (Auftragsverarbeiter)
    // ─────────────────────────────────────────────────────────────────
    {
      id: "rollen",
      number: "§ 2",
      title: "Wer ist wofür verantwortlich? (Hochschule und Caelex)",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar wird Ihrer Hochschule als Dienst bereitgestellt (B2B2C). Aus datenschutzrechtlicher Sicht gibt es deshalb zwei Rollen, die für unterschiedliche Verarbeitungen gelten:",
        },
        {
          type: "subheading",
          text: "Ihre Hochschule als Verantwortliche; Caelex als Auftragsverarbeiter",
        },
        {
          type: "p",
          text: "Soweit Caelex Scholar im Auftrag und nach Weisung Ihrer Hochschule betreibt — insbesondere die Bereitstellung des lizenzierten Dienstes für ihre Studierenden und Beschäftigten —, ist Ihre Hochschule Verantwortliche und Caelex Auftragsverarbeiter (Art. 28 DSGVO). Grundlage ist ein Auftragsverarbeitungsvertrag (AVV) zwischen Ihrer Hochschule und Caelex. Für die Rechtmäßigkeit dieser Verarbeitung sowie für die Erfüllung Ihrer Betroffenenrechte ist in diesem Verhältnis primär Ihre Hochschule zuständig; Caelex unterstützt sie dabei.",
        },
        {
          type: "subheading",
          text: "Caelex als eigener Verantwortlicher",
        },
        {
          type: "p",
          text: "Für bestimmte Verarbeitungen entscheidet Caelex selbst über Zwecke und Mittel und ist insoweit eigener Verantwortlicher. Das betrifft insbesondere: den sicheren Betrieb, die Abwehr von Missbrauch und Angriffen sowie Sicherheits-Protokollierung; die Wartung, Fehlerbehebung und Weiterentwicklung des Produkts; und die Gestaltung der KI-gestützten semantischen Suche. Für diese Verarbeitungen gilt die vorliegende Datenschutzerklärung unmittelbar.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Sie können Ihre Betroffenenrechte immer an Caelex (privacy@caelex.eu) richten — auch wenn im Einzelfall Ihre Hochschule Verantwortliche ist. Wir leiten Ihr Anliegen dann unverzüglich an die zuständige Stelle weiter bzw. unterstützen Ihre Hochschule bei der Beantwortung.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 3 · Kategorien personenbezogener Daten (Art. 14(1)(d))
    // ─────────────────────────────────────────────────────────────────
    {
      id: "kategorien",
      number: "§ 3",
      title: "Welche Daten wir verarbeiten",
      blocks: [
        {
          type: "p",
          text: "Wir verarbeiten ausschließlich die für die Recherchedatenbank erforderlichen Daten:",
        },
        {
          type: "definition",
          term: "Konto- und Identitätsdaten:",
          text: "Name und E-Mail-Adresse. Diese stammen in der Regel aus der Anmeldung über Ihre Hochschule (Single Sign-On) oder, falls für Ihre Hochschule eingerichtet, aus einem mit Zugangsdaten angelegten Konto.",
        },
        {
          type: "definition",
          term: "Einstellungen (ScholarUserPreferences):",
          text: "Oberflächensprache, Quellsprache, Standard-Rechtsordnung/Jurisdiktion, Zitierformat, Trefferanzahl pro Seite sowie die Schalterstellungen für semantische Suche und Suchverlauf.",
        },
        {
          type: "definition",
          term: "Suchverlauf (ScholarSearchHistory) — nur bei Aktivierung:",
          text: "Suchbegriff, gewählte Jurisdiktion und Zeitpunkt. Wird nur gespeichert, wenn Sie den Suchverlauf ausdrücklich einschalten (Standard: aus).",
        },
        {
          type: "definition",
          term: "Lesezeichen (ScholarBookmark):",
          text: "Verweise auf von Ihnen gespeicherte Quellen oder Entscheidungen (Art und Kennung des Inhalts, Zeitpunkt).",
        },
        {
          type: "definition",
          term: "Leselisten (ScholarReadingList und -Item):",
          text: "Von Ihnen angelegte benannte Listen mit Name, optionaler Beschreibung sowie den enthaltenen Einträgen (Art/Kennung des Inhalts, optionale Notiz, Reihenfolge).",
        },
        {
          type: "definition",
          term: "Anmelde- und Sicherheits-Protokolle (LoginEvent):",
          text: "Zeitpunkt von Anmeldevorgängen, eine gekürzte (maskierte) IP-Adresse und Angaben zum verwendeten Browser/Gerät (User-Agent), zur Erkennung und Abwehr von Missbrauch.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Wir verarbeiten im Rahmen von Scholar grundsätzlich keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO). Bitte geben Sie keine sensiblen personenbezogenen Daten in Suchanfragen, Notizen oder Listennamen ein.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 4 · Zwecke + Rechtsgrundlagen (Art. 13(1)(c), 6) — purpose→basis map
    // ─────────────────────────────────────────────────────────────────
    {
      id: "zwecke",
      number: "§ 4",
      title: "Zwecke der Verarbeitung und Rechtsgrundlagen",
      blocks: [
        {
          type: "p",
          text: "Für jede Verarbeitung nennen wir den Zweck und die Rechtsgrundlage nach Art. 6 Abs. 1 DSGVO:",
        },
        {
          type: "definition",
          term: "Bereitstellung des Kontos und Zugang zur Datenbank.",
          text: "Zweck: Sie zu authentifizieren und Ihnen die lizenzierte Recherchedatenbank bereitzustellen. Rechtsgrundlage: Erfüllung des (über Ihre Hochschule vermittelten) Nutzungsverhältnisses bzw. Durchführung vorvertraglicher Maßnahmen, Art. 6 Abs. 1 lit. b DSGVO; im Verhältnis zur Hochschule auf Grundlage des AVV nach Art. 28 DSGVO.",
        },
        {
          type: "definition",
          term: "Lesezeichen und Leselisten.",
          text: "Zweck: Ihnen das Speichern und Organisieren von Quellen für Ihr Studium bzw. Ihre Lehre zu ermöglichen. Rechtsgrundlage: Erfüllung des Nutzungsverhältnisses, Art. 6 Abs. 1 lit. b DSGVO. Diese Funktionen sind nur für Sie selbst sichtbar (privat als Voreinstellung).",
        },
        {
          type: "definition",
          term: "Speichern und Anzeigen Ihrer Einstellungen.",
          text: "Zweck: den Dienst gemäß Ihren Präferenzen darzustellen. Rechtsgrundlage: Erfüllung des Nutzungsverhältnisses, Art. 6 Abs. 1 lit. b DSGVO.",
        },
        {
          type: "definition",
          term: "Suchverlauf (nur bei Aktivierung).",
          text: "Zweck: Ihnen Ihre früheren Suchanfragen anzuzeigen. Rechtsgrundlage: Ihre Einwilligung, Art. 6 Abs. 1 lit. a DSGVO. Standardmäßig ausgeschaltet; jederzeit in den Einstellungen widerrufbar (mit Wirkung für die Zukunft).",
        },
        {
          type: "definition",
          term: "Semantische Suche (KI-Bedeutungssuche, nur bei Aktivierung).",
          text: "Zweck: Suchergebnisse anhand ihrer Bedeutung statt nur anhand von Stichworten zu finden und zu ordnen. Rechtsgrundlage: Ihre Einwilligung, Art. 6 Abs. 1 lit. a DSGVO. Standardmäßig ausgeschaltet; jederzeit widerrufbar. Näheres in § 11.",
        },
        {
          type: "definition",
          term: "Sicherheit, Missbrauchsabwehr und Protokollierung.",
          text: "Zweck: unbefugte Zugriffe, Brute-Force-Angriffe und missbräuchliche Nutzung zu erkennen und abzuwehren sowie die Integrität des Dienstes zu wahren (u. a. Anmelde-Protokolle mit maskierter IP, Ratenbegrenzung, Sicherheits-Audit-Protokoll). Rechtsgrundlage: berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO (siehe Abwägung unten).",
        },
        {
          type: "definition",
          term: "Erfüllung rechtlicher Pflichten.",
          text: "Zweck: Erfüllung gesetzlicher Pflichten, z. B. Beantwortung von Betroffenenanfragen und Aufbewahrungs-/Nachweispflichten. Rechtsgrundlage: rechtliche Verpflichtung, Art. 6 Abs. 1 lit. c DSGVO.",
        },
        {
          type: "subheading",
          text: "Abwägung beim berechtigten Interesse (Kurz-LIA)",
        },
        {
          type: "p",
          text: "Für die Sicherheits-Protokollierung stützen wir uns auf Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist der Schutz des Dienstes und seiner Nutzerinnen und Nutzer vor Angriffen und Missbrauch. Die Verarbeitung ist hierfür erforderlich, datensparsam ausgestaltet (insbesondere durch maskierte IP-Adressen und kurze Aufbewahrung) und für Sie als angemeldete Nutzerin oder angemeldeter Nutzer vorhersehbar. Da überwiegende entgegenstehende Interessen oder Grundrechte nicht ersichtlich sind, überwiegt das Schutzinteresse. Sie haben gleichwohl ein Widerspruchsrecht aus Art. 21 DSGVO (siehe § 8).",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 5 · Privacy by Default (Art. 25) — make the opt-in design explicit
    // ─────────────────────────────────────────────────────────────────
    {
      id: "voreinstellungen",
      number: "§ 5",
      title: "Datenschutzfreundliche Voreinstellungen (Privacy by Default)",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar ist nach dem Grundsatz „Datenschutz durch Voreinstellung“ (Art. 25 Abs. 2 DSGVO) gestaltet. Die beiden datenintensivsten Funktionen sind ohne Ihr Zutun ausgeschaltet:",
        },
        {
          type: "ul",
          items: [
            "Der Suchverlauf ist standardmäßig AUS — Ihre Suchanfragen werden nicht gespeichert, solange Sie ihn nicht aktivieren.",
            "Die semantische Suche (KI) ist standardmäßig AUS — bis Sie sie aktivieren, findet keine KI-gestützte Bedeutungssuche statt.",
            "Lesezeichen und Leselisten sind privat — nur für Sie sichtbar.",
          ],
        },
        {
          type: "p",
          text: "Sie können diese Funktionen jederzeit in den Einstellungen ein- und ausschalten. Bei jedem Schalter erhalten Sie einen kurzen Hinweis, was die Aktivierung bedeutet.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 6 · Empfänger / Auftragsverarbeiter (Art. 13(1)(e))
    // ─────────────────────────────────────────────────────────────────
    {
      id: "empfaenger",
      number: "§ 6",
      title: "Empfänger und Auftragsverarbeiter",
      blocks: [
        {
          type: "p",
          text: "Innerhalb von Caelex erhalten nur die Personen Zugriff auf Ihre Daten, die ihn zur Erbringung und Sicherung des Dienstes benötigen. Darüber hinaus setzen wir sorgfältig ausgewählte Dienstleister als Auftragsverarbeiter nach Art. 28 DSGVO ein, etwa für Hosting/CDN (Vercel), Datenbank (Neon, eu-central-1 Frankfurt), Einbettungen für die semantische Suche (OpenAI), E-Mail-Versand (Resend), Anmeldung über Google (OAuth), Ratenbegrenzung (Upstash), Fehlerüberwachung (Sentry) sowie Ereignis-Protokollierung (LogSnag).",
        },
        {
          type: "p",
          text: "Die jeweils aktuelle, vollständige Liste unserer Unterauftragsverarbeiter mit Zweck, Standort und Übermittlungsgrundlage finden Sie auf unserer Übersicht der Unterauftragsverarbeiter (/scholar/legal/sub-processors).",
        },
        {
          type: "p",
          text: "Eine Übermittlung an Ihre Hochschule erfolgt im Rahmen der jeweiligen Rollenverteilung (§ 2). Eine Übermittlung an staatliche Stellen erfolgt nur, soweit wir hierzu gesetzlich verpflichtet sind. Wir verkaufen Ihre personenbezogenen Daten nicht.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 7 · Drittlandübermittlungen (Art. 13(1)(f), 44–49)
    // ─────────────────────────────────────────────────────────────────
    {
      id: "drittland",
      number: "§ 7",
      title: "Übermittlungen in Drittländer",
      blocks: [
        {
          type: "p",
          text: "Wir betreiben Scholar so, dass personenbezogene Daten vorrangig in der Europäischen Union verarbeitet werden. Insbesondere wird die Datenbank in der EU-Region eu-central-1 (Frankfurt) bei Neon gespeichert.",
        },
        {
          type: "p",
          text: "Einzelne Dienstleister haben Konzernmuttergesellschaften in den USA (z. B. Vercel) oder verarbeiten in begrenztem Umfang außerhalb der EU. Für die semantische Suche werden Suchanfragen, sofern Sie diese Funktion aktiviert haben, zur Erzeugung von Vektor-Einbettungen an OpenAI (USA) übermittelt.",
        },
        {
          type: "p",
          text: "Soweit eine Übermittlung in ein Drittland ohne Angemessenheitsbeschluss erfolgt, stützen wir sie auf geeignete Garantien nach Art. 46 DSGVO — insbesondere die Standardvertragsklauseln der EU-Kommission — bzw., soweit anwendbar, auf eine Zertifizierung nach dem EU-US Data Privacy Framework, jeweils ergänzt um zusätzliche Schutzmaßnahmen (z. B. Verschlüsselung in Übertragung und Speicherung, Datenminimierung, maskierte IP-Adressen).",
        },
        {
          type: "callout",
          variant: "info",
          text: "Eine Kopie der eingesetzten Garantien (z. B. Standardvertragsklauseln) kann unter privacy@caelex.eu angefordert werden.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 8 · Speicherdauer (Art. 13(2)(a))
    // ─────────────────────────────────────────────────────────────────
    {
      id: "speicherdauer",
      number: "§ 8",
      title: "Speicherdauer",
      blocks: [
        {
          type: "p",
          text: "Wir speichern personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist:",
        },
        {
          type: "definition",
          term: "Konto, Einstellungen, Lesezeichen und Leselisten:",
          text: "bis Sie Ihr Konto löschen bzw. die Lizenz Ihrer Hochschule endet und der Zugang beendet wird. Bei Kontolöschung werden diese Daten gelöscht (siehe § 9).",
        },
        {
          type: "definition",
          term: "Suchverlauf:",
          text: "wird — sofern aktiviert — automatisch nach 90 Tagen gelöscht; zudem mit der Kontolöschung. Sie können den Verlauf jederzeit selbst löschen oder die Funktion deaktivieren.",
        },
        {
          type: "definition",
          term: "Anmelde- und Sicherheits-Protokolle:",
          text: "werden für die zur Sicherheitsabwehr erforderliche Dauer gespeichert und anschließend gelöscht oder anonymisiert.",
        },
        {
          type: "definition",
          term: "Einwilligungsnachweise:",
          text: "werden für die Dauer der Nachweisbarkeit der jeweiligen Einwilligung sowie zur Erfüllung gesetzlicher Nachweispflichten gespeichert.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 9 · Betroffenenrechte (Art. 13(2)(b)–(d), 15–22) + Ausübung
    // ─────────────────────────────────────────────────────────────────
    {
      id: "rechte",
      number: "§ 9",
      title: "Ihre Rechte und wie Sie sie ausüben",
      blocks: [
        {
          type: "p",
          text: "Nach der DSGVO stehen Ihnen folgende Rechte zu:",
        },
        {
          type: "ul",
          items: [
            "Auskunft (Art. 15): ob und welche Daten wir über Sie verarbeiten.",
            "Berichtigung (Art. 16): Korrektur unrichtiger Daten; Einstellungen und Profil können Sie selbst bearbeiten.",
            "Löschung (Art. 17): Löschung Ihrer Daten, soweit keine Aufbewahrungspflicht entgegensteht.",
            "Einschränkung der Verarbeitung (Art. 18).",
            "Datenübertragbarkeit (Art. 20): Erhalt Ihrer Daten in einem strukturierten, gängigen, maschinenlesbaren Format.",
            "Widerspruch (Art. 21): gegen Verarbeitungen auf Grundlage des berechtigten Interesses (§ 4).",
            "Widerruf erteilter Einwilligungen (Art. 7 Abs. 3): mit Wirkung für die Zukunft, ohne dass die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung berührt wird.",
          ],
        },
        {
          type: "subheading",
          text: "Selbstbedienung in den Einstellungen",
        },
        {
          type: "p",
          text: "Viele Rechte können Sie direkt im Dienst ausüben — in den Scholar-Einstellungen (/scholar/settings):",
        },
        {
          type: "ul",
          items: [
            "Datenexport: Mit einem Klick erhalten Sie eine Datei mit Ihren Kontodaten, Einstellungen, Ihrem Suchverlauf sowie Ihren Lesezeichen und Leselisten.",
            "Kontolöschung: Sie löschen Ihr Konto selbst; dabei werden auch Suchverlauf, Lesezeichen sowie Leselisten und deren Einträge gelöscht.",
            "Suchverlauf und semantische Suche: jederzeit ein- und ausschaltbar; den Verlauf können Sie löschen.",
          ],
        },
        {
          type: "p",
          text: "Darüber hinaus erreichen Sie uns für alle Anliegen unter privacy@caelex.eu. Wir beantworten Anfragen grundsätzlich innerhalb eines Monats (Art. 12 Abs. 3 DSGVO). Soweit für eine Verarbeitung Ihre Hochschule Verantwortliche ist (§ 2), leiten wir Ihr Anliegen weiter bzw. unterstützen deren Beantwortung.",
        },
        {
          type: "subheading",
          text: "Beschwerderecht bei einer Aufsichtsbehörde (Art. 13(2)(d), 77)",
        },
        {
          type: "p",
          text: "Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für Caelex zuständig ist die Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI), Alt-Moabit 59–61, 10555 Berlin. Sie können sich auch an die Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsorts oder Arbeitsplatzes wenden.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 10 · Bereitstellungspflicht / Herkunft (Art. 13(2)(e), 14(2)(f))
    // ─────────────────────────────────────────────────────────────────
    {
      id: "bereitstellung",
      number: "§ 10",
      title: "Pflicht zur Bereitstellung und Herkunft der Daten",
      blocks: [
        {
          type: "p",
          text: "Die Bereitstellung Ihrer Konto- und Identitätsdaten ist für die Nutzung von Scholar erforderlich: Ohne Authentifizierung können wir Ihnen keinen Zugang gewähren. Es besteht keine gesetzliche oder vertragliche Pflicht, ein Konto anzulegen; die Nutzung von Scholar ist freiwillig.",
        },
        {
          type: "p",
          text: "Soweit Konto- und Identitätsdaten nicht von Ihnen unmittelbar, sondern über die Anmeldung Ihrer Hochschule (Single Sign-On) bzw. über Google (OAuth) erhoben werden, stammen sie aus diesen Quellen (Art. 14 DSGVO).",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 11 · KI / semantische Suche — Transparenz (AI Act Art. 50) + keine ADM
    // ─────────────────────────────────────────────────────────────────
    {
      id: "ki",
      number: "§ 11",
      title:
        "Künstliche Intelligenz: semantische Suche und keine automatisierte Entscheidung",
      blocks: [
        {
          type: "p",
          text: "Wenn Sie die semantische Suche aktivieren, nutzt Caelex Scholar ein KI-System, um Inhalte des Korpus anhand ihrer Bedeutung zu finden und Suchergebnisse zu ordnen („powered by Atlas“). Technisch werden hierzu Vektor-Einbettungen verwendet (siehe § 7 zur Übermittlung).",
        },
        {
          type: "p",
          text: "Im Sinne der Transparenz weisen wir nach Art. 50 der KI-Verordnung (EU) 2024/1689 darauf hin, dass Sie mit einem KI-gestützten Suchsystem interagieren. Die Ergebnisse sind eine Recherchehilfe; prüfen Sie wichtige Ergebnisse stets an der offiziellen Quelle. Caelex Scholar leistet keine Rechtsberatung.",
        },
        {
          type: "callout",
          variant: "warn",
          text: "Keine automatisierte Entscheidung im Einzelfall: Es findet keine ausschließlich automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des Art. 22 DSGVO statt, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlicher Weise erheblich beeinträchtigt. Die semantische Suche ordnet lediglich Inhalte; sie trifft keine Entscheidung über Sie.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 12 · Minderjährige (Art. 8, Recital 38)
    // ─────────────────────────────────────────────────────────────────
    {
      id: "minderjaehrige",
      number: "§ 12",
      title: "Hinweise für Minderjährige",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar richtet sich an Studierende und Beschäftigte von Hochschulen. Einzelne Nutzerinnen und Nutzer können minderjährig sein. In Deutschland ist eine Einwilligung in Dienste der Informationsgesellschaft nach Art. 8 DSGVO ab Vollendung des 16. Lebensjahres wirksam; bei jüngeren Personen ist die Einwilligung der Sorgeberechtigten erforderlich.",
        },
        {
          type: "p",
          text: "Wir gestalten Scholar so, dass die Kernfunktionen nicht auf einer Einwilligung beruhen (sondern auf dem Nutzungsverhältnis bzw. dem berechtigten Interesse, § 4) und die einwilligungsbasierten Funktionen (Suchverlauf, semantische Suche) standardmäßig ausgeschaltet sind. Wir erheben nicht eigens das Geburtsdatum zur Alterskontrolle und verarbeiten nicht mehr Daten als nötig.",
        },
        {
          type: "p",
          text: "Die Zuständigkeit für die Einhaltung von Art. 8 DSGVO (Alter, ggf. elterliche Einwilligung) wird im Verhältnis zur lizenzierenden Hochschule im Auftragsverarbeitungsvertrag geregelt; die Hochschule vermittelt den Zugang ihrer Angehörigen.",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 13 · Cookies / Endgerätezugriff (TDDDG §25) — pointer
    // ─────────────────────────────────────────────────────────────────
    {
      id: "cookies",
      number: "§ 13",
      title: "Cookies und Zugriff auf Ihr Endgerät",
      blocks: [
        {
          type: "p",
          text: "Für den Betrieb von Scholar verwenden wir technisch notwendige Cookies bzw. vergleichbare Technologien (z. B. zur Anmeldung und zum Schutz vor websiteübergreifender Anfragefälschung). Nicht notwendige Zugriffe auf Ihr Endgerät setzen Ihre Einwilligung nach § 25 TDDDG voraus. Einzelheiten finden Sie im Cookie-Hinweis (/scholar/legal/cookies).",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 14 · Sicherheit (Art. 32) — TOMs
    // ─────────────────────────────────────────────────────────────────
    {
      id: "sicherheit",
      number: "§ 14",
      title: "Datensicherheit (technische und organisatorische Maßnahmen)",
      blocks: [
        {
          type: "p",
          text: "Wir treffen geeignete technische und organisatorische Maßnahmen nach Art. 32 DSGVO, um Ihre Daten zu schützen, unter anderem:",
        },
        {
          type: "ul",
          items: [
            "Verschlüsselung sensibler Felder (AES-256-GCM) und Verschlüsselung in der Übertragung (TLS).",
            "Passwort-Hashing mit bcrypt sowie Mehr-Faktor-Authentifizierung und Hardware-Sicherheitsschlüssel (WebAuthn/FIDO2).",
            "Maskierung von IP-Adressen in Sicherheits-Protokollen sowie Schutz vor Brute-Force-Angriffen und Ratenbegrenzung.",
            "Manipulationssicheres Audit-Protokoll (Hash-Verkettung) und strenge Sicherheits-Header (u. a. CSP, HSTS).",
            "Strikte Geheimhaltung von Zugangsdaten/Schlüsseln (nur serverseitig) und Zugriff nach dem Need-to-know-Prinzip.",
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────
    // 15 · Änderungen
    // ─────────────────────────────────────────────────────────────────
    {
      id: "aenderungen",
      number: "§ 15",
      title: "Änderungen dieser Datenschutzerklärung",
      blocks: [
        {
          type: "p",
          text: "Wir passen diese Datenschutzerklärung an, wenn sich der Dienst, unsere Verarbeitungen oder die Rechtslage ändern. Es gilt die jeweils hier veröffentlichte Fassung; den Stand und die Version finden Sie oben.",
        },
      ],
    },
  ],
};
