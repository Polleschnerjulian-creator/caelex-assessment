> ┌─────────────────────────────────────────────────────────────────────────┐
> │ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung │
> │ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine │
> │ Rechtsberatung. / Template; must be reviewed and adapted by qualified │
> │ legal counsel before publication or execution. Not legal advice. │
> └─────────────────────────────────────────────────────────────────────────┘

# Datenschutz-Folgenabschätzung (DSFA) — Caelex Scholar

# Data Protection Impact Assessment (DPIA) — Caelex Scholar

**Rechtsgrundlage / Legal basis:** Art. 35 DSGVO / GDPR · WP248 rev.01 (Art.-29-Gruppe) · DSK „Muss-Liste" (Liste der Verarbeitungstätigkeiten, für die eine DSFA durchzuführen ist)
**Stand / Last updated:** {{DATE}}
**Version:** 0.1 (Entwurf / Draft)
**Dokumenten-Owner / Owner:** Verantwortlicher (Caelex — Inhaber Julian Polleschner) · Entwurf erstellt zur Vorlage an Rechtsberatung / DSB
**Verbindliche Sprache / Binding language:** Deutsch. Englisch ist eine Arbeitsübersetzung. / German is binding; English is a convenience translation.

> **Hinweis zur Methodik / Methodology note.** Diese DSFA folgt der dreistufigen Logik des Art. 35 DSGVO: (1) systematische Beschreibung der Verarbeitung, (2) Bewertung von Notwendigkeit und Verhältnismäßigkeit, (3) Bewertung der Risiken für die Rechte und Freiheiten der betroffenen Personen sowie der Abhilfemaßnahmen. Abschnitt 8 zieht das Fazit, ob eine **vorherige Konsultation der Aufsichtsbehörde nach Art. 36 DSGVO** erforderlich ist.

---

## DE — Verbindliche Fassung

### 1. Anlass, Schwellenwertprüfung und Notwendigkeit der DSFA

#### 1.1 Anlass

Caelex Scholar (`caelex.eu/scholar`) ist eine **kostenlose, hochschullizenzierte (B2B2C), SSO-gesteuerte juristische Rechercheplattform** für das Weltraumrecht, „powered by Atlas". Die Plattform verarbeitet personenbezogene Daten von Hochschulangehörigen (Studierende und Personal). Diese DSFA wird **vor dem Produktivstart** durchgeführt.

#### 1.2 Schwellenwertprüfung (Art. 35 Abs. 1, 3 DSGVO; WP248; DSK-Muss-Liste)

Eine DSFA ist verpflichtend, wenn die Verarbeitung „voraussichtlich ein hohes Risiko" zur Folge hat. Nach den **neun Kriterien des WP248** liegen hier mindestens drei vor — die WP248-Schwelle (≥ 2) ist überschritten:

