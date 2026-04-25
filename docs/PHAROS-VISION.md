# Pharos — Caelex für Behörden

> **Status:** Konzept · noch kein Code · 25. April 2026  
> **Stakeholder:** Polleschnerjulian (Founder/CEO)  
> **Vorgänger-Kontext:** Atlas × Caelex Bilateral Bridge (geshipped April 2026)

## Position im Caelex-Ökosystem

```
                    ┌─────────────┐
                    │   Caelex    │  ← Operatoren (Satelliten, Launch, Services)
                    │  (Himmel)   │     Compliance-Heimat, Astra-AI, Assure
                    └──────┬──────┘
                           │ Bilateral-Handshake (Mandat-Architektur)
                  ┌────────┴────────┐
                  │                 │
            ┌─────┴─────┐     ┌─────┴─────┐
            │   Atlas   │     │  Pharos   │
            │ (Träger)  │     │(Leuchtturm)│
            └───────────┘     └───────────┘
              Kanzleien         Behörden
              Beratung           Aufsicht
```

Drei Pole, eine Architektur. Das Bilateral-Handshake-Pattern (Caelex × Atlas) skaliert direkt zu trilateral.

## Pharos — Das Symbol

Der **Leuchtturm von Alexandria** (250 v. Chr., 100m hoch, 1.500 Jahre in Funktion) ist die ideale Metapher für die Behörden-Rolle:

- **Schützt ohne zu überwachen** — der Leuchtturm signalisiert die Küste, er verfolgt keine einzelnen Schiffe. Genau die Trennung Aufsicht ≠ Überwachung die Operatoren brauchen um Pharos zu vertrauen.
- **Dauerhafte Orientierung** — der Leuchtturm steht über Jahrhunderte, nicht Legislaturperioden. Behörden-Compliance soll Operatoren stabile Rahmenbedingungen geben.
- **Aktives Signal** — der Leuchtturm sendet (Feuer, später Licht), passiv anzeigen reicht nicht. Pharos muss aktiv kommunizieren ("dieser Weg ist genehmigt", "diese Klippe gibt Sanktion").
- **Eine Quelle, viele Empfänger** — der Leuchtturm leuchtet für jedes Schiff im Meer. Pharos ist die geteilte Compliance-Wahrheit für alle Beteiligten.

## Wer ist die Zielgruppe?

| Behörde                    | Heute                                              | Mit Pharos                                         |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| **BAFA**                   | Dual-Use Export-Genehmigungen, 8 Wochen pro Antrag | Live-Compliance-Sicht, Auto-Vorprüfung, 2 Wochen   |
| **BNetzA**                 | Spektrum-Koordinierung, ITU-Filings per Email      | Real-Time ITU-Status, automatischer Konflikt-Check |
| **BMWK / DLR**             | Nationales Weltraumrecht (BWRG), Aufsicht          | Live-Inspektor-Zugang, scope-gated Audit           |
| **BMVg / Bundeswehr CIR**  | Defense-Procurement Compliance                     | Realtime-Evidence statt 200-Seiten-PDF             |
| **BSI**                    | NIS2-Aufsicht KRITIS Sektor                        | Live-Cyber-Compliance, Anomalie-Erkennung im Pool  |
| **ESA / MS-Liaison**       | Programm-Compliance, Cross-MS Coordination         | EU-Cross-Border Compliance-Sicht                   |
| **EU Commission DG DEFIS** | EU-weite Enforcement                               | Aggregations-View über alle 27 MS                  |

## Die vier Säulen von Pharos

### Säule 1 — Regulator Workspace

Die Behörde als Tenant in Pharos mit:

- **Operator-Roster** ihres Aufsichtsbereichs (Live, gefiltert, RBAC)
- **Compliance-Heatmap** je Operator über alle Module
- **Submission-Inbox** strukturiert statt Email-Eingang
- **Inline-Review** mit pro-Sektion-Status (OK / Question / Reject), versioniert
- **Auto-Vorprüfung** via Pharos-AI: vergleicht Antrag mit Operator-Caelex-Daten, meldet Inkonsistenzen

### Säule 2 — Aufsicht-Handshake (Bilateral Authority ↔ Operator)

Identische Architektur wie Atlas-Caelex Mandat-Handshake, aber:

- **Aufsicht-Scope** definiert durch Genehmigungs-Auflagen (nicht freie Verhandlung wie beim Mandat)
- **Mandatory Disclosure Floor** — Behörde MUSS bestimmte Daten sehen können (nicht-verhandelbar)
- **Hash-Chain Audit-Log** — jeder Behörden-Zugriff wird im Operator-Log mit signiertem Hash protokolliert
- **Operator-side Visibility** — Operator sieht in seinem Caelex-Dashboard "BAFA hat heute um 14:23 Doc X geprüft"

