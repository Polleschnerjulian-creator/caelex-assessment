/**
 * Dashboard Analytics Service
 *
 * Aggregates compliance data across all modules for dashboard display
 */

import { prisma } from "@/lib/prisma";
import {
  INCIDENT_CLASSIFICATION,
  calculateNCADeadline,
  type IncidentCategory,
} from "./incident-response-service";

// ============================================================================
// Types
// ============================================================================

export interface ModuleStatus {
  id: string;
  name: string;
  status: "compliant" | "partial" | "non_compliant" | "not_started" | "pending";
  score: number; // 0-100
  lastUpdated: Date | null;
  itemsComplete: number;
  itemsTotal: number;
  criticalIssues: number;
  nextDeadline: Date | null;
}

export interface ComplianceOverview {
  overallScore: number;
  overallStatus: "compliant" | "partial" | "non_compliant" | "not_started";
  modules: ModuleStatus[];
  criticalAlerts: number;
  pendingDeadlines: number;
  openIncidents: number;
  lastAssessmentDate: Date | null;
}

export interface DashboardMetrics {
  authorization: {
    workflowsActive: number;
    workflowsCompleted: number;
    documentsReady: number;
    documentsTotal: number;
    pendingSubmissions: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<string, number>;
    pendingNCANotifications: number;
    overdueNotifications: number;
  };
  debris: {
    assessmentsComplete: number;
    complianceScore: number;
    passivationPlans: number;
    deorbitPlans: number;
  };
  cybersecurity: {
    assessmentsComplete: number;
    maturityScore: number;
    hasIncidentResponsePlan: boolean;
    incidentsThisYear: number;
  };
  insurance: {
    assessmentComplete: number;
    calculatedTPL: number;
    complianceScore: number;
    riskLevel: string;
  };
  environmental: {
    efdSubmitted: boolean;
    suppliersContacted: number;
    suppliersResponded: number;
    totalGWP: number | null;
  };
  reports: {
    generatedThisMonth: number;
    submittedToNCA: number;
    pendingAcknowledgment: number;
  };
}

export interface TrendDataPoint {
  date: string;
  score: number;
  incidents: number;
  completedTasks: number;
}

