"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FolderLock,
  FileText,
  Activity,
  MessageSquare,
  Plus,
  Settings,
  Loader2,
  AlertCircle,
  X,
  Clock,
  Shield,
  Eye,
  Download,
  Printer,
  Droplets,
  Lock,
  CheckCircle2,
  Trash2,
  XCircle,
  Building2,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { csrfHeaders } from "@/lib/csrf-client";
import DataRoomDocumentGrid, {
  type DataRoomDocument as DataRoomDocumentType,
} from "@/components/network/DataRoomDocumentGrid";
import AccessLogTable, {
  type AccessLog,
} from "@/components/network/AccessLogTable";

// ─── Types ───

type TabId = "documents" | "access-log" | "comments";

interface DataRoomDetail {
  id: string;
  name: string;
  description: string | null;
  stakeholderName: string;
  stakeholderType: string;
  engagementId: string;
  accessLevel: string;
  expiresAt: string | null;
  watermarkEnabled: boolean;
  downloadEnabled: boolean;
  printEnabled: boolean;
  status: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DataRoomDocument {
  id: string;
  documentId: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  addedAt: string;
  addedBy: string;
}

interface AccessLogEntry {
  id: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  actorName: string;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgDocument {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  category: string;
}

// ─── Access Level Badges ───

const ACCESS_LEVEL_BADGES: Record<string, { label: string; color: string }> = {
  VIEW_ONLY: {
    label: "View Only",
    color: "bg-slate-500/10 text-slate-400",
  },
  DOWNLOAD: {
    label: "Download",
    color: "bg-green-500/10 text-green-400",
  },
  FULL: {
    label: "Full Access",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  RESTRICTED: {
    label: "Restricted",
    color: "bg-amber-500/10 text-amber-400",
  },
};

const ROOM_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-emerald-500/10 text-emerald-400" },
  CLOSED: { label: "Closed", color: "bg-slate-500/10 text-slate-400" },
  EXPIRED: { label: "Expired", color: "bg-red-500/10 text-red-400" },
};

// ─── Tab Config ───

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "documents",
    label: "Documents",
    icon: <FileText size={16} />,
  },
  {
    id: "access-log",
    label: "Access Log",
    icon: <Activity size={16} />,
  },
  {
    id: "comments",
    label: "Comments",
    icon: <MessageSquare size={16} />,
  },
];

// ─── Page ───

