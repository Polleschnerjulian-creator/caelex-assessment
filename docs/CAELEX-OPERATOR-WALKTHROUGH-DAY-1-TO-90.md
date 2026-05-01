# Caelex — Operator-Walkthrough Tag 1 bis Tag 90

**Stand:** 2026-05-01
**Scope:** Konkrete Erzählung wie ein neuer Operator Caelex erstmals nutzt — vom ersten Klick auf caelex.eu bis zum routinierten Compliance-Alltag nach 90 Tagen. Realistisch, mit Friktionen.
**Trigger:** Founder-Frage: "Wenn ein Operator neu auf die Plattform kommt, wie sieht so der Arbeitstag aus? Was muss er machen? Gib mir ein Beispiel wie alles genau funktioniert."
**Hauptperson:** Anna Schmidt, CTO + Compliance-Lead bei Acme Space GmbH, Berlin, 14 Mitarbeiter.

> **Eine Zeile.** Tag 0: 32 Sekunden bis das System Anna kennt, 14 Minuten bis ihre erste personalisierte Compliance-Roadmap fertig ist. Tag 90: 8 Minuten Compliance-Arbeit pro Tag — alles andere läuft im Hintergrund.

---

## Setup: Wer ist Anna?

**Acme Space GmbH** ist ein fiktiver — aber typischer — Caelex-Customer:

- 14 Mitarbeiter, Sitz Berlin
- Geführt von Anna (CTO + Compliance-Lead, weil 14 Personen) und Markus (CEO + Mission-Director)
- Operates: Sat-Acme-1 (LEO 2023, 42kg EO), Sat-Acme-2 (LEO 2024, 51kg EO)
- Plant: Sat-Acme-3 für Launch Q3 2026 (47kg LEO EO + zusätzlich erste Service-Bereitstellung in Frankreich)
- Investor-Backing: Series-A von €8M (öffentlich auf Crunchbase)
- BAFA-Authorization: bestehend für Sat-Acme-1 (Sat-Acme-2 läuft auf gleicher Lizenz)
- Insurance: Munich Re-Police, läuft 2026-08-15 ab
- Counsel: noch keinen Compliance-Anwalt eingesetzt (sind bisher mit BAFA selbst durchgekommen)

Anna's Realität:

- Sie hat **keine** dedizierten Compliance-Lead — macht es nebenbei selbst
- **NIS2** wurde ihr von einer befreundeten Firma erwähnt — sie weiß es betrifft sie aber hat noch nichts gemacht
- **EU Space Act** kennt sie ungefähr, hat sich noch nicht reingelesen
- Sat-Acme-3 ist ihre erste Mission mit **französischer Ground-Operation** — sie weiß CNES-Authorization wird nötig, hat aber keine Ahnung wie
- Sie hat **20-30 Minuten/Woche** Zeit für Compliance-Arbeit (nicht mehr)
- Hat ein **mittelmäßiges Vertrauen** in SaaS-Tools — die Daten sind sensibel

---

## TAG 0 — Erster Login

### 09:14:00 — Anna entdeckt Caelex

Anna hat im Newsletter "Space News Europe" einen Artikel gelesen über NIS2-Pflichten für Space-Operatoren. Stress. Sie googelt "EU Space Act Compliance Tool" und findet caelex.eu.

**Landing-Page:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         CAELEX                                                  │
│         ─────────                                               │
│                                                                 │
│         Compliance-Infrastruktur für europäische Raumfahrt      │
│                                                                 │
│         Eine Plattform für Operatoren, Counsel,                 │
│         Authorities und Investoren — kryptographisch            │
│         verifizierbar, AI-Act-konform, sovereign EU.            │
│                                                                 │
│         ━━━━━━━━━━━━━━━━━━━                                    │
│                                                                 │
│         [Try Caelex with your domain →]                         │
│                                                                 │
│         No login needed. We pull only public data first.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Anna klickt **"Try Caelex"**. Kein Sign-Up nötig — interessant.

### 09:14:30 — Domain eingeben

```
┌────────────────────────────────────────────────────────────┐
│   Welche Firma?                                            │
│                                                            │
│   Domain:  [acme-space.de_______]                          │
│                                                            │
│   Wir ziehen jetzt nur öffentliche Daten:                  │
│   • Handelsregister · UNOOSA · BAFA-Public                 │
│   • CelesTrak TLE-Catalog                                  │
│   • Crunchbase / LinkedIn (Mitarbeiter-Schätzung)          │
│                                                            │
│   Keine Daten von dir. Kein Account. Du siehst sofort      │
│   was uns über deine Firma bekannt ist.                    │
│                                                            │
│   [Continue →]                                             │
└────────────────────────────────────────────────────────────┘
```

Anna tippt `acme-space.de`, klickt Continue.

### 09:14:35 — Source-Verification-Stream startet

Das ist der **High-Tech-Moment**:

```
┌─ AUTO-DETECTING ACME-SPACE.DE ─ Live ─────────────────────────┐
│                                                                │
│  09:14:35  Querying Handelsregister Berlin...           [✓]   │
│            → "Acme Space GmbH" HRB 234567                     │
│            → Geschäftszweck: "Betrieb von                     │
│               Erdbeobachtungssatelliten und Datenservices"    │
│            → Geschäftsführer: Markus Hoffmann                 │
│                                                                │
│  09:14:38  Querying UNOOSA Online Index of Objects...   [✓]   │
│            → 2 satellites found:                              │
│              - Sat-Acme-1 (NORAD 53412, LEO, 2023, 42kg)     │
│              - Sat-Acme-2 (NORAD 56891, LEO, 2024, 51kg)     │
│                                                                │
│  09:14:41  Querying BAFA Public License-Register...     [✓]   │
│            → 1 active authorization                           │
│              "AcSp-2023-047" für Sat-Acme-1                  │
│                                                                │
│  09:14:44  Querying CelesTrak TLE Catalog...            [✓]   │
│            → Both satellites tracking, both LEO orbits        │
│            → Sat-Acme-1: SSO ~530km, Sat-Acme-2: SSO ~520km  │
│                                                                │
│  09:14:48  Querying Crunchbase API...                   [✓]   │
│            → Series-A Funding 2024 ($8M)                      │
│            → Estimated employees: 14 (LinkedIn Cross-ref)     │
│                                                                │
│  09:14:52  Cross-referencing data...                    [✓]   │
│            → All 5 sources consistent                          │
│            → No conflicts detected                            │
│                                                                │
│  09:14:55  Computing applicable compliance frameworks...      │
│            ┌─ Loading EU Space Act engine        [✓]          │
│            ├─ Loading NIS2 engine                [✓]          │
│            ├─ Loading National DE Space Law       [✓]         │
│            ├─ Loading COPUOS engine               [✓]         │
│            └─ ... 20 more engines                             │
│                                                                │
│  09:15:07  Building hypothesis compliance map...        [✓]   │
│            → 47 articles applicable                           │
│            → 5 active workflows                               │
│            → 3 immediate attention items                      │
│                                                                │
│  09:15:11  Done · 36 seconds total · Confidence: 87%          │
│                                                                │
│            [Show me what this means →]                         │
└────────────────────────────────────────────────────────────────┘
```

Anna's Reaktion: "Wow, die haben das alles in 36 Sekunden gefunden? Und es ist alles korrekt?"

Sie klickt **"Show me what this means"**.

### 09:15:11 — Die Hypothesen-Map

