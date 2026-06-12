/**
 * MTCR Annex — Category II Items 3–20 (Data-Sprint S1, Tier 1).
 *
 * Source: MTCR "Equipment, Software and Technology Annex", document dated
 * 14 March 2024 (MTCR/TEM/2024/Annex).
 * https://www.mtcr.info/en/mtcr-annex
 *
 * Category II = every Annex item NOT designated Category I, i.e. Items 3–20
 * (Items 5, 7 and 8 are "Reserved For Future Use" and carry no entries).
 * Cat II items are subject to case-by-case licensing review (no strong
 * presumption of denial).
 *
 * Sub-letter granularity: where a code has materially distinct sub-items with
 * their own thresholds (e.g. 4.C.2.a–g fuels, 6.B.1.a–e production equipment,
 * 9.B.2.a–e inertial test gear, 12.A.5.a–b tracking, 15.B.1.a–d vibration,
 * 20.A.1.a–b subsystems, 4.B.3.a–d mixers, 4.C.3.a–b / 4.C.4.a–b oxidisers,
 * 4.C.6.a–e additives), each sub-letter is a separate entry so the controlling
 * parameter is attached to the right code. Bundled software/technology rollups
 * (D/E sub-paragraphs) are kept at the parent code where the Annex does not
 * split them parametrically.
 *
 * NOT a verbatim transcription — descriptions paraphrase the operative text;
 * codes, CAS numbers and numeric thresholds are reproduced exactly from the
 * Annex. Where a threshold combines conditions, the description states the
 * controlling AND/OR structure.
 *
 * This file is re-exported through `mtcr.ts` (MTCR_ANNEX_ENTRIES = Cat I ∪
 * Cat II), so `normalized-corpus.ts` keeps a single import. The split exists
 * only to keep each file under ~1500 lines.
 */

import type { ClassificationEntry } from "./schema";

const SRC = "https://www.mtcr.info/en/mtcr-annex";
/**
 * Verification date (per `ClassificationEntry.asOfDate` — when Caelex last
 * checked these entries against the source, NOT the document publication
 * date). Source document: MTCR Annex dated 14 March 2024 (see file header).
 */
const ASOF = "2026-06-13";

/**
 * Input shape for a Cat II entry: only the fields that vary entry-to-entry.
 * The shared provenance fields (jurisdiction, controlReasons, sourceUrl,
 * asOfDate, mtcrCategory) are stamped by `e()`. `crossReferenceTopic` is
 * optional and defaults to null (no known cross-reference).
 */
type Cat2Input = Pick<ClassificationEntry, "code" | "title" | "description"> & {
  crossReferenceTopic?: string | null;
  notes?: string;
};

/** Helper: stamp the shared provenance fields onto a Cat II entry. */
function e(entry: Cat2Input): ClassificationEntry {
  const { crossReferenceTopic = null, ...rest } = entry;
  return {
    jurisdiction: "MTCR_ANNEX",
    controlReasons: ["MT"],
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "II",
    crossReferenceTopic,
    ...rest,
  };
}

