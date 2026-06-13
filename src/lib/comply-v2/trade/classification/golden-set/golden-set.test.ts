/**
 * GOLDEN SET — Matrix-Harness (Spec 2026-06-12 §4.4, S0-Akzeptanz-Artefakt).
 *
 * Diese Datei IST die Verifikation der 12 Referenz-Items (`space-items.ts`):
 * sie fährt jedes Item durch die ECHTE reine Pipeline über die volle
 * Origin×Destination-Matrix und prüft Mindest-Strenge-Böden + Fail-Closed-
 * Invarianten. Sie ist die Regressions-Messlatte, gegen die jeder Daten-
 * Sprint (S1–S6) läuft: präzisere Daten dürfen Böden anheben, nie absenken.
 *
 * ─── Was diese Matrix prüft (Orakel = AVAs ECHTES Zeilen-Verdict) ─────────
 * Pro Zelle (Item × Origin × Dest) bauen wir dieselbe Aufruf-Kette wie eine
 * AVA-Operationszeile, NUR ohne Prisma (alles hier ist rein), UND laufen durch
 * AVAs echten Verdict-Orakel `deriveVerdict` — NICHT durch ein direktes
 * gate→verdict-Mapping (das war der alte blinde Fleck):
 *   1. originRegimes(originIso)  → OriginRegimeRouting (Sitz → Ausfuhrrecht)
 *   2. classifyItemForOperation(item, { destinationCountry, exporterOrigin })
 *      — exporterOrigin wird (wie in der Server-Quelle) NUR für unterstützte
 *        Sitze durchgereicht; für circle-A sind ALLE Origins supported, also
 *        immer gesetzt. classifyItemForOperation ruft intern
 *        determineLicenseRequirements inkl. Gate 4.5 (Thin-Origin) auf.
 *   3. das Ergebnis wird als `LineAssessment` (classified=true) verpackt und
 *      zusammen mit einem SYNTHETISCHEN all-CLEAR-Screening an
 *      `deriveVerdict(lines, screening)` gereicht → Verdict (GO|REVIEW|BLOCKED).
 *
 * Diese Schicht = "AVA-Zeilen-Verdict mit synthetischem CLEAR-Screening". Die
 * Matrix ist BEWUSST partei-los (rein item×origin×dest, keine Gegenpartei-
 * Dimension) — das synthetische CLEAR isoliert genau das Zeilen-Verdict.
 *
 * ─── Warum NICHT bloss gate→verdict (der geschlossene blinde Fleck) ───────
 * Früher mappte die Matrix `gate` direkt (CLEARED→GO, REVIEW_NEEDED→REVIEW,
 * BLOCKED→BLOCKED). Das ließ AVAs `hardBlock()` aus, das ZUSÄTZLICH zum Gate
 * auf `itarBlock || embargoBlock || annexIVBlock || mtcrCatIBlock` sperrt.
 * Folge: 186 Zellen divergierten (AVA BLOCKED, Harness nur REVIEW) — die
 * heuristik-ITAR-Items (eo-sar, eo-optical, hall-thruster), deren Block über
 * `itarBlock` (nicht über das Gate) kommt. Jetzt nutzt die Matrix dasselbe
 * Orakel wie der Server; die Divergenz ist geschlossen.
 *
 * ─── Verteilung (ECHT, über `deriveVerdict`) ─────────────────────────────
 *   744 Zellen: 74 GO / 396 REVIEW / 274 BLOCKED.
 *   Zwei DISJUNKTE Block-Quellen:
 *   (a) AVAs konservatives `hardBlock()` über heuristik-getriebenes
 *       `itarBlock` (eo-sar/eo-optical/hall-thruster) — destinations-
 *       UNABHÄNGIG, über die GANZE Matrix verteilt (auch INTRA_EU/US/
 *       FRIENDLY/IN): 186 Zellen.
 *   (b) NEU (PF-1): Gate 1.6 — das destinations-getriebene RU/BY-Dual-Use-
 *       Verbot (Art. 2/2a VO (EU) 833/2014 · Art. 1e/1f VO (EG) 765/2006).
 *       Es hebt die RU-Spalte für kontrollierte Dual-Use-Items von REVIEW
 *       auf BLOCKED: +88 Zellen (RU-Spalte jetzt 11 GO / 0 REVIEW / 121
 *       BLOCKED; die 11 GO sind reaction-wheel = unkontrolliert).
 *   Daher 186 → 274 BLOCKED und 484 → 396 REVIEW; GO unverändert 74.
 *   Belegt per Spike vor Commit.
 *
 * ─── Rechts-Erkenntnis: RU/BY-Dual-Use ist BLOCKED, nicht REVIEW (PF-1) ───
 * FRÜHER dokumentierte dieser Header, RU-Dual-Use sei über die party-lose
 * Pipeline rechtlich nur REVIEW, weil die einzige 833/2014-Hartsperre Gate 0
 * (Annex IV, GEGENPARTEI-getrieben) war. Das war der PF-1-Befund: KEINE
 * Schicht setzte das DESTINATIONS-getriebene Verbot durch.
 *
 * Gate 1.6 (`license-determination.ts`, Task 9b) schließt diese Lücke: das
 * Verbot der Ausfuhr von EU-Dual-Use-Gütern (Anhang I VO 2021/821) nach
 * Russland/Belarus nach Art. 2/2a VO (EU) 833/2014 bzw. Art. 1e/1f VO (EG)
 * 765/2006 ist DESTINATIONS-basiert — es braucht KEINEN gelisteten Empfänger.
 * Es feuert auf das EU-Dual-Use-Signal (deklarierter eccnEU/eccnUS≠EAR99 ODER
 * heuristisches EU_ANNEX_I/US_CCL-Signal) und setzt `embargoBlock=true` →
 * AVAs `hardBlock()` → BLOCKED. (RU/BY sind weiterhin NICHT in
 * EMBARGOED_COUNTRIES = {CU,IR,KP,SY}; das eigenständige Gate 1.6, nicht die
 * E:1/E:2-Embargo-Liste, erzeugt den Block.)
 *
 * Folglich sind die EXACT-Pins sat-bus|DE|RU, apogee-engine|DE|RU und
 * sat-bus|GB|RU (all-origins-Scope) jetzt rechtlich eindeutig BLOCKED — sie
 * stehen unten in `EXACT` mit Quellen-Kommentar.
 *
 * GRENZE (ehrlich): rein USML/ITAR-Items (nur usmlCategory) lösen Gate 1.6
 * NICHT aus (US-Recht; `itarBlock` deckt sie separat). Und ein GENUIN
 * unkontrolliertes Item (reaction-wheel) bleibt nach RU korrekt GO — kein
 * Über-Blocken. Die Art-2a/1f-Advanced-Tech-Sperre ist nur insoweit
 * abgedeckt, wie das EU-Dual-Use-Signal greift (Annex-VII/XXIII/XXIX-
 * Güterklassen ohne itemClass-Signal: S1+).
 *
 * ─── Boden-Anpassung: CN/EMBARGO nur für kontrollverdächtige Items ────────
 * Beobachtung (Spike): ein GENUIN unkontrolliertes Item (reaction-wheel: kein
 * deklarierter Code, keine Heuristik) liefert nach CN UND RU aus JEDEM Origin
 * GO — das ist rechtlich korrekt (ein unkontrolliertes Drallrad braucht keine
 * Genehmigung). MIN_BY_DEST_CLASS gilt laut Spec für ALLE Items; ein
 * Zwangs-REVIEW für ein unkontrolliertes Item nach CN wäre also der falsche
 * Boden, nicht ein Code-Fehler. Konsequenz (dokumentierte Anpassung): die
 * CN- und EMBARGO-Böden gelten NUR für kontrollverdächtige Items
 * (`itemLooksControlled` = hat deklarierte Codes). Für INTRA_EU/US/FRIENDLY/IN
 * ist der Boden GO (kein Zwang) ohnehin für alle Items. Diese Verschärfung-nur-
 * für-Kontrollverdacht ist exakt der vom Plan vorgesehene Boden-Fix.
 */

import { describe, expect, it } from "vitest";
import { GOLDEN_ITEMS, type GoldenItem } from "./space-items";
import { originRegimes } from "../origin-regime-map";
import {
  classifyItemForOperation,
  type ClassifiableItem,
} from "@/lib/trade/classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
} from "@/lib/trade/operation-assistant-verdict";
import { LIST_ID_TO_CORPUS_REGIME } from "@/lib/comply-v2/trade/license-determination";
import { REGIME_MATURITY } from "@/data/trade/normalized-corpus";

// ─── Matrix-Achsen (aus dem Plan §4.4) ────────────────────────────────────

const ORIGINS = [
  "DE",
  "FR",
  "GB",
  "US",
  "CH",
  "NO",
  "CA",
  "JP",
  "AU",
  "KR",
  "IN",
] as const;

