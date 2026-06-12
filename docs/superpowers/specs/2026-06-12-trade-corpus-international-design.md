# Passage Space-International — Korpus-Ausbau + Origin-Routing (Design-Spec)

**Datum:** 2026-06-12 · **Status:** vom Founder freigegeben (Chat-Review, abschnittsweise) · **Branch:** `feat/trade-space-international`
**Verwandte Docs:** `docs/superpowers/plans/2026-05-30-caelex-trade-to-92-MASTER.md` (Sprint H), `docs/CAELEX-TRADE-FINDINGS-BACKLOG-2026-05-30.md`, H-Teil-1-Muster (`src/data/trade/eu-annex-i-cat1-2.ts`)

---

## 1. Kontext & Problem

Passage (Caelex Trade) klassifiziert Export-Items gegen einen kuratierten Kontrolllisten-Korpus
(`src/data/trade/*.ts` → `normalized-corpus.ts` → `corpus-code-matcher.ts`) plus den parametrischen
`control-list-cross-walk.ts`. Stand 2026-06-12 (gezählt auf `origin/main`):

- **Space-Kern stark:** USML Cat XV paragraph-vollständig (98 Einträge in 4 Dateien), EAR 9x515 inkl.
  Sub-Codes, EU Annex I Cat 1–7 kuratiert (363 Einträge), Russia-833-Annexe, NSG.
- **International dünn:** UK-Kontrollliste **fehlt komplett**, USML Cat IV (Launch) nur Headline,
  MTCR-Annex als eigene Liste nur 9 Einträge, DE Anlage AL 8 + Ausfuhrliste 28, JP/IN nur Headline,
  CA/AU/KR/CH/NO **fehlen komplett**, EU Common Military List (militärische Raumfahrt) **fehlt**.
- **Engine EU/US-zentriert:** `order-of-review`/Determination/AVA denken primär EU/DE/US
  (+UK-ECJU/FR-LOS/FAA-Formular-Overlays). Ein UK-/JP-Origin-Kunde bekommt kein im Origin-Recht
  fundiertes Verdict.

