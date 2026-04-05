/**
 * Data Room Comments API
 * GET - List comments for a data room (session-based auth, org-scoped)
 * POST - Create a comment on a data room (session-based auth, org-scoped)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: List Comments ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify data room belongs to this org
    const dataRoom = await prisma.dataRoom.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    // Fetch comments using the polymorphic Comment model
    const comments = await prisma.comment.findMany({
      where: {
        organizationId,
        entityType: "data_room",
        entityId: id,
        parentId: null, // Top-level comments only
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        authorName: c.author.name || c.author.email || "Unknown",
        authorRole: "member",
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        replies: c.replies.map((r) => ({
          id: r.id,
          content: r.content,
          authorName: r.author.name || r.author.email || "Unknown",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    logger.error("Data room comments list error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Comment ───

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const schema = z.object({
      organizationId: z.string().min(1),
      content: z.string().min(1).max(5000),
      entityType: z.string().optional(),
      parentId: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, content, parentId } = parsed.data;

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify data room belongs to this org
    const dataRoom = await prisma.dataRoom.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        organizationId,
        authorId: session.user.id,
        entityType: "data_room",
        entityId: id,
        content,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          content: comment.content,
          authorName: comment.author.name || comment.author.email || "Unknown",
          authorRole: "member",
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Data room comment create error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
