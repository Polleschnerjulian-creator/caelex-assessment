"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Loader2 } from "lucide-react";
import AuditLogTable from "@/components/audit/AuditLogTable";
import { useLanguage } from "@/components/providers/LanguageProvider";

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

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    action?: string;
    entityType?: string;
  }>({});
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [offset, filters, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  const handleFilter = (newFilters: {
    action?: string;
    entityType?: string;
  }) => {
    setFilters(newFilters);
    setOffset(0);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setOffset(0);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1200px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-[24px] font-medium text-white">
                {t("audit.auditLogs")}
              </h1>
              <p className="text-[14px] text-white/60">
                {t("audit.completeAuditTrail")}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : (
          <AuditLogTable
            logs={logs}
            total={total}
            isLoading={loading}
            onPageChange={handlePageChange}
            onFilter={handleFilter}
            onSearch={handleSearch}
            currentOffset={offset}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}