const DESTS = [
  { iso: "DE", cls: "INTRA_EU" },
  { iso: "US", cls: "US" },
  { iso: "JP", cls: "FRIENDLY" },
  { iso: "IN", cls: "IN" },
  { iso: "CN", cls: "CN" },
  { iso: "RU", cls: "EMBARGO" },
] as const;

type DestClass = (typeof DESTS)[number]["cls"];
type Verdict = "GO" | "REVIEW" | "BLOCKED";

/** Severity-Ordnung: GO < REVIEW < BLOCKED. */
const SEV = { GO: 0, REVIEW: 1, BLOCKED: 2 } as const;

/**
 * Mindest-Strenge je Dest-Klasse (ein BODEN, den das Verdict erreichen MUSS
 * — "mindestens", GO = kein Boden). Die CN/EMBARGO-Böden REVIEW gelten nur
 * für kontrollverdächtige Items (siehe Header + `itemLooksControlled`); für
 * unkontrollierte Items ist GO dort rechtlich korrekt.
 */
const MIN_BY_DEST_CLASS: Record<DestClass, Verdict> = {
  INTRA_EU: "GO",
  US: "GO",
  FRIENDLY: "GO",
  IN: "GO",
  CN: "REVIEW", // kontrollierte Space-Güter nach CN: nie stilles GO
  // EMBARGO (RU): mindestens REVIEW. Seit Gate 1.6 (PF-1) blockt RU für
  // kontrollierte EU-Dual-Use-Items destinations-getrieben HART (Art. 2/2a
  // VO (EU) 833/2014) — die EXACT-Pins fixieren das für konkrete Zellen. Der
  // Boden bleibt bewusst REVIEW (sicheres Minimum): er gilt für ALLE
  // kontrollverdächtigen Items, auch solche, deren EU-Dual-Use-Signal über
  // die party-lose Matrix nicht eindeutig BLOCKED erzwingt.
  EMBARGO: "REVIEW",
};

/**
 * EXACT-Erwartungen: NUR wo der Rechtstext über DIESE reine Pipeline
 * eindeutig ist.
 *
 * PF-1 (S0): Gate 1.6 (`license-determination.ts`) macht das destinations-
 * getriebene RU/BY-Dual-Use-Verbot nun OHNE Gegenpartei-Treffer geltend —
 * exakt das Gate, dessen Fehlen dieser Header früher dokumentierte. Damit
 * sind die folgenden drei Zellen über die reine Pipeline rechtlich eindeutig
 * BLOCKED:
 *
 * Rechtsgrundlage (verbatim instruments):
 *   • sat-bus|DE|RU / apogee-engine|DE|RU: Ausfuhr von EU-Dual-Use-Gütern
 *     (Anhang I VO 2021/821 — sat-bus = 9A004, apogee-engine = 9A106) nach
 *     Russland ist nach Art. 2/2a Council Reg. (EU) 833/2014 (i.d.g.F.)
 *     verboten — kein Genehmigungsweg, kein gelisteter Empfänger nötig.
 *   • sat-bus|GB|RU: dasselbe Verbot greift origin-unabhängig (Scope-
 *     Entscheidung Gate 1.6: Über-Blocken akzeptabel; UK/US haben äquivalente
 *     RU-Dual-Use-Verbote). Pins the all-origins scope.
 */
