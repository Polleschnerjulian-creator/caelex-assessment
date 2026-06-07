# Caelex Scholar — Rechtsgrundlagen-Register & Interessenabwägungen (Art. 6 DSGVO + LIA) / Lawful-Basis Register & Legitimate-Interest Assessments (Art. 6 GDPR + LIA)

> ╔══════════════════════════════════════════════════════════════════════════╗
> ║ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung ║
> ║ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine ║
> ║ Rechtsberatung. / Template; must be reviewed and adapted by qualified ║
> ║ legal counsel before publication or execution. Not legal advice. ║
> ╚══════════════════════════════════════════════════════════════════════════╝

**Stand / Last updated:** 7 June 2026
**Version:** 0.1 (Entwurf / Draft)
**Dokumenttyp / Document type:** Internes Compliance-Dokument — NICHT zur Veröffentlichung. / Internal compliance record — NOT for publication.
**Geltungsbereich / Scope:** Caelex Scholar (`caelex.eu/scholar`) — Festlegung der Rechtsgrundlage je Verarbeitungszweck + Interessenabwägungen (LIA) für auf Art. 6(1)(f) gestützte Verarbeitungen. / Per-purpose lawful basis + LIAs for Art. 6(1)(f) processing.
**Verantwortlich / Owner:** Julian Polleschner (Inhaber, Caelex) · privacy@caelex.eu
**Sprachregime / Language regime:** Die deutsche Fassung ist verbindlich; die englische dient nur der Information. / German is binding; English is a convenience translation.

---

## 1. Methodik / Methodology

**DE.** Dieses Register ordnet **jeder** Scholar-Verarbeitung (vgl. `ropa.md`) eine Rechtsgrundlage nach Art. 6(1) DSGVO zu. Leitlinie ist eine **bewusste Minimierung der Abhängigkeit von Einwilligung** für Kern- und Sicherheitsfunktionen — wichtig, weil die Zielgruppe Minderjährige umfassen kann (Art. 8). Kernfunktionen stützen sich auf **Vertrag (b)**, Sicherheit auf **berechtigtes Interesse (f)**, rechtliche Nachweise auf **rechtliche Verpflichtung (c)**; nur die **optionalen** Komfortfunktionen (Suchhistorie, Semantiksuche, Analytik) sind **opt-in/Einwilligung (a)** und stehen standardmäßig AUS. Für jede (f)-Verarbeitung liegt eine **dreistufige LIA** (Zweck-/Notwendigkeits-/Abwägungstest) bei (EDSA-/ICO-Methodik).

**EN.** This register assigns each Scholar processing (see `ropa.md`) a basis under Art. 6(1). The guiding principle is **deliberately minimising reliance on consent** for core/security functions — important because the audience may include minors (Art. 8). Core relies on **contract (b)**, security on **legitimate interests (f)**, statutory evidence on **legal obligation (c)**; only the **optional** convenience features (search history, semantic search, analytics) are **opt-in/consent (a)** and default OFF. Each (f) processing carries a **three-part LIA** (purpose / necessity / balancing).

> **Hinweis auf die Doppelrolle / Dual-role note.** Im B2B2C-Modell ist die **Hochschule Verantwortliche** für die beauftragte Leistung; Caelex ist insoweit **Auftragsverarbeiter**. Wo die Hochschule die Rechtsgrundlage bestimmt, ist die untenstehende Caelex-Einordnung als **Caelex-eigene** (Produkt/Sicherheit/KI) zu lesen bzw. mit der Hochschul-Festlegung zu spiegeln. Finale Zuordnung im Hochschul-AVV. [TBD: counsel.] / Where the university sets the basis, read the Caelex entries below as Caelex's **own-controller** determinations (product/security/AI) and mirror them with the university's. Finalise in the DPA.

---

## 2. Register: Zweck → Rechtsgrundlage / Register: purpose → basis

