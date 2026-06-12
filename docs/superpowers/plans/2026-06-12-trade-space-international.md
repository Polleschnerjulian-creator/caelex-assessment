# Passage Space-International Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Multi-Sprint-Plan: einen Sprint pro fokussierter Session ausführen, §0-Statusboard nach jedem Task pflegen.**

**Goal:** Passage deckt alles Space-Spezifische über die Origin→Destination-Matrix ab (Kreis-A-Origins: EU-27, UK, US, CH, NO, CA, JP, AU, KR, IN) — fail-closed, ohne externe Kosten.

**Architecture:** Sprint 0 baut das Sicherheitsnetz (Origin-Routing + Fail-Closed + Golden-Set-Messlatte) — danach kauft jeder Daten-Sprint (S1–S6, Mirror-Architektur) nur noch Präzision. S7 verankert Pflege. Spec: `docs/superpowers/specs/2026-06-12-trade-corpus-international-design.md`.

**Tech Stack:** Next.js 15, TypeScript strict, Vitest, reine TS-Datenmodule (`src/data/trade/`), pure Engines (`src/lib/comply-v2/trade/`). KEINE neuen Dependencies, KEINE Migration, KEINE Runtime-AI-Calls.

---

## 0. KONTEXT-SURVIVAL + STATUS BOARD (nach jedem Task pflegen)

**Lies in dieser Reihenfolge bei leerem Kontext:**

1. Spec `docs/superpowers/specs/2026-06-12-trade-corpus-international-design.md` (Entscheidungen §2, Fail-Closed §4.3, DoD §8)
2. Diese Datei (§-Sprints, Status unten)
3. Muster-Dateien: `src/data/trade/eu-annex-i-cat1-2.ts` (Daten-Sprint-Vorlage), `src/data/trade/usml-xv-e.ts` (Paragraph-Vorlage), `src/data/trade/normalized-corpus.ts` (Union/Adapter)

**Harte Regeln:**

- **Null externe Kosten.** Nur amtliche Gratis-Quellen (Spec §4.5-Tabelle). Kein Eintrag ohne `sourceUrl`+`asOfDate`. Kein Verbatim-Abtippen (Paraphrase), Codes exakt.
- **TDD:** RED (Test fehlschlagen SEHEN) → minimal GREEN → Commit. Daten-Sprints: Invarianten-Tests + unabhängiger Verifikations-Agent gegen den Rechtstext VOR Commit.
- **Fail-closed:** Im Zweifel REVIEW, nie CLEARED. Verhaltensänderung für Bestands-EU/DE/US-Flows in S0 = Bug.
- **Batched Deploys** per CLAUDE.md (kein Push pro Task; Branch `feat/trade-space-international`).
- **Objektives Orakel** für legal-sensible Edits: `grep -c`, `npx vitest run`, `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (tsc-Baseline **674** — gemessen 2026-06-12 in DIESEM Checkout nach `npm install` + `prisma generate` bei Commit `bf1a0869`; die 666 stammten aus dem passage-genial-Checkout und sind hier NICHT vergleichbar — Phantom-Diff-Lektion).
- macOS: kein `timeout`-Builtin; tsc nur mit NODE_OPTIONS wie oben.

| Sprint                                    | Status        | Commits                                 | Notizen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0 — Routing + Golden Set                 | ✅ 2026-06-12 | 46538170…5513a6c9 (16 Commits)          | ALLE 10 Tasks + T9b, je Implementer→Spec-Review→Quality-Review (Subagent-driven). **Geliefert:** origin-regime-map (Kreis A, 36 ISO) · 7 neue ListIds+CorpusRegimes · origin-aware order-of-review (Tier 3.5, military-first Tie-Break) · REGIME_MATURITY · exporter-seat (kein stiller Default, KP-Pins) · AVA assessedUnder+Origin-Pendenz (null-Sitz verhaltensgleich) · Gate 4.5 thin-coverage (leg-gekoppelt) · **Gate 1.6 RU/BY-Destination-Verbot (833/2014 Art. 2/2a + 765/2006 Art. 1e/1f, PF-1 geschlossen, qualifizierter Reason auf US-only-Pfad)** · Golden-Set 12 Items × 744 Zellen, Orakel = echtes deriveVerdict, Verteilung 74 GO/396 REVIEW/274 BLOCKED, 3 EXACT-RU-Pins. **Review-Fänge (8):** normalizeListId Prosa→Tags (fail-open) · Tie-Break order-sensitiv · Rationale falsches Regime · 186-Zellen-Orakel-Blindfleck · PF-1 (kein Destination-Block RU!) · Legal-Precision US-only-Zitat · EU_CML-Leg ungetestet · TDZ-Ordering. **PF-2 OFFEN:** resolveOrderOfReview = toter Code (kein Prod-Caller; Origin-Awareness lebt via Gate 4.5/1.6 + AVA; Wire-up-Entscheidung in S1+; Spec-§4.2-Prämisse entsprechend korrigiert). Minors für S3/S7: ListId→DE-Label-Map (VerdictPanel), assessedUnder ListId-Typ, no-creep-Test-Label, RU_BY-Set hoisten, Reason-String-Politur Gate 4.5. Vorbestehende Flaky compliance-aggregate.test.ts (1 Fail, unberührt). tsc-Baseline 674 gehalten (mehrfach non-inkrementell verifiziert).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S1 — MTCR komplett (Tier 1)               | ✅ 2026-06-13 | 834ef9f0 (data) · 39ad562c (cross-walk) | **Quelle:** MTCR „Equipment, Software and Technology Annex", Dokument-Stand **2024-03-14** (MTCR/TEM/2024/Annex), `https://www.mtcr.info/en/mtcr-annex` (PDF via curl + pymupdf, 82 S.). **Entries 9 → 179** (21 Cat I Items 1–2 + 158 Cat II Items 3–4,6,9–20). Split `mtcr.ts` (Cat I + Union/Helper) + `mtcr-cat2.ts` (Cat II), union re-exportiert ⇒ `normalized-corpus` behält 1 Import. **Cat-I/II-Split** verifiziert an Annex-Intro §1(a) („Cat I = alle in Items 1 u. 2"); **Latenter Bug gefixt:** Legacy-`2.A.1` war fälschlich Cat II → jetzt Cat I (Items 1+2 = Cat I). Reale Schwellen je Entry (Reichweite ≥300km/Nutzlast ≥500kg; Gesamtimpuls 1.1e6 Ns Cat I bzw. 8.41e5 Ns Cat-II-Band; spez. Zugfestigkeit 7.62e4 m; CEP ≤200m; rad-hard 5e5 rad(Si); Turbojet 400N/0.15 SFC/750kg/1m). `asOfDate`=Verifikationsdatum (Schema-Vertrag), Dokumentdatum 2024-03-14 in Header+Coverage. **`REGIME_MATURITY.MTCR_ANNEX` 3→1** + Maturity-Test angepasst (dokumentiert Upgrade). **Cross-walk:** neuer parametrischer Tripwire `MTCR:Item-19.A.1` (Reichweite ≥300km ohne Nutzlast-Floor — der Cat-II-Fang, den 1.A.1 verfehlt; Single-Predicate ⇒ feuert auch bei unbekannter Nutzlast); 1.A.1/USML-IV(d)(2)-1.1e6/GNSS-600m/s existierten bereits unverändert. **Tests:** mtcr.test.ts 12 (RED→GREEN), +1 Maturity-Test, +3 Matcher-Tests (19.A.1). **Golden-Set GRÜN UNVERÄNDERT** (744 Zellen, 74/396/274 — keine Zelle gekippt, da MTCR multilateral nie Origin-primär ⇒ `isThinOrigin` unberührt). Volle Trade-Suite 3836✅. **tsc-Baseline 674 gehalten** (0 neue Fehler in berührten Dateien; verbleibende parametric-matcher.test-Fehler sind vorbestehend, Zeilen 100–260). **`coverage.excluded`:** Items 5/7/8 (Reserved); verbatim CAS-Sublisten in 4.C.2.b/.g, 4.C.4–.6 zusammengefasst statt Chemikalie-für-Chemikalie; Front/Back-Matter (Units/Konstanten/SoU).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S2 — USML Cat IV (Tier 1)                 | ✅ 2026-06-13 | eaf41980 (data+wiring)                  | **Quelle:** 22 CFR 121.1 **Category IV** ("Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets, Torpedoes, Bombs, and Mines") via eCFR **versioner-API** (curl, frei+amtlich; Website redirectet zu unblock-Seite → API genutzt), title-22 **issue date 2026-06-09** (up-to-date 2026-06-10). **Entries 66** in `src/data/trade/usml-iv.ts` (paragraph-keyed wie `usml-xv-e.ts`): (a)+(a)(1–12), (b)+(b)(1–2), (c)+(c)(1–2), (d)+(d)(1–7), (e)-(f) reserved, (g), (h)+(h)(1–30) inkl. (h)(30)(i/ii/iii), (i), (j)-(w) reserved, (x). Launch/Rakete/(h)-Parts auf voller Tiefe; Torpedo/Mine/Bombe/MANPADS headline-depth + ehrliche `coverage.excluded` (5 Einträge). **SME (`itarSME`) = 29**, exakt entlang der eCFR-Sterne: `* (a)/(b)/(d)/(g)` (Stern auf der Headline ⇒ alle nummerierten Sub-Paras erben SME) + `* (h)(30)`(+i/ii/iii); (c)/(h)-Parent/(h)(1–29)/(i)/(x) NICHT SME (keine Fabrikation). **Wiring:** `adaptUsmlXv` minimal parametrisiert (`opts.regime`/`depthTier`, Default = XV ⇒ 4 Bestands-Calls byte-identisch); Cat IV nutzt **regime `USML`** mit `USML:IV(...)`-Keys, **VOR `usml.ts` einsortiert** ⇒ die 6 überlappenden Coarse-Codes (IV(a)(1),IV(b),IV(c),IV(d)(1),IV(d)(2),IV(h)(1)) werden vom De-Dup zugunsten der Paragraph-Tiefe superseded (usml.ts bleibt intakt für `findUsmlEntry`). Union 1042 Einträge, 0 Dupes. **Maturity-Entscheidung: `REGIME_MATURITY.USML` 2→1** — Cat IV + Cat XV jetzt beide paragraph-deep (Rest des USML-Regimes = periphere XI/XII-Cross-Refs). **SICHER für Golden-Set:** kein circle-A-Origin hat `dualUsePrimary===USML` (US-Dual-Use-Bein = EAR_CCL→US_CCL, Tier 2), `isThinOrigin` liest NUR `dualUsePrimary` ⇒ Lift kippt keine Thin-Origin-Zelle. **Prädikate: KEINE neuen nötig** — die einzigen harten Cat-IV-Tripwires (a)(1) (range≥300∧payload≥500), (a)(2)≈`MTCR:Item-19.A.1` (range≥300 ohne Payload-Floor, S1), (d)(2) (≥1.1e6 Ns), (d)(3) (8.41e5–1.1e6 Ns) existieren bereits im Cross-Walk; alle übrigen Paras sind kategorial „specially designed". **Golden-Set UNVERÄNDERT** (744 Zellen, **74/396/274**, 0 Flips — die 12 Items deklarieren keine Cat-IV-`usmlCategory`, `matchDeclaredCodes` feuert nur auf deklarierte Codes; Verteilung per Spike vor Commit bestätigt). Maturity-Test um „USML tier 1 after S2"-Assertion ergänzt. **Tests:** usml-iv.test.ts 19 (RED→GREEN) + normalized-corpus.test.ts 14 (inkl. neue USML-Assertion). Volle Trade-Suite **2640✅** (62 Files). **tsc-Baseline 674 gehalten** (0 neue Fehler in berührten Dateien). Commit (2) golden/header NICHT nötig (keine Flips). Beweis-Spike: declared `IV(d)(2)` → `matchDeclaredCodes` löst auf `USML:IV(d)(2)` (ITAR+SME, exact-code) auf — neuer Korpus ist im Matching-Pfad, nicht nur präsent. |
| S3 — UK_STRATEGIC (Tier 2)                | ⬜            | —                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S4 — EU_CML (Tier 1/2)                    | ⬜            | —                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S5 — Mirror: CH/NO/CA/AU/KR + Wassenaar-9 | ⬜            | —                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S6 — JP/IN vertiefen (+KR-Rest)           | ⬜            | —                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S7 — Frische-Audit + Doku + Score         | ⬜            | —                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Legende: ⬜ offen · 🟡 läuft · ✅ fertig

