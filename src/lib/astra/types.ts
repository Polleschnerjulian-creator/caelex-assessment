// ─── ASTRA Types ───
// Phase 1: UI Framework with mocked responses
// Phase 2: Replace MockAstraEngine with AnthropicAstraEngine

export type AstraMessageRole = "astra" | "user";

export type AstraMessageType =
  | "text"
  | "document_card"
  | "interactive_input"
  | "bulk_progress";

export interface AstraInteractiveOption {
  id: string;
  label: string;
  type: "chip" | "text_input" | "dropdown";
  value?: string;
  selected?: boolean;
  options?: string[]; // for dropdown type
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

export interface AstraMessage {
  id: string;
  role: AstraMessageRole;
  type: AstraMessageType;
  content: string;
  timestamp: Date;
  metadata?: {
    documentMeta?: AstraDocumentMeta;
    interactiveField?: string;
    interactiveOptions?: AstraInteractiveOption[];
    bulkItems?: AstraBulkItem[];
  };
}

// ─── Context types ───

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

export interface AstraGeneralContext {
  mode: "general";
}

export type AstraContext =
  | AstraArticleContext
  | AstraCategoryContext
  | AstraGeneralContext;

// ─── Mission Data ───

export interface AstraMissionData {
  orbitType?: string;
  altitudeKm?: number;
  operatorType?: string;
  missionName?: string;
  propulsion?: string;
  satelliteCount?: number;
  missionDuration?: string;
  deorbitStrategy?: string;
  [key: string]: unknown;
}

// ─── Engine Interface ───

export interface AstraEngine {
  getGreeting(context: AstraContext): AstraMessage;
  processMessage(
    text: string,
    context: AstraContext,
    missionData: AstraMissionData,
  ): Promise<AstraMessage[]>;
}
