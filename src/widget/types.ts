/**
 * Widget Type Definitions
 */

export type WidgetType = "quick-check" | "compliance-badge" | "nis2-classifier";
export type WidgetTheme = "dark" | "light";
export type WidgetLocale = "en" | "de" | "fr" | "es";

export interface WidgetConfig {
  type: WidgetType;
  theme: WidgetTheme;
  locale: WidgetLocale;
  apiUrl: string;
  widgetId?: string;
}

export interface QuickCheckResult {
  operatorType: string;
  operatorTypeLabel: string;
  regime: string;
  regimeLabel: string;
  applicableArticleCount: number;
  totalArticles: number;
  topModules: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  ctaUrl: string;
}

export interface NIS2ClassifyResult {
  classification: string;
  reason: string;
  articleRef: string;
  penaltyRange: string;
  ctaUrl: string;
}
