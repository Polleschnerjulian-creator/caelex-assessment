# Caelex Trade — Exhaustive Export Control Research & Implementation Blueprint

**For a B2B SaaS Compliance Product Specialized for the European Space Industry**
_Research cut-off: May 2026_

## TL;DR

- **Build EU-first, but US-aware.** The primary control surface for a European space-industry SaaS is the EU Dual-Use Regulation **(EU) 2021/821** (Annex I, II, IV) plus the German **Außenwirtschaftsverordnung (AWV)** national Abschnitt B (9xx/19xx series), but the largest hidden compliance risk for European operators is the **US re-export web** — EAR de minimis, the Foreign Direct Product Rule, and residual ITAR Category XV controls on certain spacecraft and rad-hard microelectronics. A space-specialised product that does not model both regimes simultaneously is structurally incomplete.
- **The genuine software differentiation is in the ontology, not the screening.** Restricted-party screening is a commodity (Descartes, AEB, SAP GTS, OpenSanctions, the free US CSL API). The unsolved problem is a **machine-readable, cross-walked control list ontology** that links USML XV → ECCN 9x515/9A004 → EU Annex I Category 9 → German Ausfuhrliste Teil I B (e.g., 9A902-class) → MTCR Annex Item 19 → Wassenaar dual-use number, with technical parameters (aperture in metres, range in km, payload in kg, rad-hardness thresholds, GSD, optical bandwidth) as queryable attributes. No incumbent does this for space.
- **First product wedge: AI-assisted classification + space-aware catch-all reasoning + Annex IV/MEU/Entity-List screening, integrated with BAFA ELAN-K2.** That is the smallest defensible MVP. Layer Sammelgenehmigung (SAG) management and the EU 2019/1318 seven-element ICP documentation engine on top.

## Key Findings

### 1. Regulatory perimeter is unusually complex for space

A European space supplier exporting a momentum wheel, an electric propulsion thruster, a star tracker, or a SAR sensor must simultaneously evaluate: (a) EU Annex I (mostly Category 9, plus Cat 3/5/6/7 components); (b) German Ausfuhrliste Teil I A (military / Rüstungsgüter — "Liste für Waffen, Munition und Rüstungsmaterial" per § 8(1) Nr. 1 AWV) and Teil I B (national dual-use, 9xx and now 19xx numbers, per § 8(1) Nr. 2 AWV); (c) EU Annex IV (intra-EU transfer licence — covers MTCR-derived items including most launcher technology and some spacecraft); (d) MTCR Annex Category I (complete launchers + major subsystems ≥ 300 km / 500 kg, "strong presumption of denial") and Category II (case-by-case); (e) US EAR (9A004, 9A515.a/b/d/g/w/x/y, 9D515, 9E515, 9C515) for any item that touches US-origin content, US technology, or a US-direct-product fabrication chain; (f) residual USML Category XV(a)/(e) for high-end spacecraft (high-resolution remote sensing < 0.50 m aperture; rad-hard ICs meeting all five XV(e) criteria; anti-jam GPS; military spacecraft); (g) EU sanctions (Russia Reg. 833/2014 Annex VII/XI/XX, Annex IV listed entities incl. Roscosmos affiliates), OFAC SDN + 50 % Rule, BIS Entity / Unverified / MEU Lists, UK OFSI, UN.

### 2. The control list ontology is logically uniform but practically fragmented

- **ECCN structure (15 CFR Part 774):** five-character `[Category 0-9][Group A-E][3-digit reason+entry]`, e.g., `9A515.a.1`. Category 9 = "Aerospace & Propulsion"; A = end-items/components, B = test/inspection/production equipment, C = materials, D = software, E = technology. The "500-series" (`9x515`, `9x004`, etc.) marks items moved from USML to CCL; "600-series" (`9x610`) marks military items moved from USML still subject to NS1/RS1 controls. The `.y` paragraphs are de-controlled less-sensitive parts. ECCNs map to Reasons for Control (NS, MT, RS, AT, NP, CC, etc.) and via the Commerce Country Chart (Supp. No. 1 to Part 738) to a licence decision per destination.
- **EU Annex I structure (Reg. 2021/821):** identical first three characters `[Cat 0-9][A-E][digit]…` — e.g., `9A001` (aero gas turbine engines), `9A004` (space launch vehicles, ISS items). `9A515` does **not exist in EU** (it is US-only). The first digit of the three-digit suffix encodes the source regime: `0xx` = Wassenaar, `1xx` = MTCR, `2xx` = NSG, `3xx` = Australia Group, `4xx` = CWC, `5xx` = Wassenaar-ML. Same last two digits across regimes signal analogous items. The 10 categories are 0 Nuclear, 1 Special Materials, 2 Materials Processing, 3 Electronics, 4 Computers, 5 (Pt 1) Telecoms + (Pt 2) Information Security, 6 Sensors and Lasers, 7 Navigation and Avionics, 8 Marine, 9 Aerospace and Propulsion.
- **German national appendix (Ausfuhrliste Anlage AL zur AWV):** Teil I Abschnitt A = arms/munitions/military (national list, 0001–0023-style numbering used for Kriegswaffen and conventional military goods); Abschnitt B = national dual-use using the same `[Cat][A-E]` prefix but with a `9xx` (901–999) suffix flagging national-only control, e.g., `5A902` (telecom/IuK lawful-interception monitoring centres for non-EU destinations), `6A908` (radar-based navigation/surveillance for ships and aircraft destined for Iran), `2B909` (flow-forming machines, used inter alia for missile/launcher casing manufacture). Since the **21. Verordnung zur Änderung der AWV (23 July 2024)**, Germany added six-digit `19xx`-suffix positions for emerging tech, e.g., **`4A1906` quantum computers**, plus entries for parametric signal amplifiers and cryogenic systems — these have largely now been folded into EU Annex I in the **Delegated Regulation (EU) 2025/2003 of 8 Sept 2025**, in force **15 November 2025**, but the AWV national positions remain authoritative for German exporters until aligned. **Abschnitt C was deleted** in the AWV recast; current AWV Teil I = A + B only. Teil II covers vegetable-origin restricted goods (irrelevant for space).
- **Correlation:** BAFA publishes an _Umschlüsselungsverzeichnis_ mapping CN customs codes (Warenverzeichnis für die Außenhandelsstatistik) to Ausfuhrlisten- and Anhang-I-Nummern. It is non-binding, regularly updated, and the closest thing to an official correlation table. There is no official ECCN↔Annex I cross-walk; commercial vendors (Descartes CustomsInfo, AEB) maintain proprietary mappings.

