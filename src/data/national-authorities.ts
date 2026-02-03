// National Competent Authorities (NCAs) for EU Space Act
// Reference: EU Space Act Art. 28-39

export interface NationalAuthority {
  countryCode: string;
  countryName: string;
  authorityName: string;
  authorityNameLocal: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  spaceAgency?: string;
  regulatoryFramework: string;
  languages: string[];
  timezone: string;
  notificationPortal?: string;
  emergencyContact?: string;
  isEUMember: boolean;
}

export const nationalAuthorities: Record<string, NationalAuthority> = {
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    authorityName: "German Space Agency at DLR",
    authorityNameLocal: "Deutsches Zentrum für Luft- und Raumfahrt",
    website:
      "https://www.dlr.de/de/das-dlr/organisation/deutsche-raumfahrtagentur",
    contactEmail: "genehmigung@dlr.de",
    contactPhone: "+49 228 447-0",
    address: "Königswinterer Straße 522-524, 53227 Bonn, Germany",
    spaceAgency: "DLR",
    regulatoryFramework:
      "Satellitendatensicherheitsgesetz (SatDSiG), upcoming Weltraumgesetz",
    languages: ["de", "en"],
    timezone: "Europe/Berlin",
    notificationPortal:
      "https://www.dlr.de/de/das-dlr/organisation/deutsche-raumfahrtagentur/genehmigungen",
    isEUMember: true,
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    authorityName: "CNES - French Space Agency",
    authorityNameLocal: "Centre National d'Études Spatiales",
    website: "https://cnes.fr",
    contactEmail: "reglementation@cnes.fr",
    contactPhone: "+33 5 61 27 31 31",
    address: "2 Place Maurice Quentin, 75001 Paris, France",
    spaceAgency: "CNES",
    regulatoryFramework: "Loi relative aux opérations spatiales (LOS)",
    languages: ["fr", "en"],
    timezone: "Europe/Paris",
    notificationPortal: "https://cnes.fr/fr/reglementation",
    emergencyContact: "+33 5 61 27 40 00",
    isEUMember: true,
  },
  IT: {
    countryCode: "IT",
    countryName: "Italy",
    authorityName: "Italian Space Agency",
    authorityNameLocal: "Agenzia Spaziale Italiana",
    website: "https://www.asi.it",
    contactEmail: "info@asi.it",
    contactPhone: "+39 06 8567 1",
    address: "Via del Politecnico snc, 00133 Roma, Italy",
    spaceAgency: "ASI",
    regulatoryFramework: "Legge 7/2018 on Space Activities",
    languages: ["it", "en"],
    timezone: "Europe/Rome",
    isEUMember: true,
  },
  ES: {
    countryCode: "ES",
    countryName: "Spain",
    authorityName: "Spanish Space Agency",
    authorityNameLocal: "Agencia Espacial Española",
    website: "https://www.aee.gob.es",
    contactEmail: "info@aee.gob.es",
    contactPhone: "+34 91 590 63 00",
    address: "Paseo de la Castellana, 112, 28046 Madrid, Spain",
    spaceAgency: "AEE",
    regulatoryFramework: "Royal Decree on Space Activities",
    languages: ["es", "en"],
    timezone: "Europe/Madrid",
    isEUMember: true,
  },
  NL: {
    countryCode: "NL",
    countryName: "Netherlands",
    authorityName: "Netherlands Space Office",
    authorityNameLocal: "Netherlands Space Office",
    website: "https://www.spaceoffice.nl",
    contactEmail: "info@spaceoffice.nl",
    contactPhone: "+31 88 042 45 00",
    address: "Laan van Westenenk 501, 7334 DT Apeldoorn, Netherlands",
    regulatoryFramework: "Wet ruimtevaartactiviteiten (Space Activities Act)",
    languages: ["nl", "en"],
    timezone: "Europe/Amsterdam",
    isEUMember: true,
  },
  BE: {
    countryCode: "BE",
    countryName: "Belgium",
    authorityName: "Belgian Federal Science Policy Office",
    authorityNameLocal: "Belspo",
    website: "https://www.belspo.be",
    contactEmail: "space@belspo.be",
    contactPhone: "+32 2 238 34 11",
    address: "Avenue Louise 231, 1050 Brussels, Belgium",
    regulatoryFramework:
      "Loi du 17 septembre 2005 relative aux activités de lancement",
    languages: ["nl", "fr", "en"],
    timezone: "Europe/Brussels",
    isEUMember: true,
  },
  LU: {
    countryCode: "LU",
    countryName: "Luxembourg",
    authorityName: "Luxembourg Space Agency",
    authorityNameLocal: "Luxembourg Space Agency",
    website: "https://space-agency.public.lu",
    contactEmail: "info@space-agency.lu",
    contactPhone: "+352 247 86700",
    address: "19-21, Boulevard Royal, L-2449 Luxembourg",
    regulatoryFramework: "Law of 15 December 2020 on Space Activities",
    languages: ["fr", "de", "en"],
    timezone: "Europe/Luxembourg",
    isEUMember: true,
  },
  AT: {
    countryCode: "AT",
    countryName: "Austria",
    authorityName: "Austrian Research Promotion Agency",
    authorityNameLocal:
      "Österreichische Forschungsförderungsgesellschaft (FFG)",
    website: "https://www.ffg.at",
    contactEmail: "space@ffg.at",
    contactPhone: "+43 5 7755-0",
    address: "Sensengasse 1, 1090 Vienna, Austria",
    regulatoryFramework: "Weltraumgesetz (Austrian Space Act)",
    languages: ["de", "en"],
    timezone: "Europe/Vienna",
    isEUMember: true,
  },
  PL: {
    countryCode: "PL",
    countryName: "Poland",
    authorityName: "Polish Space Agency",
    authorityNameLocal: "Polska Agencja Kosmiczna (POLSA)",
    website: "https://polsa.gov.pl",
    contactEmail: "sekretariat@polsa.gov.pl",
    contactPhone: "+48 22 380 15 50",
    address: "Trzy Lipy 3, 80-172 Gdańsk, Poland",
    spaceAgency: "POLSA",
    regulatoryFramework: "Polish Space Agency Act",
    languages: ["pl", "en"],
    timezone: "Europe/Warsaw",
    isEUMember: true,
  },
  SE: {
    countryCode: "SE",
    countryName: "Sweden",
    authorityName: "Swedish National Space Agency",
    authorityNameLocal: "Rymdstyrelsen",
    website: "https://www.rymdstyrelsen.se",
    contactEmail: "rymdstyrelsen@rymdstyrelsen.se",
    contactPhone: "+46 980 720 00",
    address: "Box 4006, 171 04 Solna, Sweden",
    regulatoryFramework: "Swedish Act on Space Activities (1982:963)",
    languages: ["sv", "en"],
    timezone: "Europe/Stockholm",
    isEUMember: true,
  },
  FI: {
    countryCode: "FI",
    countryName: "Finland",
    authorityName: "Ministry of Economic Affairs and Employment",
    authorityNameLocal: "Työ- ja elinkeinoministeriö",
    website: "https://tem.fi",
    contactEmail: "kirjaamo.tem@gov.fi",
    contactPhone: "+358 295 060 00",
    address: "Aleksanterinkatu 4, 00170 Helsinki, Finland",
    regulatoryFramework: "Act on Space Activities (63/2018)",
    languages: ["fi", "sv", "en"],
    timezone: "Europe/Helsinki",
    isEUMember: true,
  },
  DK: {
    countryCode: "DK",
    countryName: "Denmark",
    authorityName: "Danish Agency for Higher Education and Science",
    authorityNameLocal: "Uddannelses- og Forskningsstyrelsen",
    website: "https://ufm.dk",
    contactEmail: "ufs@ufm.dk",
    contactPhone: "+45 72 31 88 00",
    address: "Børsgade 4, 1215 Copenhagen K, Denmark",
    regulatoryFramework: "Danish Outer Space Act (2016)",
    languages: ["da", "en"],
    timezone: "Europe/Copenhagen",
    isEUMember: true,
  },
  PT: {
    countryCode: "PT",
    countryName: "Portugal",
    authorityName: "Portugal Space",
    authorityNameLocal: "Agência Espacial Portuguesa",
    website: "https://ptspace.pt",
    contactEmail: "info@ptspace.pt",
    contactPhone: "+351 213 500 800",
    address: "Estrada da Malveira da Serra 920, 2750-834 Cascais, Portugal",
    spaceAgency: "Portugal Space",
    regulatoryFramework: "Portuguese Space Law (pending)",
    languages: ["pt", "en"],
    timezone: "Europe/Lisbon",
    isEUMember: true,
  },
  GR: {
    countryCode: "GR",
    countryName: "Greece",
    authorityName: "Hellenic Space Center",
    authorityNameLocal: "Ελληνικό Κέντρο Διαστήματος",
    website: "https://hsc.gov.gr",
    contactEmail: "info@hsc.gov.gr",
    contactPhone: "+30 210 810 9600",
    address: "Vas. Sofias Ave. 47, 115 21 Athens, Greece",
    spaceAgency: "HSC",
    regulatoryFramework: "Greek Space Activities Law (Law 4623/2019)",
    languages: ["el", "en"],
    timezone: "Europe/Athens",
    isEUMember: true,
  },
  CZ: {
    countryCode: "CZ",
    countryName: "Czech Republic",
    authorityName: "Czech Space Office",
    authorityNameLocal: "Česká kosmická kancelář",
    website: "https://www.czechspace.cz",
    contactEmail: "info@czechspace.cz",
    contactPhone: "+420 224 103 450",
    address: "Ve Struhách 27, 160 00 Prague 6, Czech Republic",
    regulatoryFramework: "Czech Space Activities Act (pending)",
    languages: ["cs", "en"],
    timezone: "Europe/Prague",
    isEUMember: true,
  },
  RO: {
    countryCode: "RO",
    countryName: "Romania",
    authorityName: "Romanian Space Agency",
    authorityNameLocal: "Agenția Spațială Română",
    website: "https://rosa.ro",
    contactEmail: "office@rosa.ro",
    contactPhone: "+40 21 316 89 52",
    address: "Str. Mendeleev 21-25, Sector 1, Bucharest, Romania",
    spaceAgency: "ROSA",
    regulatoryFramework: "Law on Space Activities (pending)",
    languages: ["ro", "en"],
    timezone: "Europe/Bucharest",
    isEUMember: true,
  },
  IE: {
    countryCode: "IE",
    countryName: "Ireland",
    authorityName: "Enterprise Ireland / Department of Enterprise",
    authorityNameLocal: "Enterprise Ireland",
    website: "https://enterprise-ireland.com",
    contactEmail: "space@enterprise-ireland.com",
    contactPhone: "+353 1 727 2000",
    address: "The Plaza, East Point Business Park, Dublin 3, Ireland",
    regulatoryFramework: "Irish Space Strategy 2019-2025",
    languages: ["en", "ga"],
    timezone: "Europe/Dublin",
    isEUMember: true,
  },
  HU: {
    countryCode: "HU",
    countryName: "Hungary",
    authorityName: "Hungarian Space Office",
    authorityNameLocal: "Magyar Űrkutatási Iroda",
    website: "https://space.gov.hu",
    contactEmail: "info@space.gov.hu",
    contactPhone: "+36 1 795 5000",
    address: "Kossuth Lajos tér 11, 1055 Budapest, Hungary",
    regulatoryFramework: "Government Decree on Space Activities",
    languages: ["hu", "en"],
    timezone: "Europe/Budapest",
    isEUMember: true,
  },
  SK: {
    countryCode: "SK",
    countryName: "Slovakia",
    authorityName: "Slovak Space Office",
    authorityNameLocal: "Slovenská kozmická kancelária",
    website: "https://slovakspace.sk",
    contactEmail: "info@slovakspace.sk",
    contactPhone: "+421 2 5022 1234",
    address: "Štefánikova 3, 811 05 Bratislava, Slovakia",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["sk", "en"],
    timezone: "Europe/Bratislava",
    isEUMember: true,
  },
  BG: {
    countryCode: "BG",
    countryName: "Bulgaria",
    authorityName: "Bulgarian Space Agency",
    authorityNameLocal: "Българска агенция за космически изследвания",
    website: "https://space.bas.bg",
    contactEmail: "office@space.bas.bg",
    contactPhone: "+359 2 988 35 03",
    address: "Acad. G. Bonchev St., bl. 1, 1113 Sofia, Bulgaria",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["bg", "en"],
    timezone: "Europe/Sofia",
    isEUMember: true,
  },
  HR: {
    countryCode: "HR",
    countryName: "Croatia",
    authorityName: "Ministry of Science and Education",
    authorityNameLocal: "Ministarstvo znanosti i obrazovanja",
    website: "https://mzo.gov.hr",
    contactEmail: "ured@mzo.hr",
    contactPhone: "+385 1 4594 333",
    address: "Donje Svetice 38, 10000 Zagreb, Croatia",
    regulatoryFramework: "Pending national space legislation",
    languages: ["hr", "en"],
    timezone: "Europe/Zagreb",
    isEUMember: true,
  },
  SI: {
    countryCode: "SI",
    countryName: "Slovenia",
    authorityName: "Ministry of Higher Education, Science and Innovation",
    authorityNameLocal: "Ministrstvo za visoko šolstvo, znanost in inovacije",
    website:
      "https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-visoko-solstvo-znanost-in-inovacije/",
    contactEmail: "gp.mvzi@gov.si",
    contactPhone: "+386 1 478 46 00",
    address: "Masarykova cesta 16, 1000 Ljubljana, Slovenia",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["sl", "en"],
    timezone: "Europe/Ljubljana",
    isEUMember: true,
  },
  EE: {
    countryCode: "EE",
    countryName: "Estonia",
    authorityName: "Estonian Space Office",
    authorityNameLocal: "Eesti Kosmosebüroo",
    website: "https://kosmos.ee",
    contactEmail: "info@kosmos.ee",
    contactPhone: "+372 731 5500",
    address: "Suur-Sõjamäe 10a, 11415 Tallinn, Estonia",
    regulatoryFramework: "Space Act (pending)",
    languages: ["et", "en"],
    timezone: "Europe/Tallinn",
    isEUMember: true,
  },
  LV: {
    countryCode: "LV",
    countryName: "Latvia",
    authorityName: "Ministry of Education and Science",
    authorityNameLocal: "Izglītības un zinātnes ministrija",
    website: "https://www.izm.gov.lv",
    contactEmail: "pasts@izm.gov.lv",
    contactPhone: "+371 67047800",
    address: "Vaļņu iela 2, Rīga, LV-1050, Latvia",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["lv", "en"],
    timezone: "Europe/Riga",
    isEUMember: true,
  },
  LT: {
    countryCode: "LT",
    countryName: "Lithuania",
    authorityName: "Lithuanian Space Office",
    authorityNameLocal: "Lietuvos kosmoso biuras",
    website: "https://space.lmt.lt",
    contactEmail: "info@space.lt",
    contactPhone: "+370 5 264 4700",
    address: "Saulėtekio al. 15, LT-10224 Vilnius, Lithuania",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["lt", "en"],
    timezone: "Europe/Vilnius",
    isEUMember: true,
  },
  MT: {
    countryCode: "MT",
    countryName: "Malta",
    authorityName: "Malta Council for Science and Technology",
    authorityNameLocal: "Malta Council for Science and Technology",
    website: "https://mcst.gov.mt",
    contactEmail: "info@mcst.gov.mt",
    contactPhone: "+356 2360 2100",
    address: "Villa Bighi, Kalkara KKR 1320, Malta",
    regulatoryFramework: "Malta Space Strategy",
    languages: ["mt", "en"],
    timezone: "Europe/Malta",
    isEUMember: true,
  },
  CY: {
    countryCode: "CY",
    countryName: "Cyprus",
    authorityName: "Deputy Ministry of Research, Innovation and Digital Policy",
    authorityNameLocal:
      "Υφυπουργείο Έρευνας, Καινοτομίας και Ψηφιακής Πολιτικής",
    website: "https://www.dmrid.gov.cy",
    contactEmail: "info@dmrid.gov.cy",
    contactPhone: "+357 22 691 900",
    address: "1 Vyronos Avenue, 1096 Nicosia, Cyprus",
    regulatoryFramework: "Space Activities Act (pending)",
    languages: ["el", "en"],
    timezone: "Europe/Nicosia",
    isEUMember: true,
  },
  // Non-EU but relevant
  UK: {
    countryCode: "UK",
    countryName: "United Kingdom",
    authorityName: "UK Space Agency / Civil Aviation Authority",
    authorityNameLocal: "UK Space Agency",
    website: "https://www.gov.uk/government/organisations/uk-space-agency",
    contactEmail: "licensing@ukspaceagency.gov.uk",
    contactPhone: "+44 1onal93 500500",
    address: "Polaris House, North Star Avenue, Swindon SN2 1SZ, UK",
    regulatoryFramework: "Space Industry Act 2018, Outer Space Act 1986",
    languages: ["en"],
    timezone: "Europe/London",
    notificationPortal: "https://www.caa.co.uk/space/",
    isEUMember: false,
  },
  NO: {
    countryCode: "NO",
    countryName: "Norway",
    authorityName: "Norwegian Space Agency",
    authorityNameLocal: "Norsk Romsenter",
    website: "https://www.romsenter.no",
    contactEmail: "post@romsenter.no",
    contactPhone: "+47 22 51 18 00",
    address: "Drammensveien 165, 0277 Oslo, Norway",
    spaceAgency: "NOSA",
    regulatoryFramework: "Norwegian Space Activities Act",
    languages: ["no", "en"],
    timezone: "Europe/Oslo",
    isEUMember: false,
  },
  CH: {
    countryCode: "CH",
    countryName: "Switzerland",
    authorityName: "Swiss Space Office",
    authorityNameLocal:
      "Staatssekretariat für Bildung, Forschung und Innovation",
    website:
      "https://www.sbfi.admin.ch/sbfi/en/home/research-and-innovation/space.html",
    contactEmail: "space@sbfi.admin.ch",
    contactPhone: "+41 58 463 22 90",
    address: "Einsteinstrasse 2, 3003 Bern, Switzerland",
    regulatoryFramework: "Swiss Ordinance on Space Activities",
    languages: ["de", "fr", "it", "en"],
    timezone: "Europe/Zurich",
    isEUMember: false,
  },
  // EU-level authority
  EU: {
    countryCode: "EU",
    countryName: "European Union",
    authorityName: "EU Agency for the Space Programme",
    authorityNameLocal: "EUSPA",
    website: "https://www.euspa.europa.eu",
    contactEmail: "info@euspa.europa.eu",
    contactPhone: "+420 237 766 000",
    address: "Janovského 438/2, 170 00 Prague 7, Czech Republic",
    regulatoryFramework: "EU Space Act (2030)",
    languages: ["en", "fr", "de"],
    timezone: "Europe/Prague",
    isEUMember: true,
  },
};

