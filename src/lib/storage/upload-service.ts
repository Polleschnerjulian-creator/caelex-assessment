import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getR2Client,
  getR2BucketName,
  getR2PublicUrl,
  isR2Configured,
  isAllowedMimeType,
  isFileSizeAllowed,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "./r2-client";
import { v4 as uuidv4 } from "uuid";

// Document categories for file organization
export type DocumentCategory =
  | "authorization"
  | "environmental"
  | "cybersecurity"
  | "insurance"
  | "debris"
  | "registration"
  | "general";

export interface PresignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  expiresAt: Date;
}

export interface PresignedDownloadUrl {
  downloadUrl: string;
  expiresAt: Date;
}

export interface FileMetadata {
  contentType: string;
  contentLength: number;
  lastModified: Date;
  etag?: string;
}

export interface UploadValidation {
  valid: boolean;
  error?: string;
}

// ─── Validation ───

export function validateUpload(
  mimeType: string,
  fileSize: number,
): UploadValidation {
  if (!isAllowedMimeType(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  if (!isFileSizeAllowed(fileSize)) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

// ─── Key Generation ───

function generateFileKey(
  organizationId: string,
  category: DocumentCategory,
  filename: string,
  documentId?: string,
): string {
  const id = documentId || uuidv4();
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${organizationId}/${category}/${id}/${safeFilename}`;
}

// ─── Presigned Upload URL ───

export async function generatePresignedUploadUrl(
  organizationId: string,
  category: DocumentCategory,
  filename: string,
  mimeType: string,
  fileSize: number,
  documentId?: string,
  expiresInSeconds: number = 3600, // 1 hour default
): Promise<PresignedUploadUrl> {
  // Validate
  const validation = validateUpload(mimeType, fileSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check R2 configuration
  if (!isR2Configured()) {
    throw new Error("R2 storage not configured");
  }

  const client = getR2Client();
  if (!client) {
    throw new Error("Failed to initialize R2 client");
  }

  const bucketName = getR2BucketName();
  const fileKey = generateFileKey(
    organizationId,
    category,
    filename,
    documentId,
  );

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: mimeType,
    ContentLength: fileSize,
    Metadata: {
      "organization-id": organizationId,
      category,
      "original-filename": filename,
    },
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    fileKey,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}

// ─── Presigned Download URL ───

export async function generatePresignedDownloadUrl(
  fileKey: string,
  expiresInSeconds: number = 3600, // 1 hour default
  downloadFilename?: string,
): Promise<PresignedDownloadUrl> {
  if (!isR2Configured()) {
    throw new Error("R2 storage not configured");
  }

  const client = getR2Client();
  if (!client) {
    throw new Error("Failed to initialize R2 client");
  }

  const bucketName = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ...(downloadFilename && {
      ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
    }),
  });

  const downloadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    downloadUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}

// ─── Get Public URL (if R2 bucket has public access) ───

export function getPublicFileUrl(fileKey: string): string | null {
  const publicUrl = getR2PublicUrl();
  if (!publicUrl) {
    return null;
  }
  return `${publicUrl}/${fileKey}`;
}

// ─── Delete File ───

export async function deleteFile(fileKey: string): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("R2 storage not configured");
  }

  const client = getR2Client();
  if (!client) {
    throw new Error("Failed to initialize R2 client");
  }

  const bucketName = getR2BucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  await client.send(command);
}

// ─── Get File Metadata ───

export async function getFileMetadata(
  fileKey: string,
): Promise<FileMetadata | null> {
  if (!isR2Configured()) {
    throw new Error("R2 storage not configured");
  }

  const client = getR2Client();
  if (!client) {
    throw new Error("Failed to initialize R2 client");
  }

  const bucketName = getR2BucketName();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const response = await client.send(command);

    return {
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      etag: response.ETag,
    };
  } catch (error) {
    // File not found
    if ((error as { name?: string }).name === "NotFound") {
      return null;
    }
    throw error;
  }
}

// ─── Check if file exists ───

export async function fileExists(fileKey: string): Promise<boolean> {
  const metadata = await getFileMetadata(fileKey);
  return metadata !== null;
}

// ─── Re-export config check ───

export { isR2Configured };
