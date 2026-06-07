# Caelex Scholar — Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) / Records of Processing Activities (Art. 30 GDPR)

> ╔══════════════════════════════════════════════════════════════════════════╗
> ║ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung ║
> ║ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine ║
> ║ Rechtsberatung. / Template; must be reviewed and adapted by qualified ║
> ║ legal counsel before publication or execution. Not legal advice. ║
> ╚══════════════════════════════════════════════════════════════════════════╝

**Stand / Last updated:** {{DATE}}
**Version:** 0.1 (Entwurf / Draft)
**Dokumenttyp / Document type:** Internes Compliance-Dokument — NICHT zur Veröffentlichung. / Internal compliance record — NOT for publication.
**Geltungsbereich / Scope:** Caelex Scholar (`caelex.eu/scholar`) — kostenlose, hochschullizenzierte (B2B2C), SSO-gesteuerte Rechtsrecherche-Datenbank "powered by Atlas".
**Verantwortlich / Owner:** Julian Polleschner (Inhaber, Caelex) · privacy@caelex.eu
**Sprachregime / Language regime:** Die deutsche Fassung ist die verbindliche; die englische dient nur der Information. / The German edition is binding; the English text is a convenience translation.

---

## 0. Hinweise zur Anwendung dieses Dokuments / How to use this record

**DE.** Dieses Verzeichnis bildet **zwei** getrennte Art.-30-Aufzeichnungen ab, weil Caelex bei Scholar eine **Doppelrolle** einnimmt:

- **Teil A — Verzeichnis als Verantwortlicher (Art. 30 Abs. 1 DSGVO):** Verarbeitungen, über deren Zwecke und Mittel **Caelex selbst** entscheidet — Kontoverwaltung, Produkt-/Sicherheitsbetrieb, KI-gestützte Semantiksuche, Einwilligungs- und Pflichtnachweise.
- **Teil B — Verzeichnis als Auftragsverarbeiter (Art. 30 Abs. 2 DSGVO):** Verarbeitungen, die Caelex **im Auftrag und nach Weisung der lizenzierenden Hochschule** durchführt (die Hochschule ist Verantwortliche; ihre Studierenden/Beschäftigten sind die betroffenen Personen). Diese Aufzeichnung wird **pro Hochschule** geführt; Teil B liefert die wiederverwendbare Vorlage.

**Zur 250-Beschäftigten-Schwelle (Art. 30 Abs. 5):** Die Ausnahme greift **nicht**. Sie entfällt bereits, wenn die Verarbeitung **nicht nur gelegentlich** erfolgt (Scholar verarbeitet kontinuierlich) — und zusätzlich, weil die Zielgruppe **Minderjährige** umfassen kann (Daten besonders schutzbedürftiger Personen, Erwägungsgrund 38 / Art. 8). Das Verzeichnis ist daher **verpflichtend** zu führen, unabhängig von der Unternehmensgröße. [TBD: durch Rechtsberatung bestätigen.]

**EN.** This record contains **two** separate Art. 30 records because Caelex holds a **dual role** for Scholar:

- **Part A — Controller record (Art. 30(1)):** processing where **Caelex itself** decides purposes and means — account management, product/security operations, AI-assisted semantic search, consent and statutory-obligation evidence.
- **Part B — Processor record (Art. 30(2)):** processing Caelex performs **on behalf of and on the documented instructions of the licensing university** (the university is controller; its students/staff are the data subjects). Maintained **per university**; Part B is the reusable template.

**On the 250-employee threshold (Art. 30(5)):** the exemption does **not** apply — it falls away whenever processing is **not occasional** (Scholar processes continuously) and additionally because the audience may include **minors** (data of vulnerable persons, Recital 38 / Art. 8). The record is therefore **mandatory** regardless of headcount. [TBD: confirm with counsel.]

---

## Teil A — Verzeichnis als Verantwortlicher / Part A — Controller record (Art. 30(1) GDPR)

### A.0 Angaben zum Verantwortlichen / Controller identity (Art. 30(1)(a))

| Feld / Field                                            | Eintrag / Entry                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verantwortlicher / Controller                           | **Caelex** — Einzelunternehmen / German sole proprietorship; Inhaber / proprietor: **Julian Polleschner**                                                                                                                                                                 |
| Anschrift / Address                                     | Am Maselakepark 37, 13587 Berlin, Deutschland / Germany                                                                                                                                                                                                                   |
| Steuerstatus / Tax status                               | Kleinunternehmer gemäß / under § 19 UStG                                                                                                                                                                                                                                  |
| Kontakt allgemein / General contact                     | cs@caelex.eu                                                                                                                                                                                                                                                              |
| Kontakt Datenschutz / Privacy contact                   | privacy@caelex.eu                                                                                                                                                                                                                                                         |
| Vertreter (Art. 27) / Representative                    | Nicht einschlägig — in der EU niedergelassen. / N/A — established in the EU.                                                                                                                                                                                              |
| Datenschutzbeauftragter (DSB) / DPO                     | [TBD: Benennung prüfen — bei verpflichtender DSFA wird ein DSB nach BDSG § 38 S. 2 regelmäßig Pflicht. / Assess appointment — a mandatory DPIA typically triggers a mandatory DPO under BDSG § 38 s. 2.] Bis zur Benennung Kontakt: privacy@caelex.eu.                    |
| Gemeinsam Verantwortliche (Art. 26) / Joint controllers | Keine im Scholar-Kontext. Stripe ist für Zahlungsdaten **eigener** Verantwortlicher — bei Scholar (kostenlos) jedoch **nicht** im Datenfluss. / None for Scholar. Stripe is an independent controller for payment data — but **not** in scope for Scholar (free service). |

