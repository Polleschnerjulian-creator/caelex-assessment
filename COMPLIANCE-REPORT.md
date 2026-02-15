# Caelex Regulatory Self-Compliance Report

**Datum:** 15. Februar 2026
**Erstellt von:** Automatisierte Compliance-Analyse
**Gegenstand:** Vollstandige regulatorische Selbstbewertung der Caelex-Plattform
**Standort:** Berlin, Deutschland | Betreiber: Julian Polleschner

---

## Executive Summary

Caelex wurde als Compliance-SaaS fur Weltraumregulierung entwickelt und muss selbst zahlreiche Gesetze und Verordnungen einhalten. Diese Analyse pruft die Einhaltung aller auf Caelex anwendbaren Vorschriften — von DSGVO uber deutsches Telemedienrecht bis hin zur ePrivacy-Richtlinie.

### Gesamtbewertung

| Bereich                                         | Score      | Status                                    |
| ----------------------------------------------- | ---------- | ----------------------------------------- |
| **DSGVO/GDPR (technisch)**                      | 62/100     | Kritische Lucken                          |
| **DSGVO/GDPR (rechtlich/Datenschutzerklarung)** | 9/10       | Exzellent                                 |
| **Impressum (SS 5 TMG/DDG)**                    | 6/10       | Handlungsbedarf                           |
| **AGB/Terms of Service**                        | 8/10       | Gut                                       |
| **Cookie-Richtlinie (TTDSG SS 25)**             | 9.5/10     | Exzellent                                 |
| **Drittanbieter-Tracking**                      | 9/10       | Gut                                       |
| **Gesamt-Compliance**                           | **72/100** | Fundament stark, kritische Lucken beheben |

---

## 1. Impressum — SS 5 TMG/DDG

**Datei:** `src/app/legal/impressum/page.tsx`

### Erfullt

| Anforderung               | Status  | Details                                      |
| ------------------------- | ------- | -------------------------------------------- |
| Name des Verantwortlichen | Konform | "Julian Polleschner"                         |
| Anschrift                 | Konform | "Am Maselakepark 37, 13587 Berlin"           |
| E-Mail-Adresse            | Konform | cs@caelex.eu                                 |
| Vertretungsbefugnis       | Konform | "Vertreten durch: Julian Polleschner"        |
| Haftungsausschluss Links  | Konform | SS 7 TMG korrekt referenziert                |
| EU-Streitbeilegung        | Konform | https://ec.europa.eu/consumers/odr/ verlinkt |
| Copyright                 | Konform | Vollstandiger Copyright-Hinweis              |

### KRITISCHE LUCKEN

| Anforderung         | Status | Pflicht                                                  |
| ------------------- | ------ | -------------------------------------------------------- |
| **Rechtsform**      | FEHLT  | Einzelunternehmer/GbR/GmbH angeben                       |
| **Telefonnummer**   | FEHLT  | SS 5 TMG verlangt telefonische Erreichbarkeit            |
| **Handelsregister** | FEHLT  | Registergericht + HRB-Nummer (falls eingetragen)         |
| **USt-IdNr.**       | FEHLT  | SS 28a UStG — "Nicht umsatzsteuerpflichtig" wenn befreit |

### Empfehlung

Im Impressum erganzen:

```
Rechtsform: [z.B. Einzelunternehmer]
Registergericht: [z.B. Amtsgericht Berlin-Charlottenburg, HRB XXXXXX]
USt-IdNr.: DE[XX] XXXXXXXXXX (oder "Nicht umsatzsteuerpflichtig")
Telefon: [Nummer]
```

**Prioritat:** HOCH — Innerhalb von 2 Wochen beheben

---

## 2. Datenschutzerklarung — DSGVO Art. 13/14

**Datei:** `src/app/legal/privacy/page.tsx`

### Erfullt (9/10)

