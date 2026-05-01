# Caelex — Operator-Profil & Trust-Strategie

**Stand:** 2026-05-01
**Scope:** Wie kriegen wir den Operator dazu, sensible Compliance-Profil-Daten einzugeben — bei minimalem Trust und maximalem Daten-Nutzen?
**Trigger:** Founder-Frage: "Das Problem ist, wie viel Daten ist der Operator bereit einzugeben, weil das sind sensible Daten."

> **Eine Zeile.** Wir lösen das Cold-Start-Trust-Problem nicht mit "vertrau uns" — sondern mit einem **vierstufigen Datenflow**: erst Auto-Detection ohne Operator-Input, dann öffentliche Schätzdaten, dann progressive Disclosure mit Value-First, am Ende Counsel-First-Path für die sensitivsten Daten.

---

## Das Kern-Problem ehrlich benennen

### Welche Daten Caelex braucht (Operator-Profil-Foundation)

Aus dem Guided-Compliance-Doc — die vier Profil-Kategorien:

**A — Wer bist du?**

- Operator-Type, Größe (MA/Umsatz), Headquarter-Jurisdiction, Operating-Jurisdictions, **Investor-Backing**

**B — Was machst du?**

- Mission-Types, Spacecraft-Klassen, **Anzahl Spacecraft + geplante**, **Payload-Types**, **Customer-Types**, Supply-Chain-Position

**C — Wo stehst du heute?**

- Existing Authorizations, Insurance-Police-Details, **Cyber-Posture (existing ISO/SOC, oder Lücken)**, existing NIS2-Submissions, **bestehende Vorfälle**

**D — Wer hilft dir?**

- Counsel-Kanzlei, Insurance-Broker, **Cyber-Vendor**, **Internal Compliance-Lead**, Mission-Director

### Welche davon sind sensibel — und warum

| Kategorie                                 | Sensibilität              | Warum Operator zögert                                  |
| ----------------------------------------- | ------------------------- | ------------------------------------------------------ |
| Operator-Type, Größe (öffentlich bekannt) | Niedrig                   | Steht oft im Handelsregister/Crunchbase                |
| Headquarter-Jurisdiction                  | Niedrig                   | Trivial                                                |
| Operating-Jurisdictions                   | **Mittel**                | Verrät Operations-Strategie an Caelex/Wettbewerber     |
| **Investor-Backing**                      | **Hoch**                  | Häufig NDA-geschützt                                   |
| **Mission-Types + Spacecraft-Details**    | **Sehr hoch**             | Geschäftsgeheimnis, oft auch Defense-relevant          |
| **Customer-Liste**                        | **Sehr hoch**             | Geschäftsgeheimnis Nr. 1                               |
| **Cyber-Posture-Lücken**                  | **Sehr hoch**             | Wenn das leakt = NIS2-Verstoß + Reputations-Schaden    |
| **Bestehende Vorfälle**                   | **Sehr hoch**             | Manchmal nicht-publizierte Incidents                   |
| **Compliance-Lücken**                     | **Sehr hoch**             | Selbst-Inkriminierung — wer gibt das einer SaaS-Firma? |
| **Defense/ITAR/Dual-Use-Status**          | **Sehr hoch + rechtlich** | ITAR-Compliance verbietet teilweise Cloud-Storage      |
| Counsel-Kanzlei, Insurance-Broker         | Mittel                    | Anwaltsgeheimnis-relevant                              |

**Die ehrliche Beobachtung:** ~60% der Daten die wir für ein gutes Profil brauchen, sind in der "Sehr hoch"-Kategorie.

### Warum klassische Compliance-Onboarding-Patterns scheitern

**Drata/Vanta-Pattern**: "Connect AWS + GitHub + Okta + Slack, wir scannen automatisch."

- Funktioniert für Cloud-native SaaS-Firmen
- Funktioniert NICHT für Raumfahrt-Operatoren — die haben on-prem Ground-Stations, ITAR-controlled SharePoint, klassifizierte Mission-Daten in Air-Gap-Systemen