**Founder-Anforderung (wörtlich sinngemäß):** Passage muss **alles Space-Spezifische** abdecken.
Wir wissen nicht, wo Kunden sitzen und wohin sie liefern (Beispiel: Sitz FR, Lieferung USA).
Katastrophenfall ist ein **false-CLEARED** („wir liefern etwas aus, was nicht durfte").
Über-Blocken ist akzeptabel, Falsch-Freigeben nicht.

## 2. Entscheidungen (geklärt im Brainstorming 2026-06-12)

| #   | Frage        | Entscheidung                                                                                                                                                                                                                                                         |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Scope        | **Space-spezifisch vollständig über die Origin→Destination-Matrix** — nicht „alle Listen komplett". Treiber: kein false-CLEARED, egal welche Kombination.                                                                                                            |
| 2   | Origin-Kreis | **Kreis A — westliche Space-Nationen:** EU-27 (ein Regime: EU 2021/821 + EU Common Military List), UK, USA, CH, NO, CA, JP, AU, KR, IN. Erweiterbar (CN/IL/BR/AE später), Architektur bleibt gleich.                                                                 |
| 3   | Tiefe        | **Tier-Modell.** Tier 1 = Paragraph + parametrische Prädikate (space-definierende Kerne). Tier 2 = Code-Ebene, keyword-matchbar (volle Space-Scheibe je Jurisdiktion). Tier 3 = Headline + ehrliche Coverage → erzwingt REVIEW.                                      |
| 4   | Engine       | **Korpus + schlankes Origin-Routing.** `order-of-review` kennt das primäre Regime je Origin; unvollständige Abdeckung ⇒ konservativ REVIEW mit Begründung. KEINE Genehmigungsarten je Land (OGELs etc.) — das ist eine spätere Phase.                                |
| 5   | Kosten       | **Null externe Kosten, hart.** Alle Quellen amtlich + gratis. Kuration durch Claude zur Coding-Zeit. Zur Laufzeit kein einziger neuer AI-Call (Korpus = statische Daten, Matching = purer Code). Keine neuen Dependencies, keine Feeds, keine Abos, keine Migration. |
| 6   | Ansatz       | **Golden-Set-getrieben + Mirror-Architektur** (Ansatz 1 von 3): Sprint 0 macht das System international _sicher_ (fail-closed), jeder weitere Sprint kauft _Präzision_.                                                                                              |

## 3. Nicht-Ziele (explizit)

- Keine Genehmigungsarten/General Licences je Land (UK OGEL, EU001-Äquivalente, JP-Bulk) — Folgephase.
- Keine Import-Kontrollen der Ziel-Länder (Exporteur-Pflichten only).
- Keine Nicht-Kreis-A-Origins (CN/IL/BR/AE/SG/TR) — Origin außerhalb Kreis A ⇒ ehrliches REVIEW.
- Kein Prisma-Schema-Change, keine Migration, keine UI-Redesigns.
- Keine Behörden-Workflows/Formulare für neue Länder (BAFA/ECJU/FR/FAA bleiben wie heute).
- CW/BW-Listen bleiben bewusst headline-only (bestehende Coverage-Deklaration).

## 4. Design

### 4.1 Datenmodell — Erweiterung ohne Bruch

Bewährtes Muster bleibt: per-Regime-TS-Datei → Adapter → `NormalizedCorpusEntry`
(`src/data/trade/normalized-corpus.ts`). Neu:

- **`CorpusRegime`-Union erweitern:** `UK_STRATEGIC`, `EU_CML`, `CA_ECL`, `AU_DSGL`,
  `KR_STRATEGIC`, `CH_GKV`, `NO_LIST`. (`JP_METI`, `IN_SCOMET` existieren → vertiefen.)
- **Mirror-Felder** auf `NormalizedCorpusEntry`:
  - `mirrorsCanonicalId?: string` — verweist auf den Quell-Eintrag (z. B. `WASSENAAR:9A004`),
  - `mirrorDelta?: "NONE" | "MODIFIED" | "NATIONAL_ONLY"`.
    Ein CA/AU/KR/CH/NO-Eintrag, der 1:1 Wassenaar/MTCR spiegelt, dupliziert keinen Inhalt — er trägt
    den **nationalen Code** + Verweis. Der Matcher löst durch Mirrors auf: ein Treffer liefert
    automatisch die nationalen Codes aller Mirror-Jurisdiktionen mit. Kuratiert werden nur Deltas.
- **`depthTier?: 1 | 2 | 3`** pro Eintrag (Transparenz im UI + Eingang in die Fail-Closed-Regel 4.3a).
- Jede neue Datei deklariert `ClassificationCoverage` mit explizitem `excluded` (bestehendes
  Ehrlichkeits-Muster) + `asOfDate` + `sourceUrl` je Eintrag. **Kein Eintrag ohne Quellzitat.**
- Adapter: neue Regime nutzen, wo möglich, die bestehende `ClassificationEntry`-Shape-Familie;
  Mirror-Einträge bekommen einen eigenen schlanken Adapter (`adaptMirrorEntries`).

### 4.2 Origin-Routing — die schlanke Engine-Erweiterung

Neues pures Modul `src/lib/comply-v2/trade/classification/origin-regime-map.ts`:

```
originRegimes(countryIso2): {
  dualUsePrimary: CorpusRegime;        // UK→UK_STRATEGIC, JP→JP_METI, EU-27→EU_ANNEX_I, US→US_CCL, …
  militaryPrimary: CorpusRegime|null;  // EU-27→EU_CML, US→USML, UK→UK_STRATEGIC(ML-Teil), …
  multilateralBaseline: CorpusRegime[];// MTCR/WASSENAAR/NSG — informational, NIE primär (bestehende
                                       // order-of-review-Architektur bleibt unangetastet)
  supported: boolean;                  // false für Nicht-Kreis-A → Fail-Closed 4.3b
}
```

- `order-of-review` konsumiert die Map: **das Origin bestimmt, welches Regime das Verdict trägt.**
  EU-27 nutzt einen einzigen Eintrag (Wiederverwendung des bestehenden EU-27-Sets
  `src/lib/comply-v2/trade/eu-member-states.ts`).
- **Begriffstrennung (verbindlich):** _Exporteur-Sitz_ = Land aus dem Org-Profil
  (`TradeOrgProfile`/`Organization`) → bestimmt das anwendbare Ausfuhrrecht. _Item-`countryOfOrigin`_
  → füttert ausschließlich Re-Export-Logik (De-minimis/FDPR, existiert). Die beiden dürfen nirgends
  vermischt werden (Lehre aus T-H6).
- AVA/Determination zeigen die Zeile „bewertet unter <Origin-Regime>" im Verdict (einzige UI-Änderung).

### 4.3 Fail-Closed-Regeln — „nichts falsch ausliefern"

a) **Dünne Abdeckung:** Origin ∈ Kreis A, aber der Treffer-/Themenbereich ist im Origin-Regime nur
Tier 3 oder gar nicht abgedeckt ⇒ **REQUIRES_REVIEW** mit Klartext-Begründung
(„UK-Liste für diesen Bereich noch nicht tief abgedeckt — manuell prüfen"), **nie CLEARED**.
b) **Unbekanntes Origin:** Origin ∉ Kreis A ⇒ REVIEW „Origin-Jurisdiktion nicht unterstützt".
c) **Unauflösbarer Code:** deklarierter nationaler Code, der im Korpus nichts trifft ⇒ REVIEW
(bestehende Konservativität, ausgedehnt auf die neuen Regime).

