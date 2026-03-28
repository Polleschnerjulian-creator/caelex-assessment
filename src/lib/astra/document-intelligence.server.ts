import "server-only";

export interface RequirementCheck {
  id: string;
  requirement: string;
  articleRef: string;
  found: boolean;
  matchedKeywords: string[];
  confidence: "high" | "medium" | "low";
}

export interface DocumentAnalysis {
  documentName: string;
  moduleType: string;
  totalRequirements: number;
  metRequirements: number;
  coveragePercent: number;
  checks: RequirementCheck[];
  missingRequirements: RequirementCheck[];
  suggestions: string[];
}

// Requirement definitions per module with keywords to search for
const MODULE_REQUIREMENTS: Record<
  string,
  Array<{
    id: string;
    requirement: string;
    articleRef: string;
    keywords: string[][]; // Each inner array is an AND-group: all keywords must match. Outer is OR.
    weight: number; // 1-3 importance
  }>
> = {
  debris: [
    {
      id: "debris-1",
      requirement: "End-of-life disposal strategy",
      articleRef: "Art. 58-59",
      keywords: [
        ["end-of-life", "disposal"],
        ["deorbit", "strategy"],
        ["end of life", "plan"],
        ["25-year", "rule"],
        ["25 year", "disposal"],
      ],
      weight: 3,
    },
    {
      id: "debris-2",
      requirement: "Collision avoidance capability",
      articleRef: "Art. 62",
      keywords: [
        ["collision", "avoidance"],
        ["maneuver", "capability"],
        ["conjunction", "assessment"],
      ],
      weight: 3,
    },
    {
      id: "debris-3",
      requirement: "Passivation measures",
      articleRef: "Art. 63",
      keywords: [
        ["passivation"],
        ["energy", "depletion"],
        ["fuel", "venting"],
        ["battery", "discharge"],
      ],
      weight: 2,
    },
    {
      id: "debris-4",
      requirement: "Trackability requirements",
      articleRef: "Art. 64",
      keywords: [
        ["trackab", "requirement"],
        ["radar", "cross", "section"],
        ["space", "surveillance"],
        ["tracking"],
      ],
      weight: 2,
    },
    {
      id: "debris-5",
      requirement: "Fragmentation risk assessment",
      articleRef: "Art. 65",
      keywords: [
        ["fragmentation", "risk"],
        ["break-up", "risk"],
        ["explosion", "prevention"],
      ],
      weight: 2,
    },
    {
      id: "debris-6",
      requirement: "Orbit selection justification",
      articleRef: "Art. 60",
      keywords: [
        ["orbit", "selection"],
        ["orbit", "justif"],
        ["protected", "region"],
      ],
      weight: 1,
    },
  ],
  cybersecurity: [
    {
      id: "cyber-1",
      requirement: "Information security policy",
      articleRef: "NIS2 Art. 21(2)(a)",
      keywords: [
        ["information", "security", "policy"],
        ["security", "policy"],
        ["isms"],
        ["iso", "27001"],
      ],
      weight: 3,
    },
    {
      id: "cyber-2",
      requirement: "Incident handling procedures",
      articleRef: "NIS2 Art. 21(2)(b)",
      keywords: [
        ["incident", "handling"],
        ["incident", "response"],
        ["security", "incident"],
        ["breach", "notification"],
      ],
      weight: 3,
    },
    {
      id: "cyber-3",
      requirement: "Business continuity",
      articleRef: "NIS2 Art. 21(2)(c)",
      keywords: [
        ["business", "continuity"],
        ["disaster", "recovery"],
        ["backup", "restore"],
      ],
      weight: 2,
    },
    {
      id: "cyber-4",
      requirement: "Supply chain security",
      articleRef: "NIS2 Art. 21(2)(d)",
      keywords: [
        ["supply", "chain"],
        ["vendor", "security"],
        ["third", "party", "risk"],
        ["supplier", "assessment"],
      ],
      weight: 2,
    },
    {
      id: "cyber-5",
      requirement: "Vulnerability management",
      articleRef: "NIS2 Art. 21(2)(e)",
      keywords: [
        ["vulnerability", "management"],
        ["patch", "management"],
        ["vulnerability", "scanning"],
        ["penetration", "test"],
      ],
      weight: 2,
    },
    {
      id: "cyber-6",
      requirement: "Encryption and cryptography",
      articleRef: "NIS2 Art. 21(2)(h)",
      keywords: [
        ["encryption"],
        ["cryptograph"],
        ["tls"],
        ["key", "management"],
      ],
      weight: 2,
    },
    {
      id: "cyber-7",
      requirement: "Access control",
      articleRef: "NIS2 Art. 21(2)(i)",
      keywords: [
        ["access", "control"],
        ["authentication"],
        ["authorization"],
        ["multi-factor"],
        ["mfa"],
      ],
      weight: 2,
    },
    {
      id: "cyber-8",
      requirement: "Personnel security",
      articleRef: "NIS2 Art. 21(2)(g)",
      keywords: [
        ["personnel", "security"],
        ["security", "training"],
        ["awareness", "program"],
        ["background", "check"],
      ],
      weight: 1,
    },
  ],
  insurance: [
    {
      id: "ins-1",
      requirement: "Third-party liability coverage",
      articleRef: "Art. 44-45",
      keywords: [
        ["third-party", "liab"],
        ["third party", "liab"],
        ["tpl"],
        ["liability", "coverage"],
      ],
      weight: 3,
    },
    {
      id: "ins-2",
      requirement: "Coverage amount specification",
      articleRef: "Art. 46",
      keywords: [
        ["coverage", "amount"],
        ["sum", "insured"],
        ["limit", "liability"],
        ["€", "million"],
        ["eur", "million"],
      ],
      weight: 3,
    },
    {
      id: "ins-3",
      requirement: "Financial guarantee",
      articleRef: "Art. 47",
      keywords: [
        ["financial", "guarantee"],
        ["bank", "guarantee"],
        ["letter", "credit"],
        ["deposit"],
      ],
      weight: 2,
    },
    {
      id: "ins-4",
      requirement: "Risk assessment",
      articleRef: "Art. 48",
      keywords: [
        ["risk", "assessment"],
        ["risk", "analysis"],
        ["hazard", "analysis"],
      ],
      weight: 2,
    },
  ],
  environmental: [
    {
      id: "env-1",
      requirement: "Environmental footprint declaration",
      articleRef: "Art. 96",
      keywords: [
        ["environmental", "footprint"],
        ["efd"],
        ["lifecycle", "assessment"],
        ["lca"],
      ],
      weight: 3,
    },
    {
      id: "env-2",
      requirement: "Atmospheric pollution assessment",
      articleRef: "Art. 98",
      keywords: [
        ["atmospheric", "pollution"],
        ["emission"],
        ["atmospheric", "impact"],
        ["re-entry", "pollution"],
      ],
      weight: 2,
    },
    {
      id: "env-3",
      requirement: "Light pollution mitigation",
      articleRef: "Art. 99",
      keywords: [
        ["light", "pollution"],
        ["brightness"],
        ["reflectivity"],
        ["albedo"],
      ],
      weight: 1,
    },
  ],
};

