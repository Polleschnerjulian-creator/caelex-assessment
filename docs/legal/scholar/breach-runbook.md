> ┌─────────────────────────────────────────────────────────────────────────┐
> │ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung │
> │ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine │
> │ Rechtsberatung. / Template; must be reviewed and adapted by qualified │
> │ legal counsel before publication or execution. Not legal advice. │
> └─────────────────────────────────────────────────────────────────────────┘

# Runbook: Verletzung des Schutzes personenbezogener Daten — Caelex Scholar

# Personal-Data-Breach Runbook — Caelex Scholar

**Rechtsgrundlage / Legal basis:** Art. 4 Nr. 12, Art. 33, Art. 34 DSGVO / GDPR · EDSA-Leitlinien 9/2022 (Meldung von Verletzungen) · EDSA-Leitlinien 01/2021 (Beispiele) · BDSG
**Stand / Last updated:** 7 June 2026
**Version:** 0.1 (Entwurf / Draft)
**Verbindliche Sprache / Binding language:** Deutsch; Englisch ist eine Arbeitsübersetzung.

> **Geltungsbereich.** Dieses Runbook gilt für Verletzungen, die **Caelex-Scholar-Daten** betreffen. Wegen der **B2B2C-Doppelrolle** (Hochschule = Verantwortlicher; Caelex = Auftragsverarbeiter **und** eigener Verantwortlicher) enthält es **zwei Meldepfade**: (A) Caelex **als Auftragsverarbeiter** → unverzügliche Meldung an die **Hochschule (Verantwortliche)**; (B) Caelex **als eigener Verantwortlicher** (Sicherheits-/Produkt-/KI-Eigendaten) → ggf. 72-h-Meldung an die **Aufsichtsbehörde**. Welcher Pfad greift, hängt von der betroffenen Verarbeitung ab (Abschnitt 3). [TBD: finale Rollen-/Pfad-Zuordnung mit Anwalt + im AVV G2/G1.]

---

## DE — Verbindliche Fassung

### 1. Definition und Auslöser

Eine **Verletzung des Schutzes personenbezogener Daten** (Art. 4 Nr. 12) ist eine Verletzung der Sicherheit, die zur **Vernichtung, zum Verlust, zur Veränderung** oder zur **unbefugten Offenlegung von / zum unbefugten Zugang zu** personenbezogenen Daten führt — ob versehentlich oder unrechtmäßig. Erfasst sind die drei klassischen Typen:

- **Vertraulichkeitsverletzung** (unbefugte Offenlegung/Zugang),
- **Integritätsverletzung** (unbefugte Veränderung),
- **Verfügbarkeitsverletzung** (Verlust/Vernichtung/Nichtverfügbarkeit, auch temporär).

**Beispielhafte Scholar-Auslöser:** Konto-Übernahme (Credential Stuffing), Exfiltration aus der Datenbank, fehlerhafte Zugriffsrechte (IDOR) auf Bookmarks/Leselisten/Historie, versehentlicher Export an die falsche Person, kompromittierter Sub-Prozessor (Vercel/Neon/OpenAI/Resend/Upstash/Sentry), Ransomware/Datenverlust, **unzulässige Behördenanordnung** mit Datenzugriff, fehlgeleitete E-Mail mit personenbezogenem Inhalt.

> **Honey-Token-/Anomalie-Hinweis (verifiziert vorhandene Infrastruktur):** Die Plattform verfügt über hash-verkettete Audit-Logs, Anomalie-Erkennung und Honey-Tokens. Auslösen eines Honey-Tokens oder eine Audit-Ketten-Anomalie ist als **Verdachtsfall** in diesen Workflow einzuspeisen.

---

### 2. Rollen und Verantwortlichkeiten

| Rolle                                | Person/Funktion                 | Aufgabe im Vorfall                                                         |
| ------------------------------------ | ------------------------------- | -------------------------------------------------------------------------- |
| **Incident Lead / Verantwortlicher** | Inhaber (Julian Polleschner)    | Gesamtverantwortung, Risikoentscheidung, Behörden-/Betroffenen-Meldung     |
| **Datenschutzkoordination / DSB**    | [TBD: DSB benannt? siehe G15]   | Bewertung Meldepflicht, Behördenkontakt, Register                          |
| **Technische Untersuchung**          | Engineering (Caelex)            | Eindämmung, Forensik, Scope-Bestimmung, Beweissicherung (Audit-Hash-Chain) |
| **Kommunikation**                    | Incident Lead / `cs@caelex.eu`  | Betroffenen- und Hochschul-Kommunikation                                   |
| **Hochschul-Schnittstelle**          | benannter Kontakt je Hochschule | Empfänger der Auftragsverarbeiter-Meldung (Pfad A)                         |

