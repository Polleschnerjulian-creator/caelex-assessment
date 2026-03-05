/**
 * Assure Public Investor View API (NO auth required, token-based)
 * GET: Public investor view of company profile.
 *      Look up via AssureDataRoomLink or AssureShareLink.
 *      Validates token, checks expiry/active status, increments view count,
 *      and returns company profile data.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limit (public endpoint — stricter limits)
    const identifier = getIdentifier(request);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // First try AssureDataRoomLink
    const dataRoomLink = await prisma.assureDataRoomLink.findUnique({
      where: { token },
      include: {
        dataRoom: {
          include: {
            organization: { select: { id: true, name: true } },
            documents: {
              orderBy: { uploadedAt: "desc" },
            },
          },
        },
      },
    });

    if (dataRoomLink) {
      // Validate link
      if (!dataRoomLink.isActive) {
        return NextResponse.json(
          { error: "This link has been deactivated" },
          { status: 403 },
        );
      }

      if (new Date() > dataRoomLink.expiresAt) {
        return NextResponse.json(
          { error: "This link has expired" },
          { status: 403 },
        );
      }

      const organizationId = dataRoomLink.dataRoom.organizationId;

      // Increment view count and log view
      const userAgent = request.headers.get("user-agent") || null;
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null;

      await prisma.$transaction([
        prisma.assureDataRoomLink.update({
          where: { id: dataRoomLink.id },
          data: {
            totalViews: { increment: 1 },
            lastViewedAt: new Date(),
          },
        }),
        prisma.assureDataRoomView.create({
          data: {
            linkId: dataRoomLink.id,
            action: "ROOM_ACCESSED",
            ipAddress,
            userAgent,
          },
        }),
      ]);

      // Fetch company profile
      const profile = await prisma.assureCompanyProfile.findUnique({
        where: { organizationId },
        include: {
          techProfile: true,
          marketProfile: true,
          teamProfile: true,
          financialProfile: true,
          regulatoryProfile: true,
          competitiveProfile: true,
          tractionProfile: true,
        },
      });

      // Fetch visible milestones
      const milestones = await prisma.assureMilestone.findMany({
        where: { organizationId, isInvestorVisible: true },
        orderBy: { targetDate: "asc" },
        take: 20,
      });

      // Fetch latest IRS
      const latestIRS = await prisma.investmentReadinessScore.findFirst({
        where: { organizationId },
        orderBy: { computedAt: "desc" },
      });

      // Filter documents by accessible folders if configured
      let documents = dataRoomLink.dataRoom.documents;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessibleFolders = dataRoomLink.accessibleFolders as any;
      if (Array.isArray(accessibleFolders) && accessibleFolders.length > 0) {
        documents = documents.filter((d) =>
          accessibleFolders.includes(d.folder),
        );
      }

      return NextResponse.json({
        type: "dataroom",
        organizationName: dataRoomLink.dataRoom.organization.name,
        profile: profile
          ? {
              companyName: profile.companyName,
              stage: profile.stage,
              headquarters: profile.headquarters,
              oneLiner: profile.oneLiner,
              missionStatement: profile.missionStatement,
              employeeCount: profile.employeeCount,
              operatorType: profile.operatorType,
              subsector: profile.subsector,
            }
          : null,
        score: latestIRS
          ? {
              overallScore: latestIRS.overallScore,
              grade: latestIRS.grade,
              components: latestIRS.components,
              computedAt: latestIRS.computedAt,
            }
          : null,
        milestones: milestones.map((m) => ({
          title: m.title,
          category: m.category,
          status: m.status,
          targetDate: m.targetDate,
          completedDate: m.completedDate,
          investorNote: m.investorNote,
        })),
        dataRoom: {
          name: dataRoomLink.dataRoom.name,
          folders: dataRoomLink.dataRoom.folders,
          documents: documents.map((d) => ({
            id: d.id,
            folder: d.folder,
            fileName: d.fileName,
            fileSize: d.fileSize,
            uploadedAt: d.uploadedAt,
          })),
        },
        permissions: {
          canDownload: dataRoomLink.canDownload,
          canPrint: dataRoomLink.canPrint,
          watermark: dataRoomLink.watermark,
        },
      });
    }

    // Try AssureShareLink as fallback
    const shareLink = await prisma.assureShareLink.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (shareLink) {
      if (shareLink.isRevoked) {
        return NextResponse.json(
          { error: "This share link has been revoked" },
          { status: 403 },
        );
      }
      if (new Date() > shareLink.expiresAt) {
        return NextResponse.json(
          { error: "This share link has expired" },
          { status: 403 },
        );
      }
      if (
        shareLink.maxViews !== null &&
        shareLink.viewCount >= shareLink.maxViews
      ) {
        return NextResponse.json(
          { error: "This share link has reached its maximum view count" },
          { status: 403 },
        );
      }

      // Increment view count
      await prisma.assureShareLink.update({
        where: { id: shareLink.id },
        data: { viewCount: { increment: 1 } },
      });

      const organizationId = shareLink.organizationId;

      // Fetch profile
      const profile = await prisma.assureCompanyProfile.findUnique({
        where: { organizationId },
        include: {
          techProfile: true,
          marketProfile: true,
          teamProfile: true,
          financialProfile: true,
          regulatoryProfile: true,
          competitiveProfile: true,
          tractionProfile: true,
        },
      });

      const latestIRS = await prisma.investmentReadinessScore.findFirst({
        where: { organizationId },
        orderBy: { computedAt: "desc" },
      });

      return NextResponse.json({
        type: "share",
        organizationName: shareLink.organization.name,
        granularity: shareLink.granularity,
        profile: profile
          ? {
              companyName: profile.companyName,
              stage: profile.stage,
              headquarters: profile.headquarters,
              oneLiner: profile.oneLiner,
              employeeCount: profile.employeeCount,
            }
          : null,
        score: latestIRS
          ? {
              overallScore: latestIRS.overallScore,
              grade: latestIRS.grade,
              components: latestIRS.components,
              computedAt: latestIRS.computedAt,
            }
          : null,
      });
    }

    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 404 },
    );
  } catch (error) {
    logger.error("Assure public view error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
