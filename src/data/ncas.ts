// EU Member States and their National Competent Authorities (NCAs) for Space Activities
// Based on EU Space Act Art. 6-16

export interface NCA {
  id: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  name: string;
  shortName: string;
  website?: string;
  email?: string;
  hasSpaceLaw: boolean;
  notes?: string;
}

export const ncas: NCA[] = [
  {
    id: "de",
    country: "Germany",
    countryCode: "DE",
    name: "German Space Agency at DLR",
    shortName: "DLR",
    website: "https://www.dlr.de/en/the-dlr/about-us/german-space-agency",
    hasSpaceLaw: true,
    notes: "Established space law framework since 2020",
  },
  {
    id: "fr",
    country: "France",
    countryCode: "FR",
    name: "Centre National d'Études Spatiales",
    shortName: "CNES",
    website: "https://cnes.fr",
    hasSpaceLaw: true,
    notes: "Comprehensive space law (Loi relative aux opérations spatiales)",
  },
  {
    id: "it",
    country: "Italy",
    countryCode: "IT",
    name: "Agenzia Spaziale Italiana",
    shortName: "ASI",
    website: "https://www.asi.it",
    hasSpaceLaw: true,
  },
  {
    id: "es",
    country: "Spain",
    countryCode: "ES",
    name: "Agencia Espacial Española",
    shortName: "AEE",
    website: "https://www.aee.gob.es",
    hasSpaceLaw: false,
    notes: "Space law in development",
  },
  {
    id: "nl",
    country: "Netherlands",
    countryCode: "NL",
    name: "Netherlands Space Office",
    shortName: "NSO",
    website: "https://www.spaceoffice.nl",
    hasSpaceLaw: true,
    notes: "Dutch Space Activities Act (2015)",
  },
  {
    id: "be",
    country: "Belgium",
    countryCode: "BE",
    name: "Belgian Federal Science Policy Office",
    shortName: "BELSPO",
    website: "https://www.belspo.be",
    hasSpaceLaw: true,
    notes: "Belgian Space Law (2005)",
  },
  {
    id: "at",
    country: "Austria",
    countryCode: "AT",
    name: "Austrian Research Promotion Agency",
    shortName: "FFG",
    website: "https://www.ffg.at",
    hasSpaceLaw: true,
    notes: "Austrian Outer Space Act (2011)",
  },
  {
    id: "se",
    country: "Sweden",
    countryCode: "SE",
    name: "Swedish National Space Agency",
    shortName: "SNSA",
    website: "https://www.rymdstyrelsen.se",
    hasSpaceLaw: true,
  },
  {
    id: "dk",
    country: "Denmark",
    countryCode: "DK",
    name: "Danish Agency for Science and Higher Education",
    shortName: "DAHES",
    website: "https://ufm.dk",
    hasSpaceLaw: true,
    notes: "Danish Outer Space Act (2016)",
  },
  {
    id: "fi",
    country: "Finland",
    countryCode: "FI",
    name: "Ministry of Economic Affairs and Employment",
    shortName: "MEAE",
    website: "https://tem.fi",
    hasSpaceLaw: true,
    notes: "Finnish Act on Space Activities (2018)",
  },
  {
    id: "pt",
    country: "Portugal",
    countryCode: "PT",
    name: "Portugal Space Agency",
    shortName: "PT Space",
    website: "https://ptspace.pt",
    hasSpaceLaw: false,
    notes: "Space law in development",
  },
  {
    id: "pl",
    country: "Poland",
    countryCode: "PL",
    name: "Polish Space Agency",
    shortName: "POLSA",
    website: "https://polsa.gov.pl",
    hasSpaceLaw: false,
    notes: "Space law in development",
  },
  {
    id: "cz",
    country: "Czech Republic",
    countryCode: "CZ",
    name: "Czech Space Office",
    shortName: "CSO",
    website: "https://www.czechspace.cz",
    hasSpaceLaw: false,
  },
  {
    id: "ie",
    country: "Ireland",
    countryCode: "IE",
    name: "Enterprise Ireland",
    shortName: "EI",
    website: "https://www.enterprise-ireland.com",
    hasSpaceLaw: false,
  },
  {
    id: "gr",
    country: "Greece",
    countryCode: "GR",
    name: "Hellenic Space Center",
    shortName: "HSC",
    website: "https://hsc.gov.gr",
    hasSpaceLaw: false,
  },
  {
    id: "hu",
    country: "Hungary",
    countryCode: "HU",
    name: "Hungarian Space Office",
    shortName: "HSO",
    website: "https://space.gov.hu",
    hasSpaceLaw: false,
  },
  {
    id: "ro",
    country: "Romania",
    countryCode: "RO",
    name: "Romanian Space Agency",
    shortName: "ROSA",
    website: "https://www.rosa.ro",
    hasSpaceLaw: true,
  },
  {
    id: "lu",
    country: "Luxembourg",
    countryCode: "LU",
    name: "Luxembourg Space Agency",
    shortName: "LSA",
    website: "https://space-agency.lu",
    hasSpaceLaw: true,
    notes: "Luxembourg Space Law (2017)",
  },
  {
    id: "ee",
    country: "Estonia",
    countryCode: "EE",
    name: "Estonian Space Office",
    shortName: "ESO",
    website: "https://www.eas.ee",
    hasSpaceLaw: false,
  },
  {
    id: "lv",
    country: "Latvia",
    countryCode: "LV",
    name: "Ministry of Education and Science",
    shortName: "MoES",
    website: "https://www.izm.gov.lv",
    hasSpaceLaw: false,
  },
  {
    id: "lt",
    country: "Lithuania",
    countryCode: "LT",
    name: "Lithuanian Space Office",
    shortName: "LSO",
    website: "https://www.lsa.lt",
    hasSpaceLaw: false,
  },
  {
    id: "sk",
    country: "Slovakia",
    countryCode: "SK",
    name: "Slovak Space Office",
    shortName: "SSKO",
    website: "https://www.sosa.sk",
    hasSpaceLaw: false,
  },
  {
    id: "si",
    country: "Slovenia",
    countryCode: "SI",
    name: "Slovenian Space Office",
    shortName: "SLOSI",
    website: "https://www.space.si",
    hasSpaceLaw: false,
  },
  {
    id: "hr",
    country: "Croatia",
    countryCode: "HR",
    name: "Croatian Space Agency",
    shortName: "CSA",
    hasSpaceLaw: false,
  },
  {
    id: "bg",
    country: "Bulgaria",
    countryCode: "BG",
    name: "Bulgarian Space Agency",
    shortName: "BSA",
    website: "https://www.space.bas.bg",
    hasSpaceLaw: false,
  },
  {
    id: "cy",
    country: "Cyprus",
    countryCode: "CY",
    name: "Cyprus Space Exploration Organisation",
    shortName: "CSEO",
    hasSpaceLaw: false,
  },
  {
    id: "mt",
    country: "Malta",
    countryCode: "MT",
    name: "Malta Council for Science and Technology",
    shortName: "MCST",
    website: "https://mcst.gov.mt",
    hasSpaceLaw: false,
  },
];