### 3. Licensing architecture: which licence for which export

- **EU General Export Authorisations (EUGEA), Annex II of (EU) 2021/821:**
  - EU001 — exports of most Annex I items to AU, CA, IS, JP, NZ, NO, CH/LI, UK, US (excludes the items in Annex II Section I).
  - EU002 — specific dual-use to a closed country list (AR, ZA, KR, TR) for a defined item subset (mostly Cat 1, 2, 3 components).
  - EU003 — export after repair/replacement.
  - EU004 — temporary export for exhibitions/fairs.
  - EU005 — telecoms equipment to a limited destination set.
  - EU006 — chemicals.
  - EU007 (Annex IIG) — **intra-group export of software and technology** to most destinations; conditions: parent and ultimate controller resident in EU or EU001 country (AU/CA/IS/JP/NZ/NO/CH/LI/UK/US); exporter must have a documented ICP; pre-registration with the competent authority; annual reporting.
  - EU008 (Annex IIH) — **encryption items** to all destinations except those in Part 2; not usable if the item is approved by an MS to handle classified info.
- **National general authorisations (AGG) — Germany:** BAFA issues a numbered series (e.g., AGG 12 EU001-equivalent items, AGG 17 telecoms components, AGG 27 low-value, AGG 30 software updates, AGG 33 hi-tech low-risk components, with the package effective **1 February 2026** adding **AGG 45, 46, 47** under BAFA's "Maßnahmenpaket zur Beschleunigung und Vereinfachung"). All are managed via ELAN-K2 (registration → reporting form M1 → annual reporting via the XML schema published by BAFA).
- **Sammelgenehmigung (SAG, "global licence")** and **Einzelgenehmigung (single licence, EAG)** are the two case-by-case forms; **Höchstbetragsgenehmigung** is the value-capped variant. The 2021 recast added the **Large Project Authorisation (LPA)** under Art. 12(1)(d).
- **Processing time, Germany:** BAFA processes applications FIFO, with discretionary urgency. Per GVW Rechtsanwälte citing BAFA statistics (Jan 2024 blog), the **average Einzelgenehmigung processing time for Rüstungsgüter rose from 36 working days in 2021 to 52 in 2022 and "liegt inzwischen bereits bei 83 (!) Arbeitstagen"** — a tripling. BAFA's own 4th Maßnahmenpaket press release (2024) subsequently reported a roughly 50 % reduction in dual-use autonomous-decision processing times by autumn 2024. Dual-use is typically faster than Rüstungsgüter but follows the same trajectory. Sammelgenehmigungen, once granted, allow per-shipment immediate export — they amortise the single long wait but require a documented ICP and BAFA on-site reliability check (Zuverlässigkeitsprüfung).
- **Nullbescheid:** binding negative ruling that no licence is required. **Auskunft zur Güterliste (AzG)** = binding classification ruling. Both are filed via **ELAN-K2** — the BAFA's online portal; ELAN-K2 also offers an XML interface (XSD-based) for ERP/SAP-GTS integration and for AGG annual reporting.

### 4. The German catch-all is substantively broader than people realise

- **§ 8(1) Nr. 2 AWV:** licence required for any good in Teil I Abschnitt B of the Ausfuhrliste. (Hardware ≤ €5,000 contract value exempt under § 8(3) AWV; **software and technology are never exempt** regardless of value.)
- **§ 9(1) AWV — nuclear end-use catch-all on non-listed items** to nine countries (Algeria, Iraq, Iran, Israel, Jordan, Libya, North Korea, Pakistan, Syria) where BAFA notifies the exporter or the exporter has positive knowledge of an intended nuclear-related end-use under Annex I Category 0.
- **German interpretation of military end-use (Art. 4(1)(b) EU 2021/821):** Germany defines "military end-use" by reference to **Teil I Abschnitt A** — incorporation into any Abschnitt A item, use of manufacturing/test/analysis equipment for development/production/maintenance of an Abschnitt A item, or use of unfinished products at a production facility for Abschnitt A items. This is a markedly broader operational reading than the bare EU text and traps many supposedly "civilian" space subcomponents whose end-use is a launcher or military satellite.

### 5. The US re-export hook is the existential risk for European space

- **De minimis (15 CFR § 734.4):**
  - 25 % to most countries — foreign-made item subject to EAR if US-controlled content > 25 %.
  - 10 % to E:1/E:2 (Cuba, Iran, North Korea, Syria).
  - **0 % de minimis (no de minimis) for 9×515 and 600-series items when destined to D:5 (US arms embargoes — includes China, Russia, Belarus) or E:1/E:2.** For `.y` paragraphs of 9x515/600-series specifically, 0 % de minimis extends to Belarus, PRC, and Russia.
  - **0 % de minimis for ECCN 9E003.a.1–a.6, .a.8, .h, .i, .l** (gas-turbine/rocket-engine "technology") — broadly relevant to launcher and propulsion suppliers.
- **Foreign Direct Product Rule (FDPR, § 734.9):** nine separate scenarios. A foreign-made article is "subject to the EAR" if it is the direct product of US-origin technology/software in scope, or is made by a plant that is itself the direct product of such tech. The space-relevant flavours are the Entity-List FDP, the Russia/Belarus FDP, and the Advanced Computing/Semiconductor SME FDP. Implication: a European satellite or propulsion module made on US-designed tooling can be "subject to the EAR" even with 0 % US content.
- **ITAR (22 CFR Parts 120–130):** USML Category XV(a)–(f) still controls (i) anti-jam GPS/PNT spacecraft, (ii) high-resolution remote sensing spacecraft with apertures < 0.50 m (per the 2017 Final Rule), (iii) spacecraft with non-Earth-imaging > 0.50 m apertures meeting performance thresholds, (iv) rad-hard microelectronics meeting all five XV(e) criteria including a single-event-upset rate ≤ 1×10⁻¹⁰ errors/bit-day for CREME96 GEO Solar-Minimum, (v) certain SLV components and rocket engines (cross-referenced from Cat IV). The "see-through rule" means **any ITAR-controlled component carries the host article into ITAR with no de minimis**. October 2024 DDTC/BIS proposed rules (open consultations through Nov 2024) propose further liberalisations (e.g., License Exception **CSA — Commercial Space Activities**, removal of worldwide-licence requirement for AU/CA/UK on 9A515.a.1–a.4 and 9A515.g) but final rules were not yet effective at our research date.
- **Historical precedent (the reason European primes ban ITAR content):** the 1996 Intelsat 708 / Long March 3B failure investigation. Loral paid \\$20 million in 2002, Hughes (then owned by Boeing) paid \\$32 million in 2003, in DDTC settlements. Congress's response — the 1999 NDAA — moved all commercial satellites to USML and triggered roughly 15 years of European "ITAR-free" satellite marketing pressure. Even after the 2014–2017 Export Control Reform moved commercial comsats back to the CCL, European primes still tag spec sheets "ITAR-free" because the residual XV(a)/(e) controls and the see-through rule are commercially toxic.

### 6. The multilateral regimes drive nearly all EU Annex I content

- **Wassenaar Arrangement (42 participating states incl. all EU MS):** conventional + dual-use list, the basis for `0xx`/`5xx` reasons-for-control in Annex I.
- **MTCR (35 partner states):** the controlling regime for **almost everything launcher- or propulsion-related**. Category I = complete rocket systems (ballistic, SLV, sounding rockets), UAV systems, and major subsystems (stages, engines, RVs, guidance, warhead mechanisms) capable of ≥ 300 km / ≥ 500 kg — "strong presumption of denial"; transfer of Cat I **production facilities is flatly prohibited**. Category II = the rest of the Annex (propellants, structural materials, test equipment, flight instruments, ground support, certain other rocket systems ≥ 300 km regardless of payload) — case-by-case. The MTCR Annex maps into Annex I via the `1xx` reason-for-control suffix (e.g., 9A104, 9A106, 9A107).
- **NSG (`2xx` suffix), Australia Group (`3xx` chem/bio), CWC (`4xx`):** less relevant to a pure space SaaS but still part of the ontology.

### 7. EU & US sanctions screening — surface area and frequency

- **EU FSF (Financial Sanctions Files):** the consolidated CFSP asset-freeze list maintained by EC DG FISMA, in XML at `https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content` (token-based, free registration). Important caveat per OpenSanctions: the FSF is republished by DG FISMA after the Council adopts measures in the OJEU; there can be a delay of up to **21 days** between OJEU publication and FSF update — for high-velocity compliance, parsing the OJEU directly is required.
- **US Consolidated Screening List (CSL):** trade.gov API; consolidates 11 lists from Commerce (Entity List, Denied Persons, Unverified, MEU), State (DDTC AECA Debarred, Nonproliferation Sanctions), and Treasury (SDN, FSE, SSI, PLC, NS-PLC). Updated daily 05:00 EST. Free CSL API with fuzzy-matching scoring. SDN-specific endpoints and the OFAC sanctions list search separately.
- **OFAC 50 Percent Rule (and 2026 sham-transaction guidance):** any entity owned ≥ 50 % in the aggregate by SDNs is itself blocked, even if not listed. Required: beneficial-ownership tracing, not just name matching. As of 31 March 2026, OFAC's "Sham Transactions and Sanctions Evasion" guidance extended this in practice to **control-in-fact** scenarios — formal ownership below 50 % can still trigger enforcement when control or pattern-of-dealings is demonstrable. **GVA Capital Ltd.** (a San Francisco-based VC registered in the Cayman Islands) received a **\\$215,988,868 OFAC civil penalty notice on 12 June 2025** — the statutory maximum, imposed after no settlement was reached — for willfully managing investments on behalf of sanctioned Russian oligarch Suleiman Kerimov through Prosperity Investments LP (a Guernsey proxy).
- **Russia/Belarus complexity (Reg. (EU) 833/2014 and Reg. 765/2006):** the regime now bans, with limited derogations, all dual-use items (Annex I 2021/821) and Annex VII "advanced technology" items to Russia and Belarus, regardless of civilian intent (Art. 2, 2a). Article 2b applies the same prohibition to listed end-users in **Annex IV** — which is critical because Annex IV now lists entities in China, India, Kazakhstan, Serbia, Singapore, Turkey, the UAE and other third countries, including Russian-linked space and aerospace organisations:
  - **JSC Central Research Institute of Machine Building (TsNIIMash)** — Roscosmos's principal R&D centre and operator of the Russian Mission Control Centre.
  - **JSC Rocket and Space Centre – Progress** — manufacturer of Soyuz launch vehicles and Earth-observation satellites.
  - **Zhukovsky Central Aerohydrodynamics Institute (TsAGI)** (Council Decision (CFSP) 2024/746 entry 241).
  - **Polyus Research Institute of M. F. Stelmakh JSC** (space optics/lasers), **Almaz-Antey**, **Rostec**, **JSC Beriev**, **CIAM/Baranov engines**.
    Annex IV is therefore an **enhanced end-user screening layer** that must be applied on top of Annex I to Reg. 269/2014 (asset freeze) and the standard EU FSF. **Council Regulation (EU) 2026/506** (adopted 23 April 2026, entry into force 24 April 2026) added exactly **60 entities to Annex IV — 32 Russian and 28 in third countries** (China incl. Hong Kong, Türkiye, UAE, Thailand), indirectly involved in supplying CNC, microelectronics, UAV components, maritime equipment.
- **EU's "common high priority items" list (Annex XL to Reg. 833/2014):** items the EU/G7 deems particularly sought after by Russia for its defence sector — triggers Article 12gb compliance-programme obligations for any EU operator dealing in these items. The 16th package extended these obligations to Annex XLVIII (switch devices, certain piston engine generating sets) effective 26 May 2025. The 20th package (Reg. 2026/506) further expanded Annex VII and Annex XXIII.

### 8. The competitive software landscape leaves a clear space-specialised gap

- **SAP GTS (Global Trade Services) / GTS Edition for SAP HANA:** the heavyweight in-ERP option. Strengths — deep SAP integration, customs (ATLAS for DE), preference management, classification, screening, licence management. Weaknesses — heavy, license-cost-prohibitive for SMEs, generic regulatory content (companies usually subscribe to Descartes MK Data / AEB content layered on top), slow to absorb space-specific nuances.
- **Descartes Visual Compliance / MK Data:** Descartes closed the acquisition of Visual Compliance / eCustoms on **13 February 2019 for approximately USD \\$250 million** (CAD \\$330 million). It is now the leading screening + classification data provider. Pricing: a few thousand USD/year basic SaaS to >\\$100k enterprise. Per Descartes' own acquisition announcement, the business serves **over 2,000 customers with over 67,500 subscribers operating in over 100 countries**. Powers SAP GTS and Oracle GTM content. Strong: denied-party screening with fuzzy match, OFAC-50 ownership trace, embargoed-country flags. Weak: no native space-domain classification reasoning.
- **AEB SE:** German market leader for cloud-native trade compliance + classification + screening. Strong DACH presence, native integration with BAFA ELAN-K2 reporting, strong dual-use list content. Weak: not space-domain specialised; UI shows its age in places.
- **Oracle Global Trade Management (GTM):** competitive with SAP GTS, more cloud-native; smaller installed base for DACH.
- **Thomson Reuters ONESOURCE Global Trade, OCR Services (Global Trade and Export Compliance Cloud), e2open / Amber Road, Bureau van Dijk (now Moody's Orbis for ownership data), LexisNexis screening, Enhanced/Tradesphere (acquired by Descartes), Global Wizard, ExportNow:** all serve large/mid enterprises with generic GTM functionality; none claim space-sector specialisation.
- **OpenSanctions:** free non-commercial / paid commercial API for the consolidated global sanctions universe (EU FSF, OFAC, UK OFSI, UN, EU Journal-tracked pre-FSF list, plus national lists). Reference data layer; not a workflow product.

**The opening for Caelex Trade:** none of these vendors model space-domain classification (USML XV ↔ ECCN 9x515 ↔ Annex I Cat 9 ↔ MTCR Annex Item 19 ↔ AL 9A902-class) as a first-class object with technical-parameter queryability. None offer an AI/LLM classification assistant trained on space-domain product specs (thruster Isp, antenna gain, GSD/aperture, rad-hard SEU rate, propulsion delta-V). None integrate native Sammelgenehmigung lifecycle for German operators + the EU 2019/1318 ICP seven-element documentation engine in one package targeted at the agile NewSpace operator that finds SAP GTS overkill and Descartes Visual Compliance generic.

## Details

### 1. EU / German regime — software-relevant detail

**Regulation (EU) 2021/821 articles to encode as workflow predicates:**

- **Art. 3** — listed-item export licence requirement.
- **Art. 4** — non-listed catch-all: WMD end-use (4(1)(a)), military end-use to arms-embargoed destinations (4(1)(b)), use as parts of illicitly exported military items (4(1)(c)). Triggered by competent-authority notification or exporter awareness.
- **Art. 5** — non-listed cyber-surveillance items catch-all (broader, can be triggered by serious-human-rights-violations risk).
- **Arts. 9 & 10** — brokering and technical-assistance controls.
- **Art. 11** — Annex IV intra-EU transfer licence.
- **Art. 12** — authorisation types (individual, global, EUGEA, NGEA, **large-project authorisation**).
- **Art. 17** — Commission delegated acts for Annex I updates (annual). Most recent: **Delegated Regulation (EU) 2025/2003 of 8 Sept 2025**, published 14 Nov 2025 in OJ L 251/1, **in force 15 November 2025**. The 2025 update specifically revised the definition of "spacecraft" and added new global definitions for "satellite", "space probe" and "space vehicle"; expanded controls in Cat 9 for additive manufacturing materials for turbopumps, heat exchangers and lightweight structures for satellites and launchers; added new entries for parametric signal amplifiers and cryogenic systems (formerly only national in DE).
- **Art. 26 / Art. 27** — ICP recommended (mandatory for EU007 and similar where ICP is a precondition).
- **Annex IV Part 1 (intra-EU transfer with NGEA) vs Part 2 (intra-EU transfer requires individual licence):** Part 2 includes stealth tech, cryptanalytic tools, most nuclear-related items, items related to missiles and chemical warfare — and these are precisely the items that recur in launcher and military-satellite programs.

**Internal Compliance Programme — seven core elements per Commission Recommendation (EU) 2019/1318, 30 July 2019:**

1. Top-level management commitment to compliance.
2. Organisation structure, responsibilities, resources (including the **Ausfuhrverantwortlicher / CECO** — Chief Export Control Officer, who in Germany must be a member of senior management for companies applying for EAGs).
3. Training and awareness.
4. Transaction screening process and procedures.
5. Performance review, audits, reporting, corrective actions.
6. Recordkeeping and documentation.
7. Physical and information security.

The Recommendation's Annex I "helpful questions" maps almost 1:1 to BAFA's own ICP merkblatt — which can therefore be operationalised as a software questionnaire. BAFA's "Merkblatt zu Internal Compliance Programmes (ICP) — firmeninterne Exportkontrolle" published in German (and English) is the binding national reference; the 2024 BAFA _Bekanntmachung_ on end-use certificates (replacing the 1 August 2017 Allgemeinverfügung) tightens the required Anlage C 1 / C 2 / C 4 / C 6 / C 7 formats — software must template these.

**Recordkeeping:** Reg. 2021/821 Art. 27(3) requires retention for **at least 5 years** from the end of the calendar year of the export, of detailed records sufficient to identify item, description, quantities, name and address of exporter and consignee, and, where known, end-user and end-use. German law (§ 22 AWG) requires the same for AWV-licensed exports.

### 2. US regime — software-relevant detail

**License Exceptions for space-related transactions** (15 CFR § 740, with carve-outs):

- **STA** (Strategic Trade Authorization, § 740.20) — usable for many 9x515 items to Cooperating Country Group A:5/A:6.
- **GOV** (§ 740.11) — government and ISS exemption; the BIS interim final rule of 23 Oct 2024 codified that Space Act Agreements between NASA and foreign partners may be a basis for GOV.
- **CSA (proposed)** — new Commercial Space Activities exception for official space-agency programmes (Lunar Gateway, Mars Sample Return, Nancy Grace Roman Telescope, Orion, Commercial LEO Development, Habitable Worlds Observatory) and certain space-tourism/research activities; FAA-approved destination required; proposed Oct 2024, comments through 22 Nov 2024.
- **AU / CA / UK worldwide-licence removal:** since the 2024 BIS Final Rule, 9A515.a.1–a.4 (incl. remote-sensing satellites in the 0.35–0.50 m aperture band, SWIR/MWIR/LWIR remote-sensing spacecraft, radar-remote-sensing spacecraft, and on-orbit servicing spacecraft) and 9A515.g and 9E515.f no longer require a licence for export to AU/CA/UK.

**ITAR Category XV scope (post 2017 Final Rule, refined in proposed 2024 rules):**

- XV(a) — spacecraft listed in (a)(1)–(a)(13) including those with onboard real-time autonomous detection and identification, anti-jam PNT, space-based logistics/assembly/servicing in some subparas.
- XV(b) — ground control systems and training simulators specially designed for telemetry/tracking/control of XV(a) spacecraft.
- XV(d) — radiation-hardened microelectronic ICs meeting **all five** characteristics (incl. SEU ≤ 1×10⁻¹⁰ errors/bit-day for CREME96 GEO Solar-Minimum; latch-up free and dose-rate latch-up threshold ≥ 5×10⁸ Rads(Si)). Items not meeting all five drop to ECCN 9A515.d.
- XV(e) — sub-meter aperture remote sensing satellites, certain payloads.
- XV(f) — defence-services-controlled software/commands that control a spacecraft.
- XV(g) — non-nuclear warheads.
- (x) "paragraph X" — ITAR licensing for EAR-controlled commodities, software and technical data integrated into a XV(a)–(g) end-item.

**Deemed export:** transfer of controlled technical data (or source code) to a foreign national inside the US (or, by analogy, an EU R&D team with mixed-nationality engineers receiving US-origin technology) requires the same licence as an export to that national's country. Materially relevant for multinational space R&D where US-origin design data circulates inside EU teams.

### 3. Space-industry mapping (cross-walk, to be machine-encoded)

| Article                                                      | USML / ITAR                             | EAR / CCL                                       | EU Annex I                                          | DE AL Teil I B | MTCR Annex                 |
| ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | -------------- | -------------------------- |
| Commercial comsat (no anti-jam, civil)                       | —                                       | 9A515.a                                         | 9A004 / 9A515-equivalent text via national readings | n/a (mostly)   | Cat II                     |
| Spy / military / anti-jam comsat                             | XV(a)                                   | (in ITAR)                                       | n/a (ITAR)                                          | n/a            | Cat II / I if payload mass |
| EO satellite 0.35–0.50 m aperture (PAN)                      | —                                       | 9A515.a.1                                       | 9A004 family / 9A001-related                        | —              | Cat II                     |
| EO satellite < 0.35 m aperture                               | XV(a)(7)/(e)                            | (ITAR)                                          | n/a (ITAR)                                          | n/a            | Cat II                     |
| SAR remote sensing satellite                                 | XV(a) for high-res; 9A515.a.3 otherwise | 9A515.a.3                                       | 9A001 / 9A004                                       | —              | Cat II                     |
| Star tracker, fine sun sensor                                | parts in XV(e); else                    | 9A515.x or 7A004                                | 7A004 / 9A004                                       | —              | Cat II                     |
| Reaction wheel / momentum wheel                              | XV(e)(20) / (h) parts                   | 9A515.x                                         | 9A004.f / 9A005                                     | —              | Item 9 / Cat II            |
| Electric propulsion / Hall / ion thruster                    | XV(e)(12) for some types                | 9A515.x / 9A004                                 | 9A004 / 9A001                                       | —              | Item 2 / Cat II            |
| Solid / liquid rocket motor (capable of ≥ 300 km / ≥ 500 kg) | IV(d)(2)                                | (ITAR)                                          | 9A005 / 9A007 / 9A105 / 9A106                       | —              | Cat I                      |
| Sub-MTCR-threshold rocket motor                              | IV(d)(7)                                | 9A610 or 9A604.b                                | 9A007 family                                        | —              | Cat II                     |
| Rad-hard IC meeting all 5 XV(d) criteria                     | XV(d)                                   | (ITAR)                                          | n/a                                                 | —              | Item 18                    |
| Rad-hard IC not meeting all 5                                | —                                       | 9A515.d                                         | 3A001.a (rad-hard sub-controls)                     | —              | Item 18                    |
| Ground station (TT&C)                                        | XV(b) where for XV(a)                   | 9A515.b                                         | 5A101 / 5A001 telecoms                              | —              | Item 12                    |
| GNSS jamming-resistant receiver                              | XII (Fire Control / formerly XV(c))     | 7A005 / 7A105                                   | 7A005 / 7A105                                       | —              | Item 11                    |
| EO data (raw mission output)                                 | not technical data unless classified    | technical data 9E515.f if applicable            | technology controls 9E101 etc                       | —              | n/a                        |
| Launcher launcher / SLV                                      | IV(a)                                   | (ITAR)                                          | 9A004.a / 9A005 / 9A104                             | —              | Cat I                      |
| Launcher integration / launch failure analysis services      | IV(i)                                   | defence service if technical data on US article | technical assistance Art. 8                         | —              | Cat I services             |

### 4. Compliance workflows to encode in software

**4.1 Item classification (ECCN/AL/Annex I) decision logic:**

1. **Jurisdiction first.** Is the item ITAR (USML)? Apply the Order of Review: any specific enumeration in USML > any "specially designed" hook to a USML article > otherwise CCL. EU equivalent: any explicit Annex I parametric match. Software must walk Cat 0→9, Group A→E, in order, against item technical parameters (the AI-classification opportunity).
2. **Parametric matching.** Each ECCN/Annex I entry should be modelled as a predicate over typed attributes: `aperture_m`, `range_km`, `payload_kg`, `seu_rate`, `frequency_band`, `transmit_power_w`, `Isp_s`, `delta_v_m_s`, `gsd_m`, `rad_hard_TID_krad`, etc. A classification engine matches `product.attributes` against `entry.predicates` and returns a ranked candidate list with confidence.
3. **Specially-designed test.** Run the "catch-and-release" five-step `specially designed` definition (15 CFR 772.1) — software encodes this as a decision tree, particularly important for 9A515.x parts/components.
4. **Output.** Return ECCN + EU Annex I + DE AL number + MTCR Annex item number + Wassenaar number + sanctions hot-spots (e.g., Annex VII listed?, Annex XL listed?). Save with provenance (which predicate triggered, with technical-spec evidence trail) for the audit log.

**4.2 Licence determination:**

- Inputs: item classification, destination, end-user, end-use, intermediary, exporter, value, intra-EU vs export.
- Decision: required? → which licence type (EUGEA EU001/EU007/EU008 / NGEA / AGG / SAG / EAG / LPA / no licence under exception)? → conditions and reporting obligations.
- This is a constraint-solver problem. For each candidate authorisation, evaluate eligibility predicates (destination ∈ allowed-set, item ∈ scope, end-use ∉ excluded, exporter has registered/has ICP, prior-notification deadline) and pick the least-burdensome valid path.

**4.3 Catch-all reasoning:**

- For each non-listed item, scan against: EU Art. 4(1)(a) WMD, Art. 4(1)(b) military end-use to embargoed destination, Art. 5 cyber-surveillance, § 9(1) AWV nuclear catch-all to nine specified countries, § 9 AWV other catch-alls, Reg. 833/2014 Art. 2(1)/2a/2b for Russia/Belarus end-use.
- Surface "red flags" (BAFA's notion): destination, end-user opacity, payment routing, unusual freight forwarding patterns, technical-spec inconsistency.

**4.4 Restricted-party screening:**

- Lists to integrate: EU FSF (XML, ~daily, with OJEU delta watcher), Reg. 833/2014 Annex IV (enhanced end-user controls), Reg. 765/2006 Annex (Belarus), OFAC SDN + Non-SDN sectoral lists + 50 % Rule with beneficial-ownership trace, BIS Entity List / Unverified / MEU / Denied Persons, DDTC AECA Debarred List, UN Consolidated, UK OFSI Consolidated, JP/CA/AU/CH national lists.
- Match algorithm: fuzzy (Jaro–Winkler / Levenshtein), transliteration-aware (Cyrillic ↔ Latin, especially for Russia/Belarus), name + DOB + nationality + ID number multi-field scoring, alias / vessel / IMO / aircraft tail-number index.
- 50 % Rule: requires beneficial-ownership data (Orbis / OpenSanctions / GLEIF LEI / commercial UBO data) — this is an integration, not an in-house build.
- False-positive handling: case management, "cleared with reason" disposition, sign-off workflow, audit trail per OFAC and BIS guidance.

**4.5 Transaction screening / document generation:**

- Hook into the order-management or ERP system pre-shipment.
- Generate: export declaration (ATLAS for DE), end-use certificate (Anlage C 1 / C 2 / C 4 / C 6 / C 7 per BAFA), end-user statement / re-export undertaking, customer screening certificate, classification rationale memo, sanctions screening memo, ICP-element traceability log.

**4.6 Recordkeeping:**

- 5 years (EU 2021/821 Art. 27(3); § 22 AWG); 5 years (ITAR § 122.5); permanent retention recommended for classification rulings, AzG, Nullbescheide, SAG documentation.

### 5. Data structures & ontology — concrete spec

**5.1 Core entity `ControlListEntry`:**

```
{
  "id": "ECCN:9A515.a.1",
  "regime": "EAR-CCL",
  "category": "9",
  "product_group": "A",
  "entry_number": "515",
  "subpara": "a.1",
  "title": "Spacecraft with electro-optical remote sensing capabilities ...",
  "predicates": [
    {"attribute": "aperture_m", "op": "between", "value": [0.35, 0.50]},
    {"attribute": "spacecraft_class", "op": "==", "value": "remote_sensing"}
  ],
  "reasons_for_control": ["NS:2", "RS:2", "AT:1"],
  "country_chart_columns": ["NS-2", "RS-2", "AT-1"],
  "license_exceptions": ["STA-eligible:partial", "GOV"],
  "see_also": [
    {"regime": "ITAR-USML", "id": "XV(a)(7)", "relationship": "predecessor"},
    {"regime": "EU-Annex-I", "id": "9A004", "relationship": "analogous"},
    {"regime": "MTCR-Annex", "id": "Item 19", "relationship": "source"}
  ],
  "valid_from": "2017-01-15", "valid_to": null,
  "source_url": "https://www.bis.doc.gov/...",
  "amendments": [{"date": "2024-10-23", "regulation": "Federal Register 2024-23958"}]
}
```

**5.2 Concordance index `CrossWalk`:** maps technical-attribute fingerprints to all regime IDs that match. Built once, refreshed quarterly against authoritative sources. Stored as a graph (Neo4j or equivalent) with `analogous_to` / `superset_of` / `subset_of` / `derived_from` relationships.

**5.3 Authoritative data feeds to integrate** (production-grade priority order):

1. **EUR-Lex SOAP / REST web service** for OJEU regulation pulls (CELEX-keyed). Required for both Annex I updates (Reg. 2021/821 delegated acts) and sanctions amendments (Reg. 833/2014 family).
2. **BAFA Güterlisten downloads** (PDF + the _Umschlüsselungsverzeichnis_ — CN → AL → Annex I mapping). PDF parsing required; BAFA does not publish a structured JSON/XML for the Ausfuhrliste. **BAFA ELAN-K2 XML interface (XSD)** for AGG/SAG annual reporting — there is a documented `Meldeschnittstelle` with an XSD; production must subscribe to BAFA's Changelog (last update 5 Feb 2026 at our research date).
3. **EU FSF XML** at `https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content` (token-required). Daily.
4. **OFAC SDN + Consolidated list** (multiple formats: XML, CSV, PDF) at treasury.gov.
5. **trade.gov CSL API** (free, fuzzy-match endpoint) for one-stop US screening.
6. **BIS Entity List / MEU / UVL / DPL** — published in 15 CFR Supp. No. 4 to Part 744, plus CSV downloads.
7. **DDTC AECA Debarred List** — pmddtc.state.gov.
8. **OpenSanctions** — non-EU/non-US national lists and OJEU pre-FSF watcher (paid commercial licence for SaaS use).
9. **HM Treasury OFSI Consolidated List** — UK.
10. **UN Security Council Consolidated List**.
11. **Multilateral regime documents** (MTCR Annex, Wassenaar List, NSG Trigger/Dual-Use Lists, Australia Group) — semi-structured PDFs; require manual + AI-assisted ingestion.
12. **HADDEX Online (Reguvis Fachmedien, on BAFA's commentary):** the German authoritative practitioner reference. ~14,130 pages across 6 volumes (Vol. 1 BAFA commentary on basic export-control principles, prohibitions/embargoes, licensing procedures, plus an overview of US export law; Vol. 2/1 Embargoes; Vol. 2/2 Counter-terrorism / sanctions lists; Vol. 3 Legal texts of EU and German export-control law plus item and country lists; Vol. 4 Federal government resolutions, circulars and BAFA publications). Available as HADDEX Online with same-day updates and the HADDEX-Schnelldienst e-mail alert. Subscription, not an open API — but the _content_ should be a competitive benchmark for what Caelex Trade explains in-product.
13. **Council Common Position 2008/944/CFSP** — common rules on export of military technology / common military list (non-binding harmonisation); national military lists (DE Teil I Abschnitt A) are independently adopted.

**5.4 AI/LLM-assisted classification — concrete approach:**

- Train (or fine-tune) on a corpus of: full Annex I, full CCL, full USML, all BAFA AzG public rulings (German `Auskunft zur Güterliste`), DDTC Commodity Jurisdiction (CJ) determinations, BIS Commodity Classifications (CCATS), Wassenaar/MTCR/NSG/AG list text, EU Russia/Belarus regulation annexes.
- At inference, ingest a product datasheet (PDF + image of spec table) → extract typed technical attributes → match against `ControlListEntry.predicates` → produce ranked candidates with confidence + rationale + provenance pointer to the matching regulatory clause.
- Always require human sign-off on the final classification (compliance officer in the loop); BAFA's Nullbescheid / AzG is the binding ruling — software produces a _defensible draft_, not a substitute.

### 6. Concrete BAFA classification artefact types to model

- **Auskunft zur Güterliste (AzG)** — binding classification opinion. Modelled as a workflow with ELAN-K2 submission, BAFA case ID, request payload (item description + datasheet + intended end-use), tracking + outcome (Listenposition or "nicht erfasst").
- **Nullbescheid** — negative ruling (no licence required). Same flow; outcome stored as durable evidence.
- **Voranfrage** — preliminary inquiry, non-binding.
- **Einzelgenehmigung (EAG)** — single-item licence for one consignee in one third country.
- **Sammelgenehmigung (SAG)** — global licence; multiple consignees / countries / items / time window; requires ICP + Zuverlässigkeitsprüfung.
- **Höchstbetragsgenehmigung** — value-capped variant.
- **Allgemeine Genehmigung (AGG)** — German national general; published, exporter registers and reports.
- **Large Project Authorisation (LPA)** — EU-level, Art. 12(1)(d) Reg. 2021/821.

### 7. Documentation engine (the ICP-as-software)

For each of the seven 2019/1318 elements, Caelex Trade should provide:

1. **Top-level management commitment** — template policy document, version-controlled, with named CEO/managing-director sign-off and date.
2. **Organisation** — named _Ausfuhrverantwortlicher_ (with management-board nexus), _Exportkontrollbeauftragter_ role, RACI matrix, escalation paths.
3. **Training** — completion register, micro-learning module library (catch-all reasoning, red flags, deemed exports, intangible transfers, Russia/Belarus specifics).
4. **Transaction screening** — automated; logs feed back into ICP evidence.
5. **Performance review / audit** — checklist generator aligned to BAFA's _Merkblatt_ ICP audit criteria (criterion 8).
6. **Recordkeeping** — 5-year retention, immutable audit log.
7. **Physical & information security** — controlled-technology marking, access controls on technical data, classified material handling guidance.

### 8. Why this is genuinely hard

- **Parameter granularity:** "specially designed" and parametric thresholds (0.35 m, 0.50 m apertures; SEU 1×10⁻¹⁰; range/payload 300 km/500 kg) are subtle — a 1 % spec change can flip jurisdiction.
- **Regime fragmentation under stress:** Russia's ongoing veto in Wassenaar means harmonisation is degrading. EU is increasingly using Art. 17 delegated regulations to bypass Wassenaar consensus (per the 2024 White Paper); the 2025 Annex I update includes items that Wassenaar did not adopt because of Russia's veto. National control lists (DE Teil I B 1900-series) are diverging.
- **Russia / Belarus sanctions are a moving target** with 3–4 major packages per year (16th in Feb 2025, 17th, 18th, 19th, 20th in April 2026), each adding annexes (Annex VII, XXIII, XL, XLVIII) and tightening derogations.
- **OFAC 50 % Rule + 2026 sham-transaction guidance** requires beneficial-ownership tracing into corporate structures with sometimes opaque registers.
- **Re-export traps:** a European company can be subject to the EAR via 0 % de minimis on 9x515 items to D:5 countries — software must catch this, not assume "we're an EU exporter so EAR doesn't apply."

## Recommendations

### Stage 1 (MVP — 0–6 months) — earn the right to be considered

1. **Build the cross-walked space-domain control list ontology** as machine-readable JSON/RDF, covering: USML XV(a)–(g), CCL 9A004 / 9A515.a–.y / 9B515 / 9C515 / 9D515 / 9E515 / 9A604 / 9A610 / 9A001 family, EU Annex I Cat 9 in full plus relevant Cat 3/5/6/7 sub-entries, DE AL Teil I A relevant entries + Teil I B (9xx and 19xx), MTCR Annex Items 1–20 with English text. Quarterly delta watcher against OJEU + BAFA + Federal Register.
2. **AI-assisted classification** trained on this ontology + a curated corpus of public BAFA AzG, DDTC CJ, BIS CCATS rulings for space items. Output ranked candidates with cited clauses.
3. **Sanctions screening** via free CSL API + EU FSF XML + OFAC + Reg. 833/2014 Annex IV + Reg. 765/2006 (Belarus) + UN + OFSI. Add the OFAC 50 % Rule via integration with OpenSanctions (commercial licence) or Moody's Orbis.
4. **ELAN-K2 integration** — at minimum produce a valid AGG/SAG XML report per BAFA's XSD. Long-term, full ELAN-K2 submission integration via the BAFA _Meldeschnittstelle_.
5. **ICP documentation engine** templated to the seven 2019/1318 elements.

### Stage 2 (6–18 months) — defensible product

1. **Catch-all reasoning engine** for § 8/§ 9 AWV, Art. 4/5 EU 2021/821, Art. 2/2a/2b Reg. 833/2014.
2. **Sammelgenehmigung lifecycle management** — application, BAFA correspondence, annual reporting, renewal.
3. **Bill-of-materials de minimis / FDP calculator** with US-origin content tracking integrated into ERP / PLM systems.
4. **End-use certificate templating** per the BAFA _Bekanntmachung_ Anlage C 1 / C 2 / C 4 / C 6 / C 7.
5. **Audit log + recordkeeping** to 5+ year retention with immutable storage.

### Stage 3 (18–36 months) — moat

1. **Space-domain "spec-to-ECCN" copilot** — drop in a datasheet, get a defensible classification draft.
2. **Multinational team deemed-export controls** with nationality-aware access management for technical data repositories.
3. **Customs filing integration (ATLAS DE, AES US)** and customs-export-control reconciliation.
4. **Predictive licence-time analytics** using BAFA processing data + historical case profiles.
5. **Cross-industry expansion** — defence electronics adjacent (3A611), UAV (9A012 / Cat VIII), to widen TAM.

### Benchmarks that would change the plan

- If a competitor (most likely AEB or Descartes) announces a "space module" — re-prioritise to deeper customs and ICP integration (where they have less depth) and double down on AI classification quality.
- If the EU concludes its proposed _EU export-control single market_ reforms (post-White Paper 2024) before 2027, opening pan-EU licence portability — pivot to multi-MS licence orchestration.
- If 9A515 fully migrates to license-free for EU member states (BIS rules trajectory through 2024–2026) — reduce US-side investment, deepen MTCR-and-residual-ITAR coverage.

### Data sources to integrate (priority-ordered, all primary)

1. **EUR-Lex** (OJEU CELEX feed) — `https://eur-lex.europa.eu/`. SOAP web service for delta tracking.
2. **BAFA Güterlisten + Umschlüsselungsverzeichnis** — `https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/`.
3. **BAFA ELAN-K2 Meldeschnittstelle (XSD + Changelog)** — `https://www.bafa.de/.../Antragsstellung/ELAN-K2/`.
4. **EU FSF XML** — `https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content`.
5. **trade.gov CSL API** — `https://api.trade.gov/.../consolidated-screening-list`. Free.
6. **BIS Entity / MEU / UVL / DPL CSVs** — `https://www.bis.doc.gov/`.
7. **OFAC SDN + Non-SDN consolidated** — `https://ofac.treasury.gov/`.
8. **DDTC AECA Debarred + Statutorily Debarred** — `https://www.pmddtc.state.gov/`.
9. **eCFR** — `https://www.ecfr.gov/` for 15 CFR Parts 730–774 (EAR), 22 CFR Parts 120–130 (ITAR).
10. **Federal Register** — `https://www.federalregister.gov/` for amendment tracking.
11. **MTCR Annex** — `https://www.mtcr.info/`. PDF.
12. **Wassenaar Arrangement List of Dual-Use Goods and Munitions List** — `https://www.wassenaar.org/`. PDF.
13. **NSG Trigger List & Dual-Use List**, **AG Common Control Lists** — public PDFs.
14. **OpenSanctions** — `https://www.opensanctions.org/`. Commercial API; covers OJEU-pre-FSF, EU national lists, plus OFAC/UK/UN.
15. **HADDEX Online (Reguvis)** — practitioner reference (commercial; not an API).
16. **EU Sanctions Map** — `https://www.sanctionsmap.eu/` for visualisation.

## Caveats

- **Regime fragility:** Russia's Wassenaar veto and the EU's increasing use of unilateral delegated regulations under Art. 17 of (EU) 2021/821 are degrading multilateral harmonisation. Expect Annex I to diverge from MTCR/NSG/AG/WA over the next 3–5 years; cross-walks will need maintenance, not just initial build.
- **2024 BIS/DDTC space rules:** the BIS Final Rule + Interim Final Rule + Proposed Rule and the DDTC Proposed Rule (all 23 Oct 2024) are partially in force; the proposed parts (Cat IV/XV revisions, License Exception CSA) remained open for comment through Nov 2024 and were not all finalised at the research date. Software must model both current and proposed states.
- **HADDEX is commercial.** Reguvis Fachmedien's product is the de facto practitioner reference but is not an open API; software can benchmark against its scope (6 volumes, ~14,130 pages, same-day update Schnelldienst) but not pull data from it.
- **BAFA processing-time figure (average EAG 36 → 52 → 83 working days for Rüstungsgüter)** is from GVW Rechtsanwälte citing BAFA statistics; the primary citable source is the BAFA _Rüstungsexportbericht_ annual report and should be verified for the latest period before publication. BAFA's own 4th Maßnahmenpaket announcement subsequently claimed a ~50 % reduction in dual-use autonomous-decision times by autumn 2024.
- **Annex IV listed entities** change with every Russia sanctions package — Reg. (EU) 2026/506 (20th package, adopted 23 April 2026) added exactly 60 entities (32 Russian, 28 in third countries). Caelex Trade must subscribe to a delta watcher rather than a snapshot.
- **OFAC 50 % Rule has been "extended in practice"** by the 31 March 2026 guidance on sham transactions; software handling beneficial ownership must now also surface "indicia of control" beyond pure ownership. The June 2025 GVA Capital \$215,988,868 statutory-maximum penalty is the cleanest case-law evidence of this expansion.
- **AI-classification accuracy is not a substitute for binding rulings.** Always position software output as a _draft for compliance-officer review_; obtain BAFA AzG / Nullbescheid for high-value or borderline classifications. Liability for misclassification cannot be transferred to the SaaS vendor.
