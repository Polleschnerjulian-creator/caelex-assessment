"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import {
  Shield,
  Loader2,
  Plus,
  X,
  Check,
  AlertTriangle,
  Globe,
  Building2,
} from "lucide-react";

interface SSOConnection {
  id: string;
  provider: string;
  providerName: string;
  entityId: string | null;
  ssoUrl: string | null;
  issuerUrl: string | null;
  clientId: string | null;
  autoProvision: boolean;
  defaultRole: string;
  domains: string[];
  enforceSSO: boolean;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestResult: string | null;
}

interface ProviderOption {
  value: string;
  label: string;
}

const PROVIDER_FIELDS: Record<string, string[]> = {
  SAML: ["entityId", "ssoUrl", "certificate"],
  OIDC: ["clientId", "clientSecret", "issuerUrl"],
  AZURE_AD: ["clientId", "clientSecret", "issuerUrl"],
  OKTA: ["clientId", "clientSecret", "issuerUrl"],
  GOOGLE_WORKSPACE: ["clientId", "clientSecret"],
};

const FIELD_LABELS: Record<string, string> = {
  entityId: "Entity ID",
  ssoUrl: "SSO URL",
  certificate: "X.509 Certificate (PEM)",
  clientId: "Client ID",
  clientSecret: "Client Secret",
  issuerUrl: "Issuer URL",
};

const ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

