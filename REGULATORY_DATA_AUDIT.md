# Caelex Regulatory Data — Vollständiger Audit

**Stand:** 14. März 2026
**Zweck:** Validierung durch Space-Law-Experten (Prof. Hobe)
**Codebase:** Caelex v1 — Space Regulatory Compliance SaaS Platform

---

## Zusammenfassung

| Kategorie                                      | Anzahl                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Encoded Regulierungen                          | 12 (EU Space Act, NIS2, 10 nationale Gesetze, IADC, COPUOS, ISO 24113, ITU, ITAR, EAR, UK Space Act, US FCC/FAA/NOAA, GDPR) |
| EU Space Act Artikel (referenziert)            | 119 (Art. 1–119)                                                                                                            |
| EU Space Act Artikel (mit Logik implementiert) | ~45                                                                                                                         |
| NIS2 Requirements (encoded)                    | 51                                                                                                                          |
| Compliance Thresholds (quantitativ)            | 9 Kern-Thresholds + 12 Sentinel-Regeln                                                                                      |
| Dokumenttypen (NCA)                            | 20 (davon 9 mit Template, 8 nur Referenz, 3 nicht implementiert)                                                            |
| Autorisierungsdokumente                        | 22                                                                                                                          |
| Jurisdiktionen                                 | 10 (FR, UK, BE, NL, LU, AT, DK, DE, IT, NO)                                                                                 |
| Operator-Typen                                 | 7 (SCO, LO, LSO, ISOS, CAP, PDP, TCO)                                                                                       |
| Cross-References (NIS2 ↔ EU Space Act)         | 128+                                                                                                                        |
| Scoring-Module (Dashboard)                     | 7                                                                                                                           |
| Scoring-Module (Ephemeris/Satellite)           | 9                                                                                                                           |
| Incident-Klassifikationen                      | 9                                                                                                                           |

---

## 1. EU Space Act (COM(2025) 335)

### 1.1 Encoded Artikel

Alle 119 Artikel sind im System referenziert. Die folgende Tabelle zeigt den Implementierungsstatus.

**Legende:**

- **Implementiert** = Operative Logik (Threshold-Check, Scoring, Assessment, Dokumentgenerierung)
- **Referenziert** = Label/Beschreibung vorhanden, keine operative Logik

#### Titel I: Allgemeine Bestimmungen (Art. 1–5)

| Artikel | Titel                | Status       | Dateien                |
| ------- | -------------------- | ------------ | ---------------------- |
| Art. 1  | Gegenstand           | Referenziert | `src/data/articles.ts` |
| Art. 2  | Anwendungsbereich    | Referenziert | `src/data/articles.ts` |
| Art. 3  | Freier Warenverkehr  | Referenziert | `src/data/articles.ts` |
| Art. 4  | Nationale Sicherheit | Referenziert | `src/data/articles.ts` |
| Art. 5  | Definitionen         | Referenziert | `src/data/articles.ts` |

#### Titel II: Genehmigung & Registrierung (Art. 6–30)

| Artikel    | Titel                            | Status            | Operator-Typen     | Dateien                                            |
| ---------- | -------------------------------- | ----------------- | ------------------ | -------------------------------------------------- |
| Art. 6     | Genehmigungspflicht              | **Implementiert** | SCO, LO, LSO, ISOS | `src/lib/engine.server.ts`, `src/data/articles.ts` |
| Art. 7     | Antragsverfahren                 | **Implementiert** | SCO, LO, LSO, ISOS | `src/lib/engine.server.ts`                         |
| Art. 8     | Genehmigungsentscheidung         | **Implementiert** | SCO, LO, LSO, ISOS | `src/lib/engine.server.ts`                         |
| Art. 9     | Konstellationsgenehmigung        | **Implementiert** | SCO                | `src/lib/engine.server.ts`                         |
| Art. 10    | Light Regime & Ausnahmen         | **Implementiert** | SCO, LO, LSO, ISOS | `src/lib/engine.server.ts` (< 100 kg / 5 Jahre)    |
| Art. 11–13 | EU-eigene Assets                 | Referenziert      | SCO, LO            | `src/data/articles.ts`                             |
| Art. 14–15 | TCO-Registrierung                | Referenziert      | TCO                | `src/data/articles.ts`                             |
| Art. 16    | EU-Rechtsvertreter               | Referenziert      | TCO                | `src/data/articles.ts`                             |
| Art. 17–19 | Ausnahmen (Launch, Gov, Notfall) | Referenziert      | TCO                | `src/data/articles.ts`                             |
| Art. 20–23 | Kommissionsentscheidungen TCO    | Referenziert      | TCO                | `src/data/articles.ts`                             |
| Art. 24    | URSO-Einrichtung                 | **Implementiert** | ALL                | `src/data/articles.ts`                             |
| Art. 25    | e-Zertifikat                     | Referenziert      | TCO, PDP           | `src/data/articles.ts`                             |
| Art. 26    | Dienstleistungserbringung        | Referenziert      | ALL                | `src/data/articles.ts`                             |
| Art. 27    | Datenanbieterpflichten           | Referenziert      | PDP                | `src/data/articles.ts`                             |
| Art. 28–31 | NCA-Befugnisse                   | Referenziert      | ALL                | `src/data/articles.ts`, `src/data/ncas.ts`         |

#### Titel III: Governance & Verwaltung (Art. 32–51)

| Artikel    | Titel                            | Status            | Operator-Typen     | Dateien                              |
| ---------- | -------------------------------- | ----------------- | ------------------ | ------------------------------------ |
| Art. 32–39 | Qualifizierte Technische Stellen | Referenziert      | ALL                | `src/data/articles.ts`               |
| Art. 40–43 | EUSPA-Aufgaben                   | Referenziert      | ALL                | `src/data/articles.ts`               |
| Art. 44    | Versicherungspflicht             | **Implementiert** | SCO, LO, LSO, ISOS | `src/data/insurance-requirements.ts` |
| Art. 45    | Mindestdeckung                   | **Implementiert** | SCO, LO, LSO, ISOS | `src/data/insurance-requirements.ts` |
| Art. 46    | Startanbieter-Versicherung       | **Implementiert** | LO, LSO            | `src/data/insurance-requirements.ts` |
| Art. 47    | Haftpflicht Dritter              | **Implementiert** | SCO, LO, LSO, ISOS | `src/data/insurance-requirements.ts` |
| Art. 48    | Versicherungsprüfung             | Referenziert      | SCO, LO, LSO, ISOS | `src/data/articles.ts`               |
| Art. 49    | Finanzgarantie-Alternativen      | Referenziert      | SCO, LO, LSO, ISOS | `src/data/articles.ts`               |
| Art. 50    | Staatliche Freistellung          | Referenziert      | ALL                | `src/data/articles.ts`               |
| Art. 51    | Versicherungsberichterstattung   | Referenziert      | SCO, LO, LSO, ISOS | `src/data/articles.ts`               |