**Klassische Wizard-Patterns**: "Beantworte 47 Fragen über deine Firma."

- Funktioniert für motivierte Compliance-Lead in Großkonzernen
- Funktioniert NICHT für 12-Personen-Operator: Compliance-Lead hat keine Zeit, fühlt sich wie Verhör, gibt halbe Antworten oder bricht ab

**Wir brauchen ein anderes Pattern.**

---

## Die Lösung: 4-stufiger Datenflow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STUFE 1 — AUTO-DETECTION (ohne Operator-Input)                 │
│           Public Data + URL/Domain-Scrape                       │
│           ✓ 0 Sensibilität                                      │
│           ✓ 0 Operator-Aufwand                                  │
│           ✓ 30-40% Profil-Coverage                              │
│                                                                 │
│                        ↓ Auto-Filled                            │
│                                                                 │
│  STUFE 2 — VALUE-FIRST DEMO (Hypothese-Mode)                    │
│           Caelex sagt: "Aufgrund öffentlicher Daten vermuten    │
│           wir: 47 Articles applicable, 12 Workflows..."         │
│           ✓ Operator sieht Wert vor Dateneingabe                │
│           ✓ Operator kann anonyme Demo nutzen                   │
│           ✓ Bestätigt/Korrigiert öffentliche Annahmen           │
│                                                                 │
│                        ↓ Trust gebaut                           │
│                                                                 │
│  STUFE 3 — PROGRESSIVE DISCLOSURE (just-in-time)                │
│           Frage Daten erst wenn Workflow sie braucht            │
│           ✓ Spacecraft-Details erst beim ersten Authorization   │
│           ✓ Customer-Liste erst wenn Sub-Provider-Audit         │
│           ✓ Cyber-Posture erst wenn NIS2-Workflow startet       │
│                                                                 │
│                        ↓ Wert pro Datum sichtbar                │
│                                                                 │
│  STUFE 4 — COUNSEL-FIRST (für sensibelste Daten)                │
│           Counsel-Anwalt fügt sensibelste Daten ein             │
│           ✓ Anwaltsgeheimnis als Trust-Anchor                   │
│           ✓ Operator delegiert Eingabe                          │
│           ✓ Caelex bekommt nur attestation, nicht Roh-Daten     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stufe 1: Auto-Detection (~30-40% Profil aus 0 Operator-Input)

### Was wir aus der Welt ziehen können — ohne Operator-Touch

Wenn Operator sich anmeldet mit `acme-space.de` Domain, kann Caelex ohne Operator-Input bereits sammeln:

| Datum                                     | Quelle                                                     | Genauigkeit             |
| ----------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| **Operator-Name + Rechtsform**            | Handelsregister (DE), Companies House (UK), INPI (FR)      | 95%+                    |
| **Headquarter-Adresse + Jurisdiction**    | Same                                                       | 95%+                    |
| **Mitarbeiter-Größe (grob)**              | LinkedIn-API, Crunchbase                                   | ±25%                    |
| **Funding/Investor-Backing (öffentlich)** | Crunchbase, PitchBook-Free-Tier                            | 80%+                    |
| **Geschäftsführer/CTO**                   | Handelsregister, LinkedIn                                  | 90%+                    |
| **Mission-Types (grob)**                  | Website-Scrape ("we operate Earth Observation satellites") | 70%                     |
| **Existing Spacecraft (öffentlich)**      | UNOOSA Online Index of Objects, CelesTrak Catalog          | 100% (für registrierte) |
| **Existing Authorizations (öffentlich)**  | EU/EUSPA-Public-Register, BAFA-Public-Register             | 100%                    |
| **NIS2-Klassifikation (Schätzung)**       | Aus MA-Größe + Branche                                     | 70%+                    |
| **EU-Space-Act-Anwendbarkeit**            | Aus Jurisdiktion + Mission-Type                            | 90%                     |
| **COPUOS-Member-Status**                  | Public                                                     | 100%                    |