---

## Datei-Landkarte (was entsteht/ändert sich wo)

**Sprint 0 (Engine + Messlatte):**

- Create: `src/lib/comply-v2/trade/classification/origin-regime-map.ts` (+`.test.ts`) — pure Map Origin→Regime
- Create: `src/lib/trade/exporter-seat.ts` (+`.test.ts`) — Sitz-Auflösung aus `Organization.billingAddress`
- Create: `src/lib/comply-v2/trade/classification/golden-set/space-items.ts` — 12 Referenz-Items
- Create: `src/lib/comply-v2/trade/classification/golden-set/golden-set.test.ts` — Matrix-Harness
- Modify: `src/data/trade/normalized-corpus.ts` — `CorpusRegime`-Union +7, Mirror-Felder, `depthTier`, `REGIME_MATURITY`
- Modify: `src/lib/comply-v2/trade/classification/order-of-review.ts` — `ListId` +6, optionaler Origin-Parameter
- Modify: `src/lib/comply-v2/trade/license-determination.ts` — Fail-Closed-Gate „dünne Origin-Abdeckung" (additiv, Gate-3.5-Muster)
- Modify: `src/lib/trade/operation-assistant.server.ts` + `operation-assistant-verdict.ts` — Origin-Pendenz + Verdict-Zeile
- Modify: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx` — Zeile „bewertet unter <Regime>"

**S1–S6 (Daten, je Sprint):** Create `src/data/trade/<regime-datei>.ts` (+ Invarianten-`.test.ts`), Modify `normalized-corpus.ts` (Import+Adapter), ggf. Modify `control-list-cross-walk.ts` (Tier-1-Prädikate), Update Golden-Set-Erwartungen.

**S7:** Create `scripts/trade-corpus-freshness.ts`; Modify Spec-/Plan-Statusboards, `src/data/trade/eu-annex-i.ts` (stale Header).

---

# SPRINT 0 — Origin-Routing, Fail-Closed, Golden Set 🔴 ZUERST

**Akzeptanz (aus Spec §5/S0):** Golden Set läuft in CI (Mindest-Strenge grün) · unbekanntes Origin/dünne Abdeckung ⇒ REVIEW testbewiesen · Bestands-EU/DE/US-Flows verhaltensgleich (volle Trade-Suite grün, tsc-Baseline unverändert) · AVA zeigt „bewertet unter <Regime>".

### Task 1: `origin-regime-map.ts` — pure Origin→Regime-Map

**Files:**

- Create: `src/lib/comply-v2/trade/classification/origin-regime-map.ts`
- Test: `src/lib/comply-v2/trade/classification/origin-regime-map.test.ts`

- [ ] **Step 1.1: Failing Test schreiben**

```ts
import { describe, expect, it } from "vitest";
import { originRegimes, KREIS_A_ISO2 } from "./origin-regime-map";