#### Titel IV: Technische Anforderungen & Sicherheit (Art. 52–103)

**Untersuchung & Durchsetzung (Art. 52–57):**

| Artikel    | Titel                          | Status       | Dateien                |
| ---------- | ------------------------------ | ------------ | ---------------------- |
| Art. 52–54 | Untersuchungsbefugnisse        | Referenziert | `src/data/articles.ts` |
| Art. 55    | Korrekturmaßnahmen             | Referenziert | `src/data/articles.ts` |
| Art. 56–57 | Bußgelder (max. 2% Weltumsatz) | Referenziert | `src/data/articles.ts` |

**Debris & Sicherheit (Art. 58–73):**

| Artikel    | Titel                            | Status            | Operator-Typen | Dateien                                                                   |
| ---------- | -------------------------------- | ----------------- | -------------- | ------------------------------------------------------------------------- |
| Art. 58    | Startsicherheitsplan             | Referenziert      | LO             | `src/data/debris-requirements.ts`                                         |
| Art. 59    | Flugsicherungssysteme            | Referenziert      | LO             | `src/data/debris-requirements.ts`                                         |
| Art. 60–61 | Starttrümmerkontrolle            | Referenziert      | LO             | `src/data/debris-requirements.ts`                                         |
| Art. 62    | Wiedereintrittsicherheit         | Referenziert      | LO             | `src/data/debris-requirements.ts`                                         |
| Art. 63    | Trackability                     | Referenziert      | SCO            | `src/data/debris-requirements.ts`                                         |
| Art. 64    | Kollisionsvermeidung             | **Implementiert** | SCO            | `thresholds.ts:50`, `sentinel/rule-definitions.ts:62`                     |
| Art. 65    | Wiedereintrittskoordinierung     | Referenziert      | SCO            | `src/data/debris-requirements.ts`                                         |
| Art. 66    | Manövrierfähigkeit               | **Implementiert** | SCO            | `sentinel/rule-definitions.ts:48`                                         |
| Art. 67    | Debris Mitigation Plan           | **Implementiert** | SCO            | DMP-Template, IADC-Compliance                                             |
| Art. 68    | 25-Jahre-Regel / Lebensdauer     | **Implementiert** | SCO            | `thresholds.ts:34`, `orbital-decay.ts`, `sentinel/rule-definitions.ts:17` |
| Art. 69–70 | Große Konstellationen (>100 Sat) | Referenziert      | SCO            | `src/data/articles.ts`                                                    |
| Art. 70    | Passivierung (Treibstoffreserve) | **Implementiert** | SCO            | `thresholds.ts:26`, `sentinel/rule-definitions.ts:31`                     |
| Art. 71    | Missionsverlängerung             | Referenziert      | SCO            | `src/data/articles.ts`                                                    |
| Art. 72    | End-of-Life Entsorgung           | **Implementiert** | SCO            | `thresholds.ts:42`, `sentinel/rule-definitions.ts:81`                     |
| Art. 73    | Lieferketten-Compliance          | Referenziert      | SCO, LO        | `src/data/articles.ts`                                                    |

**Cybersecurity (Art. 74–95):**

| Artikel    | Titel                          | Status            | Dateien                                         |
| ---------- | ------------------------------ | ----------------- | ----------------------------------------------- |
| Art. 74–75 | NIS2-Grundsätze                | **Implementiert** | `src/data/cybersecurity-requirements.ts`        |
| Art. 76–78 | Risikomanagement               | **Implementiert** | `src/data/cybersecurity-requirements.ts`        |
| Art. 79–82 | InfoSec, Zugang, Krypto        | **Implementiert** | `src/data/cybersecurity-requirements.ts`        |
| Art. 83–85 | Erkennung, Monitoring, BCP     | **Implementiert** | `src/data/cybersecurity-requirements.ts`        |
| Art. 86–88 | Vereinfachtes Risikomanagement | Referenziert      | `src/data/articles.ts`                          |
| Art. 89–92 | Incident Reporting             | **Implementiert** | `src/lib/services/incident-response-service.ts` |
| Art. 93–95 | EUSRN                          | Referenziert      | `src/data/articles.ts`                          |

**Umwelt (Art. 96–100):**

| Artikel  | Titel                      | Status            | Dateien                                  |
| -------- | -------------------------- | ----------------- | ---------------------------------------- |
| Art. 96  | EF-Berechnungspflicht      | **Implementiert** | `src/data/environmental-requirements.ts` |
| Art. 97  | Umweltfußabdruck-Erklärung | **Implementiert** | EFD-Template                             |
| Art. 98  | LCA-Methodik               | Referenziert      | `src/data/environmental-requirements.ts` |
| Art. 99  | Lieferantendaten           | Referenziert      | `src/data/environmental-requirements.ts` |
| Art. 100 | EF-Datenbankübermittlung   | Referenziert      | `src/data/environmental-requirements.ts` |

**ISOS & Betrieb (Art. 101–104):**

| Artikel  | Titel                       | Status            | Dateien                           |
| -------- | --------------------------- | ----------------- | --------------------------------- |
| Art. 101 | ISOS-Anforderungen          | Referenziert      | `src/data/articles.ts`            |
| Art. 102 | Kollisionsvermeidungsregeln | **Implementiert** | `sentinel/rule-definitions.ts:93` |
| Art. 103 | Vorfahrtsregeln             | Referenziert      | `src/data/articles.ts`            |
| Art. 104 | Technische Standards        | Referenziert      | `src/data/articles.ts`            |

#### Titel V–VII: Internationale Bestimmungen & Schlussbestimmungen (Art. 105–119)

| Artikel      | Titel                                | Status                         |
| ------------ | ------------------------------------ | ------------------------------ |
| Art. 105–108 | Äquivalenz & Internationale Abkommen | Referenziert                   |
| Art. 109–113 | Unterstützungsmaßnahmen, Space Label | Referenziert                   |
| Art. 114–116 | Delegierte/Durchführungsrechtsakte   | **Implementiert** (Monitoring) |
| Art. 117     | Berufsgeheimnis                      | Referenziert                   |
| Art. 118     | Überprüfungsklausel                  | Referenziert                   |
| Art. 119     | Inkrafttreten (2030)                 | Referenziert                   |

### 1.2 Compliance Thresholds

#### Kern-Thresholds (quantitative Schwellenwerte)