### Konkret: 30-Sekunden-Onboarding

```
┌────────────────────────────────────────────────────────────┐
│   Willkommen! Erstelle dein Caelex-Profil                  │
│                                                            │
│   Firma:       Acme Space GmbH                             │
│   Domain:      acme-space.de                               │
│                                                            │
│   [Continue →]                                             │
└────────────────────────────────────────────────────────────┘

                            ↓ 30 Sekunden später

┌────────────────────────────────────────────────────────────┐
│   ✓ Wir haben dich erkannt                                 │
│                                                            │
│   Caelex hat aus öffentlichen Quellen gezogen:             │
│   ─────────────────────────────────────────────            │
│   ✓ Acme Space GmbH                                        │
│     Handelsregister Berlin HRB 234567                      │
│     Sitz: Berlin · DE · ~14 Mitarbeiter (LinkedIn)         │
│                                                            │
│   ✓ Mission-Type: vermutlich Earth-Observation             │
│     (Website "We operate optical EO satellites...")        │
│                                                            │
│   ✓ Bestehende Satelliten in UNOOSA-Index:                 │
│     - Sat-Acme-1 (LEO, 2023, 47kg)                         │
│     - Sat-Acme-2 (LEO, 2024, 52kg)                         │
│                                                            │
│   ✓ Bestehende BAFA-Authorization für Sat-Acme-1           │
│                                                            │
│   Stimmt das so? [Ja, weiter] [Nein, korrigieren →]        │
└────────────────────────────────────────────────────────────┘
```

**Operator-Effort: 0 Felder ausfüllen. Profil-Coverage: ~35%.**

### Was bauen wir dafür

- `OperatorProfileAutoFill`-Engine: nimmt Domain, ruft 5-7 Public-APIs ab, baut Profil-Skeleton
- UNOOSA-Online-Index-Adapter (existiert schon teilweise via CelesTrak-Adapter)
- Handelsregister-Scraper (DE), Companies-House-API (UK), etc.
- LinkedIn/Crunchbase-Free-Tier-Adapter

**Aufwand:** ~3-4 Wochen Engineering. **Wert:** 30-40% Profil-Coverage ohne Operator-Aufwand.

---

## Stufe 2: Value-First Demo / Hypothese-Mode

### Bevor Operator weitere Daten gibt — sie sollen Wert sehen

Mit den Auto-Detected-Daten zeigt Caelex sofort eine **Hypothesen-Compliance-Map**:

```
┌────────────────────────────────────────────────────────────────┐
│   AUFGRUND ÖFFENTLICHER DATEN VERMUTEN WIR:                    │
│                                                                │
│   📋 47 EU-Space-Act-Articles applicable                       │
│        (basierend auf: 47kg LEO EO-Mission, DE-HQ)             │
│                                                                │
│   🛡️  NIS2: vermutlich "Essential Entity"                      │
│        (basierend auf: ~14 MA + Space-Sektor)                  │
│                                                                │
│   📜 5 Compliance-Workflows aktiv:                             │
│        ├─ Authorization Re-Cert für Sat-Acme-1 (T-90d)         │
│        ├─ Authorization Submission für Sat-Acme-3 (geplant?)   │
│        ├─ NIS2-Continuous-Compliance                           │
│        ├─ COPUOS-Decommissioning für Sat-Acme-1 (~2030)        │
│        └─ Annual Re-Attestation Window: in 8 Monaten           │
│                                                                │
│   ⚠️  3 Items die deine Aufmerksamkeit brauchen:                │
│        ─ Sat-Acme-1 Authorization läuft in 14 Monaten ab       │
│        ─ NIS2-Registration bei BSI (Frist 06.03.2026 — passé!) │
│        ─ Insurance-Renewal-Cycle steht an                      │
│                                                                │
│   [Diese Hypothese ist 70% sicher] [Verfeinern →] [Nutzen →]   │
└────────────────────────────────────────────────────────────────┘
```

### Was passiert hier psychologisch

