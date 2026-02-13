/**
 * ASTRA Response Formatter
 *
 * Formats ASTRA's raw responses into structured output with
 * sources, confidence levels, actions, and compliance impact.
 */

import type {
  AstraResponse,
  AstraSource,
  AstraAction,
  AstraDocument,
  ComplianceImpact,
  ConfidenceLevel,
  AstraToolCall,
} from "./types";

// ─── Source Extraction Patterns ───

const SOURCE_PATTERNS = [
  // EU Space Act articles
  {
    pattern:
      /(?:EU Space Act|Space Act)\s*(?:Art(?:icle)?\.?\s*)?(\d+(?:\([^)]+\))?(?:\([^)]+\))?)/gi,
    regulation: "EU Space Act",
    extractArticle: (match: RegExpMatchArray) => `Art. ${match[1]}`,
  },
  // NIS2 articles
  {
    pattern:
      /NIS2?\s*(?:Directive)?\s*(?:Art(?:icle)?\.?\s*)?(\d+(?:\([^)]+\))?(?:\([^)]+\))?)/gi,
    regulation: "NIS2 Directive",
    extractArticle: (match: RegExpMatchArray) => `Art. ${match[1]}`,
  },
  // IADC Guidelines
  {
    pattern: /IADC\s*(?:Guideline|Guidelines)\s*(\d+(?:\.\d+)?)/gi,
    regulation: "IADC Guidelines",
    extractArticle: (match: RegExpMatchArray) => `Guideline ${match[1]}`,
  },
  // ISO standards
  {
    pattern: /ISO\s*(\d+(?::\d+)?)/gi,
    regulation: "ISO Standard",
    extractArticle: (match: RegExpMatchArray) => `ISO ${match[1]}`,
  },
  // National laws
  {
    pattern:
      /(?:French|FR)\s*(?:Space\s*)?(?:Operations\s*)?(?:Act|Law|LOS)\s*(?:Art(?:icle)?\.?\s*)?(\d+)?/gi,
    regulation: "French Space Operations Act",
    extractArticle: (match: RegExpMatchArray) =>
      match[1] ? `Art. ${match[1]}` : "General",
  },
  {
    pattern:
      /(?:UK|British)\s*(?:Space\s*)?(?:Industry\s*)?Act\s*(?:Section\s*)?(\d+)?/gi,
    regulation: "UK Space Industry Act",
    extractArticle: (match: RegExpMatchArray) =>
      match[1] ? `Section ${match[1]}` : "General",
  },
];

// ─── Confidence Detection ───

const HIGH_CONFIDENCE_INDICATORS = [
  "requires",
  "shall",
  "must",
  "mandatory",
  "obligated",
  "according to",
  "as stated in",
  "explicitly",
  "directly states",
];

const LOW_CONFIDENCE_INDICATORS = [
  "may",
  "could",
  "might",
  "possibly",
  "interpretation",
  "recommend consulting",
  "legal advice",
  "unclear",
  "ambiguous",
  "depends on",
];

function detectConfidence(text: string): ConfidenceLevel {
  const lowerText = text.toLowerCase();

  // Check for explicit confidence markers
  if (
    lowerText.includes("[high confidence]") ||
    lowerText.includes("(high confidence)")
  ) {
    return "HIGH";
  }
  if (
    lowerText.includes("[low confidence]") ||
    lowerText.includes("(low confidence)")
  ) {
    return "LOW";
  }
  if (
    lowerText.includes("[medium confidence]") ||
    lowerText.includes("(medium confidence)")
  ) {
    return "MEDIUM";
  }

  // Heuristic detection
  const highCount = HIGH_CONFIDENCE_INDICATORS.filter((i) =>
    lowerText.includes(i),
  ).length;
  const lowCount = LOW_CONFIDENCE_INDICATORS.filter((i) =>
    lowerText.includes(i),
  ).length;

  if (lowCount > highCount) return "LOW";
  if (highCount > 2) return "HIGH";
  return "MEDIUM";
}

// ─── Source Extraction ───

function extractSources(text: string): AstraSource[] {
  const sources: AstraSource[] = [];
  const seenSources = new Set<string>();

  for (const { pattern, regulation, extractArticle } of SOURCE_PATTERNS) {
    const regex = new RegExp(pattern);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const article = extractArticle(match);
      const key = `${regulation}:${article}`;

      if (!seenSources.has(key)) {
        seenSources.add(key);
        sources.push({
          regulation,
          article,
          title: getArticleTitle(regulation, article),
          confidence: detectConfidenceForSource(text, match.index),
        });
      }
    }
  }

  return sources;
}