**Kontakt-Postfächer (verifiziert im Impressum):** `security@caelex.eu` (Sicherheit/Intake), `privacy@caelex.eu` (Datenschutz), `legal@caelex.eu` (Recht/Behörden), `abuse@caelex.eu` (Missbrauch), `cs@caelex.eu` (Nutzer/SPOC).
**Zuständige Aufsichtsbehörde (Caelex als Verantwortlicher):** **Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI)**, da Caelex in Berlin niedergelassen ist. [TBD: Behörde + Meldeportal/-formular bestätigen.]

---

### 3. Workflow: Erkennen → Bewerten → Melden (72 h) → Betroffene benachrichtigen

#### Phase 0 — Erkennen & Aufnahme (sofort)

1. **Intake** über `security@caelex.eu` oder Monitoring-Alert (Sentry/Anomalie/Honey-Token) oder Sub-Prozessor-Meldung.
2. **Vorfall-ID vergeben** und im **Breach-Register** (Abschnitt 5) anlegen — **Zeitstempel des Bekanntwerdens** festhalten (startet die 72-h-Uhr nach Art. 33 Abs. 1, sobald Verantwortlicher Kenntnis erlangt).
3. **Incident Lead + DSB alarmieren.**

> **Wichtig zur 72-h-Uhr:** Die Frist beginnt mit der **Kenntnis** des **Verantwortlichen**. Erfährt **Caelex als Auftragsverarbeiter** von einer Verletzung, ist die Hochschule **unverzüglich** zu informieren (Art. 33 Abs. 2) — ohne eigene 72-h-Frist; die Frist läuft dann **bei der Hochschule**.

#### Phase 1 — Eindämmen & Untersuchen (Stunden 0–24)

4. **Eindämmen:** betroffene Sessions/Schlüssel widerrufen, Zugänge sperren, ggf. Funktion/Endpunkt temporär deaktivieren, Passwort-Resets erzwingen.
5. **Scope bestimmen:** Welche Verarbeitung? (Scholar-Kontodaten / Präferenzen / Suchhistorie / Bookmarks / Leselisten / Login-Ereignisse). **Pfad A oder B?** (Auftragsverarbeiter-Daten der Hochschule → A; Caelex-Eigendaten → B). Anzahl Betroffener, Datenkategorien, ob besondere Kategorien faktisch betroffen (z. B. sensible Suchanfragen).
6. **Beweissicherung:** relevante Audit-Log-Einträge (hash-verkettet), Zeitachsen, Sub-Prozessor-Korrespondenz sichern.

#### Phase 2 — Risikobewertung (Stunden 0–48)

7. **Risiko für Rechte und Freiheiten** einstufen (EDSA 9/2022): Art/Sensitivität der Daten, Identifizierbarkeit, Schweregrad, Zahl der Betroffenen, Dauerhaftigkeit, **Schutzbedürftigkeit (Minderjährige!)**. Verschlüsselung/Pseudonymisierung mindern das Risiko (z. B. AES-256-GCM-Felder, maskierte IP).
8. **Entscheidung Meldepflicht:**
   - **Behörde (Art. 33):** Meldung **außer** wenn die Verletzung **„voraussichtlich nicht zu einem Risiko"** führt.
   - **Betroffene (Art. 34):** Benachrichtigung **nur** bei **„voraussichtlich hohem Risiko"** — entfällt u. a., wenn wirksame Verschlüsselung griff oder nachträgliche Maßnahmen das hohe Risiko ausräumen.
   - **Begründung dokumentieren** (auch bei Nicht-Meldung — Rechenschaftspflicht Art. 5 Abs. 2).

#### Phase 3 — Melden

