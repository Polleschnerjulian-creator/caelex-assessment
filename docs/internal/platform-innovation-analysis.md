# Caelex Platform — Strategische Innovationsanalyse

**Stand:** 14. März 2026
**Autor:** Julian Polleschner + Claude (Systembericht)
**Scope:** Tiefenanalyse der gesamten Plattform — ungenutzte Verbindungen, fehlende Integrationen, High-Tech-Opportunities

---

## Executive Summary

Nach systematischer Analyse aller 65 Services, 161 Prisma-Modelle, 400+ API-Routes und 5 Subsysteme wurden **12 bahnbrechende Opportunities** identifiziert, die Caelex von einem Compliance-Tool zu einer **autonomen regulatorischen Intelligenzplattform** transformieren würden.

Die größte ungenutzte Stärke: **Caelex hat bereits alle Bausteine** — Sentinel (Live-Telemetrie), Verity (Kryptografische Attestierung), Ephemeris (Orbital-Physik), Astra (AI), Shield (Collision Avoidance) — aber diese Systeme sind **isolierte Inseln**. Die Verbindung dieser Systeme erzeugt exponentiellen Wert.

**Top 3 Game-Changer:**

1. **Sentinel-Verity Auto-Validation** — Kein anderes Tool auf dem Markt kann Live-Telemetrie kryptografisch gegen Compliance-Claims verifizieren
2. **AI Document Auditor** — Automatische NCA-Submissions-QA vor dem Einreichen (spart 4-6h pro Submission)
3. **Zero-Knowledge Compliance Proofs** — Regulatorische Compliance beweisen OHNE proprietäre Daten offenzulegen

---

## Teil 1: Disconnected Systems — Wo Verbindungen Exponentiellen Wert Schaffen

### 1.1 Sentinel → Verity Auto-Validation (GAME-CHANGER)

**Status:** Komplett unverbunden
**Was existiert:**

- Sentinel erfasst 6+ Echtzeit-Metriken: `remaining_fuel_pct`, `thruster_status`, `battery_soc`, `patch_compliance_pct`, `mfa_adoption_pct`, `solar_array_power`
- Verity erstellt HMAC-signierte Attestierungen mit SHA-256 Blinded Commitments
- Beide haben Ed25519-Signaturen und Hash-Chains

**Das Problem:**
Ein Operator kann in einer Verity-Attestierung behaupten "patch_compliance: 95%" — aber Sentinel zeigt in Wirklichkeit 22%. Niemand validiert das automatisch.

**Die Lösung:**

```
SentinelPacket (Echtzeit-Telemetrie)
  → getLatestSentinelValue("patch_compliance_pct")
  → Compare mit VerityAttestation.result für denselben dataPoint
  → Bei Divergenz > Threshold:
    * Trust Score senken
    * Attestierung als "DISPUTED" markieren
    * Alert an Operator: "Sentinel-Daten widersprechen Ihrer Attestierung"
    * Optional: Re-Attestierung mit aktualisierten Werten erzwingen
```

**Warum bahnbrechend:** Kein Konkurrent hat eine End-to-End-Pipeline von Live-Satelliten-Telemetrie bis zur kryptografisch verifizierten Compliance-Aussage. Das ist der Unterschied zwischen "wir glauben dem Operator" und "wir haben Beweis".

**Dateien:**

- `src/lib/ephemeris/data/sentinel-adapter.ts`
- `src/lib/ephemeris/data/verity-adapter.ts`
- `src/app/api/v1/sentinel/cross-verify/route.ts`

---

### 1.2 Ephemeris → Compliance Score (CRITICAL GAP)

**Status:** Teilweise verbunden, aber unterutilisiert
**Was existiert:**

- Ephemeris berechnet Orbital-Decay, Fuel-Depletion, Subsystem-Degradation mit 5 Physikmodellen
- Compliance-Scoring nutzt NUR statische Assessments (Debris-Plan ja/nein, Deorbit-Strategie ja/nein)

**Das Problem:**
Ein Satellit mit 3 Tagen Treibstoff zeigt denselben Compliance-Score wie einer mit 5 Jahren Treibstoff.

**Die Lösung:**

```
SatelliteComplianceState (Echtzeit-Orbitaldaten)
  → EphemerisForecast (Decay/Fuel-Kurven)
  → "Health Velocity Factor" in calculateComplianceScore():
    * fuelDaysRemaining < 90 → Debris-Score reduzieren
    * altitudeDecayRate > threshold → Reentry-Warnung
    * subsystemDegradation > 0.7 → Operational-Score senken
  → Compliance-Score wird DYNAMISCH statt statisch
```