describe("originRegimes", () => {
  it("routes UK to UK_STRATEGIC as dual-use AND military primary", () => {
    const r = originRegimes("GB");
    expect(r.supported).toBe(true);
    expect(r.dualUsePrimary).toBe("UK_STRATEGIC");
    expect(r.militaryPrimary).toBe("UK_STRATEGIC");
  });

  it("routes every EU-27 member to EU_ANNEX_I + EU_CML", () => {
    for (const iso of ["DE", "FR", "MT", "BG", "CY"]) {
      const r = originRegimes(iso);
      expect(r.supported).toBe(true);
      expect(r.dualUsePrimary).toBe("EU_ANNEX_I");
      expect(r.militaryPrimary).toBe("EU_CML");
    }
  });

  it("routes US to EAR_CCL dual-use and USML military", () => {
    const r = originRegimes("US");
    expect(r.dualUsePrimary).toBe("EAR_CCL");
    expect(r.militaryPrimary).toBe("USML");
  });

  it("marks non-circle-A origins unsupported (fail-closed input)", () => {
    for (const iso of ["BR", "CN", "IL", "ZZ"]) {
      expect(originRegimes(iso).supported).toBe(false);
    }
  });

  it("is case/whitespace tolerant and never throws", () => {
    expect(originRegimes(" gb ").dualUsePrimary).toBe("UK_STRATEGIC");
    expect(originRegimes("").supported).toBe(false);
    expect(originRegimes(null).supported).toBe(false);
  });

  it("KREIS_A_ISO2 enthält genau die 10 Origin-Blöcke (EU als 27 Länder)", () => {
    // 27 EU + GB,US,CH,NO,CA,JP,AU,KR,IN = 36 ISO-Codes
    expect(KREIS_A_ISO2.size).toBe(36);
  });

  it("multilateralBaseline ist für jedes unterstützte Origin nicht-leer und enthält MTCR", () => {
    for (const iso of ["DE", "GB", "US", "JP", "IN"]) {
      expect(originRegimes(iso).multilateralBaseline).toContain("MTCR");
    }
  });
});
```

- [ ] **Step 1.2: Test laufen lassen → MUSS fehlschlagen** (Modul existiert nicht)

Run: `npx vitest run src/lib/comply-v2/trade/classification/origin-regime-map.test.ts`
Expected: FAIL `Cannot find module './origin-regime-map'`

- [ ] **Step 1.3: Implementierung**

```ts
/**
 * Origin→Regime-Routing (Spec 2026-06-12 §4.2).
 *
 * BEGRIFFSTRENNUNG (verbindlich, Lehre aus T-H6):
 *   Exporteur-SITZ (Org-Profil-Land)  → bestimmt das anwendbare Ausfuhrrecht (DIESE Map).
 *   Item-countryOfOrigin              → füttert NUR Re-Export-Logik (De-minimis/FDPR).
 *
 * Pure data — kein I/O, kein Prisma, kein AI-Call.
 */
import type { ListId } from "./order-of-review";
import { EU27_MEMBER_STATES } from "../eu-member-states";

export interface OriginRegimeRouting {
  /** Primäres Dual-Use-Regime des Origins (trägt das Verdict). */
  dualUsePrimary: ListId;
  /** Primäres Militärgüter-Regime; null = (noch) keines im Korpus modelliert. */
  militaryPrimary: ListId | null;
  /** Informational, NIE primär — bestehende order-of-review-Architektur. */
  multilateralBaseline: readonly ListId[];
  /** false ⇒ Fail-Closed-Regel 4.3b (REVIEW „Origin nicht unterstützt"). */
  supported: boolean;
}

const MULTILATERAL: readonly ListId[] = ["WASSENAAR", "MTCR", "NSG", "AG"];

const NON_EU_ROUTES: Record<
  string,
  Omit<OriginRegimeRouting, "multilateralBaseline" | "supported">
> = {
  GB: { dualUsePrimary: "UK_STRATEGIC", militaryPrimary: "UK_STRATEGIC" },
  US: { dualUsePrimary: "EAR_CCL", militaryPrimary: "USML" },
  CH: { dualUsePrimary: "CH_GKV", militaryPrimary: null },
  NO: { dualUsePrimary: "NO_LIST", militaryPrimary: null },
  CA: { dualUsePrimary: "CA_ECL", militaryPrimary: null },
  JP: { dualUsePrimary: "JP_METI", militaryPrimary: null },
  AU: { dualUsePrimary: "AU_DSGL", militaryPrimary: null },
  KR: { dualUsePrimary: "KR_STRATEGIC", militaryPrimary: null },
  IN: { dualUsePrimary: "IN_SCOMET", militaryPrimary: null },
};

/** Alle Kreis-A-ISO2 (EU-27 ausgerollt + 9 weitere). */
export const KREIS_A_ISO2: ReadonlySet<string> = new Set([
  ...EU27_MEMBER_STATES,
  ...Object.keys(NON_EU_ROUTES),
]);

const UNSUPPORTED: OriginRegimeRouting = {
  dualUsePrimary: "EU_ANNEX_I", // nie konsumiert: supported=false gewinnt überall
  militaryPrimary: null,
  multilateralBaseline: MULTILATERAL,
  supported: false,
};

export function originRegimes(
  originIso2: string | null | undefined,
): OriginRegimeRouting {
  const iso = (originIso2 ?? "").trim().toUpperCase();
  if (!iso) return UNSUPPORTED;
  if (EU27_MEMBER_STATES.has(iso)) {
    return {
      dualUsePrimary: "EU_ANNEX_I",
      militaryPrimary: "EU_CML",
      multilateralBaseline: MULTILATERAL,
      supported: true,
    };
  }
  const route = NON_EU_ROUTES[iso];
  if (!route) return UNSUPPORTED;
  return { ...route, multilateralBaseline: MULTILATERAL, supported: true };
}
```

HINWEIS: kompiliert erst nach Task 2 (neue `ListId`-Member). Reihenfolge unten beachten — Task 2 VOR dem GREEN-Lauf von Task 1 ziehen, falls tsc im Weg ist; Tests beider Tasks gemeinsam grün ziehen ist ok (ein RED-Commitpunkt, ein GREEN-Commitpunkt).

- [ ] **Step 1.4: Test grün** — Run wie 1.2, Expected: PASS (ggf. erst nach Task 2 Step 2.3)
- [ ] **Step 1.5: Commit** `git add -A && git commit -m "feat(trade): origin-regime map — circle-A routing foundation (S0)"`

### Task 2: `ListId` +6 neue Regime + `normalizeListId`-Erweiterung

**Files:**

- Modify: `src/lib/comply-v2/trade/classification/order-of-review.ts` (ListId-Union ~`:91`, `normalizeListId` ~`:412`, `NATIONAL_SUPPLEMENTAL`-Set ~`:195`)
- Test: bestehende `order-of-review.test.ts` ERWEITERN (nicht neu anlegen)

- [ ] **Step 2.1: Failing Tests** — in `order-of-review.test.ts` anhängen:

```ts
describe("S0: new circle-A regimes in ListId", () => {
  it("normalizeListId resolves the seven new regime tags (hyphenierte RegimeName-Konvention wie die bestehenden Cases — KEINE Prosa-Strings; Review-Finding 2026-06-12: Prosa wäre toter Code + fail-open, sobald S4/S5 echte Tags emittieren)", () => {
    expect(normalizeListId("EU-CML")).toBe("EU_CML");
    expect(normalizeListId("CA-ECL")).toBe("CA_ECL");
    expect(normalizeListId("AU-DSGL")).toBe("AU_DSGL");
    expect(normalizeListId("KR-STRATEGIC")).toBe("KR_STRATEGIC");
    expect(normalizeListId("CH-GKV")).toBe("CH_GKV");
    expect(normalizeListId("NO-LIST")).toBe("NO_LIST");
    expect(normalizeListId("IN-SCOMET")).toBe("IN_SCOMET");
  });
  it("new national lists are supplemental by default (no origin given)", () => {
    const r = resolveOrderOfReview([
      { list: "EU_ANNEX_I", entry: "9A004", citation: "Reg. 2021/821 Annex I" },
      { list: "CA_ECL", entry: "9-15", citation: "ECL Group 9" },
    ]);
    expect(r.primaryAuthority?.list).toBe("EU_ANNEX_I");
    expect(r.parallelLists.map((m) => m.list)).toContain("CA_ECL");
  });
});
```

- [ ] **Step 2.2: RED bestätigen** — `npx vitest run src/lib/comply-v2/trade/classification/order-of-review.test.ts` → FAIL (TS-Fehler/`null`)
- [ ] **Step 2.3: GREEN** — In der `ListId`-Union ergänzen (mit Doc-Kommentar je Zeile, Muster der Datei): `"EU_CML" | "CA_ECL" | "AU_DSGL" | "KR_STRATEGIC" | "CH_GKV" | "NO_LIST" | "IN_SCOMET"`. Alle 7 in `NATIONAL_SUPPLEMENTAL` aufnehmen (Default ohne Origin = heutiges Verhalten). In `normalizeListId` die Erkennungs-Muster ergänzen (bestehendes match-Muster der Funktion fortschreiben, z. B. `/common military/i → "EU_CML"`, `/canada|ECL/i`-Vorsicht: exakt wie die Funktion heute arbeitet — erst lesen, Muster spiegeln).
- [ ] **Step 2.4: PASS** wie 2.2 + Task-1-Test jetzt grün (`npx vitest run src/lib/comply-v2/trade/classification/`)
- [ ] **Step 2.5: Commit** `feat(trade): six new circle-A list ids, supplemental by default (S0)`

### Task 3: Origin-Parameter für `resolveOrderOfReview` (additiv)

**Files:** Modify `order-of-review.ts` (Signatur `:235`), Test in `order-of-review.test.ts`

- [ ] **Step 3.1: Failing Tests**

```ts
import { originRegimes } from "./origin-regime-map";