| Regulation   | Artikel       | Name                     | Metrik                   | Typ   | Schwellenwert      | Warning Buffer              | Datei              |
| ------------ | ------------- | ------------------------ | ------------------------ | ----- | ------------------ | --------------------------- | ------------------ |
| EU Space Act | Art. 70       | End-of-Life Passivierung | remaining_fuel_pct       | ABOVE | 15%                | 5% (Warning bei 20%)        | `thresholds.ts:26` |
| EU Space Act | Art. 68       | 25-Jahre Lebensdauer     | estimated_lifetime_yr    | BELOW | 25 Jahre           | 3 Jahre (Warning bei 22 J.) | `thresholds.ts:34` |
| EU Space Act | Art. 72       | End-of-Life Entsorgung   | remaining_fuel_pct       | ABOVE | 25%                | 5% (Warning bei 30%)        | `thresholds.ts:42` |
| EU Space Act | Art. 64       | Kollisionsvermeidung     | ca_maneuver_capability   | ABOVE | 1 (binär)          | 0                           | `thresholds.ts:50` |
| NIS2         | Art. 21(2)(e) | Patch-Compliance         | patch_compliance_pct     | ABOVE | 80%                | 5% (Warning bei 85%)        | `thresholds.ts:58` |
| NIS2         | Art. 21(2)(j) | MFA-Adoption             | mfa_adoption_pct         | ABOVE | 95%                | 2% (Warning bei 97%)        | `thresholds.ts:66` |
| NIS2         | Art. 21(2)(e) | Kritische Schwachstellen | critical_vulns_unpatched | BELOW | 1 (null toleriert) | 0                           | `thresholds.ts:74` |
| NIS2         | Art. 23       | Incident Response (MTTR) | mttr_minutes             | BELOW | 1440 min (24h)     | 240 min (Warning bei 20h)   | `thresholds.ts:82` |
| IADC         | §5.3.1        | Passivierung Treibstoff  | remaining_fuel_pct       | ABOVE | 10%                | 3% (Warning bei 13%)        | `thresholds.ts:90` |

#### Sentinel-Monitoring-Regeln

| Regulation   | Artikel  | Regel                | CRITICAL           | WARNING                                | COMPLIANT           | Datei                     |
| ------------ | -------- | -------------------- | ------------------ | -------------------------------------- | ------------------- | ------------------------- |
| EU Space Act | Art. 68  | 25-Jahre-Regel       | —                  | Alt <2000 km, Lebensd. >20 J.          | Lebensd. ≤20 J.     | `rule-definitions.ts:17`  |
| EU Space Act | Art. 70  | Passivierung         | Treibstoff <5%     | Treibstoff <15%                        | Treibstoff ≥15%     | `rule-definitions.ts:31`  |
| EU Space Act | Art. 66  | Manövrierfähigkeit   | —                  | Thruster DEGRADED / Attitude SAFE_MODE | Nominal             | `rule-definitions.ts:48`  |
| EU Space Act | Art. 64  | Kollisionsvermeidung | —                  | High-Risk CA >0, keine Manöver 30d     | OK                  | `rule-definitions.ts:62`  |
| EU Space Act | Art. 72  | Entsorgung           | Deorbit IMPOSSIBLE | Deorbit DEGRADED                       | OK                  | `rule-definitions.ts:81`  |
| EU Space Act | Art. 102 | CA-Überwachung       | —                  | High-Risk CA >2 / 30d                  | CA Events ≤10 / 30d | `rule-definitions.ts:93`  |
| NIS2         | Art. 23  | Incident Response    | —                  | Reportable >0, MTTR >1440 min          | OK                  | `rule-definitions.ts:111` |
| NIS2         | Art. 21  | Vulnerability Mgmt   | Crit. Vulns >0     | Patch <80% / Scan >30d                 | OK                  | `rule-definitions.ts:125` |
| NIS2         | Art. 21  | Zugriffskontrolle    | MFA <80%           | MFA <95%                               | MFA ≥95%            | `rule-definitions.ts:142` |
| IADC         | §5.3.1   | Passivierung         | —                  | Treibstoff <10%                        | ≥10%                | `rule-definitions.ts:208` |
| IADC         | §5.2     | 25-Jahre-Regel       | —                  | Alt <2000 km, Lebensd. >25 J.          | OK                  | `rule-definitions.ts:220` |
| Betrieb      | —        | Bodenstation         | Kontaktrate <85%   | Rate <95% / Letzter Kontakt >360 min   | OK                  | `rule-definitions.ts:237` |
| Betrieb      | —        | Lizenzgültigkeit     | Lizenz abgelaufen  | Ablauf <30 Tage                        | OK                  | `rule-definitions.ts:254` |

#### Physik-Modell-Parameter (Ephemeris)

| Parameter                 | Wert   | Einheit            | Datei                            |
| ------------------------- | ------ | ------------------ | -------------------------------- |
| Zerstörungsaltitude       | 120    | km                 | `ephemeris/core/constants.ts:35` |
| Warning-Altitude          | 200    | km                 | `ephemeris/core/constants.ts:36` |
| Drag-frei ab              | 1000   | km                 | `orbital-decay.ts:49`            |
| Vorhersagehorizont        | 1825   | Tage (5 Jahre)     | `ephemeris/core/constants.ts`    |
| Vorhersageauflösung       | 7      | Tage               | `ephemeris/core/constants.ts`    |
| Solare Flux-Referenz      | 150    | SFU                | `ephemeris/core/constants.ts`    |
| F10.7 Dichteskalierung    | 0.003  | pro SFU-Abweichung | `ephemeris/core/constants.ts`    |
| Kp geomagnetischer Faktor | 0.3    | max. bei Kp=9      | `orbital-decay.ts:325`           |
| Batteriekapazitätsverlust | 2.5%   | pro Jahr (LEO)     | `ephemeris/core/constants.ts:55` |
| Batterie CRITICAL         | <60%   | Kapazität          | `ephemeris/core/constants.ts:57` |
| Solararray-Degradation    | 2.75%  | pro Jahr (LEO)     | `ephemeris/core/constants.ts:62` |
| Solararray CRITICAL       | <70%   | Nominalleistung    | `ephemeris/core/constants.ts:64` |
| Thruster-Lebensdauer      | 50.000 | Zyklen             | `ephemeris/core/constants.ts:53` |

### 1.3 Operator-Typ-Mapping

| Operator-Typ                 | Code | Schlüssel-Artikel                                   | Module                                                 |
| ---------------------------- | ---- | --------------------------------------------------- | ------------------------------------------------------ |
| Spacecraft Operator          | SCO  | Art. 6–10, 31–72, 74–95, 96–100, 101–103            | Authorization, Debris, Cyber, Environmental, Insurance |
| Launch Operator              | LO   | Art. 6–10, 11–14, 46, 58–62, 74–95, 96–100          | Authorization, Insurance, Debris, Cyber, Environmental |
| Launch Site Operator         | LSO  | Art. 6–10, 15–17, 46, 74–95, 96–100                 | Authorization, Debris, Cyber, Environmental            |
| ISOS Provider                | ISOS | Art. 6–10, 18, 32–34, 47, 51–54, 74–95, 96–100, 101 | Authorization, Debris, Cyber, Environmental, Insurance |
| Collision Avoidance Provider | CAP  | Art. 52–55, 74–78, 83–90                            | Cybersecurity                                          |
| Primary Data Provider        | PDP  | Art. 25–27, 74–78, 86–95                            | Cybersecurity                                          |
| Third Country Operator       | TCO  | Art. 2, 14–20, 47, 62–65, 105–108                   | Authorization                                          |