const EXACT: Record<string, Verdict> = {
  "sat-bus|DE|RU": "BLOCKED", // 9A004 (Anhang I VO 2021/821) → RU: Art. 2 VO (EU) 833/2014
  "apogee-engine|DE|RU": "BLOCKED", // 9A106 (Anhang I VO 2021/821) → RU: Art. 2 VO (EU) 833/2014
  "sat-bus|GB|RU": "BLOCKED", // origin-unabhängig (Gate-1.6-Scope) → RU: Art. 2 VO (EU) 833/2014

  // ── M-EU (Engine-Origin-Determination §4.3): EU-Origin EUGEA-Verdicts ──────
  //
  // Für EU-Sitze (DE/FR) bestimmt das EU-Modul (`origin-determination/eu.ts`)
  // die echte Lizenz-Antwort nach VO (EU) 2021/821 + Annex II EUGEA. Die
  // generische Gate-3.5-BAFA-REVIEW wird durch das Modul-Verdict ersetzt
  // (supersede), wo eine Union-Allgemeingenehmigung greift. Quelle je Zelle:
  //
  // (a) GO unter EU001 — EU001-fähiges (NICHT auf Annex II Section I gelistetes)
  //     Dual-Use-Gut an eine EU001-Bestimmung (US/JP unter den Matrix-Zielen;
  //     EU001-Set = AU/CA/IS/JP/NZ/NO/CH/LI/GB/US). Belegt:
  //     Reg (EU) 2021/821 Annex II EU001 Part 1 (Items: alle Annex-I-Einträge
  //     außer Section I) + Part 2 (Destinations). Section-I-Prüfung in eu.ts.
  //       • 7A004 (star-tracker), 5A002 (ground-tt-c), 9D001 (flight-sw),
  //         1C010 (prepreg) — keiner auf Section I → EU001 greift.
  "star-tracker|DE|US": "GO", // 7A004 → US: EU001 (Annex II EU001 Part 1+2)
  "star-tracker|DE|JP": "GO", // 7A004 → JP: EU001
  "star-tracker|FR|US": "GO", // 7A004 → US: EU001 (FR-Sitz, NCA SBDU)
  "star-tracker|FR|JP": "GO", // 7A004 → JP: EU001
  "ground-tt-c|DE|US": "GO", // 5A002 → US: EU001 (Krypto, nicht Section I)
  "ground-tt-c|DE|JP": "GO", // 5A002 → JP: EU001
  "ground-tt-c|FR|US": "GO", // 5A002 → US: EU001
  "ground-tt-c|FR|JP": "GO", // 5A002 → JP: EU001
  "flight-sw|DE|US": "GO", // 9D001 → US: EU001 (Entwicklungs-SW, nicht 9D101-104)
  "flight-sw|DE|JP": "GO", // 9D001 → JP: EU001
  "flight-sw|FR|US": "GO", // 9D001 → US: EU001
  "flight-sw|FR|JP": "GO", // 9D001 → JP: EU001
  "prepreg|DE|US": "GO", // 1C010 → US: EU001 (Faserstoff, nicht 1C001/1C012/1C350+)
  "prepreg|DE|JP": "GO", // 1C010 → JP: EU001
  "prepreg|FR|US": "GO", // 1C010 → US: EU001
  "prepreg|FR|JP": "GO", // 1C010 → JP: EU001
  //
  // (b) REVIEW-Einzelantrag bei der NCA — EU001-fähiges Gut an ein NICHT-EU001-
  //     Ziel (IN ist NICHT EU001) → keine Allgemeingenehmigung greift, also
  //     Einzelausfuhrgenehmigung. Belegt: EU001 Part 2 (IN nicht gelistet).
  "star-tracker|DE|IN": "REVIEW", // 7A004 → IN: kein EU001-Ziel → Einzelantrag NCA
  "ground-tt-c|DE|IN": "REVIEW", // 5A002 → IN: kein EU001-Ziel → Einzelantrag NCA
  "flight-sw|DE|IN": "REVIEW", // 9D001 → IN: kein EU001-Ziel → Einzelantrag NCA
  "prepreg|DE|IN": "REVIEW", // 1C010 → IN: kein EU001-Ziel → Einzelantrag NCA
  //
  // (c) FAIL-CLOSED (§4.5, kein false-CLEARED): Annex-II-Section-I-Ausschluss ist
  //     von EU001 NICHT gedeckt → REVIEW selbst an ein EU001-Ziel. Section I
  //     (Art. 12(6)(a), OJ L 206 p. 443) = "alle in Anhang IV genannten Güter"
  //     + 13 explizite Codes. 9A004 (space launch vehicles) UND 9A106.c (thrust-
  //     vector control) stehen BEIDE in Anhang IV (Teil I, MTCR-Technik, OJ L 206
  //     p. 451-452) → über die Anhang-IV-Klausel von EU001 ausgeschlossen. Die
  //     M-EU-Korrektur 2026-06-13 (exakte 2021/821-Section-I-Liste statt der
  //     stale 42-Präfix-428/2009-Liste) LOCKERT diese beiden NICHT — der REVIEW
  //     bleibt fail-closed, jetzt auf der korrekten Anhang-IV-Rechtsgrundlage.
  //     Belegt: Reg (EU) 2021/821 Annex II Section I + Annex IV (eu.ts).
  "sat-bus|DE|US": "REVIEW", // 9A004 (Anhang IV) → US: KEIN EU001 → Einzelantrag NCA
  "sat-bus|DE|JP": "REVIEW", // 9A004 (Anhang IV) → JP: KEIN EU001
  "apogee-engine|DE|US": "REVIEW", // 9A106(.c) (Anhang IV, MTCR) → US: KEIN EU001
  "apogee-engine|DE|JP": "REVIEW", // 9A106(.c) (Anhang IV, MTCR) → JP: KEIN EU001
  //
  // (d) Innergemeinschaftlich bleibt GO — EU-Dual-Use (außer Annex IV) bewegt
  //     sich frei im Unionszollgebiet; keine Ausfuhrgenehmigung. Belegt:
  //     Reg (EU) 2021/821 (Ausfuhr = Verbringung AUS dem Zollgebiet).
  "star-tracker|FR|DE": "GO", // 7A004, FR→DE innergemeinschaftlich → frei
  "sat-bus|FR|DE": "GO", // 9A004 (nicht Annex IV) FR→DE innergemeinschaftlich → frei
  //
  // (e) SAFETY-PIN (§4.3/§4.5): das EU-Modul-GO überstimmt NIE ein vorgelagertes
  //     Hartverbot. Ein EU001-FÄHIGES Gut (5A002, NICHT Section I) aus DE nach
  //     RU bleibt BLOCKED — Gate 1.6 (Art. 2/2a VO (EU) 833/2014) feuert VOR dem
  //     Origin-Modul, das Modul wird übersprungen. Belegt das load-bearing
  //     Override (kein EU001 nach RU, kein false-CLEARED über ein Embargo).
  "ground-tt-c|DE|RU": "BLOCKED", // 5A002 (EU001-fähig) → RU: Gate 1.6 schlägt EU001
  "star-tracker|DE|RU": "BLOCKED", // 7A004 (EU001-fähig) → RU: Gate 1.6 schlägt EU001

  // ── M-UK (Engine-Origin-Determination §4.3): GB-Origin OGEL/SIEL-Verdicts ──
  //
  // Für einen GB-Sitz bestimmt das UK-Modul (`origin-determination/uk.ts`) die
  // echte Lizenz-Antwort: post-Brexit ist ein UK→EU-Dual-Use-Transfer
  // lizenzpflichtig (KEIN intra-EU-Freiverkehr mehr) und wird über die OGEL
  // „Export of Dual-Use items to EU Member States" (ECJU) bzw. — wo keine OGEL
  // greift — über eine SIEL (Standard Individual Export Licence) abgewickelt.
  // Quelle je Zelle: gov.uk OGEL-Text (16 Dez 2025) Schedule 1 (Annex I außer
  // Annex IIg) + Schedule 2 (EU-Mitgliedstaaten + Kanalinseln + Island);
  // Annex IIg = retained Reg (EC) 428/2009 Annex IIg (legislation.gov.uk).
  //
  // (f) GO unter der OGEL — OGEL-fähiges (NICHT auf Annex IIg) Dual-Use-Gut an
  //     einen OGEL-Schedule-2-EU-Mitgliedstaat (DE). Die OGEL ist deutlich
  //     SCHMALER als EU001: sie deckt NUR EU-Mitgliedstaaten/Kanalinseln/Island,
  //     NICHT die nahen Verbündeten (US/JP/…). Daher greift sie für GB→DE, aber
  //     NICHT für GB→US/JP. Belegt: OGEL Schedule 1+2.
  "star-tracker|GB|DE": "GO", // 7A004 GB→DE: OGEL (nicht Annex IIg, DE in Schedule 2)
  "ground-tt-c|GB|DE": "GO", // 5A002 GB→DE: OGEL
  "flight-sw|GB|DE": "GO", // 9D001 GB→DE: OGEL (Entwicklungs-SW, nicht 9D101-104)
  "prepreg|GB|DE": "GO", // 1C010 GB→DE: OGEL (Faserstoff, nicht Annex IIg)
  //
  // (g) SIEL-REVIEW — kein OGEL-Ziel (US/JP/IN/CN sind NICHT in OGEL Schedule 2;
  //     es gibt KEINE UK-OGEL für die nahen Verbündeten) → Einzelausfuhr-
  //     genehmigung (SIEL) bei der ECJU. Belegt: gov.uk OGEL-Sammlung (keine
  //     allgemeine Dual-Use-OGEL für US/JP/…).
  "star-tracker|GB|US": "REVIEW", // 7A004 GB→US: kein UK-OGEL-Ziel → SIEL
  "ground-tt-c|GB|JP": "REVIEW", // 5A002 GB→JP: kein UK-OGEL-Ziel → SIEL
  //
  // (h) FAIL-CLOSED (§4.5, kein false-CLEARED): Annex-IIg-Ausschluss ist von
  //     KEINER UK-OGEL gedeckt → SIEL/REVIEW selbst an einen EU-Mitgliedstaat.
  //     Annex IIg = „alle in Annex IV genannten Güter" + 13 explizite Codes.
  //     9A004 (space launch vehicles) UND 9A106.c (thrust-vector control) stehen
  //     BEIDE in Annex IV (legislation.gov.uk/eur/2009/428/annex/IV) → über die
  //     Annex-IV-Klausel der OGEL ausgeschlossen.
  //
  //     S3-GEFAHREN-PIN, REFRAMED (M-UK 2026-06-13): sat-bus|GB|DE MUSS REVIEW
  //     bleiben. FRÜHER (vor M-UK) kam dieser REVIEW aus Gate 4.5 (Thin-Origin,
  //     UK_STRATEGIC REGIME_MATURITY 3) und der Pin sperrte einen VERFRÜHTEN
  //     Maturity-Lift, der die Zelle still auf GO hätte kippen lassen. JETZT
  //     EXISTIERT das UK-Modul: REGIME_MATURITY UK_STRATEGIC ist 2, Gate 4.5
  //     feuert für GB nicht mehr — der REVIEW kommt nun aus dem UK-MODUL selbst,
  //     das für 9A004 (Annex IV → Annex IIg) eine SIEL bei der ECJU zurückgibt
  //     (KEINE OGEL, kein false-CLEARED). Der Pin verifiziert damit jetzt das
  //     korrekte UK-Modul-Verdict statt eine Lift-Sperre. Vgl. den
  //     REGIME_MATURITY-Kommentarblock in `normalized-corpus.ts`.
  "sat-bus|GB|DE": "REVIEW", // 9A004 (Annex IV → Annex IIg) GB→DE: UK-Modul → SIEL
  "apogee-engine|GB|DE": "REVIEW", // 9A106 (Annex IV) GB→DE: UK-Modul → SIEL
  "sat-bus|GB|US": "REVIEW", // 9A004 GB→US: Annex IIg UND kein OGEL-Ziel → SIEL

  // ── M-CH (Engine-Origin-Determination §4.3): CH-Origin OGB/Einzelbewilligung ─
  //
  // Für einen CH-Sitz bestimmt das CH-Modul (`origin-determination/ch.ts`) die
  // echte Lizenz-Antwort nach der Güterkontrollverordnung (GKV, SR 946.202.1,
  // Stand 1. Juni 2024), administriert vom SECO. Switzerland ist NICHT EU/EEA-
  // Mitglied; ein CH-Dual-Use-Export braucht eine eigene schweizerische
  // Bewilligung. Die OGB (ordentliche Generalausfuhrbewilligung, Art. 12) deckt
  // Anhang-2-Teil-2-Dual-Use-Güter nach den Anhang-7-PARTNERSTAATEN; sonst eine
  // Einzelausfuhrbewilligung (eine AGB nach Art. 13 ist exporteur-spezifisch).
  // Anhang 7 (verbatim, Stand 2024-06-01) enthält u. a. DE/US/JP/GB/NO/CA/AU/KR
  // — NICHT IN/CN (und die 11-Staaten-Erweiterung ab 1. Juli 2026 ist NICHT
  // modelliert, fail-closed auf die in-Kraft-Liste).
  //
  // (i) GO unter der OGB — OGB-fähiges (NICHT sensibles) Dual-Use-Gut an einen
  //     Anhang-7-Partnerstaat. Anders als die EU/UK-OGEL deckt die OGB AUCH die
  //     nahen Verbündeten US/JP (beide auf Anhang 7) → GO für CH→DE, CH→US,
  //     CH→JP. Belegt: GKV Art. 12(1) + Anhang 7 (fedlex XML).
  "star-tracker|CH|DE": "GO", // 7A004 CH→DE: OGB (nicht sensibel, DE auf Anhang 7)
  "star-tracker|CH|US": "GO", // 7A004 CH→US: OGB (US auf Anhang 7)
  "star-tracker|CH|JP": "GO", // 7A004 CH→JP: OGB (JP auf Anhang 7)
  "ground-tt-c|CH|DE": "GO", // 5A002 CH→DE: OGB (Krypto, nicht sensibel)
  "ground-tt-c|CH|US": "GO", // 5A002 CH→US: OGB
  "ground-tt-c|CH|JP": "GO", // 5A002 CH→JP: OGB
  "flight-sw|CH|DE": "GO", // 9D001 CH→DE: OGB (Entwicklungs-SW, nicht 9D101-104)
  "flight-sw|CH|US": "GO", // 9D001 CH→US: OGB
  "flight-sw|CH|JP": "GO", // 9D001 CH→JP: OGB
  "prepreg|CH|DE": "GO", // 1C010 CH→DE: OGB (Faserstoff, nicht sensibel)
  "prepreg|CH|US": "GO", // 1C010 CH→US: OGB
  "prepreg|CH|JP": "GO", // 1C010 CH→JP: OGB
  //
  // (j) Einzelbewilligung-REVIEW — kein Anhang-7-Partnerstaat (IN/CN sind NICHT
  //     auf Anhang 7) → die OGB greift nicht; die AGB (Art. 13) ist exporteur-
  //     spezifisch und hier nicht automatisch erteilbar → Einzelausfuhr-
  //     bewilligung beim SECO. Belegt: GKV Art. 12 (Anhang 7) + Art. 13.
  "star-tracker|CH|IN": "REVIEW", // 7A004 CH→IN: kein Anhang-7-Ziel → Einzelbewilligung
  "ground-tt-c|CH|CN": "REVIEW", // 5A002 CH→CN: kein Anhang-7-Ziel → Einzelbewilligung
  //
  // (k) FAIL-CLOSED (§4.5, kein false-CLEARED): besonders sensible MTCR/Anhang-
  //     IV-äquivalente Güter sind von der OGB NICHT bestätigbar gedeckt → REVIEW
  //     selbst an einen Partnerstaat. Die GKV führt KEINEN geschriebenen
  //     Ausschluss-Katalog (anders als EU Section I / UK Annex IIg); die Schweiz
  //     transponiert dieselben Wassenaar/MTCR/NSG/AG-Listen, daher fail-closed
  //     auf demselben verifizierten Sensibel-Set (9A004 space launch vehicles,
  //     9A106.c thrust-vector control). Belegt: GKV Art. 12 + Reg (EU) 2021/821
  //     Annex IV (das Sicherheits-Floor, ch.ts).
  "sat-bus|CH|DE": "REVIEW", // 9A004 (MTCR/Anhang-IV-äquiv) CH→DE: CH-Modul → Einzelbewilligung
  "apogee-engine|CH|DE": "REVIEW", // 9A106 (MTCR) CH→DE: CH-Modul → Einzelbewilligung
  "sat-bus|CH|US": "REVIEW", // 9A004 CH→US: sensibel UND kein Floor-GO → Einzelbewilligung
  //
  // (l) radhard-obc|CH (eccnUS 3A001.a.1): bleibt REVIEW — die OGB deckt zwar das
  //     CH-Bein (3A001 ist NICHT sensibel), aber 3A001.a.1 ist ein US-ECCN mit
  //     unabhängigem US/BIS-Bein. Das CH-Modul übersteuert NIE ein US/BIS-Bein.
  "radhard-obc|CH|DE": "REVIEW", // 3A001.a.1 CH→DE: US/BIS-Bein bleibt → REVIEW
  //
  // (m) SAFETY-PIN (§4.3/§4.5): das CH-Modul-GO überstimmt NIE ein vorgelagertes
  //     Hartverbot. Ein OGB-FÄHIGES Gut (5A002) aus CH nach RU bleibt BLOCKED —
  //     Gate 1.6 (Art. 2/2a VO (EU) 833/2014, von der Schweiz übernommen) feuert
  //     VOR dem Origin-Modul, das Modul wird übersprungen.
  "ground-tt-c|CH|RU": "BLOCKED", // 5A002 (OGB-fähig) → RU: Gate 1.6 schlägt OGB
  "sat-bus|CH|RU": "BLOCKED", // 9A004 → RU: Gate 1.6 (origin-unabhängig)

  // ── FAN-OUT (Engine-Origin-Determination §4.3): NO/CA/AU/JP/KR/IN ────────────
  //
  // Die letzten sechs circle-A-Origins erhalten je ein eigenes Origin-Modul
  // (`origin-determination/{no,ca,au,jp,kr,in}.ts`). REGIME_MATURITY der sechs
  // ist auf 2 gehoben — Gate 4.5 (Thin-Origin-REVIEW) feuert für KEINEN circle-A-
  // Sitz mehr. Daher sind die untenstehenden EXPLIZITEN Pins das Sicherheitsnetz,
  // das früher Gate 4.5 + der Thin-Origin-Invariant-Test waren: JEDE sensible
  // Zelle (sat-bus 9A004 / apogee-engine 9A106 × jedes der sechs Origins) wird
  // hier explizit auf REVIEW (bzw. BLOCKED nach RU) festgeschrieben, sodass ein
  // versehentliches false-CLEARED auf MTCR-/Anhang-IV-Trägerraketen-Technik
  // sofort als Test-Failure auffällt.
  //
  // ── (n) NORWAY (NO_LIST → noOriginModule) ──────────────────────────────────
  // Norwegen hat KEINE auf Code×Ziel selbst-ausführende Dual-Use-General-/Sammel-
  // genehmigung (verifizierter DEKSA/MFA-Befund — NO_GENERAL_LICENCES leer). Jedes
  // kontrollierte Liste-II-Gut ist eine individuelle MFA-Genehmigung → REVIEW; das
  // einzige GO ist das genuin unkontrollierte reaction-wheel. Sensible Codes
  // (9A004/9A106) fail-closen. Quelle: FOR-2013-06-19-718 Liste II + DEKSA.
  "sat-bus|NO|DE": "REVIEW", // 9A004 (sensibel) NO→DE: Einzel-MFA-Genehmigung
  "sat-bus|NO|US": "REVIEW", // 9A004 NO→US: kein GO (keine NO-General-Lizenz)
  "sat-bus|NO|JP": "REVIEW", // 9A004 NO→JP
  "sat-bus|NO|IN": "REVIEW", // 9A004 NO→IN
  "sat-bus|NO|CN": "REVIEW", // 9A004 NO→CN
  "sat-bus|NO|RU": "BLOCKED", // 9A004 NO→RU: Gate 1.6 (Norwegen EU-aligned)
  "apogee-engine|NO|DE": "REVIEW", // 9A106 (bare-parent fail-close) NO→DE
  "apogee-engine|NO|US": "REVIEW", // 9A106 NO→US
  "apogee-engine|NO|JP": "REVIEW", // 9A106 NO→JP
  "apogee-engine|NO|IN": "REVIEW", // 9A106 NO→IN
  "apogee-engine|NO|CN": "REVIEW", // 9A106 NO→CN
  "apogee-engine|NO|RU": "BLOCKED", // 9A106 NO→RU: Gate 1.6
  "star-tracker|NO|DE": "REVIEW", // 7A004 NO→DE: kein GO-Pfad (Einzel-MFA)
  "ground-tt-c|NO|US": "REVIEW", // 5A002 NO→US: kein GO (keine NO-General-Lizenz)
  "prepreg|NO|JP": "REVIEW", // 1C010 NO→JP: kein GO
  //
  // ── (o) CANADA (CA_ECL → caOriginModule) ───────────────────────────────────
  // ZWEI General-Permits: die US-Befreiung (CA→US für nicht-sensible ECL-Güter) +
  // GEP No. 41 (SOR/2015-200, nicht-sensibel, nicht-Krypto, an die s.2-Allierten-
  // Liste). Krypto (5A002) ist GEP-41-Schedule-13-ausgeschlossen → nur CA→US per
  // US-Befreiung GO, sonst REVIEW. Sensible ECL-Group-6/MTCR-Codes (9A004/9A106)
  // fail-closen AUCH in die USA. Quelle: Export Controls Handbook (US-Befreiung) +
  // GEP No. 41 SOR/2015-200.
  "star-tracker|CA|US": "GO", // 7A004 CA→US: US-Befreiung (nicht sensibel)
  "star-tracker|CA|DE": "GO", // 7A004 CA→DE: GEP No. 41 (DE in s.2-Liste)
  "star-tracker|CA|JP": "GO", // 7A004 CA→JP: GEP No. 41 (JP in s.2-Liste)
  "ground-tt-c|CA|US": "GO", // 5A002 CA→US: US-Befreiung ("no permit to the US" für Krypto)
  "ground-tt-c|CA|DE": "REVIEW", // 5A002 CA→DE: GEP-41-Schedule-13-ausgeschlossen (Krypto) → Einzelpermit
  "ground-tt-c|CA|JP": "REVIEW", // 5A002 CA→JP: Krypto Schedule-13 → Einzelpermit
  "flight-sw|CA|US": "GO", // 9D001 CA→US: US-Befreiung
  "flight-sw|CA|DE": "GO", // 9D001 CA→DE: GEP No. 41
  "flight-sw|CA|JP": "GO", // 9D001 CA→JP: GEP No. 41
  "prepreg|CA|US": "GO", // 1C010 CA→US: US-Befreiung
  "prepreg|CA|DE": "GO", // 1C010 CA→DE: GEP No. 41
  "prepreg|CA|JP": "GO", // 1C010 CA→JP: GEP No. 41
  "star-tracker|CA|IN": "REVIEW", // 7A004 CA→IN: weder US noch GEP-41-Ziel → Einzelpermit
  "star-tracker|CA|CN": "REVIEW", // 7A004 CA→CN: weder US noch GEP-41-Ziel → Einzelpermit
  "sat-bus|CA|US": "REVIEW", // 9A004 (sensibel, ECL Group 6 / nicht US-befreit) CA→US: fail-closed
  "sat-bus|CA|DE": "REVIEW", // 9A004 CA→DE: sensibel, GEP-41 s.3(2)(e) ≥300 km MTCR
  "sat-bus|CA|JP": "REVIEW", // 9A004 CA→JP: sensibel
  "sat-bus|CA|CN": "REVIEW", // 9A004 CA→CN
  "sat-bus|CA|RU": "BLOCKED", // 9A004 CA→RU: Gate 1.6 (Kanada SEMA)
  "apogee-engine|CA|US": "REVIEW", // 9A106 (bare-parent fail-close) CA→US: fail-closed auch in die USA
  "apogee-engine|CA|DE": "REVIEW", // 9A106 CA→DE
  "apogee-engine|CA|JP": "REVIEW", // 9A106 CA→JP
  "apogee-engine|CA|CN": "REVIEW", // 9A106 CA→CN
  "apogee-engine|CA|RU": "BLOCKED", // 9A106 CA→RU: Gate 1.6
  "radhard-obc|CA|DE": "REVIEW", // 3A001.a.1 CA→DE: US/BIS-Bein bleibt → REVIEW (CA-Modul übersteuert es nie)
  "ground-tt-c|CA|RU": "BLOCKED", // 5A002 CA→RU: Gate 1.6 schlägt jede CA-General-Lizenz
  //
  // ── (p) AUSTRALIA (AU_DSGL → auOriginModule) ───────────────────────────────
  // Australien hat KEINE auf Code×Ziel selbst-ausführende Dual-Use-General-Lizenz
  // (das AUKUS-„licence-free environment" ist registrierungs-/authorised-user-
  // gebunden, nicht item×destination — AU_GENERAL_LICENCES leer). Jedes
  // kontrollierte DSGL-Gut ist eine DEC-Genehmigung → REVIEW, AUCH AU→US (das
  // AUKUS-Env kippt 7A004/5A002/9D001/1C010 NICHT auf GO). Sensible Codes fail-
  // closen. Quelle: DSGL F2024L01024 + defence.gov.au licence-free-environment +
  // F2024L01100 (Excluded List).
  "sat-bus|AU|DE": "REVIEW", // 9A004 (sensibel) AU→DE
  "sat-bus|AU|US": "REVIEW", // 9A004 AU→US: kein AUKUS-GO (registrierungsgebunden)
  "sat-bus|AU|JP": "REVIEW", // 9A004 AU→JP
  "sat-bus|AU|IN": "REVIEW", // 9A004 AU→IN
  "sat-bus|AU|CN": "REVIEW", // 9A004 AU→CN
  "sat-bus|AU|RU": "BLOCKED", // 9A004 AU→RU: Gate 1.6 (Australien RU-Sanktionen)
  "apogee-engine|AU|DE": "REVIEW", // 9A106 (bare-parent fail-close) AU→DE
  "apogee-engine|AU|US": "REVIEW", // 9A106 AU→US
  "apogee-engine|AU|JP": "REVIEW", // 9A106 AU→JP
  "apogee-engine|AU|IN": "REVIEW", // 9A106 AU→IN
  "apogee-engine|AU|CN": "REVIEW", // 9A106 AU→CN
  "apogee-engine|AU|RU": "BLOCKED", // 9A106 AU→RU: Gate 1.6
  "star-tracker|AU|US": "REVIEW", // 7A004 AU→US: DEC-Permit, KEIN AUKUS-GO (Ehrlichkeits-Pin)
  "ground-tt-c|AU|DE": "REVIEW", // 5A002 AU→DE: DEC-Permit
  "flight-sw|AU|JP": "REVIEW", // 9D001 AU→JP: DEC-Permit
  //
  // ── (q) JAPAN (JP_METI → jpOriginModule) ───────────────────────────────────
  // EINE General-Lizenz: die General Bulk Export Licence (一般包括許可) an die
  // Group-A-Staaten (Export Trade Control Order Anlage 3, inkl. KR seit 2023) →
  // GENERAL/GO für nicht-sensible Dual-Use-Güter; sonst Einzel-METI-Lizenz. IN/CN
  // sind NICHT Group A → REVIEW. Sensible MTCR/Anhang-IV-Codes fail-closen auch an
  // Group A. Quelle: METI 2023-06-27 (Group A) + METI-Hub.
  "star-tracker|JP|DE": "GO", // 7A004 JP→DE: General Bulk (DE Group A)
  "star-tracker|JP|US": "GO", // 7A004 JP→US: General Bulk (US Group A)
  "ground-tt-c|JP|DE": "GO", // 5A002 JP→DE: General Bulk
  "ground-tt-c|JP|US": "GO", // 5A002 JP→US: General Bulk
  "flight-sw|JP|DE": "GO", // 9D001 JP→DE: General Bulk
  "flight-sw|JP|US": "GO", // 9D001 JP→US: General Bulk
  "prepreg|JP|DE": "GO", // 1C010 JP→DE: General Bulk
  "prepreg|JP|US": "GO", // 1C010 JP→US: General Bulk
  "star-tracker|JP|IN": "REVIEW", // 7A004 JP→IN: IN nicht Group A → Einzel-METI
  "star-tracker|JP|CN": "REVIEW", // 7A004 JP→CN: CN nicht Group A → Einzel-METI
  "sat-bus|JP|DE": "REVIEW", // 9A004 (sensibel) JP→DE: fail-closed auch an Group A
  "sat-bus|JP|US": "REVIEW", // 9A004 JP→US: fail-closed auch an Group A
  "sat-bus|JP|IN": "REVIEW", // 9A004 JP→IN
  "sat-bus|JP|CN": "REVIEW", // 9A004 JP→CN
  "sat-bus|JP|RU": "BLOCKED", // 9A004 JP→RU: Gate 1.6 (Japan RU-Sanktionen)
  "apogee-engine|JP|DE": "REVIEW", // 9A106 (bare-parent fail-close) JP→DE
  "apogee-engine|JP|US": "REVIEW", // 9A106 JP→US
  "apogee-engine|JP|IN": "REVIEW", // 9A106 JP→IN
  "apogee-engine|JP|CN": "REVIEW", // 9A106 JP→CN
  "apogee-engine|JP|RU": "BLOCKED", // 9A106 JP→RU: Gate 1.6
  "radhard-obc|JP|DE": "REVIEW", // 3A001.a.1 JP→DE: US/BIS-Bein bleibt → REVIEW
  "ground-tt-c|JP|RU": "BLOCKED", // 5A002 JP→RU: Gate 1.6 schlägt General Bulk
  //
  // ── (r) SOUTH KOREA (KR_STRATEGIC → krOriginModule) ────────────────────────
  // Korea hat KEINE auf Code×Ziel selbst-ausführende General-Lizenz (die
  // Comprehensive-/포괄수출허가 ist ein exporteur-spezifisches 자율준수무역거래자-
  // Vorrecht — KR_GENERAL_LICENCES leer). Jedes kontrollierte Strategie-Gut ist
  // eine individuelle MOTIE-Genehmigung → REVIEW; sensible Codes fail-closen mit
  // der MTCR-case-by-case-Quelle. Quelle: Public Notice on Trade of Strategic
  // Items + easylaw.go.kr Lizenztypen.
  "sat-bus|KR|DE": "REVIEW", // 9A004 (sensibel) KR→DE
  "sat-bus|KR|US": "REVIEW", // 9A004 KR→US
  "sat-bus|KR|JP": "REVIEW", // 9A004 KR→JP
  "sat-bus|KR|IN": "REVIEW", // 9A004 KR→IN
  "sat-bus|KR|CN": "REVIEW", // 9A004 KR→CN
  "sat-bus|KR|RU": "BLOCKED", // 9A004 KR→RU: Gate 1.6 (Korea Beinahe-Totalverbot)
  "apogee-engine|KR|DE": "REVIEW", // 9A106 (bare-parent fail-close) KR→DE
  "apogee-engine|KR|US": "REVIEW", // 9A106 KR→US
  "apogee-engine|KR|JP": "REVIEW", // 9A106 KR→JP
  "apogee-engine|KR|IN": "REVIEW", // 9A106 KR→IN
  "apogee-engine|KR|CN": "REVIEW", // 9A106 KR→CN
  "apogee-engine|KR|RU": "BLOCKED", // 9A106 KR→RU: Gate 1.6
  "star-tracker|KR|US": "REVIEW", // 7A004 KR→US: kein GO-Pfad (Einzel-MOTIE)
  "ground-tt-c|KR|JP": "REVIEW", // 5A002 KR→JP: Einzel-MOTIE
  "prepreg|KR|DE": "REVIEW", // 1C010 KR→DE: Einzel-MOTIE
  //
  // ── (s) INDIA (IN_SCOMET → inOriginModule) ─────────────────────────────────
  // Indien hat KEINE auf Code×Ziel selbst-ausführende General-Autorisierung (die
  // DGFT-General-Authorisations GAET/GAEIS/GAED sind intra-company/end-use/case-
  // by-case-bedingt — IN_GENERAL_LICENCES leer). Jedes SCOMET-kontrollierte Gut
  // ist eine individuelle SCOMET-Autorisierung bei der DGFT → REVIEW; sensible
  // Codes fail-closen. IN ist als Ziel hier ausgelassen (IN-Sitz). Quelle: DGFT
  // SCOMET-Liste (Notification No. 25, 02.09.2024) + FTDR Act 1992.
  "sat-bus|IN|DE": "REVIEW", // 9A004 (sensibel) IN→DE
  "sat-bus|IN|US": "REVIEW", // 9A004 IN→US
  "sat-bus|IN|JP": "REVIEW", // 9A004 IN→JP
  "sat-bus|IN|CN": "REVIEW", // 9A004 IN→CN
  "sat-bus|IN|RU": "BLOCKED", // 9A004 IN→RU: Gate 1.6
  "apogee-engine|IN|DE": "REVIEW", // 9A106 (bare-parent fail-close) IN→DE
  "apogee-engine|IN|US": "REVIEW", // 9A106 IN→US
  "apogee-engine|IN|JP": "REVIEW", // 9A106 IN→JP
  "apogee-engine|IN|CN": "REVIEW", // 9A106 IN→CN
  "apogee-engine|IN|RU": "BLOCKED", // 9A106 IN→RU: Gate 1.6
  "star-tracker|IN|DE": "REVIEW", // 7A004 IN→DE: individuelle SCOMET-Autorisierung
  "ground-tt-c|IN|US": "REVIEW", // 5A002 IN→US: individuelle SCOMET-Autorisierung
  "prepreg|IN|JP": "REVIEW", // 1C010 IN→JP: individuelle SCOMET-Autorisierung
};

