/**
 * NCA Portal Service
 * Orchestration layer for the NCA Submission Portal dashboard
 */

import { prisma } from "@/lib/prisma";
import type {
  NCAAuthority,
  NCASubmissionStatus,
  SubmissionPriority,
  Prisma,
} from "@prisma/client";
import {
  NCA_AUTHORITY_INFO,
  getSubmissionStatusLabel,
} from "./nca-submission-service";
import {
  getDocumentsForOperatorType,
  getRequiredDocuments,
} from "@/data/authorization-documents";

// ─── Types ───

export interface PortalDashboardData {
  activeSubmissions: number;
  pendingFollowUps: number;
  upcomingDeadlines: number;
  avgResponseDays: number;
  recentCorrespondence: Array<{
    id: string;
    submissionId: string;
    ncaAuthority: string;
    subject: string;
    direction: string;
    createdAt: Date;
    isRead: boolean;
  }>;
  submissionsByStatus: Record<string, number>;
}

export interface PipelineSubmission {
  id: string;
  ncaAuthority: NCAAuthority;
  ncaAuthorityName: string;
  status: NCASubmissionStatus;
  priority: SubmissionPriority;
  submittedAt: Date;
  updatedAt: Date;
  ncaReference: string | null;
  slaDeadline: Date | null;
  correspondenceCount: number;
  reportTitle: string | null;
  daysInStatus: number;
  lastActivity: Date;
}

