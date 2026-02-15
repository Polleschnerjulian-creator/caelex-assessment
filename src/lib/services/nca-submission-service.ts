/**
 * NCA Submission Service
 * Handles submission of reports to National Competent Authorities
 */

import { prisma } from "@/lib/prisma";
import type {
  NCASubmission,
  NCAAuthority,
  SubmissionMethod,
  NCASubmissionStatus,
  SubmissionPriority,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface SubmitToNCAInput {
  userId: string;
  reportId: string;
  ncaAuthority: NCAAuthority;
  submissionMethod: SubmissionMethod;
  coverLetter?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileUrl: string;
  }>;
}

export interface UpdateSubmissionStatusInput {
  status: NCASubmissionStatus;
  notes?: string;
  ncaReference?: string;
  acknowledgedBy?: string;
  rejectionReason?: string;
  followUpRequired?: boolean;
  followUpDeadline?: Date;
  followUpNotes?: string;
}

export interface NCASubmissionWithReport extends NCASubmission {
  report: {
    id: string;
    reportType: string;
    title: string | null;
    status: string;
    dueDate: Date | null;
  };
}

// ─── NCA Authority Information ───

export const NCA_AUTHORITY_INFO: Record<
  NCAAuthority,
  {
    name: string;
    country: string;
    portalUrl?: string;
    email?: string;
    description: string;
  }
> = {
  DE_BMWK: {
    name: "Federal Ministry for Economic Affairs and Climate Action",
    country: "Germany",
    portalUrl: "https://www.bmwk.de",
    description: "German national authority for space activities",
  },
  DE_DLR: {
    name: "German Aerospace Center (DLR)",
    country: "Germany",
    portalUrl: "https://www.dlr.de",
    description: "German space agency and research center",
  },
  FR_CNES: {
    name: "Centre National d'Études Spatiales",
    country: "France",
    portalUrl: "https://cnes.fr",
    description: "French space agency",
  },
  FR_DGAC: {
    name: "Direction Générale de l'Aviation Civile",
    country: "France",
    portalUrl:
      "https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac",
    description: "French civil aviation authority with space oversight",
  },
  IT_ASI: {
    name: "Agenzia Spaziale Italiana",
    country: "Italy",
    portalUrl: "https://www.asi.it",
    description: "Italian space agency",
  },
  ES_AEE: {
    name: "Agencia Espacial Española",
    country: "Spain",
    portalUrl: "https://www.aee.gob.es",
    description: "Spanish space agency",
  },
  NL_NSO: {
    name: "Netherlands Space Office",
    country: "Netherlands",
    portalUrl: "https://www.spaceoffice.nl",
    description: "Dutch space office",
  },
  BE_BELSPO: {
    name: "Belgian Science Policy Office",
    country: "Belgium",
    portalUrl: "https://www.belspo.be",
    description: "Belgian federal science policy office",
  },
  AT_FFG: {
    name: "Austrian Research Promotion Agency",
    country: "Austria",
    portalUrl: "https://www.ffg.at",
    description: "Austrian space activities authority",
  },
  PL_POLSA: {
    name: "Polish Space Agency",
    country: "Poland",
    portalUrl: "https://polsa.gov.pl",
    description: "Polish space agency",
  },
  SE_SNSA: {
    name: "Swedish National Space Agency",
    country: "Sweden",
    portalUrl: "https://www.rymdstyrelsen.se",
    description: "Swedish space agency",
  },
  DK_DTU: {
    name: "DTU Space",
    country: "Denmark",
    portalUrl: "https://www.space.dtu.dk",
    description: "Danish national space institute",
  },
  FI_BF: {
    name: "Business Finland",
    country: "Finland",
    portalUrl: "https://www.businessfinland.fi",
    description: "Finnish space activities authority",
  },
  PT_FCT: {
    name: "Fundação para a Ciência e a Tecnologia",
    country: "Portugal",
    portalUrl: "https://www.fct.pt",
    description: "Portuguese science and technology foundation",
  },
  IE_EI: {
    name: "Enterprise Ireland",
    country: "Ireland",
    portalUrl: "https://www.enterprise-ireland.com",
    description: "Irish enterprise development agency",
  },
  LU_LSA: {
    name: "Luxembourg Space Agency",
    country: "Luxembourg",
    portalUrl: "https://space-agency.public.lu",
    description: "Luxembourg space agency",
  },
  CZ_CSO: {
    name: "Czech Space Office",
    country: "Czech Republic",
    portalUrl: "https://www.czechspace.cz",
    description: "Czech national space office",
  },
  RO_ROSA: {
    name: "Romanian Space Agency",
    country: "Romania",
    portalUrl: "https://www.rosa.ro",
    description: "Romanian space agency",
  },
  GR_HSA: {
    name: "Hellenic Space Agency",
    country: "Greece",
    portalUrl: "https://hsa.gr",
    description: "Greek space agency",
  },
  EUSPA: {
    name: "EU Agency for the Space Programme",
    country: "EU",
    portalUrl: "https://www.euspa.europa.eu",
    description: "EU space programme agency",
  },
  EC_DEFIS: {
    name: "European Commission DG DEFIS",
    country: "EU",
    portalUrl: "https://defence-industry-space.ec.europa.eu",
    description:
      "European Commission Directorate-General for Defence Industry and Space",
  },
  OTHER: {
    name: "Other Authority",
    country: "Other",
    description: "Other national or international authority",
  },
};