---

### A.1 Verarbeitungstätigkeit: Kontoverwaltung & SSO-Zugang / Activity: Account management & SSO access

| Art.-30(1) Pflichtangabe                                          | Eintrag                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck der Verarbeitung** / Purpose                              | Anlegen und Verwalten des Nutzerkontos; Authentifizierung über Hochschul-SSO bzw. Credentials/OAuth (Google, Apple); Zuordnung der Lizenzberechtigung; Bereitstellung des Recherchezugangs. / Creating and managing the user account; authentication via university SSO or credentials/OAuth (Google, Apple); mapping licence entitlement; granting research access.       |
| **Kategorien betroffener Personen** / Data-subject categories     | Studierende und Beschäftigte der lizenzierenden Hochschulen (EU). **Hinweis:** Können **Minderjährige** ab dem typischen Studienbeginn umfassen (DE digitale Einwilligung ab 16). / University students and staff (EU). **May include minors.**                                                                                                                            |
| **Kategorien personenbezogener Daten** / Personal-data categories | Name; E-Mail-Adresse (über SSO/Credentials); Konto-ID; Authentifizierungs-Metadaten (Provider, Verknüpfungsstatus); Passwort-Hash (nur bei Credentials-Login, bcrypt(12)); MFA-/WebAuthn-Konfiguration (sofern aktiviert). / Name; email (via SSO/credentials); account ID; auth metadata; password hash (credentials only, bcrypt(12)); MFA/WebAuthn config (if enabled). |
| **Besondere Kategorien (Art. 9)**                                 | Keine. / None.                                                                                                                                                                                                                                                                                                                                                             |
| **Empfänger** / Recipients                                        | Hosting (Vercel), Datenbank (Neon, Frankfurt), Rate-Limiting/Session-Cache (Upstash, Dublin), SSO-Identitätsanbieter (Hochschule bzw. Google/Apple) als jeweils eigene Verantwortliche, transaktionale E-Mail (Resend). Siehe **Anhang 1**. / See **Annex 1**.                                                                                                             |
| **Drittlandübermittlung** / Third-country transfers               | Verarbeitung primär in der EU. US-Mutterkonzerne der Auftragsverarbeiter: Absicherung über EU-US Data Privacy Framework (DPF) und/oder EU-Standardvertragsklauseln (SCC Modul 3). Siehe **Anhang 2**. / EU-first processing; US parents covered by DPF / SCCs. See **Annex 2**.                                                                                            |
| **Löschfristen** / Erasure deadlines                              | Konto-Stammdaten: bis zur Löschung des Kontos (Self-Service-Löschung kaskadiert alle Scholar-Tabellen) bzw. nach Ende der Hochschullizenz. LoginEvent: rollierend (siehe A.4). Genaues Löschkonzept: `retention-schedule.md`. / Account master data: until account deletion or licence end. Details in `retention-schedule.md`.                                            |
| **Technische & organisatorische Maßnahmen (TOM)**                 | AES-256-GCM-Feldverschlüsselung sensibler Felder; bcrypt(12); MFA/WebAuthn; Upstash Rate-Limiting; Brute-Force-Sperre; CSP/HSTS; serverseitige Secrets. Vollständig in **Anhang 3**. / Full list in **Annex 3**.                                                                                                                                                           |
| **Rechtsgrundlage** (Querverweis)                                 | Art. 6(1)(b) Vertrag/vorvertraglich bzw. (f) berechtigtes Interesse am sicheren Betrieb — siehe `lawful-basis-register.md`. / See `lawful-basis-register.md`.                                                                                                                                                                                                              |

---

### A.2 Verarbeitungstätigkeit: Recherche-Präferenzen / Activity: Research preferences

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Speicherung der nutzergewählten Voreinstellungen, damit die Recherche-Oberfläche personalisiert reagiert. / Storing user-chosen settings so the research UI behaves as configured.                                                                                                                                                                |
| **Betroffene Personen**                | Eingeloggte Scholar-Nutzer (Studierende/Beschäftigte; ggf. Minderjährige). / Logged-in Scholar users.                                                                                                                                                                                                                                             |
| **Kategorien personenbezogener Daten** | `ScholarUserPreferences`: `uiLanguage`, `sourceLanguage`, `defaultJurisdiction`, `citationFormat`, `semanticSearch` (Schalter, **Standard AUS**), `resultsPerPage`, `searchHistoryEnabled` (Schalter, **Standard AUS**), jeweils mit Konto-ID. / Preferences row keyed to account ID; semantic-search and search-history toggles **default OFF**. |
| **Besondere Kategorien (Art. 9)**      | Keine. / None.                                                                                                                                                                                                                                                                                                                                    |
| **Empfänger**                          | Hosting (Vercel), Datenbank (Neon). / Hosting, database.                                                                                                                                                                                                                                                                                          |
| **Drittlandübermittlung**              | Wie A.1 (EU-first). / As A.1.                                                                                                                                                                                                                                                                                                                     |
| **Löschfristen**                       | Bis Kontolöschung; kaskadiert bei Self-Service-Löschung. / Until account deletion.                                                                                                                                                                                                                                                                |
| **TOM**                                | Wie Anhang 3. / As Annex 3.                                                                                                                                                                                                                                                                                                                       |
| **Rechtsgrundlage**                    | Art. 6(1)(b) (Vertragserfüllung — Bereitstellung der konfigurierbaren Oberfläche). / Art. 6(1)(b).                                                                                                                                                                                                                                                |

