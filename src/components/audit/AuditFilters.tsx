"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  User as UserIcon,
  Activity,
  ChevronDown,
} from "lucide-react";

export interface AuditFilterState {
  actions: string[];
  users: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

interface AuditFiltersProps {
  filters: AuditFilterState;
  onFiltersChange: (filters: AuditFilterState) => void;
  availableActions: string[];
  availableUsers: { id: string; name: string; email: string }[];
}

// Format action name for display
function formatActionName(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditFilters({
  filters,
  onFiltersChange,
  availableActions,
  availableUsers,
}: AuditFiltersProps) {
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Toggle action filter
  const toggleAction = (action: string) => {
    const newActions = filters.actions.includes(action)
      ? filters.actions.filter((a) => a !== action)
      : [...filters.actions, action];
    onFiltersChange({ ...filters, actions: newActions });
  };

  // Toggle user filter
  const toggleUser = (userId: string) => {
    const newUsers = filters.users.includes(userId)
      ? filters.users.filter((u) => u !== userId)
      : [...filters.users, userId];
    onFiltersChange({ ...filters, users: newUsers });
  };

  // Update date range
  const updateDateRange = (field: "from" | "to", value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value || null,
      },
    });
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      actions: [],
      users: [],
      dateRange: { from: null, to: null },
    });
  };

  const hasActiveFilters =
    filters.actions.length > 0 ||
    filters.users.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to;

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
      <div className="flex flex-wrap gap-4">
        {/* Action filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowActionDropdown(!showActionDropdown);
              setShowUserDropdown(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              filters.actions.length > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Actions</span>
            {filters.actions.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 rounded-full">
                {filters.actions.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showActionDropdown && (
            <div className="absolute z-20 top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-[#0F1629] border border-white/10 rounded-lg shadow-xl">
              <div className="p-2">
                {availableActions.length === 0 ? (
                  <p className="text-sm text-white/50 p-2">
                    No actions available
                  </p>
                ) : (
                  availableActions.map((action) => (
                    <label
                      key={action}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.actions.includes(action)}
                        onChange={() => toggleAction(action)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <span className="text-sm text-white/70">
                        {formatActionName(action)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowActionDropdown(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              filters.users.length > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Users</span>
            {filters.users.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 rounded-full">
                {filters.users.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showUserDropdown && (
            <div className="absolute z-20 top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-[#0F1629] border border-white/10 rounded-lg shadow-xl">
              <div className="p-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-white/50 p-2">
                    No users available
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.users.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white/70 block truncate">
                          {user.name || user.email.split("@")[0]}
                        </span>
                        {user.name && (
                          <span className="text-xs text-white/40 block truncate">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/40" />
          <input
            type="date"
            value={filters.dateRange.from || ""}
            onChange={(e) => updateDateRange("from", e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="From"
          />
          <span className="text-white/40">to</span>
          <input
            type="date"
            value={filters.dateRange.to || ""}
            onChange={(e) => updateDateRange("to", e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="To"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Active filters chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
          {filters.actions.map((action) => (
            <span
              key={action}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full"
            >
              {formatActionName(action)}
              <button
                onClick={() => toggleAction(action)}
                className="hover:bg-emerald-500/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.users.map((userId) => {
            const user = availableUsers.find((u) => u.id === userId);
            return (
              <span
                key={userId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full"
              >
                {user?.name || user?.email.split("@")[0] || userId}
                <button
                  onClick={() => toggleUser(userId)}
                  className="hover:bg-blue-500/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {filters.dateRange.from && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full">
              From: {filters.dateRange.from}
              <button
                onClick={() => updateDateRange("from", "")}
                className="hover:bg-purple-500/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.dateRange.to && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full">
              To: {filters.dateRange.to}
              <button
                onClick={() => updateDateRange("to", "")}
                className="hover:bg-purple-500/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Close dropdowns when clicking outside */}
      {(showActionDropdown || showUserDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowActionDropdown(false);
            setShowUserDropdown(false);
          }}
        />
      )}
    </div>
  );
}
