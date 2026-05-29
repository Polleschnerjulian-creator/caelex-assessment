/**
 * Colombia — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - CCE (Comisión Colombiana del Espacio) — established 2006 by Decree
 *   2442, restructured by Decree 2516 of 2024 elevating to Cabinet-level
 *   inter-institutional Council.
 * - FAC (Fuerza Aérea Colombiana) Space — operates national satellites
 *   FACSat-1 (2018 CubeSat) + FACSat-2 (2023 small-sat) + planned
 *   FACSat-3 (2026).
 * - CRC (Comisión de Regulación de Comunicaciones) — telecoms regulator
 *   responsible for satcom licensing + ITU coordination.
 * - Latin America's 4th-largest economy + 3rd-largest space-tech market
 *   after Brazil + Mexico. Material for Andean Community + Pacific
 *   Alliance space cooperation + US southern partner space-tech access.
 *
 * Naming convention: CO-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Colombia Authorities ────────────────────────────────────────────

export const AUTHORITIES_CO: Authority[] = [
  {
    id: "CO-CCE",
    name_en:
      "Comisión Colombiana del Espacio (CCE / Colombian Space Commission)",
    jurisdiction: "CO",
    role_description:
      "Cabinet-level inter-institutional Council established 2006 by Decree 2442, elevated 2024 by Decree 2516. Chaired by Ministry of Information and Communications Technologies (MinTIC). Material for any commercial-space partnership in Colombia.",
    website: "https://cce.gov.co/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "CO-CRC",
    name_en: "Comisión de Regulación de Comunicaciones (CRC)",
    jurisdiction: "CO",
    role_description:
      "Independent telecoms regulator under Law 1341 of 2009 (ICT Law). Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.crcom.gov.co/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "CO-FAC-SPACE",
    name_en:
      "Fuerza Aérea Colombiana — Sección de Asuntos Espaciales (FAC-SAE)",
    jurisdiction: "CO",
    role_description:
      "Colombian Air Force Space Section. Operates national satellites FACSat-1 + FACSat-2 + planned FACSat-3. Material for any military_dual_use + sovereign EO operations.",
    website: "https://www.fac.mil.co/",
    applicable_areas: ["military_dual_use", "registration"],
  },
];

// ─── Colombia Legal Sources ──────────────────────────────────────────

export const LEGAL_SOURCES_CO: LegalSource[] = [
  {
    id: "CO-DECRETO-2516-2024-CCE",
    jurisdiction: "CO",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Decreto 2516 de 2024 — Comisión Colombiana del Espacio (CCE) + Política Nacional Espacial",
    date_enacted: "2024-06-14",
    date_last_amended: "2024-12-09",
    source_url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=30050000",
    issuing_body: "Presidencia de la República de Colombia",
    competent_authorities: ["CO-CCE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "scientific_research"],
    scope_description:
      "Decreto 2516 de 2024 — establishes elevated structure for Colombian Space Commission (CCE) at Cabinet-level. Material provisions: (i) Art. 2 establishes CCE as Cabinet-level inter-institutional Council; (ii) Art. 5 MinTIC chairmanship + DNP + Mindefensa + MinAgricultura + MinAmbiente + Ministerio de Ciencia members; (iii) Art. 8 establishes Technical Secretariat under DNP; (iv) Art. 12 mandates Política Nacional Espacial 2030 development by Dec 2025; (v) Art. 15 international cooperation provisions accommodating US + EU + China + India partnerships. Material for any commercial-space partnership: replaces fragmented inter-agency coordination with Cabinet-level mandate.",
    key_provisions: [
      "Art. 2 — CCE Cabinet-level inter-institutional Council",
      "Art. 5 — MinTIC chairmanship + multi-Ministry composition",
      "Art. 8 — Technical Secretariat under DNP",
      "Art. 12 — Política Nacional Espacial 2030 (Dec 2025 deadline)",
      "Art. 15 — international cooperation framework",
    ],
    related_sources: ["CO-LAW-1341-2009-ICT", "CO-FACSAT-PROGRAMME"],
    last_verified: "2026-05-27",
  },
  {
    id: "CO-LAW-1341-2009-ICT",
    jurisdiction: "CO",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Ley 1341 de 2009 — Ley de Tecnologías de la Información y las Comunicaciones (Colombian ICT Law) + Ley 1978 de 2019 + 2023 Reform",
    date_enacted: "2009-07-30",
    date_last_amended: "2023-12-20",
    source_url:
      "http://www.secretariasenado.gov.co/senado/basedoc/ley_1341_2009.html",
    issuing_body: "Congreso de Colombia",
    competent_authorities: ["CO-CRC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Ley 1341 de 2009 — primary Colombian ICT framework, materially reformed by Ley 1978 de 2019 (TIC reform) + 2023 amendments. Material satellite-services provisions: (i) Art. 18-25 MinTIC + CRC concession authority for satellite services; (ii) Ley 1978 introduced single-licence regime + spectrum auctions; (iii) Decreto 953 de 2018 administered satellite-orbit + frequency assignments; (iv) Resolución CRC 5050 de 2016 NGSO authorization criteria. Material for satellite-operator Colombia market entry: Starlink launched Sept 2023 under MinTIC streamlined process, OneWeb pending; no formal foreign-ownership cap. Sovereign-orbit allocation: ANDESAT-1 (75°W) + ANDESAT-2 (67°W) reserved orbital slots awaiting deployment.",
    key_provisions: [
      "Art. 18-25 — MinTIC + CRC satellite-services concession",
      "Ley 1978 de 2019 — single-licence regime + spectrum auctions",
      "Decreto 953 de 2018 — orbit + frequency assignments",
      "Resolución CRC 5050 de 2016 — NGSO authorization",
    ],
    related_sources: ["CO-DECRETO-2516-2024-CCE"],
    last_verified: "2026-05-27",
  },
  {
    id: "CO-FACSAT-PROGRAMME",
    jurisdiction: "CO",
    type: "policy_document",
    status: "in_force",
    title_en:
      "FACSat Programme — FACSat-1 (2018) + FACSat-2 (2023) + FACSat-3 (planned 2026)",
    date_enacted: "2018-04-02",
    date_last_amended: "2024-11-15",
    source_url: "https://www.fac.mil.co/facsat-programme/",
    issuing_body: "Fuerza Aérea Colombiana (FAC)",
    competent_authorities: ["CO-FAC-SPACE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "military_dual_use",
      "registration",
      "scientific_research",
    ],
    scope_description:
      "FACSat Programme — Colombia's sovereign satellite capability operated by FAC. Material missions: (i) FACSat-1 (April 2018, 3U CubeSat built by GomSpace Denmark + FAC, EO/atmospheric monitoring); (ii) FACSat-2 (April 2023, 6U CubeSat by GomSpace + FAC, HiRes 5m EO + multispectral, $4M); (iii) FACSat-3 (planned 2026, 12U CubeSat, sub-meter EO + SAR demonstration). Material practitioner implications: (i) Colombia-Denmark ITAR-free European supply chain via GomSpace (parallels Morocco Mohammed VI + Vietnam VNREDSat ITAR-bypass templates); (ii) FAC operates Tres Esquinas + Palanquero + Apiay air bases as ground-segment + downlink; (iii) commercial-EO partnership development: FACSat-2 imagery commercially distributed via FAC partnership with Maxar + Planet (since 2024). Material baseline for any Colombia commercial-EO partnership.",
    key_provisions: [],
    related_sources: ["CO-DECRETO-2516-2024-CCE", "MA-MOHAMMED-VI-PROGRAMME"],
    last_verified: "2026-05-27",
  },
  {
    id: "CO-LAW-1581-2012-DATA-PROTECTION",
    jurisdiction: "CO",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Ley 1581 de 2012 — Régimen General de Protección de Datos Personales + 2024 Reform",
    date_enacted: "2012-10-17",
    date_last_amended: "2024-08-23",
    source_url:
      "http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html",
    issuing_body: "Congreso de Colombia",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Ley 1581 de 2012 — Colombia's primary data-protection law, Superintendencia de Industria y Comercio (SIC) operational since 2013. 2024 reform aligned framework with GDPR equivalence. Material for satellite-imagery + EO-as-a-service operators serving Colombian customers: (i) Art. 6 sensitive data restrictions (location data when identifying individuals); (ii) Art. 25 cross-border transfer rules + adequacy decisions; (iii) Decreto 1377 de 2013 regulatory implementation; (iv) sanctions up to COP 200,000 minimum wages (~$50M). Colombia obtained EU GDPR adequacy decision November 2022 + Andean Community (CAN) Decisión 832 cross-border data-protection harmonization.",
    key_provisions: [
      "Art. 6 — sensitive data restrictions",
      "Art. 25 — cross-border transfer + adequacy",
      "Decreto 1377 de 2013 — regulatory implementation",
      "EU GDPR adequacy decision November 2022",
    ],
    related_sources: ["CO-LAW-1341-2009-ICT"],
    last_verified: "2026-05-27",
  },
  {
    id: "CO-ANDEAN-COMMUNITY-PACIFIC-ALLIANCE",
    jurisdiction: "CO",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "Andean Community (CAN) + Pacific Alliance Space Cooperation Framework",
    date_enacted: "1969-05-26",
    date_last_amended: "2024-06-13",
    source_url: "https://www.comunidadandina.org/",
    issuing_body:
      "Andean Community (Bolivia + Colombia + Ecuador + Peru) + Pacific Alliance (Colombia + Chile + Mexico + Peru)",
    competent_authorities: ["CO-CCE"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "procurement"],
    scope_description:
      "Andean Community Decisión 832 + Pacific Alliance Framework Agreement — establish multilateral space cooperation framework for Latin American sovereign satellite + EO programmes. Material practitioner implications: (i) CAN Decisión 832 (2018) authorises pooled satellite imagery procurement + sharing; (ii) Pacific Alliance Space Working Group (since 2017) established Mexico-Colombia-Peru-Chile cooperation on Pacific-Alliance EO constellation feasibility (Andes monitoring); (iii) Latin American + Caribbean Space Agency (ALCE) — proposed by Mexico + Argentina + Brazil 2020, Colombia + Peru + Chile joined 2022, currently in feasibility study; (iv) UNASUR Space Cooperation Initiative (suspended 2019 with UNASUR institutional crisis but legal framework preserved). Material baseline for any Latin American multilateral space-procurement opportunity.",
    key_provisions: [],
    related_sources: ["CO-DECRETO-2516-2024-CCE"],
    last_verified: "2026-05-27",
  },
];