---

### A.3 Verarbeitungstätigkeit: KI-gestützte Semantiksuche (opt-in) / Activity: AI-assisted semantic search (opt-in)

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Auf ausdrücklichen Opt-in hin Ranking der Korpus-Treffer mittels Vektor-Embeddings (semantische Ähnlichkeit) statt reiner Stichwortsuche. / On explicit opt-in, ranking corpus results by vector embeddings (semantic similarity) instead of keyword-only search.                                                                                                                             |
| **Betroffene Personen**                | Scholar-Nutzer, die die Semantiksuche aktiviert haben (`semanticSearch = true`). / Users who enabled semantic search.                                                                                                                                                                                                                                                                         |
| **Kategorien personenbezogener Daten** | Anfragetext (kurze Such-Query) zur Embedding-Erzeugung. Die Query kann personenbezogen sein, wenn sie freitextlich Identifizierbares enthält. Embeddings des **Korpus** sind nicht personenbezogen. / Query text submitted for embedding. The query may be personal if free-text reveals identity. Corpus embeddings are not personal.                                                        |
| **Besondere Kategorien (Art. 9)**      | Nicht beabsichtigt; Nutzer werden nicht aufgefordert, besondere Kategorien einzugeben. Recherche-Queries könnten theoretisch sensible Themen berühren — Minimierung über Nicht-Speicherung beim Anbieter. [TBD: in DSFA bewerten.] / Not intended; minimised via provider non-retention. [TBD: assess in DPIA.]                                                                               |
| **Empfänger**                          | OpenAI (Embeddings, `text-embedding-3-small`) **geroutet über das Vercel AI Gateway** — OpenAI wirkt als Sub-Sub-Auftragsverarbeiter von Vercel; **Zero-Data-Retention** für API-Aufrufe (keine Speicherung über die Aufruf-Dauer hinaus, kein Modelltraining). / OpenAI embeddings **routed via Vercel AI Gateway** — sub-sub-processor under Vercel; **zero-data-retention** for API calls. |
| **Drittlandübermittlung**              | OpenAI: USA — EU-US DPF (zertifiziert) + SCC + Zero-Data-Retention; Routing über Vercel AI Gateway (kein Direktvertrag Caelex↔OpenAI). Siehe **Anhang 2**. / OpenAI: US — DPF + SCC + ZDR.                                                                                                                                                                                                    |
| **Löschfristen**                       | Keine dauerhafte Speicherung der Query beim KI-Anbieter; etwaige Wiederfindung in der Suchhistorie nur bei aktiviertem `searchHistoryEnabled` (dann 90-Tage-Sweep, siehe A.5). / No durable query storage at the AI provider; only in search history if enabled (90-day sweep).                                                                                                               |
| **TOM**                                | Übermittlung nur des nötigen Anfragetexts; ZDR-Vereinbarung; serverseitiger Aufruf; keine Klartext-Speicherung. / Minimal payload; ZDR; server-side call.                                                                                                                                                                                                                                     |
| **KI-Transparenz / AI transparency**   | KI-Act Art. 50 Transparenzhinweis ist live (Nutzer werden über KI-gestützte Recherche informiert). Begrenztes/minimales Risiko; **keine** automatisierte Entscheidung mit Rechtswirkung (Art. 22). / AI Act Art. 50 transparency notice live; limited/minimal risk; **not** automated decision-making with legal effect (Art. 22).                                                            |
| **Rechtsgrundlage**                    | Einwilligung Art. 6(1)(a) durch ausdrücklichen Opt-in **oder** Art. 6(1)(b) als gewählte Funktion der vertraglichen Leistung — finale Festlegung siehe `lawful-basis-register.md` (lawyer-gated). / Art. 6(1)(a) opt-in or 6(1)(b); see `lawful-basis-register.md`.                                                                                                                           |

---