| DSGVO-Anforderung              | Status  | Details                                        |
| ------------------------------ | ------- | ---------------------------------------------- |
| Identitat des Verantwortlichen | Konform | Vollstandig mit Adresse                        |
| Zwecke der Verarbeitung        | Konform | Alle Zwecke einzeln aufgefuhrt                 |
| Rechtsgrundlagen (Art. 6)      | Konform | Art. 6(1)(a)/(b)/(c)/(f) jeweils zugeordnet    |
| Empfanger/Kategorien           | Konform | 8 Auftragsverarbeiter mit Rollen               |
| Drittlandtransfers             | Konform | EU-US DPF + SCCs dokumentiert                  |
| Speicherfristen                | Konform | Detaillierte Tabelle pro Kategorie             |
| Betroffenenrechte              | Konform | Alle 8 Rechte (Art. 15-21, 77) aufgefuhrt      |
| Widerrufsrecht Einwilligung    | Konform | Art. 7(3) explizit genannt                     |
| Beschwerderecht                | Konform | Berliner Datenschutzbeauftragte mit Adresse    |
| Automatisierte Entscheidungen  | Konform | Art. 22 — keine automatisierten Entscheidungen |
| Datenschutzverletzungen        | Konform | Art. 33/34 Verfahren dokumentiert              |

### Starken

- 12 umfassende Abschnitte mit allen DSGVO-Anforderungen
- Transparente KI-Dokumentation (ASTRA als Werkzeug vs. automatisierte Entscheidung)
- Granulare Speicherfristen (uber gesetzliches Minimum hinaus)
- Spezifische Verschlusselungsstandards genannt (TLS 1.3, AES-256-GCM, bcrypt 12 Runden)

### Offene Punkte

- **DSB-Kontakt:** Wenn ein Datenschutzbeauftragter bestellt ist, muss er genannt werden
- **Pflichtfelder:** Klarstellen welche Felder fur Vertragserfullung zwingend sind
- **Anthropic/ASTRA:** Transfer an Anthropic erwahnt, aber nicht in Auftragsverarbeiter-Tabelle (Details siehe Abschnitt 5)

---

## 3. AGB/Terms of Service — BGB/AGB-Recht

**Datei:** `src/app/legal/terms/page.tsx`

### Erfullt (8/10)

| Anforderung                   | Status  | Details                                                                    |
| ----------------------------- | ------- | -------------------------------------------------------------------------- |
| Parteiidentifikation          | Konform | SS 1(1) vollstandig                                                        |
| Leistungsbeschreibung         | Konform | SS 2 — alle Module aufgefuhrt                                              |
| Haftungsausschluss Assessment | Konform | SS 2(3) — "Keine Rechtsberatung"                                           |
| Preise                        | Konform | SS 6 — exkl. MwSt., Stripe-Zahlung                                         |
| Haftungsbegrenzung            | Konform | SS 9 — 4-stufig (Vorsatz/grobe Fahrlassigkeit/Kardinalpflichten/mittelbar) |
| Gerichtsstand                 | Konform | SS 16(2) — Berlin fur Kaufleute                                            |
| Salvatorische Klausel         | Konform | SS 16(3)                                                                   |
| Kundigungsrechte              | Konform | SS 12 — 30-Tage-Frist, ausserordentlich moglich                            |
| IP-Schutz                     | Konform | SS 3 — umfassender Schutz                                                  |
| Verbotene Nutzung             | Konform | SS 4 — Reverse Engineering, Scraping, etc.                                 |
| Auftragsverarbeitung (AVV)    | Konform | SS 11(2) — auf Anfrage per Art. 28 DSGVO                                   |
| SLA/Verfugbarkeit             | Konform | SS 7 — 99.5% Uptime                                                        |
| Hohre Gewalt                  | Konform | SS 8 — inkl. Cyberangriffe                                                 |
| Anderungen der AGB            | Konform | SS 15 — 30-Tage-Frist, Widerspruchsrecht                                   |

### KRITISCHE LUCKE: Widerrufsrecht (SS 312g BGB)

**Problem:** Fur Verbraucher (B2C) besteht ein 14-tagiges Widerrufsrecht, es sei denn, die digitale Leistung wird sofort erbracht (SS 312g(2) BGB). Die AGB:

- Unterscheiden nicht zwischen Verbraucher und Unternehmer
- Berufen sich nicht explizit auf die Ausnahme SS 312g(2) BGB
- Enthalten kein Muster-Widerrufsformular (SS 312f BGB)

**Empfehlung:** Neuen Paragraphen einfugen:

```
SS 5(4) — Ausschluss des Widerrufsrechts

Gemas SS 312g Abs. 2 BGB entfallt das Widerrufsrecht bei digitalen Inhalten,
die unmittelbar nach Vertragsschluss bereitgestellt werden, wenn der Verbraucher
ausdrucklich zugestimmt hat. Kostenpflichtige Abonnements werden sofort nach
Zahlungseingang freigeschaltet.
```

