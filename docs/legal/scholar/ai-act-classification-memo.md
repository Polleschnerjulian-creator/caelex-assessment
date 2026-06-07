> ┌─────────────────────────────────────────────────────────────────────────┐
> │ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung │
> │ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine │
> │ Rechtsberatung. / Template; must be reviewed and adapted by qualified │
> │ legal counsel before publication or execution. Not legal advice. │
> └─────────────────────────────────────────────────────────────────────────┘

# KI-Klassifizierungs-Memo (EU AI Act) — Caelex Scholar

# AI Act Classification Memo — Caelex Scholar

**Rechtsgrundlage / Legal basis:** Verordnung (EU) 2024/1689 (KI-Verordnung / AI Act)
**Gegenstand / Subject:** Risikoklassifizierung des KI-Systems „semantische Suche" in Caelex Scholar; Pflichten nach Art. 50 (Transparenz) und Art. 4 (KI-Kompetenz); Geltungstermine.
**Stand / Last updated:** 7 June 2026
**Version:** 0.1 (Entwurf / Draft)
**Verbindliche Sprache / Binding language:** Deutsch; Englisch ist eine Arbeitsübersetzung.

> **Zweck.** Dieses Memo dokumentiert, **warum Caelex Scholar als KI-System mit begrenztem/minimalem Risiko** einzustufen ist (kein Hochrisiko-System nach Anhang III), und welche Pflichten daraus folgen. Es ist die Grundlage für die spätere Konformitäts-/Transparenz-Dokumentation und für die [TBD]-Bestätigung durch Rechtsberatung (Spec AI3).

---

## DE — Verbindliche Fassung

### 1. Systembeschreibung

**1.1 Funktion.** Caelex Scholar bietet eine **semantische Suche** über einen kuratierten Weltraumrechts-Korpus (Verträge, EU-Recht, nationale Gesetze, Rechtsprechung). Bei aktivierter Funktion wird der **Anfragetext der Nutzerin/des Nutzers** in eine Vektor-Repräsentation überführt (Embedding) und gegen vorab berechnete Embeddings der Korpus-Dokumente abgeglichen; die Treffer werden nach semantischer Ähnlichkeit **gerankt** und als Liste **offizieller Rechtsquellen** zurückgegeben.

**1.2 Technische Eckdaten (verifiziert).**

- Embedding-Modell: **OpenAI `text-embedding-3-small` @ 512 Dimensionen**, geroutet über das **Vercel AI Gateway** (OpenAI wirkt als Sub-Sub-Prozessor unter Vercel; kein eigener Caelex-Vertrag mit OpenAI).
- **Zero-Data-Retention** für API-Aufrufe: keine Klartext-Speicherung der Anfragen über die Aufrufdauer hinaus; **keine Nutzung zum Modelltraining**.
- Die Funktion ist **standardmäßig deaktiviert** (`semanticSearch` default `false` — verifiziert in `preferences.server.ts` und `prisma/schema.prisma`); Aktivierung nur per Opt-in in den Einstellungen.
- **Kein generativer Output:** Das System **erzeugt keine** Texte/Zusammenfassungen, sondern **ruft ab und ordnet** vorhandene Quellen. (Relevant für Art. 50 Abs. 2 — s. u.)

**1.3 Rolle von Caelex im Sinne des AI Act.** Caelex setzt ein KI-System (Embedding-Modell eines Dritten) im eigenen Dienst ein. Caelex ist damit **Betreiber („deployer")** des KI-Systems in Scholar; bezüglich der bereitgestellten Suchfunktion gegenüber Endnutzern trägt Caelex zudem die **Art.-50-Transparenzpflicht** als Anbieter der nutzerseitigen Interaktion. [TBD: finale Einordnung Anbieter/Betreiber mit Anwalt — die Transparenzpflicht des Art. 50 Abs. 1 trifft „Anbieter", die Systeme für die Interaktion mit natürlichen Personen bereitstellen; praktisch ist die Pflicht in Scholar erfüllt, s. Abschnitt 4.]

---

### 2. Anwendbarkeit der KI-Verordnung

**2.1 KI-System (Art. 3 Nr. 1).** Die semantische Suche nutzt ein maschinell lernendes Embedding-Modell, das aus Eingaben Ausgaben (Ähnlichkeits-Rankings) ableitet → es handelt sich um ein **KI-System** i.S.d. Art. 3 Nr. 1. Die Verordnung ist anwendbar.