### A.4 Verarbeitungstätigkeit: Sicherheits- & Anmeldeprotokollierung / Activity: Security & login logging

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Erkennung und Abwehr von Kontoübernahme, Brute-Force und Anomalien; Nachweis der Verfügbarkeit/Integrität (Art. 32); Sicherheits-Audit. / Detecting and preventing account takeover, brute force and anomalies; security audit.                                                                      |
| **Betroffene Personen**                | Alle anmeldenden Scholar-Nutzer. / All users who authenticate.                                                                                                                                                                                                                                       |
| **Kategorien personenbezogener Daten** | `LoginEvent`: Ereignistyp, Auth-Methode, Geräte-/Browser-Infos, **maskierte IP-Adresse** (`maskIp()`), grobe Geolokation (Stadt/Land), Verdachtsmerkmale, Session-ID, Zeitstempel. `LoginAttempt` (Brute-Force-Puffer). / Login events with **masked IP**, device info, coarse geo, suspicion flags. |
| **Besondere Kategorien (Art. 9)**      | Keine. / None.                                                                                                                                                                                                                                                                                       |
| **Empfänger**                          | Datenbank (Neon); Fehler-Monitoring (Sentry, mit PII-Scrubbing). / Database; Sentry (PII-scrubbed).                                                                                                                                                                                                  |
| **Drittlandübermittlung**              | EU-first; Sentry primär EU (Frankfurt), Fallback US über SCC. / EU-first; Sentry EU-primary, US fallback via SCC.                                                                                                                                                                                    |
| **Löschfristen**                       | `LoginAttempt` 90-Tage-rollierend; `LoginEvent` [TBD: Frist bestätigen, Vorschlag ≤ 12 Monate für Sicherheitsforensik]. Siehe `retention-schedule.md`. / `LoginAttempt` 90 days; `LoginEvent` [TBD: ≤ 12 months proposed].                                                                           |
| **TOM**                                | IP-Maskierung; Audit-Hash-Kette (SHA-256-verkettet, manipulationsresistent); Zugriffsbeschränkung. / IP masking; hash-chained audit log; access control.                                                                                                                                             |
| **Rechtsgrundlage**                    | Art. 6(1)(f) — berechtigtes Interesse an IT-Sicherheit; **LIA in `lawful-basis-register.md`**. / Art. 6(1)(f) — LIA in `lawful-basis-register.md`.                                                                                                                                                   |

---

### A.5 Verarbeitungstätigkeit: Suchhistorie (opt-in) / Activity: Search history (opt-in)

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Auf ausdrücklichen Opt-in: Anzeige zuletzt genutzter Suchanfragen als Recherche-Komfortfunktion. / On explicit opt-in: showing recent searches as a convenience.                             |
| **Betroffene Personen**                | Nutzer mit `searchHistoryEnabled = true`. / Users who enabled history.                                                                                                                       |
| **Kategorien personenbezogener Daten** | `ScholarSearchHistory`: `query` (Freitext), `jurisdiction`, `createdAt`, Konto-ID. Verhaltensdaten. / Search query, jurisdiction, timestamp, account ID. Behavioural data.                   |
| **Besondere Kategorien (Art. 9)**      | Nicht beabsichtigt; Freitext-Queries könnten Sensibles berühren — Minimierung über kurze Frist + Opt-in + Standard AUS. / Not intended; minimised via short TTL + opt-in + default OFF.      |
| **Empfänger**                          | Datenbank (Neon). / Database.                                                                                                                                                                |
| **Drittlandübermittlung**              | EU (Frankfurt). / EU.                                                                                                                                                                        |
| **Löschfristen**                       | **90 Tage** rollierend per Cron (`data-retention-cleanup`, live) **plus** vollständige Löschung bei Konto-Löschung. / **90-day** rolling sweep (live cron) plus erasure on account deletion. |
| **TOM**                                | Standard AUS (Privacy-by-default, Art. 25(2)); 90-Tage-Sweep; Self-Service-Abschaltung + Löschung. / Default OFF; 90-day sweep; self-service off + delete.                                   |
| **Rechtsgrundlage**                    | Einwilligung Art. 6(1)(a) (Opt-in). / Consent, Art. 6(1)(a).                                                                                                                                 |

---

### A.6 Verarbeitungstätigkeit: Merklisten & Leselisten / Activity: Bookmarks & reading lists

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zweck**                              | Speichern markierter Quellen/Fälle (`ScholarBookmark`) und benannter Leselisten für Lehre/Lernen (`ScholarReadingList` + `Item`). / Saving bookmarked sources/cases and named reading lists for teaching/learning. |
| **Betroffene Personen**                | Nutzer, die Merk-/Leselisten anlegen. / Users who create them.                                                                                                                                                     |
| **Kategorien personenbezogener Daten** | Verknüpfung Konto-ID ↔ Quellen-/Fall-ID; Listennamen, Beschreibungen, Notizen (Freitext). Privat per Standard. / Account-to-item links; list names, descriptions, notes (free text). Private by default.           |
| **Besondere Kategorien (Art. 9)**      | Keine. / None.                                                                                                                                                                                                     |
| **Empfänger**                          | Datenbank (Neon). / Database.                                                                                                                                                                                      |
| **Drittlandübermittlung**              | EU (Frankfurt). / EU.                                                                                                                                                                                              |
| **Löschfristen**                       | Bis Kontolöschung; kaskadiert. / Until account deletion.                                                                                                                                                           |
| **TOM**                                | Privat per Standard; im Datenexport (Art. 15/20) enthalten. / Private by default; included in data export.                                                                                                         |
| **Rechtsgrundlage**                    | Art. 6(1)(b) (gewählte Funktion der Leistung). / Art. 6(1)(b).                                                                                                                                                     |

---

