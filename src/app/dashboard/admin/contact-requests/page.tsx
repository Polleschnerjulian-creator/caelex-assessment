"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  ExternalLink,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

type ContactStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";
type ContactSubject =
  | "GENERAL_INQUIRY"
  | "PLATFORM_DEMO"
  | "ENTERPRISE_SALES"
  | "PARTNERSHIP"
  | "SUPPORT"
  | "OTHER";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: ContactSubject;
  message: string;
  source: string;
  status: ContactStatus;
  notes: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS: { label: string; value: ContactStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "New", value: "NEW" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Archived", value: "ARCHIVED" },
];

const STATUS_BADGE_CLASSES: Record<ContactStatus, string> = {
  NEW: "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border-[var(--accent-warning)]/20",
  IN_PROGRESS:
    "bg-[var(--accent-info-soft)] text-[var(--accent-info)] border-[var(--accent-info)]/20",
  RESOLVED:
    "bg-[var(--accent-success-soft)] text-[var(--accent-success)] border-[var(--accent-success)]/20",
  ARCHIVED:
    "bg-[var(--surface-sunken)] text-[var(--text-tertiary)] border-[var(--border-default)]",
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

const SUBJECT_LABELS: Record<ContactSubject, string> = {
  GENERAL_INQUIRY: "General",
  PLATFORM_DEMO: "Demo",
  ENTERPRISE_SALES: "Sales",
  PARTNERSHIP: "Partnership",
  SUPPORT: "Support",
  OTHER: "Other",
};

export default function AdminContactRequestsPage() {
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "">("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContactRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/contact-requests?${params}`, {
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setContactRequests(data.contactRequests);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching contact requests:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchContactRequests();
  }, [fetchContactRequests]);

  async function handleAction(id: string, status: ContactStatus) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/contact-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchContactRequests();
      }
    } catch (error) {
      console.error("Error updating contact request:", error);
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateString: string): string {
    return format(new Date(dateString), "d. MMM yyyy, HH:mm", { locale: de });
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-[var(--accent-primary-soft)] rounded-lg flex items-center justify-center">
            <MessageSquare size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-title font-semibold text-[var(--text-primary)]">
              Contact Requests
            </h1>
            <p className="text-body text-[var(--text-secondary)]">
              {pagination.total} total requests
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value as ContactStatus | "");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-small font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? "bg-[var(--accent-primary)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-xl p-12">
          <div className="flex items-center justify-center gap-3">
            <Loader2
              size={20}
              className="text-[var(--accent-primary)] animate-spin"
            />
            <span className="text-body text-[var(--text-secondary)]">
              Loading contact requests...
            </span>
          </div>
        </div>
      ) : contactRequests.length === 0 ? (
        <div className="rounded-xl p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-[var(--surface-sunken)] rounded-xl flex items-center justify-center">
              <MessageSquare
                size={24}
                className="text-[var(--text-tertiary)]"
              />
            </div>
            <p className="text-body text-[var(--text-secondary)]">
              No contact requests yet
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {contactRequests.map((request) => {
            const isExpanded = expandedId === request.id;
            return (
              <div
                key={request.id}
                className="border border-[var(--border-default)] rounded-xl bg-[var(--surface-raised)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  className="w-full p-4 text-left hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-body font-medium text-[var(--text-primary)] truncate">
                          {request.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-small font-medium rounded-full border ${STATUS_BADGE_CLASSES[request.status]}`}
                        >
                          {STATUS_LABELS[request.status]}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 text-small text-[var(--text-tertiary)] bg-[var(--surface-sunken)] rounded-full">
                          {SUBJECT_LABELS[request.subject]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-small text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {request.email}
                        </span>
                        {request.company && <span>· {request.company}</span>}
                        <span>· {formatDate(request.createdAt)}</span>
                      </div>
                      {!isExpanded && (
                        <p className="text-small text-[var(--text-tertiary)] mt-1.5 line-clamp-1">
                          {request.message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                    <div className="pt-4">
                      <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                        Message
                      </p>
                      <p className="text-body text-[var(--text-primary)] whitespace-pre-wrap">
                        {request.message}
                      </p>
                    </div>

                    {request.notes && (
                      <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                        <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                          Internal notes
                        </p>
                        <p className="text-body text-[var(--text-secondary)] whitespace-pre-wrap">
                          {request.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[var(--border-subtle)]">
                      <a
                        href={`mailto:${request.email}?subject=Re: Your Caelex inquiry&body=Hi ${request.name},%0D%0A%0D%0A`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-small font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary-soft)] rounded-md transition-colors"
                      >
                        <ExternalLink size={14} />
                        <span>Reply via email</span>
                      </a>

                      <div className="flex items-center gap-1.5">
                        {request.status !== "IN_PROGRESS" &&
                          request.status !== "RESOLVED" && (
                            <button
                              onClick={() =>
                                handleAction(request.id, "IN_PROGRESS")
                              }
                              disabled={actionLoading === request.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--accent-info)] hover:bg-[var(--accent-info-soft)] rounded-md transition-colors disabled:opacity-50"
                            >
                              <PlayCircle size={14} />
                              <span>In Progress</span>
                            </button>
                          )}
                        {request.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleAction(request.id, "RESOLVED")}
                            disabled={actionLoading === request.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--accent-success)] hover:bg-[var(--accent-success-soft)] rounded-md transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            <span>Resolve</span>
                          </button>
                        )}
                        {request.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleAction(request.id, "ARCHIVED")}
                            disabled={actionLoading === request.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--text-tertiary)] hover:bg-[var(--surface-sunken)] rounded-md transition-colors disabled:opacity-50"
                          >
                            <Archive size={14} />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-body text-[var(--text-secondary)]">
            Showing {(page - 1) * pagination.limit + 1} to{" "}
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--surface-sunken)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-body text-[var(--text-secondary)] min-w-[80px] text-center">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page >= pagination.totalPages}
              className="p-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--surface-sunken)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
