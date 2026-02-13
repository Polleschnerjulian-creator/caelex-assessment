"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Satellite,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  Orbit,
} from "lucide-react";
import RegistrationForm from "@/components/registration/RegistrationForm";
import RegistrationCard from "@/components/registration/RegistrationCard";

interface Registration {
  id: string;
  objectName: string;
  objectType: string;
  stateOfRegistry: string;
  orbitalRegime: string;
  status: string;
  internationalDesignator: string | null;
  noradCatalogNumber: string | null;
  launchDate: string | null;
  submittedAt: string | null;
  registeredAt: string | null;
  createdAt: string;
  spacecraft: {
    id: string;
    name: string;
    cosparId: string | null;
    status: string;
  };
}

interface Spacecraft {
  id: string;
  name: string;
  cosparId: string | null;
  noradId: string | null;
  missionType: string;
  orbitType: string;
  status: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  DRAFT: {
    label: "Draft",
    color: "text-slate-400 bg-slate-500/10",
    icon: FileText,
  },
  PENDING_SUBMISSION: {
    label: "Pending",
    color: "text-amber-400 bg-amber-500/10",
    icon: Clock,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-emerald-400 bg-emerald-500/10",
    icon: Globe,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-purple-400 bg-purple-500/10",
    icon: Search,
  },
  REGISTERED: {
    label: "Registered",
    color: "text-green-400 bg-green-500/10",
    icon: CheckCircle,
  },
  AMENDMENT_REQUIRED: {
    label: "Amendment Required",
    color: "text-amber-400 bg-amber-500/10",
    icon: AlertCircle,
  },
  AMENDMENT_PENDING: {
    label: "Amendment Pending",
    color: "text-amber-400 bg-amber-500/10",
    icon: Clock,
  },
  DEREGISTERED: {
    label: "Deregistered",
    color: "text-slate-400 bg-slate-500/10",
    icon: XCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-400 bg-red-500/10",
    icon: XCircle,
  },
};