9. **Pfad A (Caelex = Auftragsverarbeiter):** **unverzügliche** Meldung an die **Hochschule** (Verantwortliche) mit allen Informationen aus Phase 1–2; die Hochschule entscheidet über Behörden-/Betroffenenmeldung. (Caelex unterstützt.)
10. **Pfad B (Caelex = Verantwortlicher):** **Meldung an die BlnBDI binnen 72 h** ab Kenntnis. Inhalt (Art. 33 Abs. 3): Art der Verletzung, (soweit möglich) Kategorien/Zahl Betroffener und Datensätze, Name/Kontakt DSB/Kontaktstelle, wahrscheinliche Folgen, ergriffene/vorgeschlagene Maßnahmen. **Stufenweise Meldung** zulässig, wenn nicht alles binnen 72 h vorliegt; **Verspätung begründen.**
11. **Sub-Prozessor-Dimension:** Liegt die Ursache bei einem Sub-Prozessor, dessen DPA-Meldepflichten und SCC-Behördenanfrage-Klauseln aktivieren; Korrespondenz ins Register.

#### Phase 4 — Betroffene benachrichtigen (bei hohem Risiko)

12. **Benachrichtigung der betroffenen Personen** in **klarer, einfacher Sprache** (Art. 34 Abs. 2) — **kinderfreundlich**, da die Kohorte Minderjährige enthalten kann: Beschreibung der Verletzung, Name/Kontakt der Anlaufstelle, wahrscheinliche Folgen, ergriffene Maßnahmen, Handlungsempfehlungen (z. B. Passwortwechsel). Kanal: In-App-Hinweis und/oder E-Mail (Resend). Bei unverhältnismäßigem Aufwand: **öffentliche Bekanntmachung** als Ersatz.

#### Phase 5 — Abschluss & Lessons Learned

13. **Register vervollständigen**, Maßnahmen-Wirksamkeit prüfen, präventive TOMs ableiten, ggf. **DSFA aktualisieren** (`dpia.md`), Vorfall mit DSB/Anwalt nachbesprechen.

---

### 4. Entscheidungs-Schnellreferenz

| Situation                                                                               | Behörde melden?                                          | Betroffene benachrichtigen?                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Verschlüsselte Daten exfiltriert, Schlüssel sicher (AES-256-GCM-Felder)                 | i. d. R. **nein** (kein/geringes Risiko) — dokumentieren | **nein**                                                         |
| Suchhistorie/Leselisten einzelner Nutzer unbefugt offengelegt (sensible Themen denkbar) | **ja** (Risiko)                                          | **abhängig** — bei sensiblen Inhalten/Minderjährigen eher **ja** |
| Konto-Übernahme einzelner Nutzer                                                        | **ja** (Risiko)                                          | **ja** (Handlungsbedarf: Passwortwechsel)                        |
| Vorübergehender DB-Ausfall, keine Offenlegung, schnelle Wiederherstellung               | **abhängig** (Verfügbarkeit) — i. d. R. dokumentieren    | i. d. R. **nein**                                                |
| Massendaten-Exfiltration (Konto + Historie)                                             | **ja**                                                   | **ja** (hohes Risiko)                                            |

> Hinweis: Diese Tabelle ist eine **Heuristik**, kein Ersatz für die Einzelfallbewertung nach EDSA 9/2022. [TBD: durch DSB/Anwalt validieren.]

---

### 5. Breach-Register (Vorlage; Art. 33 Abs. 5 — Dokumentationspflicht **aller** Verletzungen, auch der nicht gemeldeten)