// ─── Core Functions ───

export async function submitToNCA(
  input: SubmitToNCAInput,
): Promise<NCASubmission> {
  const ncaInfo = NCA_AUTHORITY_INFO[input.ncaAuthority];

  // Create status history entry
  const statusHistory = [
    {
      status: "SUBMITTED" as NCASubmissionStatus,
      timestamp: new Date().toISOString(),
      notes: "Initial submission",
    },
  ];

  return prisma.nCASubmission.create({
    data: {
      userId: input.userId,
      reportId: input.reportId,
      ncaAuthority: input.ncaAuthority,
      ncaAuthorityName: ncaInfo.name,
      ncaPortalUrl: ncaInfo.portalUrl || null,
      submissionMethod: input.submissionMethod,
      submittedAt: new Date(),
      submittedBy: input.userId,
      coverLetter: input.coverLetter,
      attachments: input.attachments
        ? JSON.stringify(input.attachments)
        : undefined,
      status: "SUBMITTED",
      statusHistory: JSON.stringify(statusHistory),
    },
  });
}

export async function getSubmission(
  id: string,
  userId: string,
): Promise<NCASubmissionWithReport | null> {
  const submission = await prisma.nCASubmission.findFirst({
    where: { id, userId },
    include: {
      report: {
        select: {
          id: true,
          reportType: true,
          title: true,
          status: true,
          dueDate: true,
        },
      },
    },
  });

  return submission as NCASubmissionWithReport | null;
}

