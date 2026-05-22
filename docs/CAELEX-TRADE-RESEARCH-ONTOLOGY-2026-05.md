# Exportkontroll-Klassifizierung von Raumfahrt-Gütern: Maschinenlesbares Ontologie- und Parametermodell über alle Regime

## TL;DR

- A single space asset is governed simultaneously by **five interlocking regimes** — ITAR USML Category XV (and IV for launchers), EAR ECCN 9x515 / 9A004 / 9A001 / 7A005 / 7A105 / 3A001, EU Annex I (Reg. 2021/821 as amended by Delegated Reg. 2025/2003 in force since 15 Nov 2025), MTCR Annex Cat. I/II, and the German Ausfuhrliste (Anlage AL zur AWV, Teil I Abschnitt A/B) — and the jurisdiction frequently flips on a single 1 % spec move (aperture 0.50 m, total impulse 1.1 × 10⁶ N·s, SEU ≤ 1×10⁻¹⁰ errors/bit/day, payload 500 kg @ 300 km).
- A workable software ontology is a **per-regime ControlListEntry graph** linked by predicate-level "see_also" edges (analogous_to / superset_of / subset_of / derived_from). The Annex-I suffix-digit logic (0xx Wassenaar, 1xx MTCR, 2xx NSG, 3xx AG, 4xx CWC, 9xx national) is the strongest auto-correlation key on the EU side, but breaks at the US/EU boundary because the US 9x515 family has no formal EU pendant.
- The defensible build is: (i) **load primary feeds** (EUR-Lex CELEX 32025R2003, BAFA AL PDFs, eCFR 15 CFR 774 / 22 CFR 121, MTCR Annex, Wassenaar List); (ii) **normalise** each entry into the ControlListEntry schema below; (iii) **predicate-match** product datasheets against the queryable attribute set; (iv) **rank** candidate classifications with citation-grade evidence; (v) **flag the hard edges** where a 1 % spec change flips ITAR ↔ EAR ↔ EU 9A004 ↔ MTCR Cat I.

## Key Findings

### 1. Regime landscape — five lists, four logics

| Regime                                  | Authority                     | Current text in force                                                                                                                                                                                                                                           | Update cycle                                                                                                                                                                                                                                                | Feed                                  |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **EU Annex I (Dual-Use)**               | Reg. (EU) 2021/821, Art. 17   | Delegated Reg. **(EU) 2025/2003** of 8 Sep 2025, OJ L 2025/2003 of 14 Nov 2025, in force **15 Nov 2025**                                                                                                                                                        | "typically amended at least once each year via a Delegated Act based on decisions and commitments taken within the framework of the international non-proliferation regimes and export control arrangements" (European Commission Trade Policy, 8 Sep 2025) | EUR-Lex CELEX 32025R2003              |
| **US EAR / CCL Cat 9**                  | 50 U.S.C. 4801–4852, EO 13222 | 15 CFR 774 Suppl. 1 Cat 9, as amended by **Final Rule, IFR and Proposed Rule of 23 Oct 2024** + AUKUS/Canada RS-removal final rule of same date                                                                                                                 | rolling                                                                                                                                                                                                                                                     | eCFR; BIS CCL PDF                     |
| **US ITAR / USML Cat XV (+ IV)**        | 22 U.S.C. 2778, EO 13637      | 22 CFR 121.1, Cat XV as last amended by **82 FR 2889 (10 Jan 2017)**; targeted USML revisions effective 15 Sep 2025 (90 FR 41778) did NOT touch Cat XV; comprehensive USML XV/IV NPRM (89 FR 84618 / 89 FR 84784) remains at proposed-rule stage as of May 2026 | rolling                                                                                                                                                                                                                                                     | eCFR (22 CFR 121); DDTC               |
| **MTCR Annex**                          | political (1987)              | Most recently updated at the **36th Plenary Meeting, Rio de Janeiro, 30 October – 3 November 2023**, with Annex text updated 25 April 2024 and uploaded 27 May 2024 (mtcr.info/en/mtcr-annex; Japan MOFA mofa.go.jp/dns/n_s_ne/page24e_000436.html)             | post-plenary                                                                                                                                                                                                                                                | mtcr.info; MTCR Annex Handbook        |
| **Wassenaar Arrangement**               | political (1996)              | **WA-LIST (25) 1 Corr., agreed at the 29th WA Plenary chaired by Ambassador Kaifu Atsushi (Japan), Vienna, 3–4 December 2025** (Plenary Chair Statement, 4 Dec 2025)                                                                                            | annual; "the next regular WA Plenary meeting is to take place in Vienna in December 2026, during which Participating States will mark the 30th Anniversary of the WA" (2025 Plenary Chair Statement)                                                        | wassenaar.org                         |
| **DE Ausfuhrliste (Anlage AL zur AWV)** | § 4 AWG, AWV §§ 8 ff.         | Anlage AL i.d.F. der **22. AWV-Änderungsverordnung** vom 29.10.2025 (BGBl. 2025 I Nr. 261), **in Kraft 1.11.2025**                                                                                                                                              | rolling national; 900er-Positionen (national Dual-Use)                                                                                                                                                                                                      | BAFA PDFs; Umschlüsselungsverzeichnis |

### 2. The US 9x515 family — structure post-23 Oct 2024

ECCN **9A515** "Spacecraft and related commodities" subparagraphs after the BIS IFR of 23 Oct 2024:

- **9A515.a** — "Spacecraft", incl. satellites and space vehicles, not enumerated in USML XV or 9A004, split into:
  - **.a.1** — spacecraft with electro-optical remote sensing **clear aperture > 0.35 m but ≤ 0.50 m**;
  - **.a.2** — spacecraft with remote sensing beyond NIR (SWIR, MWIR or LWIR);
  - **.a.3** — radar remote sensing (AESA/SAR/ISAR) **center frequency ≥ 1.0 GHz, < 10.0 GHz** and **bandwidth ≥ 100 MHz but < 300 MHz**;
  - **.a.4** — spacecraft providing space-based logistics, assembly or servicing of another spacecraft (per 2024 clarification: docking, refuelling, life-sustaining operations, debris capture; the NASA Docking System case);
  - **.a.5** — all other spacecraft (typical commercial GEO comsat without anti-jam, planetary rover, JWST, in-space habitat).
