"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Video,
  ExternalLink,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

interface Booking {
  id: string;
  name: string;
  email: string;
  company: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  status: BookingStatus;
  notes: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  googleEventId: string | null;
  googleEventHtmlLink: string | null;
  meetLink: string | null;
  demoRequestId: string | null;
  demoRequest: {
    operatorType: string | null;
    fundingStage: string | null;
    companyWebsite: string | null;
    demoTourCompleted: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS: { label: string; value: BookingStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No-Show", value: "NO_SHOW" },
];

const STATUS_BADGE_CLASSES: Record<BookingStatus, string> = {
  CONFIRMED:
    "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20",
  COMPLETED:
    "bg-[var(--accent-info-soft)] text-[var(--accent-info)] border-[var(--accent-info)]/20",
  CANCELLED:
    "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)] border-[var(--accent-danger)]/20",
  NO_SHOW:
    "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border-[var(--accent-warning)]/20",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-Show",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/bookings?${params}`, {
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleAction(bookingId: string, status: BookingStatus) {
    if (
      status === "CANCELLED" &&
      !confirm(
        "Cancel this booking? The attendee will be notified via Google Calendar.",
      )
    ) {
      return;
    }

    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchBookings();
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    } finally {
      setActionLoading(null);
    }
  }

  function formatScheduledAt(dateString: string): string {
    return format(new Date(dateString), "EEE, d. MMM yyyy — HH:mm", {
      locale: de,
    });
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
            <Calendar size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-title font-semibold text-[var(--text-primary)]">
              Booking Management
            </h1>
            <p className="text-body text-[var(--text-secondary)]">
              {pagination.total} total bookings
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
              setStatusFilter(tab.value as BookingStatus | "");
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
              Loading bookings...
            </span>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-[var(--surface-sunken)] rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-body text-[var(--text-secondary)]">
              No bookings yet
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-[var(--border-default)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
                  <th className="text-left text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Date/Time
                  </th>
                  <th className="text-left text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Links
                  </th>
                  <th className="text-left text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-[var(--surface-sunken)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-[var(--text-primary)]">
                          {booking.name}
                        </p>
                        <p className="text-small text-[var(--text-secondary)]">
                          {booking.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-[var(--text-secondary)]">
                        {booking.company}
                      </p>
                      {booking.demoRequest?.operatorType && (
                        <p className="text-small text-[var(--text-tertiary)]">
                          {booking.demoRequest.operatorType}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock
                          size={14}
                          className="text-[var(--text-tertiary)]"
                        />
                        <span className="text-body text-[var(--text-secondary)]">
                          {formatScheduledAt(booking.scheduledAt)}
                        </span>
                      </div>
                      <p className="text-small text-[var(--text-tertiary)] mt-0.5">
                        {booking.durationMinutes} min &middot;{" "}
                        {booking.timezone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {booking.meetLink ? (
                          <a
                            href={booking.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-small text-[var(--accent-primary)] hover:underline"
                            title="Join Google Meet"
                          >
                            <Video size={12} />
                            <span>Join Meet</span>
                          </a>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-small text-[var(--text-tertiary)]"
                            title="No Meet link — calendar sync was unavailable"
                          >
                            <Video size={12} />
                            <span>—</span>
                          </span>
                        )}
                        {booking.googleEventHtmlLink && (
                          <a
                            href={booking.googleEventHtmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink size={12} />
                            <span>GCal</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-small font-medium rounded-full border ${STATUS_BADGE_CLASSES[booking.status]}`}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {booking.status === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() =>
                                handleAction(booking.id, "COMPLETED")
                              }
                              disabled={actionLoading === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary-soft)] rounded-md transition-colors disabled:opacity-50"
                              title="Mark as completed"
                            >
                              <CheckCircle2 size={14} />
                              <span>Complete</span>
                            </button>
                            <button
                              onClick={() =>
                                handleAction(booking.id, "CANCELLED")
                              }
                              disabled={actionLoading === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 rounded-md transition-colors disabled:opacity-50"
                              title="Cancel booking (notifies attendee)"
                            >
                              <XCircle size={14} />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={() =>
                                handleAction(booking.id, "NO_SHOW")
                              }
                              disabled={actionLoading === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-[var(--accent-warning)] hover:bg-[var(--accent-warning-soft)] rounded-md transition-colors disabled:opacity-50"
                              title="Mark as no-show"
                            >
                              <AlertCircle size={14} />
                              <span>No-Show</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
