import { S3Client } from "@aws-sdk/client-s3";

// Singleton R2 client
let r2Client: S3Client | null = null;

export function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || "caelex-documents";
}

export function getR2PublicUrl(): string | null {
  return process.env.R2_PUBLIC_URL || null;
}

// Allowed MIME types for upload
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/msword", // doc
  "application/vnd.ms-excel", // xls
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// File extension mapping
export const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isFileSizeAllowed(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}