- **9A515.b** — Ground control / training simulators for TT&C of 9A515.a spacecraft.
- **9A515.d** — Radiation-hardened microelectronic circuits meeting **all five** of the historic XV(d) thresholds (see §3.1).
- **9A515.e** — Microelectronic circuits and discrete components meeting the (e) chapeau, having **TID ≥ 5 × 10⁵ Rad(Si)** but not meeting all five 9A515.d criteria.
- **9A515.g** — Components specially designed for the more sensitive remote-sensing spacecraft 9A515.a.1–.a.4.
- **9A515.x** — Catch-all "specially designed" parts for 9A515.a–.g and USML XV. **RfC reduced from NS1/RS1 to NS2/RS2** by the 23 Oct 2024 IFR.
- **9A515.y** — Items determined via interagency CCATS to warrant only **RS controls to China/Russia/Belarus/Venezuela** (IFR added y.7–y.74).
- **9B515** — Test/inspection/production equipment.
- **9C515** — _proposed_: materials/coatings for reducing in-orbit signatures.
- **9D515** — Software (.a, .d/.e for rad-hard ICs, proposed .c for SSA software, .y, .x).
- **9E515** — Technology with parallel subparagraphs; new **.f** for sensitive remote sensing; 9E515.x reduced to NS2/RS2.

**Reasons for Control**: NS1/NS2, RS1/RS2, AT1/AT2, MT where MTCR item is incorporated (cross-ref USML IV(d)(2) for separable propulsion ≥ 1.1 × 10⁶ N·s).
**License Exception STA** generally available to Country Group A:5, but 9A515.a.1–.a.4 and .g require a **§ 740.20(g)** BIS request first.
**AUKUS/Canada carve-out** (23 Oct 2024 Final Rule, 15 CFR § 742.6(a)(9)): **no license required** to Australia, Canada or UK for 9A515.a.1, .a.2, .a.3, .a.4, .g and 9E515.f.
**License Exception CSA (proposed § 740.26)**: for items destined to "official space agency programs" (e.g. NASA Lunar Gateway, ESA partners) and for manned suborbital spacecraft used for space tourism / fundamental research, subject to FAA-equivalent diversion approval and Country Group D:5 exclusions.

### 3. USML Category XV (current text per 22 CFR 121.1)

- **XV(a) Spacecraft** that:
  - (a)(1) are specially designed to mitigate or detect a nuclear detonation;
  - (a)(2) autonomously detect/track moving ground/airborne/missile/space objects in real time using imaging/IR/radar/laser;
  - (a)(3) conduct SIGINT or MASINT;
  - (a)(4) virtual-satellite constellation/formation;
  - (a)(5) anti-satellite/anti-spacecraft (kinetic, RF, laser, charged particle);
  - (a)(6) space-to-ground weapons;
  - (a)(7) electro-optical remote sensing — **canonical aperture threshold 0.50 m for VNIR/IR <40 spectral bands** (raised from 0.35 m by 82 FR 2889 on 10 Jan 2017); hyperspectral ≥ 40 bands with GSD < 30 m (VNIR/SWIR), GSD < 200 m (MWIR), GSD < 500 m (LWIR);
  - (a)(8) radar remote sensing (AESA/SAR/ISAR/UWB-SAR), except those with **center frequency ≥ 1 GHz but ≤ 10 GHz AND bandwidth < 300 MHz** (which flow to EAR 9A515.a.3);
  - (a)(9) PNT signals (excluding pure differential correction);
  - (a)(10) autonomous collision avoidance (added 2017);
  - (a)(11) sub-orbital with Cat IV(d)(1)–(6) or XV(e) propulsion, specially designed for atmospheric entry/re-entry;
  - (a)(12) inspection, surveillance or servicing of another spacecraft via grappling/docking, except those that dock exclusively via the **NASA Docking System** (flow to 9A515.a.4);
  - (a)(13) classified, contain classified SW/HW, or developed using classified info.
- **XV(b)** TT&C ground control / training simulators for XV(a) spacecraft.
- **XV(c)** [Reserved] — military GPS receivers moved to USML Cat **XII(d)** and EAR **7A005.a/7A105**.
- **XV(d)** [Reserved] — rad-hard microcircuits moved to **ECCN 9A515.d** in June 2014.
- **XV(e)** Parts/components/accessories/attachments:
  - (e)(1) antenna systems with **diameter > 25 m**, active electronic scanning, adaptive beam forming, or interferometric radar;
  - (e)(2) space-qualified optics with **active properties (adaptive/deformable) AND clear aperture > 0.35 m** (e.2.i), OR clear aperture > **0.50 m** (e.2.ii, passive);
  - (e)(3) space-qualified focal-plane arrays with **peak response > 900 nm** + ROIC;
  - (e)(4) space-qualified mechanical (active) cryocoolers / active cold-finger systems;
  - (e)(5) space-qualified active vibration suppression systems;
  - (e)(6) optical bench assemblies enabling (a)-class parameters;
  - (e)(7) space-qualified kinetic/directed-energy systems for (a)(5)/(a)(6);
  - (e)(9) space-qualified Cs / Rb / hydrogen-maser / quantum atomic clocks;
  - (e)(10) ADCS with **geolocation without ground tie-points** better than 5 m (LEO) / 30 m (MEO) / 150 m (GEO) / 225 m (HEO) CE90;
  - (e)(11)(i)-(iii) space-based nuclear reactors, RTGs, nuclear-thermal propulsion; **(e)(11)(iv) electric (Plasma/Ion) propulsion that simultaneously provides thrust > 300 mN and Isp > 1,500 s, OR operates at input power > 15 kW**;
  - (e)(12) chemical bi/mono-propellant thrusters with **vacuum thrust > 150 lbf (667.23 N)** (MT for total impulse ≥ 8.41 × 10⁵ N·s);
  - (e)(13) Control Moment Gyroscopes (CMG) specially designed for spacecraft (reaction/momentum wheels are explicitly NOT controlled — per the 2014 IFR preamble at 79 FR 27184 — they fall to ECCN 9A515.x);
  - (e)(14) space-qualified T/R MMICs with Psat > 200/fGHz² W or 3-bit / 4-bit phase shifting;
  - (e)(15) space-qualified oscillators with phase noise < −120 dBc/Hz + 20·log₁₀(fGHz) at 2·fGHz·kHz offset;
  - (e)(16) **star trackers/star sensors with accuracy ≤ 1 arcsec (1σ) AND tracking rate ≥ 3.0 deg/s** (MT);
  - (e)(17) primary/secondary/hosted payload performing any (a) function (the **see-through rule** stays on the payload itself; a 9A515.a spacecraft hosting an ITAR (e)(17) hosted payload remains EAR for the spacecraft and ITAR for the payload);
  - (e)(19) atmospheric re-entry heat shields/sinks (MT if usable in 500 kg/300 km systems);
  - (e)(20) propulsion modules/stages/compartments separable from another spacecraft;
  - (e)(21) classified catch-all.
- **XV(f)** Technical data and defense services. Note 3 (2017) carves out spacecraft **"housekeeping" telemetry** (health/status, raw sensor output, state vector, ephemeris, command responses) from "technical data".
- **XV(x)** EAR-subject parts integrated into ITAR XV defense articles.

#### 3.1 The five XV(d) criteria — now ECCN 9A515.d

Rad-hard microcircuits are controlled in ECCN 9A515.d if they meet **all five** conjunctively (historic Category XV(d) text ported into 9A515.d in 2014):

