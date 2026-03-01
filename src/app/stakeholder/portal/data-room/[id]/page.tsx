"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Clock,
  Lock,
  Upload,
  Send,
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import WatermarkOverlay from "@/components/network/WatermarkOverlay";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
  downloadable: boolean;
  watermarked: boolean;
}

interface Comment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

interface DataRoomDetail {
  id: string;
  name: string;
  description: string;
  accessLevel:
    | "VIEW_ONLY"
    | "COMMENT"
    | "DOWNLOAD"
    | "CONTRIBUTE"
    | "FULL_ACCESS";
  expiresAt?: string;
  watermarkEnabled: boolean;
  documents: Document[];
  comments: Comment[];
  status: string;
}

const accessLevelLabels: Record<string, string> = {
  VIEW_ONLY: "View Only",
  COMMENT: "View & Comment",
  DOWNLOAD: "View & Download",
  CONTRIBUTE: "Contribute",
  FULL_ACCESS: "Full Access",
};

const accessLevelColors: Record<string, string> = {
  VIEW_ONLY: "bg-slate-500/10 text-slate-500",
  COMMENT: "bg-blue-500/10 text-blue-500",
  DOWNLOAD: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CONTRIBUTE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FULL_ACCESS: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  return FileText;
}

export default function DataRoomViewPage() {
  const params = useParams();
  const id = params.id as string;

  const [room, setRoom] = useState<DataRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document viewer state
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showComments, setShowComments] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => {
    return (
      localStorage.getItem("stakeholder_token") ||
      sessionStorage.getItem("stakeholder_token")
    );
  };

  const fetchRoom = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stakeholder/data-rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Data room not found");
        if (res.status === 403)
          throw new Error("Access denied to this data room");
        throw new Error("Failed to load data room");
      }

      const data = await res.json();
      setRoom(data);
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data room");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Track document view
  const trackView = async (documentId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(
        `/api/stakeholder/data-rooms/${id}/documents/${documentId}/view`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch {
      // View tracking is non-critical, silently fail
    }
  };

  const handleViewDocument = (doc: Document) => {
    setViewingDoc(doc);
    trackView(doc.id);
  };

  const handleDownloadDocument = async (doc: Document) => {
    const token = getToken();
    if (!token) return;

    trackView(doc.id);

    try {
      const res = await fetch(
        `/api/stakeholder/data-rooms/${id}/documents/${doc.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(doc.url, "_blank");
    }
  };

  const handlePostComment = async () => {
    const token = getToken();
    if (!token || !newComment.trim()) return;

    setPostingComment(true);

    try {
      const res = await fetch(`/api/stakeholder/data-rooms/${id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      // Could show error toast here
    } finally {
      setPostingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = getToken();
    const files = e.target.files;
    if (!token || !files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const res = await fetch(`/api/stakeholder/data-rooms/${id}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      // Refresh room data to show new documents
      await fetchRoom();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload files",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const canComment =
    room && ["COMMENT", "CONTRIBUTE", "FULL_ACCESS"].includes(room.accessLevel);
  const canDownload =
    room &&
    ["DOWNLOAD", "CONTRIBUTE", "FULL_ACCESS"].includes(room.accessLevel);
  const canUpload =
    room && ["CONTRIBUTE", "FULL_ACCESS"].includes(room.accessLevel);
  const isExpired = room?.expiresAt && new Date(room.expiresAt) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-body text-slate-500 dark:text-white/50">
            Loading data room...
          </p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-title font-semibold text-slate-800 dark:text-white mb-2">
            {error || "Data room not found"}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <a
              href="/stakeholder/portal"
              className="inline-flex items-center gap-2 text-small font-medium text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </a>
            <button
              onClick={fetchRoom}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-small rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <a
          href="/stakeholder/portal"
          className="inline-flex items-center gap-1.5 text-small text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </a>
      </div>

      {/* Room Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <GlassCard hover={false} className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-display-sm font-semibold text-slate-800 dark:text-white">
                  {room.name}
                </h1>
                {isExpired && (
                  <span className="text-micro uppercase tracking-wider font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-500">
                    Expired
                  </span>
                )}
              </div>
              {room.description && (
                <p className="text-body-lg text-slate-500 dark:text-white/50 mb-4">
                  {room.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`text-micro uppercase tracking-wider font-medium px-2.5 py-1 rounded-full ${accessLevelColors[room.accessLevel] || "bg-slate-500/10 text-slate-500"}`}
                >
                  {accessLevelLabels[room.accessLevel] || room.accessLevel}
                </span>
                {room.expiresAt && !isExpired && (
                  <span className="flex items-center gap-1 text-caption text-slate-400 dark:text-white/40">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {new Date(room.expiresAt).toLocaleDateString()}
                  </span>
                )}
                {room.watermarkEnabled && (
                  <span className="flex items-center gap-1 text-caption text-slate-400 dark:text-white/40">
                    <Lock className="w-3.5 h-3.5" />
                    Watermarked
                  </span>
                )}
                <span className="text-caption text-slate-400 dark:text-white/40">
                  {room.documents.length} document
                  {room.documents.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Expired Warning */}
      {isExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-body text-red-600 dark:text-red-400">
              This data room has expired. Documents are available in read-only
              mode. Contact your administrator to extend access.
            </p>
          </div>
        </motion.div>
      )}

      {/* Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading font-semibold text-slate-800 dark:text-white">
            Documents
          </h2>
          {canUpload && !isExpired && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium text-small rounded-lg px-4 py-2 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{uploading ? "Uploading..." : "Upload"}</span>
              </button>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-small text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          </div>
        )}

        {room.documents.length > 0 ? (
          <div className="relative">
            {room.watermarkEnabled ? (
              <WatermarkOverlay
                stakeholderName="Stakeholder"
                timestamp={new Date().toISOString()}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {room.documents.map((doc) => {
                    const FileIcon = getFileIcon(doc.mimeType);
                    return (
                      <GlassCard key={doc.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[--glass-bg-surface] flex items-center justify-center flex-shrink-0">
                            <FileIcon className="w-5 h-5 text-slate-400 dark:text-white/40" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body font-medium text-slate-800 dark:text-white truncate">
                              {doc.name}
                            </p>
                            <p className="text-caption text-slate-400 dark:text-white/40">
                              {formatFileSize(doc.size)} &middot;{" "}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="flex items-center gap-1.5 text-caption font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          {canDownload && doc.downloadable && (
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="flex items-center gap-1.5 text-caption font-medium text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </WatermarkOverlay>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {room.documents.map((doc) => {
                  const FileIcon = getFileIcon(doc.mimeType);
                  return (
                    <GlassCard key={doc.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[--glass-bg-surface] flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-5 h-5 text-slate-400 dark:text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-slate-800 dark:text-white truncate">
                            {doc.name}
                          </p>
                          <p className="text-caption text-slate-400 dark:text-white/40">
                            {formatFileSize(doc.size)} &middot;{" "}
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="flex items-center gap-1.5 text-caption font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {canDownload && doc.downloadable && (
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex items-center gap-1.5 text-caption font-medium text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8">
            <div className="text-center">
              <File className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-body text-slate-500 dark:text-white/50">
                No documents in this data room yet.
              </p>
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setViewingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-200 dark:border-[--glass-border-subtle] shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Viewer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[--glass-border-subtle]">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-slate-400 dark:text-white/40 flex-shrink-0" />
                  <span className="text-body font-medium text-slate-800 dark:text-white truncate">
                    {viewingDoc.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canDownload && viewingDoc.downloadable && (
                    <button
                      onClick={() => handleDownloadDocument(viewingDoc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-medium text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="flex-1 overflow-auto relative">
                {room.watermarkEnabled && (
                  <WatermarkOverlay
                    stakeholderName="Stakeholder"
                    timestamp={new Date().toISOString()}
                  >
                    <span />
                  </WatermarkOverlay>
                )}
                {viewingDoc.mimeType === "application/pdf" ? (
                  <iframe
                    src={viewingDoc.url}
                    className="w-full h-full min-h-[70vh]"
                    title={viewingDoc.name}
                  />
                ) : viewingDoc.mimeType.startsWith("image/") ? (
                  <div className="relative flex items-center justify-center p-8 min-h-[70vh]">
                    <Image
                      src={viewingDoc.url}
                      alt={viewingDoc.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 text-center">
                    <div>
                      <FileText className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
                      <p className="text-body text-slate-500 dark:text-white/50 mb-2">
                        Preview not available for this file type.
                      </p>
                      {canDownload && viewingDoc.downloadable && (
                        <button
                          onClick={() => handleDownloadDocument(viewingDoc)}
                          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-small rounded-lg px-4 py-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download to View</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 mb-4 text-heading font-semibold text-slate-800 dark:text-white"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Comments ({comments.length})</span>
          {showComments ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* Comment List */}
              {comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <GlassCard key={comment.id} hover={false} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-caption font-medium text-emerald-600 dark:text-emerald-400">
                            {comment.author
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-body font-medium text-slate-800 dark:text-white">
                              {comment.author}
                            </span>
                            <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30 bg-slate-100 dark:bg-[--glass-bg-surface] px-1.5 py-0.5 rounded">
                              {comment.authorRole}
                            </span>
                            <span className="text-caption text-slate-400 dark:text-white/30">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-body text-slate-600 dark:text-white/70 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard hover={false} className="p-6 mb-4">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                    <p className="text-small text-slate-400 dark:text-white/40">
                      No comments yet.
                    </p>
                  </div>
                </GlassCard>
              )}

              {/* New Comment Input */}
              {canComment && !isExpired && (
                <GlassCard hover={false} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-[--glass-border-subtle] bg-slate-50 dark:bg-[--glass-bg-surface] text-body text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={handlePostComment}
                      disabled={postingComment || !newComment.trim()}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-medium text-small rounded-lg px-4 py-3 transition-colors"
                    >
                      {postingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