| #   | Verarbeitungszweck / Processing purpose                                                                  | ROPA-Ref            | Rechtsgrundlage / Lawful basis                                                                    | Begründung (Kurz) / Rationale (short)                                                                                                                                                                                                                                                                   | LIA nötig? / LIA?                                          |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| L1  | **Kontoverwaltung & SSO-Zugang** / Account & SSO access                                                  | A.1                 | **Art. 6(1)(b)** Vertrag/vorvertraglich                                                           | Zugang zur Recherche-Datenbank ist die vertragliche Hauptleistung; ohne Konto keine Bereitstellung. / Core contractual performance.                                                                                                                                                                     | Nein / No                                                  |
| L2  | **Recherche-Präferenzen** / Research preferences                                                         | A.2                 | **Art. 6(1)(b)**                                                                                  | Konfigurierbare Oberfläche ist Teil der angeforderten Leistung. / Part of the requested service.                                                                                                                                                                                                        | Nein / No                                                  |
| L3  | **KI-gestützte Semantiksuche (opt-in)** / AI semantic search (opt-in)                                    | A.3                 | **Primär Art. 6(1)(a)** Einwilligung (Opt-in) — **alternativ** Art. 6(1)(b) als gewählte Funktion | Standard AUS; ausdrücklicher Opt-in. Da als optionale Zusatzfunktion ausgestaltet, ist Einwilligung die sauberste Grundlage; (b) nur, falls als integraler Leistungsbestandteil gewertet. **[TBD: counsel — eine Grundlage festlegen.]** / Default OFF; opt-in. Consent cleanest; (b) only if integral. | Nein (bei (a)); falls (f) je erwogen → LIA / No under (a)  |
| L4  | **Sicherheits- & Anmeldeprotokollierung** / Security & login logging                                     | A.4                 | **Art. 6(1)(f)** berechtigtes Interesse                                                           | IT-Sicherheit, Betrugs-/Übernahme-Abwehr; ausdrücklich als legitimes Interesse anerkannt (Erwägungsgrund 49). / IT security, fraud/takeover defence (Recital 49).                                                                                                                                       | **Ja → §3 LIA-1**                                          |
| L5  | **Suchhistorie (opt-in)** / Search history (opt-in)                                                      | A.5                 | **Art. 6(1)(a)** Einwilligung                                                                     | Verhaltensdaten; Standard AUS; ausdrücklicher Opt-in, jederzeit widerrufbar. / Behavioural; default OFF; revocable opt-in.                                                                                                                                                                              | Nein / No                                                  |
| L6  | **Merk-/Leselisten** / Bookmarks & reading lists                                                         | A.6                 | **Art. 6(1)(b)**                                                                                  | Vom Nutzer angeforderte Funktion (Speichern/Organisieren). / User-requested feature.                                                                                                                                                                                                                    | Nein / No                                                  |
| L7  | **Einwilligungs- & Pflichtnachweise** / Consent & statutory evidence                                     | A.7                 | **Art. 6(1)(c)** rechtliche Verpflichtung (+ (f) Nachweisinteresse)                               | Nachweis der Einwilligung (Art. 7(1)) und Rechenschaft (Art. 5(2)); pseudonymisierte Speicherung. / Proving consent + accountability; pseudonymised.                                                                                                                                                    | Optional (für den (f)-Anteil) — §3 LIA-3                   |
| L8  | **Optionale Web-Analytik/Performance** / Optional analytics/perf                                         | A.8                 | **Art. 6(1)(a)** Einwilligung **+ TDDDG §25** (Endgerätezugriff)                                  | Nur nach Cookie-Banner-Zustimmung geladen; cookielos. / Loaded only after consent; cookieless.                                                                                                                                                                                                          | Optional (falls je (f) für aggregierte Messung) — §3 LIA-2 |
| L9  | **Drittland-/Sub-Auftragsverarbeitung** (Hosting, DB, KI, Mail, Monitoring) / Transfers & sub-processing | A.1–A.8, Anhang 1/2 | Akzessorisch zur jeweiligen Grundlage (b/f/a) + Art. 44–46 Transfer-Mechanismen                   | Keine eigene Grundlage; folgt dem Hauptzweck; Transfers über DPF/SCC abgesichert. / Accessory to the underlying basis; transfers via DPF/SCC.                                                                                                                                                           | Siehe TIA (`ropa.md` Anhang 2)                             |

> **Warum NICHT Einwilligung für Kern/Sicherheit / Why not consent for core/security.** Einwilligung muss freiwillig, widerrufbar und (bei Minderjährigen unter 16 in DE) elternseitig autorisierbar sein. Würde der **Kernzugang** oder die **Sicherheitsprotokollierung** auf Einwilligung gestützt, wäre der Dienst bei Widerruf nicht mehr sicher/funktionsfähig zu betreiben — daher (b)/(f). Einwilligung bleibt den **abschaltbaren Komfortfunktionen** vorbehalten. / Basing core access or security logging on consent would make the service unworkable/insecure on withdrawal; hence (b)/(f). Consent is reserved for switch-off-able conveniences.

