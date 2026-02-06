/**
 * Supplier Outreach Service
 *
 * Handles sending data requests to suppliers and managing portal tokens.
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { render } from "@react-email/render";
import SupplierDataRequestEmail from "@/lib/email/templates/supplier-data-request";
import { randomBytes } from "crypto";

/**
 * Generate a secure random token for supplier portal access
 */
function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Options for creating a supplier outreach request
 */
export interface OutreachOptions {
  requestId: string;
  expirationDays?: number; // Default: 30 days
  baseUrl?: string; // Base URL for portal links
}

/**
 * Result of sending an outreach request
 */
export interface OutreachResult {
  success: boolean;
  tokenId?: string;
  portalUrl?: string;
  error?: string;
  emailSent?: boolean;
}

/**
 * Create a portal token and send outreach email to a supplier
 */
export async function sendSupplierOutreach(
  options: OutreachOptions,
): Promise<OutreachResult> {
  const { requestId, expirationDays = 30 } = options;

  try {
    // Get the supplier data request with assessment details
    const request = await prisma.supplierDataRequest.findUnique({
      where: { id: requestId },
      include: {
        assessment: {
          include: {
            user: {
              select: {
                organization: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return {
        success: false,
        error: "Supplier data request not found",
      };
    }

    if (!request.supplierEmail) {
      return {
        success: false,
        error: "Supplier email not configured",
      };
    }

    // Check if there's already an active token
    const existingToken = await prisma.supplierPortalToken.findFirst({
      where: {
        requestId,
        isRevoked: false,
        completedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingToken) {
      // Revoke existing token and create new one
      await prisma.supplierPortalToken.update({
        where: { id: existingToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokeReason: "Replaced with new token",
        },
      });
    }

    // Generate new secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create portal token
    const portalToken = await prisma.supplierPortalToken.create({
      data: {
        token,
        requestId,
        expiresAt,
      },
    });

    // Build portal URL
    const baseUrl =
      options.baseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const portalUrl = `${baseUrl}/supplier/${token}`;

    // Parse data required
    let dataRequired: string[] = [];
    try {
      dataRequired = JSON.parse(request.dataRequired);
    } catch {
      dataRequired = ["Environmental footprint data"];
    }

    // Render email
    const emailHtml = await render(
      SupplierDataRequestEmail({
        supplierName: request.supplierName,
        companyName: request.assessment.user?.organization || "Customer",
        missionName: request.assessment.missionName || undefined,
        componentType: request.componentType,
        dataRequired,
        deadline: request.deadline || undefined,
        portalUrl,
        notes: request.notes || undefined,
        contactName: request.assessment.user?.name || undefined,
        contactEmail: request.assessment.user?.email || undefined,
      }),
    );

    // Send email
    const emailResult = await sendEmail({
      to: request.supplierEmail,
      subject: `Environmental Data Request: ${request.componentType}`,
      html: emailHtml,
    });

    // Update request status
    await prisma.supplierDataRequest.update({
      where: { id: requestId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      tokenId: portalToken.id,
      portalUrl,
      emailSent: emailResult.success,
    };
  } catch (error) {
    console.error("Supplier outreach error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch outreach - send requests to all pending suppliers for an assessment
 */
export interface BatchOutreachResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    requestId: string;
    supplierName: string;
    success: boolean;
    error?: string;
  }>;
}

export async function sendBatchOutreach(
  assessmentId: string,
  options?: { expirationDays?: number; baseUrl?: string },
): Promise<BatchOutreachResult> {
  // Get all pending supplier requests for the assessment
  const requests = await prisma.supplierDataRequest.findMany({
    where: {
      assessmentId,
      status: "pending",
      supplierEmail: { not: null },
    },
  });

  const results: BatchOutreachResult["results"] = [];

  for (const request of requests) {
    const result = await sendSupplierOutreach({
      requestId: request.id,
      expirationDays: options?.expirationDays,
      baseUrl: options?.baseUrl,
    });

    results.push({
      requestId: request.id,
      supplierName: request.supplierName,
      success: result.success,
      error: result.error,
    });
  }

  return {
    total: requests.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Revoke a portal token
 */
export async function revokePortalToken(
  tokenId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.supplierPortalToken.update({
      where: { id: tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: userId,
        revokeReason: reason,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke token",
    };
  }
}

/**
 * Get outreach status for an assessment
 */
export interface OutreachStatus {
  totalRequests: number;
  pending: number;
  sent: number;
  received: number;
  overdue: number;
  requests: Array<{
    id: string;
    supplierName: string;
    componentType: string;
    status: string;
    sentAt?: Date;
    receivedAt?: Date;
    deadline?: Date;
    hasActiveToken: boolean;
  }>;
}

export async function getOutreachStatus(
  assessmentId: string,
): Promise<OutreachStatus> {
  const requests = await prisma.supplierDataRequest.findMany({
    where: { assessmentId },
    include: {
      portalTokens: {
        where: {
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();

  return {
    totalRequests: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    sent: requests.filter((r) => r.status === "sent").length,
    received: requests.filter((r) => r.status === "received").length,
    overdue: requests.filter(
      (r) => r.status === "sent" && r.deadline && new Date(r.deadline) < now,
    ).length,
    requests: requests.map((r) => ({
      id: r.id,
      supplierName: r.supplierName,
      componentType: r.componentType,
      status: r.status,
      sentAt: r.sentAt ?? undefined,
      receivedAt: r.receivedAt ?? undefined,
      deadline: r.deadline ?? undefined,
      hasActiveToken: r.portalTokens.length > 0,
    })),
  };
}

/**
 * Create a supplier data request
 */
export interface CreateSupplierRequestOptions {
  assessmentId: string;
  supplierName: string;
  supplierEmail?: string;
  componentType: string;
  dataRequired: string[];
  notes?: string;
  deadline?: Date;
}

export async function createSupplierRequest(
  options: CreateSupplierRequestOptions,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const request = await prisma.supplierDataRequest.create({
      data: {
        assessmentId: options.assessmentId,
        supplierName: options.supplierName,
        supplierEmail: options.supplierEmail,
        componentType: options.componentType,
        dataRequired: JSON.stringify(options.dataRequired),
        notes: options.notes,
        deadline: options.deadline,
        status: "pending",
      },
    });

    return {
      success: true,
      requestId: request.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create request",
    };
  }
}
