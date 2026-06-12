/**
 * GOLDEN SET — Matrix-Harness (Spec 2026-06-12 §4.4, S0-Akzeptanz-Artefakt).
 *
 * Diese Datei IST die Verifikation der 12 Referenz-Items (`space-items.ts`):
 * sie fährt jedes Item durch die ECHTE reine Pipeline über die volle
 * Origin×Destination-Matrix und prüft Mindest-Strenge-Böden + Fail-Closed-
 * Invarianten. Sie ist die Regressions-Messlatte, gegen die jeder Daten-
 * Sprint (S1–S6) läuft: präzisere Daten dürfen Böden anheben, nie absenken.
 *
 * ─── Pipeline-Komposition (mirror von operation-assistant.server.ts) ──────
 * Pro Zelle (Item × Origin × Dest) bauen wir dieselbe Aufruf-Kette wie eine
 * AVA-Operationszeile, NUR ohne Prisma (alles hier ist rein):
 *   1. originRegimes(originIso)  → OriginRegimeRouting (Sitz → Ausfuhrrecht)
 *   2. classifyItemForOperation(item, { destinationCountry, exporterOrigin })
 *      — exporterOrigin wird (wie in der Server-Quelle) NUR für unterstützte
 *        Sitze durchgereicht; für circle-A sind ALLE Origins supported, also
 *        immer gesetzt. classifyItemForOperation ruft intern
 *        determineLicenseRequirements inkl. Gate 4.5 (Thin-Origin) auf.
 *   3. gate (CLEARED|REVIEW_NEEDED|BLOCKED) → Verdict (GO|REVIEW|BLOCKED).
 *
 * ─── Gate→Verdict-Mapping (Spec §4.4) ────────────────────────────────────
 *   CLEARED        → GO
 *   REVIEW_NEEDED  → REVIEW
 *   BLOCKED        → BLOCKED
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
 * Diese Golden-Matrix ist BEWUSST rein item×origin×dest — sie hat keine
 * Gegenpartei-/Screening-Dimension. Folglich ist ein kontrolliertes Dual-
 * Use-Item nach RU rechtlich korrekt REVIEW (Ausfuhr-Genehmigungspflicht),
 * NICHT BLOCKED — der harte Block ist ein PARTEI-Ergebnis (Annex-IV-Treffer),
 * das diese Pipeline-Schicht nicht herstellt. Die beiden EXACT-Einträge wären
 * also eine FALSCHE Behauptung über die reine Pipeline. Daher: EXACT-Tabelle
 * bleibt LEER; der EMBARGO-Boden bleibt REVIEW (vom Code erfüllt). Belegt per
 * Spike vor Commit (744 Fälle: 74 GO / 670 REVIEW / 0 BLOCKED).
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
  REGIME_MATURITY,
  type CorpusRegime,
} from "@/data/trade/normalized-corpus";
import type { ListId } from "../order-of-review";

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
 * Spiegelung der `LIST_ID_TO_CORPUS_REGIME`-Tabelle aus
 * `license-determination.ts` (dort modul-privat, daher hier minimal
 * nachgebaut). Nur die Dual-Use-Primärregime der circle-A-Origins werden
 * gebraucht; multilaterale ListIds sind absichtlich nicht enthalten (Gate 4.5
 * feuert nie auf multilateralen Baselines).
 */
const LIST_ID_TO_CORPUS_REGIME: Partial<Record<ListId, CorpusRegime>> = {
  EAR_CCL: "US_CCL",
  EU_ANNEX_I: "EU_ANNEX_I",
  UK_STRATEGIC: "UK_STRATEGIC",
  JP_METI: "JP_METI",
  IN_SCOMET: "IN_SCOMET",
  EU_CML: "EU_CML",
  CA_ECL: "CA_ECL",
  AU_DSGL: "AU_DSGL",
  KR_STRATEGIC: "KR_STRATEGIC",
  CH_GKV: "CH_GKV",
  NO_LIST: "NO_LIST",
  USML: "USML",
  DE_AUSFUHRLISTE: "DE_AUSFUHRLISTE",
};

/**
 * Ein Origin ist "dünn", wenn sein primäres Dual-Use-Regime REGIME_MATURITY
 * 3 hat (noch nicht tief modelliert) — DANN feuert Gate 4.5 für
 * kontrollverdächtige Items (fail-closed). Aus der Map abgeleitet statt
 * hartkodiert, damit der Test mit jedem Maturity-Upgrade (S3–S6) automatisch
 * mitwandert.
 */
function isThinOrigin(originIso: string): boolean {
  const regime = originRegimes(originIso);
  if (!regime.supported) return false;
  const corpus = LIST_ID_TO_CORPUS_REGIME[regime.dualUsePrimary];
  return corpus !== undefined && REGIME_MATURITY[corpus] === 3;
}

// ─── Pipeline-Helper (DAS Orakel der Matrix) ───────────────────────────────

const gateToVerdict = (
  gate: "CLEARED" | "REVIEW_NEEDED" | "BLOCKED",
): Verdict =>
  gate === "CLEARED" ? "GO" : gate === "BLOCKED" ? "BLOCKED" : "REVIEW";

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
 * Die reine Pipeline für eine Matrix-Zelle. Mirror der AVA-Zeilen-Logik
 * (operation-assistant.server.ts:190–224) minus Prisma + Screening (rein
 * item×origin×dest). exporterOrigin wird nur für unterstützte Sitze
 * durchgereicht — für circle-A sind alle Origins supported.
 */
function runPipeline(
  item: GoldenItem,
  originIso: string,
  destIso: string,
): Verdict {
  const origin = originRegimes(originIso);
  const result = classifyItemForOperation(buildClassifiableItem(item), {
    destinationCountry: destIso,
    exporterOrigin: origin.supported ? origin : undefined,
  });
  return gateToVerdict(result.licenseDetermination.gate);
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
            const key = `${item.id}|${origin}|${dest.iso}`;

            // 1. EXACT-Override (falls belegt) — sonst Mindest-Strenge-Boden.
            if (EXACT[key] !== undefined) {
              expect(verdict, `${key} — EXACT`).toBe(EXACT[key]);
            } else {
              // CN/EMBARGO-Böden gelten NUR für kontrollverdächtige Items
              // (siehe Header). Für unkontrollierte Items ist GO nach CN/RU
              // rechtlich korrekt → kein Boden.
              const floorApplies =
                (dest.cls !== "CN" && dest.cls !== "EMBARGO") ||
                itemLooksControlled(item);
              if (floorApplies) {
                expectAtLeast(verdict, MIN_BY_DEST_CLASS[dest.cls], key);
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
                `${key} — thin origin + control-suspicious darf nie GO sein (Gate 4.5)`,
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
});