---

## 3. Interessenabwägungen / Legitimate-Interest Assessments (LIA)

> Methodik je LIA (EDSA-Leitlinie / ICO): **(1) Zwecktest** — liegt ein legitimes Interesse vor? **(2) Notwendigkeitstest** — ist die Verarbeitung erforderlich, oder geht es milder? **(3) Abwägungstest** — überwiegen Interessen/Grundrechte der Betroffenen, insb. bei Minderjährigen? / Per-LIA method: (1) purpose, (2) necessity, (3) balancing — with special weight on minors.

---

### LIA-1 — Sicherheits- & Anmeldeprotokollierung / Security & login logging (zu L4)

**(1) Zweck / Purpose test.**
DE: Berechtigtes Interesse von Caelex (und mittelbar der Hochschulen und der Nutzer selbst) an der **Integrität, Verfügbarkeit und Vertraulichkeit** des Dienstes: Erkennung und Abwehr von Brute-Force, Kontoübernahme, „impossible travel" und sonstigen Anomalien; Nachweis nach Art. 32. Erwägungsgrund 49 erkennt Netz- und Informationssicherheit ausdrücklich als berechtigtes Interesse an. Legitim, klar definiert, nicht spekulativ.
EN: Legitimate interest in service integrity/availability/confidentiality — detecting/preventing brute force, takeover, impossible travel, anomalies; Art. 32 evidence. Recital 49 expressly recognises security as a legitimate interest. Legitimate, specific, non-speculative.

**(2) Notwendigkeit / Necessity test.**
DE: Sicherheitsmonitoring ist ohne **einige** Verarbeitung von Verbindungs- und Geräte-Metadaten nicht möglich. Mildere Mittel sind bereits umgesetzt: **IP-Maskierung** (`maskIp()`) statt voller IP; nur **grobe** Geolokation (Stadt/Land); Brute-Force-Puffer mit **90-Tage**-Begrenzung; manipulationsresistente Hash-Kette statt breiter Klartext-Logs. Die Datenmenge ist auf das für die Erkennung Erforderliche reduziert. Eine vollständige Anonymisierung würde den Zweck (Zuordnung verdächtiger Ereignisse zu einem Konto) vereiteln.
EN: Security monitoring requires **some** connection/device metadata. Less-intrusive measures already in place: IP masking, coarse geo only, 90-day brute-force buffer, hash-chained logs. Full anonymisation would defeat the purpose.

**(3) Abwägung / Balancing test.**
DE: Für die Verarbeitung: hohe Bedeutung für den Schutz **gerade der Nutzer** (deren Konten/Daten). Geräte-/Verbindungsmetadaten sind nicht besonders sensibel (Art. 9 nicht berührt); IP ist maskiert; keine Profilbildung zu Werbe-/Bewertungszwecken; keine automatisierte Einzelentscheidung mit Rechtswirkung (Art. 22). Erwartungskonform: Nutzer eines Login-gestützten Dienstes **rechnen** mit Sicherheitsprotokollen (vernünftige Erwartung, Erwägungsgrund 47). **Minderjährige:** Da keine sensiblen Inhalte, keine Profilbildung und keine Werbung erfolgen und IP maskiert ist, ist der Eingriff auch gegenüber Minderjährigen verhältnismäßig; die Verarbeitung dient ihrem eigenen Schutz. Gegenmaßnahmen: kurze/maßvolle Aufbewahrung [TBD: `LoginEvent`-Frist ≤ 12 Monate bestätigen], Transparenz im Privacy-Hinweis, Widerspruchsrecht (Art. 21) wird beachtet — wobei ein Widerspruch gegen **sicherheitsnotwendige** Protokolle regelmäßig an zwingenden schutzwürdigen Gründen scheitert.
EN: For: high value in protecting **the users themselves**; metadata not special-category; IP masked; no profiling/ads; no Art. 22 decisions; users reasonably expect security logging (Recital 47). **Minors:** proportionate given no sensitive content, no profiling, no ads, masked IP, and protective purpose. Safeguards: short/measured retention [TBD ≤ 12 months], transparency, Art. 21 honoured (though objection to security-necessary logging typically yields to compelling legitimate grounds).