```
┌────────────────────────────────────────────────────────────────┐
│   AUFGRUND ÖFFENTLICHER DATEN GLAUBEN WIR:                    │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ⚙️  ACME SPACE GmbH                                          │
│       LEO Earth-Observation Operator                           │
│       Berlin (DE) · ~14 employees · Series-A                  │
│                                                                │
│   📋 BETROFFENE COMPLIANCE-REGIMES                             │
│                                                                │
│   ━━━ EU SPACE ACT ━━━                                        │
│   47 von 119 Articles anwendbar                               │
│   ┌─ Status: Sat-Acme-1 hat BAFA-License ✓                   │
│   ├─ Status: Sat-Acme-2 — keine separate Lizenz im Register? │
│   │  ⚠ Bitte prüfen ob Sat-2 auf Sat-1 Lizenz läuft          │
│   └─ Status: Sat-Acme-3 — keine Lizenz (geplant?)            │
│                                                                │
│   ━━━ NIS2 DIRECTIVE ━━━                                      │
│   Klassifikation: ESSENTIAL ENTITY                            │
│   Begründung: Space-Sektor + ≥10 employees                    │
│   ⚠ NIS2-Registrierung bei BSI war Pflicht 06.03.2026         │
│   → Hast du dich registriert?                                 │
│                                                                │
│   ━━━ COPUOS / IADC ━━━                                       │
│   3 Long-Term-Sustainability-Guidelines anwendbar             │
│   ━━━ ITU SPECTRUM ━━━                                        │
│   Frequency-Coordination wahrscheinlich nötig                 │
│   ━━━ NATIONAL SPACE LAW DE ━━━                               │
│   Weltraumgesetz § 4 Genehmigungspflicht                      │
│                                                                │
│   📅 AKTIVE WORKFLOWS DIE WIR VERMUTEN                         │
│                                                                │
│   1. Annual Re-Cert für Sat-Acme-1 (Lizenz läuft 2028)        │
│   2. Insurance-Renewal (Munich Re? Police 2026-08-15 ablauf)  │
│   3. NIS2-Continuous-Compliance (laufend)                     │
│   4. EOL-Plan für Sat-Acme-1 in ~2030                         │
│   5. Annual Re-Attestation Window in ~8 Monaten               │
│                                                                │
│   ⚠️  3 ITEMS DIE WAHRSCHEINLICH DRINGEND SIND                 │
│                                                                │
│   1. NIS2-BSI-Registrierung (Frist 06.03.2026 verpasst)       │
│   2. Insurance-Renewal — Police läuft in 14 Wochen ab         │
│   3. Sat-Acme-2 Lizenz-Status klären                          │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   Confidence: 87% (5-Quellen-Cross-Verified)                  │
│   Provenance pro Item sichtbar [Show details ▼]               │
│                                                                │
│   ──────────────────────────────────────                      │
│                                                                │
│   Stimmt das so?                                              │
│                                                                │
│   [✓ Bestätigen + Account anlegen]                            │
│   [✗ Korrigieren]                                             │
│   [📧 Schick mir das als PDF]                                  │
└────────────────────────────────────────────────────────────────┘
```

Anna lehnt sich zurück. **"Das ist genau das was ich brauche."** Sie sieht 3 Items die sie nicht wusste:

1. NIS2-BSI-Registrierung — Frist verpasst (das wusste sie wirklich nicht)
2. Insurance-Renewal in 14 Wochen — Munich Re hatte sie auf der ToDo-Liste, aber Caelex sagt es ist Article-14-Pflicht
3. Sat-Acme-2 Lizenz-Status — sie war sich nicht sicher ob das auf Sat-1 Lizenz läuft

Sie klickt **"Korrigieren"** weil sie etwas hinzufügen will.

### 09:18:30 — Anna ergänzt

```
┌────────────────────────────────────────────────────────────────┐
│   KORREKTUR + ERGÄNZUNG                                        │
│                                                                │
│   ✓ EU Space Act + 47 Articles                stimmt          │
│   ✓ NIS2 Essential Entity                     stimmt          │
│   ✓ COPUOS-Guidelines                         stimmt          │
│                                                                │
│   ⚠ Sat-Acme-2 Status                                         │
│     Caelex vermutet: keine separate Lizenz                    │
│     [Anna's Antwort:] Sat-2 läuft auf Sat-1 Constellation-    │
│     Authorization (BAFA-erweitert 2024)                       │
│     ✓ Korrektur akzeptiert. Wir suchen die erweiterte Lizenz. │
│                                                                │
│   ➕ ZUSÄTZLICHE INFO                                          │
│     [Anna fügt hinzu:] Wir planen Sat-Acme-3 für Q3 2026      │
│     mit zusätzlicher Bodenstation in Frankreich.              │
│                                                                │
│     ✓ Caelex updates Profil:                                  │
│       - Mission "Sat-Acme-3" mit Status "PLANNED"             │
│       - Operating-Jurisdictions: DE + FR                      │
│       - Neue applicable Workflow: French-Authorization        │
│                                                                │
│     Wir checken jetzt nochmal CNES-Public-Register...         │
│     [✓] Keine Acme-Authorization in CNES gefunden — confirmt  │
│         dass Sat-Acme-3 Authorization noch nicht gestartet.   │
│                                                                │
│   [✓ Continue]                                                │
└────────────────────────────────────────────────────────────────┘
```

### 09:21:00 — Account-Erstellung

```
┌────────────────────────────────────────────────────────────────┐
│   ALLES KORREKT — JETZT WIRD'S DEIN ACCOUNT                    │
│                                                                │
│   Email:        [anna.schmidt@acme-space.de]                  │
│   Name:         [Anna Schmidt]                                │
│   Rolle:        [CTO ▼]                                       │
│                                                                │
│   Magic-Link wird gesendet (kein Passwort nötig).             │
│                                                                │
│   ━━━ DEINE BESTEHENDEN DATEN ━━━                             │
│                                                                │
│   Caelex hat bereits ohne dein Zutun gesammelt:               │
│   ✓ Operator-Type, Größe, HQ, Investor-Backing (T2)            │
│   ✓ 2 Satelliten + Mission-Type (T2)                           │
│   ✓ Bestehende BAFA-Authorization (T2)                         │
│   ✓ Bestehende Insurance-Police (T1, von dir bestätigt)        │
│   ✓ Sat-Acme-3 Plan (T1, von dir bestätigt)                    │
│                                                                │
│   Coverage: 35% des vollständigen Profils.                    │
│                                                                │
│   Die nächsten 65% bauen wir gemeinsam, aber nur dann wenn    │
│   ein Workflow sie braucht. Du gibst nicht 47 Felder           │
│   im Voraus ein.                                              │
│                                                                │
│   [✓ Account erstellen + Magic-Link senden]                    │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt. Magic-Link kommt in 5 Sekunden, sie klickt drauf, ist eingeloggt.

### 09:23:00 — Erste Landing nach Login

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   WILLKOMMEN BEI CAELEX, ANNA                                  │
│                                                                │
│   Lass mich zeigen was wir entdeckt haben.                    │
│                                                                │
│   [3D Operator-Universe rendert sich...]                      │
│                                                                │
│            ⚙ Acme Space (you)                                 │
│           ╱     │     ╲                                       │
│          ╱      │      ╲                                      │
│   Sat-Acme-1   Sat-2   Sat-Acme-3                             │
│   (LIVE)       (LIVE)   (PLANNED · T-145d)                    │
│                                                                │
│      Outer ring shows applicable regulations                  │
│      pulsing softly.                                          │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   Zwei Dinge dringen heute:                                    │
│                                                                │
│   1. ⚠ NIS2-BSI-Registrierung verpasst (Frist 06.03.2026)     │
│      → Astra hat einen "Späte-Registrierung-mit-Begründung"-  │
│        Plan vorbereitet. Will dich dabei begleiten.           │
│      [Open this →]                                            │
│                                                                │
│   2. ⚠ Insurance-Renewal Munich Re in 14 Wochen               │
│      → Astra hat einen Renewal-Email-Draft an dein Munich-Re-│
│        Account-Team vorbereitet.                              │
│      [Show me the draft →]                                    │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   Das volle Bild deiner Mission:                              │
│                                                                │
│   [Show personalized roadmap →]                               │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt **"Show personalized roadmap"** — sie will erst das volle Bild bevor sie spezifische Items angeht.

### 09:24:00 — Personalized Compliance Roadmap

Hier zeigt Caelex was COE (Compliance Orchestration Engine) computed hat:

```
┌────────────────────────────────────────────────────────────────┐
│   DEINE PERSÖNLICHE COMPLIANCE-ROADMAP                         │
│                                                                │
│   AKTIVE MISSIONEN: 3 · OPERATING-JURISDICTIONS: DE + FR       │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   🛰 SAT-ACME-1 (LIVE seit 2023, 42kg LEO EO)                  │
│   ┌─ Status: ATTESTED ✓                                        │
│   ├─ Phase: Continuous Compliance                              │
│   ├─ Annual Re-Cert: in 8 Monaten                              │
│   ├─ EOL planned: 2030 (4 Jahre)                              │
│   └─ Background: Sentinel-Telemetry läuft, Daily-Snapshot OK  │
│                                                                │
│   🛰 SAT-ACME-2 (LIVE seit 2024, 51kg LEO EO)                  │
│   ┌─ Status: PENDING (Lizenz-Erweiterung wird verifiziert)    │
│   ├─ Phase: Continuous Compliance                              │
│   ├─ Action benötigt: BAFA-Constellation-Auth-Bestätigung     │
│   │  → Caelex schickt automatische Anfrage an BAFA            │
│   └─ Annual Re-Cert: in 11 Monaten                            │
│                                                                │
│   🚀 SAT-ACME-3 (PLANNED · Launch geplant 2026-09-23 · 145d)   │
│   ┌─ Phase 1: AUTHORIZATION (T-180 bis T-90) — 0% started     │
│   ├─ Phase 1B: FRENCH-AUTHORIZATION (parallel) — 0% started   │
│   ├─ Phase 2: INSURANCE-RENEWAL (T-180 bis T-60) — 0% started │
│   ├─ Phase 3: PRE-LAUNCH-CHECK (T-90 bis T-7)                 │
│   ├─ Phase 4: LAUNCH-DAY                                       │
│   ├─ Phase 5: CONTINUOUS-COMPLIANCE                            │
│   └─ Phase 6: END-OF-LIFE                                      │
│                                                                │
│   ⚙ CONTINUOUS COMPLIANCE (alle Missionen)                     │
│   ┌─ NIS2-Watch                                                │
│   ├─ Atlas-Regulatory-Feed                                     │
│   ├─ Sentinel-Cross-Verify                                     │
│   └─ Posture-Snapshot daily                                    │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   IM HINTERGRUND LÄUFT BEREITS:                                │
│   ├─ CelesTrak-Polling für Sat-1 + Sat-2                      │
│   ├─ Atlas-Regulatory-Feed (NIS2, EU Space Act, COPUOS)       │
│   ├─ BAFA-Constellation-Auth-Verification (Sat-Acme-2)         │
│   └─ NIS2-BSI-Late-Registration-Plan-Draft (von Astra)         │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ⚡ DEINE NÄCHSTE AKTION (5-10 Minuten)                       │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │ NIS2-BSI-Registrierung mit Verspätungsbegründung      │    │
│   │ Frist 06.03.2026 verpasst — aber lösbar mit Delay-    │    │
│   │ Notification an BSI.                                  │    │
│   │                                                       │    │
│   │ Astra hat den Antrag schon vorbereitet (Citation:    │    │
│   │ NIS2-DE Art. 28 Abs. 5 erlaubt nachträgliche          │    │
│   │ Registrierung mit Begründung).                        │    │
│   │                                                       │    │
│   │ Du musst nur:                                         │    │
│   │ 1. Den Draft lesen (3 Min)                            │    │
│   │ 2. Bestätigen ob die Begründung passt (1 Min)         │    │
│   │ 3. QES-signieren (1 Min via D-Trust Cloud)            │    │
│   │ 4. Caelex schickt automatisch ans BSI                 │    │
│   │                                                       │    │
│   │ [Open Draft →]                                        │    │
│   └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