**Trust-Vorteil:** Aufsicht ist nicht mehr Black-Box. Symmetrische Transparenz statt "wir wissen nicht was die Behörde sieht".

### Säule 3 — Cross-Authority Coordination Layer

Eine deutsche Satelliten-Firma wird heute oft von 4-6 Behörden gleichzeitig reguliert mit **null Datenaustausch**. Pharos:

- **Single-Source-of-Truth** im Operator-Caelex
- **Mit Operator-Consent** geteilter Compliance-Status zwischen Behörden
- **Cross-Check-Engine** — erkennt Widersprüche zwischen Aussagen an verschiedene Behörden
- **EU-Cross-Border** — Cross-MS Sichtbarkeit
- **Mutual-Recognition-Framework** — wenn BAFA OK, kann andere EU-Behörde per Default akzeptieren (Risk-based)

### Säule 4 — Pharos-AI (Sovereign-by-Default)

Astra für Behörden mit eigenem Tool-Set:

- `screen_operator_submission` — automatisierte Antrags-Vorprüfung
- `find_pattern_anomalies` — Sektor-weite Abweichungs-Detection
- `cross_reference_disclosures` — Widersprüche über Behörden-Grenzen
- `draft_genehmigungsbescheid` — Standard-Auflagen-Generator
- `regulatory_horizon_scan` — was kommt regulatorisch nächstes Quartal
- `simulate_policy_impact` — was wenn wir Schwelle X auf Y ändern

**Routing:** ausschließlich EU-Bedrock (Path A bereits gebaut). Sovereign-AI ist hier nicht "nice to have" sondern zwingend.

## Was wir schon haben

✅ Bilateral-Handshake-Architektur (von Atlas, voll wiederverwendbar)  
✅ Hash-Chain-Audit-Log (sha256-rooted, tamper-evident)  
✅ Scope-Gate (Permissions, RBAC pro Kategorie)  
✅ Sovereign-AI-Routing (Path A EU-Bedrock-bereit)  
✅ Multi-Tenant Organization-Model  
✅ Astra-AI-Engine (wiederverwendbar mit anderen Tools)  
✅ EU AI Act + DSGVO Compliance (P0 + P1 + P2 dokumentiert)

## Was wir bauen müssen für Pharos-MVP

❌ `AUTHORITY` als 4. OrganizationType-Variante  
❌ Aufsicht-Handshake (Variante des Mandat-Handshakes mit Mandatory-Disclosure-Floor)  
❌ Operator-Roster-View für Behörden  
❌ Submission-Inbox (strukturierte Dossier-Pipeline)  
❌ 2-3 Pharos-AI Tools (start mit screen + find_anomalies)  
❌ Authority-side AI Disclosure (analog `/legal/ai-disclosure` mit Behörden-Spezifika)  
❌ AWG/AWV-Modul-Erweiterungen (BAFA-Spezifika)

**Geschätzt:** 3-4 Monate für minimal-viable Pharos mit Lighthouse-Pilot-Behörde.

## Implementierungs-Phasen

### Phase B-1 · Lighthouse-Behörde (3-6 Monate)

**Empfehlung:** BAFA (Export-Genehmigungen formalisiert) ODER BNetzA (ITU-Filings strukturiert).

Build:

- Operator-Roster-View
- Submission-Inbox (read-only auf Operator-Caelex mit Consent)
- Bilateral Aufsicht-Handshake
- 1-2 Pharos-AI Tools

**Win:** Behörde reduziert Bearbeitungszeit von 8 auf 2 Wochen → Case-Study → Inbound von weiteren Behörden.

### Phase B-2 · Drei-Behörden-Cluster (6-12 Monate)

Onboard 2 weitere Behörden, build Cross-Authority-Layer:

- BMWK (BWRG)
- BSI (NIS2)
- BaFin (Versicherung)

### Phase B-3 · EU-Skalierung (12-24 Monate)

Replikation in 3-5 EU-MS:

- Luxemburg, Frankreich (CNES), Italien (ASI), Niederlande
- Plus: DG DEFIS + ESA-Defence-Liaison

### Phase B-4 · Public-Trust-Layer (24+ Monate)

- Krypto-signierte Compliance-Attestations
- Public-API für Bürger / Investoren / Journalisten
- Whistleblower-Channel

## Strategische Spannungsfelder

### "Caelex überwacht uns" — Wahrnehmungs-Risiko

Operator könnte denken: _"Caelex und Behörde im gleichen System — Caelex liefert mich aus."_

**Lösung:** Architektur-Separation explizit kommunizieren. Pharos ist getrenntes Produkt, getrennte Domain (`pharos.eu`), getrennter Vertrag. Caelex sieht nur Vermittler-Status, nie Inhalt.