**2.2 Keine verbotene Praktik (Art. 5).** Keine der nach Art. 5 verbotenen Praktiken liegt vor (kein Social Scoring, keine unterschwellige Manipulation, keine biometrische Kategorisierung, keine Emotionserkennung, kein Echtzeit-Fernidentifizierungssystem). **Nicht einschlägig.**

---

### 3. Risikoklassifizierung: kein Hochrisiko (Anhang III) — begrenztes/minimales Risiko

**3.1 Prüfung von Anhang III Nr. 8 lit. a (Justiz).** Anhang III Nr. 8 lit. a erfasst KI-Systeme, die „bestimmungsgemäß von einer **Justizbehörde** oder in deren Namen verwendet werden sollen, um eine Justizbehörde bei der **Ermittlung und Auslegung von Sachverhalten und Rechtsvorschriften und bei der Anwendung des Rechts auf konkrete Sachverhalte** zu unterstützen, oder die in ähnlicher Weise für die **alternative Streitbeilegung** verwendet werden sollen".

Subsumtion — **nicht erfüllt**, aus mehreren unabhängigen Gründen:

1. **Adressatenkreis.** Scholar ist eine **Hochschul-Rechercheplattform für Studierende und Personal**, nicht ein Werkzeug einer Justizbehörde oder in deren Namen. Die bestimmungsgemäße Verwendung (Art. 3 Nr. 12) ist akademische Recherche/Lehre, nicht die justizielle Rechtsanwendung.
2. **Funktion.** Die semantische Suche **ruft Quellen ab und ranked sie** — sie unterstützt **nicht** die „Anwendung des Rechts auf konkrete Sachverhalte" und trifft keine fall- oder streitbezogene Bewertung. Sie ist ein **Informations-Retrieval-Werkzeug**, vergleichbar einem juristischen Bibliothekskatalog mit Relevanz-Ranking.
3. **Kein ADR-Bezug.** Keine Verwendung in der alternativen Streitbeilegung.

**3.2 Erwägungsgrund 61.** Erwägungsgrund 61 stellt klar, dass die Einstufung als hochriskant **nicht** für KI-Systeme gelten soll, die für **rein begleitende Verwaltungstätigkeiten** bestimmt sind, die die tatsächliche Rechtspflege in Einzelfällen nicht beeinflussen, wie etwa „**die Anonymisierung oder Pseudonymisierung … oder die Kommunikation zwischen Mitarbeitern**" sowie — sinngemäß — die bloße **Recherche und Auffindung von Rechtsinformationen**. Die Scholar-Suche fällt klar in diese begleitende, nicht-entscheidende Kategorie.

**3.3 Art. 6 Abs. 3 — Ausnahme für vorbereitende Aufgaben.** Selbst wenn ein Anhang-III-Anwendungsfall in Betracht käme, greift die Ausnahme des Art. 6 Abs. 3: Ein System gilt **nicht** als hochriskant, wenn es **kein erhebliches Risiko** für Gesundheit, Sicherheit oder Grundrechte birgt, insbesondere weil es

- (lit. a) eine **eng umrissene Verfahrensaufgabe** erfüllt → hier: Ähnlichkeits-Ranking von Suchtreffern;
- (lit. d) eine **vorbereitende Aufgabe** für eine Bewertung erfüllt, die für die in Anhang III genannten Zwecke relevant ist → hier: das Auffinden/Vorsortieren von Rechtsquellen ist **vorbereitend**; jede rechtliche Bewertung trifft die **menschliche Nutzerin/der Nutzer**.

Das System **ersetzt oder beeinflusst keine menschliche Bewertung ohne angemessene Prüfung** und trifft keine Entscheidung mit Rechtswirkung → die Voraussetzungen des Art. 6 Abs. 3 sind erfüllt. (Dokumentationspflicht nach Art. 6 Abs. 4: Diese Bewertung ist zu registrieren — dieses Memo dient als Grundlage.) [TBD: Anwalt bestätigt Art.-6-Abs.-3-Einordnung und Registrierung.]

**3.4 Keine automatisierte Entscheidung mit Rechtsfolge.** Es liegt **keine** Verarbeitung i.S.d. Art. 22 DSGVO vor: Die Suche trifft keine Entscheidung, die rechtliche Wirkung entfaltet oder die Person erheblich beeinträchtigt. Human-in-the-loop ist strukturell gewährleistet (die Person bewertet und nutzt die Quellen selbst).

