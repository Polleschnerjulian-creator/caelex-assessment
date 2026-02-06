/**
 * Document Completeness Service
 *
 * Evaluates document completeness for authorization workflows
 * and provides detailed gap analysis and recommendations.
 */

import { prisma } from "@/lib/prisma";
import {
  getDocumentsForOperatorType,
  getRequiredDocuments,
  type AuthorizationDocumentTemplate,
} from "@/data/authorization-documents";

/**
 * Document status that counts as "complete"
 */
const COMPLETE_STATUSES = ["ready", "approved", "submitted"];

/**
 * Document status that counts as "in progress"
 */
const IN_PROGRESS_STATUSES = ["in_progress", "under_review"];

/**
 * Gap criticality levels
 */
export type GapCriticality = "mandatory" | "recommended" | "conditional";

/**
 * Individual document gap
 */
export interface DocumentGap {
  documentType: string;
  name: string;
  description: string;
  criticality: GapCriticality;
  articleRef?: string;
  category: string;
  estimatedEffort: "low" | "medium" | "high";
  suggestedAction: string;
  tips?: string[];
  currentStatus?: string;
  reason: "missing" | "incomplete" | "rejected" | "expired";
}

/**
 * Document that is complete
 */
export interface CompletedDocument {
  documentType: string;
  name: string;
  status: string;
  completedAt?: Date;
  articleRef?: string;
  required: boolean;
}

/**
 * Blocker that prevents submission
 */
export interface SubmissionBlocker {
  type: "missing_mandatory" | "rejected_document" | "validation_error";
  documentType?: string;
  documentName?: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Completeness report for a workflow
 */
export interface CompletenessReport {
  workflowId: string;
  operatorType: string;
  evaluatedAt: Date;

  // Overall metrics
  overallPercentage: number;
  mandatoryPercentage: number;
  optionalPercentage: number;

  // Counts
  totalDocuments: number;
  totalRequired: number;
  totalOptional: number;
  completedDocuments: number;
  completedMandatory: number;
  completedOptional: number;
  inProgressDocuments: number;

  // Status
  mandatoryComplete: boolean;
  readyForSubmission: boolean;

  // Details
  gaps: DocumentGap[];
  blockers: SubmissionBlocker[];
  completedList: CompletedDocument[];
  recommendations: string[];

