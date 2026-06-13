/**
 * EU Annex I — Category 1 (Special Materials) + Category 2 (Materials
 * Processing) — supplier-relevant enumeration (ILA review #7).
 *
 * WHY THIS FILE: the corpus was space-systems-heavy (Cat 3/5/6/7/9) but
 * nearly silent on Cat 1 (materials: composites, prepregs, alloys,
 * propellant constituents) and Cat 2 (manufacturing: machine tools,
 * flow-forming, HIP, metrology) — exactly the territory of aerospace
 * SUPPLIERS. A composites or machining shop previously fell through the
 * matcher's coverage; the coverage metadata below makes the boundary
 * explicit either way.
 *
 * EDITORIAL RULES (same bar as the sibling cat files):
 *   - only codes verified against Reg. (EU) 2021/821 Annex I
 *     (consolidated text) — nothing speculative;
 *   - descriptions are conservative PARAPHRASES: they name the subject
 *     matter and always defer to the legal text's numeric thresholds
 *     ("thresholds in the entry govern") rather than restating every
 *     parameter from memory;
 *   - suggestion-level data: the matcher surfaces these as candidates
 *     for HUMAN review, never as determinations.
 *
 * Scope decisions (see coverage.excluded): CW/BW chemical and pathogen
 * lists (1C350+, 2B351-352 detail paragraphs) are represented by their
 * headline entries only — Passage's space/supplier focus does not need
 * the per-substance enumeration, and pretending depth there would be
 * dishonest.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02021R0821";

const ASOF = "2026-06-10";

export const EU_ANNEX_I_CAT1_2_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "Supplier-relevant Cat 1 (special materials: composites, fibres/prepregs, " +
    "alloys, ceramics, propellant constituents, nuclear-grade materials) and " +
    "Cat 2 (materials processing: machine tools, isostatic presses, " +
    "flow-forming, metrology, furnaces, vibration test) enumeration — " +
    "Wassenaar-derived (NS), MTCR-derived x1xx (MT) and NSG-derived x2xx (NP) " +
    "entries, plus software/technology headline entries.",
  excluded: [
    "1A004-1A008 protective/detection equipment and body armour (not space-supplier scope)",
    "1C350-1C354 per-substance CW precursor / pathogen / plant-pathogen enumerations — headline entries only",
    "2B350-2B352 sub-paragraph plant-equipment detail — headline entries only",
    "Most 1D/2D software and 1E/2E technology sub-paragraphs — GTN headline entries only",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 260,
  caelexCoverageCount: 54,
};

export const EU_ANNEX_I_CAT1_2_ENTRIES: ClassificationEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1A — Systems, Equipment and Components
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "1A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Composite structures or laminates of controlled fibrous materials",
    description:
      "Structures and laminates made from an organic or metal matrix with " +
      "fibrous/filamentary materials controlled under 1C010 (e.g. high-modulus " +
      "carbon fibre) or 1C210. The classic CFRP satellite-structure entry: " +
      "panels, tubes, fittings built from controlled fibre fall here even when " +
      "the finished part looks generic. Fibre properties decide — see 1C010.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Exemptions exist for certain consumer/sporting goods — verify against the entry's Note before relying on them.",
  },
  {
    code: "1A102",
    jurisdiction: "EU_ANNEX_I",
    title: "Resaturated pyrolised carbon-carbon components for launch vehicles",
    description:
      "Carbon-carbon components (resaturated/pyrolised) designed for space " +
      "launch vehicles of 9A004 or sounding rockets of 9A104 — nozzle throats, " +
      "nose tips, leading edges.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 1B — Test, Inspection and Production Equipment
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "1B001",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Equipment for producing controlled fibres, prepregs, preforms or composites",
    description:
      "Production equipment for the materials of 1A002/1C010: filament-winding " +
      "machines whose positioning axes are coordinated and programmed, " +
      "tape-laying/tow-placement machines, multidirectional weaving or " +
      "interlacing machinery, and specially designed ancillary equipment. " +
      "Axis-count and coordination thresholds in the entry govern.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1B101",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for production of structural composites for missiles",
    description:
      "Equipment other than 1B001 for the 'production' of structural " +
      "composites usable in the systems of 9A004/9A104 — including specially " +
      "designed components and accessories.",
    controlReasons: ["MT", "NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1B115",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for production of propellants and constituents",
    description:
      "Equipment, other than that specified in 1B002 or 1B102, for the " +
      "production of propellant and propellant constituents (see 1C011, " +
      "1C111): production / handling / acceptance-testing equipment for " +
      "liquid propellants (1B115.a) and for solid propellants or constituents " +
      "(1B115.b). NB the Note to 1B115.b EXCLUDES batch mixers, continuous " +
      "mixers and fluid energy mills — those are 1B117 / 1B118 / 1B119.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: "2026-06-13",
    mtcrCategory: "II",
    notes:
      "Base-corpus audit 2026-06-13: corrected the carve-out (was 'other than 1B116' → official 'other than 1B002 or 1B102') and removed the batch-mixer / fluid-energy-mill examples that the 1B115.b Note explicitly excludes.",
  },
  {
    code: "1B116",
    jurisdiction: "EU_ANNEX_I",
    title: "Nozzles for pyrolytic deposition",
    description:
      "Specially designed nozzles for producing pyrolytically derived " +
      "materials on a mould or mandrel from precursor gases at the " +
      "temperature range stated in the entry — C-C densification tooling.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1B201",
    jurisdiction: "EU_ANNEX_I",
    title: "Filament-winding machines (nuclear variant) and related equipment",
    description:
      "Filament-winding machines other than 1B001 whose motions are " +
      "coordinated/programmed for fabricating composite cylindrical rotors " +
      "(the gas-centrifuge geometry band in the entry), plus coordinating " +
      "controls and precision mandrels.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 1C — Materials
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "1C001",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Materials for absorbing electromagnetic radiation; conductive polymers",
    description:
      "Radar-absorbing materials (RAM) for the frequency bands in the entry, " +
      "and intrinsically conductive polymeric materials above the entry's " +
      "conductivity threshold. Stealth/signature-management territory.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C002",
    jurisdiction: "EU_ANNEX_I",
    title: "Metal alloys, alloy powders and alloyed materials (superalloys)",
    description:
      "Nickel, niobium and titanium aluminides, certain magnesium/titanium " +
      "alloys and nickel-base superalloys — as alloys, powders for additive " +
      "or PM routes, and alloyed materials — meeting the entry's " +
      "temperature/stress-rupture or particle-size parameters. The AM-powder " +
      "entry aerospace suppliers most often touch.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C007",
    jurisdiction: "EU_ANNEX_I",
    title: "Ceramic powders, ceramic-matrix composites and precursor materials",
    description:
      "Ceramic base powders (e.g. titanium diboride), non-composite ceramic " +
      "materials, ceramic-ceramic composites (incl. SiC/SiC), and " +
      "polymer-derived ceramic precursors per the entry — thermal-protection " +
      "and hot-structure materials.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C008",
    jurisdiction: "EU_ANNEX_I",
    title: "Non-fluorinated polymeric substances (high-temperature polymers)",
    description:
      "Bismaleimides, aromatic polyamide-imides, polyimides and " +
      "polyetherimides with the glass-transition temperature threshold in " +
      "the entry — the high-temperature matrix-resin family.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C010",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Fibrous or filamentary materials (carbon/aramid/glass/UHMWPE), prepregs",
    description:
      "The fibre entry: organic, carbon, glass and similar fibrous or " +
      "filamentary materials exceeding the specific-modulus AND " +
      "specific-tensile-strength thresholds of the entry, plus thermoset " +
      "resin-impregnated prepregs and prepreg tapes made from them. " +
      "Controlled fibre makes downstream structures 1A002.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Commercial standard-modulus carbon fibre frequently falls BELOW the thresholds — the datasheet numbers decide, not the word 'carbon fibre'.",
  },
  {
    code: "1C011",
    jurisdiction: "EU_ANNEX_I",
    title: "Metals and compounds (fine zirconium/magnesium/boron powders)",
    description:
      "Metals and compounds per the entry: zirconium and magnesium (and " +
      "alloys) in particle sizes below the entry's micron limit; boron and " +
      "boron alloys of ≥ 85% purity and particle size ≤ 60 µm; guanidine " +
      "nitrate; and nitroguanidine. (Metal powders MIXED with other " +
      "substances to form a military-purpose mixture are NOT 1C011 — the " +
      "entry's N.B. routes such mixtures to the Military Goods Controls.)",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: "2026-06-13",
    notes:
      "Base-corpus audit 2026-06-13: removed a 'metal-oxidant mixtures' over-scope (the 1C011 N.B. routes such mixtures to the Military List) and added the guanidine-nitrate / nitroguanidine members.",
  },
  {
    code: "1C012",
    jurisdiction: "EU_ANNEX_I",
    title: "Materials for nuclear heat sources (plutonium, neptunium-237)",
    description:
      "Plutonium in any form above the entry's isotopic/quantity gates and " +
      "neptunium-237 — the radioisotope heat-source (RTG) materials entry. " +
      "Deep-space power systems touch this; handling is dominated by " +
      "Euratom/safeguards law on top of export control.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C101",
    jurisdiction: "EU_ANNEX_I",
    title: "Signature-reduction materials for missile applications",
    description:
      "Materials/devices for reduced observables (radar reflectivity, UV/IR " +
      "and acoustic signatures) usable in 9A004/9A104 systems — the MTCR " +
      "twin of 1C001.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1C107",
    jurisdiction: "EU_ANNEX_I",
    title: "Graphite and ceramic materials for missile applications",
    description:
      "Fine-grain graphites, pyrolytic/fibrous reinforced graphites, and " +
      "ceramic composites (incl. silicon-carbide armours and nose-tip " +
      "ceramics) per the entry, usable in nozzles and re-entry nose tips.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1C111",
    jurisdiction: "EU_ANNEX_I",
    title: "Propellants and constituent chemicals (beyond 1C011)",
    description:
      "The propellant-chemistry entry: spherical/spheroidal aluminium powder " +
      "in the entry's particle band, metal fuels, oxidisers (incl. ammonium " +
      "perchlorate per the related ML/entry split), HTPB and other binders, " +
      "plasticisers and bonding agents. Sub-paragraph membership decides — " +
      "verify each substance against the entry list.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1C116",
    jurisdiction: "EU_ANNEX_I",
    title: "Maraging steels usable in missiles",
    description:
      "Maraging steels meeting the entry's ultimate-tensile-strength " +
      "threshold and form factors, usable in 9A004/9A104 systems — motor " +
      "cases and high-strength structural members.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1C117",
    jurisdiction: "EU_ANNEX_I",
    title: "Tungsten, molybdenum and alloys for missile components",
    description:
      "W/Mo and alloys in particulate form at the entry's purity and " +
      "particle-size gates, for nozzle/throat-insert manufacturing.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "1C202",
    jurisdiction: "EU_ANNEX_I",
    title: "Titanium and aluminium alloys (nuclear-geometry forms)",
    description:
      "Ti and Al alloys meeting the entry's tensile-strength thresholds in " +
      "tubular or cylindrical solid forms within the diameter band — the " +
      "centrifuge-rotor-adjacent alloy entry.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C210",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Fibrous/filamentary materials for centrifuge rotors (nuclear variant)",
    description:
      "Carbon, aramid and glass fibrous materials and resin-impregnated " +
      "prepregs per the entry's modulus/strength gates, other than 1C010 — " +
      "the NSG twin of the fibre entry.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C216",
    jurisdiction: "EU_ANNEX_I",
    title: "Maraging steel (nuclear variant)",
    description:
      "Maraging steel other than 1C116 meeting the entry's strength gate, in " +
      "the listed forms — NSG-derived twin of the missile maraging entry.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C230",
    jurisdiction: "EU_ANNEX_I",
    title: "Beryllium metal, alloys and compounds",
    description:
      "Beryllium metal, alloys above the entry's Be-content, compounds, and " +
      "manufactures thereof (windows/structures), with the entry's stated " +
      "exclusions. Space optics/structures grade beryllium falls here.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C232",
    jurisdiction: "EU_ANNEX_I",
    title: "Helium-3",
    description:
      "Helium-3 and helium isotopically enriched in He-3, incl. mixtures " +
      "and products containing them, above the entry's quantity gate — " +
      "cryogenics and neutron detection.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C234",
    jurisdiction: "EU_ANNEX_I",
    title: "Zirconium (low-hafnium, nuclear grade)",
    description:
      "Zirconium with a hafnium content below the entry's ratio, as metal, " +
      "alloys above the stated Zr content, compounds and manufactures — " +
      "distinct from the fine Zr POWDER control in 1C011.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1C350",
    jurisdiction: "EU_ANNEX_I",
    title: "Chemical-weapons precursor chemicals (headline entry)",
    description:
      "The CW-precursor list: dozens of enumerated chemicals with CAS " +
      "numbers and mixture-concentration gates. Passage carries the HEADLINE " +
      "only — per-substance determinations need the full entry text and " +
      "CWC schedules.",
    controlReasons: ["CB"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deliberately summary-level: Passage's corpus does not enumerate the substance list (see coverage.excluded).",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 1D / 1E — Software & Technology (headline entries)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "1D002",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Software for developing organic, metal or carbon matrix laminates or composites",
    description:
      "'Software' specially designed for the 'development' of organic " +
      "'matrix', metal 'matrix' or carbon 'matrix' laminates or 'composites' " +
      "(1A002 / 1C010-class structures) — ply-design and laminate-engineering " +
      "tooling above generic CAD.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: "2026-06-13",
    notes:
      "Base-corpus audit 2026-06-13: title/description previously dropped 'carbon matrix' (carbon-carbon composites) — official 1D002 covers organic, metal OR carbon matrix.",
  },
  {
    code: "1E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for Cat-1 controlled materials/equipment (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'development' or " +
      "'production' of items controlled in 1A001.b/1A001.c, 1A002-1A005, 1B " +
      "and 1C — process specs, layup schedules, cure cycles. Technology " +
      "transfer (email, hosting, deemed export) counts as export.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "1E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for MTCR-derived Cat-1 items",
    description:
      "'Technology' per the GTN for the 'use' of the 1x1xx items (1A102, " +
      "1B101/1B115-1B116, 1C101-1C117 family) — the MT technology shadow.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2A — Systems, Equipment and Components
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "2A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Anti-friction bearings and bearing systems (precision classes)",
    description:
      "Ball and solid-roller bearings to the tolerance classes stated in the " +
      "entry (ISO 492 class 4 / ABEC-7 territory and better), with the " +
      "entry's material and exclusion notes — precision spindle and gyro " +
      "bearing territory.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2B — Test, Inspection and Production Equipment
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "2B001",
    jurisdiction: "EU_ANNEX_I",
    title: "Machine tools (turning/milling/grinding) above accuracy gates",
    description:
      "The machine-tool entry: NC turning, milling and grinding machines " +
      "whose unidirectional positioning accuracy (ISO 230-2) beats the " +
      "per-type thresholds, plus the contouring-axis-count conditions, and " +
      "certain EDM/other non-conventional material-removal machines. The " +
      "single most common surprise control for precision machine shops.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Five-axis simultaneous contouring + tight positioning accuracy is the classic trigger combination; the threshold table in the entry governs.",
  },
  {
    code: "2B004",
    jurisdiction: "EU_ANNEX_I",
    title: "Hot isostatic presses (HIP)",
    description:
      "Hot isostatic presses with controlled thermal environment and chamber " +
      "cavity at/above the entry's size and pressure gates, plus specially " +
      "designed dies, moulds and controls — AM post-processing and C-C " +
      "densification equipment.",
    controlReasons: ["NS", "MT", "NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B005",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Deposition/coating equipment (CVD, PVD, ion implantation) for non-electronic substrates",
    description:
      "Equipment specially designed for the deposition processes of the " +
      "coating table (2E003.f) — CVD, electron-beam PVD, plasma spraying, " +
      "ion plating/implantation — together with handling and control gear.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B006",
    jurisdiction: "EU_ANNEX_I",
    title: "Dimensional inspection/measuring systems (CMMs, interferometers)",
    description:
      "Coordinate measuring machines with maximum permissible error at/below " +
      "the entry's E0-MPE formula gate, linear/angular displacement " +
      "instruments beyond stated accuracies, and laser-interferometric " +
      "systems — the metrology shadow of 2B001.",
    controlReasons: ["NS", "NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B009",
    jurisdiction: "EU_ANNEX_I",
    title: "Spin-forming and flow-forming machines",
    description:
      "Spin/flow-forming machines meeting the entry's roller-force and " +
      "axis-control conditions — motor-case and pressure-vessel forming " +
      "equipment (see also 2B109/2B209 regime twins).",
    controlReasons: ["NS", "MT", "NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B104",
    jurisdiction: "EU_ANNEX_I",
    title: "Isostatic presses for missile applications",
    description:
      "Isostatic presses other than 2B004 meeting the entry's pressure and " +
      "chamber gates, usable for 9A004/9A104-related production.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "2B105",
    jurisdiction: "EU_ANNEX_I",
    title: "CVD furnaces for carbon-carbon densification",
    description:
      "Chemical-vapour-deposition furnaces designed or modified for the " +
      "densification of carbon-carbon composites.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "2B109",
    jurisdiction: "EU_ANNEX_I",
    title: "Flow-forming machines usable in missile production",
    description:
      "Flow-forming machines and specially designed components, other than " +
      "2B009, per the entry — usable in producing propulsion components " +
      "(motor cases, domes) for 9A004/9A104 systems.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "2B116",
    jurisdiction: "EU_ANNEX_I",
    title: "Vibration test systems (≥10 g rms class) and components",
    description:
      "Vibration test systems with digital-control feedback capable of the " +
      "entry's acceleration (order 10 g rms across 20 Hz-2 kHz) at the " +
      "stated thrust, plus digital controllers, shakers and test-structure " +
      "support — qualification-shaker territory familiar to every satellite " +
      "AIT campaign.",
    controlReasons: ["MT", "NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "2B117",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Equipment and controls for nozzle/nose-tip densification and pyrolysis",
    description:
      "Equipment and process controls, beyond 2B004/2B005/2B104/2B105, " +
      "designed or modified for densification and pyrolysis of structural " +
      "composite rocket nozzles and re-entry nose tips.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "2B201",
    jurisdiction: "EU_ANNEX_I",
    title: "Machine tools (nuclear variant)",
    description:
      "Machine tools other than 2B001 for cutting/removing metals, ceramics " +
      "or composites per the entry's accuracy gates (turning/milling/" +
      "grinding) — the NSG-derived machine-tool twin.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B204",
    jurisdiction: "EU_ANNEX_I",
    title: "Isostatic presses (nuclear variant)",
    description:
      "Isostatic presses other than 2B004/2B104 meeting the entry's pressure " +
      "and chamber-size gates, plus dies and controls.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B206",
    jurisdiction: "EU_ANNEX_I",
    title: "Dimensional inspection machines/instruments (nuclear variant)",
    description:
      "Dimensional inspection machines, instruments and systems other than " +
      "2B006 per the entry's accuracy gates — NSG metrology twin.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B209",
    jurisdiction: "EU_ANNEX_I",
    title: "Flow-forming/spin-forming machines (nuclear variant)",
    description:
      "Flow-forming and combined spin/flow-forming machines other than " +
      "2B009/2B109 with the entry's roller and mandrel-diameter conditions — " +
      "rotor-tube forming territory.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B225",
    jurisdiction: "EU_ANNEX_I",
    title: "Remote manipulators (hot-cell class)",
    description:
      "Remote manipulators providing mechanical translation of human " +
      "operator actions through a barrier, with the entry's " +
      "wall-penetration/master-slave capability conditions — radiochemical " +
      "hot-cell equipment.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B226",
    jurisdiction: "EU_ANNEX_I",
    title: "Controlled-atmosphere induction furnaces and power supplies",
    description:
      "Induction furnaces (vacuum or controlled atmosphere) and specially " +
      "designed power supplies at/above the entry's power gate — " +
      "high-purity-metallurgy equipment.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B227",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Vacuum/controlled-atmosphere metallurgical melting and casting furnaces",
    description:
      "Arc remelt/casting, e-beam melting, plasma atomisation and melting " +
      "furnaces per the entry's capacity/power gates, incl. computer " +
      "control/monitoring units specially configured for them — superalloy " +
      "and Ti melt-shop equipment.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B230",
    jurisdiction: "EU_ANNEX_I",
    title: "Pressure transducers for corrosive media (UF6-capable)",
    description:
      "Absolute-pressure transducers with sensing elements of or protected " +
      "by the entry's UF6-resistant materials, within the stated pressure " +
      "ranges and accuracy gates.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B231",
    jurisdiction: "EU_ANNEX_I",
    title: "Vacuum pumps (large input throat / high flow)",
    description:
      "Vacuum pumps meeting ALL of the entry's gates (input throat size, " +
      "pumping speed, vacuum class) — large TVAC-infrastructure-grade " +
      "pumping equipment.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2B350",
    jurisdiction: "EU_ANNEX_I",
    title: "Chemical manufacturing plant and equipment (headline entry)",
    description:
      "Reaction vessels, storage tanks, heat exchangers, columns, pumps and " +
      "valves whose product-wetted surfaces are made from the corrosion-" +
      "resistant materials enumerated in the entry (Ni-alloys, tantalum, " +
      "glass-lined, etc.). Headline-level coverage — sub-paragraph " +
      "determinations need the entry text.",
    controlReasons: ["CB"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deliberately summary-level (see coverage.excluded) — outside Passage's space-supplier depth.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2D / 2E — Software & Technology (headline entries)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "2D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for the development/production of Cat-2 equipment",
    description:
      "'Software' other than 2D002 specially designed for the 'development' " +
      "or 'production' of equipment controlled under 2A or 2B.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2D002",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for electronic devices performing machine-tool control",
    description:
      "'Software' for electronic devices — even when residing IN the device " +
      "or machine — enabling such devices to function as the NC unit of a " +
      "machine tool capable of controlling beyond the entry's coordinated " +
      "contouring-axis count.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for the development of Cat-2 equipment/software (GTN)",
    description:
      "'Technology' per the GTN for the 'development' of equipment or " +
      "software controlled in 2A, 2B or 2D.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "2E003",
    jurisdiction: "EU_ANNEX_I",
    title: "Other technology: machine-tool know-how and the coating table",
    description:
      "Specific 'technology' entries beyond the GTN pair — most notably " +
      "2E003.f: the coating-process table pairing controlled deposition " +
      "processes (CVD, PVD variants, plasma spray) with substrate classes. " +
      "Coating shops serving turbine/space hot parts hit this entry.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
];

// ─── Helpers (mirroring the sibling cat-file API) ───────────────────

export function findEuAnnexICat12Entry(
  code: string,
): ClassificationEntry | undefined {
  const needle = code.trim().toUpperCase();
  return EU_ANNEX_I_CAT1_2_ENTRIES.find((e) => e.code.toUpperCase() === needle);
}

export function findEuAnnexICat12EntriesByPrefix(
  prefix: string,
): ClassificationEntry[] {
  const needle = prefix.trim().toUpperCase();
  return EU_ANNEX_I_CAT1_2_ENTRIES.filter((e) =>
    e.code.toUpperCase().startsWith(needle),
  );
}
