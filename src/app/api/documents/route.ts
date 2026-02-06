import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/storage/r2-client";

// GET /api/documents - List documents with filters
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const moduleType = searchParams.get("moduleType");
    const expiringWithinDays = searchParams.get("expiringWithinDays");
    const expired = searchParams.get("expired");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      userId: session.user.id,
      isLatest: true,
    };

    if (category) where.category = category;
    if (status) where.status = status;
    if (moduleType) where.moduleType = moduleType;

    if (expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiringWithinDays));
      where.expiryDate = {
        gte: new Date(),
        lte: futureDate,
      };
      where.isExpired = false;
    }

    if (expired === "true") {
      where.isExpired = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.document.count({ where }),
    ]);

    // Update expired status for documents
    const now = new Date();
    const expiredIds = documents
      .filter((d) => d.expiryDate && d.expiryDate < now && !d.isExpired)
      .map((d) => d.id);

    if (expiredIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: expiredIds } },
        data: { isExpired: true, status: "EXPIRED" },
      });
    }

    return NextResponse.json({ documents, total });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

// POST /api/documents - Upload new document
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    // Extract metadata
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string;
    const subcategory = formData.get("subcategory") as string | null;
    const moduleType = formData.get("moduleType") as string | null;
    const issueDate = formData.get("issueDate") as string | null;
    const expiryDate = formData.get("expiryDate") as string | null;
    const regulatoryRef = formData.get("regulatoryRef") as string | null;
    const accessLevel = (formData.get("accessLevel") as string) || "INTERNAL";
    const tags = formData.get("tags") as string | null;
    const file = formData.get("file") as File | null;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, category" },
        { status: 400 },
      );
    }

    // If no file, create document record without storage
    let fileName = "";
    let fileSize = 0;
    let mimeType = "";
    let storagePath = "";
    let checksum = "";

    if (file) {
      // SECURITY: Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          },
          { status: 400 },
        );
      }

      // SECURITY: Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type;

      // Generate storage path and checksum
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // For now, store path as a reference - in production, upload to S3/GCS
      storagePath = `documents/${session.user.id}/${Date.now()}-${fileName}`;

      // TODO: Implement actual file storage
      // await uploadToStorage(storagePath, fileBuffer);
    }

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        name,
        description,
        fileName,
        fileSize,
        mimeType,
        category: category as
          | "LICENSE"
          | "PERMIT"
          | "AUTHORIZATION"
          | "CERTIFICATE"
          | "ISO_CERTIFICATE"
          | "SECURITY_CERT"
          | "INSURANCE_POLICY"
          | "INSURANCE_CERT"
          | "COMPLIANCE_REPORT"
          | "AUDIT_REPORT"
          | "INCIDENT_REPORT"
          | "ANNUAL_REPORT"
          | "TECHNICAL_SPEC"
          | "DESIGN_DOC"
          | "TEST_REPORT"
          | "SAFETY_ANALYSIS"
          | "CONTRACT"
          | "NDA"
          | "SLA"
          | "REGULATORY_FILING"
          | "CORRESPONDENCE"
          | "NOTIFICATION"
          | "POLICY"
          | "PROCEDURE"
          | "TRAINING"
          | "OTHER",
        subcategory,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        storagePath,
        checksum,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        moduleType: moduleType as
          | "AUTHORIZATION"
          | "DEBRIS"
          | "INSURANCE"
          | "CYBERSECURITY"
          | "ENVIRONMENTAL"
          | "SUPERVISION"
          | "REGISTRATION"
          | "TIMELINE"
          | "DOCUMENTS"
          | null,
        regulatoryRef,
        accessLevel: accessLevel as
          | "PUBLIC"
          | "INTERNAL"
          | "CONFIDENTIAL"
          | "RESTRICTED"
          | "TOP_SECRET",
        uploadedBy: session.user.id,
        status: "DRAFT",
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "document_uploaded",
        entityType: "document",
        entityId: document.id,
        newValue: JSON.stringify({
          name,
          category,
          fileName,
        }),
        description: `Uploaded document: ${name}`,
      },
    });

    // Log document access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: "VERSION_CREATED",
        details: JSON.stringify({ version: 1 }),
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
}
