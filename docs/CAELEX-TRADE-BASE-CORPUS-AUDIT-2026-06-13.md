# Caelex Trade — Base-Corpus Control-Code Correctness Audit (2026-06-13)

**Scope:** systematic re-verification of every space-relevant EU dual-use
(Reg (EU) 2021/821 Annex I) and Wassenaar control code in the base corpus,
against the **current** official text (EUR-Lex consolidated `02021R0821`,
Wassenaar WA-LIST, MTCR Annex), cross-checked via current national mirrors
(Hong Kong STC strategic-commodities list, Australia DSGL, legislation.gov.uk
retained dual-use list, the EU 2021/821 alphabetical index, BIS Federal
Register Wassenaar-implementation rules).

**Why:** the S5 mirror sprint surfaced FOUR pre-existing wrong-item mislabels
(6A107, WA 9.A.6, 9A011, 9.A.11.a-c). That pattern proved the base corpus
needed systematic re-verification, not one-off fixes. It does — see below.

**Guard:** every fix is checked against the golden-set matrix
(`src/lib/comply-v2/trade/classification/golden-set/`). The distribution must
stay **74 GO / 396 REVIEW / 274 BLOCKED** and no cell may loosen
(REVIEW→GO or BLOCKED→lower). Coverage-first: the correct code/content is
added before a wrong/phantom one is removed.

**Mislabel taxonomy (severity):**

- **wrong-item** — description names a _different physical item_ than the
  code officially controls (e.g. gravimeter labelled "detectors"). Highest
  priority; this is the S5 bug class.
- **wrong-sub-letter** — right item-family + right control status, wrong
  sub-paragraph letter (e.g. the pre-2014 6A005 medium scheme). Lower
  severity; still corrected.
- **phantom** — a code that does not exist in EU Annex I (US-only `xA611`
  600-series codes; invented `.f/.g` slots; a decontrol Note modelled as a
  control entry). Handled relocate-then-remove.

---

## Status summary

| file                          | findings                                            | status                                                                  |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| `wassenaar-cat6-9.ts` (Cat 9) | 4 wrong-item                                        | ✅ DONE — commit `a833a0e4`                                             |
| `eu-annex-i-cat6.ts` (Cat 6)  | 6 wrong-item + 6A005 scheme                         | ✅ DONE — commit `5352c0ea` (6A005 regime migration handled separately) |
| `eu-annex-i.ts` (Cat 9 main)  | Cat-9 clean (S5); 2 cross-cutting Cat-5             | ⏳ pending (with Cat-5 batch)                                           |
| `eu-annex-i-cat4-7.ts`        | ~14 wrong-item + 2 phantom                          | ⏳ pending                                                              |
| `eu-annex-i-cat1-2.ts`        | 3 wrong-item                                        | ⏳ pending                                                              |
| `eu-annex-i-cat3.ts`          | ~35 (systematic 3A001/3A002/3B001 shift) + phantoms | ⏳ pending                                                              |
| `eu-annex-i-cat5.ts`          | ~16 (systematic 5A001/5A002 rotation) + phantoms    | ⏳ pending                                                              |

**Root-cause pattern:** the Cat-3/4/5/7 enumeration files were authored from a
_misaligned reference_ — sub-paragraph descriptions are real control items but
assigned to the wrong letter (a consistent positional shift), and the
co-located unit tests were written to match the wrong data. Each is therefore
a coordinated **data + test (+ sometimes cross-walk)** refactor, not a simple
relabel.

---

## ✅ DONE — Cat 9 (`wassenaar-cat6-9.ts`, commit `a833a0e4`)

| code    | was                               | official (now)                                                   |
| ------- | --------------------------------- | ---------------------------------------------------------------- |
| 9.A.4.b | "Stages of SLVs"                  | **Spacecraft** (9A004.b). Stages = 9A004.a / 9A010               |
| 9.A.7.a | LV ground support equipment       | **Solid rocket propulsion, total impulse > 1.1 MNs**             |
| 9.A.7.b | spacecraft AIT equipment          | **Solid rocket propulsion, specific impulse ≥ 2.4 kNs/kg**       |
| 9.A.7.c | satellite-control ground stations | **Solid rocket propulsion, mass fraction > 88% & loading > 86%** |

