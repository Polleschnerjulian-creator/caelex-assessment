# Datenschutzbeauftragter — Prüfvermerk, Bestellungs- & Kontaktvorlage / DPO — Requirement Analysis, Appointment & Contact Template (Caelex Scholar)

> ╔══════════════════════════════════════════════════════════════════════════╗
> ║ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung ║
> ║ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. **Keine** ║
> ║ **Rechtsberatung.** / Template; must be reviewed and adapted by qualified ║
> ║ legal counsel before publication or execution. **Not legal advice.** ║
> ╚══════════════════════════════════════════════════════════════════════════╝

|                                             |                                                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dokument / Document**                     | DPO requirement analysis + appointment & contact template — Caelex Scholar                                                                   |
| **Status**                                  | ENTWURF / DRAFT — lawyer review required (classification call)                                                                               |
| **Version**                                 | 0.1 (Entwurf / Draft)                                                                                                                        |
| **Stand / Last updated**                    | 7 June 2026                                                                                                                                  |
| **Verbindliche Sprache / Binding language** | Deutsch (binding); English convenience translation                                                                                           |
| **Maßgebliche Spec / Source spec**          | `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` (G15, abhängig von G14 DPIA)                                          |
| **Betroffene Stelle / Entity**              | Caelex — Einzelunternehmen, Inhaber Julian Polleschner, Berlin (Verantwortlicher für eigene Zwecke; Auftragsverarbeiter für die Universität) |

---

## 1. Zusammenfassung / Executive summary

(DE) Es ist **rechtlich ernsthaft zu prüfen und nach derzeitiger Einschätzung wahrscheinlich**, dass Caelex einen **Datenschutzbeauftragten (DSB)** benennen muss — **nicht** wegen der Kopfzahl (§ 38 Abs. 1 S. 1 BDSG: 20 Personen ständig mit automatisierter Verarbeitung befasst — bei einem Einzelunternehmen i.d.R. nicht erreicht), sondern wegen **§ 38 Abs. 1 S. 2 BDSG** i.V.m. **Art. 35 DSGVO**: Sobald für eine Verarbeitung eine **Datenschutz-Folgenabschätzung (DSFA)** durchzuführen ist, ist **unabhängig von der Personenzahl** ein DSB zu benennen. Caelex Scholar erfüllt **mehrere DSFA-Auslöser** (minderjährige betroffene Personen + KI-gestützte semantische Suche + opt-in verhaltensbezogene Verlaufsspeicherung). **Folglich hängt die DSB-Pflicht maßgeblich am Ausgang der DSFA** (Spec G14). **Empfehlung:** DSB vorsorglich benennen und Kontakt veröffentlichen.

(EN) It must be **seriously assessed and is, on current view, likely** that Caelex must appoint a **Data Protection Officer (DPO)** — **not** on headcount grounds (§ 38(1) sentence 1 BDSG: 20 persons constantly engaged in automated processing — typically not met by a sole proprietorship), but under **§ 38(1) sentence 2 BDSG** together with **Art. 35 GDPR**: where a **DPIA** is required for a processing operation, a DPO must be appointed **regardless of headcount**. Caelex Scholar meets **several DPIA triggers** (minor data subjects + AI semantic search + opt-in behavioural history). **The DPO obligation therefore turns on the DPIA outcome** (spec G14). **Recommendation:** appoint a DPO as a precaution and publish the contact.

> **[TBD — counsel.]** Dies ist eine **rechtliche Einordnungsfrage** ([LAWYER] in der Spec). Die folgende Analyse bereitet die Entscheidung vor, ersetzt sie aber nicht.

---

## 2. Prüfung der Bestellpflicht / Analysis of the appointment obligation

### 2.1 Art. 37 Abs. 1 DSGVO (unionsweite Tatbestände)

(DE) Eine Bestellpflicht nach Art. 37 Abs. 1 DSGVO besteht, wenn

- **lit. a)** eine Behörde/öffentliche Stelle verarbeitet — **für Caelex (privat) nicht einschlägig** (wohl aber für die **Universität** als öffentliche Stelle: diese hat ohnehin einen behördlichen DSB);
- **lit. b)** die Kerntätigkeit in **umfangreicher regelmäßiger und systematischer Überwachung** betroffener Personen besteht — **vertretbar verneinbar:** Scholar ist eine Recherchedatenbank, **kein** Tracking-/Überwachungsdienst; der Recherche-Verlauf ist **opt-in und standardmäßig deaktiviert**, semantische Suche ebenfalls. Das spricht gegen „Kerntätigkeit = Überwachung". [TBD: counsel bewertet „umfangreich/systematisch".]
- **lit. c)** die Kerntätigkeit in umfangreicher Verarbeitung **besonderer Kategorien** (Art. 9) oder Daten über Straftaten (Art. 10) besteht — **nicht einschlägig:** Scholar sieht **keine** Art.-9-Daten vor.

