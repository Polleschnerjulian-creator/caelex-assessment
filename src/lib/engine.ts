/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Client-Safe Engine Exports
 *
 * This file re-exports types and interfaces needed by client components.
 * All compliance calculation logic has been moved to engine.server.ts
 * which uses "server-only" to prevent client-side bundling.
 *
 * DO NOT add any compliance calculation logic to this file.
 * DO NOT import the regulatory JSON data in this file.
 */

// Re-export types that client components need
export type {
  AssessmentAnswers,
  AssessmentState,
  ComplianceResult,
  RedactedComplianceResult,
  Article,
  RedactedArticle,
  ModuleStatus,
  ChecklistItem,
  KeyDate,
  OperatorTypeKey,
  OperatorAbbreviation,
  ModuleStatusType,
  RegimeType,
} from "./types";
