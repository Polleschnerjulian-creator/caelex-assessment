# Caelex Comply — Guided Compliance (Vision-Korrektur)

**Stand:** 2026-05-01
**Scope:** Wie ein Operator wirklich mit Caelex interagiert. **Korrigiert** die Vision aus `CAELEX-COMPLY-2027-VISION.md`, die Linear-Power-User-Pattern angenommen hatte.
**Trigger:** Founder-Feedback: "Cmd-K ist nicht das Hauptding. Großteil hangelt sich übers Interface durch. Wir brauchen Operator-Profil → automatische Workflows → an die Hand nehmen → maximum Automation."

> **Eine Zeile.** Caelex Comply ist nicht ein Compliance-Tool das du benutzt — es ist ein Compliance-Autopilot, der dich an die Hand nimmt: "Aufgrund deines Operator-Profils trifft das hier auf dich zu. Hier ist was als nächstes passieren muss. Astra macht 80% davon automatisch, du approve'st die letzten 20%."

---

## Was ich falsch hatte

In `CAELEX-COMPLY-2027-VISION.md` habe ich die **Linear-Inbox-Welt** beschrieben:

- Cmd-K als Universal-Verb-Engine
- Today-Inbox mit Urgent/This-Week/Watching
- Triage-Queue mit J/K-Keyboard-Nav
- AstraProposal-Approval-Flow

Das ist ein **Power-User-Pattern**. Es funktioniert für die 5% Operator die wie Software-Engineers denken (Linear-Native). Es funktioniert NICHT für die 95% Operator die "ich habe 12 Mitarbeiter, einen halben Compliance-Lead und keine Zeit das System zu lernen" sind.

**Was Caelex wirklich braucht: Drata-Auto-Pilot + TurboTax-Wizard.** Nicht Linear-Triage.

---

## Die korrigierte Vision in einem Bild

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   1. OPERATOR-PROFIL  →  Caelex weiß, wer du bist und was du machst    │
│                                                                         │
│         (LEO-Operator, 12 MA, DE+FR, 47kg-Sat, Cyber-relevant,         │
│          NIS2-Essential, Insurance-Pflicht, COPUOS-Mitglied)            │
│                                                                         │
│                              ↓ Engine                                   │
│                                                                         │
│   2. APPLICABLE COMPLIANCE  →  Was trifft auf dich zu?                  │
│                                                                         │
│         (47 Articles, 12 Modules, 3 Workflows, 8 Deadlines,             │
│          5 Stakeholder-Touch-Points)                                    │
│                                                                         │
│                              ↓ Auto-generation                          │
│                                                                         │
│   3. PERSONAL COMPLIANCE ROADMAP  →  Dein Plan                          │
│                                                                         │
│         (Phase 1: Authorization · Phase 2: Pre-Launch ·                 │
│          Phase 3: Continuous · Phase 4: Annual Re-Cert)                 │
│                                                                         │
│                              ↓ Astra automation                         │
│                                                                         │
│   4. AUTOMATED EXECUTION  →  Astra macht 80%                            │
│                                                                         │
│         (Drafts · Pull-from-M365 · Auto-Re-Attest · Reminders ·         │
│          Document-Generation · Cross-Reference)                         │
│                                                                         │
│                              ↓ Human approval                           │
│                                                                         │
│   5. HUMAN DECISIONS  →  Du approve'st 20%                              │
│                                                                         │
│         (High-Impact-Actions · QES-Sign-Offs · Exceptions ·             │
│          Counsel-Engagement · Final Submissions)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Die Reihenfolge ist **kausal**: ohne Operator-Profil kein Applicable-Set. Ohne Applicable-Set kein Roadmap. Ohne Roadmap keine Automation. Ohne Automation immer noch ein Manual-Tool. **Das Operator-Profil ist die Foundation, alles andere fällt daraus.**

---

## 1. Das Operator-Profil — die Foundation

### Was Caelex über dich weiß

Wenn du dich anmeldest, durchläufst du ein **strukturiertes Onboarding** (kein Free-Form-Wizard). Caelex baut ein detailliertes Profil:

**Kategorie A — Wer bist du?**

- Operator-Type (Constellation-Operator / Launch-Provider / Service-Provider / Ground-Station-Operator / Mission-Integrator)
- Größe (Mitarbeiter-Zahl, Jahresumsatz, Bilanzsumme — entscheidet NIS2-Schwelle)
- Headquarter-Jurisdiction (DE / FR / UK / NL / IT / ES / ...)
- Operating-Jurisdictions (wo betreibst du Spacecraft, Bodenstationen, Kunden)
- Investor-Backing (PE / VC / Public / Government — entscheidet DORA-Relevanz)

**Kategorie B — Was machst du?**

- Mission-Types (LEO-Earth-Observation / GEO-Telecom / Lunar / Cislunar / Inter-Planetary)
- Spacecraft-Klassen (Cubesat / Smallsat / Mediumsat / Largesat — Massenklasse entscheidet Article-Anwendbarkeit)
- Anzahl aktive Spacecraft + geplante 12 Monate
- Payload-Types (Optical / Radar / RF / IoT / Defense — entscheidet Export-Control-Relevanz)
- Customer-Types (B2B-Commercial / B2G-Government / B2C / Mixed)
- Supply-Chain-Position (Tier-1-Operator / Sub-Operator / Service-Provider an Operator)