**Standard vs. Light Regime:**

- **Light Regime Kriterien:** Raumfahrzeug <100 kg UND Missionsdauer <5 Jahre (Art. 10)
- **Light Regime Konsequenz:** Vereinfachtes Genehmigungsverfahren, reduzierte Dokumentationspflichten
- **Datei:** `src/lib/engine.server.ts`

---

## 2. NIS2 Directive (EU 2022/2555)

### 2.1 Klassifikation

| Entitätstyp      | Kriterien                                                                | Max. Bußgeld                    |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Essential Entity | >250 Mitarbeiter ODER >€50M Umsatz in Annex-I-Sektor (Space = Sektor 11) | €10.000.000 oder 2% Weltumsatz  |
| Important Entity | 50–250 Mitarbeiter, €10M–€50M Umsatz                                     | €7.000.000 oder 1,4% Weltumsatz |
| Out of Scope     | Micro (<10 MA, <€2M) ohne EU-Aktivitäten                                 | —                               |

**Datei:** `src/lib/nis2-engine.server.ts:259–272`

### 2.2 Encoded Requirements (51 gesamt)

| Kategorie                | Art.     | Anzahl | Critical | Major  | Minor |
| ------------------------ | -------- | ------ | -------- | ------ | ----- |
| Policies & Risikoanalyse | 21(2)(a) | 5      | 2        | 3      | 0     |
| Incident Handling        | 21(2)(b) | 5      | 3        | 2      | 0     |
| Business Continuity      | 21(2)(c) | 4      | 3        | 1      | 0     |
| Supply Chain Security    | 21(2)(d) | 5      | 2        | 3      | 0     |
| Netzwerk & IS            | 21(2)(e) | 4      | 3        | 1      | 0     |
| Wirksamkeitsbewertung    | 21(2)(f) | 3      | 0        | 2      | 1     |
| Cyber Hygiene & Training | 21(2)(g) | 3      | 0        | 2      | 1     |
| Kryptographie            | 21(2)(h) | 2      | 2        | 0      | 0     |
| HR, Zugang, Assets       | 21(2)(i) | 6      | 2        | 4      | 0     |
| Multi-Faktor-Auth.       | 21(2)(j) | 1      | 1        | 0      | 0     |
| Governance               | 21(2)(k) | 5      | 0        | 5      | 0     |
| Incident Reporting       | 23       | 3      | 2        | 1      | 0     |
| Information Sharing      | 29       | 2      | 0        | 0      | 2     |
| **Gesamt**               |          | **51** | **19**   | **24** | **8** |

**Datei:** `src/data/nis2-requirements.ts` (3.973 Zeilen)

### 2.3 NIS2 Thresholds

| Artikel       | Metrik                               | Schwellenwert   | Datei              |
| ------------- | ------------------------------------ | --------------- | ------------------ |
| Art. 21(2)(e) | Patch-Compliance                     | ≥80%            | `thresholds.ts:58` |
| Art. 21(2)(j) | MFA-Adoption                         | ≥95%            | `thresholds.ts:66` |
| Art. 21(2)(e) | Ungepatchte kritische Schwachstellen | 0 toleriert     | `thresholds.ts:74` |
| Art. 23       | Mean Time to Resolve                 | ≤1440 min (24h) | `thresholds.ts:82` |

### 2.4 Incident Reporting Timeline (Art. 23)

| Phase                 | Frist       | Grundlage     | Inhalt                                                 |
| --------------------- | ----------- | ------------- | ------------------------------------------------------ |
| Early Warning         | 24 Stunden  | Art. 23(4)(a) | Vorfalltyp, Erkennung, Beschreibung, betroffene Assets |
| Incident Notification | 72 Stunden  | Art. 23(4)(b) | Aktualisierte Bewertung, IoCs, vorläufige Maßnahmen    |
| Intermediate Report   | Auf Anfrage | Art. 23(4)(c) | Statusupdate, Untersuchungsergebnisse                  |
| Final Report          | 1 Monat     | Art. 23(4)(d) | Root Cause, betroffene Systeme, Lessons Learned        |

**Datei:** `src/lib/services/incident-notification-templates.ts`

---

## 3. Nationale Raumfahrtgesetze

### 3.1 Deutschland (DE)

| Feld                     | Wert                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Gesetz**               | Satellitendatensicherheitsgesetz (SatDSiG), 2007                                        |
| **Zuständige Behörde**   | DLR (Deutsches Zentrum für Luft- und Raumfahrt)                                         |
| **Abdeckung**            | NUR Fernerkundung (kein umfassendes Raumfahrtgesetz)                                    |
| **Encoded Paragraphen**  | §3 (Fernerkundungslizenz), §17 (Sicherheitsbewertung >0.4m Auflösung)                   |
| **Versicherung**         | Nicht vorgeschrieben                                                                    |
| **Haftungsregime**       | Unbeschränkt                                                                            |
| **Debris-Anforderungen** | Keine (freiwillige IADC-Einhaltung)                                                     |
| **EU Space Act Impact**  | **Erhebliche Lücke** — EU Space Act füllt erstmals Autorisierung, Debris, Cyber, Umwelt |
| **Datei**                | `src/data/national-space-laws.ts`                                                       |

### 3.2 Frankreich (FR)

| Feld                        | Wert                                                            |
| --------------------------- | --------------------------------------------------------------- |
| **Gesetz**                  | Loi relative aux opérations spatiales (LOS), 2008/2019          |
| **Zuständige Behörde**      | CNES                                                            |
| **Encoded Artikel**         | Art. 1–22 LOS                                                   |
| **Versicherung**            | Pflicht, Minimum €60.000.000                                    |
| **Haftungsregime**          | Gedeckelt (Operator €60M; Staat übernimmt Überschuss)           |
| **Debris**                  | 25-Jahre Deorbit, Passivierung, FSOA Technical Regulation       |
| **Bearbeitungszeit**        | 12–26 Wochen                                                    |
| **EU Space Act Verhältnis** | Komplementär — CNES als nationale Durchführungsbehörde erwartet |

### 3.3 Vereinigtes Königreich (UK)

| Feld                        | Wert                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| **Gesetz**                  | Space Industry Act 2018 + Outer Space Act 1986                                     |
| **Zuständige Behörde**      | UK Civil Aviation Authority (Space)                                                |
| **Encoded Sections**        | Sections 1–70 SIA 2018                                                             |
| **Versicherung**            | Pflicht, Minimum £60.000.000                                                       |
| **Haftungsregime**          | Gedeckelt (£60M; Regierung übernimmt Überschuss)                                   |
| **Sicherheitsstandard**     | ALARP (As Low As Reasonably Practicable)                                           |
| **EU Space Act Verhältnis** | Parallel (Post-Brexit), keine gegenseitige Anerkennung, Art. 14 für EU-Marktzugang |

### 3.4 Belgien (BE)