### A.7 Verarbeitungstätigkeit: Einwilligungs- & Pflichtnachweise / Activity: Consent & statutory-obligation evidence

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Nachweis erteilter/widerrufener Cookie-/Tracking-Einwilligung (`ConsentRecord`); Erfüllung der Rechenschaftspflicht (Art. 5(2), 7(1)) und ePrivacy/TDDDG §25. / Proving cookie/tracking consent; meeting accountability + ePrivacy/TDDDG §25.                                                                                                                       |
| **Betroffene Personen**                | Besucher/Nutzer, die den Consent-Banner bedienen. / Visitors/users interacting with the consent banner.                                                                                                                                                                                                                                                             |
| **Kategorien personenbezogener Daten** | `ConsentRecord`: **gehashte** Session-UUID, **gehashte & gekürzte** IP (/24 IPv4, /48 IPv6 vor SHA-256), gehashter User-Agent, Entscheidung, Per-Zweck-Präferenzen, Consent-Version, ggf. User-ID. Auf sich allein gestellt nicht personenbeziehbar. / Hashed session UUID, hashed/truncated IP, hashed UA, decision, per-purpose prefs, version, optional user ID. |
| **Besondere Kategorien (Art. 9)**      | Keine. / None.                                                                                                                                                                                                                                                                                                                                                      |
| **Empfänger**                          | Datenbank (Neon). / Database.                                                                                                                                                                                                                                                                                                                                       |
| **Drittlandübermittlung**              | EU (Frankfurt). / EU.                                                                                                                                                                                                                                                                                                                                               |
| **Löschfristen**                       | [TBD: Frist bestätigen — Vorschlag Aufbewahrung als Nachweis bis zu 3 Jahre nach Widerruf/Ablauf, abgewogen gegen Minimierung. Im `retention-schedule.md` dokumentieren.] / [TBD: confirm — proposed up to 3 years as evidence; document in `retention-schedule.md`.]                                                                                               |
| **TOM**                                | Peppered-SHA-256-Hashing; IP-Kürzung vor Hash; Versionierung des Consent-UX. / Peppered hashing; IP truncation; consent-UX versioning.                                                                                                                                                                                                                              |
| **Rechtsgrundlage**                    | Art. 6(1)(c) — rechtliche Verpflichtung (Nachweis nach Art. 7(1)) i. V. m. berechtigtem Interesse Art. 6(1)(f). / Art. 6(1)(c) + (f).                                                                                                                                                                                                                               |

---

### A.8 (Optionale) Web-Analytik & Performance — nur nach Einwilligung / (Optional) Web analytics & performance — consent-gated only

| Art.-30(1) Pflichtangabe               | Eintrag                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zweck**                              | Aggregierte, cookielose Reichweiten-/Performance-Statistik (Vercel Web Analytics, Speed Insights). **Nur** nach ausdrücklicher Einwilligung geladen (`ConditionalAnalytics.tsx`). / Aggregated cookieless reach/perf stats; loaded **only** after explicit consent.                                                    |
| **Betroffene Personen**                | Besucher, die Analytics/Performance-Cookies zugestimmt haben. / Visitors who consented.                                                                                                                                                                                                                                |
| **Kategorien personenbezogener Daten** | Cookielos: Seitenpfad, anonymisierte Geräteklasse, Referrer-Domain, gerollter Session-Hash, Performance-Messwerte. **Keine** IP, **keine** Cookies, **keine** User-IDs. Geringer/kein Personenbezug. / Cookieless: path, anonymised device class, referrer, rolled session hash, perf metrics. No IP/cookies/user-IDs. |
| **Besondere Kategorien (Art. 9)**      | Keine. / None.                                                                                                                                                                                                                                                                                                         |
| **Empfänger**                          | Vercel (Analytics, Speed Insights). / Vercel.                                                                                                                                                                                                                                                                          |
| **Drittlandübermittlung**              | USA — DPF + SCC Modul 3. / US — DPF + SCC.                                                                                                                                                                                                                                                                             |
| **Löschfristen**                       | Aggregierte Statistik beim Anbieter; keine personenbezogene Roh-Historie bei Caelex. [TBD: Anbieter-Aufbewahrung bestätigen.] / Provider-side aggregates; [TBD: confirm provider retention.]                                                                                                                           |
| **TOM**                                | Consent-Gating; cookielos; Anonymisierung. / Consent-gating; cookieless; anonymisation.                                                                                                                                                                                                                                |
| **Rechtsgrundlage**                    | Einwilligung Art. 6(1)(a) + TDDDG §25 (Endgerätezugriff). LIA für ein etwaiges berechtigtes Interesse an aggregierter Reichweitenmessung optional in `lawful-basis-register.md`. / Consent Art. 6(1)(a) + TDDDG §25.                                                                                                   |

---

## Teil B — Verzeichnis als Auftragsverarbeiter / Part B — Processor record (Art. 30(2) GDPR)

