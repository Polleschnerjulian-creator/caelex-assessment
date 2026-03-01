"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, BarChart3 } from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";
import DataRoomExplorer from "@/components/assure/DataRoomExplorer";
import DataRoomChecklist from "@/components/assure/DataRoomChecklist";
import AccessLinkManager from "@/components/assure/AccessLinkManager";

// ─── Types ───

interface Document {
  id: string;
  fileName: string;
  uploadedAt: string;
}

interface DataRoomFolder {
  name: string;
  documents: Document[];
}

interface ChecklistItem {
  folder: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  fromComply?: boolean;
}

interface DataRoomLink {
  id: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  token: string;
}

// ─── Component ───

export default function DataRoomPage() {
  const [folders, setFolders] = useState<DataRoomFolder[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [links, setLinks] = useState<DataRoomLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/dataroom");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setChecklist(data.checklistItems || []);
        setLinks(data.accessLinks || []);
      }
    } catch (err) {
      console.error("Failed to fetch data room:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (folder: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt";
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        const res = await fetch("/api/assure/dataroom/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            folder,
            fileName: files[0].name,
            fileSize: files[0].size,
            fileUrl: URL.createObjectURL(files[0]),
          }),
        });
        if (res.ok) {
          await fetchData();
        }
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleCreateLink = async () => {
    const recipientName = prompt("Recipient name:");
    if (!recipientName) return;
    const recipientEmail = prompt("Recipient email:");
    if (!recipientEmail) return;

    try {
      const res = await fetch("/api/assure/dataroom/links", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ recipientName, recipientEmail }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Create link failed:", err);
    }
  };

  const handleRevokeLink = async (id: string) => {
    try {
      const res = await fetch(`/api/assure/dataroom/links/${id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? { ...l, isActive: false } : l)),
        );
      }
    } catch (err) {
      console.error("Revoke link failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-white/5 rounded-xl" />
          <div className="h-[400px] bg-white/5 rounded-xl" />
        </div>
        <div className="h-[300px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading data room...</span>
      </div>
    );
  }

  const totalDocs = folders.reduce((sum, f) => sum + f.documents.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Data Room
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            {totalDocs} documents across {folders.length} folders.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/assure/dataroom/analytics"
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-body px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Analytics
          </Link>
          <button
            onClick={() => handleUpload("General")}
            disabled={uploading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Upload
          </button>
        </div>
      </div>

      {/* Explorer + Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <GlassCard hover={false} className="p-6">
            <h2 className="text-heading font-semibold text-white mb-5">
              Documents
            </h2>
            <DataRoomExplorer folders={folders} onUpload={handleUpload} />
          </GlassCard>
        </div>

        <GlassCard hover={false} className="p-6">
          <h2 className="text-heading font-semibold text-white mb-5">
            DD Checklist
          </h2>
          <DataRoomChecklist items={checklist} />
        </GlassCard>
      </div>

      {/* Access Links */}
      <div className="mb-6">
        <AccessLinkManager
          links={links}
          onCreate={handleCreateLink}
          onRevoke={handleRevokeLink}
        />
      </div>
    </div>
  );
}
