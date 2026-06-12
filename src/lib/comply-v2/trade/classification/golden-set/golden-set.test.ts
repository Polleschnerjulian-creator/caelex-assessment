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
 *   744 Zellen: 74 GO / 484 REVIEW / 186 BLOCKED.
 *   Die 186 BLOCKED stammen AUSSCHLIESSLICH aus AVAs konservativem
 *   `hardBlock()` (heuristik-getriebenes `itarBlock` bei eo-sar/eo-optical/
 *   hall-thruster), NICHT aus einem destinations-getriebenen Embargo-Gate —
 *   ein solches Gate existiert noch nicht (PF-1, separater Task). Die BLOCKED-
 *   Zellen sind über die GANZE Matrix verteilt (auch INTRA_EU/US/FRIENDLY/IN),
 *   weil eine ITAR-Heuristik destinations-unabhängig feuert.
 *
 * ─── WICHTIGE Rechts-Erkenntnis: KEINE EXACT-RU-Böden (dokumentiert) ──────
 * Der Plan schlug zwei EXACT-Overrides vor:
 *   "apogee-engine|DE|RU": "BLOCKED"  und  "sat-bus|DE|RU": "BLOCKED"
 * (mit Verweis auf Reg. 833/2014). Die Verifikation im Code zeigt: die
 * 833/2014-Hartsperre ist in `license-determination.ts` AUSSCHLIESSLICH
 * Gate 0 (Annex IV, status PROHIBITED) — und Gate 0 feuert NUR, wenn der
 * Screening-Kontext der GEGENPARTEI `EU_ANNEX_IV` enthält. Es gibt KEIN
 * destinations-getriebenes RU-Embargo-Gate (RU ist NICHT in
 * EMBARGOED_COUNTRIES = {CU,IR,KP,SY}; RU sitzt in der D:1-RESTRICTED-Gruppe,
 * die nur die De-minimis-Schwelle, kein Block, beeinflusst).
 *
 * Diese Golden-Matrix ist BEWUSST rein item×origin×dest (mit synthetischem
 * CLEAR-Screening) — sie hat keine echte Gegenpartei-Dimension. Folglich ist
 * ein GENERISCH kontrolliertes Dual-Use-Item nach RU rechtlich korrekt REVIEW
 * (Ausfuhr-Genehmigungspflicht), NICHT BLOCKED — ein destinations-getriebener
 * RU-Hartblock ist ein PARTEI-Ergebnis (Annex-IV-Treffer), das diese Schicht
 * nicht herstellt. Die beiden EXACT-Einträge wären also eine FALSCHE Behauptung
 * über diese Schicht. Daher: EXACT-Tabelle bleibt LEER.
 *
 * NICHT zu verwechseln: die 186 BLOCKED-Zellen (eo-sar/eo-optical/hall-thruster
 * nach ALLEN Dests inkl. RU) entstehen NICHT aus einem RU-/Embargo-Gate, sondern
 * aus AVAs destinations-UNABHÄNGIGER ITAR-Heuristik (`hardBlock → itarBlock`).
 * Der EMBARGO-Boden ist trotzdem überall erfüllt: BLOCKED ≥ REVIEW.
 * Belegt per Spike vor Commit (744 Zellen: 74 GO / 484 REVIEW / 186 BLOCKED).
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
  EMBARGO: "REVIEW", // mindestens; harter Block ist ein Partei-Ergebnis (Annex IV)
};

/**
 * EXACT-Erwartungen: NUR wo der Rechtstext über DIESE reine Pipeline
 * eindeutig ist. Bewusst LEER — die einzigen Kandidaten (RU-Block für
 * apogee-engine/sat-bus) sind über die party-lose Pipeline NICHT erreichbar
 * (833/2014-Hartsperre = Gate 0 / Annex-IV-Partei; siehe Datei-Header). Ein
 * Daten-Sprint, der ein exaktes Verdict belegen kann, trägt es hier mit
 * Quellen-Kommentar nach.
 */
const EXACT: Record<string, Verdict> = {};

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

  it("genau diese 8 thin origins (dualUsePrimary maturity 3): GB,CH,NO,CA,JP,AU,KR,IN", () => {
    const thin = ORIGINS.filter((o) => isThinOrigin(o)).sort();
    expect(thin).toEqual(["AU", "CA", "CH", "GB", "IN", "JP", "KR", "NO"]);
    // DE/FR (EU_ANNEX_I maturity 2) + US (US_CCL maturity 2) sind NICHT dünn.
    expect(isThinOrigin("DE")).toBe(false);
    expect(isThinOrigin("FR")).toBe(false);
    expect(isThinOrigin("US")).toBe(false);
  });

  it("Fail-Closed: thin origin × control-suspicious ist NIE GO (über die ganze Matrix)", () => {
    for (const item of GOLDEN_ITEMS) {
      if (!itemLooksControlled(item)) continue;
      for (const origin of ORIGINS) {
        if (!isThinOrigin(origin)) continue;
        for (const dest of DESTS) {
          if (origin === dest.iso) continue;
          const v = runPipeline(item, origin, dest.iso);
          expect(
            v,
            `${item.id}|${origin}|${dest.iso} — thin+controlled darf nie GO`,
          ).not.toBe("GO");
        }
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