**Operator denkt:** "Wow, die kennen mich schon? Und sie zeigen mir nützliche Sachen ohne dass ich was eingegeben habe?"

**Trust wird gebaut durch:**

1. **Visible Reasoning**: Caelex zeigt **woher** die Annahmen kommen ("basierend auf: 47kg LEO EO-Mission")
2. **Confidence-Score**: "70% sicher" macht Caelex ehrlich, nicht omniszient
3. **Sofortiger Wert**: Operator sieht 3 Items die ihm helfen, **bevor** er irgendwas eingegeben hat
4. **Korrigier-Button**: Operator kann jede Annahme widerlegen → Caelex updated → Operator lernt dass Caelex anpassbar ist

### Anonymous-Mode-Variant

Für besonders trust-arme Operatoren: **Demo-Mode mit synthetischen Daten**.

```
┌────────────────────────────────────────────────────────────┐
│   Willst du Caelex erst ausprobieren ohne deine echten     │
│   Daten?                                                   │
│                                                            │
│   [→ Demo-Mode mit "Beispiel-Operator GmbH"]               │
│       Sieh wie Caelex für eine fiktive 12-MA-LEO-Operator  │
│       funktionieren würde. Keine echten Daten, kein Risiko.│
│                                                            │
│   [→ Mit unseren öffentlichen Daten starten]               │
│       Caelex zieht öffentlich verfügbare Infos. Du musst   │
│       nichts eingeben.                                     │
└────────────────────────────────────────────────────────────┘
```

Demo-Mode dauert 5-10 Min, danach: "OK ich glaub das System funktioniert. Let's start real."

---

## Stufe 3: Progressive Disclosure / Just-in-Time-Datenabfrage

### Prinzip: Daten erst dann fragen, wenn Workflow sie braucht

Falsch (klassisches Onboarding):

```
Schritt 1: Beantworte 47 Fragen über alle deine Spacecraft, alle Customer,
          alle Insurance-Policen, alle Vendor-Verträge.
Schritt 2: ...
```

Richtig (Caelex Just-in-Time):

```
Operator klickt "Start Authorization for new Mission Sat-Acme-3"
  ↓
Workflow startet → Schritt "Spacecraft-Metadata"
  ↓
Caelex fragt: "OK, jetzt brauchen wir Sat-Acme-3 Details:
              Masse, Orbit, Payload-Type, Launch-Date..."
  ↓
Operator gibt EXAKT die Daten ein die JETZT für DIESEN Workflow nötig sind.
  ↓
Schritt "Insurance-Coverage" kommt erst LATER → dann fragen wir Insurance-Daten.
```

### Vorteile

- **Operator gibt Daten weil er den Workflow weitermachen will**, nicht weil ein Onboarding-Dialog es verlangt
- **Pro Datum kann Caelex zeigen WARUM** ("Für EU-Space-Act Art. 14 Insurance-Coverage brauchen wir die Police-Höhe")
- **Datenvolumen pro Session ist klein** (5-15 Felder statt 47)
- **Operator behält Souveränität**: er entscheidet wann er welchen Workflow startet → wann welche Daten kommen

### Konkrete Daten-Erhebungs-Punkte

```
ONBOARDING (Tag 1)              → Auto-Detection: Firma + Domain
                                 → Optional: 3 Fragen ("habe ich aktive Missionen?")

ERSTE MISSION (Tag 14)          → Spacecraft-Metadata (Masse, Orbit, Payload)
                                 → Mission-Phase-Daten

INSURANCE-WORKFLOW (Tag 60)     → Insurance-Provider, Police-Details
                                 → Renewal-Date

NIS2-CYBER-WORKFLOW (Tag 90)    → Cyber-Vendor, existing Pen-Tests
                                 → IR-Plan-Details

SUPPLIER-RISK-WORKFLOW (Tag 120) → Critical Suppliers (Honeywell, etc.)
                                 → Supply-Chain-Diagrams

COUNSEL-ENGAGEMENT (Tag 14-365) → Counsel-Kanzlei, Anwaltsdetails

INVESTOR-DD (auf Anforderung)   → Investor-Backing, Cap-Table

FAZIT: nach 6 Monaten ist Profil zu ~85% gefüllt — verteilt auf 6+ Workflow-Sessions,
       pro Session 10-15 Min, jede mit klarem "warum brauchen wir das gerade".
```

