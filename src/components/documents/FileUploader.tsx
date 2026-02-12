"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface FileUploaderProps {
  onUploadComplete: (documentId: string) => void;
  onCancel: () => void;
  metadata: {
    name: string;
    description?: string;
    category: string;
    subcategory?: string;
    moduleType?: string;
    issueDate?: string;
    expiryDate?: string;
    regulatoryRef?: string;
    accessLevel?: string;
    tags?: string[];
  };
}

type UploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "confirming"
  | "success"
  | "error";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUploader({
  onUploadComplete,
  onCancel,
  metadata,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not allowed. Please upload PDF, Word, Excel, or image files.";
    }
    if (file.size > MAX_SIZE) {
      return "File is too large. Maximum size is 50MB.";
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const uploadFile = async () => {
    if (!file || !metadata.name || !metadata.category) {
      setError("Please select a file and fill in required fields");
      return;
    }

    try {
      setStatus("preparing");
      setProgress(0);
      setError(null);

      // Step 1: Get presigned upload URL
      const uploadUrlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: metadata.category.toLowerCase(),
        }),
      });

      if (!uploadUrlRes.ok) {
        const data = await uploadUrlRes.json();
        throw new Error(data.error || "Failed to prepare upload");
      }

      const { uploadUrl, fileKey } = await uploadUrlRes.json();
      setProgress(10);

      // Step 2: Upload file directly to R2
      setStatus("uploading");

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 80) + 10;
            setProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setProgress(90);

      // Step 3: Confirm upload and create database record
      setStatus("confirming");

      const confirmRes = await fetch("/api/documents/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          fileKey,
          name: metadata.name,
          description: metadata.description,
          category: metadata.category,
          subcategory: metadata.subcategory,
          moduleType: metadata.moduleType,
          issueDate: metadata.issueDate,
          expiryDate: metadata.expiryDate,
          regulatoryRef: metadata.regulatoryRef,
          accessLevel: metadata.accessLevel || "INTERNAL",
          tags: metadata.tags || [],
        }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json();
        throw new Error(data.error || "Failed to confirm upload");
      }

      const { document } = await confirmRes.json();
      setProgress(100);
      setStatus("success");

      // Notify parent after a brief delay to show success state
      setTimeout(() => {
        onUploadComplete(document.id);
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12" />;
    if (file.type === "application/pdf")
      return <FileText className="w-12 h-12 text-red-500" />;
    if (file.type.startsWith("image/"))
      return <ImageIcon className="w-12 h-12 text-blue-500" />;
    return <File className="w-12 h-12 text-slate-500 dark:text-white/60" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusMessage = () => {
    switch (status) {
      case "preparing":
        return "Preparing upload...";
      case "uploading":
        return "Uploading to secure storage...";
      case "confirming":
        return "Finalizing...";
      case "success":
        return "Upload complete!";
      case "error":
        return error || "Upload failed";
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {status === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${
              isDragging
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                : file
                  ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.02]"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div
              className={`p-4 rounded-xl ${file ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-slate-100 dark:bg-white/10"}`}
            >
              {getFileIcon()}
            </div>

            {file ? (
              <>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-sm text-slate-500 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400"
                >
                  Remove file
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-slate-700 dark:text-white/70">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
                    PDF, Word, Excel, or images (max 50MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {status !== "idle" && status !== "error" && (
        <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-6 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-4 mb-4">
            {status === "success" ? (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {file?.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {getStatusMessage()}
              </p>
            </div>
            <span className="text-lg font-mono font-semibold text-slate-900 dark:text-white">
              {progress}%
            </span>
          </div>

          <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status === "success" ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {(error || status === "error") && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Upload failed
            </p>
            <p className="text-sm text-red-700 dark:text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={status === "uploading" || status === "confirming"}
          className="px-4 py-2 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        {status === "idle" && (
          <button
            onClick={uploadFile}
            disabled={!file}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} className="inline mr-2" />
            Upload Document
          </button>
        )}
        {status === "error" && (
          <button
            onClick={() => {
              setStatus("idle");
              setProgress(0);
              setError(null);
            }}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
