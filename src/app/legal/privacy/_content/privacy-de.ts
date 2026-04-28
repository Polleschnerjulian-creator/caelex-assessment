import type { LegalDocument } from "@/lib/legal/types";

export const PRIVACY_DE: LegalDocument = {
  lang: "de",
  title: "Datenschutzerklärung",
  subtitle:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 und 14 DSGVO",
  version: "Version 3.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Diese Datenschutzerklärung informiert Sie transparent und umfassend über die Verarbeitung personenbezogener Daten beim Besuch unserer Website und bei der Nutzung der Caelex-Plattform.",
    "Wir folgen dem Grundsatz der Datenminimierung: wir erheben nur die Daten, die wir zur Erbringung unserer Leistungen oder zur Erfüllung rechtlicher Pflichten benötigen, und nutzen sie ausschließlich für die angegebenen Zwecke.",
    "Für Kundendaten, die Sie über die Plattform verarbeiten lassen, sind Sie der Verantwortliche. Caelex ist insoweit Auftragsverarbeiter; es gilt der Auftragsverarbeitungsvertrag (/legal/dpa).",
  ],
  sections: [
    {
      id: "p1",
      number: "§ 1",
      title: "Verantwortlicher",
      blocks: [
        {
          type: "p",
          text: "Verantwortlicher i.S.d. Art. 4 Nr. 7 DSGVO für die Verarbeitung personenbezogener Daten auf dieser Website und bei Nutzung der Caelex-Plattform ist:",
        },
        {
          type: "p",
          text: "Caelex, Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland. E-Mail: privacy@caelex.eu.",
        },
        {
          type: "p",
          text: "Ein Datenschutzbeauftragter wurde derzeit nicht benannt, da die gesetzlichen Voraussetzungen (§ 38 BDSG) nicht erfüllt sind. Für datenschutzrechtliche Anfragen nutzen Sie bitte privacy@caelex.eu.",
        },
      ],
    },
    {
      id: "p2",
      number: "§ 2",
      title: "Definitionen und rechtliche Grundlagen",
      blocks: [
        {
          type: "p",
          text: "Wir verarbeiten personenbezogene Daten auf Grundlage der DSGVO, insbesondere:",
        },
        {
          type: "ul",
          items: [
            "Art. 6 Abs. 1 lit. a DSGVO — Einwilligung (z.B. bei Newsletter, nicht notwendigen Cookies, Marketing)",
            "Art. 6 Abs. 1 lit. b DSGVO — Erfüllung eines Vertrages oder vorvertragliche Maßnahmen (Nutzung der Plattform, Support)",
            "Art. 6 Abs. 1 lit. c DSGVO — Erfüllung rechtlicher Pflichten (z.B. steuerrechtliche Aufbewahrung, § 147 AO)",
            "Art. 6 Abs. 1 lit. f DSGVO — berechtigte Interessen (z.B. IT-Sicherheit, Betrugsprävention, Produktverbesserung)",
            "Art. 9 Abs. 2 DSGVO — soweit besondere Kategorien betroffen sind (nicht im Normalbetrieb vorgesehen)",
          ],
        },
        {
          type: "p",
          text: "Die Begriffe folgen den Definitionen in Art. 4 DSGVO (insbesondere „personenbezogene Daten“, „Verarbeitung“, „Verantwortlicher“, „Auftragsverarbeiter“, „Empfänger“, „Dritter“, „Einwilligung“).",
        },
      ],
    },
    {
      id: "p3",
      number: "§ 3",
      title: "Erhobene Daten und Zwecke",
      blocks: [
        {
          type: "p",
          text: "Je nach Nutzung verarbeiten wir folgende Datenkategorien:",
        },
        {
          type: "p",
          text: "(1) Server-Log-Daten bei jedem Seitenaufruf: IP-Adresse (anonymisiert nach 30 Tagen), Datum und Uhrzeit, Browser- und Betriebssystem-Informationen, Referrer-URL, HTTP-Statuscode, übertragene Datenmenge. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit, Missbrauchsprävention). Speicherdauer: 30 Tage.",
        },
        {
          type: "p",
          text: "(2) Registrierung und Account: E-Mail, Name, Passwort (gehasht via bcrypt), Organisationszugehörigkeit, Sprache, Zeitzone, gewählter Tarif. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: für Dauer des Vertragsverhältnisses plus gesetzliche Aufbewahrungsfristen (6 bzw. 10 Jahre nach § 147 AO, § 257 HGB für Rechnungs- und Vertragsunterlagen).",
        },
        {
          type: "p",
          text: "(3) Nutzungsdaten der Plattform. Wir verarbeiten unterschiedliche Datenkategorien mit unterschiedlichen Speicherfristen, die wir technisch durch unseren täglichen Aufbewahrungsjob (`/api/cron/data-retention-cleanup`) durchsetzen:",
        },
        {
          type: "ul",
          items: [
            "Compliance-Inhalte (Assessments, Dokumente, Workflows, Bookmarks): bis 30 Tage nach Vertragsende (Export-Fenster), danach Löschung; bei aktiver gesetzlicher Aufbewahrungspflicht erfolgt eine Sperrung statt Löschung (Art. 17 Abs. 3 DSGVO).",
            "Astra-Konversationen und -Nachrichten: rollierendes 6-Monats-Fenster, automatische Löschung beim täglichen Aufbewahrungsjob.",
            "Analytics-Events (Nutzungs-Telemetrie): 90 Tage; User-Agent wird nach 30 Tagen anonymisiert.",
            "Sessions und Verifizierungs-Token: bei Ablauf gelöscht.",
            "Audit-Trail (manipulationssicher hash-verkettet, Pflicht-Compliance-Nachweis): bei Account-Löschung pseudonymisiert (`userId` entfernt, Hash-Kette bleibt intakt); aufbewahrt bis zu 7 Jahre als Beleg gegenüber Aufsichts- und Steuerbehörden, danach Löschung. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Compliance-Nachweise) i.V.m. Art. 5 Abs. 1 lit. e DSGVO. Über mandanten-übergreifende administrative Zugriffe protokollierte Einträge fallen unter dieselbe Frist; siehe § 5 (2).",
            "Sentinel-Telemetrie (CrossVerification 6 Monate, SentinelPacket 12 Monate).",
          ],
        },
        {
          type: "p",
          text: "Rechtsgrundlage für (3): Art. 6 Abs. 1 lit. b DSGVO, ergänzt um Art. 6 Abs. 1 lit. f DSGVO für den Audit-Trail.",
        },
        {
          type: "p",
          text: "(4) Zahlungsdaten: Rechnungsanschrift, Umsatzsteuer-ID, Zahlungshistorie. Kartendaten werden ausschließlich bei unserem Zahlungsdienstleister Stripe (s. § 5) gespeichert, nicht bei Caelex. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO. Speicherdauer: 10 Jahre (§ 147 AO).",
        },
        {
          type: "p",
          text: "(5) Kommunikationsdaten: Support-Anfragen, E-Mail-Korrespondenz, Demo-Anfragen, Newsletter-Abonnement. Rechtsgrundlage: Art. 6 Abs. 1 lit. b oder lit. a DSGVO. Speicherdauer: bis 3 Jahre nach Abschluss des Vorgangs, bei Newsletter bis Widerruf.",
        },
        {
          type: "p",
          text: "(6) Sicherheits- und Missbrauchsdaten. Wir trennen zwischen kurzlebigen Brute-Force-Erkennungsdaten und länger aufbewahrten Forensik-Daten:",
        },
        {
          type: "ul",
          items: [
            "Login-Versuche (LoginAttempt): 90 Tage. Die Brute-Force-Erkennung wertet ohnehin nur das letzte 15-Minuten-Fenster aus; die längere Frist deckt DSAR-Antworten ab.",
            "Login-Ereignisse (LoginEvent, einschließlich Geräte- und Standortinformationen): 12 Monate, sichtbar für Sie unter Sicherheitseinstellungen.",
            "Sicherheits-Events (SecurityEvent, SecurityAuditLog) der Stufen LOW und MEDIUM: 12 Monate ab Auflösung. Events der Stufen HIGH oder CRITICAL bleiben für forensische Untersuchungen erhalten, bis die Ursache vollständig dokumentiert wurde, längstens jedoch bis Ende der gesetzlichen Verjährungsfristen.",
            "Honey-Token-Trigger und Ergebnisse der Anomalieerkennung: dauerhaft, da diese als Indizien für Sicherheitsvorfälle dienen können (Art. 6 Abs. 1 lit. f DSGVO i.V.m. Art. 32 DSGVO).",
            "MFA-Konfiguration und WebAuthn-Credentials: bis Account-Löschung.",
          ],
        },
        {
          type: "p",
          text: "Rechtsgrundlage für (6): Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit, Missbrauchsprävention) i.V.m. Art. 32 DSGVO.",
        },
        {
          type: "p",
          text: "(7) Besondere Kategorien personenbezogener Daten i.S.d. Art. 9 DSGVO verarbeiten wir nicht.",
        },
      ],
    },
    {
      id: "p4",
      number: "§ 4",
      title: "Cookies und lokale Speicherung",
      blocks: [
        {
          type: "p",
          text: "Wir setzen technisch notwendige Cookies und LocalStorage-Einträge zur Bereitstellung der Plattform ein (Session, CSRF, Sprachpräferenz, Atlas-Bookmarks für Gäste). Diese basieren auf § 25 Abs. 2 TTDSG (unbedingt erforderlich) und brauchen keine Einwilligung.",
        },
        {
          type: "p",
          text: "Optionale Cookies (Analyse, Komfort) werden nur mit Einwilligung gesetzt (§ 25 Abs. 1 TTDSG, Art. 6 Abs. 1 lit. a DSGVO). Details zu Zweck, Anbieter und Laufzeit: siehe Cookie-Richtlinie (/legal/cookies). Einwilligung kann jederzeit über die Cookie-Einstellungen widerrufen werden.",
        },
      ],
    },
    {
      id: "p5",
      number: "§ 5",
      title: "Empfänger und Auftragsverarbeiter",
      blocks: [
        {
          type: "p",
          text: "Wir übermitteln personenbezogene Daten nur, wenn dies zur Erfüllung des Vertrages, aufgrund gesetzlicher Pflichten oder Ihrer Einwilligung erforderlich ist. Empfänger sind insbesondere die unter /legal/sub-processors gelisteten Auftragsverarbeiter:",
        },
        {
          type: "ul",
          items: [
            "Vercel Inc. (Hosting / Edge Network)",
            "Neon Inc. (Datenbank, EU-Region)",
            "Upstash Inc. (Rate-Limiting / Cache, EU-Region)",
            "Stripe Payments Europe Ltd. (Zahlungsabwicklung, Irland)",
            "Resend Inc. (Transaktionale E-Mails)",
            "Sentry / Functional Software Inc. (Fehler-Monitoring mit PII-Scrubbing)",
            "Anthropic PBC (KI-Inferenz für Astra, Zero-Data-Retention)",
            "OpenAI L.L.C. (Embedding-Modelle für die Atlas-Library-Volltextsuche, Zero-Data-Retention)",
          ],
        },
        {
          type: "p",
          text: "Gegenüber Steuerberatern, Wirtschaftsprüfern und Strafverfolgungsbehörden übermitteln wir nur, soweit wir dazu gesetzlich verpflichtet sind. Gegenüber Dritten (Werbepartner, Datenhändler etc.) erfolgt keine Übermittlung.",
        },
        {
          type: "p",
          text: "(2) Eingeschränkter administrativer Zugriff durch Plattform-Inhaber. Eine eng begrenzte Anzahl interner Caelex-Konten (Plattform-Inhaber, derzeit vier Konten — Stand der jeweils aktuellen Allowlist in src/lib/super-admin.ts im Repository) verfügt über mandanten-übergreifenden administrativen Lesezugriff. Dieser Zugriff dient ausschließlich (a) der Fehlersuche bei konkreten Kundenanfragen, (b) der Wiederherstellung nach Fehlkonfigurationen und (c) der Erfüllung gesetzlicher Mitwirkungspflichten. Jede mandanten-übergreifende Scope-Auflösung wird in der manipulationssicheren Audit-Chain (`super_admin_cross_tenant_access`) protokolliert; das Protokoll kann auf schriftliche Anfrage gemäß Art. 28 Abs. 3 lit. h DSGVO durch den Verantwortlichen eingesehen werden.",
        },
      ],
    },
    {
      id: "p6",
      number: "§ 6",
      title: "Datentransfer in Drittländer",
      blocks: [
        {
          type: "p",
          text: "(1) Einige Auftragsverarbeiter haben ihren Sitz in den USA oder verarbeiten dort Daten. In diesen Fällen erfolgt der Transfer ausschließlich auf Grundlage der EU-Standardvertragsklauseln (Durchführungsbeschluss (EU) 2021/914) und, soweit anwendbar, im Rahmen des EU-US Data Privacy Framework (Durchführungsbeschluss (EU) 2023/1795). Die jeweils geltende Transfergrundlage je Auftragsverarbeiter ist in /legal/sub-processors einzeln ausgewiesen.",
        },
        {
          type: "p",
          text: "(2) Wo möglich, wählen wir EU-Regionen statt US-Regionen. Konkret: für KI-Inferenz wird Anthropic-Claude bevorzugt über das Vercel AI Gateway an AWS Bedrock in der EU (Frankfurt / Irland) geroutet — in diesem Pfad findet KEIN Drittlandtransfer statt. Erst beim Fallback (Bedrock nicht verfügbar oder Gateway nicht konfiguriert) greift der direkte Anthropic-USA-Pfad mit DPF + SCC. Details: § 7 (1).",
        },
        {
          type: "p",
          text: "(3) Ergänzende Schutzmaßnahmen umfassen Transport- und Ruhezustand-Verschlüsselung, Pseudonymisierung, PII-Scrubbing (Sentry) und Zero-Data-Retention-Zusagen (Anthropic, OpenAI).",
        },
      ],
    },
    {
      id: "p7",
      number: "§ 7",
      title: "KI-Funktionen (Astra, Atlas, Generate)",
      blocks: [
        {
          type: "p",
          text: "(1) Unsere Plattform enthält KI-gestützte Funktionen. Anfragen werden über gesicherte Verbindungen an Anthropic PBC für die Konversations-Antworten (Astra-Compliance-Copilot, Atlas-Anwalts-Modus, Generate 2.0) und an OpenAI L.L.C. ausschließlich für Embeddings der Atlas-Library-Suche übermittelt.",
        },
        {
          type: "p",
          text: "Routing für Anthropic (Vorzugspfad EU): Anfragen werden bevorzugt über das Vercel AI Gateway an Anthropic via AWS Bedrock in der EU (Frankfurt / Irland) geroutet — in diesem Pfad findet kein Drittlandtransfer statt. Nur falls das Gateway nicht konfiguriert oder die EU-Bedrock-Region nicht verfügbar ist, fallen wir auf die direkte Anthropic-API (USA) zurück. Welcher Pfad aktiv ist, ergibt sich aus der Konfiguration in `src/lib/atlas/anthropic-client.ts` und kann über das Vercel-Project-Settings-Dashboard nachvollzogen werden.",
        },
        {
          type: "p",
          text: "Routing für OpenAI: Embedding-Aufrufe laufen ausschließlich über das Vercel AI Gateway. OpenAI agiert als Sub-Sub-Auftragsverarbeiter unter Vercel; eine direkte Vertragsbeziehung zwischen Caelex und OpenAI besteht nicht.",
        },
        {
          type: "p",
          text: "(2) Wir haben mit Anthropic und OpenAI Zero-Data-Retention-Vereinbarungen: Ihre Eingaben werden nach Beantwortung bzw. Embedding-Berechnung nicht gespeichert und nicht zum Training der Modelle verwendet.",
        },
        {
          type: "p",
          text: "(3) Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung der bestellten KI-Funktion). Die Transfergrundlage ergibt sich aus § 6.",
        },
        {
          type: "p",
          text: "(4) Wir folgen den Anforderungen der Verordnung (EU) 2024/1689 (KI-Verordnung). Astra- und Atlas-Ausgaben werden als KI-generiert gekennzeichnet (§ 7 AGB, Anhang E AGB).",
        },
        {
          type: "p",
          text: "(5) Persistenzverhalten in Atlas (Anwalts-/Compliance-Modus). Atlas-Konversationen werden serverseitig nicht in der Datenbank gespeichert. Während eines Chat-Turns existieren Ihre Eingabe und die generierte Antwort ausschließlich (a) im Speicher des verarbeitenden Serverless-Funktionsaufrufs für die Dauer der SSE-Verbindung und (b) im Browser-Speicher Ihres Endgeräts. Brechen Sie eine Antwort ab oder bricht die Verbindung mit einem Fehler ab, gilt das Folgende:",
        },
        {
          type: "ul",
          items: [
            "Auf Caelex-Seite: Es wird KEIN Konversations- oder Nachrichtendatensatz angelegt. Die unvollständige Antwort verbleibt allenfalls im Browser-Cache Ihres Endgeräts und wird beim nächsten Seiten-Reload entfernt.",
            "Auf Anthropic-Seite: Aufgrund der Zero-Data-Retention-Zusage werden Eingabe und (Teil-)Ausgabe nicht persistiert.",
            "Audit-Trail: Wir protokollieren ausschließlich Meta-Daten (Aufruf, Tool-Nutzung, Compliance-Flags wie eingespielte Disclaimer-Banner oder unverifizierte Zitationen). Die Inhalte der Konversation werden nicht in die Audit-Logs aufgenommen.",
            "Manuelle Persistenz: Eine Speicherung erfolgt erst, wenn Sie aktiv eine Aktion auslösen (Speichern in der Atlas-Library als `AtlasResearchEntry`, Pinnen in einem Workspace als `AtlasWorkspaceCard`, Setzen eines Bookmarks oder Erstellen einer Annotation). Diese gespeicherten Inhalte werden nach den Fristen in § 3 (3) verarbeitet und unterliegen Ihrem Lösch-Recht (Art. 17 DSGVO).",
          ],
        },
        {
          type: "p",
          text: "(6) Persistenzverhalten in Astra (Compliance-Copilot, dashboard-seitig). Astra-Konversationen werden in den Modellen `AstraConversation` und `AstraMessage` gespeichert, damit die Konversation über Sessions hinweg fortgeführt werden kann. Die Speicherdauer beträgt 6 Monate ab letzter Aktivität (siehe § 3 (3)).",
        },
      ],
    },
    {
      id: "p8",
      number: "§ 8",
      title: "Automatisierte Entscheidungsfindung",
      blocks: [
        {
          type: "p",
          text: "Automatisierte Einzelentscheidungen i.S.d. Art. 22 DSGVO mit Rechtswirkung gegenüber betroffenen Personen führen wir nicht durch. Scoring und Ratings in Assure dienen ausschließlich informatorischen Zwecken und sind keine automatisierten Entscheidungen i.S.d. Art. 22.",
        },
      ],
    },
    {
      id: "p9",
      number: "§ 9",
      title: "Ihre Rechte",
      blocks: [
        {
          type: "p",
          text: "Sie haben als betroffene Person folgende Rechte nach DSGVO:",
        },
        {
          type: "ul",
          items: [
            "Auskunft über Ihre verarbeiteten Daten (Art. 15 DSGVO)",
            "Berichtigung unrichtiger Daten (Art. 16 DSGVO)",
            "Löschung („Recht auf Vergessenwerden“) (Art. 17 DSGVO)",
            "Einschränkung der Verarbeitung (Art. 18 DSGVO)",
            "Datenübertragbarkeit (Art. 20 DSGVO)",
            "Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen (Art. 21 DSGVO)",
            "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)",
            "Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)",
          ],
        },
        {
          type: "p",
          text: "Anfragen senden Sie bitte an privacy@caelex.eu. Wir antworten grundsätzlich binnen 30 Tagen (Art. 12 Abs. 3 DSGVO). Zuständige Aufsichtsbehörde für Caelex ist die Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59–61, 10555 Berlin.",
        },
      ],
    },
    {
      id: "p10",
      number: "§ 10",
      title: "Speicherdauer und Löschung",
      blocks: [
        {
          type: "p",
          text: "Die konkreten Speicherdauern ergeben sich aus § 3 dieser Erklärung. Generell gilt: personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfällt und keine gesetzlichen Aufbewahrungspflichten (insb. HGB, AO) entgegenstehen.",
        },
        {
          type: "p",
          text: "Löschkonflikte lösen wir nach Art. 17 Abs. 3 DSGVO zugunsten der gesetzlichen Pflichten; die betroffenen Daten werden dann gesperrt und nur für die Pflicht-Zwecke genutzt.",
        },
      ],
    },
    {
      id: "p11",
      number: "§ 11",
      title: "Sicherheit",
      blocks: [
        {
          type: "p",
          text: "Wir treffen geeignete technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO, um Ihre Daten zu schützen. Die Maßnahmen sind im DPA Anlage 1 detailliert (/legal/dpa). Wesentliche Elemente: TLS 1.2+ in Übertragung, AES-256-GCM im Ruhezustand, MFA, hash-verkettete Audit-Logs, Anomalieerkennung, getrennte Umgebungen.",
        },
        {
          type: "p",
          text: "Datenschutzvorfälle melden wir bei Vorliegen der Voraussetzungen nach Art. 33 DSGVO innerhalb von 72 Stunden an die Aufsichtsbehörde und, wo erforderlich, an betroffene Personen (Art. 34 DSGVO).",
        },
      ],
    },
    {
      id: "p12",
      number: "§ 12",
      title: "Newsletter und Marketing",
      blocks: [
        {
          type: "p",
          text: "(1) Newsletter und Marketing-E-Mails senden wir nur mit Ihrer ausdrücklichen Einwilligung (Double-Opt-In). Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 7 UWG.",
        },
        {
          type: "p",
          text: "(2) Sie können jederzeit den Abmeldelink in jeder Nachricht nutzen oder an privacy@caelex.eu schreiben. Die Einwilligung wird protokolliert (Zeitpunkt, IP, bestätigter Double-Opt-In).",
        },
      ],
    },
    {
      id: "p13",
      number: "§ 13",
      title: "Soziale Medien, externe Links",
      blocks: [
        {
          type: "p",
          text: "Auf unserer Website setzen wir keine Social-Media-Plug-Ins mit automatischem Datenabfluss ein. Externe Links zu Primärquellen (EUR-Lex, UNOOSA etc.) sind als solche gekennzeichnet und öffnen in einem neuen Tab. Die jeweiligen Anbieter sind für ihre Datenverarbeitung selbst verantwortlich.",
        },
      ],
    },
    {
      id: "p14",
      number: "§ 14",
      title: "Bewerbungsdaten",
      blocks: [
        {
          type: "p",
          text: "Bewerbungsunterlagen verarbeiten wir auf Grundlage von § 26 BDSG (Bewerbung) und Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: bis zu 6 Monate nach Abschluss des Verfahrens, bei aufgenommenem Arbeitsverhältnis während der Beschäftigung und nach gesetzlichen Aufbewahrungsfristen.",
        },
      ],
    },
    {
      id: "p15",
      number: "§ 15",
      title: "Änderungen dieser Erklärung",
      blocks: [
        {
          type: "p",
          text: "Wir passen diese Erklärung an, wenn sich unsere Verarbeitungen oder die rechtlichen Rahmenbedingungen ändern. Wesentliche Änderungen kommunizieren wir per E-Mail oder In-App-Mitteilung. Die jeweils geltende Fassung finden Sie unter caelex.eu/legal/privacy.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [
    "Caelex",
    "Inhaber: Julian Polleschner",
    "Am Maselakepark 37",
    "13587 Berlin, Deutschland",
    "",
    "Datenschutzanfragen:",
    "mailto:privacy@caelex.eu",
    "Sicherheitsmeldungen:",
    "mailto:security@caelex.eu",
    "Rechtliche Anfragen:",
    "mailto:legal@caelex.eu",
  ],
  links: [
    { label: "English Version →", href: "/legal/privacy-en" },
    { label: "AV-Vertrag / DPA", href: "/legal/dpa" },
    { label: "Sub-Auftragsverarbeiter", href: "/legal/sub-processors" },
    { label: "Cookie-Richtlinie", href: "/legal/cookies" },
    { label: "AGB", href: "/legal/terms" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