export default function DataRoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const dataRoomId = params.id as string;
  const orgId = organization?.id;

  // Core state
  const [room, setRoom] = useState<DataRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("documents");

  // Documents
  const [documents, setDocuments] = useState<DataRoomDocument[]>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [orgDocuments, setOrgDocuments] = useState<OrgDocument[]>([]);
  const [loadingOrgDocs, setLoadingOrgDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [addingDocs, setAddingDocs] = useState(false);

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Room Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    accessLevel: "VIEW_ONLY",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingRoom, setClosingRoom] = useState(false);

  // ─── Data Fetching ───

  const loadRoom = useCallback(async () => {
    if (!orgId || !dataRoomId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/network/data-rooms/${dataRoomId}?organizationId=${orgId}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load data room");
      }
      const data = await res.json();
      const roomData = data.dataRoom || data;
      setRoom(roomData);
      setSettingsForm({
        name: roomData.name || "",
        description: roomData.description || "",
        accessLevel: roomData.accessLevel || "VIEW_ONLY",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data room");
    } finally {
      setLoading(false);
    }
  }, [orgId, dataRoomId]);

  const loadTabData = useCallback(async () => {
    if (!orgId || !dataRoomId) return;

    try {
      if (activeTab === "documents") {
        const res = await fetch(
          `/api/network/data-rooms/${dataRoomId}/documents?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } else if (activeTab === "access-log") {
        const res = await fetch(
          `/api/network/data-rooms/${dataRoomId}/access-logs?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAccessLogs(data.logs || []);
        }
      } else if (activeTab === "comments") {
        const res = await fetch(
          `/api/network/data-rooms/${dataRoomId}/comments?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      }
    } catch (err) {
      console.error("Failed to load tab data:", err);
    }
  }, [orgId, dataRoomId, activeTab]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (room) {
      loadTabData();
    }
  }, [loadTabData, room]);

  // ─── Document Handlers ───

  const handleOpenAddDocument = async () => {
    setShowAddDocument(true);
    setLoadingOrgDocs(true);
    setSelectedDocIds(new Set());

    try {
      const res = await fetch(
        `/api/documents?organizationId=${orgId}&limit=100`,
      );
      if (res.ok) {
        const data = await res.json();
        setOrgDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load org documents:", err);
    } finally {
      setLoadingOrgDocs(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleAddDocuments = async () => {
    if (!orgId || selectedDocIds.size === 0) return;
    setAddingDocs(true);

    try {
      const res = await fetch(
        `/api/network/data-rooms/${dataRoomId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            organizationId: orgId,
            documentIds: Array.from(selectedDocIds),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add documents");
      }

      setShowAddDocument(false);
      setSelectedDocIds(new Set());
      loadTabData();
      loadRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add documents");
    } finally {
      setAddingDocs(false);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!orgId) return;

    try {
      const res = await fetch(
        `/api/network/data-rooms/${dataRoomId}/documents/${documentId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ organizationId: orgId }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove document");
      }

      loadTabData();
      loadRoom();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove document",
      );
    }
  };

  // ─── Comment Handlers ───

  const handlePostComment = async () => {
    if (!orgId || !newComment.trim()) return;
    setPostingComment(true);

    try {
      const res = await fetch(
        `/api/network/data-rooms/${dataRoomId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            organizationId: orgId,
            content: newComment.trim(),
            entityType: "data_room",
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post comment");
      }

      setNewComment("");
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  // ─── Settings Handlers ───

  const handleSaveSettings = async () => {
    if (!orgId) return;
    setSavingSettings(true);

    try {
      const res = await fetch(`/api/network/data-rooms/${dataRoomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          organizationId: orgId,
          name: settingsForm.name,
          description: settingsForm.description,
          accessLevel: settingsForm.accessLevel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }

      setShowSettings(false);
      loadRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!orgId) return;
    setClosingRoom(true);

    try {
      const res = await fetch(`/api/network/data-rooms/${dataRoomId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to close data room");
      }

      if (room?.engagementId) {
        router.push(`/dashboard/network/${room.engagementId}`);
      } else {
        router.push("/dashboard/network");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to close data room",
      );
      setClosingRoom(false);
      setShowCloseConfirm(false);
    }
  };

  // ─── Format Helpers ───

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-8 bg-slate-200 dark:bg-[--glass-bg-elevated] rounded animate-pulse w-48" />
        <div className="h-32 bg-slate-200 dark:bg-[--glass-bg-elevated] rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-[--glass-bg-elevated] rounded-xl animate-pulse" />
        <span className="sr-only">Loading data room...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-white/45">
          {error || "Data room not found"}
        </p>
        <button
          onClick={() => router.push("/dashboard/network")}
          className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Back to Network
        </button>
      </div>
    );
  }

  const accessBadge =
    ACCESS_LEVEL_BADGES[room.accessLevel] || ACCESS_LEVEL_BADGES.VIEW_ONLY;
  const statusBadge =
    ROOM_STATUS_BADGES[room.status] || ROOM_STATUS_BADGES.OPEN;

  return (
    <div className="space-y-6">
      {/* Back Link + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            room.engagementId
              ? router.push(`/dashboard/network/${room.engagementId}`)
              : router.push("/dashboard/network")
          }
          aria-label="Back to engagement"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface] transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FolderLock size={18} className="text-emerald-400 flex-shrink-0" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white truncate">
              {room.name}
            </h1>
            <span
              className={`text-micro px-2 py-0.5 rounded font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            <span
              className={`text-micro px-2 py-0.5 rounded font-medium ${accessBadge.color}`}
            >
              {accessBadge.label}
            </span>
          </div>
          {room.description && (
            <p className="text-xs text-slate-500 dark:text-white/45 mt-1 truncate">
              {room.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface] transition-colors"
          aria-label="Room settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Room Info Bar */}
      <GlassCard hover={false} className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-white/45">
          <span className="flex items-center gap-1.5">
            <Building2
              size={13}
              className="text-slate-400 dark:text-white/30"
            />
            {room.stakeholderName}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText size={13} className="text-slate-400 dark:text-white/30" />
            {room.documentCount} document{room.documentCount !== 1 ? "s" : ""}
          </span>
          {room.expiresAt && (
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400 dark:text-white/30" />
              Expires: {new Date(room.expiresAt).toLocaleDateString()}
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <span
              className={`flex items-center gap-1 ${room.watermarkEnabled ? "text-emerald-400" : "text-slate-400 dark:text-white/25"}`}
              title="Watermark"
            >
              <Droplets size={13} />
              <span className="text-micro">Watermark</span>
            </span>
            <span
              className={`flex items-center gap-1 ${room.downloadEnabled ? "text-emerald-400" : "text-slate-400 dark:text-white/25"}`}
              title="Download"
            >
              <Download size={13} />
              <span className="text-micro">Download</span>
            </span>
            <span
              className={`flex items-center gap-1 ${room.printEnabled ? "text-emerald-400" : "text-slate-400 dark:text-white/25"}`}
              title="Print"
            >
              <Printer size={13} />
              <span className="text-micro">Print</span>
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-white dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5"
        role="tablist"
        aria-label="Data room sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeTab === tab.id
                  ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
              }
            `}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText
                    size={16}
                    className="text-slate-400 dark:text-white/45"
                  />
                  Documents ({documents.length})
                </h2>
                {room.status === "OPEN" && (
                  <button
                    onClick={handleOpenAddDocument}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Add Document
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[--glass-bg-surface] flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-7 h-7 text-slate-300 dark:text-white/15" />
                    </div>
                    <h3 className="text-title font-medium text-slate-900 dark:text-white mb-2">
                      No documents in this room
                    </h3>
                    <p className="text-small text-slate-500 dark:text-white/45 mb-6 max-w-sm mx-auto">
                      Add documents from your organization's vault to share with
                      this stakeholder.
                    </p>
                    {room.status === "OPEN" && (
                      <button
                        onClick={handleOpenAddDocument}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                      >
                        <Plus size={14} />
                        Add Document
                      </button>
                    )}
                  </div>
                </GlassCard>
              ) : (
                <DataRoomDocumentGrid
                  documents={documents.map(
                    (doc): DataRoomDocumentType => ({
                      id: doc.id,
                      name: doc.name,
                      fileType:
                        doc.mimeType ||
                        doc.fileName?.split(".").pop() ||
                        "unknown",
                      fileSize: doc.fileSize,
                      category: doc.category,
                      addedAt: doc.addedAt,
                    }),
                  )}
                  onRemove={
                    room.status === "OPEN" ? handleRemoveDocument : () => {}
                  }
                  onAdd={handleOpenAddDocument}
                  readOnly={room.status !== "OPEN"}
                />
              )}
            </div>
          )}

          {/* Access Log Tab */}
          {activeTab === "access-log" && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Activity
                  size={16}
                  className="text-slate-400 dark:text-white/45"
                />
                Access Log
              </h2>

              {accessLogs.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[--glass-bg-surface] flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-7 h-7 text-slate-300 dark:text-white/15" />
                    </div>
                    <h3 className="text-title font-medium text-slate-900 dark:text-white mb-2">
                      No access recorded
                    </h3>
                    <p className="text-small text-slate-500 dark:text-white/45 max-w-sm mx-auto">
                      All access to this data room will be logged here
                      automatically.
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard hover={false} className="overflow-hidden">
                  <AccessLogTable
                    logs={accessLogs.map(
                      (log): AccessLog => ({
                        id: log.id,
                        timestamp: log.timestamp,
                        action: log.action,
                        ipAddress: log.ipAddress,
                        userAgent: log.userAgent,
                        entityType: "data_room",
                        entityId: dataRoomId,
                        entityName: log.resource || log.actorName,
                        durationMs: null,
                      }),
                    )}
                  />
                </GlassCard>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare
                  size={16}
                  className="text-slate-400 dark:text-white/45"
                />
                Comments ({comments.length})
              </h2>

              {/* Comment Input */}
              <GlassCard hover={false} className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment about this data room..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || postingComment}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {postingComment ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <MessageSquare size={14} />
                        )}
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Comment Thread */}
              {comments.length === 0 ? (
                <GlassCard hover={false} className="p-8">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-white/45">
                      No comments yet. Start the conversation.
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <GlassCard key={comment.id} hover={false} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-micro font-medium text-emerald-400">
                            {comment.authorName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {comment.authorName}
                            </span>
                            {comment.authorRole && (
                              <span className="text-micro px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[--glass-bg-elevated] text-slate-400 dark:text-white/30">
                                {comment.authorRole}
                              </span>
                            )}
                            <span className="text-micro text-slate-400 dark:text-white/25">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-white/70 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Add document to data room"
            aria-modal="true"
            className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Documents
              </h3>
              <button
                onClick={() => setShowAddDocument(false)}
                aria-label="Close dialog"
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X
                  size={16}
                  className="text-slate-500 dark:text-white/45"
                  aria-hidden="true"
                />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-white/45 mb-4">
              Select documents from your organization's vault to share in this
              data room.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {loadingOrgDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-white/45" />
                </div>
              ) : orgDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 dark:text-white/45">
                    No documents available in your organization's vault.
                  </p>
                </div>
              ) : (
                orgDocuments.map((doc) => {
                  const isSelected = selectedDocIds.has(doc.id);
                  const alreadyInRoom = documents.some(
                    (d) => d.documentId === doc.id,
                  );

                  return (
                    <button
                      key={doc.id}
                      onClick={() =>
                        !alreadyInRoom && toggleDocSelection(doc.id)
                      }
                      disabled={alreadyInRoom}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                        ${
                          alreadyInRoom
                            ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]"
                            : isSelected
                              ? "bg-emerald-500/10 border border-emerald-500/30"
                              : "bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/20"
                        }
                      `}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 dark:border-white/20"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 size={12} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 text-micro text-slate-400 dark:text-white/30">
                          <span>{doc.category}</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </div>
                      </div>
                      {alreadyInRoom && (
                        <span className="text-micro text-slate-400 dark:text-white/30">
                          Already added
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <span className="text-sm text-slate-500 dark:text-white/45">
                {selectedDocIds.size} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddDocument(false)}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDocuments}
                  disabled={selectedDocIds.size === 0 || addingDocs}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingDocs ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Add to Data Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Data room settings"
            aria-modal="true"
            className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl p-6 max-w-lg w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Room Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Close dialog"
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X
                  size={16}
                  className="text-slate-500 dark:text-white/45"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-500 dark:text-white/45 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-white/45 mb-1">
                  Description
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-white/45 mb-1">
                  Access Level
                </label>
                <select
                  value={settingsForm.accessLevel}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      accessLevel: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="VIEW_ONLY">View Only</option>
                  <option value="DOWNLOAD">Download</option>
                  <option value="FULL">Full Access</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Lock size={14} />
                Close Room
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingSettings ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Room Confirmation */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Confirm close data room"
            aria-modal="true"
            className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Lock size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Close Data Room
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/45 mb-6">
              Closing this data room will revoke all stakeholder access to the
              shared documents. The room can be reopened later if needed. Are
              you sure?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRoom}
                disabled={closingRoom}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {closingRoom ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Lock size={14} />
                )}
                Close Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