function getArticleTitle(regulation: string, article: string): string {
  // Simplified - in production, look up actual titles
  const titles: Record<string, Record<string, string>> = {
    "EU Space Act": {
      "Art. 6": "Authorization Requirement",
      "Art. 8": "Authorization Application Contents",
      "Art. 10": "Light Regime Authorization",
      "Art. 21": "EU Registry of Space Objects",
      "Art. 31": "Debris Mitigation Requirements",
      "Art. 35": "Collision Avoidance",
      "Art. 58": "Mandatory Third-Party Liability Insurance",
      "Art. 74": "Cybersecurity Baseline Requirements",
      "Art. 83": "Cybersecurity Incident Reporting",
    },
    "NIS2 Directive": {
      "Art. 21": "Cybersecurity Risk-Management Measures",
      "Art. 23": "Incident Notification Obligations",
    },
  };

  return titles[regulation]?.[article] || article;
}

function detectConfidenceForSource(
  text: string,
  position: number,
): ConfidenceLevel {
  // Look at surrounding context (100 chars before and after)
  const start = Math.max(0, position - 100);
  const end = Math.min(text.length, position + 100);
  const context = text.substring(start, end);

  return detectConfidence(context);
}

// ─── Action Extraction ───

const ACTION_PATTERNS = [
  {
    pattern:
      /(?:run|complete|start)\s+(?:the\s+)?(?:debris|debris mitigation)\s+assessment/gi,
    action: {
      label: "Run Debris Assessment",
      type: "navigate" as const,
      target: "/dashboard/modules/debris",
      priority: "high" as const,
    },
  },
  {
    pattern:
      /(?:run|complete|start)\s+(?:the\s+)?(?:cyber|cybersecurity)\s+assessment/gi,
    action: {
      label: "Run Cybersecurity Assessment",
      type: "navigate" as const,
      target: "/dashboard/modules/cybersecurity",
      priority: "high" as const,
    },
  },
  {
    pattern: /(?:run|complete|start)\s+(?:the\s+)?(?:nis2|NIS2)\s+assessment/gi,
    action: {
      label: "Run NIS2 Assessment",
      type: "navigate" as const,
      target: "/dashboard/modules/nis2",
      priority: "high" as const,
    },
  },
  {
    pattern: /(?:verify|check|review)\s+(?:your\s+)?insurance/gi,
    action: {
      label: "Review Insurance Coverage",
      type: "navigate" as const,
      target: "/dashboard/modules/insurance",
      priority: "medium" as const,
    },
  },
  {
    pattern: /(?:generate|create)\s+(?:a\s+)?(?:compliance\s+)?report/gi,
    action: {
      label: "Generate Compliance Report",
      type: "generate" as const,
      target: "compliance_report",
      priority: "medium" as const,
    },
  },
  {
    pattern:
      /(?:start|begin|submit)\s+(?:the\s+)?authorization\s+(?:application|process)/gi,
    action: {
      label: "Start Authorization Process",
      type: "navigate" as const,
      target: "/dashboard/modules/authorization",
      priority: "high" as const,
    },
  },
  {
    pattern: /(?:compare|evaluate)\s+jurisdictions?/gi,
    action: {
      label: "Compare Jurisdictions",
      type: "navigate" as const,
      target: "/assessment/space-law",
      priority: "medium" as const,
    },
  },
];

function extractActions(text: string): AstraAction[] {
  const actions: AstraAction[] = [];
  const seenTargets = new Set<string>();

  for (const { pattern, action } of ACTION_PATTERNS) {
    if (pattern.test(text) && !seenTargets.has(action.target)) {
      seenTargets.add(action.target);
      actions.push(action);
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}

// ─── Related Modules Detection ───

const MODULE_KEYWORDS: Record<string, string[]> = {
  authorization: ["authorization", "authorisation", "license", "permit", "nca"],
  registration: ["registration", "registry", "urso"],
  debris: ["debris", "deorbit", "disposal", "collision"],
  cybersecurity: ["cyber", "security", "encryption", "incident", "nis2"],
  insurance: ["insurance", "liability", "tpl", "coverage"],
  environmental: ["environmental", "sustainability", "climate"],
  supervision: ["supervision", "monitoring", "reporting", "audit"],
  nis2: ["nis2", "essential entity", "important entity"],
};

function detectRelatedModules(text: string): string[] {
  const lowerText = text.toLowerCase();
  const modules: string[] = [];

  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      modules.push(module);
    }
  }

  return [...new Set(modules)];
}

// ─── Compliance Impact Extraction ───

function extractComplianceImpact(
  text: string,
  toolResults?: Array<{ data?: unknown }>,
): ComplianceImpact | undefined {
  // Look for compliance impact in tool results
  if (toolResults) {
    for (const result of toolResults) {
      const data = result.data as Record<string, unknown> | undefined;
      if (data?.complianceImpact) {
        return data.complianceImpact as ComplianceImpact;
      }
    }
  }

  // Try to detect from text
  const scoreMatch = text.match(/compliance\s+score[:\s]+(\d+)%/i);
  if (scoreMatch) {
    const modules = detectRelatedModules(text);
    if (modules.length > 0) {
      return {
        module: modules[0],
        currentScore: parseInt(scoreMatch[1], 10),
        projectedScore: parseInt(scoreMatch[1], 10),
        affectedArticles: [],
      };
    }
  }

  return undefined;
}

