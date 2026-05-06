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
    color: "text-[var(--text-tertiary)] bg-[var(--surface-sunken)]0/10",
    icon: FileText,
  },
  PENDING_SUBMISSION: {
    label: "Pending",
    color: "text-[var(--accent-warning)] bg-[var(--accent-warning-soft)]",
    icon: Clock,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-[var(--accent-primary)] bg-[var(--accent-primary-soft)]",
    icon: Globe,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-purple-400 bg-purple-500/10",
    icon: Search,
  },
  REGISTERED: {
    label: "Registered",
    color: "text-[var(--accent-success)] bg-[var(--accent-success)]/10",
    icon: CheckCircle,
  },
  AMENDMENT_REQUIRED: {
    label: "Amendment Required",
    color: "text-[var(--accent-warning)] bg-[var(--accent-warning-soft)]",
    icon: AlertCircle,
  },
  AMENDMENT_PENDING: {
    label: "Amendment Pending",
    color: "text-[var(--accent-warning)] bg-[var(--accent-warning-soft)]",
    icon: Clock,
  },
  DEREGISTERED: {
    label: "Deregistered",
    color: "text-[var(--text-tertiary)] bg-[var(--surface-sunken)]0/10",
    icon: XCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-[var(--accent-danger)] bg-[var(--accent-danger)]/10",
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

  // Get organization ID from first membership.
  // FIX 2026-05-06: previously this never set loading=false when the
  // user had no organization (which is the default state for fresh
  // sign-ups + Anton's account). Result: infinite spinner. Now we
  // always flip loading off once the org-fetch resolves, so the
  // "no organization" branch below renders a real empty state
  // instead of trapping the user in a loading skeleton forever.
  useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          if (data.organizations?.length > 0) {
            setOrganizationId(data.organizations[0].id);
            // organizationId is set — fetchRegistrations effect below
            // will fire, set loading=false in its finally block.
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
      }
      // No org found (or fetch failed). Flip loading off so the
      // "no organization" empty state renders.
      setLoading(false);
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
        setRegistrations(data.registrations || []);
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
        setSpacecraft(data.spacecraft || []);
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
      <div className="p-6 animate-pulse" role="status" aria-live="polite">
        <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--surface-sunken)] rounded-xl"
            ></div>
          ))}
        </div>
        <div className="h-96 bg-[var(--surface-sunken)] rounded-xl"></div>
        <span className="sr-only">Loading registration data...</span>
      </div>
    );
  }

  // No-organization empty state. The user has finished loading but
  // belongs to no org, so no API call here can return real data.
  // Apple-style left-aligned empty state with a single primary CTA
  // pointing at the org-creation flow (currently /onboarding which
  // wires the user into a fresh organization).
  if (!loading && !organizationId) {
    return (
      <div
        className="px-8 py-10 max-w-2xl"
        style={{
          fontFamily:
            'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          letterSpacing: "-0.005em",
        }}
      >
        <div
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <Satellite
            className="h-[18px] w-[18px]"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          />
        </div>
        <h1
          className="mb-1.5 text-[22px] font-semibold text-white"
          style={{ letterSpacing: "-0.018em" }}
        >
          You need an organization first
        </h1>
        <p
          className="mb-5 max-w-md text-[13.5px] leading-relaxed"
          style={{
            color: "rgba(255, 255, 255, 0.55)",
          }}
        >
          URSO registrations belong to an organization, not an individual
          account. Set up your organization to register spacecraft under EU
          Space Act Art. 24.
        </p>
        <div className="flex items-center gap-2">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
            }}
          >
            Set up organization
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </a>
          <a
            href="/dashboard/today"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            Back to Today
          </a>
        </div>
      </div>
    );
  }

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="px-8 py-8 space-y-7 max-w-screen-2xl mx-auto"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      {/* Header */}
      <header
        className="flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            URSO Registration
          </h1>
          <p
            className="mt-1.5 text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            UN Registry of Space Objects · Art. 24 EU Space Act
          </p>
          <p
            className="mt-2 text-[12.5px]"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            Based on EU Space Act draft (COM(2025) 335) — not yet in force.{" "}
            <a
              href="/resources/eu-space-act"
              className="underline-offset-2 hover:underline"
              style={{ color: "rgba(255, 255, 255, 0.65)" }}
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Export for UNOOSA
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            New registration
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Total" value={stats.total} icon={Satellite} />
        <StatCard title="In draft" value={stats.draft} icon={FileText} />
        <StatCard title="Submitted" value={stats.submitted} icon={Globe} />
        <StatCard
          title="Registered"
          value={stats.registered}
          icon={CheckCircle}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <label htmlFor="registration-search" className="sr-only">
            Search registrations
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            strokeWidth={2}
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
            aria-hidden="true"
          />
          <input
            id="registration-search"
            type="text"
            placeholder="Search by name, COSPAR ID, or spacecraft"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none transition-colors placeholder:text-white/35"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "rgba(255, 255, 255, 0.92)",
              boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
            }}
          />
        </div>
        <label htmlFor="registration-status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="registration-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-[13px] outline-none transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.92)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
          }}
        >
          <option value="all">All status</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="REGISTERED">Registered</option>
          <option value="AMENDMENT_REQUIRED">Amendment required</option>
        </select>
        <button
          onClick={fetchRegistrations}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.55)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
          }}
          aria-label="Refresh registrations"
        >
          <RefreshCw
            className="h-3.5 w-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Registrations list / empty state */}
      {filteredRegistrations.length === 0 ? (
        <div
          className="max-w-xl rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
            }}
          >
            <Orbit
              className="h-[18px] w-[18px]"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            />
          </div>
          <h3
            className="mb-1.5 text-[17px] font-semibold text-white"
            style={{ letterSpacing: "-0.018em" }}
          >
            {registrations.length === 0 ? "No registrations yet" : "No matches"}
          </h3>
          <p
            className="mb-5 max-w-md text-[13px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            {registrations.length === 0
              ? "Register your space objects with the UN Registry to start tracking compliance under EU Space Act Art. 24."
              : "No registrations match the current search or filter. Try clearing them."}
          </p>
          {registrations.length === 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                color: "rgb(20, 20, 22)",
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Create first registration
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
}: {
  title: string;
  value: number;
  icon: typeof Satellite;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p
            className="text-[11px]"
            style={{
              color: "rgba(255, 255, 255, 0.45)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </p>
          <p
            className="mt-1.5 text-[24px] font-semibold tabular-nums text-white"
            style={{ letterSpacing: "-0.018em" }}
          >
            {value}
          </p>
        </div>
        <Icon
          className="h-4 w-4 shrink-0"
          strokeWidth={1.75}
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
          aria-hidden="true"
        />
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
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-label="Loading registration details"
        aria-modal="true"
      >
        <div
          className="bg-[var(--surface-sunken)] rounded-xl p-8"
          role="status"
          aria-live="polite"
        >
          <RefreshCw
            className="w-8 h-8 text-[var(--accent-primary)] animate-spin"
            aria-hidden="true"
          />
          <span className="sr-only">Loading registration details...</span>
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
      <div
        role="dialog"
        aria-label="Registration details"
        aria-modal="true"
        className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-[var(--border-default)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {registration.objectName}
              </h2>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
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
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]:text-white transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
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
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[var(--text-primary)] mt-1">{value}</p>
    </div>
  );
}
