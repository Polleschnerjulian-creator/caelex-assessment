"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import UserTable from "@/components/admin/UserTable";

const LIMIT = 50;

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: (page * LIMIT).toString(),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (activeFilter) params.set("isActive", activeFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, activeFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
          <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Users
              size={18}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div>
            <h1 className="text-heading-lg font-semibold text-slate-900 dark:text-white">
              User Management
            </h1>
            <p className="text-body text-slate-600 dark:text-white/45">
              {total} total users
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/45"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or organization..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-shadow"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-body text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[130px]"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="auditor">Auditor</option>
        </select>

        {/* Active Filter */}
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-body text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl p-12">
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-body text-slate-500 dark:text-white/45">
              Loading users...
            </span>
          </div>
        </div>
      ) : (
        <UserTable users={users} onRefresh={fetchUsers} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-body text-slate-600 dark:text-white/45">
            Showing {page * LIMIT + 1} to {Math.min((page + 1) * LIMIT, total)}{" "}
            of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[--glass-bg-elevated] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-body text-slate-600 dark:text-white/45 min-w-[80px] text-center">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 bg-white dark:bg-[--glass-bg-surface] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-700 dark:text-white disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[--glass-bg-elevated] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
