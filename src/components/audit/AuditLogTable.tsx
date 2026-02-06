"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Activity,
  ExternalLink,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  total: number;
  isLoading?: boolean;
  onPageChange?: (offset: number) => void;
  onFilter?: (filters: { action?: string; entityType?: string }) => void;
  onSearch?: (query: string) => void;
  currentOffset?: number;
  pageSize?: number;
  filterOptions?: {
    actions: string[];
    entityTypes: string[];
  };
}

const ACTION_LABELS: Record<string, string> = {
  article_status_changed: "Article Status Changed",
  checklist_item_completed: "Checklist Completed",
  checklist_item_uncompleted: "Checklist Uncompleted",
  document_status_changed: "Document Status Changed",
  document_uploaded: "Document Uploaded",
  document_deleted: "Document Deleted",
  workflow_created: "Workflow Created",
  workflow_status_changed: "Workflow Status Changed",
  workflow_submitted: "Workflow Submitted",
  user_profile_updated: "Profile Updated",
  assessment_imported: "Assessment Imported",
  debris_assessment_created: "Debris Assessment Created",
  debris_assessment_updated: "Debris Assessment Updated",
  cybersecurity_assessment_created: "Cyber Assessment Created",
  cybersecurity_assessment_updated: "Cyber Assessment Updated",
  insurance_assessment_created: "Insurance Assessment Created",
  insurance_assessment_updated: "Insurance Assessment Updated",
  environmental_assessment_created: "Environmental Assessment Created",
  environmental_assessment_updated: "Environmental Assessment Updated",
  audit_report_generated: "Audit Report Generated",
  compliance_certificate_generated: "Certificate Generated",
};

const ENTITY_LABELS: Record<string, string> = {
  article: "Article",
  checklist: "Checklist",
  document: "Document",
  authorization: "Authorization",
  workflow: "Workflow",
  user: "User",
  debris_assessment: "Debris Assessment",
  cybersecurity_assessment: "Cybersecurity Assessment",
  insurance_assessment: "Insurance Assessment",
  environmental_assessment: "Environmental Assessment",
  audit: "Audit",
};

export function AuditLogTable({
  logs,
  total,
  isLoading = false,
  onPageChange,
  onFilter,
  onSearch,
  currentOffset = 0,
  pageSize = 50,
  filterOptions,
}: AuditLogTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSearch = () => {
    if (onSearch && searchQuery.trim().length >= 2) {
      onSearch(searchQuery.trim());
    }
  };

  const handleFilterChange = (action?: string, entityType?: string) => {
    if (onFilter) {
      onFilter({
        action: action || selectedAction || undefined,
        entityType: entityType || selectedEntityType || undefined,
      });
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(currentOffset / pageSize) + 1;

  const getActionLabel = (action: string) =>
    ACTION_LABELS[action] ||
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getEntityLabel = (entityType: string) =>
    ENTITY_LABELS[entityType] ||
    entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Log
          </h3>
          <span className="text-sm text-slate-400">
            {total.toLocaleString()} entries
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                handleFilterChange(e.target.value, undefined);
              }}
              className="pl-10 pr-8 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {filterOptions?.actions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                handleFilterChange(undefined, e.target.value);
              }}
              className="pl-10 pr-8 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">All Entities</option>
              {filterOptions?.entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {getEntityLabel(entityType)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="text-slate-400 mt-3">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-navy-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-navy-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-navy-600 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-300">
                          {log.user.name || log.user.email.split("@")[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-slate-400">
                          {getEntityLabel(log.entityType)}
                        </span>
                        <span className="text-slate-500 font-mono text-xs ml-2">
                          {log.entityId.length > 12
                            ? `${log.entityId.slice(0, 12)}...`
                            : log.entityId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400 line-clamp-1">
                        {log.description || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === log.id ? null : log.id)
                        }
                        className="p-1 hover:bg-navy-600 rounded transition-colors"
                      >
                        {expandedRow === log.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr key={`${log.id}-expanded`} className="bg-navy-900/30">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">
                              Details
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Entity ID:
                                </span>
                                <span className="text-slate-300 font-mono text-xs">
                                  {log.entityId}
                                </span>
                              </div>
                              {log.ipAddress && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">
                                    IP Address:
                                  </span>
                                  <span className="text-slate-300 font-mono text-xs">
                                    {log.ipAddress}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {(log.previousValue || log.newValue) && (
                            <div>
                              <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">
                                Changes
                              </h4>
                              <div className="space-y-2">
                                {log.previousValue && (
                                  <div>
                                    <span className="text-red-400 text-xs">
                                      Previous:
                                    </span>
                                    <pre className="mt-1 p-2 bg-navy-950 rounded text-xs text-slate-400 overflow-auto max-h-20">
                                      {typeof log.previousValue === "string"
                                        ? log.previousValue
                                        : JSON.stringify(
                                            log.previousValue,
                                            null,
                                            2,
                                          )}
                                    </pre>
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <span className="text-green-400 text-xs">
                                      New:
                                    </span>
                                    <pre className="mt-1 p-2 bg-navy-950 rounded text-xs text-slate-400 overflow-auto max-h-20">
                                      {typeof log.newValue === "string"
                                        ? log.newValue
                                        : JSON.stringify(log.newValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-navy-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Showing {currentOffset + 1} -{" "}
            {Math.min(currentOffset + pageSize, total)} of{" "}
            {total.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onPageChange?.(Math.max(0, currentOffset - pageSize))
              }
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-navy-700 hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(currentOffset + pageSize)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-navy-700 hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogTable;
