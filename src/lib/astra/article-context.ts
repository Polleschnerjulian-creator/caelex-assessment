// ─── Article Context Mapping for ASTRA ───
// Maps regulation types and articles to contextual greetings and data requirements

interface ArticleContextInfo {
  greetingTemplate: string;
  requiredDocuments: string[];
  dataFields: string[];
  relatedArticles: string[];
}

// Context for specific regulation types at the module level
const regulationContext: Record<
  string,
  { label: string; description: string }
> = {
  DEBRIS: {
    label: "Debris Mitigation",
    description:
      "Space debris mitigation, end-of-life disposal, and collision avoidance requirements under the EU Space Act.",
  },
  CYBERSECURITY: {
    label: "Cybersecurity",
    description:
      "Cybersecurity requirements including NIS2-aligned measures for space systems under the EU Space Act.",
  },
  NIS2: {
    label: "NIS2 Directive",
    description:
      "NIS2 Directive (EU 2022/2555) requirements for network and information security in the space sector.",
  },
  AUTHORIZATION: {
    label: "Authorization & Licensing",
    description:
      "Authorization and licensing requirements for space activities under the EU Space Act.",
  },
  ENVIRONMENTAL: {
    label: "Environmental Footprint",
    description:
      "Environmental footprint declarations and lifecycle assessment requirements.",
  },
  INSURANCE: {
    label: "Insurance & Liability",
    description:
      "Third-party liability insurance and financial responsibility requirements.",
  },
  SUPERVISION: {
    label: "Supervision & Reporting",
    description:
      "Supervisory obligations and reporting requirements for space operators.",
  },
  REGISTRATION: {
    label: "Registration",
    description: "URSO registry and space object registration requirements.",
  },
};

// Contextual article data for common articles
const articleContextMap: Record<string, ArticleContextInfo> = {
  // Debris articles
  "Art. 58": {
    greetingTemplate:
      "Ich kann Ihnen bei den allgemeinen Debris-Mitigation-Anforderungen (Art. 58) helfen. Dieser Artikel legt die Grundprinzipien der Debris-Vermeidung fest.",
    requiredDocuments: ["Debris Mitigation Plan", "Compliance Statement"],
    dataFields: ["orbitType", "altitudeKm", "missionDuration"],
    relatedArticles: ["Art. 59", "Art. 60", "Art. 67"],
  },
  "Art. 63": {
    greetingTemplate:
      "Ich kann Ihnen bei den Trackability Requirements (Art. 63) helfen. Dieser Artikel erfordert Nachweise zur Verfolgbarkeit Ihres Raumfahrzeugs, einschliesslich Radar-Querschnittsanalyse und Identifizierbarkeit.",
    requiredDocuments: [
      "Trackability Assessment",
      "Radar Cross-Section Analysis",
    ],
    dataFields: ["orbitType", "altitudeKm", "satelliteCount"],
    relatedArticles: ["Art. 64", "Art. 65"],
  },
  "Art. 64": {
    greetingTemplate:
      "Ich kann Ihnen bei der Collision Avoidance Service Subscription (Art. 64) helfen. Sie muessen nachweisen, dass Sie einen aktiven Collision-Avoidance-Service nutzen.",
    requiredDocuments: [
      "CA Service Agreement",
      "Maneuver Capability Assessment",
    ],
    dataFields: ["orbitType", "propulsion", "altitudeKm"],
    relatedArticles: ["Art. 63", "Art. 65", "Art. 66"],
  },
  "Art. 66": {
    greetingTemplate:
      "Ich kann Ihnen bei den Manoeuvrability Requirements (Art. 66) helfen. Dieser Artikel verlangt Nachweise ueber die Manoevrierfaehigkeit Ihres Raumfahrzeugs fuer Ausweichmanoever.",
    requiredDocuments: [
      "Maneuver Capability Report",
      "Propulsion System Specs",
    ],
    dataFields: ["propulsion", "orbitType", "satelliteCount"],
    relatedArticles: ["Art. 64", "Art. 67"],
  },
  "Art. 67": {
    greetingTemplate:
      "Ich kann Ihnen beim Debris Mitigation Plan (Art. 67) helfen. Dieser Artikel erfordert einen umfassenden Plan nach ISO 24113:2019, der folgende 5 Bereiche abdecken muss:\n\n- Collision Avoidance (CA)\n- End-of-Life (EOL)\n- Fragmentierung\n- Passivierung\n- 25-Jahre Compliance\n\nUm den Plan zu generieren, benoetige ich einige Informationen zu Ihrer Mission. Soll ich mit den Fragen starten?",
    requiredDocuments: [
      "Debris Mitigation Plan (ISO 24113:2019)",
      "End-of-Life Plan",
      "Passivation Plan",
    ],
    dataFields: [
      "orbitType",
      "altitudeKm",
      "propulsion",
      "deorbitStrategy",
      "missionDuration",
    ],
    relatedArticles: ["Art. 58", "Art. 68", "Art. 69", "Art. 70"],
  },
  "Art. 68": {
    greetingTemplate:
      "Ich kann Ihnen bei der End-of-Life Disposal (Art. 68) helfen. Sie muessen eine Strategie fuer das geordnete Missionsende nachweisen.",
    requiredDocuments: ["End-of-Life Plan", "De-orbit Analysis"],
    dataFields: [
      "orbitType",
      "altitudeKm",
      "deorbitStrategy",
      "missionDuration",
    ],
    relatedArticles: ["Art. 67", "Art. 69"],
  },
  // Cybersecurity articles
  "Art. 74": {
    greetingTemplate:
      "Ich kann Ihnen bei der Information Security Policy (Art. 74) helfen. Dieser Artikel erfordert eine dokumentierte Informationssicherheitsrichtlinie fuer Ihre Raumfahrtaktivitaeten.",
    requiredDocuments: ["Information Security Policy", "ISMS Documentation"],
    dataFields: ["operatorType"],
    relatedArticles: ["Art. 75", "Art. 76"],
  },
  "Art. 75": {
    greetingTemplate:
      "Ich kann Ihnen beim Risk Assessment (Art. 75) helfen. Dieser Artikel verlangt eine umfassende Risikobewertung fuer Ihre Raumfahrtsysteme.",
    requiredDocuments: ["Risk Assessment Report", "Risk Treatment Plan"],
    dataFields: ["operatorType", "orbitType"],
    relatedArticles: ["Art. 74", "Art. 76", "Art. 77"],
  },
};