Same error class as the S5 9A006 fix (ground content grafted onto a propulsion
code). Terrestrial spacecraft equipment is 9A004.f (already present).

## ✅ DONE — Cat 6 (`eu-annex-i-cat6.ts`, commit `5352c0ea`)

| code         | was                                             | official (now)                                                                                                |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 6A002.d      | reticles / masks / gratings                     | **cryocoolers + optical sensing fibres**                                                                      |
| 6A002.e → .f | ROIC at wrong letter                            | **ROIC = 6A002.f** (official .e repealed)                                                                     |
| 6A004.b      | Ge / ZnSe / sapphire                            | **ZnSe / ZnS** (3–25 µm); Ge/sapphire are 6C004                                                               |
| 6A004.c      | optical control equipment                       | **space-qualified optical components**                                                                        |
| 6A004.d      | spaceborne telescope assemblies                 | **optical control equipment** (gimbals/steering)                                                              |
| 6A004.e      | asphericity-test interferometers                | **aspheric optical elements** (the element, not its test gear)                                                |
| 6A004.f      | beam-steering optical equipment                 | **dynamic wavefront measuring equipment**                                                                     |
| 6A005.a–.g   | medium scheme (gas/semiconductor/solid-state/…) | **regime scheme** (CW/pulsed/tunable/other/components/optical-equip/acoustic-detection) — migrated separately |

---

## ⏳ Cat 4/7 (`eu-annex-i-cat4-7.ts`) — verified vs HK STC cat_4/cat_7 + EUR-Lex

| code      | current label                         | official scope                                                                                | verdict                  |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------ |
| 4A001.a.1 | rad-hard TID ≥ 5×10⁵                  | **temperature** (below −45 °C / above +85 °C); rad = **4A001.a.2**                            | wrong-letter             |
| 4A001.b   | mil-spec ruggedized                   | **DELETED** (L.N. 45/2010)                                                                    | phantom → remove         |
| 4A003.a   | digital computers APP > 29 WT         | **repealed**; APP threshold lives at 4A003.b (> 70 WT)                                        | phantom → relocate to .b |
| 4A003.b   | assemblies for aggregation            | **digital computers APP > 70 WT**                                                             | wrong-item (swap)        |
| 4A003.c   | SPTR/TMR architectures                | **electronic assemblies for aggregating processors**                                          | wrong-item (swap)        |
| 4A004     | cooling-threshold computers           | **systolic array / neural / optical computers**                                               | wrong-item               |
| 7A002.b   | spinning-mass mechanical gyros        | **"function at linear acceleration > 100 g"**                                                 | wrong-item               |
| 7A006     | …OR accuracy better than ±3%          | triggers = **power management OR phase-shift-key modulation**                                 | wrong-threshold          |
| 7A106     | radar altimeters for missiles/reentry | **radar/laser-radar altimeters for 9A004 SLVs / 9A104 sounding rockets**                      | wrong-item               |
| 7B002     | RLG mirrors **AND** INS alignment     | **RLG mirror characterisation only** (scatterometers/profilometers)                           | over-scope               |
| 7B003     | production for 7A101–7A106 (MTCR)     | **production for ALL of 7A**                                                                  | wrong-scope              |
| 7D003     | other sw for 7A use                   | (a) improve 7A003/4/8 perf; (b) hybrid INS/Doppler/satellite/DBRN src; (e) helicopter FCS CAD | wrong-item               |
| 7D004     | INS/Kalman/FDIR source code           | **source code (incl. 7E004 tech) for flight-management / active-flight-control**              | wrong-item               |
| 7E004     | GNSS anti-jam dev tech                | **active-flight-control technology** (air data, 3D displays, fly-by-wire, DBRN)               | wrong-item               |
| 7E101     | dev/prod/use of 7A1xx (MTCR)          | **USE technology** for 7A001–7A006, 7A101–7A106, 7A115–7A117, 7B001–7B003                     | wrong-scope              |