export interface DashboardAlert {
  id: string;
  type: "deadline" | "incident" | "expiry" | "compliance" | "action_required";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  dueDate: Date | null;
  link?: string;
  resourceType?: string;
  resourceId?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get comprehensive compliance overview for a user
 */
export async function getComplianceOverview(
  userId: string,
): Promise<ComplianceOverview> {
  // Fetch all relevant data in parallel
  const [
    supervisionConfig,
    authorizationWorkflows,
    incidents,
    debrisAssessments,
    cybersecurityAssessments,
    insuranceAssessments,
    environmentalAssessments,
    deadlines,
  ] = await Promise.all([
    prisma.supervisionConfig.findUnique({ where: { userId } }),
    prisma.authorizationWorkflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.incident.findMany({
      where: {
        supervision: { userId },
      },
    }),
    prisma.debrisAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.insuranceAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.environmentalAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.deadline.findMany({
      where: {
        userId,
        status: { in: ["UPCOMING", "DUE_SOON"] },
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Calculate module statuses
  const modules: ModuleStatus[] = [
    calculateAuthorizationStatus(authorizationWorkflows),
    calculateDebrisStatus(debrisAssessments[0]),
    calculateCybersecurityStatus(cybersecurityAssessments[0]),
    calculateInsuranceStatus(insuranceAssessments[0]),
    calculateEnvironmentalStatus(environmentalAssessments[0]),
    calculateIncidentStatus(incidents),
  ];

  // Calculate overall score (weighted average)
  const weights = {
    authorization: 0.2,
    debris: 0.2,
    cybersecurity: 0.2,
    insurance: 0.15,
    environmental: 0.15,
    incidents: 0.1,
  };

  const overallScore = Math.round(
    modules.reduce((sum, module, index) => {
      const weight = Object.values(weights)[index] || 0.1;
      return sum + module.score * weight;
    }, 0),
  );

  // Determine overall status
  const overallStatus =
    overallScore >= 80
      ? "compliant"
      : overallScore >= 60
        ? "partial"
        : overallScore > 0
          ? "non_compliant"
          : "not_started";

  // Count critical alerts
  const openIncidents = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  ).length;
  const overdueIncidents = incidents.filter((i) => {
    if (i.reportedToNCA || !i.requiresNCANotification) return false;
    const deadline = calculateNCADeadline(
      i.category as IncidentCategory,
      i.detectedAt,
    );
    return new Date() > deadline;
  }).length;

  const criticalAlerts =
    overdueIncidents + modules.filter((m) => m.criticalIssues > 0).length;

  // Find last assessment date
  const allDates = [
    debrisAssessments[0]?.updatedAt,
    cybersecurityAssessments[0]?.updatedAt,
    insuranceAssessments[0]?.updatedAt,
    environmentalAssessments[0]?.updatedAt,
  ].filter(Boolean) as Date[];

  const lastAssessmentDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime())))
      : null;

  return {
    overallScore,
    overallStatus,
    modules,
    criticalAlerts,
    pendingDeadlines: deadlines.length,
    openIncidents,
    lastAssessmentDate,
  };
}

/**
 * Get detailed metrics for dashboard
 */
export async function getDashboardMetrics(
  userId: string,
): Promise<DashboardMetrics> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    authorizationWorkflows,
    incidents,
    debrisAssessments,
    cybersecurityAssessments,
    insuranceAssessments,
    environmentalAssessments,
    supervisionReports,
    supplierRequests,
  ] = await Promise.all([
    prisma.authorizationWorkflow.findMany({
      where: { userId },
      include: { documents: true },
    }),
    prisma.incident.findMany({
      where: { supervision: { userId } },
    }),
    prisma.debrisAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.insuranceAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.environmentalAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.supervisionReport.findMany({
      where: {
        supervision: { userId },
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    prisma.supplierDataRequest.findMany({
      where: { assessment: { userId } },
    }),
  ]);

  // Authorization metrics
  const activeWorkflows = authorizationWorkflows.filter(
    (w) => w.status !== "approved" && w.status !== "rejected",
  );
  const completedWorkflows = authorizationWorkflows.filter(
    (w) => w.status === "approved",
  );
  const allDocs = authorizationWorkflows.flatMap((w) => w.documents);
  const readyDocs = allDocs.filter((d) => d.status === "ready");

  // Incident metrics
  const openIncidents = incidents.filter(
    (i) => !["resolved", "closed"].includes(i.status),
  );
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved");
  const severityCounts = incidents.reduce(
    (acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const pendingNCA = incidents.filter(
    (i) =>
      i.requiresNCANotification && !i.reportedToNCA && i.status !== "resolved",
  );
  const overdueNCA = pendingNCA.filter((i) => {
    const deadline = calculateNCADeadline(
      i.category as IncidentCategory,
      i.detectedAt,
    );
    return now > deadline;
  });

  // Debris metrics
  const debris = debrisAssessments[0];

  // Cybersecurity metrics
  const cyber = cybersecurityAssessments[0];
  const cyberIncidents = incidents.filter(
    (i) => i.category === "cyber_incident" && i.detectedAt >= yearStart,
  );

  // Insurance metrics
  const insurance = insuranceAssessments[0];

  // Environmental metrics
  const env = environmentalAssessments[0];
  const respondedSuppliers = supplierRequests.filter(
    (r) => r.status === "completed",
  );

  // Reports metrics
  const submittedReports = supervisionReports.filter(
    (r) => r.status === "submitted",
  );
  const pendingAck = supervisionReports.filter(
    (r) => r.status === "submitted" && !r.acknowledgedAt,
  );

  return {
    authorization: {
      workflowsActive: activeWorkflows.length,
      workflowsCompleted: completedWorkflows.length,
      documentsReady: readyDocs.length,
      documentsTotal: allDocs.length,
      pendingSubmissions: activeWorkflows.filter(
        (w) => w.status === "ready_for_submission",
      ).length,
    },
    incidents: {
      total: incidents.length,
      open: openIncidents.length,
      resolved: resolvedIncidents.length,
      bySeverity: severityCounts,
      pendingNCANotifications: pendingNCA.length,
      overdueNotifications: overdueNCA.length,
    },
    debris: {
      assessmentsComplete: debris?.planGenerated ? 1 : 0,
      complianceScore: debris?.complianceScore || 0,
      passivationPlans: debris?.hasPassivationCap ? 1 : 0,
      deorbitPlans: debris?.deorbitStrategy ? 1 : 0,
    },
    cybersecurity: {
      assessmentsComplete: cyber?.frameworkGeneratedAt ? 1 : 0,
      maturityScore: cyber?.maturityScore || 0,
      hasIncidentResponsePlan: cyber?.hasIncidentResponsePlan || false,
      incidentsThisYear: cyberIncidents.length,
    },
    insurance: {
      assessmentComplete: insurance?.reportGenerated ? 1 : 0,
      calculatedTPL: insurance?.calculatedTPL || 0,
      complianceScore: insurance?.complianceScore || 0,
      riskLevel: insurance?.riskLevel || "unknown",
    },
    environmental: {
      efdSubmitted: ["submitted", "approved"].includes(env?.status || ""),
      suppliersContacted: supplierRequests.length,
      suppliersResponded: respondedSuppliers.length,
      totalGWP: env?.totalGWP || null,
    },
    reports: {
      generatedThisMonth: supervisionReports.length,
      submittedToNCA: submittedReports.length,
      pendingAcknowledgment: pendingAck.length,
    },
  };
}

/**
 * Get trend data for compliance score over time
 */
export async function getTrendData(
  userId: string,
  days: number = 30,
): Promise<TrendDataPoint[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Get audit logs for compliance changes
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      timestamp: { gte: startDate, lte: endDate },
      action: {
        in: [
          "assessment_completed",
          "document_uploaded",
          "incident_resolved",
          "workflow_approved",
        ],
      },
    },
    orderBy: { timestamp: "asc" },
  });

  // Get incidents for the period
  const incidents = await prisma.incident.findMany({
    where: {
      supervision: { userId },
      detectedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { detectedAt: "asc" },
  });

  // Generate daily data points
  const dataPoints: TrendDataPoint[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const completedTasks = auditLogs.filter(
      (log) => log.timestamp <= dayEnd,
    ).length;

    const incidentsToDate = incidents.filter(
      (i) => i.detectedAt <= dayEnd && i.status !== "resolved",
    ).length;

    // Simple score calculation based on completed tasks vs incidents
    const baseScore = 50;
    const taskBonus = Math.min(completedTasks * 2, 40);
    const incidentPenalty = Math.min(incidentsToDate * 5, 30);
    const score = Math.max(
      0,
      Math.min(100, baseScore + taskBonus - incidentPenalty),
    );

    dataPoints.push({
      date: dateStr,
      score,
      incidents: incidents.filter(
        (i) => i.detectedAt.toISOString().split("T")[0] === dateStr,
      ).length,
      completedTasks: auditLogs.filter(
        (log) => log.timestamp.toISOString().split("T")[0] === dateStr,
      ).length,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dataPoints;
}

/**
 * Get active alerts and upcoming deadlines
 */
export async function getDashboardAlerts(
  userId: string,
  limit: number = 10,
): Promise<DashboardAlert[]> {
  const now = new Date();
  const alerts: DashboardAlert[] = [];

  // Get overdue incident notifications
  const incidents = await prisma.incident.findMany({
    where: {
      supervision: { userId },
      requiresNCANotification: true,
      reportedToNCA: false,
      status: { notIn: ["resolved", "closed"] },
    },
  });

  for (const incident of incidents) {
    const deadline = calculateNCADeadline(
      incident.category as IncidentCategory,
      incident.detectedAt,
    );
    const isOverdue = now > deadline;

    if (isOverdue) {
      alerts.push({
        id: `incident-overdue-${incident.id}`,
        type: "incident",
        severity: "critical",
        title: `Overdue NCA Notification: ${incident.incidentNumber}`,
        description: `NCA notification was due ${formatTimeDiff(deadline, now)} ago`,
        dueDate: deadline,
        link: `/dashboard/supervision/incidents/${incident.id}`,
        resourceType: "Incident",
        resourceId: incident.id,
      });
    } else {
      const hoursRemaining =
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursRemaining < 24) {
        alerts.push({
          id: `incident-urgent-${incident.id}`,
          type: "deadline",
          severity: hoursRemaining < 4 ? "critical" : "high",
          title: `NCA Notification Due: ${incident.incidentNumber}`,
          description: `${Math.ceil(hoursRemaining)} hours remaining`,
          dueDate: deadline,
          link: `/dashboard/supervision/incidents/${incident.id}`,
          resourceType: "Incident",
          resourceId: incident.id,
        });
      }
    }
  }

  // Get upcoming deadlines
  const deadlines = await prisma.deadline.findMany({
    where: {
      userId,
      status: { in: ["UPCOMING", "DUE_SOON"] },
      dueDate: { gte: now },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  for (const deadline of deadlines) {
    const daysRemaining = Math.ceil(
      (deadline.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    alerts.push({
      id: `deadline-${deadline.id}`,
      type: "deadline",
      severity:
        daysRemaining <= 3 ? "high" : daysRemaining <= 7 ? "medium" : "low",
      title: deadline.title,
      description: deadline.description || `Due in ${daysRemaining} days`,
      dueDate: deadline.dueDate,
      link: `/dashboard/timeline`,
      resourceType: "Deadline",
      resourceId: deadline.id,
    });
  }

  // Get expiring insurance policies
  const expiringPolicies = await prisma.insurancePolicy.findMany({
    where: {
      assessment: { userId },
      status: "active",
      expirationDate: {
        gte: now,
        lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    take: 3,
  });

  for (const policy of expiringPolicies) {
    if (!policy.expirationDate) continue;
    const daysRemaining = Math.ceil(
      (policy.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    alerts.push({
      id: `insurance-expiry-${policy.id}`,
      type: "expiry",
      severity: daysRemaining <= 7 ? "high" : "medium",
      title: `Insurance Policy Expiring: ${policy.insuranceType}`,
      description: `Policy expires in ${daysRemaining} days`,
      dueDate: policy.expirationDate,
      link: `/dashboard/modules/insurance`,
      resourceType: "InsurancePolicy",
      resourceId: policy.id,
    });
  }

  // Sort by severity and due date
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    return 0;
  });

  return alerts.slice(0, limit);
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAuthorizationStatus(
  workflows: Array<{ status: string; updatedAt: Date }>,
): ModuleStatus {
  if (workflows.length === 0) {
    return {
      id: "authorization",
      name: "Authorization",
      status: "not_started",
      score: 0,
      lastUpdated: null,
      itemsComplete: 0,
      itemsTotal: 1,
      criticalIssues: 0,
      nextDeadline: null,
    };
  }

  const latestWorkflow = workflows[0];
  const approvedCount = workflows.filter((w) => w.status === "approved").length;

  let status: ModuleStatus["status"];
  let score: number;

  if (latestWorkflow.status === "approved") {
    status = "compliant";
    score = 100;
  } else if (latestWorkflow.status === "ready_for_submission") {
    status = "partial";
    score = 80;
  } else if (latestWorkflow.status === "in_progress") {
    status = "partial";
    score = 50;
  } else {
    status = "pending";
    score = 20;
  }

  return {
    id: "authorization",
    name: "Authorization",
    status,
    score,
    lastUpdated: latestWorkflow.updatedAt,
    itemsComplete: approvedCount,
    itemsTotal: workflows.length,
    criticalIssues: 0,
    nextDeadline: null,
  };
}

function calculateDebrisStatus(
  assessment:
    | {
        planGenerated?: boolean;
        complianceScore?: number | null;
        updatedAt: Date;
      }
    | undefined,
): ModuleStatus {
  if (!assessment) {
    return {
      id: "debris",
      name: "Debris Mitigation",
      status: "not_started",
      score: 0,
      lastUpdated: null,
      itemsComplete: 0,
      itemsTotal: 1,
      criticalIssues: 0,
      nextDeadline: null,
    };
  }

  const score = assessment.complianceScore || 0;
  const status =
    assessment.planGenerated && score >= 80
      ? "compliant"
      : assessment.planGenerated
        ? "partial"
        : "pending";

  return {
    id: "debris",
    name: "Debris Mitigation",
    status,
    score,
    lastUpdated: assessment.updatedAt,
    itemsComplete: assessment.planGenerated ? 1 : 0,
    itemsTotal: 1,
    criticalIssues: 0,
    nextDeadline: null,
  };
}

function calculateCybersecurityStatus(
  assessment:
    | {
        frameworkGeneratedAt?: Date | null;
        maturityScore?: number | null;
        updatedAt: Date;
      }
    | undefined,
): ModuleStatus {
  if (!assessment) {
    return {
      id: "cybersecurity",
      name: "Cybersecurity",
      status: "not_started",
      score: 0,
      lastUpdated: null,
      itemsComplete: 0,
      itemsTotal: 1,
      criticalIssues: 0,
      nextDeadline: null,
    };
  }

  const score = assessment.maturityScore || 0;
  const isCompleted = !!assessment.frameworkGeneratedAt;

  const status =
    isCompleted && score >= 80
      ? "compliant"
      : isCompleted
        ? "partial"
        : "pending";

  return {
    id: "cybersecurity",
    name: "Cybersecurity",
    status,
    score,
    lastUpdated: assessment.updatedAt,
    itemsComplete: isCompleted ? 1 : 0,
    itemsTotal: 1,
    criticalIssues: 0,
    nextDeadline: null,
  };
}

function calculateInsuranceStatus(
  assessment:
    | {
        reportGenerated?: boolean;
        complianceScore?: number | null;
        calculatedTPL?: number | null;
        updatedAt: Date;
      }
    | undefined,
): ModuleStatus {
  if (!assessment) {
    return {
      id: "insurance",
      name: "Insurance",
      status: "not_started",
      score: 0,
      lastUpdated: null,
      itemsComplete: 0,
      itemsTotal: 1,
      criticalIssues: 0,
      nextDeadline: null,
    };
  }

  const score = assessment.complianceScore || 0;
  const isCompleted = !!assessment.reportGenerated;
  const hasRequirements = (assessment.calculatedTPL || 0) > 0;

  let status: ModuleStatus["status"] = "pending";

  if (isCompleted && score >= 80 && hasRequirements) {
    status = "compliant";
  } else if (isCompleted) {
    status = "partial";
  }

  return {
    id: "insurance",
    name: "Insurance",
    status,
    score,
    lastUpdated: assessment.updatedAt,
    itemsComplete: isCompleted ? 1 : 0,
    itemsTotal: 1,
    criticalIssues: 0,
    nextDeadline: null,
  };
}

function calculateEnvironmentalStatus(
  assessment:
    | {
        status: string;
        totalGWP?: number | null;
        complianceScore?: number | null;
        updatedAt: Date;
      }
    | undefined,
): ModuleStatus {
  if (!assessment) {
    return {
      id: "environmental",
      name: "Environmental",
      status: "not_started",
      score: 0,
      lastUpdated: null,
      itemsComplete: 0,
      itemsTotal: 1,
      criticalIssues: 0,
      nextDeadline: null,
    };
  }

  const completedStatuses = ["submitted", "approved"];
  const isCompleted = completedStatuses.includes(assessment.status);
  const score = assessment.complianceScore || (isCompleted ? 100 : 50);
  const status = isCompleted ? "compliant" : "partial";

  return {
    id: "environmental",
    name: "Environmental",
    status,
    score,
    lastUpdated: assessment.updatedAt,
    itemsComplete: isCompleted ? 1 : 0,
    itemsTotal: 1,
    criticalIssues: 0,
    nextDeadline: null,
  };
}

function calculateIncidentStatus(
  incidents: Array<{
    status: string;
    severity: string;
    category: string;
    requiresNCANotification: boolean;
    reportedToNCA: boolean;
    detectedAt: Date;
  }>,
): ModuleStatus {
  const openIncidents = incidents.filter(
    (i) => !["resolved", "closed"].includes(i.status),
  );
  const criticalOpen = openIncidents.filter((i) => i.severity === "critical");
  const overdueNCA = incidents.filter((i) => {
    if (!i.requiresNCANotification || i.reportedToNCA) return false;
    const deadline = calculateNCADeadline(
      i.category as IncidentCategory,
      i.detectedAt,
    );
    return new Date() > deadline;
  });

  const criticalIssues = criticalOpen.length + overdueNCA.length;

  let score = 100;
  let status: ModuleStatus["status"] = "compliant";

  if (overdueNCA.length > 0) {
    status = "non_compliant";
    score = 20;
  } else if (criticalOpen.length > 0) {
    status = "partial";
    score = 50;
  } else if (openIncidents.length > 0) {
    status = "partial";
    score = 70;
  }

  return {
    id: "incidents",
    name: "Incident Response",
    status,
    score,
    lastUpdated: incidents[0]?.detectedAt || null,
    itemsComplete: incidents.filter((i) => i.status === "resolved").length,
    itemsTotal: incidents.length || 1,
    criticalIssues,
    nextDeadline: null,
  };
}

function formatTimeDiff(earlier: Date, later: Date): string {
  const diffMs = later.getTime() - earlier.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }
  return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
}