describe("S0: origin-aware order of review", () => {
  const ukMatch = {
    list: "UK_STRATEGIC" as const,
    entry: "PL9009",
    citation: "UK SECL",
  };
  const euMatch = {
    list: "EU_ANNEX_I" as const,
    entry: "9A004",
    citation: "Reg. 2021/821",
  };

  it("promotes the ORIGIN's national list to primary (GB exporter)", () => {
    const r = resolveOrderOfReview([euMatch, ukMatch], {
      origin: originRegimes("GB"),
    });
    expect(r.primaryAuthority?.list).toBe("UK_STRATEGIC");
    expect(r.parallelLists.map((m) => m.list)).toContain("EU_ANNEX_I");
  });

  it("keeps FOREIGN national lists supplemental (DE exporter, UK match)", () => {
    const r = resolveOrderOfReview([euMatch, ukMatch], {
      origin: originRegimes("DE"),
    });
    expect(r.primaryAuthority?.list).toBe("EU_ANNEX_I");
  });

  it("without origin param behaves byte-identical to today (regression)", () => {
    const before = resolveOrderOfReview([euMatch, ukMatch]);
    expect(before.primaryAuthority?.list).toBe("EU_ANNEX_I");
  });

  it("multilateral stays baseline even when it is the origin's only match", () => {
    const r = resolveOrderOfReview(
      [{ list: "MTCR", entry: "1.A.1", citation: "MTCR Annex" }],
      { origin: originRegimes("GB") },
    );
    expect(r.primaryAuthority).toBeNull();
    expect(r.multilateralBaseline).toHaveLength(1);
  });
});
```

- [ ] **Step 3.2: RED** → FAIL (zweites Argument unbekannt)
- [ ] **Step 3.3: GREEN** — Signatur additiv: `resolveOrderOfReview(matches, opts?: { origin?: OriginRegimeRouting })`. Logik: wenn `opts?.origin?.supported` und ein Match `list === origin.dualUsePrimary || list === origin.militaryPrimary` existiert ⇒ dieses Match wird primär-eligibel BEVOR die bestehende Präzedenz greift; fremde nationale Listen bleiben im `NATIONAL_SUPPLEMENTAL`-Pfad. `MULTILATERAL_LISTS` bleibt unangetastet (nie primär). Rationale-Text um Origin-Begründung ergänzen („primary chosen because exporter seat = GB → UK_STRATEGIC governs").
- [ ] **Step 3.4: PASS** — gesamte Datei-Suite: `npx vitest run src/lib/comply-v2/trade/classification/order-of-review.test.ts`
- [ ] **Step 3.5: Commit** `feat(trade): origin-aware primary selection in order-of-review (S0, additive)`

### Task 4: `REGIME_MATURITY` + Mirror-/Tier-Felder im Korpus-Typ

**Files:** Modify `src/data/trade/normalized-corpus.ts`; Test `src/data/trade/normalized-corpus.test.ts` erweitern

- [ ] **Step 4.1: Failing Tests**

```ts
import { REGIME_MATURITY, type CorpusRegime } from "./normalized-corpus";

describe("S0: regime maturity (fail-closed input)", () => {
  it("declares a tier for EVERY CorpusRegime incl. the 7 new ones", () => {
    const expected: CorpusRegime[] = [
      "US_CCL",
      "USML",
      "MTCR_ANNEX",
      "DE_ANLAGE_AL",
      "USML_XV",
      "WASSENAAR",
      "JP_METI",
      "IN_SCOMET",
      "DE_AUSFUHRLISTE",
      "EU_ANNEX_I",
      "NSG",
      "RU_833",
      "UK_STRATEGIC",
      "EU_CML",
      "CA_ECL",
      "AU_DSGL",
      "KR_STRATEGIC",
      "CH_GKV",
      "NO_LIST",
    ];
    for (const r of expected) expect([1, 2, 3]).toContain(REGIME_MATURITY[r]);
  });
  it("not-yet-curated regimes are tier 3 (forces REVIEW)", () => {
    for (const r of [
      "UK_STRATEGIC",
      "EU_CML",
      "CA_ECL",
      "AU_DSGL",
      "KR_STRATEGIC",
      "CH_GKV",
      "NO_LIST",
    ] as const) {
      expect(REGIME_MATURITY[r]).toBe(3);
    }
  });
  it("USML_XV stays tier 1, EU_ANNEX_I tier 2", () => {
    expect(REGIME_MATURITY.USML_XV).toBe(1);
    expect(REGIME_MATURITY.EU_ANNEX_I).toBe(2);
  });
});
```

- [ ] **Step 4.2: RED** → `npx vitest run src/data/trade/normalized-corpus.test.ts` FAIL
- [ ] **Step 4.3: GREEN** — In `normalized-corpus.ts`: (a) `CorpusRegime`-Union um die 7 neuen Codes erweitern; (b) optionale Felder auf `NormalizedCorpusEntry`: `depthTier?: 1 | 2 | 3`, `mirrorsCanonicalId?: string`, `mirrorDelta?: "NONE" | "MODIFIED" | "NATIONAL_ONLY"`; (c) exportierte Konstante:

```ts
/** Kuratierungs-Reife je Regime. 3 = headline/leer ⇒ Fail-Closed-Regel 4.3a (REVIEW). */
export const REGIME_MATURITY: Record<CorpusRegime, 1 | 2 | 3> = {
  USML_XV: 1,
  USML: 2,
  US_CCL: 2,
  EU_ANNEX_I: 2,
  RU_833: 2,
  NSG: 2,
  WASSENAAR: 2,
  MTCR_ANNEX: 3,
  DE_ANLAGE_AL: 3,
  DE_AUSFUHRLISTE: 3,
  JP_METI: 3,
  IN_SCOMET: 3,
  UK_STRATEGIC: 3,
  EU_CML: 3,
  CA_ECL: 3,
  AU_DSGL: 3,
  KR_STRATEGIC: 3,
  CH_GKV: 3,
  NO_LIST: 3,
};
```

(MTCR=3 ist BEWUSST: 9 Einträge sind headline — S1 hebt auf 1. Jeder Daten-Sprint hebt seine Zahl + diesen Test.)

- [ ] **Step 4.4: PASS** + Union-Eindeutigkeits-Invariante der Datei weiter grün
- [ ] **Step 4.5: Commit** `feat(trade): regime maturity map + mirror/tier fields on corpus entries (S0)`

### Task 5: Exporteur-Sitz-Resolver

**Files:** Create `src/lib/trade/exporter-seat.ts` + `exporter-seat.test.ts`

- [ ] **Step 5.1: Failing Tests**

```ts
import { resolveExporterSeat } from "./exporter-seat";