CLEARED gibt es international nur, wo Daten **und** Routing es positiv tragen. Damit ist das System
ab Sprint 0 sicher — alle weiteren Sprints reduzieren nur false-REVIEW-Reibung.

### 4.4 Golden Set — die Messlatte als Test-Suite

- **Datei:** `src/lib/comply-v2/trade/classification/golden-set/space-items.ts` (Item-Definitionen
  mit realistischen technischen Attributen) + `golden-set.test.ts` (läuft als normale Vitest-Datei in CI).
- **~12 repräsentative Space-Items:** Satellitenbus, EO-Payload (SAR + optisch), Hall-Effekt-Triebwerk,
  chemisches Apogäums-Triebwerk, Sternsensor, Reaktionsrad, Bodenstation/TT&C mit Krypto,
  Launcher-Tankstruktur (Composite), Flight-Software, GNSS-Empfänger (space-qualifiziert),
  Strahlungsgehärtete OBC-Elektronik, Composite-Prepreg-Material.
- **Dimensionen:** × 10 Kreis-A-Origins × ~6 Destination-Klassen (intra-EU, US, befreundet-non-EU (JP),
  IN, CN, Embargo (RU/IR/KP)). Sinnlose/redundante Kombinationen gestrichen ⇒ **~150–250 Assertions**.