| WP248-Kriterium                                                  | Erfüllt?              | Begründung                                                                                                   |
| ---------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1. Bewertung/Scoring                                             | teilweise             | Semantische Suche **rankt** Ergebnisse mittels KI-Embeddings — Ranking, **kein** Profiling mit Rechtsfolge.  |
| 2. Automatisierte Entscheidung mit Rechtswirkung                 | **nein**              | Reines Retrieval; keine Art.-22-Entscheidung.                                                                |
| 3. Systematische Überwachung                                     | teilweise             | Optionale (opt-in) Suchhistorie kann Rechercheverhalten abbilden.                                            |
| 4. Besondere Datenkategorien / höchst persönliche Daten          | teilweise             | Suchanfragen können sensible Themen verraten (Recherche-Inhalt als „höchst persönliche" Daten i.S.v. WP248). |
| 5. Datenverarbeitung in großem Umfang                            | abhängig vom Roll-out | Mehrere Hochschulen → potenziell große Nutzerzahl.                                                           |
| 6. Abgleich/Zusammenführung von Datensätzen                      | nein                  | Keine Zusammenführung über Zwecke hinweg.                                                                    |
| 7. **Daten schutzbedürftiger Personen (Minderjährige)**          | **ja**                | Hochschulkohorte kann **Minderjährige** enthalten (z. B. Erstsemester < 16).                                 |
| 8. **Innovative Nutzung / neue technologische Lösungen (KI)**    | **ja**                | KI-gestützte semantische Suche über Vektor-Embeddings.                                                       |
| 9. Betroffene werden an Ausübung eines Rechts/Vertrags gehindert | nein                  | —                                                                                                            |

**Ergebnis:** Drei Kriterien deutlich erfüllt (Minderjährige + KI + verhaltensbezogene Suchhistorie). Zusätzlich nennt die **DSK-Muss-Liste** u. a. den „Einsatz von Künstlicher Intelligenz zur Verarbeitung personenbezogener Daten" sowie Verarbeitungen, die Verhaltensmuster betreffen. **Die DSFA ist verpflichtend.** [TBD: finale DSB-/Anwalts-Bestätigung der Schwellenwert-Einordnung.]

#### 1.3 Beteiligung des Datenschutzbeauftragten (Art. 35 Abs. 2 DSGVO)

Der Rat des/der DSB ist einzuholen, sofern benannt. Hinweis: Wird diese DSFA verpflichtend (Minderjährige + KI), kann nach **§ 38 i. V. m. § 38 Abs. 1 S. 2 BDSG** die **Benennung eines DSB verpflichtend** werden, weil eine DSFA erforderlich ist. [TBD: DSB-Benennung und Behörden-Meldung mit Anwalt klären — siehe separates Memo G15.]

---

### 2. Systematische Beschreibung der Verarbeitung (Art. 35 Abs. 7 lit. a)

#### 2.1 Verantwortlichkeitsstruktur (Dual-Role, B2B2C)

- **Lizenzierende Hochschule = Verantwortlicher (Controller)** für die vertraglich beauftragte Rechercheleistung gegenüber ihren Angehörigen.
- **Caelex = Auftragsverarbeiter (Processor)** für die im AVV (Art. 28 DSGVO) beauftragte Diensterbringung — **und zugleich eigener Verantwortlicher** für produkt-, sicherheits- und KI-bezogene Eigenentscheidungen (z. B. Sicherheits-Logging, Fehler-Monitoring, Korpus-/Embedding-Strategie). Diese Doppelrolle ist im AVV und in der Datenschutzerklärung pro Tätigkeit zu attribuieren. [TBD: finale Rollen-RACI in separatem Memo G1; AVV in Memo G2.]

#### 2.2 Zwecke der Verarbeitung

1. Bereitstellung und Authentifizierung des SSO-gesteuerten Zugangs.
2. Durchführung der juristischen Recherche (Volltext- und optional KI-semantische Suche im Weltraumrechts-Korpus).
3. Speicherung personalisierter Recherchehilfen (Merkliste/Bookmarks, Leselisten, Präferenzen).
4. Optionale (opt-in) Suchhistorie für „zuletzt gesucht"/Komfort.
5. IT-Sicherheit und Missbrauchsabwehr (Login-Ereignisse, Rate-Limiting, Audit-Trail).

#### 2.3 Kategorien personenbezogener Daten und betroffener Personen

**Betroffene:** Hochschulstudierende und -personal in der EU (potenziell auch Minderjährige).

| Datenkategorie                              | Felder (verifiziert im Code)                                                                                                        | Quelle                             | Verarbeitungsgrundlage (Vorschlag)                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Kontodaten                                  | Name, E-Mail (über SSO/Anmeldedaten)                                                                                                | SSO-IdP der Hochschule / Anmeldung | Art. 6 Abs. 1 lit. b / öffentl. Aufgabe der Hochschule (lit. e) — [TBD] |
| Präferenzen (`ScholarUserPreferences`)      | `uiLanguage`, `sourceLanguage`, `defaultJurisdiction`, `citationFormat`, `semanticSearch`, `resultsPerPage`, `searchHistoryEnabled` | Nutzereingabe                      | Art. 6 Abs. 1 lit. b (Vertrag/Dienst)                                   |
| Suchhistorie (`ScholarSearchHistory`)       | `query`, `jurisdiction`, `createdAt`                                                                                                | Nutzeraktion (nur wenn aktiviert)  | **Art. 6 Abs. 1 lit. a (Einwilligung, opt-in)**                         |
| Merkliste (`ScholarBookmark`)               | `itemType`, `itemId`, `createdAt`                                                                                                   | Nutzeraktion                       | Art. 6 Abs. 1 lit. b                                                    |
| Leselisten (`ScholarReadingList`/`…Item`)   | `name`, `description`, `note`, `position`                                                                                           | Nutzeraktion                       | Art. 6 Abs. 1 lit. b                                                    |
| Login-/Sicherheitsereignisse (`LoginEvent`) | maskierte IP, User-Agent, Zeitstempel                                                                                               | Authentifizierung                  | Art. 6 Abs. 1 lit. f (Sicherheit) — LIA erforderlich [TBD]              |

Hinweis: **Besondere Kategorien (Art. 9)** werden nicht gezielt erhoben. Suchanfragen **können** indes sensible Themen offenbaren (z. B. politische, religiöse oder gesundheitsbezogene Recherchen). Mitigation: Suchhistorie ist **standardmäßig AUS** und nach 90 Tagen automatisch gelöscht (s. u.).

#### 2.4 Empfänger / Auftragsverarbeiter (verifizierter Live-Stand)

Verarbeitung erfolgt durch geprüfte Sub-Auftragsverarbeiter (vollständige Liste: `/legal/sub-processors`):

| Dienst                           | Funktion                                                                                                                                | Ort                                     | Transfermechanismus                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| **Vercel Inc.**                  | Hosting/CDN/Serverless                                                                                                                  | USA, vorrangig EU-Regionen (fra1, cdg1) | SCC Modul 3 · EU-US DPF                                               |
| **Neon Inc.**                    | Produktivdatenbank (PostgreSQL)                                                                                                         | **EU eu-central-1 (Frankfurt)**         | EU-Verarbeitung; SCC für US-Verwaltungszugriff                        |
| **OpenAI L.L.C.**                | KI-Embeddings (`text-embedding-3-small`, 512 Dim.) für semantische Suche — geroutet über Vercel AI Gateway (OpenAI = Sub-Sub-Prozessor) | USA                                     | EU-US DPF · SCC · Zero-Data-Retention (API)                           |
| **Resend Inc.**                  | Transaktions-E-Mail                                                                                                                     | USA mit EU-Edge                         | SCC Modul 3 · optional EU-Datenhaltung                                |
| **Google** (SSO/OAuth)           | Authentifizierung                                                                                                                       | EU/USA                                  | [TBD: nur falls Google-OAuth für Scholar aktiv; primär hochschul-IdP] |
| **Upstash Inc.**                 | Rate-Limiting/Cache                                                                                                                     | **EU eu-west-1 (Dublin)**               | EU-Verarbeitung; SCC; DPF                                             |
| **Functional Software (Sentry)** | Fehler-Monitoring                                                                                                                       | EU (Frankfurt), Fallback USA            | SCC Modul 3; PII-Scrubbing aktiv                                      |
| **LogSnag**                      | Geschäftsereignis-Monitoring (server-only, keine PII-Klartextfelder)                                                                    | Kanada                                  | Angemessenheitsbeschluss (Kanada); SCC                                |

> Detaillierte Drittland-Bewertung (Schrems II, ergänzende Maßnahmen) siehe **Transfer-Impact-Assessment (`transfer-impact-assessment.md`)**.

#### 2.5 Speicherdauer

- **Suchhistorie:** automatische Löschung nach **90 Tagen** (verifiziert: `data-retention-cleanup`-Cron löscht `ScholarSearchHistory` älter als 90 Tage).
- **Konto/Präferenzen/Merkliste/Leselisten:** für die Dauer des Hochschul-/Nutzerverhältnisses; **Self-Service-Löschung** kaskadiert über alle fünf Scholar-Tabellen (verifiziert: `api/user/delete` löscht `scholarReadingListItem`, `scholarReadingList`, `scholarBookmark`, `scholarSearchHistory`, `scholarUserPreferences` innerhalb einer Transaktion).
- **Login-Ereignisse:** rollierendes Sicherheitsfenster (90 Tage Brute-Force-Puffer). [TBD: finale Festlegung im Löschkonzept G12.]

#### 2.6 Technischer Verarbeitungsfluss (Kurzbeschreibung)

SSO-Login → Session → Suchanfrage. Bei aktivierter semantischer Suche wird der **Anfragetext** zur Vektor-Repräsentation an das Embedding-Modell (OpenAI via Vercel AI Gateway) gesendet; das Ranking erfolgt gegen vorab berechnete Korpus-Embeddings. **Es werden keine Klartext-Anfragen über die API-Aufrufdauer hinaus beim KI-Anbieter gespeichert** (Zero-Data-Retention). Ergebnisse zeigen offizielle Rechtsquellen; geschlossen-lizenzierte ITU/ISO-Texte sind auf **600 Zeichen** gekappt.

---

### 3. Bewertung der Notwendigkeit und Verhältnismäßigkeit (Art. 35 Abs. 7 lit. b)

- **Notwendigkeit:** Konto-, Präferenz- und Recherchehilfen-Daten sind zur Diensterbringung erforderlich (lit. b). Sicherheits-Logging ist zur Gewährleistung der Integrität nach Art. 32 erforderlich (lit. f, LIA).
- **Datenminimierung (Art. 5 Abs. 1 lit. c):** Es wird **kein Geburtsdatum** erhoben; keine Altersabfrage (Identität ist SSO-vermittelt). Suchhistorie ist optional. Vektor-Embeddings sind kurze Anfragetexte, keine Profile.
- **Verhältnismäßigkeit der KI-Funktion:** Die semantische Suche verbessert die Auffindbarkeit, ist aber **nicht erforderlich** für die Kernrecherche — daher **opt-in** und damit verhältnismäßig.
- **Zweckbindung (lit. b):** Daten werden nicht für Werbung/Profiling/Modelltraining genutzt (Zero-Data-Retention beim KI-Anbieter; keine Trainingsnutzung).
- **Rechtsgrundlagen:** vorzugsweise Vertrag/öffentliche Aufgabe für den Kern; Einwilligung nur für opt-in-Funktionen; berechtigtes Interesse (mit LIA) für Sicherheit. **Minimierung der Abhängigkeit von Art. 8 (Minderjährigen-Einwilligung):** Kernfunktionen stützen sich nicht auf Einwilligung. [TBD: finale Basis-Festlegung + LIAs in Memo G3.]
- **Betroffenenrechte:** Auskunft/Datenübertragbarkeit (Export inkl. Konto, Präferenzen, Historie, Bookmarks, Leselisten), Löschung (Self-Service, kaskadierend), Berichtigung (editierbare Präferenzen). **Transparenz** über Art.-50-KI-Hinweis (live) und Datenschutzerklärung.

---

### 4. Risikobewertung für die Rechte und Freiheiten (Art. 35 Abs. 7 lit. c)

Bewertung: Eintrittswahrscheinlichkeit (E) × Schweregrad (S), je gering/mittel/hoch.

| ID  | Risiko                                                                                                                                                          | Betroffene                        | E (Brutto)    | S (Brutto)  | Brutto-Risiko                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------- | ----------- | --------------------------------------------------------- |
| R1  | **Minderjährige**: unzureichend verständliche Information / unzulässige Stützung auf Einwilligung bei < 16-Jährigen (Art. 8)                                    | minderjährige Studierende         | mittel        | hoch        | **hoch**                                                  |
| R2  | **KI-semantische Suche**: Übermittlung sensibler Recherchethemen an KI-/Drittland-Anbieter; Re-Identifikation aus Anfragen; „function creep" Richtung Profiling | alle Nutzer                       | mittel        | hoch        | **hoch**                                                  |
| R3  | **Verhaltensbezogene Suchhistorie**: dauerhafte Sammlung von Rechercheverhalten ergibt sensibles Persönlichkeitsbild                                            | alle Nutzer (insb. Minderjährige) | mittel        | hoch        | **hoch**                                                  |
| R4  | **Drittlandtransfer** (US-Mutterkonzerne Vercel/OpenAI): Behördenzugriff (FISA 702)                                                                             | alle Nutzer                       | gering–mittel | mittel–hoch | **mittel–hoch**                                           |
| R5  | **Unbefugter Zugriff / Datenleck** (Konto-Übernahme, Datenbank-Exfiltration)                                                                                    | alle Nutzer                       | gering        | hoch        | **mittel–hoch**                                           |
| R6  | **Unvollständige Löschung/Orphaning** beim Konto-Löschen (Scholar-Tabellen ohne FK-Kaskade)                                                                     | gelöschte Nutzer                  | (war hoch)    | mittel      | **niedrig (behoben)**                                     |
| R7  | **Unvollständige Auskunft/Export** (fehlende Bookmarks/Leselisten)                                                                                              | DSAR-Antragsteller                | (war mittel)  | gering      | **niedrig (behoben)**                                     |
| R8  | **DSAR-Scraping** über ungedrosselten Export-Endpunkt                                                                                                           | alle Nutzer                       | gering        | gering      | **niedrig**                                               |
| R9  | **Tracker vor Einwilligung** (Analytics/Sentry/LogSnag) auf Scholar-Routen                                                                                      | alle Nutzer                       | gering        | gering      | **niedrig**                                               |
| R10 | **Urheber-/DB-Recht**: übermäßige Wiedergabe geschlossen-lizenzierter Texte                                                                                     | (Rechteinhaber)                   | gering        | gering      | **niedrig** (eigenständig; nicht Betroffenenrecht i.e.S.) |

---

### 5. Abhilfemaßnahmen (Art. 35 Abs. 7 lit. d) — und Restrisiko

| ID  | Maßnahme(n) — Status im Code                                                                                                                                                                                                                                                             | Wirkung         | Restrisiko                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------ |
| R1  | Kernfunktionen **nicht** auf Einwilligung stützen (Vertrag/öff. Aufgabe); Einwilligungs-Funktionen **standardmäßig AUS**; kinderfreundliche, klare Datenschutzerklärung (Recital 58); **keine** Erhebung des Geburtsdatums; Art.-8-Zuständigkeit der Hochschule im AVV.                  | Reduziert E + S | **niedrig–mittel** [TBD: AVV/Notice-Wording G2/G4/G17] |
| R2  | Semantische Suche **opt-in (default false — verifiziert** `preferences.server.ts:49`, `schema.prisma`**)**; **Zero-Data-Retention** beim KI-Anbieter; **keine** Trainingsnutzung; nur kurze Anfragetexte; **Art.-50-KI-Hinweis live** (`AiDisclosure.tsx`, an Suchfeld + Ergebnisliste). | Reduziert E + S | **niedrig–mittel**                                     |
| R3  | Suchhistorie **opt-in (default false — verifiziert)**; **90-Tage-Auto-Löschung (verifiziert** Retention-Cron**)**; klare Just-in-time-Notiz am Toggle.                                                                                                                                   | Reduziert E + S | **niedrig**                                            |
| R4  | Neon-DB **in der EU (Frankfurt)** gepinnt; Vercel vorrangig EU-Regionen; DPF/SCC; Zero-Data-Retention beim KI-Anbieter; siehe **TIA** für ergänzende Maßnahmen.                                                                                                                          | Reduziert E     | **mittel** (US-Restexposition; TIA-Fazit maßgeblich)   |
| R5  | **TOMs (verifiziert):** AES-256-GCM-Feldverschlüsselung, bcrypt(12)-Passwörter, MFA/WebAuthn, Upstash-Rate-Limiting, Brute-Force-Lockout, hash-verkettetes Audit-Log, CSP/HSTS-Header, maskierte IP, server-only-Secrets.                                                                | Reduziert E + S | **niedrig–mittel**                                     |
| R6  | **BEHOBEN (verifiziert):** `api/user/delete` löscht alle fünf Scholar-Tabellen in einer Transaktion.                                                                                                                                                                                     | Eliminiert      | **niedrig**                                            |
| R7  | **BEHOBEN (verifiziert):** Export umfasst Konto + Präferenzen + Historie + Bookmarks + Leselisten.                                                                                                                                                                                       | Eliminiert      | **niedrig**                                            |
| R8  | Export-Rate-Limit (`export`-Tier) ergänzen.                                                                                                                                                                                                                                              | Reduziert E     | **niedrig** [TBD: G19 offen]                           |
| R9  | Bestätigen, dass kein Tracker vor Einwilligung feuert (Consent-Gate `ConditionalAnalytics.tsx`); Scholar-Routen-Audit.                                                                                                                                                                   | Reduziert E     | **niedrig** [TBD: E2-Audit]                            |
| R10 | **600-Zeichen-Kappe** auf Render-Pfad (Atlas `korpus-tools.server.ts`); per-Quelle-Lizenz-Flag geplant; Provenienz/TDM-Opt-out in der Ingestion.                                                                                                                                         | Reduziert       | **niedrig**                                            |

---

### 6. Standpunkte der betroffenen Personen (Art. 35 Abs. 9)

Sofern angemessen, sind die Standpunkte der betroffenen Personen oder ihrer Vertreter einzuholen. Vorschlag: Abstimmung mit den **Datenschutzbeauftragten der lizenzierenden Hochschulen** (die die Studierenden vertreten) sowie ggf. studentischen Vertretungen. [TBD: dokumentieren, ob/wie eingeholt — oder Begründung, warum nicht angemessen.]

### 7. Einhaltung von Verhaltensregeln / Zertifizierungen (Art. 35 Abs. 8)

Derzeit keine genehmigten Verhaltensregeln (Art. 40) oder Zertifizierungen (Art. 42) herangezogen. [TBD: prüfen, ob Branchen-Codes anwendbar.]

---

### 8. Gesamtbewertung und Fazit zur vorherigen Konsultation (Art. 36)

Nach Umsetzung der verifizierten Abhilfemaßnahmen werden die hohen Brutto-Risiken **R1–R3 auf niedrig–mittel** und **R4 auf mittel** gesenkt. **R6/R7 sind durch Code behoben.**

**Vorherige Konsultation nach Art. 36 DSGVO** ist erforderlich, wenn nach Abhilfe ein **hohes Restrisiko** verbleibt. Vorläufige Einschätzung des Entwurfs: Mit den umgesetzten Maßnahmen (Privacy-by-default AUS, 90-Tage-Löschung, EU-DB, Zero-Data-Retention, Verschlüsselung, kaskadierende Löschung) **verbleibt voraussichtlich kein hohes Restrisiko** → **keine Art.-36-Konsultation erforderlich.**

**Vorbehalte (zwingend vor finaler Freigabe zu klären) / [TBD: durch DSB/Anwalt zu bestätigen]:**

1. Drittland-Restrisiko R4 hängt vom **TIA-Fazit** und unterzeichneten DPAs (Vercel/Neon/OpenAI) ab.
2. Minderjährigen-Behandlung R1 hängt vom **AVV** (Art.-8-Allokation an Hochschule) und kinderfreundlichem **Notice-Wording** ab.
3. Endgültige **Rechtsgrundlagen + LIAs** (Memo G3).

> **Fazit (Entwurf):** DSFA verpflichtend und durchgeführt; nach Abhilfe voraussichtlich **kein** hohes Restrisiko; **Art.-36-Konsultation voraussichtlich nicht erforderlich** — vorbehaltlich der drei genannten Bestätigungen. Diese DSFA ist vor Produktivstart durch qualifizierte Rechtsberatung / den/die DSB final zu prüfen und freizugeben.

---

## EN — Convenience translation (non-binding)

### 1. Trigger, threshold test and necessity of the DPIA

**1.1 Trigger.** Caelex Scholar (`caelex.eu/scholar`) is a **free, university-licensed (B2B2C), SSO-gated legal-research platform** for space law, "powered by Atlas". It processes personal data of university members (students and staff). This DPIA is conducted **before go-live**.

**1.2 Threshold test (Art. 35(1),(3) GDPR; WP248; DSK mandatory list).** A DPIA is mandatory where processing is "likely to result in a high risk". Against the **nine WP248 criteria**, at least three are met (the ≥ 2 threshold is exceeded): **(7) data of vulnerable subjects (minors)** — the university cohort may include under-16s; **(8) innovative use / new technology (AI)** — AI semantic search over vector embeddings; **(3)/(4) systematic monitoring / highly personal data** — optional search history can reveal research behaviour and sensitive topics. WP248 criteria not met: automated decision-making with legal effect (No. 2 — retrieval only), data matching (No. 6), denial of a right/contract (No. 9). The **DSK mandatory list** additionally names "use of artificial intelligence to process personal data". **Conclusion: the DPIA is mandatory.** [TBD: final DPO/counsel confirmation.]

**1.3 DPO involvement (Art. 35(2)).** The DPO's advice must be sought where one is designated. Because this DPIA is mandatory (minors + AI), **BDSG § 38(1) sentence 2** may make **DPO designation mandatory**. [TBD: DPO appointment + authority notification — see memo G15.]

### 2. Systematic description of the processing (Art. 35(7)(a))

**2.1 Controllership (dual-role, B2B2C).** The **licensing university is controller** for the contracted research service; **Caelex is processor** under an Art. 28 DPA **and its own controller** for product/security/AI decisions (security logging, error monitoring, corpus/embedding strategy). The dual role is attributed per activity in the DPA and privacy notice. [TBD: RACI memo G1; DPA memo G2.]

**2.2 Purposes.** (1) SSO access + authentication; (2) legal research (full-text and optional AI semantic search of the space-law corpus); (3) personalised research aids (bookmarks, reading lists, preferences); (4) optional (opt-in) search history; (5) IT security and abuse prevention (login events, rate-limiting, audit trail).

**2.3 Categories of data and subjects.** Subjects: EU university students and staff (potentially including minors).

| Category                                     | Fields (verified in code)                                                                                                           | Source                        | Proposed basis                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| Account                                      | name, email (via SSO/credentials)                                                                                                   | university SSO IdP / sign-up  | Art. 6(1)(b) / public task (e) — [TBD]     |
| Preferences (`ScholarUserPreferences`)       | `uiLanguage`, `sourceLanguage`, `defaultJurisdiction`, `citationFormat`, `semanticSearch`, `resultsPerPage`, `searchHistoryEnabled` | user input                    | Art. 6(1)(b)                               |
| Search history (`ScholarSearchHistory`)      | `query`, `jurisdiction`, `createdAt`                                                                                                | user action (only if enabled) | **Art. 6(1)(a) consent (opt-in)**          |
| Bookmarks (`ScholarBookmark`)                | `itemType`, `itemId`, `createdAt`                                                                                                   | user action                   | Art. 6(1)(b)                               |
| Reading lists (`ScholarReadingList`/`…Item`) | `name`, `description`, `note`, `position`                                                                                           | user action                   | Art. 6(1)(b)                               |
| Login/security events (`LoginEvent`)         | masked IP, user-agent, timestamp                                                                                                    | authentication                | Art. 6(1)(f) (security) — LIA needed [TBD] |

No **special-category (Art. 9)** data is deliberately collected, but search queries **can** reveal sensitive topics. Mitigation: search history is **OFF by default** and auto-deleted after 90 days.

**2.4 Recipients / processors (verified live state).** Processing uses vetted sub-processors (full list at `/legal/sub-processors`): **Vercel** (host/CDN/serverless; US, prefers EU regions fra1/cdg1; SCC + DPF); **Neon** (DB; **EU eu-central-1 Frankfurt**); **OpenAI** (embeddings `text-embedding-3-small` @ 512 dims for semantic search, routed via Vercel AI Gateway, OpenAI = sub-sub-processor; US; DPF + SCC + zero-data-retention); **Resend** (email; US/EU-edge); **Google** (SSO/OAuth — [TBD: only if Google OAuth is enabled for Scholar; primarily the university IdP]); **Upstash** (rate-limit/cache; **EU eu-west-1 Dublin**); **Sentry** (error monitoring; EU Frankfurt, US fallback; PII scrubbing); **LogSnag** (business-event monitoring, server-only, no plaintext PII; Canada — adequacy). Detailed third-country analysis: see the **TIA (`transfer-impact-assessment.md`)**.

**2.5 Retention.** Search history: **auto-deleted after 90 days** (verified retention cron). Account/preferences/bookmarks/reading lists: for the duration of the relationship; **self-service deletion cascades across all five Scholar tables** (verified `api/user/delete`). Login events: rolling 90-day security window [TBD: final Löschkonzept G12].

**2.6 Technical flow.** SSO login → session → query. With semantic search enabled, the **query text** is sent for vector representation to the embedding model (OpenAI via Vercel AI Gateway); ranking runs against pre-computed corpus embeddings. **No plaintext queries are retained at the AI provider beyond the API-call duration** (zero-data-retention). Results show official legal sources; closed-licence ITU/ISO text is capped at **600 characters**.

### 3. Necessity and proportionality (Art. 35(7)(b))

Account/preference/research-aid data are necessary for the service (b); security logging is necessary under Art. 32 (f, LIA). **Data minimisation:** no date of birth, no age gate (identity is SSO-mediated); search history optional; embeddings are short query texts, not profiles. The AI feature is **not required** for core research → **opt-in**, hence proportionate. **Purpose limitation:** no advertising/profiling/model training. Preferred bases: contract/public task for the core; consent only for opt-in features; legitimate interest (with LIA) for security; **minimise reliance on Art. 8 (minors' consent)** by not basing core functions on consent. [TBD: final bases + LIAs in memo G3.] Data-subject rights: access/portability (export covers account, preferences, history, bookmarks, reading lists), erasure (self-service, cascading), rectification (editable preferences); transparency via the live Art. 50 AI notice and the privacy policy.

### 4. Risk assessment (Art. 35(7)(c))

Likelihood (L) × severity (S), each low/medium/high. **R1 Minors** — inadequate child-friendly information / improper reliance on consent for under-16s (gross: high). **R2 AI semantic search** — sending sensitive research topics to AI/third-country provider, re-identification from queries, function creep toward profiling (gross: high). **R3 Behavioural search history** — persistent collection yields a sensitive personality picture (gross: high). **R4 Third-country transfer** (US parents Vercel/OpenAI; FISA 702 access) (gross: medium–high). **R5 Unauthorised access / breach** (gross: medium–high). **R6 Incomplete deletion/orphaning** (was high — **fixed**). **R7 Incomplete access/export** (was medium — **fixed**). **R8 DSAR scraping** via un-throttled export (low). **R9 Trackers before consent** on Scholar routes (low). **R10 Copyright/DB-right** over-reproduction of closed-licence text (low; standalone, not strictly a data-subject right).

### 5. Mitigations (Art. 35(7)(d)) and residual risk

- **R1:** core not based on consent; consent features **OFF by default**; child-friendly, plain notice (Recital 58); **no** DOB collected; Art. 8 allocated to the university in the DPA. → residual **low–medium** [TBD: DPA/notice wording G2/G4/G17].
- **R2:** semantic search **opt-in (default false — verified** `preferences.server.ts:49`, schema**)**; **zero-data-retention** at the AI provider; **no** training use; short query texts only; **Art. 50 AI notice live** (`AiDisclosure.tsx`, at search input + results). → residual **low–medium**.
- **R3:** search history **opt-in (default false — verified)**; **90-day auto-deletion (verified)**; clear just-in-time toggle notice. → residual **low**.
- **R4:** Neon DB pinned **in the EU (Frankfurt)**; Vercel prefers EU regions; DPF/SCC; AI zero-data-retention; see **TIA** for supplementary measures. → residual **medium** (US exposure; TIA conclusion governs).
- **R5:** **TOMs (verified):** AES-256-GCM field encryption, bcrypt(12), MFA/WebAuthn, Upstash rate-limit, brute-force lockout, hash-chained audit log, CSP/HSTS, masked IP, server-only secrets. → residual **low–medium**.
- **R6:** **FIXED (verified)** — `api/user/delete` deletes all five Scholar tables in one transaction. → **low**.
- **R7:** **FIXED (verified)** — export includes account + preferences + history + bookmarks + reading lists. → **low**.
- **R8:** add `export`-tier rate-limit. → **low** [TBD: G19 open].
- **R9:** confirm no tracker fires pre-consent (consent gate `ConditionalAnalytics.tsx`); Scholar-route audit. → **low** [TBD: E2 audit].
- **R10:** **600-char cap** on render path (Atlas `korpus-tools.server.ts`); per-source licence flag planned; provenance/TDM opt-out in ingestion. → **low**.

### 6. Views of data subjects (Art. 35(9))

Where appropriate, seek the views of data subjects or their representatives. Proposal: coordinate with the **DPOs of the licensing universities** (who represent the students) and, where relevant, student bodies. [TBD: document whether/how obtained, or justify why not appropriate.]

### 7. Codes of conduct / certifications (Art. 35(8))

None currently relied upon. [TBD: check for applicable industry codes.]

### 8. Overall assessment and conclusion on prior consultation (Art. 36)

After the verified mitigations, gross-high risks **R1–R3 fall to low–medium** and **R4 to medium**; **R6/R7 are fixed in code**. **Prior consultation under Art. 36** is required only if a **high residual risk** remains. Preliminary view: with the implemented measures (privacy-by-default OFF, 90-day deletion, EU DB, zero-data-retention, encryption, cascading deletion) **no high residual risk is expected** → **no Art. 36 consultation required.** Caveats (must be confirmed before final sign-off) / [TBD]: (1) R4 depends on the **TIA conclusion** and signed DPAs (Vercel/Neon/OpenAI); (2) R1 depends on the **DPA** (Art. 8 allocation to the university) and child-friendly **notice wording**; (3) final **bases + LIAs** (memo G3).

> **Conclusion (draft):** DPIA mandatory and performed; after mitigation, **no** high residual risk expected; **Art. 36 consultation likely not required** — subject to the three confirmations above. This DPIA must be finally reviewed and signed off by qualified counsel / the DPO before go-live.
