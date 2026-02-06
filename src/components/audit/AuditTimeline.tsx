"use client";

import { useState } from "react";
import {
  Activity,
  FileText,
  Shield,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string | null;
  user: {
    name: string | null;
    email: string;
  };
}

interface AuditTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  article_status_changed: FileText,
  document_uploaded: Upload,
  document_status_changed: FileText,
  workflow_status_changed: Activity,
  workflow_submitted: CheckCircle2,
  checklist_item_completed: CheckCircle2,
  assessment_imported: FileText,
  debris_assessment_created: Shield,
  debris_assessment_updated: Shield,
  cybersecurity_assessment_created: Shield,
  cybersecurity_assessment_updated: Shield,
  insurance_assessment_created: FileText,
  environmental_assessment_created: FileText,
  audit_report_generated: FileText,
  compliance_certificate_generated: CheckCircle2,
};

const ACTION_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  article_status_changed: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  document_uploaded: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  document_status_changed: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  workflow_status_changed: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  workflow_submitted: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  checklist_item_completed: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  assessment_imported: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  debris_assessment_created: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  debris_assessment_updated: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  cybersecurity_assessment_created: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  cybersecurity_assessment_updated: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  insurance_assessment_created: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  environmental_assessment_created: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  audit_report_generated: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
  compliance_certificate_generated: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
};

const DEFAULT_COLOR = {
  bg: "bg-slate-500/10",
  text: "text-slate-400",
  border: "border-slate-500/30",
};

export function AuditTimeline({
  events,
  isLoading = false,
  title = "Recent Activity",
  maxItems = 10,
  showViewAll = true,
  onViewAll,
}: AuditTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const displayEvents = expanded ? events : events.slice(0, maxItems);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      article_status_changed: "Updated article status",
      document_uploaded: "Uploaded document",
      document_status_changed: "Changed document status",
      workflow_status_changed: "Workflow status changed",
      workflow_submitted: "Submitted workflow",
      checklist_item_completed: "Completed checklist item",
      assessment_imported: "Imported assessment",
      debris_assessment_created: "Created debris assessment",
      debris_assessment_updated: "Updated debris assessment",
      cybersecurity_assessment_created: "Created security assessment",
      cybersecurity_assessment_updated: "Updated security assessment",
      insurance_assessment_created: "Created insurance assessment",
      environmental_assessment_created: "Created environmental assessment",
      audit_report_generated: "Generated audit report",
      compliance_certificate_generated: "Generated certificate",
    };
    return (
      labels[action] ||
      action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  if (isLoading) {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">{title}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-navy-700" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-navy-700 rounded mb-2" />
                <div className="h-3 w-32 bg-navy-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-navy-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          {title}
        </h3>
        {showViewAll && events.length > maxItems && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-navy-600" />

            {/* Events */}
            <div className="space-y-4">
              {displayEvents.map((event, index) => {
                const Icon = ACTION_ICONS[event.action] || Activity;
                const colors = ACTION_COLORS[event.action] || DEFAULT_COLOR;

                return (
                  <div key={event.id} className="relative flex gap-4 pl-2">
                    {/* Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} border ${colors.border}`}
                    >
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-slate-200">
                            {getActionLabel(event.action)}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded-full bg-navy-600 flex items-center justify-center">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-500">
                          {event.user.name || event.user.email.split("@")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand/Collapse */}
            {events.length > maxItems && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {events.length - maxItems} more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditTimeline;