export async function getSubmissions(
  userId: string,
  options?: {
    reportId?: string;
    ncaAuthority?: NCAAuthority;
    status?: NCASubmissionStatus;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  },
): Promise<{ submissions: NCASubmissionWithReport[]; total: number }> {
  const where: Prisma.NCASubmissionWhereInput = { userId };

  if (options?.reportId) where.reportId = options.reportId;
  if (options?.ncaAuthority) where.ncaAuthority = options.ncaAuthority;
  if (options?.status) where.status = options.status;
  if (options?.fromDate || options?.toDate) {
    where.submittedAt = {};
    if (options.fromDate) where.submittedAt.gte = options.fromDate;
    if (options.toDate) where.submittedAt.lte = options.toDate;
  }

  const [submissions, total] = await Promise.all([
    prisma.nCASubmission.findMany({
      where,
      include: {
        report: {
          select: {
            id: true,
            reportType: true,
            title: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.nCASubmission.count({ where }),
  ]);

  return { submissions: submissions as NCASubmissionWithReport[], total };
}

export async function updateSubmissionStatus(
  id: string,
  userId: string,
  input: UpdateSubmissionStatusInput,
): Promise<NCASubmission> {
  // Get current submission to update status history
  const current = await prisma.nCASubmission.findFirst({
    where: { id, userId },
  });

  if (!current) {
    throw new Error("Submission not found");
  }

  // Parse and update status history
  const statusHistory = current.statusHistory
    ? JSON.parse(current.statusHistory as string)
    : [];

  statusHistory.push({
    status: input.status,
    timestamp: new Date().toISOString(),
    notes: input.notes || null,
  });

  const data: Prisma.NCASubmissionUpdateInput = {
    status: input.status,
    statusHistory: JSON.stringify(statusHistory),
  };

  // Handle specific status updates
  if (input.ncaReference) data.ncaReference = input.ncaReference;
  if (input.notes) data.responseNotes = input.notes;
  if (input.followUpRequired !== undefined)
    data.followUpRequired = input.followUpRequired;
  if (input.followUpDeadline) data.followUpDeadline = input.followUpDeadline;
  if (input.followUpNotes) data.followUpNotes = input.followUpNotes;

  if (input.status === "ACKNOWLEDGED" || input.status === "APPROVED") {
    data.acknowledgedAt = new Date();
    if (input.acknowledgedBy) data.acknowledgedBy = input.acknowledgedBy;
  }

  if (input.status === "REJECTED") {
    data.rejectedAt = new Date();
    if (input.rejectionReason) data.rejectionReason = input.rejectionReason;
  }

  return prisma.nCASubmission.update({
    where: { id },
    data,
  });
}

export async function recordAcknowledgment(
  id: string,
  userId: string,
  acknowledgment: {
    ncaReference: string;
    acknowledgedBy?: string;
    notes?: string;
  },
): Promise<NCASubmission> {
  return updateSubmissionStatus(id, userId, {
    status: "ACKNOWLEDGED",
    ncaReference: acknowledgment.ncaReference,
    acknowledgedBy: acknowledgment.acknowledgedBy,
    notes: acknowledgment.notes,
  });
}

export async function resendSubmission(
  originalId: string,
  userId: string,
  options?: {
    coverLetter?: string;
    additionalAttachments?: Array<{
      fileName: string;
      fileSize: number;
      fileUrl: string;
    }>;
  },
): Promise<NCASubmission> {
  // Get original submission
  const original = await prisma.nCASubmission.findFirst({
    where: { id: originalId, userId },
  });

  if (!original) {
    throw new Error("Original submission not found");
  }

  // Parse original attachments
  const originalAttachments = original.attachments
    ? JSON.parse(original.attachments as string)
    : [];

  // Combine with additional attachments
  const allAttachments = [
    ...originalAttachments,
    ...(options?.additionalAttachments || []),
  ];

  // Create status history
  const statusHistory = [
    {
      status: "SUBMITTED" as NCASubmissionStatus,
      timestamp: new Date().toISOString(),
      notes: `Resend of submission ${originalId}`,
    },
  ];

  // Create new submission linked to original
  const newSubmission = await prisma.nCASubmission.create({
    data: {
      userId,
      reportId: original.reportId,
      ncaAuthority: original.ncaAuthority,
      ncaAuthorityName: original.ncaAuthorityName,
      ncaPortalUrl: original.ncaPortalUrl,
      submissionMethod: original.submissionMethod,
      submittedAt: new Date(),
      submittedBy: userId,
      coverLetter: options?.coverLetter || original.coverLetter,
      attachments:
        allAttachments.length > 0 ? JSON.stringify(allAttachments) : undefined,
      status: "SUBMITTED",
      statusHistory: JSON.stringify(statusHistory),
      originalSubmissionId: originalId,
      resendCount: original.resendCount + 1,
    },
  });

  // Update original submission's resend count
  await prisma.nCASubmission.update({
    where: { id: originalId },
    data: { resendCount: original.resendCount + 1 },
  });

  return newSubmission;
}

// ─── Statistics ───

export async function getSubmissionStats(userId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byAuthority: Record<string, number>;
  pendingFollowUps: number;
  recentSubmissions: number;
}> {
  const [total, submissions, pendingFollowUps] = await Promise.all([
    prisma.nCASubmission.count({ where: { userId } }),
    prisma.nCASubmission.findMany({
      where: { userId },
      select: { status: true, ncaAuthority: true, submittedAt: true },
    }),
    prisma.nCASubmission.count({
      where: {
        userId,
        followUpRequired: true,
        status: {
          notIn: ["ACKNOWLEDGED", "APPROVED", "REJECTED", "WITHDRAWN"],
        },
      },
    }),
  ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const byStatus: Record<string, number> = {};
  const byAuthority: Record<string, number> = {};
  let recentSubmissions = 0;

  for (const sub of submissions) {
    byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
    byAuthority[sub.ncaAuthority] = (byAuthority[sub.ncaAuthority] || 0) + 1;
    if (sub.submittedAt >= thirtyDaysAgo) {
      recentSubmissions++;
    }
  }

  return { total, byStatus, byAuthority, pendingFollowUps, recentSubmissions };
}

// ─── Helpers ───

export function getSubmissionStatusLabel(status: NCASubmissionStatus): string {
  const labels: Record<NCASubmissionStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    RECEIVED: "Received",
    UNDER_REVIEW: "Under Review",
    INFORMATION_REQUESTED: "Information Requested",
    ACKNOWLEDGED: "Acknowledged",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
  };
  return labels[status] || status;
}

export function getSubmissionStatusColor(status: NCASubmissionStatus): string {
  const colors: Record<NCASubmissionStatus, string> = {
    DRAFT: "gray",
    SUBMITTED: "blue",
    RECEIVED: "cyan",
    UNDER_REVIEW: "yellow",
    INFORMATION_REQUESTED: "orange",
    ACKNOWLEDGED: "green",
    APPROVED: "green",
    REJECTED: "red",
    WITHDRAWN: "gray",
  };
  return colors[status] || "gray";
}

export function getSubmissionMethodLabel(method: SubmissionMethod): string {
  const labels: Record<SubmissionMethod, string> = {
    PORTAL: "Online Portal",
    EMAIL: "Email",
    API: "API Integration",
    REGISTERED_MAIL: "Registered Mail",
    IN_PERSON: "In Person",
  };
  return labels[method] || method;
}

export function getNCAAuthorityLabel(authority: NCAAuthority): string {
  return NCA_AUTHORITY_INFO[authority]?.name || authority;
}

export function getNCAAuthorityCountry(authority: NCAAuthority): string {
  return NCA_AUTHORITY_INFO[authority]?.country || "Unknown";
}

// ─── Extended Functions (NCA Portal) ───

const TERMINAL_STATUSES: NCASubmissionStatus[] = [
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
];

export async function getActiveSubmissions(
  userId: string,
): Promise<NCASubmissionWithReport[]> {
  const submissions = await prisma.nCASubmission.findMany({
    where: {
      userId,
      status: { notIn: TERMINAL_STATUSES },
    },
    include: {
      report: {
        select: {
          id: true,
          reportType: true,
          title: true,
          status: true,
          dueDate: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return submissions as NCASubmissionWithReport[];
}

export async function updatePriority(
  id: string,
  userId: string,
  priority: SubmissionPriority,
): Promise<NCASubmission> {
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
