/**
 * Golden Set — 12 repräsentative Space-Items (Spec 2026-06-12 §4.4).
 *
 * Attribute realistisch, aber FIKTIV (keine Kundendaten). Erwartungen je
 * Origin×Dest stehen im Matrix-Harness (`golden-set.test.ts`), nicht hier.
 *
 * ─── Attribut-Shape (verbindlich) ────────────────────────────────────────
 * Die Keys in `attributes` sind exakt die Felder, die `ItemSignals` /
 * `ClassifiableItem` in `src/lib/trade/classification/classify-item.ts`
 * konsumiert — der Harness reicht sie 1:1 an `classifyItemForOperation`
 * weiter (kein Mapping, keine Übersetzung):
 *   • apertureMeters?: number   → EO-Schwelle 0.50 m (USML XV(a)(7)(i))
 *   • rangeKm?: number          → MTCR-Reichweite ≥ 300 km
 *   • payloadKg?: number        → MTCR-Nutzlast ≥ 500 kg
 *   • isRadHardened?: boolean   → 3A001.a.1 TID/SEU
 *   • isMilSpec?: boolean       → USML XV(a)(1) mil-spec
 *   • isAntiJam?: boolean       → USML XII(d) / XI(c)(2)
 * Die `description` trägt die Keyword-Heuristiken (SAR/Hall-Thruster/…), die
 * der Property-Trigger-Engine über Freitext auswertet — deshalb sind z. B.
 * SAR-Auflösung oder Schub NICHT als eigener numerischer Key modelliert
 * (ItemSignals hat dafür keinen Slot); das Kontrollsignal fließt über die
 * Beschreibung. Numerische Keys werden nur gesetzt, wo ItemSignals sie liest.
 *
 * ─── Declared codes ──────────────────────────────────────────────────────
 * Wo ein Item `declaredCodes` trägt, ist der Code KORPUS-VERIFIZIERT: er
 * existiert als `code:`-Eintrag im In-Repo-Korpus mit passendem Titel (siehe
 * Zeilen-Kommentar je Code). Etwa die Hälfte der Items trägt deklarierte
 * Codes (deterministischer Kontrollverdacht über Gate 3.5 / 4.5); der Rest
 * bleibt undeklariert (rein Klassifizierer-getrieben über die Heuristik).
 */

/**
 * Ein Golden-Set-Referenz-Item. `attributes` spiegelt die `ItemSignals`-
 * Felder; `declaredCodes` ist optional und korpus-verifiziert.
 */
export interface GoldenItem {
  id: string;
  name: string;
  description: string;
  /** Attribut-Shape wie `ItemSignals`/`ClassifiableItem` es konsumiert. */
  attributes: Record<string, string | number | boolean>;
  declaredCodes?: { eccnUS?: string; eccnEU?: string; usmlCategory?: string };
}