describe("resolveExporterSeat", () => {
  it("reads billingAddress.country as ISO-2", () => {
    expect(resolveExporterSeat({ billingAddress: { country: "FR" } })).toBe(
      "FR",
    );
    expect(resolveExporterSeat({ billingAddress: { country: " gb " } })).toBe(
      "GB",
    );
  });
  it("maps common full names defensively", () => {
    expect(
      resolveExporterSeat({ billingAddress: { country: "Germany" } }),
    ).toBe("DE");
    expect(
      resolveExporterSeat({ billingAddress: { country: "Deutschland" } }),
    ).toBe("DE");
    expect(
      resolveExporterSeat({ billingAddress: { country: "United Kingdom" } }),
    ).toBe("GB");
  });
  it("returns null when absent/unparseable — NIE ein Default-Land erfinden", () => {
    expect(resolveExporterSeat({ billingAddress: null })).toBeNull();
    expect(resolveExporterSeat({})).toBeNull();
    expect(
      resolveExporterSeat({ billingAddress: { country: "Atlantis" } }),
    ).toBeNull();
  });
});
```

- [ ] **Step 5.2: RED** → FAIL
- [ ] **Step 5.3: GREEN** — pure Funktion: `billingAddress` ist Prisma-JSON (Muster aus `src/lib/trade/bafa/applicant-from-org.ts:78` spiegeln, ABER ohne dessen `?? "DE"`-Fallback — der ist BAFA-spezifisch korrekt, hier wäre er ein stiller false-Origin). ISO-2 direkt; kleine Namens-Map (DE/EN-Namen der Kreis-A-Länder); sonst `null`.
- [ ] **Step 5.4: PASS** → **Step 5.5: Commit** `feat(trade): exporter-seat resolver, no silent country default (S0)`

### Task 6: AVA — Origin-Pendenz + „bewertet unter"-Zeile (fail-closed b, Notice bei unbekanntem Sitz)

**Files:** Modify `src/lib/trade/operation-assistant.server.ts` (Org-Fetch ~`:54`, Verdict-Bau ~`:155`), `src/lib/trade/operation-assistant-verdict.ts` (VerdictResult-Interface), `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx`; Tests: bestehende `operation-assistant*` Test-Dateien erweitern

- [ ] **Step 6.1: Failing Tests** (in der bestehenden Server-Test-Datei; Prisma-Mocks wie dort üblich):

```ts
it("unsupported exporter seat (BR) yields a REVIEW pendenz, never GO", async () => {
  mockOrg({ billingAddress: { country: "BR" } });
  const res = await assessOperation(opId, { organizationId });
  expect(res.verdict).not.toBe("GO");
  expect(res.pendenzen.some((p) => p.id === "origin-unsupported")).toBe(true);
});

it("unknown seat (null) does NOT change today's verdict — adds only a notice", async () => {
  mockOrg({ billingAddress: null });
  const res = await assessOperation(opId, { organizationId });
  expect(res.originNotice).toMatch(/Sitz.*nicht gesetzt/i);
  // verdict identisch zum bisherigen Snapshot dieses Fixtures (Regression):
  expect(res.verdict).toBe(verdictBeforeS0ForThisFixture);
});

it("supported seat (DE) → assessedUnder shows the origin regime, no new pendenz", async () => {
  mockOrg({ billingAddress: { country: "DE" } });
  const res = await assessOperation(opId, { organizationId });
  expect(res.assessedUnder).toBe("EU_ANNEX_I");
  expect(res.pendenzen.some((p) => p.id.startsWith("origin-"))).toBe(false);
});
```

- [ ] **Step 6.2: RED** → FAIL (Felder existieren nicht)
- [ ] **Step 6.3: GREEN** — `assessOperation`: Org mit `billingAddress` laden (Query erweitern), `resolveExporterSeat` + `originRegimes`; Ergebnis-Felder `assessedUnder: ListId | null`, `originNotice?: string` ergänzen; bei `supported === false` eine Pendenz `{ id: "origin-unsupported", label: "Exporteur-Sitz <ISO> wird noch nicht unterstützt — manuelle Prüfung", … }` in den bestehenden Gap-Pfad geben (bestehende deriveVerdict-Regel „gap ⇒ REVIEW" greift — KEINE Änderung an deriveVerdict selbst). `null`-Sitz: NUR `originNotice`, kein Gap (Verhaltensgleichheit). VerdictPanel: eine Zeile `Bewertet unter: {assessedUnder ?? "EU (Standard)"}` + Notice-Text dezent (`text-small`, bestehende Token).
- [ ] **Step 6.4: PASS** + komplette AVA-Suite: `npx vitest run src/lib/trade/`
- [ ] **Step 6.5: Commit** `feat(trade): AVA origin pendenz + assessed-under line, null-seat stays behavior-equal (S0)`

### Task 7: Fail-Closed a — dünne Origin-Abdeckung in der Determination

**Files:** Modify `src/lib/comply-v2/trade/license-determination.ts` (Gate-3.5-Nachbarschaft — erst Datei lesen, Muster spiegeln); Test: dortige `.test.ts` erweitern

- [ ] **Step 7.1: Failing Tests**

```ts
it("GB exporter + matched item area, UK regime maturity 3 ⇒ REQUIRES_REVIEW (never CLEARED)", () => {
  const res = determineLicenseRequirements({
    ...baseInput, // bestehendes Fixture der Datei wiederverwenden
    exporterOrigin: originRegimes("GB"),
    matches: [
      { list: "EU_ANNEX_I", entry: "9A004", citation: "Reg. 2021/821" },
    ],
  });
  expect(res.outcome).not.toBe("CLEARED");
  expect(res.reasons.join(" ")).toMatch(
    /UK.*noch nicht tief|not yet deeply covered/i,
  );
});

it("DE exporter, same input ⇒ result unchanged vs. pre-S0 snapshot (regression)", () => {
  const res = determineLicenseRequirements({
    ...baseInput,
    exporterOrigin: originRegimes("DE"),
  });
  expect(res).toEqual(preS0SnapshotForBaseInput);
});

it("no exporterOrigin passed ⇒ byte-identical legacy behavior", () => {
  expect(determineLicenseRequirements(baseInput)).toEqual(
    preS0SnapshotForBaseInput,
  );
});
```

- [ ] **Step 7.2: RED** → FAIL (Param unbekannt)
- [ ] **Step 7.3: GREEN** — additiver optionaler Input `exporterOrigin?: OriginRegimeRouting`. Regel (NUR verschärfend, nie lockernd — Gate-3.5-Prinzip): wenn `exporterOrigin.supported` und `REGIME_MATURITY[primärem Origin-Regime] === 3` und das Item überhaupt kontrolliert-verdächtig ist (≥1 Match irgendeiner Liste ODER deklarierter Code), dann Outcome mindestens REQUIRES_REVIEW mit Klartext-Reason. Mapping `ListId → CorpusRegime` als kleine lokale Tabelle (EAR_CCL→US_CCL, EU_ANNEX_I→EU_ANNEX_I, UK_STRATEGIC→UK_STRATEGIC, …).
- [ ] **Step 7.4: PASS** — gesamte Determination-Suite (Memory: 77+ Tests) grün
- [ ] **Step 7.5: Commit** `feat(trade): fail-closed review on thin origin-regime coverage (S0, tightening-only)`

### Task 8: Golden-Set-Items (Daten) — die 12 Referenz-Items

**Files:** Create `src/lib/comply-v2/trade/classification/golden-set/space-items.ts`

- [ ] **Step 8.1: Datei anlegen** (Daten, kein RED nötig — der Harness in Task 9 ist der Test):

```ts
/**
 * Golden Set — 12 repräsentative Space-Items (Spec §4.4).
 * Attribute realistisch, aber FIKTIV (keine Kundendaten). Erwartungen
 * je Origin×Dest stehen im Harness, nicht hier.
 */