Anna ist beeindruckt. **"Wenn ich nur diese 5 Minuten investiere, ist mein NIS2-Problem gelöst?"** Sie klickt **"Open Draft"**.

### 09:25:00 — Astra's NIS2-Late-Registration-Draft

```
┌────────────────────────────────────────────────────────────────┐
│   ASTRA · DRAFTING NIS2 LATE REGISTRATION                      │
│                                                                │
│   ⚡ Tool-Calls (background, 8 Sekunden)                       │
│   ✓ get_operator_profile()                                     │
│   ✓ get_nis2_classification(operator)                          │
│     → ESSENTIAL_ENTITY                                         │
│   ✓ get_article(NIS2_DE, "Art. 28 Abs. 5")                    │
│   ✓ get_template("nis2_late_registration_de")                  │
│   ✓ get_existing_security_measures(operator)                   │
│     → none yet detected (clean slate)                          │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   GENERATED DRAFT (auf Deutsch, an BSI):                       │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   An: Bundesamt für Sicherheit in der Informationstechnik     │
│   Anhang: Registrierung als Essential Entity gemäß NIS2UmsuCG │
│                                                                │
│   Sehr geehrte Damen und Herren,                              │
│                                                                │
│   die Acme Space GmbH, Berlin, registriert sich hiermit       │
│   verspätet als wesentliche Einrichtung gemäß § 28 Abs. 5     │
│   NIS2UmsuCG. Die ursprüngliche Frist (06.03.2026) wurde      │
│   nicht eingehalten, was wir bedauern und im Folgenden        │
│   begründen:                                                  │
│                                                                │
│   Begründung der Verspätung [von Astra vorgeschlagen]:        │
│   "Die Acme Space GmbH ist ein 14-Personen-Unternehmen        │
│    ohne dedizierten Compliance-Lead. Die Anwendbarkeit von    │
│    NIS2 als Essential Entity wurde erst durch das Onboarding  │
│    bei Caelex (am 2026-05-01) systematisch erkannt. Die       │
│    Registrierung erfolgt unverzüglich danach."                │
│                                                                │
│   Bitte korrigieren oder ergänzen falls notwendig.            │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   Anhang: Sicherheitsmaßnahmen-Plan (Art. 21 NIS2)            │
│   ⚠ Astra-Hinweis: Du hast noch keine NIS2-Sicherheits-       │
│     maßnahmen dokumentiert. Wir empfehlen den 90-Tage-        │
│     Plan als Begleitschreiben:                                │
│                                                                │
│     "Wir verpflichten uns innerhalb von 90 Tagen einen        │
│      vollständigen Sicherheitsmaßnahmen-Plan nach Art. 21    │
│      NIS2 zu erstellen. Caelex begleitet uns bei dieser      │
│      Erstellung. Wir liefern den Plan bis 2026-08-01 nach."  │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   ✓ 5 Citations validated against NIS2-DE-Catalog              │
│   ✓ Cross-Check vs GPT-4o-mini: agreement 0.96                 │
│   ✓ Counsel-Review NICHT erforderlich (Anna kann selbst       │
│     signieren — late registration ist Standard-Pflicht)       │
│                                                                │
│   ──────────────────────────────────────                      │
│                                                                │
│   [✓ Reasoning gelesen]  [✓ Begründung passt]                 │
│   [Begründung anpassen → ___________]                         │
│                                                                │
│   [Sign + Submit via QES →]                                   │
└────────────────────────────────────────────────────────────────┘
```

Anna liest das, denkt "ja, das stimmt — wir haben echt keinen Compliance-Lead". Tickt beide Boxen, klickt **"Sign + Submit via QES"**.

D-Trust Cloud-Signature-Flow läuft (sie hat noch keinen QES-Account, kriegt einen 2-Min-Setup für €19/Jahr — Caelex pre-fills alles, sie muss nur Personalausweis hochladen + 2-Faktor-Auth).

### 09:32:00 — Submitted

```
┌────────────────────────────────────────────────────────────────┐
│   ✓ NIS2-LATE-REGISTRATION SUBMITTED                           │
│                                                                │
│   Ticket: BSI-NIS2-Reg-2026-09-NEW-Reg                        │
│   Submitted: 2026-05-01 09:32:14 UTC                          │
│   QES-Signature: D-Trust ID 2a8f4c... [verify]                │
│                                                                │
│   Hash-Chain-Anchor: 0x8a3f4e7b9c1d... [verify]               │
│                                                                │
│   BSI-Bearbeitung typisch: 4-8 Wochen                         │
│   Wir polln BSI-Status weekly + benachrichtigen dich.         │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ALS NÄCHSTES (in deiner Roadmap):                           │
│                                                                │
│   1. Insurance-Renewal-Email an Munich Re                     │
│      Astra hat Draft fertig. ~3 Min Aufwand.                  │
│      [Open →]                                                 │
│                                                                │
│   2. NIS2-Sicherheitsmaßnahmen-Plan starten (90-Tage-Frist)    │
│      Workflow umfasst 8 Schritte über 8-10 Wochen.            │
│      [Plan ansehen →]                                         │
│                                                                │
│   3. Sat-Acme-3 Authorization-Workflow starten                 │
│      Komplexester Workflow (12-18 Steps, 6 Monate).           │
│      [Workflow starten →]                                     │
│                                                                │
│   Du kannst aber auch jetzt erstmal nichts mehr machen —      │
│   wir benachrichtigen dich wenn etwas dringend wird.          │
│                                                                │
│   [Done for today]                                            │
└────────────────────────────────────────────────────────────────┘
```