1. **TID ≥ 5 × 10⁵ Rad(Si)** (= 5 kGy(Si));
2. **Dose rate upset ≥ 5 × 10⁸ Rad(Si)/s**;
3. **Neutron fluence ≥ 1 × 10¹⁴ N/cm²** (1 MeV equiv.);
4. **SEU rate ≤ 1 × 10⁻¹⁰ errors/bit/day**;
5. **SEL-free at LET ≥ 80 MeV·cm²/mg**, with **dose-rate latch-up ≥ 5 × 10⁸ Rad(Si)/s**.

Microcircuits with TID ≥ 5 × 10⁵ Rad(Si) but failing one of the other four fall to **9A515.e** (added explicitly by the 23 Oct 2024 IFR's new (e)(2)).

### 4. EU Annex I Category 9 — post-Delegated Reg. (EU) 2025/2003

Reg. 2025/2003 fully replaces Annex I as in force from 15 Nov 2025. Space-relevant changes:

- **Definitions** — "satellite" replaced/supplemented by "spacecraft", with new global definitions for **"spacecraft", "satellite", "space probe", "space vehicle"**. "Payloads" replaced by **"mission equipment"** — broader, may include on-board computing, inter-satellite communications, thermal management equipment.
- **9A001** — gas turbines.
- **9A004** — Wassenaar core: "Space launch vehicles and 'spacecraft', 'spacecraft buses', 'spacecraft payloads', 'spacecraft' on-board systems or equipment, terrestrial equipment, and air-launch platforms, and 'sub-orbital craft'". Subparagraphs: .a SLVs, .b–.f spacecraft and on-board equipment, .r in-space habitats (2024), .y de-controlled items. Maps on US side to USML IV (.a) and 9A515 (.b–.f, .h).
- **9A005** — Liquid rocket propulsion systems containing 9A006 components.
- **9A006** — Components for liquid rocket propulsion; the 2025 update **extends cryogenic controls to systems maintaining T ≤ 100 K**, no longer limited to "specially designed" for hypersonic aircraft/space vehicles.
- **9A007** — Solid rocket propulsion ≥ 1.1 × 10⁶ N·s total impulse (MTCR Cat I).
- **9A008–9A011** — components, hybrid propulsion, launch-vehicle components, ramjet/scramjet engines.
- **9A012** — UAVs and unmanned airships.
- **9A101–9A121** — MTCR-derived dual-use entries (turbojet/turbofan engines for missiles; turboprop; sounding rockets ≥ 300 km; 9A105 liquid rocket engines ≥ 0.841 MN·s; 9A107 solid motors ≥ 0.841 MN·s; 9A110 missile composites; 9A115 launch support; 9A116 re-entry vehicles; 9A117 staging; 9A119 individual rocket stages capable of 300 km; 9A120 liquid/gel propellant tanks for ≥ 500 kg/300 km systems; 9A121 connectors).
- **New Additive Manufacturing controls (2025/2003)** — 3D metal printers and inoculants/specific powders, physically placed in Cat 2 (machine tools) and Cat 1 (materials), explicitly covering turbopumps, heat exchangers, lightweight structures for satellites and launchers.
- **9B005–9B117** — test, production, wind tunnels, test stands.
- **9D001–9D105** — software for development/production/use; 9D101/9D103/9D104/9D105 for MTCR-relevant items.
- **9E001/9E002/9E003** — technology for development/production/use; 9E101/9E102 for MTCR-relevant items.

#### 4.1 The Annex-I suffix-digit correlation logic

Cat 9 entries (and all Annex I) follow the **WA-based numbering**:

- **9A001–9A099** = Wassenaar dual-use (≈ ECCN 9A001-9A009 core);
- **9A101–9A199** = MTCR-derived dual-use;
- **9A201–9A299** = NSG-derived (none in Cat 9);
- **9A301–9A399** = Australia Group (none in Cat 9);
- **9A401–9A499** = CWC (none in Cat 9);
- **9A901–9A999** = national EU/DE additions (in Annex I) or German national 900-positions (Teil I Abschnitt B of the AL).

This is the **strongest auto-correlation key** the EU side offers. A WA entry can be matched to the US ECCN with the same first digit (EU 9A001 ↔ US 9A001). Where the second character is "1" (MTCR), the corresponding US item carries an MT control flag on the CCL and a "(MT)" notation in the USML. The logic **breaks** at US 9A515 / USML XV, which were created in 2014 specifically because the WA list does not control commercial satellites at the same granularity as the US: 9A515.a.1 has **no EU pendant** — commercial commsats are outside Annex I unless the comsat falls within 9A004.b–.f.

### 5. German Ausfuhrliste — Anlage AL zur AWV (22. AWV-ÄndVO, in Kraft 1.11.2025)

Two-part structure: **Teil I Abschnitt A** (Waffen, Munition, Rüstungsmaterial; corresponds to the EU Common Military List, with German national extensions); **Teil I Abschnitt B** (national Dual-Use Ergänzungsliste, 900er-Positionen).

Space-relevant Teil I Abschnitt A entries:

- **0010** — "Luftfahrzeuge", "Luftfahrtgeräte" (incl. military UAS, military variants of civilian aircraft). Sub-position **0010j** explicitly covers "suborbitale Fahrzeuge" specially designed or modified for military purposes.
- **0008** — Treibstoffe, Treibladungen, Sprengstoffe etc. — military rocket propellants, with catch-all for military propellants not in Cat V.
- Position numbering otherwise matches the EU Common Military List ML4 (rockets, missiles, bombs), ML10 (aircraft / lighter-than-air), ML11 (military electronics), ML15 (military spacecraft).

Teil I Abschnitt B 900er-Positionen of space relevance:

- **9A901** — national extensions to civil aerospace items; **9A994** — civil aircraft and aero-engines below the 0010 threshold; the 900-series is **embargo-specific** (genehmigungspflichtig nur in die in der Güterlistennummer ausdrücklich genannten Bestimmungsländer — vorwiegend Russland, Belarus, Iran, Nordkorea, Syrien).
- **9E991/9E992** — national-control technology positions.

The **gemeinsames Stichwortverzeichnis** (BAFA) and the **Umschlüsselungsverzeichnis** map between **Warennummer** (HS-Zolltarifnummer) and **Güterlistennummer** — the Umschlüsselungsverzeichnis is the input feed for ATLAS-Ausfuhr and AEB Export Controls.

### 6. MTCR Annex — the 300 km / 500 kg hinge

- **Category I (strong presumption of denial)**:
  - **Item 1** — Complete rocket systems (ballistic missiles, SLVs, sounding rockets) and complete UAS (cruise missiles, target/recon drones) **capable of delivering ≥ 500 kg payload to ≥ 300 km range**.
  - **Item 2** — Complete subsystems usable in Item 1: rocket stages, RVs, rocket engines/motors with **total impulse ≥ 1.1 × 10⁶ N·s**, guidance sets, TVC sub-systems, SAFF.
- **Category II (case-by-case)**: all other systems including ≥ 300 km range regardless of payload, plus components/materials/equipment/software relevant here:
  - **Item 3** — Propulsion components (combustion chambers, nozzles ≥ 0.841 × 10⁶ N·s but < 1.1 × 10⁶ N·s).
  - **Item 9** — Instrumentation, navigation, direction-finding (gyros, accelerometers, IMUs).
  - **Item 10** — Flight control equipment.
  - **Item 11** — Avionics (GNSS receivers designed/modified for missiles or for airborne applications with anti-jam / military decryption — Item 11.A.3 is the basis for ECCN 7A105).
  - **Item 12** — Launch support equipment.
  - **Item 13** — Computers (rad-hard / military-spec for missile use).
  - **Item 18** — Structural composites and pyrolytic deposition components.
  - **Item 19** — Sub-systems for ≥ 300 km, < 500 kg.
  - **Item 20** — Production technology and software.

US treats this as "MT controls" on the CCL (MT Column 1, license required to all destinations except Canada) and "(MT)" on the USML. The EU mirrors it via Annex I 1xx entries. The **1.1 × 10⁶ N·s** and **0.841 × 10⁶ N·s** impulse thresholds (Items 2/3) are the **single most important quantitative tripwires** for launcher and apogee-motor classification.

### 7. The "hard" jurisdiction-flip parameters

| Parameter                                                | Threshold                                                                                                                                                                   | Below threshold                                                 | Above threshold                | Comment                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| **EO clear aperture (Earth-pointing, <40 bands)**        | **0.50 m**                                                                                                                                                                  | ECCN 9A515.a.1 (0.35 < d ≤ 0.50) or 9A515.a.5 (≤ 0.35)          | **USML XV(a)(7)(i)**           | The single most important threshold; raised from 0.35 m in 2017                 |
| **Space-qualified optics, passive**                      | 0.50 m                                                                                                                                                                      | ECCN 9A515.g                                                    | **USML XV(e)(2)(ii)**          |                                                                                 |
| **Space-qualified optics, active (adaptive/deformable)** | 0.35 m                                                                                                                                                                      | ECCN 9A515.g                                                    | **USML XV(e)(2)(i)**           |                                                                                 |
| **SAR center freq / bandwidth**                          | 1–10 GHz **AND** BW < 300 MHz                                                                                                                                               | EAR 9A515.a.3 (BW 100–300 MHz)                                  | **USML XV(a)(8)**              | C/X-band SAR with > 300 MHz BW = ITAR                                           |
| **PNT signal generation**                                | differential-only carve-out                                                                                                                                                 | EAR / EAR99                                                     | **USML XV(a)(9)**              | Galileo/Beidou/GPS payloads = ITAR                                              |
| **Antenna diameter**                                     | **25 m**                                                                                                                                                                    | ECCN 9A515.x                                                    | **USML XV(e)(1)**              | Or active scanning / adaptive beamforming                                       |
| **FPA peak wavelength**                                  | **> 900 nm**                                                                                                                                                                | EAR                                                             | **USML XV(e)(3)**              | Plus the ROIC                                                                   |
| **Electric propulsion**                                  | **thrust > 300 mN AND Isp > 1,500 s, OR input power > 15 kW**                                                                                                               | EAR 9A515 / 9A004                                               | **USML XV(e)(11)(iv)**         | High-power EP for GEO and OBES                                                  |
| **Chemical thruster vacuum thrust**                      | **150 lbf (667.23 N)**                                                                                                                                                      | EAR / 9A515                                                     | **USML XV(e)(12)**             | ≥ 8.41 × 10⁵ N·s impulse → also MT                                              |
| **Star tracker accuracy & rate**                         | **≤ 1 arcsec AND ≥ 3 deg/s**                                                                                                                                                | EAR 9A515.x                                                     | **USML XV(e)(16)**             | MT-controlled                                                                   |
| **AOCS geolocation (no GCPs)**                           | LEO 5 m / MEO 30 m / GEO 150 m / HEO 225 m CE90                                                                                                                             | EAR                                                             | **USML XV(e)(10)**             |                                                                                 |
| **Rad-hard IC (all five criteria)**                      | TID 5×10⁵ Rad(Si); dose-rate upset 5×10⁸ Rad(Si)/s; neutron 1×10¹⁴ N/cm²; SEU ≤ 1×10⁻¹⁰ err/bit-day; SEL-free at LET ≥ 80 MeV·cm²/mg + dose-rate latch-up ≥ 5×10⁸ Rad(Si)/s | ECCN 3A001 / 9A515.e                                            | **ECCN 9A515.d (NS1/RS1/AT1)** | All five must hold; failing one → 9A515.e if TID criterion met, otherwise 3A001 |
| **Rocket motor total impulse**                           | **1.1 × 10⁶ N·s**                                                                                                                                                           | EAR 9A004/9A005/9A007/9A009                                     | **USML IV(d)(2) (MT Cat I)**   | Above = MTCR Cat I                                                              |
| **Rocket motor total impulse, secondary**                | **8.41 × 10⁵ N·s**                                                                                                                                                          | EAR                                                             | **USML IV(d)(3) (MT Cat II)**  | The 9A105/9A107 threshold                                                       |
| **Range × payload**                                      | **300 km / 500 kg**                                                                                                                                                         | MTCR Cat II if 300 km regardless of payload; otherwise unlisted | **MTCR Cat I / USML IV(a)(1)** | The hinge for SLV jurisdiction                                                  |
| **GNSS receiver max velocity**                           | **600 m/s** (airborne)                                                                                                                                                      | ECCN 7A005 (NS/AT)                                              | **ECCN 7A105 (MT)**            | COCOM "altitude/velocity" historic, now in 7A105.b.1                            |
| **GNSS adaptive antenna / mil. decryption**              | features present?                                                                                                                                                           | ECCN 7A005                                                      | **USML XII(d)**                | Current ITAR / EAR boundary for military GNSS                                   |

### 8. The "see-through" rule

ITAR §123.1(b) implements the **see-through rule** for USML XV: a foreign-made satellite incorporating a US-origin XV defense article is itself ITAR-controlled, with **no de minimis**. The 2014 ECR moved most commercial items to 9x515, where they enjoy the EAR's **25 % de minimis** rule (Country Group D:5 destinations: 10 %), inverting the historic position. The 23 Oct 2024 IFR clarifies that a 9A515.a spacecraft hosting an ITAR-controlled (e)(17) hosted payload remains EAR for the spacecraft but ITAR for the payload — removal of the payload is a "retransfer" requiring ITAR authorisation.

## Details

### 9. Cross-walk by product class

| Güterklasse                                                   | USML                                                                   | ECCN (CCL)                                                     | EU Annex I                                                | DE AL Teil I A/B                  | MTCR-Item                  | WA RfC                  | Trigger parameter                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- | -------------------------- | ----------------------- | ----------------------------------- |
| **1a. Civil commsat, no anti-jam**                            | n/a                                                                    | **9A515.a.5** (NS2/RS2/AT)                                     | **9A004.b**                                               | — / 9A901 if embargo              | —                          | WA Dual-Use 9A004 (0xx) | no ITAR triggers; freq/power only   |
| **1b. Mil commsat / anti-jam**                                | **XV(a)(3) (SIGINT) or (a)(1)**                                        | (USML)                                                         | EU CML ML 11 — DE AL **0011**                             | DE AL Teil I A 0011               | —                          | WA ML 11 (5xx)          | anti-jam / EW / encryption          |
| **2a. EO-EOS, 0.35 < aperture ≤ 0.50 m**                      | n/a                                                                    | **9A515.a.1 (RS1, except AU/CA/UK)**                           | **9A004.b–.f (mission equipment)**                        | 9A901 if embargo                  | —                          | WA 0xx                  | aperture range                      |
| **2b. EO-EOS, aperture > 0.50 m**                             | **XV(a)(7)(i)**                                                        | n/a                                                            | EU CML ML 11/15                                           | DE AL Teil I A                    | Cat II Item 11 if dual     | WA ML                   | aperture > 0.50 m                   |
| **2c. EO-EOS hyperspectral ≥ 40 bands, GSD < 30 m VNIR/SWIR** | **XV(a)(7)(ii)**                                                       | n/a                                                            | EU CML                                                    | DE AL Teil I A                    |                            |                         | bands + GSD                         |
| **3. SAR EOS**                                                | **XV(a)(8)** if BW ≥ 300 MHz                                           | **9A515.a.3** if BW 100–300 MHz; **9A515.a.5** if BW < 100 MHz | 9A004.b–.f                                                | —                                 | —                          | WA 0xx                  | BW                                  |
| **4a. Reaction/momentum wheels**                              | n/a (excluded from XV(e)(13))                                          | **9A515.x** (or .y if listed)                                  | 9A004.f                                                   | —                                 | —                          | WA 0xx                  | n/a                                 |
| **4b. CMG (Control Moment Gyros)**                            | **XV(e)(13)**                                                          | n/a                                                            | EU CML / 9A004                                            | DE AL                             | —                          | WA ML / WA              | "specially designed for spacecraft" |
| **4c. Star trackers ≤ 1 arcsec & ≥ 3 deg/s**                  | **XV(e)(16) (MT)**                                                     | n/a                                                            | 9A004 / 9A010                                             | DE AL                             | Item 9 (Cat II)            | WA / MTCR               | accuracy + rate                     |
| **4d. Sun sensors, magnetorquers, low-precision IMUs**        | n/a                                                                    | **9A515.x or .y**                                              | 9A004.d                                                   | —                                 | —                          | WA 0xx                  | none                                |
| **4e. Space-IMU / FOG, bias drift class**                     | XII(e)(12) if "military"                                               | **7A003 / 7A101**                                              | **7A003 / 7A103**                                         | DE AL                             | Item 9                     | WA / MTCR               | bias-drift stability                |
| **5a. Chemical bipropellant, vacuum thrust ≤ 150 lbf**        | n/a                                                                    | **9A515.x** or 9A006 analog                                    | 9A005/9A006/9A105                                         | DE AL                             | Item 3 if ≥ 0.841 MN·s     | WA + MTCR               | vacuum thrust + impulse             |
| **5b. Chemical bipropellant, > 150 lbf**                      | **XV(e)(12) (MT if ≥ 8.41×10⁵ N·s)**                                   | n/a                                                            | 9A105 if ≥ 0.841 MN·s                                     | DE AL                             | Item 3                     |                         |                                     |
| **5c. Apogee motor ≥ 1.1 × 10⁶ N·s**                          | **IV(d)(2) (MT Cat I)**                                                | n/a                                                            | **9A007**                                                 | DE AL Teil I A 0004               | **Item 2 (Cat I)**         | WA ML 4 + MTCR          | total impulse                       |
| **5d. Hall thruster > 300 mN, Isp > 1500 s, or > 15 kW**      | **XV(e)(11)(iv)**                                                      | n/a                                                            | 9A004.d / 9A010                                           | DE AL                             | —                          | WA                      | thrust + Isp + power                |
| **5e. Low-power Hall / FEEP / ion below**                     | n/a                                                                    | **9A515.x**                                                    | 9A004.d                                                   | —                                 | —                          | WA                      | n/a                                 |
| **5f. Green propellants (HAN, ADN, LMP-103S)**                | V(b) if energetic                                                      | 1C111 / 1C608                                                  | 1C111 etc.                                                | DE AL Teil I A 0005 (Treibstoffe) | Item 4                     | WA / MTCR               | chemistry                           |
| **6a. SLV, ≥ 300 km, ≥ 500 kg**                               | **IV(a)(1) (MT Cat I)**                                                | n/a                                                            | **9A004.a**                                               | DE AL Teil I A 0004               | **Item 1 (Cat I)**         | WA ML 4 + MTCR          | range × payload                     |
| **6b. SLV, ≥ 300 km, < 500 kg**                               | **IV(a)(2) (MT Cat I)**                                                | n/a                                                            | 9A004.a                                                   | DE AL                             | Item 1 (Cat I)             |                         |                                     |
| **6c. Solid motor 8.41×10⁵ ≤ I_t < 1.1×10⁶ N·s**              | **IV(d)(3) (MT)**                                                      | n/a                                                            | **9A007 / 9A107**                                         | DE AL                             | Item 2                     |                         |                                     |
| **6d. Liquid engine ≥ 0.841 MN·s, usable in missiles**        | IV(d)(2)/(3)                                                           | n/a                                                            | **9A105**                                                 | DE AL                             | Item 3                     |                         |                                     |
| **7a. Rad-hard IC meeting all five XV(d) criteria**           | (formerly XV(d))                                                       | **9A515.d (NS1/RS1/AT1)**                                      | **3A001.a.1.b** + national if needed                      | —                                 | —                          | WA 0xx                  | five criteria conjunctively         |
| **7b. Rad-hard IC, TID ≥ 5×10⁵ Rad(Si), not all five**        | n/a                                                                    | **9A515.e**                                                    | 3A001                                                     | —                                 | —                          | WA                      | TID only                            |
| **7c. Rad-hard FPGA, TID < 5×10⁵ Rad(Si)**                    | n/a                                                                    | **3A001.a.1.b / 3A001.a.7**                                    | **3A001**                                                 | —                                 | —                          | WA                      | general 3A001                       |
| **8. Bodenstation / TT&C**                                    | **XV(b)** if for XV(a)                                                 | **9A515.b** if for 9A515.a                                     | 9A004.e–.f                                                | DE AL                             | —                          | WA                      | which spacecraft type it serves     |
| **9a. GNSS jam-resistant adaptive antenna**                   | **XII(d)** for mil; **EAR 7A005.b** for civ adaptive                   | **7A005.b**                                                    | **7A005.b**                                               | DE AL                             | Item 11                    | WA / MTCR               | adaptive antenna feature            |
| **9b. Military / SAASM GNSS**                                 | **XII(d)**                                                             | (ITAR-controlled; 7A005.a refers)                              | 7A005.a refers                                            | DE AL                             | Item 11                    | WA / MTCR               | mil decryption                      |
| **9c. GNSS > 600 m/s airborne**                               | n/a                                                                    | **7A105 (MT)**                                                 | 7A105                                                     | DE AL                             | Item 11.A.3                | MTCR                    | velocity > 600 m/s                  |
| **10a. Spacecraft composite structures**                      | n/a (except (e)(19) re-entry)                                          | **9A515.x**                                                    | **9A010.c**                                               | DE AL                             | Item 6/18 if missile-grade | WA                      | "specially designed" for SC         |
| **10b. AM-manufactured space parts**                          | n/a unless XV part                                                     | **9A515.x / .y**                                               | **new 2025/2003 AM entries in Cat 1/2/9**                 | DE AL                             | —                          | WA                      | per the new 2025 AM controls        |
| **11. EO mission / SAR data**                                 | **XV(f)** if associated with XV(a) (housekeeping carve-out per Note 3) | **9E515.a/.b/.f**                                              | **9E001 / 9E002**                                         | DE AL national 9E                 | —                          | WA                      | data product type & purpose         |
| **12. Software for the above**                                | XV(f); XV(a)(13) if classified                                         | **9D515** (parallel structure)                                 | **9D001/9D002/9D003/9D004/9D005/9D101/9D103/9D104/9D105** | DE AL 9D                          | —                          | WA                      | corresponds to HW ECCN              |

### 10. ControlListEntry data model (JSON Schema)

```json
{
  "id": "us-eccn-9a515-a-1",
  "regime": "US_EAR_CCL",
  "category": "9",
  "product_group": "A",
  "entry_number": "9A515",
  "subpara": "a.1",
  "title": "Spacecraft with EO remote sensing, 0.35 m < clear aperture ≤ 0.50 m",
  "predicates": [
    {
      "attribute": "spacecraft_class",
      "op": "in",
      "value": ["satellite", "space_vehicle"]
    },
    {
      "attribute": "instrument_modality",
      "op": "==",
      "value": "electro_optical"
    },
    { "attribute": "aperture_m", "op": ">", "value": 0.35 },
    { "attribute": "aperture_m", "op": "<=", "value": 0.5 },
    { "attribute": "earth_pointing", "op": "==", "value": true }
  ],
  "reasons_for_control": ["NS1", "RS1", "AT1"],
  "license_exceptions": [
    "STA-with-740.20(g)-request",
    "GOV-limited",
    "CSA-if-finalized"
  ],
  "country_chart_logic": {
    "RS1": "worldwide_license_required",
    "RS1_carveouts": ["AU", "CA", "GB"]
  },
  "see_also": [
    {
      "regime": "US_ITAR_USML",
      "id": "us-usml-xv-a-7-i",
      "relationship": "superset_of_above_threshold"
    },
    {
      "regime": "EU_DUAL_USE",
      "id": "eu-9a004-b",
      "relationship": "analogous_to"
    },
    {
      "regime": "WA_DUAL_USE",
      "id": "wa-9a004",
      "relationship": "derived_from"
    },
    {
      "regime": "DE_AL",
      "id": "de-al-teil-i-b-9a901",
      "relationship": "analogous_to_for_embargo"
    }
  ],
  "valid_from": "2024-10-23",
  "valid_to": null,
  "source_url": "https://www.federalregister.gov/d/2024-23958",
  "amendments": [
    {
      "date": "2024-10-23",
      "fr_cite": "89 FR 84766",
      "summary": "IFR — split 9A515.a into a.1–a.5; AUKUS/Canada carve-out"
    },
    {
      "date": "2017-01-10",
      "fr_cite": "82 FR 2889",
      "summary": "Aperture raised from 0.35 m to 0.50 m via XV(a)(7)(i)"
    }
  ]
}
```

Predicate operators: `==, !=, >, >=, <, <=, in, not_in, between(low, high), all_of([…]), any_of([…])`. The `all_of` operator is essential for the conjunctive "all five" pattern of 9A515.d; `any_of` for the disjunctive (a)(7)(i)–(iv).

### 11. Correlation model (auto-linker design)

Three layers of correlation:

1. **Lexical correlation by Annex-I suffix-digit**: parse each EU entry "9A101" → split into `(category=9, group=A, suffix=101)` → `suffix in [101..199]` ⇒ `mtcr_derived=true` → look up MTCR Annex 1.A.1 / 2.A.1 / etc. by manually maintained mapping table; same for `[001..099] ⇒ WA dual-use`, `[201..299] ⇒ NSG`, `[301..399] ⇒ AG`, `[401..499] ⇒ CWC`, `[901..999] ⇒ national`. For the German AL, the same logic applies to Teil I Abschnitt B 900-positions; Teil I Abschnitt A 0001–0022 map directly to EU Common Military List ML1–ML22.

2. **Predicate-level analogy across regimes**: two entries from different regimes are flagged `analogous_to` if their predicate sets intersect with Jaccard ≥ 0.6 over a normalised attribute vocabulary. This is how `eu-9a004-b ↔ us-eccn-9a515-a-5` is auto-linked.

3. **Hand-curated edge-case relationships** for breaks:
   - `us-eccn-9a515.* ⊅ eu-9a004.*` for 9A515.a.1–.a.4: stricter US threshold than any EU 9A004 analog;
   - `us-usml-xv-c reserved → us-eccn-7a005.b + us-usml-xii-d`: hand-edge for the 2016 jurisdiction split;
   - `us-eccn-9a515.d (5 criteria) → us-eccn-9a515.e (TID only) → us-eccn-3A001 (general rad-hard)`: `subset_of` chain;
   - `us-usml-iv-d-2 (MTCR Cat I impulse) ↔ eu-9a007 ↔ mtcr-item-2 ↔ wa-ml-4`: hand-edge across four regimes.

### 12. Queryable attribute set (predicate vocabulary)

| Attribute                               | Unit           | Triggers (regime/entry)                                                                              | Direction       |
| --------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- | --------------- |
| `aperture_m`                            | m              | USML XV(a)(7)(i) > 0.50; 9A515.a.1 > 0.35 ∧ ≤ 0.50; XV(e)(2)(ii) > 0.50; XV(e)(2)(i) > 0.35 (active) | ↑ flips to ITAR |
| `gsd_m`                                 | m              | XV(a)(7)(ii) GSD < 30 m; < 200 m (MWIR); < 500 m (LWIR)                                              | ↓ flips         |
| `spectral_band_count`                   | dimensionless  | XV(a)(7)(i) < 40; XV(a)(7)(ii) ≥ 40                                                                  | bidirectional   |
| `peak_wavelength_nm`                    | nm             | XV(e)(3) > 900                                                                                       | ↑               |
| `radar_center_freq_GHz`                 | GHz            | 9A515.a.3 ∈ [1, 10); XV(a)(8) carve-out                                                              | bidirectional   |
| `radar_bandwidth_MHz`                   | MHz            | 9A515.a.3 ∈ [100, 300); XV(a)(8) ≥ 300                                                               | ↑ flips to ITAR |
| `seu_rate`                              | errors/bit/day | 9A515.d ≤ 1×10⁻¹⁰                                                                                    | ↓               |
| `tid_krad`                              | krad(Si)       | 9A515.d ≥ 500; 9A515.e ≥ 500 if not all five                                                         | ↑               |
| `dose_rate_latchup_rad_si_s`            | Rad(Si)/s      | 9A515.d ≥ 5×10⁸                                                                                      | ↑               |
| `dose_rate_upset_rad_si_s`              | Rad(Si)/s      | 9A515.d ≥ 5×10⁸                                                                                      | ↑               |
| `neutron_fluence_n_cm2`                 | N/cm²          | 9A515.d ≥ 1×10¹⁴                                                                                     | ↑               |
| `sel_let_threshold_MeV_cm2_mg`          | MeV·cm²/mg     | 9A515.d "SEL-free at LET ≥ 80"                                                                       | ↑               |
| `Isp_s`                                 | s              | XV(e)(11)(iv) > 1500 (combined with thrust)                                                          | ↑               |
| `thrust_N`                              | N              | XV(e)(12) > 667.23; XV(e)(11)(iv) > 0.300                                                            | ↑               |
| `input_power_W`                         | W              | XV(e)(11)(iv) > 15 000                                                                               | ↑               |
| `total_impulse_Ns`                      | N·s            | USML IV(d)(2) ≥ 1.1×10⁶ (MT Cat I); IV(d)(3) ≥ 8.41×10⁵ (Cat II); EU 9A007 mirrors                   | ↑               |
| `range_km`                              | km             | MTCR Cat I if ≥ 300 ∧ payload ≥ 500 kg; MTCR Cat II if ≥ 300 regardless of payload                   | ↑               |
| `payload_kg`                            | kg             | MTCR Cat I if ≥ 500 (with ≥ 300 km)                                                                  | ↑               |
| `antenna_dimension_m`                   | m              | XV(e)(1) > 25                                                                                        | ↑               |
| `antenna_active_electronic_scanning`    | bool           | XV(e)(1)                                                                                             | flips           |
| `antenna_adaptive_beamforming`          | bool           | XV(e)(1), 7A005.b for GNSS                                                                           | flips           |
| `gnss_max_velocity_m_s`                 | m/s            | 7A105.b.1 > 600                                                                                      | ↑               |
| `gnss_decryption_for_government_signal` | bool           | 7A005.a → ITAR XII(d); 7A105.b.2                                                                     | flips           |
| `star_tracker_accuracy_arcsec`          | arcsec         | XV(e)(16) ≤ 1                                                                                        | ↓               |
| `star_tracker_slew_rate_deg_s`          | deg/s          | XV(e)(16) ≥ 3                                                                                        | ↑               |
| `geolocation_accuracy_LEO_m_CE90`       | m              | XV(e)(10) ≤ 5 (LEO)                                                                                  | ↓               |
| `cryocooler_temp_K`                     | K              | EU 9A006 (2025) ≤ 100 K                                                                              | ↓               |
| `material_type`                         | enum           | EU 9A010.c / 9A110; 1C010 / 1C210 fibres                                                             | categorical     |
| `additive_process`                      | enum           | EU 2025/2003 AM entries                                                                              | categorical     |
| `anti_jam_features`                     | bool           | satellite → XV(a)(3); GNSS → 7A005.b/7A105                                                           | flips           |
| `classified`                            | bool           | XV(a)(13), XV(e)(21), and catch-all                                                                  | flips           |

### 13. Primary data feeds — ingestion stack

- **EU Annex I**: EUR-Lex CELEX 32025R2003 + 32021R0821; Commission "List of dual use items" Excel; update cadence is "typically amended at least once each year via a Delegated Act based on decisions and commitments taken within the framework of the international non-proliferation regimes and export control arrangements" (European Commission Trade Policy, 8 Sep 2025); format HTML/PDF/Excel — recommend XML scrape from EUR-Lex via `Cellar` API.
- **BAFA Güterlisten**: PDFs ("afk_gueterlisten_dual_use_anhang_1_kategorie_9.pdf", "afk_gueterlisten_ausfuhrliste_abschnitt_a.pdf", "afk_gueterlisten_ausfuhrliste_abschnitt_b.pdf"); **gemeinsames Stichwortverzeichnis** + **Umschlüsselungsverzeichnis** (HS-code → Güterlistennummer); update with each AWV change (last: 22. AWV-ÄndVO 29 Oct 2025); format PDF.
- **eCFR 15 CFR 774 / 22 CFR 121**: continuous updates; format HTML and **bulk JSON/XML via eCFR Developer Resources API** — the most direct machine-readable feed for US controls.
- **Federal Register**: rolling daily; JSON/XML via federalregister.gov API; track BIS-2024-0029/0030/0031, RIN 1400-AE73, RIN 1400-AE99 for the Oct 2024 space rules.
- **MTCR Annex**: PDF at mtcr.info — the current text was "most recently updated at the 36th Plenary Meeting, Rio de Janeiro, 30 October – 3 November 2023, with Annex text updated 25 April 2024 and uploaded 27 May 2024"; **MTCR Annex Handbook 2022** is the authoritative descriptive text; updates post-plenary, no fixed cadence.
- **Wassenaar ML + Dual-Use Lists**: PDFs at wassenaar.org; the controlling list is **WA-LIST (25) 1 Corr., agreed at the 29th WA Plenary chaired by Ambassador Kaifu Atsushi (Japan), Vienna, 3–4 December 2025** (Plenary Chair Statement, 4 Dec 2025); cadence is annual — "the next regular WA Plenary meeting is to take place in Vienna in December 2026, during which Participating States will mark the 30th Anniversary of the WA" (2025 Plenary Chair Statement).
- **DDTC Commodity Jurisdiction (CJ)** determinations: searchable database; **CJ index** is the empirical truth-source for USML/CCL boundary in space items.
- **BIS CCATS**: not publicly downloadable, but BIS's published CCATS-derived ECCN tables (the IFR's 9A515.y.7–y.74 list is one) are the most precise reference.