| Feld                        | Wert                                            |
| --------------------------- | ----------------------------------------------- |
| **Gesetz**                  | Loi relative aux activités spatiales, 2005      |
| **Zuständige Behörde**      | BELSPO                                          |
| **Versicherung**            | Pflicht, Einzelfallbewertung                    |
| **Haftungsregime**          | Gestaffelt                                      |
| **EU Space Act Verhältnis** | Wird ersetzt — EU Space Act erweitert erheblich |

### 3.5 Niederlande (NL)

| Feld                        | Wert                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| **Gesetz**                  | Wet ruimtevaartactiviteiten, 2007                                  |
| **Zuständige Behörde**      | Agentschap Telecom                                                 |
| **Versicherung**            | Pflicht, ab €3.000.000 (Kleinsatelliten), risikobasiert skalierend |
| **Haftungsregime**          | Gestaffelt, risikobasiert                                          |
| **EU Space Act Verhältnis** | Wird ersetzt                                                       |

### 3.6 Luxemburg (LU)

| Feld                        | Wert                                                 |
| --------------------------- | ---------------------------------------------------- |
| **Gesetz**                  | Space Activities Act 2020 + Space Resources Act 2017 |
| **Zuständige Behörde**      | Luxembourg Space Agency (LSA)                        |
| **Versicherung**            | Pflicht, Einzelfall (startup-freundlich)             |
| **Besonderheit**            | Erstes EU-Land mit Weltraumressourcen-Gesetz (2017)  |
| **EU Space Act Verhältnis** | Parallel — Ressourcengesetz operiert unabhängig      |

### 3.7 Österreich (AT)

| Feld                        | Wert                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| **Gesetz**                  | Weltraumgesetz (WeltraumG), 2011                                      |
| **Zuständige Behörde**      | FFG (Österreichische Forschungsförderungsgesellschaft)                |
| **Versicherung**            | Pflicht, Einzelfall                                                   |
| **Haftungsregime**          | **Unbeschränkt** (besonders belastend)                                |
| **EU Space Act Verhältnis** | Wird ersetzt — unbeschränktes Haftungsregime könnte reformiert werden |

### 3.8 Dänemark (DK)

| Feld                        | Wert                                             |
| --------------------------- | ------------------------------------------------ |
| **Gesetz**                  | Lov om rumaktiviteter, 2016                      |
| **Zuständige Behörde**      | Danish Agency for Science and Higher Education   |
| **Versicherung**            | Pflicht, DKK 500.000.000 (ca. €67.000.000)       |
| **Haftungsregime**          | Gedeckelt (DKK 500M; Staat übernimmt Überschuss) |
| **EU Space Act Verhältnis** | Wird ersetzt                                     |

### 3.9 Italien (IT)

| Feld                        | Wert                                                        |
| --------------------------- | ----------------------------------------------------------- |
| **Gesetz**                  | Legge 7/2018 on Space Activities                            |
| **Zuständige Behörde**      | ASI (Italian Space Agency)                                  |
| **Versicherung**            | Pflicht, Einzelfall                                         |
| **Haftungsregime**          | Gestaffelt                                                  |
| **EU Space Act Verhältnis** | Wird ersetzt — relativ neu aber Umsetzungsrahmen reift noch |

### 3.10 Norwegen (NO)

| Feld                        | Wert                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| **Gesetz**                  | Act on Launching Objects from Norwegian Territory, 1969/2019           |
| **Zuständige Behörde**      | NOSA (Norsk Romsenter)                                                 |
| **Versicherung**            | Pflicht, Einzelfall (Staatsfreistellung für Andøya-Starts)             |
| **Besonderheit**            | Heimat von Andøya Space, Europas erstem Festland-Startplatz; EWR-Staat |
| **EU Space Act Verhältnis** | Parallel — Kein EU-Mitglied, EWR-Inkorporation ausstehend              |

**Gesamtdatei:** `src/data/national-space-laws.ts` (1.682 Zeilen)

---

## 4. Internationale Richtlinien

### 4.1 IADC Guidelines

| Feld                    | Wert                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Referenz**            | IADC Space Debris Mitigation Guidelines (2025 Update), IADC-02-01 Rev. 7                         |
| **Bindungsgrad**        | Mandatory (von ESA, NOAA, JAXA adoptiert; in FCC 2024 referenziert)                              |
| **Encoded Abschnitte**  | 40+ Leitlinien: Debris-Klassifikation, Kollisionsvermeidung, Post-Mission Disposal, Passivierung |
| **Schwellenwerte**      | 25-Jahre Post-Mission Deorbit (LEO), Passivierung aller Energiequellen                           |
| **Threshold in Caelex** | remaining_fuel_pct ≥ 10% (§5.3.1)                                                                |
| **Datei**               | `src/data/copuos-iadc-requirements.ts:400–1100`                                                  |

### 4.2 COPUOS Long-Term Sustainability Guidelines

| Feld                   | Wert                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| **Referenz**           | COPUOS LTS Guidelines (2019)                                              |
| **Bindungsgrad**       | Recommended (nicht-bindendes UN-Politikdokument)                          |
| **Encoded Abschnitte** | 30+ Leitlinien: Politikrahmen, internationale Kooperation, Weltraumwetter |
| **Cross-Reference**    | Art. 6, 25, 34, 46, 76–95, 101–104 EU Space Act                           |
| **Datei**              | `src/data/copuos-iadc-requirements.ts:470+`                               |

### 4.3 ISO 24113:2024

| Feld                   | Wert                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **Referenz**           | ISO 24113:2024 Space Debris Mitigation Requirements             |
| **Bindungsgrad**       | Mandatory (in EU Space Act Art. 67 inkorporiert)                |
| **Encoded Abschnitte** | §6.1–§6.4 (Design, Tracking, Passivierung, EOL-Disposal)        |
| **Schwellenwerte**     | 25-Jahre LEO Deorbit (§6.4.1), ca. 11 m/s GEO Graveyard-Reserve |
| **Datei**              | `src/data/copuos-iadc-requirements.ts:1109–1395`                |

### 4.4 ITU Radio Regulations

| Feld                   | Wert                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Referenz**           | ITU Radio Regulations (2020 Edition), ITU-R S.1503, RR Art. 9/22                                               |
| **Bindungsgrad**       | Mandatory (bindend für ITU-Mitgliedstaaten)                                                                    |
| **Encoded Abschnitte** | 4 Filing-Phasen (API → CR/C → Notification → Recording), 12 Frequenzbänder, EPFD-Compliance, NGSO-Meilensteine |
| **Schwellenwerte**     | NGSO-Deployment: 10% in 2 J., 50% in 5 J., 100% in 7 J. (RR 11.44C)                                            |
| **Datei**              | `src/data/spectrum-itu-requirements.ts` (3.500+ Zeilen)                                                        |

### 4.5 ITAR (22 CFR 120–130)