> **DE.** Diese Aufzeichnung wird **je lizenzierender Hochschule** geführt. Die Hochschule ist **Verantwortliche**; Caelex ist **Auftragsverarbeiter** für die vertraglich beauftragte Bereitstellung des Scholar-Recherchezugangs an deren Studierende/Beschäftigte. Grundlage ist ein Auftragsverarbeitungsvertrag (AVV/Art. 28) — siehe `[TBD: Verweis auf den Hochschul-AVV, sobald gezeichnet]`. Felder unten als Vorlage; pro Hochschule ausfüllen.
>
> **EN.** Maintained **per licensing university**. The university is **controller**; Caelex is **processor** for the contracted provision of Scholar research access to its students/staff, under an Art. 28 DPA — see `[TBD: link to the university DPA once signed]`. Fill per university.

### B.0 Angaben / Identities (Art. 30(2)(a))

| Feld / Field                                    | Eintrag / Entry                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Auftragsverarbeiter / Processor                 | Caelex, Inhaber Julian Polleschner, Am Maselakepark 37, 13587 Berlin, DE · privacy@caelex.eu |
| DSB des Verarbeiters / Processor DPO            | [TBD — siehe Teil A.0.]                                                                      |
| Verantwortliche(r) / Controller(s)              | **[TBD: Name + Anschrift der jeweiligen Hochschule]**                                        |
| Kontakt Verantwortliche(r) / Controller contact | **[TBD: Datenschutzkontakt der Hochschule]**                                                 |
| AVV-Referenz / DPA reference                    | **[TBD: Vertragsnummer/Datum des Hochschul-AVV]**                                            |

### B.1 Kategorien der Verarbeitung im Auftrag / Categories of processing on behalf of the controller (Art. 30(2)(b))

- Bereitstellung des SSO-gesteuerten Recherchezugangs (Authentifizierung, Kontolebenszyklus). / Provision of SSO-gated research access (authentication, account lifecycle).
- Speicherung der nutzerseitigen Recherche-Artefakte (Präferenzen, Merk-/Leselisten, optional Suchhistorie). / Storage of user research artefacts (preferences, bookmarks/reading lists, optional search history).
- Verarbeitung opt-in-basierter Funktionen (Semantiksuche, Suchhistorie) **nach Weisung / im Rahmen der vereinbarten Leistung**. / Opt-in features per instruction / agreed service scope.
- Sicherheits- und Verfügbarkeitsmaßnahmen für die beauftragte Verarbeitung. / Security and availability measures.

> **Abgrenzung / Boundary.** Soweit Caelex über **Produktverbesserung, Sicherheitsarchitektur und KI-Auswahl** eigenständig entscheidet, handelt Caelex insoweit als **eigener Verantwortlicher** (Teil A), nicht als Auftragsverarbeiter. Diese Doppelrolle ist im AVV ausdrücklich abzubilden. / Where Caelex independently decides product improvement, security architecture and AI choice, it acts as **its own controller** (Part A). The dual role must be expressly reflected in the DPA.

### B.2 Kategorien betroffener Personen & Daten / Categories of data subjects & data

- **Betroffene Personen:** Studierende und Beschäftigte der Hochschule (EU; ggf. Minderjährige). / Students and staff of the university (EU; may include minors).
- **Datenkategorien:** wie Teil A.1, A.2, A.5, A.6 (Konto-/SSO-Daten, Präferenzen, optionale Suchhistorie, Merk-/Leselisten). Keine besonderen Kategorien beabsichtigt. / As Part A.1, A.2, A.5, A.6. No special categories intended.

### B.3 Drittlandübermittlungen / Transfers to third countries (Art. 30(2)(c))

- EU-first (Neon Frankfurt). Auftragsverarbeiter-Mutterkonzerne (US) und KI-Routing wie **Anhang 2**; Absicherung über DPF/SCC. Die Sub-Auftragsverarbeiter-Kette ist im AVV durchzureichen (Genehmigung + 30-Tage-Vorabinformation bei Änderung). / EU-first; US parents + AI routing per **Annex 2** under DPF/SCC. Sub-processor chain flowed through the DPA (approval + 30-day notice on change).
- [TBD: Falls die Hochschule den Transfer in ein Drittland untersagt oder zusätzliche Garantien verlangt, hier dokumentieren.] / [TBD: document any controller-specific transfer restriction.]

### B.4 Technische & organisatorische Maßnahmen / TOMs (Art. 30(2)(d), Art. 32)

Siehe **Anhang 3** (identisch zu den im AVV als Anlage beizufügenden TOMs). / See **Annex 3** (same TOMs attached as an annex to the DPA).

### B.5 Weisungs-, Unterstützungs- & Meldepflichten / Instructions, assistance & notification (AVV-Querverweis)

- Verarbeitung nur auf dokumentierte Weisung der Hochschule. / Processing only on the university's documented instructions.
- Unterstützung bei Betroffenenrechten (Art. 12–22) und bei Art. 32–36. / Assistance with data-subject rights and Art. 32–36.
- **Verletzungsmeldung Verarbeiter→Verantwortliche unverzüglich** (Pfad/Frist im AVV; siehe geplantes Breach-Runbook). / **Breach notification processor→controller without undue delay** (path/timeline in the DPA; see planned breach runbook).
- Art. 8 (Minderjährige): Verantwortung für die Einwilligungs-/Alterslage liegt bei der Hochschule (SSO-vermittelt); im AVV ausdrücklich zuzuweisen. / Art. 8 allocation to the university (SSO-mediated); assign expressly in the DPA.

