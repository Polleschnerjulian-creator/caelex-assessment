> ┌─────────────────────────────────────────────────────────────────────────┐
> │ **ENTWURF / DRAFT** — Vorlage; vor Veröffentlichung bzw. Unterzeichnung │
> │ durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine │
> │ Rechtsberatung. / Template; must be reviewed and adapted by qualified │
> │ legal counsel before publication or execution. Not legal advice. │
> └─────────────────────────────────────────────────────────────────────────┘

# Transfer-Folgenabschätzung (TIA) — Caelex Scholar

# Transfer Impact Assessment (TIA) — Caelex Scholar

**Rechtsgrundlage / Legal basis:** Art. 44–49 DSGVO / GDPR · EuGH C-311/18 („Schrems II") · EDSA-Empfehlungen 01/2020 (ergänzende Maßnahmen) · EDSA-Empfehlungen 02/2020 (European Essential Guarantees)
**Gegenstand / Subject:** Drittland-Exposition durch US-Mutter­konzerne **Vercel** (Hosting/CDN) und **OpenAI** (Embeddings für die semantische Suche); nachrangig sonstige Sub-Auftragsverarbeiter mit US-/Drittland-Bezug.
**Stand / Last updated:** 7 June 2026
**Version:** 0.1 (Entwurf / Draft)
**Verbindliche Sprache / Binding language:** Deutsch; Englisch ist eine Arbeitsübersetzung.

> **Methodik (EDSA-6-Schritte).** (1) Transfers erfassen; (2) Transferinstrument identifizieren; (3) Wirksamkeit im Drittland-Recht bewerten; (4) ergänzende Maßnahmen prüfen; (5) Verfahrensschritte umsetzen; (6) periodisch neu bewerten.

---

## DE — Verbindliche Fassung

### Schritt 1 — Transfer-Mapping (welche Daten gehen wohin)

Caelex hält Stammdaten in der **EU** (Neon, Frankfurt). Drittland-Transfers entstehen primär durch US-Mutter­konzerne mit (teils nur administrativem) Zugriff sowie durch einen KI-Dienst in den USA.

| #   | Empfänger                                    | Daten                                                                                                        | Datenort                                                                  | Drittland-Exposition                                                        | Sensitivität                                           |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| T1  | **Vercel Inc. (US)**                         | Request-Metadaten, IP-Adressen, flüchtige Anwendungsdaten während der Verarbeitung; ausgelieferter Code      | USA mit EU-Regionen (fra1, cdg1) — Caelex nutzt **vorrangig EU-Regionen** | Verarbeitung vorrangig EU; **US-Verwaltungs-/Support-Zugriff** möglich      | mittel                                                 |
| T2  | **OpenAI L.L.C. (US)**                       | **Anfragetext** der semantischen Suche (kurze Queries) zur Vektor-Erzeugung; geroutet über Vercel AI Gateway | USA                                                                       | echter **Drittlandtransfer** des Anfragetexts                               | mittel–hoch (Anfragen können sensible Themen verraten) |
| T3  | **Neon Inc. (US-Mutter)**                    | Alle persistierten Scholar-Daten                                                                             | **EU eu-central-1 (Frankfurt)**                                           | Verarbeitung in EU; **US-Verwaltungszugriff** möglich                       | hoch (Stammdaten) — aber EU-lokalisiert                |
| T4  | **Resend Inc. (US)**                         | E-Mail-Adressen, Inhalte transaktionaler Mails (während Zustellung)                                          | USA mit EU-Edge                                                           | Transfer bei US-Verarbeitung                                                | gering–mittel                                          |
| T5  | **Sentry / Functional Software (US-Mutter)** | Stack-Traces, Request-Metadaten, **anonymisierte** User-IDs (PII-Scrubbing aktiv)                            | EU (Frankfurt), **Fallback USA**                                          | nur im Fallback                                                             | gering                                                 |
| T6  | **Upstash Inc. (US-Mutter)**                 | IP/User-IDs (TTL < 24h), kurzlebige Tokens                                                                   | **EU eu-west-1 (Dublin)**                                                 | Verarbeitung in EU; US-Support-Zugriff                                      | gering                                                 |
| T7  | **Google (SSO/OAuth)**                       | Authentifizierungs-Claims (Name, E-Mail)                                                                     | EU/USA                                                                    | [TBD: nur falls Google-OAuth für Scholar aktiv; primär hochschul-IdP]       | gering–mittel                                          |
| T8  | **LogSnag (Kanada)**                         | Ereignistyp, Caelex-interne IDs, Zeitstempel (server-only, **keine PII-Klartextfelder**)                     | Kanada                                                                    | **Angemessenheitsbeschluss** (Decision 2002/2/EG) → kein Schrems-II-Problem | gering                                                 |

**Fokus dieser TIA: T1 (Vercel) und T2 (OpenAI)** als die wesentlichen US-Expositionen; T3–T7 nachrangig (EU-lokalisiert oder geringe Sensitivität); T8 durch Angemessenheitsbeschluss abgedeckt.

---

### Schritt 2 — Transferinstrument (Art. 46)

| Empfänger                 | Instrument (verifizierter Live-Stand)                                                  | Bemerkung                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel                    | **EU-US Data Privacy Framework (DPF)** + **EU-Standardvertragsklauseln (SCC) Modul 3** | Doppelte Absicherung: DPF (Angemessenheit für zertifizierte US-Empfänger, Durchführungsbeschluss (EU) 2023/1795) **und** SCC als Fallback. |
| OpenAI                    | **EU-US DPF (zertifiziert)** + **SCC** + **Zero-Data-Retention**                       | Routing über Vercel AI Gateway; OpenAI = Sub-Sub-Prozessor unter Vercel.                                                                   |
| Neon                      | EU-Verarbeitung; **SCC** für US-Verwaltungszugriff                                     | Stammdaten in der EU → primär kein Transfer.                                                                                               |
| Resend / Sentry / Upstash | **SCC Modul 3**, teils DPF                                                             | EU-vorrangig; US nur Fallback/Support.                                                                                                     |

**Wichtiger Hinweis zum DPF.** Soweit Vercel und OpenAI unter dem **EU-US Data Privacy Framework zertifiziert** sind, beruht der Transfer auf einem **Angemessenheitsbeschluss** (Art. 45). Für DPF-gestützte Transfers ist **keine** zusätzliche TIA strikt erforderlich; gleichwohl wird hier — vorsorglich und wegen der laufenden gerichtlichen Angriffe auf das DPF — die SCC-Schiene mit Schrems-II-Prüfung mitbewertet. [TBD: aktuelle DPF-Zertifizierung beider Empfänger sowie Bestand des DPF-Angemessenheitsbeschlusses zum Stand prüfen.]

---

### Schritt 3 — Bewertung des Drittland-Rechts (US)

**Problemlage (Schrems II).** Der EuGH beanstandete bei US-Transfers v. a. **FISA 702** (Überwachung von „electronic communication service providers") und **EO 12333**, mangels durchsetzbarer Betroffenenrechte. Das DPF adressiert dies über das **Data Protection Review Court (DPRC)** und die EO 14086 (Verhältnismäßigkeit/Notwendigkeit); die Wirksamkeit ist jedoch **gerichtlich umstritten** und politisch volatil. [TBD: Anwalt bewertet aktuellen Status (Rechtsbehelfe gegen DPF; etwaige Personalbesetzung der Aufsichtsgremien).]

**Risikobezogene Einschätzung für Scholar-Daten.**

- **Niedrige praktische Zugriffswahrscheinlichkeit:** Scholar-Daten sind **akademische Rechtsrecherche-Metadaten** (Name/E-Mail via Hochschul-SSO, Präferenzen, kurze Suchanfragen). Sie sind **nicht** nachrichtendienstlich „interessant" und betreffen keine sicherheitsrelevanten Personengruppen.
- **EU-Lokalisierung der Stammdaten** (Neon Frankfurt) reduziert die Exposition auf **Verwaltungszugriffe** und den **OpenAI-Anfragetext-Transfer**.
- **Zero-Data-Retention** beim KI-Anbieter begrenzt die Verweildauer des Anfragetexts auf die Aufrufdauer.

---

### Schritt 4 — Ergänzende Maßnahmen (EDSA 01/2020)

| Kategorie           | Maßnahme (Status im Code, soweit verifizierbar)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technisch**       | • **Stammdaten in der EU gepinnt** (Neon eu-central-1 Frankfurt — verifiziert in Sub-Prozessor-Register). • **Vercel-Funktionen vorrangig in EU-Regionen** (fra1, cdg1). • **AES-256-GCM-Feldverschlüsselung** sensibler Felder at-rest; TLS in-transit. • **Datenminimierung** vor Transfer: an OpenAI gehen nur **kurze Anfragetexte**, kein Konto-/Profilkontext; an Sentry nur **anonymisierte** IDs (PII-Scrubbing). • **Maskierte IP** in Login-Ereignissen. • **Zero-Data-Retention** bei OpenAI (kein Klartext über Aufrufdauer hinaus, kein Training). |
| **Vertraglich**     | • **SCC Modul 3** mit Vercel/Resend/Sentry/Upstash; **DPF** zusätzlich. • **OpenAI:** DPF + SCC + ZDR; Routing als Sub-Sub-Prozessor unter Vercel (DPA-Durchgriff). • Verpflichtung zur **Transparenz über Behördenanfragen** und zur Anfechtung unzulässiger Anordnungen (Bestandteil der SCC/Anbieter-DPAs). [TBD: Vercel-, Neon-, OpenAI-DPAs **unterzeichnet** bestätigen.]                                                                                                                                                                                 |
| **Organisatorisch** | • Sub-Prozessor-Register öffentlich (`/legal/sub-processors`) mit Transfermechanismus je Empfänger. • **30-Tage-Vorab-Notifikation** bei Sub-Prozessor-Änderung (DPA § 10). • Periodische Neubewertung (Schritt 6). • Policy: Behördenanfragen werden geprüft, dokumentiert und — soweit zulässig — der/dem Verantwortlichen (Hochschule) gemeldet (Proc→Controller-Pfad; siehe Breach-Runbook).                                                                                                                                                                |

---

### Schritt 5 — Verfahrensschritte (umzusetzen)

1. **DPAs unterzeichnen/ablegen:** Vercel, Neon, OpenAI (bzw. Vercel-AI-Gateway-Durchgriff), Resend, Sentry, Upstash, (Google). [TBD: Nachweis ablegen.]
2. **EU-Region hart pinnen:** Neon eu-central-1; Vercel-Funktions-Regionen auf EU beschränken (Konfiguration verifizieren).
3. **DPF-Zertifizierung** der US-Empfänger periodisch prüfen (Vercel, OpenAI).
4. **Anfragetext-Minimierung** für die semantische Suche dokumentieren (nur Query, kein Kontext).
5. **Behördenanfrage-Playbook** verankern (Government-Access-Request → Breach-/Notification-Runbook).

---

### Schritt 6 — Periodische Neubewertung

Neubewertung **mindestens jährlich** sowie anlassbezogen bei: Wegfall/Änderung des DPF-Angemessenheitsbeschlusses, neuem Schrems-Urteil, Wechsel von Region/Anbieter, neuer (z. B. generativer) KI-Funktion. Owner: Verantwortlicher / DSB.

---

### Fazit (Entwurf)

Für die Scholar-Transfers besteht eine **doppelte Absicherung** (DPF **und** SCC). Die wesentlichen Risiken — **administrativer US-Zugriff** (T1/T3) und der **OpenAI-Anfragetext-Transfer** (T2) — werden durch **EU-Lokalisierung der Stammdaten, EU-vorrangiges Hosting, Datenminimierung, Verschlüsselung und Zero-Data-Retention** auf ein **vertretbares Restniveau** gesenkt. Angesichts der **geringen nachrichtendienstlichen Relevanz** akademischer Rechtsrecherche-Daten und der umgesetzten ergänzenden Maßnahmen ist der Transfer **vorbehaltlich** der folgenden Bestätigungen vertretbar:

1. **Unterzeichnete DPAs** (Vercel/Neon/OpenAI) liegen vor. **[TBD]**
2. **DPF-Zertifizierung** beider US-Empfänger und **Bestand des DPF-Angemessenheitsbeschlusses** zum Stand bestätigt. **[TBD]**
3. **EU-Region-Pinning** technisch verifiziert. **[TBD]**

> **Conclusion (Entwurf):** Transfer mit DPF + SCC + ergänzenden Maßnahmen **vertretbar**; **kein** voraussichtlich hohes Restrisiko für die betroffenen Personen — vorbehaltlich der drei Bestätigungen und der finalen Prüfung durch qualifizierte Rechtsberatung. Dieses Dokument ergänzt die DSFA (`dpia.md`, Risiko R4).

---

## EN — Convenience translation (non-binding)

### Step 1 — Transfer mapping

Caelex holds master data in the **EU** (Neon, Frankfurt). Third-country transfers arise mainly from US parent companies with (partly administrative-only) access and from a US AI service. **T1 Vercel (US):** request metadata, IP addresses, transient app data during processing; US with EU regions (fra1, cdg1), Caelex **prefers EU regions**; possible **US admin/support access**; sensitivity medium. **T2 OpenAI (US):** **query text** of the semantic search (short queries) for vector generation, routed via Vercel AI Gateway; **genuine third-country transfer** of the query text; sensitivity medium–high (queries can reveal sensitive topics). **T3 Neon (US parent):** all persisted Scholar data in **EU eu-central-1 (Frankfurt)**; processing in EU, possible **US admin access**; high (master data) but EU-localised. **T4 Resend (US):** email addresses, transactional content during delivery; low–medium. **T5 Sentry (US parent):** stack traces, request metadata, **anonymised** user IDs (PII scrubbing); EU Frankfurt, **US fallback**; low. **T6 Upstash (US parent):** IP/user IDs (TTL < 24h), short-lived tokens; **EU Dublin**; low. **T7 Google (SSO/OAuth):** auth claims (name, email); EU/US; [TBD: only if Google OAuth is enabled for Scholar; primarily the university IdP]; low–medium. **T8 LogSnag (Canada):** event type, Caelex-internal IDs, timestamps (server-only, **no plaintext PII**); covered by **adequacy decision** (2002/2/EC) → no Schrems II issue; low. **Focus of this TIA: T1 and T2.**

### Step 2 — Transfer instrument (Art. 46)

**Vercel:** **EU-US DPF** + **SCC Module 3** (double safeguard). **OpenAI:** **EU-US DPF (certified)** + **SCC** + **zero-data-retention** (routed via Vercel AI Gateway; sub-sub-processor). **Neon:** EU processing; **SCC** for US admin access. **Resend/Sentry/Upstash:** **SCC Module 3**, some DPF. **Note on DPF:** where Vercel and OpenAI are **DPF-certified**, the transfer rests on an **adequacy decision** (Art. 45), for which a separate TIA is not strictly required; the SCC track with a Schrems-II analysis is assessed here as a precaution given ongoing legal challenges to the DPF. [TBD: confirm current DPF certification of both recipients and the standing of the DPF adequacy decision.]

### Step 3 — Assessment of third-country law (US)

**Schrems II problem:** the CJEU criticised **FISA 702** and **EO 12333** for lack of enforceable data-subject rights. The DPF addresses this via the **Data Protection Review Court** and **EO 14086** (proportionality/necessity), but its effectiveness is **legally contested** and politically volatile. [TBD: counsel assesses current status.] **Risk-based view for Scholar data:** **low practical access likelihood** — Scholar data is **academic legal-research metadata** (name/email via university SSO, preferences, short queries), of **no** intelligence interest; **EU localisation** of master data (Neon Frankfurt) limits exposure to **admin access** and the **OpenAI query-text transfer**; **zero-data-retention** limits the query text's dwell time to the API call.

### Step 4 — Supplementary measures (EDPB 01/2020)

**Technical:** master data **pinned in the EU** (Neon eu-central-1 — verified); Vercel functions **prefer EU regions** (fra1, cdg1); **AES-256-GCM** field encryption at rest, TLS in transit; **data minimisation before transfer** — only **short query texts** to OpenAI (no account/profile context), only **anonymised** IDs to Sentry (PII scrubbing); **masked IP** in login events; **zero-data-retention** at OpenAI. **Contractual:** **SCC Module 3** with Vercel/Resend/Sentry/Upstash + DPF; **OpenAI** DPF + SCC + ZDR (sub-sub-processor under Vercel, DPA flow-through); government-access transparency and challenge obligations (part of SCC/provider DPAs). [TBD: confirm Vercel/Neon/OpenAI DPAs **signed**.] **Organisational:** public sub-processor register (`/legal/sub-processors`) with transfer mechanism per recipient; **30-day advance notice** of sub-processor changes (DPA § 10); periodic reassessment; government-request policy (reviewed, documented and — where lawful — reported to the controller/university; proc→controller path, see breach runbook).

### Step 5 — Procedural steps (to implement)

1. **Sign/file DPAs:** Vercel, Neon, OpenAI (or Vercel AI Gateway flow-through), Resend, Sentry, Upstash, (Google). [TBD: file evidence.] 2. **Hard-pin EU region:** Neon eu-central-1; restrict Vercel function regions to EU (verify config). 3. **Periodically check DPF certification** of US recipients (Vercel, OpenAI). 4. **Document query-text minimisation** for semantic search (query only, no context). 5. **Embed a government-access-request playbook** (→ breach/notification runbook).

### Step 6 — Periodic reassessment

At least **annually** and event-driven: loss/change of the DPF adequacy decision, a new Schrems ruling, region/provider change, a new (e.g. generative) AI feature. Owner: controller / DPO.

### Conclusion (draft)

Scholar transfers have a **double safeguard** (DPF **and** SCC). The main risks — **US admin access** (T1/T3) and the **OpenAI query-text transfer** (T2) — are reduced to an **acceptable residual level** by **EU localisation of master data, EU-preferred hosting, data minimisation, encryption and zero-data-retention**. Given the **low intelligence relevance** of academic legal-research data and the implemented supplementary measures, the transfer is acceptable **subject to**: (1) **signed DPAs** (Vercel/Neon/OpenAI) **[TBD]**; (2) confirmed **DPF certification** of both US recipients and **standing of the DPF adequacy decision** **[TBD]**; (3) technically verified **EU region pinning** **[TBD]**. **No** high residual risk is expected — subject to these confirmations and final review by qualified counsel. This document supplements the DPIA (`dpia.md`, risk R4).