**Ergebnis / Outcome.** **Art. 6(1)(f) trägt** für L4, vorbehaltlich Bestätigung der `LoginEvent`-Frist und der Aufnahme in den Privacy-Hinweis. / **Art. 6(1)(f) supports L4**, subject to confirming the `LoginEvent` retention and privacy-notice disclosure. **[TBD: counsel sign-off.]**

---

### LIA-2 — Aggregierte Reichweiten-/Performance-Messung / Aggregated reach & performance measurement (zu L8, nur falls je auf (f) gestützt)

> **Status / Status.** Analytik/Performance sind aktuell **einwilligungsbasiert** (Art. 6(1)(a) + TDDDG §25) und werden nur nach Zustimmung geladen. Diese LIA ist **vorsorglich** für den Fall, dass eine **cookielose, aggregierte** Messung künftig auf berechtigtes Interesse gestützt werden soll. **Solange Endgerätezugriff erfolgt, bleibt TDDDG §25-Einwilligung zwingend** — eine LIA ersetzt sie nicht. / Currently consent-based. This LIA is **precautionary** for a possible future cookieless, aggregated measurement under (f). **While there is device access, TDDDG §25 consent remains mandatory** — an LIA does not replace it.

**(1) Zweck / Purpose.**
DE: Berechtigtes Interesse an der **Stabilität und Verbesserung** des Dienstes durch aggregierte, anonyme Nutzungs-/Performance-Statistik (Seitenpfade, Geräteklasse, Core Web Vitals). Legitim und betrieblich begründet.
EN: Legitimate interest in stability/improvement via aggregated, anonymous usage/perf stats. Legitimate, operationally grounded.

**(2) Notwendigkeit / Necessity.**
DE: Erforderlich nur in **anonymer, cookieloser** Ausprägung: keine IP, keine Cookies, keine User-IDs, nur gerollter Session-Hash und aggregierte Werte (vgl. Anbieter-Konfiguration). Mildere Mittel: vollständige Aggregation, kein Cross-Site-Tracking, kein Fingerprinting. Personenbezogene Produkt-Analytik ist **nicht** erforderlich und wird nicht durchgeführt.
EN: Required only in **anonymous, cookieless** form: no IP/cookies/user-IDs, rolled session hash + aggregates only. No cross-site tracking, no fingerprinting. Personal-level product analytics not needed and not performed.

**(3) Abwägung / Balancing.**
DE: Da die Messung **cookielos und ohne personenbezogene Identifikatoren** erfolgt, ist der Eingriff minimal; eine Profilbildung findet nicht statt. **Minderjährige:** Ohne Tracking/Profiling/Werbung ist der Eingriff auch ihnen gegenüber sehr gering. **Aber:** Der **Endgerätezugriff** (Skript-Ausführung) unterliegt unabhängig vom Personenbezug TDDDG §25 → **Einwilligung erforderlich**, solange nicht „unbedingt erforderlich". Daher überwiegt das berechtigte Interesse die geringen Datenschutzbelange zwar **inhaltlich**, ersetzt aber **nicht** die §25-Einwilligung.
EN: Cookieless + no personal identifiers → minimal intrusion, no profiling; very low impact on minors. **But** device access falls under TDDDG §25 regardless of personal data → **consent required** unless strictly necessary. So (f) may carry the data-protection side but does **not** displace §25 consent.

**Ergebnis / Outcome.** Beibehaltung der **Einwilligungslösung** empfohlen; eine reine (f)-Stützung ist nur denkbar, wenn künftig **kein** zustimmungspflichtiger Endgerätezugriff erfolgt. / Keep the **consent** approach; (f)-only is conceivable only if future measurement requires **no** consent-triggering device access. **[TBD: counsel.]**

---

### LIA-3 — Einwilligungs-/Pflichtnachweise (Nachweisinteresse) / Consent-evidence retention (accountability interest) (zu L7)

**(1) Zweck / Purpose.**
DE: Neben der rechtlichen Verpflichtung (Art. 6(1)(c) i. V. m. Art. 7(1)/5(2)) besteht ein berechtigtes Interesse, **nachweisen** zu können, welche Einwilligung ein Nutzer wann gesehen und erteilt/widerrufen hat (Abwehr unberechtigter Ansprüche, Aufsichtsnachweis).
EN: Beyond the legal obligation, a legitimate interest in **proving** which consent a user saw and gave/withdrew, when (defending claims, supervisory evidence).