(EN) Art. 37(1): (a) public authority — N/A for Caelex (but the **University** has its own statutory DPO); (b) core activity = large-scale regular and systematic monitoring — **arguably not met** (Scholar is a research database, not a tracking service; history + semantic search are **opt-in, default OFF**) [TBD: counsel on "large-scale/systematic"]; (c) large-scale special-category/Art. 10 data — **not met**.

### 2.2 § 38 BDSG (deutsche Absenkung der Schwelle) — der maßgebliche Hebel

(DE)

- **§ 38 Abs. 1 S. 1 BDSG:** DSB-Pflicht, wenn **i.d.R. mindestens 20 Personen ständig** mit automatisierter Verarbeitung befasst sind. Bei einem **Einzelunternehmen** regelmäßig **nicht erreicht**. [TBD: aktuelle Personenzahl bestätigen.]
- **§ 38 Abs. 1 S. 2 BDSG:** **Unabhängig** von der Personenzahl besteht eine DSB-Pflicht, wenn Caelex Verarbeitungen vornimmt, **die einer DSFA nach Art. 35 DSGVO unterliegen**, oder personenbezogene Daten **geschäftsmäßig zum Zweck der Übermittlung/anonymisierten Übermittlung oder für Markt-/Meinungsforschung** verarbeitet.
  - **DSFA-Pfad: wahrscheinlich einschlägig** (siehe 2.3). → DSB-Pflicht.
  - Markt-/Meinungsforschung: **nicht** das Geschäftsmodell von Scholar. Geschäftsmäßige Übermittlung: nicht einschlägig.

(EN) **§ 38(1) sentence 1 BDSG:** ≥20 persons constantly in automated processing — typically **not met** by a sole proprietorship [TBD: confirm count]. **§ 38(1) sentence 2 BDSG:** **regardless of headcount**, a DPO is required if Caelex carries out processing **subject to a DPIA under Art. 35** (or processes data commercially for transfer / market-or-opinion research). The **DPIA path likely applies** (see 2.3) → DPO required. Market research is not Scholar's model.

### 2.3 DSFA-Auslöser (Art. 35) — warum eine DSFA wahrscheinlich ist / DPIA triggers

(DE) Maßgeblich sind Art. 35 Abs. 1/3 DSGVO, die WP248-Kriterien (Art.-29-Gruppe) und die **Muss-Liste der DSK**. Für Scholar sprechen mehrere Kriterien für eine DSFA:

1. **Daten schutzbedürftiger Betroffener — Minderjährige** (WP248-Kriterium „vulnerable data subjects"; Erwägungsgrund 38). Scholar-Publikum kann **minderjährige** Studierende umfassen.
2. **Einsatz neuer Technologien / KI** — **semantische Suche** über Embeddings (innovative Nutzung; AI Act limited-risk). WP248-Kriterium „innovative use".
3. **Systematische Verarbeitung/Profil-nahe Auswertung** — **Recherche-Verlauf** (verhaltensbezogen) als opt-in-Funktion. Auch wenn default OFF, ist die Funktion vorhanden.

> Treffen **zwei oder mehr** WP248-Kriterien zu, ist eine DSFA regelmäßig **erforderlich**. Hier sind es **mindestens drei** in der Kombination. **→ DSFA wahrscheinlich pflichtig → DSB-Pflicht über § 38 Abs. 1 S. 2 BDSG.**

(EN) Multiple WP248 criteria apply — **vulnerable subjects (minors)**, **innovative/AI use (semantic search)**, **systematic behavioural processing (search history, opt-in)**. **Two or more** criteria → DPIA generally required; here **at least three** → DPIA likely required → **DPO required via § 38(1) sentence 2 BDSG**.

> **[TBD — counsel/Verantwortlicher führen die DSFA durch (Spec G14).]** Das Ergebnis der DSFA determiniert die DSB-Pflicht. Bis dahin: **vorsorgliche Benennung empfohlen.**

### 2.4 Ergebnis / Conclusion

(DE) **Empfehlung:** Caelex benennt — **vorbehaltlich der anwaltlichen Bestätigung und des DSFA-Ergebnisses** — einen **Datenschutzbeauftragten**, veröffentlicht dessen Kontaktdaten (Art. 37 Abs. 7 DSGVO) und **teilt sie der zuständigen Aufsichtsbehörde mit** (für Berlin: **Berliner Beauftragte für Datenschutz und Informationsfreiheit, BlnBDI**). Die Benennung ist auch dann sinnvoll, wenn man die Pflicht im Grenzbereich verneint, weil sie Rechtssicherheit schafft und die Außenkommunikation (Datenschutzerklärung, AVV) glättet.

(EN) **Recommendation:** subject to counsel and the DPIA outcome, Caelex appoints a **DPO**, publishes the contact (Art. 37(7) GDPR) and **notifies the competent supervisory authority** (Berlin: **BlnBDI**). Appointment is advisable even in a borderline case for legal certainty.

---

## 3. Wer kann benannt werden / Who may be appointed

(DE)

- **Interner DSB** oder **externer DSB** (Art. 37 Abs. 6 DSGVO) — beide zulässig. Bei einem Einzelunternehmen ist die Benennung des **Inhabers selbst als DSB regelmäßig wegen Interessenkonflikt unzulässig** (Art. 38 Abs. 6: keine Aufgaben, die zu einem Konflikt führen — der Inhaber bestimmt Zweck/Mittel). **→ Empfehlung: externer DSB** (Dienstleister), der die erforderliche **Fachkunde** (Art. 37 Abs. 5) mitbringt und **weisungsfrei** (Art. 38 Abs. 3) berichtet.
- Der DSB muss **ordnungsgemäß und frühzeitig eingebunden** (Art. 38 Abs. 1), **ressourciert** (Art. 38 Abs. 2) und vor **Abberufung/Benachteiligung wegen der Aufgabenerfüllung geschützt** (Art. 38 Abs. 3) werden.

(EN) Internal or external DPO (Art. 37(6)) both permitted. For a sole proprietorship, appointing the **owner as DPO is generally barred by conflict of interest** (Art. 38(6)). **→ Recommend an external DPO** with the required expertise (Art. 37(5)), reporting without instructions (Art. 38(3)), properly involved (Art. 38(1)) and resourced (Art. 38(2)).

---

## 4. Bestellungsvorlage / Appointment template

> Auszufüllen und zu unterzeichnen, sobald die Person feststeht. / Complete and sign once the person is determined.

**Bestellung zum/zur Datenschutzbeauftragten / Appointment as Data Protection Officer**

> Hiermit bestellt **Caelex, Inhaber Julian Polleschner, Am Maselakepark 37, 13587 Berlin** ("Verantwortlicher")
> Herrn/Frau **[TBD: Name]**, **[TBD: Anschrift/Dienstleister]**
> mit Wirkung zum **[TBD: Datum]** zum/zur **Datenschutzbeauftragten** gemäß Art. 37 DSGVO, § 38 BDSG.
>
> 1. Aufgaben gemäß **Art. 39 DSGVO** (Unterrichtung/Beratung; Überwachung der Einhaltung; Beratung zur DSFA; Zusammenarbeit mit und Anlaufstelle für die Aufsichtsbehörde).
> 2. Der/die DSB ist **weisungsfrei** (Art. 38 Abs. 3), wird **frühzeitig** eingebunden (Art. 38 Abs. 1), erhält die **erforderlichen Ressourcen** (Art. 38 Abs. 2) und ist zur **Verschwiegenheit** verpflichtet (Art. 38 Abs. 5).
> 3. Es besteht **kein Interessenkonflikt** (Art. 38 Abs. 6); insbesondere übt der/die DSB keine Tätigkeit aus, die Zweck/Mittel der Verarbeitung bestimmt.
> 4. Kontaktdaten werden gemäß **Art. 37 Abs. 7 DSGVO** veröffentlicht und der **zuständigen Aufsichtsbehörde** mitgeteilt.
>
> Ort, Datum / Place, date: \***\*\_\_\_\_\*\*** Verantwortlicher: \***\*\_\_\_\_\*\*** DSB / DPO: \***\*\_\_\_\_\*\***

---

## 5. Mitteilung an die Aufsichtsbehörde / Notification to the supervisory authority

(DE) Nach Benennung sind die Kontaktdaten des/der DSB der zuständigen Aufsichtsbehörde **mitzuteilen** (Art. 37 Abs. 7 DSGVO). Für Caelex mit Sitz in **Berlin** ist dies die **Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI)**; die Meldung erfolgt über das Online-Formular der BlnBDI. [TBD: counsel bestätigt zuständige Behörde + Meldeweg; aktuelle BlnBDI-Anschrift/Online-Formular prüfen.]