**Kategorie C — Wo stehst du heute?**

- Hast du schon eine Authorization? (BAFA-License / BNetzA / FCC / ...)
- Versicherung in place? (Welche Höhe, welcher Anbieter, wann läuft sie ab)
- Cyber-Posture: Self-Assessment + ggf. existierendes ISO 27001 / SOC 2
- Bestehende Compliance-Submissions (NIS2-Registration, Article-Tracker-Status, etc.)

**Kategorie D — Wer hilft dir?**

- Counsel-Kanzlei (mit Caelex-Account oder externe Email)
- Insurance-Broker
- Cyber-Vendor / Pen-Test-Provider
- Internal Compliance-Lead (wer im Team)
- Mission-Director (wer signt am Ende)

### Wie das Profil gepflegt wird

- **Onboarding-Wizard** (15-30 Minuten beim Setup, einmalig)
- **Auto-Updates** durch Mission-Lifecycle (neuer Spacecraft = Profil-Update + neue Workflows)
- **Manual-Updates** unter `/dashboard/profile` jederzeit
- **Astra-Reminder**: alle 6 Monate "stimmt dein Profil noch?" — kein klassisches Re-Onboarding, aber strukturierte Validierung

Das Profil **lebt in einem Prisma-Model** (`OperatorProfile`) und ist die Eingabe für alle Engines.

---

## 2. Applicable-Compliance — "Was trifft auf mich zu?"

Aus dem Operator-Profil berechnet Caelex automatisch dein **Applicable-Compliance-Set**. Die 12+ Engines (existieren schon im Code: `engine.server.ts`, `nis2-engine.server.ts`, `space-law-engine.server.ts`, etc.) nehmen das Profil und produzieren:

```
APPLICABLE-COMPLIANCE-SET für Anna's Sat-12-Mission:

EU SPACE ACT (47 Articles applicable):
  ✓ Article 7 — Mission Authorization (mandatory)
  ✓ Article 14 — Insurance Coverage (60M€ minimum, weil <500kg)
  ✓ Article 17 — Risk Assessment (mandatory weil Cyber-relevant)
  ✓ Article 76 — Decommissioning (mandatory weil LEO)
  ✓ Article 80 — Liability (mandatory)
  ⊗ Article 23 — NOT applicable (gilt nur für GEO-Operatoren)
  ⊗ Article 35 — NOT applicable (gilt nur für >500kg)
  ... [42 weitere]

NIS2 DIRECTIVE:
  ✓ Klassifikation: ESSENTIAL ENTITY (weil Space-Sector + >50 MA)
  ✓ 51 Anforderungen aus Annex I anwendbar
  ✓ Incident-Notification 24h/72h/30d
  ✓ Supply-Chain-Audit-Pflicht (Art. 21(2)(d))

NATIONAL SPACE LAW (DE):
  ✓ Weltraumgesetz § 4 — Genehmigungspflicht
  ✓ Weltraumgesetz § 6 — Versicherungspflicht
  ✓ BAFA-Verfahren applicable

COPUOS GUIDELINES:
  ✓ Long-Term-Sustainability-Guidelines 1, 3, 7
  ✓ IADC-Debris-Guidelines (25-year-rule applicable)

INSURANCE:
  ✓ Mindestdeckung: 60M€ (basierend auf Spacecraft-Klasse + LEO)
  ✓ Pre-Launch-Coverage: ja
  ✓ Third-Party-Liability: ja

CYBERSECURITY:
  ✓ NIS2 + ENISA Space-Sector-Guidelines
  ✓ ISO 27001:2022 empfohlen (nicht mandatory)
  ✓ Pen-Test-Pflicht: jährlich

⊗ NOT APPLICABLE:
  ✗ EU Space Act Article 23 (GEO-only)
  ✗ ITAR (kein US-Export von Tech)
  ✗ EAR Class 6 (kein dual-use)
  ✗ DORA (Caelex selbst nicht Finanzunternehmen, aber bei deinem Investor-Type)
```

### Das ist kein generischer Compliance-Katalog

Andere Tools zeigen dir **alle** Articles, alle Anforderungen, alle Frameworks — du musst selbst rauspicken. Caelex zeigt dir **nur was anwendbar ist** — strukturell, basierend auf deinem Profil.

Das ist der erste **massive Effizienz-Win**: statt 119 EU-Space-Act-Articles musst du dich um 47 kümmern. Statt allen 51 NIS2-Reqs alle die für Essential-Entity gelten. Caelex hat 60% der Arbeit schon gestrichen bevor du angefangen hast.

### Wenn das Profil sich ändert

- Spacecraft wird größer (>500kg) → Article 35 wird nachträglich applicable, Caelex erstellt neuen Workflow
- Du expandierst nach FR → French-Space-Law wird applicable, neue Submission-Pipeline startet
- NIS2-Update → Astra detected, applicable Anforderungen werden neu berechnet

**Das Applicable-Set ist live, nicht statisch.**

---

## 3. Personal Compliance Roadmap — "Was muss ich tun?"

Aus dem Applicable-Set generiert Caelex automatisch eine **persönliche Roadmap** — nicht nach Regulation gruppiert (das ist verwirrend), sondern nach **Phase + Mission-Lifecycle + Zeit**.