**Marketing:** _"Caelex ist deine Datenheimat. Pharos ist deine Brücke zur Behörde — und du baust sie selbst, mit Hashs auf jeder Schiene."_

### Vergaberecht

Behörden kaufen via VgV/UVgO/VOL — 12-24 Monate Sales-Cycle. Geschäftsmodell muss das aushalten.

**Hebel — Förder-Programme:**

- EU Horizon Europe → Digital Europe Programme → GovTech-Pilots
- BMI Modernisierungsprogramm
- BMWK Innovation-Programme

### Internationale Komplexität

NATO ≠ EU ≠ Mitgliedsstaaten. Federation-Architektur: jede Behörde eigene Pharos-Instanz mit definierten Cross-Border-Permissions.

## Geschäftsmodell-Varianten

### Variante A — Self-Build, direct-to-Behörde

Caelex baut selbst, Cofounder/Hire mit Behörden-Sales-Erfahrung (Ex-BSI, Ex-BMWK), Förder-Programme als Bridging-Finance.

- **Pro:** Maximales Upside
- **Con:** Sales-Capacity-bound, Founder-Aufwand hoch

### Variante B — White-Label für GovTech-Integratoren

Materna, MaibornWolff, GovDigital verkaufen Pharos als deren Produkt, Caelex liefert Plattform.

- **Pro:** Schneller Markt-Reach
- **Con:** Halbes Margin

### Variante C — Joint-Venture mit GovTech-Player

JV mit Materna oder Capgemini-Public-Sector. Sales-Reach + Compliance-Glaubwürdigkeit, halben Cap.

### Variante D — Open-Source-Core + kommerzielles Hosting

Mattermost / Sentry-Modell. Behörden lieben Open-Source weil Vendor-Lock-In klassisches Vergabe-Argument.

- **Pro:** Vergabe-friendly, Community-Effekt
- **Con:** Slow-monetization am Anfang

**Mein Take:** **D + B kombiniert** — Open-Source-Kern bauen, weiß-labeln an GovTech-Integrators, gleichzeitig Direct-to-Behörde für Premium-Tier.

## Network Effects — der eigentliche Moat

```
Mehr Operatoren in Caelex
    ↓
Mehr Datenpunkte für Pharos-Behörden
    ↓
Bessere Pharos-AI (lernt aus Sektor-weiten Patterns)
    ↓
Behörden machen schnellere/bessere Entscheidungen
    ↓
Operatoren wollen MEHR in Caelex sein (kürzere Genehmigungszeiten)
    ↓
Mehr Kanzleien sehen Wert in Atlas (ihre Mandanten sind drin)
    ↓
Mehr Mandanten geleitet von Atlas-Anwälten landen bei Caelex
    ↓
[Loop verstärkt sich exponentiell]
```

**Drei Lock-Ins die compoundieren:**

1. **Datenintegrationsschuld** — 18 Monate Compliance-Daten ist teurer Wechsel
2. **Behördlicher Endorsement-Effekt** — wenn 2 Behörden Pharos nutzen, will dritte auch (Peer-Pressure unter Behörden ist real)
3. **Regulatorische Lock-In** — wenn EU-Verordnungen Pharos-Format als Standard akzeptieren, wird Pharos zum De-Facto-EU-Compliance-Standard

## Nächste Schritte (vor Code)

1. **Customer-Discovery** — informelle Gespräche mit BAFA / BNetzA / BSI über Pain-Points (4-6 Wochen)
2. **Förder-Programm-Antrag** — Digital Europe Programme oder BMWK Innovation für Pilot-Finanzierung
3. **Co-Founder/Advisor-Suche** — Person mit Behörden-Sales-Track-Record
4. **Detail-Spec für Phase B-1** (kann parallel zu 1-3 entstehen)
5. **`AUTHORITY` org-type** als minimaler Schema-Spike (1-2 Tage Code) um Architektur zu validieren

## Approval

Dieses Dokument ist der **Konzept-Stand** — kein Code wird gebaut bevor ein expliziter Go von Polleschnerjulian kommt.

Diskussions-Punkte für die nächste Iteration:

- Welche Lighthouse-Behörde priorisieren? (BAFA vs BNetzA vs BSI)
- Welche Geschäftsmodell-Variante? (A/B/C/D)
- Förder-Antrag-Strategie?
- Co-Founder/Advisor-Profil-Suche?

---

**Status:** Draft 1 · 25. April 2026  
**Vorausgegangene Decisions:**

- Naming: Pharos (gewählt aus Pool von Aegis/Praetor/Forum/Codex/Argus/Themis/Vigil)
- Triumvirat-Logik: Caelex (Himmel) · Atlas (trägt) · Pharos (leuchtet)