// ─── Item-Klassifizierbarkeit (Kontrollverdacht) ──────────────────────────

/**
 * "Kontrollverdächtig" = das Item trägt einen deklarierten Kontroll-Code.
 * Bewusst einfach + deterministisch (Plan §4.4): deklarierte Codes erzeugen
 * Kontrollverdacht über Gate 3.5/4.5 unabhängig von der Heuristik. Undeklarierte
 * Items können kontrolliert (Heuristik feuert) ODER unkontrolliert sein —
 * deshalb knüpfen die CN/EMBARGO-Böden NUR an deklarierte Codes an.
 */
function itemLooksControlled(item: GoldenItem): boolean {
  return item.declaredCodes !== undefined;
}

// ─── Thin-Origin-Bestimmung (fail-closed, aus REGIME_MATURITY abgeleitet) ──

/**
 * Ein Origin ist "dünn", wenn sein primäres Dual-Use-Regime REGIME_MATURITY
 * 3 hat (noch nicht tief modelliert) — DANN feuert Gate 4.5 für
 * kontrollverdächtige Items (fail-closed). Aus der Map abgeleitet statt
 * hartkodiert, damit der Test mit jedem Maturity-Upgrade (S3–S6) automatisch
 * mitwandert.
 *
 * Liest `LIST_ID_TO_CORPUS_REGIME` direkt aus `license-determination.ts`
 * (exportiert, kein Nachbau) — so kann die Thin-Origin-Ableitung nie von der
 * Tabelle abdriften, die Gate 4.5 tatsächlich benutzt.
 */