export const GOLDEN_ITEMS: readonly GoldenItem[] = [
  {
    id: "sat-bus",
    name: "500kg LEO Satellitenbus",
    description:
      "Kommerzieller Smallsat-Bus, 3-Achsen-stabilisiert, S-Band TT&C",
    attributes: { payloadKg: 500, isRadHardened: false, isMilSpec: false },
    // 9A004 "Space launch vehicles & spacecraft" — eu-annex-i.ts (EU_ANNEX_I).
    declaredCodes: { eccnEU: "9A004" },
  },
  {
    id: "eo-sar",
    name: "SAR-Payload X-Band 1m",
    description: "Synthetic aperture radar payload, X-Band, 1 m Auflösung",
    attributes: { isRadHardened: false },
    // Undeklariert: Kontrolle fließt über SAR-Keyword-Heuristik (Rule 9).
  },
  {
    id: "eo-optical",
    name: "Optische EO-Kamera 0.5m GSD",
    description: "Pushbroom imager, 0.5 m GSD",
    attributes: { apertureMeters: 0.5 },
    // Undeklariert: Apertur ≥ 0.50 m triggert USML-EO-Schwelle (Rule 3).
  },
  {
    id: "hall-thruster",
    name: "Hall-Effekt-Triebwerk 5kW, 0.3N",
    description: "Hall thruster, Xenon, 5 kW, 0.3 N Schub",
    attributes: {},
    // Undeklariert: "hall thruster"-Keyword triggert Rule 8 (electric propulsion).
  },
  {
    id: "apogee-engine",
    name: "Chemisches Apogäums-Triebwerk 400N Bipropellant",
    description:
      "Bipropellant apogee/attitude-control thruster, 400 N, MMH/NTO",
    attributes: {},
    // 9A106 "Subsystems usable in rocket systems (MTCR)" — eu-annex-i.ts;
    // Beschreibung enthält "attitude control thrusters" (EU_ANNEX_I, MTCR Cat. II).
    declaredCodes: { eccnEU: "9A106" },
  },
  {
    id: "star-tracker",
    name: "Sternsensor 10 arcsec",
    description: "Star tracker, 10 arcsec, strahlungstolerant",
    attributes: { isRadHardened: false },
    // 7A004 "Star-trackers and other celestial navigation systems" — eu-annex-i.ts.
    declaredCodes: { eccnEU: "7A004" },
  },
  {
    id: "reaction-wheel",
    name: "Reaktionsrad 1 Nms",
    description: "Drallrad für 3-Achsen-Stabilisierung, 1 Nms",
    attributes: {},
    // Undeklariert: keine Heuristik trifft — repräsentiert ein unkontrolliertes
    // AOCS-Bauteil (Klassifizierer liefert kein Trigger ⇒ CLEARED-Tendenz).
    // CAVEAT: ein Reaktionsrad, das SPEZIELL für einen 9A515-gelisteten Satelliten
    // ausgelegt ist, wäre selbst 9A515.x-kontrolliert — dieses Golden-Item modelliert
    // bewusst die generische, nicht-spezifisch-ausgelegte Variante. Der GO-Pin gilt
    // für DIESE Attribute, nicht für Reaktionsräder allgemein.
  },
  {
    id: "ground-tt-c",
    name: "TT&C-Bodenstation mit AES-256",
    description: "Uplink-Verschlüsselung AES-256, Bandbreite 50 Mbps",
    attributes: {},
    // 5A002 "Information security systems (cryptography)" — eu-annex-i-cat5.ts.
    declaredCodes: { eccnEU: "5A002" },
  },
  {
    id: "launcher-tank",
    name: "CFK-Druckbehälter Trägerstufe 2.4m",
    description:
      "Composite (CFRP) pressure vessel for a launch vehicle upper stage, 2.4 m",
    attributes: {},
    // Undeklariert: "launch vehicle" + "upper stage" triggert Rule 10 (low-conf).
  },
  {
    id: "flight-sw",
    name: "AOCS Flight Software",
    description: "Lageregelungs-Software (AOCS), als Quellcode exportierbar",
    attributes: {},
    // 9D001 "Software for development of 9A001-9A012 items" — eu-annex-i.ts;
    // Beschreibung nennt explizit "flight-software toolchains" (EU_ANNEX_I).
    declaredCodes: { eccnEU: "9D001" },
  },
  {
    id: "radhard-obc",
    name: "Rad-hard OBC 100 krad",
    description: "Strahlungsgehärteter Bordcomputer, SEL-immun, 100 krad",
    attributes: { isRadHardened: true },
    // 3A001.a.1 "Radiation-hardened ICs" — us-ccl.ts (US_CCL / eccnUS).
    declaredCodes: { eccnUS: "3A001.a.1" },
  },
  {
    id: "prepreg",
    name: "Carbon-Prepreg T800-Klasse",
    description: "Hochmodul-CFK-Prepreg (T800-Klasse) für Strukturen",
    attributes: {},
    // 1C010 "Fibrous or filamentary materials …, prepregs" — eu-annex-i-cat1-2.ts.
    declaredCodes: { eccnEU: "1C010" },
  },
];