### Roadmap-Struktur für eine Mission

```
SAT-12 MISSION ROADMAP
Geplanter Launch: 2026-09-23 (in 145 Tagen)

──────────────────────────────────────────────────────────────────────
PHASE 1 — AUTHORIZATION (T-180 bis T-90)            ⬤ 8/12 done · 67%
──────────────────────────────────────────────────────────────────────
  ✓ Mission-Profil erstellt (DONE 12d ago)
  ✓ Spacecraft-Metadata vollständig (DONE 8d ago)
  ✓ Technical Document Draft (DONE — Astra hat draft erstellt, du approved)
  ✓ Counsel Review (DONE — Tobias signed off 3d ago)
  ⏳ Final Compliance Checks (IN PROGRESS — 8/12 modules GREEN)
  ⏳ QES-Sign-Off durch Mission-Director (PENDING — wartet auf Anna)
  ⏸ BAFA Submission (BLOCKED — wartet auf QES)
  ⏸ NCA Review Period (~30-60 days nach Submit)
  ⏸ ⏸ ⏸ ⏸ (4 weitere Steps)

  → NEXT ACTION: QES-Sign-Off durch Mission-Director
     [Open Step] [What does Astra need from me?]

──────────────────────────────────────────────────────────────────────
PHASE 2 — PRE-LAUNCH (T-90 bis T-0)                 ⬤ 0/8 · auto-start T-90
──────────────────────────────────────────────────────────────────────
  Auto-startet wenn Phase 1 = approved AND launch-date < 90 days
  ⏸ Insurance Renewal (60-day-buffer Policy)
  ⏸ Pre-Launch Cyber-Audit
  ⏸ COPUOS Decommissioning-Plan finalize
  ⏸ Final Pre-Launch Check (alle 12 Module GREEN-Pflicht)
  ⏸ Launch-Authorization-Certificate (QES)
  ⏸ ⏸ ⏸

──────────────────────────────────────────────────────────────────────
PHASE 3 — CONTINUOUS COMPLIANCE (T-0 bis EOL)       ⬤ läuft im Hintergrund
──────────────────────────────────────────────────────────────────────
  Daily: Compliance-Snapshot (automatisch, no action)
  Weekly: Drift-Detection (Astra summarized, you review)
  Monthly: Sentinel-Telemetry-Verification (automatisch)
  Quarterly: Insurance-Status-Check
  Yearly: Annual Re-Attestation Window (T+365 days)

──────────────────────────────────────────────────────────────────────
PHASE 4 — END-OF-LIFE (T+EOL bis T+EOL+90d)         ⬤ 0/6 · in 7+ years
──────────────────────────────────────────────────────────────────────
  Pre-Deorbit-Checklist
  Deorbit-Burn-Window
  Post-Deorbit-Verification (CelesTrak-monitoring)
  COPUOS Final Report
  NCA Final Report
  Archive
```

### Was du auf dem Hauptscreen siehst

Statt **"Today-Inbox mit 17 Items"** siehst du:

```
┌─────────────────────────────────────────────────────────────────┐
│  🚀 SAT-12 — DEINE NÄCHSTE AKTION                                │
│                                                                 │
│  Phase 1: Authorization · Step 6 von 12 · 67% complete         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ QES-Sign-Off durch Mission-Director                     │   │
│  │                                                          │   │
│  │ Was passiert hier:                                       │   │
│  │ • Astra hat alle Final-Checks durchlaufen ✓             │   │
│  │ • Tobias (Counsel) hat sein Sign-Off gegeben ✓          │   │
│  │ • Du als Mission-Director musst das finale Document     │   │
│  │   QES-signieren via D-Trust Cloud-Signature             │   │
│  │ • Danach: Caelex submitted automatisch an BAFA          │   │
│  │                                                          │   │
│  │ Geschätzte Zeit: 5-10 Minuten                            │   │
│  │ Hard-Deadline: keine (aber Launch in 145d → mach jetzt) │   │
│  │                                                          │   │
│  │ [Sign now via D-Trust →]   [Read Document first]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ──────────────────────────────────────────────                │
│                                                                 │
│  Was kommt danach (2 Steps):                                    │
│  ⏸ BAFA Submission (auto-fires nach Sign)                       │
│  ⏸ NCA Review (30-60 days, no action needed)                    │
│                                                                 │
│  [Show full roadmap →]                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  WAS SONST NOCH PASSIERT                                     │
│                                                                 │
│  • Insurance-Renewal-Empfehlung (Astra hat draft erstellt)     │
│    → 1 Klick zur Approval                                      │
│                                                                 │
│  • NIS2-Update von letzter Woche                                │
│    Betrifft 3 deiner Items, davon 1 sofort, 2 mit Übergang     │
│    → Astra hat schon Plan vorbereitet, 2 Min Review            │
│                                                                 │
│  • Counsel-Notiz von Tobias auf NIS2-Item-32                    │
│    "Frage zu Sub-Provider — siehe Notes"                        │
│    → Antwort in 30 Sekunden                                     │
│                                                                 │
│  [Open all (3) →]                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Das ist der Kern-Unterschied:**

- Statt "hier sind 17 Items, sortiere selbst" → **"Hier ist deine nächste Aktion."**
- Statt "klicke durch alle Inboxes" → **"Phase 1 ist 67% durch, hier ist Schritt 6."**
- Statt "AstraProposal in einer separaten Queue" → **"Astra hat das hier schon gemacht, du klickst approve."**

### Die Roadmap ist **die Single-Pane-of-Glass**

Eine Operator-Persona sieht **eine Hauptseite**: ihre Roadmap. Mit einem klaren "Was ist als nächstes?" und einer kontextuellen Erklärung.

Cmd-K bleibt für Power-User. Today, Triage, Proposals bleiben als **Sub-Surfaces** für tiefere Drilldowns. Aber der **default Tagesstart** ist die Roadmap.

---

## 4. Maximum Automation — Astra macht 80%

Wenn das Operator-Profil sagt "diese 47 Items treffen auf dich zu", muss Caelex die maximale Automation ausschöpfen. Pro Item: **was kann Astra alleine machen, was braucht menschliche Entscheidung?**

### Die fünf Automation-Tiers

```
TIER 1 — VOLLSTÄNDIG AUTOMATISIERT (kein Operator-Touch nötig)
─────────────────────────────────────────────────────────────────────
Beispiele:
  • Daily Compliance-Snapshot computation
  • CelesTrak TLE-Polling
  • Telemetry-derived Evidence (Sentinel)
  • Hash-Chain-Anchoring
  • Atlas Regulatory-Feed-Polling
  • Auto-Reminder-Generation
  • Audit-Log-Anchoring