function isThinOrigin(originIso: string): boolean {
  const regime = originRegimes(originIso);
  if (!regime.supported) return false;
  const corpus = LIST_ID_TO_CORPUS_REGIME[regime.dualUsePrimary];
  return corpus !== undefined && REGIME_MATURITY[corpus] === 3;
}

// ─── Pipeline-Helper (DAS Orakel der Matrix) ───────────────────────────────

/**
 * Baut die `ClassifiableItem`-Form aus einem Golden-Item: `attributes` sind
 * bereits ItemSignals-konform (1:1, kein Mapping), deklarierte Codes werden
 * auf die eccnEU/eccnUS/usmlCategory-Felder gehoben. Spiegelt, wie
 * operation-assistant.server.ts ein Prisma-Item an classify übergibt
 * (`item as unknown as ClassifiableItem`).
 */
function buildClassifiableItem(item: GoldenItem): ClassifiableItem {
  return {
    name: item.name,
    description: item.description,
    ...item.attributes,
    ...(item.declaredCodes
      ? {
          eccnEU: item.declaredCodes.eccnEU ?? null,
          eccnUS: item.declaredCodes.eccnUS ?? null,
          usmlCategory: item.declaredCodes.usmlCategory ?? null,
        }
      : {}),
  } as ClassifiableItem;
}