/**
 * Get contextual greeting for an article
 */
export function getArticleGreeting(
  articleRef: string,
  title: string,
  severity: string,
  regulationType: string,
): string {
  const ctx = articleContextMap[articleRef];
  if (ctx) {
    return ctx.greetingTemplate;
  }

  // Fallback: generate a generic greeting based on available info
  const regCtx = regulationContext[regulationType];
  const severityLabel =
    severity === "critical"
      ? "kritischer"
      : severity === "major"
        ? "wichtiger"
        : "relevanter";

  return `Ich kann Ihnen bei ${articleRef} "${title}" helfen. Dies ist ein ${severityLabel} Compliance-Artikel${regCtx ? ` im Bereich ${regCtx.label}` : ""}.\n\nWelche Art von Unterstuetzung benoetigen Sie?\n\n- Compliance-Dokument generieren\n- Anforderungen erklaeren\n- Evidence-Checkliste erstellen`;
}

/**
 * Get contextual greeting for a category (bulk mode)
 */
export function getCategoryGreeting(
  categoryLabel: string,
  articles: Array<{ articleRef: string; title: string }>,
  regulationType: string,
): string {
  const articleList = articles
    .slice(0, 8)
    .map((a) => `- ${a.articleRef}: ${a.title}`)
    .join("\n");
  const moreText =
    articles.length > 8 ? `\n- ... und ${articles.length - 8} weitere` : "";

  return `Ich sehe, dass Sie an ${articles.length} Anforderungen im Bereich "${categoryLabel}" arbeiten. Ich kann Compliance-Dokumentation fuer mehrere Artikel gleichzeitig generieren.\n\n${articleList}${moreText}\n\nWaehlen Sie die Artikel aus, fuer die Sie Hilfe benoetigen, und starten Sie die Generierung.`;
}

/**
 * Get general greeting (no article context)
 */
export function getGeneralGreeting(): string {
  return `Willkommen! Ich bin ASTRA, Ihr AI Compliance Agent.\nIch kann Ihnen bei folgenden Aufgaben helfen:\n\n- Compliance-Dokumente fuer einzelne Artikel generieren\n- Bulk-Generierung fuer komplette Kategorien\n- Fragen zum EU Space Act beantworten\n- Compliance-Gaps analysieren\n\nWaehlen Sie einen Artikel in Ihrem Assessment aus und klicken Sie "Use ASTRA", oder stellen Sie mir direkt eine Frage.`;
}

/**
 * Get article context info for data fields and documents
 */
export function getArticleContextInfo(
  articleRef: string,
): ArticleContextInfo | null {
  return articleContextMap[articleRef] || null;
}

/**
 * Get regulation type label
 */
export function getRegulationLabel(regulationType: string): string {
  return regulationContext[regulationType]?.label || regulationType;
}