Anna's Tag-0-Bilanz nach **18 Minuten Caelex-Nutzung:**

✓ Account erstellt + Profil zu 35% gefüllt (Auto-Detection)
✓ NIS2-BSI-Late-Registration submitted (problem gelöst was sie gar nicht aktiv kannte)
✓ Klare Roadmap für Sat-Acme-3 (sie weiß jetzt was sie tun muss)
✓ Hash-Chain-Anchor für die Submission (audit-fest)

Sie macht den Browser zu, fühlt sich produktiv. **Caelex hat ein NIS2-Problem in 18 Minuten gelöst, das normalerweise 4-6 Stunden Recherche-und-Schreiben gewesen wäre.**

---

## TAG 1 — Zweiter Login

### 14:30:00 — Anna kommt nach 24h zurück

Sie loggt sich ein. Landing-Page zeigt:

```
┌────────────────────────────────────────────────────────────────┐
│   WILLKOMMEN ZURÜCK, ANNA                                      │
│                                                                │
│   Seit gestern ist passiert:                                   │
│                                                                │
│   ✓ Astra hat dein Sat-Acme-3-Authorization-Profil gecheckt:  │
│     - 47 EU-Space-Act Articles applicable                     │
│     - Counsel-Review-Pflicht: JA (>10 employees + DE-Sitz)    │
│     - QES-Sign-Off-Pflicht: Mission-Director (Markus)         │
│                                                                │
│   ✓ Sentinel hat Sat-Acme-1 + Sat-Acme-2 telemetrie-getrackt: │
│     Beide nominal. Keine Anomalien.                           │
│                                                                │
│   ✓ Atlas hat einen NIS2-Update-Hinweis publiziert:           │
│     "BSI Empfehlungen 2026 v2.1 — keine kritischen Änderungen │
│     für deine Posture, aber Empfehlung Pen-Test im Q3."       │
│                                                                │
│   ⏳ BSI-Status zur NIS2-Registrierung: noch keine Antwort    │
│      Wir polln weiter.                                        │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ⚡ NÄCHSTER SCHRITT (5 Min):                                 │
│                                                                │
│   Sat-Acme-3 Authorization beginnt mit Spacecraft-Metadata.   │
│   Caelex weiß noch nicht: Mass, Orbital-Parameters, Payload-  │
│   Specs, Launch-Provider.                                     │
│                                                                │
│   Wir fragen nur was Phase-1 wirklich braucht.                │
│                                                                │
│   [→ Sat-Acme-3 Spacecraft-Metadata füllen]                   │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt — sie hat 10 Min vor dem nächsten Meeting.

### 14:31 — Spacecraft-Metadata-Form

```
┌────────────────────────────────────────────────────────────────┐
│   SAT-ACME-3 · METADATA                                        │
│                                                                │
│   Phase 1 Step 1 von 12 · Geschätzt 5 Minuten                 │
│                                                                │
│   ─── Why we need this ────────────────────────────────       │
│   Aufgrund dieser Daten berechnen wir:                        │
│   • Welche Articles in EU Space Act anwendbar sind            │
│   • Welche Insurance-Mindestdeckung (Article 14)              │
│   • Welche COPUOS-Guidelines (Mass-spezifisch)                │
│   • Welcher BAFA-Antragstyp (Single-Sat vs Constellation)     │
│   ────────────────────────────────────────────                │
│                                                                │
│   Mass [kg]:               [47]                               │
│   ├─ Berechnet automatisch: <100kg → Article 14 60M€ Min-Cov  │
│                                                                │
│   Orbital-Parameter:                                          │
│   - Type:                  [LEO ▼]                            │
│   - Altitude [km]:         [550]                              │
│   - Inclination [°]:       [97.6]   (Sun-Sync für EO)        │
│   - Eccentricity:          [0.001]                            │
│                                                                │
│   Payload:                                                    │
│   - Type:                  [Optical EO ▼]                     │
│   - Resolution:            [<5m? ▼]                           │
│   - Encryption:            [✓] Yes (AES-256)                  │
│                                                                │
│   Launch:                                                     │
│   - Provider:              [SpaceX Transporter ▼]             │
│   - Planned date:          [2026-09-23]                       │
│   - Launch site:           [Vandenberg AFB]                   │
│                                                                │
│   Decommissioning:                                            │
│   - Planned EOL:           [2031]  (5 years operational)      │
│   - Method:                [Passive deorbit ▼]                │
│   - Compliance:            COPUOS 25-year-rule? ✓ (deorbit    │
│                            from 550km estimated 4-6 years)    │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   [Save & Continue →]                                         │
│                                                                │
│   Audit-Note: Diese Daten werden AES-256-GCM-encrypted        │
│   gespeichert mit per-Org-Key. Niemals an Wettbewerber.       │
└────────────────────────────────────────────────────────────────┘
```

Anna füllt aus (sie hat die Daten in einem internen Doc, kopiert es rüber). 4 Minuten.

Sie klickt **"Save & Continue"**.

### 14:35 — Astra startet die Compliance-Berechnung

```
┌────────────────────────────────────────────────────────────────┐
│   ASTRA · CALCULATING APPLICABLE COMPLIANCE                    │
│                                                                │
│   Inputs:                                                     │
│   - Operator: Acme Space GmbH (DE, 14 MA, NIS2-Essential)     │
│   - Spacecraft: Sat-Acme-3, 47kg LEO Optical-EO               │
│   - Launch: 2026-09-23 from Vandenberg                        │
│   - Operations: DE + FR                                       │
│                                                                │
│   ⚡ Tool-Calls (8 Sekunden):                                  │
│   ✓ run_engine(eu-space-act, profile, spacecraft)             │
│     → 47 articles applicable                                   │
│   ✓ run_engine(nis2, profile)                                  │
│     → 51 requirements (Essential Entity)                      │
│   ✓ run_engine(national-de-space, profile, spacecraft)         │
│     → BAFA Single-Sat-Authorization-Verfahren                 │
│   ✓ run_engine(national-fr-space, profile, spacecraft)         │
│     → CNES Operator-Authorization (für FR-Operations)         │
│   ✓ run_engine(copuos, spacecraft)                             │
│     → 3 LTS-Guidelines + 25-year-rule                         │
│   ✓ run_engine(itu-spectrum, spacecraft.payload)               │
│     → ITU-Coordination required für X-band downlink           │
│   ✓ run_engine(insurance, spacecraft)                          │
│     → 60M€ minimum (Art. 14, <500kg)                          │
│   ✓ run_engine(export-control, spacecraft, operator)          │
│     → No ITAR (no US-tech), check EU Dual-Use 2021/821        │
│                                                                │
│   ✓ COE.generatePersonalizedDAG(applicableSet, profile)        │
│     → Workflow-DAG built                                       │
│                                                                │
│   ─────────────────────────────────────                       │
│                                                                │
│   YOUR PERSONALIZED WORKFLOW-DAG IS READY                      │
│                                                                │
│   [Show me visually →]                                        │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt — und sieht den **Workflow-DAG-Map**:

### 14:36 — Workflow-DAG visualisiert