---

## Anhang 1 — Empfänger / Sub-Auftragsverarbeiter (Scholar-relevant) / Annex 1 — Recipients / sub-processors (Scholar-relevant)

> **DE.** Maßgeblich ist das gepflegte Register `src/app/legal/sub-processors/_content/sub-processors-data.ts` (Single Source of Truth, öffentlich unter `/legal/sub-processors`). Die folgende Tabelle ist die **Scholar-Teilmenge** mit Stand {{DATE}}. Bei Änderung: 30-Tage-Vorabinformation (AVV § 10) und Aktualisierung **beider** Quellen.
>
> **EN.** The maintained register `…/sub-processors-data.ts` is the single source of truth (public at `/legal/sub-processors`). Below is the **Scholar subset** as of {{DATE}}. On change: 30-day advance notice and update **both** sources.

| Anbieter / Provider                            | Rolle / Role                                        | Zweck (Scholar) / Purpose                                                                     | Datenstandort / Location        | Transfer                                       | Scholar-relevant?                                                   |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Vercel Inc.** (US)                           | Hosting/Edge, Build, Serverless, AI-Gateway-Routing | Auslieferung der Scholar-App; dynamische Requests bevorzugt EU (fra1, cdg1)                   | USA + EU-Edge (fra1/cdg1)       | DPF + SCC Modul 3                              | **Ja / Yes**                                                        |
| **Neon Inc.** (US)                             | Managed PostgreSQL                                  | Persistenz aller Scholar-Daten (Konto, Präferenzen, Historie, Listen, Logs)                   | **EU eu-central-1 (Frankfurt)** | EU-Verarbeitung; US-Admin via SCC              | **Ja / Yes**                                                        |
| **Upstash Inc.** (US)                          | Rate-Limiting / Cache                               | Rate-Limits + kurzlebige Session-/MFA-Token (TTL < 24h)                                       | EU eu-west-1 (Dublin)           | EU-Verarbeitung; DPF + SCC                     | **Ja / Yes**                                                        |
| **OpenAI, L.L.C.** (US)                        | KI-Embeddings                                       | Vektor-Embeddings für die opt-in-Semantiksuche; **via Vercel AI Gateway** (Sub-Sub-Processor) | USA                             | DPF + SCC + Zero-Data-Retention                | **Ja / Yes** (nur bei opt-in)                                       |
| **Resend Inc.** (US)                           | Transaktionale E-Mail                               | Login-Links/Benachrichtigungen (sofern E-Mail-basiert)                                        | USA + EU-Edge                   | SCC Modul 3; optional EU-Datenhaltung          | **Ja / Yes** (sofern E-Mail genutzt)                                |
| **Sentry / Functional Software Inc.** (US)     | Fehler-/Performance-Monitoring                      | Laufzeitfehler-Erfassung mit PII-Scrubbing                                                    | EU (Frankfurt), US-Fallback     | SCC Modul 3                                    | **Ja / Yes**                                                        |
| **Google / Apple** (US)                        | SSO-Identitätsanbieter (OAuth)                      | Authentifizierung bei "Continue with Google/Apple"; jeweils **eigener Verantwortlicher**      | USA                             | DPF/SCC der Anbieter; eigener Verantwortlicher | **Ja / Yes** (sofern OAuth genutzt)                                 |
| **LogSnag** (CA)                               | Geschäftsereignis-Monitoring (Server)               | Operator-Alerting; **keine** PII-Klartextfelder                                               | Kanada                          | EU-Angemessenheitsbeschluss (Kanada) + SCC     | Teilweise / Partial [TBD: prüfen, ob Scholar-Events erfasst werden] |
| **Vercel Web Analytics / Speed Insights** (US) | Analytik/Performance (cookielos)                    | Aggregierte Statistik **nur nach Einwilligung**                                               | USA + EU-Edge                   | DPF + SCC                                      | Optional (consent-gated)                                            |

**Nicht im Scholar-Datenfluss (plattformweit, aber Scholar ist kostenlos / lädt keine Dateien hoch):** Stripe (Zahlungen), Cloudflare R2 (Objektspeicher), Anthropic (LLM-Inferenz für Astra/Atlas-Chat/Generate — Scholar nutzt nur OpenAI-Embeddings, **keine** generative LLM-Ausgabe). [TBD: bestätigen, dass keine Scholar-Funktion Anthropic aufruft.] / **Not in Scholar's data flow** (platform-wide; Scholar is free and uploads no files): Stripe, Cloudflare R2, Anthropic. [TBD: confirm no Scholar feature calls Anthropic.]

---

## Anhang 2 — Drittlandübermittlungen / Annex 2 — Third-country transfers (Art. 30(1)(e) / (2)(c))