### UX-Pattern: "Why we need this"

Jedes Daten-Eingabefeld hat eine **inline Erklärung**:

```
Spacecraft-Mass [in kg]:    [47]
└─ Warum wir das brauchen?
   EU-Space-Act Article 14 sieht für >100kg höhere Insurance-Mindestdeckung
   vor (60M€ vs 30M€). Wir berechnen daraus deine Pflichten.
   Diese Daten bleiben nur in deinem Caelex-Account, sind AES-256-GCM
   verschlüsselt, werden niemals an Wettbewerber/Investoren weitergegeben.
   [Mehr zu unseren Privacy-Garantien →]
```

---

## Stufe 4: Counsel-First-Path für die sensibelsten Daten

### Das Anwaltsgeheimnis als Trust-Anchor

Manche Daten gibt der Operator **nie** einer SaaS-Firma:

- Aktuelle ungelöste Cyber-Vorfälle
- Compliance-Lücken
- Customer-Listen
- Defense/ITAR-relevante Mission-Details

**Aber er gibt sie seinem Counsel.** Anwaltsgeheimnis (§ 203 StGB, § 53 StPO) ist gesetzlich geschützt — das ist eine Trust-Grade die SaaS-Firmen nie erreichen werden.

### Die Lösung: Counsel-Plattform als Vermittler

```
   OPERATOR's sensibelste Daten
         ↓ (vertrauensvoll, weil Anwaltsgeheimnis)
   COUNSEL (in Atlas)
         ↓ (gibt Caelex nur Attestations, nicht Roh-Daten)
   CAELEX
         ↓ (sieht nur "Counsel attestiert: Cyber-Posture = Tier-2")
         (sieht NICHT die spezifischen Lücken)
```

### Konkretes Beispiel: Cyber-Posture-Assessment

**Falsch (operator → caelex direct):**

```
Caelex: "Hast du im letzten Jahr ungelöste Cyber-Vorfälle? Bitte beschreibe."
Operator: "Soll ich das wirklich einer Cloud-SaaS sagen?" → bricht ab
```

**Richtig (operator → counsel → caelex via attestation):**

```
Caelex an Counsel-User Tobias: "Tobias, dein Mandant Acme braucht ein
Cyber-Posture-Assessment für NIS2. Bitte fülle das mit ihm aus.
Caelex bekommt nur das Endergebnis (Tier-1/2/3) plus deine Bewertung."

Tobias geht mit Operator durch (Anwaltsgeheimnis).
Tobias gibt in Atlas-Form ein:
  - Cyber-Posture: TIER-2
  - Attest-Datum: 2026-05-01
  - Counsel-Sign-Off (QES)
  - "Es bestehen 2 minor gaps die in Mitigation sind" (anonymized)

Caelex sieht: TIER-2 + Counsel-Attest. Sieht NICHT die spezifischen Gaps.
Compliance-Engine arbeitet mit TIER-2 weiter.
```

**Warum das funktioniert:**

- Operator gibt sensible Daten an Counsel (vertrauensvoll)
- Counsel hat Caelex-Account und gibt **strukturierte Bewertungen** ein
- Caelex bekommt **derived data** (Tier-Klassifikation) statt Roh-Daten
- Bei Audit kann Caelex zeigen: "Counsel-Sign-Off existiert, hier die Hash-Chain"

### Wer könnte als "Counsel" fungieren

- Externe Anwaltskanzlei (Atlas-User-Account)
- Internal Compliance-Lead mit Vertraulichkeits-Zertifikat
- Insurance-Broker (für Versicherungs-relevante Daten — Maklergeheimnis)
- Independent Auditor (für Compliance-Status)