```
┌────────────────────────────────────────────────────────────────┐
│   SAT-ACME-3 · PERSONALIZED COMPLIANCE-DAG                     │
│                                                                │
│   [Force-Directed-Graph rendered]                             │
│                                                                │
│              [Phase 6: EOL]                                   │
│                   │                                           │
│              [Phase 5: Continuous]                            │
│                   │                                           │
│              [Phase 4: Launch-Day]                            │
│                   │                                           │
│              [Phase 3: Pre-Launch]                            │
│                   │                                           │
│           ┌───────┴───────┐                                   │
│           │               │                                   │
│   [Phase 1: BAFA-Auth]   [Phase 2: Insurance-Renewal]         │
│           │                                                   │
│   [Phase 1B: CNES-Auth (parallel)]                            │
│           │                                                   │
│   [Spacecraft-Metadata] ← you are here                        │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   PHASE 1: BAFA-AUTHORIZATION (T-180 → T-90)                  │
│   ┌─ Step 1: Spacecraft-Metadata ✓ DONE                       │
│   ├─ Step 2: Mission-Profile-Document — Astra startet jetzt   │
│   ├─ Step 3: Insurance-Coverage-Plan (depends on Phase 2)     │
│   ├─ Step 4: Cyber-Plan ← COUNSEL REQUIRED                    │
│   ├─ Step 5: Debris-Plan + COPUOS-Conformance                 │
│   ├─ Step 6: Counsel-Review                                    │
│   ├─ Step 7: QES-Sign-Off (Markus, Mission-Director)          │
│   ├─ Step 8: BAFA-Submission (auto via Pharos)                 │
│   └─ Step 9: NCA-Status-Polling (60-180 Tage)                 │
│                                                                │
│   PHASE 1B: CNES-AUTHORIZATION (T-150 → T-90, parallel)       │
│   Re-uses Phase 1 Steps 1-5 + French-Translation              │
│                                                                │
│   PHASE 2: INSURANCE-RENEWAL (T-180 → T-60, BEFORE Phase 1)   │
│   ┌─ Step 1: Munich-Re-Email-Draft ← Astra hat fertig         │
│   ├─ Step 2: Negotiation (extern)                             │
│   ├─ Step 3: New Police verifizieren                          │
│   └─ Hard-Deadline: 2026-07-31                                │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ⚠ PERSONALIZATIONS:                                          │
│                                                                │
│   • Cyber-Plan (Step 4) ist Counsel-Required weil >10 MA      │
│     in DE → NIS2-Essential                                    │
│   • Phase 1B (CNES) eingefügt weil Operating-Jurisdictions = │
│     DE+FR                                                      │
│   • Phase 2 vor Phase 1 weil Article 14 Insurance verlangt    │
│   • COPUOS-Decommissioning-Section reuses Sat-Acme-1-         │
│     Template (60% Doppelarbeit gespart)                       │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                                                │
│   ⚡ NÄCHSTER SCHRITT (Astra startet automatisch):             │
│                                                                │
│   Step 2: Mission-Profile-Document Draft                      │
│   Astra zieht alle deine Spacecraft-Metadata + Mission-Plan   │
│   und draftet das Document. ~3 Min Background-Job.            │
│                                                                │
│   Du wirst notifiziert wenn Astra fertig ist.                  │
│                                                                │
│   [✓ Lass laufen, ich melde mich später]                      │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt **"Lass laufen"** und schließt den Browser. Tag-1-Aufwand: 5 Minuten.

### 14:42 — Hinter den Kulissen

Während Anna im nächsten Meeting ist, läuft das hier:

```
TIME      EVENT
────────  ─────────────────────────────────────────────
14:36:42  COE.generatePersonalizedDAG completed
14:36:43  3 OperatorWorkflowInstances created in COWF:
          - W1 (Authorization Sat-3) - state: METADATA_COMPLETE
          - W1B (CNES-Auth Sat-3) - state: WAITING
          - W2 (Insurance-Renewal) - state: DRAFT_READY

14:36:44  AstraStep "draft-mission-profile-document" autofires
          for W1
14:36:44  Astra V2 invocation starts
          model: claude-sonnet-4-6@bedrock-eu
          prompt-hash: 0x7a3f...
          tools: 12 available

14:36:45  Astra calls get_spacecraft_metadata()
14:36:45  Astra calls get_mission_plan()
14:36:46  Astra calls get_article(EU_SPACE_ACT, "Art. 7")
14:36:46  Astra calls get_template("mission-profile-document")
14:36:47  Astra calls cite_source(Art. 7, line 2.1)
14:36:48  Astra calls cite_source(Art. 14, line 1.1)
14:36:48  ... 8 more tool calls ...

14:38:23  Astra completes draft (1m 41s wall-time)
14:38:23  Multi-Model-Cross-Check: GPT-4o-mini called
          on same input
14:38:51  Cross-Check: 0.94 agreement (above threshold 0.9)
14:38:51  Citation-Validator: 7/7 citations verified

14:38:52  AstraProposal created
          id: ap_7c3f4a9b
          itemId: w1_step2
          decisionLog: 11 entries (hash-chained)
          modelContext: model_id, prompt_hash, tools_hash
          expiresAt: 2026-05-08 (7 days)