export const MTCR_CAT2_ENTRIES: ClassificationEntry[] = [
  // ═══ ITEM 3 — PROPULSION COMPONENTS AND EQUIPMENT ═══════════════════
  e({
    code: "3.A.1",
    title: "Turbojet and turbofan engines",
    description:
      "Turbojet/turbofan engines that EITHER meet all of: maximum thrust > 400 N (excluding civil-certified engines > 8.89 kN), specific fuel consumption ≤ 0.15 kg N⁻¹ h⁻¹, dry weight < 750 kg, first-stage rotor diameter < 1 m; OR are designed/modified for Item 1.A or 19.A.2 systems regardless of those parameters.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.2",
    title: "Ramjet/scramjet/pulse-jet/detonation/combined-cycle engines",
    description:
      "Ramjet, scramjet, pulse-jet, detonation or combined-cycle engines (including combustion-regulating devices and specially designed components) usable in systems specified in 1.A or 19.A.2.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.3",
    title: "Rocket motor cases, insulation components and nozzles",
    description:
      "Rocket motor cases, insulation components and nozzles for solid- or hybrid-propellant rocket motors usable in subsystems specified in 2.A.1.c.1 or 20.A.1.b.1.",
    crossReferenceTopic: "rocket-propulsion-solid-engines",
  }),
  e({
    code: "3.A.4",
    title: "Staging, separation mechanisms and interstages",
    description:
      "Staging mechanisms, separation mechanisms and interstages usable in systems specified in 1.A. May include pyrotechnic bolts/nuts/shackles, ball locks, circular cutting devices and flexible linear shaped charges.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.5",
    title: "Liquid/slurry/gel propellant control systems",
    description:
      "Liquid, slurry and gel propellant (incl. oxidiser) control systems usable in 1.A systems, designed/modified to operate in vibration > 10 g rms between 20 Hz and 2 kHz. Controlled servo valves: ≥ 24 L/min at ≥ 7 MPa with response time < 100 ms; pumps: shaft speed ≥ 8 000 rpm or discharge ≥ 7 MPa; gas turbines for turbopumps: ≥ 8 000 rpm.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.6",
    title: "Components for hybrid rocket motors",
    description:
      "Specially designed components for hybrid rocket motors specified in 2.A.1.c.1 or 20.A.1.b.1.",
    crossReferenceTopic: "rocket-propulsion-solid-engines",
  }),
  e({
    code: "3.A.7",
    title: "Radial ball bearings (precision)",
    description:
      "Radial ball bearings to ISO 492 Tolerance Class 2 (or ABEC-9) or better, with inner-ring bore 12–50 mm, outer-ring OD 25–100 mm and width 10–20 mm.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.8",
    title: "Liquid or gel propellant tanks",
    description:
      "Liquid or gel propellant tanks specially designed for propellants controlled in Item 4.C or other liquid/gel propellants used in systems specified in 1.A.1.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.9",
    title: "Turboprop engine systems",
    description:
      "'Turboprop engine systems' (turboshaft engine plus propeller power-transmission) specially designed for 1.A.2 or 19.A.2 systems with maximum power > 10 kW (uninstalled, sea-level static, ICAO standard atmosphere), excluding civil-certified engines.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.A.10",
    title: "Combustion chambers and nozzles (liquid/gel engines)",
    description:
      "Combustion chambers and nozzles for liquid-propellant rocket engines or gel-propellant rocket motors usable in subsystems specified in 2.A.1.c.2 or 20.A.1.b.2.",
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
  }),
  e({
    code: "3.B.1",
    title: "Production facilities for Item 3 propulsion",
    description:
      "'Production facilities' specially designed for equipment/materials specified in 3.A.1–3.A.6, 3.A.8–3.A.10 or 3.C.",
  }),
  e({
    code: "3.B.2",
    title: "Production equipment for Item 3 propulsion",
    description:
      "'Production equipment' specially designed for equipment/materials specified in 3.A.1–3.A.6, 3.A.8–3.A.10 or 3.C.",
  }),
  e({
    code: "3.B.3",
    title: "Flow-forming machines",
    description:
      "Flow-forming machines usable in production of propulsion components (e.g. motor cases, interstages) for 1.A systems, with NC/computer control and more than two simultaneously co-ordinated contouring axes. Spin-forming + flow-forming combinations count as flow-forming machines.",
    crossReferenceTopic: null,
  }),
  e({
    code: "3.C.1",
    title: "Interior lining for rocket motor cases",
    description:
      "'Interior lining' usable for rocket motor cases in subsystems specified in 2.A.1.c.1, or specially designed for 20.A.1.b.1 — typically a liquid-polymer dispersion of refractory/insulating materials (e.g. carbon-filled HTPB) for the propellant-to-case bond interface.",
    crossReferenceTopic: "rocket-propulsion-solid-engines",
  }),
  e({
    code: "3.C.2",
    title: "Insulation material (bulk) for rocket motor cases",
    description:
      "Insulation material in bulk form usable for rocket motor cases in subsystems specified in 2.A.1.c.1, or specially designed for 20.A.1.b.1 (incl. cured/semi-cured compounded rubber sheet stock with insulating or refractory material).",
    crossReferenceTopic: "rocket-propulsion-solid-engines",
  }),
  e({
    code: "3.D.1",
    title: "Software for Item 3 production facilities / flow-forming",
    description:
      "'Software' specially designed/modified for the use of production facilities and flow-forming machines specified in 3.B.1 or 3.B.3.",
  }),
  e({
    code: "3.D.2",
    title: "Software for Item 3 propulsion equipment use",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 3.A.1, 3.A.2, 3.A.4, 3.A.5, 3.A.6 or 3.A.9.",
  }),
  e({
    code: "3.D.3",
    title: "Software for development of Item 3 equipment",
    description:
      "'Software' specially designed/modified for the development of equipment specified in 3.A.2, 3.A.3 or 3.A.4.",
  }),
  e({
    code: "3.E.1",
    title: "Technology for Item 3 propulsion",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment, materials or software specified in 3.A.1–3.A.6, 3.A.8–3.A.10, 3.B, 3.C or 3.D.",
  }),

  // ═══ ITEM 4 — PROPELLANTS, CHEMICALS AND PROPELLANT PRODUCTION ══════
  e({
    code: "4.B.1",
    title: "Production equipment for liquid propellants",
    description:
      "'Production equipment' (and specially designed components) for the production, handling or acceptance testing of liquid propellants or propellant constituents specified in 4.C.",
  }),
  e({
    code: "4.B.2",
    title: "Production equipment for solid propellants",
    description:
      "'Production equipment' (other than 4.B.3) for production, handling, mixing, curing, casting, pressing, machining, extruding or acceptance testing of solid propellants or constituents specified in 4.C. Does not control batch/continuous mixers or fluid energy mills (see 4.B.3).",
  }),
  e({
    code: "4.B.3.a",
    title: "Batch mixers",
    description:
      "Batch mixers having all of: designed/modified for mixing under vacuum 0–13.326 kPa; mixing-chamber temperature control; total volumetric capacity ≥ 110 L; and at least one mixing/kneading shaft mounted off-centre.",
  }),
  e({
    code: "4.B.3.b",
    title: "Continuous mixers",
    description:
      "Continuous mixers having all of: designed/modified for mixing under vacuum 0–13.326 kPa; mixing-chamber temperature control; and either two or more mixing/kneading shafts, or a single rotating-and-oscillating shaft with kneading teeth/pins inside the chamber casing.",
  }),
  e({
    code: "4.B.3.c",
    title: "Fluid energy mills",
    description:
      "Fluid energy mills usable for grinding or milling substances specified in 4.C.",
  }),
  e({
    code: "4.B.3.d",
    title: "Metal powder production equipment",
    description:
      "Metal powder 'production equipment' usable for controlled-environment production of spherical/spheroidal/atomised materials specified in 4.C.2.c, 4.C.2.d or 4.C.2.e (e.g. high-frequency arc-jet plasma generators, electroburst equipment, melt-powdering in inert media).",
  }),
  e({
    code: "4.C.1",
    title: "Composite and composite-modified double-base propellants",
    description:
      "Composite and composite modified double base propellants (Item 4.C.1).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.a",
    title: "Hydrazine (>70%)",
    description:
      "Hydrazine (CAS 302-01-2) at a concentration of more than 70%.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.b",
    title: "Hydrazine derivatives",
    description:
      "Hydrazine derivatives incl. MMH (CAS 60-34-4), UDMH (CAS 57-14-7), hydrazine mononitrate, trimethyl-/tetramethyl-hydrazine, hydrazinium azide/nitrate/perchlorate salts and related energetic hydrazine compounds (full enumerated list in the Annex).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.c",
    title: "Spherical/spheroidal aluminium powder",
    description:
      "Spherical or spheroidal aluminium powder (CAS 7429-90-5), particle size < 200 µm, ≥ 97% Al by weight, with ≥ 10% of total weight in particles < 63 µm (ISO 2591-1:1988).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.d",
    title: "Zirconium/beryllium/magnesium metal powders",
    description:
      "Metal powders of zirconium (CAS 7440-67-7), beryllium (CAS 7440-41-7), magnesium (CAS 7439-95-4) or their alloys, ≥ 97% by weight, where ≥ 90% of particles are < 60 µm. Natural hafnium content in zirconium counts with the zirconium.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.e",
    title: "Boron / boron-alloy powders",
    description:
      "Metal powders of boron (CAS 7440-42-8) or boron alloys with ≥ 85% boron by weight, where ≥ 90% of particles are < 60 µm.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.f",
    title: "High energy density materials",
    description:
      "High energy density materials usable in 1.A or 19.A systems: mixed solid+liquid fuels (e.g. boron slurry) with mass-based energy density ≥ 40 × 10⁶ J/kg; or other high-density fuels/additives (e.g. cubane, JP-10) with volume-based energy density ≥ 37.5 × 10⁹ J/m³ at 20 °C, 1 atm. Excludes fossil-refined fuels/biofuels unless specifically formulated for 1.A/19.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.2.g",
    title: "Hydrazine replacement fuels",
    description:
      "Hydrazine replacement fuels enumerated in 4.C.2.g (energetic ionic-liquid / nitrate-ester fuel formulations developed as lower-toxicity substitutes for hydrazine).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.3.a",
    title: "Perchlorate / chlorate / chromate oxidisers",
    description:
      "Perchlorates, chlorates or chromates mixed with powdered metal or other high-energy-fuel components (oxidiser substances of Item 4.C.3.a).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.3.b",
    title: "Hydroxylammonium nitrate (HAN)",
    description: "Hydroxylammonium nitrate (HAN) — oxidiser of Item 4.C.3.b.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.4.a",
    title: "Oxidisers for liquid-propellant engines",
    description:
      "Oxidiser substances usable in liquid-propellant rocket engines (e.g. dinitrogen trioxide/tetroxide, nitric acid grades, dinitrogen pentoxide and related liquid oxidisers enumerated in 4.C.4.a).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.4.b",
    title: "Oxidisers for solid-propellant motors",
    description:
      "Oxidiser substances usable in solid-propellant rocket motors (e.g. ammonium perchlorate, ADN, HNF, nitramine oxidisers enumerated in 4.C.4.b).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.5",
    title: "Polymeric substances (binders/prepolymers)",
    description:
      "Energetic and binder polymeric substances enumerated in 4.C.5 (e.g. HTPB, carboxy-/hydroxy-terminated polybutadienes, glycidyl-azide and other energetic prepolymers) usable as propellant binders.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.6.a",
    title: "Bonding agents",
    description:
      "Propellant bonding agents enumerated in 4.C.6.a (e.g. tris-aziridinyl and related crosslinkers improving propellant mechanical properties).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.6.b",
    title: "Curing-reaction catalysts",
    description:
      "Curing reaction catalysts enumerated in 4.C.6.b (e.g. triphenyl bismuth and related cure catalysts for propellant binders).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.6.c",
    title: "Burning-rate modifiers (incl. ferrocene derivatives)",
    description:
      "Burning-rate modifiers enumerated in 4.C.6.c, including catocene, ferrocene derivatives (e.g. butacene, pentyl/dibutyl ferrocene) usable as solid-propellant burning-rate modifiers.",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.6.d",
    title: "Esters and plasticisers (energetic)",
    description:
      "Energetic esters and plasticisers enumerated in 4.C.6.d, e.g. TEGDN (CAS 111-22-8), TMETN (CAS 3032-55-1), BTTN (CAS 6659-60-5), DEGDN, NENA- and dinitropropyl-based plasticisers (BDNPA/BDNPF).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.6.e",
    title: "Stabilisers (propellant)",
    description:
      "Propellant stabilisers: 2-nitrodiphenylamine (CAS 119-75-5) and N-methyl-p-nitroaniline (CAS 100-15-2).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.C.7",
    title: "Gel propellants",
    description:
      "'Gel propellants' specifically formulated for use in systems specified in 1.A, 19.A.1 or 19.A.2 (fuel/oxidiser formulations using a gellant such as silicates, kaolin, carbon or polymeric gellants).",
    crossReferenceTopic: null,
  }),
  e({
    code: "4.D.1",
    title: "Software for propellant production equipment",
    description:
      "'Software' specially designed/modified for the operation or maintenance of equipment specified in 4.B for production/handling of materials specified in 4.C.",
  }),
  e({
    code: "4.E.1",
    title: "Technology for propellants and propellant production",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or materials specified in 4.B and 4.C.",
  }),

  // ═══ ITEM 6 — STRUCTURAL COMPOSITES, PYROLYTIC DEPOSITION, MATERIALS ═
  e({
    code: "6.A.1",
    title: "Composite structures, laminates and manufactures",
    description:
      "Composite structures, laminates and manufactures thereof, specially designed for use in systems specified in 1.A, 19.A.1 or 19.A.2 or subsystems specified in 2.A or 20.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.A.2",
    title: "Resaturated pyrolysed (carbon-carbon) components",
    description:
      "Resaturated pyrolysed (carbon-carbon) components designed for rocket systems and usable in systems specified in 1.A or 19.A.1.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.1.a",
    title: "Filament-winding / fibre-tow-placement machines",
    description:
      "Filament-winding machines or 'fibre/tow-placement machines' whose positioning/wrapping/winding motions are co-ordinated and programmable in three or more axes, designed to fabricate composite structures from fibrous materials. Tow-placement machines place filament bands ≤ 25.4 mm wide.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.1.b",
    title: "Tape-laying machines",
    description:
      "'Tape-laying machines' whose positioning/laying motions are co-ordinated and programmable in two or more axes, designed for composite airframes and missile structures; place filament bands ≤ 304.8 mm wide but cannot place bands ≤ 25.4 mm wide.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.1.c",
    title: "Multi-directional weaving / interlacing machines",
    description:
      "Multi-directional, multi-dimensional weaving or interlacing machines (incl. adapters and modification kits) for weaving, interlacing or braiding fibres to manufacture composite structures.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.1.d",
    title: "Equipment for production of fibrous/filamentary materials",
    description:
      "Equipment designed/modified for production of fibrous or filamentary materials: converting polymeric fibres (PAN, rayon, polycarbosilane) with fibre-strain heating; vapour deposition on heated filament substrates; wet-spinning of refractory ceramics (e.g. alumina).",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.1.e",
    title: "Fibre surface-treatment / prepreg-preform equipment",
    description:
      "Equipment designed/modified for special fibre surface treatment or for producing prepregs/preforms (rollers, tension stretchers, coating/cutting equipment, clicker dies).",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.2",
    title: "Nozzles for pyrolytic deposition",
    description:
      "Nozzles specially designed for the pyrolytic-deposition processes referred to in 6.E.3.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.3",
    title: "Isostatic presses",
    description:
      "Isostatic presses with all of: maximum working pressure ≥ 69 MPa; controlled thermal environment ≥ 600 °C; and chamber cavity inside diameter ≥ 254 mm.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.4",
    title: "Chemical vapour deposition furnaces",
    description:
      "Chemical vapour deposition furnaces designed/modified for densification of carbon-carbon composites.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.B.5",
    title: "Densification / pyrolysis process equipment",
    description:
      "Equipment and process controls (other than 6.B.3/6.B.4) designed/modified for densification and pyrolysis of structural composite rocket nozzles and re-entry-vehicle nose tips.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.1",
    title: "Resin-impregnated fibre prepregs / metal-coated preforms",
    description:
      "Resin-impregnated fibre prepregs and metal-coated fibre preforms for goods in 6.A.1, with fibrous reinforcement of 'specific tensile strength' > 7.62 × 10⁴ m AND 'specific modulus' > 3.18 × 10⁶ m. Only resins with glass-transition temperature (Tg) after cure > 145 °C (ASTM D4065) are controlled.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.2",
    title: "Resaturated pyrolysed (carbon-carbon) materials",
    description:
      "Resaturated pyrolysed (carbon-carbon) materials designed for rocket systems and usable in systems specified in 1.A or 19.A.1.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.3",
    title: "Fine-grain graphites",
    description:
      "Fine-grain graphites with bulk density ≥ 1.72 g/cc (at 15 °C) and grain size ≤ 100 µm, usable for rocket nozzles and re-entry-vehicle nose tips, machinable into cylinders (Ø ≥ 120 mm, length ≥ 50 mm), tubes (ID ≥ 65 mm, wall ≥ 25 mm, length ≥ 50 mm) or blocks (≥ 120 × 120 × 50 mm).",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.4",
    title: "Pyrolytic / fibrous-reinforced graphites",
    description:
      "Pyrolytic or fibrous-reinforced graphites usable for rocket nozzles and re-entry-vehicle nose tips in systems specified in 1.A or 19.A.1.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.5",
    title: "Ceramic composite materials for missile radomes",
    description:
      "Ceramic composite materials (dielectric constant < 6 at any frequency 100 MHz–100 GHz) for missile radomes usable in systems specified in 1.A or 19.A.1.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.6",
    title: "High-temperature ceramic materials",
    description:
      "High-temperature ceramic materials: bulk machinable SiC-reinforced unfired ceramic and reinforced SiC ceramic composites for nose tips/re-entry vehicles/nozzle flaps; and fibre-reinforced Ultra-High-Temperature-Ceramic (UHTC) composites with melting point ≥ 3000 °C (e.g. ZrB₂, HfB₂, ZrC, HfC matrices). Excludes UHTC in non-composite form.",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.7",
    title: "Tungsten / molybdenum materials",
    description:
      "Materials for fabricating missile components in 1.A/19.A.1/19.A.2: tungsten/molybdenum particulate ≥ 97% by weight with particle size ≤ 50 µm; and solid tungsten (≥ 97% W, or Cu/Ag-infiltrated ≥ 80% W) machinable into cylinders (Ø ≥ 120 mm), tubes (ID ≥ 65 mm, wall ≥ 25 mm) or blocks (≥ 120 × 120 × 50 mm).",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.C.8",
    title: "Maraging steel",
    description:
      "Maraging steels usable in 1.A/19.A.1 systems with ultimate tensile strength (at 20 °C) ≥ 0.9 GPa (solution-annealed) or ≥ 1.5 GPa (precipitation-hardened), in sheet/plate/tubing with wall ≤ 5.0 mm or tubular forms with wall ≤ 50 mm and inner Ø ≥ 270 mm.",
    crossReferenceTopic: null,
    notes:
      "Bold-marked change in the 2024-03-14 Annex was Item 6.C.8 (maraging steel).",
  }),
  e({
    code: "6.C.9",
    title: "Titanium-stabilised duplex stainless steel (Ti-DSS)",
    description:
      "Ti-DSS usable in 1.A/19.A.1 systems with 17.0–23.0% Cr, 4.5–7.0% Ni, > 0.10% Ti, ferritic-austenitic microstructure (≥ 10% austenite by volume), in ingots/bars (≥ 100 mm each dimension), sheets (width ≥ 600 mm, thickness ≤ 3 mm) or tubes (OD ≥ 600 mm, wall ≤ 3 mm).",
    crossReferenceTopic: null,
  }),
  e({
    code: "6.D.1",
    title: "Software for Item 6 composite production equipment",
    description:
      "'Software' specially designed/modified for operation or maintenance of equipment specified in 6.B.1.",
  }),
  e({
    code: "6.D.2",
    title: "Software for Item 6.B equipment",
    description:
      "'Software' specially designed/modified for the equipment specified in 6.B.3 or 6.B.4.",
  }),
  e({
    code: "6.E.1",
    title: "Technology for Item 6 composites/materials",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or materials specified in 6.A, 6.B or 6.C.",
  }),
  e({
    code: "6.E.2",
    title: "Technical data for autoclave/hydroclave composite processing",
    description:
      "'Technical data' (incl. processing conditions) and procedures for regulating temperature, pressure or atmosphere in autoclaves/hydroclaves used to produce composites or partially processed composites, usable for equipment/materials specified in 6.A or 6.C.",
  }),
  e({
    code: "6.E.3",
    title: "Technology for pyrolytic deposition",
    description:
      "'Technology' for production of pyrolytically derived materials formed on a mould/mandrel/substrate from precursor gases decomposing at 1 300–2 900 °C and 130 Pa–20 kPa, incl. precursor-gas composition, flow rates and process-control schedules.",
    crossReferenceTopic: null,
  }),

  // ═══ ITEM 9 — INSTRUMENTATION, NAVIGATION AND DIRECTION FINDING ═════
  e({
    code: "9.A.1",
    title: "Integrated flight instrument systems",
    description:
      "Integrated flight instrument systems incl. gyrostabilisers or automatic pilots designed/modified for use in systems specified in 1.A, 19.A.1 or 19.A.2.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.2",
    title: "Gyro-astro compasses / celestial-tracking devices",
    description:
      "Gyro-astro compasses and other devices deriving position or orientation by automatically tracking celestial bodies or satellites (incl. star trackers serving navigation).",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.3",
    title: "Linear accelerometers",
    description:
      "Linear accelerometers for inertial-navigation/guidance systems usable in 1.A/19.A.1/19.A.2 with all of: scale-factor repeatability < 1 250 ppm AND bias repeatability < 1 250 micro-g. Excludes accelerometers designed as Measurement-While-Drilling sensors.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.4",
    title: "Gyros (drift-rate-controlled)",
    description:
      "All types of gyros usable in 1.A/19.A.1/19.A.2 with a rated drift-rate stability < 0.5 degrees (1 sigma or rms) per hour in a 1 g environment.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.5",
    title: "High-g accelerometers or gyros",
    description:
      "Accelerometers or gyros of any type for inertial-navigation/guidance systems specified to function at acceleration levels > 100 g. Excludes accelerometers designed to measure vibration or shock.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.6",
    title: "Inertial measurement equipment or systems",
    description:
      "'Inertial measurement equipment or systems' (AHRS, gyrocompasses, IMUs, INS, IRS, IRU) using accelerometers specified in 9.A.3/9.A.5 or gyros specified in 9.A.4/9.A.5.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.7",
    title: "Integrated navigation systems",
    description:
      "'Integrated navigation systems' designed/modified for 1.A/19.A.1/19.A.2 capable of navigational accuracy ≤ 200 m CEP (typically inertial device + external sensors such as a GNSS receiver/radar altimeter + integration hardware/software).",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.A.8",
    title: "Three-axis magnetic heading sensors",
    description:
      "Three-axis magnetic heading sensors with all of: internal tilt compensation in pitch (±90°) and roll (±180°); azimuthal accuracy < 0.5° rms at latitudes ±80°; and designed/modified to integrate with flight control and navigation systems.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "9.B.1",
    title: "Production / test / calibration equipment for Item 9.A",
    description:
      "'Production equipment' and other test/calibration/alignment equipment (other than 9.B.2) designed/modified for use with equipment specified in 9.A — incl. mirror characterisation gear (scatterometer 10 ppm, reflectometer 50 ppm, profilometer 5 Å) and inertial test stations.",
  }),
  e({
    code: "9.B.2.a",
    title: "Balancing machines (precision)",
    description:
      "Balancing machines with all of: cannot balance rotors > 3 kg; balance at speeds > 12 500 rpm; correct unbalance in two or more planes; and residual specific unbalance ≤ 0.2 g·mm per kg of rotor mass. Excludes dental/medical balancing machines.",
  }),
  e({
    code: "9.B.2.b",
    title: "Indicator heads (balancing instrumentation)",
    description:
      "Indicator heads (balancing instrumentation) designed/modified for use with balancing machines specified in 9.B.2.a.",
  }),
  e({
    code: "9.B.2.c",
    title: "Motion simulators / rate tables",
    description:
      "Motion simulators/rate tables with two or more axes, sliprings/non-contact power-signal transfer, and either: a single axis with rates ≥ 400°/s or ≤ 30°/s plus rate resolution ≤ 6°/s and accuracy ≤ 0.6°/s; or worst-case rate stability ≤ ±0.05% averaged over ≥ 10°; or positioning accuracy ≤ 5 arc-seconds.",
  }),
  e({
    code: "9.B.2.d",
    title: "Positioning tables",
    description:
      "Positioning tables (precise rotary positioning) with two or more axes and positioning accuracy ≤ 5 arc-seconds.",
  }),
  e({
    code: "9.B.2.e",
    title: "Centrifuges (high-g)",
    description:
      "Centrifuges capable of accelerations > 100 g and designed/modified to incorporate sliprings or non-contact devices transferring electrical power and/or signal.",
  }),
  e({
    code: "9.D.1",
    title: "Software for Item 9.A/9.B equipment use",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 9.A or 9.B.",
  }),
  e({
    code: "9.D.2",
    title: "Integration software for 9.A.1",
    description: "Integration 'software' for the equipment specified in 9.A.1.",
  }),
  e({
    code: "9.D.3",
    title: "Integration software for 9.A.6",
    description:
      "Integration 'software' specially designed for the equipment specified in 9.A.6.",
  }),
  e({
    code: "9.D.4",
    title: "Integration software for integrated navigation systems",
    description:
      "Integration 'software' designed/modified for the 'integrated navigation systems' specified in 9.A.7 (commonly employs Kalman filtering).",
  }),
  e({
    code: "9.E.1",
    title: "Technology for Item 9 navigation",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 9.A, 9.B or 9.D.",
  }),

  // ═══ ITEM 10 — FLIGHT CONTROL ══════════════════════════════════════
  e({
    code: "10.A.1",
    title: "Flight control systems",
    description:
      "Pneumatic, hydraulic, mechanical, electro-optical or electromechanical flight control systems (incl. fly-by-wire/fly-by-light) designed/modified for systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "10.A.2",
    title: "Attitude control equipment",
    description:
      "Attitude control equipment designed/modified for systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "10.A.3",
    title: "Flight control servo valves",
    description:
      "Flight control servo valves designed/modified for systems in 10.A.1 or 10.A.2 and designed/modified to operate in vibration > 10 g rms between 20 Hz and 2 kHz.",
    crossReferenceTopic: null,
  }),
  e({
    code: "10.B.1",
    title: "Test/calibration equipment for Item 10",
    description:
      "Test, calibration and alignment equipment specially designed for equipment specified in 10.A.",
  }),
  e({
    code: "10.D.1",
    title: "Software for Item 10 flight control",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 10.A or 10.B.",
  }),
  e({
    code: "10.E.1",
    title: "Design technology — air-vehicle aerodynamic integration",
    description:
      "Design 'technology' for integration of air-vehicle fuselage, propulsion system and lifting control surfaces, designed/modified for 1.A.2 or 19.A.2 systems to optimise aerodynamic performance.",
  }),
  e({
    code: "10.E.2",
    title: "Design technology — flight-management integration",
    description:
      "Design 'technology' for integration of flight-control, guidance and propulsion data into a flight-management system, designed/modified for 1.A.1 or 19.A.1 systems to optimise rocket trajectory.",
  }),
  e({
    code: "10.E.3",
    title: "Technology for Item 10 flight control",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 10.A, 10.B or 10.D.",
  }),

  // ═══ ITEM 11 — AVIONICS ════════════════════════════════════════════
  e({
    code: "11.A.1",
    title: "Radar and laser-radar systems (incl. altimeters)",
    description:
      "Radar and 'laser radar systems', including altimeters, designed/modified for use in systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "11.A.2",
    title: "Passive sensors (direction finding / terrain)",
    description:
      "Passive sensors for determining bearings to electromagnetic sources (direction finding) or terrain characteristics, designed/modified for use in systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "11.A.3",
    title: "Receiving equipment for navigation satellite systems (GNSS)",
    description:
      "GNSS/RNSS receiving equipment (GPS, GLONASS, Galileo, BeiDou, NavIC, QZSS) that is EITHER designed/modified for 1.A systems; OR designed/modified for airborne use and any of: provides navigation above 600 m/s; employs decryption for military/government secure signals; or is specially designed for anti-jam features (null-steering/electronically-steerable antenna). Excludes commercial/civil/Safety-of-Life navigation services.",
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
  }),
  e({
    code: "11.A.4",
    title: "Mil-spec high-temperature electronic assemblies",
    description:
      "Electronic assemblies and components designed/modified for 1.A or 19.A systems, specially designed for military use and operation at temperatures > 125 °C.",
    crossReferenceTopic: null,
  }),
  e({
    code: "11.A.5",
    title: "Umbilical and interstage electrical connectors",
    description:
      "Umbilical and interstage electrical connectors specially designed for systems specified in 1.A.1 or 19.A.1 (incl. connectors between the system and its payload).",
    crossReferenceTopic: null,
  }),
  e({
    code: "11.D.1",
    title: "Software for Item 11.A.1/.2/.4 equipment",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 11.A.1, 11.A.2 or 11.A.4.",
  }),
  e({
    code: "11.D.2",
    title: "Software for GNSS receivers (11.A.3)",
    description:
      "'Software' specially designed for the use of equipment specified in 11.A.3.",
  }),
  e({
    code: "11.E.1",
    title: "Design technology — EMP/EMI hardening of avionics",
    description:
      "Design 'technology' for protecting avionics/electrical subsystems against EMP and EMI from external sources (shielding systems, hardened-circuit configuration, hardening criteria).",
  }),
  e({
    code: "11.E.2",
    title: "Technology for Item 11 avionics",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 11.A or 11.D.",
  }),

  // ═══ ITEM 12 — LAUNCH SUPPORT ══════════════════════════════════════
  e({
    code: "12.A.1",
    title: "Launch handling/control/activation apparatus",
    description:
      "Apparatus and devices designed/modified for handling, control, activation and launching of systems specified in 1.A, 19.A.1 or 19.A.2.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.2",
    title: "Transporter/launcher vehicles",
    description:
      "Vehicles designed/modified for transport, handling, control, activation and launching of systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.3",
    title: "Gravimeters / gravity gradiometers",
    description:
      "Gravity meters (airborne/marine) usable for 1.A systems with static/operational accuracy ≤ 0.7 mgal AND time-to-steady-state ≤ 2 minutes; and gravity gradiometers.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.4",
    title: "Telemetry and telecontrol equipment",
    description:
      "Telemetry and telecontrol equipment (incl. ground equipment) designed/modified for systems specified in 1.A, 19.A.1 or 19.A.2. Excludes equipment for manned aircraft/satellites and commercial/civil/Safety-of-Life navigation services.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.5.a",
    title: "Precision tracking — code-translator systems",
    description:
      "Tracking systems using a code translator on the rocket/UAV with surface/airborne references or navigation satellite systems for real-time in-flight position and velocity, usable for 1.A/19.A.1/19.A.2 systems.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.5.b",
    title: "Range instrumentation radars",
    description:
      "Range instrumentation radars (incl. optical/IR trackers) with all of: angular resolution < 1.5 mrad; range ≥ 30 km with range resolution < 10 m rms; and velocity resolution < 3 m/s.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.A.6",
    title: "Thermal batteries",
    description:
      "Thermal batteries designed/modified for systems specified in 1.A, 19.A.1 or 19.A.2. Excludes thermal batteries for systems not capable of ≥ 300 km range.",
    crossReferenceTopic: null,
  }),
  e({
    code: "12.D.1",
    title: "Software for launch apparatus (12.A.1)",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 12.A.1.",
  }),
  e({
    code: "12.D.2",
    title: "Post-flight trajectory-reconstruction software",
    description:
      "'Software' that processes post-flight recorded data to determine vehicle position throughout the flight path, specially designed/modified for systems specified in 1.A, 19.A.1 or 19.A.2.",
  }),
  e({
    code: "12.D.3",
    title: "Software for telemetry/tracking equipment",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 12.A.4 or 12.A.5, usable for systems specified in 1.A, 19.A.1 or 19.A.2.",
  }),
  e({
    code: "12.E.1",
    title: "Technology for Item 12 launch support",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 12.A or 12.D.",
  }),

  // ═══ ITEM 13 — COMPUTERS ═══════════════════════════════════════════
  e({
    code: "13.A.1",
    title: "Ruggedised / rad-hard computers",
    description:
      "Analogue/digital computers or digital differential analysers designed/modified for use in systems specified in 1.A, having either: continuous-operation rating from below −45 °C to above +55 °C; or designed as ruggedised or 'radiation hardened'.",
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
  }),
  e({
    code: "13.E.1",
    title: "Technology for Item 13 computers",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment specified in 13.A.",
  }),

  // ═══ ITEM 14 — ANALOGUE-TO-DIGITAL CONVERTERS ══════════════════════
  e({
    code: "14.A.1",
    title: "Analogue-to-digital converters (mil/rad-hard)",
    description:
      "Analogue-to-digital converters usable in systems specified in 1.A, that are either ruggedised to military specifications; or designed/modified for military use as rad-hard ADC microcircuits (or hermetically-sealed parts rated −54 °C to +125 °C), or PCBs/modules rated −45 °C to +80 °C incorporating such microcircuits.",
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
  }),
  e({
    code: "14.E.1",
    title: "Technology for Item 14 ADCs",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment specified in 14.A.",
  }),

  // ═══ ITEM 15 — TEST FACILITIES AND EQUIPMENT ═══════════════════════
  e({
    code: "15.B.1.a",
    title: "Vibration test systems",
    description:
      "'Vibration test systems incorporating a digital controller' using feedback/closed-loop techniques, capable of vibrating a system at ≥ 10 g rms between 20 Hz and 2 kHz while imparting forces ≥ 50 kN measured 'bare table', usable for 1.A/19.A.1/19.A.2 systems or 2.A/20.A subsystems.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.1.b",
    title: "Vibration test digital controllers",
    description:
      "Digital controllers combined with specially designed vibration-test 'software', with real-time control bandwidth > 5 kHz, designed for use with systems specified in 15.B.1.a.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.1.c",
    title: "Vibration thrusters (shaker units)",
    description:
      "Vibration thrusters (shaker units), with or without amplifiers, capable of imparting a force ≥ 50 kN measured 'bare table', usable in systems specified in 15.B.1.a.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.1.d",
    title: "Multi-shaker support structures / electronic units",
    description:
      "Test-piece support structures and electronic units designed to combine multiple shaker units into a system providing a combined force ≥ 50 kN measured 'bare table', usable in systems specified in 15.B.1.a.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.2",
    title: "Aerodynamic test facilities (wind tunnels)",
    description:
      "Aerodynamic test facilities for speeds ≥ Mach 0.9 usable for 1.A/19.A systems or 2.A/20.A subsystems (wind tunnels, shock tunnels). Excludes wind tunnels for ≤ Mach 3 with test cross-section ≤ 250 mm.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.3",
    title: "Engine test benches / stands",
    description:
      "Test benches/stands usable for 1.A/19.A.1/19.A.2 systems or 2.A/20.A subsystems, with capacity to handle solid/liquid propellant rockets, motors or engines with thrust > 68 kN, or capable of simultaneously measuring the three axial thrust components.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.4",
    title: "Environmental chambers",
    description:
      "Environmental chambers usable for 1.A/19.A systems or 2.A/20.A subsystems: simulating altitude ≥ 15 km or temperature −50 °C to +125 °C while incorporating shaker vibration ≥ 10 g rms (20 Hz–2 kHz) at forces ≥ 5 kN; or simulating acoustic levels ≥ 140 dB (or ≥ 4 kW acoustic power) plus altitude ≥ 15 km or temperature −50 °C to +125 °C.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.5",
    title: "Bremsstrahlung accelerators (radiation effects)",
    description:
      "Accelerators delivering electromagnetic radiation (bremsstrahlung) from electrons of ≥ 2 MeV, and equipment containing them, usable for 1.A/19.A.1/19.A.2 systems or 2.A/20.A subsystems. Excludes equipment specially designed for medical purposes.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.B.6",
    title: "Aerothermodynamic test facilities",
    description:
      "Aerothermodynamic test facilities (incl. plasma arc-jet facilities, plasma wind tunnels) usable for 1.A/19.A systems or 2.A/20.A subsystems with either electrical power supply ≥ 5 MW or gas-supply total pressure ≥ 3 MPa.",
    crossReferenceTopic: null,
  }),
  e({
    code: "15.D.1",
    title: "Software for Item 15 test equipment",
    description:
      "'Software' specially designed/modified for the use of equipment specified in 15.B for testing 1.A/19.A.1/19.A.2 systems or 2.A/20.A subsystems.",
  }),
  e({
    code: "15.E.1",
    title: "Technology for Item 15 test facilities",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 15.B or 15.D.",
  }),

  // ═══ ITEM 16 — MODELLING-SIMULATION AND DESIGN INTEGRATION ═════════
  e({
    code: "16.A.1",
    title: "Hybrid computers for missile modelling/simulation",
    description:
      "Specially designed hybrid (combined analogue/digital) computers for modelling, simulation or design integration of systems specified in 1.A or subsystems specified in 2.A. Controlled only when supplied with software specified in 16.D.1.",
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
  }),
  e({
    code: "16.D.1",
    title: "Software for missile modelling/simulation/design integration",
    description:
      "'Software' specially designed for modelling, simulation or design integration of systems specified in 1.A or subsystems specified in 2.A or 20.A (incl. aerodynamic and thermodynamic analysis).",
  }),
  e({
    code: "16.E.1",
    title: "Technology for Item 16 modelling/simulation",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 16.A or 16.D.",
  }),

  // ═══ ITEM 17 — STEALTH ═════════════════════════════════════════════
  e({
    code: "17.A.1",
    title: "Devices for reduced observables",
    description:
      "Devices for reduced observables (radar reflectivity, UV/IR and acoustic signatures) usable for 1.A/19.A systems or 2.A/20.A subsystems.",
    crossReferenceTopic: null,
  }),
  e({
    code: "17.B.1",
    title: "Radar cross-section measurement systems",
    description:
      "Systems specially designed for radar cross-section measurement, usable for 1.A/19.A.1/19.A.2 systems or 2.A subsystems.",
    crossReferenceTopic: null,
  }),
  e({
    code: "17.C.1",
    title: "Materials for reduced observables",
    description:
      "Materials for reduced observables (radar reflectivity, UV/IR, acoustic signatures), incl. structural materials and coatings for tailored reflectivity/emissivity in microwave/IR/UV, usable for 1.A/19.A systems or 2.A subsystems. Does not control coatings specially used for thermal control of satellites.",
    crossReferenceTopic: null,
  }),
  e({
    code: "17.D.1",
    title: "Software for reduced observables",
    description:
      "'Software' specially designed for reduced observables usable for 1.A/19.A systems or 2.A subsystems (incl. software for signature-reduction analysis).",
  }),
  e({
    code: "17.E.1",
    title: "Technology for Item 17 stealth",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment, materials or software specified in 17.A, 17.B, 17.C or 17.D (incl. signature-reduction analysis databases).",
  }),

  // ═══ ITEM 18 — NUCLEAR EFFECTS PROTECTION ══════════════════════════
  e({
    code: "18.A.1",
    title: "Radiation-hardened microcircuits (nuclear effects)",
    description:
      "'Radiation hardened' microcircuits usable in protecting rocket systems/UAVs against nuclear effects (EMP, X-rays, blast/thermal) and usable for systems specified in 1.A. 'Radiation hardened' = rated to withstand total dose ≥ 5 × 10⁵ rads (Si).",
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
  }),
  e({
    code: "18.A.2",
    title: "Detectors for nuclear-effects protection",
    description:
      "'Detectors' specially designed/modified to protect rocket systems/UAVs against nuclear effects (EMP, X-rays, blast/thermal) and usable for systems specified in 1.A.",
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
  }),
  e({
    code: "18.A.3",
    title: "Hardened radomes (nuclear effects)",
    description:
      "Radomes designed to withstand a combined thermal shock > 4.184 × 10⁶ J/m² with a peak overpressure > 50 kPa, usable in protecting rocket systems/UAVs against nuclear effects and usable for systems specified in 1.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "18.E.1",
    title: "Technology for Item 18 nuclear-effects protection",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment specified in 18.A.",
  }),

  // ═══ ITEM 19 — OTHER COMPLETE DELIVERY SYSTEMS ═════════════════════
  e({
    code: "19.A.1",
    title: "Complete rocket systems (≥300 km range) — not in 1.A.1",
    description:
      "Complete rocket systems (incl. ballistic missiles, space-launch vehicles and sounding rockets) not specified in 1.A.1, capable of a range ≥ 300 km (i.e. without the 1.A.1 ≥500 kg payload threshold).",
    crossReferenceTopic: "complete-launch-vehicles",
  }),
  e({
    code: "19.A.2",
    title: "Complete UAV systems (≥300 km range) — not in 1.A.2",
    description:
      "Complete unmanned aerial vehicle systems (incl. cruise missiles, target drones and reconnaissance drones) not specified in 1.A.2, capable of a range ≥ 300 km.",
    crossReferenceTopic: "complete-launch-vehicles",
  }),
  e({
    code: "19.A.3",
    title: "Aerosol-dispensing UAV systems",
    description:
      "Complete UAV systems (not in 1.A.2 or 19.A.2) with either autonomous flight-control/navigation or controlled flight beyond direct vision, AND incorporating (or designed/modified to incorporate) an aerosol-dispensing system with capacity > 20 L. Excludes recreational/competition model aircraft.",
    crossReferenceTopic: "complete-launch-vehicles",
  }),
  e({
    code: "19.B.1",
    title: "Production facilities for Item 19 systems",
    description:
      "'Production facilities' specially designed for the systems specified in 19.A.1 or 19.A.2.",
  }),
  e({
    code: "19.D.1",
    title: "Subsystem-coordination software for Item 19",
    description:
      "'Software' coordinating the function of more than one subsystem, specially designed/modified for use in systems specified in 19.A.1 or 19.A.2.",
  }),
  e({
    code: "19.E.1",
    title: "Technology for Item 19 systems",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment specified in 19.A.1 or 19.A.2.",
  }),

  // ═══ ITEM 20 — OTHER COMPLETE SUBSYSTEMS ═══════════════════════════
  e({
    code: "20.A.1.a",
    title: "Individual rocket stages (for 19.A systems)",
    description:
      "Individual rocket stages, not specified in 2.A.1, usable in systems specified in 19.A.",
    crossReferenceTopic: null,
  }),
  e({
    code: "20.A.1.b",
    title: "Rocket propulsion subsystems — 8.41×10⁵ to 1.1×10⁶ Ns",
    description:
      "Rocket propulsion subsystems, not specified in 2.A.1, usable in 19.A.1 systems: solid/hybrid rocket motors, or liquid/gel propellant engines integrated into a propulsion system, having total impulse ≥ 8.41 × 10⁵ Ns but < 1.1 × 10⁶ Ns (the Cat-II propulsion band below the 2.A.1.c Cat-I threshold).",
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
  }),
  e({
    code: "20.B.1",
    title: "Production facilities for Item 20 subsystems",
    description:
      "'Production facilities' specially designed for the subsystems specified in 20.A.",
  }),
  e({
    code: "20.B.2",
    title: "Production equipment for Item 20 subsystems",
    description:
      "'Production equipment' specially designed for the subsystems specified in 20.A.",
  }),
  e({
    code: "20.D.1",
    title: "Software for Item 20 production facilities",
    description:
      "'Software' specially designed/modified for the systems specified in 20.B.1.",
  }),
  e({
    code: "20.D.2",
    title: "Software for Item 20 rocket motors/engines use",
    description:
      "'Software', not specified in 2.D.2, specially designed/modified for the use of rocket motors or engines specified in 20.A.1.b.",
  }),
  e({
    code: "20.E.1",
    title: "Technology for Item 20 subsystems",
    description:
      "'Technology' (per the General Technology Note) for development, production or use of equipment or software specified in 20.A, 20.B or 20.D.",
  }),
];