### 14. AI-assisted classification — pipeline

1. **Structured attribute extraction** — a fine-tuned LLM (or a strict JSON-schema-constrained prompt) reads the datasheet and emits a JSON object populated with predicate-attribute values, confidence per attribute, and a verbatim "evidence span" quote.
2. **Predicate matching** — evaluate the AST for each ControlListEntry against the extracted attribute object. **Three-valued logic** (true/false/unknown) is essential: an unknown SEU rate must NOT silently classify a rad-hard FPGA as below-threshold.
3. **Candidate ranking** — fully-matching entries returned with full confidence; partial matches returned as "possible" with the missing attribute listed; non-matches excluded.
4. **Citation-grade output** — for each candidate return: (a) regime + entry number; (b) the predicate(s) that matched; (c) verbatim regulation text; (d) verbatim datasheet evidence quote; (e) FR/OJ/BGBl source URL and version; (f) confidence; (g) a "next-question" when a critical predicate is unknown.
5. **Reference / training corpus**:
   - **BAFA Auskünfte zur Güterliste (AzG)** — public redacted classification opinions; usable as gold-labelled (Güter, Güterlistennummer) pairs.
   - **DDTC Commodity Jurisdiction (CJ) determinations** — gold-labelled (article, jurisdictional outcome) pairs.
   - **BIS CCATS** — limited, but the 9A515.y enumeration is an empirical CCATS roll-up.
   - **Wassenaar Compendium of Best Practice**, MTCR Annex Handbook, EU Dual-Use Coordination Group notes.
   - **Customs case law** — DE Finanzgerichte (München/Düsseldorf) decisions on AWV § 8, BGH decisions on AWG.