| Feld                   | Wert                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Referenz**           | International Traffic in Arms Regulations, USML Cat. IV/XV/XI/XII                       |
| **Bindungsgrad**       | Mandatory (US-Bundesrecht)                                                              |
| **Encoded Abschnitte** | 32 USML-Elemente, DDTC-Registrierung (§122.1), TAA/Deemed Exports (§125.4)              |
| **Strafen**            | Zivilrechtlich: bis $500.000/Verstoß, Strafrechtlich: bis $1.000.000, bis 20 Jahre Haft |
| **Datei**              | `src/data/itar-ear-requirements.ts`, `src/lib/export-control-engine.server.ts`          |

### 4.6 EAR (15 CFR 730–774)

| Feld                   | Wert                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Referenz**           | Export Administration Regulations, CCL-9A/B/D/E                                         |
| **Bindungsgrad**       | Mandatory (US-Bundesrecht)                                                              |
| **Encoded Abschnitte** | 24 CCL-Elemente, 11 Lizenzausnahmen, 5 Denied-Party-Listen                              |
| **Strafen**            | Zivilrechtlich: bis $300.000/Verstoß, Strafrechtlich: bis $1.000.000, bis 20 Jahre Haft |
| **Datei**              | `src/data/itar-ear-requirements.ts`, `src/lib/export-control-engine.server.ts`          |

### 4.7 UK Space Industry Act 2018

| Feld                   | Wert                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| **Encoded Abschnitte** | 35+ Anforderungen, 5 Lizenztypen, CAP 2210 Guidance                      |
| **Schwellenwerte**     | TPL-Versicherung: min. EUR 60M, ALARP-Sicherheitsstandard                |
| **Datei**              | `src/data/uk-space-industry-act.ts`, `src/lib/uk-space-engine.server.ts` |

### 4.8 US Regulatory (FCC/FAA/NOAA)

| Agentur | Referenz        | Schlüssel-Schwellenwerte              |
| ------- | --------------- | ------------------------------------- |
| FCC     | 47 CFR Part 25  | 5-Jahre LEO Deorbit (2024 Rule)       |
| FAA     | 14 CFR Part 450 | Expected Casualty < 1:10.000          |
| NOAA    | 15 CFR Part 960 | Tier-Klassifikation für Fernerkundung |

**Datei:** `src/data/us-space-regulations.ts`, `src/lib/us-regulatory-engine.server.ts`

---

## 5. Dokumenttypen

### 5.1 NCA-Dokumenttypen (Generate 2.0)

| Code | Dokumenttyp                         | Reg. Grundlage | Template     | Pflichtabschnitte                                                                     |
| ---- | ----------------------------------- | -------------- | ------------ | ------------------------------------------------------------------------------------- |
| A1   | Debris Mitigation Plan              | Art. 58–73     | Ja           | Executive Summary, Passivation Strategy, Disposal Plan, Collision Avoidance, Timeline |
| A2   | Orbital Lifetime Analysis           | Art. 64–67     | Ja           | —                                                                                     |
| A3   | Collision Avoidance Ops Plan        | Art. 68–73     | Nur Referenz | —                                                                                     |
| A4   | End-of-Life Disposal Plan           | Art. 66–72     | Ja           | —                                                                                     |
| A5   | Passivation Procedure               | Art. 62–63     | Nur Referenz | —                                                                                     |
| A6   | Re-Entry Casualty Risk              | Art. 59–60     | Nur Referenz | —                                                                                     |
| A7   | Supply Chain Compliance (Debris)    | Art. 55–58     | Nur Referenz | —                                                                                     |
| A8   | Light & RF Pollution Mitigation     | Art. 96–100    | Nicht impl.  | —                                                                                     |
| B1   | Cybersecurity Policy                | Art. 74–95     | Ja           | Executive Summary, Scope, Risk Assessment, Access Control, Incident Response          |
| B2   | Cybersecurity Risk Assessment       | Art. 74–95     | Ja           | Executive Summary, Methodology, Risk Register, Mitigation Measures                    |
| B3   | Incident Response Plan              | Art. 89–95     | Ja           | Executive Summary, Detection, Containment, Notification Timeline, Recovery            |
| B4   | Business Continuity & Recovery      | Art. 74–95     | Nur Referenz | —                                                                                     |
| B5   | Access Control & Auth Policy        | Art. 79–82     | Nur Referenz | —                                                                                     |
| B6   | Supply Chain Security               | Art. 74–95     | Nur Referenz | —                                                                                     |
| B7   | EUSRN Notification Procedures       | Art. 89–95     | Nicht impl.  | —                                                                                     |
| B8   | Compliance Verification Matrix      | Art. 6–27      | Nur Referenz | —                                                                                     |
| C1   | Authorization Application           | Art. 6–10      | Ja           | Executive Summary, Operator Profile, Mission Description, Compliance Matrix           |
| C2   | Environmental Footprint Declaration | Art. 96–100    | Ja           | Executive Summary, Lifecycle Assessment, Emissions, Mitigation                        |
| C3   | Insurance Compliance Report         | Art. 28–32     | Ja           | —                                                                                     |
| D1   | CNES/FSOA Hazard Report             | Art. 17–21     | Nicht impl.  | —                                                                                     |

**Status-Zusammenfassung:** 9 mit Template, 8 nur Referenz, 3 nicht implementiert

### 5.2 Autorisierungsdokumente (22 gesamt)

Definiert in `src/data/authorization-documents.ts` mit 7 Kategorien:

| Kategorie        | Anzahl | Beispiele                                                    | Reg. Grundlage                         |
| ---------------- | ------ | ------------------------------------------------------------ | -------------------------------------- |
| Core Application | 7      | Mission Description, DMP, Cybersecurity Risk Assessment      | Art. 7(2)(a-e), Art. 58–72, Art. 74–95 |
| Legal            | 3      | Legal Entity Proof, Control Documentation, EU Representative | Art. 6(1-2), Art. 14(2)                |
| Launch-Specific  | 2      | Launch Safety Assessment, Launch Site License                | Art. 17–21                             |
| Financial        | 2      | Financial Guarantee, Financial Statements                    | Art. 48–51, Art. 7(2)(f)               |
| Operational      | 3      | Operations Manual, Frequency Coordination, Ground Segment    | Art. 7(2)(c-e)                         |

---

## 6. Scoring-Modell

### 6.1 Dashboard Compliance Score (7 Module)