---

## Privacy-Engineering — die technischen Garantien

### Was Caelex anbietet als technische Vertrauens-Basis

**1. Per-Tenant Encryption (existiert schon):**

- AES-256-GCM mit scrypt-KDF
- Pro Org einen eigenen Encryption-Key (derived aus Org-ID + Master-Key)
- Selbst wenn Caelex's DB geleakt wird: Daten anderer Orgs sind nicht entschlüsselbar

**2. Field-level Encryption (existiert für sensible Felder):**

- VAT-IDs, Bank-Accounts, Tax-IDs, Insurance-Policy-Numbers sind explizit AES-encrypted
- Erweiterbar auf Operator-Profil-Felder

**3. BYOK (Bring-Your-Own-Key) für Enterprise:**

- Operator kann eigenen Master-Key in AWS KMS halten
- Caelex kann ohne BYOK-Key gar nicht entschlüsseln
- **Caelex selbst kann nicht auf die Daten zugreifen** ohne dass Operator's KMS-Permission gewährt
- Schutz vor Insider-Threat + Subpoena-Risk

**4. Differential Privacy für Aggregations:**

- Wenn Caelex aggregierte Daten zeigt (Pharos-Statistiken, Industry-Benchmarks), wird Differential Privacy angewendet
- Einzelne Operator-Daten sind aus Aggregaten nicht rekonstruierbar
- Existiert schon in `pharos/differential-privacy.ts`

**5. Confidential Computing für ultra-sensitive Workloads (Roadmap 2028):**

- AWS Nitro Enclaves / Azure Confidential VMs
- Caelex's eigene Engineers können die Daten **technisch nicht sehen** (in Enclave isoliert)
- Nur für Verschlusssachen-Customer (Defense/Bundeswehr-Tier)

**6. Verifiable-Compute via Verity-Logs:**

- Jede Compute-Operation auf sensiblen Daten wird im Verity-Log protokolliert
- Operator kann nachträglich verifizieren wer wann was berechnet hat
- Tamper-evidence durch RFC-6962-Merkle-Trees

**7. Daten-Souveränität: Export + Delete:**

- Operator kann jederzeit ALLE seine Daten als ZIP exportieren
- Operator kann ALLES löschen (mit Audit-Trail dass es gelöscht wurde)
- Kein Vendor-Lock-In = Trust-Building durch Reversibilität

**8. Open-Source-Engines:**

- Die 24 Compliance-Engines könnten teilweise open-sourced werden (zumindest die EU-Space-Act-Engine)
- Operator kann sehen WIE Caelex Compliance berechnet → kein Black-Box
- Reduziert Misstrauen massiv ("ich kann mir den Code anschauen")

### UI-Pattern: "Privacy-Dashboard"

Neue Page `/dashboard/settings/privacy`:

```
┌────────────────────────────────────────────────────────────────┐
│   DATEN-SOUVERÄNITÄT — DEINE KONTROLLE                         │
│                                                                │
│   ─ Welche Daten hast du Caelex gegeben?                       │
│      [zeigt vollständige Liste, sortiert nach Sensibilität]    │
│                                                                │
│   ─ Wer hat darauf zugegriffen?                                │
│      [Audit-Log: 23 Caelex-System-Reads heute (alle Engine),   │
│       0 Caelex-Engineering-Reads, 2 Counsel-Reads (Tobias)]    │
│                                                                │
│   ─ Wer kann darauf zugreifen?                                 │
│      [Granulares Permission-Setting pro Datenfeld pro Aktor]   │
│                                                                │
│   ─ Encryption-Status                                          │
│      ✓ AES-256-GCM auf Field-Level für sensible Felder         │
│      ✓ Per-Tenant-Key (anderer Org-Daten nicht entschlüsselb.) │
│      ⚪ BYOK aktivieren? (Enterprise-Tier)                     │
│                                                                │
│   ─ Datenexport                                                │
│      [Alle deine Daten als ZIP herunterladen →]                │
│                                                                │
│   ─ Datenlöschung                                              │
│      [Alle Daten löschen (mit Audit-Receipt) →]                │
└────────────────────────────────────────────────────────────────┘
```