6. **Operational safeguards**:
   - Reject classifications with confidence < 0.7 on any "hard edge" attribute (§ 7); escalate to human.
   - Always run the **CCL Order of Review** (Supplement No. 4 to 15 CFR 774): step 3 of OoR states "9x515 and 600-series trump other ECCNs"; the model must enforce this order so a rad-hard FPGA does not silently classify into 3A001 when 9A515.d/.e applies.
   - Compute **both** EU and US classifications independently; do not let one bias the other. Mismatch is itself a signal.

## Recommendations

**Stage 1 (week 1–4) — ingest and normalise**: build pipeline against EUR-Lex (CELEX 32025R2003), eCFR (22 CFR 121, 15 CFR 774), BAFA PDFs, MTCR Annex Handbook, WA ML / Dual-Use lists. Output: one `ControlListEntry` per leaf entry. **Done** = 100 % coverage of EU Cat 9 + US Cat 9/3/5/6/7, USML XV+IV, all of MTCR Cat I + relevant Cat II, all 900-positions in DE AL Teil I Abschnitt B relevant to space, and Teil I Abschnitt A 0004/0010/0011.

**Stage 2 (week 5–8) — predicate vocabulary and matcher**: encode § 12 vocabulary into a fixed JSON Schema. Implement predicate AST and three-valued evaluator. Acceptance: every entry in the § 7 "hard edge" table produces the correct flip on its threshold.