| Modul                | Gewichtung | Artikel     | Faktoren                                                                                                       |
| -------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| **Authorization**    | 0.22 (22%) | Art. 6–27   | auth_status (40 Pkt), doc_completeness (35 Pkt), nca_designation (25 Pkt)                                      |
| **Debris**           | 0.17 (17%) | Art. 55–73  | debris_assessment (30 Pkt), passivation_plan (25 Pkt), deorbit_strategy (25 Pkt), collision_avoidance (20 Pkt) |
| **Cybersecurity**    | 0.17 (17%) | Art. 74–95  | risk_assessment (35 Pkt), maturity_score (25 Pkt), incident_response_plan (20 Pkt), incident_response (20 Pkt) |
| **Space Operations** | 0.15 (15%) | Art. 55–73  | fleet_health (40 Pkt), compliance_horizon (35 Pkt), active_monitoring (25 Pkt)                                 |
| **Insurance**        | 0.13 (13%) | Art. 28–32  | insurance_assessment (40 Pkt), active_policies (30 Pkt), policy_validity (30 Pkt)                              |
| **Environmental**    | 0.08 (8%)  | Art. 96–100 | efd_submission (50 Pkt), supplier_data (30 Pkt), gwp_calculation (20 Pkt)                                      |
| **Reporting**        | 0.08 (8%)  | Art. 33–54  | nca_config (25 Pkt), incident_notifications (30 Pkt), report_submissions (20 Pkt), nca_outcomes (25 Pkt)       |

**Notensystem:** A ≥90 | B ≥80 | C ≥70 | D ≥60 | F <60

**Datei:** `src/lib/services/compliance-scoring-service.ts`

### 6.2 Ephemeris Satellite Score (9 Module)

| Modul               | Gewichtung | Safety Gate | Datenquelle         |
| ------------------- | ---------- | ----------- | ------------------- |
| Orbital             | 15         | Ja          | Derived (TLE-Daten) |
| Fuel                | 20         | Ja          | Sentinel            |
| Subsystems          | 15         | Ja          | Sentinel            |
| Collision Avoidance | —          | —           | Shield              |
| Cyber               | 10         | Nein        | Assessment          |
| Ground              | 10         | Nein        | Sentinel            |
| Documentation       | 8          | Nein        | Verity              |
| Insurance           | 7          | Nein        | Assessment          |
| Registration        | 5          | Nein        | Assessment          |

**Safety Gate:** Wenn ein Safety-Modul NON_COMPLIANT → max. Score 49/100

**Datei:** `src/lib/ephemeris/core/satellite-compliance-state.ts`, `constants.ts:68–118`

### 6.3 Unterschiede Dashboard vs. Ephemeris

| Aspekt       | Dashboard Score                         | Ephemeris Score                          |
| ------------ | --------------------------------------- | ---------------------------------------- |
| Datenbasis   | Prisma-Modelle (Workflows, Assessments) | Telemetrie (Sentinel, CelesTrak, Verity) |
| Zeitrahmen   | Momentaufnahme                          | Echtzeit + Vorhersage                    |
| Module       | 7                                       | 9                                        |
| Safety Gates | Nein                                    | Ja (max. 49 bei NON_COMPLIANT)           |
| Fokus        | Regulatorische Compliance-Haltung       | Operationelle Missionsgesundheit         |
| Besonderheit | Enthält NCA-Outcomes                    | Enthält Orbital-Decay-Vorhersagen        |

---

## 7. Cross-References

### 7.1 EU Space Act ↔ NIS2

128+ Mappings in `src/data/cross-references.ts`

| EU Space Act | NIS2              | Thema                                                 |
| ------------ | ----------------- | ----------------------------------------------------- |
| Art. 74      | Art. 21(2)(a)     | Informationssicherheitspolitik                        |
| Art. 75      | Art. 21(2)(g)     | Personalschulung                                      |
| Art. 76–77   | Art. 21(2)(a)     | Risikomanagement                                      |
| Art. 79–82   | Art. 21(2)(e,h,i) | Sichere Entwicklung, Kryptographie, Zugriffskontrolle |
| Art. 83–85   | Art. 21(2)(b,c)   | Incident Handling, Business Continuity                |
| Art. 88      | Art. 21(2)(f)     | Sicherheitsaudits, Pentesting                         |
| Art. 89–95   | Art. 23           | Incident Reporting, EUSRN                             |

### 7.2 Internationale Richtlinien ↔ EU Space Act

| Richtlinie            | EU Space Act Artikel               | Integration                           |
| --------------------- | ---------------------------------- | ------------------------------------- |
| COPUOS LTS 2019       | Art. 6, 25, 34, 46, 76–95, 101–104 | `copuos-engine.server.ts:450`         |
| IADC-02-01            | Art. 55–73                         | `copuos-engine.server.ts:517`         |
| ISO 24113:2024        | Art. 67                            | `copuos-iadc-requirements.ts:1109`    |
| ITU Radio Regulations | Art. 41–54                         | `spectrum-engine.server.ts:927`       |
| ITAR/EAR              | Art. 73                            | `export-control-engine.server.ts:478` |
| UK Space Act          | Art. 6–16, 55–73, 96–100           | `uk-space-engine.server.ts:620`       |
| US Regulations        | Art. 67, 76–95, 41–54              | `us-regulatory-engine.server.ts:700`  |

### 7.3 Nationale Gesetze ↔ EU Space Act

Alle 10 Jurisdiktionen enthalten `euSpaceActCrossReference`-Felder mit Verhältnisbestimmung:

- **Komplementär:** Frankreich
- **Parallel (Post-Brexit):** UK, Norwegen
- **Wird ersetzt:** Belgien, Niederlande, Dänemark, Italien, Österreich
- **Lücke wird gefüllt:** Deutschland (kein umfassendes Raumfahrtgesetz)
- **Parallel (Ressourcen):** Luxemburg

---

## 8. Meldepflichten & Fristen

### 8.1 EU Space Act Incident-Klassifikation

| Vorfalltyp                | NCA-Frist               | Severity | EUSPA-Meldung | Grundlage    |
| ------------------------- | ----------------------- | -------- | ------------- | ------------ |
| Kontaktverlust            | 4 Stunden               | CRITICAL | Ja            | Art. 33–34   |
| Trümmererzeugung          | 4 Stunden               | CRITICAL | Ja            | Art. 58–72   |
| Cyber-Vorfall             | 4 Stunden               | CRITICAL | Ja            | Art. 74–95   |
| Raumfahrzeug-Anomalie     | 24 Stunden              | HIGH     | Nein          | Art. 33–34   |
| Conjunction Event         | 72 Stunden              | HIGH     | Ja            | Art. 55–57   |
| Regulatorischer Verstoß   | 72 Stunden              | MEDIUM   | Nein          | Art. 33–34   |
| NIS2 Significant Incident | 24 Stunden              | CRITICAL | Nein          | NIS2 Art. 23 |
| NIS2 Near-Miss            | 72 Stunden (freiwillig) | MEDIUM   | Nein          | NIS2 Art. 30 |
| Sonstiges                 | 168 Stunden (7 Tage)    | LOW      | Nein          | Art. 33–34   |

**Datei:** `src/lib/services/incident-response-service.ts`

### 8.2 GDPR-Meldefristen

| Phase              | Frist                         | Grundlage         |
| ------------------ | ----------------------------- | ----------------- |
| Behördenmeldung    | 72 Stunden                    | GDPR Art. 33      |
| Betroffenenmeldung | Unverzüglich bei hohem Risiko | GDPR Art. 34      |
| Eskalationswarnung | 48 Stunden vor Fristablauf    | Caelex-Konvention |