---

## Trust-Building durch Caelex-eigene Compliance

### "Wer ist der Hüter der Hüter?"

Operatoren werden Caelex nur sensible Daten geben, wenn Caelex selbst beweist dass es **mindestens so compliant ist wie sie selbst sein müssen**:

| Caelex-Compliance                                                    | Trust-Wirkung                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **SOC 2 Type II + ISO 27001:2022** (in Roadmap Q3-Q4 2026)           | Standard für jeden Enterprise-Procurement                              |
| **BSI C5 Type 2** (Roadmap 2027)                                     | Pflicht für Bundesbehörden-Customer                                    |
| **ISO 42001 (AI Management)** (Roadmap 2027)                         | Erstmals AI-spezifische Zertifizierung                                 |
| **NIS2-Compliance** (selbst Essential Entity wenn schwellenrelevant) | Caelex zeigt: wir leben was wir verkaufen                              |
| **DSGVO-Schrems-II-konform** (AWS Bedrock EU Migration)              | Pflicht für jede EU-Daten-Hostung                                      |
| **Verity-Tree-Heads selbst BAFA-cosigned**                           | Operator kann verifizieren dass Caelex selbst seine Logs nicht fälscht |

**Sales-Story die das ermöglicht:**

> "Caelex ist selbst NIS2-Essential-Entity. Wir verarbeiten Compliance-Daten für 100+ EU-Operatoren. Unsere ISO 27001 + SOC 2 + C5-Audits sind verifizierbar. Unsere Hash-Chain-Logs sind von BAFA cosigned. Unsere AI ist EU-AI-Act-konform. Wenn du uns NICHT vertraust, vertraust du keiner Compliance-SaaS in Europa."

---

## Konkrete Onboarding-Sequence — Tag 1

So sieht der Tag-1-Flow konkret aus:

```
T+0 sec:   Domain-Eingabe acme-space.de + Email
T+30 sec:  Auto-Detection läuft, Profil-Skeleton fertig
T+60 sec:  Hypothesen-Compliance-Map zeigt 47 Articles, 5 Workflows, 3 Items
T+90 sec:  Operator: "Stimmt — und Sat-Acme-3 ist auch in Planung"
           (Single-Field-Add, 5 Sekunden)
T+2 min:   Operator: "Sat-Acme-3 Launch geplant für Q3 2026, also etwa 14 Mo"
T+3 min:   Caelex baut Personal Compliance-Roadmap mit 4 aktiven Phasen
T+5 min:   Operator klickt "Authorization-Workflow für Sat-Acme-3 starten"
T+10 min:  Workflow läuft, Astra fragt nur die Spacecraft-Metadata-Felder
           die JETZT nötig sind (Masse, Orbit, Payload — 8 Felder)
T+15 min:  Astra hat First-Draft des Technical-Documents fertig

T+15 min:  Operator hat:
           ✓ Account erstellt
           ✓ Profil zu 60% gefüllt (35% auto, 25% Workflow-driven)
           ✓ Erstes konkretes Compliance-Asset (Document-Draft)
           ✓ Klare Roadmap für die nächsten Wochen
           ✓ KEINE 47-Felder-Wizard ausgefüllt
           ✓ KEINE sensitive Daten gegeben (nur Spacecraft-Metadata)
```

**Das ist 15 Minuten zu echtem Wert. Das ist die UX-Spec.**

---

## Die fünf Trust-Tier-Strategien zusammengefasst