**Prioritat:** HOCH

---

## 4. Cookie-Richtlinie — TTDSG SS 25 / ePrivacy

**Dateien:** `src/app/legal/cookies/page.tsx` + `src/components/CookieConsent.tsx` + `src/components/ConditionalAnalytics.tsx`

### Erfullt (9.5/10)

| Anforderung                                 | Status    | Details                                                                    |
| ------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| Unterscheidung essenziell/nicht-essenziell  | Konform   | Klare Trennung in Policy + Code                                            |
| Granulare Einwilligung                      | Exzellent | 4 Kategorien: Notwendig (gesperrt), Analytics, Performance, Error Tracking |
| Einwilligung VOR nicht-essenziellen Cookies | Konform   | ConditionalAnalytics + Sentry pruen localStorage                           |
| Cookie-Liste mit Zwecken                    | Konform   | Detaillierte Tabellen                                                      |
| Cookie-Dauer                                | Konform   | Alle Laufzeiten angegeben                                                  |
| Widerruf der Einwilligung                   | Konform   | Anleitung + "Cookie-Einstellungen" Button im Footer                        |
| Rechtsgrundlage                             | Konform   | Art. 6(1)(f) fur notwendige, Art. 6(1)(a) fur Analytics                    |
| Kein Dark Pattern                           | Konform   | "Ablehnen" und "Alle akzeptieren" gleichwertig gestaltet                   |

### Technische Umsetzung — hervorragend

```typescript
// CookieConsent.tsx — Default: alles aus
const DEFAULT_PREFS = {
  necessary: true, // Immer an
  analytics: false, // Opt-in erforderlich
  performance: false, // Opt-in erforderlich
  errorTracking: false, // Opt-in erforderlich
};
```

```typescript
// ConditionalAnalytics.tsx — Bedingte Ladung
{analyticsAllowed && <Analytics />}
{performanceAllowed && <SpeedInsights />}
```

```typescript
// sentry.client.config.ts — Einwilligungsprufung vor Init
if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !hasErrorTrackingConsent()) {
  // Sentry ist ein No-Op ohne init
}
```

### Kleiner Befund: Google Tag Manager DNS Prefetch

In `layout.tsx` existiert:

```html
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
```

Google Analytics/GTM wird jedoch nirgends geladen. **Empfehlung:** DNS-Prefetch entfernen, da nicht verwendet.

---

## 5. DSGVO Technische Compliance — KRITISCHE BEFUNDE

### 5.1 Audit-Log Loschung bei Kontolschung (Art. 5(1)(e))

**Schweregrad: KRITISCH**

**Problem:** Bei Kontolschung (`/api/user/delete`) werden durch `onDelete: Cascade` samtliche Audit-Logs geloscht:

```prisma
model AuditLog {
  userId  String
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Widerspruch:**

- Datenschutzerklarung verspricht: "Audit-Logs: **7 Jahre**"
- Code loscht Audit-Logs sofort bei Kontolschung
- Art. 5(1)(e) verlangt Aufbewahrung fur berechtigte Interessen

**Losung:** `onDelete: Cascade` durch Anonymisierung ersetzen:

```typescript
// Statt Cascade: userId durch Hash ersetzen
await prisma.auditLog.updateMany({
  where: { userId },
  data: { userId: `DELETED_USER_${hash(userId)}` },
});
```

### 5.2 Datenubertragung an Anthropic ohne Rechtsgrundlage (Art. 44-49)

**Schweregrad: KRITISCH**

**Problem:** ASTRA sendet Benutzerdaten an die Anthropic API (San Francisco, USA):

```typescript
// src/lib/astra/engine.ts
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
```

- Datenschutzerklarung erwahnt ASTRA-Verarbeitung (Zeile 483-498)
- **Anthropic fehlt in der Auftragsverarbeiter-Tabelle**
- Keine SCCs, kein EU-US DPF fur Anthropic dokumentiert
- Kein Opt-in vor ASTRA-Nutzung
- Gesprache enthalten potenziell sensible Compliance-Daten

**Losung:**

1. Anthropic in Auftragsverarbeiter-Tabelle der Datenschutzerklarung aufnehmen
2. Data Processing Agreement (DPA) mit Anthropic abschliessen
3. SCCs oder EU-US DPF als Transfermechanismus dokumentieren
4. Opt-in-Dialog vor erster ASTRA-Nutzung implementieren

### 5.3 Keine Datenportabilitat trotz Zusage (Art. 20)

**Schweregrad: KRITISCH**

**Problem:** Datenschutzerklarung (Zeile 755) verspricht:

> "JSON/CSV Export in den Kontoeinstellungen verfugbar"

**Realitat:** Es existiert kein `/api/user/export`-Endpunkt. Benutzer konnen nicht exportieren:

- Profildaten (Name, E-Mail, Organisation)
- Assessment-Antworten + Ergebnisse
- Hochgeladene Dokumente
- Benachrichtigungseinstellungen
- ASTRA-Gesprachsverlauf

**Losung:** `/api/user/export`-Endpunkt implementieren der alle personenbezogenen Daten in JSON/CSV zuruckgibt.

### 5.4 Keine Einwilligungserfassung bei Registrierung (Art. 6/7)

**Schweregrad: HOCH**

**Problem:** Das Registrierungsformular enthalt keine Checkboxen fur:

- Einwilligung in Datenverarbeitung (Art. 6)
- Marketing/Analytics
- E-Mail-Kommunikation
- ASTRA KI-Verarbeitung

**RegisterSchema** (`src/lib/validations.ts`) validiert nur: name, email, password, organization — keine Consent-Flags.

**Losung:**

1. Consent-Checkboxen im Registrierungsformular
2. `Consent`-Model in Prisma-Schema
3. Consent-Zeitstempel in Datenbank speichern

### 5.5 Analytics trackt userId ohne Einwilligung (Art. 6/7)

**Schweregrad: HOCH**

**Problem:** `useAnalyticsTracking`-Hook identifiziert Benutzer automatisch:

```typescript
// src/hooks/useAnalyticsTracking.ts
// Auto-identifies user via session.user.id
```

- Datenschutzerklarung spricht von "anonymen Nutzungsstatistiken"
- userId ist jedoch **nicht anonym**
- Kein expliziter Opt-in vor Benutzer-Identifizierung

**Losung:** Analytics nur mit expliziter Einwilligung an userId koppeln; ohne Einwilligung anonyme Zählung.

### 5.6 Verschlusselungsumfang begrenzt (Art. 25, 32)

**Schweregrad: MITTEL**

Verschlusselt (AES-256-GCM):

- `User.taxId`, `User.phoneNumber`
- `Organization.vatNumber`, `Organization.bankAccount`, `Organization.taxId`
- `InsuranceAssessment.policyNumber`
- `EnvironmentalAssessment.internalNotes`

**Nicht verschlusselt:** E-Mail-Adressen, Assessment-Inhalte, Dokumentmetadaten, Incident-Reports, NIS2-Assessment-Daten.

### 5.7 Fehlende Datenbereinigung (Art. 5(1)(e))

**Schweregrad: MITTEL**

Kein Cleanup-Cron fur:

- Abgelaufene Sessions
- Alte AnalyticsEvents (kein TTL sichtbar)
- Alte ASTRA-Conversations
- Abgelaufene VerificationTokens

---

## 6. Gesetzeskarte — Alle anwendbaren Vorschriften

| Gesetz/Verordnung                    | Anwendbar        | Compliance | Handlung                                   |
| ------------------------------------ | ---------------- | ---------- | ------------------------------------------ |
| **DSGVO/GDPR** (EU 2016/679)         | Ja               | Teilweise  | 3 kritische Lucken beheben                 |
| **BDSG** (Bundesdatenschutzgesetz)   | Ja               | Konform    | DSB-Pflicht prufen (Art. 37/SS 38)         |
| **TMG/DDG** SS 5 (Impressum)         | Ja               | Teilweise  | 4 fehlende Angaben erganzen                |
| **TTDSG** SS 25 (Cookies/ePrivacy)   | Ja               | Konform    | Exzellente Umsetzung                       |
| **BGB** SS 312-312k (Fernabsatz)     | Ja (B2C)         | Teilweise  | Widerrufsrecht-Klausel fehlt               |
| **AGB-Recht** (SS 305-310 BGB)       | Ja               | Konform    | Umfassende AGB vorhanden                   |
| **UStG** SS 28a (USt-IdNr.)          | Ja               | Teilweise  | Im Impressum erganzen                      |
| **AO** SS 147 (Aufbewahrungsfristen) | Ja               | Konform    | 10 Jahre fur Rechnungsdaten                |
| **HGB** SS 238-261 (Buchfuhrung)     | Wenn eingetragen | Zu prufen  | Handelsregistereintrag unklar              |
| **EU AI Act** (EU 2024/1689)         | Potenziell       | Zu prufen  | ASTRA als KI-System klassifizieren         |
| **ePrivacy-Richtlinie** 2002/58/EC   | Ja               | Konform    | Consent-Before-Tracking implementiert      |
| **PSD2** (EU 2015/2366)              | Nein             | N/A        | Stripe ubernimmt Zahlungsabwicklung        |
| **NIS2** (EU 2022/2555)              | Potenziell       | Zu prufen  | Als SaaS-Anbieter moglicherweise betroffen |
| **BFSG/EAA** (Barrierefreiheit)      | Ab Juni 2025     | Konform    | WCAG 2.1 AA implementiert (dc3289c)        |
| **Urheberrecht** (UrhG)              | Ja               | Konform    | IP-Schutz in AGB SS 3                      |

---

## 7. Starken

1. **Hervorragende Datenschutzerklarung** — 12 Abschnitte, alle DSGVO-Anforderungen abgedeckt, spezifische technische Massnahmen genannt
2. **Exzellente Cookie-Consent-Architektur** — Granulare 4-Kategorien-Auswahl, Server-seitige Durchsetzung, kein Dark Pattern
3. **Starke Verschlusselung** — AES-256-GCM mit scrypt-Schlüsselableitung, bcrypt 12 Runden fur Passworter
4. **Umfassende AGB** — IP-Schutz, SLA, Haftungsbegrenzung, Force Majeure inkl. Cyberangriffe
5. **Audit-Trail mit Hash-Kette** — Manipulationssicherer Audit-Trail
6. **Rate Limiting** — 7-stufiges System mit Upstash Redis
7. **WCAG 2.1 AA** — Vollstandige Barrierefreiheit implementiert
8. **Drittanbieter-Transparenz** — 7 von 8 Auftragsverarbeitern mit Safeguards dokumentiert
9. **Sentry consent-first** — Error Tracking erst nach Einwilligung
10. **Security Headers** — CSP, HSTS (2 Jahre Preload), X-Frame-Options DENY

---

## 8. Schwachen / Handlungsbedarf

### KRITISCH (Innerhalb 2 Wochen)

| #   | Befund                                                         | Gesetz             | Losung                                              |
| --- | -------------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| 1   | Audit-Logs werden bei Kontolschung geloscht statt anonymisiert | DSGVO Art. 5(1)(e) | `onDelete: Cascade` durch Anonymisierung ersetzen   |
| 2   | Anthropic nicht als Auftragsverarbeiter dokumentiert           | DSGVO Art. 44-49   | DPA abschliessen, in Datenschutzerklarung aufnehmen |
| 3   | Kein Datenexport-Endpunkt trotz Zusage                         | DSGVO Art. 20      | `/api/user/export` implementieren                   |
| 4   | Impressum unvollstandig                                        | SS 5 TMG/DDG       | Rechtsform, Telefon, USt-IdNr., Register erganzen   |
| 5   | Widerrufsrecht nicht geregelt                                  | SS 312g BGB        | Ausnahme-Klausel in AGB einfugen                    |

### HOCH (Innerhalb 1 Monat)

| #   | Befund                                         | Gesetz                  | Losung                                  |
| --- | ---------------------------------------------- | ----------------------- | --------------------------------------- |
| 6   | Keine Einwilligungserfassung bei Registrierung | DSGVO Art. 6/7          | Consent-Checkboxen + DB-Model           |
| 7   | Analytics trackt userId ohne Opt-in            | DSGVO Art. 6/7          | Nur mit Einwilligung identifizieren     |
| 8   | ASTRA ohne Opt-in nutzbar                      | DSGVO Art. 6/7, Art. 44 | Opt-in-Dialog vor erster Nutzung        |
| 9   | Google Tag Manager DNS-Prefetch                | TTDSG SS 25             | Entfernen (nicht verwendet)             |
| 10  | DSB-Kontakt fehlt                              | DSGVO Art. 37           | Prufen ob DSB bestellt; wenn ja, nennen |

### MITTEL (Innerhalb 3 Monaten)

| #   | Befund                                              | Gesetz             | Losung                                        |
| --- | --------------------------------------------------- | ------------------ | --------------------------------------------- |
| 11  | Verschlusselungsumfang begrenzt                     | DSGVO Art. 25, 32  | E-Mails, Assessments, Incidents verschlusseln |
| 12  | Keine Datenbereinigung (Sessions, Analytics, ASTRA) | DSGVO Art. 5(1)(e) | Cleanup-Cron-Jobs implementieren              |
| 13  | Kein automatischer Breach-Eskalationsprozess        | DSGVO Art. 33/34   | Sentry-to-DPO-Pipeline aufbauen               |
| 14  | DPIA nicht dokumentiert                             | DSGVO Art. 35      | "DPIA auf Anfrage" in Datenschutzerklarung    |
| 15  | B2C vs. B2B nicht differenziert in AGB              | SS 310 BGB         | Verbraucherschutz-Hinweise erganzen           |

---

## 9. Risikobewertung

### Bussgeldrisiko

| Verstoss                          | Max. Bussgeld                        | Wahrscheinlichkeit |
| --------------------------------- | ------------------------------------ | ------------------ |
| Art. 44-49 (Anthropic-Transfer)   | Bis 20 Mio. EUR oder 4% Jahresumsatz | Mittel             |
| Art. 20 (Portabilitat)            | Bis 20 Mio. EUR oder 4% Jahresumsatz | Niedrig            |
| Art. 5(1)(e) (Audit-Log-Loschung) | Bis 20 Mio. EUR oder 4% Jahresumsatz | Niedrig            |
| SS 5 TMG (Impressum)              | Bis 50.000 EUR                       | Mittel             |
| SS 312g BGB (Widerrufsrecht)      | Abmahnung (1.000-5.000 EUR typisch)  | Mittel             |

### Zustandige Behorde

- **Datenschutz:** Berliner Beauftragte fur Datenschutz und Informationsfreiheit, Friedrichstr. 219, 10969 Berlin
- **Telemedien:** Landesmedienanstalt Berlin-Brandenburg
- **Verbraucherschutz:** Verbraucherzentrale Berlin

---

## 10. Massnahmenplan

### Woche 1-2 (KRITISCH)

- [ ] Impressum: Rechtsform, Telefon, USt-IdNr., Registergericht erganzen
- [ ] AGB: Widerrufsrecht-Ausnahme SS 312g(2) BGB einfugen
- [ ] Audit-Logs: `onDelete: Cascade` durch Anonymisierung ersetzen
- [ ] Datenschutzerklarung: Anthropic als Auftragsverarbeiter aufnehmen
- [ ] Google Tag Manager DNS-Prefetch aus layout.tsx entfernen

### Monat 1 (HOCH)

- [ ] `/api/user/export`-Endpunkt fur Datenportabilitat implementieren
- [ ] Consent-Checkboxen bei Registrierung + `Consent`-DB-Model
- [ ] ASTRA Opt-in-Dialog vor erster Nutzung
- [ ] Analytics: userId nur mit expliziter Einwilligung verknupfen
- [ ] DPA mit Anthropic abschliessen

### Monat 2-3 (MITTEL)

- [ ] Verschlusselungsumfang erweitern (E-Mails, Assessments)
- [ ] Cleanup-Cron-Jobs (Sessions, AnalyticsEvents, VerificationTokens)
- [ ] Breach-Detection-to-Escalation-Pipeline
- [ ] DPIA-Framework dokumentieren
- [ ] AGB: B2C/B2B-Differenzierung
- [ ] DPA-Vorlage fur B2B-Kunden erstellen

---

## 11. Fazit

Caelex hat ein **starkes regulatorisches Fundament** aufgebaut — insbesondere die Datenschutzerklarung (9/10), Cookie-Consent-Architektur (9.5/10) und Sicherheitsinfrastruktur sind vorbildlich. Die Plattform demonstriert genuines Engagement fur Datenschutz und Compliance.

**Jedoch bestehen drei kritische Lucken:**

1. **Audit-Log-Loschung** widerspricht der eigenen 7-Jahres-Aufbewahrungszusage
2. **Anthropic-Datentransfer** ohne dokumentierte Rechtsgrundlage (DPA/SCCs)
3. **Datenportabilitat** zugesagt aber nicht implementiert

Nach Behebung der kritischen und hohen Befunde (Zeitrahmen: 4-6 Wochen) erreicht Caelex eine **Compliance von uber 90%** mit allen anwendbaren Vorschriften.

**Gesamtbewertung: 72/100** — Starkes Fundament, kritische Lucken zeitnah beheben.