### 8.3 NIS2 Significant Incident Kriterien

Ein Vorfall ist NIS2-significant wenn EINES der folgenden zutrifft:

- Operative Störung mit schwerwiegenden Auswirkungen
- Finanzieller Schaden >€500.000
- Betroffenheit Dritter
- Personenbezogene Daten betroffen (>0 Personen)
- GDPR-meldepflichtiger Datenschutzverstoß
- Dienstverfügbarkeit: Ausfallzeit >4 Stunden

### 8.4 Periodische Fristen (Ephemeris-Monitoring)

| Fristtyp                    | Intervall        | Vorlaufzeit | Severity | Regulierung           |
| --------------------------- | ---------------- | ----------- | -------- | --------------------- |
| Penetrationstest            | 365 Tage         | 56 Tage     | HIGH     | NIS2 Art. 21(2)(e)    |
| Vulnerability Scan          | 90 Tage          | 7 Tage      | MEDIUM   | NIS2 Art. 21(2)(e)    |
| Access Review               | 180 Tage         | 14 Tage     | MEDIUM   | NIS2 Art. 21(2)(i)    |
| Security Training           | 365 Tage         | 30 Tage     | MEDIUM   | NIS2 Art. 21(2)(g)    |
| TPL-Versicherungserneuerung | 365 Tage         | 90 Tage     | CRITICAL | EU Space Act Art. 8   |
| Frequenzlizenz-Erneuerung   | 1825 Tage (5 J.) | 180 Tage    | HIGH     | ITU Radio Regulations |

**Datei:** `src/lib/ephemeris/core/constants.ts:145–206`

### 8.5 NCA Deadline Monitoring (Cron)

**Schedule:** Täglich 07:00 UTC (`/api/cron/nca-deadlines`)

| Trigger                          | Bedingung                              | Notification-Typ           | Severity |
| -------------------------------- | -------------------------------------- | -------------------------- | -------- |
| Follow-Up-Frist nähert sich      | ≤3 Tage                                | NCA_DEADLINE_APPROACHING   | WARNING  |
| Follow-Up überfällig             | Past deadline                          | NCA_FOLLOW_UP_REQUIRED     | URGENT   |
| Eingereichte Submission veraltet | >14 Tage ohne Update                   | Reminder                   | INFO     |
| SLA-Frist nähert sich            | ≤3 Tage                                | NCA_DEADLINE_APPROACHING   | WARNING  |
| NIS2-Phase überfällig            | Past deadline                          | INCIDENT_DEADLINE_OVERDUE  | URGENT   |
| NIS2-Phase kritisch              | <2h verbleibend ODER <10% des Fensters | INCIDENT_DEADLINE_CRITICAL | CRITICAL |
| NIS2-Phase Warning               | <25% des Fensters                      | INCIDENT_DEADLINE_WARNING  | WARNING  |

**Datei:** `src/app/api/cron/nca-deadlines/route.ts` (411 Zeilen)

---

## 9. Lücken & Inkonsistenzen

### 9.1 Implementierungslücken

| Bereich                  | Beschreibung                                                            | Bedeutung                                                |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| Art. 11–23 (TCO)         | TCO-Registrierungsworkflow minimal implementiert                        | Hoch — zunehmende Bedeutung für Third-Country-Operatoren |
| Art. 32–39 (QTBs)        | Qualifizierte Technische Stellen nicht implementiert                    | Mittel — relevant für Genehmigungsverfahren              |
| Art. 101–103 (ISOS, CAP) | Minimale Implementierung trotz wachsender Bedeutung                     | Mittel — In-Space Servicing ist Wachstumsmarkt           |
| Art. 86–88               | Vereinfachtes Risikomanagement nur referenziert                         | Niedrig — betrifft nur Light-Regime-Operatoren           |
| Art. 93–95 (EUSRN)       | EU Space Resilience Network nicht implementiert                         | Niedrig — EUSRN noch nicht operativ                      |
| DE Raumfahrtgesetz       | SatDSiG deckt nur Fernerkundung ab                                      | Kritisch für DE-Kunden bis EU Space Act greift           |
| 3 Dokumenttypen          | LIGHT_RF_POLLUTION, EUSRN_PROCEDURES, HAZARD_REPORT nicht implementiert | Niedrig — weniger nachgefragt                            |

### 9.2 Strukturelle Inkonsistenzen

| Inkonsistenz                    | Beschreibung                                                                                                           | Dateien                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Artikel-Nummerierung            | `articles.ts` gruppiert (z.B. "art-11-13"), Astra KB listet einzeln                                                    | `src/data/articles.ts` vs `src/lib/astra/regulatory-knowledge/eu-space-act.ts` |
| Titel-Grenzen                   | Artikelgruppierungen in `articles.ts` weichen von offizieller EU Space Act Struktur ab                                 | `src/data/articles.ts`                                                         |
| Art. 70 Sentinel vs. Thresholds | `thresholds.ts`: WARNING bei 20% (15% + 5% Buffer). `sentinel/rule-definitions.ts`: WARNING bei <15%, CRITICAL bei <5% | Verschiedene Warning-Schwellen                                                 |
| 25-Jahre-Regel                  | FCC 2024: 5-Jahre Deorbit-Regel (US). EU Space Act Art. 68: 25-Jahre. Beide encoded aber als separate Regime           | `orbital-decay.ts` vs `us-regulatory-engine.server.ts`                         |

### 9.3 Threshold-Konsistenz

Alle 9 Kern-Thresholds in `thresholds.ts` sind konsistent über die Codebase hinweg referenziert (via Import). Die Sentinel-Regeln in `rule-definitions.ts` verwenden teilweise eigene Schwellenwerte:

| Threshold        | `thresholds.ts`              | Sentinel                                  | Konsistent?                                              |
| ---------------- | ---------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Art. 70 Fuel     | 15% (WARNING bei 20%)        | WARNING <15%, CRITICAL <5%                | Teilweise — Sentinel hat zusätzliche CRITICAL-Stufe      |
| Art. 68 Lifetime | 25 Jahre (WARNING bei 22 J.) | WARNING >20 J.                            | Abweichung — Sentinel warnt früher (20 J. vs 22 J.)      |
| Art. 64 CA       | Binär (1/0)                  | Warnung bei High-Risk + keine Manöver 30d | Ergänzend — Sentinel hat operativere Logik               |
| NIS2 MFA         | 95% (WARNING bei 97%)        | WARNING <95%, NON_COMPLIANT <80%          | Ergänzend — Sentinel hat zusätzliche NON_COMPLIANT-Stufe |

> **Hinweis:** Die Sentinel-Abweichungen sind gewollt — Sentinel operiert als Echtzeit-Monitoring mit granulierteren Stufen, während `thresholds.ts` die regulatorischen Mindestanforderungen abbildet.

---

_Erstellt: 14. März 2026 | Dateibasis: Caelex Codebase (main branch, Commit 82390a6)_