**Stage 3 (week 9–12) — extractor and AI classifier**: fine-tune (or structured-output prompt) an LLM to populate predicates from datasheets. Train on BAFA AzG + DDTC CJ; hold out 20 %. Acceptance: ≥ 95 % accuracy on the "hard edge" table for fully-specified datasheets; ≥ 90 % top-1 on the AzG/CJ test set.

**Stage 4 (week 13–16) — operational integration**: wire classifier into ATLAS-Ausfuhr coding (DE), US AES, and SAP GTS / AEB Compliance to push Güterlistennummer + ECCN + USML category. **Trigger**: any "hard edge" attribute within 5 % of a flip → mandatory human review.

**Benchmarks that change the plan**:

- If the comprehensive USML XV/IV NPRMs at 89 FR 84618 (DDTC) and 89 FR 84784 (BIS) **are finalised** (still pending as of May 2026 per Export Compliance Solutions), USML XV(a)(7)(i) is likely to be re-expressed as a "light-collecting area", XV(a)(12) will gain a 4 mrad angular-resolution threshold, and new ECCN 9C515 will go live — re-pull EUR-Lex + Federal Register and re-run Stage 1.
- If the 22. AWV-ÄndVO is superseded by a 23. (typically within 12 months given the Russian-sanctions tempo), re-pull BAFA Teil I A/B and re-validate the 900-position mappings.
- The 29th WA Plenary (Vienna, 3–4 Dec 2025) produced WA-LIST (25) 1 Corr.; the next regular WA Plenary is Vienna, December 2026, the 30th Anniversary meeting. Plan a Q1 2027 re-pull of the WA list and the consequent EU Delegated Act later in 2027.