→ Operator sieht das nie, läuft im Hintergrund
→ ~30% der Compliance-Arbeit
```

```
TIER 2 — ASTRA-DRAFT, OPERATOR-APPROVE (1-Click-Confirm)
─────────────────────────────────────────────────────────────────────
Beispiele:
  • Annual Re-Attestation: Astra summarized das Jahr, du klickst "confirm"
  • Document-Drafts: Astra schreibt, du reviewst + approve'st
  • Initial Notification (NIS2-Incident): Astra drafted, du approve'st
  • Counsel-Review-Request: Astra schreibt Briefing-Notiz, du sendest
  • Insurance-Renewal-Email: Astra drafted, du sendest

→ Operator sieht "Astra hat Vorschlag, 1 Klick"
→ ~30% der Compliance-Arbeit
```

```
TIER 3 — ASTRA-DRAFT, COUNSEL/CISO-REVIEW + OPERATOR-APPROVE (Multi-Actor)
─────────────────────────────────────────────────────────────────────
Beispiele:
  • Authorization Submission: Astra → Counsel-Review → Operator-Sign-Off
  • CRA Conformity Assessment: Astra → CISO-Sign-Off → Operator-Approve
  • Final NIS2 Incident Report: Astra → Counsel + CISO → Operator + QES

→ Operator orchestriert + approve'st am Ende
→ ~20% der Compliance-Arbeit
```

```
TIER 4 — OPERATOR-DRIVEN, ASTRA-ASSISTED (du machst, Astra hilft)
─────────────────────────────────────────────────────────────────────
Beispiele:
  • Spacecraft-Metadata-Eingabe (Forms, Astra fragt nach)
  • Mission-Plan-Authoring
  • Custom-Notes auf ComplianceItems
  • Evidence-Upload (du uploadest, Astra mapped auf Items)

→ Operator macht Hauptarbeit, Astra ist Co-Pilot
→ ~15% der Compliance-Arbeit
```

```
TIER 5 — REIN MANUELL (kann nicht automatisiert werden)
─────────────────────────────────────────────────────────────────────
Beispiele:
  • Pen-Test physisch durchführen (extern)
  • Versicherungs-Vertrag mit Versicherer aushandeln
  • Mission-Hardware-Tests
  • Counsel-Mandant-Gespräche
  • Behörden-Telefonate