// EUSPA for third country operators
export const euspa: NCA = {
  id: "euspa",
  country: "European Union",
  countryCode: "EU",
  name: "European Union Agency for the Space Programme",
  shortName: "EUSPA",
  website: "https://www.euspa.europa.eu",
  hasSpaceLaw: true,
  notes: "Responsible for Third Country Operator registration under Art. 14",
};

// Authorization pathway types
export type AuthorizationPathway =
  | "national_authorization" // EU operators → National NCA
  | "euspa_registration" // Third country operators → EUSPA
  | "commission_decision"; // Special cases → Commission

export interface NCADetermination {
  primaryNCA: NCA;
  secondaryNCAs?: NCA[];
  pathway: AuthorizationPathway;
  relevantArticles: number[];
  requirements: string[];
  estimatedTimeline: string;
  notes?: string;
}

// Determine the appropriate NCA(s) based on operator profile
export function determineNCA(
  operatorType: string,
  establishmentCountry: string | null,
  launchCountry?: string | null,
  isThirdCountry: boolean = false,
): NCADetermination {
  // Third country operators go through EUSPA
  if (isThirdCountry) {
    return {
      primaryNCA: euspa,
      pathway: "euspa_registration",
      relevantArticles: [14, 15, 16],
      requirements: [
        "Designate an EU legal representative (Art. 14(2))",
        "Submit registration application to EUSPA",
        "Provide proof of authorization in country of origin",
        "Third-party liability insurance valid in EU",
        "Technical documentation in official EU language",
      ],
      estimatedTimeline: "6-12 months",
      notes:
        "Third country operators must register with EUSPA before providing services in the EU market",
    };
  }

  // Find primary NCA based on establishment country
  const primaryNCA = ncas.find(
    (nca) =>
      nca.countryCode === establishmentCountry ||
      nca.id === establishmentCountry?.toLowerCase(),
  );

  if (!primaryNCA) {
    // Default to EUSPA if no country found
    return {
      primaryNCA: euspa,
      pathway: "commission_decision",
      relevantArticles: [6, 7, 8],
      requirements: [
        "Determine establishment status",
        "Consult with relevant national authorities",
      ],
      estimatedTimeline: "TBD",
    };
  }

  // Launch operators may need multiple NCAs
  if (operatorType === "launch_operator" || operatorType === "LO") {
    const secondaryNCAs: NCA[] = [];

    if (launchCountry && launchCountry !== establishmentCountry) {
      const launchNCA = ncas.find(
        (nca) =>
          nca.countryCode === launchCountry ||
          nca.id === launchCountry?.toLowerCase(),
      );
      if (launchNCA) {
        secondaryNCAs.push(launchNCA);
      }
    }

    return {
      primaryNCA,
      secondaryNCAs: secondaryNCAs.length > 0 ? secondaryNCAs : undefined,
      pathway: "national_authorization",
      relevantArticles: [6, 7, 8, 9, 10, 11, 12],
      requirements: [
        "Authorization from NCA of establishment state (Art. 6)",
        "Coordination with launch state NCA if different (Art. 7)",
        "Technical safety assessment for launch operations",
        "Environmental impact assessment",
        "Third-party liability insurance",
        "Debris mitigation plan",
        "Launch site safety documentation",
      ],
      estimatedTimeline: "12-18 months",
      notes: primaryNCA.hasSpaceLaw
        ? `${primaryNCA.country} has established space law framework`
        : `${primaryNCA.country} may need to develop procedures under EU Space Act`,
    };
  }

  // Launch site operators
  if (operatorType === "launch_site_operator" || operatorType === "LSO") {
    return {
      primaryNCA,
      pathway: "national_authorization",
      relevantArticles: [6, 7, 8, 17, 18, 19, 20, 21],
      requirements: [
        "Authorization from NCA (Art. 6)",
        "Launch site license application",
        "Environmental impact assessment",
        "Safety zone establishment",
        "Emergency response procedures",
        "Third-party liability insurance",
        "Ground infrastructure documentation",
      ],
      estimatedTimeline: "18-24 months",
      notes:
        "Launch site authorization requires additional environmental and safety assessments",
    };
  }

  // Default: Spacecraft operators
  return {
    primaryNCA,
    pathway: "national_authorization",
    relevantArticles: [6, 7, 8, 9, 10, 11, 12, 13],
    requirements: [
      "Authorization application to NCA (Art. 6)",
      "Mission description and objectives",
      "Technical specifications of space object",
      "Debris mitigation plan (Art. 58-72)",
      "Third-party liability insurance (Art. 44-51)",
      "Cybersecurity risk assessment (Art. 74-95)",
      "End-of-life disposal plan",
      "Environmental footprint declaration (if applicable)",
    ],
    estimatedTimeline: "9-12 months",
    notes: primaryNCA.hasSpaceLaw
      ? `${primaryNCA.country} has established space law framework`
      : `${primaryNCA.country} will implement procedures under EU Space Act`,
  };
}

// Get NCA by country code
export function getNCAByCountry(countryCode: string): NCA | undefined {
  return ncas.find(
    (nca) =>
      nca.countryCode === countryCode || nca.id === countryCode.toLowerCase(),
  );
}

// Get all NCAs with established space law
export function getNCAsWithSpaceLaw(): NCA[] {
  return ncas.filter((nca) => nca.hasSpaceLaw);
}