Note (UNCERTAIN, left): 7B001.a, 7D002 — granular/borderline, not clear
wrong-item; left pending closer reading.

## ⏳ Cat 1/2 (`eu-annex-i-cat1-2.ts`) — verified vs EUR-Lex / Wassenaar 2025

| code  | current label                                                                               | official scope                                                                                                       | verdict            |
| ----- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1B115 | propellant production equipment ("other than 1B116"; lists batch mixers/fluid-energy mills) | "other than **1B002 or 1B102**"; the Note **excludes** batch mixers / fluid-energy mills (those = 1B117/1B118/1B119) | wrong-xref + scope |
| 1C011 | …incl. metal-oxidant mixtures                                                               | Zr/Mg powders, boron ≥85%, guanidine nitrate, nitroguanidine — **no metal-oxidant mixtures** (those → Military List) | over-scope         |
| 1D002 | organic/metal-matrix composite dev software                                                 | organic, metal **or carbon-matrix** laminates/composites (title drops carbon-matrix)                                 | omission           |

## ⏳ Cat 3 (`eu-annex-i-cat3.ts`) — ~35 mislabels (systematic shift)

Headline: the **3A001.a sub-paragraph grid is positionally misassigned**, and
3A002 (a/c/d/g), 3B001 (a/c/d/e/h), 3D003/3D004, 3E002/3E003/3E201 carry
wrong-item descriptions. Verified against HK STC cat_3 + Trade Hub + EUR-Lex.

| code           | current label                        | official scope                                                                                |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| 3A001.a.3      | memory ICs                           | compound-semiconductor µP/MCU > 40 MHz                                                        |
| 3A001.a.4      | ADC/DAC                              | **not used** (repealed); ADC/DAC = 3A001.a.5                                                  |
| 3A001.a.5      | rad-hard ICs                         | ADC/DAC ICs (resolution × sample-rate)                                                        |
| 3A001.a.7      | microcontrollers                     | FPGAs/CPLDs (> 700 I/O or ≥ 500 Gb/s)                                                         |
| 3A001.a.10     | spacecraft ASICs                     | custom ICs of _unknown function_ (>1500 terminals / <0.02 ns / >3 GHz)                        |
| 3A001.a.12     | FPGAs/CPLDs                          | FFT processors                                                                                |
| 3A001.b.1      | GaN/GaAs HEMTs                       | vacuum electronic devices (TWTs) > 31.8 GHz                                                   |
| 3A001.b.5      | discrete microwave transistors       | electronically/magnetically tunable filters                                                   |
| 3A001.d.1/.d.3 | optoelectronic arrays / laser diodes | 3A001.d = superconductive digital circuits (no .d.1/.d.3)                                     |
| 3A001.e.1      | space solar cells                    | electrochemical cells (batteries); solar = 3A001.e.4                                          |
| 3A001.h.1/.h.2 | atomic clocks / OCXO                 | 3A001.h = power semiconductor switches (no .h.1/.h.2)                                         |
| 3A002.a        | RF test (spectrum analysers/VNAs)    | digital data recorders / real-time scopes ≥ 60 GHz                                            |
| 3A002.c        | atomic-clock test equipment          | signal analysers > 31.8 GHz                                                                   |
| 3A002.d        | radiation test equipment             | signal generators (pulse/freq/phase-noise)                                                    |
| 3A002.g        | digital oscilloscopes / AWG          | **atomic frequency standards**                                                                |
| 3A201.a        | DC caps (≥6.4 J × ≥5 kV)             | wrong threshold formula — official is (i) >1.4 kV/>10 J/<50 nH OR (ii) >750 V/>0.25 µF/<10 nH |
| 3A501          | cyber-surveillance ICs               | cryogenic CMOS / quantum-limited amplifiers (2025 update)                                     |
| 3A611          | military electronics                 | **US ECCN only — not in EU Annex I** (phantom)                                                |
| 3B001.a        | CVD/PVD/ALD deposition               | epitaxial growth (MOCVD/MBE)                                                                  |
| 3B001.c/.d     | DUV/EUV litho / etch                 | **not used**                                                                                  |
| 3B001.e        | ion implantation                     | automatic multi-chamber wafer handling                                                        |
| 3B001.h        | wafer bonding / 3D stacking          | multi-layer phase-shift masks (<245 nm)                                                       |
| 3D003          | TCAD device modelling                | computational lithography (OPC/RET)                                                           |
| 3D004          | ATE test software                    | spray-cooling thermal-management software                                                     |
| 3D101          | sw for 3A001 missile use             | sw for 3A101(b) bremsstrahlung accelerators                                                   |
| 3E002          | multi-chip/chiplet dev tech          | ≥32-bit processor core dev tech                                                               |
| 3E003          | rad-hardening/SEU tech               | superconductive / vacuum-microelectronics / hetero-structure tech                             |
| 3E201          | tech for 3A201 only                  | tech for 3A001.e.2/.e.3/.g + 3A201 + 3A225–3A234                                              |

