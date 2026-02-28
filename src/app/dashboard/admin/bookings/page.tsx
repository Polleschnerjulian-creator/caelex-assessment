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
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

interface Booking {
  id: string;
  name: string;
  email: string;
  company: string;
  scheduledAt: string;
  timezone: string;
  status: BookingStatus;
  notes: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
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
  CONFIRMED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/20",
  NO_SHOW: "bg-amber-500/15 text-amber-400 border-amber-500/20",
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Calendar
              size={18}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div>
            <h1 className="text-title font-semibold text-slate-900 dark:text-white">
              Booking Management
            </h1>
            <p className="text-body text-slate-600 dark:text-white/45">
              {pagination.total} total bookings
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value as BookingStatus | "");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-small font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? "bg-emerald-500 text-white"
                : "text-slate-600 dark:text-white/45 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-elevated rounded-xl p-12">
          <div className="flex items-center justify-center gap-3">
            <Loader2 size={20} className="text-emerald-500 animate-spin" />
            <span className="text-body text-slate-500 dark:text-white/45">
              Loading bookings...
            </span>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-elevated rounded-xl p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
              <Calendar
                size={24}
                className="text-slate-400 dark:text-white/30"
              />
            </div>
            <p className="text-body text-slate-500 dark:text-white/45">
              No bookings yet
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-elevated rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[--glass-border-subtle]">
                  <th className="text-left text-small font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-small font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-small font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider px-4 py-3">
                    Date/Time
                  </th>
                  <th className="text-left text-small font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-small font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[--glass-border-subtle]">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-slate-900 dark:text-white">
                          {booking.name}
                        </p>
                        <p className="text-small text-slate-500 dark:text-white/45">
                          {booking.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-slate-700 dark:text-white/70">
                        {booking.company}
                      </p>
                      {booking.demoRequest?.operatorType && (
                        <p className="text-small text-slate-500 dark:text-white/45">
                          {booking.demoRequest.operatorType}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock
                          size={14}
                          className="text-slate-400 dark:text-white/30"
                        />
                        <span className="text-body text-slate-700 dark:text-white/70">
                          {formatScheduledAt(booking.scheduledAt)}
                        </span>
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors disabled:opacity-50"
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                              title="Cancel booking"
                            >
                              <XCircle size={14} />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={() =>
                                handleAction(booking.id, "NO_SHOW")
                              }
                              disabled={actionLoading === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-small font-medium text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors disabled:opacity-50"
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
          <p className="text-body text-slate-600 dark:text-white/45">
            Showing {(page - 1) * pagination.limit + 1} to{" "}
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[--glass-bg-elevated] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-body text-slate-600 dark:text-white/45 min-w-[80px] text-center">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page >= pagination.totalPages}
              className="p-2 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[--glass-bg-elevated] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
