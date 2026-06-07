# Controller / Processor Rollen-Zuordnung (RACI) — Caelex Scholar / Role Allocation per Processing Activity

> ╔══════════════════════════════════════════════════════════════════════════╗
> ║ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung ║
> ║ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. **Keine** ║
> ║ **Rechtsberatung.** / Template; must be reviewed and adapted by qualified ║
> ║ legal counsel before publication or execution. **Not legal advice.** ║
> ╚══════════════════════════════════════════════════════════════════════════╝

|                                             |                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| **Dokument / Document**                     | Controller/Processor RACI per processing activity — Caelex Scholar              |
| **Status**                                  | ENTWURF / DRAFT — lawyer review required                                        |
| **Version**                                 | 0.1 (Entwurf / Draft)                                                           |
| **Stand / Last updated**                    | 7 June 2026                                                                     |
| **Verbindliche Sprache / Binding language** | Deutsch (binding); English convenience translation                              |
| **Maßgebliche Spec / Source spec**          | `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` (G1)     |
| **Zugehörig / Related**                     | Anlage 4 zum `university-avv-art28.md`; ergänzt durch `dpo-appointment-note.md` |

---

## 1. Zweck und Methodik / Purpose and method

(DE) Dieses Dokument ordnet **jede Verarbeitungstätigkeit** im Dienst Caelex Scholar einer datenschutzrechtlichen **Rolle** zu (Verantwortlicher / Auftragsverarbeiter / gemeinsam Verantwortliche), benennt die **Rechtsgrundlage** und verteilt die operativen Verantwortlichkeiten nach dem **RACI-Schema**. Es ist die Grundlage für den AVV (B2B2C-Modell) und stellt klar, **wo Caelex Auftragsverarbeiter und wo Caelex eigener Verantwortlicher** ist (Dual Role).

(EN) This document maps **each processing activity** in Caelex Scholar to a data-protection **role** (controller / processor / joint controllers), states the **lawful basis**, and distributes operational responsibility using **RACI**. It underpins the AVV (B2B2C) and clarifies **where Caelex is a processor vs. an independent controller** (dual role).

### RACI-Legende / RACI legend