## Caveats

1. **The 9A515.d SEU threshold** should be verified against the current eCFR 15 CFR 774 Suppl. 1. Historical text uses **1 × 10⁻¹⁰ errors/bit/day**, but the figure has been transcribed in legacy ITAR-XV(d) sources as "1 × 10⁻⁷ or less"; eCFR current text is the controlling source.
2. **The comprehensive USML XV/IV NPRMs** (DDTC 89 FR 84618 and BIS 89 FR 84784) were open through 22 Nov 2024 but **remain at proposed-rule stage as of May 2026** per Export Compliance Solutions reporting. The only space-related rule finalised in 2025 was DDTC's targeted USML revisions at 90 FR 41778 (effective 15 Sep 2025), which did **not** touch Category XV. License Exception CSA (§ 740.26), new ECCN 9C515, and the USML XV(a)(7) light-collecting-area threshold therefore remain proposed; the classifier should pre-build their entries with `valid_from: null` and `status: proposed`.
3. **The Annex-I suffix-digit logic** is reliable for WA/MTCR/NSG/AG/CWC but **does NOT extend to ITAR USML** — ITAR-only items (USML XV(a)(1)–(a)(13), most XV(e) subparas) have no EU pendant other than catch-all CML ML11/ML15 plus DE AL 0010/0011. Hand-curated edges are unavoidable.
4. **"Specially designed"** is not a numeric threshold — every regime relies on a "specially designed" qualifier (US 15 CFR § 772.1; EU "besonders konstruiert"; MTCR "specially designed"). For software, this is unevaluable from a datasheet alone and must be flagged for human review.
5. **The see-through rule (ITAR § 123.1(b))** means a foreign-built satellite incorporating any USML XV defense article (including an XV(e)(17) hosted payload) is ITAR-controlled throughout. The classifier must propagate ITAR jurisdiction across bill-of-materials boundaries.
6. **MTCR is political, not legal** — its Annex is implemented through each Partner's national law. The same item may be Cat I in country A and Cat II in country B if Partners read "inherent capability" differently.
7. **Reaction / momentum wheels are explicitly NOT controlled in USML XV(e)(13)** (per the 2014 IFR preamble, 79 FR 27184). They fall to ECCN 9A515.x. Frequent classification error.
8. The MTCR/USML range definitions are **based on the design trajectory**, not operational; the classifier must capture max design range / payload, not advertised range.