export function SsoSettingsCard() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<SSOConnection | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  // Form state
  const [showSetup, setShowSetup] = useState(false);
  const [provider, setProvider] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [autoProvision, setAutoProvision] = useState(true);
  const [defaultRole, setDefaultRole] = useState("MEMBER");
  const [enforceSSO, setEnforceSSO] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSSO = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sso?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        if (data.configured && data.connection) {
          setConnection(data.connection);
          setDomains(data.connection.domains || []);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSSO();
  }, [fetchSSO]);

  const handleSave = async () => {
    if (!orgId || !provider) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          organizationId: orgId,
          provider,
          ...fields,
          autoProvision,
          defaultRole,
          enforceSSO,
          domains,
        }),
      });
      if (res.ok) {
        setShowSetup(false);
        fetchSSO();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save SSO configuration");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sso?organizationId=${orgId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setConnection(null);
        setShowSetup(false);
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    try {
      await fetch("/api/sso/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId: orgId }),
      });
      fetchSSO();
    } catch {
      // Silently fail
    } finally {
      setTesting(false);
    }
  };

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (
      d &&
      /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(d) &&
      !domains.includes(d)
    ) {
      setDomains([...domains, d]);
      setNewDomain("");
    }
  };

  if (!orgId) {
    return (
      <div className="py-12 text-center">
        <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Join or create an organization to configure SSO.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Configured view
  if (connection && !showSetup) {
    return (
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
              SSO Configured
            </span>
          </div>
          <p className="text-[12px] text-emerald-600/80 dark:text-emerald-400/70">
            Single Sign-On is active via {connection.providerName}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Provider", value: connection.providerName },
            {
              label: "Auto-Provision",
              value: connection.autoProvision ? "Enabled" : "Disabled",
            },
            { label: "Default Role", value: connection.defaultRole },
            {
              label: "Enforce SSO",
              value: connection.enforceSSO ? "Yes" : "No",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]"
            >
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-[13px] font-medium text-slate-800 dark:text-white mt-0.5">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Domains */}
        {connection.domains.length > 0 && (
          <div>
            <h4 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
              Verified Domains
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {connection.domains.map((d) => (
                <span
                  key={d}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-slate-600 dark:text-slate-400 font-mono"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Test result */}
        {connection.lastTestResult && (
          <div
            className={`p-3 rounded-xl border text-[12px] ${
              connection.lastTestResult === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            Last test: {connection.lastTestResult}
            {connection.lastTestedAt &&
              ` (${new Date(connection.lastTestedAt).toLocaleString()})`}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-white/[0.1] text-[13px] text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Shield size={14} />
            )}
            Test Connection
          </button>
          <button
            onClick={handleDisable}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Disable SSO
          </button>
        </div>
      </div>
    );
  }

  // Setup form
  if (showSetup) {
    const requiredFields = provider ? PROVIDER_FIELDS[provider] || [] : [];

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
            Configure SSO
          </h3>
          <button
            onClick={() => setShowSetup(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Provider selection */}
        <div>
          <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2 block">
            Identity Provider
          </label>
          <div className="grid grid-cols-2 gap-2">
            {providers.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setProvider(p.value);
                  setFields({});
                }}
                className={`p-3 rounded-xl text-left transition-all duration-150 border ${
                  provider === p.value
                    ? "bg-white/70 dark:bg-white/[0.06] border-emerald-400/40 dark:border-emerald-500/30 shadow-sm"
                    : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-white/50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                  {p.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Provider fields */}
        {provider && (
          <div className="space-y-3">
            {requiredFields.map((field) => (
              <div key={field}>
                <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
                  {FIELD_LABELS[field] || field}
                </label>
                {field === "certificate" ? (
                  <textarea
                    value={fields[field] || ""}
                    onChange={(e) =>
                      setFields({ ...fields, [field]: e.target.value })
                    }
                    rows={4}
                    placeholder="-----BEGIN CERTIFICATE-----"
                    className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] font-mono text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-white/20 focus:outline-none transition-colors resize-none"
                  />
                ) : (
                  <input
                    type={field === "clientSecret" ? "password" : "text"}
                    value={fields[field] || ""}
                    onChange={(e) =>
                      setFields({ ...fields, [field]: e.target.value })
                    }
                    className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-white/20 focus:outline-none transition-colors"
                  />
                )}
              </div>
            ))}

            {/* Settings */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div>
                  <p className="text-[13px] text-slate-800 dark:text-white">
                    Auto-Provision Users
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Create accounts on first SSO login
                  </p>
                </div>
                <button
                  onClick={() => setAutoProvision(!autoProvision)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                    autoProvision
                      ? "bg-emerald-500"
                      : "bg-slate-300 dark:bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      autoProvision ? "left-[22px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div>
                  <p className="text-[13px] text-slate-800 dark:text-white">
                    Enforce SSO
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Block password login for domain users
                  </p>
                </div>
                <button
                  onClick={() => setEnforceSSO(!enforceSSO)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                    enforceSSO
                      ? "bg-emerald-500"
                      : "bg-slate-300 dark:bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      enforceSSO ? "left-[22px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <div>
                  <p className="text-[13px] text-slate-800 dark:text-white">
                    Default Role
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Role assigned to new SSO users
                  </p>
                </div>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="bg-white/60 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-slate-800 dark:text-white focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Domains */}
            <div className="pt-2">
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block flex items-center gap-1.5">
                <Globe size={12} />
                Email Domains
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDomain()}
                  placeholder="company.com"
                  className="flex-1 bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors"
                />
                <button
                  onClick={addDomain}
                  className="px-3 py-2 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {domains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-slate-600 dark:text-slate-400 font-mono"
                  >
                    {d}
                    <button
                      onClick={() => setDomains(domains.filter((x) => x !== d))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-[12px] text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setShowSetup(false)}
            className="flex-1 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!provider || saving}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[13px] font-medium hover:bg-slate-700 dark:hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  // Not configured — show setup prompt
  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-center">
        <Shield className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white mb-1">
          Single Sign-On Not Configured
        </h3>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
          Enable SSO to let your team sign in with your company&apos;s identity
          provider. Supports SAML 2.0, OpenID Connect, Azure AD, Okta, and
          Google Workspace.
        </p>
        <button
          onClick={() => setShowSetup(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[13px] font-medium transition-colors"
        >
          <Plus size={15} />
          Configure SSO
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <div
            key={p.value}
            className="px-3 py-2.5 rounded-xl bg-white/30 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04]"
          >
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
              {p.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
