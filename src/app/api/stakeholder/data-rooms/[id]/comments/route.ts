import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import {
  getDataRoomsForStakeholder,
  logDataRoomAccess,
} from "@/lib/services/data-room";
import { prisma } from "@/lib/prisma";

// GET /api/stakeholder/data-rooms/[id]/comments — List comments for a data room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    // Verify the data room belongs to this engagement
    const dataRooms = await getDataRoomsForStakeholder(engagement.id);
    const dataRoom = dataRooms.find((room) => room.id === id);

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found or not accessible" },
        { status: 404 },
      );
    }

    // Fetch comments for this data room
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const skip = (page - 1) * limit;

    const where = {
      organizationId: engagement.organizationId,
      entityType: "data_room",
      entityId: id,
      isDeleted: false,
      parentId: null, // Top-level comments only
    };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: "asc" as const },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: "desc" as const },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json({
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Stakeholder comments list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/stakeholder/data-rooms/[id]/comments — Create a comment on a data room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    // Verify the data room belongs to this engagement
    const dataRooms = await getDataRoomsForStakeholder(engagement.id);
    const dataRoom = dataRooms.find((room) => room.id === id);

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found or not accessible" },
        { status: 404 },
      );
    }

    // Check access level — must be COMMENT, CONTRIBUTE, or FULL_ACCESS to post
    if (
      dataRoom.accessLevel !== "COMMENT" &&
      dataRoom.accessLevel !== "CONTRIBUTE" &&
      dataRoom.accessLevel !== "FULL_ACCESS"
    ) {
      return NextResponse.json(
        {
          error:
            "Insufficient access level. Commenting requires COMMENT, CONTRIBUTE, or FULL_ACCESS permission.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { content, parentId } = body;

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 },
      );
    }

    // Create comment using prisma directly (comment-service expects userId as authorId,
    // but stakeholders don't have a user account — we use engagement.id as authorId)
    const comment = await prisma.comment.create({
      data: {
        organizationId: engagement.organizationId,
        authorId: engagement.id,
        entityType: "data_room",
        entityId: id,
        content: content.trim(),
        parentId: parentId || null,
        mentions: [],
      },
    });

    // Log comment posted access
    await logDataRoomAccess(
      id,
      "comment_posted",
      "stakeholder",
      engagement.id,
      {
        ipAddress,
        userAgent,
        metadata: { commentId: comment.id },
      },
    );

    await logStakeholderAccess(engagement.id, "comment_posted", {
      entityType: "data_room",
      entityId: id,
      ipAddress,
      userAgent,
      metadata: { commentId: comment.id },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Stakeholder comment create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