/**
 * Synthetisches, all-CLEAR Screening-Argument für `deriveVerdict`. Die Golden-
 * Matrix ist BEWUSST partei-los (rein item×origin×dest) — sie hat keine
 * Gegenpartei-Dimension. Ein sauberes Screening isoliert daher genau das, was
 * diese Matrix prüfen soll: das Item-/Origin-/Dest-getriebene Zeilen-Verdict.
 * `lastScreenedAt: null` heißt "Frische unbekannt" → wird NICHT zum Gap
 * abgewertet (siehe `ScreeningAssessment`-Doku), das Screening bleibt ein
 * sauberes GO und drückt das Verdict nie künstlich hoch.
 */
const SYNTHETIC_CLEAR_SCREENING: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Golden-Set (party-less harness)",
  partyBlocked: false,
  lastScreenedAt: null,
};

/**
 * DAS Orakel der Matrix: das ECHTE AVA-Zeilen-Verdict. Statt `gate → verdict`
 * direkt zu mappen (der alte blinde Fleck — er ließ AVAs `hardBlock()` aus),
 * baut diese Funktion exakt das, was operation-assistant.server.ts pro Zeile
 * baut — ein `LineAssessment` (classified=true, mit `classification`) — und
 * reicht es zusammen mit einem synthetischen all-CLEAR-Screening an
 * `deriveVerdict`. Damit greift AVAs `hardBlock()` (gate==BLOCKED ODER
 * itarBlock/embargoBlock/annexIVBlock/mtcrCatIBlock) genauso wie in der echten
 * Server-Bewertung. exporterOrigin wird nur für unterstützte Sitze
 * durchgereicht — für circle-A sind alle Origins supported.
 */
function runPipeline(
  item: GoldenItem,
  originIso: string,
  destIso: string,
): Verdict {
  const origin = originRegimes(originIso);
  const classification = classifyItemForOperation(buildClassifiableItem(item), {
    destinationCountry: destIso,
    exporterOrigin: origin.supported ? origin : undefined,
  });
  const line: LineAssessment = {
    lineId: `${item.id}-line`,
    itemId: item.id,
    itemName: item.name,
    classified: true,
    classification,
  };
  return deriveVerdict([line], SYNTHETIC_CLEAR_SCREENING).verdict;
}

// ─── Assertion-Helfer ──────────────────────────────────────────────────────

function expectAtLeast(actual: Verdict, min: Verdict, label: string) {
  expect(
    SEV[actual],
    `${label} — erwartet mindestens ${min}, war ${actual}`,
  ).toBeGreaterThanOrEqual(SEV[min]);
}

// ─── Matrix ────────────────────────────────────────────────────────────────