**Warum bahnbrechend:** Caelex wäre die erste Plattform, die **physik-basierte Echtzeit-Compliance** bietet. Nicht "hat der Operator einen Plan?" sondern "wird der Satellit tatsächlich rechtzeitig deorbiten?"

**Dateien:**

- `src/lib/services/compliance-scoring-service.ts:167-178` (nur statische Checks)
- `src/lib/ephemeris/models/orbital-decay.ts` (370 LOC Physik, ungenutzt für Scoring)
- `src/lib/ephemeris/models/fuel-depletion.ts` (476 LOC, ungenutzt für Scoring)

---

### 1.3 NCA Rejection → Score Recalculation (FEHLEND)

**Status:** Einweg-Verbindung
**Das Problem:** Wenn eine NCA eine Submission ablehnt oder Nachbesserung fordert, passiert NICHTS mit dem Compliance-Score. Der Score zeigt weiterhin "Submission eingereicht = gut".

**Die Lösung:**

```
NCASubmission.status === "REJECTED" oder followUpRequired === true
  → ComplianceSnapshot neu berechnen
  → Reporting-Module-Score reduzieren
  → Deadline erstellen: "Follow-Up bis {deadline}"
  → Alert: "NCA-Ablehnung — Maßnahmen erforderlich"
```

---

### 1.4 Conjunction Events → Compliance (ISOLIERT)

**Status:** Shield-Modul ist komplett isoliert vom Compliance-System
**Was existiert:** CDM-Polling alle 30 Min von Space-Track, ConjunctionEvent-Modell, Eskalationslogik

**Das Problem:** Collision-Avoidance-Events werden nicht als Compliance-Events behandelt, obwohl sie unter COPUOS/IADC Art. 67-71 fallen.

**Die Lösung:**

```
ConjunctionEvent.peakPc > 1e-4 (hohe Kollisionswahrscheinlichkeit)
  → Auto-create Deadline: "Manöver-Entscheidung" (72h Frist, Art. 71)
  → Debris-Compliance-Score anpassen
  → Incident-System benachrichtigen
  → Bei ausgeführtem Manöver: Treibstoffverbrauch → Fuel-Depletion-Forecast aktualisieren
```

---

### 1.5 Mission Timeline ↔ Regulatory Deadlines (80% UNVERKNÜPFT)

**Status:** `Deadline.regulatoryRef` existiert im Schema, wird aber nur für NCA-Deadlines genutzt

**Fehlend:**

- Insurance-Policy-Ablauf → Deadline "Versicherung erneuern" (Art. 44)
- Cybersecurity-Assessment-Alter > 1 Jahr → Deadline "Framework-Review" (NIS2 Art. 21)
- Environmental-Assessment → Deadline "EFD-Submission" (Art. 96-100)
- Debris-Plan-Update → Deadline "DMP aktualisieren" (Art. 55-57)

---

## Teil 2: AI/ML — Wo Claude den Unterschied Macht

### 2.1 AI Document Auditor (HIGHEST ROI)

**Status:** Generate 2.0 erstellt Dokumente, aber niemand prüft sie automatisch

**Die Vision:**

```
Generiertes NCA-Dokument (z.B. Debris Mitigation Plan)
  → Claude analysiert:
    1. Artikel-Abdeckung: "Alle Art. 67 Subsektionen vorhanden? ✅/❌"
    2. Daten-Konsistenz: "DMP referenziert Orbit 450km, TLE zeigt 498km ⚠️"
    3. NCA-spezifische Requirements: "FR_CNES Art. 58(4) verlangt Kosten-Nutzen-Analyse ❌"
    4. Evidenz-Status: "Insurance-Kopie fehlt (Art. 56 Requirement) ❌"
    5. Sprachqualität: "Formale regulatorische Sprache eingehalten? ✅"
  → Output: Prüfbericht mit rot/gelb/grün Ampeln + Korrekturvorschläge
```

**Warum bahnbrechend:** Eliminiert 4-6 Stunden manuelle Dokumentprüfung pro NCA-Submission. 99% Pre-Submission QA automatisiert.

**Implementation:** Neues Astra-Tool `audit_nca_document` — nutzt existierende Regulatory Knowledge Base + Assessment-Daten als Referenz.

