"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, FolderPlus, Eye, Download, ShieldCheck } from "lucide-react";
import { type StakeholderEngagement } from "./StakeholderCard";

interface CreateDataRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDataRoomFormData) => void;
  engagements: StakeholderEngagement[];
}

export interface CreateDataRoomFormData {
  name: string;
  description: string;
  engagementId: string;
  purpose: string;
  accessLevel: "VIEW_ONLY" | "DOWNLOAD" | "FULL_ACCESS";
  watermarkEnabled: boolean;
  downloadable: boolean;
  printable: boolean;
  expiresAt: string;
}

const ACCESS_LEVELS = [
  {
    value: "VIEW_ONLY" as const,
    label: "View Only",
    description: "Stakeholder can only view documents in the browser",
    icon: Eye,
  },
  {
    value: "DOWNLOAD" as const,
    label: "Download",
    description: "Stakeholder can view and download documents",
    icon: Download,
  },
  {
    value: "FULL_ACCESS" as const,
    label: "Full Access",
    description: "Stakeholder can view, download, and print documents",
    icon: ShieldCheck,
  },
];

export default function CreateDataRoomModal({
  isOpen,
  onClose,
  onSubmit,
  engagements,
}: CreateDataRoomModalProps) {
  const [formData, setFormData] = useState<CreateDataRoomFormData>({
    name: "",
    description: "",
    engagementId: "",
    purpose: "",
    accessLevel: "VIEW_ONLY",
    watermarkEnabled: true,
    downloadable: false,
    printable: false,
    expiresAt: "",
  });

  const updateField = <K extends keyof CreateDataRoomFormData>(
    key: K,
    value: CreateDataRoomFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: "",
      description: "",
      engagementId: "",
      purpose: "",
      accessLevel: "VIEW_ONLY",
      watermarkEnabled: true,
      downloadable: false,
      printable: false,
      expiresAt: "",
    });
    onClose();
  };

  const isValid = formData.name && formData.engagementId && formData.purpose;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <FolderPlus size={18} className="text-emerald-500" />
            <h2 className="text-heading font-semibold text-slate-900 dark:text-white">
              Create Data Room
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Room Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Insurance Review - Q1 2026"
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of this data room's purpose..."
              rows={2}
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Stakeholder *
            </label>
            <select
              value={formData.engagementId}
              onChange={(e) => updateField("engagementId", e.target.value)}
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="" disabled>
                Select a stakeholder...
              </option>
              {engagements
                .filter((e) => e.status === "ACTIVE")
                .map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.companyName} ({eng.contactName})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Purpose *
            </label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              placeholder="e.g. Annual audit document sharing"
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-2">
              Access Level
            </label>
            <div className="grid gap-2">
              {ACCESS_LEVELS.map((level) => {
                const Icon = level.icon;
                const isSelected = formData.accessLevel === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => updateField("accessLevel", level.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        isSelected
                          ? "text-emerald-500"
                          : "text-slate-400 dark:text-white/40"
                      }
                    />
                    <div>
                      <p className="text-body font-medium text-slate-900 dark:text-white">
                        {level.label}
                      </p>
                      <p className="text-caption text-slate-500 dark:text-white/50">
                        {level.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              {
                key: "watermarkEnabled" as const,
                label: "Watermark",
                description: "Overlay stakeholder name on viewed documents",
              },
              {
                key: "downloadable" as const,
                label: "Allow Downloads",
                description: "Let stakeholder download document files",
              },
              {
                key: "printable" as const,
                label: "Allow Printing",
                description: "Let stakeholder print documents",
              },
            ].map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]"
              >
                <div>
                  <p className="text-body font-medium text-slate-900 dark:text-white">
                    {toggle.label}
                  </p>
                  <p className="text-caption text-slate-500 dark:text-white/50">
                    {toggle.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField(toggle.key, !formData[toggle.key])}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    formData[toggle.key]
                      ? "bg-emerald-500"
                      : "bg-slate-300 dark:bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      formData[toggle.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => updateField("expiresAt", e.target.value)}
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            <p className="text-micro text-slate-400 dark:text-white/30 mt-1">
              Data room will automatically close after this date.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-body font-medium text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <FolderPlus size={14} />
            Create Data Room
          </button>
        </div>
      </motion.div>
    </div>
  );
}
