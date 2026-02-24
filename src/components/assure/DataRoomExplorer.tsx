"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Calendar,
  ChevronRight,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

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

interface DataRoomExplorerProps {
  folders: DataRoomFolder[];
  onUpload?: (folder: string) => void;
}

// ─── Component ───

export default function DataRoomExplorer({
  folders,
  onUpload,
}: DataRoomExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    folders.forEach((f) => {
      initial[f.name] = true;
    });
    return initial;
  });

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const totalDocs = folders.reduce((sum, f) => sum + f.documents.length, 0);

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-small text-white/40">
          {folders.length} folders, {totalDocs} document
          {totalDocs !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Folders */}
      <div className="space-y-2">
        {folders.map((folder, folderIdx) => {
          const isExpanded = expandedFolders[folder.name] ?? false;

          return (
            <motion.div
              key={folder.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: folderIdx * 0.05 }}
            >
              <GlassCard hover={false} className="overflow-hidden">
                {/* Folder header */}
                <button
                  onClick={() => toggleFolder(folder.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight size={14} className="text-white/30" />
                  </motion.span>

                  {isExpanded ? (
                    <FolderOpen size={18} className="text-emerald-400" />
                  ) : (
                    <Folder size={18} className="text-white/40" />
                  )}

                  <span className="text-body font-medium text-white/80 flex-1 text-left">
                    {folder.name}
                  </span>

                  <span className="text-micro text-white/30 px-2 py-0.5 rounded bg-white/5">
                    {folder.documents.length} file
                    {folder.documents.length !== 1 ? "s" : ""}
                  </span>

                  {onUpload && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpload(folder.name);
                      }}
                      className="p-1.5 rounded-md text-white/20 hover:text-emerald-400 hover:bg-white/5 transition-all"
                      title={`Upload to ${folder.name}`}
                    >
                      <Upload size={14} />
                    </button>
                  )}
                </button>

                {/* Documents list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/5">
                        {folder.documents.length > 0 ? (
                          folder.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0"
                            >
                              <FileText
                                size={14}
                                className="text-white/30 flex-shrink-0"
                              />
                              <span className="text-small text-white/60 flex-1 truncate">
                                {doc.fileName}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Calendar size={10} className="text-white/20" />
                                <span className="text-micro text-white/25">
                                  {new Date(doc.uploadedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-4 pl-12 text-center">
                            <p className="text-small text-white/25">
                              No documents uploaded yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {folders.length === 0 && (
        <GlassCard hover={false} className="p-10">
          <div className="flex flex-col items-center text-center">
            <Folder size={32} className="text-white/15 mb-3" />
            <p className="text-body text-white/30">No folders configured.</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