// ─── Main Formatter ───

export function formatResponse(
  rawMessage: string,
  toolCalls?: AstraToolCall[],
  toolResults?: Array<{ data?: unknown }>,
  processingTimeMs?: number,
): AstraResponse {
  // Clean up the message (remove explicit confidence markers from display)
  const cleanMessage = rawMessage
    .replace(/\[(HIGH|MEDIUM|LOW)\s+confidence\]/gi, "")
    .replace(/\((HIGH|MEDIUM|LOW)\s+confidence\)/gi, "")
    .trim();

  // Extract components
  const sources = extractSources(rawMessage);
  const actions = extractActions(rawMessage);
  const relatedModules = detectRelatedModules(rawMessage);
  const confidence = detectConfidence(rawMessage);
  const complianceImpact = extractComplianceImpact(rawMessage, toolResults);

  return {
    message: cleanMessage,
    confidence,
    sources,
    actions,
    relatedModules,
    complianceImpact,
    metadata: {
      toolCalls,
      processingTimeMs,
    },
  };
}

// ─── Response Builder (for creating responses programmatically) ───

export class AstraResponseBuilder {
  private message: string = "";
  private confidence: ConfidenceLevel = "MEDIUM";
  private sources: AstraSource[] = [];
  private actions: AstraAction[] = [];
  private relatedModules: string[] = [];
  private documents: AstraDocument[] = [];
  private complianceImpact?: ComplianceImpact;
  private toolCalls?: AstraToolCall[];
  private processingTimeMs?: number;

  setMessage(message: string): this {
    this.message = message;
    return this;
  }

  setConfidence(level: ConfidenceLevel): this {
    this.confidence = level;
    return this;
  }

  addSource(source: AstraSource): this {
    this.sources.push(source);
    return this;
  }

  addAction(action: AstraAction): this {
    this.actions.push(action);
    return this;
  }

  addModule(module: string): this {
    if (!this.relatedModules.includes(module)) {
      this.relatedModules.push(module);
    }
    return this;
  }

  addDocument(document: AstraDocument): this {
    this.documents.push(document);
    return this;
  }

  setComplianceImpact(impact: ComplianceImpact): this {
    this.complianceImpact = impact;
    return this;
  }

  setToolCalls(calls: AstraToolCall[]): this {
    this.toolCalls = calls;
    return this;
  }

  setProcessingTime(ms: number): this {
    this.processingTimeMs = ms;
    return this;
  }

  build(): AstraResponse {
    return {
      message: this.message,
      confidence: this.confidence,
      sources: this.sources,
      actions: this.actions,
      relatedModules: this.relatedModules,
      documents: this.documents.length > 0 ? this.documents : undefined,
      complianceImpact: this.complianceImpact,
      metadata: {
        toolCalls: this.toolCalls,
        processingTimeMs: this.processingTimeMs,
      },
    };
  }
}

// ─── Utility Functions ───

export function createGreetingResponse(
  organizationName?: string,
  complianceScores?: Record<string, number>,
): AstraResponse {
  let message: string;

  if (
    organizationName &&
    complianceScores &&
    Object.keys(complianceScores).length > 0
  ) {
    const avgScore = Math.round(
      Object.values(complianceScores).reduce((a, b) => a + b, 0) /
        Object.values(complianceScores).length,
    );
    message = `Hello! I'm ASTRA, your space regulatory compliance assistant. I can see ${organizationName} has an average compliance score of ${avgScore}%. How can I help you with your EU Space Act, NIS2, or national space law compliance today?`;
  } else if (organizationName) {
    message = `Hello! I'm ASTRA, your space regulatory compliance assistant for ${organizationName}. I can help you navigate EU Space Act requirements, NIS2 obligations, and national space laws. What would you like to know?`;
  } else {
    message = `Hello! I'm ASTRA, your AI compliance copilot for the space industry. I can help you with EU Space Act, NIS2 Directive, national space laws, and more. What regulatory questions can I answer for you?`;
  }

  return {
    message,
    confidence: "HIGH",
    sources: [],
    actions: [
      {
        label: "Run EU Space Act Assessment",
        type: "navigate",
        target: "/assessment/eu-space-act",
        priority: "medium",
      },
      {
        label: "Check NIS2 Classification",
        type: "navigate",
        target: "/assessment/nis2",
        priority: "medium",
      },
    ],
    relatedModules: [],
  };
}

export function createErrorResponse(error: string): AstraResponse {
  return {
    message: `I encountered an issue processing your request: ${error}. Please try rephrasing your question, or contact support if the problem persists.`,
    confidence: "HIGH",
    sources: [],
    actions: [],
    relatedModules: [],
  };
}