| Tier                         | Wer                  | Was wir verlangen                    | Was wir bieten                                                   |
| ---------------------------- | -------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| **0 — Anonymous**            | Newcomer             | Nichts (Demo-Mode)                   | Synthetische Demo, 5-10 Min, Selber-Nachvollziehen               |
| **1 — Public-Data**          | Tag 1                | Domain + Email                       | Auto-Detection, Hypothesen-Map, Sofort-Wert                      |
| **2 — Just-in-Time**         | Tag 14-180           | Workflow-spezifische Daten on-demand | Pro Datum klares "warum brauchen wir das", Encryption, Audit-Log |
| **3 — Counsel-Mediated**     | Tag 30-180           | Sensitive Daten via Counsel-Anwalt   | Anwaltsgeheimnis-Trust, derived attestations statt Roh-Daten     |
| **4 — Confidential-Compute** | Sovereign-Tier 2028+ | ITAR/Defense-Daten                   | AWS Nitro Enclaves, Caelex-Engineers haben null Access           |

**Die meisten Operator landen in Tier 1+2** (~85% der Daten). Tier 3 für die sensitivsten 10%. Tier 4 nur für Defense-Tier.

---

## Die einzige falsche Antwort: "Wir machen Drata-style mit allen Fragen vorne"

Das ist die naheliegende, aber falsche Antwort. Operator-Compliance-Lead bricht ab. Caelex hat 2 Stunden seine Zeit gewollt, bekommt 0 Daten.

**Die richtige Antwort: Operator soll das Gefühl haben dass JEDES Datum das er gibt, ihm SOFORT etwas bringt.** Auto-Detection erste 35% kostenlos. Workflows liefern die nächsten 50% gegen sichtbaren Wert. Counsel-Path schließt die letzten 15%. Privacy-Engineering macht jeden Schritt safe.

**Caelex ist nicht "Vertrau uns mit deinen Daten" — Caelex ist "Wir geben dir Wert für jedes Datum + Privacy-Engineering das beweisbar ist."**

---

## Implementierungs-Aufwand (geschätzt)

| Komponente                                      | Aufwand                          |
| ----------------------------------------------- | -------------------------------- |
| Auto-Detection-Engine (Public-API-Integrations) | ~3-4 Wochen                      |
| Hypothesen-Compliance-Map UI                    | ~1-2 Wochen                      |
| Demo-Mode mit synthetischen Daten               | ~2 Wochen                        |
| Just-in-Time-Daten-Eingabe pro Workflow         | ~1 Woche pro Workflow (verteilt) |
| Privacy-Dashboard `/settings/privacy`           | ~2 Wochen                        |
| BYOK-Integration (AWS KMS)                      | ~3-4 Wochen                      |
| Counsel-Mediated-Attest-UI                      | ~3 Wochen                        |
| Field-Level-Encryption auf Profil-Daten         | ~1-2 Wochen                      |

**Total für volle Adoption: ~16-20 Wochen** verteilt über 12 Monate. Die ersten 6-8 Wochen (Auto-Detection + Hypothesen-Map + Demo-Mode + Just-in-Time-Pattern) bringen 80% des Wertes.

---

## Schluss

Das Operator-Profil ist Caelex's Foundation — aber wir bekommen es **nicht durch Verhör**, sondern durch **vier ineinandergreifende Trust-Stufen**:

1. **Auto-Detection** macht 35% kostenlos
2. **Value-First** baut Trust durch sofortigen Wert
3. **Just-in-Time** macht jeden Datenpunkt nachvollziehbar nötig
4. **Counsel-First** löst die sensibelsten 15% via Anwaltsgeheimnis

Plus: Privacy-Engineering (Encryption, BYOK, Differential Privacy, Verity-Logs) als technische Garantie.

**Operator-Compliance-Lead's Erlebnis: "Caelex hat mir Wert gegeben bevor ich ihm Daten gegeben habe. Bei jedem Datenpunkt war klar warum. Die sensibelsten Sachen hat mein Anwalt eingegeben — ich musste sie nicht direkt rausgeben. Und ich kann jederzeit alles exportieren oder löschen. Das ist der Service den ich will."**

Das ist die UX-Spec. Der Rest ist Implementation.

— Operator-Profil-Trust-Strategie, im Auftrag des Founders