→ Operator macht alleine, Caelex trackt nur Status
→ ~5% der Compliance-Arbeit (am physischsten)
```

### Resultat

**80% der Compliance-Arbeit ist Tier 1+2+3** — entweder vollautomatisiert oder mit minimaler Operator-Beteiligung.

**Operator's Tag besteht aus:** Roadmap öffnen → "nächste Aktion" — entweder ist es 1-Klick-Approve, oder ein 5-Min-Review, oder ein 15-Min-Form-Ausfüllen. Selten mehr.

### Beispiel: Annual Re-Attestation

**Heute (V1):**

- 89 Items zu re-attestieren
- Operator klickt jedes manuell durch
- 4-6 Stunden Arbeit
- Schreibt Notes manuell warum jedes weiterhin valide ist

**Caelex Comply Guided (Tier 2 Automation):**

- Astra durchläuft alle 89 Items proaktiv
- Pro Item generiert Astra eine Year-Summary: "Item NIS2-Art-32. In 2026: 3 Notes hinzugefügt, 2 Evidence-Updates, kein Status-Wechsel. **Empfehlung: Re-Attest ohne Änderung. Confidence: 95%.**"
- 89 Cards mit "Confirm" / "Mark for review" / "Mark as changed"
- Operator klickt durch alle 89 in **20-30 Minuten**
- Mass-Approve-Filter: "Confirm all items where confidence > 90% (76 of 89)" → ein Klick
- Übrig bleiben 13 Items zum manuellen Review (jene mit niedrigerer Confidence)

**90% Zeit-Ersparnis. 100% Audit-fest.**

---

## 5. Hand-Holding UX — du weißt jederzeit was als nächstes kommt

### Prinzip 1: Ein klarer "Next Action"-Button überall

Auf jeder Page, in jedem Workflow, in jedem Item: **es gibt immer einen sichtbaren "Was als nächstes?"-Hinweis**.

Beispiel auf der Mission-Roadmap:

```
[NEXT ACTION: Sign Document via D-Trust →]
```

Beispiel auf einem ComplianceItem:

```
[NEXT ACTION: Counsel-Review anfragen →] [Skip — Self-Attest →]
```

Beispiel im Onboarding:

```
[NEXT: Spacecraft 1 von 3 hinzufügen →] [Tour pausieren]
```

**Niemals ein Screen ohne Next-Action.**

### Prinzip 2: Inline-Erklärungen (no Tooltips, no Modals)

Wenn ein Operator nicht weiß was eine Anforderung bedeutet, muss die Erklärung **direkt sichtbar** sein, nicht in Hover-Tooltips versteckt:

```
NIS2 Article 21(2)(d) — Lieferketten-Sicherheit                  [WAS HEISST DAS? ▼]
Status: Evidence Required

                                        ↓ (auto-expanded für neue User)

  ┌─ WAS DAS BEDEUTET ─────────────────────────────────────────────┐
  │ NIS2 Art. 21(2)(d) verlangt von Essential Entities, dass sie   │
  │ ihre Supply-Chain absichern. Konkret musst du:                  │
  │                                                                │
  │ 1. Eine Liste deiner kritischen Lieferanten haben              │
  │ 2. Mit jedem Lieferant Sicherheitsklauseln im Vertrag          │
  │ 3. Vorfälle bei Lieferanten innerhalb 24h melden               │
  │                                                                │
  │ Caelex hilft dir bei:                                          │
  │ • Astra hat schon 8 deiner Lieferanten identifiziert           │
  │ • Standard-Vertragsklausel-Template ist verfügbar              │
  │ • Supplier-Portal für Attestations existiert                   │
  │                                                                │
  │ → Empfohlene Action: Supplier-Risk-Workflow starten            │
  └────────────────────────────────────────────────────────────────┘
```

Operator sieht **nicht "Article 21(2)(d) wherever"** — sie sieht ein **erklärtes, kontextualisiertes, mit Aktion versehenes** Item.

### Prinzip 3: Walkthrough-Tours für komplexe Workflows

Wenn du das erste Mal eine Authorization-Submission anfängst, startet ein **In-App-Tour**:

```
┌─ Caelex Tour ─────────────────────────────────────────┐
│                                                       │
│  Schritt 1 von 12                                    │
│                                                       │
│  Authorization Submission                             │
│                                                       │
│  Du beginnst gerade deine erste Mission-              │
│  Authorization. Das ist ein 6-12-monatiger Prozess.   │
│  Keine Sorge — Caelex führt dich durch jeden Schritt. │
│                                                       │
│  Heute: Spacecraft-Metadata einfüllen (15 Min)        │
│                                                       │
│  [Got it, start →]   [Skip tour]                      │
└───────────────────────────────────────────────────────┘
```

Pro Workflow eine **Tour mit klaren Phasen + Zeitschätzungen**. Operator weiß: "OK, das ist nicht 'einfach mal probieren', das ist ein 12-Schritt-Prozess, ich bin in Schritt 1, das wird 6 Monate dauern, Caelex begleitet mich."

### Prinzip 4: "Why am I seeing this?" auf jedem Item

Jedes ComplianceItem, jeder Workflow-Step, jede Aufforderung hat eine **klare Provenance**:

```
NIS2 Article 21(2)(d) — Lieferketten-Sicherheit

Why am I seeing this?
✓ Du bist als Essential Entity klassifiziert (>50 MA, Space-Sector)
✓ NIS2 Art. 21(2)(d) ist mandatory für Essential Entities
✓ Dein Profil zeigt 8 kritische Lieferanten

Why now?
✓ Phase 1 (Authorization) ist 67% durch
✓ NIS2-Compliance ist Voraussetzung für Phase 2 Pre-Launch
✓ Empfohlener Start: jetzt, geschätzte Bearbeitung 4 Wochen
```

Operator sagt nie "warum muss ich das?" — die Antwort ist immer sichtbar.

### Prinzip 5: Progressive Disclosure

Du siehst **nicht alle 47 applicable Articles auf einmal**. Du siehst:

- Was **jetzt** dran ist (Phase 1)
- Was **als nächstes** kommt (Phase 2)
- Was **später** kommt (Phase 3+4)

Phase 3 ist standardmäßig collapsed. Du musst sie nicht mental tragen. Wenn Phase 1 fertig ist, expandiert Phase 2 automatisch.

### Prinzip 6: Warning vor blockierenden Aktionen

Wenn du etwas tust was teuer rückgängig zu machen ist:

```
⚠ WARNUNG

Du klickst gerade "Submit to BAFA". Das ist ein finaler Schritt.

Was passiert wenn du klickst:
✓ Caelex submitted das Document an BAFA-Portal
✓ Eine Reference-Number wird generiert
✓ BAFA-Review-Window startet (typisch 30-60 Tage)
✓ Du kannst KEINE Änderungen am Document mehr machen ohne neuen Resubmit