// Reporting obligation types
export type ReportType =
  | "annual_compliance"
  | "significant_change"
  | "incident"
  | "cybersecurity"
  | "debris_event"
  | "conjunction"
  | "anomaly"
  | "eol_update"
  | "insurance"
  | "ownership_transfer";

export interface ReportingObligation {
  type: ReportType;
  title: string;
  description: string;
  frequency:
    | "immediate"
    | "within_24h"
    | "within_72h"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "annual";
  triggerConditions: string[];
  requiredContent: string[];
  recipients: ("primary_nca" | "euspa" | "esa" | "eu_commission")[];
  format: "structured_form" | "free_text" | "standardized_xml";
  legalBasis: string;
}

export const reportingObligations: ReportingObligation[] = [
  {
    type: "annual_compliance",
    title: "Annual Compliance Report",
    description:
      "Comprehensive yearly report on authorization compliance, operations summary, and forward-looking statement",
    frequency: "annual",
    triggerConditions: ["Calendar year end"],
    requiredContent: [
      "Authorization status summary",
      "Operations statistics (launches, maneuvers, anomalies)",
      "Debris mitigation compliance status",
      "Cybersecurity measures summary",
      "Insurance status",
      "Planned activities for next year",
      "Any non-conformities and remediation actions",
    ],
    recipients: ["primary_nca"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 45",
  },
  {
    type: "incident",
    title: "Significant Incident Report",
    description:
      "Report any event compromising mission safety, availability, integrity, or confidentiality",
    frequency: "within_24h",
    triggerConditions: [
      "Loss of spacecraft control",
      "Unplanned maneuver",
      "Communication blackout > 24h",
      "Mission degradation > 20%",
      "Collision avoidance maneuver executed",
      "Debris generation event",
    ],
    requiredContent: [
      "Incident timestamp (UTC)",
      "Incident classification",
      "Affected assets (COSPAR IDs)",
      "Root cause (if known)",
      "Immediate actions taken",
      "Current status",
      "Potential impact on other operators",
    ],
    recipients: ["primary_nca", "euspa"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 47",
  },
  {
    type: "cybersecurity",
    title: "Cybersecurity Incident Report",
    description:
      "Report cyber incidents affecting space systems per NIS2 requirements",
    frequency: "immediate",
    triggerConditions: [
      "Unauthorized access to ground systems",
      "Malware detection in mission-critical systems",
      "Successful/attempted command injection",
      "Data breach affecting telemetry/control",
      "DDoS affecting ground infrastructure",
      "Supply chain compromise",
    ],
    requiredContent: [
      "Incident detection timestamp",
      "Attack vector (if known)",
      "Affected systems",
      "Data potentially compromised",
      "Containment measures",
      "Recovery status",
      "Attribution (if available)",
    ],
    recipients: ["primary_nca", "euspa"],
    format: "standardized_xml",
    legalBasis: "EU Space Act Art. 83, NIS2 Directive",
  },
  {
    type: "conjunction",
    title: "Collision Avoidance Report",
    description: "Report conjunction events and maneuver decisions",
    frequency: "within_72h",
    triggerConditions: [
      "Probability of collision > 1:10,000",
      "Collision avoidance maneuver executed",
      "Close approach < 1km (LEO) or < 5km (GEO)",
      "Coordination with other operators required",
    ],
    requiredContent: [
      "TCA (Time of Closest Approach)",
      "Miss distance (actual/predicted)",
      "Probability of collision",
      "Objects involved (NORAD IDs)",
      "Maneuver details (if executed)",
      "Coordination actions taken",
    ],
    recipients: ["primary_nca", "euspa"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 67",
  },
  {
    type: "significant_change",
    title: "Significant Change Notification",
    description: "Notify NCA of material changes to authorized activities",
    frequency: "within_72h",
    triggerConditions: [
      "Change in orbital parameters > 10%",
      "Change in mission duration",
      "Addition/removal of payload capabilities",
      "Change in ground segment architecture",
      "Change in data processing locations",
      "Subcontractor changes (critical functions)",
      "Corporate ownership change",
    ],
    requiredContent: [
      "Nature of change",
      "Affected authorization conditions",
      "Risk assessment of change",
      "Updated documentation",
      "Implementation timeline",
    ],
    recipients: ["primary_nca"],
    format: "free_text",
    legalBasis: "EU Space Act Art. 35",
  },
  {
    type: "eol_update",
    title: "End-of-Life Status Report",
    description: "Periodic updates on decommissioning preparations",
    frequency: "quarterly",
    triggerConditions: [
      "Mission in final 2 years",
      "Passivation activities commenced",
      "Deorbit maneuver planned",
      "Graveyard transfer initiated",
    ],
    requiredContent: [
      "Remaining propellant estimate",
      "Planned disposal method",
      "Estimated disposal date",
      "Passivation checklist status",
      "Any impediments to disposal",
    ],
    recipients: ["primary_nca"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 72",
  },
  {
    type: "debris_event",
    title: "Debris Generation Event Report",
    description: "Immediate reporting of any debris creation",
    frequency: "immediate",
    triggerConditions: [
      "Fragmentation event",
      "Unintentional object release",
      "Collision (actual)",
      "Explosion or breakup",
    ],
    requiredContent: [
      "Event timestamp (UTC)",
      "Event type and cause",
      "Number of fragments (estimated)",
      "Orbital parameters of debris",
      "Tracking status",
      "Mitigation measures taken",
    ],
    recipients: ["primary_nca", "euspa"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 68",
  },
  {
    type: "insurance",
    title: "Insurance Status Change Report",
    description: "Notification of insurance policy changes",
    frequency: "within_72h",
    triggerConditions: [
      "Policy expiration",
      "Coverage change",
      "Insurer change",
      "Claim filed",
      "Policy cancellation",
    ],
    requiredContent: [
      "Type of change",
      "Affected coverage",
      "New coverage details (if applicable)",
      "Effective date",
      "Impact on authorization compliance",
    ],
    recipients: ["primary_nca"],
    format: "free_text",
    legalBasis: "EU Space Act Art. 89",
  },
  {
    type: "ownership_transfer",
    title: "Ownership Transfer Notification",
    description: "Notification of change in spacecraft ownership or control",
    frequency: "within_72h",
    triggerConditions: [
      "Sale of spacecraft",
      "Transfer of operational control",
      "Corporate acquisition affecting space assets",
      "Change in controlling shareholder",
    ],
    requiredContent: [
      "Affected assets",
      "Previous owner/controller",
      "New owner/controller",
      "Transfer effective date",
      "Authorization transfer arrangements",
    ],
    recipients: ["primary_nca", "euspa"],
    format: "structured_form",
    legalBasis: "EU Space Act Art. 36",
  },
];

// Incident categories
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus =
  | "detected"
  | "investigating"
  | "contained"
  | "resolved"
  | "reported";

export interface IncidentCategory {
  id: string;
  name: string;
  description: string;
  defaultSeverity: IncidentSeverity;
  reportingDeadline: string;
  examples: string[];
}

export const incidentCategories: IncidentCategory[] = [
  {
    id: "spacecraft_anomaly",
    name: "Spacecraft Anomaly",
    description: "Unexpected behavior or degradation of spacecraft systems",
    defaultSeverity: "high",
    reportingDeadline: "24 hours",
    examples: [
      "Attitude control malfunction",
      "Power system degradation",
      "Thermal anomaly",
      "Unexpected safe mode entry",
      "Sensor failure",
    ],
  },
  {
    id: "loss_of_contact",
    name: "Loss of Contact",
    description: "Inability to communicate with spacecraft",
    defaultSeverity: "critical",
    reportingDeadline: "Immediate (within 4 hours)",
    examples: [
      "Complete communication blackout",
      "Telemetry loss > 24h",
      "Command link failure",
      "Ground station network outage",
    ],
  },
  {
    id: "conjunction_event",
    name: "Conjunction / Close Approach",
    description: "Potential collision with space debris or other objects",
    defaultSeverity: "high",
    reportingDeadline: "72 hours",
    examples: [
      "High-probability conjunction warning",
      "Collision avoidance maneuver required",
      "Actual close approach < 1km",
      "Untracked object encounter",
    ],
  },
  {
    id: "debris_generation",
    name: "Debris Generation Event",
    description: "Creation of new orbital debris from operated asset",
    defaultSeverity: "critical",
    reportingDeadline: "Immediate (within 4 hours)",
    examples: [
      "Fragmentation event",
      "Unintentional release of objects",
      "Collision (actual)",
      "Explosion / breakup",
    ],
  },
  {
    id: "cyber_incident",
    name: "Cybersecurity Incident",
    description: "Security breach affecting space or ground systems",
    defaultSeverity: "critical",
    reportingDeadline: "Immediate (within 4 hours)",
    examples: [
      "Unauthorized system access",
      "Malware infection",
      "Data breach",
      "Ransomware attack",
      "Command injection attempt",
    ],
  },
  {
    id: "regulatory_breach",
    name: "Regulatory Non-Compliance",
    description: "Deviation from authorization conditions",
    defaultSeverity: "medium",
    reportingDeadline: "72 hours",
    examples: [
      "Orbital parameter deviation",
      "Unauthorized frequency use",
      "Insurance lapse",
      "Documentation failure",
    ],
  },
];

// Calendar event types
export type CalendarEventType =
  | "report_due"
  | "inspection_scheduled"
  | "audit_scheduled"
  | "authorization_renewal"
  | "insurance_renewal"
  | "certification_expiry"
  | "regulatory_deadline"
  | "internal_review";

export const calendarEventTypes: Record<
  CalendarEventType,
  { label: string; color: string; icon: string }
> = {
  report_due: { label: "Report Due", color: "blue", icon: "FileText" },
  inspection_scheduled: {
    label: "Inspection",
    color: "orange",
    icon: "Search",
  },
  audit_scheduled: { label: "Audit", color: "purple", icon: "ClipboardCheck" },
  authorization_renewal: {
    label: "Authorization Renewal",
    color: "red",
    icon: "FileCheck",
  },
  insurance_renewal: {
    label: "Insurance Renewal",
    color: "amber",
    icon: "Shield",
  },
  certification_expiry: {
    label: "Certification Expiry",
    color: "red",
    icon: "Award",
  },
  regulatory_deadline: {
    label: "Regulatory Deadline",
    color: "red",
    icon: "AlertTriangle",
  },
  internal_review: { label: "Internal Review", color: "gray", icon: "Eye" },
};

// Helper function to get NCA by country code
export function getNCAByCountry(countryCode: string): NationalAuthority | null {
  return nationalAuthorities[countryCode.toUpperCase()] || null;
}

// Helper function to get all EU member NCAs
export function getEUMemberNCAs(): NationalAuthority[] {
  return Object.values(nationalAuthorities).filter(
    (nca) => nca.isEUMember && nca.countryCode !== "EU",
  );
}

// Helper function to generate incident number
export function generateIncidentNumber(year: number, sequence: number): string {
  return `INC-${year}-${sequence.toString().padStart(3, "0")}`;
}