- **Assertion-Stile (zweistufig):**
  - _Exakt_ nur, wo der Rechtstext es eindeutig trägt (z. B. „DE→RU Satellitenteil ⇒ BLOCKED").
  - _Mindest-Strenge_ überall sonst: `expectAtLeast(REVIEW)` — „darf NICHT CLEARED sein".
    Kein fabrizierter Rechtsanspruch, aber ein hartes Sicherheitsnetz.
- Das Golden Set ist die **objektive Definition von „international fertig"** und zugleich das
  Regressionsnetz für jeden Daten-Sprint.

### 4.5 Daten-Produktion — Quellen (alle amtlich + gratis) & Disziplin

| Regime                           | Quelle (kostenlos, amtlich)                                                |
| -------------------------------- | -------------------------------------------------------------------------- |
| MTCR Annex (komplett)            | mtcr.info — Equipment, Software and Technology Annex                       |
| USML Cat IV                      | ecfr.gov — 22 CFR 121.1 (bestehendes XV-Muster)                            |
| EU Common Military List          | EUR-Lex — jährliche Bekanntmachung „Gemeinsame Militärgüterliste der EU"   |
| Wassenaar DUL Cat 9 / ML         | wassenaar.org/control-lists                                                |
| UK Strategic Export Control List | gov.uk — „UK strategic export control lists" (konsolidiert)                |
| JP METI                          | meti.go.jp — Security Export Control (amtliche englische Fassungen)        |
| IN SCOMET                        | dgft.gov.in — Appendix 3 (SCOMET)                                          |
| CA Export Control List           | laws-lois.justice.gc.ca (SOR/89-202) + Guide (international.gc.ca)         |
| AU DSGL                          | legislation.gov.au — Defence and Strategic Goods List                      |
| KR Strategic Items               | yestrade.go.kr / MOTIE Public Notice (englische Fassungen, soweit amtlich) |
| CH GKV                           | fedlex.admin.ch — Güterkontrollverordnung, Anhänge                         |
| NO Liste I/II                    | regjeringen.no (spiegelt EU-Listen → Mirror-Kandidat)                      |

**Disziplin je Sprint (H-Teil-1-Muster + C2-Lektion):**

1. Kuration aus der amtlichen Quelle; jeder Eintrag trägt `sourceUrl` + `asOfDate`; Beschreibungen
   paraphrasiert (kein Verbatim-Abtippen), Code-Nummern exakt.
2. Invarianten-Tests je Datei (Anzahl, Code-Format-Regex, Pflichtfelder, keine Duplikate in der Union).
3. **Unabhängiger Verifikations-Agent** liest den Rechtstext gegen die Einträge (objektives Orakel:
   grep-Zählungen, Stichproben-Zitate) — kein Eintrag landet unverifiziert im Commit.
4. **JP/KR-Ehrlichkeit:** Was amtlich-englisch nicht verifizierbar ist, wird NICHT halluziniert,
   sondern in `coverage.excluded` deklariert (⇒ Fail-Closed-Regel 4.3a greift).

### 4.6 Pflege — Frische dauerhaft

- **Vierteljährlicher Frische-Audit:** kleines Repo-Skript (`scripts/trade-corpus-freshness.ts`,
  reine Node/TS, kein AI-Call) listet Regime + `asOfDate` + Quelle, sortiert nach Alter; Checkliste
  im Doc. Amendment-Prüfung (EUR-Lex-Novellen, Federal-Register, gov.uk-Updates) bleibt manuell-kuratiert.
- Annex-IV-Pakete: bestehender manueller Prozess unverändert.
- Master-Plan-Status-Board (§4) wird je Sprint fortgeschrieben.

### 4.7 UI — minimal

Korpus-Chips zeigen neue Regime automatisch (NormalizedCorpusEntry trägt `list`-Label).
Einzige Ergänzung: AVA-/Determination-Verdict zeigt „bewertet unter <Origin-Regime>" +
ggf. die Fail-Closed-Begründung aus 4.3. Keine neuen Seiten, keine Navigation-Änderung.

## 5. Sprint-Plan (jeder Sprint einzeln deploybar, TDD)

| Sprint | Inhalt                                                                                                                                                                             | Akzeptanz                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S0** | Golden Set + `origin-regime-map` + Fail-Closed in order-of-review/Determination/AVA + Verdict-Zeile                                                                                | Golden Set läuft in CI (Mindest-Strenge-Assertions grün); unbekanntes Origin/dünne Abdeckung ⇒ REVIEW testbewiesen; **bestehende EU/DE/US-Flows verhaltensgleich** (volle Trade-Suite grün, tsc-Baseline 666 unverändert) |
| S1     | MTCR-Annex komplett, Tier 1 (~150–200 Einträge + Prädikate für parametrisierbare Items: Reichweite/Nutzlast-Tripwires etc.)                                                        | Verifikations-Agent bestätigt gegen mtcr.info; Golden-Set-MTCR-Fälle von REVIEW→präzise; Cross-Walk-Prädikate getestet                                                                                                    |
| S2     | USML Cat IV Paragraph-Ebene, Tier 1 (Muster = XV-Dateien; SME-Flags)                                                                                                               | wie S1 gegen eCFR; Launch-Items im Golden Set präzise                                                                                                                                                                     |
| S3     | `UK_STRATEGIC` Space-Scheibe neu, Tier 2 (~120–180 Ratings: Dual-Use-9er + ML-Spiegel + UK-Spezifika)                                                                              | UK-Origin-Routing aktiv; kein Golden-Set-UK-Fall resolves-to-NOTHING                                                                                                                                                      |
| S4     | `EU_CML` space-relevante ML-Positionen, Tier 1/2 (Kandidaten ML10/ML11/ML4 — **exakte Positionsauswahl wird im Sprint gegen den EUR-Lex-Text verifiziert**, nicht vorab behauptet) | EU-Origins bekommen militärische Space-Klassifizierung; DE/FR-Hinweise verlinkt                                                                                                                                           |
| S5     | Mirror-Gerüst (Datenmodell 4.1) + `CH_GKV`/`NO_LIST`/`CA_ECL`/`AU_DSGL`/`KR_STRATEGIC` als Mirror+Delta + Wassenaar-Cat-9-Vertiefung                                               | 5 Origins live; Mirror-Auflösung getestet; Deltas quellen-verifiziert                                                                                                                                                     |
| S6     | `JP_METI` Matrix-Vertiefung + `IN_SCOMET` space-Kategorien vertiefen                                                                                                               | JP/IN-Golden-Set-Fälle präzise; JP/KR-`excluded` ehrlich deklariert                                                                                                                                                       |
| S7     | Frische-Audit-Skript + Doku-Reconcile (inkl. stale Header in `eu-annex-i.ts` „~30 entries") + Score-Re-Assessment + Status-Board                                                   | Korpus-Score-Selbsteinschätzung space-vertikal international ≥90; Master-Plan-Board aktuell                                                                                                                               |

Reihenfolge-Logik: S1/S2 sind Querschnitt (nützen **jedem** Origin inkl. heutiger EU/US-Kunden),
dann Origins nach Kundenwahrscheinlichkeit (UK → EU-Militär → Mirror-Block → Asien).

## 6. Teststrategie

- **Golden Set** (4.4) = Akzeptanz + Regression, ab S0 in CI.
- **Invarianten-Tests je Korpus-Datei** (Anzahl/Format/Pflichtfelder/Union-Eindeutigkeit) — bestehendes Muster.
- **Routing-Tests:** origin-regime-map vollständig für Kreis A; order-of-review-Primärregime je Origin;
  Fail-Closed-Pfade (4.3a–c) einzeln.
- **Mirror-Tests:** Auflösung Mirror→Quelle, Delta-Typen, keine Zyklen.
- **Regression:** komplette bestehende Trade-Suite grün je Sprint; `tsc`-Baseline (666) nicht verschlechtert;
  keine Verhaltensänderung für EU/DE/US-Bestandsflows in S0 (Snapshot-Vergleich der Verdicts im Test).

## 7. Risiken & Mitigationen

| Risiko                                                | Mitigation                                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Falscher Rechts-Fakt im Korpus (false-CLEARED-Quelle) | Doppel-Verifikation (Implementer + unabhängiger Prüf-Agent gegen Rechtstext), Quellzitat je Eintrag, Mindest-Strenge-Assertions, konservative Tier-3-Defaults                                |
| Mirror-Vereinfachung übersieht nationale Abweichung   | Mirror nur für belegte 1:1-Fälle; jede Abweichung als `MODIFIED`/`NATIONAL_ONLY`-Delta kuratiert; Verifikations-Agent prüft Delta-Vollständigkeit stichprobenhaft gegen die nationale Quelle |
| JP/KR amtliches Englisch lückenhaft                   | Ehrliches `excluded` + Fail-Closed statt Halluzination                                                                                                                                       |
| Scope-Kriechen Richtung Genehmigungsrecht je Land     | Nicht-Ziele §3 sind verbindlich; OGEL/Genehmigungsarten = eigene spätere Spec                                                                                                                |
| Golden-Set-Erwartungen selbst falsch                  | Zweistufiger Assertion-Stil: exakt nur bei eindeutiger Rechtslage, sonst Mindest-Strenge                                                                                                     |
| Korpus veraltet schleichend                           | §4.6 Frische-Audit, `asOfDate` je Eintrag, Quartals-Checkliste                                                                                                                               |

## 8. Definition of Done („komplett international" — messbar)

1. Golden Set 100 % grün, Abdeckung über alle Kreis-A-Origins × Destination-Klassen.
2. Kein Golden-Set-Item, das in seinem Origin-Primärregime „resolves to NOTHING".
3. Fail-Closed-Regeln 4.3a–c testbewiesen; CLEARED international nur mit positiver Daten+Routing-Deckung.
4. Alle neuen Regime mit ehrlicher Coverage-Deklaration + Quellzitat je Eintrag.
5. Korpus-Score (Space-Vertikale international) in der Selbsteinschätzungs-Systematik ≥ 90.
6. Null neue externe Kosten: keine neuen Dependencies/Feeds/AI-Laufzeit-Calls (grep-/Review-verifiziert).
7. Master-Plan-Status-Board + Doku aktualisiert.

## 9. Offene Punkte

- KR: Umfang der amtlich-englischen Fassung wird erst im Sprint S5/S6 belastbar sichtbar —
  Fallback ist deklariertes `excluded` + Fail-Closed (kein Blocker fürs Design).
- FR AMA (nationale Militärgüter-Nuancen über EU-CML hinaus): als Delta-Hinweis in S4 geprüft,
  nicht als eigenes Regime geplant.

## 10. Amendments (Ausführungs-Erkenntnisse)

- **2026-06-12 / S0:** §4.2 nahm an, `resolveOrderOfReview` sei der Live-Verdict-Träger. Befund PF-2 (Golden-Set-Review): die Funktion hat KEINEN Produktions-Caller (toter Code; nur Typ-Import). Die Origin-Awareness wurde stattdessen dort verankert, wo das Verdict real entsteht: `license-determination.ts` (Gate 4.5 thin-coverage + **Gate 1.6 RU/BY-Destinationsverbot**, neu) + AVA (`assessedUnder`, Origin-Pendenz). `resolveOrderOfReview` ist origin-aware ausgebaut und getestet, Wire-up-Entscheidung = S1+ (PF-2 im Plan-Board).
- **2026-06-12 / S0-Scope-Erweiterung (PF-1, HIGH):** Das Golden Set deckte auf, dass KEIN Layer das destinationsbasierte Dual-Use-Verbot nach RU/BY erzwang (Art. 2/2a VO (EU) 833/2014; Art. 1e/1f VO (EG) 765/2006) — Verdict war REVIEW statt BLOCKED. Geschlossen durch Gate 1.6 (alle Origins, Über-Blocken bewusst; qualifizierte Rechtszitate auf dem US-ECCN-only-Pfad). Damit sind die in §4.4 vorgesehenen EXACT-RU-Pins real.
