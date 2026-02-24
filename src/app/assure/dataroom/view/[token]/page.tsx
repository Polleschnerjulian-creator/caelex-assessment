"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Clock,
  Shield,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───

interface Document {
  id: string;
  fileName: string;
  downloadUrl?: string;
  uploadedAt: string;
}

interface DataRoomFolder {
  name: string;
  documents: Document[];
}

interface DataRoomViewData {
  companyName: string;
  folders: DataRoomFolder[];
  expiresAt: string;
  watermark?: string;
}

// ─── Component ───

export default function DataRoomPublicViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<DataRoomViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assure/view/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body.error ||
              `This data room link is no longer available (${res.status})`,
          );
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load data room. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-white/60">Loading data room...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h1 className="text-display-sm font-bold text-white mb-2">
            Link Unavailable
          </h1>
          <p className="text-body-lg text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalDocs = data.folders.reduce(
    (sum, f) => sum + f.documents.length,
    0,
  );
  const isExpired = new Date(data.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Watermark */}
      {data.watermark && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-[0.03]">
          <span className="text-[120px] font-bold text-white transform -rotate-45 select-none">
            {data.watermark}
          </span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-emerald-400" />
            <span className="text-small text-emerald-400 font-medium">
              Secure Data Room
            </span>
          </div>
          <h1 className="text-display font-bold text-white mb-2">
            {data.companyName}
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-body-lg text-white/40">
              {totalDocs} documents across {data.folders.length} folders
            </p>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-white/30" />
              <span
                className={`text-small ${isExpired ? "text-red-400" : "text-white/30"}`}
              >
                {isExpired
                  ? "Expired"
                  : `Expires ${new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Expired Warning */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center gap-3"
          >
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-body text-red-300">
              This data room link has expired. Contact the company for a new
              access link.
            </p>
          </motion.div>
        )}

        {/* Folders */}
        <div className="space-y-6">
          {data.folders.map((folder, folderIdx) => (
            <motion.div
              key={folder.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: folderIdx * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Folder header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                <FolderOpen size={18} className="text-emerald-400" />
                <h2 className="text-heading font-semibold text-white">
                  {folder.name}
                </h2>
                <span className="text-micro text-white/30 ml-auto">
                  {folder.documents.length} file
                  {folder.documents.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Documents */}
              {folder.documents.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {folder.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <FileText
                        size={16}
                        className="text-white/30 flex-shrink-0"
                      />
                      <span className="text-body text-white/70 flex-1 truncate">
                        {doc.fileName}
                      </span>
                      <span className="text-micro text-white/25 flex-shrink-0">
                        {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {doc.downloadUrl && !isExpired && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-white/30 hover:text-emerald-400 hover:bg-white/5 transition-all"
                          title="Download"
                        >
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-small text-white/25">
                    No documents in this folder.
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {data.folders.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen size={32} className="text-white/15 mx-auto mb-4" />
            <h3 className="text-heading font-semibold text-white mb-2">
              No Documents Available
            </h3>
            <p className="text-body text-white/40">
              This data room does not contain any documents yet.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-micro text-white/20">
            Powered by Caelex Assure. This is a confidential document sharing
            portal.
          </p>
        </div>
      </div>
    </div>
  );
}