Bist du sicher?

Letzter Check (Astra):
✓ Counsel-Sign-Off vorhanden (Tobias, 3d ago)
✓ Final Compliance-Checks alle GREEN
✓ QES-Signatur valid
✓ Kein Pre-Launch-Block aktiv

[YES, Submit to BAFA →]   [Wait, let me review again]
```

Operator muss sich nie schuldig fühlen "habe ich das richtig gemacht?" — das System sagt explizit "ja, du hast alle Pre-Conditions erfüllt".

---

## 6. Wie das UI-Hauptscreen aussieht

### Mission-Centric Dashboard (statt Compliance-Centric)

Wenn Operator sich einloggt, sieht **NICHT** Posture-Score-KPIs zuerst (das ist Bloomberg-Mindset). Stattdessen:

```
┌─────────────────────────────────────────────────────────────────────────┐
│   CAELEX COMPLY                                       Anna Schmidt · 🛰  │
│   ──────────────                                                        │
└─────────────────────────────────────────────────────────────────────────┘

  WILLKOMMEN ZURÜCK, ANNA. HEUTE WARTET FOLGENDES AUF DICH:
  ─────────────────────────────────────────────────────────

  🚀 SAT-12 — Authorization Submission
  ┌───────────────────────────────────────────────────────────────────┐
  │ Phase 1: Authorization                          67% ━━━━━━━━━──── │
  │                                                                   │
  │ ⚡ NÄCHSTER SCHRITT (5 Min)                                        │
  │   QES-Sign-Off durch Mission-Director                             │
  │   Astra + Counsel sind durch — du musst nur signieren.            │
  │                                                                   │
  │   [✍️  Sign now →]      [📖 What's this?]      [📅 Snooze 1d]     │
  └───────────────────────────────────────────────────────────────────┘

  📡 SAT-9 — Continuous Compliance
  ┌───────────────────────────────────────────────────────────────────┐
  │ Phase 3: Continuous · Status: HEALTHY ✓                           │
  │                                                                   │
  │ Nichts zu tun. Astra überwacht im Hintergrund.                    │
  │ Letzter Check: vor 4 Stunden · Alle 47 Items GREEN                │
  │                                                                   │
  │   [📊 View dashboard →]   [⏸ Pause monitoring]                    │
  └───────────────────────────────────────────────────────────────────┘

  📋 ANDERE AUFMERKSAMKEIT (3)
  ─────────────────────────────────────────────
  • NIS2-Update — Astra hat Plan vorbereitet, 2 Min Review
  • Insurance-Renewal — Astra-Empfehlung wartet
  • Annual Re-Attestation — startet in 60 Tagen, kein Action heute
  [Show all →]

  ────────────────────────────────────────────────────────────────────────

  📊 DEIN COMPLIANCE-HEALTH-SCORE
  ─────────────────────────────────────
  74% (+3 in 30 Tagen) — du bist auf einem guten Weg.
  [Detail anzeigen →]
```

**Was ist anders als die "Posture-Page" aus der Power-User-Vision?**

- **Mission-First** statt Number-First (Operator denkt in Missionen, nicht in Scores)
- **Next-Action-First** statt KPI-First (was muss ich tun, nicht wie viel ist offen)
- **Conversational Tone** ("Heute wartet folgendes auf dich") statt Terminal-Style
- **3 klare Buckets**: aktive Mission · Continuous · Andere Aufmerksamkeit
- **Score nur als Footer** — wichtig, aber nicht primär

### Eine Mission tiefer öffnen

Wenn Operator auf "Sat-12" klickt, landet sie in der **Mission-Detail**:

```
🚀 SAT-12 — POLESTAR EARTH-OBSERVATION
   ──────────────────────────────────
   47-kg LEO-Satellite · Geplanter Launch 2026-09-23 · 145 Tage

   ┌─ DEIN COMPLIANCE-PLAN FÜR DIESE MISSION ──────────────────────┐
   │                                                                │
   │   Phase 1: Authorization                  67%  ━━━━━━━━─────  │
   │   ▣ 8/12 Steps done                                            │
   │     [Show steps →]                                             │
   │                                                                │
   │   Phase 2: Pre-Launch                      0%   auto-start    │
   │   in 55 Tagen (T-90)                                           │
   │                                                                │
   │   Phase 3: Continuous                      —    nach Launch    │
   │                                                                │
   │   Phase 4: End-of-Life                     —    in 7+ Jahren  │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘

   ⚡ NÄCHSTE 3 AKTIONEN
   ──────────────────────

   1. QES-Sign-Off durch Mission-Director (5 Min)
      [Open →]

   2. Insurance-Renewal vorbereiten (auto-fires nach Sign)
      Wartet auf Schritt 1 oben.

   3. Counsel-Re-Engagement Phase 2 (in ~55 Tagen)
      Caelex schickt dir 7 Tage vorher Reminder.

   ────────────────────────────────────────────────────────────────

   📋 DETAILS & DEEP-DIVES                       (Power-User-Bereich)
   ──────────────────────────
   • Spacecraft-Metadata
   • Compliance-Items (47)
   • Audit-Trail
   • Astra-Conversations für diese Mission (4)
   • Stakeholder (Tobias Counsel, Munich Re Insurance, ...)
```

Standard-Operator landet in der Mission-Detail, sieht **klare Roadmap + Next-Actions**. Die Power-User-Bereiche (alle 47 Items, Audit-Trail, etc.) sind unten als "wenn du tiefer reingehen willst" sichtbar.

---

## 7. Die Sub-Surfaces für Power-User (existieren weiter, aber nicht primär)

Die "Linear-Power-User-Surfaces" aus meiner letzten Vision **existieren weiter**, aber sind nicht mehr default:

| Surface                                      | Zugriff                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `/dashboard/posture` (KPI-Heavy)             | Sidebar "Health Score" oder Mission-Detail-Footer             |
| `/dashboard/today` (Mercury-Inbox)           | Sidebar "Tasks" oder Cmd-K                                    |
| `/dashboard/triage` (Linear-Queue)           | Sidebar "Signals" oder beim Notification-Click                |
| `/dashboard/proposals` (AstraProposal-Queue) | Wenn Badge > 0 sichtbar; sonst Power-User-Sub-Surface         |
| `/dashboard/items/[reg]/[id]` (Item-Detail)  | Power-User-Drilldown von der Mission-Detail                   |
| Cmd-K                                        | Power-User Keyboard-Verb-Engine                               |
| `/dashboard/astra-v2` (Free-Form-Chat)       | Wenn du ein freies Gespräch willst — sonst Astra ist embedded |

**Die drei UI-Modi:**

1. **Newcomer-Mode** (default für die ersten 30 Tage): Nur Mission-Detail + Roadmap + Next-Action. Keine Power-User-Surfaces sichtbar.
2. **Standard-Mode** (default nach 30 Tagen): Mission-Detail primär + Sidebar-Links zu Power-Surfaces als Optionen.
3. **Power-User-Mode** (manuell aktivierbar in Settings): Alles sichtbar, Cmd-K-First, Linear-Style-Inbox-First.

Operator wählt nicht den Modus — Caelex erkennt nach **Usage-Pattern** (klickt sie viel? nutzt sie Cmd-K? skipt sie Tours?) und passt UI-Komplexität automatisch an. Newcomer kriegen Hand-Holding, Power-User kriegen Speed.

---

## 8. Der konkrete Tagesablauf nach diesem Modell

### Anna Tag 1 (Onboarding-Tag)

- 30 Min Onboarding-Wizard
- Operator-Profil komplett
- Caelex zeigt: "Du hast 47 Articles applicable, 12 Workflows, geschätzte Erst-Setup-Zeit: 4-6 Wochen"
- Sat-12 als erste Mission angelegt
- Walkthrough-Tour von Authorization-Workflow
- Tag endet bei Step 1 (Spacecraft-Metadata vollständig)

### Anna Tag 14 (Mitten in Authorization)

- Login → Mission-Dashboard
- Sieht "Phase 1: 50% done. Nächster Schritt: Counsel-Review anfragen"
- Klickt "Anfragen" → Astra hat Briefing-Notiz schon vorbereitet, Tobias ist als Counsel registriert
- Tobias kriegt Email mit Deep-Link
- Anna geht zur nächsten Aktion: "Insurance-Quote anfragen"
- Astra hat schon Munich-Re-Email-Draft. Anna review't, sendet.
- Tag dauert 15 Minuten.

### Anna Tag 100 (Continuous-Compliance-Modus)

- Login → Mission-Dashboard
- Sieht: "Sat-12 Phase 3: Continuous. HEALTHY. Nichts zu tun heute."
- Sieht "Andere Aufmerksamkeit (1): NIS2-Update von gestern"
- Klick → Astra-Plan: "3 Items betroffen, 1 sofort, 2 mit Übergang. Alle 3 hat Astra Drafts vorbereitet."
- Anna review't 3 Drafts in 8 Minuten, approve't alle
- Tag fertig. **8 Minuten total.**

### Anna Tag 365 (Annual Re-Attestation Window)

- Login → Mission-Dashboard
- Sieht großen Banner: "ANNUAL RE-ATTESTATION OFFEN — 89 Items zu confirmieren. Astra hat alle pre-summarized."
- Klickt → Re-Attestation-Surface mit 89 Cards
- Astra-Confidence pro Card: 76 mit >90% confidence
- Mass-Approve-Filter: "Confirm all >90% confidence (76 items)" → ein Klick
- 13 Cards übrig zum manuellen Review
- Klickt sich durch in 25 Minuten
- Re-Attestation komplett. **30 Minuten total.**

---

## 9. Was Caelex dadurch wird

### Heute: Compliance-Software die Operatoren benutzen müssen

### Caelex Comply Guided: Compliance-Autopilot der Operatoren benutzt

Der Unterschied ist nicht UX-Polish. Der Unterschied ist **Wertbeziehung**:

- Heute: "Wir geben dir Tools, du machst die Arbeit."
- Guided: "Wir machen die Arbeit, du gibst uns die Entscheidungen."

Operator's Tag wird von **2-4 Stunden Compliance-Arbeit** auf **15-30 Minuten Decision-Approval** reduziert. Compliance-Lead-Stelle wird optional — auch ein Solo-Founder kann compliance-fest sein.

### Sales-Story wird "Time saved per week"

- "Bei Caelex Guided sparst du 8-15 Stunden pro Woche als Compliance-Lead"
- "Statt einen 80k€ Compliance-Lead einstellen — Caelex automatisiert das Routine-80%"
- "Aus 6 Monaten Authorization-Submission werden 6 Monaten **Wartezeit** (BAFA-Review) plus 6 Stunden tatsächliche Operator-Arbeit"

---

## 10. Was sich vs. der vorherigen Vision konkret ändert

| Aspekt                  | Vorherige Vision (Power-User)          | Guided Compliance (Korrigiert)                   |
| ----------------------- | -------------------------------------- | ------------------------------------------------ |
| **Default-Landing**     | /posture (KPI-Dashboard)               | /missions/[id] (Mission-Roadmap)                 |
| **Hauptscreen-Element** | KPI-Tiles + Sparklines                 | "Nächste Aktion"-Card                            |
| **Cmd-K**               | Universal-Verb-Engine, primär          | Power-User-Feature, sekundär                     |
| **Today-Inbox**         | Hauptarbeitsfläche                     | "Tasks" Sub-Surface                              |
| **AstraProposal-Queue** | Separate `/proposals`-Page             | Inline auf jeder Card als "1-Klick Approve"      |
| **Onboarding**          | Quick-Setup → "viel Spaß"              | Strukturierter Wizard → Personal Roadmap         |
| **Compliance-Sicht**    | "47 Items, sortiere selbst"            | "Phase 1, Schritt 6 von 12, hier ist das Next"   |
| **Astra-Rolle**         | Tool das User aktiv nutzt              | Autopilot der vorbereitet, User approve't        |
| **UX-Modus**            | Eine Komplexitäts-Stufe für alle       | Newcomer/Standard/Power-User adaptiv             |
| **Sales-Pitch**         | "AI-Act-konforme Compliance-Plattform" | "8-15 Stunden Compliance-Zeit pro Woche gespart" |

---

## 11. Was bleibt aus der vorherigen Vision

Alles unter der Haube. Die **Architektur** ist identisch:

- ComplianceItem als Atom
- Obligation/Topic Compliance-Graph
- COWF Workflow-Foundation
- AstraProposal Trust-Layer
- Verity Witness-Network
- Bi-Temporal Models
- W3C VC + EUDIW

**Was sich ändert ist die UX-Schicht — nicht die Architektur.** Der Trust-Layer, die Hash-Chain, die Bi-Temporalität sind weiterhin da. Aber sie sind **strukturelle Eigenschaften** statt UI-Elemente. Operator sieht "Sign now via D-Trust" — sie sieht nicht "QES-Required Step in Workflow Engine".

Das ist der entscheidende Punkt: **die Komplexität bleibt im Code, die Klarheit ist in der UX.**

---

## 12. Drei konkrete Sofort-Änderungen (vom heutigen V2)

Wenn ich heute anfangen würde, das Guided-Pattern in V2 umzusetzen, wären die ersten drei Änderungen:

### Änderung 1: Operator-Profil-Onboarding (4-6 Wochen Eng-Arbeit)

- Neuer `/onboarding`-Wizard nach Sign-Up
- Strukturierte 30-Min-Befragung
- `OperatorProfile`-Prisma-Model
- Engines lesen Profil und berechnen Applicable-Set

### Änderung 2: Mission-First Dashboard (3-4 Wochen Eng-Arbeit)

- Default-Landing nach Login = `/missions` statt `/posture`
- Mission-Detail-Page mit Phase-Roadmap-View
- "Nächste Aktion"-Card als primäres Element
- Posture wird zum Sub-Tab der Mission

### Änderung 3: AstraProposal als Inline-Card statt Queue (2-3 Wochen Eng-Arbeit)

- Jede Action-Card hat embedded "Astra has prepared this for you" mit 1-Klick-Approve
- Separate `/proposals`-Page bleibt für Power-User
- Aber 90% der Approvals passieren inline auf der Mission-Roadmap

**Diese drei Änderungen zusammen** transformieren Caelex von Linear-Inbox-Tool zu Drata-Auto-Pilot. Geschätzter Aufwand: **9-13 Wochen** für Senior-Engineer. Geschätzter Effekt auf Operator-Time-Per-Week: **75-90% Reduktion**.

---

## Schluss

Du hast Recht — Cmd-K + Today + Triage ist ein Power-User-Pattern. Der Mainstream-Operator braucht etwas anderes:

**Caelex Comply ist nicht ein Tool. Caelex Comply ist ein Compliance-Autopilot.**

Operator-Profil → Applicable-Set → Personal Roadmap → Maximum-Automation → Hand-Holding-UX. Diese Kette ist kausal — und sie ist kategorisch anders als das was ich vorher beschrieben hatte.

Die Architektur (ComplianceItem, Workflow-Foundation, Hash-Chain, Bi-Temporal) bleibt **vollständig erhalten** — sie wird die unsichtbare Foundation. Die UX wird **radikal vereinfacht** — eine Mission-First-Roadmap mit klarer "Nächste Aktion" überall.

Das ist die richtige Vision. Ich hatte vorher nur den Bauplan beschrieben, nicht das Wohnzimmer.

— Vision-Korrektur, im Auftrag des Founders.