---

### 2.2 Regulatory Change Interpreter (PROAKTIVE INTELLIGENCE)

**Status:** EUR-Lex SPARQL-Feed pollt täglich neue Dokumente, aber ohne AI-Interpretation

**Die Vision:**

```
EUR-Lex Amendment zu Art. 72
  → Claude analysiert Rohtext:
    1. "Betrifft: Orbital-Lifetime-Limit, Art. 72(2)"
    2. "Änderung: 25-Jahr-Limit → 5-Jahr-Limit für LEO <600km"
    3. "Impact: 67% unserer Nutzer betroffen"
    4. "Deadline: In Kraft ab Q1 2027"
  → Auto-generiert:
    * Compliance-Alert an betroffene Organisationen
    * Assessment-Updates: "Ihre Orbital-Lifetime-Analyse muss aktualisiert werden"
    * Dokument-Updates: "Ihr DMP referenziert Art. 72 v1.0; v2.0 erfordert..."
```

**Warum bahnbrechend:** Proaktive regulatorische Intelligence statt reaktiver Compliance. Operatoren erfahren von Änderungen BEVOR sie zum Problem werden.

---

### 2.3 Predictive Compliance Forecasting (ML-POWERED)

**Status:** RRS ist rule-based (deterministisch, keine Trends)

**Die Vision:**

```
Historische ComplianceSnapshot-Zeitreihe (90 Tage)
  → Trend-Analyse: "Compliance-Velocity: -5 Punkte/Woche"
  → Prediction: "Bei aktuellem Tempo Autorisierung in 187 Tagen (±31 Tage, 73% Konfidenz)"
  → Churn-Warning: "Compliance-Velocity verlangsamt sich 40% — Projektabbruch-Risiko steigt auf 12%"
  → Peer-Benchmark: "Sie sind im unteren 20% bei Deadline-Einhaltung"
  → Claude-Narrativ: Executive Summary mit konkreten Handlungsempfehlungen
```

---

### 2.4 Compliance Narrative Generator

**Status:** Scoring ist rein numerisch (RRS 0-100), keine Textaufbereitung

**Die Vision:**

```
"Ihre Regulatory Readiness steht bei 67/100 und liegt damit im 45. Perzentil
unter Space-Operatoren. Stärkster Bereich: Authorization Readiness (82/100) —
8 von 10 erforderlichen Dokumenten sind vollständig. Dringendste Lücke:
Operational Compliance (44/100) wegen fehlender Versicherungsnachweise und
veralteter Cybersecurity-Evidenz.

Bei aktuellem Fortschritt erreichen Sie Full Authorization in 156 Tagen.
Empfehlung: Priorisieren Sie die 3 kritischen Insurance-Requirements für
eine Beschleunigung um ~40 Tage."
```

**Warum wertvoll:** Board-Reports, Investor-Pitches (Assure), NCA-Gespräche — überall wo Zahlen allein nicht reichen.

---

### 2.5 Intelligent Incident Autopilot

**Status:** NIS2-Incident-Phases automatisiert, aber keine AI-gestützte Triage

**Die Vision:**

```
Operator meldet: "2 Stunden Kontaktverlust mit Satellit"
  → Claude klassifiziert:
    * Severity: HIGH (Art. 89 Meldepflicht?)
    * Regulatorische Trigger: NIS2 24h-Meldung, Art. 83 Incident Report
  → Auto-Aktionen:
    * NIS2-Phase starten
    * NCA-Notification drafren
    * Telemetrie-Logs anfordern
    * Ursachenanalyse: "Solar-Event? Thruster-Fehler? Comms-Anomalie?"
    * Korrelation mit Space-Weather-Daten
  → Auto-Draft: NCA-Notification, Versicherungs-Claim, Board-Briefing
```

---

## Teil 3: Kryptografie & Trust — Deep Tech Differenzierung

### 3.1 Zero-Knowledge Compliance Proofs (REVOLUTIONARY)

**Status:** Verity nutzt SHA-256 Blinded Commitments (Hiding + Binding), aber kein ZK

**Die Vision:**

