"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import OrgTable from "@/components/admin/OrgTable";

const LIMIT = 50;

export default function OrganizationsAdminPage() {
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(0);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: (page * LIMIT).toString(),
      });
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);

      const res = await fetch(`/api/admin/organizations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, page]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Building2
              size={18}
              className="text-purple-600 dark:text-purple-400"
            />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 dark:text-white">
              Organization Management
            </h1>
            <p className="text-[13px] text-slate-600 dark:text-white/60">
              {total} total organizations
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or slug..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-shadow"
          />
        </div>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[160px]"
        >
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12">
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[13px] text-slate-500 dark:text-white/60">
              Loading organizations...
            </span>
          </div>
        </div>
      ) : (
        <OrgTable organizations={organizations} onRefresh={fetchOrgs} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-600 dark:text-white/60">
            Showing {page * LIMIT + 1} to {Math.min((page + 1) * LIMIT, total)}{" "}
            of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] text-slate-600 dark:text-white/60 min-w-[80px] text-center">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
