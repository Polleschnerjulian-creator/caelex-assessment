# Auftragsverarbeitungsvertrag (AVV) — Caelex Scholar / University Data Processing Agreement (Art. 28 GDPR)

> ╔══════════════════════════════════════════════════════════════════════════╗
> ║ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung ║
> ║ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. **Keine** ║
> ║ **Rechtsberatung.** / Template; must be reviewed and adapted by qualified ║
> ║ legal counsel before publication or execution. **Not legal advice.** ║
> ╚══════════════════════════════════════════════════════════════════════════╝

|                                             |                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Dokument / Document**                     | University Data Processing Agreement (AVV, Art. 28 DSGVO) — Caelex Scholar                                                |
| **Status**                                  | ENTWURF / DRAFT — lawyer review required before execution                                                                 |
| **Version**                                 | 0.1 (Entwurf / Draft)                                                                                                     |
| **Stand / Last updated**                    | {{DATE}}                                                                                                                  |
| **Verbindliche Sprache / Binding language** | Deutsch (binding). English is a convenience translation; in case of conflict the German wording prevails.                 |
| **Gilt für / Scope**                        | Caelex Scholar (`caelex.eu/scholar`) — university-licensed, SSO-gated legal-research service                              |
| **Maßgebliche Spec / Source spec**          | `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` (G1, G2, G17)                                      |
| **Adaptiert von / Adapted from**            | Platform DPA `src/app/legal/dpa/_content/dpa-de.ts` (Version 1.0) — re-scoped to the B2B2C university-as-controller model |

---

## Anwendungshinweis (intern) / Drafting note (internal)

Dieses Dokument ist die **B2B2C-Variante** des Auftragsverarbeitungsvertrags: Anders als der bestehende Plattform-AVV (Kunde = Verantwortlicher für Compliance-Daten), ist hier die **lizenzierende Universität der Verantwortliche** für die personenbezogenen Daten ihrer Studierenden/Mitarbeitenden, soweit diese im Rahmen des vertraglich gebuchten Scholar-Dienstes verarbeitet werden. Caelex ist insoweit **Auftragsverarbeiter**.

> **Dual-Role-Hinweis (load-bearing).** Caelex ist NICHT für alle Verarbeitungen Auftragsverarbeiter. Für eigene Zwecke (Produktsicherheit, Missbrauchsabwehr, gesetzliche Pflichten, eigene KI-/Modell-Entscheidungen, Plattform-Telemetrie) ist Caelex **eigener Verantwortlicher** (Art. 4 Nr. 7 DSGVO). Die genaue Rollen-Zuordnung pro Verarbeitungstätigkeit steht in `raci-role-allocation.md` (RACI) und ist **Anlage 4** dieses AVV. Dieser AVV regelt ausschließlich den Auftragsverarbeitungs-Teil.

This is the **B2B2C variant** of the data processing agreement. The **licensing university is the controller** for its students'/staff' personal data within the contracted Scholar service; **Caelex is the processor**. For Caelex's own purposes (product security, abuse prevention, legal obligations, Caelex's own AI/model decisions, platform telemetry) **Caelex is an independent controller** — see the RACI in `raci-role-allocation.md` (Annex 4). This AVV governs only the processor part.

---

## Vertragsparteien / Parties

**Verantwortlicher / Controller ("Universität" / "the University"):**

> [TBD: vollständiger Name der Universität / full legal name]
> [TBD: Anschrift / address]
> [TBD: gesetzlich vertreten durch / legally represented by]
> [TBD: Ansprechpartner Datenschutz / DP contact + behördlicher Datenschutzbeauftragter der Hochschule]

**Auftragsverarbeiter / Processor ("Caelex"):**

> Caelex — Einzelunternehmen, Inhaber: Julian Polleschner
> Am Maselakepark 37, 13587 Berlin, Deutschland
> Kontakt Datenschutz: privacy@caelex.eu · Sicherheitsvorfälle: security@caelex.eu · Rechtliches: legal@caelex.eu
> (Quelle: `src/app/legal/impressum/page.tsx`)

— nachfolgend einzeln „Partei" und gemeinsam „Parteien" / each a "Party", together the "Parties".

---

## Präambel / Recitals

(DE — verbindlich)