(EN) After appointment, the DPO's contact details must be **communicated to the competent supervisory authority** (Art. 37(7) GDPR). For Berlin: the **Berlin Commissioner for Data Protection and Freedom of Information (BlnBDI)**, via its online form. [TBD: counsel to confirm authority + channel.]

---

## 6. Öffentliche DSB-Kontaktzeile (für die Datenschutzerklärung) / Public DPO-contact line (for the privacy notice)

(DE) Sobald ein DSB benannt ist, wird folgende Zeile in die **Scholar-Datenschutzerklärung** (separates Lane-Dokument, Slug `privacy`) und ggf. ins Impressum aufgenommen:

> **Datenschutzbeauftragter / Data Protection Officer**
> [TBD: Name / Firma des externen DSB]
> [TBD: Anschrift]
> E-Mail: privacy@caelex.eu (z. Hd. Datenschutzbeauftragte/r)
> _Bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten oder zur Wahrnehmung Ihrer Betroffenenrechte können Sie sich direkt an unsere/n Datenschutzbeauftragte/n wenden._

(EN, convenience) Once a DPO is appointed, add this line to the Scholar **privacy notice** (slug `privacy`) and, where appropriate, the imprint:

> **Data Protection Officer**
> [TBD: name / external-DPO firm]
> [TBD: address]
> Email: privacy@caelex.eu (attn. Data Protection Officer)
> _You may contact our DPO directly with any questions about the processing of your personal data or to exercise your rights._

> **Falls (noch) kein DSB bestellt ist / If no DPO is (yet) appointed:** In der Datenschutzerklärung **keine** DSB-Zeile angeben; stattdessen den allgemeinen Datenschutz-Kontakt (privacy@caelex.eu) nennen. Eine DSB-Zeile darf erst veröffentlicht werden, wenn tatsächlich eine Person benannt wurde. [TBD: counsel entscheidet final über Bestellung.]

---

## 7. Abgrenzung zur Universität / Relationship to the University's DPO

(DE) Die **Universität** ist als öffentliche Stelle regelmäßig **selbst** verpflichtet, einen (behördlichen) Datenschutzbeauftragten zu führen (Art. 37 Abs. 1 lit. a DSGVO; Landesrecht). Der DSB der Universität ist Ansprechpartner für die betroffenen Studierenden/Mitarbeitenden hinsichtlich der **kontrollerseitigen** Verarbeitung; der (etwaige) DSB von Caelex ist für die **Caelex-seitigen** (eigenen) Verarbeitungen und für die AV-Pflichten zuständig. Beide DSB-Funktionen bestehen **nebeneinander**.

(EN) The **University**, as a public body, typically must maintain its **own** statutory DPO (Art. 37(1)(a) GDPR; state law). The University's DPO is the contact for **controller-side** processing toward students/staff; Caelex's (potential) DPO covers **Caelex-side** processing and the processor obligations. The two functions coexist.

---

## 8. Offene Punkte / Open items (counsel)

1. **[TBD]** **DSFA durchführen** (Spec G14) — Ergebnis entscheidet über die DSB-Pflicht nach § 38 Abs. 1 S. 2 BDSG.
2. **[TBD]** Bewertung von Art. 37 Abs. 1 lit. b („umfangreiche systematische Überwachung") angesichts opt-in-Verlauf/semantischer Suche (default OFF).
3. **[TBD]** Auswahl **interner vs. externer** DSB; Interessenkonflikt-Prüfung (Inhaber kann nicht selbst DSB sein).
4. **[TBD]** Bestätigung der **zuständigen Aufsichtsbehörde** (BlnBDI, Berlin) und des Meldewegs (Art. 37 Abs. 7).
5. **[TBD]** Aktuelle **Personenzahl** „ständig mit automatisierter Verarbeitung befasst" (§ 38 Abs. 1 S. 1).
6. **[TBD]** Koordination mit dem **DSB der Universität** (Schnittstellen, Eskalationswege, gemeinsame Breach-Kommunikation).

---

_Ende des Entwurfs / End of draft. Die DSB-Bestellpflicht ist eine rechtliche Einordnung [LAWYER]; vor Benennung/Veröffentlichung durch qualifizierte Rechtsberatung zu bestätigen. / The DPO obligation is a legal classification [LAWYER]; confirm with counsel before appointment/publication._
