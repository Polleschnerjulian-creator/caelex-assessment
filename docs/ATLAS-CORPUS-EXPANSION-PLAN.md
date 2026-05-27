# Atlas Corpus Expansion — Living Master-Document

> **Version 1.0 — 2026-05-26**
> **Owner:** Julian Polleschner / Caelex
> **Scope:** Maximalistic content expansion of the Atlas legal corpus, cases catalogue, and supporting metadata. Everything that even tangentially touches the space sector MUST be covered.
>
> **STATUS:** ⛔ Not started — this document is the kickoff. Future-Claude reads § 1 first.

---

## § 1 Compaction-Recovery (READ THIS FIRST)

When the Claude conversation context gets compacted, the next Claude session loads this file and resumes work. Procedure:

1. **Read § 2 — Status Snapshot** to find the last completed item + next pending item.
2. **Read § 3 — Hard Constraints** to know what's NOT allowed (zero new external costs, etc.).
3. **Read the relevant § for the next pending item.**
4. **Execute the item**, then update § 2 in the SAME commit.
5. **Commit + push** per the batched-deploy policy in `CLAUDE.md` (6-8 commits per push).

Every legend symbol meaning:

- 🔴 = Not started
- 🟡 = In progress (include commit hash in description)
- 🟢 = Complete
- ⛔ = Blocked (include blocker in description)
- ⏸️ = Deferred (won't be done in current cycle, with reason)

Drift-safety invariants:

- `assertAllToolsHaveMetadata(ATLAS_TOOLS)` test catches tool/metadata drift.
- The `LegalSource[]` schema validates every new source at import-time via the existing zod / TS-type system.
- The `atlas-source-check` cron auto-detects content changes on registered URLs (T1.B.12).

---

## § 2 Status Snapshot

> **Future-Claude updates this section IMMEDIATELY after each completed item.**

### Last action

**2026-05-26 (P0 + P1 partial — first session)**:

P0 schema landed: ComplianceArea union 13 → 29 (+16), LegalSourceType union 8 → 20 (+12), schema-drift test wired (18 tests).

**P1 FULLY COMPLETE — all 9 P1 jurisdictions done in one session.**

- **CN** 7 → 38 (+5 authorities, +25 sources)
- **RU** 5 → 28 (+5 authorities, +18 sources)
- **SG** 0 → 22 (+6 authorities, +16 sources, NEW jurisdiction)
- **ID** 0 → 18 (+4 authorities, +14 sources, NEW jurisdiction)
- **PH** 0 → 15 (+3 authorities, +12 sources, NEW jurisdiction)
- **SA** 0 → 16 (+4 authorities, +12 sources, NEW jurisdiction)
- **EG** 0 → 14 (+3 authorities, +11 sources, NEW jurisdiction)
- **AR** 0 → 13 (+3 authorities, +10 sources, NEW jurisdiction)
- **MX** 0 → 13 (+3 authorities, +10 sources, NEW jurisdiction)

P2 substantially complete (40 P2 sources across 4 layers):

- **INT layer (17)**: ADR/IOS · Dark Skies + RAS · Planetary Protection · Cybersecurity · Suborbital · Climate · AML/NATO · ISS IGA
- **US layer (8)**: SPD-5 · FCC NPRMs (Pc + NGSO milestones + luminosity) · DOT-FCC MOU · NRQZ Green Bank · CSLA Extension · NASA Lunar Regolith Contracts
- **EU layer (12)**: ClearSpace-1 · Zero Debris Charter · Clean Space Initiative · AI Act + Data Act + DGA · CSRD + SFDR + Taxonomy · Strategic Compass + EDIP
- **JP/AU/ZA (3)**: JP CRD2 · AU Murchison Radio-Quiet · ZA SKA Protection Act

Total session output: **+185 sources, +36 authorities** + 16 ComplianceAreas + 12 SourceTypes + drift validator.

Corpus growth: **950 → 1,135 sources** (+19.5% in one session). All 18 drift tests pass continuously.

Total Atlas test count: 1589 passing / 1590 total (1 pre-existing env-failure unchanged).

### Current focus

→ **§ 7 P3 (EU-modern partially done via § 6 EU layer) + Bilateral expansion** + **§ 8 P4 sub-tier deepening (AU/NZ/IN/JP/KR vertically)** + **§ 9 P5 cases (+35)** + **§ 10 P6 cross-ref + embeddings rebuild**.

Optional P2 polish: UK-CAA-ADR-LICENCE-FRAMEWORK + DE-DLR-DEBRIS-MISSION + CA-CSA-ASTRO entries (deferred — substantially covered by EU ClearSpace + Clean Space Initiative).

### Tier roll-up (one-line per tier; updated as items flip)

- **P0 Schema:** 🟢 Complete (2026-05-26) — 16 ComplianceAreas + 12 SourceTypes added, 18-test drift validator wired
- **P1 Critical Jurisdictions:** 🟢 Complete (2026-05-26) — 9 of 9 done (CN ✓ RU ✓ SG ✓ ID ✓ PH ✓ SA ✓ EG ✓ AR ✓ MX ✓)
- **P2 Sub-Domain Clusters:** 🟢 Substantially Complete (2026-05-26) — 40 sources across INT (17) + US (8) + EU (12) + JP/AU/ZA (3). UK/DE/CA optional polish deferred.
- **P5 Cases Expansion:** 🟢 Complete (2026-05-26) — +27 cases across 2 bundles (P5: lunar incidents, EU competition, bankruptcy, cybersec, FCC, SEC SPAC, Artemis signings, insurance; P5b: Starship FAA, IM-1 lunar, Polaris Dawn EVA, AX-3, Galaxy 15, Kuiper milestone, SCS framework, ITU Res. 35, Starlink V2, Falcon 9 RUD, IRIS² award, EU AI Act anchoring, UK SaxaVord). Cases corpus 55 → 82 entries (+49%).
- **P3 Bilateral expansion:** 🟢 Done (2026-05-26) — +11 instruments. US TIAs (6: Norway/UK/AU/NZ/BR + proposed KZ), Lunar bilateral MoUs (2: India-Japan LUPEX, Korea-NASA Artemis), GNSS coordination (2: GPS-Galileo, GPS-QZSS), ISS IGA implementing MoUs (1). The TIA layer explains WHY certain ranges can host US-payload launches despite ITAR.
- **P4 Sub-tier deepening:** 🟢 Complete (2026-05-26) — 5/5 jurisdictions done: IN (12 → 31), KR (11 → 26), AU (13 → 28), JP (16 → 29), NZ (13 → 25). Total +74 sources. Distinctive Asia-Pacific themes captured: Indian commercial-space IPO + FDI 2024 + Devas-Antrix dispute; Korean KASA institutional reform + KSLV-III; Australian Defence Space Command + AUKUS DTC carve-outs + Indigenous Land Use Agreements; Japanese Economic Security Act 2022 + sample-return Cat-V Planetary Protection; NZ Māori Treaty consultation + Rocket Lab IPO + Tāwhaki JV.
- **P4+ LatAm + Africa rounding:** 🟢 Done (2026-05-26) — BR (6 → 24) + ZA (6 → 18). +30 sources. Distinctive themes: BR Alcântara equatorial + Quilombola/Indigenous FPIC + CBERS Sino-Brazilian + Starlink ANATEL precedent; ZA Hartebeesthoek deep-space station + AfSA implementation + BRICS Space Cooperation + China-SA Lunar MOU (non-Artemis signal).
- **Defence Doctrine Layer:** 🟢 Done (2026-05-26) — closes the last military/dual-use gap. +15 NSD entries across US (6: NSP 2020, NSPM-30, DODD 3100.10, NDAA Title XVI, USSPACECOM, CSO), FR/DE/UK (1 each: CdE Toulouse, Bundeswehr WRGS Uedem, UK Space Command High Wycombe), INT (2: CSpO + NATO SCoE Toulouse), IL (3: Ofek + IDF Space Wing + Amos Spacecom). NSD entries now 17 → 27 (+59%); military_dual_use sources 162 → 175. Every major space-faring jurisdiction has top-level defence doctrine documented.
- **IP/Patents + Tax/Customs Double-Strike:** 🟢 Done (2026-05-27) — closes the two smallest ComplianceArea buckets in the corpus. **IP/Patents (+8)**: 5 INT (OST Art. VIII jurisdictional anchor, Paris Convention 1883, PCT 1970, EPC 1973, AIPPI Resolutions Q244/Q269) + 3 US (35 USC §105 Patents-in-Space Act, USPTO Class 244 Aeronautics/Astronautics, Hughes Aircraft v US 1998 doctrine-of-equivalents). **Tax/Customs (+8)**: 3 INT (WCO HS Codes 2022 for spacecraft, WTO Customs Valuation Agreement, WTO ITA-2 IT-goods duty elimination) + 3 EU (VAT Directive 2006/112/EC + ViDA, CBAM Reg 2023/956, Union Customs Code 952/2013) + 2 US (19 USC §1313 Drawback post-TFTEA, 19 CFR Part 141 country-of-origin marking). Both clusters now practitioner-actionable for IP counsel + trade-compliance counsel advising space-tech clients.
- **AML/KYC + AI Compliance Double-Strike:** 🟢 Done (2026-05-27) — fills the next two smallest buckets. **AML/KYC (+6)**: 4 INT (FATF 40 Recommendations 2012/2023 update, Wolfsberg Group Principles incl. CBDDQ, EU 6AMLD 2018/1673, EU AML Package 2024 incl. AMLR + AMLA Frankfurt) + 2 US (BSA 31 USC §5311 + Corporate Transparency Act + AMLA 2020, OFAC Sanctions 31 CFR Chapter V incl. SDN 50% Rule). **AI Compliance (+6)**: 4 INT (OECD AI Principles 2019/2024 GenAI update, UNESCO AI Ethics Recommendation 2021, NIST AI RMF + GenAI Profile 2024, ISO/IEC 42001:2023 AIMS) + 2 US (Biden EO 14110 Oct 2023 dual-use foundation models, Trump EO 14179 Jan 2025 rescission + 180-day AI Action Plan). Bucket growth: aml_kyc 2 → 8 (+300%); ai_compliance 1 → 7 (+600%).
- **Product Liability + Employment/Labor Double-Strike:** 🟢 Done (2026-05-27) — completes the "tiny ComplianceArea buckets" sweep. **Product Liability (+3)**: EU PLD 2024/2853 (new directive Oct 2024, MS transposition deadline Dec 2026, covers software + AI + cybersecurity defects), US Restatement (Third) of Torts: Products Liability (1998 ALI, §2(a)/(b)/(c) tests applied in Hughes/Loral satellite-failure litigation), EU AILD Withdrawn Feb 2025 (proposed AI Liability Directive). **Employment/Labor (+3)**: EU Posted Workers Directive 2018/957 + Implementation Dir. 2014/67/EU (cross-border ESA staff posting), ESA Staff Regulations 2024 consolidated (~2,500 staff, ESA Appeals Board exclusive jurisdiction, ESA Pension Fund), ILO C156 Workers with Family Responsibilities (applied to long-duration ISS missions + commercial astronaut programmes). Bucket growth: product_liability 2 → 5 (+150%); employment_labor 4 → 7 (+75%).
- **Taiwan (TW) Jurisdiction Onboarding:** 🟢 Done (2026-05-27) — new jurisdiction added, +8 entries + 5 authorities. Material practitioner content: Space Development Act 2021 (22 articles incl. NT$3B liability cap), TASA Establishment Act 2022 (NSPO → ministerial-level TASA Jan 2023), FORMOSAT Programme Phase 3 (NT$25.1B 2019-2029), Telecommunications Management Act 2019 (49% foreign-ownership cap that forced SpaceX Taiwan + Chunghwa Telecom JV May 2024), Strategic High-Tech Commodities Regulations (de facto Wassenaar/MTCR + US BIS chip-export alignment), Semiconductor Supply-Chain Security Framework (TSMC/UMC/Vanguard space-grade IC exposure + BIS Oct 2022/Oct 2023/Dec 2024 controls), PDPA Taiwan (Compliance Commission 2025), INDEC-Raytheon US$2.2B DSCA satcom procurement (Aug 2024). Closes critical Asia-Pacific gap given Taiwan's outsized semiconductor supply-chain leverage on global space-tech industry. Total Atlas jurisdictions: 52 → 53.
- **Kenya (KE) Jurisdiction Onboarding:** 🟢 Done (2026-05-27) — new jurisdiction added, +8 entries + 4 authorities. Material East-African space-hub content: Executive Order No. 1 of 2017 (KSA establishment, MoD reporting), Kenya Space Activities Bill 2024 Draft (modelled on UK SIA 2018 + ZA SAAA, KES 5B insurance, AfSA coordination obligations), Kenya-Italy Malindi Agreement 1964 + amendments 1995/2020 (Luigi Broglio Space Centre, 2.9°S equatorial advantage, planned launch reactivation under ASI), Information and Communications Act (CAK satellite-services licensing, 20% local-ownership requirement KICA §5(2)), 1KUNS-PF (first Kenya satellite 2018, JAXA KiboCUBE deployment, registry-state transfer precedent), AfSA Founding Member (Cairo HQ, Decision Assembly/AU/Dec.589(XXVI) 2016), Data Protection Act 2019 (GDPR-inspired, ODPC, adequacy pursuit since 2022). Closes critical East-Africa gap with the only currently-operational sub-Saharan equatorial launch site. Total Atlas jurisdictions: 53 → 54.
- **Chile (CL) Jurisdiction Onboarding:** 🟢 Done (2026-05-27) — new jurisdiction added, +7 entries + 5 authorities. Critical optical-astronomy hub (Atacama Desert hosts ~70% of global optical-astronomy capacity: VLT Paranal, ALMA, La Silla, Gemini South, E-ELT under construction). Material content: Chile-ESO Convention 1963 + 1995 HQ Agreement + 2002 ALMA Trilateral (10% Chilean observing-time guarantee, ESO immunity, duty-free imports), DS 43/2012 + DS 1/2023 Dark Skies Regulation (CCT ≤2200K, world's strictest, drives Starlink V2 BRDF dark-coating development), SUBTEL Satellite Services Framework (Ley 18.168 + Decreto 127/2006 + Decreto 18/2014 GMPCS for Starlink April 2023), FASat Programme (FACH 1995-2026, FASat-Charlie operational + FASat-Delta planned 2025-2026), Política Nacional Espacial 2014 + Chile 2030 (proposed ACE legislation pending), Ley 19.628 + Ley 21.719 Data Protection 2024 reform (APDP operational June 2026), Vera Rubin Observatory (LSST first-light 2025, decade-long survey, satellite-trail compliance verification framework). Closes LatAm jurisdictional picture (now BR + MX + AR + CL covered). Total Atlas jurisdictions: 54 → 55.
- **Nigeria (NG) Jurisdiction Onboarding:** 🟢 Done (2026-05-27) — new jurisdiction added, +7 entries + 4 authorities. Africa's largest economy + Africa's first dedicated national space agency (NASRDA, 2001). Material West-African content: NASRDA Act 2010 (statutory anchor for 2001-operational agency, §3 mandates + §13 commercialisation authority), National Space Policy 2014 Vision 2030 (Phase 1-4 roadmap, Phase 4 planned launch capability at Epe Lagos State), NIGCOMSAT-1R China EXIM Bank financing 2011 (US$257M CGWIC-built DFH-4 platform, NIGCOMSAT-2 follow-on US$550M 2023 MoU — material Chinese-African space-tech partnership precedent), Nigerian Communications Act 2003 + NCC Class License (Starlink first African market Jan 2023, local-presence requirement + tech-transfer obligations §99), NigeriaSat Programme (NigeriaSat-1 2003 SSTL + NigeriaSat-2/X 2011 SSTL HiRes-22m EO + Edusat-1 2017 ZARM CubeSat + NigeriaSat-3 Airbus DS 2026 planned), Nigeria Data Protection Act 2023 (replaces NDPR 2019, NDPC operational Oct 2023, 2% turnover penalty caps), ARCSSTE-E UN Affiliation 1998 (UNOOSA-affiliated regional centre at Obafemi Awolowo University, Africa-wide talent pipeline). Closes the West-Africa + Africa-China-partnership gap. Total Atlas jurisdictions: 55 → 56.
- **Vietnam (VN) Jurisdiction Onboarding:** 🟢 Done (2026-05-27) — new jurisdiction added, +7 entries + 4 authorities. Material ASEAN content: National Space Strategy 2030/2045 (Decision 169/QD-TTg, sovereign EO via LOTUSat + 500-engineer workforce target + Hoa Lac Hi-Tech Park + ASEAN cooperation), Vietnam-France VNREDSat-1 €72M AFD ODA bilateral (€55M French ODA 30-year 0.5%, Airbus DS Astrium-built 2013 — first non-CN bilateral space-tech precedent), Vietnam-Japan LOTUSat JPY 18.8B JICA STEP ODA (40-year 0.1%, NEC prime, LOTUSat-1 X-band SAR launched Nov 2025, LOTUSat-2 Vietnamese-led 2027 + 2022 Bilateral Space Cooperation Framework), Law on Telecommunications 2023 (effective July 2024, Art. 18 NEW LEO-specific licensing for Starlink-class, Art. 16 49% FDI cap, Starlink application Sep 2024 under MIC review), Cybersecurity Law 2018 + Decree 53/2022 (Art. 26(3) data-localisation for 'large impact' services), US-Vietnam Comprehensive Strategic Partnership Sep 2023 (Space Cooperation Initiative + Semiconductor Workforce + Critical Minerals MoU — China-tension hedging signal), VINASAT-1/2 Lockheed Martin A2100AX (sovereign satcom 2008/2012, US$580M, ITAR Cat XV State Dept licensing precedent + VINASAT-3 RFP underway 2024). Closes critical ASEAN gap given Vietnam's emerging space-tech market + China-tension geopolitical positioning. Total Atlas jurisdictions: 56 → 57.
- **EU Digital Platforms + EU R&D Financing + US R&D Financing Triple-Strike:** 🟢 Done (2026-05-27) — fills the P3 EU-modern + Financial/Capital sub-tier. **EU Digital Platforms (+2)**: DSA Reg. 2022/2065 (VLOPs designation at 45M EU MAU threshold, Art. 34-35 systemic-risk for satellite-imagery platforms, Art. 74 penalties 6% global turnover), DMA Reg. 2022/1925 (gatekeeper designation thresholds, Art. 6 interoperability obligations for GNSS-aware nav apps, Art. 30 penalties 10% global turnover). **EU R&D Financing (+3)**: Horizon Europe Cluster 4 Space (€15.3B 2021-2027 incl. €1.6B space, RIA/IA/CSA funding rates, GBER Art. 25 compatibility), EIC Pathfinder + Transition + Accelerator (€10.1B 2021-2027, EIC Accelerator €2.5M grant + €15M Fund equity, ICEYE + Helsing + Astroscale alumni), ESA ARTES (Geographical Return Principle, ARTES 4.0 Strategic Programme Lines, IPR Catalogue rules). **US R&D Financing (+4)**: SBIR/STTR 15 USC §638 (NASA $210M + DoD $2B + USSF SBIR via AFWERX/SpaceWERX 8-week Open Topic, Bayh-Dole IP retention, 2022 reauthorization permanent), DARPA 10 USC §4001 + OTA §4022 (Blackjack pLEO mil + RSGS GEO servicing, Space Enterprise Consortium SpEC), DIU + CSO 10 USC §4023 (60-90 day contract awards, FY2024 $1B budget request 4x increase, 60+ space-tech firms contracted since 2017), In-Q-Tel (CIA 501(c)(3) non-profit since 1999, ~$120M annual from CIA+NRO+DIA+NGA+NSA, Planet Labs/BlackSky/HawkEye 360/Capella/Spire portfolio, automatic CFIUS pre-clearance). Material gap closure: any space-tech CFO seeking EU+US public financing now has complete grant landscape coverage from Horizon Europe + ESA ARTES + EIC (EU side) + SBIR/DARPA/DIU/In-Q-Tel (US side).
- **P3 EU-modern + Financial/Capital + Bilateral/Multilateral:** 🔴 Not started
- **P4 Sub-tier Jurisdiction Deepening (AU/NZ/IN/JP/KR):** 🔴 Not started
- **P5 Cases Expansion (+~30):** 🔴 Not started
- **P6 Cross-Reference Pass + Embeddings Rebuild:** 🔴 Not started

---

## § 3 Hard Constraints

These are non-negotiable. Future-Claude MUST respect them.

1. **Zero new external SaaS costs.** No paid APIs, no new third-party services. Source curation is manual research against public portals (EUR-Lex, gesetze-im-internet, FCC ECFS, ITU SRS, COPUOS, IAEA, ICAO, USPTO, etc.).
2. **No new npm dependencies** unless explicitly approved per-item. Each entry uses existing TS interfaces.
3. **Drift-safety**: every new ComplianceArea / LegalSourceType / Bundle MUST be added to its union and any guard / validator updated in the same commit.
4. **Cross-reference discipline**: when entry X amends entry Y, BOTH must be updated (`amends` on X + `amended_by` on Y). The atlas-source-check cron will surface mismatches but better to land clean.
5. **Embeddings**: after each batch (e.g. 20+ new sources), run `npm run atlas:embed` so semantic search picks them up. Not blocking per-commit.
6. **Master plan sync**: after each finished § here, update `docs/ATLAS-V3-MASTER-PLAN.md` § 3 Status Snapshot if the work crosses any T0-T2 item.

---

## § 4 P0 Schema Expansion — MUST be first

### 4.A `ComplianceArea` union — add 15 values

File: `src/data/legal-sources/types.ts`

Current union (13): `licensing · registration · liability · insurance · cybersecurity · export_control · data_security · frequency_spectrum · environmental · debris_mitigation · space_traffic_management · human_spaceflight · military_dual_use`

Add the following 15 values:

```ts
| "competition_antitrust"     // EU SES/Inmarsat, FRAND disputes, spectrum-auction antitrust
| "state_aid"                 // EU beihilfen-clearance, ESA Programme, Airbus DS, OneWeb-rescue
| "procurement"               // EU defence-procurement, ESA geographical return, EDIP, IRIS²-Concession
| "tax_customs"               // VAT on satcom services, TARIC on space-hardware, CBAM
| "sanctions_compliance"      // OFAC SDN / EU Consolidated / UK OFSI (separate from export_control)
| "ip_patents"                // Patents in Space Act (US), Art. 28 OST workaround, USPTO Class 244
| "product_liability"         // Defective satellite-component liability (separate from state liability)
| "fdi_screening"             // CFIUS, EU 2019/452, UK NSI Act 2021, DE AWG/AWV §§ 55-62
| "ai_compliance"             // EU AI Act 2024 on autonomous collision avoidance + remote sensing AI
| "aml_kyc"                   // Satcom services to sanctioned end-users, FATF guidance
| "consumer_protection"       // Space-tourism informed consent (FAA Part 460, UK SIA)
| "employment_labor"          // Astronaut contracts, crew safety, space-tourism worker classification
| "scientific_research"       // Bioethics in microgravity, COSPAR Planetary Protection
| "media_broadcasting"        // Direct-broadcasting content rules, IAU dark/quiet sky
| "critical_infrastructure"   // EU CER Directive 2022/2557 (separate from NIS2)
| "sustainability_reporting"  // EU CSRD + SFDR + Taxonomy for space-tech investments
```

→ **Total ComplianceArea union grows from 13 → 29.**

### 4.B `LegalSourceType` union — add 12 values

Current union (8): `international_treaty · federal_law · federal_regulation · technical_standard · eu_regulation · eu_directive · policy_document · draft_legislation`

Add the following 12 values:

```ts
| "case_law"                  // Cases get a source-type entry so they're searchable in the same corpus
| "bilateral_agreement"       // Artemis Accords, ISS IGA, US-RU Soyuz IGA, China lunar MOUs
| "multilateral_agreement"    // ESA-Convention, EUMETSAT-Convention, INTERSPUTNIK
| "industry_guideline"        // IATA / IAA Cosmic Studies, Marsh JL2020/008
| "insurance_clause"          // Lloyds LMA series clauses for space risks
| "procurement_framework"     // ESA Industrial Policy, EU IRIS² Concession
| "safety_regulation"         // Range safety (FAA Part 450 Subpart D), NOTAM, NOTMAR
| "certification_standard"    // EUCC, EUCS, NIST 800-53 controls applicable to ground-segment
| "scientific_protocol"       // IAU Resolutions, COSPAR Planetary Protection Policy
| "national_security_doctrine" // US NSP 2020, NATO Space Policy 2019, BMVg-Direktive
| "tax_treaty"                // DTA impacts on satellite-operator VPEs
| "soft_law_resolution"       // UNGA Resolutions, IAU Recommendations, IAEA Safety Standards
```

→ **Total LegalSourceType union grows from 8 → 20.**

### 4.C Validator + bundle updates

After 4.A + 4.B:

- Update `getLegalSourcesByComplianceArea()` to NOT throw on new areas.
- Add a test in `src/data/legal-sources/index.test.ts` that asserts every source's `compliance_areas[]` value is a valid enum member (prevents typos).
- Update `tool-metadata.ts` if any new tool descriptions reference these areas.

**Acceptance:** All existing tests stay green. New schema unions reachable from `import type { ComplianceArea, LegalSourceType } from "@/data/legal-sources/types"`.

---

## § 5 P1 Critical Jurisdictions

### 5.A China (CN) — expand from 7 → 30 sources

File: `src/data/legal-sources/sources/cn.ts`

Source IDs to add (with topic):

```
CN-SPACE-WHITE-PAPER-2021       National space policy whitepaper
CN-SPACE-WHITE-PAPER-2016       Predecessor whitepaper
CN-CIVIL-AVIATION-LAW-1996      Applied to suborbital + reentry vehicles
CN-RADIO-REG-2016               State Council Radio Regulations
CN-DSL-2021                     Data Security Law (applied to satcom data)
CN-PIPL-2021                    Personal Information Protection Law
CN-CSL-2017                     Cybersecurity Law (critical-info infrastructure)
CN-EXPORT-CONTROL-LAW-2020      Replaces 2002 reg, covers dual-use
CN-DUAL-USE-REG-2002            Implementing regulation for dual-use exports
CN-CRYPTO-LAW-2019              Cryptography Law (applicable to ground-segment encryption)
CN-CIVIL-CODE-2021              Tort + product liability provisions for space activities
CN-AVIATION-INDUSTRY-LAW        Aviation Industry Plan 2021 (space cross-references)
CN-MIL-CIV-FUSION-2020          Military-civil fusion strategy applicable to dual-use space
CN-CASC-CHARTER                 China Aerospace Science & Technology Corp charter
CN-CASIC-CHARTER                China Aerospace Science & Industry Corp charter
CN-CNSA-CHARTER                 China National Space Administration charter
CN-LUNAR-COOP-MOUS              Multilateral lunar research station MOUs (CN-RU, CN-ZA, CN-PK, CN-VE)
CN-BEIDOU-AGREEMENT             BeiDou international cooperation agreements
CN-SATELLITE-DATA-MGMT-REG-2015 Remote sensing data management regulation
CN-MAPPING-LAW-2017             Surveying and Mapping Law (applies to satellite imagery)
CN-LAUNCH-LICENSE-PROCEDURE     CNSA launch licensing procedure
CN-FREQUENCY-COORD-PROC         Frequency coordination procedure with MIIT
CN-SPACE-ACCIDENT-INVESTIGATION CNSA accident investigation framework
CN-COMMERCIAL-LAUNCH-2014       Encouragement for private launch entrants
CN-SAMR-CASES                   State Administration for Market Regulation — CASC/CASIC antitrust
CN-CYBER-ADMINISTRATION-RULES   CAC cybersecurity review measures
CN-NATIONAL-DEFENSE-WHITE-2019  Defense whitepaper (space chapter)
CN-LONG-MARCH-RANGE-SAFETY      Range safety procedures for Long-March family
CN-WENCHANG-COASTAL-RANGE       Wenchang launch site environmental + safety regs
CN-FOREIGN-INVESTMENT-LAW-2019  FDI screening law (separate from US CFIUS)
```

**Authority records to add (`AUTHORITIES_CN`):**

```
CN-CNSA       China National Space Administration
CN-MIIT       Ministry of Industry and Information Technology (frequency, dual-use)
CN-SAMR       State Administration for Market Regulation (antitrust)
CN-CAC        Cyberspace Administration of China
CN-MOFCOM     Ministry of Commerce (export control)
CN-CASC       China Aerospace Science & Technology Corp (de-facto regulator)
CN-CASIC      China Aerospace Science & Industry Corp
CN-PLASF      People's Liberation Army Strategic Support Force
```

**Status:** 🔴 Not started.

### 5.B Russia (RU) — expand from 5 → 25 sources

File: `src/data/legal-sources/sources/ru.ts`

```
RU-SPACE-ACT-1993               Federal Law on Space Activity No. 5663-1 (1993, amended 2024)
RU-LICENSING-REG                Decree on space licensing
RU-INSURANCE-REQ                Decree on insurance requirements (Roscosmos)
RU-DATA-LOCALIZATION-152-FZ     Personal data localization law (152-FZ)
RU-CRITICAL-INFO-INFRA          Federal Law on Security of Critical Information Infrastructure (187-FZ)
RU-EXPORT-CONTROL-183-FZ        Federal Law on Export Control (183-FZ)
RU-FOREIGN-INVESTMENT-57-FZ     FDI screening law (57-FZ)
RU-COSMOS-CHARTER               Roskosmos State Corp Charter (Federal Law 215-FZ)
RU-CIVIL-CODE-IV                Civil Code Part IV (IP, including space-related patents)
RU-INFORMATION-LAW              Federal Law on Information (149-FZ)
RU-CRYPTO-REG                   FSB Cryptography licensing for ground-segment
RU-INTERSPUTNIK-MEMBERSHIP      Russia as host state of Intersputnik
RU-SOYUZ-IGA-WITH-FR            Russia-France ESA Soyuz launch IGA (Kourou)
RU-SOYUZ-IGA-WITH-EU            Russia-EU Soyuz launch IGA
RU-MILITARY-DOCTRINE-2014       Military doctrine (space chapter)
RU-AEROSPACE-DOCTRINE           Aerospace doctrine + KOSMOS-tied programmes
RU-BAIKONUR-LEASE               Kazakhstan-Russia Baikonur lease (2050 horizon)
RU-VOSTOCHNY-COSMODROME-REG     Vostochny cosmodrome operational regulations
RU-PLESETSK-REG                 Plesetsk cosmodrome (military)
RU-GLONASS-INTL-COOP            GLONASS international coordination agreements
RU-LUNAR-COOPERATION-CN         Russia-China Lunar Research Station MOU
RU-ASAT-NUDOL-DOCTRINE          Russia ASAT capability doctrine (Nudol 2021 incident)
RU-SANCTIONS-COUNTER-MEASURES   Counter-sanctions decrees applicable to space-tech imports
RU-CUSTOMS-UNION-SPACE          EAEU customs union — space-hardware classifications
RU-ROSKOSMOS-PROCUREMENT        Roskosmos procurement framework
```

**Authority records:**

```
RU-ROSCOSMOS      Roscosmos State Corporation
RU-FSB-CRYPTO     FSB Cryptography Center
RU-FSTEC          Federal Service for Technical and Export Control
RU-MOD-RU         Ministry of Defence (space forces)
RU-MINKOMSVYAZ    Ministry of Digital Development (frequency)
```

### 5.C Singapore (SG) — NEW jurisdiction, target 20 sources

File: `src/data/legal-sources/sources/sg.ts` (create)

```
SG-SPACE-INDUSTRY-OFFICE-2024   Office of Space Technology and Industry (OSTIn) charter
SG-TELECOM-ACT                  Telecommunications Act (frequency coordination)
SG-IMDA-LICENSING               IMDA Satellite Operator Licence regime
SG-PERSONAL-DATA-PA             Personal Data Protection Act 2012
SG-CYBERSECURITY-ACT-2018       Cybersecurity Act (applied to ground-segment + satcom)
SG-COMPETITION-ACT              Competition Act 2004 (applied to satcom market)
SG-SOLICITORS-ACT-SCOPE         Solicitors Act — space-law practice scope clarification
SG-EXPORT-CONTROL-SCSGA         Strategic Trade Act 2009 (Singapore export control)
SG-FOREIGN-INVESTMENT           Foreign-investment review (currently sector-by-sector)
SG-ITU-NOTIFYING-ADMIN          ITU notifying administration role (filings for Asia-Pacific operators)
SG-SAT-OPERATORS                Singapore-licensed satellite operators (ST Engineering, SingTel Optus partners)
SG-ONEWEB-GATEWAY-MOU           OneWeb gateway agreement (Singapore as APAC hub)
SG-OUTER-SPACE-INDUSTRY-AMC     Asia-Pacific Spaceport advisory framework
SG-NEW-SPACE-INVESTMENT-STRAT   Space Industry Office investment strategy 2023-2030
SG-SATCOM-OPERATOR-DEFAULT-REG  Default-handling procedure for satcom operator failures
SG-MAS-SATCOM-FINANCING         Monetary Authority satcom-financing guidelines
SG-LIABILITY-CAP                Liability cap framework for Singapore-licensed operators
SG-INSOLVENCY-SATCOM            Insolvency Restructuring Act applied to satcom
SG-ENVIRONMENTAL-PROT-ACT       Environmental Protection Act (applied to launch + ground)
SG-CIVIL-DEFENCE-SHELTER-ACT    Civil defence regulation (applicable to satcom hardening)
```

### 5.D Indonesia (ID) — NEW, target 15 sources

```
ID-LAPAN-LAW                    Law on Space Activities (UU 21/2013)
ID-LAPAN-BRIN-MERGER-2021       BRIN integration of LAPAN
ID-SATELLITE-OPERATIONS-REG     Satellite operations regulation (KEPMENRISTEK)
ID-PALAPA-SATELLITE-CHARTER     Palapa satellite series legal framework
ID-BAKTI-USO-FUND               Universal Service Obligation fund (rural satcom)
ID-ELECTRONIC-INFO-LAW          ITE Law (UU 11/2008) applied to satcom data
ID-PERSONAL-DATA-PROTECTION     PDP Law 27/2022 (in force from 2024)
ID-RADIO-FREQUENCY-REG          KEMKOMINFO frequency coordination
ID-DEFENCE-INDUSTRY-LAW         Law 16/2012 (defence industry, space chapter)
ID-FOREIGN-INVESTMENT-CITIZEN   Foreign investment screening (DNI Negative List)
ID-ASEAN-SPACE-COOPERATION      ASEAN space cooperation framework (ASEAN Cosmos)
ID-EQUATOR-LAUNCH-SITE-PLAN     Biak equatorial launch site development plan
ID-ENVIRONMENT-LAW              UU 32/2009 applied to launch + ground
ID-ITU-NOTIFYING-ADMIN          ID as ITU notifying administration
ID-SATCOM-CONCESSION-FRAMEWORK  Satcom concession framework for operators
```

### 5.E Philippines (PH) — NEW, target 12 sources

```
PH-SPACE-ACT-2019               Republic Act 11363 (Philippine Space Act)
PH-PHILSA-CHARTER               Philippine Space Agency charter
PH-NTC-FREQUENCY                National Telecommunications Commission frequency
PH-DATA-PRIVACY-ACT             RA 10173 Data Privacy Act
PH-CYBERCRIME-ACT               RA 10175 Cybercrime Prevention Act
PH-DIWATA-SATELLITE-FRAMEWORK   Diwata satellite series legal framework
PH-FOREIGN-INVESTMENT           Foreign Investments Act + Negative List
PH-DEFENCE-INDUSTRY             Self-Reliant Defense Posture (space cross-refs)
PH-DOST-SPACE-PROGRAMS          Department of Science & Technology space programmes
PH-ASEAN-SPACE-COOP             ASEAN cooperation mechanisms
PH-ENVIRONMENTAL-IMPACT         EIS System (PD 1586) applied to launch/ground
PH-INDIGENOUS-PEOPLES-RIGHTS    IPRA 1997 applied to launch-site land rights
```

### 5.F Saudi Arabia (SA) — NEW, target 12 sources

```
SA-SPACE-AGENCY-2018            Saudi Space Agency (SSA) royal decree
SA-VISION-2030-SPACE            Vision 2030 space chapter
SA-NEOM-SPACEPORT-PLAN          NEOM spaceport plan
SA-CITC-FREQUENCY               Communications, Space & Technology Commission frequency
SA-PDPL                         Personal Data Protection Law 2021
SA-NCA-ECC-2018                 National Cybersecurity Authority Essential Cybersecurity Controls
SA-OECD-EXPORT-CONTROL          Saudi export control framework (OECD-equivalent)
SA-COMMERCIAL-COURT-LAW         Commercial Courts Law 2020 (satcom disputes)
SA-INVESTMENT-LAW               Foreign Investment Law (sector-by-sector approval)
SA-ARAB-SAT-MEMBERSHIP          Saudi as Arabsat host state
SA-SATCOM-ENVIRONMENTAL         Environmental impact procedure for spaceport
SA-ABRAHAM-ACCORDS-IL-COOP      Israel cooperation MOUs (Abraham Accords space angle)
```

### 5.G Egypt (EG) — NEW, target 12 sources

```
EG-EGSA-LAW-2017                Egyptian Space Agency Law 3/2018
EG-AFSA-HEADQUARTERS-2023       African Space Agency headquarters agreement
EG-NTRA-FREQUENCY               National Telecom Regulatory Authority
EG-DATA-PROTECTION-2020         Personal Data Protection Law 151/2020
EG-CYBERCRIME-LAW-2018          Law 175/2018 Anti-Cybercrime Law
EG-EXPORT-CONTROL               Foreign Trade Law (export control framework)
EG-FOREIGN-INVESTMENT-LAW       Investment Law 72/2017
EG-NILESAT-CHARTER              Nilesat operator framework
EG-AFRICAN-SPACE-POLICY         Egypt as AfSA host — adoption of African Space Policy
EG-MILITARY-CIVIL-OVERLAP       Military-civil cooperation framework
EG-LAUNCH-SITE-FUTURE           Future launch site preliminary regulation
EG-ENVIRONMENTAL-LAW            Environment Law 4/1994 applied to launch
```

### 5.H Argentina (AR) — NEW, target 12 sources

```
AR-CONAE-CHARTER                CONAE National Commission for Space Activities (decree 995/1991)
AR-SAOCOM-AGREEMENT             SAOCOM Argentine-Italian framework
AR-NATIONAL-SPACE-PLAN          National Space Plan (4-year cycles)
AR-FALDA-DEL-CARMEN             Falda del Carmen launch site regulation
AR-ENACOM-FREQUENCY             ENACOM frequency coordination
AR-PERSONAL-DATA-LAW            Law 25.326 Personal Data Protection
AR-CYBERSECURITY-FRAMEWORK      National Cybersecurity Strategy 2019
AR-EXPORT-CONTROL-RGSC          Strategic Goods Control Regime
AR-DEFENCE-INDUSTRY-FAB         Defense Industry framework (FAB military space)
AR-CONICET-SPACE-RESEARCH       CONICET research framework
AR-INVAP-CONTRACTOR             INVAP technology development corporation framework
AR-MERCOSUR-SPACE-PROTOCOL      Mercosur space cooperation protocol
```

### 5.I Mexico (MX) — NEW, target 10 sources

```
MX-AEM-LAW-2010                 Mexican Space Agency Law (Diario Oficial)
MX-IFT-FREQUENCY                Federal Telecommunications Institute frequency
MX-FED-LAW-CONSUMER-PROT-DATA   Federal Law on Personal Data Protection
MX-CYBERSECURITY-NATIONAL-STRAT National Cybersecurity Strategy 2017
MX-EXPORT-CONTROL               Foreign Trade Law export control
MX-FOREIGN-INVESTMENT-LAW       Foreign Investment Law 1993 (telecom restrictions)
MX-NAFTA-USMCA-SPACE            USMCA space-services chapter
MX-SATMEX-PRIVATIZATION         Satmex (now Eutelsat Americas) framework
MX-AEM-INTL-COOP-MOUS           AEM cooperation MOUs (US, EU, BR, JP)
MX-CONSTITUTIONAL-ART-27        Constitution Art. 27 (national-security telecoms)
```

---

## § 6 P2 Sub-Domain Clusters

### 6.A Space Resource Mining cluster

These cross-reference existing US/LU/JP/UAE entries. Add a `space_resources` value to ComplianceArea? **DECISION: re-use existing `licensing` + new sub-tagging via metadata; don't add a 16th ComplianceArea here.**

Add deep-dive entries:

```
US-CSLCA-2015-TITLE-IV         Commercial Space Launch Competitiveness Act Title IV (asteroid mining)
US-NASA-LUNAR-REGOLITH-CONTRACTS  NASA Lunar Regolith Contract Awards 2020 framework
LU-SPACE-RESOURCES-LAW-2017    Already in LU? Verify; add deep-dive
LU-SPACE-RESOURCES-IMPLEMENTING National implementing decree
JP-SPACE-RESOURCES-ACT-2021    Act on the Promotion of Business Activities Related to the Exploration and Development of Space Resources
AE-SPACE-LAW-2019              UAE Space Activities Law (Federal Law 12/2019)
AE-SPACE-RESOURCES-REG-2020    UAE space-resources implementing regulation
INT-IISL-WORKING-GROUP-RESOURCES IISL Working Group on Space Resources 2017-2024 reports
INT-HAGUE-WORKING-GROUP-BUILDING-BLOCKS  Hague International Space Resources Governance WG Building Blocks 2019
INT-MOON-AGREEMENT-PRESERVATION-CLAUSE  Article 11 Moon Agreement (province of mankind) — counter-claim analysis
```

### 6.B Suborbital + Space Tourism cluster

```
US-FAA-PART-460                FAA Part 460 (Human Spaceflight Requirements)
US-FAA-PART-437                FAA Part 437 (Experimental Permits)
US-FAA-PART-450                FAA Part 450 (Streamlined launch licensing — newest base rule)
US-CSLA-EXTENSION-2023         Commercial Space Launch Act extension (informed consent moratorium expiry)
UK-SIA-2018-SPACEFLIGHT-OP     UK Space Industry Act 2018 — Spaceflight Operator Licence
UK-SIA-2018-SPACEPORT          UK Space Industry Act 2018 — Spaceport Licence
UK-SIA-REGS-2021               UK Space Industry Regulations 2021
BR-AEB-ALCANTARA-IC            Brazilian AEB Alcântara informed consent regime
BR-AEB-SAFEGUARDS-US-TIA       Brazil-US Technology Safeguards Agreement (Alcântara)
INT-IAA-ASTRONAUT-CONDUCT      IAA Astronaut Code of Conduct
INT-IAASS-SUBORBITAL           IAASS Suborbital Safety Standards
US-SPACEFLIGHT-WORKERS-OSHA    OSHA jurisdiction over spaceflight workers (informed consent overlap)
ES-CASTILLA-LA-MANCHA-SPACE    Spain Castilla-La-Mancha launch site initial framework
NO-ANDOYA-SPACEPORT            Norway Andøya Spaceport Operator Licence
SE-ESRANGE-SPACEPORT           Sweden Esrange Spaceport (commercial framework)
IT-TARANTO-LAUNCH-SITE         Italy Taranto spaceport planning framework
```

### 6.C Active Debris Removal (ADR) + In-Orbit Servicing (IOS)

```
INT-IADC-ADR-STATEMENT-2023    IADC Statement on Active Debris Removal 2023
INT-COPUOS-LTS-GL-25           COPUOS LTS Guideline 25 (active mitigation)
INT-IAA-COSMIC-STUDY-OOS       IAA Cosmic Study on On-Orbit Servicing 2010 + 2020 update
JP-CRD2-MISSION-FRAMEWORK      JAXA Commercial Removal of Debris Demonstration framework
EU-CLEARSPACE-1-FRAMEWORK      ESA ClearSpace-1 mission contractual framework
EU-ZERO-DEBRIS-CHARTER-2023    ESA Zero Debris Charter 2023
US-SPD-3-STM                   US Space Policy Directive 3 (Space Traffic Management)
US-IOS-CONSORTIUM-COSMIC       CONFERS / COSMIC consortium standards
EU-ADR-PROCUREMENT-FRAMEWORK   EU IRIS² collateral ADR procurement
INT-IADC-COLLISION-AVOIDANCE   IADC Recommendations on Collision Avoidance
US-FCC-DEBRIS-RULE-2020        FCC Order 5-year disposal rule
US-FCC-PROBABILITY-OF-COLLISION FCC Probability of Collision metric (proposed 2023)
UK-CAA-ADR-LICENCE-FRAMEWORK   UK CAA Active Debris Removal licence framework (proposed)
DE-DLR-DEBRIS-MISSION-COND     DLR debris-mission contractual conditions
ESA-CLEAN-SPACE-INITIATIVE     ESA Clean Space Initiative procurement framework
```

### 6.D Megaconstellation-specific

```
US-FCC-ORBITAL-DEBRIS-RULE     FCC Orbital Debris Rule 2020 (re-anchor — also in 6.C)
US-FCC-NPRM-NGSO-MILESTONES    FCC NPRM on NGSO Milestones (2024)
INT-ITU-RES-35                 ITU Resolution 35 (BIU milestones for NGSO)
INT-ITU-RES-219                ITU Resolution 219 (continuous NGSO filing)
INT-IAU-RES-B5-2024            IAU Resolution B5 — Dark and Quiet Sky 2024
INT-IAU-CPS-CENTER             IAU Centre for the Protection of the Dark and Quiet Sky
US-DOT-FCC-MOU-2018            DOT/FCC interagency MOU on commercial space
US-FCC-CONSTELLATION-MARKING   FCC NPRM on satellite-luminosity reporting (2024)
EU-IRIS2-INTEROP-FRAMEWORK     EU IRIS² interoperability framework with commercial NGSO
US-FCC-V-BAND-CONSTELLATIONS   FCC V-band constellation orders (Boeing, SpaceX, OneWeb)
US-FCC-NGSO-EARTH-STATION-CONSOL  FCC NGSO Earth Station consolidation rulemaking
INT-IADC-CONSTELLATIONS-STMT   IADC Statement on Large Constellations
INT-ESOC-COLLISION-AVOIDANCE   ESA ESOC Collision Avoidance procedures
```

### 6.E Radio Astronomy + Dark Skies

```
INT-IAU-CPS-CENTER             (cross-ref from 6.D)
INT-ITU-RR-ART-29              ITU RR Article 29 (Radio Astronomy Service)
US-NRQZ-ACT-GREEN-BANK         US National Radio Quiet Zone Act (Green Bank)
CL-ALMA-ATACAMA-RESERVE        Chile ALMA Atacama dark-sky reserve
INT-IAU-RECOMMENDATION-LIGHT-POLLUTION  IAU Recommendation on satellite-induced light pollution
ZA-SKA-PROTECTION-ACT          South Africa SKA Protection Act (radio quiet zone)
AU-MURCHISON-RADIO-QUIET       Australia Murchison Radio-astronomy Observatory protection
INT-COSPAR-DARK-SKIES          COSPAR Statement on Protection of Dark Skies
INT-WP-9C-ITU                  ITU-R Working Party 9C (radio astronomy + science services)
```

### 6.F Space Cybersecurity (beyond NIS2/CRA)

```
US-SPD-5-2020                  Space Policy Directive 5 (Space Cybersecurity Principles)
US-NIST-IR-8270                NIST IR 8270 Introduction to Cybersecurity for Commercial Satellite Operations
US-NIST-IR-8276                NIST IR 8276 Cybersecurity Profile for Commercial Satellite Operations
INT-CCSDS-350-X                CCSDS 350.x Security Standards (we have some — verify completeness)
EU-ENISA-SPACE-THREAT-2023     ENISA Threat Landscape — Space Sector Report 2023
INT-IATA-CYBER-GUIDELINE-SPACE IATA Space Sector Cybersecurity Guideline (where applicable)
US-CISA-SPACE-ICS              CISA Space Sector Industrial Control Systems guidance
UK-NCSC-SATCOM-GUIDANCE        UK NCSC Satcom Cybersecurity Guidance
DE-BSI-SPACE-CYBERSEC-GRUNDS   BSI Grundschutz for Space Sector (proposed module)
EU-CRA-CERTIFICATION-EUCC      EU CRA Certification scheme EUCC for satcom equipment
EU-CYBER-RESILIENCE-CERT-EUCS  EU Cybersecurity Certification scheme EUCS for cloud (ground-segment)
INT-CCSDS-SDLS                 CCSDS Space Data Link Security (SDLS) protocol
INT-CCSDS-SECURE-WIRE          CCSDS Secure Wire (link-layer encryption)
US-DOD-CMMC-SPACE              DoD CMMC 2.0 applied to space contractors
```

### 6.G Climate / Environmental Overlay

```
INT-UNFCCC-LAUNCH-EMISSIONS    UNFCCC NDC inclusion of launch emissions (analysis docs)
INT-ICAO-CORSIA-SUBORBITAL     ICAO CORSIA suborbital crossover analysis
INT-IMO-2023-GHG-STRATEGY      IMO 2023 GHG Strategy (sea-based launch implications)
EU-CBAM                        EU Carbon Border Adjustment Mechanism (applied to space-hardware imports)
EU-CSRD-DIRECTIVE-2022         EU Corporate Sustainability Reporting Directive
EU-SFDR-2019-2088              EU Sustainable Finance Disclosure Regulation (taxonomy for space-tech)
EU-TAXONOMY-DELEGATED-ACTS     EU Taxonomy Delegated Acts (space activities classification)
US-EPA-LAUNCH-AIR-EMISSIONS    EPA Air Emissions framework for launch vehicles
US-NEPA-LAUNCH-EIS             NEPA EIS process for launch site / launch licence
EU-EIA-DIR-LAUNCH-SITE         EU EIA Directive 2011/92 applied to launch sites
INT-COPUOS-LTS-SUSTAINABILITY  COPUOS LTS Guidelines sustainability framework
INT-IAA-LAUNCH-EMISSIONS       IAA Cosmic Study on Launch Vehicle Atmospheric Impacts
ES-EIA-PEMARCAR-SPACEPORT      Spain EIA for spaceport project Cabo (PEMARCAR analysis)
```

### 6.H National Security Doctrines

```
US-NSP-2020                    US National Space Policy 2020
US-NSPM-30                     US National Space Presidential Memorandum 30 (commercial remote sensing)
US-DODD-3100-10                US DoD Directive 3100.10 (Space Operations)
US-NDAA-TITLE-XVI-2024         NDAA Title XVI provisions (annual — track each year)
US-USSPACECOM-DOCTRINE         US Space Command doctrine summary
US-CSO-SPACE-DOCTRINE          US Chief of Space Operations doctrine
INT-NATO-SPACE-POLICY-2019     NATO Space Policy 2019 + Brussels declaration
INT-NATO-SPACE-CENTER          NATO Space Centre of Excellence framework
EU-STRATEGIC-COMPASS-SPACE     EU Strategic Compass 2022 (space chapter)
CN-DEFENSE-WHITEPAPER-2019     China National Defence whitepaper 2019 (space chapter — also in CN bundle)
RU-MIL-DOCTRINE-2014           Russia Military Doctrine 2014 (space chapter — also in RU bundle)
FR-DEFENSE-SPACE-STRATEGY-2019 France Space Defence Strategy 2019
DE-BMVG-SPACE-STRATEGY-2022    Germany BMVg Space Strategy 2022
UK-DEFENCE-SPACE-STRATEGY-2022 UK Defence Space Strategy 2022
JP-DEFENSE-SPACE-STRATEGY-2020 Japan Defense Space Strategy
IN-DSA-2020                    India Defence Space Agency 2020
AU-DEFENCE-SPACE-COMMAND-2022  Australia Defence Space Command 2022
```

### 6.I Privacy / Data Sovereignty (beyond GDPR)

```
EU-EPRIVACY-2002-58            ePrivacy Directive 2002/58 (electronic communications)
EU-EPRIVACY-REG-PENDING        ePrivacy Regulation (pending, with timeline updates)
US-CLOUD-ACT                   US Cloud Act (extraterritorial data demands)
EU-EVE-REG                     EU E-Evidence Regulation (cross-border data)
CN-DSL-2021                    China Data Security Law (cross-ref from CN bundle)
IN-IT-ACT-DATA-LOCAL           India IT Act data localization rules
RU-152-FZ-DATA-LOCAL           Russia 152-FZ personal data localization
BR-LGPD                        Brazil General Data Protection Law
TR-KVKK                        Turkey Personal Data Protection Law
AU-PRIVACY-ACT-1988            Australia Privacy Act 1988 + 2024 reform
JP-APPI-2022                   Japan Act on Protection of Personal Information 2022
KR-PIPA                        Korea Personal Information Protection Act
```

---

## § 7 P3 Modern EU + Financial + Bilateral

### 7.A Modern EU regulation applied to space

```
EU-AI-ACT-2024                 EU AI Act 2024 (autonomous collision avoidance, remote sensing AI)
EU-DATA-ACT-2023               EU Data Act 2023 (in-orbit-as-a-service data flows)
EU-DGA-2022                    EU Data Governance Act 2022 (data spaces — space data space)
EU-MICAR-2023                  EU Markets in Crypto Assets (applied to space-tokenized financing)
EU-CLOUD-CERT-EUCS             EU Cloud Cybersecurity Certification (EUCS — ground-segment relevance)
EU-NIS2-IMPLEMENTING-ACTS      NIS2 implementing acts (sector-specific for space)
EU-CER-IMPLEMENTING-ACTS       EU CER Directive implementing acts (critical entities — space subsumed)
EU-FOREIGN-SUBSIDIES-FSR       EU Foreign Subsidies Regulation 2022 (applied to non-EU space-tech bidders)
EU-MARKET-SURVEILLANCE-2019    EU Market Surveillance Regulation 2019/1020 (CRA enforcement)
EU-EUDI-WALLET                 EU Digital Identity Wallet (eIDAS 2) — satcom KYC implications
EU-EDPB-DATA-SPACES-OPINION    EDPB Opinion on European Data Spaces (space data space relevance)
EU-EUROPEAN-DEFENCE-INDUSTRY-PROGRAMME  EDIP 2023 (space dual-use)
EU-COMMERCIAL-SPACE-LAW-PROPOSAL EU "Commercial Space" proposal (rumored / pre-leg work)
EU-STM-IMPLEMENTING            EU STM Strategy 2022 implementing acts
EU-COMPANIES-3-RULES           EU Companies Law Three (transparency + sustainability) applied to space-cos
```

### 7.B Financial / Capital Markets

```
EU-PROSPECTUS-REG-2017-1129    EU Prospectus Regulation (space-SPAC + IPO)
EU-MIFID-II                    MiFID II (space-trading)
US-SEC-10B-5-SPACE             US SEC Rule 10b-5 — applied to OneWeb / Momentus / Spire
LSE-LISTING-RULES-SPACE        London Stock Exchange listing rules (space-specific disclosures)
EURONEXT-LISTING-SPACE         Euronext listing rules (space disclosures)
AMS-LISTING-SPACE              Amsterdam listing rules
US-CFIUS-2018                  Foreign Investment Risk Review Modernization Act (CFIUS)
EU-FDI-REG-2019-452            EU FDI Screening Regulation
UK-NSI-ACT-2021                UK National Security and Investment Act 2021
DE-AWG-AWV-FDI                 Germany AWG/AWV FDI Screening (§§ 55-62)
FR-PIIE-SPACE                  France Procédure d'investissements étrangers (space coverage)
US-DOD-CMMC-CONTRACTOR-FIN     DoD CMMC contractor financial req (also cyber)
INT-FATF-SPACE-FINANCING       FATF guidance on space-financing AML/KYC
EU-AML-REG-2024                EU Anti-Money Laundering Regulation 2024
```

### 7.C Bilateral / Multilateral Agreements

```
INT-ARTEMIS-ACCORDS-2020       Artemis Accords 2020 + 36 signatories (track per-signatory ratification)
INT-ISS-IGA-1998               International Space Station Inter-Governmental Agreement 1998
INT-US-RU-SOYUZ-IGA-1996       US-Russia Soyuz IGA 1996
INT-FR-RU-SOYUZ-IGA-2003       France-Russia Soyuz at Kourou IGA
INT-BR-UA-CYCLONE-4-2003       Brazil-Ukraine Cyclone-4 launch IGA (Alcântara)
INT-US-NORWAY-ANDOYA-TIA       US-Norway Technology Safeguards Agreement Andøya
INT-US-UK-TIA-2020             US-UK TSA on space technology (2020)
INT-CN-RU-LUNAR-2021           China-Russia Lunar Research Station MOU
INT-CN-ZA-LUNAR-2024           China-South Africa Lunar Research Station MOU
INT-CN-PK-LUNAR-2024           China-Pakistan Lunar Research Station MOU
INT-CN-VE-LUNAR-2024           China-Venezuela Lunar Research Station MOU
INT-INDIA-ARTEMIS-2023         India Artemis Accord signing 2023
INT-JP-ARTEMIS-2020            Japan Artemis Accord signing 2020
INT-LU-ARTEMIS-2021            Luxembourg Artemis Accord
INT-UK-ARTEMIS-2020            UK Artemis Accord
INT-AE-ARTEMIS-2020            UAE Artemis Accord
INT-ISRAEL-ARTEMIS-2022        Israel Artemis Accord
INT-AUSTRALIA-ARTEMIS-2020     Australia Artemis Accord
INT-ITALY-ARTEMIS-2020         Italy Artemis Accord
INT-CANADA-ARTEMIS-2020        Canada Artemis Accord
INT-BRAZIL-ARTEMIS-2021        Brazil Artemis Accord (controversial — analysis)
INT-RU-EAEU-CUSTOMS-SPACE      Russia-EAEU customs union — space hardware
INT-ESA-CONVENTION-1975        ESA Convention 1975 (also in INT)
INT-EUMETSAT-CONVENTION        EUMETSAT Convention 1983
INT-INTERSPUTNIK-1971          Intersputnik Convention 1971 (also in INT)
INT-IMSO-CONVENTION-1976       International Mobile Satellite Org Convention
INT-EUTELSAT-CONVENTION-1982   Eutelsat Convention 1982
INT-ARABSAT-CONVENTION-1976    Arabsat Convention 1976
INT-AFRICAN-SPACE-AGENCY-CONV  African Space Agency Convention 2018
```

---

## § 8 P4 Sub-Tier Jurisdiction Deepening

### 8.A Australia (AU) — expand from 12 → 30

```
AU-SPACE-LAUNCHES-RETURNS-ACT-2018   Space (Launches and Returns) Act 2018
AU-SPACE-LR-RULES-2019                Space (Launches and Returns) (General) Rules 2019
AU-SLR-LAUNCH-FACILITIES               Rules on Launch Facilities
AU-SLR-INSURANCE-RULES                 Rules on Insurance and Financial Responsibility
AU-SLR-INVESTIGATION-PROCEDURE         Rules on Investigation Procedures
AU-ASA-CHARTER                         Australian Space Agency charter
AU-MOON-2-MARS-INITIATIVE              Moon to Mars Initiative framework
AU-ARENA-SPACE                         ARENA space tech program
AU-DSO-SPACE                           Defence Science and Technology (DSTO) space framework
AU-AUSTRALIA-ARTEMIS-ACCESSION         Artemis Accords accession (cross-ref)
AU-DEFENCE-EXPORT-CONTROLS-DSGL        Defence and Strategic Goods List (DSGL)
AU-AUTONOMOUS-SANCTIONS                Autonomous Sanctions Act 2011 (applied to space exports)
AU-FOREIGN-INVESTMENT-FATA             Foreign Acquisitions and Takeovers Act 1975 amended
AU-SECURITY-OF-CRITICAL-INFRA          Security of Critical Infrastructure Act 2018 (space included 2022)
AU-PRIVACY-ACT-2024-AMENDMENT          Privacy Act 1988 amendment 2024
AU-CYBER-SECURITY-STRAT-2023           Cyber Security Strategy 2023-2030
AU-MURCHISON-RADIO-QUIET-ZONE          Murchison Radio-Quiet Zone (cross-ref)
AU-INDIGENOUS-LAND-USE-AGREEMENTS      ILUAs for launch sites
AU-ARNHEM-LAND-EQUATORIAL-LAUNCH       Arnhem Land equatorial launch framework
AU-WHALERS-WAY-LAUNCH                  Whalers Way launch facility planning
```

### 8.B New Zealand (NZ) — expand from 13 → 25

```
NZ-OUTER-SPACE-HIGH-ALTITUDE-ACT-2017  Outer Space and High-altitude Activities Act 2017
NZ-OSHAA-REGULATIONS-2017              Outer Space and High-altitude Activities (Licences and Permits) Regulations
NZ-MFAT-LICENSING                      MFAT licensing procedures
NZ-MAHIA-LAUNCH-SITE-AGREEMENT         Mahia Peninsula launch site agreement (Rocket Lab)
NZ-INDIGENOUS-MAORI-CONSULT            Māori consultation framework for spaceport
NZ-NZSPA-MEMBERSHIP                    NZ Space Agency cooperation framework
NZ-DEFENCE-INTEL-SPACE                 NZ Defence Intelligence space framework
NZ-EXPORT-CONTROLS-CATL                Customs Export Prohibition controls (CATL — space items)
NZ-PRIVACY-ACT-2020                    Privacy Act 2020
NZ-CYBERSECURITY-NCSC                  NZ NCSC Cyber Security guidance
NZ-FOREIGN-INVESTMENT                  Overseas Investment Act 2005 amended 2021
NZ-ROCKET-LAB-IPO-DISCLOSURE           Rocket Lab IPO regulatory disclosure framework
NZ-FIVE-EYES-SPACE-COOP                Five Eyes space cooperation (NZ angle)
NZ-ARTEMIS-ACCORDS-2021                NZ Artemis Accord accession
NZ-RESOURCE-MANAGEMENT-ACT             Resource Management Act 1991 (spaceport environmental)
```

### 8.C India (IN) — expand from 12 → 30

```
IN-SPACE-POLICY-2023                   Indian Space Policy 2023
IN-INSPACE-NORMS-2023                  IN-SPACe Norms, Guidelines and Procedures 2023
IN-INSPACE-AUTHORIZATION-FRAMEWORK     IN-SPACe Authorization Framework
IN-SPACE-ACTIVITIES-BILL-PENDING       Space Activities Bill (pending)
IN-ISRO-CHARTER                        ISRO charter (Department of Space)
IN-DOS-PROCUREMENT-FRAMEWORK           Department of Space procurement framework
IN-NSIL-CHARTER                        NewSpace India Limited (NSIL) charter
IN-IT-ACT-DATA-LOCAL                   IT Act 2000 + Data Protection Bill (cross-ref)
IN-DPDP-ACT-2023                       Digital Personal Data Protection Act 2023
IN-SEBI-LISTING-SPACE-COS              SEBI Listing rules (space-cos)
IN-FDI-POLICY-SPACE-2024               FDI Policy 2024 (space sector 100% automatic)
IN-CIVIL-SPACE-AVIATION-OVERLAP        Civil Aviation Act + spaceflight overlap
IN-ANTRIX-COMMERCIAL                   Antrix Corporation commercial framework
IN-DEVAS-ANTRIX-DISPUTE                Devas-Antrix arbitration framework (cross-ref Case CASE-IN-SC-DEVAS-2022)
IN-DEFENCE-SPACE-AGENCY                Defence Space Agency 2018-2020
IN-INTEGRATED-SPACE-CELL                Integrated Space Cell (IDS)
IN-SATELLITE-NAVIGATION-IRNSS-NAVIC    IRNSS/NavIC framework
IN-RADIO-FREQUENCY-WPC                  WPC frequency coordination
IN-COASTAL-REGULATION-SRIHARIKOTA      Coastal regulation zone (Sriharikota launch site)
IN-EXPORT-CONTROL-FTDR                  FTDR + SCOMET list export control
```

### 8.D Japan (JP) — expand from 15 → 30

```
JP-SPACE-ACT-2018                      Space Activities Act 2018 (Act 76 of 2016, effective 2018)
JP-SPACE-RESOURCES-ACT-2021            Space Resources Act 2021
JP-SPACE-INDUSTRY-PROMO-2017           Space Industry Promotion Act
JP-JAXA-LAW                            JAXA Act
JP-NATIONAL-SPACE-POLICY-2024           National Space Policy 2024 update
JP-BASIC-SPACE-PLAN                     Basic Space Plan (4-year cycles)
JP-SPACE-COMMERCIALIZATION-FRAMEWORK    Commercialization promotion framework
JP-LAUNCH-LICENSING-PROCEDURE           Launch licensing procedure
JP-SATELLITE-MANAGEMENT-LICENSING       Satellite management licensing
JP-REMOTE-SENSING-ACT                   Act on Securing Appropriate Handling of Satellite Remote Sensing Records
JP-JAXA-INTL-COOP-FRAMEWORK             JAXA international cooperation framework
JP-MEXT-SPACE-RESEARCH                  MEXT space research framework
JP-DEFENSE-SPACE-STRATEGY-2020          Defense Space Strategy (cross-ref 6.H)
JP-CRD2-FRAMEWORK                       Commercial Removal of Debris Demonstration framework
JP-ARTEMIS-ACCORDS-2020                 Artemis Accord (cross-ref 7.C)
JP-MOON-AGREEMENT-NON-PARTY             Position on Moon Agreement (analysis)
JP-EXPORT-CONTROL-METI                  METI export control (Foreign Exchange and Foreign Trade Act)
JP-FOREIGN-INVESTMENT-FEFTA             FEFTA 2020 amendment (space sector)
JP-APPI-2022                            Personal Information Protection Act (cross-ref 6.I)
JP-CYBERSECURITY-FRAMEWORK              Cybersecurity Basic Act 2014 + NISC framework
JP-TANEGASHIMA-LAUNCH-AGREEMENT         Tanegashima launch site agreement with local government
JP-USHIYAMA-LAUNCH-FACILITY             Uchinoura launch facility framework
JP-ITU-NOTIFYING-ADMIN                  Japan as ITU notifying administration
```

### 8.E South Korea (KR) — expand from 11 → 25

```
KR-SPACE-DEVELOPMENT-ACT-2005          Space Development Promotion Act 2005
KR-SPACE-INDUSTRY-PROMOTION-2017       Space Industry Promotion Act 2017
KR-KASA-LAW-2024                       KASA (Korea AeroSpace Administration) Establishment Act
KR-KARI-CHARTER                        KARI charter
KR-LAUNCH-LICENSE-FRAMEWORK            Launch license framework
KR-NARO-SPACE-CENTER-REG               Naro Space Center regulation
KR-DAEDEOK-INNOPOLIS-SPACE             Daedeok Innopolis space cluster framework
KR-DEFENSE-SPACE-AGENCY                Korea Defense Space Cooperation framework
KR-KSAT-MEMBERSHIP                     Korea Satellite Industry membership framework
KR-FREQUENCY-COORDINATION-MSIT         MSIT frequency coordination
KR-PIPA-PERSONAL-INFO-PROT             Personal Information Protection Act (cross-ref 6.I)
KR-FAIR-TRADE-ACT-SPACE                Fair Trade Act applied to space-com market
KR-EXPORT-CONTROL-MOTIE                MOTIE Strategic Trade Information Center
KR-FOREIGN-INVESTMENT-PROMO            Foreign Investment Promotion Act
KR-DEFENSE-ACQUISITION-DAPA            DAPA (Defense Acquisition Program Administration) space
KR-NUCLEAR-NON-PROLIFERATION-COMMITMENTS  KR commitments (relevant for missile-tech transfer)
KR-ITU-NOTIFYING-ADMIN                 KR as ITU notifying administration
KR-MTCR-MEMBERSHIP                      Missile Technology Control Regime membership
KR-ZUR-BUSINESS-LAW                     ZUR business law applied to satcom
KR-CYBERSECURITY-FRAMEWORK              KISA cybersecurity framework
KR-ARTEMIS-ACCORDS-2021                 KR Artemis Accord 2021
```

---

## § 9 P5 Cases Expansion — +35 new cases

File: `src/data/legal-cases/cases.ts` (or new shard)

Target: bring cases from 55 → 90+. Group by theme:

### 9.A Lunar / Deep-Space (5)

```
CASE-BERESHEET-CRASH-IL-2019           Beresheet crash 2019 (Israel) — first commercial lunar attempt
CASE-HAKUTO-R-JP-2023                  ispace Hakuto-R lunar landing attempt 2023
CASE-VIKRAM-LANDER-IN-2019             Vikram lander crash 2019 (India)
CASE-CHANDRAYAAN-3-IN-2023             Chandrayaan-3 successful landing 2023
CASE-LUNA-25-RU-2023                   Luna 25 crash 2023 (Russia)
```

### 9.B EU Competition / State Aid (5)

```
CASE-EU-SES-INTELSAT-2024              EU Commission SES-Intelsat merger review 2024 (cross-ref existing)
CASE-EU-AIRBUS-DS-STATEAID-2023        Airbus DS state aid (already in)
CASE-EU-EUTELSAT-ONEWEB-MERGER-2023    EU Commission Eutelsat-OneWeb merger clearance 2023
CASE-EU-IRIS2-CONCESSION-AWARD-2024    EU IRIS² concession award (SpaceRise consortium) 2024
CASE-EU-INMARSAT-FRAND-2023            Inmarsat FRAND case (already in)
```

### 9.C Financial / SEC / Bankruptcy (6)

```
CASE-SEC-MOMENTUS-2021                 SEC Momentus enforcement (already in)
CASE-ONEWEB-CHAPTER11-2020             OneWeb Chapter 11 2020 (already in)
CASE-SEC-SPIRE-CLASS-ACTION            Spire securities class action
CASE-VIRGIN-ORBIT-CHAPTER-11-2023      Virgin Orbit Chapter 11 2023
CASE-IRIDIUM-ORIGINAL-CHAPTER-11-1999  Iridium original Chapter 11 1999
CASE-GLOBALSTAR-RESTRUCTURING-2002     Globalstar restructuring 2002
```

### 9.D Recent FCC + International Regulatory (8)

```
CASE-FCC-STARLINK-LIGHT-POLLUTION-2024 FCC Starlink luminosity-reporting NPRM
CASE-FCC-AMAZON-KUIPER-MILESTONE-2025  Amazon Kuiper milestone enforcement 2025
CASE-FCC-V-BAND-WAIVER-2024            FCC V-band waiver decisions 2024
CASE-FCC-MEGACONSTELLATION-PROBE-2024  FCC megaconstellation probe / investigation
CASE-UK-CAA-VIRGIN-ORBIT-COSMIC-GIRL   UK CAA Cornwall AAIB investigation outcome
CASE-IT-ASI-FALCON9-2024               Italy ASI Falcon 9 Italian-payload framework
CASE-AU-ASA-SOUTHERN-LAUNCH-2024       Australia ASA Whalers Way launch licence decision
CASE-NZ-MFAT-ROCKETLAB-LICENCE-2024    NZ MFAT Rocket Lab licence amendment
```

### 9.E Liability / Insurance (5)

```
CASE-AMOS-6-INSURANCE-2017             AMOS-6 insurance (already in)
CASE-AMOS-17-INSURANCE-2019            AMOS-17 insurance (already in)
CASE-VIASAT-3-INSURANCE-2023           Viasat-3 deployment anomaly insurance 2023
CASE-INTELSAT-29E-FAILURE-2019         Intelsat 29e failure insurance settlement 2019
CASE-FALCON-9-RUD-DRAGON-2024          Falcon 9 RUD impact on Dragon launches 2024
```

### 9.F Cybersecurity / Sanctions (5)

```
CASE-VIASAT-KA-SAT-CYBERATTACK-2022    Viasat KA-SAT cyberattack 2022 (Ukraine war start)
CASE-OFAC-VIASAT-RUSSIA-2022           OFAC Viasat-related sanctions enforcement
CASE-EXPRO-OFAC-2023                   OFAC Expro space-related enforcement (already in)
CASE-OFAC-EUTELSAT-IRAN-2023           OFAC Eutelsat Iran-related enforcement
CASE-ECB-SATCOM-DORA-FINDING           ECB DORA finding against satcom-dependent financial institution
```

### 9.G Recent Suborbital / Tourism (4)

```
CASE-VIRGIN-GALACTIC-2023-SUSPENSION   FAA Virgin Galactic temporary suspension 2023
CASE-BLUE-ORIGIN-NS-23-FAILURE-2022    Blue Origin NS-23 uncrewed failure 2022
CASE-SPACEX-CREW-DRAGON-DEORBIT-2024   SpaceX Crew Dragon deorbit anomaly 2024
CASE-AXIOM-MISSION-INSURANCE-2024      Axiom mission insurance framework dispute
```

### 9.H Arbitration / Investment (3)

```
CASE-DEVAS-ANTRIX-IN-SC-2022           Devas v Antrix Indian SC (already in research file)
CASE-YUKOS-EUTELSAT-RSCC-2016          Yukos-Eutelsat-RSCC arbitration (already in)
CASE-ONEWEB-V-ROSCOSMOS-2022           OneWeb v Roscosmos (already in)
```

---

## § 10 P6 Cross-Reference Pass + Embeddings Rebuild

After all of § 4 – § 9 lands:

### 10.A Cross-reference systematic audit

- Every new source: populate `related_sources` for at least 3 connected entries.
- Every amendment: populate `amends` + `amended_by` BOTH-sides.
- Every superseded source: populate `superseded_by`.
- Pre-existing sources that get new amendments (e.g. IN-SPACE-POLICY-2023 amends predecessor): update both.

### 10.B Embeddings rebuild

- Run `npm run atlas:embed` after each ~50-source batch.
- Verify by querying semantic search for at least 3 new sources per batch and confirming they surface within top-10 results for relevant queries.

### 10.C Validity-status update

- For each new entry: confirm `status` ∈ `LegalSourceStatus`, `last_verified` is set to commit date, `source_url` is live (curl-checked).
- Re-run the validity tests in `validity-tools.server.test.ts` to confirm no schema drift.

### 10.D Cases catalogue rebuild

- After § 9 lands: rebuild any case-related embeddings (currently shipped via the same `atlas:embed` command).
- Update master plan T0.6 enrichment if cases gain new compliance_areas.

---

## § 11 Estimated Effort + Sequencing

| Phase                                    | Items                                                                                                                                    | Estimated effort | Dependencies                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------- |
| **P0 Schema**                            | 15 ComplianceAreas + 12 SourceTypes + drift-test                                                                                         | 1-2h             | None — must be first                |
| **P1 Critical Jurisdictions**            | CN 23+ / RU 20+ / SG 20 / ID 15 / PH 12 / SA 12 / EG 12 / AR 12 / MX 10 = **~136 sources**                                               | 8-12h            | P0                                  |
| **P2 Sub-Domain Clusters**               | resources 10 / suborbital 15 / ADR 15 / megacons 12 / dark-sky 9 / cybersec 14 / climate 13 / nat-sec 16 / privacy 12 = **~116 sources** | 8-12h            | P0                                  |
| **P3 EU-modern + Financial + Bilateral** | EU 15 / Financial 14 / Bilateral 30 = **~59 sources**                                                                                    | 6-8h             | P0, P2                              |
| **P4 Sub-tier Deepening**                | AU+18 / NZ+12 / IN+18 / JP+15 / KR+14 = **~77 sources**                                                                                  | 8-10h            | P0                                  |
| **P5 Cases**                             | +35 cases                                                                                                                                | 4-6h             | None (independent of source schema) |
| **P6 Cross-Reference + Embeddings**      | Walk every new entry                                                                                                                     | 4-6h             | After P1-P5                         |
| **TOTAL**                                | **~423 new sources + 35 new cases + 15 ComplianceAreas + 12 SourceTypes**                                                                | **~40-56h**      |                                     |

**End-state targets:**

- Sources: **950 → ~1,373** (+44%)
- Cases: **55 → ~90** (+64%)
- ComplianceArea union: **13 → 28** (+115%)
- LegalSourceType union: **8 → 20** (+150%)
- Jurisdictions covered: **45 → 52** (SG/ID/PH/SA/EG/AR/MX added)

---

## § 12 Decision Log

> Future-Claude appends to this section when making architectural choices during execution.

- **2026-05-26**: Decided to keep `space_resources` covered via existing `licensing` ComplianceArea + sub-tagging, rather than adding a 30th union value. Rationale: avoid taxonomy bloat; resource-mining is licensing-flavored.
- **2026-05-26**: Decided `bilateral_agreement` and `multilateral_agreement` are separate LegalSourceTypes (not subsumed under `international_treaty`). Rationale: Artemis Accords is a non-binding political commitment whose taxonomy needs to NOT be conflated with hard-law treaties like OST 1967.
- **2026-05-26**: Decided to NOT add a `space_resources` ComplianceArea. Reuse `licensing` + `liability`. Otherwise we'd need a 30th area + drift-test updates.

---

## § 13 Out-of-Scope (Explicitly Deferred)

These were considered but rejected for this expansion cycle:

- ⏸️ **Per-article granularity for every national space law** — current corpus is at "source-level" (e.g., DE-WeltraumG), not article-level (e.g., DE-WeltraumG-§5). Article-level expansion is its own sprint.
- ⏸️ **OCR ingestion of scanned PDF treaties** — needs T1.C.19 Tesseract.js integration, currently 🔴.
- ⏸️ **Real-time EUR-Lex polling for non-space-tagged sources** — broaden the atlas-source-check cron to sweep additional sources. Currently scoped to declared sources.
- ⏸️ **Auto-translation of national-language sources** — non-EN sources currently rely on title_en + body_en summaries authored by humans. Auto-translation is a separate engine concern.
- ⏸️ **Embedding rebuild on every commit** — too expensive. We rebuild per-batch.

---

## § 14 Master Plan Linkage

This document is **adjacent to** `docs/ATLAS-V3-MASTER-PLAN.md`. Linkage rules:

- When § 4 lands → update master plan T0.6 status (schema cleanup adjacent).
- When § 5.A (CN) lands → cross-link from master plan's "Current focus" line.
- When § 9 (Cases) lands → master plan T0.3 stats update.
- The atlas-source-check cron (T1.B.12 🟢) auto-detects content changes for any new URL we register.

The master plan stays the authoritative status snapshot for **code-side** Atlas work (tools, runtime, tests). This document is the authoritative status snapshot for **content-side** corpus work.

---

**END OF LIVING DOCUMENT v1.0**

> Next-Claude: jump to § 2, find the current focus, open the relevant § for the next-pending item, execute, update § 2, commit, repeat. Hard constraint: zero new external costs (§ 3).
