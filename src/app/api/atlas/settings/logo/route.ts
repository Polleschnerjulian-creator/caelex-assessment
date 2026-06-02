/**
 * POST /api/atlas/settings/logo
 *
 * Accepts a multipart/form-data upload of a firm logo, stores it in R2,
 * and returns the public HTTPS URL so the caller can PATCH firm.logoUrl.
 *
 * Auth:   getAtlasAuth() — authenticated Atlas session required.
 * Perm:   canManageFirm (OWNER + ADMIN). Mirrors the firm PATCH gate.
 * Limits: 2 MB, image/png | image/jpeg | image/webp | image/svg+xml only.
 */
import { NextRequest, NextResponse } from "next/server";
import { canManageFirm, getAtlasAuth } from "@/lib/atlas-auth";
import {
  uploadFileServerSide,
  getPublicFileUrl,
  isR2Configured,
} from "@/lib/storage/upload-service";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";

/** Image MIME types accepted for firm logos. */
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** 2 MB cap — generous for a logo, keeps presign/server-upload path cheap. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isAllowedImageType(mime: string): mime is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

export async function POST(request: NextRequest) {
  // ── Auth ──
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageFirm(atlas.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can update the firm logo" },
      { status: 403 },
    );
  }

  // ── R2 availability ──
  if (!isR2Configured()) {
    // Graceful degradation: tell the client so it can surface a message.
    return NextResponse.json(
      { error: "File storage not configured" },
      { status: 503 },
    );
  }

  // ── Parse multipart form ──
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing file field in form data" },
      { status: 400 },
    );
  }

  // ── MIME validation ──
  const mimeType = file.type || "application/octet-stream";
  if (!isAllowedImageType(mimeType)) {
    return NextResponse.json(
      {
        error: `File type not allowed. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // ── Size validation ──
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json(
      {
        error: `Logo too large. Maximum size: ${MAX_LOGO_BYTES / (1024 * 1024)} MB`,
      },
      { status: 400 },
    );
  }

  // ── Derive a safe filename ──
  const ext = mimeType.split("/")[1]?.replace("svg+xml", "svg") ?? "png";
  const safeFilename = `logo-${Date.now()}.${ext}`;

  // ── Upload to R2 ──
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { fileKey } = await uploadFileServerSide(
      atlas.organizationId,
      "general", // category bucket — consistent with other org assets
      safeFilename,
      mimeType,
      fileBuffer,
    );

    // Build public URL — requires R2_PUBLIC_URL env var (Cloudflare R2
    // custom domain / public bucket). Falls back to a signed URL if
    // getPublicFileUrl returns null (private bucket scenario).
    const publicUrl = getPublicFileUrl(fileKey);

    if (!publicUrl) {
      // Private bucket: the firm logo can't be displayed without signing.
      // Surface this explicitly so the operator knows to configure
      // R2_PUBLIC_URL for the logo feature to work end-to-end.
      logger.warn("Atlas logo uploaded to R2 but no public URL configured", {
        organizationId: maskId(atlas.organizationId),
        fileKey,
      });
      return NextResponse.json(
        {
          error:
            "Logo uploaded but no public URL is available. " +
            "Configure R2_PUBLIC_URL to enable logo display.",
        },
        { status: 503 },
      );
    }

    logger.info("Atlas firm logo uploaded", {
      organizationId: maskId(atlas.organizationId),
      uploadedBy: maskId(atlas.userId),
      fileKey,
    });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    logger.error("Atlas firm logo upload failed", { error: err });
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 },
    );
  }
}