14:38:52  WorkflowEvent appended (sequence #4)
          eventType: ASTRA_REASONING
          prevHash: 0x9c7b...
          entryHash: 0xa2d8...

14:38:53  Notification created for Anna:
          "Mission-Profile-Document is ready for review"
          (in-app + digest email tomorrow)

14:38:53  Sentinel-Cross-Verify cron polls Sat-Acme-1+2
14:38:54  Sentinel-Cross-Verify: both nominal, hash-chained
14:38:54  CelesTrak-Polling cron updates TLE for Sat-1+2
```

Anna sieht das nichts davon — alles passiert im Hintergrund. Aber **wenn sie morgen die Operations-View öffnet**, kann sie alle 18 Background-Events der letzten 24 Stunden sehen.

---

## TAG 3 — Counsel-Onboarding

### 09:00:00 — Anna sieht das Mission-Profile-Document

Anna loggt sich ein. Mission-Operations-Center zeigt:

```
┌─ SAT-ACME-3 · LIVE STATUS ────────────────────────────────────┐
│                                                                │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                │
│ │COMPLETE│  │READY   │  │WAITING │  │READY   │                │
│ │Metadata│  │Mission │  │Cyber-  │  │Munich- │                │
│ │ ✓      │  │Document│  │Plan    │  │Re-Email│                │
│ │8 fields│  │needs   │  │needs   │  │draft   │                │
│ │T1 ✓    │  │your    │  │counsel │  │waiting │                │
│ │        │  │approve │  │first   │  │approve │                │
│ └────────┘  └────────┘  └────────┘  └────────┘                │
│                                                                │
│ ⚡ ACTION REQUIRED                                             │
│                                                                │
│ Mission-Profile-Document Draft (von Astra fertig)              │
│ → 3 Min Review                                                │
│ [Open →]                                                      │
│                                                                │
│ Cyber-Plan benötigt Counsel-Review BEVOR du startest           │
│ → Du hast keinen Counsel registriert                          │
│ [Counsel einladen →]                                          │
└────────────────────────────────────────────────────────────────┘
```

Anna entscheidet erst Counsel zu einladen — sonst wird der Cyber-Plan zum Bottleneck.

### 09:01 — Counsel-Einladung

```
┌────────────────────────────────────────────────────────────────┐
│   COUNSEL EINLADEN                                             │
│                                                                │
│   Welcher Anwalt soll Caelex-Account bekommen?                │
│                                                                │
│   Email:        [tobias.mueller@kanzlei-mueller-fischer.de]    │
│   Name:         [Dr. Tobias Müller]                           │
│   Kanzlei:      [Müller-Fischer Rechtsanwälte]                │
│   Spezialisierung: [Space Law + IT-Recht ▼]                   │
│                                                                │
│   ─── Was Caelex Tobias zeigt ────────────────                │
│   Tobias bekommt einen Counsel-Account in Caelex Atlas.       │
│   Er sieht NUR die Workflows zu denen du ihn als Counsel      │
│   markierst.                                                  │
│                                                                │
│   Er kann:                                                    │
│   • Documents reviewen + annotieren                           │
│   • Strukturierte Attestations geben (Cyber-Posture-Tier etc) │
│   • Mit QES-Signatur abzeichnen                               │
│                                                                │
│   Er sieht NICHT:                                             │
│   • Andere deiner Workflows (außer du markierst)              │
│   • Daten anderer Caelex-Customers                            │
│                                                                │
│   Mandantenverhältnis ist legal-binding (§ 203 StGB).         │
│                                                                │
│   [✓ Send Invite]                                             │
└────────────────────────────────────────────────────────────────┘
```

Anna klickt. Tobias bekommt Email mit Magic-Link.

### 09:05 — Tobias loggt sich ein

Tobias bekommt einen Atlas-View — andere Color-Akzente, andere Sprache:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   WILLKOMMEN BEI CAELEX ATLAS, DR. MÜLLER                      │
│                                                                │
│   Du wurdest von ANNA SCHMIDT (Acme Space GmbH) eingeladen.    │
│                                                                │
│   Sie hat einen aktiven Workflow:                             │
│                                                                │
│   📋 Sat-Acme-3 Authorization                                  │
│      Phase 1: BAFA-Authorization                               │
│      Step 4: Cyber-Plan (Counsel-Review-Pflicht)              │
│                                                                │
│   Du sollst die Cyber-Posture beurteilen. Anna hat dazu        │
│   noch keine Informationen geliefert — sie braucht dich       │
│   für die Erst-Einschätzung.                                  │
│                                                                │
│   ─── Wie das funktioniert ────────────────                   │
│                                                                │
│   1. Du bekommst Background-Briefing (siehe rechts)           │
│   2. Du sprichst mit Anna (Anwaltsgeheimnis)                  │
│   3. Du gibst eine STRUKTURIERTE Attestation in Caelex       │
│      ein — z.B. "Cyber-Posture: TIER-2"                      │
│   4. Du QES-signierst die Attestation                          │
│   5. Caelex bekommt das DERIVED RESULT — nicht die Roh-Daten │
│                                                                │
│   ──────────────────────────────────────                      │
│                                                                │
│   [→ Background-Briefing lesen]                                │
│   [→ Anna kontaktieren]                                        │
│   [→ Cyber-Posture-Form öffnen]                                │
└────────────────────────────────────────────────────────────────┘
```

Tobias liest den Background. Astra hat ihm eine **Counsel-spezifische Briefing-Notiz** vorbereitet:

```
TOBIAS-BRIEFING — SAT-ACME-3 CYBER-PLAN

Operator-Profil:
- Acme Space GmbH, 14 MA, Berlin
- LEO EO-Mission, 47kg
- Existing Sat-1+2 (BAFA-licensed)

Anwendbare Frameworks:
- NIS2-Essential-Entity → Art. 21 Sicherheitsmaßnahmen
- ENISA-Space-Sector-Guidelines (2024)
- BSI IT-Grundschutz (empfohlen)
- ISO 27001 (nicht zertifiziert, aber Best-Practice)

Was du beurteilen sollst:
- Anna's Cyber-Posture-Tier (TIER-1 bis TIER-3)
- Existing Pen-Test-Status
- IR-Plan-Existence
- Supply-Chain-Cyber-Pflichten

Astra-Empfehlung (basierend auf Public-Data):
- Wahrscheinlich TIER-2 (kein dediziertes CISO,
  aber Series-A → Post-Tech-Diligence-Standards)

Caelex sieht von dir am Ende NUR:
- Tier-Klassifikation (1/2/3)
- Pen-Test-Status (yes/no/in-progress)
- IR-Plan-Status (yes/no)
- Deine QES-Signatur + Datum

NICHT die spezifischen Lücken oder Roh-Daten.
```

Tobias schreibt Anna eine kurze Whatsapp: "Anna, lass uns morgen 30 Min sprechen für Cyber-Posture-Beurteilung."

### Tag 4 — Tobias attestiert

Nach 30-Min-Call (Anna gibt ihm vertrauliche Details über ihre Cyber-Setup, Anwaltsgeheimnis):

```
┌────────────────────────────────────────────────────────────────┐
│   COUNSEL-ATTEST · CYBER-POSTURE                               │
│                                                                │
│   Mandant: Acme Space GmbH                                    │
│   Workflow: Sat-Acme-3 Authorization · Step 4                  │
│   Counsel: Dr. Tobias Müller (Müller-Fischer)                 │
│                                                                │
│   ─── Strukturierte Attestation ──────────────                │
│                                                                │
│   Cyber-Posture-Tier:    [TIER-2 ▼]                           │
│                                                                │
│   Pen-Test Status:        [Done · Q4 2025]                    │
│                                                                │
│   IR-Plan:                [Existing · last updated 2025-Q3]   │
│                                                                │
│   Supply-Chain-Coverage:  [Partial · Munich-Re + AWS only]    │
│                                                                │
│   Identified Gaps (anonymisiert):                              │
│   ☐ "2 minor gaps in Detection-Capabilities — non-blocking"   │
│      (Roh-Details bleiben bei Anna + mir, nicht Caelex)       │
│                                                                │
│   Mitigation-Path:                                            │
│   • 90-day-Plan zu schließen                                  │
│   • Ich begleite Anna dabei                                   │
│                                                                │
│   ─── QES-Signatur ──────────────────────                     │
│                                                                │
│   Ich, Dr. Tobias Müller, attestiere die obigen Angaben       │
│   nach bestem Wissen aus Mandantengespräch vom 2026-05-04.    │
│                                                                │
│   [Sign via QES (D-Trust) →]                                  │
└────────────────────────────────────────────────────────────────┘
```

Tobias signiert. Caelex erhält:

```
✓ Counsel-Attestation persisted:
  - Cyber-Posture-Tier: T3 (Counsel-attested)
  - QES-Signature: 0x4e8a...
  - Hash-Chain-Anchor: WorkflowEvent #5
  - Attested-by: tobias.mueller@kanzlei-mueller-fischer.de
  - Caelex sieht: Tier + Pen-Test + IR-Plan + Supply-Chain
  - Caelex sieht NICHT: spezifische Gaps oder Roh-Daten
```

**Caelex's Cyber-Posture-Wissen ist jetzt T3-validiert** — höchstes Trust-Level. Anna's Roh-Daten sind sicher beim Counsel.

---

## TAG 14 — Authorization-Workflow läuft

### Status nach 2 Wochen

Anna hat verbracht:

- Tag 0: 18 Min (Onboarding + NIS2)
- Tag 1: 5 Min (Spacecraft-Metadata)
- Tag 2: 8 Min (Mission-Profile-Document Review + Approval)
- Tag 3: 4 Min (Counsel-Einladung)
- Tag 4: 30 Min Call mit Tobias + 5 Min Caelex-View danach
- Tag 7: 12 Min (Insurance-Renewal-Email an Munich Re geschickt)
- Tag 10: 8 Min (Munich Re Antwort processed, neues Insurance-Datum eingegeben)
- Tag 12: 6 Min (Sat-Acme-2 BAFA-Constellation-Auth-Verification approved by BAFA)

**Total Caelex-Zeit nach 14 Tagen: ~96 Minuten = 1h 36 Min für 14 Tage = ~7 Min/Tag**

### Was Anna sieht am Tag 14

```
┌─ MISSION OPERATIONS · ACME SPACE · 2026-05-15 ────────────────┐
│                                                                │
│ POSTURE-SCORE: 67% (+32% in 14 Tagen) ↗                       │
│                                                                │
│ ━━━ AKTIVE MISSIONEN ━━━                                      │
│                                                                │
│ 🛰 SAT-ACME-1 (LIVE)                                          │
│   Continuous · ATTESTED · Sentinel OK · daily snapshots       │
│   No action needed.                                           │
│                                                                │
│ 🛰 SAT-ACME-2 (LIVE)                                          │
│   Continuous · ATTESTED · BAFA-Constellation-Auth confirmed   │
│   No action needed.                                           │
│                                                                │
│ 🚀 SAT-ACME-3 (PLANNED · T-131 days)                          │
│   Phase 1: BAFA-Authorization · 5/9 steps complete (56%)      │
│   ✓ Step 1: Spacecraft-Metadata                                │
│   ✓ Step 2: Mission-Profile-Document (Astra+Anna)             │
│   ✓ Step 3: Insurance-Coverage-Plan (depends on Phase 2)      │
│   ✓ Step 4: Cyber-Plan (Counsel-attested by Tobias)           │
│   ⏳ Step 5: Debris-Plan + COPUOS — Astra drafts now          │
│   ⏸ Step 6: Counsel-Review (waiting on Step 5)                │
│   ⏸ Step 7: QES-Sign-Off Markus                               │
│   ⏸ Step 8: BAFA-Submission                                    │
│   ⏸ Step 9: NCA-Status-Polling                                 │
│                                                                │
│   Phase 1B (CNES) Status: WAITING (parallel ab T-150)         │
│   Phase 2 (Insurance) Status: ✓ COMPLETE (Munich Re renewed)  │
│                                                                │
│ ━━━ HINTERGRUND-AKTIVITÄT (24h) ━━━                           │
│                                                                │
│ • CelesTrak-Polling × 8 (Sat-1+2, hourly)                     │
│ • Atlas-Regulatory-Feed × 1 (no relevant updates)             │
│ • Sentinel-Cross-Verify × 6                                    │
│ • Posture-Snapshot × 1                                         │
│ • BSI-Status-Poll × 1 (NIS2-Late-Reg under review)            │
│                                                                │
│ ━━━ ⚡ NÄCHSTE AKTION (heute) ━━━                              │
│                                                                │
│ Step 5: Debris-Plan + COPUOS-Conformance                      │
│ Astra hat Draft fertig. Citation-First. 3-Source-Verified.    │
│                                                                │
│ Du musst:                                                     │
│ • 5 Min Review                                                │
│ • Approval-Klick mit Begründung                                │
│                                                                │
│ [Open Astra-Draft →]                                          │
└────────────────────────────────────────────────────────────────┘
```

Anna fühlt sich produktiv. **In 14 Tagen ist sie 56% durch ihre erste Authorization** — das hätte alleine 6-12 Wochen Recherche-und-Schreibarbeit gewesen.

---

## TAG 30 — Submission

### Anna's Tag-30-Bilanz

Phase 1 ist komplett:

- ✓ Alle 9 Steps durch
- ✓ Markus hat QES-signiert (Mission-Director)
- ✓ Tobias hat 3 Counsel-Reviews abgegeben
- ✓ BAFA-Submission via Pharos-Webhook gemacht
- ✓ BAFA-Reference: BAFA-2026-AcSp-3-Auth-Pending

Phase 1B (CNES) startet jetzt — re-uses 60% von Phase 1.

```
┌─ SAT-ACME-3 · MILESTONE: BAFA SUBMITTED ──────────────────────┐
│                                                                │
│   ✓ Phase 1: BAFA-Authorization SUBMITTED                      │
│      2026-05-31 14:23 UTC                                     │
│      Reference: BAFA-2026-AcSp-3-Auth                          │
│      Hash-Chain-Anchor: 0x4f8a... [verify]                    │
│      QES-Signed: Markus Hoffmann (Mission-Director)            │
│      Counsel-Co-Signed: Dr. Tobias Müller                     │
│                                                                │
│      Estimated BAFA-Review: 60-180 days                       │
│      Caelex polls daily. We notify on status change.          │
│                                                                │
│   🆕 Phase 1B: CNES-Authorization STARTED                       │
│      Auto-initiated weil DE-Submission complete.              │
│      Re-uses 6 of 9 Steps from Phase 1 (translation only).    │
│      Estimated completion: T-90 (in ~60 days).                │
│                                                                │
│   📊 POSTURE-SCORE: 78% (+11 since BAFA-Submission)            │
│                                                                │
│   Tag 30 Bilanz:                                              │
│   • Caelex-Zeit gesamt: ~3h 20min                             │
│   • Vorher hätte das 6-9 Monate gedauert (manuell)            │
│   • Time-Saved: ~80%                                          │
└────────────────────────────────────────────────────────────────┘
```

---

## TAG 60 — NCA-Review läuft

Anna's typischer Tag-60-Login:

```
┌─ ACME SPACE · 2026-06-30 ─────────────────────────────────────┐
│                                                                │
│ POSTURE: 82% ↗ (Status: HEALTHY)                              │
│                                                                │
│ HEUTE WARTET KEINE AKTION AUF DICH.                            │
│                                                                │
│ Was Caelex im Hintergrund gemacht hat (24h):                  │
│   • BAFA-Status-Poll: noch keine Antwort (60 Tage in Review)  │
│   • CNES-Status-Poll: Submission acknowledged 5 days ago      │
│   • Sentinel: alle Telemetrie nominal                         │
│   • Atlas: 1 NIS2-Klarstellung erkannt — Astra-Bewertung:     │
│     "Betrifft dich nicht (deine Posture hält)"                │
│   • Posture-Snapshot: +1% in 24h (kein neuer Drift)            │
│                                                                │
│ Astra hat KEINE neuen Vorschläge.                              │
│                                                                │
│ Genieße den Tag. 🌞                                           │
└────────────────────────────────────────────────────────────────┘
```

**Anna's Tag-60-Login: 1 Minute**. Sie checkt nur ob alles OK ist, schließt den Browser.

---

## TAG 90 — Continuous-Compliance-Modus

Anna hat den Workflow-Drive verlassen — sie ist jetzt im **Continuous-Compliance-Modus**. BAFA hat approved (T+87), CNES approved (T+89). Sat-Acme-3 kann launchen wie geplant.

Ein typischer Tag 90:

```
┌─ ACME SPACE · 2026-07-30 ─────────────────────────────────────┐
│                                                                │
│ POSTURE: 89% ✓ (HEALTHY)                                       │
│                                                                │
│ 3 ITEMS DIE HEUTE DEINE AUFMERKSAMKEIT BRAUCHEN:               │
│                                                                │
│ 1. ⚠ NIS2-Update von gestern                                   │
│    BSI hat Klarstellung zu Art. 23 publiziert                 │
│    → Astra hat Impact-Analysis: 3 deiner Items betroffen      │
│    → 2 mit 6-Monats-Übergang (kein Druck)                     │
│    → 1 muss in 30 Tagen re-evidenziert werden                  │
│    [Astra-Plan ansehen → 5 Min]                               │
│                                                                │
│ 2. ⚠ Sat-Acme-3 Pre-Launch-Check (T-55 days)                  │
│    Phase 3 wird in 35 Tagen automatisch starten.              │
│    Keine Aktion heute nötig — Caelex meldet sich.             │
│                                                                │
│ 3. 📣 Astra-Vorschlag: ISO 27001 Pre-Audit                     │
│    "Du hast NIS2 + Counsel-Cyber-Posture-Tier-2.              │
│    ISO 27001 wäre realistisch in 6-9 Monaten erreichbar.      │
│    Aufwand: ~15-25k€. Wert: Investor-Sales-Argument."         │
│    [Plan ansehen → 8 Min]                                     │
│                                                                │
│ Hintergrund (gestern Nacht):                                   │
│   • Posture-Snapshot ✓                                        │
│   • Sentinel-Cross-Verify ✓                                   │
│   • BSI-Status: NIS2-Late-Reg APPROVED 2026-07-28              │
│     [Hash-Chain verify →]                                     │
│   • Atlas-Feed: 2 Updates, 1 relevant (siehe oben)            │
│                                                                │
│ ──────────────────────────────────────                        │
│                                                                │
│ Total Caelex-Zeit Tag-7-bis-Tag-90: ~6h 30 min                │
│ = ca. 4-6 Min pro Tag im Schnitt                              │
└────────────────────────────────────────────────────────────────┘
```

Anna macht heute Punkt 1 (NIS2-Update) — **5 Min für Astra-Plan-Review + Approval**. Punkt 3 markiert sie sich für nächste Woche.

**Tag 90 Aufwand: 8 Minuten.**

---

## ZUSAMMENFASSUNG — was hat Caelex Anna gegeben?

### In 90 Tagen erreicht

| Erfolg                            | Vorher (ohne Caelex)                      | Mit Caelex                        |
| --------------------------------- | ----------------------------------------- | --------------------------------- |
| **NIS2-Registrierung**            | "noch nicht gemacht, Frist verpasst"      | submitted Tag 0 + approved Tag 88 |
| **Sat-Acme-3 BAFA-Authorization** | hätte Q4 2026 nur halb fertig sein können | approved Tag 87                   |
| **CNES-Authorization Frankreich** | hätte ggf. Launch verzögert               | approved Tag 89                   |
| **Insurance-Renewal Munich Re**   | Krise im August                           | early-renewal Tag 7               |
| **Cyber-Posture-Audit**           | nie gemacht                               | Counsel-attested Tag 4            |
| **Continuous Compliance**         | nicht existent                            | läuft täglich automatisiert       |
| **Audit-Trail**                   | Email + PDFs                              | hash-chained, BAFA-cosigned       |

### Anna's Caelex-Zeit-Investment

| Phase                       | Caelex-Zeit                  |
| --------------------------- | ---------------------------- |
| Tag 0 (Onboarding)          | 18 Min                       |
| Tag 1-14 (Workflow-Drive)   | ~1h 30 Min                   |
| Tag 15-30 (Submission-Push) | ~1h 30 Min                   |
| Tag 31-60 (NCA-Wait)        | ~30 Min total (kurze Logins) |
| Tag 61-90 (Continuous)      | ~3h total (~6 Min/Tag)       |
| **TOTAL 90 TAGE**           | **~7 Stunden**               |

Was hätte das ohne Caelex gekostet?

- Authorization-Submission alleine: 4-6 Wochen Recherche + Schreibarbeit (= 60-90 Stunden)
- NIS2-Compliance-Setup: 20-30 Stunden Anwalts-Engagement
- Cross-Border-FR-Submission: 3-5 Wochen extra (= 40-60 Stunden)
- Continuous-Compliance: 5-10h/Woche dauerhaft

**Gesamt-Time-Saved: ~150-200 Stunden in 90 Tagen.** Bei Anna's CTO-Stundensatz ~€150 = **€22.500-30.000 in 90 Tagen gespart.**

### Was Anna an Caelex-Trust gewonnen hat

Auch nicht-quantifizierbar wertvoll:

- **Erstes Mal sauberen Audit-Trail** über alle Compliance-Aktivitäten
- **Erstes Mal Counsel proaktiv eingebunden** (statt nach Vorfällen)
- **Erstes Mal NIS2 systematisch verstanden** (nicht nur Newsletter-Wissen)
- **Mathematisches Vertrauen** in Compliance-Status (Hash-Chain, BAFA-Cosignature)

---

## KRITISCHE FRIKTIONEN — was nicht-magisch funktionierte

Ehrlichkeitshalber: nicht alles lief geschmiert.

### Friktion 1 — Tag 0 BSI-Late-Registration-Begründung

Astra hat geschrieben: "weil 14-Personen-Unternehmen ohne dediziertes Compliance-Team". Anna fand das **unangenehm zu lesen** ("klingt nach Ausrede"). Sie hat 3 Min damit verbracht den Wortlaut anzupassen. **UX-Lesson: Astra muss Tone-Customization-Slider anbieten.**

### Friktion 2 — Tag 7 Munich-Re-Antwort

Munich Re hat per **PDF-Brief** geantwortet (klassisch). Caelex hatte erwartet PDF-Upload-by-Operator → das war Anna nicht klar. Sie hat 10 Min gesucht wo sie das hochladen kann. **UX-Lesson: "Inbox" für externe Antworten muss prominenter sein.**

### Friktion 3 — Tag 14 COPUOS-Plan

Astra hat eine COPUOS-Conformance-Section gedraftet die Tobias als Counsel **kritisiert** hat — zu generic, nicht spezifisch für 47kg+SSO+550km-Profil. Anna musste 1h mit Tobias durchgehen + Astra mit Korrekturen re-prompten. **Lesson: Astra braucht mehr Domain-Daten zu kleinen Spacecraft-Klassen.**

### Friktion 4 — Tag 22 Operator-Profile-Re-Verification

Caelex hat täglich BAFA-Public-Register gepollt. Eines der Polls schlug fehl (BAFA-Server down). Caelex hat fälschlich für 4h "Operator-Status: UNVERIFIED" angezeigt — bis der nächste Poll erfolgreich war. Anna hat eine Notification-Mail bekommen und kurz Panik. **Lesson: Re-Verification-Failures sollten "stale" sein, nicht "unverified".**

### Friktion 5 — Tag 60 Cross-Browser-Issue

Anna hat von ihrem Privathandy aus eingeloggen wollen — der WebAuthn-Token war nur auf ihrem Laptop. Sie musste über Email-Magic-Link rein. **Lesson: WebAuthn-Multi-Device-Sync ist ein Adoptions-Blocker.**

### Friktion 6 — Tag 78 Insurance-Detail-Frage

BAFA hatte Klärungsfrage zur Insurance-Coverage. Caelex's Astra konnte die Frage interpretieren, aber Anna musste **Munich Re extern anrufen** für die spezifische Klärung — Caelex hatte keine direkte Munich-Re-API-Verbindung. **Lesson: Insurance-Broker-API-Integration ist Tier-2-Roadmap.**

---

## WAS ANNA NACH TAG 90 SAGT

Hypothetisches Quote:

> "Caelex hat in den ersten 18 Minuten meine NIS2-Pflicht erkannt die ich nicht kannte und einen Plan dafür gehabt. In Woche 2 habe ich mit Tobias zusammengearbeitet — er hat ohne Caelex auch nie so strukturiert mit mir gearbeitet. In Woche 4 hatte ich BAFA-Submission gemacht — alleine hätte das Q4 gedauert. Jetzt im Tag 90 mache ich 5-10 Minuten täglich, der Rest läuft im Hintergrund. Compliance ist von Stress-Faktor zu Routine geworden. **Das System nimmt mich wirklich an die Hand — aber ich behalte die Kontrolle.**"

Genau das ist der UX-Erfolg.

---

## IMPLIKATIONEN FÜR DAS PRODUKT

Basierend auf diesem Walkthrough:

### Was ABSOLUT funktionieren muss (oder Caelex scheitert)

1. **Auto-Detection in <60 Sekunden mit hoher Genauigkeit** (Tag 0)
   → Ohne das passiert kein Onboarding-Conversion

2. **Astra's Citation-Validity** (Tag 4, 14, 30, 90)
   → Wenn Astra Article-Nummern halluziniert, geht Trust verloren

3. **Counsel-Onboarding in <5 Minuten** (Tag 3)
   → Wenn Tobias 30 Min braucht um seine Rolle zu verstehen, weiß er nicht warum er da ist

4. **Background-Tasks ohne Operator-Zwischenfall** (kontinuierlich)
   → Cron-Failures dürfen nicht zu User-facing-Errors werden

5. **Workflow-DAG-Re-Generation bei Profil-Änderung** (Tag 7, Tag 60)
   → Wenn Profil sich ändert + DAG bleibt alt = Workflow läuft auf falscher Basis

### Was Frühphase-Sales-Pitches sein müssen

- "Nach 18 Minuten löst Caelex dein erstes Compliance-Problem" (Tag 0)
- "Nach 14 Tagen ist deine erste Authorization 56% durch" (Tag 14)
- "Nach 30 Tagen hast du BAFA submitted — vorher 3-6 Monate" (Tag 30)
- "Nach 90 Tagen kostest du 5-8 Minuten/Tag im Compliance-Routine-Mode" (Tag 90)

Das sind die **konkreten Verkaufs-Storys**.

### Was als Nächstes gebaut werden muss (Sprint-Reihenfolge)

1. **Auto-Detection-Engine** (3-4 Wochen) — Tag-0-Magic
2. **Mission-Operations-Center-UI** (3-4 Wochen) — Tag-14-Dashboard
3. **Counsel-Onboarding-Flow** (2-3 Wochen) — Tag-3-Counsel
4. **COE Personalized-DAG-Generator** (8-10 Wochen) — Tag-1-Roadmap
5. **AstraProposal Citation-Validator** (2-3 Wochen) — Tag-4+ Trust

**Total: ~18-24 Wochen** bis zur kompletten Anna-Walkthrough-Reality.

---

## SCHLUSS

Anna's Story ist **kein Marketing-Fantasy** — sie ist die **konkrete Validation** des gesamten Konzept-Stacks:

- **Verified Profile** (Tag 0) ✓ Auto-Detection + Provenance-Trail
- **COE Workflow-DAG** (Tag 1, 14) ✓ Personalized + Re-Generation
- **High-Tech UI** (Tag 0, 14) ✓ Source-Stream + Operations-Center + DAG-Map
- **Multi-Actor** (Tag 3-4) ✓ Counsel-Onboarding + Attestation
- **Astra Trust-Layer** (Tag 0, 4, 14, 30, 90) ✓ AstraProposal + Citation
- **Hash-Chain** (kontinuierlich) ✓ Audit-Trail + BAFA-Cosignature

Das Konzept funktioniert, **wenn wir die kritischen Friktionen vermeiden**. Der Walkthrough hat 6 davon identifiziert — alle lösbar in der Implementation.

Anna's wichtigster Satz: **"Das System nimmt mich wirklich an die Hand — aber ich behalte die Kontrolle."**

Genau das ist die UX-Spec für Caelex.

— Anna's Walkthrough Tag 1 bis 90, im Auftrag des Founders