```
Regulator fragt: "Erfüllt Ihr Satellit Art. 68 (25-Jahr Orbital Lifetime)?"

Aktuell: Operator offenbart Orbit-Daten, Treibstoff-Level, Decay-Rate
  → Proprietäre Daten liegen bei der Behörde
  → Wettbewerbsrisiko

Mit ZK-Proof:
  → zk-SNARK beweist: "Orbital Lifetime < 25 Jahre"
  → OHNE Orbit, Treibstoff oder Trajectory-Daten zu offenbaren
  → Regulator kann Proof in O(1) verifizieren
  → Kein Vertrauensproblem, kein Datenabfluss
```

**Implementation:** Circuit in `circom`, Groth16 Proving-System, Verifier als Smart Contract oder standalone

**Warum bahnbrechend:** Ermöglicht Cross-Border-Compliance ohne Datenoffenlegung. Fundamental anders als alles auf dem Markt.

---

### 3.2 Blockchain-Anchored Audit Trail

**Status:** SHA-256 Hash-Chain intern in DB — manipulierbar bei DB-Kompromittierung

**Die Vision:**

```
Audit-Chain Merkle Root (Batch von 100 Einträgen)
  → Alle 24h → Ethereum Attestation Service (EAS)
  → On-Chain Transaction ID zurück in DB
  → Externe Verifizierung möglich ohne Caelex-Zugriff
```

**Warum wertvoll:** Macht den Audit-Trail wirklich tamper-proof. Regulatoren können unabhängig prüfen.

---

### 3.3 W3C Verifiable Credentials

**Status:** Proprietäres JSON-Attestation-Format

**Die Vision:**

```
VerityAttestation → W3C Verifiable Credential Format
  → Portable: Akzeptiert von allen kompatiblen Verifiern
  → DID-basiert: Decentralized Identifier für Operator + Regulator
  → Interoperabel: Andere Plattformen können Caelex-Attestierungen prüfen
  → Standard: W3C VC Data Model 2.0
```

**Warum strategisch:** Positioniert Caelex als **Infrastruktur-Provider** für das gesamte EU Space Act Compliance-Ökosystem, nicht nur als Tool.

---

### 3.4 Post-Quantum Cryptography Migration

**Status:** Ed25519 (elliptische Kurven — quantum-verwundbar)

**Die Lösung:** Dual-Signing mit klassischen + post-quanten Algorithmen:

```
attestation.signatures = {
  ed25519: "...",     // Legacy-Kompatibilität
  dilithium3: "...",  // Lattice-based (NIST PQC Standard)
}
```

**Timeline:** EU Space Act Enforcement 2025-2027 — Post-Quantum Readiness ist ein Differenzierungsmerkmal.

---

## Teil 4: Externe Datenquellen — Was Fehlt

### 4.1 Aktuell Integriert (5 Quellen)

| Quelle                | Frequenz      | Integration                                        |
| --------------------- | ------------- | -------------------------------------------------- |
| CelesTrak TLE/GP      | Täglich 05:00 | HOCH — Orbital-Mechanik, Decay, Cross-Verification |
| NOAA Solar Flux F10.7 | Täglich 04:00 | MITTEL — Atmosphärische Dichte für Drag-Modell     |
| EUR-Lex SPARQL        | Täglich 07:00 | MITTEL — Regulatorische Updates, 3 SPARQL Queries  |
| Space-Track CDM       | Alle 30 Min   | HOCH — Conjunction Events, Collision Probability   |
| Sentinel Telemetrie   | Echtzeit      | HOCH — Eigenes Agent-Netzwerk, Hash-Chain          |

### 4.2 Fehlende High-Value Quellen

| Quelle                                   | Wert                                            | Aufwand | Impact                                  |
| ---------------------------------------- | ----------------------------------------------- | ------- | --------------------------------------- |
| **ESA DISCOS** (Debris-Katalog)          | Fragmentations-Events, Debris-Cloud-Predictions | MITTEL  | SEHR HOCH — Pflicht für COPUOS/IADC     |
| **NOAA Space Weather Alerts** (Echtzeit) | Solar Proton Events, Geomagnetische Stürme, CME | NIEDRIG | HOCH — Proaktive Anomalie-Warnung       |
| **Space-Track Decay Rates**              | Erweiterte CDM-Daten (bereits authentifiziert!) | NIEDRIG | HOCH — Predictive Deorbiting            |
| **SpaceX Launch API**                    | Launch-Manifeste, Pre-Flight-Compliance         | MITTEL  | MITTEL-HOCH — Pre-Launch Zertifizierung |
| **ITU Frequency DB**                     | Echtzeit-Koordination, Interferenz-Prediction   | MITTEL  | MITTEL — Spectrum Compliance            |
| **EUR-Lex ATOM Feed**                    | Change Notifications statt Polling              | NIEDRIG | MITTEL — Schnellere Alerts              |

