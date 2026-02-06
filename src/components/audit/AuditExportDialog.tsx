"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  X,
  Calendar,
  Loader2,
  CheckCircle2,
  Shield,
  AlertCircle,
} from "lucide-react";

interface AuditExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  filterOptions?: {
    actions: string[];
    entityTypes: string[];
  };
}

interface ExportOptions {
  format: "pdf" | "csv" | "json";
  startDate?: string;
  endDate?: string;
  actions?: string[];
  entityTypes?: string[];
  includeSecurityEvents: boolean;
}

const FORMAT_OPTIONS = [
  {
    value: "pdf" as const,
    label: "PDF Report",
    icon: FileText,
    description: "Formatted audit report with summary and charts",
  },
  {
    value: "csv" as const,
    label: "CSV Export",
    icon: FileSpreadsheet,
    description: "Raw data export for spreadsheet analysis",
  },
  {
    value: "json" as const,
    label: "JSON Export",
    icon: FileText,
    description: "Structured data for system integration",
  },
];

export function AuditExportDialog({
  isOpen,
  onClose,
  onExport,
  filterOptions,
}: AuditExportDialogProps) {
  const [format, setFormat] = useState<"pdf" | "csv" | "json">("pdf");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [includeSecurityEvents, setIncludeSecurityEvents] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportSuccess(false);

    try {
      await onExport({
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        actions: selectedActions.length > 0 ? selectedActions : undefined,
        entityTypes:
          selectedEntityTypes.length > 0 ? selectedEntityTypes : undefined,
        includeSecurityEvents,
      });
      setExportSuccess(true);
      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  };

  const toggleEntityType = (entityType: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(entityType)
        ? prev.filter((e) => e !== entityType)
        : [...prev, entityType],
    );
  };

  // Quick date range presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];
    let start: string;

    switch (preset) {
      case "7d":
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;
      case "30d":
        start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;
      case "90d":
        start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;
      case "1y":
        start = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-navy-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">
              Export Audit Logs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-navy-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Success */}
          {exportSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">
                Export completed successfully!
              </span>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      format === option.value
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                        : "bg-navy-900 border-navy-600 hover:border-navy-500 text-slate-300"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Date Range
            </label>
            <div className="flex gap-2 mb-2">
              {["7d", "30d", "90d", "1y"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className="px-3 py-1 text-xs bg-navy-700 hover:bg-navy-600 text-slate-300 rounded transition-colors"
                >
                  Last {preset}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="Start date"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          {/* Action Filters */}
          {filterOptions && filterOptions.actions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Filter by Action (optional)
              </label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {filterOptions.actions.slice(0, 10).map((action) => (
                  <button
                    key={action}
                    onClick={() => toggleAction(action)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedActions.includes(action)
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                        : "bg-navy-700 text-slate-400 border border-transparent hover:border-navy-500"
                    }`}
                  >
                    {action.replace(/_/g, " ").slice(0, 20)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Include Security Events (PDF only) */}
          {format === "pdf" && (
            <div className="flex items-center gap-3 p-3 bg-navy-900 border border-navy-600 rounded-lg">
              <input
                type="checkbox"
                id="includeSecurityEvents"
                checked={includeSecurityEvents}
                onChange={(e) => setIncludeSecurityEvents(e.target.checked)}
                className="w-4 h-4 rounded border-navy-500 bg-navy-700 text-blue-500 focus:ring-blue-500"
              />
              <label
                htmlFor="includeSecurityEvents"
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">
                  Include Security Events
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditExportDialog;