  // Phase summary
  byCategory: {
    category: string;
    total: number;
    complete: number;
    percentage: number;
  }[];
}

/**
 * Calculate completeness report for a workflow
 */
export async function calculateCompletenessReport(
  workflowId: string,
): Promise<CompletenessReport | null> {
  // Get workflow with documents
  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      documents: true,
    },
  });

  if (!workflow) {
    return null;
  }

  const operatorType = workflow.operatorType || "SCO";
  const evaluatedAt = new Date();

  // Get template requirements
  const requiredTemplates = getRequiredDocuments(operatorType);
  const allTemplates = getDocumentsForOperatorType(operatorType);
  const optionalTemplates = allTemplates.filter((t) => !t.required);

  // Create lookup maps
  const templatesByType = new Map<string, AuthorizationDocumentTemplate>();
  for (const template of allTemplates) {
    templatesByType.set(template.type, template);
  }

  const documentsByType = new Map<string, (typeof workflow.documents)[0]>();
  for (const doc of workflow.documents) {
    documentsByType.set(doc.documentType, doc);
  }

  // Calculate completeness
  const gaps: DocumentGap[] = [];
  const blockers: SubmissionBlocker[] = [];
  const completedList: CompletedDocument[] = [];
  const recommendations: string[] = [];

  let completedMandatory = 0;
  let completedOptional = 0;
  let inProgressDocuments = 0;

  // Category tracking
  const categoryStats = new Map<string, { total: number; complete: number }>();

  // Check all required documents
  for (const template of requiredTemplates) {
    const doc = documentsByType.get(template.type);
    const category = template.category;

    // Initialize category stats
    if (!categoryStats.has(category)) {
      categoryStats.set(category, { total: 0, complete: 0 });
    }
    const catStats = categoryStats.get(category)!;
    catStats.total++;

    if (!doc) {
      // Missing document
      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "mandatory",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Create and complete "${template.name}" as required by ${template.articleRef}`,
        tips: template.tips,
        reason: "missing",
      });

      blockers.push({
        type: "missing_mandatory",
        documentType: template.type,
        documentName: template.name,
        message: `Missing mandatory document: ${template.name}`,
        severity: "error",
      });
    } else if (COMPLETE_STATUSES.includes(doc.status)) {
      // Complete
      completedMandatory++;
      catStats.complete++;

      completedList.push({
        documentType: doc.documentType,
        name: doc.name,
        status: doc.status,
        completedAt: doc.completedAt ?? undefined,
        articleRef: doc.articleRef ?? undefined,
        required: doc.required,
      });
    } else if (doc.status === "rejected") {
      // Rejected
      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "mandatory",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Revise and resubmit "${template.name}" addressing rejection feedback`,
        tips: template.tips,
        currentStatus: doc.status,
        reason: "rejected",
      });

      blockers.push({
        type: "rejected_document",
        documentType: template.type,
        documentName: template.name,
        message: `Document rejected: ${template.name}. Please revise and resubmit.`,
        severity: "error",
      });
    } else if (IN_PROGRESS_STATUSES.includes(doc.status)) {
      // In progress
      inProgressDocuments++;

      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "mandatory",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Complete "${template.name}" to mark as ready`,
        tips: template.tips,
        currentStatus: doc.status,
        reason: "incomplete",
      });
    } else {
      // Not started
      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "mandatory",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Start working on "${template.name}"`,
        tips: template.tips,
        currentStatus: doc.status,
        reason: "incomplete",
      });

      blockers.push({
        type: "missing_mandatory",
        documentType: template.type,
        documentName: template.name,
        message: `Document not started: ${template.name}`,
        severity: "error",
      });
    }
  }

  // Check optional documents
  for (const template of optionalTemplates) {
    const doc = documentsByType.get(template.type);
    const category = template.category;

    // Initialize category stats
    if (!categoryStats.has(category)) {
      categoryStats.set(category, { total: 0, complete: 0 });
    }
    const catStats = categoryStats.get(category)!;
    catStats.total++;

    if (doc && COMPLETE_STATUSES.includes(doc.status)) {
      completedOptional++;
      catStats.complete++;

      completedList.push({
        documentType: doc.documentType,
        name: doc.name,
        status: doc.status,
        completedAt: doc.completedAt ?? undefined,
        articleRef: doc.articleRef ?? undefined,
        required: doc.required,
      });
    } else if (doc && IN_PROGRESS_STATUSES.includes(doc.status)) {
      inProgressDocuments++;

      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "recommended",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Consider completing "${template.name}" for a stronger application`,
        tips: template.tips,
        currentStatus: doc.status,
        reason: "incomplete",
      });
    } else if (!doc) {
      // Missing optional - only add if recommended
      gaps.push({
        documentType: template.type,
        name: template.name,
        description: template.description,
        criticality: "recommended",
        articleRef: template.articleRef,
        category: template.category,
        estimatedEffort: template.estimatedEffort,
        suggestedAction: `Consider adding "${template.name}" to strengthen your application`,
        tips: template.tips,
        reason: "missing",
      });
    }
  }

  // Generate recommendations
  if (blockers.length === 0) {
    recommendations.push(
      "All mandatory documents are complete. You can proceed with submission.",
    );
  } else if (blockers.length <= 3) {
    recommendations.push(
      `You have ${blockers.length} mandatory document(s) remaining before you can submit.`,
    );
  } else {
    recommendations.push(
      `Focus on completing mandatory documents first. ${blockers.length} items require attention.`,
    );
  }

  // Category-specific recommendations
  const categoryArray = Array.from(categoryStats.entries());
  for (const [category, stats] of categoryArray) {
    if (stats.complete === 0 && stats.total > 0) {
      recommendations.push(
        `No ${category} documents completed yet. Consider starting with these.`,
      );
    } else if (stats.complete < stats.total) {
      const remaining = stats.total - stats.complete;
      recommendations.push(`${remaining} ${category} document(s) remaining.`);
    }
  }

  // High-effort items warning
  const highEffortGaps = gaps.filter(
    (g) => g.estimatedEffort === "high" && g.criticality === "mandatory",
  );
  if (highEffortGaps.length > 0) {
    recommendations.push(
      `${highEffortGaps.length} mandatory document(s) require significant effort. Plan accordingly.`,
    );
  }

  // Calculate percentages
  const totalRequired = requiredTemplates.length;
  const totalOptional = optionalTemplates.length;
  const totalDocuments = totalRequired + totalOptional;

  const mandatoryPercentage =
    totalRequired > 0
      ? Math.round((completedMandatory / totalRequired) * 100)
      : 100;

  const optionalPercentage =
    totalOptional > 0
      ? Math.round((completedOptional / totalOptional) * 100)
      : 100;

  const overallPercentage =
    totalDocuments > 0
      ? Math.round(
          ((completedMandatory + completedOptional) / totalDocuments) * 100,
        )
      : 100;

  const mandatoryComplete = completedMandatory === totalRequired;
  const readyForSubmission = mandatoryComplete && blockers.length === 0;

  // Build category summary
  const byCategory = Array.from(categoryStats.entries()).map(
    ([category, stats]) => ({
      category,
      total: stats.total,
      complete: stats.complete,
      percentage:
        stats.total > 0
          ? Math.round((stats.complete / stats.total) * 100)
          : 100,
    }),
  );

  return {
    workflowId,
    operatorType,
    evaluatedAt,
    overallPercentage,
    mandatoryPercentage,
    optionalPercentage,
    totalDocuments,
    totalRequired,
    totalOptional,
    completedDocuments: completedMandatory + completedOptional,
    completedMandatory,
    completedOptional,
    inProgressDocuments,
    mandatoryComplete,
    readyForSubmission,
    gaps,
    blockers,
    completedList,
    recommendations,
    byCategory,
  };
}

/**
 * Quick check if workflow is ready for submission
 */
export async function isWorkflowReadyForSubmission(
  workflowId: string,
): Promise<{ ready: boolean; blockers: SubmissionBlocker[] }> {
  const report = await calculateCompletenessReport(workflowId);

  if (!report) {
    return {
      ready: false,
      blockers: [
        {
          type: "validation_error",
          message: "Workflow not found",
          severity: "error",
        },
      ],
    };
  }

  return {
    ready: report.readyForSubmission,
    blockers: report.blockers,
  };
}

/**
 * Get prioritized action items for a workflow
 */
export async function getPrioritizedActions(
  workflowId: string,
  limit = 5,
): Promise<DocumentGap[]> {
  const report = await calculateCompletenessReport(workflowId);

  if (!report) {
    return [];
  }

  // Sort by criticality and effort
  const sorted = [...report.gaps].sort((a, b) => {
    // Mandatory first
    if (a.criticality === "mandatory" && b.criticality !== "mandatory") {
      return -1;
    }
    if (b.criticality === "mandatory" && a.criticality !== "mandatory") {
      return 1;
    }

    // Then by effort (low effort first for quick wins)
    const effortOrder = { low: 0, medium: 1, high: 2 };
    return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort];
  });

  return sorted.slice(0, limit);
}

/**
 * Get missing document types for a workflow
 */
export async function getMissingDocumentTypes(
  workflowId: string,
): Promise<string[]> {
  const report = await calculateCompletenessReport(workflowId);

  if (!report) {
    return [];
  }

  return report.gaps
    .filter((g) => g.reason === "missing")
    .map((g) => g.documentType);
}

/**
 * Estimate time to completion based on remaining documents
 */
export interface CompletionEstimate {
  lowEffortDays: number;
  mediumEffortDays: number;
  highEffortDays: number;
  totalEstimatedDays: number;
  confidence: "high" | "medium" | "low";
}

export async function estimateCompletionTime(
  workflowId: string,
): Promise<CompletionEstimate | null> {
  const report = await calculateCompletenessReport(workflowId);

  if (!report) {
    return null;
  }

  // Effort estimates in working days
  const EFFORT_DAYS = {
    low: 2,
    medium: 5,
    high: 10,
  };

  const mandatoryGaps = report.gaps.filter(
    (g) => g.criticality === "mandatory",
  );

  let lowEffortDays = 0;
  let mediumEffortDays = 0;
  let highEffortDays = 0;

  for (const gap of mandatoryGaps) {
    switch (gap.estimatedEffort) {
      case "low":
        lowEffortDays += EFFORT_DAYS.low;
        break;
      case "medium":
        mediumEffortDays += EFFORT_DAYS.medium;
        break;
      case "high":
        highEffortDays += EFFORT_DAYS.high;
        break;
    }
  }

  // Total with some parallelization assumed (70% of sum)
  const rawTotal = lowEffortDays + mediumEffortDays + highEffortDays;
  const totalEstimatedDays = Math.ceil(rawTotal * 0.7);

  // Confidence based on number of remaining items
  let confidence: "high" | "medium" | "low";
  if (mandatoryGaps.length <= 2) {
    confidence = "high";
  } else if (mandatoryGaps.length <= 5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    lowEffortDays,
    mediumEffortDays,
    highEffortDays,
    totalEstimatedDays,
    confidence,
  };
}