export interface SubmissionTimelineEntry {
  id: string;
  type: "status_change" | "correspondence" | "document_update";
  timestamp: Date;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface PackageDocument {
  sourceType: string;
  sourceId: string;
  documentType: string;
  title: string;
  status: "found" | "missing" | "optional";
}

export interface SubmissionAnalytics {
  totalSubmissions: number;
  approvalRate: number;
  avgResponseDays: number;
  byAuthority: Array<{
    authority: NCAAuthority;
    name: string;
    total: number;
    approved: number;
    avgDays: number;
  }>;
  byMonth: Array<{
    month: string;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
}

// ─── Terminal statuses ───

const TERMINAL_STATUSES: NCASubmissionStatus[] = [
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
];

// ─── Portal Dashboard ───

export async function getPortalDashboard(
  userId: string,
): Promise<PortalDashboardData> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    activeSubmissions,
    pendingFollowUps,
    upcomingDeadlines,
    allSubmissions,
    recentCorrespondence,
  ] = await Promise.all([
    // Active (non-terminal) submissions count
    prisma.nCASubmission.count({
      where: {
        userId,
        status: { notIn: TERMINAL_STATUSES },
      },
    }),
    // Pending follow-ups
    prisma.nCASubmission.count({
      where: {
        userId,
        followUpRequired: true,
        status: { notIn: TERMINAL_STATUSES },
      },
    }),
    // Upcoming deadlines (SLA or follow-up within 7 days)
    prisma.nCASubmission.count({
      where: {
        userId,
        status: { notIn: TERMINAL_STATUSES },
        OR: [
          { slaDeadline: { lte: sevenDaysFromNow, gte: now } },
          { followUpDeadline: { lte: sevenDaysFromNow, gte: now } },
        ],
      },
    }),
    // All submissions for stats
    prisma.nCASubmission.findMany({
      where: { userId },
      select: {
        status: true,
        submittedAt: true,
        acknowledgedAt: true,
      },
    }),
    // Recent correspondence
    prisma.nCACorrespondence.findMany({
      where: { submission: { userId } },
      select: {
        id: true,
        submissionId: true,
        subject: true,
        direction: true,
        createdAt: true,
        isRead: true,
        submission: {
          select: { ncaAuthority: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Calculate avg response time
  let totalResponseDays = 0;
  let responseCount = 0;
  for (const sub of allSubmissions) {
    if (sub.acknowledgedAt) {
      const days = Math.ceil(
        (sub.acknowledgedAt.getTime() - sub.submittedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      totalResponseDays += days;
      responseCount++;
    }
  }
  const avgResponseDays =
    responseCount > 0 ? Math.round(totalResponseDays / responseCount) : 0;

  // Submissions by status
  const submissionsByStatus: Record<string, number> = {};
  for (const sub of allSubmissions) {
    submissionsByStatus[sub.status] =
      (submissionsByStatus[sub.status] || 0) + 1;
  }

  return {
    activeSubmissions,
    pendingFollowUps,
    upcomingDeadlines,
    avgResponseDays,
    recentCorrespondence: recentCorrespondence.map((c) => ({
      id: c.id,
      submissionId: c.submissionId,
      ncaAuthority: c.submission.ncaAuthority,
      subject: c.subject,
      direction: c.direction,
      createdAt: c.createdAt,
      isRead: c.isRead,
    })),
    submissionsByStatus,
  };
}

// ─── Pipeline View ───

export async function getSubmissionPipeline(
  userId: string,
): Promise<Record<string, PipelineSubmission[]>> {
  const submissions = await prisma.nCASubmission.findMany({
    where: { userId },
    include: {
      report: { select: { title: true } },
      _count: { select: { correspondence: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();
  const pipeline: Record<string, PipelineSubmission[]> = {
    DRAFT: [],
    SUBMITTED: [],
    RECEIVED: [],
    UNDER_REVIEW: [],
    INFORMATION_REQUESTED: [],
    ACKNOWLEDGED: [],
    APPROVED: [],
    REJECTED: [],
    WITHDRAWN: [],
  };

  for (const sub of submissions) {
    // Parse status history to find when current status was set
    let lastStatusChange = sub.updatedAt;
    if (sub.statusHistory) {
      try {
        const history = JSON.parse(sub.statusHistory as string) as Array<{
          timestamp: string;
        }>;
        if (history.length > 0) {
          lastStatusChange = new Date(history[history.length - 1].timestamp);
        }
      } catch {
        // Use updatedAt as fallback
      }
    }

    const daysInStatus = Math.ceil(
      (now.getTime() - lastStatusChange.getTime()) / (1000 * 60 * 60 * 24),
    );

    const item: PipelineSubmission = {
      id: sub.id,
      ncaAuthority: sub.ncaAuthority,
      ncaAuthorityName: sub.ncaAuthorityName,
      status: sub.status,
      priority: sub.priority,
      submittedAt: sub.submittedAt,
      updatedAt: sub.updatedAt,
      ncaReference: sub.ncaReference,
      slaDeadline: sub.slaDeadline,
      correspondenceCount: sub._count.correspondence,
      reportTitle: sub.report.title,
      daysInStatus,
      lastActivity: sub.updatedAt,
    };

    if (pipeline[sub.status]) {
      pipeline[sub.status].push(item);
    }
  }

  return pipeline;
}

// ─── Submission Timeline ───

export async function getSubmissionTimeline(
  submissionId: string,
  userId: string,
): Promise<SubmissionTimelineEntry[]> {
  const submission = await prisma.nCASubmission.findFirst({
    where: { id: submissionId, userId },
    include: {
      correspondence: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  const entries: SubmissionTimelineEntry[] = [];

  // Add status history entries
  if (submission.statusHistory) {
    try {
      const history = JSON.parse(submission.statusHistory as string) as Array<{
        status: string;
        timestamp: string;
        notes?: string;
      }>;
      for (const entry of history) {
        entries.push({
          id: `status-${entry.timestamp}`,
          type: "status_change",
          timestamp: new Date(entry.timestamp),
          title: `Status changed to ${getSubmissionStatusLabel(entry.status as NCASubmissionStatus)}`,
          description: entry.notes || "",
          metadata: { status: entry.status },
        });
      }
    } catch {
      // Skip malformed history
    }
  }

  // Add correspondence entries
  for (const corr of submission.correspondence) {
    entries.push({
      id: `corr-${corr.id}`,
      type: "correspondence",
      timestamp: corr.createdAt,
      title:
        corr.direction === "INBOUND"
          ? `Received: ${corr.subject}`
          : `Sent: ${corr.subject}`,
      description: corr.content.substring(0, 200),
      metadata: {
        correspondenceId: corr.id,
        direction: corr.direction,
        messageType: corr.messageType,
        requiresResponse: corr.requiresResponse,
      },
    });
  }

  // Sort by timestamp descending
  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return entries;
}

// ─── Package Assembly ───

export async function assemblePackage(
  userId: string,
  organizationId: string,
  ncaAuthority: NCAAuthority,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { operatorType: true },
  });

  const operatorType = user?.operatorType || "SCO";
  const ncaInfo = NCA_AUTHORITY_INFO[ncaAuthority];

  // Get required documents for this operator type
  const allDocTemplates = getDocumentsForOperatorType(operatorType);
  const requiredDocTemplates = getRequiredDocuments(operatorType);

  // Query existing documents from various sources
  const [
    vaultDocuments,
    generatedDocuments,
    debrisAssessments,
    cyberAssessments,
    insuranceAssessments,
    environmentalAssessments,
    nis2Assessments,
  ] = await Promise.all([
    prisma.document.findMany({
      where: { userId },
      select: { id: true, name: true, category: true, status: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.generatedDocument.findMany({
      where: { userId, organizationId, status: "COMPLETED" },
      select: { id: true, title: true, documentType: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.debrisAssessment.findMany({
      where: { userId },
      select: { id: true, complianceScore: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { userId },
      select: { id: true, maturityScore: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.insuranceAssessment.findMany({
      where: { userId },
      select: { id: true, complianceScore: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.environmentalAssessment.findMany({
      where: { userId },
      select: { id: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.nIS2Assessment.findMany({
      where: { userId },
      select: { id: true, complianceScore: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
  ]);

  // Build document list with status mapping
  const documents: PackageDocument[] = [];
  const foundTypes = new Set<string>();

  // Map vault documents
  for (const doc of vaultDocuments) {
    const docType = doc.category || "other";
    documents.push({
      sourceType: "vault",
      sourceId: doc.id,
      documentType: docType,
      title: doc.name || "Untitled",
      status: "found",
    });
    foundTypes.add(docType);
  }

  // Map generated documents
  for (const doc of generatedDocuments) {
    if (!foundTypes.has(doc.documentType)) {
      documents.push({
        sourceType: "generated",
        sourceId: doc.id,
        documentType: doc.documentType,
        title: doc.title,
        status: "found",
      });
      foundTypes.add(doc.documentType);
    }
  }

  // Map assessment results as documents (assessments exist = found)
  const assessmentMap: Array<{
    type: string;
    title: string;
    data: Array<{ id: string }>;
  }> = [
    {
      type: "debris_mitigation_plan",
      title: "Debris Mitigation Plan",
      data: debrisAssessments.map((a) => ({ id: a.id })),
    },
    {
      type: "cybersecurity_assessment",
      title: "Cybersecurity Assessment",
      data: cyberAssessments.map((a) => ({ id: a.id })),
    },
    {
      type: "insurance_proof",
      title: "Insurance Compliance Report",
      data: insuranceAssessments.map((a) => ({ id: a.id })),
    },
    {
      type: "environmental_assessment",
      title: "Environmental Footprint Declaration",
      data: environmentalAssessments.map((a) => ({ id: a.id })),
    },
    {
      type: "nis2_assessment",
      title: "NIS2 Compliance Assessment",
      data: nis2Assessments.map((a) => ({ id: a.id })),
    },
  ];

  for (const mapping of assessmentMap) {
    if (mapping.data.length > 0 && !foundTypes.has(mapping.type)) {
      documents.push({
        sourceType: "assessment",
        sourceId: mapping.data[0].id,
        documentType: mapping.type,
        title: mapping.title,
        status: "found",
      });
      foundTypes.add(mapping.type);
    }
  }

  // Determine missing required documents
  const requiredDocTypes = requiredDocTemplates.map((t) => t.type);
  const missingDocTypes: string[] = [];
  for (const required of requiredDocTemplates) {
    if (!foundTypes.has(required.type)) {
      missingDocTypes.push(required.type);
      documents.push({
        sourceType: "required",
        sourceId: "",
        documentType: required.type,
        title: required.name,
        status: "missing",
      });
    }
  }

  // Add optional documents that are not required
  for (const template of allDocTemplates) {
    if (!template.required && !foundTypes.has(template.type)) {
      documents.push({
        sourceType: "optional",
        sourceId: "",
        documentType: template.type,
        title: template.name,
        status: "optional",
      });
    }
  }

  // Calculate completeness
  const completenessScore =
    requiredDocTypes.length > 0
      ? Math.round(
          ((requiredDocTypes.length - missingDocTypes.length) /
            requiredDocTypes.length) *
            100,
        )
      : 100;

  // Create package record
  const pkg = await prisma.submissionPackage.create({
    data: {
      userId,
      organizationId,
      ncaAuthority,
      packageName: `${ncaInfo.name} Submission Package`,
      description: `Auto-assembled document package for ${ncaInfo.name} (${ncaInfo.country})`,
      documents: documents as unknown as Prisma.InputJsonValue,
      completenessScore,
      requiredDocuments: requiredDocTypes as unknown as Prisma.InputJsonValue,
      missingDocuments: missingDocTypes as unknown as Prisma.InputJsonValue,
      assembledAt: new Date(),
    },
  });

  return {
    package: pkg,
    documents,
    completenessScore,
    missingDocuments: missingDocTypes,
    requiredDocuments: requiredDocTypes,
  };
}

// ─── Get Packages ───

export async function getPackages(userId: string) {
  return prisma.submissionPackage.findMany({
    where: { userId },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPackage(id: string, userId: string) {
  const pkg = await prisma.submissionPackage.findFirst({
    where: { id, userId },
    include: {
      submissions: {
        select: {
          id: true,
          status: true,
          submittedAt: true,
          ncaAuthorityName: true,
        },
      },
    },
  });

  if (!pkg) {
    throw new Error("Package not found");
  }

  return pkg;
}

// ─── Submit Package ───

export async function submitPackage(
  packageId: string,
  userId: string,
  input: {
    reportId: string;
    submissionMethod: string;
    coverLetter?: string;
    priority?: SubmissionPriority;
  },
) {
  const pkg = await prisma.submissionPackage.findFirst({
    where: { id: packageId, userId },
  });

  if (!pkg) {
    throw new Error("Package not found");
  }

  const ncaInfo = NCA_AUTHORITY_INFO[pkg.ncaAuthority];

  // Create NCA Submission linked to package
  const statusHistory = [
    {
      status: "SUBMITTED",
      timestamp: new Date().toISOString(),
      notes: `Submitted via package: ${pkg.packageName}`,
    },
  ];

  const submission = await prisma.nCASubmission.create({
    data: {
      userId,
      reportId: input.reportId,
      ncaAuthority: pkg.ncaAuthority,
      ncaAuthorityName: ncaInfo.name,
      ncaPortalUrl: ncaInfo.portalUrl || null,
      submissionMethod: input.submissionMethod as
        | "PORTAL"
        | "EMAIL"
        | "API"
        | "REGISTERED_MAIL"
        | "IN_PERSON",
      submittedAt: new Date(),
      submittedBy: userId,
      coverLetter: input.coverLetter,
      status: "SUBMITTED",
      statusHistory: JSON.stringify(statusHistory),
      packageId,
      priority: input.priority || "NORMAL",
    },
  });

  // Mark package as exported
  await prisma.submissionPackage.update({
    where: { id: packageId },
    data: { exportedAt: new Date() },
  });

  return submission;
}

// ─── Analytics ───

export async function getAnalytics(
  userId: string,
): Promise<SubmissionAnalytics> {
  const submissions = await prisma.nCASubmission.findMany({
    where: { userId },
    select: {
      ncaAuthority: true,
      ncaAuthorityName: true,
      status: true,
      submittedAt: true,
      acknowledgedAt: true,
    },
  });

  const totalSubmissions = submissions.length;

  // Approval rate
  const approvedCount = submissions.filter(
    (s) => s.status === "APPROVED",
  ).length;
  const terminalCount = submissions.filter((s) =>
    TERMINAL_STATUSES.includes(s.status),
  ).length;
  const approvalRate =
    terminalCount > 0 ? Math.round((approvedCount / terminalCount) * 100) : 0;

  // Avg response days
  let totalDays = 0;
  let responseCount = 0;
  for (const sub of submissions) {
    if (sub.acknowledgedAt) {
      totalDays += Math.ceil(
        (sub.acknowledgedAt.getTime() - sub.submittedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      responseCount++;
    }
  }
  const avgResponseDays =
    responseCount > 0 ? Math.round(totalDays / responseCount) : 0;

  // By authority
  const authorityMap = new Map<
    NCAAuthority,
    {
      name: string;
      total: number;
      approved: number;
      totalDays: number;
      count: number;
    }
  >();
  for (const sub of submissions) {
    const existing = authorityMap.get(sub.ncaAuthority) || {
      name: sub.ncaAuthorityName,
      total: 0,
      approved: 0,
      totalDays: 0,
      count: 0,
    };
    existing.total++;
    if (sub.status === "APPROVED") existing.approved++;
    if (sub.acknowledgedAt) {
      existing.totalDays += Math.ceil(
        (sub.acknowledgedAt.getTime() - sub.submittedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      existing.count++;
    }
    authorityMap.set(sub.ncaAuthority, existing);
  }

  const byAuthority = Array.from(authorityMap.entries()).map(
    ([authority, data]) => ({
      authority,
      name: data.name,
      total: data.total,
      approved: data.approved,
      avgDays: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
    }),
  );

  // By month (last 12 months)
  const byMonth: Array<{
    month: string;
    submitted: number;
    approved: number;
    rejected: number;
  }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM
    const nextMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      1,
    );

    const monthSubs = submissions.filter(
      (s) => s.submittedAt >= monthDate && s.submittedAt < nextMonth,
    );

    byMonth.push({
      month: monthStr,
      submitted: monthSubs.length,
      approved: monthSubs.filter((s) => s.status === "APPROVED").length,
      rejected: monthSubs.filter((s) => s.status === "REJECTED").length,
    });
  }

  return {
    totalSubmissions,
    approvalRate,
    avgResponseDays,
    byAuthority,
    byMonth,
  };
}

// ─── Active Submissions with correspondence ───

export async function getActiveSubmissions(userId: string) {
  return prisma.nCASubmission.findMany({
    where: {
      userId,
      status: { notIn: TERMINAL_STATUSES },
    },
    include: {
      report: { select: { id: true, title: true, reportType: true } },
      _count: { select: { correspondence: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Update Priority ───

export async function updatePriority(
  id: string,
  userId: string,
  priority: SubmissionPriority,
) {
  const submission = await prisma.nCASubmission.findFirst({
    where: { id, userId },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  return prisma.nCASubmission.update({
    where: { id },
    data: { priority },
  });
}

// ─── Submission With Full Detail ───

export async function getSubmissionWithTimeline(id: string, userId: string) {
  const submission = await prisma.nCASubmission.findFirst({
    where: { id, userId },
    include: {
      report: {
        select: {
          id: true,
          title: true,
          reportType: true,
          status: true,
          dueDate: true,
        },
      },
      package: true,
      correspondence: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  const timeline = await getSubmissionTimeline(id, userId);

  return {
    submission,
    timeline,
  };
}
