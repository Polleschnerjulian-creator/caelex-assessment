/**
 * ASTRA (Autonomous Space & Telecommunications Regulatory Agent) Types
 *
 * Comprehensive type definitions for the AI compliance copilot system.
 */

// ─── Core Message Types ───

export type AstraMessageRole = "user" | "assistant" | "system";

export type AstraMessageType =
  | "text"
  | "document_card"
  | "interactive_input"
  | "bulk_progress"
  | "compliance_impact"
  | "source_list"
  | "action_list";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ConversationMode =
  | "general"
  | "assessment"
  | "document"
  | "analysis";

// ─── Source & Citation Types ───

export interface AstraSource {
  /** Regulation name: "EU Space Act" | "NIS2" | "German Space Law" etc. */
  regulation: string;
  /** Article reference: "Art. 58(2)(a)" */
  article: string;
  /** Article title */
  title: string;
  /** Confidence in the citation */
  confidence: ConfidenceLevel;
  /** Relevant excerpt from the regulation */
  excerpt?: string;
  /** URL to the official source if available */
  url?: string;
}

// ─── Action Types ───

export type AstraActionType =
  | "navigate"
  | "generate"
  | "assess"
  | "download"
  | "api_call";

export interface AstraAction {
  /** Display label for the action button */
  label: string;
  /** Type of action */
  type: AstraActionType;
  /** Target route, action identifier, or API endpoint */
  target: string;
  /** Priority for display ordering */
  priority: "high" | "medium" | "low";
  /** Optional icon identifier */
  icon?: string;
  /** Optional description */
  description?: string;
}

// ─── Document Types ───

export interface AstraDocument {
  /** Document type identifier */
  type: string;
  /** Document title */
  title: string;
  /** Generation status */
  status: "pending" | "generating" | "draft" | "reviewed" | "final" | "error";
  /** Estimated page count */
  estimatedPages?: number;
  /** Articles referenced in the document */
  articlesReferenced?: string[];
  /** Download URL if available */
  downloadUrl?: string;
  /** Error message if generation failed */
  error?: string;
}

// ─── Compliance Impact Types ───

export interface ComplianceImpact {
  /** Affected compliance module */
  module: string;
  /** Current compliance score (0-100) */
  currentScore: number;
  /** Projected score after recommended actions */
  projectedScore: number;
  /** List of affected articles */
  affectedArticles: string[];
  /** Risk level */
  riskLevel?: "low" | "medium" | "high" | "critical";
  /** Deadline if applicable */
  deadline?: Date;
}

// ─── Main Response Type ───

export interface AstraResponse {
  /** Main response text (markdown supported) */
  message: string;
  /** Overall confidence level for the response */
  confidence: ConfidenceLevel;
  /** Regulatory references cited */
  sources: AstraSource[];
  /** Suggested next steps */
  actions: AstraAction[];
  /** Related Caelex modules */
  relatedModules: string[];
  /** Generated or referenced documents */
  documents?: AstraDocument[];
  /** Compliance impact assessment */
  complianceImpact?: ComplianceImpact;
  /** Processing metadata */
  metadata?: {
    /** Tool calls made during processing */
    toolCalls?: AstraToolCall[];
    /** Tokens used */
    tokensUsed?: number;
    /** Processing time in ms */
    processingTimeMs?: number;
    /** Language detected/used */
    language?: "en" | "de";
  };
}

// ─── Tool Types (Anthropic format) ───