| Feld                                | Inhalt                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| **Vorfall-ID**                      | z. B. `SCH-BR-{{JJJJ}}-NNN`                                                    |
| **Bekannt geworden am/um**          | Datum + Uhrzeit (startet 72-h-Uhr bei Verantwortlichen)                        |
| **Entdeckt durch**                  | Monitoring / Nutzer / Sub-Prozessor / Honey-Token / Behörde                    |
| **Rolle Caelex**                    | Auftragsverarbeiter (Pfad A) / Verantwortlicher (Pfad B)                       |
| **Betroffene Verarbeitung**         | Konto / Präferenzen / Suchhistorie / Bookmarks / Leselisten / Login-Ereignisse |
| **Typ**                             | Vertraulichkeit / Integrität / Verfügbarkeit                                   |
| **Datenkategorien**                 | … (inkl. ob faktisch sensible Inhalte)                                         |
| **Betroffene (Zahl/Schätzung)**     | … (davon Minderjährige? [TBD je Fall])                                         |
| **Ursache**                         | Angriff / Fehlkonfiguration / Sub-Prozessor / menschlicher Fehler              |
| **Eindämmungsmaßnahmen**            | … (Zeitstempel)                                                                |
| **Risikobewertung**                 | kein / Risiko / hohes Risiko — **mit Begründung**                              |
| **Behörde gemeldet?**               | ja/nein + Datum/Uhrzeit + Aktenzeichen / **Begründung bei Nein**               |
| **Hochschule informiert? (Pfad A)** | ja/nein + Datum/Uhrzeit + Empfänger                                            |
| **Betroffene benachrichtigt?**      | ja/nein + Datum + Kanal / Begründung                                           |
| **Sub-Prozessor-Korrespondenz**     | Referenzen                                                                     |
| **Abschluss / Lessons Learned**     | Maßnahmen, DSFA-Update, Owner, Datum                                           |

---

### 6. Fazit

Dieses Runbook stellt sicher, dass Scholar-Verletzungen **erkannt, bewertet, fristgerecht gemeldet** und **alle Vorfälle dokumentiert** werden (Art. 33 Abs. 5). Vor Inkraftsetzung sind zu klären: **DSB-Benennung** (G15), **zuständige Aufsichtsbehörde + Meldeportal**, **AVV-Meldepfad Proc→Hochschule** (G2), und die **Rollen-/Pfad-Zuordnung** je Verarbeitung (G1). **[TBD: durch qualifizierte Rechtsberatung zu prüfen und freizugeben.]**

---

## EN — Convenience translation (non-binding)

### 1. Definition and triggers

A **personal-data breach** (Art. 4(12)) is a security breach leading to the **destruction, loss, alteration** or **unauthorised disclosure of / access to** personal data, whether accidental or unlawful — covering the three types: **confidentiality** (unauthorised disclosure/access), **integrity** (unauthorised alteration), **availability** (loss/destruction/unavailability, including temporary). **Example Scholar triggers:** account takeover (credential stuffing), database exfiltration, broken access control (IDOR) on bookmarks/reading lists/history, accidental export to the wrong person, a compromised sub-processor (Vercel/Neon/OpenAI/Resend/Upstash/Sentry), ransomware/data loss, an **unlawful government access order**, misdirected email with personal content. **Honey-token/anomaly note (verified infrastructure):** the platform has hash-chained audit logs, anomaly detection and honey tokens; a honey-token trigger or audit-chain anomaly feeds this workflow as a **suspected case**.

### 2. Roles and responsibilities

**Incident Lead / controller:** owner (Julian Polleschner) — overall responsibility, risk decision, authority/data-subject notification. **DP coordination / DPO:** [TBD: appointed? see G15] — notifiability assessment, authority contact, register. **Technical investigation:** Caelex engineering — containment, forensics, scope, evidence (audit hash chain). **Communications:** Incident Lead / `cs@caelex.eu` — data-subject and university comms. **University interface:** named contact per university — recipient of the processor notification (Path A). **Contact mailboxes (verified in the imprint):** `security@caelex.eu` (security/intake), `privacy@caelex.eu`, `legal@caelex.eu`, `abuse@caelex.eu`, `cs@caelex.eu`. **Competent supervisory authority (Caelex as controller):** **Berlin Commissioner for Data Protection and Freedom of Information (BlnBDI)**, as Caelex is established in Berlin. [TBD: confirm authority + reporting portal/form.]

### 3. Workflow: detect → assess → notify (72h) → inform data subjects