Phantom / unconfirmed-in-EU: `3A611`, `3A091`, `3A092`, `3B991`, `3D991`,
`3E991`, `AM-3A-001/002/003` (EU uses numeric codes, not `AM-` prefixes).

## ⏳ Cat 5 (`eu-annex-i-cat5.ts`) — ~16 mislabels (systematic rotation)

Headline: **5A001 sub-entries are positionally rotated**, **5A002.b–.e are
shifted +1** with two invented slots, plus a phantom `5D003`. Verified vs
legislation.gov.uk 2019/2199 + 2018/1922 + SIPRI Wassenaar.

| code                  | current label                           | official scope                                                               |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| 5A001.a               | high-throughput digital telecom         | nuclear/EMP-hardened telecom                                                 |
| 5A001.b.1             | inter-satellite-link TX/RX              | underwater untethered comms                                                  |
| 5A001.b.5             | mobile-telecom interception             | digitally controlled radio receivers (>1000 ch)                              |
| 5A001.c               | WDM / optical amplifiers                | optical fibres > 500 m, 2×10⁹ N/m² tensile                                   |
| 5A001.d               | underwater comms                        | electronically steerable phased arrays > 31.8 GHz                            |
| 5A001.e               | high-mobility anti-jam radio            | radio direction-finding > 30 MHz                                             |
| 5A001.f / .f.1 / .f.2 | spread-spectrum / null-steering         | mobile-telecom jamming + interception (RAN/IMSI)                             |
| 5A001.g               | mil/restricted mobile radio             | Passive Coherent Location (PCL)                                              |
| 5A001.h               | free-space optical comm                 | counter-IED RF transmitting equipment                                        |
| 5A002.b               | cryptanalytic items                     | cryptographic **activation tokens**                                          |
| 5A002.c               | non-crypto security functions           | **quantum cryptography (QKD)**                                               |
| 5A002.d               | cable intrusion detection               | UWB channelising/scrambling-code crypto                                      |
| 5A002.e               | TEMPEST                                 | spread-spectrum/hopping-code crypto                                          |
| 5A002.f / .g          | QKD / crypto activation                 | **phantom** — 5A002 ends at .e                                               |
| 5A003                 | "data theft prevention / cryptanalytic" | .a cable intrusion detection + .b TEMPEST                                    |
| 5D003                 | open-source crypto exemption "frame"    | **phantom** — the Cryptography Note is a decontrol note, not a control entry |

Cross-cutting in `eu-annex-i.ts`: `5A001.b` ("phased-array >31.8 GHz" → likely
5A001.d) and `5A001.f` ("free-space optical" → likely jamming) need the same
5A001 structure resolved; fixed with this batch.

---

_Sources: EUR-Lex `02021R0821`; Wassenaar WA-LIST 2025; HK STC strategic-
commodities Cat 3/4/5/6/7/9; Australia DSGL; legislation.gov.uk EUR
2019/2199 + 2018/1922; EU 2021/821 EIFEC alphabetical index; BIS Federal
Register Wassenaar-implementation rules. Verification: 9 parallel agents +
orchestrator independent re-confirmation against primary/current text._