**3.5 Ergebnis.** Caelex Scholar ist ein **KI-System mit begrenztem Risiko** (Transparenzpflichten nach Art. 50) bzw. — soweit man die Suche als reines Hilfsmittel ohne Personeninteraktions-Bezug betrachtet — **minimalem Risiko**. **Es ist kein Hochrisiko-KI-System nach Anhang III.** [TBD: finale Bestätigung Spec AI3.]

---

### 4. Transparenzpflicht nach Art. 50

**4.1 Art. 50 Abs. 1 (Interaktion mit KI).** Anbieter müssen sicherstellen, dass natürliche Personen **darüber informiert werden, dass sie mit einem KI-System interagieren**, sofern dies nicht aus den Umständen offensichtlich ist; die Information muss **spätestens zum Zeitpunkt der ersten Interaktion**, klar und unterscheidbar, erfolgen (barrierefrei, vgl. Art. 50 Abs. 5).

**Status: ERFÜLLT (verifiziert).** Scholar zeigt einen **persistierten, barrierefreien KI-Hinweis** unmittelbar am Suchfeld **und** an der Ergebnisliste (`AiDisclosure.tsx`): Hinweis, dass die Ergebnisse per KI-gestützter semantischer Suche **gerankt** werden, mit der Aufforderung, gegen die offizielle Quelle zu prüfen, und dem Zusatz „keine Rechtsberatung". Technisch: `role="note"` + `aria-label` (persistente, beschriftete Landmark), monochromer Kontrast ≥ 5,7:1 (WCAG 1.4.3). Damit ist die Art.-50-Abs.-1-Pflicht (und die Barrierefreiheit nach Abs. 5) **vor** dem gesetzlichen Stichtag (2. Aug. 2026) erfüllt.

