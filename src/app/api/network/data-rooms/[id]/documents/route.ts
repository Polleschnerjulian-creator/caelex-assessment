/**
 * Data Room Documents API
 * GET - List documents in a data room
 * POST - Add a document to a data room
 * DELETE - Remove a document from a data room
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  getDocuments,
  addDocument,
  removeDocument,
  getDataRoom,
} from "@/lib/services/data-room";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: List Documents in Data Room ───

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
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the data room belongs to this organization
    const dataRoom = await getDataRoom(id, organizationId);
    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    const documents = await getDocuments(id);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to fetch data room documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

// ─── POST: Add Document to Data Room ───

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const schema = z.object({
      organizationId: z.string().min(1),
      documentId: z.string().min(1),
      note: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, documentId, note } = parsed.data;

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
    if (!hasPermission(perms, "network:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the data room belongs to this organization
    const dataRoom = await getDataRoom(id, organizationId);
    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    // Verify the document belongs to a user in the same organization (prevent cross-org IDOR)
    const orgMembers = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    const orgUserIds = orgMembers.map((m) => m.userId);
    const docRecord = await prisma.document.findFirst({
      where: { id: documentId, userId: { in: orgUserIds } },
      select: { id: true },
    });
    if (!docRecord) {
      return NextResponse.json(
        { error: "Document not found in this organization" },
        { status: 404 },
      );
    }

    const document = await addDocument(id, documentId, session.user.id, note);

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Failed to add document to data room:", error);
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Remove Document from Data Room ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { organizationId, documentId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

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
    if (!hasPermission(perms, "network:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the data room belongs to this organization
    const dataRoom = await getDataRoom(id, organizationId);
    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    await removeDocument(id, documentId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove document from data room:", error);
    return NextResponse.json(
      { error: "Failed to remove document" },
      { status: 500 },
    );
  }
}
