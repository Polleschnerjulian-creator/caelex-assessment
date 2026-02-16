/**
 * Shared Assessment Field & Compliance Rule types
 *
 * Used by Debris, Cybersecurity, and NIS2 modules for
 * structured sub-question assessment forms and auto-suggest logic.
 */

export interface AssessmentField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "date";
  options?: { value: string; label: string }[];
  unit?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

export interface ComplianceRule {
  requiredTrue?: string[];
  requiredNotEmpty?: string[];
  numberThresholds?: Record<string, { min?: number; max?: number }>;
}