**4.2 Art. 50 Abs. 2 (Kennzeichnung KI-generierter Inhalte).** **Derzeit nicht einschlägig:** Scholar **erzeugt keine** synthetischen Audio-/Bild-/Video-/Textinhalte, sondern **ruft** vorhandene Rechtsquellen **ab**. Sollte künftig eine **generative** Funktion (z. B. KI-Zusammenfassungen) ergänzt werden, ist Abs. 2 (maschinenlesbare Markierung als „künstlich erzeugt/manipuliert") zu beachten. **Watch-Item.**

**4.3 Verstärkende Maßnahmen (Best Practice).** Zusätzlich zur UI-Disclosure sollte ein **einzeiliger KI-Hinweis in den Nutzungsbedingungen/FAQ und im Onboarding** ergänzt werden, damit die Information nicht allein von der UI abhängt (Spec AI2/AI5). [TBD: AI2-Textbaustein.]

---

### 5. KI-Kompetenz nach Art. 4

Art. 4 (**seit 2. Februar 2025 in Kraft**) verpflichtet Anbieter und Betreiber, Maßnahmen zu treffen, damit ihr Personal und Personen, die in ihrem Auftrag KI-Systeme betreiben/nutzen, über ein **ausreichendes Maß an KI-Kompetenz** verfügen — unter Berücksichtigung von Vorkenntnissen, Kontext und betroffenen Personen.

**Status: offen — umzusetzen.** Für Caelex (Einzelunternehmen) bedeutet dies eine **kurze interne KI-Kompetenz-Notiz** mit Bestätigung, die mindestens abdeckt: Grundbegriffe des AI Act, das Scholar-spezifische System (semantische Suche/Embeddings), seine Grenzen (Retrieval ≠ Rechtsberatung; Halluzinations-/Ranking-Bias-Risiken), die Transparenz- und Zero-Data-Retention-Maßnahmen sowie die Eskalation bei Vorfällen. Empfehlung: dokumentierte Kenntnisnahme durch alle am Betrieb/Aufbau von Scholar beteiligten Personen. [TBD: Erstellung der Kompetenz-Notiz, Spec AI4.]

---

### 6. Geltungstermine (gestaffeltes Inkrafttreten)

| Bestimmung                                    | Geltung ab       | Relevanz für Scholar                                                            |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| Inkrafttreten der Verordnung                  | 1. Aug. 2024     | —                                                                               |
| **Art. 4 KI-Kompetenz** + Verbote (Art. 5)    | **2. Feb. 2025** | Art. 4 **jetzt umzusetzen** (Abschnitt 5); Art. 5 nicht einschlägig             |
| Pflichten für GPAI-Modelle, Governance        | 2. Aug. 2025     | Caelex ist **kein** GPAI-Anbieter (nutzt nur Embedding-API) — nicht einschlägig |
| **Art. 50 Transparenzpflichten**              | **2. Aug. 2026** | bereits erfüllt (Abschnitt 4.1); Abs. 2 als Watch-Item                          |
| Hochrisiko-Pflichten (Anhang III)             | 2. Aug. 2026     | **nicht einschlägig** (kein Hochrisiko, Abschnitt 3)                            |
| Verbleibende Hochrisiko-Regelungen (Anhang I) | 2. Aug. 2027     | nicht einschlägig                                                               |

> Hinweis: Für Art. 50 Abs. 2 (generierte Inhalte) sieht die Praxis Übergangsfristen/Code-of-Practice vor; nur relevant, falls Scholar generative Ausgaben einführt. [TBD: Datum/Modalität bestätigen, falls generative Funktion geplant.]

---

### 7. Fazit

1. Caelex Scholar ist ein **KI-System mit begrenztem/minimalem Risiko**; **kein** Hochrisiko-System nach Anhang III (insb. Nr. 8 lit. a **nicht** erfüllt; hilfsweise greift die **Art.-6-Abs.-3-Ausnahme** für die eng umrissene, **vorbereitende** Retrieval-Aufgabe).
2. **Art. 50 Abs. 1** (KI-Interaktions-Transparenz) ist **bereits erfüllt** (persistente, barrierefreie UI-Disclosure am Suchfeld + Ergebnisliste). **Art. 50 Abs. 2** ist derzeit **nicht einschlägig** (kein generativer Output) — Watch-Item.
3. **Art. 4** (KI-Kompetenz) ist **in Kraft** und durch eine kurze interne Kompetenz-Notiz umzusetzen.
4. Diese Einstufung ist nach **Art. 6 Abs. 4** zu registrieren und vor Veröffentlichung durch qualifizierte Rechtsberatung zu bestätigen. **[TBD: Spec AI3-Sign-off.]**

---

## EN — Convenience translation (non-binding)

### 1. System description

Caelex Scholar provides **semantic search** over a curated space-law corpus (treaties, EU law, national laws, case law). When enabled, the **user's query text** is turned into a vector (embedding) and compared against pre-computed corpus embeddings; matches are **ranked** by similarity and returned as a list of **official legal sources**. Technical facts (verified): embedding model **OpenAI `text-embedding-3-small` @ 512 dims**, routed via the **Vercel AI Gateway** (OpenAI = sub-sub-processor under Vercel); **zero-data-retention** for API calls (no plaintext retention beyond the call; **no model-training use**); the feature is **off by default** (`semanticSearch` default `false` — verified); **no generative output** — it **retrieves and ranks**, it does not generate. Caelex is the **deployer** of the (third-party) AI system in Scholar and bears the **Art. 50** user-transparency obligation for the search interaction. [TBD: final provider/deployer characterisation with counsel.]

### 2. Applicability

The semantic search uses a machine-learned embedding model deriving outputs (similarity rankings) from inputs → it is an **AI system** (Art. 3(1)); the Regulation applies. **No prohibited practice** under Art. 5 is present (no social scoring, subliminal manipulation, biometric categorisation, emotion recognition, or real-time remote identification) — **not applicable**.

### 3. Risk classification: not high-risk (Annex III) — limited/minimal risk

**3.1 Annex III(8)(a) (justice).** This covers AI intended to be used **by, or on behalf of, a judicial authority** to assist in **researching and interpreting facts and the law and applying the law to concrete facts**, or for **alternative dispute resolution**. **Not met**, for independent reasons: (1) **Audience** — Scholar is a **university research platform for students and staff**, not a tool of/for a judicial authority; intended purpose is academic research/teaching. (2) **Function** — it **retrieves and ranks** sources; it does **not** assist "applying the law to concrete facts" and makes no case/dispute determination — it is an **information-retrieval tool**, akin to a legal library catalogue with relevance ranking. (3) **No ADR** use.
**3.2 Recital 61** confirms that high-risk classification should **not** apply to AI intended for **purely ancillary administrative activities** that do not affect the actual administration of justice in individual cases — the Scholar search clearly falls into this ancillary, non-deciding category.
**3.3 Art. 6(3) preparatory-task derogation.** Even if an Annex III use-case were arguable, Art. 6(3) applies: a system is **not** high-risk where it poses **no significant risk** to health, safety or fundamental rights, in particular because it (a) performs a **narrow procedural task** — here, similarity ranking of search hits; and (d) performs a **preparatory task** to an assessment relevant to an Annex III purpose — here, finding/pre-sorting legal sources is **preparatory**; any legal assessment is made by the **human user**. The system does **not replace or influence human assessment without proper review** and makes no legally-effective decision → Art. 6(3) is satisfied (Art. 6(4) requires registering this assessment — this memo is the basis). [TBD: counsel confirms Art. 6(3) classification + registration.]
**3.4 No automated decision with legal effect** within the meaning of GDPR Art. 22; human-in-the-loop is structural.
**3.5 Result.** Caelex Scholar is a **limited-risk** AI system (Art. 50 transparency) or, viewing the search as a pure aid, **minimal-risk**. **It is not a high-risk AI system under Annex III.** [TBD: final AI3 confirmation.]

### 4. Transparency obligation under Art. 50

**4.1 Art. 50(1).** Providers must ensure natural persons are **informed they are interacting with an AI system**, unless obvious from the circumstances, **at the latest at first interaction**, clearly and distinguishably, and accessibly (Art. 50(5)). **Status: MET (verified).** Scholar shows a **persistent, accessible AI notice** at the search input **and** on the results list (`AiDisclosure.tsx`): results are **AI-ranked**, verify against the official source, "not legal advice". Technically `role="note"` + `aria-label` (persistent labelled landmark), monochrome contrast ≥ 5.7:1 (WCAG 1.4.3). Art. 50(1) (and accessibility under 50(5)) is met **ahead of** the 2 Aug 2026 date.
**4.2 Art. 50(2) (marking AI-generated content).** **Not currently applicable:** Scholar **does not generate** synthetic audio/image/video/text — it **retrieves** existing legal sources. If a **generative** feature (e.g. AI summaries) is added, Art. 50(2) (machine-readable "artificially generated/manipulated" marking) applies. **Watch-item.**
**4.3 Reinforcing measures (best practice).** Add a **one-line AI notice to the Terms/FAQ and onboarding** so the information does not depend on the UI alone (AI2/AI5). [TBD: AI2 copy.]

### 5. AI literacy under Art. 4

Art. 4 (**in force since 2 Feb 2025**) requires providers and deployers to ensure staff and those operating AI on their behalf have a **sufficient level of AI literacy**. **Status: open — to implement.** For Caelex (sole proprietorship), this means a **short internal AI-literacy note + acknowledgement** covering at least: AI Act basics, the Scholar-specific system (semantic search/embeddings), its limits (retrieval ≠ legal advice; hallucination/ranking-bias risks), the transparency and zero-data-retention measures, and incident escalation. Recommend documented acknowledgement by everyone building/operating Scholar. [TBD: produce the note, AI4.]

### 6. Application dates

Entry into force 1 Aug 2024. **Art. 4 AI literacy + Art. 5 prohibitions: 2 Feb 2025** — Art. 4 **to implement now**; Art. 5 not applicable. GPAI/governance: 2 Aug 2025 — Caelex is **not** a GPAI provider (uses only an embedding API) — not applicable. **Art. 50 transparency: 2 Aug 2026** — already met (4.1); 50(2) a watch-item. High-risk obligations (Annex III): 2 Aug 2026 — **not applicable** (not high-risk). Remaining Annex-I high-risk rules: 2 Aug 2027 — not applicable. [TBD: confirm any code-of-practice/transition timing if a generative feature is planned.]

### 7. Conclusion

1. Caelex Scholar is a **limited/minimal-risk** AI system; **not** high-risk under Annex III (esp. (8)(a) **not** met; subsidiarily the **Art. 6(3)** derogation applies to the narrow, **preparatory** retrieval task). 2. **Art. 50(1)** transparency is **already met** (persistent, accessible UI disclosure at search input + results); **Art. 50(2)** is **not currently applicable** (no generative output) — watch-item. 3. **Art. 4** AI literacy is **in force** and to be implemented via a short internal note. 4. Register this classification under **Art. 6(4)** and confirm with qualified counsel before publication. **[TBD: AI3 sign-off.]**