describe("GOLDEN SET — space items × circle-A origins × destination classes", () => {
  for (const item of GOLDEN_ITEMS) {
    describe(`${item.id} (${itemLooksControlled(item) ? "control-suspicious" : "no declared code"})`, () => {
      for (const origin of ORIGINS) {
        for (const dest of DESTS) {
          if (origin === dest.iso) continue; // Inlandslieferung: kein Exportfall

          it(`${item.id} | ${origin}→${dest.iso} [${dest.cls}]`, () => {
            const verdict = runPipeline(item, origin, dest.iso);
            // Stabiler Map-Lookup-Key (ohne Klasse) für EXACT; Label trägt
            // zusätzlich die Dest-Klasse für schnellere Triage bei Failures.
            const key = `${item.id}|${origin}|${dest.iso}`;
            const label = `${key} [${dest.cls}]`;

            // 1. EXACT-Override (falls belegt) — sonst Mindest-Strenge-Boden.
            if (EXACT[key] !== undefined) {
              expect(verdict, `${label} — EXACT`).toBe(EXACT[key]);
            } else {
              // CN/EMBARGO-Böden gelten NUR für kontrollverdächtige Items
              // (siehe Header). Für unkontrollierte Items ist GO nach CN/RU
              // rechtlich korrekt → kein Boden.
              const floorApplies =
                (dest.cls !== "CN" && dest.cls !== "EMBARGO") ||
                itemLooksControlled(item);
              if (floorApplies) {
                expectAtLeast(verdict, MIN_BY_DEST_CLASS[dest.cls], label);
              }
            }

            // 2. Fail-Closed-Garantie: dünnes Origin-Primärregime (Tier 3)
            //    + kontrollverdächtiges Item ⇒ NIE GO (Gate 4.5 muss greifen).
            if (
              originRegimes(origin).supported &&
              isThinOrigin(origin) &&
              itemLooksControlled(item)
            ) {
              expect(
                verdict,
                `${label} — thin origin + control-suspicious darf nie GO sein (Gate 4.5)`,
              ).not.toBe("GO");
            }
          });
        }
      }
    });
  }
});

// ─── Origin-spezifische Verdicts (Engine-Origin-Determination, Phase F) ──────
//
// Der EXACT-Mechanismus oben ist BEREITS origin-spezifisch: ein Eintrag wird
// mit `item|origin|dest` gekeyt und kann daher für ein einzelnes Origin ein
// vom generischen Boden ABWEICHENDES Verdict festschreiben (genau das, was die
// Origin-Determination-Stufe später je Modul produziert — GO-unter-General-
// Lizenz / Einzelantrag-REVIEW / verboten-BLOCKED). Die folgende Helper-
// + Pin-Schicht macht diese Origin-Sensitivität explizit testbar, OHNE in
// Phase F die Verteilung zu verändern: es ist NOCH KEIN Nicht-US-Modul gebaut,
// der US-Wrap ist verhaltensidentisch (Snapshot), also bleibt die Verteilung
// exakt auf dem Vor-Feature-Wert.

/** Zählt die volle Origin×Dest-Matrix-Verteilung über das echte Orakel. */
function measureDistribution(): {
  total: number;
  GO: number;
  REVIEW: number;
  BLOCKED: number;
} {
  const counts = { GO: 0, REVIEW: 0, BLOCKED: 0 };
  let total = 0;
  for (const item of GOLDEN_ITEMS) {
    for (const origin of ORIGINS) {
      for (const dest of DESTS) {
        if (origin === dest.iso) continue;
        counts[runPipeline(item, origin, dest.iso)] += 1;
        total += 1;
      }
    }
  }
  return { total, ...counts };
}

describe("GOLDEN SET — Origin-Determination (Phase F + M-EU + M-UK + M-CH + NO/CA/AU/JP/KR/IN fan-out)", () => {
  it("Verteilung nach Fan-out: 744 = 124 GO / 346 REVIEW / 274 BLOCKED", () => {
    // Verlauf: Phase F (nur US-Wrap, no-op) 74/396/274 → M-EU (EUGEA EU001 +
    // Member→NCA) 90/380/274 → M-UK (OGEL EU-Mitgliedstaaten + SIEL bei der ECJU)
    // 94/376/274 → M-CH (OGB GKV Art. 12 + Einzelbewilligung beim SECO) 106/364/274
    // → FAN-OUT (NO/CA/AU/JP/KR/IN Origin-Module) 124/346/274.
    //
    // Der Fan-out verschiebt GENAU 18 Zellen bewusst REVIEW→GO — alle durch eine
    // ZITIERTE General-Lizenz belegt, KEIN false-CLEARED:
    //
    //   CANADA (CA, +10): zwei General-Permits.
    //     • US-Befreiung (Export Controls Handbook): CA→US für nicht-sensible
    //       ECL-Güter → star-tracker|CA|US, ground-tt-c|CA|US (Krypto in die USA
    //       permit-frei), flight-sw|CA|US, prepreg|CA|US (4 Zellen).
    //     • GEP No. 41 (SOR/2015-200): nicht-sensible, nicht-Krypto Dual-Use an die
    //       s.2-Allierten (DE/JP unter den Matrix-Zielen) → star-tracker|CA|{DE,JP},
    //       flight-sw|CA|{DE,JP}, prepreg|CA|{DE,JP} (6 Zellen). Krypto (5A002) ist
    //       GEP-41-Schedule-13-AUSGESCHLOSSEN → ground-tt-c|CA|{DE,JP} bleibt REVIEW.
    //
    //   JAPAN (JP, +8): General Bulk Export Licence (一般包括許可) an die
    //     Group-A-Staaten (METI Anlage 3). DE/US sind Group A (JP-als-Ziel
    //     ausgelassen; IN/CN NICHT Group A) → die vier nicht-sensiblen Items
    //     (7A004/5A002/9D001/1C010) × {DE,US} = 8 Zellen GO. Quelle: METI 2023-06-27.
    //
    // WAS BEWUSST NICHT auf GO kippt (fail-closed — die load-bearing Sicherheit):
    //   • NORWAY/AUSTRALIA/KOREA/INDIA: KEINE auf Code×Ziel selbst-ausführende
    //     General-Lizenz (NO/AU/KR/IN_GENERAL_LICENCES leer — verifizierte Befunde:
    //     NO MFA-Einzel, AU AUKUS-registrierungsgebunden, KR exporteur-spezifische
    //     Comprehensive, IN DGFT-Einzel). Jedes kontrollierte Gut bleibt REVIEW;
    //     das EINZIGE GO je Origin ist das genuin unkontrollierte reaction-wheel.
    //     0 neue GO-Zellen aus diesen vier — exakt der ehrliche, wertvolle Befund
    //     (manche Origins haben schlicht keine auto-erteilbare General-Lizenz).
    //   • sat-bus (9A004) + apogee-engine (9A106) aus JEDEM der sechs Origins:
    //     besonders sensible MTCR/Anhang-IV-äquivalente Güter → fail-closed REVIEW
    //     an JEDES Ziel (auch CA→US, JP→Group-A), BLOCKED nach RU (Gate 1.6). Jede
    //     dieser 11 sat-bus- + 11 apogee-Zellen je Origin ist oben in EXACT explizit
    //     gepinnt — das Sicherheitsnetz, das früher Gate 4.5 war.
    //   • radhard-obc (eccnUS 3A001.a.1) aus CA/JP: bleibt REVIEW — das CA/JP-Bein
    //     wäre zwar General-Lizenz-fähig, aber das unabhängige US/BIS-Bein wird vom
    //     Origin-Modul NIE übersteuert.
    //   • CA→IN/CN, JP→IN/CN für kontrollierte Items: REVIEW (IN/CN nicht in der
    //     GEP-41-Liste bzw. nicht Group A).
    // BLOCKED unverändert (274): kein Hartverbot (Embargo/RU-BY/ITAR) berührt; jede
    // kontrollierte *→RU-Zelle bleibt BLOCKED (Gate 1.6 vorgelagert), jede
    // hall-thruster/eo-* ITAR-Zelle bleibt unverändert.
    expect(measureDistribution()).toEqual({
      total: 744,
      GO: 124,
      REVIEW: 346,
      BLOCKED: 274,
    });
  });

  it("US-Origin fließt über das gewrappte Modul (US_CCL registriert), Verdict snapshot-paritätisch", () => {
    // Der US-Wrap ersetzt den (für US ohnehin no-op) Gate-4.5-Fallback. Die
    // US-Zellen müssen ihr Vor-Feature-Verdict behalten — hier an konkreten
    // Zellen gepinnt (Snapshot-Parität, vgl. us.test.ts):
    //   • sat-bus (9A004) US→JP: dual-use, kontrolliert → REVIEW (EAR-Gate).
    //   • reaction-wheel US→JP: unkontrolliert → GO.
    expect(
      runPipeline(GOLDEN_ITEMS.find((i) => i.id === "sat-bus")!, "US", "JP"),
    ).toBe("REVIEW");
    expect(
      runPipeline(
        GOLDEN_ITEMS.find((i) => i.id === "reaction-wheel")!,
        "US",
        "JP",
      ),
    ).toBe("GO");
  });

  it("EXACT-Mechanismus kann ein origin-spezifisches Verdict ausdrücken (item|origin|dest)", () => {
    // Beweis, dass die Harness origin-spezifisch keyt: derselbe Item×Dest aus
    // unterschiedlichen Origins kann unterschiedliche EXACT-Pins tragen. Die
    // bestehenden Pins zeigen es bereits — sat-bus|DE|RU (BLOCKED) vs.
    // sat-bus|GB|DE (REVIEW): gleiches Item, origin-abhängiges Verdict.
    expect(EXACT["sat-bus|DE|RU"]).toBe("BLOCKED");
    expect(EXACT["sat-bus|GB|DE"]).toBe("REVIEW");
    expect(
      runPipeline(GOLDEN_ITEMS.find((i) => i.id === "sat-bus")!, "DE", "RU"),
    ).toBe("BLOCKED");
    expect(
      runPipeline(GOLDEN_ITEMS.find((i) => i.id === "sat-bus")!, "GB", "DE"),
    ).toBe("REVIEW");
  });
});