1. Die Universität hat mit Caelex einen Hauptvertrag über die Bereitstellung des Dienstes **Caelex Scholar** geschlossen (der „Hauptvertrag"; Lizenz-/Nutzungsvertrag). Caelex Scholar ist eine SSO-gebundene, rechtswissenschaftliche Recherchedatenbank für Studierende und Mitarbeitende der Universität; der Dienst ist für die Endnutzer kostenfrei und wird von der Universität lizenziert.
2. Im Rahmen der Erbringung des Dienstes verarbeitet Caelex personenbezogene Daten von betroffenen Personen, für die die Universität Verantwortliche im Sinne des Art. 4 Nr. 7 DSGVO ist (insbesondere Studierende und Mitarbeitende, die sich per SSO authentifizieren).
3. Dieser Auftragsverarbeitungsvertrag („AVV") konkretisiert die datenschutzrechtlichen Rechte und Pflichten der Parteien nach Art. 28 DSGVO und ist integraler Bestandteil des Hauptvertrags. Bei Widersprüchen zwischen diesem AVV und dem Hauptvertrag gehen für die hier geregelten Gegenstände die Regelungen dieses AVV vor.
4. Maßgeblich sind die Verordnung (EU) 2016/679 („DSGVO") sowie das Bundesdatenschutzgesetz („BDSG") und einschlägige landesrechtliche Datenschutzbestimmungen (insbesondere die jeweiligen Landeshochschul-/Landesdatenschutzgesetze) in der jeweils geltenden Fassung. [TBD: einschlägiges Landesdatenschutzgesetz der Universität — counsel bestätigt, ob die Hochschule als öffentliche Stelle eines Landes dem jeweiligen LDSG unterliegt.]

(EN — convenience)

1. The University has entered into a main agreement with Caelex for the provision of **Caelex Scholar** (the "Main Agreement"). Caelex Scholar is an SSO-gated legal-research database for the University's students and staff; the service is free for end users and licensed by the University.
2. In providing the service, Caelex processes personal data of data subjects for which the University is the controller within the meaning of Art. 4(7) GDPR (in particular students and staff who authenticate via SSO).
3. This data processing agreement ("AVV") sets out the parties' data-protection rights and obligations under Art. 28 GDPR and is an integral part of the Main Agreement. In case of conflict, this AVV prevails for the matters it governs.
4. The GDPR, the German Federal Data Protection Act (BDSG) and applicable state-level data-protection law apply. [TBD: the University's applicable Land data-protection act — counsel to confirm.]

---

## § 1 Gegenstand, Umfang und Dauer / Subject-matter, scope and duration

(DE)

1. Gegenstand dieses AVV ist die Verarbeitung personenbezogener Daten durch Caelex im Auftrag und auf dokumentierte Weisung der Universität im Zuge der Bereitstellung des Dienstes **Caelex Scholar** und seiner vertraglich vereinbarten Funktionen (SSO-Authentifizierung, Recherche im Rechtskorpus, semantische Suche [opt-in], Recherche-Verlauf [opt-in], Merklisten/Bookmarks, Leselisten, Nutzer-Voreinstellungen, Datenexport und Selbstlöschung).
2. **Art der Verarbeitung, Zweck, Datenkategorien, Kategorien betroffener Personen** und **Dauer** sind in **Anlage 1 (Verarbeitungsbeschreibung)** abschließend für den Auftragsverarbeitungs-Teil beschrieben.
3. Die **Laufzeit** dieses AVV entspricht der Laufzeit des Hauptvertrags. Pflichten, die ihrer Natur nach fortbestehen (insbesondere Löschung/Rückgabe, Vertraulichkeit, Nachweis- und Unterstützungspflichten), gelten über das Vertragsende hinaus (§ 11).
4. **Verarbeitungsort** ist primär die Europäische Union und der Europäische Wirtschaftsraum; die Produktivdatenbank wird in der EU-Region eu-central-1 (Frankfurt) betrieben. Drittland-Verarbeitung erfolgt ausschließlich unter den Bedingungen des § 12.

(EN)

1. The subject-matter is the processing of personal data by Caelex on behalf of and on the documented instructions of the University in providing **Caelex Scholar** and its contracted features (SSO authentication, research over the legal corpus, semantic search [opt-in], search history [opt-in], bookmarks, reading lists, user preferences, data export and self-service erasure).
2. The **nature, purpose, data categories, categories of data subjects** and **duration** are set out exhaustively for the processor part in **Annex 1 (Description of Processing)**.
3. The **term** matches the Main Agreement; obligations that by their nature survive (deletion/return, confidentiality, evidence and assistance duties) continue after termination (§ 11).
4. The **place of processing** is primarily the EU/EEA; the production database runs in EU region eu-central-1 (Frankfurt). Third-country processing only under § 12.

---

## § 2 Weisungsrecht des Verantwortlichen / Controller's right to instruct

(DE)

1. Caelex verarbeitet personenbezogene Daten **ausschließlich auf dokumentierte Weisung** der Universität, einschließlich in Bezug auf Drittland-Übermittlungen, es sei denn, Caelex ist hierzu nach Unionsrecht oder dem Recht der Mitgliedstaaten verpflichtet, dem Caelex unterliegt (Art. 28 Abs. 3 lit. a DSGVO). In diesem Fall teilt Caelex der Universität diese rechtlichen Anforderungen vor der Verarbeitung mit, sofern das betreffende Recht eine solche Mitteilung nicht wegen eines wichtigen öffentlichen Interesses verbietet.
2. Die Vereinbarung dieses AVV samt Anlagen sowie die Nutzung des Dienstes nach seinen vertraglich vereinbarten Funktionen stellen die **dokumentierte Erst-Weisung** dar. Weitere Einzelweisungen erteilt die Universität in Textform an privacy@caelex.eu.
3. Caelex **informiert die Universität unverzüglich**, wenn eine Weisung nach Auffassung von Caelex gegen die DSGVO oder andere Datenschutzvorschriften der Union oder der Mitgliedstaaten verstößt (Art. 28 Abs. 3 S. 3 DSGVO). Caelex ist berechtigt, die Ausführung der betreffenden Weisung bis zur Bestätigung oder Änderung durch die Universität auszusetzen.
4. Caelex teilt der Universität die bei Caelex zum Empfang von Weisungen autorisierten Personen mit; Änderungen werden unverzüglich mitgeteilt.

(EN)

1. Caelex processes personal data **only on documented instructions** from the University, including as regards transfers to third countries, unless required to do so by Union or Member-State law to which Caelex is subject; in that case Caelex informs the University of that legal requirement before processing, unless the law prohibits such information on important grounds of public interest (Art. 28(3)(a) GDPR).
2. This AVV and the contracted use of the service constitute the **documented initial instruction**. Further individual instructions are issued in text form to privacy@caelex.eu.
3. Caelex **informs the University without undue delay** if, in its opinion, an instruction infringes the GDPR or other data-protection provisions (Art. 28(3) sentence 3 GDPR), and may suspend execution of that instruction until confirmed or amended.
4. Caelex notifies the University of the persons authorised to receive instructions; changes are notified without undue delay.

---

## § 3 Vertraulichkeit / Confidentiality

(DE)

1. Caelex stellt sicher, dass sich die zur Verarbeitung der personenbezogenen Daten befugten Personen zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen (Art. 28 Abs. 3 lit. b DSGVO).
2. Die Verpflichtung zur Vertraulichkeit besteht auch nach Beendigung der jeweiligen Tätigkeit fort.
3. Caelex gewährt Zugriff auf personenbezogene Daten nach dem **Need-to-know-Prinzip** und über rollenbasierte Zugriffskontrolle (RBAC) mit dem Grundsatz der minimalen Berechtigung (vgl. Anlage 2, TOMs).

(EN)

1. Caelex ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality (Art. 28(3)(b) GDPR).
2. The confidentiality obligation survives termination of the respective activity.
3. Access is granted on a **need-to-know** basis via role-based access control (RBAC) under the least-privilege principle (see Annex 2, TOMs).

---

## § 4 Technische und organisatorische Maßnahmen (TOMs) / Security measures (Art. 32)

(DE)

1. Caelex trifft alle nach Art. 32 DSGVO erforderlichen TOMs, die dem Stand der Technik, den Implementierungskosten sowie Art, Umfang, Umständen und Zwecken der Verarbeitung und dem Risiko für die Rechte und Freiheiten natürlicher Personen angemessen sind. Die maßgeblichen TOMs sind in **Anlage 2** dokumentiert.
2. Caelex ist berechtigt, die TOMs fortzuentwickeln, solange das vereinbarte Schutzniveau **nicht unterschritten** wird.
3. Bei der Beurteilung des angemessenen Schutzniveaus werden insbesondere die Risiken berücksichtigt, die mit der Verarbeitung der Daten Studierender und Mitarbeitender — **darunter ggf. minderjähriger betroffener Personen** — verbunden sind (Art. 32 Abs. 2 DSGVO; vgl. § 9).

(EN)

1. Caelex implements all measures required under Art. 32 GDPR, appropriate to the state of the art, costs, and the risk to data subjects. The applicable TOMs are documented in **Annex 2**.
2. Caelex may evolve the TOMs provided the agreed protection level is **not reduced**.
3. The risk assessment takes into account the processing of students'/staff' data, **including potentially minor data subjects** (Art. 32(2) GDPR; see § 9).

---

## § 5 Sub-Auftragsverarbeiter / Sub-processors (Art. 28(2), (4))

(DE)

1. Die Universität erteilt Caelex die **allgemeine schriftliche Genehmigung** im Sinne des Art. 28 Abs. 2 S. 2 DSGVO zur Beauftragung der in **Anlage 3** gelisteten Sub-Auftragsverarbeiter.
2. **Flow-through (Art. 28 Abs. 4 DSGVO):** Caelex verpflichtet jeden Sub-Auftragsverarbeiter vertraglich (in Textform) auf **dieselben Datenschutzpflichten**, die in diesem AVV festgelegt sind, insbesondere auf hinreichende TOMs und die Einhaltung der Weisungen. Kommt der Sub-Auftragsverarbeiter seinen Datenschutzpflichten nicht nach, haftet Caelex gegenüber der Universität für die Einhaltung der Pflichten dieses Sub-Auftragsverarbeiters.
3. **Änderungs-/Widerspruchsverfahren:** Caelex informiert die Universität **mindestens 30 Tage vor** Hinzuziehung oder Austausch eines Sub-Auftragsverarbeiters. Die jeweils aktuelle Liste ist unter `caelex.eu/scholar/legal/sub-processors` einsehbar; die Universität kann sich für einen Benachrichtigungsdienst registrieren. Die Universität kann aus wichtigem, datenschutzbezogenem Grund in Textform widersprechen. Kann Caelex dem berechtigten Widerspruch nicht durch eine vergleichbare Alternative begegnen, steht der Universität ein Sonderkündigungsrecht hinsichtlich des betroffenen Dienstteils zum Zeitpunkt des Wechsels zu.
4. Die bloße Nutzung von Dienstleistern **ohne Zugriff** auf personenbezogene Daten ist keine Unterauftragsverarbeitung.

(EN)

1. The University grants Caelex the **general written authorisation** (Art. 28(2) sentence 2 GDPR) to engage the sub-processors listed in **Annex 3**.
2. **Flow-through (Art. 28(4) GDPR):** Caelex contractually binds each sub-processor (in text form) to the **same data-protection obligations** as set out in this AVV, in particular sufficient TOMs and adherence to instructions. Where a sub-processor fails, Caelex remains fully liable to the University.
3. **Change/objection procedure:** Caelex informs the University **at least 30 days before** adding or replacing a sub-processor. The current list is at `caelex.eu/scholar/legal/sub-processors`; the University may subscribe to change notifications and may object in text form on important data-protection grounds. If Caelex cannot address a legitimate objection with a comparable alternative, the University may terminate the affected part of the service as of the change date.
4. Engaging service providers **without access** to personal data is not sub-processing.

---

## § 6 Unterstützung bei Betroffenenrechten / Assistance with data-subject rights (Art. 28(3)(e))

(DE)

1. Caelex unterstützt die Universität nach Möglichkeit mit **geeigneten technischen und organisatorischen Maßnahmen** bei der Erfüllung ihrer Pflicht zur Beantwortung von Anträgen betroffener Personen auf Wahrnehmung ihrer Rechte nach Kapitel III DSGVO (Art. 15–22), insbesondere durch:
   - **Self-Service-Funktionen** im Dienst (Auskunft/Export und Selbstlöschung des eigenen Scholar-Kontos);
   - **Datenexport** (Art. 15, 20): Der Export umfasst Kontodaten, Nutzer-Voreinstellungen (`ScholarUserPreferences`), Recherche-Verlauf (`ScholarSearchHistory`), Merklisten (`ScholarBookmark`) und Leselisten (`ScholarReadingList` inkl. Einträge); [TBD: counsel bestätigt Vollständigkeit gegen den aktuellen Daten-Inventar — vgl. Spec G9.]
   - **Löschung/Vergessenwerden** (Art. 17): Die Selbstlöschung kaskadiert über alle Scholar-Tabellen (`ScholarUserPreferences`, `ScholarSearchHistory`, `ScholarBookmark`, `ScholarReadingList(+Item)`).
2. Wendet sich eine betroffene Person **unmittelbar an Caelex**, leitet Caelex den Antrag **unverzüglich** an die Universität weiter und beantwortet ihn nicht selbst, soweit nicht ausdrücklich durch die Universität angewiesen oder rechtlich zwingend.
3. **Berichtigung (Art. 16):** Nutzerprofil und Voreinstellungen sind durch die betroffene Person selbst editierbar.

(EN)

1. Caelex assists the University, by appropriate technical and organisational measures, in fulfilling its obligation to respond to data-subject requests under Chapter III GDPR (Arts. 15–22), in particular via **self-service** access/export and erasure; **data export** covering account data, preferences, search history, bookmarks and reading lists [TBD: counsel to confirm completeness — spec G9]; and **erasure** cascading across all Scholar tables.
2. If a data subject contacts **Caelex directly**, Caelex **forwards the request to the University without undue delay** and does not answer it itself unless instructed or legally required.
3. **Rectification (Art. 16):** profile and preferences are self-editable.

---

## § 7 Unterstützung bei Art. 32–36 DSGVO / Assistance with Arts. 32–36 (Art. 28(3)(f))

(DE)

Caelex unterstützt die Universität unter Berücksichtigung der Art der Verarbeitung und der Caelex zur Verfügung stehenden Informationen bei der Einhaltung der Pflichten aus den Art. 32 bis 36 DSGVO, insbesondere:

1. **Sicherheit der Verarbeitung (Art. 32):** Aufrechterhaltung der TOMs (Anlage 2); rasche Wiederherstellbarkeit nach Zwischenfällen.
2. **Meldung von Verletzungen (Art. 33, 34):** nach Maßgabe des § 8.
3. **Datenschutz-Folgenabschätzung (Art. 35):** Bereitstellung angemessener Informationen (Produktbeschreibung, TOMs, Sub-Auftragsverarbeiter-Liste, ggf. Zusammenfassungen interner Risikoanalysen). Hinweis: Wegen der Merkmale **minderjährige betroffene Personen + KI-gestützte semantische Suche + (opt-in) verhaltensbezogene Verlaufsspeicherung** ist eine DSFA durch die Universität wahrscheinlich erforderlich (Art. 35; vgl. Spec G14; siehe auch `dpo-appointment-note.md`). [TBD: counsel/Universität führen die DSFA durch.]
4. **Vorherige Konsultation (Art. 36):** Unterstützung, soweit erforderlich.

> Über die in diesem AVV vereinbarten Pflichten hinausgehende Unterstützungsleistungen kann Caelex nach Zeitaufwand zu branchenüblichen Sätzen berechnen.

(EN)

Caelex assists the University, taking into account the nature of processing and the information available to Caelex, in complying with Arts. 32–36 GDPR: security of processing (Art. 32; TOMs in Annex 2); breach notification (Arts. 33–34 per § 8); DPIA support (Art. 35) — note a DPIA by the University is **likely required** given **minor data subjects + AI semantic search + (opt-in) behavioural history** (spec G14; see `dpo-appointment-note.md`); and prior consultation (Art. 36). Assistance beyond the agreed obligations may be charged at standard rates.

---

## § 8 Meldung von Verletzungen des Schutzes personenbezogener Daten / Personal-data-breach notification

(DE)

1. Caelex meldet der Universität jede ihm bekannt gewordene Verletzung des Schutzes personenbezogener Daten, die dem Verantwortungsbereich von Caelex zuzurechnen ist, **unverzüglich** nach Bekanntwerden (Art. 33 Abs. 2 DSGVO). **Ziel-Reaktionszeit: in der Regel binnen 24 Stunden**, damit die Universität ihre eigene 72-Stunden-Meldefrist gegenüber der Aufsichtsbehörde (Art. 33 Abs. 1 DSGVO) einhalten kann.
2. Die Meldung enthält, soweit bekannt: Art der Verletzung, betroffene Datenkategorien und Kategorien sowie ungefähre Zahl der betroffenen Personen und Datensätze, wahrscheinliche Folgen, ergriffene und vorgeschlagene Abhilfemaßnahmen sowie eine Kontaktstelle.
3. Die **Meldung an die zuständige Aufsichtsbehörde** (Art. 33) und ggf. an betroffene Personen (Art. 34) obliegt der **Universität als Verantwortliche**. Caelex unterstützt bei der Erstellung der Meldungen und der Risikobewertung.
4. **Zentraler Meldekanal** bei Caelex: security@caelex.eu (zusätzlich privacy@caelex.eu). Caelex führt ein **Register** aller ihm zuzurechnenden Verletzungen und stellt den betreffenden Eintrag der Universität auf Anforderung zur Verfügung. [Querverweis: der prozedurale Ablauf ist im Breach-Runbook der Scholar-Dokumentation beschrieben — vgl. Spec G16; dort liegt der proc→uni-Pfad.]

(EN)

1. Caelex notifies the University of any personal-data breach attributable to Caelex **without undue delay** after becoming aware (Art. 33(2) GDPR), **targeting within 24 hours**, so the University can meet its own 72-hour deadline to the supervisory authority (Art. 33(1) GDPR).
2. The notification contains, as far as known: nature of the breach, categories and approximate numbers of data subjects/records, likely consequences, measures taken/proposed and a contact point.
3. **Notifying the supervisory authority** (Art. 33) and, where applicable, data subjects (Art. 34) is the **University's** responsibility as controller. Caelex assists.
4. **Central channel** at Caelex: security@caelex.eu (and privacy@caelex.eu). Caelex maintains a **register** of attributable breaches and provides the relevant entry on request. [Cross-ref: procedural flow in the Scholar breach runbook — spec G16.]

---

## § 9 Minderjährige betroffene Personen / Minor data subjects (Art. 8)

(DE)

1. Die Parteien sind sich bewusst, dass das Publikum von Caelex Scholar (Studierende/Mitarbeitende der Universität) **minderjährige betroffene Personen** umfassen kann (in Deutschland liegt das digitale Einwilligungsalter nach Art. 8 DSGVO bei 16 Jahren).
2. **Rollenzuordnung:** Soweit eine Rechtsgrundlage für eine Verarbeitung die **Einwilligung** ist und betroffene Personen minderjährig sein können, obliegt die Sicherstellung der Wirksamkeit der Einwilligung (Art. 8) sowie ggf. die Einholung/Verifikation der Zustimmung der Träger der elterlichen Verantwortung der **Universität als Verantwortliche**. Caelex stellt hierfür die technischen Voreinstellungen bereit.
3. **Datensparsamkeit (privacy by default):** Die einwilligungsbasierten Funktionen — **semantische Suche** und **Recherche-Verlauf** — sind im Dienst **standardmäßig deaktiviert** (Opt-in); dies ist im Code verankert (`ScholarUserPreferences.semanticSearch = false`, `searchHistoryEnabled = false`; `src/lib/scholar/preferences.server.ts`). Eine darüberhinausgehende Erhebung von Altersnachweisen/Geburtsdatum erfolgt **nicht** (keine Über-Erhebung; die Authentifizierung ist SSO-vermittelt).
4. Die kindgerechte/leicht verständliche Ausgestaltung der Transparenzinformationen (Art. 12 Abs. 1, Erwägungsgrund 58) erfolgt in der Datenschutzerklärung des Dienstes (separates Lane-Dokument). [TBD: counsel bestätigt die Art.-8-Strategie und die kindgerechte Schicht.]

(EN)

1. The parties recognise that Scholar's audience may include **minor data subjects** (the German digital-consent age under Art. 8 GDPR is 16).
2. **Allocation:** where the lawful basis is **consent** and data subjects may be minors, ensuring valid consent under Art. 8 (and, where needed, obtaining/verifying parental authorisation) is the **University's** responsibility as controller. Caelex provides the technical defaults.
3. **Data minimisation (privacy by default):** the consent-based features — **semantic search** and **search history** — are **off by default** (opt-in), enforced in code (`semanticSearch = false`, `searchHistoryEnabled = false`). No age/DOB over-collection occurs; authentication is SSO-mediated.
4. Child-friendly transparency wording lives in the service privacy notice (separate lane). [TBD: counsel to confirm Art. 8 strategy.]

---

## § 10 Internationale Datentransfers / International transfers (Arts. 44–46)

(DE)

1. Eine Übermittlung personenbezogener Daten in Drittländer erfolgt ausschließlich, wenn eine Rechtsgrundlage nach Kapitel V DSGVO (Art. 44 ff.) vorliegt.
2. Die **Produktivdatenbank** (Neon, eu-central-1 Frankfurt) und die dynamische Auslieferung werden in der EU betrieben. Für unterstützende/verwaltende Zugriffe von Sub-Auftragsverarbeitern mit Sitz in den USA oder anderen Drittstaaten ohne Angemessenheitsbeschluss nutzt Caelex die **EU-Standardvertragsklauseln** nach Durchführungsbeschluss (EU) 2021/914, **Modul 3 (Processor-to-Processor)**, sowie — wo anwendbar — das **EU-US Data Privacy Framework** (Durchführungsbeschluss (EU) 2023/1795).
3. **Ergänzende Schutzmaßnahmen** (Verschlüsselung in Transport und Ruhe, Zugriffsbeschränkung, IP-Maskierung) sind in Anlage 2 dokumentiert. Eine Scholar-spezifische **Transfer-Folgenabschätzung (TIA)** ist gesondert zu erstellen [TBD: counsel — vgl. Spec G21].
4. Die in Anlage 3 beschriebenen Transfers werden von der Universität mit Abschluss dieses AVV genehmigt.

(EN)

1. Transfers to third countries occur only on a Chapter V GDPR legal basis.
2. The **production database** (Neon, eu-central-1 Frankfurt) and dynamic serving run in the EU. For supporting/administrative access by US-based (or other non-adequate) sub-processors, Caelex relies on the **EU SCCs** (Decision (EU) 2021/914, **Module 3, Processor-to-Processor**) and, where applicable, the **EU-US Data Privacy Framework** (Decision (EU) 2023/1795).
3. **Supplementary measures** (encryption in transit/at rest, access restriction, IP masking) are in Annex 2. A Scholar-specific **Transfer Impact Assessment (TIA)** is to be prepared separately [TBD: counsel — spec G21].
4. The transfers in Annex 3 are authorised by the University upon execution.

---

## § 11 Löschung und Rückgabe / Deletion and return on termination (Art. 28(3)(g))

(DE)

1. Nach **Beendigung der Erbringung** der Verarbeitungsleistung **löscht** Caelex nach Wahl der Universität **alle** personenbezogenen Daten oder **gibt sie zurück** und löscht vorhandene Kopien, sofern keine Verpflichtung nach Unionsrecht oder dem Recht der Mitgliedstaaten zur Speicherung besteht (Art. 28 Abs. 3 lit. g DSGVO).
2. Auf Wunsch der Universität stellt Caelex die Daten zuvor in einem **strukturierten, gängigen und maschinenlesbaren Format** innerhalb von 30 Tagen bereit.
3. Die **Löschung auf Produktivsystemen** erfolgt binnen 30 Tagen, auf **Backup-Systemen** spätestens mit Ablauf des regulären Backup-Zyklus (Point-in-Time-Recovery-Fenster). Die Löschung wird protokolliert; eine **Löschbestätigung** wird auf Anforderung erteilt.
4. **Aufbewahrungsfristen / Retention (laufender Betrieb):** Recherche-Verlauf (`ScholarSearchHistory`) wird turnusmäßig nach **90 Tagen** gelöscht (Retention-Sweep; vgl. Spec G11). Weitere Aufbewahrungsfristen ergeben sich aus Anlage 1. [TBD: counsel bestätigt das Löschkonzept gegen den aktuellen Cron-Stand.]

(EN)

1. After **end of the provision** of services, Caelex, at the University's choice, **deletes or returns all** personal data and deletes existing copies, unless storage is required by Union/Member-State law (Art. 28(3)(g) GDPR).
2. On request, Caelex first provides the data in a **structured, commonly used, machine-readable format** within 30 days.
3. **Production** deletion within 30 days; **backups** by the end of the regular backup cycle (PITR window). Deletion is logged; a **deletion confirmation** is provided on request.
4. **Retention (in operation):** search history is swept after **90 days** (spec G11); other periods per Annex 1. [TBD: counsel to confirm the deletion concept against the current cron.]

---

## § 12 Nachweise und Audit-Rechte / Audit rights (Art. 28(3)(h))

(DE)

1. Caelex stellt der Universität alle erforderlichen Informationen zum Nachweis der Einhaltung der Pflichten aus Art. 28 DSGVO zur Verfügung und ermöglicht **Überprüfungen — einschließlich Inspektionen —**, die von der Universität oder einem von ihr beauftragten Prüfer durchgeführt werden (Art. 28 Abs. 3 lit. h DSGVO), und trägt dazu bei.
2. Der Nachweis erfolgt vorrangig durch Vorlage **aktueller TOM-Dokumentation, der Sub-Auftragsverarbeiter-Liste und ggf. Auditberichte Dritter** (z.B. ISO-27001-Zertifikate des Hostings, SOC-2-Berichte).
3. Die Universität ist berechtigt, **einmal pro Kalenderjahr** — bei begründetem Anlass (z.B. dokumentierte Verletzung) auch häufiger — eine Überprüfung durchzuführen, nach Ankündigung mit angemessener Frist (in der Regel 30 Kalendertage). Überprüfungen sollen den Betrieb von Caelex nicht unangemessen beeinträchtigen.
4. Der Prüfer muss zur Berufsverschwiegenheit verpflichtet sein; Wettbewerber von Caelex sind als Prüfer ausgeschlossen. Die Kosten eigener Prüfungen trägt die Universität, außer die Prüfung deckt wesentliche, von Caelex zu vertretende Mängel auf.

(EN)

1. Caelex makes available all information necessary to demonstrate compliance with Art. 28 GDPR and allows for and contributes to **audits, including inspections**, by the University or a mandated auditor (Art. 28(3)(h) GDPR).
2. Evidence is provided primarily via **current TOM documentation, the sub-processor list and third-party audit reports** (ISO 27001 of hosting, SOC 2).
3. The University may audit **once per calendar year** — more often for cause — on reasonable notice (typically 30 days), without unduly disrupting Caelex's operations.
4. The auditor must be bound to professional secrecy; competitors of Caelex are excluded. The University bears the cost of its own audits unless material Caelex-attributable defects are found.

---

## § 13 Haftung und Schlussbestimmungen / Liability and final provisions

(DE)

1. Für die Haftung gilt Art. 82 DSGVO. Im Innenverhältnis haftet vorrangig diejenige Partei, deren Verantwortungsbereich die Ursache zuzurechnen ist; ergänzend gelten die Haftungsregelungen des Hauptvertrags.
2. Änderungen und Ergänzungen dieses AVV bedürfen der **Textform**; dies gilt auch für die Änderung dieser Klausel.
3. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
4. Es gilt das Recht der Bundesrepublik Deutschland. [TBD: Gerichtsstand — bei einer Universität als öffentlicher Stelle ggf. abweichend; counsel bestätigt.]
5. Die **deutsche Fassung ist rechtlich maßgeblich**; die englische Fassung dient ausschließlich der Information.

(EN)

1. Liability follows Art. 82 GDPR; internally, the party in whose sphere the cause lies bears it primarily; the Main Agreement's liability rules supplement.
2. Amendments require **text form** (including this clause).
3. Severability applies.
4. German law governs. [TBD: forum — may differ for a public university; counsel to confirm.]
5. The **German version prevails**; English is informational only.

---

## Unterschriften / Signatures

| Verantwortlicher / Controller (Universität)    | Auftragsverarbeiter / Processor (Caelex)       |
| ---------------------------------------------- | ---------------------------------------------- |
| Ort, Datum / Place, date: ******\_\_\_\_****** | Ort, Datum / Place, date: ******\_\_\_\_****** |
| Name: [TBD]                                    | Name: Julian Polleschner                       |
| Funktion / Title: [TBD]                        | Funktion / Title: Inhaber                      |
| Unterschrift / Signature: ****\_\_\_\_****     | Unterschrift / Signature: ****\_\_\_\_****     |

---

# Anlage 1 — Verarbeitungsbeschreibung / Annex 1 — Description of Processing

_(Art. 28 Abs. 3 DSGVO: Gegenstand, Dauer, Art und Zweck, Art der Daten, Kategorien betroffener Personen)_

### A. Gegenstand und Dauer / Subject-matter and duration

- **Gegenstand / Subject-matter:** Bereitstellung des SSO-gebundenen Rechtsrecherche-Dienstes Caelex Scholar für die Universität.
- **Dauer / Duration:** Laufzeit des Hauptvertrags; fortbestehende Pflichten gem. § 11.

### B. Art und Zweck der Verarbeitung / Nature and purpose

| Verarbeitung / Processing                                 | Zweck / Purpose                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Account-/Authentifizierung (SSO, Credentials)             | Zugangs- und Identitätsverwaltung der berechtigten Nutzer                                                                    |
| Speichern von Nutzer-Voreinstellungen                     | Personalisierung der Recherche-Oberfläche (UI-Sprache, Quellsprache, Standard-Jurisdiktion, Zitierformat, Treffer pro Seite) |
| Volltext-/Stichwortsuche im Rechtskorpus                  | Kernfunktion Recherche                                                                                                       |
| **Semantische Suche (KI-Embeddings)** — _opt-in_          | Verbesserte Trefferrelevanz mittels Vektor-Embeddings                                                                        |
| **Recherche-Verlauf** (`ScholarSearchHistory`) — _opt-in_ | Komfortfunktion „letzte Suchen"; 90-Tage-Retention                                                                           |
| Merklisten / Bookmarks                                    | Speichern einzelner Quellen/Fälle                                                                                            |
| Leselisten (`ScholarReadingList(+Item)`)                  | Kuratierte Listen (z.B. Kurslisten für die Lehre)                                                                            |
| Datenexport + Selbstlöschung                              | Wahrnehmung von Betroffenenrechten (Art. 15, 17, 20)                                                                         |
| Login-/Sicherheits-Logging (maskierte IP)                 | Sicherheit/Missbrauchsabwehr — _teils eigener Verantwortlicher Caelex, siehe RACI_                                           |

### C. Art der personenbezogenen Daten / Categories of personal data

- Kontodaten: Name, E-Mail (über SSO/Credentials bereitgestellt).
- Nutzer-Voreinstellungen: `ScholarUserPreferences` (uiLanguage, sourceLanguage, defaultJurisdiction, citationFormat, semanticSearch, resultsPerPage, searchHistoryEnabled).
- Recherche-Verlauf: `ScholarSearchHistory` (query, jurisdiction, createdAt).
- Gespeicherte Inhalte: `ScholarBookmark`; `ScholarReadingList(+Item)` (Listenname, Beschreibung, Einträge, Notizen).
- Log-/Sicherheitsdaten: `LoginEvent` (maskierte IP, User-Agent, Zeitpunkt).
- **Keine** besonderen Kategorien (Art. 9 DSGVO) vorgesehen.

### D. Kategorien betroffener Personen / Categories of data subjects

- Studierende der Universität (ggf. **minderjährig**).
- Mitarbeitende/Lehrende der Universität.
- [TBD: weitere durch die Universität berechtigte Nutzergruppen.]

### E. Aufbewahrung / Retention

- Konto-/Voreinstellungsdaten: für die Dauer des aktiven Kontos; Löschung bei Kontolöschung (Kaskade über alle Scholar-Tabellen).
- Recherche-Verlauf: **90 Tage** (Sweep), unabhängig von der Kontolöschung.
- Login-/Sicherheits-Logs: [TBD: Aufbewahrungsfrist — counsel/Engineering bestätigen.]

---

# Anlage 2 — Technische und organisatorische Maßnahmen (TOMs) / Annex 2 — Security measures (Art. 32)

_(Aus den FACTS und der Plattform-TOM-Dokumentation; Scholar-scoped.)_

### A. Vertraulichkeit / Confidentiality

- **Zugangskontrolle:** Passwörter mit **bcrypt (12 Runden)**; **MFA (TOTP) und WebAuthn/FIDO2**; automatische Account-Sperre nach fehlgeschlagenen Login-Versuchen (Brute-Force-Schutz).
- **Zugriffskontrolle:** RBAC, Prinzip der minimalen Berechtigung, Need-to-know.
- **Verschlüsselung:** **AES-256-GCM** Feld-Verschlüsselung sensibler Felder (scrypt-Schlüsselableitung); Transport ausnahmslos **TLS 1.2+**.
- **IP-Maskierung:** Login-/Sicherheits-Events speichern **maskierte IP** (kein Klartext).

### B. Integrität / Integrity

- **Manipulationssicherer Audit-Trail:** SHA-256-**Hash-Chain** je Eintrag (tamper-evident).
- Authentifizierte Service-zu-Service-Kommunikation.

### C. Verfügbarkeit und Belastbarkeit / Availability & resilience

- Automatische tägliche **Backups**, Point-in-Time-Recovery; regionsübergreifende DB-Verfügbarkeit; regelmäßige Wiederherstellungstests.

### D. Regelmäßige Überprüfung / Regular review

- **Rate-Limiting** (Upstash) gegen Missbrauch; Anomalieerkennung; Honey-Token; Security-Audit-Logs.
- CSP/HSTS-Header; serverseitige Geheimnisverwaltung (keine hartkodierten Secrets).
- Abhängigkeits-/Schwachstellenprüfungen (CodeQL, Secret-Scanning, Dependency-Checks).

### E. Datenschutzfreundliche Voreinstellungen / Privacy by default

- **semantische Suche** und **Recherche-Verlauf standardmäßig deaktiviert** (opt-in).
- Datensparsamkeit; keine Erhebung von Geburtsdatum/Altersnachweis.

> [TBD: counsel/Engineering halten die Scholar-spezifische TOM-Liste aktuell.]

---

# Anlage 3 — Sub-Auftragsverarbeiter / Annex 3 — Sub-processors

_(Aus `src/app/legal/sub-processors/_content/sub-processors-data.ts` — nur die für **Scholar** relevanten Dienste; vollständige, aktuelle Liste: `caelex.eu/scholar/legal/sub-processors`.)_

| Dienst / Service                       | Entität / Entity    | Funktion / Function                                           | Datenort / Location                  | Transfermechanismus / Transfer mechanism                               |
| -------------------------------------- | ------------------- | ------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Vercel Inc.                            | USA (Walnut, CA)    | Hosting / Edge / Serverless                                   | USA + EU-Edge (fra1, cdg1 bevorzugt) | SCC Modul 3 · EU-US DPF                                                |
| Neon Inc.                              | USA (San Francisco) | Managed Postgres (Produktivdatenbank)                         | **EU eu-central-1 (Frankfurt)**      | EU-Verarbeitung; SCC Modul 3 für US-Verwaltungszugriff                 |
| Upstash Inc.                           | USA (San Francisco) | Rate-Limiting / Caching                                       | EU eu-west-1 (Dublin)                | EU-Verarbeitung; EU-US DPF; SCC Modul 3                                |
| OpenAI L.L.C. (über Vercel AI Gateway) | USA                 | **KI-Embeddings für semantische Suche**                       | USA                                  | EU-US DPF · SCC · Zero-Data-Retention (Sub-Sub-Processor unter Vercel) |
| Resend Inc.                            | USA (San Francisco) | Transaktionale E-Mail                                         | USA + EU-Edge                        | SCC Modul 3 (optional EU-Datenhaltung)                                 |
| Functional Software Inc. (Sentry)      | USA                 | Fehler-/Performance-Monitoring                                | EU (Frankfurt), Fallback USA         | EU primär; SCC Modul 3 für US-Fallback; PII-Scrubbing                  |
| LogSnag                                | Kanada              | Geschäftsereignis-Monitoring (server-only)                    | Kanada                               | Angemessenheitsbeschluss Kanada (Decision 2002/2/EG) + SCC             |
| Vercel Web Analytics / Speed Insights  | USA                 | Cookielose Analytics / Web Vitals (**nur nach Einwilligung**) | USA + EU-Edge                        | SCC Modul 3 · EU-US DPF                                                |

> **[TBD — Google OAuth: KLÄRUNGSBEDARF.]** Die FACTS dieses Lanes nennen **Google (OAuth SSO)** als Sub-Prozessor. Der aktuelle Plattform-Sub-Prozessor-Register-Code (`sub-processors-data.ts`) listet **Google jedoch NICHT**. Vor Unterzeichnung ist zu klären, ob Scholar Google-OAuth tatsächlich nutzt; falls ja, ist **Google Ireland Ltd.** (bzw. die zutreffende Entität) mit Zweck (SSO-Authentifizierung), Datenort und Transfermechanismus in das Register **und** in diese Anlage aufzunehmen. [counsel + Engineering bestätigen die Live-Liste — vgl. Spec G21 „entity naming inconsistent" / „confirm DPAs signed".]

> Cloudflare R2 (Objektspeicher) ist im Plattform-Register gelistet, dürfte für Scholar aber **nicht** einschlägig sein (kein Datei-Upload im Scholar-Funktionsumfang). [TBD: bestätigen.]

---

# Anlage 4 — Rollen-Zuordnung / Annex 4 — Role allocation

Die vollständige Controller/Processor-Zuordnung pro Verarbeitungstätigkeit ist im separaten internen Dokument **`raci-role-allocation.md`** beschrieben und wird hiermit als Anlage 4 einbezogen.

The full controller/processor allocation per processing activity is in **`raci-role-allocation.md`** (incorporated as Annex 4).

---

_Ende des Entwurfs / End of draft. Alle mit [TBD] markierten Punkte sind vor Unterzeichnung mit qualifizierter Rechtsberatung zu klären. / All [TBD] items must be resolved with qualified legal counsel before execution._