export interface AstraToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AstraToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AstraToolResult {
  toolCallId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── Context Types ───

export interface AstraArticleContext {
  mode: "article";
  articleId: string;
  articleRef: string;
  title: string;
  severity: string;
  regulationType: string;
}

export interface AstraCategoryContext {
  mode: "category";
  category: string;
  categoryLabel: string;
  articles: Array<{
    id: string;
    articleRef: string;
    title: string;
    severity: string;
  }>;
  regulationType: string;
}

export interface AstraModuleContext {
  mode: "module";
  moduleId: string;
  moduleName: string;
}

export interface AstraGeneralContext {
  mode: "general";
}

export type AstraContext =
  | AstraArticleContext
  | AstraCategoryContext
  | AstraModuleContext
  | AstraGeneralContext;

// ─── User Context (from database) ───

export interface AstraUserContext {
  userId: string;
  organizationId: string;
  organizationName: string;
  /** User's jurisdiction */
  jurisdiction?: string;
  /** Operator type classification */
  operatorType?: string;
  /** NIS2 entity classification */
  nis2Classification?: "essential" | "important" | "out_of_scope";
  /** Current compliance scores by module */
  complianceScores?: Record<string, number>;
  /** Active assessment results */
  assessments?: {
    euSpaceAct?: {
      completed: boolean;
      operatorType?: string;
      applicableArticles?: number;
      completedArticles?: number;
    };
    nis2?: {
      completed: boolean;
      entityType?: string;
      applicableRequirements?: number;
      completedRequirements?: number;
    };
    debris?: {
      completed: boolean;
      orbitRegime?: string;
      riskLevel?: string;
    };
    cybersecurity?: {
      completed: boolean;
      maturityLevel?: number;
      framework?: string;
    };
    insurance?: {
      completed: boolean;
      coverageAdequate?: boolean;
      tplAmount?: number;
    };
  };
  /** Authorization workflow status */
  authorizationStatus?: {
    state: string;
    currentStep?: string;
    completedDocuments?: number;
    totalDocuments?: number;
  };
  /** Upcoming deadlines */
  upcomingDeadlines?: Array<{
    title: string;
    date: Date;
    module: string;
    priority: string;
  }>;
  /** Document vault summary */
  documentSummary?: {
    totalDocuments: number;
    expiringWithin30Days: number;
    missingRequired: number;
  };
}

// ─── Mission Data ───

export interface AstraMissionData {
  missionName?: string;
  orbitType?: "LEO" | "MEO" | "GEO" | "HEO" | "SSO" | "other";
  altitudeKm?: number;
  inclinationDeg?: number;
  operatorType?: string;
  propulsionType?: "chemical" | "electric" | "none" | "hybrid";
  satelliteCount?: number;
  satelliteMassKg?: number;
  missionDurationYears?: number;
  deorbitStrategy?:
    | "natural_decay"
    | "active_deorbit"
    | "graveyard"
    | "passivation";
  launchDate?: Date;
  endOfLifeDate?: Date;
  targetMarkets?: string[];
  dataProcessingCountries?: string[];
  [key: string]: unknown;
}

// ─── Conversation Types ───

export interface AstraConversationMessage {
  id: string;
  role: AstraMessageRole;
  content: string;
  toolCalls?: AstraToolCall[];
  toolResults?: AstraToolResult[];
  sources?: AstraSource[];
  confidence?: ConfidenceLevel;
  timestamp: Date;
}

export interface AstraConversation {
  id: string;
  userId: string;
  organizationId: string;
  mode: ConversationMode;
  messages: AstraConversationMessage[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Request/Response Types ───

export interface AstraChatRequest {
  message: string;
  conversationId?: string;
  context?: {
    moduleId?: string;
    articleId?: string;
    mode?: ConversationMode;
  };
  missionData?: AstraMissionData;
}

export interface AstraChatResponse {
  conversationId: string;
  response: AstraResponse;
  /** Remaining queries for the user's tier */
  remainingQueries?: number;
}

// ─── Engine Interface ───

export interface AstraEngine {
  /** Process a user message and return a response */
  processMessage(
    message: string,
    userContext: AstraUserContext,
    conversationHistory: AstraConversationMessage[],
    context?: AstraContext,
    missionData?: AstraMissionData,
  ): Promise<AstraResponse>;

  /** Get a contextual greeting for the user */
  getGreeting(
    userContext: AstraUserContext,
    context?: AstraContext,
  ): AstraResponse;
}

// ─── Regulatory Knowledge Types ───

export interface EUSpaceActArticle {
  id: string;
  number: string;
  title: string;
  chapter: string;
  section?: string;
  summary: string;
  keyRequirements: string[];
  applicableOperatorTypes: string[];
  relatedArticles: string[];
  complianceCriteria: string[];
  deadlines?: string[];
  penalties?: string;
  lightRegimeApplicable?: boolean;
}

export interface NIS2Requirement {
  id: string;
  category: string;
  categoryCode: string;
  title: string;
  description: string;
  implementationGuidance: string[];
  timelineRequirements?: string;
  articleReference: string;
  applicableEntityTypes: ("essential" | "important")[];
  spaceSpecificConsiderations?: string;
}

export interface JurisdictionProfile {
  countryCode: string;
  countryName: string;
  ncaName: string;
  ncaAbbreviation: string;
  processingTimeDays: {
    standard: number;
    expedited?: number;
  };
  insuranceMinimums: {
    tplMinimum: number;
    currency: string;
    notes?: string;
  };
  liabilityRegime: string;
  specialRequirements: string[];
  favorabilityScore: number;
  languageRequirements: string[];
  fees?: {
    application?: number;
    annual?: number;
    currency: string;
  };
  contacts?: {
    website?: string;
    email?: string;
    phone?: string;
  };
}

export interface CrossRegulationMapping {
  id: string;
  sourceRegulation: string;
  sourceArticle: string;
  targetRegulation: string;
  targetArticle: string;
  overlapType: "single_implementation" | "partial_overlap" | "separate_effort";
  description: string;
  timeSavingsPercent?: number;
  implementationNotes?: string;
}

export interface GlossaryTerm {
  abbreviation: string;
  fullName: string;
  definition: string;
  regulatoryContext: string[];
  relatedTerms: string[];
  examples?: string[];
}

// ─── Legacy types for backward compatibility ───

/** @deprecated Use AstraConversationMessage instead */
export interface AstraMessage {
  id: string;
  role: "astra" | "user";
  type: AstraMessageType;
  content: string;
  timestamp: Date;
  metadata?: {
    documentMeta?: {
      documentType: string;
      documentTitle: string;
      articleRef: string;
      status: "generating" | "draft" | "reviewed" | "final";
      estimatedPages: number;
      articlesReferenced: string[];
    };
    interactiveField?: string;
    interactiveOptions?: Array<{
      id: string;
      label: string;
      type: "chip" | "text_input" | "dropdown";
      value?: string;
      selected?: boolean;
      options?: string[];
    }>;
    bulkItems?: Array<{
      id: string;
      articleRef: string;
      title: string;
      checked: boolean;
      status: "pending" | "generating" | "complete" | "error";
    }>;
    // New fields for enhanced responses
    sources?: AstraSource[];
    actions?: AstraAction[];
    confidence?: ConfidenceLevel;
    complianceImpact?: ComplianceImpact;
  };
}

export interface AstraInteractiveOption {
  id: string;
  label: string;
  type: "chip" | "text_input" | "dropdown";
  value?: string;
  selected?: boolean;
  options?: string[];
}

export interface AstraBulkItem {
  id: string;
  articleRef: string;
  title: string;
  checked: boolean;
  status: "pending" | "generating" | "complete" | "error";
}

export interface AstraDocumentMeta {
  documentType: string;
  documentTitle: string;
  articleRef: string;
  status: "generating" | "draft" | "reviewed" | "final";
  estimatedPages: number;
  articlesReferenced: string[];
}