- **R — Responsible / Durchführend:** führt die Tätigkeit operativ aus.
- **A — Accountable / Rechenschaftspflichtig:** trägt die datenschutzrechtliche Letztverantwortung (in der DSGVO i.d.R. = „Verantwortlicher").
- **C — Consulted / Konsultiert:** wird vor der Durchführung eingebunden.
- **I — Informed / Informiert:** wird über das Ergebnis informiert.

### Rollen-Legende / Role legend

- **U** = Universität / University (Verantwortlicher / controller im B2B2C-Modell).
- **C** = Caelex (Auftragsverarbeiter _oder_ eigener Verantwortlicher, je Tätigkeit / processor _or_ independent controller, per activity).
- **DS** = Betroffene Person / Data subject (Studierende/Mitarbeitende).

> **Grundregel (load-bearing):** Für den **vertraglich gebuchten Scholar-Dienst** ist die **Universität Verantwortliche** und **Caelex Auftragsverarbeiter**. Für **eigene Zwecke** von Caelex (Produktsicherheit, Missbrauchsabwehr, gesetzliche Pflichten, eigene KI-/Modell- und Korpus-Entscheidungen, Plattform-Telemetrie/Fehler-Monitoring) ist **Caelex eigener Verantwortlicher**. Diese Zweispurigkeit ist im EDPB-Leitfaden 07/2020 anerkannt. [TBD: counsel bestätigt jede Einzelzuordnung.]

---

## 2. Rollen-Matrix pro Verarbeitungstätigkeit / Role matrix per processing activity

| #   | Verarbeitungstätigkeit / Processing activity                                                       | Datenrolle / Data-protection role                                                  | Rechtsgrundlage (Vorschlag) / Lawful basis (proposed)                                     | U   | C   | DS  |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --- | --- | --- |
| P1  | **Kontoerstellung & SSO-Authentifizierung** (Name, E-Mail) / Account + SSO auth                    | Universität = Verantwortliche; Caelex = AV / U controller, C processor             | Art. 6(1)(b) (Nutzungsvertrag) bzw. Art. 6(1)(e)/öffentliche Aufgabe der Hochschule       | A   | R   | I   |
| P2  | **Nutzer-Voreinstellungen speichern** (`ScholarUserPreferences`) / Preferences                     | U Verantwortliche; C = AV                                                          | Art. 6(1)(b) (Dienst-Funktion)                                                            | A   | R   | C   |
| P3  | **Volltext-/Stichwortsuche im Korpus** / Keyword search                                            | U Verantwortliche; C = AV                                                          | Art. 6(1)(b) (Kernfunktion)                                                               | A   | R   | I   |
| P4  | **Semantische Suche (KI-Embeddings)** — _opt-in_ / Semantic search                                 | U Verantwortliche; C = AV                                                          | Art. 6(1)(a) **Einwilligung** (opt-in; default OFF) — alternativ Art. 6(1)(b) [TBD]       | A   | R   | C   |
| P5  | **Recherche-Verlauf** (`ScholarSearchHistory`) — _opt-in_ / Search history                         | U Verantwortliche; C = AV                                                          | Art. 6(1)(a) **Einwilligung** (opt-in; default OFF; 90-Tage-Retention)                    | A   | R   | C   |
| P6  | **Merklisten / Bookmarks** (`ScholarBookmark`)                                                     | U Verantwortliche; C = AV                                                          | Art. 6(1)(b) (Dienst-Funktion)                                                            | A   | R   | C   |
| P7  | **Leselisten** (`ScholarReadingList(+Item)`)                                                       | U Verantwortliche; C = AV                                                          | Art. 6(1)(b) (Dienst-Funktion)                                                            | A   | R   | C   |
| P8  | **Datenexport (Art. 15/20)** Self-Service                                                          | U Verantwortliche (Pflichtenträger); C = AV (Tooling)                              | Art. 15, 20 (Betroffenenrecht); Verarbeitung Art. 6(1)(c)                                 | A   | R   | C   |
| P9  | **Selbstlöschung (Art. 17)** Self-Service (Kaskade)                                                | U Verantwortliche; C = AV (Tooling)                                                | Art. 17 (Betroffenenrecht); Verarbeitung Art. 6(1)(c)                                     | A   | R   | C   |
| P10 | **Login-/Sicherheits-Logging** (maskierte IP, `LoginEvent`)                                        | **Caelex = eigener Verantwortlicher** / C independent controller                   | Art. 6(1)(f) **berechtigtes Interesse** (Sicherheit/Missbrauchsabwehr) — LIA erforderlich | C   | A·R | I   |
| P11 | **Rate-Limiting / Brute-Force-Abwehr** (Upstash)                                                   | Caelex = eigener Verantwortlicher                                                  | Art. 6(1)(f) (Sicherheit); ggf. Art. 32                                                   | I   | A·R | I   |
| P12 | **Fehler-/Performance-Monitoring** (Sentry, PII-Scrubbing)                                         | Caelex = eigener Verantwortlicher                                                  | Art. 6(1)(f) (Betriebssicherheit)                                                         | I   | A·R | I   |
| P13 | **Cookieless Web-Analytics / Speed Insights** (Vercel) — _nur nach Einwilligung_                   | Caelex = eigener Verantwortlicher (Reichweite)                                     | Art. 6(1)(a) + **§ 25 TDDDG** (Endeinrichtungs-Einwilligung)                              | I   | A·R | C   |
| P14 | **Geschäftsereignis-Monitoring** (LogSnag, server-only)                                            | Caelex = eigener Verantwortlicher                                                  | Art. 6(1)(f) (Betrieb/Alerting)                                                           | I   | A·R | I   |
| P15 | **Korpus-Aufbau & Embedding-Erzeugung (TDM)** — _betrifft Korpus-Texte, i.d.R. kein Personenbezug_ | Caelex = eigener Verantwortlicher (Produkt)                                        | §§ 44b/60d UrhG (TDM); kein Art.-6-Bezug, soweit keine personenbez. Daten                 | —   | A·R | —   |
| P16 | **Transaktionale E-Mail** (Resend; z.B. Login-Link)                                                | gemischt: P1-bezogen U=Verantwortliche/C=AV; sicherheitsbezogen C=Verantwortlicher | Art. 6(1)(b) bzw. Art. 6(1)(f)                                                            | C   | R   | I   |
| P17 | **KI-Transparenzhinweis (Art. 50 AI Act)** in der Such-UI                                          | U Verantwortliche (Information ggü. Nutzern); C = Umsetzer                         | AI Act Art. 50 (ab 2 Aug 2026); flankiert Transparenz Art. 12–13                          | A   | R   | I   |
| P18 | **Erfüllung gesetzlicher Pflichten von Caelex** (z.B. Impressum, Behördenauskünfte)                | Caelex = eigener Verantwortlicher                                                  | Art. 6(1)(c)                                                                              | I   | A·R | I   |

> **Hinweis zu „gemeinsam Verantwortliche" (Art. 26):** Nach derzeitiger Einschätzung liegt **keine** gemeinsame Verantwortlichkeit vor — die Universität bestimmt Zweck/Mittel des gebuchten Dienstes; Caelex handelt insoweit weisungsgebunden, im Übrigen für klar abgegrenzte **eigene** Zwecke. Sollte sich aus der Vertragsgestaltung eine gemeinsame Zweck-/Mittelbestimmung ergeben, ist eine Art.-26-Vereinbarung erforderlich. [TBD: counsel prüft, ob einzelne Tätigkeiten (z.B. P13 Analytics) eine Art.-26-Konstellation begründen.]

---

## 3. Verantwortlichkeiten bei Betroffenenrechten & Pflichten / Responsibility for DSR & duties

| Pflicht / Duty                                             | Universität (U)                                                                                                     | Caelex (C)                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transparenz/Information (Art. 12–14)** ggü. Studierenden | **A** — stellt die kontrollerseitige Information bereit; verlinkt die Scholar-Datenschutzerklärung beim SSO-Sign-up | **R/C** — liefert die produktbezogene Datenschutzerklärung (Inhalt, kindgerechte Schicht), informiert U bei Änderungen                                        |
| **Auskunft/Export (Art. 15/20)**                           | **A** — beantwortet Anträge                                                                                         | **R** — Self-Service-Export + Weiterleitung direkt an C gerichteter Anträge an U                                                                              |
| **Berichtigung (Art. 16)**                                 | **A**                                                                                                               | **R** — editierbare Profile/Voreinstellungen                                                                                                                  |
| **Löschung (Art. 17)**                                     | **A**                                                                                                               | **R** — Self-Service-Löschung (Kaskade über alle Scholar-Tabellen)                                                                                            |
| **Einschränkung/Widerspruch (Art. 18/21)**                 | **A**                                                                                                               | **C** — technische Umsetzung auf Weisung                                                                                                                      |
| **Einwilligungsverwaltung (Art. 7; Art. 8 Minderjährige)** | **A** — sichert Wirksamkeit der Einwilligung, ggf. elterliche Zustimmung                                            | **R** — opt-in-Defaults (semantische Suche/Verlauf OFF), Toggle-UI, Just-in-time-Hinweise                                                                     |
| **Sicherheit (Art. 32)**                                   | **C**                                                                                                               | **A·R** — TOMs (Anlage 2 AVV)                                                                                                                                 |
| **Breach-Notification (Art. 33/34)**                       | **A** — meldet an Aufsichtsbehörde/Betroffene                                                                       | **R** — meldet an U unverzüglich (Ziel ≤24h), führt Register, unterstützt                                                                                     |
| **DSFA (Art. 35)**                                         | **A·R** — führt DSFA durch (minderjährige + KI + Verlauf → wahrscheinlich pflichtig)                                | **C** — liefert Produkt-/TOM-/Sub-Prozessor-Infos                                                                                                             |
| **Vorherige Konsultation (Art. 36)**                       | **A·R**                                                                                                             | **C**                                                                                                                                                         |
| **Verzeichnis von Verarbeitungstätigkeiten (Art. 30)**     | **A·R** Art. 30(1) (Verantwortliche)                                                                                | **A·R** Art. 30(2) (Auftragsverarbeiter)                                                                                                                      |
| **DPO/DSB (Art. 37–39; BDSG §38)**                         | **A·R** — eigener behördlicher DSB der Hochschule                                                                   | **A·R** — eigene DSB-Prüfung/Benennung (siehe `dpo-appointment-note.md`)                                                                                      |
| **Sub-Prozessor-Steuerung (Art. 28(4))**                   | **C/I** — Genehmigung + Widerspruchsrecht                                                                           | **A·R** — Flow-through, 30-Tage-Vorab-Notice                                                                                                                  |
| **Internationale Transfers (Kap. V) + TIA**                | **C/I**                                                                                                             | **A·R** — SCC/DPF, ergänzende Maßnahmen, TIA                                                                                                                  |
| **AI-Act-Transparenz (Art. 50)**                           | **A** ggü. Nutzern                                                                                                  | **R** — UI-Hinweis + ARIA; **A·R** für die nicht-hochrisiko-Einordnung als Anbieter [TBD: Rollen-Schnitt Anbieter/Betreiber im Sinne der AI-Act-VO — counsel] |

---

## 4. Offene Punkte / Open items (counsel)

1. **[TBD]** Bestätigung der **Rechtsgrundlagen** je Tätigkeit (insb. P1: Vertrag vs. öffentliche Aufgabe der Hochschule; P4 semantische Suche: Einwilligung vs. Vertrag) und Erstellung der **LIAs** für die berechtigten-Interessen-Verarbeitungen (P10–P12, P14) — vgl. Spec G3.
2. **[TBD]** Prüfung, ob einzelne Tätigkeiten eine **gemeinsame Verantwortlichkeit (Art. 26)** begründen (v.a. P13 Analytics).
3. **[TBD]** **AI-Act-Rollen** (Anbieter „provider" vs. Betreiber „deployer") für Scholar bzw. die Universität — Auswirkung auf P17/Art. 50-Pflichten.
4. **[TBD]** **Google-OAuth-Status** (P1): in den FACTS genannt, im Sub-Prozessor-Register-Code aber nicht gelistet — Rolle und Transfermechanismus klären (siehe AVV Anlage 3).
5. **[TBD]** Bestätigung der **Art.-8-Strategie** für minderjährige Nutzer (Einwilligungs-Defaults OFF, keine Über-Erhebung; Zuordnung an U) — vgl. Spec G17.

---

_Ende des Entwurfs / End of draft. Diese RACI ist als Anlage 4 in den AVV einzubeziehen und vor Unterzeichnung mit qualifizierter Rechtsberatung zu prüfen. / Incorporate as AVV Annex 4; review with counsel before execution._