### 4.3 Strategische Quellen (Partnerschaften)

| Quelle                                      | Wert                                | Status               |
| ------------------------------------------- | ----------------------------------- | -------------------- |
| **NCA Portal APIs** (BMWK, CNES)            | Direkte Submission + Status-Polling | Bilateral verhandeln |
| **Insurance Market Data** (Lloyd's, Aon)    | Premium-Benchmarks, Claims-Daten    | Vendor-Partnerschaft |
| **ESA SST** (Space Surveillance & Tracking) | EU-eigene Conjunction-Daten         | EU-Institution       |

---

## Teil 5: Ungenutzte Prisma-Modelle & Daten

### 5.1 Asset Registry (Nexus) — 34 Referenzen, kaum genutzt

**Modelle:** `Asset`, `AssetRequirement`, `AssetDependency`, `AssetSupplier`, `AssetVulnerability`

**Ungenutzte Felder:**

- `Asset.criticality` (AssetCriticality enum)
- `AssetVulnerability.cveId`, `cvssScore`
- `AssetSupplier.singlePointOfFailure`

**Opportunity:** Cybersecurity-Score sollte Asset-Vulnerabilities einbeziehen. NIS2 verlangt Critical Asset Tracking — das Modell existiert, wird aber ignoriert.

### 5.2 RegulatoryRequirement & EvidenceRequirementMapping — Knowledge Base im Verborgenen

**Ungenutzt:**

- `implementationGuide` — Implementierungsanleitung pro Requirement
- `implementationTimeWeeks` — Geschätzter Aufwand
- `EvidenceRequirementMapping.validUntil` — Evidenz-Ablauf nicht geprüft

**Opportunity:** Diese Daten im Assessment-Wizard anzeigen: "Implementieren Sie Art. X. Geschätzter Aufwand: Y Wochen. Anleitung: ..."

### 5.3 API Routes ohne Frontend

| Route                                  | Daten                                | Status        |
| -------------------------------------- | ------------------------------------ | ------------- |
| `/api/v1/optimizer/analyze`            | Cost-Benefit Szenarien               | Kein Frontend |
| `/api/v1/optimizer/presets`            | Regulatory Arbitrage Presets         | Kein Frontend |
| `/api/v1/ephemeris/fleet/intelligence` | Fleet-Level Compliance Patterns      | Kein Frontend |
| `/api/v1/evidence/gaps`                | Coverage-Analyse, fehlende Evidenz   | Kein Frontend |
| `/api/nca-portal/analytics`            | Per-Authority Raten, Response-Zeiten | Kein Frontend |

---

## Teil 6: Priorisierte Roadmap

### Tier 1: Ship Sofort (1-2 Wochen, maximaler Impact)

| #        | Feature                                  | Impact                     | Aufwand |
| -------- | ---------------------------------------- | -------------------------- | ------- |
| **T1.1** | Sentinel-Verity Auto-Validation          | Einzigartig auf dem Markt  | 3 Tage  |
| **T1.2** | Ephemeris → Compliance Score (dynamisch) | Physik-basierte Compliance | 4 Tage  |
| **T1.3** | AI Document Auditor (Astra-Tool)         | 4-6h/Submission gespart    | 3 Tage  |
| **T1.4** | NOAA Space Weather Alerts Integration    | Proaktive Risiko-Warnung   | 1 Tag   |
| **T1.5** | NCA Rejection → Score Recalculation      | Feedback-Loop schließen    | 2 Tage  |

### Tier 2: Nächster Sprint (2-4 Wochen)

| #        | Feature                                       | Impact                            | Aufwand |
| -------- | --------------------------------------------- | --------------------------------- | ------- |
| **T2.1** | Regulatory Change Interpreter (AI)            | Proaktive Compliance Intelligence | 5 Tage  |
| **T2.2** | Compliance Narrative Generator                | Board-Reports, Investor-Pitches   | 3 Tage  |
| **T2.3** | ESA DISCOS Integration                        | Debris-Compliance Pflicht         | 4 Tage  |
| **T2.4** | Optimizer Frontend + Scenario Recommendations | Existierende API nutzen           | 5 Tage  |
| **T2.5** | Conjunction → Compliance Deadline Sync        | Shield ↔ Compliance verbinden     | 3 Tage  |
| **T2.6** | NCA Analytics Page                            | API existiert bereits             | 4 Tage  |

### Tier 3: Quartal (Deep Tech Differenzierung)

| #        | Feature                          | Impact                        | Aufwand  |
| -------- | -------------------------------- | ----------------------------- | -------- |
| **T3.1** | Zero-Knowledge Compliance Proofs | Revolutionary — Datenfreiheit | 2 Wochen |
| **T3.2** | Blockchain-Anchored Audit Trail  | Tamper-Proof für Regulatoren  | 1 Woche  |
| **T3.3** | W3C Verifiable Credentials       | Interoperabilität, Ökosystem  | 1 Woche  |
| **T3.4** | Predictive Compliance ML         | Zeitreihen-Analyse, Prognosen | 2 Wochen |
| **T3.5** | Incident Autopilot (AI)          | Automatische Triage + Draft   | 1 Woche  |
| **T3.6** | Post-Quantum Crypto Migration    | Zukunftssicherheit            | 2 Wochen |

### Tier 4: Vision (6+ Monate)

| #        | Feature                                      | Impact                                      |
| -------- | -------------------------------------------- | ------------------------------------------- |
| **T4.1** | NCA Portal API Integration (bilateral)       | Direkte Submission + Tracking               |
| **T4.2** | Multi-Party Computation für Joint Compliance | Konsortial-Compliance ohne Datenoffenlegung |
| **T4.3** | Fleet Intelligence Dashboard                 | Constellation-weite Compliance              |
| **T4.4** | Threshold Cryptography (M-of-N Signing)      | Multi-Party Attestation Authority           |

---

## Teil 7: Zusammenfassung

### Was Caelex bereits hat (und kein Konkurrent):

1. **Sentinel** — Eigenes Telemetrie-Agent-Netzwerk mit Hash-Chain-Integrität
2. **Verity** — Ed25519-signierte Compliance-Attestierungen mit SHA-256 Blinded Commitments
3. **Ephemeris** — 5 Physikmodelle für Orbital-Compliance-Forecasting
4. **Shield** — Echtzeit Conjunction Assessment mit Space-Track-Integration
5. **Astra** — 40-Tool AI Assistant mit regulatorischem Fachwissen
6. **Generate 2.0** — 4-Layer Prompt-Engineering mit Prompt Caching für NCA-Dokumente
7. **RRS/RCR** — Regulatory Readiness Score / Credit Rating (wie S&P für Compliance)

### Was fehlt — und den 10x-Sprung auslöst:

**Die Systeme sind isolierte Inseln.** Sentinel weiß nicht, was Verity attestiert. Ephemeris beeinflusst keine Compliance-Scores. Shield-Events erzeugen keine Compliance-Deadlines. Astra kann keine Dokumente prüfen.

**Verbinde die Inseln** → und Caelex wird zur **autonomen regulatorischen Intelligenzplattform**:

```
                    ┌─────────────┐
                    │   REGULATOR  │
                    │  (NCA/EUSPA) │
                    └──────┬──────┘
                           │ ZK-Proofs / W3C VCs
                    ┌──────▼──────┐
                    │   VERITY    │◄── Sentinel Auto-Validation
                    │ Attestation │◄── Blockchain Anchor
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  EPHEMERIS   │ │SHIELD│ │   ASTRA AI   │
       │ Orbital Phys │ │ CDMs │ │ Doc Auditor  │
       │ Decay/Fuel   │ │ C/A  │ │ Reg Interpreter│
       └──────┬──────┘ └──┬───┘ │ Narratives   │
              │            │     └──────┬──────┘
              │            │            │
       ┌──────▼────────────▼────────────▼──────┐
       │         COMPLIANCE ENGINE              │
       │  Dynamic Scoring + Predictive ML       │
       │  ← Sentinel ← Ephemeris ← Shield ←    │
       │  → Deadlines → Alerts → Reports →      │
       └────────────────────────────────────────┘
```

**Das Ergebnis:** Nicht "hat der Operator einen Plan?" sondern **"wird der Satellit tatsächlich compliant sein, kryptografisch bewiesen, ohne Daten offenzulegen, mit autonomer Dokumentprüfung und predictiver Risikobewertung."**

Das ist der Unterschied zwischen einem Compliance-Tool und einer regulatorischen Intelligenzplattform.