export interface GoldenItem {
  id: string;
  name: string;
  description: string;
  /** Attribut-Shape wie ItemSignals/classify-item es konsumiert. */
  attributes: Record<string, string | number | boolean>;
  declaredCodes?: { eccnUS?: string; eccnEU?: string; usmlCategory?: string };
}

export const GOLDEN_ITEMS: readonly GoldenItem[] = [
  {
    id: "sat-bus",
    name: "500kg LEO Satellitenbus",
    description:
      "Kommerzieller Smallsat-Bus, 3-Achsen-stabilisiert, S-Band TT&C",
    attributes: { massKg: 500, orbit: "LEO", radiationHardened: true },
  },
  {
    id: "eo-sar",
    name: "SAR-Payload X-Band",
    description: "Synthetic-Aperture-Radar Nutzlast, 1m Auflösung",
    attributes: { sensorType: "SAR", resolutionM: 1.0, band: "X" },
  },
  {
    id: "eo-optical",
    name: "Optische EO-Kamera 0.5m",
    description: "Pushbroom-Imager, GSD 0.5m",
    attributes: { sensorType: "OPTICAL", resolutionM: 0.5 },
  },
  {
    id: "hall-thruster",
    name: "Hall-Effekt-Triebwerk 5kW",
    description: "Elektrisches Triebwerk, Xenon, 300mN",
    attributes: { propulsion: "ELECTRIC", thrustNewtons: 0.3, powerKw: 5 },
  },
  {
    id: "apogee-engine",
    name: "Chemisches Apogäums-Triebwerk",
    description: "Bipropellant 400N MMH/NTO",
    attributes: { propulsion: "CHEMICAL_BIPROP", thrustNewtons: 400 },
  },
  {
    id: "star-tracker",
    name: "Sternsensor",
    description: "Star tracker, 10 arcsec, strahlungstolerant",
    attributes: { sensorType: "STAR_TRACKER", accuracyArcsec: 10 },
  },
  {
    id: "reaction-wheel",
    name: "Reaktionsrad 1 Nms",
    description: "Drallrad für 3-Achsen-Stabilisierung",
    attributes: { momentumNms: 1, componentClass: "AOCS" },
  },
  {
    id: "ground-tt-c",
    name: "TT&C-Bodenstation mit Krypto",
    description: "Uplink-Verschlüsselung AES-256, Bandbreite 50 Mbps",
    attributes: { cryptoAes: 256, groundSegment: true },
  },
  {
    id: "launcher-tank",
    name: "Composite-Treibstofftank (Launcher)",
    description: "CFK-Druckbehälter für Trägerstufe, 2.4m",
    attributes: { material: "CFRP", diameterM: 2.4, launchVehiclePart: true },
  },
  {
    id: "flight-sw",
    name: "Flight Software AOCS",
    description: "Lageregelungs-Software, exportierbar als Quellcode",
    attributes: { itemClass: "SOFTWARE", domain: "AOCS" },
  },
  {
    id: "radhard-obc",
    name: "Rad-hard OBC",
    description: "Strahlungsgehärteter Bordcomputer, SEL-immun",
    attributes: {
      radiationHardened: true,
      componentClass: "OBC",
      totalDoseKrad: 100,
    },
  },
  {
    id: "prepreg",
    name: "Carbon-Prepreg T800-Klasse",
    description: "Hochmodul-CFK-Prepreg für Strukturen",
    attributes: { material: "CARBON_PREPREG", fibreClass: "T800" },
  },
];
```

(Exakte Attribut-Schlüssel beim Implementieren an `classify-item.ts`/`ItemSignals` angleichen — erst lesen, dann Schlüssel exakt setzen. Die Item-LISTE ist fix.)

- [ ] **Step 8.2: Commit** `feat(trade): golden-set space items (S0 data)`

### Task 9: Golden-Set-Harness (Matrix-Test, Mindest-Strenge)

**Files:** Create `src/lib/comply-v2/trade/classification/golden-set/golden-set.test.ts`

- [ ] **Step 9.1: Harness schreiben (DAS ist der Test — er muss beim ersten Vollauf GRÜN sein, weil S0 fail-closed liefert):**

```ts
import { describe, expect, it } from "vitest";
import { GOLDEN_ITEMS } from "./space-items";
import { originRegimes, KREIS_A_ISO2 } from "../origin-regime-map";
// Pipeline-Imports beim Implementieren exakt setzen (classify-item → cross-walk →
// resolveOrderOfReview(origin) → determineLicenseRequirements) — Task liest die echten Exporte.

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

/** Severity-Ordnung: GO < REVIEW < BLOCKED. */
const SEV = { GO: 0, REVIEW: 1, BLOCKED: 2 } as const;
function expectAtLeast(
  actual: keyof typeof SEV,
  min: keyof typeof SEV,
  label: string,
) {
  expect(SEV[actual], label).toBeGreaterThanOrEqual(SEV[min]);
}

/** Exakte Erwartungen NUR wo der Rechtstext eindeutig ist; sonst Mindest-Strenge. */
const EXACT: Record<string, keyof typeof SEV> = {
  // Beispiele — beim Implementieren je Fall mit Quelle im Kommentar belegen:
  "apogee-engine|DE|RU": "BLOCKED", // Reg. 833/2014 + Dual-Use → Embargo
  "sat-bus|DE|RU": "BLOCKED",
};
const MIN_BY_DEST_CLASS: Record<
  (typeof DESTS)[number]["cls"],
  keyof typeof SEV
> = {
  INTRA_EU: "GO", // intra-EU darf GO sein (kein Zwangs-REVIEW)
  US: "GO",
  FRIENDLY: "GO",
  IN: "GO",
  CN: "REVIEW", // kontrollierte Space-Güter nach CN: nie stilles GO
  EMBARGO: "REVIEW", // mindestens; meist BLOCKED via EXACT
};

describe("GOLDEN SET — space items × circle-A origins × destination classes", () => {
  for (const item of GOLDEN_ITEMS) {
    for (const origin of ORIGINS) {
      for (const dest of DESTS) {
        if (origin === dest.iso) continue; // Inlandslieferung: kein Exportfall
        it(`${item.id} | ${origin}→${dest.iso}`, () => {
          const verdict = runPipeline(item, origin, dest.iso); // Helper unten im File
          const key = `${item.id}|${origin}|${dest.iso}`;
          if (EXACT[key]) expect(verdict).toBe(EXACT[key]);
          else expectAtLeast(verdict, MIN_BY_DEST_CLASS[dest.cls], key);
          // Fail-Closed-Garantie: Origin mit Tier-3-Primärregime ⇒ nie GO für kontrollverdächtige Items
          if (
            originRegimes(origin).supported &&
            isThinOrigin(origin) &&
            itemLooksControlled(item)
          ) {
            expect(verdict).not.toBe("GO");
          }
        });
      }
    }
  }

  it("every circle-A origin is supported by the map", () => {
    for (const o of ORIGINS) expect(originRegimes(o).supported).toBe(true);
  });
});
```

- [ ] **Step 9.2: Vollauf** — `npx vitest run src/lib/comply-v2/trade/classification/golden-set/` → Expected: PASS (~700 Fälle nach Pruning `origin===dest`; Laufzeit prüfen, bei >30s die Matrix per `it.each`-Chunking beibehalten, NICHT kürzen)
- [ ] **Step 9.3: Falls einzelne Fälle GO liefern, wo Mindest-Strenge REVIEW verlangt:** Das ist ein ECHTER S0-Befund — Fail-Closed-Lücke in Task 6/7 schließen (nicht die Erwartung weichspülen). Erst dann grün.
- [ ] **Step 9.4: Commit** `test(trade): golden-set matrix harness — international fail-closed proven (S0)`

### Task 10: S0-Abschluss — Regression, tsc-Baseline, Status

- [ ] **Step 10.1:** Volle Trade-Suiten: `npx vitest run src/lib/comply-v2/trade src/lib/trade src/data/trade` → alles grün
- [ ] **Step 10.2:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep -c "error TS"` → Zahl == in §0 notierter Baseline (0 neue)
- [ ] **Step 10.3:** Statusboard §0 hier + Master-Plan §4 (`docs/superpowers/plans/2026-05-30-caelex-trade-to-92-MASTER.md`) um Zeile „Space-International S0 ✅" ergänzen
- [ ] **Step 10.4: Commit** `chore(trade): S0 wrap — boards updated, baselines proven`