| Empfänger / Recipient | Drittland / Third country | Mechanismus / Mechanism                             | Ergänzende Maßnahmen / Supplementary measures                      |
| --------------------- | ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Vercel (Mutter)       | USA                       | EU-US DPF (zertifiziert) + SCC Modul 3              | EU-Edge-Regionen bevorzugt; Verschlüsselung in Transit/at-rest     |
| Neon (Admin-Zugriff)  | USA                       | SCC Modul 3 (Verarbeitung in EU Frankfurt)          | Daten ruhen in der EU; nur Verwaltungszugriff aus US               |
| Upstash (Support)     | USA                       | DPF + SCC Modul 3 (Verarbeitung in EU Dublin)       | Kurzlebige TTLs; EU-Datenhaltung                                   |
| OpenAI                | USA                       | EU-US DPF + SCC + Zero-Data-Retention               | Routing über Vercel AI Gateway; nur Anfragetext; keine Speicherung |
| Resend                | USA                       | SCC Modul 3 (optional EU-Datenhaltung)              | Minimaler Inhalt; keine dauerhafte Speicherung bei Caelex          |
| Sentry                | USA (Fallback)            | SCC Modul 3 (primär EU Frankfurt)                   | PII-Scrubbing vor Übertragung                                      |
| LogSnag               | Kanada                    | Angemessenheitsbeschluss (Decision 2002/2/EG) + SCC | Keine PII-Klartextfelder                                           |
| Google/Apple (OAuth)  | USA                       | DPF/SCC der Anbieter (eigene Verantwortliche)       | SSO-vermittelt; Caelex erhält nur Name/E-Mail                      |

> **Transfer-Folgenabschätzung (TIA):** Eine Scholar-spezifische TIA mit ergänzenden Maßnahmen ist noch zu erstellen und durch Rechtsberatung zu bestätigen (Spec G21). / A Scholar-specific TIA with supplementary measures is still to be drafted and confirmed by counsel (spec G21). **[TBD: counsel.]**

---

## Anhang 3 — Technische & organisatorische Maßnahmen (TOM) / Annex 3 — Technical & organisational measures (Art. 32)

> Identisch zu den als AVV-Anlage beizufügenden TOMs. / Same as the TOMs to be attached to the DPA.

**Vertraulichkeit / Confidentiality**

- AES-256-GCM-Feldverschlüsselung (scrypt-Schlüsselableitung) für sensible Felder. / AES-256-GCM field encryption.
- bcrypt(12) für Passwort-Hashes; MFA (TOTP) + WebAuthn/FIDO2. / bcrypt(12); MFA + WebAuthn.
- Rollenbasierte Zugriffskontrolle (RBAC); serverseitige Secrets (keine im Client). / RBAC; server-only secrets.
- IP-Maskierung (`maskIp()`) in Logs; gehashte/gekürzte IP in `ConsentRecord`. / IP masking; hashed/truncated IP.

**Integrität / Integrity**

- Manipulationsresistente Audit-Hash-Kette (SHA-256-Verkettung). / Hash-chained audit log.
- Eingabevalidierung (Zod); CSRF-Schutz (Origin-Prüfung + Token). / Input validation; CSRF protection.

**Verfügbarkeit & Belastbarkeit / Availability & resilience**

- Neon Backups + Point-in-Time-Recovery (EU Frankfurt). / Backups + PITR (EU).
- Rate-Limiting (Upstash; Scholar-Tier) + Brute-Force-Sperre. / Rate limiting + brute-force lockout.
- CSP-Nonces, HSTS (2-Jahres-Preload), X-Frame-Options DENY, Permissions-Policy. / CSP/HSTS/security headers.

**Verfahren zur regelmäßigen Überprüfung / Regular testing**

- Anomalie-Erkennung; Sicherheits-Audit-Log; CI-Sicherheitsscans (CodeQL, Secret-Scanning, OWASP-Dependency-Checks). / Anomaly detection; CI security scans.
- E2E-Accessibility- und Sicherheitstests. / E2E a11y + security tests.

**Datenminimierung & Privacy-by-default / Minimisation & privacy-by-default (Art. 25)**

- `semanticSearch` und `searchHistoryEnabled` **standardmäßig AUS** (Opt-in). / Both toggles **default OFF**.
- Merk-/Leselisten privat per Standard. / Bookmarks/lists private by default.
- 90-Tage-Sweep der Suchhistorie; Self-Service-Löschung kaskadiert alle Scholar-Tabellen; vollständiger Datenexport (Konto, Präferenzen, Historie, Merk-/Leselisten). / 90-day sweep; cascading self-service erasure; complete data export.

---

## Änderungshistorie / Change log

| Version | Stand / Date | Änderung / Change                                                                                                                                                                                                      | Autor / Author   |
| ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1     | {{DATE}}     | Erstentwurf (Controller- + Processor-Record), grounded in Live-Code (`feat/caelex-scholar`). Lawyer-Review ausstehend. / Initial draft (controller + processor records), grounded in live code. Pending lawyer review. | Claude (Entwurf) |

> **Offene Punkte (Zusammenfassung) / Open items (summary):** DSB-Benennung (A.0); Aufbewahrungsfristen `LoginEvent` & `ConsentRecord` (A.4/A.7); Scholar-spezifische TIA (Anhang 2); finale Rechtsgrundlage Semantiksuche (A.3); Bestätigung, dass Anthropic/Stripe/R2 nicht im Scholar-Datenfluss liegen (Anhang 1); Pro-Hochschule-Felder in Teil B. **Alle [TBD]-Marker durch Rechtsberatung klären.** / Resolve all [TBD] markers with counsel.