// ─── Invarianten (aus dem Plan §4.4) ────────────────────────────────────────

describe("GOLDEN SET — Invarianten", () => {
  it("jeder circle-A-Origin ist von der Map unterstützt", () => {
    for (const o of ORIGINS) {
      expect(
        originRegimes(o).supported,
        `Origin ${o} muss supported sein`,
      ).toBe(true);
    }
  });

  it("KEIN circle-A-Origin ist mehr dünn (dualUsePrimary maturity 3) nach dem Fan-out", () => {
    // Verlauf des Thin-Sets: M-UK (2026-06-13) hob UK_STRATEGIC 3 → 2 (GB verließ
    // den Thin-Set, 8 → 7). M-CH (2026-06-13) hob CH_GKV 3 → 2 (7 → 6). Der
    // ORIGIN-DETERMINATION-FAN-OUT (2026-06-13) modellierte die letzten sechs
    // circle-A-Origins (NO/CA/AU/JP/KR/IN) und hob sie alle 3 → 2 — der circle-A-
    // Thin-Set ist jetzt LEER. Gate 4.5 (Thin-Origin-REVIEW) feuert für KEINEN
    // realen circle-A-Sitz mehr; das frühere Sicherheitsnetz (Gate 4.5 +
    // Thin-Origin-Invariant) ist durch die EXPLIZITEN sensiblen EXACT-Pins je
    // Origin ersetzt (siehe der Fan-out-Block oben in EXACT).
    const thin = ORIGINS.filter((o) => isThinOrigin(o)).sort();
    expect(thin).toEqual([]);
    // Alle elf golden circle-A-Sitze sind NICHT dünn (alle maturity 2).
    for (const o of ORIGINS) {
      expect(isThinOrigin(o), `${o} darf nicht dünn sein`).toBe(false);
    }
  });

  it("Fail-Closed-Ersatz: JEDE sensible MTCR/Anhang-IV-Zelle (sat-bus/apogee × NO/CA/AU/JP/KR/IN) ist nie-GO (REVIEW non-RU, BLOCKED RU)", () => {
    // Da kein circle-A-Origin mehr dünn ist, kann der alte Thin-Origin-Invariant-
    // Test (thin × controlled ⇒ nie GO) nicht mehr feuern. Diese Invariante TRITT
    // AN SEINE STELLE und behält die Schutz-Bedeutung für die SECHS FAN-OUT-Origins
    // (NO/CA/AU/JP/KR/IN — die Origins, deren Modul jetzt das Verdict liefert): sie
    // verlangt für die ZWEI sensiblen Golden-Items (sat-bus 9A004 = space launch
    // vehicle, apogee-engine 9A106 = TVC, beide Anhang-IV/MTCR), dass kein Fan-out-
    // Origin-Modul sie je auf GO kippt — REVIEW zu jedem nicht-RU-Ziel, BLOCKED nach
    // RU. Dies ist die direkte no-false-CLEARED-Garantie auf Trägerraketen-Technik
    // aus einem Fan-out-Sitz.
    //
    // SCOPE-HINWEIS: bewusst NICHT über DE/FR — eine innergemeinschaftliche
    // Verbringung (z. B. FR→DE) von 9A004/9A106 ist KEINE Ausfuhr aus dem EU-
    // Zollgebiet und daher rechtlich frei (GO); das ist bestehendes, korrektes
    // M-EU-Verhalten (Pin `sat-bus|FR|DE = GO`), kein Modul-false-CLEARED. Die
    // Fan-out-Origins sind Nicht-EU/Drittland-Sitze, für die jede Ausfuhr ein
    // Ausfuhrfall ist — dort gilt die strikte nie-GO-Garantie auf die sensiblen
    // Codes.
    const FAN_OUT = ["NO", "CA", "AU", "JP", "KR", "IN"] as const;
    for (const id of ["sat-bus", "apogee-engine"] as const) {
      const item = GOLDEN_ITEMS.find((i) => i.id === id)!;
      expect(item, `${id} muss existieren`).toBeDefined();
      for (const origin of FAN_OUT) {
        for (const dest of DESTS) {
          if (origin === dest.iso) continue;
          const v = runPipeline(item, origin, dest.iso);
          if (dest.iso === "RU") {
            expect(v, `${id}|${origin}|RU muss BLOCKED sein (Gate 1.6)`).toBe(
              "BLOCKED",
            );
          } else {
            expect(
              v,
              `${id}|${origin}|${dest.iso} — sensibles MTCR/Anhang-IV-Gut darf nie GO sein`,
            ).not.toBe("GO");
          }
        }
      }
    }
  });

  it("Fail-Closed: kontrolliertes Gut ist NIE GO nach CN und NIE non-BLOCKED nach RU (über die ganze Matrix)", () => {
    // Ersetzt + erweitert die frühere Thin-Origin-Invariante: für JEDES
    // kontrollverdächtige Item × JEDES Origin muss CN nicht-GO und RU BLOCKED sein.
    // Das ist die origin-unabhängige Boden-Garantie, die unabhängig von der
    // Maturity gilt und ein versehentliches false-CLEARED über ein General-Lizenz-
    // Modul (CA/JP) an ein sensibles Ziel sofort als Failure zeigt.
    // CN/RU are never themselves circle-A ORIGINS (the matrix exporters), so
    // every origin→CN / origin→RU pair below is a genuine export case — no
    // self-shipment guard needed.
    for (const item of GOLDEN_ITEMS) {
      if (!itemLooksControlled(item)) continue;
      for (const origin of ORIGINS) {
        expect(
          runPipeline(item, origin, "CN"),
          `${item.id}|${origin}|CN — kontrolliert darf nie GO`,
        ).not.toBe("GO");
        expect(
          runPipeline(item, origin, "RU"),
          `${item.id}|${origin}|RU — kontrolliert muss BLOCKED (Gate 1.6)`,
        ).toBe("BLOCKED");
      }
    }
  });

  it("Mindestens ein genuin unkontrolliertes Item liefert GO nach CN/RU (Boden-Sanity: kein Über-Blocken)", () => {
    // reaction-wheel: kein deklarierter Code, keine Heuristik. GO nach CN/RU ist
    // rechtlich korrekt — beweist, dass die CN/EMBARGO-Böden zu Recht nur für
    // kontrollverdächtige Items gelten (sonst wäre dies ein falsches Über-Blocken).
    const rw = GOLDEN_ITEMS.find((i) => i.id === "reaction-wheel");
    expect(rw, "reaction-wheel muss im Golden Set existieren").toBeDefined();
    expect(runPipeline(rw!, "DE", "CN")).toBe("GO");
    expect(runPipeline(rw!, "DE", "RU")).toBe("GO");
  });

  it("Heuristik-Pin: undeklarierte heuristik-getriebene Items (eo-sar, hall-thruster) sind irgendwo NICHT GO", () => {
    // Diese Items tragen KEINEN deklarierten Code (itemLooksControlled=false),
    // ihre Kontrolle entsteht AUSSCHLIESSLICH über die Keyword-Heuristik (SAR /
    // Hall-Thruster → ITAR via hardBlock). Da kein Boden auf sie greift, würde
    // eine kaputte/abgeklemmte Heuristik sie still auf GO-überall fallen lassen,
    // ohne dass ein anderer Test es merkt. Dieser Pin verlangt mindestens EIN
    // Nicht-GO-Verdict je Item über die Matrix — die Heuristik MUSS feuern.
    for (const id of ["eo-sar", "hall-thruster"] as const) {
      const item = GOLDEN_ITEMS.find((i) => i.id === id);
      expect(item, `${id} muss im Golden Set existieren`).toBeDefined();
      expect(itemLooksControlled(item!), `${id} ist bewusst undeklariert`).toBe(
        false,
      );
      let sawNonGo = false;
      for (const origin of ORIGINS) {
        for (const dest of DESTS) {
          if (origin === dest.iso) continue;
          if (runPipeline(item!, origin, dest.iso) !== "GO") {
            sawNonGo = true;
            break;
          }
        }
        if (sawNonGo) break;
      }
      expect(
        sawNonGo,
        `${id} ist über die GANZE Matrix GO — die Keyword-Heuristik feuert nicht mehr (stiller ITAR-Verlust)`,
      ).toBe(true);
    }
  });
});