---

# DATEN-SPRINTS S1–S6 — gemeinsamer Workflow (gilt für JEDEN Daten-Sprint)

Jeder Daten-Sprint folgt EXAKT diesem 8-Schritte-Workflow (Vorlage: `src/data/trade/eu-annex-i-cat1-2.ts` für Code-Ebene, `src/data/trade/usml-xv-e.ts` für Paragraph-Ebene). Die Sprint-Blöcke darunter geben nur die Parameter.

- [ ] **W1 — Quelle ziehen (amtlich, gratis):** Quelle aus dem Sprint-Block via WebFetch/Read laden. NUR diese Quelle. Abschnitts-/Positionsliste extrahieren, Ziel-Scope (Space-Scheibe) notieren.
- [ ] **W2 — RED (Invarianten-Test zuerst):** `src/data/trade/<datei>.test.ts` anlegen:

```ts
import { describe, expect, it } from "vitest";
import { <ENTRIES_EXPORT>, <COVERAGE_EXPORT> } from "./<datei>";

describe("<REGIME> corpus invariants", () => {
  it("has at least <MIN_COUNT> entries", () => expect(<ENTRIES_EXPORT>.length).toBeGreaterThanOrEqual(<MIN_COUNT>));
  it("codes match the regime format", () => {
    for (const e of <ENTRIES_EXPORT>) expect(e.code).toMatch(<CODE_REGEX>);
  });
  it("every entry carries sourceUrl + asOfDate + non-empty description", () => {
    for (const e of <ENTRIES_EXPORT>) {
      expect(e.sourceUrl).toMatch(/^https:\/\//);
      expect(e.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.description.length).toBeGreaterThan(20);
    }
  });
  it("no duplicate codes", () => {
    expect(new Set(<ENTRIES_EXPORT>.map((e) => e.code)).size).toBe(<ENTRIES_EXPORT>.length);
  });
  it("coverage declares exclusions honestly", () => expect(<COVERAGE_EXPORT>.excluded.length).toBeGreaterThan(0));
});
```

Run → FAIL (Datei fehlt). Das ist der RED-Beleg.

- [ ] **W3 — Kuratieren:** Datei nach Muster anlegen (Header-Kommentar: Quelle, Stand, Scope, was NICHT drin ist). Einträge paraphrasiert, Codes exakt, `depthTier` gesetzt. Bei Tier 1 zusätzlich: parametrische Prädikate in `control-list-cross-walk.ts` (Muster dort spiegeln; z34c-Lektion: Sanity-Ranges nicht enger kalibrieren als die Physik realer Hardware).
- [ ] **W4 — Verdrahten:** `normalized-corpus.ts`: Import + Adapter-Aufruf + `REGIME_MATURITY[<REGIME>]` auf das neue Tier heben + den Task-4-Maturity-Test entsprechend anpassen (DAS ist gewollt: der Test dokumentiert den Reifegrad).
- [ ] **W5 — GREEN:** `npx vitest run src/data/trade/ src/lib/comply-v2/trade/classification/` → alles grün inkl. Golden Set (erwartete Upgrades aus dem Sprint-Block einpflegen: Fälle, die von REVIEW auf exaktes Verdict wechseln, in `EXACT` mit Quellen-Kommentar übernehmen).
- [ ] **W6 — UNABHÄNGIGE VERIFIKATION (Pflicht, eigener Agent):** Subagent mit EIGENEM Kontext dispatchen: „Lies <QUELLE>. Prüfe `src/data/trade/<datei>.ts`: (1) 10 Stichproben-Codes existieren in der Quelle mit passendem Inhalt, (2) KEIN Eintrag behauptet etwas, das die Quelle nicht trägt, (3) `excluded`-Deklaration vollständig? Antworte mit VERIFIED oder Liste der Abweichungen." Abweichungen fixen, erneut prüfen. Kein Commit ohne VERIFIED.
- [ ] **W7 — Commit:** `feat(trade): <regime> space slice — <n> verified entries, tier <t> (S<x>)`
- [ ] **W8 — Statusboards** (§0 hier + Master-Plan §4) fortschreiben.

### Sprint S1 — MTCR-Annex komplett (Tier 1) — Parameter