function RegistrationPageContent() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [spacecraft, setSpacecraft] = useState<Spacecraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get organization ID from first membership
  useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          if (data.organizations?.length > 0) {
            setOrganizationId(data.organizations[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
      }
    }
    fetchOrganization();
  }, []);

  const fetchRegistrations = useCallback(async () => {
    if (!organizationId) return;

    try {
      const url = new URL("/api/registration", window.location.origin);
      url.searchParams.set("organizationId", organizationId);
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, statusFilter]);

  const fetchSpacecraft = useCallback(async () => {
    if (!organizationId) return;

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/spacecraft`,
      );
      if (response.ok) {
        const data = await response.json();
        setSpacecraft(data.spacecraft);
      }
    } catch (error) {
      console.error("Error fetching spacecraft:", error);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchRegistrations();
      fetchSpacecraft();
    }
  }, [organizationId, fetchRegistrations, fetchSpacecraft]);

  const handleExportCSV = async () => {
    if (!organizationId) return;

    try {
      const response = await fetch(
        `/api/registration/export/csv?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `urso-registrations-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  const filteredRegistrations = registrations.filter((reg) =>
    searchQuery
      ? reg.objectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.internationalDesignator
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        reg.spacecraft.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  // Stats
  const stats = {
    total: registrations.length,
    draft: registrations.filter((r) => r.status === "DRAFT").length,
    submitted: registrations.filter((r) =>
      ["SUBMITTED", "UNDER_REVIEW"].includes(r.status),
    ).length,
    registered: registrations.filter((r) => r.status === "REGISTERED").length,
  };

  if (loading && !organizationId) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-navy-800 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-navy-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-navy-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Satellite className="w-7 h-7 text-emerald-400" />
            URSO Registration
          </h1>
          <p className="text-slate-400 mt-1">
            UN Registry of Space Objects - Art. 24 EU Space Act
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export for UNOOSA
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Registration
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Registrations"
          value={stats.total}
          icon={Satellite}
          color="blue"
        />
        <StatCard
          title="In Draft"
          value={stats.draft}
          icon={FileText}
          color="slate"
        />
        <StatCard
          title="Submitted"
          value={stats.submitted}
          icon={Globe}
          color="amber"
        />
        <StatCard
          title="Registered"
          value={stats.registered}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-navy-800 border border-navy-700 rounded-xl p-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, COSPAR ID, or spacecraft..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="REGISTERED">Registered</option>
            <option value="AMENDMENT_REQUIRED">Amendment Required</option>
          </select>
        </div>
        <button
          onClick={fetchRegistrations}
          className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div className="text-center py-16 bg-navy-800/50 border border-navy-700 rounded-xl">
          <Orbit className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            No registrations found
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {registrations.length === 0
              ? "Start by registering your space objects with the UN Registry."
              : "No registrations match your current filters."}
          </p>
          {registrations.length === 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Create First Registration
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRegistrations.map((registration) => (
            <RegistrationCard
              key={registration.id}
              registration={registration}
              statusConfig={STATUS_CONFIG}
              onSelect={() => setSelectedRegistration(registration.id)}
              onRefresh={fetchRegistrations}
              organizationId={organizationId!}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && organizationId && (
        <RegistrationForm
          organizationId={organizationId}
          spacecraft={spacecraft}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchRegistrations();
          }}
        />
      )}

      {/* Registration Detail Modal */}
      {selectedRegistration && organizationId && (
        <RegistrationDetailModal
          registrationId={selectedRegistration}
          organizationId={organizationId}
          onClose={() => setSelectedRegistration(null)}
          onRefresh={fetchRegistrations}
        />
      )}
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <FeatureGate module="registration">
      <RegistrationPageContent />
    </FeatureGate>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof Satellite;
  color: "blue" | "slate" | "amber" | "green";
}) {
  const colors = {
    blue: "text-emerald-400 bg-emerald-500/10",
    slate: "text-slate-400 bg-slate-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    green: "text-green-400 bg-green-500/10",
  };

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function RegistrationDetailModal({
  registrationId,
  organizationId,
  onClose,
  onRefresh,
}: {
  registrationId: string;
  organizationId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(
          `/api/registration/${registrationId}?organizationId=${organizationId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setRegistration(data.registration);
        }
      } catch (error) {
        console.error("Error fetching registration detail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [registrationId, organizationId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-navy-900 rounded-xl p-8">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[registration.status];
  const StatusIcon = statusConfig?.icon || FileText;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {registration.objectName}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {registration.internationalDesignator ||
                  "No COSPAR ID assigned"}
              </p>
            </div>
            <span
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusConfig?.color}`}
            >
              <StatusIcon className="w-4 h-4" />
              {statusConfig?.label}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Object Type" value={registration.objectType} />
            <InfoItem
              label="State of Registry"
              value={registration.stateOfRegistry}
            />
            <InfoItem
              label="Orbital Regime"
              value={registration.orbitalRegime}
            />
            <InfoItem
              label="NORAD Number"
              value={registration.noradCatalogNumber || "N/A"}
            />
            <InfoItem
              label="Launch Date"
              value={
                registration.launchDate
                  ? new Date(registration.launchDate).toLocaleDateString()
                  : "N/A"
              }
            />
            <InfoItem
              label="Linked Spacecraft"
              value={registration.spacecraft.name}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-navy-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
            {registration.status === "DRAFT" && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `/api/registration/${registrationId}/submit`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...csrfHeaders(),
                        },
                        body: JSON.stringify({ organizationId }),
                      },
                    );
                    if (response.ok) {
                      onRefresh();
                      onClose();
                    }
                  } catch (error) {
                    console.error("Error submitting:", error);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                Submit to URSO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-white mt-1">{value}</p>
    </div>
  );
}