**Phase 0 — Detect & intake (immediately):** intake via `security@caelex.eu` or a monitoring alert (Sentry/anomaly/honey-token) or a sub-processor report; assign an incident ID and open a **breach-register** entry — record the **time of becoming aware** (starts the Art. 33(1) 72h clock once the **controller** is aware); alert Incident Lead + DPO. **Note on the 72h clock:** it starts when the **controller** becomes aware. If **Caelex as processor** learns of a breach, it must inform the university **without undue delay** (Art. 33(2)) — no own 72h deadline; the clock runs **at the university**. **Phase 1 — Contain & investigate (h0–24):** revoke sessions/keys, lock access, temporarily disable a feature/endpoint if needed, force password resets; determine **scope** (which processing — Scholar account/preferences/search history/bookmarks/reading lists/login events; **Path A or B?**; number of subjects, categories, whether sensitive content is factually involved); preserve evidence (hash-chained audit logs, timelines, sub-processor correspondence). **Phase 2 — Risk assessment (h0–48):** rate the **risk to rights and freedoms** (EDPB 9/2022): nature/sensitivity, identifiability, severity, number, permanence, **vulnerability (minors!)**; encryption/pseudonymisation reduce risk (AES-256-GCM fields, masked IP). **Decide notifiability:** authority (Art. 33) **unless** "unlikely to result in a risk"; data subjects (Art. 34) **only** for "likely high risk" (waived e.g. where effective encryption applied or subsequent measures remove the high risk); **document the reasoning** even when not notifying (Art. 5(2)). **Phase 3 — Notify:** **Path A (processor):** notify the **university** without undue delay with all Phase 1–2 information; the university decides on authority/data-subject notification (Caelex supports). **Path B (controller):** **notify the BlnBDI within 72h** of awareness; content per Art. 33(3) (nature; categories/number of subjects and records where possible; DPO/contact; likely consequences; measures taken/proposed); **phased notification** allowed if not all info is available within 72h, **justify any delay**. **Sub-processor dimension:** if the cause sits with a sub-processor, activate its DPA notification duties and SCC government-request clauses; log correspondence. **Phase 4 — Inform data subjects (high risk):** notify in **clear, plain language** (Art. 34(2)) — **child-friendly**, since the cohort may include minors: describe the breach, contact point, likely consequences, measures, recommended actions (e.g. password change); channel: in-app notice and/or email (Resend); where disproportionate effort, a **public communication** may substitute. **Phase 5 — Close & lessons learned:** complete the register, verify mitigation effectiveness, derive preventive TOMs, **update the DPIA** (`dpia.md`) if needed, debrief with DPO/counsel.

### 4. Decision quick-reference

| Situation                                                                            | Notify authority?                             | Notify data subjects?                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Encrypted data exfiltrated, keys safe (AES-256-GCM fields)                           | usually **no** (no/low risk) — document       | **no**                                                  |
| Individual users' search history/reading lists disclosed (sensitive topics possible) | **yes** (risk)                                | **depends** — sensitive content/minors → likely **yes** |
| Individual account takeover                                                          | **yes** (risk)                                | **yes** (action: password change)                       |
| Temporary DB outage, no disclosure, fast recovery                                    | **depends** (availability) — usually document | usually **no**                                          |
| Mass exfiltration (account + history)                                                | **yes**                                       | **yes** (high risk)                                     |

This table is a **heuristic**, not a substitute for case-by-case assessment per EDPB 9/2022. [TBD: validate with DPO/counsel.]

### 5. Breach register (template; Art. 33(5) — document **all** breaches, including non-notified)

Fields: **Incident ID** (e.g. `SCH-BR-{{YYYY}}-NNN`); **Became aware on/at** (starts 72h clock for controllers); **Detected by** (monitoring/user/sub-processor/honey-token/authority); **Caelex role** (processor — Path A / controller — Path B); **Affected processing** (account/preferences/search history/bookmarks/reading lists/login events); **Type** (confidentiality/integrity/availability); **Data categories** (incl. whether sensitive content); **Subjects (number/estimate)** (minors? [TBD per case]); **Cause** (attack/misconfiguration/sub-processor/human error); **Containment measures** (timestamps); **Risk assessment** (none/risk/high risk — **with reasoning**); **Authority notified?** (yes/no + date/time + reference / **reason if no**); **University informed? (Path A)** (yes/no + date/time + recipient); **Data subjects notified?** (yes/no + date + channel / reason); **Sub-processor correspondence** (references); **Closure / lessons learned** (measures, DPIA update, owner, date).

### 6. Conclusion

This runbook ensures Scholar breaches are **detected, assessed, notified in time** and that **all incidents are documented** (Art. 33(5)). Before adoption, resolve: **DPO appointment** (G15), **competent authority + reporting portal**, **DPA proc→university notification path** (G2), and the **role/path mapping** per processing (G1). **[TBD: to be reviewed and signed off by qualified legal counsel.]**