- Quelle: mtcr.info → „MTCR Equipment, Software and Technology Annex" (aktuelle Fassung; `asOfDate` = Dokumentdatum)
- Files: ERWEITERE `src/data/trade/mtcr.ts` (9 Bestands-Einträge behalten/aufwerten) + ggf. `mtcr-cat2.ts` bei >120 Einträgen; Test `mtcr.test.ts`
- `<MIN_COUNT>` 140 · `<CODE_REGEX>` `/^\d{1,2}\.[A-E]\.\d+/` (Muster „1.A.1"; beim W1-Lesen verifizieren)
- Tier-1-Prädikate (cross-walk): Cat-I-Tripwires — Komplettsysteme ≥300 km Reichweite / ≥500 kg Nutzlast (Item 1), Produktionsanlagen, Item-2-Subsysteme (Stufen, Wiedereintritt, Triebwerke: Schub-Schwellen aus dem Annex-Text übernehmen, NICHT raten)
- Golden-Set-Upgrades: `apogee-engine`, `launcher-tank`, `hall-thruster` — je Origin präzisere Verdicts; `REGIME_MATURITY.MTCR_ANNEX` → 1
- Akzeptanz: W6 VERIFIED · Golden-Set grün · Maturity-Test angepasst · Master-Plan-Board fortgeschrieben

### Sprint S2 — USML Cat IV Paragraph-Ebene (Tier 1) — Parameter

- Quelle: ecfr.gov 22 CFR 121.1, Category IV (bestehende `USML_ECFR_URL`-Konstante)
- Files: Create `src/data/trade/usml-iv.ts` nach dem Muster `usml-xv-e.ts` (paragraph-keyed, SME-Flags); Adapter `adaptUsmlXv`-Familie in `normalized-corpus.ts` wiederverwenden/parametrisieren
- `<MIN_COUNT>` 25 · `<CODE_REGEX>` `/^IV\([a-z]\)/`
- Prädikate: Träger-/Raketen-Tripwires nur wo der Text harte Schwellen nennt; sonst textuell (Software/Tech = deemed-export-Flächen)
- Golden-Set-Upgrades: `launcher-tank`, `apogee-engine` für US-Origin
- Akzeptanz: wie S1; `REGIME_MATURITY.USML` → 1 NUR falls Cat IV + XV zusammen das Space-Spektrum tragen (sonst 2 lassen + Kommentar)

### Sprint S3 — UK_STRATEGIC Space-Scheibe NEU (Tier 2) — Parameter

- Quelle: gov.uk „UK strategic export control lists" (konsolidierte Fassung)
- Files: Create `src/data/trade/uk-strategic.ts` + Test; ListId existiert seit S0
- `<MIN_COUNT>` 120 · `<CODE_REGEX>` `/^(PL\d{4}|[0-9][A-E]\d{3}|ML\d{1,2})/` (UK nutzt EU-artige Codes + PL-Ratings + ML; in W1 verifizieren)
- Scope: Dual-Use 9er-Kategorie + space-relevante 3/5/6/7-Querschnitte + ML10/ML11-Spiegel + UK-PL-Space-Ratings
- Golden-Set-Upgrades: ALLE GB-Origin-Zeilen von Fail-Closed-REVIEW auf präzise Verdicts; `REGIME_MATURITY.UK_STRATEGIC` → 2
- Akzeptanz: zusätzlich „kein GB-Golden-Fall resolves-to-NOTHING" (Harness-Assertion ergänzen)

### Sprint S4 — EU Common Military List (Tier 1/2) — Parameter

- Quelle: EUR-Lex, aktuelle jährliche „Gemeinsame Militärgüterliste der EU". **Exakte space-relevante ML-Positionen IM SPRINT gegen den Text verifizieren** (Kandidaten ML10/ML11/ML4 — Spec §5 verbietet Vorab-Behauptung)
- Files: Create `src/data/trade/eu-cml.ts` + Test
- `<MIN_COUNT>` 20 · `<CODE_REGEX>` `/^ML\d{1,2}/`
- Golden-Set: militärische Varianten? NICHT neu erfinden — stattdessen `sat-bus`-Zeile mit `declaredCodes.usmlCategory`-Analogon EU-seitig prüfen; `REGIME_MATURITY.EU_CML` → 2
- Akzeptanz: wie S1 + FR-AMA-Delta als Kommentar-Hinweis geprüft (Spec §9)

### Sprint S5 — Mirror-Gerüst + CH/NO/CA/AU/KR + Wassenaar-9-Vertiefung — Parameter

- Quellen: fedlex (CH GKV Anhänge) · regjeringen.no (NO Liste I/II) · laws-lois.justice.gc.ca (CA ECL) · legislation.gov.au (AU DSGL) · yestrade.go.kr (KR) · wassenaar.org (DUL Cat 9)
- Files: Create `src/data/trade/mirror-regimes.ts` (die 5 Länder als Mirror+Delta in EINER Datei — Einträge sind klein: nationaler Code + `mirrorsCanonicalId` + Delta) + `wassenaar-cat9-deep.ts`; Adapter `adaptMirrorEntries` in `normalized-corpus.ts` (neu, ~15 Zeilen: löst `mirrorsCanonicalId` gegen die Union auf, erbt title/description/controlReason der Quelle, überschreibt code/list/sourceUrl)
- Invarianten ZUSÄTZLICH: jeder `mirrorsCanonicalId` existiert in der Union (kein dangling mirror); `mirrorDelta:"MODIFIED"|"NATIONAL_ONLY"` ⇒ eigene description Pflicht
- `<MIN_COUNT>` 30 je Land (Space-Scheibe) · W6-Verifikation MUSS die Mirror-Behauptung selbst prüfen (Stichprobe: nationale Quelle sagt wirklich dasselbe wie der gespiegelte Wassenaar/MTCR-Eintrag)
- `REGIME_MATURITY` CH/NO/CA/AU/KR → 2, WASSENAAR → 1
- Golden-Set-Upgrades: CH/NO/CA/AU/KR-Origin-Zeilen präzise

### Sprint S6 — JP METI + IN SCOMET vertiefen (+KR-Rest) — Parameter

- Quellen: meti.go.jp (amtliche englische Fassungen der Export Trade Control Order Anhänge) · dgft.gov.in Appendix 3 (SCOMET)
- Files: ERWEITERE `src/data/trade/japan-meti.ts` (40→Ziel ≥90) + `india-scomet.ts` (32→Ziel ≥70), Space-Kategorien zuerst (SCOMET Cat 4 „Nuclear-unrelated dual-use"/Cat 5/Launch-bezogen — in W1 exakt bestimmen)
- JP/KR-Ehrlichkeit (Spec §4.5): nicht amtlich-englisch Verifizierbares ⇒ `coverage.excluded` + Maturity ggf. auf 3 belassen statt schönfärben
- `REGIME_MATURITY` JP_METI/IN_SCOMET → 2 nur bei echter Deckung
- Golden-Set: JP/IN-Origin-Zeilen

---

# SPRINT S7 — Frische-Audit, Doku, Score

### Task S7.1: Frische-Skript

**Files:** Create `scripts/trade-corpus-freshness.ts` + Test `scripts/trade-corpus-freshness.test.ts`

- [ ] **S7.1.1 RED:**

```ts
import { describe, expect, it } from "vitest";
import { collectFreshness } from "../scripts/trade-corpus-freshness";

it("lists every CorpusRegime with its oldest asOfDate and source", () => {
  const rows = collectFreshness();
  expect(rows.length).toBeGreaterThanOrEqual(19);
  for (const r of rows) {
    expect(r.regime).toBeTruthy();
    expect(r.oldestAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.entryCount).toBeGreaterThan(0);
  }
});
```

- [ ] **S7.1.2 GREEN:** `collectFreshness()` iteriert die normalisierte Union (Import aus `normalized-corpus.ts`), gruppiert nach `regime`, nimmt min(`asOfDate`), count, eine `sourceUrl`. `main()` (nur bei direktem Aufruf) druckt eine nach Alter sortierte Tabelle. Pure TS, kein AI, kein Netz.
- [ ] **S7.1.3:** `npx tsx scripts/trade-corpus-freshness.ts` läuft und druckt; Commit `feat(trade): corpus freshness audit script (S7)`

### Task S7.2: Doku + stale Header + Score

- [ ] Stale Header in `src/data/trade/eu-annex-i.ts` fixen („~30 entries" → reale Familienzahl + Verweis auf die Kategorie-Dateien)
- [ ] Spec §8-DoD-Checkliste durchgehen; Score-Selbsteinschätzung (Systematik wie Audit-Doc) in den Master-Plan §4 + dieses Board schreiben (Ziel ≥90 space-vertikal international); Quartals-Checkliste (4 Zeilen: Skript laufen lassen → Amendments je Top-3-älteste Regime prüfen → Einträge nachziehen → Boards) ans Ende der Spec anhängen
- [ ] Commit `docs(trade): space-international wrap — score reassessment + quarterly freshness checklist (S7)`

---

## Self-Review (beim Schreiben durchgeführt)

- **Spec-Abdeckung:** §4.1→Task 4+S5-Adapter · §4.2→Tasks 1–3 · §4.3a→Task 7, b→Task 6, c→bestehende Konservativität+Task 9-Assertion · §4.4→Tasks 8–9 · §4.5→W1–W8 + Sprint-Blöcke · §4.6→S7.1 · §4.7→Task 6 (VerdictPanel) · §5-Akzeptanzen→je Sprint-Block · §8-DoD→S7.2. Keine Lücke gefunden.
- **Platzhalter:** Daten-Sprints enthalten bewusst KEINE vorgeschriebenen Rechts-Einträge — das ist kein Platzhalter, sondern Spec-Pflicht (§4.5: erst Quelle lesen, dann kuratieren; Vorab-Schreiben wäre Fabrikation). Der Workflow W1–W8 + Templates + Parameter sind vollständig. Golden-Set-`EXACT`-Tabelle startet bewusst minimal (2 belegbare Fälle) und wächst nur mit Quellen-Kommentar.
- **Typ-Konsistenz:** `originRegimes`/`OriginRegimeRouting` (T1) ↔ T3-opts ↔ T7-`exporterOrigin` ↔ Harness; `REGIME_MATURITY` (T4) ↔ T7 ↔ W4; `resolveExporterSeat` (T5) ↔ T6; `KREIS_A_ISO2` 36 = 27+9 ✓; ListId-Neuzugänge (T2) = Spec-§4.1-Regime minus bereits vorhandener UK_STRATEGIC/JP_METI ✓ (CorpusRegime bekommt 7 inkl. UK_STRATEGIC — Union dort hatte UK noch nicht; ListId bekommt 7 minus UK/JP = die Tests in T2 listen exakt diese 7 normalizeListId-Fälle, davon IN_SCOMET neu in ListId).
