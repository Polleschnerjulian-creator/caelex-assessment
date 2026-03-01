"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileBarChart,
  FilePieChart,
  FileSearch,
  Download,
  Calendar,
  ExternalLink,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface Material {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  pdfUrl?: string;
}

interface MaterialsLibraryProps {
  materials: Material[];
}

// ─── Helpers ───

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "executive_summary":
    case "executive summary":
      return <FileText size={20} className="text-emerald-400" />;
    case "investment_teaser":
    case "investment teaser":
      return <FilePieChart size={20} className="text-blue-400" />;
    case "company_profile":
    case "company profile":
      return <FileBarChart size={20} className="text-purple-400" />;
    case "risk_report":
    case "risk report":
      return <FileSearch size={20} className="text-amber-400" />;
    default:
      return <FileText size={20} className="text-white/40" />;
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "executive_summary":
    case "executive summary":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "investment_teaser":
    case "investment teaser":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "company_profile":
    case "company profile":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "risk_report":
    case "risk report":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-white/5 text-white/40 border-white/10";
  }
}

function formatTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ───

export default function MaterialsLibrary({ materials }: MaterialsLibraryProps) {
  return (
    <div>
      {materials.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard hover className="p-5 h-full flex flex-col">
                {/* Icon and Type */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    {getTypeIcon(material.type)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-micro font-medium ${getTypeBadgeColor(material.type)}`}
                  >
                    {formatTypeLabel(material.type)}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-body-lg font-medium text-white/80 mb-2 line-clamp-2 flex-1">
                  {material.title}
                </h4>

                {/* Date */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Calendar size={12} className="text-white/30" />
                  <span className="text-small text-white/40">
                    {new Date(material.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Actions */}
                {material.pdfUrl && (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <a
                      href={material.pdfUrl}
                      download
                      className="inline-flex items-center gap-1.5 text-small text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Download size={12} />
                      Download PDF
                    </a>
                    <a
                      href={material.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors ml-auto"
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FileText size={24} className="text-white/20" />
            </div>
            <h3 className="text-body-lg font-medium text-white/70 mb-1">
              No Materials Yet
            </h3>
            <p className="text-small text-white/40 max-w-sm">
              Generate your first investor material to populate your library.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
