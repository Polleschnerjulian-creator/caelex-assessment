/**
 * Morocco — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - CRTS (Centre Royal de Télédétection Spatiale) — Morocco's space
 *   agency analogue, established 1989, operates Mohammed VI A + B.
 * - Mohammed VI A (Nov 2017) + Mohammed VI B (Nov 2018) — sovereign
 *   EO sats built by Airbus DS + Thales Alenia Space, ~70cm pan, key
 *   asset for Western Sahara surveillance + military intelligence.
 * - ARCSSTE-F (Africa Regional Centre for Space Science and Technology
 *   Education in French) — UN-affiliated joint Morocco-Algeria.
 * - Material for North Africa + French-speaking Africa cooperation,
 *   EU-MA Association Agreement, US-MA Free Trade Agreement, AU/AfSA
 *   founding state.
 *
 * Naming convention: MA-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Morocco Authorities ─────────────────────────────────────────────

export const AUTHORITIES_MA: Authority[] = [
  {
    id: "MA-CRTS",
    name_en:
      "Centre Royal de Télédétection Spatiale (CRTS / المركز الملكي للاستشعار البعدي الفضائي)",
    jurisdiction: "MA",
    role_description:
      "Morocco's space agency-equivalent, established 1989 by Royal Decree 2.89.404. Reports to Ministry of Higher Education, Scientific Research and Innovation. Operates Mohammed VI A + B EO satellites + ground-segment infrastructure. Material for EO + remote-sensing licensing + ARSEN successor planning.",
    website: "https://www.crts.gov.ma/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "MA-ANRT",
    name_en:
      "Agence Nationale de Réglementation des Télécommunications (ANRT / الوكالة الوطنية لتقنين الاتصالات)",
    jurisdiction: "MA",
    role_description:
      "Independent telecommunications regulator established 1997 under Law 24-96. Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.anrt.ma/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "MA-FAR-SPACE",
    name_en:
      "Forces Armées Royales — Composante Spatiale (FAR Space Component)",
    jurisdiction: "MA",
    role_description:
      "Royal Moroccan Armed Forces Space Component. Operates Mohammed VI A + B military-utility EO + cooperates with French Spatial Command (CdE Toulouse). Material for Sahara theater surveillance + AU peacekeeping operations.",
    website: "https://www.far.ma/",
    applicable_areas: ["military_dual_use", "registration"],
  },
  {
    id: "MA-CNDP",
    name_en:
      "Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP)",
    jurisdiction: "MA",
    role_description:
      "Data protection authority established under Law 09-08 (2009). Authority for satellite-imagery + EO-as-a-service data-protection enforcement.",
    website: "https://www.cndp.ma/",
    applicable_areas: ["data_security"],
  },
];

// ─── Morocco Legal Sources ───────────────────────────────────────────

export const LEGAL_SOURCES_MA: LegalSource[] = [
  {
    id: "MA-CRTS-ROYAL-DECREE-1989",
    jurisdiction: "MA",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Royal Decree 2.89.404 (1989) — Establishment of Centre Royal de Télédétection Spatiale (CRTS)",
    date_enacted: "1989-10-13",
    date_last_amended: "2023-06-20",
    source_url: "https://www.crts.gov.ma/historique/",
    issuing_body: "King Hassan II / Prime Minister",
    competent_authorities: ["MA-CRTS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "registration"],
    scope_description:
      "Royal Decree 2.89.404 — establishes CRTS as Morocco's national space + remote-sensing agency. Authority structure: reports to Ministry of Higher Education, Scientific Research and Innovation. CRTS operates: (i) Mohammed VI A + B EO satellites; (ii) national ground-segment + receiving stations at Rabat; (iii) UN-affiliated ARCSSTE-F regional centre. Material for any commercial-space partnership in Morocco. Proposed ARSEN (Agence Royale pour le Spatial et l'Espace National) draft 2023-2024 would consolidate CRTS + military space capability into Royal Agency structure — pending Royal Decree enactment.",
    key_provisions: [],
    related_sources: [
      "MA-MOHAMMED-VI-PROGRAMME",
      "MA-ARCSSTE-F-UN-AFFILIATION",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "MA-MOHAMMED-VI-PROGRAMME",
    jurisdiction: "MA",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Morocco-France Mohammed VI A + B EO Satellite Programme (Airbus DS + Thales Alenia Space 2017-2018)",
    date_enacted: "2013-11-08",
    date_last_amended: "2024-05-25",
    source_url:
      "https://www.airbus.com/en/newsroom/press-releases/2018-11-airbus-and-thales-alenia-space-successfully-launch-mohammed-vi-b",
    issuing_body:
      "Kingdom of Morocco + Government of France (Airbus DS + Thales Alenia Space)",
    competent_authorities: ["MA-CRTS", "MA-FAR-SPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "procurement", "registration"],
    scope_description:
      "Mohammed VI A + B — Morocco's flagship sovereign EO programme. Contract: ~€500M (undisclosed precisely), signed November 2013, France's largest African defense-space export deal. Material context: (i) Airbus DS prime + Thales Alenia Space subcontractor; (ii) MOHAMMED VI A launched 7 Nov 2017 + MOHAMMED VI B launched 20 Nov 2018, both from Kourou on Vega; (iii) 1.1m panchromatic + 4m multispectral imagery; (iv) dual-civil/military use (CRTS civil + FAR military); (v) Western Sahara surveillance + Tindouf monitoring + AU peacekeeping support roles. Material precedent for French-African defense-space exports + ITAR-bypass via European supply chain (no US components subject to ITAR).",
    key_provisions: [],
    related_sources: [
      "MA-CRTS-ROYAL-DECREE-1989",
      "FR-DEFENSE-SPACE-STRATEGY-2019",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "MA-LAW-24-96-TELECOM",
    jurisdiction: "MA",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Loi 24-96 — Code des Télécommunications (1997) + Loi 121-12 (2013) reform",
    date_enacted: "1997-08-07",
    date_last_amended: "2019-11-22",
    source_url: "https://www.anrt.ma/legislation/loi-24-96",
    issuing_body: "Parlement du Maroc",
    competent_authorities: ["MA-ANRT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Loi 24-96 + amendments (Code des Télécommunications) — primary Moroccan telecoms framework. Material satellite-services provisions: (i) ANRT licensing authority for satellite services; (ii) Loi 121-12 (2013) reform introduced LTE-Advanced + NGN frameworks; (iii) Décret 2-13-617 (2014) administered VSAT + satellite-internet licensing; (iv) ANRT Decision DG/ANRT/2024 governs LEO mega-constellation licensing (Starlink applied 2023, OneWeb licensed 2022). Foreign-ownership rules: no formal cap but informal preference for Maroc Telecom (40% state-owned) JV partnerships.",
    key_provisions: [
      "Art. 5-15 — ANRT licensing authority",
      "Décret 2-13-617 — VSAT + satcom licensing",
      "ANRT Decision DG/ANRT/2024 — LEO mega-constellation framework",
    ],
    related_sources: [],
    last_verified: "2026-05-27",
  },
  {
    id: "MA-LOI-09-08-DATA-PROTECTION",
    jurisdiction: "MA",
    type: "federal_law",
    status: "in_force",
    title_en: "Loi 09-08 (2009) — Protection des Données à Caractère Personnel",
    date_enacted: "2009-02-18",
    date_last_amended: "2023-09-15",
    source_url: "https://www.cndp.ma/index.php/textes-legislatifs/loi-09-08",
    issuing_body: "Parlement du Maroc",
    competent_authorities: ["MA-CNDP"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Loi 09-08 — Morocco's data protection law. Modelled on EU Directive 95/46/EC (pre-GDPR). CNDP independent DPA established under Art. 26. Material for satellite-imagery + EO-as-a-service operators serving Moroccan customers: (i) Art. 11 explicit consent for sensitive data including location; (ii) Art. 43-45 cross-border transfer rules — Morocco-EU adequacy decision pursued since 2020; (iii) Art. 51-58 enforcement penalties up to MAD 300K + criminal sanctions. Morocco pre-draft 09-08bis 2023 GDPR-alignment reform pending — would establish Art. 9 sensitive-data category + 4% turnover fines.",
    key_provisions: [
      "Art. 11 — explicit consent for sensitive data",
      "Art. 26 — CNDP independent DPA",
      "Art. 43-45 — cross-border transfer rules",
      "Art. 51-58 — enforcement penalties",
    ],
    related_sources: ["MA-LAW-24-96-TELECOM"],
    last_verified: "2026-05-27",
  },
  {
    id: "MA-ARCSSTE-F-UN-AFFILIATION",
    jurisdiction: "MA",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "African Regional Centre for Space Science and Technology Education in French (ARCSSTE-F) — UN Affiliation 1998",
    date_enacted: "1998-11-24",
    date_last_amended: "2022-06-17",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/psa/regional-centres/arcsste-f.html",
    issuing_body:
      "United Nations (UNOOSA) + Kingdom of Morocco + People's Democratic Republic of Algeria + Mohammed V University",
    competent_authorities: ["MA-CRTS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "procurement"],
    scope_description:
      "ARCSSTE-F — UN-affiliated regional centre for space science + technology education (French-speaking Africa). Established 1998 with dual hosts: Mohammed V University (Rabat, Morocco) + Centre Régional Africain des Sciences et Technologies de l'Espace en langue Française (CRASTE-LF) at Université Saad Dahlab (Blida, Algeria). UNOOSA Programme on Space Applications affiliation. Material for francophone Africa space-tech talent pipeline + Morocco-Algeria scientific cooperation (despite political tensions). Practitioner relevance for AU-aligned procurement preference + AfSA workforce-development obligations.",
    key_provisions: [],
    related_sources: [
      "MA-CRTS-ROYAL-DECREE-1989",
      "NG-ARCSSTE-E-UN-AFFILIATION",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "MA-EU-ASSOCIATION-AGREEMENT",
    jurisdiction: "MA",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "EU-Morocco Association Agreement (2000) + Advanced Status Partnership (2008) — Space-Cooperation Sub-Agreements",
    date_enacted: "2000-03-18",
    date_last_amended: "2024-10-04",
    source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:22000A0318(01)",
    issuing_body: "European Union + Kingdom of Morocco",
    competent_authorities: ["MA-CRTS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "scientific_research"],
    scope_description:
      "EU-Morocco Association Agreement — entered force March 2000, upgraded to Advanced Status 2008. Material space-related provisions: (i) Title VII Cooperation in Science and Technology — extends to space-tech R&D (Horizon Europe association status not yet achieved, in negotiation since 2023); (ii) Annex VII satcom + ground-station equipment trade preferences; (iii) Galileo + Copernicus framework participation through bilateral implementing arrangements. CJEU Front Polisario judgment (October 2024) re Western Sahara provisions impacts EO-imagery licensing — EU operators must distinguish Morocco-proper vs Western Sahara product offerings.",
    key_provisions: [
      "Title VII — science + technology cooperation",
      "Annex VII — satcom equipment trade preferences",
      "CJEU Front Polisario judgment Oct 2024 — Western Sahara carve-out",
    ],
    related_sources: ["MA-MOHAMMED-VI-PROGRAMME"],
    last_verified: "2026-05-27",
  },
];
