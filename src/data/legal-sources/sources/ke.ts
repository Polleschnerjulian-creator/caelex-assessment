/**
 * Kenya — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - Luigi Broglio Malindi launch platform — oldest equatorial launch
 *   facility outside US/USSR (operational 1964-1988 by Italy under
 *   bilateral agreement, still operational as receive-only ground
 *   station + planned reactivation under ASI). Equatorial latitude
 *   (2.9°S) provides ~6% velocity boost for prograde launches.
 * - Kenya Space Agency (KSA) — established 2017, operationalized 2019
 *   under Executive Order, Kenya National Space Secretariat (KNSS).
 * - 1KUNS-PF (2018) — Kenya's first satellite, deployed from ISS.
 * - Africa's emerging space hub — competing with Nigeria, South Africa
 *   for AfSA + commercial-space leadership in East Africa.
 *
 * Naming convention: KE-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Kenya Authorities ───────────────────────────────────────────────

export const AUTHORITIES_KE: Authority[] = [
  {
    id: "KE-KSA",
    name_en: "Kenya Space Agency (KSA)",
    jurisdiction: "KE",
    role_description:
      "National space agency established by Executive Order No. 1 of 2017 (operationalized 2019). Reports to Ministry of Defence (initial) and transitioning to civil-defence dual-reporting under proposed 2024 Space Bill. Mandates: national space policy implementation, satellite licensing, international cooperation, Malindi station coordination.",
    website: "https://ksa.go.ke/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "KE-CAK",
    name_en: "Communications Authority of Kenya (CAK)",
    jurisdiction: "KE",
    role_description:
      "Independent telecommunications regulator established under Kenya Information and Communications Act. Authority for satellite-services licensing + frequency allocation + ITU coordination.",
    website: "https://www.ca.go.ke/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "KE-KCAA",
    name_en: "Kenya Civil Aviation Authority (KCAA)",
    jurisdiction: "KE",
    role_description:
      "Civil aviation authority established under Civil Aviation Act 2013. Material for airspace coordination on launch + reentry operations through Kenya territorial airspace.",
    website: "https://www.kcaa.or.ke/",
    applicable_areas: ["space_traffic_management", "licensing"],
  },
  {
    id: "KE-NEMA",
    name_en: "National Environment Management Authority (NEMA)",
    jurisdiction: "KE",
    role_description:
      "Environmental regulator established under Environmental Management and Coordination Act 1999. Authority for EIA approval of ground-station + launch-facility developments.",
    website: "https://www.nema.go.ke/",
    applicable_areas: ["environmental"],
  },
];

// ─── Kenya Legal Sources ─────────────────────────────────────────────

export const LEGAL_SOURCES_KE: LegalSource[] = [
  {
    id: "KE-EXECUTIVE-ORDER-1-2017-KSA",
    jurisdiction: "KE",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Executive Order No. 1 of 2017 — Establishment of Kenya Space Agency",
    date_enacted: "2017-03-07",
    date_last_amended: "2019-02-15",
    source_url: "https://ksa.go.ke/about-us/",
    issuing_body: "Office of the President (Republic of Kenya)",
    competent_authorities: ["KE-KSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "Executive Order No. 1 of 2017 — establishes Kenya Space Agency under Ministry of Defence reporting line. Operationalized 2019. KSA legal authority limited to executive-order basis pending enactment of comprehensive Kenya Space Act (in draft since 2022, expected enactment 2025-2026). Material gap: no statutory framework for licensing, registration, liability — practitioners operate under bilateral arrangements + KSA permits-of-cooperation pending the Act.",
    key_provisions: [
      "Para. 1 — KSA establishment",
      "Para. 4 — KSA mandates (policy, licensing, international cooperation)",
      "Para. 7 — Ministry of Defence reporting line",
    ],
    related_sources: ["KE-DRAFT-SPACE-BILL-2024"],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-DRAFT-SPACE-BILL-2024",
    jurisdiction: "KE",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Kenya Space Activities Bill (Draft, 2024) — Pending Parliamentary Enactment",
    date_published: "2024-05-15",
    source_url:
      "https://ksa.go.ke/wp-content/uploads/2024/05/Kenya-Space-Activities-Bill-2024.pdf",
    issuing_body: "KSA / Ministry of Defence",
    competent_authorities: ["KE-KSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Kenya Space Activities Bill 2024 — first comprehensive draft national space law for Kenya. Modelled on UK Space Industry Act 2018 + South African Space Affairs Act. Material provisions: (i) Section 4 KSA licensing authority for launch + operation + ground-segment; (ii) Section 12 mandatory third-party insurance KES 5B (~US$35M); (iii) Section 18 spacecraft registry compliant with UN Registration Convention; (iv) Section 24 indigenous-data + AfSA coordination obligations. Stakeholder consultation ongoing through 2024; expected enactment 2025-2026. Material for any space-tech investment + JV planning in Kenya.",
    key_provisions: [
      "§4 — KSA licensing authority",
      "§12 — mandatory insurance KES 5B (~US$35M)",
      "§18 — national spacecraft registry",
      "§24 — AfSA coordination obligations",
    ],
    related_sources: [
      "KE-EXECUTIVE-ORDER-1-2017-KSA",
      "INT-AFRICAN-SPACE-AGENCY-CONVENTION",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-ITALY-MALINDI-AGREEMENT-1964",
    jurisdiction: "KE",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Kenya-Italy Bilateral Agreement on Luigi Broglio Malindi Space Centre (1964, amended 1995 + 2020)",
    date_enacted: "1964-06-10",
    date_last_amended: "2020-10-27",
    source_url:
      "https://www.esteri.it/it/sala_stampa/archivionotizie/comunicati/2020/10/al-via-il-nuovo-accordo-italia-kenya-sulla-base-di-malindi/",
    issuing_body:
      "Republic of Kenya + Italian Republic (ASI + ESA cooperation)",
    competent_authorities: ["KE-KSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "Kenya-Italy Bilateral Agreement — establishes legal framework for Luigi Broglio Malindi Space Centre (2.9°S equatorial latitude, ~6% velocity boost for prograde launches). Original 1964 agreement for San Marco platform (operational 1964-1988, 27 launches incl. Scout rockets). 1995 amendment converted to ground-station operations. October 2020 amendment establishes joint Italian-Kenyan management + planned launch-reactivation under ASI. Material for any planned reactivation of African equatorial launch capability + ground-station services for Italian/ESA satellites.",
    key_provisions: [
      "Art. 1 (1964) — San Marco platform launch authorisation",
      "Art. 4 (1995) — ground-station conversion + Italian operational authority",
      "Art. 7 (2020) — joint Italian-Kenyan management board",
      "Art. 12 (2020) — KSA + ASI cooperation in commercial-rideshare planning",
    ],
    related_sources: [
      "KE-EXECUTIVE-ORDER-1-2017-KSA",
      "IT-ASI-MALINDI-PROGRAMME",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-INFORMATION-COMMUNICATIONS-ACT",
    jurisdiction: "KE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Kenya Information and Communications Act (Cap. 411A) — Satellite Services Licensing",
    date_enacted: "1998-12-01",
    date_last_amended: "2024-03-15",
    source_url:
      "http://www.kenyalaw.org/lex/actview.xql?actid=No.%202%20of%201998",
    issuing_body: "Parliament of Kenya",
    competent_authorities: ["KE-CAK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Kenya Information and Communications Act (KICA) — primary telecoms framework. CAK licensing authority for: (i) satellite-services as Public Data Network Operator (PDNO) Class; (ii) satellite earth-station Type Approval; (iii) ITU frequency coordination through CAK. Material for satellite-operator Kenya market entry: Starlink launched July 2023, OneWeb pending licensing. Foreign-ownership restrictions: 20% local-ownership requirement under KICA Section 5(2) — operationalised through CAK License Conditions 2010.",
    key_provisions: [
      "§5(2) — 20% Kenyan-ownership requirement for telecom operators",
      "§17 — CAK licensing authority",
      "§35 — frequency spectrum management",
    ],
    related_sources: ["KE-1KUNS-PF-2018"],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-1KUNS-PF-2018",
    jurisdiction: "KE",
    type: "case_law",
    status: "in_force",
    title_en:
      "1KUNS-PF (First Kenya University Nano-Satellite, 2018) — Kenya's First Satellite",
    date_enacted: "2018-05-11",
    source_url:
      "https://www.unoosa.org/oosa/en/aboutus/pdf/2017_UN-PSI-1KUNS-PF.pdf",
    issuing_body: "University of Nairobi + JAXA + UNOOSA",
    competent_authorities: ["KE-KSA"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["registration", "scientific_research"],
    scope_description:
      "1KUNS-PF — Kenya's first satellite, 1U CubeSat deployed from ISS Kibo module 11 May 2018. Built by University of Nairobi under UNOOSA/JAXA KiboCUBE Programme. Material precedent for Kenya satellite registration: registered under Italy initially (via Malindi heritage + ASI cooperation), later transferred to Kenya registration in 2019 following KSA operationalization. First test case for Kenya's UN Registration Convention compliance — established practice of registry-state transfer through diplomatic note exchange.",
    key_provisions: [],
    related_sources: [
      "KE-ITALY-MALINDI-AGREEMENT-1964",
      "INT-REGISTRATION-CONVENTION-1976",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-AFSA-FOUNDING-MEMBER",
    jurisdiction: "KE",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "African Space Agency (AfSA) Establishment — Kenya as Founding Member",
    date_enacted: "2016-01-31",
    date_last_amended: "2023-09-25",
    source_url: "https://au.int/en/treaties/african-space-policy-and-strategy",
    issuing_body: "African Union + Kenya (Ratifying State)",
    competent_authorities: ["KE-KSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "procurement"],
    scope_description:
      "African Space Agency (AfSA) — established by African Union Decision Assembly/AU/Dec.589(XXVI) of 31 January 2016. Headquartered in Egypt (Cairo). Operational structure ratified September 2023. Kenya is founding member + active participant in AfSA Governing Council. Material for any Kenya-AU coordination: AfSA Statutes prioritize African satellite-imagery cooperation, GMES & Africa programme, African resource-monitoring constellation. Practitioner relevance for AU-wide space-tech procurement opportunities + cross-border data-sharing arrangements.",
    key_provisions: [
      "Art. 4 (AfSA Statutes) — African satellite cooperation",
      "Art. 9 — Governing Council representation",
      "Art. 14 — funding obligations per AU dues",
    ],
    related_sources: ["KE-DRAFT-SPACE-BILL-2024"],
    last_verified: "2026-05-27",
  },
  {
    id: "KE-DATA-PROTECTION-ACT-2019",
    jurisdiction: "KE",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act 2019 (Act No. 24 of 2019)",
    date_enacted: "2019-11-08",
    date_last_amended: "2023-09-30",
    source_url:
      "http://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/2019/TheDataProtectionAct__No24of2019.pdf",
    issuing_body: "Parliament of Kenya",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Kenya Data Protection Act 2019 — GDPR-inspired framework, Office of the Data Protection Commissioner (ODPC) established 2020. Material for satellite-imagery + EO-as-a-service operators: (i) §25 sensitive personal data (location data when identifying individuals); (ii) §49 data-protection impact assessment for high-risk processing; (iii) §50 cross-border data-transfer restrictions (adequacy/binding rules); (iv) §63 penalties up to KES 5M or 1% turnover. Kenya pursuing EU GDPR adequacy decision since 2022.",
    key_provisions: [
      "§25 — sensitive personal data",
      "§49 — DPIA requirement",
      "§50 — cross-border transfer restrictions",
      "§63 — penalties (KES 5M or 1% turnover)",
    ],
    related_sources: ["KE-INFORMATION-COMMUNICATIONS-ACT"],
    last_verified: "2026-05-27",
  },
];