**(2) Notwendigkeit / Necessity.**
DE: Erforderlich ist nur eine **pseudonymisierte** Aufzeichnung: gehashte Session-UUID, **vor dem Hashing gekürzte** IP (/24 bzw. /48), gehashter User-Agent, Entscheidung, Per-Zweck-Präferenzen, Consent-Version. Klartext-IP oder voller UA sind **nicht** erforderlich und werden nicht gespeichert. Mildere Mittel sind damit bereits implementiert.
EN: Only a **pseudonymised** record is needed (hashed session UUID, truncated-then-hashed IP, hashed UA, decision, per-purpose prefs, version). No plaintext IP/UA stored — less-intrusive means already implemented.

**(3) Abwägung / Balancing.**
DE: Der Personenbezug ist durch Hashing/Kürzung stark reduziert (auf sich allein gestellt nicht identifizierend). Das Nachweisinteresse korrespondiert mit einer **gesetzlichen Pflicht** und liegt auch im Interesse der Betroffenen (Belegbarkeit ihrer Entscheidung). **Minderjährige:** Keine erhöhte Eingriffsintensität, da pseudonym und zweckgebunden. Begrenzung über **Aufbewahrungsfrist** [TBD: bis 3 Jahre nach Widerruf/Ablauf bestätigen] und einen noch zu ergänzenden Lösch-Sweep (vgl. `retention-schedule.md` R10).
EN: Strongly reduced identifiability via hashing/truncation; the evidence interest mirrors a **legal duty** and benefits data subjects. Minors: no heightened intrusion (pseudonymous, purpose-bound). Bounded by retention [TBD ≤ 3 years] and an as-yet-missing deletion sweep (see `retention-schedule.md` R10).

**Ergebnis / Outcome.** Stützung primär auf **Art. 6(1)(c)**; der ergänzende **(f)-Nachweisanteil** ist durch diese LIA getragen, vorbehaltlich Fristbestätigung + Sweep. / Primarily **Art. 6(1)(c)**; the supplementary **(f)** evidence interest is supported by this LIA, subject to retention + sweep. **[TBD: counsel.]**

---

## 4. Einwilligungs-Governance (für (a)-Verarbeitungen) / Consent governance (for (a) processing)

- **Granular & opt-in / granular & opt-in:** Semantiksuche (L3), Suchhistorie (L5) und Analytik (L8) sind getrennt schaltbar und **standardmäßig AUS** (`@default(false)`; `ConditionalAnalytics.tsx`). / Separately toggled, default OFF.
- **Widerruf / withdrawal:** jederzeit so einfach wie die Erteilung (Schalter in den Einstellungen; Consent-Banner-Revoke). / As easy as giving consent.
- **Minderjährige (Art. 8) / minors:** Da Kern und Sicherheit **nicht** auf Einwilligung beruhen und die (a)-Funktionen standardmäßig AUS sind, ist die Abhängigkeit von Art. 8 minimiert. Die Alters-/Einwilligungslage ist SSO-vermittelt und der **Hochschule (Verantwortliche)** zuzuweisen; kein Über-Erheben von Geburtsdaten. / Reliance on Art. 8 minimised; age/consent posture SSO-mediated and allocated to the **university**; no DOB over-collection. **[TBD: counsel + AVV.]**
- **Nachweis / proof:** `ConsentRecord` (versioniert, pseudonymisiert) — siehe L7/LIA-3. / Versioned, pseudonymised consent log.

---

## Änderungshistorie / Change log

| Version | Stand / Date | Änderung / Change                                                                                                                                                                                                                             | Autor / Author   |
| ------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1     | 7 June 2026  | Erstentwurf; Zweck→Basis-Karte + LIA-1 (Sicherheit), LIA-2 (Analytik, vorsorglich), LIA-3 (Consent-Nachweis). Grounded in Live-Code (Privacy-by-default verifiziert). / Initial draft; purpose→basis map + three LIAs. Grounded in live code. | Claude (Entwurf) |

> **Offene Punkte / Open items:** Eine Grundlage für L3 festlegen ((a) vs (b)); `LoginEvent`- und `ConsentRecord`-Fristen + fehlende Sweeps; Art.-8-Allokation im AVV; finale Einordnung der Doppelrolle. **Alle [TBD] durch Rechtsberatung bestätigen — kein user-facing Text ohne Sign-off.** / Resolve all [TBD] with counsel; no user-facing text without sign-off.
