/**
 * NCA Correspondence Service
 * Tracks all communication with National Competent Authorities
 */

import { prisma } from "@/lib/prisma";
import type {
  NCACorrespondence,
  CorrespondenceDirection,
  MessageType,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface CreateCorrespondenceInput {
  submissionId: string;
  direction: CorrespondenceDirection;
  messageType: MessageType;
  subject: string;
  content: string;
  attachments?: Array<{ fileName: string; fileSize: number; fileUrl: string }>;
  sentAt?: Date;
  sentBy?: string;
  receivedAt?: Date;
  ncaContactName?: string;
  ncaContactEmail?: string;
  requiresResponse?: boolean;
  responseDeadline?: Date;
}

// ─── Core Functions ───

export async function createCorrespondence(
  submissionId: string,
  userId: string,
  input: CreateCorrespondenceInput,
): Promise<NCACorrespondence> {
  // Verify user owns the submission
  const submission = await prisma.nCASubmission.findFirst({
    where: { id: submissionId, userId },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  return prisma.nCACorrespondence.create({
    data: {
      submissionId,
      direction: input.direction,
      messageType: input.messageType,
      subject: input.subject,
      content: input.content,
      attachments: input.attachments
        ? (input.attachments as unknown as Prisma.InputJsonValue)
        : undefined,
      sentAt:
        input.sentAt ||
        (input.direction === "OUTBOUND" ? new Date() : undefined),
      sentBy:
        input.sentBy || (input.direction === "OUTBOUND" ? userId : undefined),
      receivedAt:
        input.receivedAt ||
        (input.direction === "INBOUND" ? new Date() : undefined),
      ncaContactName: input.ncaContactName,
      ncaContactEmail: input.ncaContactEmail,
      requiresResponse: input.requiresResponse ?? false,
      responseDeadline: input.responseDeadline,
    },
  });
}

export async function getCorrespondence(
  submissionId: string,
  userId: string,
): Promise<NCACorrespondence[]> {
  // Verify user owns the submission
  const submission = await prisma.nCASubmission.findFirst({
    where: { id: submissionId, userId },
    select: { id: true },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  return prisma.nCACorrespondence.findMany({
    where: { submissionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getUnreadCorrespondence(
  userId: string,
): Promise<NCACorrespondence[]> {
  return prisma.nCACorrespondence.findMany({
    where: {
      submission: { userId },
      isRead: false,
      direction: "INBOUND",
    },
    include: {
      submission: {
        select: {
          id: true,
          ncaAuthority: true,
          ncaAuthorityName: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markAsRead(
  correspondenceId: string,
  userId: string,
): Promise<NCACorrespondence> {
  // Verify user owns the parent submission
  const correspondence = await prisma.nCACorrespondence.findFirst({
    where: {
      id: correspondenceId,
      submission: { userId },
    },
  });

  if (!correspondence) {
    throw new Error("Correspondence not found");
  }

  return prisma.nCACorrespondence.update({
    where: { id: correspondenceId },
    data: { isRead: true },
  });
}

export async function getCorrespondenceRequiringResponse(
  userId: string,
): Promise<NCACorrespondence[]> {
  return prisma.nCACorrespondence.findMany({
    where: {
      submission: { userId },
      requiresResponse: true,
      respondedAt: null,
    },
    include: {
      submission: {
        select: {
          id: true,
          ncaAuthority: true,
          ncaAuthorityName: true,
          status: true,
        },
      },
    },
    orderBy: { responseDeadline: "asc" },
  });
}

export async function markAsResponded(
  correspondenceId: string,
  userId: string,
): Promise<NCACorrespondence> {
  const correspondence = await prisma.nCACorrespondence.findFirst({
    where: {
      id: correspondenceId,
      submission: { userId },
    },
  });

  if (!correspondence) {
    throw new Error("Correspondence not found");
  }

  return prisma.nCACorrespondence.update({
    where: { id: correspondenceId },
    data: { respondedAt: new Date() },
  });
}