/**
 * Analyze a document's text content against compliance requirements.
 * No AI/API calls — pure keyword/pattern matching.
 */
export function analyzeDocument(
  documentText: string,
  moduleType: string,
  documentName: string,
): DocumentAnalysis {
  const requirements = MODULE_REQUIREMENTS[moduleType];
  if (!requirements) {
    return {
      documentName,
      moduleType,
      totalRequirements: 0,
      metRequirements: 0,
      coveragePercent: 0,
      checks: [],
      missingRequirements: [],
      suggestions: [
        `Module "${moduleType}" wird nicht unterstützt. Verfügbar: ${Object.keys(MODULE_REQUIREMENTS).join(", ")}`,
      ],
    };
  }

  const lowerText = documentText.toLowerCase();
  const checks: RequirementCheck[] = [];

  for (const req of requirements) {
    const matchedKeywords: string[] = [];
    let found = false;

    for (const keywordGroup of req.keywords) {
      const allMatch = keywordGroup.every((kw) =>
        lowerText.includes(kw.toLowerCase()),
      );
      if (allMatch) {
        found = true;
        matchedKeywords.push(keywordGroup.join(" + "));
      }
    }

    // Determine confidence based on number of keyword groups matched
    const matchCount = matchedKeywords.length;
    const confidence =
      matchCount >= 3 ? "high" : matchCount >= 1 ? "medium" : "low";

    checks.push({
      id: req.id,
      requirement: req.requirement,
      articleRef: req.articleRef,
      found,
      matchedKeywords,
      confidence: found ? confidence : "low",
    });
  }

  const metRequirements = checks.filter((c) => c.found).length;
  const missingRequirements = checks.filter((c) => !c.found);
  const coveragePercent =
    requirements.length > 0
      ? Math.round((metRequirements / requirements.length) * 100)
      : 0;

  // Generate suggestions
  const suggestions: string[] = [];
  const criticalMissing = missingRequirements.filter((c) => {
    const req = requirements.find((r) => r.id === c.id);
    return req && req.weight >= 3;
  });

  if (criticalMissing.length > 0) {
    suggestions.push(
      `Kritische Lücken: ${criticalMissing.map((c) => `${c.requirement} (${c.articleRef})`).join(", ")}`,
    );
  }

  if (coveragePercent < 50) {
    suggestions.push(
      "Das Dokument deckt weniger als 50% der Anforderungen ab. Erwäge eine Überarbeitung.",
    );
  } else if (coveragePercent < 80) {
    suggestions.push("Gute Grundlage, aber einige Anforderungen fehlen noch.");
  } else if (coveragePercent === 100) {
    suggestions.push(
      "Alle geprüften Anforderungen sind abgedeckt. Gut gemacht!",
    );
  }

  if (documentText.length < 500) {
    suggestions.push(
      "Das Dokument ist sehr kurz. Überprüfe ob alle Anforderungen ausreichend detailliert behandelt werden.",
    );
  }

  return {
    documentName,
    moduleType,
    totalRequirements: requirements.length,
    metRequirements,
    coveragePercent,
    checks,
    missingRequirements,
    suggestions,
  };
}

export function getSupportedModules(): string[] {
  return Object.keys(MODULE_REQUIREMENTS);
}
