# Engine-Origin-Determination — Design-Spec

**Datum:** 2026-06-13 · **Status:** vom Founder freigegeben (Chat-Brainstorm, abschnittsweise) · **Branch:** (neu von `origin/main` nach dem S5–S6-Deploy + Basis-Audit) — Arbeits-Branch z. B. `feat/trade-origin-determination`
**Verwandte Docs:** `docs/superpowers/specs/2026-06-12-trade-corpus-international-design.md` (Korpus + Origin-Routing, S0–S7), `docs/superpowers/plans/2026-05-30-caelex-trade-to-92-MASTER.md`
**Memory:** [[trade-space-international]], [[caelex-trade-audit]]

---

## 1. Kontext & Problem

Nach der Kampagne S0–S7 sind zwei von drei Schichten international:

1. **Klassifizierung (Korpus)** — ✅ international (S1–S6): ein Item bekommt seinen Kontrollcode in jeder Kreis-A-Jurisdiktion.
2. **Origin-Routing** (`src/lib/comply-v2/trade/classification/origin-regime-map.ts`) — ✅ (S0): das System kennt das primäre Regime je Exporteur-Sitz.
3. **Lizenz-Determination (das Verdict)** — ❌ **nur EU/DE/US.**

Die zentrale Engine `src/lib/comply-v2/trade/license-determination.ts` (`determineLicenseRequirements`, Gates 0–4.5) modelliert ausschließlich EU/DE/US-Genehmigungsrecht; die einzigen Genehmigungs-Behörden, die sie als Verdict ausgibt, sind BAFA, BIS, DDTC, EU_COMPETENT_AUTHORITY. Den `exporterOrigin` nutzt sie an **genau einer** Stelle: **Gate 4.5** — ein fail-closed REVIEW („dein Land modellieren wir noch nicht — manuell prüfen"). Deshalb stehen alle Nicht-EU/US-Regime (UK/CH/NO/CA/AU/KR/JP/IN) bewusst auf `REGIME_MATURITY = 3` (UK-Lektion: `dualUsePrimary` ohne Origin-Determination = sonst false-CLEARED).

**Founder-Anforderung:** Das Feature muss „perfekt weltklasse, 100/100" sein. Ein UK-/CH-/JP-Exporteur soll keine pauschale „prüf manuell"-Antwort bekommen, sondern die **echte länderspezifische Lizenz-Antwort** nach _seinem_ Recht.

## 2. Entscheidungen (Brainstorm 2026-06-13)

| #   | Frage            | Entscheidung                                                                                                                                                                                                                                                                                                           |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tiefe            | **Stufe A — volle General-/Einzellizenz-Eligibility.** Die Engine sagt: „General-Lizenz greift → kein Einzelantrag (GO mit Auflagen)" / „keine General-Lizenz → Einzelantrag bei \<Behörde\> (REVIEW)" / „verboten (BLOCKED)". Nicht nur das _Ob_, sondern _ob eine General-Lizenz die Item×Ziel-Kombination abdeckt_. |
| 2   | Scope            | **Alle Kreis-A-Origins, volle Stufe-A. EU = EIN Modul** (VO 2021/821 + EUGEA EU001–008 unionsweit einheitlich; nur die NCA differiert je Mitgliedstaat → Mitgliedstaat→NCA-Tabelle). ~10 Module: EU · UK · US (Refactor/Wrap des Bestehenden) · CH · NO · CA · AU · KR · JP · IN.                                      |
| 3   | Rubrik „100/100" | **„Nie falsch", NICHT „nie REVIEW".** Wo die amtliche Quelle die General-Lizenz-Eligibility klar definiert → exakte Antwort. Wo das Recht echtes Behörden-Ermessen verlangt (catch-all/end-use, Widerruf) → **REVIEW ist die korrekte Antwort** (ein erzwungenes GO wäre false-CLEARED).                               |
| 4   | Architektur      | **Ansatz 1 — uniformes Origin-Modul-Interface + Registry + General-Lizenz-Datentabellen.** (Verworfen: flache Regeltabelle = General-Lizenz-Logik zu komplex für Daten; Inline-Gates = Funktion bläht über 10 Länder auf, keine Isolation.)                                                                            |
| 5   | Kosten           | **Null externe Kosten, hart.** Alle Quellen amtlich + gratis. Keine neuen Dependencies, keine Migration (reine TS-Daten + pure Engine), kein Runtime-AI-Call.                                                                                                                                                          |

## 3. Nicht-Ziele (explizit)

- Keine Import-Kontrollen der Zielländer (nur Exporteur-Pflichten).
- Keine Origins außerhalb Kreis A (bleiben fail-closed REVIEW via Gate 4.5 / „Origin nicht unterstützt").
- Kein Ziel „möglichst viele GO" — wo das Recht REVIEW verlangt, bleibt es REVIEW (Haftung > Convenience).
- Keine vollständige Erfassung _jeder_ General-Lizenz-Nuance _für immer_ — das ist laufende Kuration; 100/100 misst an der erreichbaren Rubrik (§9), nicht an Allwissenheit.
- Kein Prisma-Schema-Change, keine Migration, kein UI-Redesign (nur die `assessedUnder`-Zeile wird erweitert).
- Keine Änderung an den destinationsbasierten Hartverbots-Gates (0/1.5/1.6/2) — die bleiben vorrangig.

## 4. Architektur

### 4.1 Kern-Interface & Typen

Neues Modul `src/lib/comply-v2/trade/origin-determination/types.ts`:

```ts
export type OriginLicenceOutcome = "GO" | "REVIEW" | "BLOCKED";
export type OriginLicenceType =
  | "NONE"
  | "GENERAL"
  | "INDIVIDUAL"
  | "PROHIBITED";

export interface OriginLicenceVerdict {
  outcome: OriginLicenceOutcome;
  licenceType: OriginLicenceType;
  authority: string; // NCA, z. B. "ECJU", "BAFA", "SECO"
  generalLicence?: { id: string; label: string; conditions: string[] };
  reasons: string[];
  citations: string[]; // amtliche Quelle je Aussage (Pflicht)
}

export interface OriginDeterminationInput {
  /** Klassifizierungs-Ergebnis (Codes je Regime, itemClass, declared codes). */
  classification: ClassificationLike;
  /** Normalisiertes ISO-2-Zielland. */
  destinationCountry: string;
  /** Aus origin-regime-map (Sitz-Land + primäre Regime). */
  exporterOrigin: OriginRegimeRouting;
  /** Exporteur-Sitz ISO-2 (für die EU-Mitgliedstaat→NCA-Auflösung). */
  exporterSeat: string;
  screeningContext?: ScreeningContextLike;
}

export type OriginLicenceModule = (
  input: OriginDeterminationInput,
) => OriginLicenceVerdict;

export interface GeneralLicence {
  id: string; // z. B. "OGEL_MIL_GOODS", "EU001"
  label: string;
  authority: string;
  /** Eligibility: trifft auf die klassifizierten Codes zu? (Prädikat über die Klassifizierung) */
  eligibleCodes: (c: ClassificationLike) => boolean;
  /** Zulässige Ziele (ISO-2-Set oder Prädikat) + ausgeschlossene Ziele (haben Vorrang). */
  eligibleDestinations: ReadonlySet<string> | ((iso2: string) => boolean);
  excludedDestinations: ReadonlySet<string>;
  conditions: string[]; // z. B. Registrierung, Aufzeichnungspflicht
  citation: string;
}
```

(Die genauen `ClassificationLike`/`ScreeningContextLike`-Shapes werden bei der Foundation an die realen Engine-Typen angeglichen — kein Platzhalter, sondern Read-then-bind beim Bauen.)

### 4.2 Per-Origin-Module + Registry

- `src/lib/comply-v2/trade/origin-determination/<origin>.ts` je Land — exportiert einen `OriginLicenceModule` + seine `GeneralLicence[]`-Datentabelle. Jede General-Lizenz quellen-zitiert.
- `src/lib/comply-v2/trade/origin-determination/registry.ts` — `Map<CorpusRegime|originIso, OriginLicenceModule>`. Lookup über `exporterOrigin.dualUsePrimary`/`militaryPrimary`.
- **EU-Modul** (`eu.ts`): VO 2021/821-Logik + EUGEA EU001–008 als `GeneralLicence[]`; eine `EU_MEMBER_NCA: Record<ISO2, string>`-Tabelle (DE→BAFA, FR→DGA-SBDU, IT→UAMA, …) liefert die `authority`. Wiederverwendung des bestehenden EU-27-Sets.
- **US-Modul** (`us.ts`): **Wrap, nicht Neuschreiben.** Die bestehende EAR-Lizenzausnahmen-/de-minimis-/ITAR-Logik in `license-determination.ts` wird hinter das Interface gehüllt (verhaltensidentisch — durch Snapshot-Test belegt). EAR License Exceptions (STA, GBS, …) + ITAR-Exemptions sind die „General Licences" des US-Moduls.
- **UK/CH/NO/CA/AU/KR/JP/IN** je ein Modul mit ihren General-Lizenzen (OGEL / GAB / GEP / Bulk / …).

### 4.3 Verdrahtung in `determineLicenseRequirements`

**Reihenfolge = Sicherheit.** Unverändert vorrangig laufen die destinationsbasierten Hartverbote: Gate 0 (Annex IV), Gate 1.5 (Embargo-Ziel), Gate 1.6 (RU/BY-Dual-Use), Gate 2 (ITAR). Erst danach, für die nicht-prohibierten Fälle, greift:

- **Neue Stufe „Origin-Determination"** (ersetzt für Kreis-A-Origins den Gate-4.5-Fallback): wenn `exporterOrigin.supported` UND ein Modul in der Registry existiert → rufe das Modul, falte sein `OriginLicenceVerdict` in das `requirements`-Ergebnis.
  - **WICHTIG — Invariante ist „kein false-CLEARED", NICHT „tightening-only".** Anders als die Korpus-Sprints (verdict-neutral) und Gate 1.6/4.5 (nur verschärfend) produziert dieses Feature **bewusst korrekte Lockerungen**: ein generischer Gate-4.5-Thin-REVIEW wird zu **GO**, wenn das Origin-Modul eine greifende General-Lizenz nachweist. Das ist der ganze Zweck. Erlaubt ist diese REVIEW→GO-Lockerung NUR, wenn ein `generalLicence` mit `citation` sie rechtlich trägt — jedes GO ist quellen-belegt. Verboten bleibt: ein GO, das ein vorgelagertes Hartverbot überstimmt.
  - **Vorrang-Regel:** Die destinationsbasierten Hartverbote (Gate 0/1.5/1.6/2) laufen VOR dem Modul und sind nicht überstimmbar — eine nationale General-Lizenz kann ein Embargo/Sanktion/ITAR-Block nie zu GO machen. BLOCKED-Pfade aus diesen Gates bleiben BLOCKED.
- **Gate 4.5** bleibt der Fallback NUR für Origins ohne Modul (Nicht-Kreis-A, oder ein Kreis-A-Land dessen Modul noch nicht gebaut ist → bis dahin weiter fail-closed REVIEW).
- Mapping `OriginLicenceOutcome` → bestehende `RequirementStatus`/Gate-Aggregation: GENERAL→GO-Pfad mit Auflagen-Requirement, INDIVIDUAL→REVIEW_NEEDED-Requirement bei der NCA, PROHIBITED→BLOCKED.

### 4.4 Maturity-Lift

Pro Land `REGIME_MATURITY[<regime>]` 3→2, **sobald** sein Modul gebaut + W6-quellenverifiziert ist (die im Code dokumentierte Lift-Bedingung wird damit erfüllt). Das ist der Score-Hebel. Golden-Set: der Thin-Coverage-REVIEW (Gate 4.5) entfällt für dieses Origin → die betroffenen Zellen wechseln vom generischen REVIEW auf das **präzise** Modul-Verdict (GO-unter-General-Lizenz / REVIEW-Einzelantrag / BLOCKED).

### 4.5 Fail-closed & Ehrlichkeit (verbindlich)

1. Destinations-Hartverbote (Embargo/Sanktion/Annex IV/ITAR-Block) schlagen IMMER durch — vor dem Origin-Modul, nie überstimmbar.
2. General-Lizenz-Eligibility nur GO, wenn die amtliche Quelle Item×Ziel×Bedingungen **eindeutig** trägt; sonst REVIEW (Einzelantrag).
3. Echtes Behörden-Ermessen (catch-all/end-use/Widerrufsvorbehalt) → REVIEW, nie GO.
4. Unklassifiziertes/unbekanntes Item oder unbekannter Sitz → REVIEW (bestehende Konservativität).
5. Jede Modul-Aussage trägt `citations` (amtliche Quelle); keine fabrizierte Eligibility.

### 4.6 AVA/UX

Die bestehende `assessedUnder`-Zeile im `VerdictPanel` (S0) wird um das Lizenz-Detail erweitert: „Bewertet unter \<Regime\> — 🟢 GO unter \<General-Lizenz\> (Auflagen: …)" / „🟡 Einzelantrag bei \<NCA\> nötig" / „🔴 verboten". Kein Redesign, keine neue Seite.

## 5. Quellen (amtlich + gratis, je Modul)

| Origin | Quelle (General-Lizenzen + Determination)                                                      |
| ------ | ---------------------------------------------------------------------------------------------- |
| EU     | EUR-Lex VO 2021/821 + Anhang II EUGEA EU001–EU008 (Union General Export Authorisations)        |
| UK     | gov.uk „Open general export licences" (OGELs) + ECJU SPIRE-Doku                                |
| US     | eCFR 15 CFR 740 (EAR License Exceptions) + 22 CFR 126 (ITAR exemptions) — Wrap des Bestehenden |
| CH     | fedlex GKV — Generalausfuhrbewilligungen (ordentliche/außerordentliche GAB), SECO              |
| NO     | regjeringen.no / Lovdata — norwegische Ausfuhr-General-Lizenzen, MFA                           |
| CA     | laws-lois.justice.gc.ca + GAC — General Export Permits (GEP No. …)                             |
| AU     | legislation.gov.au — Defence Trade Controls / DSGL General Permits                             |
| KR     | yestrade.go.kr / MOTIE — Comprehensive/General Licences                                        |
| JP     | meti.go.jp — General Bulk Licence / Special General Bulk Licence                               |
| IN     | dgft.gov.in — SCOMET General Authorisations (GAET/GAEIS, soweit vorhanden; sonst Einzel)       |

## 6. Datei-Landkarte

- Create: `src/lib/comply-v2/trade/origin-determination/types.ts` (Interface + GeneralLicence)
- Create: `src/lib/comply-v2/trade/origin-determination/registry.ts`
- Create: `src/lib/comply-v2/trade/origin-determination/<eu|uk|us|ch|no|ca|au|kr|jp|in>.ts` (+ je `.test.ts`)
- Create: `src/lib/comply-v2/trade/origin-determination/eu-member-nca.ts` (Mitgliedstaat→NCA)
- Modify: `src/lib/comply-v2/trade/license-determination.ts` (Origin-Determination-Stufe nach den Hartverbots-Gates; Gate 4.5 wird Fallback)
- Modify: `src/data/trade/normalized-corpus.ts` (REGIME_MATURITY 3→2 je gebautem Origin)
- Modify: `src/lib/comply-v2/trade/classification/golden-set/golden-set.test.ts` (origin-spezifische Verdicts) + `space-items.ts` falls neue Fälle
- Modify: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx` (Lizenz-Detail in der assessedUnder-Zeile)

## 7. Teststrategie

- **Pro-Modul-Unit-Tests:** General-Lizenz-Eligibility (Item×Ziel trifft/trifft-nicht → GO-unter-Lizenz vs. REVIEW), Ausschluss-Ziele, Ermessens-Fälle → REVIEW.
- **Golden-Matrix:** origin-spezifische erwartete Verdicts; die Verteilung verschiebt sich bewusst (Thin-REVIEW → präzise); jede Verschiebung dokumentiert, keine Zelle loosened ohne Rechtsgrund; fail-closed-Invariante (kein false-CLEARED) bleibt hart.
- **Regression:** US-Wrap verhaltensidentisch (Snapshot der bestehenden Determination-Outputs vor/nach); EU/DE-Bestandsverhalten unverändert wo kein Modul-Pfad greift.
- **W6 pro Modul:** unabhängiger Agent verifiziert jede General-Lizenz + Eligibility gegen die amtliche Quelle (wie S1–S6), bevor die Maturity gehoben wird.
- tsc-Baseline (674) nicht verschlechtern; jede Rechtsaussage zitiert.

## 8. Implementierungs-Phasen (Detail im Plan)

1. **Foundation:** types + registry + Verdrahtungs-Stufe in `determineLicenseRequirements` + **US-Wrap** (Architektur-Beweis am reifsten Bestand, verhaltensidentisch) + Golden-Harness-Erweiterung für origin-spezifische Verdicts. Maturity noch nicht gehoben.
2. **Fan-out (je Modul: bauen → W6 → Maturity-Lift → Golden):** EU → UK → CH/NO → CA/AU/JP/KR/IN.
3. **Wrap:** Score-Re-Assessment (Ziel 100/100 nach §9), Doku/Board.

## 9. Definition of Done — „100/100" (messbar)

1. Alle ~10 Origin-Module gebaut, je unabhängig W6-quellenverifiziert.
2. Jede Golden-Matrix-Zelle (Item×Kreis-A-Origin×Ziel) liefert das rechtlich korrekte Verdict mit Zitat; **kein false-CLEARED** (fail-closed-Invariante hält).
3. Alle Kreis-A-`REGIME_MATURITY` 3→2 gehoben.
4. General-Lizenz-Logik überall, wo die amtliche Quelle sie klar trägt; ehrliches REVIEW bei echtem Ermessen.
5. US-Wrap verhaltensidentisch (Snapshot-bewiesen); EU/DE-Bestand unverändert.
6. Null externe Kosten (keine neuen Deps/Feeds/AI-Runtime-Calls — grep-/Review-belegt); keine Migration.
7. AVA zeigt das Lizenz-Detail; Boards/Docs aktuell; Score-Re-Assessment dokumentiert 100/100 an dieser Rubrik.

## 10. Risiken & Mitigationen

| Risiko                                                    | Mitigation                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Falsche General-Lizenz-Eligibility (false-CLEARED-Quelle) | W6 pro Modul, Zitat je Lizenz, Ermessen→REVIEW-Default, Golden-fail-closed-Invariante                |
| US-Wrap ändert Verhalten                                  | Snapshot der Determination-Outputs vor/nach dem Refactor; bit-identisch erforderlich                 |
| Origin-Modul überstimmt ein Embargo                       | Gates 0/1.5/1.6/2 laufen vor dem Modul; Modul ist tightening-only; Test pinnt „Embargo schlägt OGEL" |
| General-Lizenz-Daten veralten                             | `asOfDate`/`citation` je Lizenz; in den S7-Frische-Audit aufnehmen                                   |
| Scope-Kriechen (Import-Kontrollen, Nicht-Kreis-A)         | Nicht-Ziele §3 verbindlich                                                                           |

## 11. Offene Punkte

- KR/JP General-Lizenz-Texte amtlich-englisch teils begrenzt → wo nicht verifizierbar, ehrliches REVIEW + `excluded`-Deklaration (wie S6).
- PF-2 (`resolveOrderOfReview` toter Code): bei der Verdrahtung prüfen, ob die neue Origin-Stufe ihn sinnvoll konsumiert oder er endgültig entfernt wird.
- Reihenfolge der destinations- vs. origin-Logik wird bei der Foundation gegen die reale Gate-Kette final verifiziert (Read-then-wire).
